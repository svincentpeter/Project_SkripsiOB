import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit3, 
  X, 
  Truck, 
  Phone, 
  Mail, 
  MapPin, 
  User, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';
import { SupplierItem } from '../../../shared/types';
import { generateSupplierCode } from '../../../services/supplierService';

interface SupplierFormModalProps {
  isOpen: boolean;
  mode: 'CREATE' | 'EDIT';
  supplierToEdit?: SupplierItem | null;
  existingSuppliers: SupplierItem[];
  onClose: () => void;
  onSave: (supplierData: Omit<SupplierItem, 'id' | 'is_active'>, supplierId?: string) => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  mode,
  supplierToEdit,
  existingSuppliers,
  onClose,
  onSave,
}) => {
  const [supplierName, setSupplierName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      return;
    }

    if (mode === 'EDIT' && supplierToEdit) {
      setSupplierName(supplierToEdit.supplier_name);
      setSupplierCode(supplierToEdit.supplier_code);
      setPhone(supplierToEdit.phone);
      setEmail(supplierToEdit.email || '');
      setAddress(supplierToEdit.address);
      setContactPerson(supplierToEdit.contact_person);
      setPaymentTermsDays(supplierToEdit.payment_terms_days || 30);
    } else {
      setSupplierName('');
      setSupplierCode(generateSupplierCode(existingSuppliers));
      setPhone('');
      setEmail('');
      setAddress('');
      setContactPerson('');
      setPaymentTermsDays(30);
    }
  }, [isOpen, mode, supplierToEdit, existingSuppliers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!supplierName.trim()) {
      setErrorMsg('Nama distributor / supplier wajib diisi.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Nomor telepon supplier wajib diisi.');
      return;
    }

    onSave(
      {
        supplier_name: supplierName.trim(),
        supplier_code: supplierCode.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || '-',
        contact_person: contactPerson.trim() || '-',
        payment_terms_days: paymentTermsDays,
      },
      mode === 'EDIT' && supplierToEdit ? supplierToEdit.id : undefined
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${mode === 'CREATE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} shadow-2xs`}>
              {mode === 'CREATE' ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {mode === 'CREATE' ? 'Tambah Distributor / Supplier' : 'Edit Data Distributor'}
              </h2>
              <p className="text-xs text-slate-500">
                Data distributor terhubung ke penerimaan barang dan hutang dagang.
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Nama Distributor / Perusahaan
              </label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. PT Bridgestone Tire Indonesia"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-bold text-sm focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Kode Supplier
              </label>
              <input
                type="text"
                value={supplierCode}
                onChange={(e) => setSupplierCode(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> No. Telepon / WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 021-89830001"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Resmi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="order@distributor.co.id"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" /> Contact Person (PIC)
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Bpk. Agus Santoso"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" /> Termin Bayar Tempo (Hari)
              </label>
              <input
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 text-sm focus:outline-none focus:border-indigo-500 shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" /> Alamat Lengkap Distributor
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              placeholder="Alamat kantor atau gudang pengiriman..."
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2"
            >
              <Truck className="w-4 h-4" />
              {mode === 'CREATE' ? 'Simpan Distributor' : 'Perbarui Distributor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
