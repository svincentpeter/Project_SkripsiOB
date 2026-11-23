import React, { useState } from 'react';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import type { DailyRecapTotals } from '../../shared/types';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';
import { reportsApi } from '../../services/api';
import { localDate } from '../../services/accountingPeriod';
import { cashMovementLabel, dailySummaryKpis, PAYMENT_GROUP_LABELS, PAYMENT_GROUPS } from '../../services/dailyReports';
import { useServerData } from '../accounting/hooks/useServerData';

interface DailyReportsScreenProps {
  /** Naik setiap kali server membukukan jurnal; laporan dimuat ulang. */
  ledgerVersion: number;
  /** Rekap harian (laba rugi toko per hari) hanya untuk izin dashboard atau laporan keuangan. */
  canViewRecap: boolean;
}

type Tab = 'cash' | 'recap';

const card = 'bg-white border border-slate-200 rounded-2xl p-4 shadow-xs';
const th = 'py-2 px-3 font-bold text-left';
const thr = 'py-2 px-3 font-bold text-right';
const td = 'py-2 px-3';
const num = 'py-2 px-3 text-right font-mono';
/** Nilai null (mis. HPP pada lingkup kasir, sesi belum ditutup) tampil sebagai tanda pisah, bukan Rp 0. */
const money = (v: number | null) => (v === null ? '—' : formatRupiah(v));

const LoadState: React.FC<{ loading: boolean; error: string | null; onRetry: () => void }> = ({ loading, error, onRetry }) => {
  if (error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
        <button type="button" onClick={onRetry} className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-bold cursor-pointer">
          Coba lagi
        </button>
      </div>
    );
  }
  return loading ? <p className="text-xs text-slate-500">Memuat data dari server…</p> : null;
};

const Section: React.FC<{ title: string; head: React.ReactNode; children: React.ReactNode }> = ({ title, head, children }) => (
  <section className={`${card} space-y-3`}>
    <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[560px] text-xs border-collapse">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200">{head}</thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  </section>
);

const Empty: React.FC<{ cols: number }> = ({ cols }) => (
  <tr><td colSpan={cols} className="py-3 px-3 text-slate-500">Tidak ada data.</td></tr>
);

const DailyCashTab: React.FC<{ ledgerVersion: number }> = ({ ledgerVersion }) => {
  const [date, setDate] = useState(localDate());
  const report = useServerData(() => reportsApi.dailyCash(date), [date, ledgerVersion]);
  const r = report.data;
  // HPP per nota hanya dikirim server untuk lingkup toko; lingkup kasir menerima null.
  const showHpp = r?.scope === 'all';
  const kpis = r?.summary ? dailySummaryKpis(r.summary) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-bold text-slate-700 space-y-1">
          <span className="block">Tanggal</span>
          <input
            type="date"
            value={date}
            max={localDate()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 text-xs"
          />
        </label>
        {r && <ExportMenu reportId="daily_cash" data={r} ctx={{ periodLabel: formatDateIndo(r.date), startDate: r.date, endDate: r.date }} />}
      </div>

      <LoadState loading={report.loading} error={report.error} onRetry={report.reload} />

      {r && (
        <>
          {r.scope === 'cashier' && (
            <p className="text-xs text-slate-600">Menampilkan nota dan sesi kasir milik <b>{r.cashier}</b> saja.</p>
          )}

          {kpis.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {kpis.map(([label, value]) => (
                <div key={label} className={card}>
                  <div className="text-[11px] font-bold text-slate-600">{label}</div>
                  <div className="text-base font-black font-mono text-slate-900">{formatRupiah(value)}</div>
                </div>
              ))}
            </div>
          )}

          {r.cash_accounts && (
            <Section
              title="Saldo Kas Laci & Bank"
              head={<tr><th className={th}>Akun</th><th className={thr}>Saldo Awal</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th><th className={thr}>Saldo Akhir</th></tr>}
            >
              {r.cash_accounts.map((a) => (
                <tr key={a.code}>
                  <td className={td}>{a.code} {a.name}</td>
                  <td className={num}>{formatRupiah(a.opening)}</td>
                  <td className={num}>{formatRupiah(a.cash_in)}</td>
                  <td className={num}>{formatRupiah(a.cash_out)}</td>
                  <td className={`${num} font-bold`}>{formatRupiah(a.closing)}</td>
                </tr>
              ))}
            </Section>
          )}

          {r.cash_movements && (
            <Section title="Mutasi Kas per Jenis Transaksi" head={<tr><th className={th}>Jenis</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th></tr>}>
              {r.cash_movements.length === 0 && <Empty cols={3} />}
              {r.cash_movements.map((m) => (
                <tr key={m.reference_type}>
                  <td className={td}>{cashMovementLabel(m.reference_type)}</td>
                  <td className={num}>{formatRupiah(m.cash_in)}</td>
                  <td className={num}>{formatRupiah(m.cash_out)}</td>
                </tr>
              ))}
            </Section>
          )}

          <Section
            title="Penerimaan per Kasir"
            head={
              <tr>
                <th className={th}>Kasir</th>
                <th className={thr}>Nota</th>
                {PAYMENT_GROUPS.map((g) => <th key={g} className={thr}>{PAYMENT_GROUP_LABELS[g]}</th>)}
                <th className={thr}>Total Nota</th>
                <th className={thr}>Nota VOID</th>
              </tr>
            }
          >
            {r.cashiers.length === 0 && <Empty cols={7} />}
            {/* Server mengelompokkan per user; nama bisa sama (nota lama per nama), jadi kunci baris = urutan. */}
            {r.cashiers.map((c, i) => (
              <tr key={i}>
                <td className={`${td} font-bold`}>{c.cashier_name}</td>
                <td className={num}>{c.sales_count}</td>
                {PAYMENT_GROUPS.map((g) => <td key={g} className={num}>{formatRupiah(c.by_method[g])}</td>)}
                <td className={`${num} font-bold`}>{formatRupiah(c.sales_total)}</td>
                <td className={num}>{c.void_count} ({formatRupiah(c.void_total)})</td>
              </tr>
            ))}
          </Section>

          <Section
            title="Sesi Kasir"
            head={
              <tr>
                <th className={th}>Kasir</th><th className={th}>Buka</th><th className={th}>Tutup</th>
                <th className={thr}>Modal Awal</th><th className={thr}>Seharusnya</th><th className={thr}>Dihitung</th>
                <th className={thr}>Selisih</th><th className={th}>Alasan</th><th className={th}>Status</th>
              </tr>
            }
          >
            {r.cash_sessions.length === 0 && <Empty cols={9} />}
            {r.cash_sessions.map((s) => (
              <tr key={s.id}>
                <td className={td}>{s.user_name ?? '-'}</td>
                <td className={td}>{s.opened_at ?? '-'}</td>
                <td className={td}>{s.closed_at ?? '-'}</td>
                <td className={num}>{formatRupiah(s.opening_float)}</td>
                <td className={num}>{money(s.expected_cash)}</td>
                <td className={num}>{money(s.counted_cash)}</td>
                <td className={`${num} ${s.variance ? 'text-rose-700 font-bold' : ''}`}>{money(s.variance)}</td>
                <td className={td}>{s.variance_reason ?? '-'}</td>
                <td className={td}>{s.status}</td>
              </tr>
            ))}
          </Section>

          <Section
            title="Daftar Nota"
            head={
              <tr>
                <th className={th}>Jam</th><th className={th}>No Nota</th><th className={th}>Kasir</th>
                <th className={th}>Pelanggan</th><th className={th}>Pembayaran</th><th className={thr}>Total</th>
                {showHpp && <th className={thr}>HPP</th>}
                <th className={th}>Status</th>
              </tr>
            }
          >
            {r.sales.length === 0 && <Empty cols={showHpp ? 8 : 7} />}
            {r.sales.map((s) => (
              <tr key={s.id} className={s.status === 'VOID' ? 'bg-rose-50/60 text-slate-500' : ''}>
                <td className={td}>{s.time ?? '-'}</td>
                <td className={`${td} font-mono font-bold text-blue-700`}>{s.reference}</td>
                <td className={td}>{s.cashier_name}</td>
                <td className={td}>{s.customer_name ?? 'Umum'}</td>
                <td className={td}>{s.payments.map((p) => `${p.method} ${formatRupiah(p.amount)}`).join(', ') || '-'}</td>
                <td className={num}>{formatRupiah(s.total_amount)}</td>
                {showHpp && <td className={num}>{money(s.total_hpp)}</td>}
                <td className={td}>{s.status}</td>
              </tr>
            ))}
          </Section>

          {r.expenses && (
            <Section title="Biaya Hari Ini" head={<tr><th className={th}>No BKK</th><th className={th}>Kategori</th><th className={th}>Keterangan</th><th className={thr}>Jumlah</th></tr>}>
              {r.expenses.length === 0 && <Empty cols={4} />}
              {r.expenses.map((e) => (
                <tr key={e.reference}>
                  <td className={`${td} font-mono`}>{e.reference}</td>
                  <td className={td}>{e.category ?? '-'}</td>
                  <td className={td}>{e.description}</td>
                  <td className={num}>{formatRupiah(e.amount)}</td>
                </tr>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
};

const DailyRecapTab: React.FC<{ ledgerVersion: number }> = ({ ledgerVersion }) => {
  const today = localDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const recap = useServerData(() => reportsApi.dailyRecap(from, to), [from, to, ledgerVersion]);
  const r = recap.data;
  const cols: [string, Exclude<keyof DailyRecapTotals, 'payment_mix'>][] = [
    ['Pendapatan Bersih', 'net_revenue'],
    ['Retur', 'returns'],
    ['HPP', 'cost_of_sales'],
    ['Laba Kotor', 'gross_profit'],
    ['Beban', 'operating_expenses'],
    ['Pend. Lain', 'other_income'],
    ['Laba Bersih', 'net_income'],
    ['Kas Masuk', 'cash_in'],
    ['Kas Keluar', 'cash_out'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-bold text-slate-700 space-y-1">
            <span className="block">Dari</span>
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-300 text-xs" />
          </label>
          <label className="text-xs font-bold text-slate-700 space-y-1">
            <span className="block">Sampai</span>
            <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-300 text-xs" />
          </label>
        </div>
        {r && <ExportMenu reportId="daily_recap" data={r} ctx={{ periodLabel: `${formatDateIndo(r.from)} - ${formatDateIndo(r.to)}`, startDate: r.from, endDate: r.to }} />}
      </div>

      <LoadState loading={recap.loading} error={recap.error} onRetry={recap.reload} />

      {r && (
        <Section
          title="Rekap Harian (maks. 92 hari)"
          head={
            <tr>
              <th className={th}>Tanggal</th>
              <th className={thr}>Nota</th>
              {cols.map(([label]) => <th key={label} className={thr}>{label}</th>)}
              {PAYMENT_GROUPS.map((g) => <th key={g} className={thr}>{PAYMENT_GROUP_LABELS[g]}</th>)}
            </tr>
          }
        >
          {[...r.rows].reverse().map((row) => (
            <tr key={row.date}>
              <td className={td}>{formatDateIndo(row.date)}</td>
              <td className={num}>{row.sales_count}</td>
              {cols.map(([label, key]) => <td key={label} className={num}>{formatRupiah(row[key])}</td>)}
              {PAYMENT_GROUPS.map((g) => <td key={g} className={num}>{formatRupiah(row.payment_mix[g])}</td>)}
            </tr>
          ))}
          <tr className="bg-slate-50 font-bold">
            <td className={td}>Total</td>
            <td className={num}>{r.totals.sales_count}</td>
            {cols.map(([label, key]) => <td key={label} className={num}>{formatRupiah(r.totals[key])}</td>)}
            {PAYMENT_GROUPS.map((g) => <td key={g} className={num}>{formatRupiah(r.totals.payment_mix[g])}</td>)}
          </tr>
        </Section>
      )}
    </div>
  );
};

export const DailyReportsScreen: React.FC<DailyReportsScreenProps> = ({ ledgerVersion, canViewRecap }) => {
  const [tab, setTab] = useState<Tab>('cash');
  const active: Tab = canViewRecap ? tab : 'cash';
  const tabs: Tab[] = canViewRecap ? ['cash', 'recap'] : ['cash'];

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-5 bg-[#F8FAFC] text-slate-900">
      <div className={`${card} space-y-3`}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <CalendarDays className="w-4 h-4" />
            <span>Laporan Operasional Harian</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">Laporan Harian Kas & Rekap Kasir</h1>
          <p className="text-xs text-slate-600">
            Angka uang dihitung server dari jurnal (sama dengan Laba Rugi dan Arus Kas); jumlah nota dari nota yang tidak di-VOID.
          </p>
        </div>
        <div role="tablist" aria-label="Jenis laporan harian" className="flex gap-1.5 p-1.5 bg-slate-100 rounded-xl text-xs font-bold w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active === t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-lg cursor-pointer ${active === t ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:bg-white/60'}`}
            >
              {t === 'cash' ? 'Kas Harian' : 'Rekap Harian'}
            </button>
          ))}
        </div>
      </div>

      {active === 'cash' ? <DailyCashTab ledgerVersion={ledgerVersion} /> : <DailyRecapTab ledgerVersion={ledgerVersion} />}
    </div>
  );
};
