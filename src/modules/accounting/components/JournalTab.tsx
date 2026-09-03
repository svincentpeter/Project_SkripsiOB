import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Download, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface JournalTabProps {
  journals: JournalEntry[];
  onOpenManualModal: () => void;
}

export const JournalTab: React.FC<JournalTabProps> = ({
  journals,
  onOpenManualModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SALE' | 'PURCHASE' | 'EXPENSE' | 'DEBT' | 'ADJUSTMENT'>('ALL');

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
      matchesCat = j.ref_doc.startsWith('BIAYA') || j.description.toLowerCase().includes('beban');
    } else if (categoryFilter === 'DEBT') {
      matchesCat = j.description.toLowerCase().includes('pelunasan hutang');
    } else if (categoryFilter === 'ADJUSTMENT') {
      matchesCat = j.ref_doc.startsWith('MEM') || j.description.toLowerCase().includes('penyesuaian');
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

  // Export to CSV helper
  const handleExportCsv = () => {
    let csv = 'Tanggal,No Jurnal,No Ref,Kode Akun,Nama Akun,Keterangan,Debit,Kredit,Status\n';
    journals.forEach((j) => {
      j.lines.forEach((l) => {
        csv += `"${j.date}","${j.journal_number}","${j.ref_doc}","${l.account_code}","${l.account_name}","${j.description.replace(
          /"/g,
          '""'
        )}",${l.debit},${l.credit},"${j.status}"\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Jurnal_Umum_OB3_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Akumulasi Debit</span>
            <span className="text-lg font-black font-mono text-indigo-700">{formatRupiah(totalDebit)}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Akumulasi Kredit</span>
            <span className="text-lg font-black font-mono text-emerald-700">{formatRupiah(totalCredit)}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Status Keseimbangan</span>
            {isBalanced ? (
              <span className="inline-flex items-center gap-1.5 text-sm font-black text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> SEIMBANG (0 Selisih)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm font-black text-amber-700">
                <AlertCircle className="w-4 h-4" /> SELISIH: {formatRupiah(balanceDiff)}
              </span>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isBalanced ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar: Search, Category Filter, and Actions */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no. jurnal, nota ref, akun, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
            {(['ALL', 'SALE', 'PURCHASE', 'EXPENSE', 'DEBT', 'ADJUSTMENT'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'ALL' && 'Semua'}
                {cat === 'SALE' && 'Penjualan'}
                {cat === 'PURCHASE' && 'Beli Ban'}
                {cat === 'EXPENSE' && 'Biaya'}
                {cat === 'DEBT' && 'Bayar Hutang'}
                {cat === 'ADJUSTMENT' && 'Penyesuaian'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor CSV
          </button>
          <button
            onClick={onOpenManualModal}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Jurnal Penyesuaian
          </button>
        </div>
      </div>

      {/* Journals List */}
      <div className="space-y-3">
        {filteredJournals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30 text-indigo-600" />
            <p className="text-sm font-bold text-slate-600">Tidak ada ayat jurnal yang cocok dengan kriteria pencarian</p>
            <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci atau filter kategori di atas</p>
          </div>
        ) : (
          filteredJournals.map((journal) => {
            const entryDebit = journal.lines.reduce((acc, l) => acc + l.debit, 0);
            const entryCredit = journal.lines.reduce((acc, l) => acc + l.credit, 0);
            const isEntryBalanced = entryDebit === entryCredit;

            return (
              <div
                key={journal.id}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Journal Card Header */}
                <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {journal.journal_number}
                    </span>
                    <span className="text-slate-400 font-mono">•</span>
                    <span className="text-slate-600 font-bold">{formatDateIndo(journal.date)}</span>
                    <span className="text-slate-400 font-mono">•</span>
                    <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Ref: {journal.ref_doc}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      Debit/Kredit: <strong>{formatRupiah(entryDebit)}</strong>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isEntryBalanced
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {isEntryBalanced ? 'POSTED' : 'UNBALANCED'}
                    </span>
                  </div>
                </div>

                {/* Journal Card Body */}
                <div className="p-3.5 space-y-2">
                  <p className="text-xs text-slate-700 font-medium">{journal.description}</p>

                  <div className="border border-slate-100 rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-100">
                        <tr>
                          <th className="p-2 text-left font-bold w-24">Kode Akun</th>
                          <th className="p-2 text-left font-bold">Nama Rekening & Keterangan</th>
                          <th className="p-2 text-right font-bold w-28">Debit (Dr)</th>
                          <th className="p-2 text-right font-bold w-28">Kredit (Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {journal.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2 font-mono font-bold text-slate-600">
                              {line.account_code}
                            </td>
                            <td className="p-2">
                              <span className={`font-semibold ${line.credit > 0 ? 'pl-4 text-slate-700' : 'text-slate-900'}`}>
                                {line.account_name}
                              </span>
                              {line.note && (
                                <span className="block text-[11px] text-slate-400 font-normal mt-0.5">
                                  {line.note}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-indigo-700">
                              {line.debit > 0 ? formatRupiah(line.debit) : '-'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-700">
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
    </div>
  );
};
