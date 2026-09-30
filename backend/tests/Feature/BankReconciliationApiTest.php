<?php

namespace Tests\Feature;

use App\Models\BankStatementLine;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BankReconciliationApiTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/accounting/bank-reconciliation';

    /** Baris jurnal 1-1001 dari jurnal uji; mengembalikan id baris bank. */
    private function bankEntry(string $date, float $amount, string $counter): int
    {
        $draft = new JournalDraft();
        $amount > 0
            ? $draft->debit('1-1001', $amount, 'uji')->credit($counter, $amount, 'uji')
            : $draft->debit($counter, -$amount, 'uji')->credit('1-1001', -$amount, 'uji');
        $entry = $draft->post(app(AccountingEngine::class), 'TEST', 'BR-'.uniqid(), 'Uji rekonsiliasi', $date);

        return (int) JournalItem::where('journal_entry_id', $entry->id)
            ->whereHas('account', fn ($q) => $q->where('account_code', '1-1001'))->value('id');
    }

    private function line(string $date, string $description, float $amount): int
    {
        return $this->postJson(self::URL.'/lines', ['statement_date' => $date, 'description' => $description, 'amount' => $amount])
            ->assertCreated()->json('data.id');
    }

    private function csv(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('rekening-koran.csv', $content);
    }

    public function test_manual_line_is_stored_unmatched(): void
    {
        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'TRSF CUST', 'amount' => 500000])
            ->assertCreated()
            ->assertJsonPath('data.source', 'MANUAL')
            ->assertJsonPath('data.journal_item_id', null)
            ->assertJsonPath('data.amount', 500000);

        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'NOL', 'amount' => 0])
            ->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_csv_import_detects_the_delimiter_and_skips_lines_already_stored(): void
    {
        $content = "Tanggal;Keterangan;Jumlah\n04/05/2019;TRSF CUST;500000\n2019-05-10;TRSF SEWA;-200000\n2019-05-10;TRSF SEWA;-200000\n";

        $this->post(self::URL.'/import', ['file' => $this->csv($content)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 3)->assertJsonPath('data.skipped', 0);
        $this->post(self::URL.'/import', ['file' => $this->csv($content)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 0)->assertJsonPath('data.skipped', 3);

        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-31,BUNGA,1200.50\n")], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 1);
        $this->assertSame('CSV', BankStatementLine::where('description', 'BUNGA')->value('source'));
    }

    public function test_csv_with_a_bad_row_is_rejected_whole(): void
    {
        $before = BankStatementLine::count();

        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-04,OK,1000\n2019-05-05,SALAH,1.500.000\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Baris 3'));
        $this->post(self::URL.'/import', ['file' => $this->csv("tgl,uraian,nilai\n2019-05-04,X,1000\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tanggal'));

        $this->assertSame($before, BankStatementLine::count());
    }

    public function test_match_requires_the_same_amount_and_direction(): void
    {
        $deposit = $this->bankEntry('2019-05-03', 500000, '4-1000');
        $payment = $this->bankEntry('2019-05-10', -200000, '6-1003');
        $lineId = $this->line('2019-05-04', 'TRSF CUST', 500000);

        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $payment])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Nominal'));
        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $deposit])
            ->assertOk()->assertJsonPath('data.journal_item_id', $deposit);
        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $deposit])->assertStatus(422);

        $this->deleteJson(self::URL."/lines/{$lineId}")->assertStatus(422);
        $this->postJson(self::URL."/lines/{$lineId}/unmatch")->assertOk()->assertJsonPath('data.journal_item_id', null);
        $this->deleteJson(self::URL."/lines/{$lineId}")->assertOk();
    }

    public function test_auto_match_pairs_unique_amounts_within_three_days(): void
    {
        $deposit = $this->bankEntry('2019-05-03', 500000, '4-1000');
        $payment = $this->bankEntry('2019-05-10', -200000, '6-1003');
        $this->bankEntry('2019-05-30', 300000, '4-1000');
        $this->line('2019-05-04', 'TRSF CUST', 500000);
        $this->line('2019-05-10', 'TRSF SEWA', -200000);
        $this->line('2019-05-20', 'SETORAN LAIN', 750000);

        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertOk()->assertJsonPath('data.matched', 2);

        $this->assertEqualsCanonicalizing([$deposit, $payment], BankStatementLine::whereNotNull('journal_item_id')->pluck('journal_item_id')->all());
    }

    public function test_charges_and_interest_are_booked_from_unmatched_lines(): void
    {
        $charge = $this->line('2019-05-31', 'BIAYA ADM', -6500);
        $interest = $this->line('2019-05-31', 'BUNGA', 1200);

        $entry = $this->postJson(self::URL."/lines/{$charge}/post-adjustment")
            ->assertCreated()
            ->assertJsonPath('data.journals.0.reference_type', 'BANK_RECON_ADJUSTMENT')
            ->assertJsonPath('data.journals.0.entry_date', '2019-05-31')
            ->json('data.journals.0');
        $lines = collect($entry['lines']);
        $this->assertEquals(6500, $lines->firstWhere('account_code', '6-1012')['debit']);
        $this->assertEquals(6500, $lines->firstWhere('account_code', '1-1001')['credit']);

        $entry = $this->postJson(self::URL."/lines/{$interest}/post-adjustment")->assertCreated()->json('data.journals.0');
        $lines = collect($entry['lines']);
        $this->assertEquals(1200, $lines->firstWhere('account_code', '1-1001')['debit']);
        $this->assertEquals(1200, $lines->firstWhere('account_code', '4-3000')['credit']);

        $this->assertNotNull(BankStatementLine::find($charge)->journal_item_id);
        $this->postJson(self::URL."/lines/{$charge}/unmatch")->assertStatus(422);
        $this->postJson(self::URL."/lines/{$charge}/post-adjustment")->assertStatus(422);
        $this->assertSame(2, JournalEntry::where('reference_type', 'BANK_RECON_ADJUSTMENT')->whereIn('reference_id', ["REKON-{$charge}", "REKON-{$interest}"])->count());
    }

    public function test_report_reconciles_the_statement_with_the_books(): void
    {
        $this->bankEntry('2019-05-03', 500000, '4-1000');
        $this->bankEntry('2019-05-10', -200000, '6-1003');
        $this->bankEntry('2019-05-30', 300000, '4-1000');
        $this->line('2019-05-04', 'TRSF CUST', 500000);
        $this->line('2019-05-10', 'TRSF SEWA', -200000);
        $charge = $this->line('2019-05-31', 'BIAYA ADM', -6500);
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertOk();

        $report = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->assertNull($report['statement_ending_balance']);
        $this->assertFalse($report['is_reconciled']);
        $this->assertEquals(300000, $report['deposits_in_transit']);
        $this->assertEquals(6500, $report['unrecorded_debits']);
        $this->assertSame('2019-05-01', $report['cutover_date']);

        // Saldo bank = saldo buku − setoran 30 Mei yang belum masuk − biaya admin yang belum dibukukan.
        $statement = round($report['book_balance'] - 300000 - 6500, 2);
        $this->putJson(self::URL.'/2019-13', ['statement_ending_balance' => $statement])->assertStatus(422);
        $this->putJson(self::URL.'/2019-05', ['statement_ending_balance' => $statement])
            ->assertOk()->assertJsonPath('data.is_reconciled', true);

        $this->postJson(self::URL."/lines/{$charge}/post-adjustment")->assertCreated();
        $after = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->assertTrue($after['is_reconciled']);
        $this->assertEquals(0, $after['unrecorded_debits']);
        $this->assertCount(1, $after['outstanding_ledger']);
    }

    public function test_a_ledger_line_matches_only_one_statement_line(): void
    {
        $deposit = $this->bankEntry('2019-05-03', 500000, '4-1000');
        $first = $this->line('2019-05-04', 'TRSF CUST', 500000);
        $second = $this->line('2019-05-05', 'TRSF CUST 2', 500000);

        $this->postJson(self::URL."/lines/{$first}/match", ['journal_item_id' => $deposit])->assertOk();
        $this->postJson(self::URL."/lines/{$second}/match", ['journal_item_id' => $deposit])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'mutasi lain'));
    }

    public function test_adjustments_into_a_closed_period_are_refused(): void
    {
        $charge = $this->line('2019-03-31', 'BIAYA ADM', -6500);
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-03'])->assertCreated();

        $this->postJson(self::URL."/lines/{$charge}/post-adjustment")
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'ditutup'));
        $this->assertNull(BankStatementLine::find($charge)->journal_item_id);
        $this->assertSame(0, JournalEntry::where('reference_id', "REKON-{$charge}")->count());
    }

    public function test_roles_without_bank_reconciliation_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL.'?period=2019-05')->assertForbidden();
        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'X', 'amount' => 1])->assertForbidden();
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertForbidden();
    }
}
