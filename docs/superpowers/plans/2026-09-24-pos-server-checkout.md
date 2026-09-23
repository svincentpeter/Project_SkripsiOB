# Siklus POS di Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Checkout, riwayat nota, void, BON/piutang, dan booking DP dihitung dan disimpan server; frontend hanya menampilkan hasil server.

**Architecture:** Logika bisnis POS di `app/Services/Pos/*` (controller tipis). `CheckoutService` menghitung baris, pembayaran, stok FIFO, dan jurnal dalam satu transaksi DB; `SaleVoidService`, `ReceivableService`, `BookingService` menangani siklus lainnya. `Sale::toReceiptArray()` menjadi satu bentuk respons. Frontend memakai `posApi` + mapper murni (`posMappers.ts`) untuk mengubah respons ke tipe UI yang ada.

**Tech Stack:** Laravel 13, PHPUnit 12, MySQL; React 19, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-pos-server-checkout-design.md`

## Global Constraints

- Akun: kas `1-1000`, bank `1-1001`, piutang `1-1002`, persediaan `1-2000`, uang muka pelanggan `2-1004`, PPN `2-1003`, pendapatan ban `4-1000`, jasa `4-1001`, surcharge `4-2000`, diskon `4-9000`, HPP `5-1000`, MDR `6-1009`.
- Metode bayar checkout: `TUNAI, TRANSFER, TRANSFER_BCA, QRIS, EDC_DEBIT, EDC_CREDIT`; BON lewat objek `bon {term_days: 7|14|30}` dengan `payments` kosong.
- Izin: checkout/QRIS `pos`; riwayat `pos|receipt`; void `sale_void`; piutang `bon_receivable|accounting_hub`; booking tulis `booking_dp`, baca `booking_dp|pos`.
- Pesan 422 dalam Bahasa Indonesia; kunci error validasi Laravel standar.
- Test backend memakai DB `project-skripsi_ob_testing`; jangan commit file milik user (`backend/phpunit.xml`, `OmahBanBanBaruSeeder.php`, `database/seeders/data/`, hunk saldo awal di `DatabaseSeeder.php`) atau file milik sesi lain.
- Commit diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 1: Kartu login cepat (dev only)

**Files:** Modify `src/modules/auth/LoginScreen.tsx`, `.env.example`; Test: manual.

- [ ] Tampilkan tiga kartu (owner/kasir/gudang) hanya bila `import.meta.env.DEV`.
- [ ] Klik kartu: bila `import.meta.env.VITE_DEV_LOGIN_PASSWORD` ada → `authApi.login(username, password)` lalu `onLogin`; bila tidak → isi username & fokus ke password.
- [ ] `.env.example` tambah `VITE_DEV_LOGIN_PASSWORD=` dengan komentar "hanya dev, isi di .env.local".
- [ ] `npm run lint` tanpa error baru; `npx vite build` lalu pastikan string `VITE_DEV_LOGIN_PASSWORD`/kartu tidak aktif di build (grep `dist`).
- [ ] Commit `feat(auth): dev-only quick login cards that authenticate through the server`.

### Task 2: Skema, akun COA, izin `sale_void`

**Files:**
- Create migration `2026_09_24_000001_extend_sales_for_server_pos.php` (kolom §9 spec pada `sales`, `sale_details`, `sales_bookings`; tabel `sale_payments`, `receivable_payments`).
- Create models `SalePayment`, `ReceivablePayment`; modify `Sale`, `SaleDetail`, `SalesBooking` (fillable, casts, relasi `payments()`, `receivablePayments()`, `booking()`).
- Modify `AccountCoaSeeder` (+`2-1004 Uang Muka Pelanggan` LIABILITY/CREDIT, `4-2000 Pendapatan Surcharge EDC` REVENUE/CREDIT, `6-1009 Beban MDR QRIS & EDC` EXPENSE/DEBIT).
- Modify `TestBaselineSeeder` — selalu panggil `AccountCoaSeeder` (idempoten) agar akun baru ada di DB test.
- Modify `App\Support\Permissions::KEYS` (+`sale_void`), frontend `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS` (false untuk KASIR/GUDANG), `RolePermissionsTab` (label "Void / Batalkan Nota").
- Test: `tests/Unit/UserPermissionTest` (count 15), `AuthorizationTest` tetap hijau.

- [ ] Migrasi dev & test DB; `php artisan test` hijau; `npx vitest run` hijau.
- [ ] Commit `feat(pos): schema for server-side POS, customer deposit accounts and sale_void permission`.

### Task 3: CheckoutService + endpoint checkout

**Files:**
- Create `app/Services/Pos/PaymentAccounts.php` (`accountFor(string $method): string`).
- Create `app/Services/Pos/CheckoutService.php` — `checkout(array $data, ?User $user): Sale`.
- Create `app/Exceptions/PosRuleException.php` (render 422 `{message}`).
- Rewrite `app/Http/Requests/PosCheckoutRequest.php` (payload baru).
- Modify `PosController::checkout/index/show` → service + `toReceiptArray()`.
- Add `Sale::toReceiptArray()`.
- Tests: rewrite `tests/Feature/PosTransactionTest.php`, `PaymentMethodSettingsParityTest` (checkout parts) ke payload baru; create `tests/Feature/PosCheckoutTest.php`.

**Interfaces — Produces:**
- Payload: `{customer_name?, customer_phone?, vehicle_plate?, vehicle_model?, notes?, tax_rate (0|11), discount_amount?, booking_id?, bon?: {term_days}, items: [{type, product_id?, service_id?, name, quantity, unit_price, discount_per_item?, is_manual?, cost_price?}], payments: [{method, amount, tendered?, fee_percentage?, charge_to_customer?, provider_name?, edc_bank?, edc_type?, reference?}]}`
- Response 201: `{success, data: <receipt array>}`

Tests (PosCheckoutTest): tunai+kembalian; transfer; QRIS fee 0.7%; QRIS reference pending → 422, simulated settlement → 201; EDC kredit surcharge 2%; split tunai+EDC debit; BON 14 hari (due_date, status PENDING, Dr 1-1002); jasa (service_id) & manual (tanpa jurnal HPP); pajak 11%; stok kurang → 422 & tidak ada perubahan stok; total bayar ≠ tagihan → 422; produk tidak ada → 422; semua jurnal seimbang dan akun sesuai §4.

- [ ] Tulis test → gagal → implementasi → hijau → seluruh suite hijau.
- [ ] Commit `feat(pos): server-authoritative checkout with split payments, fees, BON and stock checks`.

### Task 4: Void penjualan

**Files:** Create `app/Services/Pos/SaleVoidService.php` (`void(Sale $sale, string $reason, User $user): Sale`); route `POST pos/transactions/{id}/void` (`permission:sale_void`); Test `tests/Feature/PosVoidTest.php`.

Tests: void mengembalikan `remaining_qty` batch & `product_quantity`, membuat jurnal pembalik seimbang, status VOID + voided_by; void ganda → 422; BON dengan pelunasan → 422; KASIR (tanpa `sale_void`) → 403; void sale ber-DP mengaktifkan kembali booking.

- [ ] TDD → hijau → commit `feat(pos): void sales on the server with reversing journal and FIFO batch restore`.

### Task 5: Piutang BON

**Files:** Create `app/Services/Pos/ReceivableService.php` (`list(string $status)`, `pay(Sale $sale, array $data, User $user): ReceivablePayment`); `ReceivableController` (`index`, `pay`); routes; Test `tests/Feature/ReceivableApiTest.php`.

Tests: daftar piutang terbuka; bayar sebagian → SEBAGIAN; bayar lunas → sale LUNAS; bayar melebihi sisa → 422; jurnal Dr kas/bank Cr 1-1002; GUDANG → 403.

- [ ] TDD → hijau → commit `feat(pos): receivables for BON sales with partial and full settlement`.

### Task 6: Booking DP

**Files:** Create `app/Services/Pos/BookingService.php` (`create(array $data, User $user): SalesBooking`, `cancel(SalesBooking $b, array $data, User $user): SalesBooking`); `BookingController` (`index`, `store`, `cancel`); routes; `SalesBooking::toApiArray()`; Test `tests/Feature/BookingApiTest.php`.

Tests: buat booking → jurnal Dr kas Cr 2-1004, nomor BK; DP > estimasi → 422; batal → jurnal refund, status CANCELLED; batal booking CONVERTED → 422; checkout dengan booking_id → dp_applied, booking CONVERTED, jurnal Dr 2-1004.

- [ ] TDD → hijau → commit `feat(pos): customer booking deposits on account 2-1004 with cancel and checkout conversion`.

### Task 7: Signature webhook Midtrans

**Files:** Modify `PaymentApiController::handleWebhook`; Test `tests/Feature/MidtransQrisApiTest.php` (tambah valid/invalid).

- [ ] TDD → hijau → commit `fix(payment): verify Midtrans webhook signature`.

### Task 8: Frontend API & mapper

**Files:** Modify `src/services/api/posApi.ts` (checkout, listTransactions, voidTransaction, listReceivables, payReceivable, listBookings, createBooking, cancelBooking, listServices); create `src/services/api/posMappers.ts` (`mapSaleToTransaction`, `mapJournal`, `mapReceivable`, `mapBooking`, `buildCheckoutPayload`, `buildBookingPayload`); `paymentApi.ts` hapus fallback palsu; tests `src/services/__tests__/posMappers.test.ts`.

- [ ] Test mapper & builder (jasa tanpa product_id, manual cost, split, BON term, DP booking_id) → hijau → commit `feat(pos): API client and mappers for server-side POS`.

### Task 9: Frontend alur POS

**Files:** `src/App.tsx` (sync data setelah login dari API di host mana pun; handler checkout/void/piutang/booking async lewat API, salin jurnal, refetch katalog, kas laci), `PosScreen.tsx` (payload, submit terkunci, reset DP/booking saat park/booking, jasa tanpa `products[0]`), `CheckoutModal.tsx` (kirim `term_days`, referensi QRIS), `BookingListDrawer`/`BookingDpModal` (batal booking), `ThermalReceiptScreen.tsx` (void gating `sale_void`), `AccountsReceivableTab` (pakai handler async).

- [ ] `npm run lint` tanpa error baru, `npx vitest run` hijau, `npx vite build` sukses → commit `feat(pos): run checkout, void, receivables and bookings through the server`.

### Task 10: Verifikasi browser

- [ ] Checkout tunai + kembalian; split tunai+EDC; BON → tampil di Piutang → pelunasan; booking DP → konversi checkout; void oleh OWNER; KASIR tidak melihat tombol void; stok berkurang/kembali sesuai.
- [ ] `php artisan test` & `npx vitest run` terakhir — hijau.
