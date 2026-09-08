import { describe, expect, it } from 'vitest';
import { buildFileName } from '../naming';

describe('buildFileName', () => {
  it('rentang periode', () => {
    expect(buildFileName('Jurnal Umum', '2026-09-01', '2026-09-08')).toBe('JurnalUmum_20260901-20260908');
  });
  it('tanpa periode = hari ini', () => {
    expect(buildFileName('Ringkasan Dashboard')).toMatch(/^RingkasanDashboard_\d{8}$/);
  });
});
