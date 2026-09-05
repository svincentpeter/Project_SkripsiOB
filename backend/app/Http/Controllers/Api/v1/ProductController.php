<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['activeBatches']);

        if ($request->filled('brand')) {
            $query->where('brand', $request->brand);
        }

        if ($request->filled('ring')) {
            $query->where('ring', $request->ring);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('product_name', 'like', "%{$s}%")
                  ->orWhere('product_code', 'like', "%{$s}%")
                  ->orWhere('barcode', 'like', "%{$s}%")
                  ->orWhere('brand', 'like', "%{$s}%")
                  ->orWhere('product_size', 'like', "%{$s}%");
            });
        }

        $products = $query->orderBy('product_name')->get();

        return response()->json([
            'success' => true,
            'data' => $products,
        ]);
    }

    public function store(ProductRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $initialBatch = $validated['initial_batch'] ?? null;
        unset($validated['initial_batch']);

        $product = DB::transaction(function () use ($validated, $initialBatch) {
            $product = Product::create($validated);

            if ($initialBatch && ($initialBatch['initial_qty'] ?? 0) > 0) {
                $batchCode = 'BATCH-' . $product->product_code . '-' . date('Ymd');
                ProductBatch::create([
                    'product_id' => $product->id,
                    'batch_code' => $batchCode,
                    'source_name' => $initialBatch['source_name'],
                    'purchase_date' => now()->toDateString(),
                    'batch_cost' => $initialBatch['batch_cost'],
                    'initial_qty' => $initialBatch['initial_qty'],
                    'remaining_qty' => $initialBatch['initial_qty'],
                    'branch_id' => $product->branch_id ?? 3,
                ]);

                StockMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => 'MASUK',
                    'quantity' => $initialBatch['initial_qty'],
                    'balance_after' => $product->product_quantity,
                    'reference_type' => 'INITIAL_STOCK',
                    'reference_id' => $batchCode,
                    'description' => 'Stok awal produk baru: ' . $product->product_name,
                    'operator_name' => 'Admin Gudang',
                    'branch_id' => $product->branch_id ?? 3,
                ]);
            }

            return $product->load('activeBatches');
        });

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil ditambahkan',
            'data' => $product,
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $product = Product::with(['activeBatches', 'stockMovements' => function ($q) {
            $q->orderBy('created_at', 'desc')->limit(20);
        }])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $product,
        ]);
    }

    public function update(ProductRequest $request, $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $validated = $request->validated();
        unset($validated['initial_batch']);

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui',
            'data' => $product->load('activeBatches'),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $product = Product::findOrFail($id);

        // Check if product has sales history
        if ($product->saleDetails()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'Produk tidak dapat dihapus karena sudah memiliki riwayat transaksi penjualan.',
            ], 422);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus',
        ]);
    }
}
