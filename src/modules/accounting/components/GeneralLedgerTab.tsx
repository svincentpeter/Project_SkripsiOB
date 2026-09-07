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
  Filter,
  Printer
} from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { calculateAccountLedger, SAK_EMKM_COA } from '../../../services/accountingService';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { LedgerPrintModal } from './LedgerPrintModal';

interface GeneralLedgerTabProps {
  journals: JournalEntry[];
  initialBalances: Record<string, number>;
}

type PeriodType = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM';

export const GeneralLedgerTab: React.FC<GeneralLedgerTabProps> = ({
  journals,
  initialBalances,
}) => {
  const [selectedAccountCode, setSelectedAccountCode] = useState('1-1000'); // Default Kas Toko Laci Kasir
  const [periodType, setPeriodType] = useState<PeriodType>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('2026-09-01');
  const [customEndDate, setCustomEndDate] = useState('2026-09-30');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Compute effective start and end dates based on filter
  let effectiveStartDate: string | undefined = undefined;
  let effectiveEndDate: string | undefined = undefined;

  if (periodType === 'THIS_MONTH') {
    effectiveStartDate = '2026-09-01';
    effectiveEndDate = '2026-09-30';
  } else if (periodType === 'LAST_MONTH') {
    effectiveStartDate = '2026-08-01';
    effectiveEndDate = '2026-08-31';
  } else if (periodType === 'CUSTOM') {
    effectiveStartDate = customStartDate || undefined;
    effectiveEndDate = customEndDate || undefined;
  }

  const initialBal = initialBalances[selectedAccountCode] || 0;
  const ledgerData = calculateAccountLedger(
    journals, 
    selectedAccountCode, 
    initialBal, 
    effectiveStartDate, 
    effectiveEndDate
  );

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
    csv += `Saldo Normal: ${selectedAccountMeta.normal_balance} | Saldo Awal: ${ledgerData.initial_balance}\n`;
    csv += `Periode: ${effectiveStartDate || 'Awal'} s/d ${effectiveEndDate || 'Akhir'}\n\n`;
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
    <div className="w-full">
      {/* Main Unified Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookMarked className="w-4 h-4 text-blue-700" />
              <span>Buku Besar (General Ledger): {selectedAccountMeta.account_code} — {selectedAccountMeta.account_name}</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Kartu rincian mutasi debit/kredit dan saldo berjalan per akun SAK EMKM dengan filter rentang tanggal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Lembar Buku Besar</span>
            </button>
            <button
              onClick={handleExportLedgerCsv}
              className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh CSV</span>
            </button>
          </div>
        </div>

        {/* Account Info & 4 Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Saldo Awal Periode</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
              {formatRupiah(ledgerData.initial_balance)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              Saldo Normal: <strong className="text-slate-800">{selectedAccountMeta.normal_balance}</strong>
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Mutasi Debit</span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-700 block mt-0.5">
              {formatRupiah(ledgerData.total_debit)}
            </span>
            <span className="text-[10px] text-blue-700 font-medium mt-0.5 block">
              +{ledgerData.transactions.filter((t) => t.debit > 0).length} transaksi debit
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Mutasi Kredit</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 block mt-0.5">
              {formatRupiah(ledgerData.total_credit)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
              +{ledgerData.transactions.filter((t) => t.credit > 0).length} transaksi kredit
            </span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Saldo Akhir Berjalan</span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-800 block mt-0.5">
              {formatRupiah(ledgerData.ending_balance)}
            </span>
            <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">
              Posisi: {selectedAccountMeta.account_type}
            </span>
          </div>
        </div>

        {/* Filter Controls: Account Select & Date Range Presets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs">
          {/* Account Selection */}
          <div className="lg:col-span-6 flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 shrink-0 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Akun COA:</span>
            </span>
            <select
              value={selectedAccountCode}
              onChange={(e) => setSelectedAccountCode(e.target.value)}
              className="flex-1 px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
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

          {/* Period Range Buttons */}
          <div className="lg:col-span-6 flex flex-wrap items-center gap-1.5 justify-start lg:justify-end">
            <span className="text-[11px] font-bold text-slate-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Periode:</span>
            </span>
            <button
              onClick={() => setPeriodType('THIS_MONTH')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                periodType === 'THIS_MONTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Ini (Sep 2026)
            </button>
            <button
              onClick={() => setPeriodType('LAST_MONTH')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                periodType === 'LAST_MONTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setPeriodType('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                periodType === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setPeriodType('CUSTOM')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                periodType === 'CUSTOM'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Kustom
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker Strip */}
        {periodType === 'CUSTOM' && (
          <div className="flex flex-wrap items-center gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <span className="font-bold text-slate-700">Rentang Tanggal Kustom:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <span className="text-slate-400 font-medium">s/d</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}

        {/* Ledger Transactions Table - Responsive with Horizontal Scroll on Mobile */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-28">Tanggal</th>
                <th className="py-2.5 px-3 w-32">No. Jurnal</th>
                <th className="py-2.5 px-3 w-28">No. Bukti/Ref</th>
                <th className="py-2.5 px-3">Keterangan Transaksi</th>
                <th className="py-2.5 px-3 w-28 text-right">Debit (Dr)</th>
                <th className="py-2.5 px-3 w-28 text-right">Kredit (Cr)</th>
                <th className="py-2.5 px-3 w-32 text-right bg-slate-100/60">Saldo Berjalan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {/* Saldo Awal Row */}
              <tr className="bg-blue-50/40 font-bold text-slate-700">
                <td className="py-2 px-3 font-sans font-medium text-slate-500">-</td>
                <td className="py-2 px-3 text-blue-700">SALDO AWAL</td>
                <td className="py-2 px-3 text-slate-400">-</td>
                <td className="py-2 px-3 font-sans font-medium text-slate-600 truncate">
                  Saldo Awal Buku Besar Periode {effectiveStartDate ? formatDateIndo(effectiveStartDate) : 'Awal'}
                </td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-3 text-right text-slate-400">-</td>
                <td className="py-2 px-3 text-right font-black text-slate-900 bg-blue-50/70">
                  {formatRupiah(ledgerData.initial_balance)}
                </td>
              </tr>

              {ledgerData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-sans text-xs">
                    Belum ada mutasi transaksi untuk akun ini pada rentang periode yang dipilih
                  </td>
                </tr>
              ) : (
                ledgerData.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-sans text-slate-600">{formatDateIndo(tx.date)}</td>
                    <td className="py-2 px-3 font-bold text-blue-700 truncate">{tx.journal_number}</td>
                    <td className="py-2 px-3 text-slate-500 truncate">{tx.ref_doc || '-'}</td>
                    <td className="py-2 px-3 font-sans text-slate-800 font-medium truncate">
                      <span>{tx.description}</span>
                      {tx.note && <span className="block text-[10px] text-slate-400 font-normal truncate">{tx.note}</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-blue-600">
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
                <td className="py-2 px-3 text-right text-blue-700">{formatRupiah(ledgerData.total_debit)}</td>
                <td className="py-2 px-3 text-right text-emerald-700">{formatRupiah(ledgerData.total_credit)}</td>
                <td className="py-2 px-3 text-right font-black text-slate-950 bg-blue-50/70">
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
            Total {ledgerData.transactions.length} transaksi mutasi tercatat pada akun ini
          </span>
          <span className="text-[11px] text-slate-400">
            Standar SAK EMKM Omah Ban Cabang 3 Magelang
          </span>
        </div>
      </div>

      {/* Printable Sheet Modal */}
      <LedgerPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        ledgerData={ledgerData}
        accountMeta={selectedAccountMeta}
        startDate={effectiveStartDate}
        endDate={effectiveEndDate}
      />
    </div>
  );
};
