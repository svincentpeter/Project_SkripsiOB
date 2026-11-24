---
trigger: model_decision
description: Peraturan wajib saat brainstorming, menulis, meninjau, atau merevisi laporan skripsi (Bab 1-5) di D:\SKRIPSI dan menyimpan hasilnya di D:\SKRIPSI\Buatan AI.
---

# Peraturan Penulisan, Brainstorming, dan Revisi Laporan Skripsi

Terapkan seluruh aturan berikut setiap kali pengguna melakukan brainstorming, meminta bantuan penulisan, atau meminta revisi laporan skripsi.

## 1. Lokasi File dan Output

- **Lokasi file skripsi pengguna:** `D:\SKRIPSI`
  - Proposal acuan Bab 1–3: `D:\SKRIPSI\23.G4.0007 - CATHERINE WONG - Proposal.docx` (cek bila ada versi lebih baru).
  - Draf Bab 4: `D:\SKRIPSI\BAB_4_HASIL_DAN_PEMBAHASAN.docx`
- **Lokasi output AI (WAJIB):** `D:\SKRIPSI\Buatan AI`
  - Simpan semua hasil buatan AI, draf, maupun file revisi di `D:\SKRIPSI\Buatan AI`.
  - Jangan menimpa file asli pengguna di `D:\SKRIPSI` kecuali diminta secara eksplisit.
- **Acuan fakta sistem:** kode dan dokumentasi aktual di `c:\Projects\Project_SkripsiOB`.

## 2. Konsistensi Istilah dan Singkatan (Bab 1–5)

1. Gunakan istilah **"sistem Point of Sale"** secara konsisten dari Bab 1 sampai Bab 5. **Jangan pernah** menggunakan istilah **"sistem kasir"**.
2. **Jangan pernah** menyingkat **"Point of Sale"** menjadi **"POS"**.
3. **Jangan pernah** menyingkat **"Sistem Informasi Akuntansi"** menjadi **"SIA"**.
4. Untuk penulisan *Rapid Application Development* pada **Bab 4 dan Bab 5** (jika ada), tuliskan sebagai **"RAD"**.
5. Jaga agar seluruh istilah lainnya selaras dan konsisten dari Bab 1 sampai Bab 5.

## 3. Konsistensi Bab 1–3 dan Kesesuaian Fakta Sistem di Bab 4

1. Setiap revisi wajib konsisten dengan pembahasan pada Bab 1–3 (rumusan masalah, tujuan, batasan masalah, teori, dan metode).
2. Khusus **Bab 4 (Hasil dan Pembahasan)**:
   - Wajib ditulis secara faktual sesuai dengan sistem yang benar-benar sudah dibangun di `c:\Projects\Project_SkripsiOB` (verifikasi ke kode, migrasi, endpoint, dan fitur aktual — jangan mengarang).
   - Seluruh pembahasan Bab 4 harus menjawab dan memberikan solusi atas rumusan masalah yang ditulis di Bab 1.

## 4. Gaya Penulisan, Humanizer, dan KBBI

1. Wajib baca dan terapkan skill **`humanizer`** (`.agents/skills/humanizer/SKILL.md`) setiap kali menulis atau merevisi naskah laporan.
2. Buat penulisan rapi, mudah dipahami, dan sesuai **KBBI**.
3. Hindari kata yang jarang dipakai dan pola kalimat khas AI (kalimat klise, kontras *bukan hanya X melainkan Y* yang berulang, triad yang dipaksakan, tanda pisah berlebihan, bahasa terlalu kaku/baku secara buatan).
4. Gunakan gaya bahasa yang natural seperti mahasiswa yang mengerjakan skripsinya sendiri — tetap ilmiah dan sopan, tetapi mengalir dan enak dibaca.

## 5. Sinkronisasi

Salinan panduan ini untuk dibaca pengguna tersedia di `D:\SKRIPSI\Buatan AI\ATURAN_PENULISAN_SKRIPSI.md`. Jika pengguna menambah atau mengubah aturan skripsi, perbarui kedua file secara bersamaan.
