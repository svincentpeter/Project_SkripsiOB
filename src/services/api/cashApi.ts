import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type CashSessionStatus = 'OPEN' | 'PENDING_APPROVAL' | 'CLOSED';

/** Mutasi laci (akun 1-1000) per jenis jurnal selama shift; positif = masuk laci. */
export interface CashSessionLine {
  reference_type: string;
  label: string;
  amount: number;
  count: number;
}

export interface ApiCashSession {
  id: number;
  status: CashSessionStatus;
  user_id: number;
  user_name: string | null;
  opened_at: string;
  opening_float: number;
  book_opening: number;
  opening_difference: number;
  opening_note: string | null;
  lines: CashSessionLine[];
  cash_in: number;
  cash_out: number;
  expected_cash: number;
  closed_at: string | null;
  closed_by_name: string | null;
  counted_cash: number | null;
  variance: number | null;
  variance_reason: string | null;
  /** Nominal jurnal selisih saat disetujui (selisih akhir + selisih kas awal). */
  adjustment: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  journal_entry_number: string | null;
}

export interface CashSessionState {
  session: ApiCashSession | null;
  /** Saldo buku laci: saldo 1-1000 + selisih shift yang belum disetujui. */
  book_balance: number;
}

export type CashMovementType = 'DEPOSIT' | 'DRAWING' | 'CAPITAL';

export interface CashMovementPayload {
  type: CashMovementType;
  date: string;
  amount: number;
  /** Wajib untuk DRAWING/CAPITAL; DEPOSIT selalu 1-1000 → 1-1001. */
  account_code?: '1-1000' | '1-1001';
  description: string;
}

const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> => request.then((r) => r.data);

/** Shift kasir dan mutasi kas pemilik; semua angka dihitung dan dijurnal server. */
export const cashApi = {
  current: () => unwrap(apiClient.get<Envelope<CashSessionState>>('/cash-sessions/current')),
  sessions: () => unwrap(apiClient.get<Envelope<ApiCashSession[]>>('/cash-sessions')),
  open: (input: { opening_float: number; opening_note?: string }) =>
    unwrap(apiClient.post<Envelope<ApiCashSession>>('/cash-sessions/open', input)),
  close: (id: number, input: { counted_cash: number; variance_reason?: string }) =>
    unwrap(apiClient.post<Envelope<ApiCashSession>>(`/cash-sessions/${id}/close`, input)),
  approve: (id: number) =>
    unwrap(apiClient.post<Envelope<{ session: ApiCashSession; journals: ApiJournal[] }>>(`/cash-sessions/${id}/approve`)),
  movements: () => unwrap(apiClient.get<Envelope<ApiJournal[]>>('/cash-movements')),
  createMovement: (payload: CashMovementPayload) =>
    unwrap(apiClient.post<Envelope<ApiJournal>>('/cash-movements', payload)),
};
