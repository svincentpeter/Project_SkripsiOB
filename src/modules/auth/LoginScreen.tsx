import React, { useState } from 'react';
import {
  User,
  Lock,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { UserSession } from '../../shared/types';
import { ApiError, authApi } from '../../services/api';
import logoOmahBan from '../../assets/brand/logo-omah-ban.png';

interface LoginScreenProps {
  onLogin: (user: UserSession) => void | Promise<void>;
}

const describeLoginError = (err: unknown): string => {
  if (!(err instanceof ApiError)) return 'Login gagal. Silakan coba lagi.';
  if (err.status === 0 || err.status === 408) {
    return 'Server tidak dapat dihubungi. Pastikan backend Laravel berjalan.';
  }
  if (err.status === 429) return 'Terlalu banyak percobaan. Coba lagi dalam 1 menit.';
  return err.message;
};

const SYSTEM_PILLARS = [
  {
    title: 'Point of Sale',
    detail: 'Kasir cepat & cetak struk',
  },
  {
    title: 'Persediaan FIFO',
    detail: 'Kontrol batch & kartu stok',
  },
  {
    title: 'Akuntansi',
    detail: 'Jurnal otomatis & laporan',
  },
] as const;

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const login = identifier.trim();
    if (!login || !password) return;

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const { user } = await authApi.login(login, password);
      await onLogin(user);
    } catch (err) {
      setErrorMessage(describeLoginError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col lg:grid lg:grid-cols-12">
      {/* Desktop Executive Brand Panel */}
      <aside className="hidden lg:flex lg:col-span-6 xl:col-span-7 bg-[#0B1426] text-white relative overflow-hidden flex-col justify-between p-10 xl:p-14 border-r border-slate-800/80">
        {/* Precision concentric tire-ring architectural motif */}
        <svg
          aria-hidden="true"
          viewBox="0 0 640 640"
          fill="none"
          className="pointer-events-none select-none absolute -right-32 -bottom-32 w-[560px] h-[560px] xl:w-[680px] xl:h-[680px] text-white"
        >
          <circle cx="320" cy="320" r="300" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
          <circle cx="320" cy="320" r="248" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="6 10" />
          <circle cx="320" cy="320" r="196" stroke="#3B82F6" strokeOpacity="0.16" strokeWidth="1.25" />
          <circle cx="320" cy="320" r="136" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
          <circle cx="320" cy="320" r="72" stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
          <line x1="20" y1="320" x2="620" y2="320" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
          <line x1="320" y1="20" x2="320" y2="620" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        </svg>

        {/* Top Brand Mark */}
        <div className="relative z-10 flex items-center justify-between">
          <img
            src={logoOmahBan}
            alt="Omah Ban"
            className="h-11 xl:h-12 w-auto object-contain brightness-0 invert"
          />
        </div>

        {/* Center Editorial Copy */}
        <div className="relative z-10 my-auto py-10 max-w-xl">
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-blue-500" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">
              Sistem Operasional Terpadu
            </span>
          </div>

          <h2 className="mt-4 text-3xl xl:text-[40px] font-bold tracking-[-0.03em] text-white leading-[1.16] text-balance">
            Kendali Penuh Kasir, Persediaan &amp; Pembukuan.
          </h2>

          <p className="mt-4 text-sm xl:text-[15px] text-slate-300 leading-relaxed max-w-[46ch] text-pretty">
            Satu platform terintegrasi untuk operasional penjualan harian, pemantauan stok metode FIFO, serta pencatatan keuangan secara akurat.
          </p>
        </div>

        {/* Bottom Capability Strip */}
        <div className="relative z-10 border-t border-white/10 pt-6">
          <ul className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            {SYSTEM_PILLARS.map(({ title, detail }) => (
              <li key={title} className="min-w-[140px]">
                <span className="flex items-center gap-2 text-xs font-semibold text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" aria-hidden="true" />
                  <span>{title}</span>
                </span>
                <span className="block text-xs text-slate-400 mt-1 leading-snug pl-3.5">
                  {detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Mobile & Tablet Compact Brand Header */}
      <header className="lg:hidden bg-[#0B1426] text-white px-5 pt-8 pb-14 sm:px-8 sm:pt-10 sm:pb-16 relative overflow-hidden">
        <svg
          aria-hidden="true"
          viewBox="0 0 320 320"
          fill="none"
          className="pointer-events-none select-none absolute -right-16 -top-16 w-56 h-56 text-white"
        >
          <circle cx="160" cy="160" r="144" stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
          <circle cx="160" cy="160" r="108" stroke="#3B82F6" strokeOpacity="0.18" strokeWidth="1" />
          <circle cx="160" cy="160" r="72" stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
        </svg>

        <div className="relative z-10 max-w-[420px] mx-auto">
          <img
            src={logoOmahBan}
            alt="Omah Ban"
            className="h-9 sm:h-10 w-auto object-contain brightness-0 invert"
          />
          <p className="mt-3 text-xs sm:text-sm text-slate-300 text-pretty">
            Sistem Point of Sale, Persediaan &amp; Akuntansi Terpadu
          </p>
        </div>
      </header>

      {/* Right Authentication Workspace */}
      <main className="relative z-10 flex-1 lg:col-span-6 xl:col-span-5 flex items-start lg:items-center justify-center px-4 pb-10 sm:px-8 lg:p-12 xl:p-16 bg-[#F8FAFC] lg:bg-white">
        <div className="relative z-10 w-full max-w-[420px] lg:max-w-[390px] -mt-7 sm:-mt-8 lg:mt-0 bg-white border border-slate-200/90 lg:border-0 rounded-2xl lg:rounded-none shadow-sm lg:shadow-none p-6 sm:p-8 lg:p-0">
          {/* Eyebrow & Heading */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              <span>Portal Autentikasi</span>
            </div>

            <h1 className="mt-4 text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight text-balance">
              Selamat Datang
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 leading-relaxed text-pretty">
              Masuk menggunakan akun terdaftar untuk mengakses sistem.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleFormSubmit} className="mt-7 space-y-5">
            {errorMessage && (
              <div
                data-testid="login-error-alert"
                role="alert"
                aria-live="polite"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 leading-relaxed"
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="login-identifier"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Username atau Email
              </label>
              <div className="relative">
                <User
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Masukkan username atau email"
                  autoComplete="username"
                  autoFocus
                  disabled={isSubmitting}
                  className="w-full h-11 pl-10 pr-3.5 text-sm bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="w-full h-11 pl-10 pr-11 text-sm bg-slate-50/70 focus:bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-colors disabled:bg-slate-100 disabled:text-slate-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={isSubmitting}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
                  <span>Memeriksa kredensial...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Minimal Security Footnote */}
          <div className="mt-7 pt-5 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
            <span>Akses dibatasi khusus untuk pengguna terdaftar.</span>
          </div>
        </div>
      </main>
    </div>
  );
};
