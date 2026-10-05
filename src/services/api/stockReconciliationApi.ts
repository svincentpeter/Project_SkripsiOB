import { apiClient } from './apiClient';

export interface StagingBatch {
  batch_cost: number | null;
  initial_qty: number;
  remaining_qty: number;
  is_old_stock: boolean;
  reference_price: number | null;
  source_row: number;
}

export interface DbMatchInfo {
  id: number;
  code: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
  diff: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface StagingProduct {
  match_key: string;
  product_code: string;
  product_name: string;
  brand_id: number;
  brand_name: string;
  category_id: number;
  product_size: string | null;
  ring: string | null;
  product_year: number;
  product_price: number | null;
  avg_cost: number | null;
  total_stock: number;
  opening_qty: number;
  is_old_stock: boolean;
  reference_price: number | null;
  sheet_name: string;
  batches: StagingBatch[];
  db_match?: DbMatchInfo | null;
}

export interface UnresolvedRow {
  sheet: string;
  row: number;
  name: string;
  reason: string;
  size: string | null;
  ring: string | null;
  qty: number;
}

export interface StagingMeta {
  source: string;
  generated_at: string;
  qty_column: 'G' | 'H';
  rows_read: number;
  rows_product: number;
  rows_child: number;
  rows_note: number;
  rows_unresolved: number;
  total_products: number;
  total_batches: number;
  total_stock_qty: number;
  total_opening_qty: number;
  products_without_price: number;
  products_without_cost: number;
}

export interface StagingStats {
  total_excel: number;
  total_stock_excel: number;
  total_matched: number;
  total_unmatched: number;
  total_surplus: number;
  total_deficit: number;
  total_equal: number;
  can_commit: boolean;
}

export interface StagingData {
  meta: StagingMeta;
  products: StagingProduct[];
  notes: Array<{ sheet: string; row: number; text: string }>;
  unresolved: UnresolvedRow[];
  stats: StagingStats;
}

export interface CommitResult {
  created: number;
  updated: number;
  deactivated: number;
  zeroed: number;
  batches_created: number;
  movements: number;
  price_audits: number;
  snapshot_path: string;
}

export interface BulkUpdateItem {
  product_id: number;
  excel_cost?: number | null;
  excel_price?: number | null;
  excel_stock?: number | null;
  product_name?: string | null;
  product_code?: string | null;
  batches?: StagingBatch[];
}

export interface BulkUpdateOptions {
  update_cost: boolean;
  update_price: boolean;
  update_stock: boolean;
  reason: string;
  branch_id?: number;
}

export interface BulkUpdateResult {
  total_processed: number;
  cost_updated: number;
  price_updated: number;
  stock_updated: number;
  details: Array<{ id: number; code: string; name: string }>;
}

/**
 * Impor & rekonsiliasi stok Excel: seluruhnya di server (stok, FIFO dan jurnal 1-2000 milik server).
 * Tidak ada jalur offline: bila server tak terjangkau atau menolak, galatnya diteruskan ke layar.
 */
export const stockReconciliationApi = {
  uploadPreview: async (file: File, qtyColumn: 'G' | 'H' = 'H') => {
    const formData = new FormData();
    formData.append('excel_file', file);
    formData.append('qty_column', qtyColumn);

    return apiClient.upload<{ success: boolean; message: string; data: StagingData }>('/stock/import-preview', formData);
  },

  getStaging: () => apiClient.get<{ success: boolean; message?: string; data: StagingData | null }>('/stock/staging'),

  resolveBrand: (index: number, brandId: number) =>
    apiClient.post<{ success: boolean; message: string; data: StagingData }>('/stock/resolve-brand', { index, brand_id: brandId }),

  resolveName: (index: number, name: string, brandId?: number) =>
    apiClient.post<{ success: boolean; message: string; data: StagingData }>('/stock/resolve-name', { index, name, brand_id: brandId }),

  ignoreUnresolved: (index: number) =>
    apiClient.post<{ success: boolean; message: string; data: StagingData }>('/stock/ignore-unresolved', { index }),

  commit: (period: string, onlyMatchKeys?: string[], force: boolean = false) =>
    apiClient.post<{ success: boolean; message: string; data: CommitResult }>('/stock/commit', { period, only_match_keys: onlyMatchKeys, force }),

  bulkUpdate: (items: BulkUpdateItem[], options: BulkUpdateOptions) =>
    apiClient.post<{ success: boolean; message: string; data?: BulkUpdateResult }>('/stock/bulk-update', { items, ...options }),

  getTemplateDownloadUrl: () => {
    const baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
    return `${baseUrl}/stock/template`;
  },
};
