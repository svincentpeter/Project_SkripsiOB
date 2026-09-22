import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  X,
  ShieldAlert
} from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface JournalTabProps {
  journals: JournalEntry[];
  onOpenManualModal: () => void;
  onReverseJournal?: (journal: JournalEntry, reason: string, reversedBy: string) => void;
}

export const JournalTab: React.FC<JournalTabProps> = ({
  journals,
  onOpenManualModal,
  onReverseJournal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'EXPENSE' | 'DEBT' | 'RECEIVABLE' | 'ADJUSTMENT' | 'CLOSING'>('ALL');

  // Reversal Modal State
  const [journalToReverse, setJournalToReverse] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('Koreksi salah input akun / pembatalan transaksi');
  const [reversalAuthorizer, setReversalAuthorizer] = useState('Supervisor Akuntansi');

  const filteredJournals = journals.filter((j) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      j.journal_number.toLowerCase().includes(q) ||
      j.ref_doc.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      j.lines.some((l) => l.account_name.toLowerCase().includes(q) || l.account_code.includes(q));

    let matchesCat = true;
    if (categoryFilter === 'SALE') {
      matchesCat = j.ref_doc.startsWith('OB3-INV') || j.description.toLowerCase().includes('penjualan');
    } else if (categoryFilter === 'PURCHASE') {
      matchesCat = j.ref_doc.startsWith('PO') || j.ref_doc.startsWith('GR') || j.description.toLowerCase().includes('penerimaan stok') || j.description.toLowerCase().includes('pembelian');
    } else if (categoryFilter === 'EXPENSE') {
      matchesCat = j.ref_doc.startsWith('BIAYA') || j.ref_doc.startsWith('BKK') || j.description.toLowerCase().includes('beban');
    } else if (categoryFilter === 'DEBT') {
      matchesCat = j.description.toLowerCase().includes('pelunasan hutang');
    } else if (categoryFilter === 'RECEIVABLE') {
      matchesCat = j.description.toLowerCase().includes('pelunasan piutang') || j.description.toLowerCase().includes('penerimaan pembayaran piutang');
    } else if (categoryFilter === 'CLOSING') {
      matchesCat = j.journal_number.startsWith('JC-') || j.ref_doc.startsWith('TUTUP-') || j.description.toLowerCase().includes('jurnal penutup');
    } else if (categoryFilter === 'ADJUSTMENT') {
      matchesCat = j.ref_doc.startsWith('MEM') || j.ref_doc.startsWith('REV') || j.description.toLowerCase().includes('penyesuaian') || j.description.toLowerCase().includes('pembalik');
    }

    return matchesQuery && matchesCat;
  });

  // Calculate totals
  let totalDebit = 0;
  let totalCredit = 0;
  journals.forEach((j) => {
    if (j.status === 'POSTED') {
      j.lines.forEach((l) => {
        totalDebit += l.debit;
        totalCredit += l.credit;
      });
    }
  });

  const isBalanced = totalDebit === totalCredit;
  const balanceDiff = Math.abs(totalDebit - totalCredit);

  // Submit Reversal
  const handleConfirmReversal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalToReverse || !onReverseJournal) return;
    onReverseJournal(journalToReverse, reversalReason, reversalAuthorizer);
    setJournalToReverse(null);
  };

  return (
    <div className="w-full">
      {/* Main Unified Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Buku Jurnal Umum & Penyesuaian (General Journal)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pencatatan kronologis seluruh ayat jurnal transaksi double-entry SAK EMKM, penyesuaian, jurnal penutup, dan storno pembalik.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu
              reportId="general_journal"
              data={journals}
              ctx={{ periodLabel: 'Periode Berjalan' }}
            />
            {onOpenManualModal && (
              <button
                onClick={onOpenManualModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Jurnal Penyesuaian</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Akumulasi Debit</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
                {formatRupiah(totalDebit)}
              </span>
            </div>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Akumulasi Kredit</span>
              <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
                {formatRupiah(totalCredit)}
              </span>
            </div>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>

          <div className={`border rounded-xl p-3.5 flex items-center justify-between ${
            isBalanced ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-600">Status Keseimbangan</span>
              <span className={`text-xs font-black block mt-0.5 ${
                isBalanced ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isBalanced ? '✓ SEIMBANG (0 Selisih)' : `✗ TIDAK SEIMBANG (${formatRupiah(Math.abs(totalDebit - totalCredit))})`}
              </span>
            </div>
            <span className={`p-2 rounded-xl ${
              isBalanced ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}>
              <Layers className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari no. jurnal, nota ref, akun, atau deskripsi..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-light"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1 mr-1" />
            {[
              { id: 'ALL', label: 'Semua' },
              { id: 'SALE', label: 'Penjualan' },
              { id: 'PURCHASE', label: 'Beli Ban' },
              { id: 'EXPENSE', label: 'Biaya' },
              { id: 'DEBT', label: 'Bayar AP' },
              { id: 'RECEIVABLE', label: 'Piutang AR' },
              { id: 'CLOSING', label: 'Penutup' },
              { id: 'ADJUSTMENT', label: 'Penyesuaian' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Journals List */}
        <div className="space-y-3">
          {filteredJournals.length === 0 ? (
            <div className="border border-slate-200 rounded-xl p-12 text-center text-slate-400 bg-slate-50/50">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
              {journals.length === 0 ? (
                <>
                  <p className="text-xs font-bold text-slate-600">Belum ada ayat jurnal di database</p>
                  <p className="text-[11px] italic text-slate-400 mt-1 mb-3">
                    Jurnal terbentuk otomatis dari transaksi POS, penerimaan barang, beban, atau penyesuaian periode.
                  </p>
                  {onOpenManualModal && (
                    <button
                      onClick={onOpenManualModal}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Jurnal Penyesuaian</span>
                    </button>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs font-bold text-slate-600">Tidak ada ayat jurnal yang cocok dengan kriteria pencarian</p>
                  <p className="text-[11px] italic text-slate-400 mt-1 mb-3">Coba ubah kata kunci atau filter kategori di atas</p>
                  <button
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Reset Filter Pencarian
                  </button>
                </>
              )}
            </div>
          ) : (
            filteredJournals.map((journal) => {
              const entryDebit = journal.lines.reduce((acc, l) => acc + l.debit, 0);
              const entryCredit = journal.lines.reduce((acc, l) => acc + l.credit, 0);
              const isEntryBalanced = entryDebit === entryCredit;
              const isReversingEntry = journal.ref_doc.startsWith('REV-') || journal.description.includes('[JURNAL PEMBALIK');
              const isClosingEntry = journal.journal_number.startsWith('JC-') || journal.ref_doc.startsWith('TUTUP-');

              return (
                <div
                  key={journal.id}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                >
                  {/* Journal Card Header */}
                  <div className="bg-slate-50/80 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                        {journal.journal_number}
                      </span>
                      <span className="text-slate-400 font-mono">•</span>
                      <span className="text-slate-600 font-bold text-[11px]">{formatDateIndo(journal.date)}</span>
                      <span className="text-slate-400 font-mono">•</span>
                      <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                        Ref: {journal.ref_doc}
                      </span>
                      {isClosingEntry && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                          JURNAL PENUTUP
                        </span>
                      )}
                      {isReversingEntry && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                          PEMBALIK (STORNO)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="text-xs text-slate-500 font-mono">
                        Debit/Kredit: <strong>{formatRupiah(entryDebit)}</strong>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold ${
                          isEntryBalanced
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isEntryBalanced ? 'POSTED' : 'UNBALANCED'}
                      </span>

                      {/* Reversal / Storno Action Button */}
                      {onReverseJournal && !isReversingEntry && !isClosingEntry && (
                        <button
                          onClick={() => setJournalToReverse(journal)}
                          className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          title="Buat Jurnal Pembalik / Koreksi Storno untuk transaksi ini"
                        >
                          <RotateCcw className="w-3 h-3 text-rose-600" />
                          <span>Pembalik</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Journal Card Body */}
                  <div className="p-3 space-y-2">
                    <p className="text-xs text-slate-700 font-medium">{journal.description}</p>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full min-w-[500px] text-xs border-collapse">
                        <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="py-2 px-3 text-left w-28">Kode Akun</th>
                            <th className="py-2 px-3 text-left">Nama Rekening & Keterangan</th>
                            <th className="py-2 px-3 text-right w-32">Debit (Dr)</th>
                            <th className="py-2 px-3 text-right w-32">Kredit (Cr)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono">
                          {journal.lines.map((line, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-1.5 px-3 font-bold text-slate-600 text-xs">
                                {line.account_code}
                              </td>
                              <td className="py-1.5 px-3 font-sans truncate">
                                <span className={`font-semibold ${line.credit > 0 ? 'pl-4 text-slate-700' : 'text-slate-900'}`}>
                                  {line.account_name}
                                </span>
                                {line.note && (
                                  <span className="block text-[10px] text-slate-400 font-normal truncate mt-0.5">
                                    {line.note}
                                  </span>
                                )}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold text-blue-700 text-xs">
                                {line.debit > 0 ? formatRupiah(line.debit) : '-'}
                              </td>
                              <td className="py-1.5 px-3 text-right font-bold text-emerald-700 text-xs">
                                {line.credit > 0 ? formatRupiah(line.credit) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Menampilkan {filteredJournals.length} ayat jurnal pembukuan
          </span>
          <span className="text-[11px] text-slate-400">
            Jurnal Umum & Penyesuaian SAK EMKM
          </span>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {journalToReverse && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setJournalToReverse(null);
          }}
        >
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wide">Koreksi / Jurnal Pembalik (Storno)</h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Target: {journalToReverse.journal_number} ({journalToReverse.ref_doc})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setJournalToReverse(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReversal} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <span className="font-bold block">Audit Trail SAK EMKM:</span>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Dalam akuntansi SAK EMKM, jurnal yang telah diposting tidak dihapus melainkan dibuatkan <strong>Jurnal Pembalik (Reversing Entry)</strong> yang membalik posisi Debit & Kredit secara otomatis.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Alasan Koreksi / Pembalikan
                </label>
                <input
                  type="text"
                  required
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Contoh: Salah kode akun beban, diganti ke akun yang sesuai..."
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Petugas Otorisasi Pembalik
                </label>
                <input
                  type="text"
                  required
                  value={reversalAuthorizer}
                  onChange={(e) => setReversalAuthorizer(e.target.value)}
                  placeholder="Nama petugas / supervisor..."
                  className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setJournalToReverse(null)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Proses Jurnal Pembalik</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
