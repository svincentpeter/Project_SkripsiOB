import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Printer, 
  Plus, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Wallet, 
  Building2, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  TrendingDown
} from 'lucide-react';
import { ExpenseCategory, ExpenseRecord } from '../../../shared/types';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { EXPENSE_CATEGORY_CONFIG } from '../../../services/accountingService';

interface ExpenseTableProps {
  expenses: ExpenseRecord[];
  onViewDetail: (expense: ExpenseRecord) => void;
  onPrintVoucher: (expense: ExpenseRecord) => void;
  onAddNew?: () => void;
}

export const ExpenseTable: React.FC<ExpenseTableProps> = ({
  expenses,
  onViewDetail,
  onPrintVoucher,
  onAddNew,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VOID'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const categories = Object.keys(EXPENSE_CATEGORY_CONFIG) as ExpenseCategory[];

  // Quick stats
  const activeExpenses = expenses.filter((e) => e.status !== 'VOID');
  const voidExpenses = expenses.filter((e) => e.status === 'VOID');
  const totalActiveAmount = activeExpenses.reduce((acc, e) => acc + e.amount, 0);
  const cashAmount = activeExpenses
    .filter((e) => e.cash_source.includes('Laci') || e.payment_method === 'Cash')
    .reduce((acc, e) => acc + e.amount, 0);
  const bankAmount = activeExpenses
    .filter((e) => e.cash_source.includes('BCA') || e.payment_method === 'Transfer')
    .reduce((acc, e) => acc + e.amount, 0);

  // Filter Logic
  const filteredExpenses = expenses.filter((exp) => {
    const q = searchQuery.toLowerCase().trim();
    const bkk = (exp.bkk_number || exp.expense_number || '').toLowerCase();
    const desc = (exp.description || '').toLowerCase();
    const paid = (exp.paid_to || '').toLowerCase();
    const cat = (exp.category || '').toLowerCase();
    const code = (exp.category_code || '').toLowerCase();

    const matchesSearch = !q || bkk.includes(q) || desc.includes(q) || paid.includes(q) || cat.includes(q) || code.includes(q);
    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
    
    let matchesSource = true;
    if (sourceFilter === 'CASH') {
      matchesSource = exp.cash_source.includes('Laci') || exp.payment_method === 'Cash';
    } else if (sourceFilter === 'BANK') {
      matchesSource = exp.cash_source.includes('BCA') || exp.payment_method === 'Transfer';
    }

    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = exp.status !== 'VOID';
    } else if (statusFilter === 'VOID') {
      matchesStatus = exp.status === 'VOID';
    }

    return matchesSearch && matchesCategory && matchesSource && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredExpenses.length / rowsPerPage) || 1;
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Export to CSV
  const handleExportCsv = () => {
    let csv = 'No BKK,Tanggal,Kategori,Kode Akun,Nominal,Sumber Dana,Penerima,Keterangan,Otorisasi,Status,Alasan Void\n';
    filteredExpenses.forEach((exp) => {
      const bkk = exp.bkk_number || exp.expense_number;
      const code = exp.category_code || '6-xxxx';
      const status = exp.status === 'VOID' ? 'VOID' : 'ACTIVE';
      const reason = exp.void_reason ? exp.void_reason.replace(/"/g, '""') : '';
      csv += `"${bkk}","${exp.date}","${exp.category}","${code}",${exp.amount},"${exp.cash_source}","${exp.paid_to}","${exp.description.replace(/"/g, '""')}","${exp.approved_by}","${status}","${reason}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Biaya_Operasional_OB3_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Quick Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Beban Bulan Ini
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
            {formatRupiah(totalActiveAmount)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            {activeExpenses.length} transaksi aktif
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Wallet className="w-3 h-3 text-amber-600" />
            Kas Laci Toko
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
            {formatRupiah(cashAmount)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Pengeluaran tunai montir / ATK
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1">
            <Building2 className="w-3 h-3 text-blue-600" />
            Bank BCA Cabang 3
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
            {formatRupiah(bankAmount)}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Transfer PLN / sewa / mesin
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
            Status Pembukuan
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              {activeExpenses.length} Aktif
            </span>
            {voidExpenses.length > 0 && (
              <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                {voidExpenses.length} Void
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Terposting ke Buku Besar SAK EMKM
          </span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        {/* Table Top Controls & Action CTA */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              <span>Buku Riwayat Pengeluaran Kas (BKK)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar seluruh voucher kas keluar dengan kode akun buku besar SAK EMKM.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Unduh data dalam format CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            {onAddNew && (
              <button
                type="button"
                onClick={onAddNew}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Catat Pengeluaran Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari no BKK, keterangan, penerima..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            >
              <option value="ALL">Semua Kategori Beban</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            >
              <option value="ALL">Semua Sumber Pembayaran</option>
              <option value="CASH">Kas Tunai Laci Kasir</option>
              <option value="BANK">Rekening Bank BCA</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'VOID');
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            >
              <option value="ALL">Semua Status Transaksi</option>
              <option value="ACTIVE">Hanya Aktif / Posted</option>
              <option value="VOID">Hanya Batal / Void</option>
            </select>
          </div>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="py-2.5 px-3.5 whitespace-nowrap">No. BKK / Tanggal</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Kategori & Akun COA</th>
                <th className="py-2.5 px-3.5">Uraian Pengeluaran & Penerima</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Sumber Kas</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Nominal (Rp)</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Nota Fisik</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginatedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-medium text-xs">Tidak ada data biaya yang sesuai dengan kriteria pencarian.</p>
                  </td>
                </tr>
              ) : (
                paginatedExpenses.map((exp) => {
                  const isVoid = exp.status === 'VOID';
                  return (
                    <tr 
                      key={exp.id} 
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isVoid ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* No. BKK / Tanggal */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className={`font-mono font-bold block ${isVoid ? 'line-through text-slate-400' : 'text-blue-700'}`}>
                          {exp.bkk_number || exp.expense_number}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatDateIndo(exp.date)}
                        </span>
                      </td>

                      {/* Kategori & Akun COA */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{exp.category}</span>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">
                          {exp.category_code || '6-xxxx'}
                        </span>
                      </td>

                      {/* Uraian & Penerima */}
                      <td className="py-2.5 px-3.5 max-w-sm">
                        <p className={`font-medium text-slate-800 truncate ${isVoid ? 'line-through text-slate-400' : ''}`} title={exp.description}>
                          {exp.description}
                        </p>
                        <span className="text-[10px] text-slate-500 block truncate">
                          Penerima: <strong className="text-slate-700 font-medium">{exp.paid_to}</strong>
                        </span>
                      </td>

                      {/* Sumber Kas */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                          {exp.cash_source.includes('Laci') ? (
                            <Wallet className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          <span className="truncate max-w-[130px]" title={exp.cash_source}>
                            {exp.cash_source.includes('Laci') ? 'Kas Laci' : 'Bank BCA'}
                          </span>
                        </span>
                      </td>

                      {/* Nominal */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <span className={`font-mono font-black text-sm ${
                          isVoid ? 'line-through text-slate-400' : 'text-rose-700'
                        }`}>
                          -{formatRupiah(exp.amount)}
                        </span>
                      </td>

                      {/* Bukti Nota */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        {exp.receipt_image ? (
                          <button
                            type="button"
                            onClick={() => onViewDetail(exp)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                          >
                            <ImageIcon className="w-3 h-3" />
                            <span>Ada</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isVoid 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isVoid ? 'VOID' : 'POSTED'}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => onViewDetail(exp)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Lihat Detail & Nota"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintVoucher(exp)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Cetak Bukti Kas Keluar (BKK)"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Menampilkan data {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, filteredExpenses.length)} dari {filteredExpenses.length} transaksi
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
