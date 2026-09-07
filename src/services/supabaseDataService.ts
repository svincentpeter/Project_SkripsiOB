import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  ProductItem,
  ServiceMasterItem,
  SupplierItem,
  PosTransaction,
  ParkedTransaction,
  ExpenseRecord,
  StockMutation,
  JournalEntry,
  SalesBookingRecord,
  PayableInvoice,
  ReceivableInvoice,
  StoreSettings,
  UserAccount,
  RolePermissionsConfig,
  AccountingPeriodInfo,
} from '../shared/types';

// ============================================================================
// 1. PRODUCTS
// ============================================================================
export const fetchProductsFromSupabase = async (): Promise<ProductItem[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('products').select('*').order('product_name', { ascending: true });
    if (error) {
      console.warn('[Supabase] Gagal mengambil products:', error.message);
      return null;
    }
    return data as ProductItem[];
  } catch (err) {
    console.warn('[Supabase] Error fetchProducts:', err);
    return null;
  }
};

export const upsertProductToSupabase = async (product: ProductItem): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const payload = {
      ...product,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('products').upsert(payload);
    if (error) {
      console.warn('[Supabase] Gagal upsert product:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error upsertProduct:', err);
    return false;
  }
};

export const deleteProductFromSupabase = async (productId: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) {
      console.warn('[Supabase] Gagal delete product:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleteProduct:', err);
    return false;
  }
};

// ============================================================================
// 2. SERVICES
// ============================================================================
export const fetchServicesFromSupabase = async (): Promise<ServiceMasterItem[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('services').select('*').order('service_name', { ascending: true });
    if (error) {
      console.warn('[Supabase] Gagal mengambil services:', error.message);
      return null;
    }
    return data as ServiceMasterItem[];
  } catch (err) {
    console.warn('[Supabase] Error fetchServices:', err);
    return null;
  }
};

export const upsertServiceToSupabase = async (service: ServiceMasterItem): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('services').upsert(service);
    if (error) {
      console.warn('[Supabase] Gagal upsert service:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error upsertService:', err);
    return false;
  }
};

// ============================================================================
// 3. SUPPLIERS
// ============================================================================
export const fetchSuppliersFromSupabase = async (): Promise<SupplierItem[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('suppliers').select('*').order('supplier_name', { ascending: true });
    if (error) {
      console.warn('[Supabase] Gagal mengambil suppliers:', error.message);
      return null;
    }
    return data as SupplierItem[];
  } catch (err) {
    console.warn('[Supabase] Error fetchSuppliers:', err);
    return null;
  }
};

export const upsertSupplierToSupabase = async (supplier: SupplierItem): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('suppliers').upsert(supplier);
    if (error) {
      console.warn('[Supabase] Gagal upsert supplier:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error upsertSupplier:', err);
    return false;
  }
};

// ============================================================================
// 4. POS TRANSACTIONS
// ============================================================================
export const fetchTransactionsFromSupabase = async (): Promise<PosTransaction[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('pos_transactions').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] Gagal mengambil pos_transactions:', error.message);
      return null;
    }
    return data as PosTransaction[];
  } catch (err) {
    console.warn('[Supabase] Error fetchTransactions:', err);
    return null;
  }
};

export const insertTransactionToSupabase = async (tx: PosTransaction): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('pos_transactions').insert(tx);
    if (error) {
      console.warn('[Supabase] Gagal insert pos_transaction:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error insertTransaction:', err);
    return false;
  }
};

export const updateTransactionStatusInSupabase = async (
  txId: string,
  status: string,
  voidData?: { is_voided: boolean; void_reason?: string; voided_at?: string; voided_by?: string }
): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const payload: Record<string, any> = { status };
    if (voidData) {
      payload.is_voided = voidData.is_voided;
      payload.void_reason = voidData.void_reason;
      payload.voided_at = voidData.voided_at;
      payload.voided_by = voidData.voided_by;
    }
    const { error } = await supabase.from('pos_transactions').update(payload).eq('id', txId);
    if (error) {
      console.warn('[Supabase] Gagal update transaksi status:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error updateTransactionStatus:', err);
    return false;
  }
};

// ============================================================================
// 5. PARKED TRANSACTIONS
// ============================================================================
export const fetchParkedOrdersFromSupabase = async (): Promise<ParkedTransaction[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('parked_transactions').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] Gagal mengambil parked_transactions:', error.message);
      return null;
    }
    return data as ParkedTransaction[];
  } catch (err) {
    console.warn('[Supabase] Error fetchParkedOrders:', err);
    return null;
  }
};

export const upsertParkedOrderToSupabase = async (order: ParkedTransaction): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('parked_transactions').upsert(order);
    if (error) {
      console.warn('[Supabase] Gagal upsert parked_transaction:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error upsertParkedOrder:', err);
    return false;
  }
};

export const deleteParkedOrderFromSupabase = async (orderId: string): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('parked_transactions').delete().eq('id', orderId);
    if (error) {
      console.warn('[Supabase] Gagal delete parked_transaction:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleteParkedOrder:', err);
    return false;
  }
};

// ============================================================================
// 6. EXPENSES
// ============================================================================
export const fetchExpensesFromSupabase = async (): Promise<ExpenseRecord[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] Gagal mengambil expenses:', error.message);
      return null;
    }
    return data as ExpenseRecord[];
  } catch (err) {
    console.warn('[Supabase] Error fetchExpenses:', err);
    return null;
  }
};

export const insertExpenseToSupabase = async (expense: ExpenseRecord): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('expenses').insert(expense);
    if (error) {
      console.warn('[Supabase] Gagal insert expense:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error insertExpense:', err);
    return false;
  }
};

export const updateExpenseStatusInSupabase = async (
  expenseId: string,
  status: string,
  voidData?: { void_reason?: string; voided_at?: string; voided_by?: string; reversal_journal_id?: string }
): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const payload: Record<string, any> = { status };
    if (voidData) {
      if (voidData.void_reason) payload.void_reason = voidData.void_reason;
      if (voidData.voided_at) payload.voided_at = voidData.voided_at;
      if (voidData.voided_by) payload.voided_by = voidData.voided_by;
      if (voidData.reversal_journal_id) payload.reversal_journal_id = voidData.reversal_journal_id;
    }
    const { error } = await supabase.from('expenses').update(payload).eq('id', expenseId);
    if (error) {
      console.warn('[Supabase] Gagal update expense status:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error updateExpenseStatus:', err);
    return false;
  }
};

// ============================================================================
// 7. STOCK MUTATIONS
// ============================================================================
export const fetchStockMutationsFromSupabase = async (): Promise<StockMutation[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('stock_mutations').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] Gagal mengambil stock_mutations:', error.message);
      return null;
    }
    return data as StockMutation[];
  } catch (err) {
    console.warn('[Supabase] Error fetchStockMutations:', err);
    return null;
  }
};

export const insertStockMutationToSupabase = async (mutation: StockMutation): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('stock_mutations').insert(mutation);
    if (error) {
      console.warn('[Supabase] Gagal insert stock_mutation:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error insertStockMutation:', err);
    return false;
  }
};

// ============================================================================
// 8. JOURNAL ENTRIES
// ============================================================================
export const fetchJournalsFromSupabase = async (): Promise<JournalEntry[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('journal_entries').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('[Supabase] Gagal mengambil journal_entries:', error.message);
      return null;
    }
    return data as JournalEntry[];
  } catch (err) {
    console.warn('[Supabase] Error fetchJournals:', err);
    return null;
  }
};

export const insertJournalToSupabase = async (journal: JournalEntry): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('journal_entries').insert(journal);
    if (error) {
      console.warn('[Supabase] Gagal insert journal_entry:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error insertJournal:', err);
    return false;
  }
};

// ============================================================================
// 9. BOOKINGS, PAYABLES, RECEIVABLES
// ============================================================================
export const fetchBookingsFromSupabase = async (): Promise<SalesBookingRecord[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('sales_bookings').select('*').order('created_at', { ascending: false });
    if (error) return null;
    return data as SalesBookingRecord[];
  } catch {
    return null;
  }
};

export const upsertBookingToSupabase = async (booking: SalesBookingRecord): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('sales_bookings').upsert(booking);
    return !error;
  } catch {
    return false;
  }
};

export const fetchPayablesFromSupabase = async (): Promise<PayableInvoice[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('payable_invoices').select('*').order('date', { ascending: false });
    if (error) return null;
    return data as PayableInvoice[];
  } catch {
    return null;
  }
};

export const upsertPayableToSupabase = async (payable: PayableInvoice): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('payable_invoices').upsert(payable);
    return !error;
  } catch {
    return false;
  }
};

export const fetchReceivablesFromSupabase = async (): Promise<ReceivableInvoice[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('receivable_invoices').select('*').order('date', { ascending: false });
    if (error) return null;
    return data as ReceivableInvoice[];
  } catch {
    return null;
  }
};

export const upsertReceivableToSupabase = async (receivable: ReceivableInvoice): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('receivable_invoices').upsert(receivable);
    return !error;
  } catch {
    return false;
  }
};

// ============================================================================
// 10. STORE SETTINGS
// ============================================================================
export const fetchStoreSettingsFromSupabase = async (): Promise<StoreSettings | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('store_settings').select('*').eq('id', 'primary').single();
    if (error || !data) return null;
    return data as StoreSettings;
  } catch {
    return null;
  }
};

export const saveStoreSettingsToSupabase = async (settings: StoreSettings): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const payload = {
      ...settings,
      id: 'primary',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('store_settings').upsert(payload);
    return !error;
  } catch {
    return false;
  }
};

// ============================================================================
// 11. USERS & AUTH
// ============================================================================
export const fetchUsersFromSupabase = async (): Promise<UserAccount[] | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('users').select('*').order('role', { ascending: true });
    if (error || !data) {
      console.warn('[Supabase] Gagal fetch users:', error?.message);
      return null;
    }
    return data as UserAccount[];
  } catch (err) {
    console.warn('[Supabase] Error fetchUsers:', err);
    return null;
  }
};

export const upsertUserToSupabase = async (user: UserAccount): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('users').upsert(user);
    return !error;
  } catch {
    return false;
  }
};

// ============================================================================
// 12. ROLE PERMISSIONS
// ============================================================================
export const fetchRolePermissionsFromSupabase = async (): Promise<RolePermissionsConfig | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('role_permissions').select('*');
    if (error || !data || data.length === 0) return null;
    const config: any = {};
    data.forEach((row: any) => {
      config[row.role] = row.permissions;
    });
    return config as RolePermissionsConfig;
  } catch {
    return null;
  }
};

export const saveRolePermissionsToSupabase = async (config: RolePermissionsConfig): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const promises = Object.entries(config).map(([role, permissions]) =>
      supabase.from('role_permissions').upsert({
        role,
        permissions,
        updated_at: new Date().toISOString(),
      })
    );
    await Promise.all(promises);
    return true;
  } catch {
    return false;
  }
};

// ============================================================================
// 13. ACCOUNT BALANCES & PERIOD
// ============================================================================
export const fetchAccountBalancesFromSupabase = async (): Promise<Record<string, number> | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('account_balances').select('*');
    if (error || !data || data.length === 0) return null;
    const balances: Record<string, number> = {};
    data.forEach((row: any) => {
      balances[row.account_code] = parseFloat(row.balance);
    });
    return balances;
  } catch {
    return null;
  }
};

export const saveAccountBalancesToSupabase = async (balances: Record<string, number>): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const rows = Object.entries(balances).map(([account_code, balance]) => ({
      account_code,
      balance,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from('account_balances').upsert(rows);
    return !error;
  } catch {
    return false;
  }
};

export const fetchAccountingPeriodFromSupabase = async (): Promise<AccountingPeriodInfo | null> => {
  if (!isSupabaseConfigured() || !supabase) return null;
  try {
    const { data, error } = await supabase.from('accounting_period').select('*').limit(1).single();
    if (error || !data) return null;
    return data as AccountingPeriodInfo;
  } catch {
    return null;
  }
};

export const saveAccountingPeriodToSupabase = async (period: AccountingPeriodInfo): Promise<boolean> => {
  if (!isSupabaseConfigured() || !supabase) return false;
  try {
    const { error } = await supabase.from('accounting_period').upsert(period);
    return !error;
  } catch {
    return false;
  }
};
