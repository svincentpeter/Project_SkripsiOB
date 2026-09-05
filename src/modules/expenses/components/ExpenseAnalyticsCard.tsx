import React from 'react';
import { 
  TrendingDown, 
  Wallet, 
  Building2, 
  PieChart, 
  AlertCircle, 
  CheckCircle2,
  Layers,
  ArrowUpRight
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
        amount,
        percent,
        budget,
        budgetPercent,
      };
    })
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Ringkasan Total Biaya Aktif */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Beban Operasional</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <span className="text-2xl font-black font-mono text-slate-900 tracking-tight block">
            {formatRupiah(totalActiveAmount)}
          </span>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Bulan September 2026 • <strong>{activeExpenses.length}</strong> transaksi aktif
          </span>
        </div>

        {voidExpenses.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-rose-600 font-medium">Biaya Dibatalkan (Void):</span>
            <span className="font-mono font-bold text-rose-700">
              {voidExpenses.length} transaksi ({formatRupiah(totalVoidAmount)})
            </span>
          </div>
        )}
      </div>

      {/* 2. Proporsi Sumber Kas: Laci vs Bank BCA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Sumber Pengeluaran</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <PieChart className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Wallet className="w-3.5 h-3.5 text-amber-600" />
                Kas Laci Kasir ({cashPercent}%):
              </span>
              <span className="font-mono font-bold text-slate-900">{formatRupiah(cashAmount)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
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
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${bankPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Top Beban Terbesar & Budget Limit */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Komposisi Beban Terbesar</span>
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </span>
          </div>

          <div className="space-y-2 text-[11px] max-h-[100px] overflow-y-auto custom-scrollbar pr-1">
            {categoryEntries.length === 0 ? (
              <span className="text-slate-400 italic">Belum ada pengeluaran aktif.</span>
            ) : (
              categoryEntries.slice(0, 3).map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 truncate max-w-[160px]" title={item.category}>
                      {item.category}
                    </span>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(item.amount)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.budgetPercent > 90 ? 'bg-rose-500' : 'bg-indigo-600'
                      }`} 
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <span className="text-[10px] text-slate-400 block pt-1 border-t border-slate-100">
          Standar SAK EMKM • Terkoneksi otomatis ke Buku Besar
        </span>
      </div>
    </div>
  );
};
