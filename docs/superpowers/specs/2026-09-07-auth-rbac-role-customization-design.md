# Spesifikasi Desain: Autentikasi, Role-Based Access Control (RBAC), Kustomisasi Hak Akses Owner, dan Penyelarasan Transaksi Omah Ban Cabang 3

**Tanggal:** 7 September 2026  
**Peneliti / Pengembang:** Catherine Wong (NIM: 23.G4.0007)  
**Program Studi:** Akuntansi, Fakultas Ekonomi dan Bisnis, Universitas Katolik Soegijapranata Semarang  
**Objek Penelitian:** Toko Ban dan Velg Omah Ban Cabang 3 (OB3) - Kabupaten Magelang, Jawa Tengah  
**Pemilik Usaha (Owner):** Agus Subagyo  
**Standar Akuntansi:** SAK EMKM (IAI, 2016)

---

## 1. Latar Belakang & Tujuan

Berdasarkan proposal skripsi Catherine Wong dan evaluasi sistem operasional Omah Ban Cabang 2 (`ProjectOmahBan`), sistem kasir Point of Sale (POS) dan Sistem Informasi Akuntansi (SIA) Cabang 3 memerlukan penguatan pengendalian internal (*Internal Control*) melalui:
1. **Pemisahan Fungsi (*Segregation of Duties*):** Pembagian wewenang yang tegas antara Pemilik Toko (*Owner*), Petugas Kasir (*Cashier*), dan Staf Gudang (*Warehouse*).
2. **Kustomisasi Hak Akses oleh Owner:** Pemilik toko (Agus Subagyo) memiliki kendali mutlak untuk mengaktifkan atau menonaktifkan izin akses modul bagi Kasir dan Gudang secara fleksibel.
3. **Penyelarasan Siklus Transaksi DP & BON (Piutang Konsumen):** Memastikan integrasi antara transaksi POS lunas (*Normal*), uang muka pemesanan ban inden (*DP / Booking*), dan nota tagihan tempo konsumen (*BON / Piutang Usaha*) tercatat rapi pada bagan akun standar (COA) SAK EMKM.
4. **Penyelarasan Identitas Entitas:** Mengoreksi seluruh referensi fiktif/lama menjadi **Omah Ban Cabang 3 - Magelang**, dengan Owner **Agus Subagyo** dan Pengembang **Catherine Wong**.

---

## 2. Arsitektur Peran & Izin Akses (*Role & Permission Matrix*)

### 2.1 Definisi Tiga Peran Standar
1. **`OWNER` (Agus Subagyo):**
   - Peran tertinggi (*Superuser*).
   - Memiliki akses ke seluruh modul dan menu tanpa pembatasan.
   - Satu-satunya peran yang berhak membuka menu pengaturan hak akses dan mengubah wewenang peran Kasir dan Gudang.
2. **`KASIR` (Kasir OB3):**
   - Bertugas melayani transaksi pelanggan di meja kasir.
   - *Default menu:* POS Kasir, Riwayat Nota & Cetak Struk, Booking DP Ban/Velg Inden, dan Pengawasan/Pelunasan BON Konsumen.
   - *Dibatasi:* Tidak dapat melihat Dashboard Eksekutif, Laporan Keuangan SAK EMKM, maupun pengaturan sistem (kecuali jika diizinkan oleh Owner).
3. **`GUDANG` (Staf Gudang OB3):**
   - Bertugas mengelola persediaan fisik dan pengadaan ban/velg dari distributor resmi.
   - *Default menu:* Katalog Inventori, Penerimaan Barang Masuk (*Goods Receipt Restock Batch FIFO*), Kartu Stok Mutasi, dan Penyesuaian Fisik (*Stock Opname*).
   - *Dibatasi:* Tidak dapat mengakses POS kasir, data penjualan kas, atau laporan laba rugi.

### 2.2 Matriks Izin Akses (*Permission Keys*)
Sistem menggunakan 14 kunci izin modular:

| Kode Izin | Nama Fitur / Modul | Default Kasir | Default Gudang | Default Owner |
| :--- | :--- | :---: | :---: | :---: |
| `dashboard` | Dashboard Ringkasan Bisnis & KPI | ❌ | ❌ | ✅ |
| `pos` | Kiosk POS Kasir & Transaksi | ✅ | ❌ | ✅ |
| `receipt` | Riwayat Transaksi & Cetak Ulang Struk | ✅ | ❌ | ✅ |
| `booking_dp` | Booking Inden & Penerimaan DP | ✅ | ❌ | ✅ |
| `bon_receivable` | Pengawasan & Pelunasan BON Konsumen | ✅ | ❌ | ✅ |
| `inventory_view` | Melihat Katalog & Stok Ban/Velg | ✅ | ✅ | ✅ |
| `inventory_manage` | Tambah/Edit Master Produk & Servis | ❌ | ✅ | ✅ |
| `goods_receipt` | Penerimaan Barang Masuk (Restock FIFO) | ❌ | ✅ | ✅ |
| `stock_opname` | Penyesuaian Fisik Stok Opname | ❌ | ✅ | ✅ |
| `expenses` | Beban Operasional Kas Keluar (BKK) | ❌ | ❌ | ✅ |
| `accounts_payable` | Buku Pembantu Hutang Supplier Tempo | ❌ | ❌ | ✅ |
| `accounting_hub` | Jurnal Umum, Buku Besar, Neraca Saldo | ❌ | ❌ | ✅ |
| `financial_reports` | Laporan Keuangan SAK EMKM & CALK | ❌ | ❌ | ✅ |
| `role_settings` | Pengaturan Toko & Manajemen Hak Akses | ❌ | ❌ | ✅ |

---

## 3. Komponen Antarmuka Pengguna (UI/UX)

### 3.1 Layar Login & Demo Switcher
- Layar login profesional bertema **Omah Ban Cabang 3 - Magelang**.
- Menyertakan kartu identitas akademik:
  - *Pemilik Toko:* Agus Subagyo
  - *Sistem Informasi:* Catherine Wong (23.G4.0007) - FEB UNIKA Soegijapranata
- Pilihan **"Akun Demo Cepat (1-Click Login)"** untuk Owner, Kasir, dan Gudang guna mempermudah demonstrasi saat simulasi sidang skripsi.

### 3.2 Header Navbar & Role Switcher
- Badge profil pengguna di kanan atas menampilkan nama pengguna aktif, foto avatar peran, dan nama cabang.
- Menu navigasi utama secara otomatis difilter sesuai izin aktif peran tersebut.
- Dropdown role switcher memungkinkan Owner berpindah sudut pandang (*switch perspective*) ke Kasir atau Gudang secara instan untuk verifikasi hak akses.
- Tombol **Logout** untuk kembali ke layar Login.

### 3.3 Panel Pengaturan Hak Akses (Khusus Owner)
- Tab baru di menu Pengaturan: **"Manajemen Peran & Hak Akses"**.
- Tabel matriks interaktif berisi daftar fitur dengan *checkbox/toggle switch* untuk peran Kasir dan Gudang.
- Tombol **"Simpan Perubahan"** (menyimpan ke persistent storage) dan **"Reset ke Default"**.

---

## 4. Penyelarasan Akuntansi SAK EMKM untuk BON & DP

Untuk menjaga kepatuhan terhadap SAK EMKM dan sinkronisasi dengan pola Cabang 2:

1. **Akun Uang Muka Pemesanan Ban (DP / Booking):**
   - Ditambahkan akun baru: **`2-1004 Uang Muka Penjualan / Titipan Konsumen`** (Liabilitas Lancar).
   - Jurnal saat DP diterima:
     $$\text{[DEBIT] Kas Laci (1-1000) / Bank BCA (1-1001)} \quad / \quad \text{[KREDIT] Uang Muka Penjualan (2-1004)}$$
2. **Akun Piutang Konsumen (BON):**
   - Menggunakan akun: **`1-1002 Piutang Dagang Konsumen`** (Aset Lancar).
   - Jurnal saat transaksi BON:
     $$\text{[DEBIT] Piutang Dagang (1-1002)} \quad / \quad \text{[KREDIT] Pendapatan Penjualan (4-1000)}$$
   - Jurnal saat pelunasan BON:
     $$\text{[DEBIT] Kas Laci (1-1000) / Bank BCA (1-1001)} \quad / \quad \text{[KREDIT] Piutang Dagang (1-1002)}$$

---

## 5. Rencana Pengujian (Verification Plan)

1. **Pengujian Autentikasi & Guard:**
   - Verifikasi login sebagai Kasir -> menu Laporan Keuangan dan Dashboard tersembunyi.
   - Verifikasi login sebagai Gudang -> menu POS dan Kas Keluar tersembunyi.
   - Verifikasi login sebagai Owner -> seluruh menu aktif.
2. **Pengujian Kustomisasi Hak Akses:**
   - Owner mengaktifkan izin `expenses` untuk Kasir -> Kasir kini dapat mengakses menu Beban Kas Keluar.
   - Owner menonaktifkan kembali -> akses Kasir tertutup.
3. **Pengujian Transaksi DP, BON & SAK EMKM:**
   - Checkout transaksi BON -> Piutang bertambah, jurnal tercatat.
   - Pelunasan BON -> Kas bertambah, Piutang berkurang, Neraca Saldo tetap seimbang.
4. **Verifikasi Identitas:**
   - Memastikan tidak ada lagi teks "BSD Serpong" atau nama selain Catherine Wong dan Agus Subagyo di seluruh dokumen dan antarmuka.
