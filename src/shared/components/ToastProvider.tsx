import React, { createContext, useContext, useState, useCallback } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  X, 
  XCircle,
  Sparkles
} from 'lucide-react';

export type NotificationType = 'success' | 'warning' | 'info' | 'error';

export interface ToastItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  notify: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (type: NotificationType, title: string, message?: string, duration = 3500) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [newToast, ...prev.slice(0, 3)]); // Maksimal 4 notifikasi bersamaan

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => notify('success', title, message), [notify]);
  const warning = useCallback((title: string, message?: string) => notify('warning', title, message), [notify]);
  const info = useCallback((title: string, message?: string) => notify('info', title, message), [notify]);
  const error = useCallback((title: string, message?: string) => notify('error', title, message), [notify]);

  return (
    <ToastContext.Provider value={{ notify, success, warning, info, error }}>
      {children}

      {/* Floating Minimalist Toast Notification Container */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-['Plus_Jakarta_Sans',sans-serif] select-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-top-4 fade-in duration-300 ${
              toast.type === 'success'
                ? 'bg-white/95 border-emerald-200/80 text-slate-800 shadow-emerald-500/10'
                : toast.type === 'warning'
                ? 'bg-white/95 border-amber-200/80 text-slate-800 shadow-amber-500/10'
                : toast.type === 'error'
                ? 'bg-white/95 border-rose-200/80 text-slate-800 shadow-rose-500/10'
                : 'bg-white/95 border-blue-200/80 text-slate-800 shadow-blue-500/10'
            }`}
          >
            <div className={`p-1.5 rounded-xl shrink-0 ${
              toast.type === 'success'
                ? 'bg-emerald-50 text-emerald-600'
                : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-600'
                : toast.type === 'error'
                ? 'bg-rose-50 text-rose-600'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
              {toast.type === 'error' && <XCircle className="w-4 h-4" />}
              {toast.type === 'info' && <Info className="w-4 h-4" />}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h4 className="text-xs font-bold text-slate-900 leading-snug">{toast.title}</h4>
              {toast.message && (
                <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{toast.message}</p>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
