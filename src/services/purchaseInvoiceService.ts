import { ProductBatch } from '../shared/types';

/**
 * Kalkulator PPN faktur supplier untuk penerimaan barang, mengikuti ProjectOmahBan
 * (resources/js/reports-v2/stock-monthly/receipt-cart.js).
 *
 * Toko non-PKP: PPN pembelian tidak dikreditkan, jadi ikut menjadi modal persediaan.
 * Harga faktur diketik apa adanya (boleh 2 desimal); modal batch selalu rupiah bulat:
 *   - "exclude": faktur belum termasuk PPN, modal = faktur × 1,11
 *   - "include": faktur sudah termasuk PPN, modal = faktur
 *
 * Hitungan memakai sen (bilangan bulat) supaya 0,5 tidak meleset akibat floating point.
 */
export type PpnMode = 'exclude' | 'include';

export interface InvoiceSummary {
  mode: PpnMode;
  dpp: number;
  ppn: number;
  total: number;
  /** Nilai yang dibukukan ke persediaan: jumlah × modal per unit (bisa selisih pembulatan dari total faktur). */
  modal: number;
}

const toCents = (price: number): number => Math.max(0, Math.round((Number(price) || 0) * 100));

export const roundInvoicePrice = (price: number): number => toCents(price) / 100;

/** Harga faktur format Indonesia ("677.873,75", "Rp 1.250.000") → angka, dibulatkan 2 desimal. */
export const parseInvoicePrice = (text: string): number => {
  const clean = text.replace(/[^0-9,]/g, '').replace(',', '.');
  return roundInvoicePrice(parseFloat(clean));
};

export const formatInvoicePrice = (price: number): string =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(price);

/** Modal per unit dari harga faktur menurut mode PPN, dibulatkan ke rupiah. */
export const costFromInvoice = (unitPrice: number, mode: PpnMode): number => {
  const sen = toCents(unitPrice);
  return mode === 'include' ? Math.round(sen / 100) : Math.round((sen * 111) / 10000);
};

/** Kebalikan costFromInvoice: harga faktur yang menghasilkan modal tersebut. */
export const invoicePriceFromCost = (cost: number, mode: PpnMode): number => {
  const modal = Math.max(0, Math.round(Number(cost) || 0));
  return mode === 'include' ? modal : Math.round((modal * 10000) / 111) / 100;
};

/**
 * Ringkasan faktur agar bisa dicocokkan dengan baris DPP / PPN / total di nota supplier.
 * Jumlah faktur dibulatkan ke rupiah dulu, lalu PPN dihitung dari total DPP (seperti faktur).
 */
export const invoiceSummary = (quantity: number, unitPrice: number, mode: PpnMode): InvoiceSummary => {
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const faktur = Math.round((qty * toCents(unitPrice)) / 100);
  const modal = qty * costFromInvoice(unitPrice, mode);

  if (mode === 'include') {
    const dpp = Math.round((faktur * 100) / 111);
    return { mode, dpp, ppn: faktur - dpp, total: faktur, modal };
  }

  const ppn = Math.round((faktur * 11) / 100);
  return { mode, dpp: faktur, ppn, total: faktur + ppn, modal };
};

/** Modal batch aktif terbaru (tanggal masuk, lalu id terbesar); fallback ke product_cost. */
export const lastBatchCost = (product: { batches?: ProductBatch[]; product_cost?: number }): number => {
  let latest: ProductBatch | null = null;
  for (const b of product.batches ?? []) {
    if (
      !latest ||
      b.purchase_date > latest.purchase_date ||
      (b.purchase_date === latest.purchase_date && Number(b.id) > Number(latest.id))
    ) {
      latest = b;
    }
  }
  return Math.max(0, Math.round(Number(latest?.batch_cost ?? product.product_cost) || 0));
};

/** Selisih modal baru terhadap modal lama; null bila belum ada pembanding. */
export const costDelta = (newCost: number, previousCost: number): { diff: number; percent: number } | null => {
  const prev = Math.round(Number(previousCost) || 0);
  if (prev <= 0) return null;
  const diff = Math.round(Number(newCost) || 0) - prev;
  return { diff, percent: Math.round((diff / prev) * 1000) / 10 };
};
