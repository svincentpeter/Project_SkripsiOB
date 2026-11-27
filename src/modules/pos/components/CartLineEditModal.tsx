import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Disc,
  Droplets,
  Edit3,
  Minus,
  Package,
  Plus,
  RotateCcw,
  ShieldCheck,
  Tag,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { CartItem, UserRole } from '../../../shared/types';
import { categoryKind, CategoryKind } from '../../../shared/utils/categoryKind';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { MarkupPercentStepper } from '../../../shared/components';
import {
  CASHIER_INITIAL_PRICE_REASONS,
  CASHIER_REIMBURSE_REASONS,
  calculateMarkupPercent,
  getMinSellingPrice,
  getProductReferenceHpp,
  getRecommendedPriceByMarkup,
} from '../../../shared/utils/pricingStandard';

interface CartLineEditModalProps {
  isOpen: boolean;
  item: CartItem | null;
  itemIndex: number | null;
  userRole?: UserRole;
  cashierName?: string;
  isInitialPricing?: boolean;
  onClose: () => void;
  onSave: (index: number, updatedItem: CartItem) => void;
  onRemoveItem: (index: number) => void;
}

const formatRingLabel = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  return /^R/i.test(trimmed) ? trimmed.toUpperCase() : `R${trimmed}`;
};

export function buildAutoProductName(
  kind: CategoryKind | 'JASA',
  specs: {
    brand?: string;
    motif?: string;
    sizeWidth?: string;
    sizeRatio?: string;
    ring?: string;
    dotYear?: string;
    pcd?: string;
    valveType?: string;
    fallbackName?: string;
  },
): string {
  const brand = (specs.brand || '').trim();
  const motif = (specs.motif || '').trim();
  const width = (specs.sizeWidth || '').trim();
  const ratio = (specs.sizeRatio || '').trim();
  const ring = formatRingLabel(specs.ring || '');
  const dotYear = (specs.dotYear || '').trim();
  const pcd = (specs.pcd || '').trim();
  const valveType = (specs.valveType || '').trim();

  if (kind === 'BAN_BARU') {
    const parts = ['Ban'];
    if (brand) parts.push(brand);
    if (motif && motif !== '-') parts.push(motif);
    if (width && ratio) parts.push(`${width}/${ratio}`);
    if (ring) parts.push(ring);
    if (dotYear) parts.push(`(DOT ${dotYear})`);
    return parts.join(' ');
  }
  if (kind === 'VELG') {
    const parts = ['Velg'];
    if (brand) parts.push(brand);
    if (motif && motif !== '-') parts.push(motif);
    if (ring) parts.push(ring);
    if (pcd) parts.push(`PCD ${pcd}`);
    return parts.join(' ');
  }
  if (kind === 'BAN_DALAM') {
    const parts = ['Ban Dalam'];
    if (brand) parts.push(brand);
    if (ratio) parts.push(ratio);
    if (valveType) parts.push(`(${valveType})`);
    return parts.join(' ');
  }
  if (kind === 'OLI_PELUMAS' || kind === 'AKSESORIS' || kind === 'LAINNYA') {
    const parts = [brand, motif && motif !== '-' ? motif : ''].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
  }
  if (kind === 'JASA') {
    return motif || specs.fallbackName || 'Layanan Jasa';
  }
  return specs.fallbackName || 'Produk';
}

export const CartLineEditModal: React.FC<CartLineEditModalProps> = ({
  isOpen,
  item,
  itemIndex,
  userRole = 'KASIR',
  cashierName = 'Kasir OB3',
  isInitialPricing = false,
  onClose,
  onSave,
  onRemoveItem,
}) => {
  const [pricingMode, setPricingMode] = useState<'unit' | 'total'>('unit');
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [packageTotalPrice, setPackageTotalPrice] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'NOMINAL' | 'PERCENT'>('NOMINAL');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const [customName, setCustomName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showReceiptSpecEditor, setShowReceiptSpecEditor] = useState<boolean>(false);

  const [specBrand, setSpecBrand] = useState<string>('');
  const [specSizeWidth, setSpecSizeWidth] = useState<string>('');
  const [specSizeRatio, setSpecSizeRatio] = useState<string>('');
  const [specRing, setSpecRing] = useState<string>('');
  const [specMotif, setSpecMotif] = useState<string>('');
  const [specDotYear, setSpecDotYear] = useState<string>('');
  const [specPcd, setSpecPcd] = useState<string>('');
  const [specValveType, setSpecValveType] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !item) return;

    const initialQty = Math.max(1, item.qty || 1);
    setQty(initialQty);

    const standardPrice =
      item.item_type === 'SERVICE' && item.service
        ? item.service.standard_price
        : item.product?.product_price || item.product?.price || 0;

    const refHpp = item.item_type === 'SERVICE' ? 0 : getProductReferenceHpp(item.product);
    const defaultMinPrice = refHpp > 0 ? getRecommendedPriceByMarkup(refHpp, 15) : 0;
    const initialUnitP =
      item.custom_price && item.custom_price > 0
        ? item.custom_price
        : standardPrice > 0
        ? standardPrice
        : defaultMinPrice;

    setUnitPrice(initialUnitP);
    setPackageTotalPrice(initialUnitP * initialQty);
    setDiscountType('NOMINAL');
    setDiscountValue(item.discount_per_item ?? 0);
    setPricingMode('unit');
    setValidationError(null);
    setOverrideReason(
      item.override_reason ||
        (standardPrice <= 0 ? CASHIER_INITIAL_PRICE_REASONS[0] : CASHIER_REIMBURSE_REASONS[0])
    );

    setCustomName(item.custom_name_override ?? '');
    setNote(item.note ?? '');
    setShowReceiptSpecEditor(Boolean(item.custom_name_override));

    if (item.item_type === 'PRODUCT' && item.product) {
      setSpecBrand(item.product.brand || '');
      setSpecSizeWidth(item.product.size_width ? String(item.product.size_width) : '');
      setSpecSizeRatio(item.product.size_ratio ? String(item.product.size_ratio) : '');
      setSpecRing(item.product.ring || '');
      setSpecMotif(item.product.motif && item.product.motif !== '-' ? item.product.motif : '');
      setSpecDotYear(item.product.product_year ? String(item.product.product_year) : '');
      setSpecPcd(item.product.pcd || '');
      setSpecValveType(item.product.valve_type || '');
    } else if (item.item_type === 'SERVICE' && item.service) {
      setSpecBrand('JASA');
      setSpecMotif(item.service.service_name);
      setSpecSizeWidth('');
      setSpecSizeRatio('');
      setSpecRing('');
      setSpecDotYear('');
      setSpecPcd('');
      setSpecValveType('');
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item || itemIndex === null) return null;

  const isService = item.item_type === 'SERVICE';
  const rawCategoryLabel = isService ? 'JASA' : (item.product?.category || 'BAN_BARU');
  const kind: CategoryKind | 'JASA' = isService ? 'JASA' : categoryKind(item.product?.category);

  const masterName =
    isService && item.service
      ? item.service.service_name
      : item.product?.product_name || item.product?.name || 'Produk';

  const standardPrice =
    isService && item.service
      ? item.service.standard_price
      : item.product?.product_price || item.product?.price || 0;

  const stockAvailable =
    isService || item.is_manual
      ? null
      : (item.product?.stock ?? item.product?.product_quantity ?? 0);

  const maxQty = stockAvailable !== null ? Math.max(1, stockAvailable) : undefined;

  const rawDiscountPerUnit =
    discountType === 'PERCENT'
      ? Math.round((unitPrice * Math.min(100, Math.max(0, discountValue))) / 100)
      : Math.max(0, discountValue);

  const discountNominalPerUnit = Math.min(unitPrice, rawDiscountPerUnit);
  const effectiveUnitPrice = Math.max(0, unitPrice - discountNominalPerUnit);
  const grossLineTotal = unitPrice * qty;
  const totalLineDiscount = discountNominalPerUnit * qty;
  const effectiveTotalLine = Math.max(0, effectiveUnitPrice * qty);

  const isZeroCatalogPrice = !isService && standardPrice <= 0;
  const isPriceOverridden = isZeroCatalogPrice || unitPrice !== standardPrice;
  const referenceHpp = isService ? (item.service?.cost_price || 0) : getProductReferenceHpp(item.product);
  const minSellingPrice = isService ? 0 : getMinSellingPrice(referenceHpp);
  const effectiveMarkupPct = calculateMarkupPercent(effectiveUnitPrice, referenceHpp);
  const profitPerUnit = effectiveUnitPrice - referenceHpp;
  const activeBatches = !isService && Array.isArray(item.product?.batches)
    ? item.product.batches.filter((b) => (b.remaining_qty ?? 0) > 0)
    : [];

  const isBelowMinMarkup = !isService && referenceHpp > 0 && effectiveUnitPrice + 0.01 < minSellingPrice;
  const isBelowCatalogForCashier =
    !isService && standardPrice > 0 && userRole === 'KASIR' && effectiveUnitPrice + 0.01 < standardPrice;

  const handleUnitPriceChange = (val: number) => {
    const clean = Math.max(0, val);
    setUnitPrice(clean);
    setPackageTotalPrice(clean * qty);
  };

  const handlePackagePriceChange = (val: number) => {
    const clean = Math.max(0, val);
    setPackageTotalPrice(clean);
    if (qty > 0) {
      setUnitPrice(Math.round(clean / qty));
    }
  };

  const handleQtyChange = (newQty: number) => {
    let q = Math.max(1, Math.floor(newQty) || 1);
    if (maxQty !== undefined) {
      q = Math.min(q, maxQty);
    }
    setQty(q);
    if (pricingMode === 'unit') {
      setPackageTotalPrice(unitPrice * q);
    } else {
      setUnitPrice(Math.round(packageTotalPrice / q));
    }
  };

  const handleDiscountTypeSwitch = (nextType: 'NOMINAL' | 'PERCENT') => {
    if (nextType === discountType) return;
    if (nextType === 'PERCENT') {
      const pct = unitPrice > 0 ? Math.min(100, Math.round((discountNominalPerUnit / unitPrice) * 100)) : 0;
      setDiscountValue(pct);
    } else {
      setDiscountValue(discountNominalPerUnit);
    }
    setDiscountType(nextType);
  };

  const handleAutoName = () => {
    const generated = buildAutoProductName(kind, {
      brand: specBrand,
      motif: specMotif,
      sizeWidth: specSizeWidth,
      sizeRatio: specSizeRatio,
      ring: specRing,
      dotYear: specDotYear,
      pcd: specPcd,
      valveType: specValveType,
      fallbackName: masterName,
    });
    setCustomName(generated);
  };

  const handleResetToCatalogPrice = () => {
    setPricingMode('unit');
    setUnitPrice(standardPrice);
    setPackageTotalPrice(standardPrice * qty);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (qty <= 0) {
      onRemoveItem(itemIndex);
      onClose();
      return;
    }

    if (!isService && effectiveUnitPrice <= 0) {
      setValidationError('Harga jual produk wajib lebih besar dari Rp 0.');
      return;
    }

    if (isBelowMinMarkup) {
      setValidationError(
        `Harga jual bersih (${formatRupiah(effectiveUnitPrice)}) kurang dari standar minimal +15% dari HPP ${formatRupiah(referenceHpp)} (minimal ${formatRupiah(minSellingPrice)}).`
      );
      return;
    }

    if (isBelowCatalogForCashier) {
      setValidationError(
        `Peran Kasir tidak diizinkan menurunkan harga bersih (${formatRupiah(effectiveUnitPrice)}) di bawah harga standar katalog (${formatRupiah(standardPrice)}).`
      );
      return;
    }

    if (!isService && isPriceOverridden && overrideReason.trim().length < 5) {
      setValidationError(
        'Alasan penentuan atau perubahan harga wajib diisi (minimal 5 karakter) agar tercatat di Audit Log Owner.'
      );
      return;
    }

    const updatedItem: CartItem = {
      ...item,
      qty,
      custom_price: isPriceOverridden ? unitPrice : undefined,
      discount_per_item: discountNominalPerUnit,
      custom_name_override: customName.trim() ? customName.trim() : undefined,
      note: note.trim() ? note.trim() : undefined,
      override_reason: isPriceOverridden ? overrideReason.trim() : undefined,
      adjusted_by: isPriceOverridden ? cashierName : undefined,
    };

    onSave(itemIndex, updatedItem);
    onClose();
  };

  const renderCategoryIcon = () => {
    if (kind === 'VELG') return <CircleDot className="w-4 h-4 text-slate-700" />;
    if (kind === 'BAN_DALAM') return <Package className="w-4 h-4 text-slate-700" />;
    if (kind === 'OLI_PELUMAS') return <Droplets className="w-4 h-4 text-slate-700" />;
    if (kind === 'AKSESORIS') return <Tag className="w-4 h-4 text-slate-700" />;
    if (kind === 'JASA') return <Wrench className="w-4 h-4 text-slate-700" />;
    return <Disc className="w-4 h-4 text-slate-700" />;
  };

  const receiptDisplayName = customName.trim() || masterName;
  const skuLabel = item.service?.service_code || item.product?.product_code;

  const specSummaryParts: string[] = [];
  if (!isService && item.product) {
    if (item.product.brand) specSummaryParts.push(item.product.brand);
    if (item.product.product_size) {
      specSummaryParts.push(item.product.product_size);
    } else if (item.product.size_width && item.product.size_ratio) {
      specSummaryParts.push(
        `${item.product.size_width}/${item.product.size_ratio}${item.product.ring ? ` ${formatRingLabel(item.product.ring)}` : ''}`,
      );
    } else if (item.product.ring) {
      specSummaryParts.push(formatRingLabel(item.product.ring));
    }
    if (item.product.motif && item.product.motif !== '-') specSummaryParts.push(item.product.motif);
    if (item.product.pcd) specSummaryParts.push(`PCD ${item.product.pcd}`);
    if (item.product.valve_type) specSummaryParts.push(item.product.valve_type);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 sm:p-4 font-['Plus_Jakarta_Sans',sans-serif]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-line-edit-title"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-xl flex flex-col overflow-hidden"
      >
        {/* Sticky Header Ringkas */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
              {renderCategoryIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {rawCategoryLabel.replace(/[_-]/g, ' ')}
                </span>
                <h2 id="cart-line-edit-title" className="text-sm sm:text-base font-bold text-slate-900 truncate">
                  {masterName}
                </h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-0.5">
                {skuLabel && <span className="font-mono">{skuLabel}</span>}
                {specSummaryParts.length > 0 && <span>· {specSummaryParts.join(' · ')}</span>}
                {stockAvailable !== null && (
                  <span
                    className={`font-semibold tabular-nums ${
                      stockAvailable <= 3 ? 'text-amber-800' : 'text-slate-700'
                    }`}
                  >
                    · Stok {stockAvailable} unit
                  </span>
                )}
                <span>
                  · Harga Katalog:{' '}
                  {standardPrice > 0 ? (
                    <strong className="font-mono text-slate-800 tabular-nums">{formatRupiah(standardPrice)}</strong>
                  ) : (
                    <strong className="text-amber-800">Rp 0 (Atur oleh Kasir)</strong>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal edit item"
            className="w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body 2 Kolom (Muat 1 layar laptop tanpa kotak berlapis) */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-white">
            {validationError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* KOLOM KIRI: Kontrol Transaksi Kasir */}
              <div className="lg:col-span-7 space-y-4">
                {/* 1. Jumlah & Harga Jual */}
                <section className="space-y-3 pb-4 border-b border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Jumlah &amp; Harga Jual
                    </h3>
                    <div className="flex items-center gap-2">
                      {!isZeroCatalogPrice && isPriceOverridden && (
                        <button
                          type="button"
                          onClick={handleResetToCatalogPrice}
                          className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Katalog</span>
                        </button>
                      )}
                      <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setPricingMode('unit')}
                          className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            pricingMode === 'unit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Per Satuan
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricingMode('total')}
                          className={`h-7 px-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                            pricingMode === 'total' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Paketan
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edit-line-qty" className="block text-xs font-medium text-slate-600 mb-1">
                        Jumlah Unit {maxQty !== undefined && <span className="text-slate-400">(Maks. {maxQty})</span>}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="Kurangi jumlah"
                          onClick={() => handleQtyChange(qty - 1)}
                          disabled={qty <= 1}
                          className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 text-slate-800 flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          id="edit-line-qty"
                          type="number"
                          min={1}
                          max={maxQty}
                          value={qty}
                          onChange={(e) => handleQtyChange(Number(e.target.value))}
                          className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-center text-slate-900 text-sm font-bold font-mono tabular-nums focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        />
                        <button
                          type="button"
                          aria-label="Tambah jumlah"
                          onClick={() => handleQtyChange(qty + 1)}
                          disabled={maxQty !== undefined && qty >= maxQty}
                          className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-40 text-slate-800 flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {pricingMode === 'unit' ? (
                      <div>
                        <label htmlFor="edit-line-unit-price" className="block text-xs font-medium text-slate-600 mb-1">
                          Harga Jual / Unit (Rp)
                        </label>
                        <input
                          id="edit-line-unit-price"
                          type="text"
                          value={formatRupiah(unitPrice)}
                          onChange={(e) => handleUnitPriceChange(parseRupiahInput(e.target.value))}
                          className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-emerald-700 text-sm font-bold font-mono tabular-nums focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-500 mt-1 block tabular-nums">
                          Subtotal kotor: <strong className="text-slate-700">{formatRupiah(grossLineTotal)}</strong>
                        </span>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="edit-line-package-price" className="block text-xs font-medium text-slate-600 mb-1">
                          Total Paketan untuk {qty} Unit (Rp)
                        </label>
                        <input
                          id="edit-line-package-price"
                          type="text"
                          value={formatRupiah(packageTotalPrice)}
                          onChange={(e) => handlePackagePriceChange(parseRupiahInput(e.target.value))}
                          className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-emerald-700 text-sm font-bold font-mono tabular-nums focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        />
                        <span className="text-[11px] text-slate-500 mt-1 block tabular-nums">
                          Setara satuan: <strong className="text-slate-700">{formatRupiah(unitPrice)} / unit</strong>
                          {unitPrice * qty !== packageTotalPrice && (
                            <span className="text-amber-700"> (dibulatkan ke {formatRupiah(unitPrice * qty)})</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Alasan Override Harga (muncul hanya ketika harga berubah / Rp 0) */}
                  {!isService && isPriceOverridden && (
                    <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label htmlFor="edit-override-reason" className="text-xs font-bold text-amber-900">
                          {isZeroCatalogPrice
                            ? 'Alasan Penentuan Harga Awal Kasir (Wajib, masuk Audit Log Owner)'
                            : `Alasan Perubahan Harga dari ${formatRupiah(standardPrice)} (Wajib, masuk Audit Log Owner)`}
                        </label>
                        <span className="text-[11px] font-semibold text-amber-800">
                          {cashierName} ({userRole})
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {(isZeroCatalogPrice ? CASHIER_INITIAL_PRICE_REASONS : CASHIER_REIMBURSE_REASONS).map((presetReason) => (
                          <button
                            key={presetReason}
                            type="button"
                            onClick={() => setOverrideReason(presetReason)}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                              overrideReason === presetReason
                                ? 'bg-amber-700 text-white border-amber-700'
                                : 'bg-white hover:bg-amber-50 text-slate-700 border-amber-200'
                            }`}
                          >
                            {presetReason}
                          </button>
                        ))}
                      </div>

                      <input
                        id="edit-override-reason"
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="Contoh: Permintaan pembeli menaikkan harga nota untuk reimburse kantor"
                        className="w-full h-9 bg-white border border-amber-300 rounded-lg px-3 text-xs text-slate-900 font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      />
                    </div>
                  )}
                </section>

                {/* 2. Potongan Diskon (Per Unit) */}
                <section className="space-y-2.5 pb-4 border-b border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Potongan Diskon (Per Unit)
                      </h3>
                      <span className="text-[11px] text-slate-500">Berlaku untuk {qty} unit pada baris ini</span>
                    </div>
                    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleDiscountTypeSwitch('NOMINAL')}
                        className={`h-7 px-2.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                          discountType === 'NOMINAL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Rp (Nominal)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscountTypeSwitch('PERCENT')}
                        className={`h-7 px-2.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                          discountType === 'PERCENT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        % (Persen)
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div className="relative">
                      <input
                        type="text"
                        aria-label="Nilai potongan diskon per unit"
                        value={discountType === 'NOMINAL' ? formatRupiah(discountValue) : String(discountValue)}
                        onChange={(e) => {
                          if (discountType === 'NOMINAL') {
                            setDiscountValue(Math.min(unitPrice, parseRupiahInput(e.target.value)));
                          } else {
                            const raw = e.target.value.replace(/[^0-9.]/g, '');
                            const parsed = Number(raw);
                            setDiscountValue(Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0);
                          }
                        }}
                        placeholder={discountType === 'NOMINAL' ? 'Rp 0' : '0'}
                        className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-amber-800 text-sm font-bold font-mono tabular-nums focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      />
                      {discountType === 'PERCENT' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">%</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 space-y-0.5 tabular-nums">
                      <div className="flex justify-between">
                        <span>Potongan / unit:</span>
                        <strong className="text-amber-800">-{formatRupiah(discountNominalPerUnit)}</strong>
                      </div>
                      <div className="flex justify-between font-semibold text-slate-800">
                        <span>Total potongan ({qty}x):</span>
                        <strong className="text-amber-800">-{formatRupiah(totalLineDiscount)}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 3. Catatan Baris & Kustomisasi Nama Struk (Lipat) */}
                <section className="space-y-3">
                  <div>
                    <label htmlFor="edit-line-note" className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan Baris di Struk (Opsional)
                    </label>
                    <input
                      id="edit-line-note"
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Contoh: Free pentil tubeless / Roda kanan depan / Garansi 1 tahun"
                      className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                    />
                  </div>

                  {/* Disclosure Kustomisasi Nama Struk & Spesifikasi */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowReceiptSpecEditor((prev) => !prev)}
                      aria-expanded={showReceiptSpecEditor}
                      className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-[11px] font-semibold text-slate-500 block">Tercetak di Struk:</span>
                        <span className="text-xs font-bold text-slate-900 block truncate">{receiptDisplayName}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 shrink-0">
                        <span>{showReceiptSpecEditor ? 'Tutup' : 'Ubah Nama / Spek'}</span>
                        {showReceiptSpecEditor ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </button>

                    {showReceiptSpecEditor && (
                      <div className="p-3.5 bg-white border-t border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor="edit-custom-name" className="text-xs font-semibold text-slate-700">
                            Nama Kustom di Struk
                          </label>
                          <div className="flex items-center gap-3">
                            {customName.trim() !== '' && (
                              <button
                                type="button"
                                onClick={() => setCustomName('')}
                                className="text-xs text-slate-600 hover:text-slate-900 font-medium hover:underline cursor-pointer"
                              >
                                Pakai Nama Master
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleAutoName}
                              className="text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer"
                            >
                              + Susun dari Spesifikasi
                            </button>
                          </div>
                        </div>

                        <input
                          id="edit-custom-name"
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder={`Kosongkan untuk pakai nama master: ${masterName}`}
                          className="w-full h-9 bg-white border border-slate-300 rounded-lg px-3 text-xs text-slate-900 font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                        />

                        {kind === 'BAN_BARU' && (
                          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                            <div className="sm:col-span-2">
                              <span className="text-[11px] text-slate-500 block mb-0.5">Merek</span>
                              <input
                                type="text"
                                value={specBrand}
                                onChange={(e) => setSpecBrand(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <span className="text-[11px] text-slate-500 block mb-0.5">Motif / Tipe</span>
                              <input
                                type="text"
                                value={specMotif}
                                onChange={(e) => setSpecMotif(e.target.value)}
                                placeholder="SemiSlick"
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Lebar</span>
                              <input
                                type="text"
                                value={specSizeWidth}
                                onChange={(e) => setSpecSizeWidth(e.target.value)}
                                placeholder="195"
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Rasio</span>
                              <input
                                type="text"
                                value={specSizeRatio}
                                onChange={(e) => setSpecSizeRatio(e.target.value)}
                                placeholder="50"
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <span className="text-[11px] text-slate-500 block mb-0.5">Ring</span>
                              <input
                                type="text"
                                value={specRing}
                                onChange={(e) => setSpecRing(e.target.value)}
                                placeholder="R15"
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <span className="text-[11px] text-slate-500 block mb-0.5">DOT Tahun</span>
                              <input
                                type="text"
                                value={specDotYear}
                                onChange={(e) => setSpecDotYear(e.target.value)}
                                placeholder="2026"
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {kind === 'VELG' && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Merek</span>
                              <input
                                type="text"
                                value={specBrand}
                                onChange={(e) => setSpecBrand(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Model / Motif</span>
                              <input
                                type="text"
                                value={specMotif}
                                onChange={(e) => setSpecMotif(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Ring</span>
                              <input
                                type="text"
                                value={specRing}
                                onChange={(e) => setSpecRing(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">PCD</span>
                              <input
                                type="text"
                                value={specPcd}
                                onChange={(e) => setSpecPcd(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {kind === 'BAN_DALAM' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Merek</span>
                              <input
                                type="text"
                                value={specBrand}
                                onChange={(e) => setSpecBrand(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Ukuran / Ring</span>
                              <input
                                type="text"
                                value={specSizeRatio}
                                onChange={(e) => setSpecSizeRatio(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-mono text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Tipe Katup</span>
                              <input
                                type="text"
                                value={specValveType}
                                onChange={(e) => setSpecValveType(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                          </div>
                        )}

                        {(kind === 'OLI_PELUMAS' || kind === 'AKSESORIS' || kind === 'LAINNYA') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Merek</span>
                              <input
                                type="text"
                                value={specBrand}
                                onChange={(e) => setSpecBrand(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[11px] text-slate-500 block mb-0.5">Varian / Tipe</span>
                              <input
                                type="text"
                                value={specMotif}
                                onChange={(e) => setSpecMotif(e.target.value)}
                                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-md px-2 text-slate-900 font-medium text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* KOLOM KANAN: Ringkasan Live & Kontrol HPP Margin FIFO */}
              <div className="lg:col-span-5 space-y-4">
                {/* Ringkasan Nilai Baris */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Ringkasan Baris</h3>
                  <div className="space-y-1.5 text-xs tabular-nums">
                    <div className="flex justify-between text-slate-600">
                      <span>Harga Satuan</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(unitPrice)}</span>
                    </div>
                    {discountNominalPerUnit > 0 && (
                      <div className="flex justify-between text-amber-800">
                        <span>Diskon ({qty}x {formatRupiah(discountNominalPerUnit)})</span>
                        <span className="font-semibold">-{formatRupiah(totalLineDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Harga Bersih / Unit</span>
                      <span className="font-semibold text-slate-900">{formatRupiah(effectiveUnitPrice)}</span>
                    </div>
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">Total ({qty} unit)</span>
                    <span className="text-xl font-extrabold text-emerald-700 tabular-nums">
                      {formatRupiah(effectiveTotalLine)}
                    </span>
                  </div>
                </div>

                {/* Informasi HPP Batch FIFO & Margin (tanpa kartu bersarang berlapis) */}
                {!isService && referenceHpp > 0 && (
                  <div
                    className={`p-4 rounded-xl border space-y-3 ${
                      isZeroCatalogPrice
                        ? 'bg-amber-50/60 border-amber-300'
                        : isBelowMinMarkup || isBelowCatalogForCashier
                        ? 'bg-rose-50/70 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Kontrol HPP &amp; Margin</span>
                      </div>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums ${
                          isBelowMinMarkup || isBelowCatalogForCashier
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {effectiveMarkupPct >= 0 ? `+${effectiveMarkupPct}%` : `${effectiveMarkupPct}%`} (
                        {profitPerUnit >= 0 ? `+${formatRupiah(profitPerUnit)}` : formatRupiah(profitPerUnit)})
                      </span>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 pt-1 text-xs tabular-nums">
                      <div>
                        <dt className="text-[11px] text-slate-500">HPP Patokan</dt>
                        <dd className="font-bold text-slate-900 text-sm mt-0.5">{formatRupiah(referenceHpp)}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] text-slate-500">Minimal (+15%)</dt>
                        <dd className="font-bold text-emerald-700 text-sm mt-0.5">{formatRupiah(minSellingPrice)}</dd>
                      </div>
                    </dl>

                    <div className="text-[11px] text-slate-600 pt-2 border-t border-slate-200/80 space-y-1">
                      <div>
                        <span className="font-semibold text-slate-700">Dampak: </span>
                        {isZeroCatalogPrice
                          ? 'Simpan ke Katalog, Nota, dan Audit Log Owner'
                          : isPriceOverridden
                          ? 'Khusus Nota Ini dan Audit Log Owner'
                          : 'Sesuai Standar Katalog'}
                      </div>
                      {activeBatches.length > 0 && (
                        <div className="font-mono text-[11px] text-slate-500">
                          FIFO:{' '}
                          {activeBatches
                            .map((b, idx) => `#${idx + 1} (${b.remaining_qty} pcs @ ${formatRupiah(b.batch_cost)})`)
                            .join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/80">
                      <MarkupPercentStepper
                        referenceHpp={referenceHpp}
                        sellingPrice={unitPrice}
                        onChangeSellingPrice={handleUnitPriceChange}
                        minPriceFloor={!isZeroCatalogPrice && userRole === 'KASIR' ? standardPrice : 0}
                        label="Atur Margin dari HPP (Min. 15%):"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Action Footer (Selalu terlihat tanpa scroll) */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                onRemoveItem(itemIndex);
                onClose();
              }}
              className="h-10 px-3.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Item</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isBelowMinMarkup || isBelowCatalogForCashier}
                className="h-10 px-5 rounded-lg bg-blue-700 hover:bg-blue-800 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isInitialPricing ? 'Simpan Harga & Tambah' : 'Terapkan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
