<?php

namespace Tests\Feature;

use App\Models\ProductCategory;
use App\Models\ServiceMaster;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class ProductMasterTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function productPayload(array $overrides = []): array
    {
        return $overrides + [
            'product_name' => 'Bridgestone Uji '.uniqid(),
            'brand' => 'Bridgestone',
            'product_size' => '185/65 R15',
            'ring' => 'R15',
            'product_cost' => 600000,
            'product_price' => 800000,
            'product_stock_alert' => 4,
        ];
    }

    public function test_new_product_with_initial_stock_books_opening_balance(): void
    {
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();

        $res = $this->postJson('/api/v1/products', $this->productPayload([
            'initial_batch' => ['source_name' => 'Stok awal gudang', 'batch_cost' => 600000, 'initial_qty' => 5],
        ]))->assertCreated();

        $res->assertJsonPath('data.product_quantity', 5)
            ->assertJsonPath('journal.reference_type', 'OPENING_BALANCE');
        $this->assertNotEmpty($res->json('data.product_code'));
        $this->assertStringStartsWith('899', $res->json('data.barcode'));
        $lines = collect($res->json('journal.lines'));
        $this->assertEquals(3000000, $lines->firstWhere('account_code', '1-2000')['debit']);
        $this->assertEquals(3000000, $lines->firstWhere('account_code', '3-1000')['credit']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_product_without_stock_posts_no_journal_and_update_cannot_change_stock(): void
    {
        $category = ProductCategory::create(['category_code' => 'VELG-'.uniqid(), 'category_name' => 'Velg']);
        $res = $this->postJson('/api/v1/products', $this->productPayload(['category_id' => $category->id]))->assertCreated()
            ->assertJsonPath('journal', null)
            ->assertJsonPath('data.category_code', $category->category_code);

        $id = $res->json('data.id');
        $this->putJson("/api/v1/products/{$id}", $this->productPayload(['product_price' => 900000, 'product_quantity' => 99]))
            ->assertOk()
            ->assertJsonPath('data.product_price', '900000.00')
            ->assertJsonPath('data.product_quantity', 0);
    }

    public function test_delete_removes_clean_product_but_deactivates_product_with_history(): void
    {
        $clean = $this->postJson('/api/v1/products', $this->productPayload())->json('data.id');
        $this->deleteJson("/api/v1/products/{$clean}")->assertOk()->assertJsonPath('data.deleted', true);

        $withStock = $this->makeProduct();
        $this->deleteJson("/api/v1/products/{$withStock->id}")->assertOk()->assertJsonPath('data.deactivated', true);
        $this->assertFalse($withStock->fresh()->is_active);
    }

    public function test_product_categories_crud_and_in_use_guard(): void
    {
        $code = 'OLI-'.uniqid();
        $id = $this->postJson('/api/v1/product-categories', ['category_code' => $code, 'category_name' => 'Oli'])
            ->assertCreated()->json('data.id');
        $this->postJson('/api/v1/product-categories', ['category_code' => $code, 'category_name' => 'Dobel'])->assertStatus(422);
        $this->putJson("/api/v1/product-categories/{$id}", ['category_code' => $code, 'category_name' => 'Oli Mesin'])
            ->assertOk()->assertJsonPath('data.category_name', 'Oli Mesin');

        $this->postJson('/api/v1/products', $this->productPayload(['category_id' => $id]))->assertCreated();
        $this->deleteJson("/api/v1/product-categories/{$id}")->assertStatus(422);
        $this->getJson('/api/v1/product-categories')->assertOk()->assertJsonFragment(['id' => $id, 'products_count' => 1]);
    }

    public function test_service_categories_crud_and_in_use_guard(): void
    {
        $code = 'SPOORING-'.uniqid();
        $id = $this->postJson('/api/v1/service-categories', ['code' => $code, 'name' => 'Spooring'])->assertCreated()->json('data.id');
        ServiceMaster::create(['service_code' => 'S-'.uniqid(), 'service_name' => 'Spooring 3D', 'category' => $code, 'standard_price' => 100000, 'is_active' => true]);

        $this->deleteJson("/api/v1/service-categories/{$id}")->assertStatus(422);
        $this->getJson('/api/v1/service-categories')->assertOk()->assertJsonFragment(['id' => $id, 'service_count' => 1]);
    }

    public function test_kasir_reads_catalog_but_cannot_manage_it(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/product-categories')->assertOk();
        $this->postJson('/api/v1/product-categories', ['category_code' => 'X', 'category_name' => 'X'])->assertForbidden();
        $this->postJson('/api/v1/products', $this->productPayload())->assertForbidden();
    }
}
