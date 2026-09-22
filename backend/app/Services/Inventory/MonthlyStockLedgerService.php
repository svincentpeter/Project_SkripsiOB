<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class MonthlyStockLedgerService
{
    /**
     * Build the monthly stock ledger matrix (Excel-like spreadsheet) with FIFO batch layer breakdown.
     *
     * @param string $month Format 'YYYY-MM'
     * @param string|null $brand Filter by brand name
     * @param int $branchId Branch ID filter (default: 1)
     * @return array
     */
    public function build(string $month, ?string $brand = null, int $branchId = 1): array
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            $month = Carbon::now()->format('Y-m');
        }

        [$year, $m] = explode('-', $month);
        $year = (int) $year;
        $m = (int) $m;

        $startDate = Carbon::createFromDate($year, $m, 1)->startOfDay();
        $daysInMonth = $startDate->daysInMonth;
        $endDate = $startDate->copy()->endOfMonth();

        // Query active tire products
        $productsQuery = Product::query()
            ->whereNull('deleted_at')
            ->where('is_active', true)
            ->orderBy('brand')
            ->orderByRaw('CASE WHEN ring IS NULL OR ring = "" THEN 999 ELSE CAST(REPLACE(ring, "R", "") AS UNSIGNED) END ASC')
            ->orderBy('product_size')
            ->orderByRaw('COALESCE(motif, product_name, "") ASC')
            ->orderBy('product_cost', 'asc');

        if (!empty($brand) && $brand !== 'ALL') {
            $productsQuery->where('brand', $brand);
        }

        $products = $productsQuery->get();
        $productIds = $products->pluck('id')->toArray();

        if (empty($productIds)) {
            return [
                'rows' => [],
                'summary' => [
                    'total_products' => 0,
                    'total_valuation_cogs' => 0,
                    'total_opening' => 0,
                    'total_restock' => 0,
                    'total_sold' => 0,
                    'total_remaining' => 0,
                    'empty_stock_count' => 0,
                    'low_stock_count' => 0,
                ],
                'meta' => [
                    'month' => $month,
                    'year' => $year,
                    'month_num' => $m,
                    'days_in_month' => $daysInMonth,
                    'brand_options' => Product::whereNotNull('brand')->where('brand', '!=', '')->distinct()->pluck('brand')->values()->toArray(),
                    'total_rows' => 0,
                ],
            ];
        }

        $cleanMonth = sprintf('%04d%02d', $year, $m);

        // 1. Opname batches for this month
        $opnameBatches = ProductBatch::where('batch_code', 'like', "OPNAME-{$cleanMonth}%")
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->select('product_id', DB::raw('SUM(initial_qty) as opname_qty'))
            ->pluck('opname_qty', 'product_id');

        $hasOpnameThisMonth = $opnameBatches->isNotEmpty();

        // 2. Stock movements prior to start date & during this month
        $typeCol = Schema::hasColumn('stock_movements', 'movement_type') ? 'movement_type' : 'type';
        $refCol = Schema::hasColumn('stock_movements', 'reference_type') ? 'reference_type' : 'ref_type';

        $movementsAggregated = StockMovement::query()
            ->whereIn('product_id', $productIds)
            ->where('created_at', '<=', $endDate)
            ->where(function ($q) use ($refCol) {
                $q->whereNull($refCol)->orWhere($refCol, '!=', 'opening');
            })
            ->selectRaw("
                product_id,
                SUM(CASE 
                    WHEN created_at < ? AND ($typeCol = 'MASUK' OR $typeCol = 'in') THEN quantity 
                    WHEN created_at < ? AND ($typeCol = 'KELUAR' OR $typeCol = 'out') THEN -quantity 
                    ELSE 0 
                END) as balance_before,
                SUM(CASE 
                    WHEN created_at >= ? AND ($refCol IN ('purchase', 'adjustment', 'GOODS_RECEIPT', 'RESTOCK') OR $refCol IS NULL OR $refCol = '')
                    THEN (CASE WHEN ($typeCol = 'MASUK' OR $typeCol = 'in') THEN quantity ELSE -quantity END) 
                    ELSE 0 
                END) as restock_month
            ", [$startDate, $startDate, $startDate])
            ->groupBy('product_id')
            ->get()
            ->keyBy('product_id');

        // 3. Daily Sales per product (day 1..31)
        $dailySalesRaw = DB::table('sale_details')
            ->join('sales', 'sale_details.sale_id', '=', 'sales.id')
            ->whereYear('sales.date', $year)
            ->whereMonth('sales.date', $m)
            ->whereIn('sale_details.product_id', $productIds)
            ->where(function ($q) {
                if (Schema::hasColumn('sales', 'is_voided')) {
                    $q->where('sales.is_voided', false)->orWhereNull('sales.is_voided');
                }
                if (Schema::hasColumn('sales', 'status')) {
                    $q->where('sales.status', '!=', 'VOID');
                }
            })
            ->select('sale_details.product_id', DB::raw('DAY(sales.date) as day'), DB::raw('SUM(sale_details.quantity) as qty'))
            ->groupBy('sale_details.product_id', DB::raw('DAY(sales.date)'))
            ->get();

        $dailySales = [];
        foreach ($dailySalesRaw as $item) {
            $dailySales[(int) $item->product_id][(int) $item->day] = (int) $item->qty;
        }

        // 4. Batch breakdown for FIFO layers
        $batchesRaw = ProductBatch::whereIn('product_id', $productIds)
            ->orderBy('purchase_date', 'asc')
            ->orderBy('id', 'asc')
            ->get()
            ->groupBy('product_id');

        $rows = [];
        $totalValuationCogs = 0;
        $totalOpening = 0;
        $totalRestock = 0;
        $totalSold = 0;
        $totalRemaining = 0;
        $emptyCount = 0;
        $lowCount = 0;

        foreach ($products as $product) {
            $id = $product->id;
            $agg = $movementsAggregated->get($id);
            $monthRestock = $agg ? (int) $agg->restock_month : 0;

            $initialStock = (int) (($product->stok_awal !== null && (int)$product->stok_awal > 0) 
                ? $product->stok_awal 
                : ($product->product_quantity ?? 0));

            if ($hasOpnameThisMonth && isset($opnameBatches[$id])) {
                $opening = (int) $opnameBatches[$id];
            } else {
                $deltaBefore = $agg ? (int) $agg->balance_before : 0;
                $opening = max(0, $initialStock + $deltaBefore);
            }

            $productDaily = $dailySales[$id] ?? [];
            $sold = array_sum($productDaily);
            $remaining = $opening + $monthRestock - $sold;

            if ($remaining <= 0) {
                $emptyCount++;
            } elseif ($remaining <= 2) {
                $lowCount++;
            }

            $totalOpening += $opening;
            $totalRestock += $monthRestock;
            $totalSold += $sold;
            $totalRemaining += $remaining;

            // Build FIFO Layers
            $pBatches = $batchesRaw->get($id, collect());
            $layers = [];

            if ($pBatches->isNotEmpty()) {
                // Group batches by batch_cost
                $groupedByCost = [];
                foreach ($pBatches as $batch) {
                    $costKey = (string) round((float) $batch->batch_cost, 2);
                    if (!isset($groupedByCost[$costKey])) {
                        $groupedByCost[$costKey] = [
                            'batch_id' => $batch->id,
                            'batch_cost' => (float) $batch->batch_cost,
                            'initial_qty' => 0,
                            'remaining_qty' => 0,
                        ];
                    }
                    $groupedByCost[$costKey]['initial_qty'] += (int) $batch->initial_qty;
                    $groupedByCost[$costKey]['remaining_qty'] += (int) $batch->remaining_qty;
                }

                // Sort layers by cost ascending (FIFO cheapest/oldest)
                ksort($groupedByCost, SORT_NUMERIC);

                // 1. Calculate layer sold amounts under FIFO
                $remainingSoldToAllocate = $sold;
                $layerSoldAmounts = [];
                foreach ($groupedByCost as $costKey => $group) {
                    $layerSold = min($group['initial_qty'], $remainingSoldToAllocate);
                    $remainingSoldToAllocate = max(0, $remainingSoldToAllocate - $layerSold);
                    $layerSoldAmounts[$costKey] = $layerSold;
                }

                // 2. Allocate daily sales chronologically to layers
                $layerRemainingNeeded = $layerSoldAmounts;
                $layerDailyDist = [];
                foreach ($groupedByCost as $costKey => $group) {
                    $layerDailyDist[$costKey] = [];
                }

                ksort($productDaily, SORT_NUMERIC);
                foreach ($productDaily as $d => $qty) {
                    $qtyToDistribute = $qty;
                    foreach ($groupedByCost as $costKey => $group) {
                        if ($qtyToDistribute <= 0) break;
                        if ($layerRemainingNeeded[$costKey] > 0) {
                            $take = min($qtyToDistribute, $layerRemainingNeeded[$costKey]);
                            $layerDailyDist[$costKey][$d] = ($layerDailyDist[$costKey][$d] ?? 0) + $take;
                            $layerRemainingNeeded[$costKey] -= $take;
                            $qtyToDistribute -= $take;
                        }
                    }
                }

                foreach ($groupedByCost as $costKey => $group) {
                    $layerRemaining = $group['remaining_qty'];
                    $layerInitial = $group['initial_qty'];
                    $layerSold = $layerSoldAmounts[$costKey];
                    $layerDaily = $layerDailyDist[$costKey];

                    $layerValuation = $layerRemaining * $group['batch_cost'];
                    $totalValuationCogs += $layerValuation;

                    $layers[] = [
                        'batch_id' => $group['batch_id'],
                        'batch_cost' => $group['batch_cost'],
                        'initial_qty' => $layerInitial,
                        'remaining_qty' => $layerRemaining,
                        'sold' => $layerSold,
                        'valuation' => $layerValuation,
                        'daily_sales' => $layerDaily,
                    ];
                }
            } else {
                // Single default layer from product_cost
                $cost = (float) $product->product_cost;
                $layerValuation = max(0, $remaining) * $cost;
                $totalValuationCogs += $layerValuation;

                $layers[] = [
                    'batch_id' => null,
                    'batch_cost' => $cost,
                    'initial_qty' => $opening,
                    'remaining_qty' => max(0, $remaining),
                    'sold' => $sold,
                    'valuation' => $layerValuation,
                    'daily_sales' => $productDaily,
                ];
            }

            $rows[] = [
                'id' => $id,
                'product_code' => $product->product_code,
                'product_name' => $product->product_name,
                'brand_name' => $product->brand ?: '-',
                'motif' => $product->motif ?: '-',
                'product_size' => $product->product_size ?: '-',
                'ring' => $product->ring ?: '-',
                'product_cost' => (float) $product->product_cost,
                'product_price' => (float) $product->product_price,
                'reference_price' => (float) ($product->reference_price ?? 0),
                'is_old_stock' => (bool) ($product->is_old_stock ?? false),
                'opening' => $opening,
                'restock' => $monthRestock,
                'sold' => $sold,
                'remaining' => $remaining,
                'daily_sales' => $productDaily,
                'layers' => $layers,
            ];
        }

        // Available brand options
        $brandOptions = Product::whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->pluck('brand')
            ->values()
            ->toArray();

        return [
            'rows' => $rows,
            'summary' => [
                'total_products' => count($rows),
                'total_valuation_cogs' => round($totalValuationCogs, 2),
                'total_opening' => $totalOpening,
                'total_restock' => $totalRestock,
                'total_sold' => $totalSold,
                'total_remaining' => $totalRemaining,
                'empty_stock_count' => $emptyCount,
                'low_stock_count' => $lowCount,
            ],
            'meta' => [
                'month' => $month,
                'year' => $year,
                'month_num' => $m,
                'days_in_month' => $daysInMonth,
                'brand_options' => $brandOptions,
                'total_rows' => count($rows),
            ],
        ];
    }
}
