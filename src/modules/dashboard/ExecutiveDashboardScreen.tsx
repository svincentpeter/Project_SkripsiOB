import React, { useState } from 'react';
import { 
  Home, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Wallet, 
  Flag, 
  ShoppingBag,
  TrendingUp,
  BarChart2,
  PieChart,
  AlertTriangle,
  ArrowRight, 
  Boxes, 
  Calendar, 
  CreditCard, 
  ShoppingCart, 
  CheckCircle2, 
  Wrench,
  Truck,
  ArrowUpRight,
  Banknote,
  QrCode,
  Building2,
  Tag,
  Package
} from 'lucide-react';
import { ExpenseRecord, PosTransaction, ProductItem } from '../../shared/types';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';

interface ExecutiveDashboardScreenProps {
  transactions: PosTransaction[];
  products: any[];
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
  const todayHpp = todayTx.reduce((acc, t) => acc + (t.total_hpp ?? t.total_cost_hpp ?? 0), 0);
  const todayGrossProfit = todayOmzet - todayHpp;
  const grossProfitMargin = todayOmzet > 0 ? ((todayGrossProfit / todayOmzet) * 100).toFixed(1) : '0.0';
  const averageOrderValue = todayTx.length > 0 ? Math.round(todayOmzet / todayTx.length) : 0;

  // 2. Monthly Expenses
  const totalExpensesMonth = expenses.reduce((acc, e) => acc + e.amount, 0);

  // 3. Low stock warning count (< 5 pcs or below alert)
  const lowStockProducts = products.filter((p) => {
    const qty = p.product_quantity ?? p.stock ?? 0;
    const alert = p.product_stock_alert ?? p.min_stock ?? 5;
    return qty < alert;
  });

  const outOfStockProducts = products.filter((p) => (p.product_quantity ?? p.stock ?? 0) <= 0);

  // 4. Total Inventory Value (FIFO Valuation)
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (p.product_quantity ?? p.stock ?? 0) * (p.product_cost ?? p.cost_price ?? 0),
    0
  );
  const totalInventoryQty = products.reduce((acc, p) => acc + (p.product_quantity ?? p.stock ?? 0), 0);

  // 5. Fast-moving tires (Aggregate across transactions)
  const productSalesMap: Record<string, { product: any; totalQty: number; totalOmzet: number }> = {};

  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const prodId = item.product?.id || item.product_id || 'unknown';
      if (!productSalesMap[prodId]) {
        productSalesMap[prodId] = {
          product: item.product,
          totalQty: 0,
          totalOmzet: 0,
        };
      }
      productSalesMap[prodId].totalQty += item.qty;
      const unitPrice = item.custom_price ?? item.product?.product_price ?? item.product?.price ?? 0;
      productSalesMap[prodId].totalOmzet += unitPrice * item.qty;
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
      const brand = item.product?.brand || 'Lainnya';
      if (brandCountMap[brand] !== undefined) {
        brandCountMap[brand] += item.qty;
      }
    });
  });

  const brandColors: Record<string, string> = {
    Bridgestone: '#2563EB', // Enterprise Blue
    Accelera: '#D97706',    // Amber
    Dunlop: '#059669',      // Emerald
    Forceum: '#7C3AED',     // Purple
    GTRadial: '#0891B2',    // Cyan
    Hankook: '#DC2626',     // Red
  };

  const totalBrandTires = Object.values(brandCountMap).reduce((a, b) => a + b, 0) || 1;

  // 7. 7-Day Trend Chart
  const daysOrder = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const now = new Date();
  
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = daysOrder[d.getDay()];
    const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    
    const dayTransactions = transactions.filter((t) => t.date === dateStr && t.status !== 'VOID');
    const omzet = dayTransactions.reduce((acc, t) => acc + (t.total_amount ?? t.grand_total), 0);
    const hpp = dayTransactions.reduce((acc, t) => acc + (t.total_hpp ?? t.total_cost_hpp ?? 0), 0);
    const qty = dayTransactions.reduce((acc, t) => acc + t.items.reduce((s, item) => s + item.qty, 0), 0);

    return {
      date: dateLabel,
      day: i === 6 ? `${dayLabel} (Hari Ini)` : dayLabel,
      omzet,
      hpp,
      qty,
    };
  });

  const maxVal = Math.max(...last7DaysData.map((d) => d.omzet), 8000000);
  const chartHeight = 160;
  const chartWidth = 540;
  const paddingX = 35;
  const paddingY = 20;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const pointsOmzet = last7DaysData.map((d, i) => {
    const x = paddingX + (i / (last7DaysData.length - 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.omzet / maxVal) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  const pointsHpp = last7DaysData.map((d, i) => {
    const x = paddingX + (i / (last7DaysData.length - 1)) * usableWidth;
    const y = chartHeight - paddingY - (d.hpp / maxVal) * usableHeight;
    return `${x},${y}`;
  }).join(' ');

  const areaOmzet = `${pointsOmzet} ${paddingX + usableWidth},${chartHeight - paddingY} ${paddingX},${chartHeight - paddingY}`;

  // 8. Payment Method Distribution Calculation for Sales Tab
  const paymentBreakdown: Record<string, { count: number; total: number }> = {
    TUNAI: { count: 0, total: 0 },
    TRANSFER_BCA: { count: 0, total: 0 },
    QRIS: { count: 0, total: 0 },
    BON: { count: 0, total: 0 },
  };

  transactions.forEach((tx) => {
    const method = tx.payment_method || (tx.status === 'BON' ? 'BON' : 'TUNAI');
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += (tx.total_amount ?? tx.grand_total);
  });

  const allTxTotal = transactions.reduce((acc, t) => acc + (t.total_amount ?? t.grand_total), 0) || 1;

  // 9. Service vs Products Breakdown
  let productRevenue = 0;
  let serviceRevenue = 0;
  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const lineTotal = (item.custom_price ?? item.product?.product_price ?? item.product?.price ?? 0) * item.qty;
      if (item.item_type === 'SERVICE') {
        serviceRevenue += lineTotal;
      } else {
        productRevenue += lineTotal;
      }
    });
  });


  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-slate-50 text-slate-800 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* =======================================================================
          HEADER: TITLE & QUICK ACTIONS (Light Mode Enterprise)
          ======================================================================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span className="truncate">Pusat Kendali Eksekutif • Cabang 3 Magelang</span>
          </div>
          <h1 className="text-base sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 leading-snug">
            Dashboard Kinerja Toko & Akuntansi SAK EMKM
          </h1>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Monitoring real-time omzet kasir, margin laba kotor FIFO, persediaan ban gudang, dan beban operasional.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
          <ExportMenu
            reportId="dashboard_summary"
            data={{ transactions, products, expenses }}
            ctx={{ periodLabel: `Sampai ${formatDateIndo(new Date().toISOString())}` }}
          />
          <button
            onClick={onNavigateToInventory}
            className="flex-1 sm:flex-none h-10 sm:h-11 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-xl bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Boxes className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Inventori & FIFO</span>
          </button>

          <button
            onClick={onNavigateToPos}
            className="flex-1 sm:flex-none h-10 sm:h-11 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs cursor-pointer whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>Terminal Kasir</span>
          </button>
        </div>
      </div>

      {/* =======================================================================
          TAB NAVIGATION (Working & High Contrast)
          ======================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart2 className="w-4 h-4 shrink-0" />
          <span>
            <span className="sm:hidden">Overview</span>
            <span className="hidden sm:inline">Ringkasan Utama (Overview)</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sales')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'sales'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>
            <span className="sm:hidden">Penjualan</span>
            <span className="hidden sm:inline">Analisis Penjualan & Kasir</span>
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'inventory'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>
            <span className="sm:hidden">Persediaan</span>
            <span className="hidden sm:inline">Status Persediaan & FIFO</span>
          </span>
          {lowStockProducts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-white">
              {lowStockProducts.length}
            </span>
          )}
        </button>
      </div>

      {/* =======================================================================
          5 REAL KPI METRIC CARDS (Responsive 2x2 Grid + 1 Banner on Mobile)
          ======================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {/* Card 1: Omzet Hari Ini */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Omzet Hari Ini</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Banknote className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-slate-900 font-mono tracking-tight truncate" title={formatRupiah(todayOmzet)}>
              {formatRupiah(todayOmzet)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
              {todayQty} ban • {todayTx.length} nota
            </div>
          </div>
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="text-slate-500">AOV:</span>
            <span className="font-bold text-slate-800 font-mono">{formatRupiah(averageOrderValue)}</span>
          </div>
        </div>

        {/* Card 2: Laba Kotor FIFO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Laba Kotor FIFO</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-emerald-700 font-mono tracking-tight truncate" title={formatRupiah(todayGrossProfit)}>
              {formatRupiah(todayGrossProfit)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-emerald-700 font-bold mt-0.5 truncate">
              Margin: {grossProfitMargin}%
            </div>
          </div>
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="text-slate-500">HPP:</span>
            <span className="font-bold text-slate-800 font-mono">{formatRupiah(todayHpp)}</span>
          </div>
        </div>

        {/* Card 3: Valuasi Persediaan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Valuasi Stok FIFO</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Boxes className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-indigo-900 font-mono tracking-tight truncate" title={formatRupiah(totalInventoryValue)}>
              {formatRupiah(totalInventoryValue)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
              {totalInventoryQty} Unit Fisik
            </div>
          </div>
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="text-slate-500">SKU Aktif:</span>
            <span className="font-bold text-slate-800 font-mono">{products.length} SKU</span>
          </div>
        </div>

        {/* Card 4: Beban Toko Bulan Berjalan */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Beban Toko</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div>
            <div className="text-sm sm:text-lg md:text-xl font-black text-rose-700 font-mono tracking-tight truncate" title={formatRupiah(totalExpensesMonth)}>
              {formatRupiah(totalExpensesMonth)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
              {expenses.length} Pos Biaya
            </div>
          </div>
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="text-slate-500">Operasional:</span>
            <span className="font-bold text-rose-600 font-mono">Tercatat</span>
          </div>
        </div>

        {/* Card 5: Peringatan Stok Kritis (Spans 2 columns on mobile) */}
        <div 
          onClick={onNavigateToInventory}
          className="col-span-2 sm:col-span-1 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between space-y-1.5 sm:space-y-2 cursor-pointer hover:border-amber-400 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Peringatan Restock</span>
            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 ${lowStockProducts.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between sm:block">
            <div className={`text-sm sm:text-lg md:text-xl font-black font-mono tracking-tight truncate ${lowStockProducts.length > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {lowStockProducts.length} Ukuran Ban
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-semibold mt-0.5 truncate">
              {outOfStockProducts.length} SKU Habis (0 Unit)
            </div>
          </div>
          <div className="pt-1.5 sm:pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px]">
            <span className="text-amber-700 font-bold">Buka Inventori</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* =======================================================================
          TAB CONTENT 1: OVERVIEW (Tren 7 Hari, Pangsa Merek, Fast-Moving, Low Stock)
          ======================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Section: Grafik Tren 7 Hari & Pangsa Merek */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tren Omzet vs HPP 7 Hari (2 Kolom) */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-600" />
                    <span>Tren Omzet vs HPP FIFO (7 Hari Terakhir)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data transaksi kasir harian dibandingkan beban pokok penjualan FIFO.
                  </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <div className="flex items-center gap-1.5 text-slate-800">
                    <span className="w-3 h-3 rounded-full bg-blue-600" />
                    <span>Penjualan</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-3 rounded-full bg-slate-300" />
                    <span>HPP FIFO</span>
                  </div>
                </div>
              </div>

              {/* SVG Line Chart */}
              <div className="w-full overflow-x-auto pb-1">
                <div className="min-w-[320px] w-full">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-auto aspect-[27/11] sm:aspect-[27/8] min-h-[160px] overflow-visible"
                  >
                    <defs>
                      <linearGradient id="lightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.00" />
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
                            stroke="#e2e8f0"
                            strokeWidth="1"
                          />
                          <text
                            x={paddingX - 6}
                            y={y + 3}
                            textAnchor="end"
                            fontSize="9"
                            fill="#64748b"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {labelVal}jt
                          </text>
                        </g>
                      );
                    })}

                    {/* Area gradient under Omzet */}
                    <polygon points={areaOmzet} fill="url(#lightGradient)" />

                    {/* HPP Line (Dashed) */}
                    <polyline
                      points={pointsHpp}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />

                    {/* Omzet Line */}
                    <polyline
                      points={pointsOmzet}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data points & tooltips */}
                    {last7DaysData.map((d, i) => {
                      const x = paddingX + (i / (last7DaysData.length - 1)) * usableWidth;
                      const yOmzet = chartHeight - paddingY - (d.omzet / maxVal) * usableHeight;
                      const isHovered = hoveredDayIdx === i;

                      return (
                        <g key={i} className="cursor-pointer">
                          <circle
                            cx={x}
                            cy={yOmzet}
                            r={isHovered ? 6 : 4}
                            fill="#ffffff"
                            stroke="#2563eb"
                            strokeWidth="2.5"
                            onMouseEnter={() => setHoveredDayIdx(i)}
                            onMouseLeave={() => setHoveredDayIdx(null)}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              setHoveredDayIdx(hoveredDayIdx === i ? null : i);
                            }}
                            onClick={() => setHoveredDayIdx(hoveredDayIdx === i ? null : i)}
                          />

                          {/* Date label on X-axis */}
                          <text
                            x={x}
                            y={chartHeight - 4}
                            textAnchor="middle"
                            fontSize="9.5"
                            fill={isHovered ? '#0f172a' : '#475569'}
                            fontWeight={isHovered ? 'bold' : '600'}
                          >
                            {d.date}
                          </text>

                          {/* Tooltip on Hover */}
                          {isHovered && (
                            <g>
                              <rect
                                x={x - 50}
                                y={Math.max(10, yOmzet - 34)}
                                width="100"
                                height="26"
                                rx="6"
                                fill="#0f172a"
                                className="shadow-md"
                              />
                              <text
                                x={x}
                                y={Math.max(10, yOmzet - 34) + 17}
                                textAnchor="middle"
                                fill="#ffffff"
                                fontSize="10"
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
            </div>

            {/* Donut Chart: Pangsa Penjualan Merek Ban */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
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
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                    Unit Terjual
                  </span>
                </div>
              </div>

              {/* Legend Grid */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-2 text-xs pt-3 border-t border-slate-100">
                {Object.entries(brandCountMap).map(([brand, count]) => (
                  <div key={brand} className="flex items-center justify-between text-slate-700">
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

          {/* Section: Fast Moving & Low Stock Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Moving Tires Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span>Produk Ban Terlaris (Fast-Moving)</span>
                </h3>
                <span className="text-xs text-slate-500 font-semibold">Bulan Berjalan</span>
              </div>

              <div className="w-full overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-700 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Ukuran & Merek</th>
                        <th className="py-2.5 px-3 font-bold text-center">Terjual</th>
                        <th className="py-2.5 px-3 font-bold text-right">Total Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fastMovingList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{item.product?.size || item.product?.product_size || item.product?.name}</div>
                            <div className="text-[10px] text-slate-500">{item.product?.brand || 'Ban'} • {item.product?.name || item.product?.product_name}</div>
                          </td>
                          <td className="py-2 px-3 text-center font-mono font-black text-slate-800">
                            {item.totalQty} pcs
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(item.totalOmzet)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Low Stock Warning Table */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Peringatan Stok Minimum Gudang</span>
                </h3>
                <button
                  onClick={onNavigateToInventory}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Buka Inventori</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-full overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-700 bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Nama Ban</th>
                        <th className="py-2.5 px-3 font-bold text-center">Sisa Fisik</th>
                        <th className="py-2.5 px-3 font-bold text-right">Ambang Batas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lowStockProducts.slice(0, 5).map((prod) => (
                        <tr key={prod.id} className="hover:bg-amber-50/40 transition-colors">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{prod.size || prod.product_size || prod.product_name}</div>
                            <div className="text-[10px] text-slate-500">{prod.brand} • {prod.name || prod.product_name}</div>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black border ${
                              (prod.product_quantity ?? prod.stock ?? 0) <= 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {prod.product_quantity ?? prod.stock ?? 0} pcs
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-slate-700 font-semibold">
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
        </div>
      )}

      {/* =======================================================================
          TAB CONTENT 2: SALES ANALYSIS (Metode Pembayaran, Jasa vs Produk, Riwayat)
          ======================================================================= */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Payment Method Breakdown Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Distribusi Metode Pembayaran Pelanggan</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Volume transaksi berdasarkan metode pelunasan kasir.
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(paymentBreakdown).map(([method, data]) => {
                  const pct = Math.round((data.total / allTxTotal) * 100) || 0;
                  const labelMap: Record<string, string> = {
                    TUNAI: 'Uang Tunai (Cash)',
                    TRANSFER_BCA: 'Transfer Bank BCA',
                    QRIS: 'QRIS Dinamis',
                    BON: 'Piutang Bon Belum Lunas',
                  };
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{labelMap[method] || method}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{data.count} nota ({pct}%)</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(data.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            method === 'TUNAI' ? 'bg-emerald-500' : method === 'TRANSFER_BCA' ? 'bg-blue-600' : method === 'QRIS' ? 'bg-cyan-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Service vs Product Revenue Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-600" />
                  <span>Komposisi Penjualan: Ban Fisik vs Jasa Bengkel</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Perbandingan omzet penjualan ban baru dengan layanan spooring/balancing.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                  <span className="text-xs font-bold text-blue-700 block">Penjualan Ban & Fisik</span>
                  <div className="text-lg font-black font-mono text-blue-900 mt-1">
                    {formatRupiah(productRevenue)}
                  </div>
                  <span className="text-[11px] text-blue-700 font-semibold mt-1 block">
                    {Math.round((productRevenue / (productRevenue + serviceRevenue || 1)) * 100)}% dari Total
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200">
                  <span className="text-xs font-bold text-cyan-700 block">Layanan Jasa & Servis</span>
                  <div className="text-lg font-black font-mono text-cyan-900 mt-1">
                    {formatRupiah(serviceRevenue)}
                  </div>
                  <span className="text-[11px] text-cyan-700 font-semibold mt-1 block">
                    {Math.round((serviceRevenue / (productRevenue + serviceRevenue || 1)) * 100)}% dari Total
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                <span className="font-bold text-slate-800">Catatan Bisnis:</span> Layanan spooring 3D & balancing memiliki margin laba kotor 95%+ karena tanpa HPP fisik ban.
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900">Riwayat Transaksi Terkini</h3>
              <span className="text-xs text-slate-500 font-semibold">{transactions.length} Nota Kasir</span>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-xs text-left border-collapse">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-700 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">No Nota</th>
                      <th className="py-2.5 px-3 font-bold">Tanggal & Waktu</th>
                      <th className="py-2.5 px-3 font-bold">Pelanggan / Plat</th>
                      <th className="py-2.5 px-3 font-bold">Item Terbeli</th>
                      <th className="py-2.5 px-3 font-bold text-center">Metode</th>
                      <th className="py-2.5 px-3 font-bold text-right">Total Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.slice(0, 8).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{tx.invoice_number}</td>
                        <td className="py-2 px-3 text-slate-600 font-medium">{tx.date} • {tx.timestamp || '10:30'}</td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{tx.customer_name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{tx.vehicle_plate} ({tx.vehicle_model})</div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {tx.items.length} Item ({tx.items.reduce((s, i) => s + i.qty, 0)} pcs)
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            tx.payment_method === 'TUNAI'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : tx.payment_method === 'TRANSFER_BCA'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : tx.payment_method === 'QRIS'
                              ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {tx.payment_method || 'TUNAI'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(tx.total_amount ?? tx.grand_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          TAB CONTENT 3: INVENTORY & FIFO (Valuasi per Kategori & Reorder)
          ======================================================================= */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory Category Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Katalog Ban Baru</span>
                <span className="text-blue-700">Kategori Utama</span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {products.filter((p) => (p.category || 'BAN_BARU') === 'BAN_BARU').length} SKU
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Bridgestone, Accelera, Dunlop, Forceum, GT Radial, Hankook
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Katalog Velg Mobil</span>
                <span className="text-amber-700">Aksesoris Roda</span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {products.filter((p) => p.category === 'VELG').length} SKU
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Velg Ring 14 hingga Ring 18 (PCD 4x100, 5x114.3)
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600 mb-1">
                <span>Ban Dalam & Flap</span>
                <span className="text-emerald-700">Komponen Ban</span>
              </div>
              <div className="text-xl font-black text-slate-900 font-mono">
                {products.filter((p) => p.category === 'BAN_DALAM').length} SKU
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Ban dalam truk/niaga dan mobil penumpang
              </p>
            </div>
          </div>

          {/* Detailed Reorder & Stock Health List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Daftar Ban Harus Segera Di-Order Ulang (Restock Priority)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ban dengan sisa stok di bawah batas minimum yang disarankan segera dibuatkan faktur penerimaan barang.
                </p>
              </div>

              <button
                onClick={onNavigateToInventory}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Buat Penerimaan Barang</span>
              </button>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-xs text-left border-collapse">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-700 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 font-bold">Produk & Ukuran</th>
                      <th className="py-2.5 px-3 font-bold">Merek</th>
                      <th className="py-2.5 px-3 font-bold text-center">Sisa Fisik</th>
                      <th className="py-2.5 px-3 font-bold text-center">Batas Minimum</th>
                      <th className="py-2.5 px-3 font-bold text-right">Estimasi HPP</th>
                      <th className="py-2.5 px-3 font-bold text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900">{p.product_name || p.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">{p.product_code || p.barcode || p.size}</div>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{p.brand}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                            (p.product_quantity ?? p.stock ?? 0) <= 0
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {p.product_quantity ?? p.stock ?? 0} unit
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center font-mono text-slate-600 font-bold">
                          {p.product_stock_alert ?? p.min_stock ?? 5} unit
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(p.product_cost ?? p.cost_price ?? 0)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            onClick={onNavigateToInventory}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                          >
                            Restock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
