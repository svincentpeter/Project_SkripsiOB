import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cashApi } from '../api/cashApi';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const okFetch = (data: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data }) });

describe('cashApi', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('membuka shift dengan kas awal hasil hitung', async () => {
    const fetchMock = okFetch({ id: 7, status: 'OPEN' });
    vi.stubGlobal('fetch', fetchMock);

    const session = await cashApi.open({ opening_float: 500000, opening_note: 'Tambahan receh' });

    expect(session).toMatchObject({ id: 7, status: 'OPEN' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/cash-sessions\/open$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ opening_float: 500000, opening_note: 'Tambahan receh' });
  });

  it('menutup shift per id dan membukukan mutasi kas pemilik', async () => {
    const fetchMock = okFetch({});
    vi.stubGlobal('fetch', fetchMock);

    await cashApi.close(12, { counted_cash: 1250000, variance_reason: 'Kurang kembalian' });
    await cashApi.createMovement({ type: 'DRAWING', date: '2026-10-02', amount: 200000, account_code: '1-1001', description: 'Prive' });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/cash-sessions\/12\/close$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ counted_cash: 1250000, variance_reason: 'Kurang kembalian' });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/cash-movements$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ type: 'DRAWING', account_code: '1-1001', amount: 200000 });
  });
});
