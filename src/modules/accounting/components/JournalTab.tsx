import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { accountingApi, mapJournalPage } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';

interface JournalTabProps {
  refreshKey?: number;
  onOpenManualModal?: () => void;
  onReverseJournal?: (journal: JournalEntry, reason: string) => Promise<boolean>;
}

const TYPE_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'ALL', label: 'Semua', types: [] },
  { id: 'SALE', label: 'Penjualan', types: ['POS_SALE', 'POS_SALE_VOID', 'SALES_RETURN'] },
  { id: 'PURCHASE', label: 'Pembelian', types: ['PURCHASE', 'PURCHASE_RETURN', 'GOODS_RECEIPT_CANCEL'] },
  { id: 'EXPENSE', label: 'Biaya', types: ['EXPENSE', 'VOID_EXPENSE'] },
  { id: 'DEBT', label: 'Bayar Hutang', types: ['DEBT_PAYMENT'] },
  { id: 'CASH', label: 'Kas & Modal', types: ['CASH_SESSION_VARIANCE', 'CASH_DEPOSIT', 'OWNER_DRAWING', 'CAPITAL_INJECTION'] },
  { id: 'INVENTORY', label: 'Persediaan', types: ['STOCK_OPNAME', 'STOCK_IMPORT', 'STOCK_RECONCILIATION', 'STOCK_COST_CORRECTION', 'OPENING_BALANCE'] },
  { id: 'ADJUSTMENT', label: 'Penyesuaian', types: ['MANUAL_ADJUSTMENT', 'MANUAL_REVERSAL', 'ACCOUNT_OPENING'] },
  { id: 'CLOSING', label: 'Tutup Buku', types: ['PERIOD_CLOSING', 'PERIOD_REOPEN'] },
];

const TYPE_BADGE: Record<string, string> = {
  MANUAL_ADJUSTMENT: 'PENYESUAIAN',
  MANUAL_REVERSAL: 'PEMBALIK',
  VOID_EXPENSE: 'PEMBALIK',
  POS_SALE_VOID: 'PEMBALIK',
  SALES_RETURN: 'RETUR',
  PURCHASE_RETURN: 'RETUR',
  GOODS_RECEIPT_CANCEL: 'PEMBALIK',
  ACCOUNT_OPENING: 'SALDO AWAL',
  PERIOD_CLOSING: 'JURNAL PENUTUP',
  PERIOD_REOPEN: 'BUKA PERIODE',
  CASH_SESSION_VARIANCE: 'SELISIH KAS',
  CASH_DEPOSIT: 'SETOR BANK',
  OWNER_DRAWING: 'PRIVE',
  CAPITAL_INJECTION: 'SETOR MODAL',
};

export const JournalTab: React.FC<JournalTabProps> = ({ refreshKey = 0, onOpenManualModal, onReverseJournal }) => {
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [groupId, setGroupId] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [journalToReverse, setJournalToReverse] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const range = resolvePeriod(period);
  const group = TYPE_GROUPS.find((g) => g.id === groupId) ?? TYPE_GROUPS[0];
  const { data, loading, error, reload } = useServerData(
    () =>
      accountingApi
        .journals({
          start_date: range.start_date,
          end_date: range.end_date,
          types: group.types.join(',') || undefined,
          search: search || undefined,
          page,
          per_page: 25,
        })
        .then(mapJournalPage),
    [range.start_date, range.end_date, groupId, search, page, refreshKey],
  );

  const changePeriod = (value: PeriodSelection) => {
    setPeriod(value);
    setPage(1);
  };
  const changeGroup = (id: string) => {
    setGroupId(id);
    setPage(1);
  };
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };
  const confirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalToReverse || !onReverseJournal || !reversalReason.trim()) return;
    setIsReversing(true);
    const ok = await onReverseJournal(journalToReverse, reversalReason.trim());
    setIsReversing(false);
    if (ok) {
      setJournalToReverse(null);
      setReversalReason('');
    }
  };

  const journals = data?.journals ?? [];

  return (
    <div className="w-full">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Jurnal Umum & Penyesuaian</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Seluruh jurnal yang dibukukan server, termasuk penjualan, pembelian, biaya, penyesuaian, dan tutup buku.</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu reportId="journal" data={journals} ctx={{ periodLabel: range.label, startDate: range.start_date, endDate: range.end_date }} />
            {onOpenManualModal && (
              <button type="button" onClick={onOpenManualModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Jurnal Penyesuaian</span>
              </button>
            )}
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Debit (filter)</span>
              <span className="text-base font-black font-mono text-slate-900">{formatRupiah(data.totalDebit)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Kredit (filter)</span>
              <span className="text-base font-black font-mono text-slate-900">{formatRupiah(data.totalCredit)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Jumlah Jurnal</span>
              <span className="text-base font-black font-mono text-slate-900">{data.total}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker value={period} onChange={changePeriod} />
            <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Cari jurnal" placeholder="Cari no. jurnal, referensi, atau keterangan lalu Enter…"
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </form>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto text-xs" aria-label="Filter jenis jurnal">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" aria-hidden="true" />
            {TYPE_GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => changeGroup(g.id)} aria-pressed={groupId === g.id}
                className={`px-2.5 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer ${
                  groupId === g.id ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

        {data && journals.length === 0 && (
          <div className="border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500 bg-slate-50">
            Tidak ada jurnal untuk filter ini.
          </div>
        )}

        <div className="space-y-3">
          {journals.map((journal) => (
            <div key={journal.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">{journal.journal_number}</span>
                  <span className="text-slate-600 font-bold text-[11px]">{formatDateIndo(journal.date)}</span>
                  <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">Ref: {journal.ref_doc}</span>
                  {journal.reference_type && TYPE_BADGE[journal.reference_type] && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">{TYPE_BADGE[journal.reference_type]}</span>
                  )}
                  {journal.reversed_by && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Dibalik oleh {journal.reversed_by}</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-mono">{formatRupiah(journal.total_debit ?? 0)}</span>
                  {journal.created_by_name && <span className="text-[10px] text-slate-400">oleh {journal.created_by_name}</span>}
                  {onReverseJournal && journal.can_reverse && (
                    <button type="button" onClick={() => setJournalToReverse(journal)}
                      className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg flex items-center gap-1 cursor-pointer">
                      <RotateCcw className="w-3 h-3 text-rose-600" />
                      <span>Pembalik</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-slate-700 font-medium">{journal.description}</p>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[500px] text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2 px-3 text-left w-28">Kode Akun</th>
                        <th className="py-2 px-3 text-left">Nama Akun & Keterangan</th>
                        <th className="py-2 px-3 text-right w-32">Debit</th>
                        <th className="py-2 px-3 text-right w-32">Kredit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {journal.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-bold text-slate-600">{line.account_code}</td>
                          <td className="py-1.5 px-3 font-sans">
                            <span className={`font-semibold ${line.credit > 0 ? 'pl-4 text-slate-700' : 'text-slate-900'}`}>{line.account_name}</span>
                            {line.note && <span className="block text-[10px] text-slate-400 mt-0.5">{line.note}</span>}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-blue-700">{line.debit > 0 ? formatRupiah(line.debit) : '-'}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-700">{line.credit > 0 ? formatRupiah(line.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data && data.lastPage > 1 && (
          <nav aria-label="Halaman jurnal" className="flex items-center justify-between text-xs pt-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 font-bold border border-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-slate-500">Halaman {data.currentPage} dari {data.lastPage} • {data.total} jurnal</span>
            <button type="button" disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 font-bold border border-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-40 cursor-pointer">
              Berikutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        )}
      </div>

      {journalToReverse && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setJournalToReverse(null);
          }}>
          <div role="dialog" aria-modal="true" aria-labelledby="reverse-title" className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 id="reverse-title" className="text-sm font-bold">Jurnal Pembalik (Storno)</h2>
                <p className="text-[11px] text-slate-400 font-mono">{journalToReverse.journal_number} • {journalToReverse.ref_doc}</p>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setJournalToReverse(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={confirmReversal} className="p-5 space-y-4 text-xs">
              <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                Jurnal yang sudah dibukukan tidak dihapus. Server membuat jurnal pembalik bertanggal hari ini dengan debit dan kredit ditukar,
                dan mencatat Anda sebagai pembuatnya. Setiap jurnal hanya dapat dibalik satu kali.
              </p>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Alasan pembalikan</span>
                <input type="text" required value={reversalReason} onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Contoh: salah kode akun beban"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none" />
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setJournalToReverse(null)} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={isReversing || !reversalReason.trim()}
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isReversing ? 'Memproses…' : 'Bukukan Pembalik'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
