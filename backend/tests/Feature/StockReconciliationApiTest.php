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
}
