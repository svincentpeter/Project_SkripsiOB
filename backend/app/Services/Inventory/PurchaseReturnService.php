<?php

namespace App\Services\Inventory;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\SaleBatchAllocation;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Retur pembelian ke supplier dan pembatalan penerimaan barang (GR).
 *
 * Hanya unit yang masih tersisa di batch GR itu yang bisa dikembalikan (lapisan yang sudah terjual tidak), batch terbaru
 * lebih dulu. Nilai retur = Σ qty × modal batch, tepat sen (termasuk batch pecahan sen dari faktur). Untuk TEMPO nilai
 * itu mengurangi hutang 2-1000 lebih dulu; sisanya dikembalikan supplier ke kas/bank. Pembatalan GR yang belum tersentuh
 * membukukan jurnal cermin PURCHASE (tertaut reversal_of_id).
 */
class PurchaseReturnService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @return array{purchase: Purchase, return: PurchaseReturn, journal: ?JournalEntry}
     */
    public function returnGoods(int $purchaseId, int $quantity, string $reason, ?string $refundAccount, User $user): array
    {
        return DB::transaction(function () use ($purchaseId, $quantity, $reason, $refundAccount, $user) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            if ($purchase->status === 'BATAL') {
                throw new PosRuleException("Penerimaan {$purchase->purchase_number} sudah dibatalkan.");
            }

            $product = $this->lockProduct($purchase);
            $batches = ProductBatch::where('purchase_id', $purchase->id)
                ->where('remaining_qty', '>', 0)
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();
            $available = (int) $batches->sum('remaining_qty');
            if ($quantity > $available) {
                throw new PosRuleException("Hanya {$available} unit dari {$purchase->purchase_number} yang masih di gudang; unit yang sudah terjual tidak bisa diretur ke supplier.");
            }

            $date = now()->toDateString();
            $return = PurchaseReturn::create([
                'reference' => DocumentNumber::next(PurchaseReturn::class, 'reference', 'RTB', $date),
                'purchase_id' => $purchase->id,
                'kind' => 'RETURN',
                'return_date' => $date,
                'reason' => $reason,
                'quantity' => $quantity,
                'created_by' => $user->id,
                'operator_name' => $user->name,
            ]);

            $value = 0.0;
            $need = $quantity;
            foreach ($batches as $batch) {
                if ($need === 0) {
                    break;
                }
                $take = min($need, (int) $batch->remaining_qty);
                $lineValue = round($take * (float) $batch->batch_cost, 2);
                $batch->decrement('remaining_qty', $take);
                PurchaseReturnItem::create([
                    'purchase_return_id' => $return->id,
                    'product_batch_id' => $batch->id,
                    'quantity' => $take,
                    'unit_cost' => $batch->batch_cost,
                    'total_cost' => $lineValue,
                ]);
                $value += $lineValue;
                $need -= $take;
            }
            $value = round($value, 2);
            $this->takeOutOfStock($product, $quantity, 'PURCHASE_RETURN', $return->reference,
                "Retur ke supplier {$purchase->supplier_name} ({$purchase->purchase_number})", $user);

            $payable = $purchase->payment_method === 'TEMPO' ? min($value, max(0.0, $purchase->remaining())) : 0.0;
            $refund = round($value - $payable, 2);
            $account = $refundAccount ?? ($purchase->payment_method === 'TUNAI' ? '1-1000' : '1-1001');

            $draft = (new JournalDraft())
                ->debit('2-1000', $payable, "Pengurangan hutang {$purchase->supplier_name} ({$purchase->purchase_number})")
                ->debit($account, $refund, "Pengembalian dana retur dari {$purchase->supplier_name}")
                ->credit('1-2000', $value, "Barang diretur ke supplier ({$return->reference})");
            $journal = $draft->isEmpty()
                ? null
                : $draft->post($this->engine, 'PURCHASE_RETURN', $return->reference, "Retur pembelian {$return->reference} atas {$purchase->purchase_number}: {$reason}", $date);

            $return->update([
                'total_amount' => $value,
                'payable_amount' => $payable,
                'refund_amount' => $refund,
                'refund_account_code' => $refund > 0 ? $account : null,
                'journal_entry_number' => $journal?->entry_number,
            ]);
            $this->settle($purchase, $value, $refund);

            return ['purchase' => $purchase->fresh(), 'return' => $return->fresh(), 'journal' => $journal];
        });
    }

    /**
     * @return array{purchase: Purchase, return: PurchaseReturn, journal: ?JournalEntry}
     */
    public function cancel(int $purchaseId, string $reason, User $user): array
    {
        return DB::transaction(function () use ($purchaseId, $reason, $user) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            if ($purchase->status === 'BATAL') {
                throw new PosRuleException("Penerimaan {$purchase->purchase_number} sudah dibatalkan.");
            }

            $product = $this->lockProduct($purchase);
            $batches = ProductBatch::where('purchase_id', $purchase->id)->lockForUpdate()->get();
            $touched = $batches->isEmpty()
                || $batches->contains(fn (ProductBatch $b) => $b->remaining_qty !== $b->initial_qty)
                || SaleBatchAllocation::whereIn('product_batch_id', $batches->pluck('id'))->sharedLock()->exists()
                || $purchase->payments()->exists()
                || $purchase->returns()->exists();
            if ($touched) {
                throw new PosRuleException("Penerimaan {$purchase->purchase_number} tidak bisa dibatalkan: barangnya sudah terjual/diretur atau hutangnya sudah dibayar. Gunakan retur pembelian.");
            }

            $date = now()->toDateString();
            $total = (float) $purchase->total_amount;
            $isTempo = $purchase->payment_method === 'TEMPO';
            $qty = (int) $batches->sum('initial_qty');
            $return = PurchaseReturn::create([
                'reference' => DocumentNumber::next(PurchaseReturn::class, 'reference', 'RTB', $date),
                'purchase_id' => $purchase->id,
                'kind' => 'CANCEL',
                'return_date' => $date,
                'reason' => $reason,
                'quantity' => $qty,
                'total_amount' => $total,
                'payable_amount' => $isTempo ? $total : 0,
                'refund_amount' => $isTempo ? 0 : $total,
                'refund_account_code' => $isTempo ? null : GoodsReceiptService::PAYMENT_ACCOUNTS[$purchase->payment_method],
                'created_by' => $user->id,
                'operator_name' => $user->name,
            ]);

            foreach ($batches as $batch) {
                PurchaseReturnItem::create([
                    'purchase_return_id' => $return->id,
                    'product_batch_id' => $batch->id,
                    'quantity' => $batch->initial_qty,
                    'unit_cost' => $batch->batch_cost,
                    'total_cost' => round($batch->initial_qty * (float) $batch->batch_cost, 2),
                ]);
                $batch->update(['remaining_qty' => 0]);
            }
            $this->takeOutOfStock($product, $qty, 'GOODS_RECEIPT_CANCEL', $return->reference,
                "Pembatalan penerimaan {$purchase->purchase_number}", $user);

            // Penerimaan bonus Rp 0 tidak pernah dijurnal, jadi tidak ada yang dicerminkan.
            $journal = null;
            $original = JournalEntry::where('reference_type', 'PURCHASE')->where('reference_id', $purchase->purchase_number)->first();
            if ($original) {
                $journal = $this->engine->createEntry(
                    'GOODS_RECEIPT_CANCEL',
                    $return->reference,
                    "Pembatalan penerimaan {$purchase->purchase_number}: {$reason}",
                    $original->reversedItems('[BATAL] '),
                    $date,
                    3,
                    $original->id
                );
                $return->update(['journal_entry_number' => $journal->entry_number]);
            }
            $this->settle($purchase, $total, $isTempo ? 0.0 : $total, 'BATAL');

            return ['purchase' => $purchase->fresh(), 'return' => $return->fresh(), 'journal' => $journal];
        });
    }

    /**
     * Urutan kunci seperti checkout/opname: baris produk dulu, baru batch-nya. product_id batch GR tidak pernah
     * berubah, jadi boleh dibaca tanpa kunci. GR tanpa batch → null (ditolak oleh pemanggil).
     */
    private function lockProduct(Purchase $purchase): ?Product
    {
        $productId = ProductBatch::where('purchase_id', $purchase->id)->value('product_id');

        return $productId ? Product::withTrashed()->lockForUpdate()->find($productId) : null;
    }

    private function takeOutOfStock(Product $product, int $qty, string $type, string $reference, string $description, User $user): void
    {
        $product->update(['product_quantity' => max(0, (int) $product->product_quantity - $qty)]);
        StockMovement::create([
            'product_id' => $product->id,
            'movement_type' => 'KELUAR',
            'quantity' => $qty,
            'balance_after' => $product->product_quantity,
            'reference_type' => $type,
            'reference_id' => $reference,
            'description' => $description,
            'operator_name' => $user->name,
            'branch_id' => $product->branch_id ?? 3,
        ]);
    }

    /** Nilai retur menambah returned_amount; refund supplier mengurangi paid_amount (dibayar bersih). */
    private function settle(Purchase $purchase, float $value, float $refund, ?string $status = null): void
    {
        $returned = round((float) $purchase->returned_amount + $value, 2);
        $paid = round((float) $purchase->paid_amount - $refund, 2);
        $net = round((float) $purchase->total_amount - $returned, 2);

        $purchase->update([
            'returned_amount' => $returned,
            'paid_amount' => $paid,
            'status' => $status ?? ($purchase->payment_method !== 'TEMPO' || $paid >= $net - 0.001
                ? 'LUNAS'
                : ($paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS')),
        ]);
    }
}
