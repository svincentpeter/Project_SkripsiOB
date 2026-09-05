import React from 'react';
import { X, Printer, Download, BookMarked, Building2 } from 'lucide-react';
import { LedgerAccountSummary, ChartOfAccount } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface LedgerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerData: LedgerAccountSummary;
  accountMeta: ChartOfAccount;
  startDate?: string;
  endDate?: string;
}

export const LedgerPrintModal: React.FC<LedgerPrintModalProps> = ({
  isOpen,
  onClose,
  ledgerData,
  accountMeta,
  startDate,
  endDate,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const periodLabel = startDate && endDate
    ? `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`
    : startDate
    ? `Mulai ${formatDateIndo(startDate)}`
    : endDate
    ? `Hingga ${formatDateIndo(endDate)}`
    : 'Semua Periode Transaksi';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold tracking-wide">Pratinjau Lembar Cetak Buku Besar (General Ledger)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 text-slate-900 font-sans" id="printable-ledger-sheet">
          {/* Header Kop Surat Formal */}
          <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-700 print:text-black" />
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  BENGKEL OMAH BAN BSD CABANG 3
                </h1>
              </div>
              <p className="text-xs text-slate-600">
                Pusat Servis Ban Mobil, Spooring 3D & Balancing • SAK EMKM Standard
              </p>
              <p className="text-[11px] text-slate-500">
                Jl. Raya Serpong No. 88, Tangerang Selatan | Telp: (021) 555-8901 | NPWP: 01.345.678.9-411.000
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-[11px] font-black uppercase bg-slate-100 border border-slate-300 rounded text-slate-800">
                KARTU BUKU BESAR
              </span>
              <p className="text-[10px] text-slate-500 mt-1">Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>
          </div>

          {/* Account Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Nomor Akun COA</span>
              <span className="font-mono font-black text-slate-900 text-sm">{accountMeta.account_code}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Nama Akun</span>
              <span className="font-bold text-slate-900 truncate block">{accountMeta.account_name}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Saldo Normal & Posisi</span>
              <span className="font-bold text-slate-900">{accountMeta.normal_balance} ({accountMeta.account_type})</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Rentang Periode</span>
              <span className="font-medium text-slate-800">{periodLabel}</span>
            </div>
          </div>

          {/* Formal Running Balance Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="table-fixed w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800 text-[11px]">
                  <th className="w-24 py-2 px-2.5 border-r border-slate-300">Tanggal</th>
                  <th className="w-28 py-2 px-2.5 border-r border-slate-300">No. Jurnal</th>
                  <th className="w-28 py-2 px-2.5 border-r border-slate-300">No. Bukti/Ref</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">Keterangan / Posisi Transaksi</th>
                  <th className="w-28 py-2 px-2.5 text-right border-r border-slate-300">Debit (Rp)</th>
                  <th className="w-28 py-2 px-2.5 text-right border-r border-slate-300">Kredit (Rp)</th>
                  <th className="w-32 py-2 px-2.5 text-right bg-slate-200/60">Saldo Berjalan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {/* Saldo Awal Baris */}
                <tr className="bg-slate-50/70 font-semibold text-slate-800">
                  <td className="py-1.5 px-2.5 border-r border-slate-200 font-sans">-</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-blue-700 font-bold">SALDO AWAL</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-400 font-sans">-</td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200 font-sans text-slate-600 italic">
                    Saldo awal periode {periodLabel}
                  </td>
                  <td className="py-1.5 px-2.5 text-right border-r border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-2.5 text-right border-r border-slate-200 text-slate-400">-</td>
                  <td className="py-1.5 px-2.5 text-right font-black text-slate-900 bg-slate-100">
                    {formatRupiah(ledgerData.initial_balance)}
                  </td>
                </tr>

                {/* Transaksi Rows */}
                {ledgerData.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400 font-sans italic">
                      Tidak ada mutasi transaksi untuk akun ini pada periode yang dipilih.
                    </td>
                  </tr>
                ) : (
                  ledgerData.transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-sans">{formatDateIndo(tx.date)}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-bold text-slate-900">{tx.journal_number}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-slate-600 font-sans truncate">{tx.ref_doc || '-'}</td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 font-sans text-slate-800 truncate">
                        {tx.description}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border-r border-slate-200 text-blue-700">
                        {tx.debit > 0 ? formatRupiah(tx.debit) : '-'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right border-r border-slate-200 text-emerald-700">
                        {tx.credit > 0 ? formatRupiah(tx.credit) : '-'}
                      </td>
                      <td className="py-1.5 px-2.5 text-right font-black text-slate-900 bg-slate-50">
                        {formatRupiah(tx.running_balance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="border-t-2 border-slate-400 font-mono text-xs font-black bg-slate-100 text-slate-900">
                <tr>
                  <td colSpan={4} className="py-2 px-2.5 text-right font-sans font-bold border-r border-slate-300">
                    TOTAL MUTASI & SALDO AKHIR:
                  </td>
                  <td className="py-2 px-2.5 text-right text-blue-900 border-r border-slate-300">
                    {formatRupiah(ledgerData.total_debit)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-emerald-900 border-r border-slate-300">
                    {formatRupiah(ledgerData.total_credit)}
                  </td>
                  <td className="py-2 px-2.5 text-right text-slate-950 bg-slate-200">
                    {formatRupiah(ledgerData.ending_balance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 3-Tier Formal Signature Block */}
          <div className="pt-6 border-t border-slate-200">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="space-y-16">
                <span className="block text-slate-600 font-semibold">Dibuat Oleh (Staf Kasir/Akuntansi)</span>
                <div className="space-y-0.5">
                  <div className="border-b border-slate-400 w-36 mx-auto"></div>
                  <p className="font-bold text-slate-800">Kasir Toko Cabang 3</p>
                  <p className="text-[10px] text-slate-500">Tanggal: {new Date().toISOString().substring(0, 10)}</p>
                </div>
              </div>

              <div className="space-y-16">
                <span className="block text-slate-600 font-semibold">Diperiksa Oleh (Supervisor Bengkel)</span>
                <div className="space-y-0.5">
                  <div className="border-b border-slate-400 w-36 mx-auto"></div>
                  <p className="font-bold text-slate-800">Spv. Operasional Cabang 3</p>
                  <p className="text-[10px] text-slate-500">Tanggal: {new Date().toISOString().substring(0, 10)}</p>
                </div>
              </div>

              <div className="space-y-16">
                <span className="block text-slate-600 font-semibold">Disetujui Oleh (Pemilik Bengkel)</span>
                <div className="space-y-0.5">
                  <div className="border-b border-slate-400 w-36 mx-auto"></div>
                  <p className="font-bold text-slate-800">Direktur / Owner Omah Ban</p>
                  <p className="text-[10px] text-slate-500">Tanggal: {new Date().toISOString().substring(0, 10)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
