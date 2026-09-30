# API reference (`/api/v1`)

Source of truth is `backend/routes/api.php`. Regenerate this list with
`cd backend && php artisan route:list --path=api`. `docs/superpowers/specs/API_DOCUMENTATION.md` is **stale**, so do not use it.

## Conventions
- **Auth:** send `Authorization: Bearer <token>`. Get a token from `POST /auth/login` with body `{login, password}`,
  where `login` is a username or email. Tokens are Sanctum personal access tokens named `pos-session`, and they
  expire after `SANCTUM_EXPIRATION` (720 min). Login is throttled to 5 attempts per minute per login+IP. A failed
  login returns 422 "Username atau password salah."
- **Permission column:** the user needs **any one** of the listed keys. OWNER passes every check. A missing key
  returns 403 `{"message":"Anda tidak memiliki izin untuk aksi ini."}`. An unauthenticated request returns 401.
- **Success responses:** `{ success: true, message?, data }`. Creating a resource returns 201.
- **Error responses:** business rule errors return 422 `{message}` (`PosRuleException`), and validation errors return
  422 `{message, errors}`. Messages are in Indonesian.

## Public
| Method | Path | Notes |
|---|---|---|
| GET | `/health` | status plus database connectivity |
| POST | `/auth/login` | throttled |
| POST | `/payment/midtrans/webhook` | verified by sha512 signature (403 on mismatch or when no server key is set); records the settled amount |

## Authenticated, any role
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/logout` | revokes the current token, returns 204 |
| GET | `/auth/me` | returns `{user}`, including a `permissions` map |
| GET | `/settings/role-permissions` | KASIR/GUDANG matrix; readable by everyone on purpose |

## Master data
| Method | Path | Permission |
|---|---|---|
| GET | `/products`, `/products/{id}`, `/services[/{id}]`, `/suppliers[/{id}]`, `/product-categories`, `/service-categories` | `pos`, `inventory_view` |
| GET | `/accounts` (the COA; frontend pickers load it directly, no local copy) | `pos`, `inventory_view`, `accounting_hub`, `financial_reports`, `expenses` |
| POST / PUT / PATCH / DELETE | `/products`, `/services`, `/suppliers`, `/product-categories`, `/service-categories` (apiResource) | `inventory_manage` |

Delete behavior for products, services, suppliers, and categories: if the record is in use (sold, has movements or
purchases, has live batches), it is deactivated or refused with 422 instead of being deleted. See [domain-inventory.md](domain-inventory.md).

## POS and payments ([domain-pos.md](domain-pos.md))
| Method | Path | Permission |
|---|---|---|
| GET | `/pos/payment-options` (`bank_providers`, `qris_providers`) | `pos` |
| POST | `/pos/checkout` | `pos` |
| GET | `/pos/transactions` (`search`, `date`, `limit` ≤ 500), `/pos/transactions/{id}` | `pos`, `receipt` |
| POST | `/pos/transactions/{id}/void` (`reason`, min 5 characters) | `sale_void` |
| POST | `/payment/qris/charge` (records the order; response has `simulation_enabled`) | `pos` |
| POST | `/payment/qris/simulate/{orderId}` (403 unless `MIDTRANS_ALLOW_SIMULATION`; only charged orders) | `pos` |
| GET | `/payment/qris/status/{orderId}` | `pos` |
| GET | `/settings/payment-providers` | `role_settings`, `pos` |
| POST / PUT `{id}` / DELETE `{id}` | `/settings/payment-providers` | `role_settings` |

The booking DP, BON receivable and EDC-settings endpoints were removed on 2026-09-30 and now return 404. Checkout
rejects `bon`, `booking_id` and card-terminal methods with 422 (see [domain-pos.md](domain-pos.md)).

## Inventory ([domain-inventory.md](domain-inventory.md))
| Method | Path | Permission |
|---|---|---|
| POST | `/inventory/restock` (goods receipt) | `goods_receipt` |
| GET | `/purchases` | `goods_receipt`, `accounts_payable` |
| POST | `/purchases/{id}/payments` (`account_code` 1-1000 or 1-1001) | `accounts_payable` |
| GET | `/inventory/stock-movements`, `/inventory/valuation` | `inventory_view` |
| POST | `/inventory/opening-balance` | `accounting_hub` |
| POST | `/inventory/stock-opname` | `stock_opname` |
| POST | `/stock/import-preview` (multipart `excel_file`, `qty_column` G or H), `/stock/resolve-brand`, `/stock/resolve-name`, `/stock/ignore-unresolved`, `/stock/commit`, `/stock/bulk-update` (alias `/stock/reconciliation/bulk-update`) | `stock_opname` |
| GET | `/stock/staging`, `/stock/template` | `stock_opname` |
| GET | `/reports/stock-monthly` (`month`, `brand`), `/reports/stock-monthly/export` (CSV) | `inventory_view` |
| POST | `/reports/stock-monthly/inline-update` | `stock_opname` |

## Expenses and accounting ([domain-accounting.md](domain-accounting.md))
The frontend calls all of these through `accountingApi.ts` and `expenseApi.ts`.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/expense-categories` | `expenses` | seeded, 8 categories mapped to 6-1000…6-1008 |
| GET | `/expenses`, `/expenses/{id}` | `expenses` | `/expenses` takes `search, category_id, status, start_date, end_date, per_page`; paginated |
| POST | `/expenses` | `expenses` | multipart; `{expense_date, category_id, amount, payment_method, bank_name?, recipient_name, description, attachment?}` |
| POST | `/expenses/{id}/void` | `expenses` | `{reason}`; posts `VOID_EXPENSE` linked by `reversal_of_id`; voiding a voided expense is 422 |
| GET | `/accounting/journals` | `accounting_hub` | `start_date, end_date, types (comma list), search, account_code, page, per_page≤100`; paginated |
| POST | `/accounting/journals/manual` | `accounting_hub` | `{date≤today, description, items[{account_code, debit, credit, note}]}`; control accounts (1-1002, 1-2000, 2-1000, 2-1004) rejected |
| POST | `/accounting/journals/{entryNumber}/reverse` | `accounting_hub` | `{reason}`; only `MANUAL_ADJUSTMENT` entries, once each |
| GET | `/accounting/general-ledger` | `accounting_hub` | `account_code, start_date, end_date` |
| GET | `/accounting/trial-balance` | `accounting_hub` | `as_of` |
| GET | `/accounting/financial-statements` | `financial_reports`, `accounting_hub` | `start_date, end_date`; income statement, balance sheet, equity changes |
| GET | `/accounting/cash-flow` | `financial_reports`, `accounting_hub` | `start_date, end_date`; direct method |
| GET | `/accounting/cash-balances` | `expenses`, `accounting_hub`, `financial_reports`, `cash_session` | `{1-1000, 1-1001}` as of today |
| GET | `/accounting/periods` | `accounting_hub` | lock date, recent closings, suggested period to close |
| POST | `/accounting/periods/close` | `accounting_hub` | `{period: YYYY-MM, notes}`; only a fully-elapsed month |
| POST | `/accounting/periods/{period}/reopen` | `accounting_hub` + OWNER | `{reason}`; only the most recently closed period |
| GET / POST | `/accounting/opening-balance` | `accounting_hub` | `{date, balances{code: amount}}`; posts once (`ACCOUNT_OPENING`) |
| GET | `/accounting/accounts-payable` | `accounts_payable` | |
| POST | `/accounting/accounts-payable/pay` | `accounts_payable` | per-supplier legacy path; the UI uses `/purchases/{id}/payments` |

## Cash shifts and cash movements ([domain-accounting.md](domain-accounting.md#cash-drawer-and-shifts))
| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/cash-sessions/current` | `cash_session`, `cash_session_approve` | `{session (with lines, expected_cash) \| null, book_balance}` |
| POST | `/cash-sessions/open` | `cash_session` | `{opening_float, opening_note?}`; note required when the float ≠ book balance; one open shift at a time |
| POST | `/cash-sessions/{id}/close` | `cash_session` | `{counted_cash, variance_reason?}`; reason required for a variance; → `PENDING_APPROVAL` |
| GET | `/cash-sessions` | `cash_session_approve` | `status?` (`OPEN`/`PENDING_APPROVAL`/`CLOSED`) filter; 30 newest, pending first |
| POST | `/cash-sessions/{id}/approve` | `cash_session_approve` | posts `CASH_SESSION_VARIANCE` (6-1010) unless 0; returns `{session, journals}` |
| GET | `/cash-movements` | `cash_movement` | 50 newest deposit/Prive/capital journals |
| POST | `/cash-movements` | `cash_movement` | `{type: DEPOSIT\|DRAWING\|CAPITAL, date ≤ today, amount, account_code (1-1000/1-1001, not for DEPOSIT), description}` → 201 journal |

## Role settings
| Method | Path | Permission |
|---|---|---|
| PUT | `/settings/role-permissions` with body `{KASIR:{key:bool}, GUDANG:{key:bool}}` | `role_settings` |

The OWNER role is ignored if sent. Unknown keys return 422.

## Console commands
- `php artisan inventory:opening-balance` books the gap between FIFO value and the balance of account 1-2000 against 3-1000 (idempotent).
- `php artisan stock:opname --file= --period= [--qty-column=] [--dry-run] [--force]` is the CLI version of the Excel commit.
