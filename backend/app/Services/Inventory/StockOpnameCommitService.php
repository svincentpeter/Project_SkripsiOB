<?php

namespace App\Services\Inventory;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use App\Services\Inventory\Excel\StockMatchKey;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

/**
 * Menulis hasil opname ke database dalam satu transaksi.
 *
 * Aturan penting: batch bertaut pembelian tidak pernah dihapus (hanya
 * dinolkan), kartu stok mencatat selisih, dan produk tidak pernah dihapus.
 */
class StockOpnameCommitService
{
    public function commit(array $staging, string $period, array $options = []): array
    {
        if (! preg_match('/^\d{4}-\d{2}$/', $period)) {
            throw new RuntimeException("Periode harus berformat YYYY-MM, diterima: {$period}");
        }

        // Jangan pakai createFromFormat('Y-m'): tanggalnya diisi dari hari ini,
        // sehingga "2026-09" pada tanggal 31 melimpah menjadi 1 Oktober.
        $effectiveDate = Carbon::createFromFormat('Y-m-d', $period.'-01')->startOfDay();
        $force = (bool) ($options['force'] ?? false);
        $branchId = $options['branch_id'] ?? (function_exists('active_branch_id') ? active_branch_id() : null) ?? 3;
        $userId = $options['user_id'] ?? auth()->id() ?? 1;
        $onlyKeys = $options['only_match_keys'] ?? null;

        $this->guardExistingSales($effectiveDate, $force);

        $products = $staging['products'] ?? [];
        if ($onlyKeys !== null) {
            $products = array_values(array_filter($products, fn ($p) => in_array($p['match_key'], $onlyKeys, true)));
        }

        if ($products === []) {
            throw new RuntimeException('Tidak ada produk untuk di-commit.');
        }

        $snapshotPath = $this->writeSnapshot($period);

        $result = [
            'created' => 0, 'updated' => 0, 'deactivated' => 0, 'zeroed' => 0,
            'batches_created' => 0, 'movements' => 0, 'price_audits' => 0,
            'snapshot_path' => $snapshotPath,
        ];

        DB::transaction(function () use ($products, $onlyKeys, $effectiveDate, $branchId, $userId, $period, &$result) {
            $touchedIds = [];
            $batchCode = 'OPNAME-'.$effectiveDate->format('Ym');
            $index = $this->buildProductIndex();

            foreach ($products as $item) {
                $product = $this->findProduct($item, $index);
                $qty = (int) $item['total_stock'];
                $cost = (int) ($item['avg_cost'] ?? 0);
                $price = (int) ($item['product_price'] ?? 0);

                if ($product) {
                    $cost = $cost > 0 ? $cost : (int) $product->product_cost;
                    $price = $price > 0 ? $price : (int) $product->product_price;
                }

                $oldQty = $product ? (int) $product->product_quantity : 0;
                $oldCost = $product ? (int) $product->product_cost : null;
                $oldPrice = $product ? (int) $product->product_price : null;

                $productCode = $product ? $product->product_code : ($item['product_code'] ?: '');
                if (! $product && ($productCode === '' || Product::where('product_code', $productCode)->exists())) {
                    $prefix = strtoupper(substr($item['brand_name'] ?? 'UNK', 0, 3));
                    $sizePart = str_replace(['/', ' '], '', (string) ($item['product_size'] ?? '0'));
                    $ringPart = trim((string) ($item['ring'] ?? '0'));
                    $baseCode = sprintf('%s-%s-%s', $prefix, $sizePart === '' ? '0' : $sizePart, $ringPart === '' ? '0' : $ringPart);
                    $seq = Product::where('product_code', 'like', "{$baseCode}-%")->count() + 1;
                    $productCode = sprintf('%s-%04d', $baseCode, $seq);
                    while (Product::where('product_code', $productCode)->exists()) {
                        $seq++;
                        $productCode = sprintf('%s-%04d', $baseCode, $seq);
                    }
                }

                $attributes = [
                    'product_name' => $item['product_name'],
                    'product_code' => $productCode,
                    'brand' => $item['brand_name'],
                    'brand_id' => $item['brand_id'],
                    'category_id' => $item['category_id'] ?? 1,
                    'product_size' => $item['product_size'] ?: '-',
                    'ring' => $item['ring'] ?: '-',
                    'product_year' => $item['product_year'] ?: (int) date('Y'),
                    'product_cost' => $cost,
                    'product_price' => $price,
                    'product_quantity' => $qty,
                    'stok_awal' => $qty,
                    'is_active' => true,
                    'is_old_stock' => (bool) $item['is_old_stock'],
                    'reference_price' => $item['reference_price'],
                ];

                if ($product) {
                    $product->update($attributes);
                    $result['updated']++;
                } else {
                    $attributes['condition_code'] = 'BARU';
                    $attributes['product_stock_alert'] = 1;
                    $attributes['barcode'] = 'BRC-' . $productCode;
                    $attributes['size_width'] = 0;
                    $attributes['size_ratio'] = 0;
                    $attributes['motif'] = '-';
                    $attributes['branch_id'] = $branchId;
                    $product = Product::create($attributes);
                    $result['created']++;
                }

                $touchedIds[] = $product->id;

                $this->replaceBatches($product, $item['batches'], $batchCode, $effectiveDate, $branchId, $result);
                $this->recordMovement($product, $oldQty, $qty, $branchId, $userId, $effectiveDate, $result);
                $this->recordPriceAudit($product, $oldCost, $oldPrice, $cost, $price, $period, $userId, $result);
            }

            // Penolkan produk hanya sah pada sinkronisasi PENUH. Pada sinkronisasi
            // sebagian, produk yang tidak dipilih bukan berarti tidak ada di Excel —
            // menolkannya akan mengosongkan stok seluruh toko.
            if ($onlyKeys === null) {
                $this->handleAbsentProducts($touchedIds, $branchId, $userId, $effectiveDate, $result);
            }
        });

        return $result;
    }

    private function guardExistingSales(Carbon $effectiveDate, bool $force): void
    {
        if ($force || ! Schema::hasTable('sales')) {
            return;
        }

        $count = DB::table('sales')->whereDate('date', '>=', $effectiveDate->toDateString())->count();

        if ($count > 0) {
            throw new RuntimeException(
                "Ditemukan {$count} penjualan pada atau sesudah {$effectiveDate->toDateString()}. "
                .'Menimpa stok sekarang akan menghapus pengaruh penjualan tersebut. '
                .'Gunakan opsi paksa bila memang disengaja.'
            );
        }
    }

    /**
     * Indeks produk database berdasarkan kunci pencocokan, dibangun sekali per commit.
     *
     * @return array<string,Product>
     */
    private function buildProductIndex(): array
    {
        $aliases = StockMatchKey::aliasesFromDatabase();
        $index = [];

        foreach (Product::all() as $product) {
            $year = $product->product_year ? (int) $product->product_year : null;
            $isOld = (bool) $product->is_old_stock;
            $brandId = (int) ($product->brand_id ?: 0);
            if ($brandId === 0 && ! empty($product->brand)) {
                $brandId = (int) (DB::table('brands')->where('name', $product->brand)->value('id') ?: 0);
            }

            $key = StockMatchKey::make(
                $brandId,
                (string) $product->product_name,
                $product->product_size,
                $product->ring === null ? null : (string) $product->ring,
                $aliases,
                $year,
                $isOld
            );

            // Produk pertama yang menempati kunci yang menang; sisanya diurus
            // sebagai produk absen (dinolkan) supaya tidak ada stok ganda.
            $index[$key] ??= $product;
        }

        return $index;
    }

    /** @param  array<string,Product>  $index */
    private function findProduct(array $item, array $index): ?Product
    {
        return $index[$item['match_key']] ?? null;
    }

    private function replaceBatches(
        Product $product,
        array $batches,
        string $batchCode,
        Carbon $effectiveDate,
        ?int $branchId,
        array &$result
    ): void {
        // Batch trial adalah artefak uji coba: boleh dihapus.
        ProductBatch::where('product_id', $product->id)
            ->where('batch_code', 'like', 'STOCKTRIAL-%')
            ->delete();

        // Batch opname periode ini untuk produk ini ditulis ulang supaya impor idempoten.
        ProductBatch::where('product_id', $product->id)
            ->where(function ($q) use ($batchCode, $product) {
                $q->where('batch_code', $batchCode)
                  ->orWhere('batch_code', 'like', "{$batchCode}-{$product->product_code}%");
            })
            ->delete();

        // Sisanya (termasuk yang bertaut pembelian) dipertahankan, hanya dinolkan.
        ProductBatch::where('product_id', $product->id)
            ->where('remaining_qty', '>', 0)
            ->update(['remaining_qty' => 0]);

        $hasBranch = Schema::hasColumn('product_batches', 'branch_id');
        $hasSourceName = Schema::hasColumn('product_batches', 'source_name');

        $bIdx = 0;
        foreach ($batches as $b) {
            $bIdx++;
            $uniqueBatchCode = sprintf('%s-%s-%02d', $batchCode, $product->product_code, $bIdx);

            $attributes = [
                'product_id' => $product->id,
                'batch_code' => $uniqueBatchCode,
                'batch_cost' => (float) ($b['batch_cost'] ?? 0),
                'initial_qty' => (int) $b['initial_qty'],
                'remaining_qty' => (int) $b['remaining_qty'],
                'purchase_date' => $effectiveDate->toDateString(),
            ];

            if ($hasSourceName) {
                $attributes['source_name'] = 'Opname Excel '.$effectiveDate->format('F Y');
            }

            if ($hasBranch) {
                $attributes['branch_id'] = $branchId ?? 3;
            }

            ProductBatch::create($attributes);
            $result['batches_created']++;
        }
    }

    private function recordMovement(
        Product $product,
        int $oldQty,
        int $newQty,
        ?int $branchId,
        ?int $userId,
        Carbon $effectiveDate,
        array &$result
    ): void {
        $delta = $newQty - $oldQty;

        if ($delta === 0) {
            return;
        }

        $movementType = $delta > 0 ? 'MASUK' : 'PENYESUAIAN';

        $data = [
            'product_id' => $product->id,
            'branch_id' => $branchId ?? 3,
            'movement_type' => $movementType,
            'quantity' => abs($delta),
            'balance_after' => $newQty,
            'reference_type' => 'STOCK_OPNAME',
            'reference_id' => 'OPNAME-'.$effectiveDate->format('Ym'),
            'description' => 'Opname Stok Awal '.$effectiveDate->translatedFormat('F Y'),
            'operator_name' => auth()->user()?->name ?? 'Admin Opname Excel',
        ];

        if (Schema::hasColumn('stock_movements', 'type')) {
            $data['type'] = $delta > 0 ? 'in' : 'out';
        }
        if (Schema::hasColumn('stock_movements', 'ref_type')) {
            $data['ref_type'] = 'opening';
        }
        if (Schema::hasColumn('stock_movements', 'user_id')) {
            $data['user_id'] = $userId;
        }

        StockMovement::create($data);

        $result['movements']++;
    }

    private function recordPriceAudit(
        Product $product,
        ?int $oldCost,
        ?int $oldPrice,
        int $newCost,
        int $newPrice,
        string $period,
        ?int $userId,
        array &$result
    ): void {
        $costChanged = $oldCost !== null && $oldCost !== $newCost;
        $priceChanged = $oldPrice !== null && $oldPrice !== $newPrice;

        if (! $costChanged && ! $priceChanged) {
            return;
        }

        $percent = fn (?int $old, int $new): float => ($old === null || $old === 0)
            ? 0.0
            : round((($new - $old) / $old) * 100, 2);

        $baris = [];

        if ($costChanged) {
            $baris[] = ['changed_field' => 'product_cost'];
        }
        if ($priceChanged) {
            $baris[] = ['changed_field' => 'product_price'];
        }

        foreach ($baris as $tambahan) {
            ProductPriceAudit::create(array_merge([
                'product_id' => $product->id,
                'old_cost' => $oldCost ?? 0,
                'new_cost' => $newCost,
                'old_price' => $oldPrice ?? 0,
                'new_price' => $newPrice,
                'cost_change_percent' => $percent($oldCost, $newCost),
                'price_change_percent' => $percent($oldPrice, $newPrice),
                'change_source' => 'import',
                'context_month' => $period,
                'changed_by' => $userId,
                'reason' => 'Rekonsiliasi stok Excel',
            ], $tambahan));

            $result['price_audits']++;
        }
    }

    /** @param  array<int,int>  $touchedIds */
    private function handleAbsentProducts(
        array $touchedIds,
        ?int $branchId,
        ?int $userId,
        Carbon $effectiveDate,
        array &$result
    ): void {
        $absent = Product::query()
            ->whereNotIn('id', $touchedIds ?: [0])
            ->where(function ($q) {
                $q->where('product_quantity', '>', 0)->orWhere('is_active', true);
            })
            ->get();

        $soldIds = Schema::hasTable('sale_details')
            ? DB::table('sale_details')->whereNotNull('product_id')->distinct()->pluck('product_id')->all()
            : [];

        foreach ($absent as $product) {
            $oldQty = (int) $product->product_quantity;
            $pernahTerjual = in_array($product->id, $soldIds);

            if ($oldQty === 0 && ($pernahTerjual || ! $product->is_active)) {
                continue;
            }

            ProductBatch::where('product_id', $product->id)
                ->where('batch_code', 'like', 'STOCKTRIAL-%')
                ->delete();
            ProductBatch::where('product_id', $product->id)
                ->where('remaining_qty', '>', 0)
                ->update(['remaining_qty' => 0]);

            $product->update([
                'product_quantity' => 0,
                'stok_awal' => 0,
                'is_active' => $pernahTerjual,
            ]);

            if ($oldQty > 0) {
                $result['zeroed']++;
                $this->recordMovement($product, $oldQty, 0, $branchId, $userId, $effectiveDate, $result);
            }
            if (! $pernahTerjual) {
                $result['deactivated']++;
            }
        }
    }

    private function writeSnapshot(string $period): string
    {
        $dir = storage_path('app/stock_migration');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $path = $dir.'/rollback_'.$period.'_'.date('Ymd_His').'.json';

        file_put_contents($path, json_encode([
            'period' => $period,
            'created_at' => date('c'),
            'products' => DB::table('products')
                ->get(['id', 'product_quantity', 'stok_awal', 'product_cost', 'product_price', 'is_active'])
                ->map(fn ($p) => (array) $p)->all(),
            'batches' => DB::table('product_batches')
                ->get(['id', 'product_id', 'batch_code', 'batch_cost', 'initial_qty', 'remaining_qty', 'purchase_date'])
                ->map(fn ($b) => (array) $b)->all(),
        ], JSON_PRETTY_PRINT));

        return $path;
    }
}
