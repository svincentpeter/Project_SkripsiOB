# Operational Reports & Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a server-computed daily cash report, daily recap and per-cashier recap (with SP2 shift summaries), make the executive dashboard read its money figures from those reports, and replace every `toISOString()`-derived business date with `localDate()`.

**Architecture:** One read-only backend service (`Reports/DailyReportService`) groups POSTED journals per day with the income statement's own classification (so a month's recap equals that month's Laba Rugi) and 1-1000/1-1001 movements per journal type (so cash movements equal the ledger's cash change); the sales table only supplies nota counts, tyre units, payment mix and per-nota/per-cashier rows. Two endpoints (`/reports/daily-recap`, `/reports/daily-cash`) feed a new "Laporan Harian" screen, the dashboard and two new exports. No journals, accounts or reference types are added.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-operational-reports-design.md`.

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/architecture.md` and the spec before starting.
- **Prerequisites:** this plan executes LAST, on top of SP6, SP2 (cash & bank), SP3 (transaction corrections) and SP4 (SAK EMKM completeness). Before Task B1 check: `grep -c "4-9100" backend/database/seeders/AccountCoaSeeder.php` prints ≥ 1 (SP3) and `ls backend/database/migrations | grep 2026_10_02` lists SP2's migrations including the one that creates `cash_sessions`. If either is missing, stop and report: the earlier sub-projects have not been executed.
- Rely only on these interfaces from earlier sub-projects: table `cash_sessions` (id, user_id, opened_at, closed_at, opening_float, expected_cash, counted_cash, variance, variance_reason, status OPEN|PENDING_APPROVAL|CLOSED, approved_by, approved_at, journal_entry_id); account 4-9100 (SP3); journal reference types `CASH_SESSION_VARIANCE`, `CASH_DEPOSIT`, `OWNER_DRAWING`, `CAPITAL_INJECTION`, `SALES_RETURN`, `PURCHASE_RETURN`, `GOODS_RECEIPT_CANCEL`, `DEPRECIATION`, `ADJUSTING_ENTRY`, `ADJUSTING_REVERSAL`, `BANK_RECON_ADJUSTMENT`. Do not read SP2/SP3/SP4 models or services.
- **Anchor drift:** SP2–SP4 also edit `backend/app/Support/Permissions.php`, `src/shared/types/index.ts` (`PermissionKey`), `src/shared/data/mockData.ts` (`DEFAULT_ROLE_PERMISSIONS`), `RolePermissionsTab.tsx`, `App.tsx`, `HeaderNavbar.tsx`, the export registry and its test, `UserPermissionTest` and `authNavigationService.test.ts`. The "before" snippets below are the code at HEAD `8df80ca`. When a snippet no longer matches exactly, keep everything SP2–SP4 added and apply the same change (the edit always says what to add and where). Count assertions are written as "+1"/"+2" of whatever value SP2–SP4 left.
- **Never stage, modify or revert** `docs/flowchart_local/` or `docs/flowchart/*` (the user's work). Run `git status --short` before each commit: only the task's files may be staged. Stage **by explicit path**; never `git add -A`, `git add .` or `git commit -a`.
- Execute tasks in order B1 → B2 → B3 → F1 → F2 → F3 → F4 → D1. Later tasks' anchors are written against the output of earlier ones.
- Commits go directly on `main`: Conventional Commits with a scope, in English, lowercase imperative subject, a short body explaining why, and the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- All user-facing text (UI, validation and error messages) is Indonesian.
- SP5 **posts no journals**. If a journal is ever needed, it goes only through `AccountingEngine::createEntry` / `JournalDraft` (tests use `JournalDraft` to create fixtures).
- Business-rule violations throw `App\Exceptions\PosRuleException` (422). API envelope `{ "success": true, "message"?: "...", "data": ... }`.
- New backend test classes use `Illuminate\Foundation\Testing\DatabaseTransactions`. Never name a test helper `post()` (collides with `TestCase::post()`); this plan uses `postJournal()`.
- Laragon MySQL must be running. After adding a migration, migrate the testing DB: Git Bash `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force` (PowerShell `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`). The only migration in this plan is additive, so also migrate the dev DB: `cd backend && php artisan migrate --force`.
- Gates: backend tasks end with `cd backend && php artisan config:clear && php artisan test` passing (`composer test` is broken locally: the bundled composer is too old for `@no_additional_args`). Frontend tasks end with `npm run lint && npm test` passing (repo root). `tsc` does not flag unused imports.
- Frontend business dates use `localDate()` / `currentMonth()` from `src/services/accountingPeriod.ts`, never `toISOString()`.
- Commands use Git Bash syntax from the repo root `C:\laragon\www\Project_SkripsiOB` unless a `cd` is shown.

## File Map

Backend (create):
- `backend/app/Services/Reports/DailyReportService.php` — `recap(from, to)`, `dailyCash(date, ?User $only)`.
- `backend/app/Http/Controllers/Api/v1/DailyReportController.php` — `recap`, `cash`.
- `backend/database/migrations/2026_10_05_000001_add_daily_reports_permission.php`
- `backend/tests/Feature/DailyReportTest.php`

Backend (modify): `backend/app/Support/Permissions.php`, `backend/app/Services/Accounting/FinancialReportService.php` (`incomeSection` → public), `backend/routes/api.php`, `backend/tests/Unit/UserPermissionTest.php`.

Frontend (create):
- `src/services/api/reportsApi.ts` — `reportsApi.dailyRecap`, `reportsApi.dailyCash`.
- `src/services/dailyReports.ts` — `PAYMENT_GROUPS`, `PAYMENT_GROUP_LABELS`, `emptyRecapRow`, `sumRecapRows`, `dashboardRange`, `summarizeDashboard`, `cashMovementLabel`.
- `src/services/__tests__/dailyReports.test.ts`, `src/services/__tests__/localDateUsage.test.ts`
- `src/modules/reports/DailyReportsScreen.tsx`, `src/modules/reports/index.ts`

Frontend (modify): `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/services/api/index.ts`, `src/services/authNavigationService.ts`, `src/services/__tests__/authNavigationService.test.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/modules/dashboard/ExecutiveDashboardScreen.tsx`, `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`, `src/shared/components/HeaderNavbar.tsx`, `src/App.tsx`; `localDate()` sweep: `src/modules/accounting/components/LedgerPrintModal.tsx`, `src/modules/accounting/components/PayDebtModal.tsx`, `src/modules/inventory/components/GoodsReceiptModal.tsx`, `src/modules/inventory/components/StockMonthlyLedgerView.tsx`, `src/services/stockMonthlyLedgerService.ts`, `src/modules/pos/PosScreen.tsx`, `src/modules/receipt/ThermalReceiptScreen.tsx`, `src/services/inventoryService.ts`.

Docs (modify, Task D1): `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/api-reference.md`, `docs/ai/architecture.md`, `docs/ai/domain-accounting.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`.

Not touched: `CheckoutModal.tsx` and `posService.ts` (already use `localDate()`), timestamps that are real instants (`ExpenseForm` `created_at`, `QrisDynamicModal` `settlement_time`, `stockReconciliationApi` `generated_at`, `kop.ts` `generatedAt`, legacy `supabaseDataService` / `productCategoryService` `updated_at`).

---

# Part B — Backend

### Task B1: `daily_reports` permission key

**Files:**
- Create: `backend/database/migrations/2026_10_05_000001_add_daily_reports_permission.php`
- Modify: `backend/app/Support/Permissions.php`, `backend/tests/Unit/UserPermissionTest.php`

**Interfaces:**
- Produces: permission key `daily_reports` (KASIR default true, GUDANG false) in `Permissions::KEYS`; `role_permissions` rows for existing databases.
- Consumes: `RolePermissionSeeder` (inserts missing keys from `Permissions::DEFAULTS`, already idempotent).

- [ ] **Step 1: Write the failing tests**

In `backend/tests/Unit/UserPermissionTest.php`, in `test_auth_array_exposes_permission_map_without_password`, replace

```php
        $this->assertCount(13, $data['permissions']);
```

with (add 1 to whatever count SP2–SP4 left; at HEAD it is 13 → 14)

```php
        $this->assertCount(14, $data['permissions']);
        $this->assertFalse($data['permissions']['daily_reports']);
```

Then add these two methods at the end of the class (before its final `}`):

```php
    public function test_kasir_may_read_own_daily_reports_by_default(): void
    {
        $this->assertTrue($this->makeUser('KASIR')->hasPermission('daily_reports'));
        $this->assertFalse($this->makeUser('GUDANG')->hasPermission('daily_reports'));
    }

    public function test_daily_reports_migration_inserts_missing_rows_only(): void
    {
        RolePermission::where('permission_key', 'daily_reports')->delete();
        RolePermission::create(['role' => 'GUDANG', 'permission_key' => 'daily_reports', 'allowed' => true]);

        (require database_path('migrations/2026_10_05_000001_add_daily_reports_permission.php'))->up();

        $this->assertTrue((bool) RolePermission::where(['role' => 'KASIR', 'permission_key' => 'daily_reports'])->value('allowed'));
        // Pilihan Owner yang sudah ada tidak ditimpa.
        $this->assertTrue((bool) RolePermission::where(['role' => 'GUDANG', 'permission_key' => 'daily_reports'])->value('allowed'));
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=UserPermissionTest`
Expected: FAIL — the permission map has no `daily_reports` key (count mismatch / undefined key), `hasPermission('daily_reports')` is false for KASIR, and the migration file does not exist.

- [ ] **Step 3: Add the key**

In `backend/app/Support/Permissions.php` add `'daily_reports'` as the last element of `KEYS` and of `DEFAULTS['KASIR']` (keep every key SP2–SP4 added). At HEAD:

```php
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];
```

becomes

```php
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
        'daily_reports',
    ];
```

and

```php
        'KASIR' => ['pos', 'receipt'],
```

becomes

```php
        'KASIR' => ['pos', 'receipt', 'daily_reports'],
```

- [ ] **Step 4: Create the migration**

Create `backend/database/migrations/2026_10_05_000001_add_daily_reports_permission.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Izin daily_reports (Laporan Harian): Kasir boleh melihat rekap miliknya sendiri, Gudang tidak.
 * Hanya menambah baris yang belum ada, jadi pilihan Owner tidak tertimpa.
 */
return new class extends Migration
{
    private const KEY = 'daily_reports';

    private const DEFAULTS = ['KASIR' => true, 'GUDANG' => false];

    public function up(): void
    {
        foreach (self::DEFAULTS as $role => $allowed) {
            $exists = DB::table('role_permissions')->where('role', $role)->where('permission_key', self::KEY)->exists();
            if (! $exists) {
                DB::table('role_permissions')->insert([
                    'role' => $role,
                    'permission_key' => self::KEY,
                    'allowed' => $allowed,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        DB::table('role_permissions')->where('permission_key', self::KEY)->delete();
    }
};
```

- [ ] **Step 5: Migrate both databases**

Run:

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force
cd backend && php artisan migrate --force
```

Expected: each prints `2026_10_05_000001_add_daily_reports_permission ... DONE`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter=UserPermissionTest`
Expected: PASS.

- [ ] **Step 7: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests pass (previous count + 2).

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/app/Support/Permissions.php \
        backend/database/migrations/2026_10_05_000001_add_daily_reports_permission.php \
        backend/tests/Unit/UserPermissionTest.php
git commit -m "$(cat <<'EOF'
feat(auth): add the daily_reports permission key

Cashiers get read access to their own daily recap by default; the
migration inserts only missing rows so owner choices survive.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B2: Daily recap endpoint (`GET /reports/daily-recap`)

**Files:**
- Create: `backend/app/Services/Reports/DailyReportService.php`, `backend/app/Http/Controllers/Api/v1/DailyReportController.php`, `backend/tests/Feature/DailyReportTest.php`
- Modify: `backend/app/Services/Accounting/FinancialReportService.php`, `backend/routes/api.php`

**Interfaces:**
- Consumes: `FinancialReportService::incomeSection(Account): ?string` (made public here), `LedgerBalances::CLOSING_TYPES`, `CashFlowReport::CASH_ACCOUNTS`, `OpeningBalanceService::REFERENCE_TYPE`, `PosAccounts::REVENUE_GOODS|REVENUE_SERVICE`.
- Produces: `DailyReportService::recap(string $from, string $to): array` → `['from', 'to', 'rows' => list<row>, 'totals' => row-without-date]`, row keys `date, sales_count, product_qty, revenue, goods_revenue, service_revenue, contra_revenue, returns, net_revenue, cost_of_sales, gross_profit, operating_expenses, net_income, payment_mix{TUNAI,TRANSFER,QRIS}, cash_in, cash_out, net_cash`; `DailyReportService::MAX_DAYS = 92`, `SALES_RETURN = '4-9100'`, `PAYMENT_GROUPS`. Route `GET /api/v1/reports/daily-recap?from&to` (`permission:dashboard,financial_reports`).

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/DailyReportTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use App\Services\Reports\DailyReportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Laporan operasional harian: uang dari jurnal (sama dengan Laba Rugi & perubahan kas), jumlah nota dari tabel
 * penjualan. Tanggal uji di tahun 2020 agar tidak bercampur dengan data test lain.
 */
class DailyReportTest extends TestCase
{
    use DatabaseTransactions;

    /** @param list<array{0: string, 1: float, 2: float}> $lines */
    private function postJournal(string $date, array $lines, string $referenceType): void
    {
        $draft = new JournalDraft();
        foreach ($lines as [$code, $debit, $credit]) {
            $debit > 0 ? $draft->debit($code, $debit, 'uji') : $draft->credit($code, $credit, 'uji');
        }
        $draft->post(app(AccountingEngine::class), $referenceType, 'DR-'.uniqid(), 'Uji laporan harian', $date);
    }

    /**
     * Nota dibuat langsung sebagai model (tanpa checkout, jadi tidak butuh sesi kasir SP2).
     *
     * @param  list<array{0: string, 1: float}>  $payments  [[metode, jumlah], ...]
     */
    private function makeSale(string $date, string $cashier, array $payments, string $status = 'LUNAS', int $tyres = 1, int $services = 0): Sale
    {
        $total = array_sum(array_column($payments, 1));
        $sale = Sale::create([
            'reference' => 'DR-INV-'.uniqid(),
            'date' => $date,
            'cashier_name' => $cashier,
            'gross_sales_amount' => $total,
            'total_amount' => $total,
            'paid_amount' => $total,
            'payment_method' => count($payments) === 1 ? $payments[0][0] : 'SPLIT',
            'status' => $status,
            'voided_at' => $status === 'VOID' ? $date.' 15:00:00' : null,
        ]);
        foreach ([['PRODUCT', $tyres], ['SERVICE', $services]] as [$type, $qty]) {
            if ($qty > 0) {
                SaleDetail::create([
                    'sale_id' => $sale->id, 'item_type' => $type, 'item_name' => $type,
                    'quantity' => $qty, 'unit_price' => 1000, 'sub_total' => 1000 * $qty,
                ]);
            }
        }
        foreach ($payments as [$method, $amount]) {
            SalePayment::create([
                'sale_id' => $sale->id, 'method' => $method,
                'account_code' => $method === 'TUNAI' ? '1-1000' : '1-1001',
                'amount' => $amount, 'net_received' => $amount,
            ]);
        }

        return $sale;
    }

    public function test_recap_rows_follow_the_income_statement_and_the_cash_change(): void
    {
        // 10 Feb: nota split tunai + QRIS (MDR 2rb), diskon 10rb, HPP FIFO 250rb.
        $this->postJournal('2020-02-10', [['1-1000', 300000, 0], ['1-1001', 198000, 0], ['6-1009', 2000, 0], ['4-9000', 10000, 0], ['4-1000', 0, 460000], ['4-1001', 0, 50000]], 'POS_SALE');
        $this->postJournal('2020-02-10', [['5-1000', 250000, 0], ['1-2000', 0, 250000]], 'POS_SALE');
        // 11 Feb: biaya tunai; retur penjualan (refund tunai dari laci, barang kembali ke stok FIFO).
        $this->postJournal('2020-02-11', [['6-1001', 20000, 0], ['1-1000', 0, 20000]], 'EXPENSE');
        $this->postJournal('2020-02-11', [['4-9100', 100000, 0], ['1-1000', 0, 100000]], 'SALES_RETURN');
        $this->postJournal('2020-02-11', [['1-2000', 60000, 0], ['5-1000', 0, 60000]], 'SALES_RETURN');
        // 12 Feb: setor kas laci ke bank.
        $this->postJournal('2020-02-12', [['1-1001', 50000, 0], ['1-1000', 0, 50000]], 'CASH_DEPOSIT');

        $recap = app(DailyReportService::class)->recap('2020-02-10', '2020-02-12');

        $this->assertSame(['2020-02-10', '2020-02-11', '2020-02-12'], array_column($recap['rows'], 'date'));
        [$d10, $d11, $d12] = $recap['rows'];

        $this->assertEquals(510000, $d10['revenue']);
        $this->assertEquals(460000, $d10['goods_revenue']);
        $this->assertEquals(50000, $d10['service_revenue']);
        $this->assertEquals(10000, $d10['contra_revenue']);
        $this->assertEquals(0, $d10['returns']);
        $this->assertEquals(500000, $d10['net_revenue']);
        $this->assertEquals(250000, $d10['cost_of_sales']);
        $this->assertEquals(250000, $d10['gross_profit']);
        $this->assertEquals(2000, $d10['operating_expenses']);
        $this->assertEquals(248000, $d10['net_income']);
        $this->assertEquals(498000, $d10['cash_in']);
        $this->assertEquals(0, $d10['cash_out']);

        $this->assertEquals(100000, $d11['returns']);
        $this->assertEquals(-100000, $d11['net_revenue']);
        $this->assertEquals(-60000, $d11['cost_of_sales']);
        $this->assertEquals(20000, $d11['operating_expenses']);
        $this->assertEquals(-60000, $d11['net_income']);
        $this->assertEquals(120000, $d11['cash_out']);

        $this->assertEquals(50000, $d12['cash_in']);
        $this->assertEquals(50000, $d12['cash_out']);
        $this->assertEquals(0, $d12['net_cash']);
        $this->assertEquals(0, $d12['net_income']);

        // Jumlah rekap = Laba Rugi periode yang sama (klasifikasi & pengecualian tutup buku sama).
        $income = app(FinancialReportService::class)->incomeStatement('2020-02-10', '2020-02-12');
        $this->assertEqualsWithDelta($income['net_revenue'], $recap['totals']['net_revenue'], 0.001);
        $this->assertEqualsWithDelta($income['cost_of_sales']['total'], $recap['totals']['cost_of_sales'], 0.001);
        $this->assertEqualsWithDelta($income['operating_expenses']['total'], $recap['totals']['operating_expenses'], 0.001);
        $this->assertEqualsWithDelta($income['net_income'], $recap['totals']['net_income'], 0.001);

        // Mutasi kas = perubahan saldo 1-1000 + 1-1001.
        $change = array_sum(CashFlowReport::cashBalances('2020-02-12')) - array_sum(CashFlowReport::cashBalances('2020-02-09'));
        $this->assertEqualsWithDelta($change, $recap['totals']['net_cash'], 0.001);
    }

    public function test_counts_and_payment_mix_ignore_voided_notas(): void
    {
        $this->makeSale('2020-03-05', 'Kasir A', [['TUNAI', 100000]], tyres: 2);
        $this->makeSale('2020-03-05', 'Kasir B', [['TUNAI', 50000], ['QRIS', 70000]], tyres: 1, services: 1);
        $this->makeSale('2020-03-05', 'Kasir A', [['TRANSFER_BCA', 80000]]);
        $this->makeSale('2020-03-05', 'Kasir A', [['TRANSFER', 90000]], 'VOID', tyres: 4);

        $row = app(DailyReportService::class)->recap('2020-03-05', '2020-03-05')['rows'][0];

        $this->assertSame(3, $row['sales_count']);
        $this->assertSame(4, $row['product_qty']);
        $this->assertEquals(['TUNAI' => 150000, 'TRANSFER' => 80000, 'QRIS' => 70000], $row['payment_mix']);
    }

    public function test_void_on_a_later_day_reverses_money_on_the_void_date(): void
    {
        $this->postJournal('2020-03-20', [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');
        $this->postJournal('2020-03-21', [['4-1000', 100000, 0], ['1-1000', 0, 100000]], 'POS_SALE_VOID');

        $recap = app(DailyReportService::class)->recap('2020-03-20', '2020-03-21');

        $this->assertEquals(100000, $recap['rows'][0]['revenue']);
        $this->assertEquals(100000, $recap['rows'][0]['cash_in']);
        $this->assertEquals(-100000, $recap['rows'][1]['revenue']);
        $this->assertEquals(100000, $recap['rows'][1]['cash_out']);
        $this->assertEquals(0, $recap['totals']['revenue']);
        $this->assertEquals(0, $recap['totals']['net_cash']);
    }

    public function test_recap_endpoint_shape_range_rules_and_permissions(): void
    {
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')
            ->assertOk()
            ->assertJsonCount(3, 'data.rows')
            ->assertJsonStructure(['data' => [
                'from', 'to',
                'rows' => [['date', 'sales_count', 'product_qty', 'net_revenue', 'gross_profit', 'net_income', 'payment_mix' => ['TUNAI', 'TRANSFER', 'QRIS'], 'cash_in', 'cash_out', 'net_cash']],
                'totals' => ['sales_count', 'net_revenue', 'operating_expenses', 'payment_mix'],
            ]]);

        $this->getJson('/api/v1/reports/daily-recap?from=2020-01-01&to=2020-04-01')->assertOk()->assertJsonCount(92, 'data.rows');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-01-01&to=2020-04-02')
            ->assertStatus(422)
            ->assertJsonPath('message', 'Rentang rekap harian maksimal 92 hari.');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-12&to=2020-02-10')->assertStatus(422)->assertJsonValidationErrors('to');

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')->assertForbidden();
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/reports/daily-recap?from=2020-02-10&to=2020-02-12')->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=DailyReportTest`
Expected: FAIL — `Class "App\Services\Reports\DailyReportService" not found`, and the endpoint returns 404.
If a journal fixture fails with "akun 4-9100 tidak ditemukan"/`RuntimeException` for 4-9100, SP3 has not been executed: stop (Global Constraints).

- [ ] **Step 3: Make `incomeSection` public**

In `backend/app/Services/Accounting/FinancialReportService.php` replace

```php
    private static function incomeSection(Account $account): ?string
```

with

```php
    /** Bagian laba rugi sebuah akun; dipakai juga oleh rekap harian agar angkanya sama dengan Laba Rugi. */
    public static function incomeSection(Account $account): ?string
```

- [ ] **Step 4: Create the service**

Create `backend/app/Services/Reports/DailyReportService.php`:

```php
<?php

namespace App\Services\Reports;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\FinancialReportService;
use App\Services\Accounting\LedgerBalances;
use App\Services\Accounting\OpeningBalanceService;
use App\Services\Pos\PosAccounts;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Laporan operasional harian: rekap harian (juga sumber dashboard), laporan kas harian, rekap per kasir dan
 * ringkasan sesi kasir. Hanya membaca; tidak membukukan jurnal.
 *
 * Angka uang dibaca dari jurnal POSTED dengan klasifikasi yang sama dengan Laba Rugi, sehingga jumlah rekap
 * sebulan sama dengan laba rugi bulan itu dan mutasi kas sama dengan perubahan saldo 1-1000/1-1001.
 * Tabel penjualan hanya dipakai untuk jumlah nota, unit ban, bauran metode bayar dan rincian per nota/kasir.
 */
final class DailyReportService
{
    public const MAX_DAYS = 92;

    /** Retur penjualan (sub-proyek 3): akun kontra-pendapatan yang juga dilaporkan terpisah. */
    public const SALES_RETURN = '4-9100';

    /** Kelompok metode bayar di laporan; TRANSFER dan TRANSFER_BCA sama-sama masuk bank. */
    public const PAYMENT_GROUPS = ['TUNAI' => 'TUNAI', 'TRANSFER' => 'TRANSFER', 'TRANSFER_BCA' => 'TRANSFER', 'QRIS' => 'QRIS'];

    /**
     * Satu baris per hari (termasuk hari tanpa transaksi), urut dari tanggal terlama, beserta totalnya.
     */
    public function recap(string $from, string $to): array
    {
        if ((int) Carbon::parse($from)->diffInDays(Carbon::parse($to)) + 1 > self::MAX_DAYS) {
            throw new PosRuleException('Rentang rekap harian maksimal '.self::MAX_DAYS.' hari.');
        }

        $rows = [];
        for ($day = Carbon::parse($from); $day->toDateString() <= $to; $day->addDay()) {
            $rows[$day->toDateString()] = self::emptyRow($day->toDateString());
        }

        $this->addLedger($rows, $from, $to);
        $this->addSales($rows, $from, $to);

        $rows = array_values(array_map(fn (array $row) => self::finish($row), $rows));

        return ['from' => $from, 'to' => $to, 'rows' => $rows, 'totals' => self::total($rows)];
    }

    /** Pendapatan, kontra, HPP, beban dan kas masuk/keluar per hari dari jurnal (tanpa jurnal tutup buku). */
    private function addLedger(array &$rows, string $from, string $to): void
    {
        $accounts = Account::all()->keyBy('id');
        $lines = DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->where('e.status', 'POSTED')
            ->whereBetween('e.entry_date', [$from, $to])
            ->whereNotIn('e.reference_type', LedgerBalances::CLOSING_TYPES)
            ->groupBy('e.entry_date', 'i.account_id', 'e.reference_type')
            ->selectRaw('e.entry_date as entry_date, i.account_id, e.reference_type, SUM(i.debit) as debit, SUM(i.credit) as credit')
            ->get();

        foreach ($lines as $line) {
            $date = substr((string) $line->entry_date, 0, 10);
            $account = $accounts[$line->account_id];
            $code = $account->account_code;
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $row = $rows[$date];

            if (in_array($code, CashFlowReport::CASH_ACCOUNTS, true)) {
                // Saldo awal akun bukan arus kas; laporan kas harian menambahkannya ke saldo awal hari itu.
                if ($line->reference_type !== OpeningBalanceService::REFERENCE_TYPE) {
                    $row['cash_in'] += $debit;
                    $row['cash_out'] += $credit;
                }
            } else {
                $net = $account->normal_balance === 'DEBIT' ? $debit - $credit : $credit - $debit;
                switch (FinancialReportService::incomeSection($account)) {
                    case 'revenue':
                        $row['revenue'] += $net;
                        if ($code === PosAccounts::REVENUE_GOODS) {
                            $row['goods_revenue'] += $net;
                        }
                        if ($code === PosAccounts::REVENUE_SERVICE) {
                            $row['service_revenue'] += $net;
                        }
                        break;
                    case 'contra_revenue':
                        $row['contra_revenue'] += $net;
                        if ($code === self::SALES_RETURN) {
                            $row['returns'] += $net;
                        }
                        break;
                    case 'cost_of_sales':
                        $row['cost_of_sales'] += $net;
                        break;
                    case 'operating_expenses':
                        $row['operating_expenses'] += $net;
                        break;
                }
            }

            $rows[$date] = $row;
        }
    }

    /** Jumlah nota, unit ban dan bauran metode bayar dari nota yang tidak di-VOID, per tanggal nota. */
    private function addSales(array &$rows, string $from, string $to): void
    {
        $live = fn () => DB::table('sales as s')->where('s.status', '!=', 'VOID')->whereBetween('s.date', [$from, $to]);

        foreach ($live()->groupBy('s.date')->selectRaw('s.date as date, COUNT(*) as n')->get() as $r) {
            $rows[$r->date]['sales_count'] = (int) $r->n;
        }

        $units = $live()
            ->join('sale_details as d', 'd.sale_id', '=', 's.id')
            ->where('d.item_type', 'PRODUCT')
            ->groupBy('s.date')
            ->selectRaw('s.date as date, SUM(d.quantity) as q')
            ->get();
        foreach ($units as $r) {
            $rows[$r->date]['product_qty'] = (int) $r->q;
        }

        $payments = $live()
            ->join('sale_payments as p', 'p.sale_id', '=', 's.id')
            ->groupBy('s.date', 'p.method')
            ->selectRaw('s.date as date, p.method as method, SUM(p.amount) as amount')
            ->get();
        foreach ($payments as $r) {
            $group = self::PAYMENT_GROUPS[$r->method] ?? null;
            if ($group !== null) {
                $rows[$r->date]['payment_mix'][$group] += (float) $r->amount;
            }
        }
    }

    private static function emptyRow(string $date): array
    {
        return [
            'date' => $date,
            'sales_count' => 0,
            'product_qty' => 0,
            'revenue' => 0.0,
            'goods_revenue' => 0.0,
            'service_revenue' => 0.0,
            'contra_revenue' => 0.0,
            'returns' => 0.0,
            'net_revenue' => 0.0,
            'cost_of_sales' => 0.0,
            'gross_profit' => 0.0,
            'operating_expenses' => 0.0,
            'net_income' => 0.0,
            'payment_mix' => ['TUNAI' => 0.0, 'TRANSFER' => 0.0, 'QRIS' => 0.0],
            'cash_in' => 0.0,
            'cash_out' => 0.0,
            'net_cash' => 0.0,
        ];
    }

    /** Kolom turunan (sama dengan Laba Rugi) lalu bulatkan ke sen. */
    private static function finish(array $row): array
    {
        $row['net_revenue'] = $row['revenue'] - $row['contra_revenue'];
        $row['gross_profit'] = $row['net_revenue'] - $row['cost_of_sales'];
        $row['net_income'] = $row['gross_profit'] - $row['operating_expenses'];
        $row['net_cash'] = $row['cash_in'] - $row['cash_out'];

        return self::rounded($row);
    }

    private static function total(array $rows): array
    {
        $total = self::emptyRow('');
        unset($total['date']);
        foreach ($rows as $row) {
            foreach (array_keys($total) as $key) {
                if ($key === 'payment_mix') {
                    foreach (array_keys($total['payment_mix']) as $group) {
                        $total['payment_mix'][$group] += $row['payment_mix'][$group];
                    }
                } else {
                    $total[$key] += $row[$key];
                }
            }
        }

        return self::rounded($total);
    }

    private static function rounded(array $values): array
    {
        return array_map(
            fn ($value) => is_array($value) ? self::rounded($value) : (is_float($value) ? round($value, 2) : $value),
            $values
        );
    }
}
```

- [ ] **Step 5: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/DailyReportController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Services\Reports\DailyReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Laporan operasional harian (baca saja): rekap harian & dashboard, laporan kas harian per kasir.
 */
class DailyReportController extends Controller
{
    public function recap(Request $request, DailyReportService $reports): JsonResponse
    {
        $data = $request->validate([
            'from' => 'required|date_format:Y-m-d',
            'to' => 'required|date_format:Y-m-d|after_or_equal:from',
        ]);

        return response()->json(['success' => true, 'data' => $reports->recap($data['from'], $data['to'])]);
    }
}
```

- [ ] **Step 6: Add the route**

In `backend/routes/api.php`, after the import line

```php
use App\Http\Controllers\Api\v1\AuthController;
```

add

```php
use App\Http\Controllers\Api\v1\DailyReportController;
```

and replace

```php
        // Expense Management (BKK) & Void Reversal
```

with

```php
        // Laporan operasional harian (sub-proyek 5): baca saja, dihitung dari jurnal server
        Route::get('reports/daily-recap', [DailyReportController::class, 'recap'])->middleware('permission:dashboard,financial_reports');

        // Expense Management (BKK) & Void Reversal
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter=DailyReportTest`
Expected: PASS (4 tests).

- [ ] **Step 8: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests pass (previous count + 4).

- [ ] **Step 9: Commit**

```bash
git status --short
git add backend/app/Services/Reports/DailyReportService.php \
        backend/app/Http/Controllers/Api/v1/DailyReportController.php \
        backend/app/Services/Accounting/FinancialReportService.php \
        backend/routes/api.php \
        backend/tests/Feature/DailyReportTest.php
git commit -m "$(cat <<'EOF'
feat(reports): add the daily recap endpoint

Money figures are grouped per day from posted journals with the income
statement's own classification, so a month of rows equals that month's
profit and loss and the cash columns equal the ledger's cash change.
Nota counts and payment mix skip voided notas.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B3: Daily cash report with per-cashier recap and shift summaries (`GET /reports/daily-cash`)

**Files:**
- Modify: `backend/app/Services/Reports/DailyReportService.php`, `backend/app/Http/Controllers/Api/v1/DailyReportController.php`, `backend/routes/api.php`, `backend/tests/Feature/DailyReportTest.php`

**Interfaces:**
- Consumes: `DailyReportService::recap()` (B2), `CashFlowReport::cashBalances(string $asOf): array{'1-1000': float, '1-1001': float}`, SP2 table `cash_sessions` (allocation-file columns only), `User::hasPermission()`.
- Produces: `DailyReportService::dailyCash(string $date, ?User $only = null): array` with keys `date, scope ('all'|'cashier'), cashier, summary (recap row|null), cash_accounts ([{code, name, opening, cash_in, cash_out, closing}]|null), cash_movements ([{reference_type, cash_in, cash_out}]|null), sales ([{id, reference, time, cashier_name, customer_name, vehicle_plate, total_amount, total_hpp, status, payments[{method, amount, fee_amount, net_received}]}]), cashiers ([{cashier_name, sales_count, sales_total, void_count, void_total, by_method{TUNAI,TRANSFER,QRIS}}]), expenses ([{reference, category, description, amount, payment_method}]|null), cash_sessions ([{id, user_name, opened_at, closed_at, opening_float, expected_cash, counted_cash, variance, variance_reason, status}])`. Route `GET /api/v1/reports/daily-cash?date` (`permission:daily_reports`).

- [ ] **Step 1: Write the failing tests**

In `backend/tests/Feature/DailyReportTest.php` replace the import block

```php
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
```

with

```php
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
```

Then add these methods at the end of the class (before its final `}`):

```php
    /**
     * Baris sesi kasir SP2 dengan kolom yang tercantum di roadmap-allocation.md saja. Bila migrasi cash_sessions
     * SP2 (backend/database/migrations/2026_10_02_*) punya kolom NOT NULL tanpa default lain, tambahkan di sini.
     */
    private function insertCashSession(User $user, string $openedAt): int
    {
        return DB::table('cash_sessions')->insertGetId([
            'user_id' => $user->id,
            'opened_at' => $openedAt,
            'closed_at' => null,
            'opening_float' => 200000,
            'expected_cash' => 300000,
            'counted_cash' => 295000,
            'variance' => -5000,
            'variance_reason' => 'Uang kembalian kurang',
            'status' => 'PENDING_APPROVAL',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_daily_cash_accounts_reconcile_and_movements_are_grouped_by_type(): void
    {
        $date = '2020-04-07';
        $this->postJournal($date, [['1-1000', 500000, 0], ['3-1000', 0, 500000]], 'ACCOUNT_OPENING');
        $this->postJournal($date, [['1-1000', 100000, 0], ['4-1000', 0, 100000]], 'POS_SALE');
        $this->postJournal($date, [['6-1003', 30000, 0], ['1-1000', 0, 30000]], 'EXPENSE');
        $this->postJournal($date, [['1-1001', 40000, 0], ['1-1000', 0, 40000]], 'CASH_DEPOSIT');
        $before = CashFlowReport::cashBalances('2020-04-06');

        $report = app(DailyReportService::class)->dailyCash($date);

        $this->assertSame('all', $report['scope']);
        $accounts = collect($report['cash_accounts'])->keyBy('code');
        // Saldo awal akun bertanggal hari itu masuk ke saldo awal, bukan ke kas masuk.
        $this->assertEqualsWithDelta($before['1-1000'] + 500000, $accounts['1-1000']['opening'], 0.001);
        $this->assertEquals(100000, $accounts['1-1000']['cash_in']);
        $this->assertEquals(70000, $accounts['1-1000']['cash_out']);
        $this->assertEquals(40000, $accounts['1-1001']['cash_in']);
        foreach ($report['cash_accounts'] as $account) {
            $this->assertEqualsWithDelta($account['opening'] + $account['cash_in'] - $account['cash_out'], $account['closing'], 0.001);
        }

        $moves = collect($report['cash_movements'])->keyBy('reference_type');
        $this->assertFalse($moves->has('ACCOUNT_OPENING'));
        $this->assertEquals(100000, $moves['POS_SALE']['cash_in']);
        $this->assertEquals(30000, $moves['EXPENSE']['cash_out']);
        $this->assertEquals(40000, $moves['CASH_DEPOSIT']['cash_in']);
        $this->assertEquals(40000, $moves['CASH_DEPOSIT']['cash_out']);
        $this->assertEquals(100000, $report['summary']['revenue']);
    }

    public function test_daily_cash_lists_notas_cashiers_expenses_and_shifts(): void
    {
        $date = '2020-05-02';
        $a = 'Kasir A '.uniqid();
        $b = 'Kasir B '.uniqid();
        $this->makeSale($date, $a, [['TUNAI', 100000]]);
        $this->makeSale($date, $a, [['TUNAI', 50000]], 'VOID');
        $this->makeSale($date, $b, [['QRIS', 70000]]);
        $category = ExpenseCategory::firstOrFail();
        foreach ([['ACTIVE', 25000], ['VOID', 10000]] as [$status, $amount]) {
            Expense::create([
                'reference' => 'DR-BKK-'.uniqid(), 'expense_date' => $date, 'category_id' => $category->id,
                'amount' => $amount, 'payment_method' => 'TUNAI', 'recipient_name' => 'PLN',
                'description' => 'uji '.$status, 'approved_by' => 'Owner', 'status' => $status,
            ]);
        }
        $owner = $this->actingAsRole('OWNER');
        $sessionId = $this->insertCashSession($owner, $date.' 08:00:00');
        $otherDay = $this->insertCashSession($owner, '2020-05-03 08:00:00');

        $data = $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertOk()->json('data');

        $this->assertSame('all', $data['scope']);
        $cashierA = collect($data['cashiers'])->firstWhere('cashier_name', $a);
        $this->assertSame(1, $cashierA['sales_count']);
        $this->assertEquals(100000, $cashierA['sales_total']);
        $this->assertSame(1, $cashierA['void_count']);
        $this->assertEquals(50000, $cashierA['void_total']);
        $this->assertEquals(100000, $cashierA['by_method']['TUNAI']);
        $this->assertEquals(70000, collect($data['cashiers'])->firstWhere('cashier_name', $b)['by_method']['QRIS']);

        $mine = collect($data['sales'])->whereIn('cashier_name', [$a, $b]);
        $this->assertCount(3, $mine);
        $this->assertContains('VOID', $mine->pluck('status')->all());

        $expenses = collect($data['expenses'])->filter(fn ($e) => str_starts_with($e['description'], 'uji '));
        $this->assertSame(['uji ACTIVE'], $expenses->pluck('description')->values()->all());

        $session = collect($data['cash_sessions'])->firstWhere('id', $sessionId);
        $this->assertSame($owner->name, $session['user_name']);
        $this->assertEquals(-5000, $session['variance']);
        $this->assertSame('Uang kembalian kurang', $session['variance_reason']);
        $this->assertSame('PENDING_APPROVAL', $session['status']);
        $this->assertNull(collect($data['cash_sessions'])->firstWhere('id', $otherDay));
    }

    public function test_kasir_sees_only_own_notas_and_shifts_and_gudang_is_denied(): void
    {
        $date = '2020-05-09';
        $owner = $this->actingAsRole('OWNER');
        $kasir = $this->actingAsRole('KASIR');
        $this->makeSale($date, $kasir->name, [['TUNAI', 100000]]);
        $this->makeSale($date, 'Kasir Lain '.uniqid(), [['TUNAI', 999000]]);
        $mine = $this->insertCashSession($kasir, $date.' 08:00:00');
        $this->insertCashSession($owner, $date.' 09:00:00');

        $data = $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertOk()->json('data');

        $this->assertSame('cashier', $data['scope']);
        $this->assertSame($kasir->name, $data['cashier']);
        $this->assertNull($data['summary']);
        $this->assertNull($data['cash_accounts']);
        $this->assertNull($data['cash_movements']);
        $this->assertNull($data['expenses']);
        $this->assertSame([$kasir->name], collect($data['sales'])->pluck('cashier_name')->unique()->values()->all());
        $this->assertSame([$kasir->name], collect($data['cashiers'])->pluck('cashier_name')->all());
        $this->assertSame([$mine], collect($data['cash_sessions'])->pluck('id')->all());

        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/reports/daily-cash?date='.$date)->assertForbidden();
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=DailyReportTest`
Expected: the 4 B2 tests pass; the 3 new ones FAIL — `Call to undefined method ...DailyReportService::dailyCash()` and 404 on `/reports/daily-cash`.
If `insertCashSession` fails with "Field '…' doesn't have a default value", add that column to the fixture (see its docblock) and re-run.

- [ ] **Step 3: Extend the service**

In `backend/app/Services/Reports/DailyReportService.php` replace the import block

```php
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Services\Accounting\CashFlowReport;
```

with

```php
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\Expense;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Models\User;
use App\Services\Accounting\CashFlowReport;
```

and

```php
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
```

with

```php
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
```

Then insert, directly before the line `    /** Pendapatan, kontra, HPP, beban dan kas masuk/keluar per hari dari jurnal (tanpa jurnal tutup buku). */`, these methods:

```php
    /**
     * Laporan kas harian. $only = null untuk seluruh toko; bila diisi, hanya nota, sesi dan rekap milik kasir itu
     * (bagian buku besar dan biaya bernilai null).
     */
    public function dailyCash(string $date, ?User $only = null): array
    {
        $full = $only === null;
        $sales = Sale::with('payments')
            ->where('date', $date)
            ->when(! $full, fn ($q) => $q->where('cashier_name', $only->name))
            ->orderBy('created_at')
            ->orderBy('id')
            ->get();

        return [
            'date' => $date,
            'scope' => $full ? 'all' : 'cashier',
            'cashier' => $only?->name,
            'summary' => $full ? $this->recap($date, $date)['rows'][0] : null,
            'cash_accounts' => $full ? self::cashAccounts($date) : null,
            'cash_movements' => $full ? self::cashMovements($date) : null,
            'sales' => $sales->map(fn (Sale $sale) => self::saleRow($sale))->values()->all(),
            'cashiers' => self::cashiers($sales),
            'expenses' => $full ? self::expenses($date) : null,
            'cash_sessions' => self::cashSessions($date, $only),
        ];
    }

    /** Debit/kredit akun kas & bank pada satu tanggal, per akun dan jenis jurnal. */
    private static function cashLines(string $date): Collection
    {
        return DB::table('journal_items as i')
            ->join('journal_entries as e', 'e.id', '=', 'i.journal_entry_id')
            ->join('accounts as a', 'a.id', '=', 'i.account_id')
            ->where('e.status', 'POSTED')
            ->where('e.entry_date', $date)
            ->whereIn('a.account_code', CashFlowReport::CASH_ACCOUNTS)
            ->groupBy('a.account_code', 'e.reference_type')
            ->selectRaw('a.account_code as code, e.reference_type as reference_type, SUM(i.debit) as debit, SUM(i.credit) as credit')
            ->get();
    }

    /** Saldo awal + masuk − keluar = saldo akhir per akun kas; saldo awal akun bertanggal hari itu masuk ke saldo awal. */
    private static function cashAccounts(string $date): array
    {
        $before = CashFlowReport::cashBalances(Carbon::parse($date)->subDay()->toDateString());
        $after = CashFlowReport::cashBalances($date);
        $names = Account::whereIn('account_code', CashFlowReport::CASH_ACCOUNTS)->pluck('account_name', 'account_code');
        $lines = self::cashLines($date);

        return array_map(function (string $code) use ($before, $after, $names, $lines) {
            $mine = $lines->where('code', $code);
            $opening = $mine->where('reference_type', OpeningBalanceService::REFERENCE_TYPE);
            $moves = $mine->where('reference_type', '!=', OpeningBalanceService::REFERENCE_TYPE);

            return [
                'code' => $code,
                'name' => $names[$code] ?? $code,
                'opening' => round($before[$code] + $opening->sum(fn ($l) => (float) $l->debit - (float) $l->credit), 2),
                'cash_in' => round($moves->sum(fn ($l) => (float) $l->debit), 2),
                'cash_out' => round($moves->sum(fn ($l) => (float) $l->credit), 2),
                'closing' => $after[$code],
            ];
        }, CashFlowReport::CASH_ACCOUNTS);
    }

    /** Mutasi kas laci + bank per jenis jurnal (tanpa saldo awal akun). */
    private static function cashMovements(string $date): array
    {
        return self::cashLines($date)
            ->where('reference_type', '!=', OpeningBalanceService::REFERENCE_TYPE)
            ->groupBy('reference_type')
            ->map(fn (Collection $group, string $type) => [
                'reference_type' => $type,
                'cash_in' => round($group->sum(fn ($l) => (float) $l->debit), 2),
                'cash_out' => round($group->sum(fn ($l) => (float) $l->credit), 2),
            ])
            ->sortKeys()
            ->values()
            ->all();
    }

    private static function saleRow(Sale $sale): array
    {
        return [
            'id' => $sale->id,
            'reference' => $sale->reference,
            'time' => $sale->created_at?->format('H:i'),
            'cashier_name' => $sale->cashier_name,
            'customer_name' => $sale->customer_name,
            'vehicle_plate' => $sale->vehicle_plate,
            'total_amount' => (float) $sale->total_amount,
            'total_hpp' => (float) $sale->total_hpp,
            'status' => $sale->status,
            'payments' => $sale->payments->map(fn (SalePayment $p) => [
                'method' => $p->method,
                'amount' => (float) $p->amount,
                'fee_amount' => (float) $p->fee_amount,
                'net_received' => (float) $p->net_received,
            ])->values()->all(),
        ];
    }

    /** Rekap per kasir dari nota hari itu; penerimaan per metode hanya dari nota yang tidak di-VOID. */
    private static function cashiers(Collection $sales): array
    {
        return $sales->groupBy('cashier_name')->map(function (Collection $group, string $name) {
            $live = $group->where('status', '!=', 'VOID');
            $void = $group->where('status', 'VOID');
            $byMethod = ['TUNAI' => 0.0, 'TRANSFER' => 0.0, 'QRIS' => 0.0];
            foreach ($live as $sale) {
                foreach ($sale->payments as $payment) {
                    $bucket = self::PAYMENT_GROUPS[$payment->method] ?? null;
                    if ($bucket !== null) {
                        $byMethod[$bucket] += (float) $payment->amount;
                    }
                }
            }

            return [
                'cashier_name' => $name,
                'sales_count' => $live->count(),
                'sales_total' => round((float) $live->sum('total_amount'), 2),
                'void_count' => $void->count(),
                'void_total' => round((float) $void->sum('total_amount'), 2),
                'by_method' => self::rounded($byMethod),
            ];
        })->sortKeys()->values()->all();
    }

    /** Biaya bertanggal hari itu yang tidak di-VOID (pembatalan tampil sebagai mutasi VOID_EXPENSE di tanggalnya). */
    private static function expenses(string $date): array
    {
        return Expense::with('category')
            ->where('expense_date', $date)
            ->where('status', '!=', 'VOID')
            ->orderBy('id')
            ->get()
            ->map(fn (Expense $e) => [
                'reference' => $e->reference,
                'category' => $e->category?->category_name,
                'description' => $e->description,
                'amount' => (float) $e->amount,
                'payment_method' => $e->payment_method,
            ])
            ->values()
            ->all();
    }

    /** Sesi kasir (sub-proyek 2) yang dibuka hari itu, apa adanya; rumus kas seharusnya milik SP2. */
    private static function cashSessions(string $date, ?User $only): array
    {
        $money = fn ($value) => $value === null ? null : round((float) $value, 2);

        return DB::table('cash_sessions as c')
            ->leftJoin('users as u', 'u.id', '=', 'c.user_id')
            ->whereDate('c.opened_at', $date)
            ->when($only !== null, fn ($q) => $q->where('c.user_id', $only->id))
            ->orderBy('c.opened_at')
            ->get(['c.id', 'u.name as user_name', 'c.opened_at', 'c.closed_at', 'c.opening_float', 'c.expected_cash', 'c.counted_cash', 'c.variance', 'c.variance_reason', 'c.status'])
            ->map(fn ($c) => [
                'id' => (int) $c->id,
                'user_name' => $c->user_name,
                'opened_at' => $c->opened_at,
                'closed_at' => $c->closed_at,
                'opening_float' => (float) $c->opening_float,
                'expected_cash' => $money($c->expected_cash),
                'counted_cash' => $money($c->counted_cash),
                'variance' => $money($c->variance),
                'variance_reason' => $c->variance_reason,
                'status' => $c->status,
            ])
            ->all();
    }

```

- [ ] **Step 4: Add the controller action**

In `backend/app/Http/Controllers/Api/v1/DailyReportController.php` replace

```php
        return response()->json(['success' => true, 'data' => $reports->recap($data['from'], $data['to'])]);
    }
}
```

with

```php
        return response()->json(['success' => true, 'data' => $reports->recap($data['from'], $data['to'])]);
    }

    public function cash(Request $request, DailyReportService $reports): JsonResponse
    {
        $data = $request->validate(['date' => 'nullable|date_format:Y-m-d']);
        $user = $request->user();

        // Tanpa izin laporan keuangan (mis. kasir) hanya nota, sesi dan rekap milik sendiri yang terlihat.
        $only = $user->hasPermission('financial_reports') ? null : $user;

        return response()->json([
            'success' => true,
            'data' => $reports->dailyCash($data['date'] ?? now()->toDateString(), $only),
        ]);
    }
}
```

- [ ] **Step 5: Add the route**

In `backend/routes/api.php` replace

```php
        Route::get('reports/daily-recap', [DailyReportController::class, 'recap'])->middleware('permission:dashboard,financial_reports');
```

with

```php
        Route::get('reports/daily-recap', [DailyReportController::class, 'recap'])->middleware('permission:dashboard,financial_reports');
        Route::get('reports/daily-cash', [DailyReportController::class, 'cash'])->middleware('permission:daily_reports');
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter=DailyReportTest`
Expected: PASS (7 tests).

- [ ] **Step 7: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests pass (previous count + 3).

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/app/Services/Reports/DailyReportService.php \
        backend/app/Http/Controllers/Api/v1/DailyReportController.php \
        backend/routes/api.php \
        backend/tests/Feature/DailyReportTest.php
git commit -m "$(cat <<'EOF'
feat(reports): add the daily cash report with cashier recap

Cash in and out per account and journal type reconcile opening to
closing ledger balances; the report also lists the day's notas, a
per-cashier recap, non-void expenses and the cashier shifts. Users
without financial_reports only see their own notas and shifts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

# Part F — Frontend

### Task F1: Report types, API client, helpers and the `daily_reports` permission

**Files:**
- Create: `src/services/api/reportsApi.ts`, `src/services/dailyReports.ts`, `src/services/__tests__/dailyReports.test.ts`
- Modify: `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/services/api/index.ts`, `src/services/authNavigationService.ts`, `src/services/__tests__/authNavigationService.test.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`

**Interfaces:**
- Consumes: endpoints from B2/B3; `localDate(d?: Date): string` from `src/services/accountingPeriod.ts`.
- Produces:
  - Types `PaymentGroup`, `DailyRecapRow`, `DailyRecapTotals`, `DailyRecap`, `DailyCashAccount`, `DailyCashMovement`, `DailyCashSale`, `DailyCashierRecap`, `DailyCashExpense`, `DailyCashSession`, `DailyCashReport`, `DashboardSummary` (shared types); `PermissionKey` + `'daily_reports'`; `ActiveScreen` + `'daily_reports'`.
  - `reportsApi.dailyRecap(from: string, to: string): Promise<DailyRecap>`, `reportsApi.dailyCash(date: string): Promise<DailyCashReport>` (exported from `src/services/api`).
  - `PAYMENT_GROUPS: PaymentGroup[]`, `PAYMENT_GROUP_LABELS: Record<PaymentGroup, string>`, `emptyRecapRow(date): DailyRecapRow`, `sumRecapRows(rows): DailyRecapTotals`, `dashboardRange(today?): {from, to}`, `summarizeDashboard(recap | null, today): DashboardSummary`, `cashMovementLabel(referenceType): string` from `src/services/dailyReports.ts`.
  - `isScreenPermittedForRole('daily_reports', …)` follows `daily_reports`.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/dailyReports.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DailyRecap } from '../../shared/types';
import { cashMovementLabel, dashboardRange, emptyRecapRow, summarizeDashboard, sumRecapRows } from '../dailyReports';

describe('dashboardRange', () => {
  it('starts at the month start when that is earlier than six days ago', () => {
    expect(dashboardRange('2026-09-30')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
  });

  it('reaches into the previous month early in a month (7-day trend)', () => {
    expect(dashboardRange('2026-10-03')).toEqual({ from: '2026-09-27', to: '2026-10-03' });
  });
});

describe('summarizeDashboard', () => {
  const row = (date: string, net_revenue: number, tunai: number) => ({
    ...emptyRecapRow(date),
    sales_count: 1,
    net_revenue,
    payment_mix: { TUNAI: tunai, TRANSFER: 0, QRIS: 0 },
  });
  const recap: DailyRecap = {
    from: '2026-09-27',
    to: '2026-10-03',
    rows: [row('2026-09-28', 500, 500), row('2026-10-01', 100, 100), row('2026-10-03', 200, 50)],
    totals: sumRecapRows([]),
  };

  it('picks today, fills the 7-day window and sums only the current month', () => {
    const s = summarizeDashboard(recap, '2026-10-03');
    expect(s.today.net_revenue).toBe(200);
    expect(s.week.map((r) => r.date)).toEqual([
      '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03',
    ]);
    expect(s.week[1].net_revenue).toBe(500);
    expect(s.week[2].net_revenue).toBe(0);
    expect(s.month.net_revenue).toBe(300);
    expect(s.month.sales_count).toBe(2);
    expect(s.month.payment_mix.TUNAI).toBe(150);
  });

  it('gives zero rows while the recap is not loaded', () => {
    const s = summarizeDashboard(null, '2026-10-03');
    expect(s.today).toEqual(emptyRecapRow('2026-10-03'));
    expect(s.month.net_income).toBe(0);
  });
});

describe('cashMovementLabel', () => {
  it('labels known journal types and falls back to the raw type', () => {
    expect(cashMovementLabel('SALES_RETURN')).toBe('Retur penjualan (refund)');
    expect(cashMovementLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });
});
```

In `src/services/__tests__/authNavigationService.test.ts` replace

```ts
  it('default role permissions list exactly the 13 server keys (no booking DP or BON)', () => {
    for (const role of ['KASIR', 'GUDANG'] as const) {
      const keys = Object.keys(DEFAULT_ROLE_PERMISSIONS[role]);
      expect(keys).toHaveLength(13);
```

with (add 1 to whatever count SP2–SP4 left; at HEAD 13 → 14)

```ts
  it('default role permissions list exactly the 14 server keys (no booking DP or BON)', () => {
    for (const role of ['KASIR', 'GUDANG'] as const) {
      const keys = Object.keys(DEFAULT_ROLE_PERMISSIONS[role]);
      expect(keys).toHaveLength(14);
```

and directly after that `it(...)` block (after its closing `});`) add:

```ts
  it('daily reports screen: kasir sees own recap by default, gudang does not', () => {
    expect(isScreenPermittedForRole('daily_reports', 'KASIR', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
    expect(isScreenPermittedForRole('daily_reports', 'GUDANG', DEFAULT_ROLE_PERMISSIONS)).toBe(false);
    expect(isScreenPermittedForRole('daily_reports', 'OWNER', DEFAULT_ROLE_PERMISSIONS)).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/__tests__/dailyReports.test.ts src/services/__tests__/authNavigationService.test.ts`
Expected: FAIL — `Failed to resolve import "../dailyReports"`; the key count is 13; `daily_reports` screen is not permitted for KASIR.

- [ ] **Step 3: Add the types**

In `src/shared/types/index.ts` replace

```ts
  | 'financials'
  | 'settings';
```

with

```ts
  | 'financials'
  | 'settings'
  | 'daily_reports';
```

and in `PermissionKey` add `| 'daily_reports'` as the last member (keep SP2–SP4 members). At HEAD:

```ts
  | 'financial_reports'
  | 'role_settings';
```

becomes

```ts
  | 'financial_reports'
  | 'role_settings'
  | 'daily_reports';
```

Then append at the end of the file:

```ts

// ==============================================================================
// Laporan operasional harian (sub-proyek 5): rekap harian, kas harian, dashboard
// ==============================================================================
export type PaymentGroup = 'TUNAI' | 'TRANSFER' | 'QRIS';

/** Satu hari rekap. Uang dari jurnal server (sama dengan Laba Rugi); jumlah nota & bauran bayar dari nota non-VOID. */
export interface DailyRecapRow {
  date: string;
  sales_count: number;
  product_qty: number;
  revenue: number;
  goods_revenue: number;
  service_revenue: number;
  contra_revenue: number;
  returns: number;
  net_revenue: number;
  cost_of_sales: number;
  gross_profit: number;
  operating_expenses: number;
  net_income: number;
  payment_mix: Record<PaymentGroup, number>;
  cash_in: number;
  cash_out: number;
  net_cash: number;
}

export type DailyRecapTotals = Omit<DailyRecapRow, 'date'>;

export interface DailyRecap {
  from: string;
  to: string;
  rows: DailyRecapRow[];
  totals: DailyRecapTotals;
}

export interface DailyCashAccount {
  code: string;
  name: string;
  opening: number;
  cash_in: number;
  cash_out: number;
  closing: number;
}

export interface DailyCashMovement {
  reference_type: string;
  cash_in: number;
  cash_out: number;
}

export interface DailyCashSale {
  id: number;
  reference: string;
  time: string | null;
  cashier_name: string;
  customer_name: string | null;
  vehicle_plate: string | null;
  total_amount: number;
  total_hpp: number;
  status: string;
  payments: { method: string; amount: number; fee_amount: number; net_received: number }[];
}

export interface DailyCashierRecap {
  cashier_name: string;
  sales_count: number;
  sales_total: number;
  void_count: number;
  void_total: number;
  by_method: Record<PaymentGroup, number>;
}

export interface DailyCashExpense {
  reference: string;
  category: string | null;
  description: string;
  amount: number;
  payment_method: string;
}

/** Sesi kasir (sub-proyek 2) apa adanya dari server. */
export interface DailyCashSession {
  id: number;
  user_name: string | null;
  opened_at: string | null;
  closed_at: string | null;
  opening_float: number;
  expected_cash: number | null;
  counted_cash: number | null;
  variance: number | null;
  variance_reason: string | null;
  status: string;
}

/** Laporan kas harian; bagian buku besar bernilai null untuk lingkup kasir sendiri. */
export interface DailyCashReport {
  date: string;
  scope: 'all' | 'cashier';
  cashier: string | null;
  summary: DailyRecapRow | null;
  cash_accounts: DailyCashAccount[] | null;
  cash_movements: DailyCashMovement[] | null;
  sales: DailyCashSale[];
  cashiers: DailyCashierRecap[];
  expenses: DailyCashExpense[] | null;
  cash_sessions: DailyCashSession[];
}

/** Angka dashboard dari rekap server: hari ini, 7 hari terakhir, dan jumlah bulan berjalan. */
export interface DashboardSummary {
  today: DailyRecapRow;
  week: DailyRecapRow[];
  month: DailyRecapTotals;
}
```

- [ ] **Step 4: Default permissions**

In `src/shared/data/mockData.ts` add `daily_reports` as the last key of each role in `DEFAULT_ROLE_PERMISSIONS` (keep SP2–SP4 keys). At HEAD replace

```ts
    role_settings: false,
  },
  GUDANG: {
```

with

```ts
    role_settings: false,
    daily_reports: true,
  },
  GUDANG: {
```

and

```ts
    role_settings: false,
  },
};
```

with

```ts
    role_settings: false,
    daily_reports: false,
  },
};
```

- [ ] **Step 5: API client**

Create `src/services/api/reportsApi.ts`:

```ts
import { apiClient } from './apiClient';
import type { DailyCashReport, DailyRecap } from '../../shared/types';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

/** Laporan operasional harian; server sudah mengirim angka sebagai number, jadi tanpa mapper. */
export const reportsApi = {
  dailyRecap: async (from: string, to: string) =>
    (await apiClient.get<Envelope<DailyRecap>>('/reports/daily-recap', { from, to })).data,
  dailyCash: async (date: string) =>
    (await apiClient.get<Envelope<DailyCashReport>>('/reports/daily-cash', { date })).data,
};
```

In `src/services/api/index.ts` replace

```ts
export * from './accountingApi';
```

with

```ts
export * from './accountingApi';
export * from './reportsApi';
```

- [ ] **Step 6: Helpers**

Create `src/services/dailyReports.ts`:

```ts
import type { DailyRecap, DailyRecapRow, DailyRecapTotals, DashboardSummary, PaymentGroup } from '../shared/types';
import { localDate } from './accountingPeriod';

export const PAYMENT_GROUPS: PaymentGroup[] = ['TUNAI', 'TRANSFER', 'QRIS'];

export const PAYMENT_GROUP_LABELS: Record<PaymentGroup, string> = {
  TUNAI: 'Uang Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
};

const NUMERIC_KEYS = [
  'sales_count', 'product_qty', 'revenue', 'goods_revenue', 'service_revenue', 'contra_revenue', 'returns',
  'net_revenue', 'cost_of_sales', 'gross_profit', 'operating_expenses', 'net_income', 'cash_in', 'cash_out', 'net_cash',
] as const;

/** Geser tanggal YYYY-MM-DD sejumlah hari menurut kalender lokal. */
const shiftDays = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number);
  return localDate(new Date(y, m - 1, d + days));
};

export const emptyRecapRow = (date: string): DailyRecapRow => ({
  date,
  ...(Object.fromEntries(NUMERIC_KEYS.map((k) => [k, 0])) as Record<(typeof NUMERIC_KEYS)[number], number>),
  payment_mix: { TUNAI: 0, TRANSFER: 0, QRIS: 0 },
});

export const sumRecapRows = (rows: DailyRecapRow[]): DailyRecapTotals => {
  const { date: _date, ...total } = emptyRecapRow('');
  for (const row of rows) {
    for (const k of NUMERIC_KEYS) total[k] += row[k];
    for (const g of PAYMENT_GROUPS) total.payment_mix[g] += row.payment_mix[g];
  }
  return total;
};

/** Satu permintaan rekap untuk dashboard: 7 hari terakhir sekaligus bulan berjalan (tanggal lokal WIB). */
export const dashboardRange = (today: string = localDate()): { from: string; to: string } => {
  const weekStart = shiftDays(today, -6);
  const monthStart = `${today.slice(0, 7)}-01`;
  return { from: weekStart < monthStart ? weekStart : monthStart, to: today };
};

/** Angka dashboard dari rekap server; hari tanpa transaksi (atau rekap belum dimuat) bernilai nol. */
export const summarizeDashboard = (recap: DailyRecap | null, today: string): DashboardSummary => {
  const rows = recap?.rows ?? [];
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const rowFor = (date: string) => byDate.get(date) ?? emptyRecapRow(date);
  return {
    today: rowFor(today),
    week: Array.from({ length: 7 }, (_, i) => rowFor(shiftDays(today, i - 6))),
    month: sumRecapRows(rows.filter((r) => r.date.startsWith(today.slice(0, 7)))),
  };
};

/** Label jenis jurnal pada mutasi kas harian (termasuk jenis baru sub-proyek 2–4). */
const CASH_MOVEMENT_LABELS: Record<string, string> = {
  POS_SALE: 'Penjualan POS',
  POS_SALE_VOID: 'Pembatalan nota (void)',
  SALES_RETURN: 'Retur penjualan (refund)',
  PURCHASE: 'Pembelian barang',
  PURCHASE_RETURN: 'Retur pembelian',
  GOODS_RECEIPT_CANCEL: 'Pembatalan penerimaan barang',
  DEBT_PAYMENT: 'Pembayaran hutang supplier',
  EXPENSE: 'Biaya operasional (BKK)',
  VOID_EXPENSE: 'Pembatalan biaya',
  CASH_SESSION_VARIANCE: 'Selisih kas kasir',
  CASH_DEPOSIT: 'Setor kas laci ke bank',
  OWNER_DRAWING: 'Prive pemilik',
  CAPITAL_INJECTION: 'Setoran modal pemilik',
  BANK_RECON_ADJUSTMENT: 'Penyesuaian rekonsiliasi bank',
  ADJUSTING_ENTRY: 'Jurnal penyesuaian',
  ADJUSTING_REVERSAL: 'Pembalik jurnal penyesuaian',
  MANUAL_ADJUSTMENT: 'Jurnal manual',
  MANUAL_REVERSAL: 'Pembalik jurnal manual',
  RECEIVABLE_PAYMENT: 'Pelunasan piutang (historis)',
  BOOKING_DP: 'DP booking (historis)',
  BOOKING_DP_REFUND: 'Refund DP booking (historis)',
};

export const cashMovementLabel = (referenceType: string): string => CASH_MOVEMENT_LABELS[referenceType] ?? referenceType;
```

- [ ] **Step 7: Screen gate and role setting**

In `src/services/authNavigationService.ts` replace

```ts
    case 'settings':
      return !!roleConfig.role_settings;
```

with

```ts
    case 'settings':
      return !!roleConfig.role_settings;
    case 'daily_reports':
      return !!roleConfig.daily_reports;
```

In `src/modules/settings/components/RolePermissionsTab.tsx`, in `PERMISSION_DEFINITIONS`, directly after the `sale_void` entry (the object ending with `icon: <Ban className="w-4 h-4 text-rose-600" />,\n  },`) insert:

```tsx
  {
    key: 'daily_reports',
    label: 'Laporan Harian Kas & Rekap Kasir',
    category: 'KASIR_POS',
    description: 'Laporan kas harian, rekap per kasir dan sesi kasir. Tanpa izin Laporan Keuangan, pengguna hanya melihat nota & sesi miliknya sendiri.',
    icon: <CalendarCheck className="w-4 h-4 text-blue-600" />,
  },
```

(`CalendarCheck` is already imported from `lucide-react` in that file.)

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npx vitest run src/services/__tests__/dailyReports.test.ts src/services/__tests__/authNavigationService.test.ts`
Expected: PASS.

- [ ] **Step 9: Run the frontend gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass (previous count + 6).

- [ ] **Step 10: Commit**

```bash
git status --short
git add src/shared/types/index.ts \
        src/shared/data/mockData.ts \
        src/services/api/reportsApi.ts \
        src/services/api/index.ts \
        src/services/dailyReports.ts \
        src/services/__tests__/dailyReports.test.ts \
        src/services/authNavigationService.ts \
        src/services/__tests__/authNavigationService.test.ts \
        src/modules/settings/components/RolePermissionsTab.tsx
git commit -m "$(cat <<'EOF'
feat(reports): add daily report types, client and permission

The frontend learns the daily recap and daily cash report shapes, the
daily_reports permission and screen gate, and pure helpers that turn a
recap into today, last-seven-days and month-to-date figures.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F2: Dashboard figures from the server recap

**Files:**
- Modify: `src/modules/dashboard/ExecutiveDashboardScreen.tsx`, `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`, `src/App.tsx`

**Interfaces:**
- Consumes: `reportsApi.dailyRecap`, `dashboardRange`, `summarizeDashboard`, `PAYMENT_GROUPS`, `PAYMENT_GROUP_LABELS`, `emptyRecapRow`, `sumRecapRows` (F1); `useServerData` (`src/modules/accounting/hooks/useServerData.ts`); `InventoryValuation` (`fifo_value`) from `src/services/api`; `App.tsx` state `inventoryValuation`, `ledgerVersion`.
- Produces: `ExecutiveDashboardScreen` props `{ transactions, products, inventoryValuation: InventoryValuation | null, ledgerVersion: number, onNavigateToInventory, onNavigateToPos }` (no `expenses`); registry `DashboardInput = { summary: DashboardSummary; products: ProductItem[]; fifoValue: number | null }`.

- [ ] **Step 1: Write the failing test**

In `src/shared/export/__tests__/registry.test.ts` replace

```ts
import type { CashFlowReport, FinancialStatements, StatementLine } from '../../types';
```

with

```ts
import type { CashFlowReport, DashboardSummary, FinancialStatements, StatementLine } from '../../types';
import { emptyRecapRow, sumRecapRows } from '../../../services/dailyReports';
```

and append at the end of the file:

```ts

describe('registry dashboard_summary', () => {
  const today = { ...emptyRecapRow('2026-10-03'), net_revenue: 200, gross_profit: 80 };
  const summary: DashboardSummary = { today, week: [today], month: { ...sumRecapRows([today]), operating_expenses: 30 } };
  const doc = buildExportDoc('dashboard_summary', { summary, products: [], fifoValue: null }, ctx);

  it('KPI dibaca dari ringkasan server', () => {
    const kpi = doc.sections[0].rows;
    expect(kpi.find((r) => r.m === 'Pendapatan Bersih Hari Ini')?.v).toBe(200);
    expect(kpi.find((r) => r.m === 'Beban Operasional Bulan Berjalan')?.v).toBe(30);
    expect(kpi.find((r) => r.m === 'Nilai Persediaan FIFO')?.v).toBeNull();
  });

  it('tren memakai tanggal rekap server', () => expect(doc.sections[1].rows[0].tgl).toBe('2026-10-03'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: FAIL — `Cannot read properties of undefined (reading 'filter')` in `mapDashboard` (it still expects `transactions`).

- [ ] **Step 3: Rebuild the dashboard export mapper**

In `src/shared/export/registry.ts` replace

```ts
import type { ExpenseRecord, PosTransaction, ProductItem, ServiceMasterItem, StockMutation, StockOpnameItem, SupplierItem } from '../types';
```

with

```ts
import type { ExpenseRecord, PosTransaction, ProductItem, ServiceMasterItem, StockMutation, StockOpnameItem, SupplierItem } from '../types';
import type { DashboardSummary } from '../types';
```

Then replace the whole block from `export interface DashboardInput {` through the end of `mapDashboard` (the line `};` right before `type LabelValue = { label: string; value: number };`) with:

```ts
export interface DashboardInput {
  summary: DashboardSummary;
  products: ProductItem[];
  /** Nilai persediaan FIFO dari server; null bila peran tidak boleh membacanya. */
  fifoValue: number | null;
}

const mapDashboard = (d: DashboardInput, ctx: ExportCtx): ExportDoc => {
  const { today, week, month } = d.summary;
  const tren = week.map((r) => ({ tgl: r.date, omzet: r.net_revenue, hpp: r.cost_of_sales, qty: r.product_qty }));
  const kritis = d.products
    .filter((p) => stockOf(p) <= (p.product_stock_alert ?? p.min_stock ?? 5))
    .slice(0, 20);
  return makeDoc('dashboard_summary', 'Ringkasan Dashboard', 'portrait', ctx, [
    {
      title: 'KPI Utama (jurnal server)',
      columns: [{ key: 'm', label: 'Metrik', type: 'text', width: 40 }, { key: 'v', label: 'Nilai (Rp)', type: 'currency' }],
      rows: [
        { m: 'Pendapatan Bersih Hari Ini', v: today.net_revenue },
        { m: 'Laba Kotor Hari Ini', v: today.gross_profit },
        { m: 'Pendapatan Bersih Bulan Berjalan', v: month.net_revenue },
        { m: 'HPP Bulan Berjalan', v: month.cost_of_sales },
        { m: 'Laba Kotor Bulan Berjalan', v: month.gross_profit },
        { m: 'Beban Operasional Bulan Berjalan', v: month.operating_expenses },
        { m: 'Laba Bersih Bulan Berjalan', v: month.net_income },
        { m: 'Nilai Persediaan FIFO', v: d.fifoValue },
      ],
    },
    {
      title: 'Tren 7 Hari',
      columns: [
        { key: 'tgl', label: 'Tanggal', type: 'date', width: 12 },
        { key: 'omzet', label: 'Pendapatan Bersih (Rp)', type: 'currency' },
        { key: 'hpp', label: 'HPP (Rp)', type: 'currency' },
        { key: 'qty', label: 'Unit Ban', type: 'number' },
      ],
      rows: tren,
      totals: { omzet: sum(tren, (t) => t.omzet), hpp: sum(tren, (t) => t.hpp), qty: sum(tren, (t) => t.qty) },
    },
    {
      title: 'Peringatan Stok Kritis',
      columns: [
        { key: 'nama', label: 'Produk', type: 'text', width: 36 },
        { key: 'stok', label: 'Stok', type: 'number' },
        { key: 'alert', label: 'Batas Alert', type: 'number' },
      ],
      rows: kritis.map((p) => ({ nama: p.product_name || p.name, stok: stockOf(p), alert: p.product_stock_alert ?? p.min_stock ?? 5 })),
    },
  ]);
};
```

- [ ] **Step 4: Dashboard screen — imports and props**

In `src/modules/dashboard/ExecutiveDashboardScreen.tsx` replace

```tsx
import { ExpenseRecord, PosTransaction, ProductItem } from '../../shared/types';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';

interface ExecutiveDashboardScreenProps {
  transactions: PosTransaction[];
  products: any[];
  expenses: ExpenseRecord[];
  onNavigateToInventory: () => void;
  onNavigateToPos: () => void;
}

export const ExecutiveDashboardScreen: React.FC<ExecutiveDashboardScreenProps> = ({
  transactions,
  products,
  expenses,
  onNavigateToInventory,
  onNavigateToPos,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory'>('overview');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // 1. KPI Today's Sales
  const todayDateStr = new Date().toISOString().split('T')[0];
  const exactTodayTx = transactions.filter((t) => t.date === todayDateStr && t.status === 'LUNAS');
  const todayTx = exactTodayTx.length > 0 ? exactTodayTx : transactions.slice(0, 3);
  
  const todayOmzet = todayTx.reduce((acc, t) => acc + (t.total_amount ?? t.grand_total), 0);
  const todayQty = todayTx.reduce((acc, t) => acc + t.items.reduce((sum, i) => sum + i.qty, 0), 0);
  const todayHpp = todayTx.reduce((acc, t) => acc + (t.total_hpp ?? t.total_cost_hpp ?? 0), 0);
  const todayGrossProfit = todayOmzet - todayHpp;
  const grossProfitMargin = todayOmzet > 0 ? ((todayGrossProfit / todayOmzet) * 100).toFixed(1) : '0.0';
  const averageOrderValue = todayTx.length > 0 ? Math.round(todayOmzet / todayTx.length) : 0;

  // 2. Monthly Expenses
  const totalExpensesMonth = expenses.reduce((acc, e) => acc + e.amount, 0);
```

with

```tsx
import { PosTransaction } from '../../shared/types';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';
import { reportsApi } from '../../services/api';
import type { InventoryValuation } from '../../services/api';
import { localDate, monthLabel } from '../../services/accountingPeriod';
import { dashboardRange, PAYMENT_GROUP_LABELS, PAYMENT_GROUPS, summarizeDashboard } from '../../services/dailyReports';
import { useServerData } from '../accounting/hooks/useServerData';

interface ExecutiveDashboardScreenProps {
  transactions: PosTransaction[];
  products: any[];
  /** Nilai persediaan FIFO server (GET /inventory/valuation); null bila peran tidak boleh membacanya. */
  inventoryValuation: InventoryValuation | null;
  /** Naik setiap kali server membukukan jurnal; rekap dimuat ulang. */
  ledgerVersion: number;
  onNavigateToInventory: () => void;
  onNavigateToPos: () => void;
}

export const ExecutiveDashboardScreen: React.FC<ExecutiveDashboardScreenProps> = ({
  transactions,
  products,
  inventoryValuation,
  ledgerVersion,
  onNavigateToInventory,
  onNavigateToPos,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory'>('overview');
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Angka uang dari rekap harian server (jurnal POSTED, tanggal lokal WIB):
  // nota VOID, retur dan biaya VOID sudah dibalik di tanggal pembatalannya.
  const today = localDate();
  const monthPrefix = today.slice(0, 7);
  const range = dashboardRange(today);
  const recap = useServerData(() => reportsApi.dailyRecap(range.from, range.to), [range.from, range.to, ledgerVersion]);
  const summary = summarizeDashboard(recap.data, today);
  const todayRow = summary.today;
  const month = summary.month;

  // 1. KPI hari ini
  const todayOmzet = todayRow.net_revenue;
  const todayQty = todayRow.product_qty;
  const todayHpp = todayRow.cost_of_sales;
  const todayGrossProfit = todayRow.gross_profit;
  const grossProfitMargin = todayOmzet > 0 ? ((todayGrossProfit / todayOmzet) * 100).toFixed(1) : '0.0';
  const averageOrderValue = todayRow.sales_count > 0 ? Math.round(todayOmzet / todayRow.sales_count) : 0;

  // 2. Beban operasional bulan berjalan (akun beban 6-xxxx)
  const totalExpensesMonth = month.operating_expenses;
```

- [ ] **Step 5: Dashboard screen — FIFO value and month filter**

Replace

```tsx
  // 4. Total Inventory Value (FIFO Valuation)
  const totalInventoryValue = products.reduce(
    (acc, p) => acc + (p.product_quantity ?? p.stock ?? 0) * (p.product_cost ?? p.cost_price ?? 0),
    0
  );
  const totalInventoryQty = products.reduce((acc, p) => acc + (p.product_quantity ?? p.stock ?? 0), 0);

  // 5. Fast-moving tires (Aggregate across transactions)
  const productSalesMap: Record<string, { product: any; totalQty: number; totalOmzet: number }> = {};

  transactions.forEach((tx) => {
    if (tx.status === 'VOID') return;
    tx.items.forEach((item) => {
```

with

```tsx
  // 4. Nilai persediaan FIFO dari server (Σ sisa batch × harga batch), bukan stok × harga beli terakhir
  const totalInventoryValue = inventoryValuation?.fifo_value ?? null;
  const totalInventoryQty = products.reduce((acc, p) => acc + (p.product_quantity ?? p.stock ?? 0), 0);

  // Nota bulan berjalan yang tidak di-VOID, untuk produk terlaris & pangsa merek.
  // ponytail: hanya 200 nota terbaru yang dimuat App.tsx; pindahkan ke rekap server bila sebulan melebihi itu.
  const monthTransactions = transactions.filter((tx) => tx.status !== 'VOID' && (tx.date || '').startsWith(monthPrefix));

  // 5. Fast-moving tires (bulan berjalan)
  const productSalesMap: Record<string, { product: any; totalQty: number; totalOmzet: number }> = {};

  monthTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
```

Then replace

```tsx
  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const brand = item.product?.brand || 'Lainnya';
```

with

```tsx
  monthTransactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const brand = item.product?.brand || 'Lainnya';
```

- [ ] **Step 6: Dashboard screen — trend, payment mix, goods/service split**

Replace

```tsx
  // 7. 7-Day Trend Chart
  const daysOrder = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const now = new Date();
  
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = daysOrder[d.getDay()];
    const dateLabel = `${d.getDate()}/${d.getMonth() + 1}`;
    
    const dayTransactions = transactions.filter((t) => t.date === dateStr && t.status !== 'VOID');
    const omzet = dayTransactions.reduce((acc, t) => acc + (t.total_amount ?? t.grand_total), 0);
    const hpp = dayTransactions.reduce((acc, t) => acc + (t.total_hpp ?? t.total_cost_hpp ?? 0), 0);
    const qty = dayTransactions.reduce((acc, t) => acc + t.items.reduce((s, item) => s + item.qty, 0), 0);

    return {
      date: dateLabel,
      day: i === 6 ? `${dayLabel} (Hari Ini)` : dayLabel,
      omzet,
      hpp,
      qty,
    };
  });
```

with

```tsx
  // 7. Tren 7 hari dari rekap server (tanggal lokal WIB)
  const daysOrder = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const last7DaysData = summary.week.map((row, i) => {
    const d = new Date(`${row.date}T00:00:00`);
    const dayLabel = daysOrder[d.getDay()];
    return {
      date: `${d.getDate()}/${d.getMonth() + 1}`,
      day: i === 6 ? `${dayLabel} (Hari Ini)` : dayLabel,
      omzet: row.net_revenue,
      hpp: row.cost_of_sales,
      qty: row.product_qty,
    };
  });
```

Then replace

```tsx
  // 8. Payment Method Distribution Calculation for Sales Tab
  const paymentBreakdown: Record<string, { count: number; total: number }> = {
    TUNAI: { count: 0, total: 0 },
    TRANSFER_BCA: { count: 0, total: 0 },
    QRIS: { count: 0, total: 0 },
  };

  transactions.forEach((tx) => {
    if (tx.status === 'VOID') return;
    const method = tx.payment_method || 'TUNAI';
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += (tx.total_amount ?? tx.grand_total);
  });

  const allTxTotal = transactions.reduce((acc, t) => acc + (t.total_amount ?? t.grand_total), 0) || 1;

  // 9. Service vs Products Breakdown
  let productRevenue = 0;
  let serviceRevenue = 0;
  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const lineTotal = (item.custom_price ?? item.product?.product_price ?? item.product?.price ?? 0) * item.qty;
      if (item.item_type === 'SERVICE') {
        serviceRevenue += lineTotal;
      } else {
        productRevenue += lineTotal;
      }
    });
  });
```

with

```tsx
  // 8. Bauran metode bayar bulan berjalan (nota VOID tidak ikut; TRANSFER_BCA digabung ke Transfer)
  const paymentBreakdown = month.payment_mix;
  const allTxTotal = PAYMENT_GROUPS.reduce((acc, g) => acc + paymentBreakdown[g], 0) || 1;

  // 9. Komposisi pendapatan bulan berjalan dari jurnal: 4-1000 ban vs 4-1001 jasa
  const productRevenue = month.goods_revenue;
  const serviceRevenue = month.service_revenue;
  const monthGrossMargin = month.net_revenue > 0 ? ((month.gross_profit / month.net_revenue) * 100).toFixed(1) : '0.0';
```

- [ ] **Step 7: Dashboard screen — JSX**

Replace

```tsx
              data={{ transactions, products, expenses }}
              ctx={{ periodLabel: `Sampai ${formatDateIndo(new Date().toISOString())}` }}
```

with

```tsx
              data={{ summary, products, fifoValue: totalInventoryValue }}
              ctx={{ periodLabel: `Sampai ${formatDateIndo(today)}` }}
```

Replace

```tsx
      {/* =======================================================================
          5 REAL KPI METRIC CARDS (Responsive 2x2 Grid + 1 Banner on Mobile)
```

with

```tsx
      {recap.error && (
        <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
          <span>Gagal memuat rekap harian dari server: {recap.error}</span>
          <button type="button" onClick={recap.reload} className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-bold cursor-pointer">
            Coba lagi
          </button>
        </div>
      )}

      {/* =======================================================================
          5 REAL KPI METRIC CARDS (Responsive 2x2 Grid + 1 Banner on Mobile)
```

Replace

```tsx
              {todayQty} ban • {todayTx.length} nota
```

with

```tsx
              {todayQty} ban • {todayRow.sales_count} nota
```

Replace

```tsx
            <div className="text-sm sm:text-lg md:text-xl font-black text-indigo-900 font-mono tracking-tight truncate" title={formatRupiah(totalInventoryValue)}>
              {formatRupiah(totalInventoryValue)}
            </div>
```

with

```tsx
            <div className="text-sm sm:text-lg md:text-xl font-black text-indigo-900 font-mono tracking-tight truncate" title={totalInventoryValue === null ? 'Butuh izin lihat inventori' : formatRupiah(totalInventoryValue)}>
              {totalInventoryValue === null ? '—' : formatRupiah(totalInventoryValue)}
            </div>
```

Replace

```tsx
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Beban Toko</span>
```

with

```tsx
            <span className="text-[11px] sm:text-xs font-bold text-slate-600 truncate">Beban Operasional</span>
```

Replace

```tsx
              {expenses.length} BKK
```

with

```tsx
              {monthLabel(monthPrefix)}
```

Replace

```tsx
              {expenses.length} Pos Biaya
```

with

```tsx
              Jurnal akun beban 6-xxxx
```

Replace

```tsx
                  Distribusi unit terjual berdasarkan pabrikan ban.
```

with

```tsx
                  Distribusi unit terjual bulan berjalan (nota VOID tidak ikut).
```

Replace

```tsx
                  Volume transaksi berdasarkan metode pelunasan kasir.
                </p>
              </div>

              <div className="space-y-3">
                {Object.entries(paymentBreakdown).map(([method, data]) => {
                  const pct = Math.round((data.total / allTxTotal) * 100) || 0;
                  const labelMap: Record<string, string> = {
                    TUNAI: 'Uang Tunai (Cash)',
                    TRANSFER_BCA: 'Transfer Bank BCA',
                    QRIS: 'QRIS Dinamis',
                  };
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{labelMap[method] || method}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{data.count} nota ({pct}%)</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(data.total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            method === 'TUNAI' ? 'bg-emerald-500' : method === 'TRANSFER_BCA' ? 'bg-blue-600' : method === 'QRIS' ? 'bg-cyan-500' : 'bg-amber-500'
                          }`}
```

with

```tsx
                  Penerimaan nota lunas {monthLabel(monthPrefix)} per metode pelunasan (nota VOID tidak ikut).
                </p>
              </div>

              <div className="space-y-3">
                {PAYMENT_GROUPS.map((method) => {
                  const total = paymentBreakdown[method];
                  const pct = Math.round((total / allTxTotal) * 100) || 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">{PAYMENT_GROUP_LABELS[method]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{pct}%</span>
                          <span className="font-mono font-bold text-slate-900">{formatRupiah(total)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            method === 'TUNAI' ? 'bg-emerald-500' : method === 'TRANSFER' ? 'bg-blue-600' : 'bg-cyan-500'
                          }`}
```

Replace

```tsx
                <span className="font-bold text-slate-800">Catatan Bisnis:</span> Layanan spooring 3D & balancing memiliki margin laba kotor 95%+ karena tanpa HPP fisik ban.
```

with

```tsx
                <span className="font-bold text-slate-800">Margin laba kotor {monthLabel(monthPrefix)}:</span> {monthGrossMargin}% (pendapatan bersih dikurangi HPP, dari jurnal server).
```

Check nothing still references the removed names: `grep -nE "todayTx|expenses\b|toISOString|TRANSFER_BCA" src/modules/dashboard/ExecutiveDashboardScreen.tsx` must print only the `tx.payment_method === 'TRANSFER_BCA'` badge line in the recent-transactions table (that table shows each nota's own method and stays).

- [ ] **Step 8: Pass the new props from `App.tsx`**

In `src/App.tsx` replace

```tsx
              <ExecutiveDashboardScreen
                transactions={transactions}
                products={products}
                expenses={expenses}
```

with

```tsx
              <ExecutiveDashboardScreen
                transactions={transactions}
                products={products}
                inventoryValuation={inventoryValuation}
                ledgerVersion={ledgerVersion}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: PASS.

- [ ] **Step 10: Run the frontend gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass (previous count + 2).

- [ ] **Step 11: Commit**

```bash
git status --short
git add src/modules/dashboard/ExecutiveDashboardScreen.tsx \
        src/shared/export/registry.ts \
        src/shared/export/__tests__/registry.test.ts \
        src/App.tsx
git commit -m "$(cat <<'EOF'
fix(dashboard): read kpis from the server daily recap

Today no longer falls back to the last three sales, expenses are this
month's posted operating expenses, stock value is the server FIFO
valuation, dates are local, the payment mix skips voided notas and the
hard-coded margin note shows the real monthly gross margin.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F3: "Laporan Harian" screen and exports

**Files:**
- Create: `src/modules/reports/DailyReportsScreen.tsx`, `src/modules/reports/index.ts`
- Modify: `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`, `src/shared/components/HeaderNavbar.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `reportsApi.dailyCash`, `reportsApi.dailyRecap`, `cashMovementLabel`, `PAYMENT_GROUPS`, `PAYMENT_GROUP_LABELS`, `emptyRecapRow`, `sumRecapRows` (F1); `useServerData`; `ActiveScreen` `'daily_reports'`; `can()` in `App.tsx`.
- Produces: `DailyReportsScreen` props `{ ledgerVersion: number; canViewRecap: boolean }`; registry report ids `daily_cash` (data `DailyCashReport`) and `daily_recap` (data `DailyRecap`).

- [ ] **Step 1: Write the failing tests**

In `src/shared/export/__tests__/registry.test.ts` replace

```ts
import type { CashFlowReport, DashboardSummary, FinancialStatements, StatementLine } from '../../types';
```

with

```ts
import type { CashFlowReport, DailyCashReport, DashboardSummary, FinancialStatements, StatementLine } from '../../types';
```

and replace (add 2 to whatever count SP2–SP4 left; at HEAD 20 → 22)

```ts
  it('semua 20 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(20));
```

with

```ts
  it('semua 22 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(22));
```

Append at the end of the file:

```ts

describe('registry daily reports', () => {
  const row = { ...emptyRecapRow('2026-10-01'), sales_count: 2, net_revenue: 500, cash_in: 450 };
  const cashierReport: DailyCashReport = {
    date: '2026-10-01',
    scope: 'cashier',
    cashier: 'Kasir 1',
    summary: null,
    cash_accounts: null,
    cash_movements: null,
    expenses: null,
    sales: [{
      id: 1, reference: 'OB3-INV-202610-0001', time: '09:00', cashier_name: 'Kasir 1', customer_name: null,
      vehicle_plate: null, total_amount: 100, total_hpp: 60, status: 'LUNAS',
      payments: [{ method: 'TUNAI', amount: 100, fee_amount: 0, net_received: 100 }],
    }],
    cashiers: [{ cashier_name: 'Kasir 1', sales_count: 1, sales_total: 100, void_count: 0, void_total: 0, by_method: { TUNAI: 100, TRANSFER: 0, QRIS: 0 } }],
    cash_sessions: [],
  };

  it('rekap harian: satu baris per hari dan total', () => {
    const doc = buildExportDoc('daily_recap', { from: '2026-10-01', to: '2026-10-01', rows: [row], totals: sumRecapRows([row]) }, ctx);
    expect(doc.sections[0].rows[0]).toMatchObject({ date: '2026-10-01', sales_count: 2, net_revenue: 500 });
    expect(doc.sections[0].totals?.cash_in).toBe(450);
  });

  it('kas harian lingkup kasir tanpa bagian buku besar', () => {
    const doc = buildExportDoc('daily_cash', cashierReport, ctx);
    expect(doc.sections.map((s) => s.title)).toEqual(['Penerimaan per Kasir', 'Daftar Nota', 'Sesi Kasir']);
    expect(doc.sections[0].rows[0].tunai).toBe(100);
  });

  it('kas harian lingkup toko memuat saldo kas dan label mutasi', () => {
    const doc = buildExportDoc('daily_cash', {
      ...cashierReport,
      scope: 'all',
      cashier: null,
      summary: row,
      cash_accounts: [{ code: '1-1000', name: 'Kas Toko Laci Kasir', opening: 10, cash_in: 40, cash_out: 40, closing: 10 }],
      cash_movements: [{ reference_type: 'CASH_DEPOSIT', cash_in: 40, cash_out: 40 }],
      expenses: [],
    }, ctx);
    expect(doc.sections.find((s) => s.title === 'Mutasi Kas per Jenis Transaksi')?.rows[0].jenis).toBe('Setor kas laci ke bank');
    expect(doc.sections.find((s) => s.title === 'Saldo Kas & Bank')?.rows[0].akhir).toBe(10);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: FAIL — 20 report ids instead of 22 and `REPORT_MAPPERS[id] is not a function` for `daily_recap` / `daily_cash`.

- [ ] **Step 3: Add the export mappers**

In `src/shared/export/registry.ts` replace

```ts
import type { DashboardSummary } from '../types';
```

with

```ts
import type { DailyCashReport, DailyCashSale, DailyRecap, DailyRecapTotals, DashboardSummary } from '../types';
import { cashMovementLabel } from '../../services/dailyReports';
```

Insert directly before the line `type LabelValue = { label: string; value: number };`:

```ts
const RECAP_KEYS = ['sales_count', 'net_revenue', 'returns', 'cost_of_sales', 'gross_profit', 'operating_expenses', 'net_income', 'cash_in', 'cash_out'] as const;
const pickRecap = (r: DailyRecapTotals): Record<string, number> => Object.fromEntries(RECAP_KEYS.map((k) => [k, r[k]]));

const mapDailyRecap = (r: DailyRecap, ctx: ExportCtx): ExportDoc =>
  makeDoc('daily_recap', 'Rekap Harian', 'landscape', ctx, [{
    columns: [
      { key: 'date', label: 'Tanggal', type: 'date', width: 12 },
      { key: 'sales_count', label: 'Nota', type: 'number', width: 8 },
      { key: 'net_revenue', label: 'Pendapatan Bersih', type: 'currency' },
      { key: 'returns', label: 'Retur', type: 'currency' },
      { key: 'cost_of_sales', label: 'HPP', type: 'currency' },
      { key: 'gross_profit', label: 'Laba Kotor', type: 'currency' },
      { key: 'operating_expenses', label: 'Beban', type: 'currency' },
      { key: 'net_income', label: 'Laba Bersih', type: 'currency' },
      { key: 'cash_in', label: 'Kas Masuk', type: 'currency' },
      { key: 'cash_out', label: 'Kas Keluar', type: 'currency' },
    ],
    rows: r.rows.map((row) => ({ date: row.date, ...pickRecap(row) })),
    totals: pickRecap(r.totals),
  }]);

const paymentsText = (payments: DailyCashSale['payments']): string =>
  payments.map((p) => `${p.method} ${formatRupiah(p.amount)}`).join(', ');

const mapDailyCash = (r: DailyCashReport, ctx: ExportCtx): ExportDoc => {
  const live = r.sales.filter((s) => s.status !== 'VOID');
  const sections: ExportSection[] = [
    {
      title: 'Penerimaan per Kasir',
      columns: [
        { key: 'kasir', label: 'Kasir', type: 'text', width: 22 },
        { key: 'nota', label: 'Nota', type: 'number', width: 8 },
        { key: 'tunai', label: 'Tunai', type: 'currency' },
        { key: 'transfer', label: 'Transfer', type: 'currency' },
        { key: 'qris', label: 'QRIS', type: 'currency' },
        { key: 'total', label: 'Total Nota', type: 'currency' },
        { key: 'void', label: 'Nota VOID', type: 'currency' },
      ],
      rows: r.cashiers.map((c) => ({
        kasir: c.cashier_name, nota: c.sales_count, tunai: c.by_method.TUNAI, transfer: c.by_method.TRANSFER,
        qris: c.by_method.QRIS, total: c.sales_total, void: c.void_total,
      })),
      totals: { nota: sum(r.cashiers, (c) => c.sales_count), total: sum(r.cashiers, (c) => c.sales_total), void: sum(r.cashiers, (c) => c.void_total) },
    },
    {
      title: 'Daftar Nota',
      columns: [
        { key: 'jam', label: 'Jam', type: 'text', width: 8 },
        { key: 'nota', label: 'No Nota', type: 'text', width: 22 },
        { key: 'kasir', label: 'Kasir', type: 'text', width: 16 },
        { key: 'pelanggan', label: 'Pelanggan', type: 'text', width: 20 },
        { key: 'bayar', label: 'Pembayaran', type: 'text', width: 30 },
        { key: 'total', label: 'Total', type: 'currency' },
        { key: 'status', label: 'Status', type: 'text', width: 10 },
      ],
      rows: r.sales.map((s) => ({
        jam: s.time ?? '-', nota: s.reference, kasir: s.cashier_name, pelanggan: s.customer_name ?? 'Umum',
        bayar: paymentsText(s.payments), total: s.total_amount, status: s.status,
      })),
      totals: { total: sum(live, (s) => s.total_amount) },
    },
  ];
  if (r.cash_accounts) {
    sections.push({
      title: 'Saldo Kas & Bank',
      columns: [
        { key: 'akun', label: 'Akun', type: 'text', width: 30 },
        { key: 'awal', label: 'Saldo Awal', type: 'currency' },
        { key: 'masuk', label: 'Masuk', type: 'currency' },
        { key: 'keluar', label: 'Keluar', type: 'currency' },
        { key: 'akhir', label: 'Saldo Akhir', type: 'currency' },
      ],
      rows: r.cash_accounts.map((a) => ({ akun: `${a.code} ${a.name}`, awal: a.opening, masuk: a.cash_in, keluar: a.cash_out, akhir: a.closing })),
    });
  }
  if (r.cash_movements) {
    sections.push({
      title: 'Mutasi Kas per Jenis Transaksi',
      columns: [
        { key: 'jenis', label: 'Jenis', type: 'text', width: 34 },
        { key: 'masuk', label: 'Masuk', type: 'currency' },
        { key: 'keluar', label: 'Keluar', type: 'currency' },
      ],
      rows: r.cash_movements.map((m) => ({ jenis: cashMovementLabel(m.reference_type), masuk: m.cash_in, keluar: m.cash_out })),
      totals: { masuk: sum(r.cash_movements, (m) => m.cash_in), keluar: sum(r.cash_movements, (m) => m.cash_out) },
    });
  }
  if (r.expenses) {
    sections.push({
      title: 'Biaya Hari Ini',
      columns: [
        { key: 'ref', label: 'No BKK', type: 'text', width: 20 },
        { key: 'kategori', label: 'Kategori', type: 'text', width: 20 },
        { key: 'keterangan', label: 'Keterangan', type: 'text', width: 30 },
        { key: 'jumlah', label: 'Jumlah', type: 'currency' },
      ],
      rows: r.expenses.map((e) => ({ ref: e.reference, kategori: e.category ?? '-', keterangan: e.description, jumlah: e.amount })),
      totals: { jumlah: sum(r.expenses, (e) => e.amount) },
    });
  }
  sections.push({
    title: 'Sesi Kasir',
    columns: [
      { key: 'kasir', label: 'Kasir', type: 'text', width: 18 },
      { key: 'buka', label: 'Buka', type: 'text', width: 18 },
      { key: 'tutup', label: 'Tutup', type: 'text', width: 18 },
      { key: 'modal', label: 'Modal Awal', type: 'currency' },
      { key: 'seharusnya', label: 'Kas Seharusnya', type: 'currency' },
      { key: 'dihitung', label: 'Kas Dihitung', type: 'currency' },
      { key: 'selisih', label: 'Selisih', type: 'currency' },
      { key: 'alasan', label: 'Alasan Selisih', type: 'text', width: 24 },
      { key: 'status', label: 'Status', type: 'text', width: 16 },
    ],
    rows: r.cash_sessions.map((s) => ({
      kasir: s.user_name ?? '-', buka: s.opened_at ?? '-', tutup: s.closed_at ?? '-', modal: s.opening_float,
      seharusnya: s.expected_cash, dihitung: s.counted_cash, selisih: s.variance, alasan: s.variance_reason ?? '-', status: s.status,
    })),
  });
  return makeDoc('daily_cash', 'Laporan Kas Harian', 'landscape', ctx, sections);
};

```

In `REPORT_MAPPERS` replace

```ts
  dashboard_summary: mapDashboard,
```

with

```ts
  dashboard_summary: mapDashboard,
  daily_cash: mapDailyCash,
  daily_recap: mapDailyRecap,
```

In `REPORT_FORMATS` replace

```ts
  dashboard_summary: ['xlsx', 'pdf'],
```

with

```ts
  dashboard_summary: ['xlsx', 'pdf'],
  daily_cash: ['xlsx', 'pdf'],
  daily_recap: ['xlsx', 'pdf', 'csv'],
```

- [ ] **Step 4: Create the screen**

Create `src/modules/reports/DailyReportsScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { AlertTriangle, CalendarDays } from 'lucide-react';
import type { DailyRecapTotals } from '../../shared/types';
import { formatDateIndo, formatRupiah } from '../../shared/utils/formatters';
import { ExportMenu } from '../../shared/export/ExportMenu';
import { reportsApi } from '../../services/api';
import { localDate } from '../../services/accountingPeriod';
import { cashMovementLabel, PAYMENT_GROUP_LABELS, PAYMENT_GROUPS } from '../../services/dailyReports';
import { useServerData } from '../accounting/hooks/useServerData';

interface DailyReportsScreenProps {
  /** Naik setiap kali server membukukan jurnal; laporan dimuat ulang. */
  ledgerVersion: number;
  /** Rekap harian (laba rugi toko per hari) hanya untuk izin dashboard atau laporan keuangan. */
  canViewRecap: boolean;
}

type Tab = 'cash' | 'recap';

const card = 'bg-white border border-slate-200 rounded-2xl p-4 shadow-xs';
const th = 'py-2 px-3 font-bold text-left';
const thr = 'py-2 px-3 font-bold text-right';
const td = 'py-2 px-3';
const num = 'py-2 px-3 text-right font-mono';
const money = (v: number | null) => (v === null ? '-' : formatRupiah(v));

const LoadState: React.FC<{ loading: boolean; error: string | null; onRetry: () => void }> = ({ loading, error, onRetry }) => {
  if (error) {
    return (
      <div role="alert" className="flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
        <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</span>
        <button type="button" onClick={onRetry} className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-bold cursor-pointer">
          Coba lagi
        </button>
      </div>
    );
  }
  return loading ? <p className="text-xs text-slate-500">Memuat data dari server…</p> : null;
};

const Section: React.FC<{ title: string; head: React.ReactNode; children: React.ReactNode }> = ({ title, head, children }) => (
  <section className={`${card} space-y-3`}>
    <h3 className="font-extrabold text-sm text-slate-900">{title}</h3>
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[560px] text-xs border-collapse">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-700 border-b border-slate-200">{head}</thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  </section>
);

const Empty: React.FC<{ cols: number }> = ({ cols }) => (
  <tr><td colSpan={cols} className="py-3 px-3 text-slate-500">Tidak ada data.</td></tr>
);

const DailyCashTab: React.FC<{ ledgerVersion: number }> = ({ ledgerVersion }) => {
  const [date, setDate] = useState(localDate());
  const report = useServerData(() => reportsApi.dailyCash(date), [date, ledgerVersion]);
  const r = report.data;
  const kpis: [string, number][] = r?.summary
    ? [
        ['Pendapatan Bersih', r.summary.net_revenue],
        ['HPP', r.summary.cost_of_sales],
        ['Laba Kotor', r.summary.gross_profit],
        ['Beban Operasional', r.summary.operating_expenses],
        ['Laba Bersih', r.summary.net_income],
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="text-xs font-bold text-slate-700 space-y-1">
          <span className="block">Tanggal</span>
          <input
            type="date"
            value={date}
            max={localDate()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-300 text-xs"
          />
        </label>
        {r && <ExportMenu reportId="daily_cash" data={r} ctx={{ periodLabel: formatDateIndo(date), startDate: date, endDate: date }} />}
      </div>

      <LoadState loading={report.loading} error={report.error} onRetry={report.reload} />

      {r && (
        <>
          {r.scope === 'cashier' && (
            <p className="text-xs text-slate-600">Menampilkan nota dan sesi kasir milik <b>{r.cashier}</b> saja.</p>
          )}

          {kpis.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {kpis.map(([label, value]) => (
                <div key={label} className={card}>
                  <div className="text-[11px] font-bold text-slate-600">{label}</div>
                  <div className="text-base font-black font-mono text-slate-900">{formatRupiah(value)}</div>
                </div>
              ))}
            </div>
          )}

          {r.cash_accounts && (
            <Section
              title="Saldo Kas Laci & Bank"
              head={<tr><th className={th}>Akun</th><th className={thr}>Saldo Awal</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th><th className={thr}>Saldo Akhir</th></tr>}
            >
              {r.cash_accounts.map((a) => (
                <tr key={a.code}>
                  <td className={td}>{a.code} {a.name}</td>
                  <td className={num}>{formatRupiah(a.opening)}</td>
                  <td className={num}>{formatRupiah(a.cash_in)}</td>
                  <td className={num}>{formatRupiah(a.cash_out)}</td>
                  <td className={`${num} font-bold`}>{formatRupiah(a.closing)}</td>
                </tr>
              ))}
            </Section>
          )}

          {r.cash_movements && (
            <Section title="Mutasi Kas per Jenis Transaksi" head={<tr><th className={th}>Jenis</th><th className={thr}>Masuk</th><th className={thr}>Keluar</th></tr>}>
              {r.cash_movements.length === 0 && <Empty cols={3} />}
              {r.cash_movements.map((m) => (
                <tr key={m.reference_type}>
                  <td className={td}>{cashMovementLabel(m.reference_type)}</td>
                  <td className={num}>{formatRupiah(m.cash_in)}</td>
                  <td className={num}>{formatRupiah(m.cash_out)}</td>
                </tr>
              ))}
            </Section>
          )}

          <Section
            title="Penerimaan per Kasir"
            head={
              <tr>
                <th className={th}>Kasir</th>
                <th className={thr}>Nota</th>
                {PAYMENT_GROUPS.map((g) => <th key={g} className={thr}>{PAYMENT_GROUP_LABELS[g]}</th>)}
                <th className={thr}>Total Nota</th>
                <th className={thr}>Nota VOID</th>
              </tr>
            }
          >
            {r.cashiers.length === 0 && <Empty cols={7} />}
            {r.cashiers.map((c) => (
              <tr key={c.cashier_name}>
                <td className={`${td} font-bold`}>{c.cashier_name}</td>
                <td className={num}>{c.sales_count}</td>
                {PAYMENT_GROUPS.map((g) => <td key={g} className={num}>{formatRupiah(c.by_method[g])}</td>)}
                <td className={`${num} font-bold`}>{formatRupiah(c.sales_total)}</td>
                <td className={num}>{c.void_count} ({formatRupiah(c.void_total)})</td>
              </tr>
            ))}
          </Section>

          <Section
            title="Sesi Kasir"
            head={
              <tr>
                <th className={th}>Kasir</th><th className={th}>Buka</th><th className={th}>Tutup</th>
                <th className={thr}>Modal Awal</th><th className={thr}>Seharusnya</th><th className={thr}>Dihitung</th>
                <th className={thr}>Selisih</th><th className={th}>Alasan</th><th className={th}>Status</th>
              </tr>
            }
          >
            {r.cash_sessions.length === 0 && <Empty cols={9} />}
            {r.cash_sessions.map((s) => (
              <tr key={s.id}>
                <td className={td}>{s.user_name ?? '-'}</td>
                <td className={td}>{s.opened_at ?? '-'}</td>
                <td className={td}>{s.closed_at ?? '-'}</td>
                <td className={num}>{formatRupiah(s.opening_float)}</td>
                <td className={num}>{money(s.expected_cash)}</td>
                <td className={num}>{money(s.counted_cash)}</td>
                <td className={`${num} ${s.variance ? 'text-rose-700 font-bold' : ''}`}>{money(s.variance)}</td>
                <td className={td}>{s.variance_reason ?? '-'}</td>
                <td className={td}>{s.status}</td>
              </tr>
            ))}
          </Section>

          <Section
            title="Daftar Nota"
            head={
              <tr>
                <th className={th}>Jam</th><th className={th}>No Nota</th><th className={th}>Kasir</th>
                <th className={th}>Pelanggan</th><th className={th}>Pembayaran</th><th className={thr}>Total</th><th className={th}>Status</th>
              </tr>
            }
          >
            {r.sales.length === 0 && <Empty cols={7} />}
            {r.sales.map((s) => (
              <tr key={s.id} className={s.status === 'VOID' ? 'bg-rose-50/60 text-slate-500' : ''}>
                <td className={td}>{s.time ?? '-'}</td>
                <td className={`${td} font-mono font-bold text-blue-700`}>{s.reference}</td>
                <td className={td}>{s.cashier_name}</td>
                <td className={td}>{s.customer_name ?? 'Umum'}</td>
                <td className={td}>{s.payments.map((p) => `${p.method} ${formatRupiah(p.amount)}`).join(', ') || '-'}</td>
                <td className={num}>{formatRupiah(s.total_amount)}</td>
                <td className={td}>{s.status}</td>
              </tr>
            ))}
          </Section>

          {r.expenses && (
            <Section title="Biaya Hari Ini" head={<tr><th className={th}>No BKK</th><th className={th}>Kategori</th><th className={th}>Keterangan</th><th className={thr}>Jumlah</th></tr>}>
              {r.expenses.length === 0 && <Empty cols={4} />}
              {r.expenses.map((e) => (
                <tr key={e.reference}>
                  <td className={`${td} font-mono`}>{e.reference}</td>
                  <td className={td}>{e.category ?? '-'}</td>
                  <td className={td}>{e.description}</td>
                  <td className={num}>{formatRupiah(e.amount)}</td>
                </tr>
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  );
};

const DailyRecapTab: React.FC<{ ledgerVersion: number }> = ({ ledgerVersion }) => {
  const today = localDate();
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const recap = useServerData(() => reportsApi.dailyRecap(from, to), [from, to, ledgerVersion]);
  const r = recap.data;
  const cols: [string, Exclude<keyof DailyRecapTotals, 'payment_mix'>][] = [
    ['Pendapatan Bersih', 'net_revenue'],
    ['Retur', 'returns'],
    ['HPP', 'cost_of_sales'],
    ['Laba Kotor', 'gross_profit'],
    ['Beban', 'operating_expenses'],
    ['Laba Bersih', 'net_income'],
    ['Kas Masuk', 'cash_in'],
    ['Kas Keluar', 'cash_out'],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-xs font-bold text-slate-700 space-y-1">
            <span className="block">Dari</span>
            <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-300 text-xs" />
          </label>
          <label className="text-xs font-bold text-slate-700 space-y-1">
            <span className="block">Sampai</span>
            <input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-300 text-xs" />
          </label>
        </div>
        {r && <ExportMenu reportId="daily_recap" data={r} ctx={{ periodLabel: `${formatDateIndo(from)} - ${formatDateIndo(to)}`, startDate: from, endDate: to }} />}
      </div>

      <LoadState loading={recap.loading} error={recap.error} onRetry={recap.reload} />

      {r && (
        <Section
          title="Rekap Harian (maks. 92 hari)"
          head={
            <tr>
              <th className={th}>Tanggal</th>
              <th className={thr}>Nota</th>
              {cols.map(([label]) => <th key={label} className={thr}>{label}</th>)}
              {PAYMENT_GROUPS.map((g) => <th key={g} className={thr}>{PAYMENT_GROUP_LABELS[g]}</th>)}
            </tr>
          }
        >
          {[...r.rows].reverse().map((row) => (
            <tr key={row.date}>
              <td className={td}>{formatDateIndo(row.date)}</td>
              <td className={num}>{row.sales_count}</td>
              {cols.map(([label, key]) => <td key={label} className={num}>{formatRupiah(row[key])}</td>)}
              {PAYMENT_GROUPS.map((g) => <td key={g} className={num}>{formatRupiah(row.payment_mix[g])}</td>)}
            </tr>
          ))}
          <tr className="bg-slate-50 font-bold">
            <td className={td}>Total</td>
            <td className={num}>{r.totals.sales_count}</td>
            {cols.map(([label, key]) => <td key={label} className={num}>{formatRupiah(r.totals[key])}</td>)}
            {PAYMENT_GROUPS.map((g) => <td key={g} className={num}>{formatRupiah(r.totals.payment_mix[g])}</td>)}
          </tr>
        </Section>
      )}
    </div>
  );
};

export const DailyReportsScreen: React.FC<DailyReportsScreenProps> = ({ ledgerVersion, canViewRecap }) => {
  const [tab, setTab] = useState<Tab>('cash');
  const active: Tab = canViewRecap ? tab : 'cash';
  const tabs: Tab[] = canViewRecap ? ['cash', 'recap'] : ['cash'];

  return (
    <div className="flex-1 p-4 sm:p-6 space-y-5 bg-[#F8FAFC] text-slate-900">
      <div className={`${card} space-y-3`}>
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <CalendarDays className="w-4 h-4" />
            <span>Laporan Operasional Harian</span>
          </div>
          <h1 className="text-xl font-black tracking-tight">Laporan Harian Kas & Rekap Kasir</h1>
          <p className="text-xs text-slate-600">
            Angka uang dihitung server dari jurnal (sama dengan Laba Rugi dan Arus Kas); jumlah nota dari nota yang tidak di-VOID.
          </p>
        </div>
        <div role="tablist" aria-label="Jenis laporan harian" className="flex gap-1.5 p-1.5 bg-slate-100 rounded-xl text-xs font-bold w-fit">
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={active === t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-2 rounded-lg cursor-pointer ${active === t ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:bg-white/60'}`}
            >
              {t === 'cash' ? 'Kas Harian' : 'Rekap Harian'}
            </button>
          ))}
        </div>
      </div>

      {active === 'cash' ? <DailyCashTab ledgerVersion={ledgerVersion} /> : <DailyRecapTab ledgerVersion={ledgerVersion} />}
    </div>
  );
};
```

Create `src/modules/reports/index.ts`:

```ts
export * from './DailyReportsScreen';
```

- [ ] **Step 5: Navigation and render**

In `src/shared/components/HeaderNavbar.tsx` replace

```tsx
  Settings as SettingsIcon,
```

with

```tsx
  Settings as SettingsIcon,
  CalendarDays,
```

and replace

```tsx
      breadcrumb: ['Laporan Keuangan', 'Laba Rugi & Posisi Keuangan (Neraca)'],
    },
```

with

```tsx
      breadcrumb: ['Laporan Keuangan', 'Laba Rugi & Posisi Keuangan (Neraca)'],
    },
    {
      id: 'daily_reports' as ActiveScreen,
      label: 'Laporan Harian',
      icon: CalendarDays,
      breadcrumb: ['Laporan Harian', 'Kas Harian, Rekap Harian & Per Kasir'],
    },
```

In `src/App.tsx` replace

```tsx
import { ExecutiveDashboardScreen } from './modules/dashboard';
```

with

```tsx
import { ExecutiveDashboardScreen } from './modules/dashboard';
import { DailyReportsScreen } from './modules/reports';
```

and replace

```tsx
            {activeScreen === 'financials' && (
              <FinancialStatementsScreen refreshKey={ledgerVersion} />
            )}
```

with

```tsx
            {activeScreen === 'financials' && (
              <FinancialStatementsScreen refreshKey={ledgerVersion} />
            )}

            {activeScreen === 'daily_reports' && (
              <DailyReportsScreen ledgerVersion={ledgerVersion} canViewRecap={can('dashboard') || can('financial_reports')} />
            )}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the frontend gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass (previous count + 3).

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/modules/reports/DailyReportsScreen.tsx \
        src/modules/reports/index.ts \
        src/shared/export/registry.ts \
        src/shared/export/__tests__/registry.test.ts \
        src/shared/components/HeaderNavbar.tsx \
        src/App.tsx
git commit -m "$(cat <<'EOF'
feat(reports): add the laporan harian screen and exports

Owners get the daily cash report (ledger cash balances, movements per
journal type, cashier recap, shifts, notas, expenses) and the daily
recap; cashiers see their own notas and shifts. Both export to xlsx and
pdf.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F4: Business dates from `localDate()` everywhere

**Files:**
- Create: `src/services/__tests__/localDateUsage.test.ts`
- Modify: `src/modules/accounting/components/LedgerPrintModal.tsx`, `src/modules/accounting/components/PayDebtModal.tsx`, `src/modules/inventory/components/GoodsReceiptModal.tsx`, `src/modules/inventory/components/StockMonthlyLedgerView.tsx`, `src/services/stockMonthlyLedgerService.ts`, `src/modules/pos/PosScreen.tsx`, `src/modules/receipt/ThermalReceiptScreen.tsx`, `src/services/inventoryService.ts`

**Interfaces:**
- Consumes: `localDate(d?: Date): string`, `currentMonth(d?: Date): string` from `src/services/accountingPeriod.ts`.
- Produces: guard test; no API changes.

- [ ] **Step 1: Write the failing test**

Create `src/services/__tests__/localDateUsage.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Tanggal bisnis wajib localDate(): toISOString() memakai UTC dan mundur sehari sebelum 07:00 WIB. */
const DATE_FROM_ISO = /toISOString\(\)\s*\.\s*(split\(\s*['"]T['"]\s*\)|substring\(\s*0\s*,\s*(7|10)\s*\)|slice\(\s*0\s*,\s*(7|10)\s*\))/;

describe('business dates use localDate()', () => {
  it('no source file slices toISOString() into a date or month', () => {
    const root = join(process.cwd(), 'src');
    const offenders = (readdirSync(root, { recursive: true }) as string[])
      .filter((file) => /\.(ts|tsx)$/.test(file) && !/__tests__/.test(file))
      .filter((file) => DATE_FROM_ISO.test(readFileSync(join(root, file), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/__tests__/localDateUsage.test.ts`
Expected: FAIL — offenders list `LedgerPrintModal.tsx`, `PayDebtModal.tsx`, `GoodsReceiptModal.tsx`, `StockMonthlyLedgerView.tsx`, `PosScreen.tsx`, `ThermalReceiptScreen.tsx`, `inventoryService.ts`, `stockMonthlyLedgerService.ts` (paths with `\` on Windows). If SP2–SP4 added another offender, fix it the same way in this task.

- [ ] **Step 3: Replace the dates**

`src/modules/accounting/components/LedgerPrintModal.tsx`: after

```tsx
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
```

add

```tsx
import { localDate } from '../../../services/accountingPeriod';
```

and replace all three occurrences of

```tsx
{new Date().toISOString().substring(0, 10)}
```

with

```tsx
{localDate()}
```

`src/modules/accounting/components/PayDebtModal.tsx`: after

```tsx
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
```

add

```tsx
import { localDate } from '../../../services/accountingPeriod';
```

and replace

```tsx
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
```

with

```tsx
  const [paymentDate, setPaymentDate] = useState(() => localDate());
```

`src/modules/inventory/components/GoodsReceiptModal.tsx`: after

```tsx
import { formatRupiah } from '../../../shared/utils/formatters';
```

add

```tsx
import { localDate } from '../../../services/accountingPeriod';
```

and replace

```tsx
    const todayStr = new Date().toISOString().split('T')[0];
```

with

```tsx
    const todayStr = localDate();
```

and

```tsx
    setDueDate(due.toISOString().split('T')[0]);
```

with

```tsx
    setDueDate(localDate(due));
```

`src/modules/inventory/components/StockMonthlyLedgerView.tsx`: after

```tsx
import { formatRupiah, formatNumber } from '../../../shared/utils/formatters';
```

add

```tsx
import { currentMonth } from '../../../services/accountingPeriod';
```

and replace

```tsx
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), []);
```

with

```tsx
  const currentMonthStr = useMemo(() => currentMonth(), []);
```

`src/services/stockMonthlyLedgerService.ts`: after

```ts
import { ProductItem, PosTransaction, StockMutation } from '../shared/types';
```

add

```ts
import { currentMonth } from './accountingPeriod';
```

and replace

```ts
  month: string = new Date().toISOString().substring(0, 7),
```

with

```ts
  month: string = currentMonth(),
```

`src/modules/pos/PosScreen.tsx`: after

```tsx
import { useToast } from '../../shared/components';
```

add

```tsx
import { localDate } from '../../services/accountingPeriod';
```

and replace

```tsx
      reference: `PARK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
```

with

```tsx
      reference: `PARK-${localDate().replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
```

`src/modules/receipt/ThermalReceiptScreen.tsx`: after

```tsx
import { ExportMenu } from '../../shared/export/ExportMenu';
```

add

```tsx
import { localDate } from '../../services/accountingPeriod';
```

and replace

```tsx
    const todayStr = new Date().toISOString().substring(0, 10);
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().substring(0, 10);
```

with

```tsx
    const todayStr = localDate();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = localDate(sevenDaysAgo);
```

`src/services/inventoryService.ts`: after the type import block ending

```ts
} from '../shared/types';
```

add

```ts
import { localDate } from './accountingPeriod';
```

replace both occurrences of

```ts
  const dateStr = now.toISOString().split('T')[0];
```

with

```ts
  const dateStr = localDate(now);
```

and replace

```ts
  const dateStr = input.receipt_date || now.toISOString().split('T')[0];
```

with

```ts
  const dateStr = input.receipt_date || localDate(now);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/__tests__/localDateUsage.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the frontend gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass (previous count + 1).

- [ ] **Step 6: Commit**

```bash
git status --short
git add src/services/__tests__/localDateUsage.test.ts \
        src/modules/accounting/components/LedgerPrintModal.tsx \
        src/modules/accounting/components/PayDebtModal.tsx \
        src/modules/inventory/components/GoodsReceiptModal.tsx \
        src/modules/inventory/components/StockMonthlyLedgerView.tsx \
        src/services/stockMonthlyLedgerService.ts \
        src/modules/pos/PosScreen.tsx \
        src/modules/receipt/ThermalReceiptScreen.tsx \
        src/services/inventoryService.ts
git commit -m "$(cat <<'EOF'
fix(ui): take default business dates from localdate

toISOString() gives the UTC date, so before 07:00 WIB payment dates,
goods receipt dates, receipt filters, parked-order numbers and print
dates showed yesterday. A guard test keeps new code from slicing it.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

# Part D — Docs

### Task D1: Agent docs, roadmap and handoff

**Files:**
- Modify: `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/api-reference.md`, `docs/ai/architecture.md`, `docs/ai/domain-accounting.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`

**Interfaces:**
- Consumes: everything from B1–F4. No code.

- [ ] **Step 1: `AGENTS.md`**

In the migration-status table, after the row

```markdown
| Financial reports (journals, ledger, trial balance, statements, equity changes, cash flow) | Server, computed per period | 4 (done) |
```

add

```markdown
| Daily cash report, daily recap, per-cashier recap, dashboard money figures | Server (`/reports/daily-*`, computed from journals) | roadmap SP5 (done) |
```

- [ ] **Step 2: `backend/AGENTS.md`**

In the layout block, after the line

```
  Payment/MidtransQrisService.php
```

add

```
  Reports/DailyReportService.php  daily recap, daily cash report, per-cashier recap (reads journals; posts nothing)
```

- [ ] **Step 3: `docs/ai/api-reference.md`**

Directly before the heading `## Role settings` insert:

```markdown
## Operational reports (roadmap sub-project 5)
Read-only; money figures come from POSTED journals (same classification as the income statement), counts and payment
mix from notas that are not VOID. Service: `app/Services/Reports/DailyReportService.php`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/reports/daily-recap` | `dashboard`, `financial_reports` | `from, to` (Y-m-d, ≤ 92 days, else 422); one row per day + `totals`: sales_count, product_qty, revenue, goods/service revenue, contra revenue, returns (4-9100), net revenue, cost of sales, gross profit, operating expenses, net income, payment_mix {TUNAI, TRANSFER, QRIS}, cash_in/out/net (1-1000 + 1-1001, `ACCOUNT_OPENING` excluded) |
| GET | `/reports/daily-cash` | `daily_reports` | `date` (default today). With `financial_reports` (or OWNER): summary, cash accounts (opening + in − out = closing), cash movements per journal type, notas, per-cashier recap, non-VOID expenses, cashier sessions. Otherwise only the user's own notas (`cashier_name`), sessions and cashier row; ledger sections `null` |

```

- [ ] **Step 4: `docs/ai/architecture.md`**

Replace

```markdown
  `pos | receipt | dashboard | inventory | expenses | ledger | financials | settings`. There are no URLs or deep links.
```

with

```markdown
  `pos | receipt | dashboard | inventory | expenses | ledger | financials | daily_reports | settings`. There are no URLs or deep links.
```

and after the row

```markdown
  | financials (Laporan Keuangan) | `financial_reports` |
```

add

```markdown
  | daily_reports (Laporan Harian) | `daily_reports` (the Rekap Harian tab also needs `dashboard` or `financial_reports`) |
```

Then add at the end of the "State" subsection (after the bullet that starts `- When adding a server-backed feature:`):

```markdown
- The dashboard reads its money figures from `GET /reports/daily-recap` (one call covering the month and the last 7
  days, `src/services/dailyReports.ts`) and the FIFO value from `inventoryValuation` (`GET /inventory/valuation`); only
  top products and brand share still use the loaded `transactions` (this month, non-VOID).
```

- [ ] **Step 5: `docs/ai/domain-accounting.md`**

In the "Reports" section, directly before the bullet that starts `- **\`ExpenseService\`**`, insert:

```markdown
- **`Reports/DailyReportService`** (roadmap sub-project 5) groups POSTED journals per day with
  `FinancialReportService::incomeSection()`, so Σ daily-recap rows = the income statement for the same range, and
  sums 1-1000/1-1001 debits/credits per day and journal type (`ACCOUNT_OPENING` folded into the opening balance), so
  cash movements reconcile opening to closing. A void or expense void therefore reverses money on its own date. It
  posts nothing. See [api-reference.md](api-reference.md#operational-reports-roadmap-sub-project-5).
```

- [ ] **Step 6: `docs/ai/workflow-and-gotchas.md`**

Replace the known-issue bullet

```markdown
- **Known issue: `toISOString()` dates.** Older screens still derive "today" with `new Date().toISOString()`
  (sliced to a date or month), which yields the previous day between 00:00 and 07:00 WIB:
  `GoodsReceiptModal`, `PosScreen` (parked order numbers), `ThermalReceiptScreen`, `inventoryService`,
  `ExecutiveDashboardScreen`, `StockMonthlyLedgerView` / `stockMonthlyLedgerService`, the export registry
  (`src/shared/export/registry.ts`), and the default payment date in `PayDebtModal`.
  Switch them to `localDate()` when touching those files.
```

with

```markdown
- **`toISOString()` dates.** Business dates never come from `toISOString()` (UTC: the previous day between 00:00
  and 07:00 WIB). `src/services/__tests__/localDateUsage.test.ts` fails if any source file slices it into a date or
  month; real instants (`created_at`, QRIS `settlement_time`, export `generatedAt`) may stay ISO.
```

In the spec/plan status table add a last row:

```markdown
| 09-30 | operational reports & dashboard (roadmap SP5): daily recap, daily cash report, per-cashier recap, dashboard from server, `localDate()` sweep | done |
```

If the "Stages so far" paragraph still lists `dashboard/daily reports` among the remaining client-only areas, remove that item. Update the line `As of 2026-09-30, the frontend passes: …` with the file/test counts printed by the last `npm test` run.

- [ ] **Step 7: Roadmap and handoff**

In `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` replace

```markdown
## Sub-project 5 — Operational reports & dashboard
```

with

```markdown
## Sub-project 5 — Operational reports & dashboard  → spec `2026-09-30-operational-reports-design.md` (done)
```

In `docs/superpowers/plans/2026-09-30-accounting-handoff.md`, in the section 3 table, replace the start of row 5

```markdown
| 5 | Operational reports & dashboard |
```

with

```markdown
| 5 | Operational reports & dashboard (**done**, `2026-09-30-operational-reports.md`) |
```

and in section 5 replace

```markdown
- Older screens still use `toISOString()` for default dates (PayDebtModal, inventoryService, dashboard, export
  registry) — wrong day before 07:00 WIB.
- Dashboard expense total includes VOID and all months (sub-project 5).
```

with

```markdown
- ~~Older screens still use `toISOString()` for default dates~~ — fixed by sub-project 5 (guard test
  `localDateUsage.test.ts`).
- ~~Dashboard expense total includes VOID and all months~~ — fixed by sub-project 5 (dashboard reads
  `/reports/daily-recap`).
```

- [ ] **Step 8: Check the docs**

Run:

```bash
grep -nE "Known issue: \`toISOString|Dashboard expense total includes VOID" AGENTS.md backend/AGENTS.md docs/ai/*.md docs/superpowers/plans/2026-09-30-accounting-handoff.md
git status --short
```

Expected: the grep prints nothing (or only the struck-through handoff lines); `git status --short` lists exactly the eight doc files of this task as modified (plus the user's `docs/flowchart*` changes, which stay unstaged). No code gate: this task changes no code.

- [ ] **Step 9: Commit**

```bash
git add AGENTS.md \
        backend/AGENTS.md \
        docs/ai/api-reference.md \
        docs/ai/architecture.md \
        docs/ai/domain-accounting.md \
        docs/ai/workflow-and-gotchas.md \
        docs/superpowers/specs/2026-09-29-accounting-roadmap.md \
        docs/superpowers/plans/2026-09-30-accounting-handoff.md
git commit -m "$(cat <<'EOF'
docs(reports): describe the daily reports and server dashboard

Agent docs list the daily-recap and daily-cash endpoints, the new
screen and permission, the journal-based reconciliation rules, and the
toISOString guard; the roadmap and handoff mark sub-project 5 done.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 10 (controller, manual): browser checklist**

With `npm run dev:all`, as OWNER: Dashboard "Omzet Hari Ini" equals today's Laba Rugi net revenue (Laporan Keuangan, range = today); "Beban Operasional" equals this month's operating expenses; "Valuasi Stok FIFO" equals Buku FIFO's valuation banner; voiding a nota lowers today's figure and the payment mix; before 07:00 the dates are today's. Laporan Harian → Kas Harian: 1-1000 closing equals Buku Besar 1-1000 balance for that date; cashier shifts from SP2 appear; export PDF/XLSX opens. As KASIR (via Riwayat Struk → "Laporan Harian"): only own notas and sessions, no Rekap Harian tab, no ledger sections. As GUDANG: no "Laporan Harian" tab.
