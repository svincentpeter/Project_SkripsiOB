import React, { useState } from 'react';
import {
  CheckCircle2,
  Printer,
  MessageCircle,
  Receipt,
  X,
  Copy,
  Check,
  ArrowRight,
  Send,
  ExternalLink,
} from 'lucide-react';
import { PosTransaction } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface PosSuccessModalProps {
  isOpen: boolean;
  transaction: PosTransaction | null;
  onClose: () => void;
  onPrintReceipt: (tx: PosTransaction) => void;
  onNavigateToReceipts?: () => void;
  storeSettings?: any;
}

export const PosSuccessModal: React.FC<PosSuccessModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onPrintReceipt,
  onNavigateToReceipts,
  storeSettings,
}) => {
  const [copiedNota, setCopiedNota] = useState(false);
  const [showWaInput, setShowWaInput] = useState(false);
  const [waPhone, setWaPhone] = useState('');

  if (!isOpen || !transaction) return null;

  const isBon = (transaction.notes && transaction.notes.toUpperCase().includes('BON')) || transaction.payment_method === ('BON' as any);
  const isCash = transaction.payment_method === 'TUNAI';

  const handleCopyNota = () => {
    navigator.clipboard.writeText(transaction.invoice_number);
    setCopiedNota(true);
    setTimeout(() => setCopiedNota(false), 2000);
  };

  const handleSendWhatsApp = () => {
    let cleanPhone = waPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.substring(1);
    }

    const storeName = storeSettings?.name || 'OMAH BAN CABANG 3';
    const storeAddress = storeSettings?.address || 'Jl. Raya Magelang - Secang Km. 5, Magelang';
    const storePhone = storeSettings?.phone || '(0293) 314-889';

    const itemsText = transaction.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.custom_name_override || it.product.name} (${it.qty} pcs) = ${formatRupiah(
            (it.custom_price ?? it.product.product_price) * it.qty - (it.discount_per_item || 0) * it.qty
          )}`
      )
      .join('\n');

    const message = `*${storeName}*\n${storeAddress}\nTelp: ${storePhone}\n---------------------------------------\n*STRUK TRANSAKSI PENJUALAN*\nNo. Nota: ${transaction.invoice_number}\nWaktu   : ${transaction.timestamp || transaction.date}\nKasir   : ${transaction.cashier_name}\nPelanggan: ${transaction.customer_name || 'Umum'} (${transaction.vehicle_plate || '-'})\n---------------------------------------\n*DETAIL ITEM:*\n${itemsText}\n---------------------------------------\nSubtotal: ${formatRupiah(transaction.subtotal)}\n${transaction.total_discount > 0 ? `Diskon: -${formatRupiah(transaction.total_discount)}\n` : ''}*TOTAL BAYAR: ${formatRupiah(transaction.grand_total)}*\nMetode: ${transaction.payment_method} ${transaction.payment_provider ? `(${transaction.payment_provider})` : ''}\n---------------------------------------\nTerima kasih atas kunjungan Anda di Omah Ban!`;

    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;

    window.open(waUrl, '_blank');
    setShowWaInput(false);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Header Hero Section */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white text-center border-b border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-3 animate-bounce">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {isBon ? 'Faktur BON Tersimpan!' : 'Pembayaran Berhasil!'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isBon
              ? 'Faktur BON piutang telah dicatat ke buku besar'
              : 'Transaksi lunas dan pergerakan stok telah dibukukan'}
          </p>
        </div>

        {/* Scrollable Receipt Brief */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Main Amount Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Total {isBon ? 'Tagihan BON' : 'Diterima'}
            </span>
            <div className="text-3xl font-black text-slate-900 tracking-tight font-sans">
              {formatRupiah(transaction.grand_total)}
            </div>

            <div className="flex items-center justify-center gap-2 pt-1">
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  isBon
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isBon ? 'FAKTUR BON' : 'LUNAS'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full font-semibold text-[10px] bg-blue-100 text-blue-800 border border-blue-200">
                {transaction.payment_method} {transaction.payment_provider ? `(${transaction.payment_provider})` : ''}
              </span>
            </div>
          </div>

          {/* Cash Change Info (If Tunai) */}
          {isCash && (transaction.paid_amount || 0) > 0 && (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1 text-slate-700">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Uang Diterima:</span>
                <span className="font-semibold">{formatRupiah(transaction.paid_amount || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-emerald-200/60 text-emerald-900">
                <span>Uang Kembalian:</span>
                <span className="text-sm">{formatRupiah(transaction.change_amount || 0)}</span>
              </div>
            </div>
          )}

          {/* Transaction Metadata Grid */}
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-slate-600">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-slate-400">Nomor Nota:</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                <span>{transaction.invoice_number}</span>
                <button
                  type="button"
                  onClick={handleCopyNota}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  title="Salin No. Nota"
                >
                  {copiedNota ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Pelanggan:</span>
              <span className="font-medium text-slate-800">{transaction.customer_name || 'Pelanggan Walk-In'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kendaraan:</span>
              <span className="font-bold text-slate-800">{transaction.vehicle_plate || '-'}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Kasir:</span>
              <span className="font-medium text-slate-800">{transaction.cashier_name}</span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400">
              <span>Waktu Transaksi:</span>
              <span>{transaction.timestamp || transaction.date}</span>
            </div>
          </div>

          {/* Items Preview */}
          <div className="space-y-1 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Ringkasan Item ({transaction.items.length})
            </span>
            <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 space-y-1.5 max-h-28 overflow-y-auto">
              {transaction.items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-700 truncate max-w-[240px]">
                    {it.qty}x {it.custom_name_override || it.product.name}
                  </span>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {formatRupiah(
                      (it.custom_price ?? it.product.product_price) * it.qty - (it.discount_per_item || 0) * it.qty
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* WhatsApp Drawer / Input Form */}
          {showWaInput && (
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2 animate-in fade-in">
              <span className="text-[11px] font-bold text-emerald-900 block">
                Kirim Struk via WhatsApp
              </span>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white rounded-xl border border-emerald-300 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 space-y-2.5 shrink-0">
          {/* Main Actions: Print Thermal & WA */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onPrintReceipt(transaction)}
              className="py-2.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk (80mm)</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWaInput((prev) => !prev)}
              className="py-2.5 px-3 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Kirim WhatsApp</span>
            </button>
          </div>

          {/* Secondary Action: Transaksi Baru (Tetap di POS) */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <span>+ Transaksi Baru (Lanjut Kasir)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Optional: Buka Layar Riwayat & Audit Nota */}
          {onNavigateToReceipts && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToReceipts();
                }}
                className="text-[11px] text-slate-500 hover:text-blue-700 inline-flex items-center gap-1 transition cursor-pointer hover:underline"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Buka Layar Riwayat & Audit Nota</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
