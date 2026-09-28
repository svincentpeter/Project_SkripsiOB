<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\RolePermission;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PeriodClosingTest extends TestCase
{
    use DatabaseTransactions;

    private function postJournal(string $date, string $debit, string $credit, float $amount): JournalEntry
    {
        return (new JournalDraft())
            ->debit($debit, $amount, 'uji')
            ->credit($credit, $amount, 'uji')
            ->post(app(AccountingEngine::class), 'TEST', 'PC-'.uniqid(), 'Uji tutup buku', $date);
    }

    private function postJanuary(): void
    {
        $this->postJournal('2020-01-10', '1-1000', '4-1000', 1000000);
        $this->postJournal('2020-01-20', '6-1001', '1-1000', 200000);
    }

    private function row(array $tb, string $code): array
    {
        return collect($tb['accounts'])->firstWhere('account_code', $code);
    }

    public function test_closing_zeroes_nominal_accounts_at_period_end_and_keeps_the_month_result(): void
    {
        $this->postJanuary();

        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01', 'notes' => 'Tutup Januari'])
            ->assertCreated()
            ->assertJsonPath('data.period', '2020-01')
            ->assertJsonPath('data.end_date', '2020-01-31')
            ->assertJsonPath('data.net_income', 800000);

        $closing = JournalEntry::where('reference_type', 'PERIOD_CLOSING')->where('reference_id', 'TUTUP-2020-01')->firstOrFail();
        $this->assertSame('2020-01-31', $closing->entry_date->toDateString());

        $reports = app(FinancialReportService::class);
        $tb = $reports->trialBalance('2020-01-31');
        $this->assertEquals(0, $this->row($tb, '4-1000')['credit']);
        $this->assertEquals(0, $this->row($tb, '6-1001')['debit']);
        $this->assertEquals(800000, $reports->incomeStatement('2020-01-01', '2020-01-31')['net_income']);
        $this->assertTrue($reports->balanceSheet('2020-01-31')['is_balanced']);
    }

    public function test_posting_into_a_closed_period_is_rejected(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        $this->expectException(PosRuleException::class);
        $this->postJournal('2020-01-15', '1-1000', '4-1000', 1000);
    }

    public function test_cannot_close_a_month_that_has_not_ended(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => now()->format('Y-m')])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'belum berakhir'));
    }

    public function test_cannot_close_a_month_inside_the_locked_range(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-02'])->assertCreated();

        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertStatus(422);
    }

    public function test_owner_can_reopen_the_latest_closing(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        $this->postJson('/api/v1/accounting/periods/2020-01/reopen', ['reason' => 'Ada nota tertinggal'])
            ->assertOk()
            ->assertJsonPath('data.reopen_reason', 'Ada nota tertinggal');

        $closing = JournalEntry::where('reference_id', 'TUTUP-2020-01')->firstOrFail();
        $reopen = JournalEntry::where('reference_type', 'PERIOD_REOPEN')->where('reversal_of_id', $closing->id)->firstOrFail();
        $this->assertSame('2020-01-31', $reopen->entry_date->toDateString());

        $this->postJournal('2020-01-25', '1-1000', '4-1000', 5000);
        $this->getJson('/api/v1/accounting/periods')->assertOk()->assertJsonPath('data.lock_date', null);
    }

    public function test_only_the_latest_closing_can_be_reopened(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-02'])->assertCreated();

        $this->postJson('/api/v1/accounting/periods/2020-01/reopen', ['reason' => 'x'])->assertStatus(422);
    }

    public function test_non_owner_with_accounting_access_cannot_reopen(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        RolePermission::where('role', 'GUDANG')->where('permission_key', 'accounting_hub')->update(['allowed' => true]);
        $this->actingAsRole('GUDANG');

        $this->getJson('/api/v1/accounting/periods')->assertOk();
        $this->postJson('/api/v1/accounting/periods/2020-01/reopen', ['reason' => 'x'])->assertForbidden();
    }

    public function test_kasir_cannot_close_periods(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/periods')->assertForbidden();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertForbidden();
    }
}
