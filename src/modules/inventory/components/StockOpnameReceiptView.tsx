import React, { useState } from 'react';
import { 
  Truck, 
  ClipboardList, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Calendar, 
  Package, 
  Download,
  Boxes,
  RotateCcw
} from 'lucide-react';
import { ProductItem, StockMutation } from '../../../shared/types';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface StockOpnameReceiptViewProps {
  mutations: StockMutation[];
  products: ProductItem[];
  onOpenRestock?: () => void;
  onOpenOpname?: () => void;
}

export const StockOpnameReceiptView: React.FC<StockOpnameReceiptViewProps> = ({
  mutations,
  products,
  onOpenRestock,
  onOpenOpname,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MASUK' | 'KELUAR' | 'PENYESUAIAN'>('ALL');

  const filteredMutations = mutations.filter((m) => {
    const isMasuk = m.type === 'MASUK' || (m as any).type === 'IN';
    const isKeluar = m.type === 'KELUAR' || (m as any).type === 'OUT';
    const isOpname = m.type === 'PENYESUAIAN' || (m as any).type === 'ADJUSTMENT';

    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'MASUK' && isMasuk) ||
      (typeFilter === 'KELUAR' && isKeluar) ||
      (typeFilter === 'PENYESUAIAN' && isOpname);

    const q = searchQuery.toLowerCase().trim();
    const productName = (m.product_name || m.tire_name || '').toLowerCase();
    const refDoc = (m.ref_doc || (m as any).reference_number || '').toLowerCase();
    const notes = (m.notes || '').toLowerCase();
    const operator = (m.operator || '').toLowerCase();

    const matchesSearch =
      !q ||
      productName.includes(q) ||
      refDoc.includes(q) ||
      notes.includes(q) ||
      operator.includes(q);

    return matchesType && matchesSearch;
  });

  const countMasuk = mutations.filter((m) => m.type === 'MASUK' || (m as any).type === 'IN').length;
  const countKeluar = mutations.filter((m) => m.type === 'KELUAR' || (m as any).type === 'OUT').length;
  const countOpname = mutations.filter((m) => m.type === 'PENYESUAIAN' || (m as any).type === 'ADJUSTMENT').length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setTypeFilter('ALL');
  };

  return (
    <div className="w-full space-y-4 animate-in fade-in duration-200">
      {/* Main Unified Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Table Top Controls & Action CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-700" />
              <span>Operasional Stok & Mutasi FIFO</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Penerimaan barang dari supplier, stock opname fisik gudang, dan riwayat mutasi kartu stok berkelanjutan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu reportId="goods_receipts" data={mutations} ctx={{ periodLabel: 'Seluruh Riwayat Mutasi' }} />
            {onOpenRestock && (
            <button
              type="button"
              onClick={onOpenRestock}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Penerimaan Barang</span>
            </button>
            )}
            {onOpenOpname && (
            <button
              type="button"
              onClick={onOpenOpname}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Stock Opname</span>
            </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari produk, no ref, atau operator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full sm:w-auto justify-between gap-1">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'ALL' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Mutasi ({mutations.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('MASUK')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'MASUK' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk ({countMasuk})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('KELUAR')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'KELUAR' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Keluar ({countKeluar})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('PENYESUAIAN')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                typeFilter === 'PENYESUAIAN' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Penyesuaian ({countOpname})
            </button>
          </div>
        </div>

        {/* Mutations Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Tanggal & Jam</th>
                  <th className="py-3 px-4">Tipe Mutasi</th>
                  <th className="py-3 px-4">Nama Produk SKU</th>
                  <th className="py-3 px-4">No. Referensi / Batch</th>
                  <th className="py-3 px-4 text-center">Jumlah (Qty)</th>
                  <th className="py-3 px-4 text-center">Sisa Stok</th>
                  <th className="py-3 px-4">Keterangan & Petugas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMutations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <div className="max-w-sm mx-auto space-y-3">
                        <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">
                          {mutations.length === 0 ? 'Belum ada riwayat mutasi stok' : 'Tidak ada mutasi yang cocok dengan filter'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {mutations.length === 0 
                            ? 'Riwayat penerimaan barang, penjualan kasir, dan penyesuaian opname fisik akan tercatat di sini.' 
                            : 'Coba ubah kata kunci pencarian atau ganti filter kategori mutasi.'}
                        </p>
                        {(searchQuery || typeFilter !== 'ALL') && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Semua Filter</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredMutations.map((mut, idx) => {
                    const isMasuk = mut.type === 'MASUK' || (mut as any).type === 'IN';
                    const isKeluar = mut.type === 'KELUAR' || (mut as any).type === 'OUT';
                    const rawDate = mut.date || (mut as any).created_at;
                    const displayDate = rawDate
                      ? (rawDate.includes('T') || rawDate.includes(' ')
                          ? new Date(rawDate).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                          : rawDate)
                      : '-';
                    const qty = mut.qty ?? (mut as any).quantity ?? 0;
                    const balance = mut.balance ?? (mut as any).ending_stock ?? 0;
                    const refDoc = mut.ref_doc || (mut as any).reference_number || '-';
                    const prodName = mut.product_name || mut.tire_name || 'Item Produk';

                    return (
                      <tr key={mut.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                          {displayDate}
                        </td>
                        <td className="py-3 px-4">
                          {isMasuk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <ArrowDownLeft className="w-3 h-3" />
                              <span>Masuk</span>
                            </span>
                          ) : isKeluar ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
                              <ArrowUpRight className="w-3 h-3" />
                              <span>Keluar</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                              <RefreshCw className="w-3 h-3" />
                              <span>Opname</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{prodName}</div>
                          {mut.tire_size && <div className="text-[11px] font-mono text-slate-500">{mut.tire_size}</div>}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-700 font-semibold">{refDoc}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          <span className={isMasuk ? 'text-emerald-700' : isKeluar ? 'text-rose-700' : 'text-amber-700'}>
                            {isMasuk ? `+${qty}` : isKeluar ? `-${qty}` : `${qty}`}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-slate-800 font-semibold">{balance} Unit</td>
                        <td className="py-3 px-4 text-slate-600 max-w-xs">
                          <div className="truncate">{mut.notes || '-'}</div>
                          {mut.operator && (
                            <div className="text-[10px] text-slate-400 mt-0.5">Petugas: {mut.operator}</div>
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

        {/* Footer Summary Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <span>Menampilkan {filteredMutations.length} dari {mutations.length} riwayat mutasi stok</span>
          <span className="font-semibold">Pencatatan Berkelanjutan (Perpetual Inventory) • SAK EMKM</span>
        </div>
      </div>
    </div>
  );
};
