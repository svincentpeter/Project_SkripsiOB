# SAK EMKM Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fixed asset register with monthly straight-line depreciation (required before period close), a server-built CALK shown in the UI and exports, adjusting entries for accruals/prepayments with optional auto-reversal, and bank reconciliation for 1-1001.

**Architecture:** Backend first. B1 adds the five allocated accounts, the two permission keys, the fixed-asset control accounts and the cash-flow buckets. B2 builds the asset register (tables, acquisition/void journals), B3 the depreciation run and the period-close gate, B4 the adjusting-entry endpoint, B5 bank reconciliation (tables, CSV import, matching, charge/interest postings, report), B6 the CALK endpoint. Frontend next: F1 permissions/types/API client/journal filters, F2 the Aset Tetap tab, F3 the AJP modal, F4 the Rekonsiliasi Bank tab + export, F5 the CALK tab + exports. D1 updates the docs; M1 is a manual browser check by the user.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-sak-emkm-completeness-design.md` (read it first; decisions D1–D21 are referenced below).

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md` and the spec before starting.
- **This plan executes after SP6 (payment hardening), SP2 (cash & bank) and SP3 (transaction corrections)** have been committed. Those plans edit some of the same shared files first (`backend/app/Support/Permissions.php`, `backend/routes/api.php`, `backend/database/seeders/AccountCoaSeeder.php`, `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/services/authNavigationService.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/shared/export/registry.ts` and its test, `src/App.tsx`, docs). Every edit below names an anchor. **If an anchor no longer matches exactly because an earlier sub-project changed that line, re-read the file and apply the same intent: add our lines, keep every line the earlier sub-project added, never revert it.** Counts in tests (permission keys, export reports, COA size) are written as "current value + N".
- **Never stage, modify or revert the user's untracked `docs/flowchart_local/` or the modified `docs/flowchart/*` files.** Run `git status --short` before each commit: only the task's files may be staged. Stage files **by explicit path**; never `git add -A`, `git add .` or `git commit -a`.
- Execute tasks in order B1 → B2 → B3 → B4 → B5 → B6 → F1 → F2 → F3 → F4 → F5 → D1; M1 is run by the user only. Later tasks edit files exactly as earlier tasks left them (for example B3 adds routes inside the route block B2 created).
- Commits go directly on `main`: Conventional Commits with a scope, in English, lowercase imperative subject, a short body explaining why, and the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- All user-facing text (UI, validation and error messages) is Indonesian.
- Journals are only written through `AccountingEngine::createEntry` (directly or via `JournalDraft`). Never insert `journal_entries`/`journal_items` by hand.
- Business-rule violations throw `App\Exceptions\PosRuleException` (422). API envelope `{ "success": true, "message"?: "...", "data": ... }`; create returns 201.
- New backend test classes use `Illuminate\Foundation\Testing\DatabaseTransactions`. Never name a test helper `post()` (it collides with Laravel's `TestCase::post()`); use names like `postJournal()`, `runPeriod()`. Test data are dated in 2019 so they cannot collide with other tests' rows.
- Every new protected endpoint gets a 403 test for a role without the key (`actingAsRole('KASIR')`).
- Laragon MySQL must be running for backend tests (`phpunit.xml` targets MySQL `project-skripsi_ob_testing`).
- After adding a migration, migrate the testing DB before running tests: Git Bash `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force`; PowerShell `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`. All three migrations in this plan are additive, so **also migrate the dev DB**: `cd backend && php artisan migrate --force`.
- Gates: backend tasks end with `cd backend && php artisan config:clear && php artisan test` passing (`composer test` is broken locally: the bundled composer.phar is too old); frontend tasks end with `npm run lint && npm test` passing (repo root). `tsc` does not flag unused imports.
- Frontend business dates use `localDate()` / `currentMonth()` from `src/services/accountingPeriod.ts`, never `toISOString()`.
- New frontend types go in `src/shared/types/sakEmkm.ts` and are imported from there directly; the API client is `src/services/api/sakEmkmApi.ts` (spec D20).
- Commands below use Git Bash syntax from the repo root `C:\laragon\www\Project_SkripsiOB` unless a `cd` is shown.

## File Map

Backend (create):
- `backend/database/migrations/2026_10_04_000001_add_sak_emkm_accounts.php` — 6-1011, 1-1100, 2-1100, 6-1012, 4-3000 (B1)
- `backend/database/migrations/2026_10_04_000002_create_fixed_assets_tables.php` — `fixed_assets`, `fixed_asset_depreciations` (B2)
- `backend/database/migrations/2026_10_04_000003_create_bank_reconciliation_tables.php` — `bank_statement_lines`, `bank_reconciliations` (B5)
- `backend/app/Models/FixedAsset.php`, `backend/app/Models/FixedAssetDepreciation.php` (B2)
- `backend/app/Models/BankStatementLine.php`, `backend/app/Models/BankReconciliation.php` (B5)
- `backend/app/Services/Accounting/FixedAssetService.php` (B2), `DepreciationService.php` (B3), `AdjustingEntryService.php` (B4), `BankReconciliationService.php` (B5), `CalkReport.php` (B6)
- `backend/app/Http/Requests/FixedAssetRequest.php` (B2)
- `backend/app/Http/Controllers/Api/v1/FixedAssetController.php` (B2, B3), `AdjustingEntryController.php` (B4), `BankReconciliationController.php` (B5), `CalkController.php` (B6)
- Tests: `backend/tests/Feature/SakEmkmFoundationTest.php` (B1), `FixedAssetApiTest.php` (B2), `DepreciationTest.php` (B3), `AdjustingEntryApiTest.php` (B4), `BankReconciliationApiTest.php` (B5), `CalkReportTest.php` (B6)

Backend (modify): `database/seeders/AccountCoaSeeder.php`, `app/Support/Permissions.php`, `app/Services/Accounting/ManualJournalService.php`, `app/Http/Requests/ManualJournalRequest.php`, `app/Services/Accounting/CashFlowReport.php`, `tests/Unit/UserPermissionTest.php` (B1); `routes/api.php` (B2–B6); `app/Services/Accounting/PeriodClosingService.php` (B3).

Frontend (create):
- `src/shared/types/sakEmkm.ts`, `src/services/api/sakEmkmApi.ts`, `src/services/__tests__/sakEmkmApi.test.ts` (F1)
- `src/modules/accounting/components/FixedAssetModal.tsx`, `FixedAssetsTab.tsx` (F2), `AdjustingEntryModal.tsx` (F3), `BankReconciliationTab.tsx` (F4), `CalkView.tsx` (F5)

Frontend (modify): `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/services/authNavigationService.ts`, `src/services/__tests__/authNavigationService.test.ts`, `src/services/api/index.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/modules/accounting/components/ManualJournalModal.tsx` (F1); `src/modules/accounting/components/index.ts`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/modules/accounting/components/PeriodClosingModal.tsx`, `src/App.tsx` (F2, F4); `GeneralLedgerScreen.tsx` (F3); `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts` (F4, F5); `src/modules/accounting/components/SakEmkmReportTab.tsx` (F5).

Docs (modify, Task D1): `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`.

Not touched: `README.md`, `docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md`, older specs/plans, `FinancialReportService.php` (new accounts classify themselves), e2e scripts.

---

# Part B — Backend

### Task B1: Accounts, permission keys, fixed-asset control accounts and cash-flow buckets

**Files:**
- Create: `backend/database/migrations/2026_10_04_000001_add_sak_emkm_accounts.php`, `backend/tests/Feature/SakEmkmFoundationTest.php`
- Modify: `backend/database/seeders/AccountCoaSeeder.php`, `backend/app/Support/Permissions.php`, `backend/app/Services/Accounting/ManualJournalService.php`, `backend/app/Http/Requests/ManualJournalRequest.php`, `backend/app/Services/Accounting/CashFlowReport.php`, `backend/tests/Unit/UserPermissionTest.php`

**Interfaces:**
- Produces: accounts `6-1011`, `1-1100`, `2-1100`, `6-1012`, `4-3000` (active); permission keys `fixed_assets`, `bank_reconciliation` (KASIR/GUDANG false); `ManualJournalService::CONTROL_ACCOUNTS` includes `1-3000`, `1-3999`; `CashFlowReport` puts 4-3000 in `other` and 1-1100/2-1100 in `expenses`.
- Consumes: nothing new.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/SakEmkmFoundationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\RolePermission;
use App\Services\Accounting\CashFlowReport;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Fondasi SP4: akun baru SAK EMKM, kunci izin, akun kontrol aset tetap, dan kelompok arus kas.
 */
class SakEmkmFoundationTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), 'TEST', 'SAK-'.uniqid(), 'Uji fondasi SAK EMKM', $date);
    }

    public function test_new_accounts_exist_with_the_right_type_and_side(): void
    {
        $accounts = Account::whereIn('account_code', ['1-1100', '2-1100', '4-3000', '6-1011', '6-1012'])->get()->keyBy('account_code');

        $this->assertCount(5, $accounts);
        $this->assertSame(['ASSET', 'DEBIT'], [$accounts['1-1100']->account_type, $accounts['1-1100']->normal_balance]);
        $this->assertSame(['LIABILITY', 'CREDIT'], [$accounts['2-1100']->account_type, $accounts['2-1100']->normal_balance]);
        $this->assertSame(['REVENUE', 'CREDIT'], [$accounts['4-3000']->account_type, $accounts['4-3000']->normal_balance]);
        $this->assertSame(['EXPENSE', 'DEBIT'], [$accounts['6-1011']->account_type, $accounts['6-1011']->normal_balance]);
        $this->assertSame(['EXPENSE', 'DEBIT'], [$accounts['6-1012']->account_type, $accounts['6-1012']->normal_balance]);
        $this->assertTrue($accounts->every(fn (Account $a) => $a->is_active));
    }

    public function test_new_permission_keys_are_owner_only_by_default(): void
    {
        $matrix = RolePermission::configMatrix();
        foreach (['KASIR', 'GUDANG'] as $role) {
            $this->assertFalse($matrix[$role]['fixed_assets']);
            $this->assertFalse($matrix[$role]['bank_reconciliation']);
        }

        $owner = $this->actingAsRole('OWNER');
        $this->assertTrue($owner->hasPermission('fixed_assets'));
        $this->assertTrue($owner->hasPermission('bank_reconciliation'));
    }

    public function test_manual_journal_rejects_fixed_asset_control_accounts(): void
    {
        foreach (['1-3000', '1-3999'] as $code) {
            $this->postJson('/api/v1/accounting/journals/manual', [
                'date' => '2019-03-01',
                'description' => 'Koreksi aset tetap',
                'items' => [
                    ['account_code' => $code, 'debit' => 100000, 'credit' => 0],
                    ['account_code' => '3-1000', 'debit' => 0, 'credit' => 100000],
                ],
            ])->assertStatus(422)->assertJsonValidationErrors('items.0.account_code');
        }
    }

    public function test_cash_flow_classifies_bank_interest_prepayments_and_accruals(): void
    {
        $this->postJournal('2019-03-05', [['1-1001', 10000, 0], ['4-3000', 0, 10000]]);
        $this->postJournal('2019-03-06', [['6-1012', 2500, 0], ['1-1001', 0, 2500]]);
        $this->postJournal('2019-03-07', [['1-1100', 60000, 0], ['1-1000', 0, 60000]]);
        $this->postJournal('2019-03-08', [['2-1100', 40000, 0], ['1-1000', 0, 40000]]);

        $report = app(CashFlowReport::class)->build('2019-03-01', '2019-03-31');

        $this->assertEquals(10000, $report['operating']['other']);
        $this->assertEquals(-102500, $report['operating']['expenses']);
        $this->assertEquals(0, $report['operating']['customers']);
        $this->assertTrue($report['is_reconciled']);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=SakEmkmFoundationTest`
Expected: FAIL — only 0 of the 5 accounts exist, `fixed_assets` is an undefined index, the manual journal with 1-3000 is accepted (201), and `JournalDraft` throws "Akun 4-3000 belum ada di bagan akun (COA)".

- [ ] **Step 3: Add the accounts (migration + seeder)**

Create `backend/database/migrations/2026_10_04_000001_add_sak_emkm_accounts.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Akun SAK EMKM untuk penyusutan aset tetap, jurnal penyesuaian (akrual & dibayar di muka) dan
 * rekonsiliasi bank (biaya administrasi & bunga). Disisipkan bila belum ada (kode dicadangkan SP4).
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '1-1100', 'account_name' => 'Beban Dibayar di Muka', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
        ['account_code' => '2-1100', 'account_name' => 'Beban Yang Masih Harus Dibayar', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
        ['account_code' => '4-3000', 'account_name' => 'Pendapatan Bunga Bank', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
        ['account_code' => '6-1011', 'account_name' => 'Beban Penyusutan Aset Tetap', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
        ['account_code' => '6-1012', 'account_name' => 'Beban Administrasi Bank', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
    ];

    public function up(): void
    {
        $existing = DB::table('accounts')->pluck('account_code')->all();
        foreach (self::ACCOUNTS as $account) {
            if (! in_array($account['account_code'], $existing, true)) {
                DB::table('accounts')->insert($account + ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    public function down(): void
    {
        // Akun yang sudah dipakai jurnal tidak boleh dihapus; hanya hapus yang belum pernah dipakai.
        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
```

In `backend/database/seeders/AccountCoaSeeder.php`, anchor on the 6-1009 row (SP6 may have renamed its account name; match the row by its code) and add our five rows after it. Replace:

```php
            ['account_code' => '6-1009', 'account_name' => 'Beban MDR QRIS & EDC', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
```

with:

```php
            ['account_code' => '6-1009', 'account_name' => 'Beban MDR QRIS & EDC', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            // SP4 SAK EMKM: penyusutan, akrual/dibayar di muka, biaya & bunga bank.
            ['account_code' => '1-1100', 'account_name' => 'Beban Dibayar di Muka', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
            ['account_code' => '2-1100', 'account_name' => 'Beban Yang Masih Harus Dibayar', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
            ['account_code' => '4-3000', 'account_name' => 'Pendapatan Bunga Bank', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
            ['account_code' => '6-1011', 'account_name' => 'Beban Penyusutan Aset Tetap', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1012', 'account_name' => 'Beban Administrasi Bank', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
```

(Keep whatever `account_name` the 6-1009 row has at that point, and keep any rows SP2/SP3 added after it.)

- [ ] **Step 4: Add the permission keys**

In `backend/app/Support/Permissions.php`, append `'fixed_assets', 'bank_reconciliation'` to `KEYS`. On the pre-SP2 base the edit is: replace

```php
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];
```

with

```php
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
        'fixed_assets', 'bank_reconciliation',
    ];
```

If SP2/SP3 already appended keys (for example `cash_session`, `sales_return`), add our line as the last line of the array, after theirs. Do **not** add the keys to `DEFAULTS` (absent = false for KASIR and GUDANG; `RolePermissionSeeder` creates the rows with `allowed = false`).

- [ ] **Step 5: Make 1-3000 and 1-3999 control accounts**

In `backend/app/Services/Accounting/ManualJournalService.php` replace:

```php
    public const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004'];
```

with:

```php
    /** 1-3000/1-3999 hanya berubah lewat register aset tetap (perolehan, pembatalan, penyusutan) atau saldo awal akun. */
    public const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004', '1-3000', '1-3999'];
```

In `backend/app/Http/Requests/ManualJournalRequest.php` replace:

```php
            'items.*.account_code.not_in' => 'Akun kontrol (piutang, persediaan, hutang, uang muka DP) hanya berubah lewat transaksi sumbernya, bukan jurnal manual.',
```

with:

```php
            'items.*.account_code.not_in' => 'Akun kontrol (piutang, persediaan, hutang, uang muka DP, aset tetap dan akumulasi penyusutan) hanya berubah lewat transaksi sumbernya, bukan jurnal manual.',
```

- [ ] **Step 6: Classify the new accounts in the cash-flow report**

In `backend/app/Services/Accounting/CashFlowReport.php`, inside `bucket()`, replace the single line:

```php
        return match (true) {
```

with:

```php
        return match (true) {
            // Bunga bank = arus kas operasi lain; bayar di muka & pelunasan akrual = pembayaran beban (SP4).
            $code === '4-3000' => 'other_operating',
            in_array($code, ['1-1100', '2-1100'], true) => 'expenses',
```

(The arms below it, including any that SP2/SP3 added, stay unchanged; our two arms must stay first so 4-3000 is not caught by the `REVENUE` arm.)

- [ ] **Step 7: Count permission keys from the source of truth**

In `backend/tests/Unit/UserPermissionTest.php`, in `test_auth_array_exposes_permission_map_without_password`, replace the line `        $this->assertCount(13, $data['permissions']);` (the number may already be 16 or 18 after SP2/SP3; replace that line whatever its number) with:

```php
        $this->assertCount(count(\App\Support\Permissions::KEYS), $data['permissions']);
        $this->assertFalse($data['permissions']['fixed_assets']);
        $this->assertFalse($data['permissions']['bank_reconciliation']);
```

- [ ] **Step 8: Migrate both databases and run the tests**

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force
php artisan config:clear && php artisan test --filter='SakEmkmFoundationTest|UserPermissionTest|ManualJournalApiTest|CashFlowReportTest'
```

Expected: the migration `2026_10_04_000001_add_sak_emkm_accounts` runs on both DBs; all listed tests PASS.

- [ ] **Step 9: Run the full backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests PASS (previous count + 4).

- [ ] **Step 10: Commit**

```bash
git status --short
git add backend/database/migrations/2026_10_04_000001_add_sak_emkm_accounts.php \
        backend/database/seeders/AccountCoaSeeder.php \
        backend/app/Support/Permissions.php \
        backend/app/Services/Accounting/ManualJournalService.php \
        backend/app/Http/Requests/ManualJournalRequest.php \
        backend/app/Services/Accounting/CashFlowReport.php \
        backend/tests/Feature/SakEmkmFoundationTest.php \
        backend/tests/Unit/UserPermissionTest.php
git commit -m "$(cat <<'EOF'
feat(accounting): add sak emkm accounts, permissions and control accounts

Depreciation, accruals, prepayments and bank charges/interest need their
own accounts; fixed assets become control accounts so the upcoming asset
register always equals the ledger, and the cash-flow report classifies
interest, prepayments and accrual settlements as operating flows.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B2: Fixed asset register (acquisition and void)

**Files:**
- Create: `backend/database/migrations/2026_10_04_000002_create_fixed_assets_tables.php`, `backend/app/Models/FixedAsset.php`, `backend/app/Models/FixedAssetDepreciation.php`, `backend/app/Services/Accounting/FixedAssetService.php`, `backend/app/Http/Requests/FixedAssetRequest.php`, `backend/app/Http/Controllers/Api/v1/FixedAssetController.php`, `backend/tests/Feature/FixedAssetApiTest.php`
- Modify: `backend/routes/api.php`

**Interfaces:**
- Consumes: accounts 1-3000, 1-3999, 1-1000, 1-1001 (seeded), permission `fixed_assets` (B1).
- Produces:
  - Tables `fixed_assets` (`code` `AT-YYYYMM-####`, `name`, `category`, `acquisition_date`, `acquisition_cost`, `residual_value`, `useful_life_months`, `depreciation_start` char(7) `YYYY-MM`, `opening_accumulated_depreciation`, `funding` TUNAI|TRANSFER|OPENING, `journal_entry_number`, `status` ACTIVE|VOID, `notes`, `void_reason`, `voided_by`, `voided_at`, `created_by`, `branch_id`) and `fixed_asset_depreciations` (`fixed_asset_id`, `period` char(7), `amount`, `journal_entry_id`).
  - `App\Models\FixedAsset`: `CATEGORIES` (code → label), `FUNDING`, `depreciations(): HasMany`, `baseCents(): int`, `expectedCentsThrough(string $period): int`, `static monthsBetween(string $start, string $period): int` (inclusive), `static cents(mixed $amount): int`, `accumulatedDepreciation(): float`, `toApiArray(): array`.
  - `App\Models\FixedAssetDepreciation` (fillable `fixed_asset_id`, `period`, `amount`, `journal_entry_id`).
  - `App\Services\Accounting\FixedAssetService`: consts `ASSET_ACCOUNT = '1-3000'`, `ACCUMULATED_ACCOUNT = '1-3999'`, `ACQUISITION = 'FIXED_ASSET_ACQUISITION'`, `VOID = 'FIXED_ASSET_VOID'`; `create(array $data, User $user): array{asset, journal: ?JournalEntry}`; `void(int $id, string $reason, User $user): array{asset, journal: ?JournalEntry}`; `static summary(Collection $assets): array`; `static lockRegister(): void`.
  - Routes block `// SAK EMKM: …` in `routes/api.php` with `Route::prefix('accounting/fixed-assets')->middleware('permission:fixed_assets')->group(...)`: `GET /`, `POST /`, `POST {id}/void`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/FixedAssetApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\FixedAssetDepreciation;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FixedAssetApiTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/accounting/fixed-assets';

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Mesin Spooring Hunter',
            'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2019-01-15',
            'acquisition_cost' => 12000000,
            'residual_value' => 0,
            'useful_life_months' => 48,
            'funding' => 'TUNAI',
        ], $overrides);
    }

    private function openingPayload(array $overrides = []): array
    {
        return $this->payload(array_merge([
            'name' => 'Mesin Balancing Lama',
            'acquisition_date' => '2017-06-01',
            'acquisition_cost' => 10000000,
            'residual_value' => 1000000,
            'useful_life_months' => 24,
            'funding' => 'OPENING',
            'depreciation_start' => '2019-02',
            'opening_accumulated_depreciation' => 3000000,
        ], $overrides));
    }

    private function line(array $journal, string $code): array
    {
        return collect($journal['lines'])->firstWhere('account_code', $code);
    }

    public function test_cash_purchase_posts_the_acquisition_journal(): void
    {
        $res = $this->postJson(self::URL, $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.asset.depreciation_start', '2019-01')
            ->assertJsonPath('data.asset.status', 'ACTIVE')
            ->assertJsonPath('data.asset.book_value', 12000000)
            ->assertJsonPath('data.asset.monthly_depreciation', 250000)
            ->assertJsonPath('data.journals.0.reference_type', 'FIXED_ASSET_ACQUISITION')
            ->assertJsonPath('data.journals.0.entry_date', '2019-01-15');

        $this->assertStringStartsWith('AT-201901-', $res->json('data.asset.code'));
        $journal = $res->json('data.journals.0');
        $this->assertEquals(12000000, $this->line($journal, '1-3000')['debit']);
        $this->assertEquals(12000000, $this->line($journal, '1-1000')['credit']);
        $this->assertSame($journal['entry_number'], $res->json('data.asset.journal_entry_number'));
    }

    public function test_transfer_purchase_credits_the_bank(): void
    {
        $journal = $this->postJson(self::URL, $this->payload(['funding' => 'TRANSFER']))->assertCreated()->json('data.journals.0');

        $this->assertEquals(12000000, $this->line($journal, '1-1001')['credit']);
    }

    public function test_opening_asset_posts_no_journal_and_keeps_prior_accumulation(): void
    {
        $this->postJson(self::URL, $this->openingPayload())
            ->assertCreated()
            ->assertJsonPath('data.journals', [])
            ->assertJsonPath('data.asset.journal_entry_number', null)
            ->assertJsonPath('data.asset.depreciation_start', '2019-02')
            ->assertJsonPath('data.asset.accumulated_depreciation', 3000000)
            ->assertJsonPath('data.asset.book_value', 7000000)
            ->assertJsonPath('data.asset.monthly_depreciation', 250000);
    }

    public function test_invalid_assets_are_rejected(): void
    {
        $this->postJson(self::URL, $this->openingPayload(['opening_accumulated_depreciation' => 9500000]))
            ->assertStatus(422)->assertJsonValidationErrors('residual_value');
        $this->postJson(self::URL, $this->payload(['depreciation_start' => '2019-01']))
            ->assertStatus(422)->assertJsonValidationErrors('depreciation_start');
        $this->postJson(self::URL, $this->openingPayload(['depreciation_start' => null]))
            ->assertStatus(422)->assertJsonValidationErrors('depreciation_start');
        $this->postJson(self::URL, $this->openingPayload(['depreciation_start' => '2017-05']))
            ->assertStatus(422)->assertJsonValidationErrors('depreciation_start');
        $this->postJson(self::URL, $this->payload(['acquisition_date' => now()->addDay()->toDateString()]))
            ->assertStatus(422)->assertJsonValidationErrors('acquisition_date');
        $this->postJson(self::URL, $this->payload(['category' => 'TANAH', 'useful_life_months' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors(['category', 'useful_life_months']);
    }

    public function test_void_mirrors_the_acquisition_once(): void
    {
        $created = $this->postJson(self::URL, $this->payload())->json('data');
        $id = $created['asset']['id'];

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'Salah input harga'])
            ->assertOk()
            ->assertJsonPath('data.asset.status', 'VOID')
            ->assertJsonPath('data.asset.void_reason', 'Salah input harga')
            ->assertJsonPath('data.journals.0.reference_type', 'FIXED_ASSET_VOID')
            ->assertJsonPath('data.journals.0.reversal_of', $created['journals'][0]['entry_number']);

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'lagi'])->assertStatus(422);
    }

    public function test_void_of_an_opening_asset_only_changes_its_status(): void
    {
        $id = $this->postJson(self::URL, $this->openingPayload())->json('data.asset.id');

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'Dobel'])
            ->assertOk()->assertJsonPath('data.asset.status', 'VOID')->assertJsonPath('data.journals', []);
    }

    public function test_void_is_refused_once_depreciation_was_posted(): void
    {
        $id = $this->postJson(self::URL, $this->payload())->json('data.asset.id');
        $entry = (new JournalDraft())->debit('6-1011', 250000, 'uji')->credit('1-3999', 250000, 'uji')
            ->post(app(AccountingEngine::class), 'TEST', 'FA-'.uniqid(), 'Uji penyusutan', '2019-01-31');
        FixedAssetDepreciation::create(['fixed_asset_id' => $id, 'period' => '2019-01', 'amount' => 250000, 'journal_entry_id' => $entry->id]);

        $this->postJson(self::URL."/{$id}/void", ['reason' => 'x'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah disusutkan'));
        $this->assertSame(0, JournalEntry::where('reference_type', 'FIXED_ASSET_VOID')->count());
    }

    public function test_index_lists_the_register_next_to_the_ledger(): void
    {
        $before = $this->getJson(self::URL)->assertOk()->json('data.summary');
        $this->postJson(self::URL, $this->payload())->assertCreated();

        $res = $this->getJson(self::URL)->assertOk();
        $after = $res->json('data.summary');

        $this->assertEquals(12000000, round($after['total_cost'] - $before['total_cost'], 2));
        $this->assertEquals(12000000, round($after['ledger_cost'] - $before['ledger_cost'], 2));
        $this->assertEquals($before['difference_cost'], $after['difference_cost']);
        $this->assertContains('Mesin Spooring Hunter', array_column($res->json('data.assets'), 'name'));
    }

    public function test_roles_without_fixed_assets_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL)->assertForbidden();
        $this->postJson(self::URL, $this->payload())->assertForbidden();
        $this->postJson(self::URL.'/1/void', ['reason' => 'x'])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=FixedAssetApiTest`
Expected: FAIL — `/api/v1/accounting/fixed-assets` returns 404 and `App\Models\FixedAssetDepreciation` does not exist.

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_10_04_000002_create_fixed_assets_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Register aset tetap (buku pembantu 1-3000/1-3999) dan rincian penyusutan per aset per bulan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fixed_assets', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name', 150);
            $table->string('category', 30);
            $table->date('acquisition_date');
            $table->decimal('acquisition_cost', 15, 2);
            $table->decimal('residual_value', 15, 2)->default(0);
            $table->unsignedSmallInteger('useful_life_months');
            $table->char('depreciation_start', 7);
            $table->decimal('opening_accumulated_depreciation', 15, 2)->default(0);
            $table->string('funding', 10);
            $table->string('journal_entry_number', 50)->nullable();
            $table->string('status', 10)->default('ACTIVE');
            $table->string('notes', 255)->nullable();
            $table->string('void_reason', 255)->nullable();
            $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });

        Schema::create('fixed_asset_depreciations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('fixed_asset_id')->constrained('fixed_assets')->cascadeOnDelete();
            $table->char('period', 7);
            $table->decimal('amount', 15, 2);
            $table->foreignId('journal_entry_id')->constrained('journal_entries');
            $table->timestamps();
            $table->index(['fixed_asset_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fixed_asset_depreciations');
        Schema::dropIfExists('fixed_assets');
    }
};
```

- [ ] **Step 4: Create the models**

Create `backend/app/Models/FixedAsset.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Satu aset tetap. Penyusutan garis lurus per bulan penuh mulai `depreciation_start` (YYYY-MM) atas dasar
 * biaya − residu − akumulasi penyusutan sebelum masuk sistem, dihitung kumulatif dalam sen agar
 * bulan terakhir menyerap pembulatan.
 */
class FixedAsset extends Model
{
    public const CATEGORIES = [
        'PERALATAN_BENGKEL' => 'Peralatan & Mesin Bengkel',
        'INVENTARIS_TOKO' => 'Inventaris & Perabot Toko',
        'KENDARAAN' => 'Kendaraan',
    ];

    public const FUNDING = ['TUNAI', 'TRANSFER', 'OPENING'];

    protected $fillable = [
        'code', 'name', 'category', 'acquisition_date', 'acquisition_cost', 'residual_value', 'useful_life_months',
        'depreciation_start', 'opening_accumulated_depreciation', 'funding', 'journal_entry_number', 'status', 'notes',
        'void_reason', 'voided_by', 'voided_at', 'created_by', 'branch_id',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
        'acquisition_cost' => 'decimal:2',
        'residual_value' => 'decimal:2',
        'opening_accumulated_depreciation' => 'decimal:2',
        'useful_life_months' => 'integer',
        'voided_at' => 'datetime',
    ];

    public function depreciations(): HasMany
    {
        return $this->hasMany(FixedAssetDepreciation::class);
    }

    public static function cents(mixed $amount): int
    {
        return (int) round((float) $amount * 100);
    }

    /** Jumlah bulan dari $start sampai $period, keduanya termasuk (0 atau negatif bila $period sebelum $start). */
    public static function monthsBetween(string $start, string $period): int
    {
        [$startYear, $startMonth] = array_map('intval', explode('-', $start));
        [$year, $month] = array_map('intval', explode('-', $period));

        return ($year - $startYear) * 12 + ($month - $startMonth) + 1;
    }

    /** Nilai yang disusutkan sistem (sen): biaya − residu − akumulasi sebelum mulai disusutkan. */
    public function baseCents(): int
    {
        return self::cents($this->acquisition_cost) - self::cents($this->residual_value) - self::cents($this->opening_accumulated_depreciation);
    }

    /** Penyusutan kumulatif yang seharusnya sudah dibukukan sistem sampai akhir $period (sen). */
    public function expectedCentsThrough(string $period): int
    {
        $months = self::monthsBetween($this->depreciation_start, $period);
        if ($months <= 0) {
            return 0;
        }

        return $months >= $this->useful_life_months
            ? $this->baseCents()
            : intdiv($this->baseCents() * $months, $this->useful_life_months);
    }

    /** Akumulasi penyusutan: saldo awal + seluruh penyusutan yang dibukukan sistem. */
    public function accumulatedDepreciation(): float
    {
        if (! array_key_exists('depreciations_sum_amount', $this->getAttributes())) {
            $this->loadSum('depreciations', 'amount');
        }

        return round((float) $this->opening_accumulated_depreciation + (float) $this->depreciations_sum_amount, 2);
    }

    public function toApiArray(): array
    {
        if (! array_key_exists('depreciations_max_period', $this->getAttributes())) {
            $this->loadMax('depreciations', 'period');
        }
        $accumulated = $this->accumulatedDepreciation();

        return [
            'id' => $this->id,
            'code' => $this->code,
            'name' => $this->name,
            'category' => $this->category,
            'category_label' => self::CATEGORIES[$this->category] ?? $this->category,
            'acquisition_date' => $this->acquisition_date->toDateString(),
            'acquisition_cost' => (float) $this->acquisition_cost,
            'residual_value' => (float) $this->residual_value,
            'useful_life_months' => $this->useful_life_months,
            'depreciation_start' => $this->depreciation_start,
            'opening_accumulated_depreciation' => (float) $this->opening_accumulated_depreciation,
            'monthly_depreciation' => round(intdiv($this->baseCents(), max(1, $this->useful_life_months)) / 100, 2),
            'accumulated_depreciation' => $accumulated,
            'book_value' => round((float) $this->acquisition_cost - $accumulated, 2),
            'last_depreciated_period' => $this->depreciations_max_period,
            'funding' => $this->funding,
            'journal_entry_number' => $this->journal_entry_number,
            'status' => $this->status,
            'notes' => $this->notes,
            'void_reason' => $this->void_reason,
        ];
    }
}
```

Create `backend/app/Models/FixedAssetDepreciation.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Penyusutan satu aset untuk satu bulan, bagian dari satu jurnal DEPRECIATION.
 */
class FixedAssetDepreciation extends Model
{
    protected $fillable = ['fixed_asset_id', 'period', 'amount', 'journal_entry_id'];

    protected $casts = ['amount' => 'decimal:2'];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(FixedAsset::class, 'fixed_asset_id');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }
}
```

- [ ] **Step 5: Create the service**

Create `backend/app/Services/Accounting/FixedAssetService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\FixedAsset;
use App\Models\JournalEntry;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Register aset tetap: perolehan (Dr 1-3000 / Cr kas atau bank), aset dari saldo awal (tanpa jurnal),
 * dan pembatalan aset yang belum pernah disusutkan (jurnal cermin).
 */
class FixedAssetService
{
    public const ASSET_ACCOUNT = '1-3000';
    public const ACCUMULATED_ACCOUNT = '1-3999';
    public const ACQUISITION = 'FIXED_ASSET_ACQUISITION';
    public const VOID = 'FIXED_ASSET_VOID';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /** Satu perubahan register/penyusutan pada satu waktu: kunci baris akun akumulasi penyusutan. */
    public static function lockRegister(): void
    {
        Account::where('account_code', self::ACCUMULATED_ACCOUNT)->lockForUpdate()->first();
    }

    /**
     * @param  array{name: string, category: string, acquisition_date: string, acquisition_cost: float|int|string, residual_value?: float|int|string|null, useful_life_months: int|string, funding: string, depreciation_start?: ?string, opening_accumulated_depreciation?: float|int|string|null, notes?: ?string}  $data
     * @return array{asset: FixedAsset, journal: ?JournalEntry}
     */
    public function create(array $data, User $user): array
    {
        return DB::transaction(function () use ($data, $user) {
            self::lockRegister();
            $opening = $data['funding'] === 'OPENING';
            $code = DocumentNumber::next(FixedAsset::class, 'code', 'AT', $data['acquisition_date']);

            $asset = FixedAsset::create([
                'code' => $code,
                'name' => $data['name'],
                'category' => $data['category'],
                'acquisition_date' => $data['acquisition_date'],
                'acquisition_cost' => round((float) $data['acquisition_cost'], 2),
                'residual_value' => round((float) ($data['residual_value'] ?? 0), 2),
                'useful_life_months' => (int) $data['useful_life_months'],
                'depreciation_start' => $opening ? $data['depreciation_start'] : substr($data['acquisition_date'], 0, 7),
                'opening_accumulated_depreciation' => $opening ? round((float) ($data['opening_accumulated_depreciation'] ?? 0), 2) : 0,
                'funding' => $data['funding'],
                'status' => 'ACTIVE',
                'notes' => $data['notes'] ?? null,
                'created_by' => $user->id,
                'branch_id' => 3,
            ]);

            $journal = null;
            if (! $opening) {
                $cost = (float) $asset->acquisition_cost;
                $journal = (new JournalDraft())
                    ->debit(self::ASSET_ACCOUNT, $cost, "Perolehan {$code} {$asset->name}")
                    ->credit($data['funding'] === 'TUNAI' ? '1-1000' : '1-1001', $cost, "Pembayaran aset {$code}")
                    ->post($this->engine, self::ACQUISITION, $code, "Perolehan aset tetap {$code}: {$asset->name}", $data['acquisition_date']);
                $asset->update(['journal_entry_number' => $journal->entry_number]);
            }

            return ['asset' => $asset->fresh(), 'journal' => $journal];
        });
    }

    /**
     * @return array{asset: FixedAsset, journal: ?JournalEntry}
     */
    public function void(int $id, string $reason, User $user): array
    {
        return DB::transaction(function () use ($id, $reason, $user) {
            self::lockRegister();
            $asset = FixedAsset::lockForUpdate()->findOrFail($id);

            if ($asset->status === 'VOID') {
                throw new PosRuleException("Aset {$asset->code} sudah dibatalkan.");
            }
            if ($asset->depreciations()->exists()) {
                throw new PosRuleException("Aset {$asset->code} sudah disusutkan; pembatalan hanya untuk aset yang belum pernah disusutkan.");
            }

            $journal = null;
            if ($asset->journal_entry_number !== null) {
                $original = JournalEntry::where('entry_number', $asset->journal_entry_number)->firstOrFail();
                $journal = $this->engine->createEntry(
                    self::VOID,
                    $asset->code,
                    "Pembatalan aset tetap {$asset->code}: {$reason}",
                    $original->reversedItems('[BATAL] '),
                    now()->toDateString(),
                    3,
                    $original->id
                );
            }

            $asset->update(['status' => 'VOID', 'void_reason' => $reason, 'voided_by' => $user->id, 'voided_at' => now()]);

            return ['asset' => $asset->fresh(), 'journal' => $journal];
        });
    }

    /**
     * Total register aset aktif dibanding saldo buku besar 1-3000 / 1-3999.
     *
     * @param  Collection<int, FixedAsset>  $assets
     */
    public static function summary(Collection $assets): array
    {
        $active = $assets->where('status', 'ACTIVE');
        $cost = round($active->sum(fn (FixedAsset $a) => (float) $a->acquisition_cost), 2);
        $accumulated = round($active->sum(fn (FixedAsset $a) => $a->accumulatedDepreciation()), 2);

        $balances = LedgerBalances::forRange(null, null)->keyBy(fn (AccountBalance $b) => $b->account->account_code);
        $ledgerCost = $balances[self::ASSET_ACCOUNT]->signed('DEBIT');
        $ledgerAccumulated = $balances[self::ACCUMULATED_ACCOUNT]->signed('CREDIT');

        return [
            'total_cost' => $cost,
            'total_accumulated' => $accumulated,
            'total_book_value' => round($cost - $accumulated, 2),
            'ledger_cost' => $ledgerCost,
            'ledger_accumulated' => $ledgerAccumulated,
            'difference_cost' => round($cost - $ledgerCost, 2),
            'difference_accumulated' => round($accumulated - $ledgerAccumulated, 2),
        ];
    }
}
```

- [ ] **Step 6: Create the form request**

Create `backend/app/Http/Requests/FixedAssetRequest.php`:

```php
<?php

namespace App\Http\Requests;

use App\Models\FixedAsset;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class FixedAssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:150',
            'category' => ['required', Rule::in(array_keys(FixedAsset::CATEGORIES))],
            'acquisition_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'acquisition_cost' => 'required|numeric|min:1|max:10000000000',
            'residual_value' => 'nullable|numeric|min:0|max:10000000000',
            'useful_life_months' => 'required|integer|min:1|max:600',
            'funding' => ['required', Rule::in(FixedAsset::FUNDING)],
            'depreciation_start' => 'nullable|required_if:funding,OPENING|prohibited_unless:funding,OPENING|date_format:Y-m',
            'opening_accumulated_depreciation' => 'nullable|prohibited_unless:funding,OPENING|numeric|min:0|max:10000000000',
            'notes' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'acquisition_date.before_or_equal' => 'Tanggal perolehan tidak boleh melebihi hari ini.',
            'depreciation_start.required_if' => 'Aset dari saldo awal wajib diisi bulan mulai disusutkan sistem.',
            'depreciation_start.prohibited_unless' => 'Bulan mulai penyusutan hanya diisi untuk aset dari saldo awal; aset yang dibeli mulai disusutkan pada bulan perolehan.',
            'opening_accumulated_depreciation.prohibited_unless' => 'Akumulasi penyusutan awal hanya untuk aset dari saldo awal.',
            'category.in' => 'Kategori aset tidak dikenal.',
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            $cost = (float) $this->input('acquisition_cost', 0);
            $residual = (float) $this->input('residual_value', 0);
            $opening = (float) $this->input('opening_accumulated_depreciation', 0);
            if ($residual + $opening > $cost) {
                $validator->errors()->add('residual_value', 'Nilai residu ditambah akumulasi penyusutan awal tidak boleh melebihi harga perolehan.');
            }

            $start = $this->input('depreciation_start');
            $acquired = (string) $this->input('acquisition_date', '');
            if (is_string($start) && preg_match('/^\d{4}-\d{2}$/', $start) && strlen($acquired) >= 7 && $start < substr($acquired, 0, 7)) {
                $validator->errors()->add('depreciation_start', 'Bulan mulai penyusutan tidak boleh sebelum bulan perolehan.');
            }
        }];
    }
}
```

- [ ] **Step 7: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/FixedAssetController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Http\Requests\FixedAssetRequest;
use App\Models\FixedAsset;
use App\Services\Accounting\FixedAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FixedAssetController extends Controller
{
    public function __construct(private readonly FixedAssetService $assets)
    {
    }

    public function index(): JsonResponse
    {
        $assets = FixedAsset::withSum('depreciations', 'amount')
            ->withMax('depreciations', 'period')
            ->orderBy('acquisition_date')->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'assets' => $assets->map(fn (FixedAsset $a) => $a->toApiArray())->values(),
                'summary' => FixedAssetService::summary($assets),
            ],
        ]);
    }

    public function store(FixedAssetRequest $request): JsonResponse
    {
        $result = $this->assets->create($request->validated(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "Aset tetap {$result['asset']->code} dicatat.",
            'data' => [
                'asset' => $result['asset']->toApiArray(),
                'journals' => $result['journal'] ? [$result['journal']->toApiArray()] : [],
            ],
        ], 201);
    }

    public function void(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:255']);
        $result = $this->assets->void($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Aset tetap {$result['asset']->code} dibatalkan.",
            'data' => [
                'asset' => $result['asset']->toApiArray(),
                'journals' => $result['journal'] ? [$result['journal']->toApiArray()] : [],
            ],
        ]);
    }
}
```

- [ ] **Step 8: Register the routes**

In `backend/routes/api.php`, add the import after the `AuthController` import. Replace:

```php
use App\Http\Controllers\Api\v1\AuthController;
```

with:

```php
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\FixedAssetController;
```

Then insert our route block directly above the accounting hub block. Replace the single line:

```php
        // SAK EMKM Accounting Hub & Reports
```

with:

```php
        // SAK EMKM (SP4): aset tetap & penyusutan, jurnal penyesuaian, rekonsiliasi bank, CALK
        Route::prefix('accounting/fixed-assets')->middleware('permission:fixed_assets')->group(function () {
            Route::get('/', [FixedAssetController::class, 'index']);
            Route::post('/', [FixedAssetController::class, 'store']);
            Route::post('{id}/void', [FixedAssetController::class, 'void'])->whereNumber('id');
        });

        // SAK EMKM Accounting Hub & Reports
```

- [ ] **Step 9: Migrate both databases and run the tests**

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force
php artisan config:clear && php artisan test --filter=FixedAssetApiTest
```

Expected: migration `2026_10_04_000002_create_fixed_assets_tables` runs on both DBs; 9 tests PASS.

- [ ] **Step 10: Run the full backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests PASS.

- [ ] **Step 11: Commit**

```bash
git status --short
git add backend/database/migrations/2026_10_04_000002_create_fixed_assets_tables.php \
        backend/app/Models/FixedAsset.php \
        backend/app/Models/FixedAssetDepreciation.php \
        backend/app/Services/Accounting/FixedAssetService.php \
        backend/app/Http/Requests/FixedAssetRequest.php \
        backend/app/Http/Controllers/Api/v1/FixedAssetController.php \
        backend/routes/api.php \
        backend/tests/Feature/FixedAssetApiTest.php
git commit -m "$(cat <<'EOF'
feat(accounting): add the fixed asset register

Assets bought with cash or transfer post Dr 1-3000 at acquisition; assets
already in the opening balance are registered without a journal. A wrong
entry can be voided with a mirror journal until it has been depreciated.
The register summary is shown next to the 1-3000/1-3999 ledger balances.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---
### Task B3: Monthly straight-line depreciation and the period-close gate

**Files:**
- Create: `backend/app/Services/Accounting/DepreciationService.php`, `backend/tests/Feature/DepreciationTest.php`
- Modify: `backend/app/Http/Controllers/Api/v1/FixedAssetController.php`, `backend/routes/api.php`, `backend/app/Services/Accounting/PeriodClosingService.php`

**Interfaces:**
- Consumes: `FixedAsset::expectedCentsThrough()`, `FixedAsset::cents()`, `FixedAssetDepreciation`, `FixedAssetService::lockRegister()`, `FixedAssetService::ACCUMULATED_ACCOUNT` (B2); `PeriodLock::lockDate()`.
- Produces:
  - `App\Services\Accounting\DepreciationService`: consts `EXPENSE_ACCOUNT = '6-1011'`, `REFERENCE_TYPE = 'DEPRECIATION'`; `pendingLines(string $period): list<array{asset: FixedAsset, amount: float}>`; `pendingTotal(string $period): float`; `preview(string $period): array`; `run(string $period): ?JournalEntry`; `static endOf(string $period): string`.
  - `GET /api/v1/accounting/fixed-assets/depreciation?period=YYYY-MM` → `data: {period, end_date, is_locked, blocked_reason, lines[{fixed_asset_id, code, name, amount}], total, posted[{entry_number, entry_date, total}]}`.
  - `POST /api/v1/accounting/fixed-assets/depreciation {period}` → 201 `data.journals = [entry]` or 200 `data.journals = []` with message "Tidak ada penyusutan yang perlu dibukukan untuk …".
  - `PeriodClosingService::close()` throws 422 "Penyusutan aset tetap sampai … belum dibukukan …" when `pendingTotal(period) > 0`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/DepreciationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\FixedAsset;
use App\Models\JournalEntry;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class DepreciationTest extends TestCase
{
    use DatabaseTransactions;

    private const ASSETS = '/api/v1/accounting/fixed-assets';
    private const RUN = '/api/v1/accounting/fixed-assets/depreciation';

    /** Aset dari saldo awal: tidak membukukan jurnal perolehan, sehingga bulan mana pun boleh ditutup. */
    private function openingAsset(array $overrides = []): int
    {
        return $this->postJson(self::ASSETS, array_merge([
            'name' => 'Kompresor Angin',
            'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2018-12-01',
            'acquisition_cost' => 1200000,
            'residual_value' => 0,
            'useful_life_months' => 12,
            'funding' => 'OPENING',
            'depreciation_start' => '2019-01',
            'opening_accumulated_depreciation' => 0,
        ], $overrides))->assertCreated()->json('data.asset.id');
    }

    private function runPeriod(string $period): TestResponse
    {
        return $this->postJson(self::RUN, ['period' => $period]);
    }

    private function accumulated(int $id): float
    {
        return FixedAsset::findOrFail($id)->accumulatedDepreciation();
    }

    public function test_run_posts_one_straight_line_journal_for_the_month(): void
    {
        $this->postJson(self::ASSETS, [
            'name' => 'Mesin Spooring Hunter',
            'category' => 'PERALATAN_BENGKEL',
            'acquisition_date' => '2019-01-10',
            'acquisition_cost' => 12000000,
            'useful_life_months' => 48,
            'funding' => 'TUNAI',
        ])->assertCreated();

        $res = $this->runPeriod('2019-01')
            ->assertCreated()
            ->assertJsonPath('data.journals.0.reference_type', 'DEPRECIATION')
            ->assertJsonPath('data.journals.0.reference_id', 'SUSUT-2019-01')
            ->assertJsonPath('data.journals.0.entry_date', '2019-01-31');

        $lines = collect($res->json('data.journals.0.lines'));
        $this->assertEquals(250000, $lines->where('account_code', '6-1011')->sum('debit'));
        $this->assertEquals(250000, $lines->firstWhere('account_code', '1-3999')['credit']);
    }

    public function test_second_run_of_the_same_month_posts_nothing(): void
    {
        $id = $this->openingAsset();
        $this->runPeriod('2019-01')->assertCreated();

        $this->runPeriod('2019-01')
            ->assertOk()
            ->assertJsonPath('data.journals', [])
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Tidak ada penyusutan'));

        $this->assertSame(1, JournalEntry::where('reference_type', 'DEPRECIATION')->where('reference_id', 'SUSUT-2019-01')->count());
        $this->assertEquals(100000, $this->accumulated($id));
    }

    public function test_an_open_previous_month_must_be_depreciated_first(): void
    {
        $this->openingAsset();

        $this->runPeriod('2019-02')
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, '2019-01'));
        $this->getJson(self::RUN.'?period=2019-02')
            ->assertOk()
            ->assertJsonPath('data.blocked_reason', fn ($r) => is_string($r) && str_contains($r, '2019-01'));
    }

    public function test_last_month_absorbs_rounding(): void
    {
        $id = $this->openingAsset(['acquisition_cost' => 1000, 'useful_life_months' => 3]);

        $amounts = [];
        foreach (['2019-01', '2019-02', '2019-03'] as $period) {
            $amounts[] = $this->runPeriod($period)->assertCreated()->json('data.journals.0.total_debit');
        }
        $this->runPeriod('2019-04')->assertOk()->assertJsonPath('data.journals', []);

        $this->assertEquals([333.33, 333.33, 333.34], $amounts);
        $this->assertEquals(1000, $this->accumulated($id));
    }

    public function test_opening_asset_depreciates_its_remaining_base(): void
    {
        $id = $this->openingAsset([
            'acquisition_cost' => 10000000,
            'residual_value' => 1000000,
            'opening_accumulated_depreciation' => 3000000,
            'useful_life_months' => 24,
            'depreciation_start' => '2019-02',
        ]);

        $this->runPeriod('2019-01')->assertOk()->assertJsonPath('data.journals', []);
        $this->runPeriod('2019-02')->assertCreated()->assertJsonPath('data.journals.0.total_debit', 250000);
        $this->assertEquals(3250000, $this->accumulated($id));
    }

    public function test_period_close_requires_the_months_depreciation(): void
    {
        $this->openingAsset();

        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'Penyusutan aset tetap sampai 2019-01'));

        $this->runPeriod('2019-01')->assertCreated();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();
    }

    public function test_a_closed_month_cannot_be_depreciated(): void
    {
        $this->openingAsset();
        $this->runPeriod('2019-01')->assertCreated();
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();

        $this->runPeriod('2019-01')
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah ditutup'));
        $this->getJson(self::RUN.'?period=2019-01')->assertOk()->assertJsonPath('data.is_locked', true);
    }

    public function test_months_already_locked_are_caught_up_in_the_first_open_month(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-01'])->assertCreated();
        $id = $this->openingAsset();

        $this->runPeriod('2019-02')->assertCreated()->assertJsonPath('data.journals.0.total_debit', 200000);
        $this->assertEquals(200000, $this->accumulated($id));
    }

    public function test_preview_lists_pending_amounts_and_posted_journals(): void
    {
        $this->openingAsset();

        $this->getJson(self::RUN.'?period=2019-01')
            ->assertOk()
            ->assertJsonPath('data.total', 100000)
            ->assertJsonPath('data.lines.0.amount', 100000)
            ->assertJsonPath('data.blocked_reason', null)
            ->assertJsonPath('data.posted', []);

        $this->runPeriod('2019-01')->assertCreated();
        $this->getJson(self::RUN.'?period=2019-01')
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.posted.0.total', 100000);
    }

    public function test_voided_assets_are_not_depreciated(): void
    {
        $id = $this->openingAsset();
        $this->postJson(self::ASSETS."/{$id}/void", ['reason' => 'Dobel input'])->assertOk();

        $this->runPeriod('2019-01')->assertOk()->assertJsonPath('data.journals', []);
    }

    public function test_future_period_is_rejected(): void
    {
        $this->runPeriod(now()->addMonthNoOverflow()->format('Y-m'))->assertStatus(422);
        $this->runPeriod('2019-13')->assertStatus(422);
    }

    public function test_roles_without_fixed_assets_cannot_run_depreciation(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::RUN.'?period=2019-01')->assertForbidden();
        $this->runPeriod('2019-01')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=DepreciationTest`
Expected: FAIL — the depreciation endpoints return 404/405 and closing 2019-01 succeeds without depreciation.

- [ ] **Step 3: Create the depreciation service**

Create `backend/app/Services/Accounting/DepreciationService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\FixedAsset;
use App\Models\FixedAssetDepreciation;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Penyusutan garis lurus bulanan. Satu jurnal per bulan (Dr 6-1011 per aset / Cr 1-3999), bertanggal akhir bulan.
 * Jumlah per aset = penyusutan kumulatif yang seharusnya s/d bulan itu − yang sudah dibukukan s/d bulan itu,
 * sehingga menjalankan ulang tidak membukukan apa pun dan bulan yang terlanjur dikunci tersusul otomatis.
 */
class DepreciationService
{
    public const EXPENSE_ACCOUNT = '6-1011';
    public const REFERENCE_TYPE = 'DEPRECIATION';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public static function endOf(string $period): string
    {
        return Carbon::parse($period.'-01')->endOfMonth()->toDateString();
    }

    /**
     * @return list<array{asset: FixedAsset, amount: float}>
     */
    public function pendingLines(string $period): array
    {
        $assets = FixedAsset::where('status', 'ACTIVE')
            ->where('depreciation_start', '<=', $period)
            ->withSum(['depreciations as posted_through' => fn ($q) => $q->where('period', '<=', $period)], 'amount')
            ->orderBy('code')
            ->get();

        $lines = [];
        foreach ($assets as $asset) {
            $cents = $asset->expectedCentsThrough($period) - FixedAsset::cents($asset->posted_through ?? 0);
            if ($cents > 0) {
                $lines[] = ['asset' => $asset, 'amount' => $cents / 100];
            }
        }

        return $lines;
    }

    public function pendingTotal(string $period): float
    {
        return round(array_sum(array_column($this->pendingLines($period), 'amount')), 2);
    }

    public function preview(string $period): array
    {
        self::assertPeriod($period);
        $end = self::endOf($period);
        $lock = PeriodLock::lockDate();
        $lines = $this->pendingLines($period);

        return [
            'period' => $period,
            'end_date' => $end,
            'is_locked' => $lock !== null && $end <= $lock,
            'blocked_reason' => $this->blockedReason($period),
            'lines' => array_map(fn (array $l) => [
                'fixed_asset_id' => $l['asset']->id,
                'code' => $l['asset']->code,
                'name' => $l['asset']->name,
                'amount' => $l['amount'],
            ], $lines),
            'total' => round(array_sum(array_column($lines, 'amount')), 2),
            'posted' => JournalEntry::where('reference_type', self::REFERENCE_TYPE)
                ->where('reference_id', "SUSUT-{$period}")
                ->orderBy('id')->get()
                ->map(fn (JournalEntry $j) => [
                    'entry_number' => $j->entry_number,
                    'entry_date' => $j->entry_date->toDateString(),
                    'total' => (float) $j->total_debit,
                ])->values()->all(),
        ];
    }

    /** Bukukan penyusutan yang tertunda s/d $period; null bila tidak ada yang perlu dibukukan. */
    public function run(string $period): ?JournalEntry
    {
        self::assertPeriod($period);

        return DB::transaction(function () use ($period) {
            FixedAssetService::lockRegister();

            $reason = $this->blockedReason($period);
            if ($reason !== null) {
                throw new PosRuleException($reason);
            }

            $lines = $this->pendingLines($period);
            if ($lines === []) {
                return null;
            }

            $draft = new JournalDraft();
            foreach ($lines as $line) {
                $draft->debit(self::EXPENSE_ACCOUNT, $line['amount'], "Penyusutan {$line['asset']->code} {$line['asset']->name}");
            }
            $total = round(array_sum(array_column($lines, 'amount')), 2);
            $draft->credit(FixedAssetService::ACCUMULATED_ACCOUNT, $total, "Akumulasi penyusutan {$period}");
            $entry = $draft->post($this->engine, self::REFERENCE_TYPE, "SUSUT-{$period}", "Penyusutan aset tetap garis lurus {$period}", self::endOf($period));

            foreach ($lines as $line) {
                FixedAssetDepreciation::create([
                    'fixed_asset_id' => $line['asset']->id,
                    'period' => $period,
                    'amount' => $line['amount'],
                    'journal_entry_id' => $entry->id,
                ]);
            }

            return $entry;
        });
    }

    /** Alasan penyusutan $period belum boleh dibukukan, atau null. */
    private function blockedReason(string $period): ?string
    {
        $lock = PeriodLock::lockDate();
        if ($lock !== null && self::endOf($period) <= $lock) {
            return "Periode {$period} sudah ditutup; penyusutannya tidak dapat dibukukan lagi.";
        }

        // Bulan sebelumnya yang masih terbuka harus disusutkan dulu, agar beban tiap bulan jatuh di bulannya.
        $previous = Carbon::parse($period.'-01')->subMonthNoOverflow()->format('Y-m');
        $previousOpen = $lock === null || self::endOf($previous) > $lock;
        if ($previousOpen && $this->pendingTotal($previous) > 0) {
            return "Penyusutan {$previous} belum dijalankan. Jalankan penyusutan bulan itu lebih dulu.";
        }

        return null;
    }

    private static function assertPeriod(string $period): void
    {
        if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period) || $period > now()->format('Y-m')) {
            throw new PosRuleException('Periode penyusutan harus bulan berjalan atau bulan sebelumnya (format YYYY-MM).');
        }
    }
}
```

- [ ] **Step 4: Add the controller actions and routes**

In `backend/app/Http/Controllers/Api/v1/FixedAssetController.php` replace:

```php
use App\Services\Accounting\FixedAssetService;
```

with:

```php
use App\Services\Accounting\DepreciationService;
use App\Services\Accounting\FixedAssetService;
```

and append these two methods before the final closing `}` of the class (after `void()`):

```php

    public function depreciationPreview(Request $request, DepreciationService $depreciation): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);

        return response()->json(['success' => true, 'data' => $depreciation->preview($data['period'])]);
    }

    public function runDepreciation(Request $request, DepreciationService $depreciation): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);
        $entry = $depreciation->run($data['period']);

        return response()->json([
            'success' => true,
            'message' => $entry
                ? "Penyusutan {$data['period']} dibukukan ({$entry->entry_number})."
                : "Tidak ada penyusutan yang perlu dibukukan untuk {$data['period']}.",
            'data' => ['journals' => $entry ? [$entry->toApiArray()] : []],
        ], $entry ? 201 : 200);
    }
```

In `backend/routes/api.php` replace (inside the block added in B2):

```php
            Route::post('{id}/void', [FixedAssetController::class, 'void'])->whereNumber('id');
```

with:

```php
            Route::post('{id}/void', [FixedAssetController::class, 'void'])->whereNumber('id');
            Route::get('depreciation', [FixedAssetController::class, 'depreciationPreview']);
            Route::post('depreciation', [FixedAssetController::class, 'runDepreciation']);
```

- [ ] **Step 5: Gate the period close on depreciation**

In `backend/app/Services/Accounting/PeriodClosingService.php` replace:

```php
    public function __construct(private readonly AccountingEngine $engine)
    {
    }
```

with:

```php
    public function __construct(
        private readonly AccountingEngine $engine,
        private readonly DepreciationService $depreciation,
    ) {
    }
```

and replace:

```php
            if ($lock !== null && $end <= $lock) {
                throw new PosRuleException("Periode {$period} sudah termasuk periode yang ditutup (sampai {$lock}).");
            }
```

with:

```php
            if ($lock !== null && $end <= $lock) {
                throw new PosRuleException("Periode {$period} sudah termasuk periode yang ditutup (sampai {$lock}).");
            }

            // Basis akrual SAK EMKM: beban penyusutan sampai bulan ini harus dibukukan sebelum periodenya dikunci.
            $pending = $this->depreciation->pendingTotal($period);
            if ($pending > 0) {
                throw new PosRuleException('Penyusutan aset tetap sampai '.$period.' belum dibukukan (Rp '
                    .number_format($pending, 0, ',', '.').'). Jalankan penyusutan periode itu di tab Aset Tetap sebelum tutup buku.');
            }
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter='DepreciationTest|PeriodClosingTest|FixedAssetApiTest'`
Expected: all PASS (DepreciationTest 12 tests; PeriodClosingTest unchanged because no asset exists there).

- [ ] **Step 7: Run the full backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/app/Services/Accounting/DepreciationService.php \
        backend/app/Http/Controllers/Api/v1/FixedAssetController.php \
        backend/routes/api.php \
        backend/app/Services/Accounting/PeriodClosingService.php \
        backend/tests/Feature/DepreciationTest.php
git commit -m "$(cat <<'EOF'
feat(accounting): run monthly straight-line depreciation

One DEPRECIATION journal per month (Dr 6-1011 per asset, Cr 1-3999),
computed cumulatively in cents so reruns post nothing, the last month
absorbs rounding and locked months are caught up. Period close now
refuses a month whose depreciation is still pending, so SAK EMKM accrual
expenses cannot be skipped by closing the books.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B4: Adjusting entries for accruals and prepayments

**Files:**
- Create: `backend/app/Services/Accounting/AdjustingEntryService.php`, `backend/app/Http/Controllers/Api/v1/AdjustingEntryController.php`, `backend/tests/Feature/AdjustingEntryApiTest.php`
- Modify: `backend/routes/api.php`

**Interfaces:**
- Consumes: accounts 1-1100, 2-1100 (B1); `DepreciationService::EXPENSE_ACCOUNT` (B3).
- Produces:
  - `App\Services\Accounting\AdjustingEntryService`: consts `ENTRY = 'ADJUSTING_ENTRY'`, `REVERSAL = 'ADJUSTING_REVERSAL'`, `ACCRUED = '2-1100'`, `PREPAID = '1-1100'`; `create(array $data): list<JournalEntry>` (entry, then reversal when `auto_reverse`).
  - `POST /api/v1/accounting/adjusting-entries` (`accounting_hub`) `{period: YYYY-MM, kind: ACCRUAL|PREPAID, account_code: 6-xxxx, amount, description, auto_reverse?: bool}` → 201 `data.journals`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/AdjustingEntryApiTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class AdjustingEntryApiTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/accounting/adjusting-entries';

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'period' => '2019-03',
            'kind' => 'ACCRUAL',
            'account_code' => '6-1001',
            'amount' => 450000,
            'description' => 'Tagihan listrik Maret belum datang',
            'auto_reverse' => true,
        ], $overrides);
    }

    private function line(array $journal, string $code): array
    {
        return collect($journal['lines'])->firstWhere('account_code', $code);
    }

    public function test_accrual_is_booked_at_month_end_and_reversed_on_the_first_of_next_month(): void
    {
        $res = $this->postJson(self::URL, $this->payload())
            ->assertCreated()
            ->assertJsonCount(2, 'data.journals')
            ->assertJsonPath('data.journals.0.reference_type', 'ADJUSTING_ENTRY')
            ->assertJsonPath('data.journals.0.entry_date', '2019-03-31')
            ->assertJsonPath('data.journals.1.reference_type', 'ADJUSTING_REVERSAL')
            ->assertJsonPath('data.journals.1.entry_date', '2019-04-01');

        [$entry, $reversal] = $res->json('data.journals');
        $this->assertStringStartsWith('AJP-201903-', $entry['reference_id']);
        $this->assertSame($entry['reference_id'], $reversal['reference_id']);
        $this->assertSame($entry['entry_number'], $reversal['reversal_of']);
        $this->assertEquals(450000, $this->line($entry, '6-1001')['debit']);
        $this->assertEquals(450000, $this->line($entry, '2-1100')['credit']);
        $this->assertEquals(450000, $this->line($reversal, '2-1100')['debit']);
        $this->assertEquals(450000, $this->line($reversal, '6-1001')['credit']);
    }

    public function test_prepayment_used_up_credits_prepaid_expenses_without_reversal(): void
    {
        $res = $this->postJson(self::URL, $this->payload([
            'kind' => 'PREPAID', 'account_code' => '6-1003', 'amount' => 2000000,
            'description' => 'Sewa toko Maret dari sewa dibayar di muka', 'auto_reverse' => false,
        ]))->assertCreated()->assertJsonCount(1, 'data.journals');

        $entry = $res->json('data.journals.0');
        $this->assertEquals(2000000, $this->line($entry, '6-1003')['debit']);
        $this->assertEquals(2000000, $this->line($entry, '1-1100')['credit']);
    }

    public function test_auto_reversal_is_only_for_accruals(): void
    {
        $this->postJson(self::URL, $this->payload(['kind' => 'PREPAID', 'auto_reverse' => true]))
            ->assertStatus(422)->assertJsonValidationErrors('auto_reverse');
    }

    public function test_only_operating_expense_accounts_other_than_depreciation_are_allowed(): void
    {
        foreach (['1-1000', '6-1011', '5-1000', '9-9999'] as $code) {
            $this->postJson(self::URL, $this->payload(['account_code' => $code]))
                ->assertStatus(422)->assertJsonValidationErrors('account_code');
        }
    }

    public function test_closed_and_future_periods_are_rejected(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2019-03'])->assertCreated();
        $this->postJson(self::URL, $this->payload())
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'ditutup'));

        $this->postJson(self::URL, $this->payload(['period' => now()->addMonthNoOverflow()->format('Y-m')]))
            ->assertStatus(422);
    }

    public function test_adjusting_journals_can_be_filtered_in_the_journal_list(): void
    {
        $this->postJson(self::URL, $this->payload())->assertCreated();

        $this->getJson('/api/v1/accounting/journals?types=ADJUSTING_ENTRY,ADJUSTING_REVERSAL&start_date=2019-03-01&end_date=2019-04-30')
            ->assertOk()->assertJsonPath('data.total', 2);
    }

    public function test_roles_without_accounting_hub_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->postJson(self::URL, $this->payload())->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=AdjustingEntryApiTest`
Expected: FAIL — `POST /api/v1/accounting/adjusting-entries` returns 404.

- [ ] **Step 3: Create the service**

Create `backend/app/Services/Accounting/AdjustingEntryService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Jurnal penyesuaian (AJP) akhir bulan:
 * - ACCRUAL: beban sudah terjadi, belum dibayar → Dr beban / Cr 2-1100; boleh dibalik otomatis tanggal 1 bulan berikutnya.
 * - PREPAID: beban dibayar di muka yang sudah terpakai → Dr beban / Cr 1-1100.
 */
class AdjustingEntryService
{
    public const ENTRY = 'ADJUSTING_ENTRY';
    public const REVERSAL = 'ADJUSTING_REVERSAL';
    public const ACCRUED = '2-1100';
    public const PREPAID = '1-1100';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{period: string, kind: string, account_code: string, amount: float|int|string, description: string, auto_reverse?: bool}  $data
     * @return list<JournalEntry>
     */
    public function create(array $data): array
    {
        if ($data['period'] > now()->format('Y-m')) {
            throw new PosRuleException('Jurnal penyesuaian hanya untuk bulan berjalan atau bulan sebelumnya.');
        }
        $end = Carbon::parse($data['period'].'-01')->endOfMonth()->toDateString();

        return DB::transaction(function () use ($data, $end) {
            $amount = round((float) $data['amount'], 2);
            $accrual = $data['kind'] === 'ACCRUAL';
            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', 'AJP', $end);

            $entry = (new JournalDraft())
                ->debit($data['account_code'], $amount, $data['description'])
                ->credit($accrual ? self::ACCRUED : self::PREPAID, $amount, $accrual ? 'Beban yang masih harus dibayar' : 'Beban dibayar di muka yang terpakai')
                ->post($this->engine, self::ENTRY, $reference, "AJP {$data['period']}: {$data['description']}", $end);

            if (! ($data['auto_reverse'] ?? false)) {
                return [$entry];
            }

            $reversal = $this->engine->createEntry(
                self::REVERSAL,
                $reference,
                "Pembalik otomatis {$reference}: {$data['description']}",
                $entry->reversedItems('[PEMBALIK AJP] '),
                Carbon::parse($end)->addDay()->toDateString(),
                3,
                $entry->id
            );

            return [$entry, $reversal];
        });
    }
}
```

- [ ] **Step 4: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/AdjustingEntryController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\Accounting\AdjustingEntryService;
use App\Services\Accounting\DepreciationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdjustingEntryController extends Controller
{
    public function store(Request $request, AdjustingEntryService $adjusting): JsonResponse
    {
        $accountMessage = 'Pilih akun beban operasional aktif (6-xxxx) selain Beban Penyusutan; penyusutan dibukukan dari register aset tetap.';
        $data = $request->validate([
            'period' => 'required|date_format:Y-m',
            'kind' => 'required|in:ACCRUAL,PREPAID',
            'account_code' => [
                'required', 'string', 'starts_with:6-',
                Rule::exists('accounts', 'account_code')->where('account_type', 'EXPENSE')->where('is_active', true),
                Rule::notIn([DepreciationService::EXPENSE_ACCOUNT]),
            ],
            'amount' => 'required|numeric|min:1|max:10000000000',
            'description' => 'required|string|max:200',
            'auto_reverse' => [
                'sometimes', 'boolean',
                Rule::prohibitedIf(fn () => $request->input('kind') === 'PREPAID' && $request->boolean('auto_reverse')),
            ],
        ], [
            'account_code.starts_with' => $accountMessage,
            'account_code.exists' => $accountMessage,
            'account_code.not_in' => $accountMessage,
            'auto_reverse.prohibited' => 'Pembalik otomatis hanya untuk akrual beban.',
        ]);

        $journals = $adjusting->create($data);
        $message = count($journals) === 2
            ? "AJP {$journals[0]->reference_id} dibukukan beserta jurnal pembalik tanggal {$journals[1]->entry_date->toDateString()}."
            : "AJP {$journals[0]->reference_id} dibukukan.";

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => ['journals' => array_map(fn (JournalEntry $j) => $j->toApiArray(), $journals)],
        ], 201);
    }
}
```

- [ ] **Step 5: Register the route**

In `backend/routes/api.php` replace:

```php
use App\Http\Controllers\Api\v1\AccountController;
```

with:

```php
use App\Http\Controllers\Api\v1\AccountController;
use App\Http\Controllers\Api\v1\AdjustingEntryController;
```

and, inside our SP4 block, replace:

```php
            Route::post('depreciation', [FixedAssetController::class, 'runDepreciation']);
        });
```

with:

```php
            Route::post('depreciation', [FixedAssetController::class, 'runDepreciation']);
        });
        Route::post('accounting/adjusting-entries', [AdjustingEntryController::class, 'store'])->middleware('permission:accounting_hub');
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter=AdjustingEntryApiTest`
Expected: 7 tests PASS.

- [ ] **Step 7: Run the full backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/app/Services/Accounting/AdjustingEntryService.php \
        backend/app/Http/Controllers/Api/v1/AdjustingEntryController.php \
        backend/routes/api.php \
        backend/tests/Feature/AdjustingEntryApiTest.php
git commit -m "$(cat <<'EOF'
feat(accounting): add adjusting entries for accruals and prepayments

Month-end AJP books unpaid expenses to 2-1100 or used-up prepayments from
1-1100 on the period's last day; accruals can be reversed automatically on
the first day of the next month, posted immediately and linked by
reversal_of_id, so no scheduler is needed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---
### Task B5: Bank reconciliation for 1-1001

**Files:**
- Create: `backend/database/migrations/2026_10_04_000003_create_bank_reconciliation_tables.php`, `backend/app/Models/BankStatementLine.php`, `backend/app/Models/BankReconciliation.php`, `backend/app/Services/Accounting/BankReconciliationService.php`, `backend/app/Http/Controllers/Api/v1/BankReconciliationController.php`, `backend/tests/Feature/BankReconciliationApiTest.php`
- Modify: `backend/routes/api.php`

**Interfaces:**
- Consumes: accounts 1-1001, 6-1012, 4-3000 (B1); `CashFlowReport::cashBalances()`; `OpeningBalanceService::REFERENCE_TYPE`.
- Produces:
  - Tables `bank_statement_lines` (`statement_date`, `description`, signed `amount`, `source` MANUAL|CSV, unique nullable `journal_item_id`, `created_by`, `branch_id`) and `bank_reconciliations` (`period` unique, `statement_ending_balance`, `updated_by`, `branch_id`).
  - `App\Services\Accounting\BankReconciliationService`: consts `BANK = '1-1001'`, `CHARGE_ACCOUNT = '6-1012'`, `INTEREST_ACCOUNT = '4-3000'`, `REFERENCE_TYPE = 'BANK_RECON_ADJUSTMENT'`; `addLine(array, User, string $source = 'MANUAL')`, `import(string $csv, User): array{imported, skipped}`, `static parseCsv(string $csv): list<array{statement_date, description, amount}>`, `match(int $lineId, int $journalItemId)`, `unmatch(int $lineId)`, `deleteLine(int $lineId)`, `postAdjustment(int $lineId): JournalEntry`, `autoMatch(string $period): int`, `setStatementBalance(string $period, float $balance, User)`, `report(string $period): array`.
  - Report shape (`GET /api/v1/accounting/bank-reconciliation?period=`): `{period, start_date, end_date, cutover_date, statement_ending_balance|null, book_balance, lines[], outstanding_ledger[{journal_item_id, entry_number, entry_date, reference_type, description, debit, credit}], unrecorded_bank[], deposits_in_transit, outstanding_payments, unrecorded_credits, unrecorded_debits, adjusted_bank_balance|null, adjusted_book_balance, difference|null, is_reconciled}`; statement line shape `{id, statement_date, description, amount, source, journal_item_id, matched_entry_number, matched_reference_type, matched_entry_date}`.
  - Routes under `accounting/bank-reconciliation` (`permission:bank_reconciliation`): `GET /`, `PUT {period}`, `POST lines`, `POST import`, `POST auto-match`, `DELETE lines/{id}`, `POST lines/{id}/match`, `POST lines/{id}/unmatch`, `POST lines/{id}/post-adjustment`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/BankReconciliationApiTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\BankStatementLine;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class BankReconciliationApiTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/accounting/bank-reconciliation';

    /** Baris jurnal 1-1001 dari jurnal uji; mengembalikan id baris bank. */
    private function bankEntry(string $date, float $amount, string $counter): int
    {
        $draft = new JournalDraft();
        $amount > 0
            ? $draft->debit('1-1001', $amount, 'uji')->credit($counter, $amount, 'uji')
            : $draft->debit($counter, -$amount, 'uji')->credit('1-1001', -$amount, 'uji');
        $entry = $draft->post(app(AccountingEngine::class), 'TEST', 'BR-'.uniqid(), 'Uji rekonsiliasi', $date);

        return (int) JournalItem::where('journal_entry_id', $entry->id)
            ->whereHas('account', fn ($q) => $q->where('account_code', '1-1001'))->value('id');
    }

    private function line(string $date, string $description, float $amount): int
    {
        return $this->postJson(self::URL.'/lines', ['statement_date' => $date, 'description' => $description, 'amount' => $amount])
            ->assertCreated()->json('data.id');
    }

    private function csv(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('rekening-koran.csv', $content);
    }

    public function test_manual_line_is_stored_unmatched(): void
    {
        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'TRSF CUST', 'amount' => 500000])
            ->assertCreated()
            ->assertJsonPath('data.source', 'MANUAL')
            ->assertJsonPath('data.journal_item_id', null)
            ->assertJsonPath('data.amount', 500000);

        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'NOL', 'amount' => 0])
            ->assertStatus(422)->assertJsonValidationErrors('amount');
    }

    public function test_csv_import_detects_the_delimiter_and_skips_lines_already_stored(): void
    {
        $content = "Tanggal;Keterangan;Jumlah\n04/05/2019;TRSF CUST;500000\n2019-05-10;TRSF SEWA;-200000\n2019-05-10;TRSF SEWA;-200000\n";

        $this->post(self::URL.'/import', ['file' => $this->csv($content)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 3)->assertJsonPath('data.skipped', 0);
        $this->post(self::URL.'/import', ['file' => $this->csv($content)], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 0)->assertJsonPath('data.skipped', 3);

        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-31,BUNGA,1200.50\n")], ['Accept' => 'application/json'])
            ->assertCreated()->assertJsonPath('data.imported', 1);
        $this->assertSame('CSV', BankStatementLine::where('description', 'BUNGA')->value('source'));
    }

    public function test_csv_with_a_bad_row_is_rejected_whole(): void
    {
        $before = BankStatementLine::count();

        $this->post(self::URL.'/import', ['file' => $this->csv("tanggal,keterangan,jumlah\n2019-05-04,OK,1000\n2019-05-05,SALAH,1.500.000\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Baris 3'));
        $this->post(self::URL.'/import', ['file' => $this->csv("tgl,uraian,nilai\n2019-05-04,X,1000\n")], ['Accept' => 'application/json'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tanggal'));

        $this->assertSame($before, BankStatementLine::count());
    }

    public function test_match_requires_the_same_amount_and_direction(): void
    {
        $deposit = $this->bankEntry('2019-05-03', 500000, '4-1000');
        $payment = $this->bankEntry('2019-05-10', -200000, '6-1003');
        $lineId = $this->line('2019-05-04', 'TRSF CUST', 500000);

        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $payment])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Nominal'));
        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $deposit])
            ->assertOk()->assertJsonPath('data.journal_item_id', $deposit);
        $this->postJson(self::URL."/lines/{$lineId}/match", ['journal_item_id' => $deposit])->assertStatus(422);

        $this->deleteJson(self::URL."/lines/{$lineId}")->assertStatus(422);
        $this->postJson(self::URL."/lines/{$lineId}/unmatch")->assertOk()->assertJsonPath('data.journal_item_id', null);
        $this->deleteJson(self::URL."/lines/{$lineId}")->assertOk();
    }

    public function test_auto_match_pairs_unique_amounts_within_three_days(): void
    {
        $deposit = $this->bankEntry('2019-05-03', 500000, '4-1000');
        $payment = $this->bankEntry('2019-05-10', -200000, '6-1003');
        $this->bankEntry('2019-05-30', 300000, '4-1000');
        $this->line('2019-05-04', 'TRSF CUST', 500000);
        $this->line('2019-05-10', 'TRSF SEWA', -200000);
        $this->line('2019-05-20', 'SETORAN LAIN', 750000);

        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertOk()->assertJsonPath('data.matched', 2);

        $this->assertEqualsCanonicalizing([$deposit, $payment], BankStatementLine::whereNotNull('journal_item_id')->pluck('journal_item_id')->all());
    }

    public function test_charges_and_interest_are_booked_from_unmatched_lines(): void
    {
        $charge = $this->line('2019-05-31', 'BIAYA ADM', -6500);
        $interest = $this->line('2019-05-31', 'BUNGA', 1200);

        $entry = $this->postJson(self::URL."/lines/{$charge}/post-adjustment")
            ->assertCreated()
            ->assertJsonPath('data.journals.0.reference_type', 'BANK_RECON_ADJUSTMENT')
            ->assertJsonPath('data.journals.0.entry_date', '2019-05-31')
            ->json('data.journals.0');
        $lines = collect($entry['lines']);
        $this->assertEquals(6500, $lines->firstWhere('account_code', '6-1012')['debit']);
        $this->assertEquals(6500, $lines->firstWhere('account_code', '1-1001')['credit']);

        $entry = $this->postJson(self::URL."/lines/{$interest}/post-adjustment")->assertCreated()->json('data.journals.0');
        $lines = collect($entry['lines']);
        $this->assertEquals(1200, $lines->firstWhere('account_code', '1-1001')['debit']);
        $this->assertEquals(1200, $lines->firstWhere('account_code', '4-3000')['credit']);

        $this->assertNotNull(BankStatementLine::find($charge)->journal_item_id);
        $this->postJson(self::URL."/lines/{$charge}/unmatch")->assertStatus(422);
        $this->postJson(self::URL."/lines/{$charge}/post-adjustment")->assertStatus(422);
        $this->assertSame(2, JournalEntry::where('reference_type', 'BANK_RECON_ADJUSTMENT')->whereIn('reference_id', ["REKON-{$charge}", "REKON-{$interest}"])->count());
    }

    public function test_report_reconciles_the_statement_with_the_books(): void
    {
        $this->bankEntry('2019-05-03', 500000, '4-1000');
        $this->bankEntry('2019-05-10', -200000, '6-1003');
        $this->bankEntry('2019-05-30', 300000, '4-1000');
        $this->line('2019-05-04', 'TRSF CUST', 500000);
        $this->line('2019-05-10', 'TRSF SEWA', -200000);
        $charge = $this->line('2019-05-31', 'BIAYA ADM', -6500);
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertOk();

        $report = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->assertNull($report['statement_ending_balance']);
        $this->assertFalse($report['is_reconciled']);
        $this->assertEquals(300000, $report['deposits_in_transit']);
        $this->assertEquals(6500, $report['unrecorded_debits']);
        $this->assertSame('2019-05-01', $report['cutover_date']);

        // Saldo bank = saldo buku − setoran 30 Mei yang belum masuk − biaya admin yang belum dibukukan.
        $statement = round($report['book_balance'] - 300000 - 6500, 2);
        $this->putJson(self::URL.'/2019-05', ['statement_ending_balance' => $statement])
            ->assertOk()->assertJsonPath('data.is_reconciled', true);

        $this->postJson(self::URL."/lines/{$charge}/post-adjustment")->assertCreated();
        $after = $this->getJson(self::URL.'?period=2019-05')->assertOk()->json('data');
        $this->assertTrue($after['is_reconciled']);
        $this->assertEquals(0, $after['unrecorded_debits']);
        $this->assertCount(1, $after['outstanding_ledger']);
    }

    public function test_roles_without_bank_reconciliation_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL.'?period=2019-05')->assertForbidden();
        $this->postJson(self::URL.'/lines', ['statement_date' => '2019-05-04', 'description' => 'X', 'amount' => 1])->assertForbidden();
        $this->postJson(self::URL.'/auto-match', ['period' => '2019-05'])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=BankReconciliationApiTest`
Expected: FAIL — `App\Models\BankStatementLine` does not exist and the endpoints return 404.

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_10_04_000003_create_bank_reconciliation_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mutasi rekening koran Bank BCA (1-1001) dan saldo akhir rekening koran per bulan untuk rekonsiliasi.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bank_statement_lines', function (Blueprint $table) {
            $table->id();
            $table->date('statement_date')->index();
            $table->string('description', 255);
            $table->decimal('amount', 15, 2);
            $table->string('source', 10)->default('MANUAL');
            $table->foreignId('journal_item_id')->nullable()->unique()->constrained('journal_items')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });

        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->char('period', 7)->unique();
            $table->decimal('statement_ending_balance', 15, 2);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_reconciliations');
        Schema::dropIfExists('bank_statement_lines');
    }
};
```

- [ ] **Step 4: Create the models**

Create `backend/app/Models/BankStatementLine.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu mutasi rekening koran Bank BCA. amount positif = uang masuk ke bank, negatif = keluar.
 * journal_item_id terisi bila sudah dicocokkan dengan baris jurnal akun 1-1001.
 */
class BankStatementLine extends Model
{
    protected $fillable = ['statement_date', 'description', 'amount', 'source', 'journal_item_id', 'created_by', 'branch_id'];

    protected $casts = [
        'statement_date' => 'date',
        'amount' => 'decimal:2',
    ];

    public function journalItem(): BelongsTo
    {
        return $this->belongsTo(JournalItem::class);
    }

    public function toApiArray(): array
    {
        $this->loadMissing('journalItem.journalEntry');
        $entry = $this->journalItem?->journalEntry;

        return [
            'id' => $this->id,
            'statement_date' => $this->statement_date->toDateString(),
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'source' => $this->source,
            'journal_item_id' => $this->journal_item_id,
            'matched_entry_number' => $entry?->entry_number,
            'matched_reference_type' => $entry?->reference_type,
            'matched_entry_date' => $entry?->entry_date?->toDateString(),
        ];
    }
}
```

Create `backend/app/Models/BankReconciliation.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Saldo akhir rekening koran satu bulan (diisi pengguna); status rekonsiliasi dihitung ulang setiap laporan.
 */
class BankReconciliation extends Model
{
    protected $fillable = ['period', 'statement_ending_balance', 'updated_by', 'branch_id'];

    protected $casts = ['statement_ending_balance' => 'decimal:2'];
}
```

- [ ] **Step 5: Create the service**

Create `backend/app/Services/Accounting/BankReconciliationService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\BankReconciliation;
use App\Models\BankStatementLine;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Rekonsiliasi Bank BCA (1-1001): mutasi rekening koran dicocokkan 1:1 dengan baris jurnal bank.
 * Saldo rekening koran + setoran dalam perjalanan − pembayaran belum dikliring
 *   = saldo buku + penerimaan bank belum dicatat − pengeluaran bank belum dicatat.
 * Baris jurnal sebelum bulan mutasi rekening koran pertama dianggap sudah cocok (cut-over).
 */
class BankReconciliationService
{
    public const BANK = '1-1001';
    public const CHARGE_ACCOUNT = '6-1012';
    public const INTEREST_ACCOUNT = '4-3000';
    public const REFERENCE_TYPE = 'BANK_RECON_ADJUSTMENT';

    private const MAX_ROWS = 1000;

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{statement_date: string, description: string, amount: float|int|string}  $data
     */
    public function addLine(array $data, User $user, string $source = 'MANUAL'): BankStatementLine
    {
        return BankStatementLine::create([
            'statement_date' => $data['statement_date'],
            'description' => $data['description'],
            'amount' => round((float) $data['amount'], 2),
            'source' => $source,
            'created_by' => $user->id,
            'branch_id' => 3,
        ]);
    }

    /**
     * Impor CSV (semua baris atau tidak sama sekali). Baris yang sama persis dengan mutasi yang sudah
     * tersimpan sebelum impor dilewati, sehingga mengimpor ulang berkas yang sama aman.
     *
     * @return array{imported: int, skipped: int}
     */
    public function import(string $csv, User $user): array
    {
        $rows = self::parseCsv($csv);
        $dates = array_column($rows, 'statement_date');

        return DB::transaction(function () use ($rows, $dates, $user) {
            $existing = BankStatementLine::whereBetween('statement_date', [min($dates), max($dates)])->get()
                ->mapWithKeys(fn (BankStatementLine $l) => [self::key($l->statement_date->toDateString(), $l->description, (float) $l->amount) => true]);

            $imported = 0;
            $skipped = 0;
            foreach ($rows as $row) {
                if (isset($existing[self::key($row['statement_date'], $row['description'], $row['amount'])])) {
                    $skipped++;
                    continue;
                }
                $this->addLine($row, $user, 'CSV');
                $imported++;
            }

            return ['imported' => $imported, 'skipped' => $skipped];
        });
    }

    /**
     * Header wajib: tanggal, keterangan, jumlah (urutan bebas, pemisah ; atau ,).
     *
     * @return list<array{statement_date: string, description: string, amount: float}>
     */
    public static function parseCsv(string $csv): array
    {
        $csv = preg_replace('/^\xEF\xBB\xBF/', '', $csv) ?? $csv;
        $lines = preg_split('/\r\n|\n|\r/', trim($csv)) ?: [];
        $header = (string) array_shift($lines);
        $delimiter = substr_count($header, ';') > substr_count($header, ',') ? ';' : ',';
        $index = array_flip(array_map(fn ($c) => strtolower(trim((string) $c)), str_getcsv($header, $delimiter)));
        foreach (['tanggal', 'keterangan', 'jumlah'] as $column) {
            if (! isset($index[$column])) {
                throw new PosRuleException("Kolom '{$column}' tidak ditemukan. Baris pertama wajib berisi kolom: tanggal, keterangan, jumlah.");
            }
        }

        $today = now()->toDateString();
        $rows = [];
        foreach ($lines as $i => $line) {
            if (trim($line) === '') {
                continue;
            }
            $rowNumber = $i + 2;
            if (count($rows) >= self::MAX_ROWS) {
                throw new PosRuleException('Maksimal '.self::MAX_ROWS.' baris mutasi per impor.');
            }

            $cells = str_getcsv($line, $delimiter);
            $date = self::parseDate(trim((string) ($cells[$index['tanggal']] ?? '')));
            $description = trim((string) ($cells[$index['keterangan']] ?? ''));
            $amount = str_replace(' ', '', trim((string) ($cells[$index['jumlah']] ?? '')));

            if ($date === null || $date > $today) {
                throw new PosRuleException("Baris {$rowNumber}: tanggal harus YYYY-MM-DD atau DD/MM/YYYY dan tidak boleh di masa depan.");
            }
            if ($description === '' || mb_strlen($description) > 255) {
                throw new PosRuleException("Baris {$rowNumber}: keterangan wajib diisi (maksimal 255 karakter).");
            }
            if (! preg_match('/^-?\d+(\.\d{1,2})?$/', $amount) || round((float) $amount, 2) == 0.0) {
                throw new PosRuleException("Baris {$rowNumber}: jumlah harus angka bukan nol tanpa pemisah ribuan (contoh 150000 atau -6500).");
            }

            $rows[] = ['statement_date' => $date, 'description' => $description, 'amount' => round((float) $amount, 2)];
        }

        if ($rows === []) {
            throw new PosRuleException('Berkas tidak berisi baris mutasi.');
        }

        return $rows;
    }

    public function match(int $lineId, int $journalItemId): BankStatementLine
    {
        return DB::transaction(function () use ($lineId, $journalItemId) {
            $line = BankStatementLine::lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id !== null) {
                throw new PosRuleException('Mutasi rekening koran ini sudah dicocokkan.');
            }

            $item = JournalItem::with(['account', 'journalEntry'])->findOrFail($journalItemId);
            if ($item->account?->account_code !== self::BANK || $item->journalEntry?->status !== 'POSTED') {
                throw new PosRuleException('Hanya baris jurnal akun Bank BCA (1-1001) yang dapat dicocokkan.');
            }
            if (BankStatementLine::where('journal_item_id', $item->id)->exists()) {
                throw new PosRuleException('Baris jurnal ini sudah dicocokkan dengan mutasi lain.');
            }
            if (abs(round((float) $item->debit - (float) $item->credit, 2) - (float) $line->amount) >= 0.005) {
                throw new PosRuleException('Nominal dan arah mutasi harus sama dengan baris jurnal (uang masuk = debit, uang keluar = kredit).');
            }

            $line->update(['journal_item_id' => $item->id]);

            return $line->fresh();
        });
    }

    public function unmatch(int $lineId): BankStatementLine
    {
        return DB::transaction(function () use ($lineId) {
            $line = BankStatementLine::with('journalItem.journalEntry')->lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id === null) {
                throw new PosRuleException('Mutasi ini belum dicocokkan.');
            }
            if ($line->journalItem?->journalEntry?->reference_type === self::REFERENCE_TYPE) {
                throw new PosRuleException('Mutasi ini sudah dibukukan sebagai biaya/bunga bank; koreksi lewat jurnal manual.');
            }

            $line->update(['journal_item_id' => null]);

            return $line->fresh();
        });
    }

    public function deleteLine(int $lineId): void
    {
        DB::transaction(function () use ($lineId) {
            $line = BankStatementLine::lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id !== null) {
                throw new PosRuleException('Lepas pencocokan mutasi ini sebelum menghapusnya.');
            }
            $line->delete();
        });
    }

    /** Mutasi yang belum dicatat di buku: keluar → biaya administrasi bank, masuk → bunga bank. */
    public function postAdjustment(int $lineId): JournalEntry
    {
        return DB::transaction(function () use ($lineId) {
            $line = BankStatementLine::lockForUpdate()->findOrFail($lineId);
            if ($line->journal_item_id !== null) {
                throw new PosRuleException('Mutasi ini sudah dicocokkan dengan jurnal.');
            }

            $amount = abs((float) $line->amount);
            $date = $line->statement_date->toDateString();
            $draft = new JournalDraft();
            if ((float) $line->amount > 0) {
                $draft->debit(self::BANK, $amount, $line->description)->credit(self::INTEREST_ACCOUNT, $amount, 'Bunga/jasa giro bank');
                $label = 'Bunga bank';
            } else {
                $draft->debit(self::CHARGE_ACCOUNT, $amount, 'Biaya administrasi bank')->credit(self::BANK, $amount, $line->description);
                $label = 'Biaya administrasi bank';
            }
            $entry = $draft->post($this->engine, self::REFERENCE_TYPE, 'REKON-'.$line->id, "{$label} dari rekening koran {$date}: {$line->description}", $date);

            $bankItem = $entry->items->first(fn (JournalItem $i) => $i->account->account_code === self::BANK);
            $line->update(['journal_item_id' => $bankItem->id]);

            return $entry;
        });
    }

    /** Cocokkan otomatis: nominal & arah sama, selisih tanggal ≤ 3 hari, dan hanya satu kandidat. */
    public function autoMatch(string $period): int
    {
        $end = self::endOf($period);

        return DB::transaction(function () use ($end) {
            $lines = BankStatementLine::whereNull('journal_item_id')->where('statement_date', '<=', $end)
                ->orderBy('statement_date')->orderBy('id')->lockForUpdate()->get();
            $candidates = $this->unmatchedLedgerItems(self::cutover() ?? $end, $end);
            $used = [];
            $matched = 0;

            foreach ($lines as $line) {
                $hits = $candidates->filter(fn ($c) => ! isset($used[$c->id])
                    && abs(round((float) $c->debit - (float) $c->credit, 2) - (float) $line->amount) < 0.005
                    && abs(Carbon::parse($c->entry_date)->diffInDays($line->statement_date, false)) <= 3);
                if ($hits->count() === 1) {
                    $hit = $hits->first();
                    $used[$hit->id] = true;
                    $line->update(['journal_item_id' => $hit->id]);
                    $matched++;
                }
            }

            return $matched;
        });
    }

    public function setStatementBalance(string $period, float $balance, User $user): BankReconciliation
    {
        return BankReconciliation::updateOrCreate(
            ['period' => $period],
            ['statement_ending_balance' => round($balance, 2), 'updated_by' => $user->id, 'branch_id' => 3]
        );
    }

    public function report(string $period): array
    {
        $start = $period.'-01';
        $end = self::endOf($period);
        $from = self::cutover() ?? $start;

        $lines = BankStatementLine::with('journalItem.journalEntry')
            ->whereBetween('statement_date', [$start, $end])
            ->orderBy('statement_date')->orderBy('id')->get();
        $unrecorded = BankStatementLine::whereNull('journal_item_id')->where('statement_date', '<=', $end)
            ->orderBy('statement_date')->orderBy('id')->get();
        $outstanding = $this->unmatchedLedgerItems($from, $end);

        $statement = BankReconciliation::where('period', $period)->value('statement_ending_balance');
        $book = CashFlowReport::cashBalances($end)[self::BANK];

        $depositsInTransit = round($outstanding->sum(fn ($i) => (float) $i->debit), 2);
        $outstandingPayments = round($outstanding->sum(fn ($i) => (float) $i->credit), 2);
        $unrecordedCredits = round($unrecorded->filter(fn ($l) => (float) $l->amount > 0)->sum(fn ($l) => (float) $l->amount), 2);
        $unrecordedDebits = round(-$unrecorded->filter(fn ($l) => (float) $l->amount < 0)->sum(fn ($l) => (float) $l->amount), 2);

        $adjustedBook = round($book + $unrecordedCredits - $unrecordedDebits, 2);
        $adjustedBank = $statement === null ? null : round((float) $statement + $depositsInTransit - $outstandingPayments, 2);
        $difference = $adjustedBank === null ? null : round($adjustedBank - $adjustedBook, 2);

        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => $end,
            'cutover_date' => $from,
            'statement_ending_balance' => $statement === null ? null : (float) $statement,
            'book_balance' => $book,
            'lines' => $lines->map(fn (BankStatementLine $l) => $l->toApiArray())->values()->all(),
            'outstanding_ledger' => $outstanding->map(fn ($i) => [
                'journal_item_id' => $i->id,
                'entry_number' => $i->entry_number,
                'entry_date' => Carbon::parse($i->entry_date)->toDateString(),
                'reference_type' => $i->reference_type,
                'description' => $i->description,
                'debit' => (float) $i->debit,
                'credit' => (float) $i->credit,
            ])->values()->all(),
            'unrecorded_bank' => $unrecorded->map(fn (BankStatementLine $l) => $l->toApiArray())->values()->all(),
            'deposits_in_transit' => $depositsInTransit,
            'outstanding_payments' => $outstandingPayments,
            'unrecorded_credits' => $unrecordedCredits,
            'unrecorded_debits' => $unrecordedDebits,
            'adjusted_bank_balance' => $adjustedBank,
            'adjusted_book_balance' => $adjustedBook,
            'difference' => $difference,
            'is_reconciled' => $difference !== null && abs($difference) < 0.005,
        ];
    }

    /** Baris jurnal 1-1001 yang belum dicocokkan (tanpa jurnal saldo awal akun). */
    private function unmatchedLedgerItems(string $from, string $to): Collection
    {
        $bankId = Account::where('account_code', self::BANK)->value('id');

        return JournalItem::query()
            ->join('journal_entries as e', 'e.id', '=', 'journal_items.journal_entry_id')
            ->where('journal_items.account_id', $bankId)
            ->where('e.status', 'POSTED')
            ->where('e.reference_type', '!=', OpeningBalanceService::REFERENCE_TYPE)
            ->whereBetween('e.entry_date', [$from, $to])
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('bank_statement_lines as b')->whereColumn('b.journal_item_id', 'journal_items.id'))
            ->orderBy('e.entry_date')->orderBy('journal_items.id')
            ->get(['journal_items.id', 'journal_items.debit', 'journal_items.credit', 'e.entry_number', 'e.entry_date', 'e.reference_type', 'e.description']);
    }

    /** Awal bulan mutasi rekening koran pertama; null bila belum ada mutasi. */
    private static function cutover(): ?string
    {
        $first = BankStatementLine::min('statement_date');

        return $first ? Carbon::parse($first)->startOfMonth()->toDateString() : null;
    }

    private static function endOf(string $period): string
    {
        return Carbon::parse($period.'-01')->endOfMonth()->toDateString();
    }

    private static function key(string $date, string $description, float $amount): string
    {
        return $date.'|'.$description.'|'.number_format($amount, 2, '.', '');
    }

    private static function parseDate(string $value): ?string
    {
        foreach (['Y-m-d', 'd/m/Y', 'j/n/Y'] as $format) {
            $date = \DateTime::createFromFormat('!'.$format, $value);
            if ($date !== false && $date->format($format) === $value) {
                return $date->format('Y-m-d');
            }
        }

        return null;
    }
}
```

- [ ] **Step 6: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/BankReconciliationController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Accounting\BankReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankReconciliationController extends Controller
{
    public function __construct(private readonly BankReconciliationService $bank)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);

        return response()->json(['success' => true, 'data' => $this->bank->report($data['period'])]);
    }

    public function updateBalance(Request $request, string $period): JsonResponse
    {
        $data = $request->validate(['statement_ending_balance' => 'required|numeric|min:-100000000000|max:100000000000']);
        $this->bank->setStatementBalance($period, (float) $data['statement_ending_balance'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Saldo akhir rekening koran {$period} disimpan.",
            'data' => $this->bank->report($period),
        ]);
    }

    public function storeLine(Request $request): JsonResponse
    {
        $data = $request->validate([
            'statement_date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|not_in:0|min:-10000000000|max:10000000000',
        ], ['amount.not_in' => 'Nominal mutasi tidak boleh nol.']);

        return response()->json([
            'success' => true,
            'message' => 'Mutasi rekening koran disimpan.',
            'data' => $this->bank->addLine($data, $request->user())->toApiArray(),
        ], 201);
    }

    public function import(Request $request): JsonResponse
    {
        $request->validate(['file' => 'required|file|max:1024|mimes:csv,txt']);
        $result = $this->bank->import($request->file('file')->get(), $request->user());

        return response()->json([
            'success' => true,
            'message' => "{$result['imported']} mutasi diimpor, {$result['skipped']} dilewati karena sudah ada.",
            'data' => $result,
        ], 201);
    }

    public function autoMatch(Request $request): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);
        $matched = $this->bank->autoMatch($data['period']);

        return response()->json(['success' => true, 'message' => "{$matched} mutasi dicocokkan otomatis.", 'data' => ['matched' => $matched]]);
    }

    public function destroyLine(int $id): JsonResponse
    {
        $this->bank->deleteLine($id);

        return response()->json(['success' => true, 'message' => 'Mutasi rekening koran dihapus.', 'data' => null]);
    }

    public function match(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['journal_item_id' => 'required|integer']);

        return response()->json(['success' => true, 'data' => $this->bank->match($id, (int) $data['journal_item_id'])->toApiArray()]);
    }

    public function unmatch(int $id): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $this->bank->unmatch($id)->toApiArray()]);
    }

    public function postAdjustment(int $id): JsonResponse
    {
        $entry = $this->bank->postAdjustment($id);

        return response()->json([
            'success' => true,
            'message' => "Jurnal {$entry->entry_number} dibukukan dari rekening koran.",
            'data' => ['journals' => [$entry->toApiArray()]],
        ], 201);
    }
}
```

- [ ] **Step 7: Register the routes**

In `backend/routes/api.php` replace:

```php
use App\Http\Controllers\Api\v1\AuthController;
```

with:

```php
use App\Http\Controllers\Api\v1\AuthController;
use App\Http\Controllers\Api\v1\BankReconciliationController;
```

and, inside our SP4 block, replace:

```php
        Route::post('accounting/adjusting-entries', [AdjustingEntryController::class, 'store'])->middleware('permission:accounting_hub');
```

with:

```php
        Route::post('accounting/adjusting-entries', [AdjustingEntryController::class, 'store'])->middleware('permission:accounting_hub');
        Route::prefix('accounting/bank-reconciliation')->middleware('permission:bank_reconciliation')->group(function () {
            Route::get('/', [BankReconciliationController::class, 'show']);
            Route::put('{period}', [BankReconciliationController::class, 'updateBalance'])->where('period', '\d{4}-\d{2}');
            Route::post('lines', [BankReconciliationController::class, 'storeLine']);
            Route::post('import', [BankReconciliationController::class, 'import']);
            Route::post('auto-match', [BankReconciliationController::class, 'autoMatch']);
            Route::delete('lines/{id}', [BankReconciliationController::class, 'destroyLine'])->whereNumber('id');
            Route::post('lines/{id}/match', [BankReconciliationController::class, 'match'])->whereNumber('id');
            Route::post('lines/{id}/unmatch', [BankReconciliationController::class, 'unmatch'])->whereNumber('id');
            Route::post('lines/{id}/post-adjustment', [BankReconciliationController::class, 'postAdjustment'])->whereNumber('id');
        });
```

- [ ] **Step 8: Migrate both databases and run the tests**

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force
php artisan config:clear && php artisan test --filter=BankReconciliationApiTest
```

Expected: migration `2026_10_04_000003_create_bank_reconciliation_tables` runs on both DBs; 8 tests PASS.

- [ ] **Step 9: Run the full backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests PASS.

- [ ] **Step 10: Commit**

```bash
git status --short
git add backend/database/migrations/2026_10_04_000003_create_bank_reconciliation_tables.php \
        backend/app/Models/BankStatementLine.php \
        backend/app/Models/BankReconciliation.php \
        backend/app/Services/Accounting/BankReconciliationService.php \
        backend/app/Http/Controllers/Api/v1/BankReconciliationController.php \
        backend/routes/api.php \
        backend/tests/Feature/BankReconciliationApiTest.php
git commit -m "$(cat <<'EOF'
feat(accounting): reconcile bank bca against the statement

Statement lines are entered or imported from CSV, matched 1:1 to 1-1001
journal lines (by hand or automatically within three days), and bank
charges or interest found only on the statement are booked to 6-1012 or
4-3000. The monthly report proves statement and ledger balances agree.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B6: CALK endpoint

**Files:**
- Create: `backend/app/Services/Accounting/CalkReport.php`, `backend/app/Http/Controllers/Api/v1/CalkController.php`, `backend/tests/Feature/CalkReportTest.php`
- Modify: `backend/routes/api.php`

**Interfaces:**
- Consumes: `LedgerBalances`, `AccountBalance`, `FinancialReportService::balanceSheet()`, `BankReconciliationService::report()` (B5), `FixedAsset` (B2), `Purchase`/`PurchasePayment`, `ProductBatch`.
- Produces: `GET /api/v1/reports/calk?period=YYYY-MM` (`financial_reports`, `accounting_hub`) →
  `data: {period, start_date, end_date, entity{name,address,activity,legal_form,tax_status,currency}, compliance, policies[{title, body}], notes{cash_and_bank{lines[{code,name,amount}], total, bank_statement_balance|null, bank_reconciled|null}, inventory{ledger_balance, method, breakdown[{category, quantity, value}], breakdown_as_of|null}, prepaid_expenses{balance}, accrued_expenses{balance}, fixed_assets{assets[{code,name,category,acquisition_date,useful_life_months,cost,accumulated,book_value}], total_cost, total_accumulated, total_book_value, ledger_cost, ledger_accumulated, depreciation_expense}, payables{suppliers[{supplier_name, amount}], subledger_total, other_adjustments, ledger_balance}, equity{lines[{code,name,amount}], total}}}`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/CalkReportTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CalkReportTest extends TestCase
{
    use DatabaseTransactions;

    private const URL = '/api/v1/reports/calk';

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), 'TEST', 'CALK-'.uniqid(), 'Uji CALK', $date);
    }

    public function test_calk_states_compliance_entity_and_policies(): void
    {
        $data = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data');

        $this->assertSame('2019-06', $data['period']);
        $this->assertSame('2019-06-30', $data['end_date']);
        $this->assertSame('Omah Ban Cabang 3', $data['entity']['name']);
        $this->assertStringContainsString('SAK EMKM', $data['compliance']);

        $policies = implode(' ', array_column($data['policies'], 'body'));
        $this->assertStringContainsString('FIFO', $policies);
        $this->assertStringContainsString('garis lurus', $policies);
        $this->assertStringContainsString('PPh Final sebesar 0,5%', $policies);
        $this->assertStringContainsString('non-PKP', $policies);
    }

    public function test_notes_agree_with_the_ledger_at_period_end(): void
    {
        $this->postJournal('2019-06-03', [['1-1001', 5000000, 0], ['3-1000', 0, 5000000]]);
        $this->postJournal('2019-06-04', [['1-1100', 1200000, 0], ['1-1001', 0, 1200000]]);
        $this->postJournal('2019-06-30', [['6-1001', 300000, 0], ['2-1100', 0, 300000]]);

        $purchase = Purchase::create([
            'purchase_number' => 'GR-CALK-'.uniqid(), 'supplier_name' => 'PT Uji Ban', 'purchase_date' => '2019-06-05',
            'payment_method' => 'TEMPO', 'total_amount' => 1000000, 'paid_amount' => 400000, 'status' => 'SEBAGIAN',
        ]);
        $this->postJournal('2019-06-05', [['1-2000', 1000000, 0], ['2-1000', 0, 1000000]]);
        PurchasePayment::create(['purchase_id' => $purchase->id, 'payment_date' => '2019-06-20', 'amount' => 400000, 'account_code' => '1-1001']);
        $this->postJournal('2019-06-20', [['2-1000', 400000, 0], ['1-1001', 0, 400000]]);
        // Pembayaran sesudah akhir periode tidak mengurangi hutang per 30 Juni.
        PurchasePayment::create(['purchase_id' => $purchase->id, 'payment_date' => '2019-07-02', 'amount' => 100000, 'account_code' => '1-1001']);

        $notes = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data.notes');

        $cash = CashFlowReport::cashBalances('2019-06-30');
        $this->assertEquals(round($cash['1-1000'] + $cash['1-1001'], 2), $notes['cash_and_bank']['total']);
        $this->assertSame(['1-1000', '1-1001'], array_column($notes['cash_and_bank']['lines'], 'code'));

        $sheet = app(FinancialReportService::class)->balanceSheet('2019-06-30');
        $this->assertEquals($sheet['equity']['total'], $notes['equity']['total']);
        $prepaid = collect($sheet['current_assets']['lines'])->firstWhere('code', '1-1100')['amount'];
        $accrued = collect($sheet['liabilities']['lines'])->firstWhere('code', '2-1100')['amount'];
        $this->assertEquals($prepaid, $notes['prepaid_expenses']['balance']);
        $this->assertEquals($accrued, $notes['accrued_expenses']['balance']);

        $supplier = collect($notes['payables']['suppliers'])->firstWhere('supplier_name', 'PT Uji Ban');
        $this->assertEquals(600000, $supplier['amount']);
        $this->assertEquals(
            round($notes['payables']['ledger_balance'] - $notes['payables']['subledger_total'], 2),
            $notes['payables']['other_adjustments']
        );
    }

    public function test_fixed_asset_note_follows_the_register_and_depreciation(): void
    {
        $this->postJson('/api/v1/accounting/fixed-assets', [
            'name' => 'Kompresor Angin', 'category' => 'PERALATAN_BENGKEL', 'acquisition_date' => '2019-06-03',
            'acquisition_cost' => 2400000, 'useful_life_months' => 24, 'funding' => 'TUNAI',
        ])->assertCreated();
        $this->postJson('/api/v1/accounting/fixed-assets/depreciation', ['period' => '2019-06'])->assertCreated();

        $note = $this->getJson(self::URL.'?period=2019-06')->assertOk()->json('data.notes.fixed_assets');
        $asset = collect($note['assets'])->firstWhere('name', 'Kompresor Angin');

        $this->assertEquals(2400000, $asset['cost']);
        $this->assertEquals(100000, $asset['accumulated']);
        $this->assertEquals(2300000, $asset['book_value']);
        $this->assertSame('Peralatan & Mesin Bengkel', $asset['category']);
        $this->assertEquals(100000, $note['depreciation_expense']);

        $this->getJson(self::URL.'?period=2019-05')->assertOk()->assertJsonPath('data.notes.fixed_assets.assets', []);
    }

    public function test_inventory_breakdown_is_only_given_for_the_current_month(): void
    {
        $this->getJson(self::URL.'?period=2019-06')
            ->assertOk()
            ->assertJsonPath('data.notes.inventory.method', 'FIFO')
            ->assertJsonPath('data.notes.inventory.breakdown', [])
            ->assertJsonPath('data.notes.inventory.breakdown_as_of', null);

        $this->getJson(self::URL.'?period='.now()->format('Y-m'))
            ->assertOk()
            ->assertJsonPath('data.notes.inventory.breakdown_as_of', now()->toDateString());
    }

    public function test_period_is_required_and_cannot_be_in_the_future(): void
    {
        $this->getJson(self::URL)->assertStatus(422)->assertJsonValidationErrors('period');
        $this->getJson(self::URL.'?period='.now()->addMonthNoOverflow()->format('Y-m'))->assertStatus(422);
    }

    public function test_roles_without_report_access_are_forbidden(): void
    {
        $this->actingAsRole('KASIR');
        $this->getJson(self::URL.'?period=2019-06')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=CalkReportTest`
Expected: FAIL — `/api/v1/reports/calk` returns 404.

- [ ] **Step 3: Create the CALK service**

Create `backend/app/Services/Accounting/CalkReport.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\BankReconciliation;
use App\Models\FixedAsset;
use App\Models\ProductBatch;
use App\Models\Purchase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Catatan atas Laporan Keuangan (CALK) SAK EMKM untuk satu bulan: informasi entitas, pernyataan kepatuhan,
 * ikhtisar kebijakan akuntansi, dan rincian pos per akhir bulan. Angka dibaca dari jurnal yang sama dengan
 * laporan posisi keuangan, sehingga catatan selalu cocok dengan laporannya.
 */
class CalkReport
{
    public const ENTITY = [
        'name' => 'Omah Ban Cabang 3',
        'address' => 'Magelang, Jawa Tengah',
        'activity' => 'Perdagangan eceran ban kendaraan bermotor serta jasa spooring dan balancing.',
        'legal_form' => 'Usaha mikro, kecil dan menengah (UMKM) milik perseorangan.',
        'tax_status' => 'Wajib pajak UMKM, bukan Pengusaha Kena Pajak (non-PKP).',
        'currency' => 'Rupiah (Rp)',
    ];

    public const COMPLIANCE = 'Laporan keuangan Omah Ban Cabang 3 disusun sesuai dengan Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah (SAK EMKM) yang diterbitkan oleh Dewan Standar Akuntansi Keuangan Ikatan Akuntan Indonesia.';

    public function __construct(
        private readonly FinancialReportService $reports,
        private readonly BankReconciliationService $bank,
    ) {
    }

    public function build(string $period): array
    {
        $start = $period.'-01';
        $end = Carbon::parse($start)->endOfMonth()->toDateString();
        /** @var Collection<string, AccountBalance> $balances */
        $balances = LedgerBalances::forRange(null, $end)->keyBy(fn (AccountBalance $b) => $b->account->account_code);
        $monthly = LedgerBalances::forRange($start, $end, excludeClosing: true)->keyBy(fn (AccountBalance $b) => $b->account->account_code);

        return [
            'period' => $period,
            'start_date' => $start,
            'end_date' => $end,
            'entity' => self::ENTITY,
            'compliance' => self::COMPLIANCE,
            'policies' => self::policies(),
            'notes' => [
                'cash_and_bank' => $this->cashAndBank($period, $balances),
                'inventory' => $this->inventory($period, self::balance($balances, '1-2000', 'DEBIT')),
                'prepaid_expenses' => ['balance' => self::balance($balances, '1-1100', 'DEBIT')],
                'accrued_expenses' => ['balance' => self::balance($balances, '2-1100', 'CREDIT')],
                'fixed_assets' => $this->fixedAssets($period, $end, $balances, self::balance($monthly, DepreciationService::EXPENSE_ACCOUNT, 'DEBIT')),
                'payables' => $this->payables($end, self::balance($balances, '2-1000', 'CREDIT')),
                'equity' => $this->reports->balanceSheet($end)['equity'],
            ],
        ];
    }

    /** @return list<array{title: string, body: string}> */
    private static function policies(): array
    {
        return [
            ['title' => 'Dasar penyusunan', 'body' => 'Laporan keuangan disusun dengan asumsi kelangsungan usaha dan dasar akrual, menggunakan konsep biaya historis, dan disajikan dalam Rupiah. Laporan keuangan terdiri atas laporan posisi keuangan, laporan laba rugi, dan catatan atas laporan keuangan; laporan perubahan ekuitas dan laporan arus kas disajikan sebagai informasi tambahan.'],
            ['title' => 'Kas dan bank', 'body' => 'Kas terdiri atas kas laci toko (1-1000) dan rekening Bank BCA (1-1001). Saldo bank dicocokkan dengan rekening koran setiap bulan melalui rekonsiliasi bank; biaya administrasi dan bunga bank yang baru diketahui dari rekening koran dibukukan pada tanggal mutasinya.'],
            ['title' => 'Persediaan', 'body' => 'Persediaan ban diukur sebesar biaya perolehan dengan metode masuk pertama keluar pertama (FIFO). Biaya perolehan mencakup harga faktur pemasok termasuk PPN Masukan, karena entitas bukan PKP sehingga PPN tersebut tidak dapat dikreditkan. Selisih hasil stok opname diakui sebagai beban selisih persediaan (5-2000).'],
            ['title' => 'Aset tetap dan penyusutan', 'body' => 'Aset tetap diakui sebesar biaya perolehan dan diukur dengan model biaya tanpa revaluasi. Penyusutan dihitung dengan metode garis lurus atas biaya perolehan dikurangi nilai residu selama umur manfaat dalam bulan, dimulai pada bulan perolehan (bulan penuh), dan dibukukan setiap akhir bulan sebagai Beban Penyusutan Aset Tetap (6-1011) dengan lawan Akumulasi Penyusutan (1-3999).'],
            ['title' => 'Pengakuan pendapatan', 'body' => 'Pendapatan penjualan ban dan jasa bengkel diakui pada saat barang diserahkan atau jasa selesai dan dibayar lunas di kasir (tunai, transfer atau QRIS). Potongan harga dan retur penjualan disajikan sebagai pengurang pendapatan, dan biaya MDR QRIS diakui sebagai beban. Pendapatan bunga bank diakui pada saat dikreditkan ke rekening.'],
            ['title' => 'Beban', 'body' => 'Beban diakui pada saat terjadi (dasar akrual). Pada akhir bulan, beban yang sudah terjadi tetapi belum dibayar dicatat sebagai Beban Yang Masih Harus Dibayar (2-1100) dan dapat dibalik otomatis pada tanggal 1 bulan berikutnya; pembayaran di muka dicatat sebagai Beban Dibayar di Muka (1-1100) dan dibebankan sesuai periode manfaatnya melalui jurnal penyesuaian.'],
            ['title' => 'Pajak', 'body' => 'Entitas bukan Pengusaha Kena Pajak (non-PKP), sehingga tidak memungut PPN atas penjualan. Sebagai wajib pajak UMKM, entitas dikenai PPh Final sebesar 0,5% dari peredaran bruto berdasarkan PP Nomor 55 Tahun 2022. Sistem belum menghitung atau mencadangkan PPh Final secara otomatis; pajak yang disetor dicatat sebagai Beban Pajak & Retribusi Daerah (6-1008) pada saat pembayaran.'],
        ];
    }

    /** @param Collection<string, AccountBalance> $balances */
    private function cashAndBank(string $period, Collection $balances): array
    {
        $lines = array_map(fn (string $code) => [
            'code' => $code,
            'name' => $balances[$code]->account->account_name,
            'amount' => $balances[$code]->signed('DEBIT'),
        ], CashFlowReport::CASH_ACCOUNTS);

        $reconciliation = BankReconciliation::where('period', $period)->exists() ? $this->bank->report($period) : null;

        return [
            'lines' => $lines,
            'total' => round(array_sum(array_column($lines, 'amount')), 2),
            'bank_statement_balance' => $reconciliation['statement_ending_balance'] ?? null,
            'bank_reconciled' => $reconciliation['is_reconciled'] ?? null,
        ];
    }

    /** Rincian FIFO per kategori hanya tersedia untuk posisi saat ini (tidak ada nilai batch historis). */
    private function inventory(string $period, float $ledgerBalance): array
    {
        $current = $period === now()->format('Y-m');
        $breakdown = ! $current ? [] : ProductBatch::query()
            ->join('products as p', 'p.id', '=', 'product_batches.product_id')
            ->leftJoin('product_categories as c', 'c.id', '=', 'p.category_id')
            ->where('product_batches.remaining_qty', '>', 0)
            ->groupBy('c.category_name')
            ->orderBy('c.category_name')
            ->selectRaw("COALESCE(c.category_name, 'Tanpa kategori') as category, SUM(product_batches.remaining_qty) as quantity, SUM(product_batches.remaining_qty * product_batches.batch_cost) as value")
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'quantity' => (int) $row->quantity, 'value' => round((float) $row->value, 2)])
            ->values()->all();

        return [
            'ledger_balance' => $ledgerBalance,
            'method' => 'FIFO',
            'breakdown' => $breakdown,
            'breakdown_as_of' => $current ? now()->toDateString() : null,
        ];
    }

    /** @param Collection<string, AccountBalance> $balances */
    private function fixedAssets(string $period, string $end, Collection $balances, float $expense): array
    {
        $assets = FixedAsset::where('acquisition_date', '<=', $end)
            ->where(fn ($q) => $q->where('status', 'ACTIVE')->orWhere('voided_at', '>', $end.' 23:59:59'))
            ->withSum(['depreciations as posted_through' => fn ($q) => $q->where('period', '<=', $period)], 'amount')
            ->orderBy('code')
            ->get()
            ->map(function (FixedAsset $a) {
                $accumulated = round((float) $a->opening_accumulated_depreciation + (float) ($a->posted_through ?? 0), 2);

                return [
                    'code' => $a->code,
                    'name' => $a->name,
                    'category' => FixedAsset::CATEGORIES[$a->category] ?? $a->category,
                    'acquisition_date' => $a->acquisition_date->toDateString(),
                    'useful_life_months' => $a->useful_life_months,
                    'cost' => (float) $a->acquisition_cost,
                    'accumulated' => $accumulated,
                    'book_value' => round((float) $a->acquisition_cost - $accumulated, 2),
                ];
            })->values()->all();

        $cost = round(array_sum(array_column($assets, 'cost')), 2);
        $accumulated = round(array_sum(array_column($assets, 'accumulated')), 2);

        return [
            'assets' => $assets,
            'total_cost' => $cost,
            'total_accumulated' => $accumulated,
            'total_book_value' => round($cost - $accumulated, 2),
            'ledger_cost' => self::balance($balances, FixedAssetService::ASSET_ACCOUNT, 'DEBIT'),
            'ledger_accumulated' => self::balance($balances, FixedAssetService::ACCUMULATED_ACCOUNT, 'CREDIT'),
            'depreciation_expense' => $expense,
        ];
    }

    /**
     * Hutang pemasok per akhir bulan dari faktur TEMPO dikurangi pembayaran s/d tanggal itu; selisih terhadap
     * saldo 2-1000 (retur pembelian, koreksi) ditampilkan sebagai penyesuaian lain agar total sama dengan buku besar.
     */
    private function payables(string $end, float $ledgerBalance): array
    {
        $suppliers = Purchase::where('payment_method', 'TEMPO')
            ->where('purchase_date', '<=', $end)
            ->withSum(['payments as paid_through' => fn ($q) => $q->where('payment_date', '<=', $end)], 'amount')
            ->get()
            ->groupBy('supplier_name')
            ->map(fn (Collection $group, string $name) => [
                'supplier_name' => $name,
                'amount' => round($group->sum(fn (Purchase $p) => (float) $p->total_amount - (float) ($p->paid_through ?? 0)), 2),
            ])
            ->filter(fn (array $row) => abs($row['amount']) >= 0.005)
            ->sortBy('supplier_name')
            ->values()->all();

        $subledger = round(array_sum(array_column($suppliers, 'amount')), 2);

        return [
            'suppliers' => $suppliers,
            'subledger_total' => $subledger,
            'other_adjustments' => round($ledgerBalance - $subledger, 2),
            'ledger_balance' => $ledgerBalance,
        ];
    }

    /** @param Collection<string, AccountBalance> $balances */
    private static function balance(Collection $balances, string $code, string $side): float
    {
        return isset($balances[$code]) ? $balances[$code]->signed($side) : 0.0;
    }
}
```

- [ ] **Step 4: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/CalkController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Exceptions\PosRuleException;
use App\Http\Controllers\Controller;
use App\Services\Accounting\CalkReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalkController extends Controller
{
    public function show(Request $request, CalkReport $calk): JsonResponse
    {
        $data = $request->validate(['period' => 'required|date_format:Y-m']);
        if ($data['period'] > now()->format('Y-m')) {
            throw new PosRuleException('CALK hanya dapat disusun untuk bulan berjalan atau bulan sebelumnya.');
        }

        return response()->json(['success' => true, 'data' => $calk->build($data['period'])]);
    }
}
```

- [ ] **Step 5: Register the route**

In `backend/routes/api.php` replace:

```php
use App\Http\Controllers\Api\v1\BankReconciliationController;
```

with:

```php
use App\Http\Controllers\Api\v1\BankReconciliationController;
use App\Http\Controllers\Api\v1\CalkController;
```

and, at the end of our SP4 block, replace:

```php
            Route::post('lines/{id}/post-adjustment', [BankReconciliationController::class, 'postAdjustment'])->whereNumber('id');
        });
```

with:

```php
            Route::post('lines/{id}/post-adjustment', [BankReconciliationController::class, 'postAdjustment'])->whereNumber('id');
        });
        Route::get('reports/calk', [CalkController::class, 'show'])->middleware('permission:financial_reports,accounting_hub');
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter=CalkReportTest`
Expected: 6 tests PASS.

- [ ] **Step 7: Run the full backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/app/Services/Accounting/CalkReport.php \
        backend/app/Http/Controllers/Api/v1/CalkController.php \
        backend/routes/api.php \
        backend/tests/Feature/CalkReportTest.php
git commit -m "$(cat <<'EOF'
feat(accounting): serve the sak emkm calk per month

The CALK now comes from the server: compliance statement, entity data,
accounting policies (FIFO, straight-line depreciation, revenue, accruals,
PPh Final 0.5% as policy text only) and notes for cash and bank,
inventory, prepaid and accrued expenses, fixed assets, payables and
equity, all read from the same ledger as the statements.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---
# Part F — Frontend

All components below live in `src/modules/accounting/components/` and follow the existing accounting screens:
server data through `useServerData`, inline `ServerStatus` on error, toasts via `useToast()` from
`src/shared/components`, money through `formatRupiah`, month pickers as `<input type="month">`.

### Task F1: Permissions, types, API client and journal filters

**Files:**
- Create: `src/shared/types/sakEmkm.ts`, `src/services/api/sakEmkmApi.ts`, `src/services/__tests__/sakEmkmApi.test.ts`
- Modify: `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/services/authNavigationService.ts`, `src/services/__tests__/authNavigationService.test.ts`, `src/services/api/index.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/modules/accounting/components/ManualJournalModal.tsx`

**Interfaces:**
- Consumes: the B2–B6 endpoints and shapes.
- Produces:
  - `PermissionKey` gains `'fixed_assets' | 'bank_reconciliation'`; `isScreenPermittedForRole('ledger')` also accepts those two keys.
  - Types in `src/shared/types/sakEmkm.ts`: `FixedAssetCategory`, `FixedAssetFunding`, `FixedAsset`, `FixedAssetRegister`, `FixedAssetInput`, `DepreciationPreview`, `AdjustingKind`, `AdjustingEntryInput`, `BankStatementLine`, `OutstandingLedgerItem`, `BankReconciliationReport`, `CalkLine`, `CalkFixedAsset`, `CalkReport`.
  - `sakEmkmApi` (exported from `src/services/api`): `fixedAssets()`, `createFixedAsset(input)`, `voidFixedAsset(id, reason)`, `depreciationPreview(period)`, `runDepreciation(period)` (returns the whole envelope `{message?, data: {journals}}`), `createAdjustingEntry(input)`, `bankReconciliation(period)`, `setStatementBalance(period, balance)`, `addStatementLine(input)`, `importStatement(file)`, `deleteStatementLine(id)`, `matchStatementLine(id, journalItemId)`, `unmatchStatementLine(id)`, `postBankAdjustment(id)`, `autoMatch(period)`, `calk(period)`.
  - Journal filter groups `ASSET` (Aset Tetap), `AJP` (AJP Akrual/Prabayar), `BANK_RECON` (Rekonsiliasi Bank) and badges for the six new reference types.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/sakEmkmApi.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sakEmkmApi } from '../api/sakEmkmApi';

const okFetch = (data: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, message: 'ok', data }) });

describe('sakEmkmApi', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests the CALK of one month', async () => {
    const fetchMock = okFetch({ period: '2026-09' });
    vi.stubGlobal('fetch', fetchMock);

    await expect(sakEmkmApi.calk('2026-09')).resolves.toEqual({ period: '2026-09' });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/reports\/calk\?period=2026-09$/);
  });

  it('posts the depreciation run and keeps the server message', async () => {
    const fetchMock = okFetch({ journals: [] });
    vi.stubGlobal('fetch', fetchMock);

    const res = await sakEmkmApi.runDepreciation('2026-09');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/accounting\/fixed-assets\/depreciation$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ period: '2026-09' });
    expect(res.message).toBe('ok');
    expect(res.data.journals).toEqual([]);
  });

  it('sends the statement file as multipart form data', async () => {
    const fetchMock = okFetch({ imported: 2, skipped: 0 });
    vi.stubGlobal('fetch', fetchMock);

    await sakEmkmApi.importStatement(new File(['tanggal,keterangan,jumlah\n'], 'rk.csv', { type: 'text/csv' }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/accounting\/bank-reconciliation\/import$/);
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });
});
```

In `src/services/__tests__/authNavigationService.test.ts`, replace the test `default role permissions list exactly the 13 server keys (no booking DP or BON)` — its name and `toHaveLength(13)` may already carry 16 or 18 after SP2/SP3; replace the whole `it(...)` block whatever its number — with (N = the number in the current file + 2; 15 on the pre-SP2 base, 20 after SP2 + SP3 as allocated):

```ts
  it('default role permissions list every server key, SAK EMKM keys denied', () => {
    for (const role of ['KASIR', 'GUDANG'] as const) {
      const keys = Object.keys(DEFAULT_ROLE_PERMISSIONS[role]);
      expect(keys).toHaveLength(N);
      expect(keys).not.toContain('booking_dp');
      expect(keys).not.toContain('bon_receivable');
      expect(DEFAULT_ROLE_PERMISSIONS[role].fixed_assets).toBe(false);
      expect(DEFAULT_ROLE_PERMISSIONS[role].bank_reconciliation).toBe(false);
    }
  });

  it('ledger screen opens for fixed asset or bank reconciliation access alone', () => {
    const onlyAssets = { ...DEFAULT_ROLE_PERMISSIONS, GUDANG: { ...DEFAULT_ROLE_PERMISSIONS.GUDANG, fixed_assets: true } };
    const onlyBank = { ...DEFAULT_ROLE_PERMISSIONS, KASIR: { ...DEFAULT_ROLE_PERMISSIONS.KASIR, bank_reconciliation: true } };
    expect(isScreenPermittedForRole('ledger', 'GUDANG', onlyAssets)).toBe(true);
    expect(isScreenPermittedForRole('ledger', 'KASIR', onlyBank)).toBe(true);
  });
```

(write the literal number instead of `N`).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/__tests__/sakEmkmApi.test.ts src/services/__tests__/authNavigationService.test.ts`
Expected: FAIL — `../api/sakEmkmApi` cannot be resolved; the key count is still the old one and `fixed_assets` is undefined.

- [ ] **Step 3: Add the types**

Create `src/shared/types/sakEmkm.ts`:

```ts
// Tipe SP4 (SAK EMKM): aset tetap, penyusutan, AJP, rekonsiliasi bank, CALK. Bentuk kabel = bentuk UI.

export type FixedAssetCategory = 'PERALATAN_BENGKEL' | 'INVENTARIS_TOKO' | 'KENDARAAN';
export type FixedAssetFunding = 'TUNAI' | 'TRANSFER' | 'OPENING';

export interface FixedAsset {
  id: number;
  code: string;
  name: string;
  category: FixedAssetCategory;
  category_label: string;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  /** YYYY-MM, bulan pertama yang disusutkan sistem. */
  depreciation_start: string;
  opening_accumulated_depreciation: number;
  monthly_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;
  last_depreciated_period: string | null;
  funding: FixedAssetFunding;
  journal_entry_number: string | null;
  status: 'ACTIVE' | 'VOID';
  notes: string | null;
  void_reason: string | null;
}

export interface FixedAssetRegister {
  assets: FixedAsset[];
  summary: {
    total_cost: number;
    total_accumulated: number;
    total_book_value: number;
    ledger_cost: number;
    ledger_accumulated: number;
    difference_cost: number;
    difference_accumulated: number;
  };
}

export interface FixedAssetInput {
  name: string;
  category: FixedAssetCategory;
  acquisition_date: string;
  acquisition_cost: number;
  residual_value: number;
  useful_life_months: number;
  funding: FixedAssetFunding;
  /** Hanya untuk OPENING. */
  depreciation_start?: string;
  /** Hanya untuk OPENING. */
  opening_accumulated_depreciation?: number;
  notes?: string;
}

export interface DepreciationPreview {
  period: string;
  end_date: string;
  is_locked: boolean;
  blocked_reason: string | null;
  lines: { fixed_asset_id: number; code: string; name: string; amount: number }[];
  total: number;
  posted: { entry_number: string; entry_date: string; total: number }[];
}

export type AdjustingKind = 'ACCRUAL' | 'PREPAID';

export interface AdjustingEntryInput {
  period: string;
  kind: AdjustingKind;
  account_code: string;
  amount: number;
  description: string;
  auto_reverse: boolean;
}

export interface BankStatementLine {
  id: number;
  statement_date: string;
  description: string;
  /** Positif = uang masuk ke bank, negatif = keluar. */
  amount: number;
  source: 'MANUAL' | 'CSV';
  journal_item_id: number | null;
  matched_entry_number: string | null;
  matched_reference_type: string | null;
  matched_entry_date: string | null;
}

export interface OutstandingLedgerItem {
  journal_item_id: number;
  entry_number: string;
  entry_date: string;
  reference_type: string;
  description: string;
  debit: number;
  credit: number;
}

export interface BankReconciliationReport {
  period: string;
  start_date: string;
  end_date: string;
  cutover_date: string;
  statement_ending_balance: number | null;
  book_balance: number;
  lines: BankStatementLine[];
  outstanding_ledger: OutstandingLedgerItem[];
  unrecorded_bank: BankStatementLine[];
  deposits_in_transit: number;
  outstanding_payments: number;
  unrecorded_credits: number;
  unrecorded_debits: number;
  adjusted_bank_balance: number | null;
  adjusted_book_balance: number;
  difference: number | null;
  is_reconciled: boolean;
}

export interface CalkLine {
  code: string | null;
  name: string;
  amount: number;
}

export interface CalkFixedAsset {
  code: string;
  name: string;
  category: string;
  acquisition_date: string;
  useful_life_months: number;
  cost: number;
  accumulated: number;
  book_value: number;
}

export interface CalkReport {
  period: string;
  start_date: string;
  end_date: string;
  entity: { name: string; address: string; activity: string; legal_form: string; tax_status: string; currency: string };
  compliance: string;
  policies: { title: string; body: string }[];
  notes: {
    cash_and_bank: { lines: CalkLine[]; total: number; bank_statement_balance: number | null; bank_reconciled: boolean | null };
    inventory: { ledger_balance: number; method: string; breakdown: { category: string; quantity: number; value: number }[]; breakdown_as_of: string | null };
    prepaid_expenses: { balance: number };
    accrued_expenses: { balance: number };
    fixed_assets: {
      assets: CalkFixedAsset[];
      total_cost: number;
      total_accumulated: number;
      total_book_value: number;
      ledger_cost: number;
      ledger_accumulated: number;
      depreciation_expense: number;
    };
    payables: { suppliers: { supplier_name: string; amount: number }[]; subledger_total: number; other_adjustments: number; ledger_balance: number };
    equity: { lines: CalkLine[]; total: number };
  };
}
```

- [ ] **Step 4: Add the API client**

Create `src/services/api/sakEmkmApi.ts`:

```ts
import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';
import type {
  AdjustingEntryInput,
  BankReconciliationReport,
  BankStatementLine,
  CalkReport,
  DepreciationPreview,
  FixedAsset,
  FixedAssetInput,
  FixedAssetRegister,
} from '../../shared/types/sakEmkm';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

type Journals = { journals: ApiJournal[] };

const data = <T>(request: Promise<Envelope<T>>): Promise<T> => request.then((r) => r.data);
const BANK = '/accounting/bank-reconciliation';

/** SP4 SAK EMKM: register aset tetap & penyusutan, AJP, rekonsiliasi bank, CALK. */
export const sakEmkmApi = {
  fixedAssets: () => data(apiClient.get<Envelope<FixedAssetRegister>>('/accounting/fixed-assets')),
  createFixedAsset: (input: FixedAssetInput) =>
    data(apiClient.post<Envelope<{ asset: FixedAsset } & Journals>>('/accounting/fixed-assets', input)),
  voidFixedAsset: (id: number, reason: string) =>
    data(apiClient.post<Envelope<{ asset: FixedAsset } & Journals>>(`/accounting/fixed-assets/${id}/void`, { reason })),
  depreciationPreview: (period: string) =>
    data(apiClient.get<Envelope<DepreciationPreview>>('/accounting/fixed-assets/depreciation', { period })),
  /** Amplop lengkap: pesan server membedakan "dibukukan" dan "tidak ada penyusutan". */
  runDepreciation: (period: string) => apiClient.post<Envelope<Journals>>('/accounting/fixed-assets/depreciation', { period }),
  createAdjustingEntry: (input: AdjustingEntryInput) =>
    data(apiClient.post<Envelope<Journals>>('/accounting/adjusting-entries', input)),
  bankReconciliation: (period: string) => data(apiClient.get<Envelope<BankReconciliationReport>>(BANK, { period })),
  setStatementBalance: (period: string, balance: number) =>
    data(apiClient.put<Envelope<BankReconciliationReport>>(`${BANK}/${period}`, { statement_ending_balance: balance })),
  addStatementLine: (input: { statement_date: string; description: string; amount: number }) =>
    data(apiClient.post<Envelope<BankStatementLine>>(`${BANK}/lines`, input)),
  importStatement: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return data(apiClient.upload<Envelope<{ imported: number; skipped: number }>>(`${BANK}/import`, form));
  },
  deleteStatementLine: (id: number) => apiClient.delete<Envelope<null>>(`${BANK}/lines/${id}`),
  matchStatementLine: (id: number, journalItemId: number) =>
    data(apiClient.post<Envelope<BankStatementLine>>(`${BANK}/lines/${id}/match`, { journal_item_id: journalItemId })),
  unmatchStatementLine: (id: number) => data(apiClient.post<Envelope<BankStatementLine>>(`${BANK}/lines/${id}/unmatch`)),
  postBankAdjustment: (id: number) => data(apiClient.post<Envelope<Journals>>(`${BANK}/lines/${id}/post-adjustment`)),
  autoMatch: (period: string) => data(apiClient.post<Envelope<{ matched: number }>>(`${BANK}/auto-match`, { period })),
  calk: (period: string) => data(apiClient.get<Envelope<CalkReport>>('/reports/calk', { period })),
};
```

In `src/services/api/index.ts` replace:

```ts
export * from './accountingApi';
```

with:

```ts
export * from './accountingApi';
export * from './sakEmkmApi';
```

- [ ] **Step 5: Add the permission keys**

In `src/shared/types/index.ts`, inside the `PermissionKey` union, replace the line:

```ts
  | 'financial_reports'
```

with:

```ts
  | 'financial_reports'
  | 'fixed_assets'
  | 'bank_reconciliation'
```

In `src/shared/data/mockData.ts`, replace **every** occurrence (KASIR and GUDANG, use replace-all) of:

```ts
    financial_reports: false,
```

with:

```ts
    financial_reports: false,
    fixed_assets: false,
    bank_reconciliation: false,
```

In `src/services/authNavigationService.ts` replace:

```ts
      return !!roleConfig.accounting_hub || !!roleConfig.accounts_payable;
```

with:

```ts
      return !!roleConfig.accounting_hub || !!roleConfig.accounts_payable || !!roleConfig.fixed_assets || !!roleConfig.bank_reconciliation;
```

(If SP2 already extended this line, append `|| !!roleConfig.fixed_assets || !!roleConfig.bank_reconciliation` to it.)

In `src/modules/settings/components/RolePermissionsTab.tsx`, add two icons to the `lucide-react` import. Replace:

```tsx
  BookOpen,
  FileText,
```

with:

```tsx
  BookOpen,
  FileText,
  Factory,
  Landmark,
```

(If SP2/SP3 already import `Landmark`, add only `Factory`.) Then, in `PERMISSION_DEFINITIONS`, replace:

```tsx
    key: 'financial_reports',
    label: 'Laporan Keuangan SAK EMKM & CALK',
    category: 'AKUNTANSI_BIAYA',
    description: 'Laporan Laba Rugi metode FIFO, Neraca Posisi Keuangan seimbang, dan CALK.',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
  },
```

with:

```tsx
    key: 'financial_reports',
    label: 'Laporan Keuangan SAK EMKM & CALK',
    category: 'AKUNTANSI_BIAYA',
    description: 'Laporan Laba Rugi metode FIFO, Neraca Posisi Keuangan seimbang, dan CALK.',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'fixed_assets',
    label: 'Register Aset Tetap & Penyusutan',
    category: 'AKUNTANSI_BIAYA',
    description: 'Mencatat aset tetap, menjalankan penyusutan garis lurus bulanan, dan membatalkan aset yang salah input.',
    icon: <Factory className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'bank_reconciliation',
    label: 'Rekonsiliasi Bank BCA',
    category: 'AKUNTANSI_BIAYA',
    description: 'Impor rekening koran, mencocokkan mutasi dengan jurnal, dan membukukan biaya admin atau bunga bank.',
    icon: <Landmark className="w-4 h-4 text-amber-600" />,
  },
```

- [ ] **Step 6: Journal filters and control accounts**

In `src/modules/accounting/components/JournalTab.tsx`, inside `TYPE_GROUPS`, replace the line:

```tsx
  { id: 'CLOSING', label: 'Tutup Buku', types: ['PERIOD_CLOSING', 'PERIOD_REOPEN'] },
```

with:

```tsx
  { id: 'ASSET', label: 'Aset Tetap', types: ['FIXED_ASSET_ACQUISITION', 'FIXED_ASSET_VOID', 'DEPRECIATION'] },
  { id: 'AJP', label: 'AJP Akrual/Prabayar', types: ['ADJUSTING_ENTRY', 'ADJUSTING_REVERSAL'] },
  { id: 'BANK_RECON', label: 'Rekonsiliasi Bank', types: ['BANK_RECON_ADJUSTMENT'] },
  { id: 'CLOSING', label: 'Tutup Buku', types: ['PERIOD_CLOSING', 'PERIOD_REOPEN'] },
```

and inside `TYPE_BADGE` replace:

```tsx
  PERIOD_REOPEN: 'BUKA PERIODE',
```

with:

```tsx
  PERIOD_REOPEN: 'BUKA PERIODE',
  FIXED_ASSET_ACQUISITION: 'ASET TETAP',
  FIXED_ASSET_VOID: 'PEMBALIK',
  DEPRECIATION: 'PENYUSUTAN',
  ADJUSTING_ENTRY: 'AJP',
  ADJUSTING_REVERSAL: 'PEMBALIK AJP',
  BANK_RECON_ADJUSTMENT: 'REKON BANK',
```

In `src/modules/accounting/components/ManualJournalModal.tsx` replace:

```tsx
const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004'];
```

with:

```tsx
const CONTROL_ACCOUNTS = ['1-1002', '1-2000', '2-1000', '2-1004', '1-3000', '1-3999'];
```

and replace:

```tsx
              <p className="text-xs text-slate-500">Nomor jurnal & referensi MEMO dibuat server. Akun persediaan, hutang, dan akun nonaktif tidak tersedia.</p>
```

with:

```tsx
              <p className="text-xs text-slate-500">Nomor jurnal & referensi MEMO dibuat server. Akun persediaan, hutang, aset tetap, dan akun nonaktif tidak tersedia.</p>
```

- [ ] **Step 7: Run the tests and the gate**

Run: `npx vitest run src/services/__tests__/sakEmkmApi.test.ts src/services/__tests__/authNavigationService.test.ts && npm run lint && npm test`
Expected: the two files PASS; `tsc` clean; all Vitest files PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/shared/types/sakEmkm.ts \
        src/services/api/sakEmkmApi.ts \
        src/services/api/index.ts \
        src/services/__tests__/sakEmkmApi.test.ts \
        src/shared/types/index.ts \
        src/shared/data/mockData.ts \
        src/modules/settings/components/RolePermissionsTab.tsx \
        src/services/authNavigationService.ts \
        src/services/__tests__/authNavigationService.test.ts \
        src/modules/accounting/components/JournalTab.tsx \
        src/modules/accounting/components/ManualJournalModal.tsx
git commit -m "$(cat <<'EOF'
feat(accounting): add sak emkm permissions, types and api client

The frontend learns the fixed_assets and bank_reconciliation keys, a typed
client for the asset register, depreciation, adjusting entries, bank
reconciliation and CALK endpoints, journal filters for the new journal
types, and hides the fixed asset control accounts from manual journals.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F2: Aset Tetap tab (register, depreciation run, void)

**Files:**
- Create: `src/modules/accounting/components/FixedAssetModal.tsx`, `src/modules/accounting/components/FixedAssetsTab.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/modules/accounting/components/PeriodClosingModal.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `sakEmkmApi.fixedAssets/createFixedAsset/voidFixedAsset/depreciationPreview/runDepreciation`, types from F1; `notifyLedgerChanged(apiJournals: ApiJournal[])` in `App.tsx`.
- Produces:
  - `FixedAssetsTab` props `{ refreshKey?: number; onJournalsPosted: (journals: ApiJournal[]) => void }`.
  - `FixedAssetModal` props `{ isOpen: boolean; onClose: () => void; onSubmit: (input: FixedAssetInput) => Promise<boolean> }`; exported const `FIXED_ASSET_CATEGORIES`.
  - `GeneralLedgerScreen` new props `canUsePayables: boolean`, `canManageFixedAssets: boolean`, `onJournalsPosted: (journals: ApiJournal[]) => void`; tab key `'fixed-assets'` ("6. Aset Tetap"); helper `isTabAllowed(id, access)` that F4 extends.

This task has no new unit test: the components are thin views over the server (Vitest runs in node without a DOM). The gate is `tsc` + the existing suite, plus the browser checklist in M1.

- [ ] **Step 1: Create the asset form**

Create `src/modules/accounting/components/FixedAssetModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Factory, X } from 'lucide-react';
import type { FixedAssetCategory, FixedAssetFunding, FixedAssetInput } from '../../../shared/types/sakEmkm';
import { currentMonth, localDate } from '../../../services/accountingPeriod';
import { MoneyInput } from '../../../shared/components';
import { formatRupiah } from '../../../shared/utils/formatters';

export const FIXED_ASSET_CATEGORIES: Record<FixedAssetCategory, string> = {
  PERALATAN_BENGKEL: 'Peralatan & Mesin Bengkel',
  INVENTARIS_TOKO: 'Inventaris & Perabot Toko',
  KENDARAAN: 'Kendaraan',
};

const FUNDING_LABEL: Record<FixedAssetFunding, string> = {
  TUNAI: 'Dibeli tunai dari kas laci (Cr 1-1000)',
  TRANSFER: 'Dibeli via transfer Bank BCA (Cr 1-1001)',
  OPENING: 'Sudah tercatat di Saldo Awal 1-3000/1-3999 (tanpa jurnal baru)',
};

interface FixedAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: FixedAssetInput) => Promise<boolean>;
}

const emptyForm = (): FixedAssetInput => ({
  name: '',
  category: 'PERALATAN_BENGKEL',
  acquisition_date: localDate(),
  acquisition_cost: 0,
  residual_value: 0,
  useful_life_months: 48,
  funding: 'TUNAI',
  depreciation_start: currentMonth(),
  opening_accumulated_depreciation: 0,
  notes: '',
});

export const FixedAssetModal: React.FC<FixedAssetModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [form, setForm] = useState<FixedAssetInput>(emptyForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset hanya saat modal dibuka.
  useEffect(() => {
    if (!isOpen) return;
    setForm(emptyForm());
    setFormError('');
  }, [isOpen]);

  if (!isOpen) return null;

  const opening = form.funding === 'OPENING';
  const set = (patch: Partial<FixedAssetInput>) => setForm((f) => ({ ...f, ...patch }));
  const base = form.acquisition_cost - form.residual_value - (opening ? form.opening_accumulated_depreciation ?? 0 : 0);
  const monthly = form.useful_life_months > 0 ? Math.floor((base * 100) / form.useful_life_months) / 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setFormError('Nama aset wajib diisi.');
    if (form.acquisition_cost <= 0) return setFormError('Harga perolehan harus lebih dari nol.');
    if (base < 0) return setFormError('Nilai residu ditambah akumulasi awal melebihi harga perolehan.');
    setFormError('');
    setSubmitting(true);
    const ok = await onSubmit({
      ...form,
      name: form.name.trim(),
      notes: form.notes?.trim() || undefined,
      // Kolom khusus saldo awal tidak dikirim untuk aset yang dibeli (server menolaknya).
      depreciation_start: opening ? form.depreciation_start : undefined,
      opening_accumulated_depreciation: opening ? form.opening_accumulated_depreciation : undefined,
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
      <div role="dialog" aria-modal="true" aria-labelledby="fixed-asset-title" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <Factory className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="fixed-asset-title" className="text-base font-bold text-slate-900">Catat Aset Tetap</h2>
              <p className="text-xs text-slate-500">Kode AT dan jurnal perolehan dibuat server. Penyusutan garis lurus mulai bulan perolehan.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Nama aset</span>
              <input type="text" required maxLength={150} value={form.name} onChange={(e) => set({ name: e.target.value })}
                placeholder="Contoh: Mesin spooring Hunter" className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Kategori</span>
              <select value={form.category} onChange={(e) => set({ category: e.target.value as FixedAssetCategory })} className={field}>
                {(Object.keys(FIXED_ASSET_CATEGORIES) as FixedAssetCategory[]).map((c) => (
                  <option key={c} value={c}>{FIXED_ASSET_CATEGORIES[c]}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal perolehan</span>
              <input type="date" required value={form.acquisition_date} max={localDate()} onChange={(e) => set({ acquisition_date: e.target.value })} className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Harga perolehan</span>
              <MoneyInput value={form.acquisition_cost} onChange={(v) => set({ acquisition_cost: v })} prefix="Rp" className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nilai residu</span>
              <MoneyInput value={form.residual_value} onChange={(v) => set({ residual_value: v })} prefix="Rp" className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">{opening ? 'Sisa umur manfaat (bulan)' : 'Umur manfaat (bulan)'}</span>
              <input type="number" min={1} max={600} required value={form.useful_life_months || ''}
                onChange={(e) => set({ useful_life_months: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${field} font-mono`} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Sumber dana</span>
              <select value={form.funding} onChange={(e) => set({ funding: e.target.value as FixedAssetFunding })} className={field}>
                {(Object.keys(FUNDING_LABEL) as FixedAssetFunding[]).map((f) => (
                  <option key={f} value={f}>{FUNDING_LABEL[f]}</option>
                ))}
              </select>
            </label>
            {opening && (
              <>
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Mulai disusutkan sistem (bulan)</span>
                  <input type="month" required value={form.depreciation_start ?? currentMonth()} onChange={(e) => set({ depreciation_start: e.target.value })} className={field} />
                </label>
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">Akumulasi penyusutan sebelumnya</span>
                  <MoneyInput value={form.opening_accumulated_depreciation ?? 0} onChange={(v) => set({ opening_accumulated_depreciation: v })} prefix="Rp" className={field} />
                </label>
              </>
            )}
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Catatan (opsional)</span>
              <input type="text" maxLength={255} value={form.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} className={field} />
            </label>
          </div>

          <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
            Perkiraan penyusutan per bulan <strong className="font-mono">{formatRupiah(Math.max(0, monthly))}</strong>
            {opening
              ? ' atas sisa nilai buku dikurangi residu. Tidak ada jurnal perolehan: nilainya sudah masuk Saldo Awal.'
              : `. Jurnal perolehan: Dr 1-3000 / Cr ${form.funding === 'TUNAI' ? '1-1000 Kas Laci' : '1-1001 Bank BCA'}.`}
          </p>

          {formError && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">{formError}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Simpan Aset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Create the tab**

Create `src/modules/accounting/components/FixedAssetsTab.tsx`:

```tsx
import React, { useState } from 'react';
import { CalendarCheck, Plus, Trash2 } from 'lucide-react';
import type { ApiJournal } from '../../../services/api';
import { sakEmkmApi } from '../../../services/api/sakEmkmApi';
import { currentMonth, monthLabel } from '../../../services/accountingPeriod';
import type { FixedAsset, FixedAssetInput } from '../../../shared/types/sakEmkm';
import { useToast } from '../../../shared/components';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { useServerData } from '../hooks/useServerData';
import { FixedAssetModal } from './FixedAssetModal';
import { ServerStatus } from './ServerStatus';

interface FixedAssetsTabProps {
  refreshKey?: number;
  onJournalsPosted: (journals: ApiJournal[]) => void;
}

const errorText = (err: unknown): string => (err instanceof Error ? err.message : 'Permintaan ditolak server.');

export const FixedAssetsTab: React.FC<FixedAssetsTabProps> = ({ refreshKey = 0, onJournalsPosted }) => {
  const toast = useToast();
  const [period, setPeriod] = useState(currentMonth());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const register = useServerData(() => sakEmkmApi.fixedAssets(), [refreshKey]);
  const preview = useServerData(() => sakEmkmApi.depreciationPreview(period), [period, refreshKey]);
  const reloadAll = () => {
    register.reload();
    preview.reload();
  };

  const handleCreate = async (input: FixedAssetInput): Promise<boolean> => {
    try {
      const res = await sakEmkmApi.createFixedAsset(input);
      onJournalsPosted(res.journals);
      reloadAll();
      toast.success('Aset Tetap Dicatat', `${res.asset.code} ${res.asset.name} masuk register.`);
      return true;
    } catch (err) {
      toast.error('Aset Ditolak Server', errorText(err));
      return false;
    }
  };

  const handleVoid = async (asset: FixedAsset) => {
    const reason = window.prompt(`Alasan membatalkan ${asset.code} ${asset.name}:`);
    if (!reason?.trim()) return;
    try {
      const res = await sakEmkmApi.voidFixedAsset(asset.id, reason.trim());
      onJournalsPosted(res.journals);
      reloadAll();
      toast.warning('Aset Dibatalkan', `${asset.code} dikeluarkan dari register.`);
    } catch (err) {
      toast.error('Pembatalan Ditolak', errorText(err));
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await sakEmkmApi.runDepreciation(period);
      onJournalsPosted(res.data.journals);
      reloadAll();
      toast.success('Penyusutan', res.message ?? `Penyusutan ${monthLabel(period)} diproses.`);
    } catch (err) {
      toast.error('Penyusutan Ditolak', errorText(err));
    }
    setRunning(false);
  };

  const summary = register.data?.summary;
  const matchesLedger = summary ? Math.abs(summary.difference_cost) < 0.005 && Math.abs(summary.difference_accumulated) < 0.005 : true;
  const p = preview.data;
  const canRun = !!p && p.total > 0 && !p.is_locked && !p.blocked_reason && !running;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900">Register Aset Tetap</h2>
          <p className="text-slate-500">Buku pembantu akun 1-3000 (harga perolehan) dan 1-3999 (akumulasi penyusutan), metode garis lurus.</p>
        </div>
        <button type="button" onClick={() => setIsFormOpen(true)}
          className="px-3.5 py-2 font-extrabold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 cursor-pointer">
          <Plus className="w-4 h-4" />
          <span>Catat Aset</span>
        </button>
      </div>

      <ServerStatus loading={register.loading && !register.data} error={register.error} onRetry={register.reload} />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Harga Perolehan', formatRupiah(summary.total_cost)],
            ['Akumulasi Penyusutan', formatRupiah(summary.total_accumulated)],
            ['Nilai Buku', formatRupiah(summary.total_book_value)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl p-3 border bg-slate-50 border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
              <span className="text-base font-black font-mono text-slate-900">{value}</span>
            </div>
          ))}
          <div className={`rounded-xl p-3 border ${matchesLedger ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Register vs Buku Besar</span>
            <span className="text-base font-black text-slate-900">{matchesLedger ? 'Cocok' : 'Ada selisih'}</span>
            {!matchesLedger && (
              <span className="block text-[10px] text-rose-800">
                1-3000 {formatRupiah(summary.difference_cost)} • 1-3999 {formatRupiah(summary.difference_accumulated)}
              </span>
            )}
          </div>
        </div>
      )}

      <section className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-1.5"><CalendarCheck className="w-4 h-4 text-blue-600" />Penyusutan Bulanan</h3>
            <p className="text-slate-500">Satu jurnal per bulan (Dr 6-1011 / Cr 1-3999) bertanggal akhir bulan. Wajib sebelum tutup buku.</p>
          </div>
          <div className="flex items-end gap-2">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Bulan</span>
              <input type="month" value={period} max={currentMonth()} onChange={(e) => e.target.value && setPeriod(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl bg-white" />
            </label>
            <button type="button" onClick={handleRun} disabled={!canRun}
              className="px-3.5 py-2 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl disabled:opacity-40 cursor-pointer">
              {running ? 'Memproses…' : 'Jalankan Penyusutan'}
            </button>
          </div>
        </div>
        <ServerStatus loading={preview.loading && !p} error={preview.error} onRetry={preview.reload} />
        {p && (
          <>
            {p.is_locked && <p role="alert" className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold">{monthLabel(period)} sudah ditutup.</p>}
            {!p.is_locked && p.blocked_reason && <p role="alert" className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 font-bold">{p.blocked_reason}</p>}
            {p.lines.length > 0 ? (
              <table className="w-full">
                <thead className="text-slate-500 font-bold text-left"><tr><th className="py-1">Aset</th><th className="py-1 text-right">Penyusutan</th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {p.lines.map((l) => (
                    <tr key={l.fixed_asset_id}><td className="py-1.5">{l.code} — {l.name}</td><td className="py-1.5 text-right font-mono">{formatRupiah(l.amount)}</td></tr>
                  ))}
                </tbody>
                <tfoot className="font-black"><tr><td className="py-1.5">Total {monthLabel(period)}</td><td className="py-1.5 text-right font-mono">{formatRupiah(p.total)}</td></tr></tfoot>
              </table>
            ) : (
              <p className="text-slate-600">Tidak ada penyusutan tertunda untuk {monthLabel(period)}.</p>
            )}
            {p.posted.length > 0 && (
              <p className="text-slate-600">Sudah dibukukan: {p.posted.map((j) => `${j.entry_number} (${formatRupiah(j.total)})`).join(', ')}.</p>
            )}
          </>
        )}
      </section>

      {register.data && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 text-slate-600 font-bold text-left">
              <tr>
                <th className="py-2 px-2">Kode</th>
                <th className="py-2 px-2">Nama & Kategori</th>
                <th className="py-2 px-2">Perolehan</th>
                <th className="py-2 px-2 text-right">Harga Perolehan</th>
                <th className="py-2 px-2 text-right">Susut/Bulan</th>
                <th className="py-2 px-2 text-right">Akumulasi</th>
                <th className="py-2 px-2 text-right">Nilai Buku</th>
                <th className="py-2 px-2">Terakhir Disusutkan</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {register.data.assets.length === 0 && (
                <tr><td colSpan={9} className="py-6 text-center text-slate-500">Belum ada aset tetap tercatat.</td></tr>
              )}
              {register.data.assets.map((a) => (
                <tr key={a.id} className={a.status === 'VOID' ? 'text-slate-400 line-through' : ''}>
                  <td className="py-2 px-2 font-mono">{a.code}</td>
                  <td className="py-2 px-2"><span className="font-bold">{a.name}</span><span className="block text-[10px] text-slate-500">{a.category_label} • {a.useful_life_months} bulan</span></td>
                  <td className="py-2 px-2">{formatDateIndo(a.acquisition_date)}<span className="block text-[10px] text-slate-500">{a.funding === 'OPENING' ? 'Saldo awal' : a.journal_entry_number}</span></td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupiah(a.acquisition_cost)}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupiah(a.monthly_depreciation)}</td>
                  <td className="py-2 px-2 text-right font-mono">{formatRupiah(a.accumulated_depreciation)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{formatRupiah(a.book_value)}</td>
                  <td className="py-2 px-2">{a.status === 'VOID' ? `VOID: ${a.void_reason ?? '-'}` : a.last_depreciated_period ? monthLabel(a.last_depreciated_period) : '-'}</td>
                  <td className="py-2 px-2 text-right">
                    {a.status === 'ACTIVE' && !a.last_depreciated_period && (
                      <button type="button" onClick={() => handleVoid(a)} aria-label={`Batalkan ${a.code}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FixedAssetModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleCreate} />
    </div>
  );
};
```

- [ ] **Step 3: Export the components**

In `src/modules/accounting/components/index.ts` replace:

```ts
export * from './ServerStatus';
```

with:

```ts
export * from './ServerStatus';
export * from './FixedAssetModal';
export * from './FixedAssetsTab';
```

- [ ] **Step 4: Add the tab to the ledger screen**

In `src/modules/accounting/GeneralLedgerScreen.tsx`:

Replace:

```tsx
  BookMarked, BookOpen, CreditCard, ExternalLink, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
```

with:

```tsx
  BookMarked, BookOpen, CreditCard, ExternalLink, Factory, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
```

Replace:

```tsx
import { accountingApi } from '../../services/api';
```

with:

```tsx
import { accountingApi } from '../../services/api';
import type { ApiJournal } from '../../services/api';
```

Replace:

```tsx
  AccountsPayableTab,
  GeneralLedgerTab,
```

with:

```tsx
  AccountsPayableTab,
  FixedAssetsTab,
  GeneralLedgerTab,
```

Replace:

```tsx
export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports';
```

with:

```tsx
export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports' | 'fixed-assets';
```

Replace:

```tsx
  /** Akses `accounting_hub`. Tanpa itu (mis. hanya `accounts_payable`) hanya buku pembantu yang tampil. */
  canUseHub: boolean;
```

with:

```tsx
  /** Akses `accounting_hub`. Tanpa itu (mis. hanya `accounts_payable`) hanya buku pembantu yang tampil. */
  canUseHub: boolean;
  /** Akses `accounts_payable`: tab Pembantu Hutang tanpa accounting_hub. */
  canUsePayables: boolean;
  /** Akses `fixed_assets`: register aset tetap & penyusutan. */
  canManageFixedAssets: boolean;
  /** Server membukukan jurnal dari tab di layar ini: App memuat ulang laporan dan saldo kas. */
  onJournalsPosted: (journals: ApiJournal[]) => void;
```

Replace:

```tsx
  { id: 'reports', label: '5. Laporan Keuangan', icon: FileText },
];

/** Tab yang tidak memanggil endpoint khusus accounting_hub. */
const SUBLEDGER_TABS: AccountingTabKey[] = ['payables'];
```

with:

```tsx
  { id: 'reports', label: '5. Laporan Keuangan', icon: FileText },
  { id: 'fixed-assets', label: '6. Aset Tetap', icon: Factory },
];

interface TabAccess {
  hub: boolean;
  payables: boolean;
  fixedAssets: boolean;
}

/** Laporan hub butuh accounting_hub; buku pembantu dan modul SAK EMKM punya kunci izin sendiri. */
const isTabAllowed = (id: AccountingTabKey, access: TabAccess): boolean => {
  if (id === 'fixed-assets') return access.fixedAssets;
  if (id === 'payables') return access.hub || access.payables;
  return access.hub;
};
```

Replace:

```tsx
  canUseHub,
  onAddManualJournal,
```

with:

```tsx
  canUseHub,
  canUsePayables,
  canManageFixedAssets,
  onJournalsPosted,
  onAddManualJournal,
```

Replace:

```tsx
  const visibleTabs = canUseHub ? TABS : TABS.filter((t) => SUBLEDGER_TABS.includes(t.id));
  const [selectedTab, setSelectedTab] = useState<AccountingTabKey>(
    canUseHub || SUBLEDGER_TABS.includes(initialTab) ? initialTab : 'payables',
  );
  const activeTab = visibleTabs.some((t) => t.id === selectedTab) ? selectedTab : visibleTabs[0].id;
```

with:

```tsx
  const access: TabAccess = { hub: canUseHub, payables: canUsePayables, fixedAssets: canManageFixedAssets };
  const visibleTabs = TABS.filter((t) => isTabAllowed(t.id, access));
  const [selectedTab, setSelectedTab] = useState<AccountingTabKey>(initialTab);
  const activeTab = visibleTabs.some((t) => t.id === selectedTab) ? selectedTab : (visibleTabs[0]?.id ?? selectedTab);
```

Replace:

```tsx
        {activeTab === 'reports' && <SakEmkmReportTab refreshKey={ledgerVersion} />}
```

with:

```tsx
        {activeTab === 'reports' && <SakEmkmReportTab refreshKey={ledgerVersion} />}
        {activeTab === 'fixed-assets' && <FixedAssetsTab refreshKey={ledgerVersion} onJournalsPosted={onJournalsPosted} />}
```

- [ ] **Step 5: Pass the new props from App**

In `src/App.tsx`, inside the `<GeneralLedgerScreen … />` element, replace:

```tsx
                canUseHub={can('accounting_hub')}
```

with:

```tsx
                canUseHub={can('accounting_hub')}
                canUsePayables={can('accounts_payable')}
                canManageFixedAssets={can('fixed_assets')}
                onJournalsPosted={notifyLedgerChanged}
```

(`notifyLedgerChanged(apiJournals: ApiJournal[])` already exists in `App.tsx`; it ignores an empty list, which is why the tab also reloads its own data.)

- [ ] **Step 6: Mention depreciation in the closing dialog**

In `src/modules/accounting/components/PeriodClosingModal.tsx` replace:

```tsx
            {' '}{formatDateIndo(range.end)} ditolak. Hanya pemilik yang dapat membuka kembali periode terakhir.
```

with:

```tsx
            {' '}{formatDateIndo(range.end)} ditolak. Hanya pemilik yang dapat membuka kembali periode terakhir. Penyusutan aset tetap
            sampai bulan ini harus sudah dijalankan (tab Aset Tetap), jika belum server menolak tutup buku.
```

- [ ] **Step 7: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all Vitest files PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/modules/accounting/components/FixedAssetModal.tsx \
        src/modules/accounting/components/FixedAssetsTab.tsx \
        src/modules/accounting/components/index.ts \
        src/modules/accounting/GeneralLedgerScreen.tsx \
        src/modules/accounting/components/PeriodClosingModal.tsx \
        src/App.tsx
git commit -m "$(cat <<'EOF'
feat(accounting): add the fixed asset tab to the ledger screen

Owners record assets, see the register next to the 1-3000/1-3999 ledger,
preview and run the monthly depreciation and void a wrong entry. Each
ledger tab now has its own permission gate so the fixed asset tab also
works for a role that has only the fixed_assets key.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F3: AJP modal for accruals and prepayments

**Files:**
- Create: `src/modules/accounting/components/AdjustingEntryModal.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/modules/accounting/GeneralLedgerScreen.tsx`

**Interfaces:**
- Consumes: `sakEmkmApi.createAdjustingEntry` (F1), `onJournalsPosted` prop (F2), `accounts: ChartOfAccount[]` already passed to `GeneralLedgerScreen`.
- Produces: `AdjustingEntryModal` props `{ isOpen: boolean; onClose: () => void; accounts: ChartOfAccount[]; onSubmit: (input: AdjustingEntryInput) => Promise<boolean> }`; header button "AJP Akrual / Dibayar di Muka" (hub users).

No new unit test (thin form over the server; B4 covers the rules). Gate: `tsc` + suite, browser check in M1.

- [ ] **Step 1: Create the modal**

Create `src/modules/accounting/components/AdjustingEntryModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import { ChartOfAccount } from '../../../shared/types';
import type { AdjustingEntryInput, AdjustingKind } from '../../../shared/types/sakEmkm';
import { currentMonth, localDate, monthLabel, monthRange } from '../../../services/accountingPeriod';
import { MoneyInput } from '../../../shared/components';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

interface AdjustingEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: ChartOfAccount[];
  onSubmit: (input: AdjustingEntryInput) => Promise<boolean>;
}

const COUNTER: Record<AdjustingKind, { code: string; label: string; help: string }> = {
  ACCRUAL: {
    code: '2-1100',
    label: 'Beban Yang Masih Harus Dibayar',
    help: 'Beban bulan ini yang tagihannya belum dibayar (mis. listrik, gaji lembur).',
  },
  PREPAID: {
    code: '1-1100',
    label: 'Beban Dibayar di Muka',
    help: 'Bagian pembayaran di muka yang sudah terpakai bulan ini (mis. sewa toko tahunan).',
  },
};

/** Tanggal 1 bulan berikutnya, dari akhir bulan pilihan (tanggal lokal, bukan UTC). */
const firstDayAfter = (month: string): string => {
  const end = new Date(`${monthRange(month).end}T00:00:00`);
  end.setDate(end.getDate() + 1);
  return localDate(end);
};

export const AdjustingEntryModal: React.FC<AdjustingEntryModalProps> = ({ isOpen, onClose, accounts, onSubmit }) => {
  const [period, setPeriod] = useState(currentMonth());
  const [kind, setKind] = useState<AdjustingKind>('ACCRUAL');
  const [accountCode, setAccountCode] = useState('');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [autoReverse, setAutoReverse] = useState(true);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPeriod(currentMonth());
    setKind('ACCRUAL');
    setAccountCode('');
    setAmount(0);
    setDescription('');
    setAutoReverse(true);
    setFormError('');
  }, [isOpen]);

  if (!isOpen) return null;

  // Penyusutan (6-1011) hanya dari register aset tetap; server menolak akun lain selain beban 6-xxxx aktif.
  const expenseAccounts = accounts.filter((a) =>
    a.account_type === 'EXPENSE' && a.account_code.startsWith('6-') && a.account_code !== '6-1011' && a.is_active !== false);
  const counter = COUNTER[kind];
  const reverse = kind === 'ACCRUAL' && autoReverse;
  const selected = expenseAccounts.find((a) => a.account_code === accountCode);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountCode) return setFormError('Pilih akun beban.');
    if (amount <= 0) return setFormError('Nominal harus lebih dari nol.');
    if (!description.trim()) return setFormError('Keterangan wajib diisi.');
    setFormError('');
    setSubmitting(true);
    const ok = await onSubmit({ period, kind, account_code: accountCode, amount, description: description.trim(), auto_reverse: reverse });
    setSubmitting(false);
    if (ok) onClose();
  };

  const field = 'w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
      <div role="dialog" aria-modal="true" aria-labelledby="adjusting-title" className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <CalendarClock className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="adjusting-title" className="text-base font-bold text-slate-900">Jurnal Penyesuaian Akhir Bulan (AJP)</h2>
              <p className="text-xs text-slate-500">Dibukukan server pada tanggal terakhir bulan yang dipilih, nomor referensi AJP.</p>
            </div>
          </div>
          <button type="button" aria-label="Tutup" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto text-xs">
          <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <legend className="font-bold text-slate-700 mb-1">Jenis penyesuaian</legend>
            {(Object.keys(COUNTER) as AdjustingKind[]).map((k) => (
              <label key={k} className={`p-3 rounded-xl border cursor-pointer ${kind === k ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}>
                <input type="radio" name="ajp-kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="mr-1.5" />
                <span className="font-bold">{k === 'ACCRUAL' ? 'Akrual beban' : 'Dibayar di muka terpakai'}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{COUNTER[k].help}</span>
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Bulan</span>
              <input type="month" required value={period} max={currentMonth()} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nominal</span>
              <MoneyInput value={amount} onChange={setAmount} prefix="Rp" className={field} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Akun beban</span>
              <select value={accountCode} onChange={(e) => setAccountCode(e.target.value)} className={field}>
                <option value="">Pilih akun…</option>
                {expenseAccounts.map((a) => (
                  <option key={a.account_code} value={a.account_code}>{a.account_code} — {a.account_name}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Keterangan</span>
              <input type="text" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Tagihan listrik Maret belum datang" className={field} />
            </label>
          </div>

          {kind === 'ACCRUAL' && (
            <label className="flex items-start gap-2 text-slate-700">
              <input type="checkbox" checked={autoReverse} onChange={(e) => setAutoReverse(e.target.checked)} className="mt-0.5" />
              <span>Balik otomatis tanggal {formatDateIndo(firstDayAfter(period))}, sehingga tagihan yang dibayar bulan depan lewat menu Biaya tidak terhitung dua kali.</span>
            </label>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono">
            <p>{formatDateIndo(monthRange(period).end)} — Dr {selected ? `${selected.account_code} ${selected.account_name}` : 'akun beban'} {formatRupiah(amount)}</p>
            <p className="pl-6">Cr {counter.code} {counter.label} {formatRupiah(amount)}</p>
            {reverse && <p className="text-slate-500">{formatDateIndo(firstDayAfter(period))} — jurnal pembalik (Dr {counter.code} / Cr beban)</p>}
            <p className="font-sans text-slate-500">Periode {monthLabel(period)} harus belum ditutup.</p>
          </div>

          {formError && <p role="alert" className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-bold">{formError}</p>}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 cursor-pointer">
              {submitting ? 'Menyimpan…' : 'Bukukan AJP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Export it**

In `src/modules/accounting/components/index.ts` replace:

```ts
export * from './FixedAssetsTab';
```

with:

```ts
export * from './FixedAssetsTab';
export * from './AdjustingEntryModal';
```

- [ ] **Step 3: Wire it into the ledger screen**

In `src/modules/accounting/GeneralLedgerScreen.tsx`:

Replace:

```tsx
  BookMarked, BookOpen, CreditCard, ExternalLink, Factory, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
```

with:

```tsx
  BookMarked, BookOpen, CalendarClock, CreditCard, ExternalLink, Factory, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
```

Replace:

```tsx
import type { ApiJournal } from '../../services/api';
```

with:

```tsx
import type { ApiJournal } from '../../services/api';
import { sakEmkmApi } from '../../services/api/sakEmkmApi';
import type { AdjustingEntryInput } from '../../shared/types/sakEmkm';
import { useToast } from '../../shared/components';
```

Replace:

```tsx
import {
  AccountsPayableTab,
```

with:

```tsx
import {
  AccountsPayableTab,
  AdjustingEntryModal,
```

Replace:

```tsx
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);
```

with:

```tsx
  const [isOpeningOpen, setIsOpeningOpen] = useState(false);
  const [isAdjustingOpen, setIsAdjustingOpen] = useState(false);
  const toast = useToast();

  const handleAdjustingEntry = async (input: AdjustingEntryInput): Promise<boolean> => {
    try {
      const res = await sakEmkmApi.createAdjustingEntry(input);
      onJournalsPosted(res.journals);
      const [entry, reversal] = res.journals;
      toast.success('AJP Dibukukan', reversal
        ? `${entry.entry_number} dan pembaliknya ${reversal.entry_number} tersimpan di server.`
        : `${entry.entry_number} tersimpan di server.`);
      return true;
    } catch (err) {
      toast.error('AJP Ditolak Server', err instanceof Error ? err.message : 'Permintaan ditolak server.');
      return false;
    }
  };
```

Replace:

```tsx
            {canUseHub && (
              <button type="button" onClick={() => setIsManualOpen(true)}
```

with:

```tsx
            {canUseHub && (
              <button type="button" onClick={() => setIsAdjustingOpen(true)}
                className="px-3.5 py-2 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 cursor-pointer">
                <CalendarClock className="w-3.5 h-3.5" />
                <span>AJP Akrual / Dibayar di Muka</span>
              </button>
            )}
            {canUseHub && (
              <button type="button" onClick={() => setIsManualOpen(true)}
```

Replace:

```tsx
          <ManualJournalModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} accounts={accounts} onSubmit={onAddManualJournal} />
```

with:

```tsx
          <ManualJournalModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} accounts={accounts} onSubmit={onAddManualJournal} />
          <AdjustingEntryModal isOpen={isAdjustingOpen} onClose={() => setIsAdjustingOpen(false)} accounts={accounts} onSubmit={handleAdjustingEntry} />
```

- [ ] **Step 4: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all Vitest files PASS.

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/modules/accounting/components/AdjustingEntryModal.tsx \
        src/modules/accounting/components/index.ts \
        src/modules/accounting/GeneralLedgerScreen.tsx
git commit -m "$(cat <<'EOF'
feat(accounting): add the ajp form for accruals and prepayments

The ledger header gets an AJP dialog that previews the month-end entry
(expense against 2-1100 or 1-1100) and, for accruals, the automatic
reversal on the first day of the next month before the server books it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---
### Task F4: Rekonsiliasi Bank tab and its export

**Files:**
- Create: `src/modules/accounting/components/BankReconciliationTab.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/App.tsx`, `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `sakEmkmApi` bank methods and `BankReconciliationReport`, `BankStatementLine`, `OutstandingLedgerItem` (F1); `isTabAllowed`/`TabAccess` and `onJournalsPosted` (F2).
- Produces: export report id `bank_reconciliation` (`BankReconciliationReport` → 3 sections: summary, outstanding ledger lines, unrecorded statement lines; formats xlsx, pdf); `BankReconciliationTab` props `{ refreshKey?: number; onJournalsPosted: (journals: ApiJournal[]) => void }`; `GeneralLedgerScreen` prop `canReconcileBank: boolean`, tab key `'bank-recon'` ("7. Rekonsiliasi Bank").

- [ ] **Step 1: Write the failing registry test**

In `src/shared/export/__tests__/registry.test.ts` replace:

```ts
import type { CashFlowReport, FinancialStatements, StatementLine } from '../../types';
```

with:

```ts
import type { CashFlowReport, FinancialStatements, StatementLine } from '../../types';
import type { BankReconciliationReport } from '../../types/sakEmkm';
```

Replace the report-count test `it('semua 20 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(20));` (the number may already differ after SP2/SP3 — replace the line whatever its number, using the current number + 1; 21 on the pre-SP2 base) with:

```ts
  it('semua reportId terdaftar (termasuk rekonsiliasi bank)', () => {
    expect(Object.keys(REPORT_MAPPERS).length).toBe(21);
    expect(Object.keys(REPORT_MAPPERS)).toContain('bank_reconciliation');
  });
```

Append at the end of the file:

```ts
describe('registry bank_reconciliation', () => {
  const report: BankReconciliationReport = {
    period: '2026-09', start_date: '2026-09-01', end_date: '2026-09-30', cutover_date: '2026-09-01',
    statement_ending_balance: 1193500, book_balance: 1500000,
    lines: [],
    outstanding_ledger: [{ journal_item_id: 9, entry_number: 'JRN-202609-0009', entry_date: '2026-09-30', reference_type: 'POS_SALE', description: 'Transfer pelanggan', debit: 300000, credit: 0 }],
    unrecorded_bank: [{ id: 3, statement_date: '2026-09-30', description: 'BIAYA ADM', amount: -6500, source: 'CSV', journal_item_id: null, matched_entry_number: null, matched_reference_type: null, matched_entry_date: null }],
    deposits_in_transit: 300000, outstanding_payments: 0, unrecorded_credits: 0, unrecorded_debits: 6500,
    adjusted_bank_balance: 1493500, adjusted_book_balance: 1493500, difference: 0, is_reconciled: true,
  };
  const doc = buildExportDoc('bank_reconciliation', report, ctx);

  it('ringkasan memuat kedua saldo disesuaikan dan selisih nol', () => {
    const rows = doc.sections[0].rows;
    expect(rows.find((r) => r.label === 'SALDO BANK DISESUAIKAN')?.value).toBe(1493500);
    expect(rows.find((r) => r.label === 'SALDO BUKU DISESUAIKAN')?.value).toBe(1493500);
    expect(rows.find((r) => r.label === 'SELISIH')?.value).toBe(0);
  });

  it('merinci jurnal yang belum muncul di rekening koran dan mutasi yang belum dicatat', () => {
    expect(doc.sections).toHaveLength(3);
    expect(doc.sections[1].rows[0].no_jurnal).toBe('JRN-202609-0009');
    expect(doc.sections[2].rows[0].jumlah).toBe(-6500);
  });

  it('diekspor ke xlsx dan pdf', () => expect(REPORT_FORMATS.bank_reconciliation).toEqual(['xlsx', 'pdf']));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: FAIL — `bank_reconciliation` is not a registered report (the count is off by one and `buildExportDoc` throws).

- [ ] **Step 3: Add the export mapper**

In `src/shared/export/registry.ts` replace:

```ts
import { EXPENSE_CATEGORY_CONFIG, formatRupiah } from '../utils/formatters';
```

with:

```ts
import type { BankReconciliationReport } from '../types/sakEmkm';
import { EXPENSE_CATEGORY_CONFIG, formatRupiah } from '../utils/formatters';
```

Insert the mapper directly above the report map. Replace:

```ts
export const REPORT_MAPPERS = {
```

with:

```ts
const mapBankReconciliation = (r: BankReconciliationReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('bank_reconciliation', 'Rekonsiliasi Bank BCA (1-1001)', 'portrait', ctx, [
    lvSection('Ringkasan Rekonsiliasi', [
      { label: 'Saldo menurut rekening koran', value: r.statement_ending_balance ?? 0 },
      { label: 'Ditambah: setoran dalam perjalanan', value: r.deposits_in_transit },
      { label: 'Dikurangi: pembayaran belum dikliring bank', value: -r.outstanding_payments },
      { label: 'SALDO BANK DISESUAIKAN', value: r.adjusted_bank_balance ?? 0 },
      { label: 'Saldo menurut buku besar (1-1001)', value: r.book_balance },
      { label: 'Ditambah: penerimaan bank belum dicatat (bunga, dll.)', value: r.unrecorded_credits },
      { label: 'Dikurangi: pengeluaran bank belum dicatat (biaya admin, dll.)', value: -r.unrecorded_debits },
      { label: 'SALDO BUKU DISESUAIKAN', value: r.adjusted_book_balance },
      { label: 'SELISIH', value: r.difference ?? 0 },
    ]),
    {
      title: 'Jurnal bank yang belum muncul di rekening koran',
      columns: [
        { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'no_jurnal', label: 'No Jurnal', type: 'text', width: 16 },
        { key: 'keterangan', label: 'Keterangan', type: 'text', width: 40 },
        { key: 'masuk', label: 'Masuk (Dr)', type: 'currency' },
        { key: 'keluar', label: 'Keluar (Cr)', type: 'currency' },
      ],
      rows: r.outstanding_ledger.map((i) => ({ tanggal: i.entry_date, no_jurnal: i.entry_number, keterangan: i.description, masuk: i.debit, keluar: i.credit })),
      totals: { masuk: r.deposits_in_transit, keluar: r.outstanding_payments },
    },
    {
      title: 'Mutasi rekening koran yang belum dicatat di buku',
      columns: [
        { key: 'tanggal', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'keterangan', label: 'Keterangan', type: 'text', width: 48 },
        { key: 'jumlah', label: 'Jumlah', type: 'currency' },
      ],
      rows: r.unrecorded_bank.map((l) => ({ tanggal: l.statement_date, keterangan: l.description, jumlah: l.amount })),
    },
  ]);

export const REPORT_MAPPERS = {
```

Register it. Replace:

```ts
  period_closing: mapPeriodClosing,
```

with:

```ts
  period_closing: mapPeriodClosing,
  bank_reconciliation: mapBankReconciliation,
```

and replace:

```ts
  period_closing: ['xlsx', 'pdf'],
```

with:

```ts
  period_closing: ['xlsx', 'pdf'],
  bank_reconciliation: ['xlsx', 'pdf'],
```

- [ ] **Step 4: Run the registry test**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the tab**

Create `src/modules/accounting/components/BankReconciliationTab.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { Banknote, Link2, Plus, Trash2, Unlink, Upload, Wand2 } from 'lucide-react';
import type { ApiJournal } from '../../../services/api';
import { sakEmkmApi } from '../../../services/api/sakEmkmApi';
import { currentMonth, localDate, monthLabel } from '../../../services/accountingPeriod';
import type { BankStatementLine, OutstandingLedgerItem } from '../../../shared/types/sakEmkm';
import { MoneyInput, useToast } from '../../../shared/components';
import { ExportMenu } from '../../../shared/export/ExportMenu';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface BankReconciliationTabProps {
  refreshKey?: number;
  onJournalsPosted: (journals: ApiJournal[]) => void;
}

const cents = (n: number): number => Math.round(n * 100);
const ledgerAmount = (i: OutstandingLedgerItem): number => i.debit - i.credit;

export const BankReconciliationTab: React.FC<BankReconciliationTabProps> = ({ refreshKey = 0, onJournalsPosted }) => {
  const toast = useToast();
  const [period, setPeriod] = useState(currentMonth());
  const [statementBalance, setStatementBalance] = useState(0);
  const [draft, setDraft] = useState({ statement_date: localDate(), description: '', amount: 0, direction: 'OUT' as 'IN' | 'OUT' });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const report = useServerData(() => sakEmkmApi.bankReconciliation(period), [period, refreshKey]);
  const r = report.data;

  useEffect(() => {
    setStatementBalance(r?.statement_ending_balance ?? 0);
  }, [r?.period, r?.statement_ending_balance]);

  /** Jalankan aksi server, muat ulang laporan, dan tampilkan hasilnya. */
  const act = async (title: string, run: () => Promise<string>) => {
    setBusy(true);
    try {
      const message = await run();
      report.reload();
      toast.success(title, message);
    } catch (err) {
      toast.error(title, err instanceof Error ? err.message : 'Permintaan ditolak server.');
    }
    setBusy(false);
  };

  const saveBalance = () => act('Saldo Rekening Koran', async () => {
    await sakEmkmApi.setStatementBalance(period, statementBalance);
    return `Saldo akhir ${monthLabel(period)} disimpan.`;
  });

  const addLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.description.trim() || draft.amount <= 0) {
      toast.warning('Mutasi Belum Lengkap', 'Isi keterangan dan nominal mutasi.');
      return;
    }
    void act('Mutasi Ditambahkan', async () => {
      await sakEmkmApi.addStatementLine({
        statement_date: draft.statement_date,
        description: draft.description.trim(),
        amount: draft.direction === 'IN' ? draft.amount : -draft.amount,
      });
      setDraft((d) => ({ ...d, description: '', amount: 0 }));
      return 'Baris rekening koran disimpan.';
    });
  };

  const importFile = (file: File) => act('Impor Rekening Koran', async () => {
    const res = await sakEmkmApi.importStatement(file);
    if (fileRef.current) fileRef.current.value = '';
    return `${res.imported} mutasi diimpor, ${res.skipped} dilewati karena sudah ada.`;
  });

  const autoMatch = () => act('Cocokkan Otomatis', async () => `${(await sakEmkmApi.autoMatch(period)).matched} mutasi dicocokkan.`);

  const match = (line: BankStatementLine, journalItemId: number) => act('Mutasi Dicocokkan', async () => {
    await sakEmkmApi.matchStatementLine(line.id, journalItemId);
    return `${line.description} dicocokkan dengan jurnal.`;
  });

  const unmatch = (line: BankStatementLine) => act('Pencocokan Dilepas', async () => {
    await sakEmkmApi.unmatchStatementLine(line.id);
    return `${line.description} kembali belum dicocokkan.`;
  });

  const remove = (line: BankStatementLine) => {
    if (!window.confirm(`Hapus mutasi "${line.description}"?`)) return;
    void act('Mutasi Dihapus', async () => {
      await sakEmkmApi.deleteStatementLine(line.id);
      return 'Baris rekening koran dihapus.';
    });
  };

  const postAdjustment = (line: BankStatementLine) => act(line.amount < 0 ? 'Biaya Admin Bank' : 'Bunga Bank', async () => {
    const res = await sakEmkmApi.postBankAdjustment(line.id);
    onJournalsPosted(res.journals);
    return `${res.journals[0]?.entry_number ?? 'Jurnal'} dibukukan.`;
  });

  const candidates = (line: BankStatementLine): OutstandingLedgerItem[] =>
    (r?.outstanding_ledger ?? []).filter((i) => cents(ledgerAmount(i)) === cents(line.amount));

  const field = 'px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none';
  const button = 'px-3 py-2 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-40';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5 text-xs">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-1.5"><Banknote className="w-5 h-5 text-blue-600" />Rekonsiliasi Bank BCA (1-1001)</h2>
          <p className="text-slate-500">Cocokkan mutasi rekening koran dengan jurnal bank; mutasi yang hanya ada di bank dibukukan sebagai biaya admin atau bunga.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block">
            <span className="block font-bold text-slate-700 mb-1">Bulan</span>
            <input type="month" value={period} max={currentMonth()} onChange={(e) => e.target.value && setPeriod(e.target.value)} className={field} />
          </label>
          {r && <ExportMenu reportId="bank_reconciliation" data={r} ctx={{ periodLabel: monthLabel(period), startDate: r.start_date, endDate: r.end_date }} />}
        </div>
      </div>

      <ServerStatus loading={report.loading && !r} error={report.error} onRetry={report.reload} />

      {r && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-700 block">Menurut rekening koran</span>
              <div className="flex items-center gap-2">
                <MoneyInput value={statementBalance} onChange={setStatementBalance} prefix="Rp" className={`${field} w-full`} aria-label="Saldo akhir rekening koran" />
                <button type="button" onClick={saveBalance} disabled={busy} className={`${button} text-white bg-slate-800 hover:bg-slate-900`}>Simpan</button>
              </div>
              <p>+ Setoran dalam perjalanan <span className="font-mono float-right">{formatRupiah(r.deposits_in_transit)}</span></p>
              <p>− Pembayaran belum dikliring <span className="font-mono float-right">{formatRupiah(r.outstanding_payments)}</span></p>
              <p className="font-black">Saldo bank disesuaikan <span className="font-mono float-right">{r.adjusted_bank_balance === null ? '-' : formatRupiah(r.adjusted_bank_balance)}</span></p>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
              <span className="font-bold text-slate-700 block">Menurut buku besar</span>
              <p>Saldo 1-1001 per {formatDateIndo(r.end_date)} <span className="font-mono float-right">{formatRupiah(r.book_balance)}</span></p>
              <p>+ Penerimaan bank belum dicatat <span className="font-mono float-right">{formatRupiah(r.unrecorded_credits)}</span></p>
              <p>− Pengeluaran bank belum dicatat <span className="font-mono float-right">{formatRupiah(r.unrecorded_debits)}</span></p>
              <p className="font-black">Saldo buku disesuaikan <span className="font-mono float-right">{formatRupiah(r.adjusted_book_balance)}</span></p>
            </div>
            <div className={`p-3 rounded-xl border ${r.is_reconciled ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Status {monthLabel(period)}</span>
              <span className="text-lg font-black text-slate-900 block">
                {r.statement_ending_balance === null ? 'Isi saldo rekening koran' : r.is_reconciled ? 'Terekonsiliasi' : `Selisih ${formatRupiah(r.difference ?? 0)}`}
              </span>
              <span className="text-slate-600">Jurnal sebelum {formatDateIndo(r.cutover_date)} dianggap sudah cocok (awal rekonsiliasi).</span>
            </div>
          </div>

          <form onSubmit={addLine} className="flex flex-wrap items-end gap-2 p-3 rounded-xl border border-slate-200">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal</span>
              <input type="date" required value={draft.statement_date} max={localDate()} onChange={(e) => setDraft({ ...draft, statement_date: e.target.value })} className={field} />
            </label>
            <label className="block flex-1 min-w-[180px]">
              <span className="block font-bold text-slate-700 mb-1">Keterangan mutasi</span>
              <input type="text" maxLength={255} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={`${field} w-full`} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Arah</span>
              <select value={draft.direction} onChange={(e) => setDraft({ ...draft, direction: e.target.value as 'IN' | 'OUT' })} className={field}>
                <option value="IN">Masuk (kredit rekening)</option>
                <option value="OUT">Keluar (debet rekening)</option>
              </select>
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nominal</span>
              <MoneyInput value={draft.amount} onChange={(v) => setDraft({ ...draft, amount: v })} prefix="Rp" className={field} />
            </label>
            <button type="submit" disabled={busy} className={`${button} text-white bg-blue-600 hover:bg-blue-700`}><Plus className="w-4 h-4" />Tambah</button>
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${button} text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200`}>
              <Upload className="w-4 h-4" />Impor CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv,text/plain" className="hidden" aria-label="Berkas CSV rekening koran"
              onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
            <button type="button" disabled={busy} onClick={autoMatch} className={`${button} text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200`}>
              <Wand2 className="w-4 h-4" />Cocokkan Otomatis
            </button>
            <p className="w-full text-[11px] text-slate-500">
              Format CSV: baris pertama <code>tanggal;keterangan;jumlah</code> (pemisah ; atau ,), tanggal YYYY-MM-DD atau DD/MM/YYYY,
              jumlah angka tanpa titik ribuan, negatif untuk uang keluar (contoh -6500).
            </p>
          </form>

          <section className="space-y-2">
            <h3 className="font-black text-slate-900">Mutasi rekening koran {monthLabel(period)}</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="bg-slate-50 text-slate-600 font-bold text-left">
                  <tr><th className="py-2 px-2">Tanggal</th><th className="py-2 px-2">Keterangan</th><th className="py-2 px-2 text-right">Jumlah</th><th className="py-2 px-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.lines.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-slate-500">Belum ada mutasi rekening koran bulan ini.</td></tr>}
                  {r.lines.map((line) => {
                    const options = candidates(line);
                    return (
                      <tr key={line.id}>
                        <td className="py-2 px-2">{formatDateIndo(line.statement_date)}</td>
                        <td className="py-2 px-2">{line.description}<span className="block text-[10px] text-slate-400">{line.source}</span></td>
                        <td className={`py-2 px-2 text-right font-mono ${line.amount < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatRupiah(line.amount)}</td>
                        <td className="py-2 px-2">
                          {line.journal_item_id !== null ? (
                            <span className="flex items-center gap-2">
                              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{line.matched_entry_number}</span>
                              {line.matched_reference_type !== 'BANK_RECON_ADJUSTMENT' && (
                                <button type="button" disabled={busy} onClick={() => unmatch(line)} aria-label={`Lepas ${line.description}`}
                                  className="p-1 text-slate-400 hover:text-amber-600 cursor-pointer"><Unlink className="w-3.5 h-3.5" /></button>
                              )}
                            </span>
                          ) : (
                            <span className="flex flex-wrap items-center gap-2">
                              {options.length > 0 && (
                                <select defaultValue="" disabled={busy} aria-label={`Cocokkan ${line.description}`}
                                  onChange={(e) => e.target.value && match(line, Number(e.target.value))} className={field}>
                                  <option value="">Cocokkan dengan jurnal…</option>
                                  {options.map((i) => (
                                    <option key={i.journal_item_id} value={i.journal_item_id}>{i.entry_date} {i.entry_number} — {i.description}</option>
                                  ))}
                                </select>
                              )}
                              <button type="button" disabled={busy} onClick={() => postAdjustment(line)}
                                className="px-2 py-1 font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg cursor-pointer disabled:opacity-40">
                                {line.amount < 0 ? 'Bukukan biaya admin' : 'Bukukan bunga bank'}
                              </button>
                              <button type="button" disabled={busy} onClick={() => remove(line)} aria-label={`Hapus ${line.description}`}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-black text-slate-900">Jurnal bank yang belum muncul di rekening koran</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50 text-slate-600 font-bold text-left">
                  <tr><th className="py-2 px-2">Tanggal</th><th className="py-2 px-2">No Jurnal</th><th className="py-2 px-2">Keterangan</th><th className="py-2 px-2 text-right">Masuk</th><th className="py-2 px-2 text-right">Keluar</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {r.outstanding_ledger.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-slate-500">Semua jurnal bank sudah cocok.</td></tr>}
                  {r.outstanding_ledger.map((i) => (
                    <tr key={i.journal_item_id}>
                      <td className="py-2 px-2">{formatDateIndo(i.entry_date)}</td>
                      <td className="py-2 px-2 font-mono">{i.entry_number}</td>
                      <td className="py-2 px-2">{i.description}</td>
                      <td className="py-2 px-2 text-right font-mono">{i.debit ? formatRupiah(i.debit) : ''}</td>
                      <td className="py-2 px-2 text-right font-mono">{i.credit ? formatRupiah(i.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {r.unrecorded_bank.some((l) => l.statement_date < r.start_date) && (
              <p className="text-amber-800">Ada mutasi rekening koran bulan sebelumnya yang belum dicocokkan; buka bulan tersebut untuk menyelesaikannya.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 6: Export it and add the tab**

In `src/modules/accounting/components/index.ts` replace:

```ts
export * from './AdjustingEntryModal';
```

with:

```ts
export * from './AdjustingEntryModal';
export * from './BankReconciliationTab';
```

In `src/modules/accounting/GeneralLedgerScreen.tsx`:

Replace:

```tsx
  BookMarked, BookOpen, CalendarClock, CreditCard, ExternalLink, Factory, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
```

with:

```tsx
  Banknote, BookMarked, BookOpen, CalendarClock, CreditCard, ExternalLink, Factory, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
```

Replace:

```tsx
  AdjustingEntryModal,
```

with:

```tsx
  AdjustingEntryModal,
  BankReconciliationTab,
```

Replace:

```tsx
export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports' | 'fixed-assets';
```

with:

```tsx
export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports' | 'fixed-assets' | 'bank-recon';
```

Replace:

```tsx
  /** Akses `fixed_assets`: register aset tetap & penyusutan. */
  canManageFixedAssets: boolean;
```

with:

```tsx
  /** Akses `fixed_assets`: register aset tetap & penyusutan. */
  canManageFixedAssets: boolean;
  /** Akses `bank_reconciliation`: rekonsiliasi Bank BCA. */
  canReconcileBank: boolean;
```

Replace:

```tsx
  { id: 'fixed-assets', label: '6. Aset Tetap', icon: Factory },
];

interface TabAccess {
  hub: boolean;
  payables: boolean;
  fixedAssets: boolean;
}
```

with:

```tsx
  { id: 'fixed-assets', label: '6. Aset Tetap', icon: Factory },
  { id: 'bank-recon', label: '7. Rekonsiliasi Bank', icon: Banknote },
];

interface TabAccess {
  hub: boolean;
  payables: boolean;
  fixedAssets: boolean;
  bankRecon: boolean;
}
```

Replace:

```tsx
  if (id === 'fixed-assets') return access.fixedAssets;
```

with:

```tsx
  if (id === 'fixed-assets') return access.fixedAssets;
  if (id === 'bank-recon') return access.bankRecon;
```

Replace:

```tsx
  canManageFixedAssets,
  onJournalsPosted,
```

with:

```tsx
  canManageFixedAssets,
  canReconcileBank,
  onJournalsPosted,
```

Replace:

```tsx
  const access: TabAccess = { hub: canUseHub, payables: canUsePayables, fixedAssets: canManageFixedAssets };
```

with:

```tsx
  const access: TabAccess = { hub: canUseHub, payables: canUsePayables, fixedAssets: canManageFixedAssets, bankRecon: canReconcileBank };
```

Replace:

```tsx
        {activeTab === 'fixed-assets' && <FixedAssetsTab refreshKey={ledgerVersion} onJournalsPosted={onJournalsPosted} />}
```

with:

```tsx
        {activeTab === 'fixed-assets' && <FixedAssetsTab refreshKey={ledgerVersion} onJournalsPosted={onJournalsPosted} />}
        {activeTab === 'bank-recon' && <BankReconciliationTab refreshKey={ledgerVersion} onJournalsPosted={onJournalsPosted} />}
```

In `src/App.tsx` replace:

```tsx
                canManageFixedAssets={can('fixed_assets')}
```

with:

```tsx
                canManageFixedAssets={can('fixed_assets')}
                canReconcileBank={can('bank_reconciliation')}
```

- [ ] **Step 7: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all Vitest files PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/modules/accounting/components/BankReconciliationTab.tsx \
        src/modules/accounting/components/index.ts \
        src/modules/accounting/GeneralLedgerScreen.tsx \
        src/App.tsx \
        src/shared/export/registry.ts \
        src/shared/export/__tests__/registry.test.ts
git commit -m "$(cat <<'EOF'
feat(accounting): add the bank reconciliation tab and export

The ledger screen gets a 1-1001 reconciliation tab: statement balance,
manual lines, CSV import, auto or manual matching, booking bank charges
and interest, and the bank-versus-book summary, which can be exported to
Excel or PDF.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F5: CALK tab and CALK in the report exports

**Files:**
- Create: `src/modules/accounting/components/CalkView.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/modules/accounting/components/SakEmkmReportTab.tsx`, `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: `sakEmkmApi.calk(period)`, `CalkReport` (F1); `lvSection`, `makeDoc` in `registry.ts`.
- Produces: `fin_calk` report data = `CalkReport` (9 sections); `sak_emkm_package` data = `{ financials: FinancialStatements; cashFlow: CashFlowReport; calk: CalkReport }` (4 + 9 = 13 sections); `CalkView` props `{ calk: CalkReport }`; report tab `'calk'` ("5. CALK").

- [ ] **Step 1: Write the failing registry tests**

In `src/shared/export/__tests__/registry.test.ts` replace:

```ts
import type { BankReconciliationReport } from '../../types/sakEmkm';
```

with:

```ts
import type { BankReconciliationReport, CalkReport } from '../../types/sakEmkm';
```

Inside `describe('registry financial statements', …)`, directly after the `cashFlow` fixture (the line `    is_reconciled: true,\n  };` that closes `const cashFlow`), add:

```ts
  const calk: CalkReport = {
    period: '2026-09', start_date: '2026-09-01', end_date: '2026-09-30',
    entity: { name: 'Omah Ban Cabang 3', address: 'Magelang, Jawa Tengah', activity: 'Perdagangan ban.', legal_form: 'UMKM perseorangan.', tax_status: 'non-PKP.', currency: 'Rupiah (Rp)' },
    compliance: 'Laporan keuangan disusun sesuai SAK EMKM.',
    policies: [
      { title: 'Persediaan', body: 'Metode FIFO.' },
      { title: 'Aset tetap dan penyusutan', body: 'Garis lurus.' },
    ],
    notes: {
      cash_and_bank: { lines: [{ code: '1-1000', name: 'Kas', amount: 150000 }, { code: '1-1001', name: 'Bank BCA', amount: 300000 }], total: 450000, bank_statement_balance: 300000, bank_reconciled: true },
      inventory: { ledger_balance: 700000, method: 'FIFO', breakdown: [{ category: 'Ban Baru', quantity: 2, value: 700000 }], breakdown_as_of: '2026-09-30' },
      prepaid_expenses: { balance: 1000000 },
      accrued_expenses: { balance: 300000 },
      fixed_assets: {
        assets: [{ code: 'AT-202609-0001', name: 'Mesin Spooring', category: 'Peralatan & Mesin Bengkel', acquisition_date: '2026-09-01', useful_life_months: 48, cost: 1000000, accumulated: 200000, book_value: 800000 }],
        total_cost: 1000000, total_accumulated: 200000, total_book_value: 800000, ledger_cost: 1000000, ledger_accumulated: 200000, depreciation_expense: 20833.33,
      },
      payables: { suppliers: [{ supplier_name: 'PT Ban Jaya', amount: 300000 }], subledger_total: 300000, other_adjustments: 0, ledger_balance: 300000 },
      equity: { lines: [{ code: '3-1000', name: 'Modal', amount: 1100000 }], total: 1100000 },
    },
  };

  it('calk memiliki 9 catatan dengan pernyataan kepatuhan dan kebijakan', () => {
    const doc = buildExportDoc('fin_calk', calk, ctx);
    expect(doc.sections).toHaveLength(9);
    expect(doc.sections[1].rows[0].uraian).toContain('SAK EMKM');
    expect(doc.sections[2].rows.map((r) => r.uraian)).toContain('Persediaan: Metode FIFO.');
    expect(doc.sections[6].rows[0].nilai_buku).toBe(800000);
    expect(doc.sections[6].totals?.nilai_buku).toBe(800000);
  });
```

and replace:

```ts
  it('sak emkm package memiliki 5 section', () => {
    const doc = buildExportDoc('sak_emkm_package', { financials: statements, cashFlow }, ctx);
    expect(doc.sections.length).toBe(5);
  });
```

with:

```ts
  it('sak emkm package memuat 4 laporan dan 9 catatan CALK', () => {
    const doc = buildExportDoc('sak_emkm_package', { financials: statements, cashFlow, calk }, ctx);
    expect(doc.sections.length).toBe(13);
    expect(doc.sections[4].title).toBe('CALK 1. INFORMASI UMUM');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: FAIL — `fin_calk` still builds one section from `FinancialStatements`, and the package has 5 sections.

- [ ] **Step 3: Rebuild the CALK export from the server report**

In `src/shared/export/registry.ts` replace:

```ts
import type { BankReconciliationReport } from '../types/sakEmkm';
```

with:

```ts
import type { BankReconciliationReport, CalkReport } from '../types/sakEmkm';
```

Replace the whole `calkSection` function:

```ts
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
```

with:

```ts
const textSection = (title: string, lines: string[]): ExportSection => ({
  title,
  columns: [{ key: 'uraian', label: 'Uraian', type: 'text', width: 110 }],
  rows: lines.map((uraian) => ({ uraian })),
});

/** CALK SAK EMKM dari server (GET /reports/calk): 9 catatan, sama dengan tab CALK di layar. */
const calkSections = (c: CalkReport): ExportSection[] => {
  const n = c.notes;
  const fa = n.fixed_assets;
  return [
    textSection('CALK 1. INFORMASI UMUM', [
      `Nama entitas: ${c.entity.name}, ${c.entity.address}.`,
      `Kegiatan usaha: ${c.entity.activity}`,
      `Bentuk usaha: ${c.entity.legal_form}`,
      `Status pajak: ${c.entity.tax_status}`,
      `Mata uang pelaporan: ${c.entity.currency}. Periode catatan: ${c.start_date} s/d ${c.end_date}.`,
    ]),
    textSection('CALK 2. PERNYATAAN KEPATUHAN', [c.compliance]),
    textSection('CALK 3. IKHTISAR KEBIJAKAN AKUNTANSI', c.policies.map((p) => `${p.title}: ${p.body}`)),
    lvSection('CALK 4. KAS DAN BANK', [
      ...n.cash_and_bank.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })),
      { label: 'JUMLAH KAS DAN BANK', value: n.cash_and_bank.total },
      ...(n.cash_and_bank.bank_statement_balance !== null
        ? [{ label: `Saldo rekening koran bank (${n.cash_and_bank.bank_reconciled ? 'terekonsiliasi' : 'belum terekonsiliasi'})`, value: n.cash_and_bank.bank_statement_balance }]
        : []),
    ]),
    lvSection('CALK 5. PERSEDIAAN (FIFO)', [
      { label: 'Persediaan ban (1-2000) per akhir periode', value: n.inventory.ledger_balance },
      ...n.inventory.breakdown.map((b) => ({ label: `Nilai FIFO ${b.category} (${b.quantity} unit, per ${n.inventory.breakdown_as_of})`, value: b.value })),
    ]),
    lvSection('CALK 6. BEBAN DIBAYAR DI MUKA DAN BEBAN YANG MASIH HARUS DIBAYAR', [
      { label: 'Beban dibayar di muka (1-1100)', value: n.prepaid_expenses.balance },
      { label: 'Beban yang masih harus dibayar (2-1100)', value: n.accrued_expenses.balance },
    ]),
    {
      title: 'CALK 7. ASET TETAP (GARIS LURUS)',
      columns: [
        { key: 'kode', label: 'Kode', type: 'text', width: 16 },
        { key: 'nama', label: 'Nama Aset', type: 'text', width: 28 },
        { key: 'kategori', label: 'Kategori', type: 'text', width: 22 },
        { key: 'tanggal', label: 'Perolehan', type: 'date', width: 12 },
        { key: 'umur', label: 'Umur (bln)', type: 'number', width: 9 },
        { key: 'perolehan', label: 'Harga Perolehan', type: 'currency' },
        { key: 'akumulasi', label: 'Akumulasi Penyusutan', type: 'currency' },
        { key: 'nilai_buku', label: 'Nilai Buku', type: 'currency' },
      ],
      rows: fa.assets.map((a) => ({
        kode: a.code, nama: a.name, kategori: a.category, tanggal: a.acquisition_date, umur: a.useful_life_months,
        perolehan: a.cost, akumulasi: a.accumulated, nilai_buku: a.book_value,
      })),
      totals: { perolehan: fa.total_cost, akumulasi: fa.total_accumulated, nilai_buku: fa.total_book_value },
    },
    lvSection('CALK 8. UTANG USAHA', [
      ...n.payables.suppliers.map((s) => ({ label: s.supplier_name, value: s.amount })),
      ...(n.payables.other_adjustments !== 0 ? [{ label: 'Penyesuaian lain (retur/koreksi)', value: n.payables.other_adjustments }] : []),
      { label: 'JUMLAH UTANG USAHA (2-1000)', value: n.payables.ledger_balance },
    ]),
    lvSection('CALK 9. EKUITAS', [
      ...n.equity.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })),
      { label: 'JUMLAH EKUITAS', value: n.equity.total },
    ]),
  ];
};
```

Replace:

```ts
const mapCalk = (fs: FinancialStatements, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_calk', 'CALK', 'portrait', ctx, [calkSection(fs)]);

export interface SakEmkmPackageInput {
  financials: FinancialStatements;
  cashFlow: CashFlowReport;
}
```

with:

```ts
const mapCalk = (c: CalkReport, ctx: ExportCtx): ExportDoc =>
  makeDoc('fin_calk', 'Catatan atas Laporan Keuangan', 'portrait', ctx, calkSections(c));

export interface SakEmkmPackageInput {
  financials: FinancialStatements;
  cashFlow: CashFlowReport;
  calk: CalkReport;
}
```

Replace:

```ts
    cashFlowSection(d.cashFlow),
    calkSection(d.financials),
  ]);
```

with:

```ts
    cashFlowSection(d.cashFlow),
    ...calkSections(d.calk),
  ]);
```

- [ ] **Step 4: Run the registry test**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: Create the CALK view**

Create `src/modules/accounting/components/CalkView.tsx`:

```tsx
import React from 'react';
import type { CalkReport } from '../../../shared/types/sakEmkm';
import { monthLabel } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

type Row = { label: string; value: number; strong?: boolean };

const Note: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <section className="space-y-2">
    <h3 className="text-sm font-black text-slate-900">{n}. {title}</h3>
    <div className="text-xs text-slate-700 leading-relaxed space-y-2">{children}</div>
  </section>
);

const Rows: React.FC<{ rows: Row[] }> = ({ rows }) => (
  <table className="w-full max-w-2xl">
    <tbody className="divide-y divide-slate-100">
      {rows.map((r, i) => (
        <tr key={i} className={r.strong ? 'font-bold' : ''}>
          <td className="py-1.5 pr-3">{r.label}</td>
          <td className={`py-1.5 text-right font-mono ${r.value < 0 ? 'text-rose-700' : ''}`}>{formatRupiah(r.value)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** Catatan atas Laporan Keuangan SAK EMKM; teks & angka dari server, sama dengan ekspor PDF/Word. */
export const CalkView: React.FC<{ calk: CalkReport }> = ({ calk }) => {
  const n = calk.notes;
  const fa = n.fixed_assets;
  const cash = n.cash_and_bank;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-base font-black text-slate-900">Catatan atas Laporan Keuangan — {monthLabel(calk.period)}</h2>
        <p className="text-xs text-slate-500">Posisi per {formatDateIndo(calk.end_date)}.</p>
      </header>

      <Note n={1} title="Informasi Umum">
        <dl className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-x-3 gap-y-1">
          <dt className="font-bold">Nama entitas</dt><dd>{calk.entity.name}, {calk.entity.address}</dd>
          <dt className="font-bold">Kegiatan usaha</dt><dd>{calk.entity.activity}</dd>
          <dt className="font-bold">Bentuk usaha</dt><dd>{calk.entity.legal_form}</dd>
          <dt className="font-bold">Status pajak</dt><dd>{calk.entity.tax_status}</dd>
          <dt className="font-bold">Mata uang</dt><dd>{calk.entity.currency}</dd>
        </dl>
      </Note>

      <Note n={2} title="Pernyataan Kepatuhan"><p>{calk.compliance}</p></Note>

      <Note n={3} title="Ikhtisar Kebijakan Akuntansi">
        <ol className="list-[lower-alpha] pl-5 space-y-1.5">
          {calk.policies.map((p) => <li key={p.title}><span className="font-bold">{p.title}.</span> {p.body}</li>)}
        </ol>
      </Note>

      <Note n={4} title="Kas dan Bank">
        <Rows rows={[...cash.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })), { label: 'Jumlah kas dan bank', value: cash.total, strong: true }]} />
        <p>
          {cash.bank_statement_balance === null
            ? 'Saldo rekening koran bulan ini belum diisi pada menu Rekonsiliasi Bank.'
            : `Saldo rekening koran ${formatRupiah(cash.bank_statement_balance)}; rekonsiliasi ${cash.bank_reconciled ? 'sudah cocok' : 'masih menyisakan selisih'}.`}
        </p>
      </Note>

      <Note n={5} title="Persediaan">
        <Rows rows={[
          { label: 'Persediaan ban (1-2000), metode FIFO', value: n.inventory.ledger_balance, strong: true },
          ...n.inventory.breakdown.map((b) => ({ label: `${b.category} (${b.quantity} unit)`, value: b.value })),
        ]} />
        {n.inventory.breakdown_as_of
          ? <p>Rincian per kategori berdasarkan batch FIFO per {formatDateIndo(n.inventory.breakdown_as_of)}.</p>
          : <p>Rincian per kategori hanya tersedia untuk bulan berjalan.</p>}
      </Note>

      <Note n={6} title="Beban Dibayar di Muka dan Beban yang Masih Harus Dibayar">
        <Rows rows={[
          { label: 'Beban dibayar di muka (1-1100)', value: n.prepaid_expenses.balance },
          { label: 'Beban yang masih harus dibayar (2-1100)', value: n.accrued_expenses.balance },
        ]} />
      </Note>

      <Note n={7} title="Aset Tetap">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="bg-slate-50 font-bold text-left">
              <tr>
                <th className="py-1.5 px-2">Aset</th><th className="py-1.5 px-2">Kategori</th><th className="py-1.5 px-2">Perolehan</th>
                <th className="py-1.5 px-2 text-right">Harga Perolehan</th><th className="py-1.5 px-2 text-right">Akumulasi</th><th className="py-1.5 px-2 text-right">Nilai Buku</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fa.assets.length === 0 && <tr><td colSpan={6} className="py-3 text-center text-slate-500">Tidak ada aset tetap per akhir periode.</td></tr>}
              {fa.assets.map((a) => (
                <tr key={a.code}>
                  <td className="py-1.5 px-2">{a.code} — {a.name}</td>
                  <td className="py-1.5 px-2">{a.category} ({a.useful_life_months} bln)</td>
                  <td className="py-1.5 px-2">{formatDateIndo(a.acquisition_date)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(a.cost)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(a.accumulated)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(a.book_value)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold">
              <tr>
                <td colSpan={3} className="py-1.5 px-2">Jumlah</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(fa.total_cost)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(fa.total_accumulated)}</td>
                <td className="py-1.5 px-2 text-right font-mono">{formatRupiah(fa.total_book_value)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p>
          Beban penyusutan bulan ini {formatRupiah(fa.depreciation_expense)}. Saldo buku besar: 1-3000 {formatRupiah(fa.ledger_cost)},
          1-3999 {formatRupiah(fa.ledger_accumulated)}.
        </p>
      </Note>

      <Note n={8} title="Utang Usaha">
        <Rows rows={[
          ...n.payables.suppliers.map((s) => ({ label: s.supplier_name, value: s.amount })),
          ...(n.payables.other_adjustments !== 0 ? [{ label: 'Penyesuaian lain (retur/koreksi)', value: n.payables.other_adjustments }] : []),
          { label: 'Jumlah utang usaha (2-1000)', value: n.payables.ledger_balance, strong: true },
        ]} />
      </Note>

      <Note n={9} title="Ekuitas">
        <Rows rows={[...n.equity.lines.map((l) => ({ label: `${l.code ?? ''} ${l.name}`.trim(), value: l.amount })), { label: 'Jumlah ekuitas', value: n.equity.total, strong: true }]} />
      </Note>
    </div>
  );
};
```

In `src/modules/accounting/components/index.ts` replace:

```ts
export * from './BankReconciliationTab';
```

with:

```ts
export * from './BankReconciliationTab';
export * from './CalkView';
```

- [ ] **Step 6: Add the CALK tab to the report tab**

In `src/modules/accounting/components/SakEmkmReportTab.tsx`:

Replace:

```tsx
import { accountingApi } from '../../../services/api';
import { PeriodSelection, currentMonth, resolvePeriod } from '../../../services/accountingPeriod';
```

with:

```tsx
import { accountingApi } from '../../../services/api';
import { sakEmkmApi } from '../../../services/api/sakEmkmApi';
import { PeriodSelection, currentMonth, monthLabel, resolvePeriod } from '../../../services/accountingPeriod';
```

Replace:

```tsx
import { CashFlowStatementTab } from './CashFlowStatementTab';
```

with:

```tsx
import { CalkView } from './CalkView';
import { CashFlowStatementTab } from './CashFlowStatementTab';
```

Replace:

```tsx
type ReportTab = 'income' | 'balance' | 'equity' | 'cashflow';
```

with:

```tsx
type ReportTab = 'income' | 'balance' | 'equity' | 'cashflow' | 'calk';
```

Replace:

```tsx
  { id: 'cashflow', label: '4. Arus Kas' },
];
```

with:

```tsx
  { id: 'cashflow', label: '4. Arus Kas' },
  { id: 'calk', label: '5. CALK' },
];
```

Replace:

```tsx
  const cf = cashFlow.data;
  const active = tab === 'cashflow' ? cashFlow : statements;
```

with:

```tsx
  const cf = cashFlow.data;
  // CALK disusun per bulan: bulan dari tanggal akhir periode yang dipilih.
  const calkPeriod = range.end_date.slice(0, 7);
  const calk = useServerData(() => sakEmkmApi.calk(calkPeriod), [calkPeriod, refreshKey]);
  const active: { data: unknown; loading: boolean; error: string | null; reload: () => void } =
    tab === 'cashflow' ? cashFlow : tab === 'calk' ? calk : statements;
```

Replace:

```tsx
          {fs && cf && <ExportMenu reportId="sak_emkm_package" data={{ financials: fs, cashFlow: cf }} ctx={ctx} />}
```

with:

```tsx
          {calk.data && tab === 'calk' && <ExportMenu reportId="fin_calk" data={calk.data} ctx={ctx} />}
          {fs && cf && calk.data && <ExportMenu reportId="sak_emkm_package" data={{ financials: fs, cashFlow: cf, calk: calk.data }} ctx={ctx} />}
```

Replace:

```tsx
        {cf && tab === 'cashflow' && <CashFlowStatementTab cashFlow={cf} periodLabel={range.label} />}
```

with:

```tsx
        {cf && tab === 'cashflow' && <CashFlowStatementTab cashFlow={cf} periodLabel={range.label} />}
        {tab === 'calk' && period.kind !== 'month' && (
          <p className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            CALK disusun per bulan; yang ditampilkan adalah {monthLabel(calkPeriod)} (bulan tanggal akhir periode).
          </p>
        )}
        {calk.data && tab === 'calk' && <CalkView calk={calk.data} />}
```

- [ ] **Step 7: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean (no other caller passes `FinancialStatements` to `fin_calk` or omits `calk` in the package: verify with `grep -rn "fin_calk\|sak_emkm_package" src --include=*.tsx`, which must list only `SakEmkmReportTab.tsx`); all Vitest files PASS.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/modules/accounting/components/CalkView.tsx \
        src/modules/accounting/components/index.ts \
        src/modules/accounting/components/SakEmkmReportTab.tsx \
        src/shared/export/registry.ts \
        src/shared/export/__tests__/registry.test.ts
git commit -m "$(cat <<'EOF'
feat(accounting): show the server calk in reports and exports

Laporan Keuangan gets a CALK tab rendering the server notes, and the CALK
and SAK EMKM package exports now print the same nine notes (compliance,
policies and account breakdowns) instead of six generated sentences.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

# Part D — Docs

### Task D1: Update the agent docs, the roadmap and the handoff

**Files:**
- Modify: `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`

**Interfaces:** consumes everything above; produces documentation only. These files were edited by SP6/SP2/SP3 first, so the steps name **the section to edit and the text to add** rather than an exact old line; read each file, keep the earlier sub-projects' text, and add ours.

- [ ] **Step 1: `docs/ai/domain-accounting.md`**

- COA heading and count: raise the account count by 5 (25 → 30 on the pre-SP2 base; 33 if SP2 added 2 and SP3 added 1). Add a sentence after the paragraph about migration `2026_09_30_000001`: "Migration `2026_10_04_000001_add_sak_emkm_accounts.php` adds 1-1100, 2-1100, 4-3000, 6-1011 and 6-1012 (SP4, SAK EMKM completeness)."
- COA table: add rows
  `| 1-1100 | Beban Dibayar di Muka (prepaid expenses) | ASSET | D |`,
  `| 2-1100 | Beban Yang Masih Harus Dibayar (accrued expenses) | LIABILITY | C |`,
  `| 4-3000 | Pendapatan Bunga Bank (bank interest) | REVENUE | C |`,
  `| 6-1011 | Beban Penyusutan Aset Tetap (depreciation) | EXPENSE | D |`,
  `| 6-1012 | Beban Administrasi Bank (bank charges) | EXPENSE | D |`,
  and append to the 1-3000 and 1-3999 rows: "Control account: only the fixed asset register (and the account opening balance) posts here."
- `reference_type` list: add `FIXED_ASSET_ACQUISITION`, `FIXED_ASSET_VOID`, `DEPRECIATION`, `ADJUSTING_ENTRY`, `ADJUSTING_REVERSAL`, `BANK_RECON_ADJUSTMENT`.
- Posting rules table: add rows

```markdown
| Fixed asset bought | 1-3000 | 1-1000 (TUNAI) or 1-1001 (TRANSFER); `OPENING` assets post nothing (already in the account opening balance) | `Accounting/FixedAssetService::create` (`FIXED_ASSET_ACQUISITION`). Void only before any depreciation: mirror `FIXED_ASSET_VOID` dated today, `reversal_of_id` |
| Monthly depreciation | 6-1011 per asset | 1-3999 total; dated the month's last day, reference `SUSUT-YYYY-MM` | `Accounting/DepreciationService::run`. Straight line on cost − residual − opening accumulated, over `useful_life_months`, full month from `depreciation_start`; cumulative in cents so reruns post nothing and locked months are caught up; the previous open month must run first; `fixed_asset_depreciations` keeps one row per asset per run |
| Adjusting entry (AJP) | 6-xxxx expense (not 6-1011) | 2-1100 (`ACCRUAL`) or 1-1100 (`PREPAID`); dated the month's last day, reference `AJP-YYYYMM-####` | `Accounting/AdjustingEntryService::create` (`ADJUSTING_ENTRY`). `auto_reverse` (accruals only) posts the mirror `ADJUSTING_REVERSAL` immediately, dated day 1 of the next month |
| Bank charge / interest from the statement | 6-1012, or 1-1001 | 1-1001, or 4-3000; dated the statement date, reference `REKON-{lineId}` | `Accounting/BankReconciliationService::postAdjustment` (`BANK_RECON_ADJUSTMENT`); the statement line is matched to the new 1-1001 line |
```

- Period closing row: append "Refuses a month while `DepreciationService::pendingTotal(period) > 0` (depreciation not run)."
- Manual journal row: the control accounts are now 1-1002, 1-2000, 2-1000, 2-1004, 1-3000, 1-3999.
- Reports section: add bullets

```markdown
- **`CalkReport::build($period)`** (`GET /reports/calk?period=YYYY-MM`) returns the CALK: entity constants, SAK EMKM
  compliance statement, seven policy texts (basis, cash & bank, FIFO inventory, straight-line depreciation, revenue,
  accrual expenses, tax incl. PPh Final 0.5% as policy text only — not accrued), and notes for cash & bank (with the
  month's bank reconciliation status), inventory (1-2000; FIFO value per category only for the current month),
  prepaid/accrued expenses, fixed assets (register as of the month end next to 1-3000/1-3999), payables per supplier
  as of the month end (TEMPO purchases − payments dated ≤ end, plus a balancing "penyesuaian lain" line to 2-1000) and
  equity (the balance-sheet equity section).
- **`BankReconciliationService::report($period)`**: statement ending balance + deposits in transit − outstanding
  payments = book 1-1001 + unrecorded bank credits − unrecorded bank debits. Ledger lines before the month of the
  first statement line (the cut-over) and `ACCOUNT_OPENING` lines are never outstanding.
- `CashFlowReport::bucket()` puts 4-3000 in "other operating" and 1-1100/2-1100 in "expenses"; depreciation and AJP
  entries touch no cash account and never appear in the cash-flow statement.
```

- [ ] **Step 2: `docs/ai/api-reference.md`**

Add a section after "Expenses and accounting":

```markdown
## SAK EMKM: fixed assets, AJP, bank reconciliation, CALK
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/accounting/fixed-assets` | `fixed_assets` | register + summary vs ledger 1-3000/1-3999 |
| POST | `/accounting/fixed-assets` | `fixed_assets` | `{name, category PERALATAN_BENGKEL\|INVENTARIS_TOKO\|KENDARAAN, acquisition_date≤today, acquisition_cost, residual_value?, useful_life_months 1..600, funding TUNAI\|TRANSFER\|OPENING, depreciation_start (OPENING only), opening_accumulated_depreciation (OPENING only), notes?}` → 201 `{asset, journals}` |
| POST | `/accounting/fixed-assets/{id}/void` | `fixed_assets` | `{reason}`; only before any depreciation |
| GET / POST | `/accounting/fixed-assets/depreciation` | `fixed_assets` | `period=YYYY-MM`; GET previews, POST posts (201) or reports nothing pending (200) |
| POST | `/accounting/adjusting-entries` | `accounting_hub` | `{period, kind ACCRUAL\|PREPAID, account_code 6-xxxx (not 6-1011), amount, description, auto_reverse (ACCRUAL only)}` |
| GET | `/accounting/bank-reconciliation` | `bank_reconciliation` | `period=YYYY-MM` report |
| PUT | `/accounting/bank-reconciliation/{period}` | `bank_reconciliation` | `{statement_ending_balance}` |
| POST | `/accounting/bank-reconciliation/lines`, `/import` (multipart `file`, CSV `tanggal,keterangan,jumlah`), `/auto-match` | `bank_reconciliation` | |
| DELETE / POST | `/accounting/bank-reconciliation/lines/{id}`, `/lines/{id}/match` (`journal_item_id`), `/lines/{id}/unmatch`, `/lines/{id}/post-adjustment` | `bank_reconciliation` | |
| GET | `/reports/calk` | `financial_reports`, `accounting_hub` | `period=YYYY-MM` (≤ current month) |
```

Also note in the period-close row: "422 while depreciation for the period is pending."

- [ ] **Step 3: `docs/ai/data-model.md`**

Raise the migration count by 3 and add an "Assets and bank reconciliation" table section:

```markdown
## Fixed assets and bank reconciliation (SP4)
| Table | Key columns | Notes |
|---|---|---|
| `fixed_assets` | `code` (`AT-YYYYMM-####`), `name`, `category`, `acquisition_date`, `acquisition_cost`, `residual_value`, `useful_life_months`, `depreciation_start` (YYYY-MM), `opening_accumulated_depreciation`, `funding` (TUNAI/TRANSFER/OPENING), `journal_entry_number`, `status` (ACTIVE/VOID), `void_reason`, `voided_by`, `voided_at`, `created_by` | sub-ledger of 1-3000/1-3999 |
| `fixed_asset_depreciations` | `fixed_asset_id`, `period`, `amount`, `journal_entry_id` | one row per asset per depreciation run |
| `bank_statement_lines` | `statement_date`, `description`, `amount` (+ in, − out), `source` (MANUAL/CSV), `journal_item_id` (unique, nullable) | matched when `journal_item_id` is set |
| `bank_reconciliations` | `period` (unique), `statement_ending_balance`, `updated_by` | status is computed by the report |
```

Add `1-1100, 2-1100, 4-3000, 6-1011, 6-1012` to the `accounts` row note (and raise its row count by 5).

- [ ] **Step 4: `docs/ai/architecture.md`**

- Ledger sub-tabs: `journals | ledger | trial-balance | payables | reports | fixed-assets | bank-recon`; each tab has its own gate (`isTabAllowed` in `GeneralLedgerScreen.tsx`); the ledger screen is reachable with `accounting_hub`, `accounts_payable`, `fixed_assets` or `bank_reconciliation`.
- Screen gate table: ledger row becomes "`accounting_hub`, `accounts_payable`, `fixed_assets` or `bank_reconciliation`".
- API client list: add `sakEmkmApi` (`src/services/api/sakEmkmApi.ts`, types in `src/shared/types/sakEmkm.ts`); SP4 components report posted journals through the `onJournalsPosted` prop (= `notifyLedgerChanged`).
- Export system: `fin_calk` and `sak_emkm_package` now take the server `CalkReport`; new report `bank_reconciliation`.

- [ ] **Step 5: `AGENTS.md` and `backend/AGENTS.md`**

`AGENTS.md`: in rule 2 raise the COA count by 5; in the migration-status table add a row
`| Fixed asset register & depreciation, adjusting entries (AJP), bank reconciliation, CALK | Server | SP4 (done) |`.

`backend/AGENTS.md`: in the layout block under `app/Services/`, add a line
`  Accounting/                   … FixedAssetService, DepreciationService, AdjustingEntryService, BankReconciliationService, CalkReport`
(merge into the existing `Accounting/` line if one exists, otherwise add it).

- [ ] **Step 6: `docs/ai/workflow-and-gotchas.md`**

- Spec/plan status table: add `| 09-30 | SAK EMKM completeness (SP4): fixed assets & depreciation, AJP, bank reconciliation, CALK | done |`.
- Stages paragraph: remove "depreciation" from the list of remaining client-only areas.
- Glossary: add rows `| Aset tetap / penyusutan / akumulasi penyusutan | fixed asset / depreciation (6-1011) / accumulated depreciation (1-3999) |`, `| AJP (jurnal penyesuaian) / akrual / dibayar di muka | month-end adjusting entry / accrued expense (2-1100) / prepaid expense (1-1100) |`, `| Rekening koran / rekonsiliasi bank | bank statement / bank reconciliation |`, `| CALK | Catatan atas Laporan Keuangan, notes to the financial statements |`.
- Frontend test count: update to the numbers printed by the last `npm test`.

- [ ] **Step 7: Roadmap and handoff**

`docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, section "Sub-project 4 — SAK EMKM completeness": change the heading to
`## Sub-project 4 — SAK EMKM completeness  → spec \`2026-09-30-sak-emkm-completeness-design.md\` (done)` and annotate the PPh line:
`- 🟡 PPh Final UMKM 0.5% accrual — decided out of scope (user, 2026-09-30); stated in the CALK tax policy only.`

`docs/superpowers/plans/2026-09-30-accounting-handoff.md`, section 3 table: in row 4 append " — **done** (`2026-09-30-sak-emkm-completeness`)". Update the gate counts in section 1 to the numbers printed by the last backend and frontend runs.

- [ ] **Step 8: Check the docs**

Run:

```bash
grep -nE "6-1011|bank_reconciliation|reports/calk|DEPRECIATION" docs/ai/*.md AGENTS.md | head -20
git status --short
```

Expected: the grep shows the new entries in `domain-accounting.md`, `api-reference.md` and `data-model.md`; `git status --short` lists only the nine doc files of this task as modified (plus the user's `docs/flowchart*` changes, which must not be staged). No code changed, so there is no test gate.

- [ ] **Step 9: Commit**

```bash
git add AGENTS.md \
        backend/AGENTS.md \
        docs/ai/domain-accounting.md \
        docs/ai/api-reference.md \
        docs/ai/data-model.md \
        docs/ai/architecture.md \
        docs/ai/workflow-and-gotchas.md \
        docs/superpowers/specs/2026-09-29-accounting-roadmap.md \
        docs/superpowers/plans/2026-09-30-accounting-handoff.md
git commit -m "$(cat <<'EOF'
docs(accounting): describe fixed assets, ajp, bank reconciliation and calk

Agent docs, the roadmap and the handoff now list the five new accounts,
six journal types, the fixed asset, adjusting-entry, bank reconciliation
and CALK endpoints and tables, and mark sub-project 4 as done.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

# Part M — Manual finish

### Task M1: Browser checklist — USER ONLY

> Agents stop after D1. The migrations were already applied to the dev DB (B1, B2, B5; additive). Nothing here is destructive.

**Files:** none. **Interfaces:** consumes B1–F5 and D1 committed with both gates green.

- [ ] **Step 1 (user):** `npm run dev:all`, log in as OWNER, open Buku Besar.
- [ ] **Step 2 (user): Aset Tetap tab** — record a machine bought by transfer this month (journal `FIXED_ASSET_ACQUISITION` Dr 1-3000 / Cr 1-1001 in Jurnal Umum → filter "Aset Tetap"); record an older machine with "Sudah tercatat di Saldo Awal" matching the 1-3000/1-3999 opening balance; the summary card reads "Cocok". Preview and run depreciation for last month and this month (`DEPRECIATION` journal dated the month end); a second run says "Tidak ada penyusutan…". Void a freshly added test asset (mirror journal).
- [ ] **Step 3 (user): Tutup Buku** — for a month with an undepreciated asset the server refuses with "Penyusutan aset tetap sampai … belum dibukukan"; after running depreciation, closing works.
- [ ] **Step 4 (user): AJP** — "AJP Akrual / Dibayar di Muka": accrue electricity for this month with automatic reversal → two journals (month end, day 1 next month) under filter "AJP Akrual/Prabayar"; a prepaid AJP rejects the reversal option (hidden).
- [ ] **Step 5 (user): Rekonsiliasi Bank tab** — import a CSV (`tanggal;keterangan;jumlah`), auto-match, match one line by hand, book an admin fee and interest, enter the statement balance; status becomes "Terekonsiliasi"; export to Excel/PDF opens.
- [ ] **Step 6 (user): Laporan Keuangan → 5. CALK** — shows nine notes; export CALK to PDF/Word and the SAK EMKM package; the balance sheet is still "Seimbang" and the cash flow "Terekonsiliasi" (interest under "Arus kas operasi lainnya", bank charges under beban).
- [ ] **Step 7 (user): Permissions** — Pengaturan → Hak Akses lists "Register Aset Tetap & Penyusutan" and "Rekonsiliasi Bank BCA" (off for Kasir/Gudang). Grant only "Register Aset Tetap" to Gudang: Gudang sees Buku Besar with only the Aset Tetap tab. Revoke it again.
- [ ] **Step 8 (user): Report** — note any failing step (screen + action) and open a fix task; do not edit database rows by hand.
