import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type {
  AdjustingEntryInput,
  BankReconciliationReport,
  BankStatementLine,
  CalkReport,
  DepreciationPreview,
  FixedAsset,
  FixedAssetInput,
  FixedAssetRegister,
} from '../../shared/types/sakEmkm';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

type Journals = { journals: ApiJournal[] };

const data = <T>(request: Promise<Envelope<T>>): Promise<T> => request.then((r) => r.data);
const BANK = '/accounting/bank-reconciliation';

/** SP4 SAK EMKM: register aset tetap & penyusutan, AJP, rekonsiliasi bank, CALK. */
export const sakEmkmApi = {
  fixedAssets: () => data(apiClient.get<Envelope<FixedAssetRegister>>('/accounting/fixed-assets')),
  createFixedAsset: (input: FixedAssetInput) =>
    data(apiClient.post<Envelope<{ asset: FixedAsset } & Journals>>('/accounting/fixed-assets', input)),
  /** correctLedger: aset saldo awal juga dikeluarkan dari buku besar (Dr 3-1000, Dr 1-3999 / Cr 1-3000). */
  voidFixedAsset: (id: number, reason: string, correctLedger = false) =>
    data(apiClient.post<Envelope<{ asset: FixedAsset } & Journals>>(`/accounting/fixed-assets/${id}/void`, { reason, correct_ledger: correctLedger })),
  depreciationPreview: (period: string) =>
    data(apiClient.get<Envelope<DepreciationPreview>>('/accounting/fixed-assets/depreciation', { period })),
  /** Amplop lengkap: pesan server membedakan "dibukukan" dan "tidak ada penyusutan". */
  runDepreciation: (period: string) => apiClient.post<Envelope<Journals>>('/accounting/fixed-assets/depreciation', { period }),
  createAdjustingEntry: (input: AdjustingEntryInput) =>
    data(apiClient.post<Envelope<Journals>>('/accounting/adjusting-entries', input)),
  bankReconciliation: (period: string) => data(apiClient.get<Envelope<BankReconciliationReport>>(BANK, { period })),
  setStatementBalance: (period: string, balance: number) =>
    data(apiClient.put<Envelope<BankReconciliationReport>>(`${BANK}/${period}`, { statement_ending_balance: balance })),
  addStatementLine: (input: { statement_date: string; description: string; amount: number }) =>
    data(apiClient.post<Envelope<BankStatementLine>>(`${BANK}/lines`, input)),
  importStatement: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return data(apiClient.upload<Envelope<{ imported: number; skipped: number }>>(`${BANK}/import`, form));
  },
  deleteStatementLine: (id: number) => apiClient.delete<Envelope<null>>(`${BANK}/lines/${id}`),
  /** Beberapa id: mutasi gabungan (mis. setoran QRIS harian) dipecah per baris jurnal. */
  matchStatementLine: (id: number, journalItemIds: number[]) =>
    data(apiClient.post<Envelope<BankStatementLine>>(`${BANK}/lines/${id}/match`, { journal_item_ids: journalItemIds })),
  unmatchStatementLine: (id: number) => data(apiClient.post<Envelope<BankStatementLine>>(`${BANK}/lines/${id}/unmatch`)),
  postBankAdjustment: (id: number) => data(apiClient.post<Envelope<Journals>>(`${BANK}/lines/${id}/post-adjustment`)),
  autoMatch: (period: string) => data(apiClient.post<Envelope<{ matched: number }>>(`${BANK}/auto-match`, { period })),
  calk: (period: string) => data(apiClient.get<Envelope<CalkReport>>('/reports/calk', { period })),
};
