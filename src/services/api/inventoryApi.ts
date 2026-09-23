import { apiClient } from './apiClient';
import { ServiceMasterItem, SupplierItem } from '../../shared/types';
import { ApiJournal } from './posMappers';
import {
  ApiMovement,
  ApiProductCategory,
  ApiPurchase,
  ApiServiceCategory,
  ApiSupplier,
  InventoryValuation,
  ProductPayload,
  RestockPayload,
} from './inventoryMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface DeleteResult {
  deleted: boolean;
  deactivated: boolean;
}

const supplierBody = (s: Omit<SupplierItem, 'id'>) => ({
  supplier_code: s.supplier_code,
  supplier_name: s.supplier_name,
  phone: s.phone,
  email: s.email || null,
  address: s.address || null,
  contact_person: s.contact_person || null,
  payment_terms_days: s.payment_terms_days ?? 0,
  is_active: s.is_active,
});

const serviceBody = (s: Omit<ServiceMasterItem, 'id'>) => ({
  service_code: s.service_code,
  service_name: s.service_name,
  category: s.category,
  standard_price: s.standard_price,
  cost_price: s.cost_price ?? 0,
  description: s.description || null,
  is_active: s.is_active,
});

export const inventoryApi = {
  // Produk
  createProduct: async (payload: ProductPayload) =>
    apiClient.post<{ success: boolean; message: string; data: any; journal: ApiJournal | null }>('/products', payload),
  updateProduct: async (id: string | number, payload: ProductPayload) =>
    (await apiClient.put<Envelope<any>>(`/products/${id}`, payload)).data,
  deleteProduct: async (id: string | number) => apiClient.delete<Envelope<DeleteResult>>(`/products/${id}`),

  // Kategori
  listProductCategories: async () => (await apiClient.get<Envelope<ApiProductCategory[]>>('/product-categories')).data,
  saveProductCategory: async (
    body: { category_code: string; category_name: string; description?: string; is_active?: boolean },
    id?: string
  ) =>
    id
      ? apiClient.put<Envelope<ApiProductCategory>>(`/product-categories/${id}`, body)
      : apiClient.post<Envelope<ApiProductCategory>>('/product-categories', body),
  deleteProductCategory: async (id: string) => apiClient.delete<Envelope<unknown>>(`/product-categories/${id}`),

  listServiceCategories: async () => (await apiClient.get<Envelope<ApiServiceCategory[]>>('/service-categories')).data,
  saveServiceCategory: async (body: { code: string; name: string; description?: string; is_active?: boolean }, id?: string) =>
    id
      ? apiClient.put<Envelope<ApiServiceCategory>>(`/service-categories/${id}`, body)
      : apiClient.post<Envelope<ApiServiceCategory>>('/service-categories', body),
  deleteServiceCategory: async (id: string) => apiClient.delete<Envelope<unknown>>(`/service-categories/${id}`),

  // Jasa
  saveService: async (service: Omit<ServiceMasterItem, 'id'>, id?: string) =>
    id ? apiClient.put<Envelope<any>>(`/services/${id}`, serviceBody(service)) : apiClient.post<Envelope<any>>('/services', serviceBody(service)),
  deleteService: async (id: string) => apiClient.delete<Envelope<DeleteResult>>(`/services/${id}`),

  // Supplier
  listSuppliers: async () => (await apiClient.get<Envelope<ApiSupplier[]>>('/suppliers')).data,
  saveSupplier: async (supplier: Omit<SupplierItem, 'id'>, id?: string) =>
    id ? apiClient.put<Envelope<ApiSupplier>>(`/suppliers/${id}`, supplierBody(supplier)) : apiClient.post<Envelope<ApiSupplier>>('/suppliers', supplierBody(supplier)),

  // Stok
  restock: async (payload: RestockPayload) =>
    (await apiClient.post<Envelope<{ purchase: ApiPurchase; journal: ApiJournal }>>('/inventory/restock', payload)).data,
  stockOpname: async (items: { product_id: number; physical_qty: number }[], notes?: string) =>
    (
      await apiClient.post<
        Envelope<{ reference: string; adjustments: { product_id: number; difference: number }[]; journal: ApiJournal | null }>
      >('/inventory/stock-opname', { items, notes })
    ).data,
  listMovements: async (perPage = 1000) =>
    (await apiClient.get<Envelope<{ data: ApiMovement[] }>>('/inventory/stock-movements', { per_page: perPage })).data.data,
  valuation: async () => (await apiClient.get<Envelope<InventoryValuation>>('/inventory/valuation')).data,
  postOpeningBalance: async () =>
    (await apiClient.post<Envelope<{ valuation: InventoryValuation; journal: ApiJournal | null }>>('/inventory/opening-balance')).data,

  // Hutang supplier
  listPurchases: async (status: 'open' | 'all' = 'all') =>
    (await apiClient.get<Envelope<ApiPurchase[]>>('/purchases', { status })).data,
  payPurchase: async (id: string | number, payload: { amount: number; account_code: string; payment_date?: string; notes?: string }) =>
    (await apiClient.post<Envelope<{ purchase: ApiPurchase; journal: ApiJournal }>>(`/purchases/${id}/payments`, payload)).data,
};
