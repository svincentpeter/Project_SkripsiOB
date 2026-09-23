import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { PosTransaction, StoreSettings } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  transaction: PosTransaction | null;
  storeSettings?: StoreSettings;
  onClose: () => void;
  onPrintPhysical: () => void;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  transaction,
  storeSettings,
  onClose,
  onPrintPhysical,
}) => {
  if (!isOpen || !transaction) return null;

  const isBon = transaction.is_bon || transaction.payment_method === 'HUTANG_BON';
  const receiptNo = transaction.invoice_number || transaction.reference || 'OB3-INV-PREVIEW';
  const transactionTime = transaction.timestamp || new Date().toLocaleString('id-ID');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative flex flex-col items-center max-h-[95vh] my-auto">
        {/* Top Control Bar */}
        <div className="w-full max-w-sm flex items-center justify-between pb-3 text-white">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase">Pratinjau Struk Kasir (80mm)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Tutup Pratinjau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Realistic 80mm Thermal Receipt Canvas */}
        <div className="w-[330px] sm:w-[350px] bg-white text-slate-900 font-mono text-[11px] p-5 rounded-t-xl shadow-2xl overflow-y-auto max-h-[70vh] border border-slate-200 select-none">
          {/* Header Toko */}
          <div className="text-center pb-3 border-b border-dashed border-slate-400 space-y-1">
            <div className="font-extrabold text-sm tracking-tight text-black whitespace-pre-line leading-tight">
              {storeSettings?.store_name || 'OMAH BAN CABANG 3 (OB3)'}
            </div>
            <div className="text-[10px] text-slate-700 font-semibold">
              PUSAT BAN BARU, VELG RACING &amp; SPOORING 3D
            </div>
            <div className="text-[9.5px] text-slate-600 leading-tight">
              {storeSettings?.address || 'Jl. Raya Magelang - Secang Km. 5, Magelang, Jawa Tengah'}
            </div>
            <div className="text-[9.5px] text-slate-600">
              Telp: {storeSettings?.phone || '(0293) 314-889'} / WA: 0812-9988-7722
            </div>
            <div className="font-black text-xs pt-1 text-black tracking-widest border-t border-slate-300 mt-1 uppercase">
              {isBon ? '*** FAKTUR BON / TEMPO ***' : '*** NOTA PENJUALAN RESMI ***'}
            </div>
          </div>

          {/* Metadata Transaksi */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-600">No. Nota:</span>
              <span className="font-bold text-black">{receiptNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Waktu:</span>
              <span className="text-slate-900">{transactionTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kasir:</span>
              <span className="font-bold text-slate-900">{transaction.cashier_name || 'Kasir Standar'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pelanggan:</span>
              <span className="font-bold text-slate-900">{transaction.customer_name || 'Pelanggan Umum'}</span>
            </div>
            {transaction.vehicle_plate && (
              <div className="flex justify-between">
                <span className="text-slate-600">Kendaraan:</span>
                <span className="font-bold text-slate-900">
                  {transaction.vehicle_plate} {transaction.vehicle_model ? `(${transaction.vehicle_model})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Daftar Item Barang & Jasa */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
            <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Rincian Item Transaksi:
            </div>
            {transaction.items.map((item, idx) => {
              const unitPrice = item.custom_price ?? item.product?.product_price ?? item.product?.price ?? 0;
              const subtotal = (unitPrice * item.qty) - ((item.discount_per_item || 0) * item.qty);
              const itemName = item.custom_name_override || item.product?.product_name || item.product?.name || 'Item';

              return (
                <div key={idx} className="space-y-0.5 text-[10.5px]">
                  <div className="font-bold text-black leading-tight">
                    {itemName}
                  </div>
                  <div className="flex justify-between text-slate-700 text-[10px]">
                    <span>
                      {item.qty} x {formatRupiah(unitPrice)}
                      {item.discount_per_item ? ` (Disc: -${formatRupiah(item.discount_per_item)})` : ''}
                    </span>
                    <span className="font-bold text-black font-mono">{formatRupiah(subtotal)}</span>
                  </div>
                  {item.note && (
                    <div className="text-[9px] text-slate-500 italic pl-1 border-l border-slate-300">
                      * {item.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rincian Finansial & Total */}
          <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[10.5px]">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal:</span>
              <span className="font-mono">{formatRupiah(transaction.subtotal)}</span>
            </div>
            {transaction.total_discount > 0 && (
              <div className="flex justify-between text-rose-700 font-bold">
                <span>Total Diskon:</span>
                <span className="font-mono">-{formatRupiah(transaction.total_discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs font-black text-black pt-1.5 border-t border-slate-300">
              <span className="uppercase">TOTAL TAGIHAN:</span>
              <span className="font-mono text-sm">{formatRupiah(transaction.grand_total)}</span>
            </div>

            {/* Metode Bayar & Status */}
            <div className="pt-2 space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Metode Bayar:</span>
                <span className="font-bold text-black">{transaction.payment_method.replace(/_/g, ' ')}</span>
              </div>

              {transaction.payment_method === 'TUNAI' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Uang Diterima:</span>
                    <span className="font-mono font-bold text-black">
                      {formatRupiah(transaction.paid_amount || transaction.grand_total)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Kembalian:</span>
                    <span className="font-mono font-bold text-black">
                      {formatRupiah(transaction.change_amount || 0)}
                    </span>
                  </div>
                </>
              )}

              {isBon && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[9.5px] space-y-0.5 mt-1">
                  <div className="font-bold uppercase">Status: Belum Lunas (Piutang)</div>
                  <div>Tercatat di Buku Pembantu Piutang Usaha.</div>
                </div>
              )}
            </div>
          </div>

          {/* Garansi & Footer Ramah */}
          <div className="text-center pt-3 space-y-2 text-[9px] text-slate-600">
            <div className="flex items-center justify-center gap-1 font-bold text-slate-800 text-[9.5px]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>GARANSI SERVIS SPOORING &amp; BALANCING 7 HARI</span>
            </div>
            <p className="leading-tight">
              Barang yang sudah dibeli dapat ditukar jika cacat pabrik dengan menyertakan struk ini.
            </p>
            <div className="font-bold tracking-wider text-[10px] text-black pt-1">
              TERIMA KASIH ATAS KUNJUNGAN ANDA
            </div>
            {/* Barcode Mockup */}
            <div className="pt-2 flex flex-col items-center justify-center">
              <div className="font-mono tracking-[0.25em] text-[8px] text-slate-400">
                |||||| | |||| ||| ||||||| ||| ||||
              </div>
              <div className="text-[8px] text-slate-500 font-mono mt-0.5">
                {receiptNo}
              </div>
            </div>
          </div>
        </div>

        {/* Zigzag Bottom Paper Edge Decoration */}
        <div 
          className="w-[330px] sm:w-[350px] h-3 bg-white border-x border-b border-slate-200"
          style={{
            clipPath: 'polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%)',
          }}
        />

        {/* Action Buttons Footer */}
        <div className="w-full max-w-sm pt-4 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Tutup Pratinjau
          </button>
          <button
            type="button"
            onClick={onPrintPhysical}
            className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Fisik Sekarang</span>
          </button>
        </div>
      </div>
    </div>
  );
};
