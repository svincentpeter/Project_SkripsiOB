import { describe, expect, it } from 'vitest';
import type { ExpenseRecord, JournalEntry, PosTransaction, ProductItem } from '../../types';
import { setExportConfig } from '../exportConfig';
import { buildExportDoc, REPORT_FORMATS, REPORT_MAPPERS } from '../registry';
import type { CashFlowReport, FinancialStatements, StatementLine } from '../../types';
import type { BankReconciliationReport, CalkReport } from '../../types/sakEmkm';

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
  it('semua reportId terdaftar (termasuk rekonsiliasi bank)', () => {
    expect(Object.keys(REPORT_MAPPERS).length).toBe(21);
    expect(Object.keys(REPORT_MAPPERS)).toContain('bank_reconciliation');
  });
  it('ekspor accounts_receivable sudah dihapus', () => expect(Object.keys(REPORT_MAPPERS)).not.toContain('accounts_receivable'));
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
      grand_total: 90000,
      total_cost_hpp: 70000,
      gross_profit: 20000,
      payment_method: 'TUNAI',
      status: 'LUNAS',
    },
  ] as unknown as PosTransaction[];
  const doc = buildExportDoc('pos_sales_history', txs, ctx);
  it('totals terhitung', () => {
    expect(doc.sections[0].totals?.total).toBe(90000);
    expect(doc.sections[0].totals?.laba).toBe(20000);
  });
});

describe('registry financial statements', () => {
  const section = (lines: StatementLine[]) => ({ lines, total: lines.reduce((s, l) => s + l.amount, 0) });

  const statements: FinancialStatements = {
    period: { start_date: '2026-09-01', end_date: '2026-09-30' },
    income_statement: {
      revenue: section([
        { code: '4-1000', name: 'Pendapatan Penjualan Ban Baru', amount: 900000 },
        { code: '4-1001', name: 'Pendapatan Jasa Servis & Spooring', amount: 100000 },
      ]),
      contra_revenue: section([{ code: '4-9000', name: 'Potongan Diskon Penjualan', amount: 50000 }]),
      net_revenue: 950000,
      cost_of_sales: section([{ code: '5-1000', name: 'HPP Ban Baru', amount: 600000 }]),
      gross_profit: 350000,
      operating_expenses: section([{ code: '6-1000', name: 'Beban Gaji', amount: 100000 }]),
      net_income: 250000,
    },
    balance_sheet: {
      as_of: '2026-09-30',
      current_assets: section([{ code: '1-1000', name: 'Kas', amount: 850000 }]),
      fixed_assets: section([
        { code: '1-3000', name: 'Mesin', amount: 1000000 },
        { code: '1-3999', name: 'Akumulasi Penyusutan', amount: -200000 },
      ]),
      total_assets: 1650000,
      liabilities: section([{ code: '2-1000', name: 'Hutang Dagang', amount: 300000 }]),
      equity: section([
        { code: '3-1000', name: 'Modal', amount: 1100000 },
        { code: null, name: 'Laba (Rugi) Periode Berjalan (belum ditutup)', amount: 250000 },
      ]),
      total_liabilities_and_equity: 1650000,
      difference: 0,
      is_balanced: true,
    },
    equity_changes: { opening_equity: 1100000, owner_contributions: 0, owner_drawings: 0, net_income: 250000, closing_equity: 1350000, difference: 0 },
  };

  const cashFlow: CashFlowReport = {
    period: { start_date: '2026-09-01', end_date: '2026-09-30' },
    operating: { customers: 950000, suppliers: -500000, expenses: -100000, other: 0, net: 350000 },
    investing: { fixed_assets: 0, net: 0 },
    financing: { equity: 0, net: 0 },
    net_change: 350000,
    beginning_cash: 100000,
    ending_cash: 450000,
    ending_cash_drawer: 150000,
    ending_bank: 300000,
    is_reconciled: true,
  };

  const calk: CalkReport = {
    period: '2026-09', start_date: '2026-09-01', end_date: '2026-09-30',
    entity: { name: 'Omah Ban Cabang 3', address: 'Magelang, Jawa Tengah', activity: 'Perdagangan ban.', legal_form: 'UMKM perseorangan.', tax_status: 'non-PKP.', currency: 'Rupiah (Rp)' },
    compliance: 'Laporan keuangan disusun sesuai SAK EMKM.',
    policies: [
      { title: 'Persediaan', body: 'Metode FIFO.' },
      { title: 'Aset tetap dan penyusutan', body: 'Garis lurus.' },
    ],
    notes: {
      cash_and_bank: { lines: [{ code: '1-1000', name: 'Kas', amount: 150000 }, { code: '1-1001', name: 'Bank BCA', amount: 300000 }], total: 450000, bank_statement_balance: 300000, bank_reconciled: true },
      inventory: { ledger_balance: 700000, method: 'FIFO', breakdown: [{ category: 'Ban Baru', quantity: 2, value: 700000 }], breakdown_as_of: '2026-09-30' },
      prepaid_expenses: { balance: 1000000 },
      accrued_expenses: { balance: 300000 },
      fixed_assets: {
        assets: [{ code: 'AT-202609-0001', name: 'Mesin Spooring', category: 'Peralatan & Mesin Bengkel', acquisition_date: '2026-09-01', useful_life_months: 48, cost: 1000000, accumulated: 200000, book_value: 800000 }],
        total_cost: 1000000, total_accumulated: 200000, total_book_value: 800000, ledger_cost: 1000000, ledger_accumulated: 200000, depreciation_expense: 20833.33,
      },
      payables: { suppliers: [{ supplier_name: 'PT Ban Jaya', amount: 300000 }], subledger_total: 300000, other_adjustments: 0, ledger_balance: 300000 },
      equity: { lines: [{ code: '3-1000', name: 'Modal', amount: 1100000 }], total: 1100000 },
    },
  };

  it('calk memiliki 9 catatan dengan pernyataan kepatuhan dan kebijakan', () => {
    const doc = buildExportDoc('fin_calk', calk, ctx);
    expect(doc.sections).toHaveLength(9);
    expect(doc.sections[1].rows[0].uraian).toContain('SAK EMKM');
    expect(doc.sections[2].rows.map((r) => r.uraian)).toContain('Persediaan: Metode FIFO.');
    expect(doc.sections[6].rows[0].nilai_buku).toBe(800000);
    expect(doc.sections[6].totals?.nilai_buku).toBe(800000);
  });

  it('laba rugi memuat setiap akun dan potongan bernilai negatif', () => {
    const doc = buildExportDoc('fin_income_statement', statements, ctx);
    expect(doc.sections[0].rows.length).toBe(8);
    expect(doc.sections[0].rows.find((r) => String(r.label).startsWith('Potongan: 4-9000'))?.value).toBe(-50000);
  });

  it('neraca menampilkan akumulasi penyusutan negatif dan laba belum ditutup', () => {
    const rows = buildExportDoc('fin_balance_sheet', statements, ctx).sections[0].rows;
    expect(rows.find((r) => String(r.label).includes('1-3999'))?.value).toBe(-200000);
    expect(rows.find((r) => String(r.label).includes('belum ditutup'))?.value).toBe(250000);
  });

  it('arus kas memuat saldo akhir', () => {
    const rows = buildExportDoc('fin_cash_flow', cashFlow, ctx).sections[0].rows;
    expect(rows.find((r) => r.label === 'Saldo Kas & Bank Akhir')?.value).toBe(450000);
  });

  it('perubahan ekuitas menampilkan prive sebagai pengurang', () => {
    const withPrive = { ...statements, equity_changes: { ...statements.equity_changes, owner_drawings: 150000, closing_equity: 1200000 } };
    const rows = buildExportDoc('fin_equity_statement', withPrive, ctx).sections[0].rows;
    expect(rows.find((r) => r.label === 'Prive (pengambilan pemilik)')?.value).toBe(-150000);
  });

  it('sak emkm package memuat 4 laporan dan 9 catatan CALK', () => {
    const doc = buildExportDoc('sak_emkm_package', { financials: statements, cashFlow, calk }, ctx);
    expect(doc.sections.length).toBe(13);
    expect(doc.sections[4].title).toBe('CALK 1. INFORMASI UMUM');
  });
});

describe('registry bank_reconciliation', () => {
  const report: BankReconciliationReport = {
    period: '2026-09', start_date: '2026-09-01', end_date: '2026-09-30', cutover_date: '2026-09-01',
    statement_ending_balance: 1193500, book_balance: 1500000,
    lines: [],
    outstanding_ledger: [{ journal_item_id: 9, entry_number: 'JRN-202609-0009', entry_date: '2026-09-30', reference_type: 'POS_SALE', description: 'Transfer pelanggan', debit: 300000, credit: 0 }],
    unrecorded_bank: [{ id: 3, statement_date: '2026-09-30', description: 'BIAYA ADM', amount: -6500, source: 'CSV', journal_item_id: null, matched_entry_number: null, matched_reference_type: null, matched_entry_date: null }],
    deposits_in_transit: 300000, outstanding_payments: 0, unrecorded_credits: 0, unrecorded_debits: 6500,
    adjusted_bank_balance: 1493500, adjusted_book_balance: 1493500, difference: 0, is_reconciled: true,
  };
  const doc = buildExportDoc('bank_reconciliation', report, ctx);

  it('ringkasan memuat kedua saldo disesuaikan dan selisih nol', () => {
    const rows = doc.sections[0].rows;
    expect(rows.find((r) => r.label === 'SALDO BANK DISESUAIKAN')?.value).toBe(1493500);
    expect(rows.find((r) => r.label === 'SALDO BUKU DISESUAIKAN')?.value).toBe(1493500);
    expect(rows.find((r) => r.label === 'SELISIH')?.value).toBe(0);
  });

  it('merinci jurnal yang belum muncul di rekening koran dan mutasi yang belum dicatat', () => {
    expect(doc.sections).toHaveLength(3);
    expect(doc.sections[1].rows[0].no_jurnal).toBe('JRN-202609-0009');
    expect(doc.sections[2].rows[0].jumlah).toBe(-6500);
  });

  it('diekspor ke xlsx dan pdf', () => expect(REPORT_FORMATS.bank_reconciliation).toEqual(['xlsx', 'pdf']));
});
