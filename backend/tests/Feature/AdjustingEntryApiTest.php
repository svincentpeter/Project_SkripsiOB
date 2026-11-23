<?php

namespace Tests\Feature;

use App\Models\JournalItem;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdjustingEntryApiTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/accounting/adjusting-entries';

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'period' => '2019-03',
            'kind' => 'ACCRUAL',
            'account_code' => '6-1001',
            'amount' => 450000,
            'description' => 'Tagihan listrik Maret belum datang',
            'auto_reverse' => true,
        ], $overrides);
    }

    private function line(array $journal, string $code): array
    {
        return collect($journal['lines'])->firstWhere('account_code', $code);
    }

    public function test_accrual_is_booked_at_month_end_and_reversed_on_the_first_of_next_month(): void
    {
        $res = $this->postJson(self::URL, $this->payload())
            ->assertCreated()
            ->assertJsonCount(2, 'data.journals')
            ->assertJsonPath('data.journals.0.reference_type', 'ADJUSTING_ENTRY')
            ->assertJsonPath('data.journals.0.entry_date', '2019-03-31')
            ->assertJsonPath('data.journals.1.reference_type', 'ADJUSTING_REVERSAL')
            ->assertJsonPath('data.journals.1.entry_date', '2019-04-01');

        [$entry, $reversal] = $res->json('data.journals');
        $this->assertStringStartsWith('AJP-201903-', $entry['reference_id']);
        $this->assertSame($entry['reference_id'], $reversal['reference_id']);
        $this->assertSame($entry['entry_number'], $reversal['reversal_of']);
        $this->assertEquals(450000, $this->line($entry, '6-1001')['debit']);
        $this->assertEquals(450000, $this->line($entry, '2-1100')['credit']);
        $this->assertEquals(450000, $this->line($reversal, '2-1100')['debit']);
        $this->assertEquals(450000, $this->line($reversal, '6-1001')['credit']);
    }

    /** Sewa dibayar di muka: Dr 1-1100 / Cr 3-1000 sehingga saldo 1-1100 = $amount + sisa data lain. */
    private function prepay(float $amount, string $date = '2019-03-01'): void
    {
        (new JournalDraft())->debit('1-1100', $amount, 'uji')->credit('3-1000', $amount, 'uji')
            ->post(app(AccountingEngine::class), 'TEST', 'PRE-'.uniqid(), 'Uji sewa dibayar di muka', $date);
    }

    private function prepaidBalance(): float
    {
        return round((float) JournalItem::whereHas('account', fn ($q) => $q->where('account_code', '1-1100'))
            ->whereHas('journalEntry', fn ($q) => $q->where('status', 'POSTED'))->sum(DB::raw('debit - credit')), 2);
    }

    public function test_prepayment_used_up_credits_prepaid_expenses_without_reversal(): void
    {
        $this->prepay(2000000);
        $res = $this->postJson(self::URL, $this->payload([
            'kind' => 'PREPAID', 'account_code' => '6-1003', 'amount' => 2000000,
            'description' => 'Sewa toko Maret dari sewa dibayar di muka', 'auto_reverse' => false,
        ]))->assertCreated()->assertJsonCount(1, 'data.journals');

        $entry = $res->json('data.journals.0');
        $this->assertEquals(2000000, $this->line($entry, '6-1003')['debit']);
        $this->assertEquals(2000000, $this->line($entry, '1-1100')['credit']);
    }

    public function test_prepayment_usage_cannot_exceed_the_prepaid_balance(): void
    {
        // Saldo 1-1100 di DB uji bisa berisi sisa data lain: buat tepat Rp 1.000.000 per 1 Maret 2019.
        $gap = round(1000000 - $this->prepaidBalance(), 2);
        $gap > 0 ? $this->prepay($gap, '2019-03-01') : null;
        $this->assertGreaterThanOrEqual(1000000, $this->prepaidBalance());
        $prepaid = fn (float $amount, string $period = '2019-03') => $this->postJson(self::URL, $this->payload([
            'period' => $period, 'kind' => 'PREPAID', 'account_code' => '6-1003', 'amount' => $amount, 'auto_reverse' => false,
        ]));

        $balance = $this->prepaidBalance();
        $prepaid($balance + 1)->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, '1-1100'));
        $prepaid(600000, '2019-04')->assertCreated();
        // Maret masih cukup sendiri, tetapi pemakaian April yang sudah dibukukan akan membuat saldo April negatif.
        $prepaid($balance - 600000 + 1)->assertStatus(422);
        $prepaid($balance - 600000)->assertCreated();
        $this->assertEquals(0.0, $this->prepaidBalance());
    }

    public function test_auto_reversal_is_only_for_accruals(): void
    {
        $this->postJson(self::URL, $this->payload(['kind' => 'PREPAID', 'auto_reverse' => true]))
            ->assertStatus(422)->assertJsonValidationErrors('auto_reverse');
    }

    public function test_only_operating_expense_accounts_other_than_depreciation_are_allowed(): void
    {
        foreach (['1-1000', '6-1011', '5-1000', '9-9999'] as $code) {
            $this->postJson(self::URL, $this->payload(['account_code' => $code]))
                ->assertStatus(422)->assertJsonValidationErrors('account_code');
        }
    }

    public function test_closed_and_future_periods_are_rejected(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-03'])->assertCreated();
        $this->postJson(self::URL, $this->payload())
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'ditutup'));

        $this->postJson(self::URL, $this->payload(['period' => now()->addMonthNoOverflow()->format('Y-m')]))
            ->assertStatus(422);
    }

    public function test_a_period_swept_by_closing_the_next_month_is_rejected_without_posting(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-04'])->assertCreated();

        $this->postJson(self::URL, $this->payload())
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'ditutup'));
        $this->assertDatabaseMissing('journal_entries', ['reference_type' => 'ADJUSTING_ENTRY', 'entry_date' => '2019-03-31']);
    }

    public function test_adjusting_journals_can_be_filtered_in_the_journal_list(): void
    {
        $this->postJson(self::URL, $this->payload())->assertCreated();

        $this->getJson('/api/v1/accounting/journals?types=ADJUSTING_ENTRY,ADJUSTING_REVERSAL&start_date=2019-03-01&end_date=2019-04-30')
            ->assertOk()->assertJsonPath('data.total', 2);
    }

    public function test_roles_without_accounting_hub_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->postJson(self::URL, $this->payload())->assertForbidden();
    }
}
