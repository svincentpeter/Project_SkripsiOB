# Remove DP/Booking Inden, BON and EDC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove three POS features end to end (DP/booking inden, BON credit sales with the receivables sub-ledger, EDC card payments with fee settings and surcharge), so every sale is paid in full at checkout with Tunai, Transfer or QRIS (alone or split).

**Architecture:** Backend first: delete the booking/receivable/EDC-settings endpoints (B1), then simplify checkout, void and the sale model so only fully paid sales are produced (B2), then deactivate the three COA accounts and drop the two permission keys with migrations (B3). Frontend next: the POS terminal and sale mapping (F1), the ledger/permissions/settings/export side (F2), help texts and e2e scripts (F3). Docs last (D1). Tables and columns stay in the database, unused. A final manual step lets the user reset the dev DB.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-remove-dp-bon-edc-design.md`.

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md` and `docs/ai/domain-accounting.md` before starting.
- **Never stage, modify or revert the user's untracked `docs/flowchart_local/`**, and do not touch files outside this plan's File Map (for example the user's in-progress inventory work in `src/modules/inventory/components/GoodsReceiptModal.tsx` and `src/services/purchaseInvoiceService.ts`). Run `git status --short` before each commit: only the task's files may be staged. Stage files **by explicit path**; never `git add -A`, `git add .` or `git commit -a`. Deleted files are staged with `git add <path>` (or `git rm <path>`).
- Execute tasks in order B1 → B2 → B3 → F1 → F2 → F3 → D1; M1 is run by the user only. Later tasks' edit anchors are written against the output of earlier tasks (B2 relies on B1 having deleted `BookingController`/`BookingService`, the only other users of `PosCheckoutRequest::cartRules()` and `CartLines::build(..., reserveStock: false)`; F2 edits the files exactly as F1 left them).
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

- [ ] **Step 6: Migrate the testing database only**

Run (Git Bash):

```bash
cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force
```

PowerShell equivalent: `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force; Remove-Item Env:DB_DATABASE`.
Expected: the run lists `2026_09_30_000001_deactivate_dp_bon_edc_accounts` and `2026_09_30_000002_remove_dp_bon_permission_keys` as DONE.
**Do not migrate the dev database `project-skripsi_ob`** (no plain `php artisan migrate`): per spec decision D3 the dev database is migrated or reset only by the user, in Task M1.

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

# Part F — Frontend

The frontend is split **by feature, not by layer**. Removing a type, mapper or API method in one task while its
consumers are edited in a later task would break `npm run lint` (`tsc --noEmit` type-checks every `.ts`/`.tsx`
file, tests included) between commits. So each task removes a feature from every layer at once:

- **F1** — the cashier flow: DP, BON and EDC leave checkout, the POS screen, sale mapping, receipts and the
  dashboard. Keeps `ApiReceivable`, `mapReceivable`, `posApi.listReceivables/payReceivable`, `ReceivableInvoice`,
  `EdcSetting`, `INITIAL_EDC_SETTINGS`, the two permission keys and the `BOOKING_NEW`/`BON_OVERDUE` notification
  union members: their last consumers are removed in F2.
- **F2** — the back office: receivables ledger tab, permission keys, EDC settings sub-tab, COA preference,
  journal filter groups, notifications, the `accounts_receivable` export.
- **F3** — help texts and the Playwright audit scripts, plus a whole-frontend grep.

Every grep below uses `--exclude-dir=__tests__`: the updated tests name the removed fields on purpose, to assert
they are absent.

### Task F1: POS terminal — every sale settles at checkout

**Files:**
- Delete: `src/modules/pos/components/BookingDpModal.tsx`, `src/modules/pos/components/BookingListDrawer.tsx`
- Modify (full replacement): `src/services/api/posMappers.ts`, `src/services/api/posApi.ts`, `src/services/posService.ts`, `src/services/__tests__/posMappers.test.ts`, `src/modules/pos/__tests__/posRepairsAudit.test.ts`
- Modify: `src/shared/types/index.ts`, `src/services/supabaseDataService.ts`, `src/shared/data/mockData.ts`, `src/modules/pos/components/index.ts`, `src/modules/pos/components/CheckoutModal.tsx`, `src/modules/pos/PosScreen.tsx`, `src/modules/pos/components/PosSuccessModal.tsx`, `src/modules/pos/components/ReceiptPreviewModal.tsx`, `src/modules/receipt/ThermalReceiptScreen.tsx`, `src/modules/dashboard/ExecutiveDashboardScreen.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes (Task B2): `POST /pos/checkout` accepts `payments[].method` ∈ `TUNAI|TRANSFER|TRANSFER_BCA|QRIS` with `amount`, `tendered`, `fee_percentage`, `provider_name`, `reference`; `bon`/`booking_id` are 422. `Sale::toReceiptArray()` has no `dp_applied`, `booking_id`, `edc_bank`, `edc_type`, `surcharge_amount`, `due_date`, `receivable_paid`; payments have no `surcharge_amount`, `edc_bank`, `edc_type`; `status` is `LUNAS` or `VOID`.
- Consumes (Task B1): `/bookings*` return 404 (the frontend stops calling them here).
- Produces: `type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS' | 'SPLIT'`; `SplitPaymentLine` and `PosTransaction` without EDC/DP/BON fields; `PosTransaction.status: 'LUNAS' | 'VOID' | 'Completed'`.
- Produces: `PaymentPayload { method: 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS'; amount; tendered?; fee_percentage?; provider_name?; reference? }`, `CheckoutPayload` without `booking_id`/`bon`, `CheckoutPaymentMeta { provider_name?; fee_percentage?; fee_amount?; split_payments?; reference? }`, `buildPayments(method, amountDue, cashTendered, meta?)`, `mapSaleToTransaction(s: ApiSale): PosTransaction`.
- Produces: `CheckoutModal` props without `initialTag`, `canCreateBon`, `appliedDpAmount`; `onConfirmCheckout(paymentMethod, cashTendered, notes?, paymentMeta?)` (no `isBon`). `PosScreen` props without `bookings`, `onSaveBooking`, `onCancelBooking`, `permissions`. `createPosTransactionRecord(invoiceNo, cart, customerName, vehiclePlate, vehicleModel, paymentMethod, cashTendered, cashierName, manualDiscount = 0)`.
- Keeps for Task F2 (do not remove here): `ApiReceivable`, `mapReceivable`, `posApi.listReceivables`, `posApi.payReceivable`, types `ReceivableInvoice`, `ReceivablePaymentInput`, `EdcSetting`, `StoreSettings.edc_settings`, `StoreSettings.coa_receivable_account`, `PermissionKey` members `booking_dp`/`bon_receivable`, `INITIAL_EDC_SETTINGS`, App.tsx `receivableInvoices` state, `refreshReceivables`, `handlePayReceivable`.

- [ ] **Step 1: Write the failing mapper tests**

Replace the whole content of `src/services/__tests__/posMappers.test.ts` with:

```ts
import { describe, expect, it } from 'vitest';
import { ApiSale, buildPayments, cartLineToPayload, mapSaleToTransaction, serviceCartProduct } from '../api/posMappers';
import { CartItem, ProductItem, ServiceMasterItem } from '../../shared/types';

const product = { id: '42', product_name: 'Bridgestone Ecopia', name: 'Bridgestone Ecopia', product_price: 900000, stock: 5 } as ProductItem;
const service: ServiceMasterItem = {
  id: '7', service_code: 'JS', service_name: 'Spooring', category: 'SPOORING', standard_price: 150000, cost_price: 0, is_active: true,
};

/** Field DP booking, BON dan EDC yang sudah dihapus: tidak boleh dikirim ke server atau dipetakan dari server. */
const REMOVED_PAYMENT_KEYS = ['charge_to_customer', 'edc_bank', 'edc_type', 'surcharge_amount'];
const REMOVED_SALE_KEYS = ['dp_applied', 'due_date', 'is_bon', 'edc_bank', 'edc_type', 'surcharge_amount'];
const removedKeys = (row: object, removed: string[]) => Object.keys(row).filter((k) => removed.includes(k));

describe('cartLineToPayload', () => {
  it('sends catalog product id, price override and per-item discount', () => {
    const line: CartItem = { item_type: 'PRODUCT', product, qty: 2, discount_per_item: 10000, custom_price: 880000 };
    expect(cartLineToPayload(line)).toEqual({
      type: 'PRODUCT', product_id: 42, service_id: undefined, name: 'Bridgestone Ecopia',
      quantity: 2, unit_price: 880000, discount_per_item: 10000, is_manual: false, cost_price: undefined,
    });
  });

  it('never sends a product id for service lines', () => {
    const line: CartItem = { item_type: 'SERVICE', product: serviceCartProduct(service), service, qty: 1, discount_per_item: 0 };
    const payload = cartLineToPayload(line);
    expect(payload.product_id).toBeUndefined();
    expect(payload).toMatchObject({ type: 'SERVICE', service_id: 7, unit_price: 150000, name: 'Spooring' });
  });

  it('marks manual items and sends their typed cost', () => {
    const manual: CartItem = {
      item_type: 'PRODUCT', product: { id: 'manual-1', product_name: 'Pentil' } as ProductItem,
      qty: 4, discount_per_item: 0, custom_price: 25000, custom_hpp: 10000, custom_name_override: 'Pentil Racing', is_manual: true,
    };
    expect(cartLineToPayload(manual)).toMatchObject({ product_id: undefined, is_manual: true, cost_price: 10000, name: 'Pentil Racing' });
  });
});

describe('buildPayments', () => {
  it('single cash keeps tendered amount for change', () => {
    expect(buildPayments('TUNAI', 950000, 1000000)).toEqual([
      expect.objectContaining({ method: 'TUNAI', amount: 950000, tendered: 1000000, fee_percentage: 0 }),
    ]);
  });

  it('only sends QRIS fee percentage when a fee was charged', () => {
    expect(buildPayments('QRIS', 400000, 0, { fee_percentage: 0.7, fee_amount: 0 })[0].fee_percentage).toBe(0);
    expect(buildPayments('QRIS', 900000, 0, { fee_percentage: 0.7, fee_amount: 6300, reference: 'POS-1' })[0])
      .toMatchObject({ fee_percentage: 0.7, reference: 'POS-1' });
  });

  it('split overpay becomes change taken from the cash row', () => {
    const rows = buildPayments('SPLIT', 1000000, 0, {
      split_payments: [
        { id: 'a', method: 'TUNAI', amount: 500000 },
        { id: 'b', method: 'QRIS', provider_name: 'BCA', amount: 600000, fee_percentage: 0.3, fee_amount: 1800 },
      ],
    });
    expect(rows).toEqual([
      expect.objectContaining({ method: 'TUNAI', amount: 400000, tendered: 500000 }),
      expect.objectContaining({ method: 'QRIS', amount: 600000, fee_percentage: 0.3, provider_name: 'BCA' }),
    ]);
  });

  it('never sends BON, DP or EDC fields', () => {
    const rows = [
      ...buildPayments('TRANSFER_BCA', 500000, 0, { provider_name: 'BCA' }),
      ...buildPayments('SPLIT', 1000000, 0, {
        split_payments: [
          { id: 'a', method: 'TUNAI', amount: 400000 },
          { id: 'b', method: 'QRIS', amount: 600000, fee_percentage: 0.3, fee_amount: 1800 },
        ],
      }),
    ];
    rows.forEach((row) => expect(removedKeys(row, REMOVED_PAYMENT_KEYS)).toEqual([]));
  });
});

describe('mapSaleToTransaction', () => {
  const sale: ApiSale = {
    id: 9, reference: 'OB3-INV-202609-0009', date: '2026-09-24', created_at: '2026-09-24T03:15:00Z',
    customer_name: 'Budi', vehicle_plate: 'AA 1 BB', cashier_name: 'Kasir OB3',
    gross_sales_amount: 2000000, discount_amount: 150000,
    total_amount: 1850000, paid_amount: 1850000, change_amount: 150000,
    payment_method: 'TUNAI', fee_amount: 0, net_received: 1850000,
    total_hpp: 1100000, total_profit: 750000, status: 'LUNAS',
    items: [{
      id: 1, item_type: 'PRODUCT', item_name: 'Ban A', product_id: 42, service_id: null, is_manual: false,
      quantity: 2, unit_price: 1000000, discount_per_item: 25000, sub_total: 1950000, unit_cost_hpp: 550000, total_cost_hpp: 1100000,
      product: { id: 42, product_name: 'Ban A', brand: 'Bridgestone' },
    }],
    payments: [{ method: 'TUNAI', account_code: '1-1000', amount: 1850000, tendered_amount: 2000000, change_amount: 150000, fee_percentage: 0, fee_amount: 0, net_received: 1850000 }],
    journals: [],
  };

  it('separates line discounts from the nota discount and keeps server totals', () => {
    const tx = mapSaleToTransaction(sale);
    expect(tx.subtotal).toBe(1950000);
    expect(tx.total_discount).toBe(100000);
    expect(tx.grand_total).toBe(1850000);
    expect(tx.amount_paid).toBe(2000000);
    expect(tx.items[0].product.id).toBe('42');
    expect(tx.split_payments).toBeUndefined();
  });

  it('maps the VOID state', () => {
    expect(mapSaleToTransaction({ ...sale, status: 'VOID', voided_by: 'Owner' }).is_voided).toBe(true);
  });

  it('maps no BON, DP or EDC fields, also for split payments', () => {
    const split = mapSaleToTransaction({
      ...sale,
      payment_method: 'SPLIT',
      payments: [
        sale.payments[0],
        { method: 'QRIS', account_code: '1-1001', amount: 600000, tendered_amount: 600000, change_amount: 0, fee_percentage: 0.3, fee_amount: 1800, net_received: 598200, provider_name: 'BCA' },
      ],
    });
    expect(removedKeys(mapSaleToTransaction(sale), REMOVED_SALE_KEYS)).toEqual([]);
    expect(removedKeys(split, REMOVED_SALE_KEYS)).toEqual([]);
    expect(split.split_payments).toHaveLength(2);
    split.split_payments?.forEach((p) => expect(removedKeys(p, REMOVED_PAYMENT_KEYS)).toEqual([]));
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/__tests__/posMappers.test.ts`
Expected: FAIL — `never sends BON, DP or EDC fields` (rows still carry `charge_to_customer`, `edc_bank`, `edc_type`) and `maps no BON, DP or EDC fields, also for split payments` (the mapped sale still has `dp_applied`, `due_date`, `is_bon`, `edc_bank`, `edc_type`, `surcharge_amount`). The other tests pass. (`tsc` would also flag the new fixture against the old `ApiSale` type; Vitest does not type-check, and Step 4 fixes the type.)

- [ ] **Step 3: Drop the EDC, DP and BON types**

In `src/shared/types/index.ts`:

(a) Delete the whole `SalesBookingRecord` interface — from `export interface SalesBookingRecord {` through its closing `}` and the blank line after it (it sits directly above `export interface ParkedTransaction {`).

(b) Replace:

```ts
export type PaymentMethod =
  | 'TUNAI'
  | 'TRANSFER'
  | 'TRANSFER_BCA'
  | 'QRIS'
  | 'EDC'
  | 'EDC_DEBIT'
  | 'EDC_CREDIT'
  | 'SPLIT'
  /** Nota BON (piutang pelanggan), tanpa pembayaran saat checkout. */
  | 'HUTANG_BON';
```

with:

```ts
/** Setiap nota lunas saat checkout: Tunai, Transfer, QRIS, atau kombinasinya (SPLIT). */
export type PaymentMethod = 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS' | 'SPLIT';
```

(c) In `SplitPaymentLine` replace:

```ts
  provider_name?: string;
  edc_bank?: string;
  edc_type?: 'Debit' | 'Credit';
  fee_percentage?: number;
  fee_amount?: number;
  surcharge_amount?: number;
  net_received?: number;
  note?: string;
}
```

with:

```ts
  provider_name?: string;
  fee_percentage?: number;
  fee_amount?: number;
  net_received?: number;
  note?: string;
}
```

(d) In `PosTransaction` replace:

```ts
  payment_provider?: string;
  edc_bank?: string;
  edc_type?: 'Debit' | 'Credit';
  fee_percentage?: number;
  fee_amount?: number;
  surcharge_amount?: number;
  net_received?: number;
  notes?: string;
  status: 'LUNAS' | 'VOID' | 'PENDING' | 'Completed';
```

with:

```ts
  payment_provider?: string;
  fee_percentage?: number;
  fee_amount?: number;
  net_received?: number;
  notes?: string;
  status: 'LUNAS' | 'VOID' | 'Completed';
```

and replace:

```ts
  mechanic_name?: string;
  is_bon?: boolean;
  /** DP booking yang dipakai melunasi nota ini. */
  dp_applied?: number;
  /** Jatuh tempo nota BON. */
  due_date?: string;
}
```

with:

```ts
  mechanic_name?: string;
}
```

Leave `EdcSetting`, `StoreSettings.edc_settings`, `StoreSettings.coa_receivable_account`, `ReceivableInvoice`, `ReceivablePaymentInput` and `PermissionKey` untouched (Task F2).

- [ ] **Step 4: Replace the POS mappers**

Replace the whole content of `src/services/api/posMappers.ts` with:

```ts
import {
  CartItem,
  JournalEntry,
  PaymentMethod,
  PosTransaction,
  ProductItem,
  ReceivableInvoice,
  ServiceMasterItem,
  SplitPaymentLine,
} from '../../shared/types';

// ---------------------------------------------------------------------------
// Bentuk respons server (lihat Sale::toReceiptArray, JournalEntry::toApiArray)
// ---------------------------------------------------------------------------

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

export interface ApiSaleItem {
  id: number;
  item_type: 'PRODUCT' | 'SERVICE';
  item_name: string;
  product_id: number | null;
  service_id: number | null;
  is_manual: boolean;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  sub_total: number;
  unit_cost_hpp: number;
  total_cost_hpp: number;
  product: { id: number; product_name: string; brand?: string; product_size?: string; motif?: string } | null;
}

export interface ApiSalePayment {
  method: string;
  account_code: string;
  amount: number;
  tendered_amount: number;
  change_amount: number;
  fee_percentage: number;
  fee_amount: number;
  net_received: number;
  provider_name?: string | null;
  reference?: string | null;
}

/** Setiap nota lunas saat checkout (LUNAS) atau dibatalkan (VOID). */
export interface ApiSale {
  id: number;
  reference: string;
  date: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate: string;
  vehicle_model?: string | null;
  cashier_name: string;
  gross_sales_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  change_amount: number;
  payment_method: string;
  payment_provider?: string | null;
  fee_amount: number;
  net_received: number;
  total_hpp: number;
  total_profit: number;
  notes?: string | null;
  status: 'LUNAS' | 'VOID';
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  items: ApiSaleItem[];
  payments: ApiSalePayment[];
  journals: ApiJournal[];
}

export interface ApiReceivable {
  sale_id: number;
  invoice_number: string;
  customer_name: string;
  customer_phone?: string | null;
  vehicle_plate?: string | null;
  date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'BELUM_LUNAS' | 'SEBAGIAN' | 'LUNAS';
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Payload ke server
// ---------------------------------------------------------------------------

export interface CartLinePayload {
  type: 'PRODUCT' | 'SERVICE';
  product_id?: number;
  service_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  discount_per_item: number;
  is_manual: boolean;
  cost_price?: number;
}

export interface PaymentPayload {
  method: 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS';
  amount: number;
  tendered?: number;
  fee_percentage?: number;
  provider_name?: string;
  reference?: string;
}

export interface CheckoutPayload {
  customer_name?: string;
  customer_phone?: string;
  vehicle_plate?: string;
  vehicle_model?: string;
  notes?: string;
  discount_amount: number;
  items: CartLinePayload[];
  payments: PaymentPayload[];
}

/** Data pembayaran yang dikumpulkan CheckoutModal. */
export interface CheckoutPaymentMeta {
  provider_name?: string;
  fee_percentage?: number;
  fee_amount?: number;
  split_payments?: SplitPaymentLine[];
  reference?: string;
}

const num = (v: unknown): number => Number(v) || 0;

/** Id numerik katalog server; id lokal/manual ("manual-…", "svc-…") bukan id server. */
const serverId = (id: string | number | undefined): number | undefined => {
  const n = Number(id);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

/** Produk sintetis untuk baris jasa agar komponen UI lama tetap aman; tidak pernah dikirim sebagai product_id. */
export const serviceCartProduct = (service: ServiceMasterItem): ProductItem =>
  ({
    id: `svc-${service.id}`,
    name: service.service_name,
    product_name: service.service_name,
    category: 'SERVICES',
    price: service.standard_price,
    product_price: service.standard_price,
    cost: service.cost_price,
    product_cost: service.cost_price,
    stock: 999,
    product_quantity: 999,
  }) as ProductItem;

export const cartLineToPayload = (item: CartItem): CartLinePayload => {
  const isService = item.item_type === 'SERVICE';
  const isManual = !!item.is_manual;
  const unitPrice =
    item.custom_price ??
    (isService ? item.service?.standard_price : item.product.product_price ?? item.product.price) ??
    0;
  const name =
    item.custom_name_override ||
    (isService ? item.service?.service_name : item.product.product_name || item.product.name) ||
    'Item';

  return {
    type: isService ? 'SERVICE' : 'PRODUCT',
    product_id: !isService && !isManual ? serverId(item.product.id) : undefined,
    service_id: isService && !isManual ? serverId(item.service?.id) : undefined,
    name,
    quantity: item.qty,
    unit_price: unitPrice,
    discount_per_item: item.discount_per_item ?? 0,
    is_manual: isManual,
    cost_price: isManual ? item.custom_hpp ?? 0 : undefined,
  };
};

/**
 * Susun baris pembayaran dari hasil CheckoutModal. Persentase fee hanya dikirim bila
 * modal memang membebankan fee (MDR QRIS di atas ambang), sehingga server menghitung nominal yang sama.
 */
export const buildPayments = (
  method: PaymentMethod,
  amountDue: number,
  cashTendered: number,
  meta: CheckoutPaymentMeta = {}
): PaymentPayload[] => {
  if (meta.split_payments && meta.split_payments.length > 0) {
    const rows = meta.split_payments.map((row): PaymentPayload => {
      const m = row.method as PaymentPayload['method'];
      return {
        method: m,
        amount: num(row.amount),
        tendered: m === 'TUNAI' ? num(row.amount) : undefined,
        fee_percentage: num(row.fee_amount) > 0 ? num(row.fee_percentage) : 0,
        provider_name: row.provider_name,
      };
    });

    // Kelebihan bayar menjadi kembalian dari baris tunai pertama.
    let overpay = rows.reduce((s, r) => s + r.amount, 0) - amountDue;
    for (const row of rows) {
      if (overpay <= 0) break;
      if (row.method === 'TUNAI') {
        const cut = Math.min(overpay, row.amount);
        row.amount -= cut;
        overpay -= cut;
      }
    }
    return rows.filter((r) => r.amount > 0);
  }

  const m = method as PaymentPayload['method'];
  return [
    {
      method: m,
      amount: amountDue,
      tendered: m === 'TUNAI' ? cashTendered : undefined,
      fee_percentage: num(meta.fee_amount) > 0 ? num(meta.fee_percentage) : 0,
      provider_name: meta.provider_name,
      reference: meta.reference,
    },
  ];
};

// ---------------------------------------------------------------------------
// Respons server → tipe UI
// ---------------------------------------------------------------------------

export const mapJournal = (j: ApiJournal): JournalEntry => ({
  id: j.entry_number,
  journal_number: j.entry_number,
  reference_number: j.reference_id,
  date: j.entry_date,
  ref_doc: j.reference_id,
  description: j.description,
  status: 'POSTED',
  total_debit: num(j.total_debit),
  total_credit: num(j.total_credit),
  reference_type: j.reference_type,
  can_reverse: j.can_reverse ?? false,
  reversed_by: j.reversed_by ?? null,
  reversal_of: j.reversal_of ?? null,
  created_by_name: j.created_by_name ?? null,
  lines: j.lines.map((l) => ({
    account_code: l.account_code,
    account_name: l.account_name,
    debit: num(l.debit),
    credit: num(l.credit),
    note: l.note ?? undefined,
  })),
});

const saleItemToCart = (it: ApiSaleItem): CartItem => {
  const product = {
    id: it.product_id ? String(it.product_id) : `line-${it.id}`,
    name: it.item_name,
    product_name: it.item_name,
    brand: it.product?.brand ?? '',
    product_size: it.product?.product_size,
    motif: it.product?.motif,
    price: num(it.unit_price),
    product_price: num(it.unit_price),
    category: it.item_type === 'SERVICE' ? 'SERVICES' : 'BAN_BARU',
  } as ProductItem;

  return {
    item_type: it.item_type,
    product,
    service:
      it.item_type === 'SERVICE'
        ? ({
            id: it.service_id ? String(it.service_id) : `line-${it.id}`,
            service_code: '',
            service_name: it.item_name,
            category: 'JASA_MANUAL',
            standard_price: num(it.unit_price),
            cost_price: num(it.unit_cost_hpp),
            is_active: true,
          } as ServiceMasterItem)
        : undefined,
    qty: it.quantity,
    discount_per_item: num(it.discount_per_item),
    custom_price: num(it.unit_price),
    custom_hpp: num(it.unit_cost_hpp),
    custom_name_override: it.item_name,
    is_manual: it.is_manual,
  };
};

export const mapSaleToTransaction = (s: ApiSale): PosTransaction => {
  const isSplit = s.payments.length > 1;
  const lineDiscounts = s.items.reduce((sum, it) => sum + num(it.discount_per_item) * it.quantity, 0);
  const subtotal = num(s.gross_sales_amount) - lineDiscounts;
  const notaDiscount = num(s.discount_amount) - lineDiscounts;
  const time = s.created_at ? new Date(s.created_at).toTimeString().slice(0, 5) : '';

  return {
    id: String(s.id),
    reference: s.reference,
    invoice_number: s.reference,
    date: s.date,
    timestamp: time,
    cashier_name: s.cashier_name,
    customer_name: s.customer_name,
    customer_phone: s.customer_phone ?? undefined,
    vehicle_plate: s.vehicle_plate,
    vehicle_model: s.vehicle_model ?? undefined,
    items: s.items.map(saleItemToCart),
    subtotal,
    gross_sales_amount: subtotal,
    total_discount: notaDiscount,
    discount_amount: notaDiscount,
    grand_total: num(s.total_amount),
    total_amount: num(s.total_amount),
    total_cost_hpp: num(s.total_hpp),
    total_hpp: num(s.total_hpp),
    gross_profit: num(s.total_profit),
    total_profit: num(s.total_profit),
    payment_method: s.payment_method as PaymentMethod,
    split_payments: isSplit
      ? s.payments.map((p, i) => ({
          id: `${s.id}-${i}`,
          method: p.method as PaymentMethod,
          amount: num(p.amount),
          provider_name: p.provider_name ?? undefined,
          fee_percentage: num(p.fee_percentage),
          fee_amount: num(p.fee_amount),
          net_received: num(p.net_received),
        }))
      : undefined,
    amount_paid: num(s.paid_amount) + num(s.change_amount),
    paid_amount: num(s.paid_amount) + num(s.change_amount),
    change_amount: num(s.change_amount),
    payment_provider: s.payment_provider ?? undefined,
    fee_amount: num(s.fee_amount),
    net_received: num(s.net_received),
    notes: s.notes ?? undefined,
    status: s.status,
    stock_deducted: true,
    is_voided: s.status === 'VOID',
    void_reason: s.void_reason ?? undefined,
    voided_at: s.voided_at ?? undefined,
    voided_by: s.voided_by ?? undefined,
  };
};

export const mapReceivable = (r: ApiReceivable): ReceivableInvoice => ({
  id: String(r.sale_id),
  invoice_number: r.invoice_number,
  customer_name: r.customer_name,
  customer_phone: r.customer_phone ?? undefined,
  vehicle_plate: r.vehicle_plate ?? undefined,
  date: r.date,
  due_date: r.due_date,
  total_amount: num(r.total_amount),
  paid_amount: num(r.paid_amount),
  remaining_amount: num(r.remaining_amount),
  status: r.status,
  notes: r.notes ?? undefined,
});
```

- [ ] **Step 5: Run the mapper tests to verify they pass**

Run: `npx vitest run src/services/__tests__/posMappers.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Drop the booking API calls, booking helpers and legacy booking functions**

Replace the whole content of `src/services/api/posApi.ts` with:

```ts
import { apiClient } from './apiClient';
import { ServiceMasterItem } from '../../shared/types';
import { ApiJournal, ApiReceivable, ApiSale, CheckoutPayload } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const posApi = {
  checkout: async (payload: CheckoutPayload) =>
    (await apiClient.post<Envelope<ApiSale>>('/pos/checkout', payload)).data,

  listTransactions: async (params?: { search?: string; date?: string; limit?: number }) =>
    (await apiClient.get<Envelope<ApiSale[]>>('/pos/transactions', params)).data,

  voidTransaction: async (id: string | number, reason: string) =>
    (await apiClient.post<Envelope<ApiSale>>(`/pos/transactions/${id}/void`, { reason })).data,

  listReceivables: async (status: 'open' | 'all' = 'all') =>
    (await apiClient.get<Envelope<ApiReceivable[]>>('/receivables', { status })).data,

  payReceivable: async (
    saleId: string | number,
    payload: { amount: number; account_code: '1-1000' | '1-1001'; payment_date?: string; notes?: string }
  ) =>
    (
      await apiClient.post<Envelope<{ receivable: ApiReceivable; journal: ApiJournal | null }>>(
        `/receivables/${saleId}/payments`,
        payload
      )
    ).data,

  listServices: async (): Promise<ServiceMasterItem[]> => {
    const res = await apiClient.get<Envelope<any[]>>('/services');
    return res.data.map((s) => ({
      id: String(s.id),
      service_code: s.service_code,
      service_name: s.service_name,
      category: s.category,
      standard_price: Number(s.standard_price) || 0,
      cost_price: Number(s.cost_price) || 0,
      description: s.description ?? undefined,
      is_active: !!s.is_active,
    }));
  },
};
```

Replace the whole content of `src/services/posService.ts` with (the temporary receipt date now uses `localDate()`):

```ts
import { CartItem, PaymentMethod, PosTransaction } from '../shared/types';
import { localDate } from './accountingPeriod';
import { allocateFifoBatches } from './fifoCostingService';

export const generateInvoiceNumber = (): string => {
  const date = new Date();
  const yearMonth = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `OB3-INV-${yearMonth}-${randomSuffix}`;
};

export const calculateCartTotals = (
  cart: CartItem[],
  discountAmount: number = 0
) => {
  const subtotal = cart.reduce((acc, item) => {
    const unitPrice = item.custom_price ?? (item.item_type === 'SERVICE' && item.service ? item.service.standard_price : (item.product.product_price ?? item.product.price ?? 0));
    return acc + unitPrice * item.qty - (item.discount_per_item ?? 0) * item.qty;
  }, 0);

  const totalDiscount = discountAmount;
  const grandTotal = Math.max(0, subtotal - totalDiscount);

  const totalHpp = cart.reduce((acc, item) => {
    if (item.custom_hpp !== undefined) {
      return acc + item.custom_hpp * item.qty;
    }
    if (item.item_type === 'SERVICE') {
      return acc + (item.service?.cost_price || 0) * item.qty;
    }
    const { totalHpp: itemHpp } = allocateFifoBatches(item.product, item.qty);
    return acc + itemHpp;
  }, 0);

  return {
    subtotal,
    discount: totalDiscount,
    grandTotal,
    totalHpp,
  };
};

/** Nota sementara untuk pratinjau/cetak sebelum checkout (tidak disimpan). Setiap nota lunas saat checkout. */
export const createPosTransactionRecord = (
  invoiceNo: string,
  cart: CartItem[],
  customerName: string,
  vehiclePlate: string,
  vehicleModel: string,
  paymentMethod: PaymentMethod,
  cashTendered: number,
  cashierName: string,
  manualDiscount: number = 0
): PosTransaction => {
  const totals = calculateCartTotals(cart, manualDiscount);
  const change = Math.max(0, cashTendered - totals.grandTotal);
  const now = new Date();
  const dateStr = localDate(now);
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

  return {
    id: invoiceNo,
    reference: invoiceNo,
    invoice_number: invoiceNo,
    date: dateStr,
    timestamp: timeStr,
    customer_name: customerName ? customerName.trim() : '',
    vehicle_plate: vehiclePlate ? vehiclePlate.trim() : '',
    vehicle_model: vehicleModel ? vehicleModel.trim() : undefined,
    cashier_name: cashierName,
    items: cart.map((item) => ({
      item_type: item.item_type || 'PRODUCT',
      product: item.product,
      service: item.service,
      qty: item.qty,
      discount_per_item: item.discount_per_item ?? 0,
      custom_price: item.custom_price,
      custom_name_override: item.custom_name_override,
      note: item.note,
      override_reason: item.override_reason,
      adjusted_by: item.adjusted_by,
    })),
    subtotal: totals.subtotal,
    gross_sales_amount: totals.subtotal,
    total_discount: totals.discount,
    discount_amount: totals.discount,
    grand_total: totals.grandTotal,
    total_amount: totals.grandTotal,
    total_cost_hpp: totals.totalHpp,
    total_hpp: totals.totalHpp,
    gross_profit: totals.grandTotal - totals.totalHpp,
    total_profit: totals.grandTotal - totals.totalHpp,
    payment_method: paymentMethod,
    amount_paid: cashTendered,
    paid_amount: cashTendered,
    change_amount: change,
    status: 'LUNAS',
    stock_deducted: true,
  };
};
```

In `src/services/supabaseDataService.ts` (legacy, unused):
- delete the import line `  SalesBookingRecord,`
- replace the comment line `// 9. BOOKINGS, PAYABLES, RECEIVABLES` with `// 9. PAYABLES, RECEIVABLES`
- delete the two functions `fetchBookingsFromSupabase` and `upsertBookingToSupabase` (from `export const fetchBookingsFromSupabase = async (): Promise<SalesBookingRecord[] | null> => {` through the `};` that closes `upsertBookingToSupabase`, plus the blank line after it; the next line is then `export const fetchPayablesFromSupabase = ...`).

- [ ] **Step 7: Clean the mock data**

In `src/shared/data/mockData.ts`:
- delete the import line `  SalesBookingRecord, ` (the source line ends with a trailing space)
- delete the whole `INITIAL_BOOKINGS` constant, from `export const INITIAL_BOOKINGS: SalesBookingRecord[] = [` through its closing `];` and the blank line after it (the next line is then `export const INITIAL_TRANSACTIONS: PosTransaction[] = [`)
- in `INITIAL_TRANSACTIONS` (entry `tx-103`) replace:

```ts
    payment_method: 'EDC_DEBIT',
    amount_paid: 8200000,
    paid_amount: 8200000,
    change_amount: 0,
    payment_reference: 'EDC-BCA-77610',
```

with:

```ts
    payment_method: 'TRANSFER_BCA',
    amount_paid: 8200000,
    paid_amount: 8200000,
    change_amount: 0,
    payment_reference: 'TRF-BCA-77610',
```

Leave `INITIAL_EDC_SETTINGS`, `edc_settings`, `coa_receivable_account` and `DEFAULT_ROLE_PERMISSIONS` alone (Task F2).

- [ ] **Step 8: Delete the booking components**

```bash
git rm src/modules/pos/components/BookingDpModal.tsx src/modules/pos/components/BookingListDrawer.tsx
```

In `src/modules/pos/components/index.ts` delete the two lines `export * from './BookingDpModal';` and `export * from './BookingListDrawer';`.

- [ ] **Step 9: Simplify `CheckoutModal` (no BON tag, no due date, no EDC, no DP line)**

All edits are in `src/modules/pos/components/CheckoutModal.tsx`. Unused lucide icon imports (`AlertCircle`, `Tag`, `Calendar`) may stay (see Global Constraints).

(a) Replace `import { INITIAL_BANK_PROVIDERS, INITIAL_QRIS_PROVIDERS, INITIAL_EDC_SETTINGS } from '../../../shared/data/mockData';` with:

```tsx
import { INITIAL_BANK_PROVIDERS, INITIAL_QRIS_PROVIDERS } from '../../../shared/data/mockData';
```

(b) In `interface CheckoutModalProps` replace:

```tsx
  onClose: () => void;
  initialTag?: 'REGULAR' | 'BON';
  /** Izin membuat faktur BON (piutang) untuk pengguna saat ini. */
  canCreateBon?: boolean;
  cart: CartItem[];
```

with:

```tsx
  onClose: () => void;
  cart: CartItem[];
```

replace:

```tsx
  appliedDpAmount: number;
  netPayable: number;
```

with:

```tsx
  netPayable: number;
```

and replace:

```tsx
  onConfirmCheckout: (
    isBon: boolean,
    paymentMethod: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta?: {
      provider_name?: string;
      edc_bank?: string;
      edc_type?: 'Debit' | 'Credit';
      fee_percentage?: number;
      fee_amount?: number;
      surcharge_amount?: number;
      net_received?: number;
      split_payments?: SplitPaymentLine[];
      term_days?: number;
      reference?: string;
    }
  ) => void | Promise<void>;
```

with:

```tsx
  onConfirmCheckout: (
    paymentMethod: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta?: {
      provider_name?: string;
      fee_percentage?: number;
      fee_amount?: number;
      net_received?: number;
      split_payments?: SplitPaymentLine[];
      reference?: string;
    }
  ) => void | Promise<void>;
```

(c) In the destructured props replace:

```tsx
  onClose,
  initialTag = 'REGULAR',
  canCreateBon = true,
  cart,
```

with:

```tsx
  onClose,
  cart,
```

and replace:

```tsx
  totals,
  appliedDpAmount,
  netPayable,
```

with:

```tsx
  totals,
  netPayable,
```

(d) Replace the state block from `  const [tag, setTag] = useState<'REGULAR' | 'BON'>(initialTag);` through the closing `  };` of `handleSelectBonTerm` (the block that also holds `selectedEdcBank`, `selectedEdcType`, `calcDefaultDueDate`, `bonTermDays`, `bonDueDate`) with:

```tsx
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TUNAI');
  const [selectedBank, setSelectedBank] = useState<string>('BCA');
  const [selectedQris, setSelectedQris] = useState<string>('BCA');
  const [cashTenderedInput, setCashTenderedInput] = useState<string>('');
  const [transactionNotes, setTransactionNotes] = useState<string>('');
```

(e) Replace:

```tsx
  const qrisOptions = (storeSettings?.qris_providers || INITIAL_QRIS_PROVIDERS).filter((q) => q.is_active);
  const edcOptions = (storeSettings?.edc_settings || INITIAL_EDC_SETTINGS).filter((e) => e.is_active);
  const edcBanks: string[] = Array.from(new Set(edcOptions.map((e) => e.bank_name)));
```

with:

```tsx
  const qrisOptions = (storeSettings?.qris_providers || INITIAL_QRIS_PROVIDERS).filter((q) => q.is_active);
```

and delete this effect (and the blank line after it):

```tsx
  useEffect(() => {
    if (edcBanks.length > 0 && !edcBanks.includes(selectedEdcBank)) {
      setSelectedEdcBank(edcBanks[0]);
    }
  }, [edcBanks, selectedEdcBank]);
```

(f) Replace the block from `  const currentEdcSetting = edcOptions.find(` through `    return { feePct, feeAmt, surchargeAmt, netRec };` and the `  };` after it (this block contains `effectivePayable`'s definition and the old `calculateRowMeta` with its EDC branches) with:

```tsx
  // Helper calculation for individual split line: hanya QRIS di atas ambang yang kena MDR (beban toko).
  const calculateRowMeta = (row: SplitPaymentLine) => {
    let feePct = 0;
    let feeAmt = 0;

    if (row.method === 'QRIS') {
      const qSetting = qrisOptions.find((q) => q.provider_name === row.provider_name) || qrisOptions[0];
      feePct = qSetting?.fee_percentage ?? 0.30;
      const th = qSetting?.fee_threshold_amount ?? 500000;
      if (row.amount > th && feePct > 0) {
        feeAmt = Math.round(row.amount * (feePct / 100));
      }
    }

    const netRec = Math.max(0, row.amount - feeAmt);
    return { feePct, feeAmt, netRec };
  };
```

(g) Replace:

```tsx
  const totalSplitFees = splitRows.reduce((sum, r) => sum + calculateRowMeta(r).feeAmt, 0);
  const totalSplitSurcharges = splitRows.reduce((sum, r) => sum + calculateRowMeta(r).surchargeAmt, 0);
  const totalSplitNetReceived = Math.max(0, totalSplitPaid - totalSplitFees);

  const isSplitShort = tag === 'REGULAR' && totalSplitPaid < effectivePayable;

  useEffect(() => {
    if (isOpen) {
      setTag(initialTag);
      setIsSplitMode(false);
      setSplitRows([]);
      if (initialTag === 'REGULAR') {
        setCashTenderedInput(String(effectivePayable));
      } else {
        setCashTenderedInput('');
      }
    }
  }, [isOpen, initialTag, effectivePayable]);
```

with:

```tsx
  const totalSplitFees = splitRows.reduce((sum, r) => sum + calculateRowMeta(r).feeAmt, 0);
  const totalSplitNetReceived = Math.max(0, totalSplitPaid - totalSplitFees);

  const isSplitShort = totalSplitPaid < netPayable;

  useEffect(() => {
    if (isOpen) {
      setIsSplitMode(false);
      setSplitRows([]);
      setCashTenderedInput(String(netPayable));
    }
  }, [isOpen, netPayable]);
```

(h) Replace:

```tsx
  const isCashShort =
    tag === 'REGULAR' && paymentMethod === 'TUNAI' && cashTenderedVal < effectivePayable;
```

with:

```tsx
  const isCashShort = paymentMethod === 'TUNAI' && cashTenderedVal < netPayable;
```

(i) In `handleAddSplitRow` replace:

```tsx
        : undefined,
      edc_bank: (targetMethod === 'EDC' || targetMethod === 'EDC_DEBIT' || targetMethod === 'EDC_CREDIT')
        ? (selectedEdcBank || edcBanks[0] || 'BCA')
        : undefined,
      edc_type: targetMethod === 'EDC_CREDIT' ? 'Credit' : 'Debit',
    };
```

with:

```tsx
        : undefined,
    };
```

(j) Replace both functions `handleQrisPaymentSuccess` and `handleFinalSubmit` — from the line `  const handleQrisPaymentSuccess = (paymentData: any) => {` down to and including the `  };` that closes `handleFinalSubmit` (directly above `  const handleParkAndClose = () => {`) — with:

```tsx
  const handleQrisPaymentSuccess = () => {
    setIsQrisModalOpen(false);
    onConfirmCheckout('QRIS', netPayable, transactionNotes.trim() || undefined, {
      provider_name: 'Midtrans QRIS',
      reference: qrisOrderId,
      fee_percentage: qrisFeePct,
      fee_amount: qrisFeeAmount,
      net_received: qrisNetReceived,
    });
  };

  const handleFinalSubmit = () => {
    if (isSplitMode ? isSplitShort : isCashShort) return;

    if (!isSplitMode && paymentMethod === 'QRIS' && qrisFlowType === 'DYNAMIC') {
      const generatedOrderId = `POS-${Date.now().toString().slice(-8)}`;
      setQrisOrderId(generatedOrderId);
      setIsQrisModalOpen(true);
      return;
    }

    if (isSplitMode) {
      const detailedSplitRows: SplitPaymentLine[] = splitRows.map((row) => {
        const calcs = calculateRowMeta(row);
        return {
          ...row,
          fee_percentage: calcs.feePct,
          fee_amount: calcs.feeAmt,
          net_received: calcs.netRec,
        };
      });

      onConfirmCheckout('SPLIT', totalSplitPaid, transactionNotes.trim() || undefined, {
        fee_amount: totalSplitFees,
        net_received: totalSplitNetReceived,
        split_payments: detailedSplitRows,
      });
      return;
    }

    const isTransfer = paymentMethod === 'TRANSFER' || paymentMethod === 'TRANSFER_BCA';
    const finalMethod: PaymentMethod = isTransfer
      ? selectedBank === 'BCA' ? 'TRANSFER_BCA' : 'TRANSFER'
      : paymentMethod;

    onConfirmCheckout(
      finalMethod,
      paymentMethod === 'TUNAI' ? cashTenderedVal : netPayable,
      transactionNotes.trim() || undefined,
      {
        provider_name: isTransfer ? selectedBank : paymentMethod === 'QRIS' ? selectedQris : undefined,
        fee_percentage: paymentMethod === 'QRIS' ? qrisFeePct : 0,
        fee_amount: paymentMethod === 'QRIS' ? qrisFeeAmount : 0,
        net_received: paymentMethod === 'QRIS' ? qrisNetReceived : netPayable,
      }
    );
  };
```

(k) Delete the DP line in the cost summary:

```tsx
                {appliedDpAmount > 0 && (
                  <div className="flex justify-between text-purple-800 font-bold">
                    <span>DP Booking Terpasang:</span>
                    <span className="font-mono">-{formatRupiah(appliedDpAmount)}</span>
                  </div>
                )}
```

(l) Remove the REGULAR/BON selector and the whole BON panel: delete every line from `              {/* Selector Tag Transaksi: Reguler (Lunas) vs BON */}` down to and including `                /* Mode REGULER: Pilihan Metode Bayar Tunggal vs Multi-Bayar / Split */` (the next remaining line is `                <div className="space-y-3.5">`). Then close the removed ternary by replacing:

```tsx
                  )}
                </div>
              )}
            </div>

            {/* Footer Modal Actions */}
```

with:

```tsx
                  )}
                </div>
            </div>

            {/* Footer Modal Actions */}
```

(m) Single-payment method grid: replace `                        <div className="grid grid-cols-4 gap-1.5">` with `                        <div className="grid grid-cols-3 gap-1.5">` and delete the EDC button:

```tsx
                          <button
                            type="button"
                            onClick={() => setPaymentMethod('EDC')}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                              paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT'
                                ? 'bg-purple-50 border-purple-500 text-purple-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <CreditCard className="w-4 h-4 text-purple-600" />
                            <span className="text-[11px] truncate">Mesin EDC</span>
                          </button>
```

(n) Replace `                              <span>Manual / EDC Statis</span>` with `                              <span>Manual (QRIS Statis)</span>`.

(o) Delete the single-payment EDC panel: every line from `                      {(paymentMethod === 'EDC' || paymentMethod === 'EDC_DEBIT' || paymentMethod === 'EDC_CREDIT') && (` down to and including its closing `                      )}` (the line directly above `                    </div>` / `                  ) : (` / `                    /* ================= SPLIT / MULTI-PAYMENT MODE ================= */`).

(p) Split rows: replace:

```tsx
                                <div className="grid grid-cols-4 gap-1 flex-1">
                                  {(['TUNAI', 'TRANSFER', 'QRIS', 'EDC'] as PaymentMethod[]).map((m) => {
                                    const isActive =
                                      (m === 'TRANSFER' && (row.method === 'TRANSFER' || row.method === 'TRANSFER_BCA')) ||
                                      (m === 'EDC' && (row.method === 'EDC' || row.method === 'EDC_DEBIT' || row.method === 'EDC_CREDIT')) ||
                                      row.method === m;
                                    return (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => {
                                          let newMethod = m;
                                          if (m === 'EDC') newMethod = row.edc_type === 'Credit' ? 'EDC_CREDIT' : 'EDC_DEBIT';
                                          handleUpdateSplitRow(idx, {
                                            method: newMethod,
                                            provider_name: m === 'TRANSFER' ? (selectedBank || 'BCA') : m === 'QRIS' ? (selectedQris || 'BCA') : undefined,
                                            edc_bank: m === 'EDC' ? (selectedEdcBank || 'BCA') : undefined,
                                            edc_type: m === 'EDC' ? (row.edc_type || 'Debit') : undefined,
                                          });
                                        }}
```

with:

```tsx
                                <div className="grid grid-cols-3 gap-1 flex-1">
                                  {(['TUNAI', 'TRANSFER', 'QRIS'] as PaymentMethod[]).map((m) => {
                                    const isActive =
                                      (m === 'TRANSFER' && (row.method === 'TRANSFER' || row.method === 'TRANSFER_BCA')) ||
                                      row.method === m;
                                    return (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() =>
                                          handleUpdateSplitRow(idx, {
                                            method: m,
                                            provider_name: m === 'TRANSFER' ? (selectedBank || 'BCA') : m === 'QRIS' ? (selectedQris || 'BCA') : undefined,
                                          })
                                        }
```

and replace `{m === 'TRANSFER' ? 'Transfer' : m === 'TUNAI' ? 'Tunai' : m === 'QRIS' ? 'QRIS' : 'EDC'}` with `{m === 'TRANSFER' ? 'Transfer' : m === 'TUNAI' ? 'Tunai' : 'QRIS'}`.

(q) Delete the split-row EDC sub-selector: every line from `                              {(row.method === 'EDC' || row.method === 'EDC_DEBIT' || row.method === 'EDC_CREDIT') && (` down to and including its closing `                              )}` (directly above the blank line and `                              {/* Amount input for this line */}`).

(r) Footer submit button: replace:

```tsx
                  disabled={tag === 'REGULAR' && (isSplitMode ? isSplitShort : isCashShort)}
                  className={`flex-1 py-3 px-4 rounded-xl text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    tag === 'BON'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {tag === 'BON'
                      ? 'Simpan Sebagai Faktur BON'
                      : isSplitMode
                      ? `Selesaikan Multi-Bayar (${formatRupiah(totalSplitPaid)})`
                      : `Selesaikan Transaksi (${formatRupiah(effectivePayable)})`}
                  </span>
```

with:

```tsx
                  disabled={isSplitMode ? isSplitShort : isCashShort}
                  className="flex-1 py-3 px-4 rounded-xl text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isSplitMode
                      ? `Selesaikan Multi-Bayar (${formatRupiah(totalSplitPaid)})`
                      : `Selesaikan Transaksi (${formatRupiah(netPayable)})`}
                  </span>
```

(s) Replace every remaining `effectivePayable` with `netPayable` (Edit with `replace_all: true`). There is no surcharge any more, so the amount the customer pays is always `netPayable`.

- [ ] **Step 10: Simplify `PosScreen` (no cart modes, no booking, no DP)**

All edits are in `src/modules/pos/PosScreen.tsx`.

(a) Imports: delete the line `  SalesBookingRecord, ` (trailing space), the line `  BookingPayload,`, and the lines `  BookingDpModal, ` and `  BookingListDrawer, ` (both with a trailing space). The `Bookmark` icon import may stay.

(b) In `interface PosScreenProps` delete these lines:

```tsx
  bookings?: SalesBookingRecord[];
```
```tsx
  onSaveBooking?: (payload: BookingPayload) => Promise<void>;
  onCancelBooking?: (booking: SalesBookingRecord) => void;
```
```tsx
  /** Izin detail peran: Booking DP & faktur BON. */
  permissions?: { bookingDp: boolean; bon: boolean };
```

(c) In the destructured props delete the lines `  bookings = [],`, `  onSaveBooking,`, `  onCancelBooking,` and `  permissions = { bookingDp: true, bon: true },`.

(d) Delete the two state lines:

```tsx
  const [showBookingDpModal, setShowBookingDpModal] = useState<boolean>(false);
  const [showBookingListDrawer, setShowBookingListDrawer] = useState<boolean>(false);
```

and replace:

```tsx
  const [cartMode, setCartMode] = useState<'REGULAR' | 'BON' | 'DP'>('REGULAR');

  // Mode yang tidak diizinkan untuk peran ini kembali ke transaksi reguler
  useEffect(() => {
    if ((cartMode === 'BON' && !permissions.bon) || (cartMode === 'DP' && !permissions.bookingDp)) {
      setCartMode('REGULAR');
    }
  }, [cartMode, permissions.bon, permissions.bookingDp]);
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [checkoutInitialTag, setCheckoutInitialTag] = useState<'REGULAR' | 'BON'>('REGULAR');

  const [activeBookingSourceId, setActiveBookingSourceId] = useState<string | null>(null);
  const [appliedDpAmount, setAppliedDpAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearBookingSource = () => {
    setAppliedDpAmount(0);
    setActiveBookingSourceId(null);
  };
```

with:

```tsx
  const [showCheckoutModal, setShowCheckoutModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
```

(e) Replace `  const netPayable = Math.max(0, totals.grandTotal - appliedDpAmount);` with `  const netPayable = totals.grandTotal;`.

(f) Replace everything from `  const handleCheckoutSale = async (` down to and including the `  };` that closes `handleConvertBookingToCart` (directly above `  const handleParkCurrentCart = () => {`) with:

```tsx
  const handleCheckoutSale = async (
    method: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta: CheckoutPaymentMeta = {}
  ): Promise<boolean> => {
    if (cart.length === 0 || isSubmitting) return false;

    const payload: CheckoutPayload = {
      customer_name: customerName.trim() || undefined,
      vehicle_plate: vehiclePlate.trim() || undefined,
      vehicle_model: vehicleModel.trim() || undefined,
      notes,
      discount_amount: manualDiscount,
      items: cart.map(cartLineToPayload),
      payments: buildPayments(method, netPayable, cashTendered, paymentMeta),
    };

    setIsSubmitting(true);
    try {
      const transaction = await onCheckout(payload);
      setCompletedSaleTx(transaction);
      setCart([]);
      setCashTenderedInput('');
      setManualDiscount(0);
      setCustomerName('');
      setVehiclePlate('');
      setVehicleModel('');
      return true;
    } catch (err) {
      toast.error('Transaksi Gagal Dibukukan', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenCheckout = () => {
    if (cart.length === 0) {
      toast.warning('Keranjang Kosong', 'Tambahkan produk atau jasa ke keranjang terlebih dahulu.');
      return;
    }
    setShowCheckoutModal(true);
  };

  const handleConfirmCheckoutFromModal = async (
    pm: PaymentMethod,
    cashTendered: number,
    notes?: string,
    paymentMeta?: CheckoutPaymentMeta
  ) => {
    if (await handleCheckoutSale(pm, cashTendered, notes, paymentMeta)) {
      setShowCheckoutModal(false);
    }
  };
```

(g) In `handleParkCurrentCart` replace:

```tsx
    onSaveParkedOrder?.(newParked);
    setCart([]);
    clearBookingSource();
```

with:

```tsx
    onSaveParkedOrder?.(newParked);
    setCart([]);
```

(h) In `handleOpenReceiptPreview` replace:

```tsx
      vehicleModel,
      cartMode === 'BON' ? 'HUTANG_BON' : paymentMethod,
      netPayable,
      cashierName,
      manualDiscount,
      cartMode === 'BON'
    );
```

with:

```tsx
      vehicleModel,
      paymentMethod,
      netPayable,
      cashierName,
      manualDiscount
    );
```

and in `handlePrintParkedOrder` replace:

```tsx
      cashierName,
      order.total_discount,
      false
    );
```

with:

```tsx
      cashierName,
      order.total_discount
    );
```

(i) Delete the line `  const activeBookingsCount = bookings.filter((b) => b.status === 'ACTIVE').length;` and the blank line after it.

(j) Header: delete the "Booking DP" button — every line from `          {permissions.bookingDp && (` (the one directly after the "Antrian Tahan" button's `          </button>` and blank line) down to and including its closing `          )}` (directly above the blank line and `          <div ` of the "Kas Laci" chip).

(k) "Kosongkan" button: replace:

```tsx
                  setCart([]);
                  setAppliedDpAmount(0);
                  setActiveBookingSourceId(null);
```

with:

```tsx
                  setCart([]);
```

(l) Customer bar: delete

```tsx
            {appliedDpAmount > 0 && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-300 font-mono">
                DP Terpasang: {formatRupiah(appliedDpAmount)}
              </span>
            )}
```

and in the footer summary delete

```tsx
            {appliedDpAmount > 0 && (
              <div className="flex justify-between text-purple-800 font-bold">
                <span>DP Booking Terpasang:</span>
                <span className="font-mono">-{formatRupiah(appliedDpAmount)}</span>
              </div>
            )}
```

(m) Delete the mode switcher: every line from `          {/* Mode Switcher Tabs (Reguler / BON / DP) persis Cabang 2 */}` down to and including its closing `          </div>` (directly above the blank line and `          {/* Tombol Aksi 1: Cetak & Pratinjau Nota Fisik Langsung */}`).

(n) Replace every line from `          {/* Tombol Aksi 2: Proses Utama Sesuai Mode Terpilih */}` down to and including the `          )}` that closes the `cartMode === 'DP'` block (directly above `        </div>`, `      </div>`, `    </div>`) with:

```tsx
          {/* Tombol Aksi 2: Bayar (setiap nota lunas saat checkout) */}
          <button
            type="button"
            onClick={handleOpenCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-98 transition-all cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Proses Pesanan (Bayar) ➔</span>
          </button>
```

(o) Delete the `<BookingDpModal … />` and `<BookingListDrawer … />` elements: every line from `      <BookingDpModal` down to and including the `      />` that closes `<BookingListDrawer` (directly above the blank line and `      <ParkedOrdersDrawer`).

(p) In the `<CheckoutModal` element replace:

```tsx
        onClose={() => setShowCheckoutModal(false)}
        initialTag={checkoutInitialTag}
        canCreateBon={permissions.bon}
        cart={cart}
```

with:

```tsx
        onClose={() => setShowCheckoutModal(false)}
        cart={cart}
```

and replace:

```tsx
        totals={totals}
        appliedDpAmount={appliedDpAmount}
        netPayable={netPayable}
```

with:

```tsx
        totals={totals}
        netPayable={netPayable}
```

- [ ] **Step 11: Success and preview modals show only paid sales**

In `src/modules/pos/components/PosSuccessModal.tsx`:
- delete the line `  const isBon = (transaction.notes && transaction.notes.toUpperCase().includes('BON')) || transaction.payment_method === ('BON' as any);`
- replace `            {isBon ? 'Faktur BON Tersimpan!' : 'Pembayaran Berhasil!'}` with `            Pembayaran Berhasil!`
- replace

```tsx
            {isBon
              ? 'Faktur BON piutang telah dicatat ke buku besar'
              : 'Transaksi lunas dan pergerakan stok telah dibukukan'}
```

with `            Transaksi lunas dan pergerakan stok telah dibukukan`
- replace `              Total {isBon ? 'Tagihan BON' : 'Diterima'}` with `              Total Diterima`
- replace

```tsx
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                  isBon
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isBon ? 'FAKTUR BON' : 'LUNAS'}
              </span>
```

with

```tsx
              <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                LUNAS
              </span>
```

In `src/modules/pos/components/ReceiptPreviewModal.tsx`:
- delete the line `  const isBon = transaction.is_bon || transaction.payment_method === 'HUTANG_BON';`
- replace `              {isBon ? '*** FAKTUR BON / TEMPO ***' : '*** NOTA PENJUALAN RESMI ***'}` with `              *** NOTA PENJUALAN RESMI ***`
- delete

```tsx
              {isBon && (
                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[9.5px] space-y-0.5 mt-1">
                  <div className="font-bold uppercase">Status: Belum Lunas (Piutang)</div>
                  <div>Tercatat di Buku Pembantu Piutang Usaha.</div>
                </div>
              )}
```

- [ ] **Step 12: Receipt history and dashboard without BON, DP and EDC**

In `src/modules/receipt/ThermalReceiptScreen.tsx`:
- replace `type StatusFilter = 'ALL' | 'LUNAS' | 'BON' | 'DP' | 'VOID';` with `type StatusFilter = 'ALL' | 'LUNAS' | 'VOID';`
- delete

```tsx
      if (statusFilter === 'BON') {
        if (isVoid) return false;
        const isBon = (tx.notes && tx.notes.toUpperCase().includes('BON')) || tx.payment_method === ('BON' as any);
        if (!isBon) return false;
      }
      if (statusFilter === 'DP') {
        if (isVoid) return false;
        const isDp = (tx.notes && tx.notes.toUpperCase().includes('DP')) || tx.payment_method === ('DP' as any);
        if (!isDp) return false;
      }
```

- in `renderStatusBadge` delete

```tsx
    if ((tx.notes && tx.notes.toUpperCase().includes('BON')) || tx.payment_method === ('BON' as any)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Tag className="w-3 h-3 text-amber-600" />
          BON
        </span>
      );
    }
    if ((tx.notes && tx.notes.toUpperCase().includes('DP')) || tx.payment_method === ('DP' as any)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
          <CreditCard className="w-3 h-3 text-purple-600" />
          DP
        </span>
      );
    }
```

- replace `{(['ALL', 'LUNAS', 'BON', 'DP', 'VOID'] as StatusFilter[]).map((st) => (` with `{(['ALL', 'LUNAS', 'VOID'] as StatusFilter[]).map((st) => (`
- delete (and the blank line after it)

```tsx
                    {activeTx.surcharge_amount !== undefined && activeTx.surcharge_amount > 0 && (
                      <div className="flex justify-between text-amber-800 text-[10px]">
                        <span>Surcharge Kartu Kredit ({activeTx.fee_percentage}%):</span>
                        <span>+{formatRupiah(activeTx.surcharge_amount)}</span>
                      </div>
                    )}
```

- in the split-payment list replace the line

```tsx
                              <span>• {sp.method.replace('_', ' ')}{sp.provider_name ? ` (${sp.provider_name})` : ''}{sp.edc_bank ? ` (${sp.edc_bank} - ${sp.edc_type || 'Debit'})` : ''}:</span>
```

with

```tsx
                              <span>• {sp.method.replace('_', ' ')}{sp.provider_name ? ` (${sp.provider_name})` : ''}:</span>
```

- replace

```tsx
                          {activeTx.payment_provider && ` (${activeTx.payment_provider})`}
                          {activeTx.edc_bank && ` (${activeTx.edc_bank} - ${activeTx.edc_type || 'Debit'})`}
                        </span>
```

with

```tsx
                          {activeTx.payment_provider && ` (${activeTx.payment_provider})`}
                        </span>
```

- replace

```tsx
                              {activeTx.payment_provider && ` (${activeTx.payment_provider})`}
                              {activeTx.edc_bank && ` (${activeTx.edc_bank} - ${activeTx.edc_type || 'Debit'})`}
                              {activeTx.payment_reference && ` (Ref: ${activeTx.payment_reference})`}
```

with

```tsx
                              {activeTx.payment_provider && ` (${activeTx.payment_provider})`}
                              {activeTx.payment_reference && ` (Ref: ${activeTx.payment_reference})`}
```

In `src/modules/dashboard/ExecutiveDashboardScreen.tsx`:
- delete the line `    BON: { count: 0, total: 0 },` in `paymentBreakdown`
- replace `    const method = tx.payment_method === 'HUTANG_BON' ? 'BON' : tx.payment_method || 'TUNAI';` with `    const method = tx.payment_method || 'TUNAI';`
- delete the line `                    BON: 'Piutang Bon Belum Lunas',` in `labelMap`

- [ ] **Step 13: Drop booking state and handlers from `App.tsx`**

In `src/App.tsx`:
- delete the type import line `  SalesBookingRecord, ` (trailing space) and the API import line `  mapBooking,`
- replace `import type { ApiJournal, ApiSale, BookingPayload, CheckoutPayload, InventoryValuation, ApiExpenseCategory, CashBalances } from './services/api';` with `import type { ApiJournal, ApiSale, CheckoutPayload, InventoryValuation, ApiExpenseCategory, CashBalances } from './services/api';`
- delete `  const [bookings, setBookings] = useState<SalesBookingRecord[]>([]);`
- in `notifications` replace

```tsx
    // 2. Booking DP Aktif
    bookings
      .filter((b) => b.status === 'ACTIVE')
      .slice(0, 3)
      .forEach((b) => {
        const id = `notif-book-${b.id}`;
        if (dismissedNotifIds.includes(id)) return;
        list.push({
          id,
          type: 'BOOKING_NEW',
          title: `Booking DP: ${b.customer_name}`,
          description: `${b.customer_name} (${b.vehicle_plate}) DP ${formatRupiah(b.dp_amount)} untuk ${b.items?.length || 0} item pesanan.`,
          timestamp: b.date || 'Hari ini',
          isRead: readNotifIds.includes(id),
        });
      });

    // 3. Jatuh Tempo Hutang Distributor
```

with

```tsx
    // 2. Jatuh Tempo Hutang Distributor
```

and replace `  }, [products, bookings, payableInvoices, receivableInvoices, readNotifIds, dismissedNotifIds]);` with `  }, [products, payableInvoices, receivableInvoices, readNotifIds, dismissedNotifIds]);`
- in `loadPosData` replace the comment `  // Data POS (katalog, nota, piutang, booking) selalu dari server Laravel sesuai izin peran.` with `  // Data POS (katalog, nota, piutang) selalu dari server Laravel sesuai izin peran.`; replace `    const [apiProducts, apiServices, apiSales, apiReceivables, apiBookings, apiProductCats, apiServiceCats, apiSuppliers] = await Promise.all([` with `    const [apiProducts, apiServices, apiSales, apiReceivables, apiProductCats, apiServiceCats, apiSuppliers] = await Promise.all([`; delete the line `      allowed('booking_dp', 'pos') ? posApi.listBookings('ALL').catch(() => null) : null,`; delete the line `    if (apiBookings) setBookings(apiBookings.map((b) => mapBooking(b, apiProducts ?? [], apiServices ?? [])));`
- in `handleCheckout` replace

```tsx
    setCashInDrawer((prev) => prev + cashPortion(sale));
    if (payload.booking_id) {
      setBookings((prev) => prev.map((b) => (b.id === String(payload.booking_id) ? { ...b, status: 'CONVERTED' } : b)));
    }
    if (sale.payment_method === 'BON') refreshReceivables();
    handleRefreshProducts();
```

with

```tsx
    setCashInDrawer((prev) => prev + cashPortion(sale));
    handleRefreshProducts();
```

- in `handleVoidTransaction` replace

```tsx
      setCashInDrawer((prev) => Math.max(0, prev - cashPortion(sale)));
      if (Number(sale.dp_applied) > 0) {
        posApi.listBookings('ALL').then((rows) => setBookings(rows.map((b) => mapBooking(b, products, services)))).catch(() => {});
      }
      if (sale.payment_method === 'BON') refreshReceivables();
      handleRefreshProducts();
```

with

```tsx
      setCashInDrawer((prev) => Math.max(0, prev - cashPortion(sale)));
      handleRefreshProducts();
```

- delete `handleSaveBooking` and `handleCancelBooking`: every line from `  // Booking DP di server: DP dicatat sebagai Uang Muka Pelanggan (2-1004)` down to and including the `  };` that closes `handleCancelBooking`, plus the blank line after it (the next line is then `  const handleResetData = () => {`)
- in the `<PosScreen` element delete the lines `          bookings={bookings}`, `          onSaveBooking={handleSaveBooking}`, `          onCancelBooking={handleCancelBooking}` and `          permissions={{ bookingDp: can('booking_dp'), bon: can('bon_receivable') }}`

`refreshReceivables` is now unused; Task F2 deletes it.

- [ ] **Step 14: Drop the BON and DP audit tests**

Replace the whole content of `src/modules/pos/__tests__/posRepairsAudit.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { INITIAL_PRODUCT_CATEGORIES } from '../../../shared/data/mockData';

describe('POS UI & Business Logic Repairs Audit', () => {
  it('confirms BAN_BEKAS is completely eliminated from master product categories', () => {
    const hasBanBekas = INITIAL_PRODUCT_CATEGORIES.some(
      (c) => c.category_code.toUpperCase().includes('BEKAS') || c.category_name.toLowerCase().includes('bekas')
    );
    expect(hasBanBekas).toBe(false);
  });
});
```

- [ ] **Step 15: Check that nothing references the removed code**

Run:

```bash
grep -rnE "BookingDpModal|BookingListDrawer|SalesBookingRecord|ApiBooking|mapBooking|BookingPayload|listBookings|createBooking|cancelBooking|createSalesBookingRecord|generateBookingNumber|fetchBookingsFromSupabase|upsertBookingToSupabase|INITIAL_BOOKINGS|HUTANG_BON|EDC_DEBIT|EDC_CREDIT|edc_bank|edc_type|surcharge_amount|dp_applied|appliedDpAmount|is_bon|isBon|canCreateBon|cartMode|charge_to_customer|booking_id|term_days|bookingDp|effectivePayable|onSaveBooking|onCancelBooking|setBookings|BOOKING_NEW" src --exclude-dir=__tests__ | grep -v "src/shared/components/NotificationBellDropdown.tsx"
grep -rnE "EDC|edc|BON|\bDP\b|Piutang|piutang" src/modules/pos src/modules/receipt src/modules/dashboard --exclude-dir=__tests__
```

Expected: no output from either command. (`NotificationBellDropdown.tsx` still lists `BOOKING_NEW` in its type union; Task F2 removes it.)

- [ ] **Step 16: Run the gate**

Run: `npm run lint && npm test`
Expected: `tsc --noEmit` reports no errors and every Vitest file passes.

- [ ] **Step 17: Commit**

```bash
git add src/shared/types/index.ts \
        src/services/api/posMappers.ts \
        src/services/api/posApi.ts \
        src/services/posService.ts \
        src/services/supabaseDataService.ts \
        src/shared/data/mockData.ts \
        src/modules/pos/components/index.ts \
        src/modules/pos/components/CheckoutModal.tsx \
        src/modules/pos/PosScreen.tsx \
        src/modules/pos/components/PosSuccessModal.tsx \
        src/modules/pos/components/ReceiptPreviewModal.tsx \
        src/modules/receipt/ThermalReceiptScreen.tsx \
        src/modules/dashboard/ExecutiveDashboardScreen.tsx \
        src/App.tsx \
        src/services/__tests__/posMappers.test.ts \
        src/modules/pos/__tests__/posRepairsAudit.test.ts
git status --short   # BookingDpModal.tsx and BookingListDrawer.tsx show as "D "; nothing else staged
git commit -m "$(cat <<'EOF'
refactor(pos): settle every sale at checkout in the cashier ui

The POS screen, checkout modal, receipts and dashboard no longer offer
booking DP, BON credit sales or EDC card payments. Checkout sends only
Tunai, Transfer and QRIS rows, matching the server, which now rejects
bon, booking_id and EDC methods.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F2: Back office — receivables ledger, BON/DP permission keys, EDC settings and exports

**Files:**
- Delete: `src/modules/accounting/components/AccountsReceivableTab.tsx`
- Modify (full replacement): `src/services/api/posApi.ts`
- Modify: `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/services/api/posMappers.ts`, `src/services/supabaseDataService.ts`, `src/App.tsx`, `src/modules/accounting/GeneralLedgerScreen.tsx`, `src/modules/accounting/components/index.ts`, `src/modules/accounting/components/JournalTab.tsx`, `src/modules/settings/components/RolePermissionsTab.tsx`, `src/modules/settings/components/PaymentMethodsTab.tsx`, `src/modules/settings/SettingsScreen.tsx`, `src/shared/components/NotificationBellDropdown.tsx`, `src/shared/export/registry.ts`
- Test: `src/shared/export/__tests__/registry.test.ts`, `src/modules/settings/__tests__/financialsSettingsAudit.test.ts`, `src/services/__tests__/authNavigationService.test.ts`

**Interfaces:**
- Consumes (Task B3): `Permissions::KEYS` has 13 keys (no `booking_dp`, `bon_receivable`); `DEFAULTS['KASIR'] = ['pos', 'receipt']`; `PUT /settings/role-permissions` rejects the removed keys with 422.
- Consumes (Task B1): `/receivables*` and `/settings/edc*` return 404. (The frontend never called `/settings/edc`: EDC fees lived in localStorage store settings.)
- Consumes (Task F1): `posMappers.ts` and `posApi.ts` exactly as F1 wrote them (full replacements); App.tsx after F1 (comment `// Data POS (katalog, nota, piutang) …`, destructuring `[apiProducts, apiServices, apiSales, apiReceivables, apiProductCats, apiServiceCats, apiSuppliers]`, notification deps `[products, payableInvoices, receivableInvoices, readNotifIds, dismissedNotifIds]`); `NotificationBellDropdown` still has the `BOOKING_NEW` member with no producer.
- Produces: `PermissionKey` with 13 members; `DEFAULT_ROLE_PERMISSIONS.KASIR/GUDANG` with 13 keys each; `StoreSettings` without `edc_settings`, `coa_receivable_account`; no `EdcSetting`, `ReceivableInvoice`, `ReceivablePaymentInput` types; `AppNotification.type: 'STOCK_LOW' | 'DEBT_DUE' | 'TRANSACTION'`; `AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports'` with the reports tab labelled `5. Laporan Keuangan`; `REPORT_MAPPERS` with 20 report ids (no `accounts_receivable`).
- Consumed by: Task F3 (`5. Laporan Keuangan` in the ledger e2e audit), Task D1 (docs).

- [ ] **Step 1: Write the failing tests**

In `src/shared/export/__tests__/registry.test.ts` replace:

```ts
  it('semua 21 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(21));
```

with:

```ts
  it('semua 20 reportId terdaftar', () => expect(Object.keys(REPORT_MAPPERS).length).toBe(20));
  it('ekspor accounts_receivable sudah dihapus', () => expect(Object.keys(REPORT_MAPPERS)).not.toContain('accounts_receivable'));
```

In `src/modules/settings/__tests__/financialsSettingsAudit.test.ts` delete the line

```ts
    expect(INITIAL_STORE_SETTINGS.coa_receivable_account).toBe('1-1002');
```

and add this test directly after the closing `  });` of the first `it(...)` block:

```ts

  it('keeps no EDC settings or BON receivable account in the store settings', () => {
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('edc_settings');
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('coa_receivable_account');
  });
```

In `src/services/__tests__/authNavigationService.test.ts` replace

```ts
    expect(hasPermission(makeUser('KASIR'), DEFAULT_ROLE_PERMISSIONS, 'booking_dp')).toBe(true);
```

with

```ts
    expect(hasPermission(makeUser('KASIR'), DEFAULT_ROLE_PERMISSIONS, 'receipt')).toBe(true);
```

and insert, directly above `  it('default screen follows the configured permissions, not the role name', () => {`:

```ts
  it('default role permissions list exactly the 13 server keys (no booking DP or BON)', () => {
    for (const role of ['KASIR', 'GUDANG'] as const) {
      const keys = Object.keys(DEFAULT_ROLE_PERMISSIONS[role]);
      expect(keys).toHaveLength(13);
      expect(keys).not.toContain('booking_dp');
      expect(keys).not.toContain('bon_receivable');
    }
  });

```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts src/modules/settings/__tests__/financialsSettingsAudit.test.ts src/services/__tests__/authNavigationService.test.ts`
Expected: FAIL — 21 report ids including `accounts_receivable`; `INITIAL_STORE_SETTINGS` still has `edc_settings` and `coa_receivable_account`; each default role has 15 keys.

- [ ] **Step 3: Drop the types**

In `src/shared/types/index.ts`:
- delete the whole `EdcSetting` interface (from `export interface EdcSetting {` through its closing `}` and the blank line after it; the next line is then `export type PaymentMethod = …`)
- in `StoreSettings` delete the lines `  edc_settings?: EdcSetting[];` and `  coa_receivable_account?: string;`
- delete the `ReceivableInvoice` and `ReceivablePaymentInput` interfaces (from `export interface ReceivableInvoice {` through the closing `}` of `ReceivablePaymentInput` and the blank line after it; the next line is then `export type UserRole = 'OWNER' | 'KASIR' | 'GUDANG';`)
- in `PermissionKey` delete the lines `  | 'booking_dp'` and `  | 'bon_receivable'`

- [ ] **Step 4: Clean the mock data**

In `src/shared/data/mockData.ts`:
- delete the import line `  EdcSetting,`
- in `DEFAULT_ROLE_PERMISSIONS.KASIR` replace

```ts
    sale_void: false,
    booking_dp: true,
    bon_receivable: true,
    inventory_view: false,
```

with

```ts
    sale_void: false,
    inventory_view: false,
```

- in `DEFAULT_ROLE_PERMISSIONS.GUDANG` replace

```ts
    sale_void: false,
    booking_dp: false,
    bon_receivable: false,
    inventory_view: true,
```

with

```ts
    sale_void: false,
    inventory_view: true,
```

- delete the whole `INITIAL_EDC_SETTINGS` constant (from `export const INITIAL_EDC_SETTINGS: EdcSetting[] = [` through its closing `];` and the blank line after it; the next line is then `export const INITIAL_STORE_SETTINGS: StoreSettings = {`)
- in `INITIAL_STORE_SETTINGS` delete the lines `  edc_settings: INITIAL_EDC_SETTINGS,` and `  coa_receivable_account: '1-1002',`

- [ ] **Step 5: Drop the receivable API, mapper and legacy functions**

Replace the whole content of `src/services/api/posApi.ts` with:

```ts
import { apiClient } from './apiClient';
import { ServiceMasterItem } from '../../shared/types';
import { ApiSale, CheckoutPayload } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const posApi = {
  checkout: async (payload: CheckoutPayload) =>
    (await apiClient.post<Envelope<ApiSale>>('/pos/checkout', payload)).data,

  listTransactions: async (params?: { search?: string; date?: string; limit?: number }) =>
    (await apiClient.get<Envelope<ApiSale[]>>('/pos/transactions', params)).data,

  voidTransaction: async (id: string | number, reason: string) =>
    (await apiClient.post<Envelope<ApiSale>>(`/pos/transactions/${id}/void`, { reason })).data,

  listServices: async (): Promise<ServiceMasterItem[]> => {
    const res = await apiClient.get<Envelope<any[]>>('/services');
    return res.data.map((s) => ({
      id: String(s.id),
      service_code: s.service_code,
      service_name: s.service_name,
      category: s.category,
      standard_price: Number(s.standard_price) || 0,
      cost_price: Number(s.cost_price) || 0,
      description: s.description ?? undefined,
      is_active: !!s.is_active,
    }));
  },
};
```

In `src/services/api/posMappers.ts` (as written by Task F1):
- delete the import line `  ReceivableInvoice,`
- delete the whole `ApiReceivable` interface (from `export interface ApiReceivable {` through its closing `}` and the blank line after it)
- delete `mapReceivable` at the end of the file (from `export const mapReceivable = (r: ApiReceivable): ReceivableInvoice => ({` through its closing `});`, and the blank line before it)

In `src/services/supabaseDataService.ts`:
- delete the import line `  ReceivableInvoice,`
- replace the comment line `// 9. PAYABLES, RECEIVABLES` with `// 9. PAYABLES`
- delete `fetchReceivablesFromSupabase` and `upsertReceivableToSupabase` (from `export const fetchReceivablesFromSupabase = async (): Promise<ReceivableInvoice[] | null> => {` through the `};` that closes `upsertReceivableToSupabase`, plus the blank line after it)

- [ ] **Step 6: Drop receivables from `App.tsx` and strip the legacy settings**

In `src/App.tsx`:
- delete the type import lines `  ReceivableInvoice,` and `  ReceivablePaymentInput,`, and the API import line `  mapReceivable,`
- replace the store settings initializer (spec D12):

```tsx
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('ob3_store_settings');
      return saved ? JSON.parse(saved) : INITIAL_STORE_SETTINGS;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });
```

with:

```tsx
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    try {
      const saved = localStorage.getItem('ob3_store_settings');
      if (!saved) return INITIAL_STORE_SETTINGS;
      // Properti lama dari fitur yang sudah dihapus (spec 2026-09-30) dibuang dari pengaturan tersimpan.
      const { edc_settings: _edc, coa_receivable_account: _receivable, ...settings } = JSON.parse(saved);
      return settings;
    } catch {
      return INITIAL_STORE_SETTINGS;
    }
  });
```

(The existing `useEffect` that writes `ob3_store_settings` then saves the stripped object.)
- delete `  const [receivableInvoices, setReceivableInvoices] = useState<ReceivableInvoice[]>([]);`
- in `notifications` replace

```tsx
    // 4. Piutang Pelanggan (Faktur BON)
    receivableInvoices
      .filter((r) => r.status !== 'LUNAS')
      .slice(0, 3)
      .forEach((r) => {
        const id = `notif-rec-${r.id}`;
        if (dismissedNotifIds.includes(id)) return;
        list.push({
          id,
          type: 'BON_OVERDUE',
          title: `Piutang BON: ${r.customer_name}`,
          description: `Faktur BON ${r.invoice_number} sisa tagihan ${formatRupiah(r.remaining_amount)} belum lunas.`,
          timestamp: r.due_date || 'Tempo',
          isRead: readNotifIds.includes(id),
        });
      });

    return list;
  }, [products, payableInvoices, receivableInvoices, readNotifIds, dismissedNotifIds]);
```

with

```tsx
    return list;
  }, [products, payableInvoices, readNotifIds, dismissedNotifIds]);
```

- in `loadPosData` replace the comment `  // Data POS (katalog, nota, piutang) selalu dari server Laravel sesuai izin peran.` with `  // Data POS (katalog & nota) selalu dari server Laravel sesuai izin peran.`; replace `    const [apiProducts, apiServices, apiSales, apiReceivables, apiProductCats, apiServiceCats, apiSuppliers] = await Promise.all([` with `    const [apiProducts, apiServices, apiSales, apiProductCats, apiServiceCats, apiSuppliers] = await Promise.all([`; delete the line `      allowed('bon_receivable', 'accounting_hub') ? posApi.listReceivables('all').catch(() => null) : null,`; delete the line `    if (apiReceivables) setReceivableInvoices(apiReceivables.map(mapReceivable));`
- delete (and the blank line after it)

```tsx
  const refreshReceivables = () => {
    if (!can('bon_receivable') && !can('accounting_hub')) return;
    posApi.listReceivables('all').then((rows) => setReceivableInvoices(rows.map(mapReceivable))).catch(() => {});
  };
```

- delete `handlePayReceivable`: every line from `  // Pelunasan piutang BON di server (Dr Kas/Bank, Cr Piutang Dagang)` down to and including the `  };` that closes it, plus the blank line after it (the next line is then `  // Tutup buku di server: jurnal penutup bertanggal akhir bulan + kunci periode.`)
- in the `<GeneralLedgerScreen` element delete the lines `                receivableInvoices={receivableInvoices}` and `                onPayReceivable={handlePayReceivable}`

- [ ] **Step 7: Remove the "Pembantu Piutang" ledger tab and the receivable journal filters**

```bash
git rm src/modules/accounting/components/AccountsReceivableTab.tsx
```

In `src/modules/accounting/components/index.ts` delete the line `export * from './AccountsReceivableTab';`.

In `src/modules/accounting/GeneralLedgerScreen.tsx` (the `Users` icon import may stay):
- replace

```tsx
  PayableInvoice,
  ReceivableInvoice,
  ReceivablePaymentInput,
} from '../../shared/types';
```

with

```tsx
  PayableInvoice,
} from '../../shared/types';
```

- delete the import line `  AccountsReceivableTab,`
- replace `export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'receivables' | 'reports';` with `export type AccountingTabKey = 'journals' | 'ledger' | 'trial-balance' | 'payables' | 'reports';`
- in `GeneralLedgerScreenProps` delete the lines `  receivableInvoices: ReceivableInvoice[];` and `  onPayReceivable: (input: ReceivablePaymentInput) => void;`
- replace

```tsx
  { id: 'receivables', label: '5. Pembantu Piutang', icon: Users },
  { id: 'reports', label: '6. Laporan Keuangan', icon: FileText },
```

with

```tsx
  { id: 'reports', label: '5. Laporan Keuangan', icon: FileText },
```

- replace `const SUBLEDGER_TABS: AccountingTabKey[] = ['payables', 'receivables'];` with `const SUBLEDGER_TABS: AccountingTabKey[] = ['payables'];`
- in the destructured props delete the lines `  receivableInvoices,` and `  onPayReceivable,`
- in `badges` delete the line `    receivables: receivableInvoices.filter((i) => i.status !== 'LUNAS').length,`
- delete the line `        {activeTab === 'receivables' && <AccountsReceivableTab invoices={receivableInvoices} onPayReceivable={onPayReceivable} />}`

In `src/modules/accounting/components/JournalTab.tsx` (spec D13: historic `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT` entries stay visible under "Semua"):
- replace `  { id: 'SALE', label: 'Penjualan & DP', types: ['POS_SALE', 'POS_SALE_VOID', 'BOOKING_DP', 'BOOKING_DP_REFUND'] },` with `  { id: 'SALE', label: 'Penjualan', types: ['POS_SALE', 'POS_SALE_VOID'] },`
- delete the line `  { id: 'RECEIVABLE', label: 'Piutang', types: ['RECEIVABLE_PAYMENT'] },`

- [ ] **Step 8: Settings without the two permission keys, the EDC sub-tab and the BON COA preference**

In `src/modules/settings/components/RolePermissionsTab.tsx` delete the two entries (the `CalendarCheck`/`CreditCard` icon imports may stay):

```tsx
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
```

In `src/modules/settings/components/PaymentMethodsTab.tsx` (the `CreditCard`/`AlertCircle` icon imports may stay):
- replace `import { EdcSetting, PaymentProviderSetting, StoreSettings } from '../../../shared/types';` with `import { PaymentProviderSetting, StoreSettings } from '../../../shared/types';`
- replace `  const [activeSubTab, setActiveSubTab] = useState<'bank' | 'qris' | 'edc' | 'account'>('bank');` with `  const [activeSubTab, setActiveSubTab] = useState<'bank' | 'qris' | 'account'>('bank');`
- delete (and the blank line after it)

```tsx
  // Local state for adding new EDC Bank
  const [newEdcBankName, setNewEdcBankName] = useState('');
  const [newEdcDebitFee, setNewEdcDebitFee] = useState<number>(0.15);
  const [newEdcCreditFee, setNewEdcCreditFee] = useState<number>(2.00);
```

- delete the line `  const edcSettings = settings.edc_settings || [];`
- delete the EDC handlers: every line from `  // ==================== EDC HANDLERS ====================` down to and including the `  };` that closes `handleDeleteEdcBank`, plus the blank line after it (the next line is then `  return (`)
- delete the "Pengaturan Fee EDC" sub-tab button: every line from the `        <button` directly above `          onClick={() => setActiveSubTab('edc')}` down to and including its `        </button>`, plus the blank line after it
- delete the EDC sub-tab body: every line from the `      {/* ========================================================================= */}` directly above `      {/* SUBTAB 3: PENGATURAN FEE MESIN EDC                                        */}` down to and including the `      )}` that closes `{activeSubTab === 'edc' && (`, plus the blank line after it (the next lines are then the comment banner of `SUBTAB 4: REKENING UTAMA NOTA`)

In `src/modules/settings/SettingsScreen.tsx` delete the COA preference card (and the blank line after it):

```tsx
                <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Piutang Pelanggan (BON)</span>
                  <input
                    type="text"
                    value={formData.coa_receivable_account || '1-1002'}
                    onChange={(e) => handleChange('coa_receivable_account', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-slate-900"
                  />
                  <span className="text-[10px] text-slate-400 block">Akun piutang tempo langganan</span>
                </div>
```

- [ ] **Step 9: Notifications and the export registry**

In `src/shared/components/NotificationBellDropdown.tsx`:
- replace `  type: 'STOCK_LOW' | 'DEBT_DUE' | 'BOOKING_NEW' | 'TRANSACTION' | 'BON_OVERDUE';` with `  type: 'STOCK_LOW' | 'DEBT_DUE' | 'TRANSACTION';`
- replace

```tsx
                    if (n.type === 'DEBT_DUE' || n.type === 'BON_OVERDUE') onNavigateTo('ledger');
                    if (n.type === 'BOOKING_NEW') onNavigateTo('pos');
```

with

```tsx
                    if (n.type === 'DEBT_DUE') onNavigateTo('ledger');
```

- replace

```tsx
                      : n.type === 'DEBT_DUE' || n.type === 'BON_OVERDUE'
                      ? 'bg-rose-50 text-rose-600'
                      : n.type === 'BOOKING_NEW'
                      ? 'bg-purple-50 text-purple-600'
                      : 'bg-emerald-50 text-emerald-600'
```

with

```tsx
                      : n.type === 'DEBT_DUE'
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-emerald-50 text-emerald-600'
```

- replace

```tsx
                    {(n.type === 'DEBT_DUE' || n.type === 'BON_OVERDUE') && <Clock className="w-4 h-4" />}
                    {n.type === 'BOOKING_NEW' && <CheckCircle2 className="w-4 h-4" />}
```

with

```tsx
                    {n.type === 'DEBT_DUE' && <Clock className="w-4 h-4" />}
```

In `src/shared/export/registry.ts`:
- delete the line `  ReceivableInvoice,` in the first `import type { … } from '../types';` block
- delete `mapReceivable`: every line from `const mapReceivable = (invoices: ReceivableInvoice[], ctx: ExportCtx): ExportDoc =>` down to and including its closing `  }]);`, plus the blank line after it (the next line is then `const mapPayable = …`)
- in `REPORT_MAPPERS` delete the line `  accounts_receivable: mapReceivable,`
- in `REPORT_FORMATS` delete the line `  accounts_receivable: ['xlsx', 'pdf', 'csv'],`

- [ ] **Step 10: Run the tests to verify they pass**

Run: `npx vitest run src/shared/export/__tests__/registry.test.ts src/modules/settings/__tests__/financialsSettingsAudit.test.ts src/services/__tests__/authNavigationService.test.ts`
Expected: PASS.

- [ ] **Step 11: Check that nothing references the removed code**

Run:

```bash
grep -rnE "booking_dp|bon_receivable|ReceivableInvoice|ReceivablePaymentInput|ApiReceivable|mapReceivable|listReceivables|payReceivable|receivableInvoices|refreshReceivables|handlePayReceivable|AccountsReceivableTab|accounts_receivable|EdcSetting|edc_settings|INITIAL_EDC_SETTINGS|coa_receivable_account|BON_OVERDUE|BOOKING_NEW|RECEIVABLE_PAYMENT|BOOKING_DP|ReceivablesFromSupabase|ReceivableToSupabase|'receivables'|/receivables" src --exclude-dir=__tests__ | grep -v "edc_settings: _edc"
grep -rniE "\bedc\b|surcharge|piutang|\bbon\b" src/modules/settings src/shared/export src/shared/components/NotificationBellDropdown.tsx src/modules/accounting/GeneralLedgerScreen.tsx src/modules/accounting/components/JournalTab.tsx --exclude-dir=__tests__
```

Expected: no output from either command. (The only line the first `grep -v` hides is the App.tsx destructuring that strips the legacy settings on purpose.)

- [ ] **Step 12: Run the gate**

Run: `npm run lint && npm test`
Expected: no type errors; all Vitest files pass.

- [ ] **Step 13: Commit**

```bash
git add src/shared/types/index.ts \
        src/shared/data/mockData.ts \
        src/services/api/posApi.ts \
        src/services/api/posMappers.ts \
        src/services/supabaseDataService.ts \
        src/App.tsx \
        src/modules/accounting/GeneralLedgerScreen.tsx \
        src/modules/accounting/components/index.ts \
        src/modules/accounting/components/JournalTab.tsx \
        src/modules/settings/components/RolePermissionsTab.tsx \
        src/modules/settings/components/PaymentMethodsTab.tsx \
        src/modules/settings/SettingsScreen.tsx \
        src/shared/components/NotificationBellDropdown.tsx \
        src/shared/export/registry.ts \
        src/shared/export/__tests__/registry.test.ts \
        src/modules/settings/__tests__/financialsSettingsAudit.test.ts \
        src/services/__tests__/authNavigationService.test.ts
git status --short   # AccountsReceivableTab.tsx shows as "D "; nothing else staged
git commit -m "$(cat <<'EOF'
refactor(accounting): drop the receivables ledger, edc settings and bon/dp keys

The ledger loses its receivables tab and filter groups, settings lose the
EDC fee sub-tab, the BON receivable COA preference and the booking_dp and
bon_receivable permission rows, and the accounts_receivable export is gone.
Saved store settings are stripped of the old EDC and receivable fields.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task F3: Help texts and e2e audit scripts

**Files:**
- Modify: `src/shared/components/WireframeGuideModal.tsx`, `src/shared/components/HeaderNavbar.tsx`, `src/modules/accounting/components/CashFlowStatementTab.tsx`, `src/modules/accounting/components/ManualJournalModal.tsx`, `src/modules/accounting/components/OpeningBalanceModal.tsx`
- Modify (e2e, manual Playwright scripts, not run by `npm test`): `tests/e2e/test_pos_ui_deep_audit.mjs`, `tests/e2e/test_expenses_ledger_ui_audit.mjs`, `tests/e2e/test_dashboard_auth_ui_audit.mjs`, `tests/e2e/test_financials_receipt_settings_global_audit.mjs`

**Interfaces:**
- Consumes (Task F1): the POS has no "Reguler (Lunas)" / "BON (Piutang)" / "Booking DP" switcher, no "Daftar Booking Inden & DP" header button and no "Faktur BON (Piutang)" checkout tag.
- Consumes (Task F2): the ledger reports tab is labelled `5. Laporan Keuangan`; there is no "Pembantu Piutang" tab.
- Produces: user-facing text that no longer mentions BON, piutang pelanggan, DP/booking inden or EDC.

There is no unit test for static help text; the grep in Step 5 is the check.

- [ ] **Step 1: User guide (`WireframeGuideModal`)**

In `src/shared/components/WireframeGuideModal.tsx`:
- replace `  { id: 'ledger', label: '7. Bon & Hutang Tempo', badge: 'Piutang & Hutang', icon: FileText },` with `  { id: 'ledger', label: '7. Hutang Tempo Supplier', badge: 'Hutang Dagang', icon: FileText },`
- replace `Menu utama kasir untuk melayani penjualan ban, velg, oli, jasa spooring, balancing, dan melayani booking ban inden.` with `Menu utama kasir untuk melayani penjualan ban, velg, oli, jasa spooring, dan balancing. Setiap nota dibayar lunas saat itu juga.`
- replace `Lalu pilih metode: <strong>Tunai</strong>, <strong>Transfer/QRIS</strong>, <strong>Kartu Debit</strong>, atau <strong>Bon (Tempo)</strong>.` with `Lalu pilih metode: <strong>Tunai</strong>, <strong>Transfer</strong>, <strong>QRIS</strong>, atau <strong>Multi-Bayar</strong> (gabungan). Nota harus lunas saat itu juga.`
- delete the "Booking Ban Inden & DP" feature card (and the blank line above it):

```tsx
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 font-bold text-slate-800">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>Fitur "Booking Ban Inden & DP"</span>
                    </div>
                    <p className="text-slate-600 text-[11px]">
                      Jika pelanggan mencari ban ukuran khusus yang belum ready di toko, buatkan pesanan inden via tombol <strong>"Booking"</strong>. Terima uang muka (DP). Saat ban pesanan tiba dari distributor, buka riwayat booking dan ubah menjadi transaksi selesai.
                    </p>
                  </div>
```

- replace `          {/* TAB 7: BON & HUTANG TEMPO */}` with `          {/* TAB 7: HUTANG TEMPO SUPPLIER */}`
- replace `Menu Buku Besar: Piutang Bon & Hutang Distributor` with `Menu Buku Besar: Hutang Distributor`
- replace `Mengawasi pelanggan yang belum melunasi pembayaran (Bon) dan jadwal pembayaran jatuh tempo ke distributor ban.` with `Mengawasi jadwal pembayaran jatuh tempo ke distributor ban. Penjualan ke pelanggan selalu lunas saat checkout.`
- delete the "Piutang Bon" card: every line from `                {/* Piutang Bon */}` down to and including its closing `                </div>` (directly above the blank line and `                {/* Hutang Distributor */}`), plus that blank line
- replace `Jika ada pelanggan yang membayar lewat QRIS, transfer bank, atau membeli dengan sistem Bon (tempo), uangnya masuk ke rekening atau menjadi piutang, tetapi labanya sudah tercatat secara akuntansi.` with `Jika pelanggan membayar lewat QRIS atau transfer bank, uangnya masuk ke rekening bank, tetapi labanya sudah tercatat secara akuntansi.`

- [ ] **Step 2: Other screen texts**

- `src/shared/components/HeaderNavbar.tsx`: replace `      breadcrumb: ['Akuntansi SAK EMKM', 'Buku Besar, Neraca Saldo & BON'],` with `      breadcrumb: ['Akuntansi SAK EMKM', 'Buku Besar, Neraca Saldo & Hutang'],`
- `src/modules/accounting/components/CashFlowStatementTab.tsx`: replace `        <Row indent label="Penerimaan dari pelanggan (penjualan, pelunasan piutang, DP)" value={cashFlow.operating.customers} />` with `        <Row indent label="Penerimaan dari pelanggan (penjualan)" value={cashFlow.operating.customers} />` (historic BON/DP entries still land in this bucket, see spec "Accounting impact")
- `src/modules/accounting/components/ManualJournalModal.tsx`: replace `Nomor jurnal & referensi MEMO dibuat server. Akun piutang, persediaan, hutang, dan DP tidak tersedia.` with `Nomor jurnal & referensi MEMO dibuat server. Akun persediaan, hutang, dan akun nonaktif tidak tersedia.`
- `src/modules/accounting/components/OpeningBalanceModal.tsx`: replace `Diisi sekali saat mulai memakai sistem. Piutang, persediaan, hutang, dan uang muka DP tidak diisi di sini karena nilainya berasal` with `Diisi sekali saat mulai memakai sistem. Persediaan dan hutang tidak diisi di sini karena nilainya berasal`

- [ ] **Step 3: Playwright audit scripts**

In `tests/e2e/test_pos_ui_deep_audit.mjs`:
- delete the whole "AUDIT 9" section: every line from the `    // ----------------------------------------------------` directly above `    // AUDIT 9: Booking DP Modal & Drawer` down to and including the `    await page.waitForTimeout(400);` directly below `    if (await regModeBtn.isVisible()) await regModeBtn.click();`, plus the blank line after it (the next line is then the banner of `    // AUDIT 10: Modal Checkout Multi-Metode (CheckoutModal)`)
- replace `    console.log('13. Mengaudit Modal Checkout Multi-Metode & Faktur BON...');` with `    console.log('13. Mengaudit Modal Checkout Multi-Metode...');`
- delete the "D. Mode Faktur BON" block: every line from `    // D. Mode Faktur BON (Piutang Usaha) & Verifikasi Due Date Selector` down to and including the `    }` that closes `if (await bonTagBtn.isVisible()) {`, plus the blank line after it
- replace

```js
    // Kembalikan ke Reguler & Tunai untuk menyelesaikan transaksi uji coba
    const regTagBtn = page.locator('button:has-text("Faktur Reguler (Lunas)")').first();
    if (await regTagBtn.isVisible()) await regTagBtn.click();
    await page.waitForTimeout(300);
    const cashTabBtn = page.locator('button:has-text("Tunai")').first();
```

with

```js
    // Kembali ke Tunai untuk menyelesaikan transaksi uji coba
    const cashTabBtn = page.locator('button:has-text("Tunai")').first();
```

In `tests/e2e/test_expenses_ledger_ui_audit.mjs`:
- delete the whole "AUDIT 5.7" section: every line from the `    // ----------------------------------------------------` directly above `    // AUDIT 5.7: Sub-Tab 5 - Pembantu Piutang / AR (receivables)` down to and including the `    }` that closes `if (await tabReceivables.isVisible()) {`, plus the blank line after it
- replace

```js
    // AUDIT 5.8: Sub-Tab 6 - Ikhtisar Eksekutif (reports)
    // ----------------------------------------------------
    console.log('16. Mengaudit Sub-Tab 6: Ikhtisar Eksekutif...');
    const tabReports = page.locator('button:has-text("6. Ikhtisar Eksekutif")').first();
```

with

```js
    // AUDIT 5.7: Sub-Tab 5 - Laporan Keuangan (reports)
    // ----------------------------------------------------
    console.log('15. Mengaudit Sub-Tab 5: Laporan Keuangan...');
    const tabReports = page.locator('button:has-text("5. Laporan Keuangan")').first();
```

In `tests/e2e/test_dashboard_auth_ui_audit.mjs` replace `'Distribusi metode bayar (Tunai, Transfer, QRIS, BON), omzet ban vs jasa, dan riwayat transaksi tampil.'` with `'Distribusi metode bayar (Tunai, Transfer, QRIS), omzet ban vs jasa, dan riwayat transaksi tampil.'`.

In `tests/e2e/test_financials_receipt_settings_global_audit.mjs` replace `'Pengaturan QRIS dinamis, rekening bank transfer toko, dan opsi debit EDC tampil.'` with `'Pengaturan QRIS dinamis dan rekening bank transfer toko tampil.'`, and `'Panel notifikasi peringatan stok menipis dan hutang/piutang tempo tampil.'` with `'Panel notifikasi peringatan stok menipis dan hutang tempo supplier tampil.'`.

- [ ] **Step 4: Syntax-check the edited scripts**

Run: `for f in tests/e2e/test_pos_ui_deep_audit.mjs tests/e2e/test_expenses_ledger_ui_audit.mjs tests/e2e/test_dashboard_auth_ui_audit.mjs tests/e2e/test_financials_receipt_settings_global_audit.mjs; do node --check "$f" || echo "SYNTAX ERROR: $f"; done`
Expected: no output. (Running the audits needs a live app and is not part of this plan.)

- [ ] **Step 5: Whole-frontend check**

Run:

```bash
grep -rniE "booking|piutang|\bbon\b|\bedc\b|surcharge|uang muka|inden\b|kartu kredit|kartu debit|HUTANG_BON|dp_applied" src tests/e2e --include=*.ts --include=*.tsx --include=*.mjs --exclude-dir=__tests__
```

Expected: no output. (`\bbon\b` does not match `BONGKAR_PASANG`, `inden\b` does not match `indent`, and `\bedc\b` does not match the `edc_settings` key stripped in App.tsx.)

- [ ] **Step 6: Run the gate**

Run: `npm run lint && npm test`
Expected: no type errors; all Vitest files pass.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/WireframeGuideModal.tsx \
        src/shared/components/HeaderNavbar.tsx \
        src/modules/accounting/components/CashFlowStatementTab.tsx \
        src/modules/accounting/components/ManualJournalModal.tsx \
        src/modules/accounting/components/OpeningBalanceModal.tsx \
        tests/e2e/test_pos_ui_deep_audit.mjs \
        tests/e2e/test_expenses_ledger_ui_audit.mjs \
        tests/e2e/test_dashboard_auth_ui_audit.mjs \
        tests/e2e/test_financials_receipt_settings_global_audit.mjs
git commit -m "$(cat <<'EOF'
refactor(ui): remove dp, bon and edc from help texts and e2e audits

The user guide, breadcrumbs and accounting hints no longer describe
credit sales, customer down payments or card terminals, and the manual
Playwright audits stop looking for the removed screens.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

# Part D — Docs

### Task D1: Update the agent docs, the handoff and the roadmap

**Files:**
- Modify (full replacement): `docs/ai/domain-pos.md`
- Modify: `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-accounting.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`

**Interfaces:**
- Consumes: the final state after B1–B3 and F1–F3 (endpoints, `PosAccounts::CHECKOUT_METHODS`, 13 permission keys, inactive accounts 1-1002/2-1004/4-2000, ledger tabs `journals | ledger | trial-balance | payables | reports`, `CheckoutModal` and `posService` no longer use `toISOString()`, `BookingDpModal`/`AccountsReceivableTab` deleted).
- Produces: docs only. Out of scope (stale/historical, see File Map): `README.md`, `docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md`, `docs/superpowers/specs/2026-09-24-pos-server-checkout-design.md`.

- [ ] **Step 1: Rewrite the POS domain doc**

Replace the whole content of `docs/ai/domain-pos.md` with:

```markdown
# Domain: POS, payments, void, QRIS

Server-authoritative since stage 2. Design: `docs/superpowers/specs/2026-09-24-pos-server-checkout-design.md`.
Booking DP (inden), BON credit sales and EDC card payments were removed on 2026-09-30
(`docs/superpowers/specs/2026-09-30-remove-dp-bon-edc-design.md`).
Backend code: `backend/app/Services/Pos/*`, `Services/Payment/MidtransQrisService.php`. Frontend code:
`src/modules/pos/`, `src/modules/receipt/`, `src/services/api/posApi.ts`, `posMappers.ts`, `paymentApi.ts`.

Every sale is paid in full at checkout with Tunai, Transfer (`TRANSFER` / `TRANSFER_BCA`) or QRIS, alone or split.
There are no credit sales, no customer down payments and no card-terminal payments.

## Checkout (`POST /pos/checkout`, permission `pos`)

**Request** (`PosCheckoutRequest`):
- Customer and vehicle fields, all optional.
- `items[]`, each with `type` (PRODUCT/SERVICE), `product_id` / `service_id`, `name`, `quantity` (a whole number of
  at least 1), `unit_price`, `discount_per_item`, `is_manual`, `cost_price`.
- `discount_amount` (a discount on the whole receipt).
- `payments[]`, each with `method`, `amount`, `tendered`, `fee_percentage` (0–10), `provider_name`, `reference`.
- `bon` and `booking_id` are `prohibited`: an old client that still sends them gets 422 with an Indonesian message
  instead of a silently different sale.

Payment methods (`PosAccounts::CHECKOUT_METHODS`): `TUNAI`, `TRANSFER`, `TRANSFER_BCA`, `QRIS`. Any other method,
including the removed card-terminal methods, fails validation on `payments.N.method` (422).

**Server flow** (`CheckoutService::checkout`, one transaction):
1. `CartLines::build`:
   - Catalogue products are locked and must be active. Their summed quantity must not exceed
     `products.product_quantity`; otherwise the server returns 422 "Stok X tidak cukup".
   - The item name is replaced with the catalogue name.
   - Manual lines (`is_manual`) skip the stock check.
   - Per line: `gross = qty × unit_price`, `net = gross − qty × discount_per_item`.
2. Totals:
   - `subtotal = Σnet`
   - `grand = subtotal − discount_amount`. There is **no tax**: the shop is non-PKP and charges no PPN.
     A `tax_rate` sent by an old client is ignored (`test_sale_never_carries_ppn`).
3. Payments:
   - Σ`amount` must equal `grand` within 0.001.
   - Cash: `tendered ≥ amount`, change is calculated per row, and the fee is forced to 0.
   - Transfer and QRIS: `fee = amount × pct`, `net_received = amount − fee`. In practice only QRIS carries a fee
     (the MDR, expensed to 6-1009).
   - QRIS with a `reference`: Midtrans status must be `settlement` or `capture`.
4. The sale is saved:
   - Number: `OB3-INV-YYYYMM-####` via `DocumentNumber`.
   - `payment_method`: the single method used, or `SPLIT` (also used for a Rp 0 sale with no payment rows).
   - `status`: `LUNAS`.
5. Lines are saved. Each catalogue product line calls `FifoCostingService::allocateFifo`, which writes
   `sale_batch_allocations` and a KELUAR/SALE stock movement and sets line HPP from FIFO cost.
6. `SalePayment` rows are saved and the journal is posted (see [domain-accounting.md](domain-accounting.md#posting-rules)).

**Response:** `Sale::toReceiptArray()`, which includes `journals[]`. The frontend maps it with `mapSaleToTransaction`.
The legacy columns `sales.booking_id`, `dp_applied`, `due_date`, `edc_bank`, `edc_type`, `surcharge_amount` and
`sale_payments.edc_bank`, `edc_type`, `surcharge_amount` stay in the tables for history but are neither written nor
returned. Sale statuses produced: `LUNAS` and `VOID`.

## Void (`POST /pos/transactions/{id}/void`, permission `sale_void`, OWNER-only by default)
`SaleVoidService`:
- Refused if the sale is already VOID.
- Restores stock: every `sale_batch_allocations` row goes back to its batch, `product_quantity` goes back up, and a
  MASUK/SALE_VOID movement is written.
- Posts `POS_SALE_VOID`, a mirror of the original entry dated **today**.
- The sale is marked `VOID` with `voided_at`, `voided_by`, and `void_reason` (at least 5 characters).
- No refund is sent to Midtrans or the bank.
- A historic credit or DP-converted sale (only in a database that was not reset) is mirrored like any other sale;
  the void does not touch `receivable_payments` or `sales_bookings`.

## QRIS (Midtrans)
- Config in `backend/config/midtrans.php` (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`).
  Sandbox is the default, and a demo key is the fallback.
- `POST /payment/qris/charge` calls Midtrans `/v2/charge` (`payment_type: qris`). **If Midtrans fails, it silently
  returns a fake EMV QR string with `is_fallback: true`.**
- `GET /payment/qris/status/{orderId}` checks the cache key `midtrans_sim_{orderId}` first, then Midtrans. Any error
  counts as `pending`.
- `POST /payment/qris/simulate/{orderId}` writes `settlement` into that cache. It is a dev helper but is **not
  environment-gated**.
- The webhook (`POST /payment/midtrans/webhook`, public) checks
  `sha512(order_id.status_code.gross_amount.server_key)` with `hash_equals`. On settlement or capture it only writes
  the cache; nothing is persisted.
- Frontend: `CheckoutModal` generates `POS-{8 digits}`, and `QrisDynamicModal` charges and then polls every 2.5 s.
  The order id is sent as the payment `reference`.

## Fees and payment settings
- The backend has `payment_provider_settings` (bank and QRIS) with CRUD endpoints under `/settings/payment-providers`,
  plus `GET /pos/payment-options` (`bank_providers`, `qris_providers`). The `edc_settings` table is kept for history
  but unused; its endpoints were removed.
- **The frontend does not use them.** `CheckoutModal` reads bank and QRIS providers from localStorage
  `ob3_store_settings`, falling back to `INITIAL_BANK_PROVIDERS` / `INITIAL_QRIS_PROVIDERS` in `mockData.ts`. It
  computes the fee % (including the QRIS threshold logic) and sends `fee_percentage`, and **the server trusts it**.
  Moving this to the server is listed as future work in the POS spec. `App.tsx` drops the legacy `edc_settings` and
  `coa_receivable_account` properties when it loads the saved settings.

## Still client-side in POS
- Cart (`ob3_cart`) and on-screen totals (`calculateCartTotals`).
- Parked orders (`ob3_parked_orders`).
- Cash drawer balance (`ob3_cash_drawer`), adjusted after each sale by `cashPortion(sale)`.
- Printing a cart or parked order before checkout builds a temporary receipt with a **random** `OB3-INV-…` number
  that is never saved.

## Known issues (verified 2026-09-27, still open)
1. `unit_price` and `fee_percentage` come from the client. The server checks product existence and stock, not prices.
2. QRIS can be recorded as paid without real payment. Any `pos` user can call `/simulate`, and a QRIS payment without a
   `reference` (static QRIS, or QRIS inside a split payment) is not verified. Checkout does not compare the Midtrans
   amount with the payment amount.
3. The stock check uses `product_quantity`, not batches. If batches run short, FIFO costs the remainder at
   `product_cost` with no allocation row, and a later void restores quantity but not those batches.
4. Manual-line cost is counted in `total_hpp` and `total_profit` but is not journaled. `total_profit` also ignores MDR fees.
5. There is no period-lock check on void.
```

- [ ] **Step 2: Accounting domain doc**

In `docs/ai/domain-accounting.md`:
- directly after the line `PPN on supplier invoices belongs in the batch cost (1-2000), as in the reference system ProjectOmahBan.` insert:

```markdown

Migration `2026_09_30_000001_deactivate_dp_bon_edc_accounts.php` sets 1-1002, 2-1004 and 4-2000 `is_active = false`
(inserting them inactive if missing): booking DP, BON credit sales and the EDC surcharge were removed from the POS on
2026-09-30. They stay in the COA because historic journals reference them; `ManualJournalRequest` rejects inactive
accounts and the manual-journal picker hides them. 6-1009 stays active for the QRIS MDR.
```

- replace the four COA rows:

```markdown
| 1-1002 | Piutang Dagang (AR, from BON sales) | ASSET | D |
```
```markdown
| 2-1004 | Uang Muka Pelanggan (DP Booking) | LIABILITY | C |
```
```markdown
| 4-2000 | Pendapatan Surcharge EDC | REVENUE | C |
```
```markdown
| 6-1009 | Beban MDR QRIS & EDC | EXPENSE | D |
```

with (same positions):

```markdown
| 1-1002 | Piutang Dagang (AR). **Inactive** since 2026-09-30 (no credit sales); historic entries only | ASSET | D |
```
```markdown
| 2-1004 | Uang Muka Pelanggan (DP Booking). **Inactive** since 2026-09-30 (no booking DP); historic entries only | LIABILITY | C |
```
```markdown
| 4-2000 | Pendapatan Surcharge EDC. **Inactive** since 2026-09-30 (no card surcharge); historic entries only | REVENUE | C |
```
```markdown
| 6-1009 | Beban MDR QRIS & EDC (name kept; only the QRIS MDR posts here now) | EXPENSE | D |
```

- replace

```markdown
- Journals are never edited or deleted. Corrections are reversing entries (`POS_SALE_VOID`, `VOID_EXPENSE`,
  `BOOKING_DP_REFUND`).
```

with

```markdown
- Journals are never edited or deleted. Corrections are reversing entries (`POS_SALE_VOID`, `VOID_EXPENSE`,
  `MANUAL_REVERSAL`).
```

- replace

```markdown
`POS_SALE`, `POS_SALE_VOID`, `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`, `PURCHASE`, `DEBT_PAYMENT`,
`EXPENSE`, `VOID_EXPENSE`, `MANUAL_ADJUSTMENT`, `OPENING_BALANCE`, `STOCK_OPNAME`, `STOCK_IMPORT`,
`STOCK_RECONCILIATION`, `STOCK_COST_CORRECTION`, `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`,
`ACCOUNT_OPENING`. Reuse one of these where it fits. If you add a new value, list it here.
```

with

```markdown
`POS_SALE`, `POS_SALE_VOID`, `PURCHASE`, `DEBT_PAYMENT`,
`EXPENSE`, `VOID_EXPENSE`, `MANUAL_ADJUSTMENT`, `OPENING_BALANCE`, `STOCK_OPNAME`, `STOCK_IMPORT`,
`STOCK_RECONCILIATION`, `STOCK_COST_CORRECTION`, `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`,
`ACCOUNT_OPENING`. Reuse one of these where it fits. If you add a new value, list it here.
Historic only (no longer produced since 2026-09-30): `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`. The
journal screen has no filter group for them; they show under "Semua".
```

- replace the POS sale row and delete the three rows below the POS void row. Replace:

```markdown
| POS sale | cash/bank per payment at `net_received`; 6-1009 fees; 2-1004 DP applied; 1-1002 if BON; 4-9000 discounts; 5-1000 FIFO cost | 4-1000 goods (gross); 4-1001 services (gross); 4-2000 EDC surcharge; 1-2000 FIFO cost | `Pos/CheckoutService::postJournal` |
| POS void | mirror of the sale entry, dated today | | `Pos/SaleVoidService` |
| Booking DP received | 1-1000 or 1-1001 | 2-1004 | `Pos/BookingService` |
| Booking cancelled (refund) | 2-1004 | 1-1000 or 1-1001 | `Pos/BookingService` |
| BON settlement | 1-1000 or 1-1001 | 1-1002 | `Pos/ReceivableService` |
```

with

```markdown
| POS sale | cash/bank per payment at `net_received`; 6-1009 QRIS MDR; 4-9000 discounts; 5-1000 FIFO cost | 4-1000 goods (gross); 4-1001 services (gross); 1-2000 FIFO cost | `Pos/CheckoutService::postJournal` |
| POS void | mirror of the sale entry, dated today | | `Pos/SaleVoidService` |
```

- replace

```markdown
Account routing for payment methods lives in `Pos/PosAccounts::forMethod`: TUNAI goes to 1-1000; every other method,
including TRANSFER, QRIS, and EDC, goes to 1-1001.
```

with

```markdown
Account routing for payment methods lives in `Pos/PosAccounts::forMethod`: TUNAI goes to 1-1000; TRANSFER,
TRANSFER_BCA and QRIS go to 1-1001.
```

- in the Reports section, directly after the `CashFlowReport::build($from, $to)` bullet (its last line ends with `instead, so reconciliation still holds.`) and before the `ExpenseService` bullet, insert:

```markdown
- Inactive accounts (1-1002, 2-1004, 4-2000) still appear in every report, as zero rows or with their historic
  balances: no report query filters on `is_active` (only `ManualJournalRequest` does), so prior periods stay
  reproducible and the balance sheet still balances. `CashFlowReport::bucket()` keeps 1-1002 and 2-1004 in the
  customers bucket for historic entries.
```

- in "Known issues" replace

```markdown
- `GR-`, `OB3-INV-`, `BK-`, and `OPN-` document numbers still use the month of `now()` rather than the document
```

with

```markdown
- `GR-`, `OB3-INV-`, and `OPN-` document numbers still use the month of `now()` rather than the document
```

- [ ] **Step 3: API reference, data model, architecture**

In `docs/ai/api-reference.md`, "POS and payments" table, replace:

```markdown
| GET | `/pos/payment-options` | `pos` |
```

with

```markdown
| GET | `/pos/payment-options` (`bank_providers`, `qris_providers`) | `pos` |
```

delete these four rows:

```markdown
| GET | `/bookings` | `booking_dp`, `pos` |
| POST | `/bookings`, `/bookings/{id}/cancel` | `booking_dp` |
| GET | `/receivables` | `bon_receivable`, `accounting_hub` |
| POST | `/receivables/{saleId}/payments` | `bon_receivable`, `accounting_hub` |
```

and replace:

```markdown
| GET | `/settings/payment-providers`, `/settings/edc` | `role_settings`, `pos` |
| POST / PUT `{id}` / DELETE `{id}` | `/settings/payment-providers`, `/settings/edc` | `role_settings` |
```

with

```markdown
| GET | `/settings/payment-providers` | `role_settings`, `pos` |
| POST / PUT `{id}` / DELETE `{id}` | `/settings/payment-providers` | `role_settings` |

The booking DP, BON receivable and EDC-settings endpoints were removed on 2026-09-30 and now return 404. Checkout
rejects `bon`, `booking_id` and card-terminal methods with 422 (see [domain-pos.md](domain-pos.md)).
```

In `docs/ai/data-model.md`, "Sales (POS)" table:
- in the `sales` row replace the substring

```markdown
`paid_amount`, `change_amount`, `dp_applied`, `booking_id`, fee/surcharge/net fields, `payment_method` (method, `SPLIT`, or `BON`), `status` (LUNAS/PENDING/VOID), `due_date`, `voided_at`,
```

with

```markdown
`paid_amount`, `change_amount`, fee/net fields, `payment_method` (method or `SPLIT`), `status` (LUNAS/VOID), `voided_at`,
```

and the same row's last cell

```markdown
| `Sale::toReceiptArray()` is the API shape |
```

with

```markdown
| `Sale::toReceiptArray()` is the API shape. Legacy columns `booking_id`, `dp_applied`, `due_date`, `edc_bank`, `edc_type`, `surcharge_amount` are unused since 2026-09-30 (kept for history; old rows may say `BON`/`PENDING`) |
```

- in the `sale_payments` row replace the substring

```markdown
`fee_amount`, `surcharge_amount`, `net_received`, `provider_name`, `edc_bank`, `edc_type`, `reference` | one row per split payment |
```

with

```markdown
`fee_amount`, `net_received`, `provider_name`, `reference` | one row per split payment. Legacy `surcharge_amount`, `edc_bank`, `edc_type` unused since 2026-09-30 |
```

- replace the substring `| settlements of BON (credit) sales |` (end of the `receivable_payments` row) with `| settlements of BON (credit) sales. **Unused since 2026-09-30** (BON removed); kept for history |`
- replace the substring `| customer pre-orders with a down payment |` (end of the `sales_bookings` row) with `| customer pre-orders with a down payment. **Unused since 2026-09-30** (booking DP removed); kept for history |`
- in the "Payment settings" table replace

```markdown
| `edc_settings` | `bank_name`, `payment_type` (Debit/Credit), `fee_percentage`, `charge_to_customer`, `is_active` |
```

with

```markdown
| `edc_settings` | `bank_name`, `payment_type` (Debit/Credit), `fee_percentage`, `charge_to_customer`, `is_active`. **Unused since 2026-09-30** (EDC removed; endpoints deleted) |
```

In `docs/ai/architecture.md` replace

```markdown
  Ledger: `journals | ledger | trial-balance | payables | receivables | reports`).
```

with

```markdown
  Ledger: `journals | ledger | trial-balance | payables | reports`).
```

replace

```markdown
- After login, `loadPosData` fetches products, services, categories, suppliers, sales, receivables, bookings, and
  purchases in parallel, filtered by permission. Each call does `.catch(() => null)`, so failures are silent.
```

with

```markdown
- After login, `loadPosData` fetches products, services, categories, suppliers, sales, and
  purchases in parallel, filtered by permission. Each call does `.catch(() => null)`, so failures are silent.
```

and replace

```markdown
`ob3_auth_token`, `ob3_cash_drawer`, `ob3_store_settings` (includes bank/QRIS/EDC fee providers), `ob3_cart`,
```

with

```markdown
`ob3_auth_token`, `ob3_cash_drawer`, `ob3_store_settings` (includes bank/QRIS fee providers; legacy `edc_settings`
and `coa_receivable_account` properties are dropped on load), `ob3_cart`,
```

- [ ] **Step 4: Glossary and gotchas**

In `docs/ai/workflow-and-gotchas.md`, in the glossary replace these rows:

```markdown
| Tunai / transfer / EDC / QRIS | cash / bank transfer / card terminal / Indonesian QR payment |
| MDR | merchant discount rate, the fee charged by QRIS or EDC (6-1009) |
| Surcharge | card fee passed on to the customer (4-2000) |
| BON | sale on credit, creating a receivable (piutang, 1-1002) |
```

with

```markdown
| Tunai / transfer / QRIS | cash / bank transfer / Indonesian QR payment, the only POS payment methods |
| MDR | merchant discount rate, the fee charged by QRIS (6-1009) |
| EDC / surcharge | card terminal / card fee passed on to the customer (4-2000). Removed from the POS on 2026-09-30; historic entries only |
| BON | sale on credit, creating a receivable (piutang, 1-1002). Removed from the POS on 2026-09-30; historic entries only |
```

and replace

```markdown
| DP / uang muka / booking inden | down payment / customer deposit (2-1004) / pre-order |
```

with

```markdown
| DP / uang muka / booking inden | down payment / customer deposit (2-1004) / pre-order. Removed from the POS on 2026-09-30; historic entries only |
```

In the "Mock data" gotcha replace

```markdown
  when the permissions request fails), `INITIAL_STORE_SETTINGS`, the payment provider/EDC defaults used by
  `CheckoutModal` and `BookingDpModal`, and category seeds for the legacy local category services. Its product,
  transaction, booking, supplier, stock-mutation and trend arrays are legacy; only tests and dead imports use them.
```

with

```markdown
  when the permissions request fails), `INITIAL_STORE_SETTINGS`, the bank/QRIS provider defaults used by
  `CheckoutModal`, and category seeds for the legacy local category services. Its product,
  transaction, supplier, stock-mutation and trend arrays are legacy; only tests and dead imports use them.
```

In the "Known issue: `toISOString()` dates" gotcha replace

```markdown
  (sliced to a date or month), which yields the previous day between 00:00 and 07:00 WIB: `CheckoutModal`,
  `BookingDpModal`, `GoodsReceiptModal`, `PosScreen` (parked order numbers), `ThermalReceiptScreen`, `posService`, `inventoryService`,
  `ExecutiveDashboardScreen`, `StockMonthlyLedgerView` / `stockMonthlyLedgerService`, the export registry
  (`src/shared/export/registry.ts`), and the default payment dates in `PayDebtModal` and
  `AccountsReceivableTab`. Switch them to `localDate()` when touching those files.
```

with

```markdown
  (sliced to a date or month), which yields the previous day between 00:00 and 07:00 WIB:
  `GoodsReceiptModal`, `PosScreen` (parked order numbers), `ThermalReceiptScreen`, `inventoryService`,
  `ExecutiveDashboardScreen`, `StockMonthlyLedgerView` / `stockMonthlyLedgerService`, the export registry
  (`src/shared/export/registry.ts`), and the default payment date in `PayDebtModal`.
  Switch them to `localDate()` when touching those files.
```

- [ ] **Step 5: `AGENTS.md` and `backend/AGENTS.md`**

In `AGENTS.md` replace

```markdown
| POS checkout, void, sales history, BON receivables, booking DP, QRIS | Server | 2 (done) |
```

with

```markdown
| POS checkout (Tunai/Transfer/QRIS, split; every sale paid in full), void, sales history, QRIS | Server | 2 (done) |
```

replace

```markdown
2. **Account codes come from the COA.** 25 accounts, seeded by `AccountCoaSeeder` (+ migration
```

with

```markdown
2. **Account codes come from the COA.** 25 accounts (1-1002, 2-1004, 4-2000 inactive since 2026-09-30), seeded by `AccountCoaSeeder` (+ migration
```

and replace

```markdown
| [docs/ai/domain-pos.md](docs/ai/domain-pos.md) | checkout, payments, fees, BON, booking DP, void, QRIS |
```

with

```markdown
| [docs/ai/domain-pos.md](docs/ai/domain-pos.md) | checkout, payments, fees, void, QRIS |
```

In `backend/AGENTS.md` replace

```markdown
  Pos/                         CheckoutService, CartLines, PosAccounts, SaleVoidService, ReceivableService, BookingService
```

with

```markdown
  Pos/                         CheckoutService, CartLines, PosAccounts, SaleVoidService
```

- [ ] **Step 6: Handoff and roadmap**

In `docs/superpowers/plans/2026-09-30-accounting-handoff.md`:
- in the sub-project table replace the substring `Partial sales return, purchase return / goods-receipt cancel, bad-debt write-off, DP forfeit, FIFO shortfall fallback,` with `Partial sales return, purchase return / goods-receipt cancel, FIFO shortfall fallback,`
- directly below that table (after the row starting `| 6 | Payment hardening |`) insert:

```markdown

> 2026-09-30: booking DP, BON credit sales and EDC were removed from the POS
> (`docs/superpowers/specs/2026-09-30-remove-dp-bon-edc-design.md`), so bad-debt write-off and DP forfeit are no
> longer needed. Accounts 1-1002, 2-1004 and 4-2000 are inactive.
```

- replace

```markdown
  - F2 roles with `accounts_payable` but no `accounting_hub` see a payables/receivables-only ledger screen.
```

with

```markdown
  - F2 roles with `accounts_payable` but no `accounting_hub` see a sub-ledger-only ledger screen (payables only
    since the receivables tab was removed on 2026-09-30).
```

- replace

```markdown
- Older screens still use `toISOString()` for default dates (CheckoutModal, BookingDpModal, PayDebtModal,
  AccountsReceivableTab, posService, inventoryService, dashboard, export registry) — wrong day before 07:00 WIB.
```

with

```markdown
- Older screens still use `toISOString()` for default dates (PayDebtModal, inventoryService, dashboard, export
  registry) — wrong day before 07:00 WIB.
```

In `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` (audit findings: annotate, do not rewrite history):
- replace

```markdown
- 🟠 No partial sales return (only full void, refused once a BON has a payment); no purchase return / goods
```

with

```markdown
- 🟠 No partial sales return (only full void); no purchase return / goods
```

- replace

```markdown
- 🟠 No bad-debt write-off for 1-1002; booking DP cannot be forfeited to income; QRIS DP not verified, no MDR.
```

with

```markdown
- ~~🟠 No bad-debt write-off for 1-1002; booking DP cannot be forfeited to income; QRIS DP not verified, no MDR.~~
  Obsolete: BON and booking DP were removed on 2026-09-30 (`2026-09-30-remove-dp-bon-edc-design.md`).
```

- replace

```markdown
- 🟠 A real CALK (compliance statement, entity info, policies, breakdowns of receivables, inventory, fixed
```

with

```markdown
- 🟠 A real CALK (compliance statement, entity info, policies, breakdowns of inventory, fixed
```

- replace

```markdown
- 🟠 Dashboard: "today" falls back to the last 3 sales; BON sales excluded; expenses include VOID and all months;
```

with

```markdown
- 🟠 Dashboard: "today" falls back to the last 3 sales; expenses include VOID and all months;
```

- [ ] **Step 7: Check the docs**

Run:

```bash
grep -nE "BookingService|ReceivableService|/bookings|/receivables|settings/edc|EDC_DEBIT|EDC_CREDIT|term_days|booking_dp|bon_receivable|BookingDpModal|AccountsReceivableTab|reserveStock" AGENTS.md backend/AGENTS.md docs/ai/*.md docs/superpowers/plans/2026-09-30-accounting-handoff.md
git status --short
```

Expected: the grep prints nothing; `git status --short` lists exactly the ten doc files of this task as modified
(plus the user's untracked `docs/flowchart_local/`). There is no code change in this task, so there is no
`npm`/`composer` gate.

- [ ] **Step 8: Commit**

```bash
git add AGENTS.md \
        backend/AGENTS.md \
        docs/ai/domain-pos.md \
        docs/ai/domain-accounting.md \
        docs/ai/api-reference.md \
        docs/ai/data-model.md \
        docs/ai/architecture.md \
        docs/ai/workflow-and-gotchas.md \
        docs/superpowers/plans/2026-09-30-accounting-handoff.md \
        docs/superpowers/specs/2026-09-29-accounting-roadmap.md
git commit -m "$(cat <<'EOF'
docs(ai): describe the pos without dp, bon and edc

Agent docs, the stage 4 handoff and the roadmap now say every sale is
paid in full with Tunai, Transfer or QRIS, list the removed endpoints,
and mark 1-1002, 2-1004 and 4-2000 as inactive, historic-only accounts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

# Part M — Manual finish

### Task M1: Dev database reset and browser checklist — MANUAL, DESTRUCTIVE, USER ONLY

> **⚠️ MANUAL AND DESTRUCTIVE. Agents (including subagents executing this plan) must NOT run any command in this
> task.** Stop after Task D1 and hand this task to the user. `php artisan migrate:fresh` drops every table in the dev
> database `project-skripsi_ob` and re-creates it from the seeders: every sale, purchase, expense, journal, opening
> balance and user change made in the dev app is lost. The testing database is not touched here (it was migrated in
> Task B3). Spec decision D3: the reset is optional; skipping it keeps the old test data (1 booking, 1 BON sale, 1
> receivable payment), with the void risk described in the spec's "Risks".

**Files:** none in the repository. Nothing is committed.

**Interfaces:**
- Consumes: all of B1–B3, F1–F3 and D1 committed; `cd backend && composer test` and `npm run lint && npm test`
  passing; the two `2026_09_30_*` migrations.
- Produces: a dev database seeded from scratch (accounts 1-1002, 2-1004, 4-2000 inactive; no `booking_dp` /
  `bon_receivable` rows), the account opening balances re-entered, and a signed-off browser checklist.

- [ ] **Step 1 (user): Write down the current account opening balances**

In the running app (OWNER): Buku Besar → 1. Jurnal Umum → filter "Penyesuaian" → open the **SALDO AWAL**
(`ACCOUNT_OPENING`) entry. Note its date and the amounts for 1-1000, 1-1001, 1-3000, 1-3999 and 3-2000.
(Alternatively `GET /api/v1/accounting/opening-balance` with an OWNER token.)

- [ ] **Step 2 (user, optional): Back up the dev database outside the repository**

Git Bash: `mysqldump -u root project-skripsi_ob > "$HOME/ob3-before-dp-bon-edc-reset.sql"`

- [ ] **Step 3 (user): Reset the dev database — DESTRUCTIVE**

Requires `SEED_DEFAULT_PASSWORD` in `backend/.env`.

```bash
cd backend
php artisan migrate:fresh --seed
php artisan inventory:opening-balance
```

**If you choose not to reset** (keeping the old data), run only the non-destructive `cd backend && php artisan migrate`
instead, which applies the two `2026_09_30_*` migrations; do not void the old BON or DP-converted sale afterwards
(spec "Risks").

- [ ] **Step 4 (user): Verify the database state**

```bash
cd backend
php artisan tinker --execute="dump(App\Models\Account::whereIn('account_code', ['1-1002','2-1004','4-2000','6-1009'])->pluck('is_active', 'account_code')->all()); dump(App\Models\RolePermission::whereIn('permission_key', ['booking_dp','bon_receivable'])->count());"
php artisan route:list --path=api | grep -E "bookings|receivables|settings/edc"
```

Expected: `1-1002`, `2-1004`, `4-2000` false and `6-1009` true; count `0`; the `route:list | grep` prints nothing.

- [ ] **Step 5 (user): Re-enter the account opening balances**

Start the app (`npm run dev:all`), log in as OWNER, open Buku Besar → **Saldo Awal**, and enter the date and amounts
noted in Step 1.

- [ ] **Step 6 (user): Browser checklist**

POS (OWNER, then KASIR):
- [ ] Header has "Antrian Tahan", "Kas Laci" and "Struk" but no "Booking DP" button.
- [ ] Cart footer has no Reguler/BON/Booking DP switcher; only "Pratinjau & Cetak Struk" and "Proses Pesanan (Bayar)".
- [ ] Checkout modal: no "Faktur BON" option, no due date; single-payment methods Tunai, Transfer, QRIS only; the
      QRIS manual option reads "Manual (QRIS Statis)"; Multi-Bayar rows offer Tunai, Transfer, QRIS only.
- [ ] Complete a Tunai sale with change, a Transfer BCA sale, a static QRIS sale above Rp 500.000 (MDR line shown)
      and a split Tunai + QRIS sale. Each ends in "Pembayaran Berhasil!" with a LUNAS badge; the Kas Laci chip rises
      only by the cash part.
- [ ] Dynamic QRIS (Midtrans sandbox, or `/payment/qris/simulate/{orderId}`) completes a sale.
- [ ] Pratinjau struk before paying shows "*** NOTA PENJUALAN RESMI ***".

Receipts and void:
- [ ] Riwayat Struk status chips are Semua / LUNAS / VOID; receipts show no surcharge or EDC bank.
- [ ] As OWNER, void one of the new sales: status VOID, stock restored, a `POS_SALE_VOID` journal appears.

Accounting:
- [ ] Buku Besar tabs: 1. Jurnal Umum, 2. Buku Besar, 3. Neraca Saldo, 4. Pembantu Hutang, 5. Laporan Keuangan
      (no "Pembantu Piutang").
- [ ] Jurnal Umum filter groups: no "Piutang"; the sale group is "Penjualan". The split sale's journal has Dr 1-1000,
      Dr 1-1001, Dr 6-1009, Cr 4-1000 (or 4-1001), Dr 5-1000 / Cr 1-2000, and no 1-1002, 2-1004 or 4-2000 line.
- [ ] Neraca Saldo is balanced and lists 1-1002, 2-1004, 4-2000 as zero rows.
- [ ] Jurnal Penyesuaian account picker does not offer 1-1002, 2-1004 or 4-2000.
- [ ] Laporan Keuangan: balance sheet balanced; cash flow reconciled.
- [ ] Export menus nowhere offer "Buku Pembantu Piutang".

Settings and shell:
- [ ] Pengaturan → Metode Pembayaran sub-tabs: Transfer Bank, Provider QRIS, Rekening Utama Nota (no EDC).
- [ ] Pengaturan → COA preferences have no "Piutang Pelanggan (BON)" field.
- [ ] Hak Akses: no "Booking Inden & Penerimaan DP" or "Buku Pembantu Piutang / BON Konsumen" rows; saving works.
- [ ] Notification bell lists only stock and supplier-debt items.
- [ ] DevTools → Application → Local Storage → `ob3_store_settings` has no `edc_settings` or
      `coa_receivable_account` after a reload.
- [ ] Buku panduan (help) tab 7 is "Hutang Tempo Supplier"; no mention of Bon, booking inden or kartu debit/kredit.
- [ ] KASIR sees only the POS and Struk screens and can complete a Tunai sale.

- [ ] **Step 7 (user): Report**

If every item passes, the plan is done. If an item fails, note the screen and step and open a fix task; do not
edit data in the database by hand.
