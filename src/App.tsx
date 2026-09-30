import React, { useState, useEffect, useCallback } from 'react';
import {
  ActiveScreen,
  CartItem,
  ChartOfAccount,
  CreateProductInput,
  DebtPaymentInput,
  ExpenseRecord,
  GoodsReceiptInput,
  JournalEntry,
  ManualJournalPayload,
  OpeningBalanceInput,
  PayableInvoice,
  PermissionKey,
  PosTransaction, 
  ProductCategory,
  ProductItem, 
  ParkedTransaction,
  RolePermissionsConfig,
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
  INITIAL_STORE_SETTINGS,
  INITIAL_SUPPLIERS,
  INITIAL_STOCK_MUTATIONS,
} from './shared/data/mockData';
import { LoginScreen } from './modules/auth';
import { formatRupiah } from './shared/utils/formatters';
import { setExportConfig } from './shared/export/exportConfig';
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
  accountingApi,
  apiClient,
  mapAccount,
  productApi,
  posApi,
  authApi,
  authToken,
  setUnauthorizedHandler,
  mapSaleToTransaction,
  inventoryApi,
  mapMovement,
  mapProductCategory,
  mapPurchaseToPayable,
  payablesFromPurchases,
  mapServiceCategory,
  mapSupplier,
  productPayload,
  restockPayload,
  debtPaymentPayload,
  expenseApi,
  mapExpense,
  expenseFormData,
} from './services/api';
import type { ApiJournal, ApiSale, CheckoutPayload, InventoryValuation, ApiExpenseCategory, CashBalances } from './services/api';
import {
  upsertParkedOrderToSupabase,
  deleteParkedOrderFromSupabase,
  upsertProductToSupabase,
  deleteProductFromSupabase,
  insertStockMutationToSupabase,
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
  /** Peran yang boleh membaca saldo buku kas/bank (GET /accounting/cash-balances); laci kasir = akun 1-1000. */
  const canReadCash = can('expenses') || can('accounting_hub') || can('financial_reports') || can('cash_session');

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
      if (!saved) return INITIAL_STORE_SETTINGS;
      // Properti lama dibuang dari pengaturan tersimpan: fitur yang dihapus (spec 2026-09-30) dan provider
      // bank/QRIS yang kini hanya ada di server (spec payment hardening).
      const {
        edc_settings: _edc,
        coa_receivable_account: _receivable,
        bank_providers: _banks,
        qris_providers: _qris,
        ...settings
      } = JSON.parse(saved);
      return settings;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [services, setServices] = useState<ServiceMasterItem[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
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

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ApiExpenseCategory[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalances>({ '1-1000': 0, '1-1001': 0 });
  const [mutations, setMutations] = useState<StockMutation[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  /** Naik setiap kali server membukukan jurnal; komponen laporan memuat ulang saat nilainya berubah. */
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [payableInvoices, setPayableInvoices] = useState<PayableInvoice[]>([]);

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

    // 2. Jatuh Tempo Hutang Distributor
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

    return list;
  }, [products, payableInvoices, readNotifIds, dismissedNotifIds]);

  // Data POS (katalog & nota) selalu dari server Laravel sesuai izin peran.
  const loadPosData = async (user: UserSession, permissions: RolePermissionsConfig) => {
    const allowed = (...keys: PermissionKey[]) => keys.some((k) => hasPermission(user, permissions, k));
    const catalog = allowed('pos', 'inventory_view');
    const [apiProducts, apiServices, apiSales, apiProductCats, apiServiceCats, apiSuppliers] = await Promise.all([
      catalog ? productApi.list().catch(() => null) : null,
      catalog ? posApi.listServices().catch(() => null) : null,
      allowed('pos', 'receipt') ? posApi.listTransactions().catch(() => null) : null,
      catalog ? inventoryApi.listProductCategories().catch(() => null) : null,
      catalog ? inventoryApi.listServiceCategories().catch(() => null) : null,
      catalog ? inventoryApi.listSuppliers().catch(() => null) : null,
    ]);
    if (apiProductCats) setProductCategories(apiProductCats.map(mapProductCategory));
    if (apiServiceCats) setServiceCategories(apiServiceCats.map(mapServiceCategory));
    if (apiSuppliers) setSuppliers(apiSuppliers.map(mapSupplier));
    if (allowed('goods_receipt', 'accounts_payable')) refreshPayables();
    if (allowed('inventory_view')) refreshStockLedger();
    if (allowed('accounting_hub', 'financial_reports', 'expenses')) {
      accountingApi.accounts().then((rows) => setAccounts(rows.map(mapAccount))).catch(() => {});
    }
    if (allowed('expenses')) {
      expenseApi.list().then((rows) => setExpenses(rows.map(mapExpense))).catch(() => {});
      expenseApi.categories().then(setExpenseCategories).catch(() => {});
    }
    if (allowed('expenses', 'accounting_hub', 'financial_reports', 'cash_session')) refreshCashBalances();
    if (apiProducts) setProducts(apiProducts);
    if (apiServices) setServices(apiServices);
    if (apiSales) {
      const txs = apiSales.map(mapSaleToTransaction);
      setTransactions(txs);
      setCurrentReceiptTx((prev) => prev ?? txs[0] ?? null);
    }
  };

  const refreshPayables = () => {
    inventoryApi
      .listPurchases('all')
      .then((rows) => setPayableInvoices(payablesFromPurchases(rows)))
      .catch(() => {});
  };

  /** Kartu stok & keselarasan nilai FIFO dengan buku besar 1-2000. */
  const refreshStockLedger = () => {
    inventoryApi.listMovements().then((rows) => setMutations(rows.map(mapMovement))).catch(() => {});
    inventoryApi.valuation().then(setInventoryValuation).catch(() => {});
  };

  /** Saldo buku kas laci & bank hari ini (server). */
  const refreshCashBalances = () => {
    accountingApi.cashBalances().then(setCashBalances).catch(() => {});
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

  // Salinan akuntansi lokal lama (Tahap 4) dan penghitung laci per-browser (kini saldo buku 1-1000) tidak dipakai lagi.
  useEffect(() => {
    ['ob3_journals', 'ob3_expenses', 'ob3_account_balances', 'ob3_period_info', 'ob3_cash_drawer'].forEach((key) => localStorage.removeItem(key));
  }, []);

  /** Server membukukan jurnal: muat ulang laporan akuntansi dan saldo kas/bank. */
  const notifyLedgerChanged = (apiJournals: ApiJournal[]) => {
    if (apiJournals.length === 0) return;
    setLedgerVersion((v) => v + 1);
    // Saldo kas/bank hanya dibaca peran yang diizinkan (sama seperti loadPosData).
    if (canReadCash) refreshCashBalances();
  };

  const handleCheckout = async (payload: CheckoutPayload): Promise<PosTransaction> => {
    const sale = await posApi.checkout(payload);
    const tx = mapSaleToTransaction(sale);

    setTransactions((prev) => [tx, ...prev]);
    setCurrentReceiptTx(tx);
    notifyLedgerChanged(sale.journals);
    handleRefreshProducts();

    toast.success('Transaksi Kasir Berhasil!', `Nota ${tx.invoice_number} dibukukan di server.`);
    return tx;
  };

  // BKK dibukukan server (nomor, jurnal Dr beban / Cr kas atau bank, lampiran nota).
  const handleAddExpense = async (record: ExpenseRecord): Promise<boolean> => {
    const category = expenseCategories.find((c) => c.name === record.category);
    if (!category) {
      toast.error('Kategori Tidak Dikenal', `Kategori "${record.category}" belum tersedia di server.`);
      return false;
    }
    try {
      const res = await expenseApi.create(expenseFormData(record, category.id));
      setExpenses((prev) => [mapExpense(res.expense), ...prev]);
      notifyLedgerChanged(res.journals);
      toast.success('Beban Toko Dibukukan', `${res.expense.reference} (${record.category}) sebesar ${formatRupiah(record.amount)} tersimpan di server.`);
      return true;
    } catch (err) {
      toast.error('Beban Ditolak Server', errorMessage(err));
      return false;
    }
  };

  // Pembatalan BKK: server membukukan jurnal pembalik yang tertaut ke jurnal asal.
  const handleVoidExpense = async (target: ExpenseRecord, reason: string): Promise<boolean> => {
    try {
      const res = await expenseApi.void(target.id, reason);
      const updated = mapExpense(res.expense);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      notifyLedgerChanged(res.journals);
      toast.warning('Pengeluaran Dibatalkan (VOID)', `${updated.reference} dibatalkan; jurnal pembalik dibukukan.`);
      return true;
    } catch (err) {
      toast.error('Pembatalan Ditolak', errorMessage(err));
      return false;
    }
  };

  // Void nota di server: jurnal pembalik + stok kembali ke batch FIFO asal
  const handleVoidTransaction = async (txId: string, voidReason: string) => {
    try {
      const sale = await posApi.voidTransaction(txId, voidReason);
      const tx = mapSaleToTransaction(sale);

      setTransactions((prev) => prev.map((t) => (t.id === txId ? tx : t)));
      if (currentReceiptTx?.id === txId) setCurrentReceiptTx(tx);
      notifyLedgerChanged(sale.journals);
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

  /**
   * Dokumen sudah dibukukan server (201): galat saat memperbarui tampilan tidak boleh tampil sebagai "ditolak",
   * karena modal lalu tetap terbuka dan klik kedua membukukan retur/refund kedua.
   */
  const afterBooked = (update: () => void) => {
    try {
      update();
    } catch (err) {
      toast.warning('Sudah Dibukukan', `Dokumen tersimpan di server, tetapi tampilan gagal diperbarui (${errorMessage(err)}). Muat ulang halaman.`);
    }
  };

  // Retur penjualan di server: refund tunai dari laci (shift kasir harus buka), barang kembali ke batch FIFO asal.
  const handleSalesReturn = async (
    txId: string,
    items: { sale_detail_id: number; quantity: number }[],
    reason: string
  ): Promise<boolean> => {
    let res: Awaited<ReturnType<typeof posApi.createSalesReturn>>;
    try {
      res = await posApi.createSalesReturn(txId, { items, reason });
    } catch (err) {
      toast.error('Retur Ditolak', errorMessage(err));
      return false;
    }
    afterBooked(() => {
      if (res.journal) notifyLedgerChanged([res.journal]);
      handleRefreshProducts();
      const tx = mapSaleToTransaction(res.sale);
      setTransactions((prev) => prev.map((t) => (t.id === txId ? tx : t)));
      if (currentReceiptTx?.id === txId) setCurrentReceiptTx(tx);
      toast.success(
        'Retur Penjualan Dibukukan',
        `${res.sales_return.reference}: serahkan refund tunai ${formatRupiah(res.sales_return.refund_amount)} dari laci.`
      );
    });
    return true;
  };

  // Retur pembelian: hutang dikurangi dulu, sisanya refund kas/bank; persediaan dan daftar hutang dimuat ulang.
  const handlePurchaseReturn = async (
    purchaseId: number,
    payload: { quantity: number; reason: string; refund_account_code?: '1-1000' | '1-1001' }
  ): Promise<boolean> => {
    let res: Awaited<ReturnType<typeof inventoryApi.returnPurchase>>;
    try {
      res = await inventoryApi.returnPurchase(purchaseId, payload);
    } catch (err) {
      toast.error('Retur Pembelian Ditolak', errorMessage(err));
      return false;
    }
    afterBooked(() => {
      if (res.journal) notifyLedgerChanged([res.journal]);
      refreshPayables();
      handleRefreshProducts();
      toast.success(
        'Retur Pembelian Dibukukan',
        `${res.purchase_return.reference}: ${formatRupiah(res.purchase_return.total_amount)} dikembalikan ke ${res.purchase.supplier_name}.`
      );
    });
    return true;
  };

  // Pembatalan penerimaan yang belum tersentuh: jurnal cermin pembelian.
  const handleCancelReceipt = async (purchaseId: number, reason: string): Promise<boolean> => {
    let res: Awaited<ReturnType<typeof inventoryApi.cancelPurchase>>;
    try {
      res = await inventoryApi.cancelPurchase(purchaseId, reason);
    } catch (err) {
      toast.error('Pembatalan Ditolak', errorMessage(err));
      return false;
    }
    afterBooked(() => {
      if (res.journal) notifyLedgerChanged([res.journal]);
      refreshPayables();
      handleRefreshProducts();
      toast.warning('Penerimaan Dibatalkan', `${res.purchase.purchase_number} dibatalkan (${res.purchase_return.reference}).`);
    });
    return true;
  };

  // Stock opname di server: FIFO + jurnal selisih persediaan (5-2000)
  const handleStockOpname = async (items: { product_id: number; physical_qty: number }[], notes: string): Promise<boolean> => {
    if (items.length === 0) {
      toast.info('Tidak Ada Selisih', 'Stok fisik sama dengan stok sistem.');
      return true;
    }
    try {
      const res = await inventoryApi.stockOpname(items, notes);
      if (res.journal) notifyLedgerChanged([res.journal]);
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
    if (journal) notifyLedgerChanged([journal]);
    handleRefreshProducts();
  };

  const handlePostOpeningBalance = async () => {
    try {
      const res = await inventoryApi.postOpeningBalance();
      if (res.journal) notifyLedgerChanged([res.journal]);
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
      if (res.journal) notifyLedgerChanged([res.journal]);
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
      // Barang bonus (harga pokok Rp 0) tidak dijurnal server.
      if (res.journal) notifyLedgerChanged([res.journal]);
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
      notifyLedgerChanged([res.journal]);
      setPayableInvoices((prev) => prev.map((inv) => (inv.id === String(res.purchase.id) ? mapPurchaseToPayable(res.purchase) : inv)));
      toast.success('Hutang Dibayar', `${formatRupiah(paymentInput.amount)} ke ${res.purchase.supplier_name} dibukukan.`);
    } catch (err) {
      toast.error('Pelunasan Hutang Gagal', errorMessage(err));
    }
  };

  // Jurnal penyesuaian manual dibukukan server (akun kontrol ditolak server).
  const handleAddManualJournal = async (payload: ManualJournalPayload): Promise<boolean> => {
    try {
      const journal = await accountingApi.createManualJournal(payload);
      notifyLedgerChanged([journal]);
      toast.success('Jurnal Penyesuaian Dibukukan', `${journal.entry_number} tersimpan di server.`);
      return true;
    } catch (err) {
      toast.error('Jurnal Ditolak Server', errorMessage(err));
      return false;
    }
  };

  // Tutup buku di server: jurnal penutup bertanggal akhir bulan + kunci periode.
  const handleClosePeriod = async (period: string, notes: string): Promise<boolean> => {
    try {
      const closing = await accountingApi.closePeriod(period, notes);
      setLedgerVersion((v) => v + 1);
      toast.success('Tutup Buku Berhasil', `Periode ${closing.period} dikunci. Laba ${formatRupiah(closing.net_income)} dipindahkan ke Laba Ditahan.`);
      return true;
    } catch (err) {
      toast.error('Tutup Buku Ditolak', errorMessage(err));
      return false;
    }
  };

  // Hanya pemilik; server menolak peran lain dan periode selain yang terakhir ditutup.
  const handleReopenPeriod = async (period: string, reason: string): Promise<boolean> => {
    try {
      await accountingApi.reopenPeriod(period, reason);
      setLedgerVersion((v) => v + 1);
      toast.warning('Periode Dibuka Kembali', `Periode ${period} dapat menerima transaksi lagi.`);
      return true;
    } catch (err) {
      toast.error('Gagal Membuka Periode', errorMessage(err));
      return false;
    }
  };

  // Saldo awal kas, bank, aset tetap & laba ditahan (sekali); selisihnya menjadi modal disetor.
  const handlePostAccountOpening = async (input: OpeningBalanceInput): Promise<boolean> => {
    try {
      const journal = await accountingApi.postOpeningBalance(input);
      notifyLedgerChanged([journal]);
      toast.success('Saldo Awal Dibukukan', `${journal.entry_number} mencatat saldo awal akun.`);
      return true;
    } catch (err) {
      toast.error('Saldo Awal Ditolak', errorMessage(err));
      return false;
    }
  };

  // Storno hanya untuk jurnal penyesuaian manual; transaksi lain dibatalkan dari modul asalnya.
  const handleReverseJournal = async (journal: JournalEntry, reason: string): Promise<boolean> => {
    try {
      const reversal = await accountingApi.reverseJournal(journal.journal_number, reason);
      notifyLedgerChanged([reversal]);
      toast.info('Jurnal Pembalik Dibukukan', `${reversal.entry_number} membalik ${journal.journal_number}.`);
      return true;
    } catch (err) {
      toast.error('Pembalikan Ditolak', errorMessage(err));
      return false;
    }
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
          parkedOrders={parkedOrders}
          onSaveParkedOrder={handleSaveParkedOrder}
          onDeleteParkedOrder={handleDeleteParkedOrder}
          cart={cart}
          setCart={setCart}
          onCheckout={handleCheckout}
          cashierName={currentUser.name}
          cashInDrawer={canReadCash ? cashBalances['1-1000'] : null}
          canUseCashSession={can('cash_session')}
          timeString={timeString}
          currentUser={currentUser}
          canAccessBackoffice={isScreenPermitted('dashboard')}
          canAccessReceipts={isScreenPermitted('receipt')}
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
            cashInDrawer={canReadCash ? cashBalances['1-1000'] : null}
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
                onSalesReturn={handleSalesReturn}
                canReturn={can('sales_return')}
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
                onPurchaseReturn={can('purchase_return') ? handlePurchaseReturn : undefined}
                onCancelReceipt={can('purchase_return') ? handleCancelReceipt : undefined}
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
                cashInDrawer={cashBalances['1-1000']}
                bankBalance={cashBalances['1-1001']}
                onVoidExpense={handleVoidExpense}
                storeSettings={storeSettings}
              />
            )}

            {activeScreen === 'ledger' && (
              <GeneralLedgerScreen
                ledgerVersion={ledgerVersion}
                accounts={accounts}
                payableInvoices={payableInvoices}
                cashInDrawer={cashBalances['1-1000']}
                canApproveCash={can('cash_session_approve')}
                canMoveCash={can('cash_movement')}
                onLedgerChanged={notifyLedgerChanged}
                canReopenPeriod={currentUser?.role === 'OWNER'}
                canUseHub={can('accounting_hub')}
                canUsePayables={can('accounts_payable')}
                canManageFixedAssets={can('fixed_assets')}
                canReconcileBank={can('bank_reconciliation')}
                onAddManualJournal={handleAddManualJournal}
                onReverseJournal={handleReverseJournal}
                onClosePeriod={handleClosePeriod}
                onReopenPeriod={handleReopenPeriod}
                onPostOpeningBalance={handlePostAccountOpening}
                onPayDebt={handlePayDebt}
                onNavigateToFinancials={can('financial_reports') ? () => setActiveScreen('financials') : undefined}
              />
            )}

            {activeScreen === 'financials' && (
              <FinancialStatementsScreen refreshKey={ledgerVersion} />
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
