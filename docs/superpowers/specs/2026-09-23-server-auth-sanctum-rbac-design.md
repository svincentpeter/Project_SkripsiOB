# Spesifikasi Desain: Tahap 1 — Autentikasi Server (Laravel Sanctum) & RBAC di Backend

**Tanggal:** 23 September 2026
**Konteks:** Tahap 1 dari migrasi menuju Laravel + MySQL sebagai sumber kebenaran tunggal.
**Menggantikan sebagian:** `2026-09-07-auth-rbac-role-customization-design.md` (matriks peran tetap sama; penegakannya dipindah ke server).

---

## 1. Masalah

- Login sepenuhnya di browser: password master `password` selalu diterima, tombol login cepat, kredensial terisi otomatis, sesi baru otomatis OWNER.
- Pengalih peran "Ganti Peran (Demo)" di navbar membuat siapa pun jadi OWNER tanpa password.
- Password pengguna tersimpan plaintext di `localStorage` (`ob3_users`) dan di `mockData.ts`.
- Seluruh endpoint `/api/v1` terbuka tanpa autentikasi; `auth:sanctum` pada `/api/user` bahkan error karena Sanctum belum terpasang.
- Izin detail (`booking_dp`, `goods_receipt`, `stock_opname`, `inventory_manage`, `bon_receivable`) didefinisikan tetapi tidak pernah diperiksa. Peran tak dikenal diizinkan semua.

## 2. Keputusan

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Mekanisme | Laravel Sanctum **personal access token (Bearer)** | Tetap berfungsi bila frontend & backend beda domain (Vercel + hosting Laravel); sederhana diuji |
| Masa berlaku token | 12 jam (`SANCTUM_EXPIRATION=720`) | ± satu shift kerja; logout mencabut token seketika |
| Penyimpanan token di browser | `localStorage` kunci `ob3_auth_token` | Bertahan saat reload; kedaluwarsa dibatasi server |
| Sumber izin | Tabel `role_permissions` di MySQL | Owner tetap bisa mengubah izin Kasir & Gudang dari layar Pengaturan |
| Kelola pengguna (CRUD) | **Ditunda** ke tahap berikutnya | Akun awal dibuat via seeder |

## 3. Backend

### 3.1 Skema
Migrasi baru `add_role_columns_to_users_table`:
- `username` string unik (nullable untuk kompatibilitas, diisi seeder)
- `role` string(20) default `KASIR` — nilai: `OWNER`, `KASIR`, `GUDANG`
- `phone` string nullable
- `is_active` boolean default true

Migrasi baru `create_role_permissions_table`:
- `id`, `role` string(20), `permission_key` string(50), `allowed` boolean, timestamps
- unique (`role`, `permission_key`)

Migrasi Sanctum: `personal_access_tokens` (dari paket).

### 3.2 Kunci izin
14 kunci yang sama dengan frontend (`PermissionKey`):
`dashboard, pos, receipt, booking_dp, bon_receivable, inventory_view, inventory_manage, goods_receipt, stock_opname, expenses, accounts_payable, accounting_hub, financial_reports, role_settings`.

Aturan evaluasi (satu tempat: `User::hasPermission(string $key)`):
1. Akun nonaktif → tidak punya izin apa pun.
2. `OWNER` → selalu `true`.
3. Selain itu → baris `role_permissions` dengan `allowed = true`; tidak ada baris = `false` (deny by default).

Default (seeder `RolePermissionSeeder`, sama dengan `DEFAULT_ROLE_PERMISSIONS` frontend):
- KASIR: `pos, receipt, booking_dp, bon_receivable`
- GUDANG: `inventory_view, inventory_manage, goods_receipt, stock_opname`

### 3.3 Endpoint autentikasi (`/api/v1/auth`)
| Method | Path | Akses | Perilaku |
|---|---|---|---|
| POST | `/auth/login` | publik, throttle 5/menit per IP+identifier | Body `{login, password}` — `login` = username atau email. Sukses → `{token, expires_at, user}`. Gagal / nonaktif → 422 pesan generik "Username atau password salah." |
| POST | `/auth/logout` | login | Hapus token saat ini → 204 |
| GET | `/auth/me` | login | `{user}` |

Bentuk `user`: `{id, username, name, email, role, phone, branch_name, is_active, permissions: {<key>: bool, ...}}`. `branch_name` konstanta `Cabang 3 Magelang`.

### 3.4 Pengaturan izin
| Method | Path | Izin |
|---|---|---|
| GET | `/settings/role-permissions` | login (dibaca semua peran agar UI konsisten) |
| PUT | `/settings/role-permissions` | `role_settings` |

Body PUT: `{KASIR: {<key>: bool}, GUDANG: {<key>: bool}}` — hanya peran `KASIR`/`GUDANG` dan 14 kunci valid yang diterima; OWNER tidak dapat diubah.

### 3.5 Middleware & pemetaan route
- Semua route `/api/v1` di dalam grup `auth:sanctum`, kecuali `GET /health`, `POST /auth/login`, `POST /payment/midtrans/webhook`.
- Middleware `permission:<key>[,<key>...]` (alias di `bootstrap/app.php`) — lolos bila pengguna punya **salah satu** kunci; gagal → 403 `{"message": "Anda tidak memiliki izin untuk aksi ini."}`.
- Route `/api/user` (rusak) dihapus.

| Kelompok | Izin |
|---|---|
| GET products, services, suppliers, accounts; GET pos/payment-options | `pos`, `inventory_view` |
| POST/PUT/DELETE products, services, suppliers | `inventory_manage` |
| POST pos/checkout, GET pos/transactions*, payment/qris/* | `pos`, `receipt` untuk GET transactions; `pos` untuk checkout & QRIS |
| POST inventory/restock | `goods_receipt` |
| GET inventory/stock-movements | `inventory_view` |
| POST inventory/stock-opname, stock/* (import, staging, resolve, commit, bulk-update, template) | `stock_opname` |
| reports/stock-monthly (GET, export) | `inventory_view` |
| reports/stock-monthly/inline-update | `stock_opname` |
| expense-categories, expenses* | `expenses` |
| accounting/accounts-payable, accounting/accounts-payable/pay | `accounts_payable` |
| accounting/journals*, general-ledger, trial-balance | `accounting_hub` |
| accounting/financial-statements | `financial_reports` |
| settings/payment-providers*, settings/edc* (tulis) | `role_settings` |
| settings/payment-providers, settings/edc (GET) | `role_settings`, `pos` |

### 3.6 Operator
Nama operator yang di-hardcode pada stock movement / jurnal diganti `$request->user()->name` bila tersedia (fallback lama dipertahankan untuk CLI/seeder).

### 3.7 Seeder
`UserSeeder` membuat/menyelaraskan tiga akun berdasarkan `username`:
- `owner` — Agus Subagyo — OWNER
- `kasir` — Kasir OB3 — KASIR
- `gudang` — Admin Gudang OB3 — GUDANG

Email: `owner@omahban.com`, `kasir@omahban.com`, `gudang@omahban.com` (akun dicocokkan berdasarkan email; baris lama `kasir@omahban.com` diambil alih dan password-nya diganti). Password awal dari `.env` `SEED_DEFAULT_PASSWORD` (wajib ada saat seeding; bila kosong seeder gagal dengan pesan jelas). Akun lama `admin@omahban.com` dinonaktifkan agar tidak ada kredensial `password123` yang aktif.

## 4. Frontend

- `apiClient`: sisipkan `Authorization: Bearer <token>` bila ada; respons 401 → hapus token dan panggil handler `onUnauthorized` yang didaftarkan App (kembali ke layar login). Juga dipakai `StockMonthlyLedgerView` (menggantikan `fetch` mentah) agar ikut terautentikasi.
- `authApi` baru: `login`, `logout`, `me`, `getRolePermissions`, `updateRolePermissions`.
- `App.tsx`:
  - `currentUser` awal `null`; saat mount, bila ada token → `me()`; sukses → set user + izin; gagal → layar login. Selama pengecekan tampil layar memuat.
  - Hapus state `users` / `ob3_users` / sinkron user Supabase; hapus `ob3_session` bila ada.
  - `rolePermissions` diisi dari server; perubahan di Pengaturan disimpan via `updateRolePermissions`.
- `LoginScreen`: panggil `authApi.login`; hapus password master, login cepat, kredensial terisi otomatis; tampilkan pesan error server dan status memuat.
- `HeaderNavbar`: hapus pengalih peran demo; logout memanggil `authApi.logout` (abaikan error jaringan) lalu bersihkan sesi lokal.
- `mockData.ts`: hapus `DEFAULT_USERS`.
- `authNavigationService.isScreenPermittedForRole`: peran tanpa konfigurasi → `false` (deny by default).
- Izin detail dipakai untuk menyembunyikan tombol: `booking_dp` (Booking DP di POS), `bon_receivable` (opsi BON), `goods_receipt` (Penerimaan Barang), `stock_opname` (Stock Opname & Import Excel), `inventory_manage` (tambah/ubah/hapus produk, jasa, supplier, kategori).

## 5. Penanganan Error
- 401 di mana pun → sesi berakhir, kembali ke login dengan pesan "Sesi berakhir, silakan login kembali."
- 403 → toast pesan server; layar tetap.
- Server mati saat login → pesan "Server tidak dapat dihubungi."

## 6. Pengujian
Backend (PHPUnit, DB `project-skripsi_ob_testing`):
- `AuthApiTest`: login via username & email, password salah → 422, akun nonaktif → 422, throttle → 429, `me`, logout mencabut token, token kedaluwarsa ditolak.
- `AuthorizationTest`: tanpa token → 401 pada sampel tiap kelompok; KASIR ke jurnal → 403; GUDANG ke checkout → 403; OWNER lolos; endpoint publik tetap publik; update izin oleh non-OWNER → 403; perubahan izin langsung berlaku.
- Test lama: `TestCase` menyediakan helper `actingAsOwner()` dan autentikasi default sebagai OWNER untuk test fitur API yang ada.

Frontend (Vitest): `apiClient` menyisipkan header & memicu handler 401; `isScreenPermittedForRole` deny-by-default.

Manual (browser): login tiap peran, akses ditolak sesuai peran, reload mempertahankan sesi, logout.

## 7. Di Luar Lingkup
Kelola pengguna (CRUD, reset password), lupa password via email, verifikasi signature webhook Midtrans (Tahap 2 bersama POS), pemindahan data transaksi ke server (Tahap 2+).

## 8. Konsekuensi
Aplikasi membutuhkan server Laravel menyala untuk login. Mode offline/Supabase tidak lagi bisa dipakai untuk masuk.
