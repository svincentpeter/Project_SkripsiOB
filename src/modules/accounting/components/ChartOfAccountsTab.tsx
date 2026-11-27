import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Edit3,
  Lock,
  Plus,
  Power,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { ChartOfAccount } from '../../../shared/types';
import { accountingApi } from '../../../services/api';
import { TablePagination, useDialog, usePagination, useToast } from '../../../shared/components';

interface ChartOfAccountsTabProps {
  accounts: ChartOfAccount[];
  onAccountsChanged: () => Promise<void> | void;
}

type AccountType = ChartOfAccount['account_type'];
type NormalBalance = ChartOfAccount['normal_balance'];

const ACCOUNT_TYPE_META: Record<
  AccountType,
  { label: string; prefixHint: string; defaultNormal: NormalBalance; badgeCls: string }
> = {
  ASSET: {
    label: 'Aset (Harta)',
    prefixHint: '1-xxxx (1-1xxx Lancar, 1-3xxx Tetap)',
    defaultNormal: 'DEBIT',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  LIABILITY: {
    label: 'Kewajiban (Hutang)',
    prefixHint: '2-xxxx',
    defaultNormal: 'CREDIT',
    badgeCls: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  EQUITY: {
    label: 'Ekuitas (Modal)',
    prefixHint: '3-xxxx (Prive bersaldo normal Debit)',
    defaultNormal: 'CREDIT',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  REVENUE: {
    label: 'Pendapatan',
    prefixHint: '4-xxxx (4-9xxx Kontra bersaldo Debit)',
    defaultNormal: 'CREDIT',
    badgeCls: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  EXPENSE: {
    label: 'HPP & Beban',
    prefixHint: '5-xxxx (HPP) atau 6-xxxx (Beban Operasional)',
    defaultNormal: 'DEBIT',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export const ChartOfAccountsTab: React.FC<ChartOfAccountsTabProps> = ({
  accounts,
  onAccountsChanged,
}) => {
  const toast = useToast();
  const dialog = useDialog();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | AccountType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [accountCode, setAccountCode] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('EXPENSE');
  const [normalBalance, setNormalBalance] = useState<NormalBalance>('DEBIT');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setEditingAccount(null);
    setAccountCode('6-');
    setAccountName('');
    setAccountType('EXPENSE');
    setNormalBalance('DEBIT');
    setIsActive(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (acc: ChartOfAccount) => {
    setEditingAccount(acc);
    setAccountCode(acc.account_code);
    setAccountName(acc.account_name);
    setAccountType(acc.account_type);
    setNormalBalance(acc.normal_balance);
    setIsActive(acc.is_active !== false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleTypeSelect = (nextType: AccountType) => {
    setAccountType(nextType);
    setNormalBalance(ACCOUNT_TYPE_META[nextType].defaultNormal);
    if (!editingAccount) {
      const prefixMap: Record<AccountType, string> = {
        ASSET: '1-',
        LIABILITY: '2-',
        EQUITY: '3-',
        REVENUE: '4-',
        EXPENSE: '6-',
      };
      if (!accountCode || /^[1-6]-$/.test(accountCode.trim())) {
        setAccountCode(prefixMap[nextType]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const code = accountCode.trim();
    const name = accountName.trim();

    if (!/^[1-6]-\d{4}$/.test(code)) {
      setFormError('Format kode akun harus seperti 1-1010 atau 6-1020 (awalan 1–6, tanda hubung, 4 digit).');
      return;
    }
    if (!name) {
      setFormError('Nama akun wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingAccount?.id) {
        await accountingApi.updateAccount(editingAccount.id, {
          account_code: code,
          account_name: name,
          account_type: accountType,
          normal_balance: normalBalance,
          is_active: isActive,
        });
        toast.success('Akun Diperbarui', `${code} — ${name} berhasil disimpan.`);
      } else {
        await accountingApi.createAccount({
          account_code: code,
          account_name: name,
          account_type: accountType,
          normal_balance: normalBalance,
          is_active: isActive,
        });
        toast.success('Akun Ditambahkan', `${code} — ${name} berhasil dibuat.`);
      }
      setModalOpen(false);
      await onAccountsChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan akun.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (acc: ChartOfAccount) => {
    if (!acc.id) return;
    if (acc.is_system) {
      toast.warning('Akun Inti Sistem', `Akun ${acc.account_code} dipakai otomatis oleh sistem dan tidak dapat dinonaktifkan.`);
      return;
    }
    try {
      await accountingApi.updateAccount(acc.id, { is_active: acc.is_active === false });
      toast.success(
        acc.is_active === false ? 'Akun Diaktifkan' : 'Akun Dinonaktifkan',
        `${acc.account_code} — ${acc.account_name}`
      );
      await onAccountsChanged();
    } catch (err) {
      toast.error('Gagal Mengubah Status', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    }
  };

  const handleDelete = async (acc: ChartOfAccount) => {
    if (!acc.id) return;
    if (acc.is_system) {
      toast.warning('Akun Inti Sistem', `Akun ${acc.account_code} tidak dapat dihapus.`);
      return;
    }
    if ((acc.journal_items_count ?? 0) > 0) {
      toast.warning(
        'Akun Memiliki Histori Jurnal',
        `Akun ${acc.account_code} sudah dipakai di ${acc.journal_items_count} baris jurnal. Gunakan tombol nonaktifkan agar laporan historis tetap utuh.`
      );
      return;
    }
    const confirmed = await dialog.confirm({
      title: `Hapus Akun ${acc.account_code}?`,
      message: `Akun "${acc.account_name}" akan dihapus permanen dari Daftar Akun (COA).`,
      confirmLabel: 'Hapus Akun',
      cancelLabel: 'Batal',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await accountingApi.deleteAccount(acc.id);
      toast.info('Akun Dihapus', `${acc.account_code} — ${acc.account_name} telah dihapus.`);
      await onAccountsChanged();
    } catch (err) {
      toast.error('Gagal Menghapus Akun', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== 'ALL' && a.account_type !== typeFilter) return false;
      if (statusFilter === 'ACTIVE' && a.is_active === false) return false;
      if (statusFilter === 'INACTIVE' && a.is_active !== false) return false;
      if (q && !a.account_code.toLowerCase().includes(q) && !a.account_name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [accounts, search, typeFilter, statusFilter]);

  const coaPagination = usePagination(filtered, 15, [search, typeFilter, statusFilter]);

  const countsByType = useMemo(() => {
    const map: Record<AccountType, number> = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 };
    for (const a of accounts) {
      map[a.account_type] = (map[a.account_type] ?? 0) + 1;
    }
    return map;
  }, [accounts]);

  const isStructuralLocked = Boolean(
    editingAccount && (editingAccount.is_system || (editingAccount.journal_items_count ?? 0) > 0)
  );

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
              Daftar Akun (Chart of Accounts / COA)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola akun akuntansi standar SAK EMKM. Akun kustom yang ditambahkan langsung tersedia di Jurnal Umum, Buku Besar, dan Laporan Keuangan.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>

        {/* Filter Chips & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Semua ({accounts.length})
            </button>
            {(Object.keys(ACCOUNT_TYPE_META) as AccountType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  typeFilter === type
                    ? 'bg-blue-600 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {ACCOUNT_TYPE_META[type].label} ({countsByType[type]})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter status akun"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="py-2 px-2.5 leading-5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">Semua Status</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau nama akun..."
                className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* COA Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Kode Akun</th>
                <th className="py-3 px-4">Nama Akun</th>
                <th className="py-3 px-4">Kelompok</th>
                <th className="py-3 px-4 text-center">Saldo Normal</th>
                <th className="py-3 px-4 text-right">Baris Jurnal</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500">
                    Tidak ada akun yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                coaPagination.pageItems.map((acc) => {
                  const meta = ACCOUNT_TYPE_META[acc.account_type];
                  const canDelete = !acc.is_system && (acc.journal_items_count ?? 0) === 0;
                  return (
                    <tr key={acc.account_code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap tabular-nums">
                        {acc.account_code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{acc.account_name}</span>
                          {acc.is_system && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold"
                              title="Akun inti yang dipakai otomatis oleh sistem"
                            >
                              <Lock className="w-2.5 h-2.5" />
                              <span>Sistem</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.badgeCls}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                            acc.normal_balance === 'DEBIT'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {acc.normal_balance}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600 tabular-nums">
                        {acc.journal_items_count ?? 0}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            acc.is_active !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {acc.is_active !== false ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(acc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Akun"
                            aria-label={`Edit akun ${acc.account_code}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={acc.is_system}
                            onClick={() => handleToggleActive(acc)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                              acc.is_active === false
                                ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                                : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                            title={
                              acc.is_system
                                ? 'Akun inti sistem tidak dapat dinonaktifkan'
                                : acc.is_active === false
                                ? 'Aktifkan Akun'
                                : 'Nonaktifkan Akun'
                            }
                            aria-label={
                              acc.is_active === false
                                ? `Aktifkan akun ${acc.account_code}`
                                : `Nonaktifkan akun ${acc.account_code}`
                            }
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!canDelete}
                            onClick={() => handleDelete(acc)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                            title={
                              acc.is_system
                                ? 'Akun inti sistem tidak dapat dihapus'
                                : (acc.journal_items_count ?? 0) > 0
                                ? 'Akun sudah memiliki jurnal — nonaktifkan saja'
                                : 'Hapus Akun'
                            }
                            aria-label={`Hapus akun ${acc.account_code}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-3 bg-white">
          <TablePagination
            page={coaPagination.page}
            pageSize={coaPagination.pageSize}
            totalItems={filtered.length}
            unfilteredTotal={accounts.length}
            itemLabel="akun COA"
            pageSizeOptions={[10, 15, 25, 50]}
            onPageChange={coaPagination.setPage}
            onPageSizeChange={coaPagination.setPageSize}
          />
        </div>
      </div>

      {/* Create / Edit Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  {editingAccount ? `Edit Akun ${editingAccount.account_code}` : 'Tambah Akun COA Baru'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Format kode mengikuti standar SAK EMKM (1- Aset s/d 6- Beban).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup modal akun"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {isStructuralLocked && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  {editingAccount?.is_system
                    ? 'Akun inti sistem hanya dapat diubah namanya agar integrasi jurnal otomatis tetap aman.'
                    : 'Akun sudah memiliki riwayat jurnal sehingga kode, kelompok, dan saldo normalnya dikunci.'}
                </div>
              )}

              <div>
                <label htmlFor="coa-type" className="block font-bold text-slate-700 mb-1">
                  Kelompok Akun
                </label>
                <select
                  id="coa-type"
                  value={accountType}
                  disabled={isStructuralLocked}
                  onChange={(e) => handleTypeSelect(e.target.value as AccountType)}
                  className="w-full py-2 px-3 leading-5 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                >
                  {(Object.keys(ACCOUNT_TYPE_META) as AccountType[]).map((t) => (
                    <option key={t} value={t}>
                      {ACCOUNT_TYPE_META[t].label}
                    </option>
                  ))}
                </select>
                <span className="block text-[10.5px] text-slate-500 mt-1">
                  Panduan kode: {ACCOUNT_TYPE_META[accountType].prefixHint}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="coa-code" className="block font-bold text-slate-700 mb-1">
                    Kode Akun
                  </label>
                  <input
                    id="coa-code"
                    type="text"
                    required
                    disabled={isStructuralLocked}
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    placeholder="6-1020"
                    className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
                <div>
                  <label htmlFor="coa-normal" className="block font-bold text-slate-700 mb-1">
                    Saldo Normal
                  </label>
                  <select
                    id="coa-normal"
                    value={normalBalance}
                    disabled={isStructuralLocked}
                    onChange={(e) => setNormalBalance(e.target.value as NormalBalance)}
                    className="w-full py-2 px-3 leading-5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    <option value="DEBIT">DEBIT</option>
                    <option value="CREDIT">CREDIT</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="coa-name" className="block font-bold text-slate-700 mb-1">
                  Nama Akun
                </label>
                <input
                  id="coa-name"
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="mis. Beban Promosi & Iklan"
                  className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:outline-none focus:border-blue-600"
                />
              </div>

              {!editingAccount?.is_system && (
                <label className="inline-flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-blue-600"
                  />
                  <span>Akun aktif (dapat dipilih saat input jurnal)</span>
                </label>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer transition-colors disabled:opacity-60"
                >
                  {submitting ? 'Menyimpan...' : editingAccount ? 'Simpan Perubahan' : 'Tambah Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
