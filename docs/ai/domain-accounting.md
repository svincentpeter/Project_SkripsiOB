# Domain: accounting (SAK EMKM)

The thesis rests on one claim: every business event produces a balanced double-entry journal, and SAK EMKM
reports (Laba Rugi, Posisi Keuangan/Neraca, Arus Kas) are derived from those journals. Keep that claim true.

## Chart of accounts (26 accounts)

Defined in `backend/database/seeders/AccountCoaSeeder.php`. The seeder inserts only missing codes.
Migration `2026_09_24_000003_add_pos_inventory_accounts.php` also inserts 2-1004, 4-2000, 5-2000, and 6-1009,
so databases created before that migration get them too.

| Code | Name | Type | Normal |
|---|---|---|---|
| 1-1000 | Kas Toko Laci Kasir (cash drawer) | ASSET | D |
| 1-1001 | Bank BCA Cabang 3 | ASSET | D |
| 1-1002 | Piutang Dagang (AR, from BON sales) | ASSET | D |
| 1-2000 | Persediaan Ban Baru Cabang 3 (inventory, FIFO) | ASSET | D |
| 1-3000 | Peralatan Bengkel & Mesin Spooring | ASSET | D |
| 1-3999 | Akumulasi Penyusutan Mesin (contra-asset) | ASSET | C |
| 2-1000 | Hutang Dagang Supplier (AP) | LIABILITY | C |
| 2-1003 | PPN Keluaran (11%) | LIABILITY | C |
| 2-1004 | Uang Muka Pelanggan (DP Booking) | LIABILITY | C |
| 3-1000 | Modal Disetor Pemilik | EQUITY | C |
| 3-2000 | Laba Ditahan Cabang 3 | EQUITY | C |
| 4-1000 | Pendapatan Penjualan Ban Baru | REVENUE | C |
| 4-1001 | Pendapatan Jasa Servis & Spooring | REVENUE | C |
| 4-2000 | Pendapatan Surcharge EDC | REVENUE | C |
| 4-9000 | Potongan Diskon Penjualan (contra-revenue) | REVENUE | D |
| 5-1000 | Harga Pokok Penjualan (HPP) Ban Baru | EXPENSE | D |
| 5-2000 | Selisih Persediaan (Opname) | EXPENSE | D |
| 6-1000 … 6-1008 | Operating expenses: gaji (salaries), listrik/air/internet (utilities), sewa (rent), transportasi (transport), ATK (supplies), perawatan mesin (machine maintenance), konsumsi/lembur (meals/overtime), pajak/retribusi (local taxes). **6-1002 does not exist.** | EXPENSE | D |
| 6-1009 | Beban MDR QRIS & EDC | EXPENSE | D |

There is no "contra" account type. Contra accounts are recognized by a normal balance opposite to their type.

The frontend keeps its own copy, `SAK_EMKM_COA` in `src/services/accountingService.ts`. It has 25 accounts (5-2000 is
missing), and four names differ from the backend (2-1004, 4-1001, 4-2000, 6-1009). The README's 21-account table is
outdated. When you add or rename an account, change the migration, the seeder, and `SAK_EMKM_COA` together.

## Posting mechanics (backend)

- `JournalDraft` (`app/Services/JournalDraft.php`) is a builder keyed by account code:
  `(new JournalDraft)->debit('1-1000', 50000, 'note')->credit('4-1000', 50000)->post($engine, $refType, $refId, $desc, $date)`.
  It drops zero lines. An unknown account code throws a `RuntimeException`, which the API returns as HTTP 500.
- `AccountingEngine::createEntry()` checks that the entry balances within 0.01 and throws
  `AccountingUnbalancedException` if not. It numbers entries `JRN-{Ym of entry date}-####` (**no lock**, see
  Known issues), always sets status `POSTED`, and always uses branch 3.
- Posting happens inside the caller's DB transaction, so an unbalanced journal rolls back the whole business
  operation.
- Journals are never edited or deleted. Corrections are reversing entries (`POS_SALE_VOID`, `VOID_EXPENSE`,
  `BOOKING_DP_REFUND`).

### `reference_type` values in use
`POS_SALE`, `POS_SALE_VOID`, `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`, `PURCHASE`, `DEBT_PAYMENT`,
`EXPENSE`, `VOID_EXPENSE`, `MANUAL_ADJUSTMENT`, `OPENING_BALANCE`, `STOCK_OPNAME`, `STOCK_IMPORT`,
`STOCK_RECONCILIATION`, `STOCK_COST_CORRECTION`. Reuse one of these where it fits. If you add a new value, list it here.

## Posting rules

| Event | Debit | Credit | Where |
|---|---|---|---|
| POS sale | cash/bank per payment at `net_received`; 6-1009 fees; 2-1004 DP applied; 1-1002 if BON; 4-9000 discounts; 5-1000 FIFO cost | 4-1000 goods (gross); 4-1001 services (gross); 2-1003 PPN; 4-2000 EDC surcharge; 1-2000 FIFO cost | `Pos/CheckoutService::postJournal` |
| POS void | mirror of the sale entry, dated today | | `Pos/SaleVoidService` |
| Booking DP received | 1-1000 or 1-1001 | 2-1004 | `Pos/BookingService` |
| Booking cancelled (refund) | 2-1004 | 1-1000 or 1-1001 | `Pos/BookingService` |
| BON settlement | 1-1000 or 1-1001 | 1-1002 | `Pos/ReceivableService` |
| Goods receipt | 1-2000 | 1-1000 (TUNAI), 1-1001 (TRANSFER_BCA), or 2-1000 (TEMPO) | `Inventory/GoodsReceiptService` |
| Supplier payment | 2-1000 | 1-1000 or 1-1001 | `Inventory/PayableService` |
| Stock value change (opname, import, reconciliation, cost fix) | 1-2000 if value rises | 5-2000 (existing product) or 3-1000 (product created in the operation) | `Inventory/InventoryValueJournal::record` (reverse direction if value falls) |
| Opening inventory | 1-2000 | 3-1000, for the gap between FIFO value and the 1-2000 ledger balance | `InventoryValueJournal::postOpeningBalance` |
| Expense (server, **unused by UI**) | category `default_account_code`, falling back to 6-1000 | 1-1000 (KAS_LACI/TUNAI), else 1-1001 | `ExpenseController::store` |
| Manual journal (server, **unused by UI**) | as submitted | as submitted | `AccountingReportController::createManualJournal` |

Account routing for payment methods lives in `Pos/PosAccounts::forMethod`: TUNAI goes to 1-1000; every other method,
including TRANSFER, QRIS, and EDC, goes to 1-1001.

## What the UI actually uses (important)

The accounting screens are still **client-side** (see the migration table in `AGENTS.md`):

- **Journal list:** React state persisted to localStorage `ob3_journals`, seeded from `INITIAL_JOURNALS` in
  `src/shared/data/mockData.ts`. Server journals are appended only when a server action in this session returns
  them (`mergeServerJournals`, deduplicated by `entry_number`). They are never fetched on load.
- **Expenses:** created and voided locally (`handleAddExpense` / `handleVoidExpense` in App.tsx,
  `generateExpenseJournal` in `src/shared/utils/formatters.ts`). Categories come from `EXPENSE_CATEGORY_CONFIG`,
  which maps each category to 6-1000…6-1008.
- **Manual journals, reversal ("storno"), and period closing:** `generateManualJournal`,
  `generateReversingJournal`, and `generateClosingJournal` in `accountingService.ts`. Closing moves every 4-/5-/6-
  balance into 3-2000 and sets `ob3_period_info.status = 'CLOSED'`. Nothing blocks postings after closing.
- **Reports:** `calculateAccountLedger`, `calculateTrialBalance`, `calculateDynamicSakEmkmFinancials`, and
  `calculateCashFlowStatement` in `accountingService.ts`. They are computed from the local journal list plus opening
  balances (`ob3_account_balances`). `calculateSakEmkmFinancials` is a legacy version with hard-coded figures; do
  not use it.
- Supplier debt payment (`/purchases/{id}/payments`) and receivable settlement (`/receivables`) **are** server-backed.

The **next migration stage** is expected to move expenses, manual journals, closing, and reports onto the
existing backend endpoints (`expenseApi.ts` and `accountingApi.ts` already exist but are not called). The pattern to
follow is in `docs/superpowers/specs/2026-09-24-inventory-server-design.md`.

Server report endpoints (`/accounting/trial-balance`, `/financial-statements`) are **all-time**: they have no period
filter. There is no server cash-flow statement and no server period closing.

## Known issues (verified 2026-09-27)
1. `AccountingEngine::getFinancialStatements` hard-codes its account lists. It omits 4-2000, 5-2000, and 6-1009 from
   the income statement and 2-1004 from liabilities, so `is_balanced` becomes false once those accounts have activity.
2. The frontend COA has no 5-2000, so server opname and reconciliation lines disappear from the frontend trial balance
   and closing. The frontend income statement also leaves out 4-2000.
3. A bank-paid expense is deducted twice on the client. `handleAddExpense` posts a journal crediting 1-1001 **and**
   lowers `accountBalances['1-1001']`, the opening balance. Voiding mirrors the same error.
4. Mock opening balances and mock journals sit alongside real server journals, including inventory
   `OPENING_BALANCE` entries, so frontend reports can double-count inventory and equity.
5. Frontend journal numbers are `JU-202609-{journals.length+1}` (the prefix is hard-coded), which can collide. Server
   numbers are `JRN-YYYYMM-####`, generated without a lock, so concurrent posts can hit the unique index.
6. On the server, voiding an already-voided expense returns 500 instead of 422 (`ExpenseController::void`).
   `expense_categories` is never seeded.
7. A manual journal whose lines are all zero passes validation.
8. Journal and BKK numbers use the month of the document date, while `DocumentNumber` uses `now()`.
