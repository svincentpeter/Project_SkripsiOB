import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  Minus,
  Percent,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Tag,
} from 'lucide-react';
import { BrandPricingItem } from '../../../shared/types';
import { brandPricingApi } from '../../../services/api';
import { TablePagination, useDialog, usePagination, useToast } from '../../../shared/components';

interface BrandMarkupSettingsViewProps {
  canManage?: boolean;
  onProductsUpdated?: () => void;
}

interface RowDraft {
  min_markup_percent: number;
  default_markup_percent: number;
}

const GLOBAL_MIN = 15;

export const BrandMarkupSettingsView: React.FC<BrandMarkupSettingsViewProps> = ({
  canManage = true,
  onProductsUpdated,
}) => {
  const toast = useToast();
  const dialog = useDialog();
  const [brands, setBrands] = useState<BrandPricingItem[]>([]);
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  const [search, setSearch] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'CUSTOM' | 'WITH_PRODUCTS'>('ALL');

  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newBrandName, setNewBrandName] = useState<string>('');
  const [newBrandMin, setNewBrandMin] = useState<number>(15);
  const [newBrandDefault, setNewBrandDefault] = useState<number>(15);
  const [newBrandPartner, setNewBrandPartner] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const list = await brandPricingApi.list();
      setBrands(list);
      const nextDrafts: Record<number, RowDraft> = {};
      for (const b of list) {
        nextDrafts[b.id] = {
          min_markup_percent: Math.max(GLOBAL_MIN, b.min_markup_percent),
          default_markup_percent: Math.max(GLOBAL_MIN, b.default_markup_percent),
        };
      }
      setDrafts(nextDrafts);
    } catch (err) {
      toast.error('Gagal Memuat Standar Merek', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const updateRowDraft = (id: number, patch: Partial<RowDraft>) => {
    setDrafts((prev) => {
      const curr = prev[id] ?? { min_markup_percent: GLOBAL_MIN, default_markup_percent: GLOBAL_MIN };
      const nextMin = Math.min(500, Math.max(GLOBAL_MIN, Math.round((patch.min_markup_percent ?? curr.min_markup_percent) * 100) / 100));
      const rawDefault = patch.default_markup_percent ?? curr.default_markup_percent;
      const nextDefault = Math.min(500, Math.max(nextMin, Math.round(rawDefault * 100) / 100));
      return {
        ...prev,
        [id]: {
          min_markup_percent: nextMin,
          default_markup_percent: nextDefault,
        },
      };
    });
  };

  const isRowDirty = (b: BrandPricingItem): boolean => {
    const d = drafts[b.id];
    if (!d) return false;
    return (
      Math.abs(d.min_markup_percent - b.min_markup_percent) > 0.001 ||
      Math.abs(d.default_markup_percent - b.default_markup_percent) > 0.001
    );
  };

  const handleSaveRow = async (brand: BrandPricingItem, applyToProducts = false) => {
    const draft = drafts[brand.id];
    if (!draft) return;

    if (applyToProducts) {
      const ok = await dialog.confirm({
        title: `Terapkan Markup +${draft.default_markup_percent}% ke Merek ${brand.name}?`,
        message: `Harga jual katalog seluruh ${brand.active_product_count} produk aktif merek ${brand.name} akan dihitung ulang berdasarkan HPP patokan masing-masing dan dicatat ke Audit Log Harga.`,
        confirmLabel: 'Ya, Terapkan Harga',
        cancelLabel: 'Batal',
        tone: 'primary',
      });
      if (!ok) return;
      setApplyingId(brand.id);
    } else {
      setSavingId(brand.id);
    }

    try {
      const res = await brandPricingApi.updatePricing(brand.id, {
        min_markup_percent: draft.min_markup_percent,
        default_markup_percent: draft.default_markup_percent,
        apply_to_products: applyToProducts,
      });
      toast.success(
        applyToProducts ? 'Harga Merek Diterapkan' : 'Standar Merek Disimpan',
        res.message || `Standar margin ${brand.name} diperbarui.`
      );
      await fetchBrands();
      if (applyToProducts) {
        onProductsUpdated?.();
      }
    } catch (err) {
      toast.error('Gagal Menyimpan Standar', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setSavingId(null);
      setApplyingId(null);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBrandName.trim();
    if (!name || isCreating) return;
    const minPct = Math.max(GLOBAL_MIN, newBrandMin);
    const defaultPct = Math.max(minPct, newBrandDefault);

    setIsCreating(true);
    try {
      await brandPricingApi.create({
        name,
        is_partner: newBrandPartner,
        min_markup_percent: minPct,
        default_markup_percent: defaultPct,
      });
      toast.success('Merek Ditambahkan', `Standar margin untuk ${name} berhasil dibuat.`);
      setNewBrandName('');
      setNewBrandMin(15);
      setNewBrandDefault(15);
      setNewBrandPartner(false);
      setShowAddForm(false);
      await fetchBrands();
    } catch (err) {
      toast.error('Gagal Menambah Merek', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredBrands = useMemo(() => {
    const q = search.trim().toLowerCase();
    return brands.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q)) return false;
      if (filterMode === 'CUSTOM' && b.default_markup_percent <= GLOBAL_MIN && b.min_markup_percent <= GLOBAL_MIN) {
        return false;
      }
      if (filterMode === 'WITH_PRODUCTS' && b.active_product_count <= 0) {
        return false;
      }
      return true;
    });
  }, [brands, search, filterMode]);

  const brandPagination = usePagination(filteredBrands, 10, [search, filterMode]);

  const customCount = brands.filter(
    (b) => b.default_markup_percent > GLOBAL_MIN || b.min_markup_percent > GLOBAL_MIN
  ).length;
  const totalActiveProducts = brands.reduce((acc, b) => acc + b.active_product_count, 0);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <Percent className="w-4 h-4 text-blue-600" />
              <span>Pengaturan Standar Margin Penjualan per Merek</span>
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight text-balance">
              Standar Persentase Keuntungan per Merek
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 text-pretty">
              Atur batas minimum keuntungan (lantai global 15%) dan persentase custom tiap merek dengan kontrol plus-minus, lalu terapkan ke katalog bila diperlukan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canManage && (
              <button
                type="button"
                onClick={() => setShowAddForm((prev) => !prev)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Merek</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchBrands}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'motion-safe:animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        {/* Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Merek Terdaftar</span>
            <strong className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5 block">
              {brands.length}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-700 block">Minimum Global Wajib</span>
            <strong className="text-xl font-black text-emerald-800 font-mono tabular-nums mt-0.5 block">
              +{GLOBAL_MIN}%
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700 block">Merek dengan Markup Custom</span>
            <strong className="text-xl font-black text-blue-900 font-mono tabular-nums mt-0.5 block">
              {customCount}
            </strong>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Produk Aktif</span>
            <strong className="text-xl font-black text-slate-900 font-mono tabular-nums mt-0.5 block">
              {totalActiveProducts}
            </strong>
          </div>
        </div>

        {/* Inline Add Brand Form */}
        {showAddForm && canManage && (
          <form
            onSubmit={handleCreateBrand}
            className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs"
          >
            <div className="sm:col-span-4">
              <label htmlFor="new-brand-name" className="block font-bold text-slate-700 mb-1">
                Nama Merek Baru
              </label>
              <input
                id="new-brand-name"
                type="text"
                required
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="mis. BFGoodrich / Michelin"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="new-brand-min" className="block font-bold text-slate-700 mb-1">
                Min. Persen (%)
              </label>
              <input
                id="new-brand-min"
                type="number"
                min={15}
                max={500}
                step="0.5"
                value={newBrandMin}
                onChange={(e) => {
                  const v = Math.max(GLOBAL_MIN, Number(e.target.value) || GLOBAL_MIN);
                  setNewBrandMin(v);
                  if (newBrandDefault < v) setNewBrandDefault(v);
                }}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="new-brand-default" className="block font-bold text-slate-700 mb-1">
                Custom Markup (%)
              </label>
              <input
                id="new-brand-default"
                type="number"
                min={newBrandMin}
                max={500}
                step="0.5"
                value={newBrandDefault}
                onChange={(e) => setNewBrandDefault(Math.max(newBrandMin, Number(e.target.value) || newBrandMin))}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>
            <div className="sm:col-span-2 flex items-center h-9">
              <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={newBrandPartner}
                  onChange={(e) => setNewBrandPartner(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-blue-600"
                />
                <span>Merek Partner</span>
              </label>
            </div>
            <div className="sm:col-span-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold cursor-pointer hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors disabled:opacity-60"
              >
                {isCreating ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        )}

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: `Semua Merek (${brands.length})` },
              { id: 'WITH_PRODUCTS', label: 'Ada Produk Aktif' },
              { id: 'CUSTOM', label: `Custom > 15% (${customCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as 'ALL' | 'CUSTOM' | 'WITH_PRODUCTS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama merek..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Neat Brand Markup Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-center">#</th>
                <th className="py-3 px-4">Merek &amp; SKU</th>
                <th className="py-3 px-4">Minimum Persen (%)</th>
                <th className="py-3 px-4">Custom / Plus-Minus (%)</th>
                <th className="py-3 px-4 text-right">Rata-Rata Katalog</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBrands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">
                      {loading ? 'Memuat daftar merek...' : 'Tidak ada merek yang sesuai filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                brandPagination.pageItems.map((brand, idx) => {
                  const rowNum = (brandPagination.page - 1) * brandPagination.pageSize + idx + 1;
                  const draft = drafts[brand.id] ?? {
                    min_markup_percent: brand.min_markup_percent,
                    default_markup_percent: brand.default_markup_percent,
                  };
                  const dirty = isRowDirty(brand);
                  const isBusy = savingId === brand.id || applyingId === brand.id;
                  const avgBelowMin =
                    brand.avg_current_markup_percent !== null &&
                    brand.avg_current_markup_percent + 0.01 < draft.min_markup_percent;

                  return (
                    <tr
                      key={brand.id}
                      className={`hover:bg-slate-50/80 transition-colors ${dirty ? 'bg-blue-50/30' : ''}`}
                    >
                      <td className="py-3 px-4 text-center font-mono text-slate-400 tabular-nums">
                        {rowNum}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">{brand.name}</span>
                          {brand.is_partner && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                              Partner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          {brand.active_product_count} produk aktif
                          {brand.product_count > brand.active_product_count
                            ? ` · ${brand.product_count - brand.active_product_count} nonaktif`
                            : ''}
                          {brand.zero_price_count > 0 && (
                            <span className="ml-1.5 text-amber-700 font-semibold">
                              ({brand.zero_price_count} belum berharga)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Minimum Persen (%) Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canManage || isBusy || draft.min_markup_percent <= GLOBAL_MIN}
                            onClick={() =>
                              updateRowDraft(brand.id, {
                                min_markup_percent: draft.min_markup_percent - 1,
                              })
                            }
                            aria-label={`Kurangi minimum persen ${brand.name}`}
                            className="w-7 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <div className="relative w-20">
                            <input
                              type="number"
                              min={GLOBAL_MIN}
                              max={500}
                              step="0.5"
                              disabled={!canManage || isBusy}
                              aria-label={`Minimum persen ${brand.name}`}
                              value={draft.min_markup_percent}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (Number.isFinite(parsed)) {
                                  updateRowDraft(brand.id, { min_markup_percent: parsed });
                                }
                              }}
                              className="w-full h-8 pl-2 pr-5 bg-white border border-emerald-300 rounded-lg text-center font-mono font-bold text-emerald-800 tabular-nums focus:outline-none focus:border-emerald-600 disabled:bg-slate-50"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-emerald-700 pointer-events-none">
                              %
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!canManage || isBusy}
                            onClick={() =>
                              updateRowDraft(brand.id, {
                                min_markup_percent: draft.min_markup_percent + 1,
                              })
                            }
                            aria-label={`Tambah minimum persen ${brand.name}`}
                            className="w-7 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Custom / Plus-Minus Column */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canManage || isBusy || draft.default_markup_percent <= draft.min_markup_percent}
                            onClick={() =>
                              updateRowDraft(brand.id, {
                                default_markup_percent: draft.default_markup_percent - 5,
                              })
                            }
                            className="h-8 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                            title="Kurangi 5%"
                          >
                            -5%
                          </button>
                          <button
                            type="button"
                            disabled={!canManage || isBusy || draft.default_markup_percent <= draft.min_markup_percent}
                            onClick={() =>
                              updateRowDraft(brand.id, {
                                default_markup_percent: draft.default_markup_percent - 1,
                              })
                            }
                            aria-label={`Kurangi 1 persen markup ${brand.name}`}
                            className="w-7 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                            title="Kurangi 1%"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative w-24">
                            <input
                              type="number"
                              min={draft.min_markup_percent}
                              max={500}
                              step="0.5"
                              disabled={!canManage || isBusy}
                              aria-label={`Custom markup persen ${brand.name}`}
                              value={draft.default_markup_percent}
                              onChange={(e) => {
                                const parsed = parseFloat(e.target.value);
                                if (Number.isFinite(parsed)) {
                                  updateRowDraft(brand.id, { default_markup_percent: parsed });
                                }
                              }}
                              className="w-full h-8 pl-2 pr-5 bg-white border border-blue-300 rounded-lg text-center font-mono font-extrabold text-slate-900 tabular-nums focus:outline-none focus:border-blue-600 disabled:bg-slate-50"
                            />
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-blue-700 pointer-events-none">
                              %
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={!canManage || isBusy}
                            onClick={() =>
                              updateRowDraft(brand.id, {
                                default_markup_percent: draft.default_markup_percent + 1,
                              })
                            }
                            aria-label={`Tambah 1 persen markup ${brand.name}`}
                            className="w-7 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer transition-colors"
                            title="Tambah 1%"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!canManage || isBusy}
                            onClick={() =>
                              updateRowDraft(brand.id, {
                                default_markup_percent: draft.default_markup_percent + 5,
                              })
                            }
                            className="h-8 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 disabled:opacity-40 text-blue-700 font-mono text-[11px] font-bold cursor-pointer transition-colors"
                            title="Tambah 5%"
                          >
                            +5%
                          </button>
                        </div>
                      </td>

                      {/* Avg Current Catalog Markup */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                        {brand.avg_current_markup_percent !== null ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                              avgBelowMin
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            +{brand.avg_current_markup_percent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {canManage ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={!dirty || isBusy}
                              onClick={() => handleSaveRow(brand, false)}
                              className={`h-8 px-2.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                dirty
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700'
                                  : 'bg-slate-50 text-slate-500 border-slate-200'
                              }`}
                              title="Simpan standar persen merek tanpa mengubah harga produk lama"
                            >
                              {savingId === brand.id ? (
                                <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin" />
                              ) : dirty ? (
                                <Save className="w-3.5 h-3.5" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>{dirty ? 'Simpan' : 'Tersimpan'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={brand.active_product_count === 0 || isBusy}
                              onClick={() => handleSaveRow(brand, true)}
                              className="h-8 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              title={`Simpan & hitung ulang harga jual semua ${brand.active_product_count} produk aktif merek ${brand.name}`}
                            >
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{applyingId === brand.id ? 'Menerapkan...' : 'Terapkan'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Hanya Lihat</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3 bg-white">
          <TablePagination
            page={brandPagination.page}
            pageSize={brandPagination.pageSize}
            totalItems={filteredBrands.length}
            unfilteredTotal={brands.length}
            itemLabel="merek"
            onPageChange={brandPagination.setPage}
            onPageSizeChange={brandPagination.setPageSize}
          />
        </div>
      </div>
    </div>
  );
};
