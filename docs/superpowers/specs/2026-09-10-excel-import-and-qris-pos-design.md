# Spesifikasi Arsitektur: Sistem Import Ban (Paritas ProjectOmahBan) & Fintech QRIS POS (Midtrans)

**Tanggal:** 2026-09-10  
**Status:** Draf Tervalidasi  
**Repositori:** `Project_SkripsiOB`  
**Referensi:** `ProjectOmahBan` (Commit `ee4a51d8`)

---

## 1. Ringkasan Eksekutif
Dokumen ini mendefinisikan rancangan teknis untuk dua kebutuhan utama revisi dosen pembimbing:
1. **Sub-Sistem 1: Sistem Import & Pembaruan Selektif Ban Excel (Paritas Penuh `ProjectOmahBan`)**
   - Mempermudah owner menginput ban baru secara massal dari file Excel sekaligus melakukan update selektif (HPP, Harga Jual, dan/atau Stok Fisik) pada ban yang sudah ada tanpa me-rewrite database, dengan pencatatan riwayat audit harga dan urutan batch FIFO termurah.
2. **Sub-Sistem 2: Integrasi Fintech QRIS Dinamis (Midtrans) pada POS Kasir**
   - Menghubungkan kasir POS dengan gerbang pembayaran Midtrans Core API untuk mencetak kode QRIS dinamis real-time, auto-polling deteksi pelunasan pelanggan, webhook notifikasi, serta mode simulator sandbox untuk kelancaran sidang skripsi.

---

## 2. Sub-Sistem 1: Import Ban & Pembaruan Selektif Excel

### 2.1 Komponen Backend

#### A. Service `StockSelectiveUpdateService.php`
- **Lokasi:** `backend/app/Services/Inventory/StockSelectiveUpdateService.php`
- **Fungsi Utama:**
  - Menerima payload kumpulan ban terpilih (`$items`) dan opsi pembaruan (`$options`).
  - **Validasi:** Alasan perubahan (`reason`) wajib diisi minimal 3 karakter; minimal salah satu opsi (`update_cost`, `update_price`, `update_stock`) harus aktif.
  - **Pembaruan HPP (`product_cost`):**
    - Memperbarui kolom `product_cost` pada model `Product`.
    - Mencatat perubahan ke tabel `product_price_audits` dengan data: `old_cost`, `new_cost`, `cost_change_percent`, `reason`, `changed_by`, `context_month`, dan `change_source = 'bulk_update'`.
  - **Pembaruan Harga Jual (`product_price`):**
    - Memperbarui kolom `product_price` pada model `Product`.
    - Mencatat perubahan ke tabel `product_price_audits` dengan data `price_change_percent`.
  - **Pembaruan Stok Fisik (`product_quantity`):**
    - Menghitung selisih stok (delta).
    - Jika item menyertakan rincian batch dari Excel (`batches`), sistem mengurutkan batch secara FIFO berdasarkan HPP terendah (`batch_cost ASC`), mengosongkan sisa kuantitas batch rekonsiliasi lama pada periode yang sama, dan membuat `ProductBatch` baru dengan tanggal mundur berjenjang (`subDays`) agar konsisten dengan prinsip FIFO tertua.
    - Mencatat pergerakan stok ke tabel `stock_movements` bertipe `TYPE_IN` / `TYPE_OUT` dengan referensi deskripsi alasan rekonsiliasi.
  - Seluruh operasi dibungkus dalam transaksi basis data atomik (`DB::transaction`).

#### B. API Controller & Rute
- **Rute Baru:** `POST /api/v1/stock/reconciliation/bulk-update`
- **Controller:** `StockReconciliationApiController@bulkUpdate`
- **Validasi Request:**
  - `items`: array wajib (minimal 1 item).
  - `update_cost`: boolean.
  - `update_price`: boolean.
  - `update_stock`: boolean.
  - `reason`: string wajib (min: 3).
  - `branch_id`: integer opsional (default: 3 / cabang aktif).

### 2.2 Komponen Frontend (`StockReconciliationModal.tsx`)
- **Filter Tabs yang Diperluas:**
  - `SEMUA` (ALL)
  - `BEDA HPP` (`diff_cost`): hanya produk matched dengan selisih modal/HPP.
  - `BEDA HARGA` (`diff_price`): hanya produk matched dengan selisih harga jual.
  - `BEDA STOK` (`diff_stock`): hanya produk matched dengan selisih kuantitas fisik.
  - `ADA SELISIH` (`diff_any`): produk matched yang memiliki minimal salah satu perbedaan.
  - `IDENTIK` (`identical`): produk matched yang sudah sama persis (HPP, harga, stok).
  - `PRODUK BARU` (`NEW`): produk Excel yang belum ada di database toko.
- **Fitur Seleksi Cepat:**
  - Tombol *"Pilih Semua Yang Beda"* (`selectAllDifferent`): otomatis mencentang semua produk matched yang memiliki ketidaksesuaian data.
- **Modal Aksi Update Selektif:**
  - Pop-up interaktif sebelum eksekusi dengan ringkasan: jumlah produk dipilih, jumlah selisih HPP, jumlah selisih harga jual, dan jumlah selisih stok.
  - Checkbox pilihan aspek: `[✓] Perbarui HPP / Modal`, `[✓] Perbarui Harga Jual`, `[✓] Perbarui Stok Fisik`.
  - Textarea input alasan audit (wajib).
  - Tombol simpan perubahan yang mengeksekusi endpoint `bulk-update` tanpa merusak produk lain.
- **Sinkronisasi Produk Baru:**
  - Tetap mendukung pembuatan produk baru dari Excel secara massal via commit yang sudah ada.

---

## 3. Sub-Sistem 2: Integrasi Fintech QRIS Dinamis (Midtrans) pada POS

### 3.1 Arsitektur & Konfigurasi Backend

#### A. Konfigurasi Lingkungan (`.env` & `config/midtrans.php`)
```env
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_MERCHANT_ID=Gxxxxxxxxx
```

#### B. Service `MidtransQrisService.php`
- **Lokasi:** `backend/app/Services/Payment/MidtransQrisService.php`
- **Metode 1: `createQrisTransaction(string $orderId, int $grossAmount, array $customerDetails = []): array`**
  - Mengirim HTTP POST ke Midtrans Core API:
    - URL Sandbox: `https://api.sandbox.midtrans.com/v2/charge`
    - Header: `Authorization: Basic {base64(server_key . ':')}`
    - Payload JSON:
      ```json
      {
        "payment_type": "qris",
        "transaction_details": {
          "order_id": "POS-20260910-XXXX",
          "gross_amount": 250000
        },
        "qris": {
          "acquirer": "gopay"
        }
      }
      ```
  - Mengembalikan `qr_string` (format EMVCo standard), `qr_url` (gambar QR dari Midtrans), `order_id`, `expiry_time`, dan `gross_amount`.
- **Metode 2: `checkStatus(string $orderId): array`**
  - Mengirim HTTP GET ke `https://api.sandbox.midtrans.com/v2/{order_id}/status`.
  - Mengembalikan status terkini: `pending`, `settlement`, `expire`, atau `cancel`.
- **Metode 3: `simulateSandboxPayment(string $orderId): bool`**
  - Menghubungi Midtrans Sandbox Simulator API / fallback development agar penguji/mahasiswa bisa memicu status `settlement` secara instan tanpa HP saat demo sidang.

#### C. API Controller & Rute
- `POST /api/v1/payment/qris/charge` (Membuat QRIS dinamis baru).
- `GET /api/v1/payment/qris/status/{orderId}` (Polling status pembayaran kasir).
- `POST /api/v1/payment/qris/simulate/{orderId}` (Tombol instan simulasi lunas untuk sandbox).
- `POST /api/v1/payment/midtrans/webhook` (Webhook asynchronous Midtrans).

### 3.2 Frontend POS (`CheckoutModal.tsx` & `QrisDynamicModal.tsx`)

1. **Pilihan Metode Pembayaran di Kasir:**
   - Pada modal checkout POS, saat kasir memilih metode pembayaran **QRIS**, kasir dapat memilih mode **QRIS Dinamis Midtrans (Otomatis)** atau QRIS Statis Manual.
2. **Komponen `QrisDynamicModal.tsx`:**
   - Menampilkan QR Code dinamis berkualitas tinggi (bisa di-scan oleh aplikasi GoPay, BCA Mobile, OVO, Dana, ShopeePay, Livin, dll.).
   - Menampilkan ringkasan total tagihan (`Rp xxx.xxx`), Nomor Nota / Order ID, dan status *"Menunggu Pembayaran Pelanggan..."*.
   - Timer hitung mundur (countdown 15 menit).
   - Auto-polling: React hook memeriksa status setiap 3 detik.
   - Tombol Bantuan Demo Skripsi:
     - *"Buka Simulator Midtrans"* (tautan resmi ke simulator Midtrans).
     - *"Simulasikan Pembayaran Berhasil"* (khusus mode Sandbox).
3. **Penyelesaian Transaksi Otomatis:**
   - Begitu status berubah menjadi `settlement`, modal menampilkan centang sukses hijau dan langsung menyelesaikan transaksi checkout di POS dengan data metadata pembayaran (`payment_method: 'QRIS'`, `provider_name: 'Midtrans'`, `payment_ref: transaction_id`).
   - Kasir langsung dapat mencetak struk nota.

---

## 4. Rencana Verifikasi & Uji Coba

1. **Pengujian Sub-Sistem 1 (Import Ban):**
   - Uji coba unit test `StockSelectiveUpdateServiceTest.php` untuk skenario:
     - Update HPP saja -> memverifikasi perubahan HPP dan pencatatan audit log `product_price_audits`.
     - Update Harga Jual saja -> memverifikasi harga dan audit log.
     - Update Stok saja -> memverifikasi kuantitas, FIFO batch creation (termurah dahulu), dan `stock_movements`.
     - Validasi proteksi (alasan kosong atau <3 huruf ditolak).
   - Uji coba frontend pada `StockReconciliationModal.tsx`:
     - Filter tab berfungsi presisi (`diff_cost`, `diff_price`, `diff_stock`, `diff_any`, `identical`).
     - Tombol *"Pilih Semua Yang Beda"* mencentang baris yang tepat.
     - Modal update selektif berhasil memproses data.
2. **Pengujian Sub-Sistem 2 (QRIS Midtrans POS):**
   - Uji coba backend `MidtransQrisApiTest.php`:
     - Endpoint charge mengembalikan `qr_string` dan `order_id`.
     - Endpoint status mengembalikan status transaksi.
     - Endpoint simulasi sandbox berhasil mengubah status jadi `settlement`.
   - Uji coba integrasi POS:
     - Checkout dengan QRIS dinamis memunculkan modal QR.
     - Pembayaran terdeteksi otomatis dan struk tercetak rapi.
