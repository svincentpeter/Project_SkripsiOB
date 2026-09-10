import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import { formatRupiah } from '../../../shared/utils/formatters';
import { paymentApi, QrisChargeResponse } from '../../../services/api/paymentApi';

interface QrisDynamicModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  grossAmount: number;
  customerName?: string;
  onSuccess: (paymentData: {
    transactionId?: string;
    orderId: string;
    grossAmount: number;
    settlementTime?: string;
    provider: string;
  }) => void;
}

export const QrisDynamicModal: React.FC<QrisDynamicModalProps> = ({
  isOpen,
  onClose,
  orderId,
  grossAmount,
  customerName,
  onSuccess,
}) => {
  const [chargeData, setChargeData] = useState<QrisChargeResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettled, setIsSettled] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900); // 15 menit
  const [copiedString, setCopiedString] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const pollIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen && orderId && grossAmount > 0) {
      initiateQris();
    } else {
      cleanup();
    }
    return () => cleanup();
  }, [isOpen, orderId, grossAmount]);

  const cleanup = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsSettled(false);
    setChargeData(null);
    setSecondsRemaining(900);
    setErrorMessage(null);
  };

  const initiateQris = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsSettled(false);
    setSecondsRemaining(900);

    try {
      const res = await paymentApi.chargeQris(orderId, grossAmount, customerName);
      if (res.success && res.data) {
        setChargeData(res.data);
        startPolling(res.data.order_id);
        startTimer();
      } else {
        setErrorMessage(res.message || 'Gagal membuat tagihan QRIS.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Koneksi ke gateway pembayaran gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setErrorMessage('Masa berlaku QRIS telah habis. Silakan buat QR baru.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startPolling = (targetOrderId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.checkQrisStatus(targetOrderId);
        if (res.success && res.data && res.data.transaction_status === 'settlement') {
          handlePaymentSuccess(res.data);
        }
      } catch (err) {
        // Keep polling silently
      }
    }, 2500);
  };

  const handlePaymentSuccess = (data: any) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsSettled(true);

    setTimeout(() => {
      onSuccess({
        transactionId: data.order_id || orderId,
        orderId,
        grossAmount,
        settlementTime: data.settlement_time || new Date().toISOString(),
        provider: 'MIDTRANS_QRIS',
      });
    }, 1200);
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      const res = await paymentApi.simulateQrisPayment(orderId);
      if (res.success) {
        handlePaymentSuccess({
          order_id: orderId,
          settlement_time: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      setErrorMessage('Gagal memicu simulasi lunas.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyQrString = () => {
    if (chargeData?.qr_string) {
      navigator.clipboard.writeText(chargeData.qr_string);
      setCopiedString(true);
      setTimeout(() => setCopiedString(false), 2000);
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">QRIS Dinamis Midtrans</h3>
              <p className="text-[11px] text-slate-400">Verifikasi Otomatis Real-Time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Tagihan Info */}
          <div className="text-center space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-[11px] uppercase font-bold text-slate-400">Total Pembayaran</span>
            <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              {formatRupiah(grossAmount)}
            </div>
            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
              <span>Nota: <strong className="font-mono text-slate-700">{orderId}</strong></span>
              {customerName && <span>• {customerName}</span>}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2.5 text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-bold">Menghubungkan Midtrans & Membuat QRIS...</span>
            </div>
          )}

          {/* Success State */}
          {!isLoading && isSettled && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-emerald-600 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h4 className="text-lg font-black text-slate-900">Pembayaran Berhasil!</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dana telah terverifikasi via QRIS. Menyelesaikan transaksi...
                </p>
              </div>
            </div>
          )}

          {/* QR Code Presentation */}
          {!isLoading && !isSettled && chargeData && (
            <div className="flex flex-col items-center space-y-3">
              {/* QR Image Container */}
              <div className="p-3 bg-white border-2 border-dashed border-blue-200 rounded-2xl shadow-inner relative group">
                <img
                  src={
                    chargeData.qr_url ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                      chargeData.qr_string
                    )}`
                  }
                  alt="QRIS Dinamis"
                  className="w-52 h-52 object-contain rounded-xl"
                />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                  GOPAY • BCA • LIVIN • OVO • DANA • SHOPEEPAY
                </div>
              </div>

              {/* Status Polling Indicator & Countdown Timer */}
              <div className="flex items-center justify-between w-full px-2 text-xs">
                <div className="flex items-center gap-1.5 text-blue-700 font-bold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menunggu Pembayaran...</span>
                </div>
                <div className="flex items-center gap-1 text-slate-500 font-mono font-bold">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              </div>

              {/* Copy QR String for Simulator */}
              <button
                type="button"
                onClick={handleCopyQrString}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedString ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">QR String Berhasil Disalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Kode QR String</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sandbox & Demo Assist Bar */}
          {!isLoading && !isSettled && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-semibold">Fitur Demo & Uji Coba Skripsi:</span>
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[9px]">
                  SANDBOX
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={handleSimulatePayment}
                  className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isSimulating ? 'Memproses...' : 'Simulasi Lunas'}</span>
                </button>

                <a
                  href="https://simulator.sandbox.midtrans.com/qris/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Web Simulator</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Midtrans Core API Secured
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
