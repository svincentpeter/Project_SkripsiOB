<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\Inventory\StockOpnameCommitService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Setelah saldo awal persediaan dibukukan (go-live), stok masuk hanya lewat penerimaan barang dan koreksi hitung
 * lewat stock opname; modal batch yang sudah terjual tidak boleh diubah.
 */
class InventoryGoLiveGuardTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function goLive(): void
    {
        if (! InventoryValueJournal::openingEntry()) {
            $this->makeProduct(500000, [[1, 300000, '2026-08-01']]); // pastikan ada selisih yang dibukukan
            $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
        }
        $this->assertNotNull(InventoryValueJournal::openingEntry());
        $this->alignInventoryLedger();
    }

    public function test_after_go_live_excel_stock_rebuilds_are_refused_but_price_updates_pass(): void
    {
        $product = $this->makeProduct(800000, [[10, 600000, '2026-08-01']]);
        $this->goLive();

        $this->postJson('/api/v1/stock/bulk-update', [
            'items' => [['product_id' => $product->id, 'excel_stock' => 12]],
            'update_stock' => true, 'reason' => 'Rekonsiliasi bulanan',
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Penerimaan Barang'));
        $this->assertSame(10, $product->fresh()->product_quantity);

        $this->postJson('/api/v1/stock/bulk-update', [
            'items' => [['product_id' => $product->id, 'excel_price' => 850000]],
            'update_price' => true, 'reason' => 'Harga baru',
        ])->assertOk();
        $this->assertEquals(850000, (float) $product->fresh()->product_price);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->expectException(PosRuleException::class);
        app(StockOpnameCommitService::class)->commit(['products' => []], '2099-01', ['force' => true]);
    }

    public function test_batch_cost_of_a_sold_batch_cannot_be_edited(): void
    {
        $product = $this->makeProduct(1000000, [[4, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $this->checkout([
            'items' => [$this->productLine($product, 1)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000]],
        ])->assertCreated();

        $this->postJson('/api/v1/reports/stock-monthly/inline-update', [
            'product_id' => $product->id, 'field' => 'batch_cost', 'value' => 650000, 'batch_id' => $product->batches()->value('id'),
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tidak bisa dikoreksi'));

        $this->assertEquals(600000, (float) $product->batches()->value('batch_cost'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }
}
