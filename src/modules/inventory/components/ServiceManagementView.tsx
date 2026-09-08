import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  X, 
  Layers, 
  DollarSign, 
  Clock, 
  AlertCircle,
  Sparkles,
  Tag
} from 'lucide-react';
import { ServiceCategoryItem, ServiceMasterItem } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ServiceFormModal } from './ServiceFormModal';

interface ServiceManagementViewProps {
  services: ServiceMasterItem[];
  serviceCategories: ServiceCategoryItem[];
  onSaveService: (serviceData: Omit<ServiceMasterItem, 'id' | 'is_active'>, serviceId?: string) => void;
  onToggleService: (serviceId: string) => void;
  onDeleteServicePermanent?: (serviceId: string) => void;
  onSaveServiceCategory: (categoryData: { code: string; name: string; description?: string }, id?: string) => void;
  onDeleteServiceCategory: (id: string) => void;
}

export const ServiceManagementView: React.FC<ServiceManagementViewProps> = ({
  services,
  serviceCategories,
  onSaveService,
  onToggleService,
  onDeleteServicePermanent,
  onSaveServiceCategory,
  onDeleteServiceCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Service form modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceModalMode, setServiceModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [serviceToEdit, setServiceToEdit] = useState<ServiceMasterItem | null>(null);

  // Service Category manager modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Delete service confirmation modal
  const [serviceToDelete, setServiceToDelete] = useState<ServiceMasterItem | null>(null);

  // Filter services
  const filteredServices = useMemo(() => {
    return services.filter((srv) => {
      const matchesCat =
        selectedCategoryFilter === 'ALL' ||
        srv.category.toUpperCase() === selectedCategoryFilter.toUpperCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        srv.service_name.toLowerCase().includes(q) ||
        srv.service_code.toLowerCase().includes(q) ||
        srv.category.toLowerCase().includes(q);

      return matchesCat && matchesSearch;
    });
  }, [services, selectedCategoryFilter, searchQuery]);

  const handleOpenCreateService = () => {
    setServiceModalMode('CREATE');
    setServiceToEdit(null);
    setIsServiceModalOpen(true);
  };

  const handleOpenEditService = (srv: ServiceMasterItem) => {
    setServiceModalMode('EDIT');
    setServiceToEdit(srv);
    setIsServiceModalOpen(true);
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError(null);

    const cleanCode = newCatCode.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const cleanName = newCatName.trim();

    if (!cleanCode || !cleanName) {
      setCategoryError('Kode dan Nama kategori jasa wajib diisi.');
      return;
    }

    if (serviceCategories.some((c) => c.code.toUpperCase() === cleanCode)) {
      setCategoryError(`Kode kategori jasa "${cleanCode}" sudah digunakan.`);
      return;
    }

    onSaveServiceCategory({
      code: cleanCode,
      name: cleanName,
      description: newCatDesc.trim(),
    });

    setNewCatCode('');
    setNewCatName('');
    setNewCatDesc('');
    setIsCategoryModalOpen(false);
  };

  return (
    <div className="w-full animate-in fade-in duration-200">
      {/* Main Unified Table Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Table Top Controls & Action CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-cyan-700" />
              <span>Daftar Master Layanan & Jasa Bengkel</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Katalog tarif jasa spooring 3D, balancing, bongkar pasang, dan kompensasi mekanik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setCategoryError(null);
                setIsCategoryModalOpen(true);
              }}
              className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Tag className="w-4 h-4 text-slate-500" />
              <span>Kategori Jasa ({serviceCategories.length})</span>
            </button>
            <button
              type="button"
              onClick={handleOpenCreateService}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jasa Baru</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Pills Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua ({services.length})
            </button>
            {serviceCategories.map((sc) => {
              const count = services.filter((s) => s.category.toUpperCase() === sc.code.toUpperCase()).length;
              return (
                <button
                  key={sc.id || sc.code}
                  onClick={() => setSelectedCategoryFilter(sc.code)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedCategoryFilter.toUpperCase() === sc.code.toUpperCase()
                      ? 'bg-cyan-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sc.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kode atau nama jasa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Services Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Kode Layanan</th>
                  <th className="py-3 px-4">Nama Layanan Jasa</th>
                  <th className="py-3 px-4">Kategori Jasa</th>
                  <th className="py-3 px-4 text-right">Tarif Standar (Retail)</th>
                  <th className="py-3 px-4 text-right">Biaya Pokok (Teknisi)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-2">
                        <Wrench className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">Tidak ada layanan jasa ditemukan</p>
                        <p className="text-xs text-slate-400">
                          {searchQuery ? 'Coba ubah filter atau kata kunci pencarian.' : 'Klik tombol "+ Tambah Jasa Baru" untuk membuat layanan baru.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredServices.map((srv, idx) => {
                    const categoryObj = serviceCategories.find(
                      (c) => c.code.toUpperCase() === srv.category.toUpperCase()
                    );
                    const margin = srv.standard_price - (srv.cost_price || 0);

                    return (
                      <tr key={srv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 font-mono text-xs font-bold">
                            {srv.service_code}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{srv.service_name}</div>
                          {srv.description && (
                            <div className="text-xs text-slate-500 truncate max-w-sm">{srv.description}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                            {categoryObj ? categoryObj.name : srv.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-slate-900">
                            {formatRupiah(srv.standard_price)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono text-slate-600">
                            {formatRupiah(srv.cost_price || 0)}
                          </span>
                          {margin > 0 && (
                            <span className="block text-[10px] text-emerald-600 font-semibold">
                              Margin: {formatRupiah(margin)}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onToggleService(srv.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                              srv.is_active
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Klik untuk ubah status aktif"
                          >
                            {srv.is_active ? (
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
                              onClick={() => handleOpenEditService(srv)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Edit Jasa"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {onDeleteServicePermanent && (
                              <button
                                onClick={() => setServiceToDelete(srv)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus Jasa"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>Menampilkan {filteredServices.length} dari {services.length} master layanan jasa</span>
          <span className="text-[11px] text-slate-400">Sistem Inventori Cabang 3 • SAK EMKM</span>
        </div>
      </div>

      {/* Service Modal Form */}
      {isServiceModalOpen && (
        <ServiceFormModal
          isOpen={isServiceModalOpen}
          mode={serviceModalMode}
          serviceToEdit={serviceToEdit}
          serviceCategories={serviceCategories}
          onClose={() => setIsServiceModalOpen(false)}
          onSave={(data, id) => {
            onSaveService(data, id);
            setIsServiceModalOpen(false);
          }}
        />
      )}

      {/* Service Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-cyan-700">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Master Kategori Jasa Bengkel</h3>
                  <p className="text-[11px] text-slate-500">
                    Kelola klasifikasi jasa (Spooring, Balancing, dsb.)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Form Tambah Kategori */}
              <form onSubmit={handleSaveCategorySubmit} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tambah Kategori Jasa Baru</span>
                </h4>

                {categoryError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{categoryError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nama Kategori</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Servis Kaki-Kaki"
                      value={newCatName}
                      onChange={(e) => {
                        setNewCatName(e.target.value);
                        if (!newCatCode) {
                          setNewCatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 15));
                        }
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kode Unik</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: KAKI_KAKI"
                      value={newCatCode}
                      onChange={(e) => setNewCatCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono uppercase focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Keterangan Singkat</label>
                  <input
                    type="text"
                    placeholder="Deskripsi pengerjaan..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                  >
                    Simpan Kategori Jasa
                  </button>
                </div>
              </form>

              {/* Daftar Kategori Yang Ada */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Kategori Jasa Terdaftar ({serviceCategories.length})
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {serviceCategories.map((sc) => {
                    const count = services.filter((s) => s.category.toUpperCase() === sc.code.toUpperCase()).length;
                    return (
                      <div key={sc.id || sc.code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-800">{sc.name}</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px] text-slate-600 font-semibold">
                              {sc.code}
                            </span>
                          </div>
                          {sc.description && (
                            <p className="text-[11px] text-slate-400 mt-0.5">{sc.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">{count} Layanan</span>
                          {count === 0 && (
                            <button
                              type="button"
                              onClick={() => onDeleteServiceCategory(sc.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                              title="Hapus Kategori Jasa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-1.5 border border-slate-200 text-slate-600 hover:bg-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Service Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Hapus Layanan Jasa</h3>
              <p className="text-xs text-slate-500 mt-1">
                Apakah Anda yakin ingin menghapus jasa <span className="font-bold text-slate-800">"{serviceToDelete.service_name}"</span> ({serviceToDelete.service_code}) secara permanen?
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteServicePermanent) {
                    onDeleteServicePermanent(serviceToDelete.id);
                  }
                  setServiceToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Ya, Hapus Jasa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
