import React, { useEffect, useState } from 'react';
import { X, CreditCard, Building2, Wallet, CheckCircle2, AlertCircle, UserCheck } from 'lucide-react';
import { DebtPaymentInput, PayableInvoice } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { localDate } from '../../../services/accountingPeriod';

interface PayDebtModalProps {
  invoice: PayableInvoice | null;
  cashInDrawer: number;
  onClose: () => void;
  onSubmit: (paymentInput: DebtPaymentInput) => void;
}

export const PayDebtModal: React.FC<PayDebtModalProps> = ({
  invoice,
  cashInDrawer,
  onClose,
  onSubmit,
}) => {
  const [paymentDate, setPaymentDate] = useState(() => localDate());
  const [amount, setAmount] = useState<number>(invoice?.remaining_amount ?? 0);
  const [sourceAccount, setSourceAccount] = useState<'1-1000' | '1-1001' | '3-1000'>('1-1001');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!invoice) return;
    setPaymentDate(localDate());
    setAmount(invoice.remaining_amount);
    setSourceAccount('1-1001');
    setNotes(`Pelunasan hutang pembelian ban ${invoice.supplier_name}`);
  }, [invoice]);

  useEffect(() => {
    if (!invoice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoice, onClose]);

  if (!invoice) return null;

  const handlePayFull = () => {
    setAmount(invoice.remaining_amount);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || amount > invoice.remaining_amount) return;

    onSubmit({
      payable_invoice_id: invoice.id,
      payment_date: paymentDate,
      amount,
      source_account_code: sourceAccount,
      notes,
    });

    onClose();
  };

  const isInvalidAmount = amount <= 0 || amount > invoice.remaining_amount;
  const journalHint =
    sourceAccount === '3-1000'
      ? 'Auto-Journaling: Dr. Hutang Dagang (2-1000) / Cr. Modal Disetor Pemilik (3-1000)'
      : `Auto-Journaling: Dr. Hutang Dagang (2-1000) / Cr. ${sourceAccount === '1-1000' ? 'Kas Laci (1-1000)' : 'Bank BCA (1-1001)'}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between text-slate-900 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Catat Pembayaran Hutang Supplier</h2>
              <p className="text-[11px] text-slate-500">{journalHint}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
          {/* Invoice Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold uppercase">Distributor / Supplier:</span>
              <strong className="text-slate-900 text-sm">{invoice.supplier_name}</strong>
            </div>
            <div className="flex justify-between items-center font-mono">
              <span className="text-slate-500">No. Faktur Tagihan:</span>
              <span className="font-bold text-slate-800">{invoice.invoice_number}</span>
            </div>
            <div className="flex justify-between items-center font-mono pt-1 border-t border-slate-200">
              <span className="text-slate-500">Sisa Tagihan Belum Dibayar:</span>
              <strong className="text-amber-700 text-sm tabular-nums">{formatRupiah(invoice.remaining_amount)}</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Tanggal Bayar *</label>
              <input
                type="date"
                value={paymentDate}
                max={localDate()}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700 uppercase">Nominal Bayar (Rp) *</label>
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
                >
                  Bayar Lunas
                </button>
              </div>
              <input
                type="text"
                value={amount ? amount.toLocaleString('id-ID') : ''}
                onChange={(e) => setAmount(parseRupiahInput(e.target.value))}
                placeholder="0"
                required
                className="w-full px-3 py-2 text-xs font-mono font-bold tabular-nums border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {isInvalidAmount && (
            <div className="p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Nominal bayar harus lebih dari Rp 0 dan tidak melebihi sisa hutang ({formatRupiah(invoice.remaining_amount)}).</span>
            </div>
          )}

          {/* Source Account Selection */}
          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1.5">
              Sumber Dana Pembayaran
            </label>
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label
                  className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    sourceAccount === '1-1001'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Bank BCA Toko
                    </span>
                    <input
                      type="radio"
                      name="sourceAccount"
                      value="1-1001"
                      checked={sourceAccount === '1-1001'}
                      onChange={() => setSourceAccount('1-1001')}
                      className="accent-indigo-600"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">1-1001 Bank BCA Cabang 3</span>
                </label>

                <label
                  className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                    sourceAccount === '1-1000'
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      Kas Laci Kasir
                    </span>
                    <input
                      type="radio"
                      name="sourceAccount"
                      value="1-1000"
                      checked={sourceAccount === '1-1000'}
                      onChange={() => setSourceAccount('1-1000')}
                      className="accent-indigo-600"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    Saldo Laci: {formatRupiah(cashInDrawer)}
                  </span>
                </label>
              </div>

              <label
                className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-all ${
                  sourceAccount === '3-1000'
                    ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Dibayar Langsung oleh Owner (Dana Pribadi / Pusat)
                  </span>
                  <input
                    type="radio"
                    name="sourceAccount"
                    value="3-1000"
                    checked={sourceAccount === '3-1000'}
                    onChange={() => setSourceAccount('3-1000')}
                    className="accent-emerald-600"
                  />
                </div>
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  Dicatat sebagai tambahan <strong className="font-mono">3-1000 Modal Disetor Pemilik</strong>. Kas laci &amp; rekening bank cabang tidak berkurang.
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 uppercase mb-1">Catatan Pembayaran</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan transfer atau nomor resi"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isInvalidAmount}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Proses Bayar &amp; Posting Jurnal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
