import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type { ApiAccount, ApiJournalPage, ApiLedger, ApiTrialBalance } from './accountingMappers';
import type {
  AccountingPeriodsInfo,
  CashFlowReport,
  FinancialStatements,
  ManualJournalPayload,
  OpeningBalanceInput,
  PeriodClosingRecord,
} from '../../shared/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ReportRange = { start_date?: string; end_date: string };
export type JournalQuery = {
  start_date?: string;
  end_date?: string;
  types?: string;
  search?: string;
  account_code?: string;
  page?: number;
  per_page?: number;
};
export type CashBalances = Record<'1-1000' | '1-1001', number>;

const data = <T>(request: Promise<Envelope<T>>): Promise<T> => request.then((r) => r.data);

export const accountingApi = {
  accounts: () => data(apiClient.get<Envelope<ApiAccount[]>>('/accounts')),
  journals: (query: JournalQuery) => data(apiClient.get<Envelope<ApiJournalPage>>('/accounting/journals', query)),
  createManualJournal: (payload: ManualJournalPayload) =>
    data(apiClient.post<Envelope<ApiJournal>>('/accounting/journals/manual', payload)),
  reverseJournal: (entryNumber: string, reason: string) =>
    data(apiClient.post<Envelope<ApiJournal>>(`/accounting/journals/${encodeURIComponent(entryNumber)}/reverse`, { reason })),
  generalLedger: (query: { account_code: string; start_date?: string; end_date?: string }) =>
    data(apiClient.get<Envelope<ApiLedger>>('/accounting/general-ledger', query)),
  trialBalance: (asOf: string) => data(apiClient.get<Envelope<ApiTrialBalance>>('/accounting/trial-balance', { as_of: asOf })),
  financialStatements: (range: ReportRange) =>
    data(apiClient.get<Envelope<FinancialStatements>>('/accounting/financial-statements', range)),
  cashFlow: (range: ReportRange) => data(apiClient.get<Envelope<CashFlowReport>>('/accounting/cash-flow', range)),
  cashBalances: () => data(apiClient.get<Envelope<CashBalances>>('/accounting/cash-balances')),
  periods: () => data(apiClient.get<Envelope<AccountingPeriodsInfo>>('/accounting/periods')),
  closePeriod: (period: string, notes: string) =>
    data(apiClient.post<Envelope<PeriodClosingRecord>>('/accounting/periods/close', { period, notes })),
  reopenPeriod: (period: string, reason: string) =>
    data(apiClient.post<Envelope<PeriodClosingRecord>>(`/accounting/periods/${period}/reopen`, { reason })),
  openingBalance: () => data(apiClient.get<Envelope<ApiJournal | null>>('/accounting/opening-balance')),
  postOpeningBalance: (input: OpeningBalanceInput) =>
    data(apiClient.post<Envelope<ApiJournal>>('/accounting/opening-balance', input)),
};
