<?php

namespace App\Services;

use App\Exceptions\AccountingUnbalancedException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use Illuminate\Support\Facades\DB;

class AccountingEngine
{
    /**
     * Create double-entry journal entry with strict Debit == Credit balance check.
     *
     * @param string $referenceType
     * @param string $referenceId
     * @param string $description
     * @param array $items Array of ['account_id' => int, 'debit' => float, 'credit' => float, 'note' => ?string]
     * @param string|null $entryDate
     * @param int $branchId
     * @return JournalEntry
     * @throws AccountingUnbalancedException
     */
    public function createEntry(
        string $referenceType,
        string $referenceId,
        string $description,
        array $items,
        ?string $entryDate = null,
        int $branchId = 3
    ): JournalEntry {
        $totalDebit = 0.00;
        $totalCredit = 0.00;

        foreach ($items as $item) {
            $totalDebit += (float) ($item['debit'] ?? 0);
            $totalCredit += (float) ($item['credit'] ?? 0);
        }

        $totalDebit = round($totalDebit, 2);
        $totalCredit = round($totalCredit, 2);

        // Strict balance check with 0.01 tolerance
        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new AccountingUnbalancedException($totalDebit, $totalCredit);
        }

        return DB::transaction(function () use ($referenceType, $referenceId, $description, $items, $entryDate, $branchId, $totalDebit, $totalCredit) {
            $date = $entryDate ?: now()->toDateString();
            $prefix = 'JRN-' . date('Ym', strtotime($date)) . '-';

            // Sequential numbering
            $lastEntry = JournalEntry::where('entry_number', 'like', $prefix . '%')
                ->orderBy('entry_number', 'desc')
                ->first();

            $seq = 1;
            if ($lastEntry) {
                $parts = explode('-', $lastEntry->entry_number);
                $seq = (int) end($parts) + 1;
            }

            $entryNumber = $prefix . str_pad((string) $seq, 4, '0', STR_PAD_LEFT);

            $journalEntry = JournalEntry::create([
                'entry_number' => $entryNumber,
                'entry_date' => $date,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'status' => 'POSTED',
                'branch_id' => $branchId,
            ]);

            foreach ($items as $item) {
                if (($item['debit'] ?? 0) > 0 || ($item['credit'] ?? 0) > 0) {
                    JournalItem::create([
                        'journal_entry_id' => $journalEntry->id,
                        'account_id' => $item['account_id'],
                        'debit' => round((float) ($item['debit'] ?? 0), 2),
                        'credit' => round((float) ($item['credit'] ?? 0), 2),
                        'note' => $item['note'] ?? null,
                    ]);
                }
            }

            return $journalEntry->load(['items.account']);
        });
    }

    /**
     * Get General Ledger with running balance for a specific account.
     */
    public function getGeneralLedger(string $accountCode, ?string $startDate = null, ?string $endDate = null): array
    {
        $account = Account::where('account_code', $accountCode)->firstOrFail();

        $query = JournalItem::with('journalEntry')
            ->where('account_id', $account->id)
            ->whereHas('journalEntry', function ($q) use ($startDate, $endDate) {
                $q->where('status', 'POSTED');
                if ($startDate) {
                    $q->where('entry_date', '>=', $startDate);
                }
                if ($endDate) {
                    $q->where('entry_date', '<=', $endDate);
                }
            })
            ->join('journal_entries', 'journal_items.journal_entry_id', '=', 'journal_entries.id')
            ->orderBy('journal_entries.entry_date', 'asc')
            ->orderBy('journal_entries.id', 'asc')
            ->select('journal_items.*');

        $items = $query->get();

        $runningBalance = 0.00;
        $mutations = [];
        $totalDebit = 0.00;
        $totalCredit = 0.00;

        foreach ($items as $item) {
            $debit = (float) $item->debit;
            $credit = (float) $item->credit;
            $totalDebit += $debit;
            $totalCredit += $credit;

            if ($account->normal_balance === 'DEBIT') {
                $runningBalance += ($debit - $credit);
            } else {
                $runningBalance += ($credit - $debit);
            }

            $mutations[] = [
                'id' => $item->id,
                'entry_number' => $item->journalEntry->entry_number ?? '-',
                'date' => $item->journalEntry->entry_date ?? '-',
                'description' => $item->journalEntry->description ?? '-',
                'note' => $item->note,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => round($runningBalance, 2),
            ];
        }

        return [
            'account' => $account,
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'ending_balance' => round($runningBalance, 2),
            'mutations' => $mutations,
        ];
    }

    /**
     * Compile Trial Balance across all accounts.
     */
    public function getTrialBalance(): array
    {
        $accounts = Account::orderBy('account_code')->get();

        $rows = [];
        $grandDebit = 0.00;
        $grandCredit = 0.00;

        foreach ($accounts as $account) {
            $sumDebit = (float) JournalItem::where('account_id', $account->id)
                ->whereHas('journalEntry', fn($q) => $q->where('status', 'POSTED'))
                ->sum('debit');

            $sumCredit = (float) JournalItem::where('account_id', $account->id)
                ->whereHas('journalEntry', fn($q) => $q->where('status', 'POSTED'))
                ->sum('credit');

            $debitBalance = 0.00;
            $creditBalance = 0.00;

            if ($account->normal_balance === 'DEBIT') {
                $net = $sumDebit - $sumCredit;
                if ($net >= 0) {
                    $debitBalance = $net;
                } else {
                    $creditBalance = abs($net);
                }
            } else {
                $net = $sumCredit - $sumDebit;
                if ($net >= 0) {
                    $creditBalance = $net;
                } else {
                    $debitBalance = abs($net);
                }
            }

            $grandDebit += $debitBalance;
            $grandCredit += $creditBalance;

            $rows[] = [
                'id' => $account->id,
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_type' => $account->account_type,
                'normal_balance' => $account->normal_balance,
                'debit' => round($debitBalance, 2),
                'credit' => round($creditBalance, 2),
            ];
        }

        $diff = abs($grandDebit - $grandCredit);

        return [
            'accounts' => $rows,
            'total_debit' => round($grandDebit, 2),
            'total_credit' => round($grandCredit, 2),
            'difference' => round($diff, 2),
            'is_balanced' => $diff < 0.01,
        ];
    }

    /**
     * Generate SAK EMKM Financial Statements: Laba Rugi, Posisi Keuangan (Neraca), CALK.
     */
    public function getFinancialStatements(): array
    {
        $tb = $this->getTrialBalance();
        $accountMap = [];
        foreach ($tb['accounts'] as $row) {
            $accountMap[$row['account_code']] = $row;
        }

        // Helper to get net balance for an account code
        $getBalance = function ($code) use ($accountMap) {
            if (!isset($accountMap[$code])) return 0.00;
            $row = $accountMap[$code];
            return $row['normal_balance'] === 'DEBIT' ? $row['debit'] : $row['credit'];
        };

        // 1. Income Statement (Laba Rugi) SAK EMKM
        $salesBan = $getBalance('4-1000');
        $salesService = $getBalance('4-1001');
        $salesDiscount = $getBalance('4-9000');
        $netSales = ($salesBan + $salesService) - $salesDiscount;

        $cogs = $getBalance('5-1000');
        $grossProfit = $netSales - $cogs;

        // Operating Expenses
        $expenseCodes = [
            '6-1000' => 'Beban Gaji & Uang Makan Karyawan',
            '6-1001' => 'Beban Listrik, Air & Internet',
            '6-1003' => 'Beban Sewa Bangunan Toko',
            '6-1004' => 'Beban Transportasi & Pengiriman Ban',
            '6-1005' => 'Beban Perlengkapan & ATK Toko',
            '6-1006' => 'Beban Perawatan Mesin Spooring & Balancing',
            '6-1007' => 'Beban Konsumsi & Lembur Karyawan',
            '6-1008' => 'Beban Pajak & Retribusi Daerah',
        ];

        $expenseItems = [];
        $totalExpenses = 0.00;
        foreach ($expenseCodes as $code => $name) {
            $amt = $getBalance($code);
            $totalExpenses += $amt;
            $expenseItems[] = [
                'code' => $code,
                'name' => $name,
                'amount' => $amt,
            ];
        }

        $netIncome = $grossProfit - $totalExpenses;

        $incomeStatement = [
            'revenue' => [
                'sales_products' => $salesBan,
                'sales_services' => $salesService,
                'discounts' => $salesDiscount,
                'net_sales' => round($netSales, 2),
            ],
            'cogs' => round($cogs, 2),
            'gross_profit' => round($grossProfit, 2),
            'expenses' => $expenseItems,
            'total_expenses' => round($totalExpenses, 2),
            'net_income' => round($netIncome, 2),
        ];

        // 2. Balance Sheet (Laporan Posisi Keuangan) SAK EMKM
        $cash = $getBalance('1-1000');
        $bank = $getBalance('1-1001');
        $ar = $getBalance('1-1002');
        $inventory = $getBalance('1-2000');
        $totalCurrentAssets = $cash + $bank + $ar + $inventory;

        $equipment = $getBalance('1-3000');
        $accumDepr = $getBalance('1-3999');
        $netFixedAssets = $equipment - $accumDepr;

        $totalAssets = $totalCurrentAssets + $netFixedAssets;

        $ap = $getBalance('2-1000');
        $taxPayable = $getBalance('2-1003');
        $totalLiabilities = $ap + $taxPayable;

        $capital = $getBalance('3-1000');
        $retainedEarnings = $getBalance('3-2000');
        $totalEquity = $capital + $retainedEarnings + $netIncome;

        $totalLiabilitiesAndEquity = $totalLiabilities + $totalEquity;
        $balanceDiff = abs($totalAssets - $totalLiabilitiesAndEquity);

        $balanceSheet = [
            'current_assets' => [
                'cash' => $cash,
                'bank_bca' => $bank,
                'accounts_receivable' => $ar,
                'inventory' => $inventory,
                'total' => round($totalCurrentAssets, 2),
            ],
            'fixed_assets' => [
                'equipment' => $equipment,
                'accumulated_depreciation' => $accumDepr,
                'net_fixed_assets' => round($netFixedAssets, 2),
            ],
            'total_assets' => round($totalAssets, 2),
            'liabilities' => [
                'accounts_payable' => $ap,
                'tax_payable' => $taxPayable,
                'total' => round($totalLiabilities, 2),
            ],
            'equity' => [
                'owner_capital' => $capital,
                'retained_earnings' => $retainedEarnings,
                'current_period_net_income' => round($netIncome, 2),
                'total' => round($totalEquity, 2),
            ],
            'total_liabilities_and_equity' => round($totalLiabilitiesAndEquity, 2),
            'is_balanced' => $balanceDiff < 0.01,
            'difference' => round($balanceDiff, 2),
        ];

        // 3. Notes (CALK) SAK EMKM
        $notes = [
            'entity_name' => 'Omah Ban Cabang 3 (OB3)',
            'accounting_standard' => 'Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM)',
            'inventory_method' => 'First-In, First-Out (FIFO)',
            'depreciation_method' => 'Garis Lurus (Straight-Line Method)',
            'tax_policy' => 'PPN 11% Sesuai Regulasi Berlaku',
        ];

        return [
            'income_statement' => $incomeStatement,
            'balance_sheet' => $balanceSheet,
            'notes' => $notes,
        ];
    }
}
