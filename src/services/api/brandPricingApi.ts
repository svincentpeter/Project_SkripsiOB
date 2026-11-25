import { apiClient } from './apiClient';
import { BrandPricingItem } from '../../shared/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface UpdateBrandPricingPayload {
  min_markup_percent: number;
  default_markup_percent: number;
  apply_to_products?: boolean;
}

export interface UpdateBrandPricingResult {
  id: number;
  name: string;
  min_markup_percent: number;
  default_markup_percent: number;
  updated_products_count: number;
}

export const brandPricingApi = {
  list: async (): Promise<BrandPricingItem[]> => {
    const res = await apiClient.get<Envelope<BrandPricingItem[]>>('/brands/pricing');
    return res.data;
  },

  create: async (payload: {
    name: string;
    is_partner?: boolean;
    min_markup_percent?: number;
    default_markup_percent?: number;
  }): Promise<BrandPricingItem> => {
    const res = await apiClient.post<Envelope<BrandPricingItem>>('/brands', payload);
    return res.data;
  },

  updatePricing: async (
    id: number,
    payload: UpdateBrandPricingPayload
  ): Promise<{ message?: string; data: UpdateBrandPricingResult }> => {
    const res = await apiClient.put<Envelope<UpdateBrandPricingResult>>(`/brands/${id}/pricing`, payload);
    return { message: res.message, data: res.data };
  },
};
