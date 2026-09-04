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
  DollarSign
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
        if (p.category !== activeTab) return false;
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

  const uniqueBrands = Array.from(new Set(products.filter(p => p.category === activeTab).map(p => p.brand))).filter(Boolean);
  const uniqueRings = Array.from(new Set(products.filter(p => p.category === activeTab).map(p => p.ring))).filter(Boolean);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Pusat Inventori & Master Data Cabang 3
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Katalog Ban Baru, Velg, Ban Dalam, Master Layanan Bengkel, dan Distributor Resmi.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleOpenRestock()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
          >
            <Truck className="w-4 h-4" />
            <span>Penerimaan Barang</span>
          </button>
          <button
            onClick={() => setShowOpnameModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-amber-900/30 transition-all active:scale-95"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Stock Opname</span>
          </button>
          <button
            onClick={handleOpenCreateProduct}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Master Produk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Total Unit Fisik Gudang</span>
          <span className="text-2xl font-black text-white">{valuation.totalPcs} <span className="text-xs text-slate-400 font-normal">Unit</span></span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Total Nilai HPP Persediaan</span>
          <span className="text-2xl font-black text-emerald-400">{formatRupiah(valuation.totalValuationHpp)}</span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Peringatan Stok Kritis</span>
          <span className="text-2xl font-black text-amber-400">{valuation.lowStockCount} <span className="text-xs text-slate-400 font-normal">SKU</span></span>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-semibold block mb-1">Stok Habis / Kosong</span>
          <span className="text-2xl font-black text-red-400">{valuation.outOfStockCount} <span className="text-xs text-slate-400 font-normal">SKU</span></span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('BAN_BARU')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'BAN_BARU'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Disc className="w-4 h-4" />
          <span>Ban Baru ({products.filter(p => p.category === 'BAN_BARU').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('VELG')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'VELG'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Velg Mobil ({products.filter(p => p.category === 'VELG').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('BAN_DALAM')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'BAN_DALAM'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Ban Dalam & Flap ({products.filter(p => p.category === 'BAN_DALAM').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SERVICES')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'SERVICES'
              ? 'bg-cyan-600 text-white shadow-md shadow-cyan-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Master Jasa & Layanan ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'SUPPLIERS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Distributor / Supplier ({suppliers.length})</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-white text-xs sm:text-sm focus:outline-hidden focus:border-blue-500"
          />
        </div>

        {activeTab !== 'SERVICES' && activeTab !== 'SUPPLIERS' && (
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden"
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
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden"
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
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs focus:outline-hidden"
            >
              <option value="ALL">Semua Status Stok</option>
              <option value="LOW">Stok Kritis (&lt; Min)</option>
              <option value="OUT">Stok Habis (0)</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </div>
        )}

        {activeTab === 'SERVICES' && (
          <button
            onClick={() => {
              setServiceFormMode('CREATE');
              setServiceToEdit(null);
              setShowServiceModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Tambah Jasa Baru
          </button>
        )}

        {activeTab === 'SUPPLIERS' && (
          <button
            onClick={() => {
              setSupplierFormMode('CREATE');
              setSupplierToEdit(null);
              setShowSupplierModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
          >
            <Plus className="w-4 h-4" /> Tambah Distributor
          </button>
        )}
      </div>

      {(activeTab === 'BAN_BARU' || activeTab === 'VELG' || activeTab === 'BAN_DALAM') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Nama Produk & SKU</th>
                  <th className="py-3.5 px-4">Merek / Spesifikasi</th>
                  <th className="py-3.5 px-4 text-center">Stok Gudang</th>
                  <th className="py-3.5 px-4 text-right">Harga Modal (HPP)</th>
                  <th className="py-3.5 px-4 text-right">Harga Jual Retail</th>
                  <th className="py-3.5 px-4 text-center">Layer FIFO</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
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
                      <tr key={p.id} className="hover:bg-slate-850/50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{p.product_name}</div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="text-blue-400">{p.product_code}</span>
                            <span>•</span>
                            <span className="text-slate-500">EAN: {p.barcode}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-200">{p.brand}</div>
                          <div className="text-xs text-slate-400">
                            {p.category === 'BAN_BARU' && `${p.product_size || ''} | DOT ${p.product_year || '-'}`}
                            {p.category === 'VELG' && `${p.ring || ''} | PCD ${p.pcd || ''} | Lebar ${p.rim_width || ''} | ET ${p.offset_et || ''}`}
                            {p.category === 'BAN_DALAM' && `${p.product_size || p.size_ratio || ''} | Valve ${p.valve_type || ''}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isOut
                              ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                              : isLow
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                          }`}>
                            {currentStock} Unit
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-400">
                          {formatRupiah(p.product_cost || p.cost_price || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                          {formatRupiah(p.product_price || p.price || 0)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded-md text-slate-300">
                            {p.batches?.length || 0} Batch
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedTireForCard(p)}
                              title="Lihat Kartu Stok Mutasi"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <History className="w-4 h-4 text-cyan-400" />
                            </button>
                            <button
                              onClick={() => handleOpenRestock(p)}
                              title="Restock / Penerimaan Barang"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Truck className="w-4 h-4 text-emerald-400" />
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              title="Edit Master Produk"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            >
                              <Edit3 className="w-4 h-4 text-amber-400" />
                            </button>
                            {onDeleteOrDeactivateProduct && (
                              <button
                                onClick={() => onDeleteOrDeactivateProduct(p.id)}
                                title={p.is_active === false ? 'Aktifkan Produk' : 'Nonaktifkan / Hapus'}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                              >
                                <Power className="w-4 h-4 text-red-400" />
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

      {activeTab === 'SERVICES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Nama Layanan / Jasa</th>
                  <th className="py-3.5 px-4">Kategori Layanan</th>
                  <th className="py-3.5 px-4">Kode Layanan</th>
                  <th className="py-3.5 px-4 text-right">Tarif ke Pelanggan</th>
                  <th className="py-3.5 px-4 text-right">Biaya Bahan (HPP)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      Tidak ada master jasa & layanan ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((srv) => (
                    <tr key={srv.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{srv.service_name}</div>
                        {srv.description && <div className="text-xs text-slate-400 mt-0.5">{srv.description}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                          {srv.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                        {srv.service_code}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {formatRupiah(srv.standard_price)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-400">
                        {formatRupiah(srv.cost_price || 0)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          srv.is_active !== false
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {srv.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setServiceFormMode('EDIT');
                              setServiceToEdit(srv);
                              setShowServiceModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {onToggleService && (
                            <button
                              onClick={() => onToggleService(srv.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            >
                              <Power className="w-4 h-4" />
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

      {activeTab === 'SUPPLIERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-850 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Nama Distributor & Kode</th>
                  <th className="py-3.5 px-4">Kontak PIC & Telepon</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Alamat Gudang / Kantor</th>
                  <th className="py-3.5 px-4 text-center">Termin Tempo</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-500">
                      Tidak ada master distributor ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((sup) => (
                    <tr key={sup.id} className="hover:bg-slate-850/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{sup.supplier_name}</div>
                        <div className="font-mono text-xs text-indigo-400 mt-0.5">{sup.supplier_code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{sup.contact_person}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{sup.phone}</div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {sup.email || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs truncate">
                        {sup.address}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800/40">
                          {sup.payment_terms_days || 30} Hari
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          sup.is_active !== false
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {sup.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setSupplierFormMode('EDIT');
                              setSupplierToEdit(sup);
                              setShowSupplierModal(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {onToggleSupplier && (
                            <button
                              onClick={() => onToggleSupplier(sup.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            >
                              <Power className="w-4 h-4" />
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

      {selectedTireForCard && (
        <StockCardDrawer
          isOpen={true}
          tire={selectedTireForCard}
          mutations={mutations}
          onClose={() => setSelectedTireForCard(null)}
          onRestock={() => {
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
