# Spesifikasi Desain: Modul Inventori & Master Stok Ban Cabang 3
**Topik:** CRUD Lengkap, Autonumeric Engine, Multi-Layer FIFO Batch, Penerimaan Barang (Restock), dan Opname Fisik  
**Tanggal:** 2026-09-03  
**Status:** Disetujui (Ready for Implementation Plan)

---

## 1. Pendahuluan & Tujuan
Dokumen ini menetapkan spesifikasi desain teknis dan fungsional untuk **Modul Inventori & Master Stok Ban** pada sistem POS & SAK EMKM Bengkel **Omah Ban Cabang 3 (OB3)**. 

Modul ini bertanggung jawab atas integritas pencatatan fisik ban baru, pelacakan mutasi kartu stok per dokumen (*running balance*), valuasi persediaan metode FIFO (*First-In, First-Out*), otomatisasi penomoran dokumen (*autonumeric*), alur penerimaan barang masuk (*Goods Receipt*), serta berita acara penyesuaian *stock opname*.

---

## 2. Batasan Sistem & Aturan Bisnis (*Business Rules*)
1. **Fokus Produk Ban Baru:** Sesuai karakteristik Cabang 3, seluruh produk ban berstatus kondisi `'BARU'`.
2. **Kesesuaian FIFO Batch:** Setiap unit ban yang tercatat dalam persediaan harus terhubung dengan lapisan batch pembelian (*cost layer*). Penjualan di kasir (POS) mengonsumsi batch terlama terlebih dahulu.
3. **Dual-Path Penambahan Produk:**
   - Menambah produk ban baru dapat menyertakan *stok awal fisik* (otomatis menciptakan Batch #1 dan mutasi `'MASUK'` dengan dokumen `'INIT-STOCK-OB3-...'`), ATAU berstok awal 0.
4. **Penerimaan Barang (*Goods Receipt / Restock*):**
   - Setiap restock barang dari supplier menerbitkan nomor bukti dokumen resmi `'GRN-OB3-YYYYMMDD-XXXX'`, menambah lapisan `'ProductBatch'` baru, memperbarui total stok produk, dan mencatat mutasi kartu stok `'MASUK'`.
5. **Kebijakan Penghapusan (*Soft-Delete Protection*):**
   - Produk yang telah memiliki riwayat transaksi penjualan atau mutasi stok **tidak boleh dihapus permanen** demi menjaga integritas laporan laba rugi, neraca saldo, dan kartu stok. Produk tersebut dialihkan statusnya menjadi nonaktif (`is_active: false`).
   - Hard-delete hanya diperkenankan untuk produk yang belum pernah bertransaksi dan memiliki saldo stok 0.
6. **Integritas Penyesuaian Opname:**
   - Hasil hitung fisik yang berselisih dengan stok sistem akan memicu mutasi bertipe `'PENYESUAIAN'`, mencatat selisih kuantitas (+ atau -) dan selisih nilai rupiah HPP, serta menyelaraskan sisa unit batch aktif.

---

## 3. Spesifikasi Sistem Autonumeric (*Smart Semantic Engine*)
Sistem penomoran otomatis dirancang cerdas agar langsung merefleksikan identitas entitas dan tanggal transaksi tanpa redundansi:

| Entitas Dokumen | Pola / Format Autonumeric | Contoh Output | Keterangan |
|---|---|---|---|
| **SKU Produk Ban** | `[BRAND]-[WIDTH][RATIO][RING]-[MOTIF_3]` | `BRI-1856515-TUR` | Menghasilkan kode ringkas dari merek, spesifikasi ukuran, dan seri motif ban |
| **Barcode EAN-13** | `899` + `300` + `XXXXXX` + `C` | `8993001018515` | Standar GS1 Indonesia (899), kode outlet OB3 (300), urutan acak/counter, dan cek digit |
| **Penerimaan Barang (GRN)** | `GRN-OB3-YYYYMMDD-XXXX` | `GRN-OB3-20260903-0001` | Nomor Goods Receipt Note harian Cabang 3 |
| **Kode Batch FIFO** | `BATCH-YYYYMMDD-XXX` | `BATCH-20260903-01` | Penanda unik lapisan pembelian barang per tanggal |
| **ID / Ref Mutasi Stok** | `MUT-YYYYMMDD-XXXX` | `MUT-20260903-0015` | Nomor referensi kartu mutasi persediaan |
| **Berita Acara Opname** | `OPNAME-OB3-YYYYMM-XXXX` | `OPNAME-OB3-202609-0001` | Nomor dokumen opname bulanan |

---

## 4. Lapisan Bisnis Logika (`src/services/inventoryService.ts`)
Fungsi-fungsi utama yang disediakan pada lapisan service:

1. `generateProductSku(brand, width, ratio, ring, motif)`: String
2. `generateBarcodeEan13(existingBarcodes)`: String (EAN-13 valid & unik)
3. `generateGrnNumber(existingMutations)`: String
4. `generateBatchCode(existingBatches)`: String
5. `generateMutationId()`: String
6. `generateOpnameDocNumber(existingMutations)`: String
7. `createProductWithInitialStock(input: CreateProductInput)`:
   - Membuat objek `TireProduct`.
   - Mengalokasikan batch FIFO awal jika `initialStock > 0`.
   - Menghasilkan mutasi stok `MASUK`.
8. `processGoodsReceipt(input: GoodsReceiptInput)`:
   - Validasi input (qty > 0, unitCost > 0, supplier valid).
   - Menambahkan objek `ProductBatch` ke dalam `product.batches`.
   - Menghitung mutasi `MASUK` dengan saldo berjalan (*running balance*).
9. `updateProductMaster(productId, updateData)`:
   - Memperbarui atribut nama, ukuran, harga jual, alert stok, dll.
10. `toggleProductActiveStatus(productId, isActive)`:
    - Mengaktifkan / menonaktifkan visibilitas produk di katalog POS & inventori.
11. `deleteProductSafe(productId, products, mutations, transactions)`:
    - Memeriksa keterkaitan data; mengembalikan hasil sukses hapus atau saran penonaktifan (*soft-delete*).
12. `calculateInventoryValuation(products)`:
    - Menghitung ringkasan: `{ totalPcs, totalValuationHpp, totalValuationJual, lowStockCount, outOfStockCount }`.

---

## 5. Arsitektur Komponen Antarmuka Pengguna (UI)
Seluruh sub-komponen ditempatkan di dalam folder `src/modules/inventory/components/` dan diekspor melalui `src/modules/inventory/components/index.ts`:

```
src/modules/inventory/
├── components/
│   ├── ProductFormModal.tsx        # Modal Form Tambah/Edit Master Ban (CRUD)
│   ├── GoodsReceiptModal.tsx       # Modal Penerimaan Restock Barang Masuk (PO/GRN)
│   ├── StockCardDrawer.tsx         # Drawer Riwayat Mutasi Kartu Stok & Running Balance
│   ├── ProductFifoBatchList.tsx    # Visualisasi Lapisan Batch Pembelian FIFO
│   ├── StockOpnameModal.tsx        # Modal Hitung Opname Fisik vs Sistem & Auto-Diff
│   └── index.ts                    # Barrel Export Komponen
├── InventoryScreen.tsx             # Layar Utama Manajemen Inventori
└── index.ts
```

### Rincian Sub-Komponen:
1. **`ProductFormModal.tsx`**:
   - Mode: `'CREATE'` atau `'EDIT'`.
   - Form Fields: Brand (Bridgestone, Accelera, Dunlop, Forceum, Hankook, GTRadial), Nama Seri Ban, Lebar Tapak (175-265 mm), Aspek Rasio (50-70), Ukuran Ring (R13-R18+), Pola Kembangan/Tapak, Tahun Produksi DOT (2024, 2025, 2026), Harga Beli HPP (Rp), Harga Jual Retail (Rp), Batas Stok Minimum Alert.
   - Fitur Tombol: *"Generate SKU & Barcode Otomatis"* untuk pengisian instan.
   - Bagian Khusus Create: Switch *"Input Stok Awal Sekarang"*. Jika aktif, meminta Qty Awal & Nama Supplier/Distributor untuk otomatis membuat batch pertama.

2. **`GoodsReceiptModal.tsx`**:
   - Pemilihan Ban target (Select dropdown dengan fitur pencarian cepat SKU/Nama).
   - Input: Qty Ban Masuk (pcs), Harga Beli HPP per unit (default dari harga modal terakhir, dapat disesuaikan jika ada kenaikan harga pabrik), Nama Supplier (rekomendasi distributor ban resmi), Nomor Surat Jalan / Faktur Supplier, Tanggal Penerimaan, Catatan/Keterangan, dan Nama Petugas Gudang Penerima.
   - Display auto-generated nomor `GRN-OB3-...` dan kode `BATCH-...`.

3. **`StockCardDrawer.tsx`**:
   - Header: Nama Ban, SKU, Barcode, Status Aktif, dan Sisa Saldo Stok Gudang.
   - Sesi Atas: Menyematkan `ProductFifoBatchList.tsx` untuk memonitor sisa qty di masing-masing layer batch.
   - Filter Tabs: `Semua Mutasi`, `Hanya Masuk`, `Hanya Keluar`, `Penyesuaian Opname`.
   - Tabel Mutasi: Kolom Tanggal, No. Referensi Dokumen, Tipe Badge, Perubahan Qty, Sisa Saldo Berjalan (*Running Balance*), Keterangan & Operator.

4. **`ProductFifoBatchList.tsx`**:
   - Grid kartu batch dengan badge warna indikator sisa stok layer.
   - Menampilkan tanggal pembelian, harga beli HPP batch tersebut, perbandingan sisa kuantitas vs kuantitas awal (*e.g. 14 / 20 pcs*), dan nama distributor.

5. **`StockOpnameModal.tsx`**:
   - Tabel interaktif seluruh produk atau produk yang difilter.
   - Input *Stok Fisik Nyata* langsung di samping *Stok Sistem*.
   - Kalkulasi otomatis secara instan: Selisih Unit (Cocok / Lebih / Kurang) dan Selisih Nilai Rupiah HPP.
   - Tombol posting untuk langsung memperbarui stok master dan mencatat mutasi penyesuaian.

6. **`InventoryScreen.tsx`**:
   - Header dengan 3 tombol aksi: `Tambah Ban Baru`, `Penerimaan Barang (Restock)`, dan `Stock Opname Fisik`.
   - KPI Strip Metrik: Total Fisik Ban Gudang, Valuasi HPP Persediaan, Estimasi Nilai Jual, dan Status SKU Kritis.
   - Multi-Filter: Pencarian teks serbaguna (SKU, Nama, Ukuran, Barcode), Quick filter Brand, Quick filter Ring, Quick filter status stok (`Semua`, `Stok Kritis < Min Stock`, `Stok Habis`).
   - Tabel Master Ban dengan kolom aksi:
     - Ikon `History`: Buka Kartu Stok & Batch
     - Ikon `PlusCircle`: Restock Cepat untuk ban bersangkutan
     - Ikon `Edit`: Buka Modal Edit
     - Ikon `Power` / `Trash`: Nonaktifkan / Hapus aman

---

## 6. Integrasi dengan State Store & Modul Terkait
* **`App.tsx`**:
  - Menyediakan handler:
    - `handleCreateProduct(newProduct, initialMutation)`
    - `handleUpdateProduct(updatedProduct)`
    - `handleGoodsReceipt(productId, newBatch, newMutation, incomingQty)`
    - `handleDeleteOrDeactivateProduct(productId)`
    - `handleUpdateProductStock(updatedProducts, newMutations)` (untuk Opname)
  - Otomatis tersinkronisasi ke `localStorage` browser.
* **Integrasi dengan POS Kasir (`modules/pos`)**:
  - Produk baru yang ditambahkan langsung muncul di katalog POS kasir dan dapat discan barcode-nya.
  - Penambahan stok lewat Goods Receipt langsung menambah kuantitas yang tersedia untuk dijual di kasir.

---

## 7. Rencana Verifikasi & Pengujian
1. **Verifikasi Kompilasi & Type Safety:**
   - Menjalankan `npm run lint` (`tsc --noEmit`) untuk memastikan tidak ada kesalahan tipe TypeScript pada interface baru.
2. **Verifikasi Autonumeric Generator:**
   - Uji pembuatan SKU unik dengan berbagai variasi ukuran dan merek ban.
   - Uji nomor GRN, Batch, Mutasi, dan Opname agar tidak terjadi duplikasi.
3. **Verifikasi Use Case CRUD:**
   - Skenario A: Tambah ban baru tanpa stok awal -> produk muncul dengan stok 0.
   - Skenario B: Tambah ban baru dengan stok awal 10 -> tercipta Batch #1 dan mutasi MASUK dengan balance 10.
   - Skenario C: Penerimaan barang (restock) 8 unit -> total stok menjadi 18, tercipta Batch #2, tercatat mutasi GRN.
   - Skenario D: Edit harga jual dan batas min stock -> data master terupdate.
   - Skenario E: Percobaan hapus produk yang memiliki mutasi -> dialihkan ke penonaktifan (*soft delete*).
   - Skenario F: Stock Opname mengubah fisik menjadi 15 -> tercatat mutasi PENYESUAIAN -3 dengan selisih HPP yang tepat.
4. **Verifikasi Build Produksi:**
   - Menjalankan `npm run build` untuk memvalidasi bundling Vite bebas dari broken imports atau circular dependencies.
