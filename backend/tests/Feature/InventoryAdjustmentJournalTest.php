<?php

namespace Tests\Feature;

use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Setiap jalur yang mengubah stok/biaya di luar penjualan & pembelian harus menjaga
 * saldo buku 1-2000 tetap sama dengan nilai FIFO.
 */
class InventoryAdjustmentJournalTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function aligned($product): void
    {
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_bulk_reconciliation_update_journals_value_change(): void
    {
        $product = $this->makeProduct(800000, [[10, 600000, '2026-08-01']]);
        $this->aligned($product);

        $res = $this->postJson('/api/v1/stock/reconciliation/bulk-update', [
            'items' => [['product_id' => $product->id, 'excel_cost' => 620000, 'excel_price' => 850000, 'excel_stock' => 12]],
            'update_cost' => true, 'update_price' => true, 'update_stock' => true,
            'reason' => 'Penyesuaian stok bulanan',
        ])->assertOk();

        $this->assertNotNull($res->json('data.journal'));
        $this->assertSame(12, $product->fresh()->product_quantity);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_inline_opening_stock_correction_moves_fifo_and_journals(): void
    {
        $product = $this->makeProduct(800000, [[5, 600000, '2026-08-01']]);
        $product->update(['stok_awal' => 5]);
        $this->aligned($product);

        $res = $this->postJson('/api/v1/reports/stock-monthly/inline-update', [
            'product_id' => $product->id, 'field' => 'opening_stock', 'value' => 3, 'month' => '2026-09',
        ])->assertOk()->assertJsonPath('data.stok_awal', 3)->assertJsonPath('data.product_quantity', 3);

        $this->assertEquals(1200000, collect($res->json('data.journal.lines'))->firstWhere('account_code', '5-2000')['debit']);
        $this->assertSame(3, (int) $product->batches()->sum('remaining_qty'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_inline_batch_cost_correction_journals_and_checks_ownership(): void
    {
        $product = $this->makeProduct(800000, [[4, 600000, '2026-08-01']]);
        $other = $this->makeProduct();
        $this->aligned($product);
        $batchId = $product->batches()->value('id');

        $this->postJson('/api/v1/reports/stock-monthly/inline-update', [
            'product_id' => $other->id, 'field' => 'batch_cost', 'value' => 1, 'batch_id' => $batchId,
        ])->assertStatus(422);

        $res = $this->postJson('/api/v1/reports/stock-monthly/inline-update', [
            'product_id' => $product->id, 'field' => 'batch_cost', 'value' => 650000, 'batch_id' => $batchId,
        ])->assertOk();

        $lines = collect($res->json('data.journal.lines'));
        $this->assertEquals(200000, $lines->firstWhere('account_code', '1-2000')['debit']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }
}
