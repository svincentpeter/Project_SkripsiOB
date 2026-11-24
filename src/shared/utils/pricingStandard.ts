import { ProductItem } from '../types';

export const MIN_MARKUP_PERCENT = 15;
export const MIN_MARKUP_RATE = 0.15;

export const CASHIER_INITIAL_PRICE_REASONS: string[] = [
  'Harga katalog belum diisi Owner (Owner sedang sibuk)',
  'Penentuan harga jual darurat sesuai standar HPP + 15%',
  'Penyesuaian harga batch baru atas instruksi telepon Owner',
];

export const CASHIER_REIMBURSE_REASONS: string[] = [
  'Permintaan pembeli (Reimburse ke atasan / kantor)',
  'Penyesuaian harga ukuran tren tinggi atas instruksi Owner',
  'Penyesuaian harga batch baru di nota transaksi',
];

/**
 * HPP patokan penentuan harga jual: nilai tertinggi antara modal terbaru (`overrideCost` atau `product_cost`)
 * dan `batch_cost` tertinggi dari seluruh batch FIFO aktif (`remaining_qty > 0`).
 * Jika `overrideCost` diberikan (mis. saat edit produk atau input restock batch baru),
 * `overrideCost` menggantikan `product_cost` / `reference_hpp` lama agar perubahan HPP langsung akurat.
 */
export function getProductReferenceHpp(
  product?: ProductItem | null,
  overrideCost?: number
): number {
  const candidates: number[] = [];
  const hasOverride = overrideCost !== undefined && Number.isFinite(overrideCost) && overrideCost > 0;

  if (hasOverride) {
    candidates.push(Number(overrideCost));
  } else if (product) {
    if (product.reference_hpp && product.reference_hpp > 0) {
      candidates.push(Number(product.reference_hpp));
    }
    const baseCost = Number(product.product_cost ?? product.cost_price ?? product.cost ?? 0);
    if (baseCost > 0) {
      candidates.push(baseCost);
    }
  }

  if (product && Array.isArray(product.batches)) {
    for (const b of product.batches) {
      if ((b.remaining_qty ?? 0) > 0 && (b.batch_cost ?? 0) > 0) {
        candidates.push(Number(b.batch_cost));
      }
    }
  }

  return candidates.length > 0 ? Math.round(Math.max(...candidates)) : 0;
}

/**
 * Harga jual minimal wajib (+15% dari HPP patokan): HPP × 1,15.
 */
export function getMinSellingPrice(referenceHpp: number): number {
  if (!Number.isFinite(referenceHpp) || referenceHpp <= 0) return 0;
  return Math.round(referenceHpp * (1 + MIN_MARKUP_RATE));
}

/**
 * Hitung harga jual real-time dari persentase keuntungan (markup) terhadap HPP patokan:
 * Harga Jual = round(HPP × (1 + markupPercent / 100)).
 */
export function getPriceFromMarkupPercent(referenceHpp: number, markupPercent: number): number {
  if (!Number.isFinite(referenceHpp) || referenceHpp <= 0) return 0;
  return Math.max(0, Math.round(referenceHpp * (1 + markupPercent / 100)));
}

/** Alias kompatibilitas. */
export const getRecommendedPriceByMarkup = getPriceFromMarkupPercent;

/**
 * Persentase keuntungan (markup) terhadap HPP patokan: ((Harga Jual - HPP) / HPP) × 100.
 */
export function calculateMarkupPercent(sellingPrice: number, referenceHpp: number): number {
  if (!Number.isFinite(referenceHpp) || referenceHpp <= 0) return 0;
  return Number((((sellingPrice - referenceHpp) / referenceHpp) * 100).toFixed(2));
}
