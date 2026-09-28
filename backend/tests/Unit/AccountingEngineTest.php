<?php

namespace Tests\Unit;

use App\Exceptions\AccountingUnbalancedException;
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\AccountingPeriodClosing;
use App\Services\AccountingEngine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AccountingEngineTest extends TestCase
{
    use DatabaseTransactions;

    /** @return array<string, int> */
    private function ids(): array
    {
        return Account::whereIn('account_code', ['1-1000', '4-1000'])->pluck('id', 'account_code')->all();
    }

    private function postEntry(array $items, string $date = '2020-03-15')
    {
        return (new AccountingEngine())->createEntry('TEST', 'REF-'.uniqid(), 'Uji mesin jurnal', $items, $date);
    }

    public function test_balanced_entry_is_numbered_by_entry_month_and_records_creator(): void
    {
        $a = $this->ids();
        $entry = $this->postEntry([
            ['account_id' => $a['1-1000'], 'debit' => 1500000, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 1500000],
        ]);

        $this->assertStringStartsWith('JRN-202003-', $entry->entry_number);
        $this->assertSame('2020-03-15', $entry->entry_date->toDateString());
        $this->assertNotNull($entry->created_by);
        $this->assertCount(2, $entry->items);
        $this->assertEquals(1500000, $entry->total_debit);
    }

    public function test_one_cent_imbalance_is_rejected(): void
    {
        $this->expectException(AccountingUnbalancedException::class);
        $a = $this->ids();
        $this->postEntry([
            ['account_id' => $a['1-1000'], 'debit' => 100.01, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 100.00],
        ]);
    }

    public function test_entry_needs_two_non_zero_lines(): void
    {
        $this->expectException(PosRuleException::class);
        $this->expectExceptionMessage('dua baris');
        $a = $this->ids();
        $this->postEntry([
            ['account_id' => $a['1-1000'], 'debit' => 0, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 0],
        ]);
    }

    public function test_line_with_both_sides_is_rejected(): void
    {
        $this->expectException(PosRuleException::class);
        $a = $this->ids();
        $this->postEntry([
            ['account_id' => $a['1-1000'], 'debit' => 100, 'credit' => 100],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 0],
        ]);
    }

    public function test_negative_amount_is_rejected(): void
    {
        $this->expectException(PosRuleException::class);
        $a = $this->ids();
        $this->postEntry([
            ['account_id' => $a['1-1000'], 'debit' => -100, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => -100],
        ]);
    }

    public function test_posting_into_a_closed_period_is_rejected_and_later_dates_are_allowed(): void
    {
        AccountingPeriodClosing::create(['period' => '2020-03', 'end_date' => '2020-03-31', 'net_income' => 0, 'closed_at' => now()]);
        $a = $this->ids();
        $lines = [
            ['account_id' => $a['1-1000'], 'debit' => 1000, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 1000],
        ];

        $this->assertStringStartsWith('JRN-202004-', $this->postEntry($lines, '2020-04-01')->entry_number);

        $this->expectException(PosRuleException::class);
        $this->expectExceptionMessage('ditutup');
        $this->postEntry($lines, '2020-03-31');
    }

    public function test_reopened_period_no_longer_locks(): void
    {
        AccountingPeriodClosing::create(['period' => '2020-03', 'end_date' => '2020-03-31', 'net_income' => 0, 'closed_at' => now(), 'reopened_at' => now()]);
        $a = $this->ids();

        $entry = $this->postEntry([
            ['account_id' => $a['1-1000'], 'debit' => 1000, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 1000],
        ], '2020-03-10');

        $this->assertSame('2020-03-10', $entry->entry_date->toDateString());
    }
}
