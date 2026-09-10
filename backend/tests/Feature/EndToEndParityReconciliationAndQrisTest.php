<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EndToEndParityReconciliationAndQrisTest extends TestCase
{
    use RefreshDatabase;

    public function test_end_to_end_selective_reconciliation_flow(): void
    {
        // 1. Setup brand & existing product
        $brand = Brand::firstOrCreate(['name' => 'Dunlop']);
        $product = Product::create([
            'brand' => $brand->name,
            'brand_id' => $brand->id,
            'product_name' => 'Dlp SP Touring R1 175/70 R13',
            'product_code' => 'DLP-1757013-SPT',
            'barcode' => 'DLP-1757013-SPT',
            'product_cost' => 450000,
            'product_price' => 600000,
            'product_quantity' => 6,
            'branch_id' => 3,
        ]);

        // 2. Execute Bulk Selective Update via API
        $response = $this->postJson('/api/v1/stock/reconciliation/bulk-update', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'excel_cost' => 480000,
                    'excel_price' => 650000,
                    'excel_stock' => 10,
                    'batches' => [
                        ['batch_cost' => 470000, 'remaining_qty' => 4],
                        ['batch_cost' => 490000, 'remaining_qty' => 6],
                    ],
                ]
            ],
            'update_cost' => true,
            'update_price' => true,
            'update_stock' => true,
            'reason' => 'Verifikasi Rekonsiliasi End-to-End Excel',
            'branch_id' => 3,
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'total_processed' => 1,
                    'cost_updated' => 1,
                    'price_updated' => 1,
                    'stock_updated' => 1,
                ],
            ]);

        // 3. Verify Database State
        $updatedProduct = $product->fresh();
        $this->assertEquals(480000, $updatedProduct->product_cost);
        $this->assertEquals(650000, $updatedProduct->product_price);
        $this->assertEquals(10, $updatedProduct->product_quantity);

        // Verify Price Audits
        $this->assertDatabaseHas('product_price_audits', [
            'product_id' => $product->id,
            'changed_field' => 'product_cost',
            'new_cost' => 480000,
        ]);
        $this->assertDatabaseHas('product_price_audits', [
            'product_id' => $product->id,
            'changed_field' => 'product_price',
            'new_price' => 650000,
        ]);

        // Verify Batches ordered by FIFO (cheapest first)
        $batches = ProductBatch::where('product_id', $product->id)
            ->orderBy('purchase_date', 'asc')
            ->get();
        $this->assertCount(2, $batches);
        $this->assertEquals(470000, (int) $batches[0]->batch_cost);
        $this->assertEquals(490000, (int) $batches[1]->batch_cost);
    }

    public function test_end_to_end_qris_midtrans_flow(): void
    {
        $orderId = 'POS-E2E-' . uniqid();
        $grossAmount = 500000;

        // 1. Charge QRIS
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'status_message' => 'Success, QRIS transaction is created',
                'transaction_id' => 'mid-e2e-12345',
                'order_id' => $orderId,
                'gross_amount' => (string) $grossAmount,
                'payment_type' => 'qris',
                'transaction_status' => 'pending',
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'actions' => [
                    [
                        'name' => 'generate-qr-code',
                        'method' => 'GET',
                        'url' => 'https://api.sandbox.midtrans.com/v2/qris/mid-e2e-12345/qr-code',
                    ]
                ],
            ], 201),
        ]);

        $chargeRes = $this->postJson('/api/v1/payment/qris/charge', [
            'order_id' => $orderId,
            'gross_amount' => $grossAmount,
            'customer_name' => 'Pak Vincent',
        ]);

        $chargeRes->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $orderId,
                    'transaction_status' => 'pending',
                ],
            ]);

        // 2. Simulate Payment (Sandbox Demo Feature)
        $simRes = $this->postJson("/api/v1/payment/qris/simulate/{$orderId}");
        $simRes->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $orderId,
                    'transaction_status' => 'settlement',
                ],
            ]);

        // 3. Check Polling Status confirms settlement
        $statusRes = $this->getJson("/api/v1/payment/qris/status/{$orderId}");
        $statusRes->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $orderId,
                    'transaction_status' => 'settlement',
                ],
            ]);
    }
}
