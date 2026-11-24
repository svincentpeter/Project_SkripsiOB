import { apiClient } from './apiClient';
import { PriceAuditItem, PriceAuditSummary } from '../../shared/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface PriceAuditListResponse {
  items: PriceAuditItem[];
  summary: PriceAuditSummary;
}

export const priceAuditApi = {
  list: async (params?: {
    actor_role?: string;
    applies_to?: string;
    change_source?: string;
    unreviewed_only?: boolean;
    unread_only?: boolean;
    product_id?: number;
    search?: string;
    limit?: number;
  }): Promise<PriceAuditListResponse> => {
    const query: Record<string, any> = { ...params };
    if (params?.unreviewed_only !== undefined) query.unreviewed_only = params.unreviewed_only ? 1 : 0;
    if (params?.unread_only !== undefined) query.unread_only = params.unread_only ? 1 : 0;
    const res = await apiClient.get<Envelope<PriceAuditListResponse>>('/price-audits', query);
    return res.data;
  },

  review: async (
    id: number,
    payload: { review_notes?: string; new_catalog_price?: number }
  ): Promise<PriceAuditItem> => {
    const res = await apiClient.post<Envelope<PriceAuditItem>>(`/price-audits/${id}/review`, payload);
    return res.data;
  },

  markRead: async (id?: number): Promise<{ unread_owner_count: number }> => {
    const res = await apiClient.post<Envelope<{ unread_owner_count: number }>>(
      '/price-audits/mark-read',
      id ? { id } : {}
    );
    return res.data;
  },
};
