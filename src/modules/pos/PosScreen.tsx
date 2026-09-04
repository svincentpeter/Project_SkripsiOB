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
  CreditCard
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
  const isPaymentSufficient = paymentMethod === 'TUNAI' ? cashTenderedVal >= netPayable : true;

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
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 overflow-hidden select-none">
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-800 bg-slate-950/80">
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onExitToBackoffice}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Kembali ke Backoffice"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari Ban, Velg, Ban Dalam, Jasa (F2)..."
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBookingListDrawer(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-950/80 border border-purple-800/60 text-purple-300 hover:bg-purple-900/80 text-xs font-bold transition-all"
            >
              <Bookmark className="w-4 h-4 text-purple-400" />
              <span>Booking DP</span>
              {activeBookingsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-black flex items-center justify-center">
                  {activeBookingsCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-850 border border-slate-800 text-xs text-slate-400">
              <Banknote className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kas Laci: <b className="text-white">{formatRupiah(cashInDrawer)}</b></span>
            </div>
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setCatalogTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              catalogTab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            Semua Katalog
          </button>
          <button
            onClick={() => setCatalogTab('BAN_BARU')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              catalogTab === 'BAN_BARU' ? 'bg-blue-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            <Disc className="w-3.5 h-3.5" />
            <span>Ban Baru</span>
          </button>
          <button
            onClick={() => setCatalogTab('VELG')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              catalogTab === 'VELG' ? 'bg-amber-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>Velg Mobil</span>
          </button>
          <button
            onClick={() => setCatalogTab('BAN_DALAM')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              catalogTab === 'BAN_DALAM' ? 'bg-emerald-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Ban Dalam</span>
          </button>
          <button
            onClick={() => setCatalogTab('SERVICES')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              catalogTab === 'SERVICES' ? 'bg-cyan-600 text-white' : 'bg-slate-850 text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Jasa & Layanan</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((p) => {
            const stockQty = p.stock || p.product_quantity || 0;
            const isOutOfStock = stockQty <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && handleAddToCart(p)}
                className={`bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between transition-all group ${
                  isOutOfStock
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-950/20 cursor-pointer active:scale-98'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                      p.category === 'BAN_BARU'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800/40'
                        : p.category === 'VELG'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                        : 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                    }`}>
                      {(p.category || 'BAN_BARU').replace('_', ' ')}
                    </span>
                    <span className={`text-[11px] font-bold ${
                      isOutOfStock ? 'text-red-400' : stockQty < 5 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      Stok: {stockQty}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                    {p.product_name}
                  </h3>

                  <div className="text-[11px] text-slate-400 mt-1">
                    {p.category === 'BAN_BARU' && `${p.product_size || ''} | ${p.motif || ''}`}
                    {p.category === 'VELG' && `${p.ring || ''} | PCD ${p.pcd || ''} | ${p.color_finish || ''}`}
                    {p.category === 'BAN_DALAM' && `${p.product_size || p.size_ratio || ''} | ${p.valve_type || ''}`}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                    {formatRupiah(p.product_price || p.price || 0)}
                  </span>
                  <span className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-blue-600 text-slate-400 group-hover:text-white transition-all">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}

          {filteredServices.map((srv) => (
            <div
              key={srv.id}
              onClick={() => handleAddServiceToCart(srv)}
              className="bg-slate-900 border border-slate-800 hover:border-cyan-500/60 rounded-2xl p-3.5 flex flex-col justify-between cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-950/20 active:scale-98 group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800/40 flex items-center gap-1">
                    <Wrench className="w-3 h-3" /> JASA
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">{srv.service_code}</span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                  {srv.service_name}
                </h3>

                {srv.description && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{srv.description}</p>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-extrabold text-emerald-400">
                  {formatRupiah(srv.standard_price)}
                </span>
                <span className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-cyan-600 text-slate-400 group-hover:text-white transition-all">
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full lg:w-[420px] xl:w-[460px] flex flex-col bg-slate-900 border-t lg:border-t-0 border-slate-800 shadow-2xl h-full">
        <div className="p-4 border-b border-slate-800 bg-slate-850 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Informasi Kendaraan & Pelanggan</span>
            {appliedDpAmount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800/50">
                DP Terpasang: {formatRupiah(appliedDpAmount)}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nama Pelanggan"
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              placeholder="Plat Nomor"
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
            />
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Model Mobil"
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cart.length === 0 ? (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Store className="w-10 h-10 mx-auto text-slate-700" />
              <p className="text-xs font-semibold text-slate-400">Keranjang Kasir Kosong</p>
              <p className="text-[11px] text-slate-600">Klik produk / layanan dari katalog untuk menambahkan.</p>
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
                  className="bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col gap-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-xs ${
                          item.item_type === 'SERVICE'
                            ? 'bg-cyan-950 text-cyan-400'
                            : item.product?.category === 'VELG'
                            ? 'bg-amber-950 text-amber-400'
                            : item.product?.category === 'BAN_DALAM'
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-blue-950 text-blue-400'
                        }`}>
                          {item.item_type === 'SERVICE' ? 'JASA' : (item.product?.category || 'BAN_BARU').replace('_', ' ')}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{formatRupiah(activePrice)}</span>
                        {item.discount_per_item > 0 && (
                          <span className="text-amber-400 font-semibold">Disc: -{formatRupiah(item.discount_per_item)}</span>
                        )}
                        {item.custom_price && (
                          <span className="text-blue-400 text-[10px] font-semibold">(Custom)</span>
                        )}
                      </div>

                      {item.note && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5">Catatan: {item.note}</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditLineIndex(idx)}
                      title="Edit Detail Baris (Harga/Diskon/Catatan)"
                      className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateCartQty(idx, -1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-extrabold text-white w-6 text-center">{item.qty}</span>
                      <button
                        onClick={() => handleUpdateCartQty(idx, 1)}
                        className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-400">{formatRupiah(lineTotal)}</span>
                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-slate-800"
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

        <div className="p-4 bg-slate-850 border-t border-slate-800 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal Kotor:</span>
              <span className="font-semibold text-white">{formatRupiah(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Potongan Diskon:</span>
                <span className="font-semibold">-{formatRupiah(totals.discount)}</span>
              </div>
            )}
            {appliedDpAmount > 0 && (
              <div className="flex justify-between text-purple-400 font-bold">
                <span>DP Booking Sudah Dibayar:</span>
                <span>-{formatRupiah(appliedDpAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold pt-1 border-t border-slate-800">
              <span className="text-white">Total Tagihan Bersih:</span>
              <span className="text-emerald-400 text-base">{formatRupiah(netPayable)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('TUNAI')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === 'TUNAI' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Tunai
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('TRANSFER_BCA')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === 'TRANSFER_BCA' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
              }`}
            >
              Transfer BCA
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('QRIS')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                paymentMethod === 'QRIS' ? 'bg-cyan-600 text-white shadow-xs' : 'bg-slate-800 text-slate-400'
              }`}
            >
              QRIS
            </button>
          </div>

          {paymentMethod === 'TUNAI' && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cashTenderedInput ? formatRupiah(parseRupiahInput(cashTenderedInput)) : ''}
                  onChange={(e) => setCashTenderedInput(e.target.value)}
                  placeholder="Uang Tunai Diterima (Rp)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setCashTenderedInput(String(netPayable))}
                  className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-emerald-400"
                >
                  Uang Pas
                </button>
              </div>
              {cashTenderedVal > 0 && (
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-slate-400">Kembalian:</span>
                  <span className={changeAmount >= 0 ? 'text-blue-400' : 'text-red-400'}>
                    {formatRupiah(changeAmount)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowBookingDpModal(true)}
              disabled={cart.length === 0}
              className="py-2.5 px-3 rounded-xl bg-purple-950/90 border border-purple-800/80 text-purple-300 hover:bg-purple-900 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Bookmark className="w-4 h-4" /> Simpan Booking DP
            </button>

            <button
              type="button"
              onClick={() => handleCheckoutSale(true)}
              disabled={cart.length === 0}
              className="py-2.5 px-3 rounded-xl bg-amber-950/90 border border-amber-800/80 text-amber-300 hover:bg-amber-900 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-4 h-4" /> Bayar Sbg BON
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCheckoutSale(false)}
            disabled={cart.length === 0 || (paymentMethod === 'TUNAI' && cashTenderedVal < netPayable)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 transition-all"
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
