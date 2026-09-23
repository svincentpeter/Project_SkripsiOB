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
import { apiClient } from '../../../services/api';
import type { ApiJournal } from '../../../services/api';
import { useToast } from '../../../shared/components';
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
  /** Dipanggil setelah server menyimpan koreksi (stok, katalog & jurnal perlu dimuat ulang). */
  onServerChanged?: (journal?: ApiJournal | null) => void;
}

export const StockMonthlyLedgerView: React.FC<StockMonthlyLedgerViewProps> = ({
  products,
  transactions = [],
  mutations = [],
  onServerChanged,
}) => {
  const toast = useToast();
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showBatchDetails, setShowBatchDetails] = useState<boolean>(true);
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
      const json = await apiClient.get<{ success: boolean; data: any }>('/reports/stock-monthly', {
        month: selectedMonth,
        brand: selectedBrand !== 'ALL' ? selectedBrand : undefined,
      });
      if (json.success && json.data) {
        setReportData(json.data);
        setLoading(false);
        return;
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
      const res = await apiClient.post<{ data?: { journal?: ApiJournal | null } }>('/reports/stock-monthly/inline-update', {
        product_id: row.id,
        field: payload.field,
        value: payload.value,
        month: selectedMonth,
        batch_id: payload.batch_id,
        reference_price: payload.reference_price,
      });
      onServerChanged?.(res?.data?.journal ?? null);
      toast.success('Koreksi Disimpan', 'Perubahan stok/modal dibukukan beserta jurnal selisih persediaan.');
    } catch (err) {
      toast.error('Koreksi Gagal', err instanceof Error ? err.message : 'Server menolak koreksi.');
      return;
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

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle FIFO Batch Details */}
          <button
            type="button"
            onClick={() => setShowBatchDetails((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              showBatchDetails
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
            title="Tampilkan / Sembunyikan Rincian Sub-Baris Lapisan FIFO"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{showBatchDetails ? 'Sembunyikan Rincian Batch' : 'Tampilkan Rincian Batch'}</span>
          </button>

          <button
            onClick={loadLedgerData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
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
        <div className="overflow-x-auto max-h-[640px] relative">
          <table className="w-full text-xs text-left border-collapse select-text table-fixed">
            <colgroup>
              <col style={{ width: 44 }} />
              <col style={{ width: 240 }} />
              <col style={{ width: 90 }} />
              <col style={{ width: 56 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 60 }} />
              <col style={{ width: 60 }} />
              {dayColumns.map((day) => (
                <col key={day} style={{ width: 34 }} />
              ))}
              <col style={{ width: 65 }} />
            </colgroup>

            {/* Table Header */}
            <thead className="text-[11px] uppercase bg-slate-800 text-slate-200 sticky top-0 z-30 shadow-sm">
              <tr>
                {/* Frozen Left Headers (Identity: No, Merk, Ukuran, Ring) */}
                <th className="py-2.5 px-2 font-extrabold text-center border-r border-slate-700 sticky left-0 z-40 bg-slate-800">
                  No
                </th>
                <th className="py-2.5 px-3 font-extrabold border-r border-slate-700 sticky left-[44px] z-40 bg-slate-800">
                  Merk &amp; Nama Ban
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center border-r border-slate-700 sticky left-[284px] z-40 bg-slate-800">
                  Ukuran
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center border-r-2 border-slate-600 shadow-[3px_0_6px_-1px_rgba(0,0,0,0.25)] sticky left-[374px] z-40 bg-slate-800">
                  Ring
                </th>

                {/* Pricing Columns */}
                <th className="py-2.5 px-3 font-extrabold text-right border-r border-slate-700 bg-slate-800 text-amber-300">
                  Modal
                </th>
                <th className="py-2.5 px-3 font-extrabold text-right border-r border-slate-700 bg-slate-800 text-blue-300">
                  Harga
                </th>

                {/* Stock Quantity Headers */}
                <th className="py-2.5 px-2 font-extrabold text-center bg-indigo-950 text-indigo-200 border-r border-indigo-900">
                  Awal
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center bg-indigo-950 text-indigo-200 border-r border-indigo-900">
                  Masuk
                </th>
                <th className="py-2.5 px-2 font-extrabold text-center bg-indigo-950 text-indigo-200 border-r border-indigo-900">
                  Sisa
                </th>

                {/* Horizontal Daily Sales Columns (1..31) */}
                {dayColumns.map((day) => (
                  <th
                    key={day}
                    className="py-2.5 px-1 font-bold text-center border-r border-slate-700 text-[10px] text-slate-300"
                  >
                    {day}
                  </th>
                ))}

                {/* Right Total Header */}
                <th className="py-2.5 px-2.5 font-extrabold text-center bg-emerald-950 text-emerald-200 border-l border-emerald-900">
                  Total
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {displayRows.length === 0 ? (
                <tr>
                  <td colSpan={9 + daysInMonth + 1} className="text-center py-12 text-slate-500">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Tidak ada data stok untuk periode ini</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba pilih merk lain atau sesuaikan kata kunci pencarian.
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
                        <td className="py-2 px-3 border-r border-slate-200 sticky left-[44px] z-20 bg-white group-hover:bg-slate-50">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center justify-between gap-1.5">
                              <span
                                className={`truncate font-semibold text-xs ${
                                  row.is_old_stock ? 'text-rose-600 font-bold' : 'text-slate-900'
                                }`}
                                title={row.product_name}
                              >
                                {(() => {
                                  const brand = (row.brand_name || '').trim();
                                  const raw = (row.motif && row.motif !== '-' ? row.motif : row.product_name || '').trim();
                                  if (brand && raw.toLowerCase().startsWith(brand.toLowerCase())) {
                                    return raw;
                                  }
                                  return brand ? `${brand} ${raw}`.trim() : raw;
                                })()}
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
                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity cursor-pointer"
                                  title="Tandai Stok Lama / Promo"
                                >
                                  <Tag className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            {/* Multi-Batch Indicator Chip */}
                            {hasMultipleLayers && (
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                                  <Layers className="w-2.5 h-2.5" />
                                  {row.layers.length} Batch FIFO
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  HPP Rata2: Rp {formatNumber(row.product_cost)}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 3. Size */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-700 border-r border-slate-200 sticky left-[284px] z-20 bg-white group-hover:bg-slate-50 whitespace-nowrap">
                          {row.product_size}
                        </td>

                        {/* 4. Ring (Frozen Boundary Divider) */}
                        <td className="py-2 px-2 text-center font-mono text-[11px] font-bold text-slate-700 border-r-2 border-slate-300 shadow-[3px_0_6px_-1px_rgba(0,0,0,0.1)] sticky left-[374px] z-20 bg-white group-hover:bg-slate-50">
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
                          className="py-2 px-2.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200 hover:bg-amber-50/70 transition-colors cursor-pointer group/modal"
                          title="Klik untuk koreksi modal (HPP)"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="border-b border-dashed border-amber-400/80">{formatNumber(row.product_cost)}</span>
                            <Edit2 className="w-2.5 h-2.5 text-amber-500 opacity-0 group-hover/modal:opacity-100 transition-opacity" />
                          </div>
                        </td>

                        {/* 6. Price */}
                        <td className="py-2 px-2.5 text-right font-mono text-slate-700 border-r border-slate-200">
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
                          className="py-2 px-2 text-center font-mono font-bold text-indigo-950 bg-indigo-50/30 hover:bg-indigo-100/70 border-r border-slate-200 cursor-pointer transition-colors group/open"
                          title="Klik untuk koreksi stok fisik awal"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="border-b border-dashed border-indigo-400/80">{row.opening}</span>
                            <Edit2 className="w-2.5 h-2.5 text-indigo-500 opacity-0 group-hover/open:opacity-100 transition-opacity" />
                          </div>
                        </td>

                        {/* 8. Restock */}
                        <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700 bg-indigo-50/15 border-r border-slate-200">
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
                        <td className="py-2 px-2.5 text-center font-mono font-black text-emerald-800 bg-emerald-50/60 border-l border-emerald-200">
                          {row.sold}
                        </td>
                      </tr>

                      {/* Sub-rows for Multi-Layer FIFO Batches (when toggled on) */}
                      {showBatchDetails &&
                        hasMultipleLayers &&
                        row.layers.map((layer, lIdx) => (
                          <tr key={`${row.id}-batch-${lIdx}`} className="bg-slate-50/80 hover:bg-slate-100/70 transition-colors text-[11px]">
                            {/* Empty No */}
                            <td className="py-1.5 px-2 border-r border-slate-200 sticky left-0 z-20 bg-slate-50 text-center font-mono text-[10px] text-slate-400">
                              •
                            </td>

                            {/* Batch Title */}
                            <td className="py-1.5 px-3 border-r border-slate-200 sticky left-[44px] z-20 bg-slate-50">
                              <div className="pl-3 flex items-center gap-1.5">
                                <span className="font-semibold text-indigo-700">↳ Batch #{lIdx + 1}</span>
                                {layer.batch_id && (
                                  <span className="text-[10px] text-slate-400 font-mono bg-slate-200/60 px-1 py-0.2 rounded">
                                    ID: {layer.batch_id}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Empty size & ring */}
                            <td className="py-1.5 px-2 border-r border-slate-200 sticky left-[284px] z-20 bg-slate-50 text-center text-slate-400 font-mono">
                              -
                            </td>
                            <td className="py-1.5 px-2 border-r-2 border-slate-300 shadow-[3px_0_6px_-1px_rgba(0,0,0,0.06)] sticky left-[374px] z-20 bg-slate-50 text-center text-slate-400 font-mono">
                              -
                            </td>

                            {/* Layer Cost (Editable) */}
                            <td
                              onClick={() =>
                                setActiveModal({
                                  isOpen: true,
                                  row,
                                  field: 'batch_cost',
                                  batchId: layer.batch_id,
                                })
                              }
                              className="py-1.5 px-2.5 text-right font-mono font-bold text-amber-800 border-r border-slate-200 bg-slate-50 cursor-pointer hover:bg-amber-100/60 transition-colors group/layercost"
                              title="Klik untuk koreksi modal batch ini"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span className="border-b border-dashed border-amber-400/80">{formatNumber(layer.batch_cost)}</span>
                                <Edit2 className="w-2.5 h-2.5 text-amber-500 opacity-0 group-hover/layercost:opacity-100 transition-opacity" />
                              </div>
                            </td>

                            {/* Empty price */}
                            <td className="py-1.5 px-2.5 border-r border-slate-200 bg-slate-50 text-center font-mono text-slate-400">
                              -
                            </td>

                            {/* Layer Opening Qty */}
                            <td className="py-1.5 px-2 text-center font-mono text-slate-600 border-r border-slate-200 bg-slate-50 font-semibold">
                              {layer.initial_qty}
                            </td>

                            {/* Empty restock */}
                            <td className="py-1.5 px-2 text-center font-mono text-slate-400 border-r border-slate-200 bg-slate-50">
                              -
                            </td>

                            {/* Layer Remaining Qty */}
                            <td className="py-1.5 px-2 text-center border-r border-slate-200 bg-slate-50">
                              <span className="font-mono font-bold text-slate-700 bg-slate-200/80 px-1.5 py-0.5 rounded text-[10px]">
                                {layer.remaining_qty}
                              </span>
                            </td>

                            {/* Daily Sales */}
                            {dayColumns.map((day) => {
                              const q = layer.daily_sales[day] || 0;
                              return (
                                <td
                                  key={day}
                                  className={`py-1.5 px-1 text-center font-mono text-[10px] border-r border-slate-200 bg-slate-50 ${
                                    q > 0 ? 'text-emerald-800 font-bold bg-emerald-50' : 'text-slate-300'
                                  }`}
                                >
                                  {q > 0 ? q : ''}
                                </td>
                              );
                            })}

                            {/* Layer Sold */}
                            <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-600 border-l border-slate-200 bg-slate-50">
                              {layer.sold}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Table Footer: Totals */}
            <tfoot className="text-[11px] font-bold bg-slate-100 border-t-2 border-slate-300 sticky bottom-0 z-30">
              <tr>
                <td className="py-2.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200 sticky left-0 z-40 bg-slate-100">
                  ∑
                </td>
                <td className="py-2.5 px-3 font-extrabold text-slate-800 border-r border-slate-200 sticky left-[44px] z-40 bg-slate-100">
                  TOTAL KESELURUHAN ({displayRows.length} Produk)
                </td>
                <td className="py-2.5 px-2 text-center border-r border-slate-200 sticky left-[284px] z-40 bg-slate-100 text-slate-400">
                  -
                </td>
                <td className="py-2.5 px-2 text-center border-r-2 border-slate-300 shadow-[3px_0_6px_-1px_rgba(0,0,0,0.1)] sticky left-[374px] z-40 bg-slate-100 text-slate-400">
                  -
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-amber-900 border-r border-slate-200 bg-slate-100">
                  -
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-900 border-r border-slate-200 bg-slate-100">
                  -
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-extrabold text-indigo-950 border-r border-slate-200 bg-indigo-50/60">
                  {reportData?.summary?.total_opening || 0}
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-extrabold text-slate-800 border-r border-slate-200 bg-indigo-50/40">
                  +{reportData?.summary?.total_restock || 0}
                </td>
                <td className="py-2.5 px-2 text-center font-mono font-extrabold text-emerald-800 border-r border-slate-200 bg-emerald-50/60">
                  {reportData?.summary?.total_remaining || 0}
                </td>
                {dayColumns.map((day) => {
                  const dayTotal = displayRows.reduce((sum, r) => sum + (r.daily_sales[day] || 0), 0);
                  return (
                    <td
                      key={day}
                      className={`py-2.5 px-1 text-center font-mono text-[10px] border-r border-slate-200 ${
                        dayTotal > 0 ? 'bg-emerald-100 text-emerald-900 font-extrabold' : 'text-slate-400'
                      }`}
                    >
                      {dayTotal > 0 ? dayTotal : ''}
                    </td>
                  );
                })}
                <td className="py-2.5 px-2.5 text-center font-mono font-black text-emerald-900 bg-emerald-100 border-l border-emerald-300">
                  {reportData?.summary?.total_sold || 0}
                </td>
              </tr>
            </tfoot>
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
