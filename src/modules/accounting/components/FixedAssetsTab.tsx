import React, { useState } from 'react';
import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import type { ApiJournal } from '../../../services/api';
import { sakEmkmApi } from '../../../services/api/sakEmkmApi';
import { currentMonth, monthLabel } from '../../../services/accountingPeriod';
import type { FixedAsset, FixedAssetInput } from '../../../shared/types/sakEmkm';
import { useToast } from '../../../shared/components';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { useServerData } from '../hooks/useServerData';
import { FixedAssetModal } from './FixedAssetModal';
import { ServerStatus } from './ServerStatus';

interface FixedAssetsTabProps {
  refreshKey?: number;
  onJournalsPosted: (journals: ApiJournal[]) => void;
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'Permintaan ditolak server.');

export const FixedAssetsTab: React.FC<FixedAssetsTabProps> = ({ refreshKey = 0, onJournalsPosted }) => {
  const toast = useToast();
  const [period, setPeriod] = useState(currentMonth());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const register = useServerData(() => sakEmkmApi.fixedAssets(), [refreshKey]);
  const preview = useServerData(() => sakEmkmApi.depreciationPreview(period), [period, refreshKey]);
  const reloadAll = () => {
    register.reload();
    preview.reload();
  };

  // Hanya POST yang ditangkap: pekerjaan setelah sukses di luar catch agar galat UI tidak tampil sebagai "ditolak" untuk jurnal yang sudah dibukukan.
  const handleCreate = async (input: FixedAssetInput): Promise<boolean> => {
    const res = await sakEmkmApi.createFixedAsset(input).catch((err: unknown) => {
      toast.error('Aset Ditolak Server', errorText(err));
      return null;
    });
    if (!res) return false;
    onJournalsPosted(res.journals);
    reloadAll();
    toast.success('Aset Tetap Dicatat', `${res.asset.code} ${res.asset.name} masuk register.`);
    return true;
  };

  const handleVoid = async (asset: FixedAsset) => {
    if (
      asset.last_depreciated_period &&
      !window.confirm(
        `${asset.code} sudah disusutkan ${formatRupiah(asset.accumulated_depreciation - asset.opening_accumulated_depreciation)}. ` +
          'Pembatalan membalik penyusutannya per bulan (Dr 1-3999 / Cr 6-1011, bertanggal akhir tiap bulan penyusutan)' +
          (asset.journal_entry_number ? ' dan jurnal perolehannya (bertanggal hari ini). ' : '. ') +
          'Hanya bisa bila semua bulan penyusutannya belum ditutup. ' +
          'Setelah itu catat ulang aset dengan data yang benar. Lanjutkan?',
      )
    )
      return;
    const reason = window.prompt(`Alasan membatalkan ${asset.code} ${asset.name}:`);
    if (!reason?.trim()) return;
    const res = await sakEmkmApi.voidFixedAsset(asset.id, reason.trim()).catch((err: unknown) => {
      toast.error('Pembatalan Ditolak', errorText(err));
      return null;
    });
    if (!res) return;
    onJournalsPosted(res.journals);
    reloadAll();
    toast.warning('Aset Dibatalkan', `${asset.code} dikeluarkan dari register${asset.last_depreciated_period ? ' dan penyusutannya dibalik' : ''}.`);
  };

  const handleRun = async () => {
    setRunning(true);
    const res = await sakEmkmApi.runDepreciation(period).catch((err: unknown) => {
      toast.error('Penyusutan Ditolak', errorText(err));
      return null;
    });
    setRunning(false);
    if (!res) return;
    onJournalsPosted(res.data.journals);
    reloadAll();
    toast.success('Penyusutan', res.message ?? `Penyusutan ${monthLabel(period)} diproses.`);
  };

  const summary = register.data?.summary;
  const matchesLedger = summary ? Math.abs(summary.difference_cost) < 0.005 && Math.abs(summary.difference_accumulated) < 0.005 : true;
  const p = preview.data;
  const canRun = !!p && p.total > 0 && !p.is_locked && !p.blocked_reason && !running;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">Register Aset Tetap</h2>
          <p className="text-slate-500">Buku pembantu akun 1-3000 (harga perolehan) dan 1-3999 (akumulasi penyusutan), metode garis lurus.</p>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)}
          className="px-3.5 py-2 font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Catat Aset</span>
        </button>
      </div>

      <ServerStatus loading={register.loading && !register.data} error={register.error} onRetry={register.reload} />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Harga Perolehan', formatRupiah(summary.total_cost)],
            ['Akumulasi Penyusutan', formatRupiah(summary.total_accumulated)],
            ['Nilai Buku', formatRupiah(summary.total_book_value)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl p-3 border bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
              <span className="text-base font-black font-mono text-slate-900">{value}</span>
            </div>
          ))}
          <div className={`rounded-xl p-3 border ${matchesLedger ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Register vs Buku Besar</span>
            <span className="text-base font-black text-slate-900">{matchesLedger ? 'Cocok' : 'Ada selisih'}</span>
            {!matchesLedger && (
              <span className="block text-[10px] text-rose-800">
                1-3000 {formatRupiah(summary.difference_cost)} • 1-3999 {formatRupiah(summary.difference_accumulated)}
              </span>
            )}
          </div>
        </div>
      )}

      <section className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-1.5"><CalendarCheck className="w-4 h-4 text-blue-600" />Penyusutan Bulanan</h3>
            <p className="text-slate-500">Satu jurnal per bulan (Dr 6-1011 / Cr 1-3999) bertanggal akhir bulan. Wajib sebelum tutup buku.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Bulan</span>
              <input type="month" value={period} max={currentMonth()} onChange={(e) => e.target.value && setPeriod(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white" />
            </label>
            <button type="button" onClick={handleRun} disabled={!canRun}
              className="px-3.5 py-2 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl disabled:opacity-40 cursor-pointer">
              {running ? 'Memproses…' : 'Jalankan Penyusutan'}
            </button>
          </div>
        </div>
        <ServerStatus loading={preview.loading && !p} error={preview.error} onRetry={preview.reload} />
        {p && (
          <>
            {p.is_locked && <p role="alert" className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold">{monthLabel(period)} sudah ditutup.</p>}
            {!p.is_locked && p.blocked_reason && <p role="alert" className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold">{p.blocked_reason}</p>}
            {p.lines.length > 0 ? (
              <table className="w-full">
                <thead className="text-slate-500 font-bold text-left"><tr><th className="py-1">Aset</th><th className="py-1 text-right">Penyusutan</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {p.lines.map((l) => (
                    <tr key={l.fixed_asset_id}><td className="py-1.5">{l.code} — {l.name}</td><td className="py-1.5 text-right font-mono">{formatRupiah(l.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot className="font-black"><tr><td className="py-1.5">Total {monthLabel(period)}</td><td className="py-1.5 text-right font-mono">{formatRupiah(p.total)}</td></tr></tfoot>
              </table>
            ) : (
              <p className="text-slate-600">Tidak ada penyusutan tertunda untuk {monthLabel(period)}.</p>
            )}
            {p.posted.length > 0 && (
              <p className="text-slate-600">Sudah dibukukan: {p.posted.map((j) => `${j.entry_number} (${formatRupiah(j.total)})`).join(', ')}.</p>
            )}
          </>
        )}
      </section>

      {register.data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 text-slate-600 font-bold text-left">
              <tr>
                <th className="py-2 px-2">Kode</th>
                <th className="py-2 px-2">Nama & Kategori</th>
                <th className="py-2 px-2">Perolehan</th>
                <th className="py-2 px-2 text-right">Harga Perolehan</th>
                <th className="py-2 px-2 text-right">Susut/Bulan</th>
                <th className="py-2 px-2 text-right">Akumulasi</th>
                <th className="py-2 px-2 text-right">Nilai Buku</th>
                <th className="py-2 px-2">Terakhir Disusutkan</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {register.data.assets.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">Belum ada aset tetap tercatat.</td></tr>
              )}
              {register.data.assets.map((a) => (
                <tr key={a.id} className={a.status === 'VOID' ? 'text-slate-400 line-through' : ''}>
                  <td className="py-2 px-2 font-mono">{a.code}</td>
                  <td className="py-2 px-2"><span className="font-bold">{a.name}</span><span className="block text-[10px] text-slate-500">{a.category_label} • {a.useful_life_months} bulan</span></td>
                  <td className="py-2 px-2">{formatDateIndo(a.acquisition_date)}<span className="block text-[10px] text-slate-500">{a.funding === 'OPENING' ? 'Saldo awal' : a.journal_entry_number}</span></td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupiah(a.acquisition_cost)}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupiah(a.monthly_depreciation)}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupiah(a.accumulated_depreciation)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{formatRupiah(a.book_value)}</td>
                  <td className="py-2 px-2">{a.status === 'VOID' ? `VOID: ${a.void_reason ?? '-'}` : a.last_depreciated_period ? monthLabel(a.last_depreciated_period) : '-'}</td>
                  <td className="py-2 px-2 text-right">
                    {a.status === 'ACTIVE' && !a.last_depreciated_period && (
                      <button type="button" onClick={() => handleVoid(a)} aria-label={`Batalkan ${a.code}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {a.status === 'ACTIVE' && a.last_depreciated_period && (
                      <button type="button" onClick={() => handleVoid(a)}
                        className="px-2 py-1 font-bold text-rose-700 hover:bg-rose-50 rounded-lg cursor-pointer whitespace-nowrap">
                        Batalkan (balik penyusutan)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FixedAssetModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleCreate} />
    </div>
  );
};
