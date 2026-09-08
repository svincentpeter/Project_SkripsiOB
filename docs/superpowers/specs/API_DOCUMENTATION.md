# Dokumentasi REST API: Omah Ban POS & SIA SAK EMKM Cabang 3

Dokumentasi resmi antarmuka pemrograman aplikasi (API) untuk sistem terintegrasi **Omah Ban POS & Sistem Informasi Akuntansi (SIA) Cabang 3** berbasis Laravel 12 dan MySQL `project-skripsi_ob`.

---

## 1. Informasi Server & Base URL

- **Development URL:** `http://127.0.0.1:8000/api/v1`
- **Database Engine:** MySQL 8.0 (Laragon) — `project-skripsi_ob`
- **Header Standar:**
  ```http
  Accept: application/json
  Content-Type: application/json
  ```

---

## 2. Ringkasan Endpoint API

### A. Health & Server Status
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/health` | Memeriksa status kesehatan server dan koneksi MySQL live |

### B. Master Data
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/products` | Daftar katalog produk ban baru, velg, dan ban dalam |
| `POST` | `/products` | Tambah produk baru beserta batch stok awal FIFO |
| `GET` | `/products/{id}` | Detail produk, batch aktif, dan riwayat mutasi |
| `PUT` | `/products/{id}` | Perbarui data spesifikasi produk |
| `DELETE` | `/products/{id}` | Hapus produk (dilindungi jika memiliki riwayat penjualan) |
| `GET` | `/services` | Daftar master jasa bengkel (Spooring, Balancing, dll) |
| `POST` | `/services` | Tambah master jasa bengkel |
| `GET` | `/suppliers` | Daftar supplier & distributor ban resmi |
| `POST` | `/suppliers` | Tambah supplier distributor baru |
| `GET` | `/accounts` | Daftar 21 Akun Bagan Akun Standar (COA SAK EMKM) |

### C. Modul POS (Point of Sale) & Kasir
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/pos/checkout` | **Transaksi Kasir Atomik**: Validasi stok, alokasi FIFO batch, pemotongan kuantitas, penerbitan faktur `OB3-INV-YYYYMM-XXXX`, dan **Auto-Journaling SAK EMKM** (Debit Kas/Bank, Kredit Penjualan + Debit HPP, Kredit Persediaan) dalam blok `DB::transaction()`. |
| `GET` | `/pos/transactions` | Riwayat seluruh faktur penjualan kasir dengan filter tanggal & pencarian |
| `GET` | `/pos/transactions/{id}` | Detail transaksi, item penjualan, alokasi batch FIFO, dan ayat jurnal terkait |

### D. Modul Inventori & Restock
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/inventory/restock` | Penerimaan stok ban masuk (Goods Receipt): Menerbitkan batch baru, mencatat kartu stok masuk, dan membukukan jurnal pembelian (Persediaan vs Kas/Bank/Hutang). |
| `GET` | `/inventory/stock-movements` | Kartu stok mutasi masuk, keluar, dan penyesuaian opname |
| `POST` | `/inventory/stock-opname` | Penyesuaian stok fisik gudang vs sistem |

### E. Modul Pengeluaran (Expenses / BKK)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/expense-categories` | Daftar kategori beban operasional bengkel terpetakan ke akun COA |
| `GET` | `/expenses` | Daftar riwayat pengeluaran kas keluar (BKK) |
| `POST` | `/expenses` | Buat Bukti Kas Keluar baru `BKK-YYYYMM-XXXX` + Jurnal Beban otomatis |
| `POST` | `/expenses/{id}/void` | **Pembatalan / VOID**: Mengubah status menjadi VOID dan menerbitkan **Jurnal Pembalik (Reversal Journal)** untuk mengembalikan saldo kas/bank |

### F. Modul Akuntansi SAK EMKM (Accounting Hub)
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `GET` | `/accounting/journals` | Jurnal Umum kronologis lengkap dengan filter referensi |
| `POST` | `/accounting/journals/manual` | Form input jurnal memorial penyesuaian (Validasi $\sum \text{Debit} = \sum \text{Kredit}$) |
| `GET` | `/accounting/general-ledger` | Buku besar per akun COA (Saldo Awal, Mutasi, dan Saldo Berjalan / *Running Balance*) |
| `GET` | `/accounting/trial-balance` | Neraca Saldo kompilasi akun dengan verifikasi keseimbangan otomatis ($\Delta = 0$) |
| `GET` | `/accounting/accounts-payable` | Buku Pembantu Hutang distributor (Bridgestone, Dunlop, dll) |
| `POST` | `/accounting/accounts-payable/pay` | Pelunasan hutang supplier + Auto-Journaling pelunasan |
| `GET` | `/accounting/financial-statements` | **Laporan Keuangan SAK EMKM Lengkap**: Laporan Laba Rugi dan Laporan Posisi Keuangan (Neraca seimbang) |

---

## 3. Contoh Payload Transaksi Utama

### A. POST `/pos/checkout`
```json
{
  "customer_name": "Denny Sumargo",
  "vehicle_plate": "B 1234 SKZ",
  "cashier_name": "Fani A.",
  "payment_method": "TUNAI",
  "paid_amount": 3000000,
  "discount_amount": 50000,
  "tax_amount": 0,
  "items": [
    {
      "product_id": 1,
      "name": "Bridgestone Turanza T005A 195/65 R15",
      "quantity": 2,
      "unit_price": 950000,
      "sub_total": 1900000
    }
  ]
}
```

### B. POST `/inventory/restock`
```json
{
  "product_id": 1,
  "quantity": 10,
  "batch_cost": 720000,
  "source_name": "PT Bridgestone Tire Indonesia",
  "purchase_date": "2026-09-05",
  "payment_method": "TEMPO"
}
```

### C. POST `/expenses`
```json
{
  "expense_date": "2026-09-05",
  "category_id": 1,
  "amount": 250000,
  "payment_method": "KAS_LACI",
  "recipient_name": "Toko Listrik Sejahtera",
  "description": "Penggantian lampu sorot pit spooring",
  "approved_by": "Owner Omah Ban"
}
```
