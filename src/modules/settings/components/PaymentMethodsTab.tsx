import React, { useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Building2, 
  QrCode, 
  Sliders,
  Info, 
  AlertCircle
} from 'lucide-react';
import { EdcSetting, PaymentProviderSetting, StoreSettings } from '../../../shared/types';
import { useToast } from '../../../shared/components';

interface PaymentMethodsTabProps {
  settings: StoreSettings;
  onUpdateSettings: (updater: (prev: StoreSettings) => StoreSettings) => void;
}

export const PaymentMethodsTab: React.FC<PaymentMethodsTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'bank' | 'qris' | 'edc' | 'account'>('bank');

  // Local state for adding Bank
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankActive, setNewBankActive] = useState(true);

  // Local state for adding QRIS
  const [newQrisName, setNewQrisName] = useState('');
  const [newQrisCode, setNewQrisCode] = useState('');
  const [newQrisFee, setNewQrisFee] = useState<number>(0.30);
  const [newQrisThreshold, setNewQrisThreshold] = useState<number>(500000);
  const [newQrisActive, setNewQrisActive] = useState(true);

  // Local state for adding new EDC Bank
  const [newEdcBankName, setNewEdcBankName] = useState('');
  const [newEdcDebitFee, setNewEdcDebitFee] = useState<number>(0.15);
  const [newEdcCreditFee, setNewEdcCreditFee] = useState<number>(2.00);

  const bankProviders = settings.bank_providers || [];
  const qrisProviders = settings.qris_providers || [];
  const edcSettings = settings.edc_settings || [];

  // ==================== BANK HANDLERS ====================
  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      toast.warning('Nama Bank Wajib', 'Masukkan nama bank transfer yang valid.');
      return;
    }

    const exists = bankProviders.some(
      (b) => b.provider_name.toLowerCase() === newBankName.trim().toLowerCase()
    );
    if (exists) {
      toast.warning('Bank Sudah Ada', `Bank "${newBankName.trim()}" sudah terdaftar.`);
      return;
    }

    const newBank: PaymentProviderSetting = {
      id: `bank-${Date.now()}`,
      method_type: 'bank',
      provider_name: newBankName.trim(),
      provider_code: newBankCode.trim().toUpperCase() || newBankName.trim().toUpperCase(),
      is_active: newBankActive,
    };

    onUpdateSettings((prev) => ({
      ...prev,
      bank_providers: [...(prev.bank_providers || []), newBank],
    }));

    setNewBankName('');
    setNewBankCode('');
    setNewBankActive(true);
    toast.success('Bank Ditambahkan', `Bank transfer ${newBank.provider_name} berhasil ditambahkan.`);
  };

  const handleToggleBankActive = (id: string | number) => {
    onUpdateSettings((prev) => ({
      ...prev,
      bank_providers: (prev.bank_providers || []).map((b) =>
        b.id === id ? { ...b, is_active: !b.is_active } : b
      ),
    }));
  };

  const handleUpdateBankField = (id: string | number, field: 'provider_name' | 'provider_code', val: string) => {
    onUpdateSettings((prev) => ({
      ...prev,
      bank_providers: (prev.bank_providers || []).map((b) =>
        b.id === id ? { ...b, [field]: val } : b
      ),
    }));
  };

  const handleDeleteBank = (id: string | number, name: string) => {
    if (!window.confirm(`Hapus bank "${name}" dari master transfer bank?`)) return;
    onUpdateSettings((prev) => ({
      ...prev,
      bank_providers: (prev.bank_providers || []).filter((b) => b.id !== id),
    }));
    toast.info('Bank Dihapus', `Bank ${name} telah dihapus dari sistem.`);
  };

  // ==================== QRIS HANDLERS ====================
  const handleAddQris = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrisName.trim()) {
      toast.warning('Nama Provider Wajib', 'Masukkan nama provider QRIS yang valid.');
      return;
    }

    const exists = qrisProviders.some(
      (q) => q.provider_name.toLowerCase() === newQrisName.trim().toLowerCase()
    );
    if (exists) {
      toast.warning('Provider Sudah Ada', `Provider QRIS "${newQrisName.trim()}" sudah terdaftar.`);
      return;
    }

    const newQris: PaymentProviderSetting = {
      id: `qris-${Date.now()}`,
      method_type: 'qris',
      provider_name: newQrisName.trim(),
      provider_code: newQrisCode.trim().toUpperCase() || newQrisName.trim().toUpperCase(),
      fee_percentage: Number(newQrisFee) || 0,
      fee_threshold_amount: Number(newQrisThreshold) || 0,
      is_active: newQrisActive,
    };

    onUpdateSettings((prev) => ({
      ...prev,
      qris_providers: [...(prev.qris_providers || []), newQris],
    }));

    setNewQrisName('');
    setNewQrisCode('');
    setNewQrisFee(0.30);
    setNewQrisThreshold(500000);
    setNewQrisActive(true);
    toast.success('Provider QRIS Ditambahkan', `Provider ${newQris.provider_name} berhasil ditambahkan.`);
  };

  const handleToggleQrisActive = (id: string | number) => {
    onUpdateSettings((prev) => ({
      ...prev,
      qris_providers: (prev.qris_providers || []).map((q) =>
        q.id === id ? { ...q, is_active: !q.is_active } : q
      ),
    }));
  };

  const handleUpdateQrisField = (
    id: string | number,
    field: 'provider_name' | 'provider_code' | 'fee_percentage' | 'fee_threshold_amount',
    val: any
  ) => {
    onUpdateSettings((prev) => ({
      ...prev,
      qris_providers: (prev.qris_providers || []).map((q) =>
        q.id === id ? { ...q, [field]: val } : q
      ),
    }));
  };

  const handleDeleteQris = (id: string | number, name: string) => {
    if (!window.confirm(`Hapus provider QRIS "${name}"?`)) return;
    onUpdateSettings((prev) => ({
      ...prev,
      qris_providers: (prev.qris_providers || []).filter((q) => q.id !== id),
    }));
    toast.info('Provider QRIS Dihapus', `Provider ${name} telah dihapus.`);
  };

  // ==================== EDC HANDLERS ====================
  const handleUpdateEdcField = (
    id: string | number,
    field: 'fee_percentage' | 'is_active',
    val: any
  ) => {
    onUpdateSettings((prev) => ({
      ...prev,
      edc_settings: (prev.edc_settings || []).map((e) =>
        e.id === id ? { ...e, [field]: val } : e
      ),
    }));
  };

  const handleAddNewEdcBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEdcBankName.trim()) {
      toast.warning('Nama Bank EDC Wajib', 'Masukkan nama bank untuk mesin EDC.');
      return;
    }

    const bName = newEdcBankName.trim();
    const existing = edcSettings.some(
      (e) => e.bank_name.toLowerCase() === bName.toLowerCase()
    );
    if (existing) {
      toast.warning('Bank Sudah Ada', `Pengaturan EDC untuk bank "${bName}" sudah ada.`);
      return;
    }

    const newDebit: EdcSetting = {
      id: `edc-${Date.now()}-debit`,
      bank_name: bName,
      payment_type: 'Debit',
      fee_percentage: Number(newEdcDebitFee) || 0,
      charge_to_customer: false,
      is_active: true,
      notes: 'Fee dipotong dari profit toko',
    };

    const newCredit: EdcSetting = {
      id: `edc-${Date.now()}-credit`,
      bank_name: bName,
      payment_type: 'Credit',
      fee_percentage: Number(newEdcCreditFee) || 0,
      charge_to_customer: true,
      is_active: true,
      notes: 'Fee dibebankan ke customer sebagai surcharge',
    };

    onUpdateSettings((prev) => ({
      ...prev,
      edc_settings: [...(prev.edc_settings || []), newDebit, newCredit],
    }));

    setNewEdcBankName('');
    setNewEdcDebitFee(0.15);
    setNewEdcCreditFee(2.00);
    toast.success('Mesin EDC Ditambahkan', `Pengaturan EDC untuk ${bName} (Debit & Kredit) berhasil ditambahkan.`);
  };

  const handleDeleteEdcBank = (bankName: string) => {
    if (!window.confirm(`Hapus seluruh konfigurasi EDC untuk bank "${bankName}"?`)) return;
    onUpdateSettings((prev) => ({
      ...prev,
      edc_settings: (prev.edc_settings || []).filter((e) => e.bank_name !== bankName),
    }));
    toast.info('EDC Dihapus', `Konfigurasi EDC bank ${bankName} telah dihapus.`);
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigasi */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('bank')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'bank'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Transfer Bank</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'bank' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {bankProviders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('qris')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'qris'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Provider QRIS</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'qris' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {qrisProviders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('edc')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'edc'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Pengaturan Fee EDC</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeSubTab === 'edc' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {edcSettings.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('account')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeSubTab === 'account'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Rekening Utama Nota</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: TRANSFER BANK                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'bank' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Tambah Bank */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tambah Bank Transfer</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bank ini akan langsung muncul di pilihan checkout kasir.
              </p>
            </div>

            <form onSubmit={handleAddBank} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Contoh: BCA, Mandiri, BNI, BRI, Permata"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kode Bank (Opsional)
                </label>
                <input
                  type="text"
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  placeholder="Contoh: BCA, MDR, BNI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newBankActive}
                    onChange={(e) => setNewBankActive(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
                  />
                  <span>Aktifkan Langsung untuk Kasir</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Bank Baru</span>
              </button>
            </form>
          </div>

          {/* Tabel Master Transfer Bank */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Master Transfer Bank</h3>
                <p className="text-xs text-slate-500">
                  Total {bankProviders.length} bank terdaftar di sistem.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama Bank</th>
                    <th className="px-4 py-3 text-left">Kode</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bankProviders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                        Belum ada data bank transfer.
                      </td>
                    </tr>
                  ) : (
                    bankProviders.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={b.provider_name}
                            onChange={(e) => handleUpdateBankField(b.id, 'provider_name', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 font-bold text-slate-900 text-xs w-full max-w-[200px]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={b.provider_code || ''}
                            onChange={(e) => handleUpdateBankField(b.id, 'provider_code', e.target.value)}
                            placeholder="-"
                            className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 font-mono font-semibold text-slate-700 text-xs w-24"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleBankActive(b.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              b.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {b.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(b.id, b.provider_name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus bank"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PROVIDER QRIS                                                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'qris' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Tambah Provider QRIS */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tambah Provider QRIS</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola provider e-wallet / mobile banking untuk penerimaan QRIS toko.
              </p>
            </div>

            <form onSubmit={handleAddQris} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Provider
                </label>
                <input
                  type="text"
                  value={newQrisName}
                  onChange={(e) => setNewQrisName(e.target.value)}
                  placeholder="Contoh: GoPay, OVO, DANA, BCA QRIS"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Kode Provider
                </label>
                <input
                  type="text"
                  value={newQrisCode}
                  onChange={(e) => setNewQrisCode(e.target.value)}
                  placeholder="Contoh: GOPAY, OVO"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              {/* Card Pengaturan Potongan MDR */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-3">
                <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-xs">
                  <Info className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Kalkulasi Potongan MDR Toko</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Potongan QRIS (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={newQrisFee}
                      onChange={(e) => setNewQrisFee(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-emerald-300 rounded-xl pl-3 pr-7 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-1.5 text-xs text-slate-400 font-bold">%</span>
                  </div>
                  <p className="text-[10px] text-emerald-800 mt-1">
                    Biaya dipotong dari penerimaan toko, bukan menambah total bayar customer.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                    Batas Minimal Nominal (Rp)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    min="0"
                    value={newQrisThreshold}
                    onChange={(e) => setNewQrisThreshold(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-white border border-emerald-300 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
                  />
                  <p className="text-[10px] text-emerald-800 mt-1">
                    Potongan MDR aktif jika pembayaran QRIS lebih besar dari nominal ini.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newQrisActive}
                    onChange={(e) => setNewQrisActive(e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
                  />
                  <span>Aktifkan untuk Kasir</span>
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan Provider QRIS</span>
              </button>
            </form>
          </div>

          {/* Tabel Master QRIS */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Master Provider QRIS</h3>
                <p className="text-xs text-slate-500">
                  Daftar provider QRIS dengan fee MDR dan threshold potongan aktif.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Nama</th>
                    <th className="px-4 py-3 text-left">Kode</th>
                    <th className="px-4 py-3 text-left">Potongan (%)</th>
                    <th className="px-4 py-3 text-left">Batas Nominal</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {qrisProviders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        Belum ada provider QRIS.
                      </td>
                    </tr>
                  ) : (
                    qrisProviders.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={q.provider_name}
                            onChange={(e) => handleUpdateQrisField(q.id, 'provider_name', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 font-bold text-slate-900 text-xs w-full max-w-[140px]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={q.provider_code || ''}
                            onChange={(e) => handleUpdateQrisField(q.id, 'provider_code', e.target.value)}
                            className="bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg px-2 py-1 font-mono font-semibold text-slate-700 text-xs w-20"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative w-24">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={q.fee_percentage ?? 0}
                              onChange={(e) => handleUpdateQrisField(q.id, 'fee_percentage', parseFloat(e.target.value) || 0)}
                              className="bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg pl-2 pr-6 py-1 font-mono font-bold text-emerald-700 text-xs w-full"
                            />
                            <span className="absolute right-2 top-1 text-[11px] text-slate-400">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="10000"
                            min="0"
                            value={q.fee_threshold_amount ?? 0}
                            onChange={(e) => handleUpdateQrisField(q.id, 'fee_threshold_amount', parseInt(e.target.value, 10) || 0)}
                            className="bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-lg px-2 py-1 font-mono font-semibold text-slate-800 text-xs w-28"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleQrisActive(q.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              q.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {q.is_active ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteQris(q.id, q.provider_name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus provider"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: PENGATURAN FEE MESIN EDC                                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'edc' && (
        <div className="space-y-5">
          {/* Banner Informasi Debit vs Credit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
              <div className="p-2 bg-blue-100 rounded-xl text-blue-700 shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-blue-900 text-xs sm:text-sm">Tipe Kartu Debit (Beban Toko)</h4>
                <p className="text-blue-800 text-xs mt-0.5 leading-relaxed">
                  Fee dipotong dari profit/penerimaan toko. Customer membayar harga normal barang/jasa tanpa biaya tambahan.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-amber-950 text-xs sm:text-sm">Tipe Kartu Kredit (Surcharge Pelanggan)</h4>
                <p className="text-amber-800 text-xs mt-0.5 leading-relaxed">
                  Fee ditambahkan ke total tagihan customer sebagai <b>Surcharge</b>. Customer menanggung biaya gesek kartu kredit.
                </p>
              </div>
            </div>
          </div>

          {/* Form Tambah Bank EDC Baru */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Tambah Mesin / Bank EDC Baru
            </h4>
            <form onSubmit={handleAddNewEdcBank} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Nama Bank EDC</label>
                <input
                  type="text"
                  value={newEdcBankName}
                  onChange={(e) => setNewEdcBankName(e.target.value)}
                  placeholder="Contoh: CIMB Niaga, Danamon, BTN"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                  required
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-bold text-blue-700 mb-1">Fee Debit (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99.99"
                  value={newEdcDebitFee}
                  onChange={(e) => setNewEdcDebitFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-bold text-amber-700 mb-1">Fee Kredit (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99.99"
                  value={newEdcCreditFee}
                  onChange={(e) => setNewEdcCreditFee(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Bank EDC</span>
              </button>
            </form>
          </div>

          {/* Tabel Master Pengaturan Fee EDC */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Tabel Konfigurasi Fee Mesin EDC</h3>
                <p className="text-xs text-slate-500">
                  Sesuaikan persentase fee debit &amp; surcharge kredit per mesin bank EDC.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left">Bank EDC</th>
                    <th className="px-4 py-3 text-left">Tipe Kartu</th>
                    <th className="px-4 py-3 text-left">Beban Biaya</th>
                    <th className="px-4 py-3 text-left">Fee Persentase (%)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {edcSettings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">
                        Belum ada konfigurasi mesin EDC.
                      </td>
                    </tr>
                  ) : (
                    edcSettings.map((e) => (
                      <tr
                        key={e.id}
                        className={e.payment_type === 'Credit' ? 'bg-amber-50/30' : 'hover:bg-slate-50/80 transition-colors'}
                      >
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {e.bank_name}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                              e.payment_type === 'Credit'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {e.payment_type === 'Credit' ? 'Credit / Kredit' : 'Debit'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-600">
                          {e.payment_type === 'Credit' ? (
                            <span className="text-amber-700 font-semibold">+ Ditanggung Customer</span>
                          ) : (
                            <span className="text-blue-700 font-semibold">- Dipotong Toko</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="relative w-28">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="99.99"
                              value={e.fee_percentage}
                              onChange={(ev) => handleUpdateEdcField(e.id, 'fee_percentage', parseFloat(ev.target.value) || 0)}
                              className="bg-white border border-slate-200 focus:border-blue-600 rounded-xl pl-3 pr-7 py-1 text-xs font-mono font-bold text-slate-900 w-full"
                            />
                            <span className="absolute right-2.5 top-1 text-xs text-slate-400 font-bold">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={e.is_active}
                              onChange={(ev) => handleUpdateEdcField(e.id, 'is_active', ev.target.checked)}
                              className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-[11px] font-semibold text-slate-700">
                              {e.is_active ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </label>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteEdcBank(e.bank_name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`Hapus bank ${e.bank_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: REKENING UTAMA NOTA                                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'account' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900">Rekening Resmi Toko &amp; QRIS NMID</h3>
            <p className="text-xs text-slate-500">
              Informasi rekening resmi yang dicetak pada struk thermal 80mm untuk transfer pelanggan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Bank Utama
              </label>
              <input
                type="text"
                value={settings.bank_name}
                onChange={(e) => onUpdateSettings((p) => ({ ...p, bank_name: e.target.value }))}
                placeholder="Contoh: Bank Central Asia (BCA)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Rekening
              </label>
              <input
                type="text"
                value={settings.bank_account_number}
                onChange={(e) => onUpdateSettings((p) => ({ ...p, bank_account_number: e.target.value }))}
                placeholder="Contoh: 8830-1928-33"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-mono text-xs font-bold shadow-2xs placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Atas Nama (Holder)
              </label>
              <input
                type="text"
                value={settings.bank_account_holder}
                onChange={(e) => onUpdateSettings((p) => ({ ...p, bank_account_holder: e.target.value }))}
                placeholder="Contoh: Agus Subagyo (Omah Ban Cabang 3)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Merchant QRIS
              </label>
              <input
                type="text"
                value={settings.qris_merchant_name}
                onChange={(e) => onUpdateSettings((p) => ({ ...p, qris_merchant_name: e.target.value }))}
                placeholder="Contoh: OMAH BAN CABANG 3"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs placeholder:text-slate-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                National Merchant ID (NMID)
              </label>
              <input
                type="text"
                value={settings.qris_nmid}
                onChange={(e) => onUpdateSettings((p) => ({ ...p, qris_nmid: e.target.value }))}
                placeholder="Contoh: ID1020039918231"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-mono text-xs shadow-2xs placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
