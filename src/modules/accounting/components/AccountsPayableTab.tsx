import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
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

  // Export AP Sub-Ledger to CSV
  const handleExportApCsv = () => {
    let csv = 'BUKU PEMBANTU HUTANG DAGANG DISTRIBUTOR (AP SUB-LEDGER) - OMAH BAN CABANG 3\n';
    csv += `Tanggal: ${new Date().toISOString().substring(0, 10)}\n\n`;
    csv += 'No Faktur,Distributor,Tanggal Faktur,Jatuh Tempo,Total Tagihan,Sudah Dibayar,Sisa Hutang,Status,Catatan\n';

    invoices.forEach((i) => {
      csv += `"${i.invoice_number}","${i.supplier_name}","${i.date}","${i.due_date}",${i.total_amount},${i.paid_amount},${i.remaining_amount},"${i.status}","${i.notes || ''}"\n`;
    });

    csv += `\nTOTAL TAGIHAN: ${totalInvoiced}, TOTAL DIBAYAR: ${totalPaid}, SISA HUTANG: ${totalRemainingDebt}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Buku_Pembantu_Hutang_OB3_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* 4 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Faktur Tagihan</span>
          <span className="text-lg font-black font-mono text-slate-800 block mt-1">
            {formatRupiah(totalInvoiced)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
            {invoices.length} faktur distributor
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Sudah Dilunasi</span>
          <span className="text-lg font-black font-mono text-emerald-700 block mt-1">
            {formatRupiah(totalPaid)}
          </span>
          <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
            Terbayar via Kas & Bank
          </span>
        </div>

        <div className="bg-amber-900 text-white rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-amber-200 uppercase tracking-wider block">Sisa Hutang Dagang (2-1000)</span>
          <span className="text-xl font-black font-mono text-white block mt-1">
            {formatRupiah(totalRemainingDebt)}
          </span>
          <span className="text-[11px] text-amber-300 font-medium mt-0.5 block">
            Kewajiban aktif lancar
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Faktur Belum Lunas</span>
          <span className="text-lg font-black font-mono text-slate-800 block mt-1">
            {unpaidCount} <span className="text-xs font-normal text-slate-500">tagihan</span>
          </span>
          <span className="text-[11px] text-amber-600 font-medium mt-0.5 block">
            Perlu diperhatikan jatuh temponya
          </span>
        </div>
      </div>

      {/* Control Bar: Search & Status Filter */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari distributor atau nomor faktur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                statusFilter === 'ALL' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter('UNPAID')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                statusFilter === 'UNPAID' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Lunas ({unpaidCount})
            </button>
            <button
              onClick={() => setStatusFilter('PAID')}
              className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                statusFilter === 'PAID' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lunas ({invoices.length - unpaidCount})
            </button>
          </div>
        </div>

        <button
          onClick={handleExportApCsv}
          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-200"
        >
          <Download className="w-3.5 h-3.5" />
          Ekspor CSV
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Buku Pembantu Hutang Supplier (Accounts Payable Sub-Ledger)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500 font-bold">
            {filteredInvoices.length} tagihan terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3 w-36">No. Faktur</th>
                <th className="p-3">Distributor Ban</th>
                <th className="p-3 w-28">Tanggal</th>
                <th className="p-3 w-28">Jatuh Tempo</th>
                <th className="p-3 w-32 text-right">Total Tagihan</th>
                <th className="p-3 w-32 text-right">Sudah Dibayar</th>
                <th className="p-3 w-32 text-right bg-amber-50/50">Sisa Hutang</th>
                <th className="p-3 w-28 text-center">Status</th>
                <th className="p-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/70">
                  <td className="p-3 font-bold text-indigo-700">{inv.invoice_number}</td>
                  <td className="p-3 font-sans">
                    <span className="font-bold text-slate-900 block">{inv.supplier_name}</span>
                    {inv.notes && <span className="text-[11px] text-slate-400 block">{inv.notes}</span>}
                  </td>
                  <td className="p-3 font-sans text-slate-600">{formatDateIndo(inv.date)}</td>
                  <td className="p-3 font-sans text-slate-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatDateIndo(inv.due_date)}
                    </span>
                  </td>
                  <td className="p-3 text-right font-bold text-slate-800">
                    {formatRupiah(inv.total_amount)}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-700">
                    {formatRupiah(inv.paid_amount)}
                  </td>
                  <td className="p-3 text-right font-black text-amber-800 bg-amber-50/30">
                    {formatRupiah(inv.remaining_amount)}
                  </td>
                  <td className="p-3 text-center font-sans">
                    {inv.status === 'LUNAS' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Lunas
                      </span>
                    ) : inv.status === 'SEBAGIAN' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Sebagian
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        Belum Lunas
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center font-sans">
                    {inv.remaining_amount > 0 ? (
                      <button
                        onClick={() => setSelectedInvoiceForPay(inv)}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-2xs transition-colors flex items-center justify-center gap-1 mx-auto"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Bayar
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
