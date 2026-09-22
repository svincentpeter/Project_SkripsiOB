import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Calendar,
  Search,
  Download,
  Filter,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign,
  Tag,
  Edit2,
  CheckCircle2,
  Info
} from 'lucide-react';
import { ProductItem, PosTransaction, StockMutation } from '../../../shared/types';
import { formatRupiah, formatNumber } from '../../../shared/utils/formatters';
import {
  calculateClientStockLedger,
  StockLedgerRow,
  StockMonthlyReportData,
} from '../../../services/stockMonthlyLedgerService';
import { StockLedgerInlineModal, InlineEditField } from './StockLedgerInlineModal';
import { exportStockLedgerToExcel } from '../../../shared/export/stockLedgerExcel';

interface StockMonthlyLedgerViewProps {
  products: ProductItem[];
  transactions?: PosTransaction[];
  mutations?: StockMutation[];
  onUpdateProductStock?: (updatedProducts: ProductItem[], newMutations: StockMutation[]) => void;
  onUpdateProduct?: (productId: string, updates: Partial<ProductItem>) => void;
}

export const StockMonthlyLedgerView: React.FC<StockMonthlyLedgerViewProps> = ({
  products,
  transactions = [],
  mutations = [],
  onUpdateProductStock,
  onUpdateProduct,
}) => {
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [reportData, setReportData] = useState<StockMonthlyReportData | null>(null);

  // Modal edit state
  const [activeModal, setActiveModal] = useState<{
    isOpen: boolean;
    row: StockLedgerRow | null;
    field: InlineEditField;
    batchId?: string | number | null;
  }>({
    isOpen: false,
    row: null,
    field: 'opening_stock',
  });

  // Fetch or calculate report data
  const loadLedgerData = async () => {
    setLoading(true);
    try {
      // Try backend API first
      const brandParam = selectedBrand !== 'ALL' ? `&brand=${encodeURIComponent(selectedBrand)}` : '';
      const response = await fetch(`/api/v1/reports/stock-monthly?month=${selectedMonth}${brandParam}`);

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          setReportData(json.data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Fallback to client computation
    }

    // Client-side fallback computation
    const clientData = calculateClientStockLedger(
      products,
      transactions,
      mutations,
      selectedMonth,
      selectedBrand !== 'ALL' ? selectedBrand : undefined
    );
    setReportData(clientData);
    setLoading(false);
  };

  useEffect(() => {
    loadLedgerData();
  }, [selectedMonth, selectedBrand, products, transactions, mutations]);

  // Filter rows by search query
  const displayRows = useMemo(() => {
    if (!reportData) return [];
    if (!searchQuery.trim()) return reportData.rows;

    const q = searchQuery.toLowerCase();
    return reportData.rows.filter(
      (r) =>
        r.product_name.toLowerCase().includes(q) ||
        r.product_code.toLowerCase().includes(q) ||
        r.product_size.toLowerCase().includes(q) ||
        r.brand_name.toLowerCase().includes(q) ||
        r.motif.toLowerCase().includes(q)
    );
  }, [reportData, searchQuery]);

  const daysInMonth = reportData?.meta?.days_in_month || 30;
  const dayColumns = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  // Handle modal submit
  const handleModalSave = async (payload: {
    field: InlineEditField;
    value: any;
    reference_price?: number;
    batch_id?: string | number | null;
  }) => {
    const row = activeModal.row;
    if (!row) return;

    try {
      // 1. Send to backend if available
      await fetch('/api/v1/reports/stock-monthly/inline-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: row.id,
          field: payload.field,
          value: payload.value,
          month: selectedMonth,
          batch_id: payload.batch_id,
          reference_price: payload.reference_price,
        }),
      });
    } catch (e) {
      // Offline / client fallback
    }

    // 2. Update local state
    if (payload.field === 'opening_stock') {
      const newOpening = Number(payload.value);
      const delta = newOpening - row.opening;
      if (onUpdateProduct) {
        onUpdateProduct(row.id, {
          stok_awal: newOpening,
          product_quantity: Math.max(0, (row.remaining || 0) + delta),
        });
      }
    } else if (payload.field === 'batch_cost') {
      if (onUpdateProduct) {
        onUpdateProduct(row.id, {
          product_cost: Number(payload.value),
        });
      }
    } else if (payload.field === 'old_stock_tag') {
      if (onUpdateProduct) {
        onUpdateProduct(row.id, {
          is_old_stock: Boolean(payload.value),
          reference_price: payload.reference_price,
        });
      }
    }

    // Refresh ledger data
    setTimeout(loadLedgerData, 100);
  };

  const handleExportExcel = () => {
    if (!reportData) return;
    exportStockLedgerToExcel(reportData, `Laporan_Stok_FIFO_${selectedMonth}`);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Metrics Cards for Owner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-indigo-800/40 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                Total Valuasi HPP Gudang
              </p>
              <h3 className="text-xl font-extrabold font-mono mt-1 text-white">
                {formatRupiah(reportData?.summary?.total_valuation_cogs || 0)}
              </h3>
              <p className="text-[10px] text-indigo-200/80 mt-1 flex items-center gap-1">
                <Layers className="w-3 h-3 text-indigo-400" />
                <span>Berdasarkan {reportData?.summary?.total_remaining || 0} unit ban aktif</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Fisik Tersedia
              </p>
              <h3 className="text-xl font-extrabold font-mono mt-1 text-slate-900">
                {formatNumber(reportData?.summary?.total_remaining || 0)}{' '}
                <span className="text-xs font-semibold text-slate-500">pcs</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">
                Awal: {reportData?.summary?.total_opening || 0} | Restock: +{reportData?.summary?.total_restock || 0}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Terjual Bulan Ini
              </p>
              <h3 className="text-xl font-extrabold font-mono mt-1 text-emerald-700">
                {formatNumber(reportData?.summary?.total_sold || 0)}{' '}
                <span className="text-xs font-semibold text-slate-500">pcs</span>
              </h3>
              <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                Akumulasi penjualan tgl 1–{daysInMonth}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Status Stok Menipis
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-rose-100 text-rose-800 font-extrabold font-mono text-xs px-2.5 py-1 rounded-lg">
                  {reportData?.summary?.empty_stock_count || 0} Kosong
                </span>
                <span className="bg-amber-100 text-amber-800 font-extrabold font-mono text-xs px-2.5 py-1 rounded-lg">
                  {reportData?.summary?.low_stock_count || 0} Kritis (&le;2)
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Total {reportData?.summary?.total_products || 0} varian</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
            />
          </div>

          {/* Brand Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Merk Ban</option>
              {reportData?.meta?.brand_options?.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari motif / ukuran / nama..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium w-48 sm:w-64 focus:bg-white focus:border-indigo-500 outline-hidden"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLedgerData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* 3. Spreadsheet Table Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[620px] relative">
          <table className="w-full text-xs text-left border-collapse select-text">
            {/* Table Header */}
            <thead className="text-[11px] uppercase bg-slate-800 text-slate-200 sticky top-0 z-30 shadow-xs">
              <tr>
                {/* Frozen Left Headers */}
                <th className="py-2.5 px-2 font-extrabold text-center border-r border-slate-700 sticky left-0 z-40 bg-slate-800 w-11">
                  No
                </th>
                <th className="py-2.5 px-3 font-extrabold border-r border-slate-700 sticky left-11 z-40 bg-slate-800 min-w-[240px]">
                  Merk &amp; Nama Ban
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center border-r border-slate-700 sticky left-[284px] z-40 bg-slate-800 w-20">
                  Ukuran
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center border-r border-slate-700 sticky left-[364px] z-40 bg-slate-800 w-14">
                  Ring
                </th>
                <th className="py-2.5 px-3 font-extrabold text-right border-r border-slate-700 sticky left-[420px] z-40 bg-slate-800 w-24">
                  Modal
                </th>
                <th className="py-2.5 px-3 font-extrabold text-right border-r border-slate-700 sticky left-[516px] z-40 bg-slate-800 w-24 shadow-r">
                  Harga
                </th>

                {/* Middle Stock Headers */}
                <th className="py-2.5 px-2 font-extrabold text-center bg-indigo-950 text-indigo-200 border-r border-indigo-800 w-16">
                  Awal
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center bg-indigo-950 text-indigo-200 border-r border-indigo-800 w-16">
                  Masuk
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center bg-indigo-950 text-indigo-200 border-r border-indigo-800 w-16">
                  Sisa
                </th>

                {/* Horizontal Daily Sales Columns (1..31) */}
                {dayColumns.map((day) => (
                  <th
                    key={day}
                    className="py-2.5 px-1 font-bold text-center border-r border-slate-700 w-9 text-[10px] text-slate-300"
                  >
                    {day}
                  </th>
                ))}

                {/* Right Total Header */}
                <th className="py-2.5 px-2.5 font-extrabold text-center bg-emerald-950 text-emerald-200 border-l border-emerald-800 w-20">
                  Total
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={10 + daysInMonth} className="text-center py-12 text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Tidak ada data stok untuk periode ini</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba pilih merk lain atau sesuaikan pencarian.
                    </p>
                  </td>
                </tr>
              ) : (
                displayRows.map((row, index) => {
                  const sisaColor =
                    row.remaining <= 0
                      ? 'bg-rose-100 text-rose-800 font-extrabold'
                      : row.remaining <= 2
                      ? 'bg-amber-100 text-amber-800 font-extrabold'
                      : 'bg-emerald-100 text-emerald-800 font-bold';

                  const hasMultipleLayers = row.layers && row.layers.length > 1;

                  return (
                    <React.Fragment key={row.id}>
                      {/* Main Product Row */}
                      <tr className="hover:bg-slate-50/80 transition-colors group">
                        {/* 1. No */}
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200 sticky left-0 z-20 bg-white group-hover:bg-slate-50">
                          {index + 1}
                        </td>

                        {/* 2. Brand & Tire Name */}
                        <td className="py-2 px-3 border-r border-slate-200 sticky left-11 z-20 bg-white group-hover:bg-slate-50">
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`truncate font-medium ${
                                row.is_old_stock ? 'text-rose-600 font-bold' : 'text-slate-900 font-semibold'
                              }`}
                              title={row.product_name}
                            >
                              {row.brand_name} {row.motif !== '-' ? row.motif : row.product_name}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              {row.is_old_stock && row.reference_price && (
                                <span className="bg-rose-50 text-rose-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-rose-200">
                                  @{formatRupiah(row.reference_price)}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveModal({
                                    isOpen: true,
                                    row,
                                    field: 'old_stock_tag',
                                  })
                                }
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                                title="Tandai Stok Lama / Promo"
                              >
                                <Tag className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 3. Size */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-700 border-r border-slate-200 sticky left-[284px] z-20 bg-white group-hover:bg-slate-50">
                          {row.product_size}
                        </td>

                        {/* 4. Ring */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] font-bold text-slate-700 border-r border-slate-200 sticky left-[364px] z-20 bg-white group-hover:bg-slate-50">
                          {row.ring ? `R${String(row.ring).replace(/\D/g, '')}` : '-'}
                        </td>

                        {/* 5. Modal (HPP) - Clickable */}
                        <td
                          onClick={() =>
                            setActiveModal({
                              isOpen: true,
                              row,
                              field: 'batch_cost',
                              batchId: row.layers[0]?.batch_id,
                            })
                          }
                          className="py-2 px-3 text-right font-mono font-bold text-slate-800 border-r border-slate-200 sticky left-[420px] z-20 bg-white group-hover:bg-indigo-50/80 cursor-pointer"
                          title="Klik untuk koreksi modal"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>{formatNumber(row.product_cost)}</span>
                            <Edit2 className="w-2.5 h-2.5 text-indigo-400 opacity-0 group-hover:opacity-100" />
                          </div>
                        </td>

                        {/* 6. Price */}
                        <td className="py-2 px-3 text-right font-mono text-slate-700 border-r border-slate-200 sticky left-[516px] z-20 bg-white group-hover:bg-slate-50 shadow-r">
                          {formatNumber(row.product_price)}
                        </td>

                        {/* 7. Stock Awal - Clickable */}
                        <td
                          onClick={() =>
                            setActiveModal({
                              isOpen: true,
                              row,
                              field: 'opening_stock',
                            })
                          }
                          className="py-2 px-2 text-center font-mono font-bold text-indigo-950 bg-indigo-50/40 hover:bg-indigo-100/70 border-r border-slate-200 cursor-pointer transition-colors"
                          title="Klik untuk koreksi stok fisik awal"
                        >
                          <div className="flex items-center justify-center gap-0.5">
                            <span>{row.opening}</span>
                            <Edit2 className="w-2.5 h-2.5 text-indigo-500 opacity-0 group-hover:opacity-100" />
                          </div>
                        </td>

                        {/* 8. Restock */}
                        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700 bg-indigo-50/20 border-r border-slate-200">
                          {row.restock > 0 ? `+${row.restock}` : '0'}
                        </td>

                        {/* 9. Sisa */}
                        <td className="py-2 px-2 text-center border-r border-slate-200">
                          <span className={`inline-block font-mono text-[11px] px-2 py-0.5 rounded-md ${sisaColor}`}>
                            {row.remaining}
                          </span>
                        </td>

                        {/* 10. Daily Sales 1..31 */}
                        {dayColumns.map((day) => {
                          const soldQty = row.daily_sales[day] || 0;
                          return (
                            <td
                              key={day}
                              className={`py-2 px-1 text-center font-mono text-[11px] border-r border-slate-200 ${
                                soldQty > 0
                                  ? 'bg-emerald-100 text-emerald-900 font-extrabold'
                                  : 'text-slate-300'
                              }`}
                            >
                              {soldQty > 0 ? soldQty : ''}
                            </td>
                          );
                        })}

                        {/* 11. Total Sold */}
                        <td className="py-2 px-2.5 text-center font-mono font-extrabold text-emerald-800 bg-emerald-50/60 border-l border-emerald-200">
                          {row.sold}
                        </td>
                      </tr>

                      {/* Sub-rows for Multi-Layer FIFO Batches (Mode Buku) */}
                      {hasMultipleLayers &&
                        row.layers.slice(1).map((layer, lIdx) => {
                          const layerSisaColor =
                            layer.remaining_qty <= 0
                              ? 'text-rose-700 font-bold'
                              : layer.remaining_qty <= 2
                              ? 'text-amber-700 font-bold'
                              : 'text-emerald-700 font-bold';

                          return (
                            <tr key={`${row.id}-layer-${lIdx}`} className="bg-slate-50/40 text-[11px]">
                              {/* Empty No */}
                              <td className="py-1.5 px-2 border-r border-slate-200 sticky left-0 z-20 bg-slate-50/40" />

                              {/* Indented Layer label */}
                              <td className="py-1.5 px-3 pl-8 text-slate-500 italic border-r border-slate-200 sticky left-11 z-20 bg-slate-50/40">
                                ↳ Lapisan Batch #{lIdx + 2}
                              </td>

                              {/* Empty size/ring */}
                              <td className="py-1.5 px-2 border-r border-slate-200 sticky left-[284px] z-20 bg-slate-50/40" />
                              <td className="py-1.5 px-2 border-r border-slate-200 sticky left-[364px] z-20 bg-slate-50/40" />

                              {/* Layer Cost */}
                              <td
                                onClick={() =>
                                  setActiveModal({
                                    isOpen: true,
                                    row,
                                    field: 'batch_cost',
                                    batchId: layer.batch_id,
                                  })
                                }
                                className="py-1.5 px-3 text-right font-mono font-bold text-indigo-900 border-r border-slate-200 sticky left-[420px] z-20 bg-slate-50/40 cursor-pointer hover:underline"
                              >
                                {formatNumber(layer.batch_cost)}
                              </td>

                              {/* Empty price */}
                              <td className="py-1.5 px-3 border-r border-slate-200 sticky left-[516px] z-20 bg-slate-50/40 shadow-r" />

                              {/* Layer Opening */}
                              <td className="py-1.5 px-2 text-center font-mono text-slate-600 border-r border-slate-200">
                                {layer.initial_qty}
                              </td>

                              {/* Empty restock */}
                              <td className="py-1.5 px-2 text-center font-mono text-slate-400 border-r border-slate-200">
                                -
                              </td>

                              {/* Layer Remaining */}
                              <td className="py-1.5 px-2 text-center font-mono border-r border-slate-200">
                                <span className={layerSisaColor}>{layer.remaining_qty}</span>
                              </td>

                              {/* Layer Daily Sales */}
                              {dayColumns.map((day) => {
                                const q = layer.daily_sales[day] || 0;
                                return (
                                  <td
                                    key={day}
                                    className={`py-1.5 px-1 text-center font-mono text-[10px] border-r border-slate-200 ${
                                      q > 0 ? 'text-emerald-800 font-bold' : 'text-slate-300'
                                    }`}
                                  >
                                    {q > 0 ? q : ''}
                                  </td>
                                );
                              })}

                              {/* Layer Sold */}
                              <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-600 border-l border-slate-200">
                                {layer.sold}
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Interactive Inline Modal */}
      {activeModal.isOpen && activeModal.row && (
        <StockLedgerInlineModal
          isOpen={activeModal.isOpen}
          onClose={() => setActiveModal({ isOpen: false, row: null, field: 'opening_stock' })}
          productName={`${activeModal.row.brand_name} ${activeModal.row.motif !== '-' ? activeModal.row.motif : activeModal.row.product_name}`}
          field={activeModal.field}
          currentValue={
            activeModal.field === 'opening_stock'
              ? activeModal.row.opening
              : activeModal.field === 'batch_cost'
              ? activeModal.row.product_cost
              : activeModal.row.is_old_stock
          }
          referencePrice={activeModal.row.reference_price}
          batchId={activeModal.batchId}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};
