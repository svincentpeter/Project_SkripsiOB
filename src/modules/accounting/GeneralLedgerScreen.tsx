import React, { useState } from 'react';
import { 
  BookOpen, 
  BookMarked, 
  Scale, 
  CreditCard, 
  Users,
  FileText, 
  Plus, 
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { 
  AccountingPeriodInfo,
  DebtPaymentInput, 
  JournalEntry, 
  ManualJournalInput, 
  PayableInvoice, 
  ReceivableInvoice,
  ReceivablePaymentInput,
  TireProduct 
} from '../../shared/types';
import { 
  INITIAL_ACCOUNT_BALANCES, 
  INITIAL_PAYABLE_INVOICES,
  INITIAL_RECEIVABLES,
  INITIAL_PERIOD_INFO
} from '../../shared/data/mockData';
import { 
  JournalTab, 
  GeneralLedgerTab, 
  TrialBalanceTab, 
  AccountsPayableTab, 
  AccountsReceivableTab,
  PeriodClosingModal,
  SakEmkmReportTab, 
  ManualJournalModal 
} from './components';

export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'receivables' | 'reports';

interface GeneralLedgerScreenProps {
  journals: JournalEntry[];
  initialBalances?: Record<string, number>;
  payableInvoices?: PayableInvoice[];
  receivableInvoices?: ReceivableInvoice[];
  periodInfo?: AccountingPeriodInfo;
  products?: TireProduct[];
  cashInDrawer?: number;
  onAddManualJournal?: (input: ManualJournalInput) => void;
  onPayDebt?: (input: DebtPaymentInput) => void;
  onPayReceivable?: (input: ReceivablePaymentInput) => void;
  onClosePeriod?: (closedBy: string, notes: string) => void;
  onReverseJournal?: (journal: JournalEntry, reason: string, reversedBy: string) => void;
  initialTab?: AccountingTabKey;
  isEmptyState?: boolean;
}

export const GeneralLedgerScreen: React.FC<GeneralLedgerScreenProps> = ({
  journals,
  initialBalances = INITIAL_ACCOUNT_BALANCES,
  payableInvoices = INITIAL_PAYABLE_INVOICES,
  receivableInvoices = INITIAL_RECEIVABLES,
  periodInfo = INITIAL_PERIOD_INFO,
  products = [],
  cashInDrawer = 2450000,
  onAddManualJournal,
  onPayDebt,
  onPayReceivable,
  onClosePeriod,
  onReverseJournal,
  initialTab = 'journals',
  isEmptyState = false,
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTabKey>(initialTab);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  const unpaidDebtCount = payableInvoices.filter((i) => i.status !== 'LUNAS').length;
  const unpaidReceivableCount = receivableInvoices.filter((i) => i.status !== 'LUNAS').length;

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      {/* Top Header & Navigation Container ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Sistem Informasi Akuntansi (SIA) • SAK EMKM Standar</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Buku Besar & Siklus Akuntansi</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Cabang 3 BSD
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Siklus akuntansi lengkap: Jurnal Transaksi, Buku Besar, Neraca Saldo, Buku Pembantu AP/AR, Jurnal Penutup, dan Laporan Keuangan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Period Status Badge & Closing Action */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{periodInfo.period_name}:</span>
              </div>
              {periodInfo.status === 'OPEN' ? (
                <span className="font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  TERBUKA
                </span>
              ) : (
                <span className="font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-500" />
                  DITUTUP
                </span>
              )}

              {periodInfo.status === 'OPEN' && onClosePeriod && (
                <button
                  onClick={() => setIsClosingModalOpen(true)}
                  className="ml-1 px-2.5 py-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  title="Tutup buku periode dan buat jurnal penutup otomatis"
                >
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span>Tutup Buku</span>
                </button>
              )}
            </div>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Jurnal Penyesuaian</span>
            </button>
          </div>
        </div>

        {/* Integrated 6-Tab Navigation Bar */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            onClick={() => setActiveTab('journals')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'journals'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Jurnal Umum</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'journals' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              {journals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'ledger'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            <span>2. Buku Besar (GL)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              activeTab === 'ledger' ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-200 text-slate-600'
            }`}>
              21 Akun
            </span>
          </button>

          <button
            onClick={() => setActiveTab('trial-balance')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'trial-balance'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>3. Neraca Saldo</span>
          </button>

          <button
            onClick={() => setActiveTab('payables')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'payables'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>4. Pembantu Hutang (AP)</span>
            {unpaidDebtCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'payables' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {unpaidDebtCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('receivables')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'receivables'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>5. Pembantu Piutang (AR)</span>
            {unpaidReceivableCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'receivables' ? 'bg-blue-100 text-blue-900 border border-blue-300' : 'bg-slate-200 text-slate-600'
              }`}>
                {unpaidReceivableCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>6. Laporan SAK EMKM</span>
          </button>
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="pt-1">
        {activeTab === 'journals' && (
          <JournalTab
            journals={journals}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            onReverseJournal={onReverseJournal}
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

        {activeTab === 'receivables' && (
          <AccountsReceivableTab
            invoices={receivableInvoices}
            onPayReceivable={(paymentInput) => {
              if (onPayReceivable) onPayReceivable(paymentInput);
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

      {/* Period Closing Modal */}
      <PeriodClosingModal
        isOpen={isClosingModalOpen}
        onClose={() => setIsClosingModalOpen(false)}
        journals={journals}
        initialBalances={initialBalances}
        periodInfo={periodInfo}
        onConfirmClosePeriod={(closedBy, notes) => {
          if (onClosePeriod) onClosePeriod(closedBy, notes);
        }}
      />
    </div>
  );
};
