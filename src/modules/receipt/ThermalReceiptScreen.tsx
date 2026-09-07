import React, { useState, useMemo } from 'react';
import { 
  Printer, 
  Share2, 
  ArrowLeft, 
  CheckCircle, 
  RotateCcw, 
  Volume2, 
  Download, 
  MessageCircle,
  Search,
  X,
  Calendar,
  AlertTriangle,
  Ban,
  FileText,
  Receipt,
  ShieldCheck,
  Check,
  ExternalLink,
  Clock,
  User,
  Car,
  Tag,
  CreditCard,
  Banknote,
  Send
} from 'lucide-react';
import { PosTransaction, UserSession } from '../../shared/types';
import { formatDateIndo, formatRupiah, playCashDrawerSound } from '../../shared/utils/formatters';

interface ThermalReceiptScreenProps {
  currentTransaction: PosTransaction | null;
  transactionsHistory: PosTransaction[];
  storeSettings?: any;
  currentUser?: UserSession | null;
  onBackToPos: () => void;
  onSelectTransaction: (tx: PosTransaction) => void;
  onVoidTransaction?: (transactionId: string, reason: string) => void;
}

type PreviewMode = 'THERMAL_80MM' | 'FAKTUR_A4';
type StatusFilter = 'ALL' | 'LUNAS' | 'BON' | 'DP' | 'VOID';
type DateFilter = 'ALL' | 'TODAY' | '7_DAYS' | 'THIS_MONTH';

export const ThermalReceiptScreen: React.FC<ThermalReceiptScreenProps> = ({
  currentTransaction,
  transactionsHistory,
  storeSettings,
  currentUser,
  onBackToPos,
  onSelectTransaction,
  onVoidTransaction,
}) => {
  // State
  const [drawerKicked, setDrawerKicked] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('THERMAL_80MM');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  // Modals State
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');

  // Selected Transaction: if prop is given, use it, else use latest from history
  const activeTx = currentTransaction || (transactionsHistory.length > 0 ? transactionsHistory[transactionsHistory.length - 1] : null);

  // Store profile with Magelang defaults
  const headerText = storeSettings?.invoice_header || 'OMAH BAN CABANG 3 (OB3)\nPUSAT BAN BARU, VELG & SPOORING 3D';
  const addressText = storeSettings?.address || 'Jl. Raya Magelang - Secang Km. 5, Magelang, Jawa Tengah';
  const phoneText = `Telp: ${storeSettings?.phone || '(0293) 314-889'} / WA: ${storeSettings?.whatsapp || '0812-9988-7722'}`;
  const warrantyText = storeSettings?.invoice_warranty_text || 'Garansi resmi pabrik 1 tahun untuk cacat produksi.\nGratis cek tekanan angin Nitrogen & Balancing 2x dalam 6 bulan.';
  const footerTitle = storeSettings?.invoice_footer_title || 'TERIMA KASIH ATAS KUNJUNGAN ANDA!';
  const showBarcode = storeSettings?.show_barcode_on_receipt !== false;

  // Filter logic
  const filteredTransactions = useMemo(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().substring(0, 10);
    const currentMonthPrefix = todayStr.substring(0, 7);

    return transactionsHistory.filter((tx) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchInvoice = (tx.invoice_number || tx.reference || '').toLowerCase().includes(query);
        const matchCustomer = (tx.customer_name || '').toLowerCase().includes(query);
        const matchPlate = (tx.vehicle_plate || '').toLowerCase().includes(query);
        const matchCashier = (tx.cashier_name || '').toLowerCase().includes(query);
        if (!matchInvoice && !matchCustomer && !matchPlate && !matchCashier) {
          return false;
        }
      }

      // 2. Status Filter
      const isVoid = tx.status === 'VOID' || !!tx.is_voided;
      if (statusFilter === 'VOID' && !isVoid) return false;
      if (statusFilter === 'LUNAS') {
        if (isVoid) return false;
        if (tx.status !== 'LUNAS' && tx.status !== 'Completed') return false;
      }
      if (statusFilter === 'BON') {
        if (isVoid) return false;
        const isBon = (tx.notes && tx.notes.toUpperCase().includes('BON')) || tx.payment_method === ('BON' as any);
        if (!isBon) return false;
      }
      if (statusFilter === 'DP') {
        if (isVoid) return false;
        const isDp = (tx.notes && tx.notes.toUpperCase().includes('DP')) || tx.payment_method === ('DP' as any);
        if (!isDp) return false;
      }

      // 3. Date Filter
      const txDate = tx.date || (tx.timestamp ? tx.timestamp.substring(0, 10) : '');
      if (dateFilter === 'TODAY' && txDate !== todayStr) return false;
      if (dateFilter === '7_DAYS' && txDate < sevenDaysStr) return false;
      if (dateFilter === 'THIS_MONTH' && !txDate.startsWith(currentMonthPrefix)) return false;

      // 4. Payment Method Filter
      if (paymentFilter !== 'ALL' && tx.payment_method !== paymentFilter) {
        return false;
      }

      return true;
    });
  }, [transactionsHistory, searchQuery, statusFilter, dateFilter, paymentFilter]);

  // Mini summary metrics
  const summaryMetrics = useMemo(() => {
    const totalCount = filteredTransactions.length;
    let totalOmzet = 0;
    let voidCount = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.status === 'VOID' || tx.is_voided) {
        voidCount += 1;
      } else {
        totalOmzet += tx.grand_total || 0;
      }
    });

    return { totalCount, totalOmzet, voidCount };
  }, [filteredTransactions]);

  // Actions
  const handlePrint = () => {
    window.print();
  };

  const handleKickDrawer = () => {
    setDrawerKicked(true);
    playCashDrawerSound();
    setTimeout(() => {
      setDrawerKicked(false);
    }, 2500);
  };

  const handleOpenWaModal = () => {
    if (!activeTx) return;
    // Extract phone if present in vehicle_plate or notes or default customer_phone
    const phone = (activeTx as any).customer_phone || '';
    setWaPhone(phone);
    setIsWaModalOpen(true);
  };

  const getWaFormattedText = () => {
    if (!activeTx) return '';
    const isVoid = activeTx.status === 'VOID' || activeTx.is_voided;
    return `*OMAH BAN CABANG 3 - MAGELANG*
Pusat Penjualan Ban Baru, Velg & Spooring 3D
${addressText}
${phoneText}
---------------------------------------
${isVoid ? '⚠️ *PERHATIAN: NOTA INI TELAH DIBATALKAN (VOID)*\n---------------------------------------' : ''}
*STRUK TRANSAKSI PENJUALAN BAN*
No. Nota    : ${activeTx.invoice_number}
Tanggal     : ${activeTx.timestamp || activeTx.date}
Kasir       : ${activeTx.cashier_name}
Pelanggan   : ${activeTx.customer_name}
Kendaraan   : ${activeTx.vehicle_plate}
---------------------------------------
*RINCIAN PRODUK & JASA:*
${activeTx.items
  .map(
    (i, idx) =>
      `${idx + 1}. ${i.product.name} (${i.product.product_size})
   ${i.qty} pcs x ${formatRupiah(i.custom_price ?? i.product.product_price)}${
        i.discount_per_item > 0 ? ` (Disc: -${formatRupiah(i.discount_per_item)})` : ''
      } = ${formatRupiah((i.custom_price ?? i.product.product_price) * i.qty - (i.discount_per_item || 0) * i.qty)}`
  )
  .join('\n')}
---------------------------------------
Subtotal    : ${formatRupiah(activeTx.subtotal)}
${activeTx.total_discount > 0 ? `Diskon      : -${formatRupiah(activeTx.total_discount)}\n` : ''}${
  activeTx.tax_amount > 0 ? `PPN 11%     : ${formatRupiah(activeTx.tax_amount)}\n` : ''
}*GRAND TOTAL*: *${formatRupiah(activeTx.grand_total)}*
Metode Bayar: ${activeTx.payment_method.replace('_', ' ')} ${isVoid ? '(DIBATALKAN)' : '(LUNAS)'}
---------------------------------------
★ *KEBIJAKAN GARANSI OMAH BAN:*
${warrantyText}

${footerTitle}`;
  };

  const handleSendWaDirect = () => {
    if (!activeTx) return;
    let cleanPhone = waPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }
    const text = getWaFormattedText();
    const waUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    window.open(waUrl, '_blank');
    setIsWaModalOpen(false);
  };

  const handleCopyWaText = () => {
    const text = getWaFormattedText();
    navigator.clipboard?.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
    setIsWaModalOpen(false);
  };

  const handleConfirmVoid = () => {
    if (!activeTx) return;
    if (!voidReason.trim() || voidReason.trim().length < 5) {
      setVoidError('Mohon isi alasan pembatalan secara jelas (minimal 5 karakter).');
      return;
    }

    if (onVoidTransaction) {
      onVoidTransaction(activeTx.id, voidReason.trim());
    }

    setIsVoidModalOpen(false);
    setVoidReason('');
    setVoidError('');
  };

  // Helper status badge renderer
  const renderStatusBadge = (tx: PosTransaction) => {
    const isVoid = tx.status === 'VOID' || tx.is_voided;
    if (isVoid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-700 border border-red-200">
          <Ban className="w-3 h-3 text-red-600" />
          VOID
        </span>
      );
    }
    if ((tx.notes && tx.notes.toUpperCase().includes('BON')) || tx.payment_method === ('BON' as any)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Tag className="w-3 h-3 text-amber-600" />
          BON
        </span>
      );
    }
    if ((tx.notes && tx.notes.toUpperCase().includes('DP')) || tx.payment_method === ('DP' as any)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <CreditCard className="w-3 h-3 text-purple-600" />
          DP
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <CheckCircle className="w-3 h-3 text-emerald-600" />
        LUNAS
      </span>
    );
  };

  if (!activeTx && transactionsHistory.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-[#F8FAFC]">
        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center mb-4 text-slate-400">
          <Printer className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900">Belum Ada Riwayat Transaksi Nota</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Lakukan transaksi pada layar POS Kasir Omah Ban Cabang 3 Magelang untuk menghasilkan riwayat struk dan faktur.
        </p>
        <button
          onClick={onBackToPos}
          className="mt-5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Buka Kasir POS Sekarang
        </button>
      </div>
    );
  }

  const isCurrentVoid = activeTx ? (activeTx.status === 'VOID' || activeTx.is_voided) : false;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-105px)] overflow-hidden bg-[#F8FAFC] text-slate-900">
      {/* Toast Notification */}
      {copiedNotification && (
        <div className="fixed top-16 right-6 z-50 p-3 bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in slide-in-from-top-2 no-print">
          <CheckCircle className="w-4 h-4 text-emerald-300" />
          <span>Teks nota berhasil disalin ke clipboard!</span>
        </div>
      )}

      {/* Main Split Layout: Left Master List (42%), Right Detail Canvas (58%) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* =========================================================
            LEFT COLUMN: MASTER TRANSACTIONS & AUDIT LIST (42%)
            ========================================================= */}
        <aside className="w-full lg:w-[420px] xl:w-[460px] bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col no-print shrink-0 overflow-hidden shadow-xs">
          
          {/* Section 1: Header Title & Mini KPI Cards */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Riwayat & Audit Nota
                  </h2>
                  <p className="text-[10px] text-slate-500">Cabang 3 Magelang • Real-time Transaksi</p>
                </div>
              </div>
              <button
                onClick={onBackToPos}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg flex items-center gap-1 transition-colors"
                title="Kembali ke layar kasir POS"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Kasir POS</span>
              </button>
            </div>

            {/* Mini KPI summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Total Nota</span>
                <span className="text-xs font-mono font-black text-slate-800">{summaryMetrics.totalCount}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Omzet Lunas</span>
                <span className="text-xs font-mono font-black text-emerald-700 truncate block">
                  {formatRupiah(summaryMetrics.totalOmzet)}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="block text-[9px] text-slate-500 font-semibold uppercase">Nota Void</span>
                <span className={`text-xs font-mono font-black ${summaryMetrics.voidCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                  {summaryMetrics.voidCount} Batal
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Search Bar & Filters */}
          <div className="p-3 border-b border-slate-200 space-y-2.5 bg-white">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. Nota, Plat Mobil, atau Pelanggan..."
                className="w-full pl-8.5 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills / Status & Date Presets */}
            <div className="flex items-center justify-between gap-1.5 pt-0.5">
              {/* Status Chips */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                {(['ALL', 'LUNAS', 'BON', 'DP', 'VOID'] as StatusFilter[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-blue-700 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Semua' : st}
                  </button>
                ))}
              </div>

              {/* Date Filter Dropdown */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="text-[10px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-600 shrink-0"
              >
                <option value="ALL">Semua Waktu</option>
                <option value="TODAY">Hari Ini</option>
                <option value="7_DAYS">7 Hari Terakhir</option>
                <option value="THIS_MONTH">Bulan Ini</option>
              </select>
            </div>
          </div>

          {/* Section 3: Transactions Cards Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 custom-scrollbar bg-slate-50/50">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">Tidak ada nota yang cocok</p>
                <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                    setDateFilter('ALL');
                    setPaymentFilter('ALL');
                  }}
                  className="mt-3 text-[11px] text-blue-700 font-bold hover:underline"
                >
                  Reset Semua Filter
                </button>
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isSelected = activeTx?.id === tx.id;
                const isVoid = tx.status === 'VOID' || tx.is_voided;

                return (
                  <div
                    key={tx.id}
                    onClick={() => onSelectTransaction(tx)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-xs relative ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-400'
                        : isVoid
                        ? 'bg-red-50/30 border-red-200/80 hover:bg-red-50/60'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                    }`}
                  >
                    {/* Top Row: Invoice No & Status Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-extrabold text-[11.5px] text-slate-900 tracking-tight">
                        {tx.invoice_number}
                      </span>
                      {renderStatusBadge(tx)}
                    </div>

                    {/* Middle Row: Customer & Vehicle */}
                    <div className="flex items-center gap-1.5 text-slate-700 text-[11px] font-medium truncate mb-1">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{tx.customer_name || 'Pelanggan Umum'}</span>
                      <span className="text-slate-300">•</span>
                      <Car className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-800">{tx.vehicle_plate || 'Tanpa Plat'}</span>
                    </div>

                    {/* Bottom Row: Amount & Payment / Time */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{tx.timestamp ? tx.timestamp.substring(11, 16) : tx.date}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-600">{tx.payment_method.replace('_', ' ')}</span>
                      </div>
                      <span className={`font-mono font-black text-[11px] ${isVoid ? 'text-red-600 line-through' : 'text-emerald-700'}`}>
                        {formatRupiah(tx.grand_total)}
                      </span>
                    </div>

                    {/* Void Note Indicator */}
                    {isVoid && tx.void_reason && (
                      <div className="mt-1.5 px-2 py-0.5 rounded bg-red-100/70 text-[9.5px] text-red-800 truncate">
                        Alasan: {tx.void_reason}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* =========================================================
            RIGHT COLUMN: PREVIEW CANVAS & ACTION TOOLBAR (58%)
            ========================================================= */}
        <main className="flex-1 flex flex-col items-center justify-start overflow-y-auto custom-scrollbar bg-slate-100/80 p-4 sm:p-6">
          
          {activeTx ? (
            <div className="w-full max-w-[760px] flex flex-col items-center">
              
              {/* Sticky Action Toolbar (Hidden in print) */}
              <div className="w-full bg-white p-3 rounded-2xl border border-slate-200 shadow-sm mb-5 flex flex-wrap items-center justify-between gap-2.5 no-print">
                
                {/* Left: View Mode Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setPreviewMode('THERMAL_80MM')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      previewMode === 'THERMAL_80MM'
                        ? 'bg-white text-blue-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Struk Kasir (80mm)</span>
                  </button>

                  <button
                    onClick={() => setPreviewMode('FAKTUR_A4')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      previewMode === 'FAKTUR_A4'
                        ? 'bg-white text-blue-900 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Faktur Dinas (Format A4)</span>
                  </button>
                </div>

                {/* Right: Actions Group */}
                <div className="flex items-center flex-wrap gap-1.5">
                  {/* Buka Laci Kasir */}
                  <button
                    onClick={handleKickDrawer}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${
                      drawerKicked
                        ? 'bg-amber-500 border-amber-600 text-white shadow-xs animate-pulse'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
                    }`}
                    title="Kirim sinyal kick solenoid untuk buka laci kasir"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-amber-500" />
                    <span className="hidden sm:inline">{drawerKicked ? 'Laci Terbuka!' : 'Buka Laci'}</span>
                  </button>

                  {/* Kirim WhatsApp */}
                  <button
                    onClick={handleOpenWaModal}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                    title="Kirim rincian nota langsung via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Kirim WA</span>
                  </button>

                  {/* Tombol VOID Transaksi */}
                  <button
                    onClick={() => setIsVoidModalOpen(true)}
                    disabled={isCurrentVoid}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      isCurrentVoid
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white hover:bg-red-50 text-red-700 border-red-300 shadow-2xs'
                    }`}
                    title={isCurrentVoid ? 'Transaksi ini sudah dibatalkan' : 'Batalkan transaksi & balik jurnal akuntansi SAK EMKM'}
                  >
                    <Ban className="w-3.5 h-3.5 text-red-600" />
                    <span>{isCurrentVoid ? 'Sudah VOID' : 'Batalkan (VOID)'}</span>
                  </button>

                  {/* Tombol Cetak (Print) */}
                  <button
                    onClick={handlePrint}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-colors"
                    title="Cetak tampilan aktif (80mm atau A4)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak {previewMode === 'THERMAL_80MM' ? '80mm' : 'A4'}</span>
                  </button>
                </div>
              </div>

              {/* Status Warning Banner if VOID */}
              {isCurrentVoid && (
                <div className="w-full max-w-[680px] mb-4 p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 flex items-start gap-2.5 shadow-xs no-print">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold">TRANSAKSI TELAH DIBATALKAN (VOID)</p>
                    <p className="text-[11px] text-red-800">
                      Alasan: <span className="font-semibold">{activeTx.void_reason || 'Pembatalan transaksi'}</span>
                      {activeTx.voided_by && ` • Oleh: ${activeTx.voided_by}`}
                      {activeTx.voided_at && ` • Pada: ${activeTx.voided_at}`}
                    </p>
                    <p className="text-[10px] text-red-700 mt-1">
                      *Stok ban telah dikembalikan ke master persediaan dan Jurnal Pembalik SAK EMKM telah dibukukan otomatis di Buku Besar.
                    </p>
                  </div>
                </div>
              )}

              {/* =========================================================
                  VIEW 1: THERMAL 80MM RECEIPT PREVIEW
                  ========================================================= */}
              {previewMode === 'THERMAL_80MM' && (
                <div
                  id="thermal-receipt-printable"
                  className="w-full max-w-[300px] bg-white text-slate-900 font-mono text-[11px] p-4 rounded-t-sm shadow-md relative border-t-4 border-slate-300 select-text mb-8 overflow-hidden"
                  style={{ width: '80mm' }}
                >
                  {/* Jagged paper tear illusion at top */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

                  {/* Watermark Diagonal Stempel VOID */}
                  {isCurrentVoid && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="border-4 border-red-600/70 text-red-600/80 font-black text-xl px-4 py-2 uppercase -rotate-12 tracking-widest bg-white/70 rounded-md shadow-xs">
                        DIBATALKAN / VOID
                      </div>
                    </div>
                  )}

                  {/* Header Section */}
                  <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
                    <div className="font-extrabold text-xs tracking-tight text-black whitespace-pre-line">
                      {headerText}
                    </div>
                    <div className="text-[9.5px] text-slate-600 leading-tight">
                      {addressText}
                    </div>
                    <div className="text-[9.5px] text-slate-600">
                      {phoneText}
                    </div>
                  </div>

                  {/* Metadata Section */}
                  <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-600">No. Nota:</span>
                      <span className="font-bold text-black">{activeTx.invoice_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Waktu:</span>
                      <span className="text-black">{activeTx.timestamp || activeTx.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Kasir:</span>
                      <span className="text-black">{activeTx.cashier_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pelanggan:</span>
                      <span className="font-semibold text-black">{activeTx.customer_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Kendaraan:</span>
                      <span className="font-bold text-black">{activeTx.vehicle_plate}</span>
                    </div>
                    {isCurrentVoid && (
                      <div className="flex justify-between text-red-600 font-bold pt-0.5">
                        <span>Status:</span>
                        <span>DIBATALKAN (VOID)</span>
                      </div>
                    )}
                  </div>

                  {/* Items Table */}
                  <div className="py-2 border-b border-dashed border-slate-400">
                    <div className="flex justify-between font-bold text-[10px] text-slate-700 pb-1 mb-1 border-b border-slate-300">
                      <span>ITEM PRODUK BAN</span>
                      <span>SUBTOTAL</span>
                    </div>

                    <div className="space-y-2">
                      {activeTx.items.map((item, idx) => {
                        const unitPrice = item.custom_price ?? item.product.product_price;
                        const lineTotal = (unitPrice - (item.discount_per_item || 0)) * item.qty;

                        return (
                          <div key={idx} className="space-y-0.5">
                            <div className="font-bold text-black text-[11px] leading-snug">
                              {item.product.name}
                            </div>
                            <div className="text-[9.5px] text-slate-600">
                              Ukuran: {item.product.product_size} • {item.product.brand}
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span>
                                {item.qty} pcs x {formatRupiah(unitPrice)}
                                {item.discount_per_item > 0 && ` (Disc -${formatRupiah(item.discount_per_item)})`}
                              </span>
                              <span className="font-bold text-black">{formatRupiah(lineTotal)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Totals Section */}
                  <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10.5px]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal:</span>
                      <span>{formatRupiah(activeTx.subtotal)}</span>
                    </div>

                    {activeTx.total_discount > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Total Diskon Promosi:</span>
                        <span>-{formatRupiah(activeTx.total_discount)}</span>
                      </div>
                    )}

                    {activeTx.tax_amount > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>PPN 11%:</span>
                        <span>{formatRupiah(activeTx.tax_amount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300 text-black">
                      <span>GRAND TOTAL:</span>
                      <span className={isCurrentVoid ? 'line-through text-red-600' : ''}>
                        {formatRupiah(activeTx.grand_total)}
                      </span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-700 pt-1">
                      <span>Metode Bayar:</span>
                      <span className="font-bold uppercase">{activeTx.payment_method.replace('_', ' ')}</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-700">
                      <span>Uang Diterima:</span>
                      <span>{formatRupiah(activeTx.amount_paid)}</span>
                    </div>

                    <div className="flex justify-between text-[10px] text-slate-700 font-bold">
                      <span>Kembalian:</span>
                      <span>{formatRupiah(activeTx.change_amount)}</span>
                    </div>

                    {activeTx.payment_reference && (
                      <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                        <span>Ref:</span>
                        <span className="font-mono">{activeTx.payment_reference}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer Warranty & Policies */}
                  <div className="pt-3 pb-2 text-center space-y-2 text-[9px] text-slate-600 leading-tight">
                    <div className="p-1.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-semibold">
                      ★ KEBIJAKAN GARANSI OMAH BAN ★
                      <div className="font-normal text-[8.5px] mt-0.5 whitespace-pre-line">
                        {warrantyText}
                      </div>
                    </div>

                    {showBarcode && (
                      <>
                        <div className="font-mono tracking-widest text-slate-400 text-[10px]">
                          ||| | ||||| || |||| ||||| | ||
                        </div>
                        <div className="text-[8px] text-slate-400 font-mono">
                          {activeTx.invoice_number}
                        </div>
                      </>
                    )}

                    <p className="font-bold text-black text-[10px] pt-1">
                      {footerTitle}
                    </p>
                    <p className="text-[8px] text-slate-500">
                      Kritik & Saran: {storeSettings?.email || 'info@omahban.co.id'}
                    </p>
                  </div>

                  {/* Jagged receipt paper bottom effect */}
                  <div className="absolute -bottom-2 left-0 right-0 h-2 bg-slate-100/80 [clip-path:polygon(0_0,5%_100%,10%_0,15%_100%,20%_0,25%_100%,30%_0,35%_100%,40%_0,45%_100%,50%_0,55%_100%,60%_0,65%_100%,70%_0,75%_100%,80%_0,85%_100%,90%_0,95%_100%,100%_0)]" />
                </div>
              )}

              {/* =========================================================
                  VIEW 2: WORKSHOP OFFICIAL INVOICE (FORMAT A4)
                  ========================================================= */}
              {previewMode === 'FAKTUR_A4' && (
                <div
                  id="a4-invoice-printable"
                  className="w-full bg-white text-slate-900 font-sans p-8 rounded-xl shadow-md relative border border-slate-200 select-text mb-8 overflow-hidden"
                  style={{ maxWidth: '210mm', minHeight: '270mm' }}
                >
                  {/* Watermark Diagonal Stempel VOID untuk A4 */}
                  {isCurrentVoid && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="border-8 border-red-600/30 text-red-600/40 font-black text-5xl uppercase -rotate-25 tracking-widest px-12 py-6 bg-white/40 rounded-xl">
                        DIBATALKAN / VOID
                      </div>
                    </div>
                  )}

                  {/* Kop Surat Resmi Bengkel Omah Ban Cabang 3 Magelang */}
                  <div className="border-b-2 border-slate-800 pb-4 mb-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-blue-900 text-white font-black text-sm flex items-center justify-center">
                            OB
                          </div>
                          <div>
                            <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                              TOKO BAN & VELG OMAH BAN CABANG 3 - MAGELANG
                            </h1>
                            <p className="text-[11px] font-bold text-blue-900">
                              Pusat Penjualan Ban Baru, Velg, Spooring 3D & Balancing Mobil
                            </p>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-600">
                          {addressText} • {phoneText}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded font-mono font-bold text-xs">
                          FAKTUR PENJUALAN
                        </div>
                        <p className="text-[10px] font-mono text-slate-500 mt-1">
                          No: <span className="font-bold text-slate-900">{activeTx.invoice_number}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Header Meta: 2 Columns Information */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-5">
                    {/* Left Column */}
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-24 text-slate-500 text-[11px]">Tanggal Faktur:</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{activeTx.timestamp || activeTx.date}</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-slate-500 text-[11px]">Kasir:</span>
                        <span className="font-semibold text-slate-800 text-[11px]">{activeTx.cashier_name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-slate-500 text-[11px]">Status Nota:</span>
                        <span className="text-[11px]">{renderStatusBadge(activeTx)}</span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1.5">
                      <div className="flex">
                        <span className="w-24 text-slate-500 text-[11px]">Nama Pelanggan:</span>
                        <span className="font-bold text-slate-900 text-[11px]">{activeTx.customer_name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-slate-500 text-[11px]">No. Kendaraan:</span>
                        <span className="font-bold text-blue-900 text-[11px]">{activeTx.vehicle_plate}</span>
                      </div>
                      <div className="flex">
                        <span className="w-24 text-slate-500 text-[11px]">Metode Bayar:</span>
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {activeTx.payment_method.replace('_', ' ')}
                          {activeTx.payment_reference && ` (Ref: ${activeTx.payment_reference})`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Table Rincian Transaksi */}
                  <div className="mb-5 overflow-hidden border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-extrabold text-[11px] border-b border-slate-200">
                          <th className="py-2 px-3 text-center w-8">NO</th>
                          <th className="py-2 px-3">DESKRIPSI PRODUK / UKURAN BAN</th>
                          <th className="py-2 px-3 text-center">MERK</th>
                          <th className="py-2 px-3 text-center w-12">QTY</th>
                          <th className="py-2 px-3 text-right">HARGA SATUAN</th>
                          <th className="py-2 px-3 text-right">DISKON</th>
                          <th className="py-2 px-3 text-right">JUMLAH (RP)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {activeTx.items.map((item, idx) => {
                          const unitPrice = item.custom_price ?? item.product.product_price;
                          const disc = item.discount_per_item || 0;
                          const lineTotal = (unitPrice - disc) * item.qty;

                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{item.product.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Ukuran: {item.product.product_size}
                                  {item.product.pattern && ` • Pattern: ${item.product.pattern}`}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                                {item.product.brand}
                              </td>
                              <td className="py-2.5 px-3 text-center font-bold font-mono text-slate-900">
                                {item.qty}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                {formatRupiah(unitPrice)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                {disc > 0 ? `-${formatRupiah(disc)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {formatRupiah(lineTotal)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Totals Box */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Left: Warranty & Notes */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] space-y-1.5 text-slate-700">
                      <div className="font-bold text-slate-900 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                        <span>KEBIJAKAN GARANSI & SERVIS:</span>
                      </div>
                      <p className="whitespace-pre-line text-[10px] text-slate-600 leading-relaxed">
                        {warrantyText}
                      </p>
                      {activeTx.notes && (
                        <div className="pt-1 border-t border-slate-200 text-[10px]">
                          <span className="font-semibold text-slate-800">Catatan Khusus: </span>
                          <span className="text-slate-600">{activeTx.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Calculations */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-600 text-[11px]">
                        <span>Subtotal Penjualan:</span>
                        <span className="font-mono font-semibold">{formatRupiah(activeTx.subtotal)}</span>
                      </div>

                      {activeTx.total_discount > 0 && (
                        <div className="flex justify-between text-slate-700 text-[11px]">
                          <span>Total Potongan Diskon:</span>
                          <span className="font-mono font-semibold text-red-600">
                            -{formatRupiah(activeTx.total_discount)}
                          </span>
                        </div>
                      )}

                      {activeTx.tax_amount > 0 && (
                        <div className="flex justify-between text-slate-600 text-[11px]">
                          <span>PPN 11%:</span>
                          <span className="font-mono font-semibold">{formatRupiah(activeTx.tax_amount)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-300 text-slate-900">
                        <span>TOTAL AKHIR:</span>
                        <span className={`font-mono text-base ${isCurrentVoid ? 'line-through text-red-600' : 'text-blue-900'}`}>
                          {formatRupiah(activeTx.grand_total)}
                        </span>
                      </div>

                      <div className="flex justify-between text-[10.5px] text-slate-600 pt-1">
                        <span>Dibayar: {formatRupiah(activeTx.amount_paid)}</span>
                        <span>Kembalian: {formatRupiah(activeTx.change_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* 3 Columns Signature Block */}
                  <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-200 text-center text-xs">
                    {/* Column 1: Pelanggan */}
                    <div className="space-y-12">
                      <p className="font-semibold text-slate-700 text-[11px]">Pelanggan / Penanggung Jawab,</p>
                      <div className="space-y-0.5">
                        <div className="w-36 mx-auto border-b border-slate-400" />
                        <p className="font-bold text-slate-900 text-[10.5px]">{activeTx.customer_name}</p>
                      </div>
                    </div>

                    {/* Column 2: Mekanik / Teknisi */}
                    <div className="space-y-12">
                      <p className="font-semibold text-slate-700 text-[11px]">Mekanik / Teknisi Roda,</p>
                      <div className="space-y-0.5">
                        <div className="w-36 mx-auto border-b border-slate-400" />
                        <p className="font-bold text-slate-900 text-[10.5px]">
                          {(activeTx as any).mechanic_name || 'Teknisi Omah Ban'}
                        </p>
                      </div>
                    </div>

                    {/* Column 3: Kasir / Keuangan */}
                    <div className="space-y-12">
                      <p className="font-semibold text-slate-700 text-[11px]">Kasir / Keuangan Toko,</p>
                      <div className="space-y-0.5">
                        <div className="w-36 mx-auto border-b border-slate-400" />
                        <p className="font-bold text-slate-900 text-[10.5px]">{activeTx.cashier_name}</p>
                      </div>
                    </div>
                  </div>

                  {/* Footer Notice */}
                  <div className="mt-8 pt-3 border-t border-dashed border-slate-200 text-center text-[9px] text-slate-400">
                    Faktur ini merupakan dokumen sah bukti transaksi dan klaim garansi pada Toko Ban Omah Ban Cabang 3 Magelang.
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <Receipt className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Pilih Nota dari Kolom Kiri</p>
              <p className="text-xs text-slate-400 mt-1">
                Pilih salah satu nota di samping untuk melihat pratinjau struk 80mm atau faktur dinas A4.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* =========================================================
          MODAL: KONFIRMASI PEMBATALAN TRANSAKSI (VOID)
          ========================================================= */}
      {isVoidModalOpen && activeTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            
            {/* Header Dialog */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Batalkan Transaksi Penjualan (VOID)?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini akan membatalkan nota secara permanen dan membalik jurnal akuntansi.
                </p>
              </div>
              <button
                onClick={() => setIsVoidModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Box */}
            <div className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-red-800">
                <Ban className="w-3.5 h-3.5" />
                Konsekuensi Pembatalan Nota:
              </p>
              <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-red-800">
                <li>Stok ban ({activeTx.items.reduce((sum, i) => sum + i.qty, 0)} pcs) akan dikembalikan ke gudang Cabang 3.</li>
                <li>JURNAL PEMBALIK otomatis dibukukan di Buku Besar SAK EMKM.</li>
                {activeTx.payment_method === 'TUNAI' && (
                  <li>Saldo uang kas di laci kasir akan dikurangi sebesar {formatRupiah(activeTx.grand_total)}.</li>
                )}
              </ul>
            </div>

            {/* Nota Summary */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">No. Nota:</span>
                <span className="font-mono font-bold text-slate-900">{activeTx.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan:</span>
                <span className="font-semibold text-slate-800">{activeTx.customer_name} ({activeTx.vehicle_plate})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Transaksi:</span>
                <span className="font-mono font-black text-red-600">{formatRupiah(activeTx.grand_total)}</span>
              </div>
            </div>

            {/* Input Alasan Void */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Alasan Pembatalan Transaksi <span className="text-red-500">*</span>
              </label>
              <textarea
                value={voidReason}
                onChange={(e) => {
                  setVoidReason(e.target.value);
                  setVoidError('');
                }}
                rows={2}
                placeholder="Contoh: Salah input ukuran ban (minta Ring 16 bukan Ring 15) / Pelanggan membatalkan pembelian..."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-800 placeholder:text-slate-400 resize-none"
              />
              {voidError && (
                <p className="text-[11px] font-semibold text-red-600">{voidError}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsVoidModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmVoid}
                className="px-4 py-2 text-xs font-extrabold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Konfirmasi Batalkan Nota (VOID)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: KIRIM NOTA VIA WHATSAPP
          ========================================================= */}
      {isWaModalOpen && activeTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <MessageCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Kirim Nota via WhatsApp
                  </h3>
                  <p className="text-xs text-slate-500">
                    Nota {activeTx.invoice_number} • {activeTx.customer_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Phone Number */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Nomor WhatsApp Pelanggan
              </label>
              <input
                type="text"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="Contoh: 08123456789 atau 628123456789"
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white text-slate-800 font-mono"
              />
              <p className="text-[10.5px] text-slate-400">
                Format nomor ponsel Indonesia (diawali 08... atau 628...).
              </p>
            </div>

            {/* Preview Message */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Pratinjau Teks Pesan Nota
              </label>
              <textarea
                readOnly
                rows={6}
                value={getWaFormattedText()}
                className="w-full p-2.5 text-[10.5px] font-mono bg-slate-50 border border-slate-200 rounded-xl text-slate-700 resize-none focus:outline-none custom-scrollbar"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={handleCopyWaText}
                className="px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Salin Teks Saja</span>
              </button>

              <button
                onClick={handleSendWaDirect}
                className="px-4 py-2 text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Buka WhatsApp Sekarang</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
