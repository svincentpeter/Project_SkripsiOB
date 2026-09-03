import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, Scale } from 'lucide-react';
import { ManualJournalInput } from '../../../shared/types';
import { SAK_EMKM_COA } from '../../../services/accountingService';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (journalInput: ManualJournalInput) => void;
}

export const ManualJournalModal: React.FC<ManualJournalModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [refDoc, setRefDoc] = useState(`MEM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-01`);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<
    { account_code: string; debit: number; credit: number; note: string }[]
  >([
    { account_code: '6-1006', debit: 1500000, credit: 0, note: 'Beban Penyusutan Mesin Spooring 3D' },
    { account_code: '1-3999', debit: 0, credit: 1500000, note: 'Akumulasi Penyusutan Mesin' },
  ]);

  if (!isOpen) return null;

  const totalDebit = lines.reduce((acc, l) => acc + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((acc, l) => acc + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && totalCredit > 0 && difference < 1;

  const handleAddLine = () => {
    setLines([
      ...lines,
      { account_code: '1-1000', debit: 0, credit: 0, note: '' },
    ]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleUpdateLine = (index: number, field: string, value: any) => {
    setLines(
      lines.map((line, i) => {
        if (i === index) {
          return { ...line, [field]: value };
        }
        return line;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced || !description.trim()) return;

    onSubmit({
      date,
      ref_doc: refDoc,
      description: description.trim(),
      lines: lines.map((l) => {
        const acc = SAK_EMKM_COA.find((a) => a.account_code === l.account_code);
        return {
          account_code: l.account_code,
          account_name: acc ? acc.account_name : 'Akun Transaksi',
          debit: l.debit,
          credit: l.credit,
          note: l.note || description,
        };
      }),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Input Jurnal Penyesuaian / Memorial Manual</h2>
              <p className="text-xs text-slate-400">Pencatatan berpasangan SAK EMKM (Wajib Debit = Kredit)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tanggal Jurnal *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                No. Bukti / Referensi Memorial *
              </label>
              <input
                type="text"
                value={refDoc}
                onChange={(e) => setRefDoc(e.target.value)}
                placeholder="Contoh: MEM-202609-01"
                required
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Keterangan Transaksi / Penyesuaian *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Penyesuaian penyusutan mesin bengkel bulan September 2026"
              required
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Lines Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase">
                Rincian Akun Debit & Kredit
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Akun
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5">Akun COA</th>
                      <th className="p-2.5 w-32 text-right">Debit (Rp)</th>
                      <th className="p-2.5 w-32 text-right">Kredit (Rp)</th>
                      <th className="p-2.5">Catatan</th>
                      <th className="p-2.5 w-10 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2">
                          <select
                            value={line.account_code}
                            onChange={(e) => handleUpdateLine(idx, 'account_code', e.target.value)}
                            className="w-full p-1.5 text-xs border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 font-medium text-slate-800"
                          >
                            {SAK_EMKM_COA.map((acc) => (
                              <option key={acc.account_code} value={acc.account_code}>
                                {acc.account_code} - {acc.account_name} ({acc.normal_balance})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="text"
                            value={line.debit ? line.debit.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const val = parseRupiahInput(e.target.value);
                              handleUpdateLine(idx, 'debit', val);
                              if (val > 0) handleUpdateLine(idx, 'credit', 0);
                            }}
                            placeholder="0"
                            className="w-full p-1.5 text-xs text-right font-mono border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="text"
                            value={line.credit ? line.credit.toLocaleString('id-ID') : ''}
                            onChange={(e) => {
                              const val = parseRupiahInput(e.target.value);
                              handleUpdateLine(idx, 'credit', val);
                              if (val > 0) handleUpdateLine(idx, 'debit', 0);
                            }}
                            placeholder="0"
                            className="w-full p-1.5 text-xs text-right font-mono border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={line.note}
                            onChange={(e) => handleUpdateLine(idx, 'note', e.target.value)}
                            placeholder="Catatan baris"
                            className="w-full p-1.5 text-xs border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 2}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-30 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Balance Verification */}
              <div className="bg-slate-50 p-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4 font-mono font-bold">
                  <span>Total Debit: <strong className="text-indigo-600">{formatRupiah(totalDebit)}</strong></span>
                  <span>Total Kredit: <strong className="text-emerald-600">{formatRupiah(totalCredit)}</strong></span>
                </div>

                <div>
                  {isBalanced ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Seimbang (Debit = Kredit)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Tidak Seimbang (Selisih: {formatRupiah(difference)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={!isBalanced || !description.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Simpan & Posting Jurnal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
