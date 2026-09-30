import React, { useState } from 'react';
import { Minus, Plus, Sparkles, Wrench } from 'lucide-react';
import { CartItem, ProductItem, ServiceMasterItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { useToast } from '../../../shared/components';

interface ManualItemFormProps {
  onAddToCart: (item: CartItem) => void;
}

const PRESETS = [
  { name: 'Tambal Tubeless Tip Top Dingin', price: 35000, label: 'Tambal Tip Top (Rp 35rb)' },
  { name: 'Ongkos Press Velg Retak/Penyok', price: 150000, label: 'Press Velg (Rp 150rb)' },
  { name: 'Jasa Pasang & Balancing Velg Luar', price: 50000, label: 'Pasang Velg Luar (Rp 50rb)' },
];

/**
 * Input manual kasir hanya untuk jasa dadakan: dibukukan sebagai pendapatan jasa (4-1001) tanpa HPP.
 * Barang non-katalog harus didaftarkan dan diterima lewat Penerimaan Barang agar HPP FIFO tercatat.
 */
export const ManualItemForm: React.FC<ManualItemFormProps> = ({ onAddToCart }) => {
  const toast = useToast();
  const [itemName, setItemName] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const sellPrice = parseRupiahInput(sellPriceInput);
  const total = sellPrice * qty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellPrice <= 0) {
      toast.warning('Harga Jasa Kosong', 'Harap masukkan tarif jasa (minimal Rp 1).');
      return;
    }
    if (!itemName.trim()) {
      toast.warning('Nama Jasa Kosong', 'Harap isi nama jasa yang dikerjakan.');
      return;
    }

    const name = itemName.trim();
    const itemId = `manual-${Date.now()}`;
    const service: ServiceMasterItem = {
      id: itemId,
      service_code: `SRV-MANUAL-${Math.floor(100 + Math.random() * 900)}`,
      service_name: name,
      category: 'JASA_MANUAL',
      standard_price: sellPrice,
      cost_price: 0,
      is_active: true,
      description: notes.trim() || 'Input Manual Jasa Kasir',
    };

    onAddToCart({
      item_type: 'SERVICE',
      product: {
        id: `syn-${itemId}`,
        name,
        category: 'SERVICES' as any,
        price: sellPrice,
        cost: 0,
        stock: 999,
        product_name: name,
        product_price: sellPrice,
        product_cost: 0,
      } as ProductItem,
      service,
      qty,
      discount_per_item: 0,
      custom_price: sellPrice,
      custom_hpp: 0,
      custom_name_override: name,
      note: notes.trim() || undefined,
      is_manual: true,
    });

    toast.success('Jasa Manual Ditambahkan', `${name} (${qty}x) masuk ke keranjang kasir.`);
    setItemName('');
    setSellPriceInput('');
    setNotes('');
    setQty(1);
  };

  return (
    <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900">Input Jasa Manual Kasir</h3>
          <p className="text-[11px] text-slate-500">
            Untuk jasa dadakan yang belum ada di master jasa. Barang non-katalog harus didaftarkan dan diterima lewat
            Penerimaan Barang dulu agar HPP FIFO tercatat.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="manual-service-name" className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-cyan-600" />
            Nama Layanan Jasa <span className="text-rose-600">*</span>
          </label>
          <input
            id="manual-service-name"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Cth: Tambal Tip Top Khusus Ban Tubeless / Press Velg"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setItemName(p.name);
                  setSellPriceInput(String(p.price));
                }}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="manual-service-price" className="text-xs font-black text-slate-800 block mb-1">
              Tarif Jasa Satuan (Rp) <span className="text-rose-600">*</span>
            </label>
            <input
              id="manual-service-price"
              type="text"
              value={sellPriceInput ? formatRupiah(sellPrice).replace('Rp ', '') : ''}
              onChange={(e) => setSellPriceInput(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-black focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 block mb-1">Jumlah (Qty)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                aria-label="Jumlah"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900"
              />
              <button
                type="button"
                aria-label="Tambah jumlah"
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="manual-service-notes" className="text-[11px] font-bold text-slate-600 block mb-1">
            Catatan Khusus Baris (Opsional)
          </label>
          <input
            id="manual-service-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cth: Garansi tambal 1 pekan"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Masukkan Jasa ke Keranjang ({formatRupiah(total)})</span>
        </button>
      </form>
    </div>
  );
};
