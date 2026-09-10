# Excel Import (ProjectOmahBan Parity) & Fintech QRIS POS (Midtrans) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan paritas sistem import & pembaruan selektif ban dari Excel ala `ProjectOmahBan` serta menambahkan integrasi Fintech QRIS dinamis (Midtrans) pada modul POS kasir `Project_SkripsiOB`.

**Architecture:** Mengadopsi arsitektur REST native Laravel dan React/Tailwind. Di sisi backend, `StockSelectiveUpdateService` mengeksekusi update granular tanpa rewrite database dengan pencatatan `product_price_audits` dan batch FIFO, sementara `MidtransQrisService` mengelola komunikasi HTTP dengan Midtrans Core API. Di sisi frontend, `StockReconciliationModal` dilengkapi filter mutakhir dan modal aksi selektif, sedangkan modul POS dilengkapi `QrisDynamicModal` dengan auto-polling status real-time.

**Tech Stack:** Laravel 11/12, PHP 8.3, React 18, TypeScript, Tailwind CSS, Midtrans Core API (HTTP Client), PHPUnit.

**Spec:** `docs/superpowers/specs/2026-09-10-excel-import-and-qris-pos-design.md`

## Global Constraints
- Laravel backend berada di folder `backend/`.
- Frontend React/Vite berada di root folder `src/`.
- PHP minimum: PHP 8.3.
- Database: MySQL / MariaDB via Laragon.
- ID Cabang default untuk transaksi/opname: `3` (atau cabang aktif).
- Jangan merusak fungsionalitas POS, inventori, atau laporan yang sudah berjalan sebelumnya.
- Seluruh endpoint API mengikuti konvensi respons JSON standard `{ "success": true/false, "message": "...", "data": ... }`.

---

### Task 1: Backend `StockSelectiveUpdateService` & Unit Tests

**Files:**
- Create: `backend/app/Services/Inventory/StockSelectiveUpdateService.php`
- Test: `backend/tests/Feature/StockSelectiveUpdateServiceTest.php`

**Interfaces:**
- Consumes: Models `Product`, `ProductBatch`, `ProductPriceAudit`, `StockMovement`.
- Produces: `StockSelectiveUpdateService::updateBulk(array $items, array $options): array`
  - Returns `array{ total_processed: int, cost_updated: int, price_updated: int, stock_updated: int, details: array }`.

- [ ] **Step 1: Write the failing test**

```php
<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductPriceAudit;
use App\Models\StockMovement;
use App\Services\Inventory\StockSelectiveUpdateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockSelectiveUpdateServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_update_cost_selectively_and_record_audit(): void
    {
        $brand = Brand::create(['name' => 'Dunlop', 'slug' => 'dunlop']);
        $product = Product::create([
            'brand_id' => $brand->id,
            'product_name' => 'Dlp Enasave EC300+ 185/65 R15',
            'product_code' => 'DLP-1856515-EC300',
            'product_cost' => 600000,
            'product_price' => 800000,
            'product_quantity' => 10,
            'branch_id' => 3,
        ]);

        $service = new StockSelectiveUpdateService();
        $result = $service->updateBulk([
            [
                'product_id' => $product->id,
                'excel_cost' => 650000,
                'excel_price' => 800000,
                'excel_stock' => 10,
            ]
        ], [
            'update_cost' => true,
            'update_price' => false,
            'update_stock' => false,
            'reason' => 'Kenaikan harga distributor pabrik',
            'branch_id' => 3,
        ]);

        $this->assertEquals(1, $result['cost_updated']);
        $this->assertEquals(650000, $product->fresh()->product_cost);
        $this->assertDatabaseHas('product_price_audits', [
            'product_id' => $product->id,
            'new_cost' => 650000,
            'reason' => 'Kenaikan harga distributor pabrik',
        ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=StockSelectiveUpdateServiceTest` in `backend`  
Expected: FAIL with `Class App\Services\Inventory\StockSelectiveUpdateService not found`

- [ ] **Step 3: Write minimal implementation**

Implement `backend/app/Services/Inventory/StockSelectiveUpdateService.php` with:
- Method `updateBulk(array $items, array $options): array`.
- Validation: reason min 3 chars, at least one of `update_cost`, `update_price`, `update_stock` true.
- Atomic `DB::transaction`.
- For `update_cost`: update `product_cost` & record `ProductPriceAudit`.
- For `update_price`: update `product_price` & record `ProductPriceAudit`.
- For `update_stock`: adjust `product_quantity`, manage FIFO `ProductBatch` creation if `batches` present (sorted by cost ascending, earliest date for cheapest), and record `StockMovement`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=StockSelectiveUpdateServiceTest` in `backend`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Inventory/StockSelectiveUpdateService.php backend/tests/Feature/StockSelectiveUpdateServiceTest.php
git commit -m "feat(inventory): implement StockSelectiveUpdateService with price audit and FIFO batch sorting"
```

---

### Task 2: Backend Controller & API Routes for Bulk Update

**Files:**
- Modify: `backend/app/Http/Controllers/Api/v1/StockReconciliationApiController.php`
- Modify: `backend/routes/api.php`
- Modify: `backend/tests/Feature/StockReconciliationApiTest.php`

**Interfaces:**
- Consumes: `StockSelectiveUpdateService`.
- Produces: API endpoint `POST /api/v1/stock/reconciliation/bulk-update`.

- [ ] **Step 1: Write failing API test**

In `backend/tests/Feature/StockReconciliationApiTest.php`, add test `test_bulk_update_endpoint_updates_selected_products_successfully`:
```php
public function test_bulk_update_endpoint_updates_selected_products_successfully(): void
{
    $brand = Brand::create(['name' => 'Dunlop', 'slug' => 'dunlop']);
    $product = Product::create([
        'brand_id' => $brand->id,
        'product_name' => 'Dlp Enasave EC300+ 185/65 R15',
        'product_code' => 'DLP-TEST-01',
        'product_cost' => 600000,
        'product_price' => 800000,
        'product_quantity' => 10,
        'branch_id' => 3,
    ]);

    $response = $this->postJson('/api/v1/stock/reconciliation/bulk-update', [
        'items' => [
            [
                'product_id' => $product->id,
                'excel_cost' => 620000,
                'excel_price' => 850000,
                'excel_stock' => 12,
            ]
        ],
        'update_cost' => true,
        'update_price' => true,
        'update_stock' => true,
        'reason' => 'Penyesuaian stok dan harga bulanan',
        'branch_id' => 3,
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
        ]);

    $this->assertEquals(620000, $product->fresh()->product_cost);
    $this->assertEquals(850000, $product->fresh()->product_price);
    $this->assertEquals(12, $product->fresh()->product_quantity);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=StockReconciliationApiTest::test_bulk_update_endpoint_updates_selected_products_successfully` in `backend`  
Expected: FAIL (404 or Route not found)

- [ ] **Step 3: Implement controller method & route**

- In `backend/routes/api.php`:
  `Route::post('/stock/reconciliation/bulk-update', [StockReconciliationApiController::class, 'bulkUpdate']);`
- In `backend/app/Http/Controllers/Api/v1/StockReconciliationApiController.php`:
  Inject `StockSelectiveUpdateService` in constructor or container.
  Implement `bulkUpdate(Request $request): JsonResponse` with input validation and calling `updateBulk`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=StockReconciliationApiTest` in `backend`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/Api/v1/StockReconciliationApiController.php backend/routes/api.php backend/tests/Feature/StockReconciliationApiTest.php
git commit -m "feat(api): add bulk-update endpoint for selective stock reconciliation"
```

---

### Task 3: Frontend Inventory Reconciliation & Selective Update UI

**Files:**
- Modify: `src/services/api/stockReconciliationApi.ts`
- Modify: `src/modules/inventory/components/StockReconciliationModal.tsx`

**Interfaces:**
- Consumes: API `POST /api/v1/stock/reconciliation/bulk-update`.
- Produces: UI with filter tabs (`SEMUA`, `BEDA HPP`, `BEDA HARGA`, `BEDA STOK`, `ADA SELISIH`, `IDENTIK`, `PRODUK BARU`), button *"Pilih Semua Yang Beda"*, and Bulk Update Modal.

- [ ] **Step 1: Update API Client `stockReconciliationApi.ts`**

Add method `bulkUpdate`:
```typescript
export interface BulkUpdateItem {
  product_id: number;
  excel_cost?: number | null;
  excel_price?: number | null;
  excel_stock?: number | null;
  product_name?: string | null;
  product_code?: string | null;
  batches?: any[];
}

export interface BulkUpdateOptions {
  update_cost: boolean;
  update_price: boolean;
  update_stock: boolean;
  reason: string;
  branch_id?: number;
}

bulkUpdate: async (items: BulkUpdateItem[], options: BulkUpdateOptions): Promise<ApiResponse<any>> => {
  return apiClient.post('/stock/reconciliation/bulk-update', {
    items,
    ...options,
  });
}
```

- [ ] **Step 2: Update `StockReconciliationModal.tsx`**

1. Expand `statusFilter` state:
   `type FilterStatus = 'ALL' | 'MATCHED' | 'NEW' | 'DIFF' | 'DIFF_COST' | 'DIFF_PRICE' | 'DIFF_STOCK' | 'DIFF_ANY' | 'IDENTICAL';`
2. Update filter calculation in `filteredProducts`:
   - `DIFF_COST`: Excel cost != DB cost.
   - `DIFF_PRICE`: Excel price != DB price.
   - `DIFF_STOCK`: Excel stock != DB stock.
   - `DIFF_ANY`: any of cost, price, or stock differs.
   - `IDENTICAL`: cost, price, and stock are identical.
3. Add Quick Action button: *"Pilih Semua Yang Beda"* (`selectAllDifferent()`).
4. Add Bulk Update Trigger button & Modal UI:
   - Button appears when at least 1 matched item is selected: *"Update Massal Terpilih (N)"*.
   - Pop-up modal containing:
     - Badge counters: total selected, cost diffs, price diffs, stock diffs.
     - Checkboxes: `[x] Perbarui Modal (HPP)`, `[x] Perbarui Harga Jual`, `[x] Perbarui Stok Fisik`.
     - Input Alasan / Keterangan (textarea with validation min 3 chars).
     - Submit button calling `stockReconciliationApi.bulkUpdate`.
     - Refresh staging and display success notification banner upon completion.

- [ ] **Step 3: Run frontend build check**

Run: `npm run build`  
Expected: Build passes with exit code 0.

- [ ] **Step 4: Commit**

```bash
git add src/services/api/stockReconciliationApi.ts src/modules/inventory/components/StockReconciliationModal.tsx
git commit -m "feat(inventory): add selective bulk update modal and advanced diff filters to StockReconciliationModal"
```

---

### Task 4: Backend Midtrans Core API QRIS Service & Controller

**Files:**
- Create: `backend/config/midtrans.php`
- Create: `backend/app/Services/Payment/MidtransQrisService.php`
- Create: `backend/app/Http/Controllers/Api/v1/PaymentApiController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/MidtransQrisApiTest.php`

**Interfaces:**
- Consumes: Midtrans Core API (`https://api.sandbox.midtrans.com/v2/charge`, `/status`).
- Produces:
  - `POST /api/v1/payment/qris/charge`
  - `GET /api/v1/payment/qris/status/{orderId}`
  - `POST /api/v1/payment/qris/simulate/{orderId}`
  - `POST /api/v1/payment/midtrans/webhook`

- [ ] **Step 1: Write failing API test**

Create `backend/tests/Feature/MidtransQrisApiTest.php`:
```php
<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MidtransQrisApiTest extends TestCase
{
    public function test_can_charge_qris_and_receive_qr_string(): void
    {
        Http::fake([
            'https://api.sandbox.midtrans.com/v2/charge' => Http::response([
                'status_code' => '201',
                'status_message' => 'Success, QRIS transaction is created',
                'transaction_id' => 'mid-txn-123456',
                'order_id' => 'POS-20260910-001',
                'gross_amount' => '350000.00',
                'payment_type' => 'qris',
                'transaction_status' => 'pending',
                'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                'actions' => [
                    [
                        'name' => 'generate-qr-code',
                        'method' => 'GET',
                        'url' => 'https://api.sandbox.midtrans.com/v2/qris/mid-txn-123456/qr-code',
                    ]
                ],
            ], 201),
        ]);

        $response = $this->postJson('/api/v1/payment/qris/charge', [
            'order_id' => 'POS-20260910-001',
            'gross_amount' => 350000,
            'customer_name' => 'Budi Santoso',
        ]);

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'data' => [
                    'order_id' => 'POS-20260910-001',
                    'gross_amount' => 350000,
                    'qr_string' => '00020101021226590014ID.LINKAJA.WWW0118936009110022094894...',
                    'transaction_status' => 'pending',
                ],
            ]);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=MidtransQrisApiTest` in `backend`  
Expected: FAIL (Route not found / Class not found)

- [ ] **Step 3: Implement Config, Service, and Controller**

1. Create `backend/config/midtrans.php`:
   Contains `server_key`, `client_key`, `is_production`, `merchant_id`.
2. Create `backend/app/Services/Payment/MidtransQrisService.php`:
   - `createCharge(string $orderId, int $grossAmount, array $meta = []): array`
   - `checkStatus(string $orderId): array`
   - `simulateSettlement(string $orderId): array`
3. Create `backend/app/Http/Controllers/Api/v1/PaymentApiController.php`:
   - Endpoints: `chargeQris`, `checkQrisStatus`, `simulateQrisSettlement`, `handleWebhook`.
4. Register routes in `backend/routes/api.php`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=MidtransQrisApiTest` in `backend`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/config/midtrans.php backend/app/Services/Payment/MidtransQrisService.php backend/app/Http/Controllers/Api/v1/PaymentApiController.php backend/routes/api.php backend/tests/Feature/MidtransQrisApiTest.php
git commit -m "feat(payment): implement Midtrans Core API QRIS charge, status polling, and simulator endpoints"
```

---

### Task 5: Frontend POS Dynamic QRIS Integration

**Files:**
- Create: `src/services/api/paymentApi.ts`
- Create: `src/modules/pos/components/QrisDynamicModal.tsx`
- Modify: `src/modules/pos/components/CheckoutModal.tsx`

**Interfaces:**
- Consumes: API endpoints `/api/v1/payment/qris/*`.
- Produces: Interactive QRIS modal with countdown timer, auto-polling every 3s, sandbox simulator trigger, and seamless checkout finalization.

- [ ] **Step 1: Create `src/services/api/paymentApi.ts`**

Export:
- `chargeQris(orderId: string, grossAmount: number, customerName?: string)`
- `checkQrisStatus(orderId: string)`
- `simulateQrisPayment(orderId: string)`

- [ ] **Step 2: Create `src/modules/pos/components/QrisDynamicModal.tsx`**

- Props: `isOpen`, `onClose`, `orderId`, `grossAmount`, `customerName`, `onPaymentSuccess(paymentData)`.
- Renders QR Code image using Midtrans `qr_url` or SVG generation from `qr_string`.
- Displays countdown timer (15 minutes).
- Polls status every 3 seconds via `setInterval`.
- Displays badge status (`Menunggu Pembayaran`, `Lunas`).
- Includes buttons:
  - *"Simulasi Bayar Lunas (Demo Sandbox)"*
  - *"Buka Simulator Midtrans"* (link to `https://simulator.sandbox.midtrans.com/qris/index`)
- When status is `settlement`, shows success checkmark, plays brief sound/animation, and triggers `onPaymentSuccess`.

- [ ] **Step 3: Modify `src/modules/pos/components/CheckoutModal.tsx`**

- In payment method selection, when `QRIS` is selected:
  - Add option to toggle between:
    1. `QRIS Dinamis Midtrans (Otomatis & Verifikasi Real-time)` [Default/Rekomendasi]
    2. `QRIS Statis Manual`
  - If Dynamic QRIS selected: clicking *"Bayar Sekarang"* triggers `QrisDynamicModal`.
  - When payment succeeds in `QrisDynamicModal`, auto-submits checkout with `paymentMethod: 'QRIS'`, `provider_name: 'Midtrans'`, and reference ID attached.

- [ ] **Step 4: Run frontend build check**

Run: `npm run build`  
Expected: Build passes with exit code 0.

- [ ] **Step 5: Commit**

```bash
git add src/services/api/paymentApi.ts src/modules/pos/components/QrisDynamicModal.tsx src/modules/pos/components/CheckoutModal.tsx
git commit -m "feat(pos): integrate Midtrans dynamic QRIS modal with auto-polling and simulator support"
```

---

### Task 6: End-to-End System Verification & Final Polish

**Files:**
- Create: `backend/tests/Feature/EndToEndParityReconciliationAndQrisTest.php`
- Modify: `docs/superpowers/plans/2026-09-10-excel-import-and-qris-pos.md` (check off items)

**Interfaces:**
- Consumes: All modules created in Tasks 1-5.
- Produces: Clean test report and verified end-to-end user flows.

- [ ] **Step 1: Write & run full end-to-end test**

Run: `php artisan test` in `backend`  
Expected: All tests pass without any regression.

- [ ] **Step 2: Run frontend build**

Run: `npm run build`  
Expected: Vite build succeeds cleanly with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "chore: complete end-to-end verification for excel import parity and midtrans qris pos"
```
