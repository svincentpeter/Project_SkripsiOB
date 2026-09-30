<?php

namespace Tests\Feature;

use App\Models\SaleBatchAllocation;
use App\Models\SalesReturn;
use App\Models\ServiceMaster;
use App\Services\Accounting\CashFlowReport;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\Concerns\OpensReturnCashSession;
use Tests\TestCase;

/**
 * Retur penjualan sebagian: refund tunai dari laci (Dr 4-9100 / Cr 1-1000), barang kembali ke batch asal
 * dengan modal aslinya (Dr 1-2000 / Cr 5-1000).
 */
class SalesReturnTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;
    use OpensReturnCashSession;

    /** 3 unit @1 jt dengan diskon nota 300rb: FIFO 1 @500rb + 2 @600rb. */
    private function discountedSale($product)
    {
        return $this->checkout([
            'items' => [$this->productLine($product, 3)],
            'discount_amount' => 300000,
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 2700000]],
        ])->assertCreated();
    }

    private function returnLines(int $saleId, array $items, string $reason = 'Ban tidak cocok ukuran')
    {
        return $this->postJson("/api/v1/pos/transactions/{$saleId}/returns", ['reason' => $reason, 'items' => $items]);
    }

    public function test_partial_then_final_return_refunds_cash_and_restores_original_layers(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $session = $this->ensureOpenCashSessionForReturn();
        $sale = $this->discountedSale($product);
        $saleId = $sale->json('data.id');
        $lineId = $sale->json('data.items.0.id');
        $today = now()->toDateString();
        $flowBefore = (new CashFlowReport())->build($today, $today)['operating']['customers'];

        $first = $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 900000)
            ->assertJsonPath('data.sales_return.cost_amount', 600000)
            ->assertJsonPath('data.sale.returned_amount', 900000)
            ->assertJsonPath('data.sale.items.0.returned_qty', 1)
            ->assertJsonPath('data.sale.status', 'LUNAS');
        $this->assertMatchesRegularExpression('/^RTJ-\d{6}-\d{4}$/', $first->json('data.sales_return.reference'));

        $j = $this->journalByAccount($first->json('data.sales_return.reference'), 'SALES_RETURN');
        $this->assertEquals(900000, $j['4-9100']['debit']);
        $this->assertEquals(900000, $j['1-1000']['credit']);
        $this->assertEquals(600000, $j['1-2000']['debit']);
        $this->assertEquals(600000, $j['5-1000']['credit']);
        $this->assertContains('SALES_RETURN', array_column($first->json('data.sale.journals'), 'reference_type'));

        $this->assertSame(4, $product->fresh()->product_quantity);
        $this->assertEquals([0, 4], $product->batches()->orderBy('purchase_date')->pluck('remaining_qty')->all());
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $flowAfter = (new CashFlowReport())->build($today, $today);
        $this->assertEqualsWithDelta($flowBefore - 900000, $flowAfter['operating']['customers'], 0.001);
        $this->assertTrue($flowAfter['is_reconciled']);

        // Retur terakhir mengambil sisa nilai baris sehingga total refund = total nota.
        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 2]])
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 1800000)
            ->assertJsonPath('data.sales_return.cost_amount', 1100000)
            ->assertJsonPath('data.sale.returned_amount', 2700000);
        $this->assertEquals([1, 5], $product->batches()->orderBy('purchase_date')->pluck('remaining_qty')->all());
        $this->assertEquals(2700000, SalesReturn::cashRefundedInSession($session), 'refund tercatat pada shift');
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'melebihi sisa'));
        $this->postJson("/api/v1/pos/transactions/{$saleId}/void", ['reason' => 'Batal total'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah punya retur'));
    }

    public function test_service_line_return_only_reverses_revenue(): void
    {
        $service = ServiceMaster::create([
            'service_code' => 'JASA-'.uniqid(), 'service_name' => 'Spooring 3D', 'category' => 'SPOORING',
            'standard_price' => 150000, 'cost_price' => 0, 'is_active' => true,
        ]);
        $product = $this->makeProduct();
        $this->alignInventoryLedger();
        $this->ensureOpenCashSessionForReturn();
        $sale = $this->checkout([
            'items' => [
                ['type' => 'SERVICE', 'service_id' => $service->id, 'name' => 'x', 'quantity' => 1, 'unit_price' => 150000],
                $this->productLine($product),
            ],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1150000]],
        ])->assertCreated();

        $res = $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]], 'Spooring diulang gratis')
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 150000)
            ->assertJsonPath('data.sales_return.cost_amount', 0);

        $j = $this->journalByAccount($res->json('data.sales_return.reference'), 'SALES_RETURN');
        $this->assertEquals(150000, $j['4-9100']['debit']);
        $this->assertArrayNotHasKey('1-2000', $j);
        $this->assertSame(9, $product->fresh()->product_quantity);
    }

    public function test_return_is_refused_without_open_shift_void_sale_or_batch_trail(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $sale = $this->discountedSale($product);
        $lineId = $sale->json('data.items.0.id');
        $items = [['sale_detail_id' => $lineId, 'quantity' => 1]];

        DB::table('cash_sessions')->where('status', 'OPEN')->update(['status' => 'CLOSED', 'closed_at' => now()]);
        $this->returnLines($sale->json('data.id'), $items)
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Buka shift kasir'));

        $this->ensureOpenCashSessionForReturn();
        SaleBatchAllocation::where('sale_detail_id', $lineId)->delete();
        $this->returnLines($sale->json('data.id'), $items)
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'jejak batch FIFO'));
        $this->assertFalse(SalesReturn::where('sale_id', $sale->json('data.id'))->exists());

        $other = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $this->postJson("/api/v1/pos/transactions/{$other->json('data.id')}/void", ['reason' => 'Salah input'])->assertOk();
        $this->returnLines($other->json('data.id'), [['sale_detail_id' => $other->json('data.items.0.id'), 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'VOID'));
    }

    public function test_validation_and_permission(): void
    {
        $sale = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $this->returnLines($sale->json('data.id'), [], 'ok')->assertStatus(422)->assertJsonValidationErrors(['reason', 'items']);

        $this->actingAsRole('GUDANG');
        $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]])
            ->assertForbidden();
    }
}
