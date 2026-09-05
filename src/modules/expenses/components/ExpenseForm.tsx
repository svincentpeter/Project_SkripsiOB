import React, { useState } from 'react';
import { 
  Receipt, 
  Upload, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileCheck, 
  Loader2,
  Wallet,
  Building2,
  UserCheck,
  Tag,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { CashSource, ExpenseCategory, ExpenseRecord } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { MoneyInput } from '../../../shared/components/MoneyInput';
import { compressImageFile, getBase64SizeKb } from '../../../shared/utils/imageCompressor';
import { EXPENSE_CATEGORY_CONFIG, generateBkkNumber } from '../../../services/accountingService';

interface ExpenseFormProps {
  onAddExpense: (expense: ExpenseRecord) => void;
  cashInDrawer: number;
  bankBalance?: number;
  existingExpenses: ExpenseRecord[];
  onSuccessNavigate?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onAddExpense,
  cashInDrawer,
  bankBalance = 35000000,
  existingExpenses,
  onSuccessNavigate,
}) => {
  const categories = Object.keys(EXPENSE_CATEGORY_CONFIG) as ExpenseCategory[];

  const [category, setCategory] = useState<ExpenseCategory>('ATK & Keperluan Bengkel');
  const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [nominalInput, setNominalInput] = useState<number>(350000);
  const [cashSource, setCashSource] = useState<CashSource>('Kas Tunai Laci Kasir');
  const [paidTo, setPaidTo] = useState<string>('Toko Perkakas Teknik');
  const [description, setDescription] = useState<string>('Beli timah balancing tempel & pentil tubeless');
  const [approvedBy, setApprovedBy] = useState<string>('Kasir - Fani A.');
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [imageSizeKb, setImageSizeKb] = useState<number>(0);
  const [originalFileSizeKb, setOriginalFileSizeKb] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const numericAmount = typeof nominalInput === 'number' ? nominalInput : parseRupiahInput(String(nominalInput));

  // Auto-calculated next BKK number
  const nextBkkNumber = generateBkkNumber(existingExpenses, date);

  // Accounting mapping based on category
  const activeMapping = EXPENSE_CATEGORY_CONFIG[category] || {
    category,
    account_code: '6-1005',
    account_name: 'Beban Perlengkapan & ATK Toko',
    description: '',
  };

  const isCash = cashSource.includes('Laci');
  const creditAccountCode = isCash ? '1-1000' : '1-1001';
  const creditAccountName = isCash ? 'Kas Toko Laci Kasir' : 'Bank BCA Cabang 3';
  const currentSourceBalance = isCash ? cashInDrawer : bankBalance;

  // Process and compress image file
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('File lampiran harus berupa gambar foto (JPG, PNG, WebP)!');
      return;
    }

    setFormError('');
    setIsCompressing(true);
    const origKb = Math.round(file.size / 1024);
    setOriginalFileSizeKb(origKb);

    try {
      const compressedDataUrl = await compressImageFile(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        quality: 0.72,
        mimeType: 'image/jpeg',
      });
      setReceiptImage(compressedDataUrl);
      setImageSizeKb(getBase64SizeKb(compressedDataUrl));
    } catch (err) {
      console.error('Gagal mengompres gambar:', err);
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        setReceiptImage(res);
        setImageSizeKb(getBase64SizeKb(res));
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleResetForm = () => {
    setDescription('');
    setPaidTo('');
    setNominalInput(0);
    setReceiptImage(null);
    setOriginalFileSizeKb(null);
    setImageSizeKb(0);
    setFormError('');
  };

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (numericAmount <= 0) {
      setFormError('Nominal pengeluaran harus lebih besar dari Rp 0!');
      return;
    }

    if (isCash && numericAmount > cashInDrawer) {
      setFormError(`Saldo Kas Laci tidak mencukupi (${formatRupiah(cashInDrawer)}). Silakan pilih rekening Bank BCA atau sesuaikan nominal.`);
      return;
    }

    if (!isCash && bankBalance && numericAmount > bankBalance) {
      setFormError(`Saldo Rekening Bank BCA tidak mencukupi (${formatRupiah(bankBalance)}).`);
      return;
    }

    if (!paidTo.trim()) {
      setFormError('Nama pihak penerima pembayaran / toko wajib diisi!');
      return;
    }

    const bkkRef = generateBkkNumber(existingExpenses, date);
    const expenseRecord: ExpenseRecord = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      reference: bkkRef,
      expense_number: bkkRef,
      bkk_number: bkkRef,
      date,
      category,
      category_code: activeMapping.account_code,
      amount: numericAmount,
      cash_source: cashSource,
      payment_method: isCash ? 'Cash' : 'Transfer',
      bank_name: isCash ? undefined : 'BCA',
      paid_to: paidTo.trim(),
      description: description.trim() || activeMapping.description || category,
      receipt_image: receiptImage || undefined,
      attachment_path: receiptImage ? 'nota_terkompresi.jpg' : undefined,
      approved_by: approvedBy.trim() || 'Supervisor - Wahyu',
      status: 'ACTIVE',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onAddExpense(expenseRecord);
    setIsSuccess(true);
    handleResetForm();

    setTimeout(() => {
      setIsSuccess(false);
      if (onSuccessNavigate) {
        onSuccessNavigate();
      }
    }, 1800);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Alert Banner Sukses */}
      {isSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm block">Pengeluaran Kas Berhasil Dibukukan!</span>
              <span className="text-emerald-700">Nomor BKK telah diterbitkan dan jurnal SAK EMKM telah diposting ke Buku Besar.</span>
            </div>
          </div>
          {onSuccessNavigate && (
            <button
              type="button"
              onClick={onSuccessNavigate}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Riwayat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Main 2-Column Split Grid */}
      <form onSubmit={handleSubmitExpense} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Data Utama Pengeluaran (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-700" />
              <h3 className="font-extrabold text-sm text-slate-900">
                Data Bukti Kas Keluar (BKK)
              </h3>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              No. Terbit: {nextBkkNumber}
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Kategori & Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kategori Beban Usaha:</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value as ExpenseCategory;
                    setCategory(newCat);
                    if (EXPENSE_CATEGORY_CONFIG[newCat]?.default_cash_source) {
                      setCashSource(EXPENSE_CATEGORY_CONFIG[newCat].default_cash_source!);
                    }
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus-ring"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c} ({EXPENSE_CATEGORY_CONFIG[c]?.account_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tanggal Pembayaran:</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus-ring"
                />
              </div>
            </div>

            {/* Nominal & Sumber Kas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">
                  Nominal Pengeluaran:
                </label>
                <MoneyInput
                  value={nominalInput}
                  onChange={(val) => setNominalInput(val)}
                  prefix="Rp"
                  placeholder="0"
                  className="w-full pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus-ring placeholder:text-slate-300 placeholder:font-light"
                />
                {numericAmount > 0 && (
                  <span className="text-[11px] text-amber-800 font-mono mt-1 block font-bold">
                    Terbilang: {formatRupiah(numericAmount)}
                  </span>
                )}
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1.5">
                  {isCash ? <Wallet className="w-3.5 h-3.5 text-amber-600" /> : <Building2 className="w-3.5 h-3.5 text-blue-600" />}
                  <span>Sumber Kas / Bank:</span>
                </label>
                <select
                  value={cashSource}
                  onChange={(e) => setCashSource(e.target.value as CashSource)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-semibold focus-ring"
                >
                  <option value="Kas Tunai Laci Kasir">
                    Kas Tunai Laci Kasir (Saldo: {formatRupiah(cashInDrawer)})
                  </option>
                  <option value="Rekening Bank BCA (Cabang 3)">
                    Rekening Bank BCA (Saldo: {formatRupiah(bankBalance)})
                  </option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Sisa saldo tersedia: <strong className="text-slate-700 font-mono">{formatRupiah(currentSourceBalance)}</strong>
                </span>
              </div>
            </div>

            {/* Dibayarkan Kepada & Otorisasi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-700 font-bold block mb-1.5">
                  Dibayarkan Kepada (Penerima Uang):
                </label>
                <input
                  type="text"
                  value={paidTo}
                  onChange={(e) => setPaidTo(e.target.value)}
                  placeholder="Contoh: Toko Perkakas BSD / Montir Agus / PLN..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              <div>
                <label className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Diotorisasi / Disetujui Oleh:</span>
                </label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Nama manajer atau supervisor yang mengesahkan..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
            </div>

            {/* Keterangan */}
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">
                Rincian & Keterangan Pengeluaran:
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tuliskan keterangan detail keperluan belanja, nomor faktur pihak ketiga, kuantitas barang yang dibeli..."
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light leading-relaxed"
              />
            </div>

            {/* Upload Foto Nota dengan Kompresi Otomatis */}
            <div>
              <label className="text-slate-700 font-bold block mb-1.5">
                Lampiran Foto Nota / Kuitansi Fisik:
              </label>

              {isCompressing ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Mengompresi foto nota menggunakan Canvas...</span>
                </div>
              ) : receiptImage ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={receiptImage}
                      alt="Nota Fisik"
                      className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        Foto_Nota_Fisik.jpg
                      </span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        {originalFileSizeKb && (
                          <span className="line-through text-slate-400">Asli: {originalFileSizeKb} KB</span>
                        )}
                        <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          Tersimpan: {imageSizeKb} KB
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImage(null);
                      setOriginalFileSizeKb(null);
                      setImageSizeKb(0);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Hapus foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/50"
                  onClick={() => document.getElementById('receipt-file-input')?.click()}
                >
                  <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-700 block">
                    Tarik & Lepas Foto Nota atau Klik untuk Menelusuri File
                  </span>
                  <span className="text-[11px] text-slate-400 placeholder:font-light">
                    Otomatis dikompres ke format web ringan (&lt; 150KB) untuk menghemat memori browser
                  </span>
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
          </div>
        </div>

        {/* RIGHT COLUMN: Review Akuntansi & Eksekusi Simpan (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Panel Preview Jurnal Double-Entry SAK EMKM */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pratinjau Jurnal SAK EMKM
              </span>
              <span className="text-[10px] bg-slate-100 text-slate-700 font-mono font-bold px-2 py-0.5 rounded">
                Double-Entry
              </span>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 font-mono text-[11px] space-y-2.5">
              {/* Debit Line */}
              <div className="flex items-center justify-between text-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-blue-700 font-black">(D)</span>
                  <div>
                    <span className="font-bold block">{activeMapping.account_code}</span>
                    <span className="text-[10px] text-slate-600 font-sans">{activeMapping.account_name}</span>
                  </div>
                </div>
                <span className="font-black text-slate-900">{formatRupiah(numericAmount || 0)}</span>
              </div>

              {/* Credit Line */}
              <div className="flex items-center justify-between text-slate-800 pl-4 border-t border-slate-200 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-700 font-black">(K)</span>
                  <div>
                    <span className="font-bold block">{creditAccountCode}</span>
                    <span className="text-[10px] text-slate-600 font-sans">{creditAccountName}</span>
                  </div>
                </div>
                <span className="font-black text-slate-900">{formatRupiah(numericAmount || 0)}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed pt-1">
              Saat disimpan, sistem akan secara otomatis memotong saldo fisik {isCash ? 'Kas Laci' : 'Bank BCA'} dan memposting transaksi ke Buku Besar tanpa perlu jurnal manual.
            </div>
          </div>

          {/* Form Error Message */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Tombol Aksi Simpan & Reset */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-2.5">
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
            >
              <Receipt className="w-4 h-4" />
              <span>Simpan & Posting Bukti Kas Keluar</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Reset Formulir</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
