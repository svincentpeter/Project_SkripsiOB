<?php

namespace Tests\Feature;

use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines [kode, debit, kredit] */
    private function postJournal(string $date, array $lines, string $type = 'TEST'): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), $type, 'T-'.uniqid(), 'Uji laporan', $date);
    }

    /** Penjualan POS lengkap: diskon, surcharge EDC, MDR, HPP, selisih opname, dan beban listrik. */
    private function postMarchActivity(): void
    {
        $this->postJournal('2021-03-10', [
            ['1-1000', 950000, 0], ['4-9000', 50000, 0], ['6-1009', 7000, 0],
            ['4-1000', 0, 900000], ['4-1001', 0, 100000], ['4-2000', 0, 7000],
        ]);
        $this->postJournal('2021-03-10', [['5-1000', 600000, 0], ['1-2000', 0, 600000]]);
        $this->postJournal('2021-03-20', [['5-2000', 20000, 0], ['1-2000', 0, 20000]]);
        $this->postJournal('2021-03-25', [['6-1001', 100000, 0], ['1-1000', 0, 100000]]);
    }

    private function amount(array $section, ?string $code): float
    {
        foreach ($section['lines'] as $line) {
            if ($line['code'] === $code) {
                return $line['amount'];
            }
        }

        return 0.0;
    }

    public function test_income_statement_includes_every_revenue_and_expense_account(): void
    {
        $this->postMarchActivity();

        $is = app(FinancialReportService::class)->incomeStatement('2021-03-01', '2021-03-31');

        $this->assertEquals(1007000, $is['revenue']['total']);
        $this->assertEquals(7000, $this->amount($is['revenue'], '4-2000'));
        $this->assertEquals(50000, $is['contra_revenue']['total']);
        $this->assertEquals(957000, $is['net_revenue']);
        $this->assertEquals(20000, $this->amount($is['cost_of_sales'], '5-2000'));
        $this->assertEquals(620000, $is['cost_of_sales']['total']);
        $this->assertEquals(337000, $is['gross_profit']);
        $this->assertEquals(7000, $this->amount($is['operating_expenses'], '6-1009'));
        $this->assertEquals(230000, $is['net_income']);
    }

    public function test_balance_sheet_balances_and_shows_dp_liability_and_unclosed_earnings(): void
    {
        $reports = app(FinancialReportService::class);
        $before = $reports->balanceSheet('2021-03-31');

        $this->postJournal('2021-03-05', [['1-1001', 200000, 0], ['2-1004', 0, 200000]], 'BOOKING_DP');
        $this->postMarchActivity();

        $after = $reports->balanceSheet('2021-03-31');
        $this->assertTrue($after['is_balanced']);
        $this->assertEquals(0, $after['difference']);
        $this->assertEquals(200000, $this->amount($after['liabilities'], '2-1004') - $this->amount($before['liabilities'], '2-1004'));
        $this->assertEquals(230000, $this->amount($after['equity'], null) - $this->amount($before['equity'], null));
    }

    public function test_general_ledger_starts_from_the_balance_before_the_period(): void
    {
        $reports = app(FinancialReportService::class);
        $baseline = $reports->generalLedger('1-1000', '2021-03-01', '2021-03-31');

        $this->postJournal('2021-02-10', [['1-1000', 500000, 0], ['3-1000', 0, 500000]]);
        $this->postJournal('2021-03-12', [['1-1000', 100000, 0], ['4-1000', 0, 100000]]);

        $ledger = $reports->generalLedger('1-1000', '2021-03-01', '2021-03-31');
        $this->assertEquals(500000, $ledger['opening_balance'] - $baseline['opening_balance']);
        $mutation = collect($ledger['mutations'])->firstWhere('date', '2021-03-12');
        $this->assertEquals(100000, $mutation['debit']);
        $this->assertEquals($ledger['ending_balance'], end($ledger['mutations'])['running_balance']);
    }

    public function test_trial_balance_is_balanced_and_lists_every_account(): void
    {
        $this->postMarchActivity();

        $tb = app(FinancialReportService::class)->trialBalance('2021-03-31');

        $this->assertTrue($tb['is_balanced']);
        $codes = array_column($tb['accounts'], 'account_code');
        foreach (['2-1004', '4-2000', '5-2000', '6-1009'] as $code) {
            $this->assertContains($code, $codes);
        }
    }

    public function test_equity_changes_reconcile(): void
    {
        $this->postJournal('2021-03-02', [['1-1001', 1000000, 0], ['3-1000', 0, 1000000]]);
        $this->postMarchActivity();

        $eq = app(FinancialReportService::class)->equityChanges('2021-03-01', '2021-03-31');

        $this->assertEquals(1000000, $eq['owner_contributions']);
        $this->assertEquals(230000, $eq['net_income']);
        $this->assertEquals(0, $eq['difference']);
    }

    public function test_financial_statements_endpoint_uses_the_requested_period(): void
    {
        $this->postMarchActivity();

        $this->getJson('/api/v1/accounting/financial-statements?start_date=2021-03-01&end_date=2021-03-31')
            ->assertOk()
            ->assertJsonPath('data.period.start_date', '2021-03-01')
            ->assertJsonPath('data.income_statement.net_income', 230000)
            ->assertJsonPath('data.balance_sheet.is_balanced', true)
            ->assertJsonStructure(['data' => ['equity_changes' => ['opening_equity', 'owner_contributions', 'net_income', 'closing_equity', 'difference']]]);
    }

    public function test_report_endpoints_validate_dates(): void
    {
        $this->getJson('/api/v1/accounting/financial-statements?start_date=2021-03-31&end_date=2021-03-01')->assertStatus(422);
        $this->getJson('/api/v1/accounting/trial-balance?as_of=31-03-2021')->assertStatus(422);
        $this->getJson('/api/v1/accounting/general-ledger?account_code=9-9999')->assertStatus(422);
    }

    public function test_kasir_cannot_read_reports(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/financial-statements')->assertForbidden();
        $this->getJson('/api/v1/accounting/trial-balance')->assertForbidden();
        $this->getJson('/api/v1/accounting/general-ledger?account_code=1-1000')->assertForbidden();
    }
}
