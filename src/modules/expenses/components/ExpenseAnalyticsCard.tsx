import React from 'react';
import { 
  TrendingDown, 
  Wallet, 
  Building2, 
  PieChart, 
  AlertCircle, 
  CheckCircle2,
  Layers,
  ShieldCheck,
  BarChart3,
  Scale
} from 'lucide-react';
import { ExpenseCategory, ExpenseRecord } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';
import { EXPENSE_CATEGORY_CONFIG } from '../../../services/accountingService';

interface ExpenseAnalyticsCardProps {
  expenses: ExpenseRecord[];
}

export const ExpenseAnalyticsCard: React.FC<ExpenseAnalyticsCardProps> = ({ expenses }) => {
  // Hanya hitung pengeluaran aktif (tidak termasuk VOID)
  const activeExpenses = expenses.filter((e) => e.status !== 'VOID');
  const voidExpenses = expenses.filter((e) => e.status === 'VOID');

  const totalActiveAmount = activeExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalVoidAmount = voidExpenses.reduce((acc, e) => acc + e.amount, 0);

  // Hitung sumber dana kas laci vs bank
  const cashAmount = activeExpenses
    .filter((e) => e.cash_source.includes('Laci') || e.payment_method === 'Cash')
    .reduce((acc, e) => acc + e.amount, 0);

  const bankAmount = activeExpenses
    .filter((e) => e.cash_source.includes('BCA') || e.payment_method === 'Transfer')
    .reduce((acc, e) => acc + e.amount, 0);

  const cashPercent = totalActiveAmount > 0 ? Math.round((cashAmount / totalActiveAmount) * 100) : 0;
  const bankPercent = totalActiveAmount > 0 ? Math.round((bankAmount / totalActiveAmount) * 100) : 0;

  // Breakdown per kategori
  const categoryTotals: Record<string, number> = {};
  activeExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  const categoryEntries = (Object.keys(EXPENSE_CATEGORY_CONFIG) as ExpenseCategory[])
    .map((cat) => {
      const amount = categoryTotals[cat] || 0;
      const percent = totalActiveAmount > 0 ? Math.round((amount / totalActiveAmount) * 100) : 0;
      const budget = EXPENSE_CATEGORY_CONFIG[cat]?.budget_monthly_limit || 0;
      const budgetPercent = budget > 0 ? Math.round((amount / budget) * 100) : 0;
      return {
        category: cat,
        code: EXPENSE_CATEGORY_CONFIG[cat]?.account_code || '6-xxxx',
        accountName: EXPENSE_CATEGORY_CONFIG[cat]?.account_name || cat,
        amount,
        percent,
        budget,
        budgetPercent,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const totalMonthlyBudget = categoryEntries.reduce((acc, c) => acc + c.budget, 0);
  const overallBudgetPercent = totalMonthlyBudget > 0 ? Math.round((totalActiveAmount / totalMonthlyBudget) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Baris Kartu Metrik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Beban & Performa Anggaran */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Beban Operasional</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <TrendingDown className="w-4 h-4" />
              </span>
            </div>
            <span className="text-2xl font-black font-mono text-slate-900 tracking-tight block">
              {formatRupiah(totalActiveAmount)}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              Realisasi {overallBudgetPercent}% dari plafon anggaran ({formatRupiah(totalMonthlyBudget)})
            </span>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-4">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallBudgetPercent > 90 ? 'bg-rose-500' : 'bg-blue-600'
              }`} 
              style={{ width: `${Math.min(100, overallBudgetPercent)}%` }}
            />
          </div>
        </div>

        {/* Sumber Pengeluaran Kas vs Bank */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Sumber Pengeluaran</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <PieChart className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                  Kas Laci Toko ({cashPercent}%):
                </span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(cashAmount)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${cashPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                  Bank BCA Cabang 3 ({bankPercent}%):
                </span>
                <span className="font-mono font-bold text-slate-900">{formatRupiah(bankAmount)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${bankPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ringkasan Integritas & Transaksi Void */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Integritas Pembukuan</span>
              <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Transaksi Aktif (Posted):</span>
                <strong className="font-mono text-emerald-700 font-bold">{activeExpenses.length} Bukti BKK</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Transaksi Dibatalkan (Void):</span>
                <strong className="font-mono text-rose-700 font-bold">{voidExpenses.length} Transaksi</strong>
              </div>
              {voidExpenses.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                  <span className="text-slate-500">Nilai Jurnal Pembalik:</span>
                  <span className="font-mono text-rose-600 font-bold">{formatRupiah(totalVoidAmount)}</span>
                </div>
              )}
            </div>
          </div>

          <span className="text-[11px] text-slate-400 block pt-2 border-t border-slate-100">
            Seluruh transaksi telah otomatis terposting ke Buku Besar SAK EMKM.
          </span>
        </div>
      </div>

      {/* 2. Tabel Rekapitulasi Anggaran vs Realisasi per Pos Beban */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-700" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Evaluasi Anggaran & Realisasi Beban (Budget vs Actual)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Periode: September 2026</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3.5">Kode Akun</th>
                <th className="py-2.5 px-3.5">Nama Akun Beban (SAK EMKM)</th>
                <th className="py-2.5 px-3.5 text-right">Realisasi (Rp)</th>
                <th className="py-2.5 px-3.5 text-right">Plafon Anggaran (Rp)</th>
                <th className="py-2.5 px-3.5 text-center">Penggunaan (%)</th>
                <th className="py-2.5 px-3.5 text-center">Status Anggaran</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {categoryEntries.map((item) => {
                let statusBadge = (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Aman
                  </span>
                );
                if (item.budgetPercent > 100) {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Over-Budget
                    </span>
                  );
                } else if (item.budgetPercent > 75) {
                  statusBadge = (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Mendekati Batas
                    </span>
                  );
                }

                return (
                  <tr key={item.category} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="py-2.5 px-3.5">
                      <span className="font-bold text-slate-900 block">{item.accountName}</span>
                      <span className="text-[10px] text-slate-500">{item.category}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                      {formatRupiah(item.budget)}
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              item.budgetPercent > 100 ? 'bg-rose-500' : item.budgetPercent > 75 ? 'bg-amber-500' : 'bg-blue-600'
                            }`} 
                            style={{ width: `${Math.min(100, item.budgetPercent)}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {item.budgetPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                      {statusBadge}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
