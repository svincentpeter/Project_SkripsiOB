<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductPriceAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Pengaturan standar persentase keuntungan (markup) penjualan per merek.
 * Standar minimum global toko = 15%; setiap merek dapat menetapkan minimum >= 15%
 * dan target/custom markup sendiri serta menerapkannya ke produk aktif merek tersebut.
 */
class BrandPricingController extends Controller
{
    public function index(): JsonResponse
    {
        // Sinkronkan merek yang sudah dipakai produk namun belum terdaftar di tabel brands.
        $existingNames = Brand::withTrashed()->pluck('name')->map(fn (string $n) => mb_strtolower(trim($n)))->all();
        $productBrands = Product::query()
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->distinct()
            ->pluck('brand');

        foreach ($productBrands as $rawBrand) {
            $trimmed = trim((string) $rawBrand);
            if ($trimmed === '') {
                continue;
            }
            $lower = mb_strtolower($trimmed);
            if (! in_array($lower, $existingNames, true)) {
                Brand::create([
                    'name' => $trimmed,
                    'is_partner' => false,
                    'min_markup_percent' => Brand::GLOBAL_MIN_MARKUP_PERCENT,
                    'default_markup_percent' => Brand::GLOBAL_MIN_MARKUP_PERCENT,
                ]);
                $existingNames[] = $lower;
            }
        }

        $brands = Brand::query()
            ->where('name', '!=', '-')
            ->orderBy('name')
            ->get();
        $products = Product::with('activeBatches:id,product_id,batch_cost')
            ->select(['id', 'brand_id', 'brand', 'product_cost', 'product_price', 'is_active'])
            ->get();

        $byBrandId = $products->groupBy('brand_id');
        $byBrandName = $products->groupBy(fn (Product $p) => mb_strtolower(trim((string) $p->brand)));

        $rows = $brands->map(function (Brand $brand) use ($byBrandId, $byBrandName) {
            $matched = $byBrandId->get($brand->id, collect())
                ->merge($byBrandName->get(mb_strtolower(trim($brand->name)), collect()))
                ->unique('id')
                ->values();

            $active = $matched->filter(fn (Product $p) => $p->is_active !== false);
            $markups = $active->map(function (Product $p) {
                $hpp = $p->referenceHpp();
                $price = (float) ($p->product_price ?? 0);
                if ($hpp <= 0 || $price <= 0) {
                    return null;
                }

                return (($price - $hpp) / $hpp) * 100;
            })->filter(fn ($v) => $v !== null);

            $minPct = max(Brand::GLOBAL_MIN_MARKUP_PERCENT, (float) ($brand->min_markup_percent ?? Brand::GLOBAL_MIN_MARKUP_PERCENT));
            $defaultPct = max($minPct, (float) ($brand->default_markup_percent ?? $minPct));

            return [
                'id' => $brand->id,
                'name' => $brand->name,
                'is_partner' => (bool) $brand->is_partner,
                'min_markup_percent' => round($minPct, 2),
                'default_markup_percent' => round($defaultPct, 2),
                'product_count' => $matched->count(),
                'active_product_count' => $active->count(),
                'zero_price_count' => $active->filter(fn (Product $p) => (float) ($p->product_price ?? 0) <= 0)->count(),
                'avg_current_markup_percent' => $markups->isNotEmpty() ? round((float) $markups->avg(), 2) : null,
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:brands,name',
            'is_partner' => 'nullable|boolean',
            'min_markup_percent' => 'nullable|numeric|min:15|max:500',
            'default_markup_percent' => 'nullable|numeric|min:15|max:500',
        ]);

        $minPct = round((float) ($validated['min_markup_percent'] ?? Brand::GLOBAL_MIN_MARKUP_PERCENT), 2);
        $defaultPct = round(max($minPct, (float) ($validated['default_markup_percent'] ?? $minPct)), 2);

        $brand = Brand::create([
            'name' => trim($validated['name']),
            'is_partner' => (bool) ($validated['is_partner'] ?? false),
            'min_markup_percent' => $minPct,
            'default_markup_percent' => $defaultPct,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Merek {$brand->name} berhasil ditambahkan.",
            'data' => [
                'id' => $brand->id,
                'name' => $brand->name,
                'is_partner' => (bool) $brand->is_partner,
                'min_markup_percent' => (float) $brand->min_markup_percent,
                'default_markup_percent' => (float) $brand->default_markup_percent,
                'product_count' => 0,
                'active_product_count' => 0,
                'zero_price_count' => 0,
                'avg_current_markup_percent' => null,
            ],
        ], 201);
    }

    public function updatePricing(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'min_markup_percent' => 'required|numeric|min:15|max:500',
            'default_markup_percent' => 'required|numeric|gte:min_markup_percent|max:500',
            'apply_to_products' => 'nullable|boolean',
        ], [
            'min_markup_percent.min' => 'Persentase keuntungan minimal tidak boleh kurang dari 15%.',
            'default_markup_percent.gte' => 'Persentase markup custom tidak boleh lebih rendah dari minimum persen merek.',
        ]);

        $brand = Brand::findOrFail($id);
        $minPct = round((float) $validated['min_markup_percent'], 2);
        $defaultPct = round((float) $validated['default_markup_percent'], 2);
        $applyToProducts = (bool) ($validated['apply_to_products'] ?? false);
        $user = $request->user();

        $updatedProductsCount = DB::transaction(function () use ($brand, $minPct, $defaultPct, $applyToProducts, $user) {
            $brand->update([
                'min_markup_percent' => $minPct,
                'default_markup_percent' => $defaultPct,
            ]);

            if (! $applyToProducts) {
                return 0;
            }

            $lowerName = mb_strtolower(trim($brand->name));
            $products = Product::with('activeBatches')
                ->where('is_active', true)
                ->where(function ($q) use ($brand, $lowerName) {
                    $q->where('brand_id', $brand->id)
                        ->orWhereRaw('LOWER(TRIM(brand)) = ?', [$lowerName]);
                })
                ->lockForUpdate()
                ->get();

            $count = 0;
            $isOwner = ($user?->role ?? 'OWNER') === 'OWNER';

            foreach ($products as $product) {
                $refHpp = $product->referenceHpp();
                if ($refHpp <= 0) {
                    continue;
                }
                $oldPrice = (float) ($product->product_price ?? 0);
                $newPrice = round($refHpp * (1 + $defaultPct / 100), 2);
                if (abs($newPrice - $oldPrice) <= 0.01) {
                    continue;
                }

                $product->update([
                    'brand_id' => $product->brand_id ?? $brand->id,
                    'product_price' => $newPrice,
                ]);

                ProductPriceAudit::create([
                    'product_id' => $product->id,
                    'old_cost' => (float) ($product->product_cost ?? 0),
                    'new_cost' => (float) ($product->product_cost ?? 0),
                    'reference_hpp' => $refHpp,
                    'old_price' => $oldPrice,
                    'new_price' => $newPrice,
                    'cost_change_percent' => 0,
                    'price_change_percent' => $oldPrice > 0 ? round((($newPrice - $oldPrice) / $oldPrice) * 100, 2) : 100.0,
                    'markup_percent' => $defaultPct,
                    'change_source' => 'brand_markup_policy',
                    'changed_field' => 'price',
                    'context_month' => now()->format('Y-m'),
                    'changed_by' => $user?->id,
                    'actor_name' => $user?->name ?? 'Owner OB3',
                    'actor_role' => $user?->role ?? 'OWNER',
                    'applies_to' => 'CATALOG',
                    'reason' => "Penerapan standar markup merek {$brand->name} (+{$defaultPct}% dari HPP)",
                    'is_read_by_owner' => $isOwner,
                    'is_reviewed_by_owner' => $isOwner,
                    'reviewed_at' => $isOwner ? now() : null,
                    'reviewed_by' => $isOwner ? $user?->id : null,
                ]);
                $count++;
            }

            return $count;
        });

        return response()->json([
            'success' => true,
            'message' => $applyToProducts
                ? "Standar markup merek {$brand->name} disimpan (+{$defaultPct}%) dan diterapkan ke {$updatedProductsCount} produk aktif."
                : "Standar markup merek {$brand->name} berhasil disimpan (Min. {$minPct}%, Custom {$defaultPct}%).",
            'data' => [
                'id' => $brand->id,
                'name' => $brand->name,
                'min_markup_percent' => (float) $brand->min_markup_percent,
                'default_markup_percent' => (float) $brand->default_markup_percent,
                'updated_products_count' => $updatedProductsCount,
            ],
        ]);
    }
}
