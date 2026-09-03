import { CartItem, ExpenseRecord, JournalEntry, PosTransaction } from '../types';

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

// Calculate active cart summary
export const calculateCartTotals = (items: CartItem[], applyTax: boolean = false) => {
  let subtotal = 0;
  let total_discount = 0;
  let total_cost_hpp = 0;

  items.forEach((item) => {
    const unitPrice = item.custom_price ?? item.product.product_price;
    const itemSubtotal = unitPrice * item.qty;
    const itemDiscount = item.discount_per_item * item.qty;
    const cost = item.product.product_cost ?? item.product.cost_price ?? 0;
    const itemHpp = cost * item.qty;

    subtotal += itemSubtotal;
    total_discount += itemDiscount;
    total_cost_hpp += itemHpp;
  });

  const taxableAmount = Math.max(0, subtotal - total_discount);
  const tax_rate = applyTax ? 0.11 : 0;
  const tax_amount = Math.round(taxableAmount * tax_rate);
  const grand_total = taxableAmount + tax_amount;
  const gross_profit = taxableAmount - total_cost_hpp;

  return {
    subtotal,
    gross_sales_amount: subtotal,
    total_discount,
    discount_amount: total_discount,
    taxableAmount,
    tax_rate,
    tax_percentage: applyTax ? 11 : 0,
    tax_amount,
    grand_total,
    total_amount: grand_total,
    total_cost_hpp,
    total_hpp: total_cost_hpp,
    gross_profit,
    total_profit: gross_profit,
  };
};

// Auto-generate double-entry journal for sales transaction (COA project-skripsi_ob)
export const generateSalesJournal = (transaction: PosTransaction, journalIdCounter: number): JournalEntry => {
  const journalNumber = `JU-202609-${String(journalIdCounter).padStart(4, '0')}`;
  const isCash = transaction.payment_method === 'TUNAI';
  const cashAccountCode = isCash ? '1-1000' : '1-1001';
  const cashAccountName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';
  const refDoc = transaction.reference || transaction.invoice_number;

  return {
    id: `jnl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: transaction.date,
    ref_doc: refDoc,
    description: `Penjualan Ban (${transaction.items.length} item) - Pelanggan: ${transaction.customer_name || 'Umum'} (${transaction.vehicle_plate || 'Tanpa Plat'})`,
    status: 'POSTED',
    total_debit: transaction.grand_total + (transaction.total_discount > 0 ? transaction.total_discount : 0) + transaction.total_cost_hpp,
    total_credit: transaction.subtotal + (transaction.tax_amount > 0 ? transaction.tax_amount : 0) + transaction.total_cost_hpp,
    lines: [
      // 1. Debit Cash/Bank for total received
      {
        account_code: cashAccountCode,
        account_name: cashAccountName,
        debit: transaction.grand_total,
        credit: 0,
        note: `Penerimaan bayar ${transaction.payment_method} - ${refDoc}`,
      },
      // 2. Debit Sales Discount (if any)
      ...(transaction.total_discount > 0
        ? [
            {
              account_code: '4-9000',
              account_name: 'Potongan Diskon Penjualan',
              debit: transaction.total_discount,
              credit: 0,
              note: `Diskon promosi penjualan kasir - ${refDoc}`,
            },
          ]
        : []),
      // 3. Credit Sales Revenue
      {
        account_code: '4-1000',
        account_name: 'Pendapatan Penjualan Ban Baru',
        debit: 0,
        credit: transaction.subtotal,
        note: `Omzet penjualan kotor - ${refDoc}`,
      },
      // 4. Credit PPN Keluaran (if tax applied)
      ...(transaction.tax_amount > 0
        ? [
            {
              account_code: '2-1003',
              account_name: 'PPN Keluaran (11%)',
              debit: 0,
              credit: transaction.tax_amount,
              note: `Pajak PPN 11% - ${refDoc}`,
            },
          ]
        : []),
      // 5. Debit HPP
      {
        account_code: '5-1000',
        account_name: 'Harga Pokok Penjualan (HPP) Ban Baru',
        debit: transaction.total_cost_hpp,
        credit: 0,
        note: `Beban pokok penjualan FIFO - ${refDoc}`,
      },
      // 6. Credit Tire Inventory
      {
        account_code: '1-2000',
        account_name: 'Persediaan Ban Baru Cabang 3',
        debit: 0,
        credit: transaction.total_cost_hpp,
        note: `Pengurangan persediaan gudang - ${refDoc}`,
      },
    ],
  };
};

// Auto-generate double-entry journal for expense record (COA project-skripsi_ob)
export const generateExpenseJournal = (expense: ExpenseRecord, journalIdCounter: number): JournalEntry => {
  const journalNumber = `JU-202609-${String(journalIdCounter).padStart(4, '0')}`;
  const refDoc = expense.reference || expense.expense_number;
  
  let expenseAccountCode = '6-1005';
  let expenseAccountName = 'Beban Perlengkapan & Operasional Bengkel';

  if (expense.category.includes('Listrik')) {
    expenseAccountCode = '6-1001';
    expenseAccountName = 'Beban Listrik, Air & Internet';
  } else if (expense.category.includes('Gaji')) {
    expenseAccountCode = '6-1000';
    expenseAccountName = 'Beban Gaji & Uang Makan Karyawan';
  } else if (expense.category.includes('Sewa')) {
    expenseAccountCode = '6-1003';
    expenseAccountName = 'Beban Sewa Bangunan Toko';
  } else if (expense.category.includes('Transport')) {
    expenseAccountCode = '6-1004';
    expenseAccountName = 'Beban Transportasi & Pengiriman Ban';
  } else if (expense.category.includes('ATK') || expense.category.includes('Bengkel')) {
    expenseAccountCode = '6-1005';
    expenseAccountName = 'Beban Perlengkapan & ATK Toko';
  } else if (expense.category.includes('Pemeliharaan')) {
    expenseAccountCode = '6-1006';
    expenseAccountName = 'Beban Perawatan Mesin Spooring & Balancing';
  } else if (expense.category.includes('Konsumsi')) {
    expenseAccountCode = '6-1007';
    expenseAccountName = 'Beban Konsumsi & Lembur Karyawan';
  } else if (expense.category.includes('Pajak')) {
    expenseAccountCode = '6-1008';
    expenseAccountName = 'Beban Pajak & Retribusi Daerah';
  }

  const isCash = expense.cash_source.includes('Laci') || expense.payment_method === 'Cash';
  const creditAccountCode = isCash ? '1-1000' : '1-1001';
  const creditAccountName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

  return {
    id: `jnl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: expense.date,
    ref_doc: refDoc,
    description: `${expense.category} - ${expense.description} (Penerima: ${expense.paid_to})`,
    status: 'POSTED',
    total_debit: expense.amount,
    total_credit: expense.amount,
    lines: [
      {
        account_code: expenseAccountCode,
        account_name: expenseAccountName,
        debit: expense.amount,
        credit: 0,
        note: `Biaya: ${expense.description}`,
      },
      {
        account_code: creditAccountCode,
        account_name: creditAccountName,
        debit: 0,
        credit: expense.amount,
        note: `Pengeluaran via ${creditAccountName}`,
      },
    ],
  };
};
