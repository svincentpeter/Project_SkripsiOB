import ExcelJS from 'exceljs';
import { formatDateIndo } from '../../utils/formatters';
import type { ExportColumn, ExportDoc } from '../types';
import { toNumber } from './cellFormat';

const HEADER_BG: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
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
  const ws = wb.addWorksheet('Laporan');
  const k = doc.kop;
  let r = 1;
  const put = (text: string, font?: Partial<ExcelJS.Font>) => {
    const cell = ws.getRow(r++).getCell(1);
    cell.value = text;
    if (font) cell.font = font;
  };
  put(`${k.storeName} ${k.branchName}`, { bold: true, size: 14 });
  put(`${k.address}${k.city ? ', ' + k.city : ''}`, { size: 9 });
  put(`${k.phone}${k.email ? ' / ' + k.email : ''}`, { size: 9 });
  put('');
  put(k.reportTitle, { bold: true, size: 12 });
  put(`Periode: ${k.periodLabel}`, { size: 9 });
  put(`Dicetak: ${formatDateIndo(k.generatedAt)} oleh ${k.generatedBy}`, { size: 8, color: { argb: 'FF64748B' } });
  put('');

  let firstHeaderRow = 0;
  doc.sections.forEach((sec) => {
    if (sec.title) put(sec.title, { bold: true, size: 11 });
    const hr = ws.getRow(r++);
    if (!firstHeaderRow) {
      firstHeaderRow = r - 1;
      ws.views = [{ state: 'frozen', ySplit: r - 1 }];
      ws.autoFilter = { from: { row: r - 1, column: 1 }, to: { row: r - 1, column: sec.columns.length } };
    }
    sec.columns.forEach((c, i) => {
      const cell = hr.getCell(i + 1);
      cell.value = c.label;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = HEADER_BG;
      cell.alignment = { horizontal: alignOf(c), vertical: 'middle' };
      cell.border = border;
      ws.getColumn(i + 1).width = c.width ?? Math.max(12, c.label.length + 4);
    });
    sec.rows.forEach((row) => {
      const xr = ws.getRow(r++);
      sec.columns.forEach((c, i) => {
        const cell = xr.getCell(i + 1);
        cell.value = cellValue(c, row[c.key]);
        const fmt = numFmtOf(c);
        if (fmt) cell.numFmt = fmt;
        cell.alignment = { horizontal: alignOf(c) };
        cell.border = border;
      });
    });
    if (sec.totals) {
      const tr = ws.getRow(r++);
      sec.columns.forEach((c, i) => {
        const cell = tr.getCell(i + 1);
        cell.value = i === 0 ? 'TOTAL' : cellValue(c, sec.totals![c.key] ?? null);
        const fmt = numFmtOf(c);
        if (fmt) cell.numFmt = fmt;
        cell.font = { bold: true };
        cell.alignment = { horizontal: alignOf(c) };
        cell.border = { top: { style: 'double', color: { argb: 'FF1E293B' } }, left: thin, bottom: thin, right: thin };
      });
    }
    r++;
  });
  return wb;
};

export const toXlsxBlob = async (doc: ExportDoc): Promise<Blob> => {
  const buf = await buildWorkbook(doc).xlsx.writeBuffer();
  return new Blob([buf as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
