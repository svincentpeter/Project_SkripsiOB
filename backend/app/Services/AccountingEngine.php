<?php

namespace App\Services;

use App\Exceptions\AccountingUnbalancedException;
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Services\Accounting\CashSessionService;
use App\Services\Accounting\PeriodLock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AccountingEngine
{
    /**
     * Akun kas fisik & rekening tanpa fasilitas cerukan: saldonya tidak boleh negatif (sign/limit check
     * pengendalian aplikasi SIA). Uang keluar melebihi saldo ditolak, termasuk bila jurnal bertanggal mundur
     * membuat saldo hari-hari sesudahnya negatif.
     */
    public const NON_NEGATIVE_ACCOUNTS = ['1-1000', '1-1001'];

    /**
     * Satu-satunya pintu pembukuan jurnal. Aturan: minimal dua baris bernilai, tanpa nominal negatif,
     * satu sisi per baris, debit = kredit sampai sen, tanggal di luar periode yang sudah ditutup, dan saldo
     * kas laci / bank tidak menjadi negatif (NON_NEGATIVE_ACCOUNTS).
     *
     * @param  array<int, array{account_id: int, debit?: float|int|string, credit?: float|int|string, note?: ?string}>  $items
     *
     * @throws AccountingUnbalancedException
     * @throws PosRuleException
     */
    public function createEntry(
        string $referenceType,
        string $referenceId,
        string $description,
        array $items,
        ?string $entryDate = null,
        int $branchId = 3,
        ?int $reversalOfId = null
    ): JournalEntry {
        $lines = self::normalizeLines($items);
        $totalDebit = round(array_sum(array_column($lines, 'debit')), 2);
        $totalCredit = round(array_sum(array_column($lines, 'credit')), 2);

        if (self::cents($totalDebit) !== self::cents($totalCredit)) {
            throw new AccountingUnbalancedException($totalDebit, $totalCredit);
        }

        $date = $entryDate !== null ? Carbon::parse($entryDate)->toDateString() : now()->toDateString();
        PeriodLock::assertOpen($date);

        return DB::transaction(function () use ($referenceType, $referenceId, $description, $lines, $date, $branchId, $reversalOfId, $totalDebit, $totalCredit) {
            $entry = JournalEntry::create([
                'entry_number' => DocumentNumber::next(JournalEntry::class, 'entry_number', 'JRN', $date),
                'entry_date' => $date,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'status' => 'POSTED',
                'branch_id' => $branchId,
                'created_by' => auth()->id(),
                'reversal_of_id' => $reversalOfId,
            ]);

            foreach ($lines as $line) {
                JournalItem::create($line + ['journal_entry_id' => $entry->id]);
            }

            self::assertNonNegative($lines, $date, $referenceType);

            return $entry->load('items.account');
        });
    }

    /**
     * Dicek setelah baris disisipkan: nomor JRN bulan ini sudah terkunci, dan saldo dibaca dengan current read
     * (sharedLock) sehingga jurnal yang baru di-commit ikut terhitung dan dua pengeluaran bersamaan tidak
     * sama-sama lolos. Hanya jurnal yang mengkredit akun terjaga yang diperiksa; uang masuk tidak bisa membuat minus.
     * Kas laci dinilai seperti CashSessionService::bookBalance (ledger + selisih shift PENDING). Jurnal persetujuan
     * shift dikecualikan: ia menyamakan 1-1000 dengan uang fisik yang dihitung (>= 0), bukan uang keluar.
     *
     * @param  list<array{account_id: int, debit: float, credit: float, note: ?string}>  $lines
     *
     * @throws PosRuleException
     */
    private static function assertNonNegative(array $lines, string $date, string $referenceType): void
    {
        if (! config('accounting.guard_negative_cash') || $referenceType === CashSessionService::REFERENCE_TYPE) {
            return;
        }

        $credited = array_unique(array_column(array_filter($lines, fn ($l) => $l['credit'] > 0), 'account_id'));
        if ($credited === []) {
            return;
        }

        $accounts = Account::whereIn('id', $credited)->whereIn('account_code', self::NON_NEGATIVE_ACCOUNTS)->get(['id', 'account_code', 'account_name']);
        foreach ($accounts as $account) {
            $daily = DB::table('journal_items as i')
                ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
                ->where('i.account_id', $account->id)
                ->where('e.status', 'POSTED')
                ->groupBy('e.entry_date')
                ->orderBy('e.entry_date')
                ->selectRaw('e.entry_date as d, SUM(i.debit - i.credit) as net')
                ->sharedLock()
                ->get();

            // ponytail: selisih PENDING ditambahkan ke semua hari; cukup selama shift disetujui tak lama setelah ditutup.
            $balance = $account->account_code === CashSessionService::CASH ? CashSessionService::pendingAdjustment() : 0;
            foreach ($daily as $row) {
                $balance = round($balance + (float) $row->net, 2);
                $day = Carbon::parse($row->d)->toDateString();
                if ($day >= $date && self::cents($balance) < 0) {
                    throw new PosRuleException(sprintf(
                        'Saldo %s %s tidak cukup: transaksi ini membuat saldo per %s menjadi Rp %s. Catat dulu uang masuknya atau kurangi nominal.',
                        $account->account_code,
                        $account->account_name,
                        Carbon::parse($day)->format('d/m/Y'),
                        number_format($balance, 0, ',', '.'),
                    ));
                }
            }
        }
    }

    /**
     * @return list<array{account_id: int, debit: float, credit: float, note: ?string}>
     */
    private static function normalizeLines(array $items): array
    {
        $lines = [];
        foreach ($items as $item) {
            $debit = round((float) ($item['debit'] ?? 0), 2);
            $credit = round((float) ($item['credit'] ?? 0), 2);
            if ($debit < 0 || $credit < 0) {
                throw new PosRuleException('Nominal baris jurnal tidak boleh negatif.');
            }
            if ($debit > 0 && $credit > 0) {
                throw new PosRuleException('Satu baris jurnal hanya boleh berisi debit atau kredit.');
            }
            if ($debit > 0 || $credit > 0) {
                $lines[] = ['account_id' => (int) $item['account_id'], 'debit' => $debit, 'credit' => $credit, 'note' => $item['note'] ?? null];
            }
        }

        if (count($lines) < 2) {
            throw new PosRuleException('Jurnal minimal berisi dua baris bernilai.');
        }

        return $lines;
    }

    private static function cents(float $amount): int
    {
        return (int) round($amount * 100);
    }
}
