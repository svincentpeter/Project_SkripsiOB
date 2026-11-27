import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, CircleDot, Disc, Droplets, Package, Plus, RotateCcw, Tag, Wrench } from 'lucide-react';
import { ProductCategory } from '../../../shared/types';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  ariaLabel: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({ ariaLabel, value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`h-8 inline-flex items-center justify-between gap-2 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
          value !== 'ALL'
            ? 'bg-blue-50 border-blue-300 text-blue-800 hover:bg-blue-100/70'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
        }`}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 mt-1.5 min-w-[180px] max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-30 custom-scrollbar"
        >
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-800 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isActive && <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const getShortCategoryName = (code: string, fullName: string): string => {
  const c = (code || '').toUpperCase().trim();
  const normalizedCode = c.replace(/[\s-]+/g, '_');

  if (normalizedCode === 'BAN_MOBIL') return 'Ban Mobil';
  if (normalizedCode === 'BAN_TRUCK' || normalizedCode === 'BAN_TRUK' || normalizedCode.includes('TRUCK') || normalizedCode.includes('TRUK')) {
    return 'Ban Truk';
  }
  if (normalizedCode === 'BAN_JEEP' || normalizedCode.includes('JEEP')) return 'Ban Jeep';
  if (normalizedCode === 'BAN_BARU' || normalizedCode === 'TIRE' || normalizedCode === 'BAN') return 'Ban';
  if (normalizedCode === 'VELG' || normalizedCode === 'WHEEL' || normalizedCode === 'RIMS') return 'Velg';
  if (normalizedCode === 'BAN_DALAM' || normalizedCode === 'INNER_TUBE' || normalizedCode.includes('DALAM')) return 'Ban Dlm';
  if (normalizedCode === 'OLI_PELUMAS' || normalizedCode === 'OIL' || normalizedCode.includes('LUBRICANT') || normalizedCode.includes('OLI')) return 'Oli';
  if (normalizedCode === 'AKSESORIS' || normalizedCode.includes('AKSESOR') || normalizedCode.includes('ACCESSOR')) return 'Aksesori';

  let name = (fullName || '').trim();
  name = name.replace(/\(.*?\)/g, '').trim();
  const lower = name.toLowerCase();

  if (lower.includes('jeep') || lower.includes('offroad') || lower.includes('4x4')) return 'Ban Jeep';
  if (lower.includes('truk') || lower.includes('truck') || lower.includes('niaga') || lower.includes('pickup')) return 'Ban Truk';
  if (lower === 'ban mobil') return 'Ban Mobil';
  if (lower.startsWith('ban mobil baru') || lower === 'ban baru' || lower === 'ban luar') return 'Ban';
  if (lower.startsWith('velg mobil') || lower === 'velg') return 'Velg';
  if (lower.startsWith('oli & pelumas') || lower.startsWith('oli mesin') || lower.startsWith('oli')) return 'Oli';
  if (lower.startsWith('ban dalam') || lower === 'ban dalam') return 'Ban Dlm';
  if (lower.startsWith('aksesoris') || lower.startsWith('aksesori')) return 'Aksesori';

  if (name.includes('&')) {
    const first = name.split('&')[0].trim();
    const parts = first.split(/\s+/);
    if (parts.length > 0 && parts[0].length >= 3) return parts[0];
    if (first.length >= 3 && first.length <= 10) return first;
  }
  const words = name.split(/\s+/);
  if (words.length > 1 && name.length > 10) {
    return words[0];
  }
  return name.slice(0, 10) || code;
};

const renderCategoryIcon = (categoryCode: string) => {
  const code = (categoryCode || '').toUpperCase();
  if (code.includes('VELG')) return <CircleDot className="w-3.5 h-3.5 shrink-0" />;
  if (code.includes('OLI') || code.includes('LUBRICANT')) return <Droplets className="w-3.5 h-3.5 shrink-0" />;
  if (code.includes('DALAM') || code.includes('TUBE')) return <Package className="w-3.5 h-3.5 shrink-0" />;
  if (code.includes('AKSESOR') || code.includes('ACCESSOR')) return <Tag className="w-3.5 h-3.5 shrink-0" />;
  return <Disc className="w-3.5 h-3.5 shrink-0" />;
};

interface PosCatalogToolbarProps {
  availableCategories: ProductCategory[];
  catalogTab: string;
  onSelectTab: (tab: string) => void;
  activeProductsCount: number;
  getCategoryProductCount: (categoryCode: string, categoryId?: string) => number;
  servicesCount: number;
  availableRings: string[];
  selectedRing: string;
  onSelectRing: (ring: string) => void;
  availableBrands: string[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
  stockFilter: 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT';
  onSelectStockFilter: (filter: 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT') => void;
  availableServiceCategories: string[];
  selectedServiceCategory: string;
  onSelectServiceCategory: (category: string) => void;
  hasActiveFilter: boolean;
  onResetFilters: () => void;
  filteredCount: number;
}

export const PosCatalogToolbar: React.FC<PosCatalogToolbarProps> = ({
  availableCategories,
  catalogTab,
  onSelectTab,
  activeProductsCount,
  getCategoryProductCount,
  servicesCount,
  availableRings,
  selectedRing,
  onSelectRing,
  availableBrands,
  selectedBrand,
  onSelectBrand,
  stockFilter,
  onSelectStockFilter,
  availableServiceCategories,
  selectedServiceCategory,
  onSelectServiceCategory,
  hasActiveFilter,
  onResetFilters,
  filteredCount,
}) => {
  const visibleCategories = availableCategories.filter((cat) => {
    const count = getCategoryProductCount(cat.category_code, cat.id);
    return count > 0 || catalogTab === cat.category_code;
  });

  const tabClass = (active: boolean) =>
    `h-8 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-[background-color,color,border-color] duration-150 cursor-pointer whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
      active
        ? 'bg-blue-700 text-white shadow-2xs'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900'
    }`;

  const countPillClass = (active: boolean) =>
    `text-[11px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums leading-none ${
      active ? 'bg-white/20 text-white' : 'bg-white text-slate-600 border border-slate-200/80'
    }`;

  return (
    <div className="shrink-0">
      {/* Baris 1: Tab Kategori Produk + Jasa + Jasa Manual (selalu 1 baris bersih) */}
      <div
        role="tablist"
        aria-label="Kategori katalog POS"
        className="px-3 sm:px-4 py-2 bg-white border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      >
        <button
          type="button"
          role="tab"
          aria-selected={catalogTab === 'ALL'}
          onClick={() => onSelectTab('ALL')}
          className={tabClass(catalogTab === 'ALL')}
          title="Tampilkan semua produk katalog"
        >
          <Disc className="w-3.5 h-3.5 shrink-0" />
          <span>Semua</span>
          <span className={countPillClass(catalogTab === 'ALL')}>{activeProductsCount}</span>
        </button>

        {visibleCategories.map((cat) => {
          const isSelected = catalogTab === cat.category_code;
          const count = getCategoryProductCount(cat.category_code, cat.id);
          const shortName = getShortCategoryName(cat.category_code, cat.category_name);
          return (
            <button
              key={cat.id || cat.category_code}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => onSelectTab(cat.category_code)}
              className={tabClass(isSelected)}
              title={cat.category_name}
            >
              {renderCategoryIcon(cat.category_code)}
              <span>{shortName}</span>
              <span className={countPillClass(isSelected)}>{count}</span>
            </button>
          );
        })}

        <div className="h-5 w-px bg-slate-200 mx-1 shrink-0" aria-hidden="true" />

        <button
          type="button"
          role="tab"
          aria-selected={catalogTab === 'SERVICES'}
          onClick={() => onSelectTab('SERVICES')}
          className={tabClass(catalogTab === 'SERVICES')}
          title="Daftar Tarif Jasa dan Layanan Pit Omah Ban"
        >
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span>Jasa</span>
          <span className={countPillClass(catalogTab === 'SERVICES')}>{servicesCount}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={catalogTab === 'MANUAL'}
          onClick={() => onSelectTab('MANUAL')}
          className={`h-8 shrink-0 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold transition-[background-color,color,border-color] duration-150 cursor-pointer whitespace-nowrap select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
            catalogTab === 'MANUAL'
              ? 'bg-blue-700 text-white shadow-2xs'
              : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50/50'
          }`}
          title="Input Jasa Manual Non-Katalog"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Jasa Manual</span>
        </button>
      </div>

      {/* Baris 2: Filter Cepat Ring / Kategori Jasa + Merek + Stok */}
      {catalogTab !== 'MANUAL' && (
        <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2">
          {catalogTab === 'SERVICES' ? (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-1">Kategori:</span>
                <button
                  type="button"
                  onClick={() => onSelectServiceCategory('ALL')}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    selectedServiceCategory === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Semua
                </button>
                {availableServiceCategories.map((sc) => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => onSelectServiceCategory(selectedServiceCategory === sc ? 'ALL' : sc)}
                    className={`h-7 px-2.5 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      selectedServiceCategory === sc
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sc.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="h-7 px-2.5 rounded-md text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
                <span className="text-xs text-slate-600 font-medium whitespace-nowrap tabular-nums">
                  <strong className="text-slate-900 font-bold">{filteredCount}</strong> Jasa
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0">
                {availableRings.length > 0 && (
                  <>
                    <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-1">Ring:</span>
                    <button
                      type="button"
                      onClick={() => onSelectRing('ALL')}
                      className={`h-7 px-2.5 rounded-md text-xs font-semibold shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                        selectedRing === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Semua
                    </button>
                    {availableRings.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => onSelectRing(selectedRing === r ? 'ALL' : r)}
                        className={`h-7 px-2.5 rounded-md text-xs font-semibold tabular-nums shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                          selectedRing === r
                            ? 'bg-blue-700 text-white'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {r.startsWith('R') ? r : `R${r}`}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {availableBrands.length > 1 && (
                  <FilterDropdown
                    ariaLabel="Filter merek produk"
                    value={selectedBrand}
                    onChange={onSelectBrand}
                    options={[
                      { value: 'ALL', label: `Semua Merek (${availableBrands.length})` },
                      ...availableBrands.map((b) => ({ value: b, label: b })),
                    ]}
                  />
                )}

                <FilterDropdown
                  ariaLabel="Filter ketersediaan stok"
                  value={stockFilter}
                  onChange={(val) => onSelectStockFilter(val as 'ALL' | 'AVAILABLE' | 'LOW' | 'OUT')}
                  options={[
                    { value: 'ALL', label: 'Stok: Semua' },
                    { value: 'AVAILABLE', label: 'Tersedia (> 0)' },
                    { value: 'LOW', label: 'Stok Menipis' },
                    { value: 'OUT', label: 'Stok Habis (0)' },
                  ]}
                />

                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 inline-flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}

                <span className="text-xs text-slate-600 font-medium whitespace-nowrap tabular-nums pl-1">
                  <strong className="text-slate-900 font-bold">{filteredCount}</strong> Produk
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
