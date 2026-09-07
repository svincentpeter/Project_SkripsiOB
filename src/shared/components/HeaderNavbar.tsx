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
  UserCheck,
  Menu,
  X
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
      <div className="h-16 px-2.5 sm:px-4 lg:px-8 flex items-center justify-between gap-1.5 sm:gap-4 border-b border-slate-100 bg-white">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Buka Menu Navigasi"
            aria-label="Buka Menu Navigasi"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div 
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer min-w-0" 
            onClick={() => {
              if (isScreenAllowed('dashboard')) setActiveScreen('dashboard');
              else if (visibleNavTabs.length > 0) setActiveScreen(visibleNavTabs[0].id);
            }}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-black text-xs sm:text-sm shadow-xs tracking-tight transition-colors shrink-0">
              OB
            </div>
            <div className="leading-tight min-w-0">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="font-extrabold text-xs sm:text-base text-slate-900 tracking-tight shrink-0">Omah Ban</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md shrink-0">
                  <span className="hidden sm:inline">Cabang 3 Magelang</span>
                  <span className="sm:hidden">Cabang 3</span>
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

        <div className="flex items-center gap-1 sm:gap-2.5 shrink-0 text-xs">
          {/* Notification Bell with Minimalist Dropdown */}
          <NotificationBellDropdown
            notifications={notifications}
            onMarkAsRead={(id) => onMarkNotificationRead?.(id)}
            onClearAll={() => onClearNotifications?.()}
            onNavigateTo={(screen) => setActiveScreen(screen as ActiveScreen)}
          />

          {/* Saldo Kas Laci Kasir (Visible on mobile & desktop) */}
          <div 
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono shadow-2xs"
            title={`Kas Laci: ${formatRupiah(cashInDrawer)}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="hidden md:inline text-emerald-800 text-[11px] font-semibold">Kas Laci:</span>
            <span className="font-extrabold text-[10px] sm:text-xs text-emerald-950 truncate max-w-[80px] sm:max-w-none">{formatRupiah(cashInDrawer)}</span>
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
              title="Buku Panduan Pengguna Toko (User Guide)"
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
      <div className="h-12 px-2.5 sm:px-4 lg:px-8 flex items-center justify-between bg-white border-b border-slate-100 relative">
        {/* Scrollable Tabs */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none py-1">
          <nav className="flex items-center gap-1 sm:gap-1.5 w-max pr-3">
            {visibleNavTabs.map((tab) => {
              const isActive = activeScreen === tab.id;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveScreen(tab.id)}
                  className={`h-9 sm:h-10 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-extrabold border border-blue-200/80 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
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
          <div className="shrink-0 pl-2 bg-gradient-to-l from-white via-white to-transparent sticky right-0 z-10 py-1">
            <button
              onClick={() => setActiveScreen('pos')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer whitespace-nowrap"
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

      {/* MOBILE NAVIGATION DRAWER (Sheet for quick 1-tap screen jump) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif] animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                  OB
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Omah Ban</h3>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md inline-block">
                    Cabang 3 Magelang
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <div className="p-3 space-y-1 overflow-y-auto flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1 block">
                Menu Utama
              </span>
              {visibleNavTabs.map((tab) => {
                const isActive = activeScreen === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveScreen(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        isActive ? 'bg-white text-blue-700' : 'bg-rose-600 text-white'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {isScreenAllowed('pos') && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveScreen('pos');
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                      <span>Terminal Mesin Kasir (POS)</span>
                    </div>
                    {cartCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-blue-600 text-white font-bold">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                  {getInitials(currentUser.name)}
                </div>
                <div className="leading-tight">
                  <span className="font-bold text-slate-900 block text-xs">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{currentUser.role}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenWireframeModal();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-semibold cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-slate-500" />
                <span>Panduan Pengguna Toko</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onResetData();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-bold cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <span>Reset Data Toko</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
