# Remove DP/Booking Inden, BON and EDC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove three POS features end to end (DP/booking inden, BON credit sales with the receivables sub-ledger, EDC card payments with fee settings and surcharge), so every sale is paid in full at checkout with Tunai, Transfer or QRIS (alone or split).

**Architecture:** Backend first: delete the booking/receivable/EDC-settings endpoints (B1), then simplify checkout, void and the sale model so only fully paid sales are produced (B2), then deactivate the three COA accounts and drop the two permission keys with migrations (B3). Frontend next: the POS terminal and sale mapping (F1), the ledger/permissions/settings/export side (F2), help texts and e2e scripts (F3). Docs last (D1). Tables and columns stay in the database, unused. A final manual step lets the user reset the dev DB.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-remove-dp-bon-edc-design.md`.

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md` and `docs/ai/domain-accounting.md` before starting.
- **Never stage, modify or revert the user's uncommitted files:** `src/modules/inventory/components/GoodsReceiptModal.tsx`, `src/services/purchaseInvoiceService.ts`, `src/services/__tests__/purchaseInvoiceService.test.ts`, `docs/flowchart/`, `docs/flowchart.zip`, `.claude/`. Stage files **by explicit path**; never `git add -A`, `git add .` or `git commit -a`. Deleted files are staged with `git add <path>` (or `git rm <path>`).
- Commits go directly on `main`: Conventional Commits with a scope, in English, lowercase imperative subject, a short body explaining why, and the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- All user-facing text (UI, validation and error messages) is Indonesian.
- Journals are only written through `AccountingEngine::createEntry` (directly or via `JournalDraft`). Never insert `journal_entries`/`journal_items` by hand.
- Business-rule violations throw `App\Exceptions\PosRuleException` (422). API envelope `{ "success": true, "message"?: "...", "data": ... }`.
- **Do not drop tables or columns.** `sales_bookings`, `receivable_payments`, `edc_settings`, `sales.booking_id/dp_applied/due_date/edc_bank/edc_type/surcharge_amount`, `sale_payments.edc_bank/edc_type/surcharge_amount` stay; no code reads or writes them afterwards.
- New backend test classes use `Illuminate\Foundation\Testing\DatabaseTransactions`. Never name a test helper `post()` (it collides with Laravel's `TestCase::post()`); use names like `postJournal()`.
- Laragon MySQL must be running for backend tests (`phpunit.xml` targets MySQL `project-skripsi_ob_testing`).
- After adding a migration, migrate the testing DB before running tests: Git Bash `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force`; PowerShell `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`.
- Gates: backend tasks end with `cd backend && composer test` passing; frontend tasks end with `npm run lint && npm test` passing (repo root). `tsc` does not flag unused imports (no `noUnusedLocals`), so an icon import left unused after a JSX deletion is harmless; remove it only when this plan says so.
- Frontend business dates use `localDate()` from `src/services/accountingPeriod.ts`, never `toISOString()`, in any code you add.
- Commands below use Git Bash syntax from the repo root `C:\laragon\www\Project_SkripsiOB` unless a `cd` is shown.

## File Map

Backend (delete):
- `backend/app/Http/Controllers/Api/v1/BookingController.php`, `backend/app/Http/Controllers/Api/v1/ReceivableController.php`
- `backend/app/Services/Pos/BookingService.php`, `backend/app/Services/Pos/ReceivableService.php`
- `backend/app/Models/EdcSetting.php`, `backend/app/Models/SalesBooking.php`, `backend/app/Models/ReceivablePayment.php`
- `backend/tests/Feature/BookingApiTest.php`, `backend/tests/Feature/ReceivableApiTest.php`

Backend (create):
- `backend/tests/Feature/RemovedPosFeaturesTest.php` — 404s for removed endpoints, payment options, inactive accounts, historic journals in reports.
- `backend/database/migrations/2026_09_30_000001_deactivate_dp_bon_edc_accounts.php`
- `backend/database/migrations/2026_09_30_000002_remove_dp_bon_permission_keys.php`

Backend (modify): `routes/api.php`, `app/Http/Controllers/Api/v1/PaymentMethodSettingController.php`, `app/Http/Controllers/Api/v1/PosController.php`, `app/Http/Requests/PosCheckoutRequest.php`, `app/Services/Pos/CheckoutService.php`, `app/Services/Pos/CartLines.php`, `app/Services/Pos/PosAccounts.php`, `app/Services/Pos/SaleVoidService.php`, `app/Models/Sale.php`, `app/Models/SalePayment.php`, `app/Support/Permissions.php`, `database/seeders/DatabaseSeeder.php`, `database/seeders/AccountCoaSeeder.php`, tests `Feature/PaymentMethodSettingsParityTest.php`, `Feature/AuthorizationTest.php`, `Feature/PosCheckoutTest.php`, `Feature/PosVoidTest.php`, `Feature/CashFlowReportTest.php`, `Unit/ModelRelationshipTest.php`, `Unit/UserPermissionTest.php`.

Frontend (delete):
- `src/modules/pos/components/BookingDpModal.tsx`, `src/modules/pos/components/BookingListDrawer.tsx`
- `src/modules/accounting/components/AccountsReceivableTab.tsx`

Frontend (modify): `src/shared/types/index.ts`, `src/services/api/posMappers.ts`, `src/services/api/posApi.ts`, `src/services/posService.ts`, `src/services/supabaseDataService.ts`, `src/shared/data/mockData.ts`, `src/App.tsx`, `src/modules/pos/PosScreen.tsx`, `src/modules/pos/components/CheckoutModal.tsx`, `src/modules/pos/components/index.ts`, `src/modules/pos/components/PosSuccessModal.tsx`, `src/modules/pos/components/ReceiptPreviewModal.tsx`, `src/modules/receipt/ThermalReceiptScreen.tsx`, `src/modules/dashboard/ExecutiveDashboardScreen.tsx`, `src/modules/settings/components/PaymentMethodsTab.tsx`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/modules/settings/SettingsScreen.tsx`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/modules/accounting/components/index.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/modules/accounting/components/CashFlowStatementTab.tsx`, `src/modules/accounting/components/ManualJournalModal.tsx`, `src/modules/accounting/components/OpeningBalanceModal.tsx`, `src/shared/components/NotificationBellDropdown.tsx`, `src/shared/components/HeaderNavbar.tsx`, `src/shared/components/WireframeGuideModal.tsx`, `src/shared/export/registry.ts`, tests `src/services/__tests__/posMappers.test.ts`, `src/services/__tests__/authNavigationService.test.ts`, `src/modules/pos/__tests__/posRepairsAudit.test.ts`, `src/modules/settings/__tests__/financialsSettingsAudit.test.ts`, `src/shared/export/__tests__/registry.test.ts`, e2e `tests/e2e/test_pos_ui_deep_audit.mjs`, `tests/e2e/test_expenses_ledger_ui_audit.mjs`, `tests/e2e/test_dashboard_auth_ui_audit.mjs`, `tests/e2e/test_financials_receipt_settings_global_audit.mjs`.

Docs (modify, Task D1): `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md`, `docs/ai/domain-accounting.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`.

Not touched (stale/historical, out of scope): `README.md`, `docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md`, `docs/superpowers/specs/2026-09-24-pos-server-checkout-design.md`, `tests/e2e/screenshots/**` (generated output), all migrations before 2026-09-30.

---

# Part B — Backend

### Task B1: Remove the booking, receivable and EDC-settings endpoints

**Files:**
- Create: `backend/tests/Feature/RemovedPosFeaturesTest.php`
- Delete: `backend/app/Http/Controllers/Api/v1/BookingController.php`, `backend/app/Http/Controllers/Api/v1/ReceivableController.php`, `backend/app/Services/Pos/BookingService.php`, `backend/app/Services/Pos/ReceivableService.php`, `backend/app/Models/EdcSetting.php`, `backend/tests/Feature/BookingApiTest.php`, `backend/tests/Feature/ReceivableApiTest.php`
- Modify: `backend/routes/api.php`, `backend/app/Http/Controllers/Api/v1/PaymentMethodSettingController.php` (full replacement), `backend/database/seeders/DatabaseSeeder.php`, `backend/tests/Feature/PaymentMethodSettingsParityTest.php`, `backend/tests/Feature/AuthorizationTest.php`

**Interfaces:**
- Produces: `GET /api/v1/pos/payment-options` → `data: { bank_providers, qris_providers }` (no `edc_settings`).
- Produces: `/api/v1/bookings*`, `/api/v1/receivables*`, `/api/v1/settings/edc*` → 404.
- Keeps (removed in B2): models `SalesBooking`, `ReceivablePayment`, `Sale::booking()`, `Sale::receivablePayments()`, checkout BON/DP/EDC branches.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/Feature/RemovedPosFeaturesTest.php`:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DP/booking inden, BON (piutang) dan EDC dihapus dari POS: endpoint lamanya tidak ada lagi.
 */
class RemovedPosFeaturesTest extends TestCase
{
    use DatabaseTransactions;

    public static function removedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings/1/cancel'],
            ['GET', '/api/v1/receivables'],
            ['POST', '/api/v1/receivables/1/payments'],
            ['GET', '/api/v1/settings/edc'],
            ['POST', '/api/v1/settings/edc'],
            ['PUT', '/api/v1/settings/edc/1'],
            ['DELETE', '/api/v1/settings/edc/1'],
        ];
    }

    #[DataProvider('removedEndpoints')]
    public function test_removed_endpoint_returns_404(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertNotFound();
    }

    public function test_payment_options_only_list_bank_and_qris_providers(): void
    {
        $this->getJson('/api/v1/pos/payment-options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['bank_providers', 'qris_providers']])
            ->assertJsonMissingPath('data.edc_settings');
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && php artisan test --filter=RemovedPosFeaturesTest`
Expected: FAIL — every endpoint answers 200/201/422 instead of 404, and `data.edc_settings` is present.

- [ ] **Step 3: Delete the controllers, services, EDC model and their tests**

```bash
git rm backend/app/Http/Controllers/Api/v1/BookingController.php \
       backend/app/Http/Controllers/Api/v1/ReceivableController.php \
       backend/app/Services/Pos/BookingService.php \
       backend/app/Services/Pos/ReceivableService.php \
       backend/app/Models/EdcSetting.php \
       backend/tests/Feature/BookingApiTest.php \
       backend/tests/Feature/ReceivableApiTest.php
```

- [ ] **Step 4: Remove the routes**

In `backend/routes/api.php`:

Delete these two import lines:

```php
use App\Http\Controllers\Api\v1\BookingController;
```
```php
use App\Http\Controllers\Api\v1\ReceivableController;
```

Replace this block:

```php
        // Booking inden & DP
        Route::get('bookings', [BookingController::class, 'index'])->middleware('permission:booking_dp,pos');
        Route::middleware('permission:booking_dp')->group(function () {
            Route::post('bookings', [BookingController::class, 'store']);
            Route::post('bookings/{id}/cancel', [BookingController::class, 'cancel']);
        });

        // Piutang BON pelanggan
        Route::middleware('permission:bon_receivable,accounting_hub')->group(function () {
            Route::get('receivables', [ReceivableController::class, 'index']);
            Route::post('receivables/{saleId}/payments', [ReceivableController::class, 'pay']);
        });

        // Payment Method Settings (Parity ProjectOmahBan)
        Route::middleware('permission:role_settings,pos')->group(function () {
            Route::get('settings/payment-providers', [PaymentMethodSettingController::class, 'indexProviders']);
            Route::get('settings/edc', [PaymentMethodSettingController::class, 'indexEdc']);
        });
        Route::middleware('permission:role_settings')->group(function () {
            Route::post('settings/payment-providers', [PaymentMethodSettingController::class, 'storeProvider']);
            Route::put('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'updateProvider']);
            Route::delete('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'deleteProvider']);
            Route::post('settings/edc', [PaymentMethodSettingController::class, 'storeEdc']);
            Route::put('settings/edc/{id}', [PaymentMethodSettingController::class, 'updateEdc']);
            Route::delete('settings/edc/{id}', [PaymentMethodSettingController::class, 'deleteEdc']);
        });
```

with:

```php
        // Pengaturan rekening transfer & provider QRIS (EDC tidak lagi didukung)
        Route::get('settings/payment-providers', [PaymentMethodSettingController::class, 'indexProviders'])->middleware('permission:role_settings,pos');
        Route::middleware('permission:role_settings')->group(function () {
            Route::post('settings/payment-providers', [PaymentMethodSettingController::class, 'storeProvider']);
            Route::put('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'updateProvider']);
            Route::delete('settings/payment-providers/{id}', [PaymentMethodSettingController::class, 'deleteProvider']);
        });
```

- [ ] **Step 5: Replace the payment settings controller**

Replace the whole content of `backend/app/Http/Controllers/Api/v1/PaymentMethodSettingController.php` with:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\PaymentProviderSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentMethodSettingController extends Controller
{
    /**
     * Opsi pembayaran aktif untuk kasir: rekening transfer dan provider QRIS.
     */
    public function getPaymentOptions(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'bank_providers' => PaymentProviderSetting::active()->bank()->get(),
                'qris_providers' => PaymentProviderSetting::active()->qris()->get(),
            ],
        ]);
    }

    /**
     * List all payment providers (transfer & qris) for settings page.
     */
    public function indexProviders(Request $request): JsonResponse
    {
        $query = PaymentProviderSetting::query()->orderBy('method_type')->orderBy('sort_order');

        if ($request->filled('method_type')) {
            $query->where('method_type', $request->method_type);
        }

        return response()->json([
            'success' => true,
            'data' => $query->get(),
        ]);
    }

    /**
     * Store new payment provider.
     */
    public function storeProvider(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'method_type' => 'required|in:bank,qris',
            'provider_name' => 'required|string|max:100',
            'provider_code' => 'nullable|string|max:50',
            'fee_percentage' => 'nullable|numeric|min:0|max:100',
            'fee_threshold_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $provider = PaymentProviderSetting::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Provider pembayaran berhasil ditambahkan.',
            'data' => $provider,
        ], 201);
    }

    /**
     * Update existing payment provider.
     */
    public function updateProvider(Request $request, $id): JsonResponse
    {
        $provider = PaymentProviderSetting::findOrFail($id);

        $validated = $request->validate([
            'provider_name' => 'sometimes|required|string|max:100',
            'provider_code' => 'nullable|string|max:50',
            'fee_percentage' => 'nullable|numeric|min:0|max:100',
            'fee_threshold_amount' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer',
            'notes' => 'nullable|string',
        ]);

        $provider->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Provider pembayaran berhasil diperbarui.',
            'data' => $provider,
        ]);
    }

    /**
     * Delete payment provider.
     */
    public function deleteProvider($id): JsonResponse
    {
        $provider = PaymentProviderSetting::findOrFail($id);
        $provider->delete();

        return response()->json([
            'success' => true,
            'message' => 'Provider pembayaran berhasil dihapus.',
        ]);
    }
}
```

- [ ] **Step 6: Drop the unused seeder import**

In `backend/database/seeders/DatabaseSeeder.php` delete the line:

```php
use App\Models\EdcSetting;
```

and replace the comment line `        // 3. Payment Providers & Surcharges` with `        // 3. Provider pembayaran (transfer & QRIS)`.

- [ ] **Step 7: Update the existing settings and authorization tests**

In `backend/tests/Feature/PaymentMethodSettingsParityTest.php`:
- delete the line `use App\Models\EdcSetting;`
- in `test_pos_payment_options_endpoint_returns_active_settings`, delete the line `                    'edc_settings',` from `assertJsonStructure` and delete the line `        $this->assertNotEmpty($data['edc_settings']);`
- delete the whole method `test_edc_settings_crud_endpoints()` (from `    public function test_edc_settings_crud_endpoints(): void` through its closing `    }`).

In `backend/tests/Feature/AuthorizationTest.php`, in `protectedEndpoints()`, replace

```php
            ['POST', '/api/v1/settings/edc'],
```

with

```php
            ['POST', '/api/v1/settings/payment-providers'],
```

- [ ] **Step 8: Check that nothing references the removed code**

Run:

```bash
grep -rnE "BookingController|ReceivableController|BookingService|ReceivableService|EdcSetting|indexEdc|storeEdc|updateEdc|deleteEdc|'bookings|'receivables|settings/edc" backend/app backend/routes backend/database/seeders backend/tests --exclude=RemovedPosFeaturesTest.php
```

Expected: no output.

- [ ] **Step 9: Run the tests**

Run: `cd backend && php artisan test --filter='RemovedPosFeaturesTest|PaymentMethodSettingsParityTest|AuthorizationTest'`
Expected: PASS.
Then run the gate: `cd backend && composer test` — expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add backend/routes/api.php \
        backend/app/Http/Controllers/Api/v1/PaymentMethodSettingController.php \
        backend/database/seeders/DatabaseSeeder.php \
        backend/tests/Feature/RemovedPosFeaturesTest.php \
        backend/tests/Feature/PaymentMethodSettingsParityTest.php \
        backend/tests/Feature/AuthorizationTest.php
git status --short   # the seven deleted files must show as "D " (staged by git rm); nothing else staged
git commit -m "$(cat <<'EOF'
refactor(pos): remove booking, receivable and edc settings endpoints

Booking DP, BON receivables and EDC card payments are dropped from the
POS. Their endpoints now return 404 and payment options list only bank
and QRIS providers. Tables stay so historic journals remain valid.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B2: Settle every sale at checkout (no BON, DP or EDC in checkout, void and the sale model)

**Files:**
- Modify (full replacement): `backend/app/Services/Pos/CheckoutService.php`, `backend/app/Services/Pos/PosAccounts.php`, `backend/app/Services/Pos/CartLines.php`, `backend/app/Services/Pos/SaleVoidService.php`, `backend/app/Http/Requests/PosCheckoutRequest.php`, `backend/app/Models/Sale.php`, `backend/app/Models/SalePayment.php`
- Modify: `backend/app/Http/Controllers/Api/v1/PosController.php`, tests `backend/tests/Feature/PosCheckoutTest.php`, `backend/tests/Feature/PosVoidTest.php`, `backend/tests/Feature/CashFlowReportTest.php`, `backend/tests/Unit/ModelRelationshipTest.php`
- Delete: `backend/app/Models/SalesBooking.php`, `backend/app/Models/ReceivablePayment.php`

**Interfaces:**
- Produces: `POST /pos/checkout` accepts `payments[].method` ∈ `TUNAI|TRANSFER|TRANSFER_BCA|QRIS`; `bon` and `booking_id` are `prohibited` (422 with Indonesian message); EDC methods → 422 on `payments.N.method`.
- Produces: `PosAccounts::CHECKOUT_METHODS = ['TUNAI', 'TRANSFER', 'TRANSFER_BCA', 'QRIS']`; constants `RECEIVABLE`, `CUSTOMER_DEPOSIT`, `SURCHARGE`, `DEPOSIT_METHODS` removed.
- Produces: `CartLines::build(array $items): array` (always locks catalogue products and checks stock).
- Produces: `Sale::toReceiptArray()` without `dp_applied`, `booking_id`, `edc_bank`, `edc_type`, `surcharge_amount`, `due_date`, `receivable_paid` (and per payment without `surcharge_amount`, `edc_bank`, `edc_type`). Sale `status` is `LUNAS` at checkout.
- Consumed by: Task F1 (frontend `ApiSale`, `PaymentPayload`, `CheckoutPayload`).

- [ ] **Step 1: Write the failing checkout tests**

In `backend/tests/Feature/PosCheckoutTest.php`:

(a) In `test_cash_checkout_computes_change_fifo_cogs_and_balanced_journal`, replace

```php
            ->assertJsonPath('data.status', 'LUNAS');
```

with

```php
            ->assertJsonPath('data.status', 'LUNAS')
            ->assertJsonMissingPath('data.dp_applied')
            ->assertJsonMissingPath('data.booking_id')
            ->assertJsonMissingPath('data.due_date')
            ->assertJsonMissingPath('data.receivable_paid')
            ->assertJsonMissingPath('data.surcharge_amount');
```

(b) Delete the four methods `test_edc_credit_surcharge_is_revenue_and_mdr_is_expense`, `test_split_cash_and_edc_debit`, `test_bon_creates_receivable_with_due_date` and `test_bon_with_payments_is_rejected` (each from its `public function` line through its closing `    }`), and insert these four methods in their place:

```php
    public function test_edc_methods_are_rejected(): void
    {
        $product = $this->makeProduct();

        foreach (['EDC_DEBIT', 'EDC_CREDIT'] as $method) {
            $this->checkout([
                'items' => [$this->productLine($product)],
                'payments' => [['method' => $method, 'amount' => 1000000, 'fee_percentage' => 2]],
            ])->assertStatus(422)->assertJsonValidationErrors('payments.0.method');
        }

        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_split_cash_and_qris_books_mdr_to_expense_without_surcharge(): void
    {
        $product = $this->makeProduct();
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [
                ['method' => 'TUNAI', 'amount' => 400000, 'tendered' => 400000],
                ['method' => 'QRIS', 'amount' => 600000, 'fee_percentage' => 0.5, 'provider_name' => 'QRIS BCA'],
            ],
        ])->assertCreated();

        $res->assertJsonPath('data.payment_method', 'SPLIT')
            ->assertJsonPath('data.status', 'LUNAS')
            ->assertJsonPath('data.total_amount', 1000000)
            ->assertJsonPath('data.paid_amount', 1000000)
            ->assertJsonPath('data.fee_amount', 3000)
            ->assertJsonCount(2, 'data.payments')
            ->assertJsonMissingPath('data.payments.1.edc_bank')
            ->assertJsonMissingPath('data.payments.1.surcharge_amount');

        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(400000, $j['1-1000']['debit']);
        $this->assertEquals(597000, $j['1-1001']['debit']);
        $this->assertEquals(3000, $j['6-1009']['debit']);
        $this->assertEquals(1000000, $j['4-1000']['credit']);
        $this->assertArrayNotHasKey('4-2000', $j);
        $this->assertArrayNotHasKey('1-1002', $j);
        $this->assertArrayNotHasKey('2-1004', $j);
    }

    public function test_bon_checkout_is_rejected(): void
    {
        $product = $this->makeProduct();

        $this->checkout([
            'items' => [$this->productLine($product)],
            'bon' => ['term_days' => 14],
        ])->assertStatus(422)->assertJsonValidationErrors('bon');

        $this->checkout([
            'items' => [$this->productLine($product)],
            'bon' => ['term_days' => 7],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonValidationErrors('bon');

        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_booking_id_is_rejected(): void
    {
        $product = $this->makeProduct();

        $this->checkout([
            'items' => [$this->productLine($product)],
            'booking_id' => 1,
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000]],
        ])->assertStatus(422)->assertJsonValidationErrors('booking_id');

        $this->assertSame(10, $product->fresh()->product_quantity);
    }
```

- [ ] **Step 2: Update the void test**

In `backend/tests/Feature/PosVoidTest.php`:
- delete the line `use App\Models\ReceivablePayment;`
- replace the whole method `test_bon_with_settlement_cannot_be_voided()` with:

```php
    public function test_void_of_split_cash_and_qris_sale_reverses_mdr(): void
    {
        $product = $this->makeProduct();
        $sale = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [
                ['method' => 'TUNAI', 'amount' => 400000, 'tendered' => 500000],
                ['method' => 'QRIS', 'amount' => 600000, 'fee_percentage' => 0.5],
            ],
        ])->assertCreated();

        $res = $this->postJson("/api/v1/pos/transactions/{$sale->json('data.id')}/void", ['reason' => 'Pelanggan batal'])
            ->assertOk()
            ->assertJsonPath('data.status', 'VOID');

        $reversal = $this->journalByAccount($res->json('data.reference'), 'POS_SALE_VOID');
        $this->assertEquals(400000, $reversal['1-1000']['credit']);
        $this->assertEquals(597000, $reversal['1-1001']['credit']);
        $this->assertEquals(3000, $reversal['6-1009']['credit']);
        $this->assertEquals(1000000, $reversal['4-1000']['debit']);
        $this->assertSame(10, $product->fresh()->product_quantity);
    }
```

- [ ] **Step 3: Rewrite the cash-flow fixture without a BON sale**

In `backend/tests/Feature/CashFlowReportTest.php`, in `postAprilActivity()`, replace

```php
        // Penjualan BON sebagian: kas 50rb + piutang 50rb, HPP 60rb.
        $this->postJournal('2021-04-10', [['1-1000', 50000, 0], ['1-1002', 50000, 0], ['4-1000', 0, 100000]]);
```

with

```php
        // Penjualan lunas split: tunai 50rb + transfer 50rb, HPP 60rb.
        $this->postJournal('2021-04-10', [['1-1000', 50000, 0], ['1-1001', 50000, 0], ['4-1000', 0, 100000]]);
```

In `test_cash_flow_classifies_and_reconciles()` replace

```php
        $this->assertEquals(50000, $cf['operating']['customers']);
        $this->assertEquals(-40000, $cf['operating']['suppliers']);
        $this->assertEquals(-20000, $cf['operating']['expenses']);
        $this->assertEquals(-10000, $cf['operating']['net']);
        $this->assertEquals(0, $cf['investing']['net']);
        $this->assertEquals(500000, $cf['financing']['equity']);
        $this->assertEquals(490000, $cf['net_change']);
```

with

```php
        $this->assertEquals(100000, $cf['operating']['customers']);
        $this->assertEquals(-40000, $cf['operating']['suppliers']);
        $this->assertEquals(-20000, $cf['operating']['expenses']);
        $this->assertEquals(40000, $cf['operating']['net']);
        $this->assertEquals(0, $cf['investing']['net']);
        $this->assertEquals(500000, $cf['financing']['equity']);
        $this->assertEquals(540000, $cf['net_change']);
```

In `test_cash_flow_endpoint_and_cash_balances()` replace `->assertJsonPath('data.net_change', 490000)` with `->assertJsonPath('data.net_change', 540000)`.

In `backend/tests/Unit/ModelRelationshipTest.php` delete the line `use App\Models\SalesBooking;` and the line `        $this->assertInstanceOf(SalesBooking::class, new SalesBooking());`, and rename the method `test_all_fourteen_models_can_be_instantiated` to `test_core_models_can_be_instantiated`.

- [ ] **Step 4: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter='PosCheckoutTest|PosVoidTest|CashFlowReportTest|ModelRelationshipTest'`
Expected: FAIL — `test_edc_methods_are_rejected` (201 instead of 422), `test_bon_checkout_is_rejected` (201), `test_booking_id_is_rejected` (422 without a `booking_id` validation error), the cash test (`data.dp_applied` present), and the split test (`data.payments.1.edc_bank` present). `CashFlowReportTest` and `PosVoidTest` already pass.

- [ ] **Step 5: Replace the checkout request**

Replace the whole content of `backend/app/Http/Requests/PosCheckoutRequest.php` with:

```php
<?php

namespace App\Http\Requests;

use App\Services\Pos\PosAccounts;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Checkout POS: klien hanya mengirim baris keranjang & pembayaran; seluruh total dihitung server.
 * Setiap nota lunas saat checkout (Tunai, Transfer, QRIS, atau kombinasinya).
 */
class PosCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'customer_name' => 'nullable|string|max:100',
            'customer_phone' => 'nullable|string|max:30',
            'vehicle_plate' => 'nullable|string|max:30',
            'vehicle_model' => 'nullable|string|max:60',
            'notes' => 'nullable|string|max:500',
            'items' => 'required|array|min:1',
            'items.*.type' => ['required', Rule::in(['PRODUCT', 'SERVICE'])],
            'items.*.product_id' => 'nullable|integer',
            'items.*.service_id' => 'nullable|integer',
            'items.*.name' => 'required|string|max:200',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_per_item' => 'nullable|numeric|min:0',
            'items.*.is_manual' => 'nullable|boolean',
            'items.*.cost_price' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            // Klien lama yang masih mengirim BON / booking DP ditolak, bukan diabaikan diam-diam.
            'booking_id' => 'prohibited',
            'bon' => 'prohibited',
            'payments' => 'nullable|array',
            'payments.*.method' => ['required', Rule::in(PosAccounts::CHECKOUT_METHODS)],
            'payments.*.amount' => 'required|numeric|min:0.01',
            'payments.*.tendered' => 'nullable|numeric|min:0',
            'payments.*.fee_percentage' => 'nullable|numeric|min:0|max:10',
            'payments.*.provider_name' => 'nullable|string|max:100',
            'payments.*.reference' => 'nullable|string|max:100',
        ];
    }

    public function messages(): array
    {
        return [
            'booking_id.prohibited' => 'Booking DP sudah tidak didukung. Selesaikan nota dengan pembayaran penuh.',
            'bon.prohibited' => 'Penjualan BON (piutang) sudah tidak didukung. Setiap nota harus lunas saat checkout.',
            'payments.*.method.in' => 'Metode pembayaran tidak dikenal. Gunakan Tunai, Transfer, atau QRIS.',
        ];
    }
}
```

- [ ] **Step 6: Replace `PosAccounts`**

Replace the whole content of `backend/app/Services/Pos/PosAccounts.php` with:

```php
<?php

namespace App\Services\Pos;

/**
 * Kode akun COA SAK EMKM yang dipakai siklus POS.
 */
final class PosAccounts
{
    public const CASH = '1-1000';
    public const BANK = '1-1001';
    public const INVENTORY = '1-2000';
    public const REVENUE_GOODS = '4-1000';
    public const REVENUE_SERVICE = '4-1001';
    public const SALES_DISCOUNT = '4-9000';
    public const COGS = '5-1000';
    public const MDR_EXPENSE = '6-1009';

    /** Setiap nota lunas saat checkout: tidak ada BON, DP booking, atau EDC. */
    public const CHECKOUT_METHODS = ['TUNAI', 'TRANSFER', 'TRANSFER_BCA', 'QRIS'];

    public static function forMethod(string $method): string
    {
        return $method === 'TUNAI' ? self::CASH : self::BANK;
    }
}
```

- [ ] **Step 7: Replace `CartLines`**

Replace the whole content of `backend/app/Services/Pos/CartLines.php` with:

```php
<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\Product;
use App\Models\ServiceMaster;

/**
 * Menormalkan baris keranjang dari klien menjadi baris yang dihitung server:
 * nama & referensi katalog divalidasi, nilai kotor/diskon/bersih dihitung ulang,
 * produk katalog dikunci dan qty-nya dicek terhadap stok.
 */
class CartLines
{
    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public static function build(array $items): array
    {
        $requested = [];
        $lines = [];

        foreach ($items as $item) {
            $type = $item['type'];
            $isManual = (bool) ($item['is_manual'] ?? false);
            $qty = (int) $item['quantity'];
            $unitPrice = round((float) $item['unit_price'], 2);
            $discountPerItem = round((float) ($item['discount_per_item'] ?? 0), 2);
            $product = null;
            $serviceId = null;
            $name = trim((string) $item['name']);

            if ($type === 'PRODUCT' && ! $isManual) {
                if (empty($item['product_id'])) {
                    throw new PosRuleException("Produk \"{$name}\" tidak terdaftar di katalog.");
                }
                $product = Product::lockForUpdate()->find($item['product_id']);
                if (! $product || ! $product->is_active) {
                    throw new PosRuleException("Produk \"{$name}\" tidak ditemukan atau sudah nonaktif.");
                }
                $name = $product->product_name;

                $requested[$product->id] = ($requested[$product->id] ?? 0) + $qty;
                if ($requested[$product->id] > $product->product_quantity) {
                    throw new PosRuleException("Stok {$product->product_name} tidak cukup (sisa {$product->product_quantity}).");
                }
            }

            if ($type === 'SERVICE' && ! empty($item['service_id'])) {
                $service = ServiceMaster::find($item['service_id']);
                if (! $service) {
                    throw new PosRuleException("Jasa \"{$name}\" tidak ditemukan.");
                }
                $serviceId = $service->id;
                $name = $service->service_name;
            }

            $gross = round($qty * $unitPrice, 2);
            $discount = round($qty * $discountPerItem, 2);
            if ($discount > $gross) {
                throw new PosRuleException("Diskon untuk \"{$name}\" melebihi harga barisnya.");
            }

            $lines[] = [
                'type' => $type,
                'is_manual' => $isManual,
                'product' => $product,
                'service_id' => $serviceId,
                'name' => $name,
                'quantity' => $qty,
                'unit_price' => $unitPrice,
                'discount_per_item' => $discountPerItem,
                'gross' => $gross,
                'discount' => $discount,
                'net' => round($gross - $discount, 2),
                'manual_cost' => $isManual ? round((float) ($item['cost_price'] ?? 0), 2) : 0.0,
            ];
        }

        return $lines;
    }
}
```

- [ ] **Step 8: Replace `CheckoutService`**

Replace the whole content of `backend/app/Services/Pos/CheckoutService.php` with:

```php
<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\Sale;
use App\Models\SaleDetail;
use App\Models\SalePayment;
use App\Models\User;
use App\Services\AccountingEngine;
use App\Services\DocumentNumber;
use App\Services\FifoCostingService;
use App\Services\JournalDraft;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Support\Facades\DB;

/**
 * Checkout POS: server menghitung ulang seluruh angka dari baris keranjang dan pembayaran,
 * memotong stok FIFO, lalu membukukan jurnal SAK EMKM dalam satu transaksi DB.
 * Setiap nota lunas saat checkout (Tunai, Transfer, QRIS, atau kombinasinya).
 */
class CheckoutService
{
    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
        private readonly MidtransQrisService $qris,
    ) {
    }

    public function checkout(array $data, ?User $user): Sale
    {
        return DB::transaction(function () use ($data, $user) {
            $lines = CartLines::build($data['items']);

            $subtotal = round(array_sum(array_column($lines, 'net')), 2);
            $notaDiscount = round((float) ($data['discount_amount'] ?? 0), 2);
            if ($notaDiscount > $subtotal) {
                throw new PosRuleException('Diskon nota melebihi subtotal belanja.');
            }
            $grandTotal = round($subtotal - $notaDiscount, 2);

            $payments = $this->buildPayments($data['payments'] ?? [], $grandTotal);

            $reference = DocumentNumber::next(Sale::class, 'reference', 'OB3-INV');
            $date = now()->toDateString();
            $single = count($payments) === 1 ? $payments[0] : null;

            $sale = Sale::create([
                'reference' => $reference,
                'date' => $date,
                'customer_name' => $data['customer_name'] ?? 'Pelanggan Walk-In',
                'customer_phone' => $data['customer_phone'] ?? null,
                'vehicle_plate' => $data['vehicle_plate'] ?? 'Umum',
                'vehicle_model' => $data['vehicle_model'] ?? null,
                'cashier_name' => $user?->name ?? 'Kasir POS',
                'gross_sales_amount' => round(array_sum(array_column($lines, 'gross')), 2),
                'discount_amount' => round(array_sum(array_column($lines, 'discount')) + $notaDiscount, 2),
                'total_amount' => $grandTotal,
                'paid_amount' => round(array_sum(array_column($payments, 'amount')), 2),
                'change_amount' => round(array_sum(array_column($payments, 'change_amount')), 2),
                'payment_method' => $single['method'] ?? 'SPLIT',
                'payment_reference' => $single['reference'] ?? null,
                'payment_provider' => $single['provider_name'] ?? null,
                'fee_percentage' => $single['fee_percentage'] ?? 0,
                'fee_amount' => round(array_sum(array_column($payments, 'fee_amount')), 2),
                'net_received' => round(array_sum(array_column($payments, 'net_received')), 2),
                'total_hpp' => 0,
                'total_profit' => 0,
                'notes' => $data['notes'] ?? null,
                'status' => 'LUNAS',
                'stock_deducted' => true,
                'branch_id' => 3,
            ]);

            $fifoCogs = $this->storeLines($sale, $lines);
            $manualCost = round(array_sum(array_map(fn ($l) => $l['manual_cost'] * $l['quantity'], $lines)), 2);
            $sale->update([
                'total_hpp' => round($fifoCogs + $manualCost, 2),
                'total_profit' => round($grandTotal - $fifoCogs - $manualCost, 2),
            ]);

            foreach ($payments as $payment) {
                SalePayment::create(['sale_id' => $sale->id] + $payment);
            }

            $this->postJournal($sale, $lines, $payments, $notaDiscount, $fifoCogs);

            return $sale->fresh();
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildPayments(array $input, float $amountDue): array
    {
        $payments = [];
        foreach ($input as $row) {
            $method = $row['method'];
            $amount = round((float) $row['amount'], 2);
            $pct = $method === 'TUNAI' ? 0.0 : (float) ($row['fee_percentage'] ?? 0);

            $tendered = $amount;
            if ($method === 'TUNAI') {
                $tendered = round((float) ($row['tendered'] ?? $amount), 2);
                if ($tendered < $amount) {
                    throw new PosRuleException('Uang tunai yang diterima kurang dari nominal pembayaran tunai.');
                }
            }

            if ($method === 'QRIS' && ! empty($row['reference'])) {
                $status = $this->qris->checkStatus($row['reference'])['transaction_status'] ?? 'pending';
                if (! in_array($status, ['settlement', 'capture'], true)) {
                    throw new PosRuleException('Pembayaran QRIS belum diterima (status: '.$status.').');
                }
            }

            $fee = round($amount * $pct / 100);

            $payments[] = [
                'method' => $method,
                'account_code' => PosAccounts::forMethod($method),
                'amount' => $amount,
                'tendered_amount' => $tendered,
                'change_amount' => round($tendered - $amount, 2),
                'fee_percentage' => $pct,
                'fee_amount' => $fee,
                'net_received' => round($amount - $fee, 2),
                'provider_name' => $row['provider_name'] ?? null,
                'reference' => $row['reference'] ?? null,
            ];
        }

        $paid = round(array_sum(array_column($payments, 'amount')), 2);
        if (abs($paid - $amountDue) > 0.001) {
            throw new PosRuleException(
                'Total pembayaran (Rp '.number_format($paid, 0, ',', '.').') tidak sama dengan tagihan (Rp '.number_format($amountDue, 0, ',', '.').').'
            );
        }

        return $payments;
    }

    /**
     * Simpan baris nota; baris produk katalog memotong stok FIFO. Mengembalikan total HPP FIFO.
     */
    private function storeLines(Sale $sale, array $lines): float
    {
        $fifoCogs = 0.0;

        foreach ($lines as $line) {
            $detail = SaleDetail::create([
                'sale_id' => $sale->id,
                'product_id' => $line['product']?->id,
                'item_type' => $line['type'],
                'item_name' => $line['name'],
                'service_id' => $line['service_id'],
                'is_manual' => $line['is_manual'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'sub_total' => $line['net'],
                'discount_amount' => $line['discount'],
                'unit_cost_hpp' => $line['manual_cost'],
                'total_cost_hpp' => round($line['manual_cost'] * $line['quantity'], 2),
                'profit_amount' => round($line['net'] - $line['manual_cost'] * $line['quantity'], 2),
            ]);

            if ($line['product']) {
                $cogs = $this->fifo->allocateFifo($line['product']->id, $line['quantity'], $detail->id, $sale->reference)['total_cogs'];
                $fifoCogs += $cogs;
                $detail->update([
                    'unit_cost_hpp' => round($cogs / $line['quantity'], 2),
                    'total_cost_hpp' => $cogs,
                    'profit_amount' => round($line['net'] - $cogs, 2),
                ]);
            }
        }

        return round($fifoCogs, 2);
    }

    private function postJournal(Sale $sale, array $lines, array $payments, float $notaDiscount, float $fifoCogs): void
    {
        $ref = $sale->reference;
        $draft = new JournalDraft();

        foreach ($payments as $p) {
            $draft->debit($p['account_code'], $p['net_received'], "Penerimaan {$p['method']} Nota {$ref}");
        }
        $draft->debit(PosAccounts::MDR_EXPENSE, array_sum(array_column($payments, 'fee_amount')), "Beban MDR QRIS Nota {$ref}");
        $draft->debit(PosAccounts::SALES_DISCOUNT, array_sum(array_column($lines, 'discount')) + $notaDiscount, "Diskon penjualan Nota {$ref}");

        $goods = array_sum(array_map(fn ($l) => $l['type'] === 'PRODUCT' ? $l['gross'] : 0, $lines));
        $services = array_sum(array_map(fn ($l) => $l['type'] === 'SERVICE' ? $l['gross'] : 0, $lines));
        $draft->credit(PosAccounts::REVENUE_GOODS, $goods, "Pendapatan ban & barang Nota {$ref}");
        $draft->credit(PosAccounts::REVENUE_SERVICE, $services, "Pendapatan jasa Nota {$ref}");

        $draft->debit(PosAccounts::COGS, $fifoCogs, "HPP FIFO Nota {$ref}");
        $draft->credit(PosAccounts::INVENTORY, $fifoCogs, "Pengurangan persediaan Nota {$ref}");

        // Nota bernilai Rp 0 (mis. jasa gratis tanpa HPP) tidak menggerakkan akun apa pun: tanpa jurnal.
        if ($draft->isEmpty()) {
            return;
        }

        $draft->post($this->engine, 'POS_SALE', $ref, "Penjualan POS Kasir Nota {$ref} ({$sale->customer_name})", $sale->date->toDateString());
    }
}
```

- [ ] **Step 9: Replace `SaleVoidService`**

Replace the whole content of `backend/app/Services/Pos/SaleVoidService.php` with:

```php
<?php

namespace App\Services\Pos;

use App\Exceptions\PosRuleException;
use App\Models\JournalEntry;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\AccountingEngine;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;

/**
 * Void nota: membalik jurnal penjualan dan mengembalikan stok ke batch FIFO asalnya.
 */
class SaleVoidService
{
    public function __construct(private readonly AccountingEngine $engine)
    {
    }

    public function void(int $saleId, string $reason, User $user): Sale
    {
        return DB::transaction(function () use ($saleId, $reason, $user) {
            $sale = Sale::lockForUpdate()->findOrFail($saleId);

            if ($sale->status === 'VOID') {
                throw new PosRuleException("Nota {$sale->reference} sudah pernah dibatalkan.");
            }

            $this->restoreStock($sale, $user);
            $this->postReversal($sale, $reason);

            $sale->update([
                'status' => 'VOID',
                'voided_at' => now(),
                'voided_by' => $user->name,
                'void_reason' => $reason,
            ]);

            return $sale->fresh();
        });
    }

    private function restoreStock(Sale $sale, User $user): void
    {
        $sale->load('details.allocations');

        foreach ($sale->details as $detail) {
            if (! $detail->product_id) {
                continue;
            }

            foreach ($detail->allocations as $allocation) {
                ProductBatch::whereKey($allocation->product_batch_id)->lockForUpdate()->first()
                    ?->increment('remaining_qty', $allocation->quantity_allocated);
            }

            $product = Product::lockForUpdate()->find($detail->product_id);
            if (! $product) {
                continue;
            }
            $product->increment('product_quantity', $detail->quantity);

            StockMovement::create([
                'product_id' => $product->id,
                'movement_type' => 'MASUK',
                'quantity' => $detail->quantity,
                'balance_after' => $product->product_quantity,
                'reference_type' => 'SALE_VOID',
                'reference_id' => $sale->reference,
                'description' => "Pengembalian stok void nota {$sale->reference}",
                'operator_name' => $user->name,
                'branch_id' => $product->branch_id ?? 3,
            ]);
        }
    }

    private function postReversal(Sale $sale, string $reason): void
    {
        $original = JournalEntry::with('items')
            ->where('reference_type', 'POS_SALE')
            ->where('reference_id', $sale->reference)
            ->first();
        if (! $original) {
            // Nota Rp 0 tanpa HPP FIFO tidak pernah dijurnal, jadi tidak ada yang dibalik.
            if ((float) $sale->gross_sales_amount > 0) {
                throw (new ModelNotFoundException())->setModel(JournalEntry::class);
            }

            return;
        }

        $items = $original->items->map(fn ($item) => [
            'account_id' => $item->account_id,
            'debit' => (float) $item->credit,
            'credit' => (float) $item->debit,
            'note' => '[VOID] '.$item->note,
        ])->all();

        $this->engine->createEntry(
            'POS_SALE_VOID',
            $sale->reference,
            "Jurnal pembalik void nota {$sale->reference}: {$reason}",
            $items,
            now()->toDateString(),
            3
        );
    }
}
```

- [ ] **Step 10: Replace the sale models**

Replace the whole content of `backend/app/Models/Sale.php` with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Kolom lama booking_id, dp_applied, due_date, edc_bank, edc_type dan surcharge_amount tetap ada di tabel
 * (riwayat), tetapi tidak lagi dibaca atau ditulis: DP booking, BON dan EDC sudah dihapus dari POS.
 */
class Sale extends Model
{
    use HasFactory;

    protected $table = 'sales';

    protected $fillable = [
        'reference',
        'date',
        'customer_name',
        'customer_phone',
        'vehicle_plate',
        'vehicle_model',
        'cashier_name',
        'gross_sales_amount',
        'discount_amount',
        'total_amount',
        'paid_amount',
        'change_amount',
        'payment_method',
        'payment_reference',
        'payment_provider',
        'fee_percentage',
        'fee_amount',
        'net_received',
        'total_hpp',
        'total_profit',
        'notes',
        'status',
        'voided_at',
        'voided_by',
        'void_reason',
        'stock_deducted',
        'branch_id',
    ];

    protected $casts = [
        'date' => 'date',
        'gross_sales_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'voided_at' => 'datetime',
        'fee_percentage' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'net_received' => 'decimal:2',
        'total_hpp' => 'decimal:2',
        'total_profit' => 'decimal:2',
        'stock_deducted' => 'boolean',
        'branch_id' => 'integer',
    ];

    public function details(): HasMany
    {
        return $this->hasMany(SaleDetail::class);
    }

    public function journalEntry(): HasOne
    {
        return $this->hasOne(JournalEntry::class, 'reference_id', 'reference')->where('reference_type', 'POS_SALE');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    /**
     * Satu bentuk nota untuk seluruh respons POS (checkout, riwayat, void).
     */
    public function toReceiptArray(): array
    {
        $this->loadMissing(['details.product', 'payments']);
        $journal = JournalEntry::with('items.account')
            ->where('reference_id', $this->reference)
            ->whereIn('reference_type', ['POS_SALE', 'POS_SALE_VOID'])
            ->orderBy('id')
            ->get();

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'date' => $this->date?->toDateString(),
            'created_at' => $this->created_at?->toIso8601String(),
            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'vehicle_plate' => $this->vehicle_plate,
            'vehicle_model' => $this->vehicle_model,
            'cashier_name' => $this->cashier_name,
            'gross_sales_amount' => (float) $this->gross_sales_amount,
            'discount_amount' => (float) $this->discount_amount,
            'total_amount' => (float) $this->total_amount,
            'paid_amount' => (float) $this->paid_amount,
            'change_amount' => (float) $this->change_amount,
            'payment_method' => $this->payment_method,
            'payment_provider' => $this->payment_provider,
            'fee_amount' => (float) $this->fee_amount,
            'net_received' => (float) $this->net_received,
            'total_hpp' => (float) $this->total_hpp,
            'total_profit' => (float) $this->total_profit,
            'notes' => $this->notes,
            'status' => $this->status,
            'voided_at' => $this->voided_at?->toIso8601String(),
            'voided_by' => $this->voided_by,
            'void_reason' => $this->void_reason,
            'items' => $this->details->map(fn (SaleDetail $d) => [
                'id' => $d->id,
                'item_type' => $d->item_type,
                'item_name' => $d->item_name ?? $d->product?->product_name,
                'product_id' => $d->product_id,
                'service_id' => $d->service_id,
                'is_manual' => $d->is_manual,
                'quantity' => $d->quantity,
                'unit_price' => (float) $d->unit_price,
                'discount_per_item' => $d->quantity > 0 ? round((float) $d->discount_amount / $d->quantity, 2) : 0.0,
                'sub_total' => (float) $d->sub_total,
                'unit_cost_hpp' => (float) $d->unit_cost_hpp,
                'total_cost_hpp' => (float) $d->total_cost_hpp,
                'product' => $d->product ? [
                    'id' => $d->product->id,
                    'product_name' => $d->product->product_name,
                    'brand' => $d->product->brand,
                    'product_size' => $d->product->product_size,
                    'motif' => $d->product->motif,
                ] : null,
            ])->values()->all(),
            'payments' => $this->payments->map(fn (SalePayment $p) => [
                'method' => $p->method,
                'account_code' => $p->account_code,
                'amount' => (float) $p->amount,
                'tendered_amount' => (float) $p->tendered_amount,
                'change_amount' => (float) $p->change_amount,
                'fee_percentage' => (float) $p->fee_percentage,
                'fee_amount' => (float) $p->fee_amount,
                'net_received' => (float) $p->net_received,
                'provider_name' => $p->provider_name,
                'reference' => $p->reference,
            ])->values()->all(),
            'journals' => $journal->map(fn (JournalEntry $j) => $j->toApiArray())->values()->all(),
        ];
    }
}
```

Replace the whole content of `backend/app/Models/SalePayment.php` with:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Satu baris pembayaran nota (Tunai, Transfer atau QRIS). Kolom lama surcharge_amount, edc_bank dan
 * edc_type tetap ada di tabel untuk riwayat, tetapi tidak lagi dipakai.
 */
class SalePayment extends Model
{
    protected $fillable = [
        'sale_id', 'method', 'account_code', 'amount', 'tendered_amount', 'change_amount',
        'fee_percentage', 'fee_amount', 'net_received', 'provider_name', 'reference',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'tendered_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'fee_percentage' => 'decimal:2',
        'fee_amount' => 'decimal:2',
        'net_received' => 'decimal:2',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
```

- [ ] **Step 11: Stop eager-loading receivable payments and delete the two models**

In `backend/app/Http/Controllers/Api/v1/PosController.php` replace

```php
        $query = Sale::with(['details.product', 'payments', 'receivablePayments'])
```

with

```php
        $query = Sale::with(['details.product', 'payments'])
```

Then:

```bash
git rm backend/app/Models/SalesBooking.php backend/app/Models/ReceivablePayment.php
```

- [ ] **Step 12: Check that nothing references the removed code**

Run:

```bash
grep -rnE "SalesBooking|ReceivablePayment|receivablePayments|booking_id|dp_applied|edc_bank|edc_type|surcharge|CUSTOMER_DEPOSIT|PosAccounts::RECEIVABLE|DEPOSIT_METHODS|reserveStock|cartRules|charge_to_customer|PENDING|'BON'" backend/app backend/routes
```

Expected: no output.

- [ ] **Step 13: Run the tests**

Run: `cd backend && php artisan test --filter='PosCheckoutTest|PosVoidTest|CashFlowReportTest|ModelRelationshipTest|FinancialReportTest'`
Expected: PASS. (`FinancialReportTest` still posts 4-2000 and 2-1004 journals directly through `JournalDraft`; the accounts exist, so it keeps passing.)
Then the gate: `cd backend && composer test` — expected: all tests pass.

- [ ] **Step 14: Commit**

```bash
git add backend/app/Services/Pos/CheckoutService.php \
        backend/app/Services/Pos/PosAccounts.php \
        backend/app/Services/Pos/CartLines.php \
        backend/app/Services/Pos/SaleVoidService.php \
        backend/app/Http/Requests/PosCheckoutRequest.php \
        backend/app/Http/Controllers/Api/v1/PosController.php \
        backend/app/Models/Sale.php \
        backend/app/Models/SalePayment.php \
        backend/tests/Feature/PosCheckoutTest.php \
        backend/tests/Feature/PosVoidTest.php \
        backend/tests/Feature/CashFlowReportTest.php \
        backend/tests/Unit/ModelRelationshipTest.php
git status --short   # SalesBooking.php and ReceivablePayment.php show as "D "; nothing else staged
git commit -m "$(cat <<'EOF'
refactor(pos): settle every sale at checkout without bon, dp or edc

Checkout now accepts only Tunai, Transfer and QRIS (alone or split)
and rejects bon, booking_id and EDC methods with 422 so old clients
cannot create a credit sale. The sale journal no longer touches 1-1002,
2-1004 or 4-2000; QRIS MDR still goes to 6-1009. Void keeps mirroring
the sale entry and no longer reactivates bookings.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task B3: Deactivate the DP/BON/surcharge accounts and drop the two permission keys

**Files:**
- Create: `backend/database/migrations/2026_09_30_000001_deactivate_dp_bon_edc_accounts.php`, `backend/database/migrations/2026_09_30_000002_remove_dp_bon_permission_keys.php`
- Modify: `backend/app/Support/Permissions.php` (full replacement), `backend/database/seeders/AccountCoaSeeder.php`, `backend/tests/Feature/RemovedPosFeaturesTest.php` (full replacement), `backend/tests/Feature/AuthorizationTest.php`, `backend/tests/Unit/UserPermissionTest.php`

**Interfaces:**
- Produces: accounts 1-1002, 2-1004, 4-2000 with `is_active = false` (still in `GET /accounts`); 6-1009 active.
- Produces: `Permissions::KEYS` with 13 keys (no `booking_dp`, `bon_receivable`); `Permissions::DEFAULTS['KASIR'] = ['pos', 'receipt']`; no `role_permissions` rows for the removed keys.
- Consumed by: Task F2 (frontend `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`).

- [ ] **Step 1: Write the failing tests**

Replace the whole content of `backend/tests/Feature/RemovedPosFeaturesTest.php` with:

```php
<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Services\Accounting\FinancialReportService;
use App\Services\AccountingEngine;
use App\Services\JournalDraft;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * DP/booking inden, BON (piutang) dan EDC dihapus dari POS: endpoint lamanya tidak ada lagi,
 * akunnya nonaktif, tetapi jurnal lama tetap tampil di laporan.
 */
class RemovedPosFeaturesTest extends TestCase
{
    use DatabaseTransactions;

    public static function removedEndpoints(): array
    {
        return [
            ['GET', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings'],
            ['POST', '/api/v1/bookings/1/cancel'],
            ['GET', '/api/v1/receivables'],
            ['POST', '/api/v1/receivables/1/payments'],
            ['GET', '/api/v1/settings/edc'],
            ['POST', '/api/v1/settings/edc'],
            ['PUT', '/api/v1/settings/edc/1'],
            ['DELETE', '/api/v1/settings/edc/1'],
        ];
    }

    #[DataProvider('removedEndpoints')]
    public function test_removed_endpoint_returns_404(string $method, string $uri): void
    {
        $this->json($method, $uri)->assertNotFound();
    }

    public function test_payment_options_only_list_bank_and_qris_providers(): void
    {
        $this->getJson('/api/v1/pos/payment-options')
            ->assertOk()
            ->assertJsonStructure(['data' => ['bank_providers', 'qris_providers']])
            ->assertJsonMissingPath('data.edc_settings');
    }

    public function test_dp_bon_and_surcharge_accounts_are_inactive_but_mdr_stays_active(): void
    {
        $active = Account::whereIn('account_code', ['1-1002', '2-1004', '4-2000', '6-1009'])
            ->pluck('is_active', 'account_code');

        $this->assertFalse((bool) $active['1-1002']);
        $this->assertFalse((bool) $active['2-1004']);
        $this->assertFalse((bool) $active['4-2000']);
        $this->assertTrue((bool) $active['6-1009']);
    }

    public function test_historic_journal_on_an_inactive_account_still_shows_in_reports(): void
    {
        $reports = app(FinancialReportService::class);
        $before = $reports->incomeStatement('2019-09-01', '2019-09-30');

        (new JournalDraft())
            ->debit('1-1001', 7000, 'uji surcharge historis')
            ->credit('4-2000', 7000, 'uji surcharge historis')
            ->post(app(AccountingEngine::class), 'TEST', 'RM-'.uniqid(), 'Surcharge EDC historis', '2019-09-10');

        $after = $reports->incomeStatement('2019-09-01', '2019-09-30');
        $this->assertEquals(7000, $this->revenueLine($after, '4-2000') - $this->revenueLine($before, '4-2000'));
        $this->assertTrue($reports->trialBalance('2019-09-30')['is_balanced']);
        $this->assertTrue($reports->balanceSheet('2019-09-30')['is_balanced']);
    }

    private function revenueLine(array $incomeStatement, string $code): float
    {
        foreach ($incomeStatement['revenue']['lines'] as $line) {
            if ($line['code'] === $code) {
                return $line['amount'];
            }
        }

        return 0.0;
    }
}
```

In `backend/tests/Feature/AuthorizationTest.php` add `use App\Models\RolePermission;` below `use Illuminate\Foundation\Testing\DatabaseTransactions;`, and add this method after `test_update_rejects_unknown_keys()`:

```php
    public function test_removed_booking_and_bon_permission_keys_are_rejected(): void
    {
        $this->actingAsRole('OWNER');

        $this->getJson('/api/v1/settings/role-permissions')->assertOk()
            ->assertJsonMissingPath('KASIR.booking_dp')
            ->assertJsonMissingPath('KASIR.bon_receivable');
        $this->putJson('/api/v1/settings/role-permissions', ['KASIR' => ['booking_dp' => true]])->assertStatus(422);
        $this->putJson('/api/v1/settings/role-permissions', ['KASIR' => ['bon_receivable' => true]])->assertStatus(422);

        $this->assertFalse(RolePermission::whereIn('permission_key', ['booking_dp', 'bon_receivable'])->exists());
    }
```

In `backend/tests/Unit/UserPermissionTest.php`, in `test_auth_array_exposes_permission_map_without_password`, replace

```php
        $this->assertCount(15, $data['permissions']);
```

with

```php
        $this->assertCount(13, $data['permissions']);
        $this->assertArrayNotHasKey('booking_dp', $data['permissions']);
        $this->assertArrayNotHasKey('bon_receivable', $data['permissions']);
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan test --filter='RemovedPosFeaturesTest|AuthorizationTest|UserPermissionTest'`
Expected: FAIL — the accounts are still active, the matrix still lists `booking_dp`, the PUT with `booking_dp` returns 200, and the permission map has 15 keys.

- [ ] **Step 3: Add the COA migration**

Create `backend/database/migrations/2026_09_30_000001_deactivate_dp_bon_edc_accounts.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * DP booking, BON dan surcharge EDC dihapus dari POS. Akunnya tetap ada karena jurnal lama merujuk ke sana,
 * tetapi dinonaktifkan agar tidak muncul di pilihan akun. 6-1009 tetap aktif (MDR QRIS).
 * Akun yang belum ada disisipkan dalam keadaan nonaktif, sehingga seeder COA (yang hanya menyisipkan akun
 * yang belum ada) tidak mengaktifkannya lagi pada database baru.
 */
return new class extends Migration
{
    private const ACCOUNTS = [
        ['account_code' => '1-1002', 'account_name' => 'Piutang Dagang (AR)', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
        ['account_code' => '2-1004', 'account_name' => 'Uang Muka Pelanggan (DP Booking)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
        ['account_code' => '4-2000', 'account_name' => 'Pendapatan Surcharge EDC', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
    ];

    public function up(): void
    {
        $existing = DB::table('accounts')->pluck('account_code')->all();
        foreach (self::ACCOUNTS as $account) {
            if (! in_array($account['account_code'], $existing, true)) {
                DB::table('accounts')->insert($account + ['is_active' => false, 'created_at' => now(), 'updated_at' => now()]);
            }
        }

        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->update(['is_active' => false, 'updated_at' => now()]);
    }

    public function down(): void
    {
        DB::table('accounts')
            ->whereIn('account_code', array_column(self::ACCOUNTS, 'account_code'))
            ->update(['is_active' => true, 'updated_at' => now()]);
    }
};
```

- [ ] **Step 4: Add the permission migration**

Create `backend/database/migrations/2026_09_30_000002_remove_dp_bon_permission_keys.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Izin booking_dp dan bon_receivable tidak dipakai lagi (DP booking dan BON dihapus dari POS).
 */
return new class extends Migration
{
    private const KEYS = ['booking_dp', 'bon_receivable'];

    /** Default lama saat kunci masih ada: Kasir boleh, Gudang tidak. */
    private const OLD_DEFAULTS = ['KASIR' => true, 'GUDANG' => false];

    public function up(): void
    {
        DB::table('role_permissions')->whereIn('permission_key', self::KEYS)->delete();
    }

    public function down(): void
    {
        foreach (self::OLD_DEFAULTS as $role => $allowed) {
            foreach (self::KEYS as $key) {
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
};
```

- [ ] **Step 5: Drop the keys from `Permissions` and mark the accounts inactive in the seeder**

Replace the whole content of `backend/app/Support/Permissions.php` with:

```php
<?php

namespace App\Support;

/**
 * Daftar peran & kunci izin — harus sama dengan PermissionKey di frontend.
 */
final class Permissions
{
    public const KEYS = [
        'dashboard', 'pos', 'receipt', 'sale_void',
        'inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname',
        'expenses', 'accounts_payable', 'accounting_hub', 'financial_reports', 'role_settings',
    ];

    public const ROLES = ['OWNER', 'KASIR', 'GUDANG'];

    public const CONFIGURABLE_ROLES = ['KASIR', 'GUDANG'];

    public const DEFAULTS = [
        'KASIR' => ['pos', 'receipt'],
        'GUDANG' => ['inventory_view', 'inventory_manage', 'goods_receipt', 'stock_opname'],
    ];
}
```

In `backend/database/seeders/AccountCoaSeeder.php` replace these three rows:

```php
            ['account_code' => '1-1002', 'account_name' => 'Piutang Dagang (AR)', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT'],
```
```php
            ['account_code' => '2-1004', 'account_name' => 'Uang Muka Pelanggan (DP Booking)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT'],
```
```php
            ['account_code' => '4-2000', 'account_name' => 'Pendapatan Surcharge EDC', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT'],
```

with (one each, same positions):

```php
            ['account_code' => '1-1002', 'account_name' => 'Piutang Dagang (AR)', 'account_type' => 'ASSET', 'normal_balance' => 'DEBIT', 'is_active' => false],
```
```php
            ['account_code' => '2-1004', 'account_name' => 'Uang Muka Pelanggan (DP Booking)', 'account_type' => 'LIABILITY', 'normal_balance' => 'CREDIT', 'is_active' => false],
```
```php
            ['account_code' => '4-2000', 'account_name' => 'Pendapatan Surcharge EDC', 'account_type' => 'REVENUE', 'normal_balance' => 'CREDIT', 'is_active' => false],
```

Also add this comment line directly above `        $accounts = [`:

```php
        // 1-1002, 2-1004 dan 4-2000 nonaktif sejak DP booking, BON dan surcharge EDC dihapus (jurnal lama tetap sah).
```

- [ ] **Step 6: Migrate the testing database (and the dev database)**

Run (Git Bash):

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate
```

PowerShell equivalent: `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force; Remove-Item Env:DB_DATABASE; php artisan migrate`.
Expected: both runs list `2026_09_30_000001_deactivate_dp_bon_edc_accounts` and `2026_09_30_000002_remove_dp_bon_permission_keys` as DONE.

- [ ] **Step 7: Check that nothing references the removed keys**

Run:

```bash
grep -rnE "booking_dp|bon_receivable" backend/app backend/routes backend/database/seeders
```

Expected: no output. (The new migration and the tests mention the keys on purpose.)

- [ ] **Step 8: Run the tests**

Run: `cd backend && php artisan test --filter='RemovedPosFeaturesTest|AuthorizationTest|UserPermissionTest|ManualJournalApiTest|FinancialReportTest'`
Expected: PASS (manual journals still reject 1-1002/2-1004; reports still include the inactive accounts).
Then the gate: `cd backend && composer test` — expected: all tests pass.

- [ ] **Step 9: Commit**

```bash
git add backend/database/migrations/2026_09_30_000001_deactivate_dp_bon_edc_accounts.php \
        backend/database/migrations/2026_09_30_000002_remove_dp_bon_permission_keys.php \
        backend/app/Support/Permissions.php \
        backend/database/seeders/AccountCoaSeeder.php \
        backend/tests/Feature/RemovedPosFeaturesTest.php \
        backend/tests/Feature/AuthorizationTest.php \
        backend/tests/Unit/UserPermissionTest.php
git commit -m "$(cat <<'EOF'
refactor(accounting): deactivate dp, bon and edc accounts and permission keys

1-1002, 2-1004 and 4-2000 stay in the COA for historic journals but are
inactive, so they no longer appear in account pickers; 6-1009 stays
active for QRIS MDR. The booking_dp and bon_receivable permission keys
and their role_permissions rows are removed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

## Remaining parts (NOT YET WRITTEN)

This plan is incomplete: only backend tasks B1–B3 are written. Before executing, write:

- **Part F — Frontend:** F1 API client, mappers and types; F2 POS screen, CheckoutModal, removal of
  BookingDpModal/BookingListDrawer; F3 App shell, ledger "Pembantu Piutang" tab, settings EDC sub-tab,
  dashboard, receipts, export `accounts_receivable`, mock data, e2e scripts. Each task ends with a grep that
  must return nothing, plus `npm run lint && npm test`.
- **Part D — Docs:** docs/ai/*, AGENTS.md, roadmap and handoff updates.
- **Part M — Manual finish:** DESTRUCTIVE dev DB reset (`php artisan migrate:fresh --seed`, then
  `php artisan inventory:opening-balance`), re-enter the account opening balances, browser checklist.

See the spec for the full scope.
