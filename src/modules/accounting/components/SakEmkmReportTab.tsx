import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { accountingApi } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { CashFlowStatementTab } from './CashFlowStatementTab';
import { FinancialStatementsPrintModal } from './FinancialStatementsPrintModal';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';
import { BalanceSheetTables, EquityChangesTable, IncomeStatementTable } from './StatementParts';

interface SakEmkmReportTabProps {
  refreshKey?: number;
}

type ReportTab = 'income' | 'balance' | 'equity' | 'cashflow';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'income', label: '1. Laba Rugi' },
  { id: 'balance', label: '2. Posisi Keuangan' },
  { id: 'equity', label: '3. Perubahan Ekuitas' },
  { id: 'cashflow', label: '4. Arus Kas' },
];

const Kpi: React.FC<{ label: string; value: string; note: string; tone?: 'neutral' | 'good' | 'bad' }> = ({ label, value, note, tone = 'neutral' }) => (
  <div className={`rounded-xl p-3.5 border ${
    tone === 'good' ? 'bg-emerald-50 border-emerald-200' : tone === 'bad' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
  }`}>
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
    <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">{value}</span>
    <span className="text-[10px] text-slate-500 mt-0.5 block">{note}</span>
  </div>
);

export const SakEmkmReportTab: React.FC<SakEmkmReportTabProps> = ({ refreshKey = 0 }) => {
  const [tab, setTab] = useState<ReportTab>('income');
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const range = resolvePeriod(period);
  const query = { start_date: range.start_date, end_date: range.end_date };

  const statements = useServerData(() => accountingApi.financialStatements(query), [query.start_date, query.end_date, refreshKey]);
  const cashFlow = useServerData(() => accountingApi.cashFlow(query), [query.start_date, query.end_date, refreshKey]);
  const fs = statements.data;
  const cf = cashFlow.data;
  const active = tab === 'cashflow' ? cashFlow : statements;
  const ctx = { periodLabel: range.label, startDate: range.start_date, endDate: range.end_date };
  const netRevenue = fs?.income_statement.net_revenue ?? 0;
  const margin = fs && netRevenue !== 0 ? (fs.income_statement.net_income / netRevenue) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      {fs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Pendapatan Bersih" value={formatRupiah(netRevenue)}
            note={`Pendapatan kotor ${formatRupiah(fs.income_statement.revenue.total)} sebelum potongan`} />
          <Kpi label="Laba (Rugi) Bersih" value={formatRupiah(fs.income_statement.net_income)}
            note={`Margin bersih ${margin.toFixed(1)}% dari pendapatan bersih`} tone={fs.income_statement.net_income >= 0 ? 'good' : 'bad'} />
          <Kpi label="Kas & Bank Akhir Periode" value={cf ? formatRupiah(cf.ending_cash) : '…'}
            note={cf ? `Laci ${formatRupiah(cf.ending_cash_drawer)} • Bank ${formatRupiah(cf.ending_bank)}` : 'Memuat arus kas'} />
          <Kpi label="Posisi Keuangan" value={fs.balance_sheet.is_balanced ? 'Seimbang' : 'Tidak seimbang'}
            note={fs.balance_sheet.is_balanced ? `Per ${fs.balance_sheet.as_of}` : `Selisih ${formatRupiah(fs.balance_sheet.difference)}`}
            tone={fs.balance_sheet.is_balanced ? 'good' : 'bad'} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div role="tablist" aria-label="Jenis laporan" className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto text-xs font-bold">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg cursor-pointer ${tab === t.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          {fs && tab === 'income' && <ExportMenu reportId="fin_income_statement" data={fs} ctx={ctx} />}
          {fs && tab === 'balance' && <ExportMenu reportId="fin_balance_sheet" data={fs} ctx={ctx} />}
          {fs && tab === 'equity' && <ExportMenu reportId="fin_equity_statement" data={fs} ctx={ctx} />}
          {cf && tab === 'cashflow' && <ExportMenu reportId="fin_cash_flow" data={cf} ctx={ctx} />}
          {fs && cf && <ExportMenu reportId="sak_emkm_package" data={{ financials: fs, cashFlow: cf }} ctx={ctx} />}
          {fs && (
            <button type="button" onClick={() => setIsPrintOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Standar SAK EMKM • {range.label}</p>
      <ServerStatus loading={active.loading && !active.data} error={active.error} onRetry={active.reload} />

      {fs && tab === 'income' && <IncomeStatementTable statement={fs.income_statement} />}
      {fs && tab === 'balance' && <BalanceSheetTables sheet={fs.balance_sheet} />}
      {fs && tab === 'equity' && <EquityChangesTable changes={fs.equity_changes} />}
      {cf && tab === 'cashflow' && <CashFlowStatementTab cashFlow={cf} periodLabel={range.label} />}

      {fs && (
        <FinancialStatementsPrintModal isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)}
          statements={fs} cashFlow={cf} periodLabel={range.label} />
      )}
    </div>
  );
};
