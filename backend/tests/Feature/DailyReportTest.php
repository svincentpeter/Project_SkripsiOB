<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use App\Services\Reports\DailyReportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Laporan operasional harian: uang dari jurnal (sama dengan Laba Rugi & perubahan kas), jumlah nota dari tabel
 * penjualan. Tanggal uji di tahun 2020 agar tidak bercampur dengan data test lain.
 */
class DailyReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines, string $referenceType): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), $referenceType, 'DR-'.uniqid(), 'Uji laporan harian', $date);
    }

    /**
     * Nota dibuat langsung sebagai model (tanpa checkout, jadi tidak butuh sesi kasir SP2).
     *
     * @param  list<array{0: string, 1: float}>  $payments  [[metode, jumlah], ...]
     */
    private function makeSale(string $date, string $cashier, array $payments, string $status = 'LUNAS', int $tyres = 1, int $services = 0): Sale
    {
        $total = array_sum(array_column($payments, 1));
        $sale = Sale::create([
            'reference' => 'DR-INV-'.uniqid(),
            'date' => $date,
            'cashier_name' => $cashier,
            'gross_sales_amount' => $total,
            'total_amount' => $total,
            'paid_amount' => $total,
            'payment_method' => count($payments) === 1 ? $payments[0][0] : 'SPLIT',
            'status' => $status,
            'voided_at' => $status === 'VOID' ? $date.' 15:00:00' : null,
        ]);
        foreach ([['PRODUCT', $tyres], ['SERVICE', $services]] as [$type, $qty]) {
            if ($qty > 0) {
                SaleDetail::create([
                    'sale_id' => $sale->id, 'item_type' => $type, 'item_name' => $type,
                    'quantity' => $qty, 'unit_price' => 1000, 'sub_total' => 1000 * $qty,
                ]);
            }
        }
        foreach ($payments as [$method, $amount]) {
            SalePayment::create([
                'sale_id' => $sale->id, 'method' => $method,
                'account_code' => $method === 'TUNAI' ? '1-1000' : '1-1001',
                'amount' => $amount, 'net_received' => $amount,
            ]);
        }

        return $sale;
    }

    public function test_recap_rows_follow_the_income_statement_and_the_cash_change(): void
    {
        // 10 Feb: nota split tunai + QRIS (MDR 2rb), diskon 10rb, HPP FIFO 250rb.
        $this->postJournal('2020-02-10', [['1-1000', 300000, 0], ['1-1001', 198000, 0], ['6-1009', 2000, 0], ['4-9000', 10000, 0], ['4-1000', 0, 460000], ['4-1001', 0, 50000]], 'POS_SALE');
        $this->postJournal('2020-02-10', [['5-1000', 250000, 0], ['1-2000', 0, 250000]], 'POS_SALE');
        // 11 Feb: biaya tunai; retur penjualan (refund tunai dari laci, barang kembali ke stok FIFO).
        $this->postJournal('2020-02-11', [['6-1001', 20000, 0], ['1-1000', 0, 20000]], 'EXPENSE');
        $this->postJournal('2020-02-11', [['4-9100', 100000, 0], ['1-1000', 0, 100000]], 'SALES_RETURN');
        $this->postJournal('2020-02-11', [['1-2000', 60000, 0], ['5-1000', 0, 60000]], 'SALES_RETURN');
        // 12 Feb: setor kas laci ke bank.
        $this->postJournal('2020-02-12', [['1-1001', 50000, 0], ['1-1000', 0, 50000]], 'CASH_DEPOSIT');

        $recap = app(DailyReportService::class)->recap('2020-02-10', '2020-02-12');

        $this->assertSame(['2020-02-10', '2020-02-11', '2020-02-12'], array_column($recap['rows'], 'date'));
        [$d10, $d11, $d12] = $recap['rows'];

        $this->assertEquals(510000, $d10['revenue']);
        $this->assertEquals(460000, $d10['goods_revenue']);
        $this->assertEquals(50000, $d10['service_revenue']);
        $this->assertEquals(10000, $d10['contra_revenue']);
        $this->assertEquals(0, $d10['returns']);
        $this->assertEquals(500000, $d10['net_revenue']);
        $this->assertEquals(250000, $d10['cost_of_sales']);
        $this->assertEquals(250000, $d10['gross_profit']);
        $this->assertEquals(2000, $d10['operating_expenses']);
        $this->assertEquals(248000, $d10['net_income']);
        $this->assertEquals(498000, $d10['cash_in']);
        $this->assertEquals(0, $d10['cash_out']);

        $this->assertEquals(100000, $d11['returns']);
        $this->assertEquals(-100000, $d11['net_revenue']);
        $this->assertEquals(-60000, $d11['cost_of_sales']);
        $this->assertEquals(20000, $d11['operating_expenses']);
        $this->assertEquals(-60000, $d11['net_income']);
        $this->assertEquals(120000, $d11['cash_out']);

        $this->assertEquals(50000, $d12['cash_in']);
        $this->assertEquals(50000, $d12['cash_out']);
        $this->assertEquals(0, $d12['net_cash']);
        $this->assertEquals(0, $d12['net_income']);

        // Jumlah rekap = Laba Rugi periode yang sama (klasifikasi & pengecualian tutup buku sama).
        $income = app(FinancialReportService::class)->incomeStatement('2020-02-10', '2020-02-12');
        $this->assertEqualsWithDelta($income['net_revenue'], $recap['totals']['net_revenue'], 0.001);
        $this->assertEqualsWithDelta($income['cost_of_sales']['total'], $recap['totals']['cost_of_sales'], 0.001);
        $this->assertEqualsWithDelta($income['operating_expenses']['total'], $recap['totals']['operating_expenses'], 0.001);
        $this->assertEqualsWithDelta($income['net_income'], $recap['totals']['net_income'], 0.001);

        // Mutasi kas = perubahan saldo 1-1000 + 1-1001.
        $change = array_sum(CashFlowReport::cashBalances('2020-02-12')) - array_sum(CashFlowReport::cashBalances('2020-02-09'));
        $this->assertEqualsWithDelta($change, $recap['totals']['net_cash'], 0.001);
    }

    public function test_counts_and_payment_mix_ignore_voided_notas(): void
    {
        $this->makeSale('2020-03-05', 'Kasir A', [['TUNAI', 100000]], tyres: 2);
        $this->makeSale('2020-03-05', 'Kasir B', [['TUNAI', 50000], ['QRIS', 70000]], tyres: 1, services: 1);
        $this->makeSale('2020-03-05', 'Kasir A', [['TRANSFER_BCA', 80000]]);
        $this->makeSale('2020-03-05', 'Kasir A', [['TRANSFER', 90000]], 'VOID', tyres: 4);

        $row = app(DailyReportService::class)->recap('2020-03-05', '2020-03-05')['rows'][0];

        $this->assertSame(3, $row['sales_count']);
        $this->assertSame(4, $row['product_qty']);
        $this->assertEquals(['TUNAI' => 150000, 'TRANSFER' => 80000, 'QRIS' => 70000], $row['payment_mix']);
    }

    public function test_void_on_a_later_day_reverses_money_on_the_void_date(): void
    {
        $this->postJournal('2020-03-20', [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');
        $this->postJournal('2020-03-21', [['4-1000', 100000, 0], ['1-1000', 0, 100000]], 'POS_SALE_VOID');

        $recap = app(DailyReportService::class)->recap('2020-03-20', '2020-03-21');

        $this->assertEquals(100000, $recap['rows'][0]['revenue']);
        $this->assertEquals(100000, $recap['rows'][0]['cash_in']);
        $this->assertEquals(-100000, $recap['rows'][1]['revenue']);
        $this->assertEquals(100000, $recap['rows'][1]['cash_out']);
        $this->assertEquals(0, $recap['totals']['revenue']);
        $this->assertEquals(0, $recap['totals']['net_cash']);
    }

    public function test_recap_endpoint_shape_range_rules_and_permissions(): void
    {
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')
            ->assertOk()
            ->assertJsonCount(3, 'data.rows')
            ->assertJsonStructure(['data' => [
                'from', 'to',
                'rows' => [['date', 'sales_count', 'product_qty', 'net_revenue', 'gross_profit', 'net_income', 'payment_mix' => ['TUNAI', 'TRANSFER', 'QRIS'], 'cash_in', 'cash_out', 'net_cash']],
                'totals' => ['sales_count', 'net_revenue', 'operating_expenses', 'payment_mix'],
            ]]);

        $this->getJson('/api/v1/reports/daily-recap?from=2020-01-01&to=2020-04-01')->assertOk()->assertJsonCount(92, 'data.rows');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-01-01&to=2020-04-02')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Rentang rekap harian maksimal 92 hari.');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-12&to=2020-02-10')->assertStatus(422)->assertJsonValidationErrors('to');

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')->assertForbidden();
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')->assertForbidden();
    }
}
