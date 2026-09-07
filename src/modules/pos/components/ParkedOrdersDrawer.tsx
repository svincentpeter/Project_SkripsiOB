import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  Car, 
  User, 
  Printer, 
  RotateCcw, 
  Trash2, 
  Search, 
  AlertCircle,
  CheckCircle2,
  Package,
  ArrowRight
} from 'lucide-react';
import { ParkedTransaction } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface ParkedOrdersDrawerProps {
  isOpen: boolean;
  parkedOrders: ParkedTransaction[];
  onClose: () => void;
  onResumeOrder: (order: ParkedTransaction) => void;
  onDeleteOrder: (orderId: string) => void;
  onPrintOrder: (order: ParkedTransaction) => void;
}

export const ParkedOrdersDrawer: React.FC<ParkedOrdersDrawerProps> = ({
  isOpen,
  onClose,
  parkedOrders,
  onResumeOrder,
  onDeleteOrder,
  onPrintOrder,
}) => {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const filteredOrders = parkedOrders.filter((order) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (order.vehicle_plate && order.vehicle_plate.toLowerCase().includes(q)) ||
      (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
      (order.reference && order.reference.toLowerCase().includes(q)) ||
      (order.vehicle_model && order.vehicle_model.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in">
      <div className="w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between">
        
        {/* Header Drawer */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900">
                  Antrian Transaksi Ditahan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                  {parkedOrders.length} Mobil
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Daftar nota yang sedang menunggu uang/pembayaran kantor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Filter Bar */}
        <div className="p-3 border-b border-slate-200 bg-white shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari Plat Mobil, Nama Pelanggan, atau Ref..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>
        </div>

        {/* List of Parked Orders */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar">
          {filteredOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">Tidak Ada Antrian Transaksi Ditahan</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                Jika pelanggan membawa nota fisik untuk dimintakan uang ke kantor, klik tombol &quot;Tahan Transaksi&quot; di kasir.
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const totalItemsCount = order.items.reduce((sum, it) => sum + it.qty, 0);

              return (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all space-y-3"
                >
                  {/* Top: Plate & Reference & Time */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-slate-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-amber-950">
                          {order.vehicle_plate || 'TANPA PLAT'}
                        </span>
                        {order.vehicle_model && (
                          <span className="text-xs text-slate-600 font-semibold">
                            ({order.vehicle_model})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-800">{order.customer_name}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-slate-400 text-[10px]">{order.reference}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {order.created_at}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 mt-1 inline-block">
                        Menunggu Bayar
                      </span>
                    </div>
                  </div>

                  {/* Middle: Items Summary */}
                  <div className="space-y-1 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div className="flex justify-between font-bold text-slate-700 text-[11px] pb-1 border-b border-slate-200">
                      <span>Rincian Item ({totalItemsCount} pcs)</span>
                      <span>Subtotal</span>
                    </div>
                    {order.items.slice(0, 3).map((it, idx) => {
                      const unitPrice = it.custom_price ?? (it.item_type === 'SERVICE' && it.service ? it.service.standard_price : it.product.product_price);
                      const lineVal = (unitPrice - (it.discount_per_item || 0)) * it.qty;
                      const name = it.custom_name_override || (it.item_type === 'SERVICE' && it.service ? it.service.service_name : it.product.name);

                      return (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                          <span className="truncate pr-2">• {it.qty}x {name}</span>
                          <span className="font-mono font-medium shrink-0">{formatRupiah(lineVal)}</span>
                        </div>
                      );
                    })}
                    {order.items.length > 3 && (
                      <p className="text-[10px] text-slate-400 italic text-right">
                        +{order.items.length - 3} item lainnya...
                      </p>
                    )}
                  </div>

                  {/* Total & Action Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Tagihan:</span>
                      <span className="text-base font-black font-mono text-emerald-700">
                        {formatRupiah(order.grand_total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Cetak Nota Fisik */}
                      <button
                        onClick={() => onPrintOrder(order)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors border border-slate-200 shadow-2xs"
                        title="Cetak Ulang Nota Penjualan Fisik"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Hapus Antrian */}
                      <button
                        onClick={() => {
                          if (confirm(`Hapus antrian nota ${order.vehicle_plate}?`)) {
                            onDeleteOrder(order.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200"
                        title="Hapus Antrian"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Panggil Kembali / Lanjutkan Bayar */}
                      <button
                        onClick={() => onResumeOrder(order)}
                        className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-98 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <span>Panggil & Bayar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Drawer */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>Total {parkedOrders.length} nota menunggu pembayaran</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
