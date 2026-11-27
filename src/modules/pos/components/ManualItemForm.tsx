import React, { useState } from 'react';
import { Minus, Plus, Wrench } from 'lucide-react';
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
    <div className="p-4 sm:p-5 bg-white rounded-xl border border-slate-200 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start gap-3 pb-3.5 border-b border-slate-200">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
          <Wrench className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">Input Jasa Manual Kasir</h3>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            Untuk layanan jasa dadakan di luar daftar master. Barang dagangan baru tetap harus dicatat melalui menu Penerimaan Barang agar HPP FIFO tetap akurat.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="manual-service-name" className="text-xs font-semibold text-slate-800 block">
            Nama Layanan Jasa <span className="text-rose-600">*</span>
          </label>
          <input
            id="manual-service-name"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Contoh: Tambal Tip Top Ban Tubeless atau Press Velg"
            className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-sm text-slate-900 font-medium focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-medium text-slate-500">Pilih cepat:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setItemName(p.name);
                  setSellPriceInput(String(p.price));
                }}
                className="h-7 px-2.5 rounded-md bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-xs font-medium text-slate-700 hover:text-blue-700 transition-colors cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="manual-service-price" className="text-xs font-semibold text-slate-800 block mb-1.5">
              Tarif Jasa Satuan (Rp) <span className="text-rose-600">*</span>
            </label>
            <input
              id="manual-service-price"
              type="text"
              value={sellPriceInput ? formatRupiah(sellPrice).replace('Rp ', '') : ''}
              onChange={(e) => setSellPriceInput(e.target.value)}
              placeholder="0"
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-emerald-700 font-mono text-sm font-bold tabular-nums focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
            />
          </div>

          <div>
            <span className="text-xs font-semibold text-slate-800 block mb-1.5">Jumlah (Qty)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                aria-label="Jumlah"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 h-10 text-center bg-white border border-slate-300 rounded-lg font-mono text-sm font-bold tabular-nums text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
              />
              <button
                type="button"
                aria-label="Tambah jumlah"
                onClick={() => setQty(qty + 1)}
                className="w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="manual-service-notes" className="text-xs font-semibold text-slate-700 block mb-1.5">
            Catatan Baris Struk (Opsional)
          </label>
          <input
            id="manual-service-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Garansi tambal 1 pekan"
            className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-xs sm:text-sm text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-600">
            Subtotal baris:{' '}
            <strong className="text-base font-bold text-emerald-700 tabular-nums ml-1">{formatRupiah(total)}</strong>
          </div>
          <button
            type="submit"
            className="h-11 px-5 rounded-xl bg-blue-700 hover:bg-blue-800 active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" />
            <span>Masukkan ke Keranjang</span>
          </button>
        </div>
      </form>
    </div>
  );
};
