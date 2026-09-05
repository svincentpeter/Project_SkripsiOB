# Implementation Plan: Redesain & Penyempurnaan Modul Pengeluaran (Expenses) Omah Ban Cabang 3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun ulang dan menyempurnakan modul Expenses (Biaya Operasional) Omah Ban Cabang 3 dengan arsitektur modular, kompresi foto nota otomatis (anti-crash localStorage), penomoran bukti baku sekuensial (BKK-YYYYMM-XXXX), pembatalan biaya (Void) dengan Jurnal Pembalik SAK EMKM (*Reversal Journal*), sinkronisasi kas bank, tabel riwayat interaktif (Search/Filter/Pagination/CSV), cetak voucher Bukti Kas Keluar (BKK), dan kartu analitik komposisi biaya.

**Architecture:** Memecah komponen monolitik `ExpensesScreen.tsx` ke dalam subkomponen terisolasi di bawah `src/modules/expenses/components/`. Model `ExpenseRecord` diperkaya dengan status (`ACTIVE` | `VOID`), nomor urut BKK baku, dan audit trail pembatalan. Logika akuntansi diperbarui di `accountingService.ts` untuk memetakan kategori ke COA secara dinamis dan menghasilkan jurnal pembalik berpasangan. Saldo kas bank dan kas laci disinkronkan secara reaktif pada `App.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, HTML5 Canvas API (kompresi gambar klien), LocalStorage persistent store.

**Spec:** [`docs/superpowers/specs/2026-09-05-expense-module-redesign.md`](file:///c:/laragon/www/Project_SkripsiOB/docs/superpowers/specs/2026-09-05-expense-module-redesign.md)

## Global Constraints
- Standar akuntansi: SAK EMKM (Entitas Mikro, Kecil, dan Menengah) dengan prinsip *Double-Entry* dan Jurnal Pembalik otomatis pada pembatalan.
- Penomoran Bukti Kas Keluar wajib sekuensial: `BKK-{YYYYMM}-{XXXX}` (e.g. `BKK-202609-0001`).
- Kompresi gambar nota wajib di sisi klien menggunakan Canvas (WebP/JPEG max 1000px, kualitas 0.7, ukuran < 150KB) sebelum masuk ke `localStorage`.
- Pembatalan transaksi (*Void*) tidak boleh menghapus data secara permanen (*soft delete* berstatus `'VOID'`), wajib menyertakan alasan pembatalan dan posting jurnal pembalik.
- Sinkronisasi kas: Pengeluaran dari Kas Laci memotong `cashInDrawer`; pengeluaran dari Bank BCA memotong saldo akun `1-1001` pada `accountBalances`.
- Strict Type Safety: Tanpa `as any`, `@ts-ignore`, atau `@ts-expect-error`.

---

### Task 1: Skema Types & Utilitas Kompresi Gambar

**Files:**
- Modify: `src/shared/types/index.ts`
- Create: `src/shared/utils/imageCompressor.ts`

**Interfaces:**
- Produces:
  - `src/shared/types/index.ts`: `ExpenseStatus`, `ExpenseRecord` (enhanced), `ExpenseCategoryMapping`
  - `src/shared/utils/imageCompressor.ts`: `compressImageFile(file: File, maxWidth?: number, maxHeight?: number, quality?: number): Promise<string>`

- [ ] **Step 1: Perluas interface `ExpenseRecord` dan buat tipe mapping kategori di `src/shared/types/index.ts`**
Tambahkan status `'ACTIVE' | 'VOID'`, `void_reason`, `voided_at`, `voided_by`, `reversal_journal_id`, `category_code`, dan `bkk_number`.

- [ ] **Step 2: Buat utilitas kompresi gambar berbasis Canvas di `src/shared/utils/imageCompressor.ts`**
Implementasikan resize gambar ke dimensi maksimal 1000px dan kompresi JPEG/WebP kualitas 0.7 agar ukuran Base64 di bawah 150KB.

- [ ] **Step 3: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS tanpa error tipe.

- [ ] **Step 4: Commit Task 1**
Run: `git add src/shared/types/index.ts src/shared/utils/imageCompressor.ts; git commit -m "feat(expenses): enhance ExpenseRecord types and add canvas image compressor utility"`

---

### Task 2: Service Akuntansi: Master Kategori COA, Jurnal Pembalik (Void Reversal), & Penomoran BKK

**Files:**
- Modify: `src/services/accountingService.ts`
- Modify: `src/shared/utils/formatters.ts`
- Modify: `src/shared/data/mockData.ts`

**Interfaces:**
- Produces:
  - `accountingService.ts`:
    - `EXPENSE_CATEGORY_CONFIG: Record<ExpenseCategory, ExpenseCategoryMapping>`
    - `generateBkkNumber(existingExpenses: ExpenseRecord[], dateStr?: string): string`
    - `generateExpenseJournal(expense: ExpenseRecord, journalCounter: number): JournalEntry`
    - `generateVoidExpenseJournal(expense: ExpenseRecord, voidReason: string, voidedBy: string, journalCounter: number): JournalEntry`

- [ ] **Step 1: Definisikan `EXPENSE_CATEGORY_CONFIG` dan fungsi generator nomor sekuensial BKK di `accountingService.ts`**
Petakan setiap `ExpenseCategory` ke kode akun COA yang valid (`6-1000` s.d. `6-1008`). Implementasikan `generateBkkNumber` berurutan per bulan.

- [ ] **Step 2: Sempurnakan `generateExpenseJournal` dan buat `generateVoidExpenseJournal` di `accountingService.ts`**
Jurnal pembalik membalik posisi: Kas/Bank di Debit (menambah kembali aset), Beban Terkait di Kredit (mengurangi beban).

- [ ] **Step 3: Sinkronkan mock data awal `INITIAL_EXPENSES` di `src/shared/data/mockData.ts`**
Lengkapi field `status: 'ACTIVE'`, `category_code`, dan nomor BKK terstandar pada data awal.

- [ ] **Step 4: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS tanpa error tipe.

- [ ] **Step 5: Commit Task 2**
Run: `git add src/services/accountingService.ts src/shared/utils/formatters.ts src/shared/data/mockData.ts; git commit -m "feat(accounting): implement dynamic category COA mapping, sequential BKK numbering, and reversal journal generation"`

---

### Task 3: Subkomponen Form Pengeluaran & Modal Detail/Zoom Bukti Nota

**Files:**
- Create: `src/modules/expenses/components/ExpenseForm.tsx`
- Create: `src/modules/expenses/components/ExpenseDetailModal.tsx`

**Interfaces:**
- Produces:
  - `ExpenseForm`: Form input lengkap dengan MoneyInput, live journal preview SAK EMKM, pemilihan sumber dana kas/bank, dan upload nota dengan kompresi otomatis.
  - `ExpenseDetailModal`: Modal detail komprehensif menampilkan informasi biaya, status badge, audit trail pembuatan/pembatalan, tautan jurnal, pratinjau zoom nota fisik, serta aksi batal/void.

- [ ] **Step 1: Buat komponen `ExpenseForm.tsx` di `src/modules/expenses/components/`**
Gunakan `compressImageFile` saat foto nota di-upload atau di-drop. Tampilkan pratinjau jurnal debit/kredit secara akurat berdasarkan `EXPENSE_CATEGORY_CONFIG`.

- [ ] **Step 2: Buat komponen `ExpenseDetailModal.tsx` di `src/modules/expenses/components/`**
Tampilkan informasi lengkap pengeluaran, preview gambar resolusi penuh dengan tombol zoom/close, dan modal konfirmasi alasan pembatalan (*void reason*).

- [ ] **Step 3: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit Task 3**
Run: `git add src/modules/expenses/components/ExpenseForm.tsx src/modules/expenses/components/ExpenseDetailModal.tsx; git commit -m "feat(expenses): add ExpenseForm and ExpenseDetailModal components"`

---

### Task 4: Subkomponen Tabel Riwayat, Analitik, & Cetak Voucher BKK

**Files:**
- Create: `src/modules/expenses/components/ExpenseTable.tsx`
- Create: `src/modules/expenses/components/ExpenseAnalyticsCard.tsx`
- Create: `src/modules/expenses/components/ExpenseVoucherModal.tsx`
- Create: `src/modules/expenses/components/index.ts`

**Interfaces:**
- Produces:
  - `ExpenseTable`: Tabel riwayat dengan *live search*, filter kategori, filter tanggal, filter sumber dana, filter status, pagination, serta ekspor CSV.
  - `ExpenseAnalyticsCard`: Widget analitik ringkasan biaya aktif, persentase kategori terbesar, dan rasio Kas Laci vs Bank.
  - `ExpenseVoucherModal`: Dialog cetak Bukti Kas Keluar (BKK) ramah printer format Thermal 80mm dan Lembar A4/A5 resmi dengan 3 kolom tanda tangan.

- [ ] **Step 1: Buat komponen `ExpenseTable.tsx`**
Implementasikan fungsi pencarian teks, filter kombinasi, pagination per 10 baris, tombol ekspor CSV, dan tombol aksi (Detail, Cetak BKK, Void).

- [ ] **Step 2: Buat komponen `ExpenseAnalyticsCard.tsx`**
Hitung pengeluaran aktif bulan berjalan, tampilkan *horizontal progress bars* per kategori biaya dan perbandingan pengeluaran Kas vs Bank.

- [ ] **Step 3: Buat komponen `ExpenseVoucherModal.tsx`**
Buat layout cetak profesional yang didesain untuk `@media print` dengan switch format: Thermal 80mm (struk kasir) vs Voucher Formal A4/A5.

- [ ] **Step 4: Buat barrel export di `src/modules/expenses/components/index.ts`**
Export `ExpenseForm`, `ExpenseTable`, `ExpenseDetailModal`, `ExpenseAnalyticsCard`, dan `ExpenseVoucherModal`.

- [ ] **Step 5: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit Task 4**
Run: `git add src/modules/expenses/components/; git commit -m "feat(expenses): add ExpenseTable, ExpenseAnalyticsCard, and ExpenseVoucherModal components"`

---

### Task 5: Integrasi ExpensesScreen & Sinkronisasi Saldo Bank pada App.tsx

**Files:**
- Modify: `src/modules/expenses/ExpensesScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: Subkomponen dari `src/modules/expenses/components/`
- Produces:
  - `ExpensesScreen`: Layar terpadu yang menghubungkan Form, Analitik, Tabel, Modal Detail, dan Modal Cetak BKK.
  - `App.tsx`: Handler `handleAddExpense` (dengan sinkronisasi saldo Bank BCA) dan handler baru `handleVoidExpense` (posting reversal journal, pembalikan saldo kas/bank).

- [ ] **Step 1: Rombak `src/modules/expenses/ExpensesScreen.tsx` menjadi koordinator modular**
Integrasikan `ExpenseAnalyticsCard`, `ExpenseForm`, `ExpenseTable`, `ExpenseDetailModal`, dan `ExpenseVoucherModal`.

- [ ] **Step 2: Perbarui handler di `src/App.tsx`**
1. Sempurnakan `handleAddExpense`: Simpan `journal_id`, potong kas laci jika tunai, dan potong `accountBalances['1-1001']` jika Bank BCA.
2. Buat `handleVoidExpense`: Tandai status biaya `'VOID'`, buat `generateVoidExpenseJournal`, kembalikan uang ke `cashInDrawer` atau `accountBalances['1-1001']`, lalu tampilkan toast sukses pembatalan.
3. Teruskan props yang dibutuhkan ke `ExpensesScreen`.

- [ ] **Step 3: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS tanpa error apapun.

- [ ] **Step 4: Commit Task 5**
Run: `git add src/modules/expenses/ExpensesScreen.tsx src/App.tsx; git commit -m "feat(expenses): integrate modular ExpensesScreen and sync bank balance and void reversal logic in App.tsx"`

---

### Task 6: Verifikasi Menyeluruh & Uji Build Produksi

**Files:**
- All modified/created files

- [ ] **Step 1: Jalankan uji build produksi Vite**
Run: `npm run build`
Expected: Build sukses tanpa error bundling, chunk output bersih di `dist/`.

- [ ] **Step 2: Jalankan simulasi fungsional di lingkungan lokal**
Pastikan input pengeluaran baru, upload nota foto, pencarian/filter, cetak BKK, dan void transaksi berfungsi secara mulus.

- [ ] **Step 3: Commit final & update walkthrough**
Run: `git status; git commit -m "chore: complete expense module overhaul and SAK EMKM integration"`
