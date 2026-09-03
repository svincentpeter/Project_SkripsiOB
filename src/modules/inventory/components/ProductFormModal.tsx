import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  X, 
  Sparkles, 
  Barcode, 
  Tag, 
  Layers, 
  Package, 
  DollarSign, 
  AlertTriangle,
  Building2
} from 'lucide-react';
import { 
  CreateProductInput, 
  StockMutation, 
  TireBrand, 
  TireProduct, 
  TireRing, 
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

const BRANDS: TireBrand[] = [
  'Bridgestone',
  'Accelera',
  'Dunlop',
  'Forceum',
  'Hankook',
  'GTRadial',
];

const RINGS: TireRing[] = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18+'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  mode,
  productToEdit,
  existingProducts,
  existingMutations,
  onClose,
  onSaveCreate,
  onSaveEdit,
}) => {
  // Form States
  const [brand, setBrand] = useState<TireBrand>('Bridgestone');
  const [productName, setProductName] = useState('');
  const [sizeWidth, setSizeWidth] = useState<number>(185);
  const [sizeRatio, setSizeRatio] = useState<string>('65');
  const [ring, setRing] = useState<TireRing>('R15');
  const [motif, setMotif] = useState('');
  const [productYear, setProductYear] = useState<number>(2025);
  const [productCode, setProductCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [costPrice, setCostPrice] = useState<number>(750000);
  const [sellingPrice, setSellingPrice] = useState<number>(950000);
  const [stockAlert, setStockAlert] = useState<number>(5);

  // Initial stock fields (Only for CREATE)
  const [hasInitialStock, setHasInitialStock] = useState<boolean>(false);
  const [initialQty, setInitialQty] = useState<number>(10);
  const [supplierName, setSupplierName] = useState<string>('PT Bridgestone Tire Indonesia');

  // Error message
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Synchronize state when opening or switching productToEdit
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (mode === 'EDIT' && productToEdit) {
      setBrand(productToEdit.brand);
      setProductName(productToEdit.name || productToEdit.product_name);
      setSizeWidth(productToEdit.size_width || 185);
      setSizeRatio(String(productToEdit.size_ratio || '65'));
      setRing(productToEdit.ring);
      setMotif(productToEdit.motif || productToEdit.pattern || '');
      setProductYear(Number(productToEdit.product_year) || 2025);
      setProductCode(productToEdit.product_code || '');
      setBarcode(productToEdit.barcode || '');
      setCostPrice(productToEdit.cost_price || productToEdit.product_cost || 0);
      setSellingPrice(productToEdit.product_price || productToEdit.price || 0);
      setStockAlert(productToEdit.product_stock_alert || productToEdit.min_stock || 5);
      setHasInitialStock(false);
    } else {
      // Reset for CREATE
      setBrand('Bridgestone');
      setProductName('Bridgestone Turanza T005A');
      setSizeWidth(185);
      setSizeRatio('65');
      setRing('R15');
      setMotif('Turanza T005A Premium Quiet');
      setProductYear(2025);
      setCostPrice(800000);
      setSellingPrice(1050000);
      setStockAlert(5);
      setHasInitialStock(false);
      setInitialQty(10);
      setSupplierName('PT Bridgestone Tire Indonesia');

      // Generate initial SKU & Barcode
      const existingBarcodes = existingProducts.map((p) => p.barcode).filter(Boolean);
      const generatedSku = generateProductSku('Bridgestone', 185, '65', 'R15', 'Turanza');
      const generatedBarcode = generateBarcodeEan13(existingBarcodes);
      setProductCode(generatedSku);
      setBarcode(generatedBarcode);
    }
  }, [isOpen, mode, productToEdit]);

  if (!isOpen) return null;

  // Handle Auto-Generate Button Click
  const handleAutoGenerate = () => {
    const generatedSku = generateProductSku(brand, sizeWidth, sizeRatio, ring, motif || productName);
    const existingBarcodes = existingProducts
      .filter((p) => mode === 'CREATE' || p.id !== productToEdit?.id)
      .map((p) => p.barcode)
      .filter(Boolean);
    const generatedBarcode = generateBarcodeEan13(existingBarcodes);

    setProductCode(generatedSku);
    setBarcode(generatedBarcode);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = productName.trim();
    if (!trimmedName) {
      setErrorMsg('Nama produk ban wajib diisi.');
      return;
    }

    if (sellingPrice <= 0) {
      setErrorMsg('Harga jual retail harus lebih besar dari 0.');
      return;
    }

    if (costPrice <= 0) {
      setErrorMsg('Harga beli (HPP) harus lebih besar dari 0.');
      return;
    }

    const finalSku = productCode.trim() || generateProductSku(brand, sizeWidth, sizeRatio, ring, motif || trimmedName);
    const existingBarcodes = existingProducts
      .filter((p) => mode === 'CREATE' || p.id !== productToEdit?.id)
      .map((p) => p.barcode)
      .filter(Boolean);
    const finalBarcode = barcode.trim() || generateBarcodeEan13(existingBarcodes);

    if (mode === 'CREATE') {
      const input: CreateProductInput = {
        brand,
        product_name: trimmedName,
        product_code: finalSku,
        barcode: finalBarcode,
        size_width: Number(sizeWidth),
        size_ratio: String(sizeRatio),
        ring,
        motif: motif.trim() || trimmedName,
        product_year: productYear,
        product_cost: costPrice,
        product_price: sellingPrice,
        product_stock_alert: stockAlert,
        initial_stock: hasInitialStock ? Number(initialQty) : 0,
        supplier_name: hasInitialStock ? supplierName.trim() : undefined,
      };

      onSaveCreate(input);
    } else if (mode === 'EDIT' && productToEdit) {
      const updates: UpdateProductInput = {
        brand,
        product_name: trimmedName,
        product_code: finalSku,
        barcode: finalBarcode,
        size_width: Number(sizeWidth),
        size_ratio: String(sizeRatio),
        ring,
        motif: motif.trim() || trimmedName,
        product_year: productYear,
        product_cost: costPrice,
        product_price: sellingPrice,
        product_stock_alert: stockAlert,
      };

      onSaveEdit(productToEdit.id, updates);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              {mode === 'CREATE' ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                {mode === 'CREATE' ? 'Tambah Master Produk Ban Baru' : 'Edit Spesifikasi Produk Ban'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {mode === 'CREATE'
                  ? 'Daftarkan SKU ban baru dengan format cerdas, barcode otomatis, dan opsi stok awal.'
                  : 'Perbarui informasi spesifikasi ukuran, harga jual retail, atau batas stok minimum.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 text-xs font-bold block mb-1">Merek / Brand:</label>
              <select
                value={brand}
                onChange={(e) => {
                  const b = e.target.value as TireBrand;
                  setBrand(b);
                  setSupplierName(`PT ${b} Tire Indonesia`);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              >
                {BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-slate-600 text-xs font-bold block mb-1">Nama Lengkap Seri Ban:</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Bridgestone Turanza T005A"
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Tire Dimensions & Specifications */}
          <div className="bg-slate-50/70 border border-slate-200 p-3.5 rounded-2xl space-y-3">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
              Spesifikasi Dimensi & Tapak Ban:
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-600 text-[11px] font-semibold block mb-1">Lebar (mm):</label>
                <input
                  type="number"
                  value={sizeWidth}
                  onChange={(e) => setSizeWidth(Number(e.target.value))}
                  min={135}
                  max={335}
                  step={5}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 text-[11px] font-semibold block mb-1">Aspek Rasio (%):</label>
                <input
                  type="text"
                  value={sizeRatio}
                  onChange={(e) => setSizeRatio(e.target.value)}
                  placeholder="65"
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-600 text-[11px] font-semibold block mb-1">Ukuran Ring:</label>
                <select
                  value={ring}
                  onChange={(e) => setRing(e.target.value as TireRing)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                >
                  {RINGS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-600 text-[11px] font-semibold block mb-1">Tahun DOT:</label>
                <input
                  type="number"
                  value={productYear}
                  onChange={(e) => setProductYear(Number(e.target.value))}
                  min={2020}
                  max={2030}
                  required
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 text-[11px] font-semibold block mb-1">Pola Kembangan / Motif Tapak:</label>
              <input
                type="text"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                placeholder="Contoh: Turanza T005A Premium Quiet / Asymmetric Grip"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Autonumeric SKU & Barcode Generator */}
          <div className="bg-indigo-50/50 border border-indigo-200/80 p-3.5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-indigo-600" />
                <span>Kode Produk SKU & Barcode Scanner</span>
              </span>

              <button
                type="button"
                onClick={handleAutoGenerate}
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Generate Ulang Otomatis</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-indigo-900 text-[11px] font-semibold block mb-1">
                  Kode SKU Produk (Smart Code):
                </label>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value.toUpperCase())}
                  placeholder="BRI-1856515-TUR"
                  required
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-indigo-900 text-[11px] font-semibold block mb-1">
                  Barcode EAN-13 (GS1 Indonesia):
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="8993001018515"
                  required
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Pricing & Stock Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 text-xs font-bold block mb-1">Harga Beli / HPP Modal:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={costPrice.toLocaleString('id-ID')}
                  onChange={(e) => setCostPrice(parseRupiahInput(e.target.value))}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 text-xs font-bold block mb-1">Harga Jual Retail:</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={sellingPrice.toLocaleString('id-ID')}
                  onChange={(e) => setSellingPrice(parseRupiahInput(e.target.value))}
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-black text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-600 text-xs font-bold block mb-1">Batas Minimum Peringatan:</label>
              <input
                type="number"
                value={stockAlert}
                onChange={(e) => setStockAlert(Number(e.target.value))}
                min={1}
                max={50}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 5: Initial Stock Switch (Only for CREATE) */}
          {mode === 'CREATE' && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    Input Saldo Fisik Stok Awal Sekarang?
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Jika diaktifkan, sistem akan langsung membuatkan Batch FIFO ke-1 dan mutasi MASUK perdana.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasInitialStock}
                    onChange={(e) => setHasInitialStock(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {hasInitialStock && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 animate-in fade-in">
                  <div>
                    <label className="text-slate-600 text-[11px] font-semibold block mb-1">
                      Jumlah Stok Awal Fisik (pcs):
                    </label>
                    <input
                      type="number"
                      value={initialQty}
                      onChange={(e) => setInitialQty(Number(e.target.value))}
                      min={1}
                      max={500}
                      required={hasInitialStock}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-slate-600 text-[11px] font-semibold block mb-1">
                      Nama Supplier / Distributor:
                    </label>
                    <input
                      type="text"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="PT Bridgestone Tire Indonesia"
                      required={hasInitialStock}
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              {mode === 'CREATE' ? <Plus className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              <span>{mode === 'CREATE' ? 'Simpan Produk Ban Baru' : 'Perbarui Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
