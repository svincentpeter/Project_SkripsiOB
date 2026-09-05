# Spesifikasi Desain Arsitektur: Integrasi Backend Laravel REST API & Database MySQL

**Tanggal:** 2026-09-05  
**Proyek:** Omah Ban Cabang 3 (`Project_SkripsiOB`)  
**Konteks Akademik:** Tugas Akhir / Skripsi Ganda (Akuntansi & Sistem Informasi)  
**Database Target:** `project-skripsi_ob` (MySQL Laragon)  
**Status:** Validated Design Spec  

---

## 1. Ringkasan Eksekutif & Tujuan Arsitektur

Sistem POS & SIA Omah Ban Cabang 3 (`Project_SkripsiOB`) saat ini telah memiliki antarmuka pengguna (UI/UX) berbasis React 19 + TypeScript yang matang, namun pemrosesan logika bisnis akuntansi (SAK EMKM) dan persediaan (FIFO) serta penyimpanan data masih bergantung pada memori peramban (*client-side memory*) dan `localStorage`.

Untuk memenuhi kaidah akademik Tugas Akhir Program Ganda Akuntansi & Sistem Informasi, sistem ini ditransformasikan menjadi arsitektur **Decoupled Client-Server (Full-Stack)**:
1. **Backend:** Laravel 11/12 REST API yang bertindak sebagai mesin komputasi finansial, validasi data server-side, penjamin integritas transaksi ACID (`DB::transaction()`), dan penyaji data terpusat.
2. **Frontend:** React 19 + Vite SPA yang tetap dipertahankan keunggulan interaktivitasnya (kiosk POS touchscreen, pratinjau struk thermal 80mm, dynamic tabs akuntansi), namun kini mengonsumsi data via API asynchronous.
3. **Database:** MySQL 8.0 di Laragon dengan nama basis data `project-skripsi_ob`.

---

## 2. Struktur Direktori Proyek

Aplikasi Laravel ditempatkan pada subdirektori terdedikasi `backend/`:

```text
Project_SkripsiOB/
├── backend/                               # [NEW] Aplikasi Laravel REST API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/v1/       # REST API Controllers (Product, Pos, Accounting, Expense, dll.)
│   │   │   ├── Requests/                 # Form Request Validations
│   │   │   └── Resources/                # JsonResource Transformers
│   │   ├── Models/                       # 14 Eloquent Models
│   │   └── Services/                     # Core Engines
│   │       ├── FifoCostingService.php    # Algoritma Alokasi Batch FIFO & Penghitungan HPP
│   │       └── AccountingEngine.php      # Auto-Journaling Double-Entry & Laporan SAK EMKM
│   ├── config/
│   │   └── cors.php                      # Izin Origin http://localhost:3000
│   ├── database/
│   │   ├── migrations/                   # 14 Migrasi Tabel MySQL SAK EMKM + POS
│   │   └── seeders/                      # Seeder Akun COA, Master Supplier, dan Pengaturan
│   ├── routes/
│   │   └── api.php                       # Rute API versi 1: /api/v1/*
│   ├── .env                              # Koneksi DB: project-skripsi_ob
│   └── composer.json
├── database/                             # Skema SQL legacy (referensi)
├── src/                                  # Frontend React 19 SPA
│   ├── services/
│   │   ├── api/                          # [NEW] Axios / Fetch Client terstandarisasi
│   │   │   ├── apiClient.ts              # Base HTTP client with error handling & interceptors
│   │   │   ├── productApi.ts
│   │   │   ├── posApi.ts
│   │   │   ├── accountingApi.ts
│   │   │   └── expenseApi.ts
│   │   └── ... (service adapters)
│   ├── modules/                          # UI Screens & Components
│   └── App.tsx                           # Global State Provider (Updated to async API sync)
├── package.json
└── vite.config.ts
```

---

## 3. Skema Basis Data & Model Eloquent (14 Entitas)

Tabel-tabel di database `project-skripsi_ob` dipetakan ke dalam Eloquent Models dengan relasi berintegritas tinggi:

| Nama Tabel | Eloquent Model | Deskripsi & Relasi Kunci |
| :--- | :--- | :--- |
| `products` | `Product` | Master ban baru, velg, dan ban dalam. Memiliki relasi `hasMany(ProductBatch)` dan `hasMany(StockMovement)`. |
| `product_batches` | `ProductBatch` | Layer persediaan FIFO (`batch_number`, `initial_quantity`, `current_quantity`, `buy_price`, `received_date`, `status`). |
| `service_masters` | `ServiceMaster` | Master jasa bengkel (Spooring 3D, Balancing, Bongkar Pasang Ban). |
| `suppliers` | `Supplier` | Distributor resmi ban (Bridgestone, Dunlop, Accelera). Relasi ke faktur pembelian dan hutang. |
| `sales` | `Sale` | Faktur penjualan kasir (`invoice_number`, `total_amount`, `payment_method`, `cashier_name`). Relasi ke `SaleDetail` dan `JournalEntry`. |
| `sale_details` | `SaleDetail` | Item ban/jasa yang terjual pada faktur POS. |
| `sale_batch_allocations`| `SaleBatchAllocation` | Audit trail alokasi FIFO: mencatat batch mana dan harga modal berapa yang dipotong oleh item penjualan tertentu. |
| `sales_bookings` | `SalesBooking` | Pencatatan booking DP dan sisa pelunasan pelanggan. |
| `stock_movements` | `StockMovement` | Riwayat kartu stok ban masuk, keluar, dan penyesuaian opname. |
| `expense_categories` | `ExpenseCategory` | Kategori beban toko yang dipetakan ke kode COA (misal: 6-1000 Gaji, 6-1001 Listrik). |
| `expenses` | `Expense` | Transaksi beban kas keluar (`expense_number`, `bkk_number`, `amount`, `status: ACTIVE/VOID`, bukti foto). |
| `accounts` | `Account` | Bagan Akun Standar (COA SAK EMKM 21 akun: Kas, Bank, Persediaan, Hutang, Modal, HPP, Beban). |
| `journal_entries` | `JournalEntry` | Header jurnal umum (`journal_number`, `date`, `ref_doc`, `status: POSTED/VOID`). |
| `journal_items` | `JournalItem` | Baris ayat jurnal (`journal_entry_id`, `account_id`, `debit`, `credit`, `note`). |

---

## 4. Porting Logika Inti ke PHP / Laravel Services

### 4.1 FIFO Costing Engine (`App\Services\FifoCostingService.php`)
Ketika transaksi penjualan kasir (POS) terjadi:
1. Sistem mencari baris `product_batches` untuk produk terkait yang berstatus `ACTIVE` atau `PARTIAL` diurutkan dari `received_date ASC, id ASC`.
2. Sistem mengalokasikan kuantitas terjual ke batch tertua sampai kuantitas terpenuhi.
3. Menghitung total HPP riil:
   $$\text{Total HPP} = \sum (\text{Qty Alokasi}_i \times \text{Harga Beli Batch}_i)$$
4. Menyimpan rekam jejak ke tabel `sale_batch_allocations`.
5. Memperbarui `current_quantity` pada `product_batches` dan `product_quantity` pada `products`.
6. Menulis mutasi keluar pada `stock_movements`.

### 4.2 Accounting Engine SAK EMKM (`App\Services\AccountingEngine.php`)
Seluruh pencatatan akuntansi dibungkus dalam blok atomik `DB::transaction()`:
1. **Auto-Journaling Penjualan POS:**
   - [DEBIT] Kas Laci (1-1000) / Bank BCA (1-1001) / Piutang (1-1002) = Grand Total
   - [DEBIT] Potongan Diskon Penjualan (4-9000) = Nilai Diskon (jika ada)
   - [KREDIT] Pendapatan Penjualan Produk (4-1000) = Subtotal Barang
   - [KREDIT] Pendapatan Jasa Servis (4-1001) = Subtotal Jasa (jika ada)
   - [KREDIT] PPN Keluaran 11% (2-1003) = Nilai PPN (jika ada)
   - [DEBIT] Harga Pokok Penjualan FIFO (5-1000) = Nilai Total HPP FIFO
   - [KREDIT] Persediaan Ban Baru (1-2000) = Nilai Total HPP FIFO
   - **Validasi Keseimbangan:** $\sum \text{Debit} = \sum \text{Kredit}$. Jika selisih $\neq 0$, lempar `AccountingException` dan batalkan transaksi.
2. **Auto-Journaling Pengeluaran Operasional (Expense) & Void Reversal:**
   - Jurnal pengeluaran normal: [DEBIT] Beban Terkait (6-100x), [KREDIT] Kas Laci / Bank BCA.
   - Jurnal pembalik (saat VOID): [DEBIT] Kas/Bank, [KREDIT] Beban Terkait dengan referensi BKK asli.
3. **Penyusunan Laporan Keuangan Dinamis:**
   - **General Ledger (Buku Besar):** Menghitung mutasi kronologis dan *running balance* per akun.
   - **Trial Balance (Neraca Saldo):** Menjumlahkan saldo akhir seluruh COA dan memastikan $\Delta = 0$.
   - **Laporan Laba Rugi SAK EMKM:** Pendapatan Operasional - HPP FIFO - Total Beban Usaha = Laba/Rugi Neto.
   - **Laporan Posisi Keuangan (Neraca):** Total Aset = Total Liabilitas + Total Ekuitas (termasuk Laba Periode Berjalan).

---

## 5. Rute REST API (`routes/api.php`)

Format endpoint diatur di bawah prefix `/api/v1/`:

### Modul Master Data
- `GET|POST /api/v1/products`
- `GET|PUT|DELETE /api/v1/products/{id}`
- `GET|POST /api/v1/services`
- `GET|PUT|DELETE /api/v1/services/{id}`
- `GET|POST /api/v1/suppliers`
- `GET|PUT|DELETE /api/v1/suppliers/{id}`
- `GET /api/v1/accounts` (Chart of Accounts)

### Modul POS & Transaksi
- `POST /api/v1/pos/checkout` (Atomic: Sale + FIFO Costing + Auto-Journaling)
- `GET /api/v1/pos/transactions`
- `GET /api/v1/pos/transactions/{id}`
- `POST /api/v1/bookings` (Pencatatan DP)

### Modul Inventori & Pembelian
- `POST /api/v1/inventory/restock` (Goods Receipt: Batch baru + Hutang/Kas + Jurnal Pembelian)
- `GET /api/v1/inventory/stock-movements`
- `POST /api/v1/inventory/stock-opname`

### Modul Pengeluaran (Expenses)
- `GET /api/v1/expenses` (Search, Filter, Pagination)
- `POST /api/v1/expenses` (Buat BKK + Jurnal Beban)
- `POST /api/v1/expenses/{id}/void` (Void BKK + Jurnal Pembalik)

### Modul Akuntansi & Laporan SAK EMKM
- `GET /api/v1/accounting/journals` (Jurnal Umum kronologis)
- `POST /api/v1/accounting/journals/manual` (Jurnal Penyesuaian Manual)
- `GET /api/v1/accounting/general-ledger` (Buku besar per akun)
- `GET /api/v1/accounting/trial-balance` (Neraca Saldo)
- `GET /api/v1/accounting/accounts-payable` (Buku Pembantu Hutang)
- `POST /api/v1/accounting/accounts-payable/pay` (Pelunasan Hutang Supplier)
- `GET /api/v1/accounting/financial-statements` (Laba Rugi, Posisi Keuangan, CALK)

---

## 6. Integrasi Frontend (React 19)

1. **HTTP Client (`src/services/api/apiClient.ts`):** Menggunakan native `fetch` yang terbungkus rapi atau `axios` dengan base URL `http://127.0.0.1:8000/api/v1`.
2. **Graceful Fallback:** Frontend dirancang agar jika server backend offline, sistem memberikan status konektivitas jelas kepada pengguna dan dapat mempertahankan data lokal sementara.
3. **Sinkronisasi Asynchronous:** State di [App.tsx](file:///c:/laragon/www/Project_SkripsiOB/src/App.tsx) memuat data awal dari backend saat aplikasi pertama kali dimuat (`useEffect`), dan melakukan update state via API call setiap ada aksi (Checkout, Tambah Produk, Input Biaya).

---

## 7. Strategi Verifikasi & Pengujian

1. **Pengujian Unit Backend (PHPUnit / Pest):**
   - Uji alokasi batch FIFO (pemotongan stok dari batch terlama).
   - Uji keseimbangan jurnal akuntansi ($\sum \text{Debit} = \sum \text{Kredit}$).
   - Uji rollback transaksi bila ada kegagalan input.
2. **Pengujian Integrasi API (HTTP Feature Tests):**
   - Pengujian request/response JSON untuk seluruh rute `/api/v1/*`.
3. **Pengujian End-to-End di Antarmuka Browser:**
   - Checkout kasir kas tunai dan verifikasi saldo kas laci, kartu stok, serta jurnal umum bertambah.
   - Buka Buku Besar dan Neraca Saldo di tab Akuntansi untuk memverifikasi keseimbangan.
