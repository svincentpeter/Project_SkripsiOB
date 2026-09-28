import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ServerStatusProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Status muat laporan server: pesan galat dengan tombol ulang, atau indikator memuat. */
export const ServerStatus: React.FC<ServerStatusProps> = ({ loading, error, onRetry }) => {
  if (error) {
    return (
      <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>Gagal memuat data server.</strong> {error}</span>
        </span>
        <button type="button" onClick={onRetry} className="px-3 py-1.5 font-bold bg-white border border-rose-300 rounded-lg hover:bg-rose-100 cursor-pointer">
          Coba lagi
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Memuat data dari server…</span>
      </div>
    );
  }
  return null;
};
