import { ChevronDown, Download, FileSpreadsheet, FileText, FileType2, Table2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReportData, ReportId } from './registry';
import type { ExportCtx, ExportFormat } from './types';
import { useExport } from './useExport';

const FORMAT_META: Record<ExportFormat, { label: string; Icon: typeof FileText }> = {
  xlsx: { label: 'Excel (.xlsx)', Icon: FileSpreadsheet },
  pdf: { label: 'PDF (.pdf)', Icon: FileText },
  docx: { label: 'Word (.docx)', Icon: FileType2 },
  csv: { label: 'CSV (.csv)', Icon: Table2 },
};

interface ExportMenuProps<K extends ReportId> {
  reportId: K;
  data: ReportData<K>;
  ctx: ExportCtx;
}

export function ExportMenu<K extends ReportId>({ reportId, data, ctx }: ExportMenuProps<K>) {
  const { busy, run, formats } = useExport(reportId, data, ctx);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy !== null}
        className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer disabled:opacity-50"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{busy ? 'Memproses...' : 'Export'}</span>
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-30 w-44 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {formats.map((f) => {
            const { label, Icon } = FORMAT_META[f];
            return (
              <button
                key={f}
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setOpen(false);
                  void run(f);
                }}
                className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
