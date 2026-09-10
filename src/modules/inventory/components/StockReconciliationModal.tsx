import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Download,
  Check,
  Info,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Database,
  PlusCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { formatRupiah } from '../../../shared/utils/formatters';
import {
  stockReconciliationApi,
  StagingData,
  StagingProduct,
  CommitResult
} from '../../../services/api/stockReconciliationApi';

interface StockReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessCommit: () => void;
}

export const StockReconciliationModal: React.FC<StockReconciliationModalProps> = ({
  isOpen,
  onClose,
  onSuccessCommit,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qtyColumn, setQtyColumn] = useState<'G' | 'H'>('H');
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [forceCommit, setForceCommit] = useState<boolean>(false);

  // Data State
  const [stagingData, setStagingData] = useState<StagingData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Table Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBrandTab, setActiveBrandTab] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'MATCHED' | 'NEW' | 'DIFF' | 'DIFF_COST' | 'DIFF_PRICE' | 'DIFF_STOCK' | 'DIFF_ANY' | 'IDENTICAL'
  >('ALL');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Bulk Update Selective Modal State (Paritas ProjectOmahBan)
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkUpdateCost, setBulkUpdateCost] = useState<boolean>(true);
  const [bulkUpdatePrice, setBulkUpdatePrice] = useState<boolean>(true);
  const [bulkUpdateStock, setBulkUpdateStock] = useState<boolean>(true);
  const [bulkReason, setBulkReason] = useState<string>('Pembaruan data stok dan harga dari Excel');
  const [isBulkUpdating, setIsBulkUpdating] = useState<boolean>(false);

  // Result Summary Modal
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);

  // Initial fetch of active staging if available
  useEffect(() => {
    if (isOpen) {
      loadExistingStaging();
    }
  }, [isOpen]);

  const loadExistingStaging = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await stockReconciliationApi.getStaging();
      if (res.success && res.data) {
        setStagingData(res.data);
      }
    } catch (err: any) {
      // It's normal if no staging file exists yet
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      processUpload(file, qtyColumn);
    }
  };

  const processUpload = async (file: File, col: 'G' | 'H') => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await stockReconciliationApi.uploadPreview(file, col);
      if (res.success && res.data) {
        setStagingData(res.data);
        setSuccessMessage(res.message);
        setSelectedKeys(new Set()); // Reset selections
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah dan memproses file Excel.');
    } finally {
      setIsLoading(false);
    }
  };

  // Brand list extracted from staging products
  const availableBrands = useMemo(() => {
    if (!stagingData?.products) return [];
    const brandsMap = new Map<string, number>();
    stagingData.products.forEach((p) => {
      const b = p.brand_name || 'Lainnya';
      brandsMap.set(b, (brandsMap.get(b) || 0) + 1);
    });
    return Array.from(brandsMap.entries()).map(([name, count]) => ({ name, count }));
  }, [stagingData]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    if (!stagingData?.products) return [];
    return stagingData.products.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchName = p.product_name.toLowerCase().includes(q);
        const matchCode = (p.product_code || '').toLowerCase().includes(q);
        const matchSize = (p.product_size || '').toLowerCase().includes(q);
        const matchRing = (p.ring || '').toLowerCase().includes(q);
        const matchBrand = p.brand_name.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchSize && !matchRing && !matchBrand) {
          return false;
        }
      }

      // Brand tab
      if (activeBrandTab !== 'ALL' && p.brand_name !== activeBrandTab) {
        return false;
      }

      // Status filter
      if (statusFilter === 'MATCHED' && !p.db_match) return false;
      if (statusFilter === 'NEW' && p.db_match) return false;
      if (statusFilter === 'DIFF' || statusFilter === 'DIFF_STOCK') {
        if (!p.db_match || p.db_match.diff === 0) return false;
      }
      if (statusFilter === 'DIFF_COST') {
        if (!p.db_match) return false;
        const dbCost = Number(p.db_match.cost) || 0;
        const exCost = Number(p.avg_cost) || 0;
        if (exCost <= 0 || dbCost <= 0 || exCost === dbCost) return false;
      }
      if (statusFilter === 'DIFF_PRICE') {
        if (!p.db_match) return false;
        const dbPrice = Number(p.db_match.price) || 0;
        const exPrice = Number(p.product_price) || 0;
        if (exPrice <= 0 || dbPrice <= 0 || exPrice === dbPrice) return false;
      }
      if (statusFilter === 'DIFF_ANY') {
        if (!p.db_match) return false;
        const dbCost = Number(p.db_match.cost) || 0;
        const exCost = Number(p.avg_cost) || 0;
        const dbPrice = Number(p.db_match.price) || 0;
        const exPrice = Number(p.product_price) || 0;
        const stockDiff = p.db_match.diff !== 0;
        const costDiff = exCost > 0 && dbCost > 0 && exCost !== dbCost;
        const priceDiff = exPrice > 0 && dbPrice > 0 && exPrice !== dbPrice;
        if (!stockDiff && !costDiff && !priceDiff) return false;
      }
      if (statusFilter === 'IDENTICAL') {
        if (!p.db_match) return false;
        const dbCost = Number(p.db_match.cost) || 0;
        const exCost = Number(p.avg_cost) || 0;
        const dbPrice = Number(p.db_match.price) || 0;
        const exPrice = Number(p.product_price) || 0;
        const stockDiff = p.db_match.diff !== 0;
        const costDiff = exCost > 0 && dbCost > 0 && exCost !== dbCost;
        const priceDiff = exPrice > 0 && dbPrice > 0 && exPrice !== dbPrice;
        if (stockDiff || costDiff || priceDiff) return false;
      }

      return true;
    });
  }, [stagingData, searchQuery, activeBrandTab, statusFilter]);

  // Quick Action: Pilih Semua Yang Beda (Paritas ProjectOmahBan)
  const handleSelectAllDifferent = () => {
    if (!stagingData?.products) return;
    const diffKeys = new Set<string>();
    stagingData.products.forEach((p) => {
      if (p.db_match) {
        const dbCost = Number(p.db_match.cost) || 0;
        const exCost = Number(p.avg_cost) || 0;
        const dbPrice = Number(p.db_match.price) || 0;
        const exPrice = Number(p.product_price) || 0;
        const stockDiff = p.db_match.diff !== 0;
        const costDiff = exCost > 0 && dbCost > 0 && exCost !== dbCost;
        const priceDiff = exPrice > 0 && dbPrice > 0 && exPrice !== dbPrice;
        if (stockDiff || costDiff || priceDiff) {
          diffKeys.add(p.match_key);
        }
      }
    });
    setSelectedKeys(diffKeys);
  };

  // Bulk update summary calculation
  const bulkSummary = useMemo(() => {
    if (!stagingData?.products || selectedKeys.size === 0) {
      return { total: 0, matched: 0, costDiffs: 0, priceDiffs: 0, stockDiffs: 0 };
    }
    let matched = 0;
    let costDiffs = 0;
    let priceDiffs = 0;
    let stockDiffs = 0;

    stagingData.products.forEach((p) => {
      if (selectedKeys.has(p.match_key) && p.db_match?.id) {
        matched++;
        const dbCost = Number(p.db_match.cost) || 0;
        const exCost = Number(p.avg_cost) || 0;
        const dbPrice = Number(p.db_match.price) || 0;
        const exPrice = Number(p.product_price) || 0;
        if (exCost > 0 && dbCost > 0 && exCost !== dbCost) costDiffs++;
        if (exPrice > 0 && dbPrice > 0 && exPrice !== dbPrice) priceDiffs++;
        if (p.db_match.diff !== 0) stockDiffs++;
      }
    });

    return {
      total: selectedKeys.size,
      matched,
      costDiffs,
      priceDiffs,
      stockDiffs,
    };
  }, [stagingData, selectedKeys]);

  // Bulk update execution
  const handleExecuteBulkUpdate = async () => {
    const reason = bulkReason.trim();
    if (reason.length < 3) {
      alert('Alasan perubahan wajib diisi minimal 3 karakter.');
      return;
    }
    if (!bulkUpdateCost && !bulkUpdatePrice && !bulkUpdateStock) {
      alert('Pilih minimal satu aspek yang ingin diperbarui (HPP, Harga, atau Stok).');
      return;
    }

    const itemsToUpdate = (stagingData?.products || [])
      .filter((p) => selectedKeys.has(p.match_key) && p.db_match?.id)
      .map((p) => ({
        product_id: p.db_match!.id,
        excel_cost: p.avg_cost,
        excel_price: p.product_price,
        excel_stock: p.total_stock,
        product_name: p.product_name,
        product_code: p.product_code,
        batches: p.batches,
      }));

    if (itemsToUpdate.length === 0) {
      alert('Tidak ada produk dengan padanan database (matched) yang dipilih.');
      return;
    }

    setIsBulkUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await stockReconciliationApi.bulkUpdate(itemsToUpdate, {
        update_cost: bulkUpdateCost,
        update_price: bulkUpdatePrice,
        update_stock: bulkUpdateStock,
        reason,
        branch_id: 3,
      });

      if (res.success) {
        setShowBulkModal(false);
        setSuccessMessage(res.message);
        setSelectedKeys(new Set());
        await loadExistingStaging();
        onSuccessCommit();
      } else {
        setErrorMessage(res.message || 'Gagal melakukan pembaruan massal');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat memproses update massal.');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Select all / Toggle selection
  const handleToggleSelectAll = () => {
    if (selectedKeys.size === filteredProducts.length) {
      setSelectedKeys(new Set());
    } else {
      const allKeys = new Set(filteredProducts.map((p) => p.match_key));
      setSelectedKeys(allKeys);
    }
  };

  const handleToggleSelectKey = (key: string) => {
    const next = new Set(selectedKeys);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setSelectedKeys(next);
  };

  // Resolution handlers for unresolved rows
  const handleResolveBrand = async (index: number, brandId: number) => {
    try {
      setIsLoading(true);
      const res = await stockReconciliationApi.resolveBrand(index, brandId);
      if (res.success && res.data) {
        setStagingData(res.data);
        setSuccessMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan alias merek.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleIgnoreUnresolved = async (index: number) => {
    try {
      setIsLoading(true);
      const res = await stockReconciliationApi.ignoreUnresolved(index);
      if (res.success && res.data) {
        setStagingData(res.data);
        setSuccessMessage('Baris tak terselesaikan telah diabaikan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengabaikan baris.');
    } finally {
      setIsLoading(false);
    }
  };

  // Commit handler
  const handleCommit = async () => {
    if (!period || !/^\d{4}-\d{2}$/.test(period)) {
      setErrorMessage('Format periode wajib YYYY-MM (misal: 2026-09).');
      return;
    }

    const hasUnresolved = (stagingData?.unresolved?.length || 0) > 0;
    if (hasUnresolved && !forceCommit) {
      setErrorMessage('Masih ada baris tak terselesaikan. Selesaikan atau centang opsi paksa (force).');
      return;
    }

    const selectedKeysArray: string[] | undefined = selectedKeys.size > 0 ? Array.from(selectedKeys) : undefined;

    const confirmMsg = selectedKeysArray
      ? `Anda akan menyinkronkan ${selectedKeysArray.length} SKU terpilih ke periode ${period}. Lanjutkan?`
      : `PERINGATAN SINKRONISASI PENUH: Seluruh produk toko untuk periode ${period} akan disinkronkan dengan Excel. Produk yang tidak ada di Excel akan dinolkan. Lanjutkan?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setIsCommitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await stockReconciliationApi.commit(period, selectedKeysArray, forceCommit);
      if (res.success && res.data) {
        setCommitResult(res.data);
        setSuccessMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal melakukan sinkronisasi stok ke database.');
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Sistem Upload & Rekonsiliasi Excel Produk Ban
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                  Paritas ProjectOmahBan
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Membaca file inventori multi-sheet (Bridgestone, Dunlop, GT, dll.), kalkulasi batch FIFO, & rekonsiliasi database.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={stockReconciliationApi.getTemplateDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Unduh Template</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar">
          {/* Top Controls: Upload Box, Qty Column & Period */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 rounded-xl bg-slate-50/90 border border-slate-200/80">
            {/* Upload Area */}
            <div className="lg:col-span-6 flex flex-col justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 bg-white shadow-xs"
              >
                <Upload className="w-6 h-6 text-blue-600 animate-bounce" />
                <div className="text-xs font-bold text-slate-800">
                  {selectedFile ? (
                    <span className="text-blue-700 font-black">{selectedFile.name}</span>
                  ) : (
                    <span>Klik untuk pilih berkas Excel (.xlsx, .xls) stok ban</span>
                  )}
                </div>
                <span className="text-[11px] text-slate-500">
                  Mendukung sheet Bridgestone, Dunlop, GT, Accelera, Delium, dll.
                </span>
              </div>
            </div>

            {/* Parsing Settings */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 self-center">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Sumber Kuantitas Stok
                </label>
                <select
                  value={qtyColumn}
                  onChange={(e) => {
                    const val = e.target.value as 'G' | 'H';
                    setQtyColumn(val);
                    if (selectedFile) {
                      processUpload(selectedFile, val);
                    }
                  }}
                  className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="H">Kolom H: Sisa Akhir Bulan (Bawaan Omah Ban)</option>
                  <option value="G">Kolom G: Stok Awal Bulan</option>
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Bawaan toko memakai Kolom H sebagai stok berjalan.
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Periode Tujuan (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="w-full text-xs font-bold rounded-lg border border-slate-300 bg-white p-2 text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Contoh: 2026-09 untuk opname awal September 2026.
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Perhatian: </strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          )}

          {successMessage && !commitResult && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Sukses: </strong>
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="text-xs font-bold">Membaca berkas Excel dan mencocokkan basis data...</span>
            </div>
          )}

          {/* If staging loaded, show KPI Cards, Unresolved, & Products Table */}
          {!isLoading && stagingData && (
            <>
              {/* Summary KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Produk</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">
                    {stagingData.stats.total_excel} <span className="text-xs text-slate-500 font-semibold">SKU</span>
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Stok Unit</span>
                  <span className="text-lg font-black text-blue-700 block mt-0.5">
                    {stagingData.stats.total_stock_excel} <span className="text-xs text-slate-500 font-semibold">Pcs</span>
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Cocok di Database</span>
                  <span className="text-lg font-black text-emerald-800 block mt-0.5">
                    {stagingData.stats.total_matched} <span className="text-xs text-emerald-600 font-semibold">SKU</span>
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-sky-200 bg-sky-50/40 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-sky-700 block">Produk Baru</span>
                  <span className="text-lg font-black text-sky-800 block mt-0.5">
                    {stagingData.stats.total_unmatched} <span className="text-xs text-sky-600 font-semibold">SKU</span>
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-amber-200 bg-amber-50/40 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-amber-700 block">Ada Selisih Stok</span>
                  <span className="text-lg font-black text-amber-800 block mt-0.5">
                    {stagingData.stats.total_surplus + stagingData.stats.total_deficit}{' '}
                    <span className="text-xs text-amber-600 font-semibold">SKU</span>
                  </span>
                </div>

                <div className={`p-3 rounded-xl border shadow-xs ${
                  stagingData.unresolved.length > 0 
                    ? 'bg-rose-50 border-rose-300 text-rose-900' 
                    : 'bg-white border-slate-200'
                }`}>
                  <span className="text-[10px] uppercase font-bold block">Unresolved</span>
                  <span className="text-lg font-black block mt-0.5">
                    {stagingData.unresolved.length}{' '}
                    <span className="text-xs font-semibold">Baris</span>
                  </span>
                </div>
              </div>

              {/* Unresolved Rows Resolution Box */}
              {stagingData.unresolved.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wide">
                        {stagingData.unresolved.length} Baris Membutuhkan Penanganan Manual (Gerbang Komit Terkunci)
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Baris berikut tidak dapat diidentifikasi otomatis karena merek belum terdaftar atau format nama tidak valid.
                        Pilih merek yang sesuai untuk mengajarkan alias permanen, atau abaikan baris ini.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {stagingData.unresolved.map((row, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-amber-200 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-700">
                            {row.sheet}!{row.row}
                          </span>
                          <span className="font-extrabold text-slate-900">{row.name}</span>
                          <span className="text-[11px] text-slate-500">
                            ({row.reason === 'brand_tidak_dikenal' ? 'Merek tidak dikenal' : row.reason}, Qty: {row.qty})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {row.reason === 'brand_tidak_dikenal' && (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                const brandId = Number(e.target.value);
                                if (brandId > 0) {
                                  handleResolveBrand(idx, brandId);
                                }
                              }}
                              className="text-xs font-bold rounded-lg border border-slate-300 p-1 bg-white text-slate-800 cursor-pointer"
                            >
                              <option value="" disabled>
                                + Ajarkan Merek...
                              </option>
                              <option value="2">Bridgestone</option>
                              <option value="8">Dunlop</option>
                              <option value="3">GT / Gajah Tunggal</option>
                              <option value="9">Accelera</option>
                              <option value="11">Hankook</option>
                              <option value="12">Delium</option>
                              <option value="10">Forceum</option>
                              <option value="4">Swallow</option>
                              <option value="7">Sliwer</option>
                              <option value="29">Laufenn</option>
                            </select>
                          )}

                          <button
                            type="button"
                            onClick={() => handleIgnoreUnresolved(idx)}
                            className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Abaikan Baris Ini
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Table Controls & Filter Bars */}
              <div className="space-y-3">
                {/* Brand Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveBrandTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeBrandTab === 'ALL'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>Semua Merek</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                      {stagingData.products.length}
                    </span>
                  </button>

                  {availableBrands.map((b) => (
                    <button
                      key={b.name}
                      type="button"
                      onClick={() => setActiveBrandTab(b.name)}
                      className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                        activeBrandTab === b.name
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{b.name}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700">
                        {b.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search & Status Filters */}
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama produk, ukuran, ring..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua ({stagingData.products.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('DIFF_ANY')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'DIFF_ANY' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Ada Selisih
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('DIFF_COST')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'DIFF_COST' ? 'bg-white text-violet-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Beda HPP
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('DIFF_PRICE')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'DIFF_PRICE' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Beda Harga
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('DIFF_STOCK')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'DIFF_STOCK' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Beda Stok
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('IDENTICAL')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'IDENTICAL' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Identik
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('NEW')}
                      className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                        statusFilter === 'NEW' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Produk Baru ({stagingData.stats.total_unmatched})
                    </button>
                  </div>
                </div>

                {/* Quick Selection Actions Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllDifferent}
                      className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pilih Semua Yang Beda</span>
                    </button>

                    {selectedKeys.size > 0 && (
                      <span className="text-slate-500 font-medium">
                        {selectedKeys.size} produk terpilih
                      </span>
                    )}
                  </div>

                  {selectedKeys.size > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowBulkModal(true)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Update Selektif Terpilih ({selectedKeys.size})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <div className="overflow-x-auto max-h-[380px] custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200 z-10">
                      <tr>
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={
                              filteredProducts.length > 0 &&
                              selectedKeys.size === filteredProducts.length
                            }
                            onChange={handleToggleSelectAll}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Kode / Sheet</th>
                        <th className="p-3">Nama Produk Ban</th>
                        <th className="p-3">Ukuran & Ring</th>
                        <th className="p-3 text-right">Modal (HPP)</th>
                        <th className="p-3 text-right">Harga Jual</th>
                        <th className="p-3 text-center">Stok Excel</th>
                        <th className="p-3 text-center">Stok DB</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                            Tidak ada produk yang cocok dengan filter.
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => {
                          const isSelected = selectedKeys.has(p.match_key);
                          const dbQty = p.db_match ? p.db_match.qty : null;
                          const diff = p.db_match ? p.db_match.diff : null;

                          return (
                            <tr
                              key={p.match_key}
                              onClick={() => handleToggleSelectKey(p.match_key)}
                              className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                                isSelected ? 'bg-blue-50/70' : ''
                              }`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectKey(p.match_key)}
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                              </td>

                              <td className="p-3">
                                <span className="font-mono text-[11px] font-bold text-slate-800 block">
                                  {p.product_code || '-'}
                                </span>
                                <span className="text-[10px] text-slate-400 block uppercase">
                                  {p.sheet_name}
                                </span>
                              </td>

                              <td className="p-3">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900">{p.product_name}</span>
                                  {p.is_old_stock && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                      Stok Lama/Promo
                                    </span>
                                  )}
                                  {p.product_year && (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                      Th. {p.product_year}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                                  Merek: {p.brand_name}
                                </span>
                              </td>

                              <td className="p-3">
                                <span className="font-mono text-xs text-slate-800">
                                  {p.product_size || '-'} {p.ring ? `R${p.ring}` : ''}
                                </span>
                              </td>

                              <td className="p-3 text-right font-mono text-xs">
                                {p.avg_cost ? formatRupiah(p.avg_cost) : <span className="text-slate-400">-</span>}
                              </td>

                              <td className="p-3 text-right font-mono text-xs font-bold text-slate-900">
                                {p.product_price ? formatRupiah(p.product_price) : <span className="text-slate-400">-</span>}
                              </td>

                              <td className="p-3 text-center">
                                <span className="font-black text-sm text-blue-700 font-mono">
                                  {p.total_stock}
                                </span>
                              </td>

                              <td className="p-3 text-center font-mono text-xs">
                                {dbQty !== null ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <span>{dbQty}</span>
                                    {diff !== null && diff !== 0 && (
                                      <span
                                        className={`px-1 py-0.2 rounded text-[10px] font-bold ${
                                          diff > 0
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-rose-100 text-rose-700'
                                        }`}
                                      >
                                        {diff > 0 ? `+${diff}` : diff}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              <td className="p-3 text-center">
                                {p.db_match ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <Check className="w-3 h-3" />
                                    <span>Cocok DB</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-200">
                                    <PlusCircle className="w-3 h-3" />
                                    <span>SKU Baru</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer / Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={forceCommit}
                onChange={(e) => setForceCommit(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Paksa Komit (Abaikan baris tak terselesaikan jika ada)</span>
            </label>

            {selectedKeys.size > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold font-mono">
                {selectedKeys.size} SKU Terpilih
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
            >
              Batal
            </button>

            {selectedKeys.size > 0 && (
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <Layers className="w-4 h-4" />
                <span>Update Selektif ({selectedKeys.size})</span>
              </button>
            )}

            <button
              type="button"
              disabled={
                !stagingData ||
                isCommitting ||
                (stagingData.unresolved.length > 0 && !forceCommit)
              }
              onClick={handleCommit}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-extrabold shadow-xs transition-all cursor-pointer ${
                !stagingData ||
                isCommitting ||
                (stagingData.unresolved.length > 0 && !forceCommit)
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:shadow-md'
              }`}
            >
              {isCommitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyinkronkan ke Database...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>
                    {selectedKeys.size > 0
                      ? `Sinkronkan ${selectedKeys.size} SKU Terpilih`
                      : 'Sinkronkan Semua ke Database'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Update Selective Modal Dialog (Paritas ProjectOmahBan) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Update Selektif Produk Terpilih
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pembaruan aman tanpa rewrite database toko.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary badges */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Terpilih</span>
                <span className="text-sm font-black text-slate-800">{bulkSummary.total} SKU</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">Cocok di DB</span>
                <span className="text-sm font-black text-emerald-700">{bulkSummary.matched} SKU</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 block">Beda Stok/Harga</span>
                <span className="text-sm font-black text-indigo-700">
                  {bulkSummary.stockDiffs + bulkSummary.priceDiffs + bulkSummary.costDiffs}
                </span>
              </div>
            </div>

            {bulkSummary.matched === 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>Semua produk yang dipilih berstatus Produk Baru. Gunakan tombol "Sinkronkan ke Database" untuk mendaftarkan produk baru.</span>
              </div>
            )}

            {/* Checkbox Options */}
            <div className="space-y-2.5 bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <label className="text-[11px] font-bold uppercase text-slate-500 block mb-1">
                Pilih Aspek yang Ingin Diperbarui:
              </label>

              <label className="flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdateCost}
                  onChange={(e) => setBulkUpdateCost(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Perbarui Modal / HPP (<span className="font-mono text-slate-500">{bulkSummary.costDiffs} selisih</span>)</span>
              </label>

              <label className="flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdatePrice}
                  onChange={(e) => setBulkUpdatePrice(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Perbarui Harga Jual (<span className="font-mono text-slate-500">{bulkSummary.priceDiffs} selisih</span>)</span>
              </label>

              <label className="flex items-center gap-2.5 font-semibold text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bulkUpdateStock}
                  onChange={(e) => setBulkUpdateStock(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span>Perbarui Stok Fisik & Batch FIFO (<span className="font-mono text-slate-500">{bulkSummary.stockDiffs} selisih</span>)</span>
              </label>
            </div>

            {/* Reason Textarea */}
            <div className="space-y-1 text-xs">
              <label className="font-bold text-slate-700 block">
                Alasan / Keterangan Perubahan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="Contoh: Penyesuaian stok dan kenaikan harga distributor..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <span className="text-[10px] text-slate-400">Minimal 3 karakter untuk audit trail.</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkUpdating || bulkSummary.matched === 0}
                onClick={handleExecuteBulkUpdate}
                className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-xs transition-all flex items-center gap-1.5 ${
                  isBulkUpdating || bulkSummary.matched === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {isBulkUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Terapkan Update ({bulkSummary.matched} SKU)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Breakdown Dialog */}
      {commitResult && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Sinkronisasi Stok Berhasil!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data inventori produk ban dan kartu stok berhasil disinkronkan ke database Omah Ban.
              </p>
            </div>

            <div className="divide-y divide-slate-100 bg-slate-50 rounded-xl p-3 text-xs">
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Produk Baru Ditambahkan</span>
                <span className="font-bold text-slate-900 font-mono">+{commitResult.created}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Produk Diperbarui</span>
                <span className="font-bold text-blue-700 font-mono">{commitResult.updated}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Produk Absen Dinolkan</span>
                <span className="font-bold text-amber-700 font-mono">{commitResult.zeroed}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Batch FIFO Dibuat</span>
                <span className="font-bold text-emerald-700 font-mono">+{commitResult.batches_created}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Kartu Stok Mutasi Dicatat</span>
                <span className="font-bold text-slate-900 font-mono">{commitResult.movements}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Audit Harga Dicatat</span>
                <span className="font-bold text-slate-900 font-mono">{commitResult.price_audits}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-100 p-2 rounded-lg truncate font-mono">
              Rollback Snapshot: {commitResult.snapshot_path}
            </div>

            <button
              type="button"
              onClick={() => {
                setCommitResult(null);
                onClose();
                onSuccessCommit();
              }}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Tutup & Segarkan Katalog Produk
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
