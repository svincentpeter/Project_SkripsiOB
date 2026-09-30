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
import { EXPENSE_CATEGORY_CONFIG, formatRupiah } from '../utils/formatters';
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
  transactions: PosTransaction[];
  products: ProductItem[];
  expenses: ExpenseRecord[];
}

const mapDashboard = (d: DashboardInput, ctx: ExportCtx): ExportDoc => {
  const lunas = d.transactions.filter((t) => t.status !== 'VOID');
  const omzet = (t: PosTransaction) => t.total_amount ?? t.grand_total;
  const hppOf = (t: PosTransaction) => t.total_hpp ?? t.total_cost_hpp ?? 0;
  const totalOmzet = sum(lunas, omzet);
  const totalHpp = sum(lunas, hppOf);
  const banTerjual = sum(lunas, (t) => sum(t.items, (i) => i.qty));
  const ymd = (dt: Date) => dt.toISOString().split('T')[0];
  const tren = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const key = ymd(day);
    const dayTx = lunas.filter((t) => t.date === key);
    return { tgl: key, omzet: sum(dayTx, omzet), hpp: sum(dayTx, hppOf), qty: sum(dayTx, (t) => sum(t.items, (item) => item.qty)) };
  });
  const brandMap = new Map<string, number>();
  lunas.forEach((t) => t.items.forEach((i) => {
    const b = i.product?.brand || 'Lainnya';
    brandMap.set(b, (brandMap.get(b) ?? 0) + i.qty);
  }));
  const topProduk = [...brandMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const kritis = d.products
    .filter((p) => stockOf(p) <= (p.product_stock_alert ?? p.min_stock ?? 5))
    .slice(0, 20);
  return makeDoc('dashboard_summary', 'Ringkasan Dashboard', 'portrait', ctx, [
    {
      title: 'KPI Utama',
      columns: [{ key: 'm', label: 'Metrik', type: 'text', width: 34 }, { key: 'v', label: 'Nilai', type: 'text', width: 22 }],
      rows: [
        { m: 'Total Penjualan (non-VOID)', v: String(totalOmzet) },
        { m: 'Total HPP FIFO', v: String(totalHpp) },
        { m: 'Laba Kotor', v: String(totalOmzet - totalHpp) },
        { m: 'Total Pengeluaran Kas', v: String(sum(d.expenses.filter((e) => e.status !== 'VOID'), (e) => e.amount)) },
        { m: 'Unit Terjual', v: String(banTerjual) },
        { m: 'Nilai Persediaan (HPP)', v: String(sum(d.products, (p) => stockOf(p) * costOf(p))) },
      ],
    },
    {
      title: 'Tren 7 Hari',
      columns: [
        { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'omzet', label: 'Omzet (Rp)', type: 'currency' },
        { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
        { key: 'qty', label: 'Unit', type: 'number' },
      ],
      rows: tren,
      totals: { omzet: sum(tren, (t) => t.omzet), hpp: sum(tren, (t) => t.hpp), qty: sum(tren, (t) => t.qty) },
    },
    {
      title: 'Pangsa Merek (unit)',
      columns: [{ key: 'b', label: 'Merek', type: 'text', width: 22 }, { key: 'q', label: 'Unit', type: 'number' }],
      rows: topProduk.map(([b, q]) => ({ b, q })),
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

type LabelValue = { label: string; value: number };
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
    { label: 'Setoran / (penarikan) modal & saldo awal', value: fs.equity_changes.owner_contributions },
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

const calkSection = (fs: FinancialStatements): ExportSection => {
  const is = fs.income_statement;
  const bs = fs.balance_sheet;
  return {
    title: '5. CATATAN ATAS LAPORAN KEUANGAN (CALK)',
    columns: [{ key: 'uraian', label: 'Uraian', type: 'text', width: 110 }],
    rows: [
      'Laporan keuangan disusun berdasarkan SAK EMKM dengan basis akrual dan asumsi kelangsungan usaha.',
      'Entitas: Omah Ban Cabang 3, Magelang — usaha dagang ban dan jasa spooring; bukan Pengusaha Kena Pajak, sehingga tidak memungut PPN atas penjualan.',
      'Persediaan dinilai dengan metode FIFO; PPN atas pembelian dikapitalisasi ke harga perolehan persediaan.',
      `Periode laporan: ${fs.period.start_date ?? 'awal pembukuan'} s/d ${fs.period.end_date}.`,
      `Pendapatan bersih ${formatRupiah(is.net_revenue)}; laba (rugi) bersih ${formatRupiah(is.net_income)}.`,
      `Total aset ${formatRupiah(bs.total_assets)}; total liabilitas & ekuitas ${formatRupiah(bs.total_liabilities_and_equity)}${
        bs.is_balanced ? ' (seimbang).' : ` (selisih ${formatRupiah(bs.difference)}).`
      }`,
    ].map((uraian) => ({ uraian })),
  };
};

const mapIncome = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_income_statement', 'Laporan Laba Rugi', 'portrait', ctx, [incomeSection(fs)]);

const mapBalance = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_balance_sheet', 'Laporan Posisi Keuangan', 'portrait', ctx, [balanceSection(fs)]);

const mapEquity = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_equity_statement', 'Laporan Perubahan Ekuitas', 'portrait', ctx, [equitySection(fs)]);

const mapCashFlow = (cf: CashFlowReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_cash_flow', 'Laporan Arus Kas', 'portrait', ctx, [cashFlowSection(cf)]);

const mapCalk = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_calk', 'CALK', 'portrait', ctx, [calkSection(fs)]);

export interface SakEmkmPackageInput {
  financials: FinancialStatements;
  cashFlow: CashFlowReport;
}

const mapSakPackage = (d: SakEmkmPackageInput, ctx: ExportCtx): ExportDoc =>
  makeDoc('sak_emkm_package', 'Paket Laporan Keuangan SAK EMKM', 'portrait', ctx, [
    incomeSection(d.financials),
    balanceSection(d.financials),
    equitySection(d.financials),
    cashFlowSection(d.cashFlow),
    calkSection(d.financials),
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
  fin_income_statement: mapIncome,
  fin_equity_statement: mapEquity,
  fin_balance_sheet: mapBalance,
  fin_cash_flow: mapCashFlow,
  fin_calk: mapCalk,
  sak_emkm_package: mapSakPackage,
  period_closing: mapPeriodClosing,
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
