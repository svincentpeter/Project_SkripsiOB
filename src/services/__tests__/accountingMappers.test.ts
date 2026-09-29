import { describe, expect, it } from 'vitest';
import { expenseFormData, mapAccount, mapExpense, mapJournalPage, mapLedger, mapTrialBalance } from '../api/accountingMappers';
import type { ApiExpense, ApiJournalPage, ApiLedger, ApiTrialBalance } from '../api/accountingMappers';

const apiExpense: ApiExpense = {
  id: 7, reference: 'BKK-202609-0003', expense_date: '2026-09-10',
  category: { id: 2, code: 'LISTRIK', name: 'Listrik & Air (PLN/PDAM)', account_code: '6-1001' },
  amount: '350000.00', payment_method: 'TUNAI', bank_name: null, recipient_name: 'PLN', description: 'Tagihan listrik',
  attachment_url: '/storage/expenses/a.jpg', approved_by: 'Owner', status: 'ACTIVE',
  void_reason: null, voided_by: null, voided_at: null, created_at: '2026-09-10T08:00:00+07:00',
};

describe('accountingMappers', () => {
  it('mapAccount membawa status aktif akun', () => {
    const base = { id: 1, account_code: '6-1099', account_name: 'Beban Lama', account_type: 'EXPENSE', normal_balance: 'DEBIT' } as const;
    expect(mapAccount({ ...base, is_active: false }).is_active).toBe(false);
    expect(mapAccount({ ...base, is_active: true }).is_active).toBe(true);
  });

  it('mapExpense memetakan BKK server ke ExpenseRecord', () => {
    const e = mapExpense(apiExpense);
    expect(e.id).toBe('7');
    expect(e.bkk_number).toBe('BKK-202609-0003');
    expect(e.category).toBe('Listrik & Air (PLN/PDAM)');
    expect(e.category_code).toBe('6-1001');
    expect(e.amount).toBe(350000);
    expect(e.cash_source).toBe('Kas Tunai Laci Kasir');
    expect(e.receipt_image).toMatch(/\/storage\/expenses\/a\.jpg$/);
    expect(mapExpense({ ...apiExpense, payment_method: 'TRANSFER_BCA' }).cash_source).toBe('Rekening Bank BCA (Cabang 3)');
  });

  it('expenseFormData menyusun multipart dengan foto nota terkompresi', () => {
    const record = { ...mapExpense(apiExpense), cash_source: 'Rekening Bank BCA (Cabang 3)' as const, receipt_image: 'data:image/jpeg;base64,/9j/4AAQ' };
    const form = expenseFormData(record, 2);
    expect(form.get('category_id')).toBe('2');
    expect(form.get('amount')).toBe('350000');
    expect(form.get('payment_method')).toBe('TRANSFER_BCA');
    expect(form.get('bank_name')).toBe('BCA');
    const file = form.get('attachment') as File;
    expect(file.type).toBe('image/jpeg');
    expect(file.name).toBe('nota.jpeg');
    expect(expenseFormData(mapExpense(apiExpense), 2).get('attachment')).toBeNull();
  });

  it('mapTrialBalance dan mapLedger mengubah angka string menjadi number', () => {
    const tb: ApiTrialBalance = {
      as_of: '2026-09-30', total_debit: 100, total_credit: 100, difference: 0, is_balanced: true,
      accounts: [{ account_code: '1-1000', account_name: 'Kas', account_type: 'ASSET', normal_balance: 'DEBIT', debit: '100.00', credit: 0 }],
    };
    expect(mapTrialBalance(tb).rows[0]).toEqual({ account_code: '1-1000', account_name: 'Kas', account_type: 'ASSET', debit_balance: 100, credit_balance: 0 });

    const ledger: ApiLedger = {
      account: { account_code: '1-1000', account_name: 'Kas', account_type: 'ASSET', normal_balance: 'DEBIT' },
      start_date: '2026-09-01', end_date: '2026-09-30', opening_balance: 500, total_debit: 100, total_credit: 0, ending_balance: 600,
      mutations: [{ id: 3, entry_number: 'JRN-202609-0001', date: '2026-09-02', reference_type: 'POS_SALE', reference_id: 'OB3-INV-1', description: 'Jual', note: null, debit: 100, credit: 0, running_balance: 600 }],
    };
    const mapped = mapLedger(ledger);
    expect(mapped.initial_balance).toBe(500);
    expect(mapped.transactions[0]).toMatchObject({ journal_number: 'JRN-202609-0001', ref_doc: 'OB3-INV-1', running_balance: 600 });
  });

  it('mapJournalPage membawa status pembalikan', () => {
    const page: ApiJournalPage = {
      current_page: 1, last_page: 3, total: 51, total_debit: 1000, total_credit: 1000,
      items: [{ id: 1, entry_number: 'JRN-202609-0009', entry_date: '2026-09-05', reference_type: 'MANUAL_ADJUSTMENT', reference_id: 'MEMO-202609-0001', description: 'Koreksi', total_debit: 1000, total_credit: 1000, can_reverse: true, reversed_by: null, reversal_of: null, created_by_name: 'Owner', lines: [] }],
    };
    const mapped = mapJournalPage(page);
    expect(mapped.lastPage).toBe(3);
    expect(mapped.journals[0]).toMatchObject({ journal_number: 'JRN-202609-0009', reference_type: 'MANUAL_ADJUSTMENT', can_reverse: true });
  });
});
