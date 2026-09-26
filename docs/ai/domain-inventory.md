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
  4. If the batches run short, the method does **not** throw. The remainder is costed at `product_cost` with no
     allocation row. Guard against this with the stock check in `CartLines`.
- Where batches come from:

  | Source | Service |
  |---|---|
  | Goods receipt | `FifoCostingService::addBatch` (this also sets `product_cost` to the latest cost) |
  | New product with `initial_batch` | `ProductController::store` |
  | Opname surplus, at the latest batch cost | `StockOpnameService` |
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
- **Wrap every stock-changing operation that is not a sale or a purchase in `record()`.**
- `postOpeningBalance()` books the whole gap between FIFO value and the ledger against 3-1000, as
  `OPENING_BALANCE`. It is idempotent. Run it after seeding: `php artisan inventory:opening-balance` or
  `POST /inventory/opening-balance`.

## Goods receipt and payables
- `POST /inventory/restock` goes to `GoodsReceiptService::receive`, in one transaction:
  1. Create a `purchases` row numbered `GR-YYYYMM-####`.
  2. Call `addBatch` and link the batch through `purchase_id`.
  3. Post the journal: Dr 1-2000, Cr 1-1000 (TUNAI), 1-1001 (TRANSFER_BCA), or 2-1000 (TEMPO).
  4. For TEMPO, `due_date` is the given date or `purchase_date + supplier.payment_terms_days`, and the status is
     `BELUM_LUNAS`.
- `POST /purchases/{id}/payments` goes to `PayableService::pay`. It locks the purchase, refuses overpayment, posts
  Dr 2-1000 / Cr 1-1000 or 1-1001 (`DEBT_PAYMENT`), and sets the status to `SEBAGIAN` or `LUNAS`. The frontend payables
  tab uses this endpoint. The legacy route `POST /accounting/accounts-payable/pay` (`paySupplier`) spreads one payment
  across open invoices, oldest due date first.

## Stock opname and corrections
- **Manual opname:** `POST /inventory/stock-opname` with `{items:[{product_id, physical_qty}], notes}` goes to
  `StockOpnameService::adjust`. It is numbered `OPN-YYYYMM-####`. A shortage consumes the oldest batches; a surplus
  creates a batch at the latest cost. `product_quantity` is set to the physical count and a movement is written.
  The journal type is `STOCK_OPNAME`, posted via `record()`.
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
    - Without `force`, it refuses if any sales exist on or after the period start, or if unresolved rows remain.
    - It writes a rollback snapshot, then upserts products and rebuilds batches for the period.
    - A full sync zeroes products that are missing from the Excel and deactivates the ones that never sold.
- **Selective update:** `POST /stock/bulk-update` goes to `StockSelectiveUpdateService` (`STOCK_RECONCILIATION`).
  - Flags `update_cost` / `update_price` / `update_stock`, plus a `reason` (at least 3 characters).
  - Writes price audits.
  - When stock changes, it rebuilds batches sorted by cost ascending, with synthetic dates.
- **Monthly FIFO ledger:** `GET /reports/stock-monthly?month&brand` goes to `MonthlyStockLedgerService`. It builds a
  spreadsheet view of opening, restock, daily sales, and cost layers.
  - `POST …/inline-update` edits opening stock (via opname), batch cost (`STOCK_COST_CORRECTION`), or the old-stock tag.
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
- `stockReconciliationApi` falls back to client-side parsing and local writes on any error, including 422. Treat that
  fallback as legacy, and surface server errors instead of extending it.
- The template download (`/stock/template`) is a plain link with no bearer token, so it probably returns 401.

## Known issues (verified 2026-09-27)
1. `product_quantity` can drift from Σ`remaining_qty`. Causes: the FIFO shortfall fallback, a void of such a sale,
   selective updates with a negative delta and no batches, and inline edits of opening stock.
2. Excel commit and selective update **delete** batches from the same period. The FK cascade then deletes
   `sale_batch_allocations`, which breaks later voids. `force` bypasses the sales guard.
3. `addBatch` batch codes use `rand(10,99)`, so two receipts of the same product on the same day can collide on
   the unique index.
4. Preview matches by match key or product code, but commit matches by match key only. Seeded `product_size` values
   (`"165 R13"`) differ from Excel column C (`"165"`), so a commit may duplicate seeded products.
5. The monthly ledger orders layers by cost, not purchase date. It ignores `PENYESUAIAN` movements in the opening
   balance, and it values past months with the current `remaining_qty`.
6. Excel staging is a single global file, not scoped per user.
