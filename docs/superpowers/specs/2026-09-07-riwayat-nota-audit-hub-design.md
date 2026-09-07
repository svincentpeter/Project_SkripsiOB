# Design Spec: Riwayat Nota & Audit Hub Transaksi Penjualan (Tingkat 1)
**Tanggal:** 07 September 2026  
**Sistem:** Sistem Informasi Akuntansi Toko Ban & Velg Omah Ban Cabang 3 - Magelang  
**Peneliti / Author:** Catherine Wong (NIM: 23.G4.0007, FEB UNIKA Soegijapranata)  
**Pemilik Toko:** Agus Subagyo  
**Standar Akuntansi:** SAK EMKM (Entitas Mikro, Kecil, dan Menengah)  

---

## 1. Latar Belakang & Tujuan

Layar "Riwayat Nota" sebelumnya ([`ThermalReceiptScreen.tsx`](file:///c:/laragon/www/Project_SkripsiOB/src/modules/receipt/ThermalReceiptScreen.tsx)) hanya berfungsi sebagai penampil preview struk thermal 80mm untuk transaksi terakhir dengan daftar nota sebelah kiri yang statis. 

Untuk memenuhi kebutuhan operasional bengkel ban modern serta pertanggungjawaban ilmiah dalam sidang skripsi FEB UNIKA Soegijapranata, modul ini ditingkatkan menjadi **Riwayat Nota & Audit Hub Penjualan** dengan implementasi **Tingkat 1 (Wajib)**:
1. **Pencarian Multi-Kriteria & Filter Cepat:** Pencarian nomor nota, plat mobil, nama pelanggan, filter status transaksi, metode pembayaran, dan rentang tanggal.
2. **Fitur VOID / Pembatalan Nota dengan Auto-Reversal SAK EMKM:** Pembatalan nota resmi dengan input alasan wajib, pengembalian stok ban ke gudang, penyesuaian kas laci, dan pencatatan Jurnal Pembalik (Reversing Journal) otomatis di Buku Besar.
3. **Stempel & Visual Watermark VOID:** Penanda visual diagonal `"DIBATALKAN / VOID"` pada preview struk thermal maupun faktur dinas A4 agar tidak dapat disalahgunakan.
4. **Dual Print Layout (Struk Thermal 80mm vs Faktur Resmi A4):** Tab toggle yang memungkinkan kasir mencetak struk thermal 80mm untuk konsumen retail atau Faktur Dinas Format A4 (dilengkapi kop resmi Magelang dan kolom tanda tangan Kasir, Mekanik, & Pelanggan).
5. **Direct WhatsApp Sharing (`wa.me`):** Tombol aksi yang langsung membuka percakapan WhatsApp Web / Aplikasi WA ponsel dengan pesan struk terformat rapi.

---

## 2. Arsitektur Komponen & Alur Data

### 2.1. Skema Data & State
- **PosTransaction Interface Update:**
  - `status`: `'LUNAS' | 'VOID' | 'PENDING' | 'Completed'`
  - `is_voided`: `boolean`
  - `void_reason?`: `string`
  - `voided_at?`: `string`
  - `voided_by?`: `string`
  - `customer_phone?`: `string`
  - `mechanic_name?`: `string`

### 2.2. Jurnal Pembalik SAK EMKM (`generateVoidSalesJournal`)
Ketika transaksi penjualan dibatalkan (VOID), fungsi `generateVoidSalesJournal` di [`accountingService.ts`](file:///c:/laragon/www/Project_SkripsiOB/src/services/accountingService.ts) akan membentuk jurnal pembalik berpasangan:
- **Debit:** Akun `4-1000` (Pendapatan Penjualan Ban Baru) sebesar Subtotal Penjualan.
- **Debit:** Akun `2-1003` (PPN Keluaran 11%) jika transaksi mengenakan PPN.
- **Kredit:** Akun `1-1000` (Kas Laci Kasir) atau `1-1001` (Bank BCA) sebesar Grand Total pembayaran yang dikembalikan.
- **Kredit:** Akun `4-9000` (Potongan Diskon Penjualan) jika sebelumnya ada diskon.
- **Debit:** Akun `1-2000` (Persediaan Ban Baru Cabang 3) sebesar HPP Transaksi (mengembalikan nilai aset persediaan).
- **Kredit:** Akun `5-1000` (Harga Pokok Penjualan Ban Baru) sebesar HPP Transaksi (meniadakan beban pokok penjualan).

### 2.3. Pengembalian Fisik Stok Ban & Mutasi Gudang
- Untuk setiap item produk ban dalam transaksi yang dibatalkan, `product_quantity` / `stock` ditambahkan kembali sebanyak kuantiti yang terjual.
- Sistem mencatat rekaman baru di `StockMutation`:
  - `type`: `'PENYESUAIAN'` / `'MASUK'`
  - `ref_doc`: Nomor nota transaksi yang dibatalkan
  - `notes`: `"Pembatalan Transaksi [Invoice No] - Alasan: [Alasan Void]"`
  - `operator`: Nama user yang melakukan void

### 2.4. Penyesuaian Saldo Kas Laci Fisik
- Jika transaksi dibayar dengan metode `'TUNAI'`, saldo `cashInDrawer` dikurangi sebesar `grand_total` (karena uang dikembalikan ke pelanggan).

---

## 3. Desain Antarmuka Pengguna (UI/UX Pro Max)

### 3.1. Layout: Master-Detail Split Screen
- **Kolom Kiri (Master List Transaksi - ~42% lebar layar):**
  - **Header & Search Bar:** Input pencarian responsif (No Nota, Plat Mobil, Nama Pelanggan) dengan tombol *Clear*.
  - **Filter Chips Horizontal:**
    - Status: `[Semua]` `[Lunas]` `[BON / Piutang]` `[DP Booking]` `[Void]`
    - Tanggal: Dropdown preset `[Hari Ini]` `[7 Hari Terakhir]` `[Bulan Ini]` `[Semua Waktu]`
  - **Daftar Kartu Transaksi:**
    - Nomor Nota tebal dengan font monospaced.
    - Status Badge berwarna semantic: Hijau (Lunas), Kuning (BON), Ungu (DP), Merah (Void).
    - Informasi ringkas: Pelanggan, Plat nomor, Jumlah item ban, Jam transaksi, dan Total Rupiah.
    - Active State: Background highlight `bg-indigo-50 border-indigo-400`.
- **Kolom Kanan (Detail & Action Canvas - ~58% lebar layar):**
  - **Action Toolbar (Sticky):**
    - Tombol `Kembali ke POS Kasir`
    - View Switcher: `[ Struk Thermal 80mm ]` vs `[ Faktur Dinas A4 ]`
    - Tombol `Buka Laci Kasir` (dengan efek suara solenoid)
    - Tombol `Kirim WhatsApp` (membuka modal nomor telepon & link direct `wa.me`)
    - Tombol `Batalkan / VOID Transaksi` (merah outline; disabled jika nota sudah berstatus VOID)
    - Tombol `Cetak Nota` (Emerald Green, memanggil `window.print()` dengan CSS `@media print` terisolasi)
  - **Preview Canvas:**
    - **Mode Struk Thermal 80mm:** Kertas kasir realistis, lebar 80mm monospaced, header toko Cabang 3 Magelang, detail item ban, subtotal & PPN, info garansi resmi 1 tahun, dan barcode nota. Jika VOID, terdapat stempel merah diagonal transparan.
    - **Mode Faktur Dinas Format A4:** Kop surat formal Omah Ban Cabang 3 Magelang, detail pelanggan & kendaraan, tabel rincian transaksi profesional, catatan garansi pabrik, serta 3 kolom tanda tangan (Kasir, Mekanik Ban, Pelanggan).
  - **Modal Konfirmasi VOID:**
    - Dialog peringatan konsekuensi akuntansi & stok.
    - Textarea wajib untuk mengisi alasan pembatalan.
    - Konfirmasi pembatalan dengan feedback notifikasi instan.

---

## 4. Rencana Verifikasi & Testing
1. **Verifikasi Build:** `npm run build` berjalan tanpa error TypeScript.
2. **Verifikasi Alur Pembatalan (VOID):**
   - Lakukan transaksi di Kasir POS -> masuk ke Riwayat Nota.
   - Klik tombol "Batalkan Transaksi (VOID)" -> isi alasan.
   - Cek stok ban bertambah kembali di menu Persediaan.
   - Cek Jurnal Pembalik otomatis muncul di menu Buku Besar dengan nominal debit/kredit yang seimbang (balance).
   - Cek preview nota berubah menampilkan stempel VOID.
3. **Verifikasi Dual Print & WhatsApp:**
   - Cek pergantian tampilan Struk Thermal 80mm dan Faktur A4.
   - Uji tombol cetak dan tautan `wa.me`.
