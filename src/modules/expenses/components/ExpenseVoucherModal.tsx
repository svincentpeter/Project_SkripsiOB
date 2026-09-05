import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Receipt, 
  FileSpreadsheet, 
  Building2, 
  Check, 
  Copy
} from 'lucide-react';
import { ExpenseRecord } from '../../../shared/types';
import { formatDateIndo, formatDateTimeIndo, formatRupiah } from '../../../shared/utils/formatters';

interface ExpenseVoucherModalProps {
  expense: ExpenseRecord | null;
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
  branchName?: string;
}

export const ExpenseVoucherModal: React.FC<ExpenseVoucherModalProps> = ({
  expense,
  isOpen,
  onClose,
  storeName = 'OMAH BAN',
  branchName = 'CABANG 3 - BSD SERPONG',
}) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'formal'>('formal');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !expense) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyBkk = () => {
    navigator.clipboard.writeText(expense.bkk_number || expense.expense_number);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Top Control Bar */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Cetak Bukti Kas Keluar (BKK)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Switch */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setPrintFormat('formal')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  printFormat === 'formal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Lembar Formal A5
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  printFormat === 'thermal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Struk Thermal 80mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex justify-center bg-slate-100/70">
          {printFormat === 'formal' ? (
            /* --- FORMAT A5 / FORMAL VOUCHER --- */
            <div 
              id="printable-voucher-formal"
              className="w-full bg-white border-2 border-slate-900 p-6 rounded-xl shadow-xs text-slate-900 font-sans text-xs space-y-4 print:p-0 print:border-none print:shadow-none print:w-full"
            >
              {/* Header Kop Surat */}
              <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
                <div>
                  <h2 className="text-base font-black tracking-tight">{storeName}</h2>
                  <p className="text-[11px] font-bold text-slate-700 uppercase">{branchName}</p>
                  <p className="text-[10px] text-slate-500">Sistem Informasi Akuntansi SAK EMKM</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black px-2 py-1 bg-slate-900 text-white rounded uppercase inline-block">
                    BUKTI KAS KELUAR
                  </span>
                  <div className="text-[11px] font-mono font-bold mt-1 text-slate-800">
                    No: {expense.bkk_number || expense.expense_number}
                  </div>
                </div>
              </div>

              {/* Detail Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Tanggal Transaksi:</span>
                  <strong className="text-slate-900 font-bold">{formatDateIndo(expense.date)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Sumber Pembayaran:</span>
                  <strong className="text-slate-900 font-bold">{expense.cash_source}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Dibayarkan Kepada:</span>
                  <strong className="text-slate-900 font-bold">{expense.paid_to}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Pos Beban (Akun COA):</span>
                  <strong className="text-slate-900 font-bold">{expense.category_code || '6-xxxx'} - {expense.category}</strong>
                </div>
              </div>

              {/* Deskripsi & Jumlah */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-2">
                <div>
                  <span className="text-slate-500 text-[10px] block">Uraian / Keterangan Keperluan:</span>
                  <p className="font-semibold text-slate-900">{expense.description}</p>
                </div>
                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="font-bold text-slate-700">Jumlah Uang Dikeluarkan:</span>
                  <span className="text-base font-mono font-black text-slate-950">
                    {formatRupiah(expense.amount)}
                  </span>
                </div>
              </div>

              {/* Tanda Tangan 3 Kolom */}
              <div className="pt-6 grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="space-y-12">
                  <span className="block text-slate-500">Disiapkan Oleh (Kasir)</span>
                  <span className="block font-bold border-t border-slate-400 mx-2 pt-1">
                    ( Fani A. )
                  </span>
                </div>
                <div className="space-y-12">
                  <span className="block text-slate-500">Disetujui Oleh (Supervisor)</span>
                  <span className="block font-bold border-t border-slate-400 mx-2 pt-1">
                    ( {expense.approved_by || 'Supervisor'} )
                  </span>
                </div>
                <div className="space-y-12">
                  <span className="block text-slate-500">Diterima Oleh</span>
                  <span className="block font-bold border-t border-slate-400 mx-2 pt-1">
                    ( {expense.paid_to} )
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* --- FORMAT STRUK THERMAL 80MM --- */
            <div 
              id="printable-voucher-thermal"
              className="w-72 bg-white border border-slate-300 p-4 rounded-xl shadow-xs text-slate-900 font-mono text-[11px] space-y-2.5 print:p-0 print:border-none print:shadow-none print:w-72"
            >
              <div className="text-center border-b border-dashed border-slate-400 pb-2">
                <h2 className="font-black text-xs">{storeName}</h2>
                <p className="text-[10px] text-slate-600">{branchName}</p>
                <div className="font-bold text-[10px] mt-1 bg-slate-100 py-0.5 rounded">
                  BUKTI KAS KELUAR (BKK)
                </div>
              </div>

              <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                <div className="flex justify-between">
                  <span>No BKK:</span>
                  <strong className="font-bold">{expense.bkk_number || expense.expense_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tanggal:</span>
                  <span>{expense.date}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sumber:</span>
                  <span>{expense.cash_source.includes('Laci') ? 'KAS LACI' : 'BANK BCA'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Penerima:</span>
                  <span className="truncate max-w-[140px]">{expense.paid_to}</span>
                </div>
              </div>

              <div className="space-y-1 text-[10px] border-b border-dashed border-slate-400 pb-2">
                <span className="text-slate-500 block">Keterangan:</span>
                <p className="font-sans text-[11px] leading-tight font-semibold">{expense.description}</p>
                <span className="text-slate-500 block pt-1">Pos: {expense.category}</span>
              </div>

              <div className="flex justify-between items-center py-1 font-bold text-xs border-b border-dashed border-slate-400">
                <span>TOTAL KELUAR:</span>
                <span className="font-black">{formatRupiah(expense.amount)}</span>
              </div>

              <div className="pt-2 flex justify-around text-center text-[9px]">
                <div>
                  <span>Kasir</span>
                  <div className="h-7"></div>
                  <span className="border-t border-slate-400 pt-0.5 block">( Fani A. )</span>
                </div>
                <div>
                  <span>Penerima</span>
                  <div className="h-7"></div>
                  <span className="border-t border-slate-400 pt-0.5 block">( ............ )</span>
                </div>
              </div>

              <div className="text-center text-[8px] text-slate-400 pt-1">
                Dicetak: {formatDateTimeIndo(new Date().toISOString())}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleCopyBkk}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg flex items-center gap-1.5 hover:bg-slate-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin No. BKK'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
