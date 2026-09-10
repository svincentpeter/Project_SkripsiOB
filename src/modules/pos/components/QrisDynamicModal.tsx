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
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/90 flex items-center justify-center text-white shadow-inner">
              <QrCode className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-white">QRIS Dinamis Midtrans</h3>
                <span className="px-1.5 py-0.5 bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[9px] font-semibold rounded">
                  Core API
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Verifikasi Otomatis Real-Time</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-3.5">
          {/* Tagihan Info Card */}
          <div className="bg-gradient-to-b from-slate-50 to-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Pembayaran
            </span>
            <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Rp {grossAmount.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-0.5">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold text-slate-700">
                Nota: {orderId}
              </span>
              {customerName && (
                <span className="text-slate-600 font-medium truncate max-w-[180px]">
                  • {customerName}
                </span>
              )}
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-slate-700">Menghubungkan Midtrans & Membuat QRIS...</span>
              <span className="text-[11px] text-slate-400">Menyiapkan kode QR pembayaran resmi</span>
            </div>
          )}

          {/* Success State */}
          {!isLoading && isSettled && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-emerald-600 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-lg font-black text-slate-900">Pembayaran Berhasil!</h4>
                <p className="text-xs text-slate-500">
                  Dana telah terverifikasi via QRIS. Menyelesaikan transaksi...
                </p>
              </div>
            </div>
          )}

          {/* Authentic QRIS Display Card */}
          {!isLoading && !isSettled && chargeData && (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col items-center">
                {/* Official QRIS Header */}
                <div className="w-full flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center tracking-tighter">
                      <span className="text-lg font-black text-slate-900 leading-none">QR</span>
                      <span className="text-lg font-black text-red-600 leading-none">IS</span>
                    </div>
                    <div className="h-4 w-[1px] bg-slate-200" />
                    <div className="text-[8px] font-bold text-slate-400 uppercase leading-tight tracking-tight">
                      STANDAR PEMBAYARAN<br />NASIONAL
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      BENGKEL OMAH BAN
                    </div>
                    <div className="text-[9px] font-mono text-slate-400">
                      NMID: ID102003948291
                    </div>
                  </div>
                </div>

                {/* Clean, Unobstructed QR Code Container */}
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-inner flex items-center justify-center">
                  <img
                    src={
                      chargeData.qr_url ||
                      `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(
                        chargeData.qr_string
                      )}`
                    }
                    alt="QRIS Dinamis"
                    className="w-56 h-56 object-contain rounded-md block select-none"
                  />
                </div>

                {/* Supported Applications Badge Strip */}
                <div className="w-full mt-3 pt-2.5 border-t border-slate-100 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] text-slate-400 font-medium">
                    Menerima pembayaran dari e-wallet & m-banking:
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1 text-[9px] font-bold uppercase text-slate-600">
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">BCA</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">Mandiri</span>
                    <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-100">GoPay</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">OVO</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">DANA</span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100">ShopeePay</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">Semua Bank</span>
                  </div>
                </div>
              </div>

              {/* Status Polling Indicator & Countdown Timer */}
              <div className="flex items-center justify-between w-full px-1 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span>Menunggu scan pelanggan...</span>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-lg text-amber-800 font-mono font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              </div>

              {/* Copy QR String Button */}
              <button
                type="button"
                onClick={handleCopyQrString}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer py-0.5"
              >
                {copiedString ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">QR String Berhasil Disalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Salin Kode QR String</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Sandbox & Demo Assist Bar */}
          {!isLoading && !isSettled && (
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-900">Uji Coba Demo Sidang Skripsi</span>
                </div>
                <span className="bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase">
                  Sandbox
                </span>
              </div>
              <p className="text-[11px] text-amber-800/90 leading-tight">
                Untuk kemudahan presentasi sidang tanpa memindai smartphone fisik:
              </p>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={isSimulating}
                  onClick={handleSimulatePayment}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm hover:shadow"
                >
                  {isSimulating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isSimulating ? 'Memproses...' : 'Simulasi Bayar Lunas'}</span>
                </button>

                <a
                  href="https://simulator.sandbox.midtrans.com/qris/index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-amber-300/80 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Web Simulator</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Terhubung Midtrans Payment Gateway</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
