<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use App\Services\Inventory\StockSelectiveUpdateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class StockSelectiveUpdateServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_cost_selectively_and_record_audit(): void
    {
        $brand = Brand::firstOrCreate(['name' => 'Dunlop']);
        $product = Product::create([
            'brand' => $brand->name,
            'brand_id' => $brand->id,
            'product_name' => 'Dlp Enasave EC300+ 185/65 R15',
            'product_code' => 'DLP-1856515-EC300',
            'barcode' => 'DLP-1856515-EC300',
            'product_cost' => 600000,
            'product_price' => 800000,
            'product_quantity' => 10,
            'branch_id' => 3,
        ]);

        $service = new StockSelectiveUpdateService();
        $result = $service->updateBulk([
            [
                'product_id' => $product->id,
                'excel_cost' => 650000,
                'excel_price' => 800000,
                'excel_stock' => 10,
            ]
        ], [
            'update_cost' => true,
            'update_price' => false,
            'update_stock' => false,
            'reason' => 'Kenaikan harga distributor pabrik',
            'branch_id' => 3,
        ]);

        $this->assertEquals(1, $result['total_processed']);
        $this->assertEquals(1, $result['cost_updated']);
        $this->assertEquals(0, $result['price_updated']);
        $this->assertEquals(0, $result['stock_updated']);
        $this->assertEquals(650000, $product->fresh()->product_cost);
        $this->assertDatabaseHas('product_price_audits', [
            'product_id' => $product->id,
            'new_cost' => 650000,
            'reason' => 'Kenaikan harga distributor pabrik',
        ]);
    }

    public function test_can_update_price_selectively_and_record_audit(): void
    {
        $brand = Brand::firstOrCreate(['name' => 'Bridgestone']);
        $product = Product::create([
            'brand' => $brand->name,
            'brand_id' => $brand->id,
            'product_name' => 'Bs Ecopia EP150 175/65 R14',
            'product_code' => 'BS-1756514-EP150',
            'barcode' => 'BS-1756514-EP150',
            'product_cost' => 500000,
            'product_price' => 680000,
            'product_quantity' => 8,
            'branch_id' => 3,
        ]);

        $service = new StockSelectiveUpdateService();
        $result = $service->updateBulk([
            [
                'product_id' => $product->id,
                'excel_cost' => 500000,
                'excel_price' => 710000,
                'excel_stock' => 8,
            ]
        ], [
            'update_cost' => false,
            'update_price' => true,
            'update_stock' => false,
            'reason' => 'Penyesuaian margin ritel',
            'branch_id' => 3,
        ]);

        $this->assertEquals(1, $result['total_processed']);
        $this->assertEquals(1, $result['price_updated']);
        $this->assertEquals(710000, $product->fresh()->product_price);
        $this->assertDatabaseHas('product_price_audits', [
            'product_id' => $product->id,
            'new_price' => 710000,
            'reason' => 'Penyesuaian margin ritel',
        ]);
    }

    public function test_can_update_stock_selectively_with_fifo_batches_and_movement(): void
    {
        $brand = Brand::firstOrCreate(['name' => 'GT Radial']);
        $product = Product::create([
            'brand' => $brand->name,
            'brand_id' => $brand->id,
            'product_name' => 'GT Champiro Ecotec 185/70 R14',
            'product_code' => 'GT-1857014-ECO',
            'barcode' => 'GT-1857014-ECO',
            'product_cost' => 480000,
            'product_price' => 640000,
            'product_quantity' => 5,
            'branch_id' => 3,
        ]);

        $service = new StockSelectiveUpdateService();
        $result = $service->updateBulk([
            [
                'product_id' => $product->id,
                'excel_cost' => 480000,
                'excel_price' => 640000,
                'excel_stock' => 9,
                'batches' => [
                    ['batch_cost' => 490000, 'remaining_qty' => 4],
                    ['batch_cost' => 480000, 'remaining_qty' => 5], // cheaper -> should be created earlier
                ],
            ]
        ], [
            'update_cost' => false,
            'update_price' => false,
            'update_stock' => true,
            'reason' => 'Hasil hitung fisik gudang',
            'branch_id' => 3,
        ]);

        $this->assertEquals(1, $result['stock_updated']);
        $this->assertEquals(9, $product->fresh()->product_quantity);

        // Verify batches created and ordered with FIFO (cheaper first)
        $batches = ProductBatch::where('product_id', $product->id)->orderBy('purchase_date', 'asc')->get();
        $this->assertCount(2, $batches);
        $this->assertEquals(480000, (int) $batches[0]->batch_cost);
        $this->assertEquals(5, $batches[0]->remaining_qty);
        $this->assertEquals(490000, (int) $batches[1]->batch_cost);
        $this->assertEquals(4, $batches[1]->remaining_qty);

        // Verify stock movement
        $this->assertDatabaseHas('stock_movements', [
            'product_id' => $product->id,
            'quantity' => 4,
        ]);
    }

    public function test_throws_exception_if_reason_invalid_or_no_aspect_selected(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('Alasan perubahan wajib diisi (minimal 3 karakter).');

        $service = new StockSelectiveUpdateService();
        $service->updateBulk([], [
            'update_cost' => true,
            'reason' => '',
        ]);
    }
}
