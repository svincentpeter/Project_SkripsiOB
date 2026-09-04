import React from 'react';
import { 
  Bookmark, 
  X, 
  Phone, 
  Car, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { SalesBookingRecord } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface BookingListDrawerProps {
  isOpen: boolean;
  bookings: SalesBookingRecord[];
  onClose: () => void;
  onConvertBooking: (booking: SalesBookingRecord) => void;
}

export const BookingListDrawer: React.FC<BookingListDrawerProps> = ({
  isOpen,
  bookings,
  onClose,
  onConvertBooking,
}) => {
  if (!isOpen) return null;

  const activeBookings = bookings.filter((b) => b.status === 'ACTIVE');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-700 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Daftar Booking DP Aktif</h2>
              <p className="text-xs text-slate-400">
                {activeBookings.length} pesanan menunggu pelunasan / kedatangan pelanggan.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <Bookmark className="w-12 h-12 mx-auto text-slate-600 stroke-[1.5]" />
              <p className="text-sm font-semibold text-slate-300">Tidak Ada Booking DP Aktif</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Pesanan yang disimpan dengan uang muka (DP) akan muncul di sini untuk dilunasi saat pemasangan.
              </p>
            </div>
          ) : (
            activeBookings.map((bk) => (
              <div
                key={bk.id}
                className="bg-slate-850 border border-slate-750 hover:border-purple-500/50 rounded-2xl p-4 transition-all space-y-3 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-mono font-bold text-purple-400 bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded-md">
                      {bk.booking_number}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      {bk.created_at || bk.date}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> DP Terbayar
                  </span>
                </div>

                <div className="border-t border-b border-slate-800 py-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Pelanggan & Kendaraan</span>
                    <span className="text-white font-semibold block">{bk.customer_name}</span>
                    <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                      <Car className="w-3 h-3" /> {bk.vehicle_plate} ({bk.vehicle_model || 'Mobil'})
                    </span>
                    {bk.customer_phone && (
                      <span className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {bk.customer_phone}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[11px]">Rincian Finansial</span>
                    <span className="text-slate-300 text-[11px] block">
                      Total: {formatRupiah(bk.estimated_total)}
                    </span>
                    <span className="text-purple-400 font-bold block">
                      DP: {formatRupiah(bk.dp_amount)} ({bk.payment_method})
                    </span>
                    <span className="text-amber-400 font-extrabold text-xs block mt-0.5">
                      Sisa: {formatRupiah(bk.remaining_amount)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">Item Pesanan ({bk.items.length}):</span>{' '}
                  {bk.items.map((it) => it.custom_name_override || (it.item_type === 'SERVICE' && it.service ? it.service.service_name : it.product?.product_name)).join(', ')}
                </div>

                {bk.notes && (
                  <p className="text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded-lg italic">
                    "{bk.notes}"
                  </p>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onConvertBooking(bk);
                      onClose();
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-900/20 flex items-center justify-center gap-2"
                  >
                    <span>Muat ke Kasir & Lunasi / Jadikan BON</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
