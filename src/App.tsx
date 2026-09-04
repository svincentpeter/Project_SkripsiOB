import React, { useState, useEffect } from 'react';
import { 
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
  SalesBookingRecord, 
  ServiceMasterItem, 
  StockMutation, 
  StoreSettings, 
  SupplierItem, 
  TireProduct, 
  UpdateProductInput 
} from './shared/types';
import { 
  INITIAL_ACCOUNT_BALANCES, 
  INITIAL_BOOKINGS, 
  INITIAL_EXPENSES, 
  INITIAL_JOURNALS, 
  INITIAL_PAYABLE_INVOICES, 
  INITIAL_PRODUCTS, 
  INITIAL_SERVICES, 
  INITIAL_STOCK_MUTATIONS, 
  INITIAL_STORE_SETTINGS, 
  INITIAL_SUPPLIERS, 
  INITIAL_TRANSACTIONS 
} from './shared/data/mockData';
import { generateExpenseJournal, generateSalesJournal } from './shared/utils/formatters';
import { 
  generatePurchaseJournal, 
  generateDebtPaymentJournal, 
  generateManualJournal 
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
import { WireframeGuideModal } from './shared/components/WireframeGuideModal';
import { HeaderNavbar } from './shared/components/HeaderNavbar';
import { Loader2 } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('dashboard');

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
  };

  // Handle Expense Add
  const handleAddExpense = (newExpense: ExpenseRecord) => {
    setExpenses((prev) => [newExpense, ...prev]);

    // Auto generate Journal
    const newJournal = generateExpenseJournal(newExpense, journals.length + 1);
    setJournals((prev) => [newJournal, ...prev]);

    // If source is cash laci, deduct from drawer
    if (newExpense.cash_source.includes('Laci')) {
      setCashInDrawer((prev) => Math.max(0, prev - newExpense.amount));
    }
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
    if (mutation) {
      setMutations((prev) => [mutation, ...prev]);
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

          return {
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

    // 2. Auto-generate Double-Entry Purchase Journal
    const totalCost = input.incoming_qty * input.unit_cost;
    const newJournal = generatePurchaseJournal(input, totalCost, journals.length + 1);
    setJournals((prev) => [newJournal, ...prev]);

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
          return {
            ...inv,
            paid_amount: newPaid,
            remaining_amount: newRemaining,
            status: newStatus,
          };
        }
        return inv;
      })
    );
  };

  // Handle Manual Adjusting Journal
  const handleAddManualJournal = (input: ManualJournalInput) => {
    const newJournal = generateManualJournal(input, journals.length + 1);
    setJournals((prev) => [newJournal, ...prev]);

    // If affects 1-1000 Kas Toko
    input.lines.forEach((l) => {
      if (l.account_code === '1-1000') {
        if (l.debit > 0) setCashInDrawer((prev) => prev + l.debit);
        if (l.credit > 0) setCashInDrawer((prev) => Math.max(0, prev - l.credit));
      }
    });
  };

  // Handle Safe Delete or Deactivate Product
  const handleDeleteOrDeactivateProduct = (productId: string) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const check = canSafelyDeleteProduct(targetProduct, mutations, transactions);
    if (check.canDelete) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    } else {
      // Toggle is_active status (soft delete / reactivate)
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: !p.is_active } : p))
      );
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
  };

  const handleConvertBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'CONVERTED' } : b))
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
      setCashInDrawer(2450000);
      setCart([]);
      setCurrentReceiptTx(null);
      localStorage.clear();
      alert('Data sistem telah direset ke kondisi awal!');
    }
  };

  const lowStockCount = products.filter((p) => p.stock < 5).length;
  const cartTotalQty = cart.reduce((acc, c) => acc + c.qty, 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
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
          cart={cart}
          setCart={setCart}
          onCompleteSale={handleCompleteSale}
          onSaveBooking={handleSaveBooking}
          onConvertBooking={handleConvertBooking}
          cashierName="Fani A. (Shift Pagi)"
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
            onOpenWireframeModal={() => setShowWireframeModal(true)}
            onResetData={handleResetData}
            currentTimeStr={timeString}
          />

          <main className="flex-1 flex flex-col relative overflow-hidden bg-[#F8FAFC]">
            {activeScreen === 'receipt' && (
              <ThermalReceiptScreen
                currentTransaction={currentReceiptTx}
                transactionsHistory={transactions}
                storeSettings={storeSettings}
                onBackToPos={() => setActiveScreen('pos')}
                onSelectTransaction={(tx) => setCurrentReceiptTx(tx)}
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
              />
            )}

            {activeScreen === 'ledger' && (
              <GeneralLedgerScreen
                journals={journals}
                initialBalances={accountBalances}
                payableInvoices={payableInvoices}
                products={products}
                cashInDrawer={cashInDrawer}
                onAddManualJournal={handleAddManualJournal}
                onPayDebt={handlePayDebt}
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
                onSaveSettings={(newSet) => setStoreSettings(newSet)}
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
