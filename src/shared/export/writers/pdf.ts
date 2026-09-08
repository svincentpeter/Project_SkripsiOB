import type { Content, ContentText, TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatStamp } from '../kop';
import type { ExportColumn, ExportDoc, ExportSection } from '../types';
import { displayCell } from './cellFormat';

const isNum = (c: ExportColumn): boolean => c.type === 'currency' || c.type === 'number' || c.type === 'percent';
const alignOf = (c: ExportColumn): 'left' | 'right' | 'center' => c.align ?? (isNum(c) ? 'right' : 'left');

const tableLayout = {
  hLineWidth: (): number => 0.5,
  vLineWidth: (): number => 0.5,
  hLineColor: (): string => '#CBD5E1',
  vLineColor: (): string => '#CBD5E1',
  fillColor: (rowIndex: number): string | null => (rowIndex === 0 ? '#1E293B' : rowIndex % 2 === 0 ? '#F1F5F9' : null),
};

const sectionBlock = (sec: ExportSection): Content[] => {
  const head = sec.columns.map((c) => ({ text: c.label, color: '#FFFFFF', bold: true, alignment: alignOf(c) }));
  const body = sec.rows.map((r) =>
    sec.columns.map((c) => ({ text: displayCell(r[c.key], c.type), alignment: alignOf(c) })),
  );
  if (sec.totals) {
    body.push(
      sec.columns.map((c, i) => ({
        text: i === 0 ? 'TOTAL' : displayCell(sec.totals![c.key] ?? null, c.type),
        bold: true,
        alignment: alignOf(c),
      })),
    );
  }
  const out: Content[] = [];
  if (sec.title) out.push({ text: sec.title, style: 'sectionTitle' });
  out.push({
    table: { headerRows: 1, widths: sec.columns.map((c) => c.width ?? '*'), body: [head, ...body] },
    layout: tableLayout,
    margin: [0, 0, 0, 14],
  } as Content);
  return out;
};

export const buildPdfDef = (doc: ExportDoc): TDocumentDefinitions => {
  const k = doc.kop;
  const kop: Content[] = [
    { text: `${k.storeName} ${k.branchName}`, style: 'store' },
    { text: `${k.address}${k.city ? ', ' + k.city : ''}`, style: 'sub' },
    { text: `${k.phone}${k.email ? ' / ' + k.email : ''}`, style: 'sub' },
    { canvas: [{ type: 'line', x1: 0, y1: 6, x2: 523, y2: 6, lineWidth: 1, lineColor: '#1E293B' }], margin: [0, 4, 0, 4] },
    { text: k.reportTitle, style: 'title' },
    { text: `Periode: ${k.periodLabel}`, style: 'sub' },
    { text: `Dicetak: ${formatStamp(k.generatedAt)} oleh ${k.generatedBy}`, style: 'meta' },
    { text: '', margin: [0, 8] },
  ];
  return {
    pageSize: 'A4',
    pageOrientation: doc.orientation,
    pageMargins: [36, 36, 36, 52],
    content: [...kop, ...doc.sections.flatMap(sectionBlock)],
    styles: {
      store: { fontSize: 14, bold: true, alignment: 'center' },
      title: { fontSize: 12, bold: true, alignment: 'center' },
      sub: { fontSize: 9, alignment: 'center' },
      meta: { fontSize: 8, alignment: 'center', color: '#64748B' },
      sectionTitle: { fontSize: 10, bold: true, margin: [0, 4, 0, 4] },
    },
    defaultStyle: { fontSize: 8 },
    footer: (currentPage: number, pageCount: number): ContentText => ({
      text: `Hal ${currentPage} dari ${pageCount}`, alignment: 'center', fontSize: 8, margin: [0, 10],
    }),
  };
};

export const toPdfBlob = async (doc: ExportDoc): Promise<Blob> => {
  const { createPdf } = await import('pdfmake/build/pdfmake');
  const vfs = (await import('pdfmake/build/vfs_fonts')).default;
  return new Promise<Blob>((resolve, reject) => {
    try {
      createPdf(buildPdfDef(doc), undefined, undefined, vfs).getBlob((blob: Blob) => resolve(blob));
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
};
