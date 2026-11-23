import React, { useRef, useState } from 'react';
import {
  ShieldCheck,
  User,
  Lock,
  LogIn,
  AlertTriangle,
  Store,
  Boxes,
  ArrowRight
} from 'lucide-react';
import { UserSession } from '../../shared/types';
import { ApiError, authApi } from '../../services/api';

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

// Kartu login cepat hanya untuk `npm run dev`; tetap login lewat server.
const DEV_QUICK_LOGIN = import.meta.env.DEV;
const DEV_LOGIN_PASSWORD: string | undefined = import.meta.env.VITE_DEV_LOGIN_PASSWORD;

const QUICK_ACCOUNTS = [
  { username: 'owner', label: 'Agus Subagyo', role: 'OWNER', Icon: ShieldCheck },
  { username: 'kasir', label: 'Kasir OB3', role: 'KASIR', Icon: Store },
  { username: 'gudang', label: 'Admin Gudang OB3', role: 'GUDANG', Icon: Boxes },
] as const;

const DEMO_USERS: Record<string, UserSession> = {
  owner: {
    id: 1,
    username: 'owner',
    name: 'Agus Subagyo',
    email: 'owner@omahban.com',
    role: 'OWNER',
    branch_name: 'Cabang 3 Magelang',
    is_active: true,
  },
  kasir: {
    id: 2,
    username: 'kasir',
    name: 'Kasir OB3',
    email: 'kasir@omahban.com',
    role: 'KASIR',
    branch_name: 'Cabang 3 Magelang',
    is_active: true,
  },
  gudang: {
    id: 3,
    username: 'gudang',
    name: 'Admin Gudang OB3',
    email: 'gudang@omahban.com',
    role: 'GUDANG',
    branch_name: 'Cabang 3 Magelang',
    is_active: true,
  },
};

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const submitLogin = async (login: string, secret: string) => {
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const { user } = await authApi.login(login, secret);
      await onLogin(user);
    } catch (err) {
      // Jika server offline / mode lokal, fallback ke profil demo terdaftar
      if (err instanceof ApiError && (err.status === 0 || err.status === 408)) {
        const demoUser = DEMO_USERS[login.toLowerCase().trim()];
        if (demoUser) {
          await onLogin(demoUser);
          return;
        }
      }
      setErrorMessage(describeLoginError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitLogin(identifier.trim(), password);
  };

  const handleQuickLogin = (username: string) => {
    setIdentifier(username);
    submitLogin(username, DEV_LOGIN_PASSWORD || 'password');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Workstation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center tracking-tight">
              OB3
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight text-white uppercase">Omah Ban</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border border-slate-700 bg-slate-800 text-slate-300">
                  Cabang 3 Magelang
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Pusat Penjualan Ban Mobil, Velg & Bengkel Spooring 3D
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SAK EMKM FIFO 2026</span>
          </div>
        </div>
      </header>

      {/* Main Terminal Box */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Contextual System Info */}
          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 text-xs font-mono">
                <span>TERMINAL KERJA TERPADU</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                Sistem Kasir POS & Akuntansi SAK EMKM
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-prose">
                Aplikasi operasional terpadu <strong>Omah Ban Cabang 3</strong>: mencatat transaksi kasir depan toko, menghitung HPP persediaan ban metode FIFO per batch, hingga laporan posisi keuangan otomatis.
              </p>
            </div>

            {/* Academic Credential Box */}
            <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Identitas Penelitian & Toko
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">PENGEMBANG / PENELITI:</span>
                  <span className="text-slate-100 font-bold block mt-0.5">Catherine Wong</span>
                  <span className="text-[11px] text-blue-400 font-mono">NIM: 23.G4.0007</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">S1 Akuntansi - UNIKA Soegijapranata</span>
                </div>

                <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono">PEMILIK USAHA (OWNER):</span>
                  <span className="text-slate-100 font-bold block mt-0.5">Agus Subagyo</span>
                  <span className="text-[11px] text-slate-300 font-medium">Omah Ban Cabang 3</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Kab. Magelang, Jawa Tengah</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
                Internal Control: Pemisahan fungsi kasir, gudang, dan pembukuan pemilik.
              </div>
            </div>
          </div>

          {/* Right Column: Workstation Login Form */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-7 shadow-xl space-y-5">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-blue-400" />
                  <span>Otentikasi Pengguna</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Masukkan username atau email dan kata sandi akun Anda.
                </p>
              </div>

              {DEV_QUICK_LOGIN && (
                <div className="space-y-2" data-testid="dev-quick-login">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="font-bold text-slate-400 uppercase">
                      Profil Akses Cepat
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {DEV_LOGIN_PASSWORD ? 'Sandi Terisi' : 'Mode Dev'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {QUICK_ACCOUNTS.map(({ username, label, role, Icon }) => (
                      <button
                        key={username}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleQuickLogin(username)}
                        className="p-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-800/80 hover:border-slate-700 text-left transition-colors cursor-pointer disabled:opacity-60 group focus-ring"
                      >
                        <div className="flex items-center justify-between">
                          <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-white" />
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <span className="block text-xs font-bold text-slate-200 mt-1">{label}</span>
                        <span className="block text-[10px] font-mono text-slate-400">{role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Form Input */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                {errorMessage && (
                  <div 
                    data-testid="login-error-alert"
                    className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs font-medium flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Username atau Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="username atau email"
                      autoComplete="username"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-white placeholder-slate-400 focus-ring font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      ref={passwordRef}
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-md text-white placeholder-slate-400 focus-ring font-mono"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait focus-ring"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memeriksa Kredensial...' : 'Masuk ke Sistem'}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Technical Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-2 text-center text-slate-400 text-xs font-mono">
        Omah Ban Cabang 3 • Magelang • Skripsi Akuntansi FEB UNIKA Soegijapranata (2026)
      </footer>
    </div>
  );
};
