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
  Landmark,
  Plus,
  Trash2,
  Layers,
} from 'lucide-react';
import { CartItem, PaymentMethod, StoreSettings, SplitPaymentLine } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';
import { INITIAL_BANK_PROVIDERS, INITIAL_QRIS_PROVIDERS, INITIAL_EDC_SETTINGS } from '../../../shared/data/mockData';

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
  storeSettings?: StoreSettings;
  onPrintPhysicalNota: () => void;
  onParkCart: () => void;
  onConfirmCheckout: (
    isBon: boolean,
    paymentMethod: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta?: {
      provider_name?: string;
      edc_bank?: string;
      edc_type?: 'Debit' | 'Credit';
      fee_percentage?: number;
      fee_amount?: number;
      surcharge_amount?: number;
      net_received?: number;
      split_payments?: SplitPaymentLine[];
    }
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
  storeSettings,
  onPrintPhysicalNota,
  onParkCart,
  onConfirmCheckout,
}) => {
  const [tag, setTag] = useState<'REGULAR' | 'BON'>(initialTag);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [selectedBank, setSelectedBank] = useState<string>('BCA');
  const [selectedQris, setSelectedQris] = useState<string>('BCA');
  const [selectedEdcBank, setSelectedEdcBank] = useState<string>('BCA');
  const [selectedEdcType, setSelectedEdcType] = useState<'Debit' | 'Credit'>('Debit');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');

  // Split Payment State
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitRows, setSplitRows] = useState<SplitPaymentLine[]>([]);

  const bankOptions = (storeSettings?.bank_providers || INITIAL_BANK_PROVIDERS).filter((b) => b.is_active);
  const qrisOptions = (storeSettings?.qris_providers || INITIAL_QRIS_PROVIDERS).filter((q) => q.is_active);
  const edcOptions = (storeSettings?.edc_settings || INITIAL_EDC_SETTINGS).filter((e) => e.is_active);
  const edcBanks: string[] = Array.from(new Set(edcOptions.map((e) => e.bank_name)));

  useEffect(() => {
    if (bankOptions.length > 0 && !bankOptions.some((b) => b.provider_name === selectedBank)) {
      setSelectedBank(bankOptions[0].provider_name);
    }
  }, [bankOptions, selectedBank]);

  useEffect(() => {
    if (qrisOptions.length > 0 && !qrisOptions.some((q) => q.provider_name === selectedQris)) {
      setSelectedQris(qrisOptions[0].provider_name);
    }
  }, [qrisOptions, selectedQris]);

  useEffect(() => {
    if (edcBanks.length > 0 && !edcBanks.includes(selectedEdcBank)) {
      setSelectedEdcBank(edcBanks[0]);
    }
  }, [edcBanks, selectedEdcBank]);

  // Dynamic fee calculations
  const currentQrisSetting = qrisOptions.find((q) => q.provider_name === selectedQris) || qrisOptions[0];
  const qrisFeePct = currentQrisSetting?.fee_percentage ?? 0.30;
  const qrisThreshold = currentQrisSetting?.fee_threshold_amount ?? 500000;
  const qrisFeeAmount = (paymentMethod === 'QRIS' && netPayable > qrisThreshold && qrisFeePct > 0)
    ? Math.round(netPayable * (qrisFeePct / 100))
    : 0;
  const qrisNetReceived = Math.max(0, netPayable - qrisFeeAmount);

  const currentEdcSetting = edcOptions.find(
    (e) => e.bank_name === selectedEdcBank && e.payment_type === selectedEdcType
  );
  const edcFeePct = currentEdcSetting?.fee_percentage ?? 0;
  const isEdcCredit = paymentMethod === 'EDC_CREDIT' || (paymentMethod === 'EDC' && selectedEdcType === 'Credit');
  const edcCreditSurcharge = isEdcCredit ? Math.round(netPayable * (edcFeePct / 100)) : 0;
  const isEdcDebit = paymentMethod === 'EDC_DEBIT' || (paymentMethod === 'EDC' && selectedEdcType === 'Debit');
  const edcDebitFeeAmount = isEdcDebit ? Math.round(netPayable * (edcFeePct / 100)) : 0;
  const edcDebitNetReceived = Math.max(0, netPayable - edcDebitFeeAmount);

  const effectivePayable = isEdcCredit ? netPayable + edcCreditSurcharge : netPayable;

  // Helper calculation for individual split line
  const calculateRowMeta = (row: SplitPaymentLine) => {
    let feePct = 0;
    let feeAmt = 0;
    let surchargeAmt = 0;

    if (row.method === 'QRIS') {
      const qSetting = qrisOptions.find((q) => q.provider_name === row.provider_name) || qrisOptions[0];
      feePct = qSetting?.fee_percentage ?? 0.30;
      const th = qSetting?.fee_threshold_amount ?? 500000;
      if (row.amount > th && feePct > 0) {
        feeAmt = Math.round(row.amount * (feePct / 100));
      }
    } else if (row.method === 'EDC' || row.method === 'EDC_DEBIT') {
      const eSetting = edcOptions.find((e) => e.bank_name === (row.edc_bank || selectedEdcBank) && e.payment_type === 'Debit');
      feePct = eSetting?.fee_percentage ?? 0;
      if (feePct > 0) {
        feeAmt = Math.round(row.amount * (feePct / 100));
      }
    } else if (row.method === 'EDC_CREDIT') {
      const eSetting = edcOptions.find((e) => e.bank_name === (row.edc_bank || selectedEdcBank) && e.payment_type === 'Credit');
      feePct = eSetting?.fee_percentage ?? 0;
      if (feePct > 0) {
        surchargeAmt = Math.round(row.amount * (feePct / 100));
      }
    }

    const netRec = Math.max(0, row.amount - feeAmt);
    return { feePct, feeAmt, surchargeAmt, netRec };
  };

  // Split calculations
  const totalSplitPaid = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const splitRemaining = Math.max(0, effectivePayable - totalSplitPaid);
  const splitCashTotal = splitRows
    .filter((r) => r.method === 'TUNAI')
    .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const splitChange =
    totalSplitPaid > effectivePayable && splitCashTotal > 0
      ? Math.min(splitCashTotal, totalSplitPaid - effectivePayable)
      : 0;

  const totalSplitFees = splitRows.reduce((sum, r) => sum + calculateRowMeta(r).feeAmt, 0);
  const totalSplitSurcharges = splitRows.reduce((sum, r) => sum + calculateRowMeta(r).surchargeAmt, 0);
  const totalSplitNetReceived = Math.max(0, totalSplitPaid - totalSplitFees);

  const isSplitShort = tag === 'REGULAR' && totalSplitPaid < effectivePayable;

  useEffect(() => {
    if (isOpen) {
      setTag(initialTag);
      setIsSplitMode(false);
      setSplitRows([]);
      if (initialTag === 'REGULAR') {
        setCashTenderedInput(String(effectivePayable));
      } else {
        setCashTenderedInput('');
      }
    }
  }, [isOpen, initialTag, effectivePayable]);

  if (!isOpen) return null;

  const parseRupiahInput = (val: string): number => {
    const clean = val.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || 0;
  };

  const cashTenderedVal = parseRupiahInput(cashTenderedInput);
  const changeAmount =
    paymentMethod === 'TUNAI' ? Math.max(0, cashTenderedVal - effectivePayable) : 0;
  const isCashShort =
    tag === 'REGULAR' && paymentMethod === 'TUNAI' && cashTenderedVal < effectivePayable;

  const handleFillExact = () => {
    setCashTenderedInput(String(effectivePayable));
  };

  const handleAddCash = (amount: number) => {
    const current = cashTenderedVal;
    setCashTenderedInput(String(current + amount));
  };

  // Quick split actions
  const handleSplit5050 = () => {
    const half1 = Math.floor(effectivePayable / 2);
    const half2 = effectivePayable - half1;
    setSplitRows([
      {
        id: `split-${Date.now()}-1`,
        method: 'TUNAI',
        amount: half1,
      },
      {
        id: `split-${Date.now()}-2`,
        method: 'TRANSFER',
        provider_name: selectedBank || bankOptions[0]?.provider_name || 'BCA',
        amount: half2,
      },
    ]);
    setIsSplitMode(true);
  };

  const handleAddSplitRow = (targetMethod: PaymentMethod = 'TRANSFER') => {
    const currentPaid = splitRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
    const remainder = Math.max(0, effectivePayable - currentPaid);

    const newRow: SplitPaymentLine = {
      id: `split-${Date.now()}-${splitRows.length + 1}`,
      method: targetMethod,
      amount: remainder,
      provider_name: targetMethod === 'TRANSFER' || targetMethod === 'TRANSFER_BCA'
        ? (selectedBank || bankOptions[0]?.provider_name || 'BCA')
        : targetMethod === 'QRIS'
        ? (selectedQris || qrisOptions[0]?.provider_name || 'BCA')
        : undefined,
      edc_bank: (targetMethod === 'EDC' || targetMethod === 'EDC_DEBIT' || targetMethod === 'EDC_CREDIT')
        ? (selectedEdcBank || edcBanks[0] || 'BCA')
        : undefined,
      edc_type: targetMethod === 'EDC_CREDIT' ? 'Credit' : 'Debit',
    };

    setSplitRows((prev) => [...prev, newRow]);
    setIsSplitMode(true);
  };

  const handleUpdateSplitRow = (index: number, patch: Partial<SplitPaymentLine>) => {
    setSplitRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const handleRemoveSplitRow = (index: number) => {
    setSplitRows((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      if (filtered.length <= 1) {
        // Still in split mode or user can revert
      }
      if (filtered.length === 0) {
        setIsSplitMode(false);
      }
      return filtered;
    });
  };

  const handleFinalSubmit = () => {
    if (tag === 'REGULAR') {
      if (isSplitMode && isSplitShort) return;
      if (!isSplitMode && isCashShort) return;
    }

    if (isSplitMode) {
      const detailedSplitRows: SplitPaymentLine[] = splitRows.map((row) => {
        const calcs = calculateRowMeta(row);
        return {
          ...row,
          fee_percentage: calcs.feePct,
          fee_amount: calcs.feeAmt,
          surcharge_amount: calcs.surchargeAmt,
          net_received: calcs.netRec,
        };
      });

      onConfirmCheckout(
        tag === 'BON',
        'SPLIT',
        totalSplitPaid,
        transactionNotes.trim() || undefined,
        {
          fee_amount: totalSplitFees,
          surcharge_amount: totalSplitSurcharges,
          net_received: totalSplitNetReceived,
          split_payments: detailedSplitRows,
        }
      );
      return;
    }

    let finalMethod: PaymentMethod = paymentMethod;
    if (paymentMethod === 'TRANSFER' || paymentMethod === 'TRANSFER_BCA') {
      finalMethod = selectedBank === 'BCA' ? 'TRANSFER_BCA' : 'TRANSFER';
    } else if (paymentMethod === 'EDC') {
      finalMethod = selectedEdcType === 'Credit' ? 'EDC_CREDIT' : 'EDC_DEBIT';
    }

    const tenderedAmount = paymentMethod === 'TUNAI' ? cashTenderedVal : effectivePayable;

    const paymentMeta = {
      provider_name:
        paymentMethod === 'TRANSFER' || paymentMethod === 'TRANSFER_BCA'
          ? selectedBank
          : paymentMethod === 'QRIS'
          ? selectedQris
          : undefined,
      edc_bank: (paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT') ? selectedEdcBank : undefined,
      edc_type: (paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT') ? selectedEdcType : undefined,
      fee_percentage:
        paymentMethod === 'QRIS'
          ? qrisFeePct
          : (paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT')
          ? edcFeePct
          : 0,
      fee_amount:
        paymentMethod === 'QRIS'
          ? qrisFeeAmount
          : (paymentMethod === 'EDC' && selectedEdcType === 'Debit')
          ? edcDebitFeeAmount
          : 0,
      surcharge_amount: isEdcCredit ? edcCreditSurcharge : 0,
      net_received:
        paymentMethod === 'QRIS'
          ? qrisNetReceived
          : (paymentMethod === 'EDC' && selectedEdcType === 'Debit')
          ? edcDebitNetReceived
          : effectivePayable,
    };

    onConfirmCheckout(
      tag === 'BON',
      finalMethod,
      tenderedAmount,
      transactionNotes.trim() || undefined,
      paymentMeta
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
              <div className="flex items-center gap-2 text-xs text-slate-300 font-medium mt-0.5">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  {customerName.trim() || 'Pelanggan Umum'}
                </span>
                {vehiclePlate.trim() && (
                  <>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1 font-mono font-bold text-amber-300">
                      <Car className="w-3.5 h-3.5" />
                      {vehiclePlate.trim()}
                    </span>
                  </>
                )}
                {vehicleModel.trim() && (
                  <>
                    <span>&bull;</span>
                    <span className="text-slate-400">{vehicleModel.trim()}</span>
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
                        <b>{customerName.trim() || 'Pelanggan Umum'}</b>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Mode REGULER: Pilihan Metode Bayar Tunggal vs Multi-Bayar / Split */
                <div className="space-y-3.5">
                  {!isSplitMode ? (
                    /* ================= SINGLE PAYMENT MODE ================= */
                    <div className="space-y-3.5">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                            Metode Pembayaran
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleSplit5050}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Bagi 50% Tunai & 50% Transfer BCA"
                            >
                              <span>⚖️ Split 50:50</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddSplitRow('TRANSFER')}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                              title="Buka multi-pembayaran (split payment)"
                            >
                              <Layers className="w-3 h-3 text-indigo-600" />
                              <span>Multi-Bayar</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('TUNAI')}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'TUNAI'
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Banknote className="w-4 h-4 text-emerald-600" />
                            <span className="text-[11px] truncate">Tunai</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('TRANSFER')}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'TRANSFER' || paymentMethod === 'TRANSFER_BCA'
                                ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <Landmark className="w-4 h-4 text-blue-600" />
                            <span className="text-[11px] truncate">Transfer</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('QRIS')}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'QRIS'
                                ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <QrCode className="w-4 h-4 text-cyan-600" />
                            <span className="text-[11px] truncate">QRIS</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPaymentMethod('EDC')}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT'
                                ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            <span className="text-[11px] truncate">Mesin EDC</span>
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

                      {(paymentMethod === 'TRANSFER' || paymentMethod === 'TRANSFER_BCA') && (
                        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs space-y-2.5 text-blue-950">
                          <div className="font-bold flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Landmark className="w-4 h-4 text-blue-700" />
                              <span>Pilih Bank Tujuan Transfer:</span>
                            </div>
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                              Bebas Biaya Admin
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {bankOptions.map((bank) => (
                              <button
                                key={bank.id || bank.provider_name}
                                type="button"
                                onClick={() => setSelectedBank(bank.provider_name)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  selectedBank === bank.provider_name
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white text-blue-950 border-blue-200 hover:bg-blue-100/60'
                                }`}
                              >
                                {bank.provider_name}
                              </button>
                            ))}
                          </div>

                          <div className="pt-1 text-[11px] text-blue-800 flex items-center justify-between border-t border-blue-200/60">
                            <span>Nominal Transfer Pas:</span>
                            <span className="font-mono font-bold">{formatRupiah(effectivePayable)}</span>
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'QRIS' && (
                        <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-3 text-xs space-y-3 text-cyan-950">
                          <div className="flex items-center justify-between">
                            <div className="font-bold flex items-center gap-1.5">
                              <QrCode className="w-4 h-4 text-cyan-700" />
                              <span>Pilih Rekening QRIS Dinamis:</span>
                            </div>
                            <span className="text-[10px] font-bold bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded-md">
                              Scan Barcode
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {qrisOptions.map((qris) => (
                              <button
                                key={qris.id || qris.provider_name}
                                type="button"
                                onClick={() => setSelectedQris(qris.provider_name)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  selectedQris === qris.provider_name
                                    ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                                    : 'bg-white text-cyan-900 border-cyan-200 hover:bg-cyan-100/60'
                                }`}
                              >
                                {qris.provider_name} ({qris.fee_percentage}%)
                              </button>
                            ))}
                          </div>

                          <div className="pt-2 border-t border-cyan-200/80 space-y-1.5 text-[11px]">
                            {netPayable > qrisThreshold && qrisFeePct > 0 ? (
                              <div className="flex items-center justify-between text-cyan-900">
                                <span>Potongan MDR ({qrisFeePct}% beban toko):</span>
                                <span className="font-mono font-bold text-rose-600">
                                  -{formatRupiah(qrisFeeAmount)}
                                </span>
                              </div>
                            ) : (
                              <div className="text-emerald-700 font-medium">
                                ✓ Bebas Potongan MDR (Nominal di bawah batas minimal {formatRupiah(qrisThreshold)})
                              </div>
                            )}
                            <div className="flex items-center justify-between text-cyan-950 font-bold">
                              <span>Toko Menerima Bersih:</span>
                              <span className="font-mono text-emerald-700 text-xs font-black">
                                {formatRupiah(qrisNetReceived)}
                              </span>
                            </div>
                            <div className="text-[10px] text-cyan-700">
                              * Pelanggan tetap membayar nominal pas: <b className="font-mono">{formatRupiah(netPayable)}</b>
                            </div>
                          </div>
                        </div>
                      )}

                      {(paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT') && (
                        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 text-xs space-y-3 text-purple-950">
                          <div className="flex items-center justify-between">
                            <div className="font-bold flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-purple-700" />
                              <span>Pilih Mesin EDC Bank:</span>
                            </div>
                            <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                              Mesin EDC Gesek
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {edcBanks.map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setSelectedEdcBank(b)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                  selectedEdcBank === b
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                    : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/60'
                                }`}
                              >
                                EDC {b}
                              </button>
                            ))}
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wider block mb-1">
                              Pilih Jenis Kartu Gesek
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedEdcType('Debit')}
                                className={`p-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                                  selectedEdcType === 'Debit'
                                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                                    : 'bg-white text-purple-900 border-purple-200 hover:bg-purple-100/60'
                                }`}
                              >
                                <div>Kartu Debit</div>
                                <div className="text-[10px] font-normal opacity-90">
                                  Beban Toko ({edcOptions.find((e) => e.bank_name === selectedEdcBank && e.payment_type === 'Debit')?.fee_percentage ?? 0.15}%)
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedEdcType('Credit')}
                                className={`p-2 rounded-lg text-xs font-bold border text-center transition-all cursor-pointer ${
                                  selectedEdcType === 'Credit'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100/60'
                                }`}
                              >
                                <div>Kartu Kredit (+Surcharge)</div>
                                <div className="text-[10px] font-normal opacity-90">
                                  Beban Customer (+{edcOptions.find((e) => e.bank_name === selectedEdcBank && e.payment_type === 'Credit')?.fee_percentage ?? 2.0}%)
                                </div>
                              </button>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-purple-200/80 space-y-1 text-[11px]">
                            {selectedEdcType === 'Credit' ? (
                              <>
                                <div className="flex items-center justify-between text-amber-900">
                                  <span>Tagihan Awal Belanja:</span>
                                  <span className="font-mono">{formatRupiah(netPayable)}</span>
                                </div>
                                <div className="flex items-center justify-between text-amber-900 font-bold">
                                  <span>Surcharge Kartu Kredit (+{edcFeePct}%):</span>
                                  <span className="font-mono text-amber-800">
                                    +{formatRupiah(edcCreditSurcharge)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-purple-950 font-black pt-1.5 border-t border-purple-200">
                                  <span className="text-xs uppercase">Total Gesek EDC (Dibayar Pelanggan):</span>
                                  <span className="font-mono text-sm text-purple-700 font-black">
                                    {formatRupiah(effectivePayable)}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-center justify-between text-purple-900">
                                  <span>Fee EDC Debit ({edcFeePct}% beban toko):</span>
                                  <span className="font-mono text-rose-600 font-bold">
                                    -{formatRupiah(edcDebitFeeAmount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-purple-950 font-bold">
                                  <span>Toko Menerima Bersih:</span>
                                  <span className="font-mono text-emerald-700 text-xs font-black">
                                    {formatRupiah(edcDebitNetReceived)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-purple-700">
                                  * Pelanggan membayar nominal normal: <b className="font-mono">{formatRupiah(netPayable)}</b>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* ================= SPLIT / MULTI-PAYMENT MODE ================= */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                          <label className="text-xs font-black text-indigo-950 uppercase tracking-wider block">
                            Multi-Bayar (Split Payment)
                          </label>
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 bg-indigo-100 text-indigo-800 rounded-full">
                            {splitRows.length} Metode
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSplit5050}
                            className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                            title="Bagi rata 50:50 Tunai dan Transfer"
                          >
                            <span>⚖️ 50:50</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddSplitRow('TRANSFER')}
                            className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSplitMode(false);
                              setSplitRows([]);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-600 hover:text-rose-600 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Kembali ke pembayaran tunggal"
                          >
                            <X className="w-3 h-3" />
                            <span className="hidden sm:inline">Tunggal</span>
                          </button>
                        </div>
                      </div>

                      {/* Payment Rows List */}
                      <div className="space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                        {splitRows.map((row, idx) => {
                          return (
                            <div key={row.id || idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 shrink-0">
                                  #{idx + 1}
                                </span>
                                <div className="grid grid-cols-4 gap-1 flex-1">
                                  {(['TUNAI', 'TRANSFER', 'QRIS', 'EDC'] as PaymentMethod[]).map((m) => {
                                    const isActive =
                                      (m === 'TRANSFER' && (row.method === 'TRANSFER' || row.method === 'TRANSFER_BCA')) ||
                                      (m === 'EDC' && (row.method === 'EDC' || row.method === 'EDC_DEBIT' || row.method === 'EDC_CREDIT')) ||
                                      row.method === m;
                                    return (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                          let newMethod = m;
                                          if (m === 'EDC') newMethod = row.edc_type === 'Credit' ? 'EDC_CREDIT' : 'EDC_DEBIT';
                                          handleUpdateSplitRow(idx, {
                                            method: newMethod,
                                            provider_name: m === 'TRANSFER' ? (selectedBank || 'BCA') : m === 'QRIS' ? (selectedQris || 'BCA') : undefined,
                                            edc_bank: m === 'EDC' ? (selectedEdcBank || 'BCA') : undefined,
                                            edc_type: m === 'EDC' ? (row.edc_type || 'Debit') : undefined,
                                          });
                                        }}
                                        className={`py-1 px-1 rounded-lg text-[10.5px] font-bold transition-all border text-center cursor-pointer ${
                                          isActive
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {m === 'TRANSFER' ? 'Transfer' : m === 'TUNAI' ? 'Tunai' : m === 'QRIS' ? 'QRIS' : 'EDC'}
                                      </button>
                                    );
                                  })}
                                </div>
                                {splitRows.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSplitRow(idx)}
                                    className="w-7 h-7 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                                    title="Hapus baris metode ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {/* Sub-selectors */}
                              {(row.method === 'TRANSFER' || row.method === 'TRANSFER_BCA') && (
                                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                  <span className="text-[10px] font-bold text-slate-500 mr-1">Bank:</span>
                                  {bankOptions.map((b) => (
                                    <button
                                      key={b.provider_name}
                                      type="button"
                                      onClick={() => handleUpdateSplitRow(idx, { provider_name: b.provider_name })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        (row.provider_name || selectedBank) === b.provider_name
                                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {b.provider_name}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {row.method === 'QRIS' && (
                                <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                  <span className="text-[10px] font-bold text-slate-500 mr-1">QRIS:</span>
                                  {qrisOptions.map((q) => (
                                    <button
                                      key={q.provider_name}
                                      type="button"
                                      onClick={() => handleUpdateSplitRow(idx, { provider_name: q.provider_name })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        (row.provider_name || selectedQris) === q.provider_name
                                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-2xs'
                                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {q.provider_name}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {(row.method === 'EDC' || row.method === 'EDC_DEBIT' || row.method === 'EDC_CREDIT') && (
                                <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-500 mr-1">Mesin:</span>
                                    {edcBanks.map((eb) => (
                                      <button
                                        key={eb}
                                        type="button"
                                        onClick={() => handleUpdateSplitRow(idx, { edc_bank: eb })}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                          (row.edc_bank || selectedEdcBank) === eb
                                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        {eb}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                                    <span className="text-[10px] font-bold text-slate-500 mr-1">Tipe:</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSplitRow(idx, { method: 'EDC_DEBIT', edc_type: 'Debit' })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        row.edc_type !== 'Credit'
                                          ? 'bg-purple-700 text-white border-purple-700'
                                          : 'bg-white text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      Debit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSplitRow(idx, { method: 'EDC_CREDIT', edc_type: 'Credit' })}
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                                        row.edc_type === 'Credit'
                                          ? 'bg-amber-600 text-white border-amber-600'
                                          : 'bg-white text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      Kredit (+Surcharge)
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Amount input for this line */}
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">Rp</span>
                                  <input
                                    type="text"
                                    value={row.amount ? formatRupiah(row.amount).replace('Rp ', '') : ''}
                                    onChange={(e) => {
                                      const val = parseRupiahInput(e.target.value);
                                      handleUpdateSplitRow(idx, { amount: val });
                                    }}
                                    placeholder="0"
                                    className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono text-sm font-bold focus:bg-white focus:border-indigo-600 focus:outline-none"
                                  />
                                </div>
                                {splitRemaining > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const currentWithoutThis = splitRows.reduce((sum, r, i) => i === idx ? sum : sum + (Number(r.amount) || 0), 0);
                                      const rem = Math.max(0, effectivePayable - currentWithoutThis);
                                      handleUpdateSplitRow(idx, { amount: rem });
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-[10.5px] font-bold whitespace-nowrap cursor-pointer transition-colors shrink-0"
                                    title="Isi dengan sisa tagihan yang belum terbayar"
                                  >
                                    + Sisa ({formatRupiah(splitRemaining)})
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Split Status Summary Card */}
                      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5 text-xs shadow-2xs">
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total Tagihan:</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(effectivePayable)}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span>Total Terbayar:</span>
                          <span className="font-mono font-black text-indigo-700">{formatRupiah(totalSplitPaid)}</span>
                        </div>
                        {splitRemaining > 0 ? (
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between font-bold text-rose-600">
                            <span>⚠️ Masih Kurang:</span>
                            <span className="font-mono">{formatRupiah(splitRemaining)}</span>
                          </div>
                        ) : (
                          <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between font-bold text-emerald-700">
                            <span>✓ Status Pelunasan:</span>
                            <span>Lunas Pas</span>
                          </div>
                        )}
                        {splitChange > 0 && (
                          <div className="flex items-center justify-between font-bold text-blue-700">
                            <span>Kembalian Tunai:</span>
                            <span className="font-mono">{formatRupiah(splitChange)}</span>
                          </div>
                        )}
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
                  disabled={tag === 'REGULAR' && (isSplitMode ? isSplitShort : isCashShort)}
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
                      : isSplitMode
                      ? `Selesaikan Multi-Bayar (${formatRupiah(totalSplitPaid)})`
                      : `Selesaikan Transaksi (${formatRupiah(effectivePayable)})`}
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
