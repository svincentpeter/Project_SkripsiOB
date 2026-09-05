import React, { useState } from 'react';
import { 
  Wallet, 
  ShieldCheck, 
  Building2, 
  ReceiptText,
  BadgePercent
} from 'lucide-react';
import { ExpenseRecord } from '../../shared/types';
import { 
  ExpenseForm, 
  ExpenseTable, 
  ExpenseAnalyticsCard, 
  ExpenseDetailModal, 
  ExpenseVoucherModal 
} from './components';

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
    // Update active record in modal to reflect void status
    setSelectedExpenseForDetail((prev) => 
      prev && prev.id === expense.id 
        ? { ...prev, status: 'VOID', void_reason: reason, voided_by: voidedBy, voided_at: new Date().toISOString() } 
        : prev
    );
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Sistem Informasi Akuntansi • SAK EMKM Standar</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-600" />
            <span>Pengelolaan Biaya Operasional Toko (Expenses)</span>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              Cabang 3
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pengeluaran kas kecil laci kasir dan transfer bank dengan penomoran BKK baku, kompresi nota fisik, dan jurnal akuntansi otomatis.
          </p>
        </div>
      </div>

      {/* Analytics Summary Card */}
      <ExpenseAnalyticsCard expenses={expenses} />

      {/* Grid: Form Input (Left: 5 Cols) and History Table (Right: 7 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Form: Col-span-5 */}
        <div className="xl:col-span-5 space-y-4">
          <ExpenseForm
            onAddExpense={onAddExpense}
            cashInDrawer={cashInDrawer}
            bankBalance={bankBalance}
            existingExpenses={expenses}
          />
        </div>

        {/* Right Table: Col-span-7 */}
        <div className="xl:col-span-7 space-y-4">
          <ExpenseTable
            expenses={expenses}
            onViewDetail={handleOpenDetail}
            onPrintVoucher={handleOpenPrint}
          />
        </div>
      </div>

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
