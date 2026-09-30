import React, { useEffect, useState } from 'react';
import { Ban, RotateCcw, X } from 'lucide-react';
import { inventoryApi } from '../../../services/api';
import type { ApiPurchase } from '../../../services/api';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

export interface PurchaseReturnPayload {
  quantity: number;
  reason: string;
  refund_account_code?: '1-1000' | '1-1001';
}

interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturn: (purchaseId: number, payload: PurchaseReturnPayload) => Promise<boolean>;
  onCancelReceipt: (purchaseId: number, reason: string) => Promise<boolean>;
}

type PendingAction = { purchase: ApiPurchase; kind: 'RETURN' | 'CANCEL' };

const STATUS_LABEL: Record<ApiPurchase['status'], string> = {
  LUNAS: 'Lunas',
  BELUM_LUNAS: 'Belum Lunas',
  SEBAGIAN: 'Sebagian',
  BATAL: 'Batal',
};

/**
 * Daftar penerimaan barang (GR) untuk retur ke supplier atau pembatalan. Aturannya (hanya unit yang masih di gudang,
 * hutang dikurangi dulu, pembatalan hanya untuk GR yang belum tersentuh) ditegakkan server.
 */
export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({ isOpen, onClose, onReturn, onCancelReceipt }) => {
  const [rows, setRows] = useState<ApiPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [refundAccount, setRefundAccount] = useState<'1-1000' | '1-1001'>('1-1001');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError('');
    inventoryApi
      .listPurchases('all')
      .then(setRows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Gagal memuat penerimaan barang.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  if (!isOpen) return null;

  // Form yang belum dikirim tidak ikut terbawa saat modal dibuka lagi.
  const close = () => {
    setPending(null);
    onClose();
  };

  const start = (purchase: ApiPurchase, kind: PendingAction['kind']) => {
    setPending({ purchase, kind });
    setQuantity(1);
    setReason('');
    setFormError('');
    setRefundAccount(purchase.payment_method === 'TUNAI' ? '1-1000' : '1-1001');
  };

  const submit = async () => {
    if (!pending) return;
    if (reason.trim().length < 5) {
      setFormError('Alasan minimal 5 karakter.');
      return;
    }
    setBusy(true);
    const ok =
      pending.kind === 'RETURN'
        ? await onReturn(pending.purchase.id, { quantity, reason: reason.trim(), refund_account_code: refundAccount })
        : await onCancelReceipt(pending.purchase.id, reason.trim());
    setBusy(false);
    if (ok) {
      setPending(null);
      load();
    }
  };

  const maxQty = pending?.purchase.returnable_qty ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-return-title"
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="purchase-return-title" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Retur Pembelian &amp; Batal Penerimaan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Retur mengurangi hutang supplier lebih dulu, sisanya dikembalikan ke kas/bank. Pembatalan hanya untuk
              penerimaan yang belum terjual, belum dibayar, dan belum diretur.
            </p>
          </div>
          <button type="button" onClick={close} aria-label="Tutup" className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadError && <p className="text-xs font-semibold text-red-600">{loadError}</p>}
        {loading && <p className="text-xs text-slate-500">Memuat penerimaan barang…</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-1.5 font-bold">No. GR</th>
                <th className="py-1.5 font-bold">Tanggal</th>
                <th className="py-1.5 font-bold">Supplier</th>
                <th className="py-1.5 font-bold">Produk</th>
                <th className="py-1.5 font-bold text-right">Qty / Sisa</th>
                <th className="py-1.5 font-bold text-right">Total</th>
                <th className="py-1.5 font-bold text-right">Diretur</th>
                <th className="py-1.5 font-bold">Status</th>
                <th className="py-1.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-1.5 font-mono font-bold text-slate-800">{p.purchase_number}</td>
                  <td className="py-1.5">{formatDateIndo(p.purchase_date)}</td>
                  <td className="py-1.5">{p.supplier_name}</td>
                  <td className="py-1.5">{p.product_name ?? '-'}</td>
                  <td className="py-1.5 text-right font-mono">
                    {p.quantity ?? 0} / {p.returnable_qty ?? 0}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatRupiah(p.total_amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatRupiah(p.returned_amount ?? 0)}</td>
                  <td className="py-1.5">
                    {p.payment_method} · {STATUS_LABEL[p.status]}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => start(p, 'RETURN')}
                      disabled={p.status === 'BATAL' || (p.returnable_qty ?? 0) === 0}
                      className="px-2 py-1 mr-1 rounded-lg border border-amber-300 text-amber-800 font-bold hover:bg-amber-50 disabled:opacity-40"
                    >
                      Retur
                    </button>
                    <button
                      type="button"
                      onClick={() => start(p, 'CANCEL')}
                      disabled={p.status === 'BATAL' || (p.returned_amount ?? 0) > 0 || p.returnable_qty !== p.quantity}
                      className="px-2 py-1 rounded-lg border border-red-300 text-red-700 font-bold hover:bg-red-50 disabled:opacity-40"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-3 text-center text-slate-500">
                    Belum ada penerimaan barang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pending && (
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              {pending.kind === 'RETURN' ? (
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Ban className="w-3.5 h-3.5 text-red-600" />
              )}
              {pending.kind === 'RETURN' ? 'Retur ke supplier' : 'Batalkan penerimaan'} {pending.purchase.purchase_number}
            </p>
            {pending.kind === 'RETURN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-slate-600">
                  Jumlah (maks. {maxQty})
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))}
                    className="mt-0.5 w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-600">
                  Refund (bila hutang sudah lunas)
                  <select
                    value={refundAccount}
                    onChange={(e) => setRefundAccount(e.target.value as '1-1000' | '1-1001')}
                    className="mt-0.5 w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="1-1000">Kas Laci (1-1000)</option>
                    <option value="1-1001">Bank BCA (1-1001)</option>
                  </select>
                </label>
              </div>
            )}
            <label className="block text-[11px] font-bold text-slate-600">
              Alasan <span className="text-red-500">*</span>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFormError('');
                }}
                rows={2}
                placeholder={pending.kind === 'RETURN' ? 'Contoh: Ban cacat produksi, dikembalikan ke distributor' : 'Contoh: Salah input faktur'}
                className="mt-0.5 w-full p-2 bg-white border border-slate-300 rounded-lg resize-none"
              />
            </label>
            {formError && <p className="text-[11px] font-semibold text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className={`px-3 py-1.5 text-xs font-extrabold text-white rounded-lg disabled:opacity-50 ${
                  pending.kind === 'CANCEL' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {busy ? 'Memproses…' : pending.kind === 'RETURN' ? 'Bukukan Retur' : 'Batalkan Penerimaan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
