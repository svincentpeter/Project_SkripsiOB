# Design Spec: Sistem Export Terpadu Semua Halaman (XLSX / PDF / DOCX / CSV)

Tanggal: 2026-09-08
Status: Menunggu review user
Pendekatan terpilih: **A. Client-side unified** (generate di browser, nol perubahan backend Laravel)

---

## 1. Latar Belakang & Tujuan

Saat ini fitur export tersebar dan tidak seragam:

- CSV ad-hoc hasil copy-paste kode di 7 komponen (`JournalTab`, `GeneralLedgerTab`, `TrialBalanceTab`, `AccountsReceivableTab`, `AccountsPayableTab`, `SakEmkmReportTab`, `ExpenseTable`) — tanpa kop, tanpa format Rupiah, tanpa baris total, nama file tidak konsisten.
- `window.print()` untuk struk thermal, voucher pengeluaran, nota POS, dan modal cetak A4 (laporan keuangan, buku besar).
- Belum ada library export sama sekali (frontend maupun backend).

**Tujuan:** satu sistem export yang dipakai semua halaman, hasil rapi dan lengkap (kop toko, periode, total, format angka/tanggal Indonesia), mendukung **XLSX, PDF, DOCX, CSV**, dengan satu komponen UI seragam (`ExportMenu`).

**Kriteria sukses:**

1. Semua laporan/tab pada matriks section 3 punya tombol export dengan format yang diizinkan.
2. Hasil XLSX/PDF/DOCX punya kop toko (dari `StoreSettings`), judul laporan, periode, dan baris TOTAL bila ada kolom numerik.
3. Data yang ter-export = data yang sedang tampil/terfilter di layar.
4. Kode CSV lama dihapus; tidak ada lagi duplikasi logika export.
5. `npm run lint` (tsc) bersih; unit test writer lulus; QA manual tiap format di browser lulus.

---

## 2. Arsitektur

### 2.1. Struktur Modul Baru `src/shared/export/`

```
src/shared/export/
  types.ts            # Kontrak data ExportDoc (satu-satunya format antar layer)
  registry.ts         # reportId -> definisi laporan (mapper data layar -> ExportDoc)
  kop.ts              # builder kop laporan dari StoreSettings + user + periode
  naming.ts           # aturan nama file seragam
  useExport.ts        # hook: (reportId, ctx) -> { exportAs(format), busy }
  ExportMenu.tsx      # dropdown UI seragam: Excel | PDF | Word | CSV
  writers/
    csv.ts            # native Blob + BOM UTF-8
    xlsx.ts           # exceljs (styling header, border, format Rp, freeze, autofilter)
    pdf.ts            # pdfmake (A4, kop, zebra table, nomor halaman)
    docx.ts           # docx (kop, tabel bergaya)
```

**Prinsip isolasi:** halaman hanya memanggil `<ExportMenu reportId="journal" data={...} periode={...} />`. Writer tidak tahu apa pun tentang React; hanya membaca `ExportDoc`. Menambah laporan baru = menambah entri registry, nol perubahan writer.

### 2.2. Kontrak `ExportDoc` (types.ts)

```ts
export type CellValue = string | number | null;
export type ColType = 'text' | 'number' | 'currency' | 'date' | 'percent';

export interface ExportColumn {
  key: string;
  label: string;
  type: ColType;
  width?: number;                        // hint lebar kolom (char) utk xlsx/pdf
  align?: 'left' | 'right' | 'center';   // default: right utk number/currency/date
}

export interface ExportSection {
  title?: string;                        // sub-tabel, mis. "Aset Lancar" di Neraca
  columns: ExportColumn[];
  rows: Array<Record<string, CellValue>>;
  totals?: Partial<Record<string, CellValue>>;  // baris TOTAL per key kolom
}

export interface ExportKop {
  storeName: string; branchName: string; address: string; city: string;
  phone: string; email: string;
  reportTitle: string;
  periodLabel: string;                   // mis. "01 Sep 2026 - 08 Sep 2026"
  generatedBy: string;                   // nama user aktif + role
  generatedAt: string;                   // ISO string, diformat writer
}

export interface ExportDoc {
  reportId: string;
  orientation: 'portrait' | 'landscape';
  kop: ExportKop;
  sections: ExportSection[];
}
```

Semua writer menerima `ExportDoc` dan mengembalikan `Blob`. Konversi tipe per kolom dilakukan writer: `currency` -> angka + prefix "Rp" (PDF/DOCX) atau number format `#,##0` (XLSX); `date` -> format Indonesia via `formatDateIndo` di `src/shared/utils/formatters.ts`.

### 2.3. Alur Data

```
Halaman (state terfilter) -> ExportMenu props -> registry mapper -> ExportDoc
  -> useExport: dynamic import(writer) -> Blob -> <a download> -> toast sukses
```

- **Lazy loading:** `await import('./writers/xlsx')` dst. saat klik, bukan saat mount. Bundle awal tidak bertambah.
- **Kop:** dibangun `kop.ts` dari `StoreSettings` + `UserSession` aktif yang sudah tersedia di state `App.tsx`, diteruskan ke mapper via konteks.
- **RBAC:** tidak ada gerbang baru — layar yang tidak diizinkan role memang tidak ter-render (mekanisme `isScreenPermitted` yang ada sudah cukup).

### 2.4. Dependency Baru (package.json)

| Paket | Untuk | Catatan |
| --- | --- | --- |
| `exceljs` | XLSX bergaya | style, number format, freeze, autofilter |
| `pdfmake` | PDF | font bawaan Roboto cukup untuk Bahasa Indonesia; build + vfs fonts |
| `docx` | DOCX | tabel + heading, hasil dibuka di Word/Google Docs |
| `vitest` (dev) | unit test writer | fungsi murni, tanpa DOM |

Tanpa library baru untuk CSV (native Blob).

---

## 3. Matriks Halaman x Format

`reportId` final. "-" = tidak disediakan (YAGNI).

| Halaman / Tab | reportId | XLSX | PDF | DOCX | CSV |
| --- | --- | :-: | :-: | :-: | :-: |
| Dashboard (KPI + tren 7 hari + merek + top produk + stok kritis) | `dashboard_summary` | v | v | - | - |
| POS riwayat penjualan | `pos_sales_history` | v | v | - | v |
| Inventaris: produk | `inventory_products` | v | v | - | v |
| Inventaris: jasa | `inventory_services` | v | v | - | v |
| Inventaris: supplier | `inventory_suppliers` | v | v | - | v |
| Kartu stok / mutasi | `stock_movements` | v | v | - | v |
| Stock opname | `stock_opname` | v | v | - | v |
| Penerimaan barang (GR) | `goods_receipts` | v | v | - | v |
| Pengeluaran kas | `expenses` | v | v | v | v |
| Jurnal umum | `journal` | v | v | - | v |
| Buku besar per akun | `general_ledger` | v | v | - | v |
| Neraca saldo | `trial_balance` | v | v | v | v |
| Piutang (AR) | `accounts_receivable` | v | v | - | v |
| Hutang (AP) | `accounts_payable` | v | v | - | v |
| Laba Rugi | `fin_income_statement` | v | v | v | v |
| Perubahan Modal | `fin_equity_statement` | v | v | v | v |
| Posisi Keuangan (Neraca) | `fin_balance_sheet` | v | v | v | v |
| Arus Kas | `fin_cash_flow` | v | v | v | v |
| CALK | `fin_calk` | - | v | v | - |
| Paket SAK EMKM (semua section 1 dokumen) | `sak_emkm_package` | v | v | v | v |
| Penutupan periode | `period_closing` | v | v | - | - |

**Tetap memakai `window.print()` (bukan sistem ini):** struk thermal 58/80mm, nota POS, voucher pengeluaran per-record, modal cetak A4 yang sudah ada. Sistem export baru melengkapinya, tidak menggantikannya.

**DOCX** hanya untuk laporan naratif/keuangan — tabel master data di Word tidak berguna.

---

## 4. Standar Kerapian Hasil Export

### 4.1. Kop (semua format kecuali CSV)

1. `store_name` (bold, besar) + `branch_name`
2. `address, city`
3. `phone / email`
4. garis pemisah
5. judul laporan (uppercase)
6. `Periode: {periodLabel}`
7. `Dicetak: dd MMM yyyy HH:mm oleh {nama} ({ROLE})`

Tabel mulai di bawah kop.

### 4.2. Per format

- **XLSX:** section berurutan dalam 1 sheet (jeda 1 baris kosong antar section, judul section sel merged bold). Header kolom: bold, fill `#1E293B`, teks putih. Border tipis semua sel data. `currency` = number format `#,##0` rata kanan. Baris TOTAL bold di akhir section yang punya `totals`. Freeze pane baris header. AutoFilter aktif.
- **PDF:** A4; `orientation` per laporan (master data & jurnal = landscape; laporan keuangan = portrait). Tabel pdfmake: header fill gelap, zebra row, garis tipis. Footer: `Hal {page} dari {totalPages}`. Baris TOTAL bold, garis atas ganda.
- **DOCX:** kop rata tengah, tabel gaya grid, header bold, TOTAL bold. Font default Calibri — aman di Word/Google Docs.
- **CSV:** datar tanpa kop (file data murni). **BOM UTF-8** (`\uFEFF`) agar aman di Excel, delimiter koma, field mengandung koma/tanda kutip di-quote.

### 4.3. Nama file (naming.ts)

`{JudulLaporanTanpaSpasi}_{YYYYMMDD}-{YYYYMMDD}.{ext}` — contoh `JurnalUmum_20260901-20260908.xlsx`. Tanpa rentang periode (dashboard): `RingkasanDashboard_20260908.xlsx`.

---

## 5. UI `ExportMenu`

- Tombol dropdown sekunder (ikon `Download` dari lucide-react, sudah terpasang). Item: **Excel (.xlsx)**, **PDF (.pdf)**, **Word (.docx)** (hanya bila reportId mendukung), **CSV (.csv)**.
- Saat generate: item disabled + spinner; toast hasil via `ToastProvider` yang sudah ada.
- Data kosong (rows = 0): klik -> toast info "Tidak ada data untuk diexport", tanpa file.
- Penempatan: kanan atas tiap tabel/tab, menggantikan tombol CSV lama. Dashboard: header kartu ringkasan.
- Pengecualian lokasi: `stock_opname` dan `goods_receipts` tidak punya tabel permanen — export dipasang pada riwayatnya masing-masing (drawer kartu stok / daftar penerimaan barang di `InventoryScreen`), bukan pada modal form.

---

## 6. Penanganan Kesalahan

- `useExport` membungkus pemanggilan writer dengan try/catch; error -> toast merah ringkas `Gagal membuat file: {pesan}`.
- Tanpa retry otomatis, tanpa fallback lintas format. Mapper registry yang menghasilkan baris invalid = bug, ditangkap unit test.
- Timeout tidak diperlukan (data client-side, ribuan baris, < 2 detik).

---

## 7. Migrasi & Penghapusan Kode Lama

1. Pasang `ExportMenu` di semua lokasi matriks section 3.
2. **Hapus** `handleExportCsv` / `handleExportLedgerCsv` / `handleExportTrialBalanceCsv` / `handleExportApCsv` dan helper CSV duplikat di 7 komponen tersebut (perilaku CSV pindah ke `writers/csv.ts` + registry).
3. Modal print A4 (`LedgerPrintModal`, `FinancialStatementsPrintModal`) dan struk/nota/voucher tetap; tidak disentuh.

---

## 8. Rencana Verifikasi & Testing

1. **Unit (vitest):** tiap writer dengan fixture `ExportDoc` tetap -> assert magic bytes (`PK` utk xlsx/docx, `%PDF` utk pdf, BOM utk csv), jumlah baris, keberadaan teks kop, nilai TOTAL.
2. **Statis:** `npm run lint` (tsc --noEmit) bersih.
3. **QA manual (browser):** `npm run dev`; tiap baris matriks section 3 dicoba tiap formatnya: buka file, cek kop/periode/total/format Rp; ubah filter layar -> hasil ikut berubah; data kosong -> toast.
4. **Regresi:** tombol CSV lama hilang; tidak ada error console saat membuka semua tab.

---

## 9. Di Luar Scope (eksplisit)

- Export server-side Laravel, watermark, kirim email, scheduled/backup export.
- Perubahan tampilan struk/nota/thermal dan modal print yang sudah ada.
- Impor (import) file Excel ke sistem.
- Multi-bahasa (hanya Bahasa Indonesia).

---

## 10. Risiko & Mitigasi

| Risiko | Mitigasi |
| --- | --- |
| Chunk lazy `pdfmake` + font sekitar 1,5 MB | Diterima; hanya termuat saat klik PDF. jsPDF ditolak: tabel multi-halaman jauh lebih manual |
| `exceljs` butuh polyfill `buffer`/`stream` di sebagian setup Vite | Verifikasi di fase 1; fallback `define.global` atau `vite-plugin-node-polyfills` |
| Data lama menyimpan angka sebagai string | Mapper registry wajib konversi `Number(...)` eksplisit, bukan di writer |
| Font pdfmake untuk karakter unik (mis. emoji di catatan) | Diterima: karakter tak ter-render dihapus/diganti di mapper, bukan fitur baru |
