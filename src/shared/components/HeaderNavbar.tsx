import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingCart, 
  Receipt, 
  LayoutGrid, 
  Package, 
  Wallet, 
  BookOpen, 
  FileText, 
  Search, 
  ChevronDown, 
  RotateCcw,
  HelpCircle,
  Home,
  ChevronRight,
  Settings as SettingsIcon,
  ShieldCheck,
  Store,
  Boxes,
  LogOut,
  UserCheck
} from 'lucide-react';
import { ActiveScreen, PermissionKey, RolePermissionsConfig, UserSession } from '../types';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_USERS } from '../data/mockData';
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
  backendStatus?: 'supabase' | 'connected' | 'offline' | 'checking';
  databaseName?: string;
  currentUser?: UserSession;
  rolePermissions?: RolePermissionsConfig;
  onSwitchUser?: (user: UserSession) => void;
  onLogout?: () => void;
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
  currentUser = DEFAULT_USERS[0],
  rolePermissions = DEFAULT_ROLE_PERMISSIONS,
  onSwitchUser,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      breadcrumb: ['Akuntansi SAK EMKM', 'Buku Besar, Neraca Saldo & BON'],
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
      breadcrumb: ['Pengaturan Sistem', 'Identitas Toko, Hak Akses & SAK EMKM'],
    },
  ];

  const isScreenAllowed = (screen: ActiveScreen): boolean => {
    if (currentUser.role === 'OWNER') return true;
    const roleConfig = rolePermissions[currentUser.role];
    if (!roleConfig) return true;

    switch (screen) {
      case 'dashboard':
        return !!roleConfig.dashboard;
      case 'pos':
        return !!roleConfig.pos;
      case 'receipt':
        return !!roleConfig.receipt;
      case 'inventory':
        return !!roleConfig.inventory_view;
      case 'expenses':
        return !!roleConfig.expenses;
      case 'ledger':
        return !!roleConfig.accounting_hub || !!roleConfig.bon_receivable || !!roleConfig.accounts_payable;
      case 'financials':
        return !!roleConfig.financial_reports;
      case 'settings':
        return !!roleConfig.role_settings;
      default:
        return true;
    }
  };

  const visibleNavTabs = navTabs.filter((t) => isScreenAllowed(t.id));
  const currentTabInfo = navTabs.find((t) => t.id === activeScreen) || navTabs[0];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="bg-white sticky top-0 z-40 select-none shadow-xs border-b border-slate-200 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* TIER 1: TOP BAR (Logo + Search Bar + User + Actions) */}
      <div className="h-16 px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div 
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer" 
            onClick={() => {
              if (isScreenAllowed('dashboard')) setActiveScreen('dashboard');
              else if (visibleNavTabs.length > 0) setActiveScreen(visibleNavTabs[0].id);
            }}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs tracking-tight transition-colors">
              OB
            </div>
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">Omah Ban</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                  Cabang 3 Magelang
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
              placeholder="Cari ban baru, velg, nomor plat mobil, akun..."
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

          {/* Database & Cloud Live Status Badge */}
          {backendStatus === 'supabase' ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-[11px] font-bold shadow-2xs" title={`Terhubung ke Supabase PostgreSQL Cloud (${databaseName})`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Supabase Cloud</span>
            </div>
          ) : backendStatus === 'connected' ? (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-[11px] font-bold shadow-2xs" title={`Terhubung ke MySQL (${databaseName}) via Laravel 12 REST API`}>
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              <span>MySQL Live</span>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[11px] font-medium" title="Mode Penyimpanan Lokal Browser (Offline/Fallback)">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Mode Lokal</span>
            </div>
          )}

          {/* User Profile & Role Switcher Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white font-bold flex items-center justify-center text-[11px] sm:text-xs shadow-xs ${
                currentUser.role === 'OWNER'
                  ? 'bg-blue-600'
                  : currentUser.role === 'KASIR'
                  ? 'bg-emerald-600'
                  : 'bg-amber-600'
              }`}>
                {getInitials(currentUser.name)}
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <span className="font-bold text-slate-900 block text-xs truncate max-w-[120px]">
                  {currentUser.name}
                </span>
                <span className={`text-[10px] font-extrabold uppercase px-1 rounded-sm inline-block ${
                  currentUser.role === 'OWNER'
                    ? 'text-blue-700 bg-blue-50'
                    : currentUser.role === 'KASIR'
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-amber-700 bg-amber-50'
                }`}>
                  {currentUser.role}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/70">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Pengguna Aktif
                  </span>
                  <span className="font-bold text-slate-900 block text-xs mt-0.5">
                    {currentUser.name}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono block">
                    {currentUser.email}
                  </span>
                </div>

                {/* Quick Role Switcher (Especially useful for Owner & Demo) */}
                <div className="p-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block tracking-wider">
                    Ganti Peran Pengguna (Demo):
                  </span>
                  <div className="space-y-1">
                    {DEFAULT_USERS.map((u) => {
                      const isSelected = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            onSwitchUser?.(u);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-blue-50 text-blue-700 font-bold'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                              u.role === 'OWNER' ? 'bg-blue-600' : u.role === 'KASIR' ? 'bg-emerald-600' : 'bg-amber-600'
                            }`} />
                            <span>{u.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">
                            {u.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-slate-100 p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenWireframeModal();
                    }}
                    className="w-full sm:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-500" />
                    <span>Panduan & Wireframe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onResetData();
                    }}
                    className="w-full sm:hidden flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Reset Data Toko</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1">
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
          {visibleNavTabs.map((tab) => {
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

        {isScreenAllowed('pos') && (
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
        )}
      </div>

      {/* TIER 3: BREADCRUMB STRIP (Hidden on mobile phones to save vertical space) */}
      <div className="hidden sm:flex h-8 px-3 sm:px-4 lg:px-8 bg-slate-50 border-t border-slate-200/80 items-center justify-between text-xs text-slate-600 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 overflow-hidden text-[10px] sm:text-xs">
          <Home 
            className="w-3.5 h-3.5 text-slate-500 shrink-0 cursor-pointer hover:text-blue-600" 
            onClick={() => {
              if (isScreenAllowed('dashboard')) setActiveScreen('dashboard');
              else if (visibleNavTabs.length > 0) setActiveScreen(visibleNavTabs[0].id);
            }} 
          />
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-medium text-slate-600 truncate">{currentTabInfo.breadcrumb[0]}</span>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-bold text-blue-700 truncate">{currentTabInfo.breadcrumb[1]}</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-600 font-semibold shrink-0 ml-2">
          <span className="w-2 h-2 rounded-full bg-emerald-600" />
          <span>Omah Ban Cabang 3 - Magelang</span>
          <span className="text-slate-300">•</span>
          <span>{currentTimeStr || '07 Sep 2026'}</span>
        </div>
      </div>
    </header>
  );
};
