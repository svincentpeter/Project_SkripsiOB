import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  X, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw,
  SlidersHorizontal,
  PackageCheck
} from 'lucide-react';
import { StockMutation, TireProduct } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';
import { generateMutationId, generateOpnameDocNumber } from '../../../services/inventoryService';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface StockOpnameModalProps {
  isOpen: boolean;
  products: TireProduct[];
  existingMutations: StockMutation[];
  onClose: () => void;
  onSaveOpname: (updatedProducts: TireProduct[], newMutations: StockMutation[]) => void;
}

export const StockOpnameModal: React.FC<StockOpnameModalProps> = ({
  isOpen,
  products,
  existingMutations,
  onClose,
  onSaveOpname,
}) => {
  const [opnameInputs, setOpnameInputs] = useState<Record<string, number>>({});
  const [opnameOperator, setOpnameOperator] = useState('Gudang - Bambang');
  const [opnameNotes, setOpnameNotes] = useState('Stock Opname Fisik Bulanan Cabang 3');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('ALL');

  // Initialize input with current stock on open
  useEffect(() => {
    if (!isOpen) return;
    const initial: Record<string, number> = {};
    products.forEach((p) => {
      initial[p.id] = p.stock;
    });
    setOpnameInputs(initial);
  }, [isOpen, products]);

  if (!isOpen) return null;

  const docNumber = generateOpnameDocNumber(existingMutations);

  const handleStockChange = (tireId: string, value: string) => {
    const num = parseInt(value, 10);
    setOpnameInputs((prev) => ({
      ...prev,
      [tireId]: isNaN(num) ? 0 : num,
    }));
  };

  const handleResetAll = () => {
    const reset: Record<string, number> = {};
    products.forEach((p) => {
      reset[p.id] = p.stock;
    });
    setOpnameInputs(reset);
  };

  // Filter products in table
  const filteredProducts = products.filter((p) => {
    if (p.is_active === false) return false;
    const matchesBrand = selectedBrandFilter === 'ALL' || p.brand === selectedBrandFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQ = 
      !q ||
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.product_name && p.product_name.toLowerCase().includes(q)) ||
      (p.product_code && p.product_code.toLowerCase().includes(q)) ||
      (p.product_size && p.product_size.toLowerCase().includes(q));

    return matchesBrand && matchesQ;
  });

  // Calculate variances
  let totalDifferenceUnits = 0;
  let totalDifferenceValuation = 0;
  let changedCount = 0;

  products.forEach((p) => {
    const physical = opnameInputs[p.id] ?? p.stock;
    const diff = physical - p.stock;
    if (diff !== 0) {
      changedCount++;
      totalDifferenceUnits += diff;
      totalDifferenceValuation += diff * (p.cost_price || p.product_cost || 0);
    }
  });

  const handleSave = () => {
    const newMutations: StockMutation[] = [];
    const now = new Date();
    const fullDateTime = `${now.toISOString().split('T')[0]} ${now.toTimeString().split(' ')[0]}`;

    const updatedProducts = products.map((p) => {
      const physical = opnameInputs[p.id] ?? p.stock;
      const diff = physical - p.stock;

      if (diff !== 0) {
        newMutations.push({
          id: generateMutationId(),
          tire_id: p.id,
          product_id: p.id,
          tire_name: p.name || p.product_name,
          product_name: p.name || p.product_name,
          tire_size: p.product_size || p.size || '',
          date: fullDateTime,
          ref_doc: docNumber,
          type: 'PENYESUAIAN',
          qty: Math.abs(diff),
          balance: physical,
          notes: `Opname Fisik: Fisik ${physical} vs Sistem ${p.stock} (Selisih: ${diff > 0 ? '+' : ''}${diff} pcs). Berita Acara: ${opnameNotes}`,
          description: `Penyesuaian Opname ${docNumber} (${diff > 0 ? '+' : ''}${diff} pcs)`,
          operator: opnameOperator,
        });

        // Adjust remaining batches if deficit or surplus
        let updatedBatches = [...(p.batches || [])];
        if (diff > 0) {
          // Surplus: add to the newest batch or create adjustment batch
          if (updatedBatches.length > 0) {
            const lastBatch = { ...updatedBatches[updatedBatches.length - 1] };
            lastBatch.remaining_qty += diff;
            updatedBatches[updatedBatches.length - 1] = lastBatch;
          }
        } else if (diff < 0) {
          // Deficit: reduce from earliest available batches (FIFO)
          let toDeduct = Math.abs(diff);
          updatedBatches = updatedBatches.map((b) => {
            if (toDeduct <= 0) return b;
            const take = Math.min(b.remaining_qty, toDeduct);
            toDeduct -= take;
            return {
              ...b,
              remaining_qty: b.remaining_qty - take,
            };
          });
        }

        return {
          ...p,
          stock: physical,
          product_quantity: physical,
          batches: updatedBatches,
        };
      }

      return p;
    });

    onSaveOpname(updatedProducts, newMutations);
    onClose();
  };

  const brands = Array.from(new Set(products.map((p) => p.brand)));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col text-slate-900">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-lg text-slate-900 tracking-tight">
                  Stock Opname Fisik Cabang 3
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {docNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan kuantitas fisik riil hasil perhitungan di rak gudang. Sistem akan otomatis mengalkulasi selisih kuantitas dan valuasi HPP.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              reportId="stock_opname"
              data={products.map((p) => {
                const physical = opnameInputs[p.id] ?? p.stock;
                const diff = physical - p.stock;
                const cost = p.cost_price || p.product_cost || 0;
                return {
                  tire_id: p.id,
                  tire_name: p.product_name || p.name,
                  product_size: p.product_size ?? '',
                  system_stock: p.stock,
                  physical_stock: physical,
                  difference: diff,
                  cost_price: cost,
                  total_difference_val: diff * cost,
                };
              })}
              ctx={{ periodLabel: docNumber }}
            />
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operator & Berita Acara Bar */}
        <div className="p-3.5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-slate-600 font-bold block mb-1">Petugas / Tim Opname:</label>
            <input
              type="text"
              value={opnameOperator}
              onChange={(e) => setOpnameOperator(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-slate-600 font-bold block mb-1">Keterangan / Berita Acara:</label>
            <input
              type="text"
              value={opnameNotes}
              onChange={(e) => setOpnameNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Variance Summary Bar */}
        <div className="px-4 py-2.5 bg-indigo-50/50 border-b border-indigo-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-600 font-semibold">
              Item Berselisih: <strong className="font-mono text-slate-900 font-bold">{changedCount} SKU</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-semibold">
              Total Selisih Unit:{' '}
              <strong className={`font-mono font-black ${
                totalDifferenceUnits === 0
                  ? 'text-slate-500'
                  : totalDifferenceUnits > 0
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}>
                {totalDifferenceUnits > 0 ? `+${totalDifferenceUnits}` : totalDifferenceUnits} pcs
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-semibold">
              Valuasi Selisih HPP:{' '}
              <strong className={`font-mono font-black ${
                totalDifferenceValuation === 0
                  ? 'text-slate-500'
                  : totalDifferenceValuation > 0
                  ? 'text-emerald-700'
                  : 'text-rose-700'
              }`}>
                {totalDifferenceValuation > 0 ? `+${formatRupiah(totalDifferenceValuation)}` : formatRupiah(totalDifferenceValuation)}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset ke Stok Sistem</span>
          </button>
        </div>

        {/* Search & Brand Filter Bar */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative min-w-[240px] flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari SKU, nama ban, ukuran..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            <button
              onClick={() => setSelectedBrandFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors ${
                selectedBrandFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => setSelectedBrandFilter(b)}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  selectedBrandFilter === b
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Opname Table */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 z-10 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Nama Ban & Ukuran</th>
                <th className="py-2.5 px-3 text-center">Stok Sistem</th>
                <th className="py-2.5 px-3 text-center">Stok Fisik Nyata</th>
                <th className="py-2.5 px-3 text-center">Selisih Unit</th>
                <th className="py-2.5 px-3 text-right">Selisih Nilai HPP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredProducts.map((p) => {
                const physical = opnameInputs[p.id] ?? p.stock;
                const diff = physical - p.stock;
                const diffVal = diff * (p.cost_price || p.product_cost || 0);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-900 text-xs">{p.name || p.product_name}</div>
                      <div className="text-[11px] font-mono text-indigo-600 flex items-center gap-1.5 mt-0.5">
                        <span>{p.product_size}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500 font-bold">{p.product_code}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-700 font-bold text-xs">
                      {p.stock} pcs
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        value={physical}
                        onChange={(e) => handleStockChange(p.id, e.target.value)}
                        className="w-20 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center text-slate-900 font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none shadow-2xs"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono font-extrabold text-xs">
                      {diff === 0 ? (
                        <span className="text-slate-400">0 (Cocok)</span>
                      ) : diff > 0 ? (
                        <span className="text-emerald-600">+{diff} (Lebih)</span>
                      ) : (
                        <span className="text-rose-600">{diff} (Kurang)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-xs">
                      {diffVal === 0 ? (
                        <span className="text-slate-400">Rp 0</span>
                      ) : diffVal > 0 ? (
                        <span className="text-emerald-600">+{formatRupiah(diffVal)}</span>
                      ) : (
                        <span className="text-rose-600">{formatRupiah(diffVal)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Posting akan memperbarui saldo stok master dan menerbitkan mutasi <strong>PENYESUAIAN</strong> di kartu stok.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
            >
              <PackageCheck className="w-4 h-4" />
              <span>Posting Hasil Opname Fisik</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
