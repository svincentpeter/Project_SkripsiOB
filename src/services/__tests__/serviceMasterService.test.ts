import { describe, it, expect } from 'vitest';
import { 
  createServiceCategory, 
  updateServiceCategory, 
  deleteServiceCategory, 
  createServiceItem,
  generateServiceCode
} from '../serviceMasterService';
import { ServiceCategoryItem, ServiceMasterItem } from '../../shared/types';

describe('ServiceMasterService', () => {
  const initialCategories: ServiceCategoryItem[] = [
    { id: 'scat-01', code: 'SPOORING', name: 'Spooring 3D', is_active: true },
    { id: 'scat-02', code: 'BALANCING', name: 'Balancing Roda', is_active: true },
  ];

  const initialServices: ServiceMasterItem[] = [
    {
      id: 'srv-01',
      service_code: 'SRV-SPR-100',
      service_name: 'Spooring 3D Sedan',
      category: 'SPOORING',
      standard_price: 150000,
      cost_price: 0,
      is_active: true,
    },
  ];

  it('generates proper service code with category prefix', () => {
    const code = generateServiceCode('SPOORING');
    expect(code).toMatch(/^SRV-SPR-\d+$/);
  });

  it('creates new service category', () => {
    const result = createServiceCategory(initialCategories, {
      code: 'GANTI_OLI',
      name: 'Servis Ringan & Ganti Oli',
    });

    expect(result.success).toBe(true);
    expect(result.updatedCategories).toHaveLength(3);
    expect(result.createdCategory?.code).toBe('GANTI_OLI');
  });

  it('prevents duplicate service category code', () => {
    const result = createServiceCategory(initialCategories, {
      code: 'SPOORING',
      name: 'Spooring Duplikat',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('sudah ada');
  });

  it('blocks deletion of service category when in use', () => {
    const result = deleteServiceCategory(initialCategories, 'scat-01', initialServices);
    expect(result.success).toBe(false);
    expect(result.error).toContain('tidak dapat dihapus karena masih digunakan');
  });

  it('allows deletion of unused service category', () => {
    const result = deleteServiceCategory(initialCategories, 'scat-02', initialServices);
    expect(result.success).toBe(true);
    expect(result.updatedCategories).toHaveLength(1);
    expect(result.updatedCategories[0].code).toBe('SPOORING');
  });

  it('creates service item with active status', () => {
    const { updatedServices, createdService } = createServiceItem(initialServices, {
      service_code: 'SRV-BLC-200',
      service_name: 'Balancing Roda 4 Titik',
      category: 'BALANCING',
      standard_price: 140000,
      cost_price: 20000,
    });

    expect(updatedServices).toHaveLength(2);
    expect(createdService.is_active).toBe(true);
    expect(createdService.service_code).toBe('SRV-BLC-200');
  });
});
