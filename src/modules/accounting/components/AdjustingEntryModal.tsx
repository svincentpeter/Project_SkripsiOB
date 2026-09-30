import React, { useEffect, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { ChartOfAccount } from '../../../shared/types';
import type { AdjustingEntryInput, AdjustingKind } from '../../../shared/types/sakEmkm';
import { currentMonth, localDate, monthLabel, monthRange } from '../../../services/accountingPeriod';
import { MoneyInput } from '../../../shared/components';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface AdjustingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  onSubmit: (input: AdjustingEntryInput) => Promise<boolean>;
}

const COUNTER: Record<AdjustingKind, { code: string; label: string; help: string }> = {
  ACCRUAL: {
    code: '2-1100',
    label: 'Beban Yang Masih Harus Dibayar',
    help: 'Beban bulan ini yang tagihannya belum dibayar (mis. listrik, gaji lembur).',
  },
  PREPAID: {
    code: '1-1100',
    label: 'Beban Dibayar di Muka',
    help: 'Bagian pembayaran di muka yang sudah terpakai bulan ini (mis. sewa toko tahunan).',
  },
};

/** Tanggal 1 bulan berikutnya, dari akhir bulan pilihan (tanggal lokal, bukan UTC). */
const firstDayAfter = (month: string): string => {
  const end = new Date(`${monthRange(month).end}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return localDate(end);
};

export const AdjustingEntryModal: React.FC<AdjustingEntryModalProps> = ({ isOpen, onClose, accounts, onSubmit }) => {
  const [period, setPeriod] = useState(currentMonth());
  const [kind, setKind] = useState<AdjustingKind>('ACCRUAL');
  const [accountCode, setAccountCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [autoReverse, setAutoReverse] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPeriod(currentMonth());
    setKind('ACCRUAL');
    setAccountCode('');
    setAmount(0);
    setDescription('');
    setAutoReverse(true);
    setFormError('');
  }, [isOpen]);

  if (!isOpen) return null;

  // Penyusutan (6-1011) hanya dari register aset tetap; server menolak akun lain selain beban 6-xxxx aktif.
  const expenseAccounts = accounts.filter((a) =>
    a.account_type === 'EXPENSE' && a.account_code.startsWith('6-') && a.account_code !== '6-1011' && a.is_active !== false);
  const counter = COUNTER[kind];
  const reverse = kind === 'ACCRUAL' && autoReverse;
  const selected = expenseAccounts.find((a) => a.account_code === accountCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode) return setFormError('Pilih akun beban.');
    if (amount <= 0) return setFormError('Nominal harus lebih dari nol.');
    if (!description.trim()) return setFormError('Keterangan wajib diisi.');
    setFormError('');
    setSubmitting(true);
    let ok = false;
    try {
      ok = await onSubmit({ period, kind, account_code: accountCode, amount, description: description.trim(), auto_reverse: reverse });
    } finally {
      setSubmitting(false);
    }
    if (ok) onClose();
  };

  const field = 'w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="adjusting-title" className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="adjusting-title" className="text-base font-bold text-slate-900">Jurnal Penyesuaian Akhir Bulan (AJP)</h2>
              <p className="text-xs text-slate-500">Dibukukan server pada tanggal terakhir bulan yang dipilih, nomor referensi AJP.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <legend className="font-bold text-slate-700 mb-1">Jenis penyesuaian</legend>
            {(Object.keys(COUNTER) as AdjustingKind[]).map((k) => (
              <label key={k} className={`p-3 rounded-xl border cursor-pointer ${kind === k ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <input type="radio" name="ajp-kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="mr-1.5" />
                <span className="font-bold">{k === 'ACCRUAL' ? 'Akrual beban' : 'Dibayar di muka terpakai'}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{COUNTER[k].help}</span>
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Bulan</span>
              <input type="month" required value={period} max={currentMonth()} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nominal</span>
              <MoneyInput value={amount} onChange={setAmount} prefix="Rp" className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Akun beban</span>
              <select value={accountCode} onChange={(e) => setAccountCode(e.target.value)} className={field}>
                <option value="">Pilih akun…</option>
                {expenseAccounts.map((a) => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Keterangan</span>
              <input type="text" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Tagihan listrik Maret belum datang" className={field} />
            </label>
          </div>

          {kind === 'ACCRUAL' && (
            <label className="flex items-start gap-2 text-slate-700">
              <input type="checkbox" checked={autoReverse} onChange={(e) => setAutoReverse(e.target.checked)} className="mt-0.5" />
              <span>Balik otomatis tanggal {formatDateIndo(firstDayAfter(period))}, sehingga tagihan yang dibayar bulan depan lewat menu Biaya tidak terhitung dua kali.</span>
            </label>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
            <p>{formatDateIndo(monthRange(period).end)} — Dr {selected ? `${selected.account_code} ${selected.account_name}` : 'akun beban'} {formatRupiah(amount)}</p>
            <p className="pl-6">Cr {counter.code} {counter.label} {formatRupiah(amount)}</p>
            {reverse && <p className="text-slate-500">{formatDateIndo(firstDayAfter(period))} — jurnal pembalik (Dr {counter.code} / Cr beban)</p>}
            <p className="font-sans text-slate-500">Periode {monthLabel(period)} harus belum ditutup.</p>
          </div>

          {formError && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">{formError}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Bukukan AJP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
