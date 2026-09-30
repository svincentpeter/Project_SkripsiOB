<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
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

    public function test_prepayment_used_up_credits_prepaid_expenses_without_reversal(): void
    {
        $res = $this->postJson(self::URL, $this->payload([
            'kind' => 'PREPAID', 'account_code' => '6-1003', 'amount' => 2000000,
            'description' => 'Sewa toko Maret dari sewa dibayar di muka', 'auto_reverse' => false,
        ]))->assertCreated()->assertJsonCount(1, 'data.journals');

        $entry = $res->json('data.journals.0');
        $this->assertEquals(2000000, $this->line($entry, '6-1003')['debit']);
        $this->assertEquals(2000000, $this->line($entry, '1-1100')['credit']);
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
