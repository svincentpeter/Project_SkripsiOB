import React, { useEffect, useState } from 'react';
import { Banknote, Loader2, X } from 'lucide-react';
import { cashApi } from '../../../services/api';
import type { CashSessionState } from '../../../services/api';
import { formatRupiah } from '../../../shared/utils/formatters';
import { MoneyInput } from '../../../shared/components/MoneyInput';
import { useToast } from '../../../shared/components';

interface CashShiftControlProps {
  /** Saldo buku kas laci (akun 1-1000); null bila peran tidak boleh membaca saldo kas. */
  cashInDrawer: number | null;
  /** Izin `cash_session`: membuka dan menutup shift kasir. */
  enabled: boolean;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');

/**
 * Shift kasir di POS. Buka shift = hitung kas awal laci; tutup shift = hitung kas fisik, alasan wajib bila berbeda
 * dari kas seharusnya. Selisih dijurnal ke 6-1010 saat pemilik menyetujui (Buku Besar → Kas & Bank).
 */
export const CashShiftControl: React.FC<CashShiftControlProps> = ({ cashInDrawer, enabled }) => {
  const toast = useToast();
  const [state, setState] = useState<CashSessionState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    cashApi.current().then(setState).catch(() => setState(null));
  };

  useEffect(() => {
    if (enabled) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const balance = cashInDrawer === null ? null : (
    <b className="text-emerald-950 font-mono font-extrabold text-xs">{formatRupiah(cashInDrawer)}</b>
  );

  if (!enabled) {
    if (balance === null) return null;
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-semibold shadow-2xs"
        title="Saldo buku kas laci (akun 1-1000)"
      >
        <Banknote className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="hidden md:inline text-[11px] text-emerald-700">Kas Laci:</span>
        {balance}
      </div>
    );
  }

  const session = state?.session ?? null;
  const target = session ? session.expected_cash : state?.book_balance ?? 0;
  const difference = amount - target;
  const needsNote = Math.abs(difference) >= 0.005;

  const openModal = async () => {
    try {
      const fresh = await cashApi.current();
      setState(fresh);
      setAmount(fresh.session ? 0 : fresh.book_balance);
      setNote('');
      setIsOpen(true);
    } catch (err) {
      toast.error('Gagal Memuat Shift', errorText(err));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsNote && !note.trim()) return;
    setSubmitting(true);
    try {
      if (session) {
        await cashApi.close(session.id, { counted_cash: amount, variance_reason: note.trim() || undefined });
        toast.success('Shift Ditutup', 'Menunggu persetujuan pemilik. Selisih kas dijurnal saat disetujui.');
      } else {
        await cashApi.open({ opening_float: amount, opening_note: note.trim() || undefined });
        toast.success('Shift Dibuka', `Kas awal laci ${formatRupiah(amount)}.`);
      }
      setIsOpen(false);
      refresh();
    } catch (err) {
      toast.error(session ? 'Tutup Shift Ditolak' : 'Buka Shift Ditolak', errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-2xs cursor-pointer ${
          session
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
        }`}
        title={session ? `Shift #${session.id} terbuka — klik untuk tutup shift` : 'Belum ada shift — klik untuk buka shift'}
      >
        <Banknote className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline text-[11px]">{session ? 'Tutup Shift' : 'Buka Shift'}</span>
        {balance}
      </button>

      {isOpen && state && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="cash-shift-title" className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 id="cash-shift-title" className="text-sm font-bold flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>{session ? `Tutup Shift #${session.id}` : 'Buka Shift Kasir'}</span>
              </h2>
              <button type="button" aria-label="Tutup" onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-3 text-xs text-slate-800">
              {session ? (
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500">Dibuka</td>
                      <td className="py-1 text-right">
                        {session.user_name ?? '-'} • {new Date(session.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Kas awal</td>
                      <td className="py-1 text-right font-mono">{formatRupiah(session.opening_float)}</td>
                    </tr>
                    {session.lines.map((line) => (
                      <tr key={line.reference_type}>
                        <td className="py-1 text-slate-500">{line.label} ({line.count})</td>
                        <td className={`py-1 text-right font-mono ${line.amount < 0 ? 'text-rose-700' : ''}`}>{formatRupiah(line.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 font-bold">
                      <td className="py-1.5">Kas seharusnya</td>
                      <td className="py-1.5 text-right font-mono">{formatRupiah(session.expected_cash)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                  Hitung uang di laci sebelum melayani pelanggan. Saldo buku laci saat ini{' '}
                  <strong className="font-mono">{formatRupiah(target)}</strong>; bila hasil hitung berbeda, tulis keterangannya.
                </p>
              )}

              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">{session ? 'Kas fisik dihitung' : 'Kas awal di laci (hasil hitung)'}</span>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-right font-mono"
                />
              </label>

              <p className={`font-bold ${needsNote ? 'text-rose-700' : 'text-emerald-700'}`}>
                Selisih: {formatRupiah(difference)}{needsNote ? '' : ' (cocok)'}
              </p>

              {needsNote && (
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">{session ? 'Alasan selisih (wajib)' : 'Keterangan selisih kas awal (wajib)'}</span>
                  <textarea
                    required
                    maxLength={255}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="px-3 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl flex items-center gap-1.5 cursor-pointer">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{session ? 'Tutup Shift' : 'Buka Shift'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
