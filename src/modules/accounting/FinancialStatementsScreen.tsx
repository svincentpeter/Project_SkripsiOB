import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SakEmkmReportTab } from './components/SakEmkmReportTab';

interface FinancialStatementsScreenProps {
  refreshKey?: number;
}

export const FinancialStatementsScreen: React.FC<FinancialStatementsScreenProps> = ({ refreshKey = 0 }) => (
  <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
        <ShieldCheck className="w-4 h-4" />
        <span>Laporan Keuangan • SAK EMKM</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Laporan Keuangan Omah Ban Cabang 3</h1>
      <p className="text-xs text-slate-500 mt-0.5">
        Laba rugi, posisi keuangan, perubahan ekuitas, dan arus kas dihitung server dari jurnal yang sudah dibukukan.
      </p>
    </div>
    <SakEmkmReportTab refreshKey={refreshKey} />
  </div>
);
