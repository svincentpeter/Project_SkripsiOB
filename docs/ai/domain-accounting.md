# Domain: accounting (SAK EMKM)

The thesis rests on one claim: every business event produces a balanced double-entry journal, and SAK EMKM
reports (Laba Rugi, Posisi Keuangan/Neraca, Arus Kas) are derived from those journals. Keep that claim true.

## Chart of accounts (27 accounts)

Defined in `backend/database/seeders/AccountCoaSeeder.php`. The seeder inserts only missing codes.
Migration `2026_09_24_000003_add_pos_inventory_accounts.php` also inserts 2-1004, 4-2000, 5-2000, and 6-1009,
so databases created before that migration get them too. Migration `2026_09_27_000001_remove_ppn_from_sales.php`
removed 2-1003 PPN Keluaran: the shop is non-PKP and charges no VAT on sales. Do not add a PPN account back.
PPN on supplier invoices belongs in the batch cost (1-2000), as in the reference system ProjectOmahBan.

Migration `2026_09_30_000001_deactivate_dp_bon_edc_accounts.php` sets 1-1002, 2-1004 and 4-2000 `is_active = false`
(inserting them inactive if missing): booking DP, BON credit sales and the EDC surcharge were removed from the POS on
2026-09-30. They stay in the COA because historic journals reference them; `ManualJournalRequest` rejects inactive
accounts and the manual-journal picker hides them. 6-1009 stays active for the QRIS MDR.
Migration `2026_10_02_000001_create_cash_sessions_and_cash_accounts.php` inserts 3-3000 Prive and 6-1010 Selisih Kas
Kasir (and creates `cash_sessions`).

| Code | Name | Type | Normal |
|---|---|---|---|
| 1-1000 | Kas Toko Laci Kasir (cash drawer) | ASSET | D |
| 1-1001 | Bank BCA Cabang 3 | ASSET | D |
| 1-1002 | Piutang Dagang (AR). **Inactive** since 2026-09-30 (no credit sales); historic entries only | ASSET | D |
| 1-2000 | Persediaan Ban Baru Cabang 3 (inventory, FIFO) | ASSET | D |
| 1-3000 | Peralatan Bengkel & Mesin Spooring | ASSET | D |
| 1-3999 | Akumulasi Penyusutan Mesin (contra-asset) | ASSET | C |
| 2-1000 | Hutang Dagang Supplier (AP) | LIABILITY | C |
| 2-1004 | Uang Muka Pelanggan (DP Booking). **Inactive** since 2026-09-30 (no booking DP); historic entries only | LIABILITY | C |
| 3-1000 | Modal Disetor Pemilik | EQUITY | C |
| 3-2000 | Laba Ditahan Cabang 3 | EQUITY | C |
| 3-3000 | Prive Pemilik (owner drawings; contra-equity, not closed by period closing) | EQUITY | D |
| 4-1000 | Pendapatan Penjualan Ban Baru | REVENUE | C |
| 4-1001 | Pendapatan Jasa Servis & Spooring | REVENUE | C |
| 4-2000 | Pendapatan Surcharge EDC. **Inactive** since 2026-09-30 (no card surcharge); historic entries only | REVENUE | C |
| 4-9000 | Potongan Diskon Penjualan (contra-revenue) | REVENUE | D |
| 5-1000 | Harga Pokok Penjualan (HPP) Ban Baru | EXPENSE | D |
| 5-2000 | Selisih Persediaan (Opname) | EXPENSE | D |
| 6-1000 … 6-1008 | Operating expenses: gaji (salaries), listrik/air/internet (utilities), sewa (rent), transportasi (transport), ATK (supplies), perawatan mesin (machine maintenance), konsumsi/lembur (meals/overtime), pajak/retribusi (local taxes). **6-1002 does not exist.** | EXPENSE | D |
| 6-1009 | Beban MDR QRIS & EDC (name kept; only the QRIS MDR posts here now) | EXPENSE | D |
| 6-1010 | Selisih Kas Kasir (Lebih/Kurang): cashier over/short, posted when a shift is approved | EXPENSE | D |

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
  `MANUAL_REVERSAL`).

### `reference_type` values in use
`POS_SALE`, `POS_SALE_VOID`, `PURCHASE`, `DEBT_PAYMENT`,
`EXPENSE`, `VOID_EXPENSE`, `MANUAL_ADJUSTMENT`, `OPENING_BALANCE`, `STOCK_OPNAME`, `STOCK_IMPORT`,
`STOCK_RECONCILIATION`, `STOCK_COST_CORRECTION`, `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`,
`ACCOUNT_OPENING`, `CASH_SESSION_VARIANCE`, `CASH_DEPOSIT`, `OWNER_DRAWING`, `CAPITAL_INJECTION`. Reuse one of these where it fits. If you add a new value, list it here.
Historic only (no longer produced since 2026-09-30): `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`. The
journal screen has no filter group for them; they show under "Semua".

## Posting rules

| Event | Debit | Credit | Where |
|---|---|---|---|
| POS sale | cash/bank per payment at `net_received`; 6-1009 QRIS MDR; 4-9000 discounts; 5-1000 FIFO cost | 4-1000 goods (gross); 4-1001 services (gross); 1-2000 FIFO cost | `Pos/CheckoutService::postJournal` |
| POS void | mirror of the sale entry, dated today | | `Pos/SaleVoidService` |
| Goods receipt | 1-2000 | 1-1000 (TUNAI), 1-1001 (TRANSFER_BCA), or 2-1000 (TEMPO) | `Inventory/GoodsReceiptService` |
| Supplier payment | 2-1000 | 1-1000 or 1-1001 | `Inventory/PayableService` |
| Stock value change (opname, import, reconciliation, cost fix) | 1-2000 if value rises | 5-2000 (existing product) or 3-1000 (product created in the operation) | `Inventory/InventoryValueJournal::record` (reverse direction if value falls) |
| Opening inventory | 1-2000 | 3-1000, for the gap between FIFO value and the 1-2000 ledger balance | `InventoryValueJournal::postOpeningBalance` |
| Expense | category `default_account_code` (6-1000…6-1008, seeded) | 1-1000 (TUNAI/KAS_LACI), else 1-1001 | `Accounting/ExpenseService`, now used by the UI. Void posts `VOID_EXPENSE`, the mirror of the original entry, linked by `reversal_of_id` |
| Manual journal | as submitted | as submitted | `Accounting/ManualJournalService`. Control accounts 1-1002, 1-2000, 2-1000, 2-1004 are rejected (validated in `ManualJournalRequest`). Only manual journals (`MANUAL_ADJUSTMENT`) are reversible from the journal screen, once each |
| Period closing | every REVENUE/EXPENSE account's cumulative balance ≤ month end (credit accounts) | 3-2000, or the reverse if the account is net-debit; dated the month's last day, then locked | `Accounting/PeriodClosingService::close`. Reopen posts the mirrored `PERIOD_REOPEN` entry (OWNER only) and unlocks. Close and reopen `lockForUpdate()` the 3-2000 account row (`PeriodClosingService::serialize()`) so two closes/reopens can't run at once |
| Account opening | 1-1000, 1-1001, 1-3000, 1-3999, 3-2000 as submitted | 3-1000, for the balancing difference | `Accounting/OpeningBalanceService::post`. Posted once (`ACCOUNT_OPENING`); further changes go through a manual journal. Posting `lockForUpdate()`s the 3-1000 account row before checking whether an opening entry already exists, so two concurrent posts can't both pass |
| Cashier shift approved | 6-1010 (shortage) or 1-1000 (overage) | 1-1000 (shortage) or 6-1010 (overage), amount = counted − book | `Accounting/CashSessionService::approve` (`CASH_SESSION_VARIANCE`, `SHIFT-{id}`, dated the approval day; no journal when 0) |
| Cash-to-bank deposit | 1-1001 | 1-1000 | `Accounting/CashMovementService` (`CASH_DEPOSIT`, `KAS-YYYYMM-####`) |
| Owner drawing (Prive) | 3-3000 | 1-1000 or 1-1001 | `Accounting/CashMovementService` (`OWNER_DRAWING`) |
| Capital injection | 1-1000 or 1-1001 | 3-1000 | `Accounting/CashMovementService` (`CAPITAL_INJECTION`) |

Account routing for payment methods lives in `Pos/PosAccounts::forMethod`: TUNAI goes to 1-1000; TRANSFER,
TRANSFER_BCA and QRIS go to 1-1001.

## Cash drawer and shifts

The drawer is account 1-1000 (of the POS payments, only TUNAI posts there). A cashier shift (`cash_sessions`) is a
window of journal ids (`from_entry_id`, `to_entry_id`]. Expected cash = `opening_float` + Σ(debit − credit) on 1-1000 of POSTED journals in
the window, excluding `CASH_SESSION_VARIANCE`, grouped per `reference_type` (`CashSessionService::summary`, labels in
`LINE_LABELS`). The opening float must match the book balance (1-1000 + adjustments of shifts still
`PENDING_APPROVAL`) or carry an `opening_note`; closing requires `variance_reason` when counted ≠ expected. Approval
(`cash_session_approve`, a non-OWNER cannot approve their own shift) posts `adjustment = variance + opening
difference`, so afterwards 1-1000 equals the counted cash as of the close. `CashSessionService::requireOpen()` guards
cash checkout (SP3 cash refunds will use it too). It finds the OPEN shift without a lock, then takes a shared lock
**by primary key** and re-checks the status, so `close()` (X lock on the same row) waits for an in-flight cash sale.
Never lock by the `status` predicate: its next-key lock collides with `approve()`, which holds the JRN number lock
(deadlock). Deposits, Prive and capital are single journals from `CashMovementService` (`cash_movement`).
The POS drawer figure is the 1-1000 ledger balance (`GET /accounting/cash-balances`); the old per-browser counter
`ob3_cash_drawer` and `cashPortion` no longer exist. The UI is `CashBankTab` (Buku Besar → "6. Kas & Bank": approvals
and owner cash movements); the journal screen groups these entries under the "Kas & Modal" filter.

**Go-live order:** post Buku Besar → Saldo Awal (`ACCOUNT_OPENING`, 1-1000) *before* opening the first shift. A shift
opened first books the whole float as an opening difference, journaled to 6-1010 as an overage on approval; the later
opening entry then shows up as the opposite shortage in the next shift. It nets to zero but misstates the P&L, maybe
across two months. For the same reason an `ACCOUNT_OPENING` or backdated drawer movement posted while a shift is open
counts inside that shift. The approval table shows the opening difference apart from the counting variance.

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
- The statement of changes in equity reports `owner_contributions` (credit-normal equity) and `owner_drawings`
  (debit-normal equity, i.e. Prive 3-3000) separately; the cash-flow report puts both in financing (EQUITY bucket)
  and the shift variance in operating expenses (6-1010 is EXPENSE).
- **`CashFlowReport::build($from, $to)`** is the direct method: every journal that touches 1-1000/1-1001
  attributes its non-cash lines (credit − debit) to a bucket (customers, suppliers, expenses, other operating,
  fixed assets, equity), so the buckets always reconcile to the cash change (`is_reconciled`).
  The `ACCOUNT_OPENING` journal is not a cash flow and is left out of the buckets; when it is dated inside
  the range, its 1-1000/1-1001 amount is added to `beginning_cash` instead, so reconciliation still holds.
- Inactive accounts (1-1002, 2-1004, 4-2000) still appear in every report, as zero rows or with their historic
  balances: no report query filters on `is_active` (only `ManualJournalRequest` does), so prior periods stay
  reproducible and the balance sheet still balances. `CashFlowReport::bucket()` keeps 1-1002 and 2-1004 in the
  customers bucket for historic entries.
- **`ExpenseService`**, **`ManualJournalService`**, **`PeriodClosingService`**, and **`OpeningBalanceService`**
  are the posting-side services (see the posting rules table above).

On the frontend, `accountingApi.ts` / `expenseApi.ts` are typed clients and `accountingMappers.ts` maps the wire
shapes to UI types. Accounting screens fetch their own data through `useServerData` (`src/modules/accounting/hooks/`),
keyed by the chosen period and by `ledgerVersion`. `App.tsx` increments `ledgerVersion` through
`notifyLedgerChanged` whenever a server action (checkout, void, expense, manual journal, …) returns journals, which
triggers every mounted report to reload. There is no local fallback: a failed request shows an inline error with
retry.

## Known issues (verified 2026-09-30)
- `GR-`, `OB3-INV-`, and `OPN-` document numbers still use the month of `now()` rather than the document
  date (only `JRN`/`BKK` were fixed to use the document date's month in Stage 4).
