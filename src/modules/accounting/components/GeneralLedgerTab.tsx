import React, { useState } from 'react';
import { 
  BookMarked, 
  Search, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Filter
} from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { calculateAccountLedger, SAK_EMKM_COA } from '../../../services/accountingService';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface GeneralLedgerTabProps {
  journals: JournalEntry[];
  initialBalances: Record<string, number>;
}

export const GeneralLedgerTab: React.FC<GeneralLedgerTabProps> = ({
  journals,
  initialBalances,
}) => {
  const [selectedAccountCode, setSelectedAccountCode] = useState('1-1000'); // Default Kas Toko Laci Kasir

  const initialBal = initialBalances[selectedAccountCode] || 0;
  const ledgerData = calculateAccountLedger(journals, selectedAccountCode, initialBal);

  const selectedAccountMeta = SAK_EMKM_COA.find((a) => a.account_code === selectedAccountCode) || {
    account_code: selectedAccountCode,
    account_name: 'Akun Terpilih',
    account_type: 'ASSET' as const,
    normal_balance: 'DEBIT' as const,
    category_name: 'Aset',
  };

  // Export specific account ledger to CSV
  const handleExportLedgerCsv = () => {
    let csv = `BUKU BESAR (GENERAL LEDGER) - ${selectedAccountMeta.account_code} ${selectedAccountMeta.account_name}\n`;
    csv += `Saldo Normal: ${selectedAccountMeta.normal_balance} | Saldo Awal: ${ledgerData.initial_balance}\n\n`;
    csv += 'Tanggal,No Jurnal,No Ref,Keterangan,Debit,Kredit,Saldo Berjalan\n';

    ledgerData.transactions.forEach((tx) => {
      csv += `"${tx.date}","${tx.journal_number}","${tx.ref_doc}","${tx.description.replace(/"/g, '""')}",${tx.debit},${tx.credit},${tx.running_balance}\n`;
    });

    csv += `\nTOTAL DEBIT: ${ledgerData.total_debit}, TOTAL KREDIT: ${ledgerData.total_credit}, SALDO AKHIR: ${ledgerData.ending_balance}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Buku_Besar_${selectedAccountMeta.account_code}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Account Info & 4 Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Awal</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
            {formatRupiah(ledgerData.initial_balance)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            Saldo Normal: <strong className="text-slate-800">{selectedAccountMeta.normal_balance}</strong>
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Mutasi Debit</span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-700 block mt-0.5">
            {formatRupiah(ledgerData.total_debit)}
          </span>
          <span className="text-[10px] text-blue-700 font-medium mt-0.5 block">
            +{ledgerData.transactions.filter((t) => t.debit > 0).length} transaksi debit
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Mutasi Kredit</span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-700 block mt-0.5">
            {formatRupiah(ledgerData.total_credit)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
            +{ledgerData.transactions.filter((t) => t.credit > 0).length} transaksi kredit
          </span>
        </div>

        <div className="bg-white border-2 border-blue-600 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Saldo Akhir Berjalan</span>
          <span className="text-lg sm:text-xl font-black font-mono text-blue-800 block mt-0.5">
            {formatRupiah(ledgerData.ending_balance)}
          </span>
          <span className="text-[10px] text-slate-600 font-bold mt-0.5 block">
            Posisi: {selectedAccountMeta.account_type}
          </span>
        </div>
      </div>

      {/* Main Card (Bungkus Bersih Sesuai Standar) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-indigo-700" />
              <span>Buku Besar (General Ledger): {selectedAccountMeta.account_code} — {selectedAccountMeta.account_name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kartu rincian mutasi debit/kredit dan saldo berjalan per akun SAK EMKM.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLedgerCsv}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Buku Besar (CSV)</span>
            </button>
          </div>
        </div>

        {/* Account Selection Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 shrink-0">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Pilih Rekening Akun:</span>
          </div>
          <div className="flex-1">
            <select
              value={selectedAccountCode}
              onChange={(e) => setSelectedAccountCode(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <optgroup label="1. Aset Lancar & Aset Tetap">
                {SAK_EMKM_COA.filter((a) => a.account_code.startsWith('1-')).map((a) => (
                  <option key={a.account_code} value={a.account_code}>
                    {a.account_code} — {a.account_name} ({a.normal_balance})
                  </option>
                ))}
              </optgroup>
              <optgroup label="2. Liabilitas & Hutang">
                {SAK_EMKM_COA.filter((a) => a.account_code.startsWith('2-')).map((a) => (
                  <option key={a.account_code} value={a.account_code}>
                    {a.account_code} — {a.account_name} ({a.normal_balance})
                  </option>
                ))}
              </optgroup>
              <optgroup label="3. Ekuitas & Modal">
                {SAK_EMKM_COA.filter((a) => a.account_code.startsWith('3-')).map((a) => (
                  <option key={a.account_code} value={a.account_code}>
                    {a.account_code} — {a.account_name} ({a.normal_balance})
                  </option>
                ))}
              </optgroup>
              <optgroup label="4. Pendapatan Usaha">
                {SAK_EMKM_COA.filter((a) => a.account_code.startsWith('4-')).map((a) => (
                  <option key={a.account_code} value={a.account_code}>
                    {a.account_code} — {a.account_name} ({a.normal_balance})
                  </option>
                ))}
              </optgroup>
              <optgroup label="5. Harga Pokok Penjualan (HPP)">
                {SAK_EMKM_COA.filter((a) => a.account_code.startsWith('5-')).map((a) => (
                  <option key={a.account_code} value={a.account_code}>
                    {a.account_code} — {a.account_name} ({a.normal_balance})
                  </option>
                ))}
              </optgroup>
              <optgroup label="6. Beban Operasional Usaha">
                {SAK_EMKM_COA.filter((a) => a.account_code.startsWith('6-')).map((a) => (
                  <option key={a.account_code} value={a.account_code}>
                    {a.account_code} — {a.account_name} ({a.normal_balance})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Ledger Transactions Table */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-28">Tanggal</th>
                  <th className="py-2.5 px-3 w-32">No. Jurnal</th>
                  <th className="py-2.5 px-3 w-32">No. Dokumen</th>
                  <th className="py-2.5 px-3">Keterangan Transaksi</th>
                  <th className="py-2.5 px-3 w-28 text-right">Debit (Dr)</th>
                  <th className="py-2.5 px-3 w-28 text-right">Kredit (Cr)</th>
                  <th className="py-2.5 px-3 w-32 text-right bg-slate-100/60">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {/* Saldo Awal Row */}
                <tr className="bg-indigo-50/40 font-bold text-slate-700">
                  <td className="py-2 px-3 font-sans font-medium text-slate-500">-</td>
                  <td className="py-2 px-3 text-indigo-600">SALDO AWAL</td>
                  <td className="py-2 px-3 text-slate-500">-</td>
                  <td className="py-2 px-3 font-sans font-medium text-slate-600">Saldo Awal Buku Besar Periode Berjalan</td>
                  <td className="py-2 px-3 text-right">-</td>
                  <td className="py-2 px-3 text-right">-</td>
                  <td className="py-2 px-3 text-right font-black text-indigo-900 bg-indigo-50/70">
                    {formatRupiah(ledgerData.initial_balance)}
                  </td>
                </tr>

                {ledgerData.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 font-sans text-xs">
                      Belum ada mutasi transaksi untuk akun ini pada periode berjalan
                    </td>
                  </tr>
                ) : (
                  ledgerData.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-sans text-slate-600">{formatDateIndo(tx.date)}</td>
                      <td className="py-2 px-3 font-bold text-indigo-700">{tx.journal_number}</td>
                      <td className="py-2 px-3 text-slate-500">{tx.ref_doc}</td>
                      <td className="py-2 px-3 font-sans text-slate-800 font-medium">
                        {tx.description}
                        {tx.note && <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{tx.note}</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-600">
                        {tx.debit > 0 ? formatRupiah(tx.debit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">
                        {tx.credit > 0 ? formatRupiah(tx.credit) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-50">
                        {formatRupiah(tx.running_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200 font-mono text-xs">
                <tr>
                  <td colSpan={4} className="py-2 px-3 text-right font-sans uppercase text-[11px] text-slate-600 font-bold">
                    Total Mutasi & Saldo Akhir:
                  </td>
                  <td className="py-2 px-3 text-right text-indigo-700">{formatRupiah(ledgerData.total_debit)}</td>
                  <td className="py-2 px-3 text-right text-emerald-700">{formatRupiah(ledgerData.total_credit)}</td>
                  <td className="py-2 px-3 text-right font-black text-indigo-950 bg-indigo-50/70">
                    {formatRupiah(ledgerData.ending_balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Total {ledgerData.transactions.length} mutasi tercatat pada akun ini
          </span>
          <span className="text-[11px] text-slate-400">
            Standar SAK EMKM Omah Ban
          </span>
        </div>
      </div>
    </div>
  );
};
