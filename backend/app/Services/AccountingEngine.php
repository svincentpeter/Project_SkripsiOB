<?php

namespace App\Services;

use App\Exceptions\AccountingUnbalancedException;
use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Services\Accounting\PeriodLock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AccountingEngine
{
    /**
     * Satu-satunya pintu pembukuan jurnal. Aturan: minimal dua baris bernilai, tanpa nominal negatif,
     * satu sisi per baris, debit = kredit sampai sen, dan tanggal di luar periode yang sudah ditutup.
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

            return $entry->load('items.account');
        });
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
