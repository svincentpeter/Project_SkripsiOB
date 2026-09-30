<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Laporan arus kas metode langsung. Setiap jurnal yang menyentuh kas laci/bank membagi baris non-kasnya
 * (kredit − debit) ke kelompok arus kas, sehingga total kelompok selalu sama dengan perubahan kas.
 *
 * Jurnal saldo awal akun (ACCOUNT_OPENING) bukan arus kas: aset tetap dan modal awalnya tidak
 * dikelompokkan sebagai investasi/pendanaan. Bila tanggalnya jatuh di dalam periode, kas awalnya
 * ditambahkan ke saldo kas awal agar saldo awal + perubahan kas tetap sama dengan saldo akhir.
 */
class CashFlowReport
{
    public const CASH_ACCOUNTS = ['1-1000', '1-1001'];

    public function build(?string $from, string $to): array
    {
        $cashIds = Account::whereIn('account_code', self::CASH_ACCOUNTS)->pluck('id')->map(fn ($id) => (int) $id)->all();
        $buckets = array_fill_keys(['customers', 'suppliers', 'expenses', 'other_operating', 'fixed_assets', 'equity'], 0.0);

        JournalEntry::with('items.account')
            ->where('status', 'POSTED')
            ->when($from !== null, fn ($q) => $q->where('entry_date', '>=', $from))
            ->where('entry_date', '<=', $to)
            ->where(fn ($q) => $q->whereNull('reference_type')->orWhere('reference_type', '!=', OpeningBalanceService::REFERENCE_TYPE))
            ->whereHas('items', fn ($q) => $q->whereIn('account_id', $cashIds))
            ->chunkById(200, function ($entries) use (&$buckets, $cashIds) {
                foreach ($entries as $entry) {
                    foreach ($entry->items as $item) {
                        if (! in_array((int) $item->account_id, $cashIds, true)) {
                            $buckets[self::bucket($item->account)] += (float) $item->credit - (float) $item->debit;
                        }
                    }
                }
            });

        $buckets = array_map(fn (float $v) => round($v, 2), $buckets);
        $operating = round($buckets['customers'] + $buckets['suppliers'] + $buckets['expenses'] + $buckets['other_operating'], 2);
        $netChange = round($operating + $buckets['fixed_assets'] + $buckets['equity'], 2);

        $beginning = $from === null ? 0.0 : round(array_sum(self::cashBalances(Carbon::parse($from)->subDay()->toDateString())), 2);
        $beginning = round($beginning + self::openingCashWithin($from, $to, $cashIds), 2);
        $ending = self::cashBalances($to);
        $endingTotal = round(array_sum($ending), 2);

        return [
            'period' => ['start_date' => $from, 'end_date' => $to],
            'operating' => [
                'customers' => $buckets['customers'],
                'suppliers' => $buckets['suppliers'],
                'expenses' => $buckets['expenses'],
                'other' => $buckets['other_operating'],
                'net' => $operating,
            ],
            'investing' => ['fixed_assets' => $buckets['fixed_assets'], 'net' => $buckets['fixed_assets']],
            'financing' => ['equity' => $buckets['equity'], 'net' => $buckets['equity']],
            'net_change' => $netChange,
            'beginning_cash' => $beginning,
            'ending_cash' => $endingTotal,
            'ending_cash_drawer' => $ending['1-1000'],
            'ending_bank' => $ending['1-1001'],
            'is_reconciled' => abs($beginning + $netChange - $endingTotal) < 0.005,
        ];
    }

    /**
     * @return array{'1-1000': float, '1-1001': float}
     */
    public static function cashBalances(string $asOf): array
    {
        $balances = ['1-1000' => 0.0, '1-1001' => 0.0];
        foreach (LedgerBalances::forRange(null, $asOf) as $b) {
            if (array_key_exists($b->account->account_code, $balances)) {
                $balances[$b->account->account_code] = $b->signed('DEBIT');
            }
        }

        return $balances;
    }

    /**
     * Kas laci + bank (debit − kredit) dari jurnal saldo awal akun yang bertanggal di dalam periode.
     *
     * @param  list<int>  $cashIds
     */
    private static function openingCashWithin(?string $from, string $to, array $cashIds): float
    {
        return (float) JournalItem::query()
            ->whereIn('account_id', $cashIds)
            ->whereHas('journalEntry', fn ($q) => $q
                ->where('status', 'POSTED')
                ->where('reference_type', OpeningBalanceService::REFERENCE_TYPE)
                ->when($from !== null, fn ($q) => $q->where('entry_date', '>=', $from))
                ->where('entry_date', '<=', $to))
            ->sum(DB::raw('debit - credit'));
    }

    private static function bucket(Account $account): string
    {
        $code = $account->account_code;

        return match (true) {
            // Bunga bank = arus kas operasi lain; bayar di muka & pelunasan akrual = pembayaran beban (SP4).
            $code === '4-3000' => 'other_operating',
            in_array($code, ['1-1100', '2-1100'], true) => 'expenses',
            $account->account_type === 'REVENUE', in_array($code, ['1-1002', '2-1004'], true) => 'customers',
            str_starts_with($code, '5-'), in_array($code, ['1-2000', '2-1000'], true) => 'suppliers',
            $account->account_type === 'EXPENSE' => 'expenses',
            str_starts_with($code, '1-3') => 'fixed_assets',
            $account->account_type === 'EQUITY' => 'equity',
            default => 'other_operating',
        };
    }
}
