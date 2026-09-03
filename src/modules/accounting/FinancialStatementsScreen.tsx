import React from 'react';
import { JournalEntry, PosTransaction, ExpenseRecord, TireProduct } from '../../shared/types';
import { INITIAL_ACCOUNT_BALANCES, INITIAL_JOURNALS } from '../../shared/data/mockData';
import { SakEmkmReportTab } from './components/SakEmkmReportTab';
import { ShieldCheck } from 'lucide-react';

interface FinancialStatementsScreenProps {
  transactions?: PosTransaction[];
  expenses?: ExpenseRecord[];
  products: TireProduct[];
  cashInDrawer: number;
  journals?: JournalEntry[];
  initialBalances?: Record<string, number>;
}

export const FinancialStatementsScreen: React.FC<FinancialStatementsScreenProps> = ({
  products,
  journals = INITIAL_JOURNALS,
  initialBalances = INITIAL_ACCOUNT_BALANCES,
}) => {
  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Laporan Keuangan Standar SAK EMKM Omah Ban
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Laporan Laba Rugi Dinamis, Laporan Posisi Keuangan (Neraca Seimbang), dan Catatan Atas Laporan Keuangan (CALK).
          </p>
        </div>
      </div>

      <SakEmkmReportTab
        journals={journals}
        initialBalances={initialBalances}
        products={products}
      />
    </div>
  );
};
