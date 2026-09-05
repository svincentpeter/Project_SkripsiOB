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
  FileSpreadsheet
} from 'lucide-react';
import { JournalEntry, TireProduct } from '../../../shared/types';
import { calculateDynamicSakEmkmFinancials } from '../../../services/accountingService';
import { formatRupiah } from '../../../shared/utils/formatters';

interface SakEmkmReportTabProps {
  journals: JournalEntry[];
  initialBalances: Record<string, number>;
  products: TireProduct[];
}

export const SakEmkmReportTab: React.FC<SakEmkmReportTabProps> = ({
  journals,
  initialBalances,
  products,
}) => {
  const [activeReportSubTab, setActiveReportSubTab] = useState<'income' | 'balance' | 'calk'>('income');
  const [periodMonth, setPeriodMonth] = useState('September 2026');

  const financials = calculateDynamicSakEmkmFinancials(journals, initialBalances, products);

  // Print Document (Clean A4)
  const handlePrint = () => {
    window.print();
  };

  // Export Financials to CSV
  const handleExportCsv = () => {
    let csv = `LAPORAN KEUANGAN SAK EMKM OMAH BAN CABANG 3\nPeriode: ${periodMonth}\n\n`;
    csv += '=== 1. LAPORAN LABA RUGI ===\n';
    csv += 'Komponen Akuntansi,Nominal (Rp)\n';
    csv += `Penjualan Bruto Ban Baru,${financials.grossSales}\n`;
    csv += `Potongan Penjualan (Diskon),-${financials.discounts}\n`;
    csv += `PENJUALAN BERSIH,${financials.netSales}\n`;
    csv += `Beban Pokok Penjualan (HPP FIFO),-${financials.totalHpp}\n`;
    csv += `LABA BRUTO (GROSS PROFIT),${financials.grossProfit}\n\n`;

    csv += 'Rincian Beban Operasional Usaha:\n';
    financials.expenseBreakdown.forEach((exp) => {
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
    csv += `TOTAL LIABILITAS & EKUITAS,${financials.totalLiabilitiesAndEquity}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Keuangan_SAK_EMKM_OB3_${periodMonth.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 md:p-7 shadow-xs space-y-5">
      {/* Report Top Bar with Sub-tabs and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        {/* Sub-Tab Navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setActiveReportSubTab('income')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'income'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Laba Rugi</span>
          </button>
          <button
            onClick={() => setActiveReportSubTab('balance')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'balance'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Posisi Keuangan (Neraca)</span>
          </button>
          <button
            onClick={() => setActiveReportSubTab('calk')}
            className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeReportSubTab === 'calk'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>CALK</span>
          </button>
        </div>

        {/* Actions: Period Selector, Print, Export */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{periodMonth}</span>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex-1 sm:flex-none justify-center px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none justify-center px-4 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak A4</span>
          </button>
        </div>
      </div>

      {/* Main Report Body */}
      <div>
        {/* Formal Report Header */}
        <div className="text-center border-b border-slate-200 pb-5 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5 text-indigo-600" />
            Omah Ban Cabang 3 — Bengkel & Toko Ban
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {activeReportSubTab === 'income' && 'LAPORAN LABA RUGI'}
            {activeReportSubTab === 'balance' && 'LAPORAN POSISI KEUANGAN (NERACA)'}
            {activeReportSubTab === 'calk' && 'CATATAN ATAS LAPORAN KEUANGAN (CALK)'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM) • Periode {periodMonth}
          </p>
        </div>

        {/* SUB-VIEW 1: LAPORAN LABA RUGI */}
        {activeReportSubTab === 'income' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="border border-slate-200 rounded-xl overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs sm:text-sm min-w-[480px]">
                <tbody className="divide-y divide-slate-100 font-sans">
                  {/* PENDAPATAN USAHA */}
                  <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider">
                    <td colSpan={2} className="p-3">1. PENDAPATAN USAHA</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-700">Penjualan Kotor Ban Baru (Omzet)</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">{formatRupiah(financials.grossSales)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-rose-600">Dikurangi: Potongan Penjualan (Diskon Kasir)</td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">({formatRupiah(financials.discounts)})</td>
                  </tr>
                  <tr className="bg-indigo-50/40 font-bold text-slate-900">
                    <td className="p-3 pl-6">PENJUALAN BERSIH</td>
                    <td className="p-3 text-right font-mono font-black text-indigo-900">{formatRupiah(financials.netSales)}</td>
                  </tr>

                  {/* HPP */}
                  <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider">
                    <td colSpan={2} className="p-3">2. BEBAN POKOK PENJUALAN (HPP)</td>
                  </tr>
                  <tr>
                    <td className="p-3 pl-6 text-slate-700">
                      Beban Pokok Penjualan Ban Baru (Metode FIFO)
                      <span className="block text-[11px] text-slate-400 font-normal">
                        Alokasi otomatis dari product_batches lapisan FIFO tanggal pembelian
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600">({formatRupiah(financials.totalHpp)})</td>
                  </tr>
                  <tr className="bg-emerald-50/50 font-bold text-slate-900">
                    <td className="p-3 pl-6 font-black text-emerald-950">LABA BRUTO USAHA (GROSS PROFIT)</td>
                    <td className="p-3 text-right font-mono font-black text-emerald-800 text-base">{formatRupiah(financials.grossProfit)}</td>
                  </tr>

                  {/* BEBAN OPERASIONAL */}
                  <tr className="bg-slate-50 font-black text-slate-800 uppercase tracking-wider">
                    <td colSpan={2} className="p-3">3. BEBAN OPERASIONAL USAHA</td>
                  </tr>
                  {financials.expenseBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-3 pl-6 text-slate-400 italic">Belum ada pengeluaran beban operasional</td>
                    </tr>
                  ) : (
                    financials.expenseBreakdown.map((exp) => (
                      <tr key={exp.code}>
                        <td className="p-2.5 pl-6 text-slate-700">
                          <span className="font-mono font-bold text-slate-400 mr-2">{exp.code}</span>
                          {exp.name}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-800">
                          {formatRupiah(exp.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                  <tr className="bg-slate-100/70 font-bold text-slate-800">
                    <td className="p-3 pl-6">TOTAL BEBAN OPERASIONAL</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">({formatRupiah(financials.totalExpenses)})</td>
                  </tr>

                  {/* LABA NETO AKHIR */}
                  <tr className="bg-emerald-50 border-t-2 border-emerald-600 font-black text-base">
                    <td className="p-4 pl-6 uppercase tracking-tight text-emerald-950">
                      LABA NETO PERIODE BERJALAN (NET PROFIT)
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-800 text-lg font-black">
                      {formatRupiah(financials.netIncome)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Note badge */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Jejak Audit:</strong> Laba Neto sebesar <strong>{formatRupiah(financials.netIncome)}</strong> secara otomatis menutup dan ditransfer ke akun Ekuitas <em>Laba Periode Berjalan</em> pada Laporan Posisi Keuangan di bawah ini.
              </span>
            </div>
          </div>
        )}

        {/* SUB-VIEW 2: LAPORAN POSISI KEUANGAN (NERACA) */}
        {activeReportSubTab === 'balance' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Balanced Indicator Alert */}
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              financials.isBalanceSheetBalanced 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  Kondisi Neraca: <strong>{financials.isBalanceSheetBalanced ? 'SEIMBANG (ASET = LIABILITAS + EKUITAS)' : 'TIDAK SEIMBANG'}</strong>
                </span>
              </div>
              <span className="text-xs font-mono font-bold">
                Total Keseimbangan: {formatRupiah(financials.totalAssets)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SISI KIRI: ASET */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-blue-700 text-white p-3.5 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>ASET (AKTIVA)</span>
                  <span className="font-mono font-black text-sm">{formatRupiah(financials.totalAssets)}</span>
                </div>

                <div className="p-4 space-y-4 text-xs">
                  {/* Aset Lancar */}
                  <div>
                    <h4 className="font-bold text-blue-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      A. Aset Lancar
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
                        <span className="font-sans text-slate-600">Piutang Dagang (AR)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.piutangDagang)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Persediaan Ban Baru Cabang 3</span>
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
                      B. Aset Tetap
                    </h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Peralatan Bengkel & Mesin Spooring 3D</span>
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
                <div className="bg-slate-800 text-white p-3.5 font-extrabold text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>LIABILITAS & EKUITAS (PASIVA)</span>
                  <span className="font-mono font-black text-sm">{formatRupiah(financials.totalLiabilitiesAndEquity)}</span>
                </div>

                <div className="p-4 space-y-4 text-xs">
                  {/* Liabilitas */}
                  <div>
                    <h4 className="font-bold text-amber-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      A. Liabilitas (Kewajiban)
                    </h4>
                    <div className="space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">Hutang Dagang Supplier (Distributor Ban)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.hutangSupplier)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-sans text-slate-600">PPN Keluaran (11%)</span>
                        <span className="font-bold text-slate-800">{formatRupiah(financials.ppnKeluaran)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold font-sans text-slate-900">
                        <span>Total Liabilitas</span>
                        <span className="font-mono text-amber-700">{formatRupiah(financials.totalLiabilities)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ekuitas */}
                  <div>
                    <h4 className="font-bold text-purple-700 uppercase tracking-wide border-b border-slate-100 pb-1 mb-2">
                      B. Ekuitas (Modal)
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
                        <span className="font-sans font-bold">Laba Periode Berjalan (Bulan Ini)</span>
                        <span className="font-bold">{formatRupiah(financials.currentNetIncome)}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-100 font-bold font-sans text-slate-900">
                        <span>Total Ekuitas</span>
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

        {/* SUB-VIEW 3: CATATAN ATAS LAPORAN KEUANGAN (CALK) */}
        {activeReportSubTab === 'calk' && (
          <div className="max-w-3xl mx-auto space-y-6 text-xs text-slate-700 leading-relaxed font-sans">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  1. Gambaran Umum Entitas Usaha
                </h3>
                <p>
                  <strong>Omah Ban Cabang 3</strong> merupakan entitas usaha dagang dan jasa bengkel otomotif yang bergerak di bidang penjualan ban mobil baru dan jasa spooring balancing 3D. Entitas ini beroperasi sebagai unit bisnis UMKM di bawah pengelolaan pemilik mandiri.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  2. Dasar Penyusunan Laporan Keuangan
                </h3>
                <p>
                  Laporan keuangan disusun berdasarkan <strong>Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM)</strong> yang diterbitkan oleh Ikatan Akuntan Indonesia (IAI). Basis pengukuran menggunakan biaya historis (*historical cost*) dan disusun dengan dasar akrual (*accrual basis*), kecuali untuk laporan arus kas.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  3. Ikhtisar Kebijakan Akuntansi Penting
                </h3>
                <ul className="list-disc pl-5 space-y-1.5 mt-1 text-slate-600">
                  <li>
                    <strong>Persediaan:</strong> Dinilai berdasarkan biaya perolehan menggunakan metode <em>First-In, First-Out (FIFO)</em>. Setiap ban yang keluar dialokasikan langsung dari lapisan batch tertua.
                  </li>
                  <li>
                    <strong>Aset Tetap:</strong> Diakui sebesar harga perolehan dikurangi akumulasi penyusutan. Penyusutan dihitung menggunakan metode garis lurus (*straight-line method*) atas estimasi masa manfaat mesin spooring dan balancing.
                  </li>
                  <li>
                    <strong>Pengakuan Pendapatan:</strong> Pendapatan dari penjualan ban dan jasa diakui pada saat penyerahan barang atau penyelesaian pekerjaan kepada pelanggan kasir.
                  </li>
                  <li>
                    <strong>Liabilitas:</strong> Hutang usaha diakui sebesar jumlah tagihan tempo dari prinsipal distributor (PT Bridgestone, PT Elangperdana, PT Sumi Rubber).
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight mb-1">
                  4. Verifikasi Persediaan Fisik vs Buku Besar
                </h3>
                <p>
                  Nilai persediaan ban berdasarkan saldo Buku Besar adalah <strong>{formatRupiah(financials.persediaanBuku)}</strong>. Nilai fisik persediaan gudang per opname berjalan adalah <strong>{formatRupiah(financials.totalInventoryPhysical)}</strong>. Selisih dipantau secara berkala melalui modul Stock Opname & Kartu Stok.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
