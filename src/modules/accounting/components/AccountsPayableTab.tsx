import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Building2, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import { DebtPaymentInput, PayableInvoice } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { PayDebtModal } from './PayDebtModal';
import { ExportMenu } from '../../../shared/export/ExportMenu';

interface AccountsPayableTabProps {
  invoices: PayableInvoice[];
  cashInDrawer: number;
  onPayDebt: (paymentInput: DebtPaymentInput) => void;
}

export const AccountsPayableTab: React.FC<AccountsPayableTabProps> = ({
  invoices,
  cashInDrawer,
  onPayDebt,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<PayableInvoice | null>(null);

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      inv.invoice_number.toLowerCase().includes(q) ||
      inv.supplier_name.toLowerCase().includes(q) ||
      (inv.notes && inv.notes.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'UNPAID') matchesStatus = inv.status !== 'LUNAS';
    if (statusFilter === 'PAID') matchesStatus = inv.status === 'LUNAS';

    return matchesQuery && matchesStatus;
  });

  const totalInvoiced = invoices.reduce((acc, i) => acc + i.total_amount, 0);
  const totalPaid = invoices.reduce((acc, i) => acc + i.paid_amount, 0);
  const totalRemainingDebt = invoices.reduce((acc, i) => acc + i.remaining_amount, 0);
  const unpaidCount = invoices.filter((i) => i.status !== 'LUNAS').length;

  return (
    <div className="w-full">
      {/* Main Unified Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-700" />
              <span>Buku Pembantu Hutang Supplier (Accounts Payable Sub-Ledger)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar faktur pembelian tempo supplier dan mutasi sisa kewajiban lancar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ExportMenu reportId="accounts_payable" data={invoices} ctx={{ periodLabel: 'Seluruh Periode' }} />
          </div>
        </div>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Faktur Tagihan</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
              {formatRupiah(totalInvoiced)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              {invoices.length} faktur distributor
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sudah Dilunasi</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 block mt-0.5">
              {formatRupiah(totalPaid)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
              Terbayar via Kas & Bank
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Sisa Hutang Dagang (2-1000)</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-900 block mt-0.5">
              {formatRupiah(totalRemainingDebt)}
            </span>
            <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">
              Kewajiban aktif lancar
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Faktur Belum Lunas</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
              {unpaidCount} <span className="text-xs font-semibold text-slate-500">tagihan</span>
            </span>
            <span className="text-[10px] text-amber-800 font-bold mt-0.5 block">
              Perlu diperhatikan jatuh temponya
            </span>
          </div>
        </div>


        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari distributor atau nomor faktur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'UNPAID' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Lunas ({unpaidCount})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'PAID' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lunas ({invoices.length - unpaidCount})
            </button>
          </div>
        </div>

        {/* Invoices Table (Responsive Horizontal Scroll) */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-[14%]">No. Faktur</th>
                <th className="py-2.5 px-3 w-[19%]">Distributor Ban</th>
                <th className="py-2.5 px-3 w-[10%]">Tanggal</th>
                <th className="py-2.5 px-3 w-[11%]">Jatuh Tempo</th>
                <th className="py-2.5 px-3 w-[12%] text-right">Total Tagihan</th>
                <th className="py-2.5 px-3 w-[11%] text-right">Sudah Dibayar</th>
                <th className="py-2.5 px-3 w-[11%] text-right bg-amber-50/50">Sisa Hutang</th>
                <th className="py-2.5 px-3 w-[6%] text-center">Status</th>
                <th className="py-2.5 px-3 w-[6%] text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center font-sans">
                    <span className="text-xs italic text-slate-400">
                      {invoices.length === 0
                        ? 'Belum ada faktur hutang dagang tersimpan di database.'
                        : 'Belum ada faktur yang cocok dengan filter status ini.'}
                    </span>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2 px-3 font-bold text-indigo-700 text-xs truncate" title={inv.invoice_number}>{inv.invoice_number}</td>
                  <td className="py-2 px-3 font-sans truncate" title={inv.supplier_name}>
                    <span className="font-bold text-slate-900 block text-xs truncate">{inv.supplier_name}</span>
                    {inv.notes && <span className="text-[10px] text-slate-400 block truncate">{inv.notes}</span>}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-600 text-xs truncate">{formatDateIndo(inv.date)}</td>
                  <td className="py-2 px-3 font-sans text-slate-600 text-xs truncate">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{formatDateIndo(inv.due_date)}</span>
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-800 text-xs truncate">
                    {formatRupiah(inv.total_amount)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-700 text-xs truncate">
                    {formatRupiah(inv.paid_amount)}
                  </td>
                  <td className="py-2 px-3 text-right font-black text-amber-800 bg-amber-50/30 text-xs truncate">
                    {formatRupiah(inv.remaining_amount)}
                  </td>
                  <td className="py-2 px-3 text-center font-sans">
                    {inv.status === 'LUNAS' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Lunas
                      </span>
                    ) : inv.status === 'SEBAGIAN' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Sebagian
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Belum
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center font-sans">
                    {inv.remaining_amount > 0 ? (
                      <button
                        onClick={() => setSelectedInvoiceForPay(inv)}
                        className="px-2 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1 mx-auto cursor-pointer"
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Bayar</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Card Footer Summary */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Menampilkan {filteredInvoices.length} tagihan faktur distributor
          </span>
          <span className="text-[11px] text-slate-400">
            Total Sisa Hutang: {formatRupiah(totalRemainingDebt)}
          </span>
        </div>
      </div>

      {/* Pay Debt Modal */}
      <PayDebtModal
        invoice={selectedInvoiceForPay}
        cashInDrawer={cashInDrawer}
        onClose={() => setSelectedInvoiceForPay(null)}
        onSubmit={(paymentInput) => {
          onPayDebt(paymentInput);
          setSelectedInvoiceForPay(null);
        }}
      />
    </div>
  );
};
