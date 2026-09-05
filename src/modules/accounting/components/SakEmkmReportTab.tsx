import React, { useState } from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  Calendar, 
  TrendingUp, 
  Scale, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Banknote,
  ShieldCheck,
  Wallet,
  Sparkles
} from 'lucide-react';
import { JournalEntry, TireProduct } from '../../../shared/types';
import { calculateDynamicSakEmkmFinancials, calculateCashFlowStatement } from '../../../services/accountingService';
import { formatRupiah } from '../../../shared/utils/formatters';
import { CashFlowStatementTab } from './CashFlowStatementTab';
import { FinancialStatementsPrintModal } from './FinancialStatementsPrintModal';

interface SakEmkmReportTabProps {
  journals: JournalEntry[];
  initialBalances: Record<string, number>;
  products: TireProduct[];
}

type PeriodType = 'THIS_MONTH' | 'LAST_MONTH' | 'ALL';

export const SakEmkmReportTab: React.FC<SakEmkmReportTabProps> = ({
  journals,
  initialBalances,
  products,
}) => {
  const [activeReportSubTab, setActiveReportSubTab] = useState<'income' | 'balance' | 'cashflow' | 'calk'>('income');
  const [periodType, setPeriodType] = useState<PeriodType>('THIS_MONTH');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Compute effective start and end dates based on filter
  let effectiveStartDate: string | undefined = undefined;
  let effectiveEndDate: string | undefined = undefined;
  let periodLabel = 'September 2026';

  if (periodType === 'THIS_MONTH') {
    effectiveStartDate = '2026-09-01';
    effectiveEndDate = '2026-09-30';
    periodLabel = 'Bulan Ini (September 2026)';
  } else if (periodType === 'LAST_MONTH') {
    effectiveStartDate = '2026-08-01';
    effectiveEndDate = '2026-08-31';
    periodLabel = 'Bulan Lalu (Agustus 2026)';
  } else if (periodType === 'ALL') {
    effectiveStartDate = undefined;
    effectiveEndDate = undefined;
    periodLabel = 'Semua Periode Akuntansi';
  }

  const financials = calculateDynamicSakEmkmFinancials(
    journals, 
    initialBalances, 
    products, 
    effectiveStartDate, 
    effectiveEndDate
  );

  const cashFlow = calculateCashFlowStatement(
    journals, 
    initialBalances, 
    effectiveStartDate, 
    effectiveEndDate
  );

  // Export Financials to CSV
  const handleExportCsv = () => {
    let csv = `LAPORAN KEUANGAN EKSEKUTIF SAK EMKM OMAH BAN CABANG 3\nPeriode: ${periodLabel}\n\n`;
    csv += '=== 1. LAPORAN LABA RUGI ===\n';
    csv += 'Komponen Akuntansi,Nominal (Rp)\n';
    csv += `Penjualan Bruto Ban Baru,${financials.grossSales}\n`;
    csv += `Potongan Penjualan (Diskon),-${financials.discounts}\n`;
    csv += `PENJUALAN BERSIH,${financials.netSales}\n`;
    csv += `Beban Pokok Penjualan (HPP FIFO),-${financials.totalHpp}\n`;
    csv += `LABA BRUTO (GROSS PROFIT),${financials.grossProfit}\n\n`;

    csv += 'Rincian Beban Operasional Usaha:\n';
    financials.expenseBreakdown.forEach((exp: any) => {
      csv += `"${exp.code} - ${exp.name}",${exp.amount}\n`;
    });
    csv += `TOTAL BEBAN OPERASIONAL,${financials.totalExpenses}\n`;
    csv += `LABA NETO PERIODE BERJALAN,${financials.netIncome}\n\n`;

    csv += '=== 2. LAPORAN POSISI KEUANGAN (NERACA) ===\n';
    csv += 'Komponen Neraca,Nominal (Rp)\n';
    csv += `Aset Lancar - Kas Laci Toko,${financials.kasLaci}\n`;
    csv += `Aset Lancar - Bank BCA Cabang 3,${financials.bankBca}\n`;
    csv += `Aset Lancar - Piutang Usaha (AR),${financials.piutangDagang}\n`;
    csv += `Aset Lancar - Persediaan Ban Baru,${financials.persediaanBuku}\n`;
    csv += `TOTAL ASET LANCAR,${financials.totalCurrentAssets}\n`;
    csv += `Aset Tetap - Mesin Spooring 3D & Peralatan,${financials.peralatanMesin}\n`;
    csv += `Akumulasi Penyusutan Mesin Bengkel,-${financials.akumulasiPenyusutan}\n`;
    csv += `NILAI BUKU ASET TETAP,${financials.netFixedAssets}\n`;
    csv += `TOTAL ASET,${financials.totalAssets}\n\n`;

    csv += `Liabilitas - Hutang Dagang Supplier (AP),${financials.hutangSupplier}\n`;
    csv += `Liabilitas - PPN Keluaran,${financials.ppnKeluaran}\n`;
    csv += `TOTAL LIABILITAS,${financials.totalLiabilities}\n`;
    csv += `Ekuitas - Modal Disetor Pemilik,${financials.modalPemilik}\n`;
    csv += `Ekuitas - Laba Ditahan,${financials.labaDitahan}\n`;
    csv += `Ekuitas - Laba Periode Berjalan,${financials.currentNetIncome}\n`;
    csv += `TOTAL EKUITAS,${financials.totalEquity}\n`;
    csv += `TOTAL LIABILITAS & EKUITAS,${financials.totalLiabilitiesAndEquity}\n\n`;

    csv += '=== 3. LAPORAN ARUS KAS RINGKAS ===\n';
    csv += `Arus Kas Operasional,${cashFlow.netOperatingCashFlow}\n`;
    csv += `Arus Kas Investasi,${cashFlow.netInvestingCashFlow}\n`;
    csv += `Arus Kas Pendanaan,${cashFlow.netFinancingCashFlow}\n`;
    csv += `Kenaikan Kas Bersih,${cashFlow.netCashFlow}\n`;
    csv += `Saldo Kas Awal,${cashFlow.beginningCash}\n`;
    csv += `Saldo Kas Akhir,${cashFlow.endingCash}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Keuangan_Eksekutif_OB3_${periodLabel.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      {/* 4 Executive KPI Cards for Owner (Simpel & Informatif) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Omzet Bersih Penjualan</span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
            {formatRupiah(financials.netSales)}
          </span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
            Bruto: {formatRupiah(financials.grossSales)} (setelah diskon)
          </span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Laba Bersih (Net Profit)</span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-800 block mt-0.5">
            {formatRupiah(financials.netIncome)}
          </span>
          <span className="text-[10px] text-emerald-700 font-bold mt-0.5 block">
            Margin Bersih: {financials.netProfitMargin.toFixed(1)}% dari omzet
          </span>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Uang Kas & Bank Tersedia</span>
          <span className="text-base sm:text-lg font-black font-mono text-blue-800 block mt-0.5">
            {formatRupiah(financials.liquidCash)}
          </span>
          <span className="text-[10px] text-blue-700 font-medium mt-0.5 block">
            Kas Laci ({formatRupiah(financials.kasLaci)}) + BCA
          </span>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Kondisi Keuangan</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-400 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SEHAT & SEIMBANG</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-300 font-medium block mt-1">
            Likuiditas: {financials.isLiquiditySafe ? 'Aman (Aset > Hutang)' : 'Waspada'}
          </span>
        </div>
      </div>

      {/* Report Top Bar with Sub-tabs and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        {/* Sub-Tab Navigation (4 Tabs) */}
        <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-xl overflow-x-auto scrollbar-none w-full sm:w-auto text-xs font-bold">
          <button
            onClick={() => setActiveReportSubTab('income')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'income'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>1. Laba Rugi</span>
          </button>

          <button
            onClick={() => setActiveReportSubTab('balance')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'balance'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>2. Posisi Keuangan (Neraca)</span>
          </button>

          <button
            onClick={() => setActiveReportSubTab('cashflow')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'cashflow'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" />
            <span>3. Arus Kas (Cash Flow)</span>
          </button>

          <button
            onClick={() => setActiveReportSubTab('calk')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'calk'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>4. Catatan (CALK)</span>
          </button>
        </div>

        {/* Actions: Period Selector, Print, Export */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Period Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setPeriodType('THIS_MONTH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodType === 'THIS_MONTH'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setPeriodType('LAST_MONTH')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodType === 'LAST_MONTH'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bulan Lalu
            </button>
            <button
              onClick={() => setPeriodType('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                periodType === 'ALL'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak Lembar Resmi</span>
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div>
        {/* Formal Report Header */}
        <div className="text-center border-b border-slate-200 pb-4 mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 text-blue-700" />
            Omah Ban BSD Cabang 3 — Bengkel & Toko Ban
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {activeReportSubTab === 'income' && 'LAPORAN LABA RUGI'}
            {activeReportSubTab === 'balance' && 'LAPORAN POSISI KEUANGAN (NERACA)'}
            {activeReportSubTab === 'cashflow' && 'LAPORAN ARUS KAS (STATEMENT OF CASH FLOWS)'}
            {activeReportSubTab === 'calk' && 'CATATAN ATAS LAPORAN KEUANGAN (CALK)'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Standar SAK EMKM • {periodLabel}
          </p>
        </div>

        {/* SUB-VIEW 1: LAPORAN LABA RUGI */}
        {activeReportSubTab === 'income' && (
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="table-fixed w-full text-xs sm:text-sm border-collapse">
                <tbody className="divide-y divide-slate-100 font-sans">
                  {/* PENDAPATAN USAHA */}
                  <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider text-xs">
                    <td colSpan={2} className="py-2.5 px-4">1. PENDAPATAN USAHA</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 pl-6 text-slate-700">Penjualan Kotor Ban Baru (Omzet Toko)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 w-44">{formatRupiah(financials.grossSales)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 pl-6 text-rose-600">Dikurangi: Potongan Penjualan (Diskon Kasir)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">({formatRupiah(financials.discounts)})</td>
                  </tr>
                  <tr className="bg-blue-50/50 font-bold text-slate-900">
                    <td className="py-2.5 px-4 pl-6 text-blue-950 font-black">PENJUALAN BERSIH (NET SALES)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-blue-900">{formatRupiah(financials.netSales)}</td>
                  </tr>

                  {/* HPP */}
                  <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider text-xs">
                    <td colSpan={2} className="py-2.5 px-4">2. BEBAN POKOK PENJUALAN (HPP)</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 pl-6 text-slate-700">
                      Beban Pokok Penjualan Ban Baru (Metode FIFO)
                      <span className="block text-[11px] text-slate-400 font-normal">
                        Harga modal ban yang terjual berdasarkan urutan masuk tertua
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-600">({formatRupiah(financials.totalHpp)})</td>
                  </tr>
                  <tr className="bg-emerald-50/60 font-bold text-slate-900">
                    <td className="py-2.5 px-4 pl-6 font-black text-emerald-950">LABA KOTOR USAHA (GROSS PROFIT)</td>
                    <td className="py-2.5 px-4 text-right font-mono font-black text-emerald-800 text-base">{formatRupiah(financials.grossProfit)}</td>
                  </tr>

                  {/* BEBAN OPERASIONAL */}
                  <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider text-xs">
                    <td colSpan={2} className="py-2.5 px-4">3. BEBAN OPERASIONAL TOKO & BENGKEL</td>
                  </tr>
                  {financials.expenseBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="py-3 px-4 pl-6 text-slate-400 italic">Belum ada pengeluaran beban operasional</td>
                    </tr>
                  ) : (
                    financials.expenseBreakdown.map((exp: any) => (
                      <tr key={exp.code}>
                        <td className="py-2 px-4 pl-6 text-slate-700">
                          <span className="font-mono font-bold text-slate-400 mr-2 text-xs">{exp.code}</span>
                          {exp.name}
                        </td>
                        <td className="py-2 px-4 text-right font-mono font-semibold text-slate-800">
                          {formatRupiah(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-100/70 font-bold text-slate-800">
                    <td className="py-2.5 px-4 pl-6">TOTAL BEBAN OPERASIONAL</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">({formatRupiah(financials.totalExpenses)})</td>
                  </tr>

                  {/* LABA NETO AKHIR */}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-600 font-black text-base">
                    <td className="py-3.5 px-4 pl-6 uppercase tracking-tight text-emerald-950">
                      LABA BERSIH PERIODE BERJALAN (NET PROFIT)
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-800 text-lg font-black">
                      {formatRupiah(financials.netIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Note badge */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Jejak Audit:</strong> Laba Bersih sebesar <strong>{formatRupiah(financials.netIncome)}</strong> secara otomatis menutup dan ditransfer ke akun Ekuitas <em>Laba Periode Berjalan</em> pada Laporan Posisi Keuangan.
              </span>
            </div>
          </div>
        )}

        {/* SUB-VIEW 2: LAPORAN POSISI KEUANGAN (NERACA) */}
        {activeReportSubTab === 'balance' && (
          <div className="max-w-4xl mx-auto space-y-5">
            {/* Balanced Indicator Alert */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              financials.isBalanceSheetBalanced 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Kondisi Neraca: <strong>{financials.isBalanceSheetBalanced ? 'SEIMBANG (ASET = LIABILITAS + EKUITAS)' : 'TIDAK SEIMBANG'}</strong>
                </span>
              </div>
              <span className="text-xs font-mono font-bold">
                Total Keseimbangan: {formatRupiah(financials.totalAssets)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* SISI KIRI: ASET */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-blue-700 text-white p-3 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>ASET (AKTIVA TOKO)</span>
                  <span className="font-mono font-black text-sm">{formatRupiah(financials.totalAssets)}</span>
                </div>

                <div className="p-4 space-y-4 text-xs">
                  {/* Aset Lancar */}
                  <div>
                    <h4 className="font-bold text-blue-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      A. Aset Lancar (Uang & Barang Cair)
                    </h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Kas Toko (Laci Kasir)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.kasLaci)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Bank BCA Cabang 3</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.bankBca)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Piutang Dagang Pelanggan (AR)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.piutangDagang)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Persediaan Stok Ban Baru</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.persediaanBuku)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold font-sans text-slate-900">
                        <span>Total Aset Lancar</span>
                        <span className="font-mono text-blue-700 font-bold">{formatRupiah(financials.totalCurrentAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Aset Tetap */}
                  <div>
                    <h4 className="font-bold text-blue-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      B. Aset Tetap (Peralatan & Mesin)
                    </h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Mesin Spooring 3D & Alat Bengkel</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.peralatanMesin)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span className="font-sans">Akumulasi Penyusutan Mesin</span>
                        <span className="font-bold">({formatRupiah(financials.akumulasiPenyusutan)})</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold font-sans text-slate-900">
                        <span>Nilai Buku Aset Tetap</span>
                        <span className="font-mono text-blue-700 font-bold">{formatRupiah(financials.netFixedAssets)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total Assets */}
                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                    <span className="uppercase">TOTAL ASET</span>
                    <span className="font-mono text-blue-900 text-base">{formatRupiah(financials.totalAssets)}</span>
                  </div>
                </div>
              </div>

              {/* SISI KANAN: LIABILITAS & EKUITAS */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-800 text-white p-3 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>LIABILITAS & EKUITAS (PASIVA)</span>
                  <span className="font-mono font-black text-sm">{formatRupiah(financials.totalLiabilitiesAndEquity)}</span>
                </div>

                <div className="p-4 space-y-4 text-xs">
                  {/* Liabilitas */}
                  <div>
                    <h4 className="font-bold text-amber-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      A. Liabilitas (Kewajiban / Hutang)
                    </h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Hutang Distributor Ban (AP Tempo)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.hutangSupplier)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">PPN Keluaran (11%)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.ppnKeluaran)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold font-sans text-slate-900">
                        <span>Total Kewajiban</span>
                        <span className="font-mono text-amber-700">{formatRupiah(financials.totalLiabilities)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ekuitas */}
                  <div>
                    <h4 className="font-bold text-purple-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      B. Ekuitas (Hak Modal Pemilik)
                    </h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Modal Disetor Pemilik</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.modalPemilik)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Laba Ditahan Cabang 3</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.labaDitahan)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700">
                        <span className="font-sans font-bold">Laba Periode Berjalan</span>
                        <span className="font-bold">{formatRupiah(financials.currentNetIncome)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold font-sans text-slate-900">
                        <span>Total Ekuitas Bersih</span>
                        <span className="font-mono text-purple-700">{formatRupiah(financials.totalEquity)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grand Total Liabilities & Equity */}
                  <div className="pt-3 border-t-2 border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                    <span className="uppercase">TOTAL LIABILITAS & EKUITAS</span>
                    <span className="font-mono text-purple-950 text-base">{formatRupiah(financials.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-VIEW 3: LAPORAN ARUS KAS (CASH FLOW) */}
        {activeReportSubTab === 'cashflow' && (
          <div className="max-w-4xl mx-auto">
            <CashFlowStatementTab cashFlow={cashFlow} periodLabel={periodLabel} />
          </div>
        )}

        {/* SUB-VIEW 4: CATATAN ATAS LAPORAN KEUANGAN (CALK) */}
        {activeReportSubTab === 'calk' && (
          <div className="max-w-3xl mx-auto space-y-4 text-xs text-slate-700 leading-relaxed font-sans">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  1. Gambaran Umum Entitas Usaha
                </h3>
                <p>
                  <strong>Omah Ban BSD Cabang 3</strong> adalah entitas usaha dagang dan jasa otomotif yang menyediakan ban mobil baru berbagai merek (Bridgestone, Accelera, Dunlop, Hankook) serta layanan spooring 3D dan balancing. Beroperasi sebagai unit UMKM mandiri di kawasan Serpong, Tangerang Selatan.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  2. Kebijakan Akuntansi SAK EMKM
                </h3>
                <p>
                  Laporan keuangan disusun mengikuti <strong>SAK EMKM</strong> (Ikatan Akuntan Indonesia) dengan prinsip biaya historis dan dasar akrual.
                </p>
                <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600">
                  <li>
                    <strong>Metode FIFO:</strong> Persediaan ban dinilai dengan urutan masuk tertua.
                  </li>
                  <li>
                    <strong>Penyusutan Mesin:</strong> Mesin spooring dan balancing disusutkan dengan metode garis lurus.
                  </li>
                  <li>
                    <strong>Pengakuan Pendapatan:</strong> Diakui saat barang diserahkan atau jasa servis selesai.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  3. Keselarasan Fisik vs Pembukuan
                </h3>
                <p>
                  Nilai persediaan ban di Buku Besar: <strong>{formatRupiah(financials.persediaanBuku)}</strong>. Nilai fisik gudang: <strong>{formatRupiah(financials.totalInventoryPhysical)}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Printable Executive Modal */}
      <FinancialStatementsPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        financials={financials}
        cashFlow={cashFlow}
        periodLabel={periodLabel}
      />
    </div>
  );
};
