import { describe, expect, it } from 'vitest';
import type { DailyRecap } from '../../shared/types';
import { cashMovementLabel, dashboardRange, emptyRecapRow, summarizeDashboard, sumRecapRows } from '../dailyReports';

describe('dashboardRange', () => {
  it('starts at the month start when that is earlier than six days ago', () => {
    expect(dashboardRange('2026-09-30')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('reaches into the previous month early in a month (7-day trend)', () => {
    expect(dashboardRange('2026-10-03')).toEqual({ from: '2026-09-27', to: '2026-10-03' });
  });
});

describe('summarizeDashboard', () => {
  const row = (date: string, net_revenue: number, tunai: number) => ({
    ...emptyRecapRow(date),
    sales_count: 1,
    net_revenue,
    payment_mix: { TUNAI: tunai, TRANSFER: 0, QRIS: 0 },
  });
  const recap: DailyRecap = {
    from: '2026-09-27',
    to: '2026-10-03',
    rows: [row('2026-09-28', 500, 500), row('2026-10-01', 100, 100), row('2026-10-03', 200, 50)],
    totals: sumRecapRows([]),
  };

  it('picks today, fills the 7-day window and sums only the current month', () => {
    const s = summarizeDashboard(recap, '2026-10-03');
    expect(s.today.net_revenue).toBe(200);
    expect(s.week.map((r) => r.date)).toEqual([
      '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
    ]);
    expect(s.week[1].net_revenue).toBe(500);
    expect(s.week[2].net_revenue).toBe(0);
    expect(s.month.net_revenue).toBe(300);
    expect(s.month.sales_count).toBe(2);
    expect(s.month.payment_mix.TUNAI).toBe(150);
  });

  it('gives zero rows while the recap is not loaded', () => {
    const s = summarizeDashboard(null, '2026-10-03');
    expect(s.today).toEqual(emptyRecapRow('2026-10-03'));
    expect(s.month.net_income).toBe(0);
  });
});

describe('cashMovementLabel', () => {
  it('labels known journal types and falls back to the raw type', () => {
    expect(cashMovementLabel('SALES_RETURN')).toBe('Retur penjualan (refund)');
    expect(cashMovementLabel('FIXED_ASSET_ACQUISITION')).toBe('Pembelian aset tetap');
    expect(cashMovementLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});
