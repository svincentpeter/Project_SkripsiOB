# Domain: accounting (SAK EMKM)

The thesis rests on one claim: every business event produces a balanced double-entry journal, and SAK EMKM
reports (Laba Rugi, Posisi Keuangan/Neraca, Arus Kas) are derived from those journals. Keep that claim true.

## Chart of accounts (25 accounts)

Defined in `backend/database/seeders/AccountCoaSeeder.php`. The seeder inserts only missing codes.
Migration `2026_09_24_000003_add_pos_inventory_accounts.php` also inserts 2-1004, 4-2000, 5-2000, and 6-1009,
so databases created before that migration get them too. Migration `2026_09_27_000001_remove_ppn_from_sales.php`
removed 2-1003 PPN Keluaran: the shop is non-PKP and charges no VAT on sales. Do not add a PPN account back.
PPN on supplier invoices belongs in the batch cost (1-2000), as in the reference system ProjectOmahBan.

| Code | Name | Type | Normal |
|---|---|---|---|
| 1-1000 | Kas Toko Laci Kasir (cash drawer) | ASSET | D |
| 1-1001 | Bank BCA Cabang 3 | ASSET | D |
| 1-1002 | Piutang Dagang (AR, from BON sales) | ASSET | D |
| 1-2000 | Persediaan Ban Baru Cabang 3 (inventory, FIFO) | ASSET | D |
| 1-3000 | Peralatan Bengkel & Mesin Spooring | ASSET | D |
| 1-3999 | Akumulasi Penyusutan Mesin (contra-asset) | ASSET | C |
| 2-1000 | Hutang Dagang Supplier (AP) | LIABILITY | C |
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

The frontend has no COA copy; it loads `GET /accounts`. A new account needs only the migration and the seeder.
The README's 21-account table is outdated.

## Posting mechanics (backend)

- `JournalDraft` (`app/Services/JournalDraft.php`) is a builder keyed by account code:
  `(new JournalDraft)->debit('1-1000', 50000, 'note')->credit('4-1000', 50000)->post($engine, $refType, $refId, $desc, $date)`.
  It drops zero lines. An unknown account code throws a `RuntimeException`, which the API returns as HTTP 500.
- `AccountingEngine::createEntry()` is the only writer of `journal_entries`/`journal_items`. It rounds every
  line to the cent, drops zero lines, rejects negative amounts and lines that carry both a debit and a
  credit, and requires at least two non-zero lines with Σdebit = Σcredit to the cent (no tolerance) —
  otherwise `AccountingUnbalancedException`, which renders 422. The entry date must be after
  `PeriodLock::assertOpen()`'s lock date, or the entry is rejected with a `PosRuleException` (422). It numbers
  entries with `DocumentNumber::next(..., 'JRN', $date)` (locked and numbered by the month of the entry date),
  records `created_by` (the authenticated user, nullable for console commands) and an optional
  `reversal_of_id` linking a reversal to its original (unique, so an entry can be reversed at most once),
  always sets status `POSTED`, and always uses branch 3.
- Posting happens inside the caller's DB transaction, so an unbalanced journal rolls back the whole business
  operation.
- Journals are never edited or deleted. Corrections are reversing entries (`POS_SALE_VOID`, `VOID_EXPENSE`,
  `BOOKING_DP_REFUND`).

### `reference_type` values in use
`POS_SALE`, `POS_SALE_VOID`, `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`, `PURCHASE`, `DEBT_PAYMENT`,
`EXPENSE`, `VOID_EXPENSE`, `MANUAL_ADJUSTMENT`, `OPENING_BALANCE`, `STOCK_OPNAME`, `STOCK_IMPORT`,
`STOCK_RECONCILIATION`, `STOCK_COST_CORRECTION`, `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`,
`ACCOUNT_OPENING`. Reuse one of these where it fits. If you add a new value, list it here.

## Posting rules

| Event | Debit | Credit | Where |
|---|---|---|---|
| POS sale | cash/bank per payment at `net_received`; 6-1009 fees; 2-1004 DP applied; 1-1002 if BON; 4-9000 discounts; 5-1000 FIFO cost | 4-1000 goods (gross); 4-1001 services (gross); 4-2000 EDC surcharge; 1-2000 FIFO cost | `Pos/CheckoutService::postJournal` |
| POS void | mirror of the sale entry, dated today | | `Pos/SaleVoidService` |
| Booking DP received | 1-1000 or 1-1001 | 2-1004 | `Pos/BookingService` |
| Booking cancelled (refund) | 2-1004 | 1-1000 or 1-1001 | `Pos/BookingService` |
| BON settlement | 1-1000 or 1-1001 | 1-1002 | `Pos/ReceivableService` |
| Goods receipt | 1-2000 | 1-1000 (TUNAI), 1-1001 (TRANSFER_BCA), or 2-1000 (TEMPO) | `Inventory/GoodsReceiptService` |
| Supplier payment | 2-1000 | 1-1000 or 1-1001 | `Inventory/PayableService` |
| Stock value change (opname, import, reconciliation, cost fix) | 1-2000 if value rises | 5-2000 (existing product) or 3-1000 (product created in the operation) | `Inventory/InventoryValueJournal::record` (reverse direction if value falls) |
| Opening inventory | 1-2000 | 3-1000, for the gap between FIFO value and the 1-2000 ledger balance | `InventoryValueJournal::postOpeningBalance` |
| Expense | category `default_account_code` (6-1000…6-1008, seeded) | 1-1000 (TUNAI/KAS_LACI), else 1-1001 | `Accounting/ExpenseService`, now used by the UI. Void posts `VOID_EXPENSE`, the mirror of the original entry, linked by `reversal_of_id` |
| Manual journal | as submitted | as submitted | `Accounting/ManualJournalService`. Control accounts 1-1002, 1-2000, 2-1000, 2-1004 are rejected (validated in `ManualJournalRequest`). Only manual journals (`MANUAL_ADJUSTMENT`) are reversible from the journal screen, once each |
| Period closing | every REVENUE/EXPENSE account's cumulative balance ≤ month end (credit accounts) | 3-2000, or the reverse if the account is net-debit; dated the month's last day, then locked | `Accounting/PeriodClosingService::close`. Reopen posts the mirrored `PERIOD_REOPEN` entry (OWNER only) and unlocks. Close and reopen `lockForUpdate()` the 3-2000 account row (`PeriodClosingService::serialize()`) so two closes/reopens can't run at once |
| Account opening | 1-1000, 1-1001, 1-3000, 1-3999, 3-2000 as submitted | 3-1000, for the balancing difference | `Accounting/OpeningBalanceService::post`. Posted once (`ACCOUNT_OPENING`); further changes go through a manual journal. Posting `lockForUpdate()`s the 3-1000 account row before checking whether an opening entry already exists, so two concurrent posts can't both pass |

Account routing for payment methods lives in `Pos/PosAccounts::forMethod`: TUNAI goes to 1-1000; every other method,
including TRANSFER, QRIS, and EDC, goes to 1-1001.

## Reports

All report queries read straight from `journal_entries`/`journal_items` (`status = POSTED`), grouped from the
COA rather than hard-coded account lists, in `app/Services/Accounting/`:

- **`LedgerBalances::forRange($from, $to, $excludeClosing)`** does one grouped query per report and returns an
  `AccountBalance` per account (`signed('DEBIT'|'CREDIT')`, `net()`). Every other report is built on top of it.
- **`FinancialReportService`** builds the trial balance, general ledger (with the opening balance before
  `$from`), income statement, balance sheet, and statement of changes in equity. Sections are classified from
  `account_type` and `normal_balance`/code prefix (current vs fixed assets, cost of sales `5-…` vs operating
  expenses `6-…`, revenue vs contra-revenue), so a new account shows up without a code change. The income
  statement excludes `PERIOD_CLOSING`/`PERIOD_REOPEN` entries so closing never hides a month's result; the
  balance sheet as of a date includes everything, showing unclosed earnings as an equity line so it always
  balances.
- **`CashFlowReport::build($from, $to)`** is the direct method: every journal that touches 1-1000/1-1001
  attributes its non-cash lines (credit − debit) to a bucket (customers, suppliers, expenses, other operating,
  fixed assets, equity), so the buckets always reconcile to the cash change (`is_reconciled`).
  The `ACCOUNT_OPENING` journal is not a cash flow and is left out of the buckets; when it is dated inside
  the range, its 1-1000/1-1001 amount is added to `beginning_cash` instead, so reconciliation still holds.
- **`ExpenseService`**, **`ManualJournalService`**, **`PeriodClosingService`**, and **`OpeningBalanceService`**
  are the posting-side services (see the posting rules table above).

On the frontend, `accountingApi.ts` / `expenseApi.ts` are typed clients and `accountingMappers.ts` maps the wire
shapes to UI types. Accounting screens fetch their own data through `useServerData` (`src/modules/accounting/hooks/`),
keyed by the chosen period and by `ledgerVersion`. `App.tsx` increments `ledgerVersion` through
`notifyLedgerChanged` whenever a server action (checkout, void, expense, manual journal, …) returns journals, which
triggers every mounted report to reload. There is no local fallback: a failed request shows an inline error with
retry.

## Known issues (verified 2026-09-30)
- `GR-`, `OB3-INV-`, `BK-`, and `OPN-` document numbers still use the month of `now()` rather than the document
  date (only `JRN`/`BKK` were fixed to use the document date's month in Stage 4).
- `ob3_cash_drawer` still differs from the 1-1000 ledger balance (roadmap sub-project 2).
