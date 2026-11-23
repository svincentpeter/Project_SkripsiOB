# Panduan Deploy Omah Ban Cabang 3: Vercel + Laravel API + Supabase PostgreSQL

> **Penting:** Arsitektur aplikasi sudah bermigrasi penuh dari client-side Supabase ke **Laravel 13 REST API (`backend/`)** sebagai satu-satunya sumber kebenaran (*single source of truth*) akuntansi SAK EMKM & stok FIFO.
> File `supabase_schema.sql` dan `src/services/supabaseClient.ts` adalah **kode legacy** yang sudah tidak dipakai. Jangan menjalankan `supabase_schema.sql` ke Supabase.

---

## Arsitektur Produksi

```text
Browser (Vercel Static SPA)  ──HTTPS + Bearer Token──►  Laravel 13 API (Railway / Render / VPS / Tunnel)  ──►  Database (Supabase PostgreSQL / MySQL)
```

---

## 1. Setup Database di Supabase PostgreSQL (Untuk Laravel Backend)

Jika Anda ingin memakai **Supabase** sebagai database cloud, hubungkan **Laravel (`backend/`)** ke PostgreSQL Supabase (bukan dari frontend React):

1. Buka Dashboard Supabase → **Project Settings** → **Database** → **Connection string** (pilih mode **Session pooler** IPv4 port `5432` atau `6543` agar kompatibel dengan Railway/Render).
2. Catat detail koneksi:
   - `DB_CONNECTION=pgsql`
   - `DB_HOST=aws-0-<region>.pooler.supabase.com`
   - `DB_PORT=5432`
   - `DB_DATABASE=postgres`
   - `DB_USERNAME=postgres.<project-ref>`
   - `DB_PASSWORD=<password-database-supabase>`
   - `DB_SSLMODE=require`

---

## 2. Deploy Laravel Backend (`backend/`) via Docker

Sudah tersedia `backend/Dockerfile`, `backend/.dockerignore`, dan `backend/docker-entrypoint.sh` (mendukung `pdo_pgsql` untuk Supabase PostgreSQL dan `pdo_mysql` untuk MySQL).

### Langkah di Railway / Render:
1. Buat service baru dari repo GitHub **`Project_SkripsiOB`**.
2. Set **Root Directory** ke `backend` (Runtime: **Docker**).
3. Isi **Environment Variables** pada service backend:
   ```env
   APP_NAME="Omah Ban Cabang 3"
   APP_ENV=production
   APP_DEBUG=false
   APP_KEY=base64:<generate dengan php artisan key:generate --show>
   APP_TIMEZONE=Asia/Jakarta
   APP_URL=https://<domain-backend-anda>

   DB_CONNECTION=pgsql
   DB_HOST=<host-pooler-supabase>
   DB_PORT=5432
   DB_DATABASE=postgres
   DB_USERNAME=<user-supabase>
   DB_PASSWORD=<password-supabase>
   DB_SSLMODE=require

   SANCTUM_EXPIRATION=720
   SEED_DEFAULT_PASSWORD=<password-awal-yang-aman>
   RUN_MIGRATIONS_ON_BOOT=true

   # Opsional Midtrans QRIS Sandbox/Prod:
   MIDTRANS_SERVER_KEY=
   MIDTRANS_CLIENT_KEY=
   MIDTRANS_IS_PRODUCTION=false
   MIDTRANS_ALLOW_SIMULATION=true
   ```
4. Setelah container berjalan, buka shell/terminal backend sekali saja untuk seed data awal & saldo awal persediaan:
   ```bash
   php artisan db:seed --force
   php artisan inventory:opening-balance
   ```

> **Alternatif Cepat Saat Bimbingan (Tanpa Host Backend Cloud):**
> Tetap jalankan Laragon MySQL (`project-skripsi_ob`) + `php artisan serve --port=8000` di laptop, lalu ekspos memakai Cloudflare Tunnel (`cloudflared tunnel --url http://127.0.0.1:8000`) dan pasang URL HTTPS tunnel tersebut di `VITE_API_URL` Vercel.

---

## 3. Pengaturan Vercel (Frontend `project-skripsiob`)

Di **Vercel Dashboard → Project Settings → Environment Variables**:

1. **Hapus variabel usang** (jika masih ada):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `GEMINI_API_KEY`
   - `VITE_DEV_LOGIN_PASSWORD` *(jangan pasang di production agar tombol login cepat tidak ter-expose)*
2. **Tambahkan / Perbarui**:
   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://<domain-backend-laravel>/api/v1` |
3. Lakukan **Redeploy** setelah mengubah Environment Variables agar Vite mem-bundle nilai `VITE_API_URL` yang baru ke dalam `dist/`.
