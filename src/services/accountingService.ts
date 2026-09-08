import { 
  CashFlowStatementResult,
  ChartOfAccount, 
  DebtPaymentInput, 
  ExpenseRecord, 
  GoodsReceiptInput, 
  JournalEntry, 
  LedgerAccountSummary, 
  LedgerTransaction, 
  ManualJournalInput, 
  PosTransaction, 
  ReceivableInvoice,
  ReceivablePaymentInput,
  TireProduct, 
  TrialBalanceResult, 
  TrialBalanceRow 
} from '../shared/types';
import { generateSalesJournal, generateExpenseJournal, EXPENSE_CATEGORY_CONFIG } from '../shared/utils/formatters';

export { generateSalesJournal, generateExpenseJournal, EXPENSE_CATEGORY_CONFIG };

// ==============================================================================
// 1. CHART OF ACCOUNTS (COA) BAKU SAK EMKM OMAH BAN CABANG 3
// ==============================================================================
export const SAK_EMKM_COA: ChartOfAccount[] = [
  { account_code: '1-1000', account_name: 'Kas Toko Laci Kasir', account_type: 'ASSET', normal_balance: 'DEBIT', category_name: 'Aset Lancar' },
  { account_code: '1-1001', account_name: 'Bank BCA Cabang 3', account_type: 'ASSET', normal_balance: 'DEBIT', category_name: 'Aset Lancar' },
  { account_code: '1-1002', account_name: 'Piutang Dagang (AR)', account_type: 'ASSET', normal_balance: 'DEBIT', category_name: 'Aset Lancar' },
  { account_code: '1-2000', account_name: 'Persediaan Ban Baru Cabang 3', account_type: 'ASSET', normal_balance: 'DEBIT', category_name: 'Aset Lancar' },
  { account_code: '1-3000', account_name: 'Peralatan Bengkel & Mesin Spooring', account_type: 'ASSET', normal_balance: 'DEBIT', category_name: 'Aset Tetap' },
  { account_code: '1-3999', account_name: 'Akumulasi Penyusutan Mesin', account_type: 'ASSET', normal_balance: 'CREDIT', category_name: 'Kontra Aset Tetap' },
  { account_code: '2-1000', account_name: 'Hutang Dagang Supplier (AP)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category_name: 'Liabilitas Lancar' },
  { account_code: '2-1003', account_name: 'PPN Keluaran (11%)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category_name: 'Liabilitas Lancar' },
  { account_code: '2-1004', account_name: 'Uang Muka Penjualan (Titipan DP Konsumen)', account_type: 'LIABILITY', normal_balance: 'CREDIT', category_name: 'Liabilitas Lancar' },
  { account_code: '3-1000', account_name: 'Modal Disetor Pemilik', account_type: 'EQUITY', normal_balance: 'CREDIT', category_name: 'Ekuitas' },
  { account_code: '3-2000', account_name: 'Laba Ditahan Cabang 3', account_type: 'EQUITY', normal_balance: 'CREDIT', category_name: 'Ekuitas' },
  { account_code: '4-1000', account_name: 'Pendapatan Penjualan Ban Baru', account_type: 'REVENUE', normal_balance: 'CREDIT', category_name: 'Pendapatan Usaha' },
  { account_code: '4-1001', account_name: 'Pendapatan Jasa Servis Roda Mobil', account_type: 'REVENUE', normal_balance: 'CREDIT', category_name: 'Pendapatan Usaha' },
  { account_code: '4-2000', account_name: 'Pendapatan Administrasi & Surcharge EDC', account_type: 'REVENUE', normal_balance: 'CREDIT', category_name: 'Pendapatan Usaha' },
  { account_code: '4-9000', account_name: 'Potongan Diskon Penjualan', account_type: 'REVENUE', normal_balance: 'DEBIT', category_name: 'Kontra Pendapatan' },
  { account_code: '5-1000', account_name: 'Harga Pokok Penjualan (HPP) Ban Baru', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Harga Pokok Penjualan' },
  { account_code: '6-1000', account_name: 'Beban Gaji & Uang Makan Karyawan', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1001', account_name: 'Beban Listrik, Air & Internet', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1003', account_name: 'Beban Sewa Bangunan Toko', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1004', account_name: 'Beban Transportasi & Pengiriman Ban', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1005', account_name: 'Beban Perlengkapan & ATK Toko', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1006', account_name: 'Beban Perawatan Mesin Spooring & Balancing', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1007', account_name: 'Beban Konsumsi & Lembur Karyawan', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1008', account_name: 'Beban Pajak & Retribusi Daerah', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
  { account_code: '6-1009', account_name: 'Beban Administrasi Bank, MDR QRIS & EDC', account_type: 'EXPENSE', normal_balance: 'DEBIT', category_name: 'Beban Operasional' },
];

export const getAccountByCode = (code: string): ChartOfAccount | undefined => {
  return SAK_EMKM_COA.find((a) => a.account_code === code);
};

// ==============================================================================
// 2. GENERATOR JURNAL PEMBELIAN BAN BARU (GOODS RECEIPT)
// ==============================================================================
export const generatePurchaseJournal = (
  receipt: GoodsReceiptInput,
  totalCost: number,
  journalCounter: number
): JournalEntry => {
  const journalNumber = `JU-202609-${String(journalCounter).padStart(4, '0')}`;
  const refDoc = receipt.supplier_invoice || `GR-${Date.now().toString().slice(-4)}`;
  const dateStr = receipt.receipt_date || new Date().toISOString().substring(0, 10);
  const terms = receipt.payment_terms || 'TEMPO_HUTANG';

  let creditCode = '2-1000';
  let creditName = 'Hutang Dagang Supplier (AP)';
  let noteDesc = `Hutang tempo supplier: ${receipt.supplier_name} (Jatuh tempo: ${receipt.due_date || '30 hari'})`;

  if (terms === 'TUNAI_KAS') {
    creditCode = '1-1000';
    creditName = 'Kas Toko Laci Kasir';
    noteDesc = `Pembayaran tunai laci kasir ke ${receipt.supplier_name}`;
  } else if (terms === 'TUNAI_BANK') {
    creditCode = '1-1001';
    creditName = 'Bank BCA Cabang 3';
    noteDesc = `Transfer Bank BCA ke distributor ${receipt.supplier_name}`;
  }

  return {
    id: `jnl-gr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: dateStr,
    ref_doc: refDoc,
    description: `Penerimaan Stok Ban Baru (${receipt.incoming_qty} unit) dari ${receipt.supplier_name}`,
    status: 'POSTED',
    total_debit: totalCost,
    total_credit: totalCost,
    lines: [
      {
        account_code: '1-2000',
        account_name: 'Persediaan Ban Baru Cabang 3',
        debit: totalCost,
        credit: 0,
        note: `Penambahan stok ban (${receipt.incoming_qty} pcs @ Rp ${receipt.unit_cost.toLocaleString('id-ID')})`,
      },
      {
        account_code: creditCode,
        account_name: creditName,
        debit: 0,
        credit: totalCost,
        note: noteDesc,
      },
    ],
  };
};

// ==============================================================================
// 3. GENERATOR JURNAL PELUNASAN HUTANG SUPPLIER
// ==============================================================================
export const generateDebtPaymentJournal = (
  payment: DebtPaymentInput,
  supplierName: string,
  invoiceRef: string,
  journalCounter: number
): JournalEntry => {
  const journalNumber = `JU-202609-${String(journalCounter).padStart(4, '0')}`;
  const isCash = payment.source_account_code === '1-1000';
  const creditCode = isCash ? '1-1000' : '1-1001';
  const creditName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

  return {
    id: `jnl-pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: payment.payment_date,
    ref_doc: invoiceRef,
    description: `Pelunasan Hutang Pembelian Ban ke ${supplierName} (${invoiceRef})`,
    status: 'POSTED',
    total_debit: payment.amount,
    total_credit: payment.amount,
    lines: [
      {
        account_code: '2-1000',
        account_name: 'Hutang Dagang Supplier (AP)',
        debit: payment.amount,
        credit: 0,
        note: `Pengurangan saldo hutang ke ${supplierName} - Ref: ${invoiceRef}`,
      },
      {
        account_code: creditCode,
        account_name: creditName,
        debit: 0,
        credit: payment.amount,
        note: `Pengeluaran via ${creditName} untuk pelunasan hutang`,
      },
    ],
  };
};

// ==============================================================================
// 4. GENERATOR JURNAL PENYESUAIAN / MEMORIAL MANUAL
// ==============================================================================
export const generateManualJournal = (
  input: ManualJournalInput,
  journalCounter: number
): JournalEntry => {
  const journalNumber = `JU-202609-${String(journalCounter).padStart(4, '0')}`;
  const totalDebit = input.lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = input.lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Total Debit (Rp ${totalDebit}) tidak sama dengan Total Kredit (Rp ${totalCredit})!`);
  }

  return {
    id: `jnl-adj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: input.date,
    ref_doc: input.ref_doc || `MEM-${journalNumber}`,
    description: input.description,
    status: 'POSTED',
    total_debit: totalDebit,
    total_credit: totalCredit,
    lines: input.lines.map((l) => ({
      account_code: l.account_code,
      account_name: l.account_name || (getAccountByCode(l.account_code)?.account_name ?? 'Akun Transaksi'),
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      note: l.note || input.description,
    })),
  };
};

// ==============================================================================
// 4B. GENERATOR NOMOR URUT BUKTI KAS KELUAR (BKK) & JURNAL PEMBALIK (VOID)
// ==============================================================================
export const generateBkkNumber = (
  existingExpenses: ExpenseRecord[],
  dateStr: string = new Date().toISOString().substring(0, 10)
): string => {
  const cleanDate = dateStr.slice(0, 7).replace('-', ''); // e.g. "202609"
  const prefix = `BKK-${cleanDate}-`;

  let maxSeq = 0;
  existingExpenses.forEach((exp) => {
    const numStr = exp.bkk_number || exp.expense_number || exp.reference || '';
    if (numStr.startsWith(prefix)) {
      const seqPart = parseInt(numStr.replace(prefix, ''), 10);
      if (!isNaN(seqPart) && seqPart > maxSeq) {
        maxSeq = seqPart;
      }
    } else if (numStr.includes(`-${cleanDate}-`)) {
      const parts = numStr.split('-');
      const lastPart = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastPart) && lastPart > maxSeq) {
        maxSeq = lastPart;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

export const generateVoidExpenseJournal = (
  expense: ExpenseRecord,
  voidReason: string,
  voidedBy: string,
  journalCounter: number
): JournalEntry => {
  const cleanDate = (expense.date || new Date().toISOString().substring(0, 10)).replace(/-/g, '').slice(0, 6);
  const journalNumber = `JU-${cleanDate}-${String(journalCounter).padStart(4, '0')}`;
  const refDoc = `BATAL-${expense.bkk_number || expense.expense_number || expense.reference}`;

  const categoryMapping = EXPENSE_CATEGORY_CONFIG[expense.category] || {
    account_code: expense.category_code || '6-1005',
    account_name: 'Beban Perlengkapan & Operasional Bengkel',
    category: expense.category,
    description: expense.description,
  };

  const isCash = expense.cash_source.includes('Laci') || expense.payment_method === 'Cash';
  const cashAccountCode = isCash ? '1-1000' : '1-1001';
  const cashAccountName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

  return {
    id: `jnl-void-exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: new Date().toISOString().substring(0, 10),
    ref_doc: refDoc,
    description: `[JURNAL PEMBALIK] Pembatalan Biaya ${expense.expense_number} - ${expense.category}. Alasan: ${voidReason} (Otorisasi: ${voidedBy})`,
    status: 'POSTED',
    total_debit: expense.amount,
    total_credit: expense.amount,
    lines: [
      {
        account_code: cashAccountCode,
        account_name: cashAccountName,
        debit: expense.amount,
        credit: 0,
        note: `Pembalikan dana ke ${cashAccountName} atas pembatalan ${expense.expense_number}`,
      },
      {
        account_code: categoryMapping.account_code,
        account_name: categoryMapping.account_name,
        debit: 0,
        credit: expense.amount,
        note: `Kredit koreksi pembatalan beban: ${expense.description}`,
      },
    ],
  };
};

export const generateVoidSalesJournal = (
  transaction: PosTransaction,
  voidReason: string,
  voidedBy: string,
  journalCounter: number
): JournalEntry => {
  const cleanDate = (transaction.date || new Date().toISOString().substring(0, 10)).replace(/-/g, '').slice(0, 6);
  const journalNumber = `JU-${cleanDate}-${String(journalCounter).padStart(4, '0')}`;
  const refDoc = `BATAL-${transaction.reference || transaction.invoice_number}`;
  const isCash = transaction.payment_method === 'TUNAI';
  const cashAccountCode = isCash ? '1-1000' : '1-1001';
  const cashAccountName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

  const taxAmt = transaction.tax_amount || 0;
  const discountAmt = transaction.total_discount || 0;
  const hppAmt = transaction.total_cost_hpp || 0;

  const totalDebit = transaction.subtotal + (taxAmt > 0 ? taxAmt : 0) + hppAmt;
  const totalCredit = transaction.grand_total + (discountAmt > 0 ? discountAmt : 0) + hppAmt;

  return {
    id: `jnl-void-pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: new Date().toISOString().substring(0, 10),
    ref_doc: refDoc,
    description: `[JURNAL PEMBALIK] Pembatalan Transaksi Penjualan ${transaction.invoice_number} - Pelanggan: ${transaction.customer_name || 'Umum'} (${transaction.vehicle_plate || 'Tanpa Plat'}). Alasan: ${voidReason} (Otorisasi: ${voidedBy})`,
    status: 'POSTED',
    total_debit: totalDebit,
    total_credit: totalCredit,
    lines: [
      // 1. Debit Pendapatan Penjualan Ban Baru (membalik omzet)
      {
        account_code: '4-1000',
        account_name: 'Pendapatan Penjualan Ban Baru',
        debit: transaction.subtotal,
        credit: 0,
        note: `Koreksi pembatalan omzet penjualan - ${refDoc}`,
      },
      // 2. Debit PPN Keluaran (jika sebelumnya ada pemungutan PPN)
      ...(taxAmt > 0
        ? [
            {
              account_code: '2-1003',
              account_name: 'PPN Keluaran (11%)',
              debit: taxAmt,
              credit: 0,
              note: `Pembatalan PPN Keluaran 11% - ${refDoc}`,
            },
          ]
        : []),
      // 3. Kredit Kas / Bank (karena uang dikembalikan ke pelanggan)
      {
        account_code: cashAccountCode,
        account_name: cashAccountName,
        debit: 0,
        credit: transaction.grand_total,
        note: `Pengembalian dana ${transaction.payment_method} ke pelanggan - ${refDoc}`,
      },
      // 4. Kredit Potongan Diskon Penjualan (jika sebelumnya ada diskon)
      ...(discountAmt > 0
        ? [
            {
              account_code: '4-9000',
              account_name: 'Potongan Diskon Penjualan',
              debit: 0,
              credit: discountAmt,
              note: `Koreksi diskon penjualan - ${refDoc}`,
            },
          ]
        : []),
      // 5. Debit Persediaan Ban Baru (mengembalikan saldo aset barang dagang gudang)
      {
        account_code: '1-2000',
        account_name: 'Persediaan Ban Baru Cabang 3',
        debit: hppAmt,
        credit: 0,
        note: `Pengembalian fisik & aset stok ban ke gudang - ${refDoc}`,
      },
      // 6. Kredit HPP Ban Baru (meniadakan beban pokok penjualan)
      {
        account_code: '5-1000',
        account_name: 'Harga Pokok Penjualan (HPP) Ban Baru',
        debit: 0,
        credit: hppAmt,
        note: `Pembalikan beban pokok penjualan - ${refDoc}`,
      },
    ],
  };
};

// ==============================================================================
// ==============================================================================
// 5. KALKULATOR BUKU BESAR (GENERAL LEDGER PER AKUN) DENGAN FILTER PERIODE
// ==============================================================================
export const calculateAccountLedger = (
  journals: JournalEntry[],
  accountCode: string,
  initialBalance: number = 0,
  startDate?: string,
  endDate?: string
): LedgerAccountSummary => {
  const accountMeta = getAccountByCode(accountCode) || {
    account_code: accountCode,
    account_name: 'Akun Tidak Dikenal',
    account_type: 'ASSET' as const,
    normal_balance: 'DEBIT' as const,
  };

  // Urutkan kronologis tanggal lama ke baru
  const sortedJournals = [...journals]
    .filter((j) => j.status === 'POSTED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningInitialBalance = initialBalance;
  let totalDebit = 0;
  let totalCredit = 0;
  const transactions: LedgerTransaction[] = [];

  // Hitung akumulasi sebelum startDate sebagai Saldo Awal Periode
  sortedJournals.forEach((j) => {
    const matchingLines = j.lines.filter((l) => l.account_code === accountCode);
    
    if (startDate && j.date < startDate) {
      matchingLines.forEach((line) => {
        if (accountMeta.normal_balance === 'DEBIT') {
          runningInitialBalance += (line.debit - line.credit);
        } else {
          runningInitialBalance += (line.credit - line.debit);
        }
      });
    }
  });

  let runningBalance = runningInitialBalance;

  // Proses transaksi yang berada dalam rentang startDate s/d endDate
  sortedJournals.forEach((j) => {
    const isAfterStart = !startDate || j.date >= startDate;
    const isBeforeEnd = !endDate || j.date <= endDate;

    if (isAfterStart && isBeforeEnd) {
      const matchingLines = j.lines.filter((l) => l.account_code === accountCode);
      matchingLines.forEach((line, idx) => {
        totalDebit += line.debit;
        totalCredit += line.credit;

        if (accountMeta.normal_balance === 'DEBIT') {
          runningBalance = runningBalance + line.debit - line.credit;
        } else {
          runningBalance = runningBalance + line.credit - line.debit;
        }

        transactions.push({
          id: `${j.id}-${idx}`,
          journal_id: j.id,
          journal_number: j.journal_number,
          date: j.date,
          ref_doc: j.ref_doc,
          description: j.description,
          debit: line.debit,
          credit: line.credit,
          running_balance: runningBalance,
          note: line.note,
        });
      });
    }
  });

  return {
    account_code: accountMeta.account_code,
    account_name: accountMeta.account_name,
    account_type: accountMeta.account_type,
    normal_balance: accountMeta.normal_balance,
    initial_balance: runningInitialBalance,
    total_debit: totalDebit,
    total_credit: totalCredit,
    ending_balance: runningBalance,
    transactions,
  };
};

// ==============================================================================
// 5B. GENERATOR JURNAL PENUTUP OTOMATIS (PERIOD CLOSING ENTRIES)
// ==============================================================================
export const generateClosingJournal = (
  journals: JournalEntry[],
  initialBalances: Record<string, number> = {},
  periodMonth: string, // e.g. "2026-09"
  closedBy: string,
  journalCounter: number
): { journal: JournalEntry; netIncome: number } => {
  const cleanPeriod = periodMonth.replace(/-/g, '');
  const journalNumber = `JC-${cleanPeriod}-${String(journalCounter).padStart(4, '0')}`;
  const trialBalance = calculateTrialBalance(journals, initialBalances);
  
  const lines: JournalEntry['lines'] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  // 1. Tutup akun Pendapatan (Kredit normal di-debit ke nol)
  const revenueAccounts = trialBalance.rows.filter(
    (r) => r.account_code.startsWith('4-') && r.credit_balance > 0
  );
  revenueAccounts.forEach((rev) => {
    lines.push({
      account_code: rev.account_code,
      account_name: rev.account_name,
      debit: rev.credit_balance,
      credit: 0,
      note: `Penutupan pendapatan ${rev.account_name} ke Laba Ditahan`,
    });
    totalDebit += rev.credit_balance;
  });

  // Tutup kontra-pendapatan (Potongan diskon 4-9000 debit di-kredit ke nol)
  const contraRevenueAccounts = trialBalance.rows.filter(
    (r) => r.account_code.startsWith('4-') && r.debit_balance > 0
  );
  contraRevenueAccounts.forEach((cr) => {
    lines.push({
      account_code: cr.account_code,
      account_name: cr.account_name,
      debit: 0,
      credit: cr.debit_balance,
      note: `Penutupan potongan diskon ${cr.account_name}`,
    });
    totalCredit += cr.debit_balance;
  });

  // 2. Tutup akun HPP & Beban Operasional (Debit normal di-kredit ke nol)
  const expenseAccounts = trialBalance.rows.filter(
    (r) => (r.account_code.startsWith('5-') || r.account_code.startsWith('6-')) && r.debit_balance > 0
  );
  expenseAccounts.forEach((exp) => {
    lines.push({
      account_code: exp.account_code,
      account_name: exp.account_name,
      debit: 0,
      credit: exp.debit_balance,
      note: `Penutupan ${exp.account_name} ke Laba Ditahan`,
    });
    totalCredit += exp.debit_balance;
  });

  // 3. Selisih ditutup ke 3-2000 (Laba Ditahan Cabang 3)
  const netIncome = totalDebit - totalCredit;
  if (netIncome > 0) {
    // Laba Bersih -> Kreditkan ke Laba Ditahan
    lines.push({
      account_code: '3-2000',
      account_name: 'Laba Ditahan Cabang 3',
      debit: 0,
      credit: netIncome,
      note: `Posting perolehan laba bersih periode ${periodMonth} ke Laba Ditahan`,
    });
    totalCredit += netIncome;
  } else if (netIncome < 0) {
    // Defisit Rugi Bersih -> Debitkan dari Laba Ditahan
    const netLoss = Math.abs(netIncome);
    lines.push({
      account_code: '3-2000',
      account_name: 'Laba Ditahan Cabang 3',
      debit: netLoss,
      credit: 0,
      note: `Penyesuaian defisit rugi bersih periode ${periodMonth} dari Laba Ditahan`,
    });
    totalDebit += netLoss;
  }

  const closingEntry: JournalEntry = {
    id: `jnl-close-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: new Date().toISOString().substring(0, 10),
    ref_doc: `TUTUP-${periodMonth}`,
    description: `[JURNAL PENUTUP] Penutupan seluruh akun nominal periode ${periodMonth} ke Laba Ditahan (Otorisasi: ${closedBy})`,
    status: 'POSTED',
    total_debit: totalDebit,
    total_credit: totalCredit,
    lines,
  };

  return {
    journal: closingEntry,
    netIncome,
  };
};

// ==============================================================================
// 5C. GENERATOR JURNAL PEMBALIK / KOREKSI STORNO (REVERSING ENTRY)
// ==============================================================================
export const generateReversingJournal = (
  originalJournal: JournalEntry,
  reason: string,
  reversedBy: string,
  journalCounter: number
): JournalEntry => {
  const dateStr = new Date().toISOString().substring(0, 10);
  const cleanDate = dateStr.replace(/-/g, '').slice(0, 6);
  const journalNumber = `JU-${cleanDate}-${String(journalCounter).padStart(4, '0')}`;

  const lines = originalJournal.lines.map((l) => ({
    account_code: l.account_code,
    account_name: l.account_name,
    debit: l.credit,
    credit: l.debit,
    note: `[KOREKSI PEMBALIK] Pembalikan pos ${l.account_name} dari ${originalJournal.journal_number}`,
  }));

  const totalDebit = lines.reduce((acc, l) => acc + l.debit, 0);
  const totalCredit = lines.reduce((acc, l) => acc + l.credit, 0);

  return {
    id: `jnl-rev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: dateStr,
    ref_doc: `REV-${originalJournal.journal_number}`,
    description: `[JURNAL PEMBALIK / KOREKSI] Pembalikan jurnal ${originalJournal.journal_number} (${originalJournal.ref_doc}). Alasan: ${reason} (Otorisasi: ${reversedBy})`,
    status: 'POSTED',
    total_debit: totalDebit,
    total_credit: totalCredit,
    lines,
  };
};

// ==============================================================================
// 5D. GENERATOR JURNAL PENERIMAAN PEMBAYARAN PIUTANG PELANGGAN (AR)
// ==============================================================================
export const generateReceivablePaymentJournal = (
  payment: ReceivablePaymentInput,
  customerName: string,
  invoiceRef: string,
  journalCounter: number
): JournalEntry => {
  const dateStr = payment.payment_date || new Date().toISOString().substring(0, 10);
  const cleanDate = dateStr.replace(/-/g, '').slice(0, 6);
  const journalNumber = `JU-${cleanDate}-${String(journalCounter).padStart(4, '0')}`;
  const isCash = payment.destination_account_code === '1-1000';
  const debitCode = isCash ? '1-1000' : '1-1001';
  const debitName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

  return {
    id: `jnl-rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    journal_number: journalNumber,
    reference_number: journalNumber,
    date: dateStr,
    ref_doc: invoiceRef,
    description: `Penerimaan Pembayaran Piutang Pelanggan ${customerName} (${invoiceRef})`,
    status: 'POSTED',
    total_debit: payment.amount,
    total_credit: payment.amount,
    lines: [
      {
        account_code: debitCode,
        account_name: debitName,
        debit: payment.amount,
        credit: 0,
        note: `Penerimaan kas masuk via ${debitName} dari ${customerName}`,
      },
      {
        account_code: '1-1002',
        account_name: 'Piutang Dagang (AR)',
        debit: 0,
        credit: payment.amount,
        note: `Pelunasan piutang faktur ${invoiceRef}`,
      },
    ],
  };
};

// ==============================================================================
// 6. KALKULATOR NERACA SALDO (TRIAL BALANCE) DENGAN FILTER PERIODE
// ==============================================================================
export const calculateTrialBalance = (
  journals: JournalEntry[],
  initialBalances: Record<string, number> = {},
  startDate?: string,
  endDate?: string
): TrialBalanceResult => {
  const postedJournals = journals.filter((j) => j.status === 'POSTED');

  const rows: TrialBalanceRow[] = SAK_EMKM_COA.map((account) => {
    let initial = initialBalances[account.account_code] || 0;
    let sumDebit = 0;
    let sumCredit = 0;

    postedJournals.forEach((j) => {
      const matchingLines = j.lines.filter((l) => l.account_code === account.account_code);
      if (matchingLines.length === 0) return;

      // Akun riil (1, 2, 3) sebelum startDate diakumulasi ke Saldo Awal
      if (startDate && j.date < startDate) {
        if (!account.account_code.startsWith('4-') && !account.account_code.startsWith('5-') && !account.account_code.startsWith('6-')) {
          matchingLines.forEach((l) => {
            if (account.normal_balance === 'DEBIT') {
              initial += (l.debit - l.credit);
            } else {
              initial += (l.credit - l.debit);
            }
          });
        }
      } else if ((!startDate || j.date >= startDate) && (!endDate || j.date <= endDate)) {
        matchingLines.forEach((l) => {
          sumDebit += l.debit;
          sumCredit += l.credit;
        });
      }
    });

    let debitBalance = 0;
    let creditBalance = 0;

    if (account.normal_balance === 'DEBIT') {
      const net = initial + sumDebit - sumCredit;
      if (net >= 0) {
        debitBalance = net;
      } else {
        creditBalance = Math.abs(net);
      }
    } else {
      const net = initial + sumCredit - sumDebit;
      if (net >= 0) {
        creditBalance = net;
      } else {
        debitBalance = Math.abs(net);
      }
    }

    return {
      account_code: account.account_code,
      account_name: account.account_name,
      account_type: account.account_type,
      debit_balance: debitBalance,
      credit_balance: creditBalance,
    };
  });

  const total_debit = rows.reduce((acc, r) => acc + r.debit_balance, 0);
  const total_credit = rows.reduce((acc, r) => acc + r.credit_balance, 0);
  const difference = Math.abs(total_debit - total_credit);
  const is_balanced = difference < 1;

  return {
    rows,
    total_debit,
    total_credit,
    is_balanced,
    difference,
  };
};

// ==============================================================================
// 7. KALKULATOR LAPORAN KEUANGAN STANDAR SAK EMKM 100% DINAMIS
// ==============================================================================
export const calculateDynamicSakEmkmFinancials = (
  journals: JournalEntry[],
  initialBalances: Record<string, number> = {},
  products: TireProduct[] = [],
  startDate?: string,
  endDate?: string
) => {
  const trialBalance = calculateTrialBalance(journals, initialBalances, startDate, endDate);
  const findRow = (code: string) => trialBalance.rows.find((r) => r.account_code === code);

  // A. ELEMEN LABA RUGI (INCOME STATEMENT)
  const revRow = findRow('4-1000');
  const srvRevRow = findRow('4-1001');
  const discRow = findRow('4-9000');
  const hppRow = findRow('5-1000');

  const grossSales = (revRow?.credit_balance ?? 0) + (srvRevRow?.credit_balance ?? 0);
  const discounts = discRow?.debit_balance ?? 0;
  const netSales = Math.max(0, grossSales - discounts);

  const totalHpp = hppRow?.debit_balance ?? 0;
  const grossProfit = netSales - totalHpp;

  // Beban Operasional Terperinci
  const expenseAccounts = SAK_EMKM_COA.filter((a) => a.account_code.startsWith('6-'));
  const expenseBreakdown: { code: string; name: string; amount: number }[] = [];
  let totalExpenses = 0;

  expenseAccounts.forEach((acc) => {
    const row = findRow(acc.account_code);
    const amt = row?.debit_balance ?? 0;
    if (amt > 0) {
      expenseBreakdown.push({
        code: acc.account_code,
        name: acc.account_name,
        amount: amt,
      });
      totalExpenses += amt;
    }
  });

  const netIncome = grossProfit - totalExpenses;
  const netProfitMargin = netSales > 0 ? (netIncome / netSales) * 100 : 0;
  const grossProfitMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;

  // B. ELEMEN POSISI KEUANGAN (NERACA / BALANCE SHEET)
  // 1. Aset Lancar
  const kasLaci = findRow('1-1000')?.debit_balance ?? 0;
  const bankBca = findRow('1-1001')?.debit_balance ?? 0;
  const piutangDagang = findRow('1-1002')?.debit_balance ?? 0;
  const persediaanBuku = findRow('1-2000')?.debit_balance ?? 0;
  const totalCurrentAssets = kasLaci + bankBca + piutangDagang + persediaanBuku;
  const liquidCash = kasLaci + bankBca;

  // 2. Aset Tetap
  const peralatanMesin = findRow('1-3000')?.debit_balance ?? 0;
  const akumulasiPenyusutan = findRow('1-3999')?.credit_balance ?? 0; // Bersifat pengurang
  const netFixedAssets = peralatanMesin - akumulasiPenyusutan;

  const totalAssets = totalCurrentAssets + netFixedAssets;

  // 3. Liabilitas
  const hutangSupplier = findRow('2-1000')?.credit_balance ?? 0;
  const ppnKeluaran = findRow('2-1003')?.credit_balance ?? 0;
  const uangMukaDp = findRow('2-1004')?.credit_balance ?? 0;
  const totalLiabilities = hutangSupplier + ppnKeluaran + uangMukaDp;

  // 4. Ekuitas
  const modalPemilik = findRow('3-1000')?.credit_balance ?? 0;
  const labaDitahan = findRow('3-2000')?.credit_balance ?? 0;
  const currentNetIncome = netIncome;
  const totalEquity = modalPemilik + labaDitahan + currentNetIncome;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
  const isBalanceSheetBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1;

  // Nilai fisik stok ban untuk perbandingan audit opname
  const totalInventoryPhysical = products.reduce((acc, p) => {
    const qty = p.product_quantity ?? p.stock ?? 0;
    const cost = p.product_cost ?? p.cost_price ?? 0;
    return acc + qty * cost;
  }, 0);

  // Rasio Likuiditas Ringkas untuk Owner
  const currentRatio = totalLiabilities > 0 ? (totalCurrentAssets / totalLiabilities) : 999;
  const isLiquiditySafe = currentRatio >= 1.5;

  return {
    grossSales,
    discounts,
    netSales,
    totalHpp,
    grossProfit,
    grossProfitMargin,
    expenseBreakdown,
    totalExpenses,
    netIncome,
    netProfitMargin,
    // Neraca
    kasLaci,
    bankBca,
    liquidCash,
    piutangDagang,
    persediaanBuku,
    totalCurrentAssets,
    peralatanMesin,
    akumulasiPenyusutan,
    netFixedAssets,
    totalAssets,
    hutangSupplier,
    ppnKeluaran,
    totalLiabilities,
    modalPemilik,
    labaDitahan,
    currentNetIncome,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanceSheetBalanced,
    totalInventoryPhysical,
    currentRatio,
    isLiquiditySafe,
  };
};

// ==============================================================================
// 8. KALKULATOR LAPORAN ARUS KAS RINGKAS SAK EMKM (STATEMENT OF CASH FLOWS)
// ==============================================================================
export const calculateCashFlowStatement = (
  journals: JournalEntry[],
  initialBalances: Record<string, number> = {},
  startDate?: string,
  endDate?: string
): CashFlowStatementResult => {
  const postedJournals = journals.filter((j) => {
    if (j.status !== 'POSTED') return false;
    if (startDate && j.date < startDate) return false;
    if (endDate && j.date > endDate) return false;
    return true;
  });

  // Hitung saldo awal kas & bank sebelum startDate
  let beginningCashDrawer = initialBalances['1-1000'] || 0;
  let beginningBankBca = initialBalances['1-1001'] || 0;

  if (startDate) {
    journals
      .filter((j) => j.status === 'POSTED' && j.date < startDate)
      .forEach((j) => {
        j.lines.forEach((l) => {
          if (l.account_code === '1-1000') {
            beginningCashDrawer += (l.debit - l.credit);
          } else if (l.account_code === '1-1001') {
            beginningBankBca += (l.debit - l.credit);
          }
        });
      });
  }

  const beginningCash = beginningCashDrawer + beginningBankBca;

  // Komponen Arus Kas
  let cashFromSales = 0;
  let cashFromReceivables = 0;
  let cashPaidForExpenses = 0;
  let cashPaidForInventory = 0;
  let cashPaidForFixedAssets = 0;
  let cashPaidForPayables = 0;
  let cashFromCapital = 0;

  let netCashDrawerChange = 0;
  let netBankBcaChange = 0;

  postedJournals.forEach((j) => {
    const cashLines = j.lines.filter((l) => l.account_code === '1-1000' || l.account_code === '1-1001');
    if (cashLines.length === 0) return;

    cashLines.forEach((cl) => {
      if (cl.account_code === '1-1000') {
        netCashDrawerChange += (cl.debit - cl.credit);
      } else {
        netBankBcaChange += (cl.debit - cl.credit);
      }
    });

    // Klasifikasikan pos pendamping dalam jurnal
    const nonCashLines = j.lines.filter((l) => l.account_code !== '1-1000' && l.account_code !== '1-1001');

    nonCashLines.forEach((ncl) => {
      // 1. Operasi - Penerimaan Penjualan Tunai
      if (ncl.account_code.startsWith('4-')) {
        cashFromSales += ncl.credit;
      }
      // 1. Operasi - Pelunasan Piutang Pelanggan (AR)
      else if (ncl.account_code === '1-1002') {
        cashFromReceivables += ncl.credit;
      }
      // 1. Operasi - Pembayaran Beban Operasional Usaha
      else if (ncl.account_code.startsWith('6-')) {
        cashPaidForExpenses += ncl.debit;
      }
      // 1. Operasi - Pembelian Persediaan Ban Baru Tunai
      else if (ncl.account_code === '1-2000' && ncl.debit > 0) {
        cashPaidForInventory += ncl.debit;
      }
      // 2. Investasi - Pembelian Peralatan Bengkel / Mesin Spooring
      else if (ncl.account_code === '1-3000' && ncl.debit > 0) {
        cashPaidForFixedAssets += ncl.debit;
      }
      // 3. Pendanaan - Pembayaran Hutang Supplier Distributor Ban
      else if (ncl.account_code === '2-1000' && ncl.debit > 0) {
        cashPaidForPayables += ncl.debit;
      }
      // 3. Pendanaan - Setoran Modal Pemilik
      else if (ncl.account_code === '3-1000' && ncl.credit > 0) {
        cashFromCapital += ncl.credit;
      }
    });
  });

  const totalOperatingInflows = cashFromSales + cashFromReceivables;
  const totalOperatingOutflows = cashPaidForExpenses + cashPaidForInventory;
  const netOperatingCashFlow = totalOperatingInflows - totalOperatingOutflows;

  const netInvestingCashFlow = -cashPaidForFixedAssets;
  const netFinancingCashFlow = cashFromCapital - cashPaidForPayables;

  const netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow;
  const endingCash = beginningCash + netCashFlow;
  const cashDrawerEnding = beginningCashDrawer + netCashDrawerChange;
  const bankBcaEnding = beginningBankBca + netBankBcaChange;

  return {
    cashFromSales,
    cashFromReceivables,
    totalOperatingInflows,
    cashPaidForExpenses,
    cashPaidForInventory,
    totalOperatingOutflows,
    netOperatingCashFlow,
    cashPaidForFixedAssets,
    netInvestingCashFlow,
    cashPaidForPayables,
    cashFromCapital,
    netFinancingCashFlow,
    netCashFlow,
    beginningCash,
    endingCash,
    cashDrawerEnding,
    bankBcaEnding,
  };
};

// Kompatibilitas fungsi lama
export const calculateSakEmkmFinancials = (
  transactions: PosTransaction[],
  expenses: ExpenseRecord[],
  products: TireProduct[],
  cashInDrawer: number
) => {
  // Panggil wrapper sederhana untuk mempertahankan kompatibilitas bila diperlukan
  const lunasTransactions = transactions.filter((t) => t.status === 'LUNAS');
  const grossSales = lunasTransactions.reduce((acc, t) => acc + (t.subtotal ?? t.grand_total ?? 0), 0);
  const discounts = lunasTransactions.reduce((acc, t) => acc + (t.total_discount ?? t.discount_amount ?? 0), 0);
  const netSales = grossSales - discounts;
  const totalHpp = lunasTransactions.reduce((acc, t) => acc + (t.total_hpp ?? t.total_cost_hpp ?? 0), 0);
  const grossProfit = netSales - totalHpp;
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netIncome = grossProfit - totalExpenses;

  const totalInventoryValuation = products.reduce((acc, p) => {
    const qty = p.product_quantity ?? p.stock ?? 0;
    const cost = p.product_cost ?? p.cost_price ?? 0;
    return acc + qty * cost;
  }, 0);

  const bankBcaEstimate = Math.max(15000000, 25000000 + (netSales * 0.4) - (totalExpenses * 0.7));
  const totalCurrentAssets = cashInDrawer + bankBcaEstimate + totalInventoryValuation;
  const fixedAssets = 85000000;
  const accumulatedDepreciation = -12500000;
  const netFixedAssets = fixedAssets + accumulatedDepreciation;
  const totalAssets = totalCurrentAssets + netFixedAssets;

  const accountsPayableDistributor = 15400000;
  const totalLiabilities = accountsPayableDistributor;
  const initialCapitalOwner = 150000000;
  const retainedEarnings = totalAssets - totalLiabilities - initialCapitalOwner;
  const totalEquity = initialCapitalOwner + retainedEarnings;

  return {
    grossSales,
    discounts,
    netSales,
    totalHpp,
    grossProfit,
    totalExpenses,
    netIncome,
    totalInventoryValuation,
    bankBcaEstimate,
    totalCurrentAssets,
    netFixedAssets,
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
};
