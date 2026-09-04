import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  CreditCard, 
  Clock, 
  X, 
  Trash2 
} from 'lucide-react';
import { formatDateIndo, formatRupiah } from '../utils/formatters';

export interface AppNotification {
  id: string;
  type: 'STOCK_LOW' | 'DEBT_DUE' | 'BOOKING_NEW' | 'TRANSACTION';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationBellDropdownProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onClearAll: () => void;
  onNavigateTo: (screen: string) => void;
}

export const NotificationBellDropdown: React.FC<NotificationBellDropdownProps> = ({
  notifications,
  onMarkAsRead,
  onClearAll,
  onNavigateTo,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors shadow-2xs"
        title="Pemberitahuan Sistem"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Notifikasi Sistem</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-rose-100 text-rose-700">
                  {unreadCount} Baru
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors"
              >
                Hapus Semua
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1">
                <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-600">Tidak Ada Notifikasi Baru</p>
                <p className="text-[11px] text-slate-400">Semua operasional toko dalam kondisi normal.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onMarkAsRead(n.id);
                    if (n.type === 'STOCK_LOW') onNavigateTo('inventory');
                    if (n.type === 'DEBT_DUE') onNavigateTo('ledger');
                    if (n.type === 'BOOKING_NEW') onNavigateTo('pos');
                    if (n.type === 'TRANSACTION') onNavigateTo('receipt');
                    setIsOpen(false);
                  }}
                  className={`p-3.5 hover:bg-slate-50 flex items-start gap-3 cursor-pointer transition-colors ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className={`p-2 rounded-xl shrink-0 ${
                    n.type === 'STOCK_LOW'
                      ? 'bg-amber-50 text-amber-600'
                      : n.type === 'DEBT_DUE'
                      ? 'bg-rose-50 text-rose-600'
                      : n.type === 'BOOKING_NEW'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {n.type === 'STOCK_LOW' && <Package className="w-4 h-4" />}
                    {n.type === 'DEBT_DUE' && <Clock className="w-4 h-4" />}
                    {n.type === 'BOOKING_NEW' && <CheckCircle2 className="w-4 h-4" />}
                    {n.type === 'TRANSACTION' && <DollarSign className="w-4 h-4" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400">{n.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
