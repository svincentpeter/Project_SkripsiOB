import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Store, 
  Receipt, 
  CreditCard, 
  Sliders, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Printer, 
  QrCode, 
  ShieldCheck, 
  Sparkles,
  Eye,
  FileText
} from 'lucide-react';
import { RolePermissionsConfig, StoreSettings, UserSession } from '../../shared/types';
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_USERS, INITIAL_STORE_SETTINGS } from '../../shared/data/mockData';
import { RolePermissionsTab } from './components/RolePermissionsTab';

interface SettingsScreenProps {
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  currentUser?: UserSession;
  currentPermissions?: RolePermissionsConfig;
  onSavePermissions?: (newConfig: RolePermissionsConfig) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onSaveSettings,
  currentUser = DEFAULT_USERS[0],
  currentPermissions = DEFAULT_ROLE_PERMISSIONS,
  onSavePermissions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'invoice' | 'payment' | 'accounting' | 'roles'>('profile');
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  const handleChange = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3000);
  };

  const handleResetToDefault = () => {
    if (window.confirm('Reset seluruh konfigurasi sistem ke pengaturan standar bawaan?')) {
      setFormData({ ...INITIAL_STORE_SETTINGS });
      onSaveSettings({ ...INITIAL_STORE_SETTINGS });
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-800 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-2xs">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Pengaturan Sistem & Konfigurasi Toko (Settings)
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Ubah identitas toko, tata letak struk nota 80mm, rekening pembayaran, & preferensi akuntansi SAK EMKM.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-all"
          >
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span>Reset Bawaan</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </div>

      {saveSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pengaturan sistem dan format struk nota berhasil diperbarui dan disimpan!</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'profile'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Identitas Toko & Cabang</span>
        </button>

        <button
          onClick={() => setActiveSubTab('invoice')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'invoice'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Format Struk & Nota 80mm</span>
        </button>

        <button
          onClick={() => setActiveSubTab('payment')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'payment'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Metode Pembayaran & Bank</span>
        </button>

        <button
          onClick={() => setActiveSubTab('accounting')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeSubTab === 'accounting'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-950 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Preferensi SAK EMKM</span>
        </button>

        {currentUser.role === 'OWNER' && (
          <button
            onClick={() => setActiveSubTab('roles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'roles'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:text-slate-950 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Wewenang & Hak Akses (RBAC)</span>
          </button>
        )}
      </div>

      {activeSubTab === 'roles' ? (
        <RolePermissionsTab
          currentUser={currentUser}
          currentPermissions={currentPermissions}
          onSavePermissions={onSavePermissions || (() => {})}
        />
      ) : (
        /* Tab Content Form */
        <form onSubmit={handleSave} className="space-y-6">
        
        {/* SUBTAB 1: PROFIL TOKO & CABANG */}
        {activeSubTab === 'profile' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Informasi & Alamat Resmi Toko</h2>
              <p className="text-xs text-slate-500">Nama toko, cabang, dan kontak yang muncul di kop nota dan laporan.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Nama Brand / Toko</label>
                <input
                  type="text"
                  value={formData.store_name}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  placeholder="Contoh: Omah Ban BSD"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-bold text-sm focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Nama Cabang</label>
                <input
                  type="text"
                  value={formData.branch_name}
                  onChange={(e) => handleChange('branch_name', e.target.value)}
                  placeholder="Contoh: Cabang 3 - Tangerang"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-bold text-sm focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Tagline / Sub-Header</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="Contoh: Pusat Ban & Servis Roda Terpercaya"
                className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-xs sm:text-sm font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Nomor Telepon</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="Contoh: 021-5371234"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-xs font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Nomor WhatsApp CS</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => handleChange('whatsapp', e.target.value)}
                  placeholder="Contoh: 0812-3456-7890"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-xs font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Email Resmi</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="Contoh: cabang3@omahban.co.id"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-xs font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Alamat Lengkap Toko & Bengkel</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Contoh: Jl. Raya Serpong No. 88, BSD"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-xs font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Kota / Wilayah</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Contoh: Tangerang Selatan"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 text-xs font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 2: FORMAT STRUK & NOTA */}
        {activeSubTab === 'invoice' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Konfigurasi Teks Struk Cetak</h2>
                <p className="text-xs text-slate-500">Sesuaikan header, footer, catatan garansi, dan ukuran kertas printer thermal.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teks Header Nota (Kop Surat)</label>
                <textarea
                  rows={2}
                  value={formData.invoice_header}
                  onChange={(e) => handleChange('invoice_header', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-xs font-mono shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Judul Footer / Penutup</label>
                <input
                  type="text"
                  value={formData.invoice_footer_title}
                  onChange={(e) => handleChange('invoice_footer_title', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Teks Garansi Produk & Layanan</label>
                <textarea
                  rows={2}
                  value={formData.invoice_warranty_text}
                  onChange={(e) => handleChange('invoice_warranty_text', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-xs shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Catatan Penukaran / Syarat Pembelian</label>
                <textarea
                  rows={2}
                  value={formData.invoice_footer_notes}
                  onChange={(e) => handleChange('invoice_footer_notes', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-xs shadow-2xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Opsi Elemen Struk</span>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_barcode_on_receipt}
                    onChange={(e) => handleChange('show_barcode_on_receipt', e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600"
                  />
                  <span>Cetak Barcode Nomor Nota di Bawah Struk</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_vehicle_info}
                    onChange={(e) => handleChange('show_vehicle_info', e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600"
                  />
                  <span>Tampilkan Plat Nomor & Model Kendaraan</span>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_cashier_name}
                    onChange={(e) => handleChange('show_cashier_name', e.target.checked)}
                    className="w-4 h-4 rounded-sm text-blue-600"
                  />
                  <span>Tampilkan Nama Kasir yang Bertugas</span>
                </label>
              </div>
            </div>

            {/* Live Preview Struk Thermal */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 flex flex-col items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-slate-400" /> Pratinjau Struk Thermal 80mm
              </span>

              <div className="w-[320px] bg-white border border-slate-300 rounded-xl p-5 shadow-md font-mono text-[11px] text-slate-800 space-y-3 select-none">
                <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-2.5">
                  <div className="font-black text-xs text-slate-900 whitespace-pre-line">{formData.invoice_header}</div>
                  <div className="text-[10px] text-slate-500">{formData.address}</div>
                  <div className="text-[10px] text-slate-500">Telp: {formData.phone} / WA: {formData.whatsapp}</div>
                </div>

                <div className="space-y-0.5 text-[10px] border-b border-dashed border-slate-300 pb-2">
                  <div className="flex justify-between"><span>No. Nota:</span><span>OB3-INV-202609-0142</span></div>
                  <div className="flex justify-between"><span>Waktu:</span><span>04 Sep 2026 14:30</span></div>
                  {formData.show_cashier_name && <div className="flex justify-between"><span>Kasir:</span><span>Fani A. (Shift Pagi)</span></div>}
                  <div className="flex justify-between"><span>Pelanggan:</span><span>Ko Budi Santoso</span></div>
                  {formData.show_vehicle_info && <div className="flex justify-between"><span>Plat:</span><span>B 1984 SKZ (Avanza)</span></div>}
                </div>

                <div className="space-y-1.5 border-b border-dashed border-slate-300 pb-2.5 text-[10px]">
                  <div>
                    <div className="font-bold">Bridgestone Turanza T005A</div>
                    <div className="text-slate-500 flex justify-between"><span>1 pcs x Rp 1.050.000</span><span>Rp 1.050.000</span></div>
                  </div>
                  <div>
                    <div className="font-bold">Spooring 3D Digital</div>
                    <div className="text-slate-500 flex justify-between"><span>1 pcs x Rp 150.000</span><span>Rp 150.000</span></div>
                  </div>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between"><span>Subtotal:</span><span>Rp 1.200.000</span></div>
                  <div className="flex justify-between font-black text-xs text-slate-900 border-t border-slate-200 pt-1">
                    <span>GRAND TOTAL:</span><span>Rp 1.200.000</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600"><span>Metode Bayar:</span><span>TUNAI</span></div>
                  <div className="flex justify-between text-[10px] text-slate-600"><span>Uang Diterima:</span><span>Rp 1.200.000</span></div>
                  <div className="flex justify-between text-[10px] text-slate-600"><span>Kembalian:</span><span>Rp 0</span></div>
                </div>

                <div className="text-center pt-2 border-t border-dashed border-slate-300 space-y-1 text-[9px] text-slate-500">
                  <div className="font-bold text-slate-700">★ KEBIJAKAN GARANSI ★</div>
                  <div>{formData.invoice_warranty_text}</div>
                  <div className="pt-1 font-bold text-slate-800">{formData.invoice_footer_title}</div>
                  {formData.show_barcode_on_receipt && (
                    <div className="pt-2 font-mono text-center tracking-widest text-slate-700 font-bold">
                      ||| | ||||| || |||| ||||| | ||
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 3: REKENING & PEMBAYARAN */}
        {activeSubTab === 'payment' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Rekening Bank & QRIS Toko</h2>
              <p className="text-xs text-slate-500">Data rekening penerima transfer bank dan QRIS merchant yang valid.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Bank</label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={(e) => handleChange('bank_name', e.target.value)}
                  placeholder="Contoh: Bank Central Asia (BCA)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nomor Rekening</label>
                <input
                  type="text"
                  value={formData.bank_account_number}
                  onChange={(e) => handleChange('bank_account_number', e.target.value)}
                  placeholder="Contoh: 8830-1234-56"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-mono text-xs font-bold shadow-2xs placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Atas Nama (Holder)</label>
                <input
                  type="text"
                  value={formData.bank_account_holder}
                  onChange={(e) => handleChange('bank_account_holder', e.target.value)}
                  placeholder="Contoh: PT Omah Ban Indonesia"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Nama Merchant QRIS</label>
                <input
                  type="text"
                  value={formData.qris_merchant_name}
                  onChange={(e) => handleChange('qris_merchant_name', e.target.value)}
                  placeholder="Contoh: Omah Ban Cabang 3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">National Merchant ID (NMID)</label>
                <input
                  type="text"
                  value={formData.qris_nmid}
                  onChange={(e) => handleChange('qris_nmid', e.target.value)}
                  placeholder="Contoh: ID1020030040050"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 font-mono text-xs shadow-2xs placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
            </div>
          </div>
        )}

        {/* SUBTAB 4: PREFERENSI AKUNTANSI SAK EMKM */}
        {activeSubTab === 'accounting' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Preferensi Perpajakan & Akuntansi SAK EMKM</h2>
              <p className="text-xs text-slate-500">Parameter default untuk perhitungan pajak PPN dan jatuh tempo hutang distributor.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tarif Pajak Standar PPN (%)</label>
                <input
                  type="number"
                  value={formData.default_tax_rate}
                  onChange={(e) => handleChange('default_tax_rate', Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Termin Default Jatuh Tempo Hutang (Hari)</label>
                <input
                  type="number"
                  value={formData.default_payment_terms_days}
                  onChange={(e) => handleChange('default_payment_terms_days', Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-bold shadow-2xs"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Perubahan Pengaturan</span>
          </button>
        </div>
      </form>
      )}
    </div>
  );
};
