<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\StockMovement;
use App\Services\Inventory\GoodsReceiptService;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\Inventory\StockOpnameService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function restock(Request $request, GoodsReceiptService $receipts): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'batch_cost' => 'required|numeric|min:0',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'source_name' => 'required_without:supplier_id|nullable|string|max:150',
            'supplier_invoice' => 'nullable|string|max:100',
            'purchase_date' => 'nullable|date',
            'payment_method' => 'required|string|in:TUNAI,TRANSFER_BCA,TEMPO',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);

        $out = $receipts->receive($validated, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Penerimaan barang {$out['purchase']->purchase_number} dibukukan.",
            'data' => [
                'purchase' => $out['purchase']->toApiArray(),
                'batch' => $out['batch'],
                'journal_entry_number' => $out['journal']->entry_number,
                'journal' => $out['journal']->toApiArray(),
            ],
        ], 201);
    }

    public function valuation(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => InventoryValueJournal::summary()]);
    }

    public function openingBalance(InventoryValueJournal $journal): JsonResponse
    {
        $entry = $journal->postOpeningBalance();

        return response()->json([
            'success' => true,
            'message' => $entry
                ? "Saldo awal persediaan dibukukan ({$entry->entry_number})."
                : 'Saldo buku persediaan sudah sama dengan nilai FIFO.',
            'data' => [
                'valuation' => InventoryValueJournal::summary(),
                'journal' => $entry?->toApiArray(),
            ],
        ]);
    }

    public function stockMovements(Request $request): JsonResponse
    {
        $query = StockMovement::with('product:id,product_name,product_size,brand')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('type')) {
            $query->where('movement_type', $request->type);
        }

        $movements = $query->paginate(min((int) $request->input('per_page', 25), 1000));

        return response()->json([
            'success' => true,
            'data' => $movements,
        ]);
    }

    public function stockOpname(Request $request, StockOpnameService $opname): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|distinct|exists:products,id',
            'items.*.physical_qty' => 'required|integer|min:0',
            'notes' => 'nullable|string|max:255',
        ]);

        $out = $opname->adjust($validated['items'], $validated['notes'] ?? null, $request->user());

        return response()->json([
            'success' => true,
            'message' => count($out['adjustments'])
                ? "Stock opname {$out['reference']} dibukukan (".count($out['adjustments']).' produk berselisih).'
                : 'Tidak ada selisih stok.',
            'data' => [
                'reference' => $out['reference'],
                'adjustments' => $out['adjustments'],
                'journal' => $out['journal']?->toApiArray(),
            ],
        ]);
    }
}
