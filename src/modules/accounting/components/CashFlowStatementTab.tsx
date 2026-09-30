import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CashFlowReport } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface CashFlowStatementTabProps {
  cashFlow: CashFlowReport;
  periodLabel: string;
}

const Row: React.FC<{ label: string; value: number; strong?: boolean; indent?: boolean }> = ({ label, value, strong = false, indent = false }) => (
  <tr className={strong ? 'font-bold border-t border-slate-200' : ''}>
    <td className={`py-1.5 ${indent ? 'px-6 text-slate-700' : 'px-3'}`}>{label}</td>
    <td className={`py-1.5 px-3 text-right font-mono w-44 ${value < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatRupiah(value)}</td>
  </tr>
);

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="bg-slate-50">
    <td colSpan={2} className="py-2 px-3 font-bold text-slate-800">{children}</td>
  </tr>
);

/** Laporan arus kas metode langsung dari server; arus keluar tampil negatif. */
export const CashFlowStatementTab: React.FC<CashFlowStatementTabProps> = ({ cashFlow, periodLabel }) => (
  <div className="space-y-3">
    <p className="text-[11px] text-slate-500">Metode langsung • {periodLabel}. Arus kas keluar ditampilkan negatif.</p>
    <table className="w-full text-xs border border-slate-200">
      <tbody>
        <Heading>A. Arus Kas dari Aktivitas Operasi</Heading>
        <Row indent label="Penerimaan dari pelanggan (penjualan)" value={cashFlow.operating.customers} />
        <Row indent label="Pembayaran ke pemasok & persediaan" value={cashFlow.operating.suppliers} />
        <Row indent label="Pembayaran beban operasional" value={cashFlow.operating.expenses} />
        {cashFlow.operating.other !== 0 && <Row indent label="Arus kas operasi lainnya" value={cashFlow.operating.other} />}
        <Row strong label="Arus kas bersih dari aktivitas operasi" value={cashFlow.operating.net} />
        <Heading>B. Arus Kas dari Aktivitas Investasi</Heading>
        <Row indent label="Perolehan / pelepasan aset tetap" value={cashFlow.investing.fixed_assets} />
        <Row strong label="Arus kas bersih dari aktivitas investasi" value={cashFlow.investing.net} />
        <Heading>C. Arus Kas dari Aktivitas Pendanaan</Heading>
        <Row indent label="Setoran / (penarikan) modal pemilik" value={cashFlow.financing.equity} />
        <Row strong label="Arus kas bersih dari aktivitas pendanaan" value={cashFlow.financing.net} />
        <Row strong label="Kenaikan (penurunan) kas bersih" value={cashFlow.net_change} />
        <Row label="Saldo kas & bank awal periode" value={cashFlow.beginning_cash} />
        <Row strong label="Saldo kas & bank akhir periode" value={cashFlow.ending_cash} />
        <Row indent label="Kas laci kasir (1-1000)" value={cashFlow.ending_cash_drawer} />
        <Row indent label="Bank BCA (1-1001)" value={cashFlow.ending_bank} />
      </tbody>
    </table>
    <div role="status" className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
      cashFlow.is_reconciled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
    }`}>
      {cashFlow.is_reconciled ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>
        {cashFlow.is_reconciled
          ? 'Terekonsiliasi: saldo awal + kenaikan kas bersih = saldo kas & bank akhir.'
          : 'Tidak terekonsiliasi: periksa jurnal kas pada periode ini.'}
      </span>
    </div>
  </div>
);
