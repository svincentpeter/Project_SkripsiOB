import React, { useState } from 'react';
import { 
  Printer, 
  Share2, 
  ArrowLeft, 
  CheckCircle, 
  RotateCcw, 
  Volume2, 
  Download, 
  MessageCircle 
} from 'lucide-react';
import { PosTransaction } from '../../shared/types';
import { formatDateIndo, formatRupiah, playCashDrawerSound } from '../../shared/utils/formatters';

interface ThermalReceiptScreenProps {
  currentTransaction: PosTransaction | null;
  transactionsHistory: PosTransaction[];
  storeSettings?: any;
  onBackToPos: () => void;
  onSelectTransaction: (tx: PosTransaction) => void;
}

export const ThermalReceiptScreen: React.FC<ThermalReceiptScreenProps> = ({
  currentTransaction,
  transactionsHistory,
  storeSettings,
  onBackToPos,
  onSelectTransaction,
}) => {
  const [drawerKicked, setDrawerKicked] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // If no current transaction, pick the latest one from history
  const activeTx = currentTransaction || (transactionsHistory.length > 0 ? transactionsHistory[transactionsHistory.length - 1] : null);

  const headerText = storeSettings?.invoice_header || 'OMAH BAN CABANG 3 (OB3)\nPUSAT PENJUALAN BAN & SPOORING 3D';
  const addressText = storeSettings?.address || 'Jl. Raya Otomotif No. 88, Kav. 3, BSD Tangerang';
  const phoneText = `Telp: ${storeSettings?.phone || '(021) 543-9988'} / WA: ${storeSettings?.whatsapp || '0812-8899-3300'}`;
  const warrantyText = storeSettings?.invoice_warranty_text || 'Garansi pabrik 1 tahun untuk cacat produksi. Gratis Nitrogen & Balancing 2x dalam 6 bulan.';
  const footerTitle = storeSettings?.invoice_footer_title || 'TERIMA KASIH ATAS KUNJUNGAN ANDA!';
  const showBarcode = storeSettings?.show_barcode_on_receipt !== false;

  const handlePrint = () => {
    window.print();
  };

  const handleKickDrawer = () => {
    setDrawerKicked(true);
    playCashDrawerSound();

    setTimeout(() => {
      setDrawerKicked(false);
    }, 2500);
  };

  const handleCopyWaText = () => {
    if (!activeTx) return;
    const text = `*OMAH BAN CABANG 3 (OB3)*
Struk Pembelian Ban: ${activeTx.invoice_number}
Tanggal: ${activeTx.date}
Pelanggan: ${activeTx.customer_name} (${activeTx.vehicle_plate})
-----------------------------------
${activeTx.items
  .map(
    (i) =>
      `${i.product.name} (${i.product.product_size})\n  ${i.qty} x ${formatRupiah(
        i.custom_price ?? i.product.product_price
      )} = ${formatRupiah((i.custom_price ?? i.product.product_price) * i.qty)}`
  )
  .join('\n')}
-----------------------------------
Grand Total: ${formatRupiah(activeTx.grand_total)}
Metode: ${activeTx.payment_method}
Garansi Resmi 1 Tahun Pabrik + Free Nitrogen 2x.
Terima kasih atas kunjungan Anda!`;

    navigator.clipboard?.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 3000);
  };

  if (!activeTx) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-[#F8FAFC]">
        <Printer className="w-16 h-16 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900">Belum Ada Transaksi Untuk Dicetak</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Lakukan transaksi pada layar POS Kasir terlebih dahulu untuk menghasilkan struk thermal 80mm.
        </p>
        <button
          onClick={onBackToPos}
          className="mt-5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          Buka Kasir POS Sekarang
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-105px)] overflow-hidden bg-[#F8FAFC] text-slate-900">
      {/* Left Sidebar: Recent Invoices List for quick re-print */}
      <aside className="w-full lg:w-72 bg-white border-r border-slate-200 p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar no-print shadow-2xs">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
            Riwayat Struk Terkini
          </h3>
          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            {transactionsHistory.length} Nota
          </span>
        </div>

        <div className="space-y-2">
          {transactionsHistory.map((tx) => {
            const isSelected = activeTx.id === tx.id;
            return (
              <button
                key={tx.id}
                onClick={() => onSelectTransaction(tx)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs ${
                  isSelected
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[11px] text-slate-900">{tx.invoice_number}</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">
                    {formatRupiah(tx.grand_total)}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 truncate mt-0.5">
                  {tx.customer_name} • {tx.vehicle_plate}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">{tx.timestamp}</div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Preview Canvas */}
      <main className="flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-100/70">
        {/* Action Header / Toolbar (Hidden in print) */}
        <div className="w-full max-w-[340px] mb-4 flex items-center justify-between gap-2 no-print">
          <button
            onClick={onBackToPos}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kasir</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleKickDrawer}
              className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border ${
                drawerKicked
                  ? 'bg-amber-500 border-amber-600 text-white shadow-xs animate-pulse'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
              title="Kirim sinyal kick solenoid untuk buka laci kasir"
            >
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{drawerKicked ? 'Laci Terbuka!' : 'Buka Laci'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak (80mm)</span>
            </button>
          </div>
        </div>

        {/* WhatsApp & Copy Notification Toast */}
        {copiedNotification && (
          <div className="w-full max-w-[340px] mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-center gap-1.5 no-print shadow-2xs animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Teks struk WhatsApp berhasil disalin ke clipboard!</span>
          </div>
        )}

        {/* =========================================================
            PRINTER-READY THERMAL RECEIPT (Max 80mm / 300px width)
            Realistic white paper with thermal monospaced print styling
            ========================================================= */}
        <div
          id="thermal-receipt-printable"
          className="w-full max-w-[300px] bg-white text-slate-900 font-mono text-[11px] p-4 rounded-t-sm shadow-md relative border-t-4 border-slate-300 select-text"
          style={{ width: '80mm' }}
        >
          {/* Jagged paper tear illusion at top */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

          {/* Header Section */}
          <div className="text-center pb-2 border-b border-dashed border-slate-400 space-y-1">
            <div className="font-extrabold text-sm tracking-tight text-black whitespace-pre-line">
              {headerText}
            </div>
            <div className="text-[10px] text-slate-600 leading-tight">
              {addressText}
            </div>
            <div className="text-[10px] text-slate-600">
              {phoneText}
            </div>
          </div>

          {/* Metadata Section */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span className="text-slate-600">No. Nota:</span>
              <span className="font-bold text-black">{activeTx.invoice_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Waktu:</span>
              <span className="text-black">{activeTx.timestamp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kasir:</span>
              <span className="text-black">{activeTx.cashier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Pelanggan:</span>
              <span className="font-semibold text-black">{activeTx.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Kendaraan/Plat:</span>
              <span className="font-bold text-black">{activeTx.vehicle_plate}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-2 border-b border-dashed border-slate-400">
            <div className="flex justify-between font-bold text-[10px] text-slate-700 pb-1 mb-1 border-b border-slate-300">
              <span>ITEM PRODUK BAN</span>
              <span>SUBTOTAL</span>
            </div>

            <div className="space-y-2">
              {activeTx.items.map((item, idx) => {
                const unitPrice = item.custom_price ?? item.product.product_price;
                const lineTotal = (unitPrice - item.discount_per_item) * item.qty;

                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-black text-[11px] leading-snug">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      Ukuran: {item.product.product_size} • {item.product.brand}
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>
                        {item.qty} pcs x {formatRupiah(unitPrice)}
                        {item.discount_per_item > 0 && ` (Disc -${formatRupiah(item.discount_per_item)})`}
                      </span>
                      <span className="font-bold text-black">{formatRupiah(lineTotal)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Section */}
          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{formatRupiah(activeTx.subtotal)}</span>
            </div>

            {activeTx.total_discount > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>Total Diskon Promosi:</span>
                <span>-{formatRupiah(activeTx.total_discount)}</span>
              </div>
            )}

            {activeTx.tax_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>PPN 11%:</span>
                <span>{formatRupiah(activeTx.tax_amount)}</span>
              </div>
            )}

            <div className="flex justify-between font-black text-xs pt-1 border-t border-slate-300 text-black">
              <span>GRAND TOTAL:</span>
              <span>{formatRupiah(activeTx.grand_total)}</span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-700 pt-1">
              <span>Metode Bayar:</span>
              <span className="font-bold uppercase">{activeTx.payment_method.replace('_', ' ')}</span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-700">
              <span>Uang Diterima:</span>
              <span>{formatRupiah(activeTx.amount_paid)}</span>
            </div>

            <div className="flex justify-between text-[10px] text-slate-700 font-bold">
              <span>Kembalian:</span>
              <span>{formatRupiah(activeTx.change_amount)}</span>
            </div>

            {activeTx.payment_reference && (
              <div className="flex justify-between text-[9px] text-slate-500 pt-0.5">
                <span>Ref:</span>
                <span className="font-mono">{activeTx.payment_reference}</span>
              </div>
            )}
          </div>

          {/* Footer Warranty & Policies */}
          <div className="pt-3 pb-2 text-center space-y-2 text-[9px] text-slate-600 leading-tight">
            <div className="p-1.5 bg-slate-100 rounded border border-slate-200 text-slate-700 font-semibold">
              ★ KEBIJAKAN GARANSI OMAH BAN ★
              <div className="font-normal text-[8.5px] mt-0.5 whitespace-pre-line">
                {warrantyText}
              </div>
            </div>

            {showBarcode && (
              <>
                <div className="font-mono tracking-widest text-slate-400 text-[10px]">
                  ||| | ||||| || |||| ||||| | ||
                </div>
                <div className="text-[8px] text-slate-400 font-mono">
                  {activeTx.invoice_number}
                </div>
              </>
            )}

            <p className="font-bold text-black text-[10px] pt-1">
              {footerTitle}
            </p>
            <p className="text-[8px] text-slate-500">
              Kritik & Saran: {storeSettings?.email || 'info@omahban.co.id'}
            </p>
          </div>

          {/* Jagged receipt paper bottom effect */}
          <div className="absolute -bottom-2 left-0 right-0 h-2 bg-slate-100/70 [clip-path:polygon(0_0,5%_100%,10%_0,15%_100%,20%_0,25%_100%,30%_0,35%_100%,40%_0,45%_100%,50%_0,55%_100%,60%_0,65%_100%,70%_0,75%_100%,80%_0,85%_100%,90%_0,95%_100%,100%_0)]" />
        </div>

        {/* Share via WhatsApp button (below receipt) */}
        <div className="w-full max-w-[300px] mt-6 flex flex-col gap-2 no-print">
          <button
            onClick={handleCopyWaText}
            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-emerald-100" />
            <span>Kirim Nota via WhatsApp (Copy Text)</span>
          </button>
        </div>
      </main>
    </div>
  );
};
