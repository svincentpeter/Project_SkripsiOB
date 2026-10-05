<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleBatchAllocation;
use App\Models\SaleDetail;
use App\Models\StockMovement;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\Inventory\StockOpnameService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Buku 1-2000 harus selalu sama dengan Σ sisa × modal batch: penjualan tanpa lapisan FIFO ditolak,
 * opname memperbaiki lapisan, dan void memulihkan unit tanpa baris alokasi senilai HPP yang dulu dijurnal.
 */
class FifoIntegrityTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function transferSale($product, int $qty)
    {
        return $this->checkout([
            'items' => [$this->productLine($product, $qty)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000 * $qty]],
        ]);
    }

    public function test_sale_beyond_fifo_layers_is_rejected_and_opname_repairs_the_layers(): void
    {
        $product = $this->makeProduct(1000000, [[3, 500000, '2026-08-01']]);
        $product->update(['product_quantity' => 5]); // drift lama: 2 unit tanpa batch
        $this->alignInventoryLedger();
        $sales = Sale::count();

        $this->transferSale($product, 4)
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'berlapis biaya FIFO'));
        $this->assertSame(5, $product->fresh()->product_quantity);
        $this->assertSame(3, (int) $product->batches()->sum('remaining_qty'));
        $this->assertSame($sales, Sale::count());
        $this->assertTrue(SaleDetail::where('product_id', $product->id)->doesntExist());

        $opname = $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => 5]]])
            ->assertOk()
            ->assertJsonPath('data.adjustments.0.difference', 0);
        $this->assertSame(5, (int) $product->batches()->sum('remaining_qty'));
        // 2 unit tanpa batch dibuat ulang di modal batch terakhir (500rb): kelebihan nilai ke 5-2000, tanpa mutasi stok.
        $journal = $this->journalByAccount($opname->json('data.reference'), 'STOCK_OPNAME');
        $this->assertEquals(1000000, $journal['1-2000']['debit']);
        $this->assertEquals(1000000, $journal['5-2000']['credit']);
        $this->assertTrue(StockMovement::where('reference_id', $opname->json('data.reference'))->doesntExist());
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->transferSale($product, 4)->assertCreated()->assertJsonPath('data.total_hpp', 2000000);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_layer_only_opnames_in_one_month_get_distinct_references(): void
    {
        $product = $this->makeProduct(1000000, [[3, 500000, '2026-08-01']]);
        $product->update(['product_quantity' => 5]);
        $this->alignInventoryLedger();
        $repair = fn () => $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => 5]]])
            ->assertOk()
            ->json('data.reference');

        $first = $repair();
        // Drift lama muncul lagi: 2 unit lapisan hilang, kuantitas sistem tetap 5.
        $product->batches()->where('batch_code', "{$first}-{$product->id}")->update(['remaining_qty' => 0]);
        $this->alignInventoryLedger();
        $second = $repair();

        $this->assertNotSame($first, $second);
        $this->assertTrue(ProductBatch::where('batch_code', "{$second}-{$product->id}")->exists());
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_void_restores_units_without_an_allocation_at_their_booked_cost(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $sale = $this->transferSale($product, 2)->assertCreated();

        // Simulasi alokasi yang hilang (HPP cadangan lama / terhapus impor Excel): baris batch 600rb dibuang.
        $newer = $product->batches()->orderByDesc('purchase_date')->first();
        SaleBatchAllocation::where('product_batch_id', $newer->id)->delete();

        $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Salah input ukuran'])->assertOk();

        $this->assertSame(6, $product->fresh()->product_quantity);
        $restored = ProductBatch::where('product_id', $product->id)->where('batch_code', 'like', 'VOID-%')->get();
        $this->assertSame(1, (int) $restored->sum('initial_qty'));
        $this->assertEquals(600000, (float) $restored->first()->batch_cost);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_void_splits_unallocated_cost_that_does_not_divide_into_whole_cents(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [1, 600000.01, '2026-08-01']]);
        $this->alignInventoryLedger();
        $sale = $this->transferSale($product, 2)->assertCreated()->assertJsonPath('data.total_hpp', 1100000.01);

        SaleBatchAllocation::whereIn('sale_detail_id', SaleDetail::where('sale_id', $sale->json('data.id'))->pluck('id'))->delete();

        $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Salah input ukuran'])->assertOk();

        // 1.100.000,01 / 2 unit: satu unit 550.000,00 dan satu unit 550.000,01.
        $restored = ProductBatch::where('product_id', $product->id)->where('batch_code', 'like', 'VOID-%')->orderBy('batch_cost')->get();
        $this->assertSame([[1, 550000.0], [1, 550000.01]], $restored->map(fn ($b) => [(int) $b->initial_qty, (float) $b->batch_cost])->all());
        $this->assertSame(2, $product->fresh()->product_quantity);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_opname_counts_batches_committed_after_its_transaction_snapshot(): void
    {
        // Koneksi kedua meniru kasir/gudang lain yang commit setelah snapshot REPEATABLE READ transaksi opname terbentuk.
        config(['database.connections.side' => config('database.connections.'.config('database.default'))]);
        DB::select('select count(*) from product_batches'); // snapshot transaksi test ditetapkan di sini
        $unique = uniqid();
        // Modal 0 agar baris yang ter-commit tidak mengubah nilai FIFO yang dibaca test lain secara bersamaan.
        $product = Product::on('side')->create([
            'product_name' => 'Ban Snapshot '.$unique, 'product_code' => 'S-'.$unique, 'barcode' => 'BC-S-'.$unique,
            'brand' => 'Bridgestone', 'product_cost' => 0, 'product_price' => 1000000, 'product_quantity' => 5, 'is_active' => true,
        ]);
        $this->beforeApplicationDestroyed(function () use ($product) {
            // Berjalan setelah rollback DatabaseTransactions, jadi kunci baris produk sudah lepas.
            ProductBatch::on('side')->where('product_id', $product->id)->delete();
            Product::on('side')->withTrashed()->whereKey($product->id)->forceDelete();
            DB::purge('side');
        });
        ProductBatch::on('side')->create([
            'product_id' => $product->id, 'batch_code' => 'B-S-'.$unique, 'source_name' => 'PT Test',
            'purchase_date' => '2026-08-01', 'batch_cost' => 0, 'initial_qty' => 5, 'remaining_qty' => 5,
        ]);

        $out = app(StockOpnameService::class)->adjust([['product_id' => $product->id, 'physical_qty' => 5]], null, null);

        $this->assertSame([], $out['adjustments']);
        $this->assertSame(5, (int) ProductBatch::where('product_id', $product->id)->lockForUpdate()->sum('remaining_qty'));
    }
}
