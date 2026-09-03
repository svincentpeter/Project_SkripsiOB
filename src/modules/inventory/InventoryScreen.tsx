import React, { useState } from 'react';
import { 
  Package, 
  Search, 
  ClipboardList, 
  AlertTriangle, 
  ArrowDownLeft, 
  History, 
  Plus, 
  Edit3,
  Power,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Barcode,
  Truck
} from 'lucide-react';
import { 
  CreateProductInput, 
  GoodsReceiptInput, 
  PosTransaction, 
  StockMutation, 
  TireBrand, 
  TireProduct, 
  TireRing, 
  UpdateProductInput 
} from '../../shared/types';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';
import { 
  calculateInventoryValuation, 
  canSafelyDeleteProduct 
} from '../../services/inventoryService';
import { 
  GoodsReceiptModal, 
  ProductFormModal, 
  StockCardDrawer, 
  StockOpnameModal 
} from './components';

interface InventoryScreenProps {
  products: TireProduct[];
  mutations: StockMutation[];
  transactions?: PosTransaction[];
  onCreateProduct?: (input: CreateProductInput) => void;
  onUpdateProduct?: (productId: string, updates: UpdateProductInput) => void;
  onGoodsReceipt?: (input: GoodsReceiptInput) => void;
  onDeleteOrDeactivateProduct?: (productId: string) => void;
  onUpdateProductStock: (updatedProducts: TireProduct[], newMutations: StockMutation[]) => void;
  isEmptyState?: boolean;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  products,
  mutations,
  transactions = [],
  onCreateProduct,
  onUpdateProduct,
  onGoodsReceipt,
  onDeleteOrDeactivateProduct,
  onUpdateProductStock,
  isEmptyState = false,
}) => {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedRing, setSelectedRing] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'INACTIVE'>('ALL');

  // Modal / Drawer states
  const [selectedTireForCard, setSelectedTireForCard] = useState<TireProduct | null>(null);
  const [showOpnameModal, setShowOpnameModal] = useState<boolean>(false);
  const [showProductFormModal, setShowProductFormModal] = useState<boolean>(false);
  const [productFormMode, setProductFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [productToEdit, setProductToEdit] = useState<TireProduct | null>(null);
  const [showGoodsReceiptModal, setShowGoodsReceiptModal] = useState<boolean>(false);
  const [preselectedRestockProduct, setPreselectedRestockProduct] = useState<TireProduct | null>(null);

  // KPIs
  const valuation = calculateInventoryValuation(products);

  // Filter products
  const filteredProducts = isEmptyState
    ? []
    : products.filter((p) => {
        const matchesBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;
        const matchesRing = selectedRing === 'ALL' || p.ring === selectedRing;
        
        const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
        let matchesStock = true;
        if (stockFilter === 'LOW') {
          matchesStock = p.stock > 0 && p.stock < minAlert;
        } else if (stockFilter === 'OUT') {
          matchesStock = p.stock <= 0;
        } else if (stockFilter === 'INACTIVE') {
          matchesStock = p.is_active === false;
        }

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.product_name && p.product_name.toLowerCase().includes(q)) ||
          (p.product_size && p.product_size.toLowerCase().includes(q)) ||
          (p.product_code && p.product_code.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.includes(q)) ||
          (p.pattern && p.pattern.toLowerCase().includes(q)) ||
          (p.motif && p.motif.toLowerCase().includes(q));

        return matchesBrand && matchesRing && matchesStock && matchesQuery;
      });

  // Handlers
  const handleOpenCreateProduct = () => {
    setProductFormMode('CREATE');
    setProductToEdit(null);
    setShowProductFormModal(true);
  };

  const handleOpenEditProduct = (product: TireProduct) => {
    setProductFormMode('EDIT');
    setProductToEdit(product);
    setShowProductFormModal(true);
  };

  const handleOpenRestock = (product?: TireProduct) => {
    setPreselectedRestockProduct(product || null);
    setShowGoodsReceiptModal(true);
  };

  const handleDeleteClick = (product: TireProduct) => {
    const check = canSafelyDeleteProduct(product, mutations, transactions);
    if (!check.canDelete) {
      const confirmDeactivate = window.confirm(
        `${check.reason}\n\nApakah Anda ingin MENONAKTIFKAN ban ini (${product.name}) agar tidak muncul di kasir POS?`
      );
      if (confirmDeactivate && onDeleteOrDeactivateProduct) {
        onDeleteOrDeactivateProduct(product.id);
      }
    } else {
      const confirmPermanent = window.confirm(
        `Produk "${product.name}" belum memiliki mutasi aktif dan saldo fisik 0.\n\nApakah Anda yakin ingin MENGHAPUS PERMANEN master ban ini?`
      );
      if (confirmPermanent && onDeleteOrDeactivateProduct) {
        onDeleteOrDeactivateProduct(product.id);
      }
    }
  };

  const brands: TireBrand[] = ['Bridgestone', 'Accelera', 'Dunlop', 'Forceum', 'Hankook', 'GTRadial'];
  const rings: TireRing[] = ['R13', 'R14', 'R15', 'R16', 'R17', 'R18+'];

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      {/* Top Header & Overview */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Master Inventori & Kartu Stok Cabang 3
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen stok ban baru, restock penerimaan barang (GRN), kartu stok ber-running balance, dan opname fisik.
          </p>
        </div>

        {/* Action buttons: Tambah Ban Baru, Restock GRN, Stock Opname */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleOpenCreateProduct}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Ban Baru</span>
          </button>

          <button
            onClick={() => handleOpenRestock()}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-xs"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Penerimaan Barang (GRN)</span>
          </button>

          <button
            onClick={() => setShowOpnameModal(true)}
            className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-2xs"
          >
            <ClipboardList className="w-4 h-4 text-indigo-600" />
            <span>Stock Opname Fisik</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-bold block">Total Fisik Ban Gudang</span>
            <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">{valuation.totalPcs} pcs</span>
          </div>
          <span className="text-xs bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-700 font-mono font-bold">
            {products.length} SKU
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-bold block">Valuasi Persediaan (HPP)</span>
            <span className="text-xl font-black text-indigo-700 font-mono mt-0.5 block">
              {formatRupiah(valuation.totalValuationHpp)}
            </span>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold">
            Modal FIFO
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-bold block">Estimasi Nilai Jual Retail</span>
            <span className="text-xl font-black text-emerald-700 font-mono mt-0.5 block">
              {formatRupiah(valuation.totalValuationJual)}
            </span>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
            Omzet Ritel
          </span>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs text-slate-500 font-bold block">Stok Menipis / Kritis</span>
            <span className={`text-xl font-black font-mono mt-0.5 block ${
              valuation.lowStockCount > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-400'
            }`}>
              {valuation.lowStockCount} SKU
            </span>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            valuation.lowStockCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500'
          }`}>
            &lt; Min Alert
          </span>
        </div>
      </div>

      {/* Multi-Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="flex-1 min-w-[280px] relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU (BRI-1856515), barcode (899...), nama ban, ukuran, atau motif..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Stock status filter buttons */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                stockFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({products.length})
            </button>
            <button
              onClick={() => setStockFilter('LOW')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                stockFilter === 'LOW'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Kritis ({valuation.lowStockCount})
            </button>
            <button
              onClick={() => setStockFilter('OUT')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                stockFilter === 'OUT'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Habis ({valuation.outOfStockCount})
            </button>
            <button
              onClick={() => setStockFilter('INACTIVE')}
              className={`px-3 py-2 rounded-xl font-bold transition-all ${
                stockFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Nonaktif ({products.filter((p) => p.is_active === false).length})
            </button>
          </div>
        </div>

        {/* Brand and Ring Quick filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 text-[11px] mr-1 font-bold">Merek:</span>
            <button
              onClick={() => setSelectedBrand('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedBrand === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBrand(b)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedBrand === b ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-slate-400 text-[11px] mr-1 font-bold">Ring:</span>
            <button
              onClick={() => setSelectedRing('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                selectedRing === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Semua
            </button>
            {rings.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRing(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                  selectedRing === r ? 'bg-slate-800 text-white' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200 font-bold">
              <tr>
                <th className="py-3.5 px-4">Kode SKU & Barcode</th>
                <th className="py-3.5 px-4">Nama Produk & Tapak</th>
                <th className="py-3.5 px-4">Ukuran & Ring</th>
                <th className="py-3.5 px-4">Tahun DOT</th>
                <th className="py-3.5 px-4 text-center">Sisa Stok</th>
                <th className="py-3.5 px-4 text-right">Harga Modal (HPP)</th>
                <th className="py-3.5 px-4 text-right">Harga Jual Retail</th>
                <th className="py-3.5 px-4 text-center">Aksi Manajemen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">Tidak ada data ban yang sesuai filter</p>
                    <p className="text-xs text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau reset filter di atas.</p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
                  const isLow = p.stock < minAlert && p.stock > 0;
                  const isOut = p.stock <= 0;
                  const isInactive = p.is_active === false;

                  return (
                    <tr 
                      key={p.id} 
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isInactive ? 'bg-slate-50/50 opacity-70' : ''
                      }`}
                    >
                      {/* SKU & Barcode */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-indigo-700 text-xs">
                          {p.product_code || 'SKU'}
                        </div>
                        <div className="font-mono text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Barcode className="w-3 h-3 text-slate-400" />
                          <span>{p.barcode}</span>
                        </div>
                      </td>

                      {/* Name & Motif */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="font-extrabold text-slate-900 text-xs">
                            {p.name || p.product_name}
                          </div>
                          {isInactive && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[9px] font-bold">
                              Nonaktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs mt-0.5">
                          {p.motif || p.pattern}
                        </div>
                      </td>

                      {/* Size & Ring */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-800">{p.product_size}</span>
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold font-mono">
                          {p.ring}
                        </span>
                      </td>

                      {/* Condition & DOT */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            {p.condition_code || 'BARU'}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px] font-semibold">{p.product_year}</span>
                        </div>
                      </td>

                      {/* Stock & Batch Count */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isOut ? 'bg-slate-400' : isLow ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                              }`}
                            />
                            <span className={isOut ? 'text-slate-400' : isLow ? 'text-rose-600 font-black' : 'text-slate-900 font-bold'}>
                              {p.stock} pcs
                            </span>
                          </div>
                          {p.batches && p.batches.length > 0 && (
                            <span className="text-[10px] text-indigo-600 font-mono mt-0.5">
                              {p.batches.filter((b) => b.remaining_qty > 0).length} batch aktif
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                        {formatRupiah(p.cost_price || p.product_cost || 0)}
                      </td>

                      {/* Retail Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700">
                        {formatRupiah(p.product_price || p.price || 0)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Stock Card */}
                          <button
                            onClick={() => setSelectedTireForCard(p)}
                            title="Buka Kartu Stok & Lapisan FIFO"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded-lg transition-colors shadow-2xs"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Restock */}
                          <button
                            onClick={() => handleOpenRestock(p)}
                            title="Restock Penerimaan Barang (GRN)"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg transition-colors shadow-2xs"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Product */}
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            title="Edit Spesifikasi & Harga"
                            className="p-1.5 bg-slate-50 hover:bg-slate-700 text-slate-600 hover:text-white border border-slate-200 rounded-lg transition-colors shadow-2xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Deactivate / Delete */}
                          <button
                            onClick={() => handleDeleteClick(p)}
                            title={p.is_active === false ? 'Hapus / Aktifkan' : 'Nonaktifkan Ban'}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-lg transition-colors shadow-2xs"
                          >
                            {p.stock <= 0 && (!p.batches || p.batches.length === 0) ? (
                              <Trash2 className="w-3.5 h-3.5" />
                            ) : (
                              <Power className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================
          MODAL 1: KARTU STOK & FIFO BATCH DRAWER
          ========================================================= */}
      {selectedTireForCard && (
        <StockCardDrawer
          product={selectedTireForCard}
          mutations={mutations}
          onClose={() => setSelectedTireForCard(null)}
          onOpenRestock={(prod) => handleOpenRestock(prod)}
        />
      )}

      {/* =========================================================
          MODAL 2: FORM TAMBAH / EDIT MASTER BAN
          ========================================================= */}
      <ProductFormModal
        isOpen={showProductFormModal}
        mode={productFormMode}
        productToEdit={productToEdit}
        existingProducts={products}
        existingMutations={mutations}
        onClose={() => {
          setShowProductFormModal(false);
          setProductToEdit(null);
        }}
        onSaveCreate={(input) => {
          if (onCreateProduct) {
            onCreateProduct(input);
          }
        }}
        onSaveEdit={(productId, updates) => {
          if (onUpdateProduct) {
            onUpdateProduct(productId, updates);
          }
        }}
      />

      {/* =========================================================
          MODAL 3: PENERIMAAN BARANG RESTOCK (GRN)
          ========================================================= */}
      <GoodsReceiptModal
        isOpen={showGoodsReceiptModal}
        preselectedProduct={preselectedRestockProduct}
        products={products}
        existingMutations={mutations}
        onClose={() => {
          setShowGoodsReceiptModal(false);
          setPreselectedRestockProduct(null);
        }}
        onSubmitReceipt={(input) => {
          if (onGoodsReceipt) {
            onGoodsReceipt(input);
          }
        }}
      />

      {/* =========================================================
          MODAL 4: STOCK OPNAME FISIK
          ========================================================= */}
      <StockOpnameModal
        isOpen={showOpnameModal}
        products={products}
        existingMutations={mutations}
        onClose={() => setShowOpnameModal(false)}
        onSaveOpname={(updatedProducts, newMutations) => {
          onUpdateProductStock(updatedProducts, newMutations);
        }}
      />
    </div>
  );
};
