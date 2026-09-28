# Stage 4 — Server-Authoritative Accounting Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move journals, reports, expenses, manual journals, reversals, opening balances and period closing to the Laravel API, and make every accounting screen render server-computed figures for a user-chosen period.

**Architecture:** Backend: `AccountingEngine::createEntry` becomes the single hardened posting gate (strict balance, line rules, period lock, locked numbering, audit columns). New services under `app/Services/Accounting/` compute reports from one grouped balance query and classify accounts from the COA. Frontend: typed `accountingApi`/`expenseApi` + mappers; accounting components fetch their own data through a `useServerData` hook keyed by period and a `ledgerVersion` counter; localStorage and mock accounting data are removed.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8; React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-accounting-server-stage4-design.md` (roadmap: `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`).

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md` before starting.
- API responses use the envelope `{ "success": true, "message"?: "...", "data": ... }`; create returns 201. Business-rule violations throw `App\Exceptions\PosRuleException` (renders 422 `{message}`). All user-facing text is Indonesian.
- Journals are only written through `AccountingEngine::createEntry` (directly or via `JournalDraft`). Never insert `journal_entries`/`journal_items` by hand, never edit or delete a posted journal.
- Every new backend test class uses `Illuminate\Foundation\Testing\DatabaseTransactions`. Tests that assert figures post journals on isolated past dates (2019–2021) so leftovers from older tests cannot change them.
- Every new protected endpoint gets a 403 test for a role without the permission key.
- Before the first backend test run, migrate the testing DB: `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force` (PowerShell: `$env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`). Re-run it after each new migration.
- Backend gate: `cd backend && composer test` must pass at the end of every backend task. Frontend gate: `npm run lint && npm test` must pass at the end of every frontend task.
- The working tree contains uncommitted user work: `src/modules/inventory/components/GoodsReceiptModal.tsx`, `src/services/purchaseInvoiceService.ts`, `src/services/__tests__/purchaseInvoiceService.test.ts`. Never stage, modify, or revert them. Stage files by explicit path; never `git add -A` / `git add .`.
- Commits go directly on `main`, Conventional Commits with scope, English, lowercase imperative subject, ending with the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Money: amounts are rupiah with 2 decimals; server rounds to cents; frontend displays with `formatRupiah`.
- Dates: server business dates come from `now()` in `Asia/Jakarta`; frontend dates come from `localDate()` (never `toISOString()` for a business date).

## File Map

Backend (create):
- `backend/database/migrations/2026_09_29_000001_harden_journal_entries_and_add_period_closings.php` — `created_by`, `reversal_of_id`, `accounting_period_closings`.
- `backend/database/migrations/2026_09_29_000002_add_void_audit_to_expenses_and_seed_categories.php` — expense void audit columns + 8 categories.
- `backend/app/Models/AccountingPeriodClosing.php`
- `backend/app/Services/Accounting/PeriodLock.php` — lock date + guard.
- `backend/app/Services/Accounting/AccountBalance.php` — value object (account + debit/credit sums).
- `backend/app/Services/Accounting/LedgerBalances.php` — one grouped balance query.
- `backend/app/Services/Accounting/FinancialReportService.php` — trial balance, ledger, income statement, balance sheet, equity changes.
- `backend/app/Services/Accounting/CashFlowReport.php` — direct-method cash flow + cash balances.
- `backend/app/Services/Accounting/PeriodClosingService.php` — close / reopen / summary.
- `backend/app/Services/Accounting/ManualJournalService.php` — manual journal + reversal.
- `backend/app/Services/Accounting/OpeningBalanceService.php` — one-time account opening balances.
- `backend/app/Services/Accounting/ExpenseService.php` — expense create / void.
- `backend/app/Http/Controllers/Api/v1/AccountingPeriodController.php`, `OpeningBalanceController.php`
- Tests: `backend/tests/Feature/FinancialReportTest.php`, `CashFlowReportTest.php`, `PeriodClosingTest.php`, `ManualJournalApiTest.php`, `OpeningBalanceApiTest.php`.

Backend (modify): `config/app.php`, `app/Services/DocumentNumber.php`, `app/Services/AccountingEngine.php`, `app/Services/JournalDraft.php`, `app/Exceptions/AccountingUnbalancedException.php`, `app/Models/JournalEntry.php`, `app/Models/Expense.php`, `app/Models/ExpenseCategory.php`, `app/Http/Requests/ExpenseRequest.php`, `app/Http/Requests/ManualJournalRequest.php`, `app/Http/Controllers/Api/v1/AccountingReportController.php`, `app/Http/Controllers/Api/v1/ExpenseController.php`, `routes/api.php`, tests `Unit/AccountingEngineTest.php`, `Feature/AccountingReportApiTest.php`, `Feature/ExpenseApiTest.php`.

Frontend (create):
- `src/services/accountingPeriod.ts` — local dates, month ranges, `resolvePeriod`.
- `src/services/api/accountingMappers.ts` — wire types + mappers for accounts, ledger, trial balance, journals page, expenses.
- `src/modules/accounting/hooks/useServerData.ts` — fetch hook with loading/error/reload.
- `src/modules/accounting/components/ServerStatus.tsx`, `PeriodPicker.tsx`, `StatementParts.tsx`, `OpeningBalanceModal.tsx`
- Tests: `src/services/__tests__/accountingPeriod.test.ts`, `src/services/__tests__/accountingMappers.test.ts`.

Frontend (rewrite): `src/services/api/accountingApi.ts`, `src/services/api/expenseApi.ts`, accounting components `TrialBalanceTab`, `GeneralLedgerTab`, `JournalTab`, `ManualJournalModal`, `SakEmkmReportTab`, `CashFlowStatementTab`, `FinancialStatementsPrintModal`, `PeriodClosingModal`, `GeneralLedgerScreen`, `FinancialStatementsScreen`.

Frontend (modify): `src/shared/types/index.ts`, `src/services/api/apiClient.ts`, `src/services/api/posMappers.ts`, `src/services/api/index.ts`, `src/App.tsx`, `src/shared/export/registry.ts` (+ its test), expenses components (`ExpensesScreen`, `ExpenseForm`, `ExpenseDetailModal`, `ExpenseTable`, `ExpenseAnalyticsCard`), `src/shared/utils/formatters.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/__tests__/financialsSettingsAudit.test.ts`.

Frontend (delete): `src/services/accountingService.ts`.

Docs (modify, last task): `AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`.

---

# Part A — Backend

### Task A1: Harden the posting engine (strict rules, period lock, locked numbering, audit columns, WIB)

**Files:**
- Create: `backend/database/migrations/2026_09_29_000001_harden_journal_entries_and_add_period_closings.php`
- Create: `backend/app/Models/AccountingPeriodClosing.php`
- Create: `backend/app/Services/Accounting/PeriodLock.php`
- Modify: `backend/config/app.php` (timezone line)
- Modify: `backend/app/Services/DocumentNumber.php`
- Modify: `backend/app/Services/AccountingEngine.php` (replace `createEntry` + imports only; keep the three report methods for now)
- Modify: `backend/app/Services/JournalDraft.php` (add `isEmpty()`)
- Modify: `backend/app/Exceptions/AccountingUnbalancedException.php`
- Modify: `backend/app/Models/JournalEntry.php` (full replacement)
- Test: `backend/tests/Unit/AccountingEngineTest.php` (full replacement)

**Interfaces:**
- Produces: `AccountingEngine::createEntry(string $referenceType, string $referenceId, string $description, array $items, ?string $entryDate = null, int $branchId = 3, ?int $reversalOfId = null): JournalEntry`
- Produces: `DocumentNumber::next(string $model, string $column, string $prefix, ?string $date = null): string`
- Produces: `App\Services\Accounting\PeriodLock::lockDate(): ?string` and `PeriodLock::assertOpen(string $date): void`
- Produces: `JournalDraft::isEmpty(): bool`
- Produces: `JournalEntry::MANUAL = 'MANUAL_ADJUSTMENT'`, relations `creator()`, `reversalOf()`, `reversal()`, `reversedItems(string $notePrefix): array`, extended `toApiArray()` with `id, reference_type, reversal_of, reversed_by, can_reverse, created_by_name`.
- Produces: model `AccountingPeriodClosing` with relations `closingEntry()`, `closedByUser()` and `toApiArray()`.

- [ ] **Step 1: Write the failing engine tests**

Replace `backend/tests/Unit/AccountingEngineTest.php` with:

```php
<?php

namespace Tests\Unit;

use App\Exceptions\AccountingUnbalancedException;
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\AccountingPeriodClosing;
use App\Services\AccountingEngine;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AccountingEngineTest extends TestCase
{
    use DatabaseTransactions;

    /** @return array<string, int> */
    private function ids(): array
    {
        return Account::whereIn('account_code', ['1-1000', '4-1000'])->pluck('id', 'account_code')->all();
    }

    private function post(array $items, string $date = '2020-03-15')
    {
        return (new AccountingEngine())->createEntry('TEST', 'REF-'.uniqid(), 'Uji mesin jurnal', $items, $date);
    }

    public function test_balanced_entry_is_numbered_by_entry_month_and_records_creator(): void
    {
        $a = $this->ids();
        $entry = $this->post([
            ['account_id' => $a['1-1000'], 'debit' => 1500000, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 1500000],
        ]);

        $this->assertStringStartsWith('JRN-202003-', $entry->entry_number);
        $this->assertSame('2020-03-15', $entry->entry_date->toDateString());
        $this->assertNotNull($entry->created_by);
        $this->assertCount(2, $entry->items);
        $this->assertEquals(1500000, $entry->total_debit);
    }

    public function test_one_cent_imbalance_is_rejected(): void
    {
        $this->expectException(AccountingUnbalancedException::class);
        $a = $this->ids();
        $this->post([
            ['account_id' => $a['1-1000'], 'debit' => 100.01, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 100.00],
        ]);
    }

    public function test_entry_needs_two_non_zero_lines(): void
    {
        $this->expectException(PosRuleException::class);
        $this->expectExceptionMessage('dua baris');
        $a = $this->ids();
        $this->post([
            ['account_id' => $a['1-1000'], 'debit' => 0, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 0],
        ]);
    }

    public function test_line_with_both_sides_is_rejected(): void
    {
        $this->expectException(PosRuleException::class);
        $a = $this->ids();
        $this->post([
            ['account_id' => $a['1-1000'], 'debit' => 100, 'credit' => 100],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 0],
        ]);
    }

    public function test_negative_amount_is_rejected(): void
    {
        $this->expectException(PosRuleException::class);
        $a = $this->ids();
        $this->post([
            ['account_id' => $a['1-1000'], 'debit' => -100, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => -100],
        ]);
    }

    public function test_posting_into_a_closed_period_is_rejected_and_later_dates_are_allowed(): void
    {
        AccountingPeriodClosing::create(['period' => '2020-03', 'end_date' => '2020-03-31', 'net_income' => 0, 'closed_at' => now()]);
        $a = $this->ids();
        $lines = [
            ['account_id' => $a['1-1000'], 'debit' => 1000, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 1000],
        ];

        $this->assertStringStartsWith('JRN-202004-', $this->post($lines, '2020-04-01')->entry_number);

        $this->expectException(PosRuleException::class);
        $this->expectExceptionMessage('ditutup');
        $this->post($lines, '2020-03-31');
    }

    public function test_reopened_period_no_longer_locks(): void
    {
        AccountingPeriodClosing::create(['period' => '2020-03', 'end_date' => '2020-03-31', 'net_income' => 0, 'closed_at' => now(), 'reopened_at' => now()]);
        $a = $this->ids();

        $entry = $this->post([
            ['account_id' => $a['1-1000'], 'debit' => 1000, 'credit' => 0],
            ['account_id' => $a['4-1000'], 'debit' => 0, 'credit' => 1000],
        ], '2020-03-10');

        $this->assertSame('2020-03-10', $entry->entry_date->toDateString());
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=AccountingEngineTest`
Expected: FAIL — `Class "App\Models\AccountingPeriodClosing" not found` (and numbering/validation assertions).

- [ ] **Step 3: Add the migration**

Create `backend/database/migrations/2026_09_29_000001_harden_journal_entries_and_add_period_closings.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak audit jurnal (pembuat, tautan jurnal pembalik) dan tabel tutup buku per periode.
 * Tanggal kunci = end_date terbesar yang belum dibuka kembali; jurnal bertanggal <= tanggal itu ditolak.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->foreignId('created_by')->nullable()->after('branch_id')->constrained('users')->nullOnDelete();
            $table->foreignId('reversal_of_id')->nullable()->unique()->after('created_by')->constrained('journal_entries');
        });

        Schema::create('accounting_period_closings', function (Blueprint $table) {
            $table->id();
            $table->char('period', 7)->index();
            $table->date('end_date');
            $table->foreignId('closing_entry_id')->nullable()->constrained('journal_entries');
            $table->decimal('net_income', 15, 2)->default(0);
            $table->string('notes', 255)->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at');
            $table->timestamp('reopened_at')->nullable();
            $table->foreignId('reopened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reopen_reason', 255)->nullable();
            $table->foreignId('reopen_entry_id')->nullable()->constrained('journal_entries');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounting_period_closings');
        Schema::table('journal_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('reversal_of_id');
            $table->dropConstrainedForeignId('created_by');
        });
    }
};
```

Run: `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate`
Expected: `2026_09_29_000001_harden_journal_entries_and_add_period_closings ... DONE` for both databases.

- [ ] **Step 4: Set the business timezone to WIB**

In `backend/config/app.php` replace `'timezone' => 'UTC',` with:

```php
    'timezone' => env('APP_TIMEZONE', 'Asia/Jakarta'),
```

- [ ] **Step 5: Let `DocumentNumber` number by a document date**

Replace the body of `backend/app/Services/DocumentNumber.php` with:

```php
<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Nomor dokumen berurutan per bulan: {PREFIX}-YYYYMM-0001.
 * Bulan diambil dari tanggal dokumen bila diberikan (default: hari ini).
 * Dipanggil di dalam transaksi DB; baris terakhir dikunci agar dua pengguna tidak mendapat nomor sama.
 */
final class DocumentNumber
{
    /**
     * @param  class-string<Model>  $model
     */
    public static function next(string $model, string $column, string $prefix, ?string $date = null): string
    {
        $month = ($date !== null ? Carbon::parse($date) : now())->format('Ym');
        $monthPrefix = $prefix.'-'.$month.'-';

        $last = $model::where($column, 'like', $monthPrefix.'%')
            ->orderBy($column, 'desc')
            ->lockForUpdate()
            ->value($column);

        $seq = $last ? ((int) substr($last, strlen($monthPrefix))) + 1 : 1;

        return $monthPrefix.str_pad((string) $seq, 4, '0', STR_PAD_LEFT);
    }
}
```

- [ ] **Step 6: Add the period closing model and the lock guard**

Create `backend/app/Models/AccountingPeriodClosing.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu kali tutup buku sampai akhir bulan `period`. Baris yang dibuka kembali (reopened_at terisi) tidak mengunci.
 */
class AccountingPeriodClosing extends Model
{
    protected $fillable = [
        'period', 'end_date', 'closing_entry_id', 'net_income', 'notes', 'closed_by', 'closed_at',
        'reopened_at', 'reopened_by', 'reopen_reason', 'reopen_entry_id',
    ];

    protected $casts = [
        'end_date' => 'date',
        'net_income' => 'decimal:2',
        'closed_at' => 'datetime',
        'reopened_at' => 'datetime',
    ];

    public function closingEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class, 'closing_entry_id');
    }

    public function closedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['closingEntry', 'closedByUser']);

        return [
            'period' => $this->period,
            'end_date' => $this->end_date->toDateString(),
            'closing_entry_number' => $this->closingEntry?->entry_number,
            'net_income' => (float) $this->net_income,
            'notes' => $this->notes,
            'closed_by' => $this->closedByUser?->name,
            'closed_at' => $this->closed_at?->toIso8601String(),
            'reopened_at' => $this->reopened_at?->toIso8601String(),
            'reopen_reason' => $this->reopen_reason,
        ];
    }
}
```

Create `backend/app/Services/Accounting/PeriodLock.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\AccountingPeriodClosing;
use Illuminate\Support\Carbon;

/**
 * Kunci periode: jurnal bertanggal sampai akhir periode terakhir yang ditutup tidak boleh dibukukan.
 */
final class PeriodLock
{
    public static function lockDate(): ?string
    {
        $date = AccountingPeriodClosing::whereNull('reopened_at')->max('end_date');

        return $date ? Carbon::parse($date)->toDateString() : null;
    }

    public static function assertOpen(string $date): void
    {
        $lock = self::lockDate();
        if ($lock !== null && $date <= $lock) {
            throw new PosRuleException("Periode sampai {$lock} sudah ditutup; transaksi bertanggal {$date} tidak dapat dibukukan.");
        }
    }
}
```

- [ ] **Step 7: Replace `createEntry` in the engine**

In `backend/app/Services/AccountingEngine.php`, replace the imports block and the whole `createEntry` method (from its docblock `/** Create double-entry journal entry...` to its closing brace, just before `/** Get General Ledger with running balance`) with the following. Leave `getGeneralLedger`, `getTrialBalance` and `getFinancialStatements` untouched (Task A2 removes them).

```php
<?php

namespace App\Services;

use App\Exceptions\AccountingUnbalancedException;
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Services\Accounting\PeriodLock;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AccountingEngine
{
    /**
     * Satu-satunya pintu pembukuan jurnal. Aturan: minimal dua baris bernilai, tanpa nominal negatif,
     * satu sisi per baris, debit = kredit sampai sen, dan tanggal di luar periode yang sudah ditutup.
     *
     * @param  array<int, array{account_id: int, debit?: float|int|string, credit?: float|int|string, note?: ?string}>  $items
     *
     * @throws AccountingUnbalancedException
     * @throws PosRuleException
     */
    public function createEntry(
        string $referenceType,
        string $referenceId,
        string $description,
        array $items,
        ?string $entryDate = null,
        int $branchId = 3,
        ?int $reversalOfId = null
    ): JournalEntry {
        $lines = self::normalizeLines($items);
        $totalDebit = round(array_sum(array_column($lines, 'debit')), 2);
        $totalCredit = round(array_sum(array_column($lines, 'credit')), 2);

        if (self::cents($totalDebit) !== self::cents($totalCredit)) {
            throw new AccountingUnbalancedException($totalDebit, $totalCredit);
        }

        $date = $entryDate !== null ? Carbon::parse($entryDate)->toDateString() : now()->toDateString();
        PeriodLock::assertOpen($date);

        return DB::transaction(function () use ($referenceType, $referenceId, $description, $lines, $date, $branchId, $reversalOfId, $totalDebit, $totalCredit) {
            $entry = JournalEntry::create([
                'entry_number' => DocumentNumber::next(JournalEntry::class, 'entry_number', 'JRN', $date),
                'entry_date' => $date,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'description' => $description,
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
                'status' => 'POSTED',
                'branch_id' => $branchId,
                'created_by' => auth()->id(),
                'reversal_of_id' => $reversalOfId,
            ]);

            foreach ($lines as $line) {
                JournalItem::create($line + ['journal_entry_id' => $entry->id]);
            }

            return $entry->load('items.account');
        });
    }

    /**
     * @return list<array{account_id: int, debit: float, credit: float, note: ?string}>
     */
    private static function normalizeLines(array $items): array
    {
        $lines = [];
        foreach ($items as $item) {
            $debit = round((float) ($item['debit'] ?? 0), 2);
            $credit = round((float) ($item['credit'] ?? 0), 2);
            if ($debit < 0 || $credit < 0) {
                throw new PosRuleException('Nominal baris jurnal tidak boleh negatif.');
            }
            if ($debit > 0 && $credit > 0) {
                throw new PosRuleException('Satu baris jurnal hanya boleh berisi debit atau kredit.');
            }
            if ($debit > 0 || $credit > 0) {
                $lines[] = ['account_id' => (int) $item['account_id'], 'debit' => $debit, 'credit' => $credit, 'note' => $item['note'] ?? null];
            }
        }

        if (count($lines) < 2) {
            throw new PosRuleException('Jurnal minimal berisi dua baris bernilai.');
        }

        return $lines;
    }

    private static function cents(float $amount): int
    {
        return (int) round($amount * 100);
    }
```

(The class keeps its closing brace after the remaining report methods.)

- [ ] **Step 8: Add `isEmpty()` to `JournalDraft` and render the unbalanced exception as 422**

In `backend/app/Services/JournalDraft.php`, add this method after `credit()`:

```php
    public function isEmpty(): bool
    {
        return $this->lines === [];
    }
```

Replace `backend/app/Exceptions/AccountingUnbalancedException.php` with:

```php
<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;

class AccountingUnbalancedException extends Exception
{
    public function __construct(float $debit, float $credit, string $message = '')
    {
        $diff = abs($debit - $credit);
        $msg = $message ?: 'Ayat jurnal tidak seimbang! Total Debit (Rp '.number_format($debit, 2).') != Total Kredit (Rp '.number_format($credit, 2).'), Selisih: Rp '.number_format($diff, 2);
        parent::__construct($msg, 422);
    }

    public function render(): JsonResponse
    {
        return response()->json(['message' => $this->getMessage()], 422);
    }
}
```

- [ ] **Step 9: Replace the `JournalEntry` model**

Replace `backend/app/Models/JournalEntry.php` with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class JournalEntry extends Model
{
    use HasFactory;

    /** Jurnal penyesuaian manual; satu-satunya jenis yang boleh dibalik dari layar jurnal. */
    public const MANUAL = 'MANUAL_ADJUSTMENT';

    protected $table = 'journal_entries';

    protected $fillable = [
        'entry_number',
        'entry_date',
        'reference_type',
        'reference_id',
        'description',
        'total_debit',
        'total_credit',
        'status',
        'branch_id',
        'created_by',
        'reversal_of_id',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'total_debit' => 'decimal:2',
        'total_credit' => 'decimal:2',
        'branch_id' => 'integer',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(JournalItem::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Jurnal asal yang dibalik oleh jurnal ini. */
    public function reversalOf(): BelongsTo
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    /** Jurnal pembalik untuk jurnal ini (maksimal satu). */
    public function reversal(): HasOne
    {
        return $this->hasOne(self::class, 'reversal_of_id');
    }

    /**
     * Baris jurnal dengan debit & kredit ditukar, siap dikirim ke AccountingEngine::createEntry.
     *
     * @return list<array{account_id: int, debit: float, credit: float, note: string}>
     */
    public function reversedItems(string $notePrefix): array
    {
        return $this->items()->get()->map(fn (JournalItem $item) => [
            'account_id' => $item->account_id,
            'debit' => (float) $item->credit,
            'credit' => (float) $item->debit,
            'note' => $notePrefix.$item->note,
        ])->all();
    }

    /**
     * Bentuk jurnal untuk frontend.
     */
    public function toApiArray(): array
    {
        $this->loadMissing(['items.account', 'reversal', 'reversalOf', 'creator']);

        return [
            'id' => $this->id,
            'entry_number' => $this->entry_number,
            'entry_date' => $this->entry_date?->toDateString(),
            'reference_type' => $this->reference_type,
            'reference_id' => $this->reference_id,
            'description' => $this->description,
            'total_debit' => (float) $this->total_debit,
            'total_credit' => (float) $this->total_credit,
            'reversal_of' => $this->reversalOf?->entry_number,
            'reversed_by' => $this->reversal?->entry_number,
            'can_reverse' => $this->reference_type === self::MANUAL && $this->reversal === null,
            'created_by_name' => $this->creator?->name,
            'lines' => $this->items->map(fn (JournalItem $item) => [
                'account_code' => $item->account?->account_code,
                'account_name' => $item->account?->account_name,
                'debit' => (float) $item->debit,
                'credit' => (float) $item->credit,
                'note' => $item->note,
            ])->values()->all(),
        ];
    }
}
```

- [ ] **Step 10: Run the engine tests, then the whole backend suite**

Run: `cd backend && php artisan test --filter=AccountingEngineTest`
Expected: PASS (7 tests).

Run: `cd backend && composer test`
Expected: all tests pass. If a POS/inventory test now fails with "tidak seimbang" or "dua baris", that posting path builds an unbalanced or degenerate journal: fix it at its source (round each amount to cents where it is computed, or skip posting when nothing changed). Do not loosen the engine rules.

- [ ] **Step 11: Commit**

```bash
git add backend/config/app.php backend/database/migrations/2026_09_29_000001_harden_journal_entries_and_add_period_closings.php backend/app/Models/AccountingPeriodClosing.php backend/app/Models/JournalEntry.php backend/app/Services/Accounting/PeriodLock.php backend/app/Services/AccountingEngine.php backend/app/Services/DocumentNumber.php backend/app/Services/JournalDraft.php backend/app/Exceptions/AccountingUnbalancedException.php backend/tests/Unit/AccountingEngineTest.php
git commit -m "feat(accounting): harden journal posting with period lock and audit trail

Journals must balance to the cent, carry at least two non-zero one-sided
lines, and fall after the latest closed period. JRN numbers are locked
and follow the entry month; entries record their creator and reversal
link. Business dates now use WIB.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A2: COA-driven reports — trial balance, general ledger, income statement, balance sheet, changes in equity

**Files:**
- Create: `backend/app/Services/Accounting/AccountBalance.php`
- Create: `backend/app/Services/Accounting/LedgerBalances.php`
- Create: `backend/app/Services/Accounting/FinancialReportService.php`
- Modify: `backend/app/Services/AccountingEngine.php` (delete the three report methods)
- Modify: `backend/app/Http/Controllers/Api/v1/AccountingReportController.php` (`generalLedger`, `trialBalance`, `financialStatements`, new `range()` helper)
- Modify: `backend/routes/api.php` (financial-statements permission)
- Test: `backend/tests/Feature/FinancialReportTest.php` (create), `backend/tests/Feature/AccountingReportApiTest.php` (full replacement)

**Interfaces:**
- Consumes: `JournalDraft`, `AccountingEngine::createEntry` (Task A1).
- Produces: `LedgerBalances::CLOSING_TYPES = ['PERIOD_CLOSING', 'PERIOD_REOPEN']`, `LedgerBalances::forRange(?string $from, ?string $to, bool $excludeClosing = false): Collection<int, AccountBalance>`
- Produces: `AccountBalance` with public readonly `account` (Account), `debit`, `credit` (float), `signed(string $side): float`, `net(): float`
- Produces: `FinancialReportService::trialBalance(string $asOf): array`, `generalLedger(string $accountCode, ?string $from, ?string $to): array`, `incomeStatement(?string $from, string $to): array`, `balanceSheet(string $asOf): array`, `equityChanges(?string $from, string $to): array`, `financialStatements(?string $from, string $to): array`
- JSON shapes (consumed by Part B):
  - trial balance: `{as_of, accounts:[{account_code, account_name, account_type, normal_balance, debit, credit}], total_debit, total_credit, difference, is_balanced}`
  - ledger: `{account:{account_code, account_name, account_type, normal_balance}, start_date, end_date, opening_balance, total_debit, total_credit, ending_balance, mutations:[{id, entry_number, date, reference_type, reference_id, description, note, debit, credit, running_balance}]}`
  - statements: `{period:{start_date, end_date}, income_statement:{revenue, contra_revenue, net_revenue, cost_of_sales, gross_profit, operating_expenses, net_income}, balance_sheet:{as_of, current_assets, fixed_assets, total_assets, liabilities, equity, total_liabilities_and_equity, difference, is_balanced}, equity_changes:{opening_equity, owner_contributions, net_income, closing_equity, difference}}` where each section is `{lines:[{code, name, amount}], total}`.

- [ ] **Step 1: Write the failing report tests**

Create `backend/tests/Feature/FinancialReportTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FinancialReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines [kode, debit, kredit] */
    private function post(string $date, array $lines, string $type = 'TEST'): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), $type, 'T-'.uniqid(), 'Uji laporan', $date);
    }

    /** Penjualan POS lengkap: diskon, surcharge EDC, MDR, HPP, selisih opname, dan beban listrik. */
    private function postMarchActivity(): void
    {
        $this->post('2021-03-10', [
            ['1-1000', 950000, 0], ['4-9000', 50000, 0], ['6-1009', 7000, 0],
            ['4-1000', 0, 900000], ['4-1001', 0, 100000], ['4-2000', 0, 7000],
        ]);
        $this->post('2021-03-10', [['5-1000', 600000, 0], ['1-2000', 0, 600000]]);
        $this->post('2021-03-20', [['5-2000', 20000, 0], ['1-2000', 0, 20000]]);
        $this->post('2021-03-25', [['6-1001', 100000, 0], ['1-1000', 0, 100000]]);
    }

    private function amount(array $section, ?string $code): float
    {
        foreach ($section['lines'] as $line) {
            if ($line['code'] === $code) {
                return $line['amount'];
            }
        }

        return 0.0;
    }

    public function test_income_statement_includes_every_revenue_and_expense_account(): void
    {
        $this->postMarchActivity();

        $is = app(FinancialReportService::class)->incomeStatement('2021-03-01', '2021-03-31');

        $this->assertEquals(1007000, $is['revenue']['total']);
        $this->assertEquals(7000, $this->amount($is['revenue'], '4-2000'));
        $this->assertEquals(50000, $is['contra_revenue']['total']);
        $this->assertEquals(957000, $is['net_revenue']);
        $this->assertEquals(20000, $this->amount($is['cost_of_sales'], '5-2000'));
        $this->assertEquals(620000, $is['cost_of_sales']['total']);
        $this->assertEquals(337000, $is['gross_profit']);
        $this->assertEquals(7000, $this->amount($is['operating_expenses'], '6-1009'));
        $this->assertEquals(230000, $is['net_income']);
    }

    public function test_balance_sheet_balances_and_shows_dp_liability_and_unclosed_earnings(): void
    {
        $reports = app(FinancialReportService::class);
        $before = $reports->balanceSheet('2021-03-31');

        $this->post('2021-03-05', [['1-1001', 200000, 0], ['2-1004', 0, 200000]], 'BOOKING_DP');
        $this->postMarchActivity();

        $after = $reports->balanceSheet('2021-03-31');
        $this->assertTrue($after['is_balanced']);
        $this->assertEquals(0, $after['difference']);
        $this->assertEquals(200000, $this->amount($after['liabilities'], '2-1004') - $this->amount($before['liabilities'], '2-1004'));
        $this->assertEquals(230000, $this->amount($after['equity'], null) - $this->amount($before['equity'], null));
    }

    public function test_general_ledger_starts_from_the_balance_before_the_period(): void
    {
        $reports = app(FinancialReportService::class);
        $baseline = $reports->generalLedger('1-1000', '2021-03-01', '2021-03-31');

        $this->post('2021-02-10', [['1-1000', 500000, 0], ['3-1000', 0, 500000]]);
        $this->post('2021-03-12', [['1-1000', 100000, 0], ['4-1000', 0, 100000]]);

        $ledger = $reports->generalLedger('1-1000', '2021-03-01', '2021-03-31');
        $this->assertEquals(500000, $ledger['opening_balance'] - $baseline['opening_balance']);
        $mutation = collect($ledger['mutations'])->firstWhere('date', '2021-03-12');
        $this->assertEquals(100000, $mutation['debit']);
        $this->assertEquals($ledger['ending_balance'], end($ledger['mutations'])['running_balance']);
    }

    public function test_trial_balance_is_balanced_and_lists_every_account(): void
    {
        $this->postMarchActivity();

        $tb = app(FinancialReportService::class)->trialBalance('2021-03-31');

        $this->assertTrue($tb['is_balanced']);
        $codes = array_column($tb['accounts'], 'account_code');
        foreach (['2-1004', '4-2000', '5-2000', '6-1009'] as $code) {
            $this->assertContains($code, $codes);
        }
    }

    public function test_equity_changes_reconcile(): void
    {
        $this->post('2021-03-02', [['1-1001', 1000000, 0], ['3-1000', 0, 1000000]]);
        $this->postMarchActivity();

        $eq = app(FinancialReportService::class)->equityChanges('2021-03-01', '2021-03-31');

        $this->assertEquals(1000000, $eq['owner_contributions']);
        $this->assertEquals(230000, $eq['net_income']);
        $this->assertEquals(0, $eq['difference']);
    }

    public function test_financial_statements_endpoint_uses_the_requested_period(): void
    {
        $this->postMarchActivity();

        $this->getJson('/api/v1/accounting/financial-statements?start_date=2021-03-01&end_date=2021-03-31')
            ->assertOk()
            ->assertJsonPath('data.period.start_date', '2021-03-01')
            ->assertJsonPath('data.income_statement.net_income', 230000)
            ->assertJsonPath('data.balance_sheet.is_balanced', true)
            ->assertJsonStructure(['data' => ['equity_changes' => ['opening_equity', 'owner_contributions', 'net_income', 'closing_equity', 'difference']]]);
    }

    public function test_report_endpoints_validate_dates(): void
    {
        $this->getJson('/api/v1/accounting/financial-statements?start_date=2021-03-31&end_date=2021-03-01')->assertStatus(422);
        $this->getJson('/api/v1/accounting/trial-balance?as_of=31-03-2021')->assertStatus(422);
        $this->getJson('/api/v1/accounting/general-ledger?account_code=9-9999')->assertStatus(422);
    }

    public function test_kasir_cannot_read_reports(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/financial-statements')->assertForbidden();
        $this->getJson('/api/v1/accounting/trial-balance')->assertForbidden();
        $this->getJson('/api/v1/accounting/general-ledger?account_code=1-1000')->assertForbidden();
    }
}
```

Replace `backend/tests/Feature/AccountingReportApiTest.php` with (the manual-journal test moves to Task A6):

```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Supplier;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AccountingReportApiTest extends TestCase
{
    use DatabaseTransactions;

    public function test_can_fetch_journals_list(): void
    {
        $this->getJson('/api/v1/accounting/journals')->assertOk()->assertJsonStructure(['success', 'data']);
    }

    public function test_can_fetch_general_ledger(): void
    {
        $this->getJson('/api/v1/accounting/general-ledger?account_code=1-1000')
            ->assertOk()
            ->assertJsonStructure(['data' => ['account', 'opening_balance', 'total_debit', 'total_credit', 'ending_balance', 'mutations']]);
    }

    public function test_can_fetch_trial_balance(): void
    {
        $this->getJson('/api/v1/accounting/trial-balance')
            ->assertOk()
            ->assertJsonStructure(['data' => ['as_of', 'accounts', 'total_debit', 'total_credit', 'difference', 'is_balanced']]);
    }

    public function test_can_fetch_financial_statements(): void
    {
        $this->getJson('/api/v1/accounting/financial-statements')
            ->assertOk()
            ->assertJsonStructure(['data' => ['period', 'income_statement', 'balance_sheet', 'equity_changes']]);
    }

    public function test_can_pay_supplier_debt(): void
    {
        $supplier = Supplier::firstOrCreate(
            ['supplier_code' => 'SUP-TEST-AP'],
            ['supplier_name' => 'PT Supplier Hutang Test', 'phone' => '08123456789']
        );
        $product = Product::create([
            'product_name' => 'Ban Hutang '.uniqid(), 'product_code' => 'AP-'.uniqid(), 'barcode' => 'BC-AP-'.uniqid(),
            'brand' => 'Bridgestone', 'product_cost' => 500000, 'product_price' => 700000, 'product_quantity' => 0,
        ]);
        $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $product->id, 'quantity' => 4, 'batch_cost' => 500000,
            'supplier_id' => $supplier->id, 'payment_method' => 'TEMPO',
        ])->assertCreated();

        $this->postJson('/api/v1/accounting/accounts-payable/pay', [
            'supplier_id' => $supplier->id,
            'amount' => 1000000,
            'payment_method' => 'BANK_BCA',
            'payment_date' => now()->toDateString(),
            'notes' => 'Pelunasan sebagian faktur ban Bridgestone',
        ])->assertOk()->assertJson(['success' => true]);

        $this->assertDatabaseHas('journal_entries', ['reference_type' => 'DEBT_PAYMENT']);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter="FinancialReportTest|AccountingReportApiTest"`
Expected: FAIL — `Class "App\Services\Accounting\FinancialReportService" not found` and missing JSON keys.

- [ ] **Step 3: Add the balance query and value object**

Create `backend/app/Services/Accounting/AccountBalance.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\Account;

/**
 * Jumlah debit & kredit satu akun dalam suatu rentang tanggal.
 */
final class AccountBalance
{
    public function __construct(
        public readonly Account $account,
        public readonly float $debit,
        public readonly float $credit,
    ) {
    }

    /** Saldo bila dibaca dari sisi DEBIT atau CREDIT (positif = saldo ada di sisi itu). */
    public function signed(string $side): float
    {
        return round($side === 'DEBIT' ? $this->debit - $this->credit : $this->credit - $this->debit, 2);
    }

    /** Saldo di sisi normal akun; negatif bila saldonya ada di sisi lawan. */
    public function net(): float
    {
        return $this->signed($this->account->normal_balance);
    }
}
```

Create `backend/app/Services/Accounting/LedgerBalances.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\Account;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Saldo seluruh akun COA dari jurnal POSTED dalam satu query ber-GROUP BY.
 */
final class LedgerBalances
{
    /** Jurnal penutup & pembaliknya; dikeluarkan dari laba rugi agar tutup buku tidak menghapus hasil periode. */
    public const CLOSING_TYPES = ['PERIOD_CLOSING', 'PERIOD_REOPEN'];

    /**
     * @return Collection<int, AccountBalance>
     */
    public static function forRange(?string $from, ?string $to, bool $excludeClosing = false): Collection
    {
        $sums = DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->where('e.status', 'POSTED')
            ->when($from !== null, fn ($q) => $q->where('e.entry_date', '>=', $from))
            ->when($to !== null, fn ($q) => $q->where('e.entry_date', '<=', $to))
            ->when($excludeClosing, fn ($q) => $q->whereNotIn('e.reference_type', self::CLOSING_TYPES))
            ->groupBy('i.account_id')
            ->selectRaw('i.account_id, SUM(i.debit) as debit, SUM(i.credit) as credit')
            ->get()
            ->keyBy('account_id');

        return Account::orderBy('account_code')->get()->map(fn (Account $account) => new AccountBalance(
            $account,
            round((float) ($sums->get($account->id)?->debit ?? 0), 2),
            round((float) ($sums->get($account->id)?->credit ?? 0), 2),
        ));
    }
}
```

- [ ] **Step 4: Add the report service**

Create `backend/app/Services/Accounting/FinancialReportService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\JournalItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Laporan SAK EMKM dari jurnal POSTED. Akun dikelompokkan dari tipe & saldo normal di COA,
 * sehingga akun baru otomatis ikut tanpa mengubah kode ini.
 */
class FinancialReportService
{
    public function trialBalance(string $asOf): array
    {
        $rows = LedgerBalances::forRange(null, $asOf)->map(function (AccountBalance $b) {
            $debitSide = $b->signed('DEBIT');

            return [
                'account_code' => $b->account->account_code,
                'account_name' => $b->account->account_name,
                'account_type' => $b->account->account_type,
                'normal_balance' => $b->account->normal_balance,
                'debit' => $debitSide > 0 ? $debitSide : 0.0,
                'credit' => $debitSide < 0 ? -$debitSide : 0.0,
            ];
        })->values()->all();

        $totalDebit = round(array_sum(array_column($rows, 'debit')), 2);
        $totalCredit = round(array_sum(array_column($rows, 'credit')), 2);
        $difference = round(abs($totalDebit - $totalCredit), 2);

        return [
            'as_of' => $asOf,
            'accounts' => $rows,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'difference' => $difference,
            'is_balanced' => $difference < 0.005,
        ];
    }

    public function generalLedger(string $accountCode, ?string $from, ?string $to): array
    {
        $account = Account::where('account_code', $accountCode)->firstOrFail();
        $sign = $account->normal_balance === 'DEBIT' ? 1 : -1;

        $opening = 0.0;
        if ($from !== null) {
            $prior = self::postedItems($account->id)
                ->where('e.entry_date', '<', $from)
                ->selectRaw('COALESCE(SUM(journal_items.debit), 0) as d, COALESCE(SUM(journal_items.credit), 0) as c')
                ->first();
            $opening = round($sign * ((float) $prior->d - (float) $prior->c), 2);
        }

        $items = self::postedItems($account->id)
            ->when($from !== null, fn ($q) => $q->where('e.entry_date', '>=', $from))
            ->when($to !== null, fn ($q) => $q->where('e.entry_date', '<=', $to))
            ->orderBy('e.entry_date')->orderBy('e.id')->orderBy('journal_items.id')
            ->get([
                'journal_items.id', 'journal_items.debit', 'journal_items.credit', 'journal_items.note',
                'e.entry_number', 'e.entry_date', 'e.reference_type', 'e.reference_id', 'e.description',
            ]);

        $running = $opening;
        $totalDebit = 0.0;
        $totalCredit = 0.0;
        $mutations = [];
        foreach ($items as $item) {
            $debit = (float) $item->debit;
            $credit = (float) $item->credit;
            $totalDebit += $debit;
            $totalCredit += $credit;
            $running = round($running + $sign * ($debit - $credit), 2);
            $mutations[] = [
                'id' => $item->id,
                'entry_number' => $item->entry_number,
                'date' => Carbon::parse($item->entry_date)->toDateString(),
                'reference_type' => $item->reference_type,
                'reference_id' => $item->reference_id,
                'description' => $item->description,
                'note' => $item->note,
                'debit' => $debit,
                'credit' => $credit,
                'running_balance' => $running,
            ];
        }

        return [
            'account' => [
                'account_code' => $account->account_code,
                'account_name' => $account->account_name,
                'account_type' => $account->account_type,
                'normal_balance' => $account->normal_balance,
            ],
            'start_date' => $from,
            'end_date' => $to,
            'opening_balance' => $opening,
            'total_debit' => round($totalDebit, 2),
            'total_credit' => round($totalCredit, 2),
            'ending_balance' => $running,
            'mutations' => $mutations,
        ];
    }

    public function incomeStatement(?string $from, string $to): array
    {
        $sections = ['revenue' => [], 'contra_revenue' => [], 'cost_of_sales' => [], 'operating_expenses' => []];
        foreach (LedgerBalances::forRange($from, $to, excludeClosing: true) as $b) {
            $key = self::incomeSection($b->account);
            if ($key !== null && $b->net() != 0.0) {
                $sections[$key][] = self::line($b->account, $b->net());
            }
        }

        $revenue = self::section($sections['revenue']);
        $contra = self::section($sections['contra_revenue']);
        $cost = self::section($sections['cost_of_sales']);
        $opex = self::section($sections['operating_expenses']);
        $netRevenue = round($revenue['total'] - $contra['total'], 2);
        $grossProfit = round($netRevenue - $cost['total'], 2);

        return [
            'revenue' => $revenue,
            'contra_revenue' => $contra,
            'net_revenue' => $netRevenue,
            'cost_of_sales' => $cost,
            'gross_profit' => $grossProfit,
            'operating_expenses' => $opex,
            'net_income' => round($grossProfit - $opex['total'], 2),
        ];
    }

    public function balanceSheet(string $asOf): array
    {
        $sections = ['current_assets' => [], 'fixed_assets' => [], 'liabilities' => [], 'equity' => []];
        $unclosedEarnings = 0.0;

        foreach (LedgerBalances::forRange(null, $asOf) as $b) {
            $type = $b->account->account_type;
            if ($type === 'REVENUE' || $type === 'EXPENSE') {
                $unclosedEarnings += $b->signed('CREDIT');
                continue;
            }
            $key = match ($type) {
                'ASSET' => str_starts_with($b->account->account_code, '1-3') ? 'fixed_assets' : 'current_assets',
                'LIABILITY' => 'liabilities',
                default => 'equity',
            };
            $sections[$key][] = self::line($b->account, $b->signed($type === 'ASSET' ? 'DEBIT' : 'CREDIT'));
        }
        $sections['equity'][] = ['code' => null, 'name' => 'Laba (Rugi) Periode Berjalan (belum ditutup)', 'amount' => round($unclosedEarnings, 2)];

        $current = self::section($sections['current_assets']);
        $fixed = self::section($sections['fixed_assets']);
        $liabilities = self::section($sections['liabilities']);
        $equity = self::section($sections['equity']);
        $totalAssets = round($current['total'] + $fixed['total'], 2);
        $totalLiabilitiesAndEquity = round($liabilities['total'] + $equity['total'], 2);
        $difference = round($totalAssets - $totalLiabilitiesAndEquity, 2);

        return [
            'as_of' => $asOf,
            'current_assets' => $current,
            'fixed_assets' => $fixed,
            'total_assets' => $totalAssets,
            'liabilities' => $liabilities,
            'equity' => $equity,
            'total_liabilities_and_equity' => $totalLiabilitiesAndEquity,
            'difference' => $difference,
            'is_balanced' => abs($difference) < 0.005,
        ];
    }

    public function equityChanges(?string $from, string $to): array
    {
        $opening = $from === null
            ? 0.0
            : $this->balanceSheet(Carbon::parse($from)->subDay()->toDateString())['equity']['total'];

        $contributions = 0.0;
        foreach (LedgerBalances::forRange($from, $to, excludeClosing: true) as $b) {
            if ($b->account->account_type === 'EQUITY') {
                $contributions += $b->signed('CREDIT');
            }
        }
        $contributions = round($contributions, 2);
        $netIncome = $this->incomeStatement($from, $to)['net_income'];
        $closing = $this->balanceSheet($to)['equity']['total'];

        return [
            'opening_equity' => $opening,
            'owner_contributions' => $contributions,
            'net_income' => $netIncome,
            'closing_equity' => $closing,
            'difference' => round($closing - $opening - $contributions - $netIncome, 2),
        ];
    }

    public function financialStatements(?string $from, string $to): array
    {
        return [
            'period' => ['start_date' => $from, 'end_date' => $to],
            'income_statement' => $this->incomeStatement($from, $to),
            'balance_sheet' => $this->balanceSheet($to),
            'equity_changes' => $this->equityChanges($from, $to),
        ];
    }

    private static function postedItems(int $accountId): Builder
    {
        return JournalItem::query()
            ->join('journal_entries as e', 'e.id', '=', 'journal_items.journal_entry_id')
            ->where('journal_items.account_id', $accountId)
            ->where('e.status', 'POSTED');
    }

    private static function incomeSection(Account $account): ?string
    {
        return match ($account->account_type) {
            'REVENUE' => $account->normal_balance === 'CREDIT' ? 'revenue' : 'contra_revenue',
            'EXPENSE' => str_starts_with($account->account_code, '5-') ? 'cost_of_sales' : 'operating_expenses',
            default => null,
        };
    }

    /** @return array{code: string, name: string, amount: float} */
    private static function line(Account $account, float $amount): array
    {
        return ['code' => $account->account_code, 'name' => $account->account_name, 'amount' => round($amount, 2)];
    }

    /**
     * @param  list<array{amount: float}>  $lines
     * @return array{lines: list<array>, total: float}
     */
    private static function section(array $lines): array
    {
        return ['lines' => $lines, 'total' => round(array_sum(array_column($lines, 'amount')), 2)];
    }
}
```

- [ ] **Step 5: Delete the old report methods from the engine**

In `backend/app/Services/AccountingEngine.php`, delete the methods `getGeneralLedger`, `getTrialBalance` and `getFinancialStatements` together with their docblocks (everything after `cents()` up to the class's closing brace). Then remove the now-unused `use App\Models\Account;` import. Verify nothing else calls them:

Run: `cd backend && grep -rn "getGeneralLedger\|getTrialBalance\|getFinancialStatements" app tests routes`
Expected: matches only in `AccountingReportController.php` (replaced in the next step).

- [ ] **Step 6: Switch the controller report actions to the service**

In `backend/app/Http/Controllers/Api/v1/AccountingReportController.php`:

Add imports:

```php
use App\Services\Accounting\FinancialReportService;
use Illuminate\Validation\Rule;
```

Replace the methods `generalLedger`, `trialBalance` and `financialStatements` with:

```php
    public function generalLedger(Request $request, FinancialReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'account_code' => 'required|string|exists:accounts,account_code',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('start_date'), 'after_or_equal:start_date')],
        ]);

        return response()->json([
            'success' => true,
            'data' => $reports->generalLedger($data['account_code'], $data['start_date'] ?? null, $data['end_date'] ?? null),
        ]);
    }

    public function trialBalance(Request $request, FinancialReportService $reports): JsonResponse
    {
        $data = $request->validate(['as_of' => 'nullable|date_format:Y-m-d']);

        return response()->json([
            'success' => true,
            'data' => $reports->trialBalance($data['as_of'] ?? now()->toDateString()),
        ]);
    }

    public function financialStatements(Request $request, FinancialReportService $reports): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json(['success' => true, 'data' => $reports->financialStatements($from, $to)]);
    }

    /**
     * Rentang laporan; tanpa end_date = hari ini, tanpa start_date = sejak awal pembukuan.
     *
     * @return array{0: ?string, 1: string}
     */
    private function range(Request $request): array
    {
        $data = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => ['nullable', 'date_format:Y-m-d', Rule::when($request->filled('start_date'), 'after_or_equal:start_date')],
        ]);

        return [$data['start_date'] ?? null, $data['end_date'] ?? now()->toDateString()];
    }
```

- [ ] **Step 7: Let accounting-hub users read the statements too**

In `backend/routes/api.php`, replace:

```php
            Route::get('financial-statements', [AccountingReportController::class, 'financialStatements'])->middleware('permission:financial_reports');
```

with:

```php
            Route::get('financial-statements', [AccountingReportController::class, 'financialStatements'])->middleware('permission:financial_reports,accounting_hub');
```

- [ ] **Step 8: Run the tests**

Run: `cd backend && php artisan test --filter="FinancialReportTest|AccountingReportApiTest|AuthorizationTest"`
Expected: PASS.

Run: `cd backend && composer test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Services/Accounting/AccountBalance.php backend/app/Services/Accounting/LedgerBalances.php backend/app/Services/Accounting/FinancialReportService.php backend/app/Services/AccountingEngine.php backend/app/Http/Controllers/Api/v1/AccountingReportController.php backend/routes/api.php backend/tests/Feature/FinancialReportTest.php backend/tests/Feature/AccountingReportApiTest.php
git commit -m "feat(accounting): compute sak emkm reports from the coa for any period

Statements no longer hard-code account lists, so surcharge, opname
variance, MDR and DP accounts are included and the balance sheet
balances. Reports accept a date range; the ledger starts from the
balance before the period and equity changes reconcile.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A3: Direct-method cash flow and cash balances

**Files:**
- Create: `backend/app/Services/Accounting/CashFlowReport.php`
- Modify: `backend/app/Http/Controllers/Api/v1/AccountingReportController.php` (add `cashFlow`, `cashBalances`)
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/CashFlowReportTest.php`

**Interfaces:**
- Consumes: `LedgerBalances::forRange`, `AccountBalance::signed` (Task A2); `range()` helper in the controller (Task A2).
- Produces: `CashFlowReport::build(?string $from, string $to): array` → `{period:{start_date,end_date}, operating:{customers, suppliers, expenses, other, net}, investing:{fixed_assets, net}, financing:{equity, net}, net_change, beginning_cash, ending_cash, ending_cash_drawer, ending_bank, is_reconciled}` (signs: inflow positive, outflow negative).
- Produces: `CashFlowReport::cashBalances(string $asOf): array{'1-1000': float, '1-1001': float}`
- Produces: routes `GET accounting/cash-flow` (financial_reports, accounting_hub), `GET accounting/cash-balances` (expenses, accounting_hub, financial_reports).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/CashFlowReportTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Services\Accounting\CashFlowReport;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CashFlowReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function post(string $date, array $lines): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), 'TEST', 'CF-'.uniqid(), 'Uji arus kas', $date);
    }

    private function postAprilActivity(): void
    {
        // Penjualan BON sebagian: kas 50rb + piutang 50rb, HPP 60rb.
        $this->post('2021-04-10', [['1-1000', 50000, 0], ['1-1002', 50000, 0], ['4-1000', 0, 100000]]);
        $this->post('2021-04-10', [['5-1000', 60000, 0], ['1-2000', 0, 60000]]);
        // Setor kas laci ke bank: tidak mengubah total kas.
        $this->post('2021-04-11', [['1-1001', 30000, 0], ['1-1000', 0, 30000]]);
        $this->post('2021-04-12', [['6-1001', 20000, 0], ['1-1000', 0, 20000]]);
        $this->post('2021-04-13', [['2-1000', 40000, 0], ['1-1001', 0, 40000]]);
        $this->post('2021-04-14', [['1-1001', 500000, 0], ['3-1000', 0, 500000]]);
    }

    public function test_cash_flow_classifies_and_reconciles(): void
    {
        $this->postAprilActivity();

        $cf = app(CashFlowReport::class)->build('2021-04-01', '2021-04-30');

        $this->assertEquals(50000, $cf['operating']['customers']);
        $this->assertEquals(-40000, $cf['operating']['suppliers']);
        $this->assertEquals(-20000, $cf['operating']['expenses']);
        $this->assertEquals(-10000, $cf['operating']['net']);
        $this->assertEquals(0, $cf['investing']['net']);
        $this->assertEquals(500000, $cf['financing']['equity']);
        $this->assertEquals(490000, $cf['net_change']);
        $this->assertTrue($cf['is_reconciled']);
        $this->assertEquals($cf['ending_cash'], $cf['ending_cash_drawer'] + $cf['ending_bank']);
    }

    public function test_cash_flow_endpoint_and_cash_balances(): void
    {
        $this->postAprilActivity();

        $this->getJson('/api/v1/accounting/cash-flow?start_date=2021-04-01&end_date=2021-04-30')
            ->assertOk()
            ->assertJsonPath('data.net_change', 490000)
            ->assertJsonPath('data.is_reconciled', true);

        $this->getJson('/api/v1/accounting/cash-balances')
            ->assertOk()
            ->assertJsonStructure(['data' => ['1-1000', '1-1001']]);
    }

    public function test_kasir_cannot_read_cash_reports(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/cash-flow')->assertForbidden();
        $this->getJson('/api/v1/accounting/cash-balances')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=CashFlowReportTest`
Expected: FAIL — class `CashFlowReport` not found / 404 routes.

- [ ] **Step 3: Implement the cash flow report**

Create `backend/app/Services/Accounting/CashFlowReport.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\JournalEntry;
use Illuminate\Support\Carbon;

/**
 * Laporan arus kas metode langsung. Setiap jurnal yang menyentuh kas laci/bank membagi baris non-kasnya
 * (kredit − debit) ke kelompok arus kas, sehingga total kelompok selalu sama dengan perubahan kas.
 */
class CashFlowReport
{
    public const CASH_ACCOUNTS = ['1-1000', '1-1001'];

    public function build(?string $from, string $to): array
    {
        $cashIds = Account::whereIn('account_code', self::CASH_ACCOUNTS)->pluck('id')->map(fn ($id) => (int) $id)->all();
        $buckets = array_fill_keys(['customers', 'suppliers', 'expenses', 'other_operating', 'fixed_assets', 'equity'], 0.0);

        JournalEntry::with('items.account')
            ->where('status', 'POSTED')
            ->when($from !== null, fn ($q) => $q->where('entry_date', '>=', $from))
            ->where('entry_date', '<=', $to)
            ->whereHas('items', fn ($q) => $q->whereIn('account_id', $cashIds))
            ->chunkById(200, function ($entries) use (&$buckets, $cashIds) {
                foreach ($entries as $entry) {
                    foreach ($entry->items as $item) {
                        if (! in_array((int) $item->account_id, $cashIds, true)) {
                            $buckets[self::bucket($item->account)] += (float) $item->credit - (float) $item->debit;
                        }
                    }
                }
            });

        $buckets = array_map(fn (float $v) => round($v, 2), $buckets);
        $operating = round($buckets['customers'] + $buckets['suppliers'] + $buckets['expenses'] + $buckets['other_operating'], 2);
        $netChange = round($operating + $buckets['fixed_assets'] + $buckets['equity'], 2);

        $beginning = $from === null ? 0.0 : round(array_sum(self::cashBalances(Carbon::parse($from)->subDay()->toDateString())), 2);
        $ending = self::cashBalances($to);
        $endingTotal = round(array_sum($ending), 2);

        return [
            'period' => ['start_date' => $from, 'end_date' => $to],
            'operating' => [
                'customers' => $buckets['customers'],
                'suppliers' => $buckets['suppliers'],
                'expenses' => $buckets['expenses'],
                'other' => $buckets['other_operating'],
                'net' => $operating,
            ],
            'investing' => ['fixed_assets' => $buckets['fixed_assets'], 'net' => $buckets['fixed_assets']],
            'financing' => ['equity' => $buckets['equity'], 'net' => $buckets['equity']],
            'net_change' => $netChange,
            'beginning_cash' => $beginning,
            'ending_cash' => $endingTotal,
            'ending_cash_drawer' => $ending['1-1000'],
            'ending_bank' => $ending['1-1001'],
            'is_reconciled' => abs($beginning + $netChange - $endingTotal) < 0.005,
        ];
    }

    /**
     * @return array{'1-1000': float, '1-1001': float}
     */
    public static function cashBalances(string $asOf): array
    {
        $balances = ['1-1000' => 0.0, '1-1001' => 0.0];
        foreach (LedgerBalances::forRange(null, $asOf) as $b) {
            if (array_key_exists($b->account->account_code, $balances)) {
                $balances[$b->account->account_code] = $b->signed('DEBIT');
            }
        }

        return $balances;
    }

    private static function bucket(Account $account): string
    {
        $code = $account->account_code;

        return match (true) {
            $account->account_type === 'REVENUE', in_array($code, ['1-1002', '2-1004'], true) => 'customers',
            str_starts_with($code, '5-'), in_array($code, ['1-2000', '2-1000'], true) => 'suppliers',
            $account->account_type === 'EXPENSE' => 'expenses',
            str_starts_with($code, '1-3') => 'fixed_assets',
            $account->account_type === 'EQUITY' => 'equity',
            default => 'other_operating',
        };
    }
}
```

- [ ] **Step 4: Add the controller actions and routes**

In `AccountingReportController.php`, add the import `use App\Services\Accounting\CashFlowReport;` and these methods (after `financialStatements`):

```php
    public function cashFlow(Request $request, CashFlowReport $cashFlow): JsonResponse
    {
        [$from, $to] = $this->range($request);

        return response()->json(['success' => true, 'data' => $cashFlow->build($from, $to)]);
    }

    /** Saldo kas laci & bank hari ini (dipakai form beban untuk cek saldo). */
    public function cashBalances(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => CashFlowReport::cashBalances(now()->toDateString())]);
    }
```

In `backend/routes/api.php`, inside the `accounting` prefix group, directly after the `financial-statements` route, add:

```php
            Route::get('cash-flow', [AccountingReportController::class, 'cashFlow'])->middleware('permission:financial_reports,accounting_hub');
            Route::get('cash-balances', [AccountingReportController::class, 'cashBalances'])->middleware('permission:expenses,accounting_hub,financial_reports');
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && php artisan test --filter=CashFlowReportTest`
Expected: PASS (3 tests).

Run: `cd backend && composer test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/Accounting/CashFlowReport.php backend/app/Http/Controllers/Api/v1/AccountingReportController.php backend/routes/api.php backend/tests/Feature/CashFlowReportTest.php
git commit -m "feat(accounting): add reconciled direct-method cash flow statement

Each cash journal attributes its non-cash lines to a cash flow bucket,
so the buckets always equal the change in drawer plus bank. Supplier
payments are operating, not financing. Adds a cash balance endpoint for
the expense form.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A4: Period closing, reopening and the lock

**Files:**
- Create: `backend/app/Services/Accounting/PeriodClosingService.php`
- Create: `backend/app/Http/Controllers/Api/v1/AccountingPeriodController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/PeriodClosingTest.php`

**Interfaces:**
- Consumes: `PeriodLock`, `AccountingPeriodClosing::toApiArray()`, `JournalEntry::reversedItems()`, `JournalDraft::isEmpty()` (A1); `LedgerBalances`, `FinancialReportService` (A2).
- Produces: `PeriodClosingService::summary(): array{lock_date: ?string, suggested_period: string, closings: list<array>}`, `close(string $period, ?string $notes, User $user): AccountingPeriodClosing`, `reopen(string $period, string $reason, User $user): AccountingPeriodClosing`
- Produces: routes `GET accounting/periods`, `POST accounting/periods/close` `{period: 'YYYY-MM', notes?}`, `POST accounting/periods/{period}/reopen` `{reason}` (OWNER only). Closing record JSON = `AccountingPeriodClosing::toApiArray()`.
- New reference types: `PERIOD_CLOSING` (reference `TUTUP-YYYY-MM`), `PERIOD_REOPEN` (reference `BUKA-YYYY-MM`).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/PeriodClosingTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\RolePermission;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PeriodClosingTest extends TestCase
{
    use DatabaseTransactions;

    private function post(string $date, string $debit, string $credit, float $amount): JournalEntry
    {
        return (new JournalDraft())
            ->debit($debit, $amount, 'uji')
            ->credit($credit, $amount, 'uji')
            ->post(app(AccountingEngine::class), 'TEST', 'PC-'.uniqid(), 'Uji tutup buku', $date);
    }

    private function postJanuary(): void
    {
        $this->post('2020-01-10', '1-1000', '4-1000', 1000000);
        $this->post('2020-01-20', '6-1001', '1-1000', 200000);
    }

    private function row(array $tb, string $code): array
    {
        return collect($tb['accounts'])->firstWhere('account_code', $code);
    }

    public function test_closing_zeroes_nominal_accounts_at_period_end_and_keeps_the_month_result(): void
    {
        $this->postJanuary();

        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01', 'notes' => 'Tutup Januari'])
            ->assertCreated()
            ->assertJsonPath('data.period', '2020-01')
            ->assertJsonPath('data.end_date', '2020-01-31')
            ->assertJsonPath('data.net_income', 800000);

        $closing = JournalEntry::where('reference_type', 'PERIOD_CLOSING')->where('reference_id', 'TUTUP-2020-01')->firstOrFail();
        $this->assertSame('2020-01-31', $closing->entry_date->toDateString());

        $reports = app(FinancialReportService::class);
        $tb = $reports->trialBalance('2020-01-31');
        $this->assertEquals(0, $this->row($tb, '4-1000')['credit']);
        $this->assertEquals(0, $this->row($tb, '6-1001')['debit']);
        $this->assertEquals(800000, $reports->incomeStatement('2020-01-01', '2020-01-31')['net_income']);
        $this->assertTrue($reports->balanceSheet('2020-01-31')['is_balanced']);
    }

    public function test_posting_into_a_closed_period_is_rejected(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        $this->expectException(PosRuleException::class);
        $this->post('2020-01-15', '1-1000', '4-1000', 1000);
    }

    public function test_cannot_close_a_month_that_has_not_ended(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => now()->format('Y-m')])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'belum berakhir'));
    }

    public function test_cannot_close_a_month_inside_the_locked_range(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-02'])->assertCreated();

        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertStatus(422);
    }

    public function test_owner_can_reopen_the_latest_closing(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        $this->postJson('/api/v1/accounting/periods/2020-01/reopen', ['reason' => 'Ada nota tertinggal'])
            ->assertOk()
            ->assertJsonPath('data.reopen_reason', 'Ada nota tertinggal');

        $closing = JournalEntry::where('reference_id', 'TUTUP-2020-01')->firstOrFail();
        $reopen = JournalEntry::where('reference_type', 'PERIOD_REOPEN')->where('reversal_of_id', $closing->id)->firstOrFail();
        $this->assertSame('2020-01-31', $reopen->entry_date->toDateString());

        $this->post('2020-01-25', '1-1000', '4-1000', 5000);
        $this->getJson('/api/v1/accounting/periods')->assertOk()->assertJsonPath('data.lock_date', null);
    }

    public function test_only_the_latest_closing_can_be_reopened(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-02'])->assertCreated();

        $this->postJson('/api/v1/accounting/periods/2020-01/reopen', ['reason' => 'x'])->assertStatus(422);
    }

    public function test_non_owner_with_accounting_access_cannot_reopen(): void
    {
        $this->postJanuary();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        RolePermission::where('role', 'GUDANG')->where('permission_key', 'accounting_hub')->update(['allowed' => true]);
        $this->actingAsRole('GUDANG');

        $this->getJson('/api/v1/accounting/periods')->assertOk();
        $this->postJson('/api/v1/accounting/periods/2020-01/reopen', ['reason' => 'x'])->assertForbidden();
    }

    public function test_kasir_cannot_close_periods(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/periods')->assertForbidden();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=PeriodClosingTest`
Expected: FAIL — 404 on `/api/v1/accounting/periods/close`.

- [ ] **Step 3: Implement the service**

Create `backend/app/Services/Accounting/PeriodClosingService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\AccountingPeriodClosing;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Tutup buku bulanan: seluruh saldo akun pendapatan & beban sampai akhir bulan dipindahkan ke Laba Ditahan,
 * lalu transaksi bertanggal sampai hari itu dikunci. Bulan sebelumnya yang belum ditutup ikut tersapu.
 */
class PeriodClosingService
{
    public const RETAINED_EARNINGS = '3-2000';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function summary(): array
    {
        return [
            'lock_date' => PeriodLock::lockDate(),
            'suggested_period' => now()->subMonthNoOverflow()->format('Y-m'),
            'closings' => AccountingPeriodClosing::with(['closingEntry', 'closedByUser'])
                ->orderByDesc('end_date')->orderByDesc('id')->limit(24)->get()
                ->map(fn (AccountingPeriodClosing $c) => $c->toApiArray())->values()->all(),
        ];
    }

    public function close(string $period, ?string $notes, User $user): AccountingPeriodClosing
    {
        $end = Carbon::parse($period.'-01')->endOfMonth()->toDateString();
        if ($end >= now()->toDateString()) {
            throw new PosRuleException("Periode {$period} belum berakhir; tutup buku hanya untuk bulan yang sudah lewat.");
        }

        return DB::transaction(function () use ($period, $end, $notes, $user) {
            $lock = PeriodLock::lockDate();
            if ($lock !== null && $end <= $lock) {
                throw new PosRuleException("Periode {$period} sudah termasuk periode yang ditutup (sampai {$lock}).");
            }

            $draft = new JournalDraft();
            $netIncome = 0.0;
            foreach (LedgerBalances::forRange(null, $end) as $b) {
                if (! in_array($b->account->account_type, ['REVENUE', 'EXPENSE'], true)) {
                    continue;
                }
                $creditBalance = $b->signed('CREDIT');
                if ($creditBalance > 0) {
                    $draft->debit($b->account->account_code, $creditBalance, "Tutup {$b->account->account_name}");
                } elseif ($creditBalance < 0) {
                    $draft->credit($b->account->account_code, -$creditBalance, "Tutup {$b->account->account_name}");
                }
                $netIncome += $creditBalance;
            }

            $netIncome = round($netIncome, 2);
            if ($netIncome > 0) {
                $draft->credit(self::RETAINED_EARNINGS, $netIncome, "Laba bersih s/d {$end} ke Laba Ditahan");
            } elseif ($netIncome < 0) {
                $draft->debit(self::RETAINED_EARNINGS, -$netIncome, "Rugi bersih s/d {$end} ke Laba Ditahan");
            }

            $entry = $draft->isEmpty()
                ? null
                : $draft->post($this->engine, 'PERIOD_CLOSING', "TUTUP-{$period}", "Jurnal penutup periode {$period}", $end);

            return AccountingPeriodClosing::create([
                'period' => $period,
                'end_date' => $end,
                'closing_entry_id' => $entry?->id,
                'net_income' => $netIncome,
                'notes' => $notes,
                'closed_by' => $user->id,
                'closed_at' => now(),
            ]);
        });
    }

    public function reopen(string $period, string $reason, User $user): AccountingPeriodClosing
    {
        return DB::transaction(function () use ($period, $reason, $user) {
            $closing = AccountingPeriodClosing::whereNull('reopened_at')
                ->orderByDesc('end_date')->orderByDesc('id')
                ->lockForUpdate()->first();

            if ($closing === null || $closing->period !== $period) {
                throw new PosRuleException('Hanya periode terakhir yang ditutup yang dapat dibuka kembali.');
            }

            // Tandai dulu agar kunci periode terbuka sebelum jurnal pembalik (bertanggal akhir periode) dibukukan.
            $closing->update(['reopened_at' => now(), 'reopened_by' => $user->id, 'reopen_reason' => $reason]);

            if ($closing->closingEntry !== null) {
                $reversal = $this->engine->createEntry(
                    'PERIOD_REOPEN',
                    "BUKA-{$period}",
                    "Pembukaan kembali periode {$period}: {$reason}",
                    $closing->closingEntry->reversedItems('[BUKA KEMBALI] '),
                    $closing->end_date->toDateString(),
                    3,
                    $closing->closing_entry_id
                );
                $closing->update(['reopen_entry_id' => $reversal->id]);
            }

            return $closing->fresh(['closingEntry', 'closedByUser']);
        });
    }
}
```

- [ ] **Step 4: Add the controller and routes**

Create `backend/app/Http/Controllers/Api/v1/AccountingPeriodController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\PeriodClosingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AccountingPeriodController extends Controller
{
    public function __construct(private readonly PeriodClosingService $periods)
    {
    }

    public function index(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->periods->summary()]);
    }

    public function close(Request $request): JsonResponse
    {
        $data = $request->validate([
            'period' => 'required|date_format:Y-m',
            'notes' => 'nullable|string|max:255',
        ]);

        $closing = $this->periods->close($data['period'], $data['notes'] ?? null, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Periode {$data['period']} ditutup dan dikunci.",
            'data' => $closing->toApiArray(),
        ], 201);
    }

    public function reopen(Request $request, string $period): JsonResponse
    {
        abort_unless($request->user()->role === 'OWNER', 403, 'Hanya pemilik yang dapat membuka kembali periode yang sudah ditutup.');
        $data = $request->validate(['reason' => 'required|string|max:255']);

        $closing = $this->periods->reopen($period, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Periode {$period} dibuka kembali.",
            'data' => $closing->toApiArray(),
        ]);
    }
}
```

In `backend/routes/api.php`, add `use App\Http\Controllers\Api\v1\AccountingPeriodController;` to the imports, and inside the `Route::middleware('permission:accounting_hub')->group(...)` of the `accounting` prefix add:

```php
                Route::get('periods', [AccountingPeriodController::class, 'index']);
                Route::post('periods/close', [AccountingPeriodController::class, 'close']);
                Route::post('periods/{period}/reopen', [AccountingPeriodController::class, 'reopen'])->where('period', '\d{4}-\d{2}');
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && php artisan test --filter=PeriodClosingTest`
Expected: PASS (8 tests).

Run: `cd backend && composer test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/Accounting/PeriodClosingService.php backend/app/Http/Controllers/Api/v1/AccountingPeriodController.php backend/routes/api.php backend/tests/Feature/PeriodClosingTest.php
git commit -m "feat(accounting): close and reopen periods on the server with a posting lock

Closing a finished month posts a closing entry dated at month end that
moves all nominal balances to retained earnings and locks every earlier
date. Only the owner can reopen the latest closing, which posts a
linked reversal.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A5: Server expenses — seeded categories, service, void with reason

**Files:**
- Create: `backend/database/migrations/2026_09_29_000002_add_void_audit_to_expenses_and_seed_categories.php`
- Create: `backend/app/Services/Accounting/ExpenseService.php`
- Modify: `backend/app/Models/Expense.php`, `backend/app/Models/ExpenseCategory.php`
- Modify: `backend/app/Http/Requests/ExpenseRequest.php`
- Modify: `backend/app/Http/Controllers/Api/v1/ExpenseController.php` (full replacement)
- Test: `backend/tests/Feature/ExpenseApiTest.php` (full replacement)

**Interfaces:**
- Consumes: `DocumentNumber::next(..., $date)`, `JournalDraft`, `JournalEntry::reversedItems()`, engine `reversalOfId` (A1).
- Produces: `ExpenseService::create(array $data, ?UploadedFile $attachment, User $user): array{expense: Expense, journal: JournalEntry}`, `ExpenseService::void(int $id, string $reason, User $user): array{expense: Expense, journal: JournalEntry}`, `ExpenseService::cashAccount(string $method): string`
- Produces JSON: expense `{id, reference, expense_date, category:{id, code, name, account_code}, amount, payment_method, bank_name, recipient_name, description, attachment_url, approved_by, status, void_reason, voided_by, voided_at, created_at}`; category `{id, code, name, account_code}`.
- Endpoints: `GET expenses` → `{items, current_page, last_page, total}`; `POST expenses` (multipart or JSON) → 201 `{expense, journals:[journal]}`; `POST expenses/{id}/void` `{reason}` → `{expense, journals:[journal]}`.

- [ ] **Step 1: Write the failing tests**

Replace `backend/tests/Feature/ExpenseApiTest.php` with:

```php
<?php

namespace Tests\Feature;

use App\Models\AccountingPeriodClosing;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    use DatabaseTransactions;

    private function category(string $code): ExpenseCategory
    {
        return ExpenseCategory::where('category_code', $code)->firstOrFail();
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'expense_date' => '2025-06-10',
            'category_id' => $this->category('LISTRIK')->id,
            'amount' => 350000,
            'payment_method' => 'TUNAI',
            'recipient_name' => 'Petugas PLN',
            'description' => 'Tagihan listrik bulanan bengkel',
        ], $overrides);
    }

    private function lines(JournalEntry $entry): array
    {
        return $entry->items()->with('account')->get()
            ->mapWithKeys(fn ($i) => [$i->account->account_code => [(float) $i->debit, (float) $i->credit]])->all();
    }

    public function test_categories_are_seeded_with_frontend_names(): void
    {
        $this->getJson('/api/v1/expense-categories')
            ->assertOk()
            ->assertJsonCount(8, 'data')
            ->assertJsonFragment(['code' => 'LISTRIK', 'name' => 'Listrik & Air (PLN/PDAM)', 'account_code' => '6-1001']);
    }

    public function test_cash_expense_posts_bkk_and_journal_in_the_expense_month(): void
    {
        $res = $this->postJson('/api/v1/expenses', $this->payload())->assertCreated();

        $reference = $res->json('data.expense.reference');
        $this->assertStringStartsWith('BKK-202506-', $reference);
        $res->assertJsonPath('data.expense.approved_by', 'Test OWNER')
            ->assertJsonPath('data.expense.category.account_code', '6-1001')
            ->assertJsonPath('data.journals.0.entry_date', '2025-06-10');

        $entry = JournalEntry::where('reference_type', 'EXPENSE')->where('reference_id', $reference)->firstOrFail();
        $this->assertEquals(['6-1001' => [350000, 0], '1-1000' => [0, 350000]], $this->lines($entry));
    }

    public function test_bank_expense_credits_the_bank_account(): void
    {
        $res = $this->postJson('/api/v1/expenses', $this->payload(['payment_method' => 'TRANSFER_BCA', 'bank_name' => 'BCA']))->assertCreated();

        $entry = JournalEntry::where('reference_id', $res->json('data.expense.reference'))->firstOrFail();
        $this->assertArrayHasKey('1-1001', $this->lines($entry));
    }

    public function test_attachment_is_stored_under_the_bkk_number(): void
    {
        Storage::fake('public');

        $res = $this->post('/api/v1/expenses', $this->payload(['attachment' => UploadedFile::fake()->image('nota.jpg')]), ['Accept' => 'application/json'])
            ->assertCreated();

        $this->assertStringStartsWith('/storage/expenses/BKK-202506-', $res->json('data.expense.attachment_url'));
    }

    public function test_future_dated_expense_is_rejected(): void
    {
        $this->postJson('/api/v1/expenses', $this->payload(['expense_date' => now()->addDay()->toDateString()]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('expense_date');
    }

    public function test_expense_in_a_closed_period_is_rejected(): void
    {
        AccountingPeriodClosing::create(['period' => '2025-06', 'end_date' => '2025-06-30', 'net_income' => 0, 'closed_at' => now()]);

        $this->postJson('/api/v1/expenses', $this->payload())->assertStatus(422);
    }

    public function test_void_posts_a_linked_reversal_once(): void
    {
        $created = $this->postJson('/api/v1/expenses', $this->payload())->assertCreated();
        $id = $created->json('data.expense.id');
        $original = JournalEntry::where('reference_id', $created->json('data.expense.reference'))->firstOrFail();

        $this->postJson("/api/v1/expenses/{$id}/void", ['reason' => 'Salah input nominal'])
            ->assertOk()
            ->assertJsonPath('data.expense.status', 'VOID')
            ->assertJsonPath('data.expense.void_reason', 'Salah input nominal')
            ->assertJsonPath('data.expense.voided_by', 'Test OWNER')
            ->assertJsonPath('data.journals.0.reversal_of', $original->entry_number);

        $reversal = JournalEntry::where('reference_type', 'VOID_EXPENSE')->where('reversal_of_id', $original->id)->firstOrFail();
        $this->assertEquals(['1-1000' => [350000, 0], '6-1001' => [0, 350000]], $this->lines($reversal));

        $this->postJson("/api/v1/expenses/{$id}/void", ['reason' => 'lagi'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pengeluaran ini sudah dibatalkan (VOID).');
    }

    public function test_void_requires_a_reason(): void
    {
        $id = $this->postJson('/api/v1/expenses', $this->payload())->json('data.expense.id');

        $this->postJson("/api/v1/expenses/{$id}/void", [])->assertStatus(422)->assertJsonValidationErrors('reason');
    }

    public function test_list_returns_mapped_items(): void
    {
        $this->postJson('/api/v1/expenses', $this->payload())->assertCreated();

        $this->getJson('/api/v1/expenses?start_date=2025-06-01&end_date=2025-06-30')
            ->assertOk()
            ->assertJsonStructure(['data' => ['items' => [['id', 'reference', 'category', 'amount', 'status']], 'current_page', 'last_page', 'total']]);
    }

    public function test_kasir_without_expense_permission_is_denied(): void
    {
        $this->actingAsRole('KASIR');
        $this->postJson('/api/v1/expenses', $this->payload())->assertForbidden();
        $this->postJson('/api/v1/expenses/1/void', ['reason' => 'x'])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=ExpenseApiTest`
Expected: FAIL — categories count is not 8 / response shape differs.

- [ ] **Step 3: Add the migration and run it**

Create `backend/database/migrations/2026_09_29_000002_add_void_audit_to_expenses_and_seed_categories.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jejak pembatalan beban dan kategori beban baku. Nama kategori sama persis dengan union
 * ExpenseCategory di frontend (src/shared/types/index.ts) agar pemetaan tidak bergantung pada id.
 */
return new class extends Migration
{
    private const CATEGORIES = [
        ['category_code' => 'GAJI', 'category_name' => 'Gaji & Uang Makan Montir', 'default_account_code' => '6-1000'],
        ['category_code' => 'LISTRIK', 'category_name' => 'Listrik & Air (PLN/PDAM)', 'default_account_code' => '6-1001'],
        ['category_code' => 'SEWA', 'category_name' => 'Sewa Lahan & Bangunan', 'default_account_code' => '6-1003'],
        ['category_code' => 'TRANSPORT', 'category_name' => 'Transport & Pengiriman Ban', 'default_account_code' => '6-1004'],
        ['category_code' => 'ATK', 'category_name' => 'ATK & Keperluan Bengkel', 'default_account_code' => '6-1005'],
        ['category_code' => 'MESIN', 'category_name' => 'Pemeliharaan Mesin Spooring & Balancing', 'default_account_code' => '6-1006'],
        ['category_code' => 'KONSUMSI', 'category_name' => 'Konsumsi & Lembur Karyawan', 'default_account_code' => '6-1007'],
        ['category_code' => 'PAJAK', 'category_name' => 'Pajak & Retribusi Daerah', 'default_account_code' => '6-1008'],
    ];

    public function up(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->string('void_reason', 255)->nullable()->after('status');
            $table->string('voided_by', 80)->nullable()->after('void_reason');
            $table->timestamp('voided_at')->nullable()->after('voided_by');
            $table->foreignId('created_by')->nullable()->after('branch_id')->constrained('users')->nullOnDelete();
        });

        foreach (self::CATEGORIES as $category) {
            DB::table('expense_categories')->updateOrInsert(
                ['category_code' => $category['category_code']],
                $category + ['created_at' => now(), 'updated_at' => now()]
            );
        }
    }

    public function down(): void
    {
        Schema::table('expenses', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['void_reason', 'voided_by', 'voided_at']);
        });

        DB::table('expense_categories')
            ->whereIn('category_code', array_column(self::CATEGORIES, 'category_code'))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('expenses')->whereColumn('expenses.category_id', 'expense_categories.id'))
            ->delete();
    }
};
```

Run: `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate`
Expected: migration `2026_09_29_000002_...` DONE on both databases.

Check for stray categories created by older tests: `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan tinker --execute="echo App\Models\ExpenseCategory::count();"`
Expected: `8`. If it is higher, older non-transactional tests left rows: delete categories whose `category_code` is not one of the eight codes and that no expense references (`DB_DATABASE=project-skripsi_ob_testing php artisan tinker --execute="App\Models\ExpenseCategory::whereNotIn('category_code',['GAJI','LISTRIK','SEWA','TRANSPORT','ATK','MESIN','KONSUMSI','PAJAK'])->whereDoesntHave('expenses')->delete();"`), then re-check. Do not touch the development database this way.

- [ ] **Step 4: Update the models**

In `backend/app/Models/Expense.php`: add `'void_reason', 'voided_by', 'voided_at', 'created_by'` to `$fillable`, add `'voided_at' => 'datetime'` to `$casts`, and add this method before `category()`:

```php
    public function toApiArray(): array
    {
        $this->loadMissing('category');

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'expense_date' => $this->expense_date?->toDateString(),
            'category' => $this->category?->toApiArray(),
            'amount' => (float) $this->amount,
            'payment_method' => $this->payment_method,
            'bank_name' => $this->bank_name,
            'recipient_name' => $this->recipient_name,
            'description' => $this->description,
            'attachment_url' => $this->attachment_path,
            'approved_by' => $this->approved_by,
            'status' => $this->status,
            'void_reason' => $this->void_reason,
            'voided_by' => $this->voided_by,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
```

In `backend/app/Models/ExpenseCategory.php`, add before `expenses()`:

```php
    /** @return array{id: int, code: string, name: string, account_code: string} */
    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'code' => $this->category_code,
            'name' => $this->category_name,
            'account_code' => $this->default_account_code,
        ];
    }
```

- [ ] **Step 5: Replace the request rules**

Replace `backend/app/Http/Requests/ExpenseRequest.php` with:

```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ExpenseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'expense_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'category_id' => 'required|integer|exists:expense_categories,id',
            'amount' => 'required|numeric|min:1|max:1000000000',
            'payment_method' => 'required|string|in:TUNAI,TRANSFER_BCA,KAS_LACI,BANK_BCA',
            'bank_name' => 'nullable|string|max:50',
            'recipient_name' => 'required|string|max:120',
            'description' => 'required|string|max:1000',
            'attachment' => 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:5120',
        ];
    }

    public function messages(): array
    {
        return [
            'expense_date.before_or_equal' => 'Tanggal pengeluaran tidak boleh melebihi hari ini.',
            'category_id.exists' => 'Kategori beban tidak dikenal.',
        ];
    }
}
```

- [ ] **Step 6: Implement the expense service**

Create `backend/app/Services/Accounting/ExpenseService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Bukti Kas Keluar (BKK): Dr akun beban kategori / Cr kas laci atau bank. Pembatalan membukukan jurnal pembalik.
 */
class ExpenseService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public static function cashAccount(string $method): string
    {
        return in_array($method, ['TUNAI', 'KAS_LACI'], true) ? '1-1000' : '1-1001';
    }

    /**
     * @param  array{expense_date: string, category_id: int|string, amount: float|string, payment_method: string, bank_name?: ?string, recipient_name: string, description: string}  $data
     * @return array{expense: Expense, journal: JournalEntry}
     */
    public function create(array $data, ?UploadedFile $attachment, User $user): array
    {
        return DB::transaction(function () use ($data, $attachment, $user) {
            $category = ExpenseCategory::findOrFail($data['category_id']);
            $reference = DocumentNumber::next(Expense::class, 'reference', 'BKK', $data['expense_date']);

            $attachmentPath = null;
            if ($attachment !== null) {
                $name = $reference.'-'.Str::lower(Str::random(6)).'.'.$attachment->extension();
                $attachmentPath = '/storage/'.$attachment->storeAs('expenses', $name, 'public');
            }

            $expense = Expense::create([
                'reference' => $reference,
                'expense_date' => $data['expense_date'],
                'category_id' => $category->id,
                'amount' => round((float) $data['amount'], 2),
                'payment_method' => $data['payment_method'],
                'bank_name' => $data['bank_name'] ?? null,
                'recipient_name' => $data['recipient_name'],
                'description' => $data['description'],
                'attachment_path' => $attachmentPath,
                'approved_by' => $user->name,
                'status' => 'ACTIVE',
                'branch_id' => 3,
                'created_by' => $user->id,
            ]);

            $journal = (new JournalDraft())
                ->debit($category->default_account_code, (float) $expense->amount, "Beban {$category->category_name} ({$reference})")
                ->credit(self::cashAccount($expense->payment_method), (float) $expense->amount, "Dibayar kepada {$expense->recipient_name}")
                ->post($this->engine, 'EXPENSE', $reference, "Pengeluaran {$reference}: {$expense->description}", $data['expense_date']);

            return ['expense' => $expense->load('category'), 'journal' => $journal];
        });
    }

    /**
     * @return array{expense: Expense, journal: JournalEntry}
     */
    public function void(int $id, string $reason, User $user): array
    {
        return DB::transaction(function () use ($id, $reason, $user) {
            $expense = Expense::with('category')->lockForUpdate()->findOrFail($id);
            if ($expense->status === 'VOID') {
                throw new PosRuleException('Pengeluaran ini sudah dibatalkan (VOID).');
            }

            $original = JournalEntry::where('reference_type', 'EXPENSE')->where('reference_id', $expense->reference)->firstOrFail();
            $reversal = $this->engine->createEntry(
                'VOID_EXPENSE',
                'VOID-'.$expense->reference,
                "Pembatalan {$expense->reference}: {$reason}",
                $original->reversedItems('[VOID] '),
                now()->toDateString(),
                3,
                $original->id
            );

            $expense->update(['status' => 'VOID', 'void_reason' => $reason, 'voided_by' => $user->name, 'voided_at' => now()]);

            return ['expense' => $expense->fresh('category'), 'journal' => $reversal];
        });
    }
}
```

- [ ] **Step 7: Replace the controller**

Replace `backend/app/Http/Controllers/Api/v1/ExpenseController.php` with:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\ExpenseRequest;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use App\Services\Accounting\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function __construct(private readonly ExpenseService $expenses)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => 'nullable|string|max:100',
            'category_id' => 'nullable|integer',
            'status' => 'nullable|in:ACTIVE,VOID',
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'per_page' => 'nullable|integer|min:1|max:500',
        ]);

        $page = Expense::with('category')
            ->when($data['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('reference', 'like', "%{$s}%")
                ->orWhere('recipient_name', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")))
            ->when($data['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($data['start_date'] ?? null, fn ($q, $d) => $q->where('expense_date', '>=', $d))
            ->when($data['end_date'] ?? null, fn ($q, $d) => $q->where('expense_date', '<=', $d))
            ->orderByDesc('expense_date')->orderByDesc('id')
            ->paginate($data['per_page'] ?? 100);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $page->getCollection()->map(fn (Expense $e) => $e->toApiArray())->values(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function categories(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => ExpenseCategory::orderBy('category_name')->get()->map(fn (ExpenseCategory $c) => $c->toApiArray())->values(),
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $expense = Expense::with('category')->findOrFail($id);
        $journals = JournalEntry::whereIn('reference_type', ['EXPENSE', 'VOID_EXPENSE'])
            ->whereIn('reference_id', [$expense->reference, 'VOID-'.$expense->reference])
            ->orderBy('id')->get()
            ->map(fn (JournalEntry $j) => $j->toApiArray())->values();

        return response()->json(['success' => true, 'data' => ['expense' => $expense->toApiArray(), 'journals' => $journals]]);
    }

    public function store(ExpenseRequest $request): JsonResponse
    {
        $result = $this->expenses->create($request->validated(), $request->file('attachment'), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pengeluaran {$result['expense']->reference} dibukukan.",
            'data' => ['expense' => $result['expense']->toApiArray(), 'journals' => [$result['journal']->toApiArray()]],
        ], 201);
    }

    public function void(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);
        $result = $this->expenses->void($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Pengeluaran {$result['expense']->reference} dibatalkan dan jurnal pembalik dibukukan.",
            'data' => ['expense' => $result['expense']->toApiArray(), 'journals' => [$result['journal']->toApiArray()]],
        ]);
    }
}
```

- [ ] **Step 8: Run the tests**

Run: `cd backend && php artisan test --filter=ExpenseApiTest`
Expected: PASS (10 tests).

Run: `cd backend && composer test`
Expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/database/migrations/2026_09_29_000002_add_void_audit_to_expenses_and_seed_categories.php backend/app/Services/Accounting/ExpenseService.php backend/app/Models/Expense.php backend/app/Models/ExpenseCategory.php backend/app/Http/Requests/ExpenseRequest.php backend/app/Http/Controllers/Api/v1/ExpenseController.php backend/tests/Feature/ExpenseApiTest.php
git commit -m "feat(expenses): post and void expenses through a server service

Seeds the eight expense categories the UI uses, numbers BKK by expense
month, records the approving user, and voids with a required reason and
a reversal linked to the original entry. Voiding twice is a 422 instead
of a 500.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A6: Manual journals by account code, single reversal, filtered journal list

**Files:**
- Create: `backend/app/Services/Accounting/ManualJournalService.php`
- Modify: `backend/app/Http/Requests/ManualJournalRequest.php` (full replacement)
- Modify: `backend/app/Http/Controllers/Api/v1/AccountingReportController.php` (`journals`, `createManualJournal`, new `reverseJournal`, drop the engine constructor)
- Modify: `backend/routes/api.php` (reverse route; `accounts` permission)
- Test: `backend/tests/Feature/ManualJournalApiTest.php`

**Interfaces:**
- Consumes: `JournalEntry::MANUAL`, `reversedItems()`, `toApiArray()` (A1); `DocumentNumber::next(..., $date)` (A1).
- Produces: `ManualJournalService::CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004']`, `create(array $data): JournalEntry`, `reverse(JournalEntry $entry, string $reason): JournalEntry`
- Endpoints: `POST accounting/journals/manual` `{date, description, items:[{account_code, debit, credit, note?}]}` → 201 journal; `POST accounting/journals/{entryNumber}/reverse` `{reason}` → 201 journal (`reference_type` `MANUAL_REVERSAL`); `GET accounting/journals?start_date&end_date&types=A,B&search&account_code&page&per_page(≤100)` → `{items, current_page, last_page, total, total_debit, total_credit}`; `GET accounts` also for `accounting_hub,financial_reports,expenses`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/ManualJournalApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\ExpenseCategory;
use App\Models\JournalEntry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class ManualJournalApiTest extends TestCase
{
    use DatabaseTransactions;

    private function payload(?array $items = null, string $date = '2025-05-10'): array
    {
        return [
            'date' => $date,
            'description' => 'Koreksi biaya perawatan mesin',
            'items' => $items ?? [
                ['account_code' => '6-1006', 'debit' => 150000, 'credit' => 0, 'note' => 'Servis kompresor'],
                ['account_code' => '1-1001', 'debit' => 0, 'credit' => 150000],
            ],
        ];
    }

    public function test_manual_journal_is_posted_by_account_code(): void
    {
        $res = $this->postJson('/api/v1/accounting/journals/manual', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.reference_type', 'MANUAL_ADJUSTMENT')
            ->assertJsonPath('data.entry_date', '2025-05-10')
            ->assertJsonPath('data.can_reverse', true)
            ->assertJsonPath('data.created_by_name', 'Test OWNER');

        $this->assertStringStartsWith('MEMO-202505-', $res->json('data.reference_id'));
        $this->assertStringStartsWith('JRN-202505-', $res->json('data.entry_number'));
    }

    public function test_control_accounts_are_rejected(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload([
            ['account_code' => '1-2000', 'debit' => 100000, 'credit' => 0],
            ['account_code' => '3-1000', 'debit' => 0, 'credit' => 100000],
        ]))->assertStatus(422)->assertJsonValidationErrors('items.0.account_code');
    }

    public function test_each_line_needs_exactly_one_side(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload([
            ['account_code' => '6-1006', 'debit' => 100, 'credit' => 100],
            ['account_code' => '1-1001', 'debit' => 0, 'credit' => 0],
        ]))->assertStatus(422)->assertJsonValidationErrors(['items.0', 'items.1']);
    }

    public function test_unbalanced_journal_is_a_422(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload([
            ['account_code' => '6-1006', 'debit' => 150000, 'credit' => 0],
            ['account_code' => '1-1001', 'debit' => 0, 'credit' => 140000],
        ]))->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tidak seimbang'));
    }

    public function test_future_date_is_rejected(): void
    {
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload(null, now()->addDay()->toDateString()))
            ->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_manual_journal_can_be_reversed_only_once(): void
    {
        $number = $this->postJson('/api/v1/accounting/journals/manual', $this->payload())->json('data.entry_number');

        $this->postJson("/api/v1/accounting/journals/{$number}/reverse", ['reason' => 'Salah akun'])
            ->assertCreated()
            ->assertJsonPath('data.reference_type', 'MANUAL_REVERSAL')
            ->assertJsonPath('data.reversal_of', $number);

        $this->assertNotNull(JournalEntry::where('entry_number', $number)->first()->reversal);

        $this->postJson("/api/v1/accounting/journals/{$number}/reverse", ['reason' => 'lagi'])->assertStatus(422);
    }

    public function test_non_manual_journal_cannot_be_reversed_here(): void
    {
        $category = ExpenseCategory::where('category_code', 'ATK')->firstOrFail();
        $reference = $this->postJson('/api/v1/expenses', [
            'expense_date' => '2025-05-11', 'category_id' => $category->id, 'amount' => 50000,
            'payment_method' => 'TUNAI', 'recipient_name' => 'Toko ATK', 'description' => 'Kertas nota',
        ])->assertCreated()->json('data.expense.reference');
        $number = JournalEntry::where('reference_id', $reference)->value('entry_number');

        $this->postJson("/api/v1/accounting/journals/{$number}/reverse", ['reason' => 'x'])->assertStatus(422);
    }

    public function test_journal_list_filters_by_type_and_date(): void
    {
        $number = $this->postJson('/api/v1/accounting/journals/manual', $this->payload())->json('data.entry_number');

        $res = $this->getJson('/api/v1/accounting/journals?types=MANUAL_ADJUSTMENT,MANUAL_REVERSAL&start_date=2025-05-01&end_date=2025-05-31')
            ->assertOk()
            ->assertJsonStructure(['data' => ['items', 'current_page', 'last_page', 'total', 'total_debit', 'total_credit']]);

        $this->assertContains($number, array_column($res->json('data.items'), 'entry_number'));
        $this->assertSame(['MANUAL_ADJUSTMENT'], array_values(array_unique(array_column($res->json('data.items'), 'reference_type'))));
    }

    public function test_kasir_cannot_post_or_reverse(): void
    {
        $this->actingAsRole('KASIR');
        $this->postJson('/api/v1/accounting/journals/manual', $this->payload())->assertForbidden();
        $this->postJson('/api/v1/accounting/journals/JRN-202505-0001/reverse', ['reason' => 'x'])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=ManualJournalApiTest`
Expected: FAIL — `items.*.account_id` required / reverse route 404.

- [ ] **Step 3: Implement the service**

Create `backend/app/Services/Accounting/ManualJournalService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Jurnal penyesuaian manual dan pembaliknya (storno). Akun kontrol tidak boleh disentuh karena saldonya
 * harus sama dengan buku pembantu (piutang, persediaan FIFO, hutang, uang muka DP).
 */
class ManualJournalService
{
    public const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004'];

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{date: string, description: string, items: list<array{account_code: string, debit: float|int|string, credit: float|int|string, note?: ?string}>}  $data
     */
    public function create(array $data): JournalEntry
    {
        return DB::transaction(function () use ($data) {
            $draft = new JournalDraft();
            foreach ($data['items'] as $item) {
                $note = $item['note'] ?? $data['description'];
                (float) $item['debit'] > 0
                    ? $draft->debit($item['account_code'], (float) $item['debit'], $note)
                    : $draft->credit($item['account_code'], (float) $item['credit'], $note);
            }

            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', 'MEMO', $data['date']);

            return $draft->post($this->engine, JournalEntry::MANUAL, $reference, $data['description'], $data['date']);
        });
    }

    public function reverse(JournalEntry $entry, string $reason): JournalEntry
    {
        return DB::transaction(function () use ($entry, $reason) {
            $entry = JournalEntry::lockForUpdate()->findOrFail($entry->id);

            if ($entry->reference_type !== JournalEntry::MANUAL) {
                throw new PosRuleException('Hanya jurnal penyesuaian manual yang dapat dibalik di sini. Batalkan transaksi lain dari modul asalnya.');
            }
            if (JournalEntry::where('reversal_of_id', $entry->id)->exists()) {
                throw new PosRuleException("Jurnal {$entry->entry_number} sudah pernah dibalik.");
            }

            return $this->engine->createEntry(
                'MANUAL_REVERSAL',
                $entry->entry_number,
                "Pembalik {$entry->entry_number}: {$reason}",
                $entry->reversedItems('[PEMBALIK] '),
                now()->toDateString(),
                3,
                $entry->id
            );
        });
    }
}
```

- [ ] **Step 4: Replace the request**

Replace `backend/app/Http/Requests/ManualJournalRequest.php` with:

```php
<?php

namespace App\Http\Requests;

use App\Services\Accounting\ManualJournalService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ManualJournalRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'description' => 'required|string|max:255',
            'items' => 'required|array|min:2|max:30',
            'items.*.account_code' => [
                'required', 'string',
                Rule::exists('accounts', 'account_code')->where('is_active', true),
                Rule::notIn(ManualJournalService::CONTROL_ACCOUNTS),
            ],
            'items.*.debit' => 'required|numeric|min:0|max:1000000000',
            'items.*.credit' => 'required|numeric|min:0|max:1000000000',
            'items.*.note' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'date.before_or_equal' => 'Tanggal jurnal tidak boleh melebihi hari ini.',
            'items.*.account_code.not_in' => 'Akun kontrol (piutang, persediaan, hutang, uang muka DP) hanya berubah lewat transaksi sumbernya, bukan jurnal manual.',
            'items.*.account_code.exists' => 'Kode akun tidak ada di bagan akun atau tidak aktif.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            foreach ((array) $this->input('items', []) as $i => $item) {
                $hasDebit = (float) ($item['debit'] ?? 0) > 0;
                $hasCredit = (float) ($item['credit'] ?? 0) > 0;
                if ($hasDebit === $hasCredit) {
                    $validator->errors()->add("items.{$i}", 'Setiap baris harus berisi debit atau kredit (salah satu saja).');
                }
            }
        }];
    }
}
```

- [ ] **Step 5: Update the controller**

In `backend/app/Http/Controllers/Api/v1/AccountingReportController.php`:

1. Delete the `protected AccountingEngine $accountingEngine;` property and the constructor, and the imports `use App\Services\AccountingEngine;`, `use App\Models\Account;` and `use Illuminate\Support\Facades\DB;` if they become unused.
2. Add `use App\Services\Accounting\ManualJournalService;`.
3. Replace `journals` and `createManualJournal` with the following and add `reverseJournal`:

```php
    public function journals(Request $request): JsonResponse
    {
        $data = $request->validate([
            'start_date' => 'nullable|date_format:Y-m-d',
            'end_date' => 'nullable|date_format:Y-m-d',
            'types' => 'nullable|string|max:300',
            'search' => 'nullable|string|max:100',
            'account_code' => 'nullable|string|exists:accounts,account_code',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = JournalEntry::query()
            ->where('status', 'POSTED')
            ->when($data['start_date'] ?? null, fn ($q, $d) => $q->where('entry_date', '>=', $d))
            ->when($data['end_date'] ?? null, fn ($q, $d) => $q->where('entry_date', '<=', $d))
            ->when($data['types'] ?? null, fn ($q, $types) => $q->whereIn('reference_type', explode(',', $types)))
            ->when($data['account_code'] ?? null, fn ($q, $code) => $q->whereHas('items.account', fn ($a) => $a->where('account_code', $code)))
            ->when($data['search'] ?? null, fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('entry_number', 'like', "%{$s}%")
                ->orWhere('reference_id', 'like', "%{$s}%")
                ->orWhere('description', 'like', "%{$s}%")));

        $totals = (clone $query)->selectRaw('COALESCE(SUM(total_debit), 0) as d, COALESCE(SUM(total_credit), 0) as c')->first();
        $page = $query->with(['items.account', 'reversal', 'reversalOf', 'creator'])
            ->orderByDesc('entry_date')->orderByDesc('id')
            ->paginate($data['per_page'] ?? 25);

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $page->getCollection()->map(fn (JournalEntry $j) => $j->toApiArray())->values(),
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'total_debit' => round((float) $totals->d, 2),
                'total_credit' => round((float) $totals->c, 2),
            ],
        ]);
    }

    public function createManualJournal(ManualJournalRequest $request, ManualJournalService $manual): JsonResponse
    {
        $journal = $manual->create($request->validated());

        return response()->json([
            'success' => true,
            'message' => "Jurnal penyesuaian {$journal->entry_number} dibukukan.",
            'data' => $journal->toApiArray(),
        ], 201);
    }

    public function reverseJournal(Request $request, string $entryNumber, ManualJournalService $manual): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);
        $entry = JournalEntry::where('entry_number', $entryNumber)->firstOrFail();
        $reversal = $manual->reverse($entry, $data['reason']);

        return response()->json([
            'success' => true,
            'message' => "Jurnal {$entry->entry_number} dibalik dengan {$reversal->entry_number}.",
            'data' => $reversal->toApiArray(),
        ], 201);
    }
```

- [ ] **Step 6: Routes**

In `backend/routes/api.php`:

1. Remove `Route::get('accounts', [AccountController::class, 'index']);` from the `permission:pos,inventory_view` group and add, right after that group:

```php
        Route::get('accounts', [AccountController::class, 'index'])->middleware('permission:pos,inventory_view,accounting_hub,financial_reports,expenses');
```

2. In the `accounting` → `permission:accounting_hub` group, after `journals/manual`, add:

```php
                Route::post('journals/{entryNumber}/reverse', [AccountingReportController::class, 'reverseJournal']);
```

- [ ] **Step 7: Run the tests**

Run: `cd backend && php artisan test --filter="ManualJournalApiTest|AccountingReportApiTest|AuthorizationTest"`
Expected: PASS.

Run: `cd backend && composer test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Services/Accounting/ManualJournalService.php backend/app/Http/Requests/ManualJournalRequest.php backend/app/Http/Controllers/Api/v1/AccountingReportController.php backend/routes/api.php backend/tests/Feature/ManualJournalApiTest.php
git commit -m "feat(accounting): post manual journals by account code and reverse them once

Manual journals reject control accounts, two-sided or empty lines and
future dates, and get a MEMO reference. Only manual journals can be
reversed from the journal screen, exactly once. The journal list gains
type, account and pagination filters with filtered totals.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task A7: One-time account opening balances

**Files:**
- Create: `backend/app/Services/Accounting/OpeningBalanceService.php`
- Create: `backend/app/Http/Controllers/Api/v1/OpeningBalanceController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/OpeningBalanceApiTest.php`

**Interfaces:**
- Produces: `OpeningBalanceService::REFERENCE_TYPE = 'ACCOUNT_OPENING'`, `ACCOUNTS = ['1-1000', '1-1001', '1-3000', '1-3999', '3-2000']`, `CAPITAL = '3-1000'`, `current(): ?JournalEntry`, `post(string $date, array $balances): JournalEntry`
- Endpoints: `GET accounting/opening-balance` → `{data: journal|null}`; `POST accounting/opening-balance` `{date, balances:{'1-1000'?: n, ...}}` → 201 journal. Amounts are on each account's normal side; `3-2000` may be negative (accumulated deficit).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/OpeningBalanceApiTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class OpeningBalanceApiTest extends TestCase
{
    use DatabaseTransactions;

    private function lines(array $journal): array
    {
        return collect($journal['lines'])->mapWithKeys(fn ($l) => [$l['account_code'] => [$l['debit'], $l['credit']]])->all();
    }

    public function test_opening_balances_are_posted_once_with_capital_as_the_balancing_line(): void
    {
        $this->getJson('/api/v1/accounting/opening-balance')->assertOk()->assertJsonPath('data', null);

        $res = $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2025-01-01',
            'balances' => ['1-1000' => 1500000, '1-1001' => 35000000, '1-3000' => 14000000, '1-3999' => 2000000],
        ])->assertCreated()->assertJsonPath('data.reference_type', 'ACCOUNT_OPENING');

        $this->assertEquals([
            '1-1000' => [1500000, 0], '1-1001' => [35000000, 0], '1-3000' => [14000000, 0],
            '1-3999' => [0, 2000000], '3-1000' => [0, 48500000],
        ], $this->lines($res->json('data')));

        $this->getJson('/api/v1/accounting/opening-balance')->assertOk()->assertJsonPath('data.reference_type', 'ACCOUNT_OPENING');
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-1000' => 1]])->assertStatus(422);
    }

    public function test_accumulated_deficit_is_debited_to_retained_earnings(): void
    {
        $res = $this->postJson('/api/v1/accounting/opening-balance', [
            'date' => '2025-01-01',
            'balances' => ['1-1000' => 1000000, '3-2000' => -250000],
        ])->assertCreated();

        $this->assertEquals([
            '1-1000' => [1000000, 0], '3-2000' => [250000, 0], '3-1000' => [0, 1250000],
        ], $this->lines($res->json('data')));
    }

    public function test_subledger_accounts_and_negative_assets_are_rejected(): void
    {
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-2000' => 100]])->assertStatus(422);
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-1000' => -100]])
            ->assertStatus(422)->assertJsonValidationErrors('balances.1-1000');
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => []])->assertStatus(422);
    }

    public function test_kasir_is_denied(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/accounting/opening-balance')->assertForbidden();
        $this->postJson('/api/v1/accounting/opening-balance', ['date' => '2025-01-01', 'balances' => ['1-1000' => 1]])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=OpeningBalanceApiTest`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the service**

Create `backend/app/Services/Accounting/OpeningBalanceService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Saldo awal akun yang tidak punya buku pembantu, dibukukan sekali. Piutang, persediaan, hutang & DP
 * berasal dari dokumen sumbernya; selisihnya menjadi Modal Disetor (3-1000).
 */
class OpeningBalanceService
{
    public const REFERENCE_TYPE = 'ACCOUNT_OPENING';

    public const ACCOUNTS = ['1-1000', '1-1001', '1-3000', '1-3999', '3-2000'];

    public const CAPITAL = '3-1000';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function current(): ?JournalEntry
    {
        return JournalEntry::where('reference_type', self::REFERENCE_TYPE)->first();
    }

    /**
     * @param  array<string, float|int|string|null>  $balances  saldo di sisi normal akun; 3-2000 boleh negatif
     */
    public function post(string $date, array $balances): JournalEntry
    {
        return DB::transaction(function () use ($date, $balances) {
            if (JournalEntry::where('reference_type', self::REFERENCE_TYPE)->lockForUpdate()->exists()) {
                throw new PosRuleException('Saldo awal akun sudah pernah dibukukan. Koreksi lewat jurnal penyesuaian.');
            }

            $normal = Account::whereIn('account_code', self::ACCOUNTS)->pluck('normal_balance', 'account_code');
            $draft = new JournalDraft();
            $capital = 0.0;
            foreach (self::ACCOUNTS as $code) {
                $amount = round((float) ($balances[$code] ?? 0), 2);
                if ($amount == 0.0) {
                    continue;
                }
                $onDebit = ($normal[$code] === 'DEBIT') === ($amount > 0);
                $onDebit
                    ? $draft->debit($code, abs($amount), 'Saldo awal')
                    : $draft->credit($code, abs($amount), 'Saldo awal');
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

            return $draft->post($this->engine, self::REFERENCE_TYPE, 'SALDO-AWAL', 'Saldo awal akun kas, bank, aset tetap & laba ditahan', $date);
        });
    }
}
```

- [ ] **Step 4: Controller and routes**

Create `backend/app/Http/Controllers/Api/v1/OpeningBalanceController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\OpeningBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalanceController extends Controller
{
    public function __construct(private readonly OpeningBalanceService $openings)
    {
    }

    public function show(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->openings->current()?->toApiArray()]);
    }

    public function store(Request $request): JsonResponse
    {
        $rules = [
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'balances' => 'required|min:1|array:'.implode(',', OpeningBalanceService::ACCOUNTS),
        ];
        foreach (OpeningBalanceService::ACCOUNTS as $code) {
            $rules["balances.{$code}"] = $code === '3-2000' ? 'nullable|numeric' : 'nullable|numeric|min:0';
        }
        $data = $request->validate($rules, ['balances.array' => 'Saldo awal hanya untuk kas, bank, aset tetap, akumulasi penyusutan, dan laba ditahan.']);

        $journal = $this->openings->post($data['date'], $data['balances']);

        return response()->json([
            'success' => true,
            'message' => "Saldo awal akun dibukukan ({$journal->entry_number}).",
            'data' => $journal->toApiArray(),
        ], 201);
    }
}
```

In `backend/routes/api.php`, import `use App\Http\Controllers\Api\v1\OpeningBalanceController;` and in the `accounting` → `permission:accounting_hub` group add:

```php
                Route::get('opening-balance', [OpeningBalanceController::class, 'show']);
                Route::post('opening-balance', [OpeningBalanceController::class, 'store']);
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && php artisan test --filter=OpeningBalanceApiTest`
Expected: PASS (4 tests).

Run: `cd backend && composer test`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/Accounting/OpeningBalanceService.php backend/app/Http/Controllers/Api/v1/OpeningBalanceController.php backend/routes/api.php backend/tests/Feature/OpeningBalanceApiTest.php
git commit -m "feat(accounting): post one-time opening balances on the server

Cash, bank, fixed asset, accumulated depreciation and retained earnings
opening balances are posted once as ACCOUNT_OPENING, balanced against
owner capital. Subledger-backed accounts are excluded.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part B — Frontend

Order matters: each task leaves `npm run lint && npm test` green. Until Task B7, `App.tsx` still keeps its local
`journals`/`accountBalances`/`periodInfo` state; components switch to server data one by one, and B7 deletes the
leftovers.

### Task B1: Typed accounting/expense API, mappers and period helpers

**Files:**
- Modify: `src/shared/types/index.ts` (additive)
- Modify: `src/services/api/apiClient.ts` (add `assetUrl`)
- Modify: `src/services/api/posMappers.ts` (`ApiJournal` + `mapJournal` extra fields)
- Create: `src/services/api/accountingMappers.ts`
- Rewrite: `src/services/api/accountingApi.ts`, `src/services/api/expenseApi.ts`
- Modify: `src/services/api/index.ts`
- Create: `src/services/accountingPeriod.ts`
- Test: `src/services/__tests__/accountingPeriod.test.ts`, `src/services/__tests__/accountingMappers.test.ts`

**Interfaces:**
- Consumes: JSON shapes from Tasks A2–A7.
- Produces (types): `StatementLine`, `StatementSection`, `IncomeStatement`, `BalanceSheet`, `EquityChanges`, `FinancialStatements`, `CashFlowReport`, `PeriodClosingRecord`, `AccountingPeriodsInfo`, `OpeningBalanceAccount`, `OpeningBalanceInput`, `ManualJournalPayload`; `JournalEntry` gains optional `reference_type`, `can_reverse`, `reversed_by`, `reversal_of`, `created_by_name`.
- Produces (api): `accountingApi.{accounts, journals, createManualJournal, reverseJournal, generalLedger, trialBalance, financialStatements, cashFlow, cashBalances, periods, closePeriod, reopenPeriod, openingBalance, postOpeningBalance}`, types `ReportRange`, `JournalQuery`, `CashBalances`; `expenseApi.{categories, list, create(form), void(id, reason)}`, type `ExpenseResult`.
- Produces (mappers): `mapAccount`, `mapTrialBalance`, `mapLedger`, `mapJournalPage` → `JournalPage`, `mapExpense`, `expenseFormData(record, categoryId)`, wire types `ApiAccount`, `ApiTrialBalance`, `ApiLedger`, `ApiJournalPage`, `ApiExpense`, `ApiExpenseCategory`; `assetUrl(path)`.
- Produces (period helpers): `localDate(d?)`, `currentMonth(d?)`, `previousMonth(d?)`, `monthRange(month)`, `monthLabel(month)`, `PeriodSelection`, `ResolvedPeriod`, `resolvePeriod(selection, today?)`.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/accountingPeriod.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { currentMonth, localDate, monthLabel, monthRange, previousMonth, resolvePeriod } from '../accountingPeriod';

describe('accountingPeriod', () => {
  it('localDate memakai tanggal lokal, bukan UTC', () => {
    expect(localDate(new Date(2026, 8, 30, 1, 30))).toBe('2026-09-30');
    expect(currentMonth(new Date(2026, 8, 30, 23, 59))).toBe('2026-09');
  });

  it('monthRange menghitung hari terakhir termasuk tahun kabisat', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
    expect(monthRange('2026-09')).toEqual({ start: '2026-09-01', end: '2026-09-30' });
  });

  it('previousMonth melewati pergantian tahun', () => {
    expect(previousMonth(new Date(2026, 0, 15))).toBe('2025-12');
  });

  it('resolvePeriod untuk bulan, semua periode, dan rentang', () => {
    expect(resolvePeriod({ kind: 'month', month: '2026-09' })).toEqual({ start_date: '2026-09-01', end_date: '2026-09-30', label: 'September 2026' });
    expect(resolvePeriod({ kind: 'all' }, '2026-09-29')).toEqual({ end_date: '2026-09-29', label: 'Semua periode s/d 2026-09-29' });
    expect(resolvePeriod({ kind: 'range', start: '2026-09-01', end: '2026-09-15' })).toEqual({ start_date: '2026-09-01', end_date: '2026-09-15', label: '2026-09-01 s/d 2026-09-15' });
    expect(monthLabel('2026-01')).toBe('Januari 2026');
  });
});
```

Create `src/services/__tests__/accountingMappers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { expenseFormData, mapExpense, mapJournalPage, mapLedger, mapTrialBalance } from '../api/accountingMappers';
import type { ApiExpense, ApiJournalPage, ApiLedger, ApiTrialBalance } from '../api/accountingMappers';

const apiExpense: ApiExpense = {
  id: 7, reference: 'BKK-202609-0003', expense_date: '2026-09-10',
  category: { id: 2, code: 'LISTRIK', name: 'Listrik & Air (PLN/PDAM)', account_code: '6-1001' },
  amount: '350000.00', payment_method: 'TUNAI', bank_name: null, recipient_name: 'PLN', description: 'Tagihan listrik',
  attachment_url: '/storage/expenses/a.jpg', approved_by: 'Owner', status: 'ACTIVE',
  void_reason: null, voided_by: null, voided_at: null, created_at: '2026-09-10T08:00:00+07:00',
};

describe('accountingMappers', () => {
  it('mapExpense memetakan BKK server ke ExpenseRecord', () => {
    const e = mapExpense(apiExpense);
    expect(e.id).toBe('7');
    expect(e.bkk_number).toBe('BKK-202609-0003');
    expect(e.category).toBe('Listrik & Air (PLN/PDAM)');
    expect(e.category_code).toBe('6-1001');
    expect(e.amount).toBe(350000);
    expect(e.cash_source).toBe('Kas Tunai Laci Kasir');
    expect(e.receipt_image).toMatch(/\/storage\/expenses\/a\.jpg$/);
    expect(mapExpense({ ...apiExpense, payment_method: 'TRANSFER_BCA' }).cash_source).toBe('Rekening Bank BCA (Cabang 3)');
  });

  it('expenseFormData menyusun multipart dengan foto nota terkompresi', () => {
    const record = { ...mapExpense(apiExpense), cash_source: 'Rekening Bank BCA (Cabang 3)' as const, receipt_image: 'data:image/jpeg;base64,/9j/4AAQ' };
    const form = expenseFormData(record, 2);
    expect(form.get('category_id')).toBe('2');
    expect(form.get('amount')).toBe('350000');
    expect(form.get('payment_method')).toBe('TRANSFER_BCA');
    expect(form.get('bank_name')).toBe('BCA');
    const file = form.get('attachment') as File;
    expect(file.type).toBe('image/jpeg');
    expect(file.name).toBe('nota.jpeg');
    expect(expenseFormData(mapExpense(apiExpense), 2).get('attachment')).toBeNull();
  });

  it('mapTrialBalance dan mapLedger mengubah angka string menjadi number', () => {
    const tb: ApiTrialBalance = {
      as_of: '2026-09-30', total_debit: 100, total_credit: 100, difference: 0, is_balanced: true,
      accounts: [{ account_code: '1-1000', account_name: 'Kas', account_type: 'ASSET', normal_balance: 'DEBIT', debit: '100.00', credit: 0 }],
    };
    expect(mapTrialBalance(tb).rows[0]).toEqual({ account_code: '1-1000', account_name: 'Kas', account_type: 'ASSET', debit_balance: 100, credit_balance: 0 });

    const ledger: ApiLedger = {
      account: { account_code: '1-1000', account_name: 'Kas', account_type: 'ASSET', normal_balance: 'DEBIT' },
      start_date: '2026-09-01', end_date: '2026-09-30', opening_balance: 500, total_debit: 100, total_credit: 0, ending_balance: 600,
      mutations: [{ id: 3, entry_number: 'JRN-202609-0001', date: '2026-09-02', reference_type: 'POS_SALE', reference_id: 'OB3-INV-1', description: 'Jual', note: null, debit: 100, credit: 0, running_balance: 600 }],
    };
    const mapped = mapLedger(ledger);
    expect(mapped.initial_balance).toBe(500);
    expect(mapped.transactions[0]).toMatchObject({ journal_number: 'JRN-202609-0001', ref_doc: 'OB3-INV-1', running_balance: 600 });
  });

  it('mapJournalPage membawa status pembalikan', () => {
    const page: ApiJournalPage = {
      current_page: 1, last_page: 3, total: 51, total_debit: 1000, total_credit: 1000,
      items: [{ id: 1, entry_number: 'JRN-202609-0009', entry_date: '2026-09-05', reference_type: 'MANUAL_ADJUSTMENT', reference_id: 'MEMO-202609-0001', description: 'Koreksi', total_debit: 1000, total_credit: 1000, can_reverse: true, reversed_by: null, reversal_of: null, created_by_name: 'Owner', lines: [] }],
    };
    const mapped = mapJournalPage(page);
    expect(mapped.lastPage).toBe(3);
    expect(mapped.journals[0]).toMatchObject({ journal_number: 'JRN-202609-0009', reference_type: 'MANUAL_ADJUSTMENT', can_reverse: true });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/__tests__/accountingPeriod.test.ts src/services/__tests__/accountingMappers.test.ts`
Expected: FAIL — modules `../accountingPeriod` and `../api/accountingMappers` not found.

- [ ] **Step 3: Add the shared types**

In `src/shared/types/index.ts`, inside `interface JournalEntry` after `total_credit?: number;`, add:

```ts
  reference_type?: string;
  /** true hanya untuk jurnal penyesuaian manual yang belum dibalik. */
  can_reverse?: boolean;
  reversed_by?: string | null;
  reversal_of?: string | null;
  created_by_name?: string | null;
```

At the end of the file, append:

```ts
// ==============================================================================
// Laporan akuntansi yang dihitung server (Tahap 4)
// ==============================================================================
export interface StatementLine {
  code: string | null;
  name: string;
  amount: number;
}

export interface StatementSection {
  lines: StatementLine[];
  total: number;
}

export interface IncomeStatement {
  revenue: StatementSection;
  contra_revenue: StatementSection;
  net_revenue: number;
  cost_of_sales: StatementSection;
  gross_profit: number;
  operating_expenses: StatementSection;
  net_income: number;
}

export interface BalanceSheet {
  as_of: string;
  current_assets: StatementSection;
  fixed_assets: StatementSection;
  total_assets: number;
  liabilities: StatementSection;
  equity: StatementSection;
  total_liabilities_and_equity: number;
  difference: number;
  is_balanced: boolean;
}

export interface EquityChanges {
  opening_equity: number;
  owner_contributions: number;
  net_income: number;
  closing_equity: number;
  difference: number;
}

export interface FinancialStatements {
  period: { start_date: string | null; end_date: string };
  income_statement: IncomeStatement;
  balance_sheet: BalanceSheet;
  equity_changes: EquityChanges;
}

/** Arus kas metode langsung; arus masuk positif, arus keluar negatif. */
export interface CashFlowReport {
  period: { start_date: string | null; end_date: string };
  operating: { customers: number; suppliers: number; expenses: number; other: number; net: number };
  investing: { fixed_assets: number; net: number };
  financing: { equity: number; net: number };
  net_change: number;
  beginning_cash: number;
  ending_cash: number;
  ending_cash_drawer: number;
  ending_bank: number;
  is_reconciled: boolean;
}

export interface PeriodClosingRecord {
  period: string;
  end_date: string;
  closing_entry_number: string | null;
  net_income: number;
  notes: string | null;
  closed_by: string | null;
  closed_at: string | null;
  reopened_at: string | null;
  reopen_reason: string | null;
}

export interface AccountingPeriodsInfo {
  lock_date: string | null;
  suggested_period: string;
  closings: PeriodClosingRecord[];
}

export type OpeningBalanceAccount = '1-1000' | '1-1001' | '1-3000' | '1-3999' | '3-2000';

export interface OpeningBalanceInput {
  date: string;
  balances: Partial<Record<OpeningBalanceAccount, number>>;
}

export interface ManualJournalPayload {
  date: string;
  description: string;
  items: { account_code: string; debit: number; credit: number; note?: string }[];
}
```

- [ ] **Step 4: Add `assetUrl` and extend the journal wire type**

In `src/services/api/apiClient.ts`, after the `API_BASE_URL` constant, add:

```ts
/** URL lengkap untuk berkas publik backend, mis. '/storage/expenses/BKK-....jpg'. */
export const assetUrl = (path: string): string =>
  /^https?:\/\//.test(path) ? path : `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}${path}`;
```

In `src/services/api/posMappers.ts`, replace `export interface ApiJournal { ... }` with:

```ts
export interface ApiJournal {
  id?: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  reference_id: string;
  description: string;
  total_debit: number;
  total_credit: number;
  reversal_of?: string | null;
  reversed_by?: string | null;
  can_reverse?: boolean;
  created_by_name?: string | null;
  lines: { account_code: string; account_name: string; debit: number; credit: number; note?: string | null }[];
}
```

and in `mapJournal`, after `total_credit: num(j.total_credit),` add:

```ts
  reference_type: j.reference_type,
  can_reverse: j.can_reverse ?? false,
  reversed_by: j.reversed_by ?? null,
  reversal_of: j.reversal_of ?? null,
  created_by_name: j.created_by_name ?? null,
```

- [ ] **Step 5: Create the mappers**

Create `src/services/api/accountingMappers.ts`:

```ts
import type { CashSource, ChartOfAccount, ExpenseCategory, ExpenseRecord, JournalEntry, LedgerAccountSummary, TrialBalanceResult } from '../../shared/types';
import { assetUrl } from './apiClient';
import { ApiJournal, mapJournal } from './posMappers';

const num = (v: unknown): number => Number(v) || 0;

type AccountType = ChartOfAccount['account_type'];
type NormalBalance = ChartOfAccount['normal_balance'];

export interface ApiAccount {
  id: number;
  account_code: string;
  account_name: string;
  account_type: AccountType;
  normal_balance: NormalBalance;
  is_active: boolean;
}

export interface ApiTrialBalance {
  as_of: string;
  accounts: { account_code: string; account_name: string; account_type: AccountType; normal_balance: NormalBalance; debit: number | string; credit: number | string }[];
  total_debit: number;
  total_credit: number;
  difference: number;
  is_balanced: boolean;
}

export interface ApiLedger {
  account: { account_code: string; account_name: string; account_type: AccountType; normal_balance: NormalBalance };
  start_date: string | null;
  end_date: string | null;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  ending_balance: number;
  mutations: {
    id: number; entry_number: string; date: string; reference_type: string; reference_id: string;
    description: string; note: string | null; debit: number; credit: number; running_balance: number;
  }[];
}

export interface ApiJournalPage {
  items: ApiJournal[];
  current_page: number;
  last_page: number;
  total: number;
  total_debit: number;
  total_credit: number;
}

export interface JournalPage {
  journals: JournalEntry[];
  currentPage: number;
  lastPage: number;
  total: number;
  totalDebit: number;
  totalCredit: number;
}

export interface ApiExpenseCategory {
  id: number;
  code: string;
  name: string;
  account_code: string;
}

export interface ApiExpense {
  id: number;
  reference: string;
  expense_date: string;
  category: ApiExpenseCategory | null;
  amount: number | string;
  payment_method: string;
  bank_name: string | null;
  recipient_name: string;
  description: string;
  attachment_url: string | null;
  approved_by: string;
  status: 'ACTIVE' | 'VOID';
  void_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  created_at: string | null;
}

export const mapAccount = (a: ApiAccount): ChartOfAccount => ({
  account_code: a.account_code,
  account_name: a.account_name,
  account_type: a.account_type,
  normal_balance: a.normal_balance,
});

export const mapTrialBalance = (tb: ApiTrialBalance): TrialBalanceResult => ({
  rows: tb.accounts.map((r) => ({
    account_code: r.account_code,
    account_name: r.account_name,
    account_type: r.account_type,
    debit_balance: num(r.debit),
    credit_balance: num(r.credit),
  })),
  total_debit: num(tb.total_debit),
  total_credit: num(tb.total_credit),
  is_balanced: tb.is_balanced,
  difference: num(tb.difference),
});

export const mapLedger = (l: ApiLedger): LedgerAccountSummary => ({
  account_code: l.account.account_code,
  account_name: l.account.account_name,
  account_type: l.account.account_type,
  normal_balance: l.account.normal_balance,
  initial_balance: num(l.opening_balance),
  total_debit: num(l.total_debit),
  total_credit: num(l.total_credit),
  ending_balance: num(l.ending_balance),
  transactions: l.mutations.map((m) => ({
    id: String(m.id),
    journal_id: m.entry_number,
    journal_number: m.entry_number,
    date: m.date,
    ref_doc: m.reference_id,
    description: m.description,
    debit: num(m.debit),
    credit: num(m.credit),
    running_balance: num(m.running_balance),
    note: m.note ?? undefined,
  })),
});

export const mapJournalPage = (p: ApiJournalPage): JournalPage => ({
  journals: p.items.map(mapJournal),
  currentPage: p.current_page,
  lastPage: p.last_page,
  total: p.total,
  totalDebit: num(p.total_debit),
  totalCredit: num(p.total_credit),
});

const CASH_METHODS = ['TUNAI', 'KAS_LACI'];

export const mapExpense = (e: ApiExpense): ExpenseRecord => ({
  id: String(e.id),
  reference: e.reference,
  expense_number: e.reference,
  bkk_number: e.reference,
  date: e.expense_date,
  category: (e.category?.name ?? '') as ExpenseCategory,
  category_id: e.category?.id,
  category_code: e.category?.account_code,
  amount: num(e.amount),
  cash_source: (CASH_METHODS.includes(e.payment_method) ? 'Kas Tunai Laci Kasir' : 'Rekening Bank BCA (Cabang 3)') as CashSource,
  payment_method: e.payment_method,
  bank_name: e.bank_name ?? undefined,
  paid_to: e.recipient_name,
  description: e.description,
  receipt_image: e.attachment_url ? assetUrl(e.attachment_url) : undefined,
  attachment_path: e.attachment_url ?? undefined,
  approved_by: e.approved_by,
  status: e.status,
  void_reason: e.void_reason ?? undefined,
  voided_by: e.voided_by ?? undefined,
  voided_at: e.voided_at ?? undefined,
  created_at: e.created_at ?? '',
});

/** Data URL hasil kompresi foto nota → Blob untuk diunggah multipart. */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg';
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};

/** Payload multipart POST /expenses dari isian form beban. */
export const expenseFormData = (e: ExpenseRecord, categoryId: number): FormData => {
  const isCash = e.cash_source.includes('Laci');
  const form = new FormData();
  form.append('expense_date', e.date);
  form.append('category_id', String(categoryId));
  form.append('amount', String(e.amount));
  form.append('payment_method', isCash ? 'TUNAI' : 'TRANSFER_BCA');
  if (!isCash) form.append('bank_name', e.bank_name || 'BCA');
  form.append('recipient_name', e.paid_to);
  form.append('description', e.description);
  if (e.receipt_image?.startsWith('data:')) {
    const blob = dataUrlToBlob(e.receipt_image);
    form.append('attachment', blob, `nota.${blob.type.split('/')[1] ?? 'jpg'}`);
  }
  return form;
};
```

- [ ] **Step 6: Rewrite the API clients**

Replace `src/services/api/accountingApi.ts` with:

```ts
import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type { ApiAccount, ApiJournalPage, ApiLedger, ApiTrialBalance } from './accountingMappers';
import type {
  AccountingPeriodsInfo,
  CashFlowReport,
  FinancialStatements,
  ManualJournalPayload,
  OpeningBalanceInput,
  PeriodClosingRecord,
} from '../../shared/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ReportRange = { start_date?: string; end_date: string };
export type JournalQuery = {
  start_date?: string;
  end_date?: string;
  types?: string;
  search?: string;
  account_code?: string;
  page?: number;
  per_page?: number;
};
export type CashBalances = Record<'1-1000' | '1-1001', number>;

const data = <T>(request: Promise<Envelope<T>>): Promise<T> => request.then((r) => r.data);

export const accountingApi = {
  accounts: () => data(apiClient.get<Envelope<ApiAccount[]>>('/accounts')),
  journals: (query: JournalQuery) => data(apiClient.get<Envelope<ApiJournalPage>>('/accounting/journals', query)),
  createManualJournal: (payload: ManualJournalPayload) =>
    data(apiClient.post<Envelope<ApiJournal>>('/accounting/journals/manual', payload)),
  reverseJournal: (entryNumber: string, reason: string) =>
    data(apiClient.post<Envelope<ApiJournal>>(`/accounting/journals/${encodeURIComponent(entryNumber)}/reverse`, { reason })),
  generalLedger: (query: { account_code: string; start_date?: string; end_date?: string }) =>
    data(apiClient.get<Envelope<ApiLedger>>('/accounting/general-ledger', query)),
  trialBalance: (asOf: string) => data(apiClient.get<Envelope<ApiTrialBalance>>('/accounting/trial-balance', { as_of: asOf })),
  financialStatements: (range: ReportRange) =>
    data(apiClient.get<Envelope<FinancialStatements>>('/accounting/financial-statements', range)),
  cashFlow: (range: ReportRange) => data(apiClient.get<Envelope<CashFlowReport>>('/accounting/cash-flow', range)),
  cashBalances: () => data(apiClient.get<Envelope<CashBalances>>('/accounting/cash-balances')),
  periods: () => data(apiClient.get<Envelope<AccountingPeriodsInfo>>('/accounting/periods')),
  closePeriod: (period: string, notes: string) =>
    data(apiClient.post<Envelope<PeriodClosingRecord>>('/accounting/periods/close', { period, notes })),
  reopenPeriod: (period: string, reason: string) =>
    data(apiClient.post<Envelope<PeriodClosingRecord>>(`/accounting/periods/${period}/reopen`, { reason })),
  openingBalance: () => data(apiClient.get<Envelope<ApiJournal | null>>('/accounting/opening-balance')),
  postOpeningBalance: (input: OpeningBalanceInput) =>
    data(apiClient.post<Envelope<ApiJournal>>('/accounting/opening-balance', input)),
};
```

Replace `src/services/api/expenseApi.ts` with:

```ts
import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type { ApiExpense, ApiExpenseCategory } from './accountingMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type ExpenseQuery = { start_date?: string; end_date?: string; status?: 'ACTIVE' | 'VOID'; per_page?: number };

export interface ExpenseResult {
  expense: ApiExpense;
  journals: ApiJournal[];
}

export const expenseApi = {
  categories: () => apiClient.get<Envelope<ApiExpenseCategory[]>>('/expense-categories').then((r) => r.data),
  list: (query: ExpenseQuery = { per_page: 500 }) =>
    apiClient.get<Envelope<{ items: ApiExpense[]; total: number }>>('/expenses', query).then((r) => r.data.items),
  create: (form: FormData) => apiClient.upload<Envelope<ExpenseResult>>('/expenses', form).then((r) => r.data),
  void: (id: string | number, reason: string) =>
    apiClient.post<Envelope<ExpenseResult>>(`/expenses/${id}/void`, { reason }).then((r) => r.data),
};
```

In `src/services/api/index.ts`, add after `export * from './inventoryMappers';`:

```ts
export * from './accountingMappers';
```

- [ ] **Step 7: Create the period helpers**

Create `src/services/accountingPeriod.ts`:

```ts
const pad = (n: number): string => String(n).padStart(2, '0');

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

/** Tanggal lokal perangkat (WIB di toko) sebagai YYYY-MM-DD. toISOString() memakai UTC dan bisa mundur sehari. */
export const localDate = (d: Date = new Date()): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const currentMonth = (d: Date = new Date()): string => localDate(d).slice(0, 7);

export const previousMonth = (d: Date = new Date()): string => currentMonth(new Date(d.getFullYear(), d.getMonth() - 1, 1));

export const monthRange = (month: string): { start: string; end: string } => {
  const [year, m] = month.split('-').map(Number);
  return { start: `${month}-01`, end: `${month}-${pad(new Date(year, m, 0).getDate())}` };
};

export const monthLabel = (month: string): string => {
  const [year, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${year}`;
};

export type PeriodSelection =
  | { kind: 'month'; month: string }
  | { kind: 'all' }
  | { kind: 'range'; start: string; end: string };

export interface ResolvedPeriod {
  start_date?: string;
  end_date: string;
  label: string;
}

/** Ubah pilihan periode di UI menjadi parameter laporan server. */
export const resolvePeriod = (selection: PeriodSelection, today: string = localDate()): ResolvedPeriod => {
  if (selection.kind === 'all') return { end_date: today, label: `Semua periode s/d ${today}` };
  if (selection.kind === 'range') {
    return { start_date: selection.start, end_date: selection.end, label: `${selection.start} s/d ${selection.end}` };
  }
  const { start, end } = monthRange(selection.month);
  return { start_date: start, end_date: end, label: monthLabel(selection.month) };
};
```

- [ ] **Step 8: Run the tests and the type check**

Run: `npx vitest run src/services/__tests__/accountingPeriod.test.ts src/services/__tests__/accountingMappers.test.ts`
Expected: PASS (8 tests).

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass. (The old `accountingApi`/`expenseApi` were not imported anywhere, so the rewrite breaks nothing.)

- [ ] **Step 9: Commit**

```bash
git add src/shared/types/index.ts src/services/api/apiClient.ts src/services/api/posMappers.ts src/services/api/accountingMappers.ts src/services/api/accountingApi.ts src/services/api/expenseApi.ts src/services/api/index.ts src/services/accountingPeriod.ts src/services/__tests__/accountingPeriod.test.ts src/services/__tests__/accountingMappers.test.ts
git commit -m "feat(accounting): add typed accounting and expense api clients

Adds wire types and mappers for ledger, trial balance, journal pages and
expenses, report types for server statements and cash flow, and local
date helpers so periods are no longer hard-coded or taken from UTC.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B2: Server-backed trial balance and general ledger tabs

**Files:**
- Create: `src/modules/accounting/hooks/useServerData.ts`
- Create: `src/modules/accounting/components/ServerStatus.tsx`, `src/modules/accounting/components/PeriodPicker.tsx`
- Rewrite: `src/modules/accounting/components/TrialBalanceTab.tsx`, `src/modules/accounting/components/GeneralLedgerTab.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `accountingApi.trialBalance`, `accountingApi.generalLedger`, `accountingApi.accounts`, `mapTrialBalance`, `mapLedger`, `mapAccount`, `resolvePeriod`, `currentMonth`, `localDate` (B1).
- Produces: `useServerData<T>(load: () => Promise<T>, deps: unknown[]): { data: T | null; loading: boolean; error: string | null; reload: () => void }`
- Produces: `<ServerStatus loading error onRetry />`, `<PeriodPicker value onChange allowAll? />`
- Produces: `<TrialBalanceTab refreshKey? onNavigateToReports />`, `<GeneralLedgerTab accounts refreshKey? />`
- Produces (App): state `accounts: ChartOfAccount[]`, `ledgerVersion: number` (incremented by `mergeServerJournals`); `GeneralLedgerScreen` gains optional props `accounts`, `ledgerVersion`.

- [ ] **Step 1: Add the data hook and shared UI pieces**

Create `src/modules/accounting/hooks/useServerData.ts`:

```ts
import { useEffect, useState } from 'react';

interface ServerDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Muat data server untuk tampilan laporan. Data lama tetap tampil selama memuat ulang;
 * galat ditampilkan apa adanya (tidak ada data cadangan lokal).
 */
export function useServerData<T>(load: () => Promise<T>, deps: unknown[]): ServerDataState<T> & { reload: () => void } {
  const [state, setState] = useState<ServerDataState<T>>({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    load()
      .then((data) => {
        if (active) setState({ data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (active) setState({ data: null, loading: false, error: err instanceof Error ? err.message : 'Gagal memuat data dari server.' });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  return { ...state, reload: () => setAttempt((n) => n + 1) };
}
```

Create `src/modules/accounting/components/ServerStatus.tsx`:

```tsx
import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ServerStatusProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

/** Status muat laporan server: pesan galat dengan tombol ulang, atau indikator memuat. */
export const ServerStatus: React.FC<ServerStatusProps> = ({ loading, error, onRetry }) => {
  if (error) {
    return (
      <div role="alert" className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800 flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span><strong>Gagal memuat data server.</strong> {error}</span>
        </span>
        <button type="button" onClick={onRetry} className="px-3 py-1.5 font-bold bg-white border border-rose-300 rounded-lg hover:bg-rose-100 cursor-pointer">
          Coba lagi
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2" aria-live="polite">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Memuat data dari server…</span>
      </div>
    );
  }
  return null;
};
```

Create `src/modules/accounting/components/PeriodPicker.tsx`:

```tsx
import React from 'react';
import { Calendar } from 'lucide-react';
import { PeriodSelection, currentMonth, localDate } from '../../../services/accountingPeriod';

interface PeriodPickerProps {
  value: PeriodSelection;
  onChange: (value: PeriodSelection) => void;
  allowAll?: boolean;
}

const field = 'px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none';

/** Pilih periode laporan: per bulan, rentang tanggal, atau semua periode. */
export const PeriodPicker: React.FC<PeriodPickerProps> = ({ value, onChange, allowAll = true }) => (
  <div className="flex flex-wrap items-center gap-2 text-xs">
    <Calendar className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
    <select
      aria-label="Jenis periode"
      value={value.kind}
      className={field}
      onChange={(e) => {
        const kind = e.target.value as PeriodSelection['kind'];
        if (kind === 'month') onChange({ kind, month: currentMonth() });
        else if (kind === 'range') onChange({ kind, start: `${currentMonth()}-01`, end: localDate() });
        else onChange({ kind: 'all' });
      }}
    >
      <option value="month">Per bulan</option>
      <option value="range">Rentang tanggal</option>
      {allowAll && <option value="all">Semua periode</option>}
    </select>
    {value.kind === 'month' && (
      <input
        type="month"
        aria-label="Bulan laporan"
        value={value.month}
        max={currentMonth()}
        className={field}
        onChange={(e) => e.target.value && onChange({ kind: 'month', month: e.target.value })}
      />
    )}
    {value.kind === 'range' && (
      <>
        <input type="date" aria-label="Dari tanggal" value={value.start} max={value.end} className={field}
          onChange={(e) => e.target.value && onChange({ ...value, start: e.target.value })} />
        <span className="text-slate-400">s/d</span>
        <input type="date" aria-label="Sampai tanggal" value={value.end} min={value.start} className={field}
          onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })} />
      </>
    )}
  </div>
);
```

In `src/modules/accounting/components/index.ts`, add:

```ts
export * from './PeriodPicker';
export * from './ServerStatus';
```

- [ ] **Step 2: Rewrite the trial balance tab**

Replace `src/modules/accounting/components/TrialBalanceTab.tsx` with:

```tsx
import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Scale } from 'lucide-react';
import { accountingApi, mapTrialBalance } from '../../../services/api';
import { localDate } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface TrialBalanceTabProps {
  refreshKey?: number;
  onNavigateToReports: () => void;
}

const TYPE_LABEL: Record<string, string> = {
  ASSET: 'Aset', LIABILITY: 'Liabilitas', EQUITY: 'Ekuitas', REVENUE: 'Pendapatan', EXPENSE: 'Beban',
};

export const TrialBalanceTab: React.FC<TrialBalanceTabProps> = ({ refreshKey = 0, onNavigateToReports }) => {
  const [asOf, setAsOf] = useState(localDate());
  const { data, loading, error, reload } = useServerData(
    () => accountingApi.trialBalance(asOf).then(mapTrialBalance),
    [asOf, refreshKey],
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-blue-700" />
            <span>Neraca Saldo (Trial Balance)</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Saldo seluruh akun COA per tanggal, dihitung server dari jurnal berstatus POSTED.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-600 flex items-center gap-1.5">
            <span>Per tanggal</span>
            <input type="date" value={asOf} onChange={(e) => e.target.value && setAsOf(e.target.value)}
              className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white" />
          </label>
          {data && <ExportMenu reportId="trial_balance" data={data} ctx={{ periodLabel: `Per ${asOf}`, endDate: asOf }} />}
        </div>
      </div>

      <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div role="status" className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-bold ${
            data.is_balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {data.is_balanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{data.is_balanced ? 'Seimbang: total debit sama dengan total kredit.' : `Tidak seimbang, selisih ${formatRupiah(data.difference)}.`}</span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left w-24">Kode</th>
                  <th className="py-2 px-3 text-left">Nama Akun</th>
                  <th className="py-2 px-3 text-left w-28">Klasifikasi</th>
                  <th className="py-2 px-3 text-right w-40">Debit</th>
                  <th className="py-2 px-3 text-right w-40">Kredit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((r) => (
                  <tr key={r.account_code} className={r.debit_balance === 0 && r.credit_balance === 0 ? 'text-slate-400' : 'text-slate-800'}>
                    <td className="py-1.5 px-3 font-mono font-bold">{r.account_code}</td>
                    <td className="py-1.5 px-3">{r.account_name}</td>
                    <td className="py-1.5 px-3">{TYPE_LABEL[r.account_type] ?? r.account_type}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{r.debit_balance ? formatRupiah(r.debit_balance) : '-'}</td>
                    <td className="py-1.5 px-3 text-right font-mono">{r.credit_balance ? formatRupiah(r.credit_balance) : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t border-slate-300">
                <tr>
                  <td colSpan={3} className="py-2 px-3">TOTAL</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_debit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_credit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button type="button" onClick={onNavigateToReports}
            className="text-xs font-bold text-blue-700 hover:underline flex items-center gap-1 cursor-pointer">
            <span>Lanjut ke Laporan Keuangan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 3: Rewrite the general ledger tab**

Replace `src/modules/accounting/components/GeneralLedgerTab.tsx` with:

```tsx
import React, { useState } from 'react';
import { BookMarked, Printer } from 'lucide-react';
import { ChartOfAccount } from '../../../shared/types';
import { accountingApi, mapLedger } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { LedgerPrintModal } from './LedgerPrintModal';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';

interface GeneralLedgerTabProps {
  accounts: ChartOfAccount[];
  refreshKey?: number;
}

const GROUPS = [
  { prefix: '1-', label: 'Aset' },
  { prefix: '2-', label: 'Liabilitas' },
  { prefix: '3-', label: 'Ekuitas' },
  { prefix: '4-', label: 'Pendapatan' },
  { prefix: '5-', label: 'Harga Pokok' },
  { prefix: '6-', label: 'Beban Operasional' },
];

export const GeneralLedgerTab: React.FC<GeneralLedgerTabProps> = ({ accounts, refreshKey = 0 }) => {
  const [accountCode, setAccountCode] = useState('1-1000');
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const range = resolvePeriod(period);

  const { data, loading, error, reload } = useServerData(
    () => accountingApi.generalLedger({ account_code: accountCode, start_date: range.start_date, end_date: range.end_date }).then(mapLedger),
    [accountCode, range.start_date, range.end_date, refreshKey],
  );

  const accountMeta: ChartOfAccount = accounts.find((a) => a.account_code === accountCode) ?? {
    account_code: accountCode,
    account_name: data?.account_name ?? accountCode,
    account_type: data?.account_type ?? 'ASSET',
    normal_balance: data?.normal_balance ?? 'DEBIT',
  };
  const options = accounts.length > 0 ? accounts : [accountMeta];
  const cards = data
    ? [
        { label: 'Saldo Awal', value: data.initial_balance },
        { label: 'Total Debit', value: data.total_debit },
        { label: 'Total Kredit', value: data.total_credit },
        { label: 'Saldo Akhir', value: data.ending_balance },
      ]
    : [];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <BookMarked className="w-4 h-4 text-blue-700" />
            <span>Buku Besar: {accountMeta.account_code} — {accountMeta.account_name}</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Saldo normal {accountMeta.normal_balance === 'DEBIT' ? 'debit' : 'kredit'}. Saldo awal dihitung dari seluruh jurnal sebelum periode.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Pilih akun" value={accountCode} onChange={(e) => setAccountCode(e.target.value)}
            className="px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white max-w-[280px]">
            {GROUPS.map((g) => {
              const items = options.filter((a) => a.account_code.startsWith(g.prefix));
              return items.length === 0 ? null : (
                <optgroup key={g.prefix} label={g.label}>
                  {items.map((a) => (
                    <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <PeriodPicker value={period} onChange={setPeriod} />
          {data && (
            <ExportMenu reportId="general_ledger" data={data} ctx={{ periodLabel: range.label, startDate: range.start_date, endDate: range.end_date }} />
          )}
          {data && (
            <button type="button" onClick={() => setIsPrintOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          )}
        </div>
      </div>

      <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((c) => (
              <div key={c.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{c.label}</span>
                <span className="text-sm sm:text-base font-black font-mono text-slate-900">{formatRupiah(c.value)}</span>
              </div>
            ))}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left w-28">Tanggal</th>
                  <th className="py-2 px-3 text-left w-36">No. Jurnal</th>
                  <th className="py-2 px-3 text-left w-36">Referensi</th>
                  <th className="py-2 px-3 text-left">Keterangan</th>
                  <th className="py-2 px-3 text-right w-32">Debit</th>
                  <th className="py-2 px-3 text-right w-32">Kredit</th>
                  <th className="py-2 px-3 text-right w-36">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="bg-blue-50/40 font-bold">
                  <td colSpan={6} className="py-1.5 px-3">Saldo awal {range.start_date ? `per ${formatDateIndo(range.start_date)}` : ''}</td>
                  <td className="py-1.5 px-3 text-right font-mono">{formatRupiah(data.initial_balance)}</td>
                </tr>
                {data.transactions.length === 0 ? (
                  <tr><td colSpan={7} className="py-6 text-center text-slate-400 italic">Tidak ada mutasi pada periode ini.</td></tr>
                ) : (
                  data.transactions.map((t) => (
                    <tr key={t.id} className="text-slate-800">
                      <td className="py-1.5 px-3">{formatDateIndo(t.date)}</td>
                      <td className="py-1.5 px-3 font-mono">{t.journal_number}</td>
                      <td className="py-1.5 px-3 font-mono text-slate-500">{t.ref_doc}</td>
                      <td className="py-1.5 px-3">{t.description}{t.note && <span className="block text-[10px] text-slate-400">{t.note}</span>}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-blue-700">{t.debit ? formatRupiah(t.debit) : '-'}</td>
                      <td className="py-1.5 px-3 text-right font-mono text-emerald-700">{t.credit ? formatRupiah(t.credit) : '-'}</td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold">{formatRupiah(t.running_balance)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-black border-t border-slate-300">
                <tr>
                  <td colSpan={4} className="py-2 px-3">TOTAL MUTASI & SALDO AKHIR</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_debit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.total_credit)}</td>
                  <td className="py-2 px-3 text-right font-mono">{formatRupiah(data.ending_balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <LedgerPrintModal isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)} ledgerData={data}
            accountMeta={accountMeta} startDate={range.start_date} endDate={range.end_date} />
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Wire the tabs into the screen and App**

In `src/modules/accounting/GeneralLedgerScreen.tsx`:

1. Add `ChartOfAccount,` to the `../../shared/types` import.
2. In `GeneralLedgerScreenProps`, add:

```ts
  accounts?: ChartOfAccount[];
  ledgerVersion?: number;
```

3. In the destructuring, add `accounts = [],` and `ledgerVersion = 0,`.
4. Replace the `ledger` and `trial-balance` tab blocks with:

```tsx
        {activeTab === 'ledger' && (
          <GeneralLedgerTab accounts={accounts} refreshKey={ledgerVersion} />
        )}

        {activeTab === 'trial-balance' && (
          <TrialBalanceTab
            refreshKey={ledgerVersion}
            onNavigateToReports={onNavigateToFinancials || (() => setActiveTab('reports'))}
          />
        )}
```

5. Replace the hard-coded badge text `21 Akun` with `{accounts.length} Akun`.

In `src/App.tsx`:

1. Add `ChartOfAccount,` to the `./shared/types` import and `accountingApi, mapAccount,` to the `./services/api` import.
2. Next to the `journals` state declaration, add:

```ts
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  /** Naik setiap kali server membukukan jurnal; komponen laporan memuat ulang saat nilainya berubah. */
  const [ledgerVersion, setLedgerVersion] = useState(0);
```

3. In `loadPosData`, after `if (allowed('inventory_view')) refreshStockLedger();`, add:

```ts
    if (allowed('accounting_hub', 'financial_reports', 'expenses')) {
      accountingApi.accounts().then((rows) => setAccounts(rows.map(mapAccount))).catch(() => {});
    }
```

4. In `mergeServerJournals`, after `if (apiJournals.length === 0) return;`, add `setLedgerVersion((v) => v + 1);`.
5. In the `<GeneralLedgerScreen` JSX, add the props `accounts={accounts}` and `ledgerVersion={ledgerVersion}`.

- [ ] **Step 5: Type check, tests, and a browser check**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

Browser check: start both servers (preview `npm run dev:all` or the project's launch config), log in as owner, open **Buku Besar & Siklus Akuntansi** → tab *Buku Besar*: pick account `1-1000`, switch the period picker between a month, a range and "Semua periode"; figures change and no console errors appear. Tab *Neraca Saldo*: change the date; the banner says "Seimbang".

- [ ] **Step 6: Commit**

```bash
git add src/modules/accounting/hooks/useServerData.ts src/modules/accounting/components/ServerStatus.tsx src/modules/accounting/components/PeriodPicker.tsx src/modules/accounting/components/TrialBalanceTab.tsx src/modules/accounting/components/GeneralLedgerTab.tsx src/modules/accounting/components/index.ts src/modules/accounting/GeneralLedgerScreen.tsx src/App.tsx
git commit -m "feat(accounting): load the general ledger and trial balance from the server

Both tabs fetch server reports for a chosen period or date instead of
recomputing from browser journals, list accounts from the server COA,
and reload whenever the server posts a journal.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B3: Server financial statements, cash flow, print and export

**Files:**
- Create: `src/modules/accounting/components/StatementParts.tsx`
- Rewrite: `src/modules/accounting/components/SakEmkmReportTab.tsx`, `CashFlowStatementTab.tsx`, `FinancialStatementsPrintModal.tsx`, `src/modules/accounting/FinancialStatementsScreen.tsx`
- Modify: `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`
- Modify: `src/modules/accounting/GeneralLedgerScreen.tsx` (reports tab), `src/App.tsx` (financials screen props)

**Interfaces:**
- Consumes: `accountingApi.financialStatements`, `accountingApi.cashFlow`, types `FinancialStatements`, `CashFlowReport`, `StatementSection` (B1); `useServerData`, `PeriodPicker`, `ServerStatus` (B2).
- Produces: `<IncomeStatementTable statement />`, `<BalanceSheetTables sheet />`, `<EquityChangesTable changes />`; `<SakEmkmReportTab refreshKey? />`; `<CashFlowStatementTab cashFlow periodLabel />`; `<FinancialStatementsPrintModal isOpen onClose statements cashFlow periodLabel />`; `<FinancialStatementsScreen refreshKey? />`.
- Export registry: `fin_income_statement`, `fin_balance_sheet`, `fin_equity_statement`, `fin_calk` take `FinancialStatements`; `fin_cash_flow` takes `CashFlowReport`; `sak_emkm_package` takes `{ financials: FinancialStatements; cashFlow: CashFlowReport }`.

- [ ] **Step 1: Update the export registry test first**

In `src/shared/export/__tests__/registry.test.ts`, add below the existing imports:

```ts
import type { CashFlowReport, FinancialStatements, StatementLine } from '../../types';
```

and replace the whole `describe('registry financial statements', () => { ... });` block with:

```ts
describe('registry financial statements', () => {
  const section = (lines: StatementLine[]) => ({ lines, total: lines.reduce((s, l) => s + l.amount, 0) });

  const statements: FinancialStatements = {
    period: { start_date: '2026-09-01', end_date: '2026-09-30' },
    income_statement: {
      revenue: section([
        { code: '4-1000', name: 'Pendapatan Penjualan Ban Baru', amount: 900000 },
        { code: '4-1001', name: 'Pendapatan Jasa Servis & Spooring', amount: 100000 },
      ]),
      contra_revenue: section([{ code: '4-9000', name: 'Potongan Diskon Penjualan', amount: 50000 }]),
      net_revenue: 950000,
      cost_of_sales: section([{ code: '5-1000', name: 'HPP Ban Baru', amount: 600000 }]),
      gross_profit: 350000,
      operating_expenses: section([{ code: '6-1000', name: 'Beban Gaji', amount: 100000 }]),
      net_income: 250000,
    },
    balance_sheet: {
      as_of: '2026-09-30',
      current_assets: section([{ code: '1-1000', name: 'Kas', amount: 850000 }]),
      fixed_assets: section([
        { code: '1-3000', name: 'Mesin', amount: 1000000 },
        { code: '1-3999', name: 'Akumulasi Penyusutan', amount: -200000 },
      ]),
      total_assets: 1650000,
      liabilities: section([{ code: '2-1000', name: 'Hutang Dagang', amount: 300000 }]),
      equity: section([
        { code: '3-1000', name: 'Modal', amount: 1100000 },
        { code: null, name: 'Laba (Rugi) Periode Berjalan (belum ditutup)', amount: 250000 },
      ]),
      total_liabilities_and_equity: 1650000,
      difference: 0,
      is_balanced: true,
    },
    equity_changes: { opening_equity: 1100000, owner_contributions: 0, net_income: 250000, closing_equity: 1350000, difference: 0 },
  };

  const cashFlow: CashFlowReport = {
    period: { start_date: '2026-09-01', end_date: '2026-09-30' },
    operating: { customers: 950000, suppliers: -500000, expenses: -100000, other: 0, net: 350000 },
    investing: { fixed_assets: 0, net: 0 },
    financing: { equity: 0, net: 0 },
    net_change: 350000,
    beginning_cash: 100000,
    ending_cash: 450000,
    ending_cash_drawer: 150000,
    ending_bank: 300000,
    is_reconciled: true,
  };

  it('laba rugi memuat setiap akun dan potongan bernilai negatif', () => {
    const doc = buildExportDoc('fin_income_statement', statements, ctx);
    expect(doc.sections[0].rows.length).toBe(8);
    expect(doc.sections[0].rows.find((r) => String(r.label).startsWith('Potongan: 4-9000'))?.value).toBe(-50000);
  });

  it('neraca menampilkan akumulasi penyusutan negatif dan laba belum ditutup', () => {
    const rows = buildExportDoc('fin_balance_sheet', statements, ctx).sections[0].rows;
    expect(rows.find((r) => String(r.label).includes('1-3999'))?.value).toBe(-200000);
    expect(rows.find((r) => String(r.label).includes('belum ditutup'))?.value).toBe(250000);
  });

  it('arus kas memuat saldo akhir', () => {
    const rows = buildExportDoc('fin_cash_flow', cashFlow, ctx).sections[0].rows;
    expect(rows.find((r) => r.label === 'Saldo Kas & Bank Akhir')?.value).toBe(450000);
  });

  it('sak emkm package memiliki 5 section', () => {
    const doc = buildExportDoc('sak_emkm_package', { financials: statements, cashFlow }, ctx);
    expect(doc.sections.length).toBe(5);
  });
});
```

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: FAIL (type errors / wrong rows — the registry still expects the old shapes).

- [ ] **Step 2: Update the export registry**

In `src/shared/export/registry.ts`:

1. Replace the top type import and the `accountingService` import + `type Financials = ...` line with:

```ts
import type {
  AccountingPeriodInfo,
  CashFlowReport,
  FinancialStatements,
  JournalEntry,
  LedgerAccountSummary,
  PayableInvoice,
  ReceivableInvoice,
  StatementSection,
  TrialBalanceResult,
} from '../types';
import type { ExpenseRecord, PosTransaction, ProductItem, ServiceMasterItem, StockMutation, StockOpnameItem, SupplierItem } from '../types';
import { EXPENSE_CATEGORY_CONFIG, formatRupiah } from '../utils/formatters';
```

2. Replace everything from `const incomeSection = (f: Financials): ExportSection =>` down to the end of `const mapSakPackage = ...` (inclusive; keep `mapPeriodClosing` and below unchanged) with:

```ts
const sectionRows = (prefix: string, section: StatementSection, sign = 1) =>
  section.lines.map((l) => ({ label: `${prefix}${l.code ? `${l.code} ` : ''}${l.name}`, value: sign * l.amount }));

const incomeSection = (fs: FinancialStatements): ExportSection => {
  const is = fs.income_statement;
  return lvSection('1. LAPORAN LABA RUGI', [
    ...sectionRows('Pendapatan: ', is.revenue),
    ...sectionRows('Potongan: ', is.contra_revenue, -1),
    { label: 'PENDAPATAN BERSIH', value: is.net_revenue },
    ...sectionRows('Beban Pokok: ', is.cost_of_sales, -1),
    { label: 'LABA KOTOR', value: is.gross_profit },
    ...sectionRows('Beban Operasional: ', is.operating_expenses, -1),
    { label: 'LABA (RUGI) BERSIH', value: is.net_income },
  ]);
};

const balanceSection = (fs: FinancialStatements): ExportSection => {
  const bs = fs.balance_sheet;
  return lvSection('2. LAPORAN POSISI KEUANGAN', [
    ...sectionRows('Aset Lancar: ', bs.current_assets),
    { label: 'JUMLAH ASET LANCAR', value: bs.current_assets.total },
    ...sectionRows('Aset Tetap: ', bs.fixed_assets),
    { label: 'JUMLAH ASET TETAP', value: bs.fixed_assets.total },
    { label: 'TOTAL ASET', value: bs.total_assets },
    ...sectionRows('Liabilitas: ', bs.liabilities),
    { label: 'JUMLAH LIABILITAS', value: bs.liabilities.total },
    ...sectionRows('Ekuitas: ', bs.equity),
    { label: 'JUMLAH EKUITAS', value: bs.equity.total },
    { label: 'TOTAL LIABILITAS & EKUITAS', value: bs.total_liabilities_and_equity },
  ]);
};

const equitySection = (fs: FinancialStatements): ExportSection =>
  lvSection('3. LAPORAN PERUBAHAN EKUITAS', [
    { label: 'Ekuitas awal periode', value: fs.equity_changes.opening_equity },
    { label: 'Setoran / (penarikan) modal & saldo awal', value: fs.equity_changes.owner_contributions },
    { label: 'Laba (rugi) bersih periode', value: fs.equity_changes.net_income },
    { label: 'EKUITAS AKHIR PERIODE', value: fs.equity_changes.closing_equity },
  ]);

const cashFlowSection = (cf: CashFlowReport): ExportSection =>
  lvSection('4. LAPORAN ARUS KAS (METODE LANGSUNG)', [
    { label: 'Penerimaan dari pelanggan', value: cf.operating.customers },
    { label: 'Pembayaran ke pemasok & persediaan', value: cf.operating.suppliers },
    { label: 'Pembayaran beban operasional', value: cf.operating.expenses },
    { label: 'Arus kas operasi lainnya', value: cf.operating.other },
    { label: 'ARUS KAS BERSIH AKTIVITAS OPERASI', value: cf.operating.net },
    { label: 'Perolehan / pelepasan aset tetap', value: cf.investing.fixed_assets },
    { label: 'ARUS KAS BERSIH AKTIVITAS INVESTASI', value: cf.investing.net },
    { label: 'Setoran / (penarikan) modal pemilik', value: cf.financing.equity },
    { label: 'ARUS KAS BERSIH AKTIVITAS PENDANAAN', value: cf.financing.net },
    { label: 'KENAIKAN (PENURUNAN) KAS BERSIH', value: cf.net_change },
    { label: 'Saldo Kas & Bank Awal', value: cf.beginning_cash },
    { label: 'Saldo Kas & Bank Akhir', value: cf.ending_cash },
    { label: 'Rincian: Kas Laci Akhir', value: cf.ending_cash_drawer },
    { label: 'Rincian: Bank BCA Akhir', value: cf.ending_bank },
  ]);

const calkSection = (fs: FinancialStatements): ExportSection => {
  const is = fs.income_statement;
  const bs = fs.balance_sheet;
  return {
    title: '5. CATATAN ATAS LAPORAN KEUANGAN (CALK)',
    columns: [{ key: 'uraian', label: 'Uraian', type: 'text', width: 110 }],
    rows: [
      'Laporan keuangan disusun berdasarkan SAK EMKM dengan basis akrual dan asumsi kelangsungan usaha.',
      'Entitas: Omah Ban Cabang 3, Magelang — usaha dagang ban dan jasa spooring; bukan Pengusaha Kena Pajak, sehingga tidak memungut PPN atas penjualan.',
      'Persediaan dinilai dengan metode FIFO; PPN atas pembelian dikapitalisasi ke harga perolehan persediaan.',
      `Periode laporan: ${fs.period.start_date ?? 'awal pembukuan'} s/d ${fs.period.end_date}.`,
      `Pendapatan bersih ${formatRupiah(is.net_revenue)}; laba (rugi) bersih ${formatRupiah(is.net_income)}.`,
      `Total aset ${formatRupiah(bs.total_assets)}; total liabilitas & ekuitas ${formatRupiah(bs.total_liabilities_and_equity)}${
        bs.is_balanced ? ' (seimbang).' : ` (selisih ${formatRupiah(bs.difference)}).`
      }`,
    ].map((uraian) => ({ uraian })),
  };
};

const mapIncome = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_income_statement', 'Laporan Laba Rugi', 'portrait', ctx, [incomeSection(fs)]);

const mapBalance = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_balance_sheet', 'Laporan Posisi Keuangan', 'portrait', ctx, [balanceSection(fs)]);

const mapEquity = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_equity_statement', 'Laporan Perubahan Ekuitas', 'portrait', ctx, [equitySection(fs)]);

const mapCashFlow = (cf: CashFlowReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_cash_flow', 'Laporan Arus Kas', 'portrait', ctx, [cashFlowSection(cf)]);

const mapCalk = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_calk', 'CALK', 'portrait', ctx, [calkSection(fs)]);

export interface SakEmkmPackageInput {
  financials: FinancialStatements;
  cashFlow: CashFlowReport;
}

const mapSakPackage = (d: SakEmkmPackageInput, ctx: ExportCtx): ExportDoc =>
  makeDoc('sak_emkm_package', 'Paket Laporan Keuangan SAK EMKM', 'portrait', ctx, [
    incomeSection(d.financials),
    balanceSection(d.financials),
    equitySection(d.financials),
    cashFlowSection(d.cashFlow),
    calkSection(d.financials),
  ]);
```

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: PASS.

- [ ] **Step 3: Add the statement building blocks**

Create `src/modules/accounting/components/StatementParts.tsx`:

```tsx
import React from 'react';
import type { BalanceSheet, EquityChanges, IncomeStatement, StatementSection } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

/** Pos pengurang ditulis dalam kurung; nilai negatif pada pos pengurang berarti penambah. */
const amountText = (value: number, subtract: boolean): string =>
  subtract ? (value >= 0 ? `(${formatRupiah(value)})` : formatRupiah(-value)) : formatRupiah(value);

const SectionRows: React.FC<{ title: string; section: StatementSection; subtract?: boolean }> = ({ title, section, subtract = false }) => (
  <>
    <tr className="bg-slate-50">
      <td colSpan={2} className="py-2 px-3 font-bold text-slate-800">{title}</td>
    </tr>
    {section.lines.length === 0 ? (
      <tr>
        <td colSpan={2} className="py-1.5 px-6 text-slate-400 italic">Tidak ada saldo</td>
      </tr>
    ) : (
      section.lines.map((line) => (
        <tr key={line.code ?? line.name}>
          <td className="py-1.5 px-6 text-slate-700">
            {line.code && <span className="font-mono text-slate-400 mr-2">{line.code}</span>}
            {line.name}
          </td>
          <td className={`py-1.5 px-3 text-right font-mono w-44 ${line.amount < 0 && !subtract ? 'text-rose-700' : 'text-slate-900'}`}>
            {amountText(line.amount, subtract)}
          </td>
        </tr>
      ))
    )}
    <tr className="border-t border-slate-200">
      <td className="py-1.5 px-3 font-bold text-slate-700">Jumlah {title.toLowerCase()}</td>
      <td className="py-1.5 px-3 text-right font-mono font-bold">{amountText(section.total, subtract)}</td>
    </tr>
  </>
);

const TotalRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <tr className="bg-slate-900 text-white">
    <td className="py-2 px-3 font-black">{label}</td>
    <td className={`py-2 px-3 text-right font-mono font-black ${value < 0 ? 'text-rose-300' : ''}`}>{formatRupiah(value)}</td>
  </tr>
);

export const IncomeStatementTable: React.FC<{ statement: IncomeStatement }> = ({ statement }) => (
  <table className="w-full text-xs border border-slate-200">
    <tbody>
      <SectionRows title="Pendapatan Usaha" section={statement.revenue} />
      <SectionRows title="Potongan Penjualan" section={statement.contra_revenue} subtract />
      <TotalRow label="PENDAPATAN BERSIH" value={statement.net_revenue} />
      <SectionRows title="Beban Pokok Penjualan" section={statement.cost_of_sales} subtract />
      <TotalRow label="LABA KOTOR" value={statement.gross_profit} />
      <SectionRows title="Beban Operasional" section={statement.operating_expenses} subtract />
      <TotalRow label="LABA (RUGI) BERSIH" value={statement.net_income} />
    </tbody>
  </table>
);

export const BalanceSheetTables: React.FC<{ sheet: BalanceSheet }> = ({ sheet }) => (
  <div className="space-y-3">
    <div role="status" className={`p-3 rounded-xl border text-xs font-bold ${
      sheet.is_balanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
    }`}>
      {sheet.is_balanced
        ? `Seimbang: total aset sama dengan total liabilitas & ekuitas per ${sheet.as_of}.`
        : `Tidak seimbang: selisih ${formatRupiah(sheet.difference)} per ${sheet.as_of}.`}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <table className="w-full text-xs border border-slate-200">
        <tbody>
          <SectionRows title="Aset Lancar" section={sheet.current_assets} />
          <SectionRows title="Aset Tetap" section={sheet.fixed_assets} />
          <TotalRow label="TOTAL ASET" value={sheet.total_assets} />
        </tbody>
      </table>
      <table className="w-full text-xs border border-slate-200">
        <tbody>
          <SectionRows title="Liabilitas" section={sheet.liabilities} />
          <SectionRows title="Ekuitas" section={sheet.equity} />
          <TotalRow label="TOTAL LIABILITAS & EKUITAS" value={sheet.total_liabilities_and_equity} />
        </tbody>
      </table>
    </div>
  </div>
);

export const EquityChangesTable: React.FC<{ changes: EquityChanges }> = ({ changes }) => (
  <div className="space-y-2">
    <table className="w-full text-xs border border-slate-200">
      <tbody>
        <tr><td className="py-1.5 px-3">Ekuitas awal periode</td><td className="py-1.5 px-3 text-right font-mono w-44">{formatRupiah(changes.opening_equity)}</td></tr>
        <tr><td className="py-1.5 px-3">Setoran / (penarikan) modal & saldo awal</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(changes.owner_contributions)}</td></tr>
        <tr><td className="py-1.5 px-3">Laba (rugi) bersih periode</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(changes.net_income)}</td></tr>
        <TotalRow label="EKUITAS AKHIR PERIODE" value={changes.closing_equity} />
      </tbody>
    </table>
    {changes.difference !== 0 && (
      <p role="alert" className="text-[11px] font-bold text-rose-700">Selisih rekonsiliasi ekuitas {formatRupiah(changes.difference)}.</p>
    )}
  </div>
);
```

- [ ] **Step 4: Rewrite the cash flow tab and the print modal**

Replace `src/modules/accounting/components/CashFlowStatementTab.tsx` with:

```tsx
import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CashFlowReport } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

interface CashFlowStatementTabProps {
  cashFlow: CashFlowReport;
  periodLabel: string;
}

const Row: React.FC<{ label: string; value: number; strong?: boolean; indent?: boolean }> = ({ label, value, strong = false, indent = false }) => (
  <tr className={strong ? 'font-bold border-t border-slate-200' : ''}>
    <td className={`py-1.5 ${indent ? 'px-6 text-slate-700' : 'px-3'}`}>{label}</td>
    <td className={`py-1.5 px-3 text-right font-mono w-44 ${value < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatRupiah(value)}</td>
  </tr>
);

const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <tr className="bg-slate-50">
    <td colSpan={2} className="py-2 px-3 font-bold text-slate-800">{children}</td>
  </tr>
);

/** Laporan arus kas metode langsung dari server; arus keluar tampil negatif. */
export const CashFlowStatementTab: React.FC<CashFlowStatementTabProps> = ({ cashFlow, periodLabel }) => (
  <div className="space-y-3">
    <p className="text-[11px] text-slate-500">Metode langsung • {periodLabel}. Arus kas keluar ditampilkan negatif.</p>
    <table className="w-full text-xs border border-slate-200">
      <tbody>
        <Heading>A. Arus Kas dari Aktivitas Operasi</Heading>
        <Row indent label="Penerimaan dari pelanggan (penjualan, pelunasan piutang, DP)" value={cashFlow.operating.customers} />
        <Row indent label="Pembayaran ke pemasok & persediaan" value={cashFlow.operating.suppliers} />
        <Row indent label="Pembayaran beban operasional" value={cashFlow.operating.expenses} />
        {cashFlow.operating.other !== 0 && <Row indent label="Arus kas operasi lainnya" value={cashFlow.operating.other} />}
        <Row strong label="Arus kas bersih dari aktivitas operasi" value={cashFlow.operating.net} />
        <Heading>B. Arus Kas dari Aktivitas Investasi</Heading>
        <Row indent label="Perolehan / pelepasan aset tetap" value={cashFlow.investing.fixed_assets} />
        <Row strong label="Arus kas bersih dari aktivitas investasi" value={cashFlow.investing.net} />
        <Heading>C. Arus Kas dari Aktivitas Pendanaan</Heading>
        <Row indent label="Setoran / (penarikan) modal pemilik" value={cashFlow.financing.equity} />
        <Row strong label="Arus kas bersih dari aktivitas pendanaan" value={cashFlow.financing.net} />
        <Row strong label="Kenaikan (penurunan) kas bersih" value={cashFlow.net_change} />
        <Row label="Saldo kas & bank awal periode" value={cashFlow.beginning_cash} />
        <Row strong label="Saldo kas & bank akhir periode" value={cashFlow.ending_cash} />
        <Row indent label="Kas laci kasir (1-1000)" value={cashFlow.ending_cash_drawer} />
        <Row indent label="Bank BCA (1-1001)" value={cashFlow.ending_bank} />
      </tbody>
    </table>
    <div role="status" className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
      cashFlow.is_reconciled ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
    }`}>
      {cashFlow.is_reconciled ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      <span>
        {cashFlow.is_reconciled
          ? 'Terekonsiliasi: saldo awal + kenaikan kas bersih = saldo kas & bank akhir.'
          : 'Tidak terekonsiliasi: periksa jurnal kas pada periode ini.'}
      </span>
    </div>
  </div>
);
```

Replace `src/modules/accounting/components/FinancialStatementsPrintModal.tsx` with:

```tsx
import React, { useEffect } from 'react';
import { Printer, X } from 'lucide-react';
import type { CashFlowReport, FinancialStatements } from '../../../shared/types';
import { CashFlowStatementTab } from './CashFlowStatementTab';
import { BalanceSheetTables, EquityChangesTable, IncomeStatementTable } from './StatementParts';

interface FinancialStatementsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  statements: FinancialStatements;
  cashFlow: CashFlowReport | null;
  periodLabel: string;
}

export const FinancialStatementsPrintModal: React.FC<FinancialStatementsPrintModalProps> = ({
  isOpen,
  onClose,
  statements,
  cashFlow,
  periodLabel,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <span className="text-sm font-bold">Pratinjau Cetak Laporan Keuangan</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button type="button" aria-label="Tutup pratinjau" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div id="a4-invoice-printable" className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900">
          <header className="text-center border-b-2 border-slate-900 pb-3">
            <h1 className="text-lg font-black uppercase tracking-wide">Omah Ban Cabang 3 — Magelang</h1>
            <p className="text-xs">Laporan Keuangan berdasarkan SAK EMKM • {periodLabel}</p>
          </header>
          <section className="space-y-2">
            <h2 className="text-sm font-black">1. Laporan Laba Rugi</h2>
            <IncomeStatementTable statement={statements.income_statement} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-black">2. Laporan Posisi Keuangan</h2>
            <BalanceSheetTables sheet={statements.balance_sheet} />
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-black">3. Laporan Perubahan Ekuitas</h2>
            <EquityChangesTable changes={statements.equity_changes} />
          </section>
          {cashFlow && (
            <section className="space-y-2">
              <h2 className="text-sm font-black">4. Laporan Arus Kas</h2>
              <CashFlowStatementTab cashFlow={cashFlow} periodLabel={periodLabel} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 5: Rewrite the report tab and the financial statements screen**

Replace `src/modules/accounting/components/SakEmkmReportTab.tsx` with:

```tsx
import React, { useState } from 'react';
import { Printer } from 'lucide-react';
import { accountingApi } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { CashFlowStatementTab } from './CashFlowStatementTab';
import { FinancialStatementsPrintModal } from './FinancialStatementsPrintModal';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';
import { BalanceSheetTables, EquityChangesTable, IncomeStatementTable } from './StatementParts';

interface SakEmkmReportTabProps {
  refreshKey?: number;
}

type ReportTab = 'income' | 'balance' | 'equity' | 'cashflow';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'income', label: '1. Laba Rugi' },
  { id: 'balance', label: '2. Posisi Keuangan' },
  { id: 'equity', label: '3. Perubahan Ekuitas' },
  { id: 'cashflow', label: '4. Arus Kas' },
];

const Kpi: React.FC<{ label: string; value: string; note: string; tone?: 'neutral' | 'good' | 'bad' }> = ({ label, value, note, tone = 'neutral' }) => (
  <div className={`rounded-xl p-3.5 border ${
    tone === 'good' ? 'bg-emerald-50 border-emerald-200' : tone === 'bad' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
  }`}>
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
    <span className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">{value}</span>
    <span className="text-[10px] text-slate-500 mt-0.5 block">{note}</span>
  </div>
);

export const SakEmkmReportTab: React.FC<SakEmkmReportTabProps> = ({ refreshKey = 0 }) => {
  const [tab, setTab] = useState<ReportTab>('income');
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const range = resolvePeriod(period);
  const query = { start_date: range.start_date, end_date: range.end_date };

  const statements = useServerData(() => accountingApi.financialStatements(query), [query.start_date, query.end_date, refreshKey]);
  const cashFlow = useServerData(() => accountingApi.cashFlow(query), [query.start_date, query.end_date, refreshKey]);
  const fs = statements.data;
  const cf = cashFlow.data;
  const active = tab === 'cashflow' ? cashFlow : statements;
  const ctx = { periodLabel: range.label, startDate: range.start_date, endDate: range.end_date };
  const netRevenue = fs?.income_statement.net_revenue ?? 0;
  const margin = fs && netRevenue !== 0 ? (fs.income_statement.net_income / netRevenue) * 100 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
      {fs && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi label="Pendapatan Bersih" value={formatRupiah(netRevenue)}
            note={`Pendapatan kotor ${formatRupiah(fs.income_statement.revenue.total)} sebelum potongan`} />
          <Kpi label="Laba (Rugi) Bersih" value={formatRupiah(fs.income_statement.net_income)}
            note={`Margin bersih ${margin.toFixed(1)}% dari pendapatan bersih`} tone={fs.income_statement.net_income >= 0 ? 'good' : 'bad'} />
          <Kpi label="Kas & Bank Akhir Periode" value={cf ? formatRupiah(cf.ending_cash) : '…'}
            note={cf ? `Laci ${formatRupiah(cf.ending_cash_drawer)} • Bank ${formatRupiah(cf.ending_bank)}` : 'Memuat arus kas'} />
          <Kpi label="Posisi Keuangan" value={fs.balance_sheet.is_balanced ? 'Seimbang' : 'Tidak seimbang'}
            note={fs.balance_sheet.is_balanced ? `Per ${fs.balance_sheet.as_of}` : `Selisih ${formatRupiah(fs.balance_sheet.difference)}`}
            tone={fs.balance_sheet.is_balanced ? 'good' : 'bad'} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div role="tablist" aria-label="Jenis laporan" className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl overflow-x-auto text-xs font-bold">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-1.5 rounded-lg cursor-pointer ${tab === t.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          {fs && tab === 'income' && <ExportMenu reportId="fin_income_statement" data={fs} ctx={ctx} />}
          {fs && tab === 'balance' && <ExportMenu reportId="fin_balance_sheet" data={fs} ctx={ctx} />}
          {fs && tab === 'equity' && <ExportMenu reportId="fin_equity_statement" data={fs} ctx={ctx} />}
          {cf && tab === 'cashflow' && <ExportMenu reportId="fin_cash_flow" data={cf} ctx={ctx} />}
          {fs && cf && <ExportMenu reportId="sak_emkm_package" data={{ financials: fs, cashFlow: cf }} ctx={ctx} />}
          {fs && (
            <button type="button" onClick={() => setIsPrintOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          )}
        </div>
      </div>

      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Standar SAK EMKM • {range.label}</p>
      <ServerStatus loading={active.loading && !active.data} error={active.error} onRetry={active.reload} />

      {fs && tab === 'income' && <IncomeStatementTable statement={fs.income_statement} />}
      {fs && tab === 'balance' && <BalanceSheetTables sheet={fs.balance_sheet} />}
      {fs && tab === 'equity' && <EquityChangesTable changes={fs.equity_changes} />}
      {cf && tab === 'cashflow' && <CashFlowStatementTab cashFlow={cf} periodLabel={range.label} />}

      {fs && (
        <FinancialStatementsPrintModal isOpen={isPrintOpen} onClose={() => setIsPrintOpen(false)}
          statements={fs} cashFlow={cf} periodLabel={range.label} />
      )}
    </div>
  );
};
```

Replace `src/modules/accounting/FinancialStatementsScreen.tsx` with:

```tsx
import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { SakEmkmReportTab } from './components/SakEmkmReportTab';

interface FinancialStatementsScreenProps {
  refreshKey?: number;
}

export const FinancialStatementsScreen: React.FC<FinancialStatementsScreenProps> = ({ refreshKey = 0 }) => (
  <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
        <ShieldCheck className="w-4 h-4" />
        <span>Laporan Keuangan • SAK EMKM</span>
      </div>
      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Laporan Keuangan Omah Ban Cabang 3</h1>
      <p className="text-xs text-slate-500 mt-0.5">
        Laba rugi, posisi keuangan, perubahan ekuitas, dan arus kas dihitung server dari jurnal yang sudah dibukukan.
      </p>
    </div>
    <SakEmkmReportTab refreshKey={refreshKey} />
  </div>
);
```

- [ ] **Step 6: Wire the new props**

In `src/modules/accounting/GeneralLedgerScreen.tsx`, replace

```tsx
              <SakEmkmReportTab
                journals={journals}
                initialBalances={initialBalances}
                products={products}
              />
```

with

```tsx
              <SakEmkmReportTab refreshKey={ledgerVersion} />
```

In `src/App.tsx`, replace the whole `<FinancialStatementsScreen ... />` element with:

```tsx
              <FinancialStatementsScreen refreshKey={ledgerVersion} />
```

- [ ] **Step 7: Type check, tests, browser check**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

Browser check: open **Laporan Keuangan**: switch the four tabs and the period picker (month, range, all). The *Posisi Keuangan* banner says "Seimbang"; the *Arus Kas* banner says "Terekonsiliasi"; "Cetak" opens the print preview; each export menu downloads without console errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/accounting/components/StatementParts.tsx src/modules/accounting/components/SakEmkmReportTab.tsx src/modules/accounting/components/CashFlowStatementTab.tsx src/modules/accounting/components/FinancialStatementsPrintModal.tsx src/modules/accounting/FinancialStatementsScreen.tsx src/modules/accounting/GeneralLedgerScreen.tsx src/App.tsx src/shared/export/registry.ts src/shared/export/__tests__/registry.test.ts
git commit -m "feat(accounting): render server-computed sak emkm statements

The income statement, balance sheet, changes in equity and cash flow
come from the server for the chosen period and render every account
generically, so rows always add up. Status badges reflect the real
balance and reconciliation results; exports use the same data.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B4: Server journal list, manual journals and reversal

**Files:**
- Rewrite: `src/modules/accounting/components/JournalTab.tsx`, `src/modules/accounting/components/ManualJournalModal.tsx`
- Modify: `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `accountingApi.journals`, `accountingApi.createManualJournal`, `accountingApi.reverseJournal`, `mapJournalPage`, `ManualJournalPayload` (B1); `useServerData`, `PeriodPicker`, `ServerStatus` (B2).
- Produces: `<JournalTab refreshKey? onOpenManualModal? onReverseJournal?: (journal, reason) => Promise<boolean> />`; `<ManualJournalModal isOpen onClose accounts onSubmit: (payload) => Promise<boolean> />`.
- App handlers: `handleAddManualJournal(payload: ManualJournalPayload): Promise<boolean>`, `handleReverseJournal(journal: JournalEntry, reason: string): Promise<boolean>`.

- [ ] **Step 1: Rewrite the journal tab**

Replace `src/modules/accounting/components/JournalTab.tsx` with:

```tsx
import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Filter, Plus, RotateCcw, Search, X } from 'lucide-react';
import { JournalEntry } from '../../../shared/types';
import { accountingApi, mapJournalPage } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { useServerData } from '../hooks/useServerData';
import { PeriodPicker } from './PeriodPicker';
import { ServerStatus } from './ServerStatus';

interface JournalTabProps {
  refreshKey?: number;
  onOpenManualModal?: () => void;
  onReverseJournal?: (journal: JournalEntry, reason: string) => Promise<boolean>;
}

const TYPE_GROUPS: { id: string; label: string; types: string[] }[] = [
  { id: 'ALL', label: 'Semua', types: [] },
  { id: 'SALE', label: 'Penjualan & DP', types: ['POS_SALE', 'POS_SALE_VOID', 'BOOKING_DP', 'BOOKING_DP_REFUND'] },
  { id: 'PURCHASE', label: 'Pembelian', types: ['PURCHASE'] },
  { id: 'EXPENSE', label: 'Biaya', types: ['EXPENSE', 'VOID_EXPENSE'] },
  { id: 'DEBT', label: 'Bayar Hutang', types: ['DEBT_PAYMENT'] },
  { id: 'RECEIVABLE', label: 'Piutang', types: ['RECEIVABLE_PAYMENT'] },
  { id: 'INVENTORY', label: 'Persediaan', types: ['STOCK_OPNAME', 'STOCK_IMPORT', 'STOCK_RECONCILIATION', 'STOCK_COST_CORRECTION', 'OPENING_BALANCE'] },
  { id: 'ADJUSTMENT', label: 'Penyesuaian', types: ['MANUAL_ADJUSTMENT', 'MANUAL_REVERSAL', 'ACCOUNT_OPENING'] },
  { id: 'CLOSING', label: 'Tutup Buku', types: ['PERIOD_CLOSING', 'PERIOD_REOPEN'] },
];

const TYPE_BADGE: Record<string, string> = {
  MANUAL_ADJUSTMENT: 'PENYESUAIAN',
  MANUAL_REVERSAL: 'PEMBALIK',
  VOID_EXPENSE: 'PEMBALIK',
  POS_SALE_VOID: 'PEMBALIK',
  ACCOUNT_OPENING: 'SALDO AWAL',
  PERIOD_CLOSING: 'JURNAL PENUTUP',
  PERIOD_REOPEN: 'BUKA PERIODE',
};

export const JournalTab: React.FC<JournalTabProps> = ({ refreshKey = 0, onOpenManualModal, onReverseJournal }) => {
  const [period, setPeriod] = useState<PeriodSelection>({ kind: 'month', month: currentMonth() });
  const [groupId, setGroupId] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [journalToReverse, setJournalToReverse] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isReversing, setIsReversing] = useState(false);

  const range = resolvePeriod(period);
  const group = TYPE_GROUPS.find((g) => g.id === groupId) ?? TYPE_GROUPS[0];
  const { data, loading, error, reload } = useServerData(
    () =>
      accountingApi
        .journals({
          start_date: range.start_date,
          end_date: range.end_date,
          types: group.types.join(',') || undefined,
          search: search || undefined,
          page,
          per_page: 25,
        })
        .then(mapJournalPage),
    [range.start_date, range.end_date, groupId, search, page, refreshKey],
  );

  const changePeriod = (value: PeriodSelection) => {
    setPeriod(value);
    setPage(1);
  };
  const changeGroup = (id: string) => {
    setGroupId(id);
    setPage(1);
  };
  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };
  const confirmReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalToReverse || !onReverseJournal || !reversalReason.trim()) return;
    setIsReversing(true);
    const ok = await onReverseJournal(journalToReverse, reversalReason.trim());
    setIsReversing(false);
    if (ok) {
      setJournalToReverse(null);
      setReversalReason('');
    }
  };

  const journals = data?.journals ?? [];

  return (
    <div className="w-full">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-700" />
              <span>Jurnal Umum & Penyesuaian</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Seluruh jurnal yang dibukukan server, termasuk penjualan, pembelian, biaya, penyesuaian, dan tutup buku.</p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu reportId="journal" data={journals} ctx={{ periodLabel: range.label, startDate: range.start_date, endDate: range.end_date }} />
            {onOpenManualModal && (
              <button type="button" onClick={onOpenManualModal}
                className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer">
                <Plus className="w-4 h-4" />
                <span>Jurnal Penyesuaian</span>
              </button>
            )}
          </div>
        </div>

        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Debit (filter)</span>
              <span className="text-base font-black font-mono text-slate-900">{formatRupiah(data.totalDebit)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Kredit (filter)</span>
              <span className="text-base font-black font-mono text-slate-900">{formatRupiah(data.totalCredit)}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Jumlah Jurnal</span>
              <span className="text-base font-black font-mono text-slate-900">{data.total}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPicker value={period} onChange={changePeriod} />
            <form onSubmit={submitSearch} className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                aria-label="Cari jurnal" placeholder="Cari no. jurnal, referensi, atau keterangan lalu Enter…"
                className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </form>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto text-xs" aria-label="Filter jenis jurnal">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" aria-hidden="true" />
            {TYPE_GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => changeGroup(g.id)} aria-pressed={groupId === g.id}
                className={`px-2.5 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer ${
                  groupId === g.id ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <ServerStatus loading={loading && !data} error={error} onRetry={reload} />

        {data && journals.length === 0 && (
          <div className="border border-slate-200 rounded-xl p-10 text-center text-xs text-slate-500 bg-slate-50">
            Tidak ada jurnal untuk filter ini.
          </div>
        )}

        <div className="space-y-3">
          {journals.map((journal) => (
            <div key={journal.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">{journal.journal_number}</span>
                  <span className="text-slate-600 font-bold text-[11px]">{formatDateIndo(journal.date)}</span>
                  <span className="font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">Ref: {journal.ref_doc}</span>
                  {journal.reference_type && TYPE_BADGE[journal.reference_type] && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">{TYPE_BADGE[journal.reference_type]}</span>
                  )}
                  {journal.reversed_by && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Dibalik oleh {journal.reversed_by}</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-slate-500 font-mono">{formatRupiah(journal.total_debit ?? 0)}</span>
                  {journal.created_by_name && <span className="text-[10px] text-slate-400">oleh {journal.created_by_name}</span>}
                  {onReverseJournal && journal.can_reverse && (
                    <button type="button" onClick={() => setJournalToReverse(journal)}
                      className="px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg flex items-center gap-1 cursor-pointer">
                      <RotateCcw className="w-3 h-3 text-rose-600" />
                      <span>Pembalik</span>
                    </button>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <p className="text-xs text-slate-700 font-medium">{journal.description}</p>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[500px] text-xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="py-2 px-3 text-left w-28">Kode Akun</th>
                        <th className="py-2 px-3 text-left">Nama Akun & Keterangan</th>
                        <th className="py-2 px-3 text-right w-32">Debit</th>
                        <th className="py-2 px-3 text-right w-32">Kredit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {journal.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-3 font-bold text-slate-600">{line.account_code}</td>
                          <td className="py-1.5 px-3 font-sans">
                            <span className={`font-semibold ${line.credit > 0 ? 'pl-4 text-slate-700' : 'text-slate-900'}`}>{line.account_name}</span>
                            {line.note && <span className="block text-[10px] text-slate-400 mt-0.5">{line.note}</span>}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-blue-700">{line.debit > 0 ? formatRupiah(line.debit) : '-'}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-emerald-700">{line.credit > 0 ? formatRupiah(line.credit) : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>

        {data && data.lastPage > 1 && (
          <nav aria-label="Halaman jurnal" className="flex items-center justify-between text-xs pt-1">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 font-bold border border-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-40 cursor-pointer">
              <ChevronLeft className="w-3.5 h-3.5" /> Sebelumnya
            </button>
            <span className="text-slate-500">Halaman {data.currentPage} dari {data.lastPage} • {data.total} jurnal</span>
            <button type="button" disabled={page >= data.lastPage} onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 font-bold border border-slate-300 rounded-lg flex items-center gap-1 disabled:opacity-40 cursor-pointer">
              Berikutnya <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </nav>
        )}
      </div>

      {journalToReverse && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setJournalToReverse(null);
          }}>
          <div role="dialog" aria-modal="true" aria-labelledby="reverse-title" className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 id="reverse-title" className="text-sm font-bold">Jurnal Pembalik (Storno)</h2>
                <p className="text-[11px] text-slate-400 font-mono">{journalToReverse.journal_number} • {journalToReverse.ref_doc}</p>
              </div>
              <button type="button" aria-label="Tutup" onClick={() => setJournalToReverse(null)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={confirmReversal} className="p-5 space-y-4 text-xs">
              <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                Jurnal yang sudah dibukukan tidak dihapus. Server membuat jurnal pembalik bertanggal hari ini dengan debit dan kredit ditukar,
                dan mencatat Anda sebagai pembuatnya. Setiap jurnal hanya dapat dibalik satu kali.
              </p>
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">Alasan pembalikan</span>
                <input type="text" required value={reversalReason} onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Contoh: salah kode akun beban"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none" />
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setJournalToReverse(null)} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={isReversing || !reversalReason.trim()}
                  className="px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isReversing ? 'Memproses…' : 'Bukukan Pembalik'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Rewrite the manual journal modal**

Replace `src/modules/accounting/components/ManualJournalModal.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Plus, Scale, Trash2, X } from 'lucide-react';
import { ChartOfAccount, ManualJournalPayload } from '../../../shared/types';
import { localDate } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';

interface ManualJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  onSubmit: (payload: ManualJournalPayload) => Promise<boolean>;
}

/** Akun kontrol hanya berubah lewat dokumen sumbernya (server juga menolaknya). */
const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004'];

type Line = { account_code: string; debit: number; credit: number; note: string };

const emptyLines = (): Line[] => [
  { account_code: '', debit: 0, credit: 0, note: '' },
  { account_code: '', debit: 0, credit: 0, note: '' },
];

const toAmount = (value: string): number => Math.max(0, Number(value) || 0);

export const ManualJournalModal: React.FC<ManualJournalModalProps> = ({ isOpen, onClose, accounts, onSubmit }) => {
  const [date, setDate] = useState(localDate());
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<Line[]>(emptyLines);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset hanya saat modal dibuka; jangan bergantung pada onClose (fungsi baru di setiap render induk).
  useEffect(() => {
    if (!isOpen) return;
    setDate(localDate());
    setDescription('');
    setLines(emptyLines());
    setFormError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const selectable = accounts.filter((a) => !CONTROL_ACCOUNTS.includes(a.account_code));
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = totalDebit > 0 && Math.round(totalDebit * 100) === Math.round(totalCredit * 100);

  const update = (index: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return setFormError('Keterangan jurnal wajib diisi.');
    if (lines.some((l) => !l.account_code)) return setFormError('Pilih akun untuk setiap baris.');
    if (lines.some((l) => (l.debit > 0) === (l.credit > 0))) return setFormError('Setiap baris harus berisi debit atau kredit (salah satu saja).');
    if (!isBalanced) return setFormError(`Jurnal belum seimbang: debit ${formatRupiah(totalDebit)} vs kredit ${formatRupiah(totalCredit)}.`);

    setFormError('');
    setSubmitting(true);
    const ok = await onSubmit({
      date,
      description: description.trim(),
      items: lines.map((l) => ({ account_code: l.account_code, debit: l.debit, credit: l.credit, note: l.note.trim() || undefined })),
    });
    setSubmitting(false);
    if (ok) onClose();
  };

  const field = 'w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="manual-journal-title" className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Scale className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="manual-journal-title" className="text-base font-bold text-slate-900">Jurnal Penyesuaian Manual</h2>
              <p className="text-xs text-slate-500">Nomor jurnal & referensi MEMO dibuat server. Akun piutang, persediaan, hutang, dan DP tidak tersedia.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal</span>
              <input type="date" required value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Keterangan</span>
              <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: koreksi salah akun beban listrik" className={field} />
            </label>
          </div>

          <table className="w-full text-xs border border-slate-200">
            <thead className="bg-slate-50 font-bold text-slate-700">
              <tr>
                <th className="py-2 px-2 text-left">Akun</th>
                <th className="py-2 px-2 text-right w-32">Debit</th>
                <th className="py-2 px-2 text-right w-32">Kredit</th>
                <th className="py-2 px-2 text-left">Catatan baris</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="p-1.5">
                    <select aria-label={`Akun baris ${i + 1}`} value={line.account_code} onChange={(e) => update(i, { account_code: e.target.value })} className={field}>
                      <option value="">Pilih akun…</option>
                      {selectable.map((a) => (
                        <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <input type="number" min={0} step="1" aria-label={`Debit baris ${i + 1}`} value={line.debit || ''}
                      onChange={(e) => update(i, { debit: toAmount(e.target.value) })} className={`${field} text-right font-mono`} />
                  </td>
                  <td className="p-1.5">
                    <input type="number" min={0} step="1" aria-label={`Kredit baris ${i + 1}`} value={line.credit || ''}
                      onChange={(e) => update(i, { credit: toAmount(e.target.value) })} className={`${field} text-right font-mono`} />
                  </td>
                  <td className="p-1.5">
                    <input type="text" aria-label={`Catatan baris ${i + 1}`} value={line.note} onChange={(e) => update(i, { note: e.target.value })} className={field} />
                  </td>
                  <td className="p-1.5 text-center">
                    <button type="button" aria-label={`Hapus baris ${i + 1}`} disabled={lines.length <= 2}
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 font-bold">
              <tr>
                <td className="py-2 px-2">Total</td>
                <td className="py-2 px-2 text-right font-mono">{formatRupiah(totalDebit)}</td>
                <td className="py-2 px-2 text-right font-mono">{formatRupiah(totalCredit)}</td>
                <td colSpan={2} className={`py-2 px-2 ${isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isBalanced ? 'Seimbang' : `Selisih ${formatRupiah(Math.abs(totalDebit - totalCredit))}`}
                </td>
              </tr>
            </tfoot>
          </table>

          <button type="button" onClick={() => setLines((prev) => [...prev, { account_code: '', debit: 0, credit: 0, note: '' }])}
            className="px-3 py-1.5 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah baris</span>
          </button>

          {formError && (
            <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Bukukan Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Wire the screen and App handlers**

In `src/modules/accounting/GeneralLedgerScreen.tsx`:

1. In the `../../shared/types` import, replace `ManualJournalInput` with `ManualJournalPayload`.
2. In `GeneralLedgerScreenProps`, change the two handler types to:

```ts
  onAddManualJournal?: (payload: ManualJournalPayload) => Promise<boolean>;
  onReverseJournal?: (journal: JournalEntry, reason: string) => Promise<boolean>;
```

3. Replace the `journals` tab block with:

```tsx
        {activeTab === 'journals' && (
          <JournalTab
            refreshKey={ledgerVersion}
            onOpenManualModal={() => setIsManualModalOpen(true)}
            onReverseJournal={onReverseJournal}
          />
        )}
```

4. Replace the whole `<ManualJournalModal ... />` element with:

```tsx
      <ManualJournalModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        accounts={accounts}
        onSubmit={(payload) => (onAddManualJournal ? onAddManualJournal(payload) : Promise.resolve(false))}
      />
```

In `src/App.tsx`:

1. In the `./shared/types` import replace `ManualJournalInput,` with `ManualJournalPayload,`. In the `./services/accountingService` import list remove `generateManualJournal,` and `generateReversingJournal`.
2. Replace `handleAddManualJournal` (the whole `// Handle Manual Adjusting Journal` function) with:

```ts
  // Jurnal penyesuaian manual dibukukan server (akun kontrol ditolak server).
  const handleAddManualJournal = async (payload: ManualJournalPayload): Promise<boolean> => {
    try {
      const journal = await accountingApi.createManualJournal(payload);
      mergeServerJournals([journal]);
      payload.items
        .filter((l) => l.account_code === '1-1000')
        .forEach((l) => setCashInDrawer((prev) => Math.max(0, prev + l.debit - l.credit)));
      toast.success('Jurnal Penyesuaian Dibukukan', `${journal.entry_number} tersimpan di server.`);
      return true;
    } catch (err) {
      toast.error('Jurnal Ditolak Server', errorMessage(err));
      return false;
    }
  };
```

3. Replace `handleReverseJournal` (the whole `// Handle Reversing Journal (Koreksi Storno)` function) with:

```ts
  // Storno hanya untuk jurnal penyesuaian manual; transaksi lain dibatalkan dari modul asalnya.
  const handleReverseJournal = async (journal: JournalEntry, reason: string): Promise<boolean> => {
    try {
      const reversal = await accountingApi.reverseJournal(journal.journal_number, reason);
      mergeServerJournals([reversal]);
      toast.info('Jurnal Pembalik Dibukukan', `${reversal.entry_number} membalik ${journal.journal_number}.`);
      return true;
    } catch (err) {
      toast.error('Pembalikan Ditolak', errorMessage(err));
      return false;
    }
  };
```

- [ ] **Step 4: Type check, tests, browser check**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

Browser check: *Jurnal Umum* tab lists server journals for the current month; chips filter by type; search + Enter filters; pagination appears when there are more than 25. Create a manual journal (e.g. `6-1006` debit / `1-1001` credit): the account picker has no 1-1002/1-2000/2-1000/2-1004; after saving, the new journal appears with a "Pembalik" button; reversing it shows "Dibalik oleh JRN-…" and the button disappears. A POS sale journal has no "Pembalik" button.

- [ ] **Step 5: Commit**

```bash
git add src/modules/accounting/components/JournalTab.tsx src/modules/accounting/components/ManualJournalModal.tsx src/modules/accounting/GeneralLedgerScreen.tsx src/App.tsx
git commit -m "feat(accounting): list, post and reverse journals through the server

The journal tab pages through server journals with period, type and
search filters. Manual journals post by account code without control
accounts, and only manual journals can be reversed, once, with the
user recorded by the server.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B5: Period closing, reopening and opening balances in the ledger screen

**Files:**
- Rewrite: `src/modules/accounting/components/PeriodClosingModal.tsx`, `src/modules/accounting/GeneralLedgerScreen.tsx`
- Create: `src/modules/accounting/components/OpeningBalanceModal.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/shared/export/registry.ts` (`period_closing`), `src/App.tsx`

**Interfaces:**
- Consumes: `accountingApi.periods`, `closePeriod`, `reopenPeriod`, `openingBalance`, `postOpeningBalance`, `financialStatements`, types `PeriodClosingRecord`, `OpeningBalanceInput`, `OpeningBalanceAccount`, helpers `monthRange`, `monthLabel`, `localDate`, `previousMonth` (B1); tabs from B2–B4.
- Produces: `<PeriodClosingModal isOpen onClose suggestedPeriod lockDate onConfirm: (period, notes) => Promise<boolean> />`, `<OpeningBalanceModal isOpen onClose onSubmit: (input) => Promise<boolean> />`.
- Produces: final `GeneralLedgerScreenProps` = `{ ledgerVersion: number; accounts: ChartOfAccount[]; payableInvoices: PayableInvoice[]; receivableInvoices: ReceivableInvoice[]; cashInDrawer: number; canReopenPeriod: boolean; onAddManualJournal; onReverseJournal; onClosePeriod: (period: string, notes: string) => Promise<boolean>; onReopenPeriod: (period: string, reason: string) => Promise<boolean>; onPostOpeningBalance: (input: OpeningBalanceInput) => Promise<boolean>; onPayDebt: (input: DebtPaymentInput) => void; onPayReceivable: (input: ReceivablePaymentInput) => void; onNavigateToFinancials?: () => void; initialTab?: AccountingTabKey }`.
- Export registry: `period_closing` takes `PeriodClosingRecord`.

- [ ] **Step 1: Rewrite the period closing modal**

Replace `src/modules/accounting/components/PeriodClosingModal.tsx` with:

```tsx
import React, { useEffect, useState } from 'react';
import { Lock, X } from 'lucide-react';
import { accountingApi } from '../../../services/api';
import { localDate, monthLabel, monthRange } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface PeriodClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  suggestedPeriod: string;
  lockDate: string | null;
  onConfirm: (period: string, notes: string) => Promise<boolean>;
}

export const PeriodClosingModal: React.FC<PeriodClosingModalProps> = ({ isOpen, onClose, suggestedPeriod, lockDate, onConfirm }) => {
  const [period, setPeriod] = useState(suggestedPeriod);
  const [notes, setNotes] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPeriod(suggestedPeriod);
    setNotes('');
    setConfirmed(false);
  }, [isOpen, suggestedPeriod]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const range = monthRange(period);
  const preview = useServerData(
    () => (isOpen ? accountingApi.financialStatements({ start_date: range.start, end_date: range.end }) : Promise.resolve(null)),
    [isOpen, period],
  );

  if (!isOpen) return null;

  const blocker =
    range.end >= localDate()
      ? `${monthLabel(period)} belum berakhir; tutup buku hanya untuk bulan yang sudah lewat.`
      : lockDate !== null && range.end <= lockDate
        ? `Periode ini sudah terkunci (s/d ${formatDateIndo(lockDate)}).`
        : null;
  const statement = preview.data?.income_statement;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || blocker) return;
    setSubmitting(true);
    const ok = await onConfirm(period, notes.trim());
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="closing-title" className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 id="closing-title" className="text-sm font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Tutup Buku Periode</span>
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Bulan yang ditutup</span>
            <input type="month" required value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white" />
          </label>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-bold text-slate-700 block">Laba rugi {monthLabel(period)}</span>
            <ServerStatus loading={preview.loading && !preview.data} error={preview.error} onRetry={preview.reload} />
            {statement && (
              <dl className="grid grid-cols-2 gap-y-1">
                <dt>Pendapatan bersih</dt>
                <dd className="text-right font-mono">{formatRupiah(statement.net_revenue)}</dd>
                <dt>Beban pokok penjualan</dt>
                <dd className="text-right font-mono">({formatRupiah(statement.cost_of_sales.total)})</dd>
                <dt>Beban operasional</dt>
                <dd className="text-right font-mono">({formatRupiah(statement.operating_expenses.total)})</dd>
                <dt className="font-black">Laba (rugi) bersih</dt>
                <dd className="text-right font-mono font-black">{formatRupiah(statement.net_income)}</dd>
              </dl>
            )}
          </div>

          <p className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
            Server membukukan jurnal penutup bertanggal {formatDateIndo(range.end)} yang memindahkan saldo seluruh akun pendapatan dan beban
            sampai tanggal itu ke Laba Ditahan (3-2000), termasuk bulan sebelumnya yang belum ditutup. Setelah itu transaksi bertanggal sampai
            {' '}{formatDateIndo(range.end)} ditolak. Hanya pemilik yang dapat membuka kembali periode terakhir.
          </p>

          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Catatan (opsional)</span>
            <input type="text" maxLength={255} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white" />
          </label>

          {blocker && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">{blocker}</p>}

          <label className="flex items-start gap-2 text-slate-700">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>Saya sudah memeriksa laporan periode ini dan ingin menutupnya.</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={!confirmed || blocker !== null || submitting}
              className="px-4 py-2 font-bold text-white bg-slate-900 hover:bg-black rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Memproses…' : 'Tutup Buku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Add the opening balance modal**

Create `src/modules/accounting/components/OpeningBalanceModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Landmark, X } from 'lucide-react';
import type { OpeningBalanceAccount, OpeningBalanceInput } from '../../../shared/types';
import { localDate } from '../../../services/accountingPeriod';
import { formatRupiah } from '../../../shared/utils/formatters';

interface OpeningBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: OpeningBalanceInput) => Promise<boolean>;
}

const FIELDS: { code: OpeningBalanceAccount; label: string; hint: string; side: 'DEBIT' | 'CREDIT' }[] = [
  { code: '1-1000', label: 'Kas Laci Kasir', hint: 'Uang tunai fisik di laci pada tanggal saldo awal.', side: 'DEBIT' },
  { code: '1-1001', label: 'Bank BCA Cabang 3', hint: 'Saldo rekening koran pada tanggal yang sama.', side: 'DEBIT' },
  { code: '1-3000', label: 'Peralatan & Mesin Spooring', hint: 'Harga perolehan aset tetap.', side: 'DEBIT' },
  { code: '1-3999', label: 'Akumulasi Penyusutan', hint: 'Isi angka positif; mengurangi nilai aset tetap.', side: 'CREDIT' },
  { code: '3-2000', label: 'Laba Ditahan', hint: 'Isi negatif bila akumulasi rugi.', side: 'CREDIT' },
];

/** Saldo awal sekali pakai untuk akun tanpa buku pembantu; selisihnya menjadi Modal Disetor (3-1000). */
export const OpeningBalanceModal: React.FC<OpeningBalanceModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [date, setDate] = useState(localDate());
  const [values, setValues] = useState<Partial<Record<OpeningBalanceAccount, number>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDate(localDate());
    setValues({});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const capital = FIELDS.reduce((sum, f) => sum + (f.side === 'DEBIT' ? 1 : -1) * (values[f.code] ?? 0), 0);
  const hasValue = FIELDS.some((f) => (values[f.code] ?? 0) !== 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasValue) return;
    setSubmitting(true);
    const ok = await onSubmit({ date, balances: values });
    setSubmitting(false);
    if (ok) onClose();
  };

  const field = 'w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-right font-mono';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="opening-title" className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <h2 id="opening-title" className="text-sm font-bold flex items-center gap-2">
            <Landmark className="w-4 h-4 text-amber-400" />
            <span>Saldo Awal Akun</span>
          </h2>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
            Diisi sekali saat mulai memakai sistem. Piutang, persediaan, hutang, dan uang muka DP tidak diisi di sini karena nilainya berasal
            dari dokumen masing-masing (persediaan lewat "Saldo Awal Persediaan" di modul inventori).
          </p>
          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Tanggal saldo awal</span>
            <input type="date" required value={date} max={localDate()} onChange={(e) => setDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl bg-white" />
          </label>
          {FIELDS.map((f) => (
            <label key={f.code} className="block">
              <span className="block font-bold text-slate-700 mb-1">{f.code} — {f.label}</span>
              <input type="number" step="1" min={f.code === '3-2000' ? undefined : 0} value={values[f.code] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [f.code]: e.target.value === '' ? undefined : Number(e.target.value) }))}
                className={field} />
              <span className="block text-[10px] text-slate-500 mt-0.5">{f.hint}</span>
            </label>
          ))}
          <div className={`p-3 rounded-xl border font-bold ${capital >= 0 ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            Modal Disetor (3-1000) dihitung otomatis: {formatRupiah(capital)}
          </div>
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={!hasValue || submitting}
              className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Bukukan Saldo Awal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

In `src/modules/accounting/components/index.ts`, add `export * from './OpeningBalanceModal';`.

- [ ] **Step 3: Export registry — closing record**

In `src/shared/export/registry.ts`, replace `AccountingPeriodInfo,` with `PeriodClosingRecord,` in the type import, and replace `mapPeriodClosing` with:

```ts
const mapPeriodClosing = (p: PeriodClosingRecord, ctx: ExportCtx): ExportDoc =>
  makeDoc('period_closing', 'Penutupan Periode Akuntansi', 'portrait', ctx, [{
    columns: [
      { key: 'label', label: 'Keterangan', type: 'text', width: 34 },
      { key: 'value', label: 'Nilai', type: 'text', width: 26 },
    ],
    rows: [
      { label: 'Periode', value: p.period },
      { label: 'Tanggal Kunci (akhir periode)', value: p.end_date },
      { label: 'Ditutup Pada', value: p.closed_at ?? '-' },
      { label: 'Ditutup Oleh', value: p.closed_by ?? '-' },
      { label: 'No Jurnal Penutup', value: p.closing_entry_number ?? '-' },
      { label: 'Laba Dipindahkan ke Laba Ditahan', value: formatRupiah(p.net_income) },
      { label: 'Catatan', value: p.notes ?? '-' },
      { label: 'Dibuka Kembali', value: p.reopened_at ? `${p.reopened_at} (${p.reopen_reason ?? '-'})` : '-' },
    ],
  }]);
```

- [ ] **Step 4: Rewrite the ledger screen**

Replace `src/modules/accounting/GeneralLedgerScreen.tsx` with:

```tsx
import React, { useState } from 'react';
import {
  BookMarked, BookOpen, CreditCard, ExternalLink, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
} from 'lucide-react';
import {
  ChartOfAccount,
  DebtPaymentInput,
  JournalEntry,
  ManualJournalPayload,
  OpeningBalanceInput,
  PayableInvoice,
  ReceivableInvoice,
  ReceivablePaymentInput,
} from '../../shared/types';
import { accountingApi } from '../../services/api';
import { previousMonth } from '../../services/accountingPeriod';
import { formatDateIndo } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';
import { useServerData } from './hooks/useServerData';
import {
  AccountsPayableTab,
  AccountsReceivableTab,
  GeneralLedgerTab,
  JournalTab,
  ManualJournalModal,
  OpeningBalanceModal,
  PeriodClosingModal,
  SakEmkmReportTab,
  TrialBalanceTab,
} from './components';

export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'receivables' | 'reports';

interface GeneralLedgerScreenProps {
  ledgerVersion: number;
  accounts: ChartOfAccount[];
  payableInvoices: PayableInvoice[];
  receivableInvoices: ReceivableInvoice[];
  cashInDrawer: number;
  canReopenPeriod: boolean;
  onAddManualJournal: (payload: ManualJournalPayload) => Promise<boolean>;
  onReverseJournal: (journal: JournalEntry, reason: string) => Promise<boolean>;
  onClosePeriod: (period: string, notes: string) => Promise<boolean>;
  onReopenPeriod: (period: string, reason: string) => Promise<boolean>;
  onPostOpeningBalance: (input: OpeningBalanceInput) => Promise<boolean>;
  onPayDebt: (input: DebtPaymentInput) => void;
  onPayReceivable: (input: ReceivablePaymentInput) => void;
  onNavigateToFinancials?: () => void;
  initialTab?: AccountingTabKey;
}

const TABS: { id: AccountingTabKey; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'journals', label: '1. Jurnal Umum', icon: BookOpen },
  { id: 'ledger', label: '2. Buku Besar', icon: BookMarked },
  { id: 'trial-balance', label: '3. Neraca Saldo', icon: Scale },
  { id: 'payables', label: '4. Pembantu Hutang', icon: CreditCard },
  { id: 'receivables', label: '5. Pembantu Piutang', icon: Users },
  { id: 'reports', label: '6. Laporan Keuangan', icon: FileText },
];

export const GeneralLedgerScreen: React.FC<GeneralLedgerScreenProps> = ({
  ledgerVersion,
  accounts,
  payableInvoices,
  receivableInvoices,
  cashInDrawer,
  canReopenPeriod,
  onAddManualJournal,
  onReverseJournal,
  onClosePeriod,
  onReopenPeriod,
  onPostOpeningBalance,
  onPayDebt,
  onPayReceivable,
  onNavigateToFinancials,
  initialTab = 'journals',
}) => {
  const [activeTab, setActiveTab] = useState<AccountingTabKey>(initialTab);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isClosingOpen, setIsClosingOpen] = useState(false);
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);

  const periods = useServerData(() => accountingApi.periods(), [ledgerVersion]);
  const opening = useServerData(() => accountingApi.openingBalance(), [ledgerVersion]);

  const lockDate = periods.data?.lock_date ?? null;
  const latestClosing = periods.data?.closings.find((c) => !c.reopened_at) ?? null;
  const badges: Partial<Record<AccountingTabKey, number>> = {
    payables: payableInvoices.filter((i) => i.status !== 'LUNAS').length,
    receivables: receivableInvoices.filter((i) => i.status !== 'LUNAS').length,
  };

  const handleReopen = async () => {
    if (!latestClosing) return;
    const reason = window.prompt(`Alasan membuka kembali periode ${latestClosing.period}:`);
    if (!reason?.trim()) return;
    await onReopenPeriod(latestClosing.period, reason.trim());
  };

  return (
    <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-[#F8FAFC] text-slate-900 space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Buku Kerja Akuntansi • SAK EMKM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Buku Besar & Siklus Akuntansi</h1>
            <p className="text-xs text-slate-500 mt-0.5">Semua angka dihitung server dari jurnal yang sudah dibukukan.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
              <Lock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
              <span className="text-slate-600 font-medium">
                {lockDate ? `Terkunci s/d ${formatDateIndo(lockDate)}` : 'Belum ada periode ditutup'}
              </span>
              <button type="button" onClick={() => setIsClosingOpen(true)}
                className="px-2.5 py-1 text-[11px] font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg cursor-pointer">
                Tutup Buku
              </button>
              {canReopenPeriod && latestClosing && (
                <button type="button" onClick={handleReopen}
                  className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center gap-1 cursor-pointer">
                  <LockOpen className="w-3 h-3" />
                  <span>Buka {latestClosing.period}</span>
                </button>
              )}
              {latestClosing && <ExportMenu reportId="period_closing" data={latestClosing} ctx={{ periodLabel: latestClosing.period }} />}
            </div>

            {opening.data === null && !opening.loading && !opening.error && (
              <button type="button" onClick={() => setIsOpeningOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <Landmark className="w-3.5 h-3.5" />
                <span>Saldo Awal</span>
              </button>
            )}
            {onNavigateToFinancials && (
              <button type="button" onClick={onNavigateToFinancials}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Laporan Keuangan</span>
              </button>
            )}
            <button type="button" onClick={() => setIsManualOpen(true)}
              className="px-3.5 py-2 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer">
              <Plus className="w-4 h-4" />
              <span>Jurnal Penyesuaian</span>
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="Menu akuntansi" className="flex items-center gap-1.5 p-1.5 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto text-xs font-bold">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)}
              className={`px-3 py-2 rounded-lg flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}>
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {(badges[id] ?? 0) > 0 && (
                <span className="px-1.5 rounded-full text-[10px] font-mono bg-amber-100 text-amber-900">{badges[id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-1">
        {activeTab === 'journals' && (
          <JournalTab refreshKey={ledgerVersion} onOpenManualModal={() => setIsManualOpen(true)} onReverseJournal={onReverseJournal} />
        )}
        {activeTab === 'ledger' && <GeneralLedgerTab accounts={accounts} refreshKey={ledgerVersion} />}
        {activeTab === 'trial-balance' && <TrialBalanceTab refreshKey={ledgerVersion} onNavigateToReports={() => setActiveTab('reports')} />}
        {activeTab === 'payables' && <AccountsPayableTab invoices={payableInvoices} cashInDrawer={cashInDrawer} onPayDebt={onPayDebt} />}
        {activeTab === 'receivables' && <AccountsReceivableTab invoices={receivableInvoices} onPayReceivable={onPayReceivable} />}
        {activeTab === 'reports' && <SakEmkmReportTab refreshKey={ledgerVersion} />}
      </div>

      <ManualJournalModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} accounts={accounts} onSubmit={onAddManualJournal} />
      <PeriodClosingModal
        isOpen={isClosingOpen}
        onClose={() => setIsClosingOpen(false)}
        suggestedPeriod={periods.data?.suggested_period ?? previousMonth()}
        lockDate={lockDate}
        onConfirm={onClosePeriod}
      />
      <OpeningBalanceModal isOpen={isOpeningOpen} onClose={() => setIsOpeningOpen(false)} onSubmit={onPostOpeningBalance} />
    </div>
  );
};
```

If `LockOpen` is not exported by the installed `lucide-react`, use `Unlock` instead (same icon, older name).

- [ ] **Step 5: App handlers and props**

In `src/App.tsx`:

1. Add `OpeningBalanceInput,` to the `./shared/types` import. Remove `generateClosingJournal,` from the `./services/accountingService` import list.
2. Replace the whole `handleClosePeriod` function (`// Handle Close Period (Jurnal Penutup Otomatis SAK EMKM)`) with:

```ts
  // Tutup buku di server: jurnal penutup bertanggal akhir bulan + kunci periode.
  const handleClosePeriod = async (period: string, notes: string): Promise<boolean> => {
    try {
      const closing = await accountingApi.closePeriod(period, notes);
      setLedgerVersion((v) => v + 1);
      toast.success('Tutup Buku Berhasil', `Periode ${closing.period} dikunci. Laba ${formatRupiah(closing.net_income)} dipindahkan ke Laba Ditahan.`);
      return true;
    } catch (err) {
      toast.error('Tutup Buku Ditolak', errorMessage(err));
      return false;
    }
  };

  // Hanya pemilik; server menolak peran lain dan periode selain yang terakhir ditutup.
  const handleReopenPeriod = async (period: string, reason: string): Promise<boolean> => {
    try {
      await accountingApi.reopenPeriod(period, reason);
      setLedgerVersion((v) => v + 1);
      toast.warning('Periode Dibuka Kembali', `Periode ${period} dapat menerima transaksi lagi.`);
      return true;
    } catch (err) {
      toast.error('Gagal Membuka Periode', errorMessage(err));
      return false;
    }
  };

  // Saldo awal kas, bank, aset tetap & laba ditahan (sekali); selisihnya menjadi modal disetor.
  const handlePostAccountOpening = async (input: OpeningBalanceInput): Promise<boolean> => {
    try {
      const journal = await accountingApi.postOpeningBalance(input);
      mergeServerJournals([journal]);
      toast.success('Saldo Awal Dibukukan', `${journal.entry_number} mencatat saldo awal akun.`);
      return true;
    } catch (err) {
      toast.error('Saldo Awal Ditolak', errorMessage(err));
      return false;
    }
  };
```

3. Replace the whole `<GeneralLedgerScreen ... />` element with:

```tsx
              <GeneralLedgerScreen
                ledgerVersion={ledgerVersion}
                accounts={accounts}
                payableInvoices={payableInvoices}
                receivableInvoices={receivableInvoices}
                cashInDrawer={cashInDrawer}
                canReopenPeriod={currentUser?.role === 'OWNER'}
                onAddManualJournal={handleAddManualJournal}
                onReverseJournal={handleReverseJournal}
                onClosePeriod={handleClosePeriod}
                onReopenPeriod={handleReopenPeriod}
                onPostOpeningBalance={handlePostAccountOpening}
                onPayDebt={handlePayDebt}
                onPayReceivable={handlePayReceivable}
                onNavigateToFinancials={() => setActiveScreen('financials')}
              />
```

- [ ] **Step 6: Type check, tests, browser check**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

Browser check (owner): the header shows "Belum ada periode ditutup" (or the lock date) and a "Saldo Awal" button while no opening balance exists. Open *Tutup Buku*: the current month shows the "belum berakhir" blocker; the previous month shows its income statement preview. Do not actually close a period on the development database unless you intend to; closing is covered by backend tests.

- [ ] **Step 7: Commit**

```bash
git add src/modules/accounting/components/PeriodClosingModal.tsx src/modules/accounting/components/OpeningBalanceModal.tsx src/modules/accounting/components/index.ts src/modules/accounting/GeneralLedgerScreen.tsx src/shared/export/registry.ts src/App.tsx
git commit -m "feat(accounting): close periods and enter opening balances from the ledger screen

The ledger header shows the server lock date, closes a finished month
with a preview of its result, lets the owner reopen the latest closing,
and offers a one-time opening balance form until one exists.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B6: Expenses through the server

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/modules/expenses/ExpensesScreen.tsx`, `src/modules/expenses/components/ExpenseForm.tsx`, `src/modules/expenses/components/ExpenseDetailModal.tsx`, `src/modules/expenses/components/ExpenseTable.tsx`, `src/modules/expenses/components/ExpenseAnalyticsCard.tsx`

**Interfaces:**
- Consumes: `expenseApi`, `mapExpense`, `expenseFormData`, `ApiExpenseCategory`, `accountingApi.cashBalances`, `CashBalances` (B1).
- Produces (App): state `expenseCategories: ApiExpenseCategory[]`, `cashBalances: CashBalances`; `refreshCashBalances()`; `handleAddExpense(record: ExpenseRecord): Promise<boolean>`; `handleVoidExpense(expense: ExpenseRecord, reason: string): Promise<boolean>`.
- Produces (screens): `ExpensesScreen` props `onAddExpense: (expense: ExpenseRecord) => Promise<boolean>`, `onVoidExpense?: (expense: ExpenseRecord, reason: string) => Promise<boolean>`; `ExpenseDetailModal` prop `onVoidExpense: (expense: ExpenseRecord, reason: string) => Promise<boolean>`.

- [ ] **Step 1: App — load and post expenses on the server**

In `src/App.tsx`:

1. Imports: add `expenseApi, mapExpense, expenseFormData,` to the `./services/api` import, and `import type { ApiExpenseCategory, CashBalances } from './services/api';` next to the existing `import type { ApiJournal, ... } from './services/api';` line (or merge into it). Remove `generateExpenseJournal` from the `./shared/utils/formatters` import (keep `formatRupiah`), remove `generateVoidExpenseJournal,` from the `./services/accountingService` import list, remove `INITIAL_EXPENSES,` from the mock-data import, and remove `insertExpenseToSupabase,` and `updateExpenseStatusInSupabase,` from the supabase import.
2. Replace the `expenses` state initializer (the `useState<ExpenseRecord[]>(() => { ... ob3_expenses ... })` block) with:

```ts
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ApiExpenseCategory[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalances>({ '1-1000': 0, '1-1001': 0 });
```

3. Delete the effect that writes `ob3_expenses` to localStorage, and delete the line `setExpenses((prev) => (prev.length > 0 ? prev : INITIAL_EXPENSES));` in `syncBackend`.
4. Next to `refreshReceivables`, add:

```ts
  /** Saldo buku kas laci & bank hari ini (server). */
  const refreshCashBalances = () => {
    accountingApi.cashBalances().then(setCashBalances).catch(() => {});
  };
```

5. In `loadPosData`, after the accounts loading block from Task B2, add:

```ts
    if (allowed('expenses')) {
      expenseApi.list().then((rows) => setExpenses(rows.map(mapExpense))).catch(() => {});
      expenseApi.categories().then(setExpenseCategories).catch(() => {});
    }
    if (allowed('expenses', 'accounting_hub', 'financial_reports')) refreshCashBalances();
```

6. Replace `handleAddExpense` and `handleVoidExpense` (both whole functions) with:

```ts
  // BKK dibukukan server (nomor, jurnal Dr beban / Cr kas atau bank, lampiran nota).
  const handleAddExpense = async (record: ExpenseRecord): Promise<boolean> => {
    const category = expenseCategories.find((c) => c.name === record.category);
    if (!category) {
      toast.error('Kategori Tidak Dikenal', `Kategori "${record.category}" belum tersedia di server.`);
      return false;
    }
    try {
      const res = await expenseApi.create(expenseFormData(record, category.id));
      setExpenses((prev) => [mapExpense(res.expense), ...prev]);
      mergeServerJournals(res.journals);
      if (record.cash_source.includes('Laci')) setCashInDrawer((prev) => Math.max(0, prev - record.amount));
      toast.success('Beban Toko Dibukukan', `${res.expense.reference} (${record.category}) sebesar ${formatRupiah(record.amount)} tersimpan di server.`);
      return true;
    } catch (err) {
      toast.error('Beban Ditolak Server', errorMessage(err));
      return false;
    }
  };

  // Pembatalan BKK: server membukukan jurnal pembalik yang tertaut ke jurnal asal.
  const handleVoidExpense = async (target: ExpenseRecord, reason: string): Promise<boolean> => {
    try {
      const res = await expenseApi.void(target.id, reason);
      const updated = mapExpense(res.expense);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      mergeServerJournals(res.journals);
      if (target.cash_source.includes('Laci')) setCashInDrawer((prev) => prev + target.amount);
      toast.warning('Pengeluaran Dibatalkan (VOID)', `${updated.reference} dibatalkan; jurnal pembalik dibukukan.`);
      return true;
    } catch (err) {
      toast.error('Pembatalan Ditolak', errorMessage(err));
      return false;
    }
  };
```

7. In `mergeServerJournals`, after `setLedgerVersion((v) => v + 1);`, add `refreshCashBalances();`.
8. In the `<ExpensesScreen` JSX, replace `bankBalance={accountBalances['1-1001'] || 35000000}` with `bankBalance={cashBalances['1-1001']}`.

- [ ] **Step 2: Expenses screen and modals**

In `src/modules/expenses/ExpensesScreen.tsx`:

1. Change the prop types to:

```ts
  onAddExpense: (expense: ExpenseRecord) => Promise<boolean>;
  cashInDrawer: number;
  bankBalance?: number;
  onVoidExpense?: (expense: ExpenseRecord, reason: string) => Promise<boolean>;
```

and change the `bankBalance = 35000000,` default to `bankBalance = 0,`.

2. Replace `handleVoidFromModal` with:

```ts
  const handleVoidFromModal = async (expense: ExpenseRecord, reason: string): Promise<boolean> => {
    if (!onVoidExpense) return false;
    const ok = await onVoidExpense(expense, reason);
    if (ok) {
      setSelectedExpenseForDetail((prev) => (prev && prev.id === expense.id ? { ...prev, status: 'VOID', void_reason: reason } : prev));
    }
    return ok;
  };
```

In `src/modules/expenses/components/ExpenseDetailModal.tsx`:

1. Change the prop type to `onVoidExpense: (expense: ExpenseRecord, reason: string) => Promise<boolean>;`.
2. Delete the line `const [voidedBy, setVoidedBy] = useState('Supervisor - Wahyu');`.
3. Replace `handleConfirmVoid` with:

```ts
  const handleConfirmVoid = async () => {
    if (!voidReason.trim()) {
      setVoidError('Alasan pembatalan biaya wajib diisi untuk audit!');
      return;
    }
    const ok = await onVoidExpense(expense, voidReason.trim());
    if (!ok) return;
    setIsVoidConfirmOpen(false);
    setVoidReason('');
    setVoidError('');
  };
```

4. Delete the "Otorisasi Supervisor" block (the server records the logged-in user):

```tsx
              <div>
                <label className="text-rose-900 font-bold block mb-1">Otorisasi Supervisor:</label>
                <input
                  type="text"
                  value={voidedBy}
                  onChange={(e) => setVoidedBy(e.target.value)}
                  placeholder="Nama manajer atau supervisor pengesah pembatalan..."
                  className="w-full px-3 py-2 bg-white border border-rose-300 rounded-xl text-slate-900 text-xs focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
```

In `src/modules/expenses/components/ExpenseForm.tsx`:

1. Delete `import { EXPENSE_CATEGORY_CONFIG, generateBkkNumber } from '../../../services/accountingService';`, change the formatters import to `import { EXPENSE_CATEGORY_CONFIG, formatRupiah, parseRupiahInput, terbilangRupiah } from '../../../shared/utils/formatters';`, and add `import { localDate } from '../../../services/accountingPeriod';`.
2. Change the prop type to `onAddExpense: (expense: ExpenseRecord) => Promise<boolean>;` and the default `bankBalance = 35000000,` to `bankBalance = 0,`.
3. Replace `const [date, setDate] = useState<string>(new Date().toISOString().substring(0, 10));` with `const [date, setDate] = useState<string>(localDate());`.
4. Replace `const [approvedBy, setApprovedBy] = useState<string>('Kasir - Fani A.');` with `const [isSubmitting, setIsSubmitting] = useState<boolean>(false);`.
5. Delete the two lines `// Auto-calculated next BKK number` and `const nextBkkNumber = generateBkkNumber(existingExpenses, date);`.
6. Change `const handleSubmitExpense = (e: React.FormEvent) => {` to `const handleSubmitExpense = async (e: React.FormEvent) => {` and insert as its first statements after `e.preventDefault();`:

```ts
    if (isSubmitting) return;
```

7. Replace `const bkkRef = generateBkkNumber(existingExpenses, date);` with `const bkkRef = ''; // nomor BKK final dibuat server`.
8. Replace `approved_by: approvedBy.trim() || 'Supervisor - Wahyu',` with `approved_by: '',`.
9. Replace

```ts
    onAddExpense(expenseRecord);
    setIsSuccess(true);
    handleResetForm();
```

with

```ts
    setIsSubmitting(true);
    const saved = await onAddExpense(expenseRecord);
    setIsSubmitting(false);
    if (!saved) return;
    setIsSuccess(true);
    handleResetForm();
```

10. Replace `No. Terbit: {nextBkkNumber}` with `No. BKK: dibuat otomatis oleh server`.
11. Replace the approver input block

```tsx
              <div>
                <label className="text-slate-700 font-bold block mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Diotorisasi / Disetujui Oleh:</span>
                </label>
                <input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Nama manajer atau supervisor yang mengesahkan..."
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-medium focus-ring placeholder:text-slate-400 placeholder:font-light"
                />
              </div>
```

with

```tsx
              <div className="flex items-end">
                <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Penyetuju tercatat otomatis sebagai pengguna yang sedang login.</span>
                </p>
              </div>
```

In `src/modules/expenses/components/ExpenseTable.tsx` and `src/modules/expenses/components/ExpenseAnalyticsCard.tsx`, replace `import { EXPENSE_CATEGORY_CONFIG } from '../../../services/accountingService';` with `import { EXPENSE_CATEGORY_CONFIG } from '../../../shared/utils/formatters';`.

- [ ] **Step 3: Type check, tests, browser check**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

Browser check (owner): *Biaya Toko* lists server expenses; the bank balance comes from the server. Create a cash expense with a photo: the success banner appears, the list shows a `BKK-YYYYMM-####` number, and *Jurnal Umum* (filter "Biaya") shows the journal. Void it with a reason: status becomes VOID and a reversal journal appears. A future date is rejected with the server message in a toast.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/modules/expenses/ExpensesScreen.tsx src/modules/expenses/components/ExpenseForm.tsx src/modules/expenses/components/ExpenseDetailModal.tsx src/modules/expenses/components/ExpenseTable.tsx src/modules/expenses/components/ExpenseAnalyticsCard.tsx
git commit -m "feat(expenses): record and void store expenses on the server

Expenses load from and post to the API with the receipt photo, so the
BKK number, journal and approver come from the server. The bank balance
is the ledger balance, which also removes the double deduction of bank
paid expenses.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task B7: Remove the local accounting path and mock data

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/services/accountingService.ts`
- Modify: `src/shared/utils/formatters.ts`, `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/__tests__/financialsSettingsAudit.test.ts`

**Interfaces:**
- Produces (App): `notifyLedgerChanged(apiJournals: ApiJournal[])` replaces `mergeServerJournals` (bumps `ledgerVersion`, refreshes cash balances); no `journals`, `accountBalances`, or `periodInfo` state.

- [ ] **Step 1: Strip the local journal state from App**

In `src/App.tsx`:

1. Delete the `journals`, `accountBalances` and `periodInfo` `useState` blocks and the three effects that persist `ob3_period_info`, `ob3_journals` and `ob3_account_balances`.
2. In `syncBackend`, delete the block starting with the comment `// Data beban & jurnal masih lokal sampai tahap berikutnya.` (its remaining `setJournals` / `setAccountBalances` lines and the enclosing `if (isMounted) { ... }`).
3. Replace the `mergeServerJournals` function (with its comment) with:

```ts
  /** Server membukukan jurnal: muat ulang laporan akuntansi dan saldo kas/bank. */
  const notifyLedgerChanged = (apiJournals: ApiJournal[]) => {
    if (apiJournals.length === 0) return;
    setLedgerVersion((v) => v + 1);
    refreshCashBalances();
  };
```

then rename every remaining call `mergeServerJournals(` to `notifyLedgerChanged(` (use replace-all in this file).
4. Add, next to the other `useEffect` hooks:

```ts
  // Tahap 4: salinan akuntansi lokal lama (mock + jurnal sesi) tidak dipakai lagi.
  useEffect(() => {
    ['ob3_journals', 'ob3_expenses', 'ob3_account_balances', 'ob3_period_info'].forEach((key) => localStorage.removeItem(key));
  }, []);
```

5. Remove the now-unused imports: `AccountingPeriodInfo`, `ManualJournalInput` (if still present) from the types import; `INITIAL_PERIOD_INFO`, `INITIAL_JOURNALS`, `INITIAL_PAYABLE_INVOICES`, `INITIAL_ACCOUNT_BALANCES` from the mock-data import; the whole `./services/accountingService` import statement; `mapJournal` from the `./services/api` import; `insertJournalToSupabase` from the supabase import.

Run: `grep -n "mergeServerJournals\|setJournals\|accountBalances\|periodInfo\|accountingService\|INITIAL_JOURNALS\|INITIAL_ACCOUNT_BALANCES" src/App.tsx`
Expected: no output.

- [ ] **Step 2: Delete the local accounting service and generator**

Run: `git rm src/services/accountingService.ts`

In `src/shared/utils/formatters.ts`, delete the `generateExpenseJournal` function (from `// Auto-generate double-entry journal for expense record` to its closing `};`) and drop `JournalEntry` from its types import if nothing else uses it.

Run: `grep -rn "accountingService\|generateExpenseJournal\|calculateDynamicSakEmkmFinancials\|calculateCashFlowStatement\|calculateTrialBalance\|calculateAccountLedger\|SAK_EMKM_COA" src`
Expected: matches only in `src/modules/settings/__tests__/financialsSettingsAudit.test.ts` (fixed next).

- [ ] **Step 3: Trim the audit test, types and mock data**

In `src/modules/settings/__tests__/financialsSettingsAudit.test.ts`, delete the two tests `should calculate SAK EMKM Financials correctly with positive sales and gross profit` and `should calculate SAK EMKM Cash Flow Statement correctly`, remove the `accountingService` import, and reduce the mock-data import to `INITIAL_STORE_SETTINGS, INITIAL_TRANSACTIONS`.

In `src/shared/types/index.ts`, delete `interface CashFlowStatementResult`, `interface AccountingPeriodInfo` and `interface ManualJournalInput`.

Run: `grep -rn "INITIAL_JOURNALS\|INITIAL_EXPENSES\|INITIAL_ACCOUNT_BALANCES\|INITIAL_PERIOD_INFO\|INITIAL_RECEIVABLES\|INITIAL_PAYABLE_INVOICES" src tests --include=*.ts --include=*.tsx --include=*.mjs`
Expected: matches only in `src/shared/data/mockData.ts`. Delete each of those six `export const ... = ...;` declarations from `mockData.ts` (from the `export const` line to its closing `];` or `};`), then remove type imports in `mockData.ts` that became unused. If the grep shows another file still using one of them, keep that declaration and mention it in the task report.

- [ ] **Step 4: Full verification**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

Run: `cd backend && composer test`
Expected: all tests pass.

Browser check: clear nothing manually — reload the app while logged in as owner, then confirm `localStorage` no longer holds `ob3_journals`, `ob3_expenses`, `ob3_account_balances`, `ob3_period_info` (e.g. via the page's JavaScript console). Make a POS cash sale, then open *Buku Besar*: the new journal appears in *Jurnal Umum* without reloading, the *Buku Besar* 1-1000 balance and *Laporan Keuangan* reflect it, and the balance sheet still says "Seimbang".

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/shared/utils/formatters.ts src/shared/types/index.ts src/shared/data/mockData.ts src/modules/settings/__tests__/financialsSettingsAudit.test.ts
git commit -m "refactor(accounting): remove the browser-side ledger and mock accounting data

Reports, journals and expenses are now server-owned, so the local
journal list, opening balances, period flag, calculators, generators
and their mock data are deleted, and the old localStorage keys are
cleared once.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git rm` in Step 2 already staged the deleted `src/services/accountingService.ts`.)

---

# Part C — Documentation

### Task C1: Update the agent docs to the new source of truth

**Files:**
- Modify: `AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`

- [ ] **Step 1: AGENTS.md migration table**

Replace the two rows

```
| Expenses, manual journals, journal reversal, period closing | **Client** (localStorage) | next stage |
| Financial reports (ledger, trial balance, statements, cash flow) | **Client**, computed from the local journal list | next stage |
```

with

```
| Expenses, manual journals, journal reversal, account opening balances, period closing & lock | Server | 4 (done) |
| Financial reports (journals, ledger, trial balance, statements, equity changes, cash flow) | Server, computed per period | 4 (done) |
```

In the "Cash drawer balance, account opening balances, …" row, remove "account opening balances, ". Replace the paragraph that starts "The server journals are copied into the local journal list only when…" with:

```
Accounting components fetch their own server data (`useServerData`) keyed by the chosen period and by
`ledgerVersion`, which `App.tsx` increments through `notifyLedgerChanged` whenever a server action returns journals.
The cash drawer counter `ob3_cash_drawer` is still client-side (roadmap sub-project 2).
```

In "Rules that must not break", append to rule 1: "`createEntry` also rejects lines that are negative, two-sided or fewer than two, and any date on or before the period lock date (`PeriodLock`)."

- [ ] **Step 2: docs/ai/domain-accounting.md**

- In the COA section, replace the paragraph starting "The frontend keeps its own copy, `SAK_EMKM_COA`…" with: "The frontend has no COA copy; it loads `GET /accounts`. A new account needs only the migration and the seeder."
- Posting mechanics: replace the `createEntry` bullet with the Stage 4 rules (strict cents, ≥2 one-sided non-negative lines, `PeriodLock::assertOpen`, `DocumentNumber::next('JRN', $date)` with lock, `created_by`, `reversal_of_id`; `AccountingUnbalancedException` renders 422).
- Add `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`, `ACCOUNT_OPENING` to the `reference_type` list.
- Posting rules table: update the Expense row (`Accounting/ExpenseService`, now used by the UI; void posts `VOID_EXPENSE` linked by `reversal_of_id`) and the Manual journal row (`Accounting/ManualJournalService`; control accounts 1-1002, 1-2000, 2-1000, 2-1004 rejected; only manual journals reversible, once). Add rows for Period closing (Dr/Cr every REVENUE/EXPENSE balance ≤ month end vs 3-2000, dated month end, then locked; reopen = mirrored `PERIOD_REOPEN`, OWNER only) and Account opening (`ACCOUNT_OPENING`, once, 1-1000/1-1001/1-3000/1-3999/3-2000 vs 3-1000).
- Replace the whole "What the UI actually uses" section with a short "Reports" section describing `LedgerBalances`, `FinancialReportService` (COA-driven sections, income statement excludes closing entries, balance sheet includes unclosed earnings), `CashFlowReport` (direct method, buckets, reconciliation) and the frontend `useServerData` + `ledgerVersion` flow.
- Known issues: delete items 1–7 (fixed) and item 8's JRN/BKK part; keep a note that `GR-`, `OB3-INV-`, `BK-`, `OPN-` numbers still use `now()` for the month. Add: "`ob3_cash_drawer` still differs from the 1-1000 balance (roadmap sub-project 2)."

- [ ] **Step 3: docs/ai/api-reference.md, data-model.md, architecture.md, workflow-and-gotchas.md**

- api-reference.md: add every endpoint from the spec's API table with its permission keys and payloads; mark `accountingApi`/`expenseApi` as used; note `GET accounts` permissions.
- data-model.md: add `accounting_period_closings`, the `journal_entries.created_by` / `reversal_of_id` columns, the `expenses` void audit columns, and the seeded expense categories.
- architecture.md: remove `ob3_journals`, `ob3_expenses`, `ob3_account_balances`, `ob3_period_info` from the localStorage list; describe `useServerData` and `ledgerVersion`; drop "(unused)" from `expenseApi` / `accountingApi`; remove the duplicate-journal-generator note.
- workflow-and-gotchas.md: add Stage 4 (2026-09-29, accounting core) to the spec/plan status table; update the timezone gotcha (server is now `Asia/Jakarta`; frontend uses `localDate()`); update the frontend test count after running `npm test`.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/ai/domain-accounting.md docs/ai/api-reference.md docs/ai/data-model.md docs/ai/architecture.md docs/ai/workflow-and-gotchas.md
git commit -m "docs(accounting): document the server-owned accounting core

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes (for the executor)

- Spec coverage: engine rules & lock (A1), COA-driven reports incl. equity changes (A2), cash flow (A3), closing/reopen (A4), expenses (A5), manual journals & reversal & journal filters & accounts permission (A6), opening balances (A7); frontend API/mappers/period helpers (B1), ledger + trial balance (B2), statements/cash flow/print/export (B3), journals + manual + storno (B4), closing/opening UI (B5), expenses (B6), removal of local path + one-time localStorage cleanup (B7), docs (C1).
- Out of scope by design (roadmap): cash drawer vs 1-1000, returns/write-offs, FIFO shortfall, depreciation & real CALK content, dashboard, QRIS hardening, and the uncommitted purchase invoice calculator.
