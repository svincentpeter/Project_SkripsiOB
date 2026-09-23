<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class InventoryValuationTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    public function test_opening_balance_aligns_ledger_with_fifo_value_once(): void
    {
        $this->makeProduct(1000000, [[3, 500000, '2026-08-01']]);
        $before = InventoryValueJournal::summary();
        $this->assertNotEquals(0.0, $before['difference']);

        $res = $this->postJson('/api/v1/inventory/opening-balance')->assertOk()
            ->assertJsonPath('data.valuation.difference', 0);
        $j = collect($res->json('data.journal.lines'))->keyBy('account_code');
        $this->assertEquals(abs($before['difference']), $j['3-1000']['credit'] + $j['3-1000']['debit']);

        $this->postJson('/api/v1/inventory/opening-balance')->assertOk()->assertJsonPath('data.journal', null);
        $this->getJson('/api/v1/inventory/valuation')->assertOk()->assertJsonPath('data.difference', 0);
    }

    public function test_record_books_existing_products_to_variance_and_new_products_to_equity(): void
    {
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
        $existing = $this->makeProduct(1000000, [[4, 500000, '2026-08-01']]);
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();

        $out = app(InventoryValueJournal::class)->record(function () use ($existing) {
            $existing->batches()->first()->update(['remaining_qty' => 3]); // hilang 1 unit @500rb

            $new = $this->makeProduct(1000000, [[2, 700000, '2026-09-01']]); // saldo awal 1,4 jt
            return $new->id;
        }, 'TEST_ADJUST', 'ADJ-1', 'Uji jurnal selisih');

        $lines = collect($out['journal']->toApiArray()['lines']);
        $this->assertEquals(500000, $lines->where('account_code', '5-2000')->sum('debit'));
        $this->assertEquals(1400000, $lines->where('account_code', '3-1000')->sum('credit'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_record_without_value_change_posts_nothing(): void
    {
        $out = app(InventoryValueJournal::class)->record(fn () => null, 'TEST', 'NOOP', 'Tidak ada perubahan');
        $this->assertNull($out['journal']);
    }

    public function test_permissions(): void
    {
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/inventory/valuation')->assertOk();
        $this->postJson('/api/v1/inventory/opening-balance')->assertForbidden();
    }
}
