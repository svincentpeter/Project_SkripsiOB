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
  UserCheck
} from 'lucide-react';
import { GoodsReceiptInput, PaymentTerms, StockMutation, TireProduct } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { generateBatchCode, generateGrnNumber } from '../../../services/inventoryService';

interface GoodsReceiptModalProps {
  isOpen: boolean;
  preselectedProduct?: TireProduct | null;
  products: TireProduct[];
  existingMutations: StockMutation[];
  onClose: () => void;
  onSubmitReceipt: (input: GoodsReceiptInput) => void;
}

export const GoodsReceiptModal: React.FC<GoodsReceiptModalProps> = ({
  isOpen,
  preselectedProduct,
  products,
  existingMutations,
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

  // Sync state on open
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    setReceiptDate(todayStr);

    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);

    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
      setUnitCost(preselectedProduct.cost_price || preselectedProduct.product_cost || 750000);
      setSupplierName(`PT ${preselectedProduct.brand} Tire Indonesia`);
    } else if (products.length > 0) {
      setSelectedProductId(products[0].id);
      setUnitCost(products[0].cost_price || products[0].product_cost || 750000);
      setSupplierName(`PT ${products[0].brand} Tire Indonesia`);
    }
  }, [isOpen, preselectedProduct, products]);

  // Update unitCost & supplier when selected product changes
  const handleProductSelectChange = (productId: string) => {
    setSelectedProductId(productId);
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      setUnitCost(prod.cost_price || prod.product_cost || 750000);
      setSupplierName(`PT ${prod.brand} Tire Indonesia`);
    }
  };

  if (!isOpen) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = selectedProduct ? selectedProduct.stock : 0;
  const newProjectedStock = currentStock + (Number(incomingQty) || 0);
  const totalValuation = (Number(incomingQty) || 0) * (Number(unitCost) || 0);

  const previewGrn = generateGrnNumber(existingMutations);
  const previewBatchCode = selectedProduct 
    ? generateBatchCode(selectedProduct.batches || []) 
    : 'BATCH-20260903-01';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedProductId) {
      setErrorMsg('Pilih produk ban yang akan di-restock.');
      return;
    }

    if (incomingQty <= 0) {
      setErrorMsg('Jumlah ban masuk harus lebih besar dari 0.');
      return;
    }

    if (unitCost <= 0) {
      setErrorMsg('Harga beli HPP per unit harus lebih besar dari 0.');
      return;
    }

    if (!supplierName.trim()) {
      setErrorMsg('Nama supplier atau distributor wajib diisi.');
      return;
    }

    const input: GoodsReceiptInput = {
      product_id: selectedProductId,
      incoming_qty: Number(incomingQty),
      unit_cost: Number(unitCost),
      supplier_name: supplierName.trim(),
      supplier_invoice: supplierInvoice.trim() || undefined,
      receipt_date: receiptDate,
      payment_terms: paymentTerms,
      due_date: paymentTerms === 'TEMPO_HUTANG' ? dueDate : undefined,
      notes: notes.trim() || undefined,
      operator: operator.trim() || 'Gudang OB3',
    };

    onSubmitReceipt(input);
    onClose();
  };


  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                Penerimaan Barang Masuk (Restock / GRN)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Catat kedatangan pasokan ban baru dari distributor, alokasi batch FIFO baru, dan pembaruan kartu stok.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Autonumeric Preview Badge Bar */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">
                No. Bukti Penerimaan (GRN):
              </span>
              <span className="font-mono font-black text-emerald-950 text-sm">{previewGrn}</span>
            </div>

            <div>
              <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">
                Kode Batch FIFO Baru:
              </span>
              <span className="font-mono font-bold text-indigo-700 text-xs bg-white px-2 py-0.5 rounded border border-indigo-200">
                {previewBatchCode}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-emerald-800 font-bold block uppercase tracking-wider">
                Total Nilai Pembelian:
              </span>
              <span className="font-mono font-black text-emerald-900 text-sm">
                {formatRupiah(totalValuation)}
              </span>
            </div>
          </div>

          {/* Product Target Selector */}
          <div>
            <label className="text-slate-700 text-xs font-bold block mb-1">
              Pilih Ban yang Di-Restock:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelectChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} - {p.name || p.product_name} ({p.product_size}) — Stok Saat Ini: {p.stock} pcs
                </option>
              ))}
            </select>
          </div>

          {/* Quantities & Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Jumlah Ban Masuk (pcs):
              </label>
              <input
                type="number"
                value={incomingQty}
                onChange={(e) => setIncomingQty(Number(e.target.value))}
                min={1}
                max={1000}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Stok saat ini: <strong>{currentStock} pcs</strong> $\rightarrow$ Saldo baru: <strong className="text-emerald-700 font-mono">{newProjectedStock} pcs</strong>
              </span>
            </div>

            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Harga Modal Beli / HPP Layer Baru (Rp):
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={unitCost.toLocaleString('id-ID')}
                  onChange={(e) => setUnitCost(parseRupiahInput(e.target.value))}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Akan dicatat sebagai HPP spesifik layer batch ini.
              </span>
            </div>
          </div>

          {/* Supplier & Delivery Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Nama Supplier / Distributor:
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="PT Bridgestone Tire Indonesia"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                No. Surat Jalan / Faktur Supplier (Opsional):
              </label>
              <input
                type="text"
                value={supplierInvoice}
                onChange={(e) => setSupplierInvoice(e.target.value)}
                placeholder="Contoh: SJ-BS-202609-881"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Payment Terms (Akuntansi SAK EMKM) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <label className="text-slate-800 text-xs font-bold block uppercase tracking-wider">
              Syarat Pembayaran Pembelian (Akun Lawan Jurnal):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                className={`p-2.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  paymentTerms === 'TEMPO_HUTANG'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Tempo / Kredit</span>
                  <input
                    type="radio"
                    name="receiptPaymentTerms"
                    checked={paymentTerms === 'TEMPO_HUTANG'}
                    onChange={() => setPaymentTerms('TEMPO_HUTANG')}
                    className="accent-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Cr. Hutang Dagang (2-1000)</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  paymentTerms === 'TUNAI_KAS'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Tunai Kas Laci</span>
                  <input
                    type="radio"
                    name="receiptPaymentTerms"
                    checked={paymentTerms === 'TUNAI_KAS'}
                    onChange={() => setPaymentTerms('TUNAI_KAS')}
                    className="accent-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Cr. Kas Toko (1-1000)</span>
              </label>

              <label
                className={`p-2.5 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  paymentTerms === 'TUNAI_BANK'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Transfer Bank BCA</span>
                  <input
                    type="radio"
                    name="receiptPaymentTerms"
                    checked={paymentTerms === 'TUNAI_BANK'}
                    onChange={() => setPaymentTerms('TUNAI_BANK')}
                    className="accent-indigo-600"
                  />
                </div>
                <span className="text-[10px] text-slate-500 font-mono">Cr. Bank BCA (1-1001)</span>
              </label>
            </div>

            {paymentTerms === 'TEMPO_HUTANG' && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-600">Tanggal Jatuh Tempo Pembayaran:</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required={paymentTerms === 'TEMPO_HUTANG'}
                  className="px-2.5 py-1 border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-900 bg-white"
                />
              </div>
            )}
          </div>

          {/* Date, Operator, and Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Tanggal Kedatangan Fisik:
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-700 text-xs font-bold block mb-1">
                Petugas Penerima Gudang:
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="Gudang - Bambang"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 text-xs font-bold block mb-1">
              Catatan Penerimaan / Berita Acara:
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Kondisi ban baik, pembungkus rapi, barcode terbaca jelas."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Posting Penerimaan Barang</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
