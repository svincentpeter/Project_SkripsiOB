<?php

namespace App\Services\Inventory;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\User;
use App\Services\Accounting\PeriodLock;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\FifoCostingService;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Penerimaan barang dari supplier: dokumen pembelian (GR), batch FIFO baru, dan jurnal pembelian.
 * Pembelian TEMPO menjadi hutang supplier (2-1000) yang dilunasi lewat PayableService.
 */
class GoodsReceiptService
{
    public const PAYMENT_ACCOUNTS = ['TUNAI' => '1-1000', 'TRANSFER_BCA' => '1-1001', 'TEMPO' => '2-1000'];

    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
    ) {
    }

    /**
     * @return array{purchase: Purchase, batch: \App\Models\ProductBatch, journal: ?\App\Models\JournalEntry}
     */
    public function receive(array $data, ?User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            $product = Product::findOrFail($data['product_id']);
            $supplier = ! empty($data['supplier_id']) ? Supplier::findOrFail($data['supplier_id']) : null;
            $supplierName = $supplier?->supplier_name ?? $data['source_name'];
            $date = $data['purchase_date'] ?? now()->toDateString();
            // Penerimaan bonus (Rp 0) tanpa jurnal tetap mengubah stok bulan itu, jadi kunci periode dicek di sini.
            PeriodLock::assertOpen($date);
            $method = $data['payment_method'];
            $qty = (int) $data['quantity'];
            $isTempo = $method === 'TEMPO';
            [$total, $layers] = $this->costLayers($data, $qty);

            $dueDate = null;
            if ($isTempo) {
                $dueDate = $data['due_date']
                    ?? now()->parse($date)->addDays($supplier?->payment_terms_days ?: 30)->toDateString();
            }

            $purchase = Purchase::create([
                'purchase_number' => DocumentNumber::next(Purchase::class, 'purchase_number', 'GR'),
                'supplier_id' => $supplier?->id,
                'supplier_name' => $supplierName,
                'supplier_invoice' => $data['supplier_invoice'] ?? null,
                'purchase_date' => $date,
                'payment_method' => $method,
                'due_date' => $dueDate,
                'total_amount' => $total,
                'dpp_amount' => $data['dpp_amount'] ?? 0,
                'ppn_amount' => $data['ppn_amount'] ?? 0,
                'paid_amount' => $isTempo ? 0 : $total,
                'status' => $isTempo && $total > 0 ? 'BELUM_LUNAS' : 'LUNAS',
                'notes' => $data['notes'] ?? null,
                'operator_name' => $user?->name,
            ]);

            $batches = [];
            foreach ($layers as [$layerQty, $layerCost]) {
                $b = $this->fifo->addBatch($product->id, $layerQty, $layerCost, $supplierName, $date);
                $b->update(['purchase_id' => $purchase->id]);
                $batches[] = $b;
            }
            $batch = $batches[0];
            $codes = implode(', ', array_map(fn ($b) => $b->batch_code, $batches));

            $draft = (new JournalDraft())
                ->debit('1-2000', $total, "Pembelian {$qty} pcs {$product->product_name} ({$codes})")
                ->credit(self::PAYMENT_ACCOUNTS[$method], $total, $isTempo ? "Hutang dagang {$supplierName}" : "Pembayaran {$method} ke {$supplierName}");

            // Barang bonus (harga pokok Rp 0) tidak mengubah nilai persediaan: tanpa jurnal.
            $journal = null;
            if (! $draft->isEmpty()) {
                $journal = $draft->post($this->engine, 'PURCHASE', $purchase->purchase_number, "Penerimaan barang {$purchase->purchase_number} dari {$supplierName}", $date);
                $purchase->update(['journal_entry_number' => $journal->entry_number]);
            }

            return ['purchase' => $purchase->fresh(), 'batch' => $batch, 'journal' => $journal];
        });
    }

    /**
     * Total yang dibukukan dan lapisan batch [qty, modal/unit].
     *
     * Tanpa invoice_total (klien lama / Excel): qty × batch_cost, satu batch.
     * Dengan invoice_total: hutang/kas dan 1-2000 persis sebesar total faktur. Kolom batch_cost hanya 2 desimal,
     * jadi total dibagi dalam sen: (qty − sisa) unit di modal dasar, lalu `sisa` unit di modal dasar + Rp 0,01
     * sebagai batch terakhir. Σ(qty × modal) = total faktur tanpa selisih, sehingga FIFO = buku besar 1-2000.
     *
     * @return array{0: float, 1: list<array{0: int, 1: float}>}
     */
    private function costLayers(array $data, int $qty): array
    {
        $cost = (float) $data['batch_cost'];
        $dpp = $data['dpp_amount'] ?? null;
        $ppn = $data['ppn_amount'] ?? null;

        if (! isset($data['invoice_total'])) {
            $total = round($qty * $cost, 2);
            $this->assertDppPpn($dpp, $ppn, $total);

            return [$total, [[$qty, $cost]]];
        }

        $cents = (int) round((float) $data['invoice_total'] * 100);
        if ($cents <= 0) {
            throw new PosRuleException('Total faktur harus lebih besar dari 0.');
        }
        // Toleransi Rp 1 per baris faktur (penerimaan ini satu baris) untuk pembulatan modal per unit.
        if (abs($cents - (int) round($qty * $cost * 100)) > 100) {
            throw new PosRuleException('Total faktur Rp '.number_format($cents / 100, 2, ',', '.')
                .' tidak cocok dengan jumlah × modal per unit (Rp '.number_format($qty * $cost, 2, ',', '.').').');
        }

        $total = $cents / 100;
        $this->assertDppPpn($dpp, $ppn, $total);

        $base = intdiv($cents, $qty);
        $rest = $cents % $qty;
        $layers = [[$qty - $rest, $base / 100]];
        if ($rest > 0) {
            $layers[] = [$rest, ($base + 1) / 100];
        }

        return [$total, $layers];
    }

    private function assertDppPpn(mixed $dpp, mixed $ppn, float $total): void
    {
        if ($dpp !== null && $ppn !== null && (int) round(((float) $dpp + (float) $ppn) * 100) !== (int) round($total * 100)) {
            throw new PosRuleException('DPP + PPN harus sama dengan total faktur (Rp '.number_format($total, 2, ',', '.').').');
        }
    }
}
