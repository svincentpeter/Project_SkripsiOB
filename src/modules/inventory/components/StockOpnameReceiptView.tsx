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
  Boxes
} from 'lucide-react';
import { ProductItem, StockMutation } from '../../../shared/types';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface StockOpnameReceiptViewProps {
  mutations: StockMutation[];
  products: ProductItem[];
  onOpenRestock: () => void;
  onOpenOpname: () => void;
}

export const StockOpnameReceiptView: React.FC<StockOpnameReceiptViewProps> = ({
  mutations,
  products,
  onOpenRestock,
  onOpenOpname,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT' | 'ADJUSTMENT'>('ALL');

  const filteredMutations = mutations.filter((m) => {
    const matchesType =
      typeFilter === 'ALL' ||
      (typeFilter === 'IN' && m.type === 'IN') ||
      (typeFilter === 'OUT' && m.type === 'OUT') ||
      (typeFilter === 'ADJUSTMENT' && m.type === 'ADJUSTMENT');

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.product_name.toLowerCase().includes(q) ||
      m.reference_number.toLowerCase().includes(q) ||
      (m.notes && m.notes.toLowerCase().includes(q));

    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Sub-Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Operasional Stok & Mutasi FIFO</h2>
            <p className="text-xs text-slate-500">
              Penerimaan barang dari supplier, stock opname fisik gudang, dan riwayat mutasi kartu stok.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ExportMenu reportId="goods_receipts" data={mutations} ctx={{ periodLabel: 'Seluruh Riwayat Mutasi' }} />
          <button
            onClick={onOpenRestock}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Truck className="w-4 h-4" />
            <span>Penerimaan Barang</span>
          </button>
          <button
            onClick={onOpenOpname}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Stock Opname</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari produk atau no referensi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold w-full sm:w-auto justify-between">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'ALL' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Mutasi ({mutations.length})
          </button>
          <button
            onClick={() => setTypeFilter('IN')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'IN' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Masuk ({mutations.filter((m) => m.type === 'IN').length})
          </button>
          <button
            onClick={() => setTypeFilter('OUT')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'OUT' ? 'bg-white text-rose-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Keluar ({mutations.filter((m) => m.type === 'OUT').length})
          </button>
          <button
            onClick={() => setTypeFilter('ADJUSTMENT')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'ADJUSTMENT' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Penyesuaian ({mutations.filter((m) => m.type === 'ADJUSTMENT').length})
          </button>
        </div>
      </div>

      {/* Mutations Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
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
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMutations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="max-w-sm mx-auto space-y-2">
                      <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">Tidak ada riwayat mutasi stok</p>
                      <p className="text-xs text-slate-400">
                        {searchQuery ? 'Coba ubah filter atau kata kunci pencarian.' : 'Riwayat penerimaan barang dan opname akan muncul di sini.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMutations.map((mut, idx) => (
                  <tr key={mut.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-xs whitespace-nowrap">
                      {new Date(mut.created_at).toLocaleString('id-ID', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {mut.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>Masuk</span>
                        </span>
                      ) : mut.type === 'OUT' ? (
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
                    <td className="py-3 px-4 font-bold text-slate-900">{mut.product_name}</td>
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{mut.reference_number}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold">
                      <span className={mut.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'}>
                        {mut.type === 'IN' ? `+${mut.quantity}` : `-${mut.quantity}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">{mut.ending_stock} Unit</td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">{mut.notes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
