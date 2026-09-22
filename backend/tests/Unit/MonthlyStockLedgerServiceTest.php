<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Services\Inventory\MonthlyStockLedgerService;
use Tests\TestCase;

class MonthlyStockLedgerServiceTest extends TestCase
{
    public function test_build_monthly_stock_ledger_allocates_fifo_layers_and_daily_sales(): void
    {
        $unique = time() . '_' . rand(100, 999);

        $product = Product::create([
            'product_code' => 'BRI-TEST-' . $unique,
            'barcode' => 'BC-' . $unique,
            'product_name' => 'Bridgestone Turanza 185/65 R15',
            'brand' => 'Bridgestone',
            'product_size' => '185/65 R15',
            'ring' => '15',
            'motif' => 'Turanza ER300',
            'product_cost' => 700000,
            'product_price' => 850000,
            'product_quantity' => 20,
            'stok_awal' => 20,
            'is_active' => true,
        ]);

        // Batch 1 (Older / 700k)
        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-001-' . $unique,
            'source_name' => 'PT Bridgestone',
            'purchase_date' => '2026-09-01',
            'batch_cost' => 700000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
            'branch_id' => 1,
        ]);

        // Batch 2 (Newer / 720k)
        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-002-' . $unique,
            'source_name' => 'PT Bridgestone',
            'purchase_date' => '2026-09-05',
            'batch_cost' => 720000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
            'branch_id' => 1,
        ]);

        $service = new MonthlyStockLedgerService();
        $result = $service->build('2026-09', 'Bridgestone', 1);

        $this->assertArrayHasKey('rows', $result);
        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('meta', $result);
        $this->assertNotEmpty($result['rows']);

        $matchedRows = array_filter($result['rows'], fn ($r) => $r['id'] === $product->id);
        $this->assertNotEmpty($matchedRows);

        $row = reset($matchedRows);
        $this->assertEquals($product->id, $row['id']);
        $this->assertEquals(20, $row['opening']);
        $this->assertEquals(20, $row['remaining']);
        $this->assertCount(2, $row['layers']);
        $this->assertEquals(700000, (int) $row['layers'][0]['batch_cost']);
        $this->assertEquals(720000, (int) $row['layers'][1]['batch_cost']);
    }
}
