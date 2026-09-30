import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Scale, Trash2, X } from 'lucide-react';
import { ChartOfAccount, ManualJournalPayload } from '../../../shared/types';
import { localDate } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  onSubmit: (payload: ManualJournalPayload) => Promise<boolean>;
}

/** Akun kontrol hanya berubah lewat dokumen sumbernya (server juga menolaknya). */
const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004', '1-3000', '1-3999'];

type Line = { account_code: string; debit: number; credit: number; note: string };

const emptyLines = (): Line[] => [
  { account_code: '', debit: 0, credit: 0, note: '' },
  { account_code: '', debit: 0, credit: 0, note: '' },
];

const toAmount = (value: string): number => Math.max(0, Number(value) || 0);

export const ManualJournalModal: React.FC<ManualJournalModalProps> = ({ isOpen, onClose, accounts, onSubmit }) => {
  const [date, setDate] = useState(localDate());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>(emptyLines);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset hanya saat modal dibuka; jangan bergantung pada onClose (fungsi baru di setiap render induk).
  useEffect(() => {
    if (!isOpen) return;
    setDate(localDate());
    setDescription('');
    setLines(emptyLines());
    setFormError('');
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

  // Akun nonaktif ditolak server, jadi tidak ditawarkan.
  const selectable = accounts.filter((a) => a.is_active !== false && !CONTROL_ACCOUNTS.includes(a.account_code));
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit > 0 && Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const update = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setFormError('Keterangan jurnal wajib diisi.');
    if (lines.some((l) => !l.account_code)) return setFormError('Pilih akun untuk setiap baris.');
    if (lines.some((l) => (l.debit > 0) === (l.credit > 0))) return setFormError('Setiap baris harus berisi debit atau kredit (salah satu saja).');
    if (!isBalanced) return setFormError(`Jurnal belum seimbang: debit ${formatRupiah(totalDebit)} vs kredit ${formatRupiah(totalCredit)}.`);

    setFormError('');
    setSubmitting(true);
    const ok = await onSubmit({
      date,
      description: description.trim(),
      items: lines.map((l) => ({ account_code: l.account_code, debit: l.debit, credit: l.credit, note: l.note.trim() || undefined })),
    });
    setSubmitting(false);
    if (ok) onClose();
  };

  const field = 'w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="manual-journal-title" className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="manual-journal-title" className="text-base font-bold text-slate-900">Jurnal Penyesuaian Manual</h2>
              <p className="text-xs text-slate-500">Nomor jurnal & referensi MEMO dibuat server. Akun persediaan, hutang, aset tetap, dan akun nonaktif tidak tersedia.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal</span>
              <input type="date" required value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Keterangan</span>
              <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: koreksi salah akun beban listrik" className={field} />
            </label>
          </div>

          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-700">
              <tr>
                <th className="py-2 px-2 text-left">Akun</th>
                <th className="py-2 px-2 text-right w-32">Debit</th>
                <th className="py-2 px-2 text-right w-32">Kredit</th>
                <th className="py-2 px-2 text-left">Catatan baris</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="p-1.5">
                    <select aria-label={`Akun baris ${i + 1}`} value={line.account_code} onChange={(e) => update(i, { account_code: e.target.value })} className={field}>
                      <option value="">Pilih akun…</option>
                      {selectable.map((a) => (
                        <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input type="number" min={0} step="1" aria-label={`Debit baris ${i + 1}`} value={line.debit || ''}
                      onChange={(e) => update(i, { debit: toAmount(e.target.value) })} className={`${field} text-right font-mono`} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" min={0} step="1" aria-label={`Kredit baris ${i + 1}`} value={line.credit || ''}
                      onChange={(e) => update(i, { credit: toAmount(e.target.value) })} className={`${field} text-right font-mono`} />
                  </td>
                  <td className="p-1.5">
                    <input type="text" aria-label={`Catatan baris ${i + 1}`} value={line.note} onChange={(e) => update(i, { note: e.target.value })} className={field} />
                  </td>
                  <td className="p-1.5 text-center">
                    <button type="button" aria-label={`Hapus baris ${i + 1}`} disabled={lines.length <= 2}
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="py-2 px-2">Total</td>
                <td className="py-2 px-2 text-right font-mono">{formatRupiah(totalDebit)}</td>
                <td className="py-2 px-2 text-right font-mono">{formatRupiah(totalCredit)}</td>
                <td colSpan={2} className={`py-2 px-2 ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isBalanced ? 'Seimbang' : `Selisih ${formatRupiah(Math.abs(totalDebit - totalCredit))}`}
                </td>
              </tr>
            </tfoot>
          </table>

          <button type="button" onClick={() => setLines((prev) => [...prev, { account_code: '', debit: 0, credit: 0, note: '' }])}
            className="px-3 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah baris</span>
          </button>

          {formError && (
            <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Bukukan Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
