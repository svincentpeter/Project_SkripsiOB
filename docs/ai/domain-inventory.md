# Domain: inventory, FIFO, goods receipt, payables, opname, Excel import

Server-authoritative since stage 3. Design documents: `docs/superpowers/specs/2026-09-24-inventory-server-design.md` and
`2026-09-22-stock-monthly-fifo-spreadsheet-design.md`. Backend code: `app/Services/FifoCostingService.php` and
`app/Services/Inventory/**`. Frontend code: `src/modules/inventory/`, `src/services/api/inventoryApi.ts`,
`inventoryMappers.ts`, `productApi.ts`, and `stockReconciliationApi.ts`.

The shop sells new tires (ban baru), inner tubes (ban dalam), and truck tires, plus services (spooring, balancing). Services have no stock.

## FIFO model
- A **batch** (`product_batches`) is one cost layer with `batch_cost`, `initial_qty`, and `remaining_qty`. FIFO order is
  `purchase_date`, then `id`.
- **Allocation** is done by `FifoCostingService::allocateFifo(productId, qty, saleDetailId, ref)`:
  1. Lock the product and its batches, then consume the oldest batches first.
  2. Cost each slice at `round(qty × batch_cost, 2)` and write `sale_batch_allocations`.
  3. Write a KELUAR/SALE movement.
  4. If the batches hold fewer units than requested, it throws `PosRuleException` (422, "Lakukan stock opname…"),
     so the whole sale is rejected. There is no `product_cost` fallback any more. The stock check in `CartLines` uses
     `product_quantity`, so a product whose quantity exceeds its batch layers passes that check and is stopped here.
     Stock opname matches the batch layers to the physical count, which repairs old drift (see below).
- Where batches come from:

  | Source | Service |
  |---|---|
  | Goods receipt | `FifoCostingService::addBatch` (this also sets `product_cost` to the latest cost) |
  | New product with `initial_batch` | `ProductController::store` |
  | Opname surplus, at the latest batch cost | `StockOpnameService` |
  | Void of a sale line without allocation rows (`VOID-{ref}-{detail}-{i}`) | `SaleVoidService` |
  | Excel commit (`OPNAME-YYYYMM-…`) | `StockOpnameCommitService` |
  | Selective update (`RECON-YYYYMM-…`) | `StockSelectiveUpdateService` |
  | Seeders (`OB3-OPEN-…`) | `OmahBanBanBaruSeeder`, which loads 425 products from `seeders/data/omahban_ban_baru.json` |

- Running stock is the denormalized column `products.product_quantity`. **Intended** to equal Σ`remaining_qty`.
  Nothing enforces this, so keep them in step in any new code.
- Inventory value is Σ(`remaining_qty` × `batch_cost`), which must equal the ledger balance of 1-2000.
  `GET /inventory/valuation` (`InventoryValueJournal::summary`) reports the `difference`. Tests assert that it is 0.

## Keeping the ledger in step: `InventoryValueJournal`
- `record(fn, refType, refId, desc)` measures FIFO value per product before and after `fn`, then journals the change:
  - Products that already existed post against 5-2000 (Selisih Persediaan).
  - Products created inside `fn` post against 3-1000 (opening equity).
  - An increase posts Dr 1-2000; a decrease posts Cr 1-2000.
  - The optional 5th argument `lockedProductIds` (the opname passes it) measures only those products, which the caller
    has already locked, with locking current reads. Without it the snapshot is a consistent read of the whole table,
    which can predate a sale that commits before the caller's locks.
- **Wrap every stock-changing operation that is not a sale or a purchase in `record()`.**
- `postOpeningBalance()` books the whole gap between FIFO value and the ledger against 3-1000, as
  `OPENING_BALANCE` with reference `OPENING-INV-…`. It is **one-shot**: it locks the 3-1000 account row, and when
  `openingEntry()` finds that entry it throws `PosRuleException` (422; the console command prints the message and
  exits 1). Run it once per database, after seeding: `php artisan inventory:opening-balance` or
  `POST /inventory/opening-balance`. A Rp 0 gap posts nothing and does not mark go-live.
- The opening entry marks **go-live** of the inventory ledger. `assertBeforeGoLive()` then refuses the Excel commit
  (`force` does not bypass it) and a selective update with `update_stock` (422). Cost and price updates still pass.
  After go-live, purchases come in through goods receipt and count corrections through stock opname.
- `GET /inventory/valuation` returns `opening_posted`; the valuation banner hides the opening-balance button once it
  is true.
- The void of a sale line whose units have no allocation rows (old fallback costing, or allocations deleted by an
  Excel rebuild) brings those units back as new `VOID-…` batches, valued at the line's booked HPP minus its
  allocated cost and split in cents by `FifoCostingService::centLayers()` (also used by goods receipt), dated the
  sale date. The reversal's Dr 1-2000 then equals the restored FIFO value.

### Go-live checklist
1. Finish any Excel stock migration (commit, selective stock update) first: both are refused after go-live.
2. Post the inventory opening balance once. It marks go-live.
3. Before the first sale, run a stock opname on every product whose `product_quantity` exceeds Σ`remaining_qty` of
   its batches. A sale beyond the FIFO layers is rejected with 422; the opname adds the missing layers.

## Goods receipt and payables
- `POST /inventory/restock` goes to `GoodsReceiptService::receive`, in one transaction:
  1. Create a `purchases` row numbered `GR-YYYYMM-####`.
  2. Call `addBatch` and link the batch through `purchase_id`. When the client sends `invoice_total` (the goods
     receipt modal does), the total is split in cents: `qty − r` units at the base cost and, if the total does not
     divide evenly, a second batch of `r` units at base + Rp 0.01, so Σ(qty × batch_cost) equals the invoice total
     exactly. `invoice_total` must be within Rp 1 of `quantity × batch_cost`, and `dpp_amount + ppn_amount` must
     equal it (both stored on `purchases`; PPN is capitalized, there is no PPN Masukan account). Without
     `invoice_total` the old rule applies: one batch, total = quantity × batch_cost.
  3. Post the journal at that total: Dr 1-2000, Cr 1-1000 (TUNAI), 1-1001 (TRANSFER_BCA), or 2-1000 (TEMPO).
  4. For TEMPO, `due_date` is the given date or `purchase_date + supplier.payment_terms_days`, and the status is
     `BELUM_LUNAS`.
- `purchase_date` must not be in the future (422).
- `POST /purchases/{id}/payments` goes to `PayableService::pay`. It locks the purchase, refuses a `LUNAS` or `BATAL`
  invoice and overpayment, requires `payment_date` ≤ today (validation) and ≥ the invoice's `purchase_date` (in the
  service, so the legacy path is covered too), posts Dr 2-1000 / Cr 1-1000 or 1-1001 (`DEBT_PAYMENT`), and sets the
  status to `SEBAGIAN` or `LUNAS` (`LUNAS` once paid ≥ total − returned). The frontend payables
  tab uses this endpoint. The legacy route `POST /accounting/accounts-payable/pay` (`paySupplier`) spreads one payment
  across open invoices, oldest due date first.

## Purchase returns and cancellation
`Inventory/PurchaseReturnService`, permission `purchase_return` (GUDANG default true). Both are numbered
`RTB-YYYYMM-####`, dated today, and stored in `purchase_returns` (`kind` RETURN or CANCEL) with one
`purchase_return_items` row per batch. Lock order: purchase → product → the GR's batches, read through the
`product_id` index (`purchase_id` has no index; a filter on it alone would lock the whole table) in ascending order
and sorted newest-first in PHP (a descending scan would lock the neighbouring product's record). Both run in
`DB::transaction(..., 3)`.
- **Return** (`POST /purchases/{id}/returns {quantity, reason, refund_account_code?}`): only units still in the GR's
  own batches (`product_batches.purchase_id`) can go back; units already sold cannot. Newest batch first, so the
  Rp 0.01 cent-split batch leaves first. Value = Σ qty × `batch_cost`, exact to the cent.
  - The value reduces the open payable first (TEMPO only: Dr 2-1000, capped at `remaining()`); the rest is a refund
    (Dr 1-1000 or 1-1001; default 1-1000 for a TUNAI receipt, else 1-1001; the request can override it). Cr 1-2000.
    Journal `PURCHASE_RETURN`.
  - `purchases.returned_amount` accumulates the value and `paid_amount` drops by the refund, so
    `remaining() = total − returned − paid`. The status is recomputed (TEMPO: `LUNAS` once paid ≥ total − returned).
- **Cancel** (`POST /purchases/{id}/cancel {reason}`): only when the GR is untouched: every batch still holds its
  `initial_qty`, no sale allocation, no supplier payment and no earlier return. It zeroes the batches (never deletes
  them), posts `GOODS_RECEIPT_CANCEL`, the mirror of the `PURCHASE` entry linked by `reversal_of_id` (a Rp 0 GR has
  none), and sets the status `BATAL`. A cancelled GR cannot be paid, returned or cancelled again.
- Both write a KELUAR stock movement (`PURCHASE_RETURN` / `GOODS_RECEIPT_CANCEL`) and lower `product_quantity`.
- `GET /purchases?status=open` and the legacy `paySupplier` skip `BATAL`; the frontend payables list
  (`payablesFromPurchases`) drops `BATAL` rows. `GET /accounting/accounts-payable` nets `returned_amount`.
- Each purchase row carries `returned_amount`, `product_name`, `quantity` and `returnable_qty`. The UI is
  "Penerimaan & Stok Opname → Retur / Batal Penerimaan" (`PurchaseReturnModal`).

## Stock opname and corrections
- **Manual opname:** `POST /inventory/stock-opname` with `{items:[{product_id, physical_qty}], notes}` goes to
  `StockOpnameService::adjust`. One transaction locks all its products sorted by id, then draws the
  `OPN-YYYYMM-####` number, then runs `record()` scoped to those products: the before and after values are locked
  current reads, so a sale or receipt that committed after the transaction's snapshot is not journaled again. The
  batch layers are matched to the physical count: the service sums `remaining_qty` with a locked current read. Fewer
  units than the layers consumes the oldest batches; more creates a surplus batch at the latest cost.
  `product_quantity` is set to the physical count. A movement is written only when the count differs from
  `product_quantity`, so an opname at the same count still repairs drifted layers. The journal type is `STOCK_OPNAME`, posted via `record()`.
- **Excel import:** preview, then resolve, then commit.
  - Preview: `POST /stock/import-preview`. Sheets are read from row 5, columns A–H:
    no, name, size, ring, cost, price, opening qty, and end-of-month qty (default column H).
    - Red font in the name cell marks old stock. A blank name marks a child batch of the row above. `*…` or `…:`
      marks a note row.
    - `@1.325` in the name means reference price 1,325,000. `(24)` in the name means year 2024.
    - Brand is resolved by `BrandResolver` (aliases, then the sheet name).
    - Category comes from the sheet name and is hard-coded as IDs 1/3/4.
    - The match key (`StockMatchKey`) is `brandId|normalizedName|size|ring[|year or |old]`.
    - Staging is written to **one shared file**, `storage/app/stock_migration/stock_staging.json`.
  - Resolve: `resolve-brand`, `resolve-name`, and `ignore-unresolved` fix staging rows that failed to resolve.
  - Commit: `POST /stock/commit {period, only_match_keys?, force?}`, or `php artisan stock:opname`, goes to
    `StockOpnameCommitService` (`STOCK_IMPORT`).
    - After go-live it is always refused (422), `force` or not.
    - Without `force`, it refuses if any sales exist on or after the period start, or if unresolved rows remain.
    - It writes a rollback snapshot, then upserts products and rebuilds batches for the period.
    - A full sync zeroes products that are missing from the Excel and deactivates the ones that never sold.
- **Selective update:** `POST /stock/bulk-update` goes to `StockSelectiveUpdateService` (`STOCK_RECONCILIATION`).
  With `update_stock` it is refused after go-live.
  - Flags `update_cost` / `update_price` / `update_stock`, plus a `reason` (at least 3 characters).
  - Writes price audits.
  - When stock changes, it rebuilds batches sorted by cost ascending, with synthetic dates.
- **Monthly FIFO ledger:** `GET /reports/stock-monthly?month&brand` goes to `MonthlyStockLedgerService`. It builds a
  spreadsheet view of opening, restock, daily sales, and cost layers.
  - The "restock" column is net non-sale incoming stock for the month: receipts and sales returns count +, purchase
    returns and GR cancellations count − (so it can be negative). Sales stay in the sold columns.
  - `POST …/inline-update` edits opening stock (via opname), batch cost (`STOCK_COST_CORRECTION`), or the old-stock tag.
    A batch cost edit is allowed only for a batch with no purchase link, no sale allocation and
    `remaining_qty = initial_qty`; otherwise 422 (use a purchase return or cancellation).
  - The server export is CSV. The UI exports xlsx client-side (`stockLedgerExcel.ts`).

## Product master
- `ProductRequest` requires `product_name`, `brand`, `product_cost`, and `product_price`. It takes an optional
  `initial_batch`. Codes (`PRD-…`, barcode `899…`) are generated when empty.
- Updating a product never touches stock or batches. Change stock only through receipt, opname, or import.
- Deleting a product hard-deletes it only if it has no sales, movements, or live batches; otherwise it sets
  `is_active=false`. Services and suppliers are deactivated the same way when in use. Categories that are in use
  return 422.
- Tire attributes: `size_width`/`size_ratio`/`ring` (for example `R15`), `product_size`, `motif`, `condition_code`
  (BARU), `product_year`, `is_old_stock`, and `reference_price`.

## Frontend notes
- The catalog cards' value is stock × `product_cost` (`calculateInventoryValuation`), **not** FIFO. The server
  valuation banner is the FIFO figure.
- `stockReconciliationApi` falls back to client-side parsing and local writes when the server is unreachable. Commit
  and bulk update rethrow once the server answered (an `ApiError` with a status, e.g. the go-live 422); the other
  calls still fall back on any error. Treat the fallback as legacy, and surface server errors instead of extending it.
- `StockMonthlyLedgerView` shows the restock column as "Masuk (neto)" with its sign (`formatSignedQty`: +N, −N or 0),
  so a month with more purchase returns than receipts shows the negative net.
- The template download (`/stock/template`) is a plain link with no bearer token, so it probably returns 401.

## Known issues (verified 2026-09-27, updated 2026-09-30)
1. `product_quantity` can drift from Σ`remaining_qty`. Causes: selective updates with a negative delta and no
   batches, and inline edits of opening stock. A sale beyond the layers then fails with 422 until a stock opname.
2. Excel commit and selective update **delete** batches from the same period. The FK cascade then deletes
   `sale_batch_allocations`, which breaks later voids. `force` bypasses the sales guard. Both are refused after
   go-live.
3. `addBatch` batch codes end in a free number from 10–99 per product and day (the product row is locked), so
   collisions are gone, but a 91st receipt batch of one product on one day is refused with a 422.
4. Preview matches by match key or product code, but commit matches by match key only. Seeded `product_size` values
   (`"165 R13"`) differ from Excel column C (`"165"`), so a commit may duplicate seeded products.
5. The monthly ledger orders layers by cost, not purchase date. It ignores `PENYESUAIAN` movements in the opening
   balance, and it values past months with the current `remaining_qty`.
6. Excel staging is a single global file, not scoped per user.
