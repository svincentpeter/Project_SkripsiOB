import { describe, expect, it } from 'vitest';
import type { ExpenseRecord, JournalEntry, PosTransaction, ProductItem } from '../../types';
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

describe('registry pos_sales_history', () => {
  const txs = [
    {
      id: 'tx1',
      reference: 'INV-1',
      date: '2026-09-01',
      cashier_name: 'Kasir 1',
      items: [{ qty: 2 }],
      subtotal: 100000,
      total_discount: 10000,
      tax_amount: 9900,
      grand_total: 99900,
      total_cost_hpp: 70000,
      gross_profit: 29900,
      payment_method: 'TUNAI',
      status: 'LUNAS',
    },
  ] as unknown as PosTransaction[];
  const doc = buildExportDoc('pos_sales_history', txs, ctx);
  it('totals terhitung', () => {
    expect(doc.sections[0].totals?.total).toBe(99900);
    expect(doc.sections[0].totals?.laba).toBe(29900);
  });
});

describe('registry financial statements', () => {
  const mockFinancials = {
    grossSales: 1000000,
    discounts: 50000,
    netSales: 950000,
    totalHpp: 600000,
    grossProfit: 350000,
    expenseBreakdown: [{ code: '6-1000', name: 'Gaji', amount: 100000 }],
    totalExpenses: 100000,
    netIncome: 250000,
    kasLaci: 100000,
    bankBca: 200000,
    liquidCash: 300000,
    piutangDagang: 50000,
    persediaanBuku: 500000,
    totalCurrentAssets: 850000,
    peralatanMesin: 1000000,
    akumulasiPenyusutan: 200000,
    netFixedAssets: 800000,
    totalAssets: 1650000,
    hutangSupplier: 300000,
    ppnKeluaran: 50000,
    totalLiabilities: 350000,
    modalPemilik: 1000000,
    labaDitahan: 50000,
    currentNetIncome: 250000,
    totalEquity: 1300000,
    totalLiabilitiesAndEquity: 1650000,
    isBalanceSheetBalanced: true,
    totalInventoryPhysical: 500000,
    currentRatio: 2.4,
    isLiquiditySafe: true,
  } as never;

  it('laba rugi sections dan diskon negatif', () => {
    const doc = buildExportDoc('fin_income_statement', mockFinancials, ctx);
    expect(doc.sections[0].rows.length).toBe(8);
    expect(doc.sections[0].rows.find((r) => r.label === 'Potongan Diskon')?.value).toBe(-50000);
  });

  it('sak emkm package memiliki 5 section', () => {
    const cf = {
      cashFromSales: 900000,
      cashFromReceivables: 50000,
      totalOperatingInflows: 950000,
      cashPaidForExpenses: 100000,
      cashPaidForInventory: 500000,
      totalOperatingOutflows: 600000,
      netOperatingCashFlow: 350000,
      cashPaidForFixedAssets: 0,
      netInvestingCashFlow: 0,
      cashPaidForPayables: 0,
      cashFromCapital: 0,
      netFinancingCashFlow: 0,
      netCashFlow: 350000,
      beginningCash: 100000,
      endingCash: 450000,
      cashDrawerEnding: 150000,
      bankBcaEnding: 300000,
    };
    const doc = buildExportDoc('sak_emkm_package', { financials: mockFinancials, cashFlow: cf }, ctx);
    expect(doc.sections.length).toBe(5);
  });
});
