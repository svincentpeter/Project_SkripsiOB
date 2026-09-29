import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { accountingApi } from '../../../services/api';
import { localDate, monthLabel, monthRange } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface PeriodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedPeriod: string;
  lockDate: string | null;
  onConfirm: (period: string, notes: string) => Promise<boolean>;
}

export const PeriodClosingModal: React.FC<PeriodClosingModalProps> = ({ isOpen, onClose, suggestedPeriod, lockDate, onConfirm }) => {
  const [period, setPeriod] = useState(suggestedPeriod);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPeriod(suggestedPeriod);
    setNotes('');
    setConfirmed(false);
  }, [isOpen, suggestedPeriod]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const range = monthRange(period);
  const preview = useServerData(
    () => (isOpen ? accountingApi.financialStatements({ start_date: range.start, end_date: range.end }) : Promise.resolve(null)),
    [isOpen, period],
  );

  if (!isOpen) return null;

  const blocker =
    range.end >= localDate()
      ? `${monthLabel(period)} belum berakhir; tutup buku hanya untuk bulan yang sudah lewat.`
      : lockDate !== null && range.end <= lockDate
        ? `Periode ini sudah terkunci (s/d ${formatDateIndo(lockDate)}).`
        : null;
  const statement = preview.data?.income_statement;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || blocker) return;
    setSubmitting(true);
    const ok = await onConfirm(period, notes.trim());
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="closing-title" className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 id="closing-title" className="text-sm font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Tutup Buku Periode</span>
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Bulan yang ditutup</span>
            <input type="month" required value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white" />
          </label>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-slate-700 block">Laba rugi {monthLabel(period)}</span>
            <ServerStatus loading={preview.loading && !preview.data} error={preview.error} onRetry={preview.reload} />
            {statement && (
              <dl className="grid grid-cols-2 gap-y-1">
                <dt>Pendapatan bersih</dt>
                <dd className="text-right font-mono">{formatRupiah(statement.net_revenue)}</dd>
                <dt>Beban pokok penjualan</dt>
                <dd className="text-right font-mono">({formatRupiah(statement.cost_of_sales.total)})</dd>
                <dt>Beban operasional</dt>
                <dd className="text-right font-mono">({formatRupiah(statement.operating_expenses.total)})</dd>
                <dt className="font-black">Laba (rugi) bersih</dt>
                <dd className="text-right font-mono font-black">{formatRupiah(statement.net_income)}</dd>
              </dl>
            )}
          </div>

          <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
            Server membukukan jurnal penutup bertanggal {formatDateIndo(range.end)} yang memindahkan saldo seluruh akun pendapatan dan beban
            sampai tanggal itu ke Laba Ditahan (3-2000), termasuk bulan sebelumnya yang belum ditutup. Setelah itu transaksi bertanggal sampai
            {' '}{formatDateIndo(range.end)} ditolak. Hanya pemilik yang dapat membuka kembali periode terakhir.
          </p>

          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Catatan (opsional)</span>
            <input type="text" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white" />
          </label>

          {blocker && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">{blocker}</p>}

          <label className="flex items-start gap-2 text-slate-700">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>Saya sudah memeriksa laporan periode ini dan ingin menutupnya.</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={!confirmed || blocker !== null || submitting}
              className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-black rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Memproses…' : 'Tutup Buku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
