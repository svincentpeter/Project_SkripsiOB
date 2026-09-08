import React, { useState, useMemo } from 'react';
import { 
  Tag, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FolderTree, 
  Layers, 
  Package
} from 'lucide-react';
import { ProductCategory, ProductItem } from '../../../shared/types';
import { generateCategoryCode } from '../../../services/productCategoryService';

interface CategoryManagementViewProps {
  categories: ProductCategory[];
  products: ProductItem[];
  onSaveCategory: (
    categoryData: { category_code: string; category_name: string; description?: string; is_active?: boolean },
    categoryId?: string
  ) => void;
  onDeleteCategory: (categoryId: string) => void;
  onToggleCategoryStatus: (categoryId: string) => void;
}

export const CategoryManagementView: React.FC<CategoryManagementViewProps> = ({
  categories,
  products,
  onSaveCategory,
  onDeleteCategory,
  onToggleCategoryStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  
  // Form fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete modal state
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Attach live product count
  const categoriesWithCounts = useMemo(() => {
    return categories.map((cat) => {
      const count = products.filter((p) => {
        const pCat = (p.category || '').toUpperCase().trim();
        const catCode = (cat.category_code || '').toUpperCase().trim();
        return pCat === catCode || (p.category_id && String(p.category_id) === String(cat.id));
      }).length;
      return { ...cat, product_count: count };
    });
  }, [categories, products]);

  // Filter categories
  const filteredCategories = useMemo(() => {
    return categoriesWithCounts.filter((cat) => {
      const matchesSearch =
        !searchQuery.trim() ||
        cat.category_name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        cat.category_code.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase().trim()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && cat.is_active) ||
        (statusFilter === 'INACTIVE' && !cat.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [categoriesWithCounts, searchQuery, statusFilter]);

  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setSelectedCategory(null);
    setCode('');
    setName('');
    setDescription('');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: ProductCategory) => {
    setModalMode('EDIT');
    setSelectedCategory(cat);
    setCode(cat.category_code);
    setName(cat.category_name);
    setDescription(cat.description || '');
    setIsActive(cat.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (modalMode === 'CREATE' && !code) {
      setCode(generateCategoryCode(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode || !cleanName) {
      setFormError('Kode kategori dan Nama kategori wajib diisi.');
      return;
    }

    // Uniqueness validation
    const isDuplicate = categories.some((c) => {
      if (modalMode === 'EDIT' && selectedCategory && c.id === selectedCategory.id) {
        return false;
      }
      return c.category_code.toUpperCase() === cleanCode;
    });

    if (isDuplicate) {
      setFormError(`Kode kategori "${cleanCode}" sudah digunakan. Gunakan kode lain.`);
      return;
    }

    onSaveCategory(
      {
        category_code: cleanCode,
        category_name: cleanName,
        description: description.trim(),
        is_active: isActive,
      },
      modalMode === 'EDIT' && selectedCategory ? selectedCategory.id : undefined
    );

    setIsModalOpen(false);
  };

  const handleConfirmDelete = (cat: ProductCategory) => {
    setDeleteError(null);
    if (cat.product_count && cat.product_count > 0) {
      setDeleteError(
        `Kategori "${cat.category_name}" tidak dapat dihapus karena masih digunakan oleh ${cat.product_count} SKU produk. Pindahkan atau hapus produk terlebih dahulu.`
      );
      setCategoryToDelete(cat);
      return;
    }
    setCategoryToDelete(cat);
  };

  const executeDelete = () => {
    if (!categoryToDelete) return;
    if (categoryToDelete.product_count && categoryToDelete.product_count > 0) {
      return;
    }
    onDeleteCategory(categoryToDelete.id);
    setCategoryToDelete(null);
  };

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* Main Unified Table Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Table Top Controls & Action CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-blue-700" />
              <span>Daftar Master Kategori Produk</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Pengelompokan jenis suku cadang ban, velg, oli, dan kode kategori katalog toko.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori Baru</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode atau nama kategori..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Status:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full sm:w-auto justify-between">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({categories.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Aktif ({categories.filter((c) => c.is_active).length})
              </button>
              <button
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  statusFilter === 'INACTIVE' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Nonaktif ({categories.filter((c) => !c.is_active).length})
              </button>
            </div>
          </div>
        </div>

        {/* Categories Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Kode Kategori</th>
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4">Deskripsi</th>
                  <th className="py-3 px-4 text-center">Jumlah SKU Terkait</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <FolderTree className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">Tidak ada kategori ditemukan</p>
                        <p className="text-xs text-slate-400">
                          {searchQuery ? 'Coba ubah kata kunci pencarian Anda.' : 'Klik tombol "+ Tambah Kategori Baru" untuk membuat kategori baru.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, idx) => (
                    <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs">
                          {cat.category_code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{cat.category_name}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {cat.description || <span className="text-slate-300 italic">-</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cat.product_count ?? 0} SKU</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onToggleCategoryStatus(cat.id)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                            cat.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Klik untuk ubah status aktif"
                        >
                          {cat.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3 h-3" />
                              <span>Nonaktif</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Kategori"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleConfirmDelete(cat)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Menampilkan {filteredCategories.length} dari {categories.length} master kategori</span>
          <span className="text-[11px] text-slate-400">Sistem Inventori Cabang 3 • SAK EMKM</span>
        </div>
      </div>

      {/* Modal Form: Tambah / Edit Kategori */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {modalMode === 'CREATE' ? 'Tambah Kategori Produk Baru' : 'Edit Kategori Produk'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Definisikan kode dan nama klasifikasi produk.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ban Mobil Baru, Oli Mesin, dsb."
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kode Kategori <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BAN_BARU, OLI, VELG"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Digunakan sebagai kode sistem unik (otomatis huruf besar & underscore).
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan klasifikasi produk..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Status Kategori Aktif</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {modalMode === 'CREATE' ? 'Simpan Kategori' : 'Perbarui Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal with Safety Check */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Kategori</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus kategori <span className="font-bold text-slate-800">"{categoryToDelete.category_name}"</span>?
              </p>
            </div>

            {deleteError ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-amber-800 text-xs space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>Penghapusan Diblokir</span>
                </div>
                <p>{deleteError}</p>
              </div>
            ) : null}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {deleteError ? 'Tutup' : 'Batal'}
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Ya, Hapus Kategori
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
