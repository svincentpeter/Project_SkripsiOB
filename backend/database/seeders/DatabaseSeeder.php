<?php

namespace Database\Seeders;

use App\Models\PaymentProviderSetting;
use App\Models\EdcSetting;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Models\ServiceMaster;
use App\Models\Brand;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Chart of Accounts (COA) SAK EMKM
        $this->call(AccountCoaSeeder::class);

        // 2. Akun pengguna & hak akses per peran
        $this->call(UserSeeder::class);
        $this->call(RolePermissionSeeder::class);

        // 3. Payment Providers & Surcharges
        PaymentProviderSetting::firstOrCreate(
            ['provider_code' => 'QRIS_BCA'],
            [
                'method_type' => 'qris',
                'provider_name' => 'QRIS BCA (Statis)',
                'fee_percentage' => 0.70,
                'fee_threshold_amount' => 0.00,
                'is_active' => true,
                'sort_order' => 1,
                'notes' => 'MDR Standard QRIS 0.7%',
            ]
        );

        PaymentProviderSetting::firstOrCreate(
            ['provider_code' => 'TF_BCA'],
            [
                'method_type' => 'bank',
                'provider_name' => 'Bank BCA (Transfer Direct)',
                'fee_percentage' => 0.00,
                'fee_threshold_amount' => 0.00,
                'is_active' => true,
                'sort_order' => 2,
                'notes' => 'Transfer manual ke BCA Cabang 3',
            ]
        );

        // 4. Suppliers
        Supplier::firstOrCreate(
            ['supplier_code' => 'SUP-001'],
            [
                'supplier_name' => 'PT Bridgestone Tire Indonesia',
                'phone' => '024-7601234',
                'email' => 'sales.smg@bridgestone.co.id',
                'address' => 'Kawasan Industri Candi, Semarang',
                'contact_person' => 'Budi Santoso',
                'payment_terms_days' => 30,
                'is_active' => true,
            ]
        );

        Supplier::firstOrCreate(
            ['supplier_code' => 'SUP-002'],
            [
                'supplier_name' => 'PT Elangperdana Tyre Industry (Accelera)',
                'phone' => '021-8752345',
                'email' => 'orders@elangperdana.com',
                'address' => 'Citeureup, Bogor',
                'contact_person' => 'Hendra Wijaya',
                'payment_terms_days' => 45,
                'is_active' => true,
            ]
        );

        // 5. Products
        Product::firstOrCreate(
            ['product_code' => 'BAN-BS-185-65-R15'],
            [
                'product_name' => 'Bridgestone Ecopia EP150 185/65 R15',
                'barcode' => '888001856515',
                'brand' => 'Bridgestone',
                'ring' => '15',
                'product_size' => '185/65 R15',
                'product_cost' => 720000,
                'product_price' => 850000,
                'product_quantity' => 24,
                'product_stock_alert' => 5,
                'condition_code' => 'BARU',
            ]
        );

        Product::firstOrCreate(
            ['product_code' => 'BAN-ACC-195-50-R16'],
            [
                'product_name' => 'Accelera Phi-R 195/50 R16',
                'barcode' => '888001955016',
                'brand' => 'Accelera',
                'ring' => '16',
                'product_size' => '195/50 R16',
                'product_cost' => 580000,
                'product_price' => 690000,
                'product_quantity' => 18,
                'product_stock_alert' => 4,
                'condition_code' => 'BARU',
            ]
        );

        $this->seedOpeningBatch('BAN-BS-185-65-R15', 'PT Bridgestone Tire Indonesia');
        $this->seedOpeningBatch('BAN-ACC-195-50-R16', 'PT Elangperdana Tyre Industry (Accelera)');

        // 6. Service Master
        ServiceMaster::firstOrCreate(
            ['service_code' => 'JASA-SPOORING-3D'],
            [
                'service_name' => 'Jasa Spooring 3D Komputerized',
                'category' => 'SPOORING',
                'standard_price' => 150000,
                'cost_price' => 0,
                'description' => 'Garansi 7 hari / 500 km',
                'is_active' => true,
            ]
        );

        ServiceMaster::firstOrCreate(
            ['service_code' => 'JASA-BALANCING-WHEEL'],
            [
                'service_name' => 'Jasa Balancing Roda Mobil',
                'category' => 'BALANCING',
                'standard_price' => 35000,
                'cost_price' => 0,
                'description' => 'Per roda (termasuk timah balancing)',
                'is_active' => true,
            ]
        );

        // 7. Master data ban baru Omah Ban (produk + batch FIFO saldo awal, jasa, supplier)
        $this->call(OmahBanBanBaruSeeder::class);
    }

    /**
     * Batch FIFO saldo awal untuk produk contoh, agar product_quantity
     * sama dengan SUM(remaining_qty) dan checkout bisa memotong HPP.
     * Dilewati bila produk sudah punya batch.
     */
    private function seedOpeningBatch(string $productCode, string $sourceName): void
    {
        $product = Product::where('product_code', $productCode)->first();
        if (! $product || $product->product_quantity <= 0 || $product->batches()->exists()) {
            return;
        }

        $batchCode = 'OB3-OPEN-'.$productCode;

        DB::transaction(function () use ($product, $batchCode, $sourceName) {
            ProductBatch::create([
                'product_id' => $product->id,
                'batch_code' => $batchCode,
                'source_name' => $sourceName,
                'purchase_date' => $product->created_at?->toDateString() ?? now()->toDateString(),
                'batch_cost' => $product->product_cost,
                'initial_qty' => $product->product_quantity,
                'remaining_qty' => $product->product_quantity,
                'branch_id' => $product->branch_id,
            ]);

            StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => 'MASUK',
                'quantity' => $product->product_quantity,
                'balance_after' => $product->product_quantity,
                'reference_type' => 'INITIAL_STOCK',
                'reference_id' => $batchCode,
                'description' => 'Saldo awal stok ban baru: '.$product->product_name,
                'operator_name' => 'Seeder Saldo Awal',
                'branch_id' => $product->branch_id,
            ]);
        });
    }
}
