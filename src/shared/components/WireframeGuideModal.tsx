import React, { useState } from 'react';
import { 
  Layout, 
  X, 
  Layers, 
  CheckCircle2, 
  Monitor, 
  Smartphone, 
  Cpu, 
  FileText, 
  ShieldAlert, 
  Key, 
  Printer, 
  Database,
  Sliders
} from 'lucide-react';

interface WireframeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WireframeGuideModal: React.FC<WireframeGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'layar1' | 'layar2' | 'layar3' | 'layar4' | 'layar5' | 'layar6' | 'layar7' | 'designSystem'>('designSystem');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Dokumentasi Wireframe & Spesifikasi UI/UX Omah Ban Cabang 3
              </h2>
              <p className="text-xs text-slate-500">
                Arsitektur Desain Antarmuka ERP/POS & Pengelolaan Keuangan Standar Industri Otomotif
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-tabs for each screen */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto custom-scrollbar text-xs font-semibold">
          {[
            { id: 'designSystem', label: 'Design System & UX' },
            { id: 'layar1', label: 'Layar 1: POS Screen' },
            { id: 'layar2', label: 'Layar 2: Struk 80mm' },
            { id: 'layar3', label: 'Layar 3: Dashboard Owner' },
            { id: 'layar4', label: 'Layar 4: Inventory & Kartu Stok' },
            { id: 'layar5', label: 'Layar 5: Modul Expenses' },
            { id: 'layar6', label: 'Layar 6: General Ledger' },
            { id: 'layar7', label: 'Layar 7: Laporan Keuangan' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                activeTab === t.id
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar text-slate-700 text-xs sm:text-sm space-y-6 bg-white">
          {activeTab === 'designSystem' && (
            <div className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-600" />
                  <span>Karakteristik Pengguna & Lingkungan Kerja Bengkel Ban</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Toko ban dan bengkel spooring adalah lingkungan kerja fisik dengan paparan debu ban, oli, dan grease. Kasir sering melayani konsumen sambil berkoordinasi dengan montir, atau montir senior sendiri yang mengoperasikan layar sentuh (touchscreen) kasir.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="font-bold text-indigo-600 block text-xs">Touch-Target &gt;= 44px</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Semua tombol navigasi, quantity counters (+/-), tombol tambah produk, dan pilihan pembayaran didesain minimal 44x44px untuk akurasi sentuhan jari.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="font-bold text-amber-700 block text-xs">Keyboard Accelerators</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Kasir desktop dapat bekerja 100% tanpa mouse menggunakan shortcut: F2 (Cari), F8 (Diskon), F9 (Bayar/Checkout), Enter (Konfirmasi Bayar & Cetak), Esc (Tutup).
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="font-bold text-emerald-700 block text-xs">Palet Warna Clean Minimalism</span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Canvas bersih #F8FAFC, Vibrant Indigo (600) untuk aksi utama, Emerald (600) status lunas, Rose (600) stok kritis &lt;5 pcs.
                    </p>
                  </div>
                </div>
              </div>

              {/* State Handling Matrix */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900">Matriks State Handling Sistem</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono font-bold text-[10px]">
                      LOADING STATE
                    </span>
                    <span className="text-slate-600">
                      Skeleton shimmer pada katalog produk ban dan spinner animatif saat query mutasi &amp; pembuatan laporan keuangan.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-mono font-bold text-[10px]">
                      EMPTY STATE
                    </span>
                    <span className="text-slate-600">
                      Tampilan visual ilustratif saat keranjang kosong, hasil filter pencarian tidak ditemukan, atau belum ada pengeluaran kas.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono font-bold text-[10px]">
                      ERROR VALIDATION
                    </span>
                    <span className="text-slate-600">
                      Validasi uang bayar kurang dari total, saldo kas laci tidak cukup untuk biaya kas kecil, dan otorisasi PIN supervisor (1234) untuk perubahan harga.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'layar1' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 1: POS Screen (Kasir Penjualan Utama Split Layout 65% / 35%)
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------------------------+
| HEADER: [OMAH BAN CABANG 3] | Kasir: Fani A. (Shift Pagi) | Kas Laci: Rp 2.430.000 | [F2][F8][F9]  |
+------------------------------------------------------------------+---------------------------------+
| KOLOM KIRI (65%) - KATALOG PRODUK & SEARCH MULTI-FILTER          | KOLOM KANAN (35%) - KERANJANG   |
| [Input Barcode / Search "185/65 R15" [F2]] [Scan Btn]            | Plat No: [B 1984 SKZ] Cust: Hend|
| Brand Filter: [Semua] [Bridgestone] [Accelera] [Dunlop] ...     |---------------------------------|
| Ring Filter:  [Semua] [R13] [R14] [R15] [R16] [R17] [R18+]      | DAFTAR ITEM:                    |
|------------------------------------------------------------------| 1. Bridgestone Turanza T005A    |
| [Card: Bridgestone Turanza] [Card: Accelera PHI-R (KRITIS!)]     |    185/65 R15 | Rp 1.050.000    |
| - Ukuran: 185/65 R15 Ring 15| - Ukuran: 185/65 R15 (Stok: 3)    |    Qty: [-] [ 4 ] [+]           |
| - Tahun: 2024 | BARU        | - Tahun: 2024 | BARU              |    Diskon: -Rp 50.000/pc        |
| - Stok: 14 pcs              | - Harga: Rp 680.000               |    [Edit Harga SPV (PIN)] [Hapus|
| - Harga: Rp 1.050.000       | - [+ Tambah (min 44x44px)]        |---------------------------------|
| - [+ Tambah (min 44x44px)]  |                                   | Subtotal:         Rp 4.200.000  |
|                             |                                   | Diskon Promosi:  -Rp   200.000  |
| [Card: Dunlop Enasave EC300+] [Card: Forceum Hena Directional]  | PPN 11% (Toggle): Rp         0  |
| - Ukuran: 185/65 R15        | - Ukuran: 215/55 R17              | TOTAL TAGIHAN:    Rp 4.000.000  |
| - Stok: 18 pcs              | - Stok: 4 pcs (Kritis!)           | [Diskon (F8)] [BAYAR & CETAK F9]|
+------------------------------------------------------------------+---------------------------------+`}
              </div>
            </div>
          )}

          {activeTab === 'layar2' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 2: Printer-Ready Thermal Receipt 80mm
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+------------------------------------------------+
|           OMAH BAN CABANG 3 (OB3)              |
|        PUSAT PENJUALAN BAN & SPOORING 3D       |
|    Jl. Raya Otomotif No. 88, BSD Tangerang     |
|             Telp: (021) 543-9988               |
| - - - - - - - - - - - - - - - - - - - - - - -  |
| No. Nota:  OB3-INV-202609-0140                 |
| Waktu:     2026-09-02 09:30:15                 |
| Kasir:     Fani A. (Shift Pagi)                |
| Pelanggan: Pak Hendra Gunawan                  |
| Plat Mobil:B 1984 SKZ (Innova Reborn)          |
| - - - - - - - - - - - - - - - - - - - - - - -  |
| ITEM PRODUK BAN                      SUBTOTAL  |
| Bridgestone Turanza T005A                      |
| 185/65 R15 • Bridgestone                       |
| 4 pcs x Rp 1.050.000 (Disc -50.000)Rp 4.000.000|
| - - - - - - - - - - - - - - - - - - - - - - -  |
| Subtotal:                          Rp 4.200.000|
| Total Diskon Promosi:             -Rp   200.000|
| GRAND TOTAL:                       Rp 4.000.000|
| Metode Bayar:                      TRANSFER BCA|
| Uang Diterima:                     Rp 4.000.000|
| Kembalian:                         Rp         0|
| - - - - - - - - - - - - - - - - - - - - - - -  |
|      ★ KEBIJAKAN GARANSI OMAH BAN ★            |
| Garansi pabrik 1 tahun cacat produksi.         |
| Gratis Nitrogen & Balancing 2x dalam 6 bulan.  |
| ||||| || ||||||| ||| |||| |||||| |||||         |
|      TERIMA KASIH ATAS KUNJUNGAN ANDA!         |
+------------------------------------------------+`}
              </div>
            </div>
          )}

          {activeTab === 'layar3' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 3: Dashboard Eksekutif Owner
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------------------------+
| KPI CARDS:                                                                                         |
| [1. Penjualan Hari Ini]  [2. Laba Kotor Hari Ini]  [3. Pengeluaran Bulan Ini]  [4. Stok Minimum]   |
| Rp 13.440.000            Rp 2.190.000 (Margin 16%) Rp 3.320.000                3 Ukuran Ban        |
| 10 Ban Terjual • 3 Nota  HPP: Rp 11.250.000        4 Pos Pengeluaran           [Kedip Merah < 5]   |
+------------------------------------------------------------------+---------------------------------+
| GRAFIK TREN OMZET vs HPP (7 HARI TERAKHIR)                       | PANGSA PENJUALAN BRAND (DONUT)  |
| Rp 30jt|             /\ (Weekend Peak)                           | Bridgestone: 40% (Indigo)       |
| Rp 20jt|            /  \                                         | Accelera:    25% (Amber)        |
| Rp 10jt|    /\     /    \      /\                                | Dunlop:      20% (Emerald)      |
|    0jt-+---+------+------+----+------+                           | Forceum:     15% (Purple)       |
|        27  28     29     30   31   01 02                         |                                 |
+------------------------------------------------------------------+---------------------------------+
| TABEL TRANSAKSI TERKINI (Live Updated)                           | TABEL BAN TERLARIS (FAST-MOVING)|
| OB3-INV-0140 | Pak Hendra | Innova | Rp 4.000.000 | LUNAS        | 1. Bridgestone Turanza (8 pcs)  |
| OB3-INV-0141 | Ibu Ratna  | Brio   | Rp 1.240.000 | LUNAS        | 2. Accelera PHI-R      (6 pcs)  |
+------------------------------------------------------------------+---------------------------------+`}
              </div>
            </div>
          )}

          {activeTab === 'layar4' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 4: Inventory Master & Kartu Stok (Stock Card)
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------------------------+
| INVENTORY STATS: Total Stok: 114 pcs | Valuasi HPP: Rp 93.850.000 | Nilai Jual: Rp 119.200.000      |
| [Search...] | Filter Brand: [All] [BS] [Acc] ... | Filter Ring: [All] [R15] ... | [Stock Opname]   |
+----------------------------------------------------------------------------------------------------+
| BARCODE       NAMA PRODUK               UKURAN & RING   THN/KOND   STOK     HPP (BELI)  HARGA JUAL |
| 8993001018515 Bridgestone Turanza T005A 185/65 R15 R15 2024 BARU  14 pcs   Rp 840.000  Rp1.050.000|
| 8993002018515 Accelera PHI-R            185/65 R15 R15 2024 BARU   3 pcs !  Rp 520.000  Rp  680.000|
+----------------------------------------------------------------------------------------------------+
| DRAWER / MODAL KARTU STOK:                                                                         |
| Riwayat Mutasi: Tgl | No. Ref | Masuk / Keluar | Saldo | Keterangan & Operator                     |
| 01/09/26 | PO-SUP-BS-889     | MASUK  +20 pcs | 20 pcs | Kiriman Gudang Pusat (Bambang)            |
| 02/09/26 | OB3-INV-0140      | KELUAR - 4 pcs | 14 pcs | Penjualan Pak Hendra Gunawan (Fani A.)    |
+----------------------------------------------------------------------------------------------------+`}
              </div>
            </div>
          )}

          {activeTab === 'layar5' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 5: Modul Expenses (Input Biaya Operasional Toko)
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+------------------------------------------------------------------+---------------------------------+
| FORM INPUT BIAYA OPERASIONAL                                     | RIWAYAT BIAYA BULAN INI         |
| Kategori:  [Listrik, Air & Utilitas v]  Tgl: [2026-09-02]        | BIAYA-001 | Listrik PLN 6600VA  |
| Nominal:   [Rp 1.450.000            ]                            |   Rp 1.450.000 via Bank BCA     |
| Sumber:    [Kas Tunai Laci Kasir vs Rekening Bank BCA Cabang 3]  | BIAYA-002 | Gaji Montir (Agus)  |
| Penerima:  [Toko Perkakas Teknik BSD]                            |   Rp 900.000 via Kas Laci       |
| Upload Nota: [ Drag & Drop Area / Click File Bukti Fisik ]       | BIAYA-003 | Kalibrasi HawkEye 3D|
|------------------------------------------------------------------|   Rp 650.000 via Bank BCA     |
| PREVIEW JURNAL AKUNTANSI OTOMATIS:                               |---------------------------------|
| (D) 6-1002 Beban Listrik, Air & Utilitas     Rp 1.450.000        | Total Biaya Bulan Ini:          |
|     (K) 1-1002 Bank BCA Cabang 3             Rp 1.450.000        | Rp 3.320.000                    |
| [SIMPAN BIAYA & POSTING JURNAL OTOMATIS]                         |                                 |
+------------------------------------------------------------------+---------------------------------+`}
              </div>
            </div>
          )}

          {activeTab === 'layar6' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 6: General Ledger & Jurnal Double-Entry
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------------------------+
| TANGGAL    NO JURNAL        NO REF TRANSAKSI  AKUN REKENING                DEBIT (RP)     KREDIT (RP)|
| 02/09/2026 JU-202609-0001   OB3-INV-0140      1-1002 Bank BCA Cabang 3    Rp 4.000.000             -|
|                                               4-1002 Diskon Promosi       Rp   200.000             -|
|                                               4-1001 Pendapatan Penjualan            -   Rp 4.200.000|
|                                               5-1001 Beban Pokok HPP      Rp 3.360.000             -|
|                                               1-1004 Persediaan Ban                  -   Rp 3.360.000|
|----------------------------------------------------------------------------------------------------+
| FOOTER BALANCE INDICATOR:                                                                          |
| Status Neraca Saldo: [✓ 100% SEIMBANG (BALANCED)] | Total Debit: Rp 21.320.000 | Kredit: Rp 21.320.000|
+----------------------------------------------------------------------------------------------------+`}
              </div>
            </div>
          )}

          {activeTab === 'layar7' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base">
                Layar 7: Laporan Laba Rugi & Neraca (Standar SAK EMKM Indonesia)
              </h3>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 whitespace-pre overflow-x-auto">
{`+----------------------------------------------------------------------------------------------------+
|                      OMAH BAN CABANG 3 - LAPORAN LABA RUGI KOMPREHENSIF                            |
|                            Periode Berjalan: September 2026                                        |
+----------------------------------------------------------------------------------------------------+
| I. PENDAPATAN OPERASIONAL:                                                                         |
|    Penjualan Kotor Ban                                                      Rp 14.080.000          |
|    Dikurangi: Potongan Diskon Promosi Penjualan                            (Rp    640.000)         |
|    TOTAL PENDAPATAN BERSIH                                                  Rp 13.440.000          |
|                                                                                                    |
| II. BEBAN POKOK PENJUALAN (HPP):                                                                   |
|    Persediaan Awal + Pembelian Bersih - Persediaan Akhir = HPP             (Rp 11.250.000)         |
|                                                                                                    |
| III. LABA KOTOR (GROSS PROFIT):                                             Rp  2.190.000 (16.3%)  |
|                                                                                                    |
| IV. BEBAN OPERASIONAL: Listrik, Gaji Montir, ATK, Kalibrasi Mesin          (Rp  3.320.000)         |
|                                                                                                    |
| V. LABA BERSIH OPERASIONAL (NET PROFIT):                                   (Rp  1.130.000)         |
+----------------------------------------------------------------------------------------------------+
| NERACA KEUANGAN:                                                                                   |
| Total Aset (Lancar + Tetap Bengkel)            Rp 256.400.000                                      |
| Total Liabilitas & Ekuitas Pemilik             Rp 256.400.000 [BALANCE MATCH 100%]                 |
+----------------------------------------------------------------------------------------------------+`}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
          >
            Tutup Spesifikasi Wireframe
          </button>
        </div>
      </div>
    </div>
  );
};
