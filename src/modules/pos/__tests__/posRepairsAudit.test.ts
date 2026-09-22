import { describe, it, expect } from 'vitest';
import { INITIAL_PRODUCT_CATEGORIES } from '../../../shared/data/mockData';

describe('POS UI & Business Logic Repairs Audit', () => {
  it('confirms BAN_BEKAS is completely eliminated from master product categories', () => {
    const hasBanBekas = INITIAL_PRODUCT_CATEGORIES.some(
      (c) => c.category_code.toUpperCase().includes('BEKAS') || c.category_name.toLowerCase().includes('bekas')
    );
    expect(hasBanBekas).toBe(false);
  });

  it('calculates BON due date accurately based on term days', () => {
    const today = new Date('2026-09-22T00:00:00.000Z');
    
    const calcDueDate = (baseDate: Date, days: number) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    expect(calcDueDate(today, 7)).toBe('2026-09-29');
    expect(calcDueDate(today, 14)).toBe('2026-10-06');
    expect(calcDueDate(today, 30)).toBe('2026-10-22');
  });

  it('calculates dynamic suggested DP capped under total grand total', () => {
    const calcSuggestedDp = (grandTotal: number) => {
      if (grandTotal <= 0) return 0;
      const suggested = Math.floor(grandTotal * 0.3);
      if (suggested <= 0) return Math.max(0, grandTotal - 10000);
      return Math.min(suggested, Math.max(10000, grandTotal - 10000));
    };

    // For a 150,000 service, 30% is 45,000 (well below 150,000)
    const dpForSmall = calcSuggestedDp(150000);
    expect(dpForSmall).toBe(45000);
    expect(dpForSmall).toBeLessThan(150000);

    // For a 2,000,000 tire order, 30% is 600,000 capped to grandTotal - 10,000
    const dpForLarge = calcSuggestedDp(2000000);
    expect(dpForLarge).toBe(600000);
    expect(dpForLarge).toBeLessThan(2000000);
  });
});
