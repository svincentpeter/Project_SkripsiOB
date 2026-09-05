import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  PlusCircle, 
  BarChart3, 
  Receipt,
  Wallet,
  Building2,
  Calendar
} from 'lucide-react';
import { ExpenseRecord } from '../../shared/types';
import { 
  ExpenseForm, 
  ExpenseTable, 
  ExpenseAnalyticsCard, 
  ExpenseDetailModal, 
  ExpenseVoucherModal 
} from './components';

export type ExpenseSubTabKey = 'history' | 'create' | 'analytics';

interface ExpensesScreenProps {
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  cashInDrawer: number;
  bankBalance?: number;
  onVoidExpense?: (expense: ExpenseRecord, reason: string, voidedBy: string) => void;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  expenses,
  onAddExpense,
  cashInDrawer,
  bankBalance = 35000000,
  onVoidExpense,
}) => {
  const [activeTab, setActiveTab] = useState<ExpenseSubTabKey>('history');

  // Modal states
  const [selectedExpenseForDetail, setSelectedExpenseForDetail] = useState<ExpenseRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  const [selectedExpenseForPrint, setSelectedExpenseForPrint] = useState<ExpenseRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  const handleOpenDetail = (expense: ExpenseRecord) => {
    setSelectedExpenseForDetail(expense);
    setIsDetailModalOpen(true);
  };

  const handleOpenPrint = (expense: ExpenseRecord) => {
    setSelectedExpenseForPrint(expense);
    setIsPrintModalOpen(true);
  };

  const handleVoidFromModal = (expense: ExpenseRecord, reason: string, voidedBy: string) => {
    if (onVoidExpense) {
      onVoidExpense(expense, reason, voidedBy);
    }
    setSelectedExpenseForDetail((prev) => 
      prev && prev.id === expense.id 
        ? { ...prev, status: 'VOID', void_reason: reason, voided_by: voidedBy, voided_at: new Date().toISOString() } 
        : prev
    );
  };

  const activeCount = expenses.filter((e) => e.status !== 'VOID').length;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      {/* Top Header & Navigation Container ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <Receipt className="w-4 h-4 text-blue-700" />
              <span>Sistem Informasi Akuntansi Toko Ban • SAK EMKM Standar</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Beban Operasional & Kas Keluar</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Cabang 3
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Pengelolaan bukti kas keluar (BKK), pembukuan beban operasional, dan integrasi buku besar double-entry.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Metode Pembukuan</span>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1 mt-0.5">
                Akrual SAK EMKM
              </span>
            </div>
          </div>
        </div>

        {/* Integrated Sub-Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Riwayat Pengeluaran (BKK)</span>
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
              activeTab === 'history' ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'create'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Pengeluaran Baru (Form BKK)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analisis & Anggaran Biaya</span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT SECTIONS */}
      {activeTab === 'history' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <ExpenseTable
            expenses={expenses}
            onViewDetail={handleOpenDetail}
            onPrintVoucher={handleOpenPrint}
            onAddNew={() => setActiveTab('create')}
          />
        </div>
      )}

      {activeTab === 'create' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <ExpenseForm
            onAddExpense={onAddExpense}
            cashInDrawer={cashInDrawer}
            bankBalance={bankBalance}
            existingExpenses={expenses}
            onSuccessNavigate={() => setActiveTab('history')}
          />
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <ExpenseAnalyticsCard expenses={expenses} />
        </div>
      )}

      {/* Detail & Zoom Modal */}
      <ExpenseDetailModal
        expense={selectedExpenseForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedExpenseForDetail(null);
        }}
        onOpenPrintVoucher={(exp) => {
          setSelectedExpenseForPrint(exp);
          setIsPrintModalOpen(true);
        }}
        onVoidExpense={handleVoidFromModal}
      />

      {/* Print Voucher Modal */}
      <ExpenseVoucherModal
        expense={selectedExpenseForPrint}
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedExpenseForPrint(null);
        }}
        storeName="OMAH BAN BSD"
        branchName="CABANG 3 - BSD SERPONG"
      />
    </div>
  );
};
