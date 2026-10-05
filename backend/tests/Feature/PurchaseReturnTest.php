<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Supplier;
use App\Services\Accounting\CashFlowReport;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Retur pembelian mengurangi hutang lebih dulu lalu refund kas/bank; hanya unit yang masih ada di batch GR itu.
 * Pembatalan GR = jurnal cermin PURCHASE bila GR belum tersentuh.
 */
class PurchaseReturnTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    /** Produk tanpa stok, agar penjualan pasti memakai batch GR. */
    private function emptyProduct(): Product
    {
        return $this->makeProduct(800000, [[0, 450000, '2026-08-01']]);
    }

    private function receive(Product $product, array $extra)
    {
        return $this->postJson('/api/v1/inventory/restock', $extra + [
            'product_id' => $product->id, 'quantity' => 4, 'batch_cost' => 500000, 'purchase_date' => '2026-09-20',
        ])->assertCreated();
    }

    private function supplier(): Supplier
    {
        return Supplier::create([
            'supplier_code' => 'SUP-'.uniqid(), 'supplier_name' => 'PT Retur '.uniqid(),
            'phone' => '0811', 'payment_terms_days' => 30, 'is_active' => true,
        ]);
    }

    private function sellOne(Product $product): void
    {
        $this->checkout([
            'items' => [$this->productLine($product, 1)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 800000]],
        ])->assertCreated();
    }

    public function test_tempo_return_reduces_payable_first_then_refunds_and_skips_sold_units(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $id = $this->receive($product, ['supplier_id' => $this->supplier()->id, 'payment_method' => 'TEMPO'])->json('data.purchase.id');
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 1500000, 'account_code' => '1-1001'])->assertCreated();
        $this->sellOne($product);

        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 4, 'reason' => 'Ban cacat produksi'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Hanya 3 unit'));

        $res = $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 3, 'reason' => 'Ban cacat produksi', 'refund_account_code' => '1-1001'])
            ->assertCreated()
            ->assertJsonPath('data.purchase.returned_amount', 1500000)
            ->assertJsonPath('data.purchase.paid_amount', 500000)
            ->assertJsonPath('data.purchase.remaining_amount', 0)
            ->assertJsonPath('data.purchase.status', 'LUNAS')
            ->assertJsonPath('data.purchase.returnable_qty', 0)
            ->assertJsonPath('data.purchase_return.kind', 'RETURN')
            ->assertJsonPath('data.purchase_return.payable_amount', 500000)
            ->assertJsonPath('data.purchase_return.refund_amount', 1000000);
        $this->assertMatchesRegularExpression('/^RTB-\d{6}-\d{4}$/', $res->json('data.purchase_return.reference'));

        $j = $this->journalByAccount($res->json('data.purchase_return.reference'), 'PURCHASE_RETURN');
        $this->assertEquals(500000, $j['2-1000']['debit']);
        $this->assertEquals(1000000, $j['1-1001']['debit']);
        $this->assertEquals(1500000, $j['1-2000']['credit']);
        $this->assertSame(0, $product->fresh()->product_quantity);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_cent_split_receipt_returns_newest_layer_first_and_refunds_cash(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $id = $this->receive($product, [
            'source_name' => 'Toko Grosir', 'payment_method' => 'TUNAI', 'quantity' => 3, 'batch_cost' => 33333.33, 'invoice_total' => 100000,
        ])->json('data.purchase.id');
        $today = now()->toDateString();
        $flowBefore = (new CashFlowReport())->build($today, $today)['operating']['suppliers'];

        $first = $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 1, 'reason' => 'Salah ukuran'])
            ->assertCreated()
            ->assertJsonPath('data.purchase_return.total_amount', 33333.34)
            ->assertJsonPath('data.purchase_return.refund_account_code', '1-1000');
        $this->assertEquals(33333.34, $this->journalByAccount($first->json('data.purchase_return.reference'), 'PURCHASE_RETURN')['1-1000']['debit']);

        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 2, 'reason' => 'Salah ukuran'])
            ->assertCreated()
            ->assertJsonPath('data.purchase.returned_amount', 100000)
            ->assertJsonPath('data.purchase.paid_amount', 0)
            ->assertJsonPath('data.purchase.status', 'LUNAS');

        $flow = (new CashFlowReport())->build($today, $today);
        $this->assertEqualsWithDelta($flowBefore + 100000, $flow['operating']['suppliers'], 0.001);
        $this->assertTrue($flow['is_reconciled']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_untouched_receipt_is_cancelled_by_a_linked_mirror_entry(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $gr = $this->receive($product, ['supplier_id' => $this->supplier()->id, 'payment_method' => 'TEMPO']);
        $id = $gr->json('data.purchase.id');

        $res = $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])
            ->assertOk()
            ->assertJsonPath('data.purchase.status', 'BATAL')
            ->assertJsonPath('data.purchase.remaining_amount', 0)
            ->assertJsonPath('data.purchase_return.kind', 'CANCEL')
            ->assertJsonPath('data.journal.reference_type', 'GOODS_RECEIPT_CANCEL')
            ->assertJsonPath('data.journal.reversal_of', $gr->json('data.purchase.journal_entry_number'));

        $j = $this->journalByAccount($res->json('data.purchase_return.reference'), 'GOODS_RECEIPT_CANCEL');
        $this->assertEquals(2000000, $j['2-1000']['debit']);
        $this->assertEquals(2000000, $j['1-2000']['credit']);
        $this->assertSame(0, $product->fresh()->product_quantity);
        $this->assertSame(0, (int) ProductBatch::where('purchase_id', $id)->sum('remaining_qty'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])->assertStatus(422);
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 1000, 'account_code' => '1-1001'])->assertStatus(422);
        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 1, 'reason' => 'Salah input faktur'])->assertStatus(422);
    }

    public function test_return_and_cancel_are_refused_when_system_stock_is_below_the_receipt_layers(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $id = $this->receive($product, ['supplier_id' => $this->supplier()->id, 'payment_method' => 'TEMPO'])->json('data.purchase.id');
        $product->update(['product_quantity' => 2]); // drift lama: lapisan GR 4 unit, stok sistem 2

        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 3, 'reason' => 'Ban cacat produksi'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'stock opname'));
        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])->assertStatus(422);
        $this->assertSame(4, (int) ProductBatch::where('purchase_id', $id)->sum('remaining_qty'));
        $this->assertSame(2, $product->fresh()->product_quantity);

        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 2, 'reason' => 'Ban cacat produksi'])->assertCreated();
        $this->assertSame(0, $product->fresh()->product_quantity);
    }

    public function test_used_receipt_cannot_be_cancelled_and_kasir_is_forbidden(): void
    {
        $product = $this->emptyProduct();
        $id = $this->receive($product, ['source_name' => 'Toko Grosir', 'payment_method' => 'TUNAI', 'quantity' => 2])->json('data.purchase.id');
        $this->sellOne($product);

        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tidak bisa dibatalkan'));

        $this->actingAsRole('KASIR');
        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 1, 'reason' => 'Ban cacat produksi'])->assertForbidden();
        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])->assertForbidden();
    }
}
