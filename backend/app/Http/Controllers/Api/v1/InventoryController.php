<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\AccountingEngine;
use App\Services\FifoCostingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    protected FifoCostingService $fifoService;
    protected AccountingEngine $accountingEngine;

    public function __construct(FifoCostingService $fifoService, AccountingEngine $accountingEngine)
    {
        $this->fifoService = $fifoService;
        $this->accountingEngine = $accountingEngine;
    }

    public function restock(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'batch_cost' => 'required|numeric|min:0',
            'source_name' => 'required|string|max:150',
            'purchase_date' => 'nullable|date',
            'payment_method' => 'required|string|in:TUNAI,TRANSFER_BCA,TEMPO',
        ]);

        $result = DB::transaction(function () use ($validated) {
            $batch = $this->fifoService->addBatch(
                (int) $validated['product_id'],
                (int) $validated['quantity'],
                (float) $validated['batch_cost'],
                $validated['source_name'],
                $validated['purchase_date'] ?? null
            );

            $totalPurchase = round($validated['quantity'] * $validated['batch_cost'], 2);

            // Auto-Journaling Double-Entry
            $accInventory = Account::where('account_code', '1-2000')->firstOrFail();
            $creditAccountCode = match ($validated['payment_method']) {
                'TUNAI' => '1-1000',
                'TRANSFER_BCA' => '1-1001',
                'TEMPO' => '2-1000',
                default => '2-1000',
            };
            $accCredit = Account::where('account_code', $creditAccountCode)->firstOrFail();

            $journalItems = [
                [
                    'account_id' => $accInventory->id,
                    'debit' => $totalPurchase,
                    'credit' => 0.00,
                    'note' => "Pembelian Persediaan Ban Baru ({$batch->batch_code})",
                ],
                [
                    'account_id' => $accCredit->id,
                    'debit' => 0.00,
                    'credit' => $totalPurchase,
                    'note' => "Pembayaran {$validated['payment_method']} ke {$validated['source_name']}",
                ],
            ];

            $journal = $this->accountingEngine->createEntry(
                'PURCHASE',
                $batch->batch_code,
                "Penerimaan Stok {$validated['source_name']} ({$batch->batch_code})",
                $journalItems,
                $validated['purchase_date'] ?? null
            );

            return [
                'batch' => $batch,
                'journal_entry_number' => $journal->entry_number,
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'Restock barang dan pencatatan akuntansi berhasil',
            'data' => $result,
        ], 201);
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $query = StockMovement::with('product')
            ->orderBy('created_at', 'desc');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('type')) {
            $query->where('movement_type', $request->type);
        }

        $movements = $query->paginate($request->input('per_page', 25));

        return response()->json([
            'success' => true,
            'data' => $movements,
        ]);
    }

    public function stockOpname(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'physical_qty' => 'required|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $movement = DB::transaction(function () use ($validated) {
            $product = Product::lockForUpdate()->findOrFail($validated['product_id']);
            $diff = $validated['physical_qty'] - $product->product_quantity;

            $product->product_quantity = $validated['physical_qty'];
            $product->save();

            return StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => 'PENYESUAIAN',
                'quantity' => $diff,
                'balance_after' => $validated['physical_qty'],
                'reference_type' => 'STOCK_OPNAME',
                'reference_id' => 'OPNAME-' . date('Ymd-His'),
                'description' => 'Penyesuaian Stock Opname: ' . ($validated['notes'] ?? 'Fisik vs Sistem'),
                'operator_name' => 'Admin Opname',
                'branch_id' => 3,
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Stock opname berhasil disesuaikan',
            'data' => $movement,
        ]);
    }
}
