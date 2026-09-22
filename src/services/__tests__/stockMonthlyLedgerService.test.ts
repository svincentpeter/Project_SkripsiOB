import { describe, it, expect } from 'vitest';
import { calculateClientStockLedger } from '../stockMonthlyLedgerService';
import { ProductItem, PosTransaction, StockMutation } from '../../shared/types';

describe('stockMonthlyLedgerService', () => {
  const mockProducts: ProductItem[] = [
    {
      id: 'prod-1',
      product_code: 'BRI-1856515-TUR',
      product_name: 'Bridgestone Turanza 185/65 R15',
      name: 'Bridgestone Turanza 185/65 R15',
      barcode: '888001',
      condition_code: 'BARU',
      brand: 'Bridgestone',
      product_size: '185/65 R15',
      ring: 'R15',
      category: 'BAN_BARU',
      product_cost: 700000,
      cost_price: 700000,
      product_price: 850000,
      product_quantity: 15,
      stock: 15,
      product_stock_alert: 2,
      min_stock: 2,
      stok_awal: 10,
      is_active: true,
      batches: [
        {
          id: 'b-1',
          product_id: 'prod-1',
          batch_code: 'B-01',
          source_name: 'PT Bridgestone',
          purchase_date: '2026-09-01',
          batch_cost: 700000,
          initial_qty: 10,
          remaining_qty: 5,
        },
        {
          id: 'b-2',
          product_id: 'prod-1',
          batch_code: 'B-02',
          source_name: 'PT Bridgestone',
          purchase_date: '2026-09-10',
          batch_cost: 720000,
          initial_qty: 10,
          remaining_qty: 10,
        },
      ],
    },
    {
      id: 'prod-2',
      product_code: 'ACC-1955016-PHI',
      product_name: 'Accelera Phi-R 195/50 R16',
      name: 'Accelera Phi-R 195/50 R16',
      barcode: '888002',
      condition_code: 'BARU',
      brand: 'Accelera',
      product_size: '195/50 R16',
      ring: 'R16',
      category: 'BAN_BARU',
      product_cost: 580000,
      cost_price: 580000,
      product_price: 690000,
      product_quantity: 0,
      stock: 0,
      product_stock_alert: 2,
      min_stock: 2,
      stok_awal: 4,
      is_active: true,
      batches: [],
    },
  ];

  const mockTransactions: PosTransaction[] = [
    {
      id: 'tx-1',
      reference: 'INV-20260912-001',
      invoice_number: 'INV-20260912-001',
      date: '2026-09-12T10:00:00Z',
      timestamp: '2026-09-12T10:00:00Z',
      cashier_name: 'Kasir',
      customer_name: 'Pelanggan',
      vehicle_plate: 'B 1234 CD',
      subtotal: 3400000,
      gross_sales_amount: 3400000,
      total_discount: 0,
      discount_amount: 0,
      tax_amount: 0,
      tax_rate: 0,
      tax_percentage: 0,
      grand_total: 3400000,
      total_cost_hpp: 2800000,
      total_hpp: 2800000,
      gross_profit: 600000,
      total_profit: 600000,
      amount_paid: 3400000,
      paid_amount: 3400000,
      change_amount: 0,
      items: [
        {
          product: mockProducts[0],
          qty: 4,
          discount_per_item: 0,
        },
      ],
      total_amount: 3400000,
      payment_method: 'TUNAI',
      status: 'LUNAS',
    },
  ];

  const mockMutations: StockMutation[] = [
    {
      id: 'mut-1',
      tire_id: 'prod-1',
      tire_name: 'Bridgestone Turanza',
      tire_size: '185/65 R15',
      ref_doc: 'PO-001',
      type: 'MASUK',
      qty: 10,
      balance: 16,
      notes: 'Restock Penerimaan Barang',
      operator: 'Admin',
      date: '2026-09-10T09:00:00Z',
    },
  ];

  it('calculates daily sales on day 12 and groups FIFO batches', () => {
    const result = calculateClientStockLedger(mockProducts, mockTransactions, mockMutations, '2026-09');

    expect(result.rows.length).toBe(2);
    const row = result.rows.find((r) => r.id === 'prod-1')!;
    expect(row).toBeDefined();
    expect(row.daily_sales[12]).toBe(4);
    expect(row.sold).toBe(4);
    expect(row.restock).toBe(10);
    expect(row.layers.length).toBe(2);
    expect(result.summary.total_valuation_cogs).toBe(5 * 700000 + 10 * 720000);
    expect(result.summary.empty_stock_count).toBe(1); // prod-2 has 0 stock
  });

  it('filters by brand correctly', () => {
    const result = calculateClientStockLedger(mockProducts, mockTransactions, mockMutations, '2026-09', 'Accelera');

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].brand_name).toBe('Accelera');
  });
});
