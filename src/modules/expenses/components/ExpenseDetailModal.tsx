import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Ban, 
  FileText, 
  Calendar, 
  Wallet, 
  Building2, 
  UserCheck, 
  CheckCircle2, 
  AlertTriangle, 
  ZoomIn, 
  Layers,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { ExpenseRecord } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface ExpenseDetailModalProps {
  expense: ExpenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenPrintVoucher: (expense: ExpenseRecord) => void;
  onVoidExpense: (expense: ExpenseRecord, reason: string, voidedBy: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  isOpen,
  onClose,
  onOpenPrintVoucher,
  onVoidExpense,
}) => {
  const [isZoomImageOpen, setIsZoomImageOpen] = useState(false);
  const [isVoidConfirmOpen, setIsVoidConfirmOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voidedBy, setVoidedBy] = useState('Supervisor - Wahyu');
  const [voidError, setVoidError] = useState('');

  if (!isOpen || !expense) return null;

  const isVoided = expense.status === 'VOID';

  const handleConfirmVoid = () => {
    if (!voidReason.trim()) {
      setVoidError('Alasan pembatalan biaya wajib diisi untuk audit!');
      return;
    }
    onVoidExpense(expense, voidReason.trim(), voidedBy.trim() || 'Supervisor');
    setIsVoidConfirmOpen(false);
    setVoidReason('');
    setVoidError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isVoided ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-900">
                  Rincian Bukti Kas Keluar (BKK)
                </h3>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  isVoided 
                    ? 'bg-rose-50 text-rose-700 border-rose-200' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isVoided ? 'DIBATALKAN (VOID)' : 'AKTIF / POSTED'}
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-700">
                {expense.bkk_number || expense.expense_number}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800 custom-scrollbar">
          {/* Warning Banner if VOID */}
          {isVoided && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-900">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Pengeluaran ini telah DIBATALKAN (VOID) & Jurnal Pembalik Telah Diterbitkan</span>
              </div>
              <p className="text-[11px] text-rose-700">
                <strong>Alasan Pembatalan:</strong> {expense.void_reason || 'Koreksi transaksi kasir'}
              </p>
              <div className="flex items-center gap-4 text-[10px] text-rose-600 font-mono">
                <span>Dibatalkan Oleh: {expense.voided_by || 'Supervisor'}</span>
                <span>Waktu: {expense.voided_at || '-'}</span>
              </div>
            </div>
          )}

          {/* Nominal Display */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Total Pengeluaran Kas:</span>
              <span className={`text-2xl font-black font-mono tracking-tight ${isVoided ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                {formatRupiah(expense.amount)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 font-medium block text-[11px]">Tanggal Transaksi:</span>
              <span className="font-bold text-slate-800">{formatDateIndo(expense.date)}</span>
            </div>
          </div>

          {/* Key Attribute Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] block">Kategori & Akun Beban SAK EMKM:</span>
              <span className="font-bold text-slate-900 block">{expense.category}</span>
              <span className="text-[11px] font-mono text-indigo-700 block font-semibold">
                Kode Akun: {expense.category_code || '6-1005'}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] block">Sumber Kas / Rekening:</span>
              <span className="font-bold text-slate-900 block flex items-center gap-1.5">
                {expense.cash_source.includes('Laci') ? (
                  <Wallet className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-blue-600" />
                )}
                {expense.cash_source}
              </span>
              <span className="text-[11px] text-slate-500 block">
                Metode: {expense.payment_method || (expense.cash_source.includes('Laci') ? 'Cash' : 'Transfer')}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] block">Dibayarkan Kepada:</span>
              <span className="font-bold text-slate-900 block">{expense.paid_to}</span>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 text-[11px] block">Diotorisasi / Disetujui Oleh:</span>
              <span className="font-bold text-slate-900 block flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                {expense.approved_by}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1 border-t border-slate-100 pt-3">
            <span className="text-slate-500 text-[11px] block">Keterangan / Uraian Rincian Biaya:</span>
            <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 leading-relaxed font-medium">
              {expense.description}
            </p>
          </div>

          {/* Photo Thumbnail with Zoom Click */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <span className="text-slate-700 font-bold block">Lampiran Bukti Nota Fisik / Kuitansi:</span>
            {expense.receipt_image ? (
              <div className="flex items-start gap-4">
                <div 
                  onClick={() => setIsZoomImageOpen(true)}
                  className="relative group cursor-pointer border border-slate-200 rounded-xl overflow-hidden w-28 h-28 bg-slate-100 shadow-2xs hover:border-blue-500 transition-all"
                >
                  <img
                    src={expense.receipt_image}
                    alt="Nota Fisik"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-5 h-5" />
                  </div>
                </div>
                <div className="space-y-1 text-slate-500 text-[11px]">
                  <p className="font-medium text-slate-700">Foto nota fisik telah tersimpan dan terkompresi secara lokal.</p>
                  <p>Klik pada thumbnail gambar di samping untuk melihat nota dalam ukuran penuh.</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-center">
                <span>Tidak ada lampiran foto nota untuk transaksi ini.</span>
              </div>
            )}
          </div>

          {/* Void Form Confirmation (Inline Drawer) */}
          {isVoidConfirmOpen && !isVoided && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Konfirmasi Pembatalan Pengeluaran (Void)</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Tindakan ini akan membatalkan pengeluaran ini dan secara otomatis memposting <strong>Jurnal Pembalik (Reversal Journal)</strong> SAK EMKM sehingga dana sebesar <strong>{formatRupiah(expense.amount)}</strong> akan dikembalikan ke saldo kas/bank terkait.
              </p>

              <div>
                <label className="text-rose-900 font-bold block mb-1">Alasan Pembatalan (Wajib):</label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Misal: Salah input nominal / barang retur / nota ganda..."
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-slate-900 text-xs focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              <div>
                <label className="text-rose-900 font-bold block mb-1">Otorisasi Supervisor:</label>
                <input
                  type="text"
                  value={voidedBy}
                  onChange={(e) => setVoidedBy(e.target.value)}
                  placeholder="Nama manajer atau supervisor pengesah pembatalan..."
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-slate-900 text-xs focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              {voidError && (
                <span className="text-[11px] text-rose-700 font-bold block">{voidError}</span>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsVoidConfirmOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmVoid}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
                >
                  Ya, Batalkan & Posting Reversal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div>
            {!isVoided && !isVoidConfirmOpen && (
              <button
                type="button"
                onClick={() => setIsVoidConfirmOpen(true)}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Batalkan Biaya (Void)</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPrintVoucher(expense)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Voucher BKK</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Modal Zoom Image */}
      {isZoomImageOpen && expense.receipt_image && (
        <div 
          onClick={() => setIsZoomImageOpen(false)}
          className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setIsZoomImageOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 text-white hover:bg-rose-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={expense.receipt_image}
              alt="Nota Fisik Full"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
            <div className="text-center text-xs text-slate-300 py-2">
              Bukti Nota Fisik - {expense.bkk_number || expense.expense_number}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
