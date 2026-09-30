import { afterEach, describe, expect, it, vi } from 'vitest';
import { sakEmkmApi } from '../api/sakEmkmApi';

const okFetch = (data: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, message: 'ok', data }) });

describe('sakEmkmApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the CALK of one month', async () => {
    const fetchMock = okFetch({ period: '2026-09' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sakEmkmApi.calk('2026-09')).resolves.toEqual({ period: '2026-09' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/reports\/calk\?period=2026-09$/);
  });

  it('posts the depreciation run and keeps the server message', async () => {
    const fetchMock = okFetch({ journals: [] });
    vi.stubGlobal('fetch', fetchMock);

    const res = await sakEmkmApi.runDepreciation('2026-09');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/accounting\/fixed-assets\/depreciation$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ period: '2026-09' });
    expect(res.message).toBe('ok');
    expect(res.data.journals).toEqual([]);
  });

  it('sends the statement file as multipart form data', async () => {
    const fetchMock = okFetch({ imported: 2, skipped: 0 });
    vi.stubGlobal('fetch', fetchMock);

    await sakEmkmApi.importStatement(new File(['tanggal,keterangan,jumlah\n'], 'rk.csv', { type: 'text/csv' }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/accounting\/bank-reconciliation\/import$/);
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });
});
