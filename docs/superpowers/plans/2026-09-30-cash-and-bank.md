# Cash & Bank (Roadmap Sub-project 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cashier shifts with opening float, counted cash, expected-vs-counted variance (reason required) and OWNER approval that journals the variance to 6-1010; owner cash movements (cash→bank deposit, Prive 3-3000, capital 3-1000); the per-browser `ob3_cash_drawer` counter replaced by the 1-1000 ledger balance.

**Architecture:** The drawer is account 1-1000. A shift is a window of journal ids; expected cash = opening float + Σ(debit − credit) on 1-1000 inside the window (so only TUNAI and other drawer movements count). Closing stores the count and waits in `PENDING_APPROVAL`; approval posts `CASH_SESSION_VARIANCE` for counted − book so the ledger equals the drawer. Cash movements are single journals numbered `KAS-YYYYMM-####`. Backend first (B1 schema/permissions, B2 shifts + checkout guard, B3 movements + Prive in equity), then frontend (F1 permissions + API client, F2 POS shift control + counter removal, F3 Kas & Bank tab, F4 Prive in statements), docs last (D1).

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-cash-and-bank-design.md`.

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/domain-pos.md` and the spec before starting.
- **This plan runs after SP6 (payment hardening).** Edit anchors below were written against HEAD `8df80ca`. SP6 changes `backend/app/Services/Pos/CheckoutService.php`, `backend/routes/api.php` and docs first: before each edit, re-read the current file and re-anchor on the current text; keep SP6's changes. Never re-apply a "before" block blindly.
- **Never stage, modify or revert `docs/flowchart_local/` or `docs/flowchart/*`** (the user's uncommitted work). Run `git status --short` before each commit; only the task's files may be staged. Stage by explicit path; never `git add -A`, `git add .` or `git commit -a`.
- Execute tasks in order B1 → B2 → B3 → F1 → F2 → F3 → F4 → D1. Later tasks anchor on text produced by earlier ones (B3 on B2's routes block, F3 on F2's `App.tsx` lines).
- Commits go directly on `main`: Conventional Commits with a scope, English, lowercase imperative subject, a short body explaining why, and the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- All user-facing text (UI, validation and error messages) is Indonesian.
- Journals are only written through `AccountingEngine::createEntry` (directly or via `JournalDraft`). Never insert `journal_entries`/`journal_items` by hand.
- Business-rule violations throw `App\Exceptions\PosRuleException` (422). API envelope `{ "success": true, "message"?: "...", "data": ... }`; create returns 201.
- New backend test classes use `Illuminate\Foundation\Testing\DatabaseTransactions`. Never name a test helper `post()` (collides with Laravel's `TestCase::post()`).
- Every new protected endpoint has a 403 test for a role without the key.
- After adding a migration, migrate the testing DB **and** (the migration is additive) the dev DB:
  Git Bash `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force`;
  PowerShell `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force; Remove-Item Env:DB_DATABASE; php artisan migrate --force`.
- Gates: backend tasks end with `cd backend && php artisan config:clear && php artisan test` passing (`composer test` is broken locally: the bundled composer.phar is too old). Frontend tasks end with `npm run lint && npm test` passing (repo root). `tsc` does not flag unused imports.
- Frontend business dates use `localDate()` from `src/services/accountingPeriod.ts`, never `toISOString()`.
- Account codes, reference types and permission keys are fixed by `.superpowers/sdd/roadmap-allocation.md`: 3-3000 Prive Pemilik (EQUITY, DEBIT), 6-1010 Selisih Kas Kasir (Lebih/Kurang) (EXPENSE, DEBIT); `CASH_SESSION_VARIANCE`, `CASH_DEPOSIT`, `OWNER_DRAWING`, `CAPITAL_INJECTION`; `cash_session` (KASIR true), `cash_session_approve`, `cash_movement` (KASIR/GUDANG false). Migration prefix `2026_10_02_`.
- Commands use Git Bash syntax from the repo root `C:\laragon\www\Project_SkripsiOB` unless a `cd` is shown. Laragon MySQL must be running.

## File Map

Backend (create):
- `backend/database/migrations/2026_10_02_000001_create_cash_sessions_and_cash_accounts.php` — table, accounts 3-3000/6-1010, permission rows.
- `backend/app/Models/CashSession.php` — shift row, `openingDifference()`, `adjustment()`, `toApiArray()`.
- `backend/app/Services/Accounting/CashSessionService.php` — open/close/approve, expected-cash summary, `requireOpen()`.
- `backend/app/Services/Accounting/CashMovementService.php` — deposit / Prive / capital journals.
- `backend/app/Http/Controllers/Api/v1/CashSessionController.php`, `backend/app/Http/Controllers/Api/v1/CashMovementController.php`.
- `backend/tests/Feature/CashSessionTest.php`, `backend/tests/Feature/CashMovementTest.php`.

Backend (modify): `backend/database/seeders/AccountCoaSeeder.php`, `backend/app/Support/Permissions.php`, `backend/routes/api.php`, `backend/app/Services/Pos/CheckoutService.php`, `backend/app/Services/Accounting/FinancialReportService.php`, `backend/tests/Concerns/CreatesPosFixtures.php`, `backend/tests/Unit/UserPermissionTest.php`.

Frontend (create): `src/services/api/cashApi.ts`, `src/services/__tests__/cashApi.test.ts`, `src/modules/pos/components/CashShiftControl.tsx`, `src/modules/accounting/components/CashBankTab.tsx`.

Frontend (modify): `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/services/api/index.ts`, `src/services/__tests__/authNavigationService.test.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/App.tsx`, `src/modules/pos/PosScreen.tsx`, `src/modules/pos/components/index.ts`, `src/shared/components/HeaderNavbar.tsx`, `src/modules/expenses/components/ExpenseForm.tsx`, `src/shared/components/WireframeGuideModal.tsx`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/modules/accounting/components/index.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/modules/accounting/components/StatementParts.tsx`, `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`.

Docs (modify, Task D1): `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/domain-pos.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`.

Not touched: `src/modules/settings/SettingsScreen.tsx` (`initial_cash_drawer` store setting stays, unused; spec "Dropped"), `PayDebtModal.tsx`/`AccountsPayableTab.tsx` (they keep receiving a number: the ledger balance), `tests/e2e/**`.

---

# Part B — Backend

### Task B1: Cash accounts, `cash_sessions` table and permission keys

**Files:**
- Create: `backend/database/migrations/2026_10_02_000001_create_cash_sessions_and_cash_accounts.php`, `backend/tests/Feature/CashSessionTest.php`
- Modify: `backend/database/seeders/AccountCoaSeeder.php`, `backend/app/Support/Permissions.php`, `backend/tests/Unit/UserPermissionTest.php`

**Interfaces:**
- Produces: table `cash_sessions` (columns listed in the migration below); accounts `3-3000`, `6-1010`; permission keys `cash_session`, `cash_session_approve`, `cash_movement` in `Permissions::KEYS` (16 keys); KASIR default `cash_session`.
- Consumes: nothing.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/CashSessionTest.php` (Task B2 replaces this file with the full suite):

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Shift kasir: satu laci = akun 1-1000; selisih kas dijurnal ke 6-1010 saat pemilik menyetujui.
 */
class CashSessionTest extends TestCase
{
    use DatabaseTransactions;

    public function test_cash_accounts_and_permission_defaults_exist(): void
    {
        $this->assertDatabaseHas('accounts', ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT']);
        $this->assertDatabaseHas('accounts', ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT']);

        $kasir = $this->actingAsRole('KASIR');
        $this->assertTrue($kasir->hasPermission('cash_session'));
        $this->assertFalse($kasir->hasPermission('cash_session_approve'));
        $this->assertFalse($kasir->hasPermission('cash_movement'));

        $gudang = $this->actingAsRole('GUDANG');
        $this->assertFalse($gudang->hasPermission('cash_session'));

        $this->assertTrue($this->actingAsRole('OWNER')->hasPermission('cash_movement'));
    }
}
```

In `backend/tests/Unit/UserPermissionTest.php` replace:

```php
        $this->assertCount(13, $data['permissions']);
```

with:

```php
        $this->assertCount(16, $data['permissions']);
        $this->assertFalse($data['permissions']['cash_session']);
        $this->assertFalse($data['permissions']['cash_movement']);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter='CashSessionTest|UserPermissionTest'`
Expected: FAIL — account `3-3000` missing; permission map has 13 keys.

- [ ] **Step 3: Write the migration**

Create `backend/database/migrations/2026_10_02_000001_create_cash_sessions_and_cash_accounts.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Kas & bank (sub-proyek 2): tabel shift kasir (satu laci = akun 1-1000), akun Prive 3-3000 dan
 * Selisih Kas Kasir 6-1010, serta izin cash_session / cash_session_approve / cash_movement.
 * Aditif: akun dan izin hanya disisipkan bila belum ada.
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT'],
        ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
    ];

    /** Kasir membuka/menutup shift; persetujuan shift dan mutasi kas pemilik hanya Owner. */
    private const PERMISSIONS = [
        'cash_session' => ['KASIR' => true, 'GUDANG' => false],
        'cash_session_approve' => ['KASIR' => false, 'GUDANG' => false],
        'cash_movement' => ['KASIR' => false, 'GUDANG' => false],
    ];

    public function up(): void
    {
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->timestamp('opened_at');
            $table->decimal('opening_float', 15, 2);
            $table->decimal('book_opening', 15, 2);
            $table->string('opening_note', 255)->nullable();
            // Jendela shift: jurnal dengan id > from_entry_id dan <= to_entry_id.
            $table->unsignedBigInteger('from_entry_id')->default(0);
            $table->unsignedBigInteger('to_entry_id')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users');
            $table->decimal('expected_cash', 15, 2)->nullable();
            $table->decimal('counted_cash', 15, 2)->nullable();
            $table->decimal('variance', 15, 2)->nullable();
            $table->string('variance_reason', 255)->nullable();
            $table->string('status', 20)->default('OPEN')->index();
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('journal_entry_id')->nullable()->constrained('journal_entries');
            $table->unsignedInteger('branch_id')->default(3);
            $table->timestamps();
        });

        $existing = DB::table('accounts')->pluck('account_code')->all();
        foreach (self::ACCOUNTS as $account) {
            if (! in_array($account['account_code'], $existing, true)) {
                DB::table('accounts')->insert($account + ['is_active' => true, 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        foreach (self::PERMISSIONS as $key => $defaults) {
            foreach ($defaults as $role => $allowed) {
                $exists = DB::table('role_permissions')->where('role', $role)->where('permission_key', $key)->exists();
                if (! $exists) {
                    DB::table('role_permissions')->insert([
                        'role' => $role,
                        'permission_key' => $key,
                        'allowed' => $allowed,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_sessions');
        DB::table('role_permissions')->whereIn('permission_key', array_keys(self::PERMISSIONS))->delete();
        // Akun yang sudah dipakai jurnal tidak boleh dihapus; hanya hapus yang belum pernah dipakai.
        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->whereNotExists(fn ($q) => $q->select(DB::raw(1))->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
```

- [ ] **Step 4: Add the accounts to the COA seeder**

In `backend/database/seeders/AccountCoaSeeder.php` replace:

```php
            ['account_code' => '3-2000', 'account_name' => 'Laba Ditahan Cabang 3', 'account_type' => 'EQUITY', 'normal_balance' => 'CREDIT'],
```

with:

```php
            ['account_code' => '3-2000', 'account_name' => 'Laba Ditahan Cabang 3', 'account_type' => 'EQUITY', 'normal_balance' => 'CREDIT'],
            // Prive: ekuitas bersaldo normal debit (pengurang ekuitas), tidak ditutup saat tutup buku bulanan.
            ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT'],
```

and replace:

```php
            ['account_code' => '6-1009', 'account_name' => 'Beban MDR QRIS & EDC', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
```

with:

```php
            ['account_code' => '6-1009', 'account_name' => 'Beban MDR QRIS & EDC', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
            ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT'],
```

- [ ] **Step 5: Add the permission keys**

In `backend/app/Support/Permissions.php` replace:

```php
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];
```

with:

```php
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
        'cash_session', 'cash_session_approve', 'cash_movement',
    ];
```

and replace:

```php
        'KASIR' => ['pos', 'receipt'],
```

with:

```php
        'KASIR' => ['pos', 'receipt', 'cash_session'],
```

- [ ] **Step 6: Migrate both databases**

Run: `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force`
Expected: `2026_10_02_000001_create_cash_sessions_and_cash_accounts ... DONE` twice.

- [ ] **Step 7: Run the tests, then the gate**

Run: `cd backend && php artisan config:clear && php artisan test --filter='CashSessionTest|UserPermissionTest'`
Expected: PASS.
Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests pass (previous count + 1).

- [ ] **Step 8: Commit**

```bash
git add backend/database/migrations/2026_10_02_000001_create_cash_sessions_and_cash_accounts.php backend/database/seeders/AccountCoaSeeder.php backend/app/Support/Permissions.php backend/tests/Feature/CashSessionTest.php backend/tests/Unit/UserPermissionTest.php
git commit -m "feat(accounting): add cash shift table, prive and cash variance accounts

Roadmap sub-project 2 needs a server-side cashier shift, a Prive account
(3-3000) and a cash over/short account (6-1010), plus the cash_session,
cash_session_approve and cash_movement permission keys.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B2: Cashier shift open/close/approve and the cash checkout guard

**Files:**
- Create: `backend/app/Models/CashSession.php`, `backend/app/Services/Accounting/CashSessionService.php`, `backend/app/Http/Controllers/Api/v1/CashSessionController.php`
- Modify: `backend/routes/api.php`, `backend/app/Services/Pos/CheckoutService.php`, `backend/tests/Concerns/CreatesPosFixtures.php`, `backend/tests/Feature/CashSessionTest.php` (full replacement)

**Interfaces:**
- Consumes: B1 table/accounts/keys.
- Produces (SP3/SP5 rely on these):
  - `App\Models\CashSession` constants `OPEN = 'OPEN'`, `PENDING = 'PENDING_APPROVAL'`, `CLOSED = 'CLOSED'`; `openingDifference(): float`; `adjustment(): ?float`; `toApiArray(): array`.
  - `App\Services\Accounting\CashSessionService`: `const CASH = '1-1000'`, `const VARIANCE_ACCOUNT = '6-1010'`, `const REFERENCE_TYPE = 'CASH_SESSION_VARIANCE'`, `const LINE_LABELS` (array<string reference_type, string label>); static `requireOpen(): CashSession` (422 when none), `current(): ?CashSession`, `ledgerBalance(): float`, `bookBalance(): float`, `summary(CashSession): array{lines: list<array{reference_type: string, label: string, amount: float, count: int}>, cash_in: float, cash_out: float, expected_cash: float}`; instance `open(User, float, ?string): CashSession`, `close(int, User, float, ?string): CashSession`, `approve(int, User): array{session: CashSession, journal: ?JournalEntry}`.
  - API: `GET /api/v1/cash-sessions/current` → `data: {session: CashSessionArray|null, book_balance: float}`; `POST /cash-sessions/open {opening_float, opening_note?}` → 201 `data: CashSessionArray`; `POST /cash-sessions/{id}/close {counted_cash, variance_reason?}` → `data: CashSessionArray`; `GET /cash-sessions` → `data: CashSessionArray[]` (pending first, 30 newest); `POST /cash-sessions/{id}/approve` → `data: {session, journals: ApiJournal[]}`.
  - `CashSessionArray` keys: `id, status, user_id, user_name, opened_at, opening_float, book_opening, opening_difference, opening_note, lines, cash_in, cash_out, expected_cash, closed_at, closed_by_name, counted_cash, variance, variance_reason, adjustment, approved_by_name, approved_at, journal_entry_number`.
  - `POST /pos/checkout` with any `TUNAI` payment and no open shift → 422 "Shift kasir belum dibuka. …".
  - Test helper `CreatesPosFixtures::ensureCashSession(): CashSession`; `checkout()` calls it when a TUNAI payment is sent.

- [ ] **Step 1: Write the failing tests**

Replace the whole content of `backend/tests/Feature/CashSessionTest.php` with:

```php
<?php

namespace Tests\Feature;

use App\Models\ExpenseCategory;
use App\Models\RolePermission;
use App\Services\Accounting\CashSessionService;
use App\Services\Accounting\ExpenseService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Shift kasir: satu laci = akun 1-1000; selisih kas dijurnal ke 6-1010 saat pemilik menyetujui.
 */
class CashSessionTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    /** DB test berisi sisa data test lain: pastikan saldo buku laci positif agar hitungan kas tidak negatif. */
    private function topUpDrawer(): void
    {
        $gap = round(2000000 - CashSessionService::bookBalance(), 2);
        if ($gap > 0) {
            (new JournalDraft())->debit('1-1000', $gap, 'uji')->credit('3-1000', $gap, 'uji')
                ->post(app(AccountingEngine::class), 'TEST', 'CS-'.uniqid(), 'Uji saldo laci');
        }
    }

    /** Buka shift dengan kas awal = saldo buku (+ selisih awal opsional). */
    private function openShift(float $extra = 0, ?string $note = null): array
    {
        $this->topUpDrawer();
        $book = (float) $this->getJson('/api/v1/cash-sessions/current')->assertOk()->json('data.book_balance');

        return $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => $book + $extra, 'opening_note' => $note])
            ->assertCreated()
            ->json('data');
    }

    private function closeShift(int $id, float $counted, ?string $reason = null)
    {
        return $this->postJson("/api/v1/cash-sessions/{$id}/close", ['counted_cash' => $counted, 'variance_reason' => $reason]);
    }

    private function expense(float $amount, string $method = 'TUNAI'): void
    {
        app(ExpenseService::class)->create([
            'expense_date' => now()->toDateString(),
            'category_id' => ExpenseCategory::firstOrFail()->id,
            'amount' => $amount,
            'payment_method' => $method,
            'recipient_name' => 'Warung Sebelah',
            'description' => 'Uji biaya shift',
        ], null, $this->actingAsRole('OWNER'));
    }

    public function test_cash_accounts_and_permission_defaults_exist(): void
    {
        $this->assertDatabaseHas('accounts', ['account_code' => '3-3000', 'account_name' => 'Prive Pemilik', 'account_type' => 'EQUITY', 'normal_balance' => 'DEBIT']);
        $this->assertDatabaseHas('accounts', ['account_code' => '6-1010', 'account_name' => 'Selisih Kas Kasir (Lebih/Kurang)', 'account_type' => 'EXPENSE', 'normal_balance' => 'DEBIT']);

        $kasir = $this->actingAsRole('KASIR');
        $this->assertTrue($kasir->hasPermission('cash_session'));
        $this->assertFalse($kasir->hasPermission('cash_session_approve'));
        $this->assertFalse($kasir->hasPermission('cash_movement'));

        $gudang = $this->actingAsRole('GUDANG');
        $this->assertFalse($gudang->hasPermission('cash_session'));

        $this->assertTrue($this->actingAsRole('OWNER')->hasPermission('cash_movement'));
    }

    public function test_cash_checkout_is_refused_without_an_open_shift(): void
    {
        $product = $this->makeProduct();

        $this->postJson('/api/v1/pos/checkout', [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonPath('message', fn (string $m) => str_contains($m, 'Shift kasir belum dibuka'));
        $this->assertEquals(10, $product->fresh()->product_quantity);

        // Penjualan non-tunai tidak menyentuh laci, jadi tidak butuh shift.
        $this->postJson('/api/v1/pos/checkout', [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TRANSFER', 'amount' => 1000000]],
        ])->assertCreated();
    }

    public function test_opening_note_is_required_when_the_float_differs_and_only_one_shift_is_open(): void
    {
        $this->topUpDrawer();
        $book = CashSessionService::bookBalance();

        $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => $book + 5000])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'keterangan selisih kas awal'));

        $session = $this->openShift(5000, 'Tambahan uang receh dari pemilik');
        $this->assertSame('OPEN', $session['status']);
        $this->assertEquals($book, $session['book_opening']);
        $this->assertEquals(5000, $session['opening_difference']);

        $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => $book, 'opening_note' => 'shift kedua'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'Masih ada shift'));
    }

    public function test_expected_cash_counts_only_drawer_movements_inside_the_shift(): void
    {
        $this->expense(20000); // sebelum shift: sudah ada di saldo buku, bukan mutasi shift
        $session = $this->openShift();
        $product = $this->makeProduct();

        $this->checkout(['items' => [$this->productLine($product)], 'payments' => [['method' => 'TUNAI', 'amount' => 1000000, 'tendered' => 1200000]]])->assertCreated();
        $this->checkout(['items' => [$this->productLine($product)], 'payments' => [['method' => 'TRANSFER', 'amount' => 1000000]]])->assertCreated();
        $this->expense(100000);
        $this->expense(50000, 'TRANSFER');

        $current = $this->getJson('/api/v1/cash-sessions/current')->assertOk()->json('data.session');
        $lines = collect($current['lines'])->keyBy('reference_type');

        $this->assertEquals(1000000, $lines['POS_SALE']['amount']);
        $this->assertSame(1, $lines['POS_SALE']['count']);
        $this->assertSame('Penjualan tunai', $lines['POS_SALE']['label']);
        $this->assertEquals(-100000, $lines['EXPENSE']['amount']);
        $this->assertSame(1, $lines['EXPENSE']['count']);
        $this->assertFalse($lines->has('TEST'));
        $this->assertEquals(1000000, $current['cash_in']);
        $this->assertEquals(100000, $current['cash_out']);
        $this->assertEquals($session['opening_float'] + 900000, $current['expected_cash']);
    }

    public function test_close_requires_a_reason_for_a_variance_and_waits_for_approval(): void
    {
        $session = $this->openShift();
        $this->expense(30000);
        $expected = $session['opening_float'] - 30000;

        $this->closeShift($session['id'], $expected - 10000)
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'Alasan selisih wajib diisi'));

        $closed = $this->closeShift($session['id'], $expected - 10000, 'Uang kembalian kurang')->assertOk()->json('data');
        $this->assertSame('PENDING_APPROVAL', $closed['status']);
        $this->assertEquals($expected, $closed['expected_cash']);
        $this->assertEquals(-10000, $closed['variance']);
        $this->assertEquals(-10000, $closed['adjustment']);
        $this->assertNull($closed['journal_entry_number']);
        $this->assertNull($this->getJson('/api/v1/cash-sessions/current')->json('data.session'));

        $this->closeShift($session['id'], $expected, 'lagi')->assertStatus(422);
    }

    public function test_approval_journals_a_shortage_and_the_ledger_equals_the_counted_cash(): void
    {
        $session = $this->openShift();
        $counted = $session['opening_float'] - 25000;
        $this->closeShift($session['id'], $counted, 'Salah beri kembalian')->assertOk();

        $res = $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk()->json('data');

        $this->assertSame('CLOSED', $res['session']['status']);
        $this->assertCount(1, $res['journals']);
        $journal = $res['journals'][0];
        $this->assertSame('CASH_SESSION_VARIANCE', $journal['reference_type']);
        $this->assertSame('SHIFT-'.$session['id'], $journal['reference_id']);
        $lines = collect($journal['lines'])->keyBy('account_code');
        $this->assertEquals(25000, $lines['6-1010']['debit']);
        $this->assertEquals(25000, $lines['1-1000']['credit']);
        $this->assertSame($journal['entry_number'], $res['session']['journal_entry_number']);
        $this->assertEqualsWithDelta($counted, CashSessionService::ledgerBalance(), 0.001);

        $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertStatus(422);
    }

    public function test_overage_and_opening_difference_are_credited_to_6_1010_together(): void
    {
        $session = $this->openShift(5000, 'Tambahan uang receh');
        $counted = $session['opening_float'] + 2000;
        $this->closeShift($session['id'], $counted, 'Pelanggan tidak ambil kembalian')->assertOk();

        $journal = $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk()->json('data.journals.0');

        $lines = collect($journal['lines'])->keyBy('account_code');
        $this->assertEquals(7000, $lines['1-1000']['debit']);
        $this->assertEquals(7000, $lines['6-1010']['credit']);
        $this->assertEqualsWithDelta($counted, CashSessionService::ledgerBalance(), 0.001);
    }

    public function test_zero_adjustment_is_approved_without_a_journal(): void
    {
        $session = $this->openShift();
        $this->closeShift($session['id'], $session['opening_float'])->assertOk();

        $res = $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk()->json('data');

        $this->assertSame([], $res['journals']);
        $this->assertSame('CLOSED', $res['session']['status']);
        $this->assertNull($res['session']['journal_entry_number']);
    }

    public function test_a_pending_shift_difference_is_part_of_the_next_book_balance(): void
    {
        $first = $this->openShift();
        $this->closeShift($first['id'], $first['opening_float'] - 15000, 'Kurang')->assertOk();

        $this->assertEqualsWithDelta($first['opening_float'] - 15000, CashSessionService::bookBalance(), 0.001);
        $this->assertEqualsWithDelta(
            $first['opening_float'] - 15000,
            (float) $this->getJson('/api/v1/cash-sessions/current')->json('data.book_balance'),
            0.001
        );
    }

    public function test_owner_list_shows_pending_shifts_first(): void
    {
        $session = $this->openShift();
        $this->closeShift($session['id'], $session['opening_float'])->assertOk();

        $this->getJson('/api/v1/cash-sessions')
            ->assertOk()
            ->assertJsonPath('data.0.id', $session['id'])
            ->assertJsonPath('data.0.status', 'PENDING_APPROVAL');
    }

    public function test_roles_without_the_keys_are_forbidden(): void
    {
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/cash-sessions/current')->assertForbidden();
        $this->postJson('/api/v1/cash-sessions/open', ['opening_float' => 0])->assertForbidden();
        $this->postJson('/api/v1/cash-sessions/1/close', ['counted_cash' => 0])->assertForbidden();

        $this->actingAsRole('KASIR');
        $this->getJson('/api/v1/cash-sessions/current')->assertOk();
        $this->getJson('/api/v1/accounting/cash-balances')->assertOk();
        $this->getJson('/api/v1/cash-sessions')->assertForbidden();
        $this->postJson('/api/v1/cash-sessions/1/approve')->assertForbidden();
    }

    public function test_a_non_owner_approver_cannot_approve_their_own_shift(): void
    {
        RolePermission::where(['role' => 'KASIR', 'permission_key' => 'cash_session_approve'])->update(['allowed' => true]);
        $this->actingAsRole('KASIR');
        $session = $this->openShift();
        $this->closeShift($session['id'], $session['opening_float'])->assertOk();

        $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")
            ->assertStatus(422)
            ->assertJsonPath('message', fn (string $m) => str_contains($m, 'harus disetujui pemilik'));

        $this->actingAsRole('OWNER');
        $this->postJson("/api/v1/cash-sessions/{$session['id']}/approve")->assertOk();
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=CashSessionTest`
Expected: FAIL — class `App\Services\Accounting\CashSessionService` not found / routes 404.

- [ ] **Step 3: Create the model**

Create `backend/app/Models/CashSession.php`:

```php
<?php

namespace App\Models;

use App\Services\Accounting\CashSessionService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Shift kasir untuk satu laci (akun 1-1000). Jendela shift = jurnal dengan id di (from_entry_id, to_entry_id].
 */
class CashSession extends Model
{
    public const OPEN = 'OPEN';

    public const PENDING = 'PENDING_APPROVAL';

    public const CLOSED = 'CLOSED';

    protected $fillable = [
        'user_id',
        'opened_at',
        'opening_float',
        'book_opening',
        'opening_note',
        'from_entry_id',
        'to_entry_id',
        'closed_at',
        'closed_by',
        'expected_cash',
        'counted_cash',
        'variance',
        'variance_reason',
        'status',
        'approved_by',
        'approved_at',
        'journal_entry_id',
        'branch_id',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
        'approved_at' => 'datetime',
        'opening_float' => 'decimal:2',
        'book_opening' => 'decimal:2',
        'expected_cash' => 'decimal:2',
        'counted_cash' => 'decimal:2',
        'variance' => 'decimal:2',
        'from_entry_id' => 'integer',
        'to_entry_id' => 'integer',
        'branch_id' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function closer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function journalEntry(): BelongsTo
    {
        return $this->belongsTo(JournalEntry::class);
    }

    /** Kas awal hasil hitung dikurangi saldo buku laci saat shift dibuka. */
    public function openingDifference(): float
    {
        return round((float) $this->opening_float - (float) $this->book_opening, 2);
    }

    /**
     * Nominal jurnal selisih saat disetujui = kas dihitung − (saldo buku awal + mutasi shift)
     * = selisih akhir + selisih kas awal. Null selama shift belum ditutup.
     */
    public function adjustment(): ?float
    {
        return $this->variance === null ? null : round((float) $this->variance + $this->openingDifference(), 2);
    }

    public function toApiArray(): array
    {
        $this->loadMissing(['user', 'closer', 'approver', 'journalEntry']);
        $summary = CashSessionService::summary($this);

        return [
            'id' => $this->id,
            'status' => $this->status,
            'user_id' => $this->user_id,
            'user_name' => $this->user?->name,
            'opened_at' => $this->opened_at?->toIso8601String(),
            'opening_float' => (float) $this->opening_float,
            'book_opening' => (float) $this->book_opening,
            'opening_difference' => $this->openingDifference(),
            'opening_note' => $this->opening_note,
            'lines' => $summary['lines'],
            'cash_in' => $summary['cash_in'],
            'cash_out' => $summary['cash_out'],
            'expected_cash' => $this->expected_cash !== null ? (float) $this->expected_cash : $summary['expected_cash'],
            'closed_at' => $this->closed_at?->toIso8601String(),
            'closed_by_name' => $this->closer?->name,
            'counted_cash' => $this->counted_cash !== null ? (float) $this->counted_cash : null,
            'variance' => $this->variance !== null ? (float) $this->variance : null,
            'variance_reason' => $this->variance_reason,
            'adjustment' => $this->adjustment(),
            'approved_by_name' => $this->approver?->name,
            'approved_at' => $this->approved_at?->toIso8601String(),
            'journal_entry_number' => $this->journalEntry?->entry_number,
        ];
    }
}
```

- [ ] **Step 4: Create the service**

Create `backend/app/Services/Accounting/CashSessionService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Shift kasir untuk satu laci. Laci = akun 1-1000, jadi hanya uang tunai yang masuk hitungan.
 * Kas seharusnya = kas awal + Σ mutasi 1-1000 yang dibukukan selama shift (penjualan tunai, biaya dari laci,
 * void, pembelian tunai, setor bank, prive, modal, retur tunai, ...). Selisih wajib diberi alasan; pemilik
 * menyetujui dan saat itu selisihnya dijurnal ke 6-1010 sehingga saldo 1-1000 sama dengan kas fisik.
 */
class CashSessionService
{
    public const CASH = '1-1000';

    public const VARIANCE_ACCOUNT = '6-1010';

    public const REFERENCE_TYPE = 'CASH_SESSION_VARIANCE';

    /**
     * Label baris ringkasan per jenis jurnal. Jenis lain tetap dihitung dan tampil dengan kodenya;
     * sub-proyek berikutnya menambahkan labelnya di sini (mis. SALES_RETURN).
     */
    public const LINE_LABELS = [
        'POS_SALE' => 'Penjualan tunai',
        'POS_SALE_VOID' => 'Void nota tunai',
        'EXPENSE' => 'Biaya dibayar dari laci',
        'VOID_EXPENSE' => 'Pembatalan biaya tunai',
        'PURCHASE' => 'Pembelian barang tunai',
        'DEBT_PAYMENT' => 'Bayar hutang supplier dari laci',
        'CASH_DEPOSIT' => 'Setor kas ke bank',
        'OWNER_DRAWING' => 'Prive pemilik',
        'CAPITAL_INJECTION' => 'Setoran modal',
        'MANUAL_ADJUSTMENT' => 'Jurnal penyesuaian',
        'MANUAL_REVERSAL' => 'Pembalik jurnal penyesuaian',
        'ACCOUNT_OPENING' => 'Saldo awal kas',
    ];

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /** Shift yang sedang dibuka; 422 bila belum ada. Dipakai checkout tunai (dan retur tunai). */
    public static function requireOpen(): CashSession
    {
        $session = self::current();
        if ($session === null) {
            throw new PosRuleException('Shift kasir belum dibuka. Buka shift dan hitung kas awal laci sebelum menerima atau mengeluarkan uang tunai.');
        }

        return $session;
    }

    public static function current(): ?CashSession
    {
        return CashSession::where('status', CashSession::OPEN)->first();
    }

    /** Saldo buku akun 1-1000 dari seluruh jurnal POSTED. */
    public static function ledgerBalance(): float
    {
        return round((float) self::cashItems()->sum(DB::raw('journal_items.debit - journal_items.credit')), 2);
    }

    /** Isi laci menurut buku: saldo 1-1000 + selisih shift yang belum disetujui (belum dijurnal). */
    public static function bookBalance(): float
    {
        $pending = CashSession::where('status', CashSession::PENDING)->get()
            ->sum(fn (CashSession $s) => (float) $s->adjustment());

        return round(self::ledgerBalance() + $pending, 2);
    }

    /**
     * Rincian kas seharusnya per jenis jurnal dalam jendela shift. Publik agar retur tunai (SP3) dan laporan
     * harian (SP5) memakai rumus yang sama.
     *
     * @return array{lines: list<array{reference_type: string, label: string, amount: float, count: int}>, cash_in: float, cash_out: float, expected_cash: float}
     */
    public static function summary(CashSession $session): array
    {
        $rows = self::cashItems()
            ->where('e.reference_type', '!=', self::REFERENCE_TYPE)
            ->where('e.id', '>', $session->from_entry_id)
            ->when($session->to_entry_id !== null, fn (Builder $q) => $q->where('e.id', '<=', $session->to_entry_id))
            ->groupBy('e.reference_type')
            ->orderBy('e.reference_type')
            ->selectRaw('e.reference_type, SUM(journal_items.debit - journal_items.credit) AS amount, COUNT(DISTINCT e.id) AS entries')
            ->get();

        $lines = $rows->map(fn ($row) => [
            'reference_type' => (string) $row->reference_type,
            'label' => self::LINE_LABELS[$row->reference_type] ?? (string) $row->reference_type,
            'amount' => round((float) $row->amount, 2),
            'count' => (int) $row->entries,
        ])->values()->all();

        $amounts = array_column($lines, 'amount');
        $in = round(array_sum(array_filter($amounts, fn (float $a) => $a > 0)), 2);
        $out = round(-array_sum(array_filter($amounts, fn (float $a) => $a < 0)), 2);

        return [
            'lines' => $lines,
            'cash_in' => $in,
            'cash_out' => $out,
            'expected_cash' => round((float) $session->opening_float + $in - $out, 2),
        ];
    }

    public function open(User $user, float $openingFloat, ?string $note): CashSession
    {
        return DB::transaction(function () use ($user, $openingFloat, $note) {
            self::serialize();
            if (self::current() !== null) {
                throw new PosRuleException('Masih ada shift kasir yang terbuka. Tutup shift itu sebelum membuka shift baru.');
            }

            $book = self::bookBalance();
            $float = round($openingFloat, 2);
            $note = trim((string) $note);
            if (abs($float - $book) >= 0.005 && $note === '') {
                throw new PosRuleException('Kas awal berbeda dari saldo buku laci ('.self::rupiah($book).'). Isi keterangan selisih kas awal.');
            }

            return CashSession::create([
                'user_id' => $user->id,
                'opened_at' => now(),
                'opening_float' => $float,
                'book_opening' => $book,
                'opening_note' => $note === '' ? null : $note,
                // ponytail: jendela shift memakai id jurnal; jurnal yang id-nya dibagikan sebelum tutup tetapi
                // commit sesudahnya tidak masuk shift mana pun (tetap ada di saldo buku shift berikutnya).
                'from_entry_id' => (int) JournalEntry::max('id'),
                'status' => CashSession::OPEN,
                'branch_id' => 3,
            ]);
        });
    }

    public function close(int $id, User $user, float $countedCash, ?string $reason): CashSession
    {
        return DB::transaction(function () use ($id, $user, $countedCash, $reason) {
            self::serialize();
            $session = CashSession::lockForUpdate()->findOrFail($id);
            if ($session->status !== CashSession::OPEN) {
                throw new PosRuleException('Shift ini sudah ditutup.');
            }

            $session->to_entry_id = (int) JournalEntry::max('id');
            $expected = self::summary($session)['expected_cash'];
            $counted = round($countedCash, 2);
            $variance = round($counted - $expected, 2);
            $reason = trim((string) $reason);
            if (abs($variance) >= 0.005 && $reason === '') {
                throw new PosRuleException('Kas fisik berbeda '.self::rupiah($variance).' dari kas seharusnya ('.self::rupiah($expected).'). Alasan selisih wajib diisi.');
            }

            $session->fill([
                'closed_at' => now(),
                'closed_by' => $user->id,
                'expected_cash' => $expected,
                'counted_cash' => $counted,
                'variance' => $variance,
                'variance_reason' => $reason === '' ? null : $reason,
                'status' => CashSession::PENDING,
            ])->save();

            return $session;
        });
    }

    /**
     * @return array{session: CashSession, journal: ?JournalEntry}
     */
    public function approve(int $id, User $approver): array
    {
        return DB::transaction(function () use ($id, $approver) {
            self::serialize();
            $session = CashSession::with('user')->lockForUpdate()->findOrFail($id);
            if ($session->status !== CashSession::PENDING) {
                throw new PosRuleException('Hanya shift yang menunggu persetujuan yang dapat disetujui.');
            }
            if ($approver->role !== 'OWNER' && (int) $session->user_id === (int) $approver->id) {
                throw new PosRuleException('Shift yang Anda buka sendiri harus disetujui pemilik.');
            }

            $amount = (float) $session->adjustment();
            $why = Str::limit($session->variance_reason ?? $session->opening_note ?? 'selisih kas', 180);
            $draft = new JournalDraft();
            if ($amount > 0) {
                $draft->debit(self::CASH, $amount, "Kas lebih shift #{$session->id}")
                    ->credit(self::VARIANCE_ACCOUNT, $amount, "Kas lebih: {$why}");
            } elseif ($amount < 0) {
                $draft->debit(self::VARIANCE_ACCOUNT, -$amount, "Kas kurang: {$why}")
                    ->credit(self::CASH, -$amount, "Kas kurang shift #{$session->id}");
            }

            // Dijurnal pada tanggal persetujuan: hari ini tidak pernah berada di periode yang sudah ditutup.
            $journal = $draft->isEmpty() ? null : $draft->post(
                $this->engine,
                self::REFERENCE_TYPE,
                'SHIFT-'.$session->id,
                "Selisih kas shift kasir #{$session->id} ({$session->user?->name})",
                now()->toDateString()
            );

            $session->update([
                'status' => CashSession::CLOSED,
                'approved_by' => $approver->id,
                'approved_at' => now(),
                'journal_entry_id' => $journal?->id,
            ]);

            return ['session' => $session, 'journal' => $journal];
        });
    }

    /** Baris jurnal POSTED pada akun kas laci. */
    private static function cashItems(): Builder
    {
        return JournalItem::query()
            ->join('journal_entries as e', 'e.id', '=', 'journal_items.journal_entry_id')
            ->join('accounts as a', 'a.id', '=', 'journal_items.account_id')
            ->where('a.account_code', self::CASH)
            ->where('e.status', 'POSTED');
    }

    /** Buka, tutup dan setujui shift berjalan satu per satu (satu laci). */
    private static function serialize(): void
    {
        Account::where('account_code', self::CASH)->lockForUpdate()->first();
    }

    private static function rupiah(float $amount): string
    {
        return 'Rp '.number_format($amount, 0, ',', '.');
    }
}
```

- [ ] **Step 5: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/CashSessionController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use App\Services\Accounting\CashSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CashSessionController extends Controller
{
    public function __construct(private readonly CashSessionService $sessions)
    {
    }

    /** Shift terbuka (dengan rincian kas seharusnya) dan saldo buku laci sebagai usulan kas awal. */
    public function current(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'session' => CashSessionService::current()?->toApiArray(),
                'book_balance' => CashSessionService::bookBalance(),
            ],
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate(['status' => 'nullable|in:OPEN,PENDING_APPROVAL,CLOSED']);

        // ponytail: 30 shift terbaru tanpa paging; tambah paging bila riwayat shift perlu ditelusuri.
        $rows = CashSession::with(['user', 'closer', 'approver', 'journalEntry'])
            ->when($data['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->orderByRaw("CASE status WHEN 'PENDING_APPROVAL' THEN 0 WHEN 'OPEN' THEN 1 ELSE 2 END")
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (CashSession $s) => $s->toApiArray())->values()]);
    }

    public function open(Request $request): JsonResponse
    {
        $data = $request->validate([
            'opening_float' => 'required|numeric|min:0|max:999999999999',
            'opening_note' => 'nullable|string|max:255',
        ]);

        $session = $this->sessions->open($request->user(), (float) $data['opening_float'], $data['opening_note'] ?? null);

        return response()->json([
            'success' => true,
            'message' => "Shift kasir #{$session->id} dibuka.",
            'data' => $session->toApiArray(),
        ], 201);
    }

    public function close(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'counted_cash' => 'required|numeric|min:0|max:999999999999',
            'variance_reason' => 'nullable|string|max:255',
        ]);

        $session = $this->sessions->close($id, $request->user(), (float) $data['counted_cash'], $data['variance_reason'] ?? null);

        return response()->json([
            'success' => true,
            'message' => "Shift #{$session->id} ditutup dan menunggu persetujuan pemilik.",
            'data' => $session->toApiArray(),
        ]);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $result = $this->sessions->approve($id, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Shift #{$result['session']->id} disetujui.",
            'data' => [
                'session' => $result['session']->toApiArray(),
                'journals' => $result['journal'] ? [$result['journal']->toApiArray()] : [],
            ],
        ]);
    }
}
```

- [ ] **Step 6: Register the routes and widen the cash-balances permission**

In `backend/routes/api.php` add the import after `use App\Http\Controllers\Api\v1\AuthController;`:

```php
use App\Http\Controllers\Api\v1\CashSessionController;
```

Insert after this line (re-anchor if SP6 changed the neighbourhood):

```php
        Route::post('pos/transactions/{id}/void', [PosController::class, 'void'])->middleware('permission:sale_void');
```

the block:

```php

        // Shift kasir (satu laci = akun 1-1000); selisih kas dijurnal saat pemilik menyetujui
        Route::get('cash-sessions/current', [CashSessionController::class, 'current'])->middleware('permission:cash_session,cash_session_approve');
        Route::middleware('permission:cash_session')->group(function () {
            Route::post('cash-sessions/open', [CashSessionController::class, 'open']);
            Route::post('cash-sessions/{id}/close', [CashSessionController::class, 'close'])->whereNumber('id');
        });
        Route::middleware('permission:cash_session_approve')->group(function () {
            Route::get('cash-sessions', [CashSessionController::class, 'index']);
            Route::post('cash-sessions/{id}/approve', [CashSessionController::class, 'approve'])->whereNumber('id');
        });
```

Replace:

```php
            Route::get('cash-balances', [AccountingReportController::class, 'cashBalances'])->middleware('permission:expenses,accounting_hub,financial_reports');
```

with:

```php
            Route::get('cash-balances', [AccountingReportController::class, 'cashBalances'])->middleware('permission:expenses,accounting_hub,financial_reports,cash_session');
```

- [ ] **Step 7: Guard cash checkout**

In `backend/app/Services/Pos/CheckoutService.php` add the import before `use App\Services\AccountingEngine;`:

```php
use App\Services\Accounting\CashSessionService;
```

Replace (at the top of `checkout()`; SP6 may have changed lines below it, keep them):

```php
        return DB::transaction(function () use ($data, $user) {
            $lines = CartLines::build($data['items']);
```

with:

```php
        return DB::transaction(function () use ($data, $user) {
            // Uang tunai hanya boleh masuk laci (akun 1-1000) selama shift kasir dibuka.
            if (collect($data['payments'] ?? [])->contains('method', 'TUNAI')) {
                CashSessionService::requireOpen();
            }
            $lines = CartLines::build($data['items']);
```

- [ ] **Step 8: Let POS test fixtures open a shift for cash sales**

In `backend/tests/Concerns/CreatesPosFixtures.php` replace:

```php
use App\Models\JournalEntry;
```

with:

```php
use App\Models\CashSession;
use App\Models\JournalEntry;
```

and replace:

```php
    protected function checkout(array $payload)
    {
        return $this->postJson('/api/v1/pos/checkout', $payload + ['customer_name' => 'Budi', 'vehicle_plate' => 'AA 1 BB']);
    }
```

with:

```php
    protected function checkout(array $payload)
    {
        if (collect($payload['payments'] ?? [])->contains('method', 'TUNAI')) {
            $this->ensureCashSession();
        }

        return $this->postJson('/api/v1/pos/checkout', $payload + ['customer_name' => 'Budi', 'vehicle_plate' => 'AA 1 BB']);
    }

    /** Checkout tunai butuh shift kasir terbuka; test yang tidak menguji shift memakai shift ini. */
    protected function ensureCashSession(): CashSession
    {
        return CashSession::where('status', CashSession::OPEN)->first() ?? CashSession::create([
            'user_id' => auth()->id(),
            'opened_at' => now(),
            'opening_float' => 0,
            'book_opening' => 0,
            'from_entry_id' => (int) JournalEntry::max('id'),
            'status' => CashSession::OPEN,
        ]);
    }
```

- [ ] **Step 9: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter='CashSessionTest|PosCheckoutTest|PosVoidTest'`
Expected: PASS.

If any other test (for example one added by SP6) posts a TUNAI checkout with `postJson('/api/v1/pos/checkout', …)` directly and now gets 422 "Shift kasir belum dibuka", add `use Tests\Concerns\CreatesPosFixtures;` if missing and call `$this->ensureCashSession();` before that request. If SP6 made a transfer provider mandatory, add the provider field SP6's own tests use to the two `TRANSFER` payments above.

- [ ] **Step 10: Run the gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests pass.

- [ ] **Step 11: Commit**

```bash
git add backend/app/Models/CashSession.php backend/app/Services/Accounting/CashSessionService.php backend/app/Http/Controllers/Api/v1/CashSessionController.php backend/routes/api.php backend/app/Services/Pos/CheckoutService.php backend/tests/Concerns/CreatesPosFixtures.php backend/tests/Feature/CashSessionTest.php
git commit -m "feat(accounting): add cashier shifts with owner-approved cash variance

The drawer was a per-browser counter. A shift now counts the opening float,
derives expected cash from the 1-1000 ledger inside the shift, requires a
reason for any difference and journals it to 6-1010 when the owner approves,
so the ledger equals the counted drawer. Cash checkout needs an open shift.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B3: Cash-to-bank deposit, Prive and capital injection; Prive in the equity statement

**Files:**
- Create: `backend/app/Services/Accounting/CashMovementService.php`, `backend/app/Http/Controllers/Api/v1/CashMovementController.php`, `backend/tests/Feature/CashMovementTest.php`
- Modify: `backend/routes/api.php`, `backend/app/Services/Accounting/FinancialReportService.php`

**Interfaces:**
- Consumes: B1 accounts 3-3000; B2 `CashSession`, `CashSessionService::summary()` and label `CASH_DEPOSIT => 'Setor kas ke bank'`; B2's routes block.
- Produces:
  - `App\Services\Accounting\CashMovementService::TYPES` = `['DEPOSIT' => 'CASH_DEPOSIT', 'DRAWING' => 'OWNER_DRAWING', 'CAPITAL' => 'CAPITAL_INJECTION']`; `create(array{type, date, amount, account_code?, description}): JournalEntry`.
  - `POST /api/v1/cash-movements {type: DEPOSIT|DRAWING|CAPITAL, date: Y-m-d ≤ today, amount ≥ 1, account_code?: 1-1000|1-1001 (required unless DEPOSIT), description}` → 201 `data: ApiJournal` (`reference_id` `KAS-YYYYMM-####`); `GET /api/v1/cash-movements` → `data: ApiJournal[]` (50 newest). Permission `cash_movement`.
  - `FinancialReportService::equityChanges()` returns an extra key `owner_drawings` (float ≥ 0 for normal use) and `difference = closing − opening − owner_contributions + owner_drawings − net_income`.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/Feature/CashMovementTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\CashSession;
use App\Models\JournalEntry;
use App\Services\Accounting\CashFlowReport;
use App\Services\Accounting\CashSessionService;
use App\Services\Accounting\FinancialReportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Mutasi kas pemilik: setor kas laci ke bank, prive (3-3000) dan setoran modal (3-1000).
 * Angka laporan dibandingkan sebelum/sesudah karena DB test berisi sisa data test lain.
 */
class CashMovementTest extends TestCase
{
    use DatabaseTransactions;

    private const FROM = '2021-06-01';

    private const TO = '2021-06-30';

    private function move(array $payload)
    {
        return $this->postJson('/api/v1/cash-movements', $payload + ['date' => '2021-06-10', 'description' => 'Uji mutasi kas']);
    }

    /** @return array<string, array{debit: float, credit: float}> */
    private function lines(array $journal): array
    {
        return collect($journal['lines'])->keyBy('account_code')->all();
    }

    private function cashFlow(): array
    {
        return app(CashFlowReport::class)->build(self::FROM, self::TO);
    }

    private function equity(): array
    {
        return app(FinancialReportService::class)->equityChanges(self::FROM, self::TO);
    }

    private function priveLine(): float
    {
        foreach (app(FinancialReportService::class)->balanceSheet(self::TO)['equity']['lines'] as $line) {
            if ($line['code'] === '3-3000') {
                return (float) $line['amount'];
            }
        }

        return 0.0;
    }

    public function test_deposit_moves_drawer_cash_to_the_bank_without_changing_total_cash(): void
    {
        $before = $this->cashFlow();

        $journal = $this->move(['type' => 'DEPOSIT', 'amount' => 300000])->assertCreated()->json('data');

        $this->assertSame('CASH_DEPOSIT', $journal['reference_type']);
        $this->assertStringStartsWith('KAS-202106-', $journal['reference_id']);
        $lines = $this->lines($journal);
        $this->assertEquals(300000, $lines['1-1001']['debit']);
        $this->assertEquals(300000, $lines['1-1000']['credit']);

        $after = $this->cashFlow();
        $this->assertEquals($before['net_change'], $after['net_change']);
        $this->assertEquals($before['operating']['net'], $after['operating']['net']);
        $this->assertEquals($before['financing']['net'], $after['financing']['net']);
        $this->assertEquals($before['ending_cash_drawer'] - 300000, $after['ending_cash_drawer']);
        $this->assertTrue($after['is_reconciled']);
    }

    public function test_owner_drawing_is_a_financing_outflow_and_a_prive_deduction_in_equity(): void
    {
        $cfBefore = $this->cashFlow();
        $eqBefore = $this->equity();
        $priveBefore = $this->priveLine();

        $journal = $this->move(['type' => 'DRAWING', 'account_code' => '1-1001', 'amount' => 200000])->assertCreated()->json('data');

        $this->assertSame('OWNER_DRAWING', $journal['reference_type']);
        $lines = $this->lines($journal);
        $this->assertEquals(200000, $lines['3-3000']['debit']);
        $this->assertEquals(200000, $lines['1-1001']['credit']);

        $this->assertEquals($cfBefore['financing']['equity'] - 200000, $this->cashFlow()['financing']['equity']);
        $eq = $this->equity();
        $this->assertEquals($eqBefore['owner_drawings'] + 200000, $eq['owner_drawings']);
        $this->assertEquals($eqBefore['owner_contributions'], $eq['owner_contributions']);
        $this->assertEquals(0, $eq['difference']);
        $this->assertEquals($priveBefore - 200000, $this->priveLine());
    }

    public function test_capital_injection_into_the_drawer_is_a_financing_inflow(): void
    {
        $cfBefore = $this->cashFlow();
        $eqBefore = $this->equity();

        $journal = $this->move(['type' => 'CAPITAL', 'account_code' => '1-1000', 'amount' => 500000])->assertCreated()->json('data');

        $this->assertSame('CAPITAL_INJECTION', $journal['reference_type']);
        $lines = $this->lines($journal);
        $this->assertEquals(500000, $lines['1-1000']['debit']);
        $this->assertEquals(500000, $lines['3-1000']['credit']);

        $this->assertEquals($cfBefore['financing']['equity'] + 500000, $this->cashFlow()['financing']['equity']);
        $eq = $this->equity();
        $this->assertEquals($eqBefore['owner_contributions'] + 500000, $eq['owner_contributions']);
        $this->assertEquals(0, $eq['difference']);
    }

    public function test_movement_input_is_validated(): void
    {
        $this->move(['type' => 'DRAWING', 'amount' => 1000])->assertStatus(422)->assertJsonValidationErrors('account_code');
        $this->move(['type' => 'LOAN', 'amount' => 1000])->assertStatus(422)->assertJsonValidationErrors('type');
        $this->move(['type' => 'DEPOSIT', 'amount' => 0])->assertStatus(422)->assertJsonValidationErrors('amount');
        $this->move(['type' => 'DEPOSIT', 'amount' => 1000, 'date' => now()->addDay()->toDateString()])
            ->assertStatus(422)->assertJsonValidationErrors('date');
    }

    public function test_a_drawer_movement_is_listed_and_counted_in_the_open_shift(): void
    {
        $session = CashSession::create([
            'user_id' => auth()->id(),
            'opened_at' => now(),
            'opening_float' => 0,
            'book_opening' => 0,
            'from_entry_id' => (int) JournalEntry::max('id'),
            'status' => CashSession::OPEN,
        ]);

        $this->move(['type' => 'DEPOSIT', 'amount' => 100000, 'date' => now()->toDateString()])->assertCreated();

        $lines = collect(CashSessionService::summary($session)['lines'])->keyBy('reference_type');
        $this->assertEquals(-100000, $lines['CASH_DEPOSIT']['amount']);
        $this->assertSame('Setor kas ke bank', $lines['CASH_DEPOSIT']['label']);

        $this->getJson('/api/v1/cash-movements')->assertOk()->assertJsonPath('data.0.reference_type', 'CASH_DEPOSIT');
    }

    public function test_only_the_cash_movement_key_can_move_cash(): void
    {
        foreach (['KASIR', 'GUDANG'] as $role) {
            $this->actingAsRole($role);
            $this->getJson('/api/v1/cash-movements')->assertForbidden();
            $this->move(['type' => 'DEPOSIT', 'amount' => 1000])->assertForbidden();
        }
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=CashMovementTest`
Expected: FAIL — `/api/v1/cash-movements` returns 404 and `owner_drawings` is undefined.

- [ ] **Step 3: Create the service**

Create `backend/app/Services/Accounting/CashMovementService.php`:

```php
<?php

namespace App\Services\Accounting;

use App\Models\JournalEntry;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Mutasi kas oleh pemilik, masing-masing satu jurnal bernomor KAS-YYYYMM-####:
 * setor kas laci ke bank (1-1000 → 1-1001), prive (Dr 3-3000) dan setoran modal (Cr 3-1000).
 * Koreksi lewat jurnal penyesuaian manual (akun-akun ini bukan akun kontrol).
 */
class CashMovementService
{
    /** Jenis mutasi → reference_type jurnal. */
    public const TYPES = [
        'DEPOSIT' => 'CASH_DEPOSIT',
        'DRAWING' => 'OWNER_DRAWING',
        'CAPITAL' => 'CAPITAL_INJECTION',
    ];

    public const CASH = '1-1000';

    public const BANK = '1-1001';

    public const DRAWINGS = '3-3000';

    public const CAPITAL = '3-1000';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array{type: string, date: string, amount: float|int|string, account_code?: ?string, description: string}  $data
     */
    public function create(array $data): JournalEntry
    {
        return DB::transaction(function () use ($data) {
            $amount = round((float) $data['amount'], 2);
            $account = $data['account_code'] ?? self::CASH;
            $draft = new JournalDraft();

            match ($data['type']) {
                'DEPOSIT' => $draft->debit(self::BANK, $amount, 'Setoran dari kas laci')->credit(self::CASH, $amount, 'Kas laci disetor ke bank'),
                'DRAWING' => $draft->debit(self::DRAWINGS, $amount, 'Prive pemilik')->credit($account, $amount, 'Diambil pemilik'),
                'CAPITAL' => $draft->debit($account, $amount, 'Setoran modal pemilik')->credit(self::CAPITAL, $amount, 'Tambahan modal disetor'),
            };

            $reference = DocumentNumber::next(JournalEntry::class, 'reference_id', 'KAS', $data['date']);

            return $draft->post($this->engine, self::TYPES[$data['type']], $reference, $data['description'], $data['date']);
        });
    }
}
```

- [ ] **Step 4: Create the controller**

Create `backend/app/Http/Controllers/Api/v1/CashMovementController.php`:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Services\Accounting\CashMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CashMovementController extends Controller
{
    public function index(): JsonResponse
    {
        // ponytail: 50 mutasi terbaru; riwayat lengkap ada di Jurnal Umum (filter "Kas & Modal").
        $rows = JournalEntry::with(['items.account', 'reversal', 'reversalOf', 'creator'])
            ->whereIn('reference_type', array_values(CashMovementService::TYPES))
            ->orderByDesc('entry_date')
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        return response()->json(['success' => true, 'data' => $rows->map(fn (JournalEntry $j) => $j->toApiArray())->values()]);
    }

    public function store(Request $request, CashMovementService $movements): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(CashMovementService::TYPES))],
            'date' => 'required|date_format:Y-m-d|before_or_equal:today',
            'amount' => 'required|numeric|min:1|max:999999999999',
            'account_code' => ['nullable', 'required_unless:type,DEPOSIT', Rule::in([CashMovementService::CASH, CashMovementService::BANK])],
            'description' => 'required|string|max:255',
        ], [
            'account_code.required_unless' => 'Pilih sumber atau tujuan dana: kas laci (1-1000) atau bank (1-1001).',
            'type.in' => 'Jenis mutasi kas tidak dikenal.',
        ]);

        $journal = $movements->create($data);

        return response()->json([
            'success' => true,
            'message' => "Mutasi kas {$journal->reference_id} dibukukan ({$journal->entry_number}).",
            'data' => $journal->toApiArray(),
        ], 201);
    }
}
```

- [ ] **Step 5: Register the routes**

In `backend/routes/api.php` add the import after `use App\Http\Controllers\Api\v1\AuthController;`:

```php
use App\Http\Controllers\Api\v1\CashMovementController;
```

Replace (the end of B2's block):

```php
        Route::middleware('permission:cash_session_approve')->group(function () {
            Route::get('cash-sessions', [CashSessionController::class, 'index']);
            Route::post('cash-sessions/{id}/approve', [CashSessionController::class, 'approve'])->whereNumber('id');
        });
```

with:

```php
        Route::middleware('permission:cash_session_approve')->group(function () {
            Route::get('cash-sessions', [CashSessionController::class, 'index']);
            Route::post('cash-sessions/{id}/approve', [CashSessionController::class, 'approve'])->whereNumber('id');
        });

        // Mutasi kas pemilik: setor bank, prive, setoran modal
        Route::middleware('permission:cash_movement')->group(function () {
            Route::get('cash-movements', [CashMovementController::class, 'index']);
            Route::post('cash-movements', [CashMovementController::class, 'store']);
        });
```

- [ ] **Step 6: Present Prive separately in the equity statement**

In `backend/app/Services/Accounting/FinancialReportService.php` replace:

```php
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
```

with:

```php
        // Ekuitas bersaldo normal debit (Prive 3-3000) disajikan terpisah sebagai pengurang ekuitas (SAK EMKM).
        $contributions = 0.0;
        $drawings = 0.0;
        foreach (LedgerBalances::forRange($from, $to, excludeClosing: true) as $b) {
            if ($b->account->account_type !== 'EQUITY') {
                continue;
            }
            if ($b->account->normal_balance === 'DEBIT') {
                $drawings += $b->signed('DEBIT');
            } else {
                $contributions += $b->signed('CREDIT');
            }
        }
        $contributions = round($contributions, 2);
        $drawings = round($drawings, 2);
        $netIncome = $this->incomeStatement($from, $to)['net_income'];
        $closing = $this->balanceSheet($to)['equity']['total'];

        return [
            'opening_equity' => $opening,
            'owner_contributions' => $contributions,
            'owner_drawings' => $drawings,
            'net_income' => $netIncome,
            'closing_equity' => $closing,
            'difference' => round($closing - $opening - $contributions + $drawings - $netIncome, 2),
        ];
```

- [ ] **Step 7: Run the tests, then the gate**

Run: `cd backend && php artisan config:clear && php artisan test --filter='CashMovementTest|FinancialReportTest|CashFlowReportTest'`
Expected: PASS.
Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/Services/Accounting/CashMovementService.php backend/app/Http/Controllers/Api/v1/CashMovementController.php backend/tests/Feature/CashMovementTest.php backend/routes/api.php backend/app/Services/Accounting/FinancialReportService.php
git commit -m "feat(accounting): post cash deposits, owner drawings and capital injections

The owner had no server posting for moving drawer cash to the bank, taking
Prive or adding capital. Each is now one balanced journal (KAS- numbers);
the equity statement shows drawings separately as SAK EMKM expects.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part F — Frontend

### Task F1: Permission keys and the cash API client

**Files:**
- Create: `src/services/api/cashApi.ts`, `src/services/__tests__/cashApi.test.ts`
- Modify: `src/services/api/index.ts`, `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/services/__tests__/authNavigationService.test.ts`

**Interfaces:**
- Consumes: B2/B3 endpoints and shapes.
- Produces: `PermissionKey` members `'cash_session' | 'cash_session_approve' | 'cash_movement'`; exported from `src/services/api`: `cashApi` (`current(): Promise<CashSessionState>`, `sessions(): Promise<ApiCashSession[]>`, `open(input: { opening_float: number; opening_note?: string }): Promise<ApiCashSession>`, `close(id: number, input: { counted_cash: number; variance_reason?: string }): Promise<ApiCashSession>`, `approve(id: number): Promise<{ session: ApiCashSession; journals: ApiJournal[] }>`, `movements(): Promise<ApiJournal[]>`, `createMovement(payload: CashMovementPayload): Promise<ApiJournal>`), types `CashSessionStatus`, `CashSessionLine`, `ApiCashSession`, `CashSessionState`, `CashMovementType`, `CashMovementPayload`.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/cashApi.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cashApi } from '../api/cashApi';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const okFetch = (data: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true, data }) });

describe('cashApi', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('membuka shift dengan kas awal hasil hitung', async () => {
    const fetchMock = okFetch({ id: 7, status: 'OPEN' });
    vi.stubGlobal('fetch', fetchMock);

    const session = await cashApi.open({ opening_float: 500000, opening_note: 'Tambahan receh' });

    expect(session).toMatchObject({ id: 7, status: 'OPEN' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/cash-sessions\/open$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ opening_float: 500000, opening_note: 'Tambahan receh' });
  });

  it('menutup shift per id dan membukukan mutasi kas pemilik', async () => {
    const fetchMock = okFetch({});
    vi.stubGlobal('fetch', fetchMock);

    await cashApi.close(12, { counted_cash: 1250000, variance_reason: 'Kurang kembalian' });
    await cashApi.createMovement({ type: 'DRAWING', date: '2026-10-02', amount: 200000, account_code: '1-1001', description: 'Prive' });

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/cash-sessions\/12\/close$/);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ counted_cash: 1250000, variance_reason: 'Kurang kembalian' });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/cash-movements$/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ type: 'DRAWING', account_code: '1-1001', amount: 200000 });
  });
});
```

In `src/services/__tests__/authNavigationService.test.ts` replace:

```ts
  it('default role permissions list exactly the 13 server keys (no booking DP or BON)', () => {
    for (const role of ['KASIR', 'GUDANG'] as const) {
      const keys = Object.keys(DEFAULT_ROLE_PERMISSIONS[role]);
      expect(keys).toHaveLength(13);
```

with:

```ts
  it('default role permissions list exactly the 16 server keys (no booking DP or BON)', () => {
    expect(DEFAULT_ROLE_PERMISSIONS.KASIR.cash_session).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.KASIR.cash_movement).toBe(false);
    for (const role of ['KASIR', 'GUDANG'] as const) {
      const keys = Object.keys(DEFAULT_ROLE_PERMISSIONS[role]);
      expect(keys).toHaveLength(16);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/services/__tests__/cashApi.test.ts src/services/__tests__/authNavigationService.test.ts`
Expected: FAIL — `../api/cashApi` cannot be resolved; 13 keys instead of 16.

- [ ] **Step 3: Create the API client**

Create `src/services/api/cashApi.ts`:

```ts
import { apiClient } from './apiClient';
import type { ApiJournal } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export type CashSessionStatus = 'OPEN' | 'PENDING_APPROVAL' | 'CLOSED';

/** Mutasi laci (akun 1-1000) per jenis jurnal selama shift; positif = masuk laci. */
export interface CashSessionLine {
  reference_type: string;
  label: string;
  amount: number;
  count: number;
}

export interface ApiCashSession {
  id: number;
  status: CashSessionStatus;
  user_id: number;
  user_name: string | null;
  opened_at: string;
  opening_float: number;
  book_opening: number;
  opening_difference: number;
  opening_note: string | null;
  lines: CashSessionLine[];
  cash_in: number;
  cash_out: number;
  expected_cash: number;
  closed_at: string | null;
  closed_by_name: string | null;
  counted_cash: number | null;
  variance: number | null;
  variance_reason: string | null;
  /** Nominal jurnal selisih saat disetujui (selisih akhir + selisih kas awal). */
  adjustment: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  journal_entry_number: string | null;
}

export interface CashSessionState {
  session: ApiCashSession | null;
  /** Saldo buku laci: saldo 1-1000 + selisih shift yang belum disetujui. */
  book_balance: number;
}

export type CashMovementType = 'DEPOSIT' | 'DRAWING' | 'CAPITAL';

export interface CashMovementPayload {
  type: CashMovementType;
  date: string;
  amount: number;
  /** Wajib untuk DRAWING/CAPITAL; DEPOSIT selalu 1-1000 → 1-1001. */
  account_code?: '1-1000' | '1-1001';
  description: string;
}

const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> => request.then((r) => r.data);

/** Shift kasir dan mutasi kas pemilik; semua angka dihitung dan dijurnal server. */
export const cashApi = {
  current: () => unwrap(apiClient.get<Envelope<CashSessionState>>('/cash-sessions/current')),
  sessions: () => unwrap(apiClient.get<Envelope<ApiCashSession[]>>('/cash-sessions')),
  open: (input: { opening_float: number; opening_note?: string }) =>
    unwrap(apiClient.post<Envelope<ApiCashSession>>('/cash-sessions/open', input)),
  close: (id: number, input: { counted_cash: number; variance_reason?: string }) =>
    unwrap(apiClient.post<Envelope<ApiCashSession>>(`/cash-sessions/${id}/close`, input)),
  approve: (id: number) =>
    unwrap(apiClient.post<Envelope<{ session: ApiCashSession; journals: ApiJournal[] }>>(`/cash-sessions/${id}/approve`)),
  movements: () => unwrap(apiClient.get<Envelope<ApiJournal[]>>('/cash-movements')),
  createMovement: (payload: CashMovementPayload) =>
    unwrap(apiClient.post<Envelope<ApiJournal>>('/cash-movements', payload)),
};
```

In `src/services/api/index.ts` replace:

```ts
export * from './paymentApi';
```

with:

```ts
export * from './paymentApi';
export * from './cashApi';
```

- [ ] **Step 4: Add the permission keys to the types, defaults and matrix UI**

In `src/shared/types/index.ts` replace:

```ts
  | 'financial_reports'
  | 'role_settings';
```

with:

```ts
  | 'financial_reports'
  | 'role_settings'
  | 'cash_session'
  | 'cash_session_approve'
  | 'cash_movement';
```

In `src/shared/data/mockData.ts` replace:

```ts
    accounting_hub: false,
    financial_reports: false,
    role_settings: false,
  },
  GUDANG: {
```

with:

```ts
    accounting_hub: false,
    financial_reports: false,
    role_settings: false,
    cash_session: true,
    cash_session_approve: false,
    cash_movement: false,
  },
  GUDANG: {
```

and replace:

```ts
    accounting_hub: false,
    financial_reports: false,
    role_settings: false,
  },
};
```

with:

```ts
    accounting_hub: false,
    financial_reports: false,
    role_settings: false,
    cash_session: false,
    cash_session_approve: false,
    cash_movement: false,
  },
};
```

In `src/modules/settings/components/RolePermissionsTab.tsx` replace:

```tsx
    description: 'Membatalkan nota: jurnal pembalik dibukukan dan stok dikembalikan ke batch FIFO asal. Titik kontrol internal — sebaiknya hanya Owner.',
    icon: <Ban className="w-4 h-4 text-rose-600" />,
  },
```

with:

```tsx
    description: 'Membatalkan nota: jurnal pembalik dibukukan dan stok dikembalikan ke batch FIFO asal. Titik kontrol internal — sebaiknya hanya Owner.',
    icon: <Ban className="w-4 h-4 text-rose-600" />,
  },
  {
    key: 'cash_session',
    label: 'Buka & Tutup Shift Kasir',
    category: 'KASIR_POS',
    description: 'Menghitung kas awal dan kas akhir laci. Penjualan tunai hanya bisa diproses selama shift dibuka.',
    icon: <Wallet className="w-4 h-4 text-blue-600" />,
  },
```

and replace:

```tsx
    description: 'Laporan Laba Rugi metode FIFO, Neraca Posisi Keuangan seimbang, dan CALK.',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
  },
```

with:

```tsx
    description: 'Laporan Laba Rugi metode FIFO, Neraca Posisi Keuangan seimbang, dan CALK.',
    icon: <FileText className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'cash_movement',
    label: 'Mutasi Kas Pemilik (Setor Bank, Prive, Modal)',
    category: 'AKUNTANSI_BIAYA',
    description: 'Membukukan setoran kas laci ke bank, pengambilan prive, dan setoran modal pemilik. Sebaiknya hanya Owner.',
    icon: <Building className="w-4 h-4 text-amber-600" />,
  },
  {
    key: 'cash_session_approve',
    label: 'Setujui Tutup Shift & Selisih Kas',
    category: 'MANAJEMEN_OWNER',
    description: 'Menyetujui hasil hitung kas shift; selisihnya dijurnal ke akun 6-1010. Titik kontrol internal — sebaiknya hanya Owner.',
    icon: <CheckCircle2 className="w-4 h-4 text-indigo-600" />,
  },
```

- [ ] **Step 5: Run the tests and the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all Vitest files pass (previous count + 2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/api/cashApi.ts src/services/__tests__/cashApi.test.ts src/services/api/index.ts src/shared/types/index.ts src/shared/data/mockData.ts src/modules/settings/components/RolePermissionsTab.tsx src/services/__tests__/authNavigationService.test.ts
git commit -m "feat(accounting): add cash shift permissions and api client

The frontend needs the three new permission keys in its matrix and a typed
client for the cash shift and cash movement endpoints.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F2: POS shift control; the drawer counter becomes the 1-1000 ledger balance

**Files:**
- Create: `src/modules/pos/components/CashShiftControl.tsx`
- Modify: `src/modules/pos/components/index.ts`, `src/modules/pos/PosScreen.tsx`, `src/App.tsx`, `src/shared/components/HeaderNavbar.tsx`, `src/modules/expenses/components/ExpenseForm.tsx`, `src/shared/components/WireframeGuideModal.tsx`

**Interfaces:**
- Consumes: F1 `cashApi.current/open/close`, `CashSessionState`, `PermissionKey 'cash_session'`.
- Produces: `CashShiftControl` props `{ cashInDrawer: number | null; enabled: boolean }`; `PosScreen` props `cashInDrawer: number | null`, `canUseCashSession?: boolean`; `HeaderNavbar` prop `cashInDrawer: number | null` (chip hidden when null); `App.tsx` constant `canReadCash: boolean` (used by F3). `ob3_cash_drawer` no longer read or written.

There is no DOM test environment (Vitest runs `.test.ts` in node), so this task is verified by `tsc`, the existing suite, a grep, and the browser checklist in D1.

- [ ] **Step 1: Create the shift control**

Create `src/modules/pos/components/CashShiftControl.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Banknote, Loader2, X } from 'lucide-react';
import { cashApi } from '../../../services/api';
import type { CashSessionState } from '../../../services/api';
import { formatRupiah } from '../../../shared/utils/formatters';
import { MoneyInput } from '../../../shared/components/MoneyInput';
import { useToast } from '../../../shared/components';

interface CashShiftControlProps {
  /** Saldo buku kas laci (akun 1-1000); null bila peran tidak boleh membaca saldo kas. */
  cashInDrawer: number | null;
  /** Izin `cash_session`: membuka dan menutup shift kasir. */
  enabled: boolean;
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');

/**
 * Shift kasir di POS. Buka shift = hitung kas awal laci; tutup shift = hitung kas fisik, alasan wajib bila berbeda
 * dari kas seharusnya. Selisih dijurnal ke 6-1010 saat pemilik menyetujui (Buku Besar → Kas & Bank).
 */
export const CashShiftControl: React.FC<CashShiftControlProps> = ({ cashInDrawer, enabled }) => {
  const toast = useToast();
  const [state, setState] = useState<CashSessionState | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    cashApi.current().then(setState).catch(() => setState(null));
  };

  useEffect(() => {
    if (enabled) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const balance = cashInDrawer === null ? null : (
    <b className="text-emerald-950 font-mono font-extrabold text-xs">{formatRupiah(cashInDrawer)}</b>
  );

  if (!enabled) {
    if (balance === null) return null;
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-semibold shadow-2xs"
        title="Saldo buku kas laci (akun 1-1000)"
      >
        <Banknote className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="hidden md:inline text-[11px] text-emerald-700">Kas Laci:</span>
        {balance}
      </div>
    );
  }

  const session = state?.session ?? null;
  const target = session ? session.expected_cash : state?.book_balance ?? 0;
  const difference = amount - target;
  const needsNote = Math.abs(difference) >= 0.005;

  const openModal = async () => {
    try {
      const fresh = await cashApi.current();
      setState(fresh);
      setAmount(fresh.session ? 0 : fresh.book_balance);
      setNote('');
      setIsOpen(true);
    } catch (err) {
      toast.error('Gagal Memuat Shift', errorText(err));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (needsNote && !note.trim()) return;
    setSubmitting(true);
    try {
      if (session) {
        await cashApi.close(session.id, { counted_cash: amount, variance_reason: note.trim() || undefined });
        toast.success('Shift Ditutup', 'Menunggu persetujuan pemilik. Selisih kas dijurnal saat disetujui.');
      } else {
        await cashApi.open({ opening_float: amount, opening_note: note.trim() || undefined });
        toast.success('Shift Dibuka', `Kas awal laci ${formatRupiah(amount)}.`);
      }
      setIsOpen(false);
      refresh();
    } catch (err) {
      toast.error(session ? 'Tutup Shift Ditolak' : 'Buka Shift Ditolak', errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold shadow-2xs cursor-pointer ${
          session
            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
            : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
        }`}
        title={session ? `Shift #${session.id} terbuka — klik untuk tutup shift` : 'Belum ada shift — klik untuk buka shift'}
      >
        <Banknote className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden md:inline text-[11px]">{session ? 'Tutup Shift' : 'Buka Shift'}</span>
        {balance}
      </button>

      {isOpen && state && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 flex items-center justify-center p-3 sm:p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="cash-shift-title" className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h2 id="cash-shift-title" className="text-sm font-bold flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                <span>{session ? `Tutup Shift #${session.id}` : 'Buka Shift Kasir'}</span>
              </h2>
              <button type="button" aria-label="Tutup" onClick={() => setIsOpen(false)} className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-5 space-y-3 text-xs text-slate-800">
              {session ? (
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="py-1 text-slate-500">Dibuka</td>
                      <td className="py-1 text-right">
                        {session.user_name ?? '-'} • {new Date(session.opened_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Kas awal</td>
                      <td className="py-1 text-right font-mono">{formatRupiah(session.opening_float)}</td>
                    </tr>
                    {session.lines.map((line) => (
                      <tr key={line.reference_type}>
                        <td className="py-1 text-slate-500">{line.label} ({line.count})</td>
                        <td className={`py-1 text-right font-mono ${line.amount < 0 ? 'text-rose-700' : ''}`}>{formatRupiah(line.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 font-bold">
                      <td className="py-1.5">Kas seharusnya</td>
                      <td className="py-1.5 text-right font-mono">{formatRupiah(session.expected_cash)}</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                  Hitung uang di laci sebelum melayani pelanggan. Saldo buku laci saat ini{' '}
                  <strong className="font-mono">{formatRupiah(target)}</strong>; bila hasil hitung berbeda, tulis keterangannya.
                </p>
              )}

              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">{session ? 'Kas fisik dihitung' : 'Kas awal di laci (hasil hitung)'}</span>
                <MoneyInput
                  value={amount}
                  onChange={setAmount}
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white text-right font-mono"
                />
              </label>

              <p className={`font-bold ${needsNote ? 'text-rose-700' : 'text-emerald-700'}`}>
                Selisih: {formatRupiah(difference)}{needsNote ? '' : ' (cocok)'}
              </p>

              {needsNote && (
                <label className="block">
                  <span className="block font-bold text-slate-700 mb-1">{session ? 'Alasan selisih (wajib)' : 'Keterangan selisih kas awal (wajib)'}</span>
                  <textarea
                    required
                    maxLength={255}
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                  />
                </label>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setIsOpen(false)} className="px-3 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                  Batal
                </button>
                <button type="submit" disabled={submitting} className="px-3 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl flex items-center gap-1.5 cursor-pointer">
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{session ? 'Tutup Shift' : 'Buka Shift'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
```

In `src/modules/pos/components/index.ts` replace:

```ts
export * from './ReceiptPreviewModal';
```

with:

```ts
export * from './ReceiptPreviewModal';
export * from './CashShiftControl';
```

- [ ] **Step 2: Use it in the POS header**

In `src/modules/pos/PosScreen.tsx`:

Replace:

```tsx
  PosSuccessModal,
  ReceiptPreviewModal,
} from './components';
```

with:

```tsx
  PosSuccessModal,
  ReceiptPreviewModal,
  CashShiftControl,
} from './components';
```

Replace (props interface):

```tsx
  cashierName: string;
  cashInDrawer: number;
  timeString: string;
```

with:

```tsx
  cashierName: string;
  /** Saldo buku kas laci (akun 1-1000); null bila peran tidak boleh membaca saldo kas. */
  cashInDrawer: number | null;
  /** Izin `cash_session`: tombol buka/tutup shift kasir. */
  canUseCashSession?: boolean;
  timeString: string;
```

Replace (destructuring):

```tsx
  cashierName,
  cashInDrawer,
  timeString,
```

with:

```tsx
  cashierName,
  cashInDrawer,
  canUseCashSession = false,
  timeString,
```

Replace the drawer chip (note: the source line `<div ` ends with one trailing space):

```tsx
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 font-semibold shadow-2xs"
            title={`Kas Laci: ${formatRupiah(cashInDrawer)}`}
          >
            <Banknote className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span className="hidden md:inline text-[11px] text-emerald-700">Kas Laci:</span>
            <b className="text-emerald-950 font-mono font-extrabold text-xs">{formatRupiah(cashInDrawer)}</b>
          </div>
```

with:

```tsx
          <CashShiftControl cashInDrawer={cashInDrawer} enabled={canUseCashSession} />
```

- [ ] **Step 3: Hide the header chip when the balance is not readable**

In `src/shared/components/HeaderNavbar.tsx` replace:

```tsx
  setActiveScreen: (screen: ActiveScreen) => void;
  cashInDrawer: number;
```

with:

```tsx
  setActiveScreen: (screen: ActiveScreen) => void;
  /** Saldo buku kas laci (akun 1-1000); null = peran tanpa akses saldo kas, chip disembunyikan. */
  cashInDrawer: number | null;
```

and replace (the `<div ` line ends with one trailing space):

```tsx
          {/* Saldo Kas Laci Kasir (Visible on mobile & desktop) */}
          <div 
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono shadow-2xs shrink-0"
            title={`Kas Laci: ${formatRupiah(cashInDrawer)}`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
            <span className="hidden md:inline text-emerald-800 text-[11px] font-semibold">Kas Laci:</span>
            <span className="font-extrabold text-[10px] sm:text-xs text-emerald-950 truncate max-w-[70px] sm:max-w-none">{formatRupiah(cashInDrawer)}</span>
          </div>
```

with:

```tsx
          {/* Saldo buku kas laci (akun 1-1000), hanya untuk peran yang boleh membaca saldo kas */}
          {cashInDrawer !== null && (
            <div
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 font-mono shadow-2xs shrink-0"
              title={`Kas Laci (buku 1-1000): ${formatRupiah(cashInDrawer)}`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse shrink-0" />
              <span className="hidden md:inline text-emerald-800 text-[11px] font-semibold">Kas Laci:</span>
              <span className="font-extrabold text-[10px] sm:text-xs text-emerald-950 truncate max-w-[70px] sm:max-w-none">{formatRupiah(cashInDrawer)}</span>
            </div>
          )}
```

- [ ] **Step 4: Remove the counter from `App.tsx`**

In `src/App.tsx` make these replacements (each "before" occurs once):

1. Replace:

```tsx
  const can = (key: PermissionKey): boolean => hasPermission(currentUser, rolePermissions, key);
```

with:

```tsx
  const can = (key: PermissionKey): boolean => hasPermission(currentUser, rolePermissions, key);
  /** Peran yang boleh membaca saldo buku kas/bank (GET /accounting/cash-balances); laci kasir = akun 1-1000. */
  const canReadCash = can('expenses') || can('accounting_hub') || can('financial_reports') || can('cash_session');
```

2. Replace:

```tsx
  const [ledgerVersion, setLedgerVersion] = useState(0);
  const [cashInDrawer, setCashInDrawer] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ob3_cash_drawer');
      return saved ? Number(saved) : 2450000;
    } catch {
      return 2450000;
    }
  });
```

with:

```tsx
  const [ledgerVersion, setLedgerVersion] = useState(0);
```

3. Replace:

```tsx
    if (allowed('expenses', 'accounting_hub', 'financial_reports')) refreshCashBalances();
```

with:

```tsx
    if (allowed('expenses', 'accounting_hub', 'financial_reports', 'cash_session')) refreshCashBalances();
```

4. Replace:

```tsx
  useEffect(() => {
    localStorage.setItem('ob3_cash_drawer', String(cashInDrawer));
  }, [cashInDrawer]);

  // Tahap 4: salinan akuntansi lokal lama (mock + jurnal sesi) tidak dipakai lagi.
  useEffect(() => {
    ['ob3_journals', 'ob3_expenses', 'ob3_account_balances', 'ob3_period_info'].forEach((key) => localStorage.removeItem(key));
  }, []);
```

with:

```tsx
  // Salinan akuntansi lokal lama (Tahap 4) dan penghitung laci per-browser (kini saldo buku 1-1000) tidak dipakai lagi.
  useEffect(() => {
    ['ob3_journals', 'ob3_expenses', 'ob3_account_balances', 'ob3_period_info', 'ob3_cash_drawer'].forEach((key) => localStorage.removeItem(key));
  }, []);
```

5. Replace:

```tsx
    // Saldo kas/bank hanya boleh dibaca peran dengan akses akuntansi (sama seperti loadPosData).
    if (can('expenses') || can('accounting_hub') || can('financial_reports')) refreshCashBalances();
  };

  /** Porsi tunai yang benar-benar masuk/keluar laci (tanpa kembalian). */
  const cashPortion = (sale: ApiSale) =>
    sale.payments.filter((p) => p.method === 'TUNAI').reduce((sum, p) => sum + Number(p.amount), 0);
```

with:

```tsx
    // Saldo kas/bank hanya dibaca peran yang diizinkan (sama seperti loadPosData).
    if (canReadCash) refreshCashBalances();
  };
```

6. Replace:

```tsx
    notifyLedgerChanged(sale.journals);
    setCashInDrawer((prev) => prev + cashPortion(sale));
    handleRefreshProducts();
```

with:

```tsx
    notifyLedgerChanged(sale.journals);
    handleRefreshProducts();
```

7. Delete the line:

```tsx
      if (record.cash_source.includes('Laci')) setCashInDrawer((prev) => Math.max(0, prev - record.amount));
```

8. Delete the line:

```tsx
      if (target.cash_source.includes('Laci')) setCashInDrawer((prev) => prev + target.amount);
```

9. Delete the line:

```tsx
      setCashInDrawer((prev) => Math.max(0, prev - cashPortion(sale)));
```

10. Delete the block:

```tsx
      if (payload.payment_method === 'TUNAI') {
        setCashInDrawer((prev) => Math.max(0, prev - Number(res.purchase.total_amount)));
      }
```

11. Delete the block:

```tsx
      if (paymentInput.source_account_code === '1-1000') {
        setCashInDrawer((prev) => Math.max(0, prev - paymentInput.amount));
      }
```

12. Delete the block:

```tsx
      payload.items
        .filter((l) => l.account_code === '1-1000')
        .forEach((l) => setCashInDrawer((prev) => Math.max(0, prev + l.debit - l.credit)));
```

13. Replace (PosScreen props):

```tsx
          cashierName={currentUser.name}
          cashInDrawer={cashInDrawer}
          timeString={timeString}
```

with:

```tsx
          cashierName={currentUser.name}
          cashInDrawer={canReadCash ? cashBalances['1-1000'] : null}
          canUseCashSession={can('cash_session')}
          timeString={timeString}
```

14. Replace (HeaderNavbar props):

```tsx
            setActiveScreen={setActiveScreen}
            cashInDrawer={cashInDrawer}
            lowStockCount={lowStockCount}
```

with:

```tsx
            setActiveScreen={setActiveScreen}
            cashInDrawer={canReadCash ? cashBalances['1-1000'] : null}
            lowStockCount={lowStockCount}
```

15. Replace (ExpensesScreen props):

```tsx
                onAddExpense={handleAddExpense}
                cashInDrawer={cashInDrawer}
                bankBalance={cashBalances['1-1001']}
```

with:

```tsx
                onAddExpense={handleAddExpense}
                cashInDrawer={cashBalances['1-1000']}
                bankBalance={cashBalances['1-1001']}
```

16. Replace (GeneralLedgerScreen props):

```tsx
                payableInvoices={payableInvoices}
                cashInDrawer={cashInDrawer}
                canReopenPeriod={currentUser?.role === 'OWNER'}
```

with:

```tsx
                payableInvoices={payableInvoices}
                cashInDrawer={cashBalances['1-1000']}
                canReopenPeriod={currentUser?.role === 'OWNER'}
```

Verify: `grep -n "setCashInDrawer\|cashPortion\|ob3_cash_drawer" src/App.tsx` prints only the `removeItem` cleanup line.

- [ ] **Step 5: Do not block cash expenses before the drawer has a book balance**

In `src/modules/expenses/components/ExpenseForm.tsx` replace:

```tsx
    if (isCash && numericAmount > cashInDrawer) {
```

with:

```tsx
    // Saldo buku laci ≤ 0 (belum ada saldo awal/shift tercatat) tidak memblokir, sama seperti aturan bank di bawah.
    if (isCash && cashInDrawer > 0 && numericAmount > cashInDrawer) {
```

and replace:

```tsx
                {isCash && numericAmount > cashInDrawer && (
```

with:

```tsx
                {isCash && cashInDrawer > 0 && numericAmount > cashInDrawer && (
```

- [ ] **Step 6: Update the in-app guide**

In `src/shared/components/WireframeGuideModal.tsx` replace:

```tsx
                      <li>Periksa modal uang receh di laci kasir (standar toko: Rp 500.000 untuk uang kembalian).</li>
```

with:

```tsx
                      <li>Di layar Kasir (POS), klik <strong>"Buka Shift"</strong>, hitung uang di laci, lalu masukkan hasil hitungnya sebagai kas awal. Penjualan tunai baru bisa diproses setelah shift dibuka.</li>
```

replace:

```tsx
                      <li>Hitung seluruh uang fisik di laci kasir.</li>
                      <li>Buka menu <strong>Riwayat Struk</strong>, bandingkan total uang fisik dengan total penerimaan tunai hari ini.</li>
                      <li>Sisihkan kembali uang modal awal (Rp 500.000) di laci untuk besok pagi.</li>
                      <li>Serahkan uang hasil omzet penjualan bersih hari ini kepada Owner toko atau transfer ke rekening toko.</li>
```

with:

```tsx
                      <li>Klik <strong>"Tutup Shift"</strong> di layar Kasir (POS), hitung seluruh uang fisik di laci, lalu masukkan hasilnya.</li>
                      <li>Sistem membandingkan dengan kas seharusnya (kas awal + penjualan tunai − biaya dan pengeluaran tunai). Jika berbeda, tulis alasan selisihnya; pemilik menyetujui di <strong>Buku Besar → Kas & Bank</strong>.</li>
                      <li>Setoran omzet ke rekening toko dicatat pemilik di <strong>Buku Besar → Kas & Bank</strong> (Setor kas laci ke bank).</li>
                      <li>Uang yang tetap di laci menjadi kas awal shift berikutnya.</li>
```

and replace:

```tsx
                    <strong>Solusi:</strong> Pertama, cek menu <strong>Biaya Toko</strong>, biasanya ada staf yang mengambil uang untuk bensin atau makan yang belum dicatat di sistem. Kedua, cek menu <strong>Riwayat Struk</strong> untuk memastikan tidak ada nota kasir yang dobel atau nota yang belum diselesaikan pembayarannya.
```

with:

```tsx
                    <strong>Solusi:</strong> Pertama, cek menu <strong>Biaya Toko</strong>, biasanya ada staf yang mengambil uang untuk bensin atau makan yang belum dicatat di sistem. Kedua, cek menu <strong>Riwayat Struk</strong> untuk memastikan tidak ada nota kasir yang dobel atau nota yang belum diselesaikan pembayarannya. Jika tetap selisih, tulis alasannya saat <strong>Tutup Shift</strong>; setelah pemilik menyetujui, selisih dijurnal ke akun 6-1010 Selisih Kas Kasir.
```

- [ ] **Step 7: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass (count unchanged from F1).

- [ ] **Step 8: Commit**

```bash
git add src/modules/pos/components/CashShiftControl.tsx src/modules/pos/components/index.ts src/modules/pos/PosScreen.tsx src/App.tsx src/shared/components/HeaderNavbar.tsx src/modules/expenses/components/ExpenseForm.tsx src/shared/components/WireframeGuideModal.tsx
git commit -m "feat(pos): open and close cashier shifts and show the ledger drawer balance

The per-browser ob3_cash_drawer counter drifted from the 1-1000 ledger. The
POS now opens and closes server shifts, and every drawer figure is the
ledger balance.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F3: Kas & Bank tab (shift approval, cash movements) and journal filter

**Files:**
- Create: `src/modules/accounting/components/CashBankTab.tsx`
- Modify: `src/modules/accounting/components/index.ts`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/modules/accounting/components/JournalTab.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: F1 `cashApi.sessions/approve/movements/createMovement`, types; F2 `App.tsx` line `cashInDrawer={cashBalances['1-1000']}` in the GeneralLedgerScreen props; `notifyLedgerChanged(apiJournals: ApiJournal[])` in `App.tsx`.
- Produces: `CashBankTab` props `{ refreshKey: number; canApprove: boolean; canMove: boolean; onLedgerChanged: (journals: ApiJournal[]) => void }`; `GeneralLedgerScreen` props `canApproveCash?: boolean`, `canMoveCash?: boolean`, `onLedgerChanged?: (journals: ApiJournal[]) => void`; `AccountingTabKey` gains `'cash'`.

- [ ] **Step 1: Create the tab**

Create `src/modules/accounting/components/CashBankTab.tsx`:

```tsx
import React, { useState } from 'react';
import { CheckCircle2, Loader2, Wallet } from 'lucide-react';
import { cashApi } from '../../../services/api';
import type { ApiCashSession, ApiJournal, CashMovementType } from '../../../services/api';
import { localDate } from '../../../services/accountingPeriod';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';
import { MoneyInput } from '../../../shared/components/MoneyInput';
import { useToast } from '../../../shared/components';
import { useServerData } from '../hooks/useServerData';
import { ServerStatus } from './ServerStatus';

interface CashBankTabProps {
  refreshKey: number;
  /** Izin `cash_session_approve`. */
  canApprove: boolean;
  /** Izin `cash_movement`. */
  canMove: boolean;
  onLedgerChanged: (journals: ApiJournal[]) => void;
}

const STATUS_LABEL: Record<ApiCashSession['status'], string> = {
  OPEN: 'Terbuka',
  PENDING_APPROVAL: 'Menunggu persetujuan',
  CLOSED: 'Disetujui',
};

const MOVEMENTS: { id: CashMovementType; label: string; journal: string }[] = [
  { id: 'DEPOSIT', label: 'Setor kas laci ke bank', journal: 'Dr 1-1001 Bank / Cr 1-1000 Kas laci' },
  { id: 'DRAWING', label: 'Prive (pengambilan pemilik)', journal: 'Dr 3-3000 Prive / Cr kas laci atau bank' },
  { id: 'CAPITAL', label: 'Setoran modal pemilik', journal: 'Dr kas laci atau bank / Cr 3-1000 Modal' },
];

const MOVEMENT_LABEL: Record<string, string> = {
  CASH_DEPOSIT: 'Setor bank',
  OWNER_DRAWING: 'Prive',
  CAPITAL_INJECTION: 'Setoran modal',
};

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
const timeText = (iso: string | null) => (iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-');

/** Persetujuan shift kasir (selisih kas dijurnal ke 6-1010) dan mutasi kas pemilik: setor bank, prive, setoran modal. */
export const CashBankTab: React.FC<CashBankTabProps> = ({ refreshKey, canApprove, canMove, onLedgerChanged }) => {
  const toast = useToast();
  const sessions = useServerData(() => (canApprove ? cashApi.sessions() : Promise.resolve([] as ApiCashSession[])), [refreshKey, canApprove]);
  const movements = useServerData(() => (canMove ? cashApi.movements() : Promise.resolve([] as ApiJournal[])), [refreshKey, canMove]);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [type, setType] = useState<CashMovementType>('DEPOSIT');
  const [account, setAccount] = useState<'1-1000' | '1-1001'>('1-1000');
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(localDate());
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const approve = async (session: ApiCashSession) => {
    const adjustment = session.adjustment ?? 0;
    if (!window.confirm(`Setujui shift #${session.id}? Selisih ${formatRupiah(adjustment)} dijurnal ke 6-1010 Selisih Kas Kasir.`)) return;
    setApprovingId(session.id);
    try {
      const res = await cashApi.approve(session.id);
      onLedgerChanged(res.journals);
      sessions.reload();
      toast.success(
        'Shift Disetujui',
        res.journals.length > 0 ? `Selisih kas dibukukan (${res.journals[0].entry_number}).` : 'Kas fisik sama dengan saldo buku; tidak ada jurnal.'
      );
    } catch (err) {
      toast.error('Persetujuan Ditolak', errorText(err));
    } finally {
      setApprovingId(null);
    }
  };

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) return;
    setSubmitting(true);
    try {
      const journal = await cashApi.createMovement({
        type,
        date,
        amount,
        account_code: type === 'DEPOSIT' ? undefined : account,
        description: description.trim(),
      });
      onLedgerChanged([journal]);
      movements.reload();
      setAmount(0);
      setDescription('');
      toast.success('Mutasi Kas Dibukukan', `${journal.reference_id} (${journal.entry_number}) sebesar ${formatRupiah(journal.total_debit)}.`);
    } catch (err) {
      toast.error('Mutasi Kas Ditolak', errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  const field = 'w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white';
  const selected = MOVEMENTS.find((m) => m.id === type) ?? MOVEMENTS[0];

  return (
    <div className="space-y-5">
      {canApprove && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Shift Kasir & Persetujuan Selisih Kas</span>
          </h2>
          <p className="text-[11px] text-slate-500">
            Selisih (kas dihitung − saldo buku) dijurnal ke 6-1010 saat disetujui, sehingga saldo 1-1000 sama dengan uang fisik di laci.
          </p>
          <ServerStatus loading={sessions.loading && !sessions.data} error={sessions.error} onRetry={sessions.reload} />
          {sessions.data && sessions.data.length === 0 && <p className="text-xs text-slate-500">Belum ada shift kasir.</p>}
          {sessions.data && sessions.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Shift</th>
                    <th className="py-2 px-2">Kasir</th>
                    <th className="py-2 px-2">Dibuka / Ditutup</th>
                    <th className="py-2 px-2 text-right">Kas Seharusnya</th>
                    <th className="py-2 px-2 text-right">Kas Dihitung</th>
                    <th className="py-2 px-2 text-right">Selisih Dijurnal</th>
                    <th className="py-2 px-2">Alasan</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.data.map((s) => {
                    const adj = s.adjustment ?? 0;
                    return (
                      <tr key={s.id} className="border-b border-slate-100 align-top">
                        <td className="py-2 px-2 font-mono font-bold">#{s.id}</td>
                        <td className="py-2 px-2">{s.user_name ?? '-'}</td>
                        <td className="py-2 px-2 text-slate-600">
                          {timeText(s.opened_at)}
                          <br />
                          {timeText(s.closed_at)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono">{formatRupiah(s.expected_cash)}</td>
                        <td className="py-2 px-2 text-right font-mono">{s.counted_cash === null ? '-' : formatRupiah(s.counted_cash)}</td>
                        <td className={`py-2 px-2 text-right font-mono font-bold ${adj < 0 ? 'text-rose-700' : adj > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {s.adjustment === null ? '-' : formatRupiah(s.adjustment)}
                        </td>
                        <td className="py-2 px-2 text-slate-600 max-w-[220px]">{[s.opening_note, s.variance_reason].filter(Boolean).join(' • ') || '-'}</td>
                        <td className="py-2 px-2">
                          {s.status === 'PENDING_APPROVAL' ? (
                            <button
                              type="button"
                              disabled={approvingId === s.id}
                              onClick={() => approve(s)}
                              className="px-2.5 py-1 font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              {approvingId === s.id && <Loader2 className="w-3 h-3 animate-spin" />}
                              <span>Setujui</span>
                            </button>
                          ) : (
                            <span className="text-slate-600">
                              {STATUS_LABEL[s.status]}
                              {s.journal_entry_number ? ` (${s.journal_entry_number})` : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {canMove && (
        <section className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-blue-600" />
            <span>Mutasi Kas Pemilik</span>
          </h2>
          <form onSubmit={submitMovement} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Jenis mutasi</span>
              <select value={type} onChange={(e) => setType(e.target.value as CashMovementType)} className={field}>
                {MOVEMENTS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
              <span className="text-[10px] text-slate-500 mt-1 block font-mono">{selected.journal}</span>
            </label>
            {type !== 'DEPOSIT' && (
              <label className="block">
                <span className="block font-bold text-slate-700 mb-1">{type === 'DRAWING' ? 'Diambil dari' : 'Disetor ke'}</span>
                <select value={account} onChange={(e) => setAccount(e.target.value as '1-1000' | '1-1001')} className={field}>
                  <option value="1-1000">1-1000 Kas Laci Kasir</option>
                  <option value="1-1001">1-1001 Bank BCA Cabang 3</option>
                </select>
              </label>
            )}
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Tanggal</span>
              <input type="date" required value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="block font-bold text-slate-700 mb-1">Nominal</span>
              <MoneyInput value={amount} onChange={setAmount} className={`${field} text-right font-mono`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="block font-bold text-slate-700 mb-1">Keterangan</span>
              <input
                type="text"
                required
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="mis. Setor omzet harian ke BCA"
                className={field}
              />
            </label>
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={submitting || amount <= 0 || !description.trim()}
                className="px-3.5 py-2 font-extrabold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Bukukan Mutasi</span>
              </button>
            </div>
          </form>

          <ServerStatus loading={movements.loading && !movements.data} error={movements.error} onRetry={movements.reload} />
          {movements.data && movements.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-2">Tanggal</th>
                    <th className="py-2 px-2">No. Bukti</th>
                    <th className="py-2 px-2">Jenis</th>
                    <th className="py-2 px-2">Keterangan</th>
                    <th className="py-2 px-2 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.map((j) => (
                    <tr key={j.entry_number} className="border-b border-slate-100">
                      <td className="py-2 px-2">{formatDateIndo(j.entry_date)}</td>
                      <td className="py-2 px-2 font-mono">{j.reference_id}<br /><span className="text-slate-400">{j.entry_number}</span></td>
                      <td className="py-2 px-2">{MOVEMENT_LABEL[j.reference_type] ?? j.reference_type}</td>
                      <td className="py-2 px-2 text-slate-600">{j.description}</td>
                      <td className="py-2 px-2 text-right font-mono">{formatRupiah(j.total_debit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
```

In `src/modules/accounting/components/index.ts` replace:

```ts
export * from './ServerStatus';
```

with:

```ts
export * from './ServerStatus';
export * from './CashBankTab';
```

- [ ] **Step 2: Add the tab to the Buku Besar screen**

In `src/modules/accounting/GeneralLedgerScreen.tsx`:

Replace:

```tsx
  BookMarked, BookOpen, CreditCard, ExternalLink, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users,
} from 'lucide-react';
```

with:

```tsx
  BookMarked, BookOpen, CreditCard, ExternalLink, FileText, Landmark, Lock, LockOpen, Plus, Scale, ShieldCheck, Users, Wallet,
} from 'lucide-react';
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
import {
  AccountsPayableTab,
  GeneralLedgerTab,
```

with:

```tsx
import {
  AccountsPayableTab,
  CashBankTab,
  GeneralLedgerTab,
```

Replace:

```tsx
export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports';
```

with:

```tsx
export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports' | 'cash';
```

Replace:

```tsx
  onNavigateToFinancials?: () => void;
  initialTab?: AccountingTabKey;
}
```

with:

```tsx
  onNavigateToFinancials?: () => void;
  initialTab?: AccountingTabKey;
  /** Izin `cash_session_approve`: menyetujui tutup shift kasir. */
  canApproveCash?: boolean;
  /** Izin `cash_movement`: setor bank, prive, setoran modal. */
  canMoveCash?: boolean;
  /** Dipanggil saat tab Kas & Bank membukukan jurnal. */
  onLedgerChanged?: (journals: ApiJournal[]) => void;
}
```

Replace:

```tsx
  { id: 'reports', label: '5. Laporan Keuangan', icon: FileText },
];
```

with:

```tsx
  { id: 'reports', label: '5. Laporan Keuangan', icon: FileText },
  { id: 'cash', label: '6. Kas & Bank', icon: Wallet },
];
```

Replace:

```tsx
  onNavigateToFinancials,
  initialTab = 'journals',
}) => {
  const visibleTabs = canUseHub ? TABS : TABS.filter((t) => SUBLEDGER_TABS.includes(t.id));
```

with:

```tsx
  onNavigateToFinancials,
  initialTab = 'journals',
  canApproveCash = false,
  canMoveCash = false,
  onLedgerChanged = () => {},
}) => {
  const canManageCash = canApproveCash || canMoveCash;
  const visibleTabs = TABS.filter((t) => (t.id === 'cash' ? canManageCash : canUseHub || SUBLEDGER_TABS.includes(t.id)));
```

Replace:

```tsx
        {activeTab === 'reports' && <SakEmkmReportTab refreshKey={ledgerVersion} />}
```

with:

```tsx
        {activeTab === 'reports' && <SakEmkmReportTab refreshKey={ledgerVersion} />}
        {activeTab === 'cash' && (
          <CashBankTab refreshKey={ledgerVersion} canApprove={canApproveCash} canMove={canMoveCash} onLedgerChanged={onLedgerChanged} />
        )}
```

- [ ] **Step 3: Pass the permissions from `App.tsx`**

In `src/App.tsx` replace (text produced by F2):

```tsx
                payableInvoices={payableInvoices}
                cashInDrawer={cashBalances['1-1000']}
                canReopenPeriod={currentUser?.role === 'OWNER'}
```

with:

```tsx
                payableInvoices={payableInvoices}
                cashInDrawer={cashBalances['1-1000']}
                canApproveCash={can('cash_session_approve')}
                canMoveCash={can('cash_movement')}
                onLedgerChanged={notifyLedgerChanged}
                canReopenPeriod={currentUser?.role === 'OWNER'}
```

- [ ] **Step 4: Add the journal filter group and badges**

In `src/modules/accounting/components/JournalTab.tsx` replace:

```tsx
  { id: 'DEBT', label: 'Bayar Hutang', types: ['DEBT_PAYMENT'] },
```

with:

```tsx
  { id: 'DEBT', label: 'Bayar Hutang', types: ['DEBT_PAYMENT'] },
  { id: 'CASH', label: 'Kas & Modal', types: ['CASH_SESSION_VARIANCE', 'CASH_DEPOSIT', 'OWNER_DRAWING', 'CAPITAL_INJECTION'] },
```

and replace:

```tsx
  PERIOD_REOPEN: 'BUKA PERIODE',
};
```

with:

```tsx
  PERIOD_REOPEN: 'BUKA PERIODE',
  CASH_SESSION_VARIANCE: 'SELISIH KAS',
  CASH_DEPOSIT: 'SETOR BANK',
  OWNER_DRAWING: 'PRIVE',
  CAPITAL_INJECTION: 'SETOR MODAL',
};
```

- [ ] **Step 5: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/accounting/components/CashBankTab.tsx src/modules/accounting/components/index.ts src/modules/accounting/GeneralLedgerScreen.tsx src/modules/accounting/components/JournalTab.tsx src/App.tsx
git commit -m "feat(accounting): add kas & bank tab for shift approval and owner cash movements

The owner needs one place to approve closed shifts (posting the variance)
and to record deposits, Prive and capital; the journal screen can now
filter these entries.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F4: Show Prive in the statement of changes in equity and its export

**Files:**
- Modify: `src/shared/types/index.ts`, `src/modules/accounting/components/StatementParts.tsx`, `src/shared/export/registry.ts`, `src/shared/export/__tests__/registry.test.ts`

**Interfaces:**
- Consumes: B3 `equity_changes.owner_drawings`.
- Produces: `EquityChanges.owner_drawings: number`; equity table/export row "Prive (pengambilan pemilik)" with value `-owner_drawings`.

- [ ] **Step 1: Write the failing test**

In `src/shared/export/__tests__/registry.test.ts` replace:

```ts
    equity_changes: { opening_equity: 1100000, owner_contributions: 0, net_income: 250000, closing_equity: 1350000, difference: 0 },
```

with:

```ts
    equity_changes: { opening_equity: 1100000, owner_contributions: 0, owner_drawings: 0, net_income: 250000, closing_equity: 1350000, difference: 0 },
```

and replace:

```ts
  it('sak emkm package memiliki 5 section', () => {
```

with:

```ts
  it('perubahan ekuitas menampilkan prive sebagai pengurang', () => {
    const withPrive = { ...statements, equity_changes: { ...statements.equity_changes, owner_drawings: 150000, closing_equity: 1200000 } };
    const rows = buildExportDoc('fin_equity_statement', withPrive, ctx).sections[0].rows;
    expect(rows.find((r) => r.label === 'Prive (pengambilan pemilik)')?.value).toBe(-150000);
  });

  it('sak emkm package memiliki 5 section', () => {
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run lint`
Expected: FAIL — `owner_drawings` does not exist in type `EquityChanges` (tsc). (`npm test` alone would fail on the missing row.)

- [ ] **Step 3: Implement**

In `src/shared/types/index.ts` replace:

```ts
export interface EquityChanges {
  opening_equity: number;
  owner_contributions: number;
  net_income: number;
```

with:

```ts
export interface EquityChanges {
  opening_equity: number;
  owner_contributions: number;
  /** Prive pemilik (3-3000) periode ini, angka positif; disajikan sebagai pengurang ekuitas. */
  owner_drawings: number;
  net_income: number;
```

In `src/modules/accounting/components/StatementParts.tsx` replace:

```tsx
        <tr><td className="py-1.5 px-3">Setoran / (penarikan) modal & saldo awal</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(changes.owner_contributions)}</td></tr>
```

with:

```tsx
        <tr><td className="py-1.5 px-3">Setoran modal & saldo awal</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(changes.owner_contributions)}</td></tr>
        <tr><td className="py-1.5 px-3">Prive (pengambilan pemilik)</td><td className="py-1.5 px-3 text-right font-mono">{formatRupiah(-changes.owner_drawings)}</td></tr>
```

In `src/shared/export/registry.ts` replace:

```ts
    { label: 'Setoran / (penarikan) modal & saldo awal', value: fs.equity_changes.owner_contributions },
```

with:

```ts
    { label: 'Setoran modal & saldo awal', value: fs.equity_changes.owner_contributions },
    { label: 'Prive (pengambilan pemilik)', value: -fs.equity_changes.owner_drawings },
```

- [ ] **Step 4: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; all tests pass (F1 count + 1).

- [ ] **Step 5: Commit**

```bash
git add src/shared/types/index.ts src/modules/accounting/components/StatementParts.tsx src/shared/export/registry.ts src/shared/export/__tests__/registry.test.ts
git commit -m "feat(accounting): show owner drawings in the equity statement

SAK EMKM presents Prive as a separate deduction in the statement of changes
in equity; the server now reports it apart from capital contributions.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part D — Docs

### Task D1: Update the agent docs, roadmap and handoff; browser check

**Files:** `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/domain-pos.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`.

**Interfaces:** consumes everything above; produces nothing for code.

SP6 edits some of these lines first. Re-read each file; where a "before" line was already changed by SP6, apply the same meaning to the current text and keep SP6's wording.

- [ ] **Step 1: `AGENTS.md`**

Replace:

```md
| Cash drawer balance, store settings, payment fee settings, parked orders, cart | **Client** (localStorage `ob3_*` keys) | not scheduled |
```

with (drop "payment fee settings" too if SP6 already moved it):

```md
| Cashier shifts, drawer balance (= ledger 1-1000), cash deposits, Prive, capital injections | Server | SP2 cash & bank (done) |
| Store settings, payment fee settings, parked orders, cart | **Client** (localStorage `ob3_*` keys) | not scheduled |
```

Replace:

```md
The cash drawer counter `ob3_cash_drawer` is still client-side (roadmap sub-project 2).
```

with:

```md
The cash drawer is account 1-1000: every "Kas Laci" figure is its ledger balance, and cash checkout needs an open
cashier shift (`cash_sessions`). See [docs/ai/domain-accounting.md](docs/ai/domain-accounting.md#cash-drawer-and-shifts).
```

Replace `25 accounts (1-1002, 2-1004, 4-2000 inactive since 2026-09-30)` with `27 accounts (1-1002, 2-1004, 4-2000 inactive since 2026-09-30)`.

- [ ] **Step 2: `backend/AGENTS.md`**

Replace:

```md
  Pos/                         CheckoutService, CartLines, PosAccounts, SaleVoidService
```

with:

```md
  Pos/                         CheckoutService, CartLines, PosAccounts, SaleVoidService
  Accounting/                  ExpenseService, ManualJournalService, PeriodClosingService, OpeningBalanceService,
                               CashSessionService (shifts), CashMovementService (deposit/Prive/capital), reports
```

- [ ] **Step 3: `docs/ai/domain-accounting.md`**

1. Heading `## Chart of accounts (25 accounts)` → `## Chart of accounts (27 accounts)`.
2. After the row `| 3-2000 | Laba Ditahan Cabang 3 | EQUITY | C |` insert:

```md
| 3-3000 | Prive Pemilik (owner drawings; contra-equity, not closed by period closing) | EQUITY | D |
```

3. After the row starting `| 6-1009 | Beban MDR QRIS & EDC` insert:

```md
| 6-1010 | Selisih Kas Kasir (Lebih/Kurang): cashier over/short, posted when a shift is approved | EXPENSE | D |
```

4. In "`reference_type` values in use", replace `` `ACCOUNT_OPENING`. Reuse one of these `` with `` `ACCOUNT_OPENING`, `CASH_SESSION_VARIANCE`, `CASH_DEPOSIT`, `OWNER_DRAWING`, `CAPITAL_INJECTION`. Reuse one of these ``.
5. After the posting-rules row starting `| Account opening |` insert:

```md
| Cashier shift approved | 6-1010 (shortage) or 1-1000 (overage) | 1-1000 (shortage) or 6-1010 (overage), amount = counted − book | `Accounting/CashSessionService::approve` (`CASH_SESSION_VARIANCE`, `SHIFT-{id}`, dated the approval day; no journal when 0) |
| Cash-to-bank deposit | 1-1001 | 1-1000 | `Accounting/CashMovementService` (`CASH_DEPOSIT`, `KAS-YYYYMM-####`) |
| Owner drawing (Prive) | 3-3000 | 1-1000 or 1-1001 | `Accounting/CashMovementService` (`OWNER_DRAWING`) |
| Capital injection | 1-1000 or 1-1001 | 3-1000 | `Accounting/CashMovementService` (`CAPITAL_INJECTION`) |
```

6. Before `## Reports` insert:

```md
## Cash drawer and shifts

The drawer is account 1-1000 (only TUNAI posts there). A cashier shift (`cash_sessions`) is a window of journal ids
(`from_entry_id`, `to_entry_id`]. Expected cash = `opening_float` + Σ(debit − credit) on 1-1000 of POSTED journals in
the window, excluding `CASH_SESSION_VARIANCE`, grouped per `reference_type` (`CashSessionService::summary`, labels in
`LINE_LABELS`). The opening float must match the book balance (1-1000 + adjustments of shifts still
`PENDING_APPROVAL`) or carry an `opening_note`; closing requires `variance_reason` when counted ≠ expected. Approval
(`cash_session_approve`, a non-OWNER cannot approve their own shift) posts `adjustment = variance + opening
difference`, so afterwards 1-1000 equals the counted cash. `CashSessionService::requireOpen()` guards cash checkout
(and SP3 cash refunds). Deposits, Prive and capital are single journals from `CashMovementService` (`cash_movement`).
```

7. In the Reports list, after the `FinancialReportService` bullet add:

```md
- The statement of changes in equity reports `owner_contributions` (credit-normal equity) and `owner_drawings`
  (debit-normal equity, i.e. Prive 3-3000) separately; the cash-flow report puts both in financing (EQUITY bucket)
  and the shift variance in operating expenses (6-1010 is EXPENSE).
```

8. Delete the known-issue line `` - `ob3_cash_drawer` still differs from the 1-1000 ledger balance (roadmap sub-project 2). ``

- [ ] **Step 4: `docs/ai/domain-pos.md`**

1. In "Server flow", before `1. \`CartLines::build\`:` insert:

```md
0. If any payment is `TUNAI`, an open cashier shift is required (`CashSessionService::requireOpen()`, 422
   "Shift kasir belum dibuka…"). Transfer/QRIS-only sales need no shift.
```

2. In "Still client-side in POS" delete the line `` - Cash drawer balance (`ob3_cash_drawer`), adjusted after each sale by `cashPortion(sale)`. `` and add after the section heading's list:

```md
The POS header shows the shift control (`CashShiftControl`): open shift with a counted float, close shift with a
counted drawer; the drawer amount shown is the 1-1000 ledger balance.
```

- [ ] **Step 5: `docs/ai/api-reference.md`**

1. Replace the `cash-balances` row's permission cell `` `expenses`, `accounting_hub`, `financial_reports` `` with `` `expenses`, `accounting_hub`, `financial_reports`, `cash_session` ``.
2. Before `## Role settings` insert:

```md
## Cash shifts and cash movements ([domain-accounting.md](domain-accounting.md#cash-drawer-and-shifts))
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/cash-sessions/current` | `cash_session`, `cash_session_approve` | `{session (with lines, expected_cash) \| null, book_balance}` |
| POST | `/cash-sessions/open` | `cash_session` | `{opening_float, opening_note?}`; note required when the float ≠ book balance; one open shift at a time |
| POST | `/cash-sessions/{id}/close` | `cash_session` | `{counted_cash, variance_reason?}`; reason required for a variance; → `PENDING_APPROVAL` |
| GET | `/cash-sessions` | `cash_session_approve` | 30 newest, pending first |
| POST | `/cash-sessions/{id}/approve` | `cash_session_approve` | posts `CASH_SESSION_VARIANCE` (6-1010) unless 0; returns `{session, journals}` |
| GET | `/cash-movements` | `cash_movement` | 50 newest deposit/Prive/capital journals |
| POST | `/cash-movements` | `cash_movement` | `{type: DEPOSIT\|DRAWING\|CAPITAL, date ≤ today, amount, account_code (1-1000/1-1001, not for DEPOSIT), description}` → 201 journal |
```

- [ ] **Step 6: `docs/ai/data-model.md`**

1. Replace `Source of truth: \`backend/database/migrations/\` (22 migrations)` with the actual count (`ls backend/database/migrations | wc -l`).
2. After the `expenses` row of the Accounting table insert:

```md
| `cash_sessions` | `user_id`, `opened_at`, `opening_float`, `book_opening`, `opening_note`, `from_entry_id`, `to_entry_id`, `closed_at`, `closed_by`, `expected_cash`, `counted_cash`, `variance`, `variance_reason`, `status` (OPEN/PENDING_APPROVAL/CLOSED), `approved_by`, `approved_at`, `journal_entry_id` | cashier shifts for the single drawer (1-1000); window = journal ids in (`from_entry_id`, `to_entry_id`]; `adjustment` (= `variance` + `opening_float` − `book_opening`) is journaled on approval |
```

- [ ] **Step 7: `docs/ai/architecture.md`**

Replace `` `ob3_auth_token`, `ob3_cash_drawer`, `ob3_store_settings` `` with `` `ob3_auth_token`, `ob3_store_settings` `` and replace
`` `ob3_account_balances`, `ob3_period_info`) on mount, a one-time Stage 4 cleanup. `` with
`` `ob3_account_balances`, `ob3_period_info`) and the old drawer counter `ob3_cash_drawer` on mount. ``

- [ ] **Step 8: `docs/ai/workflow-and-gotchas.md`**

1. Replace `Remaining client-only areas (cash drawer vs 1-1000, returns/write-offs,` with `Remaining client-only areas (returns/write-offs,` (the cash drawer moved to the server in SP2).
2. After the spec-status row `| 09-29 | accounting server core (stage 4): … | done |` add:

```md
| 09-30 | cash & bank (roadmap SP2): cashier shifts, variance journal, deposits, Prive, capital | done |
```

3. Update the line `As of 2026-09-30, the frontend passes: …` with the counts printed by the final `npm test`.
4. Glossary: after `| Kas laci | cash drawer (account 1-1000) |` add:

```md
| Shift kasir / buka shift / tutup shift | cashier shift / open (count opening float) / close (count drawer) |
| Selisih kas | cash over/short (6-1010), journaled when the owner approves the shift |
| Prive | owner drawings (3-3000, contra-equity) |
| Setor bank | cash-to-bank deposit (1-1000 → 1-1001) |
```

- [ ] **Step 9: Roadmap and handoff**

In `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, directly under `## Sub-project 2 — Cash & bank` insert:

```md
> Status: **done** — spec `2026-09-30-cash-and-bank-design.md`, plan `docs/superpowers/plans/2026-09-30-cash-and-bank.md`.
```

In `docs/superpowers/plans/2026-09-30-accounting-handoff.md` replace the start of the table row
`| 2 | Cash & bank | Cashier shift open/close` with `| 2 | Cash & bank (**done**, `2026-09-30-cash-and-bank`) | Cashier shift open/close`,
and in section 1 update the backend/frontend test counts to the numbers printed by the final gates.

- [ ] **Step 10: Final gates**

Run: `cd backend && php artisan config:clear && php artisan test` → all pass.
Run: `npm run lint && npm test` → clean, all pass.

- [ ] **Step 11: Browser checklist (dev DB, `npm run dev:all`)**

1. As **kasir**: POS header shows "Buka Shift" with the ledger drawer balance. A cash sale is refused with "Shift kasir belum dibuka…"; a QRIS/transfer sale works.
2. Open the shift with the prefilled amount → toast "Shift Dibuka". Changing the amount shows "Keterangan selisih kas awal (wajib)".
3. Make a cash sale (tendered > amount) and a cash expense (as owner, Biaya Toko). The header balance changes by the net cash only.
4. Close the shift with a counted amount Rp 10.000 below expected: the reason field is required; after closing the toast says it waits for approval.
5. As **owner**: Buku Besar → "6. Kas & Bank" lists the shift first with "Setujui"; approving posts a `SELISIH KAS` journal (Dr 6-1010 / Cr 1-1000) visible under Jurnal Umum → "Kas & Modal". The header drawer balance equals the counted amount.
6. Record a deposit, a Prive from bank and a capital injection; Laporan Keuangan → Arus Kas shows Prive/capital under pendanaan and "Terekonsiliasi"; Perubahan Ekuitas shows "Prive (pengambilan pemilik)"; Posisi Keuangan stays "Seimbang".
7. `localStorage.getItem('ob3_cash_drawer')` in the console returns `null`. No console errors; as gudang no drawer chip and no 403 noise.

- [ ] **Step 12: Commit**

```bash
git add AGENTS.md backend/AGENTS.md docs/ai/domain-accounting.md docs/ai/domain-pos.md docs/ai/api-reference.md docs/ai/data-model.md docs/ai/architecture.md docs/ai/workflow-and-gotchas.md docs/superpowers/specs/2026-09-29-accounting-roadmap.md docs/superpowers/plans/2026-09-30-accounting-handoff.md
git commit -m "docs(accounting): describe cashier shifts, cash movements and prive

Agents need to know the drawer is now the 1-1000 ledger with server shifts,
and the roadmap/handoff should record sub-project 2 as done.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
