import { useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { buildFileName } from './naming';
import { buildExportDoc, REPORT_FORMATS, type ReportData, type ReportId } from './registry';
import type { ExportCtx, ExportDoc, ExportFormat } from './types';

const generate = async (format: ExportFormat, doc: ExportDoc): Promise<Blob> => {
  switch (format) {
    case 'csv':
      return (await import('./writers/csv')).toCsvBlob(doc);
    case 'xlsx':
      return (await import('./writers/xlsx')).toXlsxBlob(doc);
    case 'pdf':
      return (await import('./writers/pdf')).toPdfBlob(doc);
    case 'docx':
      return (await import('./writers/docx')).toDocxBlob(doc);
  }
};

const download = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const useExport = <K extends ReportId>(reportId: K, data: ReportData<K>, ctx: ExportCtx) => {
  const { notify } = useToast();
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const run = async (format: ExportFormat): Promise<void> => {
    setBusy(format);
    try {
      const doc = buildExportDoc(reportId, data, ctx);
      const rows = doc.sections.reduce((acc, s) => acc + s.rows.length, 0);
      if (rows === 0) {
        notify('info', 'Tidak ada data untuk diexport');
        return;
      }
      const filename = `${buildFileName(doc.title, ctx.startDate, ctx.endDate)}.${format}`;
      download(await generate(format, doc), filename);
      notify('success', 'Export berhasil', filename);
    } catch (err: unknown) {
      notify('error', 'Gagal membuat file', err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run, formats: REPORT_FORMATS[reportId] };
};
