import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Clock,
  Check,
  CreditCard,
  Banknote,
  QrCode,
  AlertCircle,
  FileText,
  Car,
  User,
  Tag,
} from 'lucide-react';
import { CartItem, PaymentMethod } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTag?: 'REGULAR' | 'BON';
  cart: CartItem[];
  customerName: string;
  vehiclePlate: string;
  vehicleModel: string;
  totals: {
    subtotal: number;
    discount: number;
    grandTotal: number;
  };
  appliedDpAmount: number;
  netPayable: number;
  onPrintPhysicalNota: () => void;
  onParkCart: () => void;
  onConfirmCheckout: (
    isBon: boolean,
    paymentMethod: PaymentMethod,
    cashTendered: number,
    notes?: string
  ) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  initialTag = 'REGULAR',
  cart,
  customerName,
  vehiclePlate,
  vehicleModel,
  totals,
  appliedDpAmount,
  netPayable,
  onPrintPhysicalNota,
  onParkCart,
  onConfirmCheckout,
}) => {
  const [tag, setTag] = useState<'REGULAR' | 'BON'>(initialTag);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setTag(initialTag);
      if (initialTag === 'REGULAR') {
        setCashTenderedInput(String(netPayable));
      } else {
        setCashTenderedInput('');
      }
    }
  }, [isOpen, initialTag, netPayable]);

  if (!isOpen) return null;

  const parseRupiahInput = (val: string): number => {
    const clean = val.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const cashTenderedVal = parseRupiahInput(cashTenderedInput);
  const changeAmount =
    paymentMethod === 'TUNAI' ? Math.max(0, cashTenderedVal - netPayable) : 0;
  const isCashShort =
    tag === 'REGULAR' && paymentMethod === 'TUNAI' && cashTenderedVal < netPayable;

  const handleFillExact = () => {
    setCashTenderedInput(String(netPayable));
  };

  const handleAddCash = (amount: number) => {
    const current = cashTenderedVal;
    setCashTenderedInput(String(current + amount));
  };

  const handleFinalSubmit = () => {
    if (tag === 'REGULAR' && isCashShort) return;
    onConfirmCheckout(
      tag === 'BON',
      paymentMethod,
      paymentMethod === 'TUNAI' ? cashTenderedVal : netPayable,
      transactionNotes.trim() || undefined
    );
  };

  const handleParkAndClose = () => {
    onParkCart();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header Modal */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Penyelesaian Pesanan &amp; Pembayaran
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-300 font-medium mt-0.5">
                <span className="flex items-center gap-1 font-mono font-bold text-amber-300">
                  <Car className="w-3.5 h-3.5" />
                  {vehiclePlate.trim() || 'TANPA PLAT'}
                </span>
                <span>&bull;</span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {customerName.trim() || 'Pelanggan Walk-In'}
                </span>
                {vehicleModel.trim() && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-400">{vehicleModel}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Modal: 2 Kolom (Kiri: Faktur & Cetak | Kanan: Pembayaran) */}
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* ==================== KOLOM KIRI: Rincian & Cetak Fisik ==================== */}
          <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-white overflow-y-auto">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Rincian Barang &amp; Jasa ({cart.reduce((s, i) => s + i.qty, 0)} Item)
                </span>
                <span className="text-[11px] font-bold text-slate-600 font-mono">
                  {cart.length} Baris
                </span>
              </div>

              {/* List Item Singkat */}
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-48 overflow-y-auto custom-scrollbar bg-slate-50/50">
                {cart.map((item, idx) => {
                  const standardPrice =
                    item.item_type === 'SERVICE' && item.service
                      ? item.service.standard_price
                      : item.product?.product_price || item.product?.price || 0;
                  const activePrice = item.custom_price ?? standardPrice;
                  const lineTotal = Math.max(
                    0,
                    (activePrice - item.discount_per_item) * item.qty
                  );
                  const displayName =
                    item.custom_name_override ||
                    (item.item_type === 'SERVICE' && item.service
                      ? item.service.service_name
                      : item.product?.product_name);

                  return (
                    <div key={idx} className="p-2.5 flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                              item.item_type === 'SERVICE'
                                ? 'bg-cyan-100 text-cyan-800'
                                : item.product?.category === 'VELG'
                                ? 'bg-amber-100 text-amber-800'
                                : item.product?.category === 'OLI_PELUMAS'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {item.item_type === 'SERVICE'
                              ? 'JASA'
                              : item.product?.category === 'OLI_PELUMAS'
                              ? 'OLI'
                              : (item.product?.category || 'BAN').replace('_', ' ')}
                          </span>
                          <span className="font-bold text-slate-900 truncate">{displayName}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                          {item.qty} &times; {formatRupiah(activePrice)}
                          {item.discount_per_item > 0 && (
                            <span className="text-amber-700 font-bold ml-1.5">
                              (Disc -{formatRupiah(item.discount_per_item)})
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-black text-slate-900 font-mono shrink-0">
                        {formatRupiah(lineTotal)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Rincian Kalkulasi */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Belanja (Subtotal):</span>
                  <span className="font-bold font-mono text-slate-800">
                    {formatRupiah(totals.subtotal)}
                  </span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-amber-700 font-medium">
                    <span>Diskon Keseluruhan:</span>
                    <span className="font-bold font-mono">-{formatRupiah(totals.discount)}</span>
                  </div>
                )}
                {appliedDpAmount > 0 && (
                  <div className="flex justify-between text-purple-800 font-bold">
                    <span>DP Booking Terpasang:</span>
                    <span className="font-mono">-{formatRupiah(appliedDpAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-black pt-2 border-t border-slate-200">
                  <span className="text-slate-900">Total Tagihan Bersih:</span>
                  <span className="text-blue-700 font-mono text-base font-black">
                    {formatRupiah(netPayable)}
                  </span>
                </div>
              </div>

              {/* Catatan Transaksi */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Catatan Transaksi (Opsional)
                </label>
                <input
                  type="text"
                  value={transactionNotes}
                  onChange={(e) => setTransactionNotes(e.target.value)}
                  placeholder="Cth: Titip velg lama, garansi pasang 1 bulan..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Kotak Aksi: Cetak Nota Fisik Langsung */}
            <div className="pt-2">
              <div className="rounded-xl border border-sky-300 bg-gradient-to-r from-sky-50 to-blue-50 p-3 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-sky-950 leading-tight">
                      Cetak Nota Penjualan Fisik
                    </h4>
                    <p className="text-[10px] text-sky-700 leading-tight mt-0.5">
                      Cetak bukti fisik terlebih dahulu jika pelanggan/kantor butuh nota sebelum bayar.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onPrintPhysicalNota}
                  className="shrink-0 px-3 py-2 rounded-xl bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-700" />
                  <span>Cetak Nota</span>
                </button>
              </div>
            </div>
          </div>

          {/* ==================== KOLOM KANAN: Pembayaran ==================== */}
          <div className="p-4 sm:p-5 flex flex-col justify-between space-y-4 bg-slate-50/70 overflow-y-auto">
            <div className="space-y-4">
              {/* Selector Tag Transaksi: Reguler (Lunas) vs BON */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Tipe Faktur / Status Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTag('REGULAR')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tag === 'REGULAR'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Faktur Reguler (Lunas)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTag('BON')}
                    className={`py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      tag === 'BON'
                        ? 'bg-white text-amber-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Faktur BON (Piutang)</span>
                  </button>
                </div>
              </div>

              {/* Mode BON: Penjelasan & Info Piutang */}
              {tag === 'BON' ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-950 uppercase tracking-wide">
                        Mode Faktur BON (Tempo/Piutang)
                      </h4>
                      <p className="text-xs text-amber-900 leading-relaxed mt-1">
                        Barang/jasa dikeluarkan hari ini tanpa mensyaratkan pelunasan kas saat ini.
                        Tagihan sebesar{' '}
                        <b className="font-mono font-black">{formatRupiah(netPayable)}</b> akan otomatis
                        tercatat di <b>Buku Pembantu Piutang Usaha</b> atas nama{' '}
                        <b>{customerName.trim() || 'Pelanggan Walk-In'}</b>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode REGULER: Pilihan Metode Bayar & Uang Tunai */
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('TUNAI')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          paymentMethod === 'TUNAI'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Banknote className="w-4 h-4 text-emerald-600" />
                        <span>Tunai / Cash</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('TRANSFER_BCA')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          paymentMethod === 'TRANSFER_BCA'
                            ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-blue-600" />
                        <span>Transfer BCA</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('QRIS')}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          paymentMethod === 'QRIS'
                            ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <QrCode className="w-4 h-4 text-cyan-600" />
                        <span>QRIS Dinamis</span>
                      </button>
                    </div>
                  </div>

                  {paymentMethod === 'TUNAI' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700">
                          Nominal Uang Tunai Diterima (Rp)
                        </label>
                        <button
                          type="button"
                          onClick={handleFillExact}
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Uang Pas ({formatRupiah(netPayable)})
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">
                          Rp
                        </span>
                        <input
                          type="text"
                          value={
                            cashTenderedInput
                              ? formatRupiah(parseRupiahInput(cashTenderedInput)).replace('Rp ', '')
                              : ''
                          }
                          onChange={(e) => setCashTenderedInput(e.target.value)}
                          placeholder="0"
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-base font-black focus:bg-white focus:border-emerald-600 focus:outline-none"
                        />
                      </div>

                      {/* Quick Add Buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[20000, 50000, 100000, 200000, 500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleAddCash(amt)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-200 cursor-pointer font-mono"
                          >
                            +{formatRupiah(amt).replace('Rp ', '')}
                          </button>
                        ))}
                      </div>

                      {/* Kembalian Display */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600">Kembalian Kasir:</span>
                        <span
                          className={`font-mono text-base font-black ${
                            isCashShort
                              ? 'text-rose-600'
                              : changeAmount > 0
                              ? 'text-blue-700'
                              : 'text-slate-800'
                          }`}
                        >
                          {isCashShort
                            ? `Kurang ${formatRupiah(netPayable - cashTenderedVal)}`
                            : formatRupiah(changeAmount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'TRANSFER_BCA' && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs space-y-1 text-blue-950">
                      <div className="font-bold flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-blue-700" />
                        <span>Rekening Tujuan Transfer:</span>
                      </div>
                      <div className="font-mono font-black text-sm text-blue-900 pl-5">
                        BCA: 015-888-2999
                      </div>
                      <div className="text-[11px] text-blue-700 pl-5">
                        a.n. Omah Ban Cabang 3 (Agus Subagyo)
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'QRIS' && (
                    <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs space-y-1 text-cyan-950">
                      <div className="font-bold flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-cyan-700" />
                        <span>QRIS Omah Ban Magelang</span>
                      </div>
                      <div className="text-[11px] text-cyan-800">
                        Scan menggunakan BCA, Mandiri, GoPay, OVO, atau ShopeePay.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal Actions */}
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleParkAndClose}
                  className="py-3 px-3 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Tahan transaksi ini ke antrian pit servis"
                >
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span className="hidden sm:inline">Tahan (Park)</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={tag === 'REGULAR' && isCashShort}
                  className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    tag === 'BON'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {tag === 'BON'
                      ? 'Simpan Sebagai Faktur BON'
                      : `Selesaikan Transaksi (${formatRupiah(netPayable)})`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
