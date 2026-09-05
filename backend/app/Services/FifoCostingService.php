<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\SaleBatchAllocation;
use App\Models\StockMovement;
use Exception;
use Illuminate\Support\Facades\DB;

class FifoCostingService
{
    /**
     * Allocate quantity from oldest available batches using FIFO costing.
     *
     * @param int $productId
     * @param int $quantityToDeduct
     * @param int|null $saleDetailId
     * @param string $referenceNumber
     * @return array ['total_cogs' => float, 'allocations' => array, 'remaining_stock' => int]
     * @throws Exception
     */
    public function allocateFifo(int $productId, int $quantityToDeduct, ?int $saleDetailId = null, string $referenceNumber = ''): array
    {
        if ($quantityToDeduct <= 0) {
            return [
                'total_cogs' => 0.00,
                'allocations' => [],
                'remaining_stock' => Product::where('id', $productId)->value('product_quantity') ?? 0,
            ];
        }

        return DB::transaction(function () use ($productId, $quantityToDeduct, $saleDetailId, $referenceNumber) {
            $product = Product::lockForUpdate()->findOrFail($productId);

            // Fetch active batches sorted by purchase_date ASC, id ASC
            $batches = ProductBatch::lockForUpdate()
                ->where('product_id', $productId)
                ->where('remaining_qty', '>', 0)
                ->orderBy('purchase_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $totalAvailable = $batches->sum('remaining_qty');

            if ($totalAvailable < $quantityToDeduct) {
                // If batches don't have enough recorded layers, fallback to product_cost for the difference
                // but let's allocate what we have
            }

            $needed = $quantityToDeduct;
            $totalCogs = 0.00;
            $allocations = [];

            foreach ($batches as $batch) {
                if ($needed <= 0) {
                    break;
                }

                $qtyToTake = min($needed, $batch->remaining_qty);
                $batchUnitCost = (float) $batch->batch_cost;
                $lineCost = round($qtyToTake * $batchUnitCost, 2);

                $batch->remaining_qty -= $qtyToTake;
                $batch->save();

                $totalCogs += $lineCost;
                $needed -= $qtyToTake;

                $allocationData = [
                    'product_batch_id' => $batch->id,
                    'batch_code' => $batch->batch_code,
                    'quantity_allocated' => $qtyToTake,
                    'unit_cost' => $batchUnitCost,
                    'total_cost' => $lineCost,
                ];

                if ($saleDetailId) {
                    SaleBatchAllocation::create([
                        'sale_detail_id' => $saleDetailId,
                        'product_batch_id' => $batch->id,
                        'quantity_allocated' => $qtyToTake,
                        'unit_cost' => $batchUnitCost,
                        'total_cost' => $lineCost,
                    ]);
                }

                $allocations[] = $allocationData;
            }

            // If there's still unmet quantity (e.g. stock exists without batch layer), use product_cost
            if ($needed > 0) {
                $fallbackUnitCost = (float) $product->product_cost;
                $fallbackLineCost = round($needed * $fallbackUnitCost, 2);
                $totalCogs += $fallbackLineCost;

                $allocations[] = [
                    'product_batch_id' => null,
                    'batch_code' => 'DEFAULT_COST',
                    'quantity_allocated' => $needed,
                    'unit_cost' => $fallbackUnitCost,
                    'total_cost' => $fallbackLineCost,
                ];
            }

            // Deduct total product_quantity
            $newQuantity = max(0, $product->product_quantity - $quantityToDeduct);
            $product->product_quantity = $newQuantity;
            $product->save();

            // Record Stock Movement
            StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => 'KELUAR',
                'quantity' => $quantityToDeduct,
                'balance_after' => $newQuantity,
                'reference_type' => 'SALE',
                'reference_id' => $referenceNumber ?: 'POS-SALE',
                'description' => 'Penjualan ban POS Kasir (FIFO allocation)',
                'operator_name' => 'Kasir POS',
                'branch_id' => $product->branch_id ?? 3,
            ]);

            return [
                'total_cogs' => round($totalCogs, 2),
                'allocations' => $allocations,
                'remaining_stock' => $newQuantity,
            ];
        });
    }

    /**
     * Add new inventory batch from Restock / Goods Receipt.
     */
    public function addBatch(int $productId, int $qty, float $unitCost, string $sourceName, ?string $date = null, int $branchId = 3): ProductBatch
    {
        return DB::transaction(function () use ($productId, $qty, $unitCost, $sourceName, $date, $branchId) {
            $product = Product::lockForUpdate()->findOrFail($productId);
            $date = $date ?: now()->toDateString();
            $batchCode = 'BATCH-' . $product->product_code . '-' . date('Ymd', strtotime($date)) . '-' . rand(10, 99);

            $batch = ProductBatch::create([
                'product_id' => $productId,
                'batch_code' => $batchCode,
                'source_name' => $sourceName,
                'purchase_date' => $date,
                'batch_cost' => $unitCost,
                'initial_qty' => $qty,
                'remaining_qty' => $qty,
                'branch_id' => $branchId,
            ]);

            $newQuantity = $product->product_quantity + $qty;
            $product->product_quantity = $newQuantity;
            $product->product_cost = $unitCost; // Update latest cost
            $product->save();

            StockMovement::create([
                'product_id' => $productId,
                'movement_type' => 'MASUK',
                'quantity' => $qty,
                'balance_after' => $newQuantity,
                'reference_type' => 'GOODS_RECEIPT',
                'reference_id' => $batchCode,
                'description' => 'Penerimaan barang dari ' . $sourceName,
                'operator_name' => 'Admin Gudang',
                'branch_id' => $branchId,
            ]);

            return $batch;
        });
    }
}
