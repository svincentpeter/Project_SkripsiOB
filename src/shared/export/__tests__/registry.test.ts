import { describe, expect, it } from 'vitest';
import type { JournalEntry } from '../../types';
import { setExportConfig } from '../exportConfig';
import { buildExportDoc, REPORT_FORMATS, REPORT_MAPPERS } from '../registry';

setExportConfig(null, null);
const ctx = { periodLabel: '01 Sep 2026 - 08 Sep 2026', startDate: '2026-09-01', endDate: '2026-09-08' };

const journals: JournalEntry[] = [{
  id: 'j1', journal_number: 'JU-202609-0001', reference_number: 'JU-202609-0001', date: '2026-09-01',
  ref_doc: 'OB3-INV-0142', description: 'Penjualan ban', status: 'POSTED',
  lines: [
    { account_code: '1-1000', account_name: 'Kas Toko Laci Kasir', debit: 1000, credit: 0 },
    { account_code: '4-1000', account_name: 'Pendapatan Penjualan Ban Baru', debit: 0, credit: 1000 },
  ],
}];

describe('registry journal', () => {
  const doc = buildExportDoc('journal', journals, ctx);
  it('1 baris per line jurnal', () => expect(doc.sections[0].rows.length).toBe(2));
  it('totals debit = kredit', () => {
    expect(doc.sections[0].totals?.debit).toBe(1000);
    expect(doc.sections[0].totals?.kredit).toBe(1000);
  });
  it('kop terisi', () => expect(doc.kop.reportTitle).toBe('JURNAL UMUM'));
  it('formats sesuai matriks spec', () => {
    expect(REPORT_FORMATS.journal).toEqual(['xlsx', 'pdf', 'csv']);
    expect(REPORT_FORMATS.trial_balance).toEqual(['xlsx', 'pdf', 'docx', 'csv']);
  });
  it('semua 21 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(21));
});
