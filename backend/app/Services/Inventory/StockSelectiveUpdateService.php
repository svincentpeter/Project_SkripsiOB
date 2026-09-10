<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Memperbarui produk database secara selektif (HPP, Harga Jual, atau Stok)
 * berdasarkan data Excel tanpa merewrite database secara destruktif.
 *
 * Mengadopsi arsitektur paritas penuh dari ProjectOmahBan.
 */
class StockSelectiveUpdateService
{
    /**
     * Eksekusi update bulk selektif.
     *
     * @param  array<int, array{
     *     product_id: int,
     *     excel_cost?: int|null,
     *     excel_price?: int|null,
     *     excel_stock?: int|null,
     *     product_name?: string|null,
     *     product_code?: string|null,
     *     batches?: array<int, array{batch_cost?: int, initial_qty?: int, remaining_qty?: int}>
     * }>  $items
     * @param  array{
     *     update_cost?: bool,
     *     update_price?: bool,
     *     update_stock?: bool,
     *     reason: string,
     *     branch_id?: int|null,
     *     user_id?: int|null
     * }  $options
     * @return array{
     *     total_processed: int,
     *     cost_updated: int,
     *     price_updated: int,
     *     stock_updated: int,
     *     details: array<int, array{id: int, code: string, name: string}>
     * }
     */
    public function updateBulk(array $items, array $options): array
    {
        $reason = trim((string) ($options['reason'] ?? ''));
        if (mb_strlen($reason) < 3) {
            throw new RuntimeException('Alasan perubahan wajib diisi (minimal 3 karakter).');
        }

        $updateCost = (bool) ($options['update_cost'] ?? false);
        $updatePrice = (bool) ($options['update_price'] ?? false);
        $updateStock = (bool) ($options['update_stock'] ?? false);

        if (! $updateCost && ! $updatePrice && ! $updateStock) {
            throw new RuntimeException('Pilih minimal satu aspek yang ingin di-update (HPP, Harga Jual, atau Stok).');
        }

        if (empty($items)) {
            throw new RuntimeException('Tidak ada produk yang dipilih untuk di-update.');
        }

        $branchId = $options['branch_id'] ?? 3;
        $userId = $options['user_id'] ?? (auth()->id() ?? 1);
        $contextMonth = now()->format('Y-m');

        return DB::transaction(function () use (
            $items,
            $updateCost,
            $updatePrice,
            $updateStock,
            $reason,
            $branchId,
            $userId,
            $contextMonth
        ) {
            $summary = [
                'total_processed' => 0,
                'cost_updated' => 0,
                'price_updated' => 0,
                'stock_updated' => 0,
                'details' => [],
            ];

            foreach ($items as $item) {
                $productId = (int) ($item['product_id'] ?? 0);
                if ($productId <= 0) {
                    continue;
                }

                $product = Product::lockForUpdate()->find($productId);
                if (! $product) {
                    continue;
                }

                $touched = false;
                $attributesToUpdate = [];

                // 1. Update HPP (Product Cost)
                if ($updateCost && array_key_exists('excel_cost', $item) && $item['excel_cost'] !== null) {
                    $newCost = (int) $item['excel_cost'];
                    $oldCost = (int) ($product->product_cost ?? 0);

                    if ($newCost > 0 && $newCost !== $oldCost) {
                        $attributesToUpdate['product_cost'] = $newCost;

                        $costPercent = $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : 0.0;

                        ProductPriceAudit::create([
                            'product_id' => $product->id,
                            'old_cost' => $oldCost,
                            'new_cost' => $newCost,
                            'old_price' => (int) ($product->product_price ?? 0),
                            'new_price' => (int) ($product->product_price ?? 0),
                            'cost_change_percent' => $costPercent,
                            'price_change_percent' => 0.0,
                            'changed_field' => 'product_cost',
                            'change_source' => 'bulk_update',
                            'reason' => $reason,
                            'changed_by' => $userId,
                            'context_month' => $contextMonth,
                        ]);

                        $summary['cost_updated']++;
                        $touched = true;
                    }
                }

                // 2. Update Harga Jual (Product Price)
                if ($updatePrice && array_key_exists('excel_price', $item) && $item['excel_price'] !== null) {
                    $newPrice = (int) $item['excel_price'];
                    $oldPrice = (int) ($product->product_price ?? 0);

                    if ($newPrice > 0 && $newPrice !== $oldPrice) {
                        $attributesToUpdate['product_price'] = $newPrice;

                        $pricePercent = $oldPrice > 0 ? round((($newPrice - $oldPrice) / $oldPrice) * 100, 2) : 0.0;

                        ProductPriceAudit::create([
                            'product_id' => $product->id,
                            'old_cost' => $attributesToUpdate['product_cost'] ?? (int) ($product->product_cost ?? 0),
                            'new_cost' => $attributesToUpdate['product_cost'] ?? (int) ($product->product_cost ?? 0),
                            'old_price' => $oldPrice,
                            'new_price' => $newPrice,
                            'cost_change_percent' => 0.0,
                            'price_change_percent' => $pricePercent,
                            'changed_field' => 'product_price',
                            'change_source' => 'bulk_update',
                            'reason' => $reason,
                            'changed_by' => $userId,
                            'context_month' => $contextMonth,
                        ]);

                        $summary['price_updated']++;
                        $touched = true;
                    }
                }

                if (! empty($attributesToUpdate)) {
                    $product->update($attributesToUpdate);
                }

                // 3. Update Stok Fisik
                if ($updateStock && array_key_exists('excel_stock', $item) && $item['excel_stock'] !== null) {
                    $newStock = (int) $item['excel_stock'];
                    $oldStock = (int) ($product->product_quantity ?? 0);
                    $delta = $newStock - $oldStock;

                    if ($delta !== 0) {
                        if ($newStock < 0) {
                            throw new RuntimeException("Stok tidak boleh negatif untuk produk: {$product->product_name}");
                        }

                        $itemBatches = $item['batches'] ?? [];
                        if (! empty($itemBatches)) {
                            $batchPrefix = 'RECON-' . now()->format('Ym');

                            // Hapus batch rekonsiliasi periode yang sama untuk produk ini agar idempoten
                            ProductBatch::where('product_id', $product->id)
                                ->where(function ($q) use ($batchPrefix, $product) {
                                    $q->where('batch_code', $batchPrefix)
                                      ->orWhere('batch_code', 'like', "{$batchPrefix}-{$product->product_code}%");
                                })
                                ->delete();

                            // Nolkan sisa kuantitas batch lama
                            ProductBatch::where('product_id', $product->id)
                                ->where('remaining_qty', '>', 0)
                                ->update(['remaining_qty' => 0]);

                            // Urutkan batch: FIFO Mode -> HPP termurah HARUS dibuat pertama (FIFO 1 / Batch Lama)
                            usort($itemBatches, function ($a, $b) {
                                $costA = (int) ($a['batch_cost'] ?? 0);
                                $costB = (int) ($b['batch_cost'] ?? 0);

                                return $costA <=> $costB;
                            });

                            $hasBranch = Schema::hasColumn('product_batches', 'branch_id');
                            $totalBatches = count($itemBatches);
                            foreach ($itemBatches as $bIdx => $b) {
                                $batchCost = (int) ($b['batch_cost'] ?? 0);
                                $initQty = (int) ($b['initial_qty'] ?? $b['remaining_qty'] ?? 0);
                                $remQty = (int) ($b['remaining_qty'] ?? 0);

                                if ($remQty <= 0 && $initQty <= 0) {
                                    continue;
                                }

                                // Batch termurah (FIFO pertama) diberi tanggal lebih lampau agar konsisten di query purchase_date
                                $purchaseDate = now()->subDays($totalBatches - 1 - $bIdx)->toDateString();
                                $uniqueBatchCode = sprintf('%s-%s-%02d', $batchPrefix, $product->product_code, $bIdx + 1);

                                $batchAttrs = [
                                    'product_id' => $product->id,
                                    'batch_code' => $uniqueBatchCode,
                                    'source_name' => 'Rekonsiliasi Excel',
                                    'batch_cost' => $batchCost > 0 ? $batchCost : (int) ($product->product_cost ?? 0),
                                    'initial_qty' => $initQty > 0 ? $initQty : $remQty,
                                    'remaining_qty' => $remQty,
                                    'purchase_date' => $purchaseDate,
                                ];
                                if ($hasBranch) {
                                    $batchAttrs['branch_id'] = $branchId;
                                }
                                ProductBatch::create($batchAttrs);
                            }
                        } else {
                            // Buat batch tunggal bila delta > 0 dan tidak ada struktur batches
                            if ($delta > 0) {
                                $uniqueBatchCode = sprintf('RECON-%s-%s-01', now()->format('Ym'), $product->product_code);
                                ProductBatch::where('product_id', $product->id)
                                    ->where('batch_code', $uniqueBatchCode)
                                    ->delete();

                                $batchAttrs = [
                                    'product_id' => $product->id,
                                    'batch_code' => $uniqueBatchCode,
                                    'source_name' => 'Penyesuaian Stok Excel',
                                    'batch_cost' => (int) ($product->product_cost ?? 0),
                                    'initial_qty' => $delta,
                                    'remaining_qty' => $delta,
                                    'purchase_date' => now()->toDateString(),
                                ];
                                if (Schema::hasColumn('product_batches', 'branch_id')) {
                                    $batchAttrs['branch_id'] = $branchId;
                                }
                                ProductBatch::create($batchAttrs);
                            }
                        }

                        $product->update(['product_quantity' => $newStock]);

                        $movementData = [
                            'product_id' => $product->id,
                            'branch_id' => $branchId,
                            'quantity' => abs($delta),
                            'balance_after' => $newStock,
                            'reference_type' => 'STOCK_RECONCILIATION',
                            'reference_id' => 'RECON-' . now()->format('YmdHis'),
                            'description' => "Rekonsiliasi Excel: {$reason}",
                            'operator_name' => auth()->user()?->name ?? 'Admin Excel',
                        ];

                        if (Schema::hasColumn('stock_movements', 'movement_type')) {
                            $movementData['movement_type'] = $delta > 0 ? 'MASUK' : 'PENYESUAIAN';
                        }
                        if (Schema::hasColumn('stock_movements', 'type')) {
                            $movementData['type'] = $delta > 0 ? 'in' : 'out';
                        }
                        if (Schema::hasColumn('stock_movements', 'ref_type')) {
                            $movementData['ref_type'] = 'adjustment';
                        }
                        if (Schema::hasColumn('stock_movements', 'user_id')) {
                            $movementData['user_id'] = $userId;
                        }

                        StockMovement::create($movementData);

                        $summary['stock_updated']++;
                        $touched = true;
                    }
                }

                if ($touched) {
                    $summary['total_processed']++;
                    $summary['details'][] = [
                        'id' => $product->id,
                        'code' => (string) $product->product_code,
                        'name' => (string) $product->product_name,
                    ];
                }
            }

            return $summary;
        });
    }
}
