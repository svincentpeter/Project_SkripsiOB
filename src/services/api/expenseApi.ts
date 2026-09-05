import { apiClient } from './apiClient';

export const expenseApi = {
  list: async (params?: { search?: string; category_id?: number | string; status?: string; start_date?: string; end_date?: string }) => {
    return apiClient.get<{ success: boolean; data: any }>('/expenses', params);
  },

  categories: async () => {
    return apiClient.get<{ success: boolean; data: any[] }>('/expense-categories');
  },

  create: async (payload: {
    expense_date: string;
    category_id: number | string;
    amount: number;
    payment_method: string;
    bank_name?: string;
    recipient_name: string;
    description: string;
    attachment_path?: string;
    approved_by?: string;
  }) => {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: {
        id: number;
        reference: string;
        amount: number;
        status: string;
        journal_entry_number: string;
        expense: any;
      };
    }>('/expenses', payload);
  },

  void: async (id: number | string) => {
    return apiClient.post<{ success: boolean; message: string; data: any }>(`/expenses/${id}/void`);
  },
};
