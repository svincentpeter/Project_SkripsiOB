import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  X, 
  Sparkles, 
  Barcode, 
  Layers, 
  Package, 
  DollarSign, 
  AlertTriangle,
  Building2,
  Disc,
  CircleDot
} from 'lucide-react';
import { 
  CreateProductInput, 
  ItemCategory,
  StockMutation, 
  TireProduct, 
  UpdateProductInput 
} from '../../../shared/types';
import { 
  formatRupiah, 
  parseRupiahInput 
} from '../../../shared/utils/formatters';
import { 
  generateBarcodeEan13, 
  generateProductSku 
} from '../../../services/inventoryService';

interface ProductFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  productToEdit?: TireProduct | null;
  existingProducts: TireProduct[];
  existingMutations: StockMutation[];
  onClose: () => void;
  onSaveCreate: (input: CreateProductInput) => void;
  onSaveEdit: (productId: string, updates: UpdateProductInput) => void;
}

const BRANDS_BAN = ['Bridgestone', 'Accelera', 'Dunlop', 'Forceum', 'Hankook', 'GTRadial'];
const BRANDS_VELG = ['HSR', 'Enkei', 'Rays', 'Work', 'BBS', 'SSW', 'OEM'];
const BRANDS_TUBE = ['GTRadial', 'Swallow', 'Kingland', 'IRC'];
const RINGS = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18', 'R19', 'R20+'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  mode,
  productToEdit,
  existingProducts,
  onClose,
  onSaveCreate,
  onSaveEdit,
}) => {
  const [category, setCategory] = useState<ItemCategory>('BAN_BARU');
  const [brand, setBrand] = useState<string>('Bridgestone');
  const [productName, setProductName] = useState('');
  const [sizeWidth, setSizeWidth] = useState<number>(185);
  const [sizeRatio, setSizeRatio] = useState<string>('65');
  const [ring, setRing] = useState<string>('R15');
  const [motif, setMotif] = useState('');
  const [productYear, setProductYear] = useState<number>(2025);
  
  const [pcd, setPcd] = useState<string>('4x100');
  const [rimWidth, setRimWidth] = useState<number>(6.5);
  const [offsetEt, setOffsetEt] = useState<number>(38);
  const [colorFinish, setColorFinish] = useState<string>('Glossy Black');
  
  const [valveType, setValveType] = useState<string>('TR13 Karet Lurus');
  
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState<number>(750000);
  const [sellingPrice, setSellingPrice] = useState<number>(950000);
  const [stockAlert, setStockAlert] = useState<number>(5);

  const [hasInitialStock, setHasInitialStock] = useState<boolean>(false);
  const [initialQty, setInitialQty] = useState<number>(10);
  const [supplierName, setSupplierName] = useState<string>('PT Bridgestone Tire Indonesia');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (mode === 'EDIT' && productToEdit) {
      setCategory(productToEdit.category || 'BAN_BARU');
      setBrand(productToEdit.brand);
      setProductName(productToEdit.name || productToEdit.product_name);
      setSizeWidth(productToEdit.size_width || 185);
      setSizeRatio(String(productToEdit.size_ratio || '65'));
      setRing(productToEdit.ring || 'R15');
      setMotif(productToEdit.motif || productToEdit.pattern || '');
      setProductYear(Number(productToEdit.product_year) || 2025);
      setPcd(productToEdit.pcd || '4x100');
      setRimWidth(productToEdit.rim_width || 6.5);
      setOffsetEt(productToEdit.offset_et || 38);
      setColorFinish(productToEdit.color_finish || 'Glossy Black');
      setValveType(productToEdit.valve_type || 'TR13 Karet Lurus');
      setProductCode(productToEdit.product_code);
      setBarcode(productToEdit.barcode || '');
      setCostPrice(productToEdit.product_cost || productToEdit.cost_price || 0);
      setSellingPrice(productToEdit.product_price || productToEdit.price || 0);
      setStockAlert(productToEdit.product_stock_alert ?? productToEdit.min_stock ?? 5);
      setHasInitialStock(false);
    } else {
      setCategory('BAN_BARU');
      setBrand('Bridgestone');
      setProductName('');
      setSizeWidth(185);
      setSizeRatio('65');
      setRing('R15');
      setMotif('');
      setProductYear(2025);
      setPcd('4x100');
      setRimWidth(6.5);
      setOffsetEt(38);
      setColorFinish('Glossy Black');
      setValveType('TR13 Karet Lurus');
      setCostPrice(750000);
      setSellingPrice(950000);
      setStockAlert(5);
      setHasInitialStock(false);
      setInitialQty(10);
      setSupplierName('PT Bridgestone Tire Indonesia');
      
      const existingBarcodes = existingProducts.map((p) => p.barcode).filter(Boolean);
      setBarcode(generateBarcodeEan13(existingBarcodes));
    }
  }, [isOpen, mode, productToEdit, existingProducts]);

  useEffect(() => {
    if (mode === 'CREATE') {
      if (category === 'BAN_BARU') {
        const autoName = `${brand} ${motif ? motif.trim() + ' ' : ''}${sizeWidth}/${sizeRatio} ${ring}`.trim();
        setProductName(autoName);
        setProductCode(generateProductSku(brand, sizeWidth, sizeRatio, ring, motif || 'STD', 'BAN_BARU'));
      } else if (category === 'VELG') {
        const autoName = `Velg ${brand} ${motif ? motif.trim() + ' ' : ''}${ring} ${pcd} (Set 4 Pcs)`.trim();
        setProductName(autoName);
        setProductCode(generateProductSku(brand, undefined, undefined, ring, motif || 'STD', 'VELG', pcd));
      } else if (category === 'BAN_DALAM') {
        const autoName = `Ban Dalam ${brand} ${sizeRatio || '14'} (${valveType})`.trim();
        setProductName(autoName);
        setProductCode(generateProductSku(brand, undefined, sizeRatio || '14', ring, motif || 'STD', 'BAN_DALAM'));
      }
    }
  }, [category, brand, sizeWidth, sizeRatio, ring, motif, pcd, rimWidth, colorFinish, valveType, mode]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!productName.trim()) {
      setErrorMsg('Nama produk wajib diisi.');
      return;
    }

    if (costPrice <= 0 || sellingPrice <= 0) {
      setErrorMsg('Harga modal (HPP) dan harga jual retail harus lebih besar dari 0.');
      return;
    }

    if (sellingPrice < costPrice) {
      setErrorMsg('Peringatan: Harga jual tidak boleh lebih rendah dari harga modal HPP.');
      return;
    }

    if (mode === 'CREATE') {
      const input: CreateProductInput = {
        category,
        brand,
        product_name: productName.trim(),
        product_code: productCode.trim(),
        barcode: barcode.trim(),
        size_width: category === 'BAN_BARU' ? sizeWidth : undefined,
        size_ratio: category === 'BAN_BARU' ? sizeRatio : category === 'BAN_DALAM' ? sizeRatio : undefined,
        ring: category !== 'BAN_DALAM' ? ring : undefined,
        motif: motif.trim() || '-',
        product_year: category === 'BAN_BARU' ? productYear : undefined,
        pcd: category === 'VELG' ? pcd : undefined,
        rim_width: category === 'VELG' ? rimWidth : undefined,
        offset_et: category === 'VELG' ? offsetEt : undefined,
        color_finish: category === 'VELG' ? colorFinish : undefined,
        valve_type: category === 'BAN_DALAM' ? valveType : undefined,
        product_cost: costPrice,
        product_price: sellingPrice,
        product_stock_alert: stockAlert,
        initial_stock: hasInitialStock ? initialQty : 0,
        supplier_name: hasInitialStock ? supplierName : undefined,
      };
      onSaveCreate(input);
    } else if (mode === 'EDIT' && productToEdit) {
      const updates: UpdateProductInput = {
        category,
        brand,
        product_name: productName.trim(),
        product_code: productCode.trim(),
        barcode: barcode.trim(),
        size_width: category === 'BAN_BARU' ? sizeWidth : undefined,
        size_ratio: category === 'BAN_BARU' ? sizeRatio : category === 'BAN_DALAM' ? sizeRatio : undefined,
        ring: category !== 'BAN_DALAM' ? ring : undefined,
        motif: motif.trim() || '-',
        product_year: category === 'BAN_BARU' ? productYear : undefined,
        pcd: category === 'VELG' ? pcd : undefined,
        rim_width: category === 'VELG' ? rimWidth : undefined,
        offset_et: category === 'VELG' ? offsetEt : undefined,
        color_finish: category === 'VELG' ? colorFinish : undefined,
        valve_type: category === 'BAN_DALAM' ? valveType : undefined,
        product_cost: costPrice,
        product_price: sellingPrice,
        product_stock_alert: stockAlert,
      };
      onSaveEdit(productToEdit.id, updates);
    }
  };

  const currentBrandOptions = category === 'VELG' ? BRANDS_VELG : category === 'BAN_DALAM' ? BRANDS_TUBE : BRANDS_BAN;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${mode === 'CREATE' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-600/20 text-amber-400'}`}>
              {mode === 'CREATE' ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {mode === 'CREATE' ? 'Tambah Master Produk Baru' : 'Edit Data Master Produk'}
              </h2>
              <p className="text-xs text-slate-400">
                {mode === 'CREATE' ? 'Pilih kategori (Ban Baru, Velg, atau Ban Dalam) dan isi spesifikasi teknis.' : `Mengubah informasi: ${productToEdit?.product_name}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'CREATE' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Kategori Produk
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => { setCategory('BAN_BARU'); setBrand('Bridgestone'); }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    category === 'BAN_BARU'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-900/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Disc className="w-4 h-4" />
                  Ban Baru
                </button>
                <button
                  type="button"
                  onClick={() => { setCategory('VELG'); setBrand('HSR'); }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    category === 'VELG'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-md shadow-amber-900/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <CircleDot className="w-4 h-4" />
                  Velg Mobil
                </button>
                <button
                  type="button"
                  onClick={() => { setCategory('BAN_DALAM'); setBrand('GTRadial'); }}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all ${
                    category === 'BAN_DALAM'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-900/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Ban Dalam
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Merek / Pabrikan</label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-hidden focus:border-blue-500"
              >
                {currentBrandOptions.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nama Pola / Motif / Model</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder={category === 'VELG' ? 'e.g. Myth01 / RPF1' : category === 'BAN_DALAM' ? 'e.g. Butyl Heavy Duty' : 'e.g. Turanza T005A'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          {category === 'BAN_BARU' && (
            <div className="p-4 bg-slate-850 border border-slate-700/60 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Disc className="w-4 h-4" /> Spesifikasi Ban Baru
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lebar (mm)</label>
                  <input
                    type="number"
                    value={sizeWidth}
                    onChange={(e) => setSizeWidth(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Rasio (%)</label>
                  <input
                    type="text"
                    value={sizeRatio}
                    onChange={(e) => setSizeRatio(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Diameter Ring</label>
                  <select
                    value={ring}
                    onChange={(e) => setRing(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {RINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tahun DOT</label>
                  <input
                    type="number"
                    value={productYear}
                    onChange={(e) => setProductYear(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {category === 'VELG' && (
            <div className="p-4 bg-slate-850 border border-slate-700/60 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <CircleDot className="w-4 h-4" /> Spesifikasi Velg Mobil
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Diameter Ring</label>
                  <select
                    value={ring}
                    onChange={(e) => setRing(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    {RINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">PCD Lubang Baut</label>
                  <input
                    type="text"
                    value={pcd}
                    onChange={(e) => setPcd(e.target.value)}
                    placeholder="e.g. 4x100 / 5x114.3"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lebar Velg (Inch)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rimWidth}
                    onChange={(e) => setRimWidth(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Offset / ET</label>
                  <input
                    type="number"
                    value={offsetEt}
                    onChange={(e) => setOffsetEt(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Warna / Finishing</label>
                <input
                  type="text"
                  value={colorFinish}
                  onChange={(e) => setColorFinish(e.target.value)}
                  placeholder="e.g. Semi Matte Bronze / Silver Machined"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>
            </div>
          )}

          {category === 'BAN_DALAM' && (
            <div className="p-4 bg-slate-850 border border-slate-700/60 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4" /> Spesifikasi Ban Dalam
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Ukuran / Kompatibilitas</label>
                  <input
                    type="text"
                    value={sizeRatio}
                    onChange={(e) => setSizeRatio(e.target.value)}
                    placeholder="e.g. 175/185-14 / 7.50-16"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tipe Pentil (Valve)</label>
                  <input
                    type="text"
                    value={valveType}
                    onChange={(e) => setValveType(e.target.value)}
                    placeholder="e.g. TR13 / TR218A"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Nama Lengkap Tampilan</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Kode SKU</label>
              <input
                type="text"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Barcode EAN-13</label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-xs focus:outline-hidden focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => {
                    const existingBarcodes = existingProducts.map((p) => p.barcode).filter(Boolean);
                    setBarcode(generateBarcodeEan13(existingBarcodes));
                  }}
                  title="Generate Barcode Baru"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
                >
                  <Barcode className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Harga Modal / HPP (Rp)</label>
              <input
                type="text"
                value={formatRupiah(costPrice)}
                onChange={(e) => setCostPrice(parseRupiahInput(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Harga Jual Retail (Rp)</label>
              <input
                type="text"
                value={formatRupiah(sellingPrice)}
                onChange={(e) => setSellingPrice(parseRupiahInput(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-emerald-400 text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Batas Peringatan Stok</label>
              <input
                type="number"
                value={stockAlert}
                onChange={(e) => setStockAlert(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm"
              />
            </div>
          </div>

          {mode === 'CREATE' && (
            <div className="pt-4 border-t border-slate-800">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasInitialStock}
                  onChange={(e) => setHasInitialStock(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-300">
                  Input Stok Awal Sekarang (Otomatis membentuk batch FIFO & Jurnal Persediaan)
                </span>
              </label>

              {hasInitialStock && (
                <div className="mt-4 p-4 bg-slate-850 border border-slate-700/80 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Jumlah Unit Masuk</label>
                    <input
                      type="number"
                      value={initialQty}
                      onChange={(e) => setInitialQty(Number(e.target.value))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Distributor / Supplier Pengadaan</label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {mode === 'CREATE' ? 'Simpan Master Produk' : 'Perbarui Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
