import React, { useState } from 'react';
import { 
  History, 
  X, 
  PlusCircle, 
  ArrowDownLeft, 
  ArrowUpRight, 
  SlidersHorizontal, 
  Search, 
  Package, 
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { StockMutation, TireProduct } from '../../../shared/types';
import { formatDateIndo, formatDateTimeIndo, formatRupiah } from '../../../shared/utils/formatters';
import { ProductFifoBatchList } from './ProductFifoBatchList';

interface StockCardDrawerProps {
  product: TireProduct | null;
  mutations: StockMutation[];
  onClose: () => void;
  onOpenRestock?: (product: TireProduct) => void;
}

export const StockCardDrawer: React.FC<StockCardDrawerProps> = ({
  product,
  mutations,
  onClose,
  onOpenRestock,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MASUK' | 'KELUAR' | 'PENYESUAIAN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!product) return null;

  // Filter mutations for this product
  const productMutations = mutations.filter((m) => m.tire_id === product.id || m.product_id === product.id);

  const filteredMutations = productMutations.filter((m) => {
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = 
      !q || 
      (m.ref_doc && m.ref_doc.toLowerCase().includes(q)) ||
      (m.notes && m.notes.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      (m.operator && m.operator.toLowerCase().includes(q));

    return matchesType && matchesQuery;
  });

  const totalMasuk = productMutations
    .filter((m) => m.type === 'MASUK')
    .reduce((acc, m) => acc + m.qty, 0);

  const totalKeluar = productMutations
    .filter((m) => m.type === 'KELUAR')
    .reduce((acc, m) => acc + m.qty, 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  Kartu Stok: {product.name || product.product_name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono">
                  {product.product_code || 'SKU'}
                </span>
                {product.is_active === false && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                    Nonaktif
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Ukuran: <strong className="text-slate-800 font-mono">{product.product_size}</strong></span>
                <span>Barcode: <strong className="text-slate-800 font-mono">{product.barcode}</strong></span>
                <span>Saldo Gudang: <strong className="text-emerald-700 font-mono">{product.stock} pcs</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenRestock && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRestock(product);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Restock Ban Ini</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar space-y-4">
          {/* Quick Summary Pill Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-emerald-700 font-semibold block">Total Mutasi Masuk</span>
                <span className="text-lg font-black text-emerald-900 font-mono">+{totalMasuk} pcs</span>
              </div>
              <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="bg-rose-50 border border-rose-200/80 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-rose-700 font-semibold block">Total Mutasi Terjual</span>
                <span className="text-lg font-black text-rose-900 font-mono">-{totalKeluar} pcs</span>
              </div>
              <ArrowUpRight className="w-5 h-5 text-rose-600" />
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-600 font-semibold block">Saldo Fisik Berjalan</span>
                <span className="text-lg font-black text-slate-900 font-mono">{product.stock} pcs</span>
              </div>
              <Package className="w-5 h-5 text-slate-500" />
            </div>
          </div>

          {/* FIFO Layers Section */}
          <ProductFifoBatchList batches={product.batches} productName={product.name} />

          {/* Filter & Search Bar for Mutations */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              <span className="text-slate-400 text-[11px] mr-1">Tipe Mutasi:</span>
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Semua ({productMutations.length})
              </button>
              <button
                onClick={() => setTypeFilter('MASUK')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'MASUK'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                Masuk ({productMutations.filter((m) => m.type === 'MASUK').length})
              </button>
              <button
                onClick={() => setTypeFilter('KELUAR')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'KELUAR'
                    ? 'bg-rose-600 text-white'
                    : 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50'
                }`}
              >
                Keluar ({productMutations.filter((m) => m.type === 'KELUAR').length})
              </button>
              <button
                onClick={() => setTypeFilter('PENYESUAIAN')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  typeFilter === 'PENYESUAIAN'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-50'
                }`}
              >
                Opname ({productMutations.filter((m) => m.type === 'PENYESUAIAN').length})
              </button>
            </div>

            <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no. dokumen, keterangan..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Mutations Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Waktu & Tanggal</th>
                    <th className="py-2.5 px-3">No. Dokumen Ref</th>
                    <th className="py-2.5 px-3">Tipe</th>
                    <th className="py-2.5 px-3 text-center">Perubahan</th>
                    <th className="py-2.5 px-3 text-center">Saldo Berjalan</th>
                    <th className="py-2.5 px-3">Keterangan & Petugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredMutations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada riwayat mutasi yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMutations.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                          {formatDateTimeIndo(m.date) || m.date}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                          {m.ref_doc}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.type === 'MASUK'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : m.type === 'KELUAR'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {m.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-xs">
                          {m.type === 'MASUK' ? (
                            <span className="text-emerald-600">+{m.qty}</span>
                          ) : m.type === 'KELUAR' ? (
                            <span className="text-rose-600">-{m.qty}</span>
                          ) : (
                            <span className="text-amber-600">Δ {m.qty}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900 text-xs">
                          {m.balance} pcs
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          <div>{m.notes || m.description}</div>
                          <span className="text-[10px] text-slate-400 font-mono">By: {m.operator}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition-colors"
          >
            Tutup Kartu Stok
          </button>
        </div>
      </div>
    </div>
  );
};
