import { describe, it, expect } from 'vitest';
import { calculateClientStockLedger } from '../stockMonthlyLedgerService';
import { ProductItem, PosTransaction, StockMutation } from '../../shared/types';

describe('stockMonthlyLedgerService', () => {
  const mockProducts: ProductItem[] = [
    {
      id: 'prod-1',
      product_code: 'BRI-1856515-TUR',
      product_name: 'Bridgestone Turanza 185/65 R15',
      brand: 'Bridgestone',
      product_size: '185/65 R15',
      ring: 'R15',
      category: 'BAN_BARU',
      product_cost: 700000,
      product_price: 850000,
      product_quantity: 15,
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
      brand: 'Accelera',
      product_size: '195/50 R16',
      ring: 'R16',
      category: 'BAN_BARU',
      product_cost: 580000,
      product_price: 690000,
      product_quantity: 0,
      stok_awal: 4,
      is_active: true,
      batches: [],
    },
  ];

  const mockTransactions: PosTransaction[] = [
    {
      id: 'tx-1',
      invoice_number: 'INV-20260912-001',
      date: '2026-09-12T10:00:00Z',
      items: [
        {
          product_id: 'prod-1',
          product_name: 'Bridgestone Turanza 185/65 R15',
          quantity: 4,
          price: 850000,
          cogs: 700000,
          subtotal: 3400000,
        },
      ],
      total_amount: 3400000,
      payment_method: 'CASH',
      status: 'PAID',
    },
  ];

  const mockMutations: StockMutation[] = [
    {
      id: 'mut-1',
      product_id: 'prod-1',
      type: 'IN',
      quantity: 10,
      date: '2026-09-10T09:00:00Z',
      description: 'Restock Penerimaan Barang',
      previous_stock: 6,
      current_stock: 16,
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
