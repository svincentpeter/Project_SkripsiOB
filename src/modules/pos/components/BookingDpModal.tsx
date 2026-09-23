import React, { useState } from 'react';
import { 
  Bookmark, 
  X, 
  Banknote, 
  Car, 
  User, 
  Phone, 
  FileText, 
  AlertTriangle,
  Calendar,
  Clock
} from 'lucide-react';
import { CartItem, PaymentMethod, StoreSettings } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { calculateCartTotals } from '../../../services/posService';
import { INITIAL_BANK_PROVIDERS, INITIAL_QRIS_PROVIDERS } from '../../../shared/data/mockData';

interface BookingDpModalProps {
  isOpen: boolean;
  cart: CartItem[];
  defaultCustomerName: string;
  defaultVehiclePlate: string;
  defaultVehicleModel: string;
  storeSettings?: StoreSettings;
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
  storeSettings,
  onClose,
  onSaveBooking,
}) => {
  const totals = calculateCartTotals(cart, 0, 0);

  // Dynamic default DP calculation (30% of total or 50k, capped to less than grand total)
  const calcDefaultDp = () => {
    if (totals.grandTotal <= 0) return 0;
    const suggested = Math.floor(totals.grandTotal * 0.3);
    if (suggested <= 0) return Math.max(0, totals.grandTotal - 10000);
    return Math.min(suggested, Math.max(10000, totals.grandTotal - 10000));
  };

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [customerName, setCustomerName] = useState(defaultCustomerName || '');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState(defaultVehiclePlate || '');
  const [vehicleModel, setVehicleModel] = useState(defaultVehicleModel || '');
  const [dpAmount, setDpAmount] = useState<number>(() => calcDefaultDp());
  const [scheduledDate, setScheduledDate] = useState<string>(() => getTomorrowDate());
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER_BCA');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

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

    const scheduleInfo = `[Jadwal Pasang: ${scheduledDate} ${scheduledTime} WIB]`;
    const finalNotes = [scheduleInfo, notes.trim()].filter(Boolean).join(' ');

    onSaveBooking(
      customerName.trim(),
      customerPhone.trim(),
      vehiclePlate.trim(),
      vehicleModel.trim(),
      dpAmount,
      paymentMethod,
      finalNotes
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
                Mencatat uang muka pelanggan &amp; mereservasi stok produk di gudang.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                placeholder="Contoh: Pak Budi / PT Maju Jaya"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm font-semibold shadow-2xs focus:border-purple-500 focus:outline-none placeholder:text-slate-400"
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
                placeholder="Contoh: 0812-3456-7890"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm font-semibold shadow-2xs focus:border-purple-500 focus:outline-none placeholder:text-slate-400"
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
                placeholder="Contoh: AA 1234 XY"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs sm:text-sm font-bold shadow-2xs focus:border-purple-500 focus:outline-none placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal"
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
                placeholder="Contoh: Avanza / Innova"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm shadow-2xs focus:border-purple-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Jadwal Janji Kedatangan & Pemasangan Terstruktur */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" /> Tanggal Janji Pasang
              </label>
              <input
                type="date"
                value={scheduledDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm font-bold shadow-2xs focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-600" /> Estimasi Jam Kedatangan
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 text-xs sm:text-sm font-bold shadow-2xs focus:border-purple-500 focus:outline-none"
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
                  {((storeSettings?.bank_providers || INITIAL_BANK_PROVIDERS).filter((b) => b.is_active)).map((b) => (
                    <option key={b.provider_name} value={b.provider_name === 'BCA' ? 'TRANSFER_BCA' : 'TRANSFER'}>
                      Transfer Bank {b.provider_name}
                    </option>
                  ))}
                  {((storeSettings?.qris_providers || INITIAL_QRIS_PROVIDERS).filter((q) => q.is_active)).map((q) => (
                    <option key={q.provider_name} value="QRIS">
                      QRIS {q.provider_name} ({q.fee_percentage}%)
                    </option>
                  ))}
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
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Catatan Tambahan (Opsional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cth: Titip velg, minta pasang pentil besi baru..."
              className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 text-xs sm:text-sm shadow-2xs focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-2xs cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Bookmark className="w-4 h-4" /> Simpan Booking DP
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
