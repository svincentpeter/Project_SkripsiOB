<?php

namespace App\Http\Controllers\Api\v1;

use App\Exceptions\PosRuleException;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductRequest;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => self::listPayload($request),
        ]);
    }

    /**
     * Query ringkas master produk beserta batch FIFO aktif untuk endpoint katalog dan bootstrap.
     */
    public static function listPayload(?Request $request = null): array
    {
        $query = Product::with([
            'activeBatches:id,product_id,batch_code,source_name,purchase_date,batch_cost,initial_qty,remaining_qty',
            'category:id,category_code',
            'brandRelation:id,name,min_markup_percent,default_markup_percent',
        ])->select([
            'id', 'category_id', 'brand_id', 'brand', 'product_name', 'product_code', 'barcode',
            'size_width', 'size_ratio', 'ring', 'product_size', 'motif', 'condition_code',
            'product_year', 'product_cost', 'product_price', 'reference_price',
            'product_quantity', 'stok_awal', 'product_stock_alert', 'is_active', 'is_old_stock',
        ]);

        if ($request?->filled('brand')) {
            $query->where('brand', $request->brand);
        }

        if ($request?->filled('ring')) {
            $query->where('ring', $request->ring);
        }

        if ($request?->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('product_name', 'like', "%{$s}%")
                    ->orWhere('product_code', 'like', "%{$s}%")
                    ->orWhere('barcode', 'like', "%{$s}%")
                    ->orWhere('brand', 'like', "%{$s}%")
                    ->orWhere('product_size', 'like', "%{$s}%");
            });
        }

        return $query->orderBy('product_name')->get()
            ->map(fn (Product $p) => self::toListArray($p))
            ->values()
            ->all();
    }

    /**
     * Produk baru; stok awal (initial_batch) dijurnal sebagai saldo awal persediaan (Dr 1-2000, Cr 3-1000).
     * Jika harga jual diisi (> Rp 0), wajib minimal +15% dari HPP patokan.
     */
    public function store(ProductRequest $request, InventoryValueJournal $valueJournal): JsonResponse
    {
        $validated = $request->validated();
        $initialBatch = $validated['initial_batch'] ?? null;
        $reason = trim((string) ($validated['price_change_reason'] ?? ''));
        unset($validated['initial_batch'], $validated['price_change_reason']);

        $refHpp = round(max((float) $validated['product_cost'], (float) ($initialBatch['batch_cost'] ?? 0)), 2);
        $minPrice = round($refHpp * (1 + Product::MIN_MARKUP_RATE), 2);
        $sellPrice = round((float) $validated['product_price'], 2);
        if ($sellPrice > 0 && $refHpp > 0 && $sellPrice + 0.01 < $minPrice) {
            throw new PosRuleException(
                'Harga jual produk minimal harus +15% dari HPP Rp '.number_format($refHpp, 0, ',', '.')
                .' (minimal Rp '.number_format($minPrice, 0, ',', '.').').'
            );
        }

        $validated['product_code'] ??= self::uniqueCode('product_code', 'PRD');
        $validated['barcode'] ??= self::uniqueCode('barcode', '899');

        $out = $valueJournal->record(function () use ($validated, $initialBatch, $refHpp, $sellPrice, $reason) {
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

            if ($sellPrice > 0) {
                $user = auth()->user();
                $isOwner = ($user?->role ?? 'OWNER') === 'OWNER';
                ProductPriceAudit::create([
                    'product_id' => $product->id,
                    'old_cost' => 0,
                    'new_cost' => (float) $product->product_cost,
                    'reference_hpp' => $refHpp,
                    'old_price' => 0,
                    'new_price' => $sellPrice,
                    'cost_change_percent' => 100,
                    'price_change_percent' => 100,
                    'markup_percent' => $refHpp > 0 ? round((($sellPrice - $refHpp) / $refHpp) * 100, 2) : null,
                    'change_source' => 'master_product_create',
                    'changed_field' => 'both',
                    'context_month' => now()->format('Y-m'),
                    'changed_by' => $user?->id,
                    'actor_name' => $user?->name ?? 'Owner OB3',
                    'actor_role' => $user?->role ?? 'OWNER',
                    'applies_to' => 'CATALOG',
                    'reason' => $reason !== '' ? $reason : 'Penentuan harga jual master produk baru',
                    'is_read_by_owner' => $isOwner,
                    'is_reviewed_by_owner' => $isOwner,
                    'reviewed_at' => $isOwner ? now() : null,
                    'reviewed_by' => $isOwner ? $user?->id : null,
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
     * Jika harga jual diisi (> Rp 0), wajib minimal +15% dari HPP patokan batch aktif.
     */
    public function update(ProductRequest $request, $id): JsonResponse
    {
        $product = Product::with('activeBatches')->findOrFail($id);
        $validated = $request->validated();
        $reason = trim((string) ($validated['price_change_reason'] ?? ''));
        unset($validated['initial_batch'], $validated['price_change_reason']);

        $oldCost = (float) ($product->product_cost ?? 0);
        $oldPrice = (float) ($product->product_price ?? 0);
        $hasActiveBatches = $product->activeBatches->isNotEmpty();
        $latestBatchCost = $hasActiveBatches
            ? (float) $product->activeBatches->sortBy([['purchase_date', 'desc'], ['id', 'desc']])->first()->batch_cost
            : 0.0;
        // Jika produk sudah memiliki stok batch FIFO aktif, HPP master harus tetap mengikuti layer batch FIFO
        // (perubahan modal stok dilakukan lewat Penerimaan Barang / Buku Stok FIFO agar seimbang dengan akun 1-2000).
        $newCost = $hasActiveBatches
            ? round($latestBatchCost, 2)
            : round((float) $validated['product_cost'], 2);
        $validated['product_cost'] = $newCost;

        $newPrice = round((float) $validated['product_price'], 2);
        $maxBatchCost = (float) ($product->activeBatches->max('batch_cost') ?? 0);
        $refHpp = round(max($newCost, $maxBatchCost), 2);
        $minPrice = round($refHpp * (1 + Product::MIN_MARKUP_RATE), 2);

        if ($newPrice > 0 && $refHpp > 0 && $newPrice + 0.01 < $minPrice) {
            throw new PosRuleException(
                'Harga jual produk minimal harus +15% dari HPP patokan batch Rp '.number_format($refHpp, 0, ',', '.')
                .' (minimal Rp '.number_format($minPrice, 0, ',', '.').').'
            );
        }

        $validated['product_code'] ??= $product->product_code;
        $validated['barcode'] ??= $product->barcode;

        $product->update($validated);

        $costChanged = abs($newCost - $oldCost) > 0.01;
        $priceChanged = abs($newPrice - $oldPrice) > 0.01;
        if ($costChanged || $priceChanged) {
            $user = auth()->user();
            $isOwner = ($user?->role ?? 'OWNER') === 'OWNER';
            ProductPriceAudit::create([
                'product_id' => $product->id,
                'old_cost' => $oldCost,
                'new_cost' => $newCost,
                'reference_hpp' => $refHpp,
                'old_price' => $oldPrice,
                'new_price' => $newPrice,
                'cost_change_percent' => $oldCost > 0 ? round((($newCost - $oldCost) / $oldCost) * 100, 2) : null,
                'price_change_percent' => $oldPrice > 0 ? round((($newPrice - $oldPrice) / $oldPrice) * 100, 2) : 100.0,
                'markup_percent' => $refHpp > 0 && $newPrice > 0 ? round((($newPrice - $refHpp) / $refHpp) * 100, 2) : null,
                'change_source' => 'master_product_edit',
                'changed_field' => $costChanged && $priceChanged ? 'both' : ($priceChanged ? 'price' : 'cost'),
                'context_month' => now()->format('Y-m'),
                'changed_by' => $user?->id,
                'actor_name' => $user?->name ?? 'Owner OB3',
                'actor_role' => $user?->role ?? 'OWNER',
                'applies_to' => 'CATALOG',
                'reason' => $reason !== '' ? $reason : 'Pembaruan harga jual / HPP di Master Produk',
                'is_read_by_owner' => $isOwner,
                'is_reviewed_by_owner' => $isOwner,
                'reviewed_at' => $isOwner ? now() : null,
                'reviewed_by' => $isOwner ? $user?->id : null,
            ]);
        }

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
        return $product->toArray() + [
            'category_code' => $product->category?->category_code,
            'reference_hpp' => $product->referenceHpp(),
            'min_selling_price' => $product->minimumSellingPrice(),
        ];
    }

    /**
     * Proyeksi ringan untuk daftar katalog POS & Inventori (menghindari serialisasi timestamp ratusan kali).
     */
    private static function toListArray(Product $product): array
    {
        $batches = $product->activeBatches;
        $baseCost = (float) ($product->product_cost ?? 0);
        $maxBatchCost = (float) ($batches->max('batch_cost') ?? 0);
        $refHpp = round(max($baseCost, $maxBatchCost), 2);
        $minRate = $product->minimumMarkupRate();

        return [
            'id' => $product->id,
            'category_id' => $product->category_id,
            'category_code' => $product->category?->category_code,
            'brand_id' => $product->brand_id,
            'brand' => $product->brand,
            'product_name' => $product->product_name,
            'product_code' => $product->product_code,
            'barcode' => $product->barcode,
            'size_width' => $product->size_width,
            'size_ratio' => $product->size_ratio,
            'ring' => $product->ring,
            'product_size' => $product->product_size,
            'motif' => $product->motif,
            'condition_code' => $product->condition_code,
            'product_year' => $product->product_year,
            'product_cost' => (string) $product->product_cost,
            'product_price' => (string) $product->product_price,
            'reference_price' => $product->reference_price !== null ? (string) $product->reference_price : null,
            'reference_hpp' => $refHpp,
            'min_selling_price' => round($refHpp * (1 + $minRate), 2),
            'product_quantity' => $product->product_quantity,
            'stok_awal' => $product->stok_awal,
            'product_stock_alert' => $product->product_stock_alert,
            'is_active' => $product->is_active,
            'is_old_stock' => $product->is_old_stock,
            'active_batches' => $batches->map(fn (ProductBatch $b) => [
                'id' => $b->id,
                'batch_code' => $b->batch_code,
                'source_name' => $b->source_name,
                'purchase_date' => $b->purchase_date?->toDateString(),
                'batch_cost' => (string) $b->batch_cost,
                'initial_qty' => $b->initial_qty,
                'remaining_qty' => $b->remaining_qty,
            ])->values()->all(),
        ];
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
