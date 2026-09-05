# Spesifikasi Desain: Redesain & Penyempurnaan Modul Pengeluaran (Expenses) Omah Ban Cabang 3

**Tanggal:** 2026-09-05  
**Proyek:** Omah Ban Cabang 3 (`Project_SkripsiOB`)  
**Standar Akuntansi:** SAK EMKM + Pencatatan Berpasangan (*Double-Entry*) + Jurnal Pembalik (*Reversal Journal*)  
**Status:** Validated Design Spec  

---

## 1. Latar Belakang & Identifikasi Masalah

Berdasarkan audit komprehensif pada modul *Expenses* berjalan, ditemukan sejumlah keterbatasan teknis dan operasional yang perlu dibenahi:
1. **Integritas Data & Risiko Crash**: Penyimpanan bukti foto fisik nota secara mentah (*raw Base64*) langsung ke `localStorage` berisiko memicu `QuotaExceededError` (batas browser 5MB). Diperlukan kompresi gambar otomatis berbasis Canvas sisi klien sebelum disimpan.
2. **Ketiadaan Mekanisme Koreksi / Void**: Pengguna hanya dapat membuat biaya baru, tanpa opsi melihat detail, membatalkan (*void*), atau menghapus transaksi salah input. Sesuai standar SAK EMKM, pembatalan pengeluaran harus menghasilkan Jurnal Pembalik (*Reversal Journal*) dan mengembalikan saldo kas/bank.
3. **Pencatatan Non-Sekuensial**: Penomoran nomor bukti menggunakan `Math.random()` yang rawan duplikasi dan menyalahi kaidah audit nomor urut bukti kas keluar (*sequential voucher numbering*).
4. **Desinkronisasi Kas Bank**: Pengeluaran bersumber dari `Rekening Bank BCA` tidak memotong saldo akun bank secara reaktif pada `accountBalances`, berbeda dengan kas laci yang dipotong langsung.
5. **Keterbatasan UX & Pelaporan**: Tidak ada fitur pencarian (*live search*), filter kategori, filter tanggal transaksi, pagination, cetak Bukti Kas Keluar (BKK fisik bertanda tangan), serta grafik analitik komposisi biaya.

---

## 2. Arsitektur Komponen & Struktur File Baru

Modul `src/modules/expenses/` yang sebelumnya monolitik dipecah menjadi struktur modular:

```text
src/
├── modules/
│   └── expenses/
│       ├── ExpensesScreen.tsx             <-- Container utama, state filtering & modal coordinator
│       ├── components/
│       │   ├── ExpenseForm.tsx            <-- Form input pengeluaran + live journal preview + drag-drop nota
│       │   ├── ExpenseTable.tsx           <-- Tabel riwayat kaya fitur (Search, Filter, Sort, Pagination, Badge)
│       │   ├── ExpenseDetailModal.tsx     <-- Modal detail lengkap + zoom foto nota fisik + tombol void
│       │   ├── ExpenseVoucherModal.tsx    <-- Modal cetak Bukti Kas Keluar (BKK) thermal 80mm & A4/A5
│       │   ├── ExpenseAnalyticsCard.tsx   <-- Widget analitik komposisi biaya per kategori & perbandingan kas
│       │   └── index.ts                   <-- Barrel export
│       └── index.ts
├── services/
│   └── accountingService.ts               <-- Master mapping COA kategori, reversal journal, auto-numbering BKK
└── shared/
    ├── types/
    │   └── index.ts                       <-- Perluasan interface ExpenseRecord & ExpenseCategoryConfig
    └── utils/
        └── imageCompressor.ts             <-- Utilitas kompresi foto Canvas (resize max 1000px, quality 0.7)
```

---

## 3. Pembaruan Model Data (`src/shared/types/index.ts`)

### A. Interface `ExpenseRecord` (Enhanced)
```typescript
export type ExpenseStatus = 'ACTIVE' | 'VOID';

export interface ExpenseRecord {
  id: string;
  reference: string;
  expense_number: string;        // Format resmi: "BKK-202609-0001"
  bkk_number?: string;          // Alias nomor Bukti Kas Keluar
  date: string;                 // YYYY-MM-DD
  category: ExpenseCategory;
  category_code: string;        // Kode akun COA (e.g. "6-1001")
  amount: number;
  cash_source: CashSource;
  payment_method: 'Cash' | 'Transfer';
  bank_name?: string;
  paid_to: string;
  description: string;
  receipt_image?: string;       // Base64 terkompresi (< 150KB)
  attachment_path?: string;
  approved_by: string;
  journal_id?: string;          // ID Jurnal Umum yang terhubung langsung
  status: ExpenseStatus;        // 'ACTIVE' atau 'VOID'
  void_reason?: string;         // Alasan pembatalan jika status == 'VOID'
  voided_at?: string;           // Timestamp pembatalan
  voided_by?: string;           // Operator yang membatalkan
  reversal_journal_id?: string; // ID Jurnal Pembalik yang terbentuk saat void
  created_at: string;
}
```

### B. Master Konfigurasi Kategori Biaya & COA
```typescript
export interface ExpenseCategoryMapping {
  category: ExpenseCategory;
  account_code: string;
  account_name: string;
  description: string;
  budget_monthly_limit?: number; // Plafon anggaran bulanan
  default_cash_source?: CashSource;
}
```

Daftar Pemetaan Resmi:
1. `Listrik & Air (PLN/PDAM)` -> `6-1001` *Beban Listrik, Air & Internet*
2. `Gaji & Uang Makan Montir` -> `6-1000` *Beban Gaji & Uang Makan Karyawan*
3. `Sewa Lahan & Bangunan` -> `6-1003` *Beban Sewa Bangunan Toko*
4. `Transport & Pengiriman Ban` -> `6-1004` *Beban Transportasi & Pengiriman Ban*
5. `ATK & Keperluan Bengkel` -> `6-1005` *Beban Perlengkapan & ATK Toko*
6. `Pemeliharaan Mesin Spooring & Balancing` -> `6-1006` *Beban Perawatan Mesin Spooring & Balancing*
7. `Konsumsi & Lembur Karyawan` -> `6-1007` *Beban Konsumsi & Lembur Karyawan*
8. `Pajak & Retribusi Daerah` -> `6-1008` *Beban Pajak & Retribusi Daerah*

---

## 4. Spesifikasi Komponen & Alur Bisnis

### A. Kompresi Gambar Otomatis (`src/shared/utils/imageCompressor.ts`)
- Fungsi: `compressImageFile(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string>`
- Memanfaatkan elemen HTML5 `Image` dan `Canvas`.
- Mereduksi gambar kamera ponsel dari ~4MB menjadi string WebP/JPEG berukuran ~70-120 KB tanpa kehilangan keterbacaan teks angka pada nota/kuitansi fisik.
- Mencegah error kuota pada `localStorage`.

### B. Penomoran Dokumen Otomatis Sekuensial
- Fungsi: `generateBkkNumber(existingExpenses: ExpenseRecord[], dateStr: string): string`
- Pola: `BKK-{YYYYMM}-{XXXX}`
  - Contoh: Transaksi pertama September 2026 -> `BKK-202609-0001`
  - Transaksi berikutnya -> `BKK-202609-0002` (mendeteksi nomor tertinggi pada bulan yang sama secara otomatis).

### C. Pembuatan & Posting Jurnal Awal
- Saat biaya dicatat (`onAddExpense`):
  - Dibuat jurnal status `POSTED` dengan referensi nomor `BKK-YYYYMM-XXXX`.
  - **Debit**: `6-xxxx` (Beban Terkait) senilai Rp N.
  - **Kredit**: `1-1000 Kas Toko Laci Kasir` ATAU `1-1001 Bank BCA Cabang 3` senilai Rp N.
  - Rekam `newExpense.journal_id = newJournal.id`.
  - Potong saldo kas laci secara lokal jika dari laci; kurangi saldo rekening Bank BCA pada `accountBalances` jika via transfer.

### D. Alur Pembatalan Biaya (*Void Expense & Reversal Journal*)
- Kasir/Supervisor membuka modal detail pengeluaran -> Mengklik tombol **"Batalkan Biaya (Void)"**.
- Membuka konfirmasi dengan input wajib: **Alasan Pembatalan**.
- Sistem menjalankan:
  1. Ubah status biaya target menjadi `'VOID'`, isi `void_reason`, `voided_at`, `voided_by`.
  2. Buat Jurnal Pembalik otomatis:
     - Nomor referensi: `BATAL-{BKK-NUMBER}`
     - **Debit**: `1-1000` (atau `1-1001 Bank BCA`) senilai Rp N (uang dikembalikan ke kas/bank).
     - **Kredit**: `6-xxxx` (Beban Terkait) senilai Rp N (beban dihapus dari laporan laba rugi).
     - Status Jurnal: `POSTED`.
  3. Tambahkan saldo kas laci atau saldo rekening Bank BCA senilai nominal biaya yang dibatalkan.
  4. Simpan perubahan ke state dan `localStorage`.

### E. Cetak Bukti Kas Keluar (BKK Voucher)
- Modal khusus yang dapat dibuka dari setiap baris riwayat biaya.
- Menyediakan layout cetak ramah cetak browser (`@media print`):
  - **Format Struk Kasir Thermal (80mm)**: Cocok untuk printer kasir thermal toko.
  - **Format Lembar Kas Masuk/Keluar A5/A4**: Menampilkan kop resmi Omah Ban Cabang 3, No. BKK, Tanggal, Nominal Terbilang Rupiah, Keterangan, serta 3 kolom tanda tangan:
    - *Disiapkan Oleh (Kasir)*
    - *Disetujui Oleh (Supervisor/Manajer)*
    - *Diterima Oleh (Pihak Ketiga/Penerima)*.

### F. Fitur Tabel Riwayat & Analitik
- **Filter**:
  - Filter teks instan (No. BKK, Keterangan, Penerima, Nama Akun).
  - Filter Kategori Biaya (All atau per kategori).
  - Filter Rentang Tanggal (Semua, Hari Ini, Minggu Ini, Bulan Ini, atau Kustom Tanggal).
  - Filter Sumber Dana (Semua, Kas Laci, Bank BCA).
  - Filter Status (`Semua`, `Hanya Aktif`, `Hanya Batal/Void`).
- **Export Data**: Tombol ekspor data riwayat terfilter ke format CSV.
- **Widget Analitik**:
  - Total Pengeluaran Bulan Berjalan (hanya menghitung yang berstatus `ACTIVE`).
  - Grafik komposisi biaya (*horizontal progress bars*) per kategori.
  - Perbandingan pengeluaran via Kas Laci vs Bank BCA.

---

## 5. Rencana Verifikasi & Pengujian

1. **Pengujian Kompresi Gambar**:
   - Upload file gambar sampel ukuran > 2MB.
   - Verifikasi hasil string base64 terkompresi (< 150KB) dan tidak menyebabkan crash penyimpanan.
2. **Pengujian Penomoran Sekuensial**:
   - Tambah 2 transaksi biaya berturut-turut pada tanggal yang sama.
   - Verifikasi nomor terbentuk berurutan `BKK-202609-0005`, `BKK-202609-0006`.
3. **Pengujian Jurnal Double-Entry & Kas**:
   - Tambah biaya via Kas Laci: verifikasi saldo laci berkurang dan jurnal Debit Beban / Kredit Kas Laci terbit.
   - Tambah biaya via Bank BCA: verifikasi saldo Bank BCA terpotong dan jurnal Debit Beban / Kredit Bank BCA terbit.
4. **Pengujian Pembatalan Transaksi (Void)**:
   - Lakukan void pada salah satu transaksi biaya.
   - Verifikasi status berubah menjadi `VOID` (tercoret dengan badge merah).
   - Verifikasi jurnal pembalik terbentuk dan saldo kas/bank bertambah kembali sejumlah nominal.
   - Verifikasi laporan Laba Rugi SAK EMKM dan Neraca kembali seimbang (*balanced*).
5. **Pengujian Cetak Voucher & Export CSV**:
   - Buka modal cetak BKK dan verifikasi format print-ready.
   - Klik ekspor CSV dan periksa kolom yang terunduh.
