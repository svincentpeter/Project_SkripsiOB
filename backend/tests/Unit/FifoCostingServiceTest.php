<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Services\FifoCostingService;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FifoCostingServiceTest extends TestCase
{
    public function test_fifo_costing_allocates_from_oldest_batches_accurately(): void
    {
        $unique = time() . '_' . rand(100, 999);
        $product = Product::create([
            'product_name' => 'Tire FIFO Test ' . $unique,
            'product_code' => 'FIFO-' . $unique,
            'barcode' => 'BC-FIFO-' . $unique,
            'brand' => 'Bridgestone',
            'product_cost' => 600000,
            'product_price' => 800000,
            'product_quantity' => 15,
        ]);

        // Batch 1: 5 units @ 600.000 (Older)
        $batch1 = ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-1-' . $unique,
            'source_name' => 'Supplier A',
            'purchase_date' => '2026-08-01',
            'batch_cost' => 600000,
            'initial_qty' => 5,
            'remaining_qty' => 5,
        ]);

        // Batch 2: 10 units @ 650.000 (Newer)
        $batch2 = ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-2-' . $unique,
            'source_name' => 'Supplier B',
            'purchase_date' => '2026-08-15',
            'batch_cost' => 650000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
        ]);

        $sale = Sale::create([
            'reference' => 'INV-TEST-' . $unique,
            'date' => '2026-09-01',
            'customer_name' => 'Test Customer',
            'vehicle_plate' => 'B 1234 CD',
            'cashier_name' => 'Fani',
            'payment_method' => 'TUNAI',
            'total_amount' => 5600000,
        ]);

        $detail = SaleDetail::create([
            'sale_id' => $sale->id,
            'product_id' => $product->id,
            'quantity' => 7,
            'unit_price' => 800000,
            'sub_total' => 5600000,
        ]);

        // Allocate 7 units: 5 from Batch 1 @ 600k + 2 from Batch 2 @ 650k
        // Expected HPP: (5 * 600.000) + (2 * 650.000) = 3.000.000 + 1.300.000 = 4.300.000
        $service = new FifoCostingService();
        $result = $service->allocateFifo($product->id, 7, $detail->id, $sale->reference);

        $this->assertEquals(4300000.00, $result['total_cogs']);
        $this->assertCount(2, $result['allocations']);

        // Check Batch 1 depleted
        $batch1->refresh();
        $this->assertEquals(0, $batch1->remaining_qty);

        // Check Batch 2 has 8 left
        $batch2->refresh();
        $this->assertEquals(8, $batch2->remaining_qty);

        // Check product stock decremented from 15 to 8
        $product->refresh();
        $this->assertEquals(8, $product->product_quantity);

        // Check stock_movements created
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'movement_type' => 'KELUAR',
            'quantity' => 7,
            'balance_after' => 8,
            'reference_id' => $sale->reference,
        ]);
    }
}
