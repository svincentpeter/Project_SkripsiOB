import React, { useState, useEffect } from 'react';
import {
  Edit3,
  X,
  Trash2,
  Plus,
  Minus,
  RotateCcw,
  Package,
  Wrench,
  Disc,
  CircleDot,
  Droplets,
  Sparkles,
  Info,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
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
        `Role Kasir tidak diizinkan menurunkan harga bersih (${formatRupiah(effectiveUnitPrice)}) di bawah harga standar katalog (${formatRupiah(standardPrice)}).`
      );
      return;
    }

    if (!isService && isPriceOverridden && overrideReason.trim().length < 5) {
      setValidationError(
        'Alasan penentuan / perubahan harga wajib diisi (minimal 5 karakter) agar tercatat di Audit Log & Notifikasi Owner.'
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
    if (kind === 'VELG') return <CircleDot className="w-5 h-5 text-amber-600" />;
    if (kind === 'BAN_DALAM') return <Package className="w-5 h-5 text-emerald-600" />;
    if (kind === 'OLI_PELUMAS') return <Droplets className="w-5 h-5 text-orange-600" />;
    if (kind === 'AKSESORIS') return <Sparkles className="w-5 h-5 text-purple-600" />;
    if (kind === 'JASA') return <Wrench className="w-5 h-5 text-cyan-600" />;
    return <Disc className="w-5 h-5 text-blue-600" />;
  };

  const categoryBadgeStyle =
    kind === 'VELG'
      ? 'bg-amber-50 text-amber-700 border border-amber-200'
      : kind === 'BAN_DALAM'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : kind === 'OLI_PELUMAS'
      ? 'bg-orange-50 text-orange-700 border border-orange-200'
      : kind === 'AKSESORIS'
      ? 'bg-purple-50 text-purple-700 border border-purple-200'
      : kind === 'JASA'
      ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
      : 'bg-blue-50 text-blue-700 border border-blue-200';

  const receiptDisplayName = customName.trim() || masterName;

  // Bangun rincian spesifikasi katalog agar kasir langsung melihat detail produk asli
  const specSummaryChips: string[] = [];
  if (!isService && item.product) {
    if (item.product.brand) specSummaryChips.push(`Merek: ${item.product.brand}`);
    if (item.product.product_size) {
      specSummaryChips.push(`Ukuran: ${item.product.product_size}`);
    } else if (item.product.size_width && item.product.size_ratio) {
      specSummaryChips.push(
        `Ukuran: ${item.product.size_width}/${item.product.size_ratio}${item.product.ring ? ` ${formatRingLabel(item.product.ring)}` : ''}`,
      );
    } else if (item.product.ring) {
      specSummaryChips.push(`Ring: ${formatRingLabel(item.product.ring)}`);
    }
    if (item.product.motif && item.product.motif !== '-') specSummaryChips.push(`Motif: ${item.product.motif}`);
    if (item.product.pcd) specSummaryChips.push(`PCD: ${item.product.pcd}`);
    if (item.product.valve_type) specSummaryChips.push(`Katup: ${item.product.valve_type}`);
    if (item.product.product_year) specSummaryChips.push(`DOT: ${item.product.product_year}`);
  } else if (isService && item.service) {
    if (item.service.category) specSummaryChips.push(`Kategori: ${item.service.category}`);
    if (item.service.description) specSummaryChips.push(item.service.description);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-6 animate-in fade-in zoom-in duration-200">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs shrink-0">
              {renderCategoryIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${categoryBadgeStyle}`}>
                  {rawCategoryLabel.replace(/_/g, ' ')}
                </span>
                <h2 className="text-base font-bold text-slate-900">Rincian &amp; Edit Item POS</h2>
              </div>
              <p className="text-xs text-slate-600 font-semibold truncate max-w-md mt-0.5">{masterName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal edit item"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto bg-white">
          {/* Rincian Master Produk / Jasa */}
          <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200/80 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-900">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Detail Master {isService ? 'Layanan Jasa' : 'Produk Katalog'}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[11px]">
                {(item.product?.product_code || item.service?.service_code) && (
                  <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-blue-200 text-slate-700">
                    SKU: {item.service?.service_code || item.product?.product_code}
                  </span>
                )}
                {!isService && item.product?.barcode && item.product.barcode !== item.product.product_code && (
                  <span className="font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                    EAN: {item.product.barcode}
                  </span>
                )}
                {stockAvailable !== null && (
                  <span
                    className={`font-bold px-2 py-0.5 rounded-md border ${
                      stockAvailable <= 3
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    Stok Tersedia: {stockAvailable} Unit
                  </span>
                )}
              </div>
            </div>

            {specSummaryChips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-700">
                {specSummaryChips.map((chip, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium">
                    {chip}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-blue-100 text-[11px]">
              <span className="text-slate-600">
                Harga Standar Katalog:{' '}
                {standardPrice > 0 ? (
                  <strong className="font-mono text-slate-900">{formatRupiah(standardPrice)}</strong>
                ) : (
                  <strong className="font-mono text-rose-600">Rp 0 (Belum Diisi Owner — Mode Penentuan Harga Kasir)</strong>
                )}
              </span>
              {!isZeroCatalogPrice && isPriceOverridden && (
                <button
                  type="button"
                  onClick={handleResetToCatalogPrice}
                  className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ke Harga Katalog</span>
                </button>
              )}
            </div>
          </div>

          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Panel Informasi HPP Batch FIFO & Standar Minimal +15% untuk Kasir/Owner */}
          {!isService && referenceHpp > 0 && (
            <div className={`p-3.5 rounded-xl border space-y-2.5 ${
              isZeroCatalogPrice
                ? 'bg-amber-50/80 border-amber-300'
                : isBelowMinMarkup || isBelowCatalogForCashier
                ? 'bg-rose-50/80 border-rose-300'
                : 'bg-emerald-50/50 border-emerald-200'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {isZeroCatalogPrice
                      ? 'Standar Penentuan Harga Jual Kasir (Harga Katalog Belum Diisi Owner)'
                      : 'Informasi HPP & Standar Margin Penjualan (Min. +15%)'}
                  </span>
                </div>
                <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md font-mono ${
                  isBelowMinMarkup || isBelowCatalogForCashier
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  Margin Bersih: {effectiveMarkupPct >= 0 ? `+${effectiveMarkupPct}%` : `${effectiveMarkupPct}%`} ({profitPerUnit >= 0 ? `+${formatRupiah(profitPerUnit)}` : formatRupiah(profitPerUnit)}/unit)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white/90 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-semibold text-slate-500 block">HPP Patokan (Modal Tertinggi)</span>
                  <strong className="font-mono text-slate-900 text-sm">{formatRupiah(referenceHpp)}</strong>
                </div>
                <div className="bg-white/90 border border-emerald-200 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-semibold text-emerald-700 block">Harga Jual Minimal (+15% HPP)</span>
                  <strong className="font-mono text-emerald-800 text-sm">{formatRupiah(minSellingPrice)}</strong>
                </div>
                <div className="bg-white/90 border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-semibold text-slate-500 block">Dampak Perubahan</span>
                  <strong className="text-[11px] text-slate-800">
                    {isZeroCatalogPrice
                      ? 'Simpan ke Katalog & Nota + Notif Owner'
                      : isPriceOverridden
                      ? 'Khusus Nota Ini (Reimburse) + Notif Owner'
                      : 'Sesuai Standar Katalog'}
                  </strong>
                </div>
              </div>

              {activeBatches.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] text-slate-600 pt-0.5">
                  <span className="font-bold text-slate-500">Layer Batch FIFO Aktif:</span>
                  {activeBatches.map((b, idx) => (
                    <span key={b.id || idx} className="px-2 py-0.5 rounded bg-white border border-slate-200 font-mono">
                      Batch #{idx + 1}: {b.remaining_qty} pcs @ {formatRupiah(b.batch_cost)}
                    </span>
                  ))}
                </div>
              )}

              {/* Kontrol Real-Time Penambahan / Pengurangan Persen (+/-) dari HPP */}
              <MarkupPercentStepper
                referenceHpp={referenceHpp}
                sellingPrice={unitPrice}
                onChangeSellingPrice={handleUnitPriceChange}
                minPriceFloor={!isZeroCatalogPrice && userRole === 'KASIR' ? standardPrice : 0}
                label="Atur Persentase Keuntungan dari HPP (+/- Real-Time, Min. 15%):"
              />
            </div>
          )}

          {/* Section 1: Jumlah & Harga Jual */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Jumlah &amp; Harga Jual Baris
              </span>
              <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPricingMode('unit')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    pricingMode === 'unit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Per Satuan (Unit)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('total')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    pricingMode === 'total' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paketan (Total Baris)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Jumlah Unit (Qty)
                  {maxQty !== undefined && <span className="text-slate-400 font-normal"> • Maks. {maxQty}</span>}
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label="Kurangi jumlah"
                    onClick={() => handleQtyChange(qty - 1)}
                    disabled={qty <= 1}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={qty}
                    onChange={(e) => handleQtyChange(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-slate-900 text-sm font-bold font-mono shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Tambah jumlah"
                    onClick={() => handleQtyChange(qty + 1)}
                    disabled={maxQty !== undefined && qty >= maxQty}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {pricingMode === 'unit' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Harga Jual / Unit (Rp)
                  </label>
                  <input
                    type="text"
                    value={formatRupiah(unitPrice)}
                    onChange={(e) => handleUnitPriceChange(parseRupiahInput(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-emerald-700 text-sm font-extrabold font-mono shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Subtotal sebelum diskon: <strong className="font-mono">{formatRupiah(grossLineTotal)}</strong>
                  </span>
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Harga Total Paketan untuk {qty} Unit (Rp)
                  </label>
                  <input
                    type="text"
                    value={formatRupiah(packageTotalPrice)}
                    onChange={(e) => handlePackagePriceChange(parseRupiahInput(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-emerald-700 text-sm font-extrabold font-mono shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Setara harga satuan: <strong className="font-mono">{formatRupiah(unitPrice)} / unit</strong>
                    {unitPrice * qty !== packageTotalPrice && (
                      <span className="text-amber-700"> (dibulatkan ke {formatRupiah(unitPrice * qty)})</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {isPriceOverridden && (
              <div className="pt-2 border-t border-slate-200/80 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <label className="block text-[11px] font-bold text-amber-900">
                    {isZeroCatalogPrice
                      ? 'Alasan Penentuan Harga Jual Baru oleh Kasir (Wajib — Masuk Audit Log & Notifikasi Owner)'
                      : `Alasan Perubahan Harga Nota dari ${formatRupiah(standardPrice)} (Wajib — Masuk Audit Log & Notifikasi Owner)`}
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                    Kasir: {cashierName} ({userRole})
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(isZeroCatalogPrice ? CASHIER_INITIAL_PRICE_REASONS : CASHIER_REIMBURSE_REASONS).map((presetReason) => (
                    <button
                      key={presetReason}
                      type="button"
                      onClick={() => setOverrideReason(presetReason)}
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                        overrideReason === presetReason
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white hover:bg-amber-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {presetReason}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Contoh: Permintaan pembeli menaikkan harga nota untuk reimburse ke atasannya"
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-semibold focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Section 2: Diskon per Unit */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  2. Potongan Diskon (Per Unit)
                </label>
                <span className="text-[11px] text-slate-500">
                  Berlaku untuk setiap unit pada baris ini ({qty} unit)
                </span>
              </div>
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleDiscountTypeSwitch('NOMINAL')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    discountType === 'NOMINAL' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Rp (Nominal)
                </button>
                <button
                  type="button"
                  onClick={() => handleDiscountTypeSwitch('PERCENT')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    discountType === 'PERCENT' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-500 hover:text-slate-800'
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
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-amber-700 text-sm font-bold font-mono shadow-2xs focus:border-blue-500 focus:outline-none"
                />
                {discountType === 'PERCENT' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs space-y-0.5">
                <div className="flex justify-between text-slate-600">
                  <span>Potongan / Unit:</span>
                  <strong className="text-amber-700 font-mono">-{formatRupiah(discountNominalPerUnit)}</strong>
                </div>
                <div className="flex justify-between text-slate-700 font-semibold">
                  <span>Total Potongan ({qty}x):</span>
                  <strong className="text-amber-700 font-mono">-{formatRupiah(totalLineDiscount)}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Kustomisasi Nama Struk & Rincian Spesifikasi */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Rincian Nama &amp; Spesifikasi di Struk
              </label>
              <div className="flex items-center gap-3">
                {customName.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setCustomName('')}
                    className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold hover:underline cursor-pointer"
                  >
                    Pakai Nama Master
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAutoName}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
                >
                  + Susun Otomatis dari Spesifikasi
                </button>
              </div>
            </div>

            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={`Kosongkan untuk pakai nama master: ${masterName}`}
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm font-semibold shadow-2xs focus:border-blue-500 focus:outline-none"
            />

            <div className="text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-1.5 flex items-center justify-between gap-2">
              <span className="shrink-0 font-semibold text-slate-500">Tercetak di Struk:</span>
              <span className="font-bold text-slate-900 truncate">{receiptDisplayName}</span>
            </div>

            {kind === 'BAN_BARU' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Merek</span>
                  <input
                    type="text"
                    value={specBrand}
                    onChange={(e) => setSpecBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Motif / Tipe</span>
                  <input
                    type="text"
                    value={specMotif}
                    onChange={(e) => setSpecMotif(e.target.value)}
                    placeholder="e.g. SemiSlick"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Lebar</span>
                  <input
                    type="text"
                    value={specSizeWidth}
                    onChange={(e) => setSpecSizeWidth(e.target.value)}
                    placeholder="195"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Rasio</span>
                  <input
                    type="text"
                    value={specSizeRatio}
                    onChange={(e) => setSpecSizeRatio(e.target.value)}
                    placeholder="50"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Ring</span>
                  <input
                    type="text"
                    value={specRing}
                    onChange={(e) => setSpecRing(e.target.value)}
                    placeholder="R15"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-3">
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">DOT Tahun</span>
                  <input
                    type="text"
                    value={specDotYear}
                    onChange={(e) => setSpecDotYear(e.target.value)}
                    placeholder="2026"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {kind === 'VELG' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Merek</span>
                  <input
                    type="text"
                    value={specBrand}
                    onChange={(e) => setSpecBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Model / Motif</span>
                  <input
                    type="text"
                    value={specMotif}
                    onChange={(e) => setSpecMotif(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Ring</span>
                  <input
                    type="text"
                    value={specRing}
                    onChange={(e) => setSpecRing(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">PCD</span>
                  <input
                    type="text"
                    value={specPcd}
                    onChange={(e) => setSpecPcd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {kind === 'BAN_DALAM' && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Merek</span>
                  <input
                    type="text"
                    value={specBrand}
                    onChange={(e) => setSpecBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Ukuran / Ring</span>
                  <input
                    type="text"
                    value={specSizeRatio}
                    onChange={(e) => setSpecSizeRatio(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Tipe Katup</span>
                  <input
                    type="text"
                    value={specValveType}
                    onChange={(e) => setSpecValveType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
              </div>
            )}

            {(kind === 'OLI_PELUMAS' || kind === 'AKSESORIS' || kind === 'LAINNYA') && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Merek</span>
                  <input
                    type="text"
                    value={specBrand}
                    onChange={(e) => setSpecBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 block mb-0.5">Varian / Tipe</span>
                  <input
                    type="text"
                    value={specMotif}
                    onChange={(e) => setSpecMotif(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Catatan Khusus Struk */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              4. Catatan Baris (Tercetak di Struk)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Free pentil tubeless / Roda kanan depan / Garansi 1 tahun"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Total Baris Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pb-2 border-b border-slate-200">
              <div>
                <span className="text-slate-500 block">Harga / Unit</span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(unitPrice)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Diskon / Unit</span>
                <span className="font-mono font-bold text-amber-700">-{formatRupiah(discountNominalPerUnit)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Harga Bersih / Unit</span>
                <span className="font-mono font-bold text-emerald-700">{formatRupiah(effectiveUnitPrice)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Diskon ({qty}x)</span>
                <span className="font-mono font-bold text-amber-700">-{formatRupiah(totalLineDiscount)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <div>
                <span className="text-xs font-bold text-slate-700 block">Total Nilai Baris Ini</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {qty} unit × {formatRupiah(effectiveUnitPrice)}
                </span>
              </div>
              <span className="text-lg font-black text-blue-600 font-mono">{formatRupiah(effectiveTotalLine)}</span>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onRemoveItem(itemIndex);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-4 h-4" /> Hapus Item
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-2xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isBelowMinMarkup || isBelowCatalogForCashier}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isInitialPricing ? 'Simpan Harga & Masukkan Keranjang' : 'Terapkan Perubahan'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
