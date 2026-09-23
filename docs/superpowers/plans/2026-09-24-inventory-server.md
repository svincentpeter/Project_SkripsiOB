# Inventori di Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Master data inventori, penerimaan barang, opname, dan seluruh perubahan stok diproses & dijurnal server sehingga saldo `1-2000` selalu sama dengan nilai FIFO.

**Architecture:** `App\Services\Inventory\InventoryValueJournal` mengukur nilai FIFO sebelum/sesudah sebuah operasi dan membukukan selisihnya (akun lawan `5-2000` atau `3-1000`). Operasi baru: `GoodsReceiptService` (purchases + batch + jurnal), `StockOpnameService` (FIFO), `PayableService` (pelunasan hutang), `OpeningBalanceService`. Controller tipis; respons membawa `journal` untuk disalin ke UI selama transisi.

**Tech Stack:** Laravel 13, PHPUnit 12, MySQL; React 19, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-24-inventory-server-design.md`

## Global Constraints

- Akun: persediaan `1-2000`, kas `1-1000`, bank `1-1001`, hutang `2-1000`, modal `3-1000`, selisih opname `5-2000`.
- Jurnal dibukukan lewat `JournalDraft` + `AccountingEngine` (menolak jurnal tidak seimbang).
- Setelah setiap operasi stok: `GET /inventory/valuation` → `difference` tidak berubah (test).
- Jangan commit file milik user/sesi lain (`backend/phpunit.xml`, `OmahBanBanBaruSeeder.php`, `database/seeders/data/`, hunk saldo awal di `DatabaseSeeder.php`, `AccountsReceivableTab.tsx`, `JournalTab.tsx`, `ExpenseTable.tsx`).
- Commit diakhiri `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Task 1: Skema, akun 5-2000, valuasi & jurnal selisih, saldo awal
- Migrasi `purchases`, `purchase_payments`, `product_batches.purchase_id`; model `Purchase`, `PurchasePayment`; `Product::category()`.
- `AccountCoaSeeder` + `5-2000`.
- `InventoryValueJournal::value(?array $productIds): float`, `ledgerBalance(): float`, `record(array $productIds, callable $op, string $refType, string $ref, string $desc, string $counterAccount): array{result, journal}`.
- `OpeningBalanceService::post(User)` + perintah `inventory:opening-balance`; endpoint `GET /inventory/valuation`, `POST /inventory/opening-balance`.
- Test: `InventoryValuationTest`.

### Task 2: Produk & kategori
- `ProductController` store (kode otomatis, stok awal via `record` → 3-1000), update (tanpa stok/biaya), destroy (hapus/nonaktifkan), index menyertakan `category_code`.
- `ProductCategoryController`, `ServiceCategoryController` + route + izin.
- Test: `ProductMasterTest`, `CategoryApiTest`.

### Task 3: Penerimaan barang & hutang supplier
- `GoodsReceiptService`, `InventoryController@restock` baru; `PurchaseController` (index, pay); `AccountingReportController` accountsPayable/payDebt dari purchases.
- Test: `GoodsReceiptTest`, sesuaikan `InventoryRestockTest`, `AccountingReportApiTest`.

### Task 4: Opname & perubahan stok lain berjurnal
- `StockOpnameService` (multi item, FIFO); `InventoryController@stockOpname` baru.
- Bungkus commit Excel, bulk update, edit inline dengan `InventoryValueJournal` (produk baru → 3-1000, lainnya → 5-2000).
- Test: `StockOpnameTest`, tambah asersi selisih valuasi 0 di test rekonsiliasi & laporan bulanan.

### Task 5: Frontend API & mapper
- `inventoryApi` (products CRUD, categories, services, suppliers, restock, opname, movements, valuation, opening balance, purchases, pay), mapper murni + test.

### Task 6: Frontend alur inventori
- App handlers async ke API; InventoryScreen/StockOpnameModal/GoodsReceiptModal/ProductFormModal menyesuaikan; AP tab dari purchases; kartu valuasi.
- lint, vitest, build hijau.

### Task 7: Verifikasi browser
- Produk baru + stok awal, restock tempo → AP → bayar, opname, kartu stok, valuasi selisih 0.
