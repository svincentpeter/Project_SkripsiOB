<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use Illuminate\Support\Facades\DB;

/**
 * Void nota: membalik jurnal penjualan, mengembalikan stok ke batch FIFO asalnya,
 * dan mengaktifkan kembali booking DP yang terpakai.
 */
class SaleVoidService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function void(int $saleId, string $reason, User $user): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $user) {
            $sale = Sale::lockForUpdate()->findOrFail($saleId);

            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah pernah dibatalkan.");
            }
            if ($sale->receivablePayments()->exists()) {
                throw new PosRuleException("Nota BON {$sale->reference} sudah menerima pelunasan dan tidak dapat dibatalkan.");
            }

            $this->restoreStock($sale, $user);
            $this->postReversal($sale, $reason);

            if ($sale->booking_id) {
                $sale->booking()->update(['status' => 'ACTIVE', 'converted_sale_id' => null]);
            }

            $sale->update([
                'status' => 'VOID',
                'voided_at' => now(),
                'voided_by' => $user->name,
                'void_reason' => $reason,
            ]);

            return $sale->fresh();
        });
    }

    private function restoreStock(Sale $sale, User $user): void
    {
        $sale->load('details.allocations');

        foreach ($sale->details as $detail) {
            if (! $detail->product_id) {
                continue;
            }

            foreach ($detail->allocations as $allocation) {
                ProductBatch::whereKey($allocation->product_batch_id)->lockForUpdate()->first()
                    ?->increment('remaining_qty', $allocation->quantity_allocated);
            }

            $product = Product::lockForUpdate()->find($detail->product_id);
            if (! $product) {
                continue;
            }
            $product->increment('product_quantity', $detail->quantity);

            StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => 'MASUK',
                'quantity' => $detail->quantity,
                'balance_after' => $product->product_quantity,
                'reference_type' => 'SALE_VOID',
                'reference_id' => $sale->reference,
                'description' => "Pengembalian stok void nota {$sale->reference}",
                'operator_name' => $user->name,
                'branch_id' => $product->branch_id ?? 3,
            ]);
        }
    }

    private function postReversal(Sale $sale, string $reason): void
    {
        $original = JournalEntry::with('items')
            ->where('reference_type', 'POS_SALE')
            ->where('reference_id', $sale->reference)
            ->firstOrFail();

        $items = $original->items->map(fn ($item) => [
            'account_id' => $item->account_id,
            'debit' => (float) $item->credit,
            'credit' => (float) $item->debit,
            'note' => '[VOID] '.$item->note,
        ])->all();

        $this->engine->createEntry(
            'POS_SALE_VOID',
            $sale->reference,
            "Jurnal pembalik void nota {$sale->reference}: {$reason}",
            $items,
            now()->toDateString(),
            3
        );
    }
}
