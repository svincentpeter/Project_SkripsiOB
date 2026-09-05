import React, { useState } from 'react';
import { 
  PlusCircle, 
  Upload, 
  Calendar, 
  AlertCircle, 
  Sparkles, 
  X, 
  FileCheck2, 
  Loader2,
  Info
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
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onAddExpense,
  cashInDrawer,
  bankBalance = 35000000,
  existingExpenses,
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

  // Process and compress image file
  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('File harus berupa gambar (JPG, PNG, WebP)!');
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
      console.error('Failed to compress image:', err);
      // Fallback: baca langsung
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

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (numericAmount <= 0) {
      setFormError('Nominal biaya harus lebih dari Rp 0!');
      return;
    }

    if (isCash && numericAmount > cashInDrawer) {
      setFormError(`Saldo Kas Laci tidak mencukupi (${formatRupiah(cashInDrawer)}). Pilih rekening Bank BCA atau sesuaikan pengeluaran.`);
      return;
    }

    if (!isCash && bankBalance && numericAmount > bankBalance) {
      setFormError(`Saldo Rekening Bank BCA tidak mencukupi (${formatRupiah(bankBalance)}).`);
      return;
    }

    if (!paidTo.trim()) {
      setFormError('Nama pihak penerima pembayaran / toko harus diisi!');
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
      attachment_path: receiptImage ? 'compressed_receipt.jpg' : undefined,
      approved_by: approvedBy.trim() || 'Supervisor - Wahyu',
      status: 'ACTIVE',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onAddExpense(expenseRecord);

    // Reset Form
    setDescription('');
    setPaidTo('');
    setNominalInput(0);
    setReceiptImage(null);
    setOriginalFileSizeKb(null);
    setImageSizeKb(0);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-blue-600" />
          <span>Form Input Biaya Operasional Toko (BKK)</span>
        </h3>
        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          No. Terbit: {nextBkkNumber}
        </span>
      </div>

      <form onSubmit={handleSubmitExpense} className="space-y-4 text-xs">
        {/* Kategori & Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-800 font-bold block mb-1">Kategori Beban Operasional:</label>
            <select
              value={category}
              onChange={(e) => {
                const newCat = e.target.value as ExpenseCategory;
                setCategory(newCat);
                if (EXPENSE_CATEGORY_CONFIG[newCat]?.default_cash_source) {
                  setCashSource(EXPENSE_CATEGORY_CONFIG[newCat].default_cash_source!);
                }
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c} ({EXPENSE_CATEGORY_CONFIG[c]?.account_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-slate-800 font-bold block mb-1">Tanggal Transaksi:</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
              />
            </div>
          </div>
        </div>

        {/* Nominal (Auto formatted) & Sumber Kas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-800 font-bold block mb-1">
              Nominal Pengeluaran (Rp):
            </label>
            <MoneyInput
              value={nominalInput}
              onChange={(val) => setNominalInput(val)}
              prefix="Rp"
              placeholder="0"
              className="w-full pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-bold text-sm focus-ring"
            />
            {numericAmount > 0 && (
              <span className="text-[11px] text-amber-800 font-mono mt-0.5 block font-bold">
                Terbilang: {formatRupiah(numericAmount)}
              </span>
            )}
          </div>

          <div>
            <label className="text-slate-800 font-bold block mb-1">Sumber Kas / Rekening:</label>
            <select
              value={cashSource}
              onChange={(e) => setCashSource(e.target.value as CashSource)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            >
              <option value="Kas Tunai Laci Kasir">
                Kas Tunai Laci Kasir (Saldo: {formatRupiah(cashInDrawer)})
              </option>
              <option value="Rekening Bank BCA (Cabang 3)">
                Rekening Bank BCA (Saldo: {formatRupiah(bankBalance)})
              </option>
            </select>
          </div>
        </div>

        {/* Dibayarkan Kepada & Otorisasi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-slate-800 font-bold block mb-1">Dibayarkan Kepada (Penerima):</label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="Nama toko / montir / instansi / CV..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            />
          </div>

          <div>
            <label className="text-slate-800 font-bold block mb-1">Disetujui Oleh (Otorisasi):</label>
            <input
              type="text"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
              placeholder="Supervisor / Manajer Toko"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
            />
          </div>
        </div>

        {/* Keterangan */}
        <div>
          <label className="text-slate-800 font-bold block mb-1">Keterangan / Rincian Pengeluaran:</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Rincian pembelian barang / perbaikan / keperluan bengkel..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring"
          />
        </div>

        {/* Upload Foto Nota dengan Auto Canvas Compression */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-700 font-semibold block">
              Upload Foto Nota / Kuitansi Fisik:
            </label>
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <Info className="w-3 h-3 text-blue-600" />
              Auto-kompresi aman memori browser
            </span>
          </div>

          {isCompressing ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>Mengompresi foto nota dengan Canvas...</span>
            </div>
          ) : receiptImage ? (
            <div className="relative p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={receiptImage}
                  alt="Nota Fisik"
                  className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                    Bukti_Nota_Fisik.jpg
                  </span>
                  <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                    {originalFileSizeKb && (
                      <span className="line-through text-slate-400">Asli: {originalFileSizeKb} KB</span>
                    )}
                    <span className="text-emerald-700 font-mono font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
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
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center cursor-pointer transition-colors bg-slate-50/60"
              onClick={() => document.getElementById('receipt-file-input')?.click()}
            >
              <Upload className="w-6 h-6 mx-auto text-slate-400 mb-1" />
              <span className="text-xs font-semibold text-slate-700 block">
                Tarik & Lepas Foto Nota atau Klik untuk Menelusuri
              </span>
              <span className="text-[10px] text-slate-400">
                Otomatis dikompres ke format web ringan (JPG/WebP &lt; 150KB)
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

        {/* PREVIEW JURNAL AKUNTANSI OTOMATIS (Double-Entry SAK EMKM) */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Preview Jurnal Akuntansi Double-Entry Otomatis:</span>
            </span>
            <span className="text-[10px] bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-700 font-mono font-bold shadow-2xs">
              SAK EMKM
            </span>
          </div>

          <div className="bg-white rounded-lg p-3 border border-slate-200 font-mono text-[11px] space-y-2 shadow-2xs">
            {/* Debit Line */}
            <div className="flex items-center justify-between text-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-blue-700 font-black">(D)</span>
                <span className="font-semibold">{activeMapping.account_code} - {activeMapping.account_name}</span>
              </div>
              <span className="font-black text-slate-900">{formatRupiah(numericAmount || 0)}</span>
            </div>

            {/* Credit Line */}
            <div className="flex items-center justify-between text-slate-800 pl-4 border-t border-slate-100 pt-1.5">
              <div className="flex items-center gap-2">
                <span className="text-amber-700 font-black">(K)</span>
                <span className="font-semibold">{creditAccountCode} - {creditAccountName}</span>
              </div>
              <span className="font-black text-slate-900">{formatRupiah(numericAmount || 0)}</span>
            </div>
          </div>
        </div>

        {formError && (
          <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Simpan Biaya ({nextBkkNumber}) & Posting Jurnal</span>
        </button>
      </form>
    </div>
  );
};
