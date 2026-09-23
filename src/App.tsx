import React, { useState, useEffect, useCallback } from 'react';
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
  PermissionKey,
  PosTransaction, 
  ProductCategory,
  ProductItem, 
  ParkedTransaction,
  ReceivableInvoice,
  ReceivablePaymentInput,
  RolePermissionsConfig,
  SalesBookingRecord, 
  ServiceCategoryItem,
  ServiceMasterItem, 
  StockMutation, 
  StoreSettings, 
  SupplierItem, 
  TireProduct, 
  UpdateProductInput,
  UserSession 
} from './shared/types';
import { 
  DEFAULT_ROLE_PERMISSIONS,
  INITIAL_PERIOD_INFO,
  INITIAL_STORE_SETTINGS,
  INITIAL_SUPPLIERS,
  INITIAL_EXPENSES,
  INITIAL_JOURNALS,
  INITIAL_PAYABLE_INVOICES,
  INITIAL_ACCOUNT_BALANCES,
  INITIAL_STOCK_MUTATIONS,
} from './shared/data/mockData';
import { LoginScreen } from './modules/auth';
import { formatRupiah, generateExpenseJournal } from './shared/utils/formatters';
import { setExportConfig } from './shared/export/exportConfig';
import { 
  generatePurchaseJournal, 
  generateDebtPaymentJournal, 
  generateManualJournal,
  generateVoidExpenseJournal,
  generateClosingJournal,
  generateReversingJournal
} from './services/accountingService';
import { 
  canSafelyDeleteProduct, 
  createProductWithInitialStock, 
  processGoodsReceipt 
} from './services/inventoryService';
import { 
  createServiceItem, 
  deleteOrToggleServiceItem, 
  updateServiceItem,
  deleteServiceItemPermanent,
  createServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  fetchServiceCategoriesFromStorage
} from './services/serviceMasterService';
import { 
  fetchProductCategoriesFromStorage,
  createProductCategory,
  updateProductCategory,
  deleteProductCategory,
  toggleProductCategoryStatus
} from './services/productCategoryService';
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
import {
  apiClient,
  productApi,
  posApi,
  authApi,
  authToken,
  setUnauthorizedHandler,
  mapBooking,
  mapJournal,
  mapReceivable,
  mapSaleToTransaction,
  inventoryApi,
  mapMovement,
  mapProductCategory,
  mapPurchaseToPayable,
  mapServiceCategory,
  mapSupplier,
  productPayload,
  restockPayload,
  debtPaymentPayload,
} from './services/api';
import type { ApiJournal, ApiSale, BookingPayload, CheckoutPayload, InventoryValuation } from './services/api';
import { 
  upsertParkedOrderToSupabase,
  deleteParkedOrderFromSupabase,
  insertExpenseToSupabase,
  updateExpenseStatusInSupabase,
  upsertProductToSupabase,
  deleteProductFromSupabase,
  insertStockMutationToSupabase,
  insertJournalToSupabase,
  upsertPayableToSupabase,
  saveStoreSettingsToSupabase,
  isScreenPermittedForRole,
  getDefaultScreenForUser,
  hasPermission,
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

  // Sesi login dari server (Laravel Sanctum); dipulihkan lewat /auth/me bila token masih ada.
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(() => !!authToken.get());
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsConfig>(DEFAULT_ROLE_PERMISSIONS);

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');
  const [backendStatus, setBackendStatus] = useState<'supabase' | 'connected' | 'offline' | 'checking'>('checking');
  const [databaseName, setDatabaseName] = useState<string>('project-skripsi_ob');

  // Permission verification
  const isScreenPermitted = (screen: ActiveScreen): boolean => {
    return isScreenPermittedForRole(screen, currentUser?.role, rolePermissions);
  };
  const can = (key: PermissionKey): boolean => hasPermission(currentUser, rolePermissions, key);

  // Auto-redirect if activeScreen is not permitted for current user
  useEffect(() => {
    if (currentUser && !isScreenPermitted(activeScreen)) {
      const fallbackScreen = getDefaultScreenForUser(currentUser.role, rolePermissions);
      setActiveScreen(fallbackScreen);
    }
  }, [currentUser, rolePermissions, activeScreen]);

  const startSession = useCallback(async (user: UserSession) => {
    const permissions = await authApi.getRolePermissions().catch(() => DEFAULT_ROLE_PERMISSIONS);
    setRolePermissions(permissions);
    setCurrentUser(user);
    setActiveScreen(getDefaultScreenForUser(user.role, permissions));
  }, []);

  useEffect(() => {
    if (!authToken.get()) return;
    authApi
      .me()
      .then(startSession)
      .catch(() => authToken.clear())
      .finally(() => setAuthChecking(false));
  }, [startSession]);

  // Token ditolak server (kedaluwarsa/dicabut) → kembali ke layar login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!currentUser) return;
      setCurrentUser(null);
      setActiveScreen('dashboard');
      toast.warning('Sesi Berakhir', 'Sesi berakhir, silakan login kembali.');
    });
    return () => setUnauthorizedHandler(null);
  }, [currentUser, toast]);

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

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [services, setServices] = useState<ServiceMasterItem[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [bookings, setBookings] = useState<SalesBookingRecord[]>([]);
  const [transactions, setTransactions] = useState<PosTransaction[]>([]);

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
  const [mutations, setMutations] = useState<StockMutation[]>([]);
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
      return saved ? Number(saved) : 2450000;
    } catch {
      return 2450000;
    }
  });
  const [payableInvoices, setPayableInvoices] = useState<PayableInvoice[]>([]);
  const [accountBalances, setAccountBalances] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('ob3_account_balances');
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNT_BALANCES;
    } catch {
      return INITIAL_ACCOUNT_BALANCES;
    }
  });
  const [receivableInvoices, setReceivableInvoices] = useState<ReceivableInvoice[]>([]);

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
  const [inventoryValuation, setInventoryValuation] = useState<InventoryValuation | null>(null);

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

  // Data POS (katalog, nota, piutang, booking) selalu dari server Laravel sesuai izin peran.
  const loadPosData = async (user: UserSession, permissions: RolePermissionsConfig) => {
    const allowed = (...keys: PermissionKey[]) => keys.some((k) => hasPermission(user, permissions, k));
    const catalog = allowed('pos', 'inventory_view');
    const [apiProducts, apiServices, apiSales, apiReceivables, apiBookings, apiProductCats, apiServiceCats, apiSuppliers] = await Promise.all([
      catalog ? productApi.list().catch(() => null) : null,
      catalog ? posApi.listServices().catch(() => null) : null,
      allowed('pos', 'receipt') ? posApi.listTransactions().catch(() => null) : null,
      allowed('bon_receivable', 'accounting_hub') ? posApi.listReceivables('all').catch(() => null) : null,
      allowed('booking_dp', 'pos') ? posApi.listBookings('ALL').catch(() => null) : null,
      catalog ? inventoryApi.listProductCategories().catch(() => null) : null,
      catalog ? inventoryApi.listServiceCategories().catch(() => null) : null,
      catalog ? inventoryApi.listSuppliers().catch(() => null) : null,
    ]);
    if (apiProductCats) setProductCategories(apiProductCats.map(mapProductCategory));
    if (apiServiceCats) setServiceCategories(apiServiceCats.map(mapServiceCategory));
    if (apiSuppliers) setSuppliers(apiSuppliers.map(mapSupplier));
    if (allowed('goods_receipt', 'accounts_payable')) refreshPayables();
    if (allowed('inventory_view')) refreshStockLedger();
    if (apiProducts) setProducts(apiProducts);
    if (apiServices) setServices(apiServices);
    if (apiSales) {
      const txs = apiSales.map(mapSaleToTransaction);
      setTransactions(txs);
      setCurrentReceiptTx((prev) => prev ?? txs[0] ?? null);
    }
    if (apiReceivables) setReceivableInvoices(apiReceivables.map(mapReceivable));
    if (apiBookings) setBookings(apiBookings.map((b) => mapBooking(b, apiProducts ?? [], apiServices ?? [])));
  };

  const refreshPayables = () => {
    inventoryApi
      .listPurchases('all')
      .then((rows) => setPayableInvoices(rows.filter((p) => p.payment_method === 'TEMPO').map(mapPurchaseToPayable)))
      .catch(() => {});
  };

  /** Kartu stok & keselarasan nilai FIFO dengan buku besar 1-2000. */
  const refreshStockLedger = () => {
    inventoryApi.listMovements().then((rows) => setMutations(rows.map(mapMovement))).catch(() => {});
    inventoryApi.valuation().then(setInventoryValuation).catch(() => {});
  };

  const refreshReceivables = () => {
    if (!can('bon_receivable') && !can('accounting_hub')) return;
    posApi.listReceivables('all').then((rows) => setReceivableInvoices(rows.map(mapReceivable))).catch(() => {});
  };

  const sessionUserId = currentUser?.id;
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    const syncBackend = async () => {
      try {
        const health = await apiClient.get<{ status: string; database: string; database_status: string }>('/health');
        if (isMounted) {
          setBackendStatus(health.database_status === 'connected' ? 'connected' : 'offline');
          if (health.database) setDatabaseName(health.database);
        }
      } catch {
        if (isMounted) setBackendStatus('offline');
      }

      await loadPosData(currentUser, rolePermissions);

      // Data beban & jurnal masih lokal sampai tahap berikutnya.
      if (isMounted) {
        setExpenses((prev) => (prev.length > 0 ? prev : INITIAL_EXPENSES));
        setJournals((prev) => (prev.length > 0 ? prev : INITIAL_JOURNALS));
        setAccountBalances((prev) => (Object.keys(prev).length > 0 ? prev : INITIAL_ACCOUNT_BALANCES));
      }
    };
    syncBackend();
    return () => { isMounted = false; };
  }, [sessionUserId]);

  useEffect(() => {
    localStorage.setItem('ob3_store_settings', JSON.stringify(storeSettings));
  }, [storeSettings]);

  useEffect(() => {
    setExportConfig(storeSettings, currentUser);
  }, [storeSettings, currentUser]);

  useEffect(() => {
    localStorage.setItem('ob3_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('ob3_period_info', JSON.stringify(periodInfo));
  }, [periodInfo]);

  useEffect(() => {
    localStorage.setItem('ob3_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('ob3_journals', JSON.stringify(journals));
  }, [journals]);

  useEffect(() => {
    localStorage.setItem('ob3_cash_drawer', String(cashInDrawer));
  }, [cashInDrawer]);

  useEffect(() => {
    localStorage.setItem('ob3_account_balances', JSON.stringify(accountBalances));
  }, [accountBalances]);

  // Jurnal hasil server disalin ke tampilan akuntansi (masa transisi sampai modul akuntansi membaca API).
  const mergeServerJournals = (apiJournals: ApiJournal[]) => {
    if (apiJournals.length === 0) return;
    const mapped = apiJournals.map(mapJournal);
    setJournals((prev) => [...mapped.filter((j) => !prev.some((p) => p.id === j.id)), ...prev]);
  };

  /** Porsi tunai yang benar-benar masuk/keluar laci (tanpa kembalian). */
  const cashPortion = (sale: ApiSale) =>
    sale.payments.filter((p) => p.method === 'TUNAI').reduce((sum, p) => sum + Number(p.amount), 0);

  const handleCheckout = async (payload: CheckoutPayload): Promise<PosTransaction> => {
    const sale = await posApi.checkout(payload);
    const tx = mapSaleToTransaction(sale);

    setTransactions((prev) => [tx, ...prev]);
    setCurrentReceiptTx(tx);
    mergeServerJournals(sale.journals);
    setCashInDrawer((prev) => prev + cashPortion(sale));
    if (payload.booking_id) {
      setBookings((prev) => prev.map((b) => (b.id === String(payload.booking_id) ? { ...b, status: 'CONVERTED' } : b)));
    }
    if (sale.payment_method === 'BON') refreshReceivables();
    handleRefreshProducts();

    toast.success('Transaksi Kasir Berhasil!', `Nota ${tx.invoice_number} dibukukan di server.`);
    return tx;
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

  // Void nota di server: jurnal pembalik + stok kembali ke batch FIFO asal
  const handleVoidTransaction = async (txId: string, voidReason: string) => {
    try {
      const sale = await posApi.voidTransaction(txId, voidReason);
      const tx = mapSaleToTransaction(sale);

      setTransactions((prev) => prev.map((t) => (t.id === txId ? tx : t)));
      if (currentReceiptTx?.id === txId) setCurrentReceiptTx(tx);
      mergeServerJournals(sale.journals);
      setCashInDrawer((prev) => Math.max(0, prev - cashPortion(sale)));
      if (Number(sale.dp_applied) > 0) {
        posApi.listBookings('ALL').then((rows) => setBookings(rows.map((b) => mapBooking(b, products, services)))).catch(() => {});
      }
      if (sale.payment_method === 'BON') refreshReceivables();
      handleRefreshProducts();

      toast.warning(
        'Transaksi Dibatalkan (VOID)',
        `Nota ${tx.invoice_number} dibatalkan. Stok dikembalikan ke batch FIFO asal dan jurnal pembalik dibukukan.`
      );
    } catch (err) {
      toast.error('Gagal Membatalkan Nota', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
    }
  };

  // Handle Inventory Stock Opname adjustment
  /** Pesan error server untuk toast. */
  const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');

  // Stock opname di server: FIFO + jurnal selisih persediaan (5-2000)
  const handleStockOpname = async (items: { product_id: number; physical_qty: number }[], notes: string): Promise<boolean> => {
    if (items.length === 0) {
      toast.info('Tidak Ada Selisih', 'Stok fisik sama dengan stok sistem.');
      return true;
    }
    try {
      const res = await inventoryApi.stockOpname(items, notes);
      if (res.journal) mergeServerJournals([res.journal]);
      handleRefreshProducts();
      toast.success('Stock Opname Dibukukan', `${res.reference}: ${res.adjustments.length} produk disesuaikan, selisih nilai dijurnal.`);
      return true;
    } catch (err) {
      toast.error('Stock Opname Gagal', errorMessage(err));
      return false;
    }
  };

  const handleRefreshProducts = async () => {
    try {
      setProducts(await productApi.list());
    } catch (e) {
      console.warn('[Omah Ban] Gagal memuat ulang produk dari backend:', e);
    }
    if (can('inventory_view')) refreshStockLedger();
  };

  /** Dipanggil setelah koreksi buku stok / rekonsiliasi Excel tersimpan di server. */
  const handleInventoryServerChanged = (journal?: ApiJournal | null) => {
    if (journal) mergeServerJournals([journal]);
    handleRefreshProducts();
  };

  const handlePostOpeningBalance = async () => {
    try {
      const res = await inventoryApi.postOpeningBalance();
      if (res.journal) mergeServerJournals([res.journal]);
      setInventoryValuation(res.valuation);
      toast.success('Saldo Awal Dibukukan', 'Akun Persediaan 1-2000 kini sama dengan nilai stok FIFO.');
    } catch (err) {
      toast.error('Gagal Membukukan Saldo Awal', errorMessage(err));
    }
  };

  // Produk baru; stok awal dijurnal server sebagai saldo awal (Dr 1-2000 / Cr 3-1000)
  const handleCreateProduct = async (input: CreateProductInput): Promise<boolean> => {
    try {
      const res = await inventoryApi.createProduct(productPayload(input, productCategories));
      if (res.journal) mergeServerJournals([res.journal]);
      handleRefreshProducts();
      toast.success('Produk Ditambahkan', `${res.data.product_name} tersimpan di katalog.`);
      return true;
    } catch (err) {
      toast.error('Gagal Menyimpan Produk', errorMessage(err));
      return false;
    }
  };

  const handleUpdateProduct = async (productId: string, updates: UpdateProductInput): Promise<boolean> => {
    const current = products.find((p) => p.id === productId);
    if (!current) return false;
    try {
      await inventoryApi.updateProduct(
        productId,
        productPayload({ category: current.category, ...updates }, productCategories, {
          product_name: current.product_name,
          brand: current.brand,
          product_cost: current.product_cost,
          product_price: current.product_price,
          product_stock_alert: current.product_stock_alert,
        })
      );
      handleRefreshProducts();
      toast.success('Produk Diperbarui', 'Informasi produk tersimpan.');
      return true;
    } catch (err) {
      toast.error('Gagal Memperbarui Produk', errorMessage(err));
      return false;
    }
  };

  // Penerimaan barang di server: dokumen GR + batch FIFO + jurnal pembelian (TEMPO → hutang supplier)
  const handleGoodsReceipt = async (input: GoodsReceiptInput): Promise<boolean> => {
    try {
      const payload = restockPayload(input, suppliers);
      const res = await inventoryApi.restock(payload);
      mergeServerJournals([res.journal]);
      if (payload.payment_method === 'TUNAI') {
        setCashInDrawer((prev) => Math.max(0, prev - Number(res.purchase.total_amount)));
      }
      if (payload.payment_method === 'TEMPO') refreshPayables();
      handleRefreshProducts();
      toast.success('Penerimaan Barang Dibukukan', `${res.purchase.purchase_number}: ${formatRupiah(res.purchase.total_amount)} (${payload.payment_method}).`);
      return true;
    } catch (err) {
      toast.error('Penerimaan Barang Gagal', errorMessage(err));
      return false;
    }
  };

  // Pelunasan hutang supplier per faktur di server (Dr 2-1000 / Cr kas atau bank)
  const handlePayDebt = async (paymentInput: DebtPaymentInput) => {
    try {
      const res = await inventoryApi.payPurchase(paymentInput.payable_invoice_id, debtPaymentPayload(paymentInput));
      mergeServerJournals([res.journal]);
      setPayableInvoices((prev) => prev.map((inv) => (inv.id === String(res.purchase.id) ? mapPurchaseToPayable(res.purchase) : inv)));
      if (paymentInput.source_account_code === '1-1000') {
        setCashInDrawer((prev) => Math.max(0, prev - paymentInput.amount));
      }
      toast.success('Hutang Dibayar', `${formatRupiah(paymentInput.amount)} ke ${res.purchase.supplier_name} dibukukan.`);
    } catch (err) {
      toast.error('Pelunasan Hutang Gagal', errorMessage(err));
    }
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

  // Pelunasan piutang BON di server (Dr Kas/Bank, Cr Piutang Dagang)
  const handlePayReceivable = async (paymentInput: ReceivablePaymentInput) => {
    try {
      const res = await posApi.payReceivable(paymentInput.receivable_invoice_id, {
        amount: paymentInput.amount,
        account_code: paymentInput.destination_account_code,
        payment_date: paymentInput.payment_date,
        notes: paymentInput.notes,
      });
      const updated = mapReceivable(res.receivable);

      setReceivableInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
      if (res.journal) mergeServerJournals([res.journal]);
      if (paymentInput.destination_account_code === '1-1000') {
        setCashInDrawer((prev) => prev + paymentInput.amount);
      }
      if (updated.status === 'LUNAS') {
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? { ...t, status: 'LUNAS' } : t)));
      }

      toast.success(
        'Pembayaran Piutang Diterima',
        `${formatRupiah(paymentInput.amount)} dari ${updated.customer_name} telah masuk ke pembukuan.`
      );
    } catch (err) {
      toast.error('Pelunasan Piutang Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
    }
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
  // Produk tanpa riwayat dihapus; yang punya riwayat/stok dinonaktifkan server. Produk nonaktif diaktifkan kembali.
  const handleDeleteOrDeactivateProduct = async (productId: string) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;
    if (target.is_active === false) {
      await handleUpdateProduct(productId, { is_active: true });
      return;
    }
    if (!window.confirm(`Hapus atau nonaktifkan produk ${target.product_name}?`)) return;
    try {
      const res = await inventoryApi.deleteProduct(productId);
      handleRefreshProducts();
      toast.info(res.data.deleted ? 'Produk Dihapus' : 'Produk Dinonaktifkan', res.message ?? '');
    } catch (err) {
      toast.error('Gagal Menghapus Produk', errorMessage(err));
    }
  };

  const reloadServices = async () => {
    setServices(await posApi.listServices());
    inventoryApi.listServiceCategories().then((rows) => setServiceCategories(rows.map(mapServiceCategory))).catch(() => {});
  };

  const handleSaveService = async (serviceData: Omit<ServiceMasterItem, 'id' | 'is_active'>, serviceId?: string) => {
    const current = services.find((s) => s.id === serviceId);
    try {
      await inventoryApi.saveService({ ...serviceData, is_active: current?.is_active ?? true }, serviceId);
      await reloadServices();
      toast.success('Jasa Disimpan', `${serviceData.service_name} tersimpan.`);
    } catch (err) {
      toast.error('Gagal Menyimpan Jasa', errorMessage(err));
    }
  };

  const handleToggleService = async (serviceId: string) => {
    const current = services.find((s) => s.id === serviceId);
    if (!current) return;
    try {
      await inventoryApi.saveService({ ...current, is_active: !current.is_active }, serviceId);
      await reloadServices();
    } catch (err) {
      toast.error('Gagal Mengubah Status Jasa', errorMessage(err));
    }
  };

  const handleDeleteServicePermanent = async (serviceId: string) => {
    try {
      const res = await inventoryApi.deleteService(serviceId);
      await reloadServices();
      toast.info(res.data?.deleted ? 'Jasa Dihapus' : 'Jasa Dinonaktifkan', res.message ?? '');
    } catch (err) {
      toast.error('Gagal Menghapus Jasa', errorMessage(err));
    }
  };

  const reloadProductCategories = async () => {
    setProductCategories((await inventoryApi.listProductCategories()).map(mapProductCategory));
  };

  const handleSaveProductCategory = async (
    categoryData: { category_code: string; category_name: string; description?: string; is_active?: boolean },
    categoryId?: string
  ) => {
    try {
      await inventoryApi.saveProductCategory(categoryData, categoryId);
      await reloadProductCategories();
      toast.success('Kategori Disimpan', `${categoryData.category_name} tersimpan.`);
    } catch (err) {
      toast.error('Gagal Menyimpan Kategori', errorMessage(err));
    }
  };

  const handleDeleteProductCategory = async (categoryId: string) => {
    try {
      await inventoryApi.deleteProductCategory(categoryId);
      await reloadProductCategories();
      toast.info('Kategori Dihapus', 'Kategori produk telah dihapus.');
    } catch (err) {
      toast.error('Gagal Menghapus Kategori', errorMessage(err));
    }
  };

  const handleToggleProductCategoryStatus = async (categoryId: string) => {
    const current = productCategories.find((c) => c.id === categoryId);
    if (!current) return;
    await handleSaveProductCategory({ ...current, description: current.description, is_active: !current.is_active }, categoryId);
  };

  const handleSaveServiceCategory = async (categoryData: { code: string; name: string; description?: string }, id?: string) => {
    try {
      await inventoryApi.saveServiceCategory(categoryData, id);
      await reloadServices();
      toast.success('Kategori Jasa Disimpan', `${categoryData.name} tersimpan.`);
    } catch (err) {
      toast.error('Gagal Menyimpan Kategori Jasa', errorMessage(err));
    }
  };

  const handleDeleteServiceCategory = async (id: string) => {
    try {
      await inventoryApi.deleteServiceCategory(id);
      await reloadServices();
      toast.info('Kategori Jasa Dihapus', 'Kategori jasa telah dihapus.');
    } catch (err) {
      toast.error('Gagal Menghapus Kategori Jasa', errorMessage(err));
    }
  };

  const reloadSuppliers = async () => {
    setSuppliers((await inventoryApi.listSuppliers()).map(mapSupplier));
  };

  const handleSaveSupplier = async (supplierData: Omit<SupplierItem, 'id' | 'is_active'>, supplierId?: string): Promise<boolean> => {
    const current = suppliers.find((s) => s.id === supplierId);
    try {
      await inventoryApi.saveSupplier({ ...supplierData, is_active: current?.is_active ?? true }, supplierId);
      await reloadSuppliers();
      toast.success('Supplier Disimpan', `${supplierData.supplier_name} tersimpan.`);
      return true;
    } catch (err) {
      toast.error('Gagal Menyimpan Supplier', errorMessage(err));
      return false;
    }
  };

  const handleToggleSupplier = async (supplierId: string) => {
    const current = suppliers.find((s) => s.id === supplierId);
    if (!current) return;
    try {
      await inventoryApi.saveSupplier({ ...current, is_active: !current.is_active }, supplierId);
      await reloadSuppliers();
    } catch (err) {
      toast.error('Gagal Mengubah Status Supplier', errorMessage(err));
    }
  };

  // Booking DP di server: DP dicatat sebagai Uang Muka Pelanggan (2-1004)
  const handleSaveBooking = async (payload: BookingPayload) => {
    const booking = await posApi.createBooking(payload);
    setBookings((prev) => [mapBooking(booking, products, services), ...prev]);
    mergeServerJournals(booking.journals);
    if (booking.payment_method === 'TUNAI') {
      setCashInDrawer((prev) => prev + Number(booking.dp_amount));
    }
    toast.info(
      'Booking DP Tersimpan',
      `${booking.booking_number}: DP ${formatRupiah(Number(booking.dp_amount))} dibukukan ke Uang Muka Pelanggan.`
    );
  };

  const handleCancelBooking = async (booking: SalesBookingRecord) => {
    const refundAccount = booking.payment_method === 'TUNAI' ? '1-1000' : '1-1001';
    try {
      const res = await posApi.cancelBooking(booking.id, {
        refund_account_code: refundAccount,
        reason: 'Dibatalkan dari terminal kasir',
      });
      setBookings((prev) => prev.map((b) => (b.id === booking.id ? mapBooking(res, products, services) : b)));
      mergeServerJournals(res.journals);
      if (refundAccount === '1-1000') {
        setCashInDrawer((prev) => Math.max(0, prev - booking.dp_amount));
      }
      toast.warning('Booking Dibatalkan', `${booking.booking_number}: DP ${formatRupiah(booking.dp_amount)} dikembalikan ke pelanggan.`);
    } catch (err) {
      toast.error('Gagal Membatalkan Booking', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Tarik ulang seluruh data dari database Supabase?')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleLogout = async () => {
    await authApi.logout();
    setCurrentUser(null);
    setActiveScreen('dashboard');
    toast.info('Sesi Ditutup', 'Anda telah keluar dari sistem Omah Ban Cabang 3.');
  };

  const lowStockCount = products.filter((p) => p.stock < 5).length;
  const cartTotalQty = cart.reduce((acc, c) => acc + c.qty, 0);

  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
        <span className="text-sm font-semibold">Memeriksa sesi login...</span>
      </div>
    );
  }

  // Jika belum login, tampilkan layar Login Omah Ban Cabang 3
  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={async (user) => {
          await startSession(user);
          toast.success(`Selamat Datang, ${user.name}!`, `Berhasil masuk sebagai ${user.role} (${user.branch_name}).`);
        }}
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
          onCheckout={handleCheckout}
          onSaveBooking={handleSaveBooking}
          onCancelBooking={handleCancelBooking}
          cashierName={currentUser.name}
          cashInDrawer={cashInDrawer}
          timeString={timeString}
          currentUser={currentUser}
          canAccessBackoffice={isScreenPermitted('dashboard')}
          canAccessReceipts={isScreenPermitted('receipt')}
          permissions={{ bookingDp: can('booking_dp'), bon: can('bon_receivable') }}
          onNavigateToReceipts={() => setActiveScreen('receipt')}
          onExitToBackoffice={() => {
            if (isScreenPermitted('dashboard')) {
              setActiveScreen('dashboard');
            } else if (isScreenPermitted('receipt')) {
              setActiveScreen('receipt');
            } else {
              toast.warning('Akses Terbatas', 'Petugas kasir hanya memiliki akses ke terminal POS.');
            }
          }}
          onOpenWireframeModal={() => setShowWireframeModal(true)}
          onLogout={handleLogout}
          isEmptyState={isEmptyState}
          storeSettings={storeSettings}
          categories={productCategories}
        />
      ) : (
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] overflow-x-hidden">
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
            onLogout={handleLogout}
          />

          <main className="flex-1 min-h-0 flex flex-col relative overflow-y-auto bg-[#F8FAFC]">
            {activeScreen === 'receipt' && (
              <ThermalReceiptScreen
                currentTransaction={currentReceiptTx}
                transactionsHistory={transactions}
                storeSettings={storeSettings}
                currentUser={currentUser}
                onBackToPos={() => setActiveScreen('pos')}
                onSelectTransaction={(tx) => setCurrentReceiptTx(tx)}
                onVoidTransaction={handleVoidTransaction}
                canVoid={can('sale_void')}
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
                permissions={{
                  manage: can('inventory_manage'),
                  goodsReceipt: can('goods_receipt'),
                  stockOpname: can('stock_opname'),
                }}
                products={products}
                services={services}
                suppliers={suppliers}
                mutations={mutations}
                transactions={transactions}
                categories={productCategories}
                serviceCategories={serviceCategories}
                onCreateProduct={handleCreateProduct}
                onUpdateProduct={handleUpdateProduct}
                onGoodsReceipt={handleGoodsReceipt}
                onDeleteOrDeactivateProduct={handleDeleteOrDeactivateProduct}
                onStockOpname={handleStockOpname}
                onServerChanged={handleInventoryServerChanged}
                ledgerValuation={inventoryValuation}
                onPostOpeningBalance={can('accounting_hub') ? handlePostOpeningBalance : undefined}
                onSaveService={handleSaveService}
                onToggleService={handleToggleService}
                onDeleteServicePermanent={handleDeleteServicePermanent}
                onSaveSupplier={handleSaveSupplier}
                onToggleSupplier={handleToggleSupplier}
                onSaveCategory={handleSaveProductCategory}
                onDeleteCategory={handleDeleteProductCategory}
                onToggleCategoryStatus={handleToggleProductCategoryStatus}
                onSaveServiceCategory={handleSaveServiceCategory}
                onDeleteServiceCategory={handleDeleteServiceCategory}
                onRefreshProducts={handleRefreshProducts}
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
                storeSettings={storeSettings}
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
                onSavePermissions={async (newPerms) => {
                  setRolePermissions(await authApi.updateRolePermissions(newPerms));
                }}
              />
            )}
          </main>
        </div>
      )}

      {/* Buku Panduan Pengguna Toko (User Guide) Modal */}
      <WireframeGuideModal
        isOpen={showWireframeModal}
        onClose={() => setShowWireframeModal(false)}
      />
    </div>
  );
}
