import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { buildWorkbook } from '../writers/xlsx';
import { fixtureDoc } from './fixtures';

describe('buildWorkbook', () => {
  const wb = buildWorkbook(fixtureDoc);
  const bufP = wb.xlsx.writeBuffer();

  it('kop baris 1 = nama toko', async () => {
    const rt = new ExcelJS.Workbook();
    await rt.xlsx.load(await bufP);
    const ws = rt.getWorksheet('Laporan')!;
    expect(String(ws.getCell('A1').value)).toContain('Omah Ban');
  });

  it('header kolom berisi label', async () => {
    const rt = new ExcelJS.Workbook();
    await rt.xlsx.load(await bufP);
    const ws = rt.getWorksheet('Laporan')!;
    let found = false;
    ws.eachRow((row) => row.eachCell((c) => { if (String(c.value ?? '') === 'Tanggal') found = true; }));
    expect(found).toBe(true);
  });

  it('sel currency bertipe number dgn numFmt', async () => {
    const rt = new ExcelJS.Workbook();
    await rt.xlsx.load(await bufP);
    const ws = rt.getWorksheet('Laporan')!;
    let found = false;
    ws.eachRow((row) => row.eachCell((c) => { if (Number(c.value) === 1500000 && c.numFmt === '#,##0') found = true; }));
    expect(found).toBe(true);
  });

  it('baris TOTAL bold', async () => {
    const rt = new ExcelJS.Workbook();
    await rt.xlsx.load(await bufP);
    const ws = rt.getWorksheet('Laporan')!;
    let found = false;
    ws.eachRow((row) => row.eachCell((c) => { if (c.value === 'TOTAL' && c.font?.bold) found = true; }));
    expect(found).toBe(true);
  });
});
