<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Saldo awal akun yang tidak punya buku pembantu, dibukukan sekali. Piutang, persediaan, hutang & DP
 * berasal dari dokumen sumbernya; selisihnya menjadi Modal Disetor (3-1000).
 */
class OpeningBalanceService
{
    public const REFERENCE_TYPE = 'ACCOUNT_OPENING';

    public const ACCOUNTS = ['1-1000', '1-1001', '1-3000', '1-3999', '3-2000'];

    public const CAPITAL = '3-1000';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function current(): ?JournalEntry
    {
        return JournalEntry::where('reference_type', self::REFERENCE_TYPE)->first();
    }

    /**
     * @param  array<string, float|int|string|null>  $balances  saldo di sisi normal akun; 3-2000 boleh negatif
     */
    public function post(string $date, array $balances): JournalEntry
    {
        return DB::transaction(function () use ($date, $balances) {
            // Kunci baris akun modal agar dua permintaan bersamaan tidak lolos pemeriksaan "belum ada" sekaligus.
            Account::where('account_code', self::CAPITAL)->lockForUpdate()->first();

            if (JournalEntry::where('reference_type', self::REFERENCE_TYPE)->lockForUpdate()->exists()) {
                throw new PosRuleException('Saldo awal akun sudah pernah dibukukan. Koreksi lewat jurnal penyesuaian.');
            }

            $normal = Account::whereIn('account_code', self::ACCOUNTS)->pluck('normal_balance', 'account_code');
            $draft = new JournalDraft();
            $capital = 0.0;
            foreach (self::ACCOUNTS as $code) {
                $amount = round((float) ($balances[$code] ?? 0), 2);
                if ($amount == 0.0) {
                    continue;
                }
                $onDebit = ($normal[$code] === 'DEBIT') === ($amount > 0);
                $onDebit
                    ? $draft->debit($code, abs($amount), 'Saldo awal')
                    : $draft->credit($code, abs($amount), 'Saldo awal');
                $capital += $onDebit ? abs($amount) : -abs($amount);
            }

            if ($draft->isEmpty()) {
                throw new PosRuleException('Isi minimal satu saldo awal.');
            }

            $capital = round($capital, 2);
            if ($capital > 0) {
                $draft->credit(self::CAPITAL, $capital, 'Modal awal pemilik (penyeimbang saldo awal)');
            } elseif ($capital < 0) {
                $draft->debit(self::CAPITAL, -$capital, 'Penyesuaian modal awal (penyeimbang saldo awal)');
            }

            return $draft->post($this->engine, self::REFERENCE_TYPE, 'SALDO-AWAL', 'Saldo awal akun kas, bank, aset tetap & laba ditahan', $date);
        });
    }
}
