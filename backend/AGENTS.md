# backend/AGENTS.md — Laravel API

Read the root [../AGENTS.md](../AGENTS.md) first. This file covers backend conventions only.
Endpoint list: [../docs/ai/api-reference.md](../docs/ai/api-reference.md).
Tables: [../docs/ai/data-model.md](../docs/ai/data-model.md).

Laravel 13 / PHP 8.3 / Sanctum 4 / PHPUnit 12 / phpoffice/phpspreadsheet. Laravel Boost is **not** installed.

## Setup

- DB: Laragon MySQL, database **`project-skripsi_ob`** (hyphen). `backend/.env.example` still defaults to
  `DB_CONNECTION=sqlite`, so set the MySQL values yourself (host 127.0.0.1, port 3306, user root, empty password).
- Required env: `APP_KEY`, `DB_*`, `SEED_DEFAULT_PASSWORD` (the user seeder throws without it),
  `SANCTUM_EXPIRATION=720` (minutes). Optional: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`,
  `MIDTRANS_IS_PRODUCTION`, `MIDTRANS_MERCHANT_ID`, `MIDTRANS_ALLOW_SIMULATION` (see `config/midtrans.php`). There is
  no fallback key: without `MIDTRANS_SERVER_KEY` dynamic QRIS cannot be charged and the webhook rejects everything.
  `MIDTRANS_ALLOW_SIMULATION=true` (ignored in production mode) enables `/payment/qris/simulate` and the fake QR.
- Fresh DB: `php artisan migrate --seed`, then `php artisan inventory:opening-balance` (the seeders
  create FIFO batches but post no journals). It runs **once** per database: the entry marks go-live of the
  inventory ledger, a second run exits 1, and afterwards the Excel commit and stock bulk-update are refused. Before
  the first sale, run a stock opname on products whose quantity exceeds their FIFO batch layers (such a sale is 422).
- `php artisan serve` → `http://127.0.0.1:8000`. All API routes live under `/api/v1` (`routes/api.php`).
- CORS allows all origins without credentials (bearer tokens, not cookies).

## Layout and conventions

```
app/Http/Controllers/Api/v1/   thin controllers: validate → call a service → JSON
app/Http/Requests/             FormRequests for larger payloads (authorize() returns true; routes gate access)
app/Http/Middleware/EnsurePermission.php   `permission:a,b` = user needs ANY listed key
app/Services/                  business logic; one service per use case
  AccountingEngine.php         the only writer of journal_entries/journal_items
  JournalDraft.php             fluent builder by account code: ->debit()->credit()->post()
  DocumentNumber.php           PREFIX-YYYYMM-#### with lockForUpdate (call inside a transaction)
  FifoCostingService.php       batch creation + FIFO allocation
  Pos/                         CheckoutService, CartLines, PosAccounts, SaleVoidService, SalesReturnService
  Accounting/                  ExpenseService, ManualJournalService, PeriodClosingService, OpeningBalanceService,
                               CashSessionService (shifts), CashMovementService (deposit/Prive/capital), reports
  Inventory/                   GoodsReceipt, Payable, PurchaseReturn (return + GR cancel), StockOpname(+Commit),
                               StockSelectiveUpdate, StockExcelImport, MonthlyStockLedger, InventoryValueJournal,
                               Excel/* (reader, parser, brand resolver, match key)
  Payment/MidtransQrisService.php   charge/status/simulate/webhook settlements → qris_transactions
app/Support/Permissions.php    permission keys, roles, KASIR/GUDANG defaults
app/Exceptions/                PosRuleException (renders 422 {message}), AccountingUnbalancedException
routes/console.php             `inventory:opening-balance`; app/Console/Commands/StockOpname.php = `stock:opname`
```

Follow the existing pattern when adding a feature:

- **Responses** use the envelope `{ "success": true, "message"?: "...", "data": ... }`. Create returns 201.
  Error messages are Indonesian because the UI shows them as-is.
- **Business rule violations** throw `PosRuleException('...')` → 422. Do not return ad-hoc error JSON from services.
- **Money-moving operations** run in one `DB::transaction`. Lock the rows you read and then change
  (`lockForUpdate`), post the journal inside the same transaction, and store the journal number on the
  source row when the table has a column for it.
- **Journals:** build with `JournalDraft` using account-code constants (`PosAccounts`, or constants on the
  service). Pick a `reference_type` that says what the document is (existing ones are listed in
  [../docs/ai/domain-accounting.md](../docs/ai/domain-accounting.md)). Never insert journal rows by hand.
- **Stock-changing inventory operations** are wrapped in `InventoryValueJournal::record(...)`, so the change
  in FIFO value is journaled against 1-2000.
- **New account codes** go in a migration (insert-if-missing) as well as `AccountCoaSeeder`. No frontend
  change is needed: the frontend loads the COA from `GET /accounts`.
- **New permission keys** go in `Permissions::KEYS`, the frontend `PermissionKey` union, the settings UI
  (`src/modules/settings/components/RolePermissionsTab.tsx`), and the route middleware.
- `branch_id` is hard-coded to 3 throughout. Single branch is intended.
- The server timezone is `Asia/Jakarta` (WIB, `config/app.php`, overridable with `APP_TIMEZONE`), matching the
  shop. Rows created before this was set keep their old UTC timestamps; `DATE` columns are unaffected.

## Tests

- `composer test` (runs `config:clear`, then `php artisan test`). Filter: `php artisan test --filter=PosCheckoutTest`.
- `phpunit.xml` targets **MySQL `project-skripsi_ob_testing`**, not sqlite. The database must exist and be
  migrated before the first run:
  PowerShell `$env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`.
- `tests/TestCase.php` seeds `TestBaselineSeeder` (COA + role permissions) and authenticates as OWNER on
  every test. Set `protected bool $authenticateAsOwner = false;` and call `actingAsRole('KASIR')` to test permissions.
- Use `DatabaseTransactions` in new feature tests, as the stage 2 and 3 tests do. Several older tests use no
  trait and leave rows behind. Four use `RefreshDatabase`, which wipes the testing DB (`migrate:fresh`).
  So test order can matter.
- POS fixtures: `tests/Concerns/CreatesPosFixtures.php`. Excel fixture: `tests/Fixtures/stock-fixture.xlsx`.
- Inventory tests assert `InventoryValueJournal::summary()['difference'] == 0` after each operation. Keep that
  assertion in new stock tests. Start aligned with `Tests\Concerns\AlignsInventoryLedger::alignInventoryLedger()`
  (posts the gap as `TEST_ALIGN`); do not call `POST /inventory/opening-balance` for that, because it is one-shot and
  marks go-live. Sales-return tests open a shift with `Tests\Concerns\OpensReturnCashSession`; test sales pay
  `TRANSFER_BCA` so the TUNAI shift rule does not interfere.
- Every new protected endpoint needs a 403 test for a role without the key.
