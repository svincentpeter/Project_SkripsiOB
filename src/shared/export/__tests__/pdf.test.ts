import type { Content } from 'pdfmake/interfaces';
import { describe, expect, it } from 'vitest';
import { emptyRecapRow } from '../../../services/dailyReports';
import { buildExportDoc } from '../registry';
import { buildPdfDef } from '../writers/pdf';
import { fixtureDoc, twoSectionDoc } from './fixtures';

describe('buildPdfDef', () => {
  const def = buildPdfDef(fixtureDoc);
  it('orientasi ikut doc', () => expect(def.pageOrientation).toBe('landscape'));
  it('tabel = header + 2 baris + TOTAL', () => {
    const content = Array.isArray(def.content) ? def.content : [def.content];
    const tables = content.filter((c): c is Extract<Content, { table: unknown }> => typeof c === 'object' && 'table' in c);
    expect(tables.length).toBe(1);
    expect(tables[0].table.body.length).toBe(4);
  });
  it('footer nomor halaman Indonesia', () => {
    const f = def.footer;
    expect(typeof f).toBe('function');
    if (typeof f === 'function') {
      const out = f(1, 2, { width: 842, height: 595, orientation: 'landscape' });
      expect(typeof out === 'object' && 'text' in out ? out.text : '').toBe('Hal 1 dari 2');
    }
  });
  it('tabel 2 kolom (ringkasan/neraca) memberi kolom label lebar fleksibel (*) dan kolom nominal lebar tetap', () => {
    const portraitDef = buildPdfDef(twoSectionDoc);
    const content = Array.isArray(portraitDef.content) ? portraitDef.content : [portraitDef.content];
    const tables = content.filter((c): c is Extract<Content, { table: unknown }> => typeof c === 'object' && 'table' in c);
    expect(tables[0].table.widths).toEqual(['*', 145]);
  });
  it('kolom berlebar karakter Excel (width: 8) dikonversi ke lebar poin PDF proporsional (>= 24pt, bukan 8pt)', () => {
    const dailyCashDoc = buildExportDoc(
      'daily_cash',
      {
        date: '2026-11-23',
        scope: 'all',
        cashier: null,
        summary: {
          ...emptyRecapRow('2026-11-23'),
          sales_count: 5,
          net_revenue: 5970000,
          cost_of_sales: 4711600,
          gross_profit: 1258400,
          operating_expenses: 115085,
          other_income: 42500,
          net_income: 1185815,
          payment_mix: { TUNAI: 2200000, TRANSFER: 2400000, QRIS: 1355000 },
        },
        cash_accounts: null,
        cash_movements: null,
        expenses: null,
        cashiers: [
          {
            cashier_name: 'Kasir OB3',
            sales_count: 5,
            sales_total: 5955000,
            void_count: 1,
            void_total: 525000,
            by_method: { TUNAI: 2200000, TRANSFER: 2400000, QRIS: 1355000 },
          },
        ],
        sales: [
          {
            id: 1,
            reference: 'OB3-INV-202611-0005',
            time: '09:15',
            cashier_name: 'Kasir OB3',
            customer_name: 'Andi Prasetyo',
            vehicle_plate: 'AA 1054 HB',
            total_amount: 1700000,
            total_hpp: 1440000,
            status: 'LUNAS',
            payments: [{ method: 'TUNAI', amount: 1700000, fee_amount: 0, net_received: 1700000 }],
          },
        ],
        cash_sessions: [],
      },
      { periodLabel: '23 Nov 2026', startDate: '2026-11-23', endDate: '2026-11-23' },
    );
    const pdfDef = buildPdfDef(dailyCashDoc);
    const content = Array.isArray(pdfDef.content) ? pdfDef.content : [pdfDef.content];
    const tables = content.filter((c): c is Extract<Content, { table: unknown }> => typeof c === 'object' && 'table' in c);
    // Tabel 1 = Ringkasan Hari Ini (2 kolom -> ['*', 175])
    expect(tables[0].table.widths).toEqual(['*', 175]);
    // Tabel 2 = Penerimaan per Kasir & Tabel 3 = Daftar Nota: semua kolom >= 24pt
    for (const t of [tables[1], tables[2]]) {
      const widths = t.table.widths as number[];
      expect(widths.every((w) => typeof w === 'number' && w >= 24)).toBe(true);
    }
  });
});
