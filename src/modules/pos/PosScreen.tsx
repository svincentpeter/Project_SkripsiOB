import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  X, 
  Car, 
  Clock, 
  ArrowLeft, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  Banknote,
  QrCode,
  Building2,
  Store,
  Disc,
  CircleDot,
  Package,
  Wrench,
  Bookmark,
  Edit3,
  CreditCard,
  ArrowRight,
  ShoppingCart
} from 'lucide-react';
import { 
  CartItem, 
  PaymentMethod, 
  PosTransaction, 
  ProductItem, 
  SalesBookingRecord, 
  ServiceMasterItem 
} from '../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../shared/utils/formatters';
import { MoneyInput } from '../../shared/components/MoneyInput';
import { 
  calculateCartTotals, 
  createPosTransactionRecord, 
  generateInvoiceNumber 
} from '../../services/posService';
import { 
  BookingDpModal, 
  BookingListDrawer, 
  CartLineEditModal 
} from './components';
import { useToast } from '../../shared/components';

interface PosScreenProps {
  products: ProductItem[];
  services?: ServiceMasterItem[];
  bookings?: SalesBookingRecord[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCompleteSale: (transaction: PosTransaction) => void;
  onSaveBooking?: (booking: SalesBookingRecord) => void;
  onConvertBooking?: (bookingId: string) => void;
  cashierName: string;
  cashInDrawer: number;
  timeString: string;
  onExitToBackoffice: () => void;
  onOpenWireframeModal?: () => void;
  isEmptyState?: boolean;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  products,
  services = [],
  bookings = [],
  cart,
  setCart,
  onCompleteSale,
  onSaveBooking,
  onConvertBooking,
  cashierName,
  cashInDrawer,
  timeString,
  onExitToBackoffice,
  isEmptyState = false,
}) => {
  const toast = useToast();
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');
  const [catalogTab, setCatalogTab] = useState<'ALL' | 'BAN_BARU' | 'VELG' | 'BAN_DALAM' | 'SERVICES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRing, setSelectedRing] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');

  const [customerName, setCustomerName] = useState('Pelanggan Walk-In');
  const [vehiclePlate, setVehiclePlate] = useState('B 1984 SKZ');
  const [vehicleModel, setVehicleModel] = useState('Avanza');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [applyTax, setApplyTax] = useState<boolean>(false);
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  const [editLineIndex, setEditLineIndex] = useState<number | null>(null);
  const [showBookingDpModal, setShowBookingDpModal] = useState<boolean>(false);
  const [showBookingListDrawer, setShowBookingListDrawer] = useState<boolean>(false);

  const [activeBookingSourceId, setActiveBookingSourceId] = useState<string | null>(null);
  const [appliedDpAmount, setAppliedDpAmount] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredProducts = isEmptyState
    ? []
    : products.filter((prod) => {
        if (catalogTab !== 'ALL' && prod.category !== catalogTab) return false;

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (prod.name && prod.name.toLowerCase().includes(q)) ||
          (prod.product_name && prod.product_name.toLowerCase().includes(q)) ||
          (prod.product_size && prod.product_size.toLowerCase().includes(q)) ||
          (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
          (prod.pcd && prod.pcd.toLowerCase().includes(q)) ||
          (prod.product_code && prod.product_code.toLowerCase().includes(q));

        const matchesRing = selectedRing === 'ALL' || prod.ring === selectedRing;
        const matchesBrand = selectedBrand === 'ALL' || prod.brand === selectedBrand;

        return matchesQuery && matchesRing && matchesBrand && prod.is_active !== false;
      });

  const filteredServices = isEmptyState
    ? []
    : services.filter((srv) => {
        if (catalogTab !== 'ALL' && catalogTab !== 'SERVICES') return false;
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          srv.service_name.toLowerCase().includes(q) ||
          srv.service_code.toLowerCase().includes(q) ||
          srv.category.toLowerCase().includes(q);

        return matchesQuery && srv.is_active !== false;
      });

  const handleAddToCart = (product: ProductItem) => {
    const stockAvailable = product.stock || product.product_quantity || 0;
    if (stockAvailable <= 0) return;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (it) => it.item_type === 'PRODUCT' && it.product.id === product.id
      );

      if (existingIndex > -1) {
        const existing = prevCart[existingIndex];
        if (existing.qty + 1 > stockAvailable) {
          return prevCart;
        }
        const updated = [...prevCart];
        updated[existingIndex] = { ...existing, qty: existing.qty + 1 };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            item_type: 'PRODUCT',
            product,
            qty: 1,
            discount_per_item: 0,
          },
        ];
      }
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
      } else {
        return [
          ...prevCart,
          {
            item_type: 'SERVICE',
            product: products[0] || ({} as ProductItem),
            service,
            qty: 1,
            discount_per_item: 0,
          },
        ];
      }
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

  const handleSaveLineItem = (index: number, updatedItem: CartItem) => {
    setCart((prevCart) => {
      const copy = [...prevCart];
      copy[index] = updatedItem;
      return copy;
    });
  };

  const totals = calculateCartTotals(cart, manualDiscount, applyTax ? 11 : 0);
  const netPayable = Math.max(0, totals.grandTotal - appliedDpAmount);

  const cashTenderedVal = parseRupiahInput(cashTenderedInput);
  const changeAmount = paymentMethod === 'TUNAI' ? Math.max(0, cashTenderedVal - netPayable) : 0;

  const handleCheckoutSale = (isBon: boolean = false) => {
    if (cart.length === 0) return;
    if (!isBon && paymentMethod === 'TUNAI' && cashTenderedVal < netPayable) return;

    const invoiceNo = generateInvoiceNumber();
    const transaction = createPosTransactionRecord(
      invoiceNo,
      cart,
      customerName,
      vehiclePlate,
      vehicleModel,
      paymentMethod,
      isBon ? 0 : paymentMethod === 'TUNAI' ? cashTenderedVal : netPayable,
      cashierName,
      applyTax ? 11 : 0,
      manualDiscount,
      isBon
    );

    if (appliedDpAmount > 0) {
      transaction.notes = `${transaction.notes ? transaction.notes + ' | ' : ''}Pelunasan DP Booking Rp ${appliedDpAmount.toLocaleString()}`;
    }

    if (activeBookingSourceId && onConvertBooking) {
      onConvertBooking(activeBookingSourceId);
    }

    onCompleteSale(transaction);
    setCart([]);
    setCashTenderedInput('');
    setManualDiscount(0);
    setAppliedDpAmount(0);
    setActiveBookingSourceId(null);
  };

  const handleSaveBookingFromModal = (
    cName: string,
    cPhone: string,
    vPlate: string,
    vModel: string,
    dp: number,
    pm: PaymentMethod,
    nts?: string
  ) => {
    const bookingRecord: SalesBookingRecord = {
      id: `bk-${Date.now()}`,
      booking_number: `BK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      customer_name: cName,
      customer_phone: cPhone,
      vehicle_plate: vPlate,
      vehicle_model: vModel,
      items: [...cart],
      estimated_total: totals.grandTotal,
      dp_amount: dp,
      remaining_amount: Math.max(0, totals.grandTotal - dp),
      payment_method: pm,
      notes: nts,
      status: 'ACTIVE',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onSaveBooking?.(bookingRecord);
    setShowBookingDpModal(false);
    setCart([]);
    toast.info('Booking DP Tersimpan', `Pesanan ${bookingRecord.customer_name} berhasil disimpan dengan DP Rp ${bookingRecord.dp_amount.toLocaleString()}.`);
  };

  const handleConvertBookingToCart = (booking: SalesBookingRecord) => {
    setCart(booking.items);
    setCustomerName(booking.customer_name);
    setVehiclePlate(booking.vehicle_plate);
    setVehicleModel(booking.vehicle_model);
    setAppliedDpAmount(booking.dp_amount);
    setActiveBookingSourceId(booking.id);
  };

  const activeBookingsCount = bookings.filter((b) => b.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col lg:flex-row h-screen max-h-screen bg-slate-50 text-slate-800 overflow-hidden select-none font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Mobile Top View Switcher (Only visible on screens < lg) */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-slate-100 border-b border-slate-200 shrink-0 gap-2">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'catalog'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Katalog Produk</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'cart'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Keranjang ({cart.reduce((s, i) => s + i.qty, 0)})</span>
          {cart.length > 0 && (
            <span className="font-mono text-[10px] font-bold text-emerald-700 ml-0.5">
              {formatRupiah(totals.grandTotal)}
            </span>
          )}
        </button>
      </div>

      {/* Left Column: Catalog */}
      <div className={`flex-1 min-w-0 min-h-0 border-r border-slate-200 bg-white h-full ${mobileTab === 'cart' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
        {/* Search & Top Action Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onExitToBackoffice}
              className="p-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Kembali ke Backoffice"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Ban, Velg, Ban Dalam, Jasa (F2)..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-100 shadow-2xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookingListDrawer(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-purple-700" />
              <span>Booking DP</span>
              {activeBookingsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] font-black flex items-center justify-center">
                  {activeBookingsCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-semibold shadow-2xs">
              <Banknote className="w-3.5 h-3.5 text-emerald-700" />
              <span>Kas Laci: <b className="text-emerald-950 font-mono font-extrabold">{formatRupiah(cashInDrawer)}</b></span>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setCatalogTab('ALL')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              catalogTab === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            Semua Katalog
          </button>
          <button
            onClick={() => setCatalogTab('BAN_BARU')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              catalogTab === 'BAN_BARU' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Ban Baru</span>
          </button>
          <button
            onClick={() => setCatalogTab('VELG')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              catalogTab === 'VELG' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Velg Mobil</span>
          </button>
          <button
            onClick={() => setCatalogTab('BAN_DALAM')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              catalogTab === 'BAN_DALAM' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Ban Dalam</span>
          </button>
          <button
            onClick={() => setCatalogTab('SERVICES')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              catalogTab === 'SERVICES' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Jasa & Layanan</span>
          </button>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3.5 grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50 custom-scrollbar">
          {filteredProducts.map((p) => {
            const stockQty = p.stock || p.product_quantity || 0;
            const isOutOfStock = stockQty <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && handleAddToCart(p)}
                className={`bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col justify-between transition-all shadow-xs group ${
                  isOutOfStock
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-blue-500 hover:shadow-md cursor-pointer active:scale-98'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      p.category === 'BAN_BARU'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : p.category === 'VELG'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {(p.category || 'BAN_BARU').replace('_', ' ')}
                    </span>
                    <span className={`text-[11px] font-bold ${
                      isOutOfStock ? 'text-rose-700 font-extrabold' : stockQty < 5 ? 'text-amber-700 font-extrabold' : 'text-slate-600'
                    }`}>
                      Stok: {stockQty} unit
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {p.product_name}
                  </h3>

                  <div className="text-xs text-slate-600 mt-1 font-medium">
                    {p.category === 'BAN_BARU' && `${p.product_size || ''} | ${p.motif || ''}`}
                    {p.category === 'VELG' && `${p.ring || ''} | PCD ${p.pcd || ''} | ${p.color_finish || ''}`}
                    {p.category === 'BAN_DALAM' && `${p.product_size || p.size_ratio || ''} | ${p.valve_type || ''}`}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                    {formatRupiah(p.product_price || p.price || 0)}
                  </span>
                  <span className="p-1.5 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white transition-all shadow-2xs">
                    <Plus className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}

          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              onClick={() => handleAddServiceToCart(srv)}
              className="bg-white border border-slate-200 hover:border-cyan-500 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all shadow-xs hover:shadow-md active:scale-98 group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-300 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-cyan-700" /> JASA
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 font-semibold">{srv.service_code}</span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors line-clamp-2">
                  {srv.service_name}
                </h3>

                {srv.description && (
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">{srv.description}</p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                  {formatRupiah(srv.standard_price)}
                </span>
                <span className="p-1.5 rounded-xl bg-cyan-50 group-hover:bg-cyan-600 text-cyan-700 group-hover:text-white transition-all shadow-2xs">
                  <Plus className="w-4 h-4" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Floating Mobile Cart Bar (Sticky at bottom of catalog when items are in cart) */}
        {cart.length > 0 && (
          <div className="lg:hidden p-2.5 bg-white border-t border-slate-200 shrink-0 shadow-lg">
            <button
              type="button"
              onClick={() => setMobileTab('cart')}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm flex items-center justify-between shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-800 text-white flex items-center justify-center text-[11px] font-bold">
                  {cart.reduce((s, i) => s + i.qty, 0)}
                </span>
                <span>Buka Pembayaran</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-emerald-300 font-black">{formatRupiah(totals.grandTotal)}</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Right Column: Cart Panel */}
      <div className={`w-full lg:w-[410px] xl:w-[450px] flex-col bg-white border-t lg:border-t-0 border-slate-200 shadow-xl h-full min-h-0 ${mobileTab === 'catalog' ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
        {/* Mobile Header Bar for Cart */}
        <div className="lg:hidden p-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-bold shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Katalog</span>
          </button>
          <span className="text-xs font-bold text-slate-800">
            Keranjang Kasir ({cart.reduce((s, i) => s + i.qty, 0)} Pcs)
          </span>
        </div>

        {/* Customer / Vehicle Bar */}
        <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Informasi Kendaraan & Pelanggan</span>
            {appliedDpAmount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 font-mono">
                DP Terpasang: {formatRupiah(appliedDpAmount)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nama Pelanggan</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-In"
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-semibold shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Plat Nomor</label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                placeholder="B 1234 ABC"
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-mono font-bold shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Model Mobil</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Avanza/Innova"
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900 font-semibold shadow-2xs focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 bg-slate-50 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Store className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-700">Keranjang Kasir Kosong</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Klik ban baru, velg, ban dalam, atau layanan jasa dari katalog untuk menambahkan transaksi.</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const standardPrice = item.item_type === 'SERVICE' && item.service
                ? item.service.standard_price
                : item.product?.product_price || item.product?.price || 0;

              const activePrice = item.custom_price ?? standardPrice;
              const lineTotal = Math.max(0, (activePrice - item.discount_per_item) * item.qty);
              const displayName = item.custom_name_override || (item.item_type === 'SERVICE' && item.service ? item.service.service_name : item.product?.product_name);

              return (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-2.5 flex flex-col gap-1.5 transition-all shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          item.item_type === 'SERVICE'
                            ? 'bg-cyan-50 text-cyan-800 border border-cyan-200'
                            : item.product?.category === 'VELG'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : item.product?.category === 'BAN_DALAM'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {item.item_type === 'SERVICE' ? 'JASA' : (item.product?.category || 'BAN_BARU').replace('_', ' ')}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{displayName}</h4>
                      </div>

                      <div className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{formatRupiah(activePrice)}</span>
                        {item.discount_per_item > 0 && (
                          <span className="text-amber-700 font-bold font-mono">Disc: -{formatRupiah(item.discount_per_item)}</span>
                        )}
                        {item.custom_price && (
                          <span className="text-blue-700 text-[10px] font-bold">(Custom)</span>
                        )}
                      </div>

                      {item.note && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">Catatan: {item.note}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditLineIndex(idx)}
                      title="Edit Detail Baris (Harga/Diskon/Catatan)"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateCartQty(idx, -1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-800 font-bold transition-all cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold text-slate-900 w-6 text-center font-mono">{item.qty}</span>
                      <button
                        onClick={() => handleUpdateCartQty(idx, 1)}
                        className="w-6 h-6 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-800 font-bold transition-all cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs sm:text-sm font-black text-emerald-700 font-mono">{formatRupiah(lineTotal)}</span>
                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Hapus dari Keranjang"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Payment / Summary Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 space-y-2.5 shrink-0">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span className="font-medium">Subtotal Kotor:</span>
              <span className="font-bold text-slate-900 font-mono">{formatRupiah(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Potongan Diskon:</span>
                <span className="font-bold font-mono">-{formatRupiah(totals.discount)}</span>
              </div>
            )}
            {appliedDpAmount > 0 && (
              <div className="flex justify-between text-purple-800 font-bold">
                <span>DP Booking Sudah Dibayar:</span>
                <span className="font-mono">-{formatRupiah(appliedDpAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold pt-1.5 border-t border-slate-200">
              <span className="text-slate-900">Total Tagihan Bersih:</span>
              <span className="text-emerald-700 text-lg font-mono font-black">{formatRupiah(netPayable)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setPaymentMethod('TUNAI')}
              className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                paymentMethod === 'TUNAI' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tunai
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('TRANSFER_BCA')}
              className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                paymentMethod === 'TRANSFER_BCA' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Transfer BCA
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS')}
              className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                paymentMethod === 'QRIS' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              QRIS
            </button>
          </div>

          {paymentMethod === 'TUNAI' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cashTenderedInput ? formatRupiah(parseRupiahInput(cashTenderedInput)) : ''}
                  onChange={(e) => setCashTenderedInput(e.target.value)}
                  placeholder="Uang Tunai Diterima (Rp)"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-900 text-xs font-mono font-bold focus:outline-hidden focus:border-emerald-600 focus:bg-white shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setCashTenderedInput(String(netPayable))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-emerald-800 border border-slate-300 cursor-pointer"
                >
                  Uang Pas
                </button>
              </div>
              {cashTenderedVal > 0 && (
                <div className="flex justify-between text-xs font-bold pt-0.5">
                  <span className="text-slate-600">Kembalian:</span>
                  <span className={`font-mono text-sm ${changeAmount >= 0 ? 'text-blue-700 font-black' : 'text-rose-600'}`}>
                    {formatRupiah(changeAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setShowBookingDpModal(true)}
              disabled={cart.length === 0}
              className="py-2 px-2.5 rounded-xl bg-purple-50 border border-purple-300 text-purple-800 hover:bg-purple-100 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-purple-700" /> Simpan Booking DP
            </button>

            <button
              type="button"
              onClick={() => handleCheckoutSale(true)}
              disabled={cart.length === 0}
              className="py-2 px-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-700" /> Bayar Sbg BON
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCheckoutSale(false)}
            disabled={cart.length === 0 || (paymentMethod === 'TUNAI' && cashTenderedVal < netPayable)}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Selesaikan & Cetak Struk
          </button>
        </div>
      </div>

      <CartLineEditModal
        isOpen={editLineIndex !== null}
        item={editLineIndex !== null ? cart[editLineIndex] : null}
        itemIndex={editLineIndex}
        onClose={() => setEditLineIndex(null)}
        onSave={handleSaveLineItem}
        onRemoveItem={handleRemoveFromCart}
      />

      <BookingDpModal
        isOpen={showBookingDpModal}
        cart={cart}
        defaultCustomerName={customerName}
        defaultVehiclePlate={vehiclePlate}
        defaultVehicleModel={vehicleModel}
        onClose={() => setShowBookingDpModal(false)}
        onSaveBooking={handleSaveBookingFromModal}
      />

      <BookingListDrawer
        isOpen={showBookingListDrawer}
        bookings={bookings}
        onClose={() => setShowBookingListDrawer(false)}
        onConvertBooking={handleConvertBookingToCart}
      />
    </div>
  );
};
