# Omah Ban POS & Sistem Informasi Akuntansi (SIA) Cabang 3 — Project_SkripsiOB

<div align="center">

![SAK EMKM](https://img.shields.io/badge/Standar-SAK_EMKM-blue.svg?style=for-the-badge)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Laravel](https://img.shields.io/badge/Laravel_13-FF2D20?style=for-the-badge&logo=laravel&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)

**Sistem Point of Sale (POS) & Sistem Informasi Akuntansi (SIA) Terintegrasi Berstandar SAK EMKM**
*Studi Kasus: Toko Ban & Bengkel Spooring Omah Ban Cabang 3 (OB3), Magelang*

</div>

---

## 1. Ringkasan

`Project_SkripsiOB` adalah karya Tugas Akhir / Skripsi Program Ganda (Double Degree) **Akuntansi & Sistem Informasi**.
Sistem ini menggabungkan kasir (POS) toko ban dengan Sistem Informasi Akuntansi. Setiap kejadian bisnis (penjualan,
retur, penerimaan barang, pembayaran hutang, beban, setoran kas, penyusutan, penyesuaian akhir bulan) otomatis
menghasilkan **jurnal berpasangan (double-entry) yang seimbang**, dan laporan keuangan **SAK EMKM** disusun langsung dari
jurnal tersebut. Persediaan dinilai dengan metode **FIFO**.

Prinsip penting:

- **Server adalah sumber kebenaran.** Uang, stok, akuntansi, dan nomor dokumen dihitung dan disimpan oleh backend
  Laravel (MySQL). Frontend hanya mengirim maksud transaksi dan menampilkan hasil dari server.
- **localStorage hanya untuk kenyamanan kasir:** keranjang, pesanan yang diparkir (parked orders), dan teks
  pengaturan struk/toko (plus token login).
- **Jurnal selalu seimbang.** Semua posting melalui satu mesin akuntansi yang menolak jurnal dengan Σ Debit ≠ Σ Kredit
  (tanpa toleransi), baris negatif, dan tanggal pada periode yang sudah dikunci.
- **Toko non-PKP: tidak ada PPN pada penjualan.** PPN hanya muncul di faktur supplier dan dikapitalisasi ke harga pokok
  persediaan (tidak ada akun PPN Masukan/Keluaran).
- **Supabase adalah warisan (legacy) dan tidak dipakai.** File `supabase_schema.sql`, `SUPABASE_VERCEL_SETUP.md`,
  `database/schema_project_skripsi_ob.sql`, dan service Supabase di `src/services/` tidak menjadi acuan.

---

## 2. Fitur

### A. Kasir (Point of Sale)
- Kiosk POS layar sentuh dengan filter ukuran, ring, dan merek ban; item jasa (spooring, balancing) dan input jasa manual.
- Diskon per item dan diskon nota; tanpa PPN.
- Pembayaran **Tunai, Transfer, dan QRIS**, termasuk pembayaran terpisah (split). Setiap penjualan dibayar lunas.
- **QRIS dinamis Midtrans** (sandbox secara bawaan) dengan biaya MDR dihitung server; mode simulasi untuk demo.
- Cetak struk thermal 80 mm dan nota A4; riwayat penjualan.
- **Void** penjualan (bawaan hanya OWNER) dengan jurnal pembalik yang tertaut ke jurnal penjualan.
- **Retur penjualan sebagian** dengan pengembalian uang tunai (akun 4-9100 Retur Penjualan).
- **Shift kasir:** buka shift (hitung modal awal), tutup shift (hitung laci), persetujuan OWNER dan jurnal selisih kas.
  Penjualan tunai wajib dalam shift yang terbuka. Saldo "Kas Laci" = saldo buku besar akun 1-1000.
- Setoran kas ke bank, Prive pemilik, dan setoran modal.

### B. Persediaan (FIFO)
- Master produk, kategori, merek, jasa, dan supplier.
- Lapisan batch FIFO: HPP setiap penjualan diambil dari batch tertua; nilai akun 1-2000 selalu sama dengan
  Σ(sisa qty × harga batch).
- **Penerimaan barang (GR)** secara Tunai, Transfer BCA, atau Tempo (hutang), dengan **PPN faktur dikapitalisasi** ke
  harga pokok batch.
- **Retur pembelian** ke supplier dan **pembatalan penerimaan** yang belum tersentuh.
- **Hutang dagang:** daftar faktur tempo, jatuh tempo, pembayaran sebagian/lunas via kas atau bank.
- **Stok opname** fisik vs sistem dengan jurnal selisih persediaan (5-2000).
- **Import stok dari Excel** (pratinjau, resolusi merek/nama, commit) dan kartu stok FIFO bulanan.
- Saldo awal persediaan dibukukan satu kali (`inventory:opening-balance`) dan menandai go-live; setelah itu rebuild
  stok dari Excel ditolak.

### C. Akuntansi (SAK EMKM)
- **Beban operasional (BKK / Bukti Kas Keluar)** dari kas laci atau bank, otomatis berjurnal.
- **Jurnal umum manual** dengan validasi Σ Debit = Σ Kredit, dan **jurnal pembalik (storno)**.
- **Saldo awal akun**.
- **Aset tetap & penyusutan** (register aset, penyusutan garis lurus bulanan).
- **Jurnal penyesuaian (AJP):** beban dibayar di muka dan beban yang masih harus dibayar.
- **Rekonsiliasi bank** bulanan terhadap rekening koran.
- **Tutup buku & kunci periode** (hanya OWNER yang dapat membuka kembali periode terakhir); jurnal pada periode terkunci ditolak.
- **Laporan per periode, dihitung dari jurnal:** Jurnal Umum, Buku Besar, Neraca Saldo, Laporan Laba Rugi,
  Laporan Posisi Keuangan (Neraca), Laporan Perubahan Ekuitas, Laporan Arus Kas (metode langsung), dan
  **CALK** (Catatan atas Laporan Keuangan).
- **Laporan harian:** Laporan Kas Harian, Rekap Harian, dan Rekap per Kasir.
- **Dashboard OWNER** dengan angka uang dari server.
- **Ekspor** laporan ke PDF, Excel (xlsx), Word (docx), dan CSV, dengan kop toko.

---

## 3. Peran Pengguna

Hak akses bersifat deny-by-default dan diperiksa di server untuk setiap endpoint. OWNER dapat mengubah hak akses
KASIR dan GUDANG di menu Pengaturan.

| Peran | Akses bawaan |
|---|---|
| **OWNER** | Semua fitur, termasuk void, persetujuan shift, akuntansi, laporan, dan pengaturan hak akses |
| **KASIR** | POS, riwayat nota, shift kasir, retur penjualan, laporan harian |
| **GUDANG** | Lihat & kelola persediaan, penerimaan barang, stok opname, retur pembelian |

Akun hasil seeder (login dengan email atau username `owner` / `kasir` / `gudang`):

| Email | Peran |
|---|---|
| `owner@omahban.com` | OWNER (Agus Subagyo) |
| `kasir@omahban.com` | KASIR |
| `gudang@omahban.com` | GUDANG |

Password ketiga akun adalah nilai `SEED_DEFAULT_PASSWORD` di `backend/.env` saat seeding. Ganti setelah login pertama.

---

## 4. Teknologi

| Bagian | Lokasi | Teknologi |
|---|---|---|
| Frontend (SPA) | root repo: `src/`, `index.html`, `vite.config.ts` | React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, lucide-react, Vitest |
| Backend (REST API) | `backend/` | Laravel 13, PHP 8.3, Sanctum (bearer token), MySQL 8, PHPUnit 12 |
| Ekspor | `src/shared/export/` | pdfmake, exceljs, docx, CSV |
| Pembayaran | `backend/app/Services/Payment/` | Midtrans QRIS (sandbox) |

Struktur singkat:

```
Project_SkripsiOB/
├── src/                     Frontend React
│   ├── App.tsx              shell aplikasi: state global, handler, perpindahan layar
│   ├── modules/             pos, receipt, inventory, expenses, accounting, dashboard, settings, auth
│   ├── services/api/        klien API Laravel bertipe + mapper
│   └── shared/              tipe, komponen bersama, formatter, sistem ekspor
├── backend/                 Laravel REST API (/api/v1)
│   ├── app/Services/        logika bisnis: AccountingEngine, JournalDraft, FifoCostingService,
│   │                        Pos/*, Inventory/*, Accounting/*, Reports/*, Payment/*
│   ├── database/            migrasi & seeder (COA, pengguna, hak akses, data ban)
│   ├── routes/api.php       semua endpoint
│   └── tests/               PHPUnit (Feature & Unit)
├── docs/ai/                 dokumentasi teknis terkini (mulai dari sini)
├── docs/superpowers/        spesifikasi desain & rencana implementasi per tahap
└── tests/e2e/               skrip audit Playwright (manual)
```

---

## 5. Menjalankan Secara Lokal (Windows / Laragon)

### Prasyarat
- **Laragon** dengan PHP 8.3 dan MySQL 8 (service MySQL aktif).
- **Composer 2.** Laragon menyertakan Composer di `C:\laragon\bin\composer`. Jika perintah `composer` tidak dikenal di
  terminal Anda (di luar terminal Laragon), jalankan lewat PHP: `php C:\laragon\bin\composer\composer.phar install`.
- **Node.js 22.12 atau lebih baru** (dibutuhkan oleh Vitest 5 dan concurrently 10) dan npm.

### Langkah

**1. Buat database MySQL** (HeidiSQL/phpMyAdmin dari Laragon, atau klien `mysql`). Nama memakai tanda hubung, jadi
gunakan backtick:

```sql
CREATE DATABASE `project-skripsi_ob`;
CREATE DATABASE `project-skripsi_ob_testing`;
```

**2. Pasang dependensi frontend** (di root repo):

```bash
npm install
```

**3. Siapkan backend:**

```bash
cd backend
composer install
copy .env.example .env      # Git Bash: cp .env.example .env
php artisan key:generate
```

Lalu ubah `backend/.env`. `.env.example` masih memakai `DB_CONNECTION=sqlite`, jadi ganti bagian database:

```dotenv
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=project-skripsi_ob
DB_USERNAME=root
DB_PASSWORD=

# wajib: password awal akun owner/kasir/gudang (seeder gagal bila kosong)
SEED_DEFAULT_PASSWORD=<isi sendiri>

# demo sandbox: tombol "Simulasi Bayar Lunas" dan QR cadangan QRIS
MIDTRANS_ALLOW_SIMULATION=true
```

Opsional untuk QRIS dinamis sungguhan (sandbox): `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_MERCHANT_ID`.
Tidak ada kunci bawaan; tanpa `MIDTRANS_SERVER_KEY` QRIS dinamis tidak dapat dibuat. `MIDTRANS_ALLOW_SIMULATION`
selalu mati bila `MIDTRANS_IS_PRODUCTION=true`.

**4. Migrasi, seeder, dan saldo awal persediaan:**

```bash
php artisan migrate --seed
php artisan inventory:opening-balance
```

`inventory:opening-balance` membukukan nilai FIFO stok hasil seeder ke akun 1-2000 dan menandai go-live. Jalankan
**satu kali per database**; percobaan kedua akan ditolak.

**5. Siapkan database pengujian** (sekali, dan setiap ada migrasi baru). PowerShell:

```powershell
$env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force
```

Git Bash: `DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force`.

**6. Login cepat (opsional, hanya mode dev).** Buat `.env.local` di root repo:

```dotenv
VITE_DEV_LOGIN_PASSWORD=<sama dengan SEED_DEFAULT_PASSWORD>
```

Layar login `npm run dev` lalu menampilkan kartu login cepat OWNER/KASIR/GUDANG. Jangan commit `.env.local`.

**7. Jalankan frontend + backend bersamaan** (dari root repo):

```bash
npm run dev:all
```

- Frontend: `http://localhost:3000`
- Backend API: `http://127.0.0.1:8000/api/v1` (frontend memakai alamat ini secara bawaan; ubah lewat `VITE_API_URL`)

Untuk transaksi tunai, buka shift kasir terlebih dahulu di POS.

---

## 6. Perintah

| Perintah | Lokasi | Fungsi |
|---|---|---|
| `npm run dev` | root | Frontend Vite di port 3000 |
| `npm run dev:backend` | root | `php artisan serve` di `backend/` |
| `npm run dev:all` | root | Frontend + backend bersamaan |
| `npm run lint` | root | Pemeriksaan tipe TypeScript (`tsc --noEmit`) |
| `npm test` | root | Unit test frontend (Vitest) |
| `npm run build` | root | Build produksi frontend |
| `composer test` | `backend/` | Unit & feature test backend (`config:clear` lalu `php artisan test`) |
| `php artisan test` | `backend/` | Sama, tanpa `config:clear`; filter: `--filter=PosCheckoutTest` |
| `php artisan inventory:opening-balance` | `backend/` | Saldo awal persediaan (sekali per database) |

Test backend selalu memakai database MySQL `project-skripsi_ob_testing` (diatur di `backend/phpunit.xml`), bukan
database utama.

---

## 7. Bagan Akun (COA)

COA berisi **33 akun** sesuai SAK EMKM, di-seed oleh `backend/database/seeders/AccountCoaSeeder.php` (ditambah migrasi
untuk database lama). Frontend tidak menyimpan salinan COA; daftar akun diambil dari `GET /api/v1/accounts`.

| Kelompok | Contoh akun |
|---|---|
| 1 Aset | 1-1000 Kas Laci Kasir, 1-1001 Bank BCA, 1-1100 Beban Dibayar di Muka, 1-2000 Persediaan, 1-3000 Peralatan & Mesin, 1-3999 Akumulasi Penyusutan |
| 2 Liabilitas | 2-1000 Hutang Dagang, 2-1100 Beban Yang Masih Harus Dibayar |
| 3 Ekuitas | 3-1000 Modal Disetor, 3-2000 Laba Ditahan, 3-3000 Prive |
| 4 Pendapatan | 4-1000 Penjualan Ban, 4-1001 Jasa Servis & Spooring, 4-3000 Bunga Bank, 4-9000 Diskon, 4-9100 Retur Penjualan |
| 5 HPP | 5-1000 HPP Ban, 5-2000 Selisih Persediaan |
| 6 Beban | 6-1000 s.d. 6-1012 (gaji, listrik, sewa, transportasi, ATK, perawatan mesin, MDR QRIS, selisih kas, penyusutan, administrasi bank, dll.) |

Akun 1-1002 (Piutang), 2-1004 (Uang Muka Pelanggan), dan 4-2000 (Surcharge EDC) tidak aktif sejak penjualan kredit,
DP booking, dan EDC dihapus dari POS; akun tetap ada untuk riwayat. Daftar lengkap dan aturan posting:
[docs/ai/domain-accounting.md](docs/ai/domain-accounting.md).

---

## 8. Dokumentasi

| Dokumen | Isi |
|---|---|
| [AGENTS.md](AGENTS.md) | Ringkasan proyek, aturan yang tidak boleh dilanggar, status sumber data per fitur |
| [docs/ai/architecture.md](docs/ai/architecture.md) | Arsitektur frontend, klien API, alur login, sistem ekspor |
| [docs/ai/api-reference.md](docs/ai/api-reference.md) | Daftar endpoint dan izin |
| [docs/ai/data-model.md](docs/ai/data-model.md) | Tabel, migrasi, model |
| [docs/ai/domain-accounting.md](docs/ai/domain-accounting.md) | COA, jurnal, laporan, beban, tutup buku, aset tetap, AJP, rekonsiliasi bank |
| [docs/ai/domain-pos.md](docs/ai/domain-pos.md) | Checkout, pembayaran, biaya, void, retur, QRIS |
| [docs/ai/domain-inventory.md](docs/ai/domain-inventory.md) | FIFO, penerimaan barang, hutang, retur pembelian, opname, import Excel |
| [docs/ai/workflow-and-gotchas.md](docs/ai/workflow-and-gotchas.md) | Pengujian, alur kerja, glosarium, catatan penting |
| [backend/AGENTS.md](backend/AGENTS.md) | Konvensi backend Laravel |
| [docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md](docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md) | Spesifikasi sistem & landasan akademik (diselaraskan dengan kode per 2026-10-05) |
| `docs/superpowers/specs/`, `docs/superpowers/plans/` | Spesifikasi desain dan rencana implementasi per tahap |

---

## Peneliti & Pemilik Usaha

- **Nama Peneliti / Pengembang:** Catherine Wong
- **NIM:** 23.G4.0007
- **Program Studi:** Program Studi Akuntansi, Fakultas Ekonomi dan Bisnis, Universitas Katolik Soegijapranata Semarang
- **Pemilik Usaha (Owner):** Agus Subagyo
- **Objek Penelitian:** Toko Ban dan Velg Omah Ban Cabang 3 (OB3) — Kabupaten Magelang, Jawa Tengah
- **Fokus Riset:** *Perancangan Sistem Point of Sale (POS) dan Sistem Informasi Akuntansi Berbasis Website dengan Metode Rapid Application Development pada Toko Ban dan Velg Omah Ban Cabang 3*
