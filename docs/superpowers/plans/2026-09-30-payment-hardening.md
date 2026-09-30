# Payment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dynamic QRIS payment backs one sale at the amount Midtrans settled, the demo helpers only work when explicitly enabled, no Midtrans key is baked into the code, and the fee and provider of every payment row come from the server's `payment_provider_settings`.

**Architecture:** Backend first. B1 removes the demo key and gates the simulation/fallback QR behind `midtrans.allow_simulation`. B2 persists every QRIS order and settlement (webhook, status call, simulation) with its amount in a new `qris_transactions` table and drops the cache. B3 makes checkout compute fee and provider name from a `provider_id`. B4 makes checkout claim a settled QRIS order once, at its settled amount. Frontend next: F1 wires the POS terminal to server providers and `provider_id`, F2 moves the settings tab to the provider CRUD endpoints. D1 updates the docs. No journal shape, account, reference type or permission changes.

**Tech Stack:** Laravel 13 / PHP 8.3 / PHPUnit 12 / MySQL 8 (Laragon); React 19 / TypeScript 5.8 / Vite 6 / Tailwind v4 / Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-payment-hardening-design.md`.

## Global Constraints

- Read `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md` and `docs/ai/domain-accounting.md` before starting.
- **Never stage, modify or revert the user's untracked `docs/flowchart_local/`, and never stage `docs/flowchart/*`** (the user has uncommitted changes there). Do not touch files outside this plan's File Map. Run `git status --short` before each commit: only the task's files may be staged. Stage files **by explicit path**; never `git add -A`, `git add .` or `git commit -a`.
- Execute tasks in order B1 → B2 → B3 → B4 → F1 → F2 → D1. Later tasks' edit anchors are written against the output of earlier tasks (B2 replaces files B1 edited; B4 replaces the `buildPayments` that B3 wrote; F2 edits `paymentApi.ts` as F1 left it).
- Commits go directly on `main`: Conventional Commits with a scope (`payment`, `pos`, `settings`, `docs`), in English, lowercase imperative subject, a short body explaining why, and the trailer line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- All user-facing text (UI, validation and error messages) is Indonesian.
- Journals are only written through `AccountingEngine::createEntry` (directly or via `JournalDraft`). Never insert `journal_entries`/`journal_items` by hand. (This plan changes no journal lines.)
- Business-rule violations throw `App\Exceptions\PosRuleException` (422, `{message}`). API envelope `{ "success": true, "message"?: "...", "data": ... }`.
- New backend test classes (and `MidtransQrisApiTest`, which gains it) use `Illuminate\Foundation\Testing\DatabaseTransactions`. Never name a test helper `post()` (it collides with Laravel's `TestCase::post()`).
- Laragon MySQL must be running for backend tests (`phpunit.xml` targets MySQL `project-skripsi_ob_testing`).
- After adding a migration, migrate the testing DB (Git Bash `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force`; PowerShell `cd backend; $env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`) **and**, because the migration in this plan is additive, also the dev DB: `cd backend && php artisan migrate --force`.
- Gates: backend tasks end with `cd backend && php artisan config:clear && php artisan test` passing (`composer test` is broken locally: the bundled composer.phar is too old for `@no_additional_args`); frontend tasks end with `npm run lint && npm test` passing (repo root). Backend baseline before this plan: 194 tests; frontend: 127.
- Tests that touch Midtrans set their own config (`config(['midtrans.server_key' => ..., 'midtrans.allow_simulation' => ...])`); never rely on `backend/.env`.
- Frontend business dates use `localDate()` from `src/services/accountingPeriod.ts`, never `toISOString()`, in any code you add.
- Secrets: never commit `backend/.env`. Only `backend/.env.example` gets the new (empty) Midtrans lines.
- Commands below use Git Bash syntax from the repo root `C:\laragon\www\Project_SkripsiOB` unless a `cd` is shown.

## File Map

Backend (create):
- `backend/database/migrations/2026_10_01_000001_create_qris_transactions_table.php` (B2)
- `backend/app/Models/QrisTransaction.php` (B2)

Backend (modify):
- `backend/config/midtrans.php` (B1, full replacement), `backend/.env.example` (B1)
- `backend/app/Services/Payment/MidtransQrisService.php` (B1 edits, B2 full replacement)
- `backend/app/Http/Controllers/Api/v1/PaymentApiController.php` (B1 edits, B2 full replacement)
- `backend/app/Http/Requests/PosCheckoutRequest.php` (B3)
- `backend/app/Services/Pos/CheckoutService.php` (B3, B4)
- `backend/tests/Feature/MidtransQrisApiTest.php` (B1 full replacement, B2 full replacement)
- `backend/tests/Feature/EndToEndParityReconciliationAndQrisTest.php` (B1)
- `backend/tests/Concerns/CreatesPosFixtures.php` (B3, B4)
- `backend/tests/Feature/PosCheckoutTest.php` (B3, B4), `backend/tests/Feature/PosVoidTest.php` (B3)

Frontend (modify):
- `src/services/api/paymentApi.ts` (F1 full replacement, F2 edit), `src/services/api/posMappers.ts` (F1)
- `src/shared/types/index.ts` (F1 `SplitPaymentLine`, F2 `StoreSettings`)
- `src/modules/pos/components/CheckoutModal.tsx` (F1), `src/modules/pos/components/QrisDynamicModal.tsx` (F1), `src/modules/pos/PosScreen.tsx` (F1)
- `src/modules/settings/components/PaymentMethodsTab.tsx` (F2), `src/shared/data/mockData.ts` (F2), `src/App.tsx` (F2)
- tests `src/services/__tests__/posMappers.test.ts` (F1), `src/modules/settings/__tests__/financialsSettingsAudit.test.ts` (F2)

Docs (modify, D1): `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`.

Not touched: routes (`backend/routes/api.php`), `PaymentProviderSetting` model and its controller, `SaleVoidService`, `PosAccounts`, COA, permissions, e2e scripts, `backend/.env` (user-owned; see D1 note).

---

# Part B — Backend

### Task B1: Drop the Midtrans demo key and gate the QRIS simulation

**Files:**
- Modify: `backend/config/midtrans.php` (full replacement), `backend/.env.example`, `backend/app/Services/Payment/MidtransQrisService.php`, `backend/app/Http/Controllers/Api/v1/PaymentApiController.php`
- Test: `backend/tests/Feature/MidtransQrisApiTest.php` (full replacement), `backend/tests/Feature/EndToEndParityReconciliationAndQrisTest.php`

**Interfaces:**
- Produces: config `midtrans.server_key` (string, default `''`), `midtrans.client_key` (default `''`), `midtrans.allow_simulation` (bool; `MIDTRANS_ALLOW_SIMULATION`, default false, always false when `MIDTRANS_IS_PRODUCTION`).
- Produces: `POST /payment/qris/charge` → `data.simulation_enabled` (bool); 422 when Midtrans fails and simulation is off.
- Produces: `POST /payment/qris/simulate/{orderId}` → 403 `{success:false, message}` unless `allow_simulation`.
- Produces: webhook → 403 when `midtrans.server_key` is empty.
- Produces: `MidtransQrisService::fallbackOrFail(string $orderId, int $grossAmount, string $reason): array` (protected).

- [ ] **Step 1: Write the failing tests**

Replace `backend/tests/Feature/MidtransQrisApiTest.php` with:

```php
<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MidtransQrisApiTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        // Kunci uji sendiri; simulasi mati kecuali tes menyalakannya (sama seperti default).
        config(['midtrans.server_key' => 'SB-Mid-server-phpunit', 'midtrans.allow_simulation' => false]);
    }

    private function fakeCharge(string $orderId, int $gross): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'status_message' => 'Success, QRIS transaction is created',
                'transaction_id' => 'mid-txn-'.$orderId,
                'order_id' => $orderId,
                'gross_amount' => $gross.'.00',
                'payment_type' => 'qris',
                'transaction_status' => 'pending',
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'actions' => [
                    ['name' => 'generate-qr-code', 'method' => 'GET', 'url' => 'https://api.sandbox.midtrans.com/v2/qris/x/qr-code'],
                ],
            ], 201),
        ]);
    }

    private function signed(array $payload, ?string $key = null): array
    {
        $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].($key ?? config('midtrans.server_key')));

        return $payload;
    }

    public function test_can_charge_qris_and_receive_qr_string(): void
    {
        $this->fakeCharge('POS-20260910-001', 350000);

        $this->postJson('/api/v1/payment/qris/charge', [
            'order_id' => 'POS-20260910-001',
            'gross_amount' => 350000,
            'customer_name' => 'Budi Santoso',
        ])->assertOk()->assertJson([
            'success' => true,
            'data' => [
                'order_id' => 'POS-20260910-001',
                'gross_amount' => 350000,
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'transaction_status' => 'pending',
                'simulation_enabled' => false,
            ],
        ]);
    }

    public function test_charge_without_server_key_fails_unless_simulation_is_enabled(): void
    {
        config(['midtrans.server_key' => '']);
        Http::fake();
        $body = ['order_id' => 'POS-NOKEY-'.uniqid(), 'gross_amount' => 100000];

        $this->postJson('/api/v1/payment/qris/charge', $body)->assertStatus(422)->assertJsonPath('success', false);

        config(['midtrans.allow_simulation' => true]);
        $this->postJson('/api/v1/payment/qris/charge', $body)->assertOk()
            ->assertJsonPath('data.is_fallback', true)
            ->assertJsonPath('data.simulation_enabled', true);

        Http::assertNothingSent();
    }

    public function test_midtrans_error_is_not_hidden_behind_a_fake_qr(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response(['status_code' => '401', 'status_message' => 'Unknown Merchant server_key/id'], 401),
        ]);

        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => 'POS-ERR-'.uniqid(), 'gross_amount' => 100000])
            ->assertStatus(422)
            ->assertJsonMissingPath('data.qr_string');
    }

    public function test_can_check_qris_status(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/POS-20260910-001/status' => Http::response([
                'status_code' => '200',
                'order_id' => 'POS-20260910-001',
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_status' => 'settlement',
                'settlement_time' => '2026-09-10 16:02:00',
            ], 200),
        ]);

        $this->getJson('/api/v1/payment/qris/status/POS-20260910-001')
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => 'POS-20260910-001', 'transaction_status' => 'settlement']]);
    }

    public function test_simulation_is_forbidden_unless_enabled(): void
    {
        $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_can_simulate_qris_payment_when_enabled(): void
    {
        config(['midtrans.allow_simulation' => true]);

        $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999')
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => 'POS-20260910-999', 'transaction_status' => 'settlement']]);
    }

    public function test_webhook_with_valid_signature_marks_order_settled(): void
    {
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement']);

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")->assertJsonPath('data.transaction_status', 'settlement');
    }

    public function test_webhook_with_forged_signature_is_rejected(): void
    {
        Http::fake();
        $payload = ['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement', 'signature_key' => str_repeat('a', 128)];

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
        $this->postJson('/api/v1/payment/midtrans/webhook', ['order_id' => $payload['order_id'], 'transaction_status' => 'settlement'])->assertForbidden();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")->assertJsonPath('data.transaction_status', 'pending');
    }

    public function test_webhook_is_rejected_when_no_server_key_is_configured(): void
    {
        config(['midtrans.server_key' => '']);
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement'], '');

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
    }
}
```

In `backend/tests/Feature/EndToEndParityReconciliationAndQrisTest.php` replace:

```php
    public function test_end_to_end_qris_midtrans_flow(): void
    {
        $orderId = 'POS-E2E-' . uniqid();
```

with:

```php
    public function test_end_to_end_qris_midtrans_flow(): void
    {
        config(['midtrans.server_key' => 'SB-Mid-server-phpunit', 'midtrans.allow_simulation' => true]);
        $orderId = 'POS-E2E-' . uniqid();
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=MidtransQrisApiTest`
Expected: FAIL — `simulation_enabled` missing, charge without key returns 200 with a fake QR, Midtrans 401 returns 200 fallback, simulate returns 200 when disabled, webhook with empty key returns 200.

- [ ] **Step 3: Replace the Midtrans config**

Replace `backend/config/midtrans.php` with:

```php
<?php

$isProduction = (bool) env('MIDTRANS_IS_PRODUCTION', false);

return [
    // Tanpa kunci bawaan: kunci demo yang tertulis di repo membuat signature webhook bisa dipalsukan siapa saja.
    'server_key' => env('MIDTRANS_SERVER_KEY', ''),
    'client_key' => env('MIDTRANS_CLIENT_KEY', ''),
    'is_production' => $isProduction,
    'merchant_id' => env('MIDTRANS_MERCHANT_ID', ''),
    'api_url' => $isProduction
        ? 'https://api.midtrans.com'
        : 'https://api.sandbox.midtrans.com',
    // Simulasi lunas dan QR cadangan hanya untuk demo sandbox; selalu mati di mode produksi.
    'allow_simulation' => ! $isProduction && (bool) env('MIDTRANS_ALLOW_SIMULATION', false),
];
```

Append to `backend/.env.example` (after the `SEED_DEFAULT_PASSWORD=` line):

```
# Midtrans QRIS (sandbox kecuali MIDTRANS_IS_PRODUCTION=true). Tanpa server key QRIS dinamis tidak bisa dibuat.
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
# true hanya untuk demo sandbox: tombol "Simulasi Bayar Lunas" dan QR cadangan saat Midtrans gagal
MIDTRANS_ALLOW_SIMULATION=false
```

- [ ] **Step 4: Edit `MidtransQrisService`**

In `backend/app/Services/Payment/MidtransQrisService.php` replace:

```php
    protected string $serverKey;
    protected string $clientKey;
    protected string $apiUrl;
    protected bool $isProduction;

    public function __construct()
    {
        $this->serverKey = config('midtrans.server_key', 'SB-Mid-server-TEST_KEY_DEMO_OMAHBAN');
        $this->clientKey = config('midtrans.client_key', 'SB-Mid-client-TEST_KEY_DEMO_OMAHBAN');
        $this->apiUrl = rtrim(config('midtrans.api_url', 'https://api.sandbox.midtrans.com'), '/');
        $this->isProduction = (bool) config('midtrans.is_production', false);
    }
```

with:

```php
    protected string $serverKey;
    protected string $apiUrl;

    public function __construct()
    {
        // Tanpa kunci bawaan: kunci demo yang tertulis di repo membuat signature webhook bisa dipalsukan.
        $this->serverKey = (string) config('midtrans.server_key');
        $this->apiUrl = rtrim((string) config('midtrans.api_url'), '/');
    }
```

Replace the whole `createCharge` method (its docblock `Membuat transaksi QRIS Dinamis melalui Midtrans Core API.` through the method's closing brace, i.e. from `    /**` above `public function createCharge` to the `    }` after the `catch` block) with:

```php
    /**
     * Membuat transaksi QRIS Dinamis melalui Midtrans Core API.
     *
     * @param  string  $orderId  Nomor unik order QRIS (misal POS-1727650000000)
     * @param  int  $grossAmount  Nominal tagihan dalam Rupiah
     * @param  array  $customerDetails  Data opsional pelanggan
     */
    public function createCharge(string $orderId, int $grossAmount, array $customerDetails = []): array
    {
        if ($grossAmount <= 0) {
            throw new RuntimeException('Nominal transaksi harus lebih besar dari Rp 0.');
        }
        if ($this->serverKey === '') {
            return $this->fallbackOrFail($orderId, $grossAmount, 'MIDTRANS_SERVER_KEY belum diatur.');
        }

        $payload = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $grossAmount,
            ],
            'qris' => [
                'acquirer' => 'gopay',
            ],
            'customer_details' => [
                'first_name' => $customerDetails['customer_name'] ?? 'Pelanggan Omah Ban',
            ],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->apiUrl}/v2/charge", $payload);
        } catch (\Throwable $e) {
            Log::error('Koneksi Midtrans charge gagal', ['exception' => $e]);

            return $this->fallbackOrFail($orderId, $grossAmount, 'koneksi ke Midtrans gagal.');
        }

        $data = $response->json();

        if ($response->successful() && isset($data['qr_string'])) {
            $qrUrl = null;
            foreach ($data['actions'] ?? [] as $action) {
                if (($action['name'] ?? '') === 'generate-qr-code') {
                    $qrUrl = $action['url'] ?? null;
                    break;
                }
            }

            return [
                'order_id' => $data['order_id'] ?? $orderId,
                'gross_amount' => (int) ($data['gross_amount'] ?? $grossAmount),
                'transaction_id' => $data['transaction_id'] ?? null,
                'transaction_status' => $data['transaction_status'] ?? 'pending',
                'qr_string' => $data['qr_string'],
                'qr_url' => $qrUrl,
                'expiry_time' => $data['expiry_time'] ?? now()->addMinutes(15)->toIso8601String(),
            ];
        }

        Log::warning('Midtrans API charge tidak mengembalikan QR string', ['response' => $data]);

        return $this->fallbackOrFail($orderId, $grossAmount, $data['status_message'] ?? 'respons Midtrans tidak berisi kode QR.');
    }
```

In `checkStatus`, replace:

```php
        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders([
                    'Accept' => 'application/json',
                ])
```

with:

```php
        if ($this->serverKey === '') {
            return ['order_id' => $orderId, 'transaction_status' => 'pending', 'payment_type' => 'qris', 'is_simulated' => false];
        }

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders([
                    'Accept' => 'application/json',
                ])
```

Replace:

```php
    /**
     * Generate fallback valid EMVCo QRIS string untuk mode offline / mock developer.
     */
```

with:

```php
    /**
     * QR cadangan hanya boleh di mode demo sandbox; di luar itu kasir harus tahu QRIS gagal dibuat
     * (QR palsu tidak bisa dibayar pelanggan).
     */
    protected function fallbackOrFail(string $orderId, int $grossAmount, string $reason): array
    {
        if (! config('midtrans.allow_simulation')) {
            throw new RuntimeException($reason);
        }

        return $this->generateFallbackCharge($orderId, $grossAmount);
    }

    /**
     * Generate fallback valid EMVCo QRIS string untuk mode offline / mock developer.
     */
```

- [ ] **Step 5: Edit `PaymentApiController`**

In `backend/app/Http/Controllers/Api/v1/PaymentApiController.php` (method `chargeQris`) replace:

```php
            return response()->json([
                'success' => true,
                'message' => 'QRIS Dinamis berhasil dibuat.',
                'data' => $data,
            ]);
```

with:

```php
            return response()->json([
                'success' => true,
                'message' => 'QRIS Dinamis berhasil dibuat.',
                // Kasir hanya menampilkan tombol simulasi bila server mengizinkannya.
                'data' => $data + ['simulation_enabled' => (bool) config('midtrans.allow_simulation')],
            ]);
```

In `simulateQrisSettlement` replace:

```php
    public function simulateQrisSettlement(string $orderId): JsonResponse
    {
        try {
```

with:

```php
    public function simulateQrisSettlement(string $orderId): JsonResponse
    {
        if (! config('midtrans.allow_simulation')) {
            return response()->json([
                'success' => false,
                'message' => 'Simulasi pembayaran QRIS hanya tersedia di mode demo sandbox.',
            ], 403);
        }

        try {
```

In `handleWebhook` replace:

```php
        $expected = hash('sha512', ($payload['order_id'] ?? '').($payload['status_code'] ?? '').($payload['gross_amount'] ?? '').config('midtrans.server_key'));
        if (! is_string($payload['signature_key'] ?? null) || ! hash_equals($expected, $payload['signature_key'])) {
```

with:

```php
        // Tanpa server key, sha512 atas string publik bisa dihitung siapa saja: tolak semua notifikasi.
        $serverKey = (string) config('midtrans.server_key');
        $expected = hash('sha512', ($payload['order_id'] ?? '').($payload['status_code'] ?? '').($payload['gross_amount'] ?? '').$serverKey);
        if ($serverKey === '' || ! is_string($payload['signature_key'] ?? null) || ! hash_equals($expected, $payload['signature_key'])) {
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter="MidtransQrisApiTest|EndToEndParityReconciliationAndQrisTest"`
Expected: PASS (9 + 2 tests).

- [ ] **Step 7: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all pass, 198 tests.

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/config/midtrans.php backend/.env.example backend/app/Services/Payment/MidtransQrisService.php \
        backend/app/Http/Controllers/Api/v1/PaymentApiController.php backend/tests/Feature/MidtransQrisApiTest.php \
        backend/tests/Feature/EndToEndParityReconciliationAndQrisTest.php
git commit -m "fix(payment): drop the midtrans demo key and gate the qris simulation

The public demo server key made webhook signatures forgeable and the simulate
endpoint let any cashier mark an order paid in any environment. Keys now have
no default and simulation plus the fake fallback QR need MIDTRANS_ALLOW_SIMULATION.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B2: Record QRIS orders and settlements with their amount

**Files:**
- Create: `backend/database/migrations/2026_10_01_000001_create_qris_transactions_table.php`, `backend/app/Models/QrisTransaction.php`
- Modify: `backend/app/Services/Payment/MidtransQrisService.php` (full replacement), `backend/app/Http/Controllers/Api/v1/PaymentApiController.php` (full replacement)
- Test: `backend/tests/Feature/MidtransQrisApiTest.php` (full replacement)

**Interfaces:**
- Consumes (B1): `midtrans.allow_simulation`, empty-key behaviour, `simulation_enabled` in the charge response.
- Produces: table `qris_transactions` (`id`, `order_id` string(64) unique, `gross_amount` decimal(15,2), `transaction_status` string(20) default `pending`, `settlement_source` string(20) nullable, `settled_at` timestamp nullable, `sale_payment_id` nullable unique FK `sale_payments`, timestamps).
- Produces: `App\Models\QrisTransaction` with `isSettled(): bool` (`transaction_status === 'settlement'`) and `toStatusArray(): array{order_id, transaction_status, payment_type, gross_amount:int, settlement_time:?string, is_simulated:bool}`; constants `SOURCE_WEBHOOK = 'WEBHOOK'`, `SOURCE_STATUS_API = 'STATUS_API'`, `SOURCE_SIMULATION = 'SIMULATION'`.
- Produces: `MidtransQrisService::createCharge()` creates a `pending` row; `checkStatus(string $orderId): array`; `simulateSettlement(string $orderId): QrisTransaction` (throws `PosRuleException` for an order never charged); `markSettled(string $orderId, float $grossAmount, string $source): QrisTransaction` (idempotent: first settlement wins).
- Removes: cache key `midtrans_sim_{orderId}`.

- [ ] **Step 1: Write the failing tests**

Replace `backend/tests/Feature/MidtransQrisApiTest.php` with:

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MidtransQrisApiTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // Kunci uji sendiri; simulasi mati kecuali tes menyalakannya (sama seperti default).
        config(['midtrans.server_key' => 'SB-Mid-server-phpunit', 'midtrans.allow_simulation' => false]);
    }

    private function fakeCharge(string $orderId, int $gross): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'status_message' => 'Success, QRIS transaction is created',
                'transaction_id' => 'mid-txn-'.$orderId,
                'order_id' => $orderId,
                'gross_amount' => $gross.'.00',
                'payment_type' => 'qris',
                'transaction_status' => 'pending',
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'actions' => [
                    ['name' => 'generate-qr-code', 'method' => 'GET', 'url' => 'https://api.sandbox.midtrans.com/v2/qris/x/qr-code'],
                ],
            ], 201),
        ]);
    }

    private function signed(array $payload, ?string $key = null): array
    {
        $payload['signature_key'] = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].($key ?? config('midtrans.server_key')));

        return $payload;
    }

    public function test_charge_returns_qr_string_and_records_a_pending_order(): void
    {
        $orderId = 'POS-CHG-'.uniqid();
        $this->fakeCharge($orderId, 350000);

        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => $orderId, 'gross_amount' => 350000, 'customer_name' => 'Budi Santoso'])
            ->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => $orderId,
                    'gross_amount' => 350000,
                    'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                    'transaction_status' => 'pending',
                    'simulation_enabled' => false,
                ],
            ]);

        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $orderId, 'gross_amount' => 350000, 'transaction_status' => 'pending', 'sale_payment_id' => null,
        ]);
    }

    public function test_charge_without_server_key_fails_unless_simulation_is_enabled(): void
    {
        config(['midtrans.server_key' => '']);
        Http::fake();
        $body = ['order_id' => 'POS-NOKEY-'.uniqid(), 'gross_amount' => 100000];

        $this->postJson('/api/v1/payment/qris/charge', $body)->assertStatus(422)->assertJsonPath('success', false);
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $body['order_id']]);

        config(['midtrans.allow_simulation' => true]);
        $this->postJson('/api/v1/payment/qris/charge', $body)->assertOk()
            ->assertJsonPath('data.is_fallback', true)
            ->assertJsonPath('data.simulation_enabled', true);

        Http::assertNothingSent();
    }

    public function test_midtrans_error_is_not_hidden_behind_a_fake_qr(): void
    {
        $orderId = 'POS-ERR-'.uniqid();
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response(['status_code' => '401', 'status_message' => 'Unknown Merchant server_key/id'], 401),
        ]);

        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => $orderId, 'gross_amount' => 100000])
            ->assertStatus(422)
            ->assertJsonMissingPath('data.qr_string');
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $orderId]);
    }

    public function test_status_check_records_the_settlement_reported_by_midtrans_once(): void
    {
        $orderId = 'POS-ST-'.uniqid();
        Http::fake([
            "https://api.sandbox.midtrans.com/v2/{$orderId}/status" => Http::response([
                'status_code' => '200',
                'order_id' => $orderId,
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_status' => 'settlement',
                'settlement_time' => '2026-09-10 16:02:00',
            ], 200),
        ]);

        $this->getJson("/api/v1/payment/qris/status/{$orderId}")
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => $orderId, 'transaction_status' => 'settlement', 'gross_amount' => 350000, 'is_simulated' => false]]);
        $this->getJson("/api/v1/payment/qris/status/{$orderId}")->assertJsonPath('data.transaction_status', 'settlement');

        Http::assertSentCount(1);
        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $orderId, 'gross_amount' => 350000, 'transaction_status' => 'settlement', 'settlement_source' => 'STATUS_API',
        ]);
    }

    public function test_simulation_is_forbidden_unless_enabled(): void
    {
        $this->postJson('/api/v1/payment/qris/simulate/POS-20260910-999')
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    public function test_simulation_settles_a_charged_order_at_its_charged_amount(): void
    {
        config(['midtrans.allow_simulation' => true]);
        $orderId = 'POS-SIM-'.uniqid();
        $this->fakeCharge($orderId, 275000);
        $this->postJson('/api/v1/payment/qris/charge', ['order_id' => $orderId, 'gross_amount' => 275000])->assertOk();

        $this->postJson("/api/v1/payment/qris/simulate/{$orderId}")
            ->assertOk()
            ->assertJson(['success' => true, 'data' => ['order_id' => $orderId, 'transaction_status' => 'settlement', 'gross_amount' => 275000, 'is_simulated' => true]]);

        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $orderId, 'gross_amount' => 275000, 'transaction_status' => 'settlement', 'settlement_source' => 'SIMULATION',
        ]);
    }

    public function test_simulation_of_an_order_that_was_never_charged_is_rejected(): void
    {
        config(['midtrans.allow_simulation' => true]);

        $this->postJson('/api/v1/payment/qris/simulate/POS-UNKNOWN-'.uniqid())->assertStatus(422);
    }

    public function test_webhook_records_the_signed_settled_amount(): void
    {
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement']);

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk();
        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertOk(); // Midtrans mengirim ulang: tetap satu baris

        $this->assertDatabaseHas('qris_transactions', [
            'order_id' => $payload['order_id'], 'gross_amount' => 150000, 'transaction_status' => 'settlement', 'settlement_source' => 'WEBHOOK',
        ]);

        Http::fake();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")
            ->assertJsonPath('data.transaction_status', 'settlement')
            ->assertJsonPath('data.gross_amount', 150000);
        Http::assertNothingSent();
    }

    public function test_webhook_with_forged_signature_is_rejected(): void
    {
        Http::fake();
        $payload = ['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement', 'signature_key' => str_repeat('a', 128)];

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
        $this->postJson('/api/v1/payment/midtrans/webhook', ['order_id' => $payload['order_id'], 'transaction_status' => 'settlement'])->assertForbidden();
        $this->getJson("/api/v1/payment/qris/status/{$payload['order_id']}")->assertJsonPath('data.transaction_status', 'pending');
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $payload['order_id']]);
    }

    public function test_webhook_is_rejected_when_no_server_key_is_configured(): void
    {
        config(['midtrans.server_key' => '']);
        $payload = $this->signed(['order_id' => 'POS-WH-'.uniqid(), 'status_code' => '200', 'gross_amount' => '150000.00', 'transaction_status' => 'settlement'], '');

        $this->postJson('/api/v1/payment/midtrans/webhook', $payload)->assertForbidden();
        $this->assertDatabaseMissing('qris_transactions', ['order_id' => $payload['order_id']]);
    }
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=MidtransQrisApiTest`
Expected: FAIL — `SQLSTATE[42S02]` table `qris_transactions` doesn't exist.

- [ ] **Step 3: Create the migration**

Create `backend/database/migrations/2026_10_01_000001_create_qris_transactions_table.php`:

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Satu baris per order QRIS dinamis Midtrans: nominal yang ditagih/lunas, sumber pelunasan, dan baris
 * pembayaran nota yang memakainya (unik: satu pelunasan hanya membayar satu nota).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qris_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('order_id', 64)->unique();
            $table->decimal('gross_amount', 15, 2);
            $table->string('transaction_status', 20)->default('pending');
            $table->string('settlement_source', 20)->nullable(); // WEBHOOK | STATUS_API | SIMULATION
            $table->timestamp('settled_at')->nullable();
            $table->foreignId('sale_payment_id')->nullable()->unique()->constrained('sale_payments');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qris_transactions');
    }
};
```

Migrate both databases:

Run: `cd backend && DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force && php artisan migrate --force`
Expected: `2026_10_01_000001_create_qris_transactions_table ... DONE` twice.

- [ ] **Step 4: Create the model**

Create `backend/app/Models/QrisTransaction.php`:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Order QRIS dinamis Midtrans. Dibuat saat charge (pending, nominal tagihan), ditandai lunas oleh webhook
 * bertanda tangan, cek status ke Midtrans, atau simulasi demo, dan dikunci ke satu baris pembayaran nota.
 */
class QrisTransaction extends Model
{
    public const SOURCE_WEBHOOK = 'WEBHOOK';
    public const SOURCE_STATUS_API = 'STATUS_API';
    public const SOURCE_SIMULATION = 'SIMULATION';

    protected $fillable = [
        'order_id', 'gross_amount', 'transaction_status', 'settlement_source', 'settled_at', 'sale_payment_id',
    ];

    protected $casts = [
        'gross_amount' => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    public function isSettled(): bool
    {
        return $this->transaction_status === 'settlement';
    }

    /** Bentuk respons endpoint status/simulasi QRIS. */
    public function toStatusArray(): array
    {
        return [
            'order_id' => $this->order_id,
            'transaction_status' => $this->transaction_status,
            'payment_type' => 'qris',
            'gross_amount' => (int) round((float) $this->gross_amount),
            'settlement_time' => $this->settled_at?->toIso8601String(),
            'is_simulated' => $this->settlement_source === self::SOURCE_SIMULATION,
        ];
    }
}
```

- [ ] **Step 5: Replace `MidtransQrisService`**

Replace `backend/app/Services/Payment/MidtransQrisService.php` with:

```php
<?php

namespace App\Services\Payment;

use App\Exceptions\PosRuleException;
use App\Models\QrisTransaction;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * QRIS dinamis Midtrans. Setiap order yang dibuat dan setiap pelunasan (webhook bertanda tangan, cek status ke
 * Midtrans, simulasi demo) dicatat di qris_transactions beserta nominalnya; checkout hanya menerima order yang
 * lunas di tabel itu.
 */
class MidtransQrisService
{
    protected string $serverKey;
    protected string $apiUrl;

    public function __construct()
    {
        // Tanpa kunci bawaan: kunci demo yang tertulis di repo membuat signature webhook bisa dipalsukan.
        $this->serverKey = (string) config('midtrans.server_key');
        $this->apiUrl = rtrim((string) config('midtrans.api_url'), '/');
    }

    /**
     * Membuat QRIS Dinamis dan mencatat order-nya (pending, nominal tagihan).
     *
     * @param  string  $orderId  Nomor unik order QRIS (misal POS-1727650000000)
     * @param  int  $grossAmount  Nominal tagihan dalam Rupiah
     * @param  array  $customerDetails  Data opsional pelanggan
     */
    public function createCharge(string $orderId, int $grossAmount, array $customerDetails = []): array
    {
        $charge = $this->requestCharge($orderId, $grossAmount, $customerDetails);

        QrisTransaction::firstOrCreate(
            ['order_id' => $orderId],
            ['gross_amount' => $grossAmount, 'transaction_status' => 'pending']
        );

        return $charge;
    }

    /**
     * Status pelunasan: order yang sudah lunas dibaca dari tabel; selain itu ditanyakan ke Midtrans dan,
     * bila lunas, dicatat dengan nominal dari Midtrans.
     */
    public function checkStatus(string $orderId): array
    {
        $recorded = QrisTransaction::where('order_id', $orderId)->first();
        if ($recorded?->isSettled()) {
            return $recorded->toStatusArray();
        }

        $pending = ['order_id' => $orderId, 'transaction_status' => 'pending', 'payment_type' => 'qris', 'is_simulated' => false];
        if ($this->serverKey === '') {
            return $pending;
        }

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders(['Accept' => 'application/json'])
                ->get("{$this->apiUrl}/v2/{$orderId}/status");
        } catch (\Throwable $e) {
            Log::error('Gagal periksa status Midtrans', ['order_id' => $orderId, 'exception' => $e]);

            return $pending;
        }

        if (! $response->successful()) {
            return $pending;
        }

        $data = $response->json();
        $status = $data['transaction_status'] ?? 'pending';
        if (in_array($status, ['settlement', 'capture'], true)) {
            return $this->markSettled($orderId, (float) ($data['gross_amount'] ?? 0), QrisTransaction::SOURCE_STATUS_API)->toStatusArray();
        }

        return ['order_id' => $orderId, 'transaction_status' => $status, 'payment_type' => 'qris', 'is_simulated' => false];
    }

    /**
     * Demo sandbox: melunasi order yang sudah dibuat lewat charge, sebesar nominal tagihannya.
     * Controller memastikan midtrans.allow_simulation aktif.
     */
    public function simulateSettlement(string $orderId): QrisTransaction
    {
        $charged = QrisTransaction::where('order_id', $orderId)->first();
        if (! $charged) {
            throw new PosRuleException("Order QRIS {$orderId} tidak ditemukan. Buat QRIS terlebih dahulu.");
        }

        return $this->markSettled($orderId, (float) $charged->gross_amount, QrisTransaction::SOURCE_SIMULATION);
    }

    /**
     * Catat pelunasan dari sumber tepercaya. Idempoten: pelunasan pertama yang menang (webhook yang dikirim
     * ulang atau polling bersamaan tidak mengubah nominal atau baris yang sudah dipakai nota).
     */
    public function markSettled(string $orderId, float $grossAmount, string $source): QrisTransaction
    {
        $tx = QrisTransaction::firstOrCreate(
            ['order_id' => $orderId],
            ['gross_amount' => $grossAmount, 'transaction_status' => 'pending']
        );

        if (! $tx->isSettled()) {
            $tx->update([
                'gross_amount' => $grossAmount,
                'transaction_status' => 'settlement',
                'settlement_source' => $source,
                'settled_at' => now(),
            ]);
        }

        return $tx;
    }

    protected function requestCharge(string $orderId, int $grossAmount, array $customerDetails): array
    {
        if ($grossAmount <= 0) {
            throw new RuntimeException('Nominal transaksi harus lebih besar dari Rp 0.');
        }
        if ($this->serverKey === '') {
            return $this->fallbackOrFail($orderId, $grossAmount, 'MIDTRANS_SERVER_KEY belum diatur.');
        }

        $payload = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $grossAmount,
            ],
            'qris' => [
                'acquirer' => 'gopay',
            ],
            'customer_details' => [
                'first_name' => $customerDetails['customer_name'] ?? 'Pelanggan Omah Ban',
            ],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->withHeaders([
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->apiUrl}/v2/charge", $payload);
        } catch (\Throwable $e) {
            Log::error('Koneksi Midtrans charge gagal', ['exception' => $e]);

            return $this->fallbackOrFail($orderId, $grossAmount, 'koneksi ke Midtrans gagal.');
        }

        $data = $response->json();

        if ($response->successful() && isset($data['qr_string'])) {
            $qrUrl = null;
            foreach ($data['actions'] ?? [] as $action) {
                if (($action['name'] ?? '') === 'generate-qr-code') {
                    $qrUrl = $action['url'] ?? null;
                    break;
                }
            }

            return [
                'order_id' => $data['order_id'] ?? $orderId,
                'gross_amount' => (int) ($data['gross_amount'] ?? $grossAmount),
                'transaction_id' => $data['transaction_id'] ?? null,
                'transaction_status' => $data['transaction_status'] ?? 'pending',
                'qr_string' => $data['qr_string'],
                'qr_url' => $qrUrl,
                'expiry_time' => $data['expiry_time'] ?? now()->addMinutes(15)->toIso8601String(),
            ];
        }

        Log::warning('Midtrans API charge tidak mengembalikan QR string', ['response' => $data]);

        return $this->fallbackOrFail($orderId, $grossAmount, $data['status_message'] ?? 'respons Midtrans tidak berisi kode QR.');
    }

    /**
     * QR cadangan hanya boleh di mode demo sandbox; di luar itu kasir harus tahu QRIS gagal dibuat
     * (QR palsu tidak bisa dibayar pelanggan).
     */
    protected function fallbackOrFail(string $orderId, int $grossAmount, string $reason): array
    {
        if (! config('midtrans.allow_simulation')) {
            throw new RuntimeException($reason);
        }

        return $this->generateFallbackCharge($orderId, $grossAmount);
    }

    /**
     * Generate fallback valid EMVCo QRIS string untuk mode offline / mock developer.
     */
    protected function generateFallbackCharge(string $orderId, int $grossAmount): array
    {
        $mockQr = "00020101021226590014ID.LINKAJA.WWW0118936009110022094894520458125303360540"
            . str_pad((string) $grossAmount, 6, '0', STR_PAD_LEFT)
            . "5802ID5914OMAH BAN CAB 36007BANDUNG62170113{$orderId}6304ABCD";

        return [
            'order_id' => $orderId,
            'gross_amount' => $grossAmount,
            'transaction_id' => 'sim-mid-' . uniqid(),
            'transaction_status' => 'pending',
            'qr_string' => $mockQr,
            'qr_url' => "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" . urlencode($mockQr),
            'expiry_time' => now()->addMinutes(15)->toIso8601String(),
            'is_fallback' => true,
        ];
    }
}
```

- [ ] **Step 6: Replace `PaymentApiController`**

Replace `backend/app/Http/Controllers/Api/v1/PaymentApiController.php` with:

```php
<?php

namespace App\Http\Controllers\Api\v1;

use App\Http\Controllers\Controller;
use App\Models\QrisTransaction;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentApiController extends Controller
{
    public function __construct(private readonly MidtransQrisService $qrisService)
    {
    }

    /**
     * Membuat charge transaksi QRIS Dinamis.
     *
     * POST /api/v1/payment/qris/charge
     */
    public function chargeQris(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|string|max:64',
            'gross_amount' => 'required|integer|min:1',
            'customer_name' => 'nullable|string|max:128',
        ]);

        try {
            $data = $this->qrisService->createCharge(
                $request->input('order_id'),
                (int) $request->input('gross_amount'),
                ['customer_name' => $request->input('customer_name')]
            );
        } catch (\Throwable $e) {
            Log::error('Gagal membuat QRIS charge', ['exception' => $e]);

            return response()->json([
                'success' => false,
                'message' => 'Gagal membuat QRIS: '.$e->getMessage(),
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'QRIS Dinamis berhasil dibuat.',
            // Kasir hanya menampilkan tombol simulasi bila server mengizinkannya.
            'data' => $data + ['simulation_enabled' => (bool) config('midtrans.allow_simulation')],
        ]);
    }

    /**
     * Status pelunasan QRIS untuk polling kasir.
     *
     * GET /api/v1/payment/qris/status/{orderId}
     */
    public function checkQrisStatus(string $orderId): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->qrisService->checkStatus($orderId),
        ]);
    }

    /**
     * Demo sandbox: melunasi order yang sudah dibuat, sebesar nominal tagihannya.
     *
     * POST /api/v1/payment/qris/simulate/{orderId}
     */
    public function simulateQrisSettlement(string $orderId): JsonResponse
    {
        if (! config('midtrans.allow_simulation')) {
            return response()->json([
                'success' => false,
                'message' => 'Simulasi pembayaran QRIS hanya tersedia di mode demo sandbox.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Simulasi lunas berhasil diterapkan.',
            'data' => $this->qrisService->simulateSettlement($orderId)->toStatusArray(),
        ]);
    }

    /**
     * Notifikasi HTTP resmi Midtrans. Pelunasan dicatat dengan gross_amount yang ikut ditandatangani.
     *
     * POST /api/v1/payment/midtrans/webhook
     */
    public function handleWebhook(Request $request): JsonResponse
    {
        $payload = $request->all();
        $orderId = $payload['order_id'] ?? null;
        $transactionStatus = $payload['transaction_status'] ?? null;

        // Sah hanya bila signature_key = sha512(order_id + status_code + gross_amount + server_key). Tanpa server key,
        // sha512 atas string publik bisa dihitung siapa saja: tolak semua notifikasi.
        $serverKey = (string) config('midtrans.server_key');
        $expected = hash('sha512', ($payload['order_id'] ?? '').($payload['status_code'] ?? '').($payload['gross_amount'] ?? '').$serverKey);
        if ($serverKey === '' || ! is_string($payload['signature_key'] ?? null) || ! hash_equals($expected, $payload['signature_key'])) {
            Log::warning('Midtrans webhook ditolak: signature tidak valid', ['order_id' => $orderId]);

            return response()->json(['success' => false, 'message' => 'Signature notifikasi tidak valid.'], 403);
        }

        Log::info('Midtrans webhook diterima', ['order_id' => $orderId, 'status' => $transactionStatus]);

        if (is_string($orderId) && $orderId !== '' && in_array($transactionStatus, ['settlement', 'capture'], true)) {
            $this->qrisService->markSettled($orderId, (float) ($payload['gross_amount'] ?? 0), QrisTransaction::SOURCE_WEBHOOK);
        }

        return response()->json([
            'success' => true,
            'message' => 'Webhook berhasil diproses.',
        ]);
    }
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter="MidtransQrisApiTest|EndToEndParityReconciliationAndQrisTest|PosCheckoutTest"`
Expected: PASS (10 + 2 + 15). `PosCheckoutTest::test_qris_reference_must_be_settled` still mocks `checkStatus` and is unaffected.

- [ ] **Step 8: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all pass, 199 tests.

- [ ] **Step 9: Commit**

```bash
git status --short
git add backend/database/migrations/2026_10_01_000001_create_qris_transactions_table.php backend/app/Models/QrisTransaction.php \
        backend/app/Services/Payment/MidtransQrisService.php backend/app/Http/Controllers/Api/v1/PaymentApiController.php \
        backend/tests/Feature/MidtransQrisApiTest.php
git commit -m "feat(payment): record qris orders and settlements with their amount

The webhook verified the signature but kept only the word settlement in a
2-hour cache, dropping the signed gross amount. Orders and settlements now
live in qris_transactions so checkout can check the amount and single use.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B3: Compute payment fees and provider names on the server

**Files:**
- Modify: `backend/app/Http/Requests/PosCheckoutRequest.php`, `backend/app/Services/Pos/CheckoutService.php`
- Test: `backend/tests/Concerns/CreatesPosFixtures.php`, `backend/tests/Feature/PosCheckoutTest.php`, `backend/tests/Feature/PosVoidTest.php`

**Interfaces:**
- Consumes: `PaymentProviderSetting::active()`, `PaymentProviderSetting::calculateQrisFee(float $amount): array{fee_percentage, fee_amount, net_received}` (existing).
- Produces: checkout payment row input `provider_id` (nullable integer). `fee_percentage` → 422 `payments.N.fee_percentage` (prohibited). `provider_name` input no longer read; stored/returned from the provider row.
- Produces: `CheckoutService::provider(string $method, mixed $id): ?PaymentProviderSetting` (private). QRIS without/with invalid provider → `PosRuleException`.
- Produces (tests): `CreatesPosFixtures::paymentProvider(string $type = 'qris', float $feePct = 0, float $threshold = 0, bool $active = true): PaymentProviderSetting`.

- [ ] **Step 1: Add the fixture helper**

In `backend/tests/Concerns/CreatesPosFixtures.php` replace:

```php
use App\Models\JournalEntry;
use App\Models\Product;
```

with:

```php
use App\Models\JournalEntry;
use App\Models\PaymentProviderSetting;
use App\Models\Product;
```

and replace:

```php
    protected function checkout(array $payload)
```

with:

```php
    /** Provider pembayaran server (method_type bank/qris) dengan MDR dan ambang sendiri. */
    protected function paymentProvider(string $type = 'qris', float $feePct = 0, float $threshold = 0, bool $active = true): PaymentProviderSetting
    {
        return PaymentProviderSetting::create([
            'method_type' => $type,
            'provider_name' => strtoupper($type).' Test '.uniqid(),
            'fee_percentage' => $feePct,
            'fee_threshold_amount' => $threshold,
            'is_active' => $active,
        ]);
    }

    protected function checkout(array $payload)
```

- [ ] **Step 2: Write the failing tests**

In `backend/tests/Feature/PosCheckoutTest.php` replace the whole method `test_qris_fee_is_booked_as_mdr_expense` with:

```php
    public function test_qris_fee_is_booked_as_mdr_expense(): void
    {
        $product = $this->makeProduct();
        $provider = $this->paymentProvider('qris', 0.7);
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $provider->id]],
        ])->assertCreated();

        $res->assertJsonPath('data.fee_amount', 7000)
            ->assertJsonPath('data.net_received', 993000)
            ->assertJsonPath('data.payments.0.fee_percentage', 0.7)
            ->assertJsonPath('data.payments.0.provider_name', $provider->provider_name);
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(993000, $j['1-1001']['debit']);
        $this->assertEquals(7000, $j['6-1009']['debit']);
    }

    public function test_qris_fee_follows_the_server_provider_threshold(): void
    {
        $product = $this->makeProduct(400000);
        $provider = $this->paymentProvider('qris', 0.3, 500000);
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 400000, 'provider_id' => $provider->id]],
        ])->assertCreated();

        $res->assertJsonPath('data.fee_amount', 0)->assertJsonPath('data.payments.0.fee_percentage', 0);
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(400000, $j['1-1001']['debit']);
        $this->assertArrayNotHasKey('6-1009', $j);
    }

    public function test_client_fee_percentage_is_rejected(): void
    {
        $product = $this->makeProduct();

        $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TUNAI', 'amount' => 1000000, 'fee_percentage' => 0]],
        ])->assertStatus(422)->assertJsonValidationErrors('payments.0.fee_percentage');

        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_qris_needs_an_active_qris_provider(): void
    {
        $product = $this->makeProduct();
        $payload = fn ($providerId) => [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $providerId]],
        ];

        $this->checkout($payload(null))->assertStatus(422)->assertJsonPath('message', 'Pilih provider QRIS agar potongan MDR dihitung server.');
        $this->checkout($payload($this->paymentProvider('qris', 0.3, 0, false)->id))->assertStatus(422)
            ->assertJsonPath('message', 'Provider pembayaran tidak ditemukan atau tidak aktif.');
        $this->checkout($payload($this->paymentProvider('bank')->id))->assertStatus(422);

        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_transfer_books_the_bank_with_the_provider_name_from_the_server(): void
    {
        $product = $this->makeProduct();
        $bank = $this->paymentProvider('bank', 2.5);
        $res = $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'TRANSFER_BCA', 'amount' => 1000000, 'provider_id' => $bank->id]],
        ])->assertCreated();

        $res->assertJsonPath('data.payment_provider', $bank->provider_name)->assertJsonPath('data.fee_amount', 0);
        $j = $this->journalByAccount($res->json('data.reference'));
        $this->assertEquals(1000000, $j['1-1001']['debit']);
        $this->assertArrayNotHasKey('6-1009', $j);
    }
```

In the same file, method `test_qris_reference_must_be_settled`, replace:

```php
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'reference' => 'POS-TEST-'.uniqid()]],
```

with:

```php
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $this->paymentProvider('qris')->id, 'reference' => 'POS-TEST-'.uniqid()]],
```

In method `test_split_cash_and_qris_books_mdr_to_expense_without_surcharge` replace:

```php
                ['method' => 'QRIS', 'amount' => 600000, 'fee_percentage' => 0.5, 'provider_name' => 'QRIS BCA'],
```

with:

```php
                ['method' => 'QRIS', 'amount' => 600000, 'provider_id' => $this->paymentProvider('qris', 0.5)->id],
```

In `backend/tests/Feature/PosVoidTest.php`, method `test_void_of_split_cash_and_qris_sale_reverses_mdr`, replace:

```php
                ['method' => 'QRIS', 'amount' => 600000, 'fee_percentage' => 0.5],
```

with:

```php
                ['method' => 'QRIS', 'amount' => 600000, 'provider_id' => $this->paymentProvider('qris', 0.5)->id],
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter="PosCheckoutTest|PosVoidTest"`
Expected: FAIL — fee 0 instead of 7000 (fee_percentage no longer sent), `fee_percentage` accepted (201 instead of 422), QRIS without provider accepted, provider name null.

- [ ] **Step 4: Change the checkout request rules**

In `backend/app/Http/Requests/PosCheckoutRequest.php` replace:

```php
            'payments.*.fee_percentage' => 'nullable|numeric|min:0|max:10',
            'payments.*.provider_name' => 'nullable|string|max:100',
            'payments.*.reference' => 'nullable|string|max:100',
```

with:

```php
            // Fee MDR dan nama provider dihitung server dari payment_provider_settings; klien hanya memilih provider.
            'payments.*.provider_id' => 'nullable|integer',
            'payments.*.fee_percentage' => 'prohibited',
            'payments.*.reference' => 'nullable|string|max:100',
```

and replace:

```php
            'payments.*.method.in' => 'Metode pembayaran tidak dikenal. Gunakan Tunai, Transfer, atau QRIS.',
```

with:

```php
            'payments.*.method.in' => 'Metode pembayaran tidak dikenal. Gunakan Tunai, Transfer, atau QRIS.',
            'payments.*.fee_percentage.prohibited' => 'Persentase fee dihitung server dari pengaturan provider pembayaran. Muat ulang aplikasi kasir.',
```

- [ ] **Step 5: Compute fee and provider in `CheckoutService`**

In `backend/app/Services/Pos/CheckoutService.php` replace:

```php
use App\Exceptions\PosRuleException;
use App\Models\Sale;
```

with:

```php
use App\Exceptions\PosRuleException;
use App\Models\PaymentProviderSetting;
use App\Models\Sale;
```

Replace the whole `buildPayments` method (from its `    /**` docblock with `@return array<int, array<string, mixed>>` through its closing brace) with:

```php
    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildPayments(array $input, float $amountDue): array
    {
        $payments = [];
        foreach ($input as $row) {
            $method = $row['method'];
            $amount = round((float) $row['amount'], 2);
            $provider = $this->provider($method, $row['provider_id'] ?? null);
            // Hanya QRIS yang kena MDR (beban toko), dihitung dari pengaturan provider di server.
            $fee = $method === 'QRIS'
                ? $provider->calculateQrisFee($amount)
                : ['fee_percentage' => 0.0, 'fee_amount' => 0.0];

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

            $payments[] = [
                'method' => $method,
                'account_code' => PosAccounts::forMethod($method),
                'amount' => $amount,
                'tendered_amount' => $tendered,
                'change_amount' => round($tendered - $amount, 2),
                'fee_percentage' => (float) $fee['fee_percentage'],
                'fee_amount' => (float) $fee['fee_amount'],
                'net_received' => round($amount - (float) $fee['fee_amount'], 2),
                'provider_name' => $provider?->provider_name,
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
     * Provider dari pengaturan server, bukan nama/fee kiriman klien. QRIS wajib punya provider karena MDR-nya
     * dihitung dari sana; transfer boleh tanpa provider (hanya label bank). Semua transfer dan QRIS tetap
     * dibukukan ke satu rekening bank toko (1-1001, PosAccounts::forMethod).
     */
    private function provider(string $method, mixed $id): ?PaymentProviderSetting
    {
        if ($method === 'TUNAI') {
            return null;
        }

        $type = $method === 'QRIS' ? 'qris' : 'bank';
        if (! $id) {
            if ($type === 'qris') {
                throw new PosRuleException('Pilih provider QRIS agar potongan MDR dihitung server.');
            }

            return null;
        }

        $provider = PaymentProviderSetting::active()->where('method_type', $type)->find($id);
        if (! $provider) {
            throw new PosRuleException('Provider pembayaran tidak ditemukan atau tidak aktif.');
        }

        return $provider;
    }
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter="PosCheckoutTest|PosVoidTest"`
Expected: PASS.

- [ ] **Step 7: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all pass, 203 tests.

- [ ] **Step 8: Commit**

```bash
git status --short
git add backend/app/Http/Requests/PosCheckoutRequest.php backend/app/Services/Pos/CheckoutService.php \
        backend/tests/Concerns/CreatesPosFixtures.php backend/tests/Feature/PosCheckoutTest.php backend/tests/Feature/PosVoidTest.php
git commit -m "feat(pos): compute payment fees and provider names on the server

The MDR percentage and provider name came from the browser, so the booked
6-1009 expense depended on whatever the client sent. Payment rows now send a
provider_id and the fee comes from payment_provider_settings.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task B4: Claim a settled QRIS order once, at its settled amount

**Files:**
- Modify: `backend/app/Services/Pos/CheckoutService.php`
- Test: `backend/tests/Concerns/CreatesPosFixtures.php`, `backend/tests/Feature/PosCheckoutTest.php`

**Interfaces:**
- Consumes (B2): `QrisTransaction` (`isSettled()`, `sale_payment_id`, `gross_amount`, `transaction_status`). Consumes (B3): `buildPayments`/`provider()` as written in B3.
- Produces: `CheckoutService::claimQris(string $orderId, float $amount, array $claimed): QrisTransaction` (private); checkout sets `qris_transactions.sale_payment_id` to the new `sale_payments.id`. `CheckoutService` no longer depends on `MidtransQrisService`.
- Produces (tests): `CreatesPosFixtures::qrisOrder(float $gross, string $status = 'settlement'): string` (returns the order id).

- [ ] **Step 1: Add the fixture helper**

In `backend/tests/Concerns/CreatesPosFixtures.php` replace:

```php
use App\Models\ProductBatch;
use App\Models\Sale;
```

with:

```php
use App\Models\ProductBatch;
use App\Models\QrisTransaction;
use App\Models\Sale;
```

and replace:

```php
    protected function checkout(array $payload)
```

with:

```php
    /** Order QRIS Midtrans yang sudah tercatat (default lunas lewat webhook). Mengembalikan order id. */
    protected function qrisOrder(float $gross, string $status = 'settlement'): string
    {
        $orderId = 'POS-T-'.uniqid();
        QrisTransaction::create([
            'order_id' => $orderId,
            'gross_amount' => $gross,
            'transaction_status' => $status,
            'settlement_source' => $status === 'settlement' ? QrisTransaction::SOURCE_WEBHOOK : null,
            'settled_at' => $status === 'settlement' ? now() : null,
        ]);

        return $orderId;
    }

    protected function checkout(array $payload)
```

- [ ] **Step 2: Write the failing tests**

In `backend/tests/Feature/PosCheckoutTest.php` replace:

```php
use App\Models\JournalEntry;
use App\Models\ServiceMaster;
use App\Services\Payment\MidtransQrisService;
```

with:

```php
use App\Models\JournalEntry;
use App\Models\QrisTransaction;
use App\Models\SalePayment;
use App\Models\ServiceMaster;
```

Replace the whole method `test_qris_reference_must_be_settled` (as left by B3) with:

```php
    public function test_qris_reference_must_be_settled(): void
    {
        $product = $this->makeProduct();
        $provider = $this->paymentProvider('qris');
        $pay = fn (string $orderId) => [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $provider->id, 'reference' => $orderId]],
        ];

        $this->checkout($pay('POS-UNKNOWN-'.uniqid()))->assertStatus(422)
            ->assertJsonPath('message', 'Pembayaran QRIS belum diterima (status: tidak ditemukan).');
        $this->checkout($pay($this->qrisOrder(1000000, 'pending')))->assertStatus(422)
            ->assertJsonPath('message', 'Pembayaran QRIS belum diterima (status: pending).');
        $this->assertSame(10, $product->fresh()->product_quantity);

        $orderId = $this->qrisOrder(1000000);
        $res = $this->checkout($pay($orderId))->assertCreated()->assertJsonPath('data.payments.0.reference', $orderId);

        $this->assertEquals(
            SalePayment::where('sale_id', $res->json('data.id'))->value('id'),
            QrisTransaction::where('order_id', $orderId)->value('sale_payment_id')
        );
    }

    public function test_settled_qris_order_backs_only_one_sale(): void
    {
        $product = $this->makeProduct();
        $orderId = $this->qrisOrder(1000000);
        $payload = [
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $this->paymentProvider('qris')->id, 'reference' => $orderId]],
        ];

        $this->checkout($payload)->assertCreated();
        $this->checkout($payload)->assertStatus(422)
            ->assertJsonPath('message', "Pembayaran QRIS {$orderId} sudah dipakai untuk nota lain.");

        $this->assertSame(9, $product->fresh()->product_quantity);
    }

    public function test_qris_amount_must_equal_the_settled_amount(): void
    {
        $product = $this->makeProduct();
        $orderId = $this->qrisOrder(900000);

        $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [['method' => 'QRIS', 'amount' => 1000000, 'provider_id' => $this->paymentProvider('qris')->id, 'reference' => $orderId]],
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Nominal QRIS yang lunas (Rp 900.000) tidak sama dengan nominal pembayaran QRIS (Rp 1.000.000).');

        $this->assertNull(QrisTransaction::where('order_id', $orderId)->value('sale_payment_id'));
        $this->assertSame(10, $product->fresh()->product_quantity);
    }

    public function test_one_qris_order_cannot_pay_two_rows_of_one_sale(): void
    {
        $product = $this->makeProduct();
        $provider = $this->paymentProvider('qris');
        $orderId = $this->qrisOrder(500000);
        $row = ['method' => 'QRIS', 'amount' => 500000, 'provider_id' => $provider->id, 'reference' => $orderId];

        $this->checkout([
            'items' => [$this->productLine($product)],
            'payments' => [$row, $row],
        ])->assertStatus(422)->assertJsonPath('message', "Pembayaran QRIS {$orderId} sudah dipakai untuk nota lain.");

        $this->assertSame(10, $product->fresh()->product_quantity);
    }
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `cd backend && php artisan config:clear && php artisan test --filter=PosCheckoutTest`
Expected: FAIL — unknown/pending orders get "(status: pending)" from the Midtrans status fallback (no key → pending) instead of the table check, the second sale with the same order is created (201), the amount mismatch is accepted, `sale_payment_id` stays null.

- [ ] **Step 4: Claim the order in `CheckoutService`**

In `backend/app/Services/Pos/CheckoutService.php` replace:

```php
use App\Models\PaymentProviderSetting;
use App\Models\Sale;
```

with:

```php
use App\Models\PaymentProviderSetting;
use App\Models\QrisTransaction;
use App\Models\Sale;
```

Replace:

```php
use App\Services\JournalDraft;
use App\Services\Payment\MidtransQrisService;
use Illuminate\Support\Facades\DB;
```

with:

```php
use App\Services\JournalDraft;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
```

Replace:

```php
    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
        private readonly MidtransQrisService $qris,
    ) {
    }
```

with:

```php
    public function __construct(
        private readonly FifoCostingService $fifo,
        private readonly AccountingEngine $engine,
    ) {
    }
```

Replace:

```php
            foreach ($payments as $payment) {
                SalePayment::create(['sale_id' => $sale->id] + $payment);
            }
```

with:

```php
            foreach ($payments as $payment) {
                $salePayment = SalePayment::create(['sale_id' => $sale->id] + Arr::except($payment, 'qris_transaction'));
                // Order QRIS terkunci ke baris ini selamanya (juga setelah void): satu pelunasan, satu nota.
                $payment['qris_transaction']?->update(['sale_payment_id' => $salePayment->id]);
            }
```

Replace the whole `buildPayments` method (as written in B3) with:

```php
    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildPayments(array $input, float $amountDue): array
    {
        $payments = [];
        $claimed = [];
        foreach ($input as $row) {
            $method = $row['method'];
            $amount = round((float) $row['amount'], 2);
            $provider = $this->provider($method, $row['provider_id'] ?? null);
            // Hanya QRIS yang kena MDR (beban toko), dihitung dari pengaturan provider di server.
            $fee = $method === 'QRIS'
                ? $provider->calculateQrisFee($amount)
                : ['fee_percentage' => 0.0, 'fee_amount' => 0.0];

            $tendered = $amount;
            if ($method === 'TUNAI') {
                $tendered = round((float) ($row['tendered'] ?? $amount), 2);
                if ($tendered < $amount) {
                    throw new PosRuleException('Uang tunai yang diterima kurang dari nominal pembayaran tunai.');
                }
            }

            // QRIS dinamis (ada nomor order Midtrans) harus lunas dan dipakai sekali. QRIS statis tanpa nomor order
            // dicatat atas konfirmasi kasir; pemeriksaannya lewat rekonsiliasi bank 1-1001.
            $qris = null;
            if ($method === 'QRIS' && ! empty($row['reference'])) {
                $qris = $this->claimQris($row['reference'], $amount, $claimed);
                $claimed[] = $row['reference'];
            }

            $payments[] = [
                'method' => $method,
                'account_code' => PosAccounts::forMethod($method),
                'amount' => $amount,
                'tendered_amount' => $tendered,
                'change_amount' => round($tendered - $amount, 2),
                'fee_percentage' => (float) $fee['fee_percentage'],
                'fee_amount' => (float) $fee['fee_amount'],
                'net_received' => round($amount - (float) $fee['fee_amount'], 2),
                'provider_name' => $provider?->provider_name,
                'reference' => $row['reference'] ?? null,
                'qris_transaction' => $qris,
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
     * Order QRIS Midtrans harus sudah lunas di qris_transactions (webhook, cek status, atau simulasi demo), belum
     * dipakai nota lain (juga tidak dua kali di checkout ini), dan nominal lunasnya sama dengan baris pembayaran.
     * Baris dikunci sampai transaksi selesai agar dua checkout bersamaan tidak memakai order yang sama.
     *
     * @param  array<int, string>  $claimed  order yang sudah dipakai baris sebelumnya di checkout ini
     */
    private function claimQris(string $orderId, float $amount, array $claimed): QrisTransaction
    {
        $tx = QrisTransaction::where('order_id', $orderId)->lockForUpdate()->first();

        if (! $tx || ! $tx->isSettled()) {
            throw new PosRuleException('Pembayaran QRIS belum diterima (status: '.($tx?->transaction_status ?? 'tidak ditemukan').').');
        }
        if ($tx->sale_payment_id || in_array($orderId, $claimed, true)) {
            throw new PosRuleException("Pembayaran QRIS {$orderId} sudah dipakai untuk nota lain.");
        }
        if (abs((float) $tx->gross_amount - $amount) > 0.001) {
            throw new PosRuleException(
                'Nominal QRIS yang lunas (Rp '.number_format((float) $tx->gross_amount, 0, ',', '.').') tidak sama dengan nominal pembayaran QRIS (Rp '.number_format($amount, 0, ',', '.').').'
            );
        }

        return $tx;
    }
```

(The `provider()` method written in B3 stays as it is, below `buildPayments`.)

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && php artisan config:clear && php artisan test --filter="PosCheckoutTest|PosVoidTest"`
Expected: PASS.

- [ ] **Step 6: Run the backend gate**

Run: `cd backend && php artisan config:clear && php artisan test`
Expected: all pass, 206 tests. Also confirm no code still uses the old cache key: `grep -rn "midtrans_sim_" backend/app backend/tests` → no output.

- [ ] **Step 7: Commit**

```bash
git status --short
git add backend/app/Services/Pos/CheckoutService.php backend/tests/Concerns/CreatesPosFixtures.php backend/tests/Feature/PosCheckoutTest.php
git commit -m "fix(pos): let one settled qris order pay only one sale at its amount

Checkout only asked whether an order was settled, so one Midtrans payment
could back any number of sales at any amount. It now locks the recorded
settlement, compares the settled amount and links it to the payment row.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part F — Frontend

### Task F1: POS terminal uses server providers and sends `provider_id`

**Files:**
- Modify: `src/services/api/paymentApi.ts` (full replacement), `src/services/api/posMappers.ts`, `src/shared/types/index.ts`, `src/modules/pos/components/CheckoutModal.tsx`, `src/modules/pos/components/QrisDynamicModal.tsx`, `src/modules/pos/PosScreen.tsx`
- Test: `src/services/__tests__/posMappers.test.ts`

**Interfaces:**
- Consumes (B1–B4): `GET /pos/payment-options` → `data.{bank_providers, qris_providers}` rows `{id, method_type, provider_name, provider_code, fee_percentage: "0.30", fee_threshold_amount: "500000.00", is_active}`; checkout `payments[].provider_id`; charge `data.simulation_enabled`.
- Produces: `ApiPaymentProvider`, `mapPaymentProvider(p: ApiPaymentProvider): PaymentProviderSetting` (in `posMappers.ts`); `PaymentPayload` = `{method, amount, tendered?, provider_id?, reference?}`; `CheckoutPaymentMeta.provider_id?: number`; `SplitPaymentLine.provider_id?: number`; `paymentApi.getPaymentOptions(): Promise<PaymentOptions>`; `QrisChargeResponse.simulation_enabled?: boolean`; `CheckoutModal` no longer takes `storeSettings`.

- [ ] **Step 1: Write the failing tests**

In `src/services/__tests__/posMappers.test.ts` replace:

```ts
import { ApiSale, buildPayments, cartLineToPayload, mapSaleToTransaction, serviceCartProduct } from '../api/posMappers';
```

with:

```ts
import { ApiSale, buildPayments, cartLineToPayload, mapPaymentProvider, mapSaleToTransaction, serviceCartProduct } from '../api/posMappers';
```

Replace:

```ts
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
```

with:

```ts
  it('single cash keeps tendered amount for change', () => {
    const rows = buildPayments('TUNAI', 950000, 1000000, { provider_id: 3 });
    expect(rows).toEqual([expect.objectContaining({ method: 'TUNAI', amount: 950000, tendered: 1000000 })]);
    expect(rows[0].provider_id).toBeUndefined();
  });

  it('sends the server provider id and never a client fee or provider name', () => {
    const [row] = buildPayments('QRIS', 900000, 0, {
      provider_id: 3, provider_name: 'BCA', fee_percentage: 0.7, fee_amount: 6300, reference: 'POS-1',
    });
    expect(row).toEqual({ method: 'QRIS', amount: 900000, tendered: undefined, provider_id: 3, reference: 'POS-1' });
    expect(row).not.toHaveProperty('fee_percentage');
    expect(row).not.toHaveProperty('provider_name');
  });

  it('split overpay becomes change taken from the cash row', () => {
    const rows = buildPayments('SPLIT', 1000000, 0, {
      split_payments: [
        { id: 'a', method: 'TUNAI', amount: 500000 },
        { id: 'b', method: 'QRIS', provider_name: 'BCA', provider_id: 5, amount: 600000, fee_percentage: 0.3, fee_amount: 1800 },
      ],
    });
    expect(rows).toEqual([
      expect.objectContaining({ method: 'TUNAI', amount: 400000, tendered: 500000 }),
      expect.objectContaining({ method: 'QRIS', amount: 600000, provider_id: 5 }),
    ]);
    rows.forEach((row) => expect(row).not.toHaveProperty('fee_percentage'));
  });
```

Replace:

```ts
describe('mapSaleToTransaction', () => {
```

with:

```ts
describe('mapPaymentProvider', () => {
  it('turns server decimal strings into numbers', () => {
    expect(
      mapPaymentProvider({
        id: 4, method_type: 'qris', provider_name: 'BCA', provider_code: null,
        fee_percentage: '0.30', fee_threshold_amount: '500000.00', is_active: true,
      })
    ).toEqual({
      id: 4, method_type: 'qris', provider_name: 'BCA', provider_code: undefined,
      fee_percentage: 0.3, fee_threshold_amount: 500000, is_active: true,
    });
  });
});

describe('mapSaleToTransaction', () => {
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/services/__tests__/posMappers.test.ts`
Expected: FAIL — `mapPaymentProvider` is not exported; rows still carry `fee_percentage`/`provider_name` and no `provider_id`.

- [ ] **Step 3: Update the types and mappers**

In `src/shared/types/index.ts` replace:

```ts
export interface SplitPaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
  provider_name?: string;
```

with:

```ts
export interface SplitPaymentLine {
  id: string;
  method: PaymentMethod;
  amount: number;
  provider_name?: string;
  provider_id?: number; // id payment_provider_settings di server (fee dihitung server)
```

In `src/services/api/posMappers.ts` replace:

```ts
  PaymentMethod,
  PosTransaction,
```

with:

```ts
  PaymentMethod,
  PaymentProviderSetting,
  PosTransaction,
```

Replace:

```ts
export interface PaymentPayload {
  method: 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS';
  amount: number;
  tendered?: number;
  fee_percentage?: number;
  provider_name?: string;
  reference?: string;
}
```

with:

```ts
/** Fee MDR dan nama provider dihitung server dari provider_id (payment_provider_settings); klien tidak mengirimnya. */
export interface PaymentPayload {
  method: 'TUNAI' | 'TRANSFER' | 'TRANSFER_BCA' | 'QRIS';
  amount: number;
  tendered?: number;
  provider_id?: number;
  reference?: string;
}
```

Replace:

```ts
export interface CheckoutPaymentMeta {
  provider_name?: string;
```

with:

```ts
export interface CheckoutPaymentMeta {
  provider_id?: number;
  provider_name?: string;
```

Replace the whole `buildPayments` function (from the `/**` comment `Susun baris pembayaran dari hasil CheckoutModal.` through the function's closing `};`) with:

```ts
/**
 * Susun baris pembayaran dari hasil CheckoutModal. Klien hanya menyebut provider (provider_id);
 * persentase dan nominal fee MDR dihitung server dari pengaturan provider yang sama.
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
        provider_id: m === 'TUNAI' ? undefined : row.provider_id,
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
      provider_id: m === 'TUNAI' ? undefined : meta.provider_id,
      reference: meta.reference,
    },
  ];
};
```

Append to the end of `src/services/api/posMappers.ts`:

```ts

// ---------------------------------------------------------------------------
// Provider pembayaran (payment_provider_settings)
// ---------------------------------------------------------------------------

/** Baris payment_provider_settings dari server; kolom desimal datang sebagai string ("0.30"). */
export interface ApiPaymentProvider {
  id: number;
  method_type: 'bank' | 'qris';
  provider_name: string;
  provider_code?: string | null;
  fee_percentage: number | string;
  fee_threshold_amount: number | string;
  is_active: boolean;
}

export const mapPaymentProvider = (p: ApiPaymentProvider): PaymentProviderSetting => ({
  id: p.id,
  method_type: p.method_type,
  provider_name: p.provider_name,
  provider_code: p.provider_code ?? undefined,
  fee_percentage: num(p.fee_percentage),
  fee_threshold_amount: num(p.fee_threshold_amount),
  is_active: !!p.is_active,
});
```

- [ ] **Step 4: Replace `paymentApi.ts`**

Replace `src/services/api/paymentApi.ts` with:

```ts
import { apiClient } from './apiClient';
import { PaymentProviderSetting } from '../../shared/types';
import { ApiPaymentProvider, mapPaymentProvider } from './posMappers';

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface QrisChargeResponse {
  order_id: string;
  gross_amount: number;
  transaction_id?: string;
  transaction_status: string;
  qr_string: string;
  qr_url?: string | null;
  expiry_time?: string;
  is_fallback?: boolean;
  /** Server mengizinkan simulasi lunas (hanya demo sandbox, MIDTRANS_ALLOW_SIMULATION). */
  simulation_enabled?: boolean;
}

export interface QrisStatusResponse {
  order_id: string;
  transaction_status: 'pending' | 'settlement' | 'expire' | 'cancel' | 'deny';
  payment_type?: string;
  gross_amount?: number;
  settlement_time?: string | null;
  is_simulated?: boolean;
}

export interface PaymentOptions {
  bank_providers: PaymentProviderSetting[];
  qris_providers: PaymentProviderSetting[];
}

// Status pembayaran QRIS hanya berasal dari server; tidak ada fallback lokal,
// karena checkout server memverifikasi ulang order (lunas, nominal, sekali pakai) sebelum membukukan nota.
export const paymentApi = {
  chargeQris: (orderId: string, grossAmount: number, customerName?: string) =>
    apiClient.post<{ success: boolean; message: string; data: QrisChargeResponse }>('/payment/qris/charge', {
      order_id: orderId,
      gross_amount: grossAmount,
      customer_name: customerName,
    }),

  checkQrisStatus: (orderId: string) =>
    apiClient.get<{ success: boolean; data: QrisStatusResponse }>(`/payment/qris/status/${orderId}`),

  simulateQrisPayment: (orderId: string) =>
    apiClient.post<{ success: boolean; data: QrisStatusResponse }>(`/payment/qris/simulate/${orderId}`),

  /** Rekening transfer dan provider QRIS aktif untuk kasir; fee MDR checkout dihitung server dari data yang sama. */
  getPaymentOptions: async (): Promise<PaymentOptions> => {
    const { data } = await apiClient.get<Envelope<{ bank_providers: ApiPaymentProvider[]; qris_providers: ApiPaymentProvider[] }>>(
      '/pos/payment-options'
    );
    return {
      bank_providers: data.bank_providers.map(mapPaymentProvider),
      qris_providers: data.qris_providers.map(mapPaymentProvider),
    };
  },
};
```

- [ ] **Step 5: Wire `CheckoutModal` to the server providers**

In `src/modules/pos/components/CheckoutModal.tsx` replace:

```tsx
import { CartItem, PaymentMethod, StoreSettings, SplitPaymentLine } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';
import { INITIAL_BANK_PROVIDERS, INITIAL_QRIS_PROVIDERS } from '../../../shared/data/mockData';
import { QrisDynamicModal } from './QrisDynamicModal';
```

with:

```tsx
import { CartItem, PaymentMethod, PaymentProviderSetting, SplitPaymentLine } from '../../../shared/types';
import { formatRupiah } from '../../../shared/utils/formatters';
import { paymentApi, PaymentOptions } from '../../../services/api/paymentApi';
import { useServerData } from '../../accounting/hooks/useServerData';
import { QrisDynamicModal } from './QrisDynamicModal';
```

Replace:

```tsx
  netPayable: number;
  storeSettings?: StoreSettings;
  onPrintPhysicalNota: () => void;
```

with:

```tsx
  netPayable: number;
  onPrintPhysicalNota: () => void;
```

Replace:

```tsx
    paymentMeta?: {
      provider_name?: string;
```

with:

```tsx
    paymentMeta?: {
      provider_id?: number;
      provider_name?: string;
```

Replace:

```tsx
  netPayable,
  storeSettings,
  onPrintPhysicalNota,
```

with:

```tsx
  netPayable,
  onPrintPhysicalNota,
```

Replace:

```tsx
  const bankOptions = (storeSettings?.bank_providers || INITIAL_BANK_PROVIDERS).filter((b) => b.is_active);
  const qrisOptions = (storeSettings?.qris_providers || INITIAL_QRIS_PROVIDERS).filter((q) => q.is_active);
```

with:

```tsx
  // Provider transfer & QRIS dari server: fee MDR yang tampil sama dengan yang dibukukan checkout.
  const paymentOptions = useServerData<PaymentOptions | null>(
    () => (isOpen ? paymentApi.getPaymentOptions() : Promise.resolve(null)),
    [isOpen]
  );
  const bankOptions = (paymentOptions.data?.bank_providers ?? []).filter((b) => b.is_active);
  const qrisOptions = (paymentOptions.data?.qris_providers ?? []).filter((q) => q.is_active);

  /** Id provider server untuk nama pilihan kasir; QRIS jatuh ke provider pertama, sama seperti hitungan fee. */
  const providerIdOf = (options: PaymentProviderSetting[], name?: string, fallbackToFirst = false): number | undefined => {
    const found = options.find((o) => o.provider_name === name) ?? (fallbackToFirst ? options[0] : undefined);
    return found ? Number(found.id) : undefined;
  };
```

Replace:

```tsx
    onConfirmCheckout('QRIS', netPayable, transactionNotes.trim() || undefined, {
      provider_name: 'Midtrans QRIS',
      reference: qrisOrderId,
```

with:

```tsx
    onConfirmCheckout('QRIS', netPayable, transactionNotes.trim() || undefined, {
      provider_id: providerIdOf(qrisOptions, selectedQris, true),
      reference: qrisOrderId,
```

Replace:

```tsx
      const generatedOrderId = `POS-${Date.now().toString().slice(-8)}`;
```

with:

```tsx
      // Nomor order unik penuh: server menolak order QRIS yang sudah dipakai nota lain.
      const generatedOrderId = `POS-${Date.now()}`;
```

Replace:

```tsx
        const calcs = calculateRowMeta(row);
        return {
          ...row,
          fee_percentage: calcs.feePct,
```

with:

```tsx
        const calcs = calculateRowMeta(row);
        return {
          ...row,
          provider_id:
            row.method === 'QRIS'
              ? providerIdOf(qrisOptions, row.provider_name, true)
              : row.method === 'TUNAI'
              ? undefined
              : providerIdOf(bankOptions, row.provider_name),
          fee_percentage: calcs.feePct,
```

Replace:

```tsx
        provider_name: isTransfer ? selectedBank : paymentMethod === 'QRIS' ? selectedQris : undefined,
        fee_percentage: paymentMethod === 'QRIS' ? qrisFeePct : 0,
```

with:

```tsx
        provider_id: isTransfer
          ? providerIdOf(bankOptions, selectedBank)
          : paymentMethod === 'QRIS'
          ? providerIdOf(qrisOptions, selectedQris, true)
          : undefined,
        provider_name: isTransfer ? selectedBank : paymentMethod === 'QRIS' ? selectedQris : undefined,
        fee_percentage: paymentMethod === 'QRIS' ? qrisFeePct : 0,
```

Show the QRIS provider picker for both modes. Replace:

```tsx
                          {qrisFlowType === 'DYNAMIC' ? (
                            <div className="bg-white/80 p-3 rounded-xl border border-cyan-200 space-y-2">
```

with:

```tsx
                          {qrisFlowType === 'DYNAMIC' && (
                            <div className="bg-white/80 p-3 rounded-xl border border-cyan-200 space-y-2">
```

and replace:

```tsx
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <span className="text-[11px] font-semibold text-cyan-800 block">
                                Pilih Rekening Merchant QRIS:
                              </span>
```

with:

```tsx
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Provider menentukan potongan MDR yang dihitung server, di mode dinamis maupun statis. */}
                          <div className="space-y-2">
                              <span className="text-[11px] font-semibold text-cyan-800 block">
                                Provider QRIS (menentukan potongan MDR):
                              </span>
                              {paymentOptions.error && (
                                <span className="text-[11px] font-semibold text-rose-700 block">
                                  Gagal memuat provider pembayaran: {paymentOptions.error}
                                </span>
                              )}
```

and replace (the end of that same picker block):

```tsx
                                    {qris.provider_name} ({qris.fee_percentage}%)
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
```

with:

```tsx
                                    {qris.provider_name} ({qris.fee_percentage}%)
                                  </button>
                                ))}
                              </div>
                          </div>
```

In `src/modules/pos/PosScreen.tsx` replace:

```tsx
        netPayable={netPayable}
        storeSettings={storeSettings}
        onPrintPhysicalNota={handlePrintCurrentCartNota}
```

with:

```tsx
        netPayable={netPayable}
        onPrintPhysicalNota={handlePrintCurrentCartNota}
```

- [ ] **Step 6: Hide the demo bar unless the server allows simulation**

In `src/modules/pos/components/QrisDynamicModal.tsx` replace:

```tsx
          {/* Sandbox & Demo Assist Bar */}
          {!isLoading && !isSettled && (
```

with:

```tsx
          {/* Sandbox & Demo Assist Bar: hanya bila server mengizinkan simulasi (MIDTRANS_ALLOW_SIMULATION) */}
          {!isLoading && !isSettled && chargeData?.simulation_enabled && (
```

- [ ] **Step 7: Run the tests and the frontend gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; Vitest all pass, 128 tests.
Also run `grep -rn "INITIAL_BANK_PROVIDERS\|INITIAL_QRIS_PROVIDERS\|fee_percentage: num(row\|Midtrans QRIS'" src --include=*.ts --include=*.tsx` → only `src/shared/data/mockData.ts` (removed in F2).

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/services/api/paymentApi.ts src/services/api/posMappers.ts src/shared/types/index.ts \
        src/modules/pos/components/CheckoutModal.tsx src/modules/pos/components/QrisDynamicModal.tsx \
        src/modules/pos/PosScreen.tsx src/services/__tests__/posMappers.test.ts
git commit -m "feat(pos): send the server payment provider instead of a client fee

The cashier screen read QRIS fees from browser settings while the server now
books the MDR from its own provider table. It loads providers from the server,
sends provider_id and shows the demo bar only when simulation is allowed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task F2: Settings edit the server payment providers

**Files:**
- Modify: `src/services/api/paymentApi.ts`, `src/modules/settings/components/PaymentMethodsTab.tsx`, `src/shared/types/index.ts`, `src/shared/data/mockData.ts`, `src/App.tsx`
- Test: `src/modules/settings/__tests__/financialsSettingsAudit.test.ts`

**Interfaces:**
- Consumes (F1): `paymentApi` object and `PaymentOptions`, `mapPaymentProvider`, `ApiPaymentProvider`.
- Consumes (backend, unchanged): `GET/POST /settings/payment-providers`, `PUT/DELETE /settings/payment-providers/{id}` (writes need `role_settings`).
- Produces: `PaymentProviderInput`; `paymentApi.listProviders(): Promise<PaymentProviderSetting[]>`, `createProvider(input)`, `updateProvider(id, input)`, `deleteProvider(id)`. `StoreSettings` no longer has `bank_providers`/`qris_providers`; `INITIAL_BANK_PROVIDERS`/`INITIAL_QRIS_PROVIDERS` deleted.

- [ ] **Step 1: Write the failing test**

In `src/modules/settings/__tests__/financialsSettingsAudit.test.ts` replace:

```ts
  it('should have non-empty INITIAL_TRANSACTIONS with valid invoice structure and zero banned terms', () => {
```

with:

```ts
  it('keeps payment providers on the server, not in the store settings', () => {
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('bank_providers');
    expect(Object.keys(INITIAL_STORE_SETTINGS)).not.toContain('qris_providers');
  });

  it('should have non-empty INITIAL_TRANSACTIONS with valid invoice structure and zero banned terms', () => {
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/modules/settings/__tests__/financialsSettingsAudit.test.ts`
Expected: FAIL — `INITIAL_STORE_SETTINGS` contains `bank_providers`.

- [ ] **Step 3: Add the provider CRUD calls**

In `src/services/api/paymentApi.ts` replace:

```ts
export interface PaymentOptions {
  bank_providers: PaymentProviderSetting[];
  qris_providers: PaymentProviderSetting[];
}
```

with:

```ts
export interface PaymentOptions {
  bank_providers: PaymentProviderSetting[];
  qris_providers: PaymentProviderSetting[];
}

/** Kolom yang boleh dikirim ke /settings/payment-providers (method_type hanya saat membuat). */
export interface PaymentProviderInput {
  method_type?: 'bank' | 'qris';
  provider_name?: string;
  provider_code?: string | null;
  fee_percentage?: number;
  fee_threshold_amount?: number;
  is_active?: boolean;
}
```

and replace:

```ts
    return {
      bank_providers: data.bank_providers.map(mapPaymentProvider),
      qris_providers: data.qris_providers.map(mapPaymentProvider),
    };
  },
};
```

with:

```ts
    return {
      bank_providers: data.bank_providers.map(mapPaymentProvider),
      qris_providers: data.qris_providers.map(mapPaymentProvider),
    };
  },

  // Master provider untuk layar Pengaturan (tulis butuh izin role_settings).
  listProviders: async (): Promise<PaymentProviderSetting[]> =>
    (await apiClient.get<Envelope<ApiPaymentProvider[]>>('/settings/payment-providers')).data.map(mapPaymentProvider),

  createProvider: async (input: PaymentProviderInput): Promise<PaymentProviderSetting> =>
    mapPaymentProvider((await apiClient.post<Envelope<ApiPaymentProvider>>('/settings/payment-providers', input)).data),

  updateProvider: async (id: string | number, input: PaymentProviderInput): Promise<PaymentProviderSetting> =>
    mapPaymentProvider((await apiClient.put<Envelope<ApiPaymentProvider>>(`/settings/payment-providers/${id}`, input)).data),

  deleteProvider: (id: string | number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/settings/payment-providers/${id}`),
};
```

- [ ] **Step 4: Move `PaymentMethodsTab` to the server**

In `src/modules/settings/components/PaymentMethodsTab.tsx` replace everything from the first line through the line `  const handleDeleteQris = ...` block's closing `  };` (i.e. the imports, props, state and all handlers — the file up to, not including, `  return (`) with:

```tsx
import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Building2, 
  QrCode, 
  Sliders,
  Info, 
  AlertCircle
} from 'lucide-react';
import { PaymentProviderSetting, StoreSettings } from '../../../shared/types';
import { useToast } from '../../../shared/components';
import { paymentApi } from '../../../services/api/paymentApi';

interface PaymentMethodsTabProps {
  settings: StoreSettings;
  onUpdateSettings: (updater: (prev: StoreSettings) => StoreSettings) => void;
}

export const PaymentMethodsTab: React.FC<PaymentMethodsTabProps> = ({
  settings,
  onUpdateSettings,
}) => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'bank' | 'qris' | 'account'>('bank');

  // Local state for adding Bank
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankActive, setNewBankActive] = useState(true);

  // Local state for adding QRIS
  const [newQrisName, setNewQrisName] = useState('');
  const [newQrisCode, setNewQrisCode] = useState('');
  const [newQrisFee, setNewQrisFee] = useState<number>(0.30);
  const [newQrisThreshold, setNewQrisThreshold] = useState<number>(500000);
  const [newQrisActive, setNewQrisActive] = useState(true);

  // Bank transfer & provider QRIS disimpan di server (payment_provider_settings): checkout menghitung MDR dari sini.
  const [providers, setProviders] = useState<PaymentProviderSetting[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const reloadProviders = async () => {
    try {
      setProviders(await paymentApi.listProviders());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat provider pembayaran dari server.');
    }
  };

  useEffect(() => {
    reloadProviders();
  }, []);

  const bankProviders = providers.filter((p) => p.method_type === 'bank');
  const qrisProviders = providers.filter((p) => p.method_type === 'qris');

  /** Jalankan perubahan di server lalu muat ulang, agar tabel selalu sama dengan data server. */
  const saveToServer = async (action: () => Promise<unknown>, successTitle?: string, successMessage?: string) => {
    try {
      await action();
      if (successTitle) toast.success(successTitle, successMessage);
    } catch (err) {
      toast.error('Gagal Menyimpan Provider', err instanceof Error ? err.message : 'Terjadi kesalahan pada server.');
    }
    await reloadProviders();
  };

  /** Ketikan di tabel hanya mengubah tampilan; baris disimpan ke server saat input kehilangan fokus. */
  const editLocal = (id: string | number, patch: Partial<PaymentProviderSetting>) =>
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const handleSaveRow = (row: PaymentProviderSetting) =>
    saveToServer(() =>
      paymentApi.updateProvider(row.id, {
        provider_name: row.provider_name.trim(),
        provider_code: row.provider_code?.trim() || null,
        fee_percentage: row.fee_percentage ?? 0,
        fee_threshold_amount: row.fee_threshold_amount ?? 0,
      })
    );

  const handleToggleActive = (id: string | number) => {
    const row = providers.find((p) => p.id === id);
    if (row) saveToServer(() => paymentApi.updateProvider(id, { is_active: !row.is_active }));
  };

  // ==================== BANK HANDLERS ====================
  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      toast.warning('Nama Bank Wajib', 'Masukkan nama bank transfer yang valid.');
      return;
    }

    const exists = bankProviders.some(
      (b) => b.provider_name.toLowerCase() === newBankName.trim().toLowerCase()
    );
    if (exists) {
      toast.warning('Bank Sudah Ada', `Bank "${newBankName.trim()}" sudah terdaftar.`);
      return;
    }

    const name = newBankName.trim();
    await saveToServer(
      () =>
        paymentApi.createProvider({
          method_type: 'bank',
          provider_name: name,
          provider_code: newBankCode.trim().toUpperCase() || name.toUpperCase(),
          fee_percentage: 0,
          fee_threshold_amount: 0,
          is_active: newBankActive,
        }),
      'Bank Ditambahkan',
      `Bank transfer ${name} berhasil ditambahkan.`
    );

    setNewBankName('');
    setNewBankCode('');
    setNewBankActive(true);
  };

  const handleToggleBankActive = handleToggleActive;

  const handleUpdateBankField = (id: string | number, field: 'provider_name' | 'provider_code', val: string) => {
    editLocal(id, { [field]: val } as Partial<PaymentProviderSetting>);
  };

  const handleDeleteBank = (id: string | number, name: string) => {
    if (!window.confirm(`Hapus bank "${name}" dari master transfer bank?`)) return;
    saveToServer(() => paymentApi.deleteProvider(id), 'Bank Dihapus', `Bank ${name} telah dihapus dari sistem.`);
  };

  // ==================== QRIS HANDLERS ====================
  const handleAddQris = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQrisName.trim()) {
      toast.warning('Nama Provider Wajib', 'Masukkan nama provider QRIS yang valid.');
      return;
    }

    const exists = qrisProviders.some(
      (q) => q.provider_name.toLowerCase() === newQrisName.trim().toLowerCase()
    );
    if (exists) {
      toast.warning('Provider Sudah Ada', `Provider QRIS "${newQrisName.trim()}" sudah terdaftar.`);
      return;
    }

    const name = newQrisName.trim();
    await saveToServer(
      () =>
        paymentApi.createProvider({
          method_type: 'qris',
          provider_name: name,
          provider_code: newQrisCode.trim().toUpperCase() || name.toUpperCase(),
          fee_percentage: Number(newQrisFee) || 0,
          fee_threshold_amount: Number(newQrisThreshold) || 0,
          is_active: newQrisActive,
        }),
      'Provider QRIS Ditambahkan',
      `Provider ${name} berhasil ditambahkan.`
    );

    setNewQrisName('');
    setNewQrisCode('');
    setNewQrisFee(0.30);
    setNewQrisThreshold(500000);
    setNewQrisActive(true);
  };

  const handleToggleQrisActive = handleToggleActive;

  const handleUpdateQrisField = (
    id: string | number,
    field: 'provider_name' | 'provider_code' | 'fee_percentage' | 'fee_threshold_amount',
    val: any
  ) => {
    editLocal(id, { [field]: val } as Partial<PaymentProviderSetting>);
  };

  const handleDeleteQris = (id: string | number, name: string) => {
    if (!window.confirm(`Hapus provider QRIS "${name}"?`)) return;
    saveToServer(() => paymentApi.deleteProvider(id), 'Provider QRIS Dihapus', `Provider ${name} telah dihapus.`);
  };

```

Then, in the JSX of the same file, add a notice and the load error above the bank sub-tab. Replace:

```tsx
      {activeSubTab === 'bank' && (
```

with:

```tsx
      <p className="text-[11px] text-slate-500">
        Bank transfer dan provider QRIS langsung tersimpan di server dan dipakai checkout untuk menghitung potongan MDR.
        Rekening Utama Nota tetap disimpan lewat tombol Simpan pengaturan.
      </p>
      {loadError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {activeSubTab === 'bank' && (
```

Save edited rows on blur. Make these six replacements (each `before` line is unique in the file):

1. `                            onChange={(e) => handleUpdateBankField(b.id, 'provider_name', e.target.value)}` →
```tsx
                            onChange={(e) => handleUpdateBankField(b.id, 'provider_name', e.target.value)}
                            onBlur={() => handleSaveRow(b)}
```
2. `                            onChange={(e) => handleUpdateBankField(b.id, 'provider_code', e.target.value)}` →
```tsx
                            onChange={(e) => handleUpdateBankField(b.id, 'provider_code', e.target.value)}
                            onBlur={() => handleSaveRow(b)}
```
3. `                            onChange={(e) => handleUpdateQrisField(q.id, 'provider_name', e.target.value)}` →
```tsx
                            onChange={(e) => handleUpdateQrisField(q.id, 'provider_name', e.target.value)}
                            onBlur={() => handleSaveRow(q)}
```
4. `                            onChange={(e) => handleUpdateQrisField(q.id, 'provider_code', e.target.value)}` →
```tsx
                            onChange={(e) => handleUpdateQrisField(q.id, 'provider_code', e.target.value)}
                            onBlur={() => handleSaveRow(q)}
```
5. `                              onChange={(e) => handleUpdateQrisField(q.id, 'fee_percentage', parseFloat(e.target.value) || 0)}` →
```tsx
                              onChange={(e) => handleUpdateQrisField(q.id, 'fee_percentage', parseFloat(e.target.value) || 0)}
                              onBlur={() => handleSaveRow(q)}
```
6. `                            onChange={(e) => handleUpdateQrisField(q.id, 'fee_threshold_amount', parseInt(e.target.value, 10) || 0)}` →
```tsx
                            onChange={(e) => handleUpdateQrisField(q.id, 'fee_threshold_amount', parseInt(e.target.value, 10) || 0)}
                            onBlur={() => handleSaveRow(q)}
```

- [ ] **Step 5: Remove the local provider copies**

In `src/shared/types/index.ts` (interface `StoreSettings`) replace:

```ts
  default_payment_terms_days: number;

  bank_providers?: PaymentProviderSetting[];
  qris_providers?: PaymentProviderSetting[];

```

with:

```ts
  default_payment_terms_days: number;

```

In `src/shared/data/mockData.ts` replace:

```ts
  ItemCategory,
  PaymentProviderSetting,
  PermissionKey,
```

with:

```ts
  ItemCategory,
  PermissionKey,
```

delete the two constants `INITIAL_BANK_PROVIDERS` and `INITIAL_QRIS_PROVIDERS` (from `export const INITIAL_BANK_PROVIDERS: PaymentProviderSetting[] = [` through the `];` closing `INITIAL_QRIS_PROVIDERS`, plus the blank line after it), and in `INITIAL_STORE_SETTINGS` replace:

```ts
  default_payment_terms_days: 30,

  bank_providers: INITIAL_BANK_PROVIDERS,
  qris_providers: INITIAL_QRIS_PROVIDERS,

```

with:

```ts
  default_payment_terms_days: 30,

```

In `src/App.tsx` replace:

```tsx
      // Properti lama dari fitur yang sudah dihapus (spec 2026-09-30) dibuang dari pengaturan tersimpan.
      const { edc_settings: _edc, coa_receivable_account: _receivable, ...settings } = JSON.parse(saved);
```

with:

```tsx
      // Properti lama dibuang dari pengaturan tersimpan: fitur yang dihapus (spec 2026-09-30) dan provider
      // bank/QRIS yang kini hanya ada di server (spec payment hardening).
      const {
        edc_settings: _edc,
        coa_receivable_account: _receivable,
        bank_providers: _banks,
        qris_providers: _qris,
        ...settings
      } = JSON.parse(saved);
```

- [ ] **Step 6: Run the tests and the frontend gate**

Run: `npm run lint && npm test`
Expected: `tsc` clean; Vitest all pass, 129 tests.
Run: `grep -rn "INITIAL_BANK_PROVIDERS\|INITIAL_QRIS_PROVIDERS\|\.bank_providers\|\.qris_providers" src --include=*.ts --include=*.tsx`
Expected: only `paymentApi.ts` (`data.bank_providers` / `data.qris_providers`) and `CheckoutModal.tsx` (`paymentOptions.data?.…`).

- [ ] **Step 7: Commit**

```bash
git status --short
git add src/services/api/paymentApi.ts src/modules/settings/components/PaymentMethodsTab.tsx src/shared/types/index.ts \
        src/shared/data/mockData.ts src/App.tsx src/modules/settings/__tests__/financialsSettingsAudit.test.ts
git commit -m "feat(settings): manage payment providers on the server

Owner edits to bank and QRIS providers only changed browser storage, so they
never reached the fee the server books. The settings tab now uses the
payment-provider endpoints and the local copies are removed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

# Part D — Docs

### Task D1: Update the agent docs, the roadmap and the handoff

**Files:**
- Modify: `AGENTS.md`, `backend/AGENTS.md`, `docs/ai/domain-pos.md`, `docs/ai/api-reference.md`, `docs/ai/data-model.md`, `docs/ai/architecture.md`, `docs/ai/workflow-and-gotchas.md`, `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, `docs/superpowers/plans/2026-09-30-accounting-handoff.md`

**Interfaces:** Consumes the final behaviour of B1–F2. Produces nothing code-facing.

- [ ] **Step 1: `AGENTS.md`**

Replace:

```
| POS checkout (Tunai/Transfer/QRIS, split; every sale paid in full), void, sales history, QRIS | Server | 2 (done) |
```

with:

```
| POS checkout (Tunai/Transfer/QRIS, split; every sale paid in full), void, sales history, QRIS (settlements in `qris_transactions`), payment providers and fees | Server | 2 (done); payment hardening 2026-09-30 |
```

Replace:

```
| Cash drawer balance, store settings, payment fee settings, parked orders, cart | **Client** (localStorage `ob3_*` keys) | not scheduled |
```

with:

```
| Cash drawer balance, store settings (receipt text), parked orders, cart | **Client** (localStorage `ob3_*` keys) | not scheduled |
```

Replace in rule 7:

```
7. **Secrets:** never commit `.env*` (except `.env.example`), seeded passwords, or Midtrans keys.
```

with:

```
7. **Secrets:** never commit `.env*` (except `.env.example`), seeded passwords, or Midtrans keys. There is no
   fallback Midtrans key; the QRIS demo simulation needs `MIDTRANS_ALLOW_SIMULATION=true` (sandbox only).
```

- [ ] **Step 2: `backend/AGENTS.md`**

Replace:

```
  `SANCTUM_EXPIRATION=720` (minutes). Optional: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
  `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_MERCHANT_ID` (see `config/midtrans.php`; a demo sandbox key is the fallback).
```

with:

```
  `SANCTUM_EXPIRATION=720` (minutes). Optional: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
  `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_MERCHANT_ID`, `MIDTRANS_ALLOW_SIMULATION` (see `config/midtrans.php`). There is
  no fallback key: without `MIDTRANS_SERVER_KEY` dynamic QRIS cannot be charged and the webhook rejects everything.
  `MIDTRANS_ALLOW_SIMULATION=true` (ignored in production mode) enables `/payment/qris/simulate` and the fake QR.
```

In the Layout block replace:

```
  Payment/MidtransQrisService.php
```

with:

```
  Payment/MidtransQrisService.php   charge/status/simulate/webhook settlements → qris_transactions
```

- [ ] **Step 3: `docs/ai/domain-pos.md`**

Replace:

```
- `payments[]`, each with `method`, `amount`, `tendered`, `fee_percentage` (0–10), `provider_name`, `reference`.
```

with:

```
- `payments[]`, each with `method`, `amount`, `tendered`, `provider_id` (id in `payment_provider_settings`),
  `reference` (Midtrans order id for dynamic QRIS). `fee_percentage` is `prohibited` (422): the server computes the fee.
```

Replace the item `3. Payments:` of the server flow (its five sub-bullets, from `3. Payments:` through
`   - QRIS with a `reference`: Midtrans status must be `settlement` or `capture`.`) with:

```
3. Payments:
   - Σ`amount` must equal `grand` within 0.001.
   - Cash: `tendered ≥ amount`, change is calculated per row, no fee, `provider_id` ignored.
   - Transfer: optional `provider_id` of an active `bank` provider (its name is stored); no fee.
   - QRIS: `provider_id` of an active `qris` provider is required; fee = `PaymentProviderSetting::calculateQrisFee`
     (`round(amount × pct / 100)` only when `amount > fee_threshold_amount`), `net_received = amount − fee`, MDR to 6-1009.
   - QRIS with a `reference` (dynamic): the `qris_transactions` row is locked and must be `settlement`, unused
     (`sale_payment_id` null, not twice in one checkout) and have `gross_amount` = the row amount; after the insert it
     is linked to the `sale_payments.id` for good (void does not release it). QRIS without a reference (static sticker)
     is cashier-attested; bank reconciliation of 1-1001 is its check.
   - Every transfer and QRIS row is booked to the one bank account 1-1001 (`PosAccounts::forMethod`); the provider
     only labels the bank the money came through.
```

Replace the whole `## QRIS (Midtrans)` section (heading through the `- Frontend: CheckoutModal generates …` bullet) with:

```
## QRIS (Midtrans)
- Config in `backend/config/midtrans.php` (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`,
  `MIDTRANS_ALLOW_SIMULATION`). Sandbox is the default. **No fallback key.** `allow_simulation` is false by default
  and always false in production mode.
- Orders and settlements live in `qris_transactions` (one row per order id, see [data-model.md](data-model.md)).
- `POST /payment/qris/charge` calls Midtrans `/v2/charge` and records the order as `pending` at the requested amount.
  The response has `simulation_enabled`. A Midtrans failure (or no key) is a 422; only with simulation on does it
  return a fake EMV QR (`is_fallback: true`).
- `GET /payment/qris/status/{orderId}` answers a settled row from the DB; otherwise it asks Midtrans and records a
  `settlement`/`capture` answer with Midtrans' `gross_amount` (source `STATUS_API`). Errors count as `pending`.
- `POST /payment/qris/simulate/{orderId}` is 403 unless simulation is on; then it settles an order created by
  `/charge` at its charged amount (source `SIMULATION`), 422 for an unknown order.
- The webhook (`POST /payment/midtrans/webhook`, public) checks `sha512(order_id.status_code.gross_amount.server_key)`
  with `hash_equals` and rejects everything when no server key is set. On settlement or capture it records the
  signed `gross_amount` (source `WEBHOOK`). Settling is idempotent: the first settlement wins.
- Frontend: `CheckoutModal` generates `POS-{Date.now()}`, and `QrisDynamicModal` charges and then polls every 2.5 s;
  its demo bar is shown only when `simulation_enabled`. The order id is sent as the payment `reference`.
```

Replace the whole `## Fees and payment settings` section (heading through the `App.tsx drops the legacy …` sentence) with:

```
## Fees and payment settings
- `payment_provider_settings` (bank and QRIS) is the only source of providers and fees. CRUD under
  `/settings/payment-providers` (writes need `role_settings`), cashier list `GET /pos/payment-options`.
- `CheckoutModal` loads `GET /pos/payment-options` each time it opens, shows the MDR preview from the same rows and
  sends only `provider_id`; the QRIS provider picker is shown for dynamic and static QRIS.
- Settings → "Metode Pembayaran" (`PaymentMethodsTab`) creates, toggles and deletes providers on the server and saves
  edited table cells on blur. `ob3_store_settings` no longer holds providers; `App.tsx` drops legacy
  `bank_providers`, `qris_providers`, `edc_settings` and `coa_receivable_account` when it loads the saved settings.
```

In `## Known issues`, replace:

```
1. `unit_price` and `fee_percentage` come from the client. The server checks product existence and stock, not prices.
2. QRIS can be recorded as paid without real payment. Any `pos` user can call `/simulate`, and a QRIS payment without a
   `reference` (static QRIS, or QRIS inside a split payment) is not verified. Checkout does not compare the Midtrans
   amount with the payment amount.
```

with:

```
1. `unit_price` comes from the client. The server checks product existence and stock, not prices.
2. A QRIS payment without a `reference` (static QRIS, or QRIS inside a split payment) is cashier-attested and not
   verified until bank reconciliation. Dynamic QRIS is verified (settled, single use, amount) since 2026-09-30.
```

- [ ] **Step 4: `docs/ai/api-reference.md`**

Replace:

```
| POST | `/payment/qris/charge`, `/payment/qris/simulate/{orderId}` | `pos` |
```

with:

```
| POST | `/payment/qris/charge` (records the order; response has `simulation_enabled`) | `pos` |
| POST | `/payment/qris/simulate/{orderId}` (403 unless `MIDTRANS_ALLOW_SIMULATION`; only charged orders) | `pos` |
```

and replace:

```
| POST | `/payment/midtrans/webhook` | verified by sha512 signature (403 on mismatch) |
```

with:

```
| POST | `/payment/midtrans/webhook` | verified by sha512 signature (403 on mismatch or when no server key is set); records the settled amount |
```

- [ ] **Step 5: `docs/ai/data-model.md`**

Replace:

```
| `sale_payments` | `method`, `account_code`, `amount`, `tendered_amount`, `change_amount`, `fee_percentage`, `fee_amount`, `net_received`, `provider_name`, `reference` | one row per split payment. Legacy `surcharge_amount`, `edc_bank`, `edc_type` unused since 2026-09-30 |
```

with:

```
| `sale_payments` | `method`, `account_code`, `amount`, `tendered_amount`, `change_amount`, `fee_percentage`, `fee_amount`, `net_received`, `provider_name`, `reference` | one row per split payment; fee and provider name come from `payment_provider_settings`. Legacy `surcharge_amount`, `edc_bank`, `edc_type` unused since 2026-09-30 |
| `qris_transactions` | `order_id` (unique), `gross_amount`, `transaction_status` (pending/settlement), `settlement_source` (WEBHOOK/STATUS_API/SIMULATION), `settled_at`, `sale_payment_id` (nullable, **unique** FK `sale_payments`) | one row per dynamic QRIS order (migration `2026_10_01_000001`). Created by charge, settled by webhook/status/simulation, claimed once by checkout |
```

Replace:

```
The frontend does not use these tables yet: fees come from localStorage store settings (see [domain-pos.md](domain-pos.md)).
```

with:

```
Providers and fees are server-only since 2026-09-30: the POS reads `GET /pos/payment-options` and the settings tab edits
`/settings/payment-providers` (see [domain-pos.md](domain-pos.md)).
```

Delete the line:

```
- QRIS payment status is kept in the cache under the key `midtrans_sim_{orderId}` for 2 hours.
```

- [ ] **Step 6: `docs/ai/architecture.md`**

Replace:

```
`ob3_auth_token`, `ob3_cash_drawer`, `ob3_store_settings` (includes bank/QRIS fee providers; legacy `edc_settings`
and `coa_receivable_account` properties are dropped on load), `ob3_cart`,
```

with:

```
`ob3_auth_token`, `ob3_cash_drawer`, `ob3_store_settings` (receipt/store text only; legacy `bank_providers`,
`qris_providers`, `edc_settings` and `coa_receivable_account` properties are dropped on load), `ob3_cart`,
```

- [ ] **Step 7: `docs/ai/workflow-and-gotchas.md`**

Replace:

```
  when the permissions request fails), `INITIAL_STORE_SETTINGS`, the bank/QRIS provider defaults used by
  `CheckoutModal`, and category seeds for the legacy local category services. Its product,
```

with:

```
  when the permissions request fails), `INITIAL_STORE_SETTINGS`, and category seeds for the legacy local category
  services (bank/QRIS providers are server-only since 2026-09-30). Its product,
```

Replace:

```
  - The QRIS `/simulate` endpoint is not environment-gated.
  - The Midtrans demo key is the fallback when no key is set.
  - Fee percentages and prices are trusted from the client.
```

with:

```
  - Prices (`unit_price`) are trusted from the client (fees are server-side since 2026-09-30).
  - Static QRIS (no Midtrans order id) is cashier-attested until bank reconciliation.
```

- [ ] **Step 8: Roadmap and handoff**

In `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` replace:

```
## Sub-project 6 — Payment hardening (can run any time)
```

with:

```
## Sub-project 6 — Payment hardening — **done** (spec `2026-09-30-payment-hardening-design.md`, plan `2026-09-30-payment-hardening.md`)
```

In `docs/superpowers/plans/2026-09-30-accounting-handoff.md` replace:

```
| 6 | Payment hardening | Unique QRIS reference + amount check, gate `/payment/qris/simulate` to dev, server-side fee % and payment account |
```

with:

```
| 6 | Payment hardening | **Done** (`2026-09-30-payment-hardening-design.md`): `qris_transactions` (settled amount, single use), simulation behind `MIDTRANS_ALLOW_SIMULATION`, no fallback Midtrans key, server-side fees via `provider_id`; one bank account 1-1001 kept by ruling |
```

and in section `## 2. First steps on the new machine`, after the step-2 migration list sentence
(`New Stage 4 migrations: ...`), add a new paragraph line:

```
   Payment hardening added `2026_10_01_000001_create_qris_transactions_table`. For a QRIS demo without real Midtrans
   sandbox keys add `MIDTRANS_ALLOW_SIMULATION=true` to `backend/.env` (never in production); with real sandbox keys
   set `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` instead.
```

- [ ] **Step 9: Check and commit**

Run: `grep -rn "midtrans_sim_\|demo sandbox key is the fallback\|fee_percentage\` (0–10)" AGENTS.md backend/AGENTS.md docs/ai`
Expected: no output.

```bash
git status --short
git add AGENTS.md backend/AGENTS.md docs/ai/domain-pos.md docs/ai/api-reference.md docs/ai/data-model.md \
        docs/ai/architecture.md docs/ai/workflow-and-gotchas.md docs/superpowers/specs/2026-09-29-accounting-roadmap.md \
        docs/superpowers/plans/2026-09-30-accounting-handoff.md
git commit -m "docs(payment): describe qris settlements, gated simulation and server fees

Agent docs still said the simulate endpoint was open, a demo key was the
fallback and fees came from the browser.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 10: Manual browser check (report, do not block on it)**

With `MIDTRANS_ALLOW_SIMULATION=true` in the user's `backend/.env` (ask the user; do not edit `.env` yourself),
`php artisan config:clear`, `npm run dev:all`, as owner:
1. Settings → Metode Pembayaran: edit a QRIS provider's fee, blur, reload the page → value persists.
2. POS: QRIS dynamic → "Simulasi Bayar Lunas" → nota LUNAS; journal shows 1-1001 net + 6-1009 per the provider.
3. Re-send the same checkout via devtools "Replay XHR" → 422 "sudah dipakai untuk nota lain".
4. Without the env line: the demo bar is hidden and `/payment/qris/simulate/...` returns 403.
Report results to the user; stop at failures and report them.
