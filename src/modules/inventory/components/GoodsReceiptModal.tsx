import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  X, 
  Package, 
  Layers, 
  FileSpreadsheet, 
  Calendar, 
  Building2, 
  AlertTriangle, 
  DollarSign, 
  CheckCircle2, 
  TrendingUp,
  UserCheck,
  Clock
} from 'lucide-react';
import { GoodsReceiptInput, PaymentTerms, StockMutation, TireProduct, SupplierItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  preselectedProduct?: TireProduct | null;
  products: TireProduct[];
  suppliers?: SupplierItem[];
  existingMutations: StockMutation[];
  onClose: () => void;
  onSubmitReceipt: (input: GoodsReceiptInput) => void;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  preselectedProduct,
  products,
  suppliers = [],
  onClose,
  onSubmitReceipt,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [incomingQty, setIncomingQty] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(750000);
  const [supplierName, setSupplierName] = useState<string>('PT Bridgestone Tire Indonesia');
  const [supplierInvoice, setSupplierInvoice] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('TEMPO_HUTANG');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('Restock pengiriman distributor resmi Cabang 3');
  const [operator, setOperator] = useState<string>('Gudang - Bambang');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.is_active !== false);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    setReceiptDate(todayStr);

    const due = new Date();
    due.setDate(due.getDate() + 30);
    setDueDate(due.toISOString().split('T')[0]);

    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
      setUnitCost(preselectedProduct.product_cost || preselectedProduct.cost_price || 750000);
      setSupplierName(
        suppliers.find((s) => s.supplier_name.toLowerCase().includes(preselectedProduct.brand.toLowerCase()))?.supplier_name ||
        `PT ${preselectedProduct.brand} Tire Indonesia`
      );
    } else if (activeProducts.length > 0) {
      setSelectedProductId(activeProducts[0].id);
      setUnitCost(activeProducts[0].product_cost || activeProducts[0].cost_price || 750000);
      if (suppliers.length > 0) {
        setSupplierName(suppliers[0].supplier_name);
      }
    }
  }, [isOpen, preselectedProduct, products, suppliers]);

  if (!isOpen) return null;

  const currentProduct = activeProducts.find((p) => p.id === selectedProductId);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedProductId(id);
    const prod = activeProducts.find((p) => p.id === id);
    if (prod) {
      setUnitCost(prod.product_cost || prod.cost_price || 0);
      const matchedSup = suppliers.find((s) => s.supplier_name.toLowerCase().includes(prod.brand.toLowerCase()));
      if (matchedSup) {
        setSupplierName(matchedSup.supplier_name);
      }
    }
  };

  const totalReceiptValue = incomingQty * unitCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProductId) {
      setErrorMsg('Pilih produk yang akan diterima.');
      return;
    }

    if (incomingQty <= 0) {
      setErrorMsg('Jumlah unit masuk harus lebih besar dari 0.');
      return;
    }

    if (unitCost <= 0) {
      setErrorMsg('Harga modal beli (HPP) per unit harus lebih besar dari 0.');
      return;
    }

    if (!supplierName.trim()) {
      setErrorMsg('Nama distributor / supplier wajib diisi.');
      return;
    }

    const input: GoodsReceiptInput = {
      product_id: selectedProductId,
      incoming_qty: incomingQty,
      unit_cost: unitCost,
      supplier_name: supplierName.trim(),
      supplier_invoice: supplierInvoice.trim() || undefined,
      receipt_date: receiptDate,
      payment_terms: paymentTerms,
      due_date: paymentTerms === 'TEMPO_HUTANG' ? dueDate : undefined,
      notes: notes.trim() || undefined,
      operator: operator.trim() || 'Petugas Gudang OB3',
    };

    onSubmitReceipt(input);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600/20 text-emerald-400">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Penerimaan Barang Masuk (Restock)</h2>
              <p className="text-xs text-slate-400">
                Mencatat stok masuk (Ban/Velg/Ban Dalam), layer batch FIFO baru, & jurnal akuntansi.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Pilih Produk yang Diterima
            </label>
            <select
              value={selectedProductId}
              onChange={handleProductChange}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-hidden focus:border-emerald-500"
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.product_name} — (Stok Saat Ini: {p.stock || p.product_quantity || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Distributor / Supplier Resmi
              </label>
              <div className="space-y-2">
                {suppliers.length > 0 ? (
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-hidden focus:border-emerald-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.supplier_name}>
                        {s.supplier_name}
                      </option>
                    ))}
                    <option value="Lainnya">Ketik Manual Distributor Lain...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    placeholder="e.g. PT Bridgestone Tire Indonesia"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-hidden focus:border-emerald-500"
                  />
                )}
                {supplierName === 'Lainnya' && (
                  <input
                    type="text"
                    placeholder="Nama distributor baru..."
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-xs"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                No. Faktur / Surat Jalan Supplier
              </label>
              <input
                type="text"
                value={supplierInvoice}
                onChange={(e) => setSupplierInvoice(e.target.value)}
                placeholder="e.g. INV-SJ/2026/09/8812"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Jumlah Masuk (Unit)
              </label>
              <input
                type="number"
                min="1"
                value={incomingQty}
                onChange={(e) => setIncomingQty(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Harga Modal Beli (HPP) / Unit
              </label>
              <input
                type="text"
                value={formatRupiah(unitCost)}
                onChange={(e) => setUnitCost(parseRupiahInput(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-emerald-400 font-bold text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tanggal Penerimaan
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" /> Syarat Pembayaran Pengadaan
              </label>
              <span className="text-xs text-slate-400">Total Faktur: <b className="text-emerald-400">{formatRupiah(totalReceiptValue)}</b></span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentTerms('TEMPO_HUTANG')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  paymentTerms === 'TEMPO_HUTANG'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Tempo / Hutang Dagang
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerms('TUNAI_KAS')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  paymentTerms === 'TUNAI_KAS'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Tunai Kas Toko Laci
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerms('TUNAI_BANK')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  paymentTerms === 'TUNAI_BANK'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                Transfer Bank BCA
              </button>
            </div>

            {paymentTerms === 'TEMPO_HUTANG' && (
              <div className="pt-2 flex items-center gap-3 text-xs">
                <span className="text-slate-400 shrink-0 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Jatuh Tempo Pembayaran:
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Catatan Penerimaan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Diterima dalam kondisi prima & segel utuh"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30 flex items-center gap-2"
            >
              <ArrowDownLeft className="w-4 h-4" /> Simpan Penerimaan Barang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
