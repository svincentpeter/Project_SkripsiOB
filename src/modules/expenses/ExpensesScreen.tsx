import React, { useState } from 'react';
import { 
  Wallet, 
  PlusCircle, 
  Upload, 
  FileText, 
  CheckCircle, 
  Image as ImageIcon, 
  X, 
  Calendar, 
  CreditCard, 
  Building2, 
  Banknote, 
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CashSource, ExpenseCategory, ExpenseRecord } from '../../shared/types';
import { formatDateIndo, formatRupiah, parseRupiahInput } from '../../shared/utils/formatters';
import { MoneyInput } from '../../shared/components/MoneyInput';

interface ExpensesScreenProps {
  expenses: ExpenseRecord[];
  onAddExpense: (expense: ExpenseRecord) => void;
  cashInDrawer: number;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  expenses,
  onAddExpense,
  cashInDrawer,
}) => {
  const categories: ExpenseCategory[] = [
    'Listrik & Air (PLN/PDAM)',
    'Gaji & Uang Makan Montir',
    'Sewa Lahan & Bangunan',
    'Transport & Pengiriman Ban',
    'ATK & Keperluan Bengkel',
    'Pemeliharaan Mesin Spooring & Balancing',
    'Konsumsi & Lembur Karyawan',
    'Pajak & Retribusi Daerah',
  ];

  // Form states
  const [category, setCategory] = useState<ExpenseCategory>('ATK & Keperluan Bengkel');
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [nominalInput, setNominalInput] = useState<number>(350000);
  const [cashSource, setCashSource] = useState<CashSource>('Kas Tunai Laci Kasir');
  const [paidTo, setPaidTo] = useState<string>('Toko Perkakas Teknik');
  const [description, setDescription] = useState<string>('Beli timah balancing tempel & pentil tubeless');
  const [approvedBy, setApprovedBy] = useState<string>('Kasir - Fani A.');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [successToast, setSuccessToast] = useState<boolean>(false);

  const numericAmount = typeof nominalInput === 'number' ? nominalInput : parseRupiahInput(String(nominalInput));

  // Auto Journal Preview Calculation
  let expenseAccountCode = '6-1006';
  let expenseAccountName = 'Beban ATK & Perlengkapan Bengkel';

  if (category.includes('Listrik')) {
    expenseAccountCode = '6-1002';
    expenseAccountName = 'Beban Listrik, Air & Utilitas';
  } else if (category.includes('Gaji')) {
    expenseAccountCode = '6-1003';
    expenseAccountName = 'Beban Gaji & Uang Makan Montir';
  } else if (category.includes('Sewa')) {
    expenseAccountCode = '6-1004';
    expenseAccountName = 'Beban Sewa Lahan Toko';
  } else if (category.includes('Transport')) {
    expenseAccountCode = '6-1005';
    expenseAccountName = 'Beban Transport & Pengiriman Ban';
  } else if (category.includes('Pemeliharaan')) {
    expenseAccountCode = '6-1007';
    expenseAccountName = 'Beban Pemeliharaan Mesin Spooring';
  } else if (category.includes('Konsumsi')) {
    expenseAccountCode = '6-1008';
    expenseAccountName = 'Beban Konsumsi & Lembur Karyawan';
  }

  const isCash = cashSource.includes('Laci');
  const creditAccountCode = isCash ? '1-1001' : '1-1002';
  const creditAccountName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';

  // File Upload Handlers (Supports Drag & Drop and File Input)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (numericAmount <= 0) {
      setFormError('Nominal biaya harus lebih dari Rp 0!');
      return;
    }

    if (isCash && numericAmount > cashInDrawer) {
      setFormError(`Saldo Kas Laci tidak mencukupi (${formatRupiah(cashInDrawer)}). Pilih rekening Bank BCA atau sesuaikan kas.`);
      return;
    }

    if (!paidTo.trim()) {
      setFormError('Nama penerima / toko harus diisi!');
      return;
    }

    const expRef = `BIAYA-OB3-202609-${Math.floor(100 + Math.random() * 900)}`;
    const expenseRecord: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      reference: expRef,
      expense_number: expRef,
      date,
      category,
      amount: numericAmount,
      cash_source: cashSource,
      payment_method: isCash ? 'Cash' : 'Transfer',
      bank_name: isCash ? undefined : 'BCA',
      paid_to: paidTo.trim(),
      description: description.trim() || category,
      receipt_image: receiptImage || undefined,
      attachment_path: receiptImage || undefined,
      approved_by: approvedBy.trim() || 'Supervisor - Wahyu',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onAddExpense(expenseRecord);

    // Reset Form
    setDescription('');
    setPaidTo('');
    setNominalInput(0);
    setReceiptImage(null);
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  const totalMonthlyExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-amber-600" />
            <span>Pengelolaan Biaya Operasional Toko (Expenses)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan pengeluaran kas kecil laci kasir dan transfer bank dengan jurnal akuntansi otomatis.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-white border border-slate-200 p-2 rounded-xl shadow-xs">
          <span className="text-slate-500">Total Biaya Bulan Ini:</span>
          <span className="font-mono font-black text-amber-700 text-sm">{formatRupiah(totalMonthlyExpenses)}</span>
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>Biaya operasional berhasil dicatat & jurnal akuntansi telah diposting otomatis ke Buku Besar!</span>
        </div>
      )}

      {/* Form and History Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Form Input Pengeluaran (7 Kolom) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            <span>Form Input Biaya / Pengeluaran Toko Cabang 3</span>
          </h3>

          <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs">
            {/* Kategori & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Kategori Biaya Operasional:</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Tanggal Transaksi:</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Nominal (Auto formatted) & Sumber Kas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">
                  Nominal Pengeluaran (Rp):
                </label>
                <MoneyInput
                  value={nominalInput}
                  onChange={(val) => setNominalInput(val)}
                  prefix="Rp"
                  placeholder="0"
                  className="w-full pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:outline-none"
                />
                {numericAmount > 0 && (
                  <span className="text-[11px] text-amber-700 font-mono mt-0.5 block font-medium">
                    Terbilang: {formatRupiah(numericAmount)}
                  </span>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Sumber Kas / Rekening:</label>
                <select
                  value={cashSource}
                  onChange={(e) => setCashSource(e.target.value as CashSource)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Kas Tunai Laci Kasir">Kas Tunai Laci Kasir (Saldo: {formatRupiah(cashInDrawer)})</option>
                  <option value="Rekening Bank BCA (Cabang 3)">Rekening Bank BCA (Cabang 3)</option>
                </select>
              </div>
            </div>

            {/* Dibayarkan Kepada & Otorisasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-semibold block mb-1">Dibayarkan Kepada (Penerima):</label>
                <input
                  type="text"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  placeholder="Nama toko / montir / instansi..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-1">Disetujui Oleh (Approval):</label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Supervisor / Manajer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1">Keterangan / Rincian Biaya:</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Rincian pembelian / pembayaran..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Upload Foto Nota / Kuitansi (Drag & Drop + Click) */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Upload Foto Nota / Bukti Kuitansi Fisik:
              </label>

              {receiptImage ? (
                <div className="relative p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={receiptImage}
                      alt="Nota Fisik"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-900 block">Nota_Fisik_Uploaded.jpg</span>
                      <span className="text-[10px] text-emerald-600 font-medium">Bukti gambar siap disimpan</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReceiptImage(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/60"
                  onClick={() => document.getElementById('receipt-file-input')?.click()}
                >
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    Tarik & Lepas Foto Nota atau Klik untuk Telusuri
                  </span>
                  <span className="text-[10px] text-slate-400">Mendukung format JPG, PNG, WebP (Maks 5MB)</span>
                  <input
                    id="receipt-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* PREVIEW JURNAL AKUNTANSI OTOMATIS (Requirements Mandate) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preview Jurnal Akuntansi Double-Entry Otomatis:</span>
                </span>
                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-mono shadow-2xs">
                  Sistem EMKM
                </span>
              </div>

              <div className="bg-white rounded-lg p-2.5 border border-slate-200 font-mono text-[11px] space-y-1.5 shadow-2xs">
                {/* Debit Line */}
                <div className="flex items-center justify-between text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-bold">(D)</span>
                    <span>{expenseAccountCode} - {expenseAccountName}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatRupiah(numericAmount || 0)}</span>
                </div>

                {/* Credit Line */}
                <div className="flex items-center justify-between text-slate-700 pl-4 border-t border-slate-100 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-amber-600 font-bold">(K)</span>
                    <span>{creditAccountCode} - {creditAccountName}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatRupiah(numericAmount || 0)}</span>
                </div>
              </div>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Simpan Biaya & Posting Jurnal</span>
            </button>
          </form>
        </div>

        {/* RIGHT: Riwayat Biaya Operasional (5 Kolom) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900">
              Riwayat Pengeluaran ({expenses.length})
            </h3>
            <span className="text-xs text-slate-400 font-mono">Bulan September 2026</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2.5 max-h-[600px]">
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Wallet className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs">Belum ada catatan biaya operasional.</p>
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex flex-col gap-1.5 hover:border-slate-300 transition-colors text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block">{exp.category}</span>
                      <span className="text-[10px] font-mono text-indigo-600 font-semibold">{exp.expense_number}</span>
                    </div>
                    <span className="font-mono font-black text-rose-600 text-sm">
                      -{formatRupiah(exp.amount)}
                    </span>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {exp.description}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>
                      Sumber: <strong className="text-slate-700">{exp.cash_source}</strong>
                    </span>
                    <span>Penerima: {exp.paid_to}</span>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span>{exp.created_at}</span>
                    <span>Appr: {exp.approved_by}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
