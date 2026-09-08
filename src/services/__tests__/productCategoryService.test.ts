import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createProductCategory, 
  updateProductCategory, 
  deleteProductCategory, 
  attachProductCount,
  generateCategoryCode
} from '../productCategoryService';
import { ProductCategory, ProductItem } from '../../shared/types';

describe('ProductCategoryService', () => {
  const initialCategories: ProductCategory[] = [
    { id: 'cat-01', category_code: 'BAN_BARU', category_name: 'Ban Mobil Baru', is_active: true },
    { id: 'cat-02', category_code: 'VELG', category_name: 'Velg Mobil Racing', is_active: true },
  ];

  const dummyProducts: ProductItem[] = [
    {
      id: 'prod-01',
      category: 'BAN_BARU',
      brand: 'Bridgestone',
      product_name: 'Turanza ER300',
      name: 'Turanza ER300',
      product_code: 'BRG-185-65-R15',
      barcode: '8991234567890',
      condition_code: 'BARU',
      product_quantity: 10,
      stock: 10,
      product_stock_alert: 2,
      min_stock: 2,
      product_cost: 500000,
      cost_price: 500000,
      product_price: 700000,
    },
  ];

  it('generates sanitized uppercase category code', () => {
    expect(generateCategoryCode('Oli Mesin Diesel')).toBe('OLI_MESIN_DIESEL');
    expect(generateCategoryCode('Sparepart & Aksesoris')).toBe('SPAREPART_AKSESORIS');
  });

  it('creates new product category successfully', () => {
    const result = createProductCategory(initialCategories, {
      category_code: 'OLI_PELUMAS',
      category_name: 'Oli & Pelumas Mesin',
      description: 'Pelumas mesin dan transmisi',
    });

    expect(result.success).toBe(true);
    expect(result.updatedCategories).toHaveLength(3);
    expect(result.createdCategory?.category_code).toBe('OLI_PELUMAS');
  });

  it('rejects duplicate category code', () => {
    const result = createProductCategory(initialCategories, {
      category_code: 'BAN_BARU',
      category_name: 'Ban Mobil Duplikat',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('sudah digunakan');
    expect(result.updatedCategories).toHaveLength(2);
  });

  it('updates existing product category', () => {
    const result = updateProductCategory(initialCategories, 'cat-01', {
      category_name: 'Ban Mobil Penumpang',
    });

    expect(result.success).toBe(true);
    const updated = result.updatedCategories.find((c) => c.id === 'cat-01');
    expect(updated?.category_name).toBe('Ban Mobil Penumpang');
  });

  it('blocks deletion of category when products are bound', () => {
    const result = deleteProductCategory(initialCategories, 'cat-01', dummyProducts);

    expect(result.success).toBe(false);
    expect(result.error).toContain('tidak dapat dihapus karena masih digunakan');
    expect(result.updatedCategories).toHaveLength(2);
  });

  it('allows deletion of category when no products are bound', () => {
    const result = deleteProductCategory(initialCategories, 'cat-02', dummyProducts);

    expect(result.success).toBe(true);
    expect(result.updatedCategories).toHaveLength(1);
    expect(result.updatedCategories[0].id).toBe('cat-01');
  });

  it('attaches accurate product counts', () => {
    const withCounts = attachProductCount(initialCategories, dummyProducts);
    const banCat = withCounts.find((c) => c.category_code === 'BAN_BARU');
    const velgCat = withCounts.find((c) => c.category_code === 'VELG');

    expect(banCat?.product_count).toBe(1);
    expect(velgCat?.product_count).toBe(0);
  });
});
