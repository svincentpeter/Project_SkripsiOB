import { SupplierItem } from '../shared/types';

export const generateSupplierCode = (suppliers: SupplierItem[]): string => {
  const count = suppliers.length + 1;
  return `SUP-${String(count).padStart(3, '0')}`;
};

export const createSupplierItem = (
  suppliers: SupplierItem[],
  input: Omit<SupplierItem, 'id' | 'is_active'>
): { updatedSuppliers: SupplierItem[]; createdSupplier: SupplierItem } => {
  const newSupplier: SupplierItem = {
    ...input,
    id: `sup-${Date.now()}`,
    supplier_code: input.supplier_code || generateSupplierCode(suppliers),
    is_active: true,
  };

  return {
    updatedSuppliers: [newSupplier, ...suppliers],
    createdSupplier: newSupplier,
  };
};

export const updateSupplierItem = (
  suppliers: SupplierItem[],
  supplierId: string,
  updates: Partial<SupplierItem>
): SupplierItem[] => {
  return suppliers.map((sup) => (sup.id === supplierId ? { ...sup, ...updates } : sup));
};

export const deleteOrToggleSupplierItem = (
  suppliers: SupplierItem[],
  supplierId: string
): SupplierItem[] => {
  return suppliers.map((sup) => (sup.id === supplierId ? { ...sup, is_active: !sup.is_active } : sup));
};
