# Dokumentasi REST API: Omah Ban POS & SIA SAK EMKM Cabang 3

Dokumentasi antarmuka REST API sistem **Omah Ban POS & Sistem Informasi Akuntansi (SIA) Cabang 3**
(Laravel 13, PHP 8.3, Sanctum, MySQL 8 `project-skripsi_ob`).

Sumber kebenaran adalah `backend/routes/api.php`. Daftar di bawah dicocokkan dengan
`cd backend && php artisan route:list --path=api` (110 route) per 2026-10-05. Bila keduanya berbeda, kode yang benar.

---

## 1. Konvensi Umum

### Base URL & header
- **Development:** `http://127.0.0.1:8000/api/v1` (semua route berada di prefix `/api/v1`).
- **Header standar:**
  ```http
  Accept: application/json
  Content-Type: application/json
  Authorization: Bearer <token>
  ```
  Endpoint unggah berkas (`/expenses`, `/stock/import-preview`, `/accounting/bank-reconciliation/import`) memakai
  `multipart/form-data`.

### Autentikasi (Sanctum bearer token)
- Ambil token lewat `POST /auth/login` dengan `{login, password}`; `login` boleh username atau email (tidak peka huruf besar).
- Kirim token di header `Authorization: Bearer <token>` pada setiap request terlindungi.
- Token adalah personal access token Sanctum bernama `pos-session`, kedaluwarsa setelah `SANCTUM_EXPIRATION`
  menit (default 720). `POST /auth/logout` mencabut token yang sedang dipakai.
- Login dibatasi 5 percobaan per menit per kombinasi login + IP (`throttle:login`).
- CORS mengizinkan semua origin tanpa credentials (token, bukan cookie).

### Izin (permission)
- Route terlindungi memakai middleware `permission:a,b`: pengguna cukup memiliki **salah satu** kunci yang disebut.
- Role **OWNER selalu lolos** semua pemeriksaan izin. Izin KASIR/GUDANG diatur lewat `PUT /settings/role-permissions`.
- Daftar kunci ada di `backend/app/Support/Permissions.php` (harus sama dengan `PermissionKey` di frontend).
- Deny-by-default: route tanpa kunci yang cocok ditolak.

### Format respons
- **Sukses:** amplop `{ "success": true, "message"?: "...", "data": ... }`. Pembuatan data mengembalikan **201**.
- Pengecualian amplop: `GET /health`, `POST /auth/login` (`{token, expires_at, user}`), `GET /auth/me` (`{user}`),
  `POST /auth/logout` (204 tanpa body), dan unduhan berkas (`/stock/template`, `/reports/stock-monthly/export`).
- Pesan galat berbahasa Indonesia karena ditampilkan apa adanya di UI.

### Kode galat
| Status | Kapan | Body |
|---|---|---|
| 401 | Tanpa token / token tidak valid atau kedaluwarsa | `{"message":"Unauthenticated."}` |
| 403 | Kunci izin tidak dimiliki | `{"message":"Anda tidak memiliki izin untuk aksi ini."}` |
| 404 | Data atau route tidak ada | `{"message":"..."}` |
| 422 | Pelanggaran aturan bisnis (`PosRuleException`, juga `AccountingUnbalancedException`) | `{"message":"..."}` |
| 422 | Validasi request gagal | `{"message":"...", "errors":{"field":["..."]}}` |
| 422 | Login gagal | `{"message":"Username atau password salah."}` |
| 429 | Batas percobaan login terlampaui | `{"message":"..."}` |

### Sorotan aturan bisnis
- **Setiap nota lunas saat checkout.** Total pembayaran harus sama persis dengan tagihan; BON (piutang), booking DP,
  dan metode EDC/kartu ditolak 422. Metode yang diterima: `TUNAI`, `TRANSFER`, `TRANSFER_BCA`, `QRIS` (bisa split).
- **Tanpa PPN pada penjualan.** Toko non-PKP: tidak ada field pajak di checkout. PPN hanya ada di faktur supplier
  (`ppn_amount` pada penerimaan barang) dan dikapitalisasi ke harga pokok persediaan.
- **Harga jual produk katalog harus > 0.** Checkout menolak produk katalog yang `product_price`-nya masih Rp 0.
  Barang wajib terdaftar di katalog; item manual hanya untuk jasa.
- **Penjualan melebihi lapisan FIFO ditolak (422).** HPP hanya dihitung dari batch FIFO; bila sisa batch kurang dari
  jumlah yang dijual, lakukan stock opname dulu.
- **Saldo kas laci (1-1000) dan bank (1-1001) tidak pernah boleh negatif (422)**, termasuk bila jurnal bertanggal
  mundur membuat saldo hari-hari sesudahnya negatif.
- **Tanggal pada atau sebelum tanggal kunci periode ditolak (422).** Setelah periode ditutup, tidak ada jurnal yang
  boleh bertanggal sampai akhir periode itu.
- **Jurnal selalu seimbang.** Semua posting lewat `AccountingEngine::createEntry` (Σdebit = Σkredit sampai sen).
- **Pembayaran TUNAI dan retur penjualan memerlukan shift kasir yang OPEN** (`/cash-sessions/open`).
- **Nomor dokumen** berformat `PREFIX-YYYYMM-####` (mis. `OB3-INV`, `RTJ`, `GR`, `BKK`, `KAS`, `JRN`).

---

## 2. Daftar Endpoint

Kolom **Izin** = kunci permission (cukup salah satu). "—" = publik; "login" = cukup terautentikasi.

### A. Publik & autentikasi
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/health` | — | Status server dan konektivitas database |
| POST | `/auth/login` | — (throttle) | Login, menerbitkan bearer token |
| POST | `/payment/midtrans/webhook` | — (signature sha512) | Notifikasi Midtrans; 403 bila signature salah atau server key tidak diset |
| POST | `/auth/logout` | login | Cabut token saat ini (204) |
| GET | `/auth/me` | login | Profil pengguna + peta `permissions` |

### B. POS, void, retur penjualan, QRIS
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/pos/payment-options` | `pos` | Provider bank & QRIS aktif untuk kasir |
| POST | `/pos/checkout` | `pos` | Checkout atomik: FIFO, nota `OB3-INV`, jurnal `POS_SALE` |
| GET | `/pos/transactions` | `pos`, `receipt` | Riwayat nota (`search`, `date`, `limit` ≤ 500, default 200) |
| GET | `/pos/transactions/{id}` | `pos`, `receipt` | Detail nota + pembayaran, retur, jurnal |
| POST | `/pos/transactions/{id}/void` | `sale_void` | Batalkan nota (`reason` min 5 karakter); 422 bila nota sudah punya retur |
| POST | `/pos/transactions/{id}/returns` | `sales_return` | Retur sebagian, refund tunai dari laci (`RTJ`) |
| POST | `/payment/qris/charge` | `pos` | Buat order QRIS dinamis Midtrans |
| POST | `/payment/qris/simulate/{orderId}` | `pos` | Simulasi pelunasan (403 kecuali `MIDTRANS_ALLOW_SIMULATION=true`) |
| GET | `/payment/qris/status/{orderId}` | `pos` | Cek status order QRIS |

### C. Shift kasir & mutasi kas
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/cash-sessions/current` | `cash_session`, `cash_session_approve` | Shift yang sedang terbuka + saldo buku laci |
| POST | `/cash-sessions/open` | `cash_session` | Buka shift (`opening_float`, `opening_note?`; catatan wajib bila ≠ saldo buku) |
| POST | `/cash-sessions/{id}/close` | `cash_session` | Tutup shift (`counted_cash`, `variance_reason?`) → `PENDING_APPROVAL` |
| GET | `/cash-sessions` | `cash_session_approve` | 30 shift terbaru (filter `status`) |
| POST | `/cash-sessions/{id}/approve` | `cash_session_approve` | Setujui shift; selisih dijurnal ke 6-1010 |
| GET | `/cash-movements` | `cash_movement` | 50 jurnal setoran/prive/modal terbaru |
| POST | `/cash-movements` | `cash_movement` | Setor laci ke bank, prive, atau setoran modal |
| GET | `/accounting/cash-balances` | `expenses`, `accounting_hub`, `financial_reports`, `cash_session` | Saldo 1-1000 dan 1-1001 hari ini |

### D. Master data: produk, kategori, jasa, supplier, akun
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/products` | `pos`, `inventory_view` | Katalog produk |
| GET | `/products/{product}` | `pos`, `inventory_view` | Detail produk |
| POST | `/products` | `inventory_manage` | Tambah produk (+ `initial_batch` opsional) |
| PUT/PATCH | `/products/{product}` | `inventory_manage` | Ubah produk (stok tidak bisa diubah di sini) |
| DELETE | `/products/{product}` | `inventory_manage` | Hapus, atau nonaktifkan/tolak 422 bila sudah dipakai |
| GET | `/product-categories` | `pos`, `inventory_view` | Daftar kategori produk |
| POST | `/product-categories` | `inventory_manage` | Tambah kategori produk |
| PUT/PATCH | `/product-categories/{product_category}` | `inventory_manage` | Ubah kategori produk |
| DELETE | `/product-categories/{product_category}` | `inventory_manage` | Hapus kategori produk (ditolak bila dipakai) |
| GET | `/services` | `pos`, `inventory_view` | Daftar master jasa |
| GET | `/services/{service}` | `pos`, `inventory_view` | Detail jasa |
| POST | `/services` | `inventory_manage` | Tambah jasa |
| PUT/PATCH | `/services/{service}` | `inventory_manage` | Ubah jasa |
| DELETE | `/services/{service}` | `inventory_manage` | Hapus/nonaktifkan jasa |
| GET | `/service-categories` | `pos`, `inventory_view` | Daftar kategori jasa |
| POST | `/service-categories` | `inventory_manage` | Tambah kategori jasa |
| PUT/PATCH | `/service-categories/{service_category}` | `inventory_manage` | Ubah kategori jasa |
| DELETE | `/service-categories/{service_category}` | `inventory_manage` | Hapus kategori jasa (ditolak bila dipakai) |
| GET | `/suppliers` | `pos`, `inventory_view` | Daftar supplier |
| GET | `/suppliers/{supplier}` | `pos`, `inventory_view` | Detail supplier |
| POST | `/suppliers` | `inventory_manage` | Tambah supplier |
| PUT/PATCH | `/suppliers/{supplier}` | `inventory_manage` | Ubah supplier |
| DELETE | `/suppliers/{supplier}` | `inventory_manage` | Hapus/nonaktifkan supplier |
| GET | `/accounts` | `pos`, `inventory_view`, `accounting_hub`, `financial_reports`, `expenses` | Bagan akun (COA) |

### E. Inventori: penerimaan barang, hutang, retur pembelian, opname, valuasi, Excel stok
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| POST | `/inventory/restock` | `goods_receipt` | Penerimaan barang (`GR`): batch FIFO baru + jurnal `PURCHASE` |
| GET | `/purchases` | `goods_receipt`, `accounts_payable`, `purchase_return` | Dokumen pembelian (`status=open` = TEMPO belum lunas) |
| POST | `/purchases/{id}/payments` | `accounts_payable` | Bayar hutang per faktur (`amount`, `account_code` 1-1000/1-1001, `payment_date?`) |
| POST | `/purchases/{id}/returns` | `purchase_return` | Retur ke supplier (`quantity`, `reason`, `refund_account_code?`) |
| POST | `/purchases/{id}/cancel` | `purchase_return` | Batalkan penerimaan yang belum tersentuh (`reason`) |
| GET | `/accounting/accounts-payable` | `accounts_payable` | Buku pembantu hutang supplier |
| POST | `/accounting/accounts-payable/pay` | `accounts_payable` | Pelunasan per supplier (jalur lama; UI memakai `/purchases/{id}/payments`) |
| GET | `/inventory/stock-movements` | `inventory_view` | Kartu stok (mutasi masuk/keluar/penyesuaian) |
| GET | `/inventory/valuation` | `inventory_view` | Nilai FIFO vs saldo 1-2000 + `opening_posted` |
| POST | `/inventory/opening-balance` | `accounting_hub` | Saldo awal persediaan (sekali saja, menandai go-live; 422 bila sudah) |
| POST | `/inventory/stock-opname` | `stock_opname` | Opname fisik (`items[{product_id, physical_qty}]`, `notes?`) |
| POST | `/stock/import-preview` | `stock_opname` | Unggah Excel stok (multipart `excel_file`, `qty_column` G/H) ke staging |
| GET | `/stock/staging` | `stock_opname` | Isi staging impor |
| POST | `/stock/resolve-brand` | `stock_opname` | Petakan merek yang belum dikenal |
| POST | `/stock/resolve-name` | `stock_opname` | Petakan nama produk yang belum cocok |
| POST | `/stock/ignore-unresolved` | `stock_opname` | Abaikan baris yang tidak terselesaikan |
| POST | `/stock/commit` | `stock_opname` | Terapkan staging ke stok (ditolak setelah go-live) |
| POST | `/stock/bulk-update` | `stock_opname` | Pembaruan stok terpilih (ditolak setelah go-live) |
| POST | `/stock/reconciliation/bulk-update` | `stock_opname` | Alias `/stock/bulk-update` |
| GET | `/stock/template` | `stock_opname` | Unduh template Excel |
| GET | `/reports/stock-monthly` | `inventory_view` | Buku stok bulanan (`month`, `brand`) |
| GET | `/reports/stock-monthly/export` | `inventory_view` | Ekspor buku stok bulanan (CSV) |
| POST | `/reports/stock-monthly/inline-update` | `stock_opname` | Koreksi baris buku stok bulanan |

### F. Pengeluaran (BKK)
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/expense-categories` | `expenses` | Kategori beban (terpetakan ke 6-1000…6-1008) |
| GET | `/expenses` | `expenses` | Daftar pengeluaran (`search, category_id, status, start_date, end_date, per_page`; paginasi) |
| GET | `/expenses/{id}` | `expenses` | Detail pengeluaran |
| POST | `/expenses` | `expenses` | Buat BKK + jurnal beban (multipart) |
| POST | `/expenses/{id}/void` | `expenses` | VOID (`reason`) + jurnal pembalik `VOID_EXPENSE` |

### G. Akuntansi: jurnal, buku besar, neraca saldo, laporan, saldo awal, tutup buku
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/accounting/journals` | `accounting_hub` | Jurnal umum (`start_date, end_date, types, search, account_code, page, per_page` ≤ 100) |
| POST | `/accounting/journals/manual` | `accounting_hub` | Jurnal penyesuaian manual (`date` ≤ hari ini, `description`, `items[{account_code, debit, credit, note}]`); akun kontrol ditolak |
| POST | `/accounting/journals/{entryNumber}/reverse` | `accounting_hub` | Balik jurnal manual (`reason`); hanya `MANUAL_ADJUSTMENT`, sekali |
| GET | `/accounting/general-ledger` | `accounting_hub` | Buku besar per akun (`account_code, start_date, end_date`) |
| GET | `/accounting/trial-balance` | `accounting_hub` | Neraca saldo (`as_of`) |
| GET | `/accounting/financial-statements` | `financial_reports`, `accounting_hub` | Laba rugi, posisi keuangan, perubahan ekuitas (`start_date, end_date`) |
| GET | `/accounting/cash-flow` | `financial_reports`, `accounting_hub` | Arus kas metode langsung (`start_date, end_date`) |
| GET | `/accounting/opening-balance` | `accounting_hub` | Status saldo awal akun |
| POST | `/accounting/opening-balance` | `accounting_hub` | Saldo awal akun (`date`, `balances{code: amount}`); sekali (`ACCOUNT_OPENING`) |
| GET | `/accounting/periods` | `accounting_hub` | Tanggal kunci, riwayat tutup buku, periode yang disarankan |
| POST | `/accounting/periods/close` | `accounting_hub` | Tutup periode (`period` YYYY-MM, `notes`); hanya bulan yang sudah lewat, 422 bila penyusutan belum diposting |
| POST | `/accounting/periods/{period}/reopen` | `accounting_hub` + role OWNER | Buka kembali periode terakhir yang ditutup (`reason`) |

### H. SAK EMKM: aset tetap, penyusutan, AJP, rekonsiliasi bank, CALK
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/accounting/fixed-assets` | `fixed_assets` | Register aset tetap + ringkasan vs 1-3000/1-3999 |
| POST | `/accounting/fixed-assets` | `fixed_assets` | Tambah aset (funding `TUNAI`/`TRANSFER`/`OPENING`) |
| POST | `/accounting/fixed-assets/{id}/void` | `fixed_assets` | Batalkan aset (`reason`) + jurnal pembalik |
| GET | `/accounting/fixed-assets/depreciation` | `fixed_assets` | Pratinjau penyusutan (`period` YYYY-MM) |
| POST | `/accounting/fixed-assets/depreciation` | `fixed_assets` | Posting penyusutan periode (201, atau 200 bila tidak ada) |
| POST | `/accounting/adjusting-entries` | `accounting_hub` | AJP akrual/dibayar dimuka (`period, kind, account_code 6-xxxx, amount, description, auto_reverse`) |
| GET | `/accounting/bank-reconciliation` | `bank_reconciliation` | Laporan rekonsiliasi bank (`period`) |
| PUT | `/accounting/bank-reconciliation/{period}` | `bank_reconciliation` | Simpan saldo akhir rekening koran (`statement_ending_balance`) |
| POST | `/accounting/bank-reconciliation/lines` | `bank_reconciliation` | Tambah baris mutasi rekening koran |
| POST | `/accounting/bank-reconciliation/import` | `bank_reconciliation` | Impor CSV rekening koran (multipart `file`: `tanggal,keterangan,jumlah`) |
| POST | `/accounting/bank-reconciliation/auto-match` | `bank_reconciliation` | Cocokkan otomatis baris vs jurnal (`period`) |
| DELETE | `/accounting/bank-reconciliation/lines/{id}` | `bank_reconciliation` | Hapus baris rekening koran |
| POST | `/accounting/bank-reconciliation/lines/{id}/match` | `bank_reconciliation` | Cocokkan manual dengan `journal_item_id` |
| POST | `/accounting/bank-reconciliation/lines/{id}/unmatch` | `bank_reconciliation` | Lepas pencocokan |
| POST | `/accounting/bank-reconciliation/lines/{id}/post-adjustment` | `bank_reconciliation` | Jurnal penyesuaian dari baris (biaya/bunga bank) |
| GET | `/reports/calk` | `financial_reports`, `accounting_hub` | Catatan atas Laporan Keuangan (`period`) |

### I. Laporan harian
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/reports/daily-recap` | `dashboard`, `financial_reports` | Rekap harian `from`–`to` (≤ 92 hari) dari jurnal POSTED |
| GET | `/reports/daily-cash` | `daily_reports` | Laporan kas harian (`date`); tanpa `financial_reports` hanya data kasir sendiri (`scope: "cashier"`) |

### J. Pengaturan & izin
| Method | Path | Izin | Fungsi |
|---|---|---|---|
| GET | `/settings/role-permissions` | login | Matriks izin KASIR/GUDANG (sengaja terbaca semua role) |
| PUT | `/settings/role-permissions` | `role_settings` | Ubah matriks `{KASIR:{key:bool}, GUDANG:{key:bool}}`; OWNER diabaikan, kunci asing 422 |
| GET | `/settings/payment-providers` | `role_settings`, `pos` | Daftar provider bank/QRIS (+ MDR) |
| POST | `/settings/payment-providers` | `role_settings` | Tambah provider |
| PUT | `/settings/payment-providers/{id}` | `role_settings` | Ubah provider |
| DELETE | `/settings/payment-providers/{id}` | `role_settings` | Hapus provider |

Endpoint booking DP, piutang BON, dan pengaturan EDC dihapus pada 2026-09-30 dan kini 404.

---

## 3. Contoh Request & Respons

Contoh diambil dari aturan validasi di FormRequest/controller. Nilai `data` disingkat (`...`) bila panjang.

### A. `POST /auth/login`
Validasi: `login` wajib (string ≤ 255), `password` wajib.
```json
{ "login": "kasir1", "password": "********" }
```
Respons 200 (tanpa amplop `success`):
```json
{
  "token": "12|9f3c...",
  "expires_at": "2026-10-06T08:00:00+07:00",
  "user": {
    "id": 2, "username": "kasir1", "name": "Fani", "email": "kasir1@example.test",
    "role": "KASIR", "phone": null, "branch_name": "...", "is_active": true,
    "permissions": { "pos": true, "receipt": true, "expenses": false, "...": "..." }
  }
}
```
Gagal: 422 `{"message":"Username atau password salah."}` (pesan sama untuk akun tidak ada, nonaktif, atau password salah).

### B. `POST /pos/checkout`
Klien hanya mengirim baris keranjang dan pembayaran; subtotal, diskon, total, HPP FIFO, fee MDR, nama kasir, dan
nomor nota dihitung server. Tidak ada field pajak, `paid_amount`, atau `cashier_name`.

Validasi (`PosCheckoutRequest`):
- `items` wajib, min 1. Per baris: `type` `PRODUCT`|`SERVICE`, `name` wajib, `quantity` integer ≥ 1,
  `unit_price` ≥ 0; opsional `product_id`, `service_id`, `discount_per_item` ≥ 0, `is_manual`, `cost_price`.
- Opsional: `customer_name`, `customer_phone`, `vehicle_plate`, `vehicle_model`, `notes`, `discount_amount` ≥ 0 (diskon nota).
- `payments[]`: `method` `TUNAI`|`TRANSFER`|`TRANSFER_BCA`|`QRIS`, `amount` ≥ 0,01; opsional `tendered` (uang diterima
  untuk TUNAI), `provider_id` (wajib untuk QRIS), `reference` (order ID QRIS dinamis).
- Dilarang (422): `booking_id`, `bon`, `payments.*.fee_percentage`.

Aturan server: Σ`payments.amount` harus sama dengan tagihan; `tendered` TUNAI ≥ `amount`; TUNAI butuh shift OPEN;
order QRIS dinamis harus sudah lunas, belum dipakai, dan nominalnya sama; produk katalog harus aktif, berharga > 0,
stoknya cukup, dan lapisan FIFO-nya cukup.

```json
{
  "customer_name": "Budi",
  "vehicle_plate": "AA 1234 XY",
  "discount_amount": 0,
  "items": [
    { "type": "PRODUCT", "product_id": 1, "name": "Bridgestone Turanza T005A 195/65 R15", "quantity": 2, "unit_price": 950000, "discount_per_item": 0 },
    { "type": "SERVICE", "service_id": 3, "name": "Spooring", "quantity": 1, "unit_price": 100000 }
  ],
  "payments": [
    { "method": "TUNAI", "amount": 1000000, "tendered": 1000000 },
    { "method": "QRIS", "amount": 1000000, "provider_id": 2, "reference": "OB3-QRIS-..." }
  ]
}
```
Respons 201:
```json
{
  "success": true,
  "message": "Nota OB3-INV-202610-0001 berhasil dibukukan.",
  "data": {
    "id": 101, "reference": "OB3-INV-202610-0001", "date": "2026-10-05", "status": "LUNAS",
    "gross_sales_amount": 2000000, "discount_amount": 0, "total_amount": 2000000,
    "paid_amount": 2000000, "change_amount": 0, "payment_method": "SPLIT",
    "fee_amount": 7000, "net_received": 1993000, "total_hpp": 1440000, "total_profit": 560000,
    "returned_amount": 0, "returns": [],
    "items": [ { "id": 501, "item_type": "PRODUCT", "quantity": 2, "unit_price": 950000, "sub_total": 1900000, "returned_qty": 0, "...": "..." } ],
    "payments": [ { "method": "TUNAI", "account_code": "1-1000", "amount": 1000000, "...": "..." } ],
    "journals": [ { "entry_number": "JRN-202610-0001", "reference_type": "POS_SALE", "lines": [ "..." ] } ]
  }
}
```
Contoh 422: `{"message":"Total pembayaran (Rp 1.900.000) tidak sama dengan tagihan (Rp 2.000.000)."}`,
`{"message":"Harga jual ... masih Rp 0. Isi harga jualnya di katalog dulu."}`,
`{"message":"Stok ... hanya punya 1 unit berlapis biaya FIFO (diminta 2). Lakukan stock opname untuk menyelaraskan stok."}`.

### C. `POST /pos/transactions/{id}/returns` (retur penjualan)
Validasi: `reason` wajib (5–255 karakter); `items` min 1, per baris `sale_detail_id` (integer, unik) dan `quantity` ≥ 1.
Refund selalu tunai dari laci, jadi butuh shift OPEN. Jurnal `SALES_RETURN`: Dr 4-9100 / Cr 1-1000 sebesar refund,
Dr 1-2000 / Cr 5-1000 sebesar HPP yang dibalik ke batch asal.
```json
{ "reason": "Ukuran ban tidak sesuai", "items": [ { "sale_detail_id": 501, "quantity": 1 } ] }
```
Respons 201:
```json
{
  "success": true,
  "message": "Retur RTJ-202610-0001 dibukukan. Serahkan refund tunai Rp 950.000.",
  "data": {
    "sale": { "id": 101, "reference": "OB3-INV-202610-0001", "returned_amount": 950000, "...": "..." },
    "sales_return": {
      "id": 7, "reference": "RTJ-202610-0001", "return_date": "2026-10-05", "reason": "Ukuran ban tidak sesuai",
      "refund_amount": 950000, "cost_amount": 720000, "journal_entry_number": "JRN-202610-0002",
      "operator_name": "Fani", "items": [ { "sale_detail_id": 501, "quantity": 1, "refund_amount": 950000, "cost_amount": 720000 } ]
    },
    "journal": { "entry_number": "JRN-202610-0002", "reference_type": "SALES_RETURN", "lines": [ "..." ] }
  }
}
```
422 bila: shift belum dibuka, nota VOID, baris bukan milik nota, jumlah melebihi sisa yang bisa diretur, atau jejak
batch FIFO baris tidak lengkap.

### D. `POST /inventory/restock` (penerimaan barang)
Validasi: `product_id` wajib (ada), `quantity` integer ≥ 1, `batch_cost` ≥ 0 (modal per unit, termasuk PPN masukan),
`payment_method` `TUNAI`|`TRANSFER_BCA`|`TEMPO`, `source_name` wajib bila tanpa `supplier_id`; opsional
`supplier_id`, `invoice_total`, `dpp_amount`, `ppn_amount`, `supplier_invoice`, `purchase_date` (≤ hari ini, default hari
ini), `due_date` (TEMPO; default tanggal + termin supplier atau 30 hari), `notes`.

Aturan: bila `invoice_total` dikirim, harus > 0 dan cocok dengan `quantity × batch_cost` (toleransi Rp 1); 1-2000 dan
kas/hutang dibukukan persis sebesar total faktur (sisa sen dibagi ke batch terakhir). Bila `dpp_amount` dan
`ppn_amount` keduanya dikirim, jumlahnya harus sama dengan total. Jurnal: Dr 1-2000 / Cr 1-1000 (TUNAI), 1-1001
(TRANSFER_BCA), atau 2-1000 (TEMPO). Barang bonus (modal Rp 0) tidak dijurnal.
```json
{
  "product_id": 1,
  "quantity": 10,
  "batch_cost": 720000,
  "invoice_total": 7200000,
  "dpp_amount": 6486486.49,
  "ppn_amount": 713513.51,
  "supplier_id": 4,
  "supplier_invoice": "INV/BS/2026/0912",
  "purchase_date": "2026-10-05",
  "payment_method": "TEMPO"
}
```
Respons 201:
```json
{
  "success": true,
  "message": "Penerimaan barang GR-202610-0001 dibukukan.",
  "data": {
    "purchase": {
      "id": 31, "purchase_number": "GR-202610-0001", "supplier_name": "...", "purchase_date": "2026-10-05",
      "payment_method": "TEMPO", "due_date": "2026-11-04", "total_amount": 7200000,
      "dpp_amount": 6486486.49, "ppn_amount": 713513.51, "paid_amount": 0, "remaining_amount": 7200000,
      "quantity": 10, "returnable_qty": 10, "status": "BELUM_LUNAS", "journal_entry_number": "JRN-202610-0003", "...": "..."
    },
    "batch": { "batch_code": "...", "initial_qty": 10, "remaining_qty": 10, "batch_cost": 720000, "...": "..." },
    "journal_entry_number": "JRN-202610-0003",
    "journal": { "reference_type": "PURCHASE", "lines": [ { "account_code": "1-2000", "debit": 7200000 }, { "account_code": "2-1000", "credit": 7200000 } ] }
  }
}
```

### E. `POST /expenses` (multipart/form-data)
Validasi (`ExpenseRequest`): `expense_date` `Y-m-d` ≤ hari ini, `category_id` (ada di `expense_categories`),
`amount` 1–1.000.000.000, `payment_method` `TUNAI`|`KAS_LACI` (→ 1-1000) atau `TRANSFER_BCA`|`BANK_BCA` (→ 1-1001),
`recipient_name` (≤ 120), `description` (≤ 1000); opsional `bank_name`, `attachment` (jpeg/png/jpg/webp/pdf, ≤ 5 MB).
Jurnal: Dr akun beban kategori / Cr kas atau bank; 422 bila saldo kas/bank jadi negatif atau tanggal terkunci.
```
expense_date=2026-10-05
category_id=2
amount=250000
payment_method=KAS_LACI
recipient_name=Toko Listrik Sejahtera
description=Penggantian lampu sorot pit spooring
attachment=@nota.jpg
```
Respons 201:
```json
{
  "success": true,
  "message": "Pengeluaran BKK-202610-0001 dibukukan.",
  "data": {
    "expense": {
      "id": 12, "reference": "BKK-202610-0001", "expense_date": "2026-10-05",
      "category": { "id": 2, "...": "..." }, "amount": 250000, "payment_method": "KAS_LACI",
      "recipient_name": "Toko Listrik Sejahtera", "description": "Penggantian lampu sorot pit spooring",
      "attachment_url": "...", "status": "ACTIVE", "...": "..."
    },
    "journals": [ { "entry_number": "JRN-202610-0004", "lines": [ "..." ] } ]
  }
}
```

### F. `POST /cash-movements`
Validasi: `type` `DEPOSIT`|`DRAWING`|`CAPITAL`, `date` `Y-m-d` ≤ hari ini, `amount` 1–999.999.999.999,
`description` (≤ 255), `account_code` `1-1000`|`1-1001` (wajib kecuali `DEPOSIT`).

| `type` | Jurnal |
|---|---|
| `DEPOSIT` | Dr 1-1001 / Cr 1-1000 (setor kas laci ke bank) |
| `DRAWING` | Dr 3-3000 Prive / Cr `account_code` |
| `CAPITAL` | Dr `account_code` / Cr 3-1000 Modal |

```json
{ "type": "DEPOSIT", "date": "2026-10-05", "amount": 2000000, "description": "Setor kas laci ke BCA" }
```
Respons 201 (`data` = objek jurnal):
```json
{
  "success": true,
  "message": "Mutasi kas KAS-202610-0001 dibukukan (JRN-202610-0005).",
  "data": {
    "id": 88, "entry_number": "JRN-202610-0005", "entry_date": "2026-10-05",
    "reference_type": "CASH_DEPOSIT", "reference_id": "KAS-202610-0001",
    "description": "Setor kas laci ke BCA", "total_debit": 2000000, "total_credit": 2000000,
    "reversal_of": null, "reversed_by": null, "can_reverse": false, "created_by_name": "Owner",
    "lines": [
      { "account_code": "1-1001", "account_name": "Bank BCA Cabang 3", "debit": 2000000, "credit": 0, "note": "Setoran dari kas laci" },
      { "account_code": "1-1000", "account_name": "Kas Toko Laci Kasir", "debit": 0, "credit": 2000000, "note": "Kas laci disetor ke bank" }
    ]
  }
}
```
Contoh 422 saldo negatif: `{"message":"Saldo 1-1000 Kas Toko Laci Kasir tidak cukup: transaksi ini membuat saldo per 05/10/2026 menjadi Rp -500.000. Catat dulu uang masuknya atau kurangi nominal."}`.
Contoh 422 periode terkunci: `{"message":"Periode sampai 2026-09-30 sudah ditutup; transaksi bertanggal 2026-09-15 tidak dapat dibukukan."}`.

---

## 4. Perintah Konsol Terkait
- `php artisan inventory:opening-balance`: bukukan selisih nilai FIFO vs saldo 1-2000 terhadap 3-1000, sekali per database (menandai go-live).
- `php artisan stock:opname --file= --period= [--qty-column=] [--dry-run] [--force]`: versi CLI dari commit Excel stok.
