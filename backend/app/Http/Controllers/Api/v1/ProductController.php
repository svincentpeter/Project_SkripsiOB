<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['activeBatches', 'category']);

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
            'data' => $products->map(fn (Product $p) => self::toApiArray($p))->values(),
        ]);
    }

    /**
     * Produk baru; stok awal (initial_batch) dijurnal sebagai saldo awal persediaan (Dr 1-2000, Cr 3-1000).
     */
    public function store(ProductRequest $request, InventoryValueJournal $valueJournal): JsonResponse
    {
        $validated = $request->validated();
        $initialBatch = $validated['initial_batch'] ?? null;
        unset($validated['initial_batch']);
        $validated['product_code'] ??= self::uniqueCode('product_code', 'PRD');
        $validated['barcode'] ??= self::uniqueCode('barcode', '899');

        $out = $valueJournal->record(function () use ($validated, $initialBatch) {
            $qty = (int) ($initialBatch['initial_qty'] ?? 0);
            $product = Product::create($validated + [
                'product_quantity' => $qty,
                'stok_awal' => $qty,
                'is_active' => $validated['is_active'] ?? true,
                'branch_id' => 3,
            ]);

            if ($qty > 0) {
                $batchCode = 'BATCH-'.$product->product_code.'-'.now()->format('Ymd');
                ProductBatch::create([
                    'product_id' => $product->id,
                    'batch_code' => $batchCode,
                    'source_name' => $initialBatch['source_name'],
                    'purchase_date' => now()->toDateString(),
                    'batch_cost' => $initialBatch['batch_cost'],
                    'initial_qty' => $qty,
                    'remaining_qty' => $qty,
                    'branch_id' => 3,
                ]);

                StockMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => 'MASUK',
                    'quantity' => $qty,
                    'balance_after' => $qty,
                    'reference_type' => 'INITIAL_STOCK',
                    'reference_id' => $batchCode,
                    'description' => 'Stok awal produk baru: '.$product->product_name,
                    'operator_name' => auth()->user()?->name ?? 'Admin Gudang',
                    'branch_id' => 3,
                ]);
            }

            return $product;
        }, 'OPENING_BALANCE', 'PRODUCT-'.$validated['product_code'], 'Saldo awal stok produk baru '.$validated['product_name']);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil ditambahkan',
            'data' => self::toApiArray($out['result']->load(['activeBatches', 'category'])),
            'journal' => $out['journal']?->toApiArray(),
        ], 201);
    }

    public function show($id): JsonResponse
    {
        $product = Product::with(['activeBatches', 'category', 'stockMovements' => function ($q) {
            $q->orderBy('created_at', 'desc')->limit(20);
        }])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => self::toApiArray($product) + ['stock_movements' => $product->stockMovements],
        ]);
    }

    /**
     * Ubah master data & harga. Stok dan batch FIFO tidak diubah dari sini.
     */
    public function update(ProductRequest $request, $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $validated = $request->validated();
        unset($validated['initial_batch']);
        $validated['product_code'] ??= $product->product_code;
        $validated['barcode'] ??= $product->barcode;

        $product->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui',
            'data' => self::toApiArray($product->load(['activeBatches', 'category'])),
        ]);
    }

    /**
     * Produk yang sudah punya riwayat atau masih bernilai stok hanya dinonaktifkan agar histori & nilai buku tetap utuh.
     */
    public function destroy($id): JsonResponse
    {
        $product = Product::findOrFail($id);

        $hasHistory = $product->saleDetails()->exists()
            || $product->stockMovements()->exists()
            || $product->batches()->where('remaining_qty', '>', 0)->exists();

        if ($hasHistory) {
            $product->update(['is_active' => false]);

            return response()->json([
                'success' => true,
                'message' => 'Produk memiliki riwayat stok/penjualan sehingga dinonaktifkan, bukan dihapus.',
                'data' => ['deleted' => false, 'deactivated' => true],
            ]);
        }

        $product->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus',
            'data' => ['deleted' => true, 'deactivated' => false],
        ]);
    }

    public static function toApiArray(Product $product): array
    {
        return $product->toArray() + ['category_code' => $product->category?->category_code];
    }

    private static function uniqueCode(string $column, string $prefix): string
    {
        do {
            $code = $prefix === '899'
                ? '899'.str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT)
                : $prefix.'-'.strtoupper(Str::random(8));
        } while (Product::withTrashed()->where($column, $code)->exists());

        return $code;
    }
}
