import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { Clock, LogOut, Package, RotateCcw, ShoppingCart } from 'lucide-react';
import {
  CartItem,
  ParkedTransaction,
  PaymentMethod,
  PosTransaction,
  ProductCategory,
  ProductItem,
  ServiceMasterItem,
  StoreSettings,
  UserSession,
} from '../../shared/types';
import { formatRupiah } from '../../shared/utils/formatters';
import { TablePagination, useDialog, usePagination, useToast } from '../../shared/components';
import {
  CheckoutPayload,
  CheckoutPaymentMeta,
  buildPayments,
  cartLineToPayload,
  serviceCartProduct,
} from '../../services/api';
import {
  calculateCartTotals,
  createPosTransactionRecord,
  generateInvoiceNumber,
} from '../../services/posService';
import {
  CartLineEditModal,
  CheckoutModal,
  ManualItemForm,
  ParkedOrdersDrawer,
  PosCartPanel,
  PosCatalogToolbar,
  PosHeader,
  PosProductCard,
  PosServiceCard,
  PosSuccessModal,
  ReceiptPreviewModal,
  getShortCategoryName,
} from './components';
import { localDate } from '../../services/accountingPeriod';
import {
  CASHIER_INITIAL_PRICE_REASONS,
  getProductReferenceHpp,
  getRecommendedPriceByMarkup,
} from '../../shared/utils/pricingStandard';

export { getShortCategoryName };

interface PosScreenProps {
  products: ProductItem[];
  services?: ServiceMasterItem[];
  parkedOrders?: ParkedTransaction[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  /** Checkout dibukukan server; mengembalikan nota resmi atau melempar error. */
  onCheckout: (payload: CheckoutPayload) => Promise<PosTransaction>;
  onSaveParkedOrder?: (order: ParkedTransaction) => void;
  onDeleteParkedOrder?: (orderId: string) => void;
  cashierName: string;
  /** Saldo buku kas laci (akun 1-1000); null bila peran tidak boleh membaca saldo kas. */
  cashInDrawer: number | null;
  /** Izin `cash_session`: tombol buka/tutup shift kasir. */
  canUseCashSession?: boolean;
  timeString: string;
  onExitToBackoffice?: () => void;
  onOpenWireframeModal?: () => void;
  isEmptyState?: boolean;
  storeSettings?: StoreSettings;
  categories?: ProductCategory[];
  currentUser?: UserSession | null;
  canAccessBackoffice?: boolean;
  canAccessReceipts?: boolean;
  onNavigateToReceipts?: () => void;
  onLogout?: () => void;
}

const defaultCategories: ProductCategory[] = [
  { id: 'cat-01', category_code: 'BAN_BARU', category_name: 'Ban Mobil Baru', description: 'Ban luar mobil baru berbagai ukuran', is_active: true },
  { id: 'cat-02', category_code: 'VELG', category_name: 'Velg Mobil', description: 'Velg mobil racing & standar', is_active: true },
  { id: 'cat-04', category_code: 'OLI_PELUMAS', category_name: 'Oli & Pelumas', description: 'Oli mesin, transmisi, dan cairan rem', is_active: true },
  { id: 'cat-03', category_code: 'BAN_DALAM', category_name: 'Ban Dalam', description: 'Ban dalam dan flap velg', is_active: true },
];

export const PosScreen: React.FC<PosScreenProps> = ({
  products,
  services = [],
  parkedOrders = [],
  cart,
  setCart,
  onCheckout,
  onSaveParkedOrder,
  onDeleteParkedOrder,
  cashierName,
  cashInDrawer,
  canUseCashSession = false,
  onExitToBackoffice,
  onOpenWireframeModal,
  isEmptyState = false,
  storeSettings,
  categories = [],
  currentUser,
  canAccessBackoffice = true,
  canAccessReceipts = false,
  onNavigateToReceipts,
  onLogout,
}) => {
  const toast = useToast();
  const dialog = useDialog();
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const availableCategories = useMemo(() => {
    return categories && categories.length > 0
      ? categories.filter((c) => c.is_active !== false)
      : defaultCategories;
  }, [categories]);

  const [catalogTab, setCatalogTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedRing, setSelectedRing] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'AVAILABLE' | 'LOW' | 'OUT'>('ALL');
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>('ALL');

  const [customerName, setCustomerName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  const [editLineIndex, setEditLineIndex] = useState<number | null>(null);
  const [pendingZeroPriceItem, setPendingZeroPriceItem] = useState<CartItem | null>(null);
  const [showParkedDrawer, setShowParkedDrawer] = useState<boolean>(false);
  const [printTransaction, setPrintTransaction] = useState<PosTransaction | null>(null);
  const [completedSaleTx, setCompletedSaleTx] = useState<PosTransaction | null>(null);
  const [showReceiptPreviewModal, setShowReceiptPreviewModal] = useState<boolean>(false);
  const [previewReceiptTx, setPreviewReceiptTx] = useState<PosTransaction | null>(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const { activeProductsCount, categoryCountByCode, categoryCountById } = useMemo(() => {
    const byCode = new Map<string, number>();
    const byId = new Map<string, number>();
    let activeTotal = 0;
    for (const p of products) {
      if (p.is_active === false) continue;
      activeTotal += 1;
      const code = (p.category || '').toUpperCase().trim();
      if (code) byCode.set(code, (byCode.get(code) ?? 0) + 1);
      if (p.category_id) {
        const cid = String(p.category_id);
        byId.set(cid, (byId.get(cid) ?? 0) + 1);
      }
    }
    return { activeProductsCount: activeTotal, categoryCountByCode: byCode, categoryCountById: byId };
  }, [products]);

  const getCategoryProductCount = (categoryCode: string, categoryId?: string) => {
    const code = categoryCode.toUpperCase().trim();
    return categoryCountByCode.get(code) ?? (categoryId ? categoryCountById.get(categoryId) ?? 0 : 0);
  };

  const { productQtyInCart, serviceQtyInCart } = useMemo(() => {
    const prodMap = new Map<string, number>();
    const srvMap = new Map<string, number>();
    for (const item of cart) {
      if (item.item_type === 'PRODUCT' && item.product?.id !== undefined) {
        const key = String(item.product.id);
        prodMap.set(key, (prodMap.get(key) ?? 0) + item.qty);
      } else if (item.item_type === 'SERVICE' && item.service?.id !== undefined) {
        const key = String(item.service.id);
        srvMap.set(key, (srvMap.get(key) ?? 0) + item.qty);
      }
    }
    return { productQtyInCart: prodMap, serviceQtyInCart: srvMap };
  }, [cart]);

  const availableServiceCategories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach((s) => {
      if (s.is_active !== false && s.category) cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [services]);

  const availableRings = useMemo(() => {
    const rings = new Set<string>();
    const tabCode = catalogTab.toUpperCase().trim();
    products.forEach((p) => {
      const pCat = (p.category || '').toUpperCase().trim();
      const matchesCategory =
        tabCode === 'ALL' || pCat === tabCode || (p.category_id && String(p.category_id) === catalogTab);
      if (matchesCategory && p.is_active !== false && p.ring && p.ring.trim()) {
        rings.add(p.ring.trim());
      }
    });
    return Array.from(rings).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });
  }, [products, catalogTab]);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    const tabCode = catalogTab.toUpperCase().trim();
    products.forEach((p) => {
      const pCat = (p.category || '').toUpperCase().trim();
      const matchesCategory =
        tabCode === 'ALL' || pCat === tabCode || (p.category_id && String(p.category_id) === catalogTab);
      if (matchesCategory && p.is_active !== false && p.brand && p.brand.trim()) {
        brands.add(p.brand.trim());
      }
    });
    return Array.from(brands).sort();
  }, [products, catalogTab]);

  const filteredProducts = useMemo(() => {
    if (isEmptyState || catalogTab === 'SERVICES' || catalogTab === 'MANUAL') return [];
    const tabCode = catalogTab.toUpperCase().trim();
    const q = deferredSearchQuery.toLowerCase().trim();

    return products.filter((prod) => {
      if (prod.is_active === false) return false;
      const pCat = (prod.category || '').toUpperCase().trim();
      const matchesCategory =
        tabCode === 'ALL' || pCat === tabCode || (prod.category_id && String(prod.category_id) === catalogTab);
      if (!matchesCategory) return false;

      if (q) {
        const matchesQuery =
          (prod.name && prod.name.toLowerCase().includes(q)) ||
          (prod.product_name && prod.product_name.toLowerCase().includes(q)) ||
          (prod.brand && prod.brand.toLowerCase().includes(q)) ||
          (prod.motif && prod.motif.toLowerCase().includes(q)) ||
          (prod.product_size && prod.product_size.toLowerCase().includes(q)) ||
          (prod.pcd && prod.pcd.toLowerCase().includes(q)) ||
          (prod.product_code && prod.product_code.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      if (selectedRing !== 'ALL' && prod.ring !== selectedRing) return false;
      if (selectedBrand !== 'ALL' && prod.brand !== selectedBrand) return false;

      const stockQty = prod.stock || prod.product_quantity || 0;
      const lowThreshold = prod.product_stock_alert ?? prod.min_stock ?? 3;
      if (stockFilter === 'AVAILABLE' && stockQty <= 0) return false;
      if (stockFilter === 'LOW' && (stockQty <= 0 || stockQty > lowThreshold)) return false;
      if (stockFilter === 'OUT' && stockQty > 0) return false;

      return true;
    });
  }, [isEmptyState, catalogTab, products, deferredSearchQuery, selectedRing, selectedBrand, stockFilter]);

  const posProductPagination = usePagination(filteredProducts, 24, [
    catalogTab,
    deferredSearchQuery,
    selectedRing,
    selectedBrand,
    stockFilter,
  ]);

  const filteredServices = useMemo(() => {
    if (isEmptyState || catalogTab !== 'SERVICES') return [];
    const q = deferredSearchQuery.toLowerCase().trim();
    const selCat = selectedServiceCategory.toUpperCase();

    return services.filter((srv) => {
      if (srv.is_active === false) return false;
      if (selectedServiceCategory !== 'ALL' && srv.category.toUpperCase() !== selCat) return false;
      if (!q) return true;
      return (
        srv.service_name.toLowerCase().includes(q) ||
        srv.service_code.toLowerCase().includes(q) ||
        srv.category.toLowerCase().includes(q)
      );
    });
  }, [isEmptyState, catalogTab, services, selectedServiceCategory, deferredSearchQuery]);

  const posServicePagination = usePagination(filteredServices, 24, [
    catalogTab,
    selectedServiceCategory,
    deferredSearchQuery,
  ]);

  const totals = calculateCartTotals(cart, manualDiscount);
  const netPayable = totals.grandTotal;
  const totalCartQty = cart.reduce((sum, item) => sum + item.qty, 0);

  const hasOpenModal =
    showCheckoutModal ||
    editLineIndex !== null ||
    pendingZeroPriceItem !== null ||
    showParkedDrawer ||
    showReceiptPreviewModal ||
    Boolean(completedSaleTx) ||
    showLogoutConfirm;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8' && !hasOpenModal && cart.length > 0) {
        e.preventDefault();
        setShowCheckoutModal(true);
      } else if (e.key === 'Escape' && showLogoutConfirm) {
        setShowLogoutConfirm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasOpenModal, cart.length, showLogoutConfirm]);

  const handleSelectTab = (tab: string) => {
    setCatalogTab(tab);
    setSelectedRing('ALL');
    setSelectedBrand('ALL');
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedRing('ALL');
    setSelectedBrand('ALL');
    setStockFilter('ALL');
    setSelectedServiceCategory('ALL');
    if (catalogTab !== 'SERVICES') {
      setCatalogTab('ALL');
    }
  };

  const hasActiveFilter =
    catalogTab === 'SERVICES'
      ? Boolean(searchQuery || selectedServiceCategory !== 'ALL')
      : Boolean(
          searchQuery ||
            selectedRing !== 'ALL' ||
            selectedBrand !== 'ALL' ||
            stockFilter !== 'ALL' ||
            catalogTab !== 'ALL'
        );

  const handleAddToCartManual = (item: CartItem) => {
    setCart((prevCart) => [...prevCart, item]);
  };

  const handleAddToCart = (product: ProductItem) => {
    const stockAvailable = product.stock || product.product_quantity || 0;
    if (stockAvailable <= 0) return;

    const existingIndex = cart.findIndex(
      (it) => it.item_type === 'PRODUCT' && it.product.id === product.id
    );

    if ((product.product_price || product.price || 0) <= 0) {
      if (existingIndex > -1) {
        setEditLineIndex(existingIndex);
        return;
      }
      const refHpp = getProductReferenceHpp(product);
      const suggestedMinPrice = getRecommendedPriceByMarkup(refHpp, 15);
      setPendingZeroPriceItem({
        item_type: 'PRODUCT',
        product,
        qty: 1,
        discount_per_item: 0,
        custom_price: suggestedMinPrice > 0 ? suggestedMinPrice : 100000,
        override_reason: CASHIER_INITIAL_PRICE_REASONS[0],
        adjusted_by: cashierName,
      });
      toast.info(
        'Penentuan Harga Jual Kasir',
        `${product.product_name} belum memiliki harga katalog. Cek HPP dan tentukan harga jual (min. +15%).`
      );
      return;
    }

    setCart((prevCart) => {
      const idx = prevCart.findIndex(
        (it) => it.item_type === 'PRODUCT' && it.product.id === product.id
      );

      if (idx > -1) {
        const existing = prevCart[idx];
        if (existing.qty + 1 > stockAvailable) {
          toast.warning('Stok Maksimal Tercapai', `Stok tersedia untuk ${product.product_name} hanya ${stockAvailable} unit.`);
          return prevCart;
        }
        const updated = [...prevCart];
        updated[idx] = { ...existing, qty: existing.qty + 1 };
        return updated;
      }
      return [
        ...prevCart,
        {
          item_type: 'PRODUCT',
          product,
          qty: 1,
          discount_per_item: 0,
        },
      ];
    });
  };

  const handleAddServiceToCart = (service: ServiceMasterItem) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (it) => it.item_type === 'SERVICE' && it.service?.id === service.id
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: updated[existingIndex].qty + 1,
        };
        return updated;
      }
      return [
        ...prevCart,
        {
          item_type: 'SERVICE',
          product: serviceCartProduct(service),
          service,
          qty: 1,
          discount_per_item: 0,
        },
      ];
    });
  };

  const handleUpdateCartQty = (index: number, delta: number) => {
    setCart((prevCart) => {
      const item = prevCart[index];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return prevCart.filter((_, i) => i !== index);
      }
      if (item.item_type === 'PRODUCT') {
        const stockAvailable = item.product.stock || item.product.product_quantity || 0;
        if (newQty > stockAvailable) {
          return prevCart;
        }
      }
      const updated = [...prevCart];
      updated[index] = { ...item, qty: newQty };
      return updated;
    });
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, i) => i !== index));
  };

  const handleClearCart = async () => {
    const ok = await dialog.confirm({
      title: 'Kosongkan Keranjang Kasir?',
      message: 'Seluruh item yang ada di keranjang kasir saat ini akan dihapus.',
      confirmLabel: 'Kosongkan',
      cancelLabel: 'Batal',
      tone: 'danger',
    });
    if (ok) {
      setCart([]);
      setManualDiscount(0);
    }
  };

  const handleSaveLineItem = (index: number, updatedItem: CartItem) => {
    if (pendingZeroPriceItem && index === -1) {
      setCart((prevCart) => [...prevCart, updatedItem]);
      setPendingZeroPriceItem(null);
      toast.success(
        'Harga Jual Kasir Ditetapkan',
        `${updatedItem.product.product_name} ditambahkan dengan harga ${formatRupiah(updatedItem.custom_price || 0)} (tercatat ke Audit Log Owner).`
      );
      return;
    }
    setCart((prevCart) => {
      const copy = [...prevCart];
      copy[index] = updatedItem;
      return copy;
    });
  };

  const handleCheckoutSale = async (
    method: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta: CheckoutPaymentMeta = {}
  ): Promise<boolean> => {
    if (cart.length === 0 || isSubmitting) return false;

    const payload: CheckoutPayload = {
      customer_name: customerName.trim() || undefined,
      vehicle_plate: vehiclePlate.trim() || undefined,
      vehicle_model: vehicleModel.trim() || undefined,
      notes,
      discount_amount: manualDiscount,
      items: cart.map(cartLineToPayload),
      payments: buildPayments(method, netPayable, cashTendered, paymentMeta),
    };

    setIsSubmitting(true);
    try {
      const transaction = await onCheckout(payload);
      setCompletedSaleTx(transaction);
      setCart([]);
      setManualDiscount(0);
      setCustomerName('');
      setVehiclePlate('');
      setVehicleModel('');
      return true;
    } catch (err) {
      toast.error('Transaksi Gagal Dibukukan', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      toast.warning('Keranjang Kosong', 'Tambahkan produk atau jasa ke keranjang terlebih dahulu.');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckoutFromModal = async (
    pm: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta?: CheckoutPaymentMeta
  ) => {
    const ok = await handleCheckoutSale(pm, cashTendered, notes, paymentMeta);
    if (ok) setShowCheckoutModal(false);
    return ok;
  };

  const handleParkCurrentCart = () => {
    if (cart.length === 0) {
      toast.warning('Keranjang Kosong', 'Tambahkan item ke keranjang terlebih dahulu sebelum menahan nota.');
      return;
    }

    const newParked: ParkedTransaction = {
      id: `park-${Date.now()}`,
      reference: `PARK-${localDate().replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      customer_name: customerName.trim() || 'Pelanggan Walk-In',
      vehicle_plate: vehiclePlate.trim() || 'TANPA PLAT',
      vehicle_model: vehicleModel.trim() || '-',
      items: [...cart],
      subtotal: totals.subtotal,
      total_discount: totals.discount,
      grand_total: totals.grandTotal,
      created_at: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
    };

    onSaveParkedOrder?.(newParked);
    setCart([]);
    setManualDiscount(0);
    toast.info(
      'Nota Berhasil Ditahan',
      `Nota mobil ${newParked.vehicle_plate} (${newParked.customer_name}) telah disimpan di antrian tahan.`
    );
  };

  const handleResumeParkedOrder = async (order: ParkedTransaction) => {
    if (cart.length > 0) {
      const ok = await dialog.confirm({
        title: 'Ganti Isi Keranjang Kasir?',
        message: 'Keranjang kasir saat ini masih berisi item. Ganti isi keranjang dengan nota mobil ini?',
        confirmLabel: 'Ya, Ganti Keranjang',
        cancelLabel: 'Batal',
        tone: 'warning',
      });
      if (!ok) return;
    }
    setCart(order.items);
    setCustomerName(order.customer_name === 'Pelanggan Walk-In' ? '' : order.customer_name);
    setVehiclePlate(order.vehicle_plate === 'TANPA PLAT' ? '' : order.vehicle_plate);
    setVehicleModel(order.vehicle_model === '-' ? '' : order.vehicle_model);
    onDeleteParkedOrder?.(order.id);
    setShowParkedDrawer(false);
    toast.success('Antrian Dipanggil', `Nota mobil ${order.vehicle_plate} dimuat kembali ke keranjang kasir.`);
  };

  const handleOpenReceiptPreview = (customTx?: PosTransaction) => {
    if (customTx) {
      setPreviewReceiptTx(customTx);
      setShowReceiptPreviewModal(true);
      return;
    }

    if (cart.length === 0) {
      toast.warning('Keranjang Kosong', 'Tambahkan item ke keranjang terlebih dahulu sebelum mencetak nota.');
      return;
    }
    const invoiceNo = generateInvoiceNumber();
    const tempTx = createPosTransactionRecord(
      invoiceNo,
      cart,
      customerName,
      vehiclePlate,
      vehicleModel,
      'TUNAI',
      netPayable,
      cashierName,
      manualDiscount
    );
    setPreviewReceiptTx(tempTx);
    setShowReceiptPreviewModal(true);
  };

  const handleExecutePrintFromPreview = () => {
    if (previewReceiptTx) {
      setPrintTransaction(previewReceiptTx);
      setTimeout(() => {
        window.print();
      }, 150);
    }
  };

  const handlePrintParkedOrder = (order: ParkedTransaction) => {
    const tempTx = createPosTransactionRecord(
      generateInvoiceNumber(),
      order.items,
      order.customer_name,
      order.vehicle_plate,
      order.vehicle_model,
      'TUNAI',
      order.grand_total,
      cashierName,
      order.total_discount
    );
    handleOpenReceiptPreview(tempTx);
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#F4F5F7] text-slate-900 overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Atas Tunggal */}
      <PosHeader
        searchInputRef={searchInputRef}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        canAccessBackoffice={canAccessBackoffice}
        onExitToBackoffice={onExitToBackoffice}
        parkedCount={parkedOrders.length}
        onOpenParkedDrawer={() => setShowParkedDrawer(true)}
        cashInDrawer={cashInDrawer}
        canUseCashSession={canUseCashSession}
        canAccessReceipts={canAccessReceipts}
        onNavigateToReceipts={onNavigateToReceipts}
        onOpenGuide={onOpenWireframeModal}
        cashierName={cashierName}
        currentUser={currentUser}
        onRequestLogout={onLogout ? () => setShowLogoutConfirm(true) : undefined}
      />

      {/* Mobile Tab Switcher (hanya layar < lg) */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-slate-100 border-b border-slate-200 shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 h-10 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            mobileTab === 'catalog'
              ? 'bg-blue-700 text-white'
              : 'bg-white text-slate-700 border border-slate-300'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 h-10 px-3 rounded-lg font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer tabular-nums ${
            mobileTab === 'cart'
              ? 'bg-blue-700 text-white'
              : 'bg-white text-slate-700 border border-slate-300'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Keranjang ({totalCartQty})</span>
          {cart.length > 0 && (
            <span className={mobileTab === 'cart' ? 'text-white/90 font-bold' : 'text-emerald-700 font-bold'}>
              {formatRupiah(netPayable)}
            </span>
          )}
        </button>
      </div>

      {/* 2. Area Kerja Utama (Kiri: Katalog, Kanan: Keranjang) */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <main
          className={`flex-1 min-w-0 min-h-0 bg-[#F4F5F7] h-full ${
            mobileTab === 'cart' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
          }`}
        >
          <PosCatalogToolbar
            availableCategories={availableCategories}
            catalogTab={catalogTab}
            onSelectTab={handleSelectTab}
            activeProductsCount={activeProductsCount}
            getCategoryProductCount={getCategoryProductCount}
            servicesCount={services.length}
            availableRings={availableRings}
            selectedRing={selectedRing}
            onSelectRing={setSelectedRing}
            availableBrands={availableBrands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            stockFilter={stockFilter}
            onSelectStockFilter={setStockFilter}
            availableServiceCategories={availableServiceCategories}
            selectedServiceCategory={selectedServiceCategory}
            onSelectServiceCategory={setSelectedServiceCategory}
            hasActiveFilter={hasActiveFilter}
            onResetFilters={handleResetFilters}
            filteredCount={catalogTab === 'SERVICES' ? filteredServices.length : filteredProducts.length}
          />

          {catalogTab === 'MANUAL' ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
              <ManualItemForm onAddToCart={handleAddToCartManual} />
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
              <div className="grid content-start auto-rows-max grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {catalogTab !== 'SERVICES' &&
                  posProductPagination.pageItems.map((p) => (
                    <PosProductCard
                      key={p.id}
                      product={p}
                      qtyInCart={productQtyInCart.get(String(p.id)) ?? 0}
                      onAdd={handleAddToCart}
                    />
                  ))}

                {catalogTab === 'SERVICES' &&
                  posServicePagination.pageItems.map((srv) => (
                    <PosServiceCard
                      key={srv.id}
                      service={srv}
                      qtyInCart={serviceQtyInCart.get(String(srv.id)) ?? 0}
                      onAdd={handleAddServiceToCart}
                    />
                  ))}

                {catalogTab !== 'SERVICES' && filteredProducts.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 space-y-3">
                    <Package className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Tidak ada produk yang cocok</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        {searchQuery
                          ? `Tidak ditemukan produk untuk kata kunci "${searchQuery}" pada filter saat ini.`
                          : `Tidak ada produk tersedia untuk filter Ring (${selectedRing}), Merek, dan status stok yang dipilih.`}
                      </p>
                    </div>
                    {hasActiveFilter && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Semua Filter</span>
                      </button>
                    )}
                  </div>
                )}

                {catalogTab === 'SERVICES' && filteredServices.length === 0 && (
                  <div className="col-span-full py-16 text-center text-slate-500 space-y-3">
                    <Package className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">Tidak ada layanan jasa ditemukan</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Ubah kata kunci pencarian atau reset filter kategori jasa.
                      </p>
                    </div>
                    {hasActiveFilter && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Filter Jasa</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {catalogTab !== 'SERVICES' && filteredProducts.length > 0 && (
                <div className="mt-4 bg-white border border-slate-200 rounded-xl px-3.5 pb-2.5">
                  <TablePagination
                    page={posProductPagination.page}
                    pageSize={posProductPagination.pageSize}
                    totalItems={filteredProducts.length}
                    itemLabel="produk"
                    pageSizeOptions={[12, 24, 48, 96]}
                    onPageChange={posProductPagination.setPage}
                    onPageSizeChange={posProductPagination.setPageSize}
                    compact
                  />
                </div>
              )}

              {catalogTab === 'SERVICES' && filteredServices.length > 0 && (
                <div className="mt-4 bg-white border border-slate-200 rounded-xl px-3.5 pb-2.5">
                  <TablePagination
                    page={posServicePagination.page}
                    pageSize={posServicePagination.pageSize}
                    totalItems={filteredServices.length}
                    itemLabel="layanan jasa"
                    pageSizeOptions={[12, 24, 48]}
                    onPageChange={posServicePagination.setPage}
                    onPageSizeChange={posServicePagination.setPageSize}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* Bar Ringkas Keranjang Mobile */}
          {cart.length > 0 && (
            <div className="lg:hidden p-2.5 bg-white border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setMobileTab('cart')}
                className="w-full h-11 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-between cursor-pointer transition-[background-color,transform] duration-150"
              >
                <span className="tabular-nums">Buka Keranjang ({totalCartQty} item)</span>
                <span className="font-mono tabular-nums">{formatRupiah(netPayable)}</span>
              </button>
            </div>
          )}
        </main>

        {/* Panel Kanan: Keranjang Kasir */}
        <PosCartPanel
          visibleOnMobile={mobileTab === 'cart'}
          onBackToCatalogMobile={() => setMobileTab('catalog')}
          cart={cart}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
          vehiclePlate={vehiclePlate}
          onVehiclePlateChange={setVehiclePlate}
          vehicleModel={vehicleModel}
          onVehicleModelChange={setVehicleModel}
          manualDiscount={manualDiscount}
          onManualDiscountChange={setManualDiscount}
          totals={totals}
          netPayable={netPayable}
          onParkCart={handleParkCurrentCart}
          onClearCart={handleClearCart}
          onEditItem={setEditLineIndex}
          onUpdateQty={handleUpdateCartQty}
          onRemoveItem={handleRemoveFromCart}
          onPrintPreview={() => handleOpenReceiptPreview()}
          onOpenCheckout={handleOpenCheckout}
        />
      </div>

      <CartLineEditModal
        isOpen={editLineIndex !== null || pendingZeroPriceItem !== null}
        item={pendingZeroPriceItem ?? (editLineIndex !== null ? cart[editLineIndex] : null)}
        itemIndex={pendingZeroPriceItem ? -1 : editLineIndex}
        userRole={currentUser?.role || 'KASIR'}
        cashierName={cashierName}
        isInitialPricing={pendingZeroPriceItem !== null}
        onClose={() => {
          setEditLineIndex(null);
          setPendingZeroPriceItem(null);
        }}
        onSave={handleSaveLineItem}
        onRemoveItem={(idx) => {
          if (idx === -1) {
            setPendingZeroPriceItem(null);
          } else {
            handleRemoveFromCart(idx);
          }
        }}
      />

      <ParkedOrdersDrawer
        isOpen={showParkedDrawer}
        parkedOrders={parkedOrders}
        onClose={() => setShowParkedDrawer(false)}
        onResumeOrder={handleResumeParkedOrder}
        onDeleteOrder={(id) => onDeleteParkedOrder?.(id)}
        onPrintOrder={handlePrintParkedOrder}
      />

      <CheckoutModal
        isOpen={showCheckoutModal}
        onClose={() => setShowCheckoutModal(false)}
        cart={cart}
        customerName={customerName}
        vehiclePlate={vehiclePlate}
        vehicleModel={vehicleModel}
        totals={totals}
        netPayable={netPayable}
        onPrintPhysicalNota={() => handleOpenReceiptPreview()}
        onParkCart={handleParkCurrentCart}
        onConfirmCheckout={handleConfirmCheckoutFromModal}
      />

      <PosSuccessModal
        isOpen={Boolean(completedSaleTx)}
        transaction={completedSaleTx}
        onClose={() => setCompletedSaleTx(null)}
        onPrintReceipt={(tx) => handleOpenReceiptPreview(tx)}
        onNavigateToReceipts={onNavigateToReceipts}
        storeSettings={storeSettings}
      />

      <ReceiptPreviewModal
        isOpen={showReceiptPreviewModal}
        transaction={previewReceiptTx}
        storeSettings={storeSettings}
        onClose={() => setShowReceiptPreviewModal(false)}
        onPrintPhysical={handleExecutePrintFromPreview}
      />

      {/* Blok cetak thermal 80mm tersembunyi */}
      {printTransaction && (
        <div
          id="pos-quick-nota-printable"
          className="w-full max-w-[300px] bg-white text-slate-900 font-mono text-[11px] p-4 hidden print:block"
          style={{ width: '80mm' }}
        >
          <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
            <div className="font-extrabold text-xs tracking-tight text-black whitespace-pre-line">
              OMAH BAN CABANG 3 (OB3)
              PUSAT BAN BARU, VELG &amp; SPOORING 3D
            </div>
            <div className="text-[9.5px] text-slate-600 leading-tight">
              Jl. Raya Magelang - Secang Km. 5, Magelang, Jawa Tengah
            </div>
            <div className="text-[9.5px] text-slate-600">
              Telp: (0293) 314-889 / WA: 0812-9988-7722
            </div>
            <div className="font-black text-xs pt-1.5 text-black tracking-wide border-t border-slate-300">
              NOTA PENJUALAN
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-600">No. Nota:</span>
              <span className="font-bold text-black">{printTransaction.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Waktu:</span>
              <span className="text-black">{printTransaction.timestamp || printTransaction.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kasir:</span>
              <span className="text-black">{printTransaction.cashier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pelanggan:</span>
              <span className="font-semibold text-black">{printTransaction.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kendaraan:</span>
              <span className="font-bold text-black">{printTransaction.vehicle_plate}</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400">
            <div className="flex justify-between font-bold text-[10px] text-slate-700 pb-1 mb-1 border-b border-slate-300">
              <span>ITEM PRODUK / JASA</span>
              <span>SUBTOTAL</span>
            </div>
            <div className="space-y-2">
              {printTransaction.items.map((item, idx) => {
                const unitPrice =
                  item.custom_price ??
                  (item.item_type === 'SERVICE' && item.service ? item.service.standard_price : item.product.product_price);
                const lineTotal = (unitPrice - (item.discount_per_item || 0)) * item.qty;
                const name =
                  item.custom_name_override ||
                  (item.item_type === 'SERVICE' && item.service ? item.service.service_name : item.product.name);

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-black text-[11px] leading-snug">{name}</div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {item.qty} pcs x {formatRupiah(unitPrice)}
                        {item.discount_per_item > 0 && ` (Disc -${formatRupiah(item.discount_per_item)})`}
                      </span>
                      <span className="font-bold text-black">{formatRupiah(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10.5px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatRupiah(printTransaction.subtotal)}</span>
            </div>
            {printTransaction.total_discount > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Diskon:</span>
                <span>-{formatRupiah(printTransaction.total_discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300 text-black">
              <span>TOTAL TAGIHAN:</span>
              <span>{formatRupiah(printTransaction.grand_total)}</span>
            </div>
          </div>

          <div className="pt-3 pb-2 text-center space-y-2 text-[9px] text-slate-600 leading-tight">
            <div className="p-1.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-semibold">
              KEBIJAKAN GARANSI OMAH BAN
              <div className="font-normal text-[8.5px] mt-0.5 whitespace-pre-line">
                Garansi resmi pabrik 1 tahun untuk cacat produksi.
                Gratis Nitrogen &amp; Balancing 2x dalam 6 bulan.
              </div>
            </div>
            <p className="font-bold text-black text-[10px] pt-1">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Keluar Kasir */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/55 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLogoutConfirm(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="bg-white rounded-2xl p-5 max-w-md w-full shadow-xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="logout-confirm-title" className="text-base font-bold text-slate-900">
                  Keluar dari Sesi Kasir?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sesi atas nama <strong className="text-slate-900">{cashierName}</strong> ({currentUser?.role || 'KASIR'}) akan diakhiri dan dialihkan ke halaman masuk.
                </p>
              </div>
            </div>

            {cart.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Masih ada <strong>{totalCartQty} item</strong> di keranjang. Anda dapat menahan nota terlebih dahulu sebelum keluar.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-10 px-4 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout?.();
                }}
                className="h-10 px-4 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Ya, Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
