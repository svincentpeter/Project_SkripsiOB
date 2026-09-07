# Omah Ban POS & Sistem Informasi Akuntansi (SIA) Cabang 3 — Project_SkripsiOB

<div align="center">

![Project Banner](https://img.shields.io/badge/Standar-SAK_EMKM-blue.svg?style=for-the-badge)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**Sistem Point of Sale (POS) & Sistem Informasi Akuntansi (SIA) Terintegrasi Berstandar SAK EMKM**  
*Studi Kasus: Toko Ban & Bengkel Spooring Omah Ban Cabang 3 (OB3)*

</div>

---

## 📌 1. Latar Belakang & Konteks Skripsi

Proyek **`Project_SkripsiOB`** ini dikembangkan sebagai karya Tugas Akhir / Skripsi untuk **Program Ganda (Double Degree): Akuntansi & Sistem Informasi**.

Sistem ini memadukan kecepatan operasional kasir toko ban (*Point of Sale*) dengan keandalan **Sistem Informasi Akuntansi (SIA)**. Seluruh kejadian transaksi bisnis (penjualan kasir, penerimaan stok ban masuk, pengeluaran kas operasional bengkel, pelunasan hutang supplier, dan penyesuaian akhir periode) mengalir secara otomatis (*seamless data flow*) ke dalam siklus akuntansi (*accounting cycle*) berbasis pencatatan berpasangan (*double-entry bookkeeping*) sesuai standar **SAK EMKM** (Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah).

---

## ✨ 2. Fitur-Fitur Utama

### 🛒 A. Modul Operasional Kasir (Point of Sale)
- **Kiosk POS Touchscreen Meja Kasir:** Antarmuka layar sentuh responsif dengan pemfilteran ukuran ban, ring (R13 - R18+), dan merek ternama (Bridgestone, Dunlop, Accelera, Forceum, Hankook).
- **Kalkulasi Otomatis Diskon & Pajak (PPN 11%):** Penghitungan subtotal kotor, potongan harga promosi, dan grand total.
- **Dukungan Multi-Metode Pembayaran:** Tunai (dengan kalkulasi uang diterima dan kembalian), Transfer Bank BCA, QRIS, serta Kartu Debit/Kredit EDC.
- **Pencatatan Identitas Pelanggan & Kendaraan:** Input nama konsumen walk-in dan nomor plat kendaraan untuk pencetakan nota dinas bengkel.
- **Cetak Struk Thermal 80mm:** Pratinjau struk thermal realistis dengan gerigi kertas potong dan tombol cetak struk kasir (*Print to POS printer*).

### 📦 B. Manajemen Inventori & Metode Biaya FIFO (*First-In, First-Out*)
- **Lapisan Batch Pembelian (*FIFO Cost Layering*):** Menjamin setiap ban yang terjual memotong HPP dari batch kedatangan tertua terlebih dahulu.
- **Penerimaan Barang (*Goods Receipt / Restock*):** Form penerimaan stok ban baru dari distributor resmi lengkap dengan pilihan syarat bayar:
  - **Tempo / Kredit:** Otomatis mencatat hutang dagang supplier dan tanggal jatuh tempo.
  - **Tunai Kas Laci:** Otomatis memotong saldo kas fisik laci kasir.
  - **Transfer Bank BCA:** Otomatis memotong saldo rekening operasional toko.
- **Kartu Stok Mutasi (*Stock Movement Card*):** Riwayat mutasi masuk, keluar, dan penyesuaian stok dengan saldo berjalan (*running balance*).
- **Stock Opname Fisik vs Sistem:** Rekonsiliasi fisik gudang dan pembentukan mutasi koreksi penyesuaian stok.

### 💰 C. Beban Operasional & Kas Kecil (*Expenses*)
- Pencatatan biaya operasional toko ban (Gaji montir, Listrik & Air PLN/PDAM, Sewa Ruko, Ongkos Angkut Ban, ATK/Perlengkapan Bengkel, Kalibrasi Mesin Spooring 3D, Konsumsi Lembur, dan Retribusi Daerah).
- Pemilihan sumber pengeluaran: **Kas Tunai Laci Kasir** atau **Rekening Bank BCA**.
- Otomatis membentuk ayat jurnal beban berpasangan (*Auto-Journaling*).

---

### 📊 D. Modul Akuntansi SAK EMKM Lengkap (Accounting Hub)

Modul akuntansi tersaji dalam **5 Tab Terpadu**:

1. **Jurnal Umum & Penyesuaian (*General Journal*):**
   - Riwayat seluruh jurnal transaksi secara kronologis (`SALE`, `PURCHASE`, `EXPENSE`, `DEBT_PAYMENT`, `ADJUSTMENT`).
   - Modal **Input Jurnal Penyesuaian / Memorial Manual** (misal: Beban penyusutan mesin spooring bulanan) dengan validasi ketat $\sum \text{Debit} = \sum \text{Kredit}$.
2. **Buku Besar (*General Ledger* per Akun COA):**
   - Pemilih 21 akun COA SAK EMKM.
   - Kartu metrik: Saldo Awal, Total Mutasi Debit, Total Mutasi Kredit, dan **Saldo Akhir Berjalan**.
   - Tabel mutasi detail lengkap dengan kolom **Saldo Berjalan (*Running Balance*)**.
3. **Neraca Saldo (*Trial Balance*):**
   - Tabel kompilasi saldo akhir seluruh akun COA.
   - Banner status keseimbangan otomatis (*Balanced Indicator*) yang membuktikan tidak ada selisih sebelum penyusunan laporan keuangan.
4. **Buku Pembantu Hutang (*Accounts Payable Sub-Ledger*):**
   - Daftar tagihan faktur tempo dari distributor ban (PT Bridgestone Tire Indonesia, PT Elangperdana Tyre Industry, PT Sumi Rubber Indonesia).
   - Fitur **"Bayar Hutang Supplier"**: Modal pelunasan via Kas atau Bank BCA yang langsung memotong hutang dan mencatat jurnal pelunasan secara otomatis.
5. **Laporan Keuangan Standar SAK EMKM (100% Dinamis):**
   - **Laporan Laba Rugi:** Omzet Kotor $\rightarrow$ Diskon $\rightarrow$ Penjualan Bersih $\rightarrow$ HPP FIFO $\rightarrow$ Laba Bruto $\rightarrow$ Rincian Beban Operasional Usaha $\rightarrow$ Laba Neto Periode Berjalan.
   - **Laporan Posisi Keuangan (Neraca):** 100% dinamis terhitung dari Buku Besar: Total Aset Lancar + Nilai Buku Aset Tetap = Total Liabilitas + Total Ekuitas (Seimbang $\Delta = 0$).
   - **Catatan Atas Laporan Keuangan (CALK):** Penjelasan kebijakan akuntansi SAK EMKM, basis akrual, metode FIFO, dan aset tetap garis lurus.
   - Fitur Cetak Dokumen Standar A4 dan Ekspor Spreadsheet CSV/Excel.

### 📈 E. Dashboard Eksekutif Pemilik (*Owner Analytics*)
- 5 Kartu KPI utama: Total Penjualan Kotor, Laba Bersih, HPP FIFO, Kas Laci Aktif, dan Ban Terjual.
- Grafik tren 7 hari (Omzet Penjualan vs HPP).
- Donut chart pangsa penjualan merek ban.
- Tabel produk terlaris (*fast-moving*) dan peringatan stok kritis (*low stock alert*).

---

## 🗂️ 3. Bagan Akun Standar (*Chart of Accounts* - COA)

| Kode Akun | Nama Rekening Akuntansi | Klasifikasi | Saldo Normal |
| :--- | :--- | :--- | :--- |
| **1-1000** | Kas Toko Laci Kasir | Aset Lancar | DEBIT |
| **1-1001** | Bank BCA Cabang 3 | Aset Lancar | DEBIT |
| **1-1002** | Piutang Dagang (AR) | Aset Lancar | DEBIT |
| **1-2000** | Persediaan Ban Baru Cabang 3 | Aset Lancar | DEBIT |
| **1-3000** | Peralatan Bengkel & Mesin Spooring 3D | Aset Tetap | DEBIT |
| **1-3999** | Akumulasi Penyusutan Mesin Bengkel | Kontra Aset Tetap | KREDIT |
| **2-1000** | Hutang Dagang Supplier (AP) | Liabilitas Lancar | KREDIT |
| **2-1003** | PPN Keluaran (11%) | Liabilitas Lancar | KREDIT |
| **3-1000** | Modal Disetor Pemilik | Ekuitas | KREDIT |
| **3-2000** | Laba Ditahan Cabang 3 | Ekuitas | KREDIT |
| **4-1000** | Pendapatan Penjualan Ban Baru | Pendapatan Usaha | KREDIT |
| **4-9000** | Potongan Diskon Penjualan | Kontra Pendapatan | DEBIT |
| **5-1000** | Harga Pokok Penjualan (HPP) Ban Baru | Beban Pokok | DEBIT |
| **6-1000** | Beban Gaji & Uang Makan Karyawan | Beban Operasional | DEBIT |
| **6-1001** | Beban Listrik, Air & Internet | Beban Operasional | DEBIT |
| **6-1003** | Beban Sewa Bangunan Toko | Beban Operasional | DEBIT |
| **6-1004** | Beban Transportasi & Pengiriman Ban | Beban Operasional | DEBIT |
| **6-1005** | Beban Perlengkapan & ATK Toko | Beban Operasional | DEBIT |
| **6-1006** | Beban Perawatan Mesin Spooring & Balancing | Beban Operasional | DEBIT |
| **6-1007** | Beban Konsumsi & Lembur Karyawan | Beban Operasional | DEBIT |
| **6-1008** | Beban Pajak & Retribusi Daerah | Beban Operasional | DEBIT |

---

## 🏗️ 4. Struktur Direktori Proyek

```
Project_SkripsiOB/
├── database/
│   └── schema_project_skripsi_ob.sql      # Skema DDL & DML MySQL Resmi
├── docs/
│   └── superpowers/
│       ├── specs/                         # Dokumen Spesifikasi Desain Sistem
│       │   └── 2026-09-03-sistem-informasi-akuntansi-sak-emkm-design.md
│       └── plans/                         # Dokumen Rencana Implementasi Bertahap
│           └── 2026-09-03-sistem-informasi-akuntansi-sak-emkm-plan.md
├── src/
│   ├── modules/
│   │   ├── accounting/                    # Modul Pusat Akuntansi & SAK EMKM
│   │   │   ├── components/
│   │   │   │   ├── JournalTab.tsx         # Tab 1: Jurnal Umum & Filter Transaksi
│   │   │   │   ├── ManualJournalModal.tsx # Modal Input Jurnal Penyesuaian
│   │   │   │   ├── GeneralLedgerTab.tsx   # Tab 2: Buku Besar per Akun COA
│   │   │   │   ├── TrialBalanceTab.tsx    # Tab 3: Neraca Saldo (Debit = Kredit)
│   │   │   │   ├── AccountsPayableTab.tsx # Tab 4: Buku Pembantu Hutang Supplier
│   │   │   │   ├── PayDebtModal.tsx       # Modal Pelunasan Hutang Distributor
│   │   │   │   ├── SakEmkmReportTab.tsx   # Tab 5: Laporan Laba Rugi, Neraca, CALK
│   │   │   │   └── index.ts
│   │   │   ├── GeneralLedgerScreen.tsx    # Layar Utama Pusat Akuntansi (5 Tab)
│   │   │   ├── FinancialStatementsScreen.tsx
│   │   │   └── index.ts
│   │   ├── dashboard/                     # Modul Dashboard Eksekutif Owner
│   │   ├── expenses/                      # Modul Biaya Operasional Toko
│   │   ├── inventory/                     # Modul Inventori, Batch FIFO & Opname
│   │   ├── pos/                           # Modul Kiosk Kasir Point of Sale
│   │   └── receipt/                       # Modul Riwayat & Cetak Struk Thermal
│   ├── services/
│   │   ├── accountingService.ts           # Logika Ledger, Trial Balance & SAK EMKM
│   │   ├── fifoCostingService.ts          # Algoritma Alokasi Batch FIFO & HPP
│   │   ├── inventoryService.ts            # Mutasi Stok & Goods Receipt
│   │   └── posService.ts                  # Checkout Kasir & Format Nota
│   ├── shared/
│   │   ├── components/                    # HeaderNavbar, Modals, Shared UI
│   │   ├── data/mockData.ts               # Data Seed Awal (Produk, Jurnal, COA)
│   │   ├── types/index.ts                 # Definisi Tipe TypeScript
│   │   └── utils/formatters.ts            # formatRupiah, formatDateIndo, dsb.
│   ├── App.tsx                            # Root Component & Central State Store
│   ├── main.tsx                           # React Entrypoint
│   └── index.css                          # Tailwind CSS Directives
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 5. Cara Menjalankan Proyek Secara Lokal (Full-Stack)

### Prasyarat:
- **Laragon** (PHP 8.2/8.3, MySQL 8.0, Apache/Nginx)
- **Composer** (v2.4+)
- **Node.js** (Versi 18 atau yang lebih baru) & **NPM**

---

### Langkah Menjalankan:

#### A. Konfigurasi Database MySQL Laragon
1. Pastikan service **MySQL** di Laragon sudah aktif.
2. Basis data proyek ini menggunakan database **`project-skripsi_ob`**.

#### B. Menjalankan Backend Laravel REST API
1. Masuk ke direktori `backend`:
   ```bash
   cd backend
   ```
2. Jalankan migrasi dan seeder COA SAK EMKM:
   ```bash
   php artisan migrate
   php artisan db:seed --class=AccountCoaSeeder
   ```
3. Jalankan server backend:
   ```bash
   php artisan serve --port=8000
   ```
   Backend API akan melayani request di `http://127.0.0.1:8000/api/v1`.
4. Untuk menjalankan pengujian otomatis (*Unit & Feature Tests*):
   ```bash
   php artisan test
   ```

#### C. Menjalankan Frontend React 19 SPA
1. Buka terminal baru di root folder `Project_SkripsiOB`:
   ```bash
   npm install
   npm run dev
   ```
2. Buka peramban di `http://localhost:3000`. Indikator status **MySQL Live** akan menyala hijau di navbar atas saat backend Laravel aktif.
3. Pemeriksaan Linter & TypeScript:
   ```bash
   npm run lint
   ```

---

## 👨‍💻 Peneliti & Pemilik Usaha

- **Nama Peneliti / Pengembang:** Catherine Wong
- **NIM:** 23.G4.0007
- **Program Studi:** Program Studi Akuntansi, Fakultas Ekonomi dan Bisnis, Universitas Katolik Soegijapranata Semarang
- **Pemilik Usaha (Owner):** Agus Subagyo
- **Objek Penelitian:** Toko Ban dan Velg Omah Ban Cabang 3 (OB3) — Kabupaten Magelang, Jawa Tengah
- **Fokus Riset:** *Perancangan Sistem Point of Sale (POS) dan Sistem Informasi Akuntansi Berbasis Website dengan Metode Rapid Application Development pada Toko Ban dan Velg Omah Ban Cabang 3*

---

*Dikembangkan dengan dedikasi untuk keunggulan operasional Omah Ban dan integritas akademik akuntansi.*
