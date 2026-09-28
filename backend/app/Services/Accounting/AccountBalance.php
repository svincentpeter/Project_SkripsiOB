<?php

namespace App\Services\Accounting;

use App\Models\Account;

/**
 * Jumlah debit & kredit satu akun dalam suatu rentang tanggal.
 */
final class AccountBalance
{
    public function __construct(
        public readonly Account $account,
        public readonly float $debit,
        public readonly float $credit,
    ) {
    }

    /** Saldo bila dibaca dari sisi DEBIT atau CREDIT (positif = saldo ada di sisi itu). */
    public function signed(string $side): float
    {
        return round($side === 'DEBIT' ? $this->debit - $this->credit : $this->credit - $this->debit, 2);
    }

    /** Saldo di sisi normal akun; negatif bila saldonya ada di sisi lawan. */
    public function net(): float
    {
        return $this->signed($this->account->normal_balance);
    }
}
