<?php

namespace App\Services;

use App\Models\Account;
use App\Models\JournalEntry;

/**
 * Menyusun baris jurnal berdasarkan kode akun, lalu membukukannya lewat AccountingEngine
 * (yang menolak jurnal tidak seimbang). Baris bernilai nol dilewati.
 */
class JournalDraft
{
    /** @var array<int, array{code: string, debit: float, credit: float, note: string}> */
    private array $lines = [];

    public function debit(string $code, float $amount, string $note): self
    {
        return $this->add($code, $amount, 0.0, $note);
    }

    public function credit(string $code, float $amount, string $note): self
    {
        return $this->add($code, 0.0, $amount, $note);
    }

    public function post(AccountingEngine $engine, string $referenceType, string $referenceId, string $description, ?string $date = null): JournalEntry
    {
        $codes = array_unique(array_column($this->lines, 'code'));
        $accountIds = Account::whereIn('account_code', $codes)->pluck('id', 'account_code');

        $items = array_map(function (array $line) use ($accountIds) {
            if (! isset($accountIds[$line['code']])) {
                throw new \RuntimeException("Akun {$line['code']} belum ada di bagan akun (COA).");
            }

            return [
                'account_id' => $accountIds[$line['code']],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'note' => $line['note'],
            ];
        }, $this->lines);

        return $engine->createEntry($referenceType, $referenceId, $description, $items, $date, 3);
    }

    private function add(string $code, float $debit, float $credit, string $note): self
    {
        $debit = round($debit, 2);
        $credit = round($credit, 2);
        if ($debit > 0 || $credit > 0) {
            $this->lines[] = compact('code', 'debit', 'credit', 'note');
        }

        return $this;
    }
}
