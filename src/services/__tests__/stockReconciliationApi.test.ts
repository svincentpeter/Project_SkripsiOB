import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stockReconciliationApi } from '../api/stockReconciliationApi';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const rejectWith422 = () =>
  vi.fn().mockResolvedValue({
    ok: false,
    status: 422,
    json: async () => ({ message: 'Update stok lewat rekonsiliasi Excel hanya untuk migrasi stok sebelum saldo awal persediaan dibukukan.' }),
  });

describe('stockReconciliationApi after a server answer', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
    store.set('ob3_products', JSON.stringify([{ id: '1', product_code: 'A', product_quantity: 1, stock: 1 }]));
    store.set('ob3_stock_staging', JSON.stringify({ products: [], unresolved: [], stats: {} }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('surfaces a 422 from bulk update instead of writing locally', async () => {
    vi.stubGlobal('fetch', rejectWith422());

    await expect(
      stockReconciliationApi.bulkUpdate([{ product_id: 1, excel_stock: 5 }], {
        update_cost: false,
        update_price: false,
        update_stock: true,
        reason: 'Rekonsiliasi',
      })
    ).rejects.toMatchObject({ status: 422 });
    expect(JSON.parse(store.get('ob3_products')!)[0].product_quantity).toBe(1);
  });

  it('surfaces a 422 from commit instead of writing locally', async () => {
    vi.stubGlobal('fetch', rejectWith422());

    await expect(stockReconciliationApi.commit('2026-10')).rejects.toMatchObject({ status: 422 });
    expect(JSON.parse(store.get('ob3_products')!)).toHaveLength(1);
  });

  it('has no offline path: an unreachable server fails the commit without writing locally', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(stockReconciliationApi.commit('2026-10')).rejects.toBeTruthy();
    await expect(stockReconciliationApi.getStaging()).rejects.toBeTruthy();
    expect(JSON.parse(store.get('ob3_products')!)).toHaveLength(1);
  });
});
