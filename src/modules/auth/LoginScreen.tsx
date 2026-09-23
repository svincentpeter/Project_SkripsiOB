import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  LogIn, 
  Sparkles, 
  Award, 
  Building2,
  Wrench,
  CheckCircle2,
  Disc,
  AlertTriangle
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

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const { user } = await authApi.login(identifier.trim(), password);
      await onLogin(user);
    } catch (err) {
      setErrorMessage(describeLoginError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
              <Disc className="w-6 h-6 text-white animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white uppercase">Omah Ban</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Cabang 3 Magelang
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Pusat Penjualan Ban Mobil Baru, Velg & Bengkel Spooring 3D
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Standar SAK EMKM IAI 2026</span>
            </div>
            <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
              Metode RAD Prototipe
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          {/* Left Column: Academic & Research Info */}
          <div className="lg:col-span-6 space-y-5">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                <Award className="w-3.5 h-3.5" />
                <span>Tugas Akhir / Skripsi FEB Akuntansi</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
                Sistem Kasir POS & Akuntansi SAK EMKM
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Platform terintegrasi khusus untuk <strong>Omah Ban Cabang 3</strong> yang menghubungkan kasir depan toko, perhitungan HPP persediaan metode FIFO per batch, hingga penyusunan laporan keuangan otomatis.
              </p>
            </div>

            {/* Academic Credential Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-800/50 border border-slate-800 shadow-xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-400" />
                <span>Identitas Penelitian & Toko</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 block font-medium">Peneliti / Pengembang:</span>
                  <span className="text-white font-bold block mt-0.5">Catherine Wong</span>
                  <span className="text-[11px] text-blue-400 font-mono">NIM: 23.G4.0007</span>
                  <span className="text-[10px] text-slate-400 block">S1 Akuntansi - UNIKA Soegijapranata</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/40">
                  <span className="text-[11px] text-slate-400 block font-medium">Pemilik Usaha (Owner):</span>
                  <span className="text-white font-bold block mt-0.5">Agus Subagyo</span>
                  <span className="text-[11px] text-emerald-400 font-medium">Omah Ban Cabang 3</span>
                  <span className="text-[10px] text-slate-400 block">Kabupaten Magelang, Jawa Tengah</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Internal Control: Pemisahan fungsi kasir, gudang, dan pembukuan pemilik.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Login Form */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-blue-400" />
                  <span>Masuk ke Sistem Omah Ban</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Masuk dengan username atau email dan password akun Anda.
                </p>
              </div>


              {/* Form Input */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                {errorMessage && (
                  <div 
                    data-testid="login-error-alert"
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200"
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
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="username atau email"
                      autoComplete="username"
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isSubmitting ? 'Memeriksa...' : 'Masuk'}</span>
                </button>
              </form>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900 bg-slate-950/80 px-6 py-3 text-center text-slate-400 text-xs font-medium">
        Toko Ban dan Velg Omah Ban Cabang 3 • Kabupaten Magelang • Dikembangkan untuk Karya Skripsi Akuntansi FEB UNIKA Soegijapranata (2026)
      </footer>
    </div>
  );
};
