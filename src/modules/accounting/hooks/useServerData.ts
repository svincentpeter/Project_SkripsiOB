import { useEffect, useState } from 'react';

interface ServerDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Muat data server untuk tampilan laporan. Data lama tetap tampil selama memuat ulang;
 * galat ditampilkan apa adanya (tidak ada data cadangan lokal).
 */
export function useServerData<T>(load: () => Promise<T>, deps: unknown[]): ServerDataState<T> & { reload: () => void } {
  const [state, setState] = useState<ServerDataState<T>>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    load()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active) setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Gagal memuat data dari server.' });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
