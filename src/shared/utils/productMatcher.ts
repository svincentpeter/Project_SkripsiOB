import { ProductItem } from '../types';

/** Pecah teks pada karakter non-alfanumerik. */
function words(value: unknown): string[] {
  return String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

/** Ambil angka ring murni, mis. "R14" atau "14" -> "14". */
function cleanRingDigits(ring: unknown): string {
  return String(ring ?? '')
    .trim()
    .replace(/^r/i, '')
    .replace(/[^0-9.]/g, '');
}

/**
 * Daftar token pencarian sebuah produk, mengadopsi product-matcher.js ProjectOmahBan Cabang 2.
 * Mendukung kueri seperti "185/65/14", "185 65 14", "185-65-14", "18565r14", "eco 185", dll.
 */
export function productTokens(product: Partial<ProductItem>): string[] {
  const tokens: string[] = [
    ...words(product.product_name),
    ...words(product.name),
    ...words(product.brand),
    ...words(product.motif),
    ...words(product.product_code),
    ...words(product.category),
  ];

  const rawSize = String(product.product_size ?? product.size ?? '').trim();
  const ringDigits = cleanRingDigits(product.ring);

  tokens.push(...words(rawSize));

  if (ringDigits) {
    tokens.push(ringDigits, `r${ringDigits}`);
  }

  // Ekstrak dimensi lebar/rasio (mis. "185/65" dari "185/65 R14" atau dari size_width/size_ratio)
  let baseSize = '';
  const slashMatch = rawSize.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (slashMatch) {
    baseSize = `${slashMatch[1]}/${slashMatch[2]}`;
  } else if (product.size_width && product.size_ratio) {
    baseSize = `${product.size_width}/${product.size_ratio}`;
  } else if (rawSize) {
    baseSize = rawSize.replace(/\s*r\s*\d+\s*$/i, '').trim();
  }

  // Deteksi ring dari rawSize jika kolom ring kosong
  const sizeRingMatch = rawSize.match(/r\s*(\d+(?:\.\d+)?)/i);
  const effectiveRing = ringDigits || (sizeRingMatch ? sizeRingMatch[1] : '');

  if (effectiveRing) {
    tokens.push(effectiveRing, `r${effectiveRing}`);
  }

  if (baseSize && effectiveRing) {
    const rapat = baseSize.replace(/\D/g, '');
    tokens.push(`${baseSize}/${effectiveRing}`.toLowerCase());
    if (rapat) {
      tokens.push(`${rapat}r${effectiveRing}`.toLowerCase(), `${rapat}${effectiveRing}`.toLowerCase());
    }
  }

  if (product.product_year) {
    tokens.push(String(product.product_year).toLowerCase());
  }

  return Array.from(new Set(tokens.filter(Boolean)));
}

export function queryTokens(query: string): string[] {
  return words(query);
}

/**
 * Cocok bila SETIAP token kueri merupakan awalan dari salah satu token produk.
 */
export function matchesProductQuery(product: Partial<ProductItem>, query: string, precomputedTokens?: string[]): boolean {
  const wanted = queryTokens(query);
  if (wanted.length === 0) return true;
  const available = precomputedTokens ?? productTokens(product);
  return wanted.every((token) => available.some((candidate) => candidate.startsWith(token)));
}

/**
 * Bangun baris spesifikasi ringkas tanpa duplikasi ukuran, mis. "Ukuran 185/65 · Ring R14".
 */
export function formatProductSpecLine(product: Partial<ProductItem>): string {
  const rawSize = String(product.product_size ?? product.size ?? '').trim();
  const ringDigits = cleanRingDigits(product.ring);

  // Hapus sufiks ring dari rawSize bila kolom ring juga tersedia supaya tidak tertulis ganda.
  const sizeWithoutRing = rawSize.replace(/\s*r\s*\d+(?:\.\d+)?\s*$/i, '').trim();
  const embeddedRing = rawSize.match(/r\s*(\d+(?:\.\d+)?)/i)?.[1] ?? '';
  const finalRing = ringDigits || embeddedRing;

  const parts: string[] = [];
  if (sizeWithoutRing) {
    parts.push(`Ukuran ${sizeWithoutRing}`);
  }
  if (finalRing) {
    parts.push(`Ring R${finalRing}`);
  }
  if (parts.length === 0 && rawSize) {
    parts.push(rawSize);
  }
  return parts.join(' · ');
}
