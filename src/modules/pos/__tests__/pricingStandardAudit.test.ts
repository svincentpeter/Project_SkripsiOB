import { describe, it, expect } from 'vitest';
import {
  calculateMarkupPercent,
  getMinSellingPrice,
  getProductReferenceHpp,
  getRecommendedPriceByMarkup,
} from '../../../shared/utils/pricingStandard';
import { cartLineToPayload, restockPayload } from '../../../services/api';
import { CartItem, ProductItem } from '../../../shared/types';

describe('Pricing Standard (+15% HPP Batch FIFO) & Cashier Price Override Payload', () => {
  it('takes the highest active FIFO batch cost or product_cost as reference HPP', () => {
    const product: ProductItem = {
      id: '10',
      category: 'BAN_BARU',
      brand: 'GTRadial',
      product_name: 'Ban Savero Komodo M/T Plus 31x10.5 R15 (Jeep)',
      name: 'Ban Savero Komodo M/T Plus 31x10.5 R15 (Jeep)',
      product_code: 'PRD-JEEP-01',
      barcode: '8990000000010',
      condition_code: 'BARU',
      product_quantity: 8,
      stock: 8,
      product_stock_alert: 3,
      min_stock: 3,
      product_cost: 1100000,
      cost_price: 1100000,
      product_price: 1650000,
      batches: [
        {
          id: 'b1',
          product_id: '10',
          batch_code: 'B-01',
          source_name: 'Supplier A',
          batch_cost: 1000000,
          initial_qty: 4,
          remaining_qty: 4,
          purchase_date: '2026-08-01',
        },
        {
          id: 'b2',
          product_id: '10',
          batch_code: 'B-02',
          source_name: 'Supplier B',
          batch_cost: 1200000,
          initial_qty: 4,
          remaining_qty: 4,
          purchase_date: '2026-09-01',
        },
      ],
    };

    const refHpp = getProductReferenceHpp(product);
    expect(refHpp).toBe(1200000);
    expect(getMinSellingPrice(refHpp)).toBe(1380000); // 1.200.000 * 1,15
    expect(getRecommendedPriceByMarkup(refHpp, 35)).toBe(1620000); // +35% Jeep
    expect(calculateMarkupPercent(1500000, refHpp)).toBe(25);
  });

  it('uses edited overrideCost as reference HPP when product has no active FIFO batches', () => {
    const emptyStockProduct: ProductItem = {
      id: '99',
      category: 'BAN_BARU',
      brand: 'Accelera',
      product_name: 'Ban Kosong',
      name: 'Ban Kosong',
      product_code: 'PRD-99',
      barcode: '89999',
      condition_code: 'BARU',
      product_quantity: 0,
      stock: 0,
      product_stock_alert: 2,
      min_stock: 2,
      product_cost: 999000,
      cost_price: 999000,
      reference_hpp: 999000,
      product_price: 1200000,
      batches: [],
    };

    const updatedHpp = getProductReferenceHpp(emptyStockProduct, 20000);
    expect(updatedHpp).toBe(20000);
    expect(getMinSellingPrice(updatedHpp)).toBe(23000);
  });

  it('forwards cashier override_reason in cartLineToPayload for Audit Log & Owner Notification', () => {
    const item: CartItem = {
      item_type: 'PRODUCT',
      product: {
        id: '15',
        category: 'BAN_BARU',
        brand: 'Bridgestone',
        product_name: 'Bridgestone Dueler M/T 674',
        name: 'Bridgestone Dueler M/T 674',
        product_code: 'PRD-15',
        barcode: '89915',
        condition_code: 'BARU',
        product_quantity: 5,
        stock: 5,
        product_stock_alert: 2,
        min_stock: 2,
        product_cost: 1000000,
        cost_price: 1000000,
        product_price: 1300000,
      },
      qty: 4,
      discount_per_item: 0,
      custom_price: 1450000,
      override_reason: 'Permintaan pembeli (Reimburse ke atasan / kantor)',
      adjusted_by: 'Kasir Rina',
    };

    const payload = cartLineToPayload(item);
    expect(payload.unit_price).toBe(1450000);
    expect(payload.override_reason).toBe('Permintaan pembeli (Reimburse ke atasan / kantor)');
  });

  it('forwards optional selling_price and price_change_reason in restockPayload when batch cost changes', () => {
    const payload = restockPayload(
      {
        product_id: '15',
        incoming_qty: 6,
        unit_cost: 1100000,
        invoice_total: 6600000,
        dpp_amount: 5945946,
        ppn_amount: 654054,
        selling_price: 1400000,
        price_change_reason: 'Penyesuaian harga jual batch 2',
        supplier_name: 'PT Supplier Ban',
        payment_terms: 'TEMPO_HUTANG',
      },
      []
    );

    expect(payload.selling_price).toBe(1400000);
    expect(payload.price_change_reason).toBe('Penyesuaian harga jual batch 2');
  });
});
