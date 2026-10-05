<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Models\AccountingPeriodClosing;
use App\Models\Sale;
use App\Models\SaleBatchAllocation;
use App\Models\SalePayment;
use App\Models\SalesReturn;
use App\Models\ServiceMaster;
use App\Services\Accounting\CashFlowReport;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\Pos\SalesReturnService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\Concerns\OpensReturnCashSession;
use Tests\TestCase;

/**
 * Retur penjualan sebagian: refund mengikuti cara bayar nota (tunai dari laci 1-1000, QRIS/transfer dari bank 1-1001),
 * barang kembali ke batch asal dengan modal aslinya (Dr 1-2000 / Cr 5-1000).
 */
class SalesReturnTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;
    use OpensReturnCashSession;

    /** 3 unit @1 jt dengan diskon nota 300rb: FIFO 1 @500rb + 2 @600rb. */
    private function discountedSale($product, array $payments = [['method' => 'TRANSFER_BCA', 'amount' => 2700000]])
    {
        return $this->checkout([
            'items' => [$this->productLine($product, 3)],
            'discount_amount' => 300000,
            'payments' => $payments,
        ])->assertCreated();
    }

    private function cashSale($product)
    {
        return $this->discountedSale($product, [['method' => 'TUNAI', 'amount' => 2700000]]);
    }

    private function returnLines(int $saleId, array $items, string $reason = 'Ban tidak cocok ukuran')
    {
        return $this->postJson("/api/v1/pos/transactions/{$saleId}/returns", ['reason' => $reason, 'items' => $items]);
    }

    public function test_partial_then_final_return_of_a_transfer_sale_refunds_from_the_bank_and_restores_layers(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        // Nota transfer: refund dari bank, tanpa shift kasir.
        DB::table('cash_sessions')->where('status', 'OPEN')->update(['status' => 'CLOSED', 'closed_at' => now()]);
        $sale = $this->discountedSale($product);
        $saleId = $sale->json('data.id');
        $lineId = $sale->json('data.items.0.id');
        $today = now()->toDateString();
        $flowBefore = (new CashFlowReport())->build($today, $today)['operating']['customers'];

        $first = $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 900000)
            ->assertJsonPath('data.sales_return.refund_bank', 900000)
            ->assertJsonPath('data.sales_return.refund_cash', 0)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Bank BCA') && ! str_contains($m, 'laci'))
            ->assertJsonPath('data.sales_return.cost_amount', 600000)
            ->assertJsonPath('data.sale.returned_amount', 900000)
            ->assertJsonPath('data.sale.items.0.returned_qty', 1)
            ->assertJsonPath('data.sale.status', 'LUNAS');
        $this->assertMatchesRegularExpression('/^RTJ-\d{6}-\d{4}$/', $first->json('data.sales_return.reference'));

        $j = $this->journalByAccount($first->json('data.sales_return.reference'), 'SALES_RETURN');
        $this->assertEquals(900000, $j['4-9100']['debit']);
        $this->assertEquals(900000, $j['1-1001']['credit']);
        $this->assertArrayNotHasKey('1-1000', $j);
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
        $this->assertEquals(2700000, SalesReturn::where('sale_id', $saleId)->whereNull('cash_session_id')->sum('refund_bank'), 'refund bank tanpa shift');
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
        $this->ensureOpenCashSessionForReturn();
        $sale = $this->cashSale($product);
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
        // Retur pertama ditolak, jadi nota tanpa jejak batch lengkap masih bisa dibatalkan lewat VOID.
        $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Jejak batch hilang'])->assertOk();

        $other = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $this->postJson("/api/v1/pos/transactions/{$other->json('data.id')}/void", ['reason' => 'Salah input'])->assertOk();
        $this->returnLines($other->json('data.id'), [['sale_detail_id' => $other->json('data.items.0.id'), 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'VOID'));
    }

    public function test_first_return_is_refused_while_any_product_line_lacks_its_batch_trail(): void
    {
        $this->ensureOpenCashSessionForReturn();
        $sale = $this->checkout([
            'items' => [$this->productLine($this->makeProduct()), $this->productLine($this->makeProduct())],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 2000000]],
        ])->assertCreated();
        SaleBatchAllocation::where('sale_detail_id', $sale->json('data.items.1.id'))->delete();

        // Baris 0 sendiri lengkap, tetapi retur pertama akan menutup jalan VOID untuk baris 1 yang tak bisa diretur.
        $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'jejak batch FIFO') && str_contains($m, 'VOID'));
        $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Jejak batch hilang'])->assertOk();
    }

    public function test_full_returns_of_a_multi_line_discounted_sale_refund_exactly_the_nota_total(): void
    {
        $service = ServiceMaster::create([
            'service_code' => 'JASA-'.uniqid(), 'service_name' => 'Balancing', 'category' => 'BALANCING',
            'standard_price' => 150000, 'cost_price' => 0, 'is_active' => true,
        ]);
        $a = $this->makeProduct(333333, [[1, 200000, '2026-07-01'], [4, 210000, '2026-08-01']]);
        $b = $this->makeProduct(199999, [[5, 150000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $this->ensureOpenCashSessionForReturn();
        // Subtotal 999.999 + 399.996 + 150.000 = 1.549.995; diskon nota ganjil 100.001 → total 1.449.994.
        $sale = $this->checkout([
            'items' => [
                $this->productLine($a, 3),
                $this->productLine($b, 2, null, 1),
                ['type' => 'SERVICE', 'service_id' => $service->id, 'name' => 'x', 'quantity' => 1, 'unit_price' => 150000],
            ],
            'discount_amount' => 100001,
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1449994]],
        ])->assertCreated();
        [$lineA, $lineB, $lineS] = array_column($sale->json('data.items'), 'id');

        $refunds = [];
        foreach ([
            [['sale_detail_id' => $lineA, 'quantity' => 1], ['sale_detail_id' => $lineB, 'quantity' => 1]],
            [['sale_detail_id' => $lineA, 'quantity' => 1]],
            [['sale_detail_id' => $lineA, 'quantity' => 1], ['sale_detail_id' => $lineB, 'quantity' => 1], ['sale_detail_id' => $lineS, 'quantity' => 1]],
        ] as $lines) {
            $res = $this->returnLines($sale->json('data.id'), $lines)->assertCreated();
            $refunds[] = $res->json('data.sales_return.refund_amount');
            $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
        }

        $this->assertEqualsWithDelta(1449994, array_sum($refunds), 0.001);
        $this->assertEqualsWithDelta(1449994, $res->json('data.sale.returned_amount'), 0.001);
        $this->assertSame(5, $a->fresh()->product_quantity);
        $this->assertSame(5, $b->fresh()->product_quantity);
    }

    public function test_return_is_refused_for_foreign_line_over_return_duplicate_lines_and_closed_period(): void
    {
        $this->ensureOpenCashSessionForReturn();
        $sale = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $other = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $saleId = $sale->json('data.id');
        $lineId = $sale->json('data.items.0.id');

        $this->returnLines($saleId, [['sale_detail_id' => $other->json('data.items.0.id'), 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'bukan bagian dari nota'));
        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 4]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'melebihi sisa'));

        // Baris ganda dalam satu permintaan (lolos dari aturan distinct controller) tetap dibatasi sisa baris.
        try {
            app(SalesReturnService::class)->create($saleId, [
                ['sale_detail_id' => $lineId, 'quantity' => 2], ['sale_detail_id' => $lineId, 'quantity' => 2],
            ], 'Baris ganda', auth()->user());
            $this->fail('Retur baris ganda melebihi sisa harus ditolak.');
        } catch (PosRuleException $e) {
            $this->assertStringContainsString('melebihi sisa', $e->getMessage());
        }

        AccountingPeriodClosing::create([
            'period' => now()->format('Y-m'), 'end_date' => now()->toDateString(), 'closed_at' => now(),
        ]);
        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah ditutup'));
        $this->assertFalse(SalesReturn::where('sale_id', $saleId)->exists());
    }

    /**
     * Kunci diambil berurutan akun 1-1000 → shift → produk → nota → alokasi → batch, sama seperti checkout
     * (produk sebelum nota). Dua koneksi dalam satu proses test tidak bisa saling menunggu, jadi urutan dibuktikan
     * dari log query.
     */
    public function test_return_and_void_lock_products_before_the_sale(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->ensureOpenCashSessionForReturn();
        // Nota tunai: retur mengambil kunci laci & shift lebih dulu.
        $sale = $this->cashSale($product);
        $other = $this->cashSale($product);

        DB::enableQueryLog();
        $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]])->assertCreated();
        $order = $this->lockOrder(['accounts' => 'lock in share mode', 'cash_sessions' => 'lock in share mode', 'products' => 'for update',
            'sales' => 'for update', 'sale_batch_allocations' => 'for update', 'product_batches' => 'for update']);
        $this->assertSame($order, array_values(array_filter($order, 'is_int')), 'semua kunci retur harus ada');
        $this->assertSame($order, collect($order)->sort()->values()->all(), 'urutan kunci retur');

        DB::flushQueryLog();
        $this->postJson("/api/v1/pos/transactions/{$other->json('data.id')}/void", ['reason' => 'Salah input'])->assertOk();
        $order = $this->lockOrder(['products' => 'for update', 'sales' => 'for update', 'product_batches' => 'for update']);
        $this->assertSame($order, array_values(array_filter($order, 'is_int')), 'semua kunci void harus ada');
        $this->assertSame($order, collect($order)->sort()->values()->all(), 'urutan kunci void');
        DB::disableQueryLog();
    }

    /** @return list<int|null> posisi query penguncian pertama per tabel, dalam urutan yang diharapkan */
    private function lockOrder(array $locks): array
    {
        $queries = array_column(DB::getQueryLog(), 'query');
        $order = [];
        foreach ($locks as $table => $mode) {
            $hits = array_keys(array_filter($queries, fn ($q) => str_contains($q, "from `{$table}`") && str_ends_with($q, $mode)));
            $order[] = $hits[0] ?? null;
        }

        return $order;
    }

    public function test_split_payment_refund_follows_each_payment_share_exactly(): void
    {
        $product = $this->makeProduct(1000000, [[3, 500000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $session = $this->ensureOpenCashSessionForReturn();
        $sale = $this->discountedSale($product, [['method' => 'TUNAI', 'amount' => 1000000], ['method' => 'TRANSFER_BCA', 'amount' => 1700000]]);
        $saleId = $sale->json('data.id');
        $lineId = $sale->json('data.items.0.id');

        $first = $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 900000)
            ->assertJsonPath('data.sales_return.refund_cash', 333333.33)
            ->assertJsonPath('data.sales_return.refund_bank', 566666.67);
        $j = $this->journalByAccount($first->json('data.sales_return.reference'), 'SALES_RETURN');
        $this->assertEquals(333333.33, $j['1-1000']['credit']);
        $this->assertEquals(566666.67, $j['1-1001']['credit']);
        $this->assertSame($session, SalesReturn::where('reference', $first->json('data.sales_return.reference'))->value('cash_session_id'));

        // Retur penuh: Σ bagian tiap akun = pembayaran ke akun itu, tepat sampai sen.
        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 2]])->assertCreated()
            ->assertJsonPath('data.sales_return.refund_cash', 666666.67)
            ->assertJsonPath('data.sales_return.refund_bank', 1133333.33);
        $this->assertEquals([1000000.0, 1700000.0], [
            (float) SalesReturn::where('sale_id', $saleId)->sum('refund_cash'),
            (float) SalesReturn::where('sale_id', $saleId)->sum('refund_bank'),
        ]);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_only_the_owner_returns_notas_older_than_thirty_days(): void
    {
        $product = $this->makeProduct(1000000, [[6, 500000, '2026-08-01']]);
        $old = $this->discountedSale($product);
        $recent = $this->discountedSale($product);
        Sale::whereKey($old->json('data.id'))->update(['date' => now()->subDays(31)->toDateString()]);
        Sale::whereKey($recent->json('data.id'))->update(['date' => now()->subDays(30)->toDateString()]);
        $line = fn ($sale) => [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]];

        $this->actingAsRole('KASIR');
        $this->returnLines($old->json('data.id'), $line($old))
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, '30 hari') && str_contains($m, 'pemilik'));
        $this->returnLines($recent->json('data.id'), $line($recent))->assertCreated();

        $this->actingAsRole('OWNER');
        $this->returnLines($old->json('data.id'), $line($old))->assertCreated();
    }

    public function test_a_nota_not_paid_in_full_at_the_till_cannot_be_returned(): void
    {
        $sale = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        // Nota BON/DP lama: pembayaran di kasir tidak sebesar total nota.
        SalePayment::where('sale_id', $sale->json('data.id'))->update(['amount' => 700000]);

        $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'jurnal manual'));
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
