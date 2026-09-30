import { apiClient } from './apiClient';
import { ServiceMasterItem } from '../../shared/types';
import { ApiJournal, ApiReceivable, ApiSale, CheckoutPayload } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const posApi = {
  checkout: async (payload: CheckoutPayload) =>
    (await apiClient.post<Envelope<ApiSale>>('/pos/checkout', payload)).data,

  listTransactions: async (params?: { search?: string; date?: string; limit?: number }) =>
    (await apiClient.get<Envelope<ApiSale[]>>('/pos/transactions', params)).data,

  voidTransaction: async (id: string | number, reason: string) =>
    (await apiClient.post<Envelope<ApiSale>>(`/pos/transactions/${id}/void`, { reason })).data,

  listReceivables: async (status: 'open' | 'all' = 'all') =>
    (await apiClient.get<Envelope<ApiReceivable[]>>('/receivables', { status })).data,

  payReceivable: async (
    saleId: string | number,
    payload: { amount: number; account_code: '1-1000' | '1-1001'; payment_date?: string; notes?: string }
  ) =>
    (
      await apiClient.post<Envelope<{ receivable: ApiReceivable; journal: ApiJournal | null }>>(
        `/receivables/${saleId}/payments`,
        payload
      )
    ).data,

  listServices: async (): Promise<ServiceMasterItem[]> => {
    const res = await apiClient.get<Envelope<any[]>>('/services');
    return res.data.map((s) => ({
      id: String(s.id),
      service_code: s.service_code,
      service_name: s.service_name,
      category: s.category,
      standard_price: Number(s.standard_price) || 0,
      cost_price: Number(s.cost_price) || 0,
      description: s.description ?? undefined,
      is_active: !!s.is_active,
    }));
  },
};
