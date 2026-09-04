# Implementation Plan: Modul CRUD Lengkap (Ban Baru, Velg, Ban Dalam, Master Jasa, Supplier) & POS (Edit Cart, DP Booking, BON)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun seluruh modul CRUD terpadu untuk Omah Ban Cabang 3 mencakup Ban Baru, Velg Mobil, Ban Dalam & Flap, Master Jasa Bengkel, Master Supplier, dan Pengeluaran Terfokus, serta menyempurnakan POS Kasir dengan fitur Edit Cart per-baris, transaksi DP Booking (uang muka & reservasi), dan transaksi BON (Piutang Dagang).

**Architecture:** Menggunakan arsitektur modular terintegrasi dengan shared state di `App.tsx` dan persistensi LocalStorage. Tipe produk diperluas menjadi `ProductItem` (dengan kategori `BAN_BARU`, `VELG`, `BAN_DALAM`), master jasa `ServiceMasterItem`, master supplier `SupplierItem`, dan entitas booking `SalesBookingRecord`. Seluruh transaksi POS kasir dan booking secara otomatis membentuk ayat jurnal akuntansi berpasangan SAK EMKM dan memotong layer persediaan FIFO.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide React, LocalStorage Persistent Store.

---

## Global Constraints
- Standar akuntansi: SAK EMKM (Entitas Mikro, Kecil, dan Menengah) dengan prinsip berpasangan (*Double-Entry*).
- Kategori barang toko: Khusus Ban Baru, Velg Mobil, dan Ban Dalam (Ban Second dan Tukar Tambah / Trade-in DITIADAKAN).
- Pengeluaran toko terfokus: Operasional Harian, Perlengkapan Bengkel, Pemeliharaan Mesin.
- POS Kasir: Multi-item (Barang + Jasa), Edit Line Cart (Qty, Harga Custom, Diskon, Catatan), Booking DP, Transaksi BON (Piutang).
- Semua nominal uang dalam Rupiah (IDR) tanpa desimal.
- Strict Type Safety: Tidak menggunakan `as any`, `@ts-ignore`, atau `@ts-expect-error`.

---

### Task 1: Ekstensi Skema Model Data & Types

**Files:**
- Modify: `src/shared/types/index.ts`

**Interfaces:**
- Consumes: `TireProduct`, `PosTransaction`, `CartItem`, `JournalEntry`
- Produces: `ItemCategory`, `ProductItem`, `ServiceCategory`, `ServiceMasterItem`, `SupplierItem`, `SalesBookingRecord`, `CartLineItem`

- [ ] **Step 1: Tambahkan Tipe Kategori, Item Produk, Jasa, Supplier, dan Booking di `types/index.ts`**
Tambahkan tipe-tipe baru dengan backward-compatibility alias untuk `TireProduct`.

- [ ] **Step 2: Jalankan verifikasi TypeScript**
Run: `npm run lint`
Expected: PASS tanpa error tipe.

---

### Task 2: Pembaruan Data Mock Awal (`mockData.ts`)

**Files:**
- Modify: `src/shared/data/mockData.ts`

**Interfaces:**
- Consumes: `ProductItem`, `ServiceMasterItem`, `SupplierItem`, `SalesBookingRecord`
- Produces: `INITIAL_PRODUCTS`, `INITIAL_SERVICES`, `INITIAL_SUPPLIERS`, `INITIAL_BOOKINGS`

- [ ] **Step 1: Buat data contoh lengkap untuk Ban Baru, Velg (HSR/Enkei), Ban Dalam (GT/Swallow)**
- [ ] **Step 2: Buat data contoh Master Jasa (Spooring 3D, Balancing, Tambal, Pasang, Nitrogen)**
- [ ] **Step 3: Buat data contoh Master Supplier (Bridgestone, Elangperdana, HSR Wheel, GT)**
- [ ] **Step 4: Buat data contoh Booking DP aktif**
- [ ] **Step 5: Verifikasi TypeScript**
Run: `npm run lint`

---

### Task 3: Layanan Bisnis Inti (Services: Product, Service, Supplier, POS, Booking, Accounting)

**Files:**
- Modify: `src/services/inventoryService.ts`
- Create: `src/services/serviceMasterService.ts`
- Create: `src/services/supplierService.ts`
- Modify: `src/services/posService.ts`
- Modify: `src/services/accountingService.ts`
- Modify: `src/services/index.ts`

**Interfaces:**
- Produces: 
  - `inventoryService.ts`: `createProductItem`, `updateProductItem`, `deleteProductItem`, `processMultiCategoryReceipt`
  - `serviceMasterService.ts`: `createServiceItem`, `updateServiceItem`, `deleteServiceItem`
  - `supplierService.ts`: `createSupplierItem`, `updateSupplierItem`, `deleteSupplierItem`
  - `posService.ts`: `createPosBookingRecord`, `convertBookingToSale`, `calculateMultiItemCartTotals`
  - `accountingService.ts`: `generateBookingDpJournal`, `generateBookingConversionJournal`, `generateBonSaleJournal`

- [ ] **Step 1: Implementasikan CRUD Service untuk Master Jasa di `serviceMasterService.ts`**
- [ ] **Step 2: Implementasikan CRUD Service untuk Master Supplier di `supplierService.ts`**
- [ ] **Step 3: Perbarui `inventoryService.ts` untuk mendukung multi-kategori (Ban Baru, Velg, Ban Dalam)**
- [ ] **Step 4: Perbarui `posService.ts` untuk Multi-item Cart, Edit Line Cart, DP Booking & BON**
- [ ] **Step 5: Perbarui `accountingService.ts` untuk auto-journaling DP Booking & Transaksi BON**
- [ ] **Step 6: Export semua service di `src/services/index.ts` dan verifikasi lint**
Run: `npm run lint`

---

### Task 4: Komponen Form & Modal CRUD (Product, Jasa, Supplier, Edit Cart, DP Booking)

**Files:**
- Modify: `src/modules/inventory/components/ProductFormModal.tsx`
- Create: `src/modules/inventory/components/ServiceFormModal.tsx`
- Create: `src/modules/inventory/components/SupplierFormModal.tsx`
- Modify: `src/modules/inventory/components/GoodsReceiptModal.tsx`
- Modify: `src/modules/inventory/components/index.ts`
- Create: `src/modules/pos/components/CartLineEditModal.tsx`
- Create: `src/modules/pos/components/BookingDpModal.tsx`
- Create: `src/modules/pos/components/BookingListDrawer.tsx`
- Create: `src/modules/pos/components/index.ts`

**Interfaces:**
- Produces: Komponen modal UI dengan validasi form input interaktif, AutoNumeric / MoneyInput, dan preview data.

- [ ] **Step 1: Perbarui `ProductFormModal.tsx` dengan tab/pilihan kategori (Ban Baru / Velg / Ban Dalam) dan field dinamis (PCD, ET, Valve, Ring, DOT)**
- [ ] **Step 2: Buat `ServiceFormModal.tsx` untuk tambah/edit tarif dan kategori jasa**
- [ ] **Step 3: Buat `SupplierFormModal.tsx` untuk tambah/edit data distributor**
- [ ] **Step 4: Perbarui `GoodsReceiptModal.tsx` dengan dropdown Supplier dan pilihan multi-produk**
- [ ] **Step 5: Buat `CartLineEditModal.tsx` di POS untuk edit harga kustom, diskon, nama baris, catatan**
- [ ] **Step 6: Buat `BookingDpModal.tsx` untuk proses pembayaran uang muka DP & simpan booking**
- [ ] **Step 7: Buat `BookingListDrawer.tsx` untuk menampilkan daftar booking DP aktif & tombol konversi ke pelunasan/BON**
- [ ] **Step 8: Verifikasi lint komponen**
Run: `npm run lint`

---

### Task 5: Pembaruan Layar Utama Inventori & Navigasi Terpadu

**Files:**
- Modify: `src/modules/inventory/InventoryScreen.tsx`
- Modify: `src/shared/components/HeaderNavbar.tsx`

**Interfaces:**
- Consumes: `products`, `services`, `suppliers`, `mutations`
- Produces: Tampilan 5 Tab di Inventori (Ban Baru, Velg, Ban Dalam, Master Jasa, Master Supplier) lengkap dengan tombol Tambah, Edit, Hapus, Filter Cepat, Search, dan Badge Stok.

- [ ] **Step 1: Modifikasi `InventoryScreen.tsx` dengan Tab Kategori Barang (Ban Baru, Velg, Ban Dalam), Tab Jasa, dan Tab Supplier**
- [ ] **Step 2: Integrasikan aksi CRUD (Create, Read, Update, Delete/Deactivate) untuk setiap tab**
- [ ] **Step 3: Perbarui `HeaderNavbar.tsx` untuk menampilkan informasi kas laci, stok kritis, dan booking aktif**
- [ ] **Step 4: Verifikasi lint**
Run: `npm run lint`

---

### Task 6: Pembaruan Layar Kasir POS (`PosScreen.tsx`)

**Files:**
- Modify: `src/modules/pos/PosScreen.tsx`

**Interfaces:**
- Consumes: `products`, `services`, `bookings`, `cart`, `onCompleteSale`, `onSaveBooking`, `onConvertBooking`
- Produces: Layar kasir responsif dengan katalog tab (Semua, Ban Baru, Velg, Ban Dalam, Jasa), interaksi klik line cart untuk edit modal, tombol Simpan DP Booking, tombol Bayar BON, tombol Buka Daftar Booking DP, dan tombol Checkout Tunai/Bank.

- [ ] **Step 1: Perbarui filter katalog produk & jasa di sebelah kiri**
- [ ] **Step 2: Perbarui daftar keranjang dengan badge tipe item, tombol edit baris modal, dan kalkulasi diskon**
- [ ] **Step 3: Tambahkan aksi Simpan Booking DP dan Bayar Sebagai BON**
- [ ] **Step 4: Integrasikan Drawer Daftar Booking DP dengan fitur "Ambil / Lunasi Booking" ke keranjang kasir**
- [ ] **Step 5: Verifikasi lint**
Run: `npm run lint`

---

### Task 7: Integrasi Global State di `App.tsx` & Cetak Struk Thermal

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/modules/receipt/ThermalReceiptScreen.tsx`

**Interfaces:**
- Consumes: Semua state (products, services, suppliers, bookings, transactions, expenses, journals, mutations)
- Produces: Sinkronisasi mutasi stok FIFO, pencatatan jurnal akuntansi otomatis, persistensi LocalStorage, dan layout cetak struk untuk Nota Penjualan, Nota DP Booking, dan Nota Pelunasan BON.

- [ ] **Step 1: Tambahkan state `services`, `suppliers`, `bookings` di `App.tsx` dengan persistensi LocalStorage**
- [ ] **Step 2: Hubungkan handler CRUD Produk, Jasa, Supplier, Restock, Booking DP, dan Checkout POS**
- [ ] **Step 3: Perbarui `ThermalReceiptScreen.tsx` agar mendukung pratinjau struk DP Booking dan struk multi-item (Ban, Velg, Jasa)**
- [ ] **Step 4: Verifikasi lint dan build penuh**
Run: `npm run lint; npm run build`

---

### Task 8: Pengujian Fungsionalitas End-to-End & Verifikasi SAK EMKM

**Files:**
- Test All Flows: Kasir POS, Booking DP, Pelunasan BON, CRUD Ban Baru, CRUD Velg, CRUD Ban Dalam, CRUD Jasa, CRUD Supplier, Restock Barang, Buku Besar, dan Neraca Saldo.

- [ ] **Step 1: Uji Tambah & Edit Produk (Ban Baru dengan DOT, Velg dengan PCD/ET, Ban Dalam)**
- [ ] **Step 2: Uji Master Jasa dan Master Supplier CRUD**
- [ ] **Step 3: Uji Checkout Kasir Gabungan (Ban + Velg + Jasa) & verifikasi pemotongan stok FIFO serta Jurnal**
- [ ] **Step 4: Uji Transaksi DP Booking, Reservasi Stok, dan Konversi ke Pelunasan/BON**
- [ ] **Step 5: Uji Keseimbangan Neraca Saldo (Total Debit = Total Kredit) di Modul Akuntansi**
- [ ] **Step 6: Jalankan build akhir dan commit Git**
Run: `npm run build; git status; git commit`
