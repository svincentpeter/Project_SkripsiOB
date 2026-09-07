import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  LogIn, 
  Sparkles, 
  Award, 
  Building2, 
  Store, 
  Wrench, 
  Boxes, 
  CheckCircle2, 
  ArrowRight,
  Disc
} from 'lucide-react';
import { UserSession } from '../../shared/types';
import { DEFAULT_USERS } from '../../shared/data/mockData';

interface LoginScreenProps {
  onLogin: (user: UserSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [selectedEmail, setSelectedEmail] = useState(DEFAULT_USERS[0].email);
  const [password, setPassword] = useState('password');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedUser = DEFAULT_USERS.find((u) => u.email.toLowerCase() === selectedEmail.toLowerCase());
    if (matchedUser) {
      onLogin(matchedUser);
    } else {
      setErrorMessage('Email tidak terdaftar dalam sistem Omah Ban Cabang 3');
    }
  };

  const handleQuickLogin = (user: UserSession) => {
    onLogin(user);
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

          {/* Right Column: Interactive Login & Quick Demo Card */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-6">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-blue-400" />
                  <span>Masuk ke Sistem Omah Ban</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih akun di bawah atau masuk dengan kredensial terdaftar.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {errorMessage}
                </div>
              )}

              {/* 1-Click Quick Demo User Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Pilih Cepat Akun Demo (1-Click Login):
                </label>

                <div className="grid grid-cols-1 gap-2.5">
                  {DEFAULT_USERS.map((u) => {
                    const isOwner = u.role === 'OWNER';
                    const isKasir = u.role === 'KASIR';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickLogin(u)}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group ${
                          isOwner
                            ? 'bg-gradient-to-r from-blue-950/40 to-slate-900 border-blue-600/40 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10'
                            : isKasir
                            ? 'bg-gradient-to-r from-emerald-950/40 to-slate-900 border-emerald-600/40 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10'
                            : 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-600/40 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm ${
                            isOwner 
                              ? 'bg-blue-600 ring-2 ring-blue-400/30' 
                              : isKasir 
                              ? 'bg-emerald-600 ring-2 ring-emerald-400/30' 
                              : 'bg-amber-600 ring-2 ring-amber-400/30'
                          }`}>
                            {isOwner ? <ShieldCheck className="w-5 h-5" /> : isKasir ? <Store className="w-5 h-5" /> : <Boxes className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                                {u.name}
                              </span>
                              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                                isOwner 
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                                  : isKasir 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}>
                                {u.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              {isOwner 
                                ? 'Hak Akses Penuh & Laporan Keuangan' 
                                : isKasir 
                                ? 'Kasir POS, DP & Pelunasan BON' 
                                : 'Restock Batch FIFO & Stock Opname'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-xs font-bold text-slate-400 group-hover:text-white transition-colors">
                          <span className="hidden sm:inline text-[11px]">Masuk</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-800" />
                <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Atau Gunakan Form
                </span>
                <div className="flex-grow border-t border-slate-800" />
              </div>

              {/* Form Input */}
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Email Pengguna
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={selectedEmail}
                      onChange={(e) => setSelectedEmail(e.target.value)}
                      placeholder="nama@omahban.com"
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk Sesuai Kredensial</span>
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
