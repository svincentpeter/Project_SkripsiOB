<?php

namespace Tests\Feature;

use App\Models\ProductBatch;
use App\Models\SaleBatchAllocation;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
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

        $this->transferSale($product, 4)
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'berlapis biaya FIFO'));
        $this->assertSame(5, $product->fresh()->product_quantity);
        $this->assertSame(3, (int) $product->batches()->sum('remaining_qty'));

        $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => 5]]])
            ->assertOk()
            ->assertJsonPath('data.adjustments.0.difference', 0);
        $this->assertSame(5, (int) $product->batches()->sum('remaining_qty'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->transferSale($product, 4)->assertCreated()->assertJsonPath('data.total_hpp', 2000000);
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
}
