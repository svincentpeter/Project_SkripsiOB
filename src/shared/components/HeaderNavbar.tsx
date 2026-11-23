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
  Settings as SettingsIcon,
  CalendarDays,
  LogOut,
  Menu,
  X,
  Keyboard
} from 'lucide-react';
import { ActiveScreen, RolePermissionsConfig, UserSession } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../data/mockData';
import { formatRupiah } from '../utils/formatters';
import { NotificationBellDropdown } from './NotificationBellDropdown';
import { isScreenPermittedForRole } from '../../services/authNavigationService';

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
      keyNumber: '1',
      icon: LayoutGrid,
    },
    { 
      id: 'inventory' as ActiveScreen, 
      label: 'Produk & Ban', 
      keyNumber: '2',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : undefined,
    },
    { 
      id: 'expenses' as ActiveScreen, 
      label: 'Beban Toko', 
      keyNumber: '3',
      icon: Wallet,
    },
    { 
      id: 'ledger' as ActiveScreen, 
      label: 'Buku Besar', 
      keyNumber: '4',
      icon: BookOpen,
    },
    { 
      id: 'financials' as ActiveScreen, 
      label: 'Laporan SAK', 
      keyNumber: '5',
      icon: FileText,
    },
    {
      id: 'daily_reports' as ActiveScreen,
      label: 'Kas Harian',
      keyNumber: '6',
      icon: CalendarDays,
    },
    { 
      id: 'receipt' as ActiveScreen, 
      label: 'Riwayat Struk', 
      keyNumber: '7',
      icon: Receipt,
    },
    { 
      id: 'settings' as ActiveScreen, 
      label: 'Pengaturan', 
      keyNumber: '8',
      icon: SettingsIcon,
    },
  ];

  const isScreenAllowed = (screen: ActiveScreen): boolean => {
    return isScreenPermittedForRole(screen, currentUser.role, rolePermissions);
  };

  const visibleNavTabs = navTabs.filter((t) => isScreenAllowed(t.id));

  // Global hotkeys for rapid module jumping (when not typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      );
      if (isInput) return;

      if (e.key === 'F1' && isScreenAllowed('pos')) {
        e.preventDefault();
        setActiveScreen('pos');
        return;
      }

      const matchedTab = visibleNavTabs.find((t) => t.keyNumber === e.key);
      if (matchedTab && isScreenAllowed(matchedTab.id)) {
        setActiveScreen(matchedTab.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleNavTabs, isScreenAllowed, setActiveScreen]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <>
      {/* UNIFIED 50px TECHNICAL COMMAND DECK (Non-Sidebar Workstation Header) */}
      <header className="h-[52px] bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none flex items-center justify-between px-3 sm:px-5">
        {/* Left: Brand Identity & Branch Code */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="xl:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            title="Menu Navigasi"
            aria-label="Menu Navigasi"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div 
            className="flex items-center gap-2 cursor-pointer focus-ring rounded-md"
            onClick={() => {
              if (isScreenAllowed('dashboard')) setActiveScreen('dashboard');
              else if (visibleNavTabs.length > 0) setActiveScreen(visibleNavTabs[0].id);
            }}
          >
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center tracking-tighter">
              OB3
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs tracking-tight text-white uppercase">Omah Ban</span>
                <span className="text-[10px] font-mono font-bold text-slate-400 border border-slate-700 bg-slate-800/80 px-1 py-0.2 rounded">
                  CABANG 3
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: High-Density Segmented Module Switcher (Desktop) */}
        <nav className="hidden xl:flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800/80">
          {visibleNavTabs.map((tab) => {
            const isActive = activeScreen === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveScreen(tab.id)}
                className={`h-7.5 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer focus-ring ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={`Shortcut: Tekan tombol [${tab.keyNumber}]`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] font-mono px-1 py-0.2 rounded ml-0.5 ${
                  isActive ? 'bg-blue-700/80 text-blue-100' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.keyNumber}
                </span>
                {tab.badge && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500 text-slate-950 font-mono">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Operational Telemetry & User Controls */}
        <div className="flex items-center gap-2 text-xs shrink-0">
          {/* Kas Laci Live Metric (Account 1-1000) */}
          {cashInDrawer !== null && (
            <div 
              className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-slate-200"
              title={`Saldo Kas Laci (Akun 1-1000 SAK EMKM): ${formatRupiah(cashInDrawer)}`}
            >
              <span className="text-[10px] uppercase font-bold text-slate-400">Kas Laci:</span>
              <span className="font-mono font-bold text-emerald-400 tabular-nums">
                {formatRupiah(cashInDrawer)}
              </span>
            </div>
          )}

          {/* Quick POS Jump Button */}
          {isScreenAllowed('pos') && (
            <button
              type="button"
              onClick={() => setActiveScreen('pos')}
              className={`h-8 px-3 rounded-md font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer focus-ring ${
                activeScreen === 'pos'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
              title="Shortcut: Tekan F1 untuk Kasir POS"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Kasir POS</span>
              <span className="text-[10px] font-mono px-1 py-0.2 bg-black/25 rounded">F1</span>
              {cartCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-white text-blue-700 font-bold">
                  {cartCount}
                </span>
              )}
            </button>
          )}

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Notifications */}
          <NotificationBellDropdown
            notifications={notifications}
            onMarkAsRead={(id) => onMarkNotificationRead?.(id)}
            onClearAll={() => onClearNotifications?.()}
            onNavigateTo={(screen) => setActiveScreen(screen as ActiveScreen)}
          />

          {/* User Menu Dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 h-8 px-2 rounded-md hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer focus-ring"
            >
              <div className="w-6 h-6 rounded bg-slate-700 text-white font-bold text-[11px] flex items-center justify-center">
                {getInitials(currentUser.name)}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-200 truncate max-w-[100px]">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-60 bg-slate-900 border border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-2 border-b border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Operator Aktif
                  </span>
                  <span className="font-bold text-white block text-xs mt-0.5">
                    {currentUser.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-blue-900/60 text-blue-300 rounded border border-blue-700/50">
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono truncate">
                      {currentUser.email}
                    </span>
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenWireframeModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>Panduan Pengguna Toko</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onResetData();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 font-medium transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                    <span>Bersihkan Data Lokal</span>
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout?.();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 font-semibold transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION DRAWER (Slide-over for small viewports) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col justify-between text-slate-100">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  OB3
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-white uppercase">Omah Ban</h3>
                  <span className="text-[10px] text-slate-400">Cabang 3 Magelang</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="p-2 space-y-1 overflow-y-auto flex-1">
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
                    className={`w-full flex items-center justify-between p-2 rounded-md text-xs font-semibold ${
                      isActive ? 'bg-blue-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] font-mono px-1 bg-black/20 rounded">
                      {tab.keyNumber}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>Database:</span>
                <span className="font-mono text-white">{databaseName}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
