import React, { useState } from 'react';
import { 
  Bookmark, 
  X, 
  Banknote, 
  Car, 
  User, 
  Phone, 
  FileText, 
  AlertTriangle 
} from 'lucide-react';
import { CartItem, PaymentMethod } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { calculateCartTotals } from '../../../services/posService';

interface BookingDpModalProps {
  isOpen: boolean;
  cart: CartItem[];
  defaultCustomerName: string;
  defaultVehiclePlate: string;
  defaultVehicleModel: string;
  onClose: () => void;
  onSaveBooking: (
    customerName: string,
    customerPhone: string,
    vehiclePlate: string,
    vehicleModel: string,
    dpAmount: number,
    paymentMethod: PaymentMethod,
    notes?: string
  ) => void;
}

export const BookingDpModal: React.FC<BookingDpModalProps> = ({
  isOpen,
  cart,
  defaultCustomerName,
  defaultVehiclePlate,
  defaultVehicleModel,
  onClose,
  onSaveBooking,
}) => {
  const [customerName, setCustomerName] = useState(defaultCustomerName || 'Pelanggan Umum');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState(defaultVehiclePlate || 'B 1984 SKZ');
  const [vehicleModel, setVehicleModel] = useState(defaultVehicleModel || 'Avanza');
  const [dpAmount, setDpAmount] = useState<number>(500000);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER_BCA');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const totals = calculateCartTotals(cart, 0, 0);
  const remaining = Math.max(0, totals.grandTotal - dpAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Nama pelanggan wajib diisi.');
      return;
    }

    if (!customerPhone.trim()) {
      setErrorMsg('Nomor WhatsApp / telepon wajib diisi untuk konfirmasi booking.');
      return;
    }

    if (dpAmount <= 0) {
      setErrorMsg('Nominal uang muka (DP) harus lebih besar dari 0.');
      return;
    }

    if (dpAmount >= totals.grandTotal) {
      setErrorMsg('Nominal DP sama atau melebihi total pesanan. Silakan checkout transaksi langsung sebagai LUNAS.');
      return;
    }

    onSaveBooking(
      customerName.trim(),
      customerPhone.trim(),
      vehiclePlate.trim(),
      vehicleModel.trim(),
      dpAmount,
      paymentMethod,
      notes.trim() || undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Simpan Pesanan Booking DP</h2>
              <p className="text-xs text-slate-400">
                Mencatat uang muka pelanggan & mereservasi stok produk di gudang.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-xl flex items-center gap-3 text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nama Pelanggan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> No. WhatsApp Pelanggan
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5" /> Plat Nomor
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Tipe / Model Mobil
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-purple-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-850 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Total Nilai Pesanan:</span>
              <span className="text-white font-bold">{formatRupiah(totals.grandTotal)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
                  Uang Muka Diterima (DP)
                </label>
                <input
                  type="text"
                  value={formatRupiah(dpAmount)}
                  onChange={(e) => setDpAmount(parseRupiahInput(e.target.value))}
                  className="w-full bg-slate-800 border border-purple-500/80 rounded-xl px-4 py-2 text-purple-300 font-extrabold text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Metode Pembayaran DP
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs"
                >
                  <option value="TUNAI">Kas Tunai Laci</option>
                  <option value="TRANSFER_BCA">Transfer Bank BCA</option>
                  <option value="QRIS">QRIS Dinamis</option>
                  <option value="EDC_DEBIT">EDC Kartu Debit</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800">
              <span className="text-slate-400">Sisa Tagihan yang Harus Dilunasi:</span>
              <span className="text-amber-400 font-extrabold text-sm">{formatRupiah(remaining)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Catatan Booking (Jadwal Pasang)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booking 4 Ban Baru, pasang hari Sabtu jam 10.00"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4" /> Simpan Booking DP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
