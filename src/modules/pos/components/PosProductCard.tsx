import React from 'react';
import { Plus, Wrench } from 'lucide-react';
import { ProductItem, ServiceMasterItem } from '../../../shared/types';
import { categoryKind } from '../../../shared/utils/categoryKind';
import { formatRupiah } from '../../../shared/utils/formatters';
import { getShortCategoryName } from './PosCatalogToolbar';

interface PosProductCardProps {
  product: ProductItem;
  qtyInCart: number;
  onAdd: (product: ProductItem) => void;
}

export const PosProductCard: React.FC<PosProductCardProps> = ({ product, qtyInCart, onAdd }) => {
  const stockQty = product.stock || product.product_quantity || 0;
  const lowThreshold = product.product_stock_alert ?? product.min_stock ?? 3;
  const isOutOfStock = stockQty <= 0;
  const isLowStock = stockQty > 0 && stockQty <= lowThreshold;
  const pKind = categoryKind(product.category);
  const price = product.product_price || product.price || 0;
  const ringLabel = product.ring ? (/^R/i.test(product.ring) ? product.ring.toUpperCase() : `R${product.ring}`) : null;
  const shortCat = getShortCategoryName(product.category || 'BAN_BARU', product.category || 'Ban');

  const specParts: string[] = [];
  if (product.brand) specParts.push(product.brand);
  if (pKind === 'BAN_BARU') {
    const size =
      product.product_size ||
      (product.size_width && product.size_ratio
        ? `${product.size_width}/${product.size_ratio} R${String(product.ring || '').replace(/^R/i, '')}`
        : '');
    if (size) specParts.push(size);
    if (product.motif && product.motif !== '-') specParts.push(product.motif);
  } else if (pKind === 'VELG') {
    if (product.pcd) specParts.push(`PCD ${product.pcd}`);
    if (product.color_finish) specParts.push(product.color_finish);
  } else if (pKind === 'BAN_DALAM') {
    const size = product.product_size || product.size_ratio || '';
    if (size) specParts.push(size);
    if (product.valve_type) specParts.push(product.valve_type);
  } else {
    if (product.product_size) specParts.push(product.product_size);
    if (product.motif && product.motif !== '-') specParts.push(product.motif);
    else if (product.product_code) specParts.push(product.product_code);
  }

  return (
    <button
      type="button"
      disabled={isOutOfStock}
      onClick={() => !isOutOfStock && onAdd(product)}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '136px' }}
      className={`text-left w-full bg-white border rounded-xl p-3.5 flex flex-col justify-between min-h-[132px] transition-[border-color,box-shadow,transform,background-color] duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
        isOutOfStock
          ? 'opacity-50 bg-slate-100/70 border-slate-200 cursor-not-allowed'
          : qtyInCart > 0
          ? 'border-blue-600 ring-1 ring-blue-600/20 bg-blue-50/20 hover:shadow-sm cursor-pointer active:scale-[0.98]'
          : isLowStock
          ? 'border-amber-300/90 hover:border-amber-500 hover:shadow-sm cursor-pointer active:scale-[0.98]'
          : 'border-slate-200 hover:border-blue-500 hover:shadow-sm cursor-pointer active:scale-[0.98]'
      }`}
    >
      <div className="w-full">
        {/* Baris 1: Tag Ring + Kategori teks bersih di kiri, Status Stok di kanan */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            {ringLabel && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight bg-slate-900 text-white tabular-nums shrink-0">
                {ringLabel}
              </span>
            )}
            <span className="text-[11px] font-medium text-slate-500 truncate">{shortCat}</span>
          </div>

          <span
            className={`text-[11px] px-2 py-0.5 rounded-md tabular-nums shrink-0 ${
              isOutOfStock
                ? 'bg-rose-50 text-rose-700 font-semibold'
                : isLowStock
                ? 'bg-amber-50 text-amber-800 font-semibold border border-amber-200'
                : 'bg-slate-100 text-slate-600 font-medium'
            }`}
          >
            {isOutOfStock ? 'Habis' : isLowStock ? `Sisa ${stockQty}` : `Stok ${stockQty}`}
          </span>
        </div>

        {/* Baris 2: Judul Produk & Spesifikasi */}
        <h3 className="text-[13px] font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
          {product.product_name || product.name}
        </h3>

        {specParts.length > 0 && (
          <p className="text-[11px] text-slate-500 mt-1 truncate">{specParts.join(' · ')}</p>
        )}
      </div>

      {/* Baris 3: Harga tabular-nums & Status Keranjang / Tambah */}
      <div className="w-full mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        {price > 0 ? (
          <span className="text-[15px] font-bold text-emerald-700 tabular-nums tracking-tight">
            {formatRupiah(price)}
          </span>
        ) : (
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
            Atur Harga (+15%)
          </span>
        )}

        {qtyInCart > 0 ? (
          <span className="h-7 px-2.5 rounded-lg bg-blue-700 text-white text-xs font-bold tabular-nums inline-flex items-center justify-center shrink-0">
            x{qtyInCart}
          </span>
        ) : (
          <span
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              isOutOfStock
                ? 'bg-slate-200 text-slate-400'
                : 'bg-slate-100 group-hover:bg-blue-700 text-slate-700 group-hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
          </span>
        )}
      </div>
    </button>
  );
};

interface PosServiceCardProps {
  service: ServiceMasterItem;
  qtyInCart: number;
  onAdd: (service: ServiceMasterItem) => void;
}

export const PosServiceCard: React.FC<PosServiceCardProps> = ({ service, qtyInCart, onAdd }) => {
  return (
    <button
      type="button"
      onClick={() => onAdd(service)}
      title={`${service.service_name}${service.description ? ` - ${service.description}` : ''}`}
      className={`text-left w-full bg-white border rounded-xl p-3.5 flex flex-col justify-between min-h-[132px] transition-[border-color,box-shadow,transform,background-color] duration-150 group cursor-pointer active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-1 ${
        qtyInCart > 0
          ? 'border-blue-600 ring-1 ring-blue-600/20 bg-blue-50/20 hover:shadow-sm'
          : 'border-slate-200 hover:border-blue-500 hover:shadow-sm'
      }`}
    >
      <div className="w-full">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <Wrench className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>{service.category ? service.category.replace(/_/g, ' ') : 'Jasa Pit'}</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500 tabular-nums">{service.service_code}</span>
        </div>

        <h3 className="text-[13px] font-semibold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
          {service.service_name}
        </h3>

        {service.description && (
          <p className="text-[11px] text-slate-500 mt-1 truncate">{service.description}</p>
        )}
      </div>

      <div className="w-full mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-emerald-700 tabular-nums tracking-tight">
          {formatRupiah(service.standard_price)}
        </span>

        {qtyInCart > 0 ? (
          <span className="h-7 px-2.5 rounded-lg bg-blue-700 text-white text-xs font-bold tabular-nums inline-flex items-center justify-center shrink-0">
            x{qtyInCart}
          </span>
        ) : (
          <span className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-700 text-slate-700 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
            <Plus className="w-4 h-4" />
          </span>
        )}
      </div>
    </button>
  );
};
