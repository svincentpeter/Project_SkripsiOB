import React, { useState } from 'react';
import { 
  TrendingUp, 
  Wallet, 
  AlertTriangle, 
  ShoppingBag, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  BarChart2,
  PieChart,
  Package,
  ArrowUpRight,
  ArrowRight,
  Boxes,
  Home,
  Download,
  Plus,
  Calendar,
  Eye,
  Flag,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  FileText,
  ChevronDown
} from 'lucide-react';
import { ExpenseRecord, PosTransaction, TireBrand, TireProduct } from '../../shared/types';
import { DAILY_TREND_DATA } from '../../shared/data/mockData';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';

interface ExecutiveDashboardScreenProps {
  transactions: PosTransaction[];
  products: TireProduct[];
  expenses: ExpenseRecord[];
  onNavigateToInventory: () => void;
  onNavigateToPos: () => void;
}

export const ExecutiveDashboardScreen: React.FC<ExecutiveDashboardScreenProps> = ({
  transactions,
  products,
  expenses,
  onNavigateToInventory,
  onNavigateToPos,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory'>('overview');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // 1. KPI Today's Sales
  const todayDateStr = new Date().toISOString().split('T')[0];
  const exactTodayTx = transactions.filter((t) => t.date === todayDateStr && t.status === 'LUNAS');
  const todayTx = exactTodayTx.length > 0 ? exactTodayTx : transactions.slice(0, 3);
  
  const todayOmzet = todayTx.reduce((acc, t) => acc + (t.total_amount ?? t.grand_total), 0);
  const todayQty = todayTx.reduce((acc, t) => acc + t.items.reduce((sum, i) => sum + i.qty, 0), 0);
  const todayHpp = todayTx.reduce((acc, t) => acc + (t.total_hpp ?? t.total_cost_hpp), 0);
  const todayGrossProfit = todayOmzet - todayHpp;
  const grossProfitMargin = todayOmzet > 0 ? ((todayGrossProfit / todayOmzet) * 100).toFixed(1) : '0.0';

  // 2. Monthly Expenses
  const totalExpensesMonth = expenses.reduce((acc, e) => acc + e.amount, 0);

  // 3. Low stock warning count (< 5 pcs)
  const lowStockProducts = products.filter((p) => (p.product_quantity ?? p.stock) < (p.product_stock_alert ?? p.min_stock ?? 5));

  // 4. Total Inventory Value (FIFO Valuation)
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (p.product_quantity ?? p.stock) * (p.product_cost ?? p.cost_price ?? 0),
    0
  );
  const totalInventoryQty = products.reduce((acc, p) => acc + (p.product_quantity ?? p.stock), 0);

  // 5. Fast-moving tires (Aggregate across transactions)
  const productSalesMap: Record<string, { product: TireProduct; totalQty: number; totalOmzet: number }> = {};

  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      if (!productSalesMap[item.product.id]) {
        productSalesMap[item.product.id] = {
          product: item.product,
          totalQty: 0,
          totalOmzet: 0,
        };
      }
      productSalesMap[item.product.id].totalQty += item.qty;
      productSalesMap[item.product.id].totalOmzet +=
        (item.custom_price ?? item.product.product_price) * item.qty;
    });
  });

  const fastMovingList = Object.values(productSalesMap)
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, 5);

  // 6. Brand Breakdown for Donut Chart
  const brandCountMap: Record<string, number> = {
    Bridgestone: 0,
    Accelera: 0,
    Dunlop: 0,
    Forceum: 0,
    GTRadial: 0,
    Hankook: 0,
  };

  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const brand = item.product.brand;
      if (brandCountMap[brand] !== undefined) {
        brandCountMap[brand] += item.qty;
      }
    });
  });

  const brandColors: Record<string, string> = {
    Bridgestone: '#4B49AC', // Royal Blue
    Accelera: '#FFC107',    // Amber
    Dunlop: '#24a46d',      // Emerald
    Forceum: '#7978E9',     // Purple
    GTRadial: '#3F51B5',    // Indigo
    Hankook: '#FF4747',     // Red
  };

  const totalBrandTires = Object.values(brandCountMap).reduce((a, b) => a + b, 0) || 1;

  // Chart Geometry Calculations for 7-day Trend SVG
  const maxVal = Math.max(...DAILY_TREND_DATA.map((d) => d.omzet), 30000000);
  const chartHeight = 160;
  const chartWidth = 540;
  const paddingX = 35;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const pointsOmzet = DAILY_TREND_DATA.map((d, i) => {
    const x = paddingX + (i / (DAILY_TREND_DATA.length - 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.omzet / maxVal) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  const pointsHpp = DAILY_TREND_DATA.map((d, i) => {
    const x = paddingX + (i / (DAILY_TREND_DATA.length - 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.hpp / maxVal) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaOmzet = `${pointsOmzet} ${paddingX + usableWidth},${chartHeight - paddingY} ${paddingX},${chartHeight - paddingY}`;

  return (
    <div className="min-h-screen bg-[#F4F5F7] p-4 sm:p-6 lg:p-8 space-y-6 text-slate-800 font-['Plus_Jakarta_Sans',sans-serif] select-none">
      
      {/* =======================================================================
          MAJESTIC SECTION 1: WELCOME BACK & ACTION TOOLBAR
          ======================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Welcome back,
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
            <span>Sistem Kasir & Akuntansi SAK EMKM Omah Ban Cabang 3.</span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <Home className="w-3.5 h-3.5 text-slate-400" />
              <span>/</span>
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-blue-600 font-semibold">Analytics</span>
            </div>
          </div>
        </div>

        {/* Right Toolbar: Quick Action Buttons Majestic Style */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => alert('Fitur Ekspor Laporan Excel/PDF sedang disiapkan.')}
            className="w-9 h-9 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs"
            title="Download Excel / PDF"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => alert('Riwayat sinkronisasi batch FIFO aktif per 3 September 2026.')}
            className="w-9 h-9 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs"
            title="Riwayat Waktu"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateToInventory}
            className="w-9 h-9 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs"
            title="Tambah Stok Baru / PO"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateToPos}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-md text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Buka Kasir (POS)</span>
          </button>
        </div>
      </div>

      {/* =======================================================================
          MAJESTIC SECTION 2: TABS & QUICK KPI STRIP (5 Dark Icon Boxes)
          ======================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-6 border-b border-slate-100 text-xs font-bold pb-2.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-1 transition-all ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-1 transition-all ${
              activeTab === 'sales'
                ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Penjualan
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`pb-1 transition-all ${
              activeTab === 'inventory'
                ? 'text-blue-600 border-b-2 border-blue-600 font-extrabold'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            Persediaan & FIFO
          </button>
        </div>

        {/* 5 Dark Icon Boxes Strip (Majestic Horizontal Layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-1">
          {/* 1. Date Picker Box */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-[#4a4a4a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] text-slate-400 font-medium block">Tanggal Aktif</span>
              <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                <span>03 Sep 2026</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </div>
            </div>
          </div>

          {/* 2. Revenue Box */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-[#4a4a4a] text-white flex items-center justify-center shrink-0 shadow-xs font-black text-sm">
              Rp
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] text-slate-400 font-medium block">Revenue (Omzet)</span>
              <span className="text-xs font-extrabold text-slate-900 truncate block font-mono">
                {formatRupiah(todayOmzet)}
              </span>
            </div>
          </div>

          {/* 3. Units Sold Box */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-[#4a4a4a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] text-slate-400 font-medium block">Unit Terjual</span>
              <span className="text-xs font-extrabold text-slate-900 truncate block font-mono">
                {todayQty} Ban ({todayTx.length} Tx)
              </span>
            </div>
          </div>

          {/* 4. Expenses Box */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-10 h-10 rounded-lg bg-[#4a4a4a] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] text-slate-400 font-medium block">Biaya Toko</span>
              <span className="text-xs font-extrabold text-slate-900 truncate block font-mono">
                {formatRupiah(totalExpensesMonth)}
              </span>
            </div>
          </div>

          {/* 5. Flagged Minimum Stock Box */}
          <div 
            onClick={onNavigateToInventory}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 cursor-pointer hover:bg-rose-50/50 transition-colors"
          >
            <div className={`w-10 h-10 rounded-lg text-white flex items-center justify-center shrink-0 shadow-xs ${lowStockProducts.length > 0 ? 'bg-rose-600' : 'bg-[#4a4a4a]'}`}>
              <Flag className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[11px] text-slate-400 font-medium block">Stok Kritis</span>
              <span className={`text-xs font-extrabold truncate block font-mono ${lowStockProducts.length > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {lowStockProducts.length} Ukuran Ban
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =======================================================================
          MAJESTIC SECTION 3: 4 CARDS WITH SPARKLINE WAVE SVGS & ACCENT SQUARES
          ======================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: CASH SALES (Penjualan Tunai Kasir) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          {/* Header with Navigation Arrows */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
              CASH SALES
            </span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sparkline Wave & Big Metric */}
          <div className="flex items-center justify-between gap-3">
            {/* Blue SVG Wave */}
            <div className="w-24 h-10">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0,25 Q15,5 30,20 T60,10 T85,30 T100,15"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-slate-900">30%</span>
              <span className="text-emerald-500 font-bold text-base">▲</span>
            </div>
          </div>

          {/* Bottom Data & Blue Accent Square */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Penjualan Hari Ini</span>
              <div className="text-lg font-black text-slate-900 font-mono">
                {formatRupiah(todayOmzet)}
              </div>
              <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 mt-0.5">
                +10 Ban Terjual • 3 Transaksi
              </span>
            </div>

            {/* Blue Accent Square */}
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-6 h-6" />
            </div>
          </div>

          {/* Bottom Mini Description */}
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Transaksi penjualan ban baru kasir laci toko cabang 3 shift pagi.
          </p>
        </div>

        {/* Card 2: MONTHLY INCOME (Laba Kotor FIFO) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          {/* Header with Navigation Arrows */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
              MONTHLY INCOME
            </span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sparkline Wave & Big Metric */}
          <div className="flex items-center justify-between gap-3">
            {/* Amber SVG Wave */}
            <div className="w-24 h-10">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0,20 Q15,35 30,15 T60,30 T85,10 T100,25"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-slate-900">16%</span>
              <span className="text-amber-500 font-bold text-base">▲</span>
            </div>
          </div>

          {/* Bottom Data & Amber Accent Square */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Laba Kotor (FIFO)</span>
              <div className="text-lg font-black text-amber-600 font-mono">
                {formatRupiah(todayGrossProfit)}
              </div>
              <span className="text-[10px] font-bold text-slate-600 block mt-0.5">
                Margin: <strong className="text-slate-900">{grossProfitMargin}%</strong>
              </span>
            </div>

            {/* Amber Accent Square */}
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          {/* Bottom Mini Description */}
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Laba kotor dihitung akurat dari pemotongan HPP layer batch FIFO tertua.
          </p>
        </div>

        {/* Card 3: YEARLY SALES (Beban & Biaya Operasional) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          {/* Header with Navigation Arrows */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
              BEBAN TOKO
            </span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sparkline Wave & Big Metric */}
          <div className="flex items-center justify-between gap-3">
            {/* Red SVG Wave */}
            <div className="w-24 h-10">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0,30 Q20,10 40,25 T70,15 T100,35"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-slate-900">52%</span>
              <span className="text-rose-500 font-bold text-base">▼</span>
            </div>
          </div>

          {/* Bottom Data & Purple Accent Square */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Biaya Operasional</span>
              <div className="text-lg font-black text-rose-600 font-mono">
                {formatRupiah(totalExpensesMonth)}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {expenses.length} Pos Pengeluaran Toko
              </span>
            </div>

            {/* Purple Accent Square */}
            <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          {/* Bottom Mini Description */}
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Biaya operasional toko ban (PLN, gaji montir, sewa, ATK bengkel).
          </p>
        </div>

        {/* Card 4: DAILY DEPOSITS (Kas Laci & Persediaan) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
          {/* Header with Navigation Arrows */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 tracking-wider uppercase">
              KAS LACI & BANK
            </span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button className="w-6 h-6 rounded border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Sparkline Wave & Big Metric */}
          <div className="flex items-center justify-between gap-3">
            {/* Green SVG Wave */}
            <div className="w-24 h-10">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <path
                  d="M0,15 Q25,35 50,10 T80,30 T100,15"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-2xl font-black text-slate-900">19%</span>
              <span className="text-emerald-500 font-bold text-base">▲</span>
            </div>
          </div>

          {/* Bottom Data & Green Accent Square */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Kas Laci Kasir</span>
              <div className="text-lg font-black text-slate-900 font-mono">
                Rp 2.450.000
              </div>
              <span className="text-[10px] font-bold text-emerald-600 block mt-0.5">
                Uang Tunai Laci Siap Operasional
              </span>
            </div>

            {/* Green Accent Square */}
            <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          {/* Bottom Mini Description */}
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Saldo kas kecil laci untuk kembalian pelanggan toko ban cabang 3.
          </p>
        </div>
      </div>

      {/* =======================================================================
          MAJESTIC SECTION 4: VALUASI PERSEDIAAN FIFO BANNER
          ======================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-300">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-300">Total Valuasi Persediaan Gudang Cabang 3</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                Metode FIFO SAK EMKM
              </span>
            </div>
            <div className="text-2xl font-black font-mono tracking-tight text-white mt-0.5">
              {formatRupiah(totalInventoryValue)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-slate-400 block">Total Kuantitas Fisik</span>
            <span className="font-mono font-bold text-sm text-slate-200">{totalInventoryQty} Pcs Ban Baru</span>
          </div>
          <button
            onClick={onNavigateToInventory}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Buka Kartu Stok FIFO</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =======================================================================
          MAJESTIC SECTION 5: GRAFIK TREN PENJUALAN & PANGSA MEREK BAN
          ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Omzet vs HPP 7 Hari (2 Kolom) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-blue-600" />
                <span>Tren Omzet Penjualan vs HPP (7 Hari Terakhir)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pergerakan transaksi kasir dibandingkan harga pokok penjualan batch FIFO.
              </p>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-800">
                <span className="w-3 h-3 rounded-full bg-blue-600" />
                <span>Penjualan</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 rounded-full bg-slate-300" />
                <span>HPP FIFO</span>
              </div>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 overflow-visible"
            >
              <defs>
                <linearGradient id="majesticGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = chartHeight - paddingY - pct * usableHeight;
                const labelVal = Math.round((pct * maxVal) / 1000000);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={paddingX - 6}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="9"
                      fill="#94a3b8"
                      fontFamily="monospace"
                    >
                      {labelVal}jt
                    </text>
                  </g>
                );
              })}

              {/* Area gradient under Omzet */}
              <polygon points={areaOmzet} fill="url(#majesticGradient)" />

              {/* HPP Line (Dashed) */}
              <polyline
                points={pointsHpp}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Omzet Line */}
              <polyline
                points={pointsOmzet}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points & tooltips */}
              {DAILY_TREND_DATA.map((d, i) => {
                const x = paddingX + (i / (DAILY_TREND_DATA.length - 1)) * usableWidth;
                const yOmzet = chartHeight - paddingY - (d.omzet / maxVal) * usableHeight;
                const isHovered = hoveredDayIdx === i;

                return (
                  <g key={i} className="cursor-pointer">
                    <circle
                      cx={x}
                      cy={yOmzet}
                      r={isHovered ? 6 : 4}
                      fill="#ffffff"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      onMouseEnter={() => setHoveredDayIdx(i)}
                      onMouseLeave={() => setHoveredDayIdx(null)}
                    />

                    {/* Date label on X-axis */}
                    <text
                      x={x}
                      y={chartHeight - 4}
                      textAnchor="middle"
                      fontSize="9"
                      fill={isHovered ? '#1e293b' : '#64748b'}
                      fontWeight={isHovered ? 'bold' : 'normal'}
                    >
                      {d.date.split('-').slice(1).join('/')}
                    </text>

                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <g>
                        <rect
                          x={x - 45}
                          y={yOmzet - 34}
                          width="90"
                          height="24"
                          rx="4"
                          fill="#0f172a"
                          opacity="0.95"
                        />
                        <text
                          x={x}
                          y={yOmzet - 18}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {formatRupiah(d.omzet)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Donut Chart: Pangsa Penjualan Merek Ban */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <span>Pangsa Penjualan per Merek</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Distribusi unit terjual berdasarkan pabrikan ban.
            </p>
          </div>

          {/* Donut Graphic */}
          <div className="my-4 flex items-center justify-center relative">
            <svg width="140" height="140" viewBox="0 0 42 42" className="transform -rotate-90">
              <circle
                cx="21"
                cy="21"
                r="15.915"
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="5"
              />
              {(() => {
                let accumulatedPercent = 0;
                return Object.entries(brandCountMap).map(([brand, count]) => {
                  if (count === 0) return null;
                  const percent = (count / totalBrandTires) * 100;
                  const strokeDasharray = `${percent} ${100 - percent}`;
                  const strokeDashoffset = -accumulatedPercent;
                  accumulatedPercent += percent;

                  return (
                    <circle
                      key={brand}
                      cx="21"
                      cy="21"
                      r="15.915"
                      fill="transparent"
                      stroke={brandColors[brand] || '#cbd5e1'}
                      strokeWidth="5"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={strokeDashoffset}
                    />
                  );
                });
              })()}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xl font-black font-mono text-slate-900 leading-none">
                {totalBrandTires}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                Unit Ban
              </span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs pt-3 border-t border-slate-100">
            {Object.entries(brandCountMap).map(([brand, count]) => (
              <div key={brand} className="flex items-center justify-between text-slate-600">
                <div className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: brandColors[brand] || '#cbd5e1' }}
                  />
                  <span className="truncate text-[11px] font-semibold">{brand}</span>
                </div>
                <span className="font-mono text-slate-900 font-bold text-[11px]">{count} pcs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =======================================================================
          MAJESTIC SECTION 6: FAST MOVING TIRES & LOW STOCK TABLES
          ======================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fast Moving Tires Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Produk Ban Terlaris (Fast-Moving)</span>
            </h3>
            <span className="text-xs text-slate-400 font-medium">Bulan Berjalan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-2.5 font-bold">Ukuran & Merek</th>
                  <th className="pb-2.5 font-bold text-center">Terjual</th>
                  <th className="pb-2.5 font-bold text-right">Total Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fastMovingList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">{item.product.size || item.product.product_size}</div>
                      <div className="text-[10px] text-slate-400">{item.product.name}</div>
                    </td>
                    <td className="py-2.5 text-center font-mono font-black text-slate-800">
                      {item.totalQty} pcs
                    </td>
                    <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(item.totalOmzet)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Warning Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Peringatan Stok Minimum Gudang</span>
            </h3>
            <button
              onClick={onNavigateToInventory}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-0.5"
            >
              <span>Buka Inventori</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="pb-2.5 font-bold">Nama Ban</th>
                  <th className="pb-2.5 font-bold text-center">Sisa Fisik</th>
                  <th className="pb-2.5 font-bold text-right">Ambang Batas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockProducts.slice(0, 5).map((prod) => (
                  <tr key={prod.id} className="hover:bg-rose-50/40 transition-colors">
                    <td className="py-2.5">
                      <div className="font-bold text-slate-900">{prod.size || prod.product_size}</div>
                      <div className="text-[10px] text-slate-400">{prod.brand} • {prod.name}</div>
                    </td>
                    <td className="py-2.5 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {prod.product_quantity ?? prod.stock} pcs
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-slate-500 font-medium">
                      {prod.product_stock_alert ?? prod.min_stock ?? 5} pcs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
