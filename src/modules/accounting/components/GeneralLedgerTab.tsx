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
  Calendar
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
      {/* Account Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[280px]">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Pilih Rekening Akun Buku Besar (Chart of Accounts)
          </label>
          <div className="relative">
            <select
              value={selectedAccountCode}
              onChange={(e) => setSelectedAccountCode(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
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

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLedgerCsv}
            className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh Buku Besar (CSV)
          </button>
        </div>
      </div>

      {/* Account Info & 4 Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Saldo Awal</span>
          <span className="text-lg font-black font-mono text-slate-700 block mt-1">
            {formatRupiah(ledgerData.initial_balance)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
            Saldo Normal: <strong>{selectedAccountMeta.normal_balance}</strong>
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Mutasi Debit</span>
          <span className="text-lg font-black font-mono text-indigo-700 block mt-1">
            {formatRupiah(ledgerData.total_debit)}
          </span>
          <span className="text-[11px] text-indigo-600 font-medium mt-0.5 block">
            +{ledgerData.transactions.filter((t) => t.debit > 0).length} transaksi debit
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Mutasi Kredit</span>
          <span className="text-lg font-black font-mono text-emerald-700 block mt-1">
            {formatRupiah(ledgerData.total_credit)}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
            +{ledgerData.transactions.filter((t) => t.credit > 0).length} transaksi kredit
          </span>
        </div>

        <div className="bg-indigo-900 text-white rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-indigo-200 uppercase tracking-wider block">Saldo Akhir Berjalan</span>
          <span className="text-xl font-black font-mono text-white block mt-1">
            {formatRupiah(ledgerData.ending_balance)}
          </span>
          <span className="text-[11px] text-indigo-300 font-medium mt-0.5 block">
            Posisi: {selectedAccountMeta.account_type}
          </span>
        </div>
      </div>

      {/* Ledger Transactions Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Rekap Kartu Akun: {selectedAccountMeta.account_code} — {selectedAccountMeta.account_name}
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500 font-mono">
            {ledgerData.transactions.length} baris mutasi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-28">Tanggal</th>
                <th className="p-3 w-32">No. Jurnal</th>
                <th className="p-3 w-32">No. Dokumen</th>
                <th className="p-3">Keterangan Transaksi</th>
                <th className="p-3 w-28 text-right">Debit (Dr)</th>
                <th className="p-3 w-28 text-right">Kredit (Cr)</th>
                <th className="p-3 w-32 text-right bg-slate-200/50">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {/* Saldo Awal Row */}
              <tr className="bg-indigo-50/40 font-bold text-slate-700">
                <td className="p-2.5 font-sans font-medium text-slate-500">-</td>
                <td className="p-2.5 text-indigo-600">SALDO AWAL</td>
                <td className="p-2.5 text-slate-500">-</td>
                <td className="p-2.5 font-sans font-medium text-slate-600">Saldo Awal Buku Besar Periode Berjalan</td>
                <td className="p-2.5 text-right">-</td>
                <td className="p-2.5 text-right">-</td>
                <td className="p-2.5 text-right font-black text-indigo-900 bg-indigo-50/70">
                  {formatRupiah(ledgerData.initial_balance)}
                </td>
              </tr>

              {ledgerData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                    Belum ada mutasi transaksi untuk akun ini pada periode berjalan
                  </td>
                </tr>
              ) : (
                ledgerData.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70">
                    <td className="p-2.5 font-sans text-slate-600">{formatDateIndo(tx.date)}</td>
                    <td className="p-2.5 font-bold text-indigo-700">{tx.journal_number}</td>
                    <td className="p-2.5 text-slate-500">{tx.ref_doc}</td>
                    <td className="p-2.5 font-sans text-slate-800 font-medium">
                      {tx.description}
                      {tx.note && <span className="block text-[11px] text-slate-400 font-normal">{tx.note}</span>}
                    </td>
                    <td className="p-2.5 text-right font-bold text-indigo-600">
                      {tx.debit > 0 ? formatRupiah(tx.debit) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-bold text-emerald-600">
                      {tx.credit > 0 ? formatRupiah(tx.credit) : '-'}
                    </td>
                    <td className="p-2.5 text-right font-black text-slate-900 bg-slate-50">
                      {formatRupiah(tx.running_balance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Footer Total */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 font-mono">
              <tr>
                <td colSpan={4} className="p-3 text-right font-sans uppercase text-xs">
                  Total Mutasi & Saldo Akhir:
                </td>
                <td className="p-3 text-right text-indigo-700">{formatRupiah(ledgerData.total_debit)}</td>
                <td className="p-3 text-right text-emerald-700">{formatRupiah(ledgerData.total_credit)}</td>
                <td className="p-3 text-right font-black text-indigo-950 bg-indigo-100/50">
                  {formatRupiah(ledgerData.ending_balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
