import type { Content, ContentTable, ContentText, CustomTableLayout, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatStamp } from '../kop';
import type { ExportColumn, ExportDoc, ExportSection } from '../types';
import { displayCell } from './cellFormat';

const isNum = (c: ExportColumn): boolean => c.type === 'currency' || c.type === 'number' || c.type === 'percent';
const alignOf = (c: ExportColumn): 'left' | 'right' | 'center' => c.align ?? (isNum(c) ? 'right' : 'left');

const getContentWidthPt = (orientation: 'portrait' | 'landscape'): number =>
  orientation === 'landscape' ? 777 : 531;

const isTwoColKeyVal = (sec: ExportSection): boolean =>
  sec.columns.length === 2 &&
  sec.columns[0].type === 'text' &&
  (isNum(sec.columns[1]) || sec.columns[1].key === 'value');

const computeColumnWidths = (
  sec: ExportSection,
  orientation: 'portrait' | 'landscape',
  fontSize: number,
  padX: number,
): Array<number | string> => {
  const cols = sec.columns;
  const n = cols.length;
  if (n === 0) return [];
  if (n === 1) return ['*'];
  if (isTwoColKeyVal(sec)) {
    return ['*', orientation === 'landscape' ? 175 : 145];
  }

  const contentWidth = getContentWidthPt(orientation);
  const usableInner = Math.max(200, Math.floor(contentWidth - n * (padX * 2) - (n + 1) * 0.5));
  const charPt = fontSize * 0.56;

  const metrics = cols.map((c, idx) => {
    const labelWords = c.label.split(/\s+/).filter(Boolean);
    const longestLabelWord = Math.max(3, ...labelWords.map((w) => w.length));
    const headerTargetChars =
      c.label.length <= 13 ? c.label.length + 2 : Math.max(longestLabelWord + 2, Math.ceil(c.label.length * 0.68));

    let maxCellChars = 0;
    let maxTokenChars = longestLabelWord;
    for (const r of sec.rows) {
      const txt = displayCell(r[c.key], c.type);
      if (txt.length > maxCellChars) maxCellChars = txt.length;
      if (c.type !== 'text' || (c.width !== undefined && c.width <= 22)) {
        const firstTok = txt.split(/\s+/)[0] ?? '';
        if (firstTok.length > maxTokenChars) maxTokenChars = Math.min(22, firstTok.length);
      }
    }
    if (sec.totals) {
      const totTxt = idx === 0 ? 'TOTAL' : displayCell(sec.totals[c.key] ?? null, c.type);
      if (totTxt.length > maxCellChars) maxCellChars = totTxt.length;
      if (totTxt.length > maxTokenChars && isNum(c)) maxTokenChars = Math.min(20, totTxt.length);
    }

    let weightChars: number;
    if (c.type === 'currency') {
      weightChars = Math.min(22, Math.max(14, maxCellChars + 2, headerTargetChars));
    } else if (c.type === 'date') {
      weightChars = Math.min(15, Math.max(12, maxCellChars + 1, headerTargetChars));
    } else if (c.type === 'number' || c.type === 'percent') {
      weightChars = Math.min(14, Math.max(c.width ?? 7, maxCellChars + 2, headerTargetChars));
    } else if (c.width !== undefined && c.width <= 12) {
      weightChars = Math.min(16, Math.max(c.width, maxCellChars + 2, headerTargetChars));
    } else if (c.width !== undefined && c.width <= 22) {
      weightChars = Math.min(26, Math.max(c.width, Math.min(maxCellChars + 2, 24), headerTargetChars));
    } else {
      weightChars = Math.min(44, Math.max(c.width ?? 22, Math.min(maxCellChars + 2, 40), headerTargetChars));
    }

    const minPt = Math.max(24, Math.ceil(maxTokenChars * charPt) + 4);
    return { weightChars, minPt };
  });

  const totalWeight = metrics.reduce((acc, m) => acc + m.weightChars, 0) || 1;
  const rawPts = metrics.map((m) => Math.max(m.minPt, Math.floor((m.weightChars / totalWeight) * usableInner)));
  let sumPts = rawPts.reduce((a, b) => a + b, 0);

  if (sumPts > usableInner) {
    const excess = sumPts - usableInner;
    const flexTotal = rawPts.reduce((acc, w, i) => acc + Math.max(0, w - metrics[i].minPt), 0);
    if (flexTotal > 0) {
      for (let i = 0; i < rawPts.length; i++) {
        const flex = Math.max(0, rawPts[i] - metrics[i].minPt);
        rawPts[i] -= Math.floor((flex / flexTotal) * excess);
      }
    } else {
      const scale = usableInner / sumPts;
      for (let i = 0; i < rawPts.length; i++) {
        rawPts[i] = Math.max(18, Math.floor(rawPts[i] * scale));
      }
    }
    sumPts = rawPts.reduce((a, b) => a + b, 0);
  }

  const diff = usableInner - sumPts;
  if (diff !== 0) {
    let widestIdx = 0;
    for (let i = 1; i < rawPts.length; i++) {
      if (rawPts[i] > rawPts[widestIdx]) widestIdx = i;
    }
    rawPts[widestIdx] = Math.max(20, rawPts[widestIdx] + diff);
  }

  return rawPts;
};

const makeTableLayout = (hasTotals: boolean, padX: number, padY: number): CustomTableLayout => ({
  hLineWidth: (i: number, node: ContentTable): number => {
    if (i === 0 || i === 1 || i === node.table.body.length) return 1;
    if (hasTotals && i === node.table.body.length - 1) return 1;
    return 0.5;
  },
  vLineWidth: (): number => 0.5,
  hLineColor: (i: number, node: ContentTable): string => {
    if (i === 0 || i === 1) return '#1E293B';
    if (hasTotals && (i === node.table.body.length - 1 || i === node.table.body.length)) return '#334155';
    return '#CBD5E1';
  },
  vLineColor: (): string => '#CBD5E1',
  fillColor: (rowIndex: number, node: ContentTable): string | null => {
    if (rowIndex === 0) return '#1E293B';
    if (hasTotals && rowIndex === node.table.body.length - 1) return '#E2E8F0';
    return rowIndex % 2 === 0 ? '#F8FAFC' : null;
  },
  paddingLeft: (): number => padX,
  paddingRight: (): number => padX,
  paddingTop: (): number => padY,
  paddingBottom: (): number => padY,
});

const sectionBlock = (sec: ExportSection, orientation: 'portrait' | 'landscape'): Content[] => {
  const nCols = sec.columns.length;
  const fontSize = nCols >= 12 ? 6.5 : nCols >= 8 ? 7.5 : 8.5;
  const padX = nCols >= 12 ? 3 : nCols >= 8 ? 4.5 : 6;
  const padY = nCols >= 12 ? 3.5 : 4.5;

  const head: TableCell[] = sec.columns.map((c) => ({
    text: c.label,
    color: '#FFFFFF',
    bold: true,
    fontSize,
    alignment: alignOf(c),
    noWrap: c.label.length <= 12,
  }));

  const body: TableCell[][] =
    sec.rows.length > 0
      ? sec.rows.map((r) =>
          sec.columns.map((c) => {
            const val = displayCell(r[c.key], c.type);
            const isShortFixed =
              c.type === 'currency' ||
              c.type === 'number' ||
              c.type === 'percent' ||
              c.type === 'date' ||
              (c.width !== undefined && c.width <= 12 && val.length <= 12);
            return {
              text: val,
              fontSize,
              alignment: alignOf(c),
              noWrap: isShortFixed && val.length <= 18,
            };
          }),
        )
      : [
          sec.columns.map((_, i) =>
            i === 0
              ? {
                  text: 'Tidak ada data pada periode ini.',
                  colSpan: nCols,
                  alignment: 'center' as const,
                  italics: true,
                  color: '#64748B',
                  fontSize,
                }
              : { text: '' },
          ),
        ];

  if (sec.totals) {
    body.push(
      sec.columns.map((c, i) => ({
        text: i === 0 ? 'TOTAL' : displayCell(sec.totals![c.key] ?? null, c.type),
        bold: true,
        fontSize,
        color: '#0F172A',
        alignment: alignOf(c),
        noWrap: true,
      })),
    );
  }

  const out: Content[] = [];
  if (sec.title) out.push({ text: sec.title, style: 'sectionTitle' });
  out.push({
    table: {
      headerRows: 1,
      dontBreakRows: true,
      keepWithHeaderRows: 1,
      widths: computeColumnWidths(sec, orientation, fontSize, padX),
      body: [head, ...body],
    },
    layout: makeTableLayout(Boolean(sec.totals), padX, padY),
    margin: [0, 0, 0, 14],
  } as Content);
  return out;
};

export const buildPdfDef = (doc: ExportDoc): TDocumentDefinitions => {
  const k = doc.kop;
  const lineW = getContentWidthPt(doc.orientation);
  const kop: Content[] = [
    { text: `${k.storeName} ${k.branchName}`.trim(), style: 'store' },
    { text: `${k.address}${k.city ? ', ' + k.city : ''}`, style: 'sub' },
    { text: `${k.phone}${k.email ? ' / ' + k.email : ''}`, style: 'sub' },
    {
      canvas: [
        { type: 'line', x1: 0, y1: 4, x2: lineW, y2: 4, lineWidth: 1.5, lineColor: '#0F172A' },
        { type: 'line', x1: 0, y1: 6.5, x2: lineW, y2: 6.5, lineWidth: 0.5, lineColor: '#475569' },
      ],
      margin: [0, 4, 0, 6],
    },
    { text: k.reportTitle, style: 'title' },
    { text: `Periode: ${k.periodLabel}`, style: 'sub' },
    { text: `Dicetak: ${formatStamp(k.generatedAt)} oleh ${k.generatedBy}`, style: 'meta' },
    { text: '', margin: [0, 6] },
  ];
  return {
    pageSize: 'A4',
    pageOrientation: doc.orientation,
    pageMargins: [32, 32, 32, 48],
    content: [...kop, ...doc.sections.flatMap((sec) => sectionBlock(sec, doc.orientation))],
    styles: {
      store: { fontSize: 13, bold: true, alignment: 'center', color: '#0F172A' },
      title: { fontSize: 11, bold: true, alignment: 'center', color: '#0F172A', margin: [0, 2, 0, 1] },
      sub: { fontSize: 8.5, alignment: 'center', color: '#334155' },
      meta: { fontSize: 7.5, alignment: 'center', color: '#64748B' },
      sectionTitle: { fontSize: 9.5, bold: true, color: '#0F172A', margin: [0, 4, 0, 4] },
    },
    defaultStyle: { fontSize: 8, color: '#0F172A' },
    footer: (currentPage: number, pageCount: number): ContentText => ({
      text: `Hal ${currentPage} dari ${pageCount}`,
      alignment: 'center',
      fontSize: 7.5,
      color: '#64748B',
      margin: [0, 12],
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
