import { describe, expect, it } from 'vitest';
import { buildCsv } from '../writers/csv';
import { fixtureDoc } from './fixtures';

describe('buildCsv', () => {
  const out = buildCsv(fixtureDoc);
  it('BOM UTF-8 di awal', () => expect(out.charCodeAt(0)).toBe(0xfeff));
  it('quote field dgn koma/tanda kutip', () => expect(out).toContain('"Bayar ""gaji"", lembur"'));
  it('angka mentah tanpa Rp', () => expect(out).toContain(',1500000'));
  it('baris TOTAL ada', () => expect(out).toContain('TOTAL'));
  it('null jadi kosong', () => expect(out).toContain('2026-09-02,Kosong,'));
});
