import React from 'react';
import { Layers, Calendar, Building2, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProductBatch } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface ProductFifoBatchListProps {
  batches?: ProductBatch[];
  productName?: string;
}

export const ProductFifoBatchList: React.FC<ProductFifoBatchListProps> = ({
  batches = [],
  productName,
}) => {
  const activeBatches = batches.filter((b) => b.remaining_qty > 0);
  const totalRemainingPcs = activeBatches.reduce((acc, b) => acc + b.remaining_qty, 0);
  const totalValuationHpp = activeBatches.reduce((acc, b) => acc + b.remaining_qty * b.batch_cost, 0);

  if (!batches || batches.length === 0) {
    return (
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 text-center">
        <Layers className="w-6 h-6 text-indigo-400 mx-auto mb-1.5" />
        <p className="text-xs font-semibold text-indigo-900">Belum Ada Lapisan Batch FIFO</p>
        <p className="text-[11px] text-indigo-600 mt-0.5">
          Lapisan batch pembelian akan otomatis tercatat saat restock penerimaan barang (Goods Receipt).
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
              <span>Lapisan Batch Pembelian FIFO (First-In, First-Out)</span>
            </h4>
            <p className="text-[10px] text-indigo-700">
              Kasir secara otomatis memotong stok dari batch terlama terlebih dahulu.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="bg-white border border-indigo-200 text-indigo-800 font-bold px-2.5 py-1 rounded-lg font-mono text-[11px] shadow-2xs">
            {activeBatches.length} Batch Aktif ({totalRemainingPcs} pcs)
          </span>
          <span className="bg-indigo-600 text-white font-extrabold px-2.5 py-1 rounded-lg font-mono text-[11px] shadow-xs">
            HPP: {formatRupiah(totalValuationHpp)}
          </span>
        </div>
      </div>

      {/* Grid of Batch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {batches.map((batch, idx) => {
          const isExhausted = batch.remaining_qty <= 0;
          const percentage = batch.initial_qty > 0 
            ? Math.round((batch.remaining_qty / batch.initial_qty) * 100) 
            : 0;

          return (
            <div
              key={batch.id || `batch-${idx}`}
              className={`p-3 rounded-xl border transition-all text-xs ${
                isExhausted
                  ? 'bg-slate-50/80 border-slate-200 opacity-60'
                  : idx === 0
                  ? 'bg-white border-indigo-300 shadow-xs ring-1 ring-indigo-500/20'
                  : 'bg-white border-indigo-100 shadow-2xs'
              }`}
            >
              {/* Batch Top Line */}
              <div className="flex items-center justify-between font-mono mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isExhausted 
                      ? 'bg-slate-200 text-slate-600' 
                      : idx === 0 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-indigo-100 text-indigo-800'
                  }`}>
                    #{idx + 1}
                  </span>
                  <span className="font-bold text-slate-800 text-[11px]">
                    {batch.batch_code}
                  </span>
                </div>

                {isExhausted ? (
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                    Habis Terjual
                  </span>
                ) : idx === 0 ? (
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                    Prioritas Keluar
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">
                    Antrean #{idx + 1}
                  </span>
                )}
              </div>

              {/* Quantity Ratio & Progress */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Sisa Fisik:</span>
                  <span className={`font-mono font-black ${
                    isExhausted ? 'text-slate-400' : 'text-emerald-700'
                  }`}>
                    {batch.remaining_qty} <span className="text-slate-400 font-normal">/ {batch.initial_qty} pcs</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isExhausted
                        ? 'bg-slate-300'
                        : percentage < 25
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                  />
                </div>
              </div>

              {/* Cost & Supplier Details */}
              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    HPP Layer:
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {formatRupiah(batch.batch_cost)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Tgl Masuk:
                  </span>
                  <span className="font-mono text-slate-700">
                    {formatDateIndo(batch.purchase_date)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-500 text-[10px]">
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    {batch.source_name}
                  </span>
                  <span className="font-mono font-semibold text-indigo-700">
                    Sub: {formatRupiah(batch.remaining_qty * batch.batch_cost)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
