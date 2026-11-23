import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SakEmkmReportTab } from './components/SakEmkmReportTab';

interface FinancialStatementsScreenProps {
  refreshKey?: number;
}

export const FinancialStatementsScreen: React.FC<FinancialStatementsScreenProps> = ({ refreshKey = 0 }) => (
  <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-4">
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
        <span>SAK EMKM IAI 2026</span>
      </div>
      <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
        Laporan Keuangan Omah Ban Cabang 3
      </h1>
      <p className="text-xs text-slate-500 mt-0.5">
        Laba rugi, posisi keuangan, perubahan ekuitas, arus kas, dan CALK dihitung server dari jurnal yang telah dibukukan.
      </p>
    </div>
    <SakEmkmReportTab refreshKey={refreshKey} />
  </div>
);
