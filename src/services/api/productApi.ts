import { apiClient } from './apiClient';
import { ProductItem } from '../../shared/types';

export const productApi = {
  list: async (params?: { brand?: string; ring?: string; search?: string }) => {
    const res = await apiClient.get<{ success: boolean; data: any[] }>('/products', params);
    // Normalize data fields from Laravel model to React ProductItem interface
    return res.data.map((p) => {
      const name = p.product_name || p.name || '';
      const stock = Number(p.product_quantity ?? p.stock ?? 0);
      const minStock = Number(p.product_stock_alert ?? p.min_stock ?? 5);
      const cost = Number(p.product_cost ?? p.cost_price ?? 0);
      const price = Number(p.product_price ?? p.price ?? 0);

      return {
        id: String(p.id),
        category: (p.category as any) || 'BAN_BARU',
        product_name: name,
        name: name,
        product_code: p.product_code,
        barcode: p.barcode,
        brand: p.brand,
        size_width: p.size_width ? Number(p.size_width) : undefined,
        size_ratio: p.size_ratio ? String(p.size_ratio) : undefined,
        ring: p.ring,
        product_size: p.product_size,
        motif: p.motif,
        condition_code: 'BARU',
        product_year: p.product_year || '2026',
        product_cost: cost,
        cost_price: cost,
        cost: cost,
        product_price: price,
        price: price,
        product_quantity: stock,
        stock: stock,
        product_stock_alert: minStock,
        min_stock: minStock,
        is_active: true,
        batches: (p.active_batches || []).map((b: any) => ({
          id: String(b.id),
          product_id: String(p.id),
          batch_code: b.batch_code,
          source_name: b.source_name,
          purchase_date: b.purchase_date,
          batch_cost: Number(b.batch_cost),
          initial_qty: Number(b.initial_qty),
          remaining_qty: Number(b.remaining_qty),
        })),
      } as ProductItem;
    });
  },

  create: async (payload: any) => {
    return apiClient.post<{ success: boolean; message: string; data: any }>('/products', payload);
  },

  update: async (id: string | number, payload: any) => {
    return apiClient.put<{ success: boolean; message: string; data: any }>(`/products/${id}`, payload);
  },

  delete: async (id: string | number) => {
    return apiClient.delete<{ success: boolean; message: string }>(`/products/${id}`);
  },
};
