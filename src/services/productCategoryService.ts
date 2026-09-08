import { ProductCategory, ProductItem } from '../shared/types';
import { INITIAL_PRODUCT_CATEGORIES } from '../shared/data/mockData';

const STORAGE_KEY = 'omahban_product_categories';

/**
 * Generate unique uppercase category code from category name
 */
export const generateCategoryCode = (categoryName: string): string => {
  const sanitized = categoryName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('_');
  return sanitized || 'CAT_BARU';
};

/**
 * Fetch categories from local storage or fallback to mock
 */
export const fetchProductCategoriesFromStorage = (): ProductCategory[] => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return INITIAL_PRODUCT_CATEGORIES;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_PRODUCT_CATEGORIES));
      return INITIAL_PRODUCT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.warn('[CategoryService] Failed to read from localStorage, using fallback:', err);
  }
  return INITIAL_PRODUCT_CATEGORIES;
};

/**
 * Save categories to localStorage
 */
export const saveProductCategoriesToStorage = (categories: ProductCategory[]): void => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (err) {
    console.error('[CategoryService] Failed to save to localStorage:', err);
  }
};

/**
 * Augment categories with live count of associated products
 */
export const attachProductCount = (
  categories: ProductCategory[],
  products: ProductItem[]
): ProductCategory[] => {
  return categories.map((cat) => {
    const count = products.filter((p) => {
      const pCat = (p.category || '').toUpperCase().trim();
      const code = (cat.category_code || '').toUpperCase().trim();
      return pCat === code || (p.category_id && String(p.category_id) === String(cat.id));
    }).length;
    return {
      ...cat,
      product_count: count,
    };
  });
};

/**
 * Create a new product category
 */
export const createProductCategory = (
  categories: ProductCategory[],
  input: {
    category_code: string;
    category_name: string;
    description?: string;
    is_active?: boolean;
  }
): { success: boolean; error?: string; updatedCategories: ProductCategory[]; createdCategory?: ProductCategory } => {
  const code = input.category_code.trim().toUpperCase();
  const name = input.category_name.trim();

  if (!code || !name) {
    return { success: false, error: 'Kode kategori dan Nama kategori wajib diisi.', updatedCategories: categories };
  }

  // Check code uniqueness
  const exists = categories.some((c) => c.category_code.toUpperCase() === code);
  if (exists) {
    return { success: false, error: `Kode kategori "${code}" sudah digunakan. Gunakan kode lain.`, updatedCategories: categories };
  }

  const newCat: ProductCategory = {
    id: `cat-${Date.now()}`,
    category_code: code,
    category_name: name,
    description: input.description?.trim() || '',
    is_active: input.is_active ?? true,
    product_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const updatedCategories = [...categories, newCat];
  saveProductCategoriesToStorage(updatedCategories);

  return {
    success: true,
    updatedCategories,
    createdCategory: newCat,
  };
};

/**
 * Update an existing product category
 */
export const updateProductCategory = (
  categories: ProductCategory[],
  categoryId: string,
  updates: Partial<ProductCategory>
): { success: boolean; error?: string; updatedCategories: ProductCategory[] } => {
  const target = categories.find((c) => c.id === categoryId);
  if (!target) {
    return { success: false, error: 'Kategori tidak ditemukan.', updatedCategories: categories };
  }

  if (updates.category_code) {
    const newCode = updates.category_code.trim().toUpperCase();
    const duplicate = categories.some((c) => c.id !== categoryId && c.category_code.toUpperCase() === newCode);
    if (duplicate) {
      return { success: false, error: `Kode kategori "${newCode}" sudah digunakan kategori lain.`, updatedCategories: categories };
    }
  }

  const updatedCategories = categories.map((c) => {
    if (c.id === categoryId) {
      return {
        ...c,
        ...updates,
        category_code: updates.category_code ? updates.category_code.trim().toUpperCase() : c.category_code,
        category_name: updates.category_name ? updates.category_name.trim() : c.category_name,
        updated_at: new Date().toISOString(),
      };
    }
    return c;
  });

  saveProductCategoriesToStorage(updatedCategories);
  return { success: true, updatedCategories };
};

/**
 * Safe delete category: block if products are still attached!
 */
export const deleteProductCategory = (
  categories: ProductCategory[],
  categoryId: string,
  products: ProductItem[]
): { success: boolean; error?: string; updatedCategories: ProductCategory[] } => {
  const target = categories.find((c) => c.id === categoryId);
  if (!target) {
    return { success: false, error: 'Kategori tidak ditemukan.', updatedCategories: categories };
  }

  // Count products using this category
  const boundProducts = products.filter((p) => {
    const pCat = (p.category || '').toUpperCase().trim();
    const code = (target.category_code || '').toUpperCase().trim();
    return pCat === code || (p.category_id && String(p.category_id) === String(target.id));
  });

  if (boundProducts.length > 0) {
    return {
      success: false,
      error: `Kategori "${target.category_name}" tidak dapat dihapus karena masih digunakan oleh ${boundProducts.length} produk aktif. Ubah atau hapus produk terkait terlebih dahulu.`,
      updatedCategories: categories,
    };
  }

  const updatedCategories = categories.filter((c) => c.id !== categoryId);
  saveProductCategoriesToStorage(updatedCategories);

  return {
    success: true,
    updatedCategories,
  };
};

/**
 * Toggle category active status
 */
export const toggleProductCategoryStatus = (
  categories: ProductCategory[],
  categoryId: string
): ProductCategory[] => {
  const updated = categories.map((c) => (c.id === categoryId ? { ...c, is_active: !c.is_active } : c));
  saveProductCategoriesToStorage(updated);
  return updated;
};
