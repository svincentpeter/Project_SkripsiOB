import React, { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { PosTransaction } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

export interface SalesReturnItemInput {
  sale_detail_id: number;
  quantity: number;
}

interface SalesReturnModalProps {
  transaction: PosTransaction;
  onClose: () => void;
  onSubmit: (items: SalesReturnItemInput[], reason: string) => Promise<boolean>;
}

/**
 * Retur sebagian nota: kasir memilih jumlah per baris. Nilai refund dihitung server (termasuk bagian diskon nota)
 * dan mengikuti cara bayar nota: bagian tunai dari laci (shift harus dibuka), bagian QRIS/transfer dari Bank BCA.
 * Selain pemilik hanya nota berumur ≤ 30 hari.
 */
export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({ transaction, onClose, onSubmit }) => {
  const lines = (transaction.return_lines ?? []).filter((l) => l.quantity > l.returned_qty);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const items = lines
    .map((l) => ({ sale_detail_id: l.sale_detail_id, quantity: qty[l.sale_detail_id] ?? 0 }))
    .filter((i) => i.quantity > 0);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Isi jumlah retur minimal pada satu baris.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Alasan retur minimal 5 karakter.');
      return;
    }
    setBusy(true);
    const ok = await onSubmit(items, reason.trim());
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-return-title"
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 id="sales-return-title" className="text-sm font-extrabold text-slate-900">
              Retur Penjualan {transaction.invoice_number}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Refund mengikuti cara bayar nota: bagian tunai dari laci kasir, bagian QRIS/transfer dari Bank BCA. Ban kembali ke
              batch FIFO asalnya dengan modal aslinya. Selain pemilik hanya nota berumur paling lama 30 hari.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            Semua baris nota ini sudah diretur.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-1.5 font-bold">Item</th>
                <th className="py-1.5 font-bold text-right">Terjual</th>
                <th className="py-1.5 font-bold text-right">Sudah Retur</th>
                <th className="py-1.5 font-bold text-right">Retur Sekarang</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const max = l.quantity - l.returned_qty;
                return (
                  <tr key={l.sale_detail_id} className="border-b border-slate-50">
                    <td className="py-1.5 font-semibold text-slate-800">{l.name}</td>
                    <td className="py-1.5 text-right font-mono">{l.quantity}</td>
                    <td className="py-1.5 text-right font-mono">{l.returned_qty}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={qty[l.sale_detail_id] ?? 0}
                        aria-label={`Jumlah retur ${l.name}`}
                        onChange={(e) => {
                          const n = Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0));
                          setQty((prev) => ({ ...prev, [l.sale_detail_id]: n }));
                          setError('');
                        }}
                        className="w-16 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {(transaction.returned_amount ?? 0) > 0 && (
          <p className="text-[11px] text-slate-500">Refund sebelumnya: {formatRupiah(transaction.returned_amount ?? 0)}</p>
        )}

        <div className="space-y-1">
          <label htmlFor="sales-return-reason" className="block text-xs font-bold text-slate-800">
            Alasan Retur <span className="text-red-500">*</span>
          </label>
          <textarea
            id="sales-return-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            rows={2}
            placeholder="Contoh: Ukuran ban tidak cocok dengan velg pelanggan"
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 resize-none"
          />
          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || lines.length === 0}
            className="px-4 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{busy ? 'Memproses…' : 'Bukukan Retur'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
