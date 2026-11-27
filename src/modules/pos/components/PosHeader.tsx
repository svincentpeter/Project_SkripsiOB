import React from 'react';
import { ArrowLeft, Clock, HelpCircle, LogOut, Receipt, Search, X } from 'lucide-react';
import { UserSession } from '../../../shared/types';
import { CashShiftControl } from './CashShiftControl';
import logoOmahBan from '../../../assets/brand/logo-omah-ban.png';

interface PosHeaderProps {
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  canAccessBackoffice: boolean;
  onExitToBackoffice?: () => void;
  parkedCount: number;
  onOpenParkedDrawer: () => void;
  cashInDrawer: number | null;
  canUseCashSession: boolean;
  canAccessReceipts: boolean;
  onNavigateToReceipts?: () => void;
  onOpenGuide?: () => void;
  cashierName: string;
  currentUser?: UserSession | null;
  onRequestLogout?: () => void;
}

export const PosHeader: React.FC<PosHeaderProps> = ({
  searchInputRef,
  searchQuery,
  onSearchChange,
  canAccessBackoffice,
  onExitToBackoffice,
  parkedCount,
  onOpenParkedDrawer,
  cashInDrawer,
  canUseCashSession,
  canAccessReceipts,
  onNavigateToReceipts,
  onOpenGuide,
  cashierName,
  currentUser,
  onRequestLogout,
}) => {
  return (
    <header className="w-full min-h-14 py-2 sm:py-0 sm:h-14 px-3 sm:px-4 bg-white border-b border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 shrink-0 z-20">
      {/* Kiri: Navigasi Backoffice / Identitas Kasir */}
      <div className="flex items-center gap-2.5 shrink-0">
        {canAccessBackoffice && onExitToBackoffice ? (
          <button
            type="button"
            onClick={onExitToBackoffice}
            className="h-9 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 active:scale-[0.98] text-slate-700 hover:text-slate-900 transition-[background-color,border-color,transform] duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            title="Kembali ke Dashboard Backoffice"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span className="text-xs font-semibold hidden sm:inline">Dashboard</span>
          </button>
        ) : (
          <div
            className="flex items-center gap-2.5 h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg shrink-0"
            title="Terminal Kasir Omah Ban Cabang 3"
          >
            <img src={logoOmahBan} alt="Omah Ban" className="h-5 w-auto object-contain shrink-0" />
            <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />
            <div className="leading-tight hidden sm:block">
              <span className="font-bold text-xs text-slate-900 block">Kasir OB3</span>
              <span className="text-[10px] text-slate-500 block">Cabang 3 Magelang</span>
            </div>
          </div>
        )}
      </div>

      {/* Tengah (Desktop) / Baris ke-2 Penuh (Mobile): Pencarian Cepat */}
      <div className="relative order-3 w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-xl min-w-0">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cari ban, ukuran (185/65), ring, merek, atau jasa..."
          aria-label="Cari produk atau layanan jasa"
          className="w-full h-9 bg-slate-100/80 border border-slate-200 focus:bg-white rounded-lg pl-9 pr-14 text-xs sm:text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-[background-color,border-color] duration-150"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              searchInputRef.current?.focus();
            }}
            aria-label="Hapus kata kunci pencarian"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-mono font-semibold text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            F2
          </kbd>
        )}
      </div>

      {/* Kanan: Kontrol Operasional Shift, Antrian, Struk, Profil & Keluar */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <CashShiftControl cashInDrawer={cashInDrawer} enabled={canUseCashSession} />

        <button
          type="button"
          onClick={onOpenParkedDrawer}
          className={`h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg border text-xs font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
            parkedCount > 0
              ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
          }`}
          title="Lihat antrian nota yang sedang ditahan"
        >
          <Clock className={`w-3.5 h-3.5 shrink-0 ${parkedCount > 0 ? 'text-amber-700' : 'text-slate-500'}`} />
          <span className="hidden sm:inline">Antrian</span>
          {parkedCount > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-700 text-white text-[10px] font-bold tabular-nums flex items-center justify-center">
              {parkedCount}
            </span>
          )}
        </button>

        {canAccessReceipts && onNavigateToReceipts && (
          <button
            type="button"
            onClick={onNavigateToReceipts}
            className="h-9 flex items-center gap-1.5 px-2.5 sm:px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] text-xs font-semibold transition-[background-color,border-color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            title="Lihat Riwayat Transaksi dan Cetak Ulang Struk"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden md:inline">Riwayat Struk</span>
          </button>
        )}

        {onOpenGuide && (
          <button
            type="button"
            onClick={onOpenGuide}
            aria-label="Buku Panduan Pengguna Toko"
            className="h-9 w-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer hidden md:flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            title="Buku Panduan Pengguna Toko"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2 pl-2 ml-0.5 border-l border-slate-200">
          <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200/80">
            <div
              className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white ${
                currentUser?.role === 'OWNER' ? 'bg-slate-900' : 'bg-blue-700'
              }`}
            >
              {cashierName.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-left leading-tight">
              <span className="font-semibold text-slate-800 text-xs block truncate max-w-[110px]">
                {cashierName}
              </span>
              <span className="text-[10px] font-medium text-slate-500 uppercase">
                {currentUser?.role || 'KASIR'}
              </span>
            </div>
          </div>

          {onRequestLogout && (
            <button
              type="button"
              onClick={onRequestLogout}
              className="h-9 flex items-center gap-1.5 px-3 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 active:scale-[0.98] text-xs font-semibold transition-[background-color,border-color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 focus-visible:ring-offset-1"
              title="Keluar dari Sesi Kasir"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
