# Spesifikasi Desain: Tahap 2 — Siklus POS di Server (Checkout, Nota, Void, BON/Piutang, Booking DP)

**Tanggal:** 24 September 2026
**Konteks:** Tahap 2 migrasi menuju Laravel + MySQL sebagai sumber kebenaran tunggal. Dibangun di atas Tahap 1 (`2026-09-23-server-auth-sanctum-rbac-design.md`).

---

## 1. Masalah

- Penjualan dihitung dan disimpan di browser (`App.tsx handleCompleteSale`); kiriman ke Laravel bersifat "tembak-lalu-lupa" dan hasilnya tidak pernah dibaca, sehingga ada dua buku besar.
- Server mempercayai angka dari browser (`sub_total`, `fee_amount`, `net_received`), tidak memeriksa stok, dan diam-diam membiarkan stok minus.
- Jurnal surcharge EDC salah; split payment tidak didukung server.
- Item jasa di keranjang membawa `products[0]`, sehingga menjual jasa mengurangi stok produk pertama.
- DP booking dijurnal ke `2-1000 Hutang Supplier`; nilai DP saat pelunasan dibaca dengan regex dari teks catatan; DP "bocor" ke pelanggan berikutnya.
- Penjualan BON tidak pernah membuat faktur piutang; pelunasan piutang hanya di browser.
- Void hanya di browser, tidak mengembalikan batch FIFO, dan bisa dilakukan siapa saja yang membuka riwayat nota.
- Webhook Midtrans tidak memverifikasi signature.

## 2. Keputusan (disetujui 24 Sep 2026)

| Topik | Keputusan |
|---|---|
| Cakupan | Seluruh siklus POS dalam satu tahap: katalog, checkout, riwayat nota, void, BON → piutang + pelunasan, booking DP, signature webhook |
| Void | Izin baru `sale_void` (kunci ke-15). Default hanya OWNER; dapat diberikan ke KASIR/GUDANG lewat Pengaturan |
| Stok tidak cukup | Checkout **ditolak** (422) |
| Item manual | Pendapatan dicatat; HPP ketikan kasir disimpan di baris nota untuk margin, **tidak** dijurnal ke Persediaan |
| Tarif fee QRIS/EDC | Persentase dikirim browser (pengaturan masih di browser); nominal fee/surcharge dihitung ulang server. Pindah pengaturan ke server = tahap berikutnya |
| Kartu login cepat | Hanya mode `npm run dev`; login sungguhan lewat `/auth/login`; password dari `VITE_DEV_LOGIN_PASSWORD` di `.env.local` (tidak di-commit) |

## 3. Aturan Perhitungan Checkout (server)

Per baris item: `gross = qty × unit_price`, `line_discount = qty × discount_per_item`, `net = gross − line_discount` (≥ 0).

- `subtotal = Σ net`; `nota_discount` ≤ `subtotal`; `taxable = subtotal − nota_discount`
- `tax = round(taxable × tax_rate / 100)` dengan `tax_rate ∈ {0, 11}`
- `grand_total = taxable + tax`
- `dp_applied` = DP booking (bila `booking_id`); ditolak bila > `grand_total`
- `amount_due = grand_total − dp_applied`

Pembayaran:
- **BON**: `payments` harus kosong; seluruh `amount_due` menjadi piutang; `due_date = tanggal + term_days (7/14/30)`; status `PENDING`.
- **Non-BON**: `Σ payments.amount = amount_due` (toleransi 0), jika tidak → 422. Metode: `TUNAI, TRANSFER, TRANSFER_BCA, QRIS, EDC_DEBIT, EDC_CREDIT`.
  - TUNAI: `tendered ≥ amount`; `change = tendered − amount`.
  - Fee per baris dengan persentase `p`:
    - `charge_to_customer = true` (EDC kredit): `surcharge = round(amount × p / 100)`, `fee = surcharge`, `net_received = amount`.
    - selain itu: `surcharge = 0`, `fee = round(amount × p / 100)`, `net_received = amount − fee`.
  - QRIS dengan `reference` (order id Midtrans) → status harus `settlement`/`capture` di `MidtransQrisService::checkStatus`, jika tidak → 422. QRIS tanpa referensi (statis/manual) diterima.
- Status sale: `LUNAS` (non-BON) / `PENDING` (BON). `payment_method` sale: satu metode, `SPLIT`, atau `BON`.

Stok & HPP:
- Baris produk katalog (`product_id`): produk harus ada & aktif; `qty ≤ product_quantity` (kumulatif antar baris) — jika tidak → 422 `"Stok {nama} tidak cukup (sisa {n})."`; HPP dari alokasi FIFO (`FifoCostingService::allocateFifo`).
- Baris jasa: `service_id` opsional (harus ada bila diisi), pendapatan `4-1001`, tanpa HPP.
- Baris manual (`is_manual`): tanpa stok; pendapatan `4-1000` (produk) / `4-1001` (jasa); `cost_price` disimpan di `unit_cost_hpp/total_cost_hpp`, tidak dijurnal.

## 4. Jurnal Penjualan

| Akun | Debit | Kredit |
|---|---|---|
| Kas `1-1000` / Bank `1-1001` per baris pembayaran | `net_received` | |
| `6-1009` Beban MDR QRIS & EDC | Σ fee | |
| `2-1004` Uang Muka Pelanggan | `dp_applied` | |
| `1-1002` Piutang Dagang | `amount_due` (BON) | |
| `4-9000` Potongan Diskon | Σ line_discount + nota_discount | |
| `4-1000` Pendapatan Ban | | Σ gross produk (katalog + manual) |
| `4-1001` Pendapatan Jasa | | Σ gross jasa |
| `2-1003` PPN Keluaran | | tax |
| `4-2000` Pendapatan Surcharge EDC | | Σ surcharge |
| `5-1000` HPP / `1-2000` Persediaan | HPP FIFO katalog | HPP FIFO katalog |

Pemetaan akun kas: `TUNAI → 1-1000`, lainnya → `1-1001`. Akun `2-1004`, `4-2000`, `6-1009` ditambahkan resmi ke `AccountCoaSeeder` (tidak lagi `firstOrCreate` di controller).

## 5. Void Penjualan

`POST /pos/transactions/{id}/void` `{reason (min 5)}` — izin `sale_void`.
- Ditolak (422) bila sudah VOID, atau bila penjualan BON sudah memiliki pelunasan piutang.
- Jurnal pembalik: salinan jurnal asli dengan debit/kredit ditukar, `reference_type = POS_SALE_VOID`.
- Stok: setiap `sale_batch_allocation` mengembalikan `remaining_qty` ke batch asalnya; `product_quantity += qty`; stock movement `MASUK` `reference_type = SALE_VOID`.
- Bila memakai DP booking: booking kembali `ACTIVE`, `converted_sale_id = null`.
- Sale: `status = VOID`, `voided_at`, `voided_by` (nama pengguna), `void_reason`.

## 6. Piutang (BON)

- `GET /receivables?status=open|all` — izin `bon_receivable` atau `accounting_hub`. Setiap sale BON: `total`, `paid`, `remaining`, `status (BELUM_LUNAS|SEBAGIAN|LUNAS)`, `due_date`.
- `POST /receivables/{saleId}/payments` `{amount, account_code: 1-1000|1-1001, payment_date?, notes?}` — izin sama. `amount ≤ remaining` (jika tidak → 422). Jurnal: Dr kas/bank, Cr `1-1002`. Lunas → sale `status = LUNAS`.

## 7. Booking DP

- `POST /bookings` — izin `booking_dp`. Body: data pelanggan, `items` (format sama checkout), `dp_amount > 0`, `payment_method ∈ {TUNAI, TRANSFER, TRANSFER_BCA, QRIS}`. Server menghitung `estimated_total` (tanpa pajak), `remaining_amount`, nomor `BK-YYYYMM-####`. Jurnal: Dr kas/bank, Cr `2-1004`. DP melebihi estimasi → 422.
- `GET /bookings?status=ACTIVE` — izin `booking_dp` atau `pos`.
- `POST /bookings/{id}/cancel` `{refund_account_code: 1-1000|1-1001, reason?}` — izin `booking_dp`. Jurnal: Dr `2-1004`, Cr kas/bank. Status `CANCELLED`. Hanya booking `ACTIVE`.
- Checkout dengan `booking_id` (booking harus `ACTIVE`) → `dp_applied = dp_amount`; booking menjadi `CONVERTED`, `converted_sale_id`.

## 8. Webhook Midtrans

`POST /payment/midtrans/webhook` memverifikasi `signature_key == sha512(order_id + status_code + gross_amount + server_key)`. Tidak cocok → 403, tidak ada perubahan status.

## 9. Skema

- `sales` +: `customer_phone`, `vehicle_model`, `change_amount`, `dp_applied`, `booking_id`, `due_date`, `voided_at`, `voided_by`, `void_reason`.
- `sale_details` +: `item_type` (`PRODUCT|SERVICE`), `item_name`, `service_id`, `is_manual`.
- `sale_payments` (baru): `sale_id, method, account_code, amount, tendered_amount, change_amount, fee_percentage, fee_amount, surcharge_amount, net_received, provider_name, edc_bank, edc_type, reference`.
- `receivable_payments` (baru): `sale_id, payment_date, amount, account_code, notes, operator_name, journal_entry_number`.
- `sales_bookings` +: `items` (JSON), `dp_account_code`, `converted_sale_id`, `cancelled_at`, `operator_name`.

## 10. Bentuk Respons

Nota (`Sale::toReceiptArray()`): header sale, `items[]` (`item_type, item_name, product_id, service_id, is_manual, quantity, unit_price, discount_per_item, sub_total, unit_cost_hpp, total_cost_hpp, product{id, product_name, brand, product_size, motif}`), `payments[]`, `journal{entry_number, entry_date, description, lines[{account_code, account_name, debit, credit, note}]}`.

Checkout/void/pelunasan/booking mengembalikan objek yang relevan + `journal` agar frontend dapat menyalin jurnal ke tampilan akuntansi selama masa transisi.

## 11. Frontend

- Katalog produk **dan jasa** dimuat dari API setelah login (tanpa mock), di host mana pun (bukan hanya localhost). Riwayat nota, piutang, dan booking aktif dimuat dari API sesuai izin.
- `PosScreen` menyusun payload (bukan `createPosTransactionRecord`) dan menunggu server; tombol bayar terkunci selama proses; keranjang, diskon, DP, dan booking sumber dibersihkan hanya bila sukses; error server ditampilkan sebagai toast.
- Item jasa tidak lagi membawa `products[0]`.
- Menahan (park) keranjang dan menyimpan booking juga mereset DP & booking sumber.
- Void di riwayat nota memanggil API; tombol void hanya tampil bila `sale_void`.
- Pelunasan piutang di tab Piutang memanggil API.
- Jurnal hasil server disalin ke state `journals` (transisi sampai tahap akuntansi). Kas laci bertambah/berkurang sebesar porsi tunai yang dikonfirmasi server.
- Setelah checkout/void, katalog produk dimuat ulang dari API (stok & batch terbaru).
- `paymentApi` tidak lagi punya fallback QRIS palsu/`localStorage`; error server ditampilkan.
- Penjualan, DP, void, piutang tidak lagi ditulis ke Supabase/localStorage sebagai sumber data.
- `RolePermissionsTab` menampilkan izin baru "Void / Batalkan Nota".
- Kartu login cepat (dev) — lihat §2.

## 12. Pengujian

Backend (PHPUnit): checkout tunai + kembalian; transfer; QRIS dengan fee; QRIS referensi belum settle → 422; EDC kredit surcharge; split tunai+EDC; BON membuat piutang; checkout pakai DP booking; baris jasa & manual; pajak 11%; stok tidak cukup → 422; total pembayaran ≠ tagihan → 422; produk tidak ada → 422; jurnal seimbang & akun benar; void mengembalikan batch & membalik jurnal; void ganda → 422; void BON yang sudah dibayar → 422; void tanpa izin → 403; pelunasan piutang sebagian/penuh/lebih → 422; booking buat/batal/DP > estimasi; webhook signature valid/invalid.

Frontend (Vitest): mapper nota/jurnal/piutang/booking; penyusun payload checkout dari keranjang (jasa tanpa `product_id`, manual, split, BON).

Manual (browser): checkout tunai, split, BON → muncul di Piutang → pelunasan; booking DP → konversi ke checkout; void oleh OWNER; KASIR tidak melihat tombol void.

## 13. Di Luar Lingkup

Pengaturan metode bayar di server, penutupan periode, laporan akuntansi dari API (tahap akuntansi), retur sebagian, nomor urut yang aman terhadap konkurensi tinggi.
