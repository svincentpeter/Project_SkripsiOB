<?php

namespace Tests\Feature;

use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class StockOpnameTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
    }

    public function test_shortage_consumes_oldest_batches_and_books_variance_expense(): void
    {
        $product = $this->makeProduct(1000000, [[2, 400000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();

        $res = $this->postJson('/api/v1/inventory/stock-opname', [
            'items' => [['product_id' => $product->id, 'physical_qty' => 4]],
            'notes' => 'Hitung fisik akhir bulan',
        ])->assertOk()->assertJsonPath('data.adjustments.0.difference', -3);

        $this->assertSame(4, $product->fresh()->product_quantity);
        $this->assertEquals([0, 4], $product->batches()->orderBy('purchase_date')->pluck('remaining_qty')->all());

        // 2 unit @400rb + 1 unit @600rb = 1,4 jt
        $lines = collect($res->json('data.journal.lines'));
        $this->assertEquals(1400000, $lines->firstWhere('account_code', '5-2000')['debit']);
        $this->assertEquals(1400000, $lines->firstWhere('account_code', '1-2000')['credit']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $product->id, 'reference_type' => 'STOCK_OPNAME', 'movement_type' => 'KELUAR', 'quantity' => 3]);
    }

    public function test_surplus_adds_batch_at_latest_cost_and_reduces_variance(): void
    {
        $product = $this->makeProduct(1000000, [[2, 400000, '2026-07-01'], [1, 650000, '2026-08-01']]);
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();

        $res = $this->postJson('/api/v1/inventory/stock-opname', [
            'items' => [['product_id' => $product->id, 'physical_qty' => 5]],
        ])->assertOk();

        $this->assertSame(5, $product->fresh()->product_quantity);
        $lines = collect($res->json('data.journal.lines'));
        $this->assertEquals(1300000, $lines->firstWhere('account_code', '1-2000')['debit']);
        $this->assertEquals(1300000, $lines->firstWhere('account_code', '5-2000')['credit']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_no_difference_posts_nothing_and_validation(): void
    {
        $product = $this->makeProduct(1000000, [[3, 400000, '2026-07-01']]);
        $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => 3]]])
            ->assertOk()->assertJsonPath('data.journal', null)->assertJsonCount(0, 'data.adjustments');

        $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => -1]]])->assertStatus(422);
        $this->postJson('/api/v1/inventory/stock-opname', ['items' => []])->assertStatus(422);
    }

    public function test_kasir_cannot_run_opname(): void
    {
        $product = $this->makeProduct();
        $this->actingAsRole('KASIR');
        $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => 1]]])->assertForbidden();
    }
}
