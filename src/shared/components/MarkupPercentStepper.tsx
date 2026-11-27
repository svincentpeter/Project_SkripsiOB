import React, { useState } from 'react';
import { Minus, Plus, RotateCcw, Percent } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';
import {
  MIN_MARKUP_PERCENT,
  calculateMarkupPercent,
  getMinSellingPrice,
  getPriceFromMarkupPercent,
} from '../utils/pricingStandard';

interface MarkupPercentStepperProps {
  referenceHpp: number;
  sellingPrice: number;
  onChangeSellingPrice: (newPrice: number) => void;
  /** Batas harga minimal rupiah (misal harga katalog untuk Kasir saat harga katalog > Rp 0). */
  minPriceFloor?: number;
  /** Override batas persentase markup minimal (misal margin minimal merek; default MIN_MARKUP_PERCENT). */
  minPercent?: number;
  label?: string;
}

/**
 * Kontrol ringan & real-time untuk menambah/mengurangi persentase keuntungan (+/-) dari HPP.
 * Setiap klik tombol +/- atau ketik angka % langsung memperbarui Harga Jual (Rp) secara real-time,
 * dan perubahan Harga Jual (Rp) juga langsung memperbarui angka % di sini.
 */
export const MarkupPercentStepper: React.FC<MarkupPercentStepperProps> = ({
  referenceHpp,
  sellingPrice,
  onChangeSellingPrice,
  minPriceFloor = 0,
  minPercent,
  label = 'Penentuan Persentase Keuntungan dari HPP (Real-Time):',
}) => {
  const [draftPct, setDraftPct] = useState<string | null>(null);

  if (referenceHpp <= 0) return null;

  const baseMinPct =
    minPercent !== undefined && Number.isFinite(minPercent) ? minPercent : MIN_MARKUP_PERCENT;
  const minStandardPrice =
    minPercent !== undefined && Number.isFinite(minPercent)
      ? getPriceFromMarkupPercent(referenceHpp, baseMinPct)
      : getMinSellingPrice(referenceHpp);
  const effectiveMinPrice = Math.max(minStandardPrice, minPriceFloor);
  const effectiveMinPct = Math.max(
    baseMinPct,
    calculateMarkupPercent(effectiveMinPrice, referenceHpp)
  );

  const currentMarkupPct = calculateMarkupPercent(sellingPrice, referenceHpp);
  const profitNominal = Math.round(sellingPrice - referenceHpp);
  const canDecrease = sellingPrice > effectiveMinPrice + 0.5;

  const applyPercentDelta = (deltaPct: number) => {
    setDraftPct(null);
    const basePct = currentMarkupPct < effectiveMinPct ? effectiveMinPct : currentMarkupPct;
    const nextPct = Math.max(effectiveMinPct, Math.round((basePct + deltaPct) * 100) / 100);
    const nextPrice = Math.max(effectiveMinPrice, getPriceFromMarkupPercent(referenceHpp, nextPct));
    onChangeSellingPrice(nextPrice);
  };

  const handleResetToMinimum = () => {
    setDraftPct(null);
    onChangeSellingPrice(effectiveMinPrice);
  };

  const handlePercentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setDraftPct(raw);
    const parsed = parseFloat(raw.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) {
      onChangeSellingPrice(getPriceFromMarkupPercent(referenceHpp, parsed));
    }
  };

  const handlePercentInputBlur = () => {
    setDraftPct(null);
    if (sellingPrice < effectiveMinPrice) {
      onChangeSellingPrice(effectiveMinPrice);
    }
  };

  const displayPctValue = draftPct !== null ? draftPct : String(currentMarkupPct);

  return (
    <div className="pt-2 border-t border-slate-200/80 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
          <Percent className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{label}</span>
        </span>
        <span className="text-[11px] font-mono text-slate-600">
          Laba/Unit:{' '}
          <strong className={profitNominal >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
            {profitNominal >= 0 ? `+${formatRupiah(profitNominal)}` : formatRupiah(profitNominal)}
          </strong>{' '}
          → Harga Jual: <strong className="text-slate-900">{formatRupiah(sellingPrice)}</strong>
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => applyPercentDelta(-5)}
          disabled={!canDecrease}
          title="Kurangi 5% keuntungan"
          className="h-8 px-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-extrabold font-mono tabular-nums cursor-pointer transition-colors"
        >
          -5%
        </button>

        <button
          type="button"
          aria-label="Kurangi 1 persen"
          onClick={() => applyPercentDelta(-1)}
          disabled={!canDecrease}
          title="Kurangi 1% keuntungan"
          className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="relative w-20">
          <input
            type="number"
            step="0.5"
            min={effectiveMinPct}
            aria-label="Persentase keuntungan dari HPP"
            value={displayPctValue}
            onChange={handlePercentInputChange}
            onBlur={handlePercentInputBlur}
            className="w-full h-8 bg-white border border-blue-300 rounded-lg pl-2 pr-5 text-center text-slate-900 text-xs font-black font-mono tabular-nums focus:border-blue-600 focus:outline-none"
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-black text-blue-700 pointer-events-none">
            %
          </span>
        </div>

        <button
          type="button"
          aria-label="Tambah 1 persen"
          onClick={() => applyPercentDelta(1)}
          title="Tambah +1% keuntungan"
          className="w-8 h-8 rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => applyPercentDelta(5)}
          title="Tambah +5% keuntungan"
          className="h-8 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-extrabold font-mono tabular-nums cursor-pointer transition-colors"
        >
          +5%
        </button>

        <button
          type="button"
          onClick={() => applyPercentDelta(10)}
          title="Tambah +10% keuntungan"
          className="h-8 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-extrabold font-mono tabular-nums cursor-pointer transition-colors"
        >
          +10%
        </button>

        {Math.abs(sellingPrice - effectiveMinPrice) > 1 && (
          <button
            type="button"
            onClick={handleResetToMinimum}
            className="h-8 px-2.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Min ({effectiveMinPct}%)</span>
          </button>
        )}
      </div>
    </div>
  );
};
