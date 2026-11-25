import React, { useEffect, useState, useMemo } from 'react';
import { BookMarked, Printer, Search } from 'lucide-react';
import { ChartOfAccount } from '../../../shared/types';
import { accountingApi, mapLedger } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { TablePagination, usePagination } from '../../../shared/components';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { LedgerPrintModal } from './LedgerPrintModal';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';

interface GeneralLedgerTabProps {
  accounts: ChartOfAccount[];
  refreshKey?: number;
  initialAccountCode?: string;
}

const GROUPS = [
  { prefix: '1-', label: 'Aset' },
  { prefix: '2-', label: 'Liabilitas' },
  { prefix: '3-', label: 'Ekuitas' },
  { prefix: '4-', label: 'Pendapatan' },
  { prefix: '5-', label: 'Harga Pokok' },
  { prefix: '6-', label: 'Beban Operasional' },
];

const QUICK_ACCOUNTS = [
  { code: '1-1000', label: 'Kas Laci' },
  { code: '1-1001', label: 'Bank BCA' },
  { code: '1-1002', label: 'Piutang (AR)' },
  { code: '1-2000', label: 'Persediaan' },
  { code: '2-1000', label: 'Utang (AP)' },
  { code: '3-1000', label: 'Modal' },
];

export const GeneralLedgerTab: React.FC<GeneralLedgerTabProps> = ({
  accounts,
  refreshKey = 0,
  initialAccountCode,
}) => {
  const [accountCode, setAccountCode] = useState(initialAccountCode || '1-1000');
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
  const range = resolvePeriod(period);

  useEffect(() => {
    if (initialAccountCode) setAccountCode(initialAccountCode);
  }, [initialAccountCode]);

  const { data, loading, error, reload } = useServerData(
    () =>
      accountingApi
        .generalLedger({ account_code: accountCode, start_date: range.start_date, end_date: range.end_date })
        .then(mapLedger),
    [accountCode, range.start_date, range.end_date, refreshKey],
  );

  const filteredTransactions = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.toLowerCase().trim();
    return data.transactions.filter((t) => {
      if (directionFilter === 'DEBIT' && !(t.debit > 0)) return false;
      if (directionFilter === 'CREDIT' && !(t.credit > 0)) return false;
      if (q) {
        return (
          (t.journal_number || '').toLowerCase().includes(q) ||
          (t.ref_doc || '').toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, searchQuery, directionFilter]);

  const txPagination = usePagination(filteredTransactions, 15, [
    accountCode,
    range.start_date,
    range.end_date,
    searchQuery,
    directionFilter,
  ]);

  const accountMeta: ChartOfAccount = accounts.find((a) => a.account_code === accountCode) ?? {
    account_code: accountCode,
    account_name: data?.account_name ?? accountCode,
    account_type: data?.account_type ?? 'ASSET',
    normal_balance: data?.normal_balance ?? 'DEBIT',
  };
  const options = accounts.length > 0 ? accounts : [accountMeta];
  const openingEntries = data?.opening_entries ?? [];
  const cards = data
    ? [
        { label: 'Saldo Awal', value: data.initial_balance },
        { label: 'Mutasi Debit', value: data.total_debit },
        { label: 'Mutasi Kredit', value: data.total_credit },
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
            Saldo normal {accountMeta.normal_balance === 'DEBIT' ? 'debit' : 'kredit'}. Saldo awal mencakup saldo sebelum periode dan jurnal saldo awal akun/persediaan/piutang/utang (cocok 100% dengan Neraca Saldo).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Pilih akun"
            value={accountCode}
            onChange={(e) => setAccountCode(e.target.value)}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-800 border border-slate-300 rounded-lg bg-white min-w-[240px] sm:min-w-[320px] max-w-full"
          >
            {GROUPS.map((g) => {
              const items = options.filter((a) => a.account_code.startsWith(g.prefix));
              return items.length === 0 ? null : (
                <optgroup key={g.prefix} label={g.label}>
                  {items.map((a) => (
                    <option key={a.account_code} value={a.account_code}>
                      {a.account_code} — {a.account_name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <PeriodPicker value={period} onChange={setPeriod} />
          {data && (
            <ExportMenu
              reportId="general_ledger"
              data={data}
              ctx={{ periodLabel: range.label, startDate: range.start_date, endDate: range.end_date }}
            />
          )}
          {data && (
            <button
              type="button"
              onClick={() => setIsPrintOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          )}
        </div>
      </div>

      {/* Pintasan Akun Utama (termasuk Persediaan, Piutang, Utang) */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-bold text-slate-500 mr-1">Akun cepat:</span>
        {QUICK_ACCOUNTS.map((qa) => (
          <button
            key={qa.code}
            type="button"
            onClick={() => setAccountCode(qa.code)}
            className={`px-2.5 py-1 rounded-lg border font-bold transition-colors cursor-pointer ${
              accountCode === qa.code
                ? 'bg-blue-600 text-white border-blue-700'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="font-mono mr-1">{qa.code}</span>
            <span>{qa.label}</span>
          </button>
        ))}
      </div>

      <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{c.label}</span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-slate-900">
                  {formatRupiah(c.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. jurnal, referensi, atau keterangan..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-500 outline-none"
              />
            </div>
            <select
              aria-label="Filter arah mutasi buku besar"
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as 'ALL' | 'DEBIT' | 'CREDIT')}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-semibold text-slate-700"
            >
              <option value="ALL">Mutasi: Semua ({data.transactions.length})</option>
              <option value="DEBIT">Debit Saja</option>
              <option value="CREDIT">Kredit Saja</option>
            </select>
            {(searchQuery || directionFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDirectionFilter('ALL');
                }}
                className="px-2.5 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
              >
                Reset
              </button>
            )}
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
                <tr className="bg-blue-50/70 font-bold text-blue-950">
                  <td colSpan={6} className="py-2 px-3">
                    Saldo awal {range.start_date ? `periode ${formatDateIndo(range.start_date)}` : 'pembukuan'}
                    {openingEntries.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Termasuk {openingEntries.length} jurnal saldo awal
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatRupiah(data.initial_balance)}</td>
                </tr>

                {/* Rincian jurnal saldo awal dalam periode (jejak audit) */}
                {openingEntries.map((oe) => (
                  <tr key={`opening-${oe.id}`} className="bg-amber-50/40 text-slate-700 text-[11px]">
                    <td className="py-1.5 px-3">{formatDateIndo(oe.date)}</td>
                    <td className="py-1.5 px-3 font-mono font-bold text-amber-900">{oe.journal_number}</td>
                    <td className="py-1.5 px-3 font-mono text-amber-800">{oe.ref_doc}</td>
                    <td className="py-1.5 px-3">
                      <span className="inline-block px-1.5 py-0.2 mr-1.5 rounded bg-amber-100 text-amber-900 text-[9.5px] font-bold">
                        SALDO AWAL
                      </span>
                      {oe.description}
                      {oe.note && <span className="block text-[10px] text-slate-400">{oe.note}</span>}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-blue-700">
                      {oe.debit ? formatRupiah(oe.debit) : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                      {oe.credit ? formatRupiah(oe.credit) : '-'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-amber-900 italic">
                      (bagian saldo awal)
                    </td>
                  </tr>
                ))}

                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 italic">
                      Tidak ada mutasi operasional yang cocok pada periode ini.
                    </td>
                  </tr>
                ) : (
                  txPagination.pageItems.map((t) => (
                    <tr key={t.id} className="text-slate-800">
                      <td className="py-1.5 px-3">{formatDateIndo(t.date)}</td>
                      <td className="py-1.5 px-3 font-mono">{t.journal_number}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-500">{t.ref_doc}</td>
                      <td className="py-1.5 px-3">
                        {t.description}
                        {t.note && <span className="block text-[10px] text-slate-400">{t.note}</span>}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-blue-700">
                        {t.debit ? formatRupiah(t.debit) : '-'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-emerald-700">
                        {t.credit ? formatRupiah(t.credit) : '-'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums font-bold">
                        {formatRupiah(t.running_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2 px-3">TOTAL MUTASI OPERASIONAL &amp; SALDO AKHIR</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatRupiah(data.total_debit)}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatRupiah(data.total_credit)}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">{formatRupiah(data.ending_balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <TablePagination
            page={txPagination.page}
            pageSize={txPagination.pageSize}
            totalItems={filteredTransactions.length}
            unfilteredTotal={data.transactions.length}
            itemLabel="mutasi buku besar"
            pageSizeOptions={[10, 15, 25, 50, 100]}
            onPageChange={txPagination.setPage}
            onPageSizeChange={txPagination.setPageSize}
          />

          <LedgerPrintModal
            isOpen={isPrintOpen}
            onClose={() => setIsPrintOpen(false)}
            ledgerData={data}
            accountMeta={accountMeta}
            startDate={range.start_date}
            endDate={range.end_date}
          />
        </>
      )}
    </div>
  );
};
