import React, { useState } from 'react';
import { CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { cashApi } from '../../../services/api';
import type { ApiCashSession, ApiJournal, CashMovementType } from '../../../services/api';
import { localDate } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { MoneyInput } from '../../../shared/components/MoneyInput';
import { useToast } from '../../../shared/components';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface CashBankTabProps {
  refreshKey: number;
  /** Izin `cash_session_approve`. */
  canApprove: boolean;
  /** Izin `cash_movement`. */
  canMove: boolean;
  onLedgerChanged: (journals: ApiJournal[]) => void;
}

const STATUS_LABEL: Record<ApiCashSession['status'], string> = {
  OPEN: 'Terbuka',
  PENDING_APPROVAL: 'Menunggu persetujuan',
  CLOSED: 'Disetujui',
};

const MOVEMENTS: { id: CashMovementType; label: string; journal: string }[] = [
  { id: 'DEPOSIT', label: 'Setor kas laci ke bank', journal: 'Dr 1-1001 Bank / Cr 1-1000 Kas laci' },
  { id: 'DRAWING', label: 'Prive (pengambilan pemilik)', journal: 'Dr 3-3000 Prive / Cr kas laci atau bank' },
  { id: 'CAPITAL', label: 'Setoran modal pemilik', journal: 'Dr kas laci atau bank / Cr 3-1000 Modal' },
];

const MOVEMENT_LABEL: Record<string, string> = {
  CASH_DEPOSIT: 'Setor bank',
  OWNER_DRAWING: 'Prive',
  CAPITAL_INJECTION: 'Setoran modal',
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
const timeText = (iso: string | null) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

/** Persetujuan shift kasir (selisih kas dijurnal ke 6-1010) dan mutasi kas pemilik: setor bank, prive, setoran modal. */
export const CashBankTab: React.FC<CashBankTabProps> = ({ refreshKey, canApprove, canMove, onLedgerChanged }) => {
  const toast = useToast();
  const sessions = useServerData(() => (canApprove ? cashApi.sessions() : Promise.resolve([] as ApiCashSession[])), [refreshKey, canApprove]);
  const movements = useServerData(() => (canMove ? cashApi.movements() : Promise.resolve([] as ApiJournal[])), [refreshKey, canMove]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [type, setType] = useState<CashMovementType>('DEPOSIT');
  const [account, setAccount] = useState<'1-1000' | '1-1001'>('1-1000');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(localDate());
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const approve = async (session: ApiCashSession) => {
    const adjustment = session.adjustment ?? 0;
    const parts = `selisih kas awal ${formatRupiah(session.opening_difference)} + selisih hitung ${formatRupiah(session.variance ?? 0)}`;
    if (!window.confirm(`Setujui shift #${session.id}? Selisih ${formatRupiah(adjustment)} (${parts}) dijurnal ke 6-1010 Selisih Kas Kasir.`)) return;
    setApprovingId(session.id);
    try {
      const res = await cashApi.approve(session.id);
      onLedgerChanged(res.journals);
      sessions.reload();
      toast.success(
        'Shift Disetujui',
        res.journals.length > 0 ? `Selisih kas dibukukan (${res.journals[0].entry_number}).` : 'Kas fisik sama dengan saldo buku; tidak ada jurnal.'
      );
    } catch (err) {
      toast.error('Persetujuan Ditolak', errorText(err));
    } finally {
      setApprovingId(null);
    }
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;
    setSubmitting(true);
    try {
      const journal = await cashApi.createMovement({
        type,
        date,
        amount,
        account_code: type === 'DEPOSIT' ? undefined : account,
        description: description.trim(),
      });
      onLedgerChanged([journal]);
      movements.reload();
      setAmount(0);
      setDescription('');
      toast.success('Mutasi Kas Dibukukan', `${journal.reference_id} (${journal.entry_number}) sebesar ${formatRupiah(journal.total_debit)}.`);
    } catch (err) {
      toast.error('Mutasi Kas Ditolak', errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white';
  const selected = MOVEMENTS.find((m) => m.id === type) ?? MOVEMENTS[0];

  return (
    <div className="space-y-5">
      {canApprove && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Shift Kasir & Persetujuan Selisih Kas</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Selisih (kas dihitung − saldo buku) dijurnal ke 6-1010 saat disetujui, sehingga saldo 1-1000 sama dengan uang fisik di laci.
          </p>
          <ServerStatus loading={sessions.loading && !sessions.data} error={sessions.error} onRetry={sessions.reload} />
          {sessions.data && sessions.data.length === 0 && <p className="text-xs text-slate-500">Belum ada shift kasir.</p>}
          {sessions.data && sessions.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Shift</th>
                    <th className="py-2 px-2">Kasir</th>
                    <th className="py-2 px-2">Dibuka / Ditutup</th>
                    <th className="py-2 px-2 text-right">Kas Seharusnya</th>
                    <th className="py-2 px-2 text-right">Kas Dihitung</th>
                    <th className="py-2 px-2 text-right">Selisih Dijurnal</th>
                    <th className="py-2 px-2">Alasan</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.data.map((s) => {
                    const adj = s.adjustment ?? 0;
                    return (
                      <tr key={s.id} className="border-b border-slate-100 align-top">
                        <td className="py-2 px-2 font-mono font-bold">#{s.id}</td>
                        <td className="py-2 px-2">{s.user_name ?? '-'}</td>
                        <td className="py-2 px-2 text-slate-600">
                          {timeText(s.opened_at)}
                          <br />
                          {timeText(s.closed_at)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{formatRupiah(s.expected_cash)}</td>
                        <td className="py-2 px-2 text-right font-mono">{s.counted_cash === null ? '-' : formatRupiah(s.counted_cash)}</td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${adj < 0 ? 'text-rose-700' : adj > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {s.adjustment === null ? '-' : formatRupiah(s.adjustment)}
                          {s.opening_difference !== 0 && (
                            <span className="block text-[10px] font-normal text-slate-500">
                              awal {formatRupiah(s.opening_difference)} • hitung {s.variance === null ? '-' : formatRupiah(s.variance)}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-slate-600 max-w-[220px]">{[s.opening_note, s.variance_reason].filter(Boolean).join(' • ') || '-'}</td>
                        <td className="py-2 px-2">
                          {s.status === 'PENDING_APPROVAL' ? (
                            <button
                              type="button"
                              disabled={approvingId === s.id}
                              onClick={() => approve(s)}
                              className="px-2.5 py-1 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              {approvingId === s.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Setujui</span>
                            </button>
                          ) : (
                            <span className="text-slate-600">
                              {STATUS_LABEL[s.status]}
                              {s.journal_entry_number ? ` (${s.journal_entry_number})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {canMove && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span>Mutasi Kas Pemilik</span>
          </h2>
          <form onSubmit={submitMovement} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Jenis mutasi</span>
              <select value={type} onChange={(e) => setType(e.target.value as CashMovementType)} className={field}>
                {MOVEMENTS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">{selected.journal}</span>
            </label>
            {type !== 'DEPOSIT' && (
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">{type === 'DRAWING' ? 'Diambil dari' : 'Disetor ke'}</span>
                <select value={account} onChange={(e) => setAccount(e.target.value as '1-1000' | '1-1001')} className={field}>
                  <option value="1-1000">1-1000 Kas Laci Kasir</option>
                  <option value="1-1001">1-1001 Bank BCA Cabang 3</option>
                </select>
              </label>
            )}
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal</span>
              <input type="date" required value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nominal</span>
              <MoneyInput value={amount} onChange={setAmount} className={`${field} text-right font-mono`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Keterangan</span>
              <input
                type="text"
                required
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="mis. Setor omzet harian ke BCA"
                className={field}
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || amount <= 0 || !description.trim()}
                className="px-3.5 py-2 font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Bukukan Mutasi</span>
              </button>
            </div>
          </form>

          <ServerStatus loading={movements.loading && !movements.data} error={movements.error} onRetry={movements.reload} />
          {movements.data && movements.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Tanggal</th>
                    <th className="py-2 px-2">No. Bukti</th>
                    <th className="py-2 px-2">Jenis</th>
                    <th className="py-2 px-2">Keterangan</th>
                    <th className="py-2 px-2 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.map((j) => (
                    <tr key={j.entry_number} className="border-b border-slate-100">
                      <td className="py-2 px-2">{formatDateIndo(j.entry_date)}</td>
                      <td className="py-2 px-2 font-mono">{j.reference_id}<br /><span className="text-slate-400">{j.entry_number}</span></td>
                      <td className="py-2 px-2">{MOVEMENT_LABEL[j.reference_type] ?? j.reference_type}</td>
                      <td className="py-2 px-2 text-slate-600">{j.description}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatRupiah(j.total_debit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
