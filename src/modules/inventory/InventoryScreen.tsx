import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Tag, 
  Wrench, 
  Boxes, 
  Truck, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  TrendingDown, 
  XCircle, 
  CheckCircle2, 
  Layers, 
  Clock, 
  ChevronRight, 
  FileText, 
  Info,
  Calendar,
  DollarSign,
  Barcode,
  Sparkles,
  Eye,
  Edit3,
  Power,
  RotateCcw,
  ArrowDownLeft,
  X
} from 'lucide-react';
import { 
  CreateProductInput, 
  GoodsReceiptInput, 
  ItemCategory, 
  PosTransaction, 
  ProductCategory, 
  ProductItem, 
  ServiceCategoryItem, 
  ServiceMasterItem, 
  StockMutation, 
  SupplierItem, 
  UpdateProductInput 
} from '../../shared/types';
import { formatRupiah } from '../../shared/utils/formatters';
import { 
  calculateInventoryValuation, 
  canSafelyDeleteProduct 
} from '../../services/inventoryService';
import { 
  fetchProductCategoriesFromStorage, 
  createProductCategory, 
  updateProductCategory, 
  deleteProductCategory, 
  toggleProductCategoryStatus 
} from '../../services/productCategoryService';
import { 
  fetchServiceCategoriesFromStorage, 
  createServiceCategory, 
  updateServiceCategory, 
  deleteServiceCategory, 
  deleteServiceItemPermanent 
} from '../../services/serviceMasterService';
import { 
  CategoryManagementView, 
  GoodsReceiptModal, 
  ProductFormModal, 
  ServiceFormModal, 
  ServiceManagementView, 
  StockCardDrawer, 
  StockOpnameModal, 
  StockOpnameReceiptView, 
  SupplierFormModal 
} from './components';
import { useToast } from '../../shared/components';
import { ExportMenu } from '../../shared/export/ExportMenu';

export type InventorySubView = 'katalog' | 'kategori' | 'jasa' | 'stok_mutasi' | 'supplier';

interface InventoryScreenProps {
  products: ProductItem[];
  services?: ServiceMasterItem[];
  suppliers?: SupplierItem[];
  mutations: StockMutation[];
  transactions?: PosTransaction[];
  categories?: ProductCategory[];
  serviceCategories?: ServiceCategoryItem[];
  onCreateProduct?: (input: CreateProductInput) => void;
  onUpdateProduct?: (productId: string, updates: UpdateProductInput) => void;
  onGoodsReceipt?: (input: GoodsReceiptInput) => void;
  onDeleteOrDeactivateProduct?: (productId: string) => void;
  onUpdateProductStock: (updatedProducts: ProductItem[], newMutations: StockMutation[]) => void;
  onSaveService?: (serviceData: Omit<ServiceMasterItem, 'id' | 'is_active'>, serviceId?: string) => void;
  onToggleService?: (serviceId: string) => void;
  onDeleteServicePermanent?: (serviceId: string) => void;
  onSaveSupplier?: (supplierData: Omit<SupplierItem, 'id' | 'is_active'>, supplierId?: string) => void;
  onToggleSupplier?: (supplierId: string) => void;
  onSaveCategory?: (
    categoryData: { category_code: string; category_name: string; description?: string; is_active?: boolean },
    categoryId?: string
  ) => void;
  onDeleteCategory?: (categoryId: string) => void;
  onToggleCategoryStatus?: (categoryId: string) => void;
  onSaveServiceCategory?: (categoryData: { code: string; name: string; description?: string }, id?: string) => void;
  onDeleteServiceCategory?: (id: string) => void;
  isEmptyState?: boolean;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  products,
  services = [],
  suppliers = [],
  mutations,
  transactions = [],
  categories: propCategories,
  serviceCategories: propServiceCategories,
  onCreateProduct,
  onUpdateProduct,
  onGoodsReceipt,
  onDeleteOrDeactivateProduct,
  onUpdateProductStock,
  onSaveService,
  onToggleService,
  onDeleteServicePermanent: propDeleteServicePermanent,
  onSaveSupplier,
  onToggleSupplier,
  onSaveCategory: propSaveCategory,
  onDeleteCategory: propDeleteCategory,
  onToggleCategoryStatus: propToggleCategoryStatus,
  onSaveServiceCategory: propSaveServiceCategory,
  onDeleteServiceCategory: propDeleteServiceCategory,
  isEmptyState = false,
}) => {
  const toast = useToast();

  // Sub-Navigation Tab
  const [activeSubView, setActiveSubView] = useState<InventorySubView>('katalog');

  // Internal category state fallback
  const [internalCategories, setInternalCategories] = useState<ProductCategory[]>(() =>
    fetchProductCategoriesFromStorage()
  );
  const categories = propCategories || internalCategories;

  // Internal service categories state fallback
  const [internalServiceCategories, setInternalServiceCategories] = useState<ServiceCategoryItem[]>(() =>
    fetchServiceCategoriesFromStorage()
  );
  const serviceCategories = propServiceCategories || internalServiceCategories;

  // Internal services state fallback for delete
  const [internalServices, setInternalServices] = useState<ServiceMasterItem[]>(services);
  const currentServices = services.length > 0 ? services : internalServices;

  // Product Catalog Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [selectedRing, setSelectedRing] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'INACTIVE'>('ALL');

  // Modals & Drawers
  const [selectedTireForCard, setSelectedTireForCard] = useState<ProductItem | null>(null);
  const [showOpnameModal, setShowOpnameModal] = useState<boolean>(false);
  const [showProductFormModal, setShowProductFormModal] = useState<boolean>(false);
  const [productFormMode, setProductFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [productToEdit, setProductToEdit] = useState<ProductItem | null>(null);

  const [showGoodsReceiptModal, setShowGoodsReceiptModal] = useState<boolean>(false);
  const [preselectedRestockProduct, setPreselectedRestockProduct] = useState<ProductItem | null>(null);

  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [supplierFormMode, setSupplierFormMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [supplierToEdit, setSupplierToEdit] = useState<SupplierItem | null>(null);

  // Valuation metrics
  const valuation = useMemo(() => calculateInventoryValuation(products), [products]);

  // Unique brands & rings for catalog filters
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brands.add(p.brand);
    });
    return Array.from(brands).sort();
  }, [products]);

  const uniqueRings = useMemo(() => {
    const rings = new Set<string>();
    products.forEach((p) => {
      if (p.ring) rings.add(p.ring);
    });
    return Array.from(rings).sort();
  }, [products]);

  // Filtered products for catalog
  const filteredProducts = useMemo(() => {
    if (isEmptyState) return [];
    return products.filter((p) => {
      // Category filter
      if (selectedCategoryFilter !== 'ALL') {
        const pCat = (p.category || '').toUpperCase().trim();
        const selCat = selectedCategoryFilter.toUpperCase().trim();
        if (pCat !== selCat) return false;
      }

      // Brand filter
      if (selectedBrand !== 'ALL' && p.brand !== selectedBrand) return false;

      // Ring filter
      if (selectedRing !== 'ALL' && p.ring !== selectedRing) return false;

      // Stock status filter
      const stock = p.stock || p.product_quantity || 0;
      const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
      if (stockFilter === 'LOW' && (stock <= 0 || stock >= minAlert)) return false;
      if (stockFilter === 'OUT' && stock > 0) return false;
      if (stockFilter === 'INACTIVE' && p.is_active !== false) return false;

      // Search query
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = p.product_name && p.product_name.toLowerCase().includes(q);
        const matchCode = p.product_code && p.product_code.toLowerCase().includes(q);
        const matchBarcode = p.barcode && p.barcode.toLowerCase().includes(q);
        const matchMotif = p.motif && p.motif.toLowerCase().includes(q);
        const matchPcd = p.pcd && p.pcd.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchBarcode && !matchMotif && !matchPcd) {
          return false;
        }
      }

      return true;
    });
  }, [products, isEmptyState, selectedCategoryFilter, selectedBrand, selectedRing, stockFilter, searchQuery]);

  // Category CRUD Handlers
  const handleSaveCategory = (
    categoryData: { category_code: string; category_name: string; description?: string; is_active?: boolean },
    categoryId?: string
  ) => {
    if (propSaveCategory) {
      propSaveCategory(categoryData, categoryId);
      toast.success('Berhasil', categoryId ? 'Kategori produk diperbarui.' : 'Kategori produk baru ditambahkan.');
      return;
    }

    if (categoryId) {
      const res = updateProductCategory(internalCategories, categoryId, categoryData);
      if (res.success) {
        setInternalCategories(res.updatedCategories);
        toast.success('Berhasil', 'Kategori produk berhasil diperbarui.');
      } else {
        toast.error('Gagal', res.error || 'Terjadi kesalahan saat memperbarui kategori.');
      }
    } else {
      const res = createProductCategory(internalCategories, categoryData);
      if (res.success) {
        setInternalCategories(res.updatedCategories);
        toast.success('Berhasil', 'Kategori produk baru berhasil ditambahkan.');
      } else {
        toast.error('Gagal', res.error || 'Terjadi kesalahan saat menambahkan kategori.');
      }
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (propDeleteCategory) {
      propDeleteCategory(categoryId);
      toast.info('Kategori Dihapus', 'Kategori produk telah dihapus.');
      return;
    }

    const res = deleteProductCategory(internalCategories, categoryId, products);
    if (res.success) {
      setInternalCategories(res.updatedCategories);
      toast.info('Kategori Dihapus', 'Kategori produk berhasil dihapus.');
    } else {
      toast.error('Gagal Menghapus', res.error || 'Kategori tidak dapat dihapus.');
    }
  };

  const handleToggleCategoryStatus = (categoryId: string) => {
    if (propToggleCategoryStatus) {
      propToggleCategoryStatus(categoryId);
      return;
    }
    const updated = toggleProductCategoryStatus(internalCategories, categoryId);
    setInternalCategories(updated);
  };

  // Service Category Handlers
  const handleSaveServiceCategory = (
    categoryData: { code: string; name: string; description?: string },
    id?: string
  ) => {
    if (propSaveServiceCategory) {
      propSaveServiceCategory(categoryData, id);
      toast.success('Berhasil', 'Kategori jasa berhasil disimpan.');
      return;
    }

    if (id) {
      const res = updateServiceCategory(internalServiceCategories, id, categoryData);
      if (res.success) {
        setInternalServiceCategories(res.updatedCategories);
        toast.success('Berhasil', 'Kategori jasa diperbarui.');
      } else {
        toast.error('Gagal', res.error || 'Gagal memperbarui kategori jasa.');
      }
    } else {
      const res = createServiceCategory(internalServiceCategories, categoryData);
      if (res.success) {
        setInternalServiceCategories(res.updatedCategories);
        toast.success('Berhasil', 'Kategori jasa baru ditambahkan.');
      } else {
        toast.error('Gagal', res.error || 'Gagal menambahkan kategori jasa.');
      }
    }
  };

  const handleDeleteServiceCategory = (id: string) => {
    if (propDeleteServiceCategory) {
      propDeleteServiceCategory(id);
      toast.info('Dihapus', 'Kategori jasa telah dihapus.');
      return;
    }

    const res = deleteServiceCategory(internalServiceCategories, id, currentServices);
    if (res.success) {
      setInternalServiceCategories(res.updatedCategories);
      toast.info('Dihapus', 'Kategori jasa berhasil dihapus.');
    } else {
      toast.error('Gagal Menghapus', res.error || 'Kategori masih digunakan oleh layanan aktif.');
    }
  };

  const handleDeleteServicePermanent = (serviceId: string) => {
    if (propDeleteServicePermanent) {
      propDeleteServicePermanent(serviceId);
      toast.info('Layanan Dihapus', 'Layanan jasa berhasil dihapus permanen.');
      return;
    }
    const updated = deleteServiceItemPermanent(currentServices, serviceId);
    setInternalServices(updated);
    toast.info('Layanan Dihapus', 'Layanan jasa berhasil dihapus.');
  };

  // Restock trigger from card or catalog
  const handleOpenRestock = (product?: ProductItem) => {
    setPreselectedRestockProduct(product || null);
    setShowGoodsReceiptModal(true);
  };

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

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. Header Ringkas Modul Produk */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
              Modul Produk & Jasa
            </span>
            <span className="text-xs text-slate-400 font-medium">Omah Ban Cabang 3</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Manajemen Produk, Kategori & Layanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola katalog SKU produk, master kategori dinamis, tarif jasa bengkel, serta mutasi stok.
          </p>
        </div>

        {/* Action button khusus tab Katalog Produk agar toolbar tetap bersih */}
        {activeSubView === 'katalog' && (
          <div className="flex items-center gap-2">
            <ExportMenu
              reportId="inventory_products"
              data={filteredProducts}
              ctx={{ periodLabel: `Kategori: ${selectedCategoryFilter}` }}
            />
            <button
              onClick={handleOpenCreateProduct}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Master Produk</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Segmented Sub-Navigation Bar (Opsi 1: Bersih, Rapi & Modular) */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubView('katalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSubView === 'katalog'
              ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Katalog Produk</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
            {products.length} SKU
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('kategori')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSubView === 'kategori'
              ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Kategori Produk</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('jasa')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSubView === 'jasa'
              ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Master Jasa & Servis</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {currentServices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('stok_mutasi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSubView === 'stok_mutasi'
              ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Penerimaan & Stok Opname</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
            {mutations.length} Mutasi
          </span>
        </button>

        <button
          onClick={() => setActiveSubView('supplier')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
            activeSubView === 'supplier'
              ? 'bg-white text-blue-700 shadow-xs ring-1 ring-slate-200/80 font-black'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Distributor & Supplier</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
            {suppliers.length}
          </span>
        </button>
      </div>

      {/* 3. Render Konten Sub-View Terpilih */}

      {/* SUB-VIEW 1: KATALOG PRODUK */}
      {activeSubView === 'katalog' && (
        <div className="space-y-4">
          {/* KPI Cards Ringkas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Unit Fisik
              </span>
              <span className="text-base sm:text-2xl font-black text-slate-900 truncate block">
                {valuation.totalPcs} <span className="text-xs text-slate-500 font-semibold">Unit</span>
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Total Nilai HPP
              </span>
              <span className="text-base sm:text-2xl font-black text-emerald-700 truncate block">
                {formatRupiah(valuation.totalValuationHpp)}
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Stok Kritis
              </span>
              <span className="text-base sm:text-2xl font-black text-amber-700 truncate block">
                {valuation.lowStockCount} <span className="text-xs text-slate-500 font-semibold">SKU</span>
              </span>
            </div>
            <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-xs">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Stok Habis
              </span>
              <span className="text-base sm:text-2xl font-black text-rose-700 truncate block">
                {valuation.outOfStockCount} <span className="text-xs text-slate-500 font-semibold">SKU</span>
              </span>
            </div>
          </div>

          {/* Filter Bar Terpadu (Dinamis dari Master Kategori) */}
          <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Search */}
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama ban, kode produk, motif, atau barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Filter Kategori Dinamis */}
              <div>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Kategori Produk</option>
                  {categories.map((c) => (
                    <option key={c.id || c.category_code} value={c.category_code}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Merek */}
              <div>
                <select
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Semua Merek ({uniqueBrands.length})</option>
                  {uniqueBrands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Status Stok */}
              <div>
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as any)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ALL">Status Stok: Semua</option>
                  <option value="LOW">Stok Menipis (&lt; Batas Alert)</option>
                  <option value="OUT">Stok Habis (0 Unit)</option>
                  <option value="INACTIVE">Nonaktif Saja</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Katalog Produk */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 w-10 text-center">#</th>
                    <th className="py-3 px-4">Nama Produk & Spesifikasi</th>
                    <th className="py-3 px-4">Kategori & Brand</th>
                    <th className="py-3 px-4 text-center">Stok Fisik</th>
                    <th className="py-3 px-4 text-right">Harga HPP</th>
                    <th className="py-3 px-4 text-right">Harga Jual Retail</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Package className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-700">Tidak ada produk ditemukan</p>
                          <p className="text-xs text-slate-400">
                            {searchQuery ? 'Coba ubah filter atau kata kunci pencarian.' : 'Klik tombol "+ Tambah Master Produk" untuk membuat SKU baru.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const stock = p.stock || p.product_quantity || 0;
                      const minAlert = p.product_stock_alert ?? p.min_stock ?? 5;
                      const isLow = stock > 0 && stock < minAlert;
                      const isOut = stock <= 0;

                      const categoryObj = categories.find(
                        (c) => c.category_code.toUpperCase() === (p.category || '').toUpperCase()
                      );

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{p.product_name || p.name}</div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                {p.product_code}
                              </span>
                              {p.barcode && <span>• EAN: {p.barcode}</span>}
                              {p.ring && <span>• {p.ring}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">{p.brand}</div>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                              {categoryObj ? categoryObj.category_name : p.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {stock} Unit
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-600">
                            {formatRupiah(p.product_cost || p.cost_price || 0)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(p.product_price || p.price || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.is_active !== false
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {p.is_active !== false ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => setSelectedTireForCard(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Lihat Kartu Stok"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenRestock(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                title="Penerimaan Barang (Restock)"
                              >
                                <ArrowDownLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Edit Produk"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {onDeleteOrDeactivateProduct && (
                                <button
                                  onClick={() => onDeleteOrDeactivateProduct(p.id)}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Nonaktifkan / Hapus Produk"
                                >
                                  <Power className="w-4 h-4" />
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

            <div className="flex items-center justify-between p-3.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
              <span>Menampilkan {filteredProducts.length} dari {products.length} total produk</span>
              <span className="font-semibold">Omah Ban Cabang 3 • Sistem Inventori SAK EMKM</span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: KATEGORI PRODUK (CRUD LENGKAP) */}
      {activeSubView === 'kategori' && (
        <CategoryManagementView
          categories={categories}
          products={products}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          onToggleCategoryStatus={handleToggleCategoryStatus}
        />
      )}

      {/* SUB-VIEW 3: MASTER JASA & SERVIS (CRUD LENGKAP) */}
      {activeSubView === 'jasa' && (
        <ServiceManagementView
          services={currentServices}
          serviceCategories={serviceCategories}
          onSaveService={(serviceData, id) => {
            onSaveService?.(serviceData, id);
            toast.success('Berhasil', id ? 'Layanan jasa diperbarui.' : 'Layanan jasa baru ditambahkan.');
          }}
          onToggleService={(id) => {
            onToggleService?.(id);
          }}
          onDeleteServicePermanent={handleDeleteServicePermanent}
          onSaveServiceCategory={handleSaveServiceCategory}
          onDeleteServiceCategory={handleDeleteServiceCategory}
        />
      )}

      {/* SUB-VIEW 4: PENERIMAAN & STOK OPNAME */}
      {activeSubView === 'stok_mutasi' && (
        <StockOpnameReceiptView
          mutations={mutations}
          products={products}
          onOpenRestock={() => handleOpenRestock()}
          onOpenOpname={() => setShowOpnameModal(true)}
        />
      )}

      {/* SUB-VIEW 5: DISTRIBUTOR & SUPPLIER */}
      {activeSubView === 'supplier' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Distributor & Pemasok Resmi</h2>
                <p className="text-xs text-slate-500">
                  Data rekanan pabrikan dan distributor ban, velg, serta suku cadang.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ExportMenu reportId="inventory_suppliers" data={suppliers} ctx={{ periodLabel: 'Seluruh Rekanan' }} />
              <button
                onClick={() => {
                  setSupplierFormMode('CREATE');
                  setSupplierToEdit(null);
                  setShowSupplierModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Supplier</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">#</th>
                    <th className="py-3 px-4">Kode Supplier</th>
                    <th className="py-3 px-4">Nama Perusahaan / Distributor</th>
                    <th className="py-3 px-4">Kontak & Telepon</th>
                    <th className="py-3 px-4">Alamat Gudang / Kantor</th>
                    <th className="py-3 px-4 text-center">Termin Hutang (TOP)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500">
                        <div className="max-w-sm mx-auto space-y-2">
                          <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                          <p className="font-semibold text-slate-700">Belum ada rekanan distributor</p>
                          <p className="text-xs text-slate-400">
                            Klik tombol "+ Tambah Supplier" untuk menambahkan mitra pemasok.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    suppliers.map((sup, idx) => (
                      <tr key={sup.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-xs">
                            {sup.supplier_code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{sup.supplier_name}</div>
                          {sup.contact_person && (
                            <div className="text-xs text-slate-500">PIC: {sup.contact_person}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <div>{sup.phone}</div>
                          {sup.email && <div className="text-xs text-slate-400">{sup.email}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{sup.address}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-800">
                          {sup.payment_terms_days} Hari
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sup.is_active !== false
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {sup.is_active !== false ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSupplierFormMode('EDIT');
                                setSupplierToEdit(sup);
                                setShowSupplierModal(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Supplier"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {onToggleSupplier && (
                              <button
                                onClick={() => onToggleSupplier(sup.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Ubah Status Supplier"
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
        </div>
      )}

      {/* Modals & Drawers Shared */}
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
        categories={categories}
        existingProducts={products}
        existingMutations={mutations}
        onClose={() => setShowProductFormModal(false)}
        onSaveCreate={(input) => {
          onCreateProduct?.(input);
          setShowProductFormModal(false);
          toast.success('Berhasil', 'Produk baru berhasil disimpan ke katalog gudang.');
        }}
        onSaveEdit={(id, updates) => {
          onUpdateProduct?.(id, updates);
          setShowProductFormModal(false);
          toast.success('Berhasil', 'Informasi produk berhasil diperbarui.');
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
          toast.success('Penerimaan Berhasil', 'Stok baru telah dicatat dengan metode FIFO.');
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
          toast.success('Stock Opname Berhasil', 'Penyesuaian stok fisik telah dibukukan.');
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
          toast.success('Berhasil', id ? 'Data supplier diperbarui.' : 'Supplier baru ditambahkan.');
        }}
      />
    </div>
  );
};
