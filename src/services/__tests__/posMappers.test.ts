import { describe, expect, it } from 'vitest';
import {
  ApiSale,
  buildPayments,
  cartLineToPayload,
  mapBooking,
  mapSaleToTransaction,
  serviceCartProduct,
} from '../api/posMappers';
import { CartItem, ProductItem, ServiceMasterItem } from '../../shared/types';

const product = { id: '42', product_name: 'Bridgestone Ecopia', name: 'Bridgestone Ecopia', product_price: 900000, stock: 5 } as ProductItem;
const service: ServiceMasterItem = {
  id: '7', service_code: 'JS', service_name: 'Spooring', category: 'SPOORING', standard_price: 150000, cost_price: 0, is_active: true,
};

describe('cartLineToPayload', () => {
  it('sends catalog product id, price override and per-item discount', () => {
    const line: CartItem = { item_type: 'PRODUCT', product, qty: 2, discount_per_item: 10000, custom_price: 880000 };
    expect(cartLineToPayload(line)).toEqual({
      type: 'PRODUCT', product_id: 42, service_id: undefined, name: 'Bridgestone Ecopia',
      quantity: 2, unit_price: 880000, discount_per_item: 10000, is_manual: false, cost_price: undefined,
    });
  });

  it('never sends a product id for service lines', () => {
    const line: CartItem = { item_type: 'SERVICE', product: serviceCartProduct(service), service, qty: 1, discount_per_item: 0 };
    const payload = cartLineToPayload(line);
    expect(payload.product_id).toBeUndefined();
    expect(payload).toMatchObject({ type: 'SERVICE', service_id: 7, unit_price: 150000, name: 'Spooring' });
  });

  it('marks manual items and sends their typed cost', () => {
    const manual: CartItem = {
      item_type: 'PRODUCT', product: { id: 'manual-1', product_name: 'Pentil' } as ProductItem,
      qty: 4, discount_per_item: 0, custom_price: 25000, custom_hpp: 10000, custom_name_override: 'Pentil Racing', is_manual: true,
    };
    expect(cartLineToPayload(manual)).toMatchObject({ product_id: undefined, is_manual: true, cost_price: 10000, name: 'Pentil Racing' });
  });
});

describe('buildPayments', () => {
  it('single cash keeps tendered amount for change', () => {
    expect(buildPayments('TUNAI', 950000, 1000000)).toEqual([
      expect.objectContaining({ method: 'TUNAI', amount: 950000, tendered: 1000000, fee_percentage: 0 }),
    ]);
  });

  it('only sends QRIS fee percentage when a fee was charged', () => {
    expect(buildPayments('QRIS', 400000, 0, { fee_percentage: 0.7, fee_amount: 0 })[0].fee_percentage).toBe(0);
    expect(buildPayments('QRIS', 900000, 0, { fee_percentage: 0.7, fee_amount: 6300, reference: 'POS-1' })[0])
      .toMatchObject({ fee_percentage: 0.7, reference: 'POS-1' });
  });

  it('EDC credit surcharge is charged to the customer', () => {
    expect(buildPayments('EDC_CREDIT', 1000000, 0, { edc_type: 'Credit', fee_percentage: 2, surcharge_amount: 20000 })[0])
      .toMatchObject({ method: 'EDC_CREDIT', fee_percentage: 2, charge_to_customer: true });
  });

  it('split overpay becomes change taken from the cash row', () => {
    const rows = buildPayments('SPLIT' as any, 1000000, 0, {
      split_payments: [
        { id: 'a', method: 'TUNAI', amount: 500000 },
        { id: 'b', method: 'EDC', edc_type: 'Debit', amount: 600000, fee_percentage: 0.5, fee_amount: 3000 },
      ],
    });
    expect(rows).toEqual([
      expect.objectContaining({ method: 'TUNAI', amount: 400000, tendered: 500000 }),
      expect.objectContaining({ method: 'EDC_DEBIT', amount: 600000, fee_percentage: 0.5 }),
    ]);
  });
});

describe('mapSaleToTransaction', () => {
  const sale: ApiSale = {
    id: 9, reference: 'OB3-INV-202609-0009', date: '2026-09-24', created_at: '2026-09-24T03:15:00Z',
    customer_name: 'Budi', vehicle_plate: 'AA 1 BB', cashier_name: 'Kasir OB3',
    gross_sales_amount: 2000000, discount_amount: 150000, tax_percentage: 0, tax_amount: 0,
    total_amount: 1850000, paid_amount: 1850000, change_amount: 150000, dp_applied: 0,
    payment_method: 'TUNAI', fee_amount: 0, surcharge_amount: 0, net_received: 1850000,
    total_hpp: 1100000, total_profit: 750000, status: 'LUNAS',
    items: [{
      id: 1, item_type: 'PRODUCT', item_name: 'Ban A', product_id: 42, service_id: null, is_manual: false,
      quantity: 2, unit_price: 1000000, discount_per_item: 25000, sub_total: 1950000, unit_cost_hpp: 550000, total_cost_hpp: 1100000,
      product: { id: 42, product_name: 'Ban A', brand: 'Bridgestone' },
    }],
    payments: [{ method: 'TUNAI', account_code: '1-1000', amount: 1850000, tendered_amount: 2000000, change_amount: 150000, fee_percentage: 0, fee_amount: 0, surcharge_amount: 0, net_received: 1850000 }],
    journals: [],
  };

  it('separates line discounts from the nota discount and keeps server totals', () => {
    const tx = mapSaleToTransaction(sale);
    expect(tx.subtotal).toBe(1950000);
    expect(tx.total_discount).toBe(100000);
    expect(tx.grand_total).toBe(1850000);
    expect(tx.amount_paid).toBe(2000000);
    expect(tx.items[0].product.id).toBe('42');
    expect(tx.split_payments).toBeUndefined();
  });

  it('maps BON and VOID states', () => {
    expect(mapSaleToTransaction({ ...sale, payment_method: 'BON', status: 'PENDING' }).payment_method).toBe('HUTANG_BON');
    expect(mapSaleToTransaction({ ...sale, status: 'VOID', voided_by: 'Owner' }).is_voided).toBe(true);
  });
});

describe('mapBooking', () => {
  it('links booked lines back to the live catalog product and service', () => {
    const rec = mapBooking(
      {
        id: 3, booking_number: 'BK-202609-0001', date: '2026-09-24', created_at: '', customer_name: 'Sari', customer_phone: '08',
        vehicle_plate: 'AA', items: [
          { type: 'PRODUCT', product_id: 42, service_id: null, name: 'x', quantity: 1, unit_price: 900000, discount_per_item: 0, is_manual: false, cost_price: 0 },
          { type: 'SERVICE', product_id: null, service_id: 7, name: 'y', quantity: 1, unit_price: 150000, discount_per_item: 0, is_manual: false, cost_price: 0 },
        ],
        estimated_total: 1050000, dp_amount: 300000, remaining_amount: 750000, payment_method: 'TUNAI', status: 'ACTIVE', journals: [],
      },
      [product],
      [service]
    );
    expect(rec.items[0].product).toBe(product);
    expect(rec.items[1].service).toBe(service);
    expect(cartLineToPayload(rec.items[1]).product_id).toBeUndefined();
  });
});
