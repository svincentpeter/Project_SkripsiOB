import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  X, 
  ShoppingCart, 
  Receipt, 
  Package, 
  Wallet, 
  LayoutDashboard, 
  Settings, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Clock, 
  Truck, 
  Printer, 
  Search, 
  ShieldCheck, 
  DollarSign, 
  Info,
  ChevronRight,
  ArrowRight,
  AlertCircle
} from 'lucide-react';

export interface WireframeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTabId = 
  | 'sop' 
  | 'pos' 
  | 'receipt' 
  | 'inventory' 
  | 'expenses' 
  | 'dashboard' 
  | 'ledger' 
  | 'financials' 
  | 'settings' 
  | 'faq';

interface GuideTabItem {
  id: GuideTabId;
  label: string;
  badge: string;
  icon: React.ElementType;
}

const GUIDE_TABS: GuideTabItem[] = [
  { id: 'sop', label: '1. SOP Harian Toko', badge: 'Wajib Staf', icon: Clock },
  { id: 'pos', label: '2. Terminal Kasir (POS)', badge: 'Penjualan', icon: ShoppingCart },
  { id: 'receipt', label: '3. Struk & Batal Nota', badge: 'Kasir & VOID', icon: Receipt },
  { id: 'inventory', label: '4. Stok Ban & FIFO', badge: 'Gudang Ban', icon: Package },
  { id: 'expenses', label: '5. Biaya & Kas Kecil', badge: 'Operasional', icon: Wallet },
  { id: 'dashboard', label: '6. Dashboard Owner', badge: 'Pantau Bisnis', icon: LayoutDashboard },
  { id: 'ledger', label: '7. Bon & Hutang Tempo', badge: 'Piutang & Hutang', icon: FileText },
  { id: 'financials', label: '8. Laporan Keuangan', badge: 'SAK EMKM IAI', icon: DollarSign },
  { id: 'settings', label: '9. Hak Akses & Toko', badge: 'Keamanan', icon: Settings },
  { id: 'faq', label: '10. Tanya Jawab (FAQ)', badge: 'Solusi Kendala', icon: HelpCircle },
];

export const WireframeGuideModal: React.FC<WireframeGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTabId>('sop');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return GUIDE_TABS;
    const q = searchQuery.toLowerCase();
    return GUIDE_TABS.filter(tab => 
      tab.label.toLowerCase().includes(q) || 
      tab.badge.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-6xl h-[94vh] sm:h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-xl font-black tracking-tight text-white truncate">
                  Buku Panduan Pengguna Omah Ban Cabang 3
                </h2>
                <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Panduan Pemilik & Kasir
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hidden sm:inline-block">
                  Cabang Magelang
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                Petunjuk lengkap cara kerja menu, alur transaksi bengkel, dan tata cara pembukuan tanpa istilah rumit
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer ml-2"
            title="Tutup Panduan"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar + Quick Search */}
        <div className="bg-slate-100/90 border-b border-slate-200 p-2 sm:px-4 sm:py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-1">
            {filteredTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-500'
                      : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200/80'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    isActive ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari topik panduan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 text-slate-800 text-sm leading-relaxed bg-white">
          
          {/* TAB 1: SOP ALUR HARIAN TOKO */}
          {activeTab === 'sop' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-linear-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">SOP Harian: Alur Buka s/d Tutup Toko Omah Ban</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Ikuti alur ini setiap hari agar uang fisik di laci kasir dan stok ban di rak selalu cocok 100% dengan data di komputer.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pagi */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider mb-2">
                      <Clock className="w-4 h-4" />
                      <span>Fase Pagi (08:00 WIB)</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-3">Persiapan & Buka Kasir</h4>
                    <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
                      <li>Nyalakan komputer dan pastikan printer struk kasir 80mm menyala serta terisi kertas.</li>
                      <li>Login ke akun kasir Anda.</li>
                      <li>Periksa modal uang receh di laci kasir (standar toko: Rp 500.000 untuk uang kembalian).</li>
                      <li>Klik ikon lonceng notifikasi di pojok kanan atas untuk melihat bon yang sudah jatuh tempo atau ban yang habis.</li>
                    </ol>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-amber-800 bg-amber-50 rounded-lg p-2 font-medium">
                    ⚠️ Pastikan uang receh di laci sudah dihitung sebelum melayani pelanggan pertama.
                  </div>
                </div>

                {/* Siang */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-blue-700 font-bold text-xs uppercase tracking-wider mb-2">
                      <ShoppingCart className="w-4 h-4" />
                      <span>Fase Siang (Jam Operasional)</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-3">Pelayanan & Pemasangan Ban</h4>
                    <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
                      <li>Pelanggan datang, kasir mengetik nomor plat mobil pelanggan (misal: AA 1234 OB) dan nama pemilik.</li>
                      <li>Masukkan ban atau jasa yang dibeli (Spooring, Balancing, Pasang Baru).</li>
                      <li>Jika mobil masih didongkrak di pit servis, kasir bisa klik <strong>"Tahan Transaksi"</strong> agar kasir bisa melayani mobil berikutnya.</li>
                      <li>Setelah selesai dipasang, buka kembali transaksi, pilih cara bayar (Tunai/QRIS/Debit/Bon), lalu cetak struk nota untuk pelanggan.</li>
                    </ol>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-blue-800 bg-blue-50 rounded-lg p-2 font-medium">
                    💡 Berikan struk dan kartu garansi ban kepada pelanggan sebagai bukti resmi toko.
                  </div>
                </div>

                {/* Sore/Malam */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Fase Sore (17:00 WIB)</span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm mb-3">Tutup Kasir & Setoran</h4>
                    <ol className="space-y-2 text-xs text-slate-600 list-decimal list-inside">
                      <li>Pastikan seluruh pengeluaran kas kecil (beli makan montir, air galon, bensin pick-up) sudah dicatat di menu <strong>Biaya Toko</strong>.</li>
                      <li>Hitung seluruh uang fisik di laci kasir.</li>
                      <li>Buka menu <strong>Riwayat Struk</strong>, bandingkan total uang fisik dengan total penerimaan tunai hari ini.</li>
                      <li>Sisihkan kembali uang modal awal (Rp 500.000) di laci untuk besok pagi.</li>
                      <li>Serahkan uang hasil omzet penjualan bersih hari ini kepada Owner toko atau transfer ke rekening toko.</li>
                    </ol>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-emerald-800 bg-emerald-50 rounded-lg p-2 font-medium">
                    ✅ Jika ada selisih, cek apakah ada bon yang belum dicatat atau uang operasional yang lupa diinput.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TERMINAL KASIR (POS) */}
          {activeTab === 'pos' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Terminal Kasir (POS): Jual Ban & Jasa Bengkel</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Menu utama kasir untuk melayani penjualan ban, velg, oli, jasa spooring, balancing, dan melayani booking ban inden.
                    </p>
                  </div>
                </div>
              </div>

              {/* Langkah Transaksi */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-indigo-600" />
                  <span>Cara Melakukan Transaksi Penjualan Standar</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Langkah 1</span>
                    <p className="font-bold text-xs text-slate-800 mt-1">Input Data Mobil Pelanggan</p>
                    <p className="text-[11px] text-slate-500">
                      Ketik Nomor Plat Mobil (contoh: <code>AA 4455 OB</code>), nama pelanggan, dan nomor WhatsApp. Plat mobil wajib diisi untuk riwayat garansi.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Langkah 2</span>
                    <p className="font-bold text-xs text-slate-800 mt-1">Pilih Ban & Jasa Bengkel</p>
                    <p className="text-[11px] text-slate-500">
                      Ketik ukuran ban (misal: <code>185/65 R15</code>) di kolom cari produk. Klik ban untuk memasukkan ke keranjang. Klik tab <strong>Jasa</strong> untuk menambah Spooring/Balancing.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Langkah 3</span>
                    <p className="font-bold text-xs text-slate-800 mt-1">Atur Diskon & Metode Bayar</p>
                    <p className="text-[11px] text-slate-500">
                      Jika Owner menyetujui diskon, masukkan nominal potongan di kolom Diskon. Lalu pilih metode: <strong>Tunai</strong>, <strong>Transfer/QRIS</strong>, <strong>Kartu Debit</strong>, atau <strong>Bon (Tempo)</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">Langkah 4</span>
                    <p className="font-bold text-xs text-slate-800 mt-1">Bayar & Cetak Nota</p>
                    <p className="text-[11px] text-slate-500">
                      Klik tombol hijau <strong>"Bayar & Cetak Struk"</strong>. Komputer akan mencetak struk thermal 80mm secara otomatis dan stok ban langsung terpotong dari gudang.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fitur Penting POS */}
              <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-indigo-950">Fitur Khusus yang Wajib Diketahui Kasir</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span>Fitur "Tahan Transaksi" (Parkir Nota)</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Bila mobil pelanggan sedang dipasang ban di area bengkel dan butuh waktu 30 menit, kasir tidak perlu menunggu. Klik tombol <strong>"Tahan Nota"</strong>. Kasir bisa melayani mobil lain. Saat pelanggan selesai, buka menu nota yang ditahan untuk menyelesaikan pembayaran.
                    </p>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>Fitur "Booking Ban Inden & DP"</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Jika pelanggan mencari ban ukuran khusus yang belum ready di toko, buatkan pesanan inden via tombol <strong>"Booking"</strong>. Terima uang muka (DP). Saat ban pesanan tiba dari distributor, buka riwayat booking dan ubah menjadi transaksi selesai.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RIWAYAT STRUK & BATAL NOTA */}
          {activeTab === 'receipt' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Riwayat Struk & Pembatalan (VOID)</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Melihat kembali semua bukti penjualan toko, mencetak ulang struk yang hilang, atau membatalkan nota yang salah input.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Cetak Ulang */}
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                      <Printer className="w-4 h-4 text-indigo-600" />
                      <span>Cara Cetak Ulang Struk Kasir</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Jika pelanggan meminta struk tambahan atau kertas printer macet:
                    </p>
                    <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
                      <li>Buka menu <strong>Riwayat Struk</strong>.</li>
                      <li>Ketik plat mobil pelanggan atau nomor faktur di kolom pencarian.</li>
                      <li>Klik tombol <strong>"Cetak Struk (80mm)"</strong> untuk printer kasir.</li>
                      <li>Atau klik <strong>"Faktur A4"</strong> jika pelanggan perusahaan/kantor membutuhkan invoice lebar bertanda tangan toko.</li>
                    </ol>
                  </div>

                  {/* Batal Transaksi (VOID) */}
                  <div className="border border-rose-200 rounded-2xl p-4 bg-rose-50/50 space-y-2.5">
                    <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Cara Membatalkan Transaksi yang Salah (VOID)</span>
                    </div>
                    <p className="text-xs text-slate-600">
                      Gunakan ini jika kasir salah memilih ukuran ban atau salah memasukkan jumlah ban dan nota sudah terlanjur dicetak:
                    </p>
                    <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside">
                      <li>Cari nota transaksi yang salah di tabel.</li>
                      <li>Klik tombol merah <strong>"Batalkan Transaksi (VOID)"</strong>.</li>
                      <li>Pilih atau ketik alasan pembatalan (misal: <em>"Salah ukuran ring velg"</em>).</li>
                      <li>Konfirmasi pembatalan.</li>
                    </ol>
                    <div className="bg-rose-100/70 border border-rose-300 rounded-lg p-2 text-[11px] text-rose-800 font-medium">
                      🛡️ <strong>Aman untuk Pembukuan:</strong> Saat Anda membatalkan nota, sistem secara otomatis mengembalikan stok ban ke rak gudang dan membalikkan jurnal pencatatan uang kas.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INVENTORI & STOK FIFO */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Package className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Inventori & Sistem FIFO Ban Gudang</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Mengatur stok ban, velg, oli, dan menerima kiriman truk dari distributor resmi (Bridgestone, Dunlop, GT Radial, Hankook).
                    </p>
                  </div>
                </div>
              </div>

              {/* Penjelasan FIFO */}
              <div className="border border-emerald-300 bg-emerald-50/40 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-emerald-700" />
                  <span>Apa itu Sistem FIFO? (Penjelasan untuk Pemilik Toko)</span>
                </h4>
                <p className="text-xs text-emerald-950 leading-relaxed">
                  <strong>FIFO</strong> singkatan dari <em>First-In, First-Out</em> (Barang Masuk Pertama, Keluar Pertama).
                  Di toko ban, harga beli dari distributor sering naik turun. Dengan sistem FIFO ini:
                </p>
                <div className="bg-white border border-emerald-200 rounded-xl p-3 text-xs text-slate-700 space-y-1.5">
                  <p><strong>Contoh Nyata Toko Ban:</strong></p>
                  <p>• Toko beli 10 ban Dunlop modal <strong>Rp 700.000</strong> per ban (Batch A).</p>
                  <p>• Dua minggu kemudian, toko beli lagi 10 ban yang sama, tapi harga pabrik naik jadi <strong>Rp 750.000</strong> per ban (Batch B).</p>
                  <p>• Saat kasir menjual 4 ban seharga Rp 900.000, sistem otomatis mengambil modal dari Batch A (Rp 700.000).</p>
                  <p>• Keuntungan toko dicatat tepat <strong>Rp 200.000 per ban</strong>, bukan dikira-kira. Pemilik toko tahu pasti keuntungan bersih tanpa pusing menghitung manual!</p>
                </div>
              </div>

              {/* Langkah Terima Barang */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>Cara Input Barang Masuk Saat Truk Distributor Datang</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-slate-800">1. Buka Terima Barang</p>
                    <p className="text-slate-600 text-[11px]">
                      Klik tombol hijau <strong>"Terima Barang (Restock)"</strong> di pojok kanan atas menu Inventori.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-slate-800">2. Isi Surat Jalan & Faktur</p>
                    <p className="text-slate-600 text-[11px]">
                      Pilih nama distributor (misal: PT Bridgestone Tire), ketik nomor faktur distributor, dan pilih apakah bayar <strong>Lunas Kas</strong> atau <strong>Tempo (Hutang 30 Hari)</strong>.
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <p className="font-bold text-slate-800">3. Masukkan Jumlah & Harga Modal</p>
                    <p className="text-slate-600 text-[11px]">
                      Pilih ukuran ban yang datang, masukkan jumlah unit dan harga beli per pcs sesuai nota distributor. Klik simpan. Stok rak dan kartu stok otomatis terupdate!
                    </p>
                  </div>
                </div>
              </div>

              {/* Kartu Stok & Stock Opname */}
              <div className="p-3.5 bg-slate-100 rounded-xl text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-800">Tips Stock Opname (Cek Fisik Rak Toko):</strong> Lakukan penghitungan fisik ban di rak gudang setiap akhir bulan. Klik tombol <em>"Kartu Stok"</em> pada ban untuk mencocokkan setiap mutasi ban masuk dan keluar.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BIAYA & KAS KECIL */}
          {activeTab === 'expenses' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Biaya Toko & Kas Kecil (Beban Operasional)</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Catat semua pengeluaran uang toko selain pembelian ban agar uang di laci tidak hilang tanpa jejak.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-2xl p-4 space-y-2 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">Mengapa Semua Biaya Wajib Dicatat?</h4>
                  <p className="text-slate-600 leading-relaxed">
                    Seringkali pemilik bengkel merasa toko sangat ramai, tetapi saat akhir bulan uang kas habis. Penyebabnya adalah uang laci sering diambil sedikit demi sedikit untuk:
                  </p>
                  <ul className="space-y-1 text-slate-700 list-disc list-inside">
                    <li>Beli bensin pick-up toko ambil ban darurat</li>
                    <li>Uang makan siang & kopi mekanik lembur</li>
                    <li>Beli sabun pembersih tangan mekanik atau lem tubeless</li>
                    <li>Bayar token listrik kompresor atau internet kasir</li>
                  </ul>
                  <p className="text-slate-600 pt-1">
                    Bila dicatat di menu ini, sistem akan otomatis menghitung <strong>Laba Bersih yang Sebenarnya</strong>.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">Cara Mencatat Pengeluaran Toko</h4>
                  <ol className="space-y-2 text-slate-600 list-decimal list-inside">
                    <li>Klik tombol <strong>"Catat Pengeluaran Baru"</strong>.</li>
                    <li>Pilih kategori: Gaji Mekanik, Listrik & Air, Konsumsi, Perawatan Alat, atau Lainnya.</li>
                    <li>Masukkan nominal rupiah yang dikeluarkan.</li>
                    <li>Ketik keterangan jelas (contoh: <em>"Beli 2 kaleng pasta pelumas ban & galon air bengkel"</em>).</li>
                    <li>Pilih sumber uang: apakah diambil dari <strong>Kas Laci Toko</strong> atau dari <strong>Rekening Bank</strong>.</li>
                    <li>Klik simpan. Saldo kas langsung berkurang secara akurat.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: DASHBOARD OWNER */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <LayoutDashboard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Menu Dashboard: Cara Membaca Angka Bisnis Toko</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Ringkasan eksekutif untuk Pemilik Toko (Owner) untuk memantau kesehatan keuangan dan kinerja bengkel dalam satu layar.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-blue-700 uppercase">1. Total Penjualan (Omzet)</p>
                  <p className="font-black text-slate-900 text-sm">Uang Kotor yang Masuk</p>
                  <p className="text-[11px] text-slate-600">
                    Total seluruh penjualan ban dan jasa yang terjadi pada hari/bulan tersebut sebelum dipotong modal dan pengeluaran.
                  </p>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-emerald-700 uppercase">2. Laba Kotor (Gross Profit)</p>
                  <p className="font-black text-slate-900 text-sm">Keuntungan Penjualan Ban</p>
                  <p className="text-[11px] text-slate-600">
                    Harga jual ban dikurangi harga modal beli dari distributor (HPP FIFO). Ini keuntungan murni dari barang dagangan.
                  </p>
                </div>

                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-indigo-700 uppercase">3. Laba Bersih (Net Profit)</p>
                  <p className="font-black text-slate-900 text-sm">Uang Dingin Pemilik Toko</p>
                  <p className="text-[11px] text-slate-600">
                    Laba kotor setelah dikurangi semua biaya operasional (gaji montir, listrik, air, perawatan mesin). Inilah uang riil toko.
                  </p>
                </div>

                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-amber-700 uppercase">4. Nilai Aset Stok Rak</p>
                  <p className="font-black text-slate-900 text-sm">Uang yang Mengendap di Ban</p>
                  <p className="text-[11px] text-slate-600">
                    Total rupiah dari semua ban yang sedang terpajang di rak toko saat ini. Membantu Owner mengetahui berapa modal yang sedang berputar di gudang.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <p className="font-bold text-slate-900">Tips Membaca Grafik dan Tabel Produk Terlaris:</p>
                <p className="text-slate-600">
                  Perhatikan ukuran ban mana yang paling cepat laku (misalnya ukuran <em>185/65 R15</em> untuk Avanza/Xenia atau <em>175/65 R14</em> untuk Brio/Calya). Gunakan data ini agar saat kulakan ke distributor, Anda memperbanyak stok ukuran tersebut dan menghindari menumpuk ban ukuran langka yang lama laku.
                </p>
              </div>
            </div>
          )}

          {/* TAB 7: BON & HUTANG TEMPO */}
          {activeTab === 'ledger' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Buku Besar: Piutang Bon & Hutang Distributor</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Mengawasi pelanggan yang belum melunasi pembayaran (Bon) dan jadwal pembayaran jatuh tempo ke distributor ban.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Piutang Bon */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Mengelola Piutang Bon Pelanggan</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Pelanggan langganan, kantor rekanan, atau rental mobil yang memasang ban dengan sistem pembayaran tempo akan tercatat di tab <strong>Piutang Bon</strong>.
                  </p>
                  <p className="font-semibold text-slate-800">Saat pelanggan datang melunasi:</p>
                  <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
                    <li>Buka menu <strong>Buku Besar</strong> -&gt; klik tab <strong>Piutang Bon</strong>.</li>
                    <li>Cari nama pelanggan atau nomor plat kendaraannya.</li>
                    <li>Klik tombol <strong>"Pelunasan Bon"</strong>.</li>
                    <li>Ketik jumlah nominal uang yang dibayarkan dan pilih metode (Tunai atau Transfer).</li>
                    <li>Status nota otomatis berubah menjadi <strong>LUNAS</strong> dan uang masuk ke pembukuan kas.</li>
                  </ol>
                </div>

                {/* Hutang Distributor */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    <span>Mengelola Hutang Dagang ke Distributor</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Saat toko mengambil ban dari distributor secara kredit (tempo 30 hari), kewajiban bayar akan tercatat di tab <strong>Hutang Supplier</strong> lengkap dengan tanggal jatuh temponya.
                  </p>
                  <p className="font-semibold text-slate-800">Saat toko membayar ke distributor:</p>
                  <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
                    <li>Pilih faktur distributor yang akan dilunasi.</li>
                    <li>Klik tombol <strong>"Bayar Hutang"</strong>.</li>
                    <li>Pilih rekening bank sumber pembayaran dan masukkan nomor bukti transfer.</li>
                    <li>Simpan. Saldo hutang toko langsung terpotong rapi sehingga toko tetap dipercaya distributor resmi.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: LAPORAN KEUANGAN */}
          {activeTab === 'financials' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Laporan Keuangan Standar SAK EMKM IAI</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Laporan keuangan resmi berstandar Ikatan Akuntan Indonesia (IAI) yang siap dicetak untuk syarat pengajuan kredit bank (KUR) atau laporan pajak.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">3 Laporan Utama yang Dibuat Otomatis oleh Sistem:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                    <p className="font-bold text-slate-900 text-xs">1. Laporan Laba Rugi</p>
                    <p className="text-slate-600 text-[11px]">
                      Menampilkan pendapatan penjualan ban & jasa, modal pokok ban terjual (HPP), rincian seluruh biaya operasional, dan hasil laba bersih toko dalam periode tertentu (bulanan/tahunan).
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                    <p className="font-bold text-slate-900 text-xs">2. Laporan Posisi Keuangan (Neraca)</p>
                    <p className="text-slate-600 text-[11px]">
                      Menampilkan total kekayaan toko (Aset kas, stok ban di rak, peralatan mesin bengkel) seimbang 100% dengan total kewajiban (Hutang distributor) ditambah modal pemilik toko.
                    </p>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1.5 shadow-xs">
                    <p className="font-bold text-slate-900 text-xs">3. Laporan Arus Kas</p>
                    <p className="text-slate-600 text-[11px]">
                      Memperlihatkan lalu lintas uang tunai nyata yang masuk dan keluar: dari operasional harian, pembelian mesin baru, dan penarikan keuntungan oleh pemilik (*prive*).
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-sky-200 bg-sky-50/50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-sky-900">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  <span>Fitur "Tutup Buku Bulanan" (Period Closing)</span>
                </div>
                <p className="text-slate-600">
                  Pada tanggal terakhir setiap bulan, Owner dapat melakukan <strong>Tutup Buku</strong>. Tombol ini berfungsi mengunci semua transaksi bulan tersebut agar angka penjualan dan laporan tidak bisa diedit atau dihapus oleh staf kasir secara sengaja maupun tidak sengaja.
                </p>
              </div>
            </div>
          )}

          {/* TAB 9: HAK AKSES & PENGATURAN */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Menu Pengaturan: Identitas Nota & Hak Akses Staf</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Mengatur informasi yang tercetak di struk pelanggan dan melindungi data rahasia toko dari staf kasir.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">1. Pengaturan Data Nota Struk</h4>
                  <p className="text-slate-600">
                    Di tab <strong>Profil Toko</strong>, Anda dapat mengubah:
                  </p>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside">
                    <li>Nama Toko (<em>Omah Ban Cabang 3</em>)</li>
                    <li>Alamat Bengkel (<em>Jl. Magelang - Purworejo KM 5</em>)</li>
                    <li>Nomor WhatsApp Toko untuk konsultasi pelanggan</li>
                    <li>Pesan Penutup Struk (misal: <em>"Periksa tekanan angin ban Anda setiap 2 minggu. Terima kasih!"</em>)</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 space-y-2.5 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm">2. Hak Akses Karyawan (Role Permissions)</h4>
                  <p className="text-slate-600">
                    Sistem memiliki 3 tingkat hak akses untuk mencegah kebocoran data dan kecurangan:
                  </p>
                  <div className="space-y-1.5">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <strong className="text-slate-900">KASIR:</strong> Hanya bisa membuka menu Kasir (POS) dan cetak struk. Kasir <strong>TIDAK BISA</strong> melihat laporan laba rugi, tidak bisa melihat harga modal ban, dan tidak bisa menghapus data.
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <strong className="text-slate-900">ADMIN GUDANG:</strong> Hanya bisa membuka menu Inventori untuk mencatat barang masuk dari distributor dan cek stok rak.
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      <strong className="text-slate-900">OWNER (Pemilik Toko):</strong> Memegang kendali penuh atas seluruh menu, laporan laba rugi, buku besar, dan hak akses staf.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: FAQ & TANYA JAWAB */}
          {activeTab === 'faq' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Tanya Jawab (FAQ) & Solusi Kendala Harian Toko</h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Jawaban cepat untuk pertanyaan yang sering ditanyakan oleh staf kasir dan pemilik toko ban.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    <span>Bagaimana jika uang di laci kasir selisih saat toko tutup?</span>
                  </h4>
                  <p className="text-slate-600">
                    <strong>Solusi:</strong> Pertama, cek menu <strong>Biaya Toko</strong>, biasanya ada staf yang mengambil uang untuk bensin atau makan yang belum dicatat di sistem. Kedua, cek menu <strong>Riwayat Struk</strong> untuk memastikan tidak ada nota kasir yang dobel atau nota yang belum diselesaikan pembayarannya.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    <span>Bagaimana jika pelanggan ingin menukar ban karena salah ukuran velg?</span>
                  </h4>
                  <p className="text-slate-600">
                    <strong>Solusi:</strong> Buka menu <strong>Riwayat Struk</strong>, cari transaksi pelanggan tersebut lalu klik <strong>"Batalkan Transaksi (VOID)"</strong>. Masukkan alasan penukaran. Ban yang salah akan otomatis kembali ke stok toko. Setelah itu, buat transaksi baru di menu <strong>Kasir (POS)</strong> dengan ukuran ban yang benar.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    <span>Mengapa laba kotor di sistem tidak sama persis dengan uang di laci kasir?</span>
                  </h4>
                  <p className="text-slate-600">
                    <strong>Solusi:</strong> Uang di laci kasir hanya uang fisik tunai. Jika ada pelanggan yang membayar lewat QRIS, transfer bank, atau membeli dengan sistem Bon (tempo), uangnya masuk ke rekening atau menjadi piutang, tetapi labanya sudah tercatat secara akuntansi.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-1.5 text-xs">
                  <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-indigo-600" />
                    <span>Apakah sistem ini tetap bisa digunakan jika koneksi internet bengkel mati?</span>
                  </h4>
                  <p className="text-slate-600">
                    <strong>Solusi:</strong> Ya, sistem dilengkapi dengan penyimpanan lokal terenkripsi di peramban komputer kasir. Anda tetap bisa melayani penjualan dan mencetak struk secara offline. Saat koneksi internet tersambung kembali, data akan sinkron secara aman.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Omah Ban Cabang 3 Magelang &copy; 2026 &bull; Sistem POS & Akuntansi Terintegrasi SAK EMKM</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
            >
              Tutup Buku Panduan
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export const UserGuideModal = WireframeGuideModal;
