<?php

namespace App\Services\Accounting;

use App\Models\Account;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Saldo seluruh akun COA dari jurnal POSTED dalam satu query ber-GROUP BY.
 */
final class LedgerBalances
{
    /** Jurnal penutup & pembaliknya; dikeluarkan dari laba rugi agar tutup buku tidak menghapus hasil periode. */
    public const CLOSING_TYPES = ['PERIOD_CLOSING', 'PERIOD_REOPEN'];

    /**
     * @return Collection<int, AccountBalance>
     */
    public static function forRange(?string $from, ?string $to, bool $excludeClosing = false): Collection
    {
        $sums = DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->where('e.status', 'POSTED')
            ->when($from !== null, fn ($q) => $q->where('e.entry_date', '>=', $from))
            ->when($to !== null, fn ($q) => $q->where('e.entry_date', '<=', $to))
            ->when($excludeClosing, fn ($q) => $q->whereNotIn('e.reference_type', self::CLOSING_TYPES))
            ->groupBy('i.account_id')
            ->selectRaw('i.account_id, SUM(i.debit) as debit, SUM(i.credit) as credit')
            ->get()
            ->keyBy('account_id');

        return Account::orderBy('account_code')->get()->map(fn (Account $account) => new AccountBalance(
            $account,
            round((float) ($sums->get($account->id)?->debit ?? 0), 2),
            round((float) ($sums->get($account->id)?->credit ?? 0), 2),
        ));
    }
}
