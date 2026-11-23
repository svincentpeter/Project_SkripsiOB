import ExcelJS from 'exceljs';
import { formatDateIndo } from '../../utils/formatters';
import type { ExportColumn, ExportDoc } from '../types';
import { displayCell, toNumber } from './cellFormat';

const HEADER_BG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
const ZEBRA_BG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
const TOTAL_BG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const thin = { style: 'thin' as const, color: { argb: 'FFCBD5E1' } };
const border: Partial<ExcelJS.Borders> = { top: thin, left: thin, bottom: thin, right: thin };

const alignOf = (c: ExportColumn): 'left' | 'right' | 'center' =>
  c.align ?? (c.type === 'currency' || c.type === 'number' || c.type === 'percent' ? 'right' : 'left');

const numFmtOf = (c: ExportColumn): string | undefined =>
  c.type === 'currency' || c.type === 'number' ? '#,##0' : c.type === 'percent' ? '0.0' : undefined;

const cellValue = (c: ExportColumn, v: unknown): ExcelJS.CellValue => {
  if (v === null || v === undefined || v === '') return null;
  if (c.type === 'currency' || c.type === 'number' || c.type === 'percent') return toNumber(v as string | number);
  if (c.type === 'date') return formatDateIndo(String(v));
  return String(v);
};

export const buildWorkbook = (doc: ExportDoc): ExcelJS.Workbook => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Laporan', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: doc.orientation,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });
  const k = doc.kop;
  const maxCols = Math.max(2, ...doc.sections.map((s) => s.columns.length));
  let r = 1;
  const putKop = (text: string, font?: Partial<ExcelJS.Font>, withBottomBorder = false) => {
    const row = ws.getRow(r);
    const cell = row.getCell(1);
    cell.value = text;
    if (font) cell.font = font;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (maxCols > 1) {
      ws.mergeCells(r, 1, r, maxCols);
    }
    if (withBottomBorder) {
      for (let col = 1; col <= maxCols; col++) {
        row.getCell(col).border = { bottom: { style: 'medium', color: { argb: 'FF1E293B' } } };
      }
    }
    r++;
  };

  putKop(`${k.storeName} ${k.branchName}`.trim(), { bold: true, size: 14, color: { argb: 'FF0F172A' } });
  putKop(`${k.address}${k.city ? ', ' + k.city : ''}`, { size: 9, color: { argb: 'FF334155' } });
  putKop(`${k.phone}${k.email ? ' / ' + k.email : ''}`, { size: 9, color: { argb: 'FF334155' } }, true);
  r++;
  putKop(k.reportTitle, { bold: true, size: 12, color: { argb: 'FF0F172A' } });
  putKop(`Periode: ${k.periodLabel}`, { size: 9, color: { argb: 'FF334155' } });
  putKop(`Dicetak: ${formatDateIndo(k.generatedAt)} oleh ${k.generatedBy}`, { size: 8, color: { argb: 'FF64748B' } });
  r++;

  const colWidths = new Map<number, number>();
  const bumpWidth = (colIdx: number, len: number) => {
    const prev = colWidths.get(colIdx) ?? 12;
    colWidths.set(colIdx, Math.min(54, Math.max(prev, len)));
  };

  let firstHeaderRow = 0;
  doc.sections.forEach((sec) => {
    if (sec.title) {
      const sRow = ws.getRow(r++);
      sRow.height = 20;
      const sCell = sRow.getCell(1);
      sCell.value = sec.title;
      sCell.font = { bold: true, size: 10.5, color: { argb: 'FF0F172A' } };
      sCell.alignment = { vertical: 'middle' };
    }
    const hr = ws.getRow(r++);
    hr.height = 23;
    if (!firstHeaderRow && doc.sections.length === 1) {
      firstHeaderRow = r - 1;
      ws.views = [{ state: 'frozen', ySplit: r - 1 }];
      ws.autoFilter = { from: { row: r - 1, column: 1 }, to: { row: r - 1, column: sec.columns.length } };
    }
    sec.columns.forEach((c, i) => {
      const colIdx = i + 1;
      const cell = hr.getCell(colIdx);
      cell.value = c.label;
      cell.font = { bold: true, size: 9.5, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_BG;
      cell.alignment = { horizontal: alignOf(c), vertical: 'middle', wrapText: true };
      cell.border = border;
      const baseW = c.width ?? (c.type === 'currency' ? 18 : c.type === 'date' ? 14 : 12);
      bumpWidth(colIdx, Math.max(baseW, c.label.length + 5));
    });
    sec.rows.forEach((row, rowIdx) => {
      const xr = ws.getRow(r++);
      xr.height = 19;
      sec.columns.forEach((c, i) => {
        const colIdx = i + 1;
        const cell = xr.getCell(colIdx);
        const raw = row[c.key];
        cell.value = cellValue(c, raw);
        const fmt = numFmtOf(c);
        if (fmt) cell.numFmt = fmt;
        cell.font = { size: 9.5, color: { argb: 'FF0F172A' } };
        if (rowIdx % 2 === 1) cell.fill = ZEBRA_BG;
        cell.alignment = { horizontal: alignOf(c), vertical: 'middle', wrapText: c.type === 'text' };
        cell.border = border;
        const disp = displayCell(raw, c.type);
        bumpWidth(colIdx, Math.min(48, disp.length + 4));
      });
    });
    if (sec.totals) {
      const tr = ws.getRow(r++);
      tr.height = 21;
      sec.columns.forEach((c, i) => {
        const colIdx = i + 1;
        const cell = tr.getCell(colIdx);
        const raw = sec.totals![c.key] ?? null;
        cell.value = i === 0 ? 'TOTAL' : cellValue(c, raw);
        const fmt = numFmtOf(c);
        if (fmt) cell.numFmt = fmt;
        cell.font = { bold: true, size: 9.5, color: { argb: 'FF0F172A' } };
        cell.fill = TOTAL_BG;
        cell.alignment = { horizontal: alignOf(c), vertical: 'middle' };
        cell.border = { top: { style: 'double', color: { argb: 'FF1E293B' } }, left: thin, bottom: thin, right: thin };
        if (i > 0 && raw !== null) {
          bumpWidth(colIdx, displayCell(raw, c.type).length + 5);
        }
      });
    }
    r++;
  });

  colWidths.forEach((w, colIdx) => {
    ws.getColumn(colIdx).width = w;
  });

  return wb;
};

export const toXlsxBlob = async (doc: ExportDoc): Promise<Blob> => {
  const buf = await buildWorkbook(doc).xlsx.writeBuffer();
  return new Blob([buf as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
