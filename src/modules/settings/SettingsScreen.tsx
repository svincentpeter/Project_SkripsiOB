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
import { PaymentMethodsTab } from './components/PaymentMethodsTab';

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
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header & Navigation Container ("Terbungkus Rapi") */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <SettingsIcon className="w-4 h-4 text-blue-700" />
              <span>Konfigurasi Sistem Terpadu • SAK EMKM Standar</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Pengaturan Sistem & Konfigurasi Toko</span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Cabang 3 Magelang
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Ubah profil identitas toko, format nota cetak thermal 80mm, master metode bayar, dan hak akses staf.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Reset Bawaan</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>

        {/* Integrated Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200/80 overflow-x-auto scrollbar-none text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('profile')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'profile'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Identitas Toko & Cabang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('invoice')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'invoice'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>Format Struk & Nota 80mm</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('payment')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'payment'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Metode Pembayaran & Bank</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('accounting')}
            className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'accounting'
                ? 'bg-white text-blue-700 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Preferensi SAK EMKM</span>
          </button>

          {currentUser.role === 'OWNER' && (
            <button
              type="button"
              onClick={() => setActiveSubTab('roles')}
              className={`px-3.5 py-2 rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeSubTab === 'roles'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 font-semibold'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Wewenang & Hak Akses (RBAC)</span>
            </button>
          )}
        </div>
      </div>

      {saveSuccessToast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm font-semibold shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Pengaturan sistem dan format struk nota berhasil diperbarui dan disimpan!</span>
        </div>
      )}

      {activeSubTab === 'roles' ? (
        <RolePermissionsTab
          currentUser={currentUser}
          currentPermissions={currentPermissions}
          onSavePermissions={onSavePermissions || (() => {})}
        />
      ) : (
        /* Tab Content Container */
        <div className="space-y-6">
        
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
                  placeholder="Contoh: Omah Ban Magelang"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2 text-slate-900 font-bold text-sm focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Nama Cabang</label>
                <input
                  type="text"
                  value={formData.branch_name}
                  onChange={(e) => handleChange('branch_name', e.target.value)}
                  placeholder="Contoh: Cabang 3 - Magelang"
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
                  placeholder="Contoh: Jl. Magelang - Yogyakarta Km. 8, Magelang"
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

        {/* SUBTAB 3: MASTER METODE PEMBAYARAN */}
        {activeSubTab === 'payment' && (
          <PaymentMethodsTab
            settings={formData}
            onUpdateSettings={setFormData}
          />
        )}


        {/* SUBTAB 4: PREFERENSI AKUNTANSI SAK EMKM */}
        {activeSubTab === 'accounting' && (
          <div className="space-y-6">
            {/* Header Standar EMKM Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <span>Konfigurasi Siklus Akuntansi SAK EMKM (IAI)</span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">Kebijakan Akuntansi & Bagan Akun Standar (COA)</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pengaturan pemetaan akun buku besar otomatis untuk transaksi POS, biaya operasional, dan laporan keuangan.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                    SAK EMKM IAI 2026
                  </span>
                  <span className="px-3 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Metode FIFO Riil
                  </span>
                </div>
              </div>

              {/* Pajak & Termin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tarif Pajak Standar PPN (%)
                  </label>
                  <input
                    type="number"
                    value={formData.default_tax_rate ?? 0}
                    onChange={(e) => handleChange('default_tax_rate', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-bold shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">PPN default transaksi POS (0% non-PKP)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Termin Jatuh Tempo TOP (Hari)
                  </label>
                  <input
                    type="number"
                    value={formData.default_payment_terms_days ?? 30}
                    onChange={(e) => handleChange('default_payment_terms_days', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-bold shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Jatuh tempo faktur hutang distributor</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Bulan Pembukuan Aktif
                  </label>
                  <select
                    value={formData.active_fiscal_month || 'September'}
                    onChange={(e) => handleChange('active_fiscal_month', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-bold shadow-2xs cursor-pointer"
                  >
                    {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Bulan buku berjalan</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Tahun Buku Aktif
                  </label>
                  <input
                    type="number"
                    value={formData.active_fiscal_year || 2026}
                    onChange={(e) => handleChange('active_fiscal_year', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-xs font-bold shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Tahun kalender pelaporan SAK EMKM</span>
                </div>
              </div>
            </div>

            {/* Pemetaan Bagan Akun (COA Mapping) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-600" />
                  <span>Pemetaan Kode Akun COA Otomatis (Chart of Accounts)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Setiap transaksi kasir dan mutasi operasional akan menjurnal debit/kredit ke akun-akun berikut.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Kas Laci Kasir (Cash)</span>
                  <input
                    type="text"
                    value={formData.coa_cash_account || '1-1000'}
                    onChange={(e) => handleChange('coa_cash_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun kas fisik toko OB3</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bank Rekening Operasional</span>
                  <input
                    type="text"
                    value={formData.coa_bank_account || '1-1001'}
                    onChange={(e) => handleChange('coa_bank_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun Bank BCA Operasional</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Piutang Pelanggan (BON)</span>
                  <input
                    type="text"
                    value={formData.coa_receivable_account || '1-1002'}
                    onChange={(e) => handleChange('coa_receivable_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun piutang tempo langganan</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Persediaan Ban Baru (FIFO)</span>
                  <input
                    type="text"
                    value={formData.coa_inventory_account || '1-2000'}
                    onChange={(e) => handleChange('coa_inventory_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun nilai persediaan ban toko</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Hutang Usaha Distributor</span>
                  <input
                    type="text"
                    value={formData.coa_payable_account || '2-1000'}
                    onChange={(e) => handleChange('coa_payable_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun tagihan tempo distributor</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Modal Usaha Pemilik</span>
                  <input
                    type="text"
                    value={formData.coa_equity_account || '3-1000'}
                    onChange={(e) => handleChange('coa_equity_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun modal disetor pemilik</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pendapatan Penjualan Ban</span>
                  <input
                    type="text"
                    value={formData.coa_sales_account || '4-1000'}
                    onChange={(e) => handleChange('coa_sales_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun omzet penjualan kasir</span>
                </div>

                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Beban Pokok Penjualan (HPP)</span>
                  <input
                    type="text"
                    value={formData.coa_cogs_account || '5-1000'}
                    onChange={(e) => handleChange('coa_cogs_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun HPP FIFO ban terjual</span>
                </div>
              </div>
            </div>

            {/* Saldo Awal Buku Kas */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span>Saldo Kas Awal Pembukuan Toko</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Saldo pembuka kas laci dan rekening bank sebelum mutasi transaksi harian.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Saldo Awal Kas Laci / Kasir (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.initial_cash_drawer ?? 1500000}
                    onChange={(e) => handleChange('initial_cash_drawer', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-mono font-bold shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Petty cash uang kembalian kasir di laci</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Saldo Awal Rekening Bank Operasional (Rp)
                  </label>
                  <input
                    type="number"
                    value={formData.initial_bank_balance ?? 85000000}
                    onChange={(e) => handleChange('initial_bank_balance', Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-slate-900 text-xs font-mono font-bold shadow-2xs"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Saldo rekening Bank BCA operasional</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Seluruh Perubahan Pengaturan</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
};
