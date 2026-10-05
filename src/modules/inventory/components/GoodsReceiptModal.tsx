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
import { formatRupiah } from '../../../shared/utils/formatters';
import { localDate } from '../../../services/accountingPeriod';
import {
  PpnMode,
  costDelta,
  costFromInvoice,
  formatInvoicePrice,
  invoicePriceFromCost,
  invoiceSummary,
  lastBatchCost,
  parseInvoicePrice,
} from '../../../services/purchaseInvoiceService';

const PPN_MODE_OPTIONS: { mode: PpnMode; label: string; title: string }[] = [
  { mode: 'exclude', label: 'Belum PPN', title: 'Harga di faktur belum termasuk PPN, modal = harga × 1,11' },
  { mode: 'include', label: 'Sudah PPN', title: 'Harga di faktur sudah termasuk PPN, modal = harga faktur' },
];

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
  const [ppnMode, setPpnMode] = useState<PpnMode>('exclude');
  const [invoicePriceText, setInvoicePriceText] = useState<string>('');
  const [supplierName, setSupplierName] = useState<string>('PT Bridgestone Tire Indonesia');
  const [supplierInvoice, setSupplierInvoice] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('TEMPO_HUTANG');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('Restock pengiriman distributor resmi Cabang 3');
  const [operator, setOperator] = useState<string>('Gudang - Bambang');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeProducts = products.filter((p) => p.is_active !== false);

  // Harga faktur awal = modal batch terakhir, dibalik ke harga sebelum PPN pada mode "belum PPN".
  const initialInvoiceText = (prod: TireProduct, mode: PpnMode) => {
    const previous = lastBatchCost(prod);
    return previous > 0 ? formatInvoicePrice(invoicePriceFromCost(previous, mode)) : '';
  };

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    const todayStr = localDate();
    setReceiptDate(todayStr);

    const due = new Date();
    due.setDate(due.getDate() + 30);
    setDueDate(localDate(due));

    setPpnMode('exclude');

    if (preselectedProduct) {
      setSelectedProductId(preselectedProduct.id);
      setInvoicePriceText(initialInvoiceText(preselectedProduct, 'exclude'));
      setSupplierName(
        suppliers.find((s) => s.supplier_name.toLowerCase().includes(preselectedProduct.brand.toLowerCase()))?.supplier_name ||
        `PT ${preselectedProduct.brand} Tire Indonesia`
      );
    } else if (activeProducts.length > 0) {
      setSelectedProductId(activeProducts[0].id);
      setInvoicePriceText(initialInvoiceText(activeProducts[0], 'exclude'));
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
      setInvoicePriceText(initialInvoiceText(prod, ppnMode));
      const matchedSup = suppliers.find((s) => s.supplier_name.toLowerCase().includes(prod.brand.toLowerCase()));
      if (matchedSup) {
        setSupplierName(matchedSup.supplier_name);
      }
    }
  };

  const invoicePrice = parseInvoicePrice(invoicePriceText);
  const unitCost = costFromInvoice(invoicePrice, ppnMode);
  const summary = invoiceSummary(incomingQty, invoicePrice, ppnMode);
  const previousCost = currentProduct ? lastBatchCost(currentProduct) : 0;
  const delta = costDelta(unitCost, previousCost);

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
      setErrorMsg('Harga faktur supplier per unit harus lebih besar dari 0.');
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
      invoice_total: summary.total,
      dpp_amount: summary.dpp,
      ppn_amount: summary.ppn,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Penerimaan Barang Masuk (Restock)</h2>
              <p className="text-xs text-slate-500">
                Mencatat stok masuk (Ban/Velg/Ban Dalam), layer batch FIFO baru, & jurnal akuntansi.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto bg-white">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Produk yang Diterima
            </label>
            <select
              value={selectedProductId}
              onChange={handleProductChange}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
            >
              {activeProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.product_name} {p.product_size || p.size || ''} · {p.product_code} — (Stok Saat Ini: {p.stock || p.product_quantity || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Distributor / Supplier Resmi
              </label>
              <div className="space-y-2">
                {suppliers.length > 0 ? (
                  <select
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
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
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                )}
                {supplierName === 'Lainnya' && (
                  <input
                    type="text"
                    placeholder="Nama distributor baru..."
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs shadow-2xs"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                No. Faktur / Surat Jalan Supplier
              </label>
              <input
                type="text"
                value={supplierInvoice}
                onChange={(e) => setSupplierInvoice(e.target.value)}
                placeholder="e.g. INV-SJ/2026/09/8812"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Jumlah Masuk (Unit)
              </label>
              <input
                type="number"
                min="1"
                value={incomingQty}
                onChange={(e) => setIncomingQty(Math.max(1, Number(e.target.value)))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm font-bold focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Tanggal Penerimaan
              </label>
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-sm shadow-2xs"
              />
            </div>
          </div>

          {/* Kalkulator PPN faktur supplier: PPN pembelian ikut menjadi modal (toko non-PKP) */}
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span id="receipt-ppn-label" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Harga Faktur Supplier
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="receipt-ppn-label"
                  className="grid grid-cols-2 p-1 gap-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold"
                >
                  {PPN_MODE_OPTIONS.map((opt) => (
                    <button
                      key={opt.mode}
                      type="button"
                      role="radio"
                      aria-checked={ppnMode === opt.mode}
                      title={opt.title}
                      onClick={() => setPpnMode(opt.mode)}
                      className={`py-2 rounded-lg transition-all ${
                        ppnMode === opt.mode
                          ? 'bg-white text-emerald-700 shadow-2xs ring-1 ring-slate-200'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="receipt-invoice-price" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Harga Faktur / Unit ({ppnMode === 'exclude' ? 'belum PPN' : 'sudah PPN'})
                </label>
                <input
                  id="receipt-invoice-price"
                  type="text"
                  inputMode="decimal"
                  value={invoicePriceText}
                  onChange={(e) => setInvoicePriceText(e.target.value)}
                  onBlur={() => setInvoicePriceText(invoicePrice > 0 ? formatInvoicePrice(invoicePrice) : '')}
                  placeholder="mis. 677.873,75"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
              <span className="text-xs font-semibold text-slate-700">Modal (HPP) / Unit</span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono">
                {formatRupiah(unitCost)}
                {delta && delta.diff !== 0 && (
                  <span className={`ml-2 text-[11px] font-semibold ${delta.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {delta.diff > 0 ? '+' : '−'}
                    {formatRupiah(Math.abs(delta.diff))} ({delta.diff > 0 ? '+' : '−'}
                    {Math.abs(delta.percent).toLocaleString('id-ID')}%) vs modal terakhir
                  </span>
                )}
              </span>
            </div>

            <dl className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <dt className="text-slate-500">DPP <span className="text-slate-400">(sebelum PPN)</span></dt>
                <dd className="font-mono font-semibold text-slate-900">{formatRupiah(summary.dpp)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">PPN 11%</dt>
                <dd className="font-mono font-semibold text-slate-900">{formatRupiah(summary.ppn)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Total Faktur</dt>
                <dd className="font-mono font-bold text-slate-900">{formatRupiah(summary.total)}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-slate-500">
              Cocokkan dengan baris DPP / PPN / total di nota supplier. PPN pembelian menjadi bagian modal persediaan;
              hutang / pembayaran dibukukan persis sebesar total faktur.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" /> Syarat Pembayaran Pengadaan
              </label>
              <span className="text-xs text-slate-500">Nilai Dibukukan: <b className="text-emerald-600 font-bold">{formatRupiah(summary.total)}</b></span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentTerms('TEMPO_HUTANG')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  paymentTerms === 'TEMPO_HUTANG'
                    ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tempo / Hutang Dagang
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerms('TUNAI_KAS')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  paymentTerms === 'TUNAI_KAS'
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tunai Kas Toko Laci
              </button>
              <button
                type="button"
                onClick={() => setPaymentTerms('TUNAI_BANK')}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                  paymentTerms === 'TUNAI_BANK'
                    ? 'bg-blue-100 border-blue-300 text-blue-900 shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Transfer Bank BCA
              </button>
            </div>

            {paymentTerms === 'TEMPO_HUTANG' && (
              <div className="pt-2 flex items-center gap-3 text-xs">
                <span className="text-slate-500 shrink-0 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> Jatuh Tempo Pembayaran:
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 text-xs shadow-2xs"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                Petugas / Operator Penerima
              </label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                placeholder="e.g. Gudang - Bambang / Kasir"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Catatan Penerimaan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Diterima dalam kondisi prima & segel utuh"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold shadow-2xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2"
            >
              <ArrowDownLeft className="w-4 h-4" /> Simpan Penerimaan Barang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
