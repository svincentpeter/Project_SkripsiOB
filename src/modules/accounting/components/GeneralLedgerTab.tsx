import React, { useState } from 'react';
import { BookMarked, Printer } from 'lucide-react';
import { ChartOfAccount } from '../../../shared/types';
import { accountingApi, mapLedger } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { LedgerPrintModal } from './LedgerPrintModal';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';

interface GeneralLedgerTabProps {
  accounts: ChartOfAccount[];
  refreshKey?: number;
}

const GROUPS = [
  { prefix: '1-', label: 'Aset' },
  { prefix: '2-', label: 'Liabilitas' },
  { prefix: '3-', label: 'Ekuitas' },
  { prefix: '4-', label: 'Pendapatan' },
  { prefix: '5-', label: 'Harga Pokok' },
  { prefix: '6-', label: 'Beban Operasional' },
];

export const GeneralLedgerTab: React.FC<GeneralLedgerTabProps> = ({ accounts, refreshKey = 0 }) => {
  const [accountCode, setAccountCode] = useState('1-1000');
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const range = resolvePeriod(period);

  const { data, loading, error, reload } = useServerData(
    () => accountingApi.generalLedger({ account_code: accountCode, start_date: range.start_date, end_date: range.end_date }).then(mapLedger),
    [accountCode, range.start_date, range.end_date, refreshKey],
  );

  const accountMeta: ChartOfAccount = accounts.find((a) => a.account_code === accountCode) ?? {
    account_code: accountCode,
    account_name: data?.account_name ?? accountCode,
    account_type: data?.account_type ?? 'ASSET',
    normal_balance: data?.normal_balance ?? 'DEBIT',
  };
  const options = accounts.length > 0 ? accounts : [accountMeta];
  const cards = data
    ? [
        { label: 'Saldo Awal', value: data.initial_balance },
        { label: 'Total Debit', value: data.total_debit },
        { label: 'Total Kredit', value: data.total_credit },
        { label: 'Saldo Akhir', value: data.ending_balance },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-700" />
            <span>Buku Besar: {accountMeta.account_code} — {accountMeta.account_name}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Saldo normal {accountMeta.normal_balance === 'DEBIT' ? 'debit' : 'kredit'}. Saldo awal dihitung dari seluruh jurnal sebelum periode.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Pilih akun" value={accountCode} onChange={(e) => setAccountCode(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white max-w-[280px]">
            {GROUPS.map((g) => {
              const items = options.filter((a) => a.account_code.startsWith(g.prefix));
              return items.length === 0 ? null : (
                <optgroup key={g.prefix} label={g.label}>
                  {items.map((a) => (
                    <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <PeriodPicker value={period} onChange={setPeriod} />
          {data && (
            <ExportMenu reportId="general_ledger" data={data} ctx={{ periodLabel: range.label, startDate: range.start_date, endDate: range.end_date }} />
          )}
          {data && (
            <button type="button" onClick={() => setIsPrintOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          )}
        </div>
      </div>

      <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{c.label}</span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900">{formatRupiah(c.value)}</span>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left w-28">Tanggal</th>
                  <th className="py-2 px-3 text-left w-36">No. Jurnal</th>
                  <th className="py-2 px-3 text-left w-36">Referensi</th>
                  <th className="py-2 px-3 text-left">Keterangan</th>
                  <th className="py-2 px-3 text-right w-32">Debit</th>
                  <th className="py-2 px-3 text-right w-32">Kredit</th>
                  <th className="py-2 px-3 text-right w-36">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-blue-50/40 font-bold">
                  <td colSpan={6} className="py-1.5 px-3">Saldo awal {range.start_date ? `per ${formatDateIndo(range.start_date)}` : ''}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{formatRupiah(data.initial_balance)}</td>
                </tr>
                {data.transactions.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-slate-400 italic">Tidak ada mutasi pada periode ini.</td></tr>
                ) : (
                  data.transactions.map((t) => (
                    <tr key={t.id} className="text-slate-800">
                      <td className="py-1.5 px-3">{formatDateIndo(t.date)}</td>
                      <td className="py-1.5 px-3 font-mono">{t.journal_number}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-500">{t.ref_doc}</td>
                      <td className="py-1.5 px-3">{t.description}{t.note && <span className="block text-[10px] text-slate-400">{t.note}</span>}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-blue-700">{t.debit ? formatRupiah(t.debit) : '-'}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-700">{t.credit ? formatRupiah(t.credit) : '-'}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{formatRupiah(t.running_balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2 px-3">TOTAL MUTASI & SALDO AKHIR</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_debit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_credit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.ending_balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <LedgerPrintModal isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} ledgerData={data}
            accountMeta={accountMeta} startDate={range.start_date} endDate={range.end_date} />
        </>
      )}
    </div>
  );
};
