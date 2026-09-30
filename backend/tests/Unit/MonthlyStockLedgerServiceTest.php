<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Services\Inventory\MonthlyStockLedgerService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class MonthlyStockLedgerServiceTest extends TestCase
{
    use DatabaseTransactions;

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

    /** Retur penjualan menambah kolom masuk; retur pembelian dan batal penerimaan menguranginya. */
    public function test_returns_and_goods_receipt_cancellations_count_in_the_restock_column(): void
    {
        $unique = uniqid();
        $product = Product::create([
            'product_code' => 'RET-'.$unique,
            'barcode' => 'BC-RET-'.$unique,
            'product_name' => 'Ban Retur '.$unique,
            'brand' => 'Merek '.$unique,
            'product_cost' => 500000,
            'product_price' => 800000,
            'product_quantity' => 10,
            'stok_awal' => 10,
            'is_active' => true,
        ]);
        foreach ([['MASUK', 5, 'GOODS_RECEIPT'], ['MASUK', 1, 'SALES_RETURN'], ['KELUAR', 2, 'PURCHASE_RETURN'], ['KELUAR', 3, 'GOODS_RECEIPT_CANCEL']] as [$type, $qty, $ref]) {
            StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => $type,
                'quantity' => $qty,
                'balance_after' => 0,
                'reference_type' => $ref,
                'reference_id' => $ref.'-'.$unique,
                'branch_id' => 1,
            ]);
        }

        $row = (new MonthlyStockLedgerService())->build(now()->format('Y-m'), $product->brand)['rows'][0];

        $this->assertSame($product->id, $row['id']);
        $this->assertSame(10, $row['opening']);
        $this->assertSame(5 + 1 - 2 - 3, $row['restock']);
        $this->assertSame(0, $row['sold']);
        $this->assertSame(11, $row['remaining']);
    }
}
