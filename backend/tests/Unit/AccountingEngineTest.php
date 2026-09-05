<?php

namespace Tests\Unit;

use App\Exceptions\AccountingUnbalancedException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use Tests\TestCase;

class AccountingEngineTest extends TestCase
{
    public function test_balanced_journal_entry_is_successfully_created(): void
    {
        $engine = new AccountingEngine();
        $kas = Account::where('account_code', '1-1000')->firstOrFail();
        $pendapatan = Account::where('account_code', '4-1000')->firstOrFail();

        $items = [
            ['account_id' => $kas->id, 'debit' => 1500000.00, 'credit' => 0.00, 'note' => 'Penerimaan Kas'],
            ['account_id' => $pendapatan->id, 'debit' => 0.00, 'credit' => 1500000.00, 'note' => 'Pendapatan Penjualan Ban'],
        ];

        $entry = $engine->createEntry('TEST', 'REF-' . time(), 'Penjualan Ban Kas', $items);

        $this->assertInstanceOf(JournalEntry::class, $entry);
        $this->assertEquals(1500000.00, $entry->total_debit);
        $this->assertEquals(1500000.00, $entry->total_credit);
        $this->assertEquals('POSTED', $entry->status);
        $this->assertCount(2, $entry->items);
    }

    public function test_unbalanced_journal_entry_throws_exception(): void
    {
        $this->expectException(AccountingUnbalancedException::class);

        $engine = new AccountingEngine();
        $kas = Account::where('account_code', '1-1000')->firstOrFail();
        $pendapatan = Account::where('account_code', '4-1000')->firstOrFail();

        // Debit 1.500.000 != Credit 1.000.000
        $items = [
            ['account_id' => $kas->id, 'debit' => 1500000.00, 'credit' => 0.00, 'note' => 'Penerimaan Kas'],
            ['account_id' => $pendapatan->id, 'debit' => 0.00, 'credit' => 1000000.00, 'note' => 'Pendapatan Salah'],
        ];

        $engine->createEntry('TEST', 'UNBALANCED-' . time(), 'Jurnal Tidak Seimbang', $items);
    }

    public function test_trial_balance_and_financial_statements_structure(): void
    {
        $engine = new AccountingEngine();
        $trialBalance = $engine->getTrialBalance();

        $this->assertArrayHasKey('accounts', $trialBalance);
        $this->assertArrayHasKey('total_debit', $trialBalance);
        $this->assertArrayHasKey('total_credit', $trialBalance);
        $this->assertArrayHasKey('is_balanced', $trialBalance);

        $fin = $engine->getFinancialStatements();
        $this->assertArrayHasKey('income_statement', $fin);
        $this->assertArrayHasKey('balance_sheet', $fin);
        $this->assertArrayHasKey('notes', $fin);
    }
}
