import React from 'react';
import { X, Printer, Building2, CheckCircle2, ShieldCheck, FileText } from 'lucide-react';
import { CashFlowStatementResult } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface FinancialStatementsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  financials: any;
  cashFlow: CashFlowStatementResult;
  periodLabel: string;
}

export const FinancialStatementsPrintModal: React.FC<FinancialStatementsPrintModalProps> = ({
  isOpen,
  onClose,
  financials,
  cashFlow,
  periodLabel,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold tracking-wide">Pratinjau Lembar Cetak Laporan Keuangan Eksekutif (A4)</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Dokumen / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="p-6 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 text-slate-900 font-sans" id="printable-financials-sheet">
          {/* Official Letterhead (Kop Surat) */}
          <div className="border-b-2 border-slate-800 pb-4 flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-700 print:text-black" />
                <h1 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  BENGKEL OMAH BAN BSD CABANG 3
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Pusat Penjualan Ban Baru, Velg Racing & Jasa Spooring Balancing 3D
              </p>
              <p className="text-[11px] text-slate-500">
                Jl. Raya Serpong No. 88, Tangerang Selatan | Telp: (021) 555-8901 | NPWP: 01.345.678.9-411.000
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2.5 py-1 text-[10px] font-black uppercase bg-slate-100 border border-slate-300 rounded text-slate-800">
                LAPORAN KEUANGAN SAK EMKM
              </span>
              <p className="text-xs font-bold text-slate-800 mt-1">Periode: {periodLabel}</p>
              <p className="text-[10px] text-slate-500">Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>
          </div>

          {/* Section 1: Ringkasan Laba Rugi (Income Statement) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                I. LAPORAN LABA RUGI (INCOME STATEMENT)
              </h3>
              <span className="text-[10px] text-slate-500">Periode Berjalan SAK EMKM</span>
            </div>
            <table className="table-fixed w-full text-xs border-collapse">
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 px-2 text-slate-700">Penjualan Kotor Ban Baru & Jasa Servis</td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-900">{formatRupiah(financials.grossSales)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-rose-700 pl-4">Dikurangi: Potongan Penjualan (Diskon)</td>
                  <td className="py-1.5 px-2 text-right font-mono text-rose-700">({formatRupiah(financials.discounts)})</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="py-1.5 px-2">PENJUALAN BERSIH</td>
                  <td className="py-1.5 px-2 text-right font-mono text-blue-900">{formatRupiah(financials.netSales)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-rose-700 pl-4">Beban Pokok Penjualan (HPP FIFO)</td>
                  <td className="py-1.5 px-2 text-right font-mono text-rose-700">({formatRupiah(financials.totalHpp)})</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="py-1.5 px-2">LABA KOTOR (GROSS PROFIT)</td>
                  <td className="py-1.5 px-2 text-right font-mono text-emerald-900">{formatRupiah(financials.grossProfit)}</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-rose-700 pl-4">Total Beban Operasional Toko & Bengkel</td>
                  <td className="py-1.5 px-2 text-right font-mono text-rose-700">({formatRupiah(financials.totalExpenses)})</td>
                </tr>
                <tr className="font-black bg-slate-100 border-t-2 border-slate-300 text-sm">
                  <td className="py-2 px-2 uppercase">LABA BERSIH PERIODE BERJALAN (NET PROFIT)</td>
                  <td className="py-2 px-2 text-right font-mono text-emerald-800">{formatRupiah(financials.netIncome)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Ringkasan Posisi Keuangan (Balance Sheet) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                II. LAPORAN POSISI KEUANGAN (NERACA SEIMBANG)
              </h3>
              <span className="text-[10px] font-bold text-emerald-700">Kondisi: SEIMBANG</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Aktiva */}
              <div className="border border-slate-300 rounded p-2.5 space-y-1 text-xs">
                <div className="font-bold border-b border-slate-200 pb-1 text-slate-900 uppercase text-[11px]">
                  ASET (AKTIVA)
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Kas Laci Toko</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.kasLaci)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Bank BCA Cabang 3</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.bankBca)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Piutang Dagang (AR)</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.piutangDagang)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Persediaan Stok Ban</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.persediaanBuku)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Aset Tetap Mesin (Net)</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.netFixedAssets)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t-2 border-slate-300 font-bold text-blue-950">
                  <span>TOTAL ASET</span>
                  <span className="font-mono">{formatRupiah(financials.totalAssets)}</span>
                </div>
              </div>

              {/* Pasiva */}
              <div className="border border-slate-300 rounded p-2.5 space-y-1 text-xs">
                <div className="font-bold border-b border-slate-200 pb-1 text-slate-900 uppercase text-[11px]">
                  LIABILITAS & EKUITAS (PASIVA)
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Hutang Distributor (AP)</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.hutangSupplier)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">PPN Keluaran</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.ppnKeluaran)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Modal Disetor Pemilik</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.modalPemilik)}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Laba Ditahan</span>
                  <span className="font-mono text-slate-800">{formatRupiah(financials.labaDitahan)}</span>
                </div>
                <div className="flex justify-between py-0.5 text-emerald-800">
                  <span className="font-semibold">Laba Periode Berjalan</span>
                  <span className="font-mono font-bold">{formatRupiah(financials.currentNetIncome)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t-2 border-slate-300 font-bold text-slate-950">
                  <span>TOTAL PASIVA</span>
                  <span className="font-mono">{formatRupiah(financials.totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Ringkasan Arus Kas (Cash Flow) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-1">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                III. LAPORAN ARUS KAS (CASH FLOW STATEMENT)
              </h3>
              <span className="text-[10px] text-slate-500">Mutasi Uang Riil Masuk & Keluar</span>
            </div>
            <table className="table-fixed w-full text-xs border-collapse">
              <tbody className="divide-y divide-slate-200 font-sans">
                <tr>
                  <td className="py-1 px-2 text-slate-700">Arus Kas Bersih dari Aktivitas Operasi</td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">{formatRupiah(cashFlow.netOperatingCashFlow)}</td>
                </tr>
                <tr>
                  <td className="py-1 px-2 text-slate-700">Arus Kas Bersih dari Aktivitas Investasi</td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">{formatRupiah(cashFlow.netInvestingCashFlow)}</td>
                </tr>
                <tr>
                  <td className="py-1 px-2 text-slate-700">Arus Kas Bersih dari Aktivitas Pendanaan</td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-slate-900">{formatRupiah(cashFlow.netFinancingCashFlow)}</td>
                </tr>
                <tr className="font-bold bg-slate-50">
                  <td className="py-1.5 px-2">KENAIKAN / (PENURUNAN) BERSIH KAS</td>
                  <td className="py-1.5 px-2 text-right font-mono font-black text-slate-900">{formatRupiah(cashFlow.netCashFlow)}</td>
                </tr>
                <tr className="font-black bg-slate-100 border-t border-slate-300">
                  <td className="py-1.5 px-2">SALDO AKHIR KAS & BANK TERSEDIA</td>
                  <td className="py-1.5 px-2 text-right font-mono text-emerald-800">{formatRupiah(cashFlow.endingCash)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 2-Tier Formal Signature Block */}
          <div className="pt-8 border-t border-slate-300">
            <div className="grid grid-cols-2 gap-12 text-center text-xs">
              <div className="space-y-16">
                <span className="block text-slate-600 font-semibold">Disiapkan Oleh (Staf Kasir/Akuntansi)</span>
                <div className="space-y-0.5">
                  <div className="border-b border-slate-400 w-44 mx-auto"></div>
                  <p className="font-bold text-slate-800">Kasir & Staf Keuangan</p>
                  <p className="text-[10px] text-slate-500">Tanggal: {new Date().toISOString().substring(0, 10)}</p>
                </div>
              </div>

              <div className="space-y-16">
                <span className="block text-slate-600 font-semibold">Disetujui Oleh (Pemilik Bengkel / Owner)</span>
                <div className="space-y-0.5">
                  <div className="border-b border-slate-400 w-44 mx-auto"></div>
                  <p className="font-bold text-slate-800">Pemilik / Direktur Omah Ban</p>
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
