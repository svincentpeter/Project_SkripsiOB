import { describe, expect, it } from 'vitest';
import { ApiSale, buildPayments, cartLineToPayload, mapPaymentProvider, mapSaleToTransaction, providerIdOf, serviceCartProduct } from '../api/posMappers';
import { CartItem, PaymentProviderSetting, ProductItem, ServiceMasterItem } from '../../shared/types';

const product = { id: '42', product_name: 'Bridgestone Ecopia', name: 'Bridgestone Ecopia', product_price: 900000, stock: 5 } as ProductItem;
const service: ServiceMasterItem = {
  id: '7', service_code: 'JS', service_name: 'Spooring', category: 'SPOORING', standard_price: 150000, cost_price: 0, is_active: true,
};

/** Field DP booking, BON dan EDC yang sudah dihapus: tidak boleh dikirim ke server atau dipetakan dari server. */
const REMOVED_PAYMENT_KEYS = ['charge_to_customer', 'edc_bank', 'edc_type', 'surcharge_amount'];
const REMOVED_SALE_KEYS = ['dp_applied', 'due_date', 'is_bon', 'edc_bank', 'edc_type', 'surcharge_amount'];
const removedKeys = (row: object, removed: string[]) => Object.keys(row).filter((k) => removed.includes(k));

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
    const rows = buildPayments('TUNAI', 950000, 1000000, { provider_id: 3 });
    expect(rows).toEqual([expect.objectContaining({ method: 'TUNAI', amount: 950000, tendered: 1000000 })]);
    expect(rows[0].provider_id).toBeUndefined();
  });

  it('sends the server provider id and never a client fee or provider name', () => {
    const [row] = buildPayments('QRIS', 900000, 0, {
      provider_id: 3, reference: 'POS-1',
    });
    expect(row).toEqual({ method: 'QRIS', amount: 900000, tendered: undefined, provider_id: 3, reference: 'POS-1' });
    expect(row).not.toHaveProperty('fee_percentage');
    expect(row).not.toHaveProperty('provider_name');
  });

  it('split overpay becomes change taken from the cash row', () => {
    const rows = buildPayments('SPLIT', 1000000, 0, {
      split_payments: [
        { id: 'a', method: 'TUNAI', amount: 500000 },
        { id: 'b', method: 'QRIS', provider_name: 'BCA', provider_id: 5, amount: 600000, fee_percentage: 0.3, fee_amount: 1800 },
      ],
    });
    expect(rows).toEqual([
      expect.objectContaining({ method: 'TUNAI', amount: 400000, tendered: 500000 }),
      expect.objectContaining({ method: 'QRIS', amount: 600000, provider_id: 5 }),
    ]);
    rows.forEach((row) => expect(row).not.toHaveProperty('fee_percentage'));
  });

  it('sends no payment rows for a Rp 0 sale', () => {
    expect(buildPayments('TUNAI', 0, 0)).toEqual([]);
  });

  it('never sends BON, DP or EDC fields', () => {
    const rows = [
      ...buildPayments('TRANSFER_BCA', 500000, 0, { provider_id: 1 }),
      ...buildPayments('SPLIT', 1000000, 0, {
        split_payments: [
          { id: 'a', method: 'TUNAI', amount: 400000 },
          { id: 'b', method: 'QRIS', amount: 600000, fee_percentage: 0.3, fee_amount: 1800 },
        ],
      }),
    ];
    rows.forEach((row) => expect(removedKeys(row, REMOVED_PAYMENT_KEYS)).toEqual([]));
  });
});

describe('mapPaymentProvider', () => {
  it('turns server decimal strings into numbers', () => {
    expect(
      mapPaymentProvider({
        id: 4, method_type: 'qris', provider_name: 'BCA', provider_code: null,
        fee_percentage: '0.30', fee_threshold_amount: '500000.00', is_active: true,
      })
    ).toEqual({
      id: 4, method_type: 'qris', provider_name: 'BCA', provider_code: undefined,
      fee_percentage: 0.3, fee_threshold_amount: 500000, is_active: true,
    });
  });
});

describe('providerIdOf', () => {
  const opts = [
    { id: 1, method_type: 'qris', provider_name: 'BCA', is_active: true },
    { id: '2', method_type: 'qris', provider_name: 'Mandiri', is_active: true },
  ] as PaymentProviderSetting[];

  it('finds the provider by name and only falls back to the first one when asked', () => {
    expect(providerIdOf(opts, 'Mandiri')).toBe(2);
    expect(providerIdOf(opts, 'Unknown')).toBeUndefined();
    expect(providerIdOf(opts, 'Unknown', true)).toBe(1);
    expect(providerIdOf([], 'BCA', true)).toBeUndefined();
  });
});

describe('mapSaleToTransaction', () => {
  const sale: ApiSale = {
    id: 9, reference: 'OB3-INV-202609-0009', date: '2026-09-24', created_at: '2026-09-24T03:15:00Z',
    customer_name: 'Budi', vehicle_plate: 'AA 1 BB', cashier_name: 'Kasir OB3',
    gross_sales_amount: 2000000, discount_amount: 150000,
    total_amount: 1850000, paid_amount: 1850000, change_amount: 150000,
    payment_method: 'TUNAI', fee_amount: 0, net_received: 1850000,
    total_hpp: 1100000, total_profit: 750000, status: 'LUNAS',
    items: [{
      id: 1, item_type: 'PRODUCT', item_name: 'Ban A', product_id: 42, service_id: null, is_manual: false,
      quantity: 2, unit_price: 1000000, discount_per_item: 25000, sub_total: 1950000, unit_cost_hpp: 550000, total_cost_hpp: 1100000,
      product: { id: 42, product_name: 'Ban A', brand: 'Bridgestone' },
    }],
    payments: [{ method: 'TUNAI', account_code: '1-1000', amount: 1850000, tendered_amount: 2000000, change_amount: 150000, fee_percentage: 0, fee_amount: 0, net_received: 1850000 }],
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

  it('maps the VOID state', () => {
    expect(mapSaleToTransaction({ ...sale, status: 'VOID', voided_by: 'Owner' }).is_voided).toBe(true);
  });

  it('maps no BON, DP or EDC fields, also for split payments', () => {
    const split = mapSaleToTransaction({
      ...sale,
      payment_method: 'SPLIT',
      payments: [
        sale.payments[0],
        { method: 'QRIS', account_code: '1-1001', amount: 600000, tendered_amount: 600000, change_amount: 0, fee_percentage: 0.3, fee_amount: 1800, net_received: 598200, provider_name: 'BCA' },
      ],
    });
    expect(removedKeys(mapSaleToTransaction(sale), REMOVED_SALE_KEYS)).toEqual([]);
    expect(removedKeys(split, REMOVED_SALE_KEYS)).toEqual([]);
    expect(split.split_payments).toHaveLength(2);
    split.split_payments?.forEach((p) => expect(removedKeys(p, REMOVED_PAYMENT_KEYS)).toEqual([]));
  });
});
