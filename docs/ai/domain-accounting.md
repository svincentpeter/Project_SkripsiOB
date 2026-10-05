# Domain: accounting (SAK EMKM)

The thesis rests on one claim: every business event produces a balanced double-entry journal, and SAK EMKM
reports (Laba Rugi, Posisi Keuangan/Neraca, Arus Kas) are derived from those journals. Keep that claim true.

## Chart of accounts (33 accounts)

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
Kasir (and creates `cash_sessions`). Migration `2026_10_03_000001_add_sales_return_account_and_permissions` inserts
4-9100 Retur Penjualan (and the `sales_return`/`purchase_return` permission rows).
Migration `2026_10_04_000001_add_sak_emkm_accounts.php` adds 1-1100, 2-1100, 4-3000, 6-1011 and 6-1012 (SP4, SAK EMKM
completeness).

| Code | Name | Type | Normal |
|---|---|---|---|
| 1-1000 | Kas Toko Laci Kasir (cash drawer) | ASSET | D |
| 1-1001 | Bank BCA Cabang 3 | ASSET | D |
| 1-1002 | Piutang Dagang (AR). **Inactive** since 2026-09-30 (no credit sales); historic entries only | ASSET | D |
| 1-1100 | Beban Dibayar di Muka (prepaid expenses) | ASSET | D |
| 1-2000 | Persediaan Ban Baru Cabang 3 (inventory, FIFO) | ASSET | D |
| 1-3000 | Peralatan Bengkel & Mesin Spooring. Control account: only the fixed asset register (and the account opening balance) posts here | ASSET | D |
| 1-3999 | Akumulasi Penyusutan Mesin (contra-asset). Control account: only the fixed asset register (and the account opening balance) posts here | ASSET | C |
| 2-1000 | Hutang Dagang Supplier (AP) | LIABILITY | C |
| 2-1004 | Uang Muka Pelanggan (DP Booking). **Inactive** since 2026-09-30 (no booking DP); historic entries only | LIABILITY | C |
| 2-1100 | Beban Yang Masih Harus Dibayar (accrued expenses) | LIABILITY | C |
| 3-1000 | Modal Disetor Pemilik | EQUITY | C |
| 3-2000 | Laba Ditahan Cabang 3 | EQUITY | C |
| 3-3000 | Prive Pemilik (owner drawings; contra-equity, not closed by period closing) | EQUITY | D |
| 4-1000 | Pendapatan Penjualan Ban Baru | REVENUE | C |
| 4-1001 | Pendapatan Jasa Servis & Spooring | REVENUE | C |
| 4-2000 | Pendapatan Surcharge EDC. **Inactive** since 2026-09-30 (no card surcharge); historic entries only | REVENUE | C |
| 4-3000 | Pendapatan Bunga Bank (bank interest) | REVENUE | C |
| 4-9000 | Potongan Diskon Penjualan (contra-revenue) | REVENUE | D |
| 4-9100 | Retur Penjualan (contra-revenue; sales returns) | REVENUE | D |
| 5-1000 | Harga Pokok Penjualan (HPP) Ban Baru | EXPENSE | D |
| 5-2000 | Selisih Persediaan (Opname) | EXPENSE | D |
| 6-1000 … 6-1008 | Operating expenses: gaji (salaries), listrik/air/internet (utilities), sewa (rent), transportasi (transport), ATK (supplies), perawatan mesin (machine maintenance), konsumsi/lembur (meals/overtime), pajak/retribusi (local taxes). **6-1002 does not exist.** | EXPENSE | D |
| 6-1009 | Beban MDR QRIS & EDC (name kept; only the QRIS MDR posts here now) | EXPENSE | D |
| 6-1010 | Selisih Kas Kasir (Lebih/Kurang): cashier over/short, posted when a shift is approved | EXPENSE | D |
| 6-1011 | Beban Penyusutan Aset Tetap (depreciation) | EXPENSE | D |
| 6-1012 | Beban Administrasi Bank (bank charges) | EXPENSE | D |

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
- **Cash and bank never go negative** (`AccountingEngine::NON_NEGATIVE_ACCOUNTS` = 1-1000, 1-1001; AIS sign/limit
  check). When an entry credits one of them, `createEntry` reads that account's POSTED balance per `entry_date` with a
  current read (`sharedLock`, after the JRN number lock and its own inserts) and rejects (`PosRuleException`, 422)
  if the cumulative balance on the entry date or any later date is below zero, so a backdated outflow cannot turn a
  later day negative either. Inflows are never checked. For 1-1000 the balance includes the adjustments of shifts
  still `PENDING_APPROVAL`, each from the day its shift closed (`CashSessionService::pendingAdjustmentsByDate()`, read
  with a shared lock so a close/approval committed after the transaction snapshot is seen); the shift approval
  itself (`CASH_SESSION_VARIANCE`) is exempt because it sets 1-1000 to the counted cash. Every outflow path is
  covered (expenses, cash/transfer receipts and payable payments, refunds, voids, deposits, Prive, asset purchases,
  bank adjustments, manual journals). The S locks on `journal_items`/`journal_entries` can deadlock two outflows in
  different months, or a KAS/MEMO number lock against a same-month outflow; every crediting caller runs
  `DB::transaction(..., 3)` so the victim retries. A database that already has a negative day must post an inflow
  (manual journal or capital injection) before outflows dated on or before that day pass. Switch: `config('accounting.guard_negative_cash')` (`ACCOUNTING_GUARD_NEGATIVE_CASH`, default true;
  `phpunit.xml` sets it false because older fixtures pay without an opening balance, `NonNegativeCashTest` turns it on).
- Posting happens inside the caller's DB transaction, so an unbalanced journal rolls back the whole business
  operation.
- Journals are never edited or deleted. Corrections are reversing entries (`POS_SALE_VOID`, `VOID_EXPENSE`,
  `MANUAL_REVERSAL`, `GOODS_RECEIPT_CANCEL`, `FIXED_ASSET_VOID`) or new documents (`SALES_RETURN`, `PURCHASE_RETURN`).

### `reference_type` values in use
`POS_SALE`, `POS_SALE_VOID`, `PURCHASE`, `DEBT_PAYMENT`,
`EXPENSE`, `VOID_EXPENSE`, `MANUAL_ADJUSTMENT`, `OPENING_BALANCE`, `STOCK_OPNAME`, `STOCK_IMPORT`,
`STOCK_RECONCILIATION`, `STOCK_COST_CORRECTION`, `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`,
`ACCOUNT_OPENING`, `CASH_SESSION_VARIANCE`, `CASH_DEPOSIT`, `OWNER_DRAWING`, `CAPITAL_INJECTION`, `SALES_RETURN`,
`PURCHASE_RETURN`, `GOODS_RECEIPT_CANCEL`, `FIXED_ASSET_ACQUISITION`, `FIXED_ASSET_VOID`, `DEPRECIATION`,
`ADJUSTING_ENTRY`, `ADJUSTING_REVERSAL`, `BANK_RECON_ADJUSTMENT`. Reuse one of these where it fits. If you add a new value, list it here.
`TEST_ALIGN` is used by tests only (`AlignsInventoryLedger`), never in production.
Historic only (no longer produced since 2026-09-30): `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`. The
journal screen has no filter group for them; they show under "Semua".

## Posting rules

| Event | Debit | Credit | Where |
|---|---|---|---|
| POS sale | cash/bank per payment at `net_received`; 6-1009 QRIS MDR; 4-9000 discounts; 5-1000 FIFO cost | 4-1000 goods (gross); 4-1001 services (gross); 1-2000 FIFO cost | `Pos/CheckoutService::postJournal`. Manual lines are services only (4-1001, no cost of sales) |
| POS void | mirror of the sale entry, dated today | | `Pos/SaleVoidService` |
| Sales return | 4-9100 refund; 1-2000 restored cost | 1-1000 refund; 5-1000 restored cost | `Pos/SalesReturnService` (`SALES_RETURN`, `RTJ-YYYYMM-####`, dated today; the refund is always cash from the drawer) |
| Goods receipt | 1-2000 | 1-1000 (TUNAI), 1-1001 (TRANSFER_BCA), or 2-1000 (TEMPO) | `Inventory/GoodsReceiptService` |
| Purchase return | 2-1000 applied payable (TEMPO, capped at `remaining()`); 1-1000/1-1001 refund | 1-2000 | `Inventory/PurchaseReturnService::returnGoods` (`PURCHASE_RETURN`, `RTB-YYYYMM-####`, dated today) |
| GR cancellation | mirror of the `PURCHASE` entry, `reversal_of_id` set | | `PurchaseReturnService::cancel` (`GOODS_RECEIPT_CANCEL`, `RTB-…`, dated today; a Rp 0 GR has no entry to mirror) |
| Supplier payment | 2-1000 | 1-1000 or 1-1001 | `Inventory/PayableService` |
| Stock value change (opname, import, reconciliation, cost fix) | 1-2000 if value rises | 5-2000 (existing product) or 3-1000 (product created in the operation) | `Inventory/InventoryValueJournal::record` (reverse direction if value falls) |
| Opening inventory | 1-2000 | 3-1000, for the gap between FIFO value and the 1-2000 ledger balance | `InventoryValueJournal::postOpeningBalance`. Posted once (`OPENING_BALANCE`, reference `OPENING-INV-…`); the entry marks go-live and a second post is refused (422 / console exit 1). A Rp 0 gap posts nothing and does not mark go-live |
| Expense | category `default_account_code` (6-1000…6-1008, seeded) | 1-1000 (TUNAI/KAS_LACI), else 1-1001 | `Accounting/ExpenseService`, now used by the UI. Void posts `VOID_EXPENSE`, the mirror of the original entry, linked by `reversal_of_id` |
| Manual journal | as submitted | as submitted | `Accounting/ManualJournalService`. Control accounts 1-1002, 1-2000, 2-1000, 2-1004, 1-3000, 1-3999 are rejected (`ManualJournalService::CONTROL_ACCOUNTS`, validated in `ManualJournalRequest`). Only manual journals (`MANUAL_ADJUSTMENT`) are reversible from the journal screen, once each |
| Period closing | every REVENUE/EXPENSE account's cumulative balance ≤ month end (credit accounts) | 3-2000, or the reverse if the account is net-debit; dated the month's last day, then locked | `Accounting/PeriodClosingService::close`. Reopen posts the mirrored `PERIOD_REOPEN` entry (OWNER only) and unlocks. Close and reopen `lockForUpdate()` the 3-2000 account row (`PeriodClosingService::serialize()`) so two closes/reopens can't run at once. Refuses a month while `DepreciationService::pendingTotal(period) > 0` (depreciation not run) |
| Account opening | 1-1000, 1-1001, 1-3000, 1-3999, 3-2000 as submitted | 3-1000, for the balancing difference | `Accounting/OpeningBalanceService::post`. Posted once (`ACCOUNT_OPENING`). Later changes to 1-1000, 1-1001 or 3-2000 go through a manual journal; 1-3000/1-3999 are control accounts that a manual journal cannot post to (fixed asset corrections: see the fixed asset register below). Posting `lockForUpdate()`s the 3-1000 account row before checking whether an opening entry already exists, so two concurrent posts can't both pass |
| Cashier shift approved | 6-1010 (shortage) or 1-1000 (overage) | 1-1000 (shortage) or 6-1010 (overage), amount = counted − book | `Accounting/CashSessionService::approve` (`CASH_SESSION_VARIANCE`, `SHIFT-{id}`, dated the approval day; no journal when 0) |
| Fixed asset bought | 1-3000 | 1-1000 (TUNAI) or 1-1001 (TRANSFER); `MODAL` (owner contribution in kind / asset missing from the opening balance): 1-3999 opening accumulation + 3-1000 net book value; `OPENING` assets post nothing (already in the account opening balance) | `Accounting/FixedAssetService::create` (`FIXED_ASSET_ACQUISITION`, reference = asset code `AT-YYYYMM-####`, dated the acquisition date). Void (also after depreciation, while every depreciation month is open): one `FIXED_ASSET_VOID` per depreciation month (Dr 1-3999 / Cr 6-1011, dated the month end), then the acquisition mirror `FIXED_ASSET_VOID` dated today, `reversal_of_id` (none for `OPENING`); see the register below |
| Monthly depreciation | 6-1011 per asset | 1-3999 total; dated the month's last day, reference `SUSUT-YYYY-MM` | `Accounting/DepreciationService::run`. Straight line on cost − residual − opening accumulated, over `useful_life_months`, full month from `depreciation_start`; cumulative in cents so reruns post nothing and locked months are caught up; the previous open month must run first; `fixed_asset_depreciations` keeps one row per asset per run |
| Adjusting entry (AJP) | 6-xxxx expense (not 6-1011) | 2-1100 (`ACCRUAL`) or 1-1100 (`PREPAID`); dated the month's last day, reference `AJP-YYYYMM-####` | `Accounting/AdjustingEntryService::create` (`ADJUSTING_ENTRY`). `auto_reverse` (accruals only) posts the mirror `ADJUSTING_REVERSAL` immediately, dated day 1 of the next month |
| Bank charge / interest from the statement | 6-1012, or 1-1001 | 1-1001, or 4-3000; dated the statement date, reference `REKON-{lineId}` | `Accounting/BankReconciliationService::postAdjustment` (`BANK_RECON_ADJUSTMENT`); the statement line is matched to the new 1-1001 line |
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
cash checkout and every sales return (the refund is cash from the drawer). A sales return stores its shift on
`sales_returns.cash_session_id`; its 1-1000 credit shows in the shift summary as "Retur penjualan (refund tunai)"
(`LINE_LABELS` also label `PURCHASE_RETURN` and `GOODS_RECEIPT_CANCEL`; they touch 1-1000 only when the supplier's
refund goes to the drawer, and they need no open shift). Lock order:
- `requireOpen()`: S on the 1-1000 `accounts` row → plain read of the OPEN shift → S on that shift **by primary key**,
  re-checking `status = OPEN` (422 otherwise). The caller then takes the `DocumentNumber` locks (OB3-INV, JRN) and
  inserts `journal_items`; the FK `journal_items.account_id → accounts` takes S on the 1-1000 row, already held.
- `open()`/`close()`/`approve()`: X on the 1-1000 `accounts` row first (`serialize()`). `open()` then only checks that
  no shift is OPEN and inserts a new row; it takes no X lock on a shift PK. `close()` and `approve()` then take X on
  the shift PK; only `approve()` then takes the JRN number lock. `close()` reads `max(journal_entries.id)` after both
  locks, so a cash sale in flight is inside the window.
- Sales return (`SalesReturnService::create`): `requireOpen()` (S on 1-1000 → S on the shift PK) → X on the products
  of the returned lines, by id → X on the sale → X on its `sale_batch_allocations` by primary key → the `RTJ` number
  lock → S (current read) on prior `sales_return_items` → X on each batch that takes units back. The RTJ lock
  serializes returns, so the gap locks of the prior-returns read never meet another return's insert.
- Void (`SaleVoidService::void`): X on the sale's products, sorted by id → X on the sale → S (current read) on its
  `sales_returns` → X on the batches.
- Checkout: `requireOpen()` for a TUNAI payment → X on the cart's catalogue products, sorted by id (`CartLines`) →
  the OB3-INV number → X on the batches (`product_id` index, ascending) → JRN. Opname: X on its products sorted by id
  → the OPN number (an index range read on `stock_movements.reference_id`, indexed by `2026_10_05_000003`, so it
  locks only the OPN rows of that month and the next index record, not every stock movement) → X on their batches. Purchase return and GR cancel: X on the purchase → X on its product → X on
  its batches through the `product_id` index. Every flow locks products before batches, and every multi-product
  flow above locks its products sorted by id, so no two of them form a product/batch cycle. Exception:
  `Inventory/StockSelectiveUpdateService` (stock bulk update) still locks products one by one in input order; it
  runs no retry, so a rare deadlock against a checkout/opname surfaces as an error to retry by hand.

Because every shift operation contends on the 1-1000 row at its first step, `close()` never holds X(1-1000) while
waiting for a shift row that a sale holds (the FK S-lock cycle). Never lock shifts by the `status` predicate: its
next-key lock collides with `approve()`'s status update. `open()`, `close()`, `approve()` and the sales return run in
`DB::transaction(..., 3)`, as do checkout, void, the purchase return and the GR cancel: three attempts, so at most
two retries. Laravel retries on a deadlock (1213) and on a lock-wait timeout (1205); both count as concurrency errors.
The opname (`StockOpnameService::adjust`) runs in `DB::transaction(..., 3)` too. Every retried closure only
writes to the database. A cycle can still
form through InnoDB's queue on the 1-1000 row (a sale holding S(1-1000) waits for the JRN lock, held by a cash expense
whose FK S request queues behind a waiting shift X), and the waiting shift operation, which has written nothing yet,
is the usual victim.

Deposits, Prive and capital are single journals from `CashMovementService` (`cash_movement`).
The POS drawer figure is the 1-1000 ledger balance (`GET /accounting/cash-balances`); the old per-browser counter
`ob3_cash_drawer` and `cashPortion` no longer exist. The UI is `CashBankTab` (Buku Besar → "6. Kas & Bank": approvals
and owner cash movements); the journal screen groups these entries under the "Kas & Modal" filter.

**Go-live order:** post Buku Besar → Saldo Awal (`ACCOUNT_OPENING`, 1-1000) *before* opening the first shift. A shift
opened first books the whole float as an opening difference, journaled to 6-1010 as an overage on approval; the later
opening entry then shows up as the opposite shortage in the next shift. It nets to zero but misstates the P&L, maybe
across two months. For the same reason an `ACCOUNT_OPENING` or backdated drawer movement posted while a shift is open
counts inside that shift. The approval table shows the opening difference apart from the counting variance.

## Fixed assets, adjusting entries and bank reconciliation (SP4)

UI: Buku Besar → "7. Aset Tetap" (`fixed_assets`) and "8. Rekonsiliasi Bank" (`bank_reconciliation`); the
"AJP Akrual / Dibayar di Muka" button in the Buku Besar header (`accounting_hub`); the CALK is "5. CALK" in
`SakEmkmReportTab` (Laporan Keuangan screen and the ledger's reports tab). The journal screen groups the new entries
under the filters "Aset Tetap", "AJP Akrual/Prabayar" and "Rekonsiliasi Bank".

**Fixed asset register.** `fixed_assets` is the sub-ledger of 1-3000/1-3999 (`FixedAssetService::summary` compares the
active register with both ledger balances; the tab shows "Cocok" when both differences are 0). A bought asset
(`TUNAI`/`TRANSFER`) posts its acquisition and starts depreciating in its acquisition month. An `OPENING` asset posts
nothing: its cost and prior depreciation are already in the account opening balance (`ACCOUNT_OPENING`, which may post
1-3000/1-3999), and it carries its own `depreciation_start` (not before the acquisition month) and
`opening_accumulated_depreciation`. For an `OPENING` asset `useful_life_months` is the **remaining** life from
`depreciation_start` (the form asks for "Sisa umur manfaat"), and the base is cost − residual − opening accumulated
depreciation; the CALK policy text says the same. There is no disposal.

A `MODAL` asset (spec `2026-10-05-bank-group-match-and-asset-capital-design.md`) takes the same fields as `OPENING`
but books itself: Dr 1-3000 cost / Cr 1-3999 opening accumulation / Cr 3-1000 net book value
(`FIXED_ASSET_ACQUISITION`, no cash line, so the cash flow ignores it and the equity statement shows a contribution).
It is the only way to add to 1-3000/1-3999 without paying: an asset the owner brings in, or one left out of the
account opening balance. Its void mirrors that journal like a bought asset.

**Correcting a wrongly entered asset (void).** `POST /accounting/fixed-assets/{id}/void {reason}`
(`FixedAssetService::void`) works before and after depreciation (user decision SP4, 2026-10-05). It is allowed only
while every month holding one of the asset's `fixed_asset_depreciations` rows is still open; if any is on or before
the lock date it is 422 and nothing is posted (reopen that month first). The void posts, in this order:
- one `FIXED_ASSET_VOID` entry per depreciation month, ascending: Dr 1-3999 / Cr 6-1011 for that month's amount,
  dated the month end, so each month's depreciation expense nets to zero (months with a zero amount are skipped);
- then the acquisition mirror (`FIXED_ASSET_VOID`, `reversal_of_id` = the acquisition, dated today). An `OPENING`
  asset has no acquisition journal, so only the depreciation reversals (if any) are posted, unless the request sends
  `correct_ledger: true` (OPENING only, else 422): the opening balance itself was wrong, and a `FIXED_ASSET_VOID`
  dated today posts Dr 3-1000 net book value / Dr 1-3999 opening accumulation / Cr 1-3000 cost. The UI asks this
  after the reason ("OK" = also correct the ledger, "Batal" = duplicate register entry only).

The depreciation rows stay as history (the asset turns `VOID`). Every consumer ignores VOID assets: the register
summary and pending depreciation read ACTIVE only; the CALK lists a VOID asset only for month ends before its void
date, with accumulated = its opening accumulated depreciation only (its system depreciation was reversed in those
months), so the note still equals ledger 1-3999. `GET /accounting/fixed-assets` still returns a VOID row's historical
`accumulated_depreciation` (sum of its rows); the tab shows it struck through, outside the totals. Afterwards the user
re-enters the asset with correct data and runs depreciation for the open months (catch-up applies).
Thesis caveat: because the acquisition mirror is dated today, balance sheets and CALK notes for month ends between
the acquisition and the void date still show the wrong cost in 1-3000 (register and ledger agree, both wrong).

**Depreciation semantics** (`DepreciationService`, `FixedAsset::expectedCentsThrough`):
- Cumulative: per asset, amount = expected depreciation through the month (in cents, `intdiv`, full base once the
  useful life is reached, so the last month absorbs rounding) − everything already posted for that asset in any month.
  A rerun posts nothing (200 "Tidak ada penyusutan…").
- Catch-up: months already locked when the asset entered the register (an `OPENING` asset with an old
  `depreciation_start`) are caught up in the first open month's journal. A run is refused for a locked month, and
  while the previous month is open and still has pending depreciation.
- Reopen: after a month is reopened, depreciation already caught up in a later month's journal stays there; the
  reopened month shows nothing pending (by design, no double depreciation).
- Period close is blocked while `pendingTotal(period) > 0` (422 "Penyusutan aset tetap sampai … belum dibukukan").
- The AJP form rejects 6-1011, and manual journals reject 1-3000/1-3999, so depreciation comes from the register
  (a manual journal could still debit 6-1011, but not credit 1-3999).

**AJP.** Accruals (`ACCRUAL`, Cr 2-1100) and used-up prepayments (`PREPAID`, Cr 1-1100) for the current or an earlier
open month. Only accruals may auto-reverse; the `ADJUSTING_REVERSAL` is posted at once, dated day 1 of the next
month, and linked by `reversal_of_id`. Paying the accrued expense later is a normal posting (for example a manual
journal Dr 2-1100 / Cr 1-1001), which the cash-flow report puts under expenses.

**Bank reconciliation semantics** (`BankReconciliationService`, account 1-1001 only):
- Statement lines (`bank_statement_lines`, + money in, − money out) are matched **1:1** to 1-1001 journal lines
  (`journal_item_id` is unique): same amount and direction (in = debit, out = credit).
- Group match (`journal_item_ids`, e.g. one Midtrans settlement credit for a day's QRIS sales): every journal line has
  the line's direction and they sum to the statement amount to the cent. The statement line becomes a hidden parent
  (`is_split`) and one child line per journal line (`parent_id`, amount = that line's debit − credit) is matched 1:1,
  so every rule below holds per child. Parents are left out of the report, auto-match, matching, adjustment posting
  and deletion; children are left out of the CSV duplicate check. Unmatching any child deletes all children and
  restores the parent. "Bukukan bunga bank / biaya admin" asks for confirmation first, because a settlement booked as
  interest would count the sales twice. `ACCOUNT_OPENING` lines cannot be
  matched and are never outstanding; ledger lines dated before the month of the first statement line (the cut-over)
  are treated as already cleared.
- Auto-match (`POST …/auto-match`): an unmatched statement line dated ≤ the month end is matched only when exactly
  one unmatched ledger line has the same amount and direction within ±3 days; ambiguous lines stay for manual matching.
- Past periods are judged **as of the period end**: a statement line matched to a journal dated after the month end
  still counts as unrecorded that month, and a ledger line matched to a statement line dated after the month end is
  still outstanding, so last month's report does not change when its items are matched next month.
- An unrecorded statement line can be booked with `post-adjustment`: money out → Dr 6-1012 / Cr 1-1001, money in →
  Dr 1-1001 / Cr 4-3000, dated the statement date (refused in a locked period: book it with a manual journal in an
  open period). Such a match cannot be undone with unmatch; a matched line must be unmatched before it can be deleted.
- CSV import (`POST …/import`, multipart `file`, ≤ 1 MB): the header row must name `tanggal`, `keterangan`, `jumlah`
  (any order; delimiter `;` or `,`, whichever the header uses more; a UTF-8 BOM is ignored). Dates `YYYY-MM-DD`,
  `DD/MM/YYYY` or `D/M/YYYY` (no leading zeros), not in the future; `keterangan` is required, at most 255 characters; `jumlah` is a non-zero number with a dot for decimals (max 2) and no thousands
  separator, |amount| ≤ 10,000,000,000; a description containing the delimiter must be quoted (a row whose cell count
  differs from the header is rejected). Blank lines are skipped; max 1000 rows. All-or-nothing: one bad row rejects the
  whole file. Rows identical (date, description, amount) to lines already stored are skipped once per stored copy,
  so re-importing a file is safe and only surplus duplicates inside the file are added.
- Status: "Terekonsiliasi" when the statement ending balance (`bank_reconciliations`, one per month, may be negative
  and carry cents) is entered and the difference is 0.

**CALK.** Built on the server (`CalkReport`) from the same journals as the balance sheet. The entity details are
constants in `CalkReport::ENTITY` (`backend/app/Services/Accounting/CalkReport.php`); the legal form and address are
placeholders until the owner confirms them. The PPh Final 0.5% (PP 55/2022) appears only as policy text; it is not
accrued (user decision): tax paid is expensed to 6-1008 when paid. The payables note nets purchase returns and
receipt cancellations by `return_date`, so an invoice cancelled after the month end still shows in that month.

**Locking.** Take the locks before the transaction's first plain read, or use locking reads (current reads:
`lockForUpdate`/`sharedLock`, or `PeriodLock::lockDate(locking: true)`) for every decision taken under a lock: the
first plain read fixes the REPEATABLE READ snapshot, which then misses rows committed while waiting for a lock. Lock orders:
- Asset create: optional S on 1-1000 (TUNAI funding, like `CashSessionService::requireOpen()`) →
  `FixedAssetService::lockRegister()` (X on the 1-3999 `accounts` row) → the `AT` number → JRN.
  Asset void: optional S on 1-1000 → `lockRegister()` → X on the asset → X on its depreciation rows → locking
  `lockDate` (only when it has depreciation rows) → JRN. Never take `lockRegister()` after a number lock.
- Depreciation run: `lockRegister()` first, then locking reads of the lock date, assets and posted depreciation → JRN.
- Period close: X on 3-2000 (`serialize()`) → X on 1-3999 (`lockRegister()`, right after serialize, before any plain
  read) → the pending-depreciation check → JRN. No flow holds 1-3999 and then asks for 3-2000.
- AJP and bank-recon `post-adjustment`: S on 3-2000 → locking `lockDate` → (the statement line) → the `AJP` number /
  JRN. The S lock makes them wait for a close in progress, so they cannot post into a month being closed.
- Asset create/void, depreciation run, period close, AJP, and bank-recon import/match/auto-match/post-adjustment run
  in `DB::transaction(..., 3)` (`ATTEMPTS = 3`): three attempts on a deadlock or lock-wait timeout (for example
  X 1-3999 → JRN against the opening balance's X 3-1000 → JRN → FK S 1-3999). The account opening balance post
  (`OpeningBalanceService::post`) retries 3 attempts too, for that same cycle. Period reopen and manual journal
  create/reverse (`ManualJournalService`) retry the same way: a manual journal with a 3-2000 line waits for JRN and
  then FK S on 3-2000, the opposite order of a close or reopen (X 3-2000 → JRN). Unmatch and delete-line are
  single-row writes and run once.

## Reports

All report queries read straight from `journal_entries`/`journal_items` (`status = POSTED`), grouped from the
COA rather than hard-coded account lists, in `app/Services/Accounting/`:

- **`LedgerBalances::forRange($from, $to, $excludeClosing)`** does one grouped query per report and returns an
  `AccountBalance` per account (`signed('DEBIT'|'CREDIT')`, `net()`). Every other report is built on top of it.
- **`FinancialReportService`** builds the trial balance, general ledger (with the opening balance before
  `$from`), income statement, balance sheet, and statement of changes in equity. Sections are classified from
  `account_type` and `normal_balance`/code prefix (current vs fixed assets, cost of sales `5-…` vs operating
  expenses `6-…`, revenue vs contra-revenue, other income `4-3…` such as bank interest, shown after operating
  expenses and outside gross profit), so a new account shows up without a code change. The income
  statement excludes `PERIOD_CLOSING`/`PERIOD_REOPEN` entries so closing never hides a month's result; the
  balance sheet as of a date includes everything, showing unclosed earnings as an equity line so it always
  balances.
- The statement of changes in equity reports `owner_contributions` (credit-normal equity) and `owner_drawings`
  (debit-normal equity, i.e. Prive 3-3000) separately; the cash-flow report puts both in financing (EQUITY bucket)
  and the shift variance in operating expenses (6-1010 is EXPENSE).
- **`CashFlowReport::build($from, $to)`** is the direct method: every journal that touches 1-1000/1-1001
  attributes its non-cash lines (credit − debit) to a bucket (customers, suppliers, expenses, other operating,
  fixed assets, equity), so the buckets always reconcile to the cash change (`is_reconciled`).
  The return types need no special case: they are bucketed by account. A sales refund (4-9100, REVENUE) lowers
  customers; its 1-2000/5-1000 lines net to zero inside suppliers. A supplier refund or a TUNAI/TRANSFER GR cancel
  (1-2000) raises suppliers; the payable part of a purchase return and a TEMPO cancel touch no cash.
  The `ACCOUNT_OPENING` journal is not a cash flow and is left out of the buckets; when it is dated inside
  the range, its 1-1000/1-1001 amount is added to `beginning_cash` instead, so reconciliation still holds.
- 4-9100 (REVENUE, normal DEBIT) is presented as contra revenue next to 4-9000 in the income statement (net revenue =
  revenue − discounts and returns).
- Inactive accounts (1-1002, 2-1004, 4-2000) still appear in every report, as zero rows or with their historic
  balances: no report query filters on `is_active` (only `ManualJournalRequest` does), so prior periods stay
  reproducible and the balance sheet still balances. `CashFlowReport::bucket()` keeps 1-1002 and 2-1004 in the
  customers bucket for historic entries.
- **`CalkReport::build($period)`** (`GET /reports/calk?period=YYYY-MM`) returns the CALK: entity constants, SAK EMKM
  compliance statement, seven policy texts (basis, cash & bank, FIFO inventory, straight-line depreciation, revenue,
  accrual expenses, tax incl. PPh Final 0.5% as policy text only — not accrued), and notes for cash & bank (with the
  month's bank reconciliation status), inventory (1-2000; FIFO value per category only for the current month),
  prepaid/accrued expenses, fixed assets (register as of the month end next to 1-3000/1-3999), payables per supplier
  as of the month end (TEMPO purchases − payments dated ≤ end − returns/cancels' `payable_amount` with `return_date`
  ≤ end, plus a balancing "penyesuaian lain" line to 2-1000) and equity (the balance-sheet equity section).
- **`BankReconciliationService::report($period)`**: statement ending balance + deposits in transit − outstanding
  payments = book 1-1001 + unrecorded bank credits − unrecorded bank debits. Ledger lines before the month of the
  first statement line (the cut-over) and `ACCOUNT_OPENING` lines are never outstanding.
- `CashFlowReport::bucket()` puts 4-3000 in "other operating" and 1-1100/2-1100 in "expenses"; depreciation and AJP
  entries touch no cash account and never appear in the cash-flow statement.
- **`Reports/DailyReportService`** (roadmap sub-project 5) groups POSTED journals per day with
  `FinancialReportService::incomeSection()` (closing entries excluded), so Σ daily-recap rows = the income statement
  for the same range, and sums 1-1000/1-1001 debits/credits per day and journal type (`ACCOUNT_OPENING` folded into
  the opening balance), so cash movements reconcile opening to closing. A void or expense void therefore reverses
  money on its own date. It posts nothing. See [api-reference.md](api-reference.md#operational-reports-roadmap-sub-project-5).
- **`ExpenseService`**, **`ManualJournalService`**, **`PeriodClosingService`**, **`OpeningBalanceService`**,
  **`FixedAssetService`**, **`DepreciationService`**, **`AdjustingEntryService`** and **`BankReconciliationService`**
  are the posting-side services (see the posting rules table above).

On the frontend, `accountingApi.ts` / `expenseApi.ts` are typed clients and `accountingMappers.ts` maps the wire
shapes to UI types. Accounting screens fetch their own data through `useServerData` (`src/modules/accounting/hooks/`),
keyed by the chosen period and by `ledgerVersion`. `App.tsx` increments `ledgerVersion` through
`notifyLedgerChanged` whenever a server action (checkout, void, expense, manual journal, …) returns journals, which
triggers every mounted report to reload. There is no local fallback: a failed request shows an inline error with
retry.

## Known issues (verified 2026-09-30)
- None open. (`GR-` numbers follow the receipt date's month since 2026-10-05; `OB3-INV-` and `OPN-` documents are
  always dated today, so `now()` is their document date.)
