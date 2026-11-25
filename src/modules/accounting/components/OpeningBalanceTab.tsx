import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookMarked,
  CheckCircle2,
  CreditCard,
  Landmark,
  ListTree,
  Package,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import type {
  DebtPaymentInput,
  OpeningBalanceSummary,
  OpeningReceivable,
  PayableInvoice,
  ProductItem,
  SupplierItem,
} from '../../../shared/types';
import { accountingApi, inventoryApi } from '../../../services/api';
import type { ApiJournal } from '../../../services/api';
import { debtPaymentPayload, mapPurchaseToPayable } from '../../../services/api/inventoryMappers';
import type { ApiPurchase } from '../../../services/api/inventoryMappers';
import { localDate } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { MoneyInput, useToast } from '../../../shared/components';
import { useServerData } from '../hooks/useServerData';
import { PayDebtModal } from './PayDebtModal';
import { ServerStatus } from './ServerStatus';

type SubTab = 'accounts' | 'inventory' | 'receivables' | 'payables';

interface OpeningBalanceTabProps {
  refreshKey?: number;
  cashInDrawer?: number;
  products: ProductItem[];
  suppliers: SupplierItem[];
  onLedgerChanged?: (journals: ApiJournal[]) => void;
  onProductsChanged?: () => void;
  onPayablesChanged?: () => void;
  onNavigateToTrialBalance?: () => void;
  onNavigateToLedger?: (accountCode: string) => void;
  onNavigateToAccounts?: () => void;
  onNavigateToPayables?: () => void;
}

const SUB_TABS: { id: SubTab; label: string; code: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'accounts', label: 'Saldo Awal Akun (COA)', code: 'Neraca Awal', icon: Landmark },
  { id: 'inventory', label: 'Saldo Awal Persediaan', code: '1-2000 FIFO', icon: Package },
  { id: 'receivables', label: 'Saldo Awal Piutang', code: '1-1002 AR', icon: Users },
  { id: 'payables', label: 'Saldo Awal Utang', code: '2-1000 AP', icon: CreditCard },
];

const GROUP_LABELS: Record<'ASSET' | 'LIABILITY' | 'EQUITY', string> = {
  ASSET: '1 — Aset (Harta Lancar & Aset Tetap)',
  LIABILITY: '2 — Liabilitas (Kewajiban)',
  EQUITY: '3 — Ekuitas (Modal & Laba Ditahan)',
};

const REF_LABELS: Record<string, string> = {
  ACCOUNT_OPENING: 'SALDO AWAL AKUN',
  OPENING_BALANCE: 'SALDO AWAL PERSEDIAAN',
  RECEIVABLE_OPENING: 'SALDO AWAL PIUTANG',
  PAYABLE_OPENING: 'SALDO AWAL UTANG',
};

interface InventoryDraftLine {
  key: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
}

const makeLine = (): InventoryDraftLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  product_id: '',
  quantity: 1,
  unit_cost: 0,
});

export const OpeningBalanceTab: React.FC<OpeningBalanceTabProps> = ({
  refreshKey = 0,
  cashInDrawer = 0,
  products,
  suppliers,
  onLedgerChanged,
  onProductsChanged,
  onPayablesChanged,
  onNavigateToTrialBalance,
  onNavigateToLedger,
  onNavigateToAccounts,
  onNavigateToPayables,
}) => {
  const toast = useToast();
  const [subTab, setSubTab] = useState<SubTab>('accounts');
  const [localVersion, setLocalVersion] = useState(0);

  const summaryReq = useServerData<OpeningBalanceSummary>(
    () => accountingApi.openingBalanceSummary(),
    [refreshKey, localVersion],
  );
  const receivablesReq = useServerData<OpeningReceivable[]>(
    () => accountingApi.listOpeningReceivables(),
    [refreshKey, localVersion],
  );
  const payablesReq = useServerData<ApiPurchase[]>(
    () => accountingApi.listOpeningPayables(),
    [refreshKey, localVersion],
  );

  const refreshAll = () => setLocalVersion((v) => v + 1);

  // =========================================================================
  // 1. State: Form Saldo Awal Akun (COA)
  // =========================================================================
  const [accDate, setAccDate] = useState(localDate());
  const [accNotes, setAccNotes] = useState('');
  const [accValues, setAccValues] = useState<Record<string, number | undefined>>({});
  const [accSubmitting, setAccSubmitting] = useState(false);

  const summary = summaryReq.data;
  const directInputAccounts = useMemo(
    () => (summary?.accounts ?? []).filter((a) => a.can_direct_input),
    [summary],
  );

  const capitalPreview = useMemo(() => {
    return directInputAccounts.reduce((sum, acc) => {
      const val = accValues[acc.account_code] ?? 0;
      if (!val) return sum;
      return sum + (acc.normal_balance === 'DEBIT' ? 1 : -1) * val;
    }, 0);
  }, [directInputAccounts, accValues]);

  const hasAccountInput = useMemo(
    () => directInputAccounts.some((a) => (accValues[a.account_code] ?? 0) !== 0),
    [directInputAccounts, accValues],
  );

  const handleSubmitAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccountInput || !summary) return;
    setAccSubmitting(true);
    try {
      const cleaned: Record<string, number> = {};
      for (const acc of directInputAccounts) {
        const val = accValues[acc.account_code];
        if (val !== undefined && val !== 0) cleaned[acc.account_code] = val;
      }
      const journal = await accountingApi.postOpeningBalance({
        date: accDate,
        allow_additional: summary.has_account_opening,
        notes: accNotes.trim() || undefined,
        balances: cleaned,
      });
      setAccValues({});
      setAccNotes('');
      onLedgerChanged?.([journal]);
      refreshAll();
      toast.success('Saldo Awal Akun Dibukukan', `Jurnal ${journal.entry_number} tersimpan dan langsung tampil di Buku Besar & Neraca Saldo.`);
    } catch (err) {
      toast.error('Saldo Awal Ditolak Server', err instanceof Error ? err.message : 'Gagal membukukan saldo awal.');
    } finally {
      setAccSubmitting(false);
    }
  };

  // =========================================================================
  // 2. State: Form Saldo Awal Persediaan (1-2000 FIFO)
  // =========================================================================
  const [invDate, setInvDate] = useState(localDate());
  const [invNotes, setInvNotes] = useState('');
  const [invLines, setInvLines] = useState<InventoryDraftLine[]>([makeLine()]);
  const [invSubmitting, setInvSubmitting] = useState(false);
  const [syncFifoSubmitting, setSyncFifoSubmitting] = useState(false);

  const activeProducts = useMemo(
    () => products.filter((p) => p.is_active !== false).sort((a, b) => a.product_name.localeCompare(b.product_name)),
    [products],
  );

  const invTotal = useMemo(
    () => invLines.reduce((sum, l) => sum + Math.max(0, l.quantity) * Math.max(0, l.unit_cost), 0),
    [invLines],
  );

  const handleProductPick = (lineKey: string, productId: string) => {
    const picked = activeProducts.find((p) => String(p.id) === productId);
    setInvLines((prev) =>
      prev.map((l) =>
        l.key === lineKey
          ? { ...l, product_id: productId, unit_cost: picked && picked.product_cost > 0 ? picked.product_cost : l.unit_cost }
          : l,
      ),
    );
  };

  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    const valid = invLines.filter((l) => l.product_id && l.quantity > 0 && l.unit_cost > 0);
    if (valid.length === 0) {
      toast.warning('Data Belum Lengkap', 'Pilih produk, isi qty (≥ 1), dan HPP satuan (> Rp 0).');
      return;
    }
    setInvSubmitting(true);
    try {
      const res = await accountingApi.postOpeningInventory({
        date: invDate,
        notes: invNotes.trim() || undefined,
        items: valid.map((l) => ({
          product_id: Number(l.product_id),
          quantity: Math.floor(l.quantity),
          unit_cost: l.unit_cost,
        })),
      });
      setInvLines([makeLine()]);
      setInvNotes('');
      onLedgerChanged?.([res.journal]);
      onProductsChanged?.();
      refreshAll();
      toast.success(
        'Saldo Awal Persediaan Dibukukan',
        `${res.reference} senilai ${formatRupiah(res.total_value)} masuk ke batch FIFO dan akun 1-2000.`,
      );
    } catch (err) {
      toast.error('Gagal Simpan Persediaan Awal', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setInvSubmitting(false);
    }
  };

  const handleSyncFifoGap = async () => {
    setSyncFifoSubmitting(true);
    try {
      const res = await inventoryApi.postOpeningBalance(invDate);
      if (res.journal) onLedgerChanged?.([res.journal]);
      onProductsChanged?.();
      refreshAll();
      toast.success('FIFO Tersinkronisasi', 'Selisih nilai FIFO fisik telah dibukukan ke akun 1-2000 & 3-1000.');
    } catch (err) {
      toast.error('Sinkronisasi FIFO Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setSyncFifoSubmitting(false);
    }
  };

  // =========================================================================
  // 3. State: Form Saldo Awal Piutang (1-1002 AR) & Pelunasan
  // =========================================================================
  const [recCustomer, setRecCustomer] = useState('');
  const [recPhone, setRecPhone] = useState('');
  const [recInvoice, setRecInvoice] = useState('');
  const [recDate, setRecDate] = useState(localDate());
  const [recDueDate, setRecDueDate] = useState('');
  const [recAmount, setRecAmount] = useState(0);
  const [recNotes, setRecNotes] = useState('');
  const [recSubmitting, setRecSubmitting] = useState(false);

  const [payingReceivable, setPayingReceivable] = useState<OpeningReceivable | null>(null);
  const [payRecDate, setPayRecDate] = useState(localDate());
  const [payRecAmount, setPayRecAmount] = useState(0);
  const [payRecAccount, setPayRecAccount] = useState<'1-1000' | '1-1001'>('1-1000');
  const [payRecNotes, setPayRecNotes] = useState('');
  const [payRecSubmitting, setPayRecSubmitting] = useState(false);

  useEffect(() => {
    if (payingReceivable) {
      setPayRecDate(localDate());
      setPayRecAmount(payingReceivable.remaining_amount);
      setPayRecAccount('1-1000');
      setPayRecNotes('');
    }
  }, [payingReceivable]);

  const handleSubmitReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recCustomer.trim() || recAmount <= 0) return;
    setRecSubmitting(true);
    try {
      const res = await accountingApi.createOpeningReceivable({
        customer_name: recCustomer.trim(),
        customer_phone: recPhone.trim() || undefined,
        invoice_number: recInvoice.trim() || undefined,
        receivable_date: recDate,
        due_date: recDueDate || undefined,
        amount: recAmount,
        notes: recNotes.trim() || undefined,
      });
      setRecCustomer('');
      setRecPhone('');
      setRecInvoice('');
      setRecDueDate('');
      setRecAmount(0);
      setRecNotes('');
      onLedgerChanged?.([res.journal]);
      refreshAll();
      toast.success(
        'Saldo Awal Piutang Dibukukan',
        `${res.receivable.receivable_number} (${res.receivable.customer_name}) masuk ke 1-1002 & Buku Pembantu Piutang.`,
      );
    } catch (err) {
      toast.error('Gagal Simpan Piutang Awal', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleSubmitPayReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingReceivable || payRecAmount <= 0) return;
    setPayRecSubmitting(true);
    try {
      const res = await accountingApi.payOpeningReceivable(payingReceivable.id, {
        payment_date: payRecDate,
        amount: payRecAmount,
        account_code: payRecAccount,
        notes: payRecNotes.trim() || undefined,
      });
      setPayingReceivable(null);
      onLedgerChanged?.([res.journal]);
      refreshAll();
      toast.success(
        'Pelunasan Piutang Dibukukan',
        `${formatRupiah(payRecAmount)} dari ${res.receivable.customer_name} dibukukan (${res.journal.entry_number}).`,
      );
    } catch (err) {
      toast.error('Pelunasan Piutang Ditolak', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setPayRecSubmitting(false);
    }
  };

  // =========================================================================
  // 4. State: Form Saldo Awal Utang (2-1000 AP)
  // =========================================================================
  const [paySupplierId, setPaySupplierId] = useState('');
  const [paySupplierManual, setPaySupplierManual] = useState('');
  const [payInvoice, setPayInvoice] = useState('');
  const [payDate, setPayDate] = useState(localDate());
  const [payDueDate, setPayDueDate] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [selectedOpeningPayable, setSelectedOpeningPayable] = useState<PayableInvoice | null>(null);

  const handlePayOpeningPayable = async (paymentInput: DebtPaymentInput) => {
    try {
      const res = await inventoryApi.payPurchase(paymentInput.payable_invoice_id, debtPaymentPayload(paymentInput));
      onLedgerChanged?.([res.journal]);
      onPayablesChanged?.();
      refreshAll();
      toast.success(
        'Utang Awal Dibayar',
        `${formatRupiah(paymentInput.amount)} ke ${res.purchase.supplier_name} dibukukan (${res.journal.entry_number}).`,
      );
    } catch (err) {
      toast.error('Pembayaran Utang Ditolak', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    }
  };

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.is_active !== false).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name)),
    [suppliers],
  );

  const handleSubmitPayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!paySupplierId && !paySupplierManual.trim()) || payAmount <= 0) return;
    setPaySubmitting(true);
    try {
      const res = await accountingApi.createOpeningPayable({
        supplier_id: paySupplierId ? Number(paySupplierId) : undefined,
        supplier_name: !paySupplierId ? paySupplierManual.trim() : undefined,
        supplier_invoice: payInvoice.trim() || undefined,
        payable_date: payDate,
        due_date: payDueDate || undefined,
        amount: payAmount,
        notes: payNotes.trim() || undefined,
      });
      setPaySupplierId('');
      setPaySupplierManual('');
      setPayInvoice('');
      setPayDueDate('');
      setPayAmount(0);
      setPayNotes('');
      onLedgerChanged?.([res.journal]);
      onPayablesChanged?.();
      refreshAll();
      toast.success(
        'Saldo Awal Utang Dibukukan',
        `${res.purchase.purchase_number} (${res.purchase.supplier_name}) masuk ke 2-1000 & Pembantu Hutang.`,
      );
    } catch (err) {
      toast.error('Gagal Simpan Utang Awal', err instanceof Error ? err.message : 'Terjadi kesalahan server.');
    } finally {
      setPaySubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none';

  return (
    <div className="space-y-4">
      {/* Header + Persamaan Dasar Akuntansi SAK EMKM */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-700" />
              <span>Form Saldo Awal Terpadu (Sinkron COA &amp; SAK EMKM)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-3xl leading-relaxed">
              Isi saldo awal sesuai kondisi nyata toko (mis. kas laci Rp 325.000, stok ban awal, dan utang/piutang lama bila ada — jika Rp 0 boleh dilewati).
              Selisihnya otomatis menjadi Modal Disetor Pemilik (3-1000) sesuai SAK EMKM.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onNavigateToAccounts && (
              <button
                type="button"
                onClick={onNavigateToAccounts}
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ListTree className="w-3.5 h-3.5" />
                <span>Daftar Akun (COA)</span>
              </button>
            )}
            {onNavigateToTrialBalance && (
              <button
                type="button"
                onClick={onNavigateToTrialBalance}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Cek Neraca Saldo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Alur Singkat 3 Langkah */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-blue-50/60 border border-blue-200/80 text-blue-950">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black flex items-center justify-center shrink-0 text-[10px]">1</span>
            <div>
              <span className="font-bold block">Input Saldo Awal (Sinkron COA)</span>
              <span className="text-slate-600">Isi Kas/Bank, Stok Awal FIFO, serta Piutang/Utang lama (opsional bila Rp 0).</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-black flex items-center justify-center shrink-0 text-[10px]">2</span>
            <div>
              <span className="font-bold block">Otomatis Masuk Neraca Saldo</span>
              <span className="text-slate-500">Angka tampil di kolom <strong>Saldo Awal</strong> (Debit = Kredit) terpisah dari mutasi harian.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800">
            <span className="w-5 h-5 rounded-full bg-slate-700 text-white font-black flex items-center justify-center shrink-0 text-[10px]">3</span>
            <div>
              <span className="font-bold block">Tercatat di Buku Besar</span>
              <span className="text-slate-500">Klik kode akun mana saja untuk melihat baris Saldo Awal &amp; riwayat mutasinya.</span>
            </div>
          </div>
        </div>

        <ServerStatus loading={summaryReq.loading && !summary} error={summaryReq.error} onRetry={summaryReq.reload} />

        {summary && (
          <>
            {/* Persamaan Akuntansi KPI Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Aset Awal</span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-slate-900">
                  {formatRupiah(summary.totals.total_assets)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Kas, Bank, Piutang, Persediaan, Aset Tetap</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Liabilitas Awal</span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-amber-800">
                  {formatRupiah(summary.totals.total_liabilities)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Utang Dagang Supplier &amp; Kewajiban Lain</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Ekuitas Awal</span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-emerald-700">
                  {formatRupiah(summary.totals.total_equity)}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Modal Disetor (3-1000) &amp; Laba Ditahan</span>
              </div>
              <div
                className={`border rounded-xl p-3 ${
                  summary.totals.is_balanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  {summary.totals.is_balanced ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  <span>Neraca Saldo Awal</span>
                </span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums block mt-0.5">
                  {formatRupiah(summary.totals.opening_debit)}
                </span>
                <span className="text-[10px] font-semibold block mt-0.5">
                  {summary.totals.is_balanced
                    ? 'Seimbang: Debit = Kredit'
                    : `Selisih ${formatRupiah(summary.totals.difference)}`}
                </span>
              </div>
            </div>

            {/* 4 Sub-Tab Switcher */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs">
              {SUB_TABS.map((t) => {
                const Icon = t.icon;
                const active = subTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSubTab(t.id)}
                    className={`px-3 py-2 rounded-lg border font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white border-blue-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                        active ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.code}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: SALDO AWAL AKUN (SINKRON COA)                            */}
      {/* =================================================================== */}
      {summary && subTab === 'accounts' && (
        <form onSubmit={handleSubmitAccounts} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Daftar Akun Neraca (Tersinkronisasi Otomatis dari COA)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {summary.has_account_opening
                  ? 'Saldo awal awal sudah pernah dibukukan. Anda tetap dapat menginput saldo awal tambahan untuk akun COA baru atau penyesuaian saldo awal pada tanggal periode terbuka.'
                  : 'Isi saldo awal masing-masing akun neraca pada tanggal mulai pembukuan. Akun baru yang ditambahkan di COA otomatis tampil di daftar ini.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-1.5 font-bold text-slate-700">
                <span>Tanggal efektif:</span>
                <input
                  type="date"
                  required
                  value={accDate}
                  max={localDate()}
                  onChange={(e) => e.target.value && setAccDate(e.target.value)}
                  className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                />
              </label>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[820px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left w-24">Kode COA</th>
                  <th className="py-2.5 px-3 text-left">Nama Akun Neraca</th>
                  <th className="py-2.5 px-3 text-center w-24">Normal</th>
                  <th className="py-2.5 px-3 text-right w-36">Saldo Awal Tercatat</th>
                  <th className="py-2.5 px-3 text-right w-36">Saldo Buku Besar</th>
                  <th className="py-2.5 px-3 text-right w-52">Input Saldo Awal / Tambahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(['ASSET', 'LIABILITY', 'EQUITY'] as const).map((groupType) => {
                  const groupRows = summary.accounts.filter((a) => a.account_type === groupType);
                  if (groupRows.length === 0) return null;
                  return (
                    <React.Fragment key={groupType}>
                      <tr className="bg-slate-100/80 font-extrabold text-slate-700 text-[11px]">
                        <td colSpan={6} className="py-2 px-3">
                          {GROUP_LABELS[groupType]}
                        </td>
                      </tr>
                      {groupRows.map((acc) => (
                        <tr key={acc.account_code} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-mono font-bold text-slate-900">
                            {onNavigateToLedger ? (
                              <button
                                type="button"
                                onClick={() => onNavigateToLedger(acc.account_code)}
                                className="text-blue-700 hover:underline cursor-pointer"
                                title="Buka Buku Besar akun ini"
                              >
                                {acc.account_code}
                              </button>
                            ) : (
                              acc.account_code
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-semibold text-slate-800">{acc.account_name}</span>
                            {acc.is_balancing_equity && (
                              <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                                Penyeimbang Otomatis
                              </span>
                            )}
                            {acc.account_code === '3-2000' && (
                              <span className="block text-[10px] text-slate-400">Boleh negatif jika akumulasi rugi.</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                                acc.normal_balance === 'DEBIT' ? 'bg-slate-100 text-slate-700' : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {acc.normal_balance}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-slate-700">
                            {acc.opening_balance !== 0 ? formatRupiah(acc.opening_balance) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600">
                            {acc.ledger_balance !== 0 ? formatRupiah(acc.ledger_balance) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {acc.can_direct_input ? (
                              acc.account_code === '3-2000' ? (
                                <input
                                  type="number"
                                  step="1"
                                  aria-label={`Saldo awal ${acc.account_code}`}
                                  placeholder="0"
                                  value={accValues[acc.account_code] ?? ''}
                                  onChange={(e) =>
                                    setAccValues((prev) => ({
                                      ...prev,
                                      [acc.account_code]: e.target.value === '' ? undefined : Number(e.target.value),
                                    }))
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-right font-mono tabular-nums"
                                />
                              ) : (
                                <MoneyInput
                                  value={accValues[acc.account_code] ?? 0}
                                  onChange={(v) =>
                                    setAccValues((prev) => ({ ...prev, [acc.account_code]: v === 0 ? undefined : v }))
                                  }
                                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white text-right font-mono tabular-nums"
                                />
                              )
                            ) : acc.subledger_kind === 'inventory' ? (
                              <button
                                type="button"
                                onClick={() => setSubTab('inventory')}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                              >
                                Isi di Persediaan Awal →
                              </button>
                            ) : acc.subledger_kind === 'receivables' ? (
                              <button
                                type="button"
                                onClick={() => setSubTab('receivables')}
                                className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg cursor-pointer"
                              >
                                Isi di Piutang Awal →
                              </button>
                            ) : acc.subledger_kind === 'payables' ? (
                              <button
                                type="button"
                                onClick={() => setSubTab('payables')}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg cursor-pointer"
                              >
                                Isi di Utang Awal →
                              </button>
                            ) : acc.is_balancing_equity ? (
                              <span className="text-[11px] font-mono font-bold text-emerald-700">
                                {hasAccountInput ? `+ ${formatRupiah(capitalPreview)}` : 'Otomatis'}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Nonaktif / Historis</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <input
              type="text"
              value={accNotes}
              onChange={(e) => setAccNotes(e.target.value)}
              placeholder="Catatan saldo awal (opsional, mis. Saldo kas & bank per cut-over)"
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 outline-none"
            />
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right text-xs">
                <span className="text-slate-500 block text-[10px]">Dampak ke Modal (3-1000)</span>
                <span className="font-mono font-black text-slate-900 tabular-nums">{formatRupiah(capitalPreview)}</span>
              </div>
              <button
                type="submit"
                disabled={!hasAccountInput || accSubmitting}
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {accSubmitting
                  ? 'Membukukan…'
                  : summary.has_account_opening
                  ? 'Bukukan Tambahan Saldo Awal'
                  : 'Bukukan Saldo Awal Akun'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: SALDO AWAL PERSEDIAAN (1-2000 FIFO)                      */}
      {/* =================================================================== */}
      {summary && subTab === 'inventory' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Saldo Awal Persediaan Barang Dagang (1-2000 • FIFO)</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Menambah lapisan stok FIFO per produk sekaligus membukukan jurnal Dr 1-2000 Persediaan / Cr 3-1000 Modal Disetor Pemilik.
              </p>
            </div>
            {onNavigateToLedger && (
              <button
                type="button"
                onClick={() => onNavigateToLedger('1-2000')}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>Buku Besar 1-2000</span>
              </button>
            )}
          </div>

          {/* FIFO vs Ledger Reconciliation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Nilai Persediaan FIFO Fisik</span>
              <span className="text-base font-black font-mono tabular-nums text-slate-900">
                {formatRupiah(summary.subledgers.inventory.fifo_value)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo Buku Besar (1-2000)</span>
              <span className="text-base font-black font-mono tabular-nums text-blue-800">
                {formatRupiah(summary.subledgers.inventory.ledger_balance)}
              </span>
            </div>
            <div
              className={`border rounded-xl p-3 ${
                Math.abs(summary.subledgers.inventory.difference) < 0.01
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase block">Selisih FIFO vs Buku Besar</span>
              <span className="text-base font-black font-mono tabular-nums">
                {formatRupiah(summary.subledgers.inventory.difference)}
              </span>
            </div>
          </div>

          {!summary.subledgers.inventory.opening_posted && Math.abs(summary.subledgers.inventory.difference) >= 0.01 && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-amber-900">
                <p className="font-bold">Ditemukan stok FIFO migrasi yang belum dibukukan ke 1-2000 sebesar {formatRupiah(summary.subledgers.inventory.difference)}.</p>
                <p className="text-[11px] mt-0.5">Klik sinkronkan untuk membukukan selisih batch FIFO yang sudah ada ke akun Persediaan (1-2000) &amp; Modal (3-1000).</p>
              </div>
              <button
                type="button"
                disabled={syncFifoSubmitting}
                onClick={handleSyncFifoGap}
                className="px-3.5 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncFifoSubmitting ? 'animate-spin' : ''}`} />
                <span>{syncFifoSubmitting ? 'Menyinkronkan…' : 'Sinkronkan Nilai FIFO ke 1-2000'}</span>
              </button>
            </div>
          )}

          {/* Multi-row Form Input Saldo Awal Persediaan */}
          <form onSubmit={handleSubmitInventory} className="space-y-3 border border-slate-200 rounded-xl p-4 bg-slate-50/40">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Tanggal Saldo Awal Persediaan</span>
                <input
                  type="date"
                  required
                  value={invDate}
                  max={localDate()}
                  onChange={(e) => e.target.value && setInvDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block font-bold text-slate-700 mb-1">Catatan / Keterangan (opsional)</span>
                <input
                  type="text"
                  value={invNotes}
                  onChange={(e) => setInvNotes(e.target.value)}
                  placeholder="Contoh: Stok opname awal gudang ban baru Cabang 3"
                  className={inputCls}
                />
              </label>
            </div>

            <div className="border border-slate-200 rounded-xl bg-white overflow-x-auto">
              <table className="w-full min-w-[680px] text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3 text-left">Produk (Master Katalog)</th>
                    <th className="py-2 px-3 text-right w-24">Qty Awal</th>
                    <th className="py-2 px-3 text-right w-44">Harga Perolehan / HPP (Rp)</th>
                    <th className="py-2 px-3 text-right w-40">Subtotal (Rp)</th>
                    <th className="py-2 px-3 text-center w-14">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invLines.map((line) => (
                    <tr key={line.key}>
                      <td className="py-2 px-3">
                        <select
                          aria-label="Pilih produk saldo awal"
                          value={line.product_id}
                          onChange={(e) => handleProductPick(line.key, e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                        >
                          <option value="">-- Pilih produk --</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.product_code ? `${p.product_code} — ` : ''}
                              {p.product_name} {p.product_size ? `(${p.product_size})` : ''} [Stok: {p.product_quantity}]
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          aria-label="Qty awal"
                          value={line.quantity}
                          onChange={(e) =>
                            setInvLines((prev) =>
                              prev.map((l) => (l.key === line.key ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) } : l)),
                            )
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-right font-mono tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <MoneyInput
                          value={line.unit_cost}
                          onChange={(v) =>
                            setInvLines((prev) => prev.map((l) => (l.key === line.key ? { ...l, unit_cost: v } : l)))
                          }
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg text-right font-mono tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatRupiah(line.quantity * line.unit_cost)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          disabled={invLines.length <= 1}
                          onClick={() => setInvLines((prev) => prev.filter((l) => l.key !== line.key))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                          aria-label="Hapus baris"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => setInvLines((prev) => [...prev, makeLine()])}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris Produk</span>
              </button>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs">
                  <span className="text-[10px] text-slate-500 block">Jurnal: Dr 1-2000 / Cr 3-1000</span>
                  <span className="font-mono font-black text-slate-900 tabular-nums">{formatRupiah(invTotal)}</span>
                </div>
                <button
                  type="submit"
                  disabled={invSubmitting || invTotal <= 0}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {invSubmitting ? 'Menyimpan…' : 'Bukukan Saldo Awal Persediaan'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: SALDO AWAL PIUTANG (1-1002 AR + PELUNASAN)               */}
      {/* =================================================================== */}
      {summary && subTab === 'receivables' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Saldo Awal Piutang Usaha &amp; Buku Pembantu Piutang (1-1002)</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Opsional</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Isi hanya jika masih ada tagihan pelanggan lama sebelum sistem dipakai; bila semua penjualan langsung lunas (Rp 0), tab ini boleh dilewati.
              </p>
            </div>
            {onNavigateToLedger && (
              <button
                type="button"
                onClick={() => onNavigateToLedger('1-1002')}
                className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BookMarked className="w-3.5 h-3.5" />
                <span>Buku Besar 1-1002</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Piutang Awal</span>
              <span className="text-base font-black font-mono tabular-nums text-slate-900">
                {formatRupiah(summary.subledgers.receivables.total_original)}
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Sudah Dilunasi</span>
              <span className="text-base font-black font-mono tabular-nums text-emerald-700">
                {formatRupiah(summary.subledgers.receivables.total_paid)}
              </span>
            </div>
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-blue-800 uppercase block">Sisa Piutang (Sub-Ledger)</span>
              <span className="text-base font-black font-mono tabular-nums text-blue-900">
                {formatRupiah(summary.subledgers.receivables.total_outstanding)}
              </span>
            </div>
            <div
              className={`border rounded-xl p-3 ${
                Math.abs(summary.subledgers.receivables.difference) < 0.01
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase block">Saldo Buku Besar (1-1002)</span>
              <span className="text-base font-black font-mono tabular-nums">
                {formatRupiah(summary.subledgers.receivables.ledger_balance)}
              </span>
              <span className="text-[10px] font-semibold block">
                {Math.abs(summary.subledgers.receivables.difference) < 0.01 ? 'Cocok dengan sub-ledger' : `Selisih ${formatRupiah(summary.subledgers.receivables.difference)}`}
              </span>
            </div>
          </div>

          {/* Form Input Piutang Awal */}
          <form onSubmit={handleSubmitReceivable} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3 text-xs">
            <h5 className="font-bold text-slate-800">Tambah Saldo Awal Piutang Pelanggan</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Nama Pelanggan *</span>
                <input
                  type="text"
                  required
                  value={recCustomer}
                  onChange={(e) => setRecCustomer(e.target.value)}
                  placeholder="Contoh: PT Transportasi Magelang / Bpk. Budi"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">No. Telepon (opsional)</span>
                <input
                  type="text"
                  value={recPhone}
                  onChange={(e) => setRecPhone(e.target.value)}
                  placeholder="0812..."
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">No. Nota / Faktur Lama (opsional)</span>
                <input
                  type="text"
                  value={recInvoice}
                  onChange={(e) => setRecInvoice(e.target.value)}
                  placeholder="INV-LAMA-001"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Tanggal Saldo Awal *</span>
                <input
                  type="date"
                  required
                  value={recDate}
                  max={localDate()}
                  onChange={(e) => e.target.value && setRecDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Jatuh Tempo (opsional)</span>
                <input
                  type="date"
                  value={recDueDate}
                  min={recDate}
                  onChange={(e) => setRecDueDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Nominal Piutang (Rp) *</span>
                <MoneyInput value={recAmount} onChange={setRecAmount} className={`${inputCls} text-right font-mono tabular-nums`} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                type="text"
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
                placeholder="Catatan piutang (opsional)"
                className="flex-1 min-w-[220px] px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              />
              <button
                type="submit"
                disabled={recSubmitting || !recCustomer.trim() || recAmount <= 0}
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {recSubmitting ? 'Menyimpan…' : 'Bukukan Saldo Awal Piutang'}
              </button>
            </div>
          </form>

          {/* Tabel Buku Pembantu Piutang */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left">No. Dokumen</th>
                  <th className="py-2 px-3 text-left">Pelanggan</th>
                  <th className="py-2 px-3 text-left">Tanggal</th>
                  <th className="py-2 px-3 text-left">Jatuh Tempo</th>
                  <th className="py-2 px-3 text-right">Total Piutang</th>
                  <th className="py-2 px-3 text-right">Terbayar</th>
                  <th className="py-2 px-3 text-right">Sisa Piutang</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(receivablesReq.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      Belum ada saldo awal piutang yang dicatat.
                    </td>
                  </tr>
                ) : (
                  (receivablesReq.data ?? []).map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">
                        {r.receivable_number}
                        {r.invoice_number && <span className="block text-[10px] text-slate-400 font-sans">Ref: {r.invoice_number}</span>}
                      </td>
                      <td className="py-2 px-3">
                        <span className="font-bold text-slate-900 block">{r.customer_name}</span>
                        {r.notes && <span className="text-[10px] text-slate-400">{r.notes}</span>}
                      </td>
                      <td className="py-2 px-3 text-slate-600">{formatDateIndo(r.receivable_date)}</td>
                      <td className="py-2 px-3 text-slate-600">{r.due_date ? formatDateIndo(r.due_date) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatRupiah(r.total_amount)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700">{formatRupiah(r.paid_amount)}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-black text-blue-900">{formatRupiah(r.remaining_amount)}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'LUNAS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'SEBAGIAN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.status === 'LUNAS' ? 'Lunas' : r.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {r.remaining_amount > 0 ? (
                          <button
                            type="button"
                            onClick={() => setPayingReceivable(r)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Wallet className="w-3 h-3" />
                            <span>Terima Bayar</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: SALDO AWAL UTANG (2-1000 AP)                             */}
      {/* =================================================================== */}
      {summary && subTab === 'payables' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>Saldo Awal Utang Usaha Supplier (2-1000 • AP)</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">Opsional</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Isi jika ada faktur tempo supplier sebelum mulai sistem (Dr 3-1000 / Cr 2-1000). Pelunasan bisa langsung dari sini via Bank BCA, Kas Laci, atau Dana Pribadi Owner.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {onNavigateToLedger && (
                <button
                  type="button"
                  onClick={() => onNavigateToLedger('2-1000')}
                  className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  <span>Buku Besar 2-1000</span>
                </button>
              )}
              {onNavigateToPayables && (
                <button
                  type="button"
                  onClick={onNavigateToPayables}
                  className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Pembantu Hutang</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Saldo Awal Utang (SA-HUT)</span>
              <span className="text-base font-black font-mono tabular-nums text-slate-900">
                {formatRupiah(summary.subledgers.payables.opening_original)}
              </span>
              <span className="text-[10px] text-slate-500 block">{summary.subledgers.payables.opening_count} faktur saldo awal</span>
            </div>
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Sisa Hutang (Sub-Ledger)</span>
              <span className="text-base font-black font-mono tabular-nums text-amber-900">
                {formatRupiah(summary.subledgers.payables.all_open_total)}
              </span>
            </div>
            <div
              className={`border rounded-xl p-3 ${
                Math.abs(summary.subledgers.payables.difference) < 0.01
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <span className="text-[10px] font-bold uppercase block">Saldo Buku Besar (2-1000)</span>
              <span className="text-base font-black font-mono tabular-nums">
                {formatRupiah(summary.subledgers.payables.ledger_balance)}
              </span>
              <span className="text-[10px] font-semibold block">
                {Math.abs(summary.subledgers.payables.difference) < 0.01
                  ? 'Cocok dengan buku pembantu'
                  : `Selisih ${formatRupiah(summary.subledgers.payables.difference)}`}
              </span>
            </div>
          </div>

          {/* Form Input Utang Awal */}
          <form onSubmit={handleSubmitPayable} className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3 text-xs">
            <h5 className="font-bold text-slate-800">Tambah Saldo Awal Utang Supplier</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Pilih Supplier (Master)</span>
                <select
                  value={paySupplierId}
                  onChange={(e) => setPaySupplierId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">-- Input nama supplier manual --</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.supplier_code} — {s.supplier_name}
                    </option>
                  ))}
                </select>
              </label>
              {!paySupplierId && (
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Nama Supplier Manual *</span>
                  <input
                    type="text"
                    required
                    value={paySupplierManual}
                    onChange={(e) => setPaySupplierManual(e.target.value)}
                    placeholder="Contoh: PT Bridgestone Tire Indonesia"
                    className={inputCls}
                  />
                </label>
              )}
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">No. Faktur Supplier (opsional)</span>
                <input
                  type="text"
                  value={payInvoice}
                  onChange={(e) => setPayInvoice(e.target.value)}
                  placeholder="INV-SUP-2026-001"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Tanggal Saldo Awal *</span>
                <input
                  type="date"
                  required
                  value={payDate}
                  max={localDate()}
                  onChange={(e) => e.target.value && setPayDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Jatuh Tempo (opsional)</span>
                <input
                  type="date"
                  value={payDueDate}
                  min={payDate}
                  onChange={(e) => setPayDueDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Nominal Utang (Rp) *</span>
                <MoneyInput value={payAmount} onChange={setPayAmount} className={`${inputCls} text-right font-mono tabular-nums`} />
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Catatan utang (opsional)"
                className="flex-1 min-w-[220px] px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-none"
              />
              <button
                type="submit"
                disabled={paySubmitting || (!paySupplierId && !paySupplierManual.trim()) || payAmount <= 0}
                className="px-4 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {paySubmitting ? 'Menyimpan…' : 'Bukukan Saldo Awal Utang'}
              </button>
            </div>
          </form>

          {/* Tabel Daftar Faktur Saldo Awal Utang */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[780px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left">No. Dokumen</th>
                  <th className="py-2 px-3 text-left">Supplier</th>
                  <th className="py-2 px-3 text-left">Tanggal</th>
                  <th className="py-2 px-3 text-left">Jatuh Tempo</th>
                  <th className="py-2 px-3 text-right">Total Utang</th>
                  <th className="py-2 px-3 text-right">Dibayar</th>
                  <th className="py-2 px-3 text-right">Sisa Utang</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payablesReq.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-slate-400">
                      Belum ada faktur saldo awal utang yang dicatat.
                    </td>
                  </tr>
                ) : (
                  (payablesReq.data ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 font-mono font-bold text-amber-800">
                        {p.purchase_number}
                        {p.supplier_invoice && <span className="block text-[10px] text-slate-400 font-sans">Faktur: {p.supplier_invoice}</span>}
                      </td>
                      <td className="py-2 px-3 font-bold text-slate-900">{p.supplier_name}</td>
                      <td className="py-2 px-3 text-slate-600">{formatDateIndo(p.purchase_date)}</td>
                      <td className="py-2 px-3 text-slate-600">{p.due_date ? formatDateIndo(p.due_date) : '-'}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums">{formatRupiah(Number(p.total_amount))}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums text-emerald-700">{formatRupiah(Number(p.paid_amount))}</td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-black text-amber-900">{formatRupiah(Number(p.remaining_amount))}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'LUNAS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : p.status === 'SEBAGIAN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.status === 'LUNAS' ? 'Lunas' : p.status === 'SEBAGIAN' ? 'Sebagian' : 'Belum'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        {Number(p.remaining_amount) > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedOpeningPayable(mapPurchaseToPayable(p))}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center gap-1 cursor-pointer"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Bayar</span>
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Riwayat Jurnal Saldo Awal */}
      {summary && summary.history.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-600">
            Riwayat Jurnal Saldo Awal Tercatat ({summary.history.length})
          </h4>
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[680px] text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left">Tanggal</th>
                  <th className="py-2 px-3 text-left">No. Jurnal</th>
                  <th className="py-2 px-3 text-left">Jenis</th>
                  <th className="py-2 px-3 text-left">Referensi &amp; Keterangan</th>
                  <th className="py-2 px-3 text-right">Debit</th>
                  <th className="py-2 px-3 text-right">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.history.map((h) => (
                  <tr key={h.id}>
                    <td className="py-2 px-3 text-slate-600 whitespace-nowrap">{formatDateIndo(h.entry_date)}</td>
                    <td className="py-2 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">{h.entry_number}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                        {REF_LABELS[h.reference_type] ?? h.reference_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-800">
                      <span className="font-mono text-[10px] text-slate-500 mr-1.5">{h.reference_id}</span>
                      {h.description}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatRupiah(h.total_debit)}</td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-slate-900">{formatRupiah(h.total_credit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Pelunasan Piutang */}
      {payingReceivable && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayingReceivable(null);
          }}
        >
          <div role="dialog" aria-modal="true" className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Terima Pelunasan Piutang</h3>
                <p className="text-[11px] text-slate-400">
                  {payingReceivable.receivable_number} • {payingReceivable.customer_name}
                </p>
              </div>
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setPayingReceivable(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitPayReceivable} className="p-5 space-y-3.5 text-xs">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="font-bold text-blue-900">Sisa Piutang</span>
                <span className="font-mono font-black text-blue-900 tabular-nums">{formatRupiah(payingReceivable.remaining_amount)}</span>
              </div>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Tanggal Terima Pelunasan</span>
                <input
                  type="date"
                  required
                  value={payRecDate}
                  min={payingReceivable.receivable_date}
                  max={localDate()}
                  onChange={(e) => e.target.value && setPayRecDate(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Masuk ke Akun Kas / Bank</span>
                <select
                  value={payRecAccount}
                  onChange={(e) => setPayRecAccount(e.target.value as '1-1000' | '1-1001')}
                  className={inputCls}
                >
                  <option value="1-1000">1-1000 — Kas Toko Laci Kasir (Tunai)</option>
                  <option value="1-1001">1-1001 — Bank BCA Cabang 3 (Transfer)</option>
                </select>
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Nominal Diterima (Rp)</span>
                <MoneyInput value={payRecAmount} onChange={setPayRecAmount} className={`${inputCls} text-right font-mono tabular-nums`} />
              </label>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Catatan (opsional)</span>
                <input
                  type="text"
                  value={payRecNotes}
                  onChange={(e) => setPayRecNotes(e.target.value)}
                  placeholder="Contoh: Transfer BCA pelunasan piutang"
                  className={inputCls}
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayingReceivable(null)}
                  className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={payRecSubmitting || payRecAmount <= 0 || payRecAmount > payingReceivable.remaining_amount + 0.01}
                  className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-50 cursor-pointer"
                >
                  {payRecSubmitting ? 'Menyimpan…' : 'Bukukan Pelunasan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Pembayaran Utang Awal */}
      <PayDebtModal
        invoice={selectedOpeningPayable}
        cashInDrawer={cashInDrawer}
        onClose={() => setSelectedOpeningPayable(null)}
        onSubmit={(input) => {
          handlePayOpeningPayable(input);
          setSelectedOpeningPayable(null);
        }}
      />
    </div>
  );
};
