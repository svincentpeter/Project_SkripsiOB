import React, { useEffect, useState } from 'react';
import { Landmark, X } from 'lucide-react';
import type { OpeningBalanceAccount, OpeningBalanceInput } from '../../../shared/types';
import { localDate } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: OpeningBalanceInput) => Promise<boolean>;
}

const FIELDS: { code: OpeningBalanceAccount; label: string; hint: string; side: 'DEBIT' | 'CREDIT' }[] = [
  { code: '1-1000', label: 'Kas Laci Kasir', hint: 'Uang tunai fisik di laci pada tanggal saldo awal.', side: 'DEBIT' },
  { code: '1-1001', label: 'Bank BCA Cabang 3', hint: 'Saldo rekening koran pada tanggal yang sama.', side: 'DEBIT' },
  { code: '1-3000', label: 'Peralatan & Mesin Spooring', hint: 'Harga perolehan aset tetap.', side: 'DEBIT' },
  { code: '1-3999', label: 'Akumulasi Penyusutan', hint: 'Isi angka positif; mengurangi nilai aset tetap.', side: 'CREDIT' },
  { code: '3-2000', label: 'Laba Ditahan', hint: 'Isi negatif bila akumulasi rugi.', side: 'CREDIT' },
];

/** Saldo awal sekali pakai untuk akun tanpa buku pembantu; selisihnya menjadi Modal Disetor (3-1000). */
export const OpeningBalanceModal: React.FC<OpeningBalanceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [date, setDate] = useState(localDate());
  const [values, setValues] = useState<Partial<Record<OpeningBalanceAccount, number>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(localDate());
    setValues({});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const capital = FIELDS.reduce((sum, f) => sum + (f.side === 'DEBIT' ? 1 : -1) * (values[f.code] ?? 0), 0);
  const hasValue = FIELDS.some((f) => (values[f.code] ?? 0) !== 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValue) return;
    setSubmitting(true);
    const ok = await onSubmit({ date, balances: values });
    setSubmitting(false);
    if (ok) onClose();
  };

  const field = 'w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-right font-mono';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="opening-title" className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 id="opening-title" className="text-sm font-bold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>Saldo Awal Akun</span>
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
            Diisi sekali saat mulai memakai sistem. Piutang, persediaan, hutang, dan uang muka DP tidak diisi di sini karena nilainya berasal
            dari dokumen masing-masing (persediaan lewat "Saldo Awal Persediaan" di modul inventori).
          </p>
          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Tanggal saldo awal</span>
            <input type="date" required value={date} max={localDate()} onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white" />
          </label>
          {FIELDS.map((f) => (
            <label key={f.code} className="block">
              <span className="block font-bold text-slate-700 mb-1">{f.code} — {f.label}</span>
              <input type="number" step="1" min={f.code === '3-2000' ? undefined : 0} value={values[f.code] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.code]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className={field} />
              <span className="block text-[10px] text-slate-500 mt-0.5">{f.hint}</span>
            </label>
          ))}
          <div className={`p-3 rounded-xl border font-bold ${capital >= 0 ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            Modal Disetor (3-1000) dihitung otomatis: {formatRupiah(capital)}
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={!hasValue || submitting}
              className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Bukukan Saldo Awal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
