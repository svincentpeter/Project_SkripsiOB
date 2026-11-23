import type { ProductItem } from '../types';

export const stockOf = (p: ProductItem): number => p.product_quantity ?? p.stock ?? 0;

/** Produk aktif yang stoknya di bawah ambang (default 5): dipakai layar dashboard dan ekspornya agar sama. */
export const lowStockProducts = (products: ProductItem[]): ProductItem[] =>
  products.filter((p) => p.is_active !== false && stockOf(p) < (p.product_stock_alert ?? p.min_stock ?? 5));
