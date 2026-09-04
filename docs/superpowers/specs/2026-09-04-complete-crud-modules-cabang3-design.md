# Spesifikasi Desain: Modul CRUD Lengkap (Ban Baru, Velg, Ban Dalam, Master Jasa, Supplier) & Fitur POS (Edit Cart & DP/BON)

**Tanggal:** 2026-09-04  
**Proyek:** Omah Ban Cabang 3 (`Project_SkripsiOB`)  
**Standar Akuntansi:** SAK EMKM + Pencatatan Berpasangan (*Double-Entry*) + FIFO Layering  
**Referensi Arsitektur:** `C:\laragon\www\ProjectOmahBan` (diadaptasi khusus Cabang 3 tanpa Ban Second & tanpa Tukar Tambah)

---

## 1. Ringkasan & Ruang Lingkup Sistem

Sistem dirancang untuk mendukung operasional penuh Toko & Bengkel Omah Ban Cabang 3 dengan spesifikasi:
1. **Fokus Kategori Produk Fisik:**
   - **Ban Baru**: DOT/Tahun, Ukuran (Lebar/Rasio/Ring), Merek, Motif Tapak, Kode SKU, Barcode, FIFO Layers.
   - **Velg Mobil**: Ring, PCD (e.g. 4x100, 5x114.3), Lebar Velg, Offset/ET, Warna/Finishing, Merek/Model, FIFO Layers.
   - **Ban Dalam & Flap**: Ukuran Ban Dalam, Tipe Pentil/Valve (TR13, TR218A, dll.), Merek, FIFO Layers.
   - *(Catatan: Ban Second dan Fitur Tukar Tambah / Trade-in DITIADAKAN sesuai kebijakan Cabang 3)*.
2. **Master Jasa Bengkel (`ServiceMaster`):**
   - Layanan Spooring 3D, Balancing, Bongkar Pasang Ban/Velg, Tambal Ban Tubeless/Tip-Top, dan Isi Nitrogen.
   - Pengelolaan tarif dan HPP bahan (0 jika murni jasa tenaga). Non-stok (tidak mengurangi persediaan fisik).
3. **Master Supplier / Distributor:**
   - Database distributor resmi ban & velg (PT Bridgestone, PT Elangperdana Tyre, HSR Wheel, dll.).
   - Integrasi langsung ke form Penerimaan Barang (*Goods Receipt*) dan Buku Pembantu Hutang (*Accounts Payable*).
4. **Modul Pengeluaran Sederhana (*Simple Expenses*):**
   - Kategori terfokus: Operasional Harian Toko, Perlengkapan Habis Pakai Bengkel, dan Pemeliharaan Mesin Bengkel.
5. **Kasir POS Lengkap (*Multi-Item POS + Edit Line Cart + DP / BON*):**
   - **Multi-Item**: Keranjang kasir menggabungkan Ban Baru, Velg, Ban Dalam, dan Jasa.
   - **Fitur Edit di Cart**:
     - Edit Harga / Diskon per item (dengan modal supervisor atau input langsung).
     - Edit Kustom Nama/Catatan per baris nota.
     - Penyesuaian Qty dan Hapus baris.
   - **Fitur DP / Booking (*Down Payment*)**:
     - Simpan transaksi sebagai Booking DP (uang muka diterima masuk kas/bank, stok produk di-reservasi).
     - Pelunasan / Konversi Booking DP menjadi Faktur Penjualan Lunas atau Faktur BON.
   - **Fitur BON (Piutang Penjualan)**:
     - Transaksi penjualan belum lunas dicatat sebagai piutang (BON) ke akun COA `1-1002 Piutang Dagang`.

---

## 2. Struktur Model Data & TypeScript Types (`src/shared/types/index.ts`)

```typescript
// --- Kategori & Item Produk ---
export type ItemCategory = 'BAN_BARU' | 'VELG' | 'BAN_DALAM';
export type TireBrand = 'Bridgestone' | 'Accelera' | 'Dunlop' | 'Forceum' | 'Hankook' | 'GTRadial' | string;
export type TireRing = 'R13' | 'R14' | 'R15' | 'R16' | 'R17' | 'R18' | 'R19' | 'R20+';

export interface ProductBatch {
  id: string;
  product_id: string;
  batch_code: string;
  source_name: string;
  batch_cost: number;
  initial_qty: number;
  remaining_qty: number;
  purchase_date: string;
}

export interface ProductItem {
  id: string;
  category: ItemCategory;
  name: string;
  product_name: string;
  product_code: string;
  barcode: string;
  brand: string;
  
  // Spesifikasi Ban Baru
  product_size?: string;
  size_width?: number;
  size_ratio?: string;
  ring?: string;
  motif?: string;
  product_year?: number | string;
  condition_code: 'BARU';
  
  // Spesifikasi Velg
  pcd?: string;
  rim_width?: number;
  offset_et?: number;
  color_finish?: string;
  
  // Spesifikasi Ban Dalam
  valve_type?: string;
  
  // Finansial & Persediaan
  product_quantity: number;
  stock: number;
  product_stock_alert: number;
  min_stock: number;
  product_cost: number;
  cost_price: number;
  product_price: number;
  price: number;
  is_active: boolean;
  image_placeholder_color?: string;
  batches?: ProductBatch[];
}

// --- Master Jasa & Layanan ---
export type ServiceCategory = 'SPOORING' | 'BALANCING' | 'BONGKAR_PASANG' | 'PERBAIKAN_BAN' | 'NITROGEN';

export interface ServiceMasterItem {
  id: string;
  service_code: string;
  service_name: string;
  category: ServiceCategory;
  standard_price: number;
  cost_price: number;
  description?: string;
  is_active: boolean;
}

// --- Master Supplier ---
export interface SupplierItem {
  id: string;
  supplier_code: string;
  supplier_name: string;
  phone: string;
  email?: string;
  address: string;
  contact_person: string;
  payment_terms_days: number;
  is_active: boolean;
}

// --- Line Keranjang POS & Booking ---
export interface CartItem {
  item_type: 'PRODUCT' | 'SERVICE';
  product?: ProductItem;
  service?: ServiceMasterItem;
  name: string;
  price: number;
  cost_price: number;
  qty: number;
  discount_per_item: number;
  custom_name_override?: string;
  note?: string;
}

// --- Booking DP & Status Transaksi ---
export type TransactionStatus = 'LUNAS' | 'DP_BOOKING' | 'BON' | 'VOID';

export interface SalesBookingRecord {
  id: string;
  booking_number: string;
  date: string;
  customer_name: string;
  customer_phone: string;
  vehicle_plate: string;
  vehicle_model: string;
  items: CartItem[];
  estimated_total: number;
  dp_amount: number;
  remaining_amount: number;
  payment_method: PaymentMethod;
  notes?: string;
  status: 'ACTIVE' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  created_at: string;
}
```

---

## 3. Desain Komponen & Antarmuka Pengguna (UI/UX)

### 3.1. Layar Inventori Terpadu (`InventoryScreen`)
- **Tab Kategori**:
  - `Ban Baru` (Tabel spesifikasi Lebar/Rasio/Ring/DOT/Motif + Kartu Stok).
  - `Velg Mobil` (Tabel spesifikasi Ring/PCD/Lebar/ET/Warna + Kartu Stok).
  - `Ban Dalam & Flap` (Tabel Ukuran/Valve/Stok).
  - `Master Jasa` (Tabel Tarif, Kategori Jasa, & Status).
  - `Master Supplier` (Tabel Distributor & Kontak).
- **Aksi CRUD Dinamis**:
  - Tombol **"Tambah Produk"** membuka modal dengan form yang menyesuaikan kategori yang dipilih.
  - Tombol **"Penerimaan Barang (Restock)"** mendukung restock multi-kategori dengan pemilihan supplier dari daftar supplier.
  - Tombol **"Stock Opname"** untuk rekonsiliasi fisik vs sistem.

### 3.2. Layar Kasir POS (`PosScreen`)
- **Panel Katalog Kiri**:
  - Tab Filter: *Semua*, *Ban Baru*, *Velg*, *Ban Dalam*, *Jasa & Layanan*.
  - Pencarian pintar: SKU, Barcode, Merek, Ukuran, PCD, atau Nama Jasa.
- **Panel Keranjang Kanan (Cart)**:
  - List item dengan indikator badge (Ban / Velg / Ban Dalam / Jasa).
  - **Modal Edit Line**: Klik item untuk ubah Qty, Diskon, Kustom Harga/Nama, atau Catatan.
- **Panel Pembayaran Bawah**:
  - Input Pembayaran Tunai, Transfer BCA, QRIS, EDC.
  - **Tombol "Simpan DP / Booking"**: Membuka modal input DP (Uang muka, data pelanggan, no telp, estimasi sisa).
  - **Tombol "Bayar Sebagai BON"**: Memproses transaksi kredit/hutang pelanggan (Piutang Dagang).
  - **Tombol "Selesaikan Transaksi"**: Pembayaran lunas + Cetak Struk Thermal 80mm.
  - **Daftar Booking DP Aktif**: Tombol drawer untuk melihat booking DP yang tersimpan dan konversi ke nota pelunasan/BON.

---

## 4. Alur Integrasi Akuntansi SAK EMKM

1. **Penjualan Kasir Lunas:**
   - `Dr. Kas / Bank BCA`
   - `Cr. Pendapatan Penjualan Barang` (Akun 4-1000)
   - `Cr. Pendapatan Jasa & Layanan` (Akun 4-1001)
   - `Dr. HPP Barang (FIFO)` (Akun 5-1000)
   - `Cr. Persediaan Barang` (Akun 1-2000)
2. **Transaksi DP Booking:**
   - `Dr. Kas / Bank BCA` (Sebesar nominal DP yang diterima)
   - `Cr. Uang Muka Penjualan / Pendapatan Diterima Dimuka` (Akun 2-1004)
   - *(Stok barang di-reserve)*
3. **Pelunasan Transaksi DP Booking:**
   - `Dr. Uang Muka Penjualan` (Menghapus DP)
   - `Dr. Kas / Bank BCA` (Sisa pembayaran jika tunai) ATAU `Dr. Piutang Dagang` (Jika sisa jadi BON)
   - `Cr. Pendapatan Penjualan & Jasa`
   - `Dr. HPP (FIFO)`
   - `Cr. Persediaan Barang`
4. **Penjualan BON (Piutang):**
   - `Dr. Piutang Dagang (AR)` (Akun 1-1002)
   - `Cr. Pendapatan Penjualan` (Akun 4-1000)
   - `Dr. HPP (FIFO)`
   - `Cr. Persediaan Barang`

---

## 5. Rencana Tahapan Implementasi

1. **Tahap 1: Pembaharuan Tipe & Mock Data**
   - Perluas `src/shared/types/index.ts` dengan model `ProductItem`, `ServiceMasterItem`, `SupplierItem`, `SalesBookingRecord`.
   - Perbarui data awal di `src/shared/data/mockData.ts` mencakup data contoh Ban Baru, Velg HSR, Ban Dalam GT, Jasa Spooring/Balancing, Supplier, dan Booking DP.
2. **Tahap 2: Layanan Bisnis (*Services*)**
   - `inventoryService.ts`: CRUD Produk multi-kategori, restock penerimaan barang, kartu stok mutasi.
   - `serviceMasterService.ts`: CRUD Master Jasa.
   - `supplierService.ts`: CRUD Master Supplier.
   - `posService.ts` & `accountingService.ts`: Penanganan multi-item checkout, DP booking creation/conversion, dan auto-journaling DP/BON.
3. **Tahap 3: Pembaruan Komponen UI Inventori & Master**
   - `ProductFormModal.tsx`: Dukungan input dinamis Ban Baru, Velg (PCD/Lebar/ET), Ban Dalam.
   - `ServiceMasterModal.tsx` & `SupplierModal.tsx`: Form CRUD Jasa dan Supplier.
   - `InventoryScreen.tsx`: Tab navigasi Kategori Ban Baru, Velg, Ban Dalam, Master Jasa, Supplier.
4. **Tahap 4: Pembaruan POS Screen (Cart Edit, DP, BON)**
   - `PosScreen.tsx`: Filter kategori multi-item, modal edit line cart (harga/nama/diskon), form DP Booking modal, Drawer Daftar Booking DP, dan opsi BON.
5. **Tahap 5: Sinkronisasi Laporan & Riwayat Struk**
   - Struk thermal mendukung pencetakan nota DP Booking dan nota pelunasan/BON.
   - Dashboard & Laporan Keuangan merefleksikan piutang BON dan DP Booking.
6. **Tahap 6: Verifikasi & QA**
   - Type check `tsc --noEmit`, uji interaksi keranjang POS, DP, pelunasan, restock barang, dan keseimbangan Neraca SAK EMKM.
