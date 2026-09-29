import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { CashFlowReport, FinancialStatements } from '../../../shared/types';
import { CashFlowStatementTab } from './CashFlowStatementTab';
import { BalanceSheetTables, EquityChangesTable, IncomeStatementTable } from './StatementParts';

interface FinancialStatementsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  statements: FinancialStatements;
  cashFlow: CashFlowReport | null;
  periodLabel: string;
}

export const FinancialStatementsPrintModal: React.FC<FinancialStatementsPrintModalProps> = ({
  isOpen,
  onClose,
  statements,
  cashFlow,
  periodLabel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <span className="text-sm font-bold">Pratinjau Cetak Laporan Keuangan</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button type="button" aria-label="Tutup pratinjau" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div id="a4-invoice-printable" className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900">
          <header className="text-center border-b-2 border-slate-900 pb-3">
            <h1 className="text-lg font-black uppercase tracking-wide">Omah Ban Cabang 3 — Magelang</h1>
            <p className="text-xs">Laporan Keuangan berdasarkan SAK EMKM • {periodLabel}</p>
          </header>
          <section className="space-y-2">
            <h2 className="text-sm font-black">1. Laporan Laba Rugi</h2>
            <IncomeStatementTable statement={statements.income_statement} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-black">2. Laporan Posisi Keuangan</h2>
            <BalanceSheetTables sheet={statements.balance_sheet} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-black">3. Laporan Perubahan Ekuitas</h2>
            <EquityChangesTable changes={statements.equity_changes} />
          </section>
          {cashFlow && (
            <section className="space-y-2">
              <h2 className="text-sm font-black">4. Laporan Arus Kas</h2>
              <CashFlowStatementTab cashFlow={cashFlow} periodLabel={periodLabel} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
