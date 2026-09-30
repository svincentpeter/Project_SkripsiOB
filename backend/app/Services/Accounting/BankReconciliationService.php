<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\BankReconciliation;
use App\Models\BankStatementLine;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Rekonsiliasi Bank BCA (1-1001): mutasi rekening koran dicocokkan 1:1 dengan baris jurnal bank.
 * Saldo rekening koran + setoran dalam perjalanan − pembayaran belum dikliring
 *   = saldo buku + penerimaan bank belum dicatat − pengeluaran bank belum dicatat.
 * Baris jurnal sebelum bulan mutasi rekening koran pertama dianggap sudah cocok (cut-over).
 */
class BankReconciliationService
{
    public const BANK = '1-1001';
    public const CHARGE_ACCOUNT = '6-1012';
    public const INTEREST_ACCOUNT = '4-3000';
    public const REFERENCE_TYPE = 'BANK_RECON_ADJUSTMENT';

    private const MAX_ROWS = 1000;

    /** Percobaan ulang saat deadlock/lock wait timeout (kunci celah indeks antarimpor/pencocokan, nomor JRN). */
    private const ATTEMPTS = 3;

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{statement_date: string, description: string, amount: float|int|string}  $data
     */
    public function addLine(array $data, User $user, string $source = 'MANUAL'): BankStatementLine
    {
        return BankStatementLine::create([
            'statement_date' => $data['statement_date'],
            'description' => $data['description'],
            'amount' => round((float) $data['amount'], 2),
            'source' => $source,
            'created_by' => $user->id,
            'branch_id' => 3,
        ]);
    }

    /**
     * Impor CSV (semua baris atau tidak sama sekali). Baris yang sama persis dengan mutasi yang sudah
     * tersimpan sebelum impor dilewati, sehingga mengimpor ulang berkas yang sama aman.
     *
     * @return array{imported: int, skipped: int}
     */
    public function import(string $csv, User $user): array
    {
        $rows = self::parseCsv($csv);
        $dates = array_column($rows, 'statement_date');

        return DB::transaction(function () use ($rows, $dates, $user) {
            // Bacaan mengunci: dua impor berkas yang sama bersamaan saling menunggu, yang kedua melihat baris yang pertama.
            $existing = BankStatementLine::whereBetween('statement_date', [min($dates), max($dates)])->lockForUpdate()->get()
                ->mapWithKeys(fn (BankStatementLine $l) => [self::key($l->statement_date->toDateString(), $l->description, (float) $l->amount) => true]);

            $imported = 0;
            $skipped = 0;
            foreach ($rows as $row) {
                if (isset($existing[self::key($row['statement_date'], $row['description'], $row['amount'])])) {
                    $skipped++;
                    continue;
                }
                $this->addLine($row, $user, 'CSV');
                $imported++;
            }

            return ['imported' => $imported, 'skipped' => $skipped];
        }, self::ATTEMPTS);
    }

    /**
     * Header wajib: tanggal, keterangan, jumlah (urutan bebas, pemisah ; atau ,).
     *
     * @return list<array{statement_date: string, description: string, amount: float}>
     */
    public static function parseCsv(string $csv): array
    {
        $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv) ?? $csv;
        $lines = preg_split('/\r\n|\n|\r/', trim($csv)) ?: [];
        $header = (string) array_shift($lines);
        $delimiter = substr_count($header, ';') > substr_count($header, ',') ? ';' : ',';
        $index = array_flip(array_map(fn ($c) => strtolower(trim((string) $c)), str_getcsv($header, $delimiter)));
        foreach (['tanggal', 'keterangan', 'jumlah'] as $column) {
            if (! isset($index[$column])) {
                throw new PosRuleException("Kolom '{$column}' tidak ditemukan. Baris pertama wajib berisi kolom: tanggal, keterangan, jumlah.");
            }
        }

        $today = now()->toDateString();
        $rows = [];
        foreach ($lines as $i => $line) {
            if (trim($line) === '') {
                continue;
            }
            $rowNumber = $i + 2;
            if (count($rows) >= self::MAX_ROWS) {
                throw new PosRuleException('Maksimal '.self::MAX_ROWS.' baris mutasi per impor.');
            }

            $cells = str_getcsv($line, $delimiter);
            $date = self::parseDate(trim((string) ($cells[$index['tanggal']] ?? '')));
            $description = trim((string) ($cells[$index['keterangan']] ?? ''));
            $amount = str_replace(' ', '', trim((string) ($cells[$index['jumlah']] ?? '')));

            if ($date === null || $date > $today) {
                throw new PosRuleException("Baris {$rowNumber}: tanggal harus YYYY-MM-DD atau DD/MM/YYYY dan tidak boleh di masa depan.");
            }
            if ($description === '' || mb_strlen($description) > 255) {
                throw new PosRuleException("Baris {$rowNumber}: keterangan wajib diisi (maksimal 255 karakter).");
            }
            if (! preg_match('/^-?\d+(\.\d{1,2})?$/', $amount) || round((float) $amount, 2) == 0.0) {
                throw new PosRuleException("Baris {$rowNumber}: jumlah harus angka bukan nol tanpa pemisah ribuan (contoh 150000 atau -6500).");
            }

            $rows[] = ['statement_date' => $date, 'description' => $description, 'amount' => round((float) $amount, 2)];
        }

        if ($rows === []) {
            throw new PosRuleException('Berkas tidak berisi baris mutasi.');
        }

        return $rows;
    }

    public function match(int $lineId, int $journalItemId): BankStatementLine
    {
        return DB::transaction(function () use ($lineId, $journalItemId) {
            $line = BankStatementLine::lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id !== null) {
                throw new PosRuleException('Mutasi rekening koran ini sudah dicocokkan.');
            }

            // Kunci baris jurnal: pencocokan lain ke baris yang sama menunggu, lalu melihatnya sudah terpakai.
            $item = JournalItem::with(['account', 'journalEntry'])->lockForUpdate()->findOrFail($journalItemId);
            if ($item->account?->account_code !== self::BANK || $item->journalEntry?->status !== 'POSTED') {
                throw new PosRuleException('Hanya baris jurnal akun Bank BCA (1-1001) yang dapat dicocokkan.');
            }
            if ($this->itemTaken($item->id)) {
                throw new PosRuleException('Baris jurnal ini sudah dicocokkan dengan mutasi lain.');
            }
            if (abs(round((float) $item->debit - (float) $item->credit, 2) - (float) $line->amount) >= 0.005) {
                throw new PosRuleException('Nominal dan arah mutasi harus sama dengan baris jurnal (uang masuk = debit, uang keluar = kredit).');
            }

            $line->update(['journal_item_id' => $item->id]);

            return $line->fresh();
        }, self::ATTEMPTS);
    }

    public function unmatch(int $lineId): BankStatementLine
    {
        return DB::transaction(function () use ($lineId) {
            $line = BankStatementLine::with('journalItem.journalEntry')->lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id === null) {
                throw new PosRuleException('Mutasi ini belum dicocokkan.');
            }
            if ($line->journalItem?->journalEntry?->reference_type === self::REFERENCE_TYPE) {
                throw new PosRuleException('Mutasi ini sudah dibukukan sebagai biaya/bunga bank; koreksi lewat jurnal manual.');
            }

            $line->update(['journal_item_id' => null]);

            return $line->fresh();
        });
    }

    public function deleteLine(int $lineId): void
    {
        DB::transaction(function () use ($lineId) {
            $line = BankStatementLine::lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id !== null) {
                throw new PosRuleException('Lepas pencocokan mutasi ini sebelum menghapusnya.');
            }
            $line->delete();
        });
    }

    /** Mutasi yang belum dicatat di buku: keluar → biaya administrasi bank, masuk → bunga bank. */
    public function postAdjustment(int $lineId): JournalEntry
    {
        return DB::transaction(function () use ($lineId) {
            // Urutan kunci seperti AJP: S 3-2000 sebelum kunci nomor JRN, sehingga jurnal ini tidak bisa masuk ke
            // bulan yang sedang ditutup (tutup buku memegang X baris ini sepanjang transaksinya).
            Account::where('account_code', PeriodClosingService::RETAINED_EARNINGS)->sharedLock()->first();
            $lock = PeriodLock::lockDate(locking: true);
            $line = BankStatementLine::lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id !== null) {
                throw new PosRuleException('Mutasi ini sudah dicocokkan dengan jurnal.');
            }
            $date = $line->statement_date->toDateString();
            if ($lock !== null && $date <= $lock) {
                throw new PosRuleException("Periode sampai {$lock} sudah ditutup; mutasi bertanggal {$date} tidak dapat dibukukan. Catat lewat jurnal manual di periode terbuka.");
            }

            $amount = abs((float) $line->amount);
            $draft = new JournalDraft();
            if ((float) $line->amount > 0) {
                $draft->debit(self::BANK, $amount, $line->description)->credit(self::INTEREST_ACCOUNT, $amount, 'Bunga/jasa giro bank');
                $label = 'Bunga bank';
            } else {
                $draft->debit(self::CHARGE_ACCOUNT, $amount, 'Biaya administrasi bank')->credit(self::BANK, $amount, $line->description);
                $label = 'Biaya administrasi bank';
            }
            $entry = $draft->post($this->engine, self::REFERENCE_TYPE, 'REKON-'.$line->id, "{$label} dari rekening koran {$date}: {$line->description}", $date);

            $bankItem = $entry->items->first(fn (JournalItem $i) => $i->account->account_code === self::BANK);
            $line->update(['journal_item_id' => $bankItem->id]);

            return $entry;
        }, self::ATTEMPTS);
    }

    /** Cocokkan otomatis: nominal & arah sama, selisih tanggal ≤ 3 hari, dan hanya satu kandidat. */
    public function autoMatch(string $period): int
    {
        $end = self::endOf($period);

        return DB::transaction(function () use ($end) {
            $lines = BankStatementLine::whereNull('journal_item_id')->where('statement_date', '<=', $end)
                ->orderBy('statement_date')->orderBy('id')->lockForUpdate()->get();
            $candidates = $this->unmatchedLedgerItems(self::cutover() ?? $end, $end);
            $used = [];
            $matched = 0;

            foreach ($lines as $line) {
                $hits = $candidates->filter(fn ($c) => ! isset($used[$c->id])
                    && abs(round((float) $c->debit - (float) $c->credit, 2) - (float) $line->amount) < 0.005
                    && abs(Carbon::parse($c->entry_date)->diffInDays($line->statement_date, false)) <= 3);
                if ($hits->count() !== 1) {
                    continue;
                }
                $hit = $hits->first();
                $used[$hit->id] = true;
                // Kandidat dibaca tanpa kunci; klaim di bawah kunci baris jurnal seperti match().
                JournalItem::whereKey($hit->id)->lockForUpdate()->first();
                if (! $this->itemTaken($hit->id)) {
                    $line->update(['journal_item_id' => $hit->id]);
                    $matched++;
                }
            }

            return $matched;
        }, self::ATTEMPTS);
    }

    public function setStatementBalance(string $period, float $balance, User $user): BankReconciliation
    {
        // upsert (INSERT … ON DUPLICATE KEY UPDATE): dua simpan pertama bersamaan tidak bentrok di indeks unik period.
        BankReconciliation::upsert(
            [['period' => $period, 'statement_ending_balance' => round($balance, 2), 'updated_by' => $user->id, 'branch_id' => 3]],
            ['period'],
            ['statement_ending_balance', 'updated_by']
        );

        return BankReconciliation::where('period', $period)->firstOrFail();
    }

    public function report(string $period): array
    {
        $start = $period.'-01';
        $end = self::endOf($period);
        $from = self::cutover() ?? $start;

        $lines = BankStatementLine::with('journalItem.journalEntry')
            ->whereBetween('statement_date', [$start, $end])
            ->orderBy('statement_date')->orderBy('id')->get();
        $unrecorded = BankStatementLine::whereNull('journal_item_id')->where('statement_date', '<=', $end)
            ->orderBy('statement_date')->orderBy('id')->get();
        $outstanding = $this->unmatchedLedgerItems($from, $end);

        $statement = BankReconciliation::where('period', $period)->value('statement_ending_balance');
        $book = CashFlowReport::cashBalances($end)[self::BANK];

        $depositsInTransit = round($outstanding->sum(fn ($i) => (float) $i->debit), 2);
        $outstandingPayments = round($outstanding->sum(fn ($i) => (float) $i->credit), 2);
        $unrecordedCredits = round($unrecorded->filter(fn ($l) => (float) $l->amount > 0)->sum(fn ($l) => (float) $l->amount), 2);
        $unrecordedDebits = round(-$unrecorded->filter(fn ($l) => (float) $l->amount < 0)->sum(fn ($l) => (float) $l->amount), 2);

        $adjustedBook = round($book + $unrecordedCredits - $unrecordedDebits, 2);
        $adjustedBank = $statement === null ? null : round((float) $statement + $depositsInTransit - $outstandingPayments, 2);
        $difference = $adjustedBank === null ? null : round($adjustedBank - $adjustedBook, 2);

        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => $end,
            'cutover_date' => $from,
            'statement_ending_balance' => $statement === null ? null : (float) $statement,
            'book_balance' => $book,
            'lines' => $lines->map(fn (BankStatementLine $l) => $l->toApiArray())->values()->all(),
            'outstanding_ledger' => $outstanding->map(fn ($i) => [
                'journal_item_id' => $i->id,
                'entry_number' => $i->entry_number,
                'entry_date' => Carbon::parse($i->entry_date)->toDateString(),
                'reference_type' => $i->reference_type,
                'description' => $i->description,
                'debit' => (float) $i->debit,
                'credit' => (float) $i->credit,
            ])->values()->all(),
            'unrecorded_bank' => $unrecorded->map(fn (BankStatementLine $l) => $l->toApiArray())->values()->all(),
            'deposits_in_transit' => $depositsInTransit,
            'outstanding_payments' => $outstandingPayments,
            'unrecorded_credits' => $unrecordedCredits,
            'unrecorded_debits' => $unrecordedDebits,
            'adjusted_bank_balance' => $adjustedBank,
            'adjusted_book_balance' => $adjustedBook,
            'difference' => $difference,
            'is_reconciled' => $difference !== null && abs($difference) < 0.005,
        ];
    }

    /** Baris jurnal 1-1001 yang belum dicocokkan (tanpa jurnal saldo awal akun). */
    private function unmatchedLedgerItems(string $from, string $to): Collection
    {
        $bankId = Account::where('account_code', self::BANK)->value('id');

        return JournalItem::query()
            ->join('journal_entries as e', 'e.id', '=', 'journal_items.journal_entry_id')
            ->where('journal_items.account_id', $bankId)
            ->where('e.status', 'POSTED')
            ->where('e.reference_type', '!=', OpeningBalanceService::REFERENCE_TYPE)
            ->whereBetween('e.entry_date', [$from, $to])
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('bank_statement_lines as b')->whereColumn('b.journal_item_id', 'journal_items.id'))
            ->orderBy('e.entry_date')->orderBy('journal_items.id')
            ->get(['journal_items.id', 'journal_items.debit', 'journal_items.credit', 'e.entry_number', 'e.entry_date', 'e.reference_type', 'e.description']);
    }

    /** Bacaan mengunci: apakah baris jurnal ini sudah dipakai mutasi lain (termasuk yang baru saja di-commit). */
    private function itemTaken(int $journalItemId): bool
    {
        return BankStatementLine::where('journal_item_id', $journalItemId)->lockForUpdate()->exists();
    }

    /** Awal bulan mutasi rekening koran pertama; null bila belum ada mutasi. */
    private static function cutover(): ?string
    {
        $first = BankStatementLine::min('statement_date');

        return $first ? Carbon::parse($first)->startOfMonth()->toDateString() : null;
    }

    private static function endOf(string $period): string
    {
        return Carbon::parse($period.'-01')->endOfMonth()->toDateString();
    }

    private static function key(string $date, string $description, float $amount): string
    {
        return $date.'|'.$description.'|'.number_format($amount, 2, '.', '');
    }

    private static function parseDate(string $value): ?string
    {
        foreach (['Y-m-d', 'd/m/Y', 'j/n/Y'] as $format) {
            $date = \DateTime::createFromFormat('!'.$format, $value);
            if ($date !== false && $date->format($format) === $value) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }
}
