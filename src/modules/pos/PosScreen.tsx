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
  Store
} from 'lucide-react';
import { CartItem, PaymentMethod, PosTransaction, TireBrand, TireProduct, TireRing } from '../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../shared/utils/formatters';
import { MoneyInput } from '../../shared/components/MoneyInput';
import { generateInvoiceNumber, createPosTransactionRecord } from '../../services/posService';

interface PosScreenProps {
  products: TireProduct[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  onCompleteSale: (transaction: PosTransaction) => void;
  cashierName: string;
  cashInDrawer: number;
  timeString: string;
  onExitToBackoffice: () => void;
  onOpenWireframeModal: () => void;
  isEmptyState?: boolean;
}

export const PosScreen: React.FC<PosScreenProps> = ({
  products,
  cart,
  setCart,
  onCompleteSale,
  cashierName,
  cashInDrawer,
  timeString,
  onExitToBackoffice,
  isEmptyState = false,
}) => {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRing, setSelectedRing] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');

  // Customer & Vehicle metadata
  const [customerName, setCustomerName] = useState('Pelanggan Walk-In');
  const [vehiclePlate, setVehiclePlate] = useState('B 1984 SKZ');
  const [vehicleModel, setVehicleModel] = useState('Avanza');

  // Payment tender state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [applyTax, setApplyTax] = useState<boolean>(false);
  const [manualDiscount, setManualDiscount] = useState<number>(0);

  // Supervisor PIN Modal
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [supervisorItemIndex, setSupervisorItemIndex] = useState<number | null>(null);
  const [supervisorPin, setSupervisorPin] = useState('');
  const [supervisorPriceInput, setSupervisorPriceInput] = useState('');
  const [supervisorError, setSupervisorError] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus shortcut (F2)
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

  // Filtered Products
  const filteredProducts = isEmptyState
    ? []
    : products.filter((prod) => {
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (prod.name && prod.name.toLowerCase().includes(q)) ||
          (prod.product_name && prod.product_name.toLowerCase().includes(q)) ||
          (prod.size && prod.size.toLowerCase().includes(q)) ||
          (prod.product_size && prod.product_size.toLowerCase().includes(q)) ||
          (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
          (prod.product_code && prod.product_code.toLowerCase().includes(q));

        const matchesRing = selectedRing === 'ALL' || prod.ring === selectedRing;
        const matchesBrand = selectedBrand === 'ALL' || prod.brand === selectedBrand;

        return matchesQuery && matchesRing && matchesBrand;
      });

  // Cart operations
  const addToCart = (product: TireProduct) => {
    const availableStock = product.product_quantity ?? product.stock ?? 0;
    if (availableStock <= 0) {
      alert(`Stok ban ${product.product_name ?? product.name} sedang kosong.`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const currentQty = prev[existingIndex].qty;
        if (currentQty >= availableStock) {
          alert(`Maksimal stok tersedia hanya ${availableStock} pcs.`);
          return prev;
        }
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          qty: currentQty + 1,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            qty: 1,
            discount_per_item: 0,
          },
        ];
      }
    });
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const item = cart[index];
    const availableStock = item.product.product_quantity ?? item.product.stock ?? 0;
    if (newQty > availableStock) {
      alert(`Maksimal stok tersedia ${availableStock} pcs.`);
      return;
    }

    setCart((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        qty: newQty,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => {
    const price = item.custom_price ?? (item.product.product_price ?? item.product.price ?? 0);
    return acc + price * item.qty - (item.discount_per_item ?? 0) * item.qty;
  }, 0);

  const taxAmount = applyTax ? Math.round((subtotal - manualDiscount) * 0.11) : 0;
  const grandTotal = Math.max(0, subtotal - manualDiscount + taxAmount);

  const cashTenderedNum = parseRupiahInput(cashTenderedInput);
  const changeAmount = paymentMethod === 'TUNAI' ? Math.max(0, cashTenderedNum - grandTotal) : 0;
  const isCashInsufficient = paymentMethod === 'TUNAI' && cashTenderedNum > 0 && cashTenderedNum < grandTotal;

  // Checkout Handler
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Keranjang kasir masih kosong! Pilih ban terlebih dahulu.');
      return;
    }

    if (paymentMethod === 'TUNAI' && cashTenderedNum < grandTotal) {
      alert('Nominal uang tunai yang diterima kurang dari total tagihan.');
      return;
    }

    const invoiceNo = generateInvoiceNumber();
    const finalAmountPaid = paymentMethod === 'TUNAI' ? cashTenderedNum : grandTotal;

    const txRecord = createPosTransactionRecord(
      invoiceNo,
      cart,
      customerName,
      vehiclePlate,
      vehicleModel,
      paymentMethod,
      finalAmountPaid,
      cashierName,
      applyTax ? 11 : 0,
      manualDiscount
    );

    onCompleteSale(txRecord);
  };

  // Supervisor PIN confirmation
  const handleConfirmSupervisor = () => {
    if (supervisorPin !== '1234') {
      setSupervisorError('PIN Supervisor salah! Hubungi Kepala Toko.');
      return;
    }

    const newPriceNum = parseRupiahInput(supervisorPriceInput);
    if (newPriceNum <= 0) {
      setSupervisorError('Harga baru tidak valid.');
      return;
    }

    if (supervisorItemIndex !== null && cart[supervisorItemIndex]) {
      setCart((prev) => {
        const updated = [...prev];
        updated[supervisorItemIndex] = {
          ...updated[supervisorItemIndex],
          custom_price: newPriceNum,
          override_reason: 'Disetujui Supervisor',
          adjusted_by: 'Kepala Toko',
        };
        return updated;
      });
    }

    setShowSupervisorModal(false);
    setSupervisorPin('');
    setSupervisorPriceInput('');
    setSupervisorError('');
    setSupervisorItemIndex(null);
  };

  const rings: TireRing[] = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18+'];
  const brands: TireBrand[] = ['Bridgestone', 'Dunlop', 'Accelera', 'Forceum', 'Hankook'];

  return (
    <div className="h-screen w-full flex flex-col bg-[#F8FAFC] text-slate-800 font-['Plus_Jakarta_Sans',sans-serif] select-none overflow-hidden">
      
      {/* =======================================================================
          TOP BAR KASIR (TENANG, ELEGAN, TIDAK MENCOLOK)
          ======================================================================= */}
      <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-30">
        {/* Left: Brand Identity & Subtitle */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            OB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 tracking-tight">Omah Ban Cabang 3</span>
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                Kasir POS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Info Kasir, Kas Laci, Jam */}
        <div className="hidden md:flex items-center gap-4 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Kasir:</span>
            <span className="font-semibold text-slate-800">{cashierName}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-400">Kas Laci:</span>
            <span className="font-semibold text-slate-800">{formatRupiah(cashInDrawer)}</span>
          </div>

          <span className="text-slate-300">•</span>

          <div className="flex items-center gap-1 font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{timeString}</span>
          </div>
        </div>

        {/* Right: Tombol Kembali ke Backoffice */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExitToBackoffice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-200"
            title="Kembali ke Dashboard Manajemen & Laporan"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ke Menu Backoffice</span>
          </button>
        </div>
      </header>

      {/* =======================================================================
          MAIN WORKSPACE: 2 PANEL LENGKAP & RAPI
          ======================================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* ---------------------------------------------------------------------
            PANEL KIRI (62%): KATALOG BAN & FILTER RING/MEREK
            --------------------------------------------------------------------- */}
        <section className="w-full lg:w-[62%] flex flex-col border-r border-slate-200 bg-[#F8FAFC] overflow-hidden">
          
          {/* Filter & Search Bar */}
          <div className="p-4 bg-white border-b border-slate-200 space-y-2.5">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari ukuran ban ('185/65 R15'), merek, pola... [F2]"
                className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 focus:border-slate-400 focus:bg-white rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Diameter Velg (Ring) */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-xs">
              <span className="text-[11px] font-medium text-slate-400 shrink-0">Ring:</span>
              <button
                onClick={() => setSelectedRing('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                  selectedRing === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua
              </button>
              {rings.map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRing(r)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                    selectedRing === r
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Filter Merek Ban */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-0.5 text-xs">
              <span className="text-[11px] font-medium text-slate-400 shrink-0">Merek:</span>
              <button
                onClick={() => setSelectedBrand('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                  selectedBrand === 'ALL'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Semua
              </button>
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBrand(b)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-colors ${
                    selectedBrand === b
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {filteredProducts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Store className="w-10 h-10 text-slate-300" />
                <span className="text-xs font-medium">Tidak ada ban yang cocok dengan filter</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedRing('ALL');
                    setSelectedBrand('ALL');
                  }}
                  className="text-xs text-slate-700 hover:underline font-semibold"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map((prod) => {
                  const stock = prod.product_quantity ?? prod.stock ?? 0;
                  const isLow = stock < (prod.product_stock_alert ?? prod.min_stock ?? 5);
                  const isOutOfStock = stock <= 0;
                  const price = prod.product_price ?? prod.price ?? 0;

                  return (
                    <div
                      key={prod.id}
                      onClick={() => !isOutOfStock && addToCart(prod)}
                      className={`bg-white rounded-xl border p-4 flex flex-col justify-between transition-all cursor-pointer shadow-2xs ${
                        isOutOfStock
                          ? 'opacity-40 border-slate-200 bg-slate-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-slate-400 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Size & Brand Badge */}
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-base text-slate-900 tracking-tight">
                            {prod.size || prod.product_size}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200/60">
                            {prod.brand}
                          </span>
                        </div>

                        <p className="text-xs font-medium text-slate-600 truncate">
                          {prod.name || prod.product_name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {prod.motif || prod.pattern}
                        </p>
                      </div>

                      {/* Stock & Price */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm font-mono text-slate-900 block">
                            {formatRupiah(price)}
                          </span>
                          <span className={`text-[10px] font-mono font-medium ${isLow ? 'text-amber-600' : 'text-slate-400'}`}>
                            Stok: {stock} pcs {isLow && !isOutOfStock && '(Menipis)'}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-slate-700 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                          + Pilih
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ---------------------------------------------------------------------
            PANEL KANAN (38%): DOKET KASIR & TENDER (WARNA NETRAL ELEGAN)
            --------------------------------------------------------------------- */}
        <section className="w-full lg:w-[38%] flex flex-col bg-white border-l border-slate-200 overflow-hidden">
          
          {/* Header Doket */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">Pesanan Pelanggan</span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-semibold bg-slate-200 text-slate-700">
                  {cart.reduce((s, i) => s + i.qty, 0)} Ban
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Kosongkan semua item di keranjang?')) setCart([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* Customer & Vehicle Info Inputs */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Plat Mobil</label>
                <div className="relative flex items-center">
                  <Car className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    placeholder="B 1984 SKZ"
                    className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 focus:border-slate-400 rounded-lg text-xs font-mono font-semibold text-slate-800 uppercase outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Tipe Mobil</label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="Avanza / Brio / ..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-slate-400 rounded-lg text-xs font-medium text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Quick Vehicle Chips */}
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pt-0.5">
              {[
                { plate: 'B 1984 SKZ', model: 'Avanza' },
                { plate: 'B 2314 BRT', model: 'Brio' },
                { plate: 'B 8899 BOS', model: 'Fortuner' },
                { plate: 'D 1455 XYZ', model: 'Innova' },
              ].map((vp, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setVehiclePlate(vp.plate);
                    setVehicleModel(vp.model);
                  }}
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-[10px] shrink-0 font-medium transition-colors"
                >
                  {vp.plate} ({vp.model})
                </button>
              ))}
            </div>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 p-6 text-center">
                <span className="text-xs font-medium text-slate-500">Keranjang kasir masih kosong</span>
                <span className="text-[11px] text-slate-400">Pilih ban dari katalog di sebelah kiri</span>
              </div>
            ) : (
              cart.map((item, idx) => {
                const fallbackPrice = item.product.product_price ?? item.product.price ?? 0;
                const unitPrice = item.custom_price ?? fallbackPrice;
                const rowSubtotal = unitPrice * item.qty - (item.discount_per_item ?? 0) * item.qty;

                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900">
                            {item.product.size || item.product.product_size}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {item.product.brand}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 block truncate">
                          {item.product.name || item.product.product_name}
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 text-xs">
                      {/* Stepper Quantity */}
                      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(idx, item.qty - 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold font-mono text-slate-900 text-xs">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQuantity(idx, item.qty + 1)}
                          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-100 font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Unit Price & Row Subtotal */}
                      <div className="text-right">
                        <button
                          onClick={() => {
                            setSupervisorItemIndex(idx);
                            setSupervisorPriceInput(String(unitPrice));
                            setShowSupervisorModal(true);
                          }}
                          className="text-[10px] text-slate-500 hover:text-slate-900 underline font-mono block"
                          title="Ubah harga dengan PIN Supervisor"
                        >
                          @{formatRupiah(unitPrice)}
                        </button>
                        <div className="font-bold text-slate-900 font-mono text-xs">
                          {formatRupiah(rowSubtotal)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Billing & Tender Area */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
            {/* Subtotal, Diskon, PPN */}
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold font-mono text-slate-800">{formatRupiah(subtotal)}</span>
              </div>

              {manualDiscount > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>Diskon:</span>
                  <span className="font-mono">-{formatRupiah(manualDiscount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <span>PPN 11%</span>
                </label>
                <span className="font-mono font-medium text-slate-700">{formatRupiah(taxAmount)}</span>
              </div>
            </div>

            {/* Grand Total Box (Netral & Mewah) */}
            <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Total Tagihan</span>
                <span className="text-xl font-bold font-mono tracking-tight text-white leading-none">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Metode</span>
                <span className="text-xs font-semibold text-slate-200">
                  {paymentMethod}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
              {[
                { id: 'TUNAI' as PaymentMethod, label: 'Tunai', icon: Banknote },
                { id: 'QRIS' as PaymentMethod, label: 'QRIS BCA', icon: QrCode },
                { id: 'TRANSFER_BCA' as PaymentMethod, label: 'Transfer', icon: Building2 },
              ].map((pm) => {
                const Icon = pm.icon;
                const isSelected = paymentMethod === pm.id;
                return (
                  <button
                    key={pm.id}
                    onClick={() => {
                      setPaymentMethod(pm.id);
                      if (pm.id !== 'TUNAI') setCashTenderedInput(String(grandTotal));
                    }}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{pm.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Cash Tender Buttons (If TUNAI) */}
            {paymentMethod === 'TUNAI' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-0.5 text-xs">
                  <button
                    onClick={() => setCashTenderedInput(String(grandTotal))}
                    className="px-2.5 py-1 rounded-md bg-white text-slate-800 border border-slate-300 font-semibold text-[11px] shrink-0 hover:bg-slate-100"
                  >
                    Uang Pas
                  </button>
                  <button
                    onClick={() => setCashTenderedInput(String(grandTotal + 50000))}
                    className="px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-200 font-medium text-[11px] shrink-0 hover:bg-slate-100"
                  >
                    +50rb
                  </button>
                  <button
                    onClick={() => setCashTenderedInput('500000')}
                    className="px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-200 font-mono font-medium text-[11px] shrink-0 hover:bg-slate-100"
                  >
                    500rb
                  </button>
                  <button
                    onClick={() => setCashTenderedInput('1000000')}
                    className="px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-200 font-mono font-medium text-[11px] shrink-0 hover:bg-slate-100"
                  >
                    1 Juta
                  </button>
                  <button
                    onClick={() => setCashTenderedInput('2000000')}
                    className="px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-200 font-mono font-medium text-[11px] shrink-0 hover:bg-slate-100"
                  >
                    2 Juta
                  </button>
                </div>

                {/* Cash Input & Change Amount */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Diterima (Rp)</label>
                    <input
                      type="text"
                      value={cashTenderedInput}
                      onChange={(e) => setCashTenderedInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="0"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 focus:border-slate-400 rounded-lg font-mono font-bold text-slate-900 text-xs outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">Kembalian (Rp)</label>
                    <div className={`px-2.5 py-1.5 rounded-lg border font-mono font-bold text-xs ${
                      isCashInsufficient
                        ? 'bg-rose-50 border-rose-200 text-rose-600'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                      {isCashInsufficient ? 'Uang Kurang' : formatRupiah(changeAmount)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Execute Sale Button */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCashInsufficient}
              className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 ${
                cart.length === 0 || isCashInsufficient
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>PROSES & CETAK STRUK 80MM</span>
            </button>
          </div>
        </section>
      </div>

      {/* =======================================================================
          MODAL: SUPERVISOR PIN OVERRIDE HARGA
          ======================================================================= */}
      {showSupervisorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Otorisasi Supervisor</h3>
                  <p className="text-[11px] text-slate-400">Ubah harga unit khusus Cabang 3</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSupervisorModal(false);
                  setSupervisorError('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {supervisorError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{supervisorError}</span>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-medium text-slate-600 block mb-1">Harga Baru (Rp)</label>
                <input
                  type="text"
                  value={supervisorPriceInput}
                  onChange={(e) => setSupervisorPriceInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Masukkan harga satuan baru"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:border-slate-400 outline-none"
                />
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">PIN Supervisor (Default: 1234)</label>
                <input
                  type="password"
                  maxLength={6}
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-center text-slate-900 tracking-widest focus:bg-white focus:border-slate-400 outline-none text-base"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setShowSupervisorModal(false)}
                className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSupervisor}
                className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
