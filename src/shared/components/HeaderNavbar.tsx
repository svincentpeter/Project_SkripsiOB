import React from 'react';
import { 
  ShoppingCart, 
  Receipt, 
  LayoutGrid, 
  Package, 
  Wallet, 
  BookOpen, 
  FileText, 
  Search, 
  Bell, 
  MessageSquare, 
  ChevronDown, 
  RotateCcw,
  HelpCircle,
  Home,
  ChevronRight,
  Settings as SettingsIcon
} from 'lucide-react';
import { ActiveScreen } from '../types';
import { formatRupiah } from '../utils/formatters';
import { NotificationBellDropdown } from './NotificationBellDropdown';

interface HeaderNavbarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  cashInDrawer: number;
  lowStockCount: number;
  cartCount: number;
  notifications?: any[];
  onMarkNotificationRead?: (id: string) => void;
  onClearNotifications?: () => void;
  onOpenWireframeModal: () => void;
  onResetData: () => void;
  currentTimeStr: string;
  backendStatus?: 'connected' | 'offline' | 'checking';
  databaseName?: string;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeScreen,
  setActiveScreen,
  cashInDrawer,
  lowStockCount,
  cartCount,
  notifications = [],
  onMarkNotificationRead,
  onClearNotifications,
  onOpenWireframeModal,
  onResetData,
  currentTimeStr,
  backendStatus = 'checking',
  databaseName = 'project-skripsi_ob',
}) => {
  const navTabs = [
    { 
      id: 'dashboard' as ActiveScreen, 
      label: 'Dashboard', 
      icon: LayoutGrid,
      breadcrumb: ['Dashboard', 'Executive Overview'],
    },
    { 
      id: 'inventory' as ActiveScreen, 
      label: 'Inventori & Master', 
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      breadcrumb: ['Inventori & Master', 'Katalog Ban, Velg, Jasa & Supplier'],
    },
    { 
      id: 'expenses' as ActiveScreen, 
      label: 'Biaya Toko', 
      icon: Wallet,
      breadcrumb: ['Biaya & Kas Kecil', 'Beban Operasional Bengkel'],
    },
    { 
      id: 'ledger' as ActiveScreen, 
      label: 'Buku Besar', 
      icon: BookOpen,
      breadcrumb: ['Akuntansi SAK EMKM', 'Buku Besar & Neraca Saldo'],
    },
    { 
      id: 'financials' as ActiveScreen, 
      label: 'Laporan Keuangan', 
      icon: FileText,
      breadcrumb: ['Laporan Keuangan', 'Laba Rugi & Posisi Keuangan (Neraca)'],
    },
    { 
      id: 'receipt' as ActiveScreen, 
      label: 'Riwayat Struk', 
      icon: Receipt,
      breadcrumb: ['Transaksi Kasir', 'Riwayat Nota & Struk Thermal 80mm'],
    },
    { 
      id: 'settings' as ActiveScreen, 
      label: 'Pengaturan', 
      icon: SettingsIcon,
      breadcrumb: ['Pengaturan Sistem', 'Identitas Toko, Struk 80mm & SAK EMKM'],
    },
  ];

  const currentTabInfo = navTabs.find((t) => t.id === activeScreen) || navTabs[0];

  return (
    <header className="bg-white sticky top-0 z-40 select-none shadow-xs border-b border-slate-200 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* TIER 1: TOP BAR (Logo + Search Bar + User + Actions) */}
      <div className="h-16 px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" onClick={() => setActiveScreen('dashboard')}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs tracking-tight transition-colors">
              OB
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">Omah Ban</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                  Cabang 3
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-semibold hidden sm:block">POS & SAK EMKM Terpadu</span>
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="w-full relative flex items-center">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari ban, ukuran ('185/65 R15'), nota kasir, akun..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-blue-600 focus:bg-white text-slate-900 placeholder-slate-500 rounded-xl text-xs font-medium transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs">
          {/* Notification Bell with Minimalist Dropdown */}
          <NotificationBellDropdown
            notifications={notifications}
            onMarkAsRead={(id) => onMarkNotificationRead?.(id)}
            onClearAll={() => onClearNotifications?.()}
            onNavigateTo={(screen) => setActiveScreen(screen as ActiveScreen)}
          />

          {/* Saldo Kas Laci Kasir (Visible on mobile & desktop) */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="hidden md:inline text-emerald-800 text-[11px] font-semibold">Kas Laci:</span>
            <span className="font-extrabold text-[11px] sm:text-xs text-emerald-950">{formatRupiah(cashInDrawer)}</span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* Backend MySQL Live Status Badge */}
          {backendStatus === 'connected' ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-[11px] font-bold shadow-2xs" title={`Terhubung ke MySQL (${databaseName}) via Laravel 12 REST API`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>MySQL Live</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-medium" title="Mode Penyimpanan Lokal Browser">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Mode Lokal</span>
            </div>
          )}

          <div className="flex items-center gap-2 p-1.5 rounded-xl">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-[11px] sm:text-xs shadow-xs">
              FA
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <span className="font-bold text-slate-900 block text-xs">Fani Ardiansyah</span>
              <span className="text-[10px] text-slate-500 font-semibold block">Kasir Pagi (OB3)</span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={onOpenWireframeModal}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Spesifikasi & Panduan Desain"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onResetData}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Reset Data Toko"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TIER 2: HORIZONTAL NAVIGATION MENU BAR */}
      <div className="h-12 px-3 sm:px-4 lg:px-8 flex items-center justify-between overflow-x-auto scrollbar-none md:custom-scrollbar bg-white">
        <nav className="flex items-center gap-1 sm:gap-2 min-w-max">
          {navTabs.map((tab) => {
            const isActive = activeScreen === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id)}
                className={`h-12 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 pl-2 sm:pl-4">
          <button
            onClick={() => setActiveScreen('pos')}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Buka Terminal Mesin Kasir POS Fullscreen"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mesin Kasir (POS)</span>
            <span className="inline sm:hidden">Kasir</span>
            {cartCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-800 text-white font-bold">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TIER 3: BREADCRUMB STRIP */}
      <div className="h-8 px-3 sm:px-4 lg:px-8 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 overflow-hidden text-[10px] sm:text-xs">
          <Home className="w-3.5 h-3.5 text-slate-500 shrink-0 cursor-pointer hover:text-blue-600" onClick={() => setActiveScreen('dashboard')} />
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-600 truncate">{currentTabInfo.breadcrumb[0]}</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-bold text-blue-700 truncate">{currentTabInfo.breadcrumb[1]}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600 font-semibold shrink-0 ml-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Cabang 3 (BSD Tangerang)</span>
          <span className="text-slate-300">•</span>
          <span>{currentTimeStr || '05 Sep 2026'}</span>
        </div>
      </div>
    </header>
  );
};
