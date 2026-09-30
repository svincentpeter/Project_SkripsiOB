<?php

namespace App\Services\Reports;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\Accounting\LedgerBalances;
use App\Services\Accounting\OpeningBalanceService;
use App\Services\Pos\PosAccounts;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Laporan operasional harian: rekap harian (juga sumber dashboard), laporan kas harian, rekap per kasir dan
 * ringkasan sesi kasir. Hanya membaca; tidak membukukan jurnal.
 *
 * Angka uang dibaca dari jurnal POSTED dengan klasifikasi yang sama dengan Laba Rugi, sehingga jumlah rekap
 * sebulan sama dengan laba rugi bulan itu dan mutasi kas sama dengan perubahan saldo 1-1000/1-1001.
 * Tabel penjualan hanya dipakai untuk jumlah nota, unit ban, bauran metode bayar dan rincian per nota/kasir.
 */
final class DailyReportService
{
    public const MAX_DAYS = 92;

    /** Retur penjualan (sub-proyek 3): akun kontra-pendapatan yang juga dilaporkan terpisah. */
    public const SALES_RETURN = '4-9100';

    /** Kelompok metode bayar di laporan; TRANSFER dan TRANSFER_BCA sama-sama masuk bank. */
    public const PAYMENT_GROUPS = ['TUNAI' => 'TUNAI', 'TRANSFER' => 'TRANSFER', 'TRANSFER_BCA' => 'TRANSFER', 'QRIS' => 'QRIS'];

    /**
     * Satu baris per hari (termasuk hari tanpa transaksi), urut dari tanggal terlama, beserta totalnya.
     */
    public function recap(string $from, string $to): array
    {
        if ((int) Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1 > self::MAX_DAYS) {
            throw new PosRuleException('Rentang rekap harian maksimal '.self::MAX_DAYS.' hari.');
        }

        $rows = [];
        for ($day = Carbon::parse($from); $day->toDateString() <= $to; $day->addDay()) {
            $rows[$day->toDateString()] = self::emptyRow($day->toDateString());
        }

        $this->addLedger($rows, $from, $to);
        $this->addSales($rows, $from, $to);

        $rows = array_values(array_map(fn (array $row) => self::finish($row), $rows));

        return ['from' => $from, 'to' => $to, 'rows' => $rows, 'totals' => self::total($rows)];
    }

    /** Pendapatan, kontra, HPP, beban dan kas masuk/keluar per hari dari jurnal (tanpa jurnal tutup buku). */
    private function addLedger(array &$rows, string $from, string $to): void
    {
        $accounts = Account::all()->keyBy('id');
        $lines = DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->where('e.status', 'POSTED')
            ->whereBetween('e.entry_date', [$from, $to])
            ->whereNotIn('e.reference_type', LedgerBalances::CLOSING_TYPES)
            ->groupBy('e.entry_date', 'i.account_id', 'e.reference_type')
            ->selectRaw('e.entry_date as entry_date, i.account_id, e.reference_type, SUM(i.debit) as debit, SUM(i.credit) as credit')
            ->get();

        foreach ($lines as $line) {
            $date = substr((string) $line->entry_date, 0, 10);
            $account = $accounts[$line->account_id];
            $code = $account->account_code;
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $row = $rows[$date];

            if (in_array($code, CashFlowReport::CASH_ACCOUNTS, true)) {
                // Saldo awal akun bukan arus kas; laporan kas harian menambahkannya ke saldo awal hari itu.
                if ($line->reference_type !== OpeningBalanceService::REFERENCE_TYPE) {
                    $row['cash_in'] += $debit;
                    $row['cash_out'] += $credit;
                }
            } else {
                $net = $account->normal_balance === 'DEBIT' ? $debit - $credit : $credit - $debit;
                switch (FinancialReportService::incomeSection($account)) {
                    case 'revenue':
                        $row['revenue'] += $net;
                        if ($code === PosAccounts::REVENUE_GOODS) {
                            $row['goods_revenue'] += $net;
                        }
                        if ($code === PosAccounts::REVENUE_SERVICE) {
                            $row['service_revenue'] += $net;
                        }
                        break;
                    case 'contra_revenue':
                        $row['contra_revenue'] += $net;
                        if ($code === self::SALES_RETURN) {
                            $row['returns'] += $net;
                        }
                        break;
                    case 'cost_of_sales':
                        $row['cost_of_sales'] += $net;
                        break;
                    case 'operating_expenses':
                        $row['operating_expenses'] += $net;
                        break;
                }
            }

            $rows[$date] = $row;
        }
    }

    /** Jumlah nota, unit ban dan bauran metode bayar dari nota yang tidak di-VOID, per tanggal nota. */
    private function addSales(array &$rows, string $from, string $to): void
    {
        $live = fn () => DB::table('sales as s')->where('s.status', '!=', 'VOID')->whereBetween('s.date', [$from, $to]);

        foreach ($live()->groupBy('s.date')->selectRaw('s.date as date, COUNT(*) as n')->get() as $r) {
            $rows[$r->date]['sales_count'] = (int) $r->n;
        }

        $units = $live()
            ->join('sale_details as d', 'd.sale_id', '=', 's.id')
            ->where('d.item_type', 'PRODUCT')
            ->groupBy('s.date')
            ->selectRaw('s.date as date, SUM(d.quantity) as q')
            ->get();
        foreach ($units as $r) {
            $rows[$r->date]['product_qty'] = (int) $r->q;
        }

        $payments = $live()
            ->join('sale_payments as p', 'p.sale_id', '=', 's.id')
            ->groupBy('s.date', 'p.method')
            ->selectRaw('s.date as date, p.method as method, SUM(p.amount) as amount')
            ->get();
        foreach ($payments as $r) {
            $group = self::PAYMENT_GROUPS[$r->method] ?? null;
            if ($group !== null) {
                $rows[$r->date]['payment_mix'][$group] += (float) $r->amount;
            }
        }
    }

    private static function emptyRow(string $date): array
    {
        return [
            'date' => $date,
            'sales_count' => 0,
            'product_qty' => 0,
            'revenue' => 0.0,
            'goods_revenue' => 0.0,
            'service_revenue' => 0.0,
            'contra_revenue' => 0.0,
            'returns' => 0.0,
            'net_revenue' => 0.0,
            'cost_of_sales' => 0.0,
            'gross_profit' => 0.0,
            'operating_expenses' => 0.0,
            'net_income' => 0.0,
            'payment_mix' => ['TUNAI' => 0.0, 'TRANSFER' => 0.0, 'QRIS' => 0.0],
            'cash_in' => 0.0,
            'cash_out' => 0.0,
            'net_cash' => 0.0,
        ];
    }

    /** Kolom turunan (sama dengan Laba Rugi) lalu bulatkan ke sen. */
    private static function finish(array $row): array
    {
        $row['net_revenue'] = $row['revenue'] - $row['contra_revenue'];
        $row['gross_profit'] = $row['net_revenue'] - $row['cost_of_sales'];
        $row['net_income'] = $row['gross_profit'] - $row['operating_expenses'];
        $row['net_cash'] = $row['cash_in'] - $row['cash_out'];

        return self::rounded($row);
    }

    private static function total(array $rows): array
    {
        $total = self::emptyRow('');
        unset($total['date']);
        foreach ($rows as $row) {
            foreach (array_keys($total) as $key) {
                if ($key === 'payment_mix') {
                    foreach (array_keys($total['payment_mix']) as $group) {
                        $total['payment_mix'][$group] += $row['payment_mix'][$group];
                    }
                } else {
                    $total[$key] += $row[$key];
                }
            }
        }

        return self::rounded($total);
    }

    private static function rounded(array $values): array
    {
        return array_map(
            fn ($value) => is_array($value) ? self::rounded($value) : (is_float($value) ? round($value, 2) : $value),
            $values
        );
    }
}
