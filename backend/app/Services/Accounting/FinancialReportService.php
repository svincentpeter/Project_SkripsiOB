<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\JournalItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Laporan SAK EMKM dari jurnal POSTED. Akun dikelompokkan dari tipe & saldo normal di COA,
 * sehingga akun baru otomatis ikut tanpa mengubah kode ini.
 */
class FinancialReportService
{
    public function trialBalance(string $asOf): array
    {
        $rows = LedgerBalances::forRange(null, $asOf)->map(function (AccountBalance $b) {
            $debitSide = $b->signed('DEBIT');

            return [
                'account_code' => $b->account->account_code,
                'account_name' => $b->account->account_name,
                'account_type' => $b->account->account_type,
                'normal_balance' => $b->account->normal_balance,
                'debit' => $debitSide > 0 ? $debitSide : 0.0,
                'credit' => $debitSide < 0 ? -$debitSide : 0.0,
            ];
        })->values()->all();

        $totalDebit = round(array_sum(array_column($rows, 'debit')), 2);
        $totalCredit = round(array_sum(array_column($rows, 'credit')), 2);
        $difference = round(abs($totalDebit - $totalCredit), 2);

        return [
            'as_of' => $asOf,
            'accounts' => $rows,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'difference' => $difference,
            'is_balanced' => $difference < 0.005,
        ];
    }

    public function generalLedger(string $accountCode, ?string $from, ?string $to): array
    {
        $account = Account::where('account_code', $accountCode)->firstOrFail();
        $sign = $account->normal_balance === 'DEBIT' ? 1 : -1;

        $opening = 0.0;
        if ($from !== null) {
            $prior = self::postedItems($account->id)
                ->where('e.entry_date', '<', $from)
                ->selectRaw('COALESCE(SUM(journal_items.debit), 0) as d, COALESCE(SUM(journal_items.credit), 0) as c')
                ->first();
            $opening = round($sign * ((float) $prior->d - (float) $prior->c), 2);
        }

        $items = self::postedItems($account->id)
            ->when($from !== null, fn ($q) => $q->where('e.entry_date', '>=', $from))
            ->when($to !== null, fn ($q) => $q->where('e.entry_date', '<=', $to))
            ->orderBy('e.entry_date')->orderBy('e.id')->orderBy('journal_items.id')
            ->get([
                'journal_items.id', 'journal_items.debit', 'journal_items.credit', 'journal_items.note',
                'e.entry_number', 'e.entry_date', 'e.reference_type', 'e.reference_id', 'e.description',
            ]);

        $running = $opening;
        $totalDebit = 0.0;
        $totalCredit = 0.0;
        $mutations = [];
        foreach ($items as $item) {
            $debit = (float) $item->debit;
            $credit = (float) $item->credit;
            $totalDebit += $debit;
            $totalCredit += $credit;
            $running = round($running + $sign * ($debit - $credit), 2);
            $mutations[] = [
                'id' => $item->id,
                'entry_number' => $item->entry_number,
                'date' => Carbon::parse($item->entry_date)->toDateString(),
                'reference_type' => $item->reference_type,
                'reference_id' => $item->reference_id,
                'description' => $item->description,
                'note' => $item->note,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => $running,
            ];
        }

        return [
            'account' => [
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_type' => $account->account_type,
                'normal_balance' => $account->normal_balance,
            ],
            'start_date' => $from,
            'end_date' => $to,
            'opening_balance' => $opening,
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'ending_balance' => $running,
            'mutations' => $mutations,
        ];
    }

    public function incomeStatement(?string $from, string $to): array
    {
        $sections = ['revenue' => [], 'contra_revenue' => [], 'cost_of_sales' => [], 'operating_expenses' => [], 'other_income' => []];
        foreach (LedgerBalances::forRange($from, $to, excludeClosing: true) as $b) {
            $key = self::incomeSection($b->account);
            if ($key !== null && $b->net() != 0.0) {
                $sections[$key][] = self::line($b->account, $b->net());
            }
        }

        $revenue = self::section($sections['revenue']);
        $contra = self::section($sections['contra_revenue']);
        $cost = self::section($sections['cost_of_sales']);
        $opex = self::section($sections['operating_expenses']);
        $other = self::section($sections['other_income']);
        $netRevenue = round($revenue['total'] - $contra['total'], 2);
        $grossProfit = round($netRevenue - $cost['total'], 2);

        return [
            'revenue' => $revenue,
            'contra_revenue' => $contra,
            'net_revenue' => $netRevenue,
            'cost_of_sales' => $cost,
            'gross_profit' => $grossProfit,
            'operating_expenses' => $opex,
            'other_income' => $other,
            'net_income' => round($grossProfit - $opex['total'] + $other['total'], 2),
        ];
    }

    public function balanceSheet(string $asOf): array
    {
        $sections = ['current_assets' => [], 'fixed_assets' => [], 'liabilities' => [], 'equity' => []];
        $unclosedEarnings = 0.0;

        foreach (LedgerBalances::forRange(null, $asOf) as $b) {
            $type = $b->account->account_type;
            if ($type === 'REVENUE' || $type === 'EXPENSE') {
                $unclosedEarnings += $b->signed('CREDIT');
                continue;
            }
            $key = match ($type) {
                'ASSET' => str_starts_with($b->account->account_code, '1-3') ? 'fixed_assets' : 'current_assets',
                'LIABILITY' => 'liabilities',
                default => 'equity',
            };
            $sections[$key][] = self::line($b->account, $b->signed($type === 'ASSET' ? 'DEBIT' : 'CREDIT'));
        }
        $sections['equity'][] = ['code' => null, 'name' => 'Laba (Rugi) Periode Berjalan (belum ditutup)', 'amount' => round($unclosedEarnings, 2)];

        $current = self::section($sections['current_assets']);
        $fixed = self::section($sections['fixed_assets']);
        $liabilities = self::section($sections['liabilities']);
        $equity = self::section($sections['equity']);
        $totalAssets = round($current['total'] + $fixed['total'], 2);
        $totalLiabilitiesAndEquity = round($liabilities['total'] + $equity['total'], 2);
        $difference = round($totalAssets - $totalLiabilitiesAndEquity, 2);

        return [
            'as_of' => $asOf,
            'current_assets' => $current,
            'fixed_assets' => $fixed,
            'total_assets' => $totalAssets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'total_liabilities_and_equity' => $totalLiabilitiesAndEquity,
            'difference' => $difference,
            'is_balanced' => abs($difference) < 0.005,
        ];
    }

    public function equityChanges(?string $from, string $to): array
    {
        $opening = $from === null
            ? 0.0
            : $this->balanceSheet(Carbon::parse($from)->subDay()->toDateString())['equity']['total'];

        // Ekuitas bersaldo normal debit (Prive 3-3000) disajikan terpisah sebagai pengurang ekuitas (SAK EMKM).
        $contributions = 0.0;
        $drawings = 0.0;
        foreach (LedgerBalances::forRange($from, $to, excludeClosing: true) as $b) {
            if ($b->account->account_type !== 'EQUITY') {
                continue;
            }
            if ($b->account->normal_balance === 'DEBIT') {
                $drawings += $b->signed('DEBIT');
            } else {
                $contributions += $b->signed('CREDIT');
            }
        }
        $contributions = round($contributions, 2);
        $drawings = round($drawings, 2);
        $netIncome = $this->incomeStatement($from, $to)['net_income'];
        $closing = $this->balanceSheet($to)['equity']['total'];

        return [
            'opening_equity' => $opening,
            'owner_contributions' => $contributions,
            'owner_drawings' => $drawings,
            'net_income' => $netIncome,
            'closing_equity' => $closing,
            'difference' => round($closing - $opening - $contributions + $drawings - $netIncome, 2),
        ];
    }

    public function financialStatements(?string $from, string $to): array
    {
        return [
            'period' => ['start_date' => $from, 'end_date' => $to],
            'income_statement' => $this->incomeStatement($from, $to),
            'balance_sheet' => $this->balanceSheet($to),
            'equity_changes' => $this->equityChanges($from, $to),
        ];
    }

    private static function postedItems(int $accountId): Builder
    {
        return JournalItem::query()
            ->join('journal_entries as e', 'e.id', '=', 'journal_items.journal_entry_id')
            ->where('journal_items.account_id', $accountId)
            ->where('e.status', 'POSTED');
    }

    /**
     * Bagian laba rugi sebuah akun; dipakai juga oleh rekap harian agar angkanya sama dengan Laba Rugi.
     * 4-3xxx (bunga/jasa giro) bukan pendapatan usaha: disajikan sesudah beban operasional, di luar laba kotor.
     */
    public static function incomeSection(Account $account): ?string
    {
        return match ($account->account_type) {
            'REVENUE' => match (true) {
                $account->normal_balance !== 'CREDIT' => 'contra_revenue',
                str_starts_with($account->account_code, '4-3') => 'other_income',
                default => 'revenue',
            },
            'EXPENSE' => str_starts_with($account->account_code, '5-') ? 'cost_of_sales' : 'operating_expenses',
            default => null,
        };
    }

    /** @return array{code: string, name: string, amount: float} */
    private static function line(Account $account, float $amount): array
    {
        return ['code' => $account->account_code, 'name' => $account->account_name, 'amount' => round($amount, 2)];
    }

    /**
     * @param  list<array{amount: float}>  $lines
     * @return array{lines: list<array>, total: float}
     */
    private static function section(array $lines): array
    {
        return ['lines' => $lines, 'total' => round(array_sum(array_column($lines, 'amount')), 2)];
    }
}
