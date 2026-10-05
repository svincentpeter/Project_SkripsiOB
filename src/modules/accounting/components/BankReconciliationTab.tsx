import React, { useEffect, useRef, useState } from 'react';
import { Banknote, Layers, Link2, Plus, Trash2, Unlink, Upload, Wand2 } from 'lucide-react';
import type { ApiJournal } from '../../../services/api';
import { sakEmkmApi } from '../../../services/api/sakEmkmApi';
import { currentMonth, localDate, monthLabel } from '../../../services/accountingPeriod';
import type { BankStatementLine, OutstandingLedgerItem } from '../../../shared/types/sakEmkm';
import { useToast } from '../../../shared/components';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { formatDateIndo, formatRupiah, parseDecimalRupiah } from '../../../shared/utils/formatters';
import { groupCandidates, groupGapCents } from '../bankGroupMatch';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface BankReconciliationTabProps {
  refreshKey?: number;
  onJournalsPosted: (journals: ApiJournal[]) => void;
  /** Tanggal kunci tutup buku bila diketahui (akses accounting_hub): mutasi s/d tanggal ini tidak dapat dibukukan. */
  lockDate?: string | null;
}

const cents = (n: number): number => Math.round(n * 100);
const ledgerAmount = (i: OutstandingLedgerItem): number => i.debit - i.credit;
const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'Permintaan ditolak server.');
const decimalText = (n: number): string => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n);
const FORMAT_HINT = 'Gunakan format 12.345.678,90 atau 12345678.90 (minus di depan untuk saldo cerukan).';

export const BankReconciliationTab: React.FC<BankReconciliationTabProps> = ({ refreshKey = 0, onJournalsPosted, lockDate = null }) => {
  const toast = useToast();
  const [period, setPeriod] = useState(currentMonth());
  // Teks bebas (bukan MoneyInput yang hanya bilangan bulat positif): saldo bank bisa bersen dan negatif (cerukan).
  const [balanceText, setBalanceText] = useState('');
  const [draft, setDraft] = useState({ statement_date: localDate(), description: '', amount: '', direction: 'OUT' as 'IN' | 'OUT' });
  const [busy, setBusy] = useState(false);
  // Pencocokan gabungan: satu mutasi (mis. setoran QRIS harian) ke beberapa jurnal bank.
  const [group, setGroup] = useState<{ lineId: number; picked: number[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const isCurrent = period === currentMonth();
  const report = useServerData(() => sakEmkmApi.bankReconciliation(period), [period, refreshKey]);
  // Laporan bulan lalu dinilai per akhir bulannya: jurnal yang baru dicocokkan belakangan tetap tampil "belum muncul".
  // Status pencocokan saat ini diambil dari laporan bulan berjalan (outstanding = belum dicocokkan sama sekali).
  const now = useServerData(() => (isCurrent ? Promise.resolve(null) : sakEmkmApi.bankReconciliation(currentMonth())), [period, refreshKey]);
  const r = report.data;
  const unmatched = (isCurrent ? r : now.data)?.outstanding_ledger ?? [];
  const unmatchedIds = new Set(unmatched.map((i) => i.journal_item_id));

  useEffect(() => {
    setBalanceText(r?.statement_ending_balance == null ? '' : decimalText(r.statement_ending_balance));
  }, [r?.period, r?.statement_ending_balance]);

  /** Hanya panggilan server yang ditangkap; muat ulang & notifikasi sukses di luar jalur galat. */
  const act = async <T,>(title: string, call: () => Promise<T>, done: (res: T) => string) => {
    setBusy(true);
    let res: T;
    try {
      res = await call();
    } catch (err) {
      toast.error(title, errorText(err));
      return;
    } finally {
      setBusy(false);
    }
    report.reload();
    now.reload();
    toast.success(title, done(res));
  };

  const saveBalance = () => {
    const balance = parseDecimalRupiah(balanceText);
    if (balance === null || !balanceText.trim()) {
      toast.warning('Format Saldo Salah', `Isi saldo akhir rekening koran. ${FORMAT_HINT}`);
      return;
    }
    void act('Saldo Rekening Koran', () => sakEmkmApi.setStatementBalance(period, balance), () => `Saldo akhir ${monthLabel(period)} disimpan.`);
  };

  const addLine = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseDecimalRupiah(draft.amount);
    if (amount === null) {
      toast.warning('Format Nominal Salah', 'Gunakan format 1.234.567,89 atau 1234567.89.');
      return;
    }
    // Nominal selalu positif; tanda mengikuti pilihan Arah.
    if (!draft.description.trim() || amount <= 0) {
      toast.warning('Mutasi Belum Lengkap', 'Isi keterangan dan nominal mutasi (lebih dari 0; arah menentukan masuk/keluar).');
      return;
    }
    void act('Tambah Mutasi', () => sakEmkmApi.addStatementLine({
      statement_date: draft.statement_date,
      description: draft.description.trim(),
      amount: draft.direction === 'IN' ? amount : -amount,
    }), () => {
      setDraft((d) => ({ ...d, description: '', amount: '' }));
      return 'Baris rekening koran disimpan.';
    });
  };

  const importFile = (file: File) => {
    // Kosongkan dulu agar berkas yang sama bisa dipilih lagi setelah diperbaiki.
    if (fileRef.current) fileRef.current.value = '';
    void act('Impor Rekening Koran', () => sakEmkmApi.importStatement(file),
      (res) => `${res.imported} mutasi diimpor, ${res.skipped} dilewati karena sudah ada.`);
  };

  const autoMatch = () => act('Cocokkan Otomatis', () => sakEmkmApi.autoMatch(period), (res) => `${res.matched} mutasi dicocokkan.`);

  const match = (line: BankStatementLine, journalItemIds: number[]) => act('Cocokkan Mutasi',
    () => sakEmkmApi.matchStatementLine(line.id, journalItemIds), () => {
      setGroup(null);
      return `${line.description} dicocokkan dengan ${journalItemIds.length} jurnal.`;
    });

  const unmatch = (line: BankStatementLine) => act('Lepas Pencocokan',
    () => sakEmkmApi.unmatchStatementLine(line.id),
    () => `${line.description} kembali belum dicocokkan${line.parent_id !== null ? ' (seluruh gabungan dilepas)' : ''}.`);

  const toggleGroupItem = (id: number) =>
    setGroup((g) => g && { ...g, picked: g.picked.includes(id) ? g.picked.filter((p) => p !== id) : [...g.picked, id] });

  const remove = (line: BankStatementLine) => {
    if (!window.confirm(`Hapus mutasi "${line.description}"?`)) return;
    void act('Hapus Mutasi', () => sakEmkmApi.deleteStatementLine(line.id), () => 'Baris rekening koran dihapus.');
  };

  const postAdjustment = (line: BankStatementLine) => {
    // Setoran QRIS/transfer yang belum dicocokkan akan terbukukan dua kali bila dicatat sebagai bunga.
    const what = line.amount < 0 ? 'biaya administrasi bank (6-1012)' : 'bunga bank (4-3000)';
    if (!window.confirm(
      `Bukukan ${formatRupiah(Math.abs(line.amount))} "${line.description}" sebagai ${what}?\n\n` +
        'Hanya untuk mutasi yang belum ada di buku. Setoran QRIS/transfer penjualan atau pembayaran yang sudah dijurnal ' +
        'harus dicocokkan (gunakan "Beberapa jurnal" untuk setoran gabungan), bukan dibukukan lagi.',
    )) return;
    void act(line.amount < 0 ? 'Biaya Admin Bank' : 'Bunga Bank',
    () => sakEmkmApi.postBankAdjustment(line.id), (res) => {
      onJournalsPosted(res.journals);
      return `${res.journals[0]?.entry_number ?? 'Jurnal'} dibukukan.`;
    });
  };

  // Hanya jurnal yang belum dicocokkan di mana pun; yang sudah dipakai mutasi lain akan ditolak server.
  const candidates = (line: BankStatementLine): OutstandingLedgerItem[] =>
    unmatched.filter((i) => cents(ledgerAmount(i)) === cents(line.amount));

  const field = 'px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';
  const button = 'px-3 py-2 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 text-xs">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5"><Banknote className="w-5 h-5 text-blue-600" />Rekonsiliasi Bank BCA (1-1001)</h2>
          <p className="text-slate-500">Cocokkan mutasi rekening koran dengan jurnal bank; mutasi yang hanya ada di bank dibukukan sebagai biaya admin atau bunga.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Bulan</span>
            <input type="month" value={period} max={currentMonth()} onChange={(e) => e.target.value && e.target.value <= currentMonth() && setPeriod(e.target.value)} className={field} />
          </label>
          {/* Tanpa saldo rekening koran, ringkasan ekspor akan menampilkan selisih 0 yang menyesatkan. */}
          {r && r.statement_ending_balance !== null && (
            <ExportMenu reportId="bank_reconciliation" data={r} ctx={{ periodLabel: monthLabel(period), startDate: r.start_date, endDate: r.end_date }} />
          )}
        </div>
      </div>

      <ServerStatus loading={report.loading && !r} error={report.error} onRetry={report.reload} />
      {/* Bulan lalu: kandidat pencocokan berasal dari laporan bulan berjalan; tanpa itu tidak ada kandidat yang ditawarkan. */}
      {!isCurrent && <ServerStatus loading={false} error={now.error} onRetry={now.reload} />}

      {r && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-700 block">Menurut rekening koran</span>
              <div className="flex items-center gap-2">
                <input type="text" inputMode="decimal" value={balanceText} onChange={(e) => setBalanceText(e.target.value)} placeholder="0,00"
                  title={FORMAT_HINT} className={`${field} w-full font-mono text-right`} aria-label="Saldo akhir rekening koran (Rp)" />
                <button type="button" onClick={saveBalance} disabled={busy} className={`${button} text-white bg-slate-800 hover:bg-slate-900`}>Simpan</button>
              </div>
              <p>+ Setoran dalam perjalanan <span className="font-mono float-right">{formatRupiah(r.deposits_in_transit)}</span></p>
              <p>− Pembayaran belum dikliring <span className="font-mono float-right">{formatRupiah(r.outstanding_payments)}</span></p>
              <p className="font-black">Saldo bank disesuaikan <span className="font-mono float-right">{r.adjusted_bank_balance === null ? '-' : formatRupiah(r.adjusted_bank_balance)}</span></p>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-700 block">Menurut buku besar</span>
              <p>Saldo 1-1001 per {formatDateIndo(r.end_date)} <span className="font-mono float-right">{formatRupiah(r.book_balance)}</span></p>
              <p>+ Penerimaan bank belum dicatat <span className="font-mono float-right">{formatRupiah(r.unrecorded_credits)}</span></p>
              <p>− Pengeluaran bank belum dicatat <span className="font-mono float-right">{formatRupiah(r.unrecorded_debits)}</span></p>
              <p className="font-black">Saldo buku disesuaikan <span className="font-mono float-right">{formatRupiah(r.adjusted_book_balance)}</span></p>
            </div>
            <div className={`p-3 rounded-xl border ${r.is_reconciled ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status {monthLabel(period)}</span>
              <span className="text-lg font-black text-slate-900 block">
                {r.statement_ending_balance === null ? 'Isi saldo rekening koran' : r.is_reconciled ? 'Terekonsiliasi' : `Selisih ${formatRupiah(r.difference ?? 0)}`}
              </span>
              <span className="text-slate-600">Jurnal sebelum {formatDateIndo(r.cutover_date)} dianggap sudah cocok (awal rekonsiliasi).</span>
            </div>
          </div>

          <form onSubmit={addLine} className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-slate-200">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal</span>
              <input type="date" required value={draft.statement_date} max={localDate()} onChange={(e) => setDraft({ ...draft, statement_date: e.target.value })} className={field} />
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="block font-bold text-slate-700 mb-1">Keterangan mutasi</span>
              <input type="text" maxLength={255} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={`${field} w-full`} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Arah</span>
              <select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as 'IN' | 'OUT' })} className={field}>
                <option value="IN">Masuk (kredit rekening)</option>
                <option value="OUT">Keluar (debet rekening)</option>
              </select>
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nominal</span>
              <input type="text" inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0,00"
                className={`${field} font-mono text-right`} />
            </label>
            <button type="submit" disabled={busy} className={`${button} text-white bg-blue-600 hover:bg-blue-700`}><Plus className="w-4 h-4" />Tambah</button>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${button} text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200`}>
              <Upload className="w-4 h-4" />Impor CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" aria-label="Berkas CSV rekening koran"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <button type="button" disabled={busy} onClick={autoMatch} className={`${button} text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200`}>
              <Wand2 className="w-4 h-4" />Cocokkan Otomatis
            </button>
            <p className="w-full text-[11px] text-slate-500">
              Format CSV: baris pertama <code>tanggal;keterangan;jumlah</code> (pemisah ; atau ,), tanggal YYYY-MM-DD atau DD/MM/YYYY,
              jumlah angka tanpa titik ribuan, desimal pakai titik (contoh 1234.56), negatif untuk uang keluar (contoh -6500).
            </p>
          </form>

          <section className="space-y-2">
            <h3 className="font-black text-slate-900">Mutasi rekening koran {monthLabel(period)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 text-slate-600 font-bold text-left">
                  <tr><th className="py-2 px-2">Tanggal</th><th className="py-2 px-2">Keterangan</th><th className="py-2 px-2 text-right">Jumlah</th><th className="py-2 px-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.lines.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Belum ada mutasi rekening koran bulan ini.</td></tr>}
                  {r.lines.map((line) => {
                    const options = candidates(line);
                    const locked = lockDate !== null && line.statement_date <= lockDate;
                    const grouping = group?.lineId === line.id ? group : null;
                    const groupOptions = grouping ? groupCandidates(line, unmatched) : [];
                    const gap = grouping ? groupGapCents(line, groupOptions.filter((i) => grouping.picked.includes(i.journal_item_id))) : 0;
                    return (
                      <React.Fragment key={line.id}>
                      <tr>
                        <td className="py-2 px-2">{formatDateIndo(line.statement_date)}</td>
                        <td className="py-2 px-2">
                          {line.description}
                          <span className="block text-[10px] text-slate-400">
                            {line.source}
                            {line.parent_id !== null && line.parent_amount !== null && ` · bagian dari mutasi gabungan ${formatRupiah(line.parent_amount)}`}
                          </span>
                        </td>
                        <td className={`py-2 px-2 text-right font-mono ${line.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatRupiah(line.amount)}</td>
                        <td className="py-2 px-2">
                          {line.journal_item_id !== null ? (
                            <span className="flex items-center gap-2">
                              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{line.matched_entry_number}</span>
                              {line.matched_entry_date && line.matched_entry_date > r.end_date && (
                                <span className="text-slate-400">(dicatat {formatDateIndo(line.matched_entry_date)})</span>
                              )}
                              {line.matched_reference_type !== 'BANK_RECON_ADJUSTMENT' && (
                                <button type="button" disabled={busy} onClick={() => unmatch(line)} aria-label={`Lepas ${line.description}`}
                                  title={line.parent_id !== null ? 'Lepas seluruh mutasi gabungan' : 'Lepas pencocokan'}
                                  className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"><Unlink className="w-3.5 h-3.5" /></button>
                              )}
                            </span>
                          ) : (
                            <span className="flex flex-wrap items-center gap-2">
                              {options.length > 0 && (
                                <select value="" disabled={busy} aria-label={`Cocokkan ${line.description}`}
                                  onChange={(e) => e.target.value && match(line, [Number(e.target.value)])} className={field}>
                                  <option value="">Cocokkan dengan jurnal…</option>
                                  {options.map((i) => (
                                    <option key={i.journal_item_id} value={i.journal_item_id}>{i.entry_date} {i.entry_number} — {i.description}</option>
                                  ))}
                                </select>
                              )}
                              {groupCandidates(line, unmatched).length > 1 && (
                                <button type="button" disabled={busy} onClick={() => setGroup(grouping ? null : { lineId: line.id, picked: [] })}
                                  aria-expanded={grouping !== null}
                                  className="px-2 py-1 font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-40">
                                  <Layers className="w-3.5 h-3.5" />Beberapa jurnal
                                </button>
                              )}
                              {locked ? (
                                <span className="text-slate-500">Periode ditutup: catat lewat jurnal manual.</span>
                              ) : (
                                <button type="button" disabled={busy} onClick={() => postAdjustment(line)}
                                  className="px-2 py-1 font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer disabled:opacity-40">
                                  {line.amount < 0 ? 'Bukukan biaya admin' : 'Bukukan bunga bank'}
                                </button>
                              )}
                              <button type="button" disabled={busy} onClick={() => remove(line)} aria-label={`Hapus ${line.description}`}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </span>
                          )}
                        </td>
                      </tr>
                      {grouping && (
                        <tr className="bg-blue-50/50">
                          <td colSpan={4} className="py-2 px-3 space-y-2">
                            <p className="font-bold text-slate-700">Pilih jurnal yang dibayar lewat mutasi ini (mis. semua penjualan QRIS yang disetor Midtrans hari itu):</p>
                            <div className="max-h-56 overflow-y-auto space-y-1">
                              {groupOptions.map((i) => (
                                <label key={i.journal_item_id} className="flex items-center gap-2 cursor-pointer">
                                  <input type="checkbox" checked={grouping.picked.includes(i.journal_item_id)} onChange={() => toggleGroupItem(i.journal_item_id)} />
                                  <span className="font-mono">{formatDateIndo(i.entry_date)} {i.entry_number}</span>
                                  <span className="flex-1 truncate">{i.description}</span>
                                  <span className="font-mono">{formatRupiah(Math.abs(ledgerAmount(i)))}</span>
                                </label>
                              ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={gap === 0 ? 'text-emerald-700 font-bold' : 'text-amber-800'}>
                                {gap === 0 ? 'Total jurnal sama dengan mutasi.' : `Sisa ${formatRupiah(Math.abs(gap) / 100)} ${gap * line.amount > 0 ? 'belum terpilih' : 'kelebihan'}.`}
                              </span>
                              <button type="button" disabled={busy || gap !== 0 || grouping.picked.length < 1} onClick={() => match(line, grouping.picked)}
                                className={`${button} text-white bg-blue-600 hover:bg-blue-700`}><Link2 className="w-4 h-4" />Cocokkan {grouping.picked.length} jurnal</button>
                              <button type="button" onClick={() => setGroup(null)} className="text-slate-500 hover:text-slate-700 cursor-pointer">Batal</button>
                            </div>
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {r.unrecorded_bank.some((l) => l.journal_item_id === null && l.statement_date < r.start_date) && (
              <p className="text-amber-800">Ada mutasi rekening koran bulan sebelumnya yang belum dicocokkan; buka bulan tersebut untuk menyelesaikannya.</p>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="font-black text-slate-900">Jurnal bank yang belum muncul di rekening koran per {formatDateIndo(r.end_date)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 text-slate-600 font-bold text-left">
                  <tr><th className="py-2 px-2">Tanggal</th><th className="py-2 px-2">No Jurnal</th><th className="py-2 px-2">Keterangan</th><th className="py-2 px-2 text-right">Masuk</th><th className="py-2 px-2 text-right">Keluar</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.outstanding_ledger.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-500">Semua jurnal bank sudah cocok.</td></tr>}
                  {r.outstanding_ledger.map((i) => (
                    <tr key={i.journal_item_id}>
                      <td className="py-2 px-2">{formatDateIndo(i.entry_date)}</td>
                      <td className="py-2 px-2 font-mono">{i.entry_number}</td>
                      <td className="py-2 px-2">
                        {i.description}
                        {i.reversal_pair && (
                          <span className="block text-[10px] text-slate-500">Saling hapus dengan {i.reversal_pair} (bersih Rp 0); cocokkan keduanya hanya bila uangnya benar keluar-masuk rekening.</span>
                        )}
                        {!isCurrent && now.data && !unmatchedIds.has(i.journal_item_id) && (
                          <span className="block text-[10px] text-emerald-700">Sudah dicocokkan dengan mutasi bulan berikutnya.</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-right font-mono">{i.debit ? formatRupiah(i.debit) : ''}</td>
                      <td className="py-2 px-2 text-right font-mono">{i.credit ? formatRupiah(i.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
