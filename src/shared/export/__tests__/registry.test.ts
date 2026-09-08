import { describe, expect, it } from 'vitest';
import type { ExpenseRecord, JournalEntry, ProductItem } from '../../types';
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

describe('registry expenses', () => {
  const base: ExpenseRecord = {
    id: 'e1', reference: 'BKK-1', expense_number: 'BKK-202609-0001', date: '2026-09-01',
    category: 'Listrik & Air (PLN/PDAM)', amount: 1000, cash_source: 'Kas Tunai Laci Kasir',
    paid_to: 'PLN', description: 'token listrik', approved_by: 'Owner', created_at: '2026-09-01',
  };
  const doc = buildExportDoc('expenses', [{ ...base }, { ...base, id: 'e2', status: 'VOID', amount: 500 }], ctx);
  it('semua baris ikut (aktif + void)', () => expect(doc.sections[0].rows.length).toBe(2));
  it('totals hanya ACTIVE', () => expect(doc.sections[0].totals?.nominal).toBe(1000));
});

describe('registry inventory_products', () => {
  const products = [
    { id: 'p1', product_code: 'BN-01', barcode: '8991', product_name: 'Bridgestone 185/65R15', category: 'BAN_BARU', brand: 'Bridgestone', product_quantity: 4, product_stock_alert: 2, product_cost: 700000, product_price: 950000 },
    { id: 'p2', product_code: 'BN-02', barcode: '8992', product_name: 'Accelera 195/55R16', category: 'BAN_BARU', brand: 'Accelera', product_quantity: 0, product_stock_alert: 2, product_cost: 800000, product_price: 1100000 },
  ] as unknown as ProductItem[];
  const doc = buildExportDoc('inventory_products', products, ctx);
  it('totals stok & nilai persediaan', () => {
    expect(doc.sections[0].totals?.stok).toBe(4);
    expect(doc.sections[0].totals?.nilai).toBe(2800000);
  });
});
