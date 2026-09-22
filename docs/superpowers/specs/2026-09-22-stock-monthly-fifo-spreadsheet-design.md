# Spesifikasi Arsitektur: Laporan Stok Bulanan Interaktif & Buku FIFO Spreadsheet (Paritas ProjectOmahBan)

**Tanggal:** 2026-09-22  
**Status:** Draf Disetujui  
**Repositori:** `Project_SkripsiOB`  
**Referensi:** `ProjectOmahBan` (`Modules/Reports/Http/Controllers/Api/ReportStockMonthlyApiController.php`, `App/Services/Inventory/MonthlyStockLedger.php`, `resources/js/reports-v2/stock-monthly/App.vue`)

---

## 1. Latar Belakang & Tujuan

Pemilik toko (Owner) dan staf administrasi gudang di Omah Ban membutuhkan antarmuka laporan stok bulanan yang memiliki pengalaman interaktif seperti Microsoft Excel (*spreadsheet*) untuk memantau pergerakan fisik ban dan lapisan modal FIFO (*First-In, First-Out*).

Di `ProjectOmahBan`, fitur ini telah terbukti sangat efektif dalam:
1. **Transparansi Lapisan FIFO Gudang (Mode Buku):** Setiap jenis ban dipecah per lapisan harga modal unik (`batch_cost`) yang aktif, sehingga Owner dapat melihat persis berapa sisa unit ban dari pembelian harga lama vs harga baru beserta total valuasi aset HPP.
2. **Matriks Penjualan Harian (Tanggal 1–31):** Menampilkan pergerakan unit ban yang terjual per hari secara horizontal, memungkinkan identifikasi hari-hari ramai transaksi.
3. **Interaktivitas Sel Langsung (Inline Edit):** Koreksi langsung pada sel *Stok Awal* (opname fisik), koreksi *Modal Batch* (koreksi salah input faktur), serta menandai ban *Stok Lama / Promo* dengan warna font merah dan harga acuan coret (`@harga_normal`).
4. **Ekspor Paritas Excel:** Menghasilkan dokumen `.xlsx` yang format, warna, dan susunan datanya persis seperti di layar.

Tujuan dari spesifikasi ini adalah mengadopsi dan membangun subsistem tersebut ke dalam `Project_SkripsiOB` (Laravel 12 API + React 19 TypeScript Tailwind), dengan tetap menjamin integritas akuntansi SAK EMKM dan kartu stok.

---

## 2. Arsitektur Komponen

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      InventoryScreen.tsx (Sub-tab: 'buku_fifo')                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                         StockMonthlyLedgerView.tsx                              │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ 1. Header Metrik Owner: Valuasi HPP (Rp), Fisik Tersedia, Terjual, Kritis  │ │
│ │ 2. Filter Bar: Periode Bulan (YYYY-MM), Dropdown Merk, Cari Ukuran/Motif    │ │
│ │ 3. Tombol Aksi: Unduh Excel (.xlsx), + Tambah Ban Baru                      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │                  Spreadsheet Grid (Excel Look & Feel)                       │ │
│ │ ├─────────────────────────┬──────────────────┬──────────────┬─────────────┤ │ │
│ │ │ Freeze Left Columns     │ Middle Stock     │ Daily 1..31  │ Total       │ │ │
│ │ │ No | Merk/Nama | Ukuran │ Awal | Masuk |   │ Hari 1..31   │ Terjual     │ │ │
│ │ │ Ring | Modal | Harga    │ Sisa (Badge)     │ (Highlight)  │             │ │ │
│ │ └─────────────────────────┴──────────────────┴──────────────┴─────────────┤ │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────────────────────┐ │
│ │ Inline Popovers: Koreksi Stok Awal | Koreksi Modal HPP | Tag Stok Lama      │ │
│ └─────────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │ HTTP / JSON API
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                Laravel API (backend/routes/api.php: /reports/stock-monthly)     │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 1. GET /api/v1/reports/stock-monthly                                            │
│    -> ReportStockMonthlyApiController@index                                     │
│       -> MonthlyStockLedgerService@build(month, brand, branchId)                │
│          - Ambil produk ban & kelompokkan berdasar Merk/Ring/Ukuran/Motif       │
│          - Ambil baseline opname bulan berjalan / sebelumnya                    │
│          - Hitung mutasi restock masuk & penjualan harian (1..31)               │
│          - Pecah lapisan FIFO (ProductBatch & SaleBatchAllocation)              │
│          - Susun struktur rows & summary                                        │
│                                                                                 │
│ 2. POST /api/v1/reports/stock-monthly/inline-update                             │
│    -> ReportStockMonthlyApiController@inlineUpdate                              │
│       - Case opening_stock: Update stok_awal, sync batch OPNAME, log movement  │
│       - Case batch_cost: Update batch_cost, catat ProductPriceAudit            │
│       - Case is_old_stock: Update is_old_stock & reference_price               │
│                                                                                 │
│ 3. GET /api/v1/reports/stock-monthly/export                                     │
│    -> ReportStockMonthlyApiController@exportExcel                               │
│       -> Generate file .xlsx dengan format tabel buku stok                      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Spesifikasi Teknis Backend (Laravel)

### 3.1 Service: `MonthlyStockLedgerService.php`
- **Lokasi:** `backend/app/Services/Inventory/MonthlyStockLedgerService.php`
- **Metode Utama:** `public function build(string $month, ?string $brand = null, int $branchId = 1): array`
- **Alur Kalkulasi:**
  1. **Parsing Periode:** Memecah string `$month` (`YYYY-MM`) menjadi tahun `$year` dan bulan `$m`, menentukan `$startDate`, `$endDate`, dan `$daysInMonth`.
  2. **Query Produk Ban:** Mengambil model `Product` yang aktif (`deleted_at IS NULL`), mengurutkan:
     - Merk (`brand ASC`)
     - Ring numerik (`CAST(ring AS UNSIGNED) ASC`)
     - Ukuran ban (`product_size ASC`)
     - Motif / Nama produk (`motif ASC, product_name ASC`)
     - Modal ban (`product_cost ASC`)
     - Filter merk jika parameter `$brand` diberikan.
  3. **Baseline Opname & Stok Awal:**
     - Cek apakah terdapat batch `OPNAME-YYYYMM%` di tabel `product_batches` untuk bulan tersebut.
     - Jika ada, gunakan kuantitas batch opname tersebut sebagai stok awal.
     - Jika tidak ada, gunakan baseline opname bulan sebelumnya ditambah akumulasi pergerakan stok hingga awal bulan berjalan.
  4. **Pergerakan Restock Bulan Berjalan:**
     - Hitung kuantitas masuk dari tabel `stock_movements` (tipe `in`, ref `purchase` atau `adjustment`) dalam rentang tanggal awal hingga akhir bulan.
  5. **Penjualan Harian (Tanggal 1..31):**
     - Agregasi tabel `sale_details` yang di-join dengan `sales` pada bulan bersangkutan.
     - Menghasilkan matriks kuantitas terjual per `product_id` dan per hari: `$dailySales[$productId][$day] = $qty`.
  6. **Pemecahan Lapisan FIFO (`layers`):**
     - Untuk setiap produk, ambil data dari `product_batches` yang memiliki sisa kuantitas atau transaksi pada periode tersebut.
     - Kelompokkan batch berdasarkan `batch_cost` yang identik menjadi satu lapisan (*cost layer*).
     - Alokasikan kuantitas penjualan harian ke lapisan modal berdasarkan urutan konsumsi FIFO (modal terlama/termurah keluar lebih dahulu).
     - Hitung: `opening`, `restock`, `sold`, dan `remaining` untuk setiap lapisan modal.
  7. **Metrik Ringkasan (`summary`):**
     - `total_products`: Total varian ban yang dilaporkan.
     - `total_valuation_cogs`: Total nilai aset persediaan ($\sum \text{remaining} \times \text{batch\_cost}$).
     - `total_opening`: Akumulasi unit stok awal.
     - `total_restock`: Akumulasi unit masuk bulan ini.
     - `total_sold`: Akumulasi unit terjual bulan ini.
     - `total_remaining`: Akumulasi sisa unit fisik akhir bulan.
     - `empty_stock_count`: Jumlah varian dengan sisa $\le 0$.
     - `low_stock_count`: Jumlah varian dengan sisa $1\text{–}2$ pcs.

### 3.2 Controller: `ReportStockMonthlyApiController.php`
- **Lokasi:** `backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php`
- **Endpoint:**
  - `GET /api/v1/reports/stock-monthly`
    - Parameter query: `month` (opsional, default `YYYY-MM` bulan ini), `brand` (opsional).
    - Response: JSON format `{ success: true, data: { rows: [...], summary: {...}, meta: {...} } }`.
  - `POST /api/v1/reports/stock-monthly/inline-update`
    - Validasi payload:
      ```json
      {
        "product_id": 123,
        "batch_id": 45, // opsional jika koreksi modal batch
        "field": "opening_stock" | "batch_cost" | "old_stock_tag",
        "value": 15,
        "reference_price": 1250000,
        "month": "2026-09"
      }
      ```
    - Eksekusi:
      - Jika `field === 'opening_stock'`: Hitung delta $\Delta$, sesuaikan batch `OPNAME-YYYYMM`, update `product_quantity`, catat `StockMovement` (adjustment).
      - Jika `field === 'batch_cost'`: Update `batch_cost` pada batch, catat `ProductPriceAudit`.
      - Jika `field === 'old_stock_tag'`: Update `is_old_stock = (bool)$value` dan `reference_price = $referencePrice`.
  - `GET /api/v1/reports/stock-monthly/export`
    - Menghasilkan file download binary Excel (.xlsx) dengan PhpSpreadsheet.

---

## 4. Spesifikasi Teknis Frontend (React + TypeScript)

### 4.1 Navigasi di `InventoryScreen.tsx`
- Menambahkan tipe sub-view:
  `export type InventorySubView = 'katalog' | 'buku_fifo' | 'kategori' | 'jasa' | 'stok_mutasi' | 'supplier';`
- Menambahkan tombol tab navigasi berikon `FileSpreadsheet` / `Layers`: **Buku Stok FIFO**.

### 4.2 Komponen: `StockMonthlyLedgerView.tsx`
- **Lokasi:** `src/modules/inventory/components/StockMonthlyLedgerView.tsx`
- **State Management:**
  - `selectedMonth`: string (`YYYY-MM`), default bulan saat ini.
  - `selectedBrand`: string (`'ALL'` atau nama merk).
  - `searchQuery`: string (pencarian nama motif/ukuran).
  - `loading`: boolean.
  - `rows`: array baris data buku stok.
  - `summary`: objek ringkasan finansial dan stok.
  - `activeEditCell`: objek pelacak sel yang sedang diedit inline `{ rowId, field, initialValue }`.
- **Fitur Spreadsheet:**
  1. **Sticky Header & Frozen Left Columns:**
     - Kolom `No`, `Merk & Nama`, `Ukuran`, `Ring`, `Modal`, `Harga Jual` tetap terlihat saat scroll horizontal.
  2. **Penyorotan Khusus:**
     - Produk dengan `is_old_stock: true` ditampilkan dengan teks merah tebal dan badge harga acuan coret `@formatRupiah(reference_price)`.
     - Kuantitas terjual harian $> 0$ disorot dengan latar hijau emerald muda (`bg-emerald-100 text-emerald-800 font-bold`).
     - Badge sisa stok: Hijau jika $>2$, Kuning jika $1\text{–}2$, Merah jika $\le 0$.
  3. **Inline Edit Popover:**
     - Klik pada sel **Awal**: Input angka baru, tombol Simpan & Batal.
     - Klik pada sel **Modal**: Input nominal baru, tombol Simpan & Batal.
     - Klik ikon tag pada **Nama Ban**: Dialog mini untuk toggle stok lama & nominal harga coret acuan.
  4. **Client-Side Fallback Engine (`calculateClientStockLedger`):**
     - Jika pemanggilan API gagal atau aplikasi berjalan dalam mode demo/standalone, modul otomatis menghitung matriks buku stok dari prop `products`, `transactions`, dan `mutations` sehingga tabel langsung tampil tanpa hambatan.

---

## 5. Rencana Pengujian & Verifikasi

1. **Backend Unit & Feature Test:**
   - `tests/Feature/ReportStockMonthlyApiTest.php`:
     - Test pemanggilan `GET /api/v1/reports/stock-monthly` mengembalikan struktur matriks harian 1–31 dan lapisan FIFO dengan tepat.
     - Test `POST /api/v1/reports/stock-monthly/inline-update` berhasil mengoreksi stok awal dan modal batch beserta audit trail.
2. **Frontend Component & Ledger Test:**
   - `src/modules/inventory/__tests__/stockMonthlyLedger.test.ts`:
     - Test fungsi komputasi ledger lokal menghasilkan kuantitas harian dan lapisan modal yang akurat.
3. **Verifikasi Visual & UX:**
   - Uji scrolling horizontal tanggal 1–31 dengan kolom identitas ban terkunci (*freeze*).
   - Uji interaktivitas klik sel untuk koreksi stok dan modal.
   - Uji unduh file Excel (.xlsx).

---

Dokumen ini menjadi acuan tunggal dalam pembuatan implementation plan dan eksekusi kode.
