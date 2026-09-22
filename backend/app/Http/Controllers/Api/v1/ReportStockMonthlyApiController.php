<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use App\Services\Inventory\MonthlyStockLedgerService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReportStockMonthlyApiController extends Controller
{
    protected MonthlyStockLedgerService $ledgerService;

    public function __construct(MonthlyStockLedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    /**
     * Get monthly stock ledger grid data.
     */
    public function index(Request $request): JsonResponse
    {
        $month = $request->query('month', Carbon::now()->format('Y-m'));
        $brand = $request->query('brand');
        $branchId = (int) $request->query('branch_id', 1);

        $data = $this->ledgerService->build($month, $brand, $branchId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Handle inline updates from the spreadsheet grid.
     */
    public function inlineUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'field' => 'required|string|in:opening_stock,batch_cost,old_stock_tag',
            'value' => 'required',
            'month' => 'nullable|string',
            'batch_id' => 'nullable|integer',
            'reference_price' => 'nullable|numeric',
        ]);

        $productId = (int) $validated['product_id'];
        $field = $validated['field'];
        $month = $validated['month'] ?? Carbon::now()->format('Y-m');

        return DB::transaction(function () use ($productId, $field, $validated, $month, $request) {
            $product = Product::lockForUpdate()->findOrFail($productId);

            if ($field === 'opening_stock') {
                $newOpening = (int) $validated['value'];
                $oldOpening = (int) ($product->stok_awal ?? 0);
                $delta = $newOpening - $oldOpening;

                $product->stok_awal = $newOpening;
                $product->product_quantity = max(0, (int) $product->product_quantity + $delta);
                $product->save();

                // Synchronize or create OPNAME batch for that month
                [$year, $m] = explode('-', $month);
                $cleanMonth = sprintf('%04d%02d', $year, $m);
                $batchCode = "OPNAME-{$cleanMonth}-{$product->id}";

                $batch = ProductBatch::where('product_id', $product->id)
                    ->where('batch_code', 'like', "OPNAME-{$cleanMonth}%")
                    ->first();

                if ($batch) {
                    $batch->initial_qty = $newOpening;
                    $batch->remaining_qty = max(0, (int) $batch->remaining_qty + $delta);
                    $batch->save();
                } else {
                    ProductBatch::create([
                        'product_id' => $product->id,
                        'batch_code' => $batchCode,
                        'source_name' => 'Opname Bulanan Excel',
                        'purchase_date' => Carbon::createFromDate($year, $m, 1)->toDateString(),
                        'batch_cost' => $product->product_cost,
                        'initial_qty' => $newOpening,
                        'remaining_qty' => max(0, $newOpening),
                        'branch_id' => 1,
                    ]);
                }

                // Log StockMovement
                $movementData = [
                    'product_id' => $product->id,
                    'quantity' => abs($delta),
                    'balance_after' => (int) $product->product_quantity,
                    'reference_id' => $product->id,
                    'description' => "Koreksi Stok Awal {$month} via Laporan Bulanan",
                    'operator_name' => $request->user()?->name ?? 'Owner/Admin',
                    'branch_id' => 1,
                ];

                if (Schema::hasColumn('stock_movements', 'movement_type')) {
                    $movementData['movement_type'] = $delta >= 0 ? 'MASUK' : 'PENYESUAIAN';
                }
                if (Schema::hasColumn('stock_movements', 'reference_type')) {
                    $movementData['reference_type'] = 'adjustment';
                }

                StockMovement::create($movementData);

                return response()->json([
                    'success' => true,
                    'message' => "Stok awal {$product->product_name} berhasil dikoreksi menjadi {$newOpening}.",
                    'data' => [
                        'stok_awal' => $product->stok_awal,
                        'product_quantity' => $product->product_quantity,
                    ],
                ]);
            }

            if ($field === 'batch_cost') {
                $newCost = (float) $validated['value'];
                $oldCost = (float) $product->product_cost;
                $batchId = $validated['batch_id'] ?? null;

                if ($batchId) {
                    $batch = ProductBatch::find($batchId);
                    if ($batch) {
                        $oldCost = (float) $batch->batch_cost;
                        $batch->batch_cost = $newCost;
                        $batch->save();
                    }
                }

                $costChangePercent = $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : 0;

                // Log audit trail
                ProductPriceAudit::create([
                    'product_id' => $product->id,
                    'old_cost' => $oldCost,
                    'new_cost' => $newCost,
                    'old_price' => $product->product_price,
                    'new_price' => $product->product_price,
                    'cost_change_percent' => $costChangePercent,
                    'price_change_percent' => 0,
                    'change_source' => 'stock_monthly_inline',
                    'changed_field' => 'cost',
                    'context_month' => $month,
                    'changed_by' => $request->user()?->id,
                    'reason' => 'Koreksi modal batch via Buku Stok FIFO Bulanan',
                ]);

                return response()->json([
                    'success' => true,
                    'message' => "Modal batch berhasil dikoreksi: Rp " . number_format($oldCost, 0, ',', '.') . " → Rp " . number_format($newCost, 0, ',', '.'),
                ]);
            }

            if ($field === 'old_stock_tag') {
                $isOldStock = filter_var($validated['value'], FILTER_VALIDATE_BOOLEAN);
                $referencePrice = isset($validated['reference_price']) ? (float) $validated['reference_price'] : (float) $product->reference_price;

                $product->is_old_stock = $isOldStock;
                $product->reference_price = $referencePrice;
                $product->save();

                return response()->json([
                    'success' => true,
                    'message' => "Status stok lama/promo berhasil diperbarui.",
                    'data' => [
                        'is_old_stock' => $product->is_old_stock,
                        'reference_price' => $product->reference_price,
                    ],
                ]);
            }

            return response()->json(['success' => false, 'message' => 'Field tidak valid'], 422);
        });
    }

    /**
     * Export monthly stock report to CSV/Excel format.
     */
    public function exportExcel(Request $request)
    {
        $month = $request->query('month', Carbon::now()->format('Y-m'));
        $brand = $request->query('brand');
        $branchId = (int) $request->query('branch_id', 1);

        $data = $this->ledgerService->build($month, $brand, $branchId);
        $rows = $data['rows'];
        $daysInMonth = $data['meta']['days_in_month'];

        $headers = [
            'No',
            'Merk Ban',
            'Ukuran',
            'Ring',
            'Modal (HPP)',
            'Harga Jual',
            'Stock Awal',
            'Restock',
            'Sisa',
        ];

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $headers[] = (string) $d;
        }
        $headers[] = 'Total Terjual';

        $output = fopen('php://temp', 'r+');
        fputcsv($output, $headers);

        $no = 1;
        foreach ($rows as $row) {
            $csvRow = [
                $no++,
                $row['product_name'],
                $row['product_size'],
                $row['ring'],
                $row['product_cost'],
                $row['product_price'],
                $row['opening'],
                $row['restock'],
                $row['remaining'],
            ];

            for ($d = 1; $d <= $daysInMonth; $d++) {
                $csvRow[] = $row['daily_sales'][$d] ?? '';
            }

            $csvRow[] = $row['sold'];
            fputcsv($output, $csvRow);
        }

        rewind($output);
        $csvContent = stream_get_contents($output);
        fclose($output);

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"laporan_stok_bulanan_{$month}.csv\"",
        ]);
    }
}
