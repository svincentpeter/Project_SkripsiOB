<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalesReturn;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\FifoCostingService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Void nota: membalik jurnal penjualan dan mengembalikan stok ke batch FIFO asalnya.
 */
class SaleVoidService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function void(int $saleId, string $reason, User $user): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $user) {
            // Urutan kunci sama dengan checkout dan retur penjualan: produk (urut id) → nota → batch.
            $productIds = SaleDetail::where('sale_id', $saleId)->whereNotNull('product_id')->pluck('product_id')->unique()->sort()->values();
            $products = Product::whereIn('id', $productIds)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
            $sale = Sale::lockForUpdate()->findOrFail($saleId);

            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah pernah dibatalkan.");
            }
            // Baca terkini: read view transaksi sudah dibuat oleh pembacaan baris nota di atas, sebelum kunci nota.
            if (SalesReturn::where('sale_id', $sale->id)->sharedLock()->exists()) {
                throw new PosRuleException("Nota {$sale->reference} sudah punya retur; kembalikan sisa barangnya lewat retur penjualan.");
            }

            $this->restoreStock($sale, $products, $user);
            $this->postReversal($sale, $reason);

            $sale->update([
                'status' => 'VOID',
                'voided_at' => now(),
                'voided_by' => $user->name,
                'void_reason' => $reason,
            ]);

            return $sale->fresh();
        }, 3); // korban deadlock/lock-wait diulang; closure hanya menulis DB, jadi aman diulang
    }

    /**
     * @param  Collection<int, Product>  $products  produk nota yang sudah dikunci, per id
     */
    private function restoreStock(Sale $sale, Collection $products, User $user): void
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

            $product = $products->get($detail->product_id);
            if (! $product) {
                continue;
            }
            $this->restoreUnallocated($sale, $detail, $product);
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

    /**
     * Unit tanpa baris alokasi (HPP cadangan lama, atau alokasi terhapus impor Excel) kembali sebagai batch baru senilai
     * HPP yang dulu dijurnal, sehingga Dr 1-2000 pada jurnal pembalik sama dengan nilai FIFO yang dipulihkan.
     */
    private function restoreUnallocated(Sale $sale, SaleDetail $detail, Product $product): void
    {
        $units = $detail->quantity - (int) $detail->allocations->sum('quantity_allocated');
        if ($units <= 0) {
            return;
        }

        $cents = (int) round(((float) $detail->total_cost_hpp - (float) $detail->allocations->sum('total_cost')) * 100);
        if ($cents < 0) {
            throw new PosRuleException("HPP alokasi batch nota {$sale->reference} melebihi HPP yang dijurnal; stok tidak bisa dipulihkan dengan nilai yang benar.");
        }
        foreach (FifoCostingService::centLayers($units, $cents) as $i => [$qty, $cost]) {
            ProductBatch::create([
                'product_id' => $product->id,
                'batch_code' => "VOID-{$sale->reference}-{$detail->id}-{$i}",
                'source_name' => "Pengembalian void {$sale->reference}",
                'purchase_date' => $sale->date->toDateString(),
                'batch_cost' => $cost,
                'initial_qty' => $qty,
                'remaining_qty' => $qty,
                'branch_id' => $product->branch_id ?? 3,
            ]);
        }
    }

    private function postReversal(Sale $sale, string $reason): void
    {
        $original = JournalEntry::with('items')
            ->where('reference_type', 'POS_SALE')
            ->where('reference_id', $sale->reference)
            ->first();
        if (! $original) {
            // Nota Rp 0 tanpa HPP FIFO tidak pernah dijurnal, jadi tidak ada yang dibalik.
            if ((float) $sale->gross_sales_amount > 0) {
                throw (new ModelNotFoundException())->setModel(JournalEntry::class);
            }

            return;
        }

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
            3,
            $original->id
        );
    }
}
