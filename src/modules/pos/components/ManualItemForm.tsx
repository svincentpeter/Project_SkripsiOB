import React, { useState } from 'react';
import {
  Wrench,
  Disc,
  CircleDot,
  Droplets,
  Package,
  Plus,
  Minus,
  Calculator,
  AlertCircle,
  Sparkles,
  Check,
} from 'lucide-react';
import { CartItem, ProductItem, ServiceMasterItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { useToast } from '../../../shared/components';

export type ManualItemType =
  | 'jasa'
  | 'ban_baru'
  | 'ban_bekas'
  | 'velg'
  | 'oli_pelumas'
  | 'ban_dalam';

interface ManualItemFormProps {
  onAddToCart: (item: CartItem) => void;
}

export const ManualItemForm: React.FC<ManualItemFormProps> = ({ onAddToCart }) => {
  const toast = useToast();

  const [itemType, setItemType] = useState<ManualItemType>('jasa');

  // Fields for Ban
  const [banWidth, setBanWidth] = useState('185');
  const [banRatio, setBanRatio] = useState('65');
  const [banRing, setBanRing] = useState('15');
  const [banBrand, setBanBrand] = useState('Bridgestone');
  const [banMotif, setBanMotif] = useState('Ecopia EP150');
  const [banCondition, setBanCondition] = useState('BARU');

  // Fields for Velg
  const [velgBrand, setVelgBrand] = useState('Standar OEM');
  const [velgRing, setVelgRing] = useState('15');
  const [velgPcd, setVelgPcd] = useState('4x100');
  const [velgColor, setVelgColor] = useState('Silver Polish');

  // Fields for Jasa / Oli / Ban Dalam
  const [itemName, setItemName] = useState('');

  // Financials
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [costPriceInput, setCostPriceInput] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const sellPrice = parseRupiahInput(sellPriceInput);
  const costPrice = parseRupiahInput(costPriceInput);

  // Profit calculations
  const totalSales = sellPrice * qty;
  const totalCost = costPrice * qty;
  const grossProfit = totalSales - totalCost;
  const profitMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '0.0';

  const isBan = itemType === 'ban_baru' || itemType === 'ban_bekas';
  const isVelg = itemType === 'velg';

  const getComputedName = (): string => {
    if (isBan) {
      const size = `${banWidth}/${banRatio} R${banRing}`;
      const prefix = itemType === 'ban_bekas' ? '(Bekas/Copotan) ' : '';
      return `${prefix}${banBrand} ${banMotif} ${size} [${banCondition}]`.trim();
    }
    if (isVelg) {
      return `Velg ${velgBrand} R${velgRing} PCD ${velgPcd} (${velgColor})`.trim();
    }
    if (itemType === 'oli_pelumas') {
      return itemName.trim() || 'Oli / Pelumas Khusus';
    }
    if (itemType === 'ban_dalam') {
      return itemName.trim() || 'Ban Dalam Non-Katalog';
    }
    return itemName.trim() || 'Jasa Servis Non-Katalog';
  };

  const handleQuickSelectPreset = (name: string, sell: number, cost: number) => {
    setItemName(name);
    setSellPriceInput(String(sell));
    setCostPriceInput(String(cost));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (sellPrice <= 0) {
      toast.warning('Harga Jual Kosong', 'Harap masukkan nominal harga jual (minimal Rp 1).');
      return;
    }

    if (!isBan && !isVelg && !itemName.trim()) {
      toast.warning('Nama Item Kosong', 'Harap isi nama barang atau jasa yang diinput.');
      return;
    }

    const computedName = getComputedName();
    const itemId = `manual-${Date.now()}`;

    if (itemType === 'jasa') {
      const manualService: ServiceMasterItem = {
        id: itemId,
        service_code: `SRV-MANUAL-${Math.floor(100 + Math.random() * 900)}`,
        service_name: computedName,
        category: 'JASA_MANUAL',
        standard_price: sellPrice,
        cost_price: costPrice,
        is_active: true,
        description: notes.trim() || 'Input Manual Jasa Kasir',
      };

      const cartItem: CartItem = {
        item_type: 'SERVICE',
        product: {
          id: `syn-${itemId}`,
          name: computedName,
          category: 'SERVICES' as any,
          price: sellPrice,
          cost: costPrice,
          stock: 999,
          product_name: computedName,
          product_price: sellPrice,
          product_cost: costPrice,
        } as ProductItem,
        service: manualService,
        qty,
        discount_per_item: 0,
        custom_price: sellPrice,
        custom_hpp: costPrice,
        custom_name_override: computedName,
        note: notes.trim() || undefined,
        is_manual: true,
      };

      onAddToCart(cartItem);
    } else {
      const categoryMap = {
        ban_baru: 'BAN_BARU',
        ban_bekas: 'BAN_BARU',
        velg: 'VELG',
        oli_pelumas: 'OLI_PELUMAS',
        ban_dalam: 'BAN_DALAM',
      };

      const manualProduct: ProductItem = {
        id: itemId,
        product_code: `PRD-MANUAL-${Math.floor(100 + Math.random() * 900)}`,
        barcode: `899${Date.now()}`.slice(0, 13),
        name: computedName,
        product_name: computedName,
        category: categoryMap[itemType] as any,
        condition_code: 'BARU',
        price: sellPrice,
        product_price: sellPrice,
        cost: costPrice,
        cost_price: costPrice,
        product_cost: costPrice,
        stock: 999,
        product_quantity: 999,
        product_stock_alert: 5,
        min_stock: 5,
        product_size: isBan ? `${banWidth}/${banRatio} R${banRing}` : isVelg ? `R${velgRing}` : undefined,
        ring: isBan ? `R${banRing}` : isVelg ? `R${velgRing}` : undefined,
        brand: isBan ? banBrand : isVelg ? velgBrand : undefined,
        motif: isBan ? banMotif : undefined,
        pcd: isVelg ? velgPcd : undefined,
        color_finish: isVelg ? velgColor : undefined,
        is_active: true,
      };

      const cartItem: CartItem = {
        item_type: 'PRODUCT',
        product: manualProduct,
        qty,
        discount_per_item: 0,
        custom_price: sellPrice,
        custom_hpp: costPrice,
        custom_name_override: computedName,
        note: notes.trim() || undefined,
        is_manual: true,
      };

      onAddToCart(cartItem);
    }

    toast.success(
      'Item Manual Ditambahkan',
      `${computedName} (${qty} unit) berhasil dimasukkan ke keranjang kasir.`
    );

    // Reset input form
    if (!isBan && !isVelg) {
      setItemName('');
    }
    setSellPriceInput('');
    setCostPriceInput('');
    setNotes('');
    setQty(1);
  };

  return (
    <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-4">
      {/* Header Form */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Form Input Manual Transaksi Kasir
            </h3>
            <p className="text-[11px] text-slate-500">
              Gunakan jika ada barang titipan, copotan, atau jasa dadakan yang belum terdaftar di master produk.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 self-start sm:self-auto">
          Standar SAK EMKM Ready
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Pilih Tipe Item */}
        <div>
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-1.5">
            1. Pilih Kategori Item
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
            <button
              type="button"
              onClick={() => setItemType('jasa')}
              className={`p-2 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                itemType === 'jasa'
                  ? 'bg-cyan-50 border-cyan-500 text-cyan-900 shadow-xs ring-2 ring-cyan-400/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Wrench className="w-4 h-4 text-cyan-600" />
              <span>Jasa Servis</span>
            </button>

            <button
              type="button"
              onClick={() => setItemType('ban_baru')}
              className={`p-2 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                itemType === 'ban_baru'
                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-xs ring-2 ring-blue-400/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Disc className="w-4 h-4 text-blue-600" />
              <span>Ban Baru</span>
            </button>

            <button
              type="button"
              onClick={() => setItemType('ban_bekas')}
              className={`p-2 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                itemType === 'ban_bekas'
                  ? 'bg-slate-100 border-slate-500 text-slate-900 shadow-xs ring-2 ring-slate-400/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CircleDot className="w-4 h-4 text-slate-600" />
              <span>Ban Bekas</span>
            </button>

            <button
              type="button"
              onClick={() => setItemType('velg')}
              className={`p-2 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                itemType === 'velg'
                  ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-xs ring-2 ring-amber-400/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <CircleDot className="w-4 h-4 text-amber-600" />
              <span>Velg Mobil</span>
            </button>

            <button
              type="button"
              onClick={() => setItemType('oli_pelumas')}
              className={`p-2 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                itemType === 'oli_pelumas'
                  ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-xs ring-2 ring-orange-400/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Droplets className="w-4 h-4 text-orange-600" />
              <span>Oli / Pelumas</span>
            </button>

            <button
              type="button"
              onClick={() => setItemType('ban_dalam')}
              className={`p-2 rounded-xl border text-xs font-extrabold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                itemType === 'ban_dalam'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-2 ring-emerald-400/20'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Ban Dalam</span>
            </button>
          </div>
        </div>

        {/* Step 2: Spesifikasi Khusus Berdasarkan Kategori */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700 block">
            2. Spesifikasi &amp; Detail Item
          </label>

          {isBan && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Lebar (mm)</label>
                  <input
                    type="number"
                    value={banWidth}
                    onChange={(e) => setBanWidth(e.target.value)}
                    placeholder="185"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Rasio (%)</label>
                  <input
                    type="number"
                    value={banRatio}
                    onChange={(e) => setBanRatio(e.target.value)}
                    placeholder="65"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Ring (Inch)</label>
                  <input
                    type="number"
                    value={banRing}
                    onChange={(e) => setBanRing(e.target.value)}
                    placeholder="15"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Merek Ban</label>
                  <input
                    type="text"
                    value={banBrand}
                    onChange={(e) => setBanBrand(e.target.value)}
                    placeholder="Bridgestone / Dunlop / GT"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Motif / Kembangan</label>
                  <input
                    type="text"
                    value={banMotif}
                    onChange={(e) => setBanMotif(e.target.value)}
                    placeholder="Ecopia EP150"
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Kondisi</label>
                  <select
                    value={banCondition}
                    onChange={(e) => setBanCondition(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                  >
                    <option value="BARU">BARU (Gress Pabrik)</option>
                    <option value="ORS">Orisinil (ORS 90%+)</option>
                    <option value="SEREP">Serep / Cadangan</option>
                    <option value="PRESS">Press / Tambalan Tubeless</option>
                    <option value="VULKANISIR">Vulkanisir</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {isVelg && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Merk / Tipe Velg</label>
                <input
                  type="text"
                  value={velgBrand}
                  onChange={(e) => setVelgBrand(e.target.value)}
                  placeholder="Standar OEM / HSR / Enkei"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Ring</label>
                <input
                  type="text"
                  value={velgRing}
                  onChange={(e) => setVelgRing(e.target.value)}
                  placeholder="15 / 16 / 17"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">PCD Baut</label>
                <input
                  type="text"
                  value={velgPcd}
                  onChange={(e) => setVelgPcd(e.target.value)}
                  placeholder="4x100 / 5x114.3"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">Warna / Finishing</label>
                <input
                  type="text"
                  value={velgColor}
                  onChange={(e) => setVelgColor(e.target.value)}
                  placeholder="Silver / Bronze / Gloss Black"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-600 focus:outline-none"
                />
              </div>
            </div>
          )}

          {!isBan && !isVelg && (
            <div className="space-y-2">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                  Nama {itemType === 'jasa' ? 'Layanan Jasa' : itemType === 'oli_pelumas' ? 'Oli / Pelumas' : 'Barang'}
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder={
                    itemType === 'jasa'
                      ? 'Cth: Tambal Tip Top Khusus Ban Tubeless / Press Velg'
                      : itemType === 'oli_pelumas'
                      ? 'Cth: Shell Helix HX6 10W-40 (1 Liter)'
                      : 'Cth: Ban Dalam Swallow 700-14 Pentil Panjang'
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Preset cepat untuk jasa */}
              {itemType === 'jasa' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
                  <button
                    type="button"
                    onClick={() => handleQuickSelectPreset('Tambal Tubeless Tip Top Dingin', 35000, 10000)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Tambal Tip Top (Rp 35rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelectPreset('Ongkos Press Velg Retak/Penyok', 150000, 75000)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Press Velg (Rp 150rb)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickSelectPreset('Jasa Pasang & Balancing Velg Luar', 50000, 15000)}
                    className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Pasang Velg Luar (Rp 50rb)
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Live Preview Nama Item */}
          <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between">
            <span className="text-slate-600 font-medium">Tampilan di Nota:</span>
            <span className="font-extrabold text-blue-900 font-mono truncate max-w-[65%]">
              {getComputedName()}
            </span>
          </div>
        </div>

        {/* Step 3: Harga Jual & HPP (Standar SAK EMKM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-black text-slate-800 block mb-1">
              Harga Jual Satuan (Rp) <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">Rp</span>
              <input
                type="text"
                value={sellPriceInput ? formatRupiah(sellPrice).replace('Rp ', '') : ''}
                onChange={(e) => setSellPriceInput(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-black focus:bg-white focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-black text-slate-800">
                Harga Modal / HPP (Rp)
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">(SAK EMKM)</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">Rp</span>
              <input
                type="text"
                value={costPriceInput ? formatRupiah(costPrice).replace('Rp ', '') : ''}
                onChange={(e) => setCostPriceInput(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-black focus:bg-white focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-800 block mb-1">
              Jumlah (Qty)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900"
              />
              <button
                type="button"
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Step 4: Catatan & Profit Margin Preview Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              Catatan Khusus Baris (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cth: Titipan pelanggan Pak Agus / Garansi 1 pekan"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          {/* Profit Preview */}
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                <Calculator className="w-3 h-3 text-emerald-600" />
                Kalkulasi Laba Kotor
              </span>
              <div className="font-mono font-black text-slate-800 text-sm">
                Laba: <span className={grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}>{formatRupiah(grossProfit)}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold">Margin Keuntungan</span>
              <div className={`font-mono font-black text-sm ${parseFloat(profitMargin) >= 20 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {profitMargin}%
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Masukkan Item Manual ke Keranjang ({formatRupiah(totalSales)})</span>
        </button>
      </form>
    </div>
  );
};
