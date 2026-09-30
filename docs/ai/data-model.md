# Data model

Source of truth: `backend/database/migrations/` (30 migrations). Models: `backend/app/Models/`.
`database/schema_project_skripsi_ob.sql` and `supabase_schema.sql` are **stale**, so ignore them.
Most early migrations wrap `Schema::create` in `hasTable` guards. New migrations should be additive:
add columns and insert-if-missing rows, and never rewrite old migrations.

Every business table has `branch_id` (default 3). There is one branch.

## Auth
| Table | Key columns | Notes |
|---|---|---|
| `users` | `username` (unique), `email`, `role` (OWNER/KASIR/GUDANG, default KASIR), `phone`, `is_active` | `User::hasPermission()`, `permissionMap()`, `toAuthArray()` |
| `role_permissions` | `role`, `permission_key`, `allowed` (unique role+key) | overrides for KASIR and GUDANG; a missing row means deny |
| `personal_access_tokens` | Sanctum | |

Seeded users (`UserSeeder`): `owner` (OWNER, Agus Subagyo), `kasir`, and `gudang`, each `@omahban.com`. The password
comes from `SEED_DEFAULT_PASSWORD`. The legacy `admin@omahban.com` is deactivated.

## Catalog
| Table | Key columns | Notes |
|---|---|---|
| `products` | `product_code`, `barcode` (both unique), `product_name`, `brand` (string), `brand_id`, `category_id`, `size_width`, `size_ratio`, `ring`, `product_size`, `motif`, `condition_code`, `product_year`, `product_cost`, `product_price`, `reference_price`, `product_quantity`, `stok_awal`, `product_stock_alert`, `is_active`, `is_old_stock` | soft deletes. `brand_id` and `category_id` have **no FK**. `product_cost` is the latest cost, not the FIFO cost |
| `product_categories` | `category_code`, `category_name` | |
| `brands` → `brand_aliases` | alias text → `brand_id` | 30 brands and 27 aliases seeded by migration; used by the Excel import |
| `service_masters` | `service_code`, `service_name`, `category` (string code → `service_categories.code`), `standard_price`, `cost_price` | |
| `service_categories` | `code`, `name` | |
| `suppliers` | `supplier_code`, `payment_terms_days` (default 30) | |
| `product_price_audits` | `product_id`, old/new values, `changed_field`, `change_source` | written by Excel import, bulk update, and inline cost edit only |

## Stock (FIFO)
| Table | Key columns | Notes |
|---|---|---|
| `product_batches` | `product_id` (FK cascade), `batch_code` (unique), `source_name`, `purchase_date`, `batch_cost`, `initial_qty`, `remaining_qty`, `purchase_id` | one FIFO cost layer. `Product::activeBatches()` returns batches with remaining > 0, ordered by `purchase_date`, then `id` |
| `stock_movements` | `product_id` (FK cascade), `movement_type` (MASUK/KELUAR/PENYESUAIAN), `quantity`, `balance_after`, `reference_type`, `reference_id`, `description`, `operator_name` | the stock card; the model sets `UPDATED_AT = null` |
| `sale_batch_allocations` | `sale_detail_id`, `product_batch_id` (both FK cascade), `quantity_allocated`, `quantity_returned`, `unit_cost`, `total_cost` | which batches a sale line consumed; void and sales returns use these rows to restore stock. `quantity_returned` (migration `2026_10_03_000002`) counts units a sales return already put back |

Intended invariants: `products.product_quantity == Σ product_batches.remaining_qty`, and the balance of account
1-2000 `== Σ remaining_qty × batch_cost`. Only the second one is checked (`GET /inventory/valuation`).
See [domain-inventory.md](domain-inventory.md) for how they can drift.

## Sales (POS)
| Table | Key columns | Notes |
|---|---|---|
| `sales` | `reference` (unique, `OB3-INV-YYYYMM-####`), `date`, customer and vehicle fields, gross/discount/total (no tax columns; dropped by `2026_09_27_000001`), `paid_amount`, `change_amount`, fee/net fields, `payment_method` (method or `SPLIT`), `status` (LUNAS/VOID), `voided_at`, `voided_by`, `void_reason`, `total_hpp`, `total_profit` | `Sale::toReceiptArray()` is the API shape. Legacy columns `booking_id`, `dp_applied`, `due_date`, `edc_bank`, `edc_type`, `surcharge_amount` are unused since 2026-09-30 (kept for history; old rows may say `BON`/`PENDING`) |
| `sale_details` | `item_type` (PRODUCT/SERVICE), `product_id`, `service_id`, `item_name`, `is_manual`, `quantity`, prices, discount, `hpp`, `profit` | |
| `sale_payments` | `method`, `account_code`, `amount`, `tendered_amount`, `change_amount`, `fee_percentage`, `fee_amount`, `net_received`, `provider_name`, `reference` | one row per split payment; fee and provider name come from `payment_provider_settings`. Legacy `surcharge_amount`, `edc_bank`, `edc_type` unused since 2026-09-30 |
| `qris_transactions` | `order_id` (unique), `gross_amount`, `transaction_status` (pending/settlement), `settlement_source` (WEBHOOK/STATUS_API/SIMULATION), `settled_at`, `sale_payment_id` (nullable, **unique** FK `sale_payments`) | one row per dynamic QRIS order (migration `2026_10_01_000001`). Created by charge, settled by webhook/status/simulation, claimed once by checkout |
| `receivable_payments` | `sale_id` (FK cascade), `payment_date`, `amount`, `account_code`, `journal_entry_number` | settlements of BON (credit) sales. **Unused since 2026-09-30** (BON removed); kept for history |
| `sales_bookings` | `booking_number` (`BK-YYYYMM-####`), customer/vehicle fields, `items` (JSON), `estimated_total`, `dp_amount`, `payment_method`, `dp_account_code`, `status` (ACTIVE/CONVERTED/CANCELLED), `converted_sale_id` | customer pre-orders with a down payment. **Unused since 2026-09-30** (booking DP removed); kept for history |

| `sales_returns` | `reference` (unique, `RTJ-YYYYMM-####`), `sale_id` (FK), `return_date`, `reason`, `refund_amount`, `cost_amount`, `cash_session_id` (FK `cash_sessions`), `journal_entry_number`, `created_by`, `operator_name` | one partial sales return (migration `2026_10_03_000002`); refund is cash from the drawer |
| `sales_return_items` | `sales_return_id` (FK cascade), `sale_detail_id` (FK), `quantity`, `refund_amount`, `cost_amount` | returned units per sale line |

`Sale::journalEntry` joins `journal_entries.reference_id = sales.reference` with `reference_type = POS_SALE`.

## Purchasing
| Table | Key columns | Notes |
|---|---|---|
| `purchases` | `purchase_number` (`GR-YYYYMM-####`), `supplier_id`, `supplier_name`, `supplier_invoice`, `purchase_date`, `payment_method` (TUNAI/TRANSFER_BCA/TEMPO), `due_date`, `total_amount`, `dpp_amount`, `ppn_amount` (supplier invoice, informational), `paid_amount`, `returned_amount`, `status` (LUNAS/BELUM_LUNAS/SEBAGIAN/BATAL), `journal_entry_number` | one goods receipt. `remaining()` = total − returned − paid (`paid_amount` is net of supplier refunds). `BATAL` = cancelled receipt |
| `purchase_payments` | `purchase_id` (FK cascade), `payment_date`, `amount`, `account_code`, `journal_entry_number` | payments against supplier debt |
| `purchase_returns` | `reference` (unique, `RTB-YYYYMM-####`), `purchase_id` (FK), `kind` (RETURN/CANCEL), `return_date`, `reason`, `quantity`, `total_amount`, `payable_amount`, `refund_amount`, `refund_account_code`, `journal_entry_number`, `created_by`, `operator_name` | purchase return or goods-receipt cancellation (migration `2026_10_03_000003`, which also adds `purchases.returned_amount`) |
| `purchase_return_items` | `purchase_return_id` (FK cascade), `product_batch_id` (nullable FK, null on delete), `quantity`, `unit_cost`, `total_cost` | units taken out per batch |

## Payment settings
| Table | Key columns |
|---|---|
| `payment_provider_settings` | `method_type` (bank/qris), `provider_name`, `provider_code`, `fee_percentage`, `fee_threshold_amount`, `is_active`, `sort_order` |
| `edc_settings` | `bank_name`, `payment_type` (Debit/Credit), `fee_percentage`, `charge_to_customer`, `is_active`. **Unused since 2026-09-30** (EDC removed; endpoints deleted) |

Providers and fees are server-only since 2026-09-30: the POS reads `GET /pos/payment-options` and the settings tab edits
`/settings/payment-providers` (see [domain-pos.md](domain-pos.md)).

## Accounting
| Table | Key columns | Notes |
|---|---|---|
| `accounts` | `account_code` (unique), `account_name`, `account_type` (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE), `normal_balance` (DEBIT/CREDIT), `is_active` | 28 rows; see [domain-accounting.md](domain-accounting.md) |
| `journal_entries` | `entry_number` (unique, `JRN-YYYYMM-####`), `entry_date`, `reference_type`, `reference_id`, `description`, `total_debit`, `total_credit`, `status` (POSTED), `created_by` (nullable FK `users`), `reversal_of_id` (nullable, unique, FK `journal_entries`) | `reversal_of_id` links a reversal to its original; the unique constraint caps an entry at one reversal |
| `journal_items` | `journal_entry_id` (FK cascade), `account_id` (FK), `debit`, `credit`, `note` | |
| `accounting_period_closings` | `period` (YYYY-MM), `end_date`, `closing_entry_id` (nullable FK `journal_entries`), `net_income`, `notes`, `closed_by`, `closed_at`, `reopened_at`, `reopened_by`, `reopen_reason`, `reopen_entry_id` (nullable FK `journal_entries`) | one row per closed month; lock date = `max(end_date)` where `reopened_at` is null |
| `expense_categories` | `category_code` (unique), `category_name`, `default_account_code` | seeded, 8 rows (GAJI…PAJAK, mapped to 6-1000…6-1008), matching the frontend `ExpenseCategory` strings |
| `expenses` | `reference` (`BKK-YYYYMM-####`), `expense_date`, `category_id`, `amount`, `payment_method`, `bank_name`, `recipient_name`, `description`, `attachment_path`, `approved_by`, `status` (ACTIVE/VOID), `void_reason`, `voided_by`, `voided_at`, `created_by` (nullable FK `users`) | attachment is stored after the journal posts and deleted if the transaction fails |
| `cash_sessions` | `user_id`, `opened_at`, `opening_float`, `book_opening`, `opening_note`, `from_entry_id`, `to_entry_id`, `closed_at`, `closed_by`, `expected_cash`, `counted_cash`, `variance`, `variance_reason`, `status` (OPEN/PENDING_APPROVAL/CLOSED), `approved_by`, `approved_at`, `journal_entry_id` | cashier shifts for the single drawer (1-1000); window = journal ids in (`from_entry_id`, `to_entry_id`]; `adjustment` (= `variance` + `opening_float` − `book_opening`) is journaled on approval |

## Not in the database
- Excel import staging is stored in a single shared file, `backend/storage/app/stock_migration/stock_staging.json`.
- Framework tables: `sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `password_reset_tokens`.
