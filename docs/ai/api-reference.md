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
| POST | `/payment/midtrans/webhook` | verified by sha512 signature (403 on mismatch) |

## Authenticated, any role
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/logout` | revokes the current token, returns 204 |
| GET | `/auth/me` | returns `{user}`, including a `permissions` map |
| GET | `/settings/role-permissions` | KASIR/GUDANG matrix; readable by everyone on purpose |

## Master data
| Method | Path | Permission |
|---|---|---|
| GET | `/products`, `/products/{id}`, `/services[/{id}]`, `/suppliers[/{id}]`, `/product-categories`, `/service-categories`, `/accounts` | `pos`, `inventory_view` |
| POST / PUT / PATCH / DELETE | `/products`, `/services`, `/suppliers`, `/product-categories`, `/service-categories` (apiResource) | `inventory_manage` |

Delete behavior for products, services, suppliers, and categories: if the record is in use (sold, has movements or
purchases, has live batches), it is deactivated or refused with 422 instead of being deleted. See [domain-inventory.md](domain-inventory.md).

## POS and payments ([domain-pos.md](domain-pos.md))
| Method | Path | Permission |
|---|---|---|
| GET | `/pos/payment-options` | `pos` |
| POST | `/pos/checkout` | `pos` |
| GET | `/pos/transactions` (`search`, `date`, `limit` ≤ 500), `/pos/transactions/{id}` | `pos`, `receipt` |
| POST | `/pos/transactions/{id}/void` (`reason`, min 5 characters) | `sale_void` |
| GET | `/bookings` | `booking_dp`, `pos` |
| POST | `/bookings`, `/bookings/{id}/cancel` | `booking_dp` |
| GET | `/receivables` | `bon_receivable`, `accounting_hub` |
| POST | `/receivables/{saleId}/payments` | `bon_receivable`, `accounting_hub` |
| POST | `/payment/qris/charge`, `/payment/qris/simulate/{orderId}` | `pos` |
| GET | `/payment/qris/status/{orderId}` | `pos` |
| GET | `/settings/payment-providers`, `/settings/edc` | `role_settings`, `pos` |
| POST / PUT `{id}` / DELETE `{id}` | `/settings/payment-providers`, `/settings/edc` | `role_settings` |

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
The frontend **does not call these yet**. Expenses and journals are still handled client-side.

| Method | Path | Permission |
|---|---|---|
| GET | `/expense-categories`, `/expenses`, `/expenses/{id}` | `expenses` |
| POST | `/expenses`, `/expenses/{id}/void` | `expenses` |
| GET | `/accounting/journals` (`type`, `status`, `search`, `start_date`, `end_date`; paginated) | `accounting_hub` |
| POST | `/accounting/journals/manual` | `accounting_hub` |
| GET | `/accounting/general-ledger` (`account_code`, dates), `/accounting/trial-balance` | `accounting_hub` |
| GET | `/accounting/financial-statements` | `financial_reports` |
| GET | `/accounting/accounts-payable` | `accounts_payable` |
| POST | `/accounting/accounts-payable/pay` (per-supplier legacy path; the UI uses `/purchases/{id}/payments`) | `accounts_payable` |

## Role settings
| Method | Path | Permission |
|---|---|---|
| PUT | `/settings/role-permissions` with body `{KASIR:{key:bool}, GUDANG:{key:bool}}` | `role_settings` |

The OWNER role is ignored if sent. Unknown keys return 422.

## Console commands
- `php artisan inventory:opening-balance` books the gap between FIFO value and the balance of account 1-2000 against 3-1000 (idempotent).
- `php artisan stock:opname --file= --period= [--qty-column=] [--dry-run] [--force]` is the CLI version of the Excel commit.
