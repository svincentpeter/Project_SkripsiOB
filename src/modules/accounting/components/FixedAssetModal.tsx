import React, { useEffect, useState } from 'react';
import { Factory, X } from 'lucide-react';
import type { FixedAssetCategory, FixedAssetFunding, FixedAssetInput } from '../../../shared/types/sakEmkm';
import { currentMonth, localDate } from '../../../services/accountingPeriod';
import { MoneyInput } from '../../../shared/components';
import { formatRupiah } from '../../../shared/utils/formatters';

export const FIXED_ASSET_CATEGORIES: Record<FixedAssetCategory, string> = {
  PERALATAN_BENGKEL: 'Peralatan & Mesin Bengkel',
  INVENTARIS_TOKO: 'Inventaris & Perabot Toko',
  KENDARAAN: 'Kendaraan',
};

const FUNDING_LABEL: Record<FixedAssetFunding, string> = {
  TUNAI: 'Dibeli tunai dari kas laci (Cr 1-1000)',
  TRANSFER: 'Dibeli via transfer Bank BCA (Cr 1-1001)',
  OPENING: 'Sudah tercatat di Saldo Awal 1-3000/1-3999 (tanpa jurnal baru)',
  MODAL: 'Setoran aset pemilik / terlewat dari Saldo Awal (Cr 3-1000 Modal)',
};

interface FixedAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: FixedAssetInput) => Promise<boolean>;
}

const emptyForm = (): FixedAssetInput => ({
  name: '',
  category: 'PERALATAN_BENGKEL',
  acquisition_date: localDate(),
  acquisition_cost: 0,
  residual_value: 0,
  useful_life_months: 48,
  funding: 'TUNAI',
  depreciation_start: currentMonth(),
  opening_accumulated_depreciation: 0,
  notes: '',
});

export const FixedAssetModal: React.FC<FixedAssetModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState<FixedAssetInput>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset hanya saat modal dibuka.
  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm());
    setFormError('');
  }, [isOpen]);

  if (!isOpen) return null;

  // Aset yang tidak dibeli sekarang membawa bulan mulai penyusutan & akumulasi sebelumnya sendiri.
  const opening = form.funding === 'OPENING' || form.funding === 'MODAL';
  const set = (patch: Partial<FixedAssetInput>) => setForm((f) => ({ ...f, ...patch }));
  const base = form.acquisition_cost - form.residual_value - (opening ? form.opening_accumulated_depreciation ?? 0 : 0);
  const monthly = form.useful_life_months > 0 ? Math.floor((base * 100) / form.useful_life_months) / 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Nama aset wajib diisi.');
    if (form.acquisition_cost <= 0) return setFormError('Harga perolehan harus lebih dari nol.');
    if (base < 0) return setFormError('Nilai residu ditambah akumulasi awal melebihi harga perolehan.');
    setFormError('');
    setSubmitting(true);
    const ok = await onSubmit({
      ...form,
      name: form.name.trim(),
      notes: form.notes?.trim() || undefined,
      // Kolom khusus saldo awal tidak dikirim untuk aset yang dibeli (server menolaknya).
      depreciation_start: opening ? form.depreciation_start : undefined,
      opening_accumulated_depreciation: opening ? form.opening_accumulated_depreciation : undefined,
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
      <div role="dialog" aria-modal="true" aria-labelledby="fixed-asset-title" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Factory className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="fixed-asset-title" className="text-base font-bold text-slate-900">Catat Aset Tetap</h2>
              <p className="text-xs text-slate-500">Kode AT dan jurnal perolehan dibuat server. Penyusutan garis lurus mulai bulan perolehan.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Nama aset</span>
              <input type="text" required maxLength={150} value={form.name} onChange={(e) => set({ name: e.target.value })}
                placeholder="Contoh: Mesin spooring Hunter" className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Kategori</span>
              <select value={form.category} onChange={(e) => set({ category: e.target.value as FixedAssetCategory })} className={field}>
                {(Object.keys(FIXED_ASSET_CATEGORIES) as FixedAssetCategory[]).map((c) => (
                  <option key={c} value={c}>{FIXED_ASSET_CATEGORIES[c]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal perolehan</span>
              <input type="date" required value={form.acquisition_date} max={localDate()} onChange={(e) => set({ acquisition_date: e.target.value })} className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Harga perolehan</span>
              <MoneyInput value={form.acquisition_cost} onChange={(v) => set({ acquisition_cost: v })} prefix="Rp" className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nilai residu</span>
              <MoneyInput value={form.residual_value} onChange={(v) => set({ residual_value: v })} prefix="Rp" className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">{opening ? 'Sisa umur manfaat (bulan)' : 'Umur manfaat (bulan)'}</span>
              <input type="number" min={1} max={600} required value={form.useful_life_months || ''}
                onChange={(e) => set({ useful_life_months: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${field} font-mono`} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Sumber dana</span>
              <select value={form.funding} onChange={(e) => set({ funding: e.target.value as FixedAssetFunding })} className={field}>
                {(Object.keys(FUNDING_LABEL) as FixedAssetFunding[]).map((f) => (
                  <option key={f} value={f}>{FUNDING_LABEL[f]}</option>
                ))}
              </select>
            </label>
            {opening && (
              <>
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Mulai disusutkan sistem (bulan)</span>
                  <input type="month" required value={form.depreciation_start ?? currentMonth()} onChange={(e) => set({ depreciation_start: e.target.value })} className={field} />
                </label>
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Akumulasi penyusutan sebelumnya</span>
                  <MoneyInput value={form.opening_accumulated_depreciation ?? 0} onChange={(v) => set({ opening_accumulated_depreciation: v })} prefix="Rp" className={field} />
                </label>
              </>
            )}
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Catatan (opsional)</span>
              <input type="text" maxLength={255} value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} className={field} />
            </label>
          </div>

          <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
            Perkiraan penyusutan per bulan <strong className="font-mono">{formatRupiah(Math.max(0, monthly))}</strong>
            {form.funding === 'OPENING'
              ? ' atas sisa nilai buku dikurangi residu. Tidak ada jurnal perolehan: nilainya sudah masuk Saldo Awal.'
              : form.funding === 'MODAL'
                ? ' atas sisa nilai buku dikurangi residu. Jurnal: Dr 1-3000 harga perolehan / Cr 1-3999 akumulasi sebelumnya / Cr 3-1000 Modal sebesar nilai bukunya (tanpa uang keluar).'
                : `. Jurnal perolehan: Dr 1-3000 / Cr ${form.funding === 'TUNAI' ? '1-1000 Kas Laci' : '1-1001 Bank BCA'}.`}
          </p>

          {formError && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">{formError}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Simpan Aset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
