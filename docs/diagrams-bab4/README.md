# Diagram Bab IV — Sistem Point of Sale & SIA SAK EMKM Omah Ban Cabang 3

Seluruh diagram di folder ini dibuat berdasarkan naskah skripsi (*Bab I–III* + *Matriks Revisi*: konsisten memakai istilah **Point of Sale**, menonjolkan **Pengendalian Internal / RBAC**, metode **FIFO**, **Midtrans QRIS**, dan standar **SAK EMKM**) serta diverifikasi langsung terhadap kode sumber `Project_SkripsiOB` dan skema basis data [`database/project-skripsi_ob (2).sql`](../database/project-skripsi_ob%20(2).sql).

Setiap diagram tersedia dalam dua format:
- **`.drawio`** — file sumber yang dapat diedit ulang kapan saja di [app.diagrams.net](https://app.diagrams.net), Draw.io Desktop, atau ekstensi Draw.io VS Code.
- **`.png`** — gambar resolusi tinggi (`@2x`, latar belakang putih bersih) yang siap langsung dimasukkan ke dokumen Word Bab IV.

## Daftar Diagram & Rekomendasi Penempatan di Bab IV

| No | Rekomendasi Subbab Bab IV | Nama File | Jenis Diagram | Keterangan Isi |
|---|---|---|---|---|
| 1 | 4.x Perancangan Use Case | `01-use-case-diagram.png` (`.drawio`) | Use Case Diagram | 3 aktor (*Kasir, Staf Gudang, Owner*) + sistem eksternal *Midtrans Payment Gateway (QRIS)*, mencakup seluruh modul POS, Shift Kasir, FIFO, Utang, Pengeluaran, Akuntansi SAK EMKM, Tutup Buku, dan Pengaturan RBAC. |
| 2 | 4.x Perancangan Flowchart | `02-flowchart-login-rbac.png` (`.drawio`) | Flowchart | Alur autentikasi Laravel Sanctum Bearer Token, pemuatan matriks `role_permissions`, dan verifikasi pengendalian akses (RBAC) termasuk penolakan `403 Forbidden` & pencatatan jejak audit. |
| 3 | 4.x Perancangan Flowchart | `03-flowchart-transaksi-pos-fifo.png` (`.drawio`) | Flowchart | Alur detail transaksi **Point of Sale**: validasi shift kasir terbuka untuk Tunai, pembayaran QRIS Dinamis Midtrans (*webhook/polling*), validasi & alokasi batch FIFO tertua, penjagaan `PeriodLock`, pembentukan jurnal berimbang otomatis, hingga cetak struk thermal 80mm. *(Melengkapi Gambar 3.2 di Bab III)*. |
| 4 | 4.x Perancangan Flowchart | `04-flowchart-stock-opname-fifo.png` (`.drawio`) | Flowchart | Alur *Stock Opname* oleh Staf Gudang: kunci produk, perbandingan stok fisik vs lapisan batch FIFO (kurang: potong batch tertua; lebih: buat batch surplus), pencatatan `stock_movements` (`OPN`), dan penjurnalan otomatis `InventoryValueJournal` (`1-2000` ↔ `5-2000`). |
| 5 | 4.x Perancangan Flowchart | `05-flowchart-pengeluaran-pelaporan-sak-emkm.png` (`.drawio`) | Flowchart | Alur pencatatan pengeluaran operasional (`BKK`) dengan validasi saldo Kas/Bank non-negatif, siklus penyusutan aset tetap, AJP akrual/dibayar di muka, rekonsiliasi bank, penyusunan otomatis Laporan Keuangan SAK EMKM + CALK, hingga tutup buku & kunci periode. |
| 6 | 4.x Perancangan Sequence Diagram | `06-sequence-transaksi-pos-qris.png` (`.drawio`) | Sequence Diagram | Interaksi teknis 17 langkah: Kasir ↔ Frontend React ↔ Laravel API (`CheckoutService`) ↔ Midtrans API (QRIS & Webhook SHA512) ↔ `FifoCosting` & `AccountingEngine` ↔ MySQL. |
| 7 | 4.x Perancangan Sequence Diagram | `07-sequence-pembelian-utang-fifo.png` (`.drawio`) | Sequence Diagram | Interaksi teknis 14 langkah: Staf Gudang & Owner ↔ Frontend React ↔ `GoodsReceiptService` & `PayableService` ↔ `FifoCosting` & `AccountingEngine` ↔ MySQL (penerimaan barang `GR`, batch FIFO, jurnal pembelian, dan pelunasan utang supplier). |
| 8 | 4.x Perancangan Sequence Diagram | `08-sequence-stock-opname.png` (`.drawio`) | Sequence Diagram | Interaksi teknis 11 langkah: Staf Gudang ↔ Frontend React ↔ `StockOpnameService` ↔ `InventoryValueJournal` & `AccountingEngine` ↔ MySQL. |
| 9 | 4.x Perancangan Sequence Diagram | `09-sequence-pelaporan-tutup-buku.png` (`.drawio`) | Sequence Diagram | Interaksi teknis 15 langkah: Owner ↔ Frontend React ↔ `DepreciationService` & `FinancialReportService` ↔ `PeriodClosingService` & `AccountingEngine` ↔ MySQL. |
| 10 | 4.x Perancangan Basis Data (ERD) | `10-erd-omah-ban-cabang3.png` (`.drawio`) | Entity Relationship Diagram (ERD) | Skema relasional lengkap berbasis `project-skripsi_ob (2).sql` (6 domain warna: Auth/RBAC, Master Katalog/Jasa/Supplier, Inventori FIFO & Audit Harga, Point of Sale/QRIS/Retur, Pembelian/Utang/Retur Beli, Akuntansi SAK EMKM/Shift/Aset Tetap/Rekonsiliasi Bank) dengan PK, FK, dan kardinalitas *Crow's Foot*. |
| 11 | 4.x Arsitektur Sistem & RBAC | `11-arsitektur-sistem-rbac.png` (`.drawio`) | Arsitektur Sistem | Arsitektur 4-lapis (*Pengguna RBAC → Frontend SPA React 19 → Backend REST API Laravel 13 + Pengendalian Internal + AccountingEngine → MySQL 8, Midtrans QRIS, & Printer Thermal 80mm*). |

> **Catatan:** Diagram proses bisnis eksisting/konseptual pada Bab III tetap tersedia di `docs/flowchart/` (`flowchart-penjualan-sia.drawio` dan `flowchart-pembelian-sia.drawio`).
