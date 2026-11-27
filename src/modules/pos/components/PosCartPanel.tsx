import React, { useState } from 'react';
import {
  ArrowLeft,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  Edit3,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Store,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { CartItem } from '../../../shared/types';
import { categoryKind } from '../../../shared/utils/categoryKind';
import { formatRupiah } from '../../../shared/utils/formatters';
import { MoneyInput } from '../../../shared/components/MoneyInput';
import { getShortCategoryName } from './PosCatalogToolbar';

interface PosCartPanelProps {
  visibleOnMobile: boolean;
  onBackToCatalogMobile: () => void;
  cart: CartItem[];
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  vehiclePlate: string;
  onVehiclePlateChange: (val: string) => void;
  vehicleModel: string;
  onVehicleModelChange: (val: string) => void;
  manualDiscount: number;
  onManualDiscountChange: (val: number) => void;
  totals: {
    subtotal: number;
    discount: number;
    grandTotal: number;
  };
  netPayable: number;
  onParkCart: () => void;
  onClearCart: () => void;
  onEditItem: (index: number) => void;
  onUpdateQty: (index: number, delta: number) => void;
  onRemoveItem: (index: number) => void;
  onPrintPreview: () => void;
  onOpenCheckout: () => void;
}

export const PosCartPanel: React.FC<PosCartPanelProps> = ({
  visibleOnMobile,
  onBackToCatalogMobile,
  cart,
  customerName,
  onCustomerNameChange,
  vehiclePlate,
  onVehiclePlateChange,
  vehicleModel,
  onVehicleModelChange,
  manualDiscount,
  onManualDiscountChange,
  totals,
  netPayable,
  onParkCart,
  onClearCart,
  onEditItem,
  onUpdateQty,
  onRemoveItem,
  onPrintPreview,
  onOpenCheckout,
}) => {
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [isDiscountOpen, setIsDiscountOpen] = useState(false);

  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const itemDiscountSum = cart.reduce((sum, item) => sum + (item.discount_per_item || 0) * item.qty, 0);
  const maxManualDiscount = Math.max(0, totals.subtotal - itemDiscountSum);

  const customerSummaryParts = [
    customerName.trim(),
    vehiclePlate.trim().toUpperCase(),
    vehicleModel.trim(),
  ].filter(Boolean);
  const hasCustomerInfo = customerSummaryParts.length > 0;

  return (
    <aside
      aria-label="Keranjang kasir"
      className={`w-full lg:w-[400px] xl:w-[430px] flex-col bg-white border-t lg:border-t-0 lg:border-l border-slate-200 h-full min-h-0 shrink-0 ${
        visibleOnMobile ? 'flex' : 'hidden lg:flex'
      }`}
    >
      {/* Header Keranjang Mobile */}
      <div className="lg:hidden px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onBackToCatalogMobile}
          className="h-9 px-3 rounded-lg bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Katalog</span>
        </button>
        <span className="text-xs font-bold text-slate-800 tabular-nums">
          Keranjang ({totalQty} item)
        </span>
      </div>

      {/* Header Keranjang Desktop */}
      <div className="hidden lg:flex items-center justify-between px-4 h-12 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-900">Keranjang Kasir</h2>
          {totalQty > 0 && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold tabular-nums inline-flex items-center justify-center">
              {totalQty}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onParkCart}
            disabled={cart.length === 0}
            className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-300 hover:text-amber-900 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            title="Tahan transaksi ini ke antrian servis"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tahan</span>
          </button>

          <button
            type="button"
            onClick={onClearCart}
            disabled={cart.length === 0}
            className="h-8 px-2.5 rounded-lg border border-transparent text-slate-500 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
            title="Kosongkan seluruh keranjang"
          >
            Kosongkan
          </button>
        </div>
      </div>

      {/* Blok Pelanggan & Kendaraan (Ringkas lipat-buka agar ruang daftar item luas) */}
      <div className="bg-slate-50/90 border-b border-slate-200 shrink-0">
        <button
          type="button"
          onClick={() => setIsCustomerOpen((prev) => !prev)}
          aria-expanded={isCustomerOpen}
          className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-100/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Car className={`w-4 h-4 shrink-0 ${hasCustomerInfo ? 'text-blue-700' : 'text-slate-400'}`} />
            <div className="min-w-0">
              <span className="text-xs font-semibold text-slate-800 block truncate">
                {hasCustomerInfo ? customerSummaryParts.join(' · ') : 'Pelanggan Umum'}
              </span>
              {!hasCustomerInfo && (
                <span className="text-[11px] text-slate-500 block">
                  Klik untuk isi nama, plat nomor, atau model mobil
                </span>
              )}
            </div>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 shrink-0">
            <span>{isCustomerOpen ? 'Tutup' : hasCustomerInfo ? 'Ubah' : 'Isi Data'}</span>
            {isCustomerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>

        {isCustomerOpen && (
          <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-200/70">
            <div>
              <label htmlFor="pos-customer-name" className="text-[11px] font-semibold text-slate-600 block mb-1">
                Nama Pelanggan
              </label>
              <input
                id="pos-customer-name"
                type="text"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                placeholder="Kosongkan untuk Pelanggan Umum"
                className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="pos-vehicle-plate" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Plat Nomor
                </label>
                <input
                  id="pos-vehicle-plate"
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => onVehiclePlateChange(e.target.value)}
                  placeholder="AA 1234 XY"
                  className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 font-mono font-semibold uppercase focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none placeholder:text-slate-400"
                />
              </div>

              <div>
                <label htmlFor="pos-vehicle-model" className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Model Mobil
                </label>
                <input
                  id="pos-vehicle-model"
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => onVehicleModelChange(e.target.value)}
                  placeholder="Avanza / Innova"
                  className="w-full h-9 bg-white border border-slate-300 rounded-lg px-2.5 text-xs text-slate-900 font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Daftar Item Keranjang */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2.5 bg-slate-50/60 custom-scrollbar">
        {cart.length === 0 ? (
          <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center px-4 py-10 text-slate-500">
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-3">
              <Store className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Keranjang masih kosong</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] leading-relaxed">
              Pilih ban, ban dalam, atau layanan jasa dari katalog di sebelah kiri untuk mulai mencatat nota.
            </p>
          </div>
        ) : (
          cart.map((item, idx) => {
            const standardPrice =
              item.item_type === 'SERVICE' && item.service
                ? item.service.standard_price
                : item.product?.product_price || item.product?.price || 0;

            const activePrice = item.custom_price ?? standardPrice;
            const lineTotal = Math.max(0, (activePrice - item.discount_per_item) * item.qty);
            const displayName =
              item.custom_name_override ||
              (item.item_type === 'SERVICE' && item.service ? item.service.service_name : item.product?.product_name);
            const cartKind = item.item_type === 'SERVICE' ? 'JASA' : categoryKind(item.product?.category);
            const categoryTag =
              cartKind === 'JASA'
                ? 'Jasa'
                : getShortCategoryName(item.product?.category || 'BAN_BARU', item.product?.category || 'Ban');
            const cartSubSpec =
              item.item_type === 'SERVICE'
                ? item.service?.service_code
                : [item.product?.product_code, item.product?.product_size].filter(Boolean).join(' · ');

            const stockAvailable =
              item.item_type === 'PRODUCT' ? item.product.stock || item.product.product_quantity || 0 : null;
            const atMaxStock = stockAvailable !== null && item.qty >= stockAvailable;

            return (
              <div
                key={`${item.item_type}-${item.product?.id ?? item.service?.id ?? idx}-${idx}`}
                className="bg-white border border-slate-200 rounded-xl p-3 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                        {categoryTag}
                      </span>
                      <h4 className="text-[13px] font-semibold text-slate-900 truncate">{displayName}</h4>
                    </div>

                    {cartSubSpec && (
                      <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{cartSubSpec}</div>
                    )}

                    <div className="text-xs text-slate-600 flex items-center gap-2 mt-1 flex-wrap tabular-nums">
                      <span>{formatRupiah(activePrice)} / unit</span>
                      {item.discount_per_item > 0 && (
                        <span className="text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                          Diskon -{formatRupiah(item.discount_per_item)}
                        </span>
                      )}
                      {item.custom_price !== undefined && item.custom_price !== standardPrice && (
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {standardPrice <= 0 ? 'Harga Awal Kasir' : 'Harga Diubah'}
                        </span>
                      )}
                    </div>

                    {item.override_reason && item.custom_price !== undefined && item.custom_price !== standardPrice && (
                      <div className="text-[11px] text-amber-800 mt-1 truncate">
                        Alasan: {item.override_reason}
                      </div>
                    )}

                    {item.note && (
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">Catatan: {item.note}</div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditItem(idx)}
                    title="Edit jumlah, harga, diskon, nama struk, dan catatan"
                    className="h-8 px-2.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Kurangi jumlah ${displayName}`}
                      onClick={() => onUpdateQty(idx, -1)}
                      className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 active:scale-[0.96] flex items-center justify-center text-slate-800 transition-[background-color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-slate-900 min-w-8 text-center tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Tambah jumlah ${displayName}`}
                      disabled={atMaxStock}
                      onClick={() => onUpdateQty(idx, 1)}
                      className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-blue-700 hover:text-white active:scale-[0.96] disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-800 disabled:cursor-not-allowed flex items-center justify-center text-slate-800 transition-[background-color,color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{formatRupiah(lineTotal)}</span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      aria-label={`Hapus ${displayName} dari keranjang`}
                      className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
                      title="Hapus dari Keranjang"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Ringkasan, Diskon Nota & Pembayaran */}
      <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal ({totalQty} item)</span>
            <span className="font-semibold text-slate-900 tabular-nums">{formatRupiah(totals.subtotal)}</span>
          </div>

          {itemDiscountSum > 0 && (
            <div className="flex justify-between text-amber-800">
              <span>Diskon Item</span>
              <span className="font-semibold tabular-nums">-{formatRupiah(itemDiscountSum)}</span>
            </div>
          )}

          {/* Diskon Tambahan Tingkat Nota */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Diskon Nota</span>
            </div>

            {isDiscountOpen || manualDiscount > 0 ? (
              <div className="flex items-center gap-1">
                <div className="w-32">
                  <MoneyInput
                    value={manualDiscount}
                    onChange={(val) => onManualDiscountChange(Math.min(maxManualDiscount, Math.max(0, val)))}
                    aria-label="Diskon tambahan nota (Rp)"
                    className="w-full h-7 px-2 text-xs text-right font-mono font-semibold text-amber-800 bg-amber-50/50 border border-amber-300 rounded-md focus:outline-none focus:border-blue-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onManualDiscountChange(0);
                    setIsDiscountOpen(false);
                  }}
                  aria-label="Hapus diskon nota"
                  className="w-7 h-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setIsDiscountOpen(true)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
              >
                + Tambah Diskon
              </button>
            )}
          </div>

          <div className="flex justify-between items-baseline pt-2.5 border-t border-slate-200">
            <span className="text-sm font-bold text-slate-900">Total Tagihan</span>
            <span className="text-xl font-extrabold text-emerald-700 tabular-nums tracking-tight">
              {formatRupiah(netPayable)}
            </span>
          </div>
        </div>

        {/* Focal Point Utama: Tombol Bayar */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onOpenCheckout}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-bold text-sm shadow-xs flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-[background-color,transform] duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>Proses Pembayaran</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/15 text-[10px] font-mono font-semibold text-white/90 ml-1">
              F8
            </kbd>
          </button>

          <button
            type="button"
            onClick={onPrintPreview}
            disabled={cart.length === 0}
            className="w-full h-9 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1"
            title="Buka pratinjau fisik nota kasir thermal 80mm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Pratinjau Struk 80mm</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
