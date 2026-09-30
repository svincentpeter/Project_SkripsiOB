import { ExpenseCategory, ExpenseCategoryMapping } from '../types';

export const formatRupiah = (value: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const parseRupiahInput = (input: string): number => {
  const clean = input.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

/**
 * Nominal bertanda dengan sen: "12.345.678,90" (format Indonesia), "12345678.90" (titik desimal 1-2 angka),
 * "-6.500" (minus di depan). Kosong = 0; format lain (mis. "12,345.90" atau 3 angka desimal) = null.
 */
export const parseDecimalRupiah = (input: string): number | null => {
  const s = input.replace(/rp/i, '').replace(/\s/g, '').replace(/−/g, '-');
  if (s === '') return 0;
  const id = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(s);
  if (id) return Number(`${id[1]}${id[2].replace(/\./g, '')}.${id[3] ?? '0'}`) + 0;
  return /^-?\d+\.\d{1,2}$/.test(s) ? Number(s) + 0 : null;
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('id-ID').format(value);
};

/** Mutasi qty bertanda: +5, −5 (tanda minus), atau 0. Masuk neto buku stok bisa negatif karena retur pembelian. */
export const formatSignedQty = (value: number | undefined): string => {
  const n = value ?? 0;
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';
};

export const formatDateIndo = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatDateTimeIndo = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

// Audio effects using Web Audio API
export const playBarcodeBeepSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch {
    // Audio context not allowed or supported
  }
};

export const playCashDrawerSound = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.18);
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // Audio context not allowed or supported
  }
};

export const EXPENSE_CATEGORY_CONFIG: Record<ExpenseCategory, ExpenseCategoryMapping> = {
  'Listrik & Air (PLN/PDAM)': {
    category: 'Listrik & Air (PLN/PDAM)',
    account_code: '6-1001',
    account_name: 'Beban Listrik, Air & Internet',
    description: 'Tagihan PLN pasca/prabayar, PDAM, dan internet bengkel',
    budget_monthly_limit: 2500000,
    default_cash_source: 'Rekening Bank BCA (Cabang 3)',
  },
  'Gaji & Uang Makan Montir': {
    category: 'Gaji & Uang Makan Montir',
    account_code: '6-1000',
    account_name: 'Beban Gaji & Uang Makan Karyawan',
    description: 'Uang makan mingguan, insentif, dan gaji teknisi/montir',
    budget_monthly_limit: 8000000,
    default_cash_source: 'Kas Tunai Laci Kasir',
  },
  'Sewa Lahan & Bangunan': {
    category: 'Sewa Lahan & Bangunan',
    account_code: '6-1003',
    account_name: 'Beban Sewa Bangunan Toko',
    description: 'Biaya sewa ruko atau tanah operasional Omah Ban Cabang 3',
    budget_monthly_limit: 5000000,
    default_cash_source: 'Rekening Bank BCA (Cabang 3)',
  },
  'Transport & Pengiriman Ban': {
    category: 'Transport & Pengiriman Ban',
    account_code: '6-1004',
    account_name: 'Beban Transportasi & Pengiriman Ban',
    description: 'BBM mobil pickup operasional, tol, dan ongkos kirim ban antar cabang',
    budget_monthly_limit: 1500000,
    default_cash_source: 'Kas Tunai Laci Kasir',
  },
  'ATK & Keperluan Bengkel': {
    category: 'ATK & Keperluan Bengkel',
    account_code: '6-1005',
    account_name: 'Beban Perlengkapan & ATK Toko',
    description: 'Kertas struk kasir, timbel timah, pentil karet, sabun cuci velg',
    budget_monthly_limit: 1000000,
    default_cash_source: 'Kas Tunai Laci Kasir',
  },
  'Pemeliharaan Mesin Spooring & Balancing': {
    category: 'Pemeliharaan Mesin Spooring & Balancing',
    account_code: '6-1006',
    account_name: 'Beban Perawatan Mesin Spooring & Balancing',
    description: 'Kalibrasi kamera 3D HawkEye, ganti oli kompresor angin, servis hidrolik',
    budget_monthly_limit: 2000000,
    default_cash_source: 'Rekening Bank BCA (Cabang 3)',
  },
  'Konsumsi & Lembur Karyawan': {
    category: 'Konsumsi & Lembur Karyawan',
    account_code: '6-1007',
    account_name: 'Beban Konsumsi & Lembur Karyawan',
    description: 'Air galon, kopi tamu/karyawan, snack, dan konsumsi lembur ganti ban',
    budget_monthly_limit: 1200000,
    default_cash_source: 'Kas Tunai Laci Kasir',
  },
  'Pajak & Retribusi Daerah': {
    category: 'Pajak & Retribusi Daerah',
    account_code: '6-1008',
    account_name: 'Beban Pajak & Retribusi Daerah',
    description: 'Pajak reklame papan nama toko, retribusi sampah, dan iuran lingkungan',
    budget_monthly_limit: 800000,
    default_cash_source: 'Kas Tunai Laci Kasir',
  },
};

/**
 * Konversi angka nominal ke ejaan kalimat Rupiah resmi Bahasa Indonesia
 * Contoh: 350000 -> "Tiga ratus lima puluh ribu rupiah"
 */
export const terbilangRupiah = (amount: number): string => {
  if (isNaN(amount) || amount === 0) return 'Nol rupiah';

  const angka = Math.floor(Math.abs(amount));
  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];

  const convert = (n: number): string => {
    if (n < 12) return units[n];
    if (n < 20) return `${convert(n - 10)} belas`;
    if (n < 100) return `${convert(Math.floor(n / 10))} puluh ${convert(n % 10)}`.trim();
    if (n < 200) return `seratus ${convert(n - 100)}`.trim();
    if (n < 1000) return `${convert(Math.floor(n / 100))} ratus ${convert(n % 100)}`.trim();
    if (n < 2000) return `seribu ${convert(n - 1000)}`.trim();
    if (n < 1000000) return `${convert(Math.floor(n / 1000))} ribu ${convert(n % 1000)}`.trim();
    if (n < 1000000000) return `${convert(Math.floor(n / 1000000))} juta ${convert(n % 1000000)}`.trim();
    if (n < 1000000000000) return `${convert(Math.floor(n / 1000000000))} milyar ${convert(n % 1000000000)}`.trim();
    return `${convert(Math.floor(n / 1000000000000))} triliun ${convert(n % 1000000000000)}`.trim();
  };

  const rawWords = convert(angka).replace(/\s+/g, ' ').trim();
  const capitalized = rawWords.charAt(0).toUpperCase() + rawWords.slice(1);
  return `${capitalized} rupiah`;
};
