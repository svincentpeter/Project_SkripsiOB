<?php

namespace App\Http\Controllers\Api\v1;

use App\Exceptions\PosRuleException;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductPriceAudit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Audit Log Penentuan & Perubahan Harga Jual (oleh Kasir di POS, Owner di Master Produk,
 * maupun saat Penerimaan Barang/Restock Batch FIFO) serta manajemen Notifikasi Tinjauan Owner.
 */
class PriceAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => self::listPayload($request),
        ]);
    }

    /**
     * Daftar log audit harga beserta ringkasan hitungan dalam satu agregasi SQL.
     */
    public static function listPayload(?Request $request = null, int $defaultLimit = 100): array
    {
        $query = ProductPriceAudit::with(['product', 'sale', 'changedByUser', 'reviewer'])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request?->filled('actor_role') && $request->actor_role !== 'ALL') {
            $query->where('actor_role', strtoupper((string) $request->actor_role));
        }

        if ($request?->filled('applies_to') && $request->applies_to !== 'ALL') {
            $query->where('applies_to', (string) $request->applies_to);
        }

        if ($request?->filled('change_source') && $request->change_source !== 'ALL') {
            $query->where('change_source', (string) $request->change_source);
        }

        if ($request?->boolean('unreviewed_only')) {
            $query->where('is_reviewed_by_owner', false);
        }

        if ($request?->boolean('unread_only')) {
            $query->where('is_read_by_owner', false);
        }

        if ($request?->filled('product_id')) {
            $query->where('product_id', (int) $request->product_id);
        }

        if ($request?->filled('search')) {
            $s = trim((string) $request->search);
            $query->where(function ($q) use ($s) {
                $q->where('actor_name', 'like', "%{$s}%")
                    ->orWhere('reason', 'like', "%{$s}%")
                    ->orWhereHas('product', function ($pq) use ($s) {
                        $pq->withTrashed()
                            ->where('product_name', 'like', "%{$s}%")
                            ->orWhere('product_code', 'like', "%{$s}%")
                            ->orWhere('brand', 'like', "%{$s}%")
                            ->orWhere('product_size', 'like', "%{$s}%");
                    })
                    ->orWhereHas('sale', function ($sq) use ($s) {
                        $sq->where('reference', 'like', "%{$s}%")
                            ->orWhere('customer_name', 'like', "%{$s}%")
                            ->orWhere('vehicle_plate', 'like', "%{$s}%");
                    });
            });
        }

        $limit = min(max((int) ($request?->input('limit', $defaultLimit) ?? $defaultLimit), 1), 500);
        $items = $query->limit($limit)->get();

        $agg = ProductPriceAudit::query()->selectRaw("
            COUNT(*) as total_logs,
            COALESCE(SUM(CASE WHEN actor_role = 'KASIR' THEN 1 ELSE 0 END), 0) as cashier_total_count,
            COALESCE(SUM(CASE WHEN change_source = 'pos_cashier_initial' THEN 1 ELSE 0 END), 0) as initial_price_count,
            COALESCE(SUM(CASE WHEN change_source = 'pos_cashier_override' THEN 1 ELSE 0 END), 0) as reimburse_override_count,
            COALESCE(SUM(CASE WHEN is_read_by_owner = 0 THEN 1 ELSE 0 END), 0) as unread_owner_count,
            COALESCE(SUM(CASE WHEN is_reviewed_by_owner = 0 AND change_source IN ('pos_cashier_initial', 'pos_cashier_override', 'goods_receipt_margin_warning') THEN 1 ELSE 0 END), 0) as unreviewed_owner_count
        ")->first();

        $summary = [
            'total_logs' => (int) ($agg->total_logs ?? 0),
            'cashier_total_count' => (int) ($agg->cashier_total_count ?? 0),
            'initial_price_count' => (int) ($agg->initial_price_count ?? 0),
            'reimburse_override_count' => (int) ($agg->reimburse_override_count ?? 0),
            'unread_owner_count' => (int) ($agg->unread_owner_count ?? 0),
            'unreviewed_owner_count' => (int) ($agg->unreviewed_owner_count ?? 0),
        ];

        return [
            'items' => $items->map(fn (ProductPriceAudit $a) => $a->toApiArray())->values()->all(),
            'summary' => $summary,
        ];
    }

    /**
     * Owner meninjau/menyetujui log perubahan harga (dan opsional menyesuaikan Harga Jual Master Katalog).
     */
    public function review(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'review_notes' => 'nullable|string|max:255',
            'new_catalog_price' => 'nullable|numeric|min:0',
        ]);

        $user = $request->user();

        $audit = DB::transaction(function () use ($id, $validated, $user) {
            $audit = ProductPriceAudit::with(['product.activeBatches', 'sale'])->lockForUpdate()->findOrFail($id);
            $product = $audit->product;
            $newCatalogPrice = isset($validated['new_catalog_price']) && $validated['new_catalog_price'] !== null
                ? round((float) $validated['new_catalog_price'], 2)
                : null;

            if ($newCatalogPrice !== null && $newCatalogPrice > 0 && $product) {
                $refHpp = $product->referenceHpp();
                $minPrice = $product->minimumSellingPrice();
                if ($refHpp > 0 && $newCatalogPrice + 0.01 < $minPrice) {
                    throw new PosRuleException(
                        'Harga katalog koreksi Owner minimal harus +15% dari HPP patokan Rp '
                        .number_format($refHpp, 0, ',', '.').' (minimal Rp '.number_format($minPrice, 0, ',', '.').').'
                    );
                }

                $oldCatalogPrice = (float) ($product->product_price ?? 0);
                if (abs($newCatalogPrice - $oldCatalogPrice) > 0.01) {
                    $product->update(['product_price' => $newCatalogPrice]);

                    ProductPriceAudit::create([
                        'product_id' => $product->id,
                        'sale_id' => $audit->sale_id,
                        'old_cost' => (float) ($product->product_cost ?? 0),
                        'new_cost' => (float) ($product->product_cost ?? 0),
                        'reference_hpp' => $refHpp,
                        'old_price' => $oldCatalogPrice,
                        'new_price' => $newCatalogPrice,
                        'cost_change_percent' => 0,
                        'price_change_percent' => $oldCatalogPrice > 0 ? round((($newCatalogPrice - $oldCatalogPrice) / $oldCatalogPrice) * 100, 2) : 100.0,
                        'markup_percent' => $refHpp > 0 ? round((($newCatalogPrice - $refHpp) / $refHpp) * 100, 2) : null,
                        'change_source' => 'owner_review_adjustment',
                        'changed_field' => 'price',
                        'context_month' => now()->format('Y-m'),
                        'changed_by' => $user?->id,
                        'actor_name' => $user?->name ?? 'Owner OB3',
                        'actor_role' => $user?->role ?? 'OWNER',
                        'applies_to' => 'CATALOG',
                        'reason' => trim((string) ($validated['review_notes'] ?? '')) ?: "Koreksi harga katalog oleh Owner dari tinjauan audit #{$audit->id}",
                        'is_read_by_owner' => true,
                        'is_reviewed_by_owner' => true,
                        'reviewed_at' => now(),
                        'reviewed_by' => $user?->id,
                    ]);
                }
            }

            $audit->update([
                'is_read_by_owner' => true,
                'is_reviewed_by_owner' => true,
                'reviewed_at' => now(),
                'reviewed_by' => $user?->id,
                'review_notes' => $validated['review_notes'] ?? $audit->review_notes ?? 'Ditinjau & disetujui oleh Owner',
            ]);

            return $audit->fresh(['product', 'sale', 'changedByUser', 'reviewer']);
        });

        return response()->json([
            'success' => true,
            'message' => 'Log perubahan harga berhasil ditinjau.',
            'data' => $audit->toApiArray(),
        ]);
    }

    /**
     * Tandai satu atau semua notifikasi audit harga sebagai sudah dibaca oleh Owner.
     */
    public function markRead(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'id' => 'nullable|integer|exists:product_price_audits,id',
        ]);

        if (! empty($validated['id'])) {
            ProductPriceAudit::where('id', (int) $validated['id'])->update(['is_read_by_owner' => true]);
        } else {
            ProductPriceAudit::where('is_read_by_owner', false)->update(['is_read_by_owner' => true]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notifikasi audit harga ditandai sudah dibaca.',
            'data' => [
                'unread_owner_count' => ProductPriceAudit::where('is_read_by_owner', false)->count(),
            ],
        ]);
    }
}
