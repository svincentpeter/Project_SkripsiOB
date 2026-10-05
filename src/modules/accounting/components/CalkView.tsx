import React from 'react';
import type { CalkReport } from '../../../shared/types/sakEmkm';
import { monthLabel } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

type Row = { label: string; value: number; strong?: boolean };

const Note: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-black text-slate-900">{n}. {title}</h3>
    <div className="text-xs text-slate-700 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Rows: React.FC<{ rows: Row[] }> = ({ rows }) => (
  <table className="w-full max-w-2xl">
    <tbody className="divide-y divide-slate-100">
      {rows.map((r, i) => (
        <tr key={i} className={r.strong ? 'font-bold' : ''}>
          <td className="py-1.5 pr-3">{r.label}</td>
          <td className={`py-1.5 text-right font-mono ${r.value < 0 ? 'text-rose-700' : ''}`}>{formatRupiah(r.value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** Catatan atas Laporan Keuangan SAK EMKM; teks & angka dari server, sama dengan ekspor PDF/Word. */
export const CalkView: React.FC<{ calk: CalkReport }> = ({ calk }) => {
  const n = calk.notes;
  const fa = n.fixed_assets;
  const cash = n.cash_and_bank;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-black text-slate-900">Catatan atas Laporan Keuangan — {monthLabel(calk.period)}</h2>
        <p className="text-xs text-slate-500">Posisi per {formatDateIndo(calk.end_date)}.</p>
      </header>

      <Note n={1} title="Informasi Umum">
        <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold">Nama entitas</dt><dd>{calk.entity.name}, {calk.entity.address}</dd>
          <dt className="font-bold">Kegiatan usaha</dt><dd>{calk.entity.activity}</dd>
          <dt className="font-bold">Bentuk usaha</dt><dd>{calk.entity.legal_form}</dd>
          <dt className="font-bold">Status pajak</dt><dd>{calk.entity.tax_status}</dd>
          <dt className="font-bold">Mata uang</dt><dd>{calk.entity.currency}</dd>
        </dl>
      </Note>

      <Note n={2} title="Pernyataan Kepatuhan"><p>{calk.compliance}</p></Note>

      <Note n={3} title="Ikhtisar Kebijakan Akuntansi">
        <ol className="list-[lower-alpha] pl-5 space-y-1.5">
          {calk.policies.map((p) => <li key={p.title}><span className="font-bold">{p.title}.</span> {p.body}</li>)}
        </ol>
      </Note>

      <Note n={4} title="Kas dan Bank">
        <Rows rows={[...cash.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })), { label: 'Jumlah kas dan bank', value: cash.total, strong: true }]} />
        <p>
          {cash.bank_statement_balance === null
            ? 'Saldo rekening koran bulan ini belum diisi pada menu Rekonsiliasi Bank.'
            : `Saldo rekening koran ${formatRupiah(cash.bank_statement_balance)}; rekonsiliasi ${cash.bank_reconciled ? 'sudah cocok' : 'masih menyisakan selisih'}.`}
        </p>
      </Note>

      <Note n={5} title="Persediaan">
        <Rows rows={[
          { label: 'Persediaan ban (1-2000), metode FIFO', value: n.inventory.ledger_balance, strong: true },
          ...n.inventory.breakdown.map((b) => ({ label: `${b.category} (${b.quantity} unit)`, value: b.value })),
        ]} />
        {n.inventory.breakdown_as_of
          ? <p>Rincian per kategori berdasarkan batch FIFO per {formatDateIndo(n.inventory.breakdown_as_of)}.</p>
          : <p>Rincian per kategori hanya tersedia untuk bulan berjalan.</p>}
      </Note>

      <Note n={6} title="Beban Dibayar di Muka dan Beban yang Masih Harus Dibayar">
        <Rows rows={[
          { label: 'Beban dibayar di muka (1-1100)', value: n.prepaid_expenses.balance },
          { label: 'Beban yang masih harus dibayar (2-1100)', value: n.accrued_expenses.balance },
        ]} />
      </Note>

      <Note n={7} title="Aset Tetap">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 font-bold text-left">
              <tr>
                <th className="py-1.5 px-2">Aset</th><th className="py-1.5 px-2">Kategori</th><th className="py-1.5 px-2">Perolehan</th>
                <th className="py-1.5 px-2 text-right">Harga Perolehan</th><th className="py-1.5 px-2 text-right">Akumulasi</th><th className="py-1.5 px-2 text-right">Nilai Buku</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fa.assets.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-slate-500">Tidak ada aset tetap per akhir periode.</td></tr>}
              {fa.assets.map((a) => (
                <tr key={a.code}>
                  <td className="py-1.5 px-2">{a.code} — {a.name}</td>
                  <td className="py-1.5 px-2">{a.category} ({a.useful_life_months} bln)</td>
                  <td className="py-1.5 px-2">{formatDateIndo(a.acquisition_date)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(a.cost)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(a.accumulated)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(a.book_value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold">
              <tr>
                <td colSpan={3} className="py-1.5 px-2">Jumlah</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(fa.total_cost)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(fa.total_accumulated)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(fa.total_book_value)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p>
          Beban penyusutan bulan ini {formatRupiah(fa.depreciation_expense)}. Saldo buku besar: 1-3000 {formatRupiah(fa.ledger_cost)},
          1-3999 {formatRupiah(fa.ledger_accumulated)}.
        </p>
      </Note>

      <Note n={8} title="Utang Usaha">
        <Rows rows={[
          ...n.payables.suppliers.map((s) => ({ label: s.supplier_name, value: s.amount })),
          ...(n.payables.other_adjustments !== 0 ? [{ label: 'Penyesuaian lain (selisih historis)', value: n.payables.other_adjustments }] : []),
          { label: 'Jumlah utang usaha (2-1000)', value: n.payables.ledger_balance, strong: true },
        ]} />
      </Note>

      <Note n={9} title="Ekuitas">
        <Rows rows={[...n.equity.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })), { label: 'Jumlah ekuitas', value: n.equity.total, strong: true }]} />
      </Note>
    </div>
  );
};
