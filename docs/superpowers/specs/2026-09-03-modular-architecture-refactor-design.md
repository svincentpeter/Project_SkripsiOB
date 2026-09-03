# Desain Spesifikasi Arsitektur: Rekonstruksi Folder Modular & Services Mandiri

## 1. Pendahuluan
Dokumen ini mendefinisikan rancangan arsitektur modular (*Feature-Based Architecture*) untuk sistem Point of Sale (POS) dan Pengelolaan Keuangan SAK EMKM pada **Omah Ban Cabang 3 (OB3)**. Sistem direstrukturisasi agar komponen terorganisir rapi per modul fitur (seperti pada pola modular ProjectOmahBan), logika bisnis dipisahkan ke dalam *Services* mandiri, serta sumber daya global dikelompokkan ke dalam folder *Shared*.

---

## 2. Struktur Direktori Sasaran

`
src/
├── modules/                                # Modul Per Fitur / Menu
│   ├── pos/                                # 1. Modul Terminal Kasir POS Fullscreen
│   │   ├── components/
│   │   │   ├── PosProductCatalog.tsx       # Grid ban & filter ring/merek
│   │   │   ├── PosCartDocket.tsx           # Doket kasir, plat kendaraan, stepper qty
│   │   │   ├── PosPaymentModal.tsx         # Numpad sentuh & kalkulasi kembalian
│   │   │   └── PosSupervisorModal.tsx      # PIN 1234 otorisasi harga khusus
│   │   ├── PosScreen.tsx                   # Kiosk Workstation Kasir
│   │   └── index.ts
│   │
│   ├── dashboard/                          # 2. Modul Dashboard Eksekutif (Majestic)
│   │   ├── components/
│   │   │   ├── DashboardKpiStrip.tsx       # 5 Dark Icon Boxes khas Majestic
│   │   │   ├── DashboardSparklineCards.tsx # 4 Kartu Cash Sales, Income, Beban, Kas
│   │   │   ├── DashboardTrendChart.tsx     # Grafik SVG tren omzet vs HPP 7 hari
│   │   │   ├── DashboardBrandDonut.tsx     # Donut chart pangsa merek ban
│   │   │   └── DashboardFastMovingTable.tsx# Tabel produk terlaris & stok kritis
│   │   ├── ExecutiveDashboardScreen.tsx    # Layar Dashboard Utama
│   │   └── index.ts
│   │
│   ├── inventory/                          # 3. Modul Gudang & Inventori FIFO
│   │   ├── components/
│   │   │   ├── ProductFifoBatchList.tsx    # Kartu lapisan batch pembelian FIFO
│   │   │   ├── StockCardDrawer.tsx         # Riwayat mutasi kartu stok keluar/masuk
│   │   │   └── StockOpnameModal.tsx        # Form opname fisik vs sistem
│   │   ├── InventoryScreen.tsx             # Layar Master Stok Ban
│   │   └── index.ts
│   │
│   ├── expenses/                           # 4. Modul Biaya Operasional Toko
│   │   ├── components/
│   │   │   ├── ExpenseFormModal.tsx        # Form catat biaya & upload nota
│   │   │   └── ExpenseTable.tsx            # Tabel riwayat pengeluaran kas kecil/bank
│   │   ├── ExpensesScreen.tsx              # Layar Beban Operasional
│   │   └── index.ts
│   │
│   ├── accounting/                         # 5. Modul Akuntansi (Buku Besar & SAK EMKM)
│   │   ├── components/
│   │   │   ├── GeneralLedgerView.tsx       # Jurnal umum debit-kredit & buku besar
│   │   │   ├── ProfitLossStatement.tsx     # Laporan Laba Rugi SAK EMKM formal
│   │   │   ├── BalanceSheetStatement.tsx   # Laporan Posisi Keuangan (Neraca seimbang)
│   │   │   └── FinancialNotesView.tsx      # Catatan Atas Laporan Keuangan (CALK)
│   │   ├── GeneralLedgerScreen.tsx         # Layar Buku Besar
│   │   ├── FinancialStatementsScreen.tsx   # Layar Laporan Keuangan
│   │   └── index.ts
│   │
│   └── receipt/                            # 6. Modul Arsip Struk Transaksi
│       ├── components/
│       │   └── ThermalReceiptPaper.tsx     # Visual struk thermal 80mm bergerigi
│       ├── ThermalReceiptScreen.tsx        # Layar Riwayat & Cetak Struk
│       └── index.ts
│
├── services/                               # Lapisan Bisnis Logika Mandiri
│   ├── fifoCostingService.ts               # Algoritma konsumsi batch FIFO & HPP riil
│   ├── posService.ts                       # Checkout transaksi kasir & alokasi nomor nota
│   ├── inventoryService.ts                 # Mutasi stok, penyesuaian opname gudang
│   ├── accountingService.ts                # Auto-journaling berpasangan (SAK EMKM)
│   ├── storageService.ts                   # Abstraksi sinkronisasi LocalStorage / API backend
│   └── index.ts
│
├── shared/                                 # Sumber Daya Bersama (Global)
│   ├── components/
│   │   ├── HeaderNavbar.tsx                # 2-Tier Majestic Top Bar & Menu Bar
│   │   └── WireframeGuideModal.tsx         # Modal panduan arsitektur & wireframe
│   ├── types/
│   │   └── index.ts                        # Definisi tipe TireProduct, Batch, POS, COA
│   ├── utils/
│   │   ├── formatters.ts                   # formatRupiah, formatDateIndo
│   │   └── audioUtils.ts                   # Audio laser barcode & solenoid laci kasir
│   └── data/
│       └── mockData.ts                     # Data seed ban baru, COA, batch FIFO
│
├── App.tsx                                 # Router Layar & Central State Store
└── main.tsx                                # Entrypoint Aplikasi React
`

---

## 3. Rincian Lapisan Bisnis Logika (Services)

1. **ifoCostingService.ts**:
   - calculateFifoAllocation(product: TireProduct, quantitySold: number): { allocatedBatches, totalHpp, remainingBatches }
   - Memastikan ban yang dijual memotong stok dari batch dengan tanggal terlama terlebih dahulu.

2. **posService.ts**:
   - processCheckout(cartItems, customerPlate, customerModel, paymentDetails): Menghitung subtotal, diskon, PPN, dan menghasilkan objek PosTransaction.
   - Menghasilkan nomor nota faktur unik OB3-INV-YYYYMM-XXXX.

3. **inventoryService.ts**:
   - 
ecordStockMutation(product, type, qty, referenceNo, notes): Menghasilkan catatan kartu stok dengan saldo berjalan (*running balance*).
   - processStockOpname(inputs, products, operator, notes): Menghitung selisih fisik vs sistem dan mencatat mutasi penyesuaian (*Adjustment*).

4. **ccountingService.ts**:
   - generateSalesJournal(transaction): Menghasilkan jurnal umum berpasangan (Debit Kas/Bank, Debit HPP, Kredit Penjualan, Kredit Persediaan).
   - generateExpenseJournal(expense): Menghasilkan jurnal beban (Debit Akun Beban, Kredit Kas/Bank).
   - generateSaakEmkmStatements(transactions, expenses, products, cashInDrawer): Menghitung Laporan Laba Rugi dan Neraca Saldo.

5. **storageService.ts**:
   - Abstraksi penyimpanan data lokal (localStorage) dengan penanganan *fallback* dan kemudahan migrasi ke endpoint REST API backend.

---

## 4. Rincian Modul Per Fitur

1. **modules/pos**:
   - Kiosk layar sentuh khusus meja kasir ban.
   - Dekopel menjadi sub-komponen: PosProductCatalog, PosCartDocket, PosPaymentModal, dan PosSupervisorModal.
2. **modules/dashboard**:
   - Dashboard eksekutif bergaya Majestic Admin.
   - Dekopel menjadi: DashboardKpiStrip, DashboardSparklineCards, DashboardTrendChart, DashboardBrandDonut, dan DashboardFastMovingTable.
3. **modules/inventory**:
   - Master stok ban dan pengelolaan batch FIFO.
   - Dekopel menjadi: ProductFifoBatchList, StockCardDrawer, dan StockOpnameModal.
4. **modules/expenses**:
   - Pengelolaan biaya operasional bengkel (listrik, gaji montir, ATK).
   - Dekopel menjadi: ExpenseFormModal dan ExpenseTable.
5. **modules/accounting**:
   - Kesatuan modul akuntansi SAK EMKM.
   - Berisi GeneralLedgerScreen (Buku Besar) dan FinancialStatementsScreen (Laba Rugi & Neraca).
6. **modules/receipt**:
   - Arsip struk kasir dan cetak nota thermal 80mm.
   - Berisi ThermalReceiptScreen dan komponen visual kertas struk bergerigi ThermalReceiptPaper.

---

## 5. Rencana Transisi & Kompatibilitas
- Komponen lama yang berada di src/components akan dipindahkan secara teratur ke modul-modul bersangkutan.
- src/types.ts, src/utils, dan src/data dipindahkan ke src/shared/.
- Import path di seluruh aplikasi (App.tsx, HeaderNavbar.tsx, dll) diperbarui ke lokasi modular baru.
- Verifikasi kompilasi TypeScript (
pm run lint) dan build produksi (
pm run build) harus lulus 100% tanpa error.
