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
  CalendarDays,
  ShieldCheck,
  Store,
  Boxes,
  LogOut,
  UserCheck,
  Menu,
  X
} from 'lucide-react';
import { ActiveScreen, PermissionKey, RolePermissionsConfig, UserSession } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../data/mockData';
import { formatRupiah } from '../utils/formatters';
import { NotificationBellDropdown } from './NotificationBellDropdown';
import { isScreenPermittedForRole } from '../../services/authNavigationService';
import logoOmahBan from '../../assets/brand/logo-omah-ban.png';

interface HeaderNavbarProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  /** Saldo buku kas laci (akun 1-1000); null = peran tanpa akses saldo kas, chip disembunyikan. */
  cashInDrawer: number | null;
  lowStockCount: number;
  cartCount: number;
  notifications?: any[];
  onMarkNotificationRead?: (id: string) => void;
  onClearNotifications?: () => void;
  onNavigateFromNotification?: (target: string) => void;
  onOpenWireframeModal: () => void;
  onResetData: () => void;
  currentTimeStr: string;
  backendStatus?: 'supabase' | 'connected' | 'offline' | 'checking';
  databaseName?: string;
  currentUser: UserSession;
  rolePermissions?: RolePermissionsConfig;
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
  onNavigateFromNotification,
  onOpenWireframeModal,
  onResetData,
  currentTimeStr,
  backendStatus = 'checking',
  databaseName = 'project-skripsi_ob',
  currentUser,
  rolePermissions = DEFAULT_ROLE_PERMISSIONS,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      label: 'Produk & Jasa', 
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
      breadcrumb: ['Produk & Jasa', 'Katalog Ban, Kategori, Servis & Rekanan'],
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
      breadcrumb: ['Akuntansi SAK EMKM', 'Buku Besar, Neraca Saldo & Hutang'],
    },
    { 
      id: 'financials' as ActiveScreen, 
      label: 'Laporan Keuangan', 
      icon: FileText,
      breadcrumb: ['Laporan Keuangan', 'Laba Rugi & Posisi Keuangan (Neraca)'],
    },
    {
      id: 'daily_reports' as ActiveScreen,
      label: 'Laporan Harian',
      icon: CalendarDays,
      breadcrumb: ['Laporan Harian', 'Kas Harian, Rekap Harian & Per Kasir'],
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
    return isScreenPermittedForRole(screen, currentUser.role, rolePermissions);
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
      {/* TIER 1: TOP BAR (Logo + User + Live Telemetry Actions) */}
      <div className="h-14 px-3 sm:px-4 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0"
            onClick={() => {
              if (isScreenAllowed('dashboard')) setActiveScreen('dashboard');
              else if (visibleNavTabs.length > 0) setActiveScreen(visibleNavTabs[0].id);
            }}
          >
            <img
              src={logoOmahBan}
              alt="Omah Ban"
              className="h-7 sm:h-8 w-auto object-contain shrink-0"
            />
            <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />
            <div className="leading-tight min-w-0 hidden sm:block">
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md inline-block">
                Cabang 3 Magelang
              </span>
              <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                POS &amp; SAK EMKM Terpadu
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 text-xs">
          {/* Notification Bell with Minimalist Dropdown */}
          <NotificationBellDropdown
            notifications={notifications}
            onMarkAsRead={(id) => onMarkNotificationRead?.(id)}
            onClearAll={() => onClearNotifications?.()}
            onNavigateTo={(target) => {
              if (onNavigateFromNotification) {
                onNavigateFromNotification(target);
              } else {
                setActiveScreen(target as ActiveScreen);
              }
            }}
          />

          {/* Saldo buku kas laci (akun 1-1000), hanya untuk peran yang boleh membaca saldo kas */}
          {cashInDrawer !== null && (
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono shadow-2xs shrink-0"
              title={`Kas Laci (buku 1-1000): ${formatRupiah(cashInDrawer)}`}
            >
              <span className="hidden xs:inline-block sm:inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <span className="hidden md:inline text-emerald-800 text-[11px] font-semibold">Kas Laci:</span>
              <span className="font-extrabold text-[11px] sm:text-xs text-emerald-950 whitespace-nowrap tabular-nums">{formatRupiah(cashInDrawer)}</span>
            </div>
          )}

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
          <div className="relative shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-white font-bold flex items-center justify-center text-[11px] sm:text-xs shadow-xs shrink-0 ${
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
              <div className="absolute right-0 mt-2 w-60 sm:w-64 max-w-[calc(100vw-24px)] bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
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
                    <span>Panduan Pengguna Toko</span>
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
                    <span>Bersihkan Data Lokal</span>
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
              type="button"
              onClick={onOpenWireframeModal}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Buku Panduan Pengguna Toko (User Guide)"
              aria-label="Buku Panduan Pengguna Toko"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onResetData}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Bersihkan data lokal browser (data server tidak berubah)"
              aria-label="Bersihkan data lokal browser"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TIER 2: HORIZONTAL NAVIGATION MENU BAR WITH CLEAR BUTTON BORDERS */}
      <div className="h-12 px-3 sm:px-4 lg:px-8 flex items-center justify-between bg-slate-50/70 relative">
        {/* Scrollable Tabs */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-1 touch-pan-x scroll-smooth">
          <nav className="flex items-center gap-1.5 w-max pr-6">
            {visibleNavTabs.map((tab) => {
              const isActive = activeScreen === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveScreen(tab.id)}
                  className={`h-9 flex items-center gap-1.5 sm:gap-2 px-3 text-xs font-bold rounded-xl border transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-extrabold border-blue-300 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200/90 hover:text-slate-950 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {tab.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white font-mono">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sticky Pinned POS Button on mobile & desktop */}
        {isScreenAllowed('pos') && (
          <div className="shrink-0 pl-2 bg-gradient-to-l from-slate-50 via-slate-50 to-transparent sticky right-0 z-10 py-1">
            <button
              onClick={() => setActiveScreen('pos')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              title="Buka Terminal Mesin Kasir POS Fullscreen"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Mesin Kasir (POS)</span>
              <span className="inline sm:hidden">Kasir</span>
              {cartCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-800 text-white font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
