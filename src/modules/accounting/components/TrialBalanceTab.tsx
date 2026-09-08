import React from 'react';
import { 
  Scale, 
  CheckCircle2, 
  AlertTriangle, 
  Layers,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { calculateTrialBalance } from '../../../services/accountingService';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface TrialBalanceTabProps {
  journals: JournalEntry[];
  initialBalances: Record<string, number>;
  onNavigateToReports: () => void;
}

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({
  journals,
  initialBalances,
  onNavigateToReports,
}) => {
  const trialBalance = calculateTrialBalance(journals, initialBalances);
  const hasActivity = trialBalance.total_debit > 0 || trialBalance.total_credit > 0;

  return (
    <div className="space-y-4">
      {/* Verification Status Banner */}
      {!hasActivity ? (
        <div className="p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3 bg-slate-50/80">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200 text-slate-500">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight text-slate-500">Belum ada data neraca saldo</h2>
            <p className="text-xs italic text-slate-400 mt-0.5">
              Tabel terisi otomatis setelah ada ayat jurnal berstatus POSTED di database.
            </p>
          </div>
        </div>
      ) : (
      <div className={`p-4 rounded-xl border shadow-xs flex flex-wrap items-center justify-between gap-3 ${
        trialBalance.is_balanced 
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            trialBalance.is_balanced ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
          }`}>
            {trialBalance.is_balanced ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-sm font-black tracking-tight">
              {trialBalance.is_balanced 
                ? 'Neraca Saldo Seimbang Sempurna (Debit = Kredit)' 
                : `Neraca Saldo Tidak Seimbang! (Selisih: ${formatRupiah(trialBalance.difference)})`}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {trialBalance.is_balanced 
                ? 'Seluruh mutasi debit dan kredit akun Buku Besar klop dan siap disajikan ke Laporan Keuangan SAK EMKM.'
                : 'Terdapat ketidakseimbangan pencatatan pada ayat jurnal. Periksa kembali entri jurnal penyesuaian.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono border ${
            trialBalance.is_balanced
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-100 text-amber-800 border-amber-300'
          }`}>
            {trialBalance.is_balanced ? 'BALANCE 100%' : 'CHECK ENTRIES'}
          </span>
        </div>
      </div>
      )}

      {/* Main Card (Bungkus Bersih Sesuai Standar) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-700" />
              <span>Tabel Neraca Saldo (Trial Balance) Sebelum Penutupan</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar saldo debit dan kredit seluruh akun buku besar SAK EMKM Cabang 3.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu reportId="trial_balance" data={trialBalance} ctx={{ periodLabel: 'Periode Berjalan' }} />
            <button
              onClick={onNavigateToReports}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <span>Buka Laporan SAK EMKM</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table Inside Border Frame */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-28">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Rekening Buku Besar</th>
                  <th className="py-2.5 px-3 w-36">Klasifikasi</th>
                  <th className="py-2.5 px-3 w-36 text-right">Saldo Debit (Dr)</th>
                  <th className="py-2.5 px-3 w-36 text-right">Saldo Kredit (Cr)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {!hasActivity ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center font-sans">
                      <span className="text-xs italic text-slate-400">
                        Belum ada saldo akun yang ditarik dari database.
                      </span>
                    </td>
                  </tr>
                ) : (
                  trialBalance.rows.map((row) => {
                  const hasBalance = row.debit_balance > 0 || row.credit_balance > 0;
                  return (
                    <tr 
                      key={row.account_code} 
                      className={`hover:bg-slate-50/70 transition-colors ${!hasBalance ? 'opacity-40' : ''}`}
                    >
                      <td className="py-2 px-3 font-bold text-slate-700 text-xs">{row.account_code}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900 text-xs">{row.account_name}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          row.account_type === 'ASSET' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          row.account_type === 'LIABILITY' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          row.account_type === 'EQUITY' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          row.account_type === 'REVENUE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {row.account_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-indigo-700 text-xs">
                        {row.debit_balance > 0 ? formatRupiah(row.debit_balance) : '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-700 text-xs">
                        {row.credit_balance > 0 ? formatRupiah(row.credit_balance) : '-'}
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
              {/* Grand Total Footer */}
              <tfoot className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-200 font-mono text-xs">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right font-sans uppercase text-[11px] tracking-wider text-slate-600 font-bold">
                    Total Neraca Saldo:
                  </td>
                  <td className="py-2.5 px-3 text-right text-indigo-800 bg-indigo-50/60 text-xs sm:text-sm">
                    {formatRupiah(trialBalance.total_debit)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-800 bg-emerald-50/60 text-xs sm:text-sm">
                    {formatRupiah(trialBalance.total_credit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Total {trialBalance.rows.length} akun buku besar terdaftar
          </span>
          <span className="text-[11px] text-slate-400">
            {trialBalance.is_balanced ? 'Status: Seimbang (Klop)' : `Selisih: ${formatRupiah(trialBalance.difference)}`}
          </span>
        </div>
      </div>
    </div>
  );
};
