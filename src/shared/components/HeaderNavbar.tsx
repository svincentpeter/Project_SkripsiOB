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
  Clock,
  CircleDot
} from 'lucide-react';
import { ActiveScreen } from '../types';
import { formatRupiah } from '../utils/formatters';

interface HeaderNavbarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  cashInDrawer: number;
  lowStockCount: number;
  cartCount: number;
  onOpenWireframeModal: () => void;
  onResetData: () => void;
  currentTimeStr: string;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeScreen,
  setActiveScreen,
  cashInDrawer,
  lowStockCount,
  cartCount,
  onOpenWireframeModal,
  onResetData,
  currentTimeStr,
}) => {
  // Majestic Navigation Tabs
  const navTabs = [
    { 
      id: 'dashboard' as ActiveScreen, 
      label: 'Dashboard', 
      icon: LayoutGrid,
    },
    { 
      id: 'inventory' as ActiveScreen, 
      label: 'Stok Ban', 
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
    },
    { 
      id: 'expenses' as ActiveScreen, 
      label: 'Biaya Toko', 
      icon: Wallet,
    },
    { 
      id: 'ledger' as ActiveScreen, 
      label: 'Buku Besar', 
      icon: BookOpen,
    },
    { 
      id: 'financials' as ActiveScreen, 
      label: 'Laporan Keuangan', 
      icon: FileText,
    },
    { 
      id: 'receipt' as ActiveScreen, 
      label: 'Riwayat Struk', 
      icon: Receipt,
    },
  ];

  return (
    <header className="bg-white sticky top-0 z-40 select-none shadow-xs font-['Plus_Jakarta_Sans',sans-serif]">
      {/* =======================================================================
          TIER 1: TOP BAR MAJESTIC (Logo + Search Bar + Notifications + User)
          ======================================================================= */}
      <div className="h-16 px-4 lg:px-8 flex items-center justify-between gap-4 border-b border-slate-100">
        {/* Brand Logo Majestic Style */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveScreen('dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs tracking-tight">
              OB
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-800 tracking-tight">Omah Ban</span>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200/60 px-1.5 py-0.2 rounded">
                  Cabang 3
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block">POS & SAK EMKM</span>
            </div>
          </div>
        </div>

        {/* Center: Majestic Large Clean Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="w-full relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari ban, ukuran ('185/65 R15'), nota penjualan, akun..."
              className="w-full pl-10 pr-4 py-2 bg-[#F4F5F7] border border-transparent focus:border-blue-400 focus:bg-white text-slate-800 placeholder-slate-400 rounded-lg text-xs font-medium transition-all outline-none"
            />
          </div>
        </div>

        {/* Right Tools: Messages, Notifications, Cash Drawer, User Profile */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs">
          {/* Messages Icon with Red Dot */}
          <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Bell Notifications with Red Dot */}
          <button className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Saldo Kas Laci Kasir */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-800 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-700 text-[11px] font-medium">Kas Laci:</span>
            <span className="font-bold text-emerald-900">{formatRupiah(cashInDrawer)}</span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          {/* User Profile Dropdown Look */}
          <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border-2 border-white shadow-xs text-white font-bold flex items-center justify-center text-xs">
              FA
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <span className="font-bold text-slate-800 block text-xs">Fani Ardiansyah</span>
              <span className="text-[10px] text-slate-400 font-medium block">Kasir Pagi (OB3)</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </div>

          {/* Settings / Reset Dropdown */}
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenWireframeModal}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Spesifikasi & Panduan Desain"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onResetData}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Reset Data Toko"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* =======================================================================
          TIER 2: MAJESTIC HORIZONTAL NAVIGATION MENU BAR
          ======================================================================= */}
      <div className="h-12 px-4 lg:px-8 flex items-center justify-between overflow-x-auto custom-scrollbar border-b border-slate-200 bg-white">
        {/* Horizontal Navigation Items */}
        <nav className="flex items-center gap-2 sm:gap-4 min-w-max">
          {navTabs.map((tab) => {
            const isActive = activeScreen === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveScreen(tab.id)}
                className={`h-12 flex items-center gap-2 px-2 text-xs font-semibold border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Dedicated POS Button on the Right */}
        <div className="shrink-0 pl-4">
          <button
            onClick={() => setActiveScreen('pos')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
            title="Buka Terminal Mesin Kasir POS Fullscreen"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Mesin Kasir (POS)</span>
            {cartCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-800 text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
