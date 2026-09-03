# Sistem Informasi Akuntansi (SIA) SAK EMKM Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun Sistem Informasi Akuntansi (SIA) berstandar SAK EMKM yang utuh pada Omah Ban Cabang 3 dengan 5 subsistem terintegrasi: Jurnal Umum & Penyesuaian, Buku Besar per Akun dengan Saldo Berjalan, Neraca Saldo, Buku Pembantu Hutang Distributor, dan Laporan Keuangan Dinamis.

**Architecture:** Menerapkan siklus akuntansi (*accounting cycle*) terintegrasi di mana seluruh transaksi operasional (kasir POS, penerimaan barang ban tempo/tunai, pengeluaran beban toko, pelunasan hutang, dan penyesuaian manual) secara otomatis menghasilkan ayat jurnal berpasangan (*double-entry*), diagregasikan ke dalam Buku Besar (*General Ledger*) per akun COA, divalidasi pada Neraca Saldo (*Trial Balance*), dan disajikan menjadi Laporan Keuangan SAK EMKM 100% dinamis.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, LocalStorage Persistent Store.

**Spec:** `docs/superpowers/specs/2026-09-03-sistem-informasi-akuntansi-sak-emkm-design.md`

## Global Constraints
- Standar akuntansi: SAK EMKM (Entitas Mikro, Kecil, dan Menengah).
- Prinsip pencatatan: Berpasangan (*Double-Entry Bookkeeping: Total Debit = Total Kredit*).
- Metode biaya persediaan: FIFO (*First-In, First-Out*).
- Tidak ada nilai hardcode pada Laporan Keuangan (semua ditarik dari Buku Besar).
- Semua perhitungan moneter dalam Rupiah (IDR) tanpa desimal.

---

### Task 1: Ekstensi Model Tipe Akuntansi & Faktur Hutang

**Files:**
- Modify: `src/shared/types/index.ts`

**Interfaces:**
- Consumes: `JournalEntry`, `JournalLine`, `PosTransaction`, `ExpenseRecord`
- Produces: `PayableInvoice`, `DebtPaymentInput`, `ManualJournalInput`, `AccountBalance`, `TrialBalanceRow`, `LedgerAccountSummary`, `GoodsReceiptInputExtended`

- [ ] **Step 1: Definisikan tipe untuk Buku Pembantu Hutang dan Jurnal Manual**
Tambahkan interface `PayableInvoice`, `DebtPaymentInput`, dan `ManualJournalInput` pada `src/shared/types/index.ts`.

- [ ] **Step 2: Tambahkan opsi syarat pembayaran pada GoodsReceiptInput**
Perbarui `GoodsReceiptInput` dengan menambahkan field `payment_terms: 'TUNAI_KAS' | 'TUNAI_BANK' | 'TEMPO_HUTANG'`, `distributor_name: string`, dan `due_date?: string`.

- [ ] **Step 3: Definisikan tipe untuk Buku Besar dan Neraca Saldo**
Tambahkan `LedgerAccountEntry`, `TrialBalanceRow`, dan `SakEmkmStatementsResult`.

- [ ] **Step 4: Jalankan verifikasi TypeScript**
Run: `npm run lint` (tsc --noEmit)
Expected: PASS tanpa error tipe baru.

---

### Task 2: Implementasi Layanan Bisnis Inti Akuntansi (`accountingService.ts`)

**Files:**
- Modify: `src/services/accountingService.ts`

**Interfaces:**
- Consumes: `JournalEntry`, `PayableInvoice`, `DebtPaymentInput`, `GoodsReceiptInput`
- Produces: 
  - `generatePurchaseJournal(receipt, totalCost, journalCounter): JournalEntry`
  - `generateDebtPaymentJournal(payment, invoice, journalCounter): JournalEntry`
  - `generateManualJournal(input, journalCounter): JournalEntry`
  - `calculateAccountLedger(journals, accountCode, initialBalance): LedgerAccountSummary`
  - `calculateTrialBalance(journals, initialBalances): { rows, totalDebit, totalCredit, isBalanced }`
  - `calculateDynamicSakEmkmFinancials(journals, initialBalances, products): SakEmkmStatementsResult`

- [ ] **Step 1: Implementasi fungsi auto-journaling Pembelian Ban (`generatePurchaseJournal`)**
Mencatat Dr. Persediaan Ban Baru Cabang 3 (`1-2000`) dan Cr. Kas Toko (`1-1000`) / Bank BCA (`1-1001`) / Hutang Dagang Supplier (`2-1000`).

- [ ] **Step 2: Implementasi fungsi auto-journaling Pelunasan Hutang (`generateDebtPaymentJournal`)**
Mencatat Dr. Hutang Dagang Supplier (`2-1000`) dan Cr. Kas Toko (`1-1000`) atau Bank BCA (`1-1001`).

- [ ] **Step 3: Implementasi fungsi validasi & pembuatan Jurnal Penyesuaian Manual (`generateManualJournal`)**
Memvalidasi Total Debit == Total Kredit sebelum menghasilkan objek `JournalEntry`.

- [ ] **Step 4: Implementasi kalkulator Buku Besar (`calculateAccountLedger`)**
Menghitung saldo awal, menyaring mutasi per kode akun, mengurutkan kronologis, dan menghitung kolom saldo berjalan (*running balance*).

- [ ] **Step 5: Implementasi kalkulator Neraca Saldo (`calculateTrialBalance`)**
Menghitung saldo akhir setiap akun COA, memetakan ke posisi Debit atau Kredit sesuai saldo normal, dan memastikan keseimbangan Debit == Kredit.

- [ ] **Step 6: Refaktor `calculateSakEmkmFinancials` menjadi 100% dinamis dari Buku Besar**
Gantikan seluruh angka hardcoded (Aset Tetap, Akumulasi Penyusutan, Hutang Distributor, Modal, dsb.) dengan agregasi saldo riil buku besar.

- [ ] **Step 7: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS.

---

### Task 3: Pemutakhiran Seed Data & Saldo Awal (`mockData.ts`)

**Files:**
- Modify: `src/shared/data/mockData.ts`

**Interfaces:**
- Consumes: Tipe baru dari Task 1
- Produces: `INITIAL_PAYABLE_INVOICES`, `INITIAL_ACCOUNT_BALANCES`, dan penambahan jurnal historis (modal awal, aset tetap, dan pembelian ban tempo).

- [ ] **Step 1: Siapkan `INITIAL_PAYABLE_INVOICES`**
Faktur hutang tempo PT Bridgestone Tire Indonesia (Rp 9.500.000) dan PT Elangperdana Tyre Industry (Rp 5.900.000) sehingga total hutang Rp 15.400.000 sinkron dengan akun `2-1000`.

- [ ] **Step 2: Siapkan `INITIAL_ACCOUNT_BALANCES`**
Saldo awal: Kas Laci Rp 2.450.000, Bank BCA Rp 35.000.000, Peralatan Mesin Spooring 3D Rp 145.000.000, Kompresor Rp 18.000.000, Akumulasi Penyusutan -Rp 14.000.000, Hutang Dagang Rp 15.400.000, Modal Pemilik Rp 150.000.000, Laba Ditahan Rp 36.050.000.

- [ ] **Step 3: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS.

---

### Task 4: Pembuatan Komponen Tab Akuntansi Mandiri

**Files:**
- Create: `src/modules/accounting/components/JournalTab.tsx`
- Create: `src/modules/accounting/components/ManualJournalModal.tsx`
- Create: `src/modules/accounting/components/GeneralLedgerTab.tsx`
- Create: `src/modules/accounting/components/TrialBalanceTab.tsx`
- Create: `src/modules/accounting/components/AccountsPayableTab.tsx`
- Create: `src/modules/accounting/components/PayDebtModal.tsx`
- Create: `src/modules/accounting/components/SakEmkmReportTab.tsx`
- Modify: `src/modules/accounting/components/index.ts`

**Interfaces:**
- Consumes: Fungsi dari `accountingService.ts`, tipe dari `types/index.ts`
- Produces: Komponen presentasional dan interaktif untuk tiap tab akuntansi

- [ ] **Step 1: Buat `ManualJournalModal.tsx`**
Form input tanggal, nomor ref, keterangan, baris debit & kredit dinamis dengan indikator selisih real-time dan validasi simpan.

- [ ] **Step 2: Buat `JournalTab.tsx`**
Tabel kronologis jurnal, pencarian, filter kategori dokumen, dan tombol pemicu modal jurnal penyesuaian.

- [ ] **Step 3: Buat `GeneralLedgerTab.tsx`**
Selector COA (dengan badge tipe akun), kartu metrik (Saldo Awal, Total Debit, Total Kredit, Saldo Akhir), dan tabel mutasi dengan kolom saldo berjalan (*running balance*).

- [ ] **Step 4: Buat `TrialBalanceTab.tsx`**
Tabel Neraca Saldo seluruh akun COA, rekap total debit vs kredit, dan banner konfirmasi keseimbangan akuntansi.

- [ ] **Step 5: Buat `PayDebtModal.tsx` & `AccountsPayableTab.tsx`**
Daftar invoice distributor dengan status (Belum Lunas/Lunas), progress pembayaran, dan modal pelunasan dengan pilihan kas/bank.

- [ ] **Step 6: Buat `SakEmkmReportTab.tsx`**
Laporan Laba Rugi formal SAK EMKM, Laporan Posisi Keuangan (Neraca) dinamis, dan Catatan Atas Laporan Keuangan (CALK), dilengkapi tombol cetak A4 dan ekspor CSV.

- [ ] **Step 7: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS.

---

### Task 5: Integrasi Pusat Akuntansi (*Unified Accounting Hub Screen*)

**Files:**
- Modify: `src/modules/accounting/GeneralLedgerScreen.tsx` (atau dijadikan `AccountingHubScreen.tsx`)
- Modify: `src/modules/accounting/FinancialStatementsScreen.tsx`
- Modify: `src/modules/accounting/index.ts`

**Interfaces:**
- Consumes: Seluruh komponen tab dari Task 4
- Produces: Layar akuntansi terpadu 5 tab: Jurnal Umum, Buku Besar, Neraca Saldo, Pembantu Hutang, dan Laporan SAK EMKM.

- [ ] **Step 1: Restrukturisasi `GeneralLedgerScreen.tsx` menjadi layar dengan 5 tab interaktif**
Sediakan navigasi sub-tab: `['journals', 'ledger', 'trial-balance', 'payables', 'reports']`.

- [ ] **Step 2: Integrasikan Laporan Keuangan ke tab ke-5**
Menghubungkan `FinancialStatementsScreen` agar terintegrasi mulus atau bisa diakses langsung via tab navigasi.

- [ ] **Step 3: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS.

---

### Task 6: Integrasi Alur Goods Receipt & Pelunasan Hutang di `App.tsx` & `InventoryScreen`

**Files:**
- Modify: `src/modules/inventory/components/GoodsReceiptModal.tsx`
- Modify: `src/modules/inventory/InventoryScreen.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `generatePurchaseJournal`, `generateDebtPaymentJournal`, `generateManualJournal`
- Produces: Sinkronisasi real-time antara penerimaan barang, hutang distributor, jurnal umum, buku besar, dan laporan keuangan.

- [ ] **Step 1: Perbarui form `GoodsReceiptModal.tsx`**
Tambahkan pilihan metode bayar pembelian ban: `Tunai (Kas Laci)`, `Transfer (Bank BCA)`, atau `Tempo (Hutang Distributor)` dengan tanggal jatuh tempo.

- [ ] **Step 2: Tambahkan state `payableInvoices` dan handler di `App.tsx`**
  - Simpan `payableInvoices` di LocalStorage.
  - Pada `handleGoodsReceipt`: jika tempo, tambahkan faktur ke `payableInvoices` dan panggil `generatePurchaseJournal(..., isCredit=true)`. Jika tunai, potong kas/bank dan panggil `generatePurchaseJournal(..., isCredit=false)`.
  - Tambahkan `handlePayDebt(paymentInput)`: buat jurnal pelunasan, potong kas/bank, update sisa hutang di `payableInvoices`.
  - Tambahkan `handleAddManualJournal(journalInput)`: masukkan jurnal memorial penyesuaian ke daftar `journals`.

- [ ] **Step 3: Hubungkan handler ke komponen layar di `App.tsx`**
Pass props baru ke `InventoryScreen` dan layar Akuntansi.

- [ ] **Step 4: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS tanpa error atau warning.

---

### Task 7: Verifikasi Menyeluruh (*End-to-End Testing*) & Audit Trail

**Files:**
- Test manual & build check

- [ ] **Step 1: Jalankan validasi build aplikasi**
Run: `npm run build`
Expected: Build sukses tanpa kesalahan bundle atau type error.

- [ ] **Step 2: Verifikasi Siklus Kasir POS -> Jurnal -> Buku Besar -> Laporan Laba Rugi**
Simulasikan 1 transaksi kasir penjualan ban -> cek Jurnal Penjualan terbentuk -> cek Buku Besar Penjualan dan Kas bertambah -> cek Laba Rugi terupdate.

- [ ] **Step 3: Verifikasi Siklus Pembelian Ban Tempo -> Hutang -> Pelunasan -> Neraca Seimbang**
Simulasikan penerimaan stok ban tempo dari PT Bridgestone -> cek Jurnal Pembelian terbentuk -> cek Buku Pembantu Hutang mencatat invoice baru -> lakukan pembayaran hutang lewat Bank BCA -> cek Jurnal Pelunasan -> pastikan Neraca Saldo dan Laporan Posisi Keuangan seimbang (Aset = Liabilitas + Ekuitas).

- [ ] **Step 4: Verifikasi Jurnal Penyesuaian Penyusutan Mesin**
Input jurnal memorial beban penyusutan mesin -> pastikan terposting ke buku besar, beban di Laba Rugi bertambah, akumulasi penyusutan di Neraca bertambah, dan Neraca tetap seimbang dengan selisih 0.
