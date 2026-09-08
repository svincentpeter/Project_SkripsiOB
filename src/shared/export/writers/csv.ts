import type { ExportDoc } from '../types';

const esc = (s: string): string => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export const buildCsv = (doc: ExportDoc): string => {
  const lines: string[] = [];
  doc.sections.forEach((sec, i) => {
    if (i > 0) lines.push('');
    if (sec.title) lines.push(esc(sec.title));
    lines.push(sec.columns.map((c) => esc(c.label)).join(','));
    sec.rows.forEach((r) =>
      lines.push(sec.columns.map((c) => esc(r[c.key] === null || r[c.key] === '' ? '' : String(r[c.key]))).join(',')),
    );
    if (sec.totals) {
      lines.push(
        sec.columns
          .map((c, idx) => (idx === 0 ? 'TOTAL' : esc(sec.totals![c.key] === undefined ? '' : String(sec.totals![c.key]))))
          .join(','),
      );
    }
  });
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
};

export const toCsvBlob = (doc: ExportDoc): Blob =>
  new Blob([buildCsv(doc)], { type: 'text/csv;charset=utf-8;' });
