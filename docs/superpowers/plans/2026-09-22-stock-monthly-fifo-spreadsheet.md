# Laporan Stok Bulanan Interaktif & Buku FIFO Spreadsheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun antarmuka spreadsheet interaktif laporan stok bulanan berbasis buku lapisan FIFO (paritas penuh ProjectOmahBan) untuk Owner di `Project_SkripsiOB` yang mencakup backend kalkulasi ledger harian, API inline update, komponen spreadsheet React responsif dengan sticky columns, serta ekspor Excel.

**Architecture:** Mengadaptasi mesin kalkulasi `MonthlyStockLedger` ke dalam `MonthlyStockLedgerService.php` di Laravel yang mengelompokkan ban berdasarkan Merk/Ring/Ukuran dan mengalokasikan penjualan harian 1–31 ke lapisan FIFO `product_batches`. Di sisi frontend, komponen React `StockMonthlyLedgerView.tsx` menyediakan grid spreadsheet interaktif (freeze column, traffic light badges, inline popover edit stok awal/modal, summary card valuasi HPP) dengan fallback komputasi lokal TypeScript.

**Tech Stack:** Laravel 12, PHP 8.2+, MySQL / SQLite, React 19, TypeScript, Tailwind CSS, Lucide React, Vitest, PHPUnit.

**Spec:** `docs/superpowers/specs/2026-09-22-stock-monthly-fifo-spreadsheet-design.md`

## Global Constraints

- SAK EMKM Double-Entry accounting integrity & audit trail must be maintained.
- Product batches follow FIFO consumption order: oldest/cheapest active batch consumed first.
- Inline adjustment of opening stock must log a `StockMovement` (type: `adjustment`, ref: `stock-monthly`) and synchronize `product_quantity`.
- Correction of batch cost must log an audit entry in `product_price_audits`.
- Frontend must support both live connected backend API mode and client-side standalone fallback.

---

### Task 1: Backend FIFO Monthly Stock Ledger Service & Unit Tests

**Files:**
- Create: `backend/app/Services/Inventory/MonthlyStockLedgerService.php`
- Test: `backend/tests/Unit/MonthlyStockLedgerServiceTest.php`

**Interfaces:**
- Consumes: `App\Models\Product`, `App\Models\ProductBatch`, `App\Models\SaleBatchAllocation`, `App\Models\StockMovement`
- Produces: `MonthlyStockLedgerService::build(string $month, ?string $brand = null, int $branchId = 1): array`
  - Returns: `['rows' => array, 'summary' => array, 'meta' => array]`

- [ ] **Step 1: Write the failing unit test**

```php
<?php

namespace Tests\Unit;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Services\Inventory\MonthlyStockLedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyStockLedgerServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_build_monthly_stock_ledger_allocates_fifo_layers_and_daily_sales(): void
    {
        $product = Product::create([
            'product_code' => 'BAN-BRI-1856515-TUR',
            'product_name' => 'Bridgestone Turanza 185/65 R15',
            'brand' => 'Bridgestone',
            'product_size' => '185/65 R15',
            'ring' => '15',
            'product_cost' => 700000,
            'product_price' => 850000,
            'product_quantity' => 20,
            'stok_awal' => 20,
            'is_active' => true,
        ]);

        // Batch 1 (Oldest/Cheapest)
        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-001',
            'source_name' => 'PT Bridgestone',
            'purchase_date' => '2026-09-01',
            'batch_cost' => 700000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
            'branch_id' => 1,
        ]);

        // Batch 2 (Newer/Higher Cost)
        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-002',
            'source_name' => 'PT Bridgestone',
            'purchase_date' => '2026-09-05',
            'batch_cost' => 720000,
            'initial_qty' => 10,
            'remaining_qty' => 10,
            'branch_id' => 1,
        ]);

        $service = new MonthlyStockLedgerService();
        $result = $service->build('2026-09', null, 1);

        $this->assertArrayHasKey('rows', $result);
        $this->assertArrayHasKey('summary', $result);
        $this->assertArrayHasKey('meta', $result);
        $this->assertNotEmpty($result['rows']);

        $row = $result['rows'][0];
        $this->assertEquals($product->id, $row['product_id']);
        $this->assertEquals(20, $row['opening']);
        $this->assertEquals(20, $row['remaining']);
        $this->assertCount(2, $row['layers']);
        $this->assertEquals(700000, (int) $row['layers'][0]['batch_cost']);
        $this->assertEquals(720000, (int) $row['layers'][1]['batch_cost']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=MonthlyStockLedgerServiceTest`
Expected: Class `MonthlyStockLedgerService` does not exist.

- [ ] **Step 3: Implement `MonthlyStockLedgerService.php`**

Implement complete query and batch layer calculation in `backend/app/Services/Inventory/MonthlyStockLedgerService.php`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=MonthlyStockLedgerServiceTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Services/Inventory/MonthlyStockLedgerService.php backend/tests/Unit/MonthlyStockLedgerServiceTest.php
git commit -m "feat(backend): implement MonthlyStockLedgerService with FIFO layer allocation"
```

---

### Task 2: Backend API Endpoints & Feature Tests (`ReportStockMonthlyApiController.php`)

**Files:**
- Create: `backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/ReportStockMonthlyApiTest.php`

**Interfaces:**
- `GET /api/v1/reports/stock-monthly`
- `POST /api/v1/reports/stock-monthly/inline-update`
- Consumes: `MonthlyStockLedgerService`

- [ ] **Step 1: Write the failing feature test**

```php
<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductBatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportStockMonthlyApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_stock_monthly_endpoint_returns_success_and_matrix_data(): void
    {
        $product = Product::create([
            'product_code' => 'BAN-ACC-1955016-PHI',
            'product_name' => 'Accelera Phi-R 195/50 R16',
            'brand' => 'Accelera',
            'product_size' => '195/50 R16',
            'ring' => '16',
            'product_cost' => 580000,
            'product_price' => 690000,
            'product_quantity' => 12,
            'stok_awal' => 12,
            'is_active' => true,
        ]);

        ProductBatch::create([
            'product_id' => $product->id,
            'batch_code' => 'BATCH-ACC-01',
            'source_name' => 'PT Elangperdana',
            'purchase_date' => '2026-09-02',
            'batch_cost' => 580000,
            'initial_qty' => 12,
            'remaining_qty' => 12,
            'branch_id' => 1,
        ]);

        $response = $this->getJson('/api/v1/reports/stock-monthly?month=2026-09');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'rows',
                    'summary' => ['total_products', 'total_valuation_cogs', 'total_remaining'],
                    'meta' => ['month', 'days_in_month', 'brand_options'],
                ],
            ]);
    }

    public function test_inline_update_opening_stock_adjusts_product_and_logs_movement(): void
    {
        $product = Product::create([
            'product_code' => 'BAN-ACC-TEST',
            'product_name' => 'Accelera Test 195/50 R16',
            'brand' => 'Accelera',
            'product_size' => '195/50 R16',
            'ring' => '16',
            'product_cost' => 500000,
            'product_price' => 650000,
            'product_quantity' => 10,
            'stok_awal' => 10,
            'is_active' => true,
        ]);

        $payload = [
            'product_id' => $product->id,
            'field' => 'opening_stock',
            'value' => 15,
            'month' => '2026-09',
        ];

        $response = $this->postJson('/api/v1/reports/stock-monthly/inline-update', $payload);

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertEquals(15, (int) Product::find($product->id)->product_quantity);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php artisan test --filter=ReportStockMonthlyApiTest`
Expected: 404 Route not found.

- [ ] **Step 3: Implement controller & register routes**

Create `backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php` and add endpoints to `backend/routes/api.php`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php artisan test --filter=ReportStockMonthlyApiTest`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/Http/Controllers/Api/v1/ReportStockMonthlyApiController.php backend/routes/api.php backend/tests/Feature/ReportStockMonthlyApiTest.php
git commit -m "feat(api): add stock monthly report endpoints and inline update controller"
```

---

### Task 3: Client-Side Ledger Calculation Engine & Unit Tests

**Files:**
- Create: `src/services/stockMonthlyLedgerService.ts`
- Test: `src/services/__tests__/stockMonthlyLedgerService.test.ts`

**Interfaces:**
- `calculateClientStockLedger(products, transactions, mutations, month, brand?): StockMonthlyReportData`
- Produces: normalized data structure matching backend API response for seamless hybrid operation.

- [ ] **Step 1: Write the failing test in Vitest**

```typescript
import { describe, it, expect } from 'vitest';
import { calculateClientStockLedger } from '../stockMonthlyLedgerService';
import { ProductItem, PosTransaction, StockMutation } from '../../shared/types';

describe('stockMonthlyLedgerService', () => {
  const mockProducts: ProductItem[] = [
    {
      id: 'prod-1',
      product_code: 'BRI-1856515-TUR',
      product_name: 'Bridgestone Turanza 185/65 R15',
      brand: 'Bridgestone',
      product_size: '185/65 R15',
      ring: 'R15',
      category: 'BAN_BARU',
      product_cost: 700000,
      product_price: 850000,
      product_quantity: 15,
      stok_awal: 10,
      is_active: true,
      batches: [
        {
          id: 'b-1',
          product_id: 'prod-1',
          batch_code: 'B-01',
          source_name: 'PT Bridgestone',
          purchase_date: '2026-09-01',
          batch_cost: 700000,
          initial_qty: 10,
          remaining_qty: 5,
        },
        {
          id: 'b-2',
          product_id: 'prod-1',
          batch_code: 'B-02',
          source_name: 'PT Bridgestone',
          purchase_date: '2026-09-10',
          batch_cost: 720000,
          initial_qty: 10,
          remaining_qty: 10,
        },
      ],
    },
  ];

  const mockTransactions: PosTransaction[] = [
    {
      id: 'tx-1',
      invoice_number: 'INV-20260912-001',
      date: '2026-09-12T10:00:00Z',
      items: [
        {
          product_id: 'prod-1',
          product_name: 'Bridgestone Turanza 185/65 R15',
          quantity: 4,
          price: 850000,
          cogs: 700000,
          subtotal: 3400000,
        },
      ],
      total_amount: 3400000,
      payment_method: 'CASH',
      status: 'PAID',
    },
  ];

  const mockMutations: StockMutation[] = [
    {
      id: 'mut-1',
      product_id: 'prod-1',
      type: 'IN',
      quantity: 10,
      date: '2026-09-10T09:00:00Z',
      description: 'Restock Penerimaan Barang',
      previous_stock: 6,
      current_stock: 16,
    },
  ];

  it('calculates daily sales on day 12 and groups FIFO batches', () => {
    const result = calculateClientStockLedger(mockProducts, mockTransactions, mockMutations, '2026-09');

    expect(result.rows.length).toBeGreaterThan(0);
    const row = result.rows[0];
    expect(row.product_id).toBe('prod-1');
    expect(row.daily_sales[12]).toBe(4);
    expect(row.sold).toBe(4);
    expect(row.restock).toBe(10);
    expect(row.layers.length).toBe(2);
    expect(result.summary.total_valuation_cogs).toBe(5 * 700000 + 10 * 720000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/services/__tests__/stockMonthlyLedgerService.test.ts`
Expected: Cannot find module `../stockMonthlyLedgerService`.

- [ ] **Step 3: Implement `stockMonthlyLedgerService.ts`**

Implement calculation logic, days-in-month mapping, brand extraction, and summary statistics.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/services/__tests__/stockMonthlyLedgerService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/stockMonthlyLedgerService.ts src/services/__tests__/stockMonthlyLedgerService.test.ts
git commit -m "feat(services): implement client-side stock monthly FIFO ledger calculation"
```

---

### Task 4: Interactive React Spreadsheet UI & Popovers (`StockMonthlyLedgerView.tsx`)

**Files:**
- Create: `src/modules/inventory/components/StockMonthlyLedgerView.tsx`
- Create: `src/modules/inventory/components/StockLedgerInlineModal.tsx`
- Modify: `src/modules/inventory/components/index.ts`

**Interfaces:**
- Component Props:
  ```typescript
  interface StockMonthlyLedgerViewProps {
    products: ProductItem[];
    transactions?: PosTransaction[];
    mutations?: StockMutation[];
    onUpdateProductStock?: (updatedProducts: ProductItem[], newMutations: StockMutation[]) => void;
    onUpdateProduct?: (productId: string, updates: Partial<ProductItem>) => void;
  }
  ```

- [ ] **Step 1: Create `StockLedgerInlineModal.tsx`**

Build modal/popover component for:
- Koreksi Stok Awal (opening quantity adjustment with reason & instant delta).
- Koreksi Modal Lapisan Batch (correct batch HPP).
- Tandai Stok Lama (toggle font merah & `@reference_price`).

- [ ] **Step 2: Create `StockMonthlyLedgerView.tsx`**

Build full spreadsheet grid:
- Top metrics cards: Total Valuasi HPP Gudang, Fisik Tersedia, Terjual, Kritis.
- Filter toolbar: Bulan picker, Dropdown Merk, Input search, Tombol Export Excel.
- Excel-like table:
  - Sticky left columns: `No`, `Merk & Nama`, `Ukuran`, `Ring`, `Modal`, `Harga Jual`.
  - Middle stock: `Awal` (clickable), `Masuk`, `Sisa` (traffic light badges).
  - Horizontal daily columns: `1..31` with highlight on active days.
  - Column `Total Terjual`.
  - Sub-rows for multiple FIFO modal layers per product (`layers`).
  - Red font styling and `@reference_price` badge when `is_old_stock` is true.

- [ ] **Step 3: Export from `components/index.ts`**

Export `StockMonthlyLedgerView` and `StockLedgerInlineModal`.

- [ ] **Step 4: Verify component compiles with TypeScript**

Run: `npm run lint`
Expected: No TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/inventory/components/StockMonthlyLedgerView.tsx src/modules/inventory/components/StockLedgerInlineModal.tsx src/modules/inventory/components/index.ts
git commit -m "feat(inventory): add StockMonthlyLedgerView spreadsheet component with inline editing"
```

---

### Task 5: Integration in `InventoryScreen.tsx` Sub-tabs

**Files:**
- Modify: `src/modules/inventory/InventoryScreen.tsx`
- Test: `src/modules/inventory/__tests__/inventorySubViewNavigation.test.ts`

**Interfaces:**
- Update `InventorySubView`: add `'buku_fifo'`.
- Render navigation tab with `FileSpreadsheet` icon: "Buku Stok FIFO (Excel)".

- [ ] **Step 1: Write navigation subview test**

```typescript
import { describe, it, expect } from 'vitest';
import { InventorySubView } from '../InventoryScreen';

describe('InventorySubView type', () => {
  it('supports buku_fifo subview for owner stock spreadsheet', () => {
    const subView: InventorySubView = 'buku_fifo';
    expect(subView).toBe('buku_fifo');
  });
});
```

- [ ] **Step 2: Modify `InventoryScreen.tsx`**

Add `'buku_fifo'` to `InventorySubView`, render tab button, and mount `<StockMonthlyLedgerView />` when active.

- [ ] **Step 3: Run Vitest tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/modules/inventory/InventoryScreen.tsx src/modules/inventory/__tests__/inventorySubViewNavigation.test.ts
git commit -m "feat(inventory): integrate buku_fifo sub-tab in InventoryScreen"
```

---

### Task 6: Excel Export Parity (Spreadsheet `.xlsx` Generator)

**Files:**
- Modify: `src/shared/export/xlsx.ts` (or create `src/shared/export/stockLedgerExcel.ts`)
- Test: `src/shared/export/__tests__/stockLedgerExcel.test.ts`

**Interfaces:**
- `exportStockLedgerToExcel(data: StockMonthlyReportData, filename?: string): void`

- [ ] **Step 1: Write unit test for Excel export payload formatting**

Verify that data rows, headers (1..31 days), styling properties, and totals are correctly structured for Excel generation.

- [ ] **Step 2: Implement export generator**

Build multi-column worksheet generator with headers matching `ProjectOmahBan`: No, Merk Ban, Ukuran, Ring, Modal, Harga Jual, Stock, Sisa, 1..31, Total.

- [ ] **Step 3: Run Vitest tests**

Run: `npm test -- src/shared/export/__tests__/stockLedgerExcel.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/export/stockLedgerExcel.ts src/shared/export/__tests__/stockLedgerExcel.test.ts
git commit -m "feat(export): add stock monthly ledger Excel spreadsheet export"
```

---

### Task 7: Full System Verification & Regression Check

**Files:**
- None (verification run across all components)

- [ ] **Step 1: Run frontend tests**

Run: `npm test`
Expected: All tests pass (100%).

- [ ] **Step 2: Run frontend build check**

Run: `npm run build`
Expected: Vite build succeeds without errors.

- [ ] **Step 3: Manual Verification of Owner Workflow**
- Open Inventaris $\rightarrow$ klik tab **Buku Stok FIFO (Excel)**.
- Periksa ringkasan metrik Owner (Total Valuasi HPP Gudang, Fisik Tersedia, Terjual).
- Periksa scroll horizontal tanggal 1..31 dengan kolom identitas ban terkunci (*frozen*).
- Uji inline click pada kolom Awal, Modal, dan Tag Stok Lama.
- Uji tombol unduh Excel `.xlsx`.
