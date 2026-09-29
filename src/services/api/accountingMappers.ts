import type { CashSource, ChartOfAccount, ExpenseCategory, ExpenseRecord, JournalEntry, LedgerAccountSummary, TrialBalanceResult } from '../../shared/types';
import { assetUrl } from './apiClient';
import { ApiJournal, mapJournal } from './posMappers';

const num = (v: unknown): number => Number(v) || 0;

type AccountType = ChartOfAccount['account_type'];
type NormalBalance = ChartOfAccount['normal_balance'];

export interface ApiAccount {
  id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  is_active: boolean;
}

export interface ApiTrialBalance {
  as_of: string;
  accounts: { account_code: string; account_name: string; account_type: AccountType; normal_balance: NormalBalance; debit: number | string; credit: number | string }[];
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
}

export interface ApiLedger {
  account: { account_code: string; account_name: string; account_type: AccountType; normal_balance: NormalBalance };
  start_date: string | null;
  end_date: string | null;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  ending_balance: number;
  mutations: {
    id: number; entry_number: string; date: string; reference_type: string; reference_id: string;
    description: string; note: string | null; debit: number; credit: number; running_balance: number;
  }[];
}

export interface ApiJournalPage {
  items: ApiJournal[];
  current_page: number;
  last_page: number;
  total: number;
  total_debit: number;
  total_credit: number;
}

export interface JournalPage {
  journals: JournalEntry[];
  currentPage: number;
  lastPage: number;
  total: number;
  totalDebit: number;
  totalCredit: number;
}

export interface ApiExpenseCategory {
  id: number;
  code: string;
  name: string;
  account_code: string;
}

export interface ApiExpense {
  id: number;
  reference: string;
  expense_date: string;
  category: ApiExpenseCategory | null;
  amount: number | string;
  payment_method: string;
  bank_name: string | null;
  recipient_name: string;
  description: string;
  attachment_url: string | null;
  approved_by: string;
  status: 'ACTIVE' | 'VOID';
  void_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  created_at: string | null;
}

export const mapAccount = (a: ApiAccount): ChartOfAccount => ({
  account_code: a.account_code,
  account_name: a.account_name,
  account_type: a.account_type,
  normal_balance: a.normal_balance,
  is_active: a.is_active,
});

export const mapTrialBalance = (tb: ApiTrialBalance): TrialBalanceResult => ({
  rows: tb.accounts.map((r) => ({
    account_code: r.account_code,
    account_name: r.account_name,
    account_type: r.account_type,
    debit_balance: num(r.debit),
    credit_balance: num(r.credit),
  })),
  total_debit: num(tb.total_debit),
  total_credit: num(tb.total_credit),
  is_balanced: tb.is_balanced,
  difference: num(tb.difference),
});

export const mapLedger = (l: ApiLedger): LedgerAccountSummary => ({
  account_code: l.account.account_code,
  account_name: l.account.account_name,
  account_type: l.account.account_type,
  normal_balance: l.account.normal_balance,
  initial_balance: num(l.opening_balance),
  total_debit: num(l.total_debit),
  total_credit: num(l.total_credit),
  ending_balance: num(l.ending_balance),
  transactions: l.mutations.map((m) => ({
    id: String(m.id),
    journal_id: m.entry_number,
    journal_number: m.entry_number,
    date: m.date,
    ref_doc: m.reference_id,
    description: m.description,
    debit: num(m.debit),
    credit: num(m.credit),
    running_balance: num(m.running_balance),
    note: m.note ?? undefined,
  })),
});

export const mapJournalPage = (p: ApiJournalPage): JournalPage => ({
  journals: p.items.map(mapJournal),
  currentPage: p.current_page,
  lastPage: p.last_page,
  total: p.total,
  totalDebit: num(p.total_debit),
  totalCredit: num(p.total_credit),
});

const CASH_METHODS = ['TUNAI', 'KAS_LACI'];

export const mapExpense = (e: ApiExpense): ExpenseRecord => ({
  id: String(e.id),
  reference: e.reference,
  expense_number: e.reference,
  bkk_number: e.reference,
  date: e.expense_date,
  category: (e.category?.name ?? '') as ExpenseCategory,
  category_id: e.category?.id,
  category_code: e.category?.account_code,
  amount: num(e.amount),
  cash_source: (CASH_METHODS.includes(e.payment_method) ? 'Kas Tunai Laci Kasir' : 'Rekening Bank BCA (Cabang 3)') as CashSource,
  payment_method: e.payment_method,
  bank_name: e.bank_name ?? undefined,
  paid_to: e.recipient_name,
  description: e.description,
  receipt_image: e.attachment_url ? assetUrl(e.attachment_url) : undefined,
  attachment_path: e.attachment_url ?? undefined,
  approved_by: e.approved_by,
  status: e.status,
  void_reason: e.void_reason ?? undefined,
  voided_by: e.voided_by ?? undefined,
  voided_at: e.voided_at ?? undefined,
  created_at: e.created_at ?? '',
});

/** Data URL hasil kompresi foto nota → Blob untuk diunggah multipart. */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};

/** Payload multipart POST /expenses dari isian form beban. */
export const expenseFormData = (e: ExpenseRecord, categoryId: number): FormData => {
  const isCash = e.cash_source.includes('Laci');
  const form = new FormData();
  form.append('expense_date', e.date);
  form.append('category_id', String(categoryId));
  form.append('amount', String(e.amount));
  form.append('payment_method', isCash ? 'TUNAI' : 'TRANSFER_BCA');
  if (!isCash) form.append('bank_name', e.bank_name || 'BCA');
  form.append('recipient_name', e.paid_to);
  form.append('description', e.description);
  if (e.receipt_image?.startsWith('data:')) {
    const blob = dataUrlToBlob(e.receipt_image);
    form.append('attachment', blob, `nota.${blob.type.split('/')[1] ?? 'jpg'}`);
  }
  return form;
};
