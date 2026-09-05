import { apiClient } from './apiClient';

export const accountingApi = {
  journals: async (params?: { type?: string; status?: string; search?: string; start_date?: string; end_date?: string }) => {
    return apiClient.get<{ success: boolean; data: any }>('/accounting/journals', params);
  },

  createManualJournal: async (payload: {
    date: string;
    description: string;
    items: Array<{
      account_id: number | string;
      debit: number;
      credit: number;
      note?: string;
    }>;
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: any }>('/accounting/journals/manual', payload);
  },

  generalLedger: async (params: { account_code: string; start_date?: string; end_date?: string }) => {
    return apiClient.get<{ success: boolean; data: any }>('/accounting/general-ledger', params);
  },

  trialBalance: async () => {
    return apiClient.get<{
      success: boolean;
      data: {
        accounts: any[];
        total_debit: number;
        total_credit: number;
        difference: number;
        is_balanced: boolean;
      };
    }>('/accounting/trial-balance');
  },

  financialStatements: async () => {
    return apiClient.get<{
      success: boolean;
      data: {
        income_statement: any;
        balance_sheet: any;
        notes: any;
      };
    }>('/accounting/financial-statements');
  },

  accountsPayable: async () => {
    return apiClient.get<{
      success: boolean;
      data: {
        total_outstanding: number;
        suppliers: any[];
      };
    }>('/accounting/accounts-payable');
  },

  payDebt: async (payload: {
    supplier_id: number | string;
    amount: number;
    payment_method: string;
    payment_date?: string;
    notes?: string;
  }) => {
    return apiClient.post<{ success: boolean; message: string; data: any }>('/accounting/accounts-payable/pay', payload);
  },
};
