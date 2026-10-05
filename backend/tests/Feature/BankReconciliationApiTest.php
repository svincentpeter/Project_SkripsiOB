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
    private function bankEntry(string $date, float $amount, string $counter, string $type = 'TEST'): int
    {
        $draft = new JournalDraft();
        $amount > 0
            ? $draft->debit('1-1001', $amount, 'uji')->credit($counter, $amount, 'uji')
            : $draft->debit($counter, -$amount, 'uji')->credit('1-1001', -$amount, 'uji');
        $entry = $draft->post(app(AccountingEngine::class), $type, 'BR-'.uniqid(), 'Uji rekonsiliasi', $date);

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

    public function test_a_manual_line_that_rounds_to_zero_is_rejected(): void
    {
        foreach ([0, '0.00', '0.004', '-0.001'] as $amount) {
            $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'NOL', 'amount' => $amount])
                ->assertStatus(422)->assertJsonValidationErrors(['amount' => 'Nominal mutasi tidak boleh nol.']);
        }
        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'SEN', 'amount' => '0.01'])->assertCreated();
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

    public function test_an_entry_and_its_reversal_are_tagged_as_a_pair_but_still_listed(): void
    {
        $item = JournalItem::with('account')->findOrFail($this->bankEntry('2018-03-05', 400000, '3-1000'));
        $capital = JournalItem::with('account')->where('journal_entry_id', $item->journal_entry_id)->where('id', '!=', $item->id)->firstOrFail();
        $reversal = app(AccountingEngine::class)->createEntry('TEST_REVERSAL', 'BR-'.uniqid(), 'Pembalik uji', [
            ['account_id' => $capital->account_id, 'debit' => 400000],
            ['account_id' => $item->account_id, 'credit' => 400000],
        ], '2018-03-06', 3, $item->journal_entry_id);
        $this->line('2018-03-20', 'LAIN', 1000);

        $rows = collect($this->getJson(self::URL.'?period=2018-03')->assertOk()->json('data.outstanding_ledger'))->keyBy('entry_number');
        $original = JournalEntry::findOrFail($item->journal_entry_id)->entry_number;

        $this->assertSame($reversal->entry_number, $rows[$original]['reversal_pair']);
        $this->assertSame($original, $rows[$reversal->entry_number]['reversal_pair']);
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

    public function test_one_settlement_credit_matches_several_qris_sales_across_month_end(): void
    {
        $a = $this->bankEntry('2019-05-30', 100000.50, '4-1000');
        $b = $this->bankEntry('2019-05-31', 200000, '4-1000');
        $c = $this->bankEntry('2019-06-01', 50000, '4-1000');
        $refund = $this->bankEntry('2019-06-01', -50000, '6-1003');
        // Mutasi Mei yang sudah cocok menjadikan Mei awal rekonsiliasi.
        $this->postJson(self::URL.'/lines/'.$this->line('2019-05-04', 'TRSF CUST', 500000).'/match', [
            'journal_item_id' => $this->bankEntry('2019-05-03', 500000, '4-1000'),
        ])->assertOk();
        $content = "tanggal;keterangan;jumlah\n2019-06-02;MIDTRANS SETTLEMENT;350000.50\n";
        $this->post(self::URL.'/import', ['file' => $this->csv($content)], ['Accept' => 'application/json'])->assertCreated();
        $settlement = BankStatementLine::where('description', 'MIDTRANS SETTLEMENT')->value('id');
        $match = fn (array $ids) => $this->postJson(self::URL."/lines/{$settlement}/match", ['journal_item_ids' => $ids]);

        $match([$a, $b])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'totalnya sama'));
        $match([$a, $b, $c, $refund])->assertStatus(422);
        $match([$a, $b, $c])->assertOk()->assertJsonPath('data.journal_item_id', null);

        $children = BankStatementLine::where('parent_id', $settlement)->orderBy('journal_item_id')->get();
        $this->assertSame([$a, $b, $c], $children->pluck('journal_item_id')->all());
        $this->assertEquals(350000.50, $children->sum(fn ($l) => (float) $l->amount));

        // Mei: dua penjualan QRIS masih setoran dalam perjalanan; Juni: semuanya cocok.
        $may = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->assertSame([$a, $b], array_column($may['outstanding_ledger'], 'journal_item_id'));
        $this->putJson(self::URL.'/2019-05', ['statement_ending_balance' => round($may['book_balance'] - 300000.50, 2)])
            ->assertOk()->assertJsonPath('data.is_reconciled', true);
        $june = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data');
        $this->assertSame([$refund], array_column($june['outstanding_ledger'], 'journal_item_id'));
        $this->assertSame([], $june['unrecorded_bank']);
        $this->assertSame([$settlement], array_values(array_unique(array_column($june['lines'], 'parent_id'))));
        $this->putJson(self::URL.'/2019-06', ['statement_ending_balance' => round($june['book_balance'] + 50000, 2)])
            ->assertOk()->assertJsonPath('data.is_reconciled', true);

        // Induk gabungan tidak bisa dicocokkan, dihapus atau dibukukan lagi; impor ulang berkas yang sama dilewati.
        $match([$refund])->assertStatus(422);
        $this->deleteJson(self::URL."/lines/{$settlement}")->assertStatus(422);
        $this->postJson(self::URL."/lines/{$settlement}/post-adjustment")->assertStatus(422);
        $this->post(self::URL.'/import', ['file' => $this->csv($content)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.skipped', 1)->assertJsonPath('data.imported', 0);
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-06'])->assertOk()->assertJsonPath('data.matched', 0);

        // Melepas satu anak melepas seluruh gabungan.
        $this->postJson(self::URL."/lines/{$children[1]->id}/unmatch")->assertOk()->assertJsonPath('data.id', $settlement);
        $this->assertFalse(BankStatementLine::where('parent_id', $settlement)->exists());
        $this->assertFalse((bool) BankStatementLine::find($settlement)->is_split);
        $june = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data');
        $this->assertSame([$a, $b, $c, $refund], array_column($june['outstanding_ledger'], 'journal_item_id'));
        $match([$a, $b, $c])->assertOk();
    }

    public function test_group_match_refuses_an_item_already_taken(): void
    {
        $a = $this->bankEntry('2019-05-30', 100000, '4-1000');
        $b = $this->bankEntry('2019-05-31', 200000, '4-1000');
        $single = $this->line('2019-05-30', 'TRSF A', 100000);
        $group = $this->line('2019-06-01', 'SETORAN GABUNGAN', 300000);
        $this->postJson(self::URL."/lines/{$single}/match", ['journal_item_id' => $a])->assertOk();

        $this->postJson(self::URL."/lines/{$group}/match", ['journal_item_ids' => [$a, $b]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'mutasi lain'));
        $this->assertFalse(BankStatementLine::where('parent_id', $group)->exists());
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

    public function test_a_past_month_stays_reconciled_after_its_items_clear_next_month(): void
    {
        $this->bankEntry('2019-05-03', 500000, '4-1000');
        $late = $this->bankEntry('2019-05-30', 300000, '4-1000');
        $juneCharge = $this->bankEntry('2019-06-01', -6500, '6-1012');
        $this->line('2019-05-04', 'TRSF CUST', 500000);
        $mayCharge = $this->line('2019-05-31', 'BIAYA ADM', -6500);
        $juneDeposit = $this->line('2019-06-02', 'SETORAN 30 MEI', 300000);
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertOk()->assertJsonPath('data.matched', 1);

        $may = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->putJson(self::URL.'/2019-05', ['statement_ending_balance' => round($may['book_balance'] - 300000 - 6500, 2)])
            ->assertOk()->assertJsonPath('data.is_reconciled', true);

        // Dicocokkan di bulan Juni: setoran 30 Mei masuk rekening 2 Juni, biaya 31 Mei baru dibukukan 1 Juni.
        $this->postJson(self::URL."/lines/{$juneDeposit}/match", ['journal_item_id' => $late])->assertOk();
        $this->postJson(self::URL."/lines/{$mayCharge}/match", ['journal_item_id' => $juneCharge])->assertOk();

        $may = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->assertTrue($may['is_reconciled']);
        $this->assertEquals(300000, $may['deposits_in_transit']);
        $this->assertSame([$late], array_column($may['outstanding_ledger'], 'journal_item_id'));
        $this->assertEquals(6500, $may['unrecorded_debits']);
        $this->assertSame([$mayCharge], array_column($may['unrecorded_bank'], 'id'));

        $june = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data');
        $this->assertSame([], $june['outstanding_ledger']);
        $this->assertSame([], $june['unrecorded_bank']);
        $this->putJson(self::URL.'/2019-06', ['statement_ending_balance' => $june['book_balance']])
            ->assertOk()->assertJsonPath('data.is_reconciled', true);
    }

    public function test_opening_balance_lines_cannot_be_matched(): void
    {
        $opening = $this->bankEntry('2019-05-01', 500000, '3-1000', 'ACCOUNT_OPENING');
        $lineId = $this->line('2019-05-04', 'SALDO', 500000);

        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $opening])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'saldo awal'));
    }

    public function test_auto_match_skips_ambiguous_candidates_and_respects_the_three_day_window(): void
    {
        $this->bankEntry('2019-05-03', 400000, '4-1000');
        $this->bankEntry('2019-05-05', 400000, '4-1000');
        $threeDays = $this->bankEntry('2019-05-10', 150000, '4-1000');
        $this->bankEntry('2019-05-20', 250000, '4-1000');
        $ambiguous = $this->line('2019-05-04', 'DUA KANDIDAT', 400000);
        $this->line('2019-05-13', 'TIGA HARI', 150000);
        $fourDays = $this->line('2019-05-24', 'EMPAT HARI', 250000);

        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertOk()->assertJsonPath('data.matched', 1);

        $this->assertSame([$threeDays], BankStatementLine::whereNotNull('journal_item_id')->pluck('journal_item_id')->all());
        $this->assertNull(BankStatementLine::find($ambiguous)->journal_item_id);
        $this->assertNull(BankStatementLine::find($fourDays)->journal_item_id);
    }

    public function test_csv_rows_must_have_the_header_column_count_and_a_bounded_amount(): void
    {
        $before = BankStatementLine::count();

        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-04,PAY 100, 200,500000\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Baris 2: jumlah kolom'));
        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-04,KURANG\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Baris 2: jumlah kolom'));
        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-04,OK,1\n2019-05-04,BESAR,10000000001\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Baris 3'));
        $this->assertSame($before, BankStatementLine::count());

        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-04,\"PAY 100, 200\",500000\n")], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 1);
        $this->assertEquals(500000, BankStatementLine::where('description', 'PAY 100, 200')->value('amount'));
    }

    public function test_csv_accepts_a_bom_and_short_dates_and_imports_only_surplus_copies(): void
    {
        $this->post(self::URL.'/import', ['file' => $this->csv("\xEF\xBB\xBFTanggal;Keterangan;Jumlah\n4/5/2019;KEMBAR;1000\n")], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 1);
        $this->assertSame('2019-05-04', BankStatementLine::where('description', 'KEMBAR')->first()->statement_date->toDateString());

        // Berkas berisi dua baris kembar, satu sudah tersimpan → hanya salinan kedua yang diimpor.
        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal;keterangan;jumlah\n2019-05-04;KEMBAR;1000\n2019-05-04;KEMBAR;1000\n")], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 1)->assertJsonPath('data.skipped', 1);
        $this->assertSame(2, BankStatementLine::where('description', 'KEMBAR')->count());
    }

    public function test_roles_without_bank_reconciliation_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL.'?period=2019-05')->assertForbidden();
        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'X', 'amount' => 1])->assertForbidden();
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertForbidden();
    }
}
