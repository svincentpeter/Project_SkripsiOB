import React, { useState } from 'react';
import { X, Check, AlertCircle, Edit3, Tag, Layers } from 'lucide-react';
import { formatRupiah } from '../../../shared/utils/formatters';

export type InlineEditField = 'opening_stock' | 'batch_cost' | 'old_stock_tag';

interface StockLedgerInlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  field: InlineEditField;
  currentValue: any;
  referencePrice?: number;
  batchId?: string | number | null;
  onSave: (payload: { field: InlineEditField; value: any; reference_price?: number; batch_id?: string | number | null }) => Promise<void>;
}

export const StockLedgerInlineModal: React.FC<StockLedgerInlineModalProps> = ({
  isOpen,
  onClose,
  productName,
  field,
  currentValue,
  referencePrice = 0,
  batchId,
  onSave,
}) => {
  const [numValue, setNumValue] = useState<number>(Number(currentValue) || 0);
  const [isOldStock, setIsOldStock] = useState<boolean>(Boolean(currentValue));
  const [refPrice, setRefPrice] = useState<number>(referencePrice || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (field === 'opening_stock') {
        await onSave({ field, value: numValue });
      } else if (field === 'batch_cost') {
        await onSave({ field, value: numValue, batch_id: batchId });
      } else if (field === 'old_stock_tag') {
        await onSave({ field, value: isOldStock, reference_price: refPrice });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const delta = field === 'opening_stock' ? numValue - (Number(currentValue) || 0) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-400/30">
              {field === 'opening_stock' && <Layers className="w-4 h-4" />}
              {field === 'batch_cost' && <Edit3 className="w-4 h-4" />}
              {field === 'old_stock_tag' && <Tag className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm">
                {field === 'opening_stock' && 'Koreksi Stok Awal (Opname)'}
                {field === 'batch_cost' && 'Koreksi Modal HPP Batch'}
                {field === 'old_stock_tag' && 'Tandai Stok Lama / Promo'}
              </h3>
              <p className="text-[11px] text-slate-300 line-clamp-1">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {field === 'opening_stock' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Stok Awal Tercatat:</span>
                <span className="font-bold font-mono text-slate-900">{currentValue} pcs</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stok Awal Sebenarnya (Fisik Riil):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={numValue}
                    onChange={(e) => setNumValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full pl-3 pr-12 py-2.5 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl text-sm font-bold font-mono outline-hidden"
                    required
                    autoFocus
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium">pcs</span>
                </div>
              </div>

              {delta !== 0 && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                    delta > 0
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  <span>Penyesuaian (&Delta; Delta):</span>
                  <span className="font-mono font-extrabold text-sm">
                    {delta > 0 ? `+${delta}` : delta} pcs ({delta > 0 ? 'Bertambah' : 'Berkurang'})
                  </span>
                </div>
              )}

              <p className="text-[11px] text-slate-500 italic">
                * Sistem otomatis memperbarui kartu stok penyesuaian opname dan menyinkronkan lapisan batch.
              </p>
            </div>
          )}

          {field === 'batch_cost' && (
            <div className="space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Modal Saat Ini:</span>
                <span className="font-bold font-mono text-slate-900">{formatRupiah(currentValue)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nilai Modal Baru (Rp):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={numValue}
                  onChange={(e) => setNumValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-3 py-2.5 bg-white border-2 border-indigo-200 focus:border-indigo-600 rounded-xl text-sm font-bold font-mono outline-hidden"
                  required
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Koreksi modal akan dicatat dalam audit trail harga dan memperbarui valuasi HPP gudang.
              </p>
            </div>
          )}

          {field === 'old_stock_tag' && (
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={isOldStock}
                  onChange={(e) => setIsOldStock(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Tandai Stok Lama / Promo</span>
                  <span className="text-slate-500 text-[11px]">
                    Nama ban akan ditampilkan dengan warna merah tebal di tabel.
                  </span>
                </div>
              </label>

              {isOldStock && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Harga Normal Acuan / Coret (Rp):
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    placeholder="Contoh: 1250000"
                    value={refPrice || ''}
                    onChange={(e) => setRefPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 focus:border-rose-500 rounded-xl text-sm font-bold font-mono outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Badge @{formatRupiah(refPrice)} akan ditampilkan di sebelah nama ban.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
