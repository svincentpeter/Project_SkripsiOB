import React, { useState, useEffect } from 'react';
import { 
  Edit3, 
  X, 
  DollarSign, 
  Tag, 
  FileText, 
  Trash2, 
  ShieldCheck 
} from 'lucide-react';
import { CartItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';

interface CartLineEditModalProps {
  isOpen: boolean;
  item: CartItem | null;
  itemIndex: number | null;
  onClose: () => void;
  onSave: (index: number, updatedItem: CartItem) => void;
  onRemoveItem: (index: number) => void;
}

export const CartLineEditModal: React.FC<CartLineEditModalProps> = ({
  isOpen,
  item,
  itemIndex,
  onClose,
  onSave,
  onRemoveItem,
}) => {
  const [qty, setQty] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discountPerItem, setDiscountPerItem] = useState<number>(0);
  const [customName, setCustomName] = useState<string>('');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !item) return;

    setQty(item.qty);
    const standardPrice = item.item_type === 'SERVICE' && item.service
      ? item.service.standard_price
      : item.product?.product_price || item.product?.price || 0;
    
    setUnitPrice(item.custom_price ?? standardPrice);
    setDiscountPerItem(item.discount_per_item ?? 0);
    setCustomName(item.custom_name_override ?? '');
    setNote(item.note ?? '');
  }, [isOpen, item]);

  if (!isOpen || !item || itemIndex === null) return null;

  const standardPrice = item.item_type === 'SERVICE' && item.service
    ? item.service.standard_price
    : item.product?.product_price || item.product?.price || 0;

  const originalName = item.item_type === 'SERVICE' && item.service
    ? item.service.service_name
    : item.product?.product_name || item.product?.name || 'Produk';

  const subtotalLine = Math.max(0, (unitPrice - discountPerItem) * qty);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty <= 0) {
      onRemoveItem(itemIndex);
      onClose();
      return;
    }

    const isPriceOverridden = unitPrice !== standardPrice;

    const updatedItem: CartItem = {
      ...item,
      qty,
      custom_price: isPriceOverridden ? unitPrice : undefined,
      discount_per_item: discountPerItem,
      custom_name_override: customName.trim() ? customName.trim() : undefined,
      note: note.trim() ? note.trim() : undefined,
      override_reason: isPriceOverridden ? 'Penyesuaian kasir' : undefined,
      adjusted_by: isPriceOverridden ? 'Kasir OB3' : undefined,
    };

    onSave(itemIndex, updatedItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Edit Baris Keranjang</h2>
              <p className="text-xs text-slate-400 truncate max-w-xs">{originalName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Kustomisasi Nama Baris (Opsional)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={originalName}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Jumlah (Qty)
              </label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm font-bold focus:outline-hidden focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Harga Satuan (Rp)
              </label>
              <input
                type="text"
                value={formatRupiah(unitPrice)}
                onChange={(e) => setUnitPrice(parseRupiahInput(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-emerald-400 font-bold text-sm focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Diskon Satuan per Item (Rp)
            </label>
            <input
              type="text"
              value={formatRupiah(discountPerItem)}
              onChange={(e) => setDiscountPerItem(parseRupiahInput(e.target.value))}
              placeholder="0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-amber-400 font-semibold text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Catatan Khusus (Muncul di Struk)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Free pentil besi / Roda depan kanan"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-blue-500"
            />
          </div>

          <div className="p-3 bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Baris Ini:</span>
            <span className="text-base font-extrabold text-blue-400">{formatRupiah(subtotalLine)}</span>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                onRemoveItem(itemIndex);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600/30 text-xs font-bold flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" /> Hapus Item
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-900/30"
              >
                Terapkan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
