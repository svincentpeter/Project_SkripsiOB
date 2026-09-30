import React from 'react';
import type { BalanceSheet, EquityChanges, IncomeStatement, StatementSection } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

/** Pos pengurang ditulis dalam kurung; nilai negatif pada pos pengurang berarti penambah. */
const amountText = (value: number, subtract: boolean): string =>
  subtract ? (value >= 0 ? `(${formatRupiah(value)})` : formatRupiah(-value)) : formatRupiah(value);

const SectionRows: React.FC<{ title: string; section: StatementSection; subtract?: boolean }> = ({ title, section, subtract = false }) => (
  <>
    <tr className="bg-slate-50">
      <td colSpan={2} className="py-2 px-3 font-bold text-slate-800">{title}</td>
    </tr>
    {section.lines.length === 0 ? (
      <tr>
        <td colSpan={2} className="py-1.5 px-6 text-slate-400 italic">Tidak ada saldo</td>
      </tr>
    ) : (
      section.lines.map((line) => (
        <tr key={line.code ?? line.name}>
          <td className="py-1.5 px-6 text-slate-700">
            {line.code && <span className="font-mono text-slate-400 mr-2">{line.code}</span>}
            {line.name}
          </td>
          <td className={`py-1.5 px-3 text-right font-mono w-44 ${line.amount < 0 && !subtract ? 'text-rose-700' : 'text-slate-900'}`}>
            {amountText(line.amount, subtract)}
          </td>
        </tr>
      ))
    )}
    <tr className="border-t border-slate-200">
      <td className="py-1.5 px-3 font-bold text-slate-700">Jumlah {title.toLowerCase()}</td>
      <td className="py-1.5 px-3 text-right font-mono font-bold">{amountText(section.total, subtract)}</td>
    </tr>
  </>
);

const TotalRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <tr className="bg-slate-900 text-white">
    <td className="py-2 px-3 font-black">{label}</td>
    <td className={`py-2 px-3 text-right font-mono font-black ${value < 0 ? 'text-rose-300' : ''}`}>{formatRupiah(value)}</td>
  </tr>
);

export const IncomeStatementTable: React.FC<{ statement: IncomeStatement }> = ({ statement }) => (
  <table className="w-full text-xs border border-slate-200">
    <tbody>
      <SectionRows title="Pendapatan Usaha" section={statement.revenue} />
      <SectionRows title="Potongan Penjualan" section={statement.contra_revenue} subtract />
      <TotalRow label="PENDAPATAN BERSIH" value={statement.net_revenue} />
      <SectionRows title="Beban Pokok Penjualan" section={statement.cost_of_sales} subtract />
      <TotalRow label="LABA KOTOR" value={statement.gross_profit} />
      <SectionRows title="Beban Operasional" section={statement.operating_expenses} subtract />
      <TotalRow label="LABA (RUGI) BERSIH" value={statement.net_income} />
    </tbody>
  </table>
);

export const BalanceSheetTables: React.FC<{ sheet: BalanceSheet }> = ({ sheet }) => (
  <div className="space-y-3">
    <div role="status" className={`p-3 rounded-xl border text-xs font-bold ${
      sheet.is_balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
    }`}>
      {sheet.is_balanced
        ? `Seimbang: total aset sama dengan total liabilitas & ekuitas per ${sheet.as_of}.`
        : `Tidak seimbang: selisih ${formatRupiah(sheet.difference)} per ${sheet.as_of}.`}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <table className="w-full text-xs border border-slate-200">
        <tbody>
          <SectionRows title="Aset Lancar" section={sheet.current_assets} />
          <SectionRows title="Aset Tetap" section={sheet.fixed_assets} />
          <TotalRow label="TOTAL ASET" value={sheet.total_assets} />
        </tbody>
      </table>
      <table className="w-full text-xs border border-slate-200">
        <tbody>
          <SectionRows title="Liabilitas" section={sheet.liabilities} />
          <SectionRows title="Ekuitas" section={sheet.equity} />
          <TotalRow label="TOTAL LIABILITAS & EKUITAS" value={sheet.total_liabilities_and_equity} />
        </tbody>
      </table>
    </div>
  </div>
);

export const EquityChangesTable: React.FC<{ changes: EquityChanges }> = ({ changes }) => (
  <div className="space-y-2">
    <table className="w-full text-xs border border-slate-200">
      <tbody>
        <tr><td className="py-1.5 px-3">Ekuitas awal periode</td><td className="py-1.5 px-3 text-right font-mono w-44">{formatRupiah(changes.opening_equity)}</td></tr>
        <tr><td className="py-1.5 px-3">Setoran modal & saldo awal</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(changes.owner_contributions)}</td></tr>
        <tr><td className="py-1.5 px-3">Prive (pengambilan pemilik)</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(-changes.owner_drawings)}</td></tr>
        <tr><td className="py-1.5 px-3">Laba (rugi) bersih periode</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(changes.net_income)}</td></tr>
        <TotalRow label="EKUITAS AKHIR PERIODE" value={changes.closing_equity} />
      </tbody>
    </table>
    {changes.difference !== 0 && (
      <p role="alert" className="text-[11px] font-bold text-rose-700">Selisih rekonsiliasi ekuitas {formatRupiah(changes.difference)}.</p>
    )}
  </div>
);
