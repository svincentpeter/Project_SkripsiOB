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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Simpan Pesanan Booking DP</h2>
              <p className="text-xs text-slate-500">
                Mencatat uang muka pelanggan & mereservasi stok produk di gudang.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Nama Pelanggan
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm font-semibold shadow-2xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> No. WhatsApp Pelanggan
              </label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm font-semibold shadow-2xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-slate-400" /> Plat Nomor
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs sm:text-sm font-bold shadow-2xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tipe / Model Mobil
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm shadow-2xs focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-purple-50/50 border border-purple-200 rounded-2xl space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Total Nilai Pesanan:</span>
              <span className="text-slate-900 font-black text-sm">{formatRupiah(totals.grandTotal)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-purple-200/80">
              <div>
                <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider mb-1">
                  Uang Muka Diterima (DP)
                </label>
                <input
                  type="text"
                  value={formatRupiah(dpAmount)}
                  onChange={(e) => setDpAmount(parseRupiahInput(e.target.value))}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3.5 py-2 text-purple-700 font-black text-sm shadow-2xs focus:outline-none focus:border-purple-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Metode Pembayaran DP
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 text-xs font-semibold shadow-2xs"
                >
                  <option value="TUNAI">Kas Tunai Laci Kasir</option>
                  <option value="TRANSFER_BCA">Transfer Bank BCA</option>
                  <option value="QRIS">QRIS Dinamis</option>
                  <option value="EDC_DEBIT">EDC Kartu Debit</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs pt-2 border-t border-purple-200/80">
              <span className="text-slate-600">Sisa Tagihan yang Harus Dilunasi:</span>
              <span className="text-amber-700 font-black text-sm">{formatRupiah(remaining)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan Booking (Jadwal Pasang)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Booking 4 Ban Baru, pasang hari Sabtu jam 10.00"
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm shadow-2xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-2xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4" /> Simpan Booking DP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
