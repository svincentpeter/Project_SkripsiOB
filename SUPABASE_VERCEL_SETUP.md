# 🚀 Panduan Lengkap Deploy Omah Ban Cabang 3 ke Vercel & Supabase Cloud

Dokumen ini berisi panduan praktis langkah demi langkah untuk menghubungkan aplikasi **Toko Ban Omah Ban Cabang 3 - Magelang** (Standar Akuntansi SAK EMKM) ke **Database PostgreSQL Cloud Supabase** dan melakukan hosting produksi di **Vercel**.

---

## 📋 Data Kredensial Supabase Anda

Project Supabase Anda telah dikonfigurasi:
- **Project URL:** `https://tgicdfugemwsrbdbtgda.supabase.co`
- **Publishable / Anon Key:** `sb_publishable_RvmFF-NYiKuvpMbPtGsfTw_arSn_-0l`

---

## ⚡ Langkah 1: Eksekusi Skrip DDL Database di Supabase (1 Menit)

Database Supabase Anda memerlukan struktur tabel dan data awal toko. Ikuti langkah ini:

1. Buka dashboard Supabase project Anda:
   👉 **[https://supabase.com/dashboard/project/tgicdfugemwsrbdbtgda](https://supabase.com/dashboard/project/tgicdfugemwsrbdbtgda)**
2. Pada menu sidebar kiri, klik icon **SQL Editor** (`>_`).
3. Klik tombol **New Query**.
4. Buka file [`supabase_schema.sql`](file:///c:/laragon/www/Project_SkripsiOB/supabase_schema.sql) di root folder project ini, **Copy seluruh isinya** (Ctrl+A, Ctrl+C).
5. Paste ke dalam editor query Supabase, lalu klik tombol hijau **RUN** di kanan bawah.
6. Tunggu beberapa detik sampai muncul pesan `Success. No rows returned`.

✅ **Hasil:**
Seluruh **17 tabel** (`products`, `services`, `suppliers`, `pos_transactions`, `parked_transactions`, `sales_bookings`, `expenses`, `stock_mutations`, `journal_entries`, `payable_invoices`, `receivable_invoices`, `store_settings`, `account_balances`, `accounting_period`, `users`, `role_permissions`), kebijakan keamanan RLS, dan seed data resmi Omah Ban Cabang 3 telah aktif di database PostgreSQL Cloud Anda!

---

## 🔐 Akun Login Pengguna (Tersimpan di Database Supabase)

Sistem mendukung login menggunakan **Username ATAU Email** dengan password default:

| Peran (Role) | Username | Email | Password | Hak Akses Utama |
|---|---|---|---|---|
| **Owner** (Pemilik) | `owner` | `owner@omahban.com` | `password` | Akses penuh (Dashboard Eksekutif, Akuntansi SAK EMKM, Laporan Laba Rugi, Pengaturan Sistem & Role Permissions) |
| **Kasir** (Kasir OB3) | `kasir` | `kasir@omahban.com` | `password` | POS Penjualan, Penerimaan Pembayaran Bon/Piutang, Kas Masuk/Keluar, Riwayat Nota & Cetak Struk Thermal |
| **Admin Gudang** (Gudang OB3) | `gudang` | `gudang@omahban.com` | `password` | Master Stok Ban & Jasa, Penerimaan Barang (PO), Stok Opname, Mutasi Stok, Hutang Dagang Supplier |

*Catatan: Pada layar login, Anda juga dapat mengklik tombol "Login Cepat / Demo" untuk langsung mengisi formulir login.*

## 🌐 Langkah 2: Deploy ke Vercel (Gratis & Otomatis)

1. Buka website **[https://vercel.com](https://vercel.com)** dan login menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** di pojok kanan atas, lalu pilih **Project**.
3. Di daftar repository GitHub Anda, cari dan pilih **`Project_SkripsiOB`** lalu klik **Import**.
4. Di halaman konfigurasi project (*Configure Project*):
   - **Framework Preset:** Biarkan `Vite` (sudah terdeteksi otomatis via `vercel.json`).
   - **Root Directory:** `./` (default).
   - Buka accordion **Environment Variables** dan tambahkan 2 variabel penting berikut:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://tgicdfugemwsrbdbtgda.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_RvmFF-NYiKuvpMbPtGsfTw_arSn_-0l` |

5. Klik tombol biru **Deploy**.
6. Vercel akan otomatis melakukan build (`npm run build`) dan mendeploy aplikasi Anda dalam waktu ~45 detik.
7. Setelah selesai, Vercel akan memberikan link domain publik, misalnya: `https://project-skripsi-ob.vercel.app`.

---

## 💻 Langkah 3: Menjalankan di Lokal (Localhost)

Jika ingin menjalankan di laptop / komputer lokal:
1. Pastikan file `.env` atau `.env.local` sudah terisi:
   ```env
   VITE_SUPABASE_URL=https://tgicdfugemwsrbdbtgda.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_RvmFF-NYiKuvpMbPtGsfTw_arSn_-0l
   ```
2. Jalankan:
   ```powershell
   npm run dev
   ```
3. Buka browser di `http://localhost:3000`.
4. Perhatikan navbar atas:
   - Badge hijau berkedip **`Supabase Cloud`** menandakan aplikasi terhubung langsung ke database PostgreSQL Supabase Anda secara real-time!

---

## 🛡️ Arsitektur Hybrid Fallback (Keamanan & Ketahanan)

Aplikasi dilengkapi proteksi fallback multi-lapis:
1. **Prioritas 1 (Supabase Cloud):** Jika internet & kredensial tersedia, seluruh data dibaca dan disimpan langsung ke Supabase PostgreSQL.
2. **Prioritas 2 (Laravel Backend Lokal):** Jika di laptop terpasang backend PHP/Laravel MySQL di port 8000, sistem otomatis menyinkronkan data ke MySQL.
3. **Prioritas 3 (Mode Lokal Browser / Offline):** Jika koneksi internet terputus, sistem tetap dapat beroperasi normal menggunakan localStorage tanpa pernah mengalami crash / error layar putih (*white-screen*).

---

## 🧾 Catatan Transaksi POS & Akuntansi SAK EMKM

- Setiap kali kasir menyelesaikan nota penjualan di POS, data transaksi disimpan ke Supabase `pos_transactions`, stok ban berkurang di `products`, mutasi tercatat di `stock_mutations`, dan jurnal debit/kredit SAK EMKM otomatis dibukukan di `journal_entries`.
- Jika nota dibatalkan (**VOID**) melalui menu Riwayat Nota, status transaksi diperbarui di Supabase, stok fisik ban dikembalikan, dan Jurnal Pembalik (*Reversing Journal*) otomatis diposting.
