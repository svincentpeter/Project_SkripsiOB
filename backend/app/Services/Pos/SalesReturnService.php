<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Accounting\CashSessionService;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Retur penjualan sebagian. Uang dikembalikan tunai dari laci (shift kasir harus OPEN) apa pun metode bayar awalnya;
 * barang kembali ke batch FIFO yang dulu dipakai, dengan modal alokasinya.
 * Jurnal SALES_RETURN: Dr 4-9100 / Cr 1-1000 sebesar refund, Dr 1-2000 / Cr 5-1000 sebesar HPP yang dibalik.
 */
class SalesReturnService
{
    public const SALES_RETURN = '4-9100';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array<int, array{sale_detail_id: int|string, quantity: int|string}>  $items
     * @return array{sale: Sale, return: SalesReturn, journal: ?JournalEntry}
     */
    public function create(int $saleId, array $items, string $reason, User $user): array
    {
        return DB::transaction(function () use ($saleId, $items, $reason, $user) {
            // Urutan kunci SP2: akun 1-1000 lalu baris shift, sebelum nota, produk dan batch.
            try {
                $session = CashSessionService::requireOpen();
            } catch (PosRuleException) {
                throw new PosRuleException('Buka shift kasir dulu: retur penjualan dikembalikan tunai dari laci.');
            }

            // Kunci nota menyerialkan retur/void nota yang sama. Baris turunan dibaca terkunci (baca terkini), karena
            // read view transaksi sudah dibuat oleh requireOpen() sebelum kunci nota didapat.
            $sale = Sale::with([
                'details' => fn ($q) => $q->lockForUpdate(),
                'details.allocations' => fn ($q) => $q->lockForUpdate(),
            ])->lockForUpdate()->findOrFail($saleId);
            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah VOID dan tidak bisa diretur.");
            }

            $date = now()->toDateString();
            $before = SalesReturnItem::whereIn('sale_detail_id', $sale->details->pluck('id'))
                ->selectRaw('sale_detail_id, SUM(quantity) as qty, SUM(refund_amount) as amount')
                ->groupBy('sale_detail_id')
                ->sharedLock()
                ->get()
                ->keyBy('sale_detail_id');
            $lineNet = self::lineNetAfterNotaDiscount($sale);

            $return = SalesReturn::create([
                'reference' => DocumentNumber::next(SalesReturn::class, 'reference', 'RTJ', $date),
                'sale_id' => $sale->id,
                'return_date' => $date,
                'reason' => $reason,
                'cash_session_id' => $session->id,
                'created_by' => $user->id,
                'operator_name' => $user->name,
            ]);

            $refundTotal = 0.0;
            $costTotal = 0.0;
            foreach ($items as $row) {
                $detail = $sale->details->firstWhere('id', (int) $row['sale_detail_id']);
                if (! $detail) {
                    throw new PosRuleException("Baris retur bukan bagian dari nota {$sale->reference}.");
                }

                $qty = (int) $row['quantity'];
                $returnedBefore = (int) ($before[$detail->id]->qty ?? 0);
                if ($qty < 1 || $returnedBefore + $qty > $detail->quantity) {
                    throw new PosRuleException("Jumlah retur {$detail->item_name} melebihi sisa yang bisa diretur (".($detail->quantity - $returnedBefore).').');
                }

                // Retur yang menghabiskan baris mengambil sisa nilainya, sehingga Σ refund baris = nilai bersih baris.
                $refund = $returnedBefore + $qty === $detail->quantity
                    ? round($lineNet[$detail->id] - (float) ($before[$detail->id]->amount ?? 0), 2)
                    : round($lineNet[$detail->id] * $qty / $detail->quantity, 2);
                $cost = $detail->product_id ? $this->restock($sale, $detail, $qty, $return->reference, $user) : 0.0;

                SalesReturnItem::create([
                    'sales_return_id' => $return->id,
                    'sale_detail_id' => $detail->id,
                    'quantity' => $qty,
                    'refund_amount' => $refund,
                    'cost_amount' => $cost,
                ]);
                $refundTotal += $refund;
                $costTotal += $cost;
            }

            $refundTotal = round($refundTotal, 2);
            $costTotal = round($costTotal, 2);
            $journal = $this->postJournal($sale, $return, $refundTotal, $costTotal, $date);
            $return->update([
                'refund_amount' => $refundTotal,
                'cost_amount' => $costTotal,
                'journal_entry_number' => $journal?->entry_number,
            ]);

            return ['sale' => $sale->fresh(), 'return' => $return->fresh('items'), 'journal' => $journal];
        });
    }

    /**
     * Nilai bersih tiap baris setelah potongan per baris dan bagian diskon nota. Diskon nota dibagi proporsional
     * dalam sen; sisa pembulatan masuk ke baris terbesar, sehingga Σ = total nota.
     *
     * @return array<int, float> sale_detail_id => nilai
     */
    public static function lineNetAfterNotaDiscount(Sale $sale): array
    {
        $cents = $sale->details->mapWithKeys(fn (SaleDetail $d) => [$d->id => (int) round((float) $d->sub_total * 100)])->all();
        $subtotal = array_sum($cents);
        $notaDiscount = max(0, $subtotal - (int) round((float) $sale->total_amount * 100));

        $shares = [];
        foreach ($cents as $id => $c) {
            $shares[$id] = $subtotal > 0 ? (int) floor($c * $notaDiscount / $subtotal) : 0;
        }
        if ($cents !== []) {
            $largest = array_keys($cents, max($cents))[0];
            $shares[$largest] += $notaDiscount - array_sum($shares);
        }

        $net = [];
        foreach ($cents as $id => $c) {
            $net[$id] = ($c - $shares[$id]) / 100;
        }

        return $net;
    }

    /**
     * Unit kembali ke batch asal (alokasi terakhir lebih dulu) dengan modal alokasinya. Mengembalikan HPP yang dibalik.
     */
    private function restock(Sale $sale, SaleDetail $detail, int $qty, string $reference, User $user): float
    {
        // Produk dikunci sebelum batch, sama seperti checkout (FifoCostingService), agar tidak saling tunggu.
        $product = Product::withTrashed()->lockForUpdate()->findOrFail($detail->product_id);
        $need = $qty;
        $cost = 0.0;
        foreach ($detail->allocations->sortByDesc('id') as $allocation) {
            $take = min($need, $allocation->quantity_allocated - $allocation->quantity_returned);
            if ($take <= 0) {
                continue;
            }
            ProductBatch::whereKey($allocation->product_batch_id)->lockForUpdate()->firstOrFail()->increment('remaining_qty', $take);
            $allocation->increment('quantity_returned', $take);
            $cost += round($take * (float) $allocation->unit_cost, 2);
            $need -= $take;
            if ($need === 0) {
                break;
            }
        }
        if ($need > 0) {
            throw new PosRuleException("Baris {$detail->item_name} tidak punya jejak batch FIFO lengkap; batalkan nota lewat VOID.");
        }

        $product->increment('product_quantity', $qty);
        StockMovement::create([
            'product_id' => $product->id,
            'movement_type' => 'MASUK',
            'quantity' => $qty,
            'balance_after' => $product->product_quantity,
            'reference_type' => 'SALES_RETURN',
            'reference_id' => $reference,
            'description' => "Retur penjualan nota {$sale->reference}",
            'operator_name' => $user->name,
            'branch_id' => $product->branch_id ?? 3,
        ]);

        return round($cost, 2);
    }

    private function postJournal(Sale $sale, SalesReturn $return, float $refund, float $cost, string $date): ?JournalEntry
    {
        $draft = (new JournalDraft())
            ->debit(self::SALES_RETURN, $refund, "Retur penjualan nota {$sale->reference}")
            ->credit(PosAccounts::CASH, $refund, "Refund tunai dari laci ({$return->reference})")
            ->debit(PosAccounts::INVENTORY, $cost, "Barang retur kembali ke batch FIFO ({$return->reference})")
            ->credit(PosAccounts::COGS, $cost, "Pembalikan HPP retur ({$return->reference})");

        // Retur barang bonus tanpa nilai & tanpa HPP tidak menggerakkan akun apa pun.
        if ($draft->isEmpty()) {
            return null;
        }

        return $draft->post($this->engine, 'SALES_RETURN', $return->reference, "Retur penjualan {$return->reference} atas nota {$sale->reference}: {$return->reason}", $date);
    }
}
