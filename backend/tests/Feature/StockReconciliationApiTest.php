<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\BrandAlias;
use App\Models\Product;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class StockReconciliationApiTest extends TestCase
{
    public function test_template_download_returns_excel_stream(): void
    {
        $response = $this->get('/api/v1/stock/template');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }

    public function test_import_preview_endpoint_parses_excel(): void
    {
        $fixturePath = base_path('tests/Fixtures/stock-fixture.xlsx');
        $file = new UploadedFile(
            $fixturePath,
            'stock-fixture.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->postJson('/api/v1/stock/import-preview', [
            'excel_file' => $file,
            'qty_column' => 'H',
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
        $response->assertJsonStructure([
            'data' => [
                'meta',
                'products',
                'unresolved',
                'notes',
                'stats',
            ],
        ]);
    }

    public function test_get_staging_endpoint_returns_data(): void
    {
        $response = $this->getJson('/api/v1/stock/staging');

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
    }

    public function test_commit_endpoint_writes_products_and_batches(): void
    {
        $response = $this->postJson('/api/v1/stock/commit', [
            'period' => '2026-09',
            'force' => true,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);
        $response->assertJsonStructure([
            'data' => [
                'created',
                'updated',
                'batches_created',
                'movements',
                'snapshot_path',
            ],
        ]);

        $this->assertDatabaseHas('products', [
            'product_name' => 'Bs Techno',
        ]);
    }

    public function test_bulk_update_endpoint_updates_selected_products_successfully(): void
    {
        $uniqueCode = 'DLP-BULK-' . uniqid();
        $brand = Brand::firstOrCreate(['name' => 'Dunlop']);
        $product = Product::create([
            'brand' => $brand->name,
            'brand_id' => $brand->id,
            'product_name' => 'Dlp Enasave EC300+ 185/65 R15',
            'product_code' => $uniqueCode,
            'barcode' => $uniqueCode,
            'product_cost' => 600000,
            'product_price' => 800000,
            'product_quantity' => 10,
            'branch_id' => 3,
        ]);

        $response = $this->postJson('/api/v1/stock/reconciliation/bulk-update', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'excel_cost' => 620000,
                    'excel_price' => 850000,
                    'excel_stock' => 12,
                ]
            ],
            'update_cost' => true,
            'update_price' => true,
            'update_stock' => true,
            'reason' => 'Penyesuaian stok dan harga bulanan',
            'branch_id' => 3,
        ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertEquals(620000, $product->fresh()->product_cost);
        $this->assertEquals(850000, $product->fresh()->product_price);
        $this->assertEquals(12, $product->fresh()->product_quantity);

        // Clean up
        $product->forceDelete();
    }
}
