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
  Truck,
  Disc,
  CircleDot,
  Wrench,
  DollarSign,
  Boxes
} from 'lucide-react';
import { 
  CreateProductInput, 
  GoodsReceiptInput, 
  ItemCategory,
  PosTransaction, 
  ProductItem, 
  ServiceCategory, 
  ServiceMasterItem, 
  StockMutation, 
  SupplierItem, 
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
  ServiceFormModal, 
  SupplierFormModal, 
  StockCardDrawer, 
  StockOpnameModal 
} from './components';
import { useToast } from '../../shared/components';

interface InventoryScreenProps {
  products: ProductItem[];
  services?: ServiceMasterItem[];
  suppliers?: SupplierItem[];
  mutations: StockMutation[];
  transactions?: PosTransaction[];
  onCreateProduct?: (input: CreateProductInput) => void;
  onUpdateProduct?: (productId: string, updates: UpdateProductInput) => void;
  onGoodsReceipt?: (input: GoodsReceiptInput) => void;
  onDeleteOrDeactivateProduct?: (productId: string) => void;
  onUpdateProductStock: (updatedProducts: ProductItem[], newMutations: StockMutation[]) => void;
  onSaveService?: (serviceData: Omit<ServiceMasterItem, 'id' | 'is_active'>, serviceId?: string) => void;
  onToggleService?: (serviceId: string) => void;
  onSaveSupplier?: (supplierData: Omit<SupplierItem, 'id' | 'is_active'>, supplierId?: string) => void;
  onToggleSupplier?: (supplierId: string) => void;
  isEmptyState?: boolean;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  products,
  services = [],
  suppliers = [],
  mutations,
  transactions = [],
  onCreateProduct,
  onUpdateProduct,
  onGoodsReceipt,
  onDeleteOrDeactivateProduct,
  onUpdateProductStock,
  onSaveService,
  onToggleService,
  onSaveSupplier,
  onToggleSupplier,
  isEmptyState = false,
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'BAN_BARU' | 'VELG' | 'BAN_DALAM' | 'SERVICES' | 'SUPPLIERS'>('BAN_BARU');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedRing, setSelectedRing] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'INACTIVE'>('ALL');

  const [selectedTireForCard, setSelectedTireForCard] = useState<ProductItem | null>(null);
  const [showOpnameModal, setShowOpnameModal] = useState<boolean>(false);
  const [showProductFormModal, setShowProductFormModal] = useState<boolean>(false);
  const [productFormMode, setProductFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);
  const [showGoodsReceiptModal, setShowGoodsReceiptModal] = useState<boolean>(false);
  const [preselectedRestockProduct, setPreselectedRestockProduct] = useState<ProductItem | null>(null);

  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [serviceFormMode, setServiceFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [serviceToEdit, setServiceToEdit] = useState<ServiceMasterItem | null>(null);

  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [supplierFormMode, setSupplierFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierItem | null>(null);

  const valuation = calculateInventoryValuation(products);

  const filteredProducts = isEmptyState
    ? []
    : products.filter((p) => {
        const itemCat = p.category || 'BAN_BARU';
        if (itemCat !== activeTab) return false;
        const matchesBrand = selectedBrand === 'ALL' || p.brand === selectedBrand;
        const matchesRing = selectedRing === 'ALL' || p.ring === selectedRing;
        
        const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
        let matchesStock = true;
        if (stockFilter === 'LOW') {
          matchesStock = (p.stock || p.product_quantity || 0) > 0 && (p.stock || p.product_quantity || 0) < minAlert;
        } else if (stockFilter === 'OUT') {
          matchesStock = (p.stock || p.product_quantity || 0) <= 0;
        } else if (stockFilter === 'INACTIVE') {
          matchesStock = p.is_active === false;
        }

        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          (p.product_name && p.product_name.toLowerCase().includes(q)) ||
          (p.product_code && p.product_code.toLowerCase().includes(q)) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.product_size && p.product_size.toLowerCase().includes(q)) ||
          (p.pcd && p.pcd.toLowerCase().includes(q)) ||
          (p.motif && p.motif.toLowerCase().includes(q));

        return matchesBrand && matchesRing && matchesStock && matchesQuery;
      });

  const filteredServices = services.filter((srv) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      srv.service_name.toLowerCase().includes(q) ||
      srv.service_code.toLowerCase().includes(q) ||
      srv.category.toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers.filter((sup) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      sup.supplier_name.toLowerCase().includes(q) ||
      sup.supplier_code.toLowerCase().includes(q) ||
      sup.phone.includes(q) ||
      sup.contact_person.toLowerCase().includes(q)
    );
  });

  const handleOpenCreateProduct = () => {
    setProductFormMode('CREATE');
    setProductToEdit(null);
    setShowProductFormModal(true);
  };

  const handleOpenEditProduct = (prod: ProductItem) => {
    setProductFormMode('EDIT');
    setProductToEdit(prod);
    setShowProductFormModal(true);
  };

  const handleOpenRestock = (prod?: ProductItem) => {
    setPreselectedRestockProduct(prod || null);
    setShowGoodsReceiptModal(true);
  };

  const uniqueBrands = Array.from(new Set(products.filter(p => (p.category || 'BAN_BARU') === activeTab).map(p => p.brand))).filter(Boolean);
  const uniqueRings = Array.from(new Set(products.filter(p => (p.category || 'BAN_BARU') === activeTab).map(p => p.ring))).filter(Boolean);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 p-4 sm:p-6 lg:p-8 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Pusat Inventori & Master Data Cabang 3
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Katalog Ban Baru, Velg, Ban Dalam, Master Layanan Bengkel, dan Distributor Resmi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => handleOpenRestock()}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Penerimaan Barang</span>
          </button>
          <button
            onClick={() => setShowOpnameModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Stock Opname</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master Produk</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Total Unit Fisik Gudang</span>
          <span className="text-xl sm:text-2xl font-black text-slate-900 truncate block">{valuation.totalPcs} <span className="text-xs text-slate-500 font-semibold">Unit</span></span>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Total Nilai HPP Persediaan</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-700 truncate block">{formatRupiah(valuation.totalValuationHpp)}</span>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Peringatan Stok Kritis</span>
          <span className="text-xl sm:text-2xl font-black text-amber-700 truncate block">{valuation.lowStockCount} <span className="text-xs text-slate-500 font-semibold">SKU</span></span>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-xs">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Stok Habis / Kosong</span>
          <span className="text-xl sm:text-2xl font-black text-rose-700 truncate block">{valuation.outOfStockCount} <span className="text-xs text-slate-500 font-semibold">SKU</span></span>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('BAN_BARU')}
          className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'BAN_BARU'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>Ban Baru ({products.filter(p => (p.category || 'BAN_BARU') === 'BAN_BARU').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('VELG')}
          className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'VELG'
              ? 'bg-amber-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Velg Mobil ({products.filter(p => p.category === 'VELG').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BAN_DALAM')}
          className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'BAN_DALAM'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Ban Dalam & Flap ({products.filter(p => p.category === 'BAN_DALAM').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'SERVICES'
              ? 'bg-cyan-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Master Jasa ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'SUPPLIERS'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Supplier ({suppliers.length})</span>
        </button>
      </div>

      {/* Main Content Card (Bungkus Bersih Sesuai Standar) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              {activeTab === 'SERVICES' ? (
                <>
                  <Wrench className="w-4 h-4 text-cyan-700" />
                  <span>Katalog Master Jasa & Layanan Bengkel</span>
                </>
              ) : activeTab === 'SUPPLIERS' ? (
                <>
                  <Truck className="w-4 h-4 text-indigo-700" />
                  <span>Daftar Rekanan Distributor & Supplier</span>
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 text-blue-700" />
                  <span>
                    Katalog Inventori {activeTab === 'BAN_BARU' ? 'Ban Baru' : activeTab === 'VELG' ? 'Velg Mobil' : 'Ban Dalam & Flap'}
                  </span>
                </>
              )}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {activeTab === 'SERVICES'
                ? 'Kelola tarif jasa servis, spooring, balancing, dan bongkar pasang ban.'
                : activeTab === 'SUPPLIERS'
                ? 'Daftar prinsipal dan distributor ban dengan termin pembayaran dan kontak resmi.'
                : 'Daftar stok fisik riil di gudang Cabang 3 dengan sistem FIFO & harga perolehan.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'SERVICES' && (
              <button
                type="button"
                onClick={() => {
                  setServiceFormMode('CREATE');
                  setServiceToEdit(null);
                  setShowServiceModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-extrabold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jasa Baru</span>
              </button>
            )}

            {activeTab === 'SUPPLIERS' && (
              <button
                type="button"
                onClick={() => {
                  setSupplierFormMode('CREATE');
                  setSupplierToEdit(null);
                  setShowSupplierModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Distributor</span>
              </button>
            )}

            {activeTab !== 'SERVICES' && activeTab !== 'SUPPLIERS' && (
              <button
                type="button"
                onClick={handleOpenCreateProduct}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Master Produk</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'SERVICES' 
                  ? 'Cari nama layanan / kode jasa...'
                  : activeTab === 'SUPPLIERS'
                  ? 'Cari nama distributor, kontak, telepon...'
                  : 'Cari SKU, Barcode, Merek, Ukuran, PCD...'
              }
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
            />
          </div>

          {activeTab !== 'SERVICES' && activeTab !== 'SUPPLIERS' && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring text-xs"
              >
                <option value="ALL">Semua Merek</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {uniqueRings.length > 0 && (
                <select
                  value={selectedRing}
                  onChange={(e) => setSelectedRing(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring text-xs"
                >
                  <option value="ALL">Semua Ring</option>
                  {uniqueRings.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring text-xs"
              >
                <option value="ALL">Semua Status Stok</option>
                <option value="LOW">Stok Kritis (&lt; Min)</option>
                <option value="OUT">Stok Habis (0)</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>
          )}
        </div>

        {/* Main Products Table View */}
        {(activeTab === 'BAN_BARU' || activeTab === 'VELG' || activeTab === 'BAN_DALAM') && (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Produk & SKU</th>
                    <th className="py-2.5 px-3">Merek / Spesifikasi</th>
                    <th className="py-2.5 px-3 text-center">Stok Gudang</th>
                    <th className="py-2.5 px-3 text-right">Harga Modal (HPP)</th>
                    <th className="py-2.5 px-3 text-right">Harga Jual Retail</th>
                    <th className="py-2.5 px-3 text-center">Layer FIFO</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        Tidak ada data produk ditemukan pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const currentStock = p.stock || p.product_quantity || 0;
                      const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
                      const isLow = currentStock > 0 && currentStock < minAlert;
                      const isOut = currentStock <= 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900 text-xs">{p.product_name}</div>
                            <div className="text-[10px] font-mono text-slate-600 flex items-center gap-1.5 mt-0.5 font-medium">
                              <span className="text-blue-700 font-bold">{p.product_code}</span>
                              <span>•</span>
                              <span>EAN: {p.barcode}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-800">{p.brand}</div>
                            <div className="text-[10px] text-slate-600 font-medium">
                              {p.category === 'BAN_BARU' && `${p.product_size || ''} | DOT ${p.product_year || '-'}`}
                              {p.category === 'VELG' && `${p.ring || ''} | PCD ${p.pcd || ''} | Lebar ${p.rim_width || ''} | ET ${p.offset_et || ''}`}
                              {p.category === 'BAN_DALAM' && `${p.product_size || p.size_ratio || ''} | Valve ${p.valve_type || ''}`}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            }`}>
                              {currentStock} Unit
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-slate-600 font-mono text-xs">
                            {formatRupiah(p.product_cost || p.cost_price || 0)}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700 font-mono text-xs">
                            {formatRupiah(p.product_price || p.price || 0)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                              {p.batches?.length || 0} Batch
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedTireForCard(p)}
                                title="Lihat Kartu Stok Mutasi"
                                className="p-1 rounded-lg text-slate-500 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenRestock(p)}
                                title="Restock / Penerimaan Barang"
                                className="p-1 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                title="Edit Master Produk"
                                className="p-1 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {onDeleteOrDeactivateProduct && (
                                <button
                                  onClick={() => onDeleteOrDeactivateProduct(p.id)}
                                  title={p.is_active === false ? 'Aktifkan Produk' : 'Nonaktifkan / Hapus'}
                                  className="p-1 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </button>
                              )}
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
        )}

        {/* Services Table */}
        {activeTab === 'SERVICES' && (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Layanan / Jasa</th>
                    <th className="py-2.5 px-3">Kategori Layanan</th>
                    <th className="py-2.5 px-3">Kode Layanan</th>
                    <th className="py-2.5 px-3 text-right">Tarif ke Pelanggan</th>
                    <th className="py-2.5 px-3 text-right">Biaya Bahan (HPP)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        Tidak ada master jasa & layanan ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((srv) => (
                      <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">{srv.service_name}</div>
                          {srv.description && <div className="text-[10px] text-slate-600 mt-0.5 font-medium">{srv.description}</div>}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                            {srv.category}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-xs font-bold text-slate-700">
                          {srv.service_code}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700 font-mono text-xs">
                          {formatRupiah(srv.standard_price)}
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-slate-700 font-mono text-xs">
                          {formatRupiah(srv.cost_price || 0)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            srv.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {srv.is_active !== false ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setServiceFormMode('EDIT');
                                setServiceToEdit(srv);
                                setShowServiceModal(true);
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onToggleService && (
                              <button
                                onClick={() => onToggleService(srv.id)}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Suppliers Table */}
        {activeTab === 'SUPPLIERS' && (
          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Nama Distributor & Kode</th>
                    <th className="py-2.5 px-3">Kontak PIC & Telepon</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Alamat Gudang / Kantor</th>
                    <th className="py-2.5 px-3 text-center">Termin Tempo</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        Tidak ada master distributor ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((sup) => (
                      <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">{sup.supplier_name}</div>
                          <div className="font-mono text-[10px] text-indigo-700 font-bold mt-0.5">{sup.supplier_code}</div>
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-800">{sup.contact_person}</div>
                          <div className="text-[10px] text-slate-600 mt-0.5 font-medium">{sup.phone}</div>
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-700 font-medium">
                          {sup.email || '-'}
                        </td>
                        <td className="py-2 px-3 text-xs text-slate-700 font-medium max-w-xs truncate">
                          {sup.address}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            {sup.payment_terms_days || 30} Hari
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sup.is_active !== false
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}>
                            {sup.is_active !== false ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSupplierFormMode('EDIT');
                                setSupplierToEdit(sup);
                                setShowSupplierModal(true);
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            {onToggleSupplier && (
                              <button
                                onClick={() => onToggleSupplier(sup.id)}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            {activeTab === 'SERVICES'
              ? `Menampilkan ${filteredServices.length} master jasa operasional`
              : activeTab === 'SUPPLIERS'
              ? `Menampilkan ${filteredSuppliers.length} rekanan distributor`
              : `Menampilkan ${filteredProducts.length} produk di katalog gudang`}
          </span>
          <span className="text-[11px] text-slate-400">
            Sistem Inventori Cabang 3
          </span>
        </div>
      </div>

      {selectedTireForCard && (
        <StockCardDrawer
          product={selectedTireForCard}
          mutations={mutations}
          onClose={() => setSelectedTireForCard(null)}
          onOpenRestock={() => {
            const t = selectedTireForCard;
            setSelectedTireForCard(null);
            handleOpenRestock(t);
          }}
        />
      )}

      <ProductFormModal
        isOpen={showProductFormModal}
        mode={productFormMode}
        productToEdit={productToEdit}
        existingProducts={products}
        existingMutations={mutations}
        onClose={() => setShowProductFormModal(false)}
        onSaveCreate={(input) => {
          onCreateProduct?.(input);
          setShowProductFormModal(false);
        }}
        onSaveEdit={(id, updates) => {
          onUpdateProduct?.(id, updates);
          setShowProductFormModal(false);
        }}
      />

      <GoodsReceiptModal
        isOpen={showGoodsReceiptModal}
        products={products}
        suppliers={suppliers}
        preselectedProduct={preselectedRestockProduct}
        existingMutations={mutations}
        onClose={() => {
          setShowGoodsReceiptModal(false);
          setPreselectedRestockProduct(null);
        }}
        onSubmitReceipt={(input) => {
          onGoodsReceipt?.(input);
          setShowGoodsReceiptModal(false);
          setPreselectedRestockProduct(null);
        }}
      />

      <StockOpnameModal
        isOpen={showOpnameModal}
        products={products}
        existingMutations={mutations}
        onClose={() => setShowOpnameModal(false)}
        onSaveOpname={(updatedProds, newMuts) => {
          onUpdateProductStock(updatedProds, newMuts);
          setShowOpnameModal(false);
        }}
      />

      <ServiceFormModal
        isOpen={showServiceModal}
        mode={serviceFormMode}
        serviceToEdit={serviceToEdit}
        onClose={() => setShowServiceModal(false)}
        onSave={(data, id) => {
          onSaveService?.(data, id);
          setShowServiceModal(false);
        }}
      />

      <SupplierFormModal
        isOpen={showSupplierModal}
        mode={supplierFormMode}
        supplierToEdit={supplierToEdit}
        existingSuppliers={suppliers}
        onClose={() => setShowSupplierModal(false)}
        onSave={(data, id) => {
          onSaveSupplier?.(data, id);
          setShowSupplierModal(false);
        }}
      />
    </div>
  );
};
