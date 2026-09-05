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
      {/* Screen Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <Receipt className="w-4 h-4 text-blue-700" />
            <span>Sistem Informasi Akuntansi Toko Ban • SAK EMKM Standar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Beban Operasional & Kas Keluar</span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              Cabang 3
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengelolaan bukti kas keluar (BKK), pembukuan beban operasional, dan integrasi buku besar double-entry.
          </p>
        </div>

        {/* Quick CTA to New Expense if on history or analytics tab */}
        {activeTab !== 'create' && (
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-98 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Catat Pengeluaran Baru</span>
          </button>
        )}
      </div>

      {/* Sub-Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 overflow-x-auto scrollbar-none text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Riwayat Pengeluaran (BKK)</span>
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
            activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'create'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Input Pengeluaran Baru (Form BKK)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 bg-white border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analisis & Anggaran Biaya</span>
        </button>
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
