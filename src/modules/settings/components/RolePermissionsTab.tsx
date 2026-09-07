import React, { useState } from 'react';
import { 
  ShieldCheck, 
  RotateCcw, 
  Save, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Store,
  Boxes,
  HelpCircle,
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  CalendarCheck,
  CreditCard,
  Package,
  PlusCircle,
  Truck,
  ClipboardList,
  Wallet,
  Building,
  BookOpen,
  FileText,
  Settings
} from 'lucide-react';
import { PermissionKey, RolePermissionsConfig, UserSession } from '../../../shared/types';
import { DEFAULT_ROLE_PERMISSIONS } from '../../../shared/data/mockData';
import { useToast } from '../../../shared/components';

interface RolePermissionsTabProps {
  currentUser: UserSession;
  currentPermissions: RolePermissionsConfig;
  onSavePermissions: (newConfig: RolePermissionsConfig) => void;
}

interface PermissionDefinition {
  key: PermissionKey;
  label: string;
  category: 'KASIR_POS' | 'INVENTORY' | 'AKUNTANSI_BIAYA' | 'MANAJEMEN_OWNER';
  description: string;
  icon: React.ReactNode;
}

const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. KASIR & PENJUALAN
  {
    key: 'pos',
    label: 'Kiosk Kasir POS & Transaksi',
    category: 'KASIR_POS',
    description: 'Akses melayani checkout penjualan ban baru, velg, dan jasa servis.',
    icon: <ShoppingCart className="w-4 h-4 text-blue-600" />,
  },
  {
    key: 'receipt',
    label: 'Riwayat Transaksi & Cetak Struk',
    category: 'KASIR_POS',
    description: 'Melihat riwayat nota transaksi dan mencetak ulang struk thermal 80mm.',
    icon: <Receipt className="w-4 h-4 text-blue-600" />,
  },
  {
    key: 'booking_dp',
    label: 'Booking Inden & Penerimaan DP',
    category: 'KASIR_POS',
    description: 'Mencatat pemesanan ban/velg inden dan penerimaan uang muka konsumen.',
    icon: <CalendarCheck className="w-4 h-4 text-blue-600" />,
  },
  {
    key: 'bon_receivable',
    label: 'Buku Pembantu Piutang / BON Konsumen',
    category: 'KASIR_POS',
    description: 'Mencatat tagihan tempo konsumen walk-in dan memproses pelunasan BON.',
    icon: <CreditCard className="w-4 h-4 text-blue-600" />,
  },

  // 2. INVENTORI & GUDANG
  {
    key: 'inventory_view',
    label: 'Katalog & Pemantauan Stok Ban/Velg',
    category: 'INVENTORY',
    description: 'Melihat daftar master ban baru, velg, ukuran ring, dan sisa stok fisik.',
    icon: <Package className="w-4 h-4 text-emerald-600" />,
  },
  {
    key: 'inventory_manage',
    label: 'Tambah & Edit Master Produk/Jasa',
    category: 'INVENTORY',
    description: 'Menambah item ban/velg baru, mengatur harga jual, dan tarif jasa servis.',
    icon: <PlusCircle className="w-4 h-4 text-emerald-600" />,
  },
  {
    key: 'goods_receipt',
    label: 'Penerimaan Barang Masuk (Restock FIFO)',
    category: 'INVENTORY',
    description: 'Menginput pasokan ban baru dari distributor resmi dan membuat batch FIFO.',
    icon: <Truck className="w-4 h-4 text-emerald-600" />,
  },
  {
    key: 'stock_opname',
    label: 'Penyesuaian Fisik Stok Opname',
    category: 'INVENTORY',
    description: 'Formulir pencocokan fisik gudang vs sistem dan koreksi saldo persediaan.',
    icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
  },

  // 3. PENGELUARAN & AKUNTANSI
  {
    key: 'expenses',
    label: 'Beban Operasional & Kas Keluar (BKK)',
    category: 'AKUNTANSI_BIAYA',
    description: 'Pencatatan pengeluaran biaya bengkel menggunakan kas laci atau rekening bank.',
    icon: <Wallet className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'accounts_payable',
    label: 'Buku Pembantu Hutang Supplier Tempo',
    category: 'AKUNTANSI_BIAYA',
    description: 'Pengawasan jatuh tempo faktur distributor dan formulir pelunasan hutang.',
    icon: <Building className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'accounting_hub',
    label: 'Pusat Akuntansi (Jurnal & Buku Besar)',
    category: 'AKUNTANSI_BIAYA',
    description: 'Melihat Jurnal Umum otomatis, Buku Besar per akun COA, dan Neraca Saldo.',
    icon: <BookOpen className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'financial_reports',
    label: 'Laporan Keuangan SAK EMKM & CALK',
    category: 'AKUNTANSI_BIAYA',
    description: 'Laporan Laba Rugi metode FIFO, Neraca Posisi Keuangan seimbang, dan CALK.',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
  },

  // 4. MANAJEMEN & DASHBOARD
  {
    key: 'dashboard',
    label: 'Dashboard Eksekutif & Analitik KPI',
    category: 'MANAJEMEN_OWNER',
    description: 'Ringkasan omzet penjualan, laba kotor, posisi kas riil, dan stok kritis.',
    icon: <LayoutDashboard className="w-4 h-4 text-indigo-600" />,
  },
  {
    key: 'role_settings',
    label: 'Pengaturan Toko & Manajemen Hak Akses',
    category: 'MANAJEMEN_OWNER',
    description: 'Pengaturan identitas toko Omah Ban Cabang 3 dan wewenang peran staf.',
    icon: <Settings className="w-4 h-4 text-indigo-600" />,
  },
];

export const RolePermissionsTab: React.FC<RolePermissionsTabProps> = ({
  currentUser,
  currentPermissions,
  onSavePermissions,
}) => {
  const toast = useToast();
  const [config, setConfig] = useState<RolePermissionsConfig>(currentPermissions);
  const [isDirty, setIsDirty] = useState(false);

  const isOwner = currentUser.role === 'OWNER';

  const handleToggle = (role: 'KASIR' | 'GUDANG', permKey: PermissionKey) => {
    if (!isOwner) return;

    setConfig((prev) => {
      const nextRolePerms = {
        ...prev[role],
        [permKey]: !prev[role][permKey],
      };
      return {
        ...prev,
        [role]: nextRolePerms,
      };
    });
    setIsDirty(true);
  };

  const handleSave = () => {
    onSavePermissions(config);
    setIsDirty(false);
    toast.success('Pengaturan Wewenang Disimpan!', 'Matriks izin peran Kasir dan Gudang berhasil diperbarui dan langsung aktif.');
  };

  const handleReset = () => {
    setConfig(DEFAULT_ROLE_PERMISSIONS);
    setIsDirty(true);
    toast.info('Pengaturan Direset', 'Matriks wewenang dikembalikan ke konfigurasi standar default Omah Ban.');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-br from-indigo-900/10 via-blue-900/5 to-slate-900/5 border border-indigo-100 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Manajemen Wewenang & Hak Akses Pengguna (RBAC)
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Internal Control
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Pemilik Toko (<strong>Agus Subagyo</strong>) memiliki kendali mutlak untuk menentukan modul mana saja yang dapat dibuka oleh petugas Kasir dan staf Gudang guna menjamin keamanan kas dan ketertiban persediaan SAK EMKM.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          {isOwner && (
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={!isDirty}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm ${
                  isDirty
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-blue-600/25 animate-pulse'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          )}
        </div>

        {!isOwner && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Hanya peran <strong>Owner</strong> yang memiliki izin untuk mengubah konfigurasi wewenang peran ini.</span>
          </div>
        )}
      </div>

      {/* Permissions Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Fitur & Modul Sistem</th>
                <th className="py-3.5 px-4 w-36 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-700">
                    <Store className="w-4 h-4" />
                    <span>Petugas Kasir</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 w-36 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-700">
                    <Boxes className="w-4 h-4" />
                    <span>Staf Gudang</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 w-36 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-blue-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pemilik (Owner)</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {PERMISSION_DEFINITIONS.map((perm) => {
                const kasirActive = config.KASIR[perm.key];
                const gudangActive = config.GUDANG[perm.key];

                return (
                  <tr key={perm.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 mt-0.5 shrink-0">
                          {perm.icon}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {perm.label}
                          </span>
                          <span className="text-[11px] text-slate-500 block mt-0.5 leading-snug">
                            {perm.description}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Kasir Toggle */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      <label className={`inline-flex items-center justify-center cursor-pointer ${!isOwner ? 'opacity-60 pointer-events-none' : ''}`}>
                        <input
                          type="checkbox"
                          checked={kasirActive}
                          onChange={() => handleToggle('KASIR', perm.key)}
                          disabled={!isOwner}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 transition-all cursor-pointer"
                        />
                        <span className={`ml-2 text-[11px] font-bold ${kasirActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {kasirActive ? 'Aktif' : 'Tutup'}
                        </span>
                      </label>
                    </td>

                    {/* Gudang Toggle */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      <label className={`inline-flex items-center justify-center cursor-pointer ${!isOwner ? 'opacity-60 pointer-events-none' : ''}`}>
                        <input
                          type="checkbox"
                          checked={gudangActive}
                          onChange={() => handleToggle('GUDANG', perm.key)}
                          disabled={!isOwner}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 transition-all cursor-pointer"
                        />
                        <span className={`ml-2 text-[11px] font-bold ${gudangActive ? 'text-amber-700' : 'text-slate-400'}`}>
                          {gudangActive ? 'Aktif' : 'Tutup'}
                        </span>
                      </label>
                    </td>

                    {/* Owner (Always ON & Disabled) */}
                    <td className="py-3.5 px-4 text-center align-middle">
                      <div className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Hak Penuh</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
