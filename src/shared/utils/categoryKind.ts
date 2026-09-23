/**
 * Jenis barang untuk menentukan field form & tampilan (ukuran ban, PCD velg, katup ban dalam).
 * Kode kategori server bebas (mis. "BAN-MOBIL", "VELG-RACING"), jadi jenisnya diturunkan dari kode/nama.
 */
export type CategoryKind = 'BAN_BARU' | 'VELG' | 'BAN_DALAM' | 'OLI_PELUMAS' | 'AKSESORIS' | 'LAINNYA';

export const categoryKind = (code?: string | null, name?: string | null): CategoryKind => {
  const text = `${code ?? ''} ${name ?? ''}`.toUpperCase();
  if (text.includes('VELG') || text.includes('WHEEL') || text.includes('RIM')) return 'VELG';
  if (text.includes('DALAM') || text.includes('INNER')) return 'BAN_DALAM';
  if (text.includes('OLI') || text.includes('PELUMAS') || text.includes('OIL')) return 'OLI_PELUMAS';
  if (text.includes('AKSES') || text.includes('MUR') || text.includes('ACCESS')) return 'AKSESORIS';
  if (text.includes('BAN') || text.includes('TIRE') || text.includes('TYRE')) return 'BAN_BARU';
  return 'LAINNYA';
};
