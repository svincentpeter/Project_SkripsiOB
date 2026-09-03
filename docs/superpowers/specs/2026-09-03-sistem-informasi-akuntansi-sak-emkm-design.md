# Desain Spesifikasi Arsitektur: Sistem Informasi Akuntansi (SIA) SAK EMKM Lengkap
**Proyek:** Omah Ban POS & Keuangan Cabang 3 (OB3)  
**Konteks Akademik:** Tugas Akhir / Skripsi Ganda (Akuntansi & Sistem Informasi)  
**Tanggal:** 2026-09-03  
**Status:** Draf Tervalidasi  

---

## 1. Pendahuluan & Latar Belakang

Sistem Point of Sale (POS) Omah Ban Cabang 3 saat ini telah memiliki fungsionalitas operasional kasir berbasis metode persediaan FIFO (*First-In, First-Out*), pencatatan biaya operasional, dan mutasi stok. Namun, untuk memenuhi standar kualifikasi akademik **Sistem Informasi Akuntansi (SIA)** bagi mahasiswa program ganda **Akuntansi dan Sistem Informasi**, sistem harus memiliki siklus akuntansi (*accounting cycle*) yang utuh, berstandar **SAK EMKM** (Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah), serta memiliki jejak audit (*audit trail*) yang dapat dipertanggungjawabkan.

Dokumen ini mendefinisikan arsitektur lengkap subsistem akuntansi yang mengalirkan data secara otomatis dari kejadian transaksi operasional hingga penyusunan laporan keuangan dinamis.

---

## 2. Siklus Akuntansi & Alur Data Terintegrasi (*Data Flow*)

Sistem Informasi Akuntansi mengintegrasikan 5 simpul transaksi hulu ke hilir:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. BUKTI TRANSAKSI OPERASIONAL                   │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ Penjualan Kasir  │ Pembelian Ban    │ Biaya Toko       │ Bayar Hutang  │
│ (POS Invoice)    │ (Goods Receipt)  │ (Expense Voucher)│ (Payment Slip)│
└────────┬─────────┴────────┬─────────┴────────┬─────────┴───────┬───────┘
         │                  │                  │                 │
         ▼                  ▼                  ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        2. JURNAL UMUM & PENYESUAIAN                    │
│                     (Double-Entry: Debit = Kredit)                     │
│  + Fitur Jurnal Penyesuaian Manual (Penyusutan Mesin, Selisih Opname) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   3. BUKU BESAR (GENERAL LEDGER PER AKUN)              │
│    Pemilahan per COA (1-1000 s/d 6-1008) dengan Saldo Berjalan (Running)│
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│   4. BUKU PEMBANTU HUTANG (AP)   │  │       5. NERACA SALDO            │
│  Kartu Hutang per Distributor Ban│  │      (TRIAL BALANCE)             │
│  (Bridgestone, Dunlop, Accelera) │  │  Verifikasi Keseimbangan Akun    │
└──────────────────────────────────┘  └──────────────┬───────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 6. LAPORAN KEUANGAN STANDAR SAK EMKM                   │
│  100% Dinamis ditarik dari Akumulasi Saldo Buku Besar:                 │
│  - Laporan Laba Rugi (Pendapatan - HPP FIFO - Beban Operasional)       │
│  - Laporan Posisi Keuangan / Neraca (Aset = Liabilitas + Ekuitas)      │
│  - Catatan Atas Laporan Keuangan (CALK Standar SAK EMKM)               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Bagan Akun Standar (*Chart of Accounts* - COA)

Sistem menggunakan kodefikasi akun baku SAK EMKM yang telah disesuaikan dengan bisnis toko ban:

| Kode Akun | Nama Akun Akuntansi | Klasifikasi | Saldo Normal | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **1-1000** | Kas Toko Laci Kasir | Aset Lancar | DEBIT | Uang tunai fisik di laci kasir |
| **1-1001** | Bank BCA Cabang 3 | Aset Lancar | DEBIT | Rekening giro/operasional toko ban |
| **1-1002** | Piutang Dagang (AR) | Aset Lancar | DEBIT | Tagihan servis rekanan/instansi |
| **1-2000** | Persediaan Ban Baru Cabang 3 | Aset Lancar | DEBIT | Nilai buku inventori ban FIFO |
| **1-3000** | Peralatan Bengkel & Mesin Spooring | Aset Tetap | DEBIT | Mesin Spooring 3D, Tyre Changer, Balancer |
| **1-3999** | Akumulasi Penyusutan Mesin Bengkel | Kontra Aset | KREDIT | Akumulasi depresiasi mesin |
| **2-1000** | Hutang Dagang Supplier (AP) | Liabilitas | KREDIT | Tagihan tempo distributor ban |
| **2-1003** | PPN Keluaran (11%) | Liabilitas | KREDIT | Pajak pertambahan nilai titipan |
| **3-1000** | Modal Disetor Pemilik | Ekuitas | KREDIT | Modal awal pendirian Cabang 3 |
| **3-2000** | Laba Ditahan Cabang 3 | Ekuitas | KREDIT | Akumulasi laba periode sebelumnya |
| **4-1000** | Pendapatan Penjualan Ban Baru | Pendapatan | KREDIT | Omzet penjualan kotor |
| **4-9000** | Potongan Diskon Penjualan | Kontra Pendapatan | DEBIT | Diskon nota kasir |
| **5-1000** | Beban Pokok Penjualan (HPP) | Beban Pokok | DEBIT | Biaya pokok perolehan ban FIFO |
| **6-1000** | Beban Gaji & Uang Makan Montir | Beban Usaha | DEBIT | Gaji kepala toko & mekanik |
| **6-1001** | Beban Listrik, Air & Internet | Beban Usaha | DEBIT | Utilitas bulanan PLN/PDAM/Wifi |
| **6-1003** | Beban Sewa Bangunan Toko | Beban Usaha | DEBIT | Beban sewa ruko operasional |
| **6-1004** | Beban Transport & Pengiriman Ban | Beban Usaha | DEBIT | Ongkos kirim ban antar cabang/gudang |
| **6-1005** | Beban Perlengkapan & ATK Toko | Beban Usaha | DEBIT | Timbel balancing, pentil, kertas struk |
| **6-1006** | Beban Pemeliharaan & Penyusutan Mesin | Beban Usaha | DEBIT | Kalibrasi kamera spooring & depresiasi |
| **6-1007** | Beban Konsumsi & Lembur Karyawan | Beban Usaha | DEBIT | Konsumsi lembur saat ramai |
| **6-1008** | Beban Pajak & Retribusi Daerah | Beban Usaha | DEBIT | Retribusi sampah/izin usaha daerah |

---

## 4. Rincian Desain Modul & Komponen

Modul akuntansi (`src/modules/accounting/`) ditata ulang menjadi satu kesatuan pusat akuntansi terintegrasi (*Accounting Hub*) dengan 5 tab interaktif:

### 4.1 Tab 1: Jurnal Umum & Penyesuaian (*General Journal*)
* **Fungsi:** Menampilkan seluruh ayat jurnal akuntansi secara kronologis (dari transaksi kasir POS, pembelian persediaan ban, pengeluaran kas, pembayaran hutang, dan penyesuaian).
* **Fitur Utama:**
  * Filter berdasarkan rentang tanggal dan jenis dokumen (`SALE`, `PURCHASE`, `EXPENSE`, `DEBT_PAYMENT`, `ADJUSTMENT`).
  * Modal **"Tambah Jurnal Penyesuaian / Memorial"**: Form interaktif untuk menambah jurnal penyesuaian (misal: beban penyusutan mesin bulanan, setoran modal awal, koreksi opname).
  * **Hard Validation Gate:** Tombol simpan dinonaktifkan jika Total Debit $\neq$ Total Kredit.

### 4.2 Tab 2: Buku Besar (*General Ledger* per Akun)
* **Fungsi:** Mengelompokkan mutasi keuangan berdasarkan akun COA spesifik.
* **Fitur Utama:**
  * Dropdown pemilihan akun lengkap dengan informasi kode, nama, tipe, dan saldo normal.
  * Kartu ringkasan saldo awal periode, total mutasi debit, total mutasi kredit, dan saldo akhir.
  * Tabel mutasi detail dengan nomor ref dokumen, keterangan, debit, kredit, dan kolom **Saldo Berjalan (*Running Balance*)**.

### 4.3 Tab 3: Neraca Saldo (*Trial Balance*)
* **Fungsi:** Membuktikan bahwa seluruh pencatatan di buku besar berada dalam kondisi seimbang sebelum disusun ke dalam laporan keuangan.
* **Fitur Utama:**
  * Tabel daftar akun COA dengan posisi saldo Debit atau Kredit.
  * Baris rekapitulasi total di bagian bawah:
    $$\sum \text{Saldo Debit} \quad \text{vs} \quad \sum \text{Saldo Kredit}$$
  * Lencana status keseimbangan otomatis (*Balanced Indicator*) yang menjamin tidak ada selisih.

### 4.4 Tab 4: Buku Pembantu Hutang (*Accounts Payable Sub-Ledger*)
* **Fungsi:** Memonitor kewajiban toko kepada prinsipal distributor ban (PT Bridgestone Tire Indonesia, PT Elangperdana, PT Sumi Rubber Indonesia).
* **Fitur Utama:**
  * Kartu daftar tagihan faktur pembelian tempo (nomor faktur distributor, tanggal jatuh tempo, nominal awal, sisa hutang, status Belum Lunas / Sebagian / Lunas).
  * Modal **"Catat Pembayaran Hutang Supplier"**:
    * Input nominal bayar, tanggal, dan pemilihan rekening sumber dana (`1-1000 Kas Toko` atau `1-1001 Bank BCA`).
    * Menghasilkan otomatis ayat jurnal pelunasan:
      $$\text{Dr. Hutang Dagang Supplier [2-1000]} \quad \text{vs} \quad \text{Cr. Kas Toko [1-1000] / Bank BCA [1-1001]}$$
    * Mengurangi saldo hutang di kartu pembantu hutang secara seketika (*real-time*).

### 4.5 Tab 5: Laporan Keuangan Standar SAK EMKM (100% Dinamis)
* **Fungsi:** Menyajikan 3 elemen laporan keuangan resmi SAK EMKM:
  1. **Laporan Laba Rugi:**
     * Pendapatan Kotor Penjualan Ban
     * Potongan Penjualan (Diskon)
     * **Pendapatan Bersih**
     * **Harga Pokok Penjualan (HPP FIFO)** dengan catatan rincian: Persediaan Awal + Pembelian Bersih - Persediaan Akhir
     * **Laba Kotor Usaha**
     * Rincian Beban Usaha Operasional (Gaji, Listrik, Sewa, Pemeliharaan, dll.)
     * **Laba Bersih Usaha Sebelum Pajak**
  2. **Laporan Posisi Keuangan (Neraca):**
     * **Aset Lancar:** Kas Laci Kasir, Bank BCA, Piutang Usaha, Persediaan Ban Baru (Dihitung dari akumulasi saldo akun buku besar).
     * **Aset Tetap:** Peralatan Bengkel & Mesin Spooring 3D, dikurangi Akumulasi Penyusutan Mesin $\longrightarrow$ Nilai Buku Aset Tetap.
     * **Total Aset.**
     * **Liabilitas:** Hutang Dagang Supplier (Ditarik riil dari saldo akun `2-1000` dan sinkron dengan Buku Pembantu Hutang), PPN Keluaran.
     * **Ekuitas:** Modal Pemilik (`3-1000`), Laba Ditahan (`3-2000`), dan **Laba Periode Berjalan** (Ditarik otomatis dari hasil Laba Bersih Laporan Laba Rugi).
     * **Total Liabilitas & Ekuitas** (Menjamin kondisi seimbang: $\text{Aset} = \text{Liabilitas} + \text{Ekuitas}$).
  3. **Catatan Atas Laporan Keuangan (CALK):**
     * Menjelaskan dasar penyusunan laporan keuangan (SAK EMKM, basis akrual, metode persediaan FIFO, aset tetap metode garis lurus).
  4. **Alat Cetak & Ekspor:**
     * Cetak dokumen standar A4 bersih (*Print View*) untuk lampiran laporan skripsi.
     * Ekspor ke berkas spreadsheet (CSV/Excel).

---

## 5. Pemutakhiran Layanan Bisnis (*Services Layer*)

1. **`accountingService.ts`**:
   * Menambahkan fungsi `calculateAccountLedger(journals, accountCode, initialBalance)` untuk menghitung mutasi dan running balance per akun.
   * Menambahkan fungsi `calculateTrialBalance(journals, accounts, initialBalances)` untuk menyusun Neraca Saldo.
   * Menambahkan fungsi `generatePurchaseJournal(receiptInput, totalPurchaseAmount, isCredit)` untuk auto-journaling penerimaan stok ban.
   * Menambahkan fungsi `generateDebtPaymentJournal(paymentInput)` untuk auto-journaling pelunasan hutang dagang distributor.
   * Memutakhirkan `calculateSakEmkmFinancials` agar **100% menghitung saldo dari agregasi jurnal dan buku besar**, bukan menggunakan nilai hardcode.

2. **`inventoryService.ts` & `GoodsReceiptModal.tsx`**:
   * Memperluas input penerimaan barang ban masuk (*Goods Receipt*) dengan opsi syarat pembayaran: `TUNAI_KAS`, `TRANSFER_BANK`, atau `TEMPO_KREDIT` (mencatat jatuh tempo & nama distributor).

---

## 6. Rencana Verifikasi & Validasi Akademik

Untuk memastikan sistem tahan uji saat didemokan di hadapan dosen penguji:

| No | Skenario Pengujian | Hasil yang Diharapkan |
| :--- | :--- | :--- |
| 1 | **Validasi Keseimbangan Jurnal Otomatis** | Setiap transaksi POS, Pembelian Ban, dan Beban menghasilkan Debit = Kredit dengan selisih 0. |
| 2 | **Validasi Form Jurnal Manual** | Jika user memasukkan Debit Rp 1.000.000 dan Kredit Rp 800.000, tombol "Simpan Jurnal" dinonaktifkan dengan peringatan selisih Rp 200.000. |
| 3 | **Pengujian Pembelian Ban Tempo** | Input penerimaan stok ban baru tempo Rp 10.000.000 $\longrightarrow$ Stok ban bertambah $\longrightarrow$ Jurnal terbentuk $\longrightarrow$ Buku Pembantu Hutang mencatat tagihan baru $\longrightarrow$ Akun Hutang di Neraca bertambah Rp 10.000.000. |
| 4 | **Pengujian Pelunasan Hutang** | Klik "Bayar Hutang" Rp 5.000.000 via Bank BCA $\longrightarrow$ Jurnal pelunasan terbentuk $\longrightarrow$ Saldo Bank BCA berkurang Rp 5.000.000 $\longrightarrow$ Sisa hutang distributor berkurang Rp 5.000.000 $\longrightarrow$ Neraca tetap seimbang. |
| 5 | **Pengujian Jurnal Penyesuaian Penyusutan** | Tambah jurnal penyesuaian: Dr. Beban Penyusutan Mesin Rp 1.500.000 vs Cr. Akumulasi Penyusutan Mesin Rp 1.500.000 $\longrightarrow$ Beban bertambah sehingga Laba Bersih berkurang $\longrightarrow$ Nilai buku aset tetap di Neraca berkurang $\longrightarrow$ Ekuitas berkurang sebesar penurunan laba $\longrightarrow$ Neraca seimbang sempurna ($\Delta = 0$). |
| 6 | **Audit Trail Drilldown** | Setiap angka di Buku Besar dan Laporan Keuangan dapat dilacak kembali ke nomor referensi nota/dokumen aslinya. |
