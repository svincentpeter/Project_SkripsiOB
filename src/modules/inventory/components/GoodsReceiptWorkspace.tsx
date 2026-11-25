import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowLeft,
  Check,
  Clock,
  DollarSign,
  FileText,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Truck,
  UserCheck,
  X,
} from 'lucide-react';
import {
  GoodsReceiptBatchInput,
  PaymentTerms,
  ProductCategory,
  ProductItem,
  SupplierItem,
} from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { formatProductSpecLine, matchesProductQuery, productTokens } from '../../../shared/utils/productMatcher';
import {
  calculateMarkupPercent,
  getPriceFromMarkupPercent,
  getProductReferenceHpp,
} from '../../../shared/utils/pricingStandard';
import { MarkupPercentStepper, TablePagination, useDialog, usePagination, useToast } from '../../../shared/components';
import { localDate } from '../../../services/accountingPeriod';
import { brandPricingApi } from '../../../services/api';
import {
  PpnMode,
  costDelta,
  costFromInvoice,
  formatInvoicePrice,
  invoiceCartSummary,
  invoicePriceFromCost,
  invoiceSummary,
  lastBatchCost,
  parseInvoicePrice,
} from '../../../services/purchaseInvoiceService';

const DRAFT_STORAGE_KEY = 'ob3_goods_receipt_draft_v1';

const PPN_MODE_OPTIONS: { mode: PpnMode; label: string; hint: string }[] = [
  { mode: 'exclude', label: 'Belum PPN (×1,11)', hint: 'Harga di faktur belum termasuk PPN 11%' },
  { mode: 'include', label: 'Sudah PPN', hint: 'Harga di faktur sudah termasuk PPN 11%' },
];

const YEAR_BADGE_CLASSES = [
  'bg-slate-100 text-slate-700',
  'bg-blue-50 text-blue-700',
  'bg-emerald-50 text-emerald-700',
  'bg-amber-50 text-amber-800',
  'bg-indigo-50 text-indigo-700',
  'bg-teal-50 text-teal-700',
];

function yearBadgeClass(year?: number | string): string {
  const y = Number(year);
  if (!Number.isFinite(y) || y <= 0) return 'bg-slate-100 text-slate-600';
  return YEAR_BADGE_CLASSES[y % YEAR_BADGE_CLASSES.length];
}

interface ReceiptCartItem {
  productId: string;
  quantity: number;
  invoicePriceText: string;
  updateSellingPrice: boolean;
  newSellingPrice: number;
}

interface SavedDraft {
  ppnMode: PpnMode;
  supplierMode: 'LIST' | 'MANUAL';
  supplierId: string;
  manualSupplierName: string;
  supplierInvoice: string;
  receiptDate: string;
  paymentTerms: PaymentTerms;
  dueDate: string;
  notes: string;
  operator: string;
  items: ReceiptCartItem[];
}

interface GoodsReceiptWorkspaceProps {
  products: ProductItem[];
  suppliers?: SupplierItem[];
  categories?: ProductCategory[];
  initialProductToAdd?: ProductItem | null;
  onConsumeInitialProduct?: () => void;
  onBackToList?: () => void;
  onSubmitBatchReceipt: (input: GoodsReceiptBatchInput) => Promise<boolean>;
}

function addDaysToDate(baseDate: string, days: number): string {
  const parsed = baseDate ? new Date(`${baseDate}T00:00:00`) : new Date();
  if (Number.isNaN(parsed.getTime())) return localDate();
  parsed.setDate(parsed.getDate() + Math.max(0, days));
  return localDate(parsed);
}

function buildInitialLine(product: ProductItem, mode: PpnMode, minMarkupPct: number): ReceiptCartItem {
  const prevCost = lastBatchCost(product);
  const invPrice = prevCost > 0 ? invoicePriceFromCost(prevCost, mode) : 0;
  const refHpp = getProductReferenceHpp(product, prevCost > 0 ? prevCost : undefined);
  const catPrice = Number(product.product_price ?? product.price ?? 0);
  const minSell = refHpp > 0 ? getPriceFromMarkupPercent(refHpp, minMarkupPct) : 0;
  const recommended = catPrice <= 0 || (refHpp > 0 && catPrice + 0.01 < minSell) ? minSell : catPrice;

  return {
    productId: String(product.id),
    quantity: 1,
    invoicePriceText: invPrice > 0 ? formatInvoicePrice(invPrice) : '',
    updateSellingPrice: false,
    newSellingPrice: recommended,
  };
}

export const GoodsReceiptWorkspace: React.FC<GoodsReceiptWorkspaceProps> = ({
  products,
  suppliers = [],
  categories = [],
  initialProductToAdd,
  onConsumeInitialProduct,
  onBackToList,
  onSubmitBatchReceipt,
}) => {
  const toast = useToast();
  const dialog = useDialog();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter katalog kiri
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');

  // State form kanan (memulihkan draft otomatis bila ada)
  const [ppnMode, setPpnMode] = useState<PpnMode>('exclude');
  const [supplierMode, setSupplierMode] = useState<'LIST' | 'MANUAL'>(suppliers.length > 0 ? 'LIST' : 'MANUAL');
  const [supplierId, setSupplierId] = useState<string>('');
  const [manualSupplierName, setManualSupplierName] = useState<string>('');
  const [supplierInvoice, setSupplierInvoice] = useState<string>('');
  const [receiptDate, setReceiptDate] = useState<string>(() => localDate());
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('TEMPO_HUTANG');
  const [dueDate, setDueDate] = useState<string>(() => addDaysToDate(localDate(), 30));
  const [operator, setOperator] = useState<string>('Petugas Gudang OB3');
  const [notes, setNotes] = useState<string>('');
  const [cartItems, setCartItems] = useState<ReceiptCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // Standar margin minimum per merek (fallback 15% global)
  const [brandMinMap, setBrandMinMap] = useState<Record<string, number>>({});

  useEffect(() => {
    brandPricingApi
      .list()
      .then((rows) => {
        const next: Record<string, number> = {};
        for (const r of rows) {
          next[r.name.trim().toLowerCase()] = Math.max(15, Number(r.min_markup_percent) || 15);
        }
        setBrandMinMap(next);
      })
      .catch(() => {});
  }, []);

  const minMarkupForBrand = (brand?: string): number => {
    const key = (brand ?? '').trim().toLowerCase();
    return brandMinMap[key] ?? 15;
  };

  // Muat draft tersimpan satu kali saat komponen dipasang
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedDraft>;
        if (parsed.ppnMode === 'exclude' || parsed.ppnMode === 'include') setPpnMode(parsed.ppnMode);
        if (parsed.supplierMode === 'LIST' || parsed.supplierMode === 'MANUAL') setSupplierMode(parsed.supplierMode);
        if (typeof parsed.supplierId === 'string') setSupplierId(parsed.supplierId);
        if (typeof parsed.manualSupplierName === 'string') setManualSupplierName(parsed.manualSupplierName);
        if (typeof parsed.supplierInvoice === 'string') setSupplierInvoice(parsed.supplierInvoice);
        if (typeof parsed.receiptDate === 'string' && parsed.receiptDate) setReceiptDate(parsed.receiptDate);
        if (parsed.paymentTerms === 'TEMPO_HUTANG' || parsed.paymentTerms === 'TUNAI_KAS' || parsed.paymentTerms === 'TUNAI_BANK') {
          setPaymentTerms(parsed.paymentTerms);
        }
        if (typeof parsed.dueDate === 'string' && parsed.dueDate) setDueDate(parsed.dueDate);
        if (typeof parsed.operator === 'string' && parsed.operator) setOperator(parsed.operator);
        if (typeof parsed.notes === 'string') setNotes(parsed.notes);
        if (Array.isArray(parsed.items)) {
          setCartItems(parsed.items.filter((i) => i && typeof i.productId === 'string' && Number(i.quantity) > 0));
        }
      }
    } catch {
      // Abaikan draft rusak
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  // Simpan draft otomatis saat ada perubahan
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (cartItems.length === 0 && !supplierInvoice.trim() && !notes.trim()) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      const payload: SavedDraft = {
        ppnMode,
        supplierMode,
        supplierId,
        manualSupplierName,
        supplierInvoice,
        receiptDate,
        paymentTerms,
        dueDate,
        notes,
        operator,
        items: cartItems,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Abaikan kuota storage penuh
    }
  }, [
    draftLoaded,
    ppnMode,
    supplierMode,
    supplierId,
    manualSupplierName,
    supplierInvoice,
    receiptDate,
    paymentTerms,
    dueDate,
    notes,
    operator,
    cartItems,
  ]);

  // Sinkronkan supplierMode bila daftar supplier dimuat secara asinkron
  useEffect(() => {
    if (suppliers.length === 0 && supplierMode === 'LIST') {
      setSupplierMode('MANUAL');
    } else if (suppliers.length > 0 && supplierMode === 'MANUAL' && !manualSupplierName.trim()) {
      setSupplierMode('LIST');
    }
  }, [suppliers.length, supplierMode, manualSupplierName]);

  const activeProducts = useMemo(() => products.filter((p) => p.is_active !== false), [products]);
  const activeSuppliers = useMemo(() => suppliers.filter((s) => s.is_active !== false), [suppliers]);

  const productById = useMemo(() => {
    const map = new Map<string, ProductItem>();
    for (const p of products) map.set(String(p.id), p);
    return map;
  }, [products]);

  const tokenCache = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const p of activeProducts) map.set(String(p.id), productTokens(p));
    return map;
  }, [activeProducts]);

  const uniqueBrands = useMemo(() => {
    const set = new Set<string>();
    for (const p of activeProducts) {
      if (p.brand) set.add(p.brand);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeProducts]);

  const uniqueCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => ({ code: c.category_code, label: c.category_name }));
    }
    const set = new Set<string>();
    for (const p of activeProducts) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set)
      .sort()
      .map((code) => ({ code, label: code }));
  }, [categories, activeProducts]);

  // Tambahkan produk awal jika dibuka lewat tombol Restock di baris Katalog / Kartu Stok
  useEffect(() => {
    if (!draftLoaded || !initialProductToAdd) return;
    const prodId = String(initialProductToAdd.id);
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === prodId);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, buildInitialLine(initialProductToAdd, ppnMode, minMarkupForBrand(initialProductToAdd.brand))];
    });

    // Jika supplier belum dipilih, cocokkan otomatis berdasarkan merek produk
    if (!supplierId && activeSuppliers.length > 0 && initialProductToAdd.brand) {
      const matched = activeSuppliers.find((s) =>
        s.supplier_name.toLowerCase().includes(initialProductToAdd.brand.toLowerCase())
      );
      if (matched) {
        setSupplierMode('LIST');
        setSupplierId(String(matched.id));
        if (matched.payment_terms_days > 0) {
          setDueDate(addDaysToDate(receiptDate, matched.payment_terms_days));
        }
      }
    }

    onConsumeInitialProduct?.();
  }, [draftLoaded, initialProductToAdd]);

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) return false;
      if (selectedCategory !== 'ALL' && (p.category || '').toUpperCase() !== selectedCategory.toUpperCase()) {
        return false;
      }
      const stock = p.stock ?? p.product_quantity ?? 0;
      const alert = p.product_stock_alert ?? p.min_stock ?? 5;
      if (stockFilter === 'OUT' && stock > 0) return false;
      if (stockFilter === 'LOW' && (stock <= 0 || stock >= alert)) return false;

      return matchesProductQuery(p, searchQuery, tokenCache.get(String(p.id)));
    });
  }, [activeProducts, selectedBrand, selectedCategory, stockFilter, searchQuery, tokenCache]);

  const catalogPagination = usePagination(filteredProducts, 12, [
    selectedBrand,
    selectedCategory,
    stockFilter,
    searchQuery,
  ]);

  const cartQtyByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
    }
    return map;
  }, [cartItems]);

  // Hitungan per baris + ringkasan faktur keseluruhan (DPP, PPN 11%, Total Faktur)
  const enrichedCart = useMemo(() => {
    return cartItems.map((line) => {
      const product = productById.get(line.productId);
      const invoicePrice = parseInvoicePrice(line.invoicePriceText);
      const unitCost = costFromInvoice(invoicePrice, ppnMode);
      const lineInvSummary = invoiceSummary(line.quantity, invoicePrice, ppnMode);
      const prevCost = product ? lastBatchCost(product) : 0;
      const delta = costDelta(unitCost, prevCost);

      const minPct = minMarkupForBrand(product?.brand);
      const currentCatalogPrice = Number(product?.product_price ?? product?.price ?? 0);
      const refHpp = getProductReferenceHpp(product, unitCost > 0 ? unitCost : undefined);
      const minSellingPrice = refHpp > 0 ? getPriceFromMarkupPercent(refHpp, minPct) : 0;
      const isMarginUnsafe = refHpp > 0 && (currentCatalogPrice <= 0 || currentCatalogPrice + 0.01 < minSellingPrice);
      const effectivePrice = line.updateSellingPrice ? line.newSellingPrice : currentCatalogPrice;
      const previewMarkupPct = calculateMarkupPercent(effectivePrice, refHpp);

      return {
        line,
        product,
        invoicePrice,
        unitCost,
        lineTotal: lineInvSummary.total,
        prevCost,
        delta,
        minPct,
        currentCatalogPrice,
        refHpp,
        minSellingPrice,
        isMarginUnsafe,
        previewMarkupPct,
      };
    });
  }, [cartItems, productById, ppnMode, brandMinMap]);

  const summary = useMemo(
    () =>
      invoiceCartSummary(
        enrichedCart.map((e) => ({ quantity: e.line.quantity, invoicePrice: e.invoicePrice })),
        ppnMode
      ),
    [enrichedCart, ppnMode]
  );

  const totalItemsCount = cartItems.length;
  const totalQty = useMemo(() => cartItems.reduce((sum, i) => sum + i.quantity, 0), [cartItems]);
  const unsafeMarginCount = useMemo(
    () => enrichedCart.filter((e) => e.isMarginUnsafe && !e.line.updateSellingPrice).length,
    [enrichedCart]
  );

  const selectedSupplier = useMemo(
    () => activeSuppliers.find((s) => String(s.id) === supplierId) ?? null,
    [activeSuppliers, supplierId]
  );

  const resolvedSupplierName =
    supplierMode === 'LIST' ? selectedSupplier?.supplier_name ?? '' : manualSupplierName.trim();

  // Handler aksi keranjang
  const handleAddProduct = (product: ProductItem) => {
    setFormError(null);
    const prodId = String(product.id);
    setCartItems((prev) => {
      const idx = prev.findIndex((i) => i.productId === prodId);
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...prev, buildInitialLine(product, ppnMode, minMarkupForBrand(product.brand))];
    });

    // Pilih supplier cocok otomatis jika belum ada supplier terpilih
    if (supplierMode === 'LIST' && !supplierId && activeSuppliers.length > 0 && product.brand) {
      const matched = activeSuppliers.find((s) =>
        s.supplier_name.toLowerCase().includes(product.brand.toLowerCase())
      );
      if (matched) {
        setSupplierId(String(matched.id));
        if (matched.payment_terms_days > 0) {
          setDueDate(addDaysToDate(receiptDate, matched.payment_terms_days));
        }
      }
    }
  };

  const handleSetQty = (productId: string, nextQty: number) => {
    const qty = Math.round(Number(nextQty) || 0);
    if (qty <= 0) {
      setCartItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCartItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)));
  };

  const handleSetInvoicePriceText = (productId: string, text: string) => {
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const parsed = parseInvoicePrice(text);
        const newCost = costFromInvoice(parsed, ppnMode);
        const prod = productById.get(productId);
        const minPct = minMarkupForBrand(prod?.brand);
        const refHpp = getProductReferenceHpp(prod, newCost > 0 ? newCost : undefined);
        const minSell = refHpp > 0 ? getPriceFromMarkupPercent(refHpp, minPct) : 0;
        const nextSell = i.updateSellingPrice
          ? Math.max(i.newSellingPrice, minSell)
          : minSell > 0
          ? minSell
          : i.newSellingPrice;
        return { ...i, invoicePriceText: text, newSellingPrice: nextSell };
      })
    );
  };

  const handleFormatInvoicePriceBlur = (productId: string) => {
    setCartItems((prev) =>
      prev.map((i) => {
        if (i.productId !== productId) return i;
        const parsed = parseInvoicePrice(i.invoicePriceText);
        return { ...i, invoicePriceText: parsed > 0 ? formatInvoicePrice(parsed) : '' };
      })
    );
  };

  const handleToggleUpdateSellPrice = (productId: string, checked: boolean, minSell: number, currentPrice: number) => {
    setCartItems((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? {
              ...i,
              updateSellingPrice: checked,
              newSellingPrice: checked ? Math.max(currentPrice, minSell) : i.newSellingPrice,
            }
          : i
      )
    );
  };

  const handleChangeSellPrice = (productId: string, price: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, newSellingPrice: price } : i))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleClearCart = async () => {
    if (cartItems.length === 0) return;
    const confirmed = await dialog.confirm({
      title: 'Kosongkan Keranjang Penerimaan?',
      message: `Hapus semua ${cartItems.length} item (${totalQty} pcs) dari keranjang penerimaan ini?`,
      confirmLabel: 'Ya, Kosongkan',
      cancelLabel: 'Batal',
      tone: 'danger',
    });
    if (!confirmed) return;
    setCartItems([]);
    setFormError(null);
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    toast.info('Keranjang Dikosongkan', 'Keranjang penerimaan barang telah dibersihkan.');
  };

  const handleSupplierChange = (value: string) => {
    if (value === '__MANUAL__') {
      setSupplierMode('MANUAL');
      setSupplierId('');
      return;
    }
    setSupplierMode('LIST');
    setSupplierId(value);
    const sup = activeSuppliers.find((s) => String(s.id) === value);
    if (sup && sup.payment_terms_days > 0) {
      setDueDate(addDaysToDate(receiptDate, sup.payment_terms_days));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (enrichedCart.length === 0) {
      setFormError('Pilih minimal 1 produk dari katalog di sebelah kiri untuk diterima.');
      return;
    }

    if (!resolvedSupplierName) {
      setFormError('Pilih distributor / supplier atau ketik nama distributor secara manual.');
      return;
    }

    for (const row of enrichedCart) {
      if (row.line.quantity <= 0) {
        setFormError(`Jumlah unit untuk ${row.product?.product_name ?? 'produk'} harus lebih dari 0.`);
        return;
      }
      if (row.invoicePrice < 0) {
        setFormError(`Harga faktur untuk ${row.product?.product_name ?? 'produk'} tidak boleh negatif.`);
        return;
      }
      if (row.line.updateSellingPrice && row.refHpp > 0 && row.line.newSellingPrice + 0.01 < row.minSellingPrice) {
        setFormError(
          `Harga jual katalog baru untuk ${row.product?.product_name ?? 'produk'} (${formatRupiah(
            row.line.newSellingPrice
          )}) minimal harus +${row.minPct}% dari HPP patokan (${formatRupiah(row.minSellingPrice)}).`
        );
        return;
      }
    }

    const payload: GoodsReceiptBatchInput = {
      items: enrichedCart.map((row) => ({
        product_id: row.line.productId,
        incoming_qty: row.line.quantity,
        unit_cost: row.unitCost,
        line_total: row.lineTotal > 0 ? row.lineTotal : undefined,
        selling_price:
          row.line.updateSellingPrice && row.line.newSellingPrice > 0 ? row.line.newSellingPrice : undefined,
        price_change_reason:
          row.line.updateSellingPrice && row.line.newSellingPrice > 0
            ? `Penyesuaian harga jual batch baru (${resolvedSupplierName})`
            : undefined,
      })),
      invoice_total: summary.total > 0 ? summary.total : undefined,
      dpp_amount: summary.total > 0 ? summary.dpp : 0,
      ppn_amount: summary.total > 0 ? summary.ppn : 0,
      supplier_id: supplierMode === 'LIST' && supplierId ? supplierId : undefined,
      supplier_name: resolvedSupplierName,
      supplier_invoice: supplierInvoice.trim() || undefined,
      receipt_date: receiptDate,
      payment_terms: paymentTerms,
      due_date: paymentTerms === 'TEMPO_HUTANG' ? dueDate : undefined,
      notes: notes.trim() || undefined,
      operator: operator.trim() || 'Petugas Gudang OB3',
    };

    setSubmitting(true);
    try {
      const ok = await onSubmitBatchReceipt(payload);
      if (ok) {
        setCartItems([]);
        setSupplierInvoice('');
        setNotes('');
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const paymentStatusBadge =
    paymentTerms === 'TEMPO_HUTANG'
      ? { label: 'Tempo / Hutang', cls: 'bg-amber-50 text-amber-800 border-amber-200' }
      : paymentTerms === 'TUNAI_KAS'
      ? { label: 'Lunas · Kas Laci', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      : { label: 'Lunas · Bank BCA', cls: 'bg-blue-50 text-blue-700 border-blue-200' };

  return (
    <div className="w-full space-y-4">
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl px-4 sm:px-5 py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Penerimaan Barang Masuk (Multi-Item)
            </h2>
            <p className="text-xs text-slate-500">
              Klik produk di katalog untuk menyusun satu nota penerimaan supplier (GR), batch FIFO, &amp; jurnal pembelian sekaligus.
            </p>
          </div>
        </div>
        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Riwayat Mutasi &amp; Opname</span>
          </button>
        )}
      </div>

      {/* 4 Summary KPI Cards (gaya Cabang 2 ProjectOmahBan) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Jenis Item</span>
          <span className="text-2xl font-black text-slate-900 tabular-nums">{totalItemsCount}</span>
          <span className="text-[11px] text-slate-400 ml-1.5">SKU</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Qty Masuk</span>
          <span className="text-2xl font-black text-slate-900 tabular-nums">{totalQty}</span>
          <span className="text-[11px] text-slate-400 ml-1.5">pcs</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Faktur (Termasuk PPN)</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 tabular-nums block truncate">
            {formatRupiah(summary.total)}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-2xs flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-500 block">Status Pembayaran</span>
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${paymentStatusBadge.cls}`}
            >
              {paymentStatusBadge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7/12): Searchable Product Card Grid */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
          {/* Search & Filter Toolbar */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama / ukuran / ring / merk... (mis. 185/65/14, eco 185)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                />
              </div>

              <select
                aria-label="Filter merek katalog penerimaan"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="sm:w-44 py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="ALL">Semua Merk ({uniqueBrands.length})</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter kategori katalog penerimaan"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="sm:w-40 py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              >
                <option value="ALL">Semua Kategori</option>
                {uniqueCategories.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `Semua (${activeProducts.length})` },
                    { id: 'LOW', label: 'Stok Menipis' },
                    { id: 'OUT', label: 'Stok Habis' },
                  ] as const
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setStockFilter(pill.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                      stockFilter === pill.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500 tabular-nums">
                Menampilkan <strong className="text-slate-700">{filteredProducts.length}</strong> produk aktif · Klik kartu untuk tambah ke keranjang
              </span>
            </div>
          </div>

          {/* 3-Column Product Card Grid */}
          <div className="p-3.5 max-h-[68vh] overflow-y-auto custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <Package className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Tidak ada produk yang cocok.</p>
                <p className="text-xs text-slate-400">
                  Coba ketik ukuran seperti <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">185/65/14</code> atau reset filter merek.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {catalogPagination.pageItems.map((p) => {
                  const prodId = String(p.id);
                  const inCartQty = cartQtyByProduct.get(prodId) ?? 0;
                  const stock = p.stock ?? p.product_quantity ?? 0;
                  const modal = lastBatchCost(p);
                  const specLine = formatProductSpecLine(p);

                  return (
                    <button
                      key={prodId}
                      type="button"
                      data-receipt-product-card={prodId}
                      onClick={() => handleAddProduct(p)}
                      className={`text-left p-3 rounded-xl border transition-colors group cursor-pointer flex flex-col justify-between min-h-[138px] ${
                        inCartQty > 0
                          ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                          : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`text-sm font-bold leading-snug line-clamp-2 ${
                              inCartQty > 0 ? 'text-blue-800' : 'text-slate-900 group-hover:text-blue-700'
                            }`}
                          >
                            {p.product_name || p.name}
                          </div>
                          {inCartQty > 0 && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-extrabold tabular-nums">
                              <Check className="w-2.5 h-2.5" />
                              {inCartQty}
                            </span>
                          )}
                        </div>

                        {specLine && (
                          <div className="mt-1 text-xs text-slate-500 font-medium">{specLine}</div>
                        )}

                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          {p.brand && (
                            <span className="text-[11px] font-semibold text-slate-500">{p.brand}</span>
                          )}
                          {p.product_year && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold tabular-nums ${yearBadgeClass(
                                p.product_year
                              )}`}
                            >
                              {p.product_year}
                            </span>
                          )}
                          {p.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                              {p.category}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block leading-none">Modal terakhir</span>
                          <span className="text-sm font-extrabold text-slate-800 tabular-nums">
                            {formatRupiah(modal)}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
                            stock > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                              : 'bg-rose-50 text-rose-600 border border-rose-200/80'
                          }`}
                        >
                          Stok {stock}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-3.5 pb-3 bg-white">
            <TablePagination
              page={catalogPagination.page}
              pageSize={catalogPagination.pageSize}
              totalItems={filteredProducts.length}
              unfilteredTotal={activeProducts.length}
              itemLabel="produk"
              pageSizeOptions={[12, 24, 48]}
              onPageChange={catalogPagination.setPage}
              onPageSizeChange={catalogPagination.setPageSize}
              compact
            />
          </div>
        </div>

        {/* RIGHT COLUMN (5/12): Supplier + Keranjang + Pembayaran */}
        <form onSubmit={handleSubmit} className="xl:col-span-5 space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* CARD 1: Supplier, Faktur & Mode PPN */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Supplier &amp; Faktur</span>
              </h3>
              <span className="text-[11px] text-slate-400">Toko Non-PKP · PPN masuk HPP</span>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Distributor / Supplier <span className="text-rose-500">*</span>
                </label>
                {activeSuppliers.length > 0 ? (
                  <select
                    aria-label="Pilih supplier penerimaan"
                    value={supplierMode === 'MANUAL' ? '__MANUAL__' : supplierId}
                    onChange={(e) => handleSupplierChange(e.target.value)}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  >
                    <option value="">— Pilih Supplier —</option>
                    {activeSuppliers.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.supplier_name} {s.payment_terms_days > 0 ? `(TOP ${s.payment_terms_days} hr)` : '(Tunai)'}
                      </option>
                    ))}
                    <option value="__MANUAL__">+ Ketik Manual Distributor Lain…</option>
                  </select>
                ) : null}
                {(supplierMode === 'MANUAL' || activeSuppliers.length === 0) && (
                  <input
                    type="text"
                    value={manualSupplierName}
                    onChange={(e) => setManualSupplierName(e.target.value)}
                    placeholder="Contoh: PT Bridgestone Tire Indonesia"
                    className="mt-1.5 w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>No. Faktur / Surat Jalan</span>
                  </label>
                  <input
                    type="text"
                    value={supplierInvoice}
                    onChange={(e) => setSupplierInvoice(e.target.value)}
                    placeholder="INV-SJ/2026/11/001"
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                  />
                </div>

                <div>
                  <span className="block text-[11px] font-bold text-slate-600 mb-1">Harga Faktur Supplier</span>
                  <div
                    role="radiogroup"
                    aria-label="Mode PPN Faktur Supplier"
                    className="grid grid-cols-2 p-0.5 gap-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold"
                  >
                    {PPN_MODE_OPTIONS.map((opt) => (
                      <button
                        key={opt.mode}
                        type="button"
                        role="radio"
                        aria-checked={ppnMode === opt.mode}
                        title={opt.hint}
                        onClick={() => setPpnMode(opt.mode)}
                        className={`py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                          ppnMode === opt.mode
                            ? 'bg-white text-emerald-700 shadow-2xs ring-1 ring-slate-200'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Keranjang Penerimaan (Multi-Item) */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Keranjang Penerimaan
                </h3>
                {totalItemsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold tabular-nums">
                    {totalItemsCount} item · {totalQty} pcs
                  </span>
                )}
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {enrichedCart.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-1.5">
                <Package className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Keranjang penerimaan masih kosong.</p>
                <p className="text-[11px] text-slate-400">
                  Klik kartu produk di sebelah kiri untuk memasukkan ban / velg ke nota ini.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[42vh] overflow-y-auto custom-scrollbar">
                {enrichedCart.map((row) => {
                  const prodName = row.product?.product_name || row.product?.name || `Produk #${row.line.productId}`;
                  const specLine = row.product ? formatProductSpecLine(row.product) : '';

                  return (
                    <div key={row.line.productId} className="p-3.5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-slate-900 leading-snug">{prodName}</div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2 mt-0.5">
                            {row.product?.brand && <span className="font-semibold">{row.product.brand}</span>}
                            {specLine && <span>{specLine}</span>}
                            {row.product?.product_code && (
                              <span className="font-mono text-slate-400">{row.product.product_code}</span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(row.line.productId)}
                          aria-label={`Hapus ${prodName} dari keranjang`}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Hapus baris"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Qty + Harga Faktur + Subtotal */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Qty</label>
                          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => handleSetQty(row.line.productId, row.line.quantity - 1)}
                              className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              aria-label="Kurangi qty"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              data-cart-qty={row.line.productId}
                              value={row.line.quantity}
                              onChange={(e) => handleSetQty(row.line.productId, Number(e.target.value))}
                              className="w-full text-center text-xs font-bold text-slate-900 py-1.5 focus:outline-hidden tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => handleSetQty(row.line.productId, row.line.quantity + 1)}
                              className="px-2 py-1.5 text-slate-600 hover:bg-slate-100 cursor-pointer"
                              aria-label="Tambah qty"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <div className="col-span-5">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                            Harga Faktur ({ppnMode === 'exclude' ? 'sblm PPN' : 'inc PPN'})
                          </label>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={row.line.invoicePriceText}
                            onChange={(e) => handleSetInvoicePriceText(row.line.productId, e.target.value)}
                            onBlur={() => handleFormatInvoicePriceBlur(row.line.productId)}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right tabular-nums focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
                          />
                        </div>

                        <div className="col-span-3 text-right">
                          <span className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Subtotal</span>
                          <span className="text-xs font-extrabold text-slate-900 tabular-nums block py-1.5">
                            {formatRupiah(row.lineTotal)}
                          </span>
                        </div>
                      </div>

                      {/* Info Modal HPP / unit + Delta vs modal terakhir */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
                        <span className="text-slate-600">
                          Modal HPP/unit:{' '}
                          <strong className="font-mono text-emerald-700 tabular-nums">
                            {formatRupiah(row.unitCost)}
                          </strong>
                        </span>
                        {row.delta && row.delta.diff !== 0 && (
                          <span
                            className={`font-semibold tabular-nums ${
                              row.delta.diff > 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {row.delta.diff > 0 ? '+' : '−'}
                            {formatRupiah(Math.abs(row.delta.diff))} ({row.delta.diff > 0 ? '+' : '−'}
                            {Math.abs(row.delta.percent).toLocaleString('id-ID')}%)
                          </span>
                        )}
                      </div>

                      {/* Penjaga Standar Margin Merek per item */}
                      {row.refHpp > 0 && (
                        <div
                          className={`rounded-lg p-2.5 border text-[11px] space-y-2 ${
                            row.isMarginUnsafe && !row.line.updateSellingPrice
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-slate-50/70 border-slate-200/80'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                              <input
                                type="checkbox"
                                checked={row.line.updateSellingPrice}
                                onChange={(e) =>
                                  handleToggleUpdateSellPrice(
                                    row.line.productId,
                                    e.target.checked,
                                    row.minSellingPrice,
                                    row.currentCatalogPrice
                                  )
                                }
                                className="w-3.5 h-3.5 rounded-sm border-slate-300 text-emerald-600"
                              />
                              <span>Sesuaikan Harga Jual Katalog</span>
                            </label>
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${
                                row.isMarginUnsafe && !row.line.updateSellingPrice
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              Min +{row.minPct}% ({formatRupiah(row.minSellingPrice)})
                            </span>
                          </div>

                          {row.isMarginUnsafe && !row.line.updateSellingPrice && (
                            <p className="text-amber-900 leading-relaxed">
                              Harga katalog saat ini ({formatRupiah(row.currentCatalogPrice)}) di bawah standar minimal +{row.minPct}%. Centang di atas untuk langsung perbarui atau peringatan akan dikirim ke Owner.
                            </p>
                          )}

                          {row.line.updateSellingPrice && (
                            <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-slate-600">Harga Jual Baru:</span>
                                <input
                                  type="text"
                                  value={formatRupiah(row.line.newSellingPrice)}
                                  onChange={(e) =>
                                    handleChangeSellPrice(row.line.productId, parseRupiahInput(e.target.value))
                                  }
                                  className="w-36 px-2.5 py-1 border border-slate-300 rounded-lg text-right font-mono font-extrabold text-emerald-700 text-xs tabular-nums"
                                />
                              </div>
                              <MarkupPercentStepper
                                referenceHpp={row.refHpp}
                                sellingPrice={row.line.newSellingPrice}
                                onChangeSellingPrice={(val) => handleChangeSellPrice(row.line.productId, val)}
                                minPercent={row.minPct}
                                label={`Margin Katalog (Min. ${row.minPct}%):`}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Footer Ringkasan Faktur (DPP / PPN 11% / Total Faktur) */}
            {enrichedCart.length > 0 && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>DPP (Sebelum PPN)</span>
                  <span className="font-mono font-semibold tabular-nums">{formatRupiah(summary.dpp)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>PPN 11% (Masuk HPP Persediaan)</span>
                  <span className="font-mono font-semibold tabular-nums">{formatRupiah(summary.ppn)}</span>
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                  <span>Total Faktur Dibukukan</span>
                  <span className="font-mono text-emerald-700 tabular-nums">{formatRupiah(summary.total)}</span>
                </div>
                {unsafeMarginCount > 0 && (
                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-800 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{unsafeMarginCount} item memiliki harga jual katalog di bawah standar margin merek.</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARD 3: Pembayaran & Detail Pengadaan */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Pembayaran &amp; Detail Pengadaan</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Tanggal Penerimaan</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => {
                    const nextDate = e.target.value;
                    setReceiptDate(nextDate);
                    if (selectedSupplier && selectedSupplier.payment_terms_days > 0) {
                      setDueDate(addDaysToDate(nextDate, selectedSupplier.payment_terms_days));
                    }
                  }}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>Petugas Penerima</span>
                </label>
                <input
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  placeholder="Nama petugas gudang"
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            <div>
              <span className="block text-[11px] font-bold text-slate-600 mb-1.5">Syarat Pembayaran</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'TEMPO_HUTANG', label: 'Tempo / Hutang', active: 'bg-amber-100 border-amber-300 text-amber-900' },
                    { id: 'TUNAI_KAS', label: 'Tunai Kas Laci', active: 'bg-emerald-100 border-emerald-300 text-emerald-900' },
                    { id: 'TUNAI_BANK', label: 'Transfer BCA', active: 'bg-blue-100 border-blue-300 text-blue-900' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentTerms(opt.id)}
                    className={`py-2 px-2 rounded-xl border text-[11px] font-bold transition-colors cursor-pointer ${
                      paymentTerms === opt.id
                        ? opt.active
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {paymentTerms === 'TEMPO_HUTANG' && (
              <div className="flex items-center justify-between gap-3 bg-amber-50/70 border border-amber-200/80 rounded-xl px-3 py-2 text-xs">
                <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Jatuh Tempo Hutang
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-white border border-amber-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Catatan (Opsional)</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Kiriman distributor resmi, kondisi segel utuh"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 resize-none focus:outline-hidden focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || enrichedCart.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>
                {submitting
                  ? 'Membukukan Penerimaan...'
                  : enrichedCart.length > 0
                  ? `Simpan Penerimaan (${totalItemsCount} Item · ${totalQty} Pcs · ${formatRupiah(summary.total)})`
                  : 'Simpan Penerimaan Barang'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
