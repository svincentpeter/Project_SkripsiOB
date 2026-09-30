import React, { useState } from 'react';
import {
  BookMarked, BookOpen, CreditCard, ExternalLink, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users, Wallet,
} from 'lucide-react';
import {
  ChartOfAccount,
  DebtPaymentInput,
  JournalEntry,
  ManualJournalPayload,
  OpeningBalanceInput,
  PayableInvoice,
} from '../../shared/types';
import { accountingApi } from '../../services/api';
import type { ApiJournal } from '../../services/api';
import { previousMonth } from '../../services/accountingPeriod';
import { formatDateIndo } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';
import { useServerData } from './hooks/useServerData';
import {
  AccountsPayableTab,
  CashBankTab,
  GeneralLedgerTab,
  JournalTab,
  ManualJournalModal,
  OpeningBalanceModal,
  PeriodClosingModal,
  SakEmkmReportTab,
  TrialBalanceTab,
} from './components';

export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports' | 'cash';

interface GeneralLedgerScreenProps {
  ledgerVersion: number;
  accounts: ChartOfAccount[];
  payableInvoices: PayableInvoice[];
  cashInDrawer: number;
  canReopenPeriod: boolean;
  /** Akses `accounting_hub`. Tanpa itu (mis. hanya `accounts_payable`) hanya buku pembantu yang tampil. */
  canUseHub: boolean;
  onAddManualJournal: (payload: ManualJournalPayload) => Promise<boolean>;
  onReverseJournal: (journal: JournalEntry, reason: string) => Promise<boolean>;
  onClosePeriod: (period: string, notes: string) => Promise<boolean>;
  onReopenPeriod: (period: string, reason: string) => Promise<boolean>;
  onPostOpeningBalance: (input: OpeningBalanceInput) => Promise<boolean>;
  onPayDebt: (input: DebtPaymentInput) => void;
  onNavigateToFinancials?: () => void;
  initialTab?: AccountingTabKey;
  /** Izin `cash_session_approve`: menyetujui tutup shift kasir. */
  canApproveCash?: boolean;
  /** Izin `cash_movement`: setor bank, prive, setoran modal. */
  canMoveCash?: boolean;
  /** Dipanggil saat tab Kas & Bank membukukan jurnal. */
  onLedgerChanged?: (journals: ApiJournal[]) => void;
}

const TABS: { id: AccountingTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'journals', label: '1. Jurnal Umum', icon: BookOpen },
  { id: 'ledger', label: '2. Buku Besar', icon: BookMarked },
  { id: 'trial-balance', label: '3. Neraca Saldo', icon: Scale },
  { id: 'payables', label: '4. Pembantu Hutang', icon: CreditCard },
  { id: 'reports', label: '5. Laporan Keuangan', icon: FileText },
  { id: 'cash', label: '6. Kas & Bank', icon: Wallet },
];

/** Tab yang tidak memanggil endpoint khusus accounting_hub. */
const SUBLEDGER_TABS: AccountingTabKey[] = ['payables'];

export const GeneralLedgerScreen: React.FC<GeneralLedgerScreenProps> = ({
  ledgerVersion,
  accounts,
  payableInvoices,
  cashInDrawer,
  canReopenPeriod,
  canUseHub,
  onAddManualJournal,
  onReverseJournal,
  onClosePeriod,
  onReopenPeriod,
  onPostOpeningBalance,
  onPayDebt,
  onNavigateToFinancials,
  initialTab = 'journals',
  canApproveCash = false,
  canMoveCash = false,
  onLedgerChanged = () => {},
}) => {
  const canManageCash = canApproveCash || canMoveCash;
  const visibleTabs = TABS.filter((t) => (t.id === 'cash' ? canManageCash : canUseHub || SUBLEDGER_TABS.includes(t.id)));
  const [selectedTab, setSelectedTab] = useState<AccountingTabKey>(
    canUseHub || SUBLEDGER_TABS.includes(initialTab) ? initialTab : 'payables',
  );
  const activeTab = visibleTabs.some((t) => t.id === selectedTab) ? selectedTab : visibleTabs[0].id;
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isClosingOpen, setIsClosingOpen] = useState(false);
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);

  // Endpoint periode & saldo awal khusus accounting_hub: tanpa akses itu jangan kirim permintaan.
  const periods = useServerData(() => (canUseHub ? accountingApi.periods() : Promise.resolve(null)), [ledgerVersion, canUseHub]);
  const opening = useServerData(() => (canUseHub ? accountingApi.openingBalance() : Promise.resolve(null)), [ledgerVersion, canUseHub]);

  const lockDate = periods.data?.lock_date ?? null;
  const latestClosing = periods.data?.closings.find((c) => !c.reopened_at) ?? null;
  const badges: Partial<Record<AccountingTabKey, number>> = {
    payables: payableInvoices.filter((i) => i.status !== 'LUNAS').length,
  };

  const handleReopen = async () => {
    if (!latestClosing) return;
    const reason = window.prompt(`Alasan membuka kembali periode ${latestClosing.period}:`);
    if (!reason?.trim()) return;
    await onReopenPeriod(latestClosing.period, reason.trim());
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Buku Kerja Akuntansi • SAK EMKM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Buku Besar & Siklus Akuntansi</h1>
            <p className="text-xs text-slate-500 mt-0.5">Semua angka dihitung server dari jurnal yang sudah dibukukan.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canUseHub && (
              <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span className="text-slate-600 font-medium">
                  {lockDate ? `Terkunci s/d ${formatDateIndo(lockDate)}` : 'Belum ada periode ditutup'}
                </span>
                <button type="button" onClick={() => setIsClosingOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer">
                  Tutup Buku
                </button>
                {canReopenPeriod && latestClosing && (
                  <button type="button" onClick={handleReopen}
                    className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center gap-1 cursor-pointer">
                    <LockOpen className="w-3 h-3" />
                    <span>Buka {latestClosing.period}</span>
                  </button>
                )}
                {latestClosing && <ExportMenu reportId="period_closing" data={latestClosing} ctx={{ periodLabel: latestClosing.period }} />}
              </div>
            )}

            {canUseHub && opening.data === null && !opening.loading && !opening.error && (
              <button type="button" onClick={() => setIsOpeningOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <Landmark className="w-3.5 h-3.5" />
                <span>Saldo Awal</span>
              </button>
            )}
            {onNavigateToFinancials && (
              <button type="button" onClick={onNavigateToFinancials}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Laporan Keuangan</span>
              </button>
            )}
            {canUseHub && (
              <button type="button" onClick={() => setIsManualOpen(true)}
                className="px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Jurnal Penyesuaian</span>
              </button>
            )}
          </div>
        </div>

        <div role="tablist" aria-label="Menu akuntansi" className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto text-xs font-bold">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setSelectedTab(id)}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {(badges[id] ?? 0) > 0 && (
                <span className="px-1.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-900">{badges[id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-1">
        {activeTab === 'journals' && (
          <JournalTab refreshKey={ledgerVersion} onOpenManualModal={() => setIsManualOpen(true)} onReverseJournal={onReverseJournal} />
        )}
        {activeTab === 'ledger' && <GeneralLedgerTab accounts={accounts} refreshKey={ledgerVersion} />}
        {activeTab === 'trial-balance' && <TrialBalanceTab refreshKey={ledgerVersion} onNavigateToReports={() => setSelectedTab('reports')} />}
        {activeTab === 'payables' && <AccountsPayableTab invoices={payableInvoices} cashInDrawer={cashInDrawer} onPayDebt={onPayDebt} />}
        {activeTab === 'reports' && <SakEmkmReportTab refreshKey={ledgerVersion} />}
        {activeTab === 'cash' && (
          <CashBankTab refreshKey={ledgerVersion} canApprove={canApproveCash} canMove={canMoveCash} onLedgerChanged={onLedgerChanged} />
        )}
      </div>

      {canUseHub && (
        <>
          <ManualJournalModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} accounts={accounts} onSubmit={onAddManualJournal} />
          <PeriodClosingModal
            isOpen={isClosingOpen}
            onClose={() => setIsClosingOpen(false)}
            suggestedPeriod={periods.data?.suggested_period ?? previousMonth()}
            lockDate={lockDate}
            onConfirm={onClosePeriod}
          />
          <OpeningBalanceModal isOpen={isOpeningOpen} onClose={() => setIsOpeningOpen(false)} onSubmit={onPostOpeningBalance} />
        </>
      )}
    </div>
  );
};
