# Transaction Corrections (roadmap sub-project 3, design)

Date: 2026-09-30. Plan: `docs/superpowers/plans/2026-09-30-transaction-corrections.md`.
Roadmap: `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` (sub-project 3). Executes after SP6 (payment
hardening) and SP2 (cash & bank); relies only on the SP2 interface listed in `.superpowers/sdd/roadmap-allocation.md`
(table `cash_sessions`, one `OPEN` session at a time).

## Goal

Every correction of a sale or a purchase ends in a balanced journal that keeps two invariants true:
**1-2000 = Σ(remaining_qty × batch_cost)** and **2-1000 = Σ open supplier invoices**. Concretely:

1. **Partial sales return**: return some units (or service lines) of a paid nota; the refund is always cash from the
   drawer, the goods go back to the FIFO batches they came from, at their original cost.
2. **Purchase return and goods-receipt cancellation**: send units of a goods receipt (GR) back to the supplier
   (reduce the payable first, then take a refund in cash/bank), or cancel a GR that nothing has touched yet.
3. **Ledger = FIFO fixes**: no more costing at `product_cost` when batches run short; void restores units that have no
   allocation row; the inventory opening balance is one-shot; after go-live Excel stock rebuilds are refused;
   batch cost edits only on untouched batches; manual POS lines are services only.
4. **Date validation**: payment dates between the invoice date and today, goods-receipt dates not in the future,
   period-lock compare on normalized dates.

## Dropped from the roadmap item (moot)

- **Bad-debt write-off of 1-1002**: BON credit sales were removed on 2026-09-30
  (`2026-09-30-remove-dp-bon-edc-design.md`); no new receivables arise and 1-1002 is inactive.
- **Forfeiting a booking DP to income (2-1004)** and **QRIS DP verification / DP MDR**: booking DP was removed on the
  same date; 2-1004 is inactive.
- The roadmap's "batch cost edits never reach past cost of sales or the payable" is resolved by *restricting* the
  edit (D18), not by re-costing past sales.

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Bad-debt write-off and DP forfeit are not built (see above). | Roadmap + removal spec |
| D2 | A sales return refunds **cash from the drawer** (Cr 1-1000), whatever the original payment method; the return is booked **Dr 4-9100 Retur Penjualan** (contra revenue). The QRIS MDR of the original sale stays an expense (the provider does not refund it). | User (binding); MDR: Ruling (writer), cost if wrong: one extra reversal line later |
| D3 | Returned goods go back to **the batches the sale consumed**, at the allocation's `unit_cost`, most recently allocated batch first. `sale_batch_allocations.quantity_returned` (new column) tracks what already came back, so partial returns never over-restore a layer. | User (binding); order: Ruling (writer), cost if wrong: a different layer gets the units (same cost logic) |
| D4 | A sales return needs an `OPEN` `cash_sessions` row (SP2); the session is locked and its id stored on `sales_returns.cash_session_id`. SP2's expected cash subtracts `SalesReturn::cashRefundedInSession($id)` unless SP2 already derives expected cash from 1-1000 movements (task B8). No check that the drawer holds enough cash. | Allocation (SP3 interface); drawer check: Ruling (writer), cost if wrong: a negative drawer shows up as a variance at close |
| D5 | The refund is **computed by the server**: the line's net value (after its line discount) minus its cent-exact share of the nota discount (shares proportional to `sub_total`, rounding remainder on the largest line, Σ = nota total). A partial return gets `round(lineNet × qty / lineQty, 2)`; the return that empties a line gets the rest, so Σ refunds of a fully returned nota = nota total. No free-typed refund amount. | Ruling (writer), cost if wrong: goodwill refunds need a manual journal |
| D6 | Any line can be returned: catalogue products (stock + cost reversal), catalogue or manual services (revenue only). | Ruling (writer) |
| D7 | A sale with any return **cannot be voided**; a VOID sale cannot be returned. The remaining units are returned instead. | Ruling (writer), cost if wrong: one extra step for the cashier |
| D8 | Returns, purchase returns and GR cancellations are **dated today** by the server (no backdating); the engine's period lock still applies. Document numbers `RTJ-YYYYMM-####` (sales return) and `RTB-YYYYMM-####` (purchase return and cancellation) via `DocumentNumber` with the return date. | Ruling (writer) |
| D9 | A product line whose units lack allocation rows (legacy `product_cost` fallback, or allocations cascade-deleted by an Excel rebuild) cannot be returned (422, "batalkan nota lewat VOID"). | Ruling (writer), cost if wrong: legacy notas can only be voided |
| D10 | **Purchase return**: only units still in the GR's own batches (`product_batches.purchase_id`) can go back; layers already sold cannot. Newest batch first, so the Rp 0,01 cent-split batch of commit `3db23f0` leaves first. Value = Σ(qty × batch_cost), exact to the cent. For TEMPO the value first reduces the open payable (Dr 2-1000, capped at `remaining()`), the rest is refunded (Dr 1-1000 or 1-1001; default TUNAI → 1-1000, otherwise 1-1001; overridable). Cr 1-2000. `purchases.returned_amount` (new) accumulates the value, `paid_amount` drops by the refund, `remaining() = total − returned − paid`. | Roadmap + Ruling (writer) |
| D11 | **GR cancellation** only when every batch of the GR is untouched (remaining = initial, no sale allocations), no supplier payment exists and no return exists. It posts `GOODS_RECEIPT_CANCEL`, the mirror of the `PURCHASE` entry linked by `reversal_of_id`, zeroes the batches (never deletes them) and sets the status `BATAL`. A Rp 0 GR has no journal to mirror. | Ruling (writer), cost if wrong: partly used GRs need a return instead |
| D12 | Supplier refunds into 1-1000 do not require or touch a cash session (GR cash payments do not either). | Ruling (writer), cost if wrong: SP2's expected cash misses supplier cash if it is ledger-based (then it is included automatically) |
| D13 | **FIFO shortfall**: `FifoCostingService::allocateFifo` throws `PosRuleException` when the batches hold fewer units than requested (no `product_cost` fallback). To repair old drift, **stock opname compares the physical count with Σ remaining_qty** for the layers (consume oldest / surplus batch at the latest cost) and with `product_quantity` for the movement. | Roadmap + Ruling (writer), cost if wrong: cashier blocked until an opname |
| D14 | **Void** restores units that have no allocation row as new batch(es) valued at `total_cost_hpp − Σ allocation cost`, cent-split with `FifoCostingService::centLayers()` (extracted from `GoodsReceiptService`), dated the sale date. The reversal's Dr 1-2000 then equals the restored FIFO value. | Roadmap + Ruling (writer) |
| D15 | **Manual POS lines are services only.** A manual PRODUCT line is rejected (422): goods must be catalogued and received so FIFO cost exists. Manual SERVICE lines book 4-1001 with **no cost of sales**; `cost_price` is ignored and `total_hpp` equals the journaled 5-1000. `ManualItemForm` keeps only the "Jasa" type and drops the HPP field. | Roadmap choice (service revenue) → Ruling (writer), cost if wrong: unregistered goods cannot be sold at the counter |
| D16 | The **inventory opening balance is one-shot**: once an `OPENING_BALANCE` entry with reference `OPENING-INV-…` exists, the action is refused (422 / console error). That entry marks **go-live** of the inventory ledger. The 3-1000 row is locked while checking (same pattern as `OpeningBalanceService`). A Rp 0 gap posts nothing and does not mark go-live. `GET /inventory/valuation` returns `opening_posted`; the UI hides the button afterwards. | Roadmap + Ruling (writer) |
| D17 | After go-live, the **Excel commit** (`force` does not bypass) and a **selective update with `update_stock`** are refused: purchases come in through GR (1-2000 vs cash/bank/2-1000), count corrections through stock opname. Cost and price updates still pass (they touch product master fields only). Before go-live nothing changes. The frontend no longer falls back to local writes when the server answered (4xx/408). | Roadmap + Ruling (writer), cost if wrong: monthly Excel sync after go-live needs a new design |
| D18 | Inline **batch cost edit** only for a batch with no purchase link, no sale allocation and `remaining_qty = initial_qty`; otherwise 422 (use purchase return/cancel). | Roadmap + Ruling (writer) |
| D19 | **Dates**: payment date ≤ today and ≥ the invoice's `purchase_date` (checked in `PayableService::pay`, so the legacy per-supplier path is covered too); GR `purchase_date` ≤ today; `PeriodLock::assertOpen` normalizes its argument to `Y-m-d` before comparing. Voids, returns and cancellations are dated today, which is never before the document and never inside a closed period (only fully elapsed months close). The GR period-lock check itself landed in `ec73b38`. | Roadmap + controller carry-over + Ruling (writer) |
| D20 | Permission keys `sales_return` (KASIR default true) and `purchase_return` (GUDANG default true), per allocation; migration inserts missing `role_permissions` rows. | Allocation |
| D21 | Account **4-9100 Retur Penjualan** (REVENUE, normal DEBIT) via insert-if-missing migration + `AccountCoaSeeder`. | Allocation |
| D22 | No list endpoints for returns: the receipt (`Sale::toReceiptArray`) carries `returned_amount`, `returns[]`, per-item `returned_qty` and the `SALES_RETURN` journals; a purchase row carries `returned_amount`, `product_name`, `quantity`, `returnable_qty`. | Ruling (writer), YAGNI |
| D23 | Out of scope: a new product created with `initial_batch` after go-live still books Dr 1-2000 / Cr 3-1000 (owner's goods contribution); client-sent `unit_price` (POS known issue 1). | Ruling (writer) |
| D24 | Tests that used `POST /inventory/opening-balance` as a "make the shared test DB consistent" step switch to a test trait `AlignsInventoryLedger` that posts the gap as `TEST_ALIGN`; only the one-shot tests call the endpoint. | Ruling (writer) |

## What changes, per layer

| Layer | Change |
|---|---|
| Migrations | `2026_10_03_000001_add_sales_return_account_and_permissions` (4-9100; rows for `sales_return`/`purchase_return`), `2026_10_03_000002_create_sales_returns_tables` (`sales_returns`, `sales_return_items`, `sale_batch_allocations.quantity_returned`), `2026_10_03_000003_create_purchase_returns_tables` (`purchase_returns`, `purchase_return_items`, `purchases.returned_amount`). |
| Models | New `SalesReturn`, `SalesReturnItem`, `PurchaseReturn`, `PurchaseReturnItem`. `Sale::returns()`, receipt fields; `SaleBatchAllocation.quantity_returned`; `Purchase.returned_amount`, `returns()`, new `remaining()`, `toApiArray` fields. |
| Services | New `Pos/SalesReturnService`, `Inventory/PurchaseReturnService`. `FifoCostingService` (throw on shortfall, `centLayers()`), `GoodsReceiptService` (uses `centLayers`), `SaleVoidService` (return guard, unallocated restore), `CartLines`/`CheckoutService` (manual = service, no manual cost), `StockOpnameService` (layer repair), `InventoryValueJournal` (`openingEntry()`, `assertBeforeGoLive()`, one-shot), `StockOpnameCommitService`, `StockSelectiveUpdateService` (go-live guard), `PayableService` (date guard, BATAL, net status), `PeriodLock` (normalize). |
| Controllers / routes | `POST /pos/transactions/{id}/returns` (`sales_return`), `POST /purchases/{id}/returns` and `POST /purchases/{id}/cancel` (`purchase_return`); `GET /purchases` also for `purchase_return`; valuation adds `opening_posted`; batch cost guard in `ReportStockMonthlyApiController`; date rules in `InventoryController::restock`, `PurchaseController::pay`, `PayDebtRequest`; `AccountingReportController::accountsPayable` nets returns; console `inventory:opening-balance` reports the refusal. |
| Permissions | `Permissions::KEYS/DEFAULTS`, frontend `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`, `RolePermissionsTab`. |
| Frontend | `SalesReturnModal` (Riwayat Struk, button "Retur" beside VOID), `PurchaseReturnModal` (Penerimaan & Stok Opname tab: list of GRs with "Retur" and "Batalkan"), App handlers, `posApi.createSalesReturn`, `inventoryApi.returnPurchase/cancelPurchase`, mappers/types, journal filter groups, service-only `ManualItemForm`, `stockReconciliationApi` stops local fallback after a server answer, opening-balance button hidden after go-live. |

## Accounting impact

All postings go through `JournalDraft`/`AccountingEngine::createEntry` (balanced to the cent, lock-checked).

| Event (`reference_type`) | Debit | Credit | Balance | Cash-flow bucket |
|---|---|---|---|---|
| Sales return (`SALES_RETURN`, ref `RTJ-…`) | 4-9100 refund; 1-2000 restored cost (product lines) | 1-1000 refund; 5-1000 restored cost | refund = refund, cost = cost | 4-9100 is REVENUE → **customers** (−refund); 1-2000 and 5-1000 net to 0 inside **suppliers** |
| Purchase return (`PURCHASE_RETURN`, ref `RTB-…`) | 2-1000 applied payable; 1-1000/1-1001 refund | 1-2000 value | payable + refund = value | 1-2000 → **suppliers** (+refund, cash received); the payable part is not a cash flow |
| GR cancellation (`GOODS_RECEIPT_CANCEL`, ref `RTB-…`, `reversal_of_id` → `PURCHASE`) | the original credit account (1-1000, 1-1001 or 2-1000) | 1-2000 | mirror of a balanced entry | TUNAI/TRANSFER: **suppliers** (+); TEMPO: none |
| Void of a sale with unallocated units (`POS_SALE_VOID`) | unchanged mirror | unchanged mirror | unchanged | unchanged; the new restore batch makes FIFO match the Dr 1-2000 |
| Stock opname layer repair (`STOCK_OPNAME`) | 1-2000 / 5-2000 per `record()` | | unchanged mechanism | not a cash flow |

`CashFlowReport` buckets by account, so no code change is needed; the new types are classified as above and tested.
The journal screen lists `SALES_RETURN` under "Penjualan" and `PURCHASE_RETURN`, `GOODS_RECEIPT_CANCEL` under
"Pembelian".

**SAK EMKM presentation.** 4-9100 has normal balance DEBIT and type REVENUE, so `FinancialReportService` already
presents it under `contra_revenue` next to 4-9000 (Laba Rugi: Pendapatan − Potongan & Retur Penjualan = Pendapatan
bersih). Restored cost lowers HPP (5-1000). Purchase returns lower Persediaan and Hutang Dagang (or raise Kas/Bank).
The subledger invariant holds: for a TEMPO GR, 2-1000 = total − payments − applied payable = `remaining()` because
`returned = applied + refund` and `paid = payments − refund`.

## Testing

Backend (new classes use `DatabaseTransactions`; sales in new tests pay `TRANSFER_BCA`, so SP2's cash-session rule for
TUNAI checkouts does not interfere; returns open a session through `cash_sessions` rows):
- `ReturnPermissionsTest`: 4-9100 exists as active contra revenue; KASIR/GUDANG defaults; auth permission map count.
- `DocumentDateValidationTest`: normalized lock compare; payment before invoice date / in the future → 422; future GR
  date → 422; legacy per-supplier path future date → 422.
- `FifoIntegrityTest`: sale beyond batch layers → 422 without side effects; opname repairs layers; void restores an
  unallocated unit as a batch at its booked cost; valuation difference 0.
- `PosCheckoutTest`: manual goods line rejected; manual service line books 4-1001 with HPP 0.
- `InventoryValuationTest` / `InventoryGoLiveGuardTest`: opening one-shot (`opening_posted`); after go-live stock
  bulk update and Excel commit refused, price update passes; sold batch cost edit refused.
- `SalesReturnTest`: partial then final return (refund split, layers, journal, receipt fields), over-return 422,
  void blocked, service line, no open session 422, missing allocation 422, VOID sale 422, 403 for GUDANG,
  cash-flow customers delta.
- `PurchaseReturnTest`: TEMPO partly paid (payable then refund, status), cent-split TUNAI (newest layer first, paid
  drops to 0), sold units not returnable, cancel mirror with `reversal_of`, cancel refused after use, paying a BATAL GR
  422, 403 for KASIR, cash-flow suppliers delta.
- Existing opening-balance callers switch to `AlignsInventoryLedger`; every stock test keeps asserting
  `InventoryValueJournal::summary()['difference'] == 0`.

Frontend (Vitest, node): receipt mapping of `returned_amount`/`return_lines`; `stockReconciliationApi` surfaces a 422
without touching localStorage; default permissions hold the two new keys. `npm run lint && npm test`.

## Risks

- **SP2 coupling**: the expected-cash formula and the `cash_sessions` NOT NULL columns are SP2 details; task B8 and the
  test helper adapt to what SP2 shipped (flagged in the pre-flight file). If SP2 derives expected cash from 1-1000
  movements, supplier refunds to 1-1000 would also count (D12).
- **Shared test DB**: a committed `OPENING-INV-` entry (none today) would skip the one-shot test and make the pre-go-live
  Excel tests refuse. Only a manual run can create one; the one-shot test skips with a message instead of failing.
- **Legacy data**: notas with fallback-costed units can only be voided (D9); the dev DB reset (handoff M1) removes them.
- **Drifted products** now block sales until an opname (D13); the error message says so.
- **Manual goods removed** from the POS (D15): the owner must catalogue and receive such items first.
- **Go-live refusal** of the Excel tools (D17) removes a monthly workflow the owner may still expect; revisit if the
  shop keeps its Excel stock book after go-live.
