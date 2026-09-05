# Laravel REST API Backend Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Laravel 11/12 REST API in `backend/` connected to MySQL database `project-skripsi_ob`, implementing FIFO costing and SAK EMKM double-entry accounting engines, and integrate it with the existing React 19 frontend.

**Architecture:** Decoupled Client-Server architecture. Laravel handles the persistence layer, atomic transactional business logic (`DB::transaction`), FIFO cost allocations, and SAK EMKM financial calculations. React 19 + Vite serves as the client SPA communicating via asynchronous JSON REST endpoints under `/api/v1/*`.

**Tech Stack:** PHP 8.3, Laravel 11/12, Composer 2.4+, MySQL 8.0 (Laragon), React 19, TypeScript, Tailwind CSS v4, Vite 6.

**Spec:** `docs/superpowers/specs/2026-09-05-laravel-backend-integration-design.md`

## Global Constraints
- Database name MUST be `project-skripsi_ob` on host `127.0.0.1:3306`.
- Backend MUST live in `c:\laragon\www\Project_SkripsiOB\backend\`.
- All financial transactions MUST be wrapped in `DB::transaction()` with atomic rollback.
- FIFO cost layering MUST allocate from oldest active batch (`received_date ASC, id ASC`).
- Double-entry accounting MUST strictly enforce $\sum \text{Debit} == \sum \text{Credit}$ before persisting.
- Existing React 19 UI components and UX (POS touch screen, receipt preview, accounting tabs) MUST be preserved.

---

### Task 1: Scaffold Laravel Application & Environment Setup

**Files:**
- Create: `backend/` (via composer create-project)
- Modify: `backend/.env`
- Modify: `backend/config/cors.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/HealthCheckTest.php`

**Interfaces:**
- Consumes: Composer at `C:\laragon\bin\composer\composer.bat`, PHP 8.3 CLI
- Produces: Base Laravel application listening on `http://127.0.0.1:8000/api/v1/health`

- [ ] **Step 1: Check existing directories and scaffold Laravel if not present**
Run:
```powershell
if (!(Test-Path "backend")) {
    & "C:\laragon\bin\composer\composer.bat" create-project laravel/laravel backend --prefer-dist
}
```

- [ ] **Step 2: Configure `backend/.env` for `project-skripsi_ob`**
Ensure database configuration in `backend/.env`:
```env
APP_NAME="OmahBan-SIA-Cabang3"
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=project-skripsi_ob
DB_USERNAME=root
DB_PASSWORD=
```
Run `php artisan key:generate` inside `backend/`.

- [ ] **Step 3: Configure CORS in `backend/config/cors.php`**
Ensure origins allowed include:
```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['http://localhost:3000', 'http://127.0.0.1:3000'],
'allowed_headers' => ['*'],
'supports_credentials' => true,
```

- [ ] **Step 4: Create HealthCheck test & route**
In `backend/routes/api.php`:
```php
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        return response()->json([
            'status' => 'healthy',
            'app' => 'Omah Ban POS & SIA SAK EMKM Cabang 3',
            'database' => DB::connection()->getDatabaseName(),
            'timestamp' => now()->toIso8601String(),
        ]);
    });
});
```
Write test `backend/tests/Feature/HealthCheckTest.php` and run:
```powershell
php artisan test --filter=HealthCheckTest
```
Expected: PASS

- [ ] **Step 5: Commit changes**
```powershell
git add backend/
git commit -m "feat(backend): scaffold Laravel 11/12 application with health check"
```

---

### Task 2: Migrations & Eloquent Models for 14 Core Entities

**Files:**
- Create: `backend/database/migrations/*`
- Create: `backend/app/Models/Product.php`
- Create: `backend/app/Models/ProductBatch.php`
- Create: `backend/app/Models/ServiceMaster.php`
- Create: `backend/app/Models/Supplier.php`
- Create: `backend/app/Models/Sale.php`
- Create: `backend/app/Models/SaleDetail.php`
- Create: `backend/app/Models/SaleBatchAllocation.php`
- Create: `backend/app/Models/SalesBooking.php`
- Create: `backend/app/Models/StockMovement.php`
- Create: `backend/app/Models/ExpenseCategory.php`
- Create: `backend/app/Models/Expense.php`
- Create: `backend/app/Models/Account.php`
- Create: `backend/app/Models/JournalEntry.php`
- Create: `backend/app/Models/JournalItem.php`
- Create: `backend/database/seeders/DatabaseSeeder.php`
- Create: `backend/database/seeders/AccountCoaSeeder.php`

**Interfaces:**
- Consumes: `project-skripsi_ob` schema definition
- Produces: 14 Eloquent Models with `$fillable`, `$casts`, and relationships (`hasMany`, `belongsTo`)

- [ ] **Step 1: Write migration files matching `schema_project_skripsi_ob.sql`**
Generate and structure migrations for the 14 tables with appropriate foreign keys and indexes.

- [ ] **Step 2: Create Eloquent Models with explicit relationships**
Implement models in `backend/app/Models/`:
- `Product`: `batches()`, `stockMovements()`, `saleDetails()`
- `ProductBatch`: `product()`, `allocations()`
- `Sale`: `details()`, `allocations()`, `journalEntry()`
- `Account`: `journalItems()`
- `JournalEntry`: `items()`, `sale()`, `expense()`
- `Expense`: `journalEntry()`

- [ ] **Step 3: Implement `AccountCoaSeeder.php` for 21 SAK EMKM accounts**
Seed default accounts (1-1000 Kas Laci, 1-1001 Bank BCA, 1-2000 Persediaan, 2-1000 Hutang Supplier, 3-1000 Modal, 4-1000 Penjualan, 5-1000 HPP FIFO, 6-1000 s/d 6-1008 Beban Operasional).

- [ ] **Step 4: Run migrations and seeders**
```powershell
php artisan migrate --force
php artisan db:seed --class=AccountCoaSeeder
```

- [ ] **Step 5: Write model relationship unit tests**
Write `backend/tests/Unit/ModelRelationshipTest.php` and run:
```powershell
php artisan test --filter=ModelRelationshipTest
```
Expected: PASS

- [ ] **Step 6: Commit changes**
```powershell
git add backend/database/ backend/app/Models/ backend/tests/
git commit -m "feat(backend): implement 14 Eloquent models and SAK EMKM COA seeder"
```

---

### Task 3: Master Data REST API (Products, Services, Suppliers, COA Accounts)

**Files:**
- Create: `backend/app/Http/Controllers/Api/v1/ProductController.php`
- Create: `backend/app/Http/Controllers/Api/v1/ServiceMasterController.php`
- Create: `backend/app/Http/Controllers/Api/v1/SupplierController.php`
- Create: `backend/app/Http/Controllers/Api/v1/AccountController.php`
- Create: `backend/app/Http/Requests/ProductRequest.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/MasterDataApiTest.php`

**Interfaces:**
- Consumes: `Product`, `ServiceMaster`, `Supplier`, `Account` models
- Produces: CRUD endpoints under `/api/v1/products`, `/api/v1/services`, `/api/v1/suppliers`, `/api/v1/accounts`

- [ ] **Step 1: Write tests for Master Data CRUD**
In `backend/tests/Feature/MasterDataApiTest.php`:
- Test listing products with filter by category & search
- Test creating product with barcode and initial stock batch
- Test listing services and suppliers
- Test fetching COA accounts

- [ ] **Step 2: Run tests to verify they fail**
Run: `php artisan test --filter=MasterDataApiTest`
Expected: FAIL (404 Route not found)

- [ ] **Step 3: Implement Controllers & Requests**
Implement `ProductController`, `ServiceMasterController`, `SupplierController`, and `AccountController` with proper validation, status responses, and eager loading of active batches for products.

- [ ] **Step 4: Register routes in `backend/routes/api.php`**
```php
Route::apiResource('products', ProductController::class);
Route::apiResource('services', ServiceMasterController::class);
Route::apiResource('suppliers', SupplierController::class);
Route::get('accounts', [AccountController::class, 'index']);
```

- [ ] **Step 5: Run tests to verify they pass**
Run: `php artisan test --filter=MasterDataApiTest`
Expected: PASS

- [ ] **Step 6: Commit changes**
```powershell
git add backend/app/Http/Controllers/ backend/app/Http/Requests/ backend/routes/ backend/tests/
git commit -m "feat(backend): master data REST API with full CRUD and validation"
```

---

### Task 4: FIFO Costing Engine Service (`FifoCostingService.php`)

**Files:**
- Create: `backend/app/Services/FifoCostingService.php`
- Test: `backend/tests/Unit/FifoCostingServiceTest.php`

**Interfaces:**
- Consumes: `Product`, `ProductBatch`, `SaleBatchAllocation`, `StockMovement`
- Produces: `allocateFifo(int $productId, int $quantity, int $saleDetailId): array` returning:
  `['total_cogs' => float, 'allocations' => array, 'remaining_stock' => int]`

- [ ] **Step 1: Write Unit Test for FIFO Cost Layering**
In `backend/tests/Unit/FifoCostingServiceTest.php`:
- Create Batch 1: 5 units @ Rp 600.000 (Date: 2026-08-01)
- Create Batch 2: 10 units @ Rp 650.000 (Date: 2026-08-15)
- Deduct 7 units
- Verify HPP = (5 * 600.000) + (2 * 650.000) = Rp 4.300.000
- Verify Batch 1 status = DEPLETED (current_qty = 0)
- Verify Batch 2 status = PARTIAL (current_qty = 8)
- Verify `sale_batch_allocations` records created
- Verify `stock_movements` record created

- [ ] **Step 2: Run test to verify it fails**
Run: `php artisan test --filter=FifoCostingServiceTest`
Expected: FAIL (Class does not exist)

- [ ] **Step 3: Implement `FifoCostingService.php`**
Implement the service with strict ordering (`received_date ASC, id ASC`), locking with `lockForUpdate()`, quantity validation, and exception throwing if available stock < requested quantity.

- [ ] **Step 4: Run test to verify it passes**
Run: `php artisan test --filter=FifoCostingServiceTest`
Expected: PASS

- [ ] **Step 5: Commit changes**
```powershell
git add backend/app/Services/FifoCostingService.php backend/tests/
git commit -m "feat(backend): FIFO costing engine with multi-batch allocation"
```

---

### Task 5: Double-Entry SAK EMKM Accounting Engine Service (`AccountingEngine.php`)

**Files:**
- Create: `backend/app/Services/AccountingEngine.php`
- Create: `backend/app/Exceptions/AccountingUnbalancedException.php`
- Test: `backend/tests/Unit/AccountingEngineTest.php`

**Interfaces:**
- Consumes: `Account`, `JournalEntry`, `JournalItem`
- Produces: 
  - `createEntry(string $refDoc, string $description, array $items): JournalEntry`
  - `getGeneralLedger(string $accountCode, ?string $start, ?string $end): array`
  - `getTrialBalance(): array`
  - `getFinancialStatements(): array`

- [ ] **Step 1: Write Unit Test for Accounting Engine**
In `backend/tests/Unit/AccountingEngineTest.php`:
- Test successful balanced entry ($\sum \text{Debit} == \sum \text{Credit}$)
- Test exception thrown when Debit != Credit
- Test General Ledger running balance calculation
- Test Trial Balance ($\Delta = 0$)
- Test Laporan Laba Rugi SAK EMKM (Revenue - HPP - Expenses = Net Profit)
- Test Neraca SAK EMKM (Assets = Liabilities + Equity)

- [ ] **Step 2: Run test to verify it fails**
Run: `php artisan test --filter=AccountingEngineTest`
Expected: FAIL

- [ ] **Step 3: Implement `AccountingEngine.php`**
Implement strict double-entry validation, ledger running balance calculator, trial balance aggregation, and SAK EMKM financial statement compiler.

- [ ] **Step 4: Run test to verify it passes**
Run: `php artisan test --filter=AccountingEngineTest`
Expected: PASS

- [ ] **Step 5: Commit changes**
```powershell
git add backend/app/Services/AccountingEngine.php backend/app/Exceptions/ backend/tests/
git commit -m "feat(backend): double-entry SAK EMKM accounting engine"
```

---

### Task 6: POS Checkout & Inventory Restock Atomic Endpoints

**Files:**
- Create: `backend/app/Http/Controllers/Api/v1/PosController.php`
- Create: `backend/app/Http/Controllers/Api/v1/InventoryController.php`
- Create: `backend/app/Http/Requests/PosCheckoutRequest.php`
- Create: `backend/app/Http/Requests/RestockRequest.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/PosTransactionTest.php`
- Test: `backend/tests/Feature/InventoryRestockTest.php`

**Interfaces:**
- Consumes: `FifoCostingService`, `AccountingEngine`, `Sale`, `ProductBatch`
- Produces: 
  - `POST /api/v1/pos/checkout`
  - `GET /api/v1/pos/transactions`
  - `POST /api/v1/inventory/restock`
  - `GET /api/v1/inventory/stock-movements`

- [ ] **Step 1: Write Feature Tests for POS Checkout & Restock**
- Test POS checkout: creates sale, deducts FIFO stock, creates sales journal + HPP journal inside `DB::transaction`.
- Test POS rollback: verify if journal fails, stock is not deducted.
- Test Goods Receipt / Restock: adds batch, creates stock movement, creates purchase journal.

- [ ] **Step 2: Run tests to verify they fail**
Run: `php artisan test --filter=PosTransactionTest`
Expected: FAIL

- [ ] **Step 3: Implement `PosController` and `InventoryController`**
Wrap all mutation methods in `DB::transaction()`. Coordinate between `Sale`, `FifoCostingService`, and `AccountingEngine`.

- [ ] **Step 4: Register routes in `backend/routes/api.php`**
```php
Route::post('pos/checkout', [PosController::class, 'checkout']);
Route::get('pos/transactions', [PosController::class, 'index']);
Route::get('pos/transactions/{id}', [PosController::class, 'show']);
Route::post('inventory/restock', [InventoryController::class, 'restock']);
Route::get('inventory/stock-movements', [InventoryController::class, 'stockMovements']);
Route::post('inventory/stock-opname', [InventoryController::class, 'stockOpname']);
```

- [ ] **Step 5: Run tests to verify they pass**
Run: `php artisan test --filter=PosTransactionTest` and `php artisan test --filter=InventoryRestockTest`
Expected: PASS

- [ ] **Step 6: Commit changes**
```powershell
git add backend/app/Http/Controllers/ backend/app/Http/Requests/ backend/routes/ backend/tests/
git commit -m "feat(backend): atomic POS checkout and inventory restock endpoints"
```

---

### Task 7: Expenses & Void Reversal REST API

**Files:**
- Create: `backend/app/Http/Controllers/Api/v1/ExpenseController.php`
- Create: `backend/app/Http/Requests/ExpenseRequest.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/ExpenseApiTest.php`

**Interfaces:**
- Consumes: `Expense`, `ExpenseCategory`, `AccountingEngine`
- Produces: 
  - `GET /api/v1/expenses`
  - `POST /api/v1/expenses`
  - `POST /api/v1/expenses/{id}/void`

- [ ] **Step 1: Write Feature Test for Expense & Void**
In `backend/tests/Feature/ExpenseApiTest.php`:
- Test create expense: generates sequential BKK number, creates expense record, creates expense journal.
- Test void expense: updates status to VOID, creates reversal journal, restores cash balance.

- [ ] **Step 2: Run tests to verify they fail**
Run: `php artisan test --filter=ExpenseApiTest`
Expected: FAIL

- [ ] **Step 3: Implement `ExpenseController`**
Implement sequential voucher numbering (`BKK-YYYYMM-XXXX`), file attachment handling, and reversal journal generation using `AccountingEngine`.

- [ ] **Step 4: Register routes in `backend/routes/api.php`**
```php
Route::get('expenses', [ExpenseController::class, 'index']);
Route::post('expenses', [ExpenseController::class, 'store']);
Route::post('expenses/{id}/void', [ExpenseController::class, 'void']);
```

- [ ] **Step 5: Run tests to verify they pass**
Run: `php artisan test --filter=ExpenseApiTest`
Expected: PASS

- [ ] **Step 6: Commit changes**
```powershell
git add backend/app/Http/Controllers/ backend/app/Http/Requests/ backend/routes/ backend/tests/
git commit -m "feat(backend): expense management and void reversal journal API"
```

---

### Task 8: SAK EMKM Accounting Reports API Endpoints

**Files:**
- Create: `backend/app/Http/Controllers/Api/v1/AccountingReportController.php`
- Create: `backend/app/Http/Requests/ManualJournalRequest.php`
- Create: `backend/app/Http/Requests/PayDebtRequest.php`
- Modify: `backend/routes/api.php`
- Test: `backend/tests/Feature/AccountingReportApiTest.php`

**Interfaces:**
- Consumes: `AccountingEngine`, `JournalEntry`, `Account`
- Produces: 
  - `GET /api/v1/accounting/journals`
  - `POST /api/v1/accounting/journals/manual`
  - `GET /api/v1/accounting/general-ledger`
  - `GET /api/v1/accounting/trial-balance`
  - `GET /api/v1/accounting/accounts-payable`
  - `POST /api/v1/accounting/accounts-payable/pay`
  - `GET /api/v1/accounting/financial-statements`

- [ ] **Step 1: Write Feature Test for SAK EMKM Reports**
Test each endpoint verifying JSON structure, mathematical balancing ($\Delta = 0$), and correct debt settlement journal creation.

- [ ] **Step 2: Run tests to verify they fail**
Run: `php artisan test --filter=AccountingReportApiTest`
Expected: FAIL

- [ ] **Step 3: Implement `AccountingReportController`**
Connect methods to `AccountingEngine` and return JSON formatted for easy consumption by React charts and tables.

- [ ] **Step 4: Register routes in `backend/routes/api.php`**
```php
Route::prefix('accounting')->group(function () {
    Route::get('journals', [AccountingReportController::class, 'journals']);
    Route::post('journals/manual', [AccountingReportController::class, 'createManualJournal']);
    Route::get('general-ledger', [AccountingReportController::class, 'generalLedger']);
    Route::get('trial-balance', [AccountingReportController::class, 'trialBalance']);
    Route::get('accounts-payable', [AccountingReportController::class, 'accountsPayable']);
    Route::post('accounts-payable/pay', [AccountingReportController::class, 'payDebt']);
    Route::get('financial-statements', [AccountingReportController::class, 'financialStatements']);
});
```

- [ ] **Step 5: Run tests to verify they pass**
Run: `php artisan test --filter=AccountingReportApiTest`
Expected: PASS

- [ ] **Step 6: Commit changes**
```powershell
git add backend/app/Http/Controllers/ backend/app/Http/Requests/ backend/routes/ backend/tests/
git commit -m "feat(backend): SAK EMKM reports and accounting hub API endpoints"
```

---

### Task 9: Frontend API Client Layer & React State Synchronization

**Files:**
- Create: `src/services/api/apiClient.ts`
- Create: `src/services/api/productApi.ts`
- Create: `src/services/api/posApi.ts`
- Create: `src/services/api/inventoryApi.ts`
- Create: `src/services/api/expenseApi.ts`
- Create: `src/services/api/accountingApi.ts`
- Modify: `src/App.tsx`
- Modify: `.env.example` & `.env`

**Interfaces:**
- Consumes: Backend REST API on `http://127.0.0.1:8000/api/v1/`
- Produces: Type-safe asynchronous API client methods replacing client-side only mock state

- [ ] **Step 1: Create `src/services/api/apiClient.ts`**
Implement centralized Fetch/Axios wrapper with `BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1'`, timeout, standard headers, and friendly error handling.

- [ ] **Step 2: Create domain API modules**
Implement `productApi`, `posApi`, `inventoryApi`, `expenseApi`, and `accountingApi` with full TypeScript typing matching `src/shared/types/index.ts`.

- [ ] **Step 3: Update `src/App.tsx` data loading**
In `App.tsx`, add an initial asynchronous load (`useEffect`) that fetches products, services, suppliers, transactions, and expenses from the API. Provide an indicator/toast if backend is connected or offline.

- [ ] **Step 4: Connect POS Checkout & Actions to API**
Update `handleCheckout`, `handleSaveExpense`, `handleRestock` to call API endpoints, refresh state, and display toasts on success/error.

- [ ] **Step 5: Test TypeScript compilation**
Run: `npm run lint`
Expected: No TypeScript or lint errors.

- [ ] **Step 6: Commit changes**
```powershell
git add src/services/api/ src/App.tsx
git commit -m "feat(frontend): integrate React frontend with Laravel REST API client"
```

---

### Task 10: End-to-End Verification & Documentation

**Files:**
- Modify: `README.md`
- Create: `docs/superpowers/specs/API_DOCUMENTATION.md`

**Interfaces:**
- Consumes: Running Laravel server + running React Vite app + MySQL Laragon
- Produces: Complete verified end-to-end workflow and operational documentation

- [ ] **Step 1: Start Laravel backend and React frontend**
Verify both servers run cleanly:
- Laravel: `php artisan serve --port=8000` inside `backend/`
- React: `npm run dev` in project root

- [ ] **Step 2: Perform End-to-End Test in Browser**
1. Open POS screen, add a tire to cart, checkout with Cash.
2. Verify:
   - MySQL `sales` table has the new row.
   - MySQL `product_batches` has reduced quantity according to FIFO.
   - MySQL `journal_entries` and `journal_items` have balanced sales and HPP entries.
   - General Ledger, Trial Balance, and SAK EMKM Income Statement reflect the transaction.

- [ ] **Step 3: Update `README.md`**
Add instructions for running both backend and frontend, database setup in Laragon, and architecture explanation for the Skripsi double-degree committee.

- [ ] **Step 4: Commit changes**
```powershell
git add README.md docs/
git commit -m "docs: add full-stack Laravel-React execution and API documentation"
```
