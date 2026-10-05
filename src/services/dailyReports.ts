import type { DailyRecap, DailyRecapRow, DailyRecapTotals, DashboardSummary, PaymentGroup } from '../shared/types';
import { localDate } from './accountingPeriod';

export const PAYMENT_GROUPS: PaymentGroup[] = ['TUNAI', 'TRANSFER', 'QRIS'];

export const PAYMENT_GROUP_LABELS: Record<PaymentGroup, string> = {
  TUNAI: 'Uang Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
};

const NUMERIC_KEYS = [
  'sales_count', 'product_qty', 'revenue', 'goods_revenue', 'service_revenue', 'contra_revenue', 'returns',
  'net_revenue', 'cost_of_sales', 'gross_profit', 'operating_expenses', 'net_income', 'cash_in', 'cash_out', 'net_cash',
] as const;

/** Geser tanggal YYYY-MM-DD sejumlah hari menurut kalender lokal. */
const shiftDays = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
};

export const emptyRecapRow = (date: string): DailyRecapRow => ({
  date,
  ...(Object.fromEntries(NUMERIC_KEYS.map((k) => [k, 0])) as Record<(typeof NUMERIC_KEYS)[number], number>),
  payment_mix: { TUNAI: 0, TRANSFER: 0, QRIS: 0 },
});

export const sumRecapRows = (rows: DailyRecapRow[]): DailyRecapTotals => {
  const { date: _date, ...total } = emptyRecapRow('');
  for (const row of rows) {
    for (const k of NUMERIC_KEYS) total[k] += row[k];
    for (const g of PAYMENT_GROUPS) total.payment_mix[g] += row.payment_mix[g];
  }
  return total;
};

/** KPI laba rugi satu hari (strip Kas Harian dan bagian ekspor "Ringkasan Hari Ini"). */
export const dailySummaryKpis = (summary: DailyRecapTotals): [string, number][] => [
  ['Pendapatan Bersih', summary.net_revenue],
  ['HPP', summary.cost_of_sales],
  ['Laba Kotor', summary.gross_profit],
  ['Beban Operasional', summary.operating_expenses],
  ['Laba Bersih', summary.net_income],
];

/** Satu permintaan rekap untuk dashboard: 7 hari terakhir sekaligus bulan berjalan (tanggal lokal WIB). */
export const dashboardRange = (today: string = localDate()): { from: string; to: string } => {
  const weekStart = shiftDays(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;
  return { from: weekStart < monthStart ? weekStart : monthStart, to: today };
};

/** Angka dashboard dari rekap server; hari tanpa transaksi (atau rekap belum dimuat) bernilai nol. */
export const summarizeDashboard = (recap: DailyRecap | null, today: string): DashboardSummary => {
  const rows = recap?.rows ?? [];
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const rowFor = (date: string) => byDate.get(date) ?? emptyRecapRow(date);
  return {
    today: rowFor(today),
    week: Array.from({ length: 7 }, (_, i) => rowFor(shiftDays(today, i - 6))),
    month: sumRecapRows(rows.filter((r) => r.date.startsWith(today.slice(0, 7)))),
  };
};

/** Label jenis jurnal pada mutasi kas harian (termasuk jenis baru sub-proyek 2–4). */
const CASH_MOVEMENT_LABELS: Record<string, string> = {
  POS_SALE: 'Penjualan POS',
  POS_SALE_VOID: 'Pembatalan nota (void)',
  SALES_RETURN: 'Retur penjualan (refund)',
  PURCHASE: 'Pembelian barang',
  PURCHASE_RETURN: 'Retur pembelian',
  GOODS_RECEIPT_CANCEL: 'Pembatalan penerimaan barang',
  DEBT_PAYMENT: 'Pembayaran hutang supplier',
  EXPENSE: 'Biaya operasional (BKK)',
  VOID_EXPENSE: 'Pembatalan biaya',
  CASH_SESSION_VARIANCE: 'Selisih kas kasir',
  CASH_DEPOSIT: 'Setor kas laci ke bank',
  OWNER_DRAWING: 'Prive pemilik',
  CAPITAL_INJECTION: 'Setoran modal pemilik',
  FIXED_ASSET_ACQUISITION: 'Pembelian aset tetap',
  FIXED_ASSET_VOID: 'Pembatalan pembelian aset tetap',
  BANK_RECON_ADJUSTMENT: 'Penyesuaian rekonsiliasi bank',
  ADJUSTING_ENTRY: 'Jurnal penyesuaian',
  ADJUSTING_REVERSAL: 'Pembalik jurnal penyesuaian',
  MANUAL_ADJUSTMENT: 'Jurnal manual',
  MANUAL_REVERSAL: 'Pembalik jurnal manual',
  RECEIVABLE_PAYMENT: 'Pelunasan piutang (historis)',
  BOOKING_DP: 'DP booking (historis)',
  BOOKING_DP_REFUND: 'Refund DP booking (historis)',
};

export const cashMovementLabel = (referenceType: string): string => CASH_MOVEMENT_LABELS[referenceType] ?? referenceType;
