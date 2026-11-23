import {
  AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { formatStamp } from '../kop';
import type { ExportColumn, ExportDoc, ExportSection } from '../types';
import { displayCell } from './cellFormat';

const isNum = (c: ExportColumn): boolean => c.type === 'currency' || c.type === 'number' || c.type === 'percent';

const computeColPercents = (sec: ExportSection): number[] => {
  const cols = sec.columns;
  const n = cols.length;
  if (n === 0) return [];
  if (n === 1) return [100];
  if (n === 2 && cols[0].type === 'text' && (isNum(cols[1]) || cols[1].key === 'value')) {
    return [70, 30];
  }
  const weights = cols.map((c) => {
    let maxLen = c.label.length;
    for (const r of sec.rows) {
      const len = displayCell(r[c.key], c.type).length;
      if (len > maxLen) maxLen = len;
    }
    if (c.type === 'currency') return Math.min(22, Math.max(15, maxLen + 2));
    if (c.type === 'date') return 13;
    if (c.type === 'number' || c.type === 'percent') return Math.min(12, Math.max(c.width ?? 8, maxLen + 2));
    return Math.min(36, Math.max(c.width ?? 16, Math.min(maxLen + 2, 32)));
  });
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const pcts = weights.map((w) => Math.max(5, Math.round((w / total) * 100)));
  const sumPct = pcts.reduce((a, b) => a + b, 0);
  if (sumPct !== 100) {
    let maxIdx = 0;
    for (let i = 1; i < pcts.length; i++) {
      if (pcts[i] > pcts[maxIdx]) maxIdx = i;
    }
    pcts[maxIdx] = Math.max(5, pcts[maxIdx] + (100 - sumPct));
  }
  return pcts;
};

const cell = (
  text: string,
  o: { bold?: boolean; white?: boolean; fill?: string; right?: boolean; center?: boolean; widthPct?: number; fontSize?: number },
): TableCell =>
  new TableCell({
    width: o.widthPct ? { size: o.widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill } : undefined,
    margins: { top: 65, bottom: 65, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: o.right ? AlignmentType.RIGHT : o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: o.bold, color: o.white ? 'FFFFFF' : '0F172A', size: o.fontSize ?? 17 })],
    })],
  });

const sectionTable = (sec: ExportSection): Table => {
  const pcts = computeColPercents(sec);
  const fontSize = sec.columns.length >= 10 ? 15 : 17;
  const head = new TableRow({
    tableHeader: true,
    children: sec.columns.map((c, i) =>
      cell(c.label, {
        bold: true,
        white: true,
        fill: '1E293B',
        right: isNum(c),
        center: c.align === 'center',
        widthPct: pcts[i],
        fontSize,
      }),
    ),
  });
  const body = sec.rows.map((r, rIdx) =>
    new TableRow({
      children: sec.columns.map((c, i) =>
        cell(displayCell(r[c.key], c.type), {
          right: isNum(c),
          center: c.align === 'center',
          fill: rIdx % 2 === 1 ? 'F8FAFC' : undefined,
          widthPct: pcts[i],
          fontSize,
        }),
      ),
    }),
  );
  const total = sec.totals
    ? [
        new TableRow({
          children: sec.columns.map((c, i) =>
            cell(i === 0 ? 'TOTAL' : displayCell(sec.totals![c.key] ?? null, c.type), {
              bold: true,
              right: isNum(c),
              center: c.align === 'center',
              fill: 'E2E8F0',
              widthPct: pcts[i],
              fontSize,
            }),
          ),
        }),
      ]
    : [];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [head, ...body, ...total] });
};

export const buildDocument = (doc: ExportDoc): Document => {
  const k = doc.kop;
  const isLandscape = doc.orientation === 'landscape';
  const center = (text: string, bold = false, size = 18, color = '0F172A'): Paragraph =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text, bold, size, color })] });
  const children: (Paragraph | Table)[] = [
    center(`${k.storeName} ${k.branchName}`.trim(), true, 26),
    center(`${k.address}${k.city ? ', ' + k.city : ''}`, false, 18, '334155'),
    center(`${k.phone}${k.email ? ' / ' + k.email : ''}`, false, 18, '334155'),
    new Paragraph({
      spacing: { before: 60, after: 100 },
      border: { bottom: { style: BorderStyle.DOUBLE, size: 8, color: '1E293B' } },
      children: [],
    }),
    center(k.reportTitle, true, 22),
    center(`Periode: ${k.periodLabel}`, false, 18, '334155'),
    center(`Dicetak: ${formatStamp(k.generatedAt)} oleh ${k.generatedBy}`, false, 15, '64748B'),
    new Paragraph({ spacing: { after: 120 }, children: [] }),
  ];
  doc.sections.forEach((sec) => {
    if (sec.title) {
      children.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [new TextRun({ text: sec.title, bold: true, size: 19, color: '0F172A' })],
        }),
      );
    }
    children.push(sectionTable(sec));
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  });
  return new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
            },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children,
      },
    ],
  });
};

export const toDocxBlob = (doc: ExportDoc): Promise<Blob> => Packer.toBlob(buildDocument(doc));
