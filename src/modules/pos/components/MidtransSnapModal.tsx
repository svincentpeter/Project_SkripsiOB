import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  Landmark,
  QrCode,
} from 'lucide-react';
import { paymentApi, MidtransSnapResponse } from '../../../services/api/paymentApi';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks?: {
          onSuccess?: (result: any) => void;
          onPending?: (result: any) => void;
          onError?: (result: any) => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

interface MidtransSnapModalProps {
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

type DummyChannel = 'CREDIT_CARD' | 'VIRTUAL_ACCOUNT' | 'EWALLET_QRIS';

const DUMMY_CARDS = [
  { label: 'Visa Sukses (3DS)', number: '4811111111111114', meta: 'Exp 12/30 · CVV 123 · OTP 112233', tone: 'emerald' as const },
  { label: 'Visa Ditolak (Test Gagal)', number: '4911111111111113', meta: 'Untuk simulasi transaksi ditolak', tone: 'rose' as const },
];

function ensureSnapScript(scriptUrl: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-midtrans-snap="true"]');
    if (existing) {
      if (existing.src === scriptUrl && existing.dataset.clientKey === clientKey) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap.js')), { once: true });
        return;
      }
      existing.remove();
    }
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.dataset.clientKey = clientKey;
    script.dataset.midtransSnap = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.js'));
    document.head.appendChild(script);
  });
}

export const MidtransSnapModal: React.FC<MidtransSnapModalProps> = ({
  isOpen,
  onClose,
  orderId,
  grossAmount,
  customerName,
  onSuccess,
}) => {
  const [snapData, setSnapData] = useState<MidtransSnapResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSettled, setIsSettled] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(900);
  const [isOpeningSnap, setIsOpeningSnap] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [dummyChannel, setDummyChannel] = useState<DummyChannel>('CREDIT_CARD');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsSettled(false);
    setSnapData(null);
    setSecondsRemaining(900);
    setErrorMessage(null);
    setIsOpeningSnap(false);
  };

  useEffect(() => {
    if (isOpen && orderId && grossAmount > 0) {
      initiateSnap();
    } else {
      cleanup();
    }
    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, orderId, grossAmount]);

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setErrorMessage('Sesi Midtrans Snap kedaluwarsa. Silakan buat sesi pembayaran baru.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
        provider: 'MIDTRANS_SNAP',
      });
    }, 1100);
  };

  const startPolling = (targetOrderId: string) => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.checkQrisStatus(targetOrderId);
        if (res.success && res.data && res.data.transaction_status === 'settlement') {
          handlePaymentSuccess(res.data);
        }
      } catch {
        // Lanjut polling diam-diam
      }
    }, 2500);
  };

  const initiateSnap = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setIsSettled(false);
    setSecondsRemaining(900);

    try {
      const res = await paymentApi.createSnap(orderId, grossAmount, customerName);
      if (res.success && res.data) {
        setSnapData(res.data);
        startPolling(res.data.order_id);
        startTimer();
      } else {
        setErrorMessage(res.message || 'Gagal menyiapkan sesi Midtrans Snap.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Koneksi ke Midtrans Payment Gateway gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLaunchSnapPopup = async () => {
    if (!snapData?.snap_token || !snapData.client_key || !snapData.snap_js_url) return;
    setIsOpeningSnap(true);
    setErrorMessage(null);
    try {
      await ensureSnapScript(snapData.snap_js_url, snapData.client_key);
      if (!window.snap) {
        throw new Error('Library Midtrans Snap tidak tersedia di browser.');
      }
      window.snap.pay(snapData.snap_token, {
        onSuccess: async () => {
          // Verifikasi ulang ke server agar status settlement tercatat sah di database
          try {
            const check = await paymentApi.checkQrisStatus(orderId);
            if (check.success && check.data?.transaction_status === 'settlement') {
              handlePaymentSuccess(check.data);
            }
          } catch {
            // Polling akan menangkap status lunas beberapa detik kemudian
          }
        },
        onPending: () => {
          // Menunggu pembayaran VA/QRIS diselesaikan pelanggan (polling aktif)
        },
        onError: () => {
          setErrorMessage('Pembayaran melalui Midtrans Snap dibatalkan atau ditolak.');
        },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuka jendela Midtrans Snap.');
    } finally {
      setIsOpeningSnap(false);
    }
  };

  const handleSimulateDummyPayment = async () => {
    setIsSimulating(true);
    setErrorMessage(null);
    try {
      const res = await paymentApi.simulateQrisPayment(orderId);
      if (res.success) {
        handlePaymentSuccess({
          order_id: orderId,
          settlement_time: new Date().toISOString(),
        });
      } else {
        setErrorMessage('Simulasi bayar dummy ditolak oleh server.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memicu simulasi pembayaran dummy.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopy = (value: string, key: string) => {
    navigator.clipboard.writeText(value);
    setCopiedText(key);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const hasLiveSnapToken = Boolean(snapData?.snap_token && !snapData?.is_fallback && snapData?.client_key);

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/90 flex items-center justify-center text-white shadow-inner shrink-0">
              <CreditCard className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold tracking-tight text-white">Midtrans Snap (Pengganti EDC)</h3>
                <span
                  className={`px-1.5 py-0.5 border text-[9px] font-semibold rounded ${
                    snapData?.is_production
                      ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200'
                      : 'bg-amber-500/25 border-amber-400/50 text-amber-200'
                  }`}
                >
                  {snapData?.is_production ? 'Production Live' : 'Sandbox Uji Coba'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">Kartu Kredit/Debit · Virtual Account · E-Wallet · QRIS</p>
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

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Tagihan Info */}
          <div className="bg-gradient-to-b from-slate-50 to-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total Tagihan Midtrans
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono tabular-nums">
              Rp {grossAmount.toLocaleString('id-ID')}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-0.5 flex-wrap">
              <span className="bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold text-slate-700">
                Order: {orderId}
              </span>
              {customerName && (
                <span className="text-slate-600 font-medium truncate max-w-[180px]">
                  • {customerName}
                </span>
              )}
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <span className="text-xs font-bold text-slate-700">Menghubungkan Midtrans Snap Gateway...</span>
              <span className="text-[11px] text-slate-400">Menyiapkan kanal Kartu Kredit/Debit, VA &amp; QRIS</span>
            </div>
          )}

          {!isLoading && isSettled && (
            <div className="py-10 flex flex-col items-center justify-center gap-3 text-emerald-600 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-lg font-black text-slate-900">Pembayaran Midtrans Lunas!</h4>
                <p className="text-xs text-slate-500">
                  Pelunasan terverifikasi di server. Menyimpan nota &amp; membukukan jurnal SAK EMKM...
                </p>
              </div>
            </div>
          )}

          {!isLoading && !isSettled && snapData && (
            <div className="space-y-3.5">
              {/* Kanal Midtrans Snap (asli bila kunci Sandbox/Prod sudah diisi) */}
              {hasLiveSnapToken ? (
                <div className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-extrabold text-indigo-950">
                        Checkout Midtrans Snap Siap Digunakan
                      </h4>
                      <p className="text-[11px] text-indigo-800/90 mt-0.5 leading-snug">
                        Pelanggan dapat bayar langsung di layar kasir atau scan QR tautan bayar agar aman mengetik kartu &amp; OTP di HP sendiri.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isOpeningSnap}
                    onClick={handleLaunchSnapPopup}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    {isOpeningSnap ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    <span>Buka Layar Pembayaran Midtrans Snap</span>
                  </button>

                  {snapData.redirect_url && (
                    <div className="bg-white border border-indigo-200/80 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-3">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(snapData.redirect_url)}`}
                        alt="QR Tautan Bayar Midtrans Snap"
                        className="w-28 h-28 rounded-lg border border-slate-200 shrink-0"
                      />
                      <div className="space-y-1.5 text-center sm:text-left">
                        <div className="text-[11px] font-extrabold text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
                          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Scan ke HP Pelanggan (Pengganti Mesin EDC)</span>
                        </div>
                        <p className="text-[10.5px] text-slate-600 leading-snug">
                          Pelanggan scan QR ini dari kamera HP, pilih Kartu Kredit/Debit, Virtual Account, atau QRIS, lalu selesaikan pembayaran di HP sendiri.
                        </p>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-0.5">
                          <a
                            href={snapData.redirect_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka Tab Baru</span>
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy(snapData.redirect_url!, 'redirect')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10.5px] font-bold cursor-pointer"
                          >
                            {copiedText === 'redirect' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedText === 'redirect' ? 'Disalin' : 'Salin Link'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Mode Simulasi Sandbox Aktif (Tanpa Kunci Midtrans Asli)</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Anda tetap bisa langsung menguji alur pembayaran pengganti EDC memakai tombol <strong>Simulasi Bayar Dummy</strong> di bawah. Bila sudah mengambil kunci Sandbox (<code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-slate-200">SB-Mid-server-...</code> &amp; <code className="font-mono text-[10px] bg-white px-1 py-0.5 rounded border border-slate-200">SB-Mid-client-...</code>) di <code className="font-mono text-[10px]">backend/.env</code>, popup resmi Midtrans Snap &amp; QR link HP pelanggan otomatis muncul di sini.
                  </p>
                </div>
              )}

              {/* Status Polling & Timer */}
              <div className="flex items-center justify-between px-1 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span>Menunggu konfirmasi Midtrans...</span>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg text-amber-800 font-mono font-bold text-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>{formatTimer(secondsRemaining)}</span>
                </div>
              </div>

              {/* Panel Cara Bayar Dummy (Khusus Mode Sandbox) */}
              {snapData.simulation_enabled && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span className="text-xs font-extrabold text-amber-950">
                        Cara Bayar Dummy (Uji Coba &amp; Sidang Skripsi)
                      </span>
                    </div>
                    <span className="bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0">
                      Sandbox
                    </span>
                  </div>

                  {/* Pilihan Kanal Dummy 1-Klik */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      1. Simulasi 1-Klik (Langsung Lunas ke Server &amp; Jurnal SAK EMKM):
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'CREDIT_CARD' as const, label: 'Kartu Visa/MC', icon: CreditCard },
                        { id: 'VIRTUAL_ACCOUNT' as const, label: 'Virtual Account', icon: Landmark },
                        { id: 'EWALLET_QRIS' as const, label: 'QRIS / GoPay', icon: QrCode },
                      ].map((ch) => {
                        const Icon = ch.icon;
                        const active = dummyChannel === ch.id;
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => setDummyChannel(ch.id)}
                            className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                              active
                                ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                                : 'bg-white text-amber-900 border-amber-200 hover:bg-amber-100/60'
                            }`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span className="truncate">{ch.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={isSimulating}
                      onClick={handleSimulateDummyPayment}
                      className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
                    >
                      {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>
                        {isSimulating
                          ? 'Memproses Pelunasan Dummy...'
                          : `Simulasi Bayar Lunas (${
                              dummyChannel === 'CREDIT_CARD'
                                ? 'Kartu Dummy'
                                : dummyChannel === 'VIRTUAL_ACCOUNT'
                                ? 'VA Dummy'
                                : 'QRIS Dummy'
                            })`}
                      </span>
                    </button>
                  </div>

                  {/* Data Kartu Dummy Resmi Midtrans Sandbox */}
                  <div className="pt-2 border-t border-amber-200/80 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-amber-900">
                        2. Kartu Kredit/Debit Dummy Resmi Midtrans Sandbox:
                      </span>
                      <a
                        href="https://simulator.sandbox.midtrans.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10.5px] font-bold text-indigo-700 hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        <span>Simulator VA/QRIS</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="space-y-1.5">
                      {DUMMY_CARDS.map((card) => (
                        <div
                          key={card.number}
                          className="bg-white border border-amber-200/90 rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 text-[10.5px]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`font-extrabold ${
                                  card.tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {card.label}
                              </span>
                              <code className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                {card.number}
                              </code>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">{card.meta}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopy(card.number, card.number)}
                            className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {copiedText === card.number ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Salin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Midtrans Payment Gateway · Pengganti EDC</span>
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
