const pad = (n: number): string => String(n).padStart(2, '0');

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Tanggal lokal perangkat (WIB di toko) sebagai YYYY-MM-DD. toISOString() memakai UTC dan bisa mundur sehari. */
export const localDate = (d: Date = new Date()): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Waktu lokal perangkat sebagai 'YYYY-MM-DD HH:mm:ss' (timestamp server berakhiran Z adalah UTC). */
export const localDateTime = (d: Date): string =>
  `${localDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

export const currentMonth = (d: Date = new Date()): string => localDate(d).slice(0, 7);

export const previousMonth = (d: Date = new Date()): string => currentMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1));

export const monthRange = (month: string): { start: string; end: string } => {
  const [year, m] = month.split('-').map(Number);
  return { start: `${month}-01`, end: `${month}-${pad(new Date(year, m, 0).getDate())}` };
};

export const monthLabel = (month: string): string => {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${year}`;
};

export type PeriodSelection =
  | { kind: 'month'; month: string }
  | { kind: 'all' }
  | { kind: 'range'; start: string; end: string };

export interface ResolvedPeriod {
  start_date?: string;
  end_date: string;
  label: string;
}

/** Ubah pilihan periode di UI menjadi parameter laporan server. */
export const resolvePeriod = (selection: PeriodSelection, today: string = localDate()): ResolvedPeriod => {
  if (selection.kind === 'all') return { end_date: today, label: `Semua periode s/d ${today}` };
  if (selection.kind === 'range') {
    return { start_date: selection.start, end_date: selection.end, label: `${selection.start} s/d ${selection.end}` };
  }
  const { start, end } = monthRange(selection.month);
  return { start_date: start, end_date: end, label: monthLabel(selection.month) };
};
