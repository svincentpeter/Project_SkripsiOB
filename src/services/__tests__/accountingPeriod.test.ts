import { describe, expect, it } from 'vitest';
import { currentMonth, localDate, monthLabel, monthRange, previousMonth, resolvePeriod } from '../accountingPeriod';

describe('accountingPeriod', () => {
  it('localDate memakai tanggal lokal, bukan UTC', () => {
    expect(localDate(new Date(2026, 8, 30, 1, 30))).toBe('2026-09-30');
    expect(currentMonth(new Date(2026, 8, 30, 23, 59))).toBe('2026-09');
  });

  it('monthRange menghitung hari terakhir termasuk tahun kabisat', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('previousMonth melewati pergantian tahun', () => {
    expect(previousMonth(new Date(2026, 0, 15))).toBe('2025-12');
  });

  it('resolvePeriod untuk bulan, semua periode, dan rentang', () => {
    expect(resolvePeriod({ kind: 'month', month: '2026-09' })).toEqual({ start_date: '2026-09-01', end_date: '2026-09-30', label: 'September 2026' });
    expect(resolvePeriod({ kind: 'all' }, '2026-09-29')).toEqual({ end_date: '2026-09-29', label: 'Semua periode s/d 2026-09-29' });
    expect(resolvePeriod({ kind: 'range', start: '2026-09-01', end: '2026-09-15' })).toEqual({ start_date: '2026-09-01', end_date: '2026-09-15', label: '2026-09-01 s/d 2026-09-15' });
    expect(monthLabel('2026-01')).toBe('Januari 2026');
  });
});
