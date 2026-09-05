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
      {/* Top Header Container ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM)</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Laporan Keuangan Standar SAK EMKM</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Cabang 3
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Laporan Laba Rugi Dinamis, Laporan Posisi Keuangan (Neraca Seimbang), dan Catatan Atas Laporan Keuangan (CALK).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Standar IAI EMKM 2026</span>
            </span>
          </div>
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
