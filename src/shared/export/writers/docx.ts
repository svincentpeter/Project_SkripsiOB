import {
  AlignmentType, BorderStyle, Document, Packer, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, WidthType,
} from 'docx';
import { formatStamp } from '../kop';
import type { ExportColumn, ExportDoc, ExportSection } from '../types';
import { displayCell } from './cellFormat';

const isNum = (c: ExportColumn): boolean => c.type === 'currency' || c.type === 'number' || c.type === 'percent';

const cell = (text: string, o: { bold?: boolean; white?: boolean; fill?: string; right?: boolean }): TableCell =>
  new TableCell({
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    children: [new Paragraph({
      alignment: o.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: o.bold, color: o.white ? 'FFFFFF' : undefined, size: 16 })],
    })],
  });

const sectionTable = (sec: ExportSection): Table => {
  const head = new TableRow({ children: sec.columns.map((c) => cell(c.label, { bold: true, white: true, fill: '1E293B', right: isNum(c) })) });
  const body = sec.rows.map((r) => new TableRow({ children: sec.columns.map((c) => cell(displayCell(r[c.key], c.type), { right: isNum(c) })) }));
  const total = sec.totals
    ? [new TableRow({ children: sec.columns.map((c, i) => cell(i === 0 ? 'TOTAL' : displayCell(sec.totals![c.key] ?? null, c.type), { bold: true, right: isNum(c) })) })]
    : [];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body, ...total] });
};

export const buildDocument = (doc: ExportDoc): Document => {
  const k = doc.kop;
  const center = (text: string, bold = false, size = 18): Paragraph =>
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold, size })] });
  const children: (Paragraph | Table)[] = [
    center(`${k.storeName} ${k.branchName}`, true, 28),
    center(`${k.address}${k.city ? ', ' + k.city : ''}`),
    center(`${k.phone}${k.email ? ' / ' + k.email : ''}`),
    new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '1E293B' } }, children: [] }),
    center(k.reportTitle, true, 24),
    center(`Periode: ${k.periodLabel}`),
    center(`Dicetak: ${formatStamp(k.generatedAt)} oleh ${k.generatedBy}`, false, 16),
    new Paragraph({ children: [] }),
  ];
  doc.sections.forEach((sec) => {
    if (sec.title) children.push(new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: sec.title, bold: true, size: 20 })] }));
    children.push(sectionTable(sec));
    children.push(new Paragraph({ children: [] }));
  });
  return new Document({
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
  });
};

export const toDocxBlob = (doc: ExportDoc): Promise<Blob> => Packer.toBlob(buildDocument(doc));
