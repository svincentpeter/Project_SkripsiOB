import { apiClient } from './apiClient';

export const posApi = {
  checkout: async (payload: {
    customer_name?: string;
    customer_phone?: string;
    vehicle_plate?: string;
    vehicle_model?: string;
    cashier_name?: string;
    payment_method: string;
    paid_amount: number;
    discount_amount?: number;
    tax_amount?: number;
    notes?: string;
    items: Array<{
      product_id?: number | string | null;
      type?: string;
      name: string;
      quantity: number;
      unit_price: number;
      sub_total: number;
      discount_amount?: number;
    }>;
  }) => {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: {
        id: number;
        reference: string;
        grand_total: number;
        total_hpp: number;
        total_profit: number;
        journal_entry_number: string;
        sale: any;
      };
    }>('/pos/checkout', payload);
  },

  listTransactions: async (params?: { search?: string; date?: string; per_page?: number }) => {
    return apiClient.get<{ success: boolean; data: any }>('/pos/transactions', params);
  },

  getTransaction: async (id: string | number) => {
    return apiClient.get<{ success: boolean; data: any }>(`/pos/transactions/${id}`);
  },
};
