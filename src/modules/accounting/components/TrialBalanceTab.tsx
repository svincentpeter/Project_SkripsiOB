import React, { useState, useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Landmark, Scale, Search } from 'lucide-react';
import { accountingApi, mapTrialBalance } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { TablePagination, usePagination } from '../../../shared/components';
import { useServerData } from '../hooks/useServerData';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';

interface TrialBalanceTabProps {
  refreshKey?: number;
  onNavigateToReports: () => void;
  onOpenLedger?: (accountCode: string) => void;
  onOpenOpeningBalance?: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Liabilitas',
  EQUITY: 'Ekuitas',
  REVENUE: 'Pendapatan',
  EXPENSE: 'Beban',
};

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({
  refreshKey = 0,
  onNavigateToReports,
  onOpenLedger,
  onOpenOpeningBalance,
}) => {
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [hideZero, setHideZero] = useState<boolean>(false);

  const range = resolvePeriod(period);
  const { data, loading, error, reload } = useServerData(
    () =>
      accountingApi
        .trialBalance({ start_date: range.start_date, end_date: range.end_date })
        .then(mapTrialBalance),
    [range.start_date, range.end_date, refreshKey],
  );

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    return data.rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.account_type !== typeFilter) return false;
      const isAllZero =
        (r.opening_debit ?? 0) === 0 &&
        (r.opening_credit ?? 0) === 0 &&
        (r.mutation_debit ?? 0) === 0 &&
        (r.mutation_credit ?? 0) === 0 &&
        r.debit_balance === 0 &&
        r.credit_balance === 0;
      if (hideZero && isAllZero) return false;
      if (q) {
        return (
          r.account_code.toLowerCase().includes(q) ||
          r.account_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, searchQuery, typeFilter, hideZero]);

  const tbPagination = usePagination(filteredRows, 20, [range.start_date, range.end_date, searchQuery, typeFilter, hideZero]);

  const moneyCell = (val?: number) => (val && val !== 0 ? formatRupiah(val) : '-');

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-700" />
            <span>Neraca Saldo 6 Kolom (Trial Balance • SAK EMKM)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Menampilkan Saldo Awal, Mutasi Periode, dan Saldo Akhir seluruh akun COA. Klik kode akun untuk membuka Buku Besar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          {onOpenOpeningBalance && (
            <button
              type="button"
              onClick={onOpenOpeningBalance}
              className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Form Saldo Awal</span>
            </button>
          )}
          {data && (
            <ExportMenu
              reportId="trial_balance"
              data={data}
              ctx={{ periodLabel: range.label, startDate: range.start_date, endDate: range.end_date }}
            />
          )}
        </div>
      </div>

      <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div
            role="status"
            className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 font-bold ${
              data.is_balanced
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {data.is_balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>
                {data.is_balanced
                  ? 'Seimbang: Saldo Awal, Mutasi Periode, dan Saldo Akhir memiliki total Debit = Kredit.'
                  : `Tidak seimbang, selisih ${formatRupiah(data.difference)}.`}
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums">
              Saldo Awal {formatRupiah(data.total_opening_debit ?? 0)} · Mutasi {formatRupiah(data.total_mutation_debit ?? 0)} · Akhir {formatRupiah(data.total_debit)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode atau nama akun..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <select
              aria-label="Filter klasifikasi akun neraca saldo"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700"
            >
              <option value="ALL">Klasifikasi: Semua</option>
              <option value="ASSET">Aset (1-xxxx)</option>
              <option value="LIABILITY">Liabilitas (2-xxxx)</option>
              <option value="EQUITY">Ekuitas (3-xxxx)</option>
              <option value="REVENUE">Pendapatan (4-xxxx)</option>
              <option value="EXPENSE">Beban &amp; HPP (5/6-xxxx)</option>
            </select>
            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 cursor-pointer font-semibold text-slate-700">
              <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} />
              <span>Sembunyikan akun Rp 0</span>
            </label>
            {(searchQuery || typeFilter !== 'ALL' || hideZero) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('ALL');
                  setHideZero(false);
                }}
                className="px-2.5 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[980px] text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th rowSpan={2} className="py-2 px-3 text-left w-24 border-r border-slate-200">Kode</th>
                  <th rowSpan={2} className="py-2 px-3 text-left border-r border-slate-200">Nama Akun</th>
                  <th rowSpan={2} className="py-2 px-3 text-left w-24 border-r border-slate-200">Klasifikasi</th>
                  <th colSpan={2} className="py-1.5 px-3 text-center bg-blue-50/60 text-blue-900 border-b border-r border-slate-200">
                    Saldo Awal
                  </th>
                  <th colSpan={2} className="py-1.5 px-3 text-center bg-slate-100/70 text-slate-800 border-b border-r border-slate-200">
                    Mutasi Periode
                  </th>
                  <th colSpan={2} className="py-1.5 px-3 text-center bg-emerald-50/60 text-emerald-900 border-b border-slate-200">
                    Saldo Akhir
                  </th>
                </tr>
                <tr className="text-[11px]">
                  <th className="py-1.5 px-2.5 text-right w-32 bg-blue-50/40 border-r border-slate-100">Debit</th>
                  <th className="py-1.5 px-2.5 text-right w-32 bg-blue-50/40 border-r border-slate-200">Kredit</th>
                  <th className="py-1.5 px-2.5 text-right w-32 bg-slate-50 border-r border-slate-100">Debit</th>
                  <th className="py-1.5 px-2.5 text-right w-32 bg-slate-50 border-r border-slate-200">Kredit</th>
                  <th className="py-1.5 px-2.5 text-right w-32 bg-emerald-50/40 border-r border-slate-100">Debit</th>
                  <th className="py-1.5 px-2.5 text-right w-32 bg-emerald-50/40">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      Tidak ada akun yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  tbPagination.pageItems.map((r) => {
                    const isAllZero =
                      (r.opening_debit ?? 0) === 0 &&
                      (r.opening_credit ?? 0) === 0 &&
                      (r.mutation_debit ?? 0) === 0 &&
                      (r.mutation_credit ?? 0) === 0 &&
                      r.debit_balance === 0 &&
                      r.credit_balance === 0;
                    return (
                      <tr
                        key={r.account_code}
                        className={`hover:bg-slate-50/80 ${isAllZero ? 'text-slate-400' : 'text-slate-800'}`}
                      >
                        <td className="py-1.5 px-3 font-mono font-bold border-r border-slate-100">
                          {onOpenLedger ? (
                            <button
                              type="button"
                              onClick={() => onOpenLedger(r.account_code)}
                              className="text-blue-700 hover:underline cursor-pointer"
                              title={`Buka Buku Besar ${r.account_code}`}
                            >
                              {r.account_code}
                            </button>
                          ) : (
                            r.account_code
                          )}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-100">{r.account_name}</td>
                        <td className="py-1.5 px-3 border-r border-slate-100">{TYPE_LABEL[r.account_type] ?? r.account_type}</td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums bg-blue-50/20 border-r border-slate-100">
                          {moneyCell(r.opening_debit)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums bg-blue-50/20 border-r border-slate-200">
                          {moneyCell(r.opening_credit)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-100">
                          {moneyCell(r.mutation_debit)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums border-r border-slate-200">
                          {moneyCell(r.mutation_credit)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-bold bg-emerald-50/20 border-r border-slate-100">
                          {moneyCell(r.debit_balance)}
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-mono tabular-nums font-bold bg-emerald-50/20">
                          {moneyCell(r.credit_balance)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t-2 border-slate-300">
                <tr>
                  <td colSpan={3} className="py-2 px-3 border-r border-slate-200">TOTAL</td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums border-r border-slate-200">
                    {formatRupiah(data.total_opening_debit ?? 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatRupiah(data.total_opening_credit ?? 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums border-r border-slate-200">
                    {formatRupiah(data.total_mutation_debit ?? 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums border-r border-slate-300">
                    {formatRupiah(data.total_mutation_credit ?? 0)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums border-r border-slate-200">
                    {formatRupiah(data.total_debit)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono tabular-nums">
                    {formatRupiah(data.total_credit)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="px-4 pb-3 border-t border-slate-100">
              <TablePagination
                page={tbPagination.page}
                pageSize={tbPagination.pageSize}
                totalItems={filteredRows.length}
                totalUnfiltered={data.rows.length}
                itemLabel="akun"
                pageSizeOptions={[15, 20, 35, 50]}
                onPageChange={tbPagination.setPage}
                onPageSizeChange={tbPagination.setPageSize}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onNavigateToReports}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Lanjut ke Laporan Keuangan SAK EMKM</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
