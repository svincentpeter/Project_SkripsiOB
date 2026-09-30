<?php

namespace Tests\Feature;

use App\Services\Accounting\CashFlowReport;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CashFlowReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines, string $referenceType = 'TEST'): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), $referenceType, 'CF-'.uniqid(), 'Uji arus kas', $date);
    }

    private function postAprilActivity(): void
    {
        // Penjualan lunas split: tunai 50rb + transfer 50rb, HPP 60rb.
        $this->postJournal('2021-04-10', [['1-1000', 50000, 0], ['1-1001', 50000, 0], ['4-1000', 0, 100000]]);
        $this->postJournal('2021-04-10', [['5-1000', 60000, 0], ['1-2000', 0, 60000]]);
        // Setor kas laci ke bank: tidak mengubah total kas.
        $this->postJournal('2021-04-11', [['1-1001', 30000, 0], ['1-1000', 0, 30000]]);
        $this->postJournal('2021-04-12', [['6-1001', 20000, 0], ['1-1000', 0, 20000]]);
        $this->postJournal('2021-04-13', [['2-1000', 40000, 0], ['1-1001', 0, 40000]]);
        $this->postJournal('2021-04-14', [['1-1001', 500000, 0], ['3-1000', 0, 500000]]);
    }

    public function test_cash_flow_classifies_and_reconciles(): void
    {
        $this->postAprilActivity();

        $cf = app(CashFlowReport::class)->build('2021-04-01', '2021-04-30');

        $this->assertEquals(100000, $cf['operating']['customers']);
        $this->assertEquals(-40000, $cf['operating']['suppliers']);
        $this->assertEquals(-20000, $cf['operating']['expenses']);
        $this->assertEquals(40000, $cf['operating']['net']);
        $this->assertEquals(0, $cf['investing']['net']);
        $this->assertEquals(500000, $cf['financing']['equity']);
        $this->assertEquals(540000, $cf['net_change']);
        $this->assertTrue($cf['is_reconciled']);
        $this->assertEquals($cf['ending_cash'], $cf['ending_cash_drawer'] + $cf['ending_bank']);
    }

    public function test_cash_flow_endpoint_and_cash_balances(): void
    {
        $this->postAprilActivity();

        $this->getJson('/api/v1/accounting/cash-flow?start_date=2021-04-01&end_date=2021-04-30')
            ->assertOk()
            ->assertJsonPath('data.net_change', 540000)
            ->assertJsonPath('data.is_reconciled', true);

        $this->getJson('/api/v1/accounting/cash-balances')
            ->assertOk()
            ->assertJsonStructure(['data' => ['1-1000', '1-1001']]);
    }

    public function test_account_opening_entry_is_not_a_cash_flow_but_feeds_beginning_cash(): void
    {
        $before = app(CashFlowReport::class)->build('2019-03-01', '2019-03-31');

        // Diposting langsung: lewat OpeningBalanceService saldo awal hanya bisa dibukukan sekali.
        $this->postJournal('2019-03-05', [['1-1000', 100000, 0], ['1-3000', 500000, 0], ['3-1000', 0, 600000]], 'ACCOUNT_OPENING');

        $cf = app(CashFlowReport::class)->build('2019-03-01', '2019-03-31');

        $this->assertEquals($before['investing']['fixed_assets'], $cf['investing']['fixed_assets']);
        $this->assertEquals($before['financing']['equity'], $cf['financing']['equity']);
        $this->assertEquals($before['net_change'], $cf['net_change']);
        $this->assertEquals($before['beginning_cash'] + 100000, $cf['beginning_cash']);
        $this->assertEquals($before['ending_cash'] + 100000, $cf['ending_cash']);
        $this->assertTrue($cf['is_reconciled']);
    }

    public function test_cash_purchase_of_fixed_assets_is_investing_outflow(): void
    {
        $before = app(CashFlowReport::class)->build('2019-05-01', '2019-05-31');

        $this->postJournal('2019-05-10', [['1-3000', 250000, 0], ['1-1001', 0, 250000]]);

        $cf = app(CashFlowReport::class)->build('2019-05-01', '2019-05-31');

        $this->assertEquals($before['investing']['fixed_assets'] - 250000, $cf['investing']['fixed_assets']);
        $this->assertEquals($before['investing']['net'] - 250000, $cf['investing']['net']);
        $this->assertEquals($before['net_change'] - 250000, $cf['net_change']);
        $this->assertTrue($cf['is_reconciled']);
    }

    public function test_entry_before_the_period_is_beginning_cash_not_a_flow(): void
    {
        $before = app(CashFlowReport::class)->build('2019-07-01', '2019-07-31');

        $this->postJournal('2019-06-30', [['1-1000', 70000, 0], ['4-1000', 0, 70000]]);

        $cf = app(CashFlowReport::class)->build('2019-07-01', '2019-07-31');

        $this->assertEquals($before['beginning_cash'] + 70000, $cf['beginning_cash']);
        $this->assertEquals($before['operating']['customers'], $cf['operating']['customers']);
        $this->assertEquals($before['net_change'], $cf['net_change']);
        $this->assertTrue($cf['is_reconciled']);
    }

    public function test_cash_journal_without_reference_type_is_still_counted(): void
    {
        $before = app(CashFlowReport::class)->build('2019-09-01', '2019-09-30');

        $entry = (new JournalDraft())
            ->debit('1-1000', 90000, 'uji')
            ->credit('4-1000', 90000, 'uji')
            ->post(app(AccountingEngine::class), 'TEST', 'CF-'.uniqid(), 'Uji tanpa tipe referensi', '2019-09-10');
        $entry->update(['reference_type' => null]);

        $cf = app(CashFlowReport::class)->build('2019-09-01', '2019-09-30');

        $this->assertEquals($before['operating']['customers'] + 90000, $cf['operating']['customers']);
        $this->assertEquals($before['net_change'] + 90000, $cf['net_change']);
        $this->assertTrue($cf['is_reconciled']);
    }

    public function test_kasir_cannot_read_cash_reports(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/cash-flow')->assertForbidden();

        // Saldo kas boleh dibaca kasir (izin cash_session, untuk saldo laci di POS); gudang tidak.
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/accounting/cash-balances')->assertForbidden();
    }
}
