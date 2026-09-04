import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  X, 
  Trash2, 
  ShieldCheck, 
  Tag, 
  DollarSign, 
  Layers, 
  Check, 
  Percent, 
  FileText,
  Disc,
  CircleDot,
  Package,
  Wrench
} from 'lucide-react';
import { CartItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';

interface CartLineEditModalProps {
  isOpen: boolean;
  item: CartItem | null;
  itemIndex: number | null;
  onClose: () => void;
  onSave: (index: number, updatedItem: CartItem) => void;
  onRemoveItem: (index: number) => void;
}

export const CartLineEditModal: React.FC<CartLineEditModalProps> = ({
  isOpen,
  item,
  itemIndex,
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
  
  const [customName, setCustomName] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const [specBrand, setSpecBrand] = useState<string>('');
  const [specSizeWidth, setSpecSizeWidth] = useState<string>('');
  const [specSizeRatio, setSpecSizeRatio] = useState<string>('');
  const [specRing, setSpecRing] = useState<string>('');
  const [specMotif, setSpecMotif] = useState<string>('');
  const [specDotYear, setSpecDotYear] = useState<string>('');
  const [specPcd, setSpecPcd] = useState<string>('');
  const [specCondition, setSpecCondition] = useState<string>('BARU');

  useEffect(() => {
    if (!isOpen || !item) return;

    setQty(item.qty || 1);
    const standardPrice = item.item_type === 'SERVICE' && item.service
      ? item.service.standard_price
      : item.product?.product_price || item.product?.price || 0;

    const initialUnitP = item.custom_price ?? standardPrice;
    setUnitPrice(initialUnitP);
    setPackageTotalPrice(initialUnitP * (item.qty || 1));
    setDiscountType('NOMINAL');
    setDiscountValue(item.discount_per_item ?? 0);
    setPricingMode('unit');

    setCustomName(item.custom_name_override ?? '');
    setNote(item.note ?? '');

    if (item.item_type === 'PRODUCT' && item.product) {
      setSpecBrand(item.product.brand || '');
      setSpecSizeWidth(item.product.size_width ? String(item.product.size_width) : '');
      setSpecSizeRatio(item.product.size_ratio || '');
      setSpecRing(item.product.ring || '');
      setSpecMotif(item.product.motif || '');
      setSpecDotYear(item.product.product_year ? String(item.product.product_year) : '');
      setSpecPcd(item.product.pcd || '');
      setSpecCondition(item.product.condition_code || 'BARU');
    } else if (item.item_type === 'SERVICE' && item.service) {
      setSpecBrand('JASA');
      setSpecMotif(item.service.service_name);
    }
  }, [isOpen, item]);

  if (!isOpen || !item || itemIndex === null) return null;

  const itemCategory = item.item_type === 'SERVICE' ? 'JASA' : (item.product?.category || 'BAN_BARU');

  const discountNominalPerUnit = discountType === 'PERCENT'
    ? Math.round((unitPrice * discountValue) / 100)
    : discountValue;

  const effectiveUnitPrice = Math.max(0, unitPrice - discountNominalPerUnit);
  const effectiveTotalLine = pricingMode === 'total' 
    ? Math.max(0, packageTotalPrice - (discountNominalPerUnit * qty))
    : effectiveUnitPrice * qty;

  const handleUnitPriceChange = (val: number) => {
    setUnitPrice(val);
    setPackageTotalPrice(val * qty);
  };

  const handlePackagePriceChange = (val: number) => {
    setPackageTotalPrice(val);
    if (qty > 0) {
      setUnitPrice(Math.floor(val / qty));
    }
  };

  const handleQtyChange = (newQty: number) => {
    const q = Math.max(1, newQty);
    setQty(q);
    if (pricingMode === 'unit') {
      setPackageTotalPrice(unitPrice * q);
    } else {
      setUnitPrice(Math.floor(packageTotalPrice / q));
    }
  };

  const autoGenerateName = () => {
    if (itemCategory === 'BAN_BARU') {
      const parts = ['Ban'];
      if (specBrand) parts.push(specBrand);
      if (specMotif && specMotif !== '-') parts.push(specMotif);
      if (specSizeWidth && specSizeRatio) parts.push(`${specSizeWidth}/${specSizeRatio}`);
      if (specRing) parts.push(specRing);
      if (specDotYear) parts.push(`(${specCondition}, ${specDotYear})`);
      return parts.join(' ');
    } else if (itemCategory === 'VELG') {
      const parts = ['Velg'];
      if (specBrand) parts.push(specBrand);
      if (specMotif && specMotif !== '-') parts.push(specMotif);
      if (specRing) parts.push(specRing);
      if (specPcd) parts.push(specPcd);
      return parts.join(' ');
    } else if (itemCategory === 'BAN_DALAM') {
      return `Ban Dalam ${specBrand} ${specSizeRatio || ''}`.trim();
    }
    return item.custom_name_override || item.service?.service_name || item.product?.product_name || 'Produk';
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) {
      onRemoveItem(itemIndex);
      onClose();
      return;
    }

    const standardPrice = item.item_type === 'SERVICE' && item.service
      ? item.service.standard_price
      : item.product?.product_price || item.product?.price || 0;

    const isPriceOverridden = unitPrice !== standardPrice;

    const updatedItem: CartItem = {
      ...item,
      qty,
      custom_price: isPriceOverridden ? unitPrice : undefined,
      discount_per_item: discountNominalPerUnit,
      custom_name_override: customName.trim() ? customName.trim() : undefined,
      note: note.trim() ? note.trim() : undefined,
      override_reason: isPriceOverridden ? 'Penyesuaian kasir' : undefined,
      adjusted_by: isPriceOverridden ? 'Kasir OB3' : undefined,
    };

    onSave(itemIndex, updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
              {itemCategory === 'VELG' ? <CircleDot className="w-5 h-5 text-amber-600" /> : itemCategory === 'BAN_DALAM' ? <Package className="w-5 h-5 text-emerald-600" /> : itemCategory === 'JASA' ? <Wrench className="w-5 h-5 text-cyan-600" /> : <Disc className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase px-2 py-0.2 rounded-md ${
                  itemCategory === 'BAN_BARU' ? 'bg-blue-50 text-blue-700 border border-blue-200' : itemCategory === 'VELG' ? 'bg-amber-50 text-amber-700 border border-amber-200' : itemCategory === 'BAN_DALAM' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                }`}>
                  {itemCategory.replace('_', ' ')}
                </span>
                <h2 className="text-base font-bold text-slate-900">Edit Baris Item POS</h2>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-sm mt-0.5">
                {customName || (item.item_type === 'SERVICE' && item.service ? item.service.service_name : item.product?.product_name)}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto bg-white">
          
          {/* Section 1: Mode Penetapan Harga (Unit vs Paketan) */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mode Kalkulasi Harga</span>
              <div className="flex items-center bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPricingMode('unit')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    pricingMode === 'unit' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Per Satuan (Unit)
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('total')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    pricingMode === 'total' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Paketan (Total Row)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Jumlah Unit (Qty)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="1"
                    value={qty}
                    onChange={(e) => handleQtyChange(Number(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-sm font-bold shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {pricingMode === 'unit' ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Harga Jual / Unit (Rp)</label>
                  <input
                    type="text"
                    value={formatRupiah(unitPrice)}
                    onChange={(e) => handleUnitPriceChange(parseRupiahInput(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-emerald-600 text-sm font-extrabold shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">Harga Total Paketan (Rp)</label>
                  <input
                    type="text"
                    value={formatRupiah(packageTotalPrice)}
                    onChange={(e) => handlePackagePriceChange(parseRupiahInput(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-emerald-600 text-sm font-extrabold shadow-2xs focus:border-blue-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Diskon per Item (Nominal atau Persen) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Potongan Diskon</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDiscountType('NOMINAL')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                    discountType === 'NOMINAL' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-400'
                  }`}
                >
                  Rp (Nominal)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                    discountType === 'PERCENT' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-slate-400'
                  }`}
                >
                  % (Persen)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  value={discountType === 'NOMINAL' ? formatRupiah(discountValue) : discountValue}
                  onChange={(e) => setDiscountValue(discountType === 'NOMINAL' ? parseRupiahInput(e.target.value) : Number(e.target.value))}
                  placeholder={discountType === 'NOMINAL' ? 'Rp 0' : '0%'}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-amber-600 text-sm font-bold shadow-2xs focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end text-xs text-slate-500">
                <span>Potongan Efektif: <b className="text-amber-600 font-bold">-{formatRupiah(discountNominalPerUnit * qty)}</b></span>
              </div>
            </div>
          </div>

          {/* Section 3: Kustomisasi Nama Baris & Cepat Susun Spesifikasi */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Tampilan Nama Produk di Struk
              </label>
              <button
                type="button"
                onClick={() => setCustomName(autoGenerateName())}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-bold"
              >
                + Susun Otomatis dari Spesifikasi
              </button>
            </div>

            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ketik nama khusus jika ingin berbeda dari master katalog..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm font-semibold shadow-2xs focus:border-blue-500 focus:outline-none"
            />

            {itemCategory === 'BAN_BARU' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Lebar</span>
                  <input
                    type="text"
                    value={specSizeWidth}
                    onChange={(e) => setSpecSizeWidth(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Rasio</span>
                  <input
                    type="text"
                    value={specSizeRatio}
                    onChange={(e) => setSpecSizeRatio(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Ring</span>
                  <input
                    type="text"
                    value={specRing}
                    onChange={(e) => setSpecRing(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">DOT Thn</span>
                  <input
                    type="text"
                    value={specDotYear}
                    onChange={(e) => setSpecDotYear(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Kondisi</span>
                  <input
                    type="text"
                    value={specCondition}
                    onChange={(e) => setSpecCondition(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-800 font-semibold text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Catatan Khusus Struk */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Baris (Tercetak di Struk)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Free pentil tubeless / Roda kanan depan"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm shadow-2xs focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Total Baris Summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-xs text-slate-500 block">Total Nilai Baris Ini:</span>
              <span className="text-[11px] text-slate-400 font-mono">
                {qty} x {formatRupiah(effectiveUnitPrice)}
              </span>
            </div>
            <span className="text-lg font-black text-blue-600">{formatRupiah(effectiveTotalLine)}</span>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                onRemoveItem(itemIndex);
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 flex items-center gap-1.5 transition-all shadow-2xs"
            >
              <Trash2 className="w-4 h-4" /> Hapus Item
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-2xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
