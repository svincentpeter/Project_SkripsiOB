import type {
  JournalEntry,
  LedgerAccountSummary,
  PayableInvoice,
  ReceivableInvoice,
  TrialBalanceResult,
} from '../types';
import { buildKop } from './kop';
import type { ExportCtx, ExportDoc, ExportFormat, ExportSection } from './types';

const sum = <T>(rows: T[], get: (r: T) => number): number => rows.reduce((a, r) => a + get(r), 0);

export const makeDoc = (
  reportId: string,
  title: string,
  orientation: 'portrait' | 'landscape',
  ctx: ExportCtx,
  sections: ExportSection[],
): ExportDoc => ({ reportId, title, orientation, kop: buildKop(title, ctx.periodLabel), sections });

const mapJournal = (journals: JournalEntry[], ctx: ExportCtx): ExportDoc => {
  const rows = journals.flatMap((j) => j.lines.map((l) => ({
    tanggal: j.date,
    no_jurnal: j.journal_number,
    no_ref: j.ref_doc,
    kode_akun: l.account_code,
    nama_akun: l.account_name,
    keterangan: j.description,
    debit: l.debit,
    kredit: l.credit,
    status: j.status,
  })));
  return makeDoc('journal', 'Jurnal Umum', 'landscape', ctx, [{
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'no_jurnal', label: 'No Jurnal', type: 'text', width: 16 },
      { key: 'no_ref', label: 'No Ref', type: 'text', width: 18 },
      { key: 'kode_akun', label: 'Kode Akun', type: 'text', width: 10 },
      { key: 'nama_akun', label: 'Nama Akun', type: 'text', width: 34 },
      { key: 'keterangan', label: 'Keterangan', type: 'text', width: 44 },
      { key: 'debit', label: 'Debit', type: 'currency' },
      { key: 'kredit', label: 'Kredit', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows,
    totals: { debit: sum(rows, (r) => r.debit), kredit: sum(rows, (r) => r.kredit) },
  }]);
};

const mapGeneralLedger = (g: LedgerAccountSummary, ctx: ExportCtx): ExportDoc =>
  makeDoc('general_ledger', `Buku Besar ${g.account_code} ${g.account_name}`, 'landscape', ctx, [{
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'no_jurnal', label: 'No Jurnal', type: 'text', width: 16 },
      { key: 'no_ref', label: 'No Ref', type: 'text', width: 18 },
      { key: 'keterangan', label: 'Keterangan', type: 'text', width: 52 },
      { key: 'debit', label: 'Debit', type: 'currency' },
      { key: 'kredit', label: 'Kredit', type: 'currency' },
      { key: 'saldo', label: 'Saldo Berjalan', type: 'currency' },
    ],
    rows: g.transactions.map((t) => ({
      tanggal: t.date,
      no_jurnal: t.journal_number,
      no_ref: t.ref_doc,
      keterangan: t.description,
      debit: t.debit,
      kredit: t.credit,
      saldo: t.running_balance,
    })),
    totals: { debit: g.total_debit, kredit: g.total_credit, saldo: g.ending_balance },
  }]);

const mapTrialBalance = (tb: TrialBalanceResult, ctx: ExportCtx): ExportDoc =>
  makeDoc('trial_balance', 'Neraca Saldo', 'portrait', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode Akun', type: 'text', width: 12 },
      { key: 'nama', label: 'Nama Rekening', type: 'text', width: 44 },
      { key: 'klas', label: 'Klasifikasi', type: 'text', width: 18 },
      { key: 'debit', label: 'Saldo Debit (Dr)', type: 'currency' },
      { key: 'kredit', label: 'Saldo Kredit (Cr)', type: 'currency' },
    ],
    rows: tb.rows.map((r) => ({ kode: r.account_code, nama: r.account_name, klas: r.account_type, debit: r.debit_balance, kredit: r.credit_balance })),
    totals: { debit: tb.total_debit, kredit: tb.total_credit },
  }]);

const mapReceivable = (invoices: ReceivableInvoice[], ctx: ExportCtx): ExportDoc =>
  makeDoc('accounts_receivable', 'Buku Pembantu Piutang', 'landscape', ctx, [{
    columns: [
      { key: 'faktur', label: 'No. Faktur', type: 'text', width: 18 },
      { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'jt', label: 'Jatuh Tempo', type: 'date', width: 12 },
      { key: 'cust', label: 'Nama Pelanggan', type: 'text', width: 26 },
      { key: 'plat', label: 'No. Polisi', type: 'text', width: 12 },
      { key: 'total', label: 'Total Faktur', type: 'currency' },
      { key: 'bayar', label: 'Terbayar', type: 'currency' },
      { key: 'sisa', label: 'Sisa Piutang', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 14 },
    ],
    rows: invoices.map((i) => ({ faktur: i.invoice_number, tgl: i.date, jt: i.due_date, cust: i.customer_name, plat: i.vehicle_plate || '-', total: i.total_amount, bayar: i.paid_amount, sisa: i.remaining_amount, status: i.status })),
    totals: { total: sum(invoices, (i) => i.total_amount), bayar: sum(invoices, (i) => i.paid_amount), sisa: sum(invoices, (i) => i.remaining_amount) },
  }]);

const mapPayable = (invoices: PayableInvoice[], ctx: ExportCtx): ExportDoc =>
  makeDoc('accounts_payable', 'Buku Pembantu Hutang', 'landscape', ctx, [{
    columns: [
      { key: 'faktur', label: 'No Faktur', type: 'text', width: 18 },
      { key: 'dist', label: 'Distributor', type: 'text', width: 30 },
      { key: 'tgl', label: 'Tanggal Faktur', type: 'date', width: 12 },
      { key: 'jt', label: 'Jatuh Tempo', type: 'date', width: 12 },
      { key: 'total', label: 'Total Tagihan', type: 'currency' },
      { key: 'bayar', label: 'Sudah Dibayar', type: 'currency' },
      { key: 'sisa', label: 'Sisa Hutang', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 14 },
      { key: 'cat', label: 'Catatan', type: 'text', width: 24 },
    ],
    rows: invoices.map((i) => ({ faktur: i.invoice_number, dist: i.supplier_name, tgl: i.date, jt: i.due_date, total: i.total_amount, bayar: i.paid_amount, sisa: i.remaining_amount, status: i.status, cat: i.notes || '' })),
    totals: { total: sum(invoices, (i) => i.total_amount), bayar: sum(invoices, (i) => i.paid_amount), sisa: sum(invoices, (i) => i.remaining_amount) },
  }]);

type MapperNotYet = (data: never, ctx: ExportCtx) => ExportDoc;
const notYet = (id: string): MapperNotYet =>
  (() => {
    throw new Error(`Mapper ${id} belum dipasang`);
  }) as MapperNotYet;

export const REPORT_MAPPERS = {
  journal: mapJournal,
  general_ledger: mapGeneralLedger,
  trial_balance: mapTrialBalance,
  accounts_receivable: mapReceivable,
  accounts_payable: mapPayable,
  expenses: notYet('expenses'),
  inventory_products: notYet('inventory_products'),
  inventory_services: notYet('inventory_services'),
  inventory_suppliers: notYet('inventory_suppliers'),
  stock_movements: notYet('stock_movements'),
  stock_opname: notYet('stock_opname'),
  goods_receipts: notYet('goods_receipts'),
  pos_sales_history: notYet('pos_sales_history'),
  dashboard_summary: notYet('dashboard_summary'),
  fin_income_statement: notYet('fin_income_statement'),
  fin_equity_statement: notYet('fin_equity_statement'),
  fin_balance_sheet: notYet('fin_balance_sheet'),
  fin_cash_flow: notYet('fin_cash_flow'),
  fin_calk: notYet('fin_calk'),
  sak_emkm_package: notYet('sak_emkm_package'),
  period_closing: notYet('period_closing'),
} as const;

export type ReportId = keyof typeof REPORT_MAPPERS;
export type ReportData<K extends ReportId> = Parameters<(typeof REPORT_MAPPERS)[K]>[0];

export const REPORT_FORMATS: Record<ReportId, ExportFormat[]> = {
  dashboard_summary: ['xlsx', 'pdf'],
  pos_sales_history: ['xlsx', 'pdf', 'csv'],
  inventory_products: ['xlsx', 'pdf', 'csv'],
  inventory_services: ['xlsx', 'pdf', 'csv'],
  inventory_suppliers: ['xlsx', 'pdf', 'csv'],
  stock_movements: ['xlsx', 'pdf', 'csv'],
  stock_opname: ['xlsx', 'pdf', 'csv'],
  goods_receipts: ['xlsx', 'pdf', 'csv'],
  expenses: ['xlsx', 'pdf', 'docx', 'csv'],
  journal: ['xlsx', 'pdf', 'csv'],
  general_ledger: ['xlsx', 'pdf', 'csv'],
  trial_balance: ['xlsx', 'pdf', 'docx', 'csv'],
  accounts_receivable: ['xlsx', 'pdf', 'csv'],
  accounts_payable: ['xlsx', 'pdf', 'csv'],
  fin_income_statement: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_equity_statement: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_balance_sheet: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_cash_flow: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_calk: ['pdf', 'docx'],
  sak_emkm_package: ['xlsx', 'pdf', 'docx', 'csv'],
  period_closing: ['xlsx', 'pdf'],
};

export const buildExportDoc = <K extends ReportId>(id: K, data: ReportData<K>, ctx: ExportCtx): ExportDoc =>
  (REPORT_MAPPERS[id] as (d: ReportData<K>, c: ExportCtx) => ExportDoc)(data, ctx);
