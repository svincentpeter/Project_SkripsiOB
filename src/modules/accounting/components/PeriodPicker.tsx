import React from 'react';
import { Calendar } from 'lucide-react';
import { PeriodSelection, currentMonth, localDate } from '../../../services/accountingPeriod';

interface PeriodPickerProps {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
  allowAll?: boolean;
}

const field = 'px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none';

/** Pilih periode laporan: per bulan, rentang tanggal, atau semua periode. */
export const PeriodPicker: React.FC<PeriodPickerProps> = ({ value, onChange, allowAll = true }) => (
  <div className="flex flex-wrap items-center gap-2 text-xs">
    <Calendar className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
    <select
      aria-label="Jenis periode"
      value={value.kind}
      className={field}
      onChange={(e) => {
        const kind = e.target.value as PeriodSelection['kind'];
        if (kind === 'month') onChange({ kind, month: currentMonth() });
        else if (kind === 'range') onChange({ kind, start: `${currentMonth()}-01`, end: localDate() });
        else onChange({ kind: 'all' });
      }}
    >
      <option value="month">Per bulan</option>
      <option value="range">Rentang tanggal</option>
      {allowAll && <option value="all">Semua periode</option>}
    </select>
    {value.kind === 'month' && (
      <input
        type="month"
        aria-label="Bulan laporan"
        value={value.month}
        max={currentMonth()}
        className={field}
        onChange={(e) => e.target.value && onChange({ kind: 'month', month: e.target.value })}
      />
    )}
    {value.kind === 'range' && (
      <>
        <input type="date" aria-label="Dari tanggal" value={value.start} max={value.end} className={field}
          onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })} />
        <span className="text-slate-400">s/d</span>
        <input type="date" aria-label="Sampai tanggal" value={value.end} min={value.start} className={field}
          onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })} />
      </>
    )}
  </div>
);
