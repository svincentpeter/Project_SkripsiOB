import ExcelJS from 'exceljs';
import { describe, it, expect } from 'vitest';
import { buildStockLedgerWorkbook } from '../stockLedgerExcel';
import { StockMonthlyReportData } from '../../../services/stockMonthlyLedgerService';

describe('stockLedgerExcel', () => {
  const mockData: StockMonthlyReportData = {
    rows: [
      {
        id: '1',
        product_code: 'BRI-1856515',
        product_name: 'Bridgestone Turanza',
        brand_name: 'Bridgestone',
        motif: 'Turanza',
        product_size: '185/65 R15',
        ring: '15',
        product_cost: 700000,
        product_price: 850000,
        opening: 10,
        restock: 5,
        sold: 3,
        remaining: 12,
        daily_sales: { 1: 1, 15: 2 },
        layers: [
          {
            batch_id: 'b1',
            batch_cost: 700000,
            initial_qty: 10,
            remaining_qty: 7,
            sold: 3,
            valuation: 7 * 700000,
            daily_sales: { 1: 1, 15: 2 },
          },
          {
            batch_id: 'b2',
            batch_cost: 720000,
            initial_qty: 5,
            remaining_qty: 5,
            sold: 0,
            valuation: 5 * 720000,
            daily_sales: {},
          },
        ],
      },
    ],
    summary: {
      total_products: 1,
      total_valuation_cogs: 12 * 700000,
      total_opening: 10,
      total_restock: 5,
      total_sold: 3,
      total_remaining: 12,
      empty_stock_count: 0,
      low_stock_count: 0,
    },
    meta: {
      month: '2026-09',
      year: 2026,
      month_num: 9,
      days_in_month: 30,
      brand_options: ['Bridgestone'],
      total_rows: 1,
    },
  };

  it('builds Excel workbook with frozen columns and formatted headers', async () => {
    const wb = buildStockLedgerWorkbook(mockData);
    const buf = await wb.xlsx.writeBuffer();

    const reloadWb = new ExcelJS.Workbook();
    await reloadWb.xlsx.load(buf);

    const ws = reloadWb.getWorksheet('Buku Stok Bulanan')!;
    expect(ws).toBeDefined();

    // Check title in cell A1
    expect(String(ws.getCell('A1').value)).toContain('LAPORAN STOK BULANAN & BUKU FIFO GUDANG');

    // Check headers row 2
    expect(String(ws.getCell('B2').value)).toBe('Merk & Nama Ban');
    expect(String(ws.getCell('E2').value)).toBe('Modal (HPP)');

    // Check data row 3
    expect(String(ws.getCell('B3').value)).toContain('Bridgestone Turanza');
    expect(Number(ws.getCell('E3').value)).toBe(700000);
    expect(Number(ws.getCell('I3').value)).toBe(12); // Sisa

    // Check sub-layer row 4
    expect(String(ws.getCell('B4').value)).toContain('↳ Lapisan Batch #2');
    expect(Number(ws.getCell('E4').value)).toBe(720000);
  });
});
