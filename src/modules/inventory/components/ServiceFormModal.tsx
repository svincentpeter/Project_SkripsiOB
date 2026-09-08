import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  X, 
  Wrench, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react';
import { ServiceCategory, ServiceCategoryItem, ServiceMasterItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { generateServiceCode } from '../../../services/serviceMasterService';

interface ServiceFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  serviceToEdit?: ServiceMasterItem | null;
  serviceCategories?: ServiceCategoryItem[];
  onClose: () => void;
  onSave: (serviceData: Omit<ServiceMasterItem, 'id' | 'is_active'>, serviceId?: string) => void;
}

const DEFAULT_CATEGORIES: { value: string; label: string }[] = [
  { value: 'SPOORING', label: 'Spooring 3D Digital' },
  { value: 'BALANCING', label: 'Balancing Roda & Timah' },
  { value: 'BONGKAR_PASANG', label: 'Bongkar Pasang & Rotasi' },
  { value: 'PERBAIKAN_BAN', label: 'Tambal & Servis Ban' },
  { value: 'NITROGEN', label: 'Pengisian Gas Nitrogen' },
  { value: 'GANTI_OLI', label: 'Servis Ringan & Ganti Oli' },
];

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  mode,
  serviceToEdit,
  serviceCategories = [],
  onClose,
  onSave,
}) => {
  const categoryOptions = serviceCategories.length > 0
    ? serviceCategories.map((sc) => ({ value: sc.code, label: sc.name }))
    : DEFAULT_CATEGORIES;

  const [serviceName, setServiceName] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('SPOORING');
  const [standardPrice, setStandardPrice] = useState<number>(150000);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (mode === 'EDIT' && serviceToEdit) {
      setServiceName(serviceToEdit.service_name);
      setServiceCode(serviceToEdit.service_code);
      setCategory(serviceToEdit.category);
      setStandardPrice(serviceToEdit.standard_price);
      setCostPrice(serviceToEdit.cost_price || 0);
      setDescription(serviceToEdit.description || '');
    } else {
      setServiceName('');
      setCategory('SPOORING');
      setServiceCode(generateServiceCode('SPOORING'));
      setStandardPrice(150000);
      setCostPrice(0);
      setDescription('');
    }
  }, [isOpen, mode, serviceToEdit]);

  const handleCategoryChange = (newCat: ServiceCategory) => {
    setCategory(newCat);
    if (mode === 'CREATE') {
      setServiceCode(generateServiceCode(newCat));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!serviceName.trim()) {
      setErrorMsg('Nama layanan / jasa wajib diisi.');
      return;
    }

    if (standardPrice <= 0) {
      setErrorMsg('Tarif standar layanan harus lebih besar dari 0.');
      return;
    }

    onSave(
      {
        service_name: serviceName.trim(),
        service_code: serviceCode.trim(),
        category,
        standard_price: standardPrice,
        cost_price: costPrice,
        description: description.trim(),
      },
      mode === 'EDIT' && serviceToEdit ? serviceToEdit.id : undefined
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${mode === 'CREATE' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} shadow-2xs`}>
              {mode === 'CREATE' ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'CREATE' ? 'Tambah Master Layanan / Jasa' : 'Edit Tarif Layanan Bengkel'}
              </h2>
              <p className="text-xs text-slate-500">
                Layanan bengkel tidak memotong stok fisik barang.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Kategori Layanan
            </label>
            <select
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as ServiceCategory)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-cyan-500 shadow-2xs"
            >
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Nama Layanan / Jasa
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Spooring 3D Digital Mobil SUV"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-cyan-500 shadow-2xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Kode Jasa
              </label>
              <input
                type="text"
                value={serviceCode}
                onChange={(e) => setServiceCode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-cyan-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Tarif ke Pelanggan (Rp)
              </label>
              <input
                type="text"
                value={formatRupiah(standardPrice)}
                onChange={(e) => setStandardPrice(parseRupiahInput(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-emerald-600 font-extrabold text-sm shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Biaya Modal Bahan (HPP) jika ada (Rp)
            </label>
            <input
              type="text"
              value={formatRupiah(costPrice)}
              onChange={(e) => setCostPrice(parseRupiahInput(e.target.value))}
              placeholder="0 jika murni tenaga bengkel"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm shadow-2xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Contoh: Timah balancing Rp 5.000 / Lem tambal Rp 10.000. Isi 0 jika tanpa bahan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Keterangan / SOP Pengerjaan
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Deskripsi pengerjaan layanan..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-800 text-sm shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold shadow-2xs"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold shadow-md shadow-cyan-500/20 flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              {mode === 'CREATE' ? 'Simpan Layanan' : 'Perbarui Layanan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
