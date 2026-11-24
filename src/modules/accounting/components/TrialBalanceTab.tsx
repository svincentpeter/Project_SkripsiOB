import React, { useState, useMemo } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Scale, Search } from 'lucide-react';
import { accountingApi, mapTrialBalance } from '../../../services/api';
import { localDate } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface TrialBalanceTabProps {
  refreshKey?: number;
  onNavigateToReports: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  ASSET: 'Aset', LIABILITY: 'Liabilitas', EQUITY: 'Ekuitas', REVENUE: 'Pendapatan', EXPENSE: 'Beban',
};

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({ refreshKey = 0, onNavigateToReports }) => {
  const [asOf, setAsOf] = useState(localDate());
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [hideZero, setHideZero] = useState<boolean>(false);
  const { data, loading, error, reload } = useServerData(
    () => accountingApi.trialBalance(asOf).then(mapTrialBalance),
    [asOf, refreshKey],
  );

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    return data.rows.filter((r) => {
      if (typeFilter !== 'ALL' && r.account_type !== typeFilter) return false;
      if (hideZero && r.debit_balance === 0 && r.credit_balance === 0) return false;
      if (q) {
        return (
          r.account_code.toLowerCase().includes(q) ||
          r.account_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, searchQuery, typeFilter, hideZero]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-700" />
            <span>Neraca Saldo (Trial Balance)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Saldo seluruh akun COA per tanggal, dihitung server dari jurnal berstatus POSTED.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 flex items-center gap-1.5">
            <span>Per tanggal</span>
            <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
          </label>
          {data && <ExportMenu reportId="trial_balance" data={data} ctx={{ periodLabel: `Per ${asOf}`, endDate: asOf }} />}
        </div>
      </div>

      <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div role="status" className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-bold ${
            data.is_balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {data.is_balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{data.is_balanced ? 'Seimbang: total debit sama dengan total kredit.' : `Tidak seimbang, selisih ${formatRupiah(data.difference)}.`}</span>
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
              <input
                type="checkbox"
                checked={hideZero}
                onChange={(e) => setHideZero(e.target.checked)}
              />
              <span>Sembunyikan saldo Rp 0</span>
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
            <table className="w-full min-w-[560px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left w-24">Kode</th>
                  <th className="py-2 px-3 text-left">Nama Akun</th>
                  <th className="py-2 px-3 text-left w-28">Klasifikasi</th>
                  <th className="py-2 px-3 text-right w-40">Debit</th>
                  <th className="py-2 px-3 text-right w-40">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.length === 0 ? (
                  <tr><td colSpan={5} className="py-6 text-center text-slate-400">Tidak ada akun yang sesuai filter.</td></tr>
                ) : (
                  filteredRows.map((r) => (
                  <tr key={r.account_code} className={r.debit_balance === 0 && r.credit_balance === 0 ? 'text-slate-400' : 'text-slate-800'}>
                    <td className="py-1.5 px-3 font-mono font-bold">{r.account_code}</td>
                    <td className="py-1.5 px-3">{r.account_name}</td>
                    <td className="py-1.5 px-3">{TYPE_LABEL[r.account_type] ?? r.account_type}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{r.debit_balance ? formatRupiah(r.debit_balance) : '-'}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{r.credit_balance ? formatRupiah(r.credit_balance) : '-'}</td>
                  </tr>
                ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t border-slate-300">
                <tr>
                  <td colSpan={3} className="py-2 px-3">TOTAL</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_debit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button type="button" onClick={onNavigateToReports}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer">
            <span>Lanjut ke Laporan Keuangan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
