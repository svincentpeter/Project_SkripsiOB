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
    private function postJournal(string $date, array $lines): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), 'TEST', 'CF-'.uniqid(), 'Uji arus kas', $date);
    }

    private function postAprilActivity(): void
    {
        // Penjualan BON sebagian: kas 50rb + piutang 50rb, HPP 60rb.
        $this->postJournal('2021-04-10', [['1-1000', 50000, 0], ['1-1002', 50000, 0], ['4-1000', 0, 100000]]);
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

        $this->assertEquals(50000, $cf['operating']['customers']);
        $this->assertEquals(-40000, $cf['operating']['suppliers']);
        $this->assertEquals(-20000, $cf['operating']['expenses']);
        $this->assertEquals(-10000, $cf['operating']['net']);
        $this->assertEquals(0, $cf['investing']['net']);
        $this->assertEquals(500000, $cf['financing']['equity']);
        $this->assertEquals(490000, $cf['net_change']);
        $this->assertTrue($cf['is_reconciled']);
        $this->assertEquals($cf['ending_cash'], $cf['ending_cash_drawer'] + $cf['ending_bank']);
    }

    public function test_cash_flow_endpoint_and_cash_balances(): void
    {
        $this->postAprilActivity();

        $this->getJson('/api/v1/accounting/cash-flow?start_date=2021-04-01&end_date=2021-04-30')
            ->assertOk()
            ->assertJsonPath('data.net_change', 490000)
            ->assertJsonPath('data.is_reconciled', true);

        $this->getJson('/api/v1/accounting/cash-balances')
            ->assertOk()
            ->assertJsonStructure(['data' => ['1-1000', '1-1001']]);
    }

    public function test_kasir_cannot_read_cash_reports(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/cash-flow')->assertForbidden();
        $this->getJson('/api/v1/accounting/cash-balances')->assertForbidden();
    }
}
