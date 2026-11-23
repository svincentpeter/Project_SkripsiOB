<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleBatchAllocation;
use App\Models\SaleDetail;
use App\Models\SalePayment;
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
 * Retur penjualan sebagian. Uang dikembalikan mengikuti cara bayar nota: bagian tunai dari laci (shift kasir harus
 * OPEN), bagian QRIS/transfer dari Bank BCA. Barang kembali ke batch FIFO yang dulu dipakai, dengan modal alokasinya.
 * Jurnal SALES_RETURN: Dr 4-9100 / Cr 1-1000 dan/atau 1-1001 sebesar refund, Dr 1-2000 / Cr 5-1000 sebesar HPP yang dibalik.
 * Selain OWNER hanya boleh meretur nota berumur paling lama MAX_AGE_DAYS hari.
 */
class SalesReturnService
{
    public const SALES_RETURN = '4-9100';

    public const MAX_AGE_DAYS = 30;

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
            // Urutan kunci: akun 1-1000 → shift (SP2) → produk → nota → alokasi → nomor RTJ → batch. Produk sebelum
            // nota, sama seperti checkout (produk → nota terbaru lewat nomor dokumen → sale_details).
            // Pembayaran nota tidak berubah setelah checkout: dibaca biasa untuk tahu apakah ada bagian tunai (perlu shift).
            $paidCents = self::paidCentsByAccount($saleId);
            $session = null;
            if (($paidCents[PosAccounts::CASH] ?? 0) > 0) {
                try {
                    $session = CashSessionService::requireOpen();
                } catch (PosRuleException) {
                    throw new PosRuleException('Buka shift kasir dulu: bagian tunai retur penjualan dikembalikan dari laci.');
                }
            }

            // Baris nota tidak pernah berubah setelah checkout, jadi cukup dibaca biasa untuk mencari produknya.
            $productIds = SaleDetail::where('sale_id', $saleId)
                ->whereIn('id', array_map(fn ($row) => (int) $row['sale_detail_id'], $items))
                ->whereNotNull('product_id')
                ->pluck('product_id')->unique()->sort()->values();
            $products = Product::withTrashed()->whereIn('id', $productIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');

            // Kunci nota menyerialkan retur dan void nota yang sama.
            $sale = Sale::with('details')->lockForUpdate()->findOrFail($saleId);
            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah VOID dan tidak bisa diretur.");
            }
            if ($user->role !== 'OWNER' && $sale->date->toDateString() < now()->subDays(self::MAX_AGE_DAYS)->toDateString()) {
                throw new PosRuleException("Nota {$sale->reference} berumur lebih dari ".self::MAX_AGE_DAYS.' hari; returnya hanya bisa dilakukan pemilik.');
            }
            // Nota lama BON/DP belum lunas di kasir: tidak ada cara bayar yang bisa diikuti refund-nya.
            if (array_sum($paidCents) !== (int) round((float) $sale->total_amount * 100)) {
                throw new PosRuleException("Nota {$sale->reference} tidak dibayar penuh di kasir (BON/DP lama); retur hanya lewat jurnal manual.");
            }

            // quantity_returned bisa diubah retur lain setelah read view transaksi ini dibuat (requireOpen() membaca
            // tanpa kunci), jadi alokasi dibaca ulang terkunci per primary key: kunci baris saja, tanpa gap.
            $allocationIds = SaleBatchAllocation::whereIn('sale_detail_id', $sale->details->pluck('id'))->pluck('id');
            $allocations = SaleBatchAllocation::whereIn('id', $allocationIds)->orderBy('id')->lockForUpdate()->get()->groupBy('sale_detail_id');
            foreach ($sale->details as $detail) {
                $detail->setRelation('allocations', $allocations->get($detail->id, collect()));
            }

            // Nomor RTJ lebih dulu: kunci baris RTJ terakhir bulan ini menyerialkan semua retur, sehingga kunci gap dari
            // pembacaan terkini retur sebelumnya di bawah ini tidak saling kunci dengan insert retur lain.
            $date = now()->toDateString();
            $reference = DocumentNumber::next(SalesReturn::class, 'reference', 'RTJ', $date);
            $returned = SalesReturnItem::whereIn('sale_detail_id', $sale->details->pluck('id'))
                ->selectRaw('sale_detail_id, SUM(quantity) as qty')
                ->groupBy('sale_detail_id')
                ->sharedLock()
                ->pluck('qty', 'sale_detail_id')
                ->map(fn ($qty) => (int) $qty)
                ->all();
            $refundedBefore = (int) round((float) SalesReturn::where('sale_id', $sale->id)->sharedLock()->sum('refund_amount') * 100);

            // Retur pertama ditolak bila ada baris barang tanpa alokasi batch lengkap: nota itu masih bisa di-VOID.
            if ($returned === []) {
                foreach ($sale->details as $detail) {
                    if ($detail->product_id && $detail->allocations->sum('quantity_allocated') < $detail->quantity) {
                        throw new PosRuleException("Baris {$detail->item_name} tidak punya jejak batch FIFO lengkap, jadi nota {$sale->reference} tidak bisa diretur. Batalkan lewat VOID lalu input ulang penjualannya.");
                    }
                }
            }

            $lineNet = self::lineNetAfterNotaDiscount($sale);
            $return = SalesReturn::create([
                'reference' => $reference,
                'sale_id' => $sale->id,
                'return_date' => $date,
                'reason' => $reason,
                'cash_session_id' => $session?->id,
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

                // $returned ikut bertambah per baris, jadi sale_detail_id ganda dalam satu permintaan tetap dibatasi sisa.
                $qty = (int) $row['quantity'];
                $prev = $returned[$detail->id] ?? 0;
                if ($qty < 1 || $prev + $qty > $detail->quantity) {
                    throw new PosRuleException("Jumlah retur {$detail->item_name} melebihi sisa yang bisa diretur (".($detail->quantity - $prev).').');
                }
                $returned[$detail->id] = $prev + $qty;

                // Refund kumulatif: setelah semua unit kembali, Σ refund baris = nilai bersih baris, tepat sampai sen.
                $net = $lineNet[$detail->id];
                $refund = round(round($net * ($prev + $qty) / $detail->quantity, 2) - round($net * $prev / $detail->quantity, 2), 2);
                $cost = $detail->product_id
                    ? $this->restock($sale, $detail, $products->get($detail->product_id), $qty, $reference, $user)
                    : 0.0;

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
            // Kumulatif per nota: setelah semua barang kembali, Σ bagian tiap akun = pembayaran nota ke akun itu.
            $refundCents = (int) round($refundTotal * 100);
            $after = self::splitCents($paidCents, $refundedBefore + $refundCents);
            $before = self::splitCents($paidCents, $refundedBefore);
            $byAccount = [];
            foreach ($after as $code => $cents) {
                $byAccount[$code] = ($cents - ($before[$code] ?? 0)) / 100;
            }
            $journal = $this->postJournal($sale, $return, $byAccount, $costTotal, $date);
            $return->update([
                'refund_amount' => $refundTotal,
                'refund_cash' => $byAccount[PosAccounts::CASH] ?? 0,
                'refund_bank' => $byAccount[PosAccounts::BANK] ?? 0,
                'cost_amount' => $costTotal,
                'journal_entry_number' => $journal?->entry_number,
            ]);

            return ['sale' => $sale->fresh(), 'return' => $return->fresh('items'), 'journal' => $journal];
        }, 3);
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
    private function restock(Sale $sale, SaleDetail $detail, ?Product $product, int $qty, string $reference, User $user): float
    {
        if (! $product) {
            throw new PosRuleException("Produk baris {$detail->item_name} sudah tidak ada; retur tidak bisa dibukukan.");
        }
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

    /**
     * Pembayaran nota per akun kas/bank dalam sen (nominal yang diterapkan ke nota, tanpa kembalian).
     *
     * @return array<string, int>
     */
    private static function paidCentsByAccount(int $saleId): array
    {
        $paid = [];
        foreach (SalePayment::where('sale_id', $saleId)->get(['account_code', 'amount']) as $payment) {
            $code = $payment->account_code === PosAccounts::CASH ? PosAccounts::CASH : PosAccounts::BANK;
            $paid[$code] = ($paid[$code] ?? 0) + (int) round((float) $payment->amount * 100);
        }

        return $paid;
    }

    /**
     * Bagi $cents menurut porsi pembayaran (dibulatkan ke bawah, sisa sen ke porsi terbesar), sehingga Σ = $cents.
     *
     * @param  array<string, int>  $paid
     * @return array<string, int>
     */
    private static function splitCents(array $paid, int $cents): array
    {
        $total = array_sum($paid);
        if ($total <= 0) {
            return [];
        }
        $shares = array_map(fn (int $p) => intdiv($cents * $p, $total), $paid);
        $largest = array_keys($paid, max($paid))[0];
        $shares[$largest] += $cents - array_sum($shares);

        return $shares;
    }

    /** @param  array<string, float>  $refundByAccount  akun kas/bank => bagian refund */
    private function postJournal(Sale $sale, SalesReturn $return, array $refundByAccount, float $cost, string $date): ?JournalEntry
    {
        $refund = round(array_sum($refundByAccount), 2);
        $draft = (new JournalDraft())->debit(self::SALES_RETURN, $refund, "Retur penjualan nota {$sale->reference}");
        foreach ($refundByAccount as $code => $amount) {
            $draft->credit($code, $amount, $code === PosAccounts::CASH
                ? "Refund tunai dari laci ({$return->reference})"
                : "Refund QRIS/transfer dari Bank BCA ({$return->reference})");
        }
        $draft->debit(PosAccounts::INVENTORY, $cost, "Barang retur kembali ke batch FIFO ({$return->reference})")
            ->credit(PosAccounts::COGS, $cost, "Pembalikan HPP retur ({$return->reference})");

        // Retur barang bonus tanpa nilai & tanpa HPP tidak menggerakkan akun apa pun.
        if ($draft->isEmpty()) {
            return null;
        }

        return $draft->post($this->engine, 'SALES_RETURN', $return->reference, "Retur penjualan {$return->reference} atas nota {$sale->reference}: {$return->reason}", $date);
    }
}
