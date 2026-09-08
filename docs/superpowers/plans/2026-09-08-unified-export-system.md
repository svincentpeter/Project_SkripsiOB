# Sistem Export Terpadu (XLSX/PDF/DOCX/CSV) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Satu sistem export client-side untuk semua halaman (21 laporan) menghasilkan file XLSX/PDF/DOCX/CSV rapi: kop toko, periode, format Rupiah/tanggal Indonesia, baris TOTAL.

**Architecture:** Modul `src/shared/export/` dengan kontrak tunggal `ExportDoc`. Halaman memanggil `<ExportMenu reportId data ctx />` -> mapper registry mengubah data layar jadi `ExportDoc` -> writer per format (lazy `import()`) menghasilkan `Blob` -> download. Writer fungsi murni tanpa React.

**Tech Stack:** React 19 + Vite 6 + TS 5.8, `exceljs`, `pdfmake@0.2.x`, `docx`, `vitest` (dev).

**Spec:** `docs/superpowers/specs/2026-09-08-unified-export-system-design.md`

## Global Constraints

- Nol perubahan backend Laravel; semua generate di browser.
- Data ter-export = data terfilter yang tampil di layar (props yang sama dengan tabel).
- Dilarang `any`, `@ts-ignore`, catch kosong. `unknown` + narrowing untuk error.
- Writer lazy via `await import()` saat klik, bukan saat mount.
- CSV wajib BOM UTF-8 `\uFEFF`; tanggal Indonesia via `formatDateIndo`; uang `#,##0` (XLSX) / prefix `Rp` (PDF/DOCX via `formatRupiah`).
- Nama file: `{JudulTanpaSpasi}_{YYYYMMDD}-{YYYYMMDD}`, tanpa periode: `{Judul}_{YYYYMMDD}`.
- Kop (kecuali CSV): store_name+branch / address+city / phone+email / garis / judul uppercase / `Periode: ...` / `Dicetak: dd MMM yyyy HH:mm oleh Nama (ROLE)`.
- Header tabel: bold, fill `#1E293B`, teks putih; border tipis; baris TOTAL bold.
- JANGAN sentuh: `LedgerPrintModal`, `FinancialStatementsPrintModal`, struk thermal, nota POS, `ExpenseVoucherModal` (window.print tetap).
- Hapus 7 tombol CSV lama (spec §7) saat halaman terkait di-wire.
- Tiap task selesai: `npm run lint` bersih + test task hijau, baru commit.

## File Structure

```
Buat: src/shared/export/types.ts            kontrak ExportDoc + ExportCtx + ExportFormat
Buat: src/shared/export/exportConfig.ts     storeSettings + user aktif (di-set App.tsx)
Buat: src/shared/export/kop.ts              builder ExportKop + formatStamp
Buat: src/shared/export/naming.ts           nama file seragam
Buat: src/shared/export/writers/cellFormat.ts  konversi CellValue per ColType
Buat: src/shared/export/writers/csv.ts      buildCsv + toCsvBlob
Buat: src/shared/export/writers/xlsx.ts     buildWorkbook + toXlsxBlob (exceljs)
Buat: src/shared/export/writers/pdf.ts      buildPdfDef (murni) + toPdfBlob (pdfmake)
Buat: src/shared/export/writers/docx.ts     buildDocument (murni) + toDocxBlob (docx)
Buat: src/shared/export/registry.ts         REPORT_MAPPERS + REPORT_FORMATS + buildExportDoc
Buat: src/shared/export/useExport.ts        hook busy + dispatch writer + download + toast
Buat: src/shared/export/ExportMenu.tsx      dropdown UI Excel|PDF|Word|CSV
Buat: src/shared/export/__tests__/...       fixtures + 7 file test
Ubah: package.json                          deps + script "test": "vitest run"
Ubah: vitest.config.ts
Ubah: src/App.tsx                           setExportConfig() saat storeSettings/currentUser berubah
Ubah: JournalTab, GeneralLedgerTab, TrialBalanceTab, AccountsReceivableTab, AccountsPayableTab,
      SakEmkmReportTab, ExpenseTable        ganti tombol CSV lama dengan ExportMenu
Ubah: InventoryScreen, StockCardDrawer, StockOpnameModal, ThermalReceiptScreen,
      ExecutiveDashboardScreen, CashFlowStatementTab, PeriodClosingModal   pasang ExportMenu
```

---

### Task 1: Dependency + setup vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Test: `src/shared/export/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` menjalankan vitest; `exceljs`, `pdfmake`, `docx` terimpor.

- [ ] **Step 1: Install**

```bash
npm install exceljs pdfmake@^0.2.10 docx
npm install -D vitest @types/pdfmake
```

- [ ] **Step 2: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
```

- [ ] **Step 3: `package.json` scripts tambah** `"test": "vitest run"`

- [ ] **Step 4: `src/shared/export/__tests__/smoke.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { Document } from 'docx';

describe('deps', () => {
  it('exceljs + docx terimpor', () => {
    expect(new ExcelJS.Workbook().addWorksheet('Laporan').name).toBe('Laporan');
    expect(new Document({ sections: [] })).toBeTruthy();
  });
});
```

- [ ] **Step 5: `npm test` PASS, `npm run lint` bersih. Commit**

```bash
git add package.json vitest.config.ts src/shared/export/__tests__/smoke.test.ts
git commit -m "chore(export): add exceljs/pdfmake/docx deps and vitest setup"
```

---

### Task 2: types + exportConfig + naming + kop

**Files:**
- Create: `src/shared/export/types.ts`, `exportConfig.ts`, `naming.ts`, `kop.ts`
- Test: `src/shared/export/__tests__/naming.test.ts`, `kop.test.ts`

**Interfaces:**
- Produces: `CellValue`, `ColType`, `ExportFormat`, `ExportColumn`, `ExportSection`, `ExportKop`, `ExportDoc`, `ExportCtx`, `setExportConfig`, `getExportConfig`, `buildFileName`, `buildKop`, `formatStamp`.

- [ ] **Step 1: `types.ts`** — salin persis blok kode §2.2 spec, tambah:

```ts
export type ExportFormat = 'xlsx' | 'pdf' | 'docx' | 'csv';
export interface ExportDoc {
  reportId: string;
  title: string;                      // utk nama file; kop.reportTitle = title.toUpperCase()
  orientation: 'portrait' | 'landscape';
  kop: ExportKop;
  sections: ExportSection[];
}
export interface ExportCtx {
  periodLabel: string;
  startDate?: string;
  endDate?: string;
}
```

- [ ] **Step 2: `exportConfig.ts`**

```ts
import type { StoreSettings, UserSession } from '../types';

interface ExportConfig {
  settings: StoreSettings | null;
  user: UserSession | null;
}

let config: ExportConfig = { settings: null, user: null };

export const setExportConfig = (settings: StoreSettings | null, user: UserSession | null): void => {
  config = { settings, user };
};

export const getExportConfig = (): ExportConfig => config;
```

- [ ] **Step 3: `naming.ts`**

```ts
const ymd = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

export const buildFileName = (title: string, startDate?: string, endDate?: string): string => {
  const base = title.replace(/\s+/g, '');
  if (startDate && endDate) return `${base}_${ymd(new Date(startDate))}-${ymd(new Date(endDate))}`;
  return `${base}_${ymd(new Date())}`;
};
```

- [ ] **Step 4: `kop.ts`**

```ts
import { getExportConfig } from './exportConfig';
import type { ExportKop } from './types';

export const formatStamp = (iso: string): string =>
  new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

export const buildKop = (reportTitle: string, periodLabel: string): ExportKop => {
  const { settings, user } = getExportConfig();
  return {
    storeName: settings?.store_name || 'Omah Ban',
    branchName: settings?.branch_name || 'Cabang 3',
    address: settings?.address || '',
    city: settings?.city || '',
    phone: settings?.phone || '',
    email: settings?.email || '',
    reportTitle: reportTitle.toUpperCase(),
    periodLabel,
    generatedBy: user ? `${user.name} (${user.role})` : 'Sistem',
    generatedAt: new Date().toISOString(),
  };
};
```

- [ ] **Step 5: Test `naming.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildFileName } from '../naming';

describe('buildFileName', () => {
  it('rentang periode', () => {
    expect(buildFileName('Jurnal Umum', '2026-09-01', '2026-09-08')).toBe('JurnalUmum_20260901-20260908');
  });
  it('tanpa periode = hari ini', () => {
    expect(buildFileName('Ringkasan Dashboard')).toMatch(/^RingkasanDashboard_\d{8}$/);
  });
});
```

- [ ] **Step 6: Test `kop.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { setExportConfig } from '../exportConfig';
import { buildKop } from '../kop';
import type { StoreSettings, UserSession } from '../../types';

describe('buildKop', () => {
  it('pakai settings + user aktif', () => {
    setExportConfig(
      { store_name: 'Omah Ban', branch_name: 'Cabang 3', address: 'Jl. Raya Magelang', city: 'Magelang', phone: '(0293) 314-889', email: 'info@omahban.co.id' } as StoreSettings,
      { name: 'Catherine', role: 'OWNER' } as UserSession,
    );
    const kop = buildKop('Jurnal Umum', '01 Sep 2026 - 08 Sep 2026');
    expect(kop.storeName).toBe('Omah Ban');
    expect(kop.reportTitle).toBe('JURNAL UMUM');
    expect(kop.generatedBy).toBe('Catherine (OWNER)');
  });
});
```

- [ ] **Step 7: `npm test` PASS + `npm run lint` bersih. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): ExportDoc contract, config, naming, kop builder"
```

---

### Task 3: cellFormat + writer CSV

**Files:**
- Create: `src/shared/export/writers/cellFormat.ts`
- Create: `src/shared/export/writers/csv.ts`
- Test: `src/shared/export/__tests__/csv.test.ts`

**Interfaces:**
- Consumes: `ExportDoc`, `CellValue`, `ColType` (Task 2).
- Produces: `toNumber(v): number`, `displayCell(v, type): string`, `buildCsv(doc): string`, `toCsvBlob(doc): Blob`.

- [ ] **Step 1: Test dulu (RED) — `__tests__/csv.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildCsv } from '../writers/csv';
import type { ExportDoc } from '../types';

const doc: ExportDoc = {
  reportId: 'journal', title: 'Jurnal Umum', orientation: 'landscape',
  kop: { storeName: 'Omah Ban', branchName: 'Cabang 3', address: 'a', city: 'c', phone: 'p', email: 'e', reportTitle: 'JURNAL UMUM', periodLabel: 'x', generatedBy: 'u', generatedAt: '2026-09-08T10:00:00Z' },
  sections: [{
    columns: [
      { key: 'tgl', label: 'Tanggal', type: 'date' },
      { key: 'ket', label: 'Keterangan', type: 'text' },
      { key: 'deb', label: 'Debit', type: 'currency' },
    ],
    rows: [
      { tgl: '2026-09-01', ket: 'Bayar "gaji", lembur', deb: 1500000 },
      { tgl: '2026-09-02', ket: 'Kosong', deb: null },
    ],
    totals: { deb: 1500000 },
  }],
};

describe('buildCsv', () => {
  const out = buildCsv(doc);
  it('BOM UTF-8 di awal', () => expect(out.charCodeAt(0)).toBe(0xfeff));
  it('quote field dgn koma/tanda kutip', () => expect(out).toContain('"Bayar ""gaji"", lembur"'));
  it('angka mentah tanpa Rp', () => expect(out).toContain(',1500000'));
  it('baris TOTAL ada', () => expect(out).toContain('TOTAL'));
  it('null jadi kosong', () => expect(out).toMatch(/,2026-09-02[^,]*,Kosong,?,/));
});
```

- [ ] **Step 2: `npm test` -> FAIL (modul belum ada)**

- [ ] **Step 3: `writers/cellFormat.ts`**

```ts
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import type { CellValue, ColType } from '../types';

export const toNumber = (v: CellValue): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export const displayCell = (v: CellValue, type: ColType): string => {
  if (v === null || v === '') return '';
  switch (type) {
    case 'currency': return formatRupiah(toNumber(v));
    case 'percent': return `${v}%`;
    case 'date': return formatDateIndo(String(v));
    case 'number': return String(toNumber(v));
    default: return String(v);
  }
};
```

- [ ] **Step 4: `writers/csv.ts`** — angka/tanggal ditulis MENTAH (file data murni, tanpa kop):

```ts
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
      lines.push(sec.columns.map((c, idx) => (idx === 0 ? 'TOTAL' : esc(sec.totals![c.key] === undefined ? '' : String(sec.totals![c.key])))).join(','));
    }
  });
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
};

export const toCsvBlob = (doc: ExportDoc): Blob =>
  new Blob([buildCsv(doc)], { type: 'text/csv;charset=utf-8;' });
```

- [ ] **Step 5: `npm test` -> PASS. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): csv writer with UTF-8 BOM + cellFormat helper"
```

---

### Task 4: writer XLSX (exceljs)

**Files:**
- Create: `src/shared/export/writers/xlsx.ts`
- Test: `src/shared/export/__tests__/xlsx.test.ts`

**Interfaces:**
- Consumes: `ExportDoc` + fixture Task 3 (ekstrak ke `__tests__/fixtures.ts` sebagai `fixtureDoc`).
- Produces: `buildWorkbook(doc): ExcelJS.Workbook`, `toXlsxBlob(doc): Promise<Blob>`.

- [ ] **Step 1: Pindahkan `doc` fixture Task 3 ke `__tests__/fixtures.ts`** (export `fixtureDoc`, `twoSectionDoc` = 2 section dgn title).

- [ ] **Step 2: Test RED — `__tests__/xlsx.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { buildWorkbook } from '../writers/xlsx';
import { fixtureDoc } from './fixtures';

describe('buildWorkbook', async () => {
  const wb = buildWorkbook(fixtureDoc);
  const buf = await wb.xlsx.writeBuffer();
  const rt = new ExcelJS.Workbook();
  await rt.xlsx.load(buf);
  const ws = rt.getWorksheet('Laporan')!;
  it('kop baris 1 = nama toko', () => expect(String(ws.getCell('A1').value)).toContain('Omah Ban'));
  it('header kolom berisi label', () => {
    const labels: string[] = [];
    ws.eachRow((row) => row.eachCell((c) => { const v = String(c.value ?? ''); if (v === 'Tanggal') labels.push(v); }));
    expect(labels.length).toBe(1);
  });
  it('sel currency bertipe number dgn numFmt', () => {
    let found = false;
    ws.eachRow((row) => row.eachCell((c) => { if (c.value === 1500000 && c.numFmt === '#,##0') found = true; }));
    expect(found).toBe(true);
  });
  it('baris TOTAL bold', () => {
    let found = false;
    ws.eachRow((row) => row.eachCell((c) => { if (c.value === 'TOTAL' && c.font?.bold) found = true; }));
    expect(found).toBe(true);
  });
});
```

- [ ] **Step 3: `writers/xlsx.ts`**

```ts
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
```

- [ ] **Step 4: `npm test` -> PASS. `npm run lint` bersih. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): styled xlsx writer (kop, header fill, numFmt, freeze, autofilter, TOTAL)"
```

---

### Task 5: writer PDF (pdfmake)

**Files:**
- Create: `src/shared/export/writers/pdf.ts`
- Test: `src/shared/export/__tests__/pdf.test.ts`

**Interfaces:**
- Consumes: `ExportDoc`, `displayCell`, `formatStamp`.
- Produces: `buildPdfDef(doc): TDocumentDefinitions` (murni, teruji di node), `toPdfBlob(doc): Promise<Blob>` (lazy import pdfmake).

- [ ] **Step 1: Test RED — `__tests__/pdf.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { buildPdfDef } from '../writers/pdf';
import { fixtureDoc } from './fixtures';

describe('buildPdfDef', () => {
  const def = buildPdfDef(fixtureDoc);
  it('orientasi ikut doc', () => expect(def.pageOrientation).toBe('landscape'));
  it('tabel = header + 2 baris + TOTAL', () => {
    const tables = def.content.filter((c): c is { table: { body: unknown[] } } => typeof c === 'object' && 'table' in c);
    const body = tables[0].table.body;
    expect(body.length).toBe(4);
  });
  it('footer nomor halaman Indonesia', () => {
    const f = def.footer;
    expect(typeof f).toBe('function');
    if (typeof f === 'function') {
      const out = f(1, 2);
      expect(typeof out === 'object' && 'text' in out ? out.text : '').toBe('Hal 1 dari 2');
    }
  });
});
```

- [ ] **Step 2: `writers/pdf.ts`**

```ts
import type { Content, TableDynamicRowObject, TDocumentDefinitions, TText } from 'pdfmake/interfaces';
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
  fillColor: (rowIndex: number, _node: TableDynamicRowObject, _col: number): string | null =>
    rowIndex === 0 ? '#1E293B' : rowIndex % 2 === 0 ? '#F1F5F9' : null,
};

const sectionBlock = (sec: ExportSection): Content[] => {
  const head = sec.columns.map((c) => ({ text: c.label, color: '#FFFFFF', bold: true, alignment: alignOf(c), margin: [0, 0, 0, 0] }));
  const body = sec.rows.map((r) =>
    sec.columns.map((c) => ({ text: displayCell(r[c.key], c.type), alignment: alignOf(c) })),
  );
  if (sec.totals) {
    body.push(sec.columns.map((c, i) => ({ text: i === 0 ? 'TOTAL' : displayCell(sec.totals![c.key] ?? null, c.type), bold: true, alignment: alignOf(c) })));
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
    footer: (currentPage: number, pageCount: number): TText => ({
      text: `Hal ${currentPage} dari ${pageCount}`, alignment: 'center', fontSize: 8, margin: [0, 10],
    }),
  };
};

export const toPdfBlob = async (doc: ExportDoc): Promise<Blob> => {
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  const { vfs } = await import('pdfmake/build/vfs_fonts');
  pdfMake.vfs = vfs;
  return new Promise<Blob>((resolve, reject) => {
    try {
      pdfMake.createPdf(buildPdfDef(doc)).getBlob((blob: Blob) => resolve(blob));
    } catch (err: unknown) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
};
```

- [ ] **Step 3: `npm test` PASS + lint bersih. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): pdfmake writer with kop, zebra table, page footer"
```

---

### Task 6: writer DOCX

**Files:**
- Create: `src/shared/export/writers/docx.ts`
- Test: `src/shared/export/__tests__/docx.test.ts`

**Interfaces:**
- Produces: `buildDocument(doc): Document` (murni), `toDocxBlob(doc): Promise<Blob>`.

- [ ] **Step 1: Test RED — `__tests__/docx.test.ts`**

```ts
import { Packer } from 'docx';
import { describe, expect, it } from 'vitest';
import { buildDocument } from '../writers/docx';
import { fixtureDoc } from './fixtures';

describe('docx writer', async () => {
  const buf = await Packer.toBuffer(buildDocument(fixtureDoc));
  it('buffer zip (PK)', () => {
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });
  it('ukuran wajar', () => expect(buf.length).toBeGreaterThan(1000));
});
```

- [ ] **Step 2: `writers/docx.ts`**

```ts
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
```

- [ ] **Step 3: `npm test` PASS + lint. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): docx writer with kop and styled tables"
```

---

### Task 7: registry — mapper keluarga akuntansi (journal, general_ledger, trial_balance, AR, AP)

**Files:**
- Create: `src/shared/export/registry.ts`
- Test: `src/shared/export/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: semua tipe dari `src/shared/types` + `buildKop`.
- Produces: `REPORT_MAPPERS` (objek reportId -> mapper), `ReportId`, `ReportData<K>`, `REPORT_FORMATS: Record<ReportId, ExportFormat[]>`, `buildExportDoc<K>(id, data, ctx): ExportDoc`, `makeDoc(title, orientation, ctx, sections)`.

**Catatan kolom:** kolom tiap mapper MENGIKUTI header CSV lama persis (sudah diverifikasi dari kode existing) supaya tidak ada data yang hilang.

- [ ] **Step 1: Test RED — `__tests__/registry.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import type { JournalEntry, LedgerAccountSummary, TrialBalanceResult } from '../../types';
import { setExportConfig } from '../exportConfig';
import { buildExportDoc, REPORT_FORMATS, REPORT_MAPPERS } from '../registry';

setExportConfig(null, null);
const ctx = { periodLabel: '01 Sep 2026 - 08 Sep 2026', startDate: '2026-09-01', endDate: '2026-09-08' };

const journals: JournalEntry[] = [{
  id: 'j1', journal_number: 'JU-202609-0001', reference_number: 'JU-202609-0001', date: '2026-09-01',
  ref_doc: 'OB3-INV-0142', description: 'Penjualan ban', status: 'POSTED',
  lines: [
    { account_code: '1-1000', account_name: 'Kas Toko Laci Kasir', debit: 1000, credit: 0 },
    { account_code: '4-1000', account_name: 'Pendapatan Penjualan Ban Baru', debit: 0, credit: 1000 },
  ],
}];

describe('registry journal', () => {
  const doc = buildExportDoc('journal', journals, ctx);
  it('1 baris per line jurnal', () => expect(doc.sections[0].rows.length).toBe(2));
  it('totals debit = kredit', () => {
    expect(doc.sections[0].totals?.debit).toBe(1000);
    expect(doc.sections[0].totals?.kredit).toBe(1000);
  });
  it('kop terisi', () => expect(doc.kop.reportTitle).toBe('JURNAL UMUM'));
  it('formats sesuai matriks spec', () => {
    expect(REPORT_FORMATS.journal).toEqual(['xlsx', 'pdf', 'csv']);
    expect(REPORT_FORMATS.trial_balance).toEqual(['xlsx', 'pdf', 'docx', 'csv']);
  });
  it('semua 21 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(21));
});
```

Jalankan -> FAIL (registry belum ada). Test `REPORT_MAPPERS` 21 id akan hijau setelah Task 13 selesai; tandai task ini selesai saat test journal/trial_balance hijau dengan stub id sisanya (step 3).

- [ ] **Step 2: `registry.ts` — kerangka + 5 mapper akuntansi**

```ts
import type {
  AccountsReceivableInput, JournalEntry, LedgerAccountSummary, PayableInvoice,
  ReceivableInvoice, TrialBalanceResult,
} from '../types';
import { buildKop } from './kop';
import type { ExportCtx, ExportDoc, ExportFormat, ExportSection } from './types';

const sum = <T>(rows: T[], get: (r: T) => number): number => rows.reduce((a, r) => a + get(r), 0);

export const makeDoc = (
  reportId: string, title: string, orientation: 'portrait' | 'landscape',
  ctx: ExportCtx, sections: ExportSection[],
): ExportDoc => ({ reportId, title, orientation, kop: buildKop(title, ctx.periodLabel), sections });

const mapJournal = (journals: JournalEntry[], ctx: ExportCtx): ExportDoc => {
  const rows = journals.flatMap((j) => j.lines.map((l) => ({
    tanggal: j.date, no_jurnal: j.journal_number, no_ref: j.ref_doc,
    kode_akun: l.account_code, nama_akun: l.account_name, keterangan: j.description,
    debit: l.debit, kredit: l.credit, status: j.status,
  })));
  return makeDoc('journal', 'Jurnal Umum', 'landscape', ctx, [{
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'no_jurnal', label: 'No Jurnal', type: 'text', width: 16 },
      { key: 'no_ref', label: 'No Ref', type: 'text', width: 18 },
      { key: 'kode_akun', label: 'Kode Akun', type: 'text', width: 10 },
      { key: 'nama_akun', label: 'Nama Akun', type: 'text', width: 34 },
      { key: 'keterangan', label: 'Keterangan', type: 'text', width: 44 },
      { key: 'debit', label: 'Debit', type: 'currency' },
      { key: 'kredit', label: 'Kredit', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows,
    totals: { debit: sum(rows, (r) => r.debit), kredit: sum(rows, (r) => r.kredit) },
  }]);
};

const mapGeneralLedger = (g: LedgerAccountSummary, ctx: ExportCtx): ExportDoc =>
  makeDoc('general_ledger', `Buku Besar ${g.account_code} ${g.account_name}`, 'landscape', ctx, [{
    columns: [
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'no_jurnal', label: 'No Jurnal', type: 'text', width: 16 },
      { key: 'no_ref', label: 'No Ref', type: 'text', width: 18 },
      { key: 'keterangan', label: 'Keterangan', type: 'text', width: 52 },
      { key: 'debit', label: 'Debit', type: 'currency' },
      { key: 'kredit', label: 'Kredit', type: 'currency' },
      { key: 'saldo', label: 'Saldo Berjalan', type: 'currency' },
    ],
    rows: g.transactions.map((t) => ({
      tanggal: t.date, no_jurnal: t.journal_number, no_ref: t.ref_doc,
      keterangan: t.description, debit: t.debit, kredit: t.credit, saldo: t.running_balance,
    })),
    totals: { debit: g.total_debit, kredit: g.total_credit, saldo: g.ending_balance },
  }]);

const mapTrialBalance = (tb: TrialBalanceResult, ctx: ExportCtx): ExportDoc =>
  makeDoc('trial_balance', 'Neraca Saldo', 'portrait', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode Akun', type: 'text', width: 12 },
      { key: 'nama', label: 'Nama Rekening', type: 'text', width: 44 },
      { key: 'klas', label: 'Klasifikasi', type: 'text', width: 18 },
      { key: 'debit', label: 'Saldo Debit (Dr)', type: 'currency' },
      { key: 'kredit', label: 'Saldo Kredit (Cr)', type: 'currency' },
    ],
    rows: tb.rows.map((r) => ({ kode: r.account_code, nama: r.account_name, klas: r.account_type, debit: r.debit_balance, kredit: r.credit_balance })),
    totals: { debit: tb.total_debit, kredit: tb.total_credit },
  }]);

const mapReceivable = (invoices: ReceivableInvoice[], ctx: ExportCtx): ExportDoc =>
  makeDoc('accounts_receivable', 'Buku Pembantu Piutang', 'landscape', ctx, [{
    columns: [
      { key: 'faktur', label: 'No. Faktur', type: 'text', width: 18 },
      { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'jt', label: 'Jatuh Tempo', type: 'date', width: 12 },
      { key: 'cust', label: 'Nama Pelanggan', type: 'text', width: 26 },
      { key: 'plat', label: 'No. Polisi', type: 'text', width: 12 },
      { key: 'total', label: 'Total Faktur', type: 'currency' },
      { key: 'bayar', label: 'Terbayar', type: 'currency' },
      { key: 'sisa', label: 'Sisa Piutang', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 14 },
    ],
    rows: invoices.map((i) => ({ faktur: i.invoice_number, tgl: i.date, jt: i.due_date, cust: i.customer_name, plat: i.vehicle_plate || '-', total: i.total_amount, bayar: i.paid_amount, sisa: i.remaining_amount, status: i.status })),
    totals: { total: sum(invoices, (i) => i.total_amount), bayar: sum(invoices, (i) => i.paid_amount), sisa: sum(invoices, (i) => i.remaining_amount) },
  }]);

const mapPayable = (invoices: PayableInvoice[], ctx: ExportCtx): ExportDoc =>
  makeDoc('accounts_payable', 'Buku Pembantu Hutang', 'landscape', ctx, [{
    columns: [
      { key: 'faktur', label: 'No Faktur', type: 'text', width: 18 },
      { key: 'dist', label: 'Distributor', type: 'text', width: 30 },
      { key: 'tgl', label: 'Tanggal Faktur', type: 'date', width: 12 },
      { key: 'jt', label: 'Jatuh Tempo', type: 'date', width: 12 },
      { key: 'total', label: 'Total Tagihan', type: 'currency' },
      { key: 'bayar', label: 'Sudah Dibayar', type: 'currency' },
      { key: 'sisa', label: 'Sisa Hutang', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 14 },
      { key: 'cat', label: 'Catatan', type: 'text', width: 24 },
    ],
    rows: invoices.map((i) => ({ faktur: i.invoice_number, dist: i.supplier_name, tgl: i.date, jt: i.due_date, total: i.total_amount, bayar: i.paid_amount, sisa: i.remaining_amount, status: i.status, cat: i.notes || '' })),
    totals: { total: sum(invoices, (i) => i.total_amount), bayar: sum(invoices, (i) => i.paid_amount), sisa: sum(invoices, (i) => i.remaining_amount) },
  }]);
```

- [ ] **Step 3: Tutup registry sementara** — tambah placeholder eksplisit agar kompilasi jalan (diisi penuh Task 10-13; BUKAN placeholder teks, entri nyata yang melempar error bila dipanggil sebelum task-nya):

```ts
type MapperAny = (data: never, ctx: ExportCtx) => ExportDoc;
const notYet = (id: string): MapperAny => (() => { throw new Error(`Mapper ${id} belum dipasang`); }) as MapperAny;

export const REPORT_MAPPERS = {
  journal: mapJournal,
  general_ledger: mapGeneralLedger,
  trial_balance: mapTrialBalance,
  accounts_receivable: mapReceivable,
  accounts_payable: mapPayable,
  expenses: notYet('expenses'),
  inventory_products: notYet('inventory_products'),
  inventory_services: notYet('inventory_services'),
  inventory_suppliers: notYet('inventory_suppliers'),
  stock_movements: notYet('stock_movements'),
  stock_opname: notYet('stock_opname'),
  goods_receipts: notYet('goods_receipts'),
  pos_sales_history: notYet('pos_sales_history'),
  dashboard_summary: notYet('dashboard_summary'),
  fin_income_statement: notYet('fin_income_statement'),
  fin_equity_statement: notYet('fin_equity_statement'),
  fin_balance_sheet: notYet('fin_balance_sheet'),
  fin_cash_flow: notYet('fin_cash_flow'),
  fin_calk: notYet('fin_calk'),
  sak_emkm_package: notYet('sak_emkm_package'),
  period_closing: notYet('period_closing'),
} as const;

export type ReportId = keyof typeof REPORT_MAPPERS;
export type ReportData<K extends ReportId> = Parameters<(typeof REPORT_MAPPERS)[K]>[0];

export const REPORT_FORMATS: Record<ReportId, ExportFormat[]> = {
  dashboard_summary: ['xlsx', 'pdf'],
  pos_sales_history: ['xlsx', 'pdf', 'csv'],
  inventory_products: ['xlsx', 'pdf', 'csv'],
  inventory_services: ['xlsx', 'pdf', 'csv'],
  inventory_suppliers: ['xlsx', 'pdf', 'csv'],
  stock_movements: ['xlsx', 'pdf', 'csv'],
  stock_opname: ['xlsx', 'pdf', 'csv'],
  goods_receipts: ['xlsx', 'pdf', 'csv'],
  expenses: ['xlsx', 'pdf', 'docx', 'csv'],
  journal: ['xlsx', 'pdf', 'csv'],
  general_ledger: ['xlsx', 'pdf', 'csv'],
  trial_balance: ['xlsx', 'pdf', 'docx', 'csv'],
  accounts_receivable: ['xlsx', 'pdf', 'csv'],
  accounts_payable: ['xlsx', 'pdf', 'csv'],
  fin_income_statement: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_equity_statement: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_balance_sheet: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_cash_flow: ['xlsx', 'pdf', 'docx', 'csv'],
  fin_calk: ['pdf', 'docx'],
  sak_emkm_package: ['xlsx', 'pdf', 'docx', 'csv'],
  period_closing: ['xlsx', 'pdf'],
};

export const buildExportDoc = <K extends ReportId>(id: K, data: ReportData<K>, ctx: ExportCtx): ExportDoc =>
  (REPORT_MAPPERS[id] as (d: ReportData<K>, c: ExportCtx) => ExportDoc)(data, ctx);
```

Hapus import `AccountsReceivableInput` yang tidak dipakai (baris import step 2 cukup: JournalEntry, LedgerAccountSummary, PayableInvoice, ReceivableInvoice, TrialBalanceResult).

- [ ] **Step 4: `npm test` -> registry.test PASS kecuali assertion jumlah 21 (sudah 21 krn stub) -> semua PASS. `npm run lint` bersih. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): registry with accounting mappers + format matrix"
```

---

### Task 8: useExport + ExportMenu

**Files:**
- Create: `src/shared/export/useExport.ts`
- Create: `src/shared/export/ExportMenu.tsx`

**Interfaces:**
- Consumes: `buildExportDoc`, `REPORT_FORMATS`, `ReportId`, `ReportData` (Task 7); `buildFileName` (Task 2); `useToast` (`src/shared/components/ToastProvider.tsx`, API: `notify(type, title, message?)`); writer `toCsvBlob/toXlsxBlob/toPdfBlob/toDocxBlob` (Task 3-6).
- Produces: `<ExportMenu reportId data ctx />` — satu-satunya yang dipakai halaman.

- [ ] **Step 1: `useExport.ts`**

```ts
import { useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { buildFileName } from './naming';
import { buildExportDoc, REPORT_FORMATS, type ReportData, type ReportId } from './registry';
import type { ExportCtx, ExportDoc, ExportFormat } from './types';

const generate = async (format: ExportFormat, doc: ExportDoc): Promise<Blob> => {
  switch (format) {
    case 'csv': return (await import('./writers/csv')).toCsvBlob(doc);
    case 'xlsx': return (await import('./writers/xlsx')).toXlsxBlob(doc);
    case 'pdf': return (await import('./writers/pdf')).toPdfBlob(doc);
    case 'docx': return (await import('./writers/docx')).toDocxBlob(doc);
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
```

- [ ] **Step 2: `ExportMenu.tsx`**

```tsx
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
                onClick={() => { setOpen(false); void run(f); }}
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
```

- [ ] **Step 3: `npm run lint` bersih. Commit**

```bash
git add src/shared/export
git commit -m "feat(export): useExport hook + ExportMenu dropdown with lazy writers"
```

---

### Task 9: App config + wiring 5 tab akuntansi (hapus CSV lama)

**Files:**
- Modify: `src/App.tsx` (state `storeSettings` ~baris 237, `currentUser`)
- Modify: `src/modules/accounting/components/JournalTab.tsx` (hapus `handleExportCsv` baris 92-112, tombol ~131)
- Modify: `src/modules/accounting/components/GeneralLedgerTab.tsx` (hapus `handleExportLedgerCsv` 70-90, tombol ~117)
- Modify: `src/modules/accounting/components/TrialBalanceTab.tsx` (hapus `handleExportTrialBalanceCsv` 29-49, tombol ~120)
- Modify: `src/modules/accounting/components/AccountsReceivableTab.tsx` (hapus `handleExportCsv` 81-98, tombol ~116)
- Modify: `src/modules/accounting/components/AccountsPayableTab.tsx` (hapus `handleExportApCsv` 54-72, tombol ~93)

**Interfaces:**
- Consumes: `ExportMenu` (Task 8), mapper `journal|general_ledger|trial_balance|accounts_receivable|accounts_payable` (Task 7).

- [ ] **Step 1: `App.tsx`** — import `setExportConfig` dari `./shared/export/exportConfig`; tambah effect setelah state `storeSettings`/`currentUser` ada:

```tsx
useEffect(() => {
  setExportConfig(storeSettings, currentUser);
}, [storeSettings, currentUser]);
```

- [ ] **Step 2: JournalTab** — hapus fungsi `handleExportCsv` + tombol `Ekspor CSV`; ganti dengan (data = `filteredJournals` hasil filter layar, BUKAN `journals` mentah):

```tsx
import { ExportMenu } from '../../../shared/export/ExportMenu';
// ...di baris kontrol header yang sama:
<ExportMenu reportId="journal" data={filteredJournals} ctx={{ periodLabel: 'Seluruh Periode' }} />
```

- [ ] **Step 3: GeneralLedgerTab** — hapus `handleExportLedgerCsv` + tombol `Unduh CSV`; ganti:

```tsx
<ExportMenu
  reportId="general_ledger"
  data={ledgerData}
  ctx={{
    periodLabel: `${effectiveStartDate || 'Awal'} s/d ${effectiveEndDate || 'Sekarang'}`,
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  }}
/>
```

- [ ] **Step 4: TrialBalanceTab** — hapus `handleExportTrialBalanceCsv` + tombol; ganti `data={trialBalance}` `ctx={{ periodLabel: <label periode yang sudah ditampilkan tab ini; jika tidak ada variabelnya pakai 'Periode Berjalan'> }}`.

- [ ] **Step 5: AccountsReceivableTab** — hapus `handleExportCsv` + tombol; ganti `data={invoices}` `ctx={{ periodLabel: 'Seluruh Periode' }}`.

- [ ] **Step 6: AccountsPayableTab** — hapus `handleExportApCsv` + tombol; ganti `data={invoices}` `ctx={{ periodLabel: 'Seluruh Periode' }}`.

- [ ] **Step 7: Verifikasi** — `npm run lint` bersih; `npm test` PASS; `npm run dev` -> buka tab Jurnal, klik Export > Excel dan PDF -> file terunduh dengan kop; filter pencarian mengubah isi file. Commit:

```bash
git add src/App.tsx src/modules/accounting
git commit -m "feat(export): unified ExportMenu in accounting hub, remove 5 legacy CSV handlers"
```

---

### Task 10: mapper expenses + wiring ExpenseTable

**Files:**
- Modify: `src/shared/export/registry.ts` (ganti `notYet('expenses')` dengan mapper nyata)
- Modify: `src/modules/expenses/components/ExpenseTable.tsx` (hapus `handleExportCsv` 90-111 + tombol ~129)
- Test: tambah kasus di `src/shared/export/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `ExpenseRecord`, `EXPENSE_CATEGORY_CONFIG` (`src/shared/utils/formatters.ts`).
- Produces: mapper `expenses` (DOCX aktif sesuai matriks).

- [ ] **Step 1: Test RED** — `buildExportDoc('expenses', [rec], ctx)` dengan 1 record ACTIVE 1 VOID: rows.length 2, totals.amount hanya ACTIVE.

- [ ] **Step 2: Mapper** (kolom = header CSV lama persis):

```ts
const mapExpenses = (list: ExpenseRecord[], ctx: ExportCtx): ExportDoc => {
  const rows = list.map((e) => ({
    bkk: e.bkk_number || e.expense_number || e.reference,
    tanggal: e.date,
    kategori: e.category,
    kode_akun: e.category_code || EXPENSE_CATEGORY_CONFIG[e.category]?.account_code || '6-1005',
    nominal: e.amount,
    sumber: e.cash_source,
    penerima: e.paid_to,
    keterangan: e.description,
    otorisasi: e.approved_by,
    status: e.status === 'VOID' ? 'VOID' : 'ACTIVE',
    alasan_void: e.void_reason || '',
  }));
  return makeDoc('expenses', 'Rekap Pengeluaran Kas', 'landscape', ctx, [{
    columns: [
      { key: 'bkk', label: 'No BKK', type: 'text', width: 16 },
      { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'kategori', label: 'Kategori', type: 'text', width: 28 },
      { key: 'kode_akun', label: 'Kode Akun', type: 'text', width: 10 },
      { key: 'nominal', label: 'Nominal', type: 'currency' },
      { key: 'sumber', label: 'Sumber Dana', type: 'text', width: 22 },
      { key: 'penerima', label: 'Penerima', type: 'text', width: 20 },
      { key: 'keterangan', label: 'Keterangan', type: 'text', width: 36 },
      { key: 'otorisasi', label: 'Otorisasi', type: 'text', width: 16 },
      { key: 'status', label: 'Status', type: 'text', width: 9 },
      { key: 'alasan_void', label: 'Alasan Void', type: 'text', width: 24 },
    ],
    rows,
    totals: { nominal: sum(list.filter((e) => e.status !== 'VOID'), (e) => e.amount) },
  }]);
};
```

- [ ] **Step 3: Wiring** — hapus `handleExportCsv` + tombol `Ekspor CSV` di `ExpenseTable.tsx`; ganti:

```tsx
<ExportMenu reportId="expenses" data={filteredExpenses} ctx={{ periodLabel: <label filter bulan/tanggal yang tampil di layar; fallback 'Semua Periode'> }} />
```

- [ ] **Step 4: `npm test` + `npm run lint` PASS. Commit**

```bash
git add src/shared/export src/modules/expenses
git commit -m "feat(export): expenses mapper + ExportMenu in ExpenseTable (xlsx/pdf/docx/csv)"
```

---

### Task 11: mapper inventaris (6 laporan) + wiring

**Files:**
- Modify: `src/shared/export/registry.ts` (ganti 6 stub `notYet` inventaris)
- Modify: `src/modules/inventory/InventoryScreen.tsx` (toolbar header tab)
- Modify: `src/modules/inventory/components/StockCardDrawer.tsx` (header drawer)
- Modify: `src/modules/inventory/components/StockOpnameModal.tsx` (footer modal)
- Modify: `src/App.tsx` (hanya jika `InventoryScreen` belum menerima prop mutasi stok)
- Test: `src/shared/export/__tests__/registry.test.ts` (kasus products + opname)

**Interfaces:**
- Consumes: `ProductItem`, `ServiceMasterItem`, `SupplierItem`, `StockMutation`, `StockOpnameItem`.
- Produces: mapper `inventory_products|inventory_services|inventory_suppliers|stock_movements|stock_opname|goods_receipts`.

- [ ] **Step 1: Test RED** — `inventory_products` dengan 2 produk: totals.qty = jumlah stok, totals.nilai_persediaan = sum(qty*hpp).

- [ ] **Step 2: Mapper** — kolom mengikuti tabel layar:

```ts
const stockOf = (p: ProductItem): number => p.product_quantity ?? p.stock ?? 0;
const costOf = (p: ProductItem): number => p.product_cost ?? p.cost_price ?? 0;
const priceOf = (p: ProductItem): number => p.product_price ?? p.price ?? 0;

const mapProducts = (list: ProductItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('inventory_products', 'Katalog Produk', 'landscape', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode Produk', type: 'text', width: 14 },
      { key: 'barcode', label: 'Barcode', type: 'text', width: 14 },
      { key: 'nama', label: 'Nama Produk', type: 'text', width: 36 },
      { key: 'kategori', label: 'Kategori', type: 'text', width: 12 },
      { key: 'merek', label: 'Merek', type: 'text', width: 14 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'stok', label: 'Stok', type: 'number' },
      { key: 'alert', label: 'Alert Stok', type: 'number' },
      { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
      { key: 'harga', label: 'Harga Jual (Rp)', type: 'currency' },
      { key: 'nilai', label: 'Nilai Persediaan (Rp)', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows: list.map((p) => ({
      kode: p.product_code, barcode: p.barcode, nama: p.product_name || p.name,
      kategori: p.category, merek: p.brand, ukuran: p.product_size ?? p.size ?? '',
      stok: stockOf(p), alert: p.product_stock_alert ?? p.min_stock ?? 0,
      hpp: costOf(p), harga: priceOf(p), nilai: stockOf(p) * costOf(p),
      status: p.is_active === false ? 'NONAKTIF' : 'AKTIF',
    })),
    totals: { stok: sum(list, stockOf), nilai: sum(list, (p) => stockOf(p) * costOf(p)) },
  }]);

const mapServices = (list: ServiceMasterItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('inventory_services', 'Master Jasa Bengkel', 'portrait', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode Jasa', type: 'text', width: 14 },
      { key: 'nama', label: 'Nama Jasa', type: 'text', width: 30 },
      { key: 'kategori', label: 'Kategori', type: 'text', width: 18 },
      { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
      { key: 'harga', label: 'Tarif (Rp)', type: 'currency' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows: list.map((s) => ({ kode: s.service_code, nama: s.service_name, kategori: s.category, hpp: s.cost_price, harga: s.standard_price, status: s.is_active ? 'AKTIF' : 'NONAKTIF' })),
  }]);

const mapSuppliers = (list: SupplierItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('inventory_suppliers', 'Master Supplier', 'landscape', ctx, [{
    columns: [
      { key: 'kode', label: 'Kode', type: 'text', width: 12 },
      { key: 'nama', label: 'Nama Distributor', type: 'text', width: 32 },
      { key: 'telp', label: 'Telepon', type: 'text', width: 16 },
      { key: 'email', label: 'Email', type: 'text', width: 24 },
      { key: 'alamat', label: 'Alamat', type: 'text', width: 36 },
      { key: 'pic', label: 'Kontak PIC', type: 'text', width: 18 },
      { key: 'termin', label: 'Termin (hari)', type: 'number' },
      { key: 'status', label: 'Status', type: 'text', width: 10 },
    ],
    rows: list.map((s) => ({ kode: s.supplier_code, nama: s.supplier_name, telp: s.phone, email: s.email ?? '', alamat: s.address, pic: s.contact_person, termin: s.payment_terms_days, status: s.is_active ? 'AKTIF' : 'NONAKTIF' })),
  }]);

const mapMovements = (muts: StockMutation[], ctx: ExportCtx): ExportDoc =>
  makeDoc('stock_movements', 'Kartu Stok / Mutasi', 'landscape', ctx, [{
    columns: [
      { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'produk', label: 'Produk', type: 'text', width: 34 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'ref', label: 'No Ref', type: 'text', width: 18 },
      { key: 'tipe', label: 'Tipe', type: 'text', width: 12 },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'saldo', label: 'Saldo Berjalan', type: 'number' },
      { key: 'operator', label: 'Operator', type: 'text', width: 16 },
      { key: 'ket', label: 'Keterangan', type: 'text', width: 30 },
    ],
    rows: muts.map((m) => ({ tgl: m.date, produk: m.tire_name || m.product_name || '', ukuran: m.tire_size, ref: m.ref_doc, tipe: m.type, qty: m.qty, saldo: m.balance, operator: m.operator, ket: m.notes || m.description || '' })),
  }]);

const mapOpname = (items: StockOpnameItem[], ctx: ExportCtx): ExportDoc =>
  makeDoc('stock_opname', 'Hasil Stock Opname', 'landscape', ctx, [{
    columns: [
      { key: 'produk', label: 'Produk', type: 'text', width: 36 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'sistem', label: 'Stok Sistem', type: 'number' },
      { key: 'fisik', label: 'Stok Fisik', type: 'number' },
      { key: 'selisih', label: 'Selisih', type: 'number' },
      { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
      { key: 'nilai', label: 'Nilai Selisih (Rp)', type: 'currency' },
    ],
    rows: items.map((i) => ({ produk: i.tire_name, ukuran: i.product_size, sistem: i.system_stock, fisik: i.physical_stock, selisih: i.difference, hpp: i.cost_price, nilai: i.total_difference_val })),
    totals: { selisih: sum(items, (i) => i.difference), nilai: sum(items, (i) => i.total_difference_val) },
  }]);

const mapGoodsReceipts = (muts: StockMutation[], ctx: ExportCtx): ExportDoc => {
  const masuk = muts.filter((m) => m.type === 'MASUK');
  return makeDoc('goods_receipts', 'Riwayat Penerimaan Barang', 'landscape', ctx, [{
    columns: [
      { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'ref', label: 'No Ref/PO', type: 'text', width: 20 },
      { key: 'produk', label: 'Produk', type: 'text', width: 36 },
      { key: 'ukuran', label: 'Ukuran', type: 'text', width: 14 },
      { key: 'qty', label: 'Qty Masuk', type: 'number' },
      { key: 'operator', label: 'Operator', type: 'text', width: 16 },
      { key: 'ket', label: 'Keterangan', type: 'text', width: 32 },
    ],
    rows: masuk.map((m) => ({ tgl: m.date, ref: m.ref_doc, produk: m.tire_name || m.product_name || '', ukuran: m.tire_size, qty: m.qty, operator: m.operator, ket: m.notes || m.description || '' })),
    totals: { qty: sum(masuk, (m) => m.qty) },
  }]);
};
```

Ganti 6 entri `notYet(...)` di `REPORT_MAPPERS` dengan mapper ini.

- [ ] **Step 3: Wiring InventoryScreen** — di toolbar header tab (sebelah tombol Stock Opname), render sesuai `activeTab`:

```tsx
{activeTab === 'SERVICES' ? (
  <ExportMenu reportId="inventory_services" data={services} ctx={{ periodLabel: 'Data Saat Ini' }} />
) : activeTab === 'SUPPLIERS' ? (
  <ExportMenu reportId="inventory_suppliers" data={suppliers} ctx={{ periodLabel: 'Data Saat Ini' }} />
) : (
  <ExportMenu reportId="inventory_products" data={filteredProducts} ctx={{ periodLabel: `Kategori ${activeTab}` }} />
)}
```

`filteredProducts` = hasil filter merek/ring/stok yang sudah ada di layar (variannya sudah dihitung di komponen; pakai variabel yang sama dengan yang dirender tabel).

- [ ] **Step 4: Wiring StockCardDrawer** — header drawer: `<ExportMenu reportId="stock_movements" data={mutationsProdukIni} ctx={{ periodLabel: 'Seluruh Riwayat' }} />` (array mutasi yang sama yang dirender tabel drawer).

- [ ] **Step 5: Wiring penerimaan barang** — `goods_receipts` butuh daftar mutasi MASUK seluruh produk. Jika `InventoryScreen` belum punya prop mutasi, tambah `stockMovements: StockMutation[]` dari `App.tsx` (state mutasi stok sudah dipertahankan App). Tombol di toolbar: `<ExportMenu reportId="goods_receipts" data={stockMovements} ctx={{ periodLabel: 'Seluruh Riwayat' }} />`.

- [ ] **Step 6: Wiring StockOpnameModal** — footer modal (sebelah tombol Simpan): `<ExportMenu reportId="stock_opname" data={opnameItems} ctx={{ periodLabel: formatDateIndo(new Date().toISOString()) }} />` (items hasil input opname yang sedang berjalan).

- [ ] **Step 7: `npm test` + `npm run lint` PASS; QA browser: export produk (xlsx) dan kartu stok (pdf). Commit**

```bash
git add src/shared/export src/modules/inventory src/App.tsx
git commit -m "feat(export): inventory mappers (products/services/suppliers/movements/opname/receipts) + wiring"
```

---

### Task 12: mapper POS history + dashboard + wiring

**Files:**
- Modify: `src/shared/export/registry.ts` (ganti stub `pos_sales_history`, `dashboard_summary`)
- Modify: `src/modules/receipt/ThermalReceiptScreen.tsx` (header daftar nota, ~baris 337)
- Modify: `src/modules/dashboard/ExecutiveDashboardScreen.tsx` (header ringkasan)
- Test: `src/shared/export/__tests__/registry.test.ts` (kasus pos totals)

**Interfaces:**
- Consumes: `PosTransaction`, `ProductItem`, `ExpenseRecord`.
- Produces: mapper `pos_sales_history`, `dashboard_summary`.

- [ ] **Step 1: Mapper POS** — kolom: Tanggal, No Nota, Kasir, Pelanggan, Plat, Item, Subtotal, Diskon, PPN, Grand Total, HPP, Laba Kotor, Metode, Status. `rows` dari `PosTransaction[]` memakai field ganda dengan fallback yang sama seperti layar (`t.total_amount ?? t.grand_total`, `t.total_hpp ?? t.total_cost_hpp`, `t.gross_profit ?? t.total_profit`). `totals`: subtotal, diskon, ppn, total, hpp, laba (semua `sum`). `makeDoc('pos_sales_history', 'Riwayat Penjualan POS', 'landscape', ...)`.

- [ ] **Step 2: Mapper dashboard** — input terdefinisi:

```ts
export interface DashboardInput {
  transactions: PosTransaction[];
  products: ProductItem[];
  expenses: ExpenseRecord[];
}

const mapDashboard = (d: DashboardInput, ctx: ExportCtx): ExportDoc => {
  const lunas = d.transactions.filter((t) => t.status !== 'VOID');
  const omzet = (t: PosTransaction) => t.total_amount ?? t.grand_total;
  const hppOf = (t: PosTransaction) => t.total_hpp ?? t.total_cost_hpp ?? 0;
  const totalOmzet = sum(lunas, omzet);
  const totalHpp = sum(lunas, hppOf);
  const banTerjual = sum(lunas, (t) => sum(t.items, (i) => i.qty));
  const ymd = (dt: Date) => dt.toISOString().split('T')[0];
  const tren = Array.from({ length: 7 }).map((_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (6 - i));
    const key = ymd(day);
    const dayTx = lunas.filter((t) => t.date === key);
    return { tgl: key, omzet: sum(dayTx, omzet), hpp: sum(dayTx, hppOf), qty: sum(dayTx, (t) => sum(t.items, (i) => i.qty)) };
  });
  const brandMap = new Map<string, number>();
  lunas.forEach((t) => t.items.forEach((i) => {
    const b = i.product?.brand || 'Lainnya';
    brandMap.set(b, (brandMap.get(b) ?? 0) + i.qty);
  }));
  const topProduk = [...brandMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const kritis = d.products
    .filter((p) => stockOf(p) <= (p.product_stock_alert ?? p.min_stock ?? 5))
    .slice(0, 20);
  return makeDoc('dashboard_summary', 'Ringkasan Dashboard', 'portrait', ctx, [
    {
      title: 'KPI Utama',
      columns: [{ key: 'm', label: 'Metrik', type: 'text', width: 34 }, { key: 'v', label: 'Nilai', type: 'text', width: 22 }],
      rows: [
        { m: 'Total Penjualan (non-VOID)', v: String(totalOmzet) },
        { m: 'Total HPP FIFO', v: String(totalHpp) },
        { m: 'Laba Kotor', v: String(totalOmzet - totalHpp) },
        { m: 'Total Pengeluaran Kas', v: String(sum(d.expenses.filter((e) => e.status !== 'VOID'), (e) => e.amount)) },
        { m: 'Unit Terjual', v: String(banTerjual) },
        { m: 'Nilai Persediaan (HPP)', v: String(sum(d.products, (p) => stockOf(p) * costOf(p))) },
      ],
    },
    {
      title: 'Tren 7 Hari',
      columns: [
        { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'omzet', label: 'Omzet (Rp)', type: 'currency' },
        { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
        { key: 'qty', label: 'Unit', type: 'number' },
      ],
      rows: tren,
      totals: { omzet: sum(tren, (t) => t.omzet), hpp: sum(tren, (t) => t.hpp), qty: sum(tren, (t) => t.qty) },
    },
    {
      title: 'Pangsa Merek (unit)',
      columns: [{ key: 'b', label: 'Merek', type: 'text', width: 22 }, { key: 'q', label: 'Unit', type: 'number' }],
      rows: topProduk.map(([b, q]) => ({ b, q })),
    },
    {
      title: 'Peringatan Stok Kritis',
      columns: [
        { key: 'nama', label: 'Produk', type: 'text', width: 36 },
        { key: 'stok', label: 'Stok', type: 'number' },
        { key: 'alert', label: 'Batas Alert', type: 'number' },
      ],
      rows: kritis.map((p) => ({ nama: p.product_name || p.name, stok: stockOf(p), alert: p.product_stock_alert ?? p.min_stock ?? 5 })),
    },
  ]);
};
```

`stockOf`/`costOf`/`sum` helper sudah ada dari Task 11/7 — ekspor internal registry, pakai ulang.

- [ ] **Step 3: Wiring ThermalReceiptScreen** — di header `Daftar Nota (n)` (baris ~337), di kanan: `<ExportMenu reportId="pos_sales_history" data={filteredTransactions} ctx={{ periodLabel: dateFilter ? `Tanggal ${dateFilter}` : 'Semua Tanggal' }} />` (`filteredTransactions` + `dateFilter` = variabel yang sudah ada di komponen).

- [ ] **Step 4: Wiring ExecutiveDashboardScreen** — header kartu ringkasan KPI, kanan atas: `<ExportMenu reportId="dashboard_summary" data={{ transactions, products, expenses }} ctx={{ periodLabel: `Sampai ${formatDateIndo(new Date().toISOString())}` }} />`.

- [ ] **Step 5: `npm test` + lint PASS; QA browser: export riwayat nota xlsx + dashboard pdf. Commit**

```bash
git add src/shared/export src/modules/receipt src/modules/dashboard
git commit -m "feat(export): POS history + dashboard mappers with multi-section export"
```

---

### Task 13: mapper laporan keuangan (7) + wiring SAK EMKM/arus kas/penutupan

**Files:**
- Modify: `src/shared/export/registry.ts` (ganti 7 stub `fin_*`, `sak_emkm_package`, `period_closing`)
- Modify: `src/modules/accounting/components/SakEmkmReportTab.tsx` (hapus `handleExportCsv` 76-130 + tombol ~259)
- Modify: `src/modules/accounting/components/CashFlowStatementTab.tsx` (header)
- Modify: `src/modules/accounting/components/PeriodClosingModal.tsx` (footer)
- Test: `src/shared/export/__tests__/registry.test.ts` (kasus income statement rows)

**Interfaces:**
- Consumes: `type Financials = ReturnType<typeof calculateDynamicSakEmkmFinancials>` + `CashFlowStatementResult` + `AccountingPeriodInfo` (import `calculateDynamicSakEmkmFinancials` dari `../../services/accountingService` HANYA untuk type via `import type` tidak bisa — pakai `import { calculateDynamicSakEmkmFinancials } from '../../services/accountingService';` lalu `type Financials = ReturnType<typeof calculateDynamicSakEmkmFinancials>;`).
- Produces: mapper `fin_income_statement|fin_equity_statement|fin_balance_sheet|fin_cash_flow|fin_calk|sak_emkm_package|period_closing`.

- [ ] **Step 1: Section builder reusable** (satu fungsi per laporan, dipakai sendiri DAN oleh package):

```ts
type LabelValue = { label: string; value: number };
const lvSection = (title: string, rows: LabelValue[]): ExportSection => ({
  title,
  columns: [
    { key: 'label', label: 'Komponen Akuntansi', type: 'text', width: 48 },
    { key: 'value', label: 'Nominal (Rp)', type: 'currency' },
  ],
  rows: rows.map((r) => ({ label: r.label, value: r.value })),
});

const incomeSection = (f: Financials): ExportSection =>
  lvSection('1. LAPORAN LABA RUGI', [
    { label: 'Penjualan Bruto', value: f.grossSales },
    { label: 'Potongan Diskon', value: -f.discounts },
    { label: 'PENJUALAN BERSIH', value: f.netSales },
    { label: 'Beban Pokok Penjualan (HPP FIFO)', value: -f.totalHpp },
    { label: 'LABA BRUTO', value: f.grossProfit },
    ...f.expenseBreakdown.map((e) => ({ label: `Beban Operasional: ${e.code} ${e.name}`, value: -e.amount })),
    { label: 'TOTAL BEBAN OPERASIONAL', value: -f.totalExpenses },
    { label: 'LABA NETO PERIODE BERJALAN', value: f.netIncome },
  ]);

const balanceSection = (f: Financials): ExportSection =>
  lvSection('2. LAPORAN POSISI KEUANGAN (NERACA)', [
    { label: 'Aset Lancar - Kas Laci Toko', value: f.kasLaci },
    { label: 'Aset Lancar - Bank BCA Cabang 3', value: f.bankBca },
    { label: 'Aset Lancar - Piutang Usaha (AR)', value: f.piutangDagang },
    { label: 'Aset Lancar - Persediaan Ban Baru', value: f.persediaanBuku },
    { label: 'TOTAL ASET LANCAR', value: f.totalCurrentAssets },
    { label: 'Aset Tetap - Mesin Spooring 3D & Peralatan', value: f.peralatanMesin },
    { label: 'Akumulasi Penyusutan', value: -f.akumulasiPenyusutan },
    { label: 'NILAI BUKU ASET TETAP', value: f.netFixedAssets },
    { label: 'TOTAL ASET', value: f.totalAssets },
    { label: 'Liabilitas - Hutang Dagang Supplier (AP)', value: f.hutangSupplier },
    { label: 'Liabilitas - PPN Keluaran', value: f.ppnKeluaran },
    { label: 'TOTAL LIABILITAS', value: f.totalLiabilities },
    { label: 'Ekuitas - Modal Disetor Pemilik', value: f.modalPemilik },
    { label: 'Ekuitas - Laba Ditahan', value: f.labaDitahan },
    { label: 'Ekuitas - Laba Periode Berjalan', value: f.currentNetIncome },
    { label: 'TOTAL EKUITAS', value: f.totalEquity },
    { label: 'TOTAL LIABILITAS & EKUITAS', value: f.totalLiabilitiesAndEquity },
  ]);

const equitySection = (f: Financials): ExportSection =>
  lvSection('3. LAPORAN PERUBAHAN MODAL', [
    { label: 'Modal Disetor Pemilik', value: f.modalPemilik },
    { label: 'Laba Ditahan', value: f.labaDitahan },
    { label: 'Laba Periode Berjalan', value: f.currentNetIncome },
    { label: 'TOTAL EKUITAS', value: f.totalEquity },
  ]);

const cashFlowSection = (cf: CashFlowStatementResult): ExportSection =>
  lvSection('4. LAPORAN ARUS KAS', [
    { label: 'Kas Masuk dari Penjualan', value: cf.cashFromSales },
    { label: 'Kas Masuk dari Piutang', value: cf.cashFromReceivables },
    { label: 'Total Arus Kas Masuk Operasional', value: cf.totalOperatingInflows },
    { label: 'Kas Dibayar untuk Beban', value: -cf.cashPaidForExpenses },
    { label: 'Kas Dibayar untuk Persediaan', value: -cf.cashPaidForInventory },
    { label: 'Total Arus Kas Keluar Operasional', value: -cf.totalOperatingOutflows },
    { label: 'ARUS KAS OPERASIONAL', value: cf.netOperatingCashFlow },
    { label: 'Kas Dibayar untuk Aset Tetap', value: -cf.cashPaidForFixedAssets },
    { label: 'ARUS KAS INVESTASI', value: cf.netInvestingCashFlow },
    { label: 'Kas Dibayar untuk Hutang', value: -cf.cashPaidForPayables },
    { label: 'Kas dari Modal', value: cf.cashFromCapital },
    { label: 'ARUS KAS PENDANAAN', value: cf.netFinancingCashFlow },
    { label: 'KENAIKAN (PENURUNAN) KAS BERSIH', value: cf.netCashFlow },
    { label: 'Saldo Kas Awal', value: cf.beginningCash },
    { label: 'Saldo Kas Akhir', value: cf.endingCash },
    { label: 'Rincian: Kas Laci Akhir', value: cf.cashDrawerEnding },
    { label: 'Rincian: Bank BCA Akhir', value: cf.bankBcaEnding },
  ]);

const calkSection = (f: Financials): ExportSection => ({
  title: '5. CATATAN ATAS LAPORAN KEUANGAN (CALK)',
  columns: [{ key: 'uraian', label: 'Uraian', type: 'text', width: 110 }],
  rows: [
    'Laporan disusun berdasarkan SAK EMKM dengan basis akrual.',
    'Persediaan dinilai dengan metode FIFO (First-In, First-Out).',
    'Aset tetap disusutkan dengan metode garis lurus.',
    `Pendapatan usaha periode berjalan: Rp ${f.netSales}.`,
    `Laba neto periode berjalan: Rp ${f.netIncome}.`,
    `Total aset: Rp ${f.totalAssets}; seimbang dengan total liabilitas & ekuitas: Rp ${f.totalLiabilitiesAndEquity}.`,
    `Likuiditas (aset lancar / liabilitas): ${f.currentRatio.toFixed(2)}.`,
  ].map((t) => ({ uraian: t })),
});
```

- [ ] **Step 2: Mapper pembungkus** (masing-masing `makeDoc` dengan 1 section; `sak_emkm_package` = 5 section; `period_closing` = section label/value dari `AccountingPeriodInfo`: Periode, Status, Ditutup Pada (date), Ditutup Oleh, No Jurnal Penutup, Laba Dipindahkan (currency)):

```ts
const mapIncome = (f: Financials, ctx: ExportCtx) => makeDoc('fin_income_statement', 'Laporan Laba Rugi', 'portrait', ctx, [incomeSection(f)]);
const mapBalance = (f: Financials, ctx: ExportCtx) => makeDoc('fin_balance_sheet', 'Laporan Posisi Keuangan', 'portrait', ctx, [balanceSection(f)]);
const mapEquity = (f: Financials, ctx: ExportCtx) => makeDoc('fin_equity_statement', 'Laporan Perubahan Modal', 'portrait', ctx, [equitySection(f)]);
const mapCashFlow = (cf: CashFlowStatementResult, ctx: ExportCtx) => makeDoc('fin_cash_flow', 'Laporan Arus Kas', 'portrait', ctx, [cashFlowSection(cf)]);
const mapCalk = (f: Financials, ctx: ExportCtx) => makeDoc('fin_calk', 'CALK', 'portrait', ctx, [calkSection(f)]);
const mapSakPackage = (d: { financials: Financials; cashFlow: CashFlowStatementResult }, ctx: ExportCtx) =>
  makeDoc('sak_emkm_package', 'Paket Laporan Keuangan SAK EMKM', 'portrait', ctx, [
    incomeSection(d.financials), balanceSection(d.financials), equitySection(d.financials), cashFlowSection(d.cashFlow), calkSection(d.financials),
  ]);
const mapPeriodClosing = (p: AccountingPeriodInfo, ctx: ExportCtx) =>
  makeDoc('period_closing', 'Penutupan Periode Akuntansi', 'portrait', ctx, [{
    columns: [
      { key: 'label', label: 'Keterangan', type: 'text', width: 34 },
      { key: 'value', label: 'Nilai', type: 'text', width: 26 },
    ],
    rows: [
      { label: 'Periode', value: p.period_name },
      { label: 'Status', value: p.status },
      { label: 'Ditutup Pada', value: p.closed_at ?? '-' },
      { label: 'Ditutup Oleh', value: p.closed_by ?? '-' },
      { label: 'No Jurnal Penutup', value: p.closing_journal_id ?? '-' },
      { label: 'Laba Dipindahkan ke Laba Ditahan', value: `Rp ${p.net_income_transferred ?? 0}` },
    ],
  }]);
```

- [ ] **Step 3: Wiring SakEmkmReportTab** — hapus `handleExportCsv` (76-130) + tombol `Ekspor CSV` (~259); ganti dengan `<ExportMenu reportId="sak_emkm_package" data={{ financials, cashFlow }} ctx={{ periodLabel, startDate: effectiveStartDate, endDate: effectiveEndDate }} />`. Tambah menu kecil per section di judul blok Laba Rugi/Neraca/Perubahan Modal/CALK: `fin_income_statement`, `fin_balance_sheet`, `fin_equity_statement`, `fin_calk` dengan `data={financials}`.

- [ ] **Step 4: Wiring CashFlowStatementTab** — header: `<ExportMenu reportId="fin_cash_flow" data={cashFlow} ctx={{ periodLabel: <label periode yang diterima tab via props; fallback 'Periode Berjalan'> }} />`.

- [ ] **Step 5: Wiring PeriodClosingModal** — footer modal: `<ExportMenu reportId="period_closing" data={periodInfo} ctx={{ periodLabel: periodInfo.period_name }} />` (`periodInfo` = objek `AccountingPeriodInfo` yang dirender modal; kalau null, jangan render menu).

- [ ] **Step 6: Test** — `buildExportDoc('fin_income_statement', financialsFixture, ctx)` -> rows.length = 5 + n expenseBreakdown + 3; nilai diskon negatif. `npm test` + lint PASS.

- [ ] **Step 7: Commit**

```bash
git add src/shared/export src/modules/accounting
git commit -m "feat(export): SAK EMKM financial statement mappers + wiring (package, per-report, cash flow, period closing)"
```

---

### Task 14: cleanup final + QA matriks penuh

**Files:**
- Verify only (tidak ada perubahan baru kecuali temuan QA)

**Interfaces:**
- Consumes: seluruh task sebelumnya.

- [ ] **Step 1: Bukti penghapusan kode lama**

```bash
Select-String -Path src -Pattern 'handleExportCsv|handleExportLedgerCsv|handleExportTrialBalanceCsv|handleExportApCsv' -Recurse
```

Expected: 0 match. Bila masih ada, hapus.

- [ ] **Step 2: Gate statis penuh**

```bash
npm run lint
npm test
npm run build
```

Expected: ketiganya exit 0.

- [ ] **Step 3: QA browser matriks §3 spec (playwright)** — `npm run dev`; untuk 21 reportId: klik tiap format yang diizinkan, pastikan event download tertangkap + nama file sesuai §4.3. Buka minimal: 1 xlsx (cek kop, header fill, TOTAL, freeze), 1 pdf multi-halaman (cek zebra + "Hal X dari Y"), 1 docx, 1 csv (cek BOM + koma quote). Ubah filter Jurnal -> export -> jumlah baris berubah. Data kosong -> toast info tanpa file.

- [ ] **Step 4: Kontingensi risiko exceljs** — bila Step 3 gagal dengan error `process`/`Buffer` saat export xlsx di browser: tambah ke `vite.config.ts`:

```ts
define: { global: 'globalThis' },
```

Lalu ulangi Step 3. (Risiko §10 spec; hanya dilakukan kalau muncul.)

- [ ] **Step 5: Commit penutup**

```bash
git add -A src docs
git commit -m "test(export): full format matrix QA passed across all pages"
```

---

## Self-Review Plan (dijalankan penulis plan, sudah lolos)

1. **Cakupan spec:** 21 reportId matriks §3 = T7(5) + T10(1) + T11(6) + T12(2) + T13(7). Writer 4 format = T3-T6. Kop/nama file = T2. UI = T8. Migrasi hapus CSV = T9/T10/T13 + gerbang T14. Testing §8 = unit tiap task + QA T14. Out-of-scope §9 tidak punya task (benar).
2. **Placeholder:** stub `notYet()` BUKAN placeholder teks — entri runtime-error eksplisit yang digantikan task berikutnya sebelum dipakai; urutan task menjamin tidak pernah terpanggil di produksi.
3. **Konsistensi tipe:** `ExportDoc.title` dipakai `useExport`/`buildFileName`; `displayCell`/`formatStamp`/`toNumber` signature sama di T3-T6, T13; `REPORT_FORMATS` == matriks §3; `stockOf`/`costOf`/`sum` didefinisikan sekali, dipakai ulang T11-T13.
