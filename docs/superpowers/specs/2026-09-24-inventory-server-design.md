# Spesifikasi Desain: Tahap 3 — Inventori di Server (Master Data, Penerimaan Barang, Opname Berjurnal, Saldo Awal, Hutang Supplier)

**Tanggal:** 24 September 2026
**Konteks:** Tahap 3 migrasi menuju Laravel + MySQL sebagai sumber kebenaran tunggal. Dibangun di atas Tahap 1 (auth) dan Tahap 2 (POS).

## 1. Masalah

- Tambah/ubah/hapus produk, jasa, supplier, kategori produk dan kategori jasa diproses di browser; produk/jasa/supplier hilang saat reload, kategori hanya di localStorage.
- Penerimaan barang (restock) dan stock opname dihitung di browser; jurnal pembelian dibuat di browser.
- Stok berubah tanpa jurnal di server: opname sederhana, commit Excel, bulk update, edit inline buku stok, dan stok awal produk baru. Akun Persediaan `1-2000` tidak pernah sama dengan nilai stok FIFO; saldo awal persediaan (± Rp 1,085 M) belum pernah dijurnal sehingga `1-2000` minus.
- Opname sederhana menimpa `product_quantity` tanpa menyentuh batch FIFO.
- Laporan hutang supplier menjumlahkan semua batch yang namanya cocok (termasuk pembelian tunai & stok awal).
- Kartu stok (mutasi) di UI berasal dari browser, bukan `stock_movements`.

## 2. Keputusan

| Topik | Keputusan |
|---|---|
| Satu mekanisme jurnal selisih | Setiap operasi yang mengubah stok/biaya di luar penjualan & pembelian dibungkus `InventoryValueJournal`: nilai FIFO (Σ sisa × biaya batch) produk terkait diukur sebelum dan sesudah, selisihnya dijurnal |
| Akun lawan selisih | Opname / rekonsiliasi / edit inline / bulk update → akun baru **`5-2000 Selisih Persediaan (Opname)`** (beban; surplus mengurangi beban). Stok produk **baru** (dibuat lewat form atau impor Excel) → **`3-1000 Modal Disetor`** (saldo awal) |
| Saldo awal persediaan yang sudah ada | Endpoint `POST /inventory/opening-balance` (+ perintah `php artisan inventory:opening-balance`) membukukan selisih nilai FIFO vs saldo buku `1-2000`: Dr/Cr `1-2000` ↔ `3-1000`. Idempoten (selisih 0 → tidak membuat jurnal). Izin `accounting_hub` |
| Opname sederhana | Kekurangan dipotong dari batch tertua (FIFO); kelebihan menjadi batch baru `OPN-…` dengan biaya batch terakhir (atau `product_cost`) |
| Penerimaan barang | Dokumen `purchases` (GR-YYYYMM-####) + batch FIFO + jurnal: Dr `1-2000` / Cr `1-1000` (TUNAI), `1-1001` (TRANSFER_BCA), `2-1000` (TEMPO, dengan jatuh tempo) |
| Hutang supplier | Dari `purchases` TEMPO: `GET /purchases?status=open`, `POST /purchases/{id}/payments` (Dr `2-1000` / Cr kas/bank). Endpoint lama `/accounting/accounts-payable` & `/pay` dihitung ulang dari `purchases` (pembayaran supplier dialokasikan ke faktur tertua) |
| Hapus produk | Produk tanpa riwayat & tanpa stok → dihapus; selain itu **dinonaktifkan** (nilai buku & histori tetap) |
| Kategori | `product_categories` & `service_categories` via API; produk membawa `category_id` + `category_code` |
| Zona waktu | Tidak diubah di tahap ini (menunggu keputusan pemilik) |

## 3. API (baru / berubah)

| Method | Path | Izin | Catatan |
|---|---|---|---|
| GET | /product-categories, /service-categories | `pos`,`inventory_view` | |
| POST/PUT/DELETE | /product-categories[/{id}], /service-categories[/{id}] | `inventory_manage` | Hapus ditolak bila masih dipakai |
| POST | /products | `inventory_manage` | `product_code`/`barcode` otomatis bila kosong; `initial_batch` → jurnal saldo awal (Cr 3-1000) |
| PUT | /products/{id} | `inventory_manage` | Tidak boleh mengubah stok/biaya FIFO (hanya master data & harga jual) |
| DELETE | /products/{id} | `inventory_manage` | Hapus atau nonaktifkan (lihat §2) |
| POST | /inventory/restock | `goods_receipt` | Body: product_id, quantity, batch_cost, supplier_id?, source_name, supplier_invoice?, purchase_date?, payment_method (TUNAI\|TRANSFER_BCA\|TEMPO), due_date?, notes? → `{purchase, batch, journal}` |
| POST | /inventory/stock-opname | `stock_opname` | Body: `{items:[{product_id, physical_qty}], notes?}` → `{reference, adjustments[], journal}` |
| GET | /inventory/stock-movements | `inventory_view` | `per_page` s/d 1000 |
| GET | /inventory/valuation | `inventory_view` | `{fifo_value, ledger_balance, difference}` |
| POST | /inventory/opening-balance | `accounting_hub` | Bukukan selisih (idempoten) |
| GET | /purchases | `goods_receipt`,`accounts_payable` | `status=open\|all` |
| POST | /purchases/{id}/payments | `accounts_payable` | `{amount, account_code 1-1000\|1-1001, payment_date?, notes?}` |

Commit Excel (`/stock/commit`), bulk update, dan edit inline buku stok tetap bentuk requestnya, tetapi kini menghasilkan jurnal selisih; responsnya ditambah `journal` (boleh `null` bila tidak ada selisih nilai).

## 4. Skema

- `purchases`: `purchase_number` unik, `supplier_id` nullable, `supplier_name`, `supplier_invoice`, `purchase_date`, `payment_method`, `due_date`, `total_amount`, `paid_amount`, `status` (LUNAS\|BELUM_LUNAS\|SEBAGIAN), `journal_entry_number`, `notes`, `operator_name`.
- `purchase_payments`: `purchase_id`, `payment_date`, `amount`, `account_code`, `notes`, `operator_name`, `journal_entry_number`.
- `product_batches.purchase_id` nullable.
- `products` relasi `category()` → `product_categories`.
- COA + `5-2000 Selisih Persediaan (Opname)` (EXPENSE, DEBIT).

## 5. Frontend

- Produk, jasa, supplier, kategori produk & jasa: CRUD lewat API lalu muat ulang dari server; data contoh tidak dipakai.
- Penerimaan barang & opname lewat API; jurnal hasil server disalin ke tampilan akuntansi (transisi seperti Tahap 2); kas laci berkurang untuk pembelian tunai.
- Kartu stok/mutasi dimuat dari `stock_movements`.
- Hutang supplier (tab AP) dari `/purchases`; pelunasan lewat API.
- Kartu valuasi di Inventori menampilkan nilai FIFO vs saldo buku 1-2000; OWNER dapat membukukan saldo awal dengan satu tombol.

## 6. Pengujian

Backend: valuasi & jurnal saldo awal idempoten; produk baru dengan stok awal → jurnal Cr 3-1000; restock tunai/transfer/tempo + purchase + jatuh tempo; pembayaran hutang sebagian/penuh/lebih → 422; AP agregat dari purchases; opname kurang/lebih memotong/menambah batch FIFO + jurnal 5-2000; commit Excel, bulk update, edit inline menghasilkan jurnal sehingga selisih valuasi tetap 0; hapus vs nonaktifkan; CRUD kategori & hapus kategori terpakai → 422; izin per endpoint.

Frontend: mapper produk/kategori/mutasi/purchase; payload produk dari form.

Manual: tambah produk dengan stok awal, restock tempo → muncul di AP → bayar, opname, kartu stok, valuasi = 0 setelah saldo awal.
