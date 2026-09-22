import { describe, it, expect } from 'vitest';
import { terbilangRupiah, formatRupiah } from '../formatters';

describe('formatters - terbilangRupiah', () => {
  it('should correctly convert numbers to Indonesian words', () => {
    expect(terbilangRupiah(0)).toBe('Nol rupiah');
    expect(terbilangRupiah(1000)).toBe('Seribu rupiah');
    expect(terbilangRupiah(25000)).toBe('Dua puluh lima ribu rupiah');
    expect(terbilangRupiah(350000)).toBe('Tiga ratus lima puluh ribu rupiah');
    expect(terbilangRupiah(1450000)).toBe('Satu juta empat ratus lima puluh ribu rupiah');
    expect(terbilangRupiah(8200000)).toBe('Delapan juta dua ratus ribu rupiah');
  });

  it('should handle negative numbers gracefully', () => {
    expect(terbilangRupiah(-350000)).toBe('Tiga ratus lima puluh ribu rupiah');
  });
});
