<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\OpeningReceivable;
use App\Models\Purchase;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\JournalDraft;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Saldo awal akun neraca (SAK EMKM) yang tersinkronisasi dinamis dengan Chart of Accounts (COA).
 *
 * - Akun buku pembantu (1-2000 Persediaan FIFO, 1-1002 Piutang Dagang, 2-1000 Hutang Dagang) dicatat
 *   melalui sub-ledger masing-masing (OpeningSubledgerService) agar Buku Pembantu === Buku Besar.
 * - Akun neraca aktif lainnya (Kas, Bank, Dibayar di Muka, Aset Tetap, Akumulasi, Akrual, Laba Ditahan,
 *   serta akun neraca kustom yang ditambahkan di COA) dapat diisi di sini; selisih penyeimbangnya
 *   otomatis menjadi Modal Disetor Pemilik (3-1000) sehingga persamaan Aset = Liabilitas + Ekuitas selalu seimbang.
 */
class OpeningBalanceService
{
    public const REFERENCE_TYPE = 'ACCOUNT_OPENING';

    /** Semua reference_type jurnal saldo awal (akun neraca, persediaan, piutang, utang). */
    public const OPENING_TYPES = [
        'ACCOUNT_OPENING',
        'OPENING_BALANCE',
        'RECEIVABLE_OPENING',
        'PAYABLE_OPENING',
    ];

    /** Akun neraca dengan buku pembantu khusus (diisi lewat sub-ledger agar cocok 100%). */
    public const SUBLEDGER_CONTROL_ACCOUNTS = [
        '1-1002' => 'receivables',
        '1-2000' => 'inventory',
        '2-1000' => 'payables',
        '2-1004' => 'customer_dp',
    ];

    /** Daftar akun bawaan lama (dipertahankan sebagai konstanta referensi). */
    public const ACCOUNTS = ['1-1000', '1-1001', '1-3000', '1-3999', '3-2000'];

    public const CAPITAL = '3-1000';

    public const BALANCE_SHEET_TYPES = ['ASSET', 'LIABILITY', 'EQUITY'];

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function current(): ?JournalEntry
    {
        return JournalEntry::where('reference_type', self::REFERENCE_TYPE)->orderBy('id')->first();
    }

    /**
     * Daftar akun neraca aktif dari COA yang dapat diinput langsung di Form Saldo Awal Akun.
     *
     * @return Collection<int, Account>
     */
    public static function eligibleAccounts(): Collection
    {
        return Account::query()
            ->where('is_active', true)
            ->whereIn('account_type', self::BALANCE_SHEET_TYPES)
            ->where('account_code', '!=', self::CAPITAL)
            ->whereNotIn('account_code', array_keys(self::SUBLEDGER_CONTROL_ACCOUNTS))
            ->orderBy('account_code')
            ->get();
    }

    /**
     * @param  array<string, float|int|string|null>  $balances  saldo di sisi normal akun; 3-2000 boleh negatif
     */
    public function post(string $date, array $balances, bool $allowAdditional = false, ?string $notes = null): JournalEntry
    {
        return DB::transaction(function () use ($date, $balances, $allowAdditional, $notes) {
            PeriodLock::assertOpen($date);

            // Kunci baris akun modal agar dua permintaan bersamaan tidak lolos pemeriksaan "belum ada" sekaligus.
            Account::where('account_code', self::CAPITAL)->lockForUpdate()->first();

            $hasExisting = JournalEntry::where('reference_type', self::REFERENCE_TYPE)->lockForUpdate()->exists();
            if ($hasExisting && ! $allowAdditional) {
                throw new PosRuleException('Saldo awal akun sudah pernah dibukukan. Gunakan mode "Tambahan / Sinkronisasi Saldo Awal" untuk menambah akun neraca lain atau koreksi lewat jurnal manual.');
            }

            $eligible = self::eligibleAccounts()->keyBy('account_code');
            $draft = new JournalDraft();
            $capital = 0.0;

            foreach ($balances as $code => $raw) {
                if ($raw === null || $raw === '') {
                    continue;
                }
                if (! $eligible->has($code)) {
                    if (array_key_exists($code, self::SUBLEDGER_CONTROL_ACCOUNTS)) {
                        throw new PosRuleException("Akun {$code} adalah akun kontrol buku pembantu. Input saldo awalnya melalui tab Persediaan/Piutang/Utang Awal agar buku pembantu cocok dengan buku besar.");
                    }
                    throw new PosRuleException("Akun {$code} tidak dapat diinput di saldo awal akun (bukan akun neraca aktif atau merupakan akun modal penyeimbang).");
                }

                $amount = round((float) $raw, 2);
                if ($amount == 0.0) {
                    continue;
                }
                if ($amount < 0 && $code !== '3-2000') {
                    throw new PosRuleException("Saldo awal akun {$code} tidak boleh bernilai negatif.");
                }

                /** @var Account $account */
                $account = $eligible->get($code);
                $onDebit = ($account->normal_balance === 'DEBIT') === ($amount > 0);
                $lineNote = $notes ? "Saldo awal: {$notes}" : 'Saldo awal';
                $onDebit
                    ? $draft->debit($code, abs($amount), $lineNote)
                    : $draft->credit($code, abs($amount), $lineNote);
                $capital += $onDebit ? abs($amount) : -abs($amount);
            }

            if ($draft->isEmpty()) {
                throw new PosRuleException('Isi minimal satu saldo awal.');
            }

            $capital = round($capital, 2);
            if ($capital > 0) {
                $draft->credit(self::CAPITAL, $capital, 'Modal awal pemilik (penyeimbang saldo awal)');
            } elseif ($capital < 0) {
                $draft->debit(self::CAPITAL, -$capital, 'Penyesuaian modal awal (penyeimbang saldo awal)');
            }

            $refId = $hasExisting
                ? DocumentNumber::next(JournalEntry::class, 'reference_id', 'SA-AKUN', $date)
                : 'SALDO-AWAL';
            $desc = $notes
                ? "Saldo awal akun neraca (COA): {$notes}"
                : ($hasExisting ? 'Tambahan / sinkronisasi saldo awal akun neraca (COA)' : 'Saldo awal akun neraca (sinkron COA)');

            return $draft->post($this->engine, self::REFERENCE_TYPE, $refId, $desc, $date);
        }, 3);
    }

    /**
     * Ringkasan saldo awal lengkap yang tersinkronisasi dengan COA, Buku Pembantu, dan Buku Besar.
     */
    public function summary(): array
    {
        $openingSums = DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->where('e.status', 'POSTED')
            ->whereIn('e.reference_type', self::OPENING_TYPES)
            ->groupBy('i.account_id')
            ->selectRaw('i.account_id, SUM(i.debit) as debit, SUM(i.credit) as credit')
            ->get()
            ->keyBy('account_id');

        $ledgerByCode = LedgerBalances::forRange(null, now()->toDateString())
            ->keyBy(fn (AccountBalance $b) => $b->account->account_code);

        $bsAccounts = Account::query()
            ->whereIn('account_type', self::BALANCE_SHEET_TYPES)
            ->where(function ($q) use ($openingSums) {
                $q->where('is_active', true)
                    ->orWhereIn('id', $openingSums->keys()->all());
            })
            ->orderBy('account_code')
            ->get();

        $rows = [];
        $totalOpeningDebit = 0.0;
        $totalOpeningCredit = 0.0;
        $totalAssets = 0.0;
        $totalLiabilities = 0.0;
        $totalEquity = 0.0;

        foreach ($bsAccounts as $account) {
            $openRow = $openingSums->get($account->id);
            $rawDebit = round((float) ($openRow?->debit ?? 0), 2);
            $rawCredit = round((float) ($openRow?->credit ?? 0), 2);
            $debitNet = round($rawDebit - $rawCredit, 2);
            $openingDebit = $debitNet > 0 ? $debitNet : 0.0;
            $openingCredit = $debitNet < 0 ? -$debitNet : 0.0;
            $openingNormal = $account->normal_balance === 'DEBIT' ? $debitNet : -$debitNet;

            $totalOpeningDebit += $openingDebit;
            $totalOpeningCredit += $openingCredit;

            if ($account->account_type === 'ASSET') {
                $totalAssets += $debitNet;
            } elseif ($account->account_type === 'LIABILITY') {
                $totalLiabilities += -$debitNet;
            } elseif ($account->account_type === 'EQUITY') {
                $totalEquity += -$debitNet;
            }

            /** @var AccountBalance|null $ledger */
            $ledger = $ledgerByCode->get($account->account_code);
            $ledgerBalance = $ledger ? $ledger->net() : 0.0;

            $subledgerKind = self::SUBLEDGER_CONTROL_ACCOUNTS[$account->account_code] ?? null;

            $rows[] = [
                'id' => $account->id,
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_type' => $account->account_type,
                'normal_balance' => $account->normal_balance,
                'is_active' => (bool) $account->is_active,
                'is_subledger' => $subledgerKind !== null,
                'subledger_kind' => $subledgerKind,
                'is_balancing_equity' => $account->account_code === self::CAPITAL,
                'can_direct_input' => (bool) $account->is_active
                    && $subledgerKind === null
                    && $account->account_code !== self::CAPITAL,
                'opening_debit' => round($openingDebit, 2),
                'opening_credit' => round($openingCredit, 2),
                'opening_balance' => round($openingNormal, 2),
                'ledger_balance' => round($ledgerBalance, 2),
            ];
        }

        $totalOpeningDebit = round($totalOpeningDebit, 2);
        $totalOpeningCredit = round($totalOpeningCredit, 2);
        $openingDiff = round(abs($totalOpeningDebit - $totalOpeningCredit), 2);

        // Sub-ledger: Persediaan FIFO
        $inventoryVal = InventoryValueJournal::summary() + [
            'opening_posted' => InventoryValueJournal::openingEntry() !== null,
        ];

        // Sub-ledger: Piutang Dagang (1-1002)
        $receivables = OpeningReceivable::all();
        $recOriginal = round((float) $receivables->sum('total_amount'), 2);
        $recPaid = round((float) $receivables->sum('paid_amount'), 2);
        $recOutstanding = round($recOriginal - $recPaid, 2);
        $recLedger = isset($ledgerByCode['1-1002']) ? $ledgerByCode['1-1002']->signed('DEBIT') : 0.0;

        // Sub-ledger: Hutang Dagang (2-1000)
        $openingPayables = Purchase::where('purchase_number', 'like', OpeningSubledgerService::PAYABLE_PREFIX.'-%')->get();
        $allTempoPayables = Purchase::where('payment_method', 'TEMPO')->where('status', '!=', 'BATAL')->get();
        $apOpenTotal = round((float) $allTempoPayables->sum(fn (Purchase $p) => $p->remaining()), 2);
        $apLedger = isset($ledgerByCode['2-1000']) ? $ledgerByCode['2-1000']->signed('CREDIT') : 0.0;

        // Riwayat jurnal saldo awal
        $history = JournalEntry::with(['items.account', 'creator'])
            ->where('status', 'POSTED')
            ->whereIn('reference_type', self::OPENING_TYPES)
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get()
            ->map(fn (JournalEntry $j) => $j->toApiArray())
            ->values()
            ->all();

        $firstAccountOpening = $this->current();

        return [
            'has_account_opening' => $firstAccountOpening !== null,
            'account_opening_entry' => $firstAccountOpening?->toApiArray(),
            'accounts' => $rows,
            'totals' => [
                'opening_debit' => $totalOpeningDebit,
                'opening_credit' => $totalOpeningCredit,
                'difference' => $openingDiff,
                'is_balanced' => $openingDiff < 0.005,
                'total_assets' => round($totalAssets, 2),
                'total_liabilities' => round($totalLiabilities, 2),
                'total_equity' => round($totalEquity, 2),
                'equation_difference' => round($totalAssets - ($totalLiabilities + $totalEquity), 2),
            ],
            'subledgers' => [
                'inventory' => $inventoryVal,
                'receivables' => [
                    'count' => $receivables->count(),
                    'unpaid_count' => $receivables->where('status', '!=', 'LUNAS')->count(),
                    'total_original' => $recOriginal,
                    'total_paid' => $recPaid,
                    'total_outstanding' => $recOutstanding,
                    'ledger_balance' => round($recLedger, 2),
                    'difference' => round($recOutstanding - $recLedger, 2),
                ],
                'payables' => [
                    'opening_count' => $openingPayables->count(),
                    'opening_original' => round((float) $openingPayables->sum('total_amount'), 2),
                    'opening_outstanding' => round((float) $openingPayables->sum(fn (Purchase $p) => $p->remaining()), 2),
                    'all_open_total' => $apOpenTotal,
                    'ledger_balance' => round($apLedger, 2),
                    'difference' => round($apOpenTotal - $apLedger, 2),
                ],
            ],
            'history' => $history,
        ];
    }
}
