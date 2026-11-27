import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  UserCheck,
  Receipt,
  TrendingUp,
  Edit3,
  X,
  Eye,
  Bell,
} from 'lucide-react';
import { PriceAuditItem, PriceAuditSummary } from '../../../shared/types';
import { priceAuditApi } from '../../../services/api';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import {
  calculateMarkupPercent,
  getMinSellingPrice,
  getRecommendedPriceByMarkup,
} from '../../../shared/utils/pricingStandard';
import { MarkupPercentStepper, TablePagination, usePagination, useToast } from '../../../shared/components';

interface PriceAuditLogViewProps {
  canManageCatalog?: boolean;
  onCatalogPriceUpdated?: () => void;
}

const DEFAULT_SUMMARY: PriceAuditSummary = {
  total_logs: 0,
  cashier_total_count: 0,
  initial_price_count: 0,
  reimburse_override_count: 0,
  unread_owner_count: 0,
  unreviewed_owner_count: 0,
};

export const PriceAuditLogView: React.FC<PriceAuditLogViewProps> = ({
  canManageCatalog = true,
  onCatalogPriceUpdated,
}) => {
  const toast = useToast();
  const [items, setItems] = useState<PriceAuditItem[]>([]);
  const [summary, setSummary] = useState<PriceAuditSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [filterMode, setFilterMode] = useState<
    'ALL' | 'KASIR_ONLY' | 'INITIAL_PRICE' | 'REIMBURSE' | 'RESTOCK_WARN' | 'UNREVIEWED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [reviewingItem, setReviewingItem] = useState<PriceAuditItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [adjustCatalogPrice, setAdjustCatalogPrice] = useState<boolean>(false);
  const [newCatalogPrice, setNewCatalogPrice] = useState<number>(0);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, any> = { limit: 200 };
      if (filterMode === 'KASIR_ONLY') params.actor_role = 'KASIR';
      if (filterMode === 'INITIAL_PRICE') params.change_source = 'pos_cashier_initial';
      if (filterMode === 'REIMBURSE') params.change_source = 'pos_cashier_override';
      if (filterMode === 'RESTOCK_WARN') params.change_source = 'goods_receipt_margin_warning';
      if (filterMode === 'UNREVIEWED') params.unreviewed_only = true;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await priceAuditApi.list(params);
      setItems(res.items || []);
      setSummary(res.summary || DEFAULT_SUMMARY);
    } catch (err) {
      toast.error('Gagal Memuat Audit Log', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setIsLoading(false);
    }
  }, [filterMode, debouncedSearch, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const auditPagination = usePagination(items, 10, [filterMode, debouncedSearch]);

  const handleMarkAllRead = async () => {
    try {
      await priceAuditApi.markRead();
      toast.success('Notifikasi Dibaca', 'Semua notifikasi penentuan/perubahan harga telah ditandai sudah dibaca.');
      fetchLogs();
      onCatalogPriceUpdated?.();
    } catch (err) {
      toast.error('Gagal', err instanceof Error ? err.message : 'Gagal memperbarui status baca.');
    }
  };

  const openReviewModal = (item: PriceAuditItem) => {
    setReviewingItem(item);
    setReviewNotes(item.review_notes || 'Disetujui oleh Owner');
    const minP = item.min_allowed_price || getMinSellingPrice(item.reference_hpp);
    const currentCat = item.current_catalog_price || item.new_price || minP;
    setNewCatalogPrice(currentCat >= minP ? currentCat : getRecommendedPriceByMarkup(item.reference_hpp, 15));
    setAdjustCatalogPrice(item.change_source === 'goods_receipt_margin_warning');
  };

  const handleConfirmReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingItem || isSubmittingReview) return;

    const minP = reviewingItem.min_allowed_price || getMinSellingPrice(reviewingItem.reference_hpp);
    if (adjustCatalogPrice && reviewingItem.reference_hpp > 0 && newCatalogPrice + 0.01 < minP) {
      toast.warning(
        'Di Bawah Standar +15%',
        `Harga jual katalog minimal harus +15% dari HPP (${formatRupiah(minP)}).`
      );
      return;
    }

    setIsSubmittingReview(true);
    try {
      await priceAuditApi.review(reviewingItem.id, {
        review_notes: reviewNotes.trim() || 'Ditinjau & disetujui oleh Owner',
        new_catalog_price: adjustCatalogPrice ? newCatalogPrice : undefined,
      });
      toast.success(
        'Tinjauan Owner Tersimpan',
        adjustCatalogPrice
          ? `Log ditinjau dan harga katalog ${reviewingItem.product_name} diperbarui menjadi ${formatRupiah(newCatalogPrice)}.`
          : `Log perubahan harga ${reviewingItem.product_name} telah ditandai selesai ditinjau.`
      );
      setReviewingItem(null);
      fetchLogs();
      onCatalogPriceUpdated?.();
    } catch (err) {
      toast.error('Gagal Menyimpan Tinjauan', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const formatAuditTimestamp = (iso?: string | null) => {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const getSourceBadge = (item: PriceAuditItem) => {
    if (item.change_source === 'pos_cashier_initial') {
      return {
        label: 'Darurat Kasir (Katalog Rp 0)',
        cls: 'bg-amber-50 text-amber-800 border border-amber-300',
      };
    }
    if (item.change_source === 'pos_cashier_override') {
      return {
        label: 'Ubah Harga Nota (Reimburse)',
        cls: 'bg-blue-50 text-blue-800 border border-blue-200',
      };
    }
    if (item.change_source === 'goods_receipt_margin_warning') {
      return {
        label: 'Peringatan HPP Batch Baru',
        cls: 'bg-rose-50 text-rose-800 border border-rose-300',
      };
    }
    if (item.change_source === 'goods_receipt_restock') {
      return {
        label: 'Update Harga Saat Restock',
        cls: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      };
    }
    if (item.change_source === 'owner_review_adjustment') {
      return {
        label: 'Koreksi Tinjauan Owner',
        cls: 'bg-blue-50 text-blue-800 border border-blue-200',
      };
    }
    return {
      label: 'Update Master Katalog',
      cls: 'bg-slate-100 text-slate-700 border border-slate-200',
    };
  };

  return (
    <div className="space-y-4">
      {/* Header & Ringkasan Notifikasi Audit Harga Owner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Pengendalian Internal Harga Jual (Min. +15% HPP) • Audit Log &amp; Notifikasi Owner</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">
              Audit Log Penentuan &amp; Perubahan Harga Jual (Kasir &amp; Batch FIFO)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Memantau seluruh penentuan harga darurat oleh Role Kasir (saat harga katalog Rp 0), kenaikan harga nota atas permintaan reimburse pembeli, serta fluktuasi HPP antar-batch.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {summary.unread_owner_count > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Bell className="w-3.5 h-3.5 text-amber-700" />
                <span>Tandai Semua Dibaca ({summary.unread_owner_count})</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchLogs}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            onClick={() => setFilterMode('UNREVIEWED')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filterMode === 'UNREVIEWED'
                ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-500/20'
                : 'bg-rose-50/40 border-rose-200 hover:bg-rose-50'
            }`}
          >
            <span className="text-[11px] font-bold text-rose-700 uppercase block">
              Menunggu Tinjauan Owner
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-2xl font-black text-rose-800 font-mono">
                {summary.unreviewed_owner_count}
              </strong>
              <span className="text-[11px] font-semibold text-rose-600">Perlu dicek Owner</span>
            </div>
          </div>

          <div
            onClick={() => setFilterMode('INITIAL_PRICE')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filterMode === 'INITIAL_PRICE'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/20'
                : 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
            }`}
          >
            <span className="text-[11px] font-bold text-amber-800 uppercase block">
              Penentuan Harga Darurat (Rp 0)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-2xl font-black text-amber-900 font-mono">
                {summary.initial_price_count}
              </strong>
              <span className="text-[11px] font-semibold text-amber-700">Diset Kasir (Min +15%)</span>
            </div>
          </div>

          <div
            onClick={() => setFilterMode('REIMBURSE')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filterMode === 'REIMBURSE'
                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500/20'
                : 'bg-blue-50/40 border-blue-200 hover:bg-blue-50'
            }`}
          >
            <span className="text-[11px] font-bold text-blue-800 uppercase block">
              Ubah Harga Nota (Reimburse)
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-2xl font-black text-blue-900 font-mono">
                {summary.reimburse_override_count}
              </strong>
              <span className="text-[11px] font-semibold text-blue-700">Khusus Nota Transaksi</span>
            </div>
          </div>

          <div
            onClick={() => setFilterMode('ALL')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filterMode === 'ALL'
                ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[11px] font-bold text-slate-600 uppercase block">
              Total Riwayat Audit Harga
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <strong className="text-2xl font-black text-slate-900 font-mono">
                {summary.total_logs}
              </strong>
              <span className="text-[11px] font-semibold text-slate-500">
                {summary.cashier_total_count} oleh Role Kasir
              </span>
            </div>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Semua Log' },
              { id: 'KASIR_ONLY', label: 'Khusus Role Kasir' },
              { id: 'INITIAL_PRICE', label: 'Darurat Harga Kosong (Rp 0)' },
              { id: 'REIMBURSE', label: 'Naik Harga Nota (Reimburse)' },
              { id: 'RESTOCK_WARN', label: 'Peringatan HPP Batch Baru' },
              { id: 'UNREVIEWED', label: 'Belum Ditinjau Owner' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kasir, produk, nota, atau alasan..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Tabel Audit Log Lengkap */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Waktu &amp; Nota</th>
                <th className="py-3 px-4">Identitas Pelaku</th>
                <th className="py-3 px-4">Produk Ban / Barang</th>
                <th className="py-3 px-4 text-right">HPP Patokan</th>
                <th className="py-3 px-4 text-right">Harga Awal → Baru</th>
                <th className="py-3 px-4">Keuntungan &amp; Ruang Lingkup</th>
                <th className="py-3 px-4">Alasan Penentuan / Perubahan</th>
                <th className="py-3 px-4 text-center">Status Tinjauan Owner</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShieldCheck className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-[1.5]" />
                    <p className="font-bold text-slate-700">Belum Ada Catatan Audit Harga</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Setiap penentuan harga jual darurat atau kenaikan harga nota oleh Kasir akan langsung muncul di sini.
                    </p>
                  </td>
                </tr>
              ) : (
                auditPagination.pageItems.map((item) => {
                  const badge = getSourceBadge(item);
                  const isUnreviewed = !item.is_reviewed_by_owner;
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !item.is_read_by_owner ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatAuditTimestamp(item.created_at)}</div>
                        {item.sale_reference ? (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono text-[10.5px] font-bold">
                            <Receipt className="w-3 h-3" />
                            <span>{item.sale_reference}</span>
                          </div>
                        ) : (
                          <span className="text-[10.5px] text-slate-400 block mt-0.5">Master / Gudang</span>
                        )}
                        {item.customer_name && (
                          <div className="text-[10.5px] text-slate-500 mt-0.5">
                            {item.customer_name} {item.vehicle_plate ? `(${item.vehicle_plate})` : ''}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>{item.actor_name}</span>
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            item.actor_role === 'KASIR'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.actor_role === 'GUDANG'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          Role: {item.actor_role}
                        </span>
                      </td>

                      <td className="py-3 px-4 align-top">
                        <div className="font-bold text-slate-900">{item.product_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {[item.product_code, item.brand, item.product_size || item.ring].filter(Boolean).join(' • ')}
                        </div>
                        <div className="text-[10.5px] text-slate-500 mt-0.5">
                          Harga Katalog Saat Ini:{' '}
                          <strong className="font-mono text-slate-800">
                            {formatRupiah(item.current_catalog_price)}
                          </strong>
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap font-mono">
                        <div className="font-bold text-slate-800">{formatRupiah(item.reference_hpp)}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Min. +15%: {formatRupiah(item.min_allowed_price)}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top text-right whitespace-nowrap font-mono">
                        <div className="text-[11px] text-slate-400 line-through">
                          {item.old_price > 0 ? formatRupiah(item.old_price) : 'Rp 0 (Kosong)'}
                        </div>
                        <div className="text-sm font-black text-emerald-700">
                          {formatRupiah(item.new_price)}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-extrabold ${
                              item.markup_percent < 15
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {item.markup_percent >= 0 ? `+${item.markup_percent}%` : `${item.markup_percent}%`} (
                            {formatRupiah(item.profit_per_unit)}/unit)
                          </span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {item.applies_to === 'CATALOG_AND_NOTA'
                            ? 'Berlaku: Katalog Sementara & Nota'
                            : item.applies_to === 'NOTA_ONLY'
                            ? 'Berlaku: Khusus Nota Ini Saja'
                            : 'Berlaku: Master Katalog'}
                        </div>
                      </td>

                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-medium leading-relaxed">
                          &ldquo;{item.reason || '-'}&rdquo;
                        </div>
                        {item.review_notes && (
                          <div className="text-[10.5px] text-blue-700 font-semibold mt-1">
                            Catatan Owner: {item.review_notes}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 align-top text-center whitespace-nowrap">
                        {isUnreviewed ? (
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Perlu Tinjauan</span>
                            </span>
                            {canManageCatalog && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => openReviewModal(item)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Tinjau / Koreksi</span>
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sudah Ditinjau</span>
                            </span>
                            {item.reviewed_by_name && (
                              <div className="text-[10px] text-slate-400">oleh {item.reviewed_by_name}</div>
                            )}
                            {canManageCatalog && (
                              <button
                                type="button"
                                onClick={() => openReviewModal(item)}
                                className="text-[10.5px] text-blue-600 hover:underline font-bold block mx-auto cursor-pointer"
                              >
                                Ubah Harga Katalog
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3 bg-white">
          <TablePagination
            page={auditPagination.page}
            pageSize={auditPagination.pageSize}
            totalItems={items.length}
            itemLabel="catatan audit"
            onPageChange={auditPagination.setPage}
            onPageSizeChange={auditPagination.setPageSize}
          />
        </div>
      </div>

      {/* Modal Tinjauan & Koreksi Harga Katalog oleh Owner */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Tinjauan Owner — Penentuan / Perubahan Harga
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{reviewingItem.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReview} className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelaku &amp; Role:</span>
                  <strong className="text-slate-900">
                    {reviewingItem.actor_name} ({reviewingItem.actor_role})
                  </strong>
                </div>
                {reviewingItem.sale_reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nomor Nota POS:</span>
                    <strong className="font-mono text-blue-700">{reviewingItem.sale_reference}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">HPP Patokan (Modal FIFO Tertinggi):</span>
                  <strong className="font-mono text-slate-900">{formatRupiah(reviewingItem.reference_hpp)}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Standar Harga Minimal (+15%):</span>
                  <strong className="font-mono text-emerald-700">
                    {formatRupiah(reviewingItem.min_allowed_price)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Harga yang Diinput Kasir:</span>
                  <strong className="font-mono text-slate-900">
                    {formatRupiah(reviewingItem.new_price)} (+{reviewingItem.markup_percent}%)
                  </strong>
                </div>
                <div className="pt-1 border-t border-slate-200">
                  <span className="text-slate-500 block mb-0.5">Alasan Kasir:</span>
                  <p className="font-semibold text-slate-800">&ldquo;{reviewingItem.reason}&rdquo;</p>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adjustCatalogPrice}
                  onChange={(e) => setAdjustCatalogPrice(e.target.checked)}
                  className="w-4 h-4 rounded-sm border-slate-300 text-blue-600"
                />
                <span className="font-bold text-slate-800">
                  Sekaligus Sesuaikan Harga Jual Master Katalog Produk Ini
                </span>
              </label>

              {adjustCatalogPrice && (
                <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Harga Jual Master Katalog Baru (Rp)</label>
                    <span className="font-mono font-bold text-emerald-700">
                      Margin: +{calculateMarkupPercent(newCatalogPrice, reviewingItem.reference_hpp)}%
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formatRupiah(newCatalogPrice)}
                    onChange={(e) => setNewCatalogPrice(parseRupiahInput(e.target.value))}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-emerald-700 text-sm font-extrabold font-mono"
                  />
                  <MarkupPercentStepper
                    referenceHpp={reviewingItem.reference_hpp}
                    sellingPrice={newCatalogPrice}
                    onChangeSellingPrice={setNewCatalogPrice}
                    label="Atur Persentase Keuntungan Katalog (+/- Real-Time, Min. 15%):"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tinjauan Owner</label>
                <input
                  type="text"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Contoh: Disetujui / Harga katalog disesuaikan ke margin ban Jeep +35%"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{adjustCatalogPrice ? 'Simpan Tinjauan & Update Harga' : 'Tandai Selesai Ditinjau'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
