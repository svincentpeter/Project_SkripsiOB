// Tipe SP4 (SAK EMKM): aset tetap, penyusutan, AJP, rekonsiliasi bank, CALK. Bentuk kabel = bentuk UI.

export type FixedAssetCategory = 'PERALATAN_BENGKEL' | 'INVENTARIS_TOKO' | 'KENDARAAN';
export type FixedAssetFunding = 'TUNAI' | 'TRANSFER' | 'OPENING';

export interface FixedAsset {
  id: number;
  code: string;
  name: string;
  category: FixedAssetCategory;
  category_label: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  /** YYYY-MM, bulan pertama yang disusutkan sistem. */
  depreciation_start: string;
  opening_accumulated_depreciation: number;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  last_depreciated_period: string | null;
  funding: FixedAssetFunding;
  journal_entry_number: string | null;
  status: 'ACTIVE' | 'VOID';
  notes: string | null;
  void_reason: string | null;
}

export interface FixedAssetRegister {
  assets: FixedAsset[];
  summary: {
    total_cost: number;
    total_accumulated: number;
    total_book_value: number;
    ledger_cost: number;
    ledger_accumulated: number;
    difference_cost: number;
    difference_accumulated: number;
  };
}

export interface FixedAssetInput {
  name: string;
  category: FixedAssetCategory;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  funding: FixedAssetFunding;
  /** Hanya untuk OPENING. */
  depreciation_start?: string;
  /** Hanya untuk OPENING. */
  opening_accumulated_depreciation?: number;
  notes?: string;
}

export interface DepreciationPreview {
  period: string;
  end_date: string;
  is_locked: boolean;
  blocked_reason: string | null;
  lines: { fixed_asset_id: number; code: string; name: string; amount: number }[];
  total: number;
  posted: { entry_number: string; entry_date: string; total: number }[];
}

export type AdjustingKind = 'ACCRUAL' | 'PREPAID';

export interface AdjustingEntryInput {
  period: string;
  kind: AdjustingKind;
  account_code: string;
  amount: number;
  description: string;
  auto_reverse: boolean;
}

export interface BankStatementLine {
  id: number;
  statement_date: string;
  description: string;
  /** Positif = uang masuk ke bank, negatif = keluar. */
  amount: number;
  source: 'MANUAL' | 'CSV';
  journal_item_id: number | null;
  matched_entry_number: string | null;
  matched_reference_type: string | null;
  matched_entry_date: string | null;
}

export interface OutstandingLedgerItem {
  journal_item_id: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  description: string;
  debit: number;
  credit: number;
  /** Nomor jurnal pasangan (asli ↔ pembalik) yang juga belum muncul di rekening koran; bersih keduanya nol. */
  reversal_pair?: string | null;
}

export interface BankReconciliationReport {
  period: string;
  start_date: string;
  end_date: string;
  cutover_date: string;
  statement_ending_balance: number | null;
  book_balance: number;
  lines: BankStatementLine[];
  outstanding_ledger: OutstandingLedgerItem[];
  unrecorded_bank: BankStatementLine[];
  deposits_in_transit: number;
  outstanding_payments: number;
  unrecorded_credits: number;
  unrecorded_debits: number;
  adjusted_bank_balance: number | null;
  adjusted_book_balance: number;
  difference: number | null;
  is_reconciled: boolean;
}

export interface CalkLine {
  code: string | null;
  name: string;
  amount: number;
}

export interface CalkFixedAsset {
  code: string;
  name: string;
  category: string;
  acquisition_date: string;
  useful_life_months: number;
  cost: number;
  accumulated: number;
  book_value: number;
}

export interface CalkReport {
  period: string;
  start_date: string;
  end_date: string;
  entity: { name: string; address: string; activity: string; legal_form: string; tax_status: string; currency: string };
  compliance: string;
  policies: { title: string; body: string }[];
  notes: {
    cash_and_bank: { lines: CalkLine[]; total: number; bank_statement_balance: number | null; bank_reconciled: boolean | null };
    inventory: { ledger_balance: number; method: string; breakdown: { category: string; quantity: number; value: number }[]; breakdown_as_of: string | null };
    prepaid_expenses: { balance: number };
    accrued_expenses: { balance: number };
    fixed_assets: {
      assets: CalkFixedAsset[];
      total_cost: number;
      total_accumulated: number;
      total_book_value: number;
      ledger_cost: number;
      ledger_accumulated: number;
      depreciation_expense: number;
    };
    payables: { suppliers: { supplier_name: string; amount: number }[]; subledger_total: number; other_adjustments: number; ledger_balance: number };
    equity: { lines: CalkLine[]; total: number };
  };
}
