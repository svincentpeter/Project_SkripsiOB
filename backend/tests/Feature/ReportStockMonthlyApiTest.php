<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use Tests\TestCase;

class ReportStockMonthlyApiTest extends TestCase
{
    use \Illuminate\Foundation\Testing\DatabaseTransactions;

    public function test_get_stock_monthly_endpoint_returns_success_and_matrix_data(): void
    {
        $unique = time() . '_' . rand(100, 999);

        $product = Product::create([
            'product_code' => 'ACC-TEST-' . $unique,
            'barcode' => 'BC-' . $unique,
            'product_name' => 'Accelera Phi-R 195/50 R16',
            'brand' => 'Accelera',
            'product_size' => '195/50 R16',
            'ring' => '16',
            'product_cost' => 580000,
            'product_price' => 690000,
            'product_quantity' => 12,
            'stok_awal' => 12,
            'is_active' => true,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-ACC-' . $unique,
            'source_name' => 'PT Elangperdana',
            'purchase_date' => '2026-09-02',
            'batch_cost' => 580000,
            'initial_qty' => 12,
            'remaining_qty' => 12,
            'branch_id' => 1,
        ]);

        $response = $this->getJson('/api/v1/reports/stock-monthly?month=2026-09');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'rows',
                    'summary' => ['total_products', 'total_valuation_cogs', 'total_remaining'],
                    'meta' => ['month', 'days_in_month', 'brand_options'],
                ],
            ]);
    }

    public function test_inline_update_opening_stock_adjusts_product_and_logs_movement(): void
    {
        $unique = time() . '_' . rand(100, 999);

        $product = Product::create([
            'product_code' => 'ACC-ADJ-' . $unique,
            'barcode' => 'BC-' . $unique,
            'product_name' => 'Accelera Adjust Test',
            'brand' => 'Accelera',
            'product_size' => '195/50 R16',
            'ring' => '16',
            'product_cost' => 500000,
            'product_price' => 650000,
            'product_quantity' => 10,
            'stok_awal' => 10,
            'is_active' => true,
        ]);

        $payload = [
            'product_id' => $product->id,
            'field' => 'opening_stock',
            'value' => 15,
            'month' => '2026-09',
        ];

        $response = $this->postJson('/api/v1/reports/stock-monthly/inline-update', $payload);

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertEquals(15, (int) Product::find($product->id)->stok_awal);
    }

    public function test_inline_update_old_stock_tag(): void
    {
        $unique = time() . '_' . rand(100, 999);

        $product = Product::create([
            'product_code' => 'BRI-OLD-' . $unique,
            'barcode' => 'BC-' . $unique,
            'product_name' => 'Bridgestone Promo Test',
            'brand' => 'Bridgestone',
            'product_size' => '185/65 R15',
            'ring' => '15',
            'product_cost' => 600000,
            'product_price' => 750000,
            'product_quantity' => 5,
            'stok_awal' => 5,
            'is_active' => true,
        ]);

        $payload = [
            'product_id' => $product->id,
            'field' => 'old_stock_tag',
            'value' => true,
            'reference_price' => 950000,
        ];

        $response = $this->postJson('/api/v1/reports/stock-monthly/inline-update', $payload);

        $response->assertStatus(200)->assertJson(['success' => true]);

        $fresh = Product::find($product->id);
        $this->assertTrue((bool) $fresh->is_old_stock);
        $this->assertEquals(950000, (int) $fresh->reference_price);
    }
}
