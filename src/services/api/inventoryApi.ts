import { apiClient } from './apiClient';

export const inventoryApi = {
  restock: async (payload: {
    product_id: number | string;
    quantity: number;
    batch_cost: number;
    source_name: string;
    purchase_date?: string;
    payment_method: 'TUNAI' | 'TRANSFER_BCA' | 'TEMPO';
  }) => {
    return apiClient.post<{
      success: boolean;
      message: string;
      data: {
        batch: any;
        journal_entry_number: string;
      };
    }>('/inventory/restock', payload);
  },

  stockMovements: async (params?: { product_id?: number | string; type?: string; per_page?: number }) => {
    return apiClient.get<{ success: boolean; data: any }>('/inventory/stock-movements', params);
  },

  stockOpname: async (payload: { product_id: number | string; physical_qty: number; notes?: string }) => {
    return apiClient.post<{ success: boolean; message: string; data: any }>('/inventory/stock-opname', payload);
  },
};
