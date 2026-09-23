import { describe, expect, it } from 'vitest';
import {
  mapMovement,
  mapPurchaseToPayable,
  productPayload,
  restockPayload,
} from '../api/inventoryMappers';
import { categoryKind } from '../../shared/utils/categoryKind';
import { ProductCategory, SupplierItem } from '../../shared/types';

const categories: ProductCategory[] = [
  { id: '1', category_code: 'BAN-MOBIL', category_name: 'Ban Mobil', is_active: true },
  { id: '3', category_code: 'VELG-RACING', category_name: 'Velg Racing', is_active: true },
];

describe('categoryKind', () => {
  it('derives the display kind from free-form server codes', () => {
    expect(categoryKind('BAN-MOBIL')).toBe('BAN_BARU');
    expect(categoryKind('BAN-TRUCK', 'Ban Truck Diesel')).toBe('BAN_BARU');
    expect(categoryKind('VELG-RACING')).toBe('VELG');
    expect(categoryKind('BAN-DALAM')).toBe('BAN_DALAM');
    expect(categoryKind('X', 'Oli Mesin')).toBe('OLI_PELUMAS');
    expect(categoryKind('BAN_BARU')).toBe('BAN_BARU');
  });
});

describe('productPayload', () => {
  it('maps category code to id, builds size label and initial batch', () => {
    const payload = productPayload(
      {
        category: 'BAN-MOBIL', brand: 'Bridgestone', product_name: ' Ecopia EP150 ', size_width: 185, size_ratio: '65', ring: 'R15',
        product_cost: 600000, product_price: 800000, product_stock_alert: 4, initial_stock: 6, supplier_name: 'PT Bridgestone',
      },
      categories
    );
    expect(payload).toMatchObject({
      product_name: 'Ecopia EP150', category_id: 1, size_ratio: 65, product_size: '185/65 R15',
      initial_batch: { source_name: 'PT Bridgestone', batch_cost: 600000, initial_qty: 6 },
    });
    expect(payload.product_code).toBeUndefined();
  });

  it('omits initial batch and keeps existing values on update', () => {
    const payload = productPayload({ product_price: 900000 }, categories, {
      product_name: 'Lama', brand: 'Dunlop', product_cost: 500000, product_price: 700000, product_stock_alert: 3,
    });
    expect(payload).toMatchObject({ product_name: 'Lama', brand: 'Dunlop', product_cost: 500000, product_price: 900000 });
    expect(payload.initial_batch).toBeUndefined();
  });
});

describe('restockPayload', () => {
  const suppliers = [{ id: '5', supplier_name: 'PT Bridgestone Tire Indonesia' } as SupplierItem];

  it('maps payment terms and supplier id', () => {
    expect(
      restockPayload({ product_id: '42', incoming_qty: 4, unit_cost: 500000, supplier_name: 'PT Bridgestone Tire Indonesia', payment_terms: 'TEMPO_HUTANG', due_date: '2026-10-30' }, suppliers)
    ).toMatchObject({ product_id: 42, quantity: 4, supplier_id: 5, payment_method: 'TEMPO', due_date: '2026-10-30' });

    expect(
      restockPayload({ product_id: '42', incoming_qty: 1, unit_cost: 1, supplier_name: 'Toko Lain', payment_terms: 'TUNAI_BANK', due_date: '2026-10-30' }, suppliers)
    ).toMatchObject({ supplier_id: undefined, source_name: 'Toko Lain', payment_method: 'TRANSFER_BCA', due_date: undefined });
  });
});

describe('server records to UI', () => {
  it('maps stock movements with readable labels', () => {
    const m = mapMovement({
      id: 9, product_id: 42, movement_type: 'KELUAR', quantity: 2, balance_after: 3, reference_type: 'SALE',
      reference_id: 'OB3-INV-202609-0001', operator_name: 'Kasir OB3', created_at: '2026-09-24T02:10:00.000000Z',
      product: { id: 42, product_name: 'Ban A', product_size: '185/65 R15' },
    });
    expect(m).toMatchObject({ product_id: '42', type: 'KELUAR', qty: 2, balance: 3, description: 'Penjualan kasir', date: '2026-09-24 02:10:00' });
  });

  it('uses the supplier invoice number when present', () => {
    const p = mapPurchaseToPayable({
      id: 3, purchase_number: 'GR-202609-0003', supplier_id: 5, supplier_name: 'PT A', supplier_invoice: 'INV-77',
      purchase_date: '2026-09-20', payment_method: 'TEMPO', due_date: '2026-10-04', total_amount: 2000000,
      paid_amount: 500000, remaining_amount: 1500000, status: 'SEBAGIAN',
    });
    expect(p).toMatchObject({ id: '3', invoice_number: 'INV-77', ref_doc: 'GR-202609-0003', remaining_amount: 1500000, status: 'SEBAGIAN' });
  });
});
