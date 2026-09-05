import React from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  TrendingUp, 
  Building2, 
  CheckCircle2, 
  Info,
  CreditCard,
  Coins
} from 'lucide-react';
import { CashFlowStatementResult } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface CashFlowStatementTabProps {
  cashFlow: CashFlowStatementResult;
  periodLabel?: string;
}

export const CashFlowStatementTab: React.FC<CashFlowStatementTabProps> = ({
  cashFlow,
  periodLabel = 'September 2026',
}) => {
  const isPositiveNetCash = cashFlow.netCashFlow >= 0;

  return (
    <div className="space-y-5">
      {/* 4 Quick Executive Cash KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Uang Masuk</span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-800 block mt-0.5">
            +{formatRupiah(cashFlow.totalOperatingInflows + cashFlow.cashFromCapital)}
          </span>
          <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
            Penjualan tunai & piutang tertagih
          </span>
        </div>

        <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3.5">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Total Uang Keluar</span>
          <span className="text-base sm:text-lg font-black font-mono text-rose-800 block mt-0.5">
            -{formatRupiah(cashFlow.totalOperatingOutflows + cashFlow.cashPaidForFixedAssets + cashFlow.cashPaidForPayables)}
          </span>
          <span className="text-[10px] text-rose-700 font-medium mt-0.5 block">
            Belanja ban, biaya operasional & hutang
          </span>
        </div>

        <div className={`border rounded-xl p-3.5 ${
          isPositiveNetCash ? 'bg-blue-50/70 border-blue-200' : 'bg-amber-50/70 border-amber-200'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${
            isPositiveNetCash ? 'text-blue-700' : 'text-amber-700'
          }`}>
            Perubahan Kas Bersih
          </span>
          <span className={`text-base sm:text-lg font-black font-mono block mt-0.5 ${
            isPositiveNetCash ? 'text-blue-800' : 'text-amber-800'
          }`}>
            {isPositiveNetCash ? '+' : ''}{formatRupiah(cashFlow.netCashFlow)}
          </span>
          <span className={`text-[10px] font-medium mt-0.5 block ${
            isPositiveNetCash ? 'text-blue-700' : 'text-amber-700'
          }`}>
            {isPositiveNetCash ? 'Kas bersih bertambah' : 'Kas bersih berkurang'}
          </span>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-3.5 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Kas & Bank Akhir</span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-400 block mt-0.5">
            {formatRupiah(cashFlow.endingCash)}
          </span>
          <span className="text-[10px] text-slate-300 font-medium mt-0.5 block">
            Uang riil siap pakai saat ini
          </span>
        </div>
      </div>

      {/* Structured Cash Flow Statement Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="table-fixed w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100/90 text-slate-800 font-bold border-b border-slate-200 text-[11px]">
              <th className="py-2.5 px-4 text-left">Aktivitas Arus Kas (Standar SAK EMKM)</th>
              <th className="py-2.5 px-4 text-right w-44">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {/* 1. AKTIVITAS OPERASI */}
            <tr className="bg-slate-50 font-bold text-slate-800 text-xs uppercase tracking-wide">
              <td colSpan={2} className="py-2 px-4 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>1. ARUS KAS DARI AKTIVITAS OPERASI</span>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 pl-8 text-slate-700">
                Penerimaan kas dari penjualan ban baru & jasa servis tunai
              </td>
              <td className="py-2 px-4 text-right font-mono font-bold text-emerald-700">
                +{formatRupiah(cashFlow.cashFromSales)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 pl-8 text-slate-700">
                Penerimaan pelunasan piutang pelanggan (AR)
              </td>
              <td className="py-2 px-4 text-right font-mono font-bold text-emerald-700">
                +{formatRupiah(cashFlow.cashFromReceivables)}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 pl-8 text-slate-700">
                Pengeluaran untuk beban operasional bengkel (gaji, listrik, sewa, perlengkapan)
              </td>
              <td className="py-2 px-4 text-right font-mono font-bold text-rose-600">
                -{formatRupiah(cashFlow.cashPaidForExpenses)}
              </td>
            </tr>
            {cashFlow.cashPaidForInventory > 0 && (
              <tr>
                <td className="py-2 px-4 pl-8 text-slate-700">
                  Pengeluaran untuk pembelian persediaan ban baru tunai
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-rose-600">
                  -{formatRupiah(cashFlow.cashPaidForInventory)}
                </td>
              </tr>
            )}
            <tr className="bg-blue-50/50 font-bold text-slate-900">
              <td className="py-2 px-4 pl-6 text-blue-950">
                Arus Kas Bersih dari Aktivitas Operasi
              </td>
              <td className={`py-2 px-4 text-right font-mono font-black ${
                cashFlow.netOperatingCashFlow >= 0 ? 'text-blue-900' : 'text-rose-700'
              }`}>
                {cashFlow.netOperatingCashFlow >= 0 ? '+' : ''}{formatRupiah(cashFlow.netOperatingCashFlow)}
              </td>
            </tr>

            {/* 2. AKTIVITAS INVESTASI */}
            <tr className="bg-slate-50 font-bold text-slate-800 text-xs uppercase tracking-wide">
              <td colSpan={2} className="py-2 px-4 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>2. ARUS KAS DARI AKTIVITAS INVESTASI</span>
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 pl-8 text-slate-700">
                Perolehan peralatan bengkel & penambahan mesin spooring/balancing
              </td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-700">
                {cashFlow.cashPaidForFixedAssets > 0 ? `-${formatRupiah(cashFlow.cashPaidForFixedAssets)}` : 'Rp 0'}
              </td>
            </tr>
            <tr className="bg-indigo-50/50 font-bold text-slate-900">
              <td className="py-2 px-4 pl-6 text-indigo-950">
                Arus Kas Bersih dari Aktivitas Investasi
              </td>
              <td className="py-2 px-4 text-right font-mono font-black text-slate-800">
                {formatRupiah(cashFlow.netInvestingCashFlow)}
              </td>
            </tr>

            {/* 3. AKTIVITAS PENDANAAN */}
            <tr className="bg-slate-50 font-bold text-slate-800 text-xs uppercase tracking-wide">
              <td colSpan={2} className="py-2 px-4 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-purple-600" />
                <span>3. ARUS KAS DARI AKTIVITAS PENDANAAN</span>
              </td>
            </tr>
            {cashFlow.cashFromCapital > 0 && (
              <tr>
                <td className="py-2 px-4 pl-8 text-slate-700">
                  Setoran penambahan modal dari pemilik bengkel
                </td>
                <td className="py-2 px-4 text-right font-mono font-bold text-emerald-700">
                  +{formatRupiah(cashFlow.cashFromCapital)}
                </td>
              </tr>
            )}
            <tr>
              <td className="py-2 px-4 pl-8 text-slate-700">
                Pembayaran kewajiban hutang dagang kepada distributor ban (AP)
              </td>
              <td className="py-2 px-4 text-right font-mono font-bold text-rose-600">
                {cashFlow.cashPaidForPayables > 0 ? `-${formatRupiah(cashFlow.cashPaidForPayables)}` : 'Rp 0'}
              </td>
            </tr>
            <tr className="bg-purple-50/50 font-bold text-slate-900">
              <td className="py-2 px-4 pl-6 text-purple-950">
                Arus Kas Bersih dari Aktivitas Pendanaan
              </td>
              <td className={`py-2 px-4 text-right font-mono font-black ${
                cashFlow.netFinancingCashFlow >= 0 ? 'text-purple-900' : 'text-rose-700'
              }`}>
                {cashFlow.netFinancingCashFlow >= 0 ? '+' : ''}{formatRupiah(cashFlow.netFinancingCashFlow)}
              </td>
            </tr>

            {/* 4. REKONSILIASI KAS BERSIH AKHIR */}
            <tr className="bg-slate-100 font-black text-xs text-slate-900 border-t-2 border-slate-300">
              <td className="py-2.5 px-4 pl-6 uppercase">
                KENAIKAN / (PENURUNAN) BERSIH KAS & SETARA KAS
              </td>
              <td className={`py-2.5 px-4 text-right font-mono text-sm ${
                isPositiveNetCash ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {isPositiveNetCash ? '+' : ''}{formatRupiah(cashFlow.netCashFlow)}
              </td>
            </tr>
            <tr className="bg-white">
              <td className="py-2 px-4 pl-8 text-slate-600">
                Saldo Kas & Setara Kas pada Awal Periode
              </td>
              <td className="py-2 px-4 text-right font-mono font-bold text-slate-800">
                {formatRupiah(cashFlow.beginningCash)}
              </td>
            </tr>
            <tr className="bg-emerald-50/70 font-black text-xs text-emerald-950 border-t border-emerald-200">
              <td className="py-3 px-4 pl-6 uppercase">
                SALDO AKHIR KAS & SETARA KAS PERIODE INI
              </td>
              <td className="py-3 px-4 text-right font-mono text-base font-black text-emerald-800">
                {formatRupiah(cashFlow.endingCash)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Reconciliation breakdown cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Kas Toko (Laci Kasir)</span>
              <span className="text-[10px] text-slate-500 font-mono">Akun 1-1000 Kas Tunai</span>
            </div>
          </div>
          <span className="font-mono font-black text-slate-900 text-sm">
            {formatRupiah(cashFlow.cashDrawerEnding)}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">Bank BCA Cabang 3</span>
              <span className="text-[10px] text-slate-500 font-mono">Akun 1-1001 Rekening Operasional</span>
            </div>
          </div>
          <span className="font-mono font-black text-slate-900 text-sm">
            {formatRupiah(cashFlow.bankBcaEnding)}
          </span>
        </div>
      </div>
    </div>
  );
};
