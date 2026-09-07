import React, { useState, useEffect } from 'react';
import { 
  AccountingPeriodInfo,
  ActiveScreen, 
  CartItem, 
  CreateProductInput, 
  DebtPaymentInput, 
  ExpenseRecord, 
  GoodsReceiptInput, 
  JournalEntry, 
  ManualJournalInput, 
  PayableInvoice, 
  PosTransaction, 
  ProductItem, 
  ParkedTransaction,
  ReceivableInvoice,
  ReceivablePaymentInput,
  RolePermissionsConfig,
  SalesBookingRecord, 
  ServiceMasterItem, 
  StockMutation, 
  StoreSettings, 
  SupplierItem, 
  TireProduct, 
  UserAccount,
  UserSession 
} from './shared/types';
import { 
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_USERS,
  INITIAL_ACCOUNT_BALANCES, 
  INITIAL_BOOKINGS, 
  INITIAL_EXPENSES, 
  INITIAL_JOURNALS, 
  INITIAL_PAYABLE_INVOICES, 
  INITIAL_PERIOD_INFO,
  INITIAL_PRODUCTS, 
  INITIAL_RECEIVABLES, 
  INITIAL_SERVICES, 
  INITIAL_STOCK_MUTATIONS, 
  INITIAL_STORE_SETTINGS, 
  INITIAL_SUPPLIERS, 
  INITIAL_TRANSACTIONS 
} from './shared/data/mockData';
import { LoginScreen } from './modules/auth';
import { formatRupiah, generateExpenseJournal, generateSalesJournal } from './shared/utils/formatters';
import { 
  generatePurchaseJournal, 
  generateDebtPaymentJournal, 
  generateManualJournal,
  generateVoidExpenseJournal,
  generateVoidSalesJournal,
  generateClosingJournal,
  generateReversingJournal,
  generateReceivablePaymentJournal
} from './services/accountingService';
import { 
  canSafelyDeleteProduct, 
  createProductWithInitialStock, 
  processGoodsReceipt 
} from './services/inventoryService';
import { 
  createServiceItem, 
  deleteOrToggleServiceItem, 
  updateServiceItem 
} from './services/serviceMasterService';
import { 
  createSupplierItem, 
  deleteOrToggleSupplierItem, 
  updateSupplierItem 
} from './services/supplierService';
import { PosScreen } from './modules/pos';
import { ThermalReceiptScreen } from './modules/receipt';
import { ExecutiveDashboardScreen } from './modules/dashboard';
import { InventoryScreen } from './modules/inventory';
import { ExpensesScreen } from './modules/expenses';
import { GeneralLedgerScreen } from './modules/accounting';
import { FinancialStatementsScreen } from './modules/accounting';
import { SettingsScreen } from './modules/settings';
import { ToastProvider, useToast, AppNotification } from './shared/components';
import { WireframeGuideModal } from './shared/components/WireframeGuideModal';
import { HeaderNavbar } from './shared/components/HeaderNavbar';
import { apiClient, productApi, posApi, expenseApi, inventoryApi } from './services/api';
import { 
  isSupabaseConfigured,
  testSupabaseConnection,
  fetchProductsFromSupabase,
  fetchServicesFromSupabase,
  fetchSuppliersFromSupabase,
  fetchTransactionsFromSupabase,
  fetchExpensesFromSupabase,
  fetchJournalsFromSupabase,
  fetchStockMutationsFromSupabase,
  fetchBookingsFromSupabase,
  fetchPayablesFromSupabase,
  fetchReceivablesFromSupabase,
  fetchParkedOrdersFromSupabase,
  fetchStoreSettingsFromSupabase,
  fetchUsersFromSupabase,
  upsertUserToSupabase,
  fetchRolePermissionsFromSupabase,
  saveRolePermissionsToSupabase,
  fetchAccountBalancesFromSupabase,
  saveAccountBalancesToSupabase,
  fetchAccountingPeriodFromSupabase,
  saveAccountingPeriodToSupabase,
  insertTransactionToSupabase,
  updateTransactionStatusInSupabase,
  upsertParkedOrderToSupabase,
  deleteParkedOrderFromSupabase,
  insertExpenseToSupabase,
  updateExpenseStatusInSupabase,
  upsertProductToSupabase,
  deleteProductFromSupabase,
  insertStockMutationToSupabase,
  insertJournalToSupabase,
  upsertBookingToSupabase,
  upsertPayableToSupabase,
  upsertReceivableToSupabase,
  saveStoreSettingsToSupabase,
} from './services';
import { Loader2 } from 'lucide-react';

export default function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}

function MainAppContent() {
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<UserSession | null>(() => {
    try {
      const saved = localStorage.getItem('ob3_user_session');
      return saved ? JSON.parse(saved) : DEFAULT_USERS[0];
    } catch {
      return DEFAULT_USERS[0];
    }
  });

  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(() => {
    try {
      const saved = localStorage.getItem('ob3_role_permissions');
      return saved ? JSON.parse(saved) : DEFAULT_ROLE_PERMISSIONS;
    } catch {
      return DEFAULT_ROLE_PERMISSIONS;
    }
  });

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [backendStatus, setBackendStatus] = useState<'supabase' | 'connected' | 'offline' | 'checking'>('checking');
  const [databaseName, setDatabaseName] = useState<string>('project-skripsi_ob');

  // Permission verification
  const isScreenPermitted = (screen: ActiveScreen): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === 'OWNER') return true;
    const roleConfig = rolePermissions[currentUser.role];
    if (!roleConfig) return true;

    switch (screen) {
      case 'dashboard':
        return !!roleConfig.dashboard;
      case 'pos':
        return !!roleConfig.pos;
      case 'receipt':
        return !!roleConfig.receipt;
      case 'inventory':
        return !!roleConfig.inventory_view;
      case 'expenses':
        return !!roleConfig.expenses;
      case 'ledger':
        return !!roleConfig.accounting_hub || !!roleConfig.bon_receivable || !!roleConfig.accounts_payable;
      case 'financials':
        return !!roleConfig.financial_reports;
      case 'settings':
        return !!roleConfig.role_settings;
      default:
        return true;
    }
  };

  // Auto-redirect if activeScreen is not permitted for current user
  useEffect(() => {
    if (currentUser && !isScreenPermitted(activeScreen)) {
      if (isScreenPermitted('pos')) {
        setActiveScreen('pos');
      } else if (isScreenPermitted('inventory')) {
        setActiveScreen('inventory');
      } else if (isScreenPermitted('dashboard')) {
        setActiveScreen('dashboard');
      } else {
        setActiveScreen('receipt');
      }
    }
  }, [currentUser, rolePermissions, activeScreen]);

  useEffect(() => {
    localStorage.setItem('ob3_role_permissions', JSON.stringify(rolePermissions));
  }, [rolePermissions]);

  // Master Users State (Synchronized with Supabase Database)
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  useEffect(() => {
    localStorage.setItem('ob3_users', JSON.stringify(users));
  }, [users]);

  // Notification Read & Dismiss Tracking
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_read_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_dismissed_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ob3_read_notif_ids', JSON.stringify(readNotifIds));
  }, [readNotifIds]);

  useEffect(() => {
    localStorage.setItem('ob3_dismissed_notif_ids', JSON.stringify(dismissedNotifIds));
  }, [dismissedNotifIds]);

  // Core Data persistent in LocalStorage
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('ob3_store_settings');
      return saved ? JSON.parse(saved) : INITIAL_STORE_SETTINGS;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });

  const [products, setProducts] = useState<ProductItem[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_products');
      return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    } catch {
      return INITIAL_PRODUCTS;
    }
  });

  const [services, setServices] = useState<ServiceMasterItem[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_services');
      return saved ? JSON.parse(saved) : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  });

  const [suppliers, setSuppliers] = useState<SupplierItem[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_suppliers');
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    } catch {
      return INITIAL_SUPPLIERS;
    }
  });

  const [bookings, setBookings] = useState<SalesBookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_bookings');
      return saved ? JSON.parse(saved) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
  });

  const [transactions, setTransactions] = useState<PosTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_transactions');
      return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
    } catch {
      return INITIAL_TRANSACTIONS;
    }
  });

  const [parkedOrders, setParkedOrders] = useState<ParkedTransaction[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_parked_orders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('ob3_parked_orders', JSON.stringify(parkedOrders));
  }, [parkedOrders]);

  const handleSaveParkedOrder = (order: ParkedTransaction) => {
    setParkedOrders((prev) => [order, ...prev.filter((o) => o.id !== order.id)]);
    upsertParkedOrderToSupabase(order);
  };

  const handleDeleteParkedOrder = (orderId: string) => {
    setParkedOrders((prev) => prev.filter((o) => o.id !== orderId));
    deleteParkedOrderFromSupabase(orderId);
  };

  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_expenses');
      return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  });

  const [mutations, setMutations] = useState<StockMutation[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_mutations');
      return saved ? JSON.parse(saved) : INITIAL_STOCK_MUTATIONS;
    } catch {
      return INITIAL_STOCK_MUTATIONS;
    }
  });

  const [journals, setJournals] = useState<JournalEntry[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_journals');
      return saved ? JSON.parse(saved) : INITIAL_JOURNALS;
    } catch {
      return INITIAL_JOURNALS;
    }
  });

  const [cashInDrawer, setCashInDrawer] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ob3_cash_drawer');
      return saved ? JSON.parse(saved) : 2450000;
    } catch {
      return 2450000;
    }
  });

  const [payableInvoices, setPayableInvoices] = useState<PayableInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_payable_invoices');
      return saved ? JSON.parse(saved) : INITIAL_PAYABLE_INVOICES;
    } catch {
      return INITIAL_PAYABLE_INVOICES;
    }
  });

  const [accountBalances, setAccountBalances] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('ob3_account_balances');
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNT_BALANCES;
    } catch {
      return INITIAL_ACCOUNT_BALANCES;
    }
  });

  const [receivableInvoices, setReceivableInvoices] = useState<ReceivableInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_receivable_invoices');
      return saved ? JSON.parse(saved) : INITIAL_RECEIVABLES;
    } catch {
      return INITIAL_RECEIVABLES;
    }
  });

  const [periodInfo, setPeriodInfo] = useState<AccountingPeriodInfo>(() => {
    try {
      const saved = localStorage.getItem('ob3_period_info');
      return saved ? JSON.parse(saved) : INITIAL_PERIOD_INFO;
    } catch {
      return INITIAL_PERIOD_INFO;
    }
  });

  // Active Cart in POS
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('ob3_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Selected transaction for receipt view
  const [currentReceiptTx, setCurrentReceiptTx] = useState<PosTransaction | null>(null);

  // Simulation & Modal states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEmptyState, setIsEmptyState] = useState<boolean>(false);
  const [showWireframeModal, setShowWireframeModal] = useState<boolean>(false);

  // Live time string
  const [timeString, setTimeString] = useState<string>('');

  // Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        new Intl.DateTimeFormat('id-ID', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }).format(now)
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 100% Dynamic Notifications derived directly from database records
  const notifications: AppNotification[] = React.useMemo(() => {
    const list: AppNotification[] = [];

    // 1. Stok Kritis (Produk di bawah ambang batas)
    products
      .filter((p) => {
        const qty = p.product_quantity ?? p.stock ?? 0;
        const alertThreshold = p.product_stock_alert ?? p.min_stock ?? 5;
        return qty < alertThreshold;
      })
      .slice(0, 5)
      .forEach((p) => {
        const id = `notif-stock-${p.id}`;
        if (dismissedNotifIds.includes(id)) return;
        const qty = p.product_quantity ?? p.stock ?? 0;
        list.push({
          id,
          type: 'STOCK_LOW',
          title: `Stok Kritis: ${p.product_name || p.name}`,
          description: `Sisa stok tinggal ${qty} unit (di bawah ambang batas ${p.product_stock_alert ?? p.min_stock ?? 5} unit). Segera buat PO restock.`,
          timestamp: 'Stok Realtime',
          isRead: readNotifIds.includes(id),
        });
      });

    // 2. Booking DP Aktif
    bookings
      .filter((b) => b.status === 'ACTIVE')
      .slice(0, 3)
      .forEach((b) => {
        const id = `notif-book-${b.id}`;
        if (dismissedNotifIds.includes(id)) return;
        list.push({
          id,
          type: 'BOOKING_NEW',
          title: `Booking DP: ${b.customer_name}`,
          description: `${b.customer_name} (${b.vehicle_plate}) DP ${formatRupiah(b.dp_amount)} untuk ${b.items?.length || 0} item pesanan.`,
          timestamp: b.date || 'Hari ini',
          isRead: readNotifIds.includes(id),
        });
      });

    // 3. Jatuh Tempo Hutang Distributor
    payableInvoices
      .filter((p) => p.status !== 'LUNAS')
      .slice(0, 3)
      .forEach((p) => {
        const id = `notif-debt-${p.id}`;
        if (dismissedNotifIds.includes(id)) return;
        list.push({
          id,
          type: 'DEBT_DUE',
          title: `Hutang Supplier: ${p.supplier_name}`,
          description: `Faktur ${p.invoice_number} sisa tagihan ${formatRupiah(p.remaining_amount)} (Jatuh tempo: ${p.due_date}).`,
          timestamp: p.due_date || 'Segera',
          isRead: readNotifIds.includes(id),
        });
      });

    // 4. Piutang Pelanggan (Faktur BON)
    receivableInvoices
      .filter((r) => r.status !== 'LUNAS')
      .slice(0, 3)
      .forEach((r) => {
        const id = `notif-rec-${r.id}`;
        if (dismissedNotifIds.includes(id)) return;
        list.push({
          id,
          type: 'BON_OVERDUE',
          title: `Piutang BON: ${r.customer_name}`,
          description: `Faktur BON ${r.invoice_number} sisa tagihan ${formatRupiah(r.remaining_amount)} belum lunas.`,
          timestamp: r.due_date || 'Tempo',
          isRead: readNotifIds.includes(id),
        });
      });

    return list;
  }, [products, bookings, payableInvoices, receivableInvoices, readNotifIds, dismissedNotifIds]);

  // Synchronize state with Supabase PostgreSQL Cloud or Laravel REST API on mount
  useEffect(() => {
    let isMounted = true;
    const syncBackend = async () => {
      // 1. Cek koneksi ke Supabase PostgreSQL Cloud jika kredensial ada
      if (isSupabaseConfigured()) {
        try {
          const sbTest = await testSupabaseConnection();
          if (sbTest.connected && isMounted) {
            setBackendStatus('supabase');
            setDatabaseName('Supabase PostgreSQL');
            console.log('[Supabase Cloud] Terhubung ke database PostgreSQL Supabase!');

            // Ambil seluruh data toko dari Supabase secara paralel
            const [
              sbProds,
              sbServs,
              sbSupps,
              sbTxs,
              sbExps,
              sbJournals,
              sbMuts,
              sbBookings,
              sbPayables,
              sbReceivables,
              sbParked,
              sbSettings,
              sbUsers,
              sbPerms,
              sbBalances,
              sbPeriod,
            ] = await Promise.all([
              fetchProductsFromSupabase(),
              fetchServicesFromSupabase(),
              fetchSuppliersFromSupabase(),
              fetchTransactionsFromSupabase(),
              fetchExpensesFromSupabase(),
              fetchJournalsFromSupabase(),
              fetchStockMutationsFromSupabase(),
              fetchBookingsFromSupabase(),
              fetchPayablesFromSupabase(),
              fetchReceivablesFromSupabase(),
              fetchParkedOrdersFromSupabase(),
              fetchStoreSettingsFromSupabase(),
              fetchUsersFromSupabase(),
              fetchRolePermissionsFromSupabase(),
              fetchAccountBalancesFromSupabase(),
              fetchAccountingPeriodFromSupabase(),
            ]);

            if (isMounted) {
              if (sbProds && sbProds.length > 0) setProducts(sbProds);
              if (sbServs && sbServs.length > 0) setServices(sbServs);
              if (sbSupps && sbSupps.length > 0) setSuppliers(sbSupps);
              if (sbTxs && sbTxs.length > 0) setTransactions(sbTxs);
              if (sbExps && sbExps.length > 0) setExpenses(sbExps);
              if (sbJournals && sbJournals.length > 0) setJournals(sbJournals);
              if (sbMuts && sbMuts.length > 0) setMutations(sbMuts);
              if (sbBookings && sbBookings.length > 0) setBookings(sbBookings);
              if (sbPayables && sbPayables.length > 0) setPayableInvoices(sbPayables);
              if (sbReceivables && sbReceivables.length > 0) setReceivableInvoices(sbReceivables);
              if (sbParked) setParkedOrders(sbParked);
              if (sbSettings) setStoreSettings(sbSettings);
              if (sbUsers && sbUsers.length > 0) setUsers(sbUsers);
              if (sbPerms) setRolePermissions(sbPerms);
              if (sbBalances) {
                setAccountBalances(sbBalances);
                if (sbBalances['1-1000'] !== undefined) setCashInDrawer(sbBalances['1-1000']);
              }
              if (sbPeriod) setPeriodInfo(sbPeriod);
            }
            return;
          }
        } catch (sbErr) {
          console.warn('[Supabase Cloud] Gagal terhubung ke Supabase:', sbErr);
        }
      }

      // 2. Fallback: Coba koneksi ke backend lokal Laravel MySQL jika ada
      try {
        const health = await apiClient.get<{ status: string; database: string; database_status: string }>('/health');
        if (health.status === 'healthy' && health.database_status === 'connected' && isMounted) {
          setBackendStatus('connected');
          if (health.database) setDatabaseName(health.database);
          console.log('[Laravel Backend] Terhubung ke MySQL:', health.database);

          // Fetch fresh products from backend MySQL
          const apiProds = await productApi.list().catch(() => null);
          if (apiProds && apiProds.length > 0 && isMounted) {
            setProducts(apiProds);
          }
          return;
        } else if (isMounted) {
          setBackendStatus('offline');
        }
      } catch {
        if (isMounted) {
          setBackendStatus('offline');
        }
      }
    };
    syncBackend();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    localStorage.setItem('ob3_store_settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  // Save to LocalStorage
  useEffect(() => {
    localStorage.setItem('ob3_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('ob3_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('ob3_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('ob3_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('ob3_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('ob3_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('ob3_mutations', JSON.stringify(mutations));
  }, [mutations]);

  useEffect(() => {
    localStorage.setItem('ob3_journals', JSON.stringify(journals));
  }, [journals]);

  useEffect(() => {
    localStorage.setItem('ob3_cash_drawer', JSON.stringify(cashInDrawer));
  }, [cashInDrawer]);

  useEffect(() => {
    localStorage.setItem('ob3_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ob3_payable_invoices', JSON.stringify(payableInvoices));
  }, [payableInvoices]);

  useEffect(() => {
    localStorage.setItem('ob3_account_balances', JSON.stringify(accountBalances));
  }, [accountBalances]);

  useEffect(() => {
    localStorage.setItem('ob3_receivable_invoices', JSON.stringify(receivableInvoices));
  }, [receivableInvoices]);

  useEffect(() => {
    localStorage.setItem('ob3_period_info', JSON.stringify(periodInfo));
  }, [periodInfo]);

  // Handle Sales Completion from POS Screen
  const handleCompleteSale = (newTx: PosTransaction) => {
    // 1. Add transaction to history
    setTransactions((prev) => [newTx, ...prev]);

    // 2. Reduce stock from products & log mutations
    const newMutations: StockMutation[] = [];

    setProducts((prevProducts) => {
      return prevProducts.map((prod) => {
        const itemSold = newTx.items.find((i) => i.product.id === prod.id);
        if (itemSold) {
          const currentQty = prod.product_quantity ?? prod.stock;
          const newStock = Math.max(0, currentQty - itemSold.qty);

          // Real FIFO batch depletion
          let remainingQtyToDeduct = itemSold.qty;
          const updatedBatches = prod.batches
            ? prod.batches.map((batch) => {
                if (remainingQtyToDeduct <= 0) return batch;
                const deductFromThis = Math.min(batch.remaining_qty, remainingQtyToDeduct);
                remainingQtyToDeduct -= deductFromThis;
                return {
                  ...batch,
                  remaining_qty: batch.remaining_qty - deductFromThis,
                };
              })
            : undefined;

          newMutations.push({
            id: `mut-${Date.now()}-${prod.id}`,
            tire_id: prod.id,
            product_id: prod.id,
            tire_name: prod.product_name || prod.name,
            product_name: prod.product_name || prod.name,
            tire_size: prod.product_size,
            date: newTx.timestamp,
            ref_doc: newTx.reference || newTx.invoice_number,
            type: 'KELUAR',
            qty: itemSold.qty,
            balance: newStock,
            notes: `Penjualan kasir ke ${newTx.customer_name} (${newTx.vehicle_plate})`,
            operator: newTx.cashier_name,
          });

          return {
            ...prod,
            stock: newStock,
            product_quantity: newStock,
            batches: updatedBatches,
          };
        }
        return prod;
      });
    });

    if (newMutations.length > 0) {
      setMutations((prev) => [...newMutations, ...prev]);
    }

    // 3. Generate Double-Entry Accounting Journal
    const newJournal = generateSalesJournal(newTx, journals.length + 1);

    const isPaidWithDp = newTx.notes && newTx.notes.includes('Pelunasan DP Booking');
    if (isPaidWithDp) {
      const matchDp = newTx.notes?.match(/Rp\s*([\d.,]+)/);
      const dpVal = matchDp ? parseInt(matchDp[1].replace(/[^0-9]/g, ''), 10) : 0;
      if (dpVal > 0) {
        const netCashPaid = Math.max(0, newTx.grand_total - dpVal);
        newJournal.lines = [
          {
            account_code: newTx.payment_method === 'TUNAI' ? '1-1000' : '1-1001',
            account_name: newTx.payment_method === 'TUNAI' ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3',
            debit: netCashPaid,
            credit: 0,
            note: `Pelunasan sisa tagihan ${newTx.payment_method}`,
          },
          {
            account_code: '2-1000',
            account_name: 'Hutang Dagang & Uang Muka Pelanggan',
            debit: dpVal,
            credit: 0,
            note: `Pengakuan uang muka DP yang sudah masuk sebelumnya`,
          },
          ...(newTx.total_discount > 0
            ? [
                {
                  account_code: '4-9000',
                  account_name: 'Potongan Diskon Penjualan',
                  debit: newTx.total_discount,
                  credit: 0,
                  note: `Diskon kasir`,
                },
              ]
            : []),
          {
            account_code: '4-1000',
            account_name: 'Pendapatan Penjualan Ban Baru',
            debit: 0,
            credit: newTx.subtotal,
            note: `Omzet penjualan kotor`,
          },
          {
            account_code: '5-1000',
            account_name: 'Harga Pokok Penjualan (HPP) Ban Baru',
            debit: newTx.total_cost_hpp,
            credit: 0,
            note: `Beban pokok penjualan FIFO`,
          },
          {
            account_code: '1-2000',
            account_name: 'Persediaan Ban Baru Cabang 3',
            debit: 0,
            credit: newTx.total_cost_hpp,
            note: `Pengurangan persediaan gudang`,
          },
        ];
      }
    }

    setJournals((prev) => [newJournal, ...prev]);

    // 4. Update Cash in Drawer if paid in Cash
    if (newTx.payment_method === 'TUNAI') {
      const matchDp = newTx.notes?.match(/Rp\s*([\d.,]+)/);
      const dpVal = (isPaidWithDp && matchDp) ? parseInt(matchDp[1].replace(/[^0-9]/g, ''), 10) : 0;
      const actualCashIn = isPaidWithDp ? Math.max(0, newTx.grand_total - dpVal) : newTx.grand_total;
      setCashInDrawer((prev) => prev + actualCashIn);
    }

    // 5. Clear cart and redirect to thermal receipt screen
    setCart([]);
    setCurrentReceiptTx(newTx);
    setActiveScreen('receipt');
    toast.success('Transaksi Kasir Berhasil!', `Nota ${newTx.invoice_number} berhasil diproses dan struk thermal siap dicetak.`);

    // 6. Asynchronously synchronize with Laravel Backend API
    posApi.checkout({
      customer_name: newTx.customer_name,
      vehicle_plate: newTx.vehicle_plate,
      cashier_name: newTx.cashier_name,
      payment_method: newTx.payment_method,
      paid_amount: newTx.paid_amount || newTx.grand_total,
      discount_amount: newTx.total_discount || 0,
      tax_amount: newTx.tax_amount || 0,
      notes: newTx.notes,
      items: newTx.items.map((i) => {
        const unitPrice = i.custom_price ?? i.product?.product_price ?? i.product?.price ?? 0;
        return {
          product_id: i.product?.id ? parseInt(String(i.product.id), 10) || null : null,
          type: i.item_type || 'PRODUCT',
          name: i.custom_name_override || i.product?.product_name || i.product?.name || 'Item',
          quantity: i.qty,
          unit_price: unitPrice,
          sub_total: unitPrice * i.qty,
          discount_amount: (i.discount_per_item || 0) * i.qty,
        };
      }),
    }).then((res) => {
      if (res?.data?.journal_entry_number) {
        console.log('[Laravel Backend] POS Checkout dibukukan ke MySQL:', res.data.journal_entry_number);
      }
    }).catch((err) => {
      console.warn('[Laravel Backend] Gagal sinkronisasi POS ke backend:', err);
    });

    // 7. Asynchronously synchronize with Supabase PostgreSQL Cloud
    insertTransactionToSupabase(newTx);
    insertJournalToSupabase(newJournal);
    newMutations.forEach((m) => insertStockMutationToSupabase(m));
    newTx.items.forEach((item) => {
      if (item.product?.id) {
        const currentP = products.find((p) => p.id === item.product.id);
        if (currentP) {
          const currentQty = currentP.product_quantity ?? currentP.stock;
          const newStock = Math.max(0, currentQty - item.qty);
          upsertProductToSupabase({ ...currentP, stock: newStock, product_quantity: newStock });
        }
      }
    });
  };

  const handleAddExpense = (newExpense: ExpenseRecord) => {
    // 1. Generate journal first
    const newJournal = generateExpenseJournal(newExpense, journals.length + 1);
    
    // 2. Attach journal_id to expense record
    const expenseWithJournal: ExpenseRecord = {
      ...newExpense,
      journal_id: newJournal.id,
      status: 'ACTIVE',
    };

    setExpenses((prev) => [expenseWithJournal, ...prev]);
    setJournals((prev) => [newJournal, ...prev]);

    // 3. Deduct from Cash Drawer or Bank BCA
    if (newExpense.cash_source.includes('Laci')) {
      setCashInDrawer((prev) => Math.max(0, prev - newExpense.amount));
    } else if (newExpense.cash_source.includes('BCA')) {
      setAccountBalances((prev) => ({
        ...prev,
        '1-1001': Math.max(0, (prev['1-1001'] || 0) - newExpense.amount),
      }));
    }

    // 4. Sinkronisasi ke Supabase PostgreSQL Cloud
    insertExpenseToSupabase(expenseWithJournal);
    insertJournalToSupabase(newJournal);

    toast.success(
      'Beban Toko Disimpan',
      `Pengeluaran ${newExpense.bkk_number || newExpense.expense_number} (${newExpense.category}) sebesar ${formatRupiah(newExpense.amount)} telah dibukukan.`
    );
  };

  const handleVoidExpense = (targetExpense: ExpenseRecord, voidReason: string, voidedBy: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // 1. Generate Reversal Journal (Jurnal Pembalik)
    const reversalJournal = generateVoidExpenseJournal(
      targetExpense,
      voidReason,
      voidedBy,
      journals.length + 1
    );

    // 2. Update status of expense in state
    setExpenses((prev) =>
      prev.map((exp) =>
        exp.id === targetExpense.id
          ? {
              ...exp,
              status: 'VOID',
              void_reason: voidReason,
              voided_by: voidedBy,
              voided_at: timestamp,
              reversal_journal_id: reversalJournal.id,
            }
          : exp
      )
    );

    // 3. Post reversal journal to journals ledger
    setJournals((prev) => [reversalJournal, ...prev]);

    // 4. Restore funds to drawer or Bank BCA
    if (targetExpense.cash_source.includes('Laci')) {
      setCashInDrawer((prev) => prev + targetExpense.amount);
    } else if (targetExpense.cash_source.includes('BCA')) {
      setAccountBalances((prev) => ({
        ...prev,
        '1-1001': (prev['1-1001'] || 0) + targetExpense.amount,
      }));
    }

    // 5. Sinkronisasi ke Supabase PostgreSQL Cloud
    updateExpenseStatusInSupabase(targetExpense.id, 'VOID', {
      void_reason: voidReason,
      voided_by: voidedBy,
      voided_at: timestamp,
      reversal_journal_id: reversalJournal.id,
    });
    insertJournalToSupabase(reversalJournal);

    toast.warning(
      'Pengeluaran Dibatalkan (VOID)',
      `Bukti ${targetExpense.bkk_number || targetExpense.expense_number} telah dibatalkan dan jurnal pembalik telah diterbitkan.`
    );
  };

  // Handle Void Transaction (Sales Cancellation with SAK EMKM Reversal & Stock Restoral)
  const handleVoidTransaction = (txId: string, voidReason: string) => {
    const targetTx = transactions.find((t) => t.id === txId);
    if (!targetTx) {
      toast.error('Gagal Membatalkan', 'Transaksi tidak ditemukan.');
      return;
    }
    if (targetTx.status === 'VOID' || targetTx.is_voided) {
      toast.warning('Pemberitahuan', 'Transaksi ini sudah pernah dibatalkan.');
      return;
    }

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const voidedByName = currentUser?.name || 'Kasir Cabang 3';

    // 1. Generate SAK EMKM Reversing Journal
    const reversalJournal = generateVoidSalesJournal(
      targetTx,
      voidReason,
      voidedByName,
      journals.length + 1
    );

    // 2. Update Transaction Status
    const updatedTx: PosTransaction = {
      ...targetTx,
      status: 'VOID',
      is_voided: true,
      void_reason: voidReason,
      voided_at: timestamp,
      voided_by: voidedByName,
    };

    setTransactions((prev) =>
      prev.map((t) => (t.id === txId ? updatedTx : t))
    );
    if (currentReceiptTx?.id === txId) {
      setCurrentReceiptTx(updatedTx);
    }

    // 3. Post reversal journal to general ledger
    setJournals((prev) => [reversalJournal, ...prev]);

    // 4. Restore physical tire stock to inventory
    const restoredProducts = new Set<string>();
    const newMutations: StockMutation[] = [];

    targetTx.items.forEach((item, idx) => {
      const prodId = item.product?.id;
      if (prodId && item.qty > 0) {
        restoredProducts.add(prodId);
        newMutations.push({
          id: `mut-void-${Date.now()}-${idx}`,
          tire_id: prodId,
          product_id: prodId,
          tire_name: item.product.name,
          product_name: item.product.name,
          tire_size: item.product.product_size,
          date: new Date().toISOString().substring(0, 10),
          ref_doc: targetTx.invoice_number,
          type: 'MASUK',
          qty: item.qty,
          balance: (item.product.product_quantity || 0) + item.qty,
          notes: `[VOID] Pengembalian stok nota ${targetTx.invoice_number} - Alasan: ${voidReason}`,
          operator: voidedByName,
        });
      }
    });

    if (restoredProducts.size > 0) {
      setProducts((prev) =>
        prev.map((p) => {
          const matchedItem = targetTx.items.find((i) => i.product?.id === p.id);
          if (matchedItem) {
            const newQty = (p.product_quantity || 0) + matchedItem.qty;
            const newStock = (p.stock || 0) + matchedItem.qty;
            return {
              ...p,
              product_quantity: newQty,
              stock: newStock,
            };
          }
          return p;
        })
      );
    }

    if (newMutations.length > 0) {
      setMutations((prev) => [...newMutations, ...prev]);
    }

    // 5. Restore cash drawer if payment was TUNAI
    if (targetTx.payment_method === 'TUNAI') {
      setCashInDrawer((prev) => Math.max(0, prev - targetTx.grand_total));
    }

    // 6. Sinkronisasi ke Supabase PostgreSQL Cloud
    updateTransactionStatusInSupabase(txId, 'VOID', {
      is_voided: true,
      void_reason: voidReason,
      voided_at: timestamp,
      voided_by: voidedByName,
    });
    insertJournalToSupabase(reversalJournal);
    newMutations.forEach((m) => insertStockMutationToSupabase(m));
    targetTx.items.forEach((item) => {
      if (item.product?.id) {
        const currentP = products.find((p) => p.id === item.product.id);
        if (currentP) {
          const newQty = (currentP.product_quantity || 0) + item.qty;
          const newStock = (currentP.stock || 0) + item.qty;
          upsertProductToSupabase({ ...currentP, product_quantity: newQty, stock: newStock });
        }
      }
    });

    toast.warning(
      'Transaksi Dibatalkan (VOID)',
      `Nota ${targetTx.invoice_number} berhasil dibatalkan. Stok ${targetTx.items.reduce((sum, i) => sum + i.qty, 0)} pcs ban dikembalikan dan Jurnal Pembalik telah dibukukan.`
    );
  };

  // Handle Inventory Stock Opname adjustment
  const handleUpdateProductStock = (updatedProducts: TireProduct[], newMutations: StockMutation[]) => {
    setProducts(updatedProducts);
    if (newMutations.length > 0) {
      setMutations((prev) => [...newMutations, ...prev]);
    }
  };

  // Handle Create Product Master (with optional initial FIFO batch)
  const handleCreateProduct = (input: CreateProductInput) => {
    const { product, mutation } = createProductWithInitialStock(input, products, mutations);
    setProducts((prev) => [product, ...prev]);
    upsertProductToSupabase(product);
    if (mutation) {
      setMutations((prev) => [mutation, ...prev]);
      insertStockMutationToSupabase(mutation);
    }
  };

  // Handle Update Product Master
  const handleUpdateProduct = (productId: string, updates: UpdateProductInput) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updatedName = updates.product_name ?? p.product_name ?? p.name;
          const updatedSize = updates.size_width && updates.size_ratio && updates.ring
            ? `${updates.size_width}/${updates.size_ratio} ${updates.ring}`
            : p.product_size ?? p.size;
          const updatedCost = updates.product_cost ?? p.cost_price ?? p.product_cost ?? 0;
          const updatedPrice = updates.product_price ?? p.product_price ?? p.price ?? 0;
          const updatedAlert = updates.product_stock_alert ?? p.product_stock_alert ?? p.min_stock ?? 5;

          const updatedProd: ProductItem = {
            ...p,
            ...updates,
            name: updatedName,
            product_name: updatedName,
            product_size: updatedSize,
            size: updatedSize,
            cost_price: updatedCost,
            product_cost: updatedCost,
            cost: updatedCost,
            product_price: updatedPrice,
            price: updatedPrice,
            product_stock_alert: updatedAlert,
            min_stock: updatedAlert,
          };
          upsertProductToSupabase(updatedProd);
          return updatedProd;
        }
        return p;
      })
    );
  };

  // Handle Goods Receipt (Restock incoming ban from supplier + Auto-Journaling & Hutang)
  const handleGoodsReceipt = (input: GoodsReceiptInput) => {
    const targetProduct = products.find((p) => p.id === input.product_id);
    if (!targetProduct) return;

    // 1. Process inventory batch & stock mutation
    const { updatedProduct, mutation } = processGoodsReceipt(targetProduct, input, mutations);
    setProducts((prev) => prev.map((p) => (p.id === input.product_id ? updatedProduct : p)));
    setMutations((prev) => [mutation, ...prev]);
    upsertProductToSupabase(updatedProduct);
    insertStockMutationToSupabase(mutation);

    // 2. Auto-generate Double-Entry Purchase Journal
    const totalCost = input.incoming_qty * input.unit_cost;
    const newJournal = generatePurchaseJournal(input, totalCost, journals.length + 1);
    setJournals((prev) => [newJournal, ...prev]);
    insertJournalToSupabase(newJournal);

    // 3. Deduct cash drawer if paid cash
    if (input.payment_terms === 'TUNAI_KAS') {
      setCashInDrawer((prev) => Math.max(0, prev - totalCost));
    }

    // 4. If tempo / credit, create new PayableInvoice
    if (input.payment_terms === 'TEMPO_HUTANG' || !input.payment_terms) {
      const newInvoice: PayableInvoice = {
        id: `pay-inv-${Date.now()}`,
        invoice_number: input.supplier_invoice || `SJ-${input.supplier_name.substring(0, 2).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        supplier_name: input.supplier_name,
        date: input.receipt_date || new Date().toISOString().substring(0, 10),
        due_date: input.due_date || new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
        total_amount: totalCost,
        paid_amount: 0,
        remaining_amount: totalCost,
        status: 'BELUM_LUNAS',
        notes: input.notes || `Pengadaan ${input.incoming_qty} pcs ${targetProduct.product_name}`,
        ref_doc: mutation.ref_doc,
      };
      setPayableInvoices((prev) => [newInvoice, ...prev]);
      upsertPayableToSupabase(newInvoice);
    }
  };

  // Handle Pay Debt (Pelunasan Hutang Distributor)
  const handlePayDebt = (paymentInput: DebtPaymentInput) => {
    const targetInv = payableInvoices.find((i) => i.id === paymentInput.payable_invoice_id);
    if (!targetInv) return;

    // 1. Auto-generate Double-Entry Debt Payment Journal
    const newJournal = generateDebtPaymentJournal(
      paymentInput,
      targetInv.supplier_name,
      targetInv.invoice_number,
      journals.length + 1
    );
    setJournals((prev) => [newJournal, ...prev]);
    insertJournalToSupabase(newJournal);

    // 2. Deduct from drawer if cash
    if (paymentInput.source_account_code === '1-1000') {
      setCashInDrawer((prev) => Math.max(0, prev - paymentInput.amount));
    }

    // 3. Update payable invoice
    setPayableInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === paymentInput.payable_invoice_id) {
          const newPaid = inv.paid_amount + paymentInput.amount;
          const newRemaining = Math.max(0, inv.total_amount - newPaid);
          const newStatus = newRemaining === 0 ? 'LUNAS' : 'SEBAGIAN';
          const updatedInv: PayableInvoice = {
            ...inv,
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            status: newStatus,
          };
          upsertPayableToSupabase(updatedInv);
          return updatedInv;
        }
        return inv;
      })
    );
  };

  // Handle Manual Adjusting Journal
  const handleAddManualJournal = (input: ManualJournalInput) => {
    const newJournal = generateManualJournal(input, journals.length + 1);
    setJournals((prev) => [newJournal, ...prev]);
    insertJournalToSupabase(newJournal);

    // If affects 1-1000 Kas Toko
    input.lines.forEach((l) => {
      if (l.account_code === '1-1000') {
        if (l.debit > 0) setCashInDrawer((prev) => prev + l.debit);
        if (l.credit > 0) setCashInDrawer((prev) => Math.max(0, prev - l.credit));
      }
    });
  };

  // Handle Pay Receivable (Penerimaan Kas dari Piutang Pelanggan Tempo)
  const handlePayReceivable = (paymentInput: ReceivablePaymentInput) => {
    const targetInv = receivableInvoices.find((i) => i.id === paymentInput.receivable_invoice_id);
    if (!targetInv) return;

    // 1. Auto-generate Double-Entry Receivable Payment Journal
    const newJournal = generateReceivablePaymentJournal(
      paymentInput,
      targetInv.customer_name,
      targetInv.invoice_number,
      journals.length + 1
    );
    setJournals((prev) => [newJournal, ...prev]);
    insertJournalToSupabase(newJournal);

    // 2. Add to cash drawer if paid cash
    if (paymentInput.destination_account_code === '1-1000') {
      setCashInDrawer((prev) => prev + paymentInput.amount);
    }

    // 3. Update receivable invoice status & amounts
    setReceivableInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === paymentInput.receivable_invoice_id) {
          const newPaid = inv.paid_amount + paymentInput.amount;
          const newRemaining = Math.max(0, inv.total_amount - newPaid);
          const newStatus = newRemaining === 0 ? 'LUNAS' : 'SEBAGIAN';
          const updatedInv: ReceivableInvoice = {
            ...inv,
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            status: newStatus,
          };
          upsertReceivableToSupabase(updatedInv);
          return updatedInv;
        }
        return inv;
      })
    );

    toast.success(
      'Pembayaran Piutang Diterima',
      `${formatRupiah(paymentInput.amount)} dari ${targetInv.customer_name} telah masuk ke pembukuan.`
    );
  };

  // Handle Close Period (Jurnal Penutup Otomatis SAK EMKM)
  const handleClosePeriod = (closedBy: string, notes: string) => {
    const closingResult = generateClosingJournal(
      journals,
      accountBalances,
      periodInfo.period_id,
      closedBy,
      journals.length + 1
    );

    setJournals((prev) => [closingResult.journal, ...prev]);
    insertJournalToSupabase(closingResult.journal);
    setPeriodInfo((prev) => ({
      ...prev,
      status: 'CLOSED',
      closed_at: new Date().toISOString(),
      closed_by: closedBy,
      closing_journal_id: closingResult.journal.id,
      net_income_transferred: closingResult.netIncome,
    }));

    toast.success(
      'Tutup Buku Berhasil Diproses',
      `Jurnal penutup ${closingResult.journal.journal_number} berhasil diposting. Laba bersih ${formatRupiah(closingResult.netIncome)} dialihkan ke Laba Ditahan.`
    );
  };

  // Handle Reversing Journal (Koreksi Storno)
  const handleReverseJournal = (originalJournal: JournalEntry, reason: string, reversedBy: string) => {
    const reversingJournal = generateReversingJournal(
      originalJournal,
      reason,
      reversedBy,
      journals.length + 1
    );

    setJournals((prev) => [reversingJournal, ...prev]);
    insertJournalToSupabase(reversingJournal);

    toast.info(
      'Jurnal Pembalik Diposting',
      `Koreksi storno ${reversingJournal.journal_number} dibuat untuk ${originalJournal.journal_number}.`
    );
  };

  // Handle Safe Delete or Deactivate Product
  const handleDeleteOrDeactivateProduct = (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const check = canSafelyDeleteProduct(targetProduct, mutations, transactions);
    if (check.canDelete) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      deleteProductFromSupabase(productId);
    } else {
      // Toggle is_active status (soft delete / reactivate)
      const updatedP = { ...targetProduct, is_active: !targetProduct.is_active };
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? updatedP : p))
      );
      upsertProductToSupabase(updatedP);
    }
  };

  const handleSaveService = (serviceData: Omit<ServiceMasterItem, 'id' | 'is_active'>, serviceId?: string) => {
    if (serviceId) {
      setServices((prev) => updateServiceItem(prev, serviceId, serviceData));
    } else {
      const { updatedServices } = createServiceItem(services, serviceData);
      setServices(updatedServices);
    }
  };

  const handleToggleService = (serviceId: string) => {
    setServices((prev) => deleteOrToggleServiceItem(prev, serviceId));
  };

  const handleSaveSupplier = (supplierData: Omit<SupplierItem, 'id' | 'is_active'>, supplierId?: string) => {
    if (supplierId) {
      setSuppliers((prev) => updateSupplierItem(prev, supplierId, supplierData));
    } else {
      const { updatedSuppliers } = createSupplierItem(suppliers, supplierData);
      setSuppliers(updatedSuppliers);
    }
  };

  const handleToggleSupplier = (supplierId: string) => {
    setSuppliers((prev) => deleteOrToggleSupplierItem(prev, supplierId));
  };

  const handleSaveBooking = (booking: SalesBookingRecord) => {
    setBookings((prev) => [booking, ...prev]);

    if (booking.payment_method === 'TUNAI') {
      setCashInDrawer((prev) => prev + booking.dp_amount);
    }

    const journalId = `JU-DP-${Date.now()}`;
    const targetCashAccount = booking.payment_method === 'TUNAI' ? '1-1000' : '1-1001';
    const targetCashName = booking.payment_method === 'TUNAI' ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

    const dpJournal: JournalEntry = {
      id: journalId,
      journal_number: `JU-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      reference_number: booking.booking_number,
      date: booking.date,
      ref_doc: booking.booking_number,
      description: `Penerimaan Uang Muka (DP) Booking ${booking.customer_name} - ${booking.vehicle_plate}`,
      status: 'POSTED',
      total_debit: booking.dp_amount,
      total_credit: booking.dp_amount,
      lines: [
        {
          account_code: targetCashAccount,
          account_name: targetCashName,
          debit: booking.dp_amount,
          credit: 0,
          note: `DP Booking ${booking.payment_method}`,
        },
        {
          account_code: '2-1000',
          account_name: 'Hutang Dagang & Uang Muka Pelanggan',
          debit: 0,
          credit: booking.dp_amount,
          note: `Uang muka pesanan ${booking.customer_name}`,
        },
      ],
    };

    setJournals((prev) => [dpJournal, ...prev]);
    upsertBookingToSupabase(booking);
    insertJournalToSupabase(dpJournal);
  };

  const handleConvertBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id === bookingId) {
          const updated = { ...b, status: 'CONVERTED' as const };
          upsertBookingToSupabase(updated);
          return updated;
        }
        return b;
      })
    );
  };

  // Reset to default seed data
  const handleResetData = () => {
    if (window.confirm('Reset seluruh data simulasi toko ke bawaan awal?')) {
      setProducts(INITIAL_PRODUCTS);
      setServices(INITIAL_SERVICES);
      setSuppliers(INITIAL_SUPPLIERS);
      setBookings(INITIAL_BOOKINGS);
      setTransactions(INITIAL_TRANSACTIONS);
      setExpenses(INITIAL_EXPENSES);
      setMutations(INITIAL_STOCK_MUTATIONS);
      setJournals(INITIAL_JOURNALS);
      setPayableInvoices(INITIAL_PAYABLE_INVOICES);
      setAccountBalances(INITIAL_ACCOUNT_BALANCES);
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setCashInDrawer(2450000);
      setCart([]);
      setCurrentReceiptTx(null);
      localStorage.clear();
      alert('Data sistem telah direset ke kondisi awal!');
    }
  };

  const lowStockCount = products.filter((p) => p.stock < 5).length;
  const cartTotalQty = cart.reduce((acc, c) => acc + c.qty, 0);

  // Jika belum login, tampilkan layar Login Omah Ban Cabang 3
  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          localStorage.setItem('ob3_user_session', JSON.stringify(user));
          toast.success(`Selamat Datang, ${user.name}!`, `Berhasil masuk sebagai ${user.role} (${user.branch_name}).`);
        }}
        users={users}
      />
    );
  }

  return (
    <div className={`${activeScreen === 'pos' ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]`}>
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-white/85 backdrop-blur-sm flex flex-col items-center justify-center text-indigo-600 gap-3 select-none">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
          <span className="text-sm font-bold text-slate-900 tracking-wide">
            Memuat Data POS dan Keuangan Cabang 3...
          </span>
          <span className="text-xs text-slate-500">Sinkronisasi saldo stok FIFO dan buku besar SAK EMKM</span>
        </div>
      )}

      {activeScreen === 'pos' ? (
        <PosScreen
          products={products}
          services={services}
          bookings={bookings}
          parkedOrders={parkedOrders}
          onSaveParkedOrder={handleSaveParkedOrder}
          onDeleteParkedOrder={handleDeleteParkedOrder}
          cart={cart}
          setCart={setCart}
          onCompleteSale={handleCompleteSale}
          onSaveBooking={handleSaveBooking}
          onConvertBooking={handleConvertBooking}
          cashierName={currentUser.name}
          cashInDrawer={cashInDrawer}
          timeString={timeString}
          onExitToBackoffice={() => setActiveScreen('dashboard')}
          onOpenWireframeModal={() => setShowWireframeModal(true)}
          isEmptyState={isEmptyState}
        />
      ) : (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
          <HeaderNavbar
            activeScreen={activeScreen}
            setActiveScreen={setActiveScreen}
            cashInDrawer={cashInDrawer}
            lowStockCount={lowStockCount}
            cartCount={cartTotalQty}
            notifications={notifications}
            onMarkNotificationRead={(id) => {
              setReadNotifIds((prev) => [...prev, id]);
            }}
            onClearNotifications={() => {
              setDismissedNotifIds((prev) => [...prev, ...notifications.map((n) => n.id)]);
            }}
            onOpenWireframeModal={() => setShowWireframeModal(true)}
            onResetData={handleResetData}
            currentTimeStr={timeString}
            backendStatus={backendStatus}
            databaseName={databaseName}
            currentUser={currentUser}
            rolePermissions={rolePermissions}
            onSwitchUser={(user) => {
              setCurrentUser(user);
              localStorage.setItem('ob3_user_session', JSON.stringify(user));
              toast.info('Beralih Peran', `Kini melihat antarmuka sebagai ${user.name} (${user.role}).`);
            }}
            onLogout={() => {
              setCurrentUser(null);
              localStorage.removeItem('ob3_user_session');
              toast.info('Sesi Ditutup', 'Anda telah keluar dari sistem Omah Ban Cabang 3.');
            }}
          />

          <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC]">
            {activeScreen === 'receipt' && (
              <ThermalReceiptScreen
                currentTransaction={currentReceiptTx}
                transactionsHistory={transactions}
                storeSettings={storeSettings}
                currentUser={currentUser}
                onBackToPos={() => setActiveScreen('pos')}
                onSelectTransaction={(tx) => setCurrentReceiptTx(tx)}
                onVoidTransaction={handleVoidTransaction}
              />
            )}

            {activeScreen === 'dashboard' && (
              <ExecutiveDashboardScreen
                transactions={transactions}
                products={products}
                expenses={expenses}
                onNavigateToInventory={() => setActiveScreen('inventory')}
                onNavigateToPos={() => setActiveScreen('pos')}
              />
            )}

            {activeScreen === 'inventory' && (
              <InventoryScreen
                products={products}
                services={services}
                suppliers={suppliers}
                mutations={mutations}
                transactions={transactions}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onGoodsReceipt={handleGoodsReceipt}
                onDeleteOrDeactivateProduct={handleDeleteOrDeactivateProduct}
                onUpdateProductStock={handleUpdateProductStock}
                onSaveService={handleSaveService}
                onToggleService={handleToggleService}
                onSaveSupplier={handleSaveSupplier}
                onToggleSupplier={handleToggleSupplier}
                isEmptyState={isEmptyState}
              />
            )}

            {activeScreen === 'expenses' && (
              <ExpensesScreen
                expenses={expenses}
                onAddExpense={handleAddExpense}
                cashInDrawer={cashInDrawer}
                bankBalance={accountBalances['1-1001'] || 35000000}
                onVoidExpense={handleVoidExpense}
              />
            )}

            {activeScreen === 'ledger' && (
              <GeneralLedgerScreen
                journals={journals}
                initialBalances={accountBalances}
                payableInvoices={payableInvoices}
                receivableInvoices={receivableInvoices}
                periodInfo={periodInfo}
                products={products}
                cashInDrawer={cashInDrawer}
                onAddManualJournal={handleAddManualJournal}
                onPayDebt={handlePayDebt}
                onPayReceivable={handlePayReceivable}
                onClosePeriod={handleClosePeriod}
                onReverseJournal={handleReverseJournal}
                onNavigateToFinancials={() => setActiveScreen('financials')}
                isEmptyState={isEmptyState}
              />
            )}

            {activeScreen === 'financials' && (
              <FinancialStatementsScreen
                transactions={transactions}
                expenses={expenses}
                products={products}
                cashInDrawer={cashInDrawer}
                journals={journals}
                initialBalances={accountBalances}
              />
            )}

            {activeScreen === 'settings' && (
              <SettingsScreen
                settings={storeSettings}
                onSaveSettings={(newSet) => {
                  setStoreSettings(newSet);
                  saveStoreSettingsToSupabase(newSet);
                }}
                currentUser={currentUser}
                currentPermissions={rolePermissions}
                onSavePermissions={(newPerms) => {
                  setRolePermissions(newPerms);
                  saveRolePermissionsToSupabase(newPerms);
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* Wireframe Architecture & Design Specs Modal */}
      <WireframeGuideModal
        isOpen={showWireframeModal}
        onClose={() => setShowWireframeModal(false)}
      />
    </div>
  );
}
