import React, { useState } from 'react';
import { X, Lock, AlertTriangle, CheckCircle2, DollarSign, ArrowRight, ShieldCheck } from 'lucide-react';
import { JournalEntry, AccountingPeriodInfo } from '../../../shared/types';
import { calculateDynamicSakEmkmFinancials } from '../../../services/accountingService';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface PeriodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  journals: JournalEntry[];
  initialBalances: Record<string, number>;
  periodInfo: AccountingPeriodInfo;
  onConfirmClosePeriod: (closedBy: string, notes: string) => void;
}

export const PeriodClosingModal: React.FC<PeriodClosingModalProps> = ({
  isOpen,
  onClose,
  journals,
  initialBalances,
  periodInfo,
  onConfirmClosePeriod,
}) => {
  const [closedBy, setClosedBy] = useState('Supervisor Keuangan');
  const [notes, setNotes] = useState('Tutup buku bulanan SAK EMKM terotorisasi');
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isOpen) return null;

  const financials = calculateDynamicSakEmkmFinancials(journals, initialBalances);
  const netIncome = financials.netIncome;
  const isProfit = netIncome >= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    onConfirmClosePeriod(closedBy, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wide">Tutup Buku Periode Akuntansi</h2>
              <p className="text-[11px] text-slate-400">
                Periode: <strong className="text-white">{periodInfo.period_name} ({periodInfo.period_id})</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Prosedur Siklus Akuntansi: Jurnal Penutup (Closing Entries)</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Tutup buku akan secara otomatis mengenolkan seluruh saldo akun Pendapatan (4-xxxx), HPP (5-xxxx), dan Beban Operasional (6-xxxx), serta memindahkan laba/rugi bersih berjalan ke akun <strong className="font-mono">3-2000 Laba Ditahan Cabang 3</strong>.
              </p>
            </div>
          </div>

          {/* Financial Calculation Preview Cards */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Ringkasan Saldo Akun Nominal yang Ditutup:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Pendapatan Bersih (4-xxxx)</span>
                <span className="text-sm font-bold font-mono text-emerald-700 block">
                  {formatRupiah(financials.netSales)}
                </span>
                <span className="text-[10px] text-slate-400">Debit jurnal penutup</span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase">Total HPP & Beban (5 & 6-xxxx)</span>
                <span className="text-sm font-bold font-mono text-rose-700 block">
                  {formatRupiah(financials.totalHpp + financials.totalExpenses)}
                </span>
                <span className="text-[10px] text-slate-400">Kredit jurnal penutup</span>
              </div>
            </div>

            {/* Net Income Result to Retained Earnings */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              isProfit 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold block">
                    {isProfit ? 'Laba Bersih Ditransfer ke Laba Ditahan' : 'Rugi Bersih Ditransfer ke Laba Ditahan'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Akun 3-2000 Laba Ditahan Cabang 3</span>
                </div>
              </div>
              <span className={`text-base font-black font-mono ${isProfit ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatRupiah(Math.abs(netIncome))}
              </span>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Petugas / Otorisasi Tutup Buku
              </label>
              <input
                type="text"
                required
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                placeholder="Contoh: Budi Santoso (Supervisor Keuangan)"
                className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-light"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Tutup Buku
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan penutupan periode buku..."
                className="w-full px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-light"
              />
            </div>

            {/* Confirmation Checkbox */}
            <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-600 leading-snug">
                Saya mengonfirmasi bahwa seluruh bukti transaksi kas, penjualan, dan beban periode ini telah diperiksa dan siap ditutup secara permanen.
              </span>
            </label>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <ExportMenu reportId="period_closing" data={periodInfo} ctx={{ periodLabel: periodInfo.period_name }} />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isConfirmed}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Proses Tutup Buku & Buat Jurnal Penutup</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
