import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, authToken, setUnauthorizedHandler, ApiError } from '../api/apiClient';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const mockFetch = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('apiClient auth', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setUnauthorizedHandler(null);
  });

  it('sends bearer token when present', async () => {
    authToken.set('abc');
    const fetchMock = mockFetch(200, { ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/products');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer abc');
  });

  it('omits Authorization without token', async () => {
    const fetchMock = mockFetch(200, {});
    vi.stubGlobal('fetch', fetchMock);

    await apiClient.get('/health');

    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('clears token and calls handler on 401', async () => {
    authToken.set('expired');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', mockFetch(401, { message: 'Unauthenticated.' }));

    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(authToken.get()).toBeNull();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not call handler on 403', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    vi.stubGlobal('fetch', mockFetch(403, { message: 'Anda tidak memiliki izin untuk aksi ini.' }));

    await expect(apiClient.get('/accounting/journals')).rejects.toMatchObject({ status: 403 });
    expect(handler).not.toHaveBeenCalled();
  });
});
