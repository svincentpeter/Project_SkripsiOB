import type {
  CashFlowReport,
  FinancialStatements,
  JournalEntry,
  LedgerAccountSummary,
  PayableInvoice,
  PeriodClosingRecord,
  StatementSection,
  TrialBalanceResult,
} from '../types';
import type { ExpenseRecord, PosTransaction, ProductItem, ServiceMasterItem, StockMutation, StockOpnameItem, SupplierItem } from '../types';
import type { DailyCashReport, DailyCashSale, DailyRecap, DailyRecapTotals, DashboardSummary } from '../types';
import { cashMovementLabel } from '../../services/dailyReports';
import type { BankReconciliationReport, CalkReport } from '../types/sakEmkm';
import { EXPENSE_CATEGORY_CONFIG, formatDateIndo, formatRupiah } from '../utils/formatters';
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

const mapExpenses = (list: ExpenseRecord[], ctx: ExportCtx): ExportDoc => {
  const rows = list.map((e) => ({
    bkk: e.bkk_number || e.expense_number || e.reference,
    tanggal: e.date,
    kategori: e.category,
    kode_akun: e.category_code || EXPENSE_CATEGORY_CONFIG[e.category]?.account_code || '6-1005',
    nominal: e.amount,
    sumber: e.cash_source,
    penerima: e.paid_to,
    keterangan: e.description,
    otorisasi: e.approved_by,
    status: e.status === 'VOID' ? 'VOID' : 'ACTIVE',
    alasan_void: e.void_reason || '',
  }));
  return makeDoc('expenses', 'Rekap Pengeluaran Kas', 'landscape', ctx, [{
    columns: [
      { key: 'bkk', label: 'No BKK', type: 'text', width: 16 },
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'kategori', label: 'Kategori', type: 'text', width: 28 },
      { key: 'kode_akun', label: 'Kode Akun', type: 'text', width: 10 },
      { key: 'nominal', label: 'Nominal', type: 'currency' },
      { key: 'sumber', label: 'Sumber Dana', type: 'text', width: 22 },
      { key: 'penerima', label: 'Penerima', type: 'text', width: 20 },
      { key: 'keterangan', label: 'Keterangan', type: 'text', width: 36 },
      { key: 'otorisasi', label: 'Otorisasi', type: 'text', width: 16 },
      { key: 'status', label: 'Status', type: 'text', width: 9 },
      { key: 'alasan_void', label: 'Alasan Void', type: 'text', width: 24 },
    ],
    rows,
    totals: { nominal: sum(list.filter((e) => e.status !== 'VOID'), (e) => e.amount) },
  }]);
};

const stockOf = (p: ProductItem): number => p.product_quantity ?? p.stock ?? 0;
const costOf = (p: ProductItem): number => p.product_cost ?? p.cost_price ?? 0;
const priceOf = (p: ProductItem): number => p.product_price ?? p.price ?? 0;

const mapProducts = (list: ProductItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('inventory_products', 'Katalog Produk', 'landscape', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode Produk', type: 'text', width: 14 },
      { key: 'barcode', label: 'Barcode', type: 'text', width: 14 },
      { key: 'nama', label: 'Nama Produk', type: 'text', width: 36 },
      { key: 'kategori', label: 'Kategori', type: 'text', width: 12 },
      { key: 'merek', label: 'Merek', type: 'text', width: 14 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'stok', label: 'Stok', type: 'number' },
      { key: 'alert', label: 'Alert Stok', type: 'number' },
      { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
      { key: 'harga', label: 'Harga Jual (Rp)', type: 'currency' },
      { key: 'nilai', label: 'Nilai Persediaan (Rp)', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows: list.map((p) => ({
      kode: p.product_code,
      barcode: p.barcode,
      nama: p.product_name || p.name,
      kategori: p.category,
      merek: p.brand,
      ukuran: p.product_size ?? p.size ?? '',
      stok: stockOf(p),
      alert: p.product_stock_alert ?? p.min_stock ?? 0,
      hpp: costOf(p),
      harga: priceOf(p),
      nilai: stockOf(p) * costOf(p),
      status: p.is_active === false ? 'NONAKTIF' : 'AKTIF',
    })),
    totals: { stok: sum(list, stockOf), nilai: sum(list, (p) => stockOf(p) * costOf(p)) },
  }]);

const mapServices = (list: ServiceMasterItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('inventory_services', 'Master Jasa Bengkel', 'portrait', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode Jasa', type: 'text', width: 14 },
      { key: 'nama', label: 'Nama Jasa', type: 'text', width: 30 },
      { key: 'kategori', label: 'Kategori', type: 'text', width: 18 },
      { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
      { key: 'harga', label: 'Tarif (Rp)', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows: list.map((s) => ({ kode: s.service_code, nama: s.service_name, kategori: s.category, hpp: s.cost_price, harga: s.standard_price, status: s.is_active ? 'AKTIF' : 'NONAKTIF' })),
  }]);

const mapSuppliers = (list: SupplierItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('inventory_suppliers', 'Master Supplier', 'landscape', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode', type: 'text', width: 12 },
      { key: 'nama', label: 'Nama Distributor', type: 'text', width: 32 },
      { key: 'telp', label: 'Telepon', type: 'text', width: 16 },
      { key: 'email', label: 'Email', type: 'text', width: 24 },
      { key: 'alamat', label: 'Alamat', type: 'text', width: 36 },
      { key: 'pic', label: 'Kontak PIC', type: 'text', width: 18 },
      { key: 'termin', label: 'Termin (hari)', type: 'number' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows: list.map((s) => ({ kode: s.supplier_code, nama: s.supplier_name, telp: s.phone, email: s.email ?? '', alamat: s.address, pic: s.contact_person, termin: s.payment_terms_days, status: s.is_active ? 'AKTIF' : 'NONAKTIF' })),
  }]);

const mapMovements = (muts: StockMutation[], ctx: ExportCtx): ExportDoc =>
  makeDoc('stock_movements', 'Kartu Stok / Mutasi', 'landscape', ctx, [{
    columns: [
      { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'produk', label: 'Produk', type: 'text', width: 34 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'ref', label: 'No Ref', type: 'text', width: 18 },
      { key: 'tipe', label: 'Tipe', type: 'text', width: 12 },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'saldo', label: 'Saldo Berjalan', type: 'number' },
      { key: 'operator', label: 'Operator', type: 'text', width: 16 },
      { key: 'ket', label: 'Keterangan', type: 'text', width: 30 },
    ],
    rows: muts.map((m) => ({ tgl: m.date, produk: m.tire_name || m.product_name || '', ukuran: m.tire_size, ref: m.ref_doc, tipe: m.type, qty: m.qty, saldo: m.balance, operator: m.operator, ket: m.notes || m.description || '' })),
  }]);

const mapOpname = (items: StockOpnameItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('stock_opname', 'Hasil Stock Opname', 'landscape', ctx, [{
    columns: [
      { key: 'produk', label: 'Produk', type: 'text', width: 36 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'sistem', label: 'Stok Sistem', type: 'number' },
      { key: 'fisik', label: 'Stok Fisik', type: 'number' },
      { key: 'selisih', label: 'Selisih', type: 'number' },
      { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
      { key: 'nilai', label: 'Nilai Selisih (Rp)', type: 'currency' },
    ],
    rows: items.map((i) => ({ produk: i.tire_name, ukuran: i.product_size, sistem: i.system_stock, fisik: i.physical_stock, selisih: i.difference, hpp: i.cost_price, nilai: i.total_difference_val })),
    totals: { selisih: sum(items, (i) => i.difference), nilai: sum(items, (i) => i.total_difference_val) },
  }]);

const mapGoodsReceipts = (muts: StockMutation[], ctx: ExportCtx): ExportDoc => {
  const masuk = muts.filter((m) => m.type === 'MASUK');
  return makeDoc('goods_receipts', 'Riwayat Penerimaan Barang', 'landscape', ctx, [{
    columns: [
      { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'ref', label: 'No Ref/PO', type: 'text', width: 20 },
      { key: 'produk', label: 'Produk', type: 'text', width: 36 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'qty', label: 'Qty Masuk', type: 'number' },
      { key: 'operator', label: 'Operator', type: 'text', width: 16 },
      { key: 'ket', label: 'Keterangan', type: 'text', width: 32 },
    ],
    rows: masuk.map((m) => ({ tgl: m.date, ref: m.ref_doc, produk: m.tire_name || m.product_name || '', ukuran: m.tire_size, qty: m.qty, operator: m.operator, ket: m.notes || m.description || '' })),
    totals: { qty: sum(masuk, (m) => m.qty) },
  }]);
};

const mapPosHistory = (txs: PosTransaction[], ctx: ExportCtx): ExportDoc => {
  const rows = txs.map((t) => ({
    tanggal: t.date,
    nota: t.reference || t.invoice_number,
    kasir: t.cashier_name,
    pelanggan: t.customer_name || 'Umum',
    plat: t.vehicle_plate || '-',
    item: t.items.length,
    subtotal: t.subtotal,
    diskon: t.total_discount,
    total: t.total_amount ?? t.grand_total,
    hpp: t.total_hpp ?? t.total_cost_hpp ?? 0,
    laba: t.gross_profit ?? t.total_profit ?? 0,
    metode: t.payment_method,
    status: t.status,
  }));
  return makeDoc('pos_sales_history', 'Riwayat Penjualan POS', 'landscape', ctx, [{
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'nota', label: 'No Nota', type: 'text', width: 20 },
      { key: 'kasir', label: 'Kasir', type: 'text', width: 16 },
      { key: 'pelanggan', label: 'Pelanggan', type: 'text', width: 22 },
      { key: 'plat', label: 'No. Polisi', type: 'text', width: 14 },
      { key: 'item', label: 'Item', type: 'number', width: 8 },
      { key: 'subtotal', label: 'Subtotal', type: 'currency' },
      { key: 'diskon', label: 'Diskon', type: 'currency' },
      { key: 'total', label: 'Total', type: 'currency' },
      { key: 'hpp', label: 'HPP', type: 'currency' },
      { key: 'laba', label: 'Laba Kotor', type: 'currency' },
      { key: 'metode', label: 'Metode', type: 'text', width: 14 },
      { key: 'status', label: 'Status', type: 'text', width: 12 },
    ],
    rows,
    totals: {
      subtotal: sum(txs, (t) => t.subtotal),
      diskon: sum(txs, (t) => t.total_discount),
      total: sum(txs, (t) => t.total_amount ?? t.grand_total),
      hpp: sum(txs, (t) => t.total_hpp ?? t.total_cost_hpp ?? 0),
      laba: sum(txs, (t) => t.gross_profit ?? t.total_profit ?? 0),
    },
  }]);
};

export interface DashboardInput {
  summary: DashboardSummary;
  products: ProductItem[];
  /** Nilai persediaan FIFO dari server; null bila peran tidak boleh membacanya. */
  fifoValue: number | null;
}

const mapDashboard = (d: DashboardInput, ctx: ExportCtx): ExportDoc => {
  const { today, week, month } = d.summary;
  const tren = week.map((r) => ({ tgl: r.date, omzet: r.net_revenue, hpp: r.cost_of_sales, qty: r.product_qty }));
  const kritis = d.products
    .filter((p) => stockOf(p) <= (p.product_stock_alert ?? p.min_stock ?? 5))
    .slice(0, 20);
  return makeDoc('dashboard_summary', 'Ringkasan Dashboard', 'portrait', ctx, [
    {
      title: 'KPI Utama (jurnal server)',
      columns: [{ key: 'm', label: 'Metrik', type: 'text', width: 40 }, { key: 'v', label: 'Nilai (Rp)', type: 'currency' }],
      rows: [
        { m: 'Pendapatan Bersih Hari Ini', v: today.net_revenue },
        { m: 'Laba Kotor Hari Ini', v: today.gross_profit },
        { m: 'Pendapatan Bersih Bulan Berjalan', v: month.net_revenue },
        { m: 'HPP Bulan Berjalan', v: month.cost_of_sales },
        { m: 'Laba Kotor Bulan Berjalan', v: month.gross_profit },
        { m: 'Beban Operasional Bulan Berjalan', v: month.operating_expenses },
        { m: 'Laba Bersih Bulan Berjalan', v: month.net_income },
        { m: 'Nilai Persediaan FIFO', v: d.fifoValue },
      ],
    },
    {
      title: 'Tren 7 Hari',
      columns: [
        { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'omzet', label: 'Pendapatan Bersih (Rp)', type: 'currency' },
        { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
        { key: 'qty', label: 'Unit Ban', type: 'number' },
      ],
      rows: tren,
      totals: { omzet: sum(tren, (t) => t.omzet), hpp: sum(tren, (t) => t.hpp), qty: sum(tren, (t) => t.qty) },
    },
    {
      title: 'Peringatan Stok Kritis',
      columns: [
        { key: 'nama', label: 'Produk', type: 'text', width: 36 },
        { key: 'stok', label: 'Stok', type: 'number' },
        { key: 'alert', label: 'Batas Alert', type: 'number' },
      ],
      rows: kritis.map((p) => ({ nama: p.product_name || p.name, stok: stockOf(p), alert: p.product_stock_alert ?? p.min_stock ?? 5 })),
    },
  ]);
};

const RECAP_KEYS = ['sales_count', 'net_revenue', 'returns', 'cost_of_sales', 'gross_profit', 'operating_expenses', 'net_income', 'cash_in', 'cash_out'] as const;
const pickRecap = (r: DailyRecapTotals): Record<string, number> => Object.fromEntries(RECAP_KEYS.map((k) => [k, r[k]]));

const mapDailyRecap = (r: DailyRecap, ctx: ExportCtx): ExportDoc =>
  makeDoc('daily_recap', 'Rekap Harian', 'landscape', ctx, [{
    columns: [
      { key: 'date', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'sales_count', label: 'Nota', type: 'number', width: 8 },
      { key: 'net_revenue', label: 'Pendapatan Bersih', type: 'currency' },
      { key: 'returns', label: 'Retur', type: 'currency' },
      { key: 'cost_of_sales', label: 'HPP', type: 'currency' },
      { key: 'gross_profit', label: 'Laba Kotor', type: 'currency' },
      { key: 'operating_expenses', label: 'Beban', type: 'currency' },
      { key: 'net_income', label: 'Laba Bersih', type: 'currency' },
      { key: 'cash_in', label: 'Kas Masuk', type: 'currency' },
      { key: 'cash_out', label: 'Kas Keluar', type: 'currency' },
    ],
    rows: r.rows.map((row) => ({ date: row.date, ...pickRecap(row) })),
    totals: pickRecap(r.totals),
  }]);

const paymentsText = (payments: DailyCashSale['payments']): string =>
  payments.map((p) => `${p.method} ${formatRupiah(p.amount)}`).join(', ');

const mapDailyCash = (r: DailyCashReport, ctx: ExportCtx): ExportDoc => {
  const live = r.sales.filter((s) => s.status !== 'VOID');
  // HPP nota hanya dikirim untuk lingkup toko; lingkup kasir menerima null, jadi kolomnya tidak dicetak.
  const showHpp = r.scope === 'all';
  const sections: ExportSection[] = [
    {
      title: 'Penerimaan per Kasir',
      columns: [
        { key: 'kasir', label: 'Kasir', type: 'text', width: 22 },
        { key: 'nota', label: 'Nota', type: 'number', width: 8 },
        { key: 'tunai', label: 'Tunai', type: 'currency' },
        { key: 'transfer', label: 'Transfer', type: 'currency' },
        { key: 'qris', label: 'QRIS', type: 'currency' },
        { key: 'total', label: 'Total Nota', type: 'currency' },
        { key: 'void', label: 'Nota VOID', type: 'currency' },
      ],
      rows: r.cashiers.map((c) => ({
        kasir: c.cashier_name, nota: c.sales_count, tunai: c.by_method.TUNAI, transfer: c.by_method.TRANSFER,
        qris: c.by_method.QRIS, total: c.sales_total, void: c.void_total,
      })),
      totals: { nota: sum(r.cashiers, (c) => c.sales_count), total: sum(r.cashiers, (c) => c.sales_total), void: sum(r.cashiers, (c) => c.void_total) },
    },
    {
      title: 'Daftar Nota',
      columns: [
        { key: 'jam', label: 'Jam', type: 'text', width: 8 },
        { key: 'nota', label: 'No Nota', type: 'text', width: 22 },
        { key: 'kasir', label: 'Kasir', type: 'text', width: 16 },
        { key: 'pelanggan', label: 'Pelanggan', type: 'text', width: 20 },
        { key: 'bayar', label: 'Pembayaran', type: 'text', width: 30 },
        { key: 'total', label: 'Total', type: 'currency' },
        ...(showHpp ? [{ key: 'hpp', label: 'HPP', type: 'currency' as const }] : []),
        { key: 'status', label: 'Status', type: 'text', width: 10 },
      ],
      rows: r.sales.map((s) => ({
        jam: s.time ?? '-', nota: s.reference, kasir: s.cashier_name, pelanggan: s.customer_name ?? 'Umum',
        bayar: paymentsText(s.payments), total: s.total_amount, ...(showHpp ? { hpp: s.total_hpp } : {}), status: s.status,
      })),
      totals: { total: sum(live, (s) => s.total_amount) },
    },
  ];
  if (r.cash_accounts) {
    sections.push({
      title: 'Saldo Kas & Bank',
      columns: [
        { key: 'akun', label: 'Akun', type: 'text', width: 30 },
        { key: 'awal', label: 'Saldo Awal', type: 'currency' },
        { key: 'masuk', label: 'Masuk', type: 'currency' },
        { key: 'keluar', label: 'Keluar', type: 'currency' },
        { key: 'akhir', label: 'Saldo Akhir', type: 'currency' },
      ],
      rows: r.cash_accounts.map((a) => ({ akun: `${a.code} ${a.name}`, awal: a.opening, masuk: a.cash_in, keluar: a.cash_out, akhir: a.closing })),
    });
  }
  if (r.cash_movements) {
    sections.push({
      title: 'Mutasi Kas per Jenis Transaksi',
      columns: [
        { key: 'jenis', label: 'Jenis', type: 'text', width: 34 },
        { key: 'masuk', label: 'Masuk', type: 'currency' },
        { key: 'keluar', label: 'Keluar', type: 'currency' },
      ],
      rows: r.cash_movements.map((m) => ({ jenis: cashMovementLabel(m.reference_type), masuk: m.cash_in, keluar: m.cash_out })),
      totals: { masuk: sum(r.cash_movements, (m) => m.cash_in), keluar: sum(r.cash_movements, (m) => m.cash_out) },
    });
  }
  if (r.expenses) {
    sections.push({
      title: 'Biaya Hari Ini',
      columns: [
        { key: 'ref', label: 'No BKK', type: 'text', width: 20 },
        { key: 'kategori', label: 'Kategori', type: 'text', width: 20 },
        { key: 'keterangan', label: 'Keterangan', type: 'text', width: 30 },
        { key: 'jumlah', label: 'Jumlah', type: 'currency' },
      ],
      rows: r.expenses.map((e) => ({ ref: e.reference, kategori: e.category ?? '-', keterangan: e.description, jumlah: e.amount })),
      totals: { jumlah: sum(r.expenses, (e) => e.amount) },
    });
  }
  sections.push({
    title: 'Sesi Kasir',
    columns: [
      { key: 'kasir', label: 'Kasir', type: 'text', width: 18 },
      { key: 'buka', label: 'Buka', type: 'text', width: 18 },
      { key: 'tutup', label: 'Tutup', type: 'text', width: 18 },
      { key: 'modal', label: 'Modal Awal', type: 'currency' },
      { key: 'seharusnya', label: 'Kas Seharusnya', type: 'currency' },
      { key: 'dihitung', label: 'Kas Dihitung', type: 'currency' },
      { key: 'selisih', label: 'Selisih', type: 'currency' },
      { key: 'alasan', label: 'Alasan Selisih', type: 'text', width: 24 },
      { key: 'status', label: 'Status', type: 'text', width: 16 },
    ],
    rows: r.cash_sessions.map((s) => ({
      kasir: s.user_name ?? '-', buka: s.opened_at ?? '-', tutup: s.closed_at ?? '-', modal: s.opening_float,
      seharusnya: s.expected_cash, dihitung: s.counted_cash, selisih: s.variance, alasan: s.variance_reason ?? '-', status: s.status,
    })),
  });
  return makeDoc('daily_cash', 'Laporan Kas Harian', 'landscape', ctx, sections);
};

type LabelValue = { label: string; value: number | null };
const lvSection = (title: string, rows: LabelValue[]): ExportSection => ({
  title,
  columns: [
    { key: 'label', label: 'Komponen Akuntansi', type: 'text', width: 48 },
    { key: 'value', label: 'Nominal (Rp)', type: 'currency' },
  ],
  rows: rows.map((r) => ({ label: r.label, value: r.value })),
});

const sectionRows = (prefix: string, section: StatementSection, sign = 1) =>
  section.lines.map((l) => ({ label: `${prefix}${l.code ? `${l.code} ` : ''}${l.name}`, value: sign * l.amount }));

const incomeSection = (fs: FinancialStatements): ExportSection => {
  const is = fs.income_statement;
  return lvSection('1. LAPORAN LABA RUGI', [
    ...sectionRows('Pendapatan: ', is.revenue),
    ...sectionRows('Potongan: ', is.contra_revenue, -1),
    { label: 'PENDAPATAN BERSIH', value: is.net_revenue },
    ...sectionRows('Beban Pokok: ', is.cost_of_sales, -1),
    { label: 'LABA KOTOR', value: is.gross_profit },
    ...sectionRows('Beban Operasional: ', is.operating_expenses, -1),
    { label: 'LABA (RUGI) BERSIH', value: is.net_income },
  ]);
};

const balanceSection = (fs: FinancialStatements): ExportSection => {
  const bs = fs.balance_sheet;
  return lvSection('2. LAPORAN POSISI KEUANGAN', [
    ...sectionRows('Aset Lancar: ', bs.current_assets),
    { label: 'JUMLAH ASET LANCAR', value: bs.current_assets.total },
    ...sectionRows('Aset Tetap: ', bs.fixed_assets),
    { label: 'JUMLAH ASET TETAP', value: bs.fixed_assets.total },
    { label: 'TOTAL ASET', value: bs.total_assets },
    ...sectionRows('Liabilitas: ', bs.liabilities),
    { label: 'JUMLAH LIABILITAS', value: bs.liabilities.total },
    ...sectionRows('Ekuitas: ', bs.equity),
    { label: 'JUMLAH EKUITAS', value: bs.equity.total },
    { label: 'TOTAL LIABILITAS & EKUITAS', value: bs.total_liabilities_and_equity },
  ]);
};

const equitySection = (fs: FinancialStatements): ExportSection =>
  lvSection('3. LAPORAN PERUBAHAN EKUITAS', [
    { label: 'Ekuitas awal periode', value: fs.equity_changes.opening_equity },
    { label: 'Setoran modal & saldo awal', value: fs.equity_changes.owner_contributions },
    { label: 'Prive (pengambilan pemilik)', value: -fs.equity_changes.owner_drawings },
    { label: 'Laba (rugi) bersih periode', value: fs.equity_changes.net_income },
    { label: 'EKUITAS AKHIR PERIODE', value: fs.equity_changes.closing_equity },
  ]);

const cashFlowSection = (cf: CashFlowReport): ExportSection =>
  lvSection('4. LAPORAN ARUS KAS (METODE LANGSUNG)', [
    { label: 'Penerimaan dari pelanggan', value: cf.operating.customers },
    { label: 'Pembayaran ke pemasok & persediaan', value: cf.operating.suppliers },
    { label: 'Pembayaran beban operasional', value: cf.operating.expenses },
    { label: 'Arus kas operasi lainnya', value: cf.operating.other },
    { label: 'ARUS KAS BERSIH AKTIVITAS OPERASI', value: cf.operating.net },
    { label: 'Perolehan / pelepasan aset tetap', value: cf.investing.fixed_assets },
    { label: 'ARUS KAS BERSIH AKTIVITAS INVESTASI', value: cf.investing.net },
    { label: 'Setoran / (penarikan) modal pemilik', value: cf.financing.equity },
    { label: 'ARUS KAS BERSIH AKTIVITAS PENDANAAN', value: cf.financing.net },
    { label: 'KENAIKAN (PENURUNAN) KAS BERSIH', value: cf.net_change },
    { label: 'Saldo Kas & Bank Awal', value: cf.beginning_cash },
    { label: 'Saldo Kas & Bank Akhir', value: cf.ending_cash },
    { label: 'Rincian: Kas Laci Akhir', value: cf.ending_cash_drawer },
    { label: 'Rincian: Bank BCA Akhir', value: cf.ending_bank },
  ]);

const textSection = (title: string, lines: string[]): ExportSection => ({
  title,
  columns: [{ key: 'uraian', label: 'Uraian', type: 'text', width: 110 }],
  rows: lines.map((uraian) => ({ uraian })),
});

/** CALK SAK EMKM dari server (GET /reports/calk): 9 catatan, sama dengan tab CALK di layar. */
const calkSections = (c: CalkReport): ExportSection[] => {
  const n = c.notes;
  const fa = n.fixed_assets;
  return [
    textSection('CALK 1. INFORMASI UMUM', [
      `Nama entitas: ${c.entity.name}, ${c.entity.address}.`,
      `Kegiatan usaha: ${c.entity.activity}`,
      `Bentuk usaha: ${c.entity.legal_form}`,
      `Status pajak: ${c.entity.tax_status}`,
      `Mata uang pelaporan: ${c.entity.currency}. Periode catatan: ${formatDateIndo(c.start_date)} s/d ${formatDateIndo(c.end_date)}.`,
    ]),
    textSection('CALK 2. PERNYATAAN KEPATUHAN', [c.compliance]),
    textSection('CALK 3. IKHTISAR KEBIJAKAN AKUNTANSI', c.policies.map((p) => `${p.title}: ${p.body}`)),
    lvSection('CALK 4. KAS DAN BANK', [
      ...n.cash_and_bank.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })),
      { label: 'JUMLAH KAS DAN BANK', value: n.cash_and_bank.total },
      n.cash_and_bank.bank_statement_balance !== null
        ? { label: `Saldo rekening koran bank (${n.cash_and_bank.bank_reconciled ? 'terekonsiliasi' : 'belum terekonsiliasi'})`, value: n.cash_and_bank.bank_statement_balance }
        : { label: 'Saldo rekening koran bulan ini belum diisi pada menu Rekonsiliasi Bank.', value: null },
    ]),
    lvSection('CALK 5. PERSEDIAAN (FIFO)', [
      { label: 'Persediaan ban (1-2000) per akhir periode', value: n.inventory.ledger_balance },
      ...n.inventory.breakdown.map((b) => ({ label: `Nilai FIFO ${b.category} (${b.quantity} unit, per ${formatDateIndo(n.inventory.breakdown_as_of ?? '')})`, value: b.value })),
    ]),
    lvSection('CALK 6. BEBAN DIBAYAR DI MUKA DAN BEBAN YANG MASIH HARUS DIBAYAR', [
      { label: 'Beban dibayar di muka (1-1100)', value: n.prepaid_expenses.balance },
      { label: 'Beban yang masih harus dibayar (2-1100)', value: n.accrued_expenses.balance },
    ]),
    {
      title: 'CALK 7. ASET TETAP (GARIS LURUS)',
      columns: [
        { key: 'kode', label: 'Kode', type: 'text', width: 16 },
        { key: 'nama', label: 'Nama Aset', type: 'text', width: 28 },
        { key: 'kategori', label: 'Kategori', type: 'text', width: 22 },
        { key: 'tanggal', label: 'Perolehan', type: 'date', width: 12 },
        { key: 'umur', label: 'Umur (bln)', type: 'number', width: 9 },
        { key: 'perolehan', label: 'Harga Perolehan', type: 'currency' },
        { key: 'akumulasi', label: 'Akumulasi Penyusutan', type: 'currency' },
        { key: 'nilai_buku', label: 'Nilai Buku', type: 'currency' },
      ],
      rows: fa.assets.map((a) => ({
        kode: a.code, nama: a.name, kategori: a.category, tanggal: a.acquisition_date, umur: a.useful_life_months,
        perolehan: a.cost, akumulasi: a.accumulated, nilai_buku: a.book_value,
      })),
      totals: { perolehan: fa.total_cost, akumulasi: fa.total_accumulated, nilai_buku: fa.total_book_value },
    },
    // Lanjutan CALK 7 tanpa judul (writer melewati judul kosong): register dicocokkan dengan buku besar, seperti di layar.
    lvSection('', [
      { label: 'Beban penyusutan bulan ini', value: fa.depreciation_expense },
      { label: 'Saldo buku besar Aset Tetap (1-3000)', value: fa.ledger_cost },
      { label: 'Saldo buku besar Akumulasi Penyusutan (1-3999)', value: fa.ledger_accumulated },
    ]),
    lvSection('CALK 8. UTANG USAHA', [
      ...n.payables.suppliers.map((s) => ({ label: s.supplier_name, value: s.amount })),
      ...(n.payables.other_adjustments !== 0 ? [{ label: 'Penyesuaian lain (selisih historis)', value: n.payables.other_adjustments }] : []),
      { label: 'JUMLAH UTANG USAHA (2-1000)', value: n.payables.ledger_balance },
    ]),
    lvSection('CALK 9. EKUITAS', [
      ...n.equity.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })),
      { label: 'JUMLAH EKUITAS', value: n.equity.total },
    ]),
  ];
};

const mapIncome = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_income_statement', 'Laporan Laba Rugi', 'portrait', ctx, [incomeSection(fs)]);

const mapBalance = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_balance_sheet', 'Laporan Posisi Keuangan', 'portrait', ctx, [balanceSection(fs)]);

const mapEquity = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_equity_statement', 'Laporan Perubahan Ekuitas', 'portrait', ctx, [equitySection(fs)]);

const mapCashFlow = (cf: CashFlowReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_cash_flow', 'Laporan Arus Kas', 'portrait', ctx, [cashFlowSection(cf)]);

const mapCalk = (c: CalkReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_calk', 'Catatan atas Laporan Keuangan', 'portrait', ctx, calkSections(c));

export interface SakEmkmPackageInput {
  financials: FinancialStatements;
  cashFlow: CashFlowReport;
  calk: CalkReport;
}

const mapSakPackage = (d: SakEmkmPackageInput, ctx: ExportCtx): ExportDoc =>
  makeDoc('sak_emkm_package', 'Paket Laporan Keuangan SAK EMKM', 'portrait', ctx, [
    incomeSection(d.financials),
    balanceSection(d.financials),
    equitySection(d.financials),
    cashFlowSection(d.cashFlow),
    ...calkSections(d.calk),
  ]);

const mapPeriodClosing = (p: PeriodClosingRecord, ctx: ExportCtx): ExportDoc =>
  makeDoc('period_closing', 'Penutupan Periode Akuntansi', 'portrait', ctx, [{
    columns: [
      { key: 'label', label: 'Keterangan', type: 'text', width: 34 },
      { key: 'value', label: 'Nilai', type: 'text', width: 26 },
    ],
    rows: [
      { label: 'Periode', value: p.period },
      { label: 'Tanggal Kunci (akhir periode)', value: p.end_date },
      { label: 'Ditutup Pada', value: p.closed_at ?? '-' },
      { label: 'Ditutup Oleh', value: p.closed_by ?? '-' },
      { label: 'No Jurnal Penutup', value: p.closing_entry_number ?? '-' },
      { label: 'Laba Dipindahkan ke Laba Ditahan', value: formatRupiah(p.net_income) },
      { label: 'Catatan', value: p.notes ?? '-' },
      { label: 'Dibuka Kembali', value: p.reopened_at ? `${p.reopened_at} (${p.reopen_reason ?? '-'})` : '-' },
    ],
  }]);

const mapBankReconciliation = (r: BankReconciliationReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('bank_reconciliation', 'Rekonsiliasi Bank BCA (1-1001)', 'portrait', ctx, [
    lvSection('Ringkasan Rekonsiliasi', [
      { label: 'Saldo menurut rekening koran', value: r.statement_ending_balance ?? 0 },
      { label: 'Ditambah: setoran dalam perjalanan', value: r.deposits_in_transit },
      { label: 'Dikurangi: pembayaran belum dikliring bank', value: -r.outstanding_payments },
      { label: 'SALDO BANK DISESUAIKAN', value: r.adjusted_bank_balance ?? 0 },
      { label: 'Saldo menurut buku besar (1-1001)', value: r.book_balance },
      { label: 'Ditambah: penerimaan bank belum dicatat (bunga, dll.)', value: r.unrecorded_credits },
      { label: 'Dikurangi: pengeluaran bank belum dicatat (biaya admin, dll.)', value: -r.unrecorded_debits },
      { label: 'SALDO BUKU DISESUAIKAN', value: r.adjusted_book_balance },
      { label: 'SELISIH', value: r.difference ?? 0 },
    ]),
    {
      title: 'Jurnal bank yang belum muncul di rekening koran',
      columns: [
        { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'no_jurnal', label: 'No Jurnal', type: 'text', width: 16 },
        { key: 'keterangan', label: 'Keterangan', type: 'text', width: 40 },
        { key: 'masuk', label: 'Masuk (Dr)', type: 'currency' },
        { key: 'keluar', label: 'Keluar (Cr)', type: 'currency' },
      ],
      rows: r.outstanding_ledger.map((i) => ({ tanggal: i.entry_date, no_jurnal: i.entry_number, keterangan: i.description, masuk: i.debit, keluar: i.credit })),
      totals: { masuk: r.deposits_in_transit, keluar: r.outstanding_payments },
    },
    {
      title: 'Mutasi rekening koran yang belum dicatat di buku',
      columns: [
        { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'keterangan', label: 'Keterangan', type: 'text', width: 48 },
        { key: 'jumlah', label: 'Jumlah', type: 'currency' },
      ],
      rows: r.unrecorded_bank.map((l) => ({ tanggal: l.statement_date, keterangan: l.description, jumlah: l.amount })),
    },
  ]);

export const REPORT_MAPPERS = {
  journal: mapJournal,
  general_ledger: mapGeneralLedger,
  trial_balance: mapTrialBalance,
  accounts_payable: mapPayable,
  expenses: mapExpenses,
  inventory_products: mapProducts,
  inventory_services: mapServices,
  inventory_suppliers: mapSuppliers,
  stock_movements: mapMovements,
  stock_opname: mapOpname,
  goods_receipts: mapGoodsReceipts,
  pos_sales_history: mapPosHistory,
  dashboard_summary: mapDashboard,
  daily_cash: mapDailyCash,
  daily_recap: mapDailyRecap,
  fin_income_statement: mapIncome,
  fin_equity_statement: mapEquity,
  fin_balance_sheet: mapBalance,
  fin_cash_flow: mapCashFlow,
  fin_calk: mapCalk,
  sak_emkm_package: mapSakPackage,
  period_closing: mapPeriodClosing,
  bank_reconciliation: mapBankReconciliation,
} as const;

export type ReportId = keyof typeof REPORT_MAPPERS;
export type ReportData<K extends ReportId> = Parameters<(typeof REPORT_MAPPERS)[K]>[0];

export const REPORT_FORMATS: Record<ReportId, ExportFormat[]> = {
  dashboard_summary: ['xlsx', 'pdf'],
  daily_cash: ['xlsx', 'pdf'],
  daily_recap: ['xlsx', 'pdf', 'csv'],
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
  accounts_payable: ['xlsx', 'pdf', 'csv'],
  fin_income_statement: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_equity_statement: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_balance_sheet: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_cash_flow: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_calk: ['pdf', 'docx'],
  sak_emkm_package: ['xlsx', 'pdf', 'docx', 'csv'],
  period_closing: ['xlsx', 'pdf'],
  bank_reconciliation: ['xlsx', 'pdf'],
};

export const buildExportDoc = <K extends ReportId>(id: K, data: ReportData<K>, ctx: ExportCtx): ExportDoc =>
  (REPORT_MAPPERS[id] as (d: ReportData<K>, c: ExportCtx) => ExportDoc)(data, ctx);
