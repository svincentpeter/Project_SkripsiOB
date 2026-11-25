import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type { ApiAccount, ApiJournalPage, ApiLedger, ApiTrialBalance } from './accountingMappers';
import type {
  AccountingPeriodsInfo,
  CashFlowReport,
  FinancialStatements,
  ManualJournalPayload,
  OpeningBalanceInput,
  OpeningBalanceSummary,
  OpeningInventoryInput,
  OpeningPayableInput,
  OpeningReceivable,
  OpeningReceivableInput,
  OpeningReceivablePayment,
  OpeningReceivablePaymentInput,
  PeriodClosingRecord,
} from '../../shared/types';
import type { ApiPurchase, InventoryValuation } from './inventoryMappers';

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

export interface AccountPayload {
  account_code: string;
  account_name: string;
  account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  normal_balance: 'DEBIT' | 'CREDIT';
  is_active?: boolean;
}

export const accountingApi = {
  accounts: () => data(apiClient.get<Envelope<ApiAccount[]>>('/accounts')),
  createAccount: (payload: AccountPayload) => data(apiClient.post<Envelope<ApiAccount>>('/accounts', payload)),
  updateAccount: (id: number, payload: Partial<AccountPayload>) =>
    data(apiClient.put<Envelope<ApiAccount>>(`/accounts/${id}`, payload)),
  deleteAccount: (id: number) => data(apiClient.delete<Envelope<{ deleted: boolean }>>(`/accounts/${id}`)),
  journals: (query: JournalQuery) => data(apiClient.get<Envelope<ApiJournalPage>>('/accounting/journals', query)),
  createManualJournal: (payload: ManualJournalPayload) =>
    data(apiClient.post<Envelope<ApiJournal>>('/accounting/journals/manual', payload)),
  reverseJournal: (entryNumber: string, reason: string) =>
    data(apiClient.post<Envelope<ApiJournal>>(`/accounting/journals/${encodeURIComponent(entryNumber)}/reverse`, { reason })),
  generalLedger: (query: { account_code: string; start_date?: string; end_date?: string }) =>
    data(apiClient.get<Envelope<ApiLedger>>('/accounting/general-ledger', query)),
  trialBalance: (query: string | { start_date?: string; end_date?: string; as_of?: string }) => {
    const params = typeof query === 'string' ? { as_of: query } : query;
    return data(apiClient.get<Envelope<ApiTrialBalance>>('/accounting/trial-balance', params));
  },
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
  openingBalanceSummary: () => data(apiClient.get<Envelope<OpeningBalanceSummary>>('/accounting/opening-balance/summary')),
  postOpeningBalance: (input: OpeningBalanceInput) =>
    data(apiClient.post<Envelope<ApiJournal>>('/accounting/opening-balance', input)),
  postOpeningInventory: (input: OpeningInventoryInput) =>
    data(
      apiClient.post<
        Envelope<{
          reference: string;
          total_value: number;
          batches: { id: number; batch_code: string; product_id: number; product_name: string; quantity: number; unit_cost: number; total_value: number }[];
          journal: ApiJournal;
          valuation: InventoryValuation;
        }>
      >('/accounting/opening-balance/inventory', input)
    ),
  listOpeningReceivables: () => data(apiClient.get<Envelope<OpeningReceivable[]>>('/accounting/opening-balance/receivables')),
  createOpeningReceivable: (input: OpeningReceivableInput) =>
    data(apiClient.post<Envelope<{ receivable: OpeningReceivable; journal: ApiJournal }>>('/accounting/opening-balance/receivables', input)),
  payOpeningReceivable: (id: number, input: OpeningReceivablePaymentInput) =>
    data(
      apiClient.post<Envelope<{ receivable: OpeningReceivable; payment: OpeningReceivablePayment; journal: ApiJournal }>>(
        `/accounting/opening-balance/receivables/${id}/payments`,
        input
      )
    ),
  listOpeningPayables: () => data(apiClient.get<Envelope<ApiPurchase[]>>('/accounting/opening-balance/payables')),
  createOpeningPayable: (input: OpeningPayableInput) =>
    data(apiClient.post<Envelope<{ purchase: ApiPurchase; journal: ApiJournal }>>('/accounting/opening-balance/payables', input)),
};
