import React, { useState } from 'react';
import { 
  BookOpen, 
  BookMarked, 
  Scale, 
  CreditCard, 
  FileText, 
  Plus, 
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { 
  DebtPaymentInput, 
  JournalEntry, 
  ManualJournalInput, 
  PayableInvoice, 
  TireProduct 
} from '../../shared/types';
import { INITIAL_ACCOUNT_BALANCES, INITIAL_PAYABLE_INVOICES } from '../../shared/data/mockData';
import { 
  JournalTab, 
  GeneralLedgerTab, 
  TrialBalanceTab, 
  AccountsPayableTab, 
  SakEmkmReportTab, 
  ManualJournalModal 
} from './components';

export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports';

interface GeneralLedgerScreenProps {
  journals: JournalEntry[];
  initialBalances?: Record<string, number>;
  payableInvoices?: PayableInvoice[];
  products?: TireProduct[];
  cashInDrawer?: number;
  onAddManualJournal?: (input: ManualJournalInput) => void;
  onPayDebt?: (input: DebtPaymentInput) => void;
  initialTab?: AccountingTabKey;
  isEmptyState?: boolean;
}

export const GeneralLedgerScreen: React.FC<GeneralLedgerScreenProps> = ({
  journals,
  initialBalances = INITIAL_ACCOUNT_BALANCES,
  payableInvoices = INITIAL_PAYABLE_INVOICES,
  products = [],
  cashInDrawer = 2450000,
  onAddManualJournal,
  onPayDebt,
  initialTab = 'journals',
  isEmptyState = false,
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTabKey>(initialTab);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  const unpaidDebtCount = payableInvoices.filter((i) => i.status !== 'LUNAS').length;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      {/* Top Header & Navigation Container ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>Sistem Informasi Akuntansi (SIA) • SAK EMKM Standar</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Buku Besar & Siklus Akuntansi</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Cabang 3
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Siklus akuntansi terintegrasi: Jurnal Transaksi, Buku Besar per Akun, Neraca Saldo, Buku Pembantu Hutang, dan Laporan Keuangan.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Jurnal Penyesuaian</span>
            </button>
          </div>
        </div>

        {/* Integrated 5-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab('journals')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'journals'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Jurnal Umum & Penyesuaian</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'journals' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              {journals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>2. Buku Besar (General Ledger)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'ledger' ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              21 Akun
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trial-balance')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'trial-balance'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>3. Neraca Saldo (Trial Balance)</span>
          </button>

          <button
            onClick={() => setActiveTab('payables')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'payables'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Buku Pembantu Hutang (AP)</span>
            {unpaidDebtCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'payables' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {unpaidDebtCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-white text-indigo-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>5. Laporan Keuangan SAK EMKM</span>
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="pt-1">
        {activeTab === 'journals' && (
          <JournalTab
            journals={journals}
            onOpenManualModal={() => setIsManualModalOpen(true)}
          />
        )}

        {activeTab === 'ledger' && (
          <GeneralLedgerTab
            journals={journals}
            initialBalances={initialBalances}
          />
        )}

        {activeTab === 'trial-balance' && (
          <TrialBalanceTab
            journals={journals}
            initialBalances={initialBalances}
            onNavigateToReports={() => setActiveTab('reports')}
          />
        )}

        {activeTab === 'payables' && (
          <AccountsPayableTab
            invoices={payableInvoices}
            cashInDrawer={cashInDrawer}
            onPayDebt={(paymentInput) => {
              if (onPayDebt) onPayDebt(paymentInput);
            }}
          />
        )}

        {activeTab === 'reports' && (
          <SakEmkmReportTab
            journals={journals}
            initialBalances={initialBalances}
            products={products}
          />
        )}
      </div>

      {/* Manual Adjusting Journal Modal */}
      <ManualJournalModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={(journalInput) => {
          if (onAddManualJournal) onAddManualJournal(journalInput);
          setIsManualModalOpen(false);
        }}
      />
    </div>
  );
};
