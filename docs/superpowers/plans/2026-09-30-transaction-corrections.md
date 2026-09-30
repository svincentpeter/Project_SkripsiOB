# Transaction Corrections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add partial sales returns (cash refund from the drawer), purchase returns and goods-receipt cancellation, and close the ledger-vs-FIFO leaks (FIFO shortfall, void of unallocated units, manual goods lines, re-runnable inventory opening balance, post-go-live Excel stock rebuilds, batch cost edits, unvalidated payment dates).

**Architecture:** Backend first. B1 adds the account 4-9100 and the two permission keys; B2 tightens dates; B3–B5 fix the FIFO/ledger leaks in the existing services; B6 and B7 add the two new document flows (`SalesReturnService`, `PurchaseReturnService`) with their tables, models, routes and journals; B8 wires cash refunds into SP2's shift expected cash. Frontend next: F1 types/API/permissions, F2 sales return UI, F3 purchase return UI, F4 service-only manual item form. D1 updates the docs. Every posting goes through `JournalDraft` → `AccountingEngine::createEntry`.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-transaction-corrections-design.md`.

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md`, `docs/ai/domain-inventory.md` and `docs/ai/domain-accounting.md` before starting, plus the spec above and `.superpowers/sdd/roadmap-allocation.md`.
- This plan executes **after SP6 (payment hardening) and SP2 (cash & bank)**. Edit anchors are written against HEAD `210cdf0`; where SP6/SP2 changed the same file, the anchor lines quoted here are ones they do not touch, except the permission-key lists (B1, F1), which SP2 extends — append the SP3 keys after whatever SP2 left. Rely on SP2 only for what the allocation file lists: table `cash_sessions` (`id`, `user_id`, `opened_at`, `closed_at`, `opening_float`, `expected_cash`, `counted_cash`, `variance`, `variance_reason`, `status` OPEN|PENDING_APPROVAL|CLOSED, `approved_by`, `approved_at`, `journal_entry_id`), at most one `OPEN` row.
- **Never stage, modify or revert** `docs/flowchart_local/` or anything under `docs/flowchart/`. Do not touch files outside this plan's File Map. Run `git status --short` before each commit; stage files **by explicit path** only (never `git add -A`, `git add .`, `git commit -a`).
- Execute tasks in order B1 → B8, F1 → F4, D1. Each task leaves both gates green and is committed on its own.
- Commits go directly on `main`: Conventional Commits with a scope, English, lowercase imperative subject, a short body explaining why, and the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- All user-facing text (UI, validation and error messages) is Indonesian.
- Journals are only written through `AccountingEngine::createEntry` (directly or via `JournalDraft`). Never insert `journal_entries`/`journal_items` by hand, not even in tests.
- Business-rule violations throw `App\Exceptions\PosRuleException` (422 `{message}`). API envelope `{ "success": true, "message"?: "...", "data": ... }`; create returns 201.
- Account codes, migration prefix, reference types and permission keys come from the allocation file: account `4-9100 Retur Penjualan` (REVENUE, normal DEBIT); migrations `2026_10_03_*`; reference types `SALES_RETURN`, `PURCHASE_RETURN`, `GOODS_RECEIPT_CANCEL`; permission keys `sales_return` (KASIR true), `purchase_return` (GUDANG true).
- New backend test classes use `Illuminate\Foundation\Testing\DatabaseTransactions`. Never name a test helper `post()` (it collides with Laravel's `TestCase::post()`).
- New backend tests that check out a sale pay with `TRANSFER_BCA`, so SP2's "TUNAI needs an OPEN cash session" rule does not interfere. Sales-return tests open a session through the `OpensReturnCashSession` trait (B6).
- Every stock test asserts `InventoryValueJournal::summary()['difference'] == 0` after the operation (use `AlignsInventoryLedger::alignInventoryLedger()` from B3 to start aligned).
- After adding a migration, migrate the **testing DB** (`cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force`; PowerShell `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`) **and the dev DB** (`cd backend && php artisan migrate --force`); all three migrations in this plan are additive.
- Gates: backend `cd backend && php artisan config:clear && php artisan test` (the local `composer test` script is broken); frontend `npm run lint && npm test` (repo root). Laragon MySQL must be running.
- Frontend business dates use `localDate()` from `src/services/accountingPeriod.ts`, never `toISOString()`, in any code you add.
- Commands use Git Bash syntax from the repo root `C:\laragon\www\Project_SkripsiOB` unless a `cd` is shown.

## File Map

Backend (create):
- `backend/database/migrations/2026_10_03_000001_add_sales_return_account_and_permissions.php` (B1)
- `backend/database/migrations/2026_10_03_000002_create_sales_returns_tables.php` (B6)
- `backend/database/migrations/2026_10_03_000003_create_purchase_returns_tables.php` (B7)
- `backend/app/Models/SalesReturn.php`, `backend/app/Models/SalesReturnItem.php` (B6)
- `backend/app/Models/PurchaseReturn.php`, `backend/app/Models/PurchaseReturnItem.php` (B7)
- `backend/app/Services/Pos/SalesReturnService.php` (B6), `backend/app/Services/Inventory/PurchaseReturnService.php` (B7)
- `backend/tests/Concerns/AlignsInventoryLedger.php` (B3), `backend/tests/Concerns/OpensReturnCashSession.php` (B6)
- Tests: `backend/tests/Feature/ReturnPermissionsTest.php` (B1), `DocumentDateValidationTest.php` (B2), `FifoIntegrityTest.php` (B3), `InventoryGoLiveGuardTest.php` (B5), `SalesReturnTest.php` (B6), `PurchaseReturnTest.php` (B7)

Backend (modify): `app/Support/Permissions.php`, `database/seeders/AccountCoaSeeder.php`, `app/Services/Accounting/PeriodLock.php`, `app/Services/Inventory/PayableService.php`, `app/Http/Controllers/Api/v1/PurchaseController.php`, `app/Http/Requests/PayDebtRequest.php`, `app/Http/Controllers/Api/v1/InventoryController.php`, `app/Services/FifoCostingService.php`, `app/Services/Inventory/GoodsReceiptService.php`, `app/Services/Inventory/StockOpnameService.php`, `app/Services/Pos/SaleVoidService.php`, `app/Services/Pos/CartLines.php`, `app/Services/Pos/CheckoutService.php`, `app/Services/Inventory/InventoryValueJournal.php`, `app/Services/Inventory/StockOpnameCommitService.php`, `app/Services/Inventory/StockSelectiveUpdateService.php`, `app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php`, `routes/console.php`, `routes/api.php`, `app/Http/Controllers/Api/v1/PosController.php`, `app/Models/Sale.php`, `app/Models/SaleBatchAllocation.php`, `app/Models/Purchase.php`, `app/Http/Controllers/Api/v1/AccountingReportController.php`, the SP2 service that computes a shift's expected cash (B8, located by grep), tests `Unit/UserPermissionTest.php`, `Feature/PosCheckoutTest.php`, `Feature/InventoryValuationTest.php`, `Feature/GoodsReceiptTest.php`, `Feature/InventoryAdjustmentJournalTest.php`, `Feature/ProductMasterTest.php`, `Feature/StockOpnameTest.php`.

Frontend (create): `src/modules/receipt/components/SalesReturnModal.tsx` (F2), `src/modules/inventory/components/PurchaseReturnModal.tsx` (F3), `src/services/__tests__/stockReconciliationApi.test.ts` (F1).

Frontend (modify): `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/services/api/posMappers.ts`, `src/services/api/posApi.ts`, `src/services/api/inventoryMappers.ts`, `src/services/api/inventoryApi.ts`, `src/services/api/stockReconciliationApi.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/modules/receipt/ThermalReceiptScreen.tsx`, `src/modules/inventory/InventoryScreen.tsx`, `src/modules/inventory/components/StockOpnameReceiptView.tsx`, `src/modules/inventory/components/index.ts`, `src/modules/pos/components/ManualItemForm.tsx` (full replacement), `src/App.tsx`, tests `src/services/__tests__/posMappers.test.ts`, `src/services/__tests__/authNavigationService.test.ts`.

Docs (modify, D1): `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/domain-inventory.md`, `docs/ai/domain-pos.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`.

---

# Part B — Backend

### Task B1: Account 4-9100 and the return permission keys

**Files:**
- Create: `backend/database/migrations/2026_10_03_000001_add_sales_return_account_and_permissions.php`, `backend/tests/Feature/ReturnPermissionsTest.php`
- Modify: `backend/database/seeders/AccountCoaSeeder.php`, `backend/app/Support/Permissions.php`, `backend/tests/Unit/UserPermissionTest.php`

**Interfaces:**
- Produces: COA account `4-9100` (REVENUE, DEBIT, active); `Permissions::KEYS` contains `sales_return`, `purchase_return`; `Permissions::DEFAULTS['KASIR']` contains `sales_return`, `Permissions::DEFAULTS['GUDANG']` contains `purchase_return`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/ReturnPermissionsTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

/**
 * Retur penjualan (kasir) dan retur pembelian (gudang): akun kontra pendapatan 4-9100 dan izin default.
 */
class ReturnPermissionsTest extends TestCase
{
    use DatabaseTransactions;

    public function test_sales_return_account_is_an_active_contra_revenue(): void
    {
        $this->assertDatabaseHas('accounts', [
            'account_code' => '4-9100',
            'account_name' => 'Retur Penjualan',
            'account_type' => 'REVENUE',
            'normal_balance' => 'DEBIT',
            'is_active' => true,
        ]);
    }

    public function test_kasir_may_return_sales_and_gudang_may_return_purchases_by_default(): void
    {
        $kasir = $this->actingAsRole('KASIR');
        $this->assertTrue($kasir->hasPermission('sales_return'));
        $this->assertFalse($kasir->hasPermission('purchase_return'));

        $gudang = $this->actingAsRole('GUDANG');
        $this->assertTrue($gudang->hasPermission('purchase_return'));
        $this->assertFalse($gudang->hasPermission('sales_return'));
    }

    public function test_owner_can_toggle_the_new_keys(): void
    {
        $this->putJson('/api/v1/settings/role-permissions', ['KASIR' => ['sales_return' => false]])->assertOk();
        $this->assertFalse($this->actingAsRole('KASIR')->hasPermission('sales_return'));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan config:clear && php artisan test --filter=ReturnPermissionsTest`
Expected: FAIL — account 4-9100 missing; `hasPermission('sales_return')` false; the PUT answers 422 (unknown key).

- [ ] **Step 3: Add the migration**

Create `backend/database/migrations/2026_10_03_000001_add_sales_return_account_and_permissions.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Retur penjualan dibukukan ke 4-9100 (kontra pendapatan, saldo normal debit). Izin baru sales_return (kasir) dan
 * purchase_return (gudang) disisipkan bila belum ada, tanpa menimpa pilihan Owner.
 */
return new class extends Migration
{
    private const DEFAULTS = [
        'sales_return' => ['KASIR' => true, 'GUDANG' => false],
        'purchase_return' => ['KASIR' => false, 'GUDANG' => true],
    ];

    public function up(): void
    {
        if (! DB::table('accounts')->where('account_code', '4-9100')->exists()) {
            DB::table('accounts')->insert([
                'account_code' => '4-9100',
                'account_name' => 'Retur Penjualan',
                'account_type' => 'REVENUE',
                'normal_balance' => 'DEBIT',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach (self::DEFAULTS as $key => $roles) {
            foreach ($roles as $role => $allowed) {
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
        DB::table('role_permissions')->whereIn('permission_key', array_keys(self::DEFAULTS))->delete();
        DB::table('accounts')
            ->where('account_code', '4-9100')
            ->whereNotExists(fn ($q) => $q->from('journal_items')->whereColumn('journal_items.account_id', 'accounts.id'))
            ->delete();
    }
};
```

- [ ] **Step 4: Add the account to the seeder**

In `backend/database/seeders/AccountCoaSeeder.php`, after the line

```php
            ['account_code' => '4-9000', 'account_name' => 'Potongan Diskon Penjualan', 'account_type' => 'REVENUE', 'normal_balance' => 'DEBIT'],
```

insert

```php
            ['account_code' => '4-9100', 'account_name' => 'Retur Penjualan', 'account_type' => 'REVENUE', 'normal_balance' => 'DEBIT'],
```

- [ ] **Step 5: Add the permission keys**

In `backend/app/Support/Permissions.php` (HEAD shown; SP2 has appended `cash_session`, `cash_session_approve`, `cash_movement` — keep them and add the SP3 keys **after** the last key):

Before (HEAD):

```php
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];
```

After (SP3 part; the SP2 keys stay where SP2 put them):

```php
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
        // …SP2 keys…
        'sales_return', 'purchase_return',
    ];
```

In `DEFAULTS`, add `'sales_return'` to the KASIR list and `'purchase_return'` to the GUDANG list (keep SP2's `cash_session` in KASIR):

```php
    public const DEFAULTS = [
        'KASIR' => ['pos', 'receipt', /* …SP2 keys… */ 'sales_return'],
        'GUDANG' => ['inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname', 'purchase_return'],
    ];
```

(Write the real SP2 key literals in place of the `/* …SP2 keys… */` comment; do not leave the comment in the code.)

- [ ] **Step 6: Update the permission-count assertion**

In `backend/tests/Unit/UserPermissionTest.php` the auth-array test asserts the number of keys. Increase it by 2 from the value SP2 left (HEAD 13, SP2 +3 → 16, SP3 → 18):

```php
        $this->assertCount(18, $data['permissions']);
```

and add below the `sale_void` assertion:

```php
        $this->assertFalse($data['permissions']['sales_return']);
        $this->assertTrue($data['permissions']['purchase_return']);
```

- [ ] **Step 7: Migrate both databases and run the tests**

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force
php artisan config:clear && php artisan test --filter='ReturnPermissionsTest|UserPermissionTest'
```

Expected: PASS. Then the full gate `php artisan config:clear && php artisan test` — all green.

- [ ] **Step 8: Commit**

```bash
git add backend/database/migrations/2026_10_03_000001_add_sales_return_account_and_permissions.php backend/database/seeders/AccountCoaSeeder.php backend/app/Support/Permissions.php backend/tests/Feature/ReturnPermissionsTest.php backend/tests/Unit/UserPermissionTest.php
git commit -m "feat(accounting): add the sales return account and return permissions" -m "Sales returns need a contra revenue account (4-9100) and both return flows need their own permission keys so cashiers and warehouse staff can be granted them separately.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B2: Date validation for payments and goods receipts

**Files:**
- Create: `backend/tests/Feature/DocumentDateValidationTest.php`
- Modify: `backend/app/Services/Accounting/PeriodLock.php`, `backend/app/Services/Inventory/PayableService.php`, `backend/app/Http/Controllers/Api/v1/PurchaseController.php`, `backend/app/Http/Requests/PayDebtRequest.php`, `backend/app/Http/Controllers/Api/v1/InventoryController.php`

**Interfaces:**
- Produces: `PeriodLock::assertOpen(string $date)` accepts any parseable date/datetime; `PayableService::pay` rejects a payment dated before the invoice's `purchase_date` (422).

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/DocumentDateValidationTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Models\Supplier;
use App\Services\Accounting\PeriodLock;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Tanggal dokumen: pembayaran di antara tanggal faktur dan hari ini, penerimaan barang tidak di masa depan,
 * dan kunci periode membandingkan tanggal yang sudah dinormalkan.
 */
class DocumentDateValidationTest extends TestCase
{
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function tempoReceipt(Supplier $supplier): int
    {
        return $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $this->makeProduct()->id, 'quantity' => 2, 'batch_cost' => 500000,
            'purchase_date' => '2026-09-20', 'supplier_id' => $supplier->id, 'payment_method' => 'TEMPO',
        ])->assertCreated()->json('data.purchase.id');
    }

    public function test_period_lock_compares_normalized_dates(): void
    {
        $this->postJson('/api/v1/accounting/periods/close', ['period' => '2020-01'])->assertCreated();

        $this->expectException(PosRuleException::class);
        PeriodLock::assertOpen('2020-01-31 10:00:00');
    }

    public function test_payment_date_must_fall_between_invoice_date_and_today(): void
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-'.uniqid(), 'supplier_name' => 'PT Tanggal '.uniqid(),
            'phone' => '0811', 'payment_terms_days' => 30, 'is_active' => true,
        ]);
        $id = $this->tempoReceipt($supplier);

        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 100000, 'account_code' => '1-1001', 'payment_date' => '2026-09-19'])
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sebelum tanggal faktur'));

        $tomorrow = now()->addDay()->toDateString();
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 100000, 'account_code' => '1-1001', 'payment_date' => $tomorrow])
            ->assertStatus(422)->assertJsonValidationErrors('payment_date');
        $this->postJson('/api/v1/accounting/accounts-payable/pay', [
            'supplier_id' => $supplier->id, 'amount' => 100000, 'payment_method' => 'BANK_BCA', 'payment_date' => $tomorrow,
        ])->assertStatus(422)->assertJsonValidationErrors('payment_date');

        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 100000, 'account_code' => '1-1001', 'payment_date' => '2026-09-20'])
            ->assertCreated();
    }

    public function test_goods_receipt_date_cannot_be_in_the_future(): void
    {
        $product = $this->makeProduct();

        $this->postJson('/api/v1/inventory/restock', [
            'product_id' => $product->id, 'quantity' => 1, 'batch_cost' => 500000, 'source_name' => 'Toko Grosir',
            'payment_method' => 'TUNAI', 'purchase_date' => now()->addDay()->toDateString(),
        ])->assertStatus(422)->assertJsonValidationErrors('purchase_date');

        $this->assertSame(10, $product->fresh()->product_quantity);
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan test --filter=DocumentDateValidationTest`
Expected: FAIL — no exception for the datetime string; the early and future payments are accepted (201); the future receipt is accepted.

- [ ] **Step 3: Normalize the lock compare**

In `backend/app/Services/Accounting/PeriodLock.php` replace

```php
    public static function assertOpen(string $date): void
    {
        $lock = self::lockDate();
```

with

```php
    public static function assertOpen(string $date): void
    {
        // Bandingkan sebagai Y-m-d: string tanggal-waktu atau format lain membuat perbandingan teks salah.
        $date = Carbon::parse($date)->toDateString();
        $lock = self::lockDate();
```

(`Illuminate\Support\Carbon` is already imported.)

- [ ] **Step 4: Guard the payment date in the service**

In `backend/app/Services/Inventory/PayableService.php`:

Add the import after `use App\Services\JournalDraft;`:

```php
use Illuminate\Support\Carbon;
```

Replace

```php
            $date = $data['payment_date'] ?? now()->toDateString();
            $journal = (new JournalDraft())
```

with

```php
            $date = Carbon::parse($data['payment_date'] ?? now())->toDateString();
            $invoiceDate = $purchase->purchase_date->toDateString();
            if ($date < $invoiceDate) {
                throw new PosRuleException("Tanggal pembayaran {$date} sebelum tanggal faktur {$invoiceDate}.");
            }
            $journal = (new JournalDraft())
```

- [ ] **Step 5: Reject future dates at the request boundary**

In `backend/app/Http/Controllers/Api/v1/PurchaseController.php` replace

```php
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'account_code' => ['required', Rule::in(['1-1000', '1-1001'])],
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string|max:255',
        ]);
```

with

```php
        $data = $request->validate([
            'amount' => 'required|numeric|min:1',
            'account_code' => ['required', Rule::in(['1-1000', '1-1001'])],
            'payment_date' => 'nullable|date|before_or_equal:today',
            'notes' => 'nullable|string|max:255',
        ], ['payment_date.before_or_equal' => 'Tanggal pembayaran tidak boleh melebihi hari ini.']);
```

In `backend/app/Http/Requests/PayDebtRequest.php` replace

```php
            'payment_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ];
    }
```

with

```php
            'payment_date' => 'nullable|date|before_or_equal:today',
            'notes' => 'nullable|string',
        ];
    }

    public function messages(): array
    {
        return ['payment_date.before_or_equal' => 'Tanggal pembayaran tidak boleh melebihi hari ini.'];
    }
```

In `backend/app/Http/Controllers/Api/v1/InventoryController.php` (method `restock`) replace

```php
            'purchase_date' => 'nullable|date',
```

with

```php
            'purchase_date' => 'nullable|date|before_or_equal:today',
```

and replace the closing of that `validate([` call

```php
            'notes' => 'nullable|string|max:255',
        ]);

        $out = $receipts->receive($validated, $request->user());
```

with

```php
            'notes' => 'nullable|string|max:255',
        ], ['purchase_date.before_or_equal' => 'Tanggal penerimaan barang tidak boleh melebihi hari ini.']);

        $out = $receipts->receive($validated, $request->user());
```

- [ ] **Step 6: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter='DocumentDateValidationTest|GoodsReceiptTest|PeriodClosingTest'`
Expected: PASS. Then the full gate — all green.

- [ ] **Step 7: Commit**

```bash
git add backend/app/Services/Accounting/PeriodLock.php backend/app/Services/Inventory/PayableService.php backend/app/Http/Controllers/Api/v1/PurchaseController.php backend/app/Http/Requests/PayDebtRequest.php backend/app/Http/Controllers/Api/v1/InventoryController.php backend/tests/Feature/DocumentDateValidationTest.php
git commit -m "fix(accounting): validate payment and receipt dates against the document" -m "A supplier payment could be dated before its invoice or in the future, a goods receipt could be future-dated, and the period lock compared raw strings, so a datetime slipped past a closed month.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B3: Keep the ledger equal to FIFO on sales, opname and void

**Files:**
- Create: `backend/tests/Concerns/AlignsInventoryLedger.php`, `backend/tests/Feature/FifoIntegrityTest.php`
- Modify: `backend/app/Services/FifoCostingService.php`, `backend/app/Services/Inventory/GoodsReceiptService.php`, `backend/app/Services/Inventory/StockOpnameService.php`, `backend/app/Services/Pos/SaleVoidService.php`

**Interfaces:**
- Produces: `FifoCostingService::centLayers(int $qty, int $cents): array` → `list<array{0: int, 1: float}>` (`[qty, unit cost]`, Σ qty × cost = cents/100 exactly); `allocateFifo()` throws `PosRuleException` when Σ remaining_qty < requested; test trait `Tests\Concerns\AlignsInventoryLedger::alignInventoryLedger(): void`.

- [ ] **Step 1: Add the test trait**

Create `backend/tests/Concerns/AlignsInventoryLedger.php`:

```php
<?php

namespace Tests\Concerns;

use App\Services\AccountingEngine;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\JournalDraft;

/**
 * DB test dipakai bersama, jadi sisa data test lain bisa membuat 1-2000 ≠ nilai FIFO. Trait ini membukukan
 * selisihnya sebagai TEST_ALIGN (lewat engine) agar test mulai dari buku yang selaras, tanpa memakai saldo awal
 * persediaan yang hanya boleh dibukukan sekali.
 */
trait AlignsInventoryLedger
{
    protected function alignInventoryLedger(): void
    {
        $gap = InventoryValueJournal::summary()['difference'];
        $draft = new JournalDraft();
        if ($gap > 0) {
            $draft->debit('1-2000', $gap, 'Penyelarasan test')->credit('3-1000', $gap, 'Penyelarasan test');
        } elseif ($gap < 0) {
            $draft->debit('3-1000', -$gap, 'Penyelarasan test')->credit('1-2000', -$gap, 'Penyelarasan test');
        }
        if (! $draft->isEmpty()) {
            $draft->post(app(AccountingEngine::class), 'TEST_ALIGN', 'TEST-ALIGN', 'Penyelarasan nilai FIFO untuk test');
        }

        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }
}
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/Feature/FifoIntegrityTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\ProductBatch;
use App\Models\SaleBatchAllocation;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Buku 1-2000 harus selalu sama dengan Σ sisa × modal batch: penjualan tanpa lapisan FIFO ditolak,
 * opname memperbaiki lapisan, dan void memulihkan unit tanpa baris alokasi senilai HPP yang dulu dijurnal.
 */
class FifoIntegrityTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function transferSale($product, int $qty)
    {
        return $this->checkout([
            'items' => [$this->productLine($product, $qty)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000 * $qty]],
        ]);
    }

    public function test_sale_beyond_fifo_layers_is_rejected_and_opname_repairs_the_layers(): void
    {
        $product = $this->makeProduct(1000000, [[3, 500000, '2026-08-01']]);
        $product->update(['product_quantity' => 5]); // drift lama: 2 unit tanpa batch
        $this->alignInventoryLedger();

        $this->transferSale($product, 4)
            ->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'berlapis biaya FIFO'));
        $this->assertSame(5, $product->fresh()->product_quantity);
        $this->assertSame(3, (int) $product->batches()->sum('remaining_qty'));

        $this->postJson('/api/v1/inventory/stock-opname', ['items' => [['product_id' => $product->id, 'physical_qty' => 5]]])
            ->assertOk()
            ->assertJsonPath('data.adjustments.0.difference', 0);
        $this->assertSame(5, (int) $product->batches()->sum('remaining_qty'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->transferSale($product, 4)->assertCreated()->assertJsonPath('data.total_hpp', 2000000);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_void_restores_units_without_an_allocation_at_their_booked_cost(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $sale = $this->transferSale($product, 2)->assertCreated();

        // Simulasi alokasi yang hilang (HPP cadangan lama / terhapus impor Excel): baris batch 600rb dibuang.
        $newer = $product->batches()->orderByDesc('purchase_date')->first();
        SaleBatchAllocation::where('product_batch_id', $newer->id)->delete();

        $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Salah input ukuran'])->assertOk();

        $this->assertSame(6, $product->fresh()->product_quantity);
        $restored = ProductBatch::where('product_id', $product->id)->where('batch_code', 'like', 'VOID-%')->get();
        $this->assertSame(1, (int) $restored->sum('initial_qty'));
        $this->assertEquals(600000, (float) $restored->first()->batch_cost);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && php artisan test --filter=FifoIntegrityTest`
Expected: FAIL — the 4-unit sale is accepted (201, costed at `product_cost`), and after the void the valuation difference is −600000.

- [ ] **Step 4: Stop the FIFO fallback and add `centLayers`**

In `backend/app/Services/FifoCostingService.php` replace

```php
            $totalAvailable = $batches->sum('remaining_qty');

            if ($totalAvailable < $quantityToDeduct) {
                // If batches don't have enough recorded layers, fallback to product_cost for the difference
                // but let's allocate what we have
            }
```

with

```php
            $totalAvailable = (int) $batches->sum('remaining_qty');
            if ($totalAvailable < $quantityToDeduct) {
                // Tanpa lapisan biaya, HPP tidak terukur FIFO dan 1-2000 akan menyimpang dari nilai batch.
                throw new PosRuleException(
                    "Stok {$product->product_name} hanya punya {$totalAvailable} unit berlapis biaya FIFO (diminta {$quantityToDeduct}). "
                    .'Lakukan stock opname untuk menyelaraskan stok.'
                );
            }
```

and delete this block entirely:

```php
            // If there's still unmet quantity (e.g. stock exists without batch layer), use product_cost
            if ($needed > 0) {
                $fallbackUnitCost = (float) $product->product_cost;
                $fallbackLineCost = round($needed * $fallbackUnitCost, 2);
                $totalCogs += $fallbackLineCost;

                $allocations[] = [
                    'product_batch_id' => null,
                    'batch_code' => 'DEFAULT_COST',
                    'quantity_allocated' => $needed,
                    'unit_cost' => $fallbackUnitCost,
                    'total_cost' => $fallbackLineCost,
                ];
            }

```

Then add this method before `public function addBatch(`:

```php
    /**
     * Bagi total (dalam sen) ke lapisan batch: (qty − sisa) unit di modal dasar dan `sisa` unit di modal dasar + Rp 0,01,
     * karena batch_cost hanya 2 desimal. Σ(qty × modal) = total persis, sehingga nilai FIFO = jurnal.
     *
     * @return list<array{0: int, 1: float}>
     */
    public static function centLayers(int $qty, int $cents): array
    {
        $base = intdiv($cents, $qty);
        $rest = $cents % $qty;
        $layers = [[$qty - $rest, $base / 100]];
        if ($rest > 0) {
            $layers[] = [$rest, ($base + 1) / 100];
        }

        return $layers;
    }

```

- [ ] **Step 5: Reuse `centLayers` in the goods receipt**

In `backend/app/Services/Inventory/GoodsReceiptService.php` replace

```php
        $base = intdiv($cents, $qty);
        $rest = $cents % $qty;
        $layers = [[$qty - $rest, $base / 100]];
        if ($rest > 0) {
            $layers[] = [$rest, ($base + 1) / 100];
        }

        return [$total, $layers];
```

with

```php
        return [$total, FifoCostingService::centLayers($qty, $cents)];
```

- [ ] **Step 6: Let stock opname repair the FIFO layers**

In `backend/app/Services/Inventory/StockOpnameService.php` replace

```php
                $system = (int) $product->product_quantity;
                $physical = (int) $item['physical_qty'];
                $diff = $physical - $system;
                if ($diff === 0) {
                    continue;
                }

                $diff < 0
                    ? $this->consumeOldest($product, -$diff)
                    : $this->addSurplusBatch($product, $diff, $reference);

                $product->update(['product_quantity' => $physical]);

                StockMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => $diff > 0 ? 'MASUK' : 'KELUAR',
                    'quantity' => abs($diff),
                    'balance_after' => $physical,
                    'reference_type' => 'STOCK_OPNAME',
                    'reference_id' => $reference,
                    'description' => 'Stock opname: sistem '.$system.', fisik '.$physical.($notes ? " ({$notes})" : ''),
                    'operator_name' => $user?->name ?? 'Admin Opname',
                    'branch_id' => $product->branch_id ?? 3,
                ]);
```

with

```php
                $system = (int) $product->product_quantity;
                $physical = (int) $item['physical_qty'];
                $diff = $physical - $system;
                // Lapisan FIFO dicocokkan ke hitungan fisik juga, sehingga stok tanpa batch (drift lama) ikut terkoreksi.
                $layerDiff = $physical - (int) ProductBatch::where('product_id', $product->id)->sum('remaining_qty');
                if ($diff === 0 && $layerDiff === 0) {
                    continue;
                }

                if ($layerDiff < 0) {
                    $this->consumeOldest($product, -$layerDiff);
                } elseif ($layerDiff > 0) {
                    $this->addSurplusBatch($product, $layerDiff, $reference);
                }

                $product->update(['product_quantity' => $physical]);

                if ($diff !== 0) {
                    StockMovement::create([
                        'product_id' => $product->id,
                        'movement_type' => $diff > 0 ? 'MASUK' : 'KELUAR',
                        'quantity' => abs($diff),
                        'balance_after' => $physical,
                        'reference_type' => 'STOCK_OPNAME',
                        'reference_id' => $reference,
                        'description' => 'Stock opname: sistem '.$system.', fisik '.$physical.($notes ? " ({$notes})" : ''),
                        'operator_name' => $user?->name ?? 'Admin Opname',
                        'branch_id' => $product->branch_id ?? 3,
                    ]);
                }
```

- [ ] **Step 7: Restore unallocated units on void**

In `backend/app/Services/Pos/SaleVoidService.php`:

Replace the imports

```php
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
```

with

```php
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\FifoCostingService;
```

Replace

```php
            $product = Product::lockForUpdate()->find($detail->product_id);
            if (! $product) {
                continue;
            }
            $product->increment('product_quantity', $detail->quantity);
```

with

```php
            $product = Product::lockForUpdate()->find($detail->product_id);
            if (! $product) {
                continue;
            }
            $this->restoreUnallocated($sale, $detail, $product);
            $product->increment('product_quantity', $detail->quantity);
```

and add this method before `private function postReversal(`:

```php
    /**
     * Unit tanpa baris alokasi (HPP cadangan lama, atau alokasi terhapus impor Excel) kembali sebagai batch baru senilai
     * HPP yang dulu dijurnal, sehingga Dr 1-2000 pada jurnal pembalik sama dengan nilai FIFO yang dipulihkan.
     */
    private function restoreUnallocated(Sale $sale, SaleDetail $detail, Product $product): void
    {
        $units = $detail->quantity - (int) $detail->allocations->sum('quantity_allocated');
        if ($units <= 0) {
            return;
        }

        $cents = (int) round(((float) $detail->total_cost_hpp - (float) $detail->allocations->sum('total_cost')) * 100);
        foreach (FifoCostingService::centLayers($units, max(0, $cents)) as $i => [$qty, $cost]) {
            ProductBatch::create([
                'product_id' => $product->id,
                'batch_code' => "VOID-{$sale->reference}-{$detail->id}-{$i}",
                'source_name' => "Pengembalian void {$sale->reference}",
                'purchase_date' => $sale->date->toDateString(),
                'batch_cost' => $cost,
                'initial_qty' => $qty,
                'remaining_qty' => $qty,
                'branch_id' => $product->branch_id ?? 3,
            ]);
        }
    }

```

- [ ] **Step 8: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter='FifoIntegrityTest|FifoCostingServiceTest|PosVoidTest|PosCheckoutTest|StockOpnameTest|GoodsReceiptTest|InventoryAdjustmentJournalTest'`
Expected: PASS. Then the full gate — all green.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Services/FifoCostingService.php backend/app/Services/Inventory/GoodsReceiptService.php backend/app/Services/Inventory/StockOpnameService.php backend/app/Services/Pos/SaleVoidService.php backend/tests/Concerns/AlignsInventoryLedger.php backend/tests/Feature/FifoIntegrityTest.php
git commit -m "fix(inventory): keep the ledger equal to fifo on sales, opname and void" -m "A sale beyond the batch layers credited 1-2000 at product_cost without consuming any batch, and a void of such a sale restored quantity but no batch. Short sales now fail with a hint to run opname, opname repairs the layers, and void rebuilds unallocated units at their booked cost.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B4: Manual POS lines are services only

**Files:**
- Modify: `backend/app/Services/Pos/CartLines.php`, `backend/app/Services/Pos/CheckoutService.php`, `backend/tests/Feature/PosCheckoutTest.php`

**Interfaces:**
- Produces: `CartLines::build()` lines no longer carry `manual_cost`; a line `type PRODUCT` with `is_manual` true throws `PosRuleException`; `sales.total_hpp` always equals the journaled 5-1000.

- [ ] **Step 1: Update the tests first**

In `backend/tests/Feature/PosCheckoutTest.php` (method `test_service_and_manual_lines`) replace

```php
                ['type' => 'PRODUCT', 'is_manual' => true, 'name' => 'Pentil Racing', 'quantity' => 4, 'unit_price' => 25000, 'cost_price' => 10000],
```

with

```php
                ['type' => 'SERVICE', 'is_manual' => true, 'name' => 'Tambal Tubeless', 'quantity' => 4, 'unit_price' => 25000, 'cost_price' => 10000],
```

and replace

```php
            ->assertJsonPath('data.items.1.total_cost_hpp', 40000)
            ->assertJsonPath('data.total_hpp', 40000);

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(150000, $j['4-1001']['credit']);
        $this->assertEquals(100000, $j['4-1000']['credit']);
        $this->assertArrayNotHasKey('5-1000', $j, 'HPP item manual tidak dijurnal ke persediaan');
```

with

```php
            ->assertJsonPath('data.items.1.total_cost_hpp', 0)
            ->assertJsonPath('data.total_hpp', 0)
            ->assertJsonPath('data.total_profit', 250000);

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(250000, $j['4-1001']['credit']);
        $this->assertArrayNotHasKey('4-1000', $j);
        $this->assertArrayNotHasKey('5-1000', $j, 'Jasa manual tidak punya HPP');
```

In `test_zero_value_manual_line_checkout_succeeds_without_journal` replace

```php
            'items' => [['type' => 'PRODUCT', 'is_manual' => true, 'name' => 'Pentil Bonus', 'quantity' => 1, 'unit_price' => 0, 'cost_price' => 0]],
```

with

```php
            'items' => [['type' => 'SERVICE', 'is_manual' => true, 'name' => 'Cek Angin Gratis', 'quantity' => 1, 'unit_price' => 0]],
```

Add a new test method after `test_zero_value_manual_line_checkout_succeeds_without_journal`:

```php
    public function test_manual_goods_line_is_rejected_without_side_effects(): void
    {
        $product = $this->makeProduct();

        $this->checkout([
            'items' => [
                $this->productLine($product),
                ['type' => 'PRODUCT', 'is_manual' => true, 'name' => 'Velg Non-Katalog', 'quantity' => 1, 'unit_price' => 500000, 'cost_price' => 300000],
            ],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1500000]],
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'belum terdaftar di katalog'));

        $this->assertSame(10, $product->fresh()->product_quantity);
    }
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter=PosCheckoutTest`
Expected: FAIL — `total_cost_hpp` 40000 instead of 0, and the manual goods line is accepted (201).

- [ ] **Step 3: Reject manual goods in `CartLines`**

In `backend/app/Services/Pos/CartLines.php` replace

```php
            $name = trim((string) $item['name']);

            if ($type === 'PRODUCT' && ! $isManual) {
```

with

```php
            $name = trim((string) $item['name']);

            // Barang harus lewat katalog + penerimaan barang agar punya HPP FIFO; item manual hanya jasa (4-1001, tanpa HPP).
            if ($type === 'PRODUCT' && $isManual) {
                throw new PosRuleException("Barang \"{$name}\" belum terdaftar di katalog. Daftarkan produknya dan catat penerimaan barangnya dulu; item manual hanya untuk jasa.");
            }

            if ($type === 'PRODUCT') {
```

and replace

```php
                'net' => round($gross - $discount, 2),
                'manual_cost' => $isManual ? round((float) ($item['cost_price'] ?? 0), 2) : 0.0,
            ];
```

with

```php
                'net' => round($gross - $discount, 2),
            ];
```

- [ ] **Step 4: Drop manual cost from checkout**

In `backend/app/Services/Pos/CheckoutService.php` replace

```php
            $fifoCogs = $this->storeLines($sale, $lines);
            $manualCost = round(array_sum(array_map(fn ($l) => $l['manual_cost'] * $l['quantity'], $lines)), 2);
            $sale->update([
                'total_hpp' => round($fifoCogs + $manualCost, 2),
                'total_profit' => round($grandTotal - $fifoCogs - $manualCost, 2),
            ]);
```

with

```php
            // HPP hanya dari FIFO: jasa (termasuk jasa manual) tidak punya harga pokok, jadi total_hpp = jurnal 5-1000.
            $fifoCogs = $this->storeLines($sale, $lines);
            $sale->update([
                'total_hpp' => $fifoCogs,
                'total_profit' => round($grandTotal - $fifoCogs, 2),
            ]);
```

and in `storeLines()` replace

```php
                'unit_cost_hpp' => $line['manual_cost'],
                'total_cost_hpp' => round($line['manual_cost'] * $line['quantity'], 2),
                'profit_amount' => round($line['net'] - $line['manual_cost'] * $line['quantity'], 2),
```

with

```php
                'unit_cost_hpp' => 0,
                'total_cost_hpp' => 0,
                'profit_amount' => $line['net'],
```

- [ ] **Step 5: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter='PosCheckoutTest|PosVoidTest|FifoIntegrityTest'`
Expected: PASS. Then the full gate — all green (`grep -rn manual_cost backend/app` returns nothing).

- [ ] **Step 6: Commit**

```bash
git add backend/app/Services/Pos/CartLines.php backend/app/Services/Pos/CheckoutService.php backend/tests/Feature/PosCheckoutTest.php
git commit -m "fix(pos): accept manual lines only as services without cost of sales" -m "A manual goods line booked revenue with a client-typed cost that never reached 5-1000, so total_hpp disagreed with the ledger. Goods must now be catalogued and received first; manual services book 4-1001 with no cost.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B5: One-shot inventory opening balance and go-live guards

**Files:**
- Create: `backend/tests/Feature/InventoryGoLiveGuardTest.php`
- Modify: `backend/app/Services/Inventory/InventoryValueJournal.php`, `backend/app/Http/Controllers/Api/v1/InventoryController.php`, `backend/routes/console.php`, `backend/app/Services/Inventory/StockOpnameCommitService.php`, `backend/app/Services/Inventory/StockSelectiveUpdateService.php`, `backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php`, tests `Feature/InventoryValuationTest.php` (full replacement), `Feature/GoodsReceiptTest.php`, `Feature/InventoryAdjustmentJournalTest.php`, `Feature/ProductMasterTest.php`, `Feature/StockOpnameTest.php`

**Interfaces:**
- Consumes: `AlignsInventoryLedger` (B3).
- Produces: `InventoryValueJournal::OPENING_PREFIX = 'OPENING-INV-'`, `InventoryValueJournal::openingEntry(): ?JournalEntry`, `InventoryValueJournal::assertBeforeGoLive(string $action): void` (throws `PosRuleException`); `GET /inventory/valuation` and `POST /inventory/opening-balance` return `opening_posted: bool` in the valuation.

- [ ] **Step 1: Convert the tests that used the endpoint as an alignment step**

In each of `backend/tests/Feature/GoodsReceiptTest.php`, `StockOpnameTest.php`, `ProductMasterTest.php`: add `use Tests\Concerns\AlignsInventoryLedger;` to the imports, add `use AlignsInventoryLedger;` as the first trait line in the class, and replace **every** occurrence of

```php
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
```

with

```php
        $this->alignInventoryLedger();
```

In `backend/tests/Feature/InventoryAdjustmentJournalTest.php` do the same import and trait, and replace

```php
    private function aligned($product): void
    {
        $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_bulk_reconciliation_update_journals_value_change(): void
    {
        $product = $this->makeProduct(800000, [[10, 600000, '2026-08-01']]);
```

with

```php
    private function aligned($product): void
    {
        $this->alignInventoryLedger();
    }

    public function test_bulk_reconciliation_update_journals_value_change(): void
    {
        if (InventoryValueJournal::openingEntry()) {
            $this->markTestSkipped('DB test bersama sudah go-live; rekonsiliasi stok Excel hanya sebelum go-live.');
        }
        $product = $this->makeProduct(800000, [[10, 600000, '2026-08-01']]);
```

Replace the whole content of `backend/tests/Feature/InventoryValuationTest.php` with:

```php
<?php

namespace Tests\Feature;

use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

class InventoryValuationTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    public function test_opening_balance_is_booked_once_and_marks_go_live(): void
    {
        if (InventoryValueJournal::openingEntry()) {
            $this->markTestSkipped('DB test bersama sudah punya saldo awal persediaan permanen.');
        }
        $this->makeProduct(1000000, [[3, 500000, '2026-08-01']]);
        $before = InventoryValueJournal::summary();
        $this->assertNotEquals(0.0, $before['difference']);
        $this->getJson('/api/v1/inventory/valuation')->assertOk()->assertJsonPath('data.opening_posted', false);

        $res = $this->postJson('/api/v1/inventory/opening-balance')->assertOk()
            ->assertJsonPath('data.valuation.difference', 0)
            ->assertJsonPath('data.valuation.opening_posted', true);
        $j = collect($res->json('data.journal.lines'))->keyBy('account_code');
        $this->assertEquals(abs($before['difference']), $j['3-1000']['credit'] + $j['3-1000']['debit']);
        $this->assertStringStartsWith(InventoryValueJournal::OPENING_PREFIX, $res->json('data.journal.reference_id'));

        // Selisih baru sesudah go-live tidak lagi dibukukan ke modal.
        $this->makeProduct(1000000, [[1, 400000, '2026-08-01']]);
        $this->postJson('/api/v1/inventory/opening-balance')->assertStatus(422)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah dibukukan'));
        $this->artisan('inventory:opening-balance')->assertExitCode(1);
        $this->getJson('/api/v1/inventory/valuation')->assertOk()
            ->assertJsonPath('data.opening_posted', true)
            ->assertJsonPath('data.difference', 400000);
    }

    public function test_record_books_existing_products_to_variance_and_new_products_to_equity(): void
    {
        $existing = $this->makeProduct(1000000, [[4, 500000, '2026-08-01']]);
        $this->alignInventoryLedger();

        $out = app(InventoryValueJournal::class)->record(function () use ($existing) {
            $existing->batches()->first()->update(['remaining_qty' => 3]); // hilang 1 unit @500rb

            $new = $this->makeProduct(1000000, [[2, 700000, '2026-09-01']]); // saldo awal 1,4 jt
            return $new->id;
        }, 'TEST_ADJUST', 'ADJ-1', 'Uji jurnal selisih');

        $lines = collect($out['journal']->toApiArray()['lines']);
        $this->assertEquals(500000, $lines->where('account_code', '5-2000')->sum('debit'));
        $this->assertEquals(1400000, $lines->where('account_code', '3-1000')->sum('credit'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_record_without_value_change_posts_nothing(): void
    {
        $out = app(InventoryValueJournal::class)->record(fn () => null, 'TEST', 'NOOP', 'Tidak ada perubahan');
        $this->assertNull($out['journal']);
    }

    public function test_permissions(): void
    {
        $this->actingAsRole('GUDANG');
        $this->getJson('/api/v1/inventory/valuation')->assertOk();
        $this->postJson('/api/v1/inventory/opening-balance')->assertForbidden();
    }
}
```

- [ ] **Step 2: Write the failing guard test**

Create `backend/tests/Feature/InventoryGoLiveGuardTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Exceptions\PosRuleException;
use App\Services\Inventory\InventoryValueJournal;
use App\Services\Inventory\StockOpnameCommitService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Setelah saldo awal persediaan dibukukan (go-live), stok masuk hanya lewat penerimaan barang dan koreksi hitung
 * lewat stock opname; modal batch yang sudah terjual tidak boleh diubah.
 */
class InventoryGoLiveGuardTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    private function goLive(): void
    {
        if (! InventoryValueJournal::openingEntry()) {
            $this->makeProduct(500000, [[1, 300000, '2026-08-01']]); // pastikan ada selisih yang dibukukan
            $this->postJson('/api/v1/inventory/opening-balance')->assertOk();
        }
        $this->assertNotNull(InventoryValueJournal::openingEntry());
        $this->alignInventoryLedger();
    }

    public function test_after_go_live_excel_stock_rebuilds_are_refused_but_price_updates_pass(): void
    {
        $product = $this->makeProduct(800000, [[10, 600000, '2026-08-01']]);
        $this->goLive();

        $this->postJson('/api/v1/stock/bulk-update', [
            'items' => [['product_id' => $product->id, 'excel_stock' => 12]],
            'update_stock' => true, 'reason' => 'Rekonsiliasi bulanan',
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Penerimaan Barang'));
        $this->assertSame(10, $product->fresh()->product_quantity);

        $this->postJson('/api/v1/stock/bulk-update', [
            'items' => [['product_id' => $product->id, 'excel_price' => 850000]],
            'update_price' => true, 'reason' => 'Harga baru',
        ])->assertOk();
        $this->assertEquals(850000, (float) $product->fresh()->product_price);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->expectException(PosRuleException::class);
        app(StockOpnameCommitService::class)->commit(['products' => []], '2099-01', ['force' => true]);
    }

    public function test_batch_cost_of_a_sold_batch_cannot_be_edited(): void
    {
        $product = $this->makeProduct(1000000, [[4, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $this->checkout([
            'items' => [$this->productLine($product, 1)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000]],
        ])->assertCreated();

        $this->postJson('/api/v1/reports/stock-monthly/inline-update', [
            'product_id' => $product->id, 'field' => 'batch_cost', 'value' => 650000, 'batch_id' => $product->batches()->value('id'),
        ])->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tidak bisa dikoreksi'));

        $this->assertEquals(600000, (float) $product->batches()->value('batch_cost'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }
}
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter='InventoryGoLiveGuardTest|InventoryValuationTest'`
Expected: FAIL — `InventoryValueJournal::openingEntry()` / `OPENING_PREFIX` undefined.

- [ ] **Step 4: Make the opening balance one-shot and add the go-live guard**

In `backend/app/Services/Inventory/InventoryValueJournal.php`:

Replace the imports

```php
use App\Models\JournalEntry;
use App\Models\JournalItem;
```

with

```php
use App\Exceptions\PosRuleException;
use App\Models\Account;
use App\Models\JournalEntry;
use App\Models\JournalItem;
```

Replace

```php
    public const OPNAME_VARIANCE = '5-2000';
```

with

```php
    public const OPNAME_VARIANCE = '5-2000';

    /** Awalan reference_id jurnal saldo awal persediaan (produk baru memakai 'PRODUCT-…'). */
    public const OPENING_PREFIX = 'OPENING-INV-';
```

Replace the whole `postOpeningBalance()` method

```php
    /**
     * Bukukan selisih antara nilai FIFO dan saldo buku 1-2000 sebagai saldo awal persediaan (idempoten).
     */
    public function postOpeningBalance(): ?JournalEntry
    {
        return DB::transaction(function () {
            $difference = self::summary()['difference'];
            $reference = 'OPENING-INV-'.now()->format('YmdHis');
```

with

```php
    /**
     * Jurnal saldo awal persediaan. Keberadaannya menandai buku persediaan sudah berjalan (go-live).
     */
    public static function openingEntry(): ?JournalEntry
    {
        return JournalEntry::where('reference_type', 'OPENING_BALANCE')
            ->where('reference_id', 'like', self::OPENING_PREFIX.'%')
            ->first();
    }

    /**
     * Impor stok Excel dan rekonsiliasi stok membangun ulang batch; itu hanya sah sebagai migrasi sebelum go-live.
     */
    public static function assertBeforeGoLive(string $action): void
    {
        $entry = self::openingEntry();
        if ($entry) {
            throw new PosRuleException(
                "{$action} hanya untuk migrasi stok sebelum saldo awal persediaan dibukukan ({$entry->entry_number}). "
                .'Catat pembelian lewat Penerimaan Barang dan koreksi hitung fisik lewat Stock Opname.'
            );
        }
    }

    /**
     * Bukukan selisih antara nilai FIFO dan saldo buku 1-2000 sebagai saldo awal persediaan, satu kali saja:
     * selisih sesudahnya bukan modal pemilik dan harus ditelusuri (stock opname).
     */
    public function postOpeningBalance(): ?JournalEntry
    {
        return DB::transaction(function () {
            // Kunci akun modal agar dua permintaan bersamaan tidak sama-sama lolos cek "belum ada".
            Account::where('account_code', self::OPENING_EQUITY)->lockForUpdate()->first();
            $existing = self::openingEntry();
            if ($existing) {
                throw new PosRuleException("Saldo awal persediaan sudah dibukukan ({$existing->entry_number}). Selisih FIFO berikutnya bukan modal: telusuri lewat stock opname.");
            }

            $difference = self::summary()['difference'];
            $reference = self::OPENING_PREFIX.now()->format('YmdHis');
```

(The rest of the method body stays as is.)

- [ ] **Step 5: Expose `opening_posted`**

In `backend/app/Http/Controllers/Api/v1/InventoryController.php` replace

```php
    public function valuation(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => InventoryValueJournal::summary()]);
    }
```

with

```php
    public function valuation(): JsonResponse
    {
        return response()->json(['success' => true, 'data' => self::valuationData()]);
    }

    /** Nilai FIFO vs buku 1-2000, plus apakah saldo awal persediaan (go-live) sudah dibukukan. */
    private static function valuationData(): array
    {
        return InventoryValueJournal::summary() + ['opening_posted' => InventoryValueJournal::openingEntry() !== null];
    }
```

and in `openingBalance()` replace

```php
                'valuation' => InventoryValueJournal::summary(),
```

with

```php
                'valuation' => self::valuationData(),
```

- [ ] **Step 6: Report the refusal in the console command**

In `backend/routes/console.php` replace

```php
    $entry = $journal->postOpeningBalance();
    $entry
```

with

```php
    try {
        $entry = $journal->postOpeningBalance();
    } catch (\App\Exceptions\PosRuleException $e) {
        $this->error($e->getMessage());

        return 1;
    }
    $entry
```

- [ ] **Step 7: Guard the Excel tools and batch cost edits**

In `backend/app/Services/Inventory/StockOpnameCommitService.php` replace

```php
        $this->guardExistingSales($effectiveDate, $force);
```

with

```php
        // Setelah go-live stok masuk hanya lewat penerimaan barang; opsi paksa tidak melewati aturan ini.
        InventoryValueJournal::assertBeforeGoLive('Impor stok Excel');
        $this->guardExistingSales($effectiveDate, $force);
```

In `backend/app/Services/Inventory/StockSelectiveUpdateService.php` replace

```php
        if (empty($items)) {
            throw new RuntimeException('Tidak ada produk yang dipilih untuk di-update.');
        }
```

with

```php
        if (empty($items)) {
            throw new RuntimeException('Tidak ada produk yang dipilih untuk di-update.');
        }

        if ($updateStock) {
            InventoryValueJournal::assertBeforeGoLive('Update stok lewat rekonsiliasi Excel');
        }
```

In `backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php` replace

```php
                if (! empty($validated['batch_id']) && ! $batch) {
                    return response()->json(['success' => false, 'message' => 'Batch tidak ditemukan pada produk ini.'], 422);
                }
```

with

```php
                if (! empty($validated['batch_id']) && ! $batch) {
                    return response()->json(['success' => false, 'message' => 'Batch tidak ditemukan pada produk ini.'], 422);
                }

                // HPP penjualan lalu dan hutang supplier tidak ikut berubah, jadi hanya batch yang belum tersentuh boleh dikoreksi.
                if ($batch && ($batch->purchase_id !== null || $batch->remaining_qty !== $batch->initial_qty || $batch->allocations()->exists())) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Modal batch ini tidak bisa dikoreksi: batch sudah terjual atau berasal dari faktur penerimaan barang. Gunakan retur atau pembatalan penerimaan barang.',
                    ], 422);
                }
```

- [ ] **Step 8: Run the tests**

Run: `cd backend && php artisan config:clear && php artisan test --filter='InventoryGoLiveGuardTest|InventoryValuationTest|InventoryAdjustmentJournalTest|GoodsReceiptTest|StockOpnameTest|ProductMasterTest|StockSelectiveUpdateServiceTest|StockReconciliationApiTest|EndToEndParityReconciliationAndQrisTest'`
Expected: PASS. Then the full gate — all green.

- [ ] **Step 9: Commit**

```bash
git add backend/app/Services/Inventory/InventoryValueJournal.php backend/app/Http/Controllers/Api/v1/InventoryController.php backend/routes/console.php backend/app/Services/Inventory/StockOpnameCommitService.php backend/app/Services/Inventory/StockSelectiveUpdateService.php backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php backend/tests/Feature/InventoryGoLiveGuardTest.php backend/tests/Feature/InventoryValuationTest.php backend/tests/Feature/GoodsReceiptTest.php backend/tests/Feature/InventoryAdjustmentJournalTest.php backend/tests/Feature/ProductMasterTest.php backend/tests/Feature/StockOpnameTest.php
git commit -m "fix(inventory): book the opening stock once and guard stock rebuilds after go-live" -m "The opening-balance action could be rerun and silently booked every FIFO gap to capital, and Excel imports kept booking restocks as variance or capital instead of purchases. The opening entry now marks go-live, after which stock enters only through goods receipts and counts through opname, and sold or purchased batches keep their cost.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B6: Partial sales return with a cash refund

**Files:**
- Create: `backend/database/migrations/2026_10_03_000002_create_sales_returns_tables.php`, `backend/app/Models/SalesReturn.php`, `backend/app/Models/SalesReturnItem.php`, `backend/app/Services/Pos/SalesReturnService.php`, `backend/tests/Concerns/OpensReturnCashSession.php`, `backend/tests/Feature/SalesReturnTest.php`
- Modify: `backend/app/Models/Sale.php`, `backend/app/Models/SaleBatchAllocation.php`, `backend/app/Services/Pos/SaleVoidService.php`, `backend/app/Http/Controllers/Api/v1/PosController.php`, `backend/routes/api.php`

**Interfaces:**
- Consumes: `cash_sessions` (SP2), `AlignsInventoryLedger` (B3), permission `sales_return` and account `4-9100` (B1).
- Produces: `POST /api/v1/pos/transactions/{id}/returns` body `{reason: string(min 5), items: [{sale_detail_id: int, quantity: int}]}` → 201 `data: {sale: <receipt>, sales_return: {id, reference, return_date, reason, refund_amount, cost_amount, journal_entry_number, operator_name, items: [{sale_detail_id, quantity, refund_amount, cost_amount}]}, journal: ApiJournal|null}`; receipt gains `returned_amount: float`, `returns: [...]`, per item `returned_qty: int`, and `SALES_RETURN` entries in `journals`; `SalesReturn::cashRefundedInSession(int $cashSessionId): float`; `SalesReturnService::lineNetAfterNotaDiscount(Sale $sale): array<int, float>`.

- [ ] **Step 1: Add the cash-session test trait**

Create `backend/tests/Concerns/OpensReturnCashSession.php`:

```php
<?php

namespace Tests\Concerns;

use Illuminate\Support\Facades\DB;

/**
 * Retur penjualan mengembalikan uang dari laci, jadi butuh shift kasir OPEN (tabel cash_sessions dari SP2).
 * Bila SP2 mewajibkan kolom lain (NOT NULL), tambahkan nilainya di sini.
 */
trait OpensReturnCashSession
{
    protected function ensureOpenCashSessionForReturn(): int
    {
        $open = DB::table('cash_sessions')->where('status', 'OPEN')->value('id');

        return (int) ($open ?? DB::table('cash_sessions')->insertGetId([
            'user_id' => auth()->id(),
            'opened_at' => now(),
            'opening_float' => 500000,
            'status' => 'OPEN',
            'created_at' => now(),
            'updated_at' => now(),
        ]));
    }
}
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/Feature/SalesReturnTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\SaleBatchAllocation;
use App\Models\SalesReturn;
use App\Models\ServiceMaster;
use App\Services\Accounting\CashFlowReport;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\Concerns\OpensReturnCashSession;
use Tests\TestCase;

/**
 * Retur penjualan sebagian: refund tunai dari laci (Dr 4-9100 / Cr 1-1000), barang kembali ke batch asal
 * dengan modal aslinya (Dr 1-2000 / Cr 5-1000).
 */
class SalesReturnTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;
    use OpensReturnCashSession;

    /** 3 unit @1 jt dengan diskon nota 300rb: FIFO 1 @500rb + 2 @600rb. */
    private function discountedSale($product)
    {
        return $this->checkout([
            'items' => [$this->productLine($product, 3)],
            'discount_amount' => 300000,
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 2700000]],
        ])->assertCreated();
    }

    private function returnLines(int $saleId, array $items, string $reason = 'Ban tidak cocok ukuran')
    {
        return $this->postJson("/api/v1/pos/transactions/{$saleId}/returns", ['reason' => $reason, 'items' => $items]);
    }

    public function test_partial_then_final_return_refunds_cash_and_restores_original_layers(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $this->alignInventoryLedger();
        $session = $this->ensureOpenCashSessionForReturn();
        $sale = $this->discountedSale($product);
        $saleId = $sale->json('data.id');
        $lineId = $sale->json('data.items.0.id');
        $today = now()->toDateString();
        $flowBefore = (new CashFlowReport())->build($today, $today)['operating']['customers'];

        $first = $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 900000)
            ->assertJsonPath('data.sales_return.cost_amount', 600000)
            ->assertJsonPath('data.sale.returned_amount', 900000)
            ->assertJsonPath('data.sale.items.0.returned_qty', 1)
            ->assertJsonPath('data.sale.status', 'LUNAS');
        $this->assertMatchesRegularExpression('/^RTJ-\d{6}-\d{4}$/', $first->json('data.sales_return.reference'));

        $j = $this->journalByAccount($first->json('data.sales_return.reference'), 'SALES_RETURN');
        $this->assertEquals(900000, $j['4-9100']['debit']);
        $this->assertEquals(900000, $j['1-1000']['credit']);
        $this->assertEquals(600000, $j['1-2000']['debit']);
        $this->assertEquals(600000, $j['5-1000']['credit']);
        $this->assertContains('SALES_RETURN', array_column($first->json('data.sale.journals'), 'reference_type'));

        $this->assertSame(4, $product->fresh()->product_quantity);
        $this->assertEquals([0, 4], $product->batches()->orderBy('purchase_date')->pluck('remaining_qty')->all());
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $flowAfter = (new CashFlowReport())->build($today, $today);
        $this->assertEqualsWithDelta($flowBefore - 900000, $flowAfter['operating']['customers'], 0.001);
        $this->assertTrue($flowAfter['is_reconciled']);

        // Retur terakhir mengambil sisa nilai baris sehingga total refund = total nota.
        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 2]])
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 1800000)
            ->assertJsonPath('data.sales_return.cost_amount', 1100000)
            ->assertJsonPath('data.sale.returned_amount', 2700000);
        $this->assertEquals([1, 5], $product->batches()->orderBy('purchase_date')->pluck('remaining_qty')->all());
        $this->assertEquals(2700000, SalesReturn::cashRefundedInSession($session), 'refund tercatat pada shift');
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->returnLines($saleId, [['sale_detail_id' => $lineId, 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'melebihi sisa'));
        $this->postJson("/api/v1/pos/transactions/{$saleId}/void", ['reason' => 'Batal total'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'sudah punya retur'));
    }

    public function test_service_line_return_only_reverses_revenue(): void
    {
        $service = ServiceMaster::create([
            'service_code' => 'JASA-'.uniqid(), 'service_name' => 'Spooring 3D', 'category' => 'SPOORING',
            'standard_price' => 150000, 'cost_price' => 0, 'is_active' => true,
        ]);
        $product = $this->makeProduct();
        $this->alignInventoryLedger();
        $this->ensureOpenCashSessionForReturn();
        $sale = $this->checkout([
            'items' => [
                ['type' => 'SERVICE', 'service_id' => $service->id, 'name' => 'x', 'quantity' => 1, 'unit_price' => 150000],
                $this->productLine($product),
            ],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1150000]],
        ])->assertCreated();

        $res = $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]], 'Spooring diulang gratis')
            ->assertCreated()
            ->assertJsonPath('data.sales_return.refund_amount', 150000)
            ->assertJsonPath('data.sales_return.cost_amount', 0);

        $j = $this->journalByAccount($res->json('data.sales_return.reference'), 'SALES_RETURN');
        $this->assertEquals(150000, $j['4-9100']['debit']);
        $this->assertArrayNotHasKey('1-2000', $j);
        $this->assertSame(9, $product->fresh()->product_quantity);
    }

    public function test_return_is_refused_without_open_shift_void_sale_or_batch_trail(): void
    {
        $product = $this->makeProduct(1000000, [[1, 500000, '2026-07-01'], [5, 600000, '2026-08-01']]);
        $sale = $this->discountedSale($product);
        $lineId = $sale->json('data.items.0.id');
        $items = [['sale_detail_id' => $lineId, 'quantity' => 1]];

        DB::table('cash_sessions')->where('status', 'OPEN')->update(['status' => 'CLOSED', 'closed_at' => now()]);
        $this->returnLines($sale->json('data.id'), $items)
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Buka shift kasir'));

        $this->ensureOpenCashSessionForReturn();
        SaleBatchAllocation::where('sale_detail_id', $lineId)->delete();
        $this->returnLines($sale->json('data.id'), $items)
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'jejak batch FIFO'));
        $this->assertFalse(SalesReturn::where('sale_id', $sale->json('data.id'))->exists());

        $other = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $this->postJson("/api/v1/pos/transactions/{$other->json('data.id')}/void", ['reason' => 'Salah input'])->assertOk();
        $this->returnLines($other->json('data.id'), [['sale_detail_id' => $other->json('data.items.0.id'), 'quantity' => 1]])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'VOID'));
    }

    public function test_validation_and_permission(): void
    {
        $sale = $this->discountedSale($this->makeProduct(1000000, [[3, 500000, '2026-08-01']]));
        $this->returnLines($sale->json('data.id'), [], 'ok')->assertStatus(422)->assertJsonValidationErrors(['reason', 'items']);

        $this->actingAsRole('GUDANG');
        $this->returnLines($sale->json('data.id'), [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]])
            ->assertForbidden();
    }
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && php artisan test --filter=SalesReturnTest`
Expected: FAIL — route not found (404) / class `SalesReturn` not found.

- [ ] **Step 4: Add the migration**

Create `backend/database/migrations/2026_10_03_000002_create_sales_returns_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retur penjualan (RTJ-…): refund tunai dari laci pada satu shift kasir, per baris nota. quantity_returned pada
 * alokasi mencatat unit yang sudah kembali ke batch asal, agar retur sebagian tidak memulihkan lapisan dua kali.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_returns', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->foreignId('sale_id')->constrained('sales');
            $table->date('return_date');
            $table->string('reason', 255);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->decimal('cost_amount', 15, 2)->default(0);
            $table->foreignId('cash_session_id')->constrained('cash_sessions');
            $table->string('journal_entry_number', 50)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operator_name', 100)->nullable();
            $table->unsignedBigInteger('branch_id')->default(3);
            $table->timestamps();
        });

        Schema::create('sales_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_return_id')->constrained('sales_returns')->cascadeOnDelete();
            $table->foreignId('sale_detail_id')->constrained('sale_details');
            $table->unsignedInteger('quantity');
            $table->decimal('refund_amount', 15, 2);
            $table->decimal('cost_amount', 15, 2)->default(0);
            $table->timestamps();
        });

        Schema::table('sale_batch_allocations', function (Blueprint $table) {
            $table->unsignedInteger('quantity_returned')->default(0)->after('quantity_allocated');
        });
    }

    public function down(): void
    {
        Schema::table('sale_batch_allocations', function (Blueprint $table) {
            $table->dropColumn('quantity_returned');
        });
        Schema::dropIfExists('sales_return_items');
        Schema::dropIfExists('sales_returns');
    }
};
```

- [ ] **Step 5: Add the models**

Create `backend/app/Models/SalesReturn.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Retur penjualan (RTJ-…): refund tunai dari laci pada satu shift kasir.
 */
class SalesReturn extends Model
{
    protected $fillable = [
        'reference', 'sale_id', 'return_date', 'reason', 'refund_amount', 'cost_amount', 'cash_session_id',
        'journal_entry_number', 'created_by', 'operator_name', 'branch_id',
    ];

    protected $casts = [
        'return_date' => 'date',
        'refund_amount' => 'decimal:2',
        'cost_amount' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SalesReturnItem::class);
    }

    /** Refund tunai yang keluar dari laci selama satu shift kasir (dipakai kas seharusnya shift). */
    public static function cashRefundedInSession(int $cashSessionId): float
    {
        return round((float) self::where('cash_session_id', $cashSessionId)->sum('refund_amount'), 2);
    }

    public function toApiArray(): array
    {
        $this->loadMissing('items');

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'return_date' => $this->return_date?->toDateString(),
            'reason' => $this->reason,
            'refund_amount' => (float) $this->refund_amount,
            'cost_amount' => (float) $this->cost_amount,
            'journal_entry_number' => $this->journal_entry_number,
            'operator_name' => $this->operator_name,
            'items' => $this->items->map(fn (SalesReturnItem $i) => [
                'sale_detail_id' => $i->sale_detail_id,
                'quantity' => $i->quantity,
                'refund_amount' => (float) $i->refund_amount,
                'cost_amount' => (float) $i->cost_amount,
            ])->values()->all(),
        ];
    }
}
```

Create `backend/app/Models/SalesReturnItem.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalesReturnItem extends Model
{
    protected $fillable = ['sales_return_id', 'sale_detail_id', 'quantity', 'refund_amount', 'cost_amount'];

    protected $casts = [
        'quantity' => 'integer',
        'refund_amount' => 'decimal:2',
        'cost_amount' => 'decimal:2',
    ];
}
```

In `backend/app/Models/SaleBatchAllocation.php` replace

```php
        'quantity_allocated',
        'unit_cost',
        'total_cost',
    ];

    protected $casts = [
        'quantity_allocated' => 'integer',
```

with

```php
        'quantity_allocated',
        'quantity_returned',
        'unit_cost',
        'total_cost',
    ];

    protected $casts = [
        'quantity_allocated' => 'integer',
        'quantity_returned' => 'integer',
```

- [ ] **Step 6: Extend the receipt**

In `backend/app/Models/Sale.php`:

Replace

```php
    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }
```

with

```php
    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SalesReturn::class)->orderBy('id');
    }
```

Replace

```php
        $this->loadMissing(['details.product', 'payments']);
        $journal = JournalEntry::with('items.account')
            ->where('reference_id', $this->reference)
            ->whereIn('reference_type', ['POS_SALE', 'POS_SALE_VOID'])
            ->orderBy('id')
            ->get();
```

with

```php
        $this->loadMissing(['details.product', 'payments', 'returns.items']);
        $journal = JournalEntry::with('items.account')
            ->where(fn ($q) => $q->where('reference_id', $this->reference)->whereIn('reference_type', ['POS_SALE', 'POS_SALE_VOID']))
            ->orWhere(fn ($q) => $q->where('reference_type', 'SALES_RETURN')->whereIn('reference_id', $this->returns->pluck('reference')))
            ->orderBy('id')
            ->get();
        $returnedQty = $this->returns->flatMap(fn (SalesReturn $r) => $r->items)
            ->groupBy('sale_detail_id')
            ->map(fn ($rows) => (int) $rows->sum('quantity'));
```

Replace

```php
            'void_reason' => $this->void_reason,
            'items' => $this->details->map(fn (SaleDetail $d) => [
```

with

```php
            'void_reason' => $this->void_reason,
            'returned_amount' => round((float) $this->returns->sum('refund_amount'), 2),
            'returns' => $this->returns->map(fn (SalesReturn $r) => $r->toApiArray())->values()->all(),
            'items' => $this->details->map(fn (SaleDetail $d) => [
```

Replace

```php
                'total_cost_hpp' => (float) $d->total_cost_hpp,
                'product' => $d->product ? [
```

with

```php
                'total_cost_hpp' => (float) $d->total_cost_hpp,
                'returned_qty' => (int) ($returnedQty[$d->id] ?? 0),
                'product' => $d->product ? [
```

- [ ] **Step 7: Add the service**

Create `backend/app/Services/Pos/SalesReturnService.php`:

```php
<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalesReturn;
use App\Models\SalesReturnItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Retur penjualan sebagian. Uang dikembalikan tunai dari laci (shift kasir harus OPEN) apa pun metode bayar awalnya;
 * barang kembali ke batch FIFO yang dulu dipakai, dengan modal alokasinya.
 * Jurnal SALES_RETURN: Dr 4-9100 / Cr 1-1000 sebesar refund, Dr 1-2000 / Cr 5-1000 sebesar HPP yang dibalik.
 */
class SalesReturnService
{
    public const SALES_RETURN = '4-9100';

    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @param  array<int, array{sale_detail_id: int|string, quantity: int|string}>  $items
     * @return array{sale: Sale, return: SalesReturn, journal: ?JournalEntry}
     */
    public function create(int $saleId, array $items, string $reason, User $user): array
    {
        return DB::transaction(function () use ($saleId, $items, $reason, $user) {
            $sale = Sale::with('details.allocations')->lockForUpdate()->findOrFail($saleId);
            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah VOID dan tidak bisa diretur.");
            }

            $session = DB::table('cash_sessions')->where('status', 'OPEN')->lockForUpdate()->first();
            if (! $session) {
                throw new PosRuleException('Buka shift kasir dulu: retur penjualan dikembalikan tunai dari laci.');
            }

            $date = now()->toDateString();
            $before = SalesReturnItem::whereIn('sale_detail_id', $sale->details->pluck('id'))
                ->selectRaw('sale_detail_id, SUM(quantity) as qty, SUM(refund_amount) as amount')
                ->groupBy('sale_detail_id')
                ->get()
                ->keyBy('sale_detail_id');
            $lineNet = self::lineNetAfterNotaDiscount($sale);

            $return = SalesReturn::create([
                'reference' => DocumentNumber::next(SalesReturn::class, 'reference', 'RTJ', $date),
                'sale_id' => $sale->id,
                'return_date' => $date,
                'reason' => $reason,
                'cash_session_id' => $session->id,
                'created_by' => $user->id,
                'operator_name' => $user->name,
            ]);

            $refundTotal = 0.0;
            $costTotal = 0.0;
            foreach ($items as $row) {
                $detail = $sale->details->firstWhere('id', (int) $row['sale_detail_id']);
                if (! $detail) {
                    throw new PosRuleException("Baris retur bukan bagian dari nota {$sale->reference}.");
                }

                $qty = (int) $row['quantity'];
                $returnedBefore = (int) ($before[$detail->id]->qty ?? 0);
                if ($qty < 1 || $returnedBefore + $qty > $detail->quantity) {
                    throw new PosRuleException("Jumlah retur {$detail->item_name} melebihi sisa yang bisa diretur (".($detail->quantity - $returnedBefore).').');
                }

                // Retur yang menghabiskan baris mengambil sisa nilainya, sehingga Σ refund baris = nilai bersih baris.
                $refund = $returnedBefore + $qty === $detail->quantity
                    ? round($lineNet[$detail->id] - (float) ($before[$detail->id]->amount ?? 0), 2)
                    : round($lineNet[$detail->id] * $qty / $detail->quantity, 2);
                $cost = $detail->product_id ? $this->restock($sale, $detail, $qty, $return->reference, $user) : 0.0;

                SalesReturnItem::create([
                    'sales_return_id' => $return->id,
                    'sale_detail_id' => $detail->id,
                    'quantity' => $qty,
                    'refund_amount' => $refund,
                    'cost_amount' => $cost,
                ]);
                $refundTotal += $refund;
                $costTotal += $cost;
            }

            $refundTotal = round($refundTotal, 2);
            $costTotal = round($costTotal, 2);
            $journal = $this->postJournal($sale, $return, $refundTotal, $costTotal, $date);
            $return->update([
                'refund_amount' => $refundTotal,
                'cost_amount' => $costTotal,
                'journal_entry_number' => $journal?->entry_number,
            ]);

            return ['sale' => $sale->fresh(), 'return' => $return->fresh('items'), 'journal' => $journal];
        });
    }

    /**
     * Nilai bersih tiap baris setelah potongan per baris dan bagian diskon nota. Diskon nota dibagi proporsional
     * dalam sen; sisa pembulatan masuk ke baris terbesar, sehingga Σ = total nota.
     *
     * @return array<int, float> sale_detail_id => nilai
     */
    public static function lineNetAfterNotaDiscount(Sale $sale): array
    {
        $cents = $sale->details->mapWithKeys(fn (SaleDetail $d) => [$d->id => (int) round((float) $d->sub_total * 100)])->all();
        $subtotal = array_sum($cents);
        $notaDiscount = max(0, $subtotal - (int) round((float) $sale->total_amount * 100));

        $shares = [];
        foreach ($cents as $id => $c) {
            $shares[$id] = $subtotal > 0 ? (int) floor($c * $notaDiscount / $subtotal) : 0;
        }
        if ($cents !== []) {
            $largest = array_keys($cents, max($cents))[0];
            $shares[$largest] += $notaDiscount - array_sum($shares);
        }

        $net = [];
        foreach ($cents as $id => $c) {
            $net[$id] = ($c - $shares[$id]) / 100;
        }

        return $net;
    }

    /**
     * Unit kembali ke batch asal (alokasi terakhir lebih dulu) dengan modal alokasinya. Mengembalikan HPP yang dibalik.
     */
    private function restock(Sale $sale, SaleDetail $detail, int $qty, string $reference, User $user): float
    {
        $need = $qty;
        $cost = 0.0;
        foreach ($detail->allocations->sortByDesc('id') as $allocation) {
            $take = min($need, $allocation->quantity_allocated - $allocation->quantity_returned);
            if ($take <= 0) {
                continue;
            }
            ProductBatch::whereKey($allocation->product_batch_id)->lockForUpdate()->firstOrFail()->increment('remaining_qty', $take);
            $allocation->increment('quantity_returned', $take);
            $cost += round($take * (float) $allocation->unit_cost, 2);
            $need -= $take;
            if ($need === 0) {
                break;
            }
        }
        if ($need > 0) {
            throw new PosRuleException("Baris {$detail->item_name} tidak punya jejak batch FIFO lengkap; batalkan nota lewat VOID.");
        }

        $product = Product::withTrashed()->lockForUpdate()->findOrFail($detail->product_id);
        $product->increment('product_quantity', $qty);
        StockMovement::create([
            'product_id' => $product->id,
            'movement_type' => 'MASUK',
            'quantity' => $qty,
            'balance_after' => $product->product_quantity,
            'reference_type' => 'SALES_RETURN',
            'reference_id' => $reference,
            'description' => "Retur penjualan nota {$sale->reference}",
            'operator_name' => $user->name,
            'branch_id' => $product->branch_id ?? 3,
        ]);

        return round($cost, 2);
    }

    private function postJournal(Sale $sale, SalesReturn $return, float $refund, float $cost, string $date): ?JournalEntry
    {
        $draft = (new JournalDraft())
            ->debit(self::SALES_RETURN, $refund, "Retur penjualan nota {$sale->reference}")
            ->credit(PosAccounts::CASH, $refund, "Refund tunai dari laci ({$return->reference})")
            ->debit(PosAccounts::INVENTORY, $cost, "Barang retur kembali ke batch FIFO ({$return->reference})")
            ->credit(PosAccounts::COGS, $cost, "Pembalikan HPP retur ({$return->reference})");

        // Retur barang bonus tanpa nilai & tanpa HPP tidak menggerakkan akun apa pun.
        if ($draft->isEmpty()) {
            return null;
        }

        return $draft->post($this->engine, 'SALES_RETURN', $return->reference, "Retur penjualan {$return->reference} atas nota {$sale->reference}: {$return->reason}", $date);
    }
}
```

- [ ] **Step 8: Block voids of returned sales**

In `backend/app/Services/Pos/SaleVoidService.php` replace

```php
use App\Models\SaleDetail;
```

with

```php
use App\Models\SaleDetail;
use App\Models\SalesReturn;
```

and replace

```php
            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah pernah dibatalkan.");
            }
```

with

```php
            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah pernah dibatalkan.");
            }
            if (SalesReturn::where('sale_id', $sale->id)->exists()) {
                throw new PosRuleException("Nota {$sale->reference} sudah punya retur; kembalikan sisa barangnya lewat retur penjualan.");
            }
```

- [ ] **Step 9: Controller and route**

In `backend/app/Http/Controllers/Api/v1/PosController.php` replace

```php
use App\Services\Pos\CheckoutService;
use App\Services\Pos\SaleVoidService;
```

with

```php
use App\Services\Pos\CheckoutService;
use App\Services\Pos\SalesReturnService;
use App\Services\Pos\SaleVoidService;
```

replace

```php
        $query = Sale::with(['details.product', 'payments'])
```

with

```php
        $query = Sale::with(['details.product', 'payments', 'returns.items'])
```

and add this method before `public function checkout(`:

```php
    public function salesReturn(Request $request, int $id, SalesReturnService $returns): JsonResponse
    {
        $data = $request->validate([
            'reason' => 'required|string|min:5|max:255',
            'items' => 'required|array|min:1',
            'items.*.sale_detail_id' => 'required|integer|distinct',
            'items.*.quantity' => 'required|integer|min:1',
        ]);
        $out = $returns->create($id, $data['items'], $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Retur {$out['return']->reference} dibukukan. Serahkan refund tunai Rp "
                .number_format((float) $out['return']->refund_amount, 0, ',', '.').'.',
            'data' => [
                'sale' => $out['sale']->toReceiptArray(),
                'sales_return' => $out['return']->toApiArray(),
                'journal' => $out['journal']?->toApiArray(),
            ],
        ], 201);
    }

```

In `backend/routes/api.php` replace

```php
        Route::post('pos/transactions/{id}/void', [PosController::class, 'void'])->middleware('permission:sale_void');
```

with

```php
        Route::post('pos/transactions/{id}/void', [PosController::class, 'void'])->middleware('permission:sale_void');
        Route::post('pos/transactions/{id}/returns', [PosController::class, 'salesReturn'])->middleware('permission:sales_return');
```

- [ ] **Step 10: Migrate and run the tests**

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force
php artisan config:clear && php artisan test --filter='SalesReturnTest|PosVoidTest|PosCheckoutTest|FifoIntegrityTest|CashFlowReportTest'
```

Expected: PASS. Then the full gate — all green.

- [ ] **Step 11: Commit**

```bash
git add backend/database/migrations/2026_10_03_000002_create_sales_returns_tables.php backend/app/Models/SalesReturn.php backend/app/Models/SalesReturnItem.php backend/app/Models/Sale.php backend/app/Models/SaleBatchAllocation.php backend/app/Services/Pos/SalesReturnService.php backend/app/Services/Pos/SaleVoidService.php backend/app/Http/Controllers/Api/v1/PosController.php backend/routes/api.php backend/tests/Concerns/OpensReturnCashSession.php backend/tests/Feature/SalesReturnTest.php
git commit -m "feat(pos): add partial sales returns with a cash refund from the drawer" -m "Only a full void existed. A return now refunds cash from the open shift, puts the units back into the batches the sale consumed at their original cost and posts SALES_RETURN (4-9100/1-1000 and 1-2000/5-1000).

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B7: Purchase return and goods-receipt cancellation

**Files:**
- Create: `backend/database/migrations/2026_10_03_000003_create_purchase_returns_tables.php`, `backend/app/Models/PurchaseReturn.php`, `backend/app/Models/PurchaseReturnItem.php`, `backend/app/Services/Inventory/PurchaseReturnService.php`, `backend/tests/Feature/PurchaseReturnTest.php`
- Modify: `backend/app/Models/Purchase.php`, `backend/app/Services/Inventory/PayableService.php`, `backend/app/Http/Controllers/Api/v1/PurchaseController.php`, `backend/app/Http/Controllers/Api/v1/AccountingReportController.php`, `backend/routes/api.php`

**Interfaces:**
- Consumes: permission `purchase_return` (B1), `AlignsInventoryLedger` (B3).
- Produces: `POST /api/v1/purchases/{id}/returns` body `{quantity: int≥1, reason: string(min 5), refund_account_code?: '1-1000'|'1-1001'}` → 201; `POST /api/v1/purchases/{id}/cancel` body `{reason}` → 200; both `data: {purchase: <purchase>, purchase_return: {id, reference, kind, return_date, reason, quantity, total_amount, payable_amount, refund_amount, refund_account_code, journal_entry_number}, journal: ApiJournal|null}`. Purchase JSON gains `returned_amount`, `product_name`, `quantity`, `returnable_qty`; status may be `BATAL`; `remaining_amount = total − returned − paid`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/PurchaseReturnTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Supplier;
use App\Services\Accounting\CashFlowReport;
use App\Services\Inventory\InventoryValueJournal;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\Concerns\AlignsInventoryLedger;
use Tests\Concerns\CreatesPosFixtures;
use Tests\TestCase;

/**
 * Retur pembelian mengurangi hutang lebih dulu lalu refund kas/bank; hanya unit yang masih ada di batch GR itu.
 * Pembatalan GR = jurnal cermin PURCHASE bila GR belum tersentuh.
 */
class PurchaseReturnTest extends TestCase
{
    use AlignsInventoryLedger;
    use CreatesPosFixtures;
    use DatabaseTransactions;

    /** Produk tanpa stok, agar penjualan pasti memakai batch GR. */
    private function emptyProduct(): Product
    {
        return $this->makeProduct(800000, [[0, 450000, '2026-08-01']]);
    }

    private function receive(Product $product, array $extra)
    {
        return $this->postJson('/api/v1/inventory/restock', $extra + [
            'product_id' => $product->id, 'quantity' => 4, 'batch_cost' => 500000, 'purchase_date' => '2026-09-20',
        ])->assertCreated();
    }

    private function supplier(): Supplier
    {
        return Supplier::create([
            'supplier_code' => 'SUP-'.uniqid(), 'supplier_name' => 'PT Retur '.uniqid(),
            'phone' => '0811', 'payment_terms_days' => 30, 'is_active' => true,
        ]);
    }

    private function sellOne(Product $product): void
    {
        $this->checkout([
            'items' => [$this->productLine($product, 1)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 800000]],
        ])->assertCreated();
    }

    public function test_tempo_return_reduces_payable_first_then_refunds_and_skips_sold_units(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $id = $this->receive($product, ['supplier_id' => $this->supplier()->id, 'payment_method' => 'TEMPO'])->json('data.purchase.id');
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 1500000, 'account_code' => '1-1001'])->assertCreated();
        $this->sellOne($product);

        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 4, 'reason' => 'Ban cacat produksi'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'Hanya 3 unit'));

        $res = $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 3, 'reason' => 'Ban cacat produksi', 'refund_account_code' => '1-1001'])
            ->assertCreated()
            ->assertJsonPath('data.purchase.returned_amount', 1500000)
            ->assertJsonPath('data.purchase.paid_amount', 500000)
            ->assertJsonPath('data.purchase.remaining_amount', 0)
            ->assertJsonPath('data.purchase.status', 'LUNAS')
            ->assertJsonPath('data.purchase.returnable_qty', 0)
            ->assertJsonPath('data.purchase_return.kind', 'RETURN')
            ->assertJsonPath('data.purchase_return.payable_amount', 500000)
            ->assertJsonPath('data.purchase_return.refund_amount', 1000000);
        $this->assertMatchesRegularExpression('/^RTB-\d{6}-\d{4}$/', $res->json('data.purchase_return.reference'));

        $j = $this->journalByAccount($res->json('data.purchase_return.reference'), 'PURCHASE_RETURN');
        $this->assertEquals(500000, $j['2-1000']['debit']);
        $this->assertEquals(1000000, $j['1-1001']['debit']);
        $this->assertEquals(1500000, $j['1-2000']['credit']);
        $this->assertSame(0, $product->fresh()->product_quantity);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_cent_split_receipt_returns_newest_layer_first_and_refunds_cash(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $id = $this->receive($product, [
            'source_name' => 'Toko Grosir', 'payment_method' => 'TUNAI', 'quantity' => 3, 'batch_cost' => 33333.33, 'invoice_total' => 100000,
        ])->json('data.purchase.id');
        $today = now()->toDateString();
        $flowBefore = (new CashFlowReport())->build($today, $today)['operating']['suppliers'];

        $first = $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 1, 'reason' => 'Salah ukuran'])
            ->assertCreated()
            ->assertJsonPath('data.purchase_return.total_amount', 33333.34)
            ->assertJsonPath('data.purchase_return.refund_account_code', '1-1000');
        $this->assertEquals(33333.34, $this->journalByAccount($first->json('data.purchase_return.reference'), 'PURCHASE_RETURN')['1-1000']['debit']);

        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 2, 'reason' => 'Salah ukuran'])
            ->assertCreated()
            ->assertJsonPath('data.purchase.returned_amount', 100000)
            ->assertJsonPath('data.purchase.paid_amount', 0)
            ->assertJsonPath('data.purchase.status', 'LUNAS');

        $flow = (new CashFlowReport())->build($today, $today);
        $this->assertEqualsWithDelta($flowBefore + 100000, $flow['operating']['suppliers'], 0.001);
        $this->assertTrue($flow['is_reconciled']);
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);
    }

    public function test_untouched_receipt_is_cancelled_by_a_linked_mirror_entry(): void
    {
        $product = $this->emptyProduct();
        $this->alignInventoryLedger();
        $gr = $this->receive($product, ['supplier_id' => $this->supplier()->id, 'payment_method' => 'TEMPO']);
        $id = $gr->json('data.purchase.id');

        $res = $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])
            ->assertOk()
            ->assertJsonPath('data.purchase.status', 'BATAL')
            ->assertJsonPath('data.purchase.remaining_amount', 0)
            ->assertJsonPath('data.purchase_return.kind', 'CANCEL')
            ->assertJsonPath('data.journal.reference_type', 'GOODS_RECEIPT_CANCEL')
            ->assertJsonPath('data.journal.reversal_of', $gr->json('data.purchase.journal_entry_number'));

        $j = $this->journalByAccount($res->json('data.purchase_return.reference'), 'GOODS_RECEIPT_CANCEL');
        $this->assertEquals(2000000, $j['2-1000']['debit']);
        $this->assertEquals(2000000, $j['1-2000']['credit']);
        $this->assertSame(0, $product->fresh()->product_quantity);
        $this->assertSame(0, (int) ProductBatch::where('purchase_id', $id)->sum('remaining_qty'));
        $this->assertEquals(0.0, InventoryValueJournal::summary()['difference']);

        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])->assertStatus(422);
        $this->postJson("/api/v1/purchases/{$id}/payments", ['amount' => 1000, 'account_code' => '1-1001'])->assertStatus(422);
        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 1, 'reason' => 'Salah input faktur'])->assertStatus(422);
    }

    public function test_used_receipt_cannot_be_cancelled_and_kasir_is_forbidden(): void
    {
        $product = $this->emptyProduct();
        $id = $this->receive($product, ['source_name' => 'Toko Grosir', 'payment_method' => 'TUNAI', 'quantity' => 2])->json('data.purchase.id');
        $this->sellOne($product);

        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])
            ->assertStatus(422)->assertJsonPath('message', fn ($m) => str_contains($m, 'tidak bisa dibatalkan'));

        $this->actingAsRole('KASIR');
        $this->postJson("/api/v1/purchases/{$id}/returns", ['quantity' => 1, 'reason' => 'Ban cacat produksi'])->assertForbidden();
        $this->postJson("/api/v1/purchases/{$id}/cancel", ['reason' => 'Salah input faktur'])->assertForbidden();
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan test --filter=PurchaseReturnTest`
Expected: FAIL — routes not found (404).

- [ ] **Step 3: Add the migration**

Create `backend/database/migrations/2026_10_03_000003_create_purchase_returns_tables.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Retur pembelian & pembatalan penerimaan barang (RTB-…), per batch GR yang dikurangi. purchases.returned_amount
 * menampung nilai yang dikembalikan, sehingga sisa hutang = total − retur − dibayar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_returns', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 50)->unique();
            $table->foreignId('purchase_id')->constrained('purchases');
            $table->string('kind', 10);
            $table->date('return_date');
            $table->string('reason', 255);
            $table->unsignedInteger('quantity');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('payable_amount', 15, 2)->default(0);
            $table->decimal('refund_amount', 15, 2)->default(0);
            $table->string('refund_account_code', 20)->nullable();
            $table->string('journal_entry_number', 50)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('operator_name', 100)->nullable();
            $table->timestamps();
        });

        Schema::create('purchase_return_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_return_id')->constrained('purchase_returns')->cascadeOnDelete();
            $table->foreignId('product_batch_id')->nullable()->constrained('product_batches')->nullOnDelete();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('total_cost', 15, 2);
            $table->timestamps();
        });

        Schema::table('purchases', function (Blueprint $table) {
            $table->decimal('returned_amount', 15, 2)->default(0)->after('paid_amount');
        });
    }

    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->dropColumn('returned_amount');
        });
        Schema::dropIfExists('purchase_return_items');
        Schema::dropIfExists('purchase_returns');
    }
};
```

- [ ] **Step 4: Add the models and extend `Purchase`**

Create `backend/app/Models/PurchaseReturn.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Retur pembelian (kind RETURN) atau pembatalan penerimaan barang (kind CANCEL), bernomor RTB-….
 */
class PurchaseReturn extends Model
{
    protected $fillable = [
        'reference', 'purchase_id', 'kind', 'return_date', 'reason', 'quantity', 'total_amount', 'payable_amount',
        'refund_amount', 'refund_account_code', 'journal_entry_number', 'created_by', 'operator_name',
    ];

    protected $casts = [
        'return_date' => 'date',
        'quantity' => 'integer',
        'total_amount' => 'decimal:2',
        'payable_amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseReturnItem::class);
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'kind' => $this->kind,
            'return_date' => $this->return_date?->toDateString(),
            'reason' => $this->reason,
            'quantity' => $this->quantity,
            'total_amount' => (float) $this->total_amount,
            'payable_amount' => (float) $this->payable_amount,
            'refund_amount' => (float) $this->refund_amount,
            'refund_account_code' => $this->refund_account_code,
            'journal_entry_number' => $this->journal_entry_number,
        ];
    }
}
```

Create `backend/app/Models/PurchaseReturnItem.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseReturnItem extends Model
{
    protected $fillable = ['purchase_return_id', 'product_batch_id', 'quantity', 'unit_cost', 'total_cost'];

    protected $casts = [
        'quantity' => 'integer',
        'unit_cost' => 'decimal:2',
        'total_cost' => 'decimal:2',
    ];
}
```

In `backend/app/Models/Purchase.php` replace

```php
        'payment_method', 'due_date', 'total_amount', 'dpp_amount', 'ppn_amount', 'paid_amount', 'status',
```

with

```php
        'payment_method', 'due_date', 'total_amount', 'dpp_amount', 'ppn_amount', 'paid_amount', 'returned_amount', 'status',
```

replace

```php
        'paid_amount' => 'decimal:2',
    ];
```

with

```php
        'paid_amount' => 'decimal:2',
        'returned_amount' => 'decimal:2',
    ];
```

replace

```php
    public function remaining(): float
    {
        return round((float) $this->total_amount - (float) $this->paid_amount, 2);
    }
```

with

```php
    public function returns(): HasMany
    {
        return $this->hasMany(PurchaseReturn::class);
    }

    /** Sisa hutang = total − nilai retur − dibayar bersih (refund supplier sudah mengurangi paid_amount). */
    public function remaining(): float
    {
        return round((float) $this->total_amount - (float) $this->returned_amount - (float) $this->paid_amount, 2);
    }
```

and replace

```php
            'paid_amount' => (float) $this->paid_amount,
            'remaining_amount' => $this->remaining(),
```

with

```php
            'paid_amount' => (float) $this->paid_amount,
            'returned_amount' => (float) $this->returned_amount,
            'remaining_amount' => $this->remaining(),
            'product_name' => $this->batches->first()?->product?->product_name,
            'quantity' => (int) $this->batches->sum('initial_qty'),
            'returnable_qty' => (int) $this->batches->sum('remaining_qty'),
```

- [ ] **Step 5: Add the service**

Create `backend/app/Services/Inventory/PurchaseReturnService.php`:

```php
<?php

namespace App\Services\Inventory;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Models\PurchaseReturnItem;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\JournalDraft;
use Illuminate\Support\Facades\DB;

/**
 * Retur pembelian ke supplier dan pembatalan penerimaan barang (GR).
 *
 * Hanya unit yang masih tersisa di batch GR itu yang bisa dikembalikan (lapisan yang sudah terjual tidak), batch terbaru
 * lebih dulu. Nilai retur = Σ qty × modal batch, tepat sen (termasuk batch pecahan sen dari faktur). Untuk TEMPO nilai
 * itu mengurangi hutang 2-1000 lebih dulu; sisanya dikembalikan supplier ke kas/bank. Pembatalan GR yang belum tersentuh
 * membukukan jurnal cermin PURCHASE (tertaut reversal_of_id).
 */
class PurchaseReturnService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    /**
     * @return array{purchase: Purchase, return: PurchaseReturn, journal: ?JournalEntry}
     */
    public function returnGoods(int $purchaseId, int $quantity, string $reason, ?string $refundAccount, User $user): array
    {
        return DB::transaction(function () use ($purchaseId, $quantity, $reason, $refundAccount, $user) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            if ($purchase->status === 'BATAL') {
                throw new PosRuleException("Penerimaan {$purchase->purchase_number} sudah dibatalkan.");
            }

            $batches = ProductBatch::where('purchase_id', $purchase->id)
                ->where('remaining_qty', '>', 0)
                ->orderByDesc('id')
                ->lockForUpdate()
                ->get();
            $available = (int) $batches->sum('remaining_qty');
            if ($quantity > $available) {
                throw new PosRuleException("Hanya {$available} unit dari {$purchase->purchase_number} yang masih di gudang; unit yang sudah terjual tidak bisa diretur ke supplier.");
            }

            $date = now()->toDateString();
            $return = PurchaseReturn::create([
                'reference' => DocumentNumber::next(PurchaseReturn::class, 'reference', 'RTB', $date),
                'purchase_id' => $purchase->id,
                'kind' => 'RETURN',
                'return_date' => $date,
                'reason' => $reason,
                'quantity' => $quantity,
                'created_by' => $user->id,
                'operator_name' => $user->name,
            ]);

            $value = 0.0;
            $need = $quantity;
            foreach ($batches as $batch) {
                if ($need === 0) {
                    break;
                }
                $take = min($need, (int) $batch->remaining_qty);
                $lineValue = round($take * (float) $batch->batch_cost, 2);
                $batch->decrement('remaining_qty', $take);
                PurchaseReturnItem::create([
                    'purchase_return_id' => $return->id,
                    'product_batch_id' => $batch->id,
                    'quantity' => $take,
                    'unit_cost' => $batch->batch_cost,
                    'total_cost' => $lineValue,
                ]);
                $value += $lineValue;
                $need -= $take;
            }
            $value = round($value, 2);
            $this->takeOutOfStock($batches->first()->product_id, $quantity, 'PURCHASE_RETURN', $return->reference,
                "Retur ke supplier {$purchase->supplier_name} ({$purchase->purchase_number})", $user);

            $payable = $purchase->payment_method === 'TEMPO' ? min($value, max(0.0, $purchase->remaining())) : 0.0;
            $refund = round($value - $payable, 2);
            $account = $refundAccount ?? ($purchase->payment_method === 'TUNAI' ? '1-1000' : '1-1001');

            $draft = (new JournalDraft())
                ->debit('2-1000', $payable, "Pengurangan hutang {$purchase->supplier_name} ({$purchase->purchase_number})")
                ->debit($account, $refund, "Pengembalian dana retur dari {$purchase->supplier_name}")
                ->credit('1-2000', $value, "Barang diretur ke supplier ({$return->reference})");
            $journal = $draft->isEmpty()
                ? null
                : $draft->post($this->engine, 'PURCHASE_RETURN', $return->reference, "Retur pembelian {$return->reference} atas {$purchase->purchase_number}: {$reason}", $date);

            $return->update([
                'total_amount' => $value,
                'payable_amount' => $payable,
                'refund_amount' => $refund,
                'refund_account_code' => $refund > 0 ? $account : null,
                'journal_entry_number' => $journal?->entry_number,
            ]);
            $this->settle($purchase, $value, $refund);

            return ['purchase' => $purchase->fresh(), 'return' => $return->fresh(), 'journal' => $journal];
        });
    }

    /**
     * @return array{purchase: Purchase, return: PurchaseReturn, journal: ?JournalEntry}
     */
    public function cancel(int $purchaseId, string $reason, User $user): array
    {
        return DB::transaction(function () use ($purchaseId, $reason, $user) {
            $purchase = Purchase::lockForUpdate()->findOrFail($purchaseId);
            if ($purchase->status === 'BATAL') {
                throw new PosRuleException("Penerimaan {$purchase->purchase_number} sudah dibatalkan.");
            }

            $batches = ProductBatch::where('purchase_id', $purchase->id)->lockForUpdate()->get();
            $touched = $batches->isEmpty()
                || $batches->contains(fn (ProductBatch $b) => $b->remaining_qty !== $b->initial_qty || $b->allocations()->exists())
                || $purchase->payments()->exists()
                || $purchase->returns()->exists();
            if ($touched) {
                throw new PosRuleException("Penerimaan {$purchase->purchase_number} tidak bisa dibatalkan: barangnya sudah terjual/diretur atau hutangnya sudah dibayar. Gunakan retur pembelian.");
            }

            $date = now()->toDateString();
            $total = (float) $purchase->total_amount;
            $isTempo = $purchase->payment_method === 'TEMPO';
            $qty = (int) $batches->sum('initial_qty');
            $return = PurchaseReturn::create([
                'reference' => DocumentNumber::next(PurchaseReturn::class, 'reference', 'RTB', $date),
                'purchase_id' => $purchase->id,
                'kind' => 'CANCEL',
                'return_date' => $date,
                'reason' => $reason,
                'quantity' => $qty,
                'total_amount' => $total,
                'payable_amount' => $isTempo ? $total : 0,
                'refund_amount' => $isTempo ? 0 : $total,
                'refund_account_code' => $isTempo ? null : GoodsReceiptService::PAYMENT_ACCOUNTS[$purchase->payment_method],
                'created_by' => $user->id,
                'operator_name' => $user->name,
            ]);

            foreach ($batches as $batch) {
                PurchaseReturnItem::create([
                    'purchase_return_id' => $return->id,
                    'product_batch_id' => $batch->id,
                    'quantity' => $batch->initial_qty,
                    'unit_cost' => $batch->batch_cost,
                    'total_cost' => round($batch->initial_qty * (float) $batch->batch_cost, 2),
                ]);
                $batch->update(['remaining_qty' => 0]);
            }
            $this->takeOutOfStock($batches->first()->product_id, $qty, 'GOODS_RECEIPT_CANCEL', $return->reference,
                "Pembatalan penerimaan {$purchase->purchase_number}", $user);

            // Penerimaan bonus Rp 0 tidak pernah dijurnal, jadi tidak ada yang dicerminkan.
            $journal = null;
            $original = JournalEntry::where('reference_type', 'PURCHASE')->where('reference_id', $purchase->purchase_number)->first();
            if ($original) {
                $journal = $this->engine->createEntry(
                    'GOODS_RECEIPT_CANCEL',
                    $return->reference,
                    "Pembatalan penerimaan {$purchase->purchase_number}: {$reason}",
                    $original->reversedItems('[BATAL] '),
                    $date,
                    3,
                    $original->id
                );
                $return->update(['journal_entry_number' => $journal->entry_number]);
            }
            $this->settle($purchase, $total, $isTempo ? 0.0 : $total, 'BATAL');

            return ['purchase' => $purchase->fresh(), 'return' => $return->fresh(), 'journal' => $journal];
        });
    }

    private function takeOutOfStock(int $productId, int $qty, string $type, string $reference, string $description, User $user): void
    {
        $product = Product::withTrashed()->lockForUpdate()->findOrFail($productId);
        $product->update(['product_quantity' => max(0, (int) $product->product_quantity - $qty)]);
        StockMovement::create([
            'product_id' => $product->id,
            'movement_type' => 'KELUAR',
            'quantity' => $qty,
            'balance_after' => $product->product_quantity,
            'reference_type' => $type,
            'reference_id' => $reference,
            'description' => $description,
            'operator_name' => $user->name,
            'branch_id' => $product->branch_id ?? 3,
        ]);
    }

    /** Nilai retur menambah returned_amount; refund supplier mengurangi paid_amount (dibayar bersih). */
    private function settle(Purchase $purchase, float $value, float $refund, ?string $status = null): void
    {
        $returned = round((float) $purchase->returned_amount + $value, 2);
        $paid = round((float) $purchase->paid_amount - $refund, 2);
        $net = round((float) $purchase->total_amount - $returned, 2);

        $purchase->update([
            'returned_amount' => $returned,
            'paid_amount' => $paid,
            'status' => $status ?? ($purchase->payment_method !== 'TEMPO' || $paid >= $net - 0.001
                ? 'LUNAS'
                : ($paid > 0 ? 'SEBAGIAN' : 'BELUM_LUNAS')),
        ]);
    }
}
```

- [ ] **Step 6: Keep payables consistent with returns and cancellations**

In `backend/app/Services/Inventory/PayableService.php` replace

```php
            if ($purchase->payment_method !== 'TEMPO' || $purchase->status === 'LUNAS') {
```

with

```php
            if ($purchase->payment_method !== 'TEMPO' || in_array($purchase->status, ['LUNAS', 'BATAL'], true)) {
```

replace

```php
                'status' => $paid >= (float) $purchase->total_amount - 0.001 ? 'LUNAS' : 'SEBAGIAN',
```

with

```php
                'status' => $paid >= (float) $purchase->total_amount - (float) $purchase->returned_amount - 0.001 ? 'LUNAS' : 'SEBAGIAN',
```

and replace

```php
                ->where('payment_method', 'TEMPO')
                ->where('status', '!=', 'LUNAS')
                ->orderBy('due_date')->orderBy('id')
```

with

```php
                ->where('payment_method', 'TEMPO')
                ->whereNotIn('status', ['LUNAS', 'BATAL'])
                ->orderBy('due_date')->orderBy('id')
```

In `backend/app/Http/Controllers/Api/v1/AccountingReportController.php` (method `accountsPayable`) replace

```php
            ->selectRaw('supplier_id, supplier_name, SUM(total_amount) as purchased, SUM(paid_amount) as paid')
```

with

```php
            ->selectRaw('supplier_id, supplier_name, SUM(total_amount - returned_amount) as purchased, SUM(paid_amount) as paid')
```

- [ ] **Step 7: Controller and routes**

In `backend/app/Http/Controllers/Api/v1/PurchaseController.php` replace

```php
use App\Services\Inventory\PayableService;
```

with

```php
use App\Services\Inventory\PayableService;
use App\Services\Inventory\PurchaseReturnService;
```

replace

```php
        $purchases = Purchase::query()
            ->when($request->input('status', 'all') === 'open', fn ($q) => $q->where('payment_method', 'TEMPO')->where('status', '!=', 'LUNAS'))
```

with

```php
        $purchases = Purchase::with('batches.product')
            ->when($request->input('status', 'all') === 'open', fn ($q) => $q->where('payment_method', 'TEMPO')->whereNotIn('status', ['LUNAS', 'BATAL']))
```

and add these methods before the final closing brace of the class:

```php

    public function returnGoods(Request $request, int $id, PurchaseReturnService $returns): JsonResponse
    {
        $data = $request->validate([
            'quantity' => 'required|integer|min:1',
            'reason' => 'required|string|min:5|max:255',
            'refund_account_code' => ['nullable', Rule::in(['1-1000', '1-1001'])],
        ]);
        $out = $returns->returnGoods($id, (int) $data['quantity'], $data['reason'], $data['refund_account_code'] ?? null, $request->user());

        return response()->json([
            'success' => true,
            'message' => "Retur pembelian {$out['return']->reference} dibukukan.",
            'data' => [
                'purchase' => $out['purchase']->toApiArray(),
                'purchase_return' => $out['return']->toApiArray(),
                'journal' => $out['journal']?->toApiArray(),
            ],
        ], 201);
    }

    public function cancel(Request $request, int $id, PurchaseReturnService $returns): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|min:5|max:255']);
        $out = $returns->cancel($id, $data['reason'], $request->user());

        return response()->json([
            'success' => true,
            'message' => "Penerimaan {$out['purchase']->purchase_number} dibatalkan.",
            'data' => [
                'purchase' => $out['purchase']->toApiArray(),
                'purchase_return' => $out['return']->toApiArray(),
                'journal' => $out['journal']?->toApiArray(),
            ],
        ]);
    }
```

In `backend/routes/api.php` replace

```php
        Route::get('purchases', [PurchaseController::class, 'index'])->middleware('permission:goods_receipt,accounts_payable');
```

with

```php
        Route::get('purchases', [PurchaseController::class, 'index'])->middleware('permission:goods_receipt,accounts_payable,purchase_return');
        Route::middleware('permission:purchase_return')->group(function () {
            Route::post('purchases/{id}/returns', [PurchaseController::class, 'returnGoods']);
            Route::post('purchases/{id}/cancel', [PurchaseController::class, 'cancel']);
        });
```

- [ ] **Step 8: Migrate and run the tests**

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force
php artisan config:clear && php artisan test --filter='PurchaseReturnTest|GoodsReceiptTest|DocumentDateValidationTest|AccountingReportApiTest|CashFlowReportTest'
```

Expected: PASS. Then the full gate — all green.

- [ ] **Step 9: Commit**

```bash
git add backend/database/migrations/2026_10_03_000003_create_purchase_returns_tables.php backend/app/Models/PurchaseReturn.php backend/app/Models/PurchaseReturnItem.php backend/app/Models/Purchase.php backend/app/Services/Inventory/PurchaseReturnService.php backend/app/Services/Inventory/PayableService.php backend/app/Http/Controllers/Api/v1/PurchaseController.php backend/app/Http/Controllers/Api/v1/AccountingReportController.php backend/routes/api.php backend/tests/Feature/PurchaseReturnTest.php
git commit -m "feat(inventory): add purchase returns and goods receipt cancellation" -m "Goods sent back to a supplier could only be written off through opname, which left the payable standing. A return now takes units from the receipt's own batches, reduces the payable before refunding cash or bank, and an untouched receipt can be cancelled with a linked mirror entry.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B8: Subtract cash refunds from the shift's expected cash (SP2 integration)

**Files:**
- Modify: the SP2 file that computes a session's expected cash (find it in Step 1), and SP2's session test file that asserts `expected_cash`.

**Interfaces:**
- Consumes: `SalesReturn::cashRefundedInSession(int $cashSessionId): float` (B6); SP2's expected-cash computation (allocation: "Expected cash = opening_float + TUNAI net received − cash refunds (SP3) − cash expenses paid from drawer during the session").

- [ ] **Step 1: Locate SP2's formula**

Run: `grep -rn "expected_cash" backend/app backend/tests`
Open the service method that assigns `expected_cash` and the test that asserts it.

- [ ] **Step 2: Write the failing assertion in SP2's session test**

In SP2's test that closes a session after a TUNAI sale and asserts `expected_cash`, add (before the close call) a return of one unit of that sale and subtract its refund from the expected value. Use the same sale response variable SP2's test already has (called `$sale` below):

```php
        $refund = $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/returns", [
            'reason' => 'Retur sebagian untuk uji kas',
            'items' => [['sale_detail_id' => $sale->json('data.items.0.id'), 'quantity' => 1]],
        ])->assertCreated()->json('data.sales_return.refund_amount');
```

and change the expected-cash assertion from `<expected>` to `<expected> - $refund`.

Run: `cd backend && php artisan test --filter=<SP2 session test class>`
Expected: if SP2 derives expected cash from 1-1000 journal movements during the session, this already PASSES — go to Step 4 without code changes. Otherwise it FAILS by exactly `$refund`.

- [ ] **Step 3: Subtract the refunds (only if Step 2 failed)**

In the SP2 method that computes expected cash, add `use App\Models\SalesReturn;` and subtract the session's refunds from the value it assigns, keeping SP2's other terms unchanged:

```php
        $expected = round($expected - SalesReturn::cashRefundedInSession($session->id), 2);
```

(`$expected` and `$session` stand for SP2's own variable names for the computed expected cash and the session model in that method; use those names.)

- [ ] **Step 4: Run the gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add <the SP2 service file> <the SP2 test file>
git commit -m "fix(pos): subtract sales return refunds from the shift expected cash" -m "A sales return pays cash out of the drawer, so the shift's expected cash must drop by the refund or every return would show up as a shortage at close.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

If Step 2 passed without changes, commit only the test file with subject `test(pos): cover sales return refunds in the shift expected cash`.

---

# Part F — Frontend

Vitest runs `src/**/*.test.ts` in a node environment, so `.tsx` components have no unit tests here; F2–F4 are
covered by `npm run lint` (tsc) plus the browser checklist in D1. F1 carries the unit tests for the data layer.

### Task F1: Types, API calls, permissions and journal filters

**Files:**
- Create: `src/services/__tests__/stockReconciliationApi.test.ts`
- Modify: `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/services/api/posMappers.ts`, `src/services/api/posApi.ts`, `src/services/api/inventoryMappers.ts`, `src/services/api/inventoryApi.ts`, `src/services/api/stockReconciliationApi.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/services/__tests__/posMappers.test.ts`, `src/services/__tests__/authNavigationService.test.ts`

**Interfaces:**
- Consumes: B6/B7 endpoint shapes; `opening_posted` from B5.
- Produces: `PermissionKey` members `'sales_return' | 'purchase_return'`; `SaleReturnLine { sale_detail_id: number; name: string; item_type: 'PRODUCT' | 'SERVICE'; quantity: number; returned_qty: number }`; `PosTransaction.returned_amount?: number`, `PosTransaction.return_lines?: SaleReturnLine[]`; `ApiSalesReturn`; `posApi.createSalesReturn(id, { reason, items })` → `{ sale: ApiSale; sales_return: ApiSalesReturn; journal: ApiJournal | null }`; `ApiPurchase` fields `returned_amount?`, `journal_entry_number?`, `product_name?`, `quantity?`, `returnable_qty?`, status `'BATAL'`; `ApiPurchaseReturn`; `inventoryApi.returnPurchase(id, { quantity, reason, refund_account_code? })`, `inventoryApi.cancelPurchase(id, reason)` → `{ purchase: ApiPurchase; purchase_return: ApiPurchaseReturn; journal: ApiJournal | null }`; `InventoryValuation.opening_posted?: boolean`.

- [ ] **Step 1: Write the failing tests**

Create `src/services/__tests__/stockReconciliationApi.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stockReconciliationApi } from '../api/stockReconciliationApi';

const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

const rejectWith422 = () =>
  vi.fn().mockResolvedValue({
    ok: false,
    status: 422,
    json: async () => ({ message: 'Update stok lewat rekonsiliasi Excel hanya untuk migrasi stok sebelum saldo awal persediaan dibukukan.' }),
  });

describe('stockReconciliationApi after a server answer', () => {
  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', fakeStorage);
    store.set('ob3_products', JSON.stringify([{ id: '1', product_code: 'A', product_quantity: 1, stock: 1 }]));
    store.set('ob3_stock_staging', JSON.stringify({ products: [], unresolved: [], stats: {} }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it('surfaces a 422 from bulk update instead of writing locally', async () => {
    vi.stubGlobal('fetch', rejectWith422());

    await expect(
      stockReconciliationApi.bulkUpdate([{ product_id: 1, excel_stock: 5 }], {
        update_cost: false,
        update_price: false,
        update_stock: true,
        reason: 'Rekonsiliasi',
      })
    ).rejects.toMatchObject({ status: 422 });
    expect(JSON.parse(store.get('ob3_products')!)[0].product_quantity).toBe(1);
  });

  it('surfaces a 422 from commit instead of writing locally', async () => {
    vi.stubGlobal('fetch', rejectWith422());

    await expect(stockReconciliationApi.commit('2026-10')).rejects.toMatchObject({ status: 422 });
    expect(JSON.parse(store.get('ob3_products')!)).toHaveLength(1);
  });
});
```

In `src/services/__tests__/posMappers.test.ts`, inside `describe('mapSaleToTransaction', …)`, add after the test `'maps the VOID state'`:

```ts
  it('maps returned amounts and the returnable lines', () => {
    const tx = mapSaleToTransaction({ ...sale, returned_amount: 925000, items: [{ ...sale.items[0], returned_qty: 1 }] });
    expect(tx.returned_amount).toBe(925000);
    expect(tx.return_lines).toEqual([{ sale_detail_id: 1, name: 'Ban A', item_type: 'PRODUCT', quantity: 2, returned_qty: 1 }]);
    expect(mapSaleToTransaction(sale).return_lines?.[0].returned_qty).toBe(0);
    expect(mapSaleToTransaction(sale).returned_amount).toBe(0);
  });
```

In `src/services/__tests__/authNavigationService.test.ts`, in the test that checks the default role permission keys (HEAD title "default role permissions list exactly the 13 server keys (no booking DP or BON)"; SP2 raised the count), set the expected length to SP2's value + 2 (HEAD 13 + SP2 3 + SP3 2 = 18), rename the title to `'default role permissions list exactly the 18 server keys (no booking DP or BON)'`, and add inside the loop:

```ts
      expect(keys).toHaveLength(18);
      expect(keys).toContain('sales_return');
      expect(keys).toContain('purchase_return');
```

(replacing the old `toHaveLength(...)` line) and after the loop:

```ts
    expect(DEFAULT_ROLE_PERMISSIONS.KASIR.sales_return).toBe(true);
    expect(DEFAULT_ROLE_PERMISSIONS.GUDANG.purchase_return).toBe(true);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL — the two stockReconciliationApi tests resolve (local fallback) instead of rejecting; `return_lines` undefined; the key count differs. `npm run lint` also fails on `returned_qty`/`returned_amount`.

- [ ] **Step 3: Types and default permissions**

In `src/shared/types/index.ts`, append the SP3 keys at the end of the `PermissionKey` union (after SP2's members). HEAD before:

```ts
  | 'financial_reports'
  | 'role_settings';
```

After (SP2's members stay where SP2 put them, before these two):

```ts
  | 'financial_reports'
  | 'role_settings'
  | 'sales_return'
  | 'purchase_return';
```

Replace

```ts
  voided_by?: string;
  customer_phone?: string;
  mechanic_name?: string;
}
```

with

```ts
  voided_by?: string;
  customer_phone?: string;
  mechanic_name?: string;
  /** Total refund retur penjualan (tunai dari laci). */
  returned_amount?: number;
  /** Baris nota dengan id baris server, untuk retur sebagian. */
  return_lines?: SaleReturnLine[];
}

export interface SaleReturnLine {
  sale_detail_id: number;
  name: string;
  item_type: 'PRODUCT' | 'SERVICE';
  quantity: number;
  returned_qty: number;
}
```

In `src/shared/data/mockData.ts` (`DEFAULT_ROLE_PERMISSIONS`), add to the **KASIR** object as its last two properties (after `role_settings: false,` and after any SP2 keys):

```ts
    sales_return: true,
    purchase_return: false,
```

and to the **GUDANG** object as its last two properties:

```ts
    sales_return: false,
    purchase_return: true,
```

In `src/modules/settings/components/RolePermissionsTab.tsx`, after the `sale_void` definition, i.e. after

```tsx
    icon: <Ban className="w-4 h-4 text-rose-600" />,
  },
```

insert

```tsx
  {
    key: 'sales_return',
    label: 'Retur Penjualan (Refund Tunai)',
    category: 'KASIR_POS',
    description: 'Menerima retur sebagian nota: uang dikembalikan tunai dari laci (shift kasir harus dibuka) dan ban kembali ke batch FIFO asal.',
    icon: <RotateCcw className="w-4 h-4 text-blue-600" />,
  },
```

and after the `stock_opname` definition, i.e. after

```tsx
    icon: <ClipboardList className="w-4 h-4 text-emerald-600" />,
  },
```

insert

```tsx
  {
    key: 'purchase_return',
    label: 'Retur Pembelian & Batal Penerimaan',
    category: 'INVENTORY',
    description: 'Mengembalikan ban ke supplier (mengurangi hutang atau menerima refund) dan membatalkan penerimaan barang yang belum tersentuh.',
    icon: <Truck className="w-4 h-4 text-emerald-600" />,
  },
```

(`RotateCcw` and `Truck` are already imported in that file.)

- [ ] **Step 4: POS mappers and API**

In `src/services/api/posMappers.ts` replace

```ts
  unit_cost_hpp: number;
  total_cost_hpp: number;
  product: { id: number; product_name: string; brand?: string; product_size?: string; motif?: string } | null;
}
```

with

```ts
  unit_cost_hpp: number;
  total_cost_hpp: number;
  returned_qty?: number;
  product: { id: number; product_name: string; brand?: string; product_size?: string; motif?: string } | null;
}
```

replace

```ts
  void_reason?: string | null;
  items: ApiSaleItem[];
```

with

```ts
  void_reason?: string | null;
  returned_amount?: number;
  returns?: ApiSalesReturn[];
  items: ApiSaleItem[];
```

replace

```ts
  journals: ApiJournal[];
}
```

with

```ts
  journals: ApiJournal[];
}

/** Retur penjualan (Sale::toReceiptArray → returns, SalesReturn::toApiArray). */
export interface ApiSalesReturn {
  id: number;
  reference: string;
  return_date: string;
  reason: string;
  refund_amount: number;
  cost_amount: number;
  journal_entry_number?: string | null;
  operator_name?: string | null;
  items: { sale_detail_id: number; quantity: number; refund_amount: number; cost_amount: number }[];
}
```

and replace

```ts
    voided_by: s.voided_by ?? undefined,
  };
};
```

with

```ts
    voided_by: s.voided_by ?? undefined,
    returned_amount: num(s.returned_amount),
    return_lines: s.items.map((it) => ({
      sale_detail_id: it.id,
      name: it.item_name,
      item_type: it.item_type,
      quantity: it.quantity,
      returned_qty: num(it.returned_qty),
    })),
  };
};
```

In `src/services/api/posApi.ts` replace

```ts
import { ApiSale, CheckoutPayload } from './posMappers';
```

with

```ts
import { ApiJournal, ApiSale, ApiSalesReturn, CheckoutPayload } from './posMappers';
```

and replace

```ts
  voidTransaction: async (id: string | number, reason: string) =>
    (await apiClient.post<Envelope<ApiSale>>(`/pos/transactions/${id}/void`, { reason })).data,
```

with

```ts
  voidTransaction: async (id: string | number, reason: string) =>
    (await apiClient.post<Envelope<ApiSale>>(`/pos/transactions/${id}/void`, { reason })).data,

  createSalesReturn: async (id: string | number, payload: { reason: string; items: { sale_detail_id: number; quantity: number }[] }) =>
    (
      await apiClient.post<Envelope<{ sale: ApiSale; sales_return: ApiSalesReturn; journal: ApiJournal | null }>>(
        `/pos/transactions/${id}/returns`,
        payload
      )
    ).data,
```

- [ ] **Step 5: Inventory mappers and API**

In `src/services/api/inventoryMappers.ts` replace

```ts
  paid_amount: number;
  remaining_amount: number;
  status: 'LUNAS' | 'BELUM_LUNAS' | 'SEBAGIAN';
  notes?: string | null;
}

export interface InventoryValuation {
  fifo_value: number;
  ledger_balance: number;
  difference: number;
}
```

with

```ts
  paid_amount: number;
  returned_amount?: number;
  remaining_amount: number;
  status: 'LUNAS' | 'BELUM_LUNAS' | 'SEBAGIAN' | 'BATAL';
  journal_entry_number?: string | null;
  notes?: string | null;
  product_name?: string | null;
  quantity?: number;
  returnable_qty?: number;
}

/** Retur pembelian (RETURN) atau pembatalan penerimaan (CANCEL). */
export interface ApiPurchaseReturn {
  id: number;
  reference: string;
  kind: 'RETURN' | 'CANCEL';
  return_date: string;
  reason: string;
  quantity: number;
  total_amount: number;
  payable_amount: number;
  refund_amount: number;
  refund_account_code?: string | null;
  journal_entry_number?: string | null;
}

export interface InventoryValuation {
  fifo_value: number;
  ledger_balance: number;
  difference: number;
  /** Saldo awal persediaan sudah dibukukan (go-live); selisih berikutnya ditelusuri lewat stock opname. */
  opening_posted?: boolean;
}
```

`mapPurchaseToPayable` in the same file copies `status: p.status` into `PayableInvoice['status']`, which has no `'BATAL'`. Replace that line

```ts
  status: p.status,
```

with

```ts
  // BATAL tidak pernah sampai ke daftar hutang (App menyaringnya); sisa hutangnya 0.
  status: p.status === 'BATAL' ? 'LUNAS' : p.status,
```

In `src/services/api/inventoryApi.ts` replace

```ts
  ApiPurchase,
  ApiServiceCategory,
```

with

```ts
  ApiPurchase,
  ApiPurchaseReturn,
  ApiServiceCategory,
```

and replace

```ts
  payPurchase: async (id: string | number, payload: { amount: number; account_code: string; payment_date?: string; notes?: string }) =>
    (await apiClient.post<Envelope<{ purchase: ApiPurchase; journal: ApiJournal }>>(`/purchases/${id}/payments`, payload)).data,
};
```

with

```ts
  payPurchase: async (id: string | number, payload: { amount: number; account_code: string; payment_date?: string; notes?: string }) =>
    (await apiClient.post<Envelope<{ purchase: ApiPurchase; journal: ApiJournal }>>(`/purchases/${id}/payments`, payload)).data,

  // Retur pembelian & pembatalan penerimaan barang
  returnPurchase: async (id: string | number, payload: { quantity: number; reason: string; refund_account_code?: '1-1000' | '1-1001' }) =>
    (
      await apiClient.post<Envelope<{ purchase: ApiPurchase; purchase_return: ApiPurchaseReturn; journal: ApiJournal | null }>>(
        `/purchases/${id}/returns`,
        payload
      )
    ).data,
  cancelPurchase: async (id: string | number, reason: string) =>
    (
      await apiClient.post<Envelope<{ purchase: ApiPurchase; purchase_return: ApiPurchaseReturn; journal: ApiJournal | null }>>(
        `/purchases/${id}/cancel`,
        { reason }
      )
    ).data,
};
```

- [ ] **Step 6: Stop the local fallback after a server answer**

In `src/services/api/stockReconciliationApi.ts` (method `commit`) replace

```ts
    } catch (err: any) {
      // Offline / Vercel Fallback Commit to Supabase and LocalStorage
```

with

```ts
    } catch (err: any) {
      // Server menjawab (mis. 422 setelah go-live): tampilkan penolakannya, jangan menulis lokal diam-diam.
      if (err instanceof ApiError && err.status > 0) throw err;
      // Offline / Vercel Fallback Commit to Supabase and LocalStorage
```

and in method `bulkUpdate` replace

```ts
    } catch (err: any) {
      // Fallback for offline/local storage if backend is unreachable
```

with

```ts
    } catch (err: any) {
      // Server menjawab (mis. 422 setelah go-live): tampilkan penolakannya, jangan menulis lokal diam-diam.
      if (err instanceof ApiError && err.status > 0) throw err;
      // Fallback for offline/local storage if backend is unreachable
```

(`ApiError` is already imported in that file.)

- [ ] **Step 7: Journal filter groups**

In `src/modules/accounting/components/JournalTab.tsx` replace

```ts
  { id: 'SALE', label: 'Penjualan', types: ['POS_SALE', 'POS_SALE_VOID'] },
  { id: 'PURCHASE', label: 'Pembelian', types: ['PURCHASE'] },
```

with

```ts
  { id: 'SALE', label: 'Penjualan', types: ['POS_SALE', 'POS_SALE_VOID', 'SALES_RETURN'] },
  { id: 'PURCHASE', label: 'Pembelian', types: ['PURCHASE', 'PURCHASE_RETURN', 'GOODS_RECEIPT_CANCEL'] },
```

and replace

```ts
  POS_SALE_VOID: 'PEMBALIK',
```

with

```ts
  POS_SALE_VOID: 'PEMBALIK',
  SALES_RETURN: 'RETUR',
  PURCHASE_RETURN: 'RETUR',
  GOODS_RECEIPT_CANCEL: 'PEMBALIK',
```

- [ ] **Step 8: Run the gates**

Run: `npm run lint && npm test`
Expected: tsc clean; all tests pass (previous total + 3).

- [ ] **Step 9: Commit**

```bash
git add src/shared/types/index.ts src/shared/data/mockData.ts src/modules/settings/components/RolePermissionsTab.tsx src/services/api/posMappers.ts src/services/api/posApi.ts src/services/api/inventoryMappers.ts src/services/api/inventoryApi.ts src/services/api/stockReconciliationApi.ts src/modules/accounting/components/JournalTab.tsx src/services/__tests__/posMappers.test.ts src/services/__tests__/authNavigationService.test.ts src/services/__tests__/stockReconciliationApi.test.ts
git commit -m "feat(ui): add return api calls, types and permissions" -m "The screens need typed calls for sales and purchase returns, the two new permission keys and journal filters for the new entry types. The Excel reconciliation client also stops writing locally when the server has rejected the request, which would hide the go-live guard.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F2: Sales return screen in Riwayat Struk

**Files:**
- Create: `src/modules/receipt/components/SalesReturnModal.tsx`
- Modify: `src/modules/receipt/ThermalReceiptScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `posApi.createSalesReturn`, `mapSaleToTransaction`, `PosTransaction.return_lines/returned_amount` (F1).
- Produces: `SalesReturnModal` props `{ transaction: PosTransaction; onClose(): void; onSubmit(items: SalesReturnItemInput[], reason: string): Promise<boolean> }`; `SalesReturnItemInput { sale_detail_id: number; quantity: number }`; `ThermalReceiptScreen` props `onSalesReturn?: (transactionId: string, items: SalesReturnItemInput[], reason: string) => Promise<boolean>` and `canReturn?: boolean`; App handler `handleSalesReturn`.

- [ ] **Step 1: Create the modal**

Create `src/modules/receipt/components/SalesReturnModal.tsx`:

```tsx
import React, { useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { PosTransaction } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';

export interface SalesReturnItemInput {
  sale_detail_id: number;
  quantity: number;
}

interface SalesReturnModalProps {
  transaction: PosTransaction;
  onClose: () => void;
  onSubmit: (items: SalesReturnItemInput[], reason: string) => Promise<boolean>;
}

/**
 * Retur sebagian nota: kasir memilih jumlah per baris. Nilai refund dihitung server (termasuk bagian diskon nota)
 * dan diserahkan tunai dari laci; shift kasir harus sedang dibuka.
 */
export const SalesReturnModal: React.FC<SalesReturnModalProps> = ({ transaction, onClose, onSubmit }) => {
  const lines = (transaction.return_lines ?? []).filter((l) => l.quantity > l.returned_qty);
  const [qty, setQty] = useState<Record<number, number>>({});
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const items = lines
    .map((l) => ({ sale_detail_id: l.sale_detail_id, quantity: qty[l.sale_detail_id] ?? 0 }))
    .filter((i) => i.quantity > 0);

  const handleSubmit = async () => {
    if (items.length === 0) {
      setError('Isi jumlah retur minimal pada satu baris.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Alasan retur minimal 5 karakter.');
      return;
    }
    setBusy(true);
    const ok = await onSubmit(items, reason.trim());
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-return-title"
        className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-amber-700" />
          </div>
          <div className="flex-1">
            <h3 id="sales-return-title" className="text-sm font-extrabold text-slate-900">
              Retur Penjualan {transaction.invoice_number}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Refund dibayar tunai dari laci kasir; ban kembali ke batch FIFO asalnya dengan modal aslinya.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            Semua baris nota ini sudah diretur.
          </p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-1.5 font-bold">Item</th>
                <th className="py-1.5 font-bold text-right">Terjual</th>
                <th className="py-1.5 font-bold text-right">Sudah Retur</th>
                <th className="py-1.5 font-bold text-right">Retur Sekarang</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const max = l.quantity - l.returned_qty;
                return (
                  <tr key={l.sale_detail_id} className="border-b border-slate-50">
                    <td className="py-1.5 font-semibold text-slate-800">{l.name}</td>
                    <td className="py-1.5 text-right font-mono">{l.quantity}</td>
                    <td className="py-1.5 text-right font-mono">{l.returned_qty}</td>
                    <td className="py-1.5 text-right">
                      <input
                        type="number"
                        min={0}
                        max={max}
                        value={qty[l.sale_detail_id] ?? 0}
                        aria-label={`Jumlah retur ${l.name}`}
                        onChange={(e) => {
                          const n = Math.max(0, Math.min(max, parseInt(e.target.value, 10) || 0));
                          setQty((prev) => ({ ...prev, [l.sale_detail_id]: n }));
                          setError('');
                        }}
                        className="w-16 text-right px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg font-mono"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {(transaction.returned_amount ?? 0) > 0 && (
          <p className="text-[11px] text-slate-500">Refund sebelumnya: {formatRupiah(transaction.returned_amount ?? 0)}</p>
        )}

        <div className="space-y-1">
          <label htmlFor="sales-return-reason" className="block text-xs font-bold text-slate-800">
            Alasan Retur <span className="text-red-500">*</span>
          </label>
          <textarea
            id="sales-return-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError('');
            }}
            rows={2}
            placeholder="Contoh: Ukuran ban tidak cocok dengan velg pelanggan"
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-slate-800 resize-none"
          />
          {error && <p className="text-[11px] font-semibold text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || lines.length === 0}
            className="px-4 py-2 text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{busy ? 'Memproses…' : 'Bukukan Retur'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Wire it into Riwayat Struk**

In `src/modules/receipt/ThermalReceiptScreen.tsx`:

After

```tsx
import { ExportMenu } from '../../shared/export/ExportMenu';
```

add

```tsx
import { SalesReturnModal, type SalesReturnItemInput } from './components/SalesReturnModal';
```

Replace

```tsx
  /** Izin sale_void: tanpa izin ini tombol VOID tidak ditampilkan. */
  canVoid?: boolean;
}
```

with

```tsx
  /** Izin sale_void: tanpa izin ini tombol VOID tidak ditampilkan. */
  canVoid?: boolean;
  onSalesReturn?: (transactionId: string, items: SalesReturnItemInput[], reason: string) => Promise<boolean>;
  /** Izin sales_return: tanpa izin ini tombol Retur tidak ditampilkan. */
  canReturn?: boolean;
}
```

Replace

```tsx
  onVoidTransaction,
  canVoid = false,
}) => {
```

with

```tsx
  onVoidTransaction,
  canVoid = false,
  onSalesReturn,
  canReturn = false,
}) => {
```

Replace

```tsx
  const [voidError, setVoidError] = useState('');
```

with

```tsx
  const [voidError, setVoidError] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
```

Replace

```tsx
                    <span>{isCurrentVoid ? 'Sudah VOID' : 'Batalkan (VOID)'}</span>
                  </button>
                  )}
```

with

```tsx
                    <span>{isCurrentVoid ? 'Sudah VOID' : 'Batalkan (VOID)'}</span>
                  </button>
                  )}

                  {/* Tombol Retur Penjualan */}
                  {canReturn && onSalesReturn && (
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(true)}
                    disabled={isCurrentVoid}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                      isCurrentVoid
                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
                    }`}
                    title="Retur sebagian nota: refund tunai dari laci, barang kembali ke batch FIFO asal"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                    <span>Retur</span>
                  </button>
                  )}
```

Before the lines

```tsx
              {/* =========================================================
                  VIEW 1: THERMAL 80MM RECEIPT PREVIEW
```

insert

```tsx
              {!isCurrentVoid && (activeTx?.returned_amount ?? 0) > 0 && (
                <div className="w-full max-w-[680px] mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 no-print">
                  <p className="font-bold">NOTA INI MEMILIKI RETUR</p>
                  <p className="text-[11px]">
                    Total refund tunai {formatRupiah(activeTx?.returned_amount ?? 0)} • jurnal retur (4-9100) sudah dibukukan.
                  </p>
                </div>
              )}

```

Before the lines

```tsx
      {/* =========================================================
          MODAL: KONFIRMASI PEMBATALAN TRANSAKSI (VOID)
```

insert

```tsx
      {isReturnModalOpen && activeTx && onSalesReturn && (
        <SalesReturnModal
          transaction={activeTx}
          onClose={() => setIsReturnModalOpen(false)}
          onSubmit={(items, reason) => onSalesReturn(activeTx.id, items, reason)}
        />
      )}

```

(`RotateCcw` is already imported from `lucide-react` in this file.)

- [ ] **Step 3: Add the App handler**

In `src/App.tsx`, after the line

```tsx
  const errorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
```

insert

```tsx

  // Retur penjualan di server: refund tunai dari laci (shift kasir harus buka), barang kembali ke batch FIFO asal.
  const handleSalesReturn = async (
    txId: string,
    items: { sale_detail_id: number; quantity: number }[],
    reason: string
  ): Promise<boolean> => {
    try {
      const res = await posApi.createSalesReturn(txId, { items, reason });
      const tx = mapSaleToTransaction(res.sale);
      setTransactions((prev) => prev.map((t) => (t.id === txId ? tx : t)));
      if (currentReceiptTx?.id === txId) setCurrentReceiptTx(tx);
      if (res.journal) notifyLedgerChanged([res.journal]);
      handleRefreshProducts();
      toast.success(
        'Retur Penjualan Dibukukan',
        `${res.sales_return.reference}: serahkan refund tunai ${formatRupiah(res.sales_return.refund_amount)} dari laci.`
      );
      return true;
    } catch (err) {
      toast.error('Retur Ditolak', errorMessage(err));
      return false;
    }
  };
```

and replace

```tsx
                onVoidTransaction={handleVoidTransaction}
                canVoid={can('sale_void')}
```

with

```tsx
                onVoidTransaction={handleVoidTransaction}
                canVoid={can('sale_void')}
                onSalesReturn={handleSalesReturn}
                canReturn={can('sales_return')}
```

- [ ] **Step 4: Run the gates**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/modules/receipt/components/SalesReturnModal.tsx src/modules/receipt/ThermalReceiptScreen.tsx src/App.tsx
git commit -m "feat(pos): add a sales return dialog to the receipt history" -m "Cashiers need to take back part of a paid nota from the receipt screen; the dialog sends the line quantities and shows the cash refund the server computed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F3: Purchase return and receipt cancellation screen

**Files:**
- Create: `src/modules/inventory/components/PurchaseReturnModal.tsx`
- Modify: `src/modules/inventory/components/index.ts`, `src/modules/inventory/components/StockOpnameReceiptView.tsx`, `src/modules/inventory/InventoryScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `inventoryApi.listPurchases/returnPurchase/cancelPurchase`, `ApiPurchase`, `InventoryValuation.opening_posted` (F1); `handleSalesReturn` placement (F2).
- Produces: `PurchaseReturnModal` props `{ isOpen: boolean; onClose(): void; onReturn(purchaseId: number, payload: PurchaseReturnPayload): Promise<boolean>; onCancelReceipt(purchaseId: number, reason: string): Promise<boolean> }`; `PurchaseReturnPayload { quantity: number; reason: string; refund_account_code?: '1-1000' | '1-1001' }`; `InventoryScreen` props `onPurchaseReturn?`, `onCancelReceipt?`; App handlers `handlePurchaseReturn`, `handleCancelReceipt`.

- [ ] **Step 1: Create the modal**

Create `src/modules/inventory/components/PurchaseReturnModal.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Ban, RotateCcw, X } from 'lucide-react';
import { inventoryApi } from '../../../services/api';
import type { ApiPurchase } from '../../../services/api';
import { formatDateIndo, formatRupiah } from '../../../shared/utils/formatters';

export interface PurchaseReturnPayload {
  quantity: number;
  reason: string;
  refund_account_code?: '1-1000' | '1-1001';
}

interface PurchaseReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReturn: (purchaseId: number, payload: PurchaseReturnPayload) => Promise<boolean>;
  onCancelReceipt: (purchaseId: number, reason: string) => Promise<boolean>;
}

type PendingAction = { purchase: ApiPurchase; kind: 'RETURN' | 'CANCEL' };

const STATUS_LABEL: Record<ApiPurchase['status'], string> = {
  LUNAS: 'Lunas',
  BELUM_LUNAS: 'Belum Lunas',
  SEBAGIAN: 'Sebagian',
  BATAL: 'Batal',
};

/**
 * Daftar penerimaan barang (GR) untuk retur ke supplier atau pembatalan. Aturannya (hanya unit yang masih di gudang,
 * hutang dikurangi dulu, pembatalan hanya untuk GR yang belum tersentuh) ditegakkan server.
 */
export const PurchaseReturnModal: React.FC<PurchaseReturnModalProps> = ({ isOpen, onClose, onReturn, onCancelReceipt }) => {
  const [rows, setRows] = useState<ApiPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [refundAccount, setRefundAccount] = useState<'1-1000' | '1-1001'>('1-1001');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setLoadError('');
    inventoryApi
      .listPurchases('all')
      .then(setRows)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Gagal memuat penerimaan barang.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  if (!isOpen) return null;

  const start = (purchase: ApiPurchase, kind: PendingAction['kind']) => {
    setPending({ purchase, kind });
    setQuantity(1);
    setReason('');
    setFormError('');
    setRefundAccount(purchase.payment_method === 'TUNAI' ? '1-1000' : '1-1001');
  };

  const submit = async () => {
    if (!pending) return;
    if (reason.trim().length < 5) {
      setFormError('Alasan minimal 5 karakter.');
      return;
    }
    setBusy(true);
    const ok =
      pending.kind === 'RETURN'
        ? await onReturn(pending.purchase.id, { quantity, reason: reason.trim(), refund_account_code: refundAccount })
        : await onCancelReceipt(pending.purchase.id, reason.trim());
    setBusy(false);
    if (ok) {
      setPending(null);
      load();
    }
  };

  const maxQty = pending?.purchase.returnable_qty ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="purchase-return-title"
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="purchase-return-title" className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              Retur Pembelian &amp; Batal Penerimaan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Retur mengurangi hutang supplier lebih dulu, sisanya dikembalikan ke kas/bank. Pembatalan hanya untuk
              penerimaan yang belum terjual, belum dibayar, dan belum diretur.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loadError && <p className="text-xs font-semibold text-red-600">{loadError}</p>}
        {loading && <p className="text-xs text-slate-500">Memuat penerimaan barang…</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-1.5 font-bold">No. GR</th>
                <th className="py-1.5 font-bold">Tanggal</th>
                <th className="py-1.5 font-bold">Supplier</th>
                <th className="py-1.5 font-bold">Produk</th>
                <th className="py-1.5 font-bold text-right">Qty / Sisa</th>
                <th className="py-1.5 font-bold text-right">Total</th>
                <th className="py-1.5 font-bold text-right">Diretur</th>
                <th className="py-1.5 font-bold">Status</th>
                <th className="py-1.5 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="py-1.5 font-mono font-bold text-slate-800">{p.purchase_number}</td>
                  <td className="py-1.5">{formatDateIndo(p.purchase_date)}</td>
                  <td className="py-1.5">{p.supplier_name}</td>
                  <td className="py-1.5">{p.product_name ?? '-'}</td>
                  <td className="py-1.5 text-right font-mono">
                    {p.quantity ?? 0} / {p.returnable_qty ?? 0}
                  </td>
                  <td className="py-1.5 text-right font-mono">{formatRupiah(p.total_amount)}</td>
                  <td className="py-1.5 text-right font-mono">{formatRupiah(p.returned_amount ?? 0)}</td>
                  <td className="py-1.5">
                    {p.payment_method} · {STATUS_LABEL[p.status]}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => start(p, 'RETURN')}
                      disabled={p.status === 'BATAL' || (p.returnable_qty ?? 0) === 0}
                      className="px-2 py-1 mr-1 rounded-lg border border-amber-300 text-amber-800 font-bold hover:bg-amber-50 disabled:opacity-40"
                    >
                      Retur
                    </button>
                    <button
                      type="button"
                      onClick={() => start(p, 'CANCEL')}
                      disabled={p.status === 'BATAL'}
                      className="px-2 py-1 rounded-lg border border-red-300 text-red-700 font-bold hover:bg-red-50 disabled:opacity-40"
                    >
                      Batalkan
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-3 text-center text-slate-500">
                    Belum ada penerimaan barang.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pending && (
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              {pending.kind === 'RETURN' ? (
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              ) : (
                <Ban className="w-3.5 h-3.5 text-red-600" />
              )}
              {pending.kind === 'RETURN' ? 'Retur ke supplier' : 'Batalkan penerimaan'} {pending.purchase.purchase_number}
            </p>
            {pending.kind === 'RETURN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-slate-600">
                  Jumlah (maks. {maxQty})
                  <input
                    type="number"
                    min={1}
                    max={maxQty}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))}
                    className="mt-0.5 w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg font-mono"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-600">
                  Refund (bila hutang sudah lunas)
                  <select
                    value={refundAccount}
                    onChange={(e) => setRefundAccount(e.target.value as '1-1000' | '1-1001')}
                    className="mt-0.5 w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="1-1000">Kas Laci (1-1000)</option>
                    <option value="1-1001">Bank BCA (1-1001)</option>
                  </select>
                </label>
              </div>
            )}
            <label className="block text-[11px] font-bold text-slate-600">
              Alasan <span className="text-red-500">*</span>
              <textarea
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFormError('');
                }}
                rows={2}
                placeholder={pending.kind === 'RETURN' ? 'Contoh: Ban cacat produksi, dikembalikan ke distributor' : 'Contoh: Salah input faktur'}
                className="mt-0.5 w-full p-2 bg-white border border-slate-300 rounded-lg resize-none"
              />
            </label>
            {formError && <p className="text-[11px] font-semibold text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="px-3 py-1.5 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
              >
                {busy ? 'Memproses…' : pending.kind === 'RETURN' ? 'Bukukan Retur' : 'Batalkan Penerimaan'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

In `src/modules/inventory/components/index.ts` append:

```ts
export * from './PurchaseReturnModal';
```

- [ ] **Step 2: Add the entry button**

In `src/modules/inventory/components/StockOpnameReceiptView.tsx` replace

```tsx
  onOpenRestock?: () => void;
  onOpenOpname?: () => void;
}
```

with

```tsx
  onOpenRestock?: () => void;
  onOpenOpname?: () => void;
  onOpenPurchaseReturn?: () => void;
}
```

replace

```tsx
  onOpenRestock,
  onOpenOpname,
}) => {
```

with

```tsx
  onOpenRestock,
  onOpenOpname,
  onOpenPurchaseReturn,
}) => {
```

and replace

```tsx
              <ClipboardList className="w-4 h-4" />
              <span>Stock Opname</span>
            </button>
            )}
```

with

```tsx
              <ClipboardList className="w-4 h-4" />
              <span>Stock Opname</span>
            </button>
            )}
            {onOpenPurchaseReturn && (
            <button
              type="button"
              onClick={onOpenPurchaseReturn}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-amber-50 text-amber-800 border border-amber-300 text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retur / Batal Penerimaan</span>
            </button>
            )}
```

(`RotateCcw` is already imported there.)

- [ ] **Step 3: Wire the modal into the inventory screen**

In `src/modules/inventory/InventoryScreen.tsx`:

Replace

```tsx
  SupplierFormModal,
  StockReconciliationModal,
  StockMonthlyLedgerView
} from './components';
```

with

```tsx
  SupplierFormModal,
  StockReconciliationModal,
  StockMonthlyLedgerView,
  PurchaseReturnModal,
} from './components';
import type { PurchaseReturnPayload } from './components';
```

Replace

```tsx
  onPostOpeningBalance?: () => void;
  onSaveService?:
```

with

```tsx
  onPostOpeningBalance?: () => void;
  /** Retur pembelian / batal penerimaan (izin purchase_return). */
  onPurchaseReturn?: (purchaseId: number, payload: PurchaseReturnPayload) => Promise<boolean>;
  onCancelReceipt?: (purchaseId: number, reason: string) => Promise<boolean>;
  onSaveService?:
```

Replace

```tsx
  ledgerValuation,
  onPostOpeningBalance,
  onSaveService,
```

with

```tsx
  ledgerValuation,
  onPostOpeningBalance,
  onPurchaseReturn,
  onCancelReceipt,
  onSaveService,
```

Replace

```tsx
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);
```

with

```tsx
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);
  const [showPurchaseReturnModal, setShowPurchaseReturnModal] = useState<boolean>(false);
```

Replace

```tsx
                {Math.abs(ledgerValuation.difference) < 1
                  ? 'Selaras dengan buku besar'
                  : `Selisih ${formatRupiah(ledgerValuation.difference)} belum dijurnal`}
              </span>
              {Math.abs(ledgerValuation.difference) >= 1 && onPostOpeningBalance && (
```

with

```tsx
                {Math.abs(ledgerValuation.difference) < 1
                  ? 'Selaras dengan buku besar'
                  : ledgerValuation.opening_posted
                    ? `Selisih ${formatRupiah(ledgerValuation.difference)}: telusuri lewat stock opname`
                    : `Selisih ${formatRupiah(ledgerValuation.difference)} belum dijurnal`}
              </span>
              {Math.abs(ledgerValuation.difference) >= 1 && !ledgerValuation.opening_posted && onPostOpeningBalance && (
```

Replace

```tsx
          onOpenOpname={permissions.stockOpname ? () => setShowOpnameModal(true) : undefined}
        />
```

with

```tsx
          onOpenOpname={permissions.stockOpname ? () => setShowOpnameModal(true) : undefined}
          onOpenPurchaseReturn={onPurchaseReturn && onCancelReceipt ? () => setShowPurchaseReturnModal(true) : undefined}
        />
```

and before the lines

```tsx
      <StockOpnameModal
        isOpen={showOpnameModal}
```

insert

```tsx
      {onPurchaseReturn && onCancelReceipt && (
        <PurchaseReturnModal
          isOpen={showPurchaseReturnModal}
          onClose={() => setShowPurchaseReturnModal(false)}
          onReturn={onPurchaseReturn}
          onCancelReceipt={onCancelReceipt}
        />
      )}

```

- [ ] **Step 4: Add the App handlers**

In `src/App.tsx`, directly after the `handleSalesReturn` handler added in F2, insert

```tsx

  // Retur pembelian: hutang dikurangi dulu, sisanya refund kas/bank; persediaan dan daftar hutang dimuat ulang.
  const handlePurchaseReturn = async (
    purchaseId: number,
    payload: { quantity: number; reason: string; refund_account_code?: '1-1000' | '1-1001' }
  ): Promise<boolean> => {
    try {
      const res = await inventoryApi.returnPurchase(purchaseId, payload);
      if (res.journal) notifyLedgerChanged([res.journal]);
      refreshPayables();
      handleRefreshProducts();
      toast.success(
        'Retur Pembelian Dibukukan',
        `${res.purchase_return.reference}: ${formatRupiah(res.purchase_return.total_amount)} dikembalikan ke ${res.purchase.supplier_name}.`
      );
      return true;
    } catch (err) {
      toast.error('Retur Pembelian Ditolak', errorMessage(err));
      return false;
    }
  };

  // Pembatalan penerimaan yang belum tersentuh: jurnal cermin pembelian.
  const handleCancelReceipt = async (purchaseId: number, reason: string): Promise<boolean> => {
    try {
      const res = await inventoryApi.cancelPurchase(purchaseId, reason);
      if (res.journal) notifyLedgerChanged([res.journal]);
      refreshPayables();
      handleRefreshProducts();
      toast.warning('Penerimaan Dibatalkan', `${res.purchase.purchase_number} dibatalkan (${res.purchase_return.reference}).`);
      return true;
    } catch (err) {
      toast.error('Pembatalan Ditolak', errorMessage(err));
      return false;
    }
  };
```

Replace

```tsx
      .then((rows) => setPayableInvoices(rows.filter((p) => p.payment_method === 'TEMPO').map(mapPurchaseToPayable)))
```

with

```tsx
      .then((rows) => setPayableInvoices(rows.filter((p) => p.payment_method === 'TEMPO' && p.status !== 'BATAL').map(mapPurchaseToPayable)))
```

and replace

```tsx
                onPostOpeningBalance={can('accounting_hub') ? handlePostOpeningBalance : undefined}
```

with

```tsx
                onPostOpeningBalance={can('accounting_hub') ? handlePostOpeningBalance : undefined}
                onPurchaseReturn={can('purchase_return') ? handlePurchaseReturn : undefined}
                onCancelReceipt={can('purchase_return') ? handleCancelReceipt : undefined}
```

- [ ] **Step 5: Run the gates**

Run: `npm run lint && npm test`
Expected: tsc clean, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/modules/inventory/components/PurchaseReturnModal.tsx src/modules/inventory/components/index.ts src/modules/inventory/components/StockOpnameReceiptView.tsx src/modules/inventory/InventoryScreen.tsx src/App.tsx
git commit -m "feat(inventory): add purchase return and receipt cancel screen" -m "Warehouse staff can now send received units back to the supplier or cancel an untouched receipt from the stock tab; the opening-balance button disappears once the inventory ledger is live.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F4: Service-only manual item form

**Files:**
- Modify: `src/modules/pos/components/ManualItemForm.tsx` (full replacement)

**Interfaces:**
- Consumes: B4 (server rejects manual goods, ignores `cost_price`).
- Produces: `ManualItemForm` props unchanged (`onAddToCart: (item: CartItem) => void`); the `ManualItemType` export is removed (no other file imports it — verify with `grep -rn ManualItemType src`).

- [ ] **Step 1: Replace the form**

Replace the whole content of `src/modules/pos/components/ManualItemForm.tsx` with:

```tsx
import React, { useState } from 'react';
import { Minus, Plus, Sparkles, Wrench } from 'lucide-react';
import { CartItem, ProductItem, ServiceMasterItem } from '../../../shared/types';
import { formatRupiah, parseRupiahInput } from '../../../shared/utils/formatters';
import { useToast } from '../../../shared/components';

interface ManualItemFormProps {
  onAddToCart: (item: CartItem) => void;
}

const PRESETS = [
  { name: 'Tambal Tubeless Tip Top Dingin', price: 35000, label: 'Tambal Tip Top (Rp 35rb)' },
  { name: 'Ongkos Press Velg Retak/Penyok', price: 150000, label: 'Press Velg (Rp 150rb)' },
  { name: 'Jasa Pasang & Balancing Velg Luar', price: 50000, label: 'Pasang Velg Luar (Rp 50rb)' },
];

/**
 * Input manual kasir hanya untuk jasa dadakan: dibukukan sebagai pendapatan jasa (4-1001) tanpa HPP.
 * Barang non-katalog harus didaftarkan dan diterima lewat Penerimaan Barang agar HPP FIFO tercatat.
 */
export const ManualItemForm: React.FC<ManualItemFormProps> = ({ onAddToCart }) => {
  const toast = useToast();
  const [itemName, setItemName] = useState('');
  const [sellPriceInput, setSellPriceInput] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');

  const sellPrice = parseRupiahInput(sellPriceInput);
  const total = sellPrice * qty;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sellPrice <= 0) {
      toast.warning('Harga Jasa Kosong', 'Harap masukkan tarif jasa (minimal Rp 1).');
      return;
    }
    if (!itemName.trim()) {
      toast.warning('Nama Jasa Kosong', 'Harap isi nama jasa yang dikerjakan.');
      return;
    }

    const name = itemName.trim();
    const itemId = `manual-${Date.now()}`;
    const service: ServiceMasterItem = {
      id: itemId,
      service_code: `SRV-MANUAL-${Math.floor(100 + Math.random() * 900)}`,
      service_name: name,
      category: 'JASA_MANUAL',
      standard_price: sellPrice,
      cost_price: 0,
      is_active: true,
      description: notes.trim() || 'Input Manual Jasa Kasir',
    };

    onAddToCart({
      item_type: 'SERVICE',
      product: {
        id: `syn-${itemId}`,
        name,
        category: 'SERVICES' as any,
        price: sellPrice,
        cost: 0,
        stock: 999,
        product_name: name,
        product_price: sellPrice,
        product_cost: 0,
      } as ProductItem,
      service,
      qty,
      discount_per_item: 0,
      custom_price: sellPrice,
      custom_hpp: 0,
      custom_name_override: name,
      note: notes.trim() || undefined,
      is_manual: true,
    });

    toast.success('Jasa Manual Ditambahkan', `${name} (${qty}x) masuk ke keranjang kasir.`);
    setItemName('');
    setSellPriceInput('');
    setNotes('');
    setQty(1);
  };

  return (
    <div className="p-3 sm:p-4 bg-white rounded-2xl border border-slate-200 shadow-xs max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-black text-slate-900">Input Jasa Manual Kasir</h3>
          <p className="text-[11px] text-slate-500">
            Untuk jasa dadakan yang belum ada di master jasa. Barang non-katalog harus didaftarkan dan diterima lewat
            Penerimaan Barang dulu agar HPP FIFO tercatat.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="manual-service-name" className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-cyan-600" />
            Nama Layanan Jasa <span className="text-rose-600">*</span>
          </label>
          <input
            id="manual-service-name"
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Cth: Tambal Tip Top Khusus Ban Tubeless / Press Velg"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-bold focus:border-blue-600 focus:outline-none"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500">Preset Cepat:</span>
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setItemName(p.name);
                  setSellPriceInput(String(p.price));
                }}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-700 cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="manual-service-price" className="text-xs font-black text-slate-800 block mb-1">
              Tarif Jasa Satuan (Rp) <span className="text-rose-600">*</span>
            </label>
            <input
              id="manual-service-price"
              type="text"
              value={sellPriceInput ? formatRupiah(sellPrice).replace('Rp ', '') : ''}
              onChange={(e) => setSellPriceInput(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-sm font-black focus:bg-white focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 block mb-1">Jumlah (Qty)</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="1"
                aria-label="Jumlah"
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="flex-1 text-center py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-base font-black text-slate-900"
              />
              <button
                type="button"
                aria-label="Tambah jumlah"
                onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="manual-service-notes" className="text-[11px] font-bold text-slate-600 block mb-1">
            Catatan Khusus Baris (Opsional)
          </label>
          <input
            id="manual-service-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cth: Garansi tambal 1 pekan"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium focus:bg-white focus:border-blue-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Masukkan Jasa ke Keranjang ({formatRupiah(total)})</span>
        </button>
      </form>
    </div>
  );
};
```

- [ ] **Step 2: Run the gates**

Run: `grep -rn "ManualItemType" src` (expect no output), then `npm run lint && npm test`.
Expected: tsc clean, all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/modules/pos/components/ManualItemForm.tsx
git commit -m "refactor(pos): limit the manual item form to services" -m "The server now rejects manual goods lines because they had no FIFO cost; the form keeps only ad-hoc services, which carry no cost of sales, so the HPP field is gone too.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part D — Docs

### Task D1: Update the agent docs, roadmap and handoff

**Files:**
- Modify: `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/domain-inventory.md`, `docs/ai/domain-pos.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`

Read each file as SP6/SP2 left it and edit the named sections; keep the existing writing style (English, short sentences).

- [ ] **Step 1: `docs/ai/domain-accounting.md`**
  - COA: raise the account count by one; add the row `| 4-9100 | Retur Penjualan (contra-revenue; sales returns) | REVENUE | D |` after 4-9000 and mention migration `2026_10_03_000001_add_sales_return_account_and_permissions`.
  - `reference_type` list: add `SALES_RETURN`, `PURCHASE_RETURN`, `GOODS_RECEIPT_CANCEL`; add `TEST_ALIGN` as "tests only (`AlignsInventoryLedger`), never in production".
  - Posting rules table, new rows: **Sales return** — Dr 4-9100 refund, Dr 1-2000 restored cost / Cr 1-1000 refund, Cr 5-1000 restored cost (`Pos/SalesReturnService`); **Purchase return** — Dr 2-1000 applied payable, Dr 1-1000/1-1001 refund / Cr 1-2000 (`Inventory/PurchaseReturnService::returnGoods`); **GR cancellation** — mirror of the `PURCHASE` entry, `reversal_of_id` set (`PurchaseReturnService::cancel`).
  - Update the "Opening inventory" row: posted once (`OPENING-INV-…`), marks go-live, refused afterwards (422 / console exit 1). Update the POS sale row: manual lines are services only (no cost of sales).
  - Reports: the three new types are bucketed by account (customers for 4-9100, suppliers for 1-2000); 4-9100 shows as contra revenue.
- [ ] **Step 2: `docs/ai/domain-inventory.md`**
  - FIFO allocation step 4: replace the `product_cost` fallback text with "throws `PosRuleException` (422) when the batches hold fewer units; stock opname matches the batch layers to the physical count, which repairs old drift".
  - `InventoryValueJournal`: `postOpeningBalance()` is one-shot and marks go-live; `assertBeforeGoLive()` guards the Excel commit and `update_stock` selective updates; `GET /inventory/valuation` returns `opening_posted`.
  - New section "Purchase returns and cancellation": only units still in the GR's batches, newest batch first, value Σ qty × batch_cost, payable first then refund (default TUNAI → 1-1000, else 1-1001), `purchases.returned_amount`, `remaining() = total − returned − paid`, cancellation only when untouched, status `BATAL`.
  - Monthly ledger inline batch cost: only batches without purchase link, allocations or consumption.
  - Known issues: in item 1 drop the causes "the FIFO shortfall fallback, a void of such a sale"; in item 2 add "refused after go-live".
- [ ] **Step 3: `docs/ai/domain-pos.md`**
  - Checkout: manual lines are services only (PRODUCT + `is_manual` → 422); `cost_price` ignored; a sale beyond the FIFO layers → 422.
  - New section "Sales return (`POST /pos/transactions/{id}/returns`, permission `sales_return`)": cash refund from the drawer with an OPEN shift, server-computed refund (nota discount share, last return takes the remainder), units back to the consumed batches (`quantity_returned`), `RTJ-` numbers, dated today, `SALES_RETURN` journal, lines without allocation rows → 422.
  - Void: refused once the sale has a return; units without allocation rows come back as `VOID-…` batches at their booked cost.
  - Known issues: remove 3 and 4 (fixed); keep the others.
- [ ] **Step 4: `docs/ai/api-reference.md`**: add `POST /pos/transactions/{id}/returns` (`sales_return`), `POST /purchases/{id}/returns` and `POST /purchases/{id}/cancel` (`purchase_return`); `GET /purchases` also accepts `purchase_return`; `POST /inventory/opening-balance` is one-shot (422 afterwards) and the valuation carries `opening_posted`; `payment_date` ≤ today and ≥ invoice date; `purchase_date` ≤ today; console `inventory:opening-balance` exits 1 after go-live.
- [ ] **Step 5: `docs/ai/data-model.md`**: add `sales_returns`, `sales_return_items`, `purchase_returns`, `purchase_return_items`; columns `sale_batch_allocations.quantity_returned`, `purchases.returned_amount`; purchase status `BATAL`; raise the migration count by 3.
- [ ] **Step 6: `AGENTS.md` and `backend/AGENTS.md`**: COA count +1 with 4-9100 in rule 2; the migration-status table's POS and inventory rows mention sales returns and purchase returns/cancellation; the backend service list adds `Pos/SalesReturnService` and `Inventory/PurchaseReturnService`; the tests section mentions `AlignsInventoryLedger` (use it instead of calling the opening-balance endpoint) and `OpensReturnCashSession`; setup: `php artisan inventory:opening-balance` runs **once** per database.
- [ ] **Step 7: `docs/ai/workflow-and-gotchas.md`**: spec/plan status row `| 09-30 | transaction corrections (roadmap SP3) | done |`; update the frontend test count; glossary rows "Retur penjualan / retur pembelian" and "Go-live (saldo awal persediaan dibukukan)".
- [ ] **Step 8: Roadmap and handoff**: in `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` add under "Sub-project 3" the line `→ spec 2026-09-30-transaction-corrections-design.md — done (<date>, commits <first>..<last>)` and mark each finding fixed; in `docs/superpowers/plans/2026-09-30-accounting-handoff.md` mark sub-project 3 done in the table and update the gate counts (backend and frontend totals after this plan).
- [ ] **Step 9: Browser checklist (manual; record the result in the handoff)**: as owner on the dev DB — open a shift (SP2), sell 2 units by transfer, return 1 in Riwayat Struk (toast shows the refund; journal filter "Penjualan" shows a `RETUR` badge); goods receipt TEMPO 2 units, pay part, return 1 via "Penerimaan & Stok Opname → Retur / Batal Penerimaan"; cancel another untouched receipt; the valuation banner stays "Selaras"; POS "Input Manual" offers only services; no console errors.
- [ ] **Step 10: Commit**

```bash
git add AGENTS.md backend/AGENTS.md docs/ai/domain-accounting.md docs/ai/domain-inventory.md docs/ai/domain-pos.md docs/ai/api-reference.md docs/ai/data-model.md docs/ai/workflow-and-gotchas.md docs/superpowers/specs/2026-09-29-accounting-roadmap.md docs/superpowers/plans/2026-09-30-accounting-handoff.md
git commit -m "docs(accounting): describe sales and purchase returns and the fifo guards" -m "Agents and the thesis write-up need the new return flows, the one-shot inventory opening balance and the removed FIFO fallback documented where they look first.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
