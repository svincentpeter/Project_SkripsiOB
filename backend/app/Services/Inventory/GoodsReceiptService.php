<?php

namespace App\Services\Inventory;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\ProductPriceAudit;
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
            $product = Product::with('activeBatches')->findOrFail($data['product_id']);
            $oldCost = (float) ($product->product_cost ?? 0);
            $oldPrice = (float) ($product->product_price ?? 0);
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
                'purchase_number' => DocumentNumber::next(Purchase::class, 'purchase_number', 'GR', $date),
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

            $product->refresh()->load('activeBatches');
            $newCost = (float) ($product->product_cost ?? 0);
            $refHpp = $product->referenceHpp();
            $minSellingPrice = $product->minimumSellingPrice();
            $requestedSellPrice = isset($data['selling_price']) && $data['selling_price'] !== null
                ? round((float) $data['selling_price'], 2)
                : null;
            $priceReason = trim((string) ($data['price_change_reason'] ?? ''));
            $isOwner = ($user?->role ?? '') === 'OWNER';

            if ($requestedSellPrice !== null && $requestedSellPrice > 0) {
                if ($refHpp > 0 && $requestedSellPrice + 0.01 < $minSellingPrice) {
                    throw new PosRuleException(
                        'Harga jual baru saat penerimaan barang minimal harus +15% dari HPP patokan Rp '
                        .number_format($refHpp, 0, ',', '.').' (minimal Rp '.number_format($minSellingPrice, 0, ',', '.').').'
                    );
                }
                if (abs($requestedSellPrice - $oldPrice) > 0.01 || abs($newCost - $oldCost) > 0.01) {
                    $product->update(['product_price' => $requestedSellPrice]);
                    ProductPriceAudit::create([
                        'product_id' => $product->id,
                        'old_cost' => $oldCost,
                        'new_cost' => $newCost,
                        'reference_hpp' => $refHpp,
                        'old_price' => $oldPrice,
                        'new_price' => $requestedSellPrice,
                        'cost_change_percent' => $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : null,
                        'price_change_percent' => $oldPrice > 0 ? round((($requestedSellPrice - $oldPrice) / $oldPrice) * 100, 2) : 100.0,
                        'markup_percent' => $refHpp > 0 ? round((($requestedSellPrice - $refHpp) / $refHpp) * 100, 2) : null,
                        'change_source' => 'goods_receipt_restock',
                        'changed_field' => abs($requestedSellPrice - $oldPrice) > 0.01 ? 'both' : 'cost',
                        'context_month' => substr($date, 0, 7),
                        'changed_by' => $user?->id,
                        'actor_name' => $user?->name ?? 'Petugas Gudang',
                        'actor_role' => $user?->role ?? 'GUDANG',
                        'applies_to' => 'CATALOG',
                        'reason' => $priceReason !== '' ? $priceReason : "Penyesuaian harga jual saat restock {$purchase->purchase_number}",
                        'is_read_by_owner' => $isOwner,
                        'is_reviewed_by_owner' => $isOwner,
                        'reviewed_at' => $isOwner ? now() : null,
                        'reviewed_by' => $isOwner ? $user?->id : null,
                    ]);
                }
            } elseif (abs($newCost - $oldCost) > 0.01 && ($oldPrice <= 0 || $oldPrice + 0.01 < $minSellingPrice)) {
                // HPP batch baru naik sehingga harga jual lama di bawah +15% (atau masih Rp 0): beri notifikasi ke Owner.
                ProductPriceAudit::create([
                    'product_id' => $product->id,
                    'old_cost' => $oldCost,
                    'new_cost' => $newCost,
                    'reference_hpp' => $refHpp,
                    'old_price' => $oldPrice,
                    'new_price' => $oldPrice,
                    'cost_change_percent' => $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : null,
                    'price_change_percent' => 0,
                    'markup_percent' => $refHpp > 0 && $oldPrice > 0 ? round((($oldPrice - $refHpp) / $refHpp) * 100, 2) : 0,
                    'change_source' => 'goods_receipt_margin_warning',
                    'changed_field' => 'cost',
                    'context_month' => substr($date, 0, 7),
                    'changed_by' => $user?->id,
                    'actor_name' => $user?->name ?? 'Petugas Gudang',
                    'actor_role' => $user?->role ?? 'GUDANG',
                    'applies_to' => 'CATALOG',
                    'reason' => "HPP batch baru ({$purchase->purchase_number}) menjadi Rp ".number_format($newCost, 0, ',', '.')
                        .'; harga jual katalog perlu disesuaikan ke minimal +15% (Rp '.number_format($minSellingPrice, 0, ',', '.').').',
                    'is_read_by_owner' => false,
                    'is_reviewed_by_owner' => false,
                ]);
            }

            return ['purchase' => $purchase->fresh(), 'batch' => $batch, 'journal' => $journal];
        }, 3); // korban deadlock (cek saldo kas/bank tidak negatif: S lock journal_items) diulang; closure hanya menulis DB
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

        return [$total, FifoCostingService::centLayers($qty, $cents)];
    }

    private function assertDppPpn(mixed $dpp, mixed $ppn, float $total): void
    {
        if ($dpp !== null && $ppn !== null && (int) round(((float) $dpp + (float) $ppn) * 100) !== (int) round($total * 100)) {
            throw new PosRuleException('DPP + PPN harus sama dengan total faktur (Rp '.number_format($total, 2, ',', '.').').');
        }
    }
}
