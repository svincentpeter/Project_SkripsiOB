import { ServiceCategory, ServiceCategoryItem, ServiceMasterItem } from '../shared/types';
import { INITIAL_SERVICE_CATEGORIES } from '../shared/data/mockData';

const SERVICE_CATEGORIES_STORAGE_KEY = 'omahban_service_categories';

/**
 * Generate standardized service code
 */
export const generateServiceCode = (category: ServiceCategory): string => {
  const prefixMap: Record<string, string> = {
    SPOORING: 'SRV-SPR',
    BALANCING: 'SRV-BLC',
    BONGKAR_PASANG: 'SRV-PSG',
    PERBAIKAN_BAN: 'SRV-TMB',
    NITROGEN: 'SRV-N2',
    JASA_MANUAL: 'SRV-MNL',
    GANTI_OLI: 'SRV-OIL',
  };
  const prefix = prefixMap[category.toUpperCase()] || 'SRV-GEN';
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randomSuffix}`;
};

/**
 * Fetch service categories from storage
 */
export const fetchServiceCategoriesFromStorage = (): ServiceCategoryItem[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_SERVICE_CATEGORIES;
  }
  try {
    const raw = localStorage.getItem(SERVICE_CATEGORIES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SERVICE_CATEGORIES_STORAGE_KEY, JSON.stringify(INITIAL_SERVICE_CATEGORIES));
      return INITIAL_SERVICE_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[ServiceMasterService] Failed to read service categories:', err);
  }
  return INITIAL_SERVICE_CATEGORIES;
};

/**
 * Save service categories to storage
 */
export const saveServiceCategoriesToStorage = (categories: ServiceCategoryItem[]): void => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(SERVICE_CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.error('[ServiceMasterService] Failed to save categories:', err);
  }
};

/**
 * Augment service categories with live service item counts
 */
export const attachServiceCount = (
  categories: ServiceCategoryItem[],
  services: ServiceMasterItem[]
): ServiceCategoryItem[] => {
  return categories.map((cat) => {
    const count = services.filter((s) => s.category.toUpperCase() === cat.code.toUpperCase()).length;
    return {
      ...cat,
      service_count: count,
    };
  });
};

/**
 * Create a new service category
 */
export const createServiceCategory = (
  categories: ServiceCategoryItem[],
  input: { code: string; name: string; description?: string }
): { success: boolean; error?: string; updatedCategories: ServiceCategoryItem[]; createdCategory?: ServiceCategoryItem } => {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  const name = input.name.trim();

  if (!code || !name) {
    return { success: false, error: 'Kode dan Nama kategori jasa wajib diisi.', updatedCategories: categories };
  }

  if (categories.some((c) => c.code.toUpperCase() === code)) {
    return { success: false, error: `Kode kategori jasa "${code}" sudah ada.`, updatedCategories: categories };
  }

  const newCat: ServiceCategoryItem = {
    id: `scat-${Date.now()}`,
    code,
    name,
    description: input.description?.trim() || '',
    is_active: true,
    service_count: 0,
  };

  const updatedCategories = [...categories, newCat];
  saveServiceCategoriesToStorage(updatedCategories);

  return { success: true, updatedCategories, createdCategory: newCat };
};

/**
 * Update a service category
 */
export const updateServiceCategory = (
  categories: ServiceCategoryItem[],
  id: string,
  updates: Partial<ServiceCategoryItem>
): { success: boolean; error?: string; updatedCategories: ServiceCategoryItem[] } => {
  const target = categories.find((c) => c.id === id);
  if (!target) {
    return { success: false, error: 'Kategori jasa tidak ditemukan.', updatedCategories: categories };
  }

  if (updates.code) {
    const newCode = updates.code.trim().toUpperCase();
    if (categories.some((c) => c.id !== id && c.code.toUpperCase() === newCode)) {
      return { success: false, error: `Kode "${newCode}" sudah digunakan.`, updatedCategories: categories };
    }
  }

  const updatedCategories = categories.map((c) =>
    c.id === id ? { ...c, ...updates, code: updates.code ? updates.code.trim().toUpperCase() : c.code } : c
  );

  saveServiceCategoriesToStorage(updatedCategories);
  return { success: true, updatedCategories };
};

/**
 * Delete a service category safely
 */
export const deleteServiceCategory = (
  categories: ServiceCategoryItem[],
  id: string,
  services: ServiceMasterItem[]
): { success: boolean; error?: string; updatedCategories: ServiceCategoryItem[] } => {
  const target = categories.find((c) => c.id === id);
  if (!target) {
    return { success: false, error: 'Kategori tidak ditemukan.', updatedCategories: categories };
  }

  const inUse = services.filter((s) => s.category.toUpperCase() === target.code.toUpperCase());
  if (inUse.length > 0) {
    return {
      success: false,
      error: `Kategori "${target.name}" tidak dapat dihapus karena masih digunakan oleh ${inUse.length} layanan jasa aktif.`,
      updatedCategories: categories,
    };
  }

  const updatedCategories = categories.filter((c) => c.id !== id);
  saveServiceCategoriesToStorage(updatedCategories);
  return { success: true, updatedCategories };
};

/**
 * Service Item CRUD
 */
export const createServiceItem = (
  services: ServiceMasterItem[],
  input: Omit<ServiceMasterItem, 'id' | 'is_active'>
): { updatedServices: ServiceMasterItem[]; createdService: ServiceMasterItem } => {
  const newService: ServiceMasterItem = {
    ...input,
    id: `srv-${Date.now()}`,
    service_code: input.service_code || generateServiceCode(input.category),
    is_active: true,
  };

  return {
    updatedServices: [newService, ...services],
    createdService: newService,
  };
};

export const updateServiceItem = (
  services: ServiceMasterItem[],
  serviceId: string,
  updates: Partial<ServiceMasterItem>
): ServiceMasterItem[] => {
  return services.map((srv) => (srv.id === serviceId ? { ...srv, ...updates } : srv));
};

export const deleteOrToggleServiceItem = (
  services: ServiceMasterItem[],
  serviceId: string
): ServiceMasterItem[] => {
  return services.map((srv) => (srv.id === serviceId ? { ...srv, is_active: !srv.is_active } : srv));
};

export const deleteServiceItemPermanent = (
  services: ServiceMasterItem[],
  serviceId: string
): ServiceMasterItem[] => {
  return services.filter((srv) => srv.id !== serviceId);
};
