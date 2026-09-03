import { 
  ChartOfAccount, 
  DebtPaymentInput, 
  ExpenseRecord, 
  GoodsReceiptInput, 
  JournalEntry, 
  LedgerAccountSummary, 
  LedgerTransaction, 
  ManualJournalInput, 
  PosTransaction, 
  TireProduct, 
  TrialBalanceResult, 
  TrialBalanceRow 
} from '../shared/types';
import { generateSalesJournal, generateExpenseJournal } from '../shared/utils/formatters';

export { generateSalesJournal, generateExpenseJournal };

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
  { account_code: '3-1000', account_name: 'Modal Disetor Pemilik', account_type: 'EQUITY', normal_balance: 'CREDIT', category_name: 'Ekuitas' },
  { account_code: '3-2000', account_name: 'Laba Ditahan Cabang 3', account_type: 'EQUITY', normal_balance: 'CREDIT', category_name: 'Ekuitas' },
  { account_code: '4-1000', account_name: 'Pendapatan Penjualan Ban Baru', account_type: 'REVENUE', normal_balance: 'CREDIT', category_name: 'Pendapatan Usaha' },
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
// 5. KALKULATOR BUKU BESAR (GENERAL LEDGER PER AKUN)
// ==============================================================================
export const calculateAccountLedger = (
  journals: JournalEntry[],
  accountCode: string,
  initialBalance: number = 0
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

  let runningBalance = initialBalance;
  let totalDebit = 0;
  let totalCredit = 0;
  const transactions: LedgerTransaction[] = [];

  sortedJournals.forEach((j) => {
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
  });

  return {
    account_code: accountMeta.account_code,
    account_name: accountMeta.account_name,
    account_type: accountMeta.account_type,
    normal_balance: accountMeta.normal_balance,
    initial_balance: initialBalance,
    total_debit: totalDebit,
    total_credit: totalCredit,
    ending_balance: runningBalance,
    transactions,
  };
};

// ==============================================================================
// 6. KALKULATOR NERACA SALDO (TRIAL BALANCE)
// ==============================================================================
export const calculateTrialBalance = (
  journals: JournalEntry[],
  initialBalances: Record<string, number> = {}
): TrialBalanceResult => {
  const postedJournals = journals.filter((j) => j.status === 'POSTED');

  const rows: TrialBalanceRow[] = SAK_EMKM_COA.map((account) => {
    const initial = initialBalances[account.account_code] || 0;
    let sumDebit = 0;
    let sumCredit = 0;

    postedJournals.forEach((j) => {
      j.lines.forEach((l) => {
        if (l.account_code === account.account_code) {
          sumDebit += l.debit;
          sumCredit += l.credit;
        }
      });
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
  products: TireProduct[] = []
) => {
  const trialBalance = calculateTrialBalance(journals, initialBalances);
  const findRow = (code: string) => trialBalance.rows.find((r) => r.account_code === code);

  // A. ELEMEN LABA RUGI (INCOME STATEMENT)
  const revRow = findRow('4-1000');
  const discRow = findRow('4-9000');
  const hppRow = findRow('5-1000');

  const grossSales = revRow?.credit_balance ?? 0;
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

  // B. ELEMEN POSISI KEUANGAN (NERACA / BALANCE SHEET)
  // 1. Aset Lancar
  const kasLaci = findRow('1-1000')?.debit_balance ?? 0;
  const bankBca = findRow('1-1001')?.debit_balance ?? 0;
  const piutangDagang = findRow('1-1002')?.debit_balance ?? 0;
  const persediaanBuku = findRow('1-2000')?.debit_balance ?? 0;
  const totalCurrentAssets = kasLaci + bankBca + piutangDagang + persediaanBuku;

  // 2. Aset Tetap
  const peralatanMesin = findRow('1-3000')?.debit_balance ?? 0;
  const akumulasiPenyusutan = findRow('1-3999')?.credit_balance ?? 0; // Bersifat pengurang
  const netFixedAssets = peralatanMesin - akumulasiPenyusutan;

  const totalAssets = totalCurrentAssets + netFixedAssets;

  // 3. Liabilitas
  const hutangSupplier = findRow('2-1000')?.credit_balance ?? 0;
  const ppnKeluaran = findRow('2-1003')?.credit_balance ?? 0;
  const totalLiabilities = hutangSupplier + ppnKeluaran;

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

  return {
    grossSales,
    discounts,
    netSales,
    totalHpp,
    grossProfit,
    expenseBreakdown,
    totalExpenses,
    netIncome,
    // Neraca
    kasLaci,
    bankBca,
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
