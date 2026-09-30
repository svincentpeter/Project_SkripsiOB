import { describe, it, expect } from 'vitest';
import { terbilangRupiah, formatRupiah, formatSignedQty, parseDecimalRupiah } from '../formatters';

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

describe('formatters - formatSignedQty', () => {
  it('shows the sign of a net stock movement, including a negative net inflow', () => {
    expect(formatSignedQty(5)).toBe('+5');
    expect(formatSignedQty(-5)).toBe('−5');
    expect(formatSignedQty(0)).toBe('0');
    expect(formatSignedQty(undefined)).toBe('0');
  });
});

describe('formatters - parseDecimalRupiah', () => {
  it('format Indonesia: titik ribuan, koma desimal', () => {
    expect(parseDecimalRupiah('12.345.678,90')).toBe(12345678.9);
    expect(parseDecimalRupiah('Rp 1.234,5')).toBe(1234.5);
    expect(parseDecimalRupiah('6500,25')).toBe(6500.25);
  });
  it('titik desimal (1-2 angka) dan titik ribuan (grup 3 angka)', () => {
    expect(parseDecimalRupiah('12345678.90')).toBe(12345678.9);
    expect(parseDecimalRupiah('1.234')).toBe(1234);
    expect(parseDecimalRupiah('1.234.567')).toBe(1234567);
  });
  it('minus di depan untuk saldo cerukan', () => {
    expect(parseDecimalRupiah('-12.345,67')).toBe(-12345.67);
    expect(parseDecimalRupiah('-500')).toBe(-500);
    expect(parseDecimalRupiah(new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(-1234.5))).toBe(-1234.5);
    expect(parseDecimalRupiah('−1.234,5')).toBe(-1234.5);
    expect(parseDecimalRupiah('12.2212')).toBeNull();
  });
  it('kosong = 0, format tak dikenal = null', () => {
    expect(parseDecimalRupiah('  ')).toBe(0);
    expect(parseDecimalRupiah('12,345,678.90')).toBeNull();
    expect(parseDecimalRupiah('1,234')).toBeNull();
    expect(parseDecimalRupiah('12.3456')).toBeNull();
    expect(parseDecimalRupiah('abc')).toBeNull();
    expect(parseDecimalRupiah('1-2')).toBeNull();
  });
});
