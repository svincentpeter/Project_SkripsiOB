import { describe, expect, it } from 'vitest';
import { formatProductSpecLine, matchesProductQuery } from '../productMatcher';

const sampleProducts = [
  {
    id: '1',
    product_name: 'Bridgestone Ecopia EP150 185/65 R14',
    product_code: 'BRI-18565-14-0001',
    brand: 'Bridgestone',
    motif: 'Ecopia EP150',
    product_size: '185/65 R14',
    ring: 'R14',
    product_year: 2025,
    category: 'BAN-MOBIL',
  },
  {
    id: '2',
    product_name: 'Accelera Eco-Plush 165/80 R13',
    product_code: 'ACC-16580-13-0005',
    brand: 'Accelera',
    motif: 'Eco-Plush',
    product_size: '165/80',
    ring: '13',
    product_year: 2024,
    category: 'BAN-MOBIL',
  },
];

describe('productMatcher', () => {
  it('matches slash, space, hyphen, and compact size+ring formats', () => {
    expect(matchesProductQuery(sampleProducts[0], '185/65/14')).toBe(true);
    expect(matchesProductQuery(sampleProducts[0], '185 65 14')).toBe(true);
    expect(matchesProductQuery(sampleProducts[0], '185-65-14')).toBe(true);
    expect(matchesProductQuery(sampleProducts[0], '18565r14')).toBe(true);
    expect(matchesProductQuery(sampleProducts[0], '1856514')).toBe(true);
  });

  it('matches prefix tokens across brand, motif, size, and year', () => {
    expect(matchesProductQuery(sampleProducts[0], 'bri eco 185')).toBe(true);
    expect(matchesProductQuery(sampleProducts[0], 'ecopia 2025')).toBe(true);
    expect(matchesProductQuery(sampleProducts[1], 'acc 165/80/13')).toBe(true);
    expect(matchesProductQuery(sampleProducts[1], '185/65/14')).toBe(false);
  });

  it('formats spec line cleanly without duplicating ring', () => {
    expect(formatProductSpecLine(sampleProducts[0])).toBe('Ukuran 185/65 · Ring R14');
    expect(formatProductSpecLine(sampleProducts[1])).toBe('Ukuran 165/80 · Ring R13');
  });
});
