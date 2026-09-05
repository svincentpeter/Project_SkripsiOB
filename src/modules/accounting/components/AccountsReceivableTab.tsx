import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  DollarSign,
  ArrowDownRight,
  Filter,
  Car,
  X,
  Wallet
} from 'lucide-react';
import { ReceivableInvoice, ReceivablePaymentInput } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface AccountsReceivableTabProps {
  invoices: ReceivableInvoice[];
  onPayReceivable: (payment: ReceivablePaymentInput) => void;
}

export const AccountsReceivableTab: React.FC<AccountsReceivableTabProps> = ({
  invoices,
  onPayReceivable,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS'>('ALL');
  
  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<ReceivableInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [destinationAccount, setDestinationAccount] = useState<'1-1000' | '1-1001'>('1-1000');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [operator, setOperator] = useState('Kasir Toko Cabang 3');

  // Metrics Calculation
  const totalAmount = invoices.reduce((acc, inv) => acc + inv.total_amount, 0);
  const totalPaid = invoices.reduce((acc, inv) => acc + inv.paid_amount, 0);
  const totalRemaining = invoices.reduce((acc, inv) => acc + inv.remaining_amount, 0);
  const unpaidCount = invoices.filter((inv) => inv.status !== 'LUNAS').length;

  // Filtered List
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inv.vehicle_plate && inv.vehicle_plate.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenPaymentModal = (inv: ReceivableInvoice) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.remaining_amount);
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setDestinationAccount('1-1000');
    setPaymentNotes(`Pelunasan faktur piutang ${inv.invoice_number}`);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || paymentAmount <= 0) return;

    onPayReceivable({
      receivable_invoice_id: selectedInvoice.id,
      payment_date: paymentDate,
      amount: paymentAmount,
      destination_account_code: destinationAccount,
      notes: paymentNotes,
      operator: operator,
    });

    setSelectedInvoice(null);
  };

  // Export to CSV
  const handleExportCsv = () => {
    let csv = 'BUKU PEMBANTU PIUTANG PELANGGAN (AR SUB-LEDGER) - BENGKEL OMAH BAN BSD\n';
    csv += 'No. Faktur,Tanggal,Jatuh Tempo,Nama Pelanggan,No. Polisi,Total Faktur,Terbayar,Sisa Piutang,Status\n';
    invoices.forEach((inv) => {
      csv += `"${inv.invoice_number}","${inv.date}","${inv.due_date}","${inv.customer_name}","${inv.vehicle_plate || '-'}","${inv.total_amount}","${inv.paid_amount}","${inv.remaining_amount}","${inv.status}"\n`;
    });
    csv += `\nTOTAL PIUTANG: ${totalAmount}, TOTAL TERTAGIH: ${totalPaid}, TOTAL SISA: ${totalRemaining}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Buku_Pembantu_Piutang_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full">
      {/* Main Unified Card ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Card Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              <span>Buku Pembantu Piutang Pelanggan (AR Sub-Ledger)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rincian faktur piutang pelanggan tempo yang tersinkronisasi otomatis dengan Akun 1-1002 Piutang Dagang SAK EMKM.
            </p>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors border border-slate-200 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh Data Piutang (CSV)</span>
          </button>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Faktur Piutang</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
              {formatRupiah(totalAmount)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              {invoices.length} total tagihan tercatat
            </span>
          </div>

          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Telah Tertagih</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 block mt-0.5">
              {formatRupiah(totalPaid)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5 block">
              Masuk Kas Toko / Bank BCA
            </span>
          </div>

          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Sisa Piutang Berjalan (1-1002)</span>
            <span className="text-base sm:text-lg font-black font-mono text-blue-800 block mt-0.5">
              {formatRupiah(totalRemaining)}
            </span>
            <span className="text-[10px] text-blue-700 font-bold mt-0.5 block">
              Saldo Aktif COA 1-1002
            </span>
          </div>

          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Faktur Belum Lunas</span>
            <span className="text-base sm:text-lg font-black font-mono text-amber-800 block mt-0.5">
              {unpaidCount} Faktur
            </span>
            <span className="text-[10px] text-amber-700 font-medium mt-0.5 block">
              Menunggu pembayaran
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari no. faktur, nama pelanggan, atau nomor plat polisi..."
              className="w-full pl-9 pr-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-light"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
            {(['ALL', 'BELUM_LUNAS', 'SEBAGIAN', 'LUNAS'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'ALL' ? 'Semua Status' : status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table Container - Strict Zero Scroll */}
        <div className="w-full overflow-hidden rounded-xl border border-slate-200">
          <table className="table-fixed w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-28">No. Faktur</th>
                <th className="py-2.5 px-3 w-28">Tgl / Tempo</th>
                <th className="py-2.5 px-3">Pelanggan & Kendaraan</th>
                <th className="py-2.5 px-3 w-28 text-right">Total Faktur</th>
                <th className="py-2.5 px-3 w-28 text-right">Terbayar</th>
                <th className="py-2.5 px-3 w-32 text-right bg-slate-100/60">Sisa Piutang</th>
                <th className="py-2.5 px-3 w-24 text-center">Status</th>
                <th className="py-2.5 px-3 w-24 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans text-xs">
                    Tidak ada faktur piutang yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 px-3 font-bold text-blue-700 truncate">
                      {inv.invoice_number}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600">
                      <span className="block text-slate-800 font-medium">{formatDateIndo(inv.date)}</span>
                      <span className="block text-[10px] text-amber-700">Tempo: {formatDateIndo(inv.due_date)}</span>
                    </td>
                    <td className="py-2 px-3 font-sans truncate">
                      <span className="font-bold text-slate-900 block truncate">{inv.customer_name}</span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        {inv.vehicle_plate && (
                          <span className="font-mono bg-slate-100 px-1 rounded text-slate-700 border border-slate-200">
                            {inv.vehicle_plate}
                          </span>
                        )}
                        {inv.customer_phone && <span>• {inv.customer_phone}</span>}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-slate-700">
                      {formatRupiah(inv.total_amount)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                      {formatRupiah(inv.paid_amount)}
                    </td>
                    <td className="py-2 px-3 text-right font-black text-slate-900 bg-slate-50">
                      {formatRupiah(inv.remaining_amount)}
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'LUNAS'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inv.status === 'SEBAGIAN'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center font-sans">
                      {inv.remaining_amount > 0 ? (
                        <button
                          onClick={() => handleOpenPaymentModal(inv)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition-colors border border-blue-200 cursor-pointer"
                        >
                          Bayar
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Lunas</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200 font-mono text-xs">
              <tr>
                <td colSpan={3} className="py-2 px-3 text-right font-sans font-bold">
                  TOTAL SUB-LEDGER:
                </td>
                <td className="py-2 px-3 text-right text-slate-900">{formatRupiah(totalAmount)}</td>
                <td className="py-2 px-3 text-right text-emerald-700">{formatRupiah(totalPaid)}</td>
                <td className="py-2 px-3 text-right text-blue-900 bg-slate-100 font-black">
                  {formatRupiah(totalRemaining)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment Received Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wide">Terima Pembayaran Piutang</h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Faktur: {selectedInvoice.invoice_number}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4 text-xs">
              {/* Customer & Balance summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelanggan:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-mono text-slate-800">{formatRupiah(selectedInvoice.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Piutang Saat Ini:</span>
                  <span className="font-bold font-mono text-blue-700">{formatRupiah(selectedInvoice.remaining_amount)}</span>
                </div>
              </div>

              {/* Destination Account */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Rekening Kas Masuk (SAK EMKM)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDestinationAccount('1-1000')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      destinationAccount === '1-1000'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Wallet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-[11px]">1-1000 Kas Toko</span>
                      <span className="text-[10px] text-slate-500">Laci Kasir</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDestinationAccount('1-1001')}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                      destinationAccount === '1-1001'
                        ? 'border-blue-600 bg-blue-50/60 text-blue-900 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold block text-[11px]">1-1001 Bank BCA</span>
                      <span className="text-[10px] text-slate-500">Rekening Cabang 3</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nominal Diterima (Rp)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedInvoice.remaining_amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-light"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Maksimal pelunasan: {formatRupiah(selectedInvoice.remaining_amount)}
                </span>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tanggal Penerimaan
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 font-mono text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan Transaksi
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Keterangan pembayaran piutang..."
                  className="w-full px-3 py-2 font-medium text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Simpan Pembayaran & Buat Jurnal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
