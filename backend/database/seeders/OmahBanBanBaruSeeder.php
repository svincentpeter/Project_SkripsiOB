<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ServiceMaster;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Master data ban baru Omah Ban (snapshot dari sistem ProjectOmahBan, 23 Sep 2026)
 * untuk Cabang 3. Stok dibuka per batch FIFO sesuai sisa batch sumber, sehingga
 * product_quantity selalu = SUM(product_batches.remaining_qty).
 *
 * Idempoten: produk/jasa/supplier yang kodenya sudah ada dilewati.
 */
class OmahBanBanBaruSeeder extends Seeder
{
    private const BRANCH_ID = 3;

    private const CATEGORIES = [
        'Ban Mobil' => 'BAN-MOBIL',
        'Ban Truck Diesel' => 'BAN-TRUCK',
    ];

    public function run(): void
    {
        $data = json_decode(file_get_contents(__DIR__.'/data/omahban_ban_baru.json'), true, flags: JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($data) {
            $categoryIds = $this->seedCategories();
            $this->seedProducts($data['products'], $categoryIds);
            $this->seedServices($data['services']);
            $this->seedSuppliers($data['suppliers']);
        });
    }

    private function seedCategories(): array
    {
        $ids = [];
        foreach (self::CATEGORIES as $name => $code) {
            DB::table('product_categories')->updateOrInsert(
                ['category_code' => $code],
                ['category_name' => $name, 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
            $ids[$name] = DB::table('product_categories')->where('category_code', $code)->value('id');
        }

        return $ids;
    }

    private function seedProducts(array $products, array $categoryIds): void
    {
        $usedCodes = [];

        foreach ($products as $row) {
            $code = $row['product_code'];
            $suffix = 1;
            while (isset($usedCodes[$code])) {
                $code = $row['product_code'].'-'.(++$suffix);
            }
            $usedCodes[$code] = true;

            if (Product::withTrashed()->where('product_code', $code)->exists()) {
                continue;
            }

            $brandName = trim((string) $row['brand']) ?: '-';
            $brand = Brand::firstOrCreate(['name' => $brandName]);
            $stock = array_sum(array_column($row['batches'], 'remaining_qty'));
            $size = trim((string) $row['product_size']) ?: '-';

            $product = Product::create([
                'product_name' => $row['product_name'],
                'product_code' => $code,
                'barcode' => $code,
                'brand' => $brandName,
                'brand_id' => $brand->id,
                'category_id' => $categoryIds[$row['category_name']],
                'size_width' => (int) ($row['size_width'] ?? 0),
                'size_ratio' => (int) ($row['size_ratio'] ?? 0),
                'ring' => (string) $row['ring'],
                'product_size' => "{$size} R{$row['ring']}",
                'motif' => $row['motif'] ?: '-',
                'condition_code' => 'BARU',
                'product_year' => (string) ($row['product_year'] ?: date('Y')),
                'product_cost' => (int) $row['product_cost'],
                'product_price' => (int) $row['product_price'],
                'reference_price' => $row['reference_price'],
                'product_quantity' => $stock,
                'stok_awal' => $stock,
                'product_stock_alert' => (int) $row['product_stock_alert'],
                'is_active' => (bool) $row['is_active'],
                'is_old_stock' => (bool) $row['is_old_stock'],
                'branch_id' => self::BRANCH_ID,
            ]);

            $balance = 0;
            foreach ($row['batches'] as $i => $batch) {
                $batchCode = sprintf('OB3-OPEN-%d-%02d', $product->id, $i + 1);
                $balance += $batch['remaining_qty'];

                ProductBatch::create([
                    'product_id' => $product->id,
                    'batch_code' => $batchCode,
                    'source_name' => trim(($batch['source_name'] ?: 'Saldo Awal').' ('.$batch['batch_code'].')'),
                    'purchase_date' => $batch['purchase_date'] ?: now()->toDateString(),
                    'batch_cost' => $batch['batch_cost'],
                    'initial_qty' => $batch['remaining_qty'],
                    'remaining_qty' => $batch['remaining_qty'],
                    'branch_id' => self::BRANCH_ID,
                ]);

                StockMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => 'MASUK',
                    'quantity' => $batch['remaining_qty'],
                    'balance_after' => $balance,
                    'reference_type' => 'INITIAL_STOCK',
                    'reference_id' => $batchCode,
                    'description' => 'Saldo awal stok ban baru: '.$product->product_name,
                    'operator_name' => 'Seeder Saldo Awal',
                    'branch_id' => self::BRANCH_ID,
                ]);
            }
        }
    }

    private function seedServices(array $services): void
    {
        foreach ($services as $i => $row) {
            ServiceMaster::firstOrCreate(
                ['service_code' => sprintf('OB-JASA-%03d', $i + 1)],
                [
                    'service_name' => $row['service_name'],
                    'category' => strtoupper($row['category'] ?: 'SERVICE'),
                    'standard_price' => $row['standard_price'],
                    'cost_price' => $row['cost_price'] ?? 0,
                    'description' => $row['description'],
                    'is_active' => (bool) $row['is_active'],
                ]
            );
        }
    }

    private function seedSuppliers(array $suppliers): void
    {
        foreach ($suppliers as $i => $row) {
            Supplier::firstOrCreate(
                ['supplier_code' => sprintf('OB-SUP-%03d', $i + 1)],
                [
                    'supplier_name' => $row['supplier_name'],
                    'phone' => $row['phone'] ?: '-',
                    'email' => $row['email'] ?: null,
                    'address' => trim(($row['address'] ?? '').' '.($row['city'] ?? '')) ?: null,
                    'payment_terms_days' => 30,
                    'is_active' => true,
                ]
            );
        }
    }
}
