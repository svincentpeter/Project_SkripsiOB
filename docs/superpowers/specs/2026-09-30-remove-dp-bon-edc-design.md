# Remove DP/Booking Inden, BON and EDC from POS (design)

Date: 2026-09-30. Plan: `docs/superpowers/plans/2026-09-30-remove-dp-bon-edc.md`.

## Goal

The POS keeps only what OB3 actually uses: every sale is paid in full at checkout with **Tunai, Transfer
(TRANSFER / TRANSFER_BCA) or QRIS**, alone or split. Three features are removed end to end (UI, API, services,
models, validation, permissions, settings, mock data, notifications, exports, tests, docs):

1. **DP / booking inden**: customer pre-order with a down payment (liability 2-1004).
2. **BON**: credit sale that creates a receivable (1-1002) and its settlement screen ("Pembantu Piutang").
3. **EDC**: card terminal payments (`EDC_DEBIT`, `EDC_CREDIT`), EDC fee settings, and the credit-card surcharge
   charged to the customer (revenue 4-2000).

Fewer paths means fewer postings to defend under SAK EMKM: after this change the only POS journals are
`POS_SALE` and `POS_SALE_VOID`.

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Remove the three features completely: UI, endpoints, services, models, FormRequest rules, permission keys `booking_dp` and `bon_receivable`, EDC settings (backend CRUD, frontend settings sub-tab, `StoreSettings.edc_settings`), related tests, mock data, notifications and docs. | User (binding) |
| D2 | **Tables and columns are not dropped**: `sales_bookings`, `receivable_payments`, `edc_settings`, `sales.booking_id / dp_applied / due_date / edc_bank / edc_type / surcharge_amount`, `sale_payments.edc_bank / edc_type / surcharge_amount`. Historic journals stay valid. No code reads or writes them afterwards. | User (binding) |
| D3 | Existing dev data (1 booking, 1 BON sale, 1 receivable payment) is test data. The plan ends with an **optional, destructive, manual** dev DB reset (`php artisan migrate:fresh --seed` + `php artisan inventory:opening-balance`) run by the user. The testing DB is only migrated. | User (binding) |
| D4 | The ledger tab "Pembantu Piutang", `AccountsReceivableTab`, BON-overdue notifications and the `accounts_receivable` export report are removed. | User (binding) |
| D5 | Accounts 1-1002, 2-1004 and 4-2000 stay in the COA (historic journals reference them) and are set `is_active = false` by a migration (insert-if-missing, `down()` reactivates). 6-1009 stays active: QRIS MDR still posts there. | User (binding) |
| D6 | `ManualJournalService::CONTROL_ACCOUNTS` keeps 1-1002 and 2-1004 (still protected; they are also inactive, so `ManualJournalRequest` already rejects them). | User (binding) |
| D7 | A migration deletes `role_permissions` rows for `booking_dp` / `bon_receivable`; `down()` re-inserts the old defaults if missing. `RolePermissionController` already rejects unknown keys, so the removed keys become 422 once they leave `Permissions::KEYS`. | User, verified in code |
| D8 | Old clients are **rejected, not ignored**: `bon` and `booking_id` become `prohibited` in `PosCheckoutRequest` (422), and `EDC_*` methods fail `Rule::in`. A silently ignored `bon` would otherwise turn an intended credit sale into a 422 "payment total" error or, worse, a paid sale. | Chosen here |
| D9 | Endpoints are deleted, not stubbed: `/bookings*`, `/receivables*`, `/settings/edc*` return 404. `GET /pos/payment-options` keeps `bank_providers` and `qris_providers` and drops `edc_settings`. | Chosen here |
| D10 | `CartLines::build()` loses its `reserveStock` flag (only booking used `false`); checkout always locks products and checks stock. | Chosen here |
| D11 | `surcharge_amount` (sales and sale_payments) is treated as an EDC column: no longer written or returned. `fee_percentage`, `fee_amount`, `net_received` stay (QRIS MDR). | Chosen here |
| D12 | No localStorage key held only these features (`ob3_bookings` / `ob3_receivables` do not exist, verified by grep). The only leftovers are the `edc_settings` and `coa_receivable_account` properties inside `ob3_store_settings`; `App.tsx` strips them when it loads the settings. | Verified in code |
| D13 | Historic journal types `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT` are no longer produced. The journal screen drops their filter groups; such entries remain visible under "Semua". | Chosen here |

## What stays and what goes, per layer

| Layer | Goes | Stays |
|---|---|---|
| Routes | `bookings`, `bookings/{id}/cancel`, `receivables`, `receivables/{saleId}/payments`, `settings/edc` (GET/POST/PUT/DELETE) | `pos/checkout`, `pos/transactions*`, void, `pos/payment-options`, `payment/qris/*`, `settings/payment-providers*` |
| Controllers | `BookingController`, `ReceivableController`, EDC methods of `PaymentMethodSettingController` | `PosController`, provider CRUD, `getPaymentOptions` (bank + QRIS) |
| Services | `Pos/BookingService`, `Pos/ReceivableService`; checkout BON/DP/surcharge branches; void BON guard and booking reactivation | `CheckoutService` (cash/transfer/QRIS, split, QRIS settlement check, FIFO, journal), `SaleVoidService` (stock restore + mirror journal), `CartLines` |
| Models | `SalesBooking`, `ReceivablePayment`, `EdcSetting`; `Sale::booking()`, `Sale::receivablePayments()`; removed fields in `$fillable`/`$casts` | `Sale`, `SalePayment`, `PaymentProviderSetting` |
| PosAccounts | `RECEIVABLE`, `CUSTOMER_DEPOSIT`, `SURCHARGE`, `DEPOSIT_METHODS`, `EDC_*` in `CHECKOUT_METHODS` | `CASH`, `BANK`, `INVENTORY`, revenue, discount, COGS, `MDR_EXPENSE`, `forMethod()` |
| API shape (`Sale::toReceiptArray`) | `dp_applied`, `booking_id`, `edc_bank`, `edc_type`, `surcharge_amount`, `due_date`, `receivable_paid`; per payment `surcharge_amount`, `edc_bank`, `edc_type` | everything else |
| Permissions | `booking_dp`, `bon_receivable` (backend `KEYS`/`DEFAULTS`, frontend `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`, `RolePermissionsTab`, DB rows) | the other 13 keys; KASIR default becomes `pos`, `receipt` |
| COA | nothing deleted | 1-1002, 2-1004, 4-2000 inactive; 6-1009 active |
| Frontend POS | `BookingDpModal`, `BookingListDrawer`, cart modes BON/DP, "Booking DP" header button, CheckoutModal BON tag + due date + EDC single/split sections, DP lines, `PosSuccessModal`/`ReceiptPreviewModal` BON variants | checkout (single + split among TUNAI/TRANSFER/QRIS), QRIS dynamic/static, parked orders, receipts |
| Frontend other | `AccountsReceivableTab` + "5. Pembantu Piutang" tab, EDC settings sub-tab, "Piutang Pelanggan (BON)" COA preference, dashboard BON bucket, receipt filters/badges BON and DP, BOOKING_NEW / BON_OVERDUE notifications, `accounts_receivable` export, `posApi` booking/receivable calls, `mapBooking`/`mapReceivable`, types `SalesBookingRecord`, `ReceivableInvoice`, `ReceivablePaymentInput`, `EdcSetting`, `PaymentMethod` members `EDC`/`EDC_DEBIT`/`EDC_CREDIT`/`HUTANG_BON`, EDC/DP/BON fields on `PosTransaction`/`SplitPaymentLine`/`StoreSettings`, mock `INITIAL_BOOKINGS`/`INITIAL_EDC_SETTINGS`, legacy supabase booking/receivable functions, `posService` booking helpers, help texts, e2e audit blocks | payables sub-ledger, all accounting reports |
| Database | nothing | all tables/columns listed in D2 (unused) |

Sale statuses produced after the change: `LUNAS` (checkout) and `VOID` (void). `PENDING` was produced only by BON.
`payment_method` values produced: `TUNAI`, `TRANSFER`, `TRANSFER_BCA`, `QRIS`, `SPLIT` (also used for a Rp 0 sale
with no payment rows, as today).

## Accounting impact

- **POS sale journal** (`CheckoutService::postJournal`):
  Dr 1-1000 / 1-1001 per payment at `net_received`, Dr 6-1009 MDR fees, Dr 4-9000 discounts, Dr 5-1000 FIFO cost;
  Cr 4-1000 goods (gross), Cr 4-1001 services (gross), Cr 1-2000 FIFO cost. The Dr 2-1004 (DP applied),
  Dr 1-1002 (BON) and Cr 4-2000 (surcharge) lines disappear. Balance is still enforced by `AccountingEngine`.
- **No more postings** of `BOOKING_DP`, `BOOKING_DP_REFUND`, `RECEIVABLE_PAYMENT`.
- **Void** mirrors the original entry as before. Voids of cash/transfer/QRIS sales are unchanged.
- **Reports**: `LedgerBalances` lists every COA account regardless of `is_active`, so historic balances on the three
  inactive accounts still appear and the balance sheet still balances. `CashFlowReport::bucket()` keeps 1-1002 and
  2-1004 in the "customers" bucket so historic entries stay classified. Nothing in the report code filters on
  `is_active` (verified: only `ManualJournalRequest` does).
- **SAK EMKM**: the entity has no receivables or customer deposits from new activity; CALK no longer needs a
  receivables breakdown. The COA keeps the codes so prior periods remain reproducible.

## Testing

Backend (`DatabaseTransactions`): checkout rejects `bon`, `booking_id`, `EDC_DEBIT`, `EDC_CREDIT` with 422 and
no stock movement; split TUNAI + QRIS balances, books MDR to 6-1009, has no 4-2000 line and no removed fields in the
response; void of that sale mirrors the MDR; removed endpoints return 404; payment options have no `edc_settings`;
the three accounts are inactive and 6-1009 active; a historic 4-2000 journal still shows in the income statement;
role-permission update rejects the removed keys and the matrix no longer lists them; auth permission map has 13
keys. Cash-flow test rewritten without a BON sale. `composer test`.

Frontend (Vitest, node): mappers send no `charge_to_customer`/EDC fields and map no DP/BON fields; mock store
settings have no `edc_settings`/`coa_receivable_account`; export registry has 20 reports; default role permissions
contain no removed keys. `npm run lint && npm test`. A manual browser checklist closes the plan.

## Risks

- **Voiding a historic BON or DP-converted sale** (only if the dev DB is not reset): the mirror entry credits
  1-1002 or restores 2-1004 without touching `receivable_payments` / `sales_bookings`. A BON sale that already had a
  settlement would push 1-1002 negative, and a DP sale would re-create a customer deposit with no booking to refund.
  The BON guard is removed by decision D1; the dev DB reset (D3) removes the only such rows. Production has no data.
- **Stale clients**: a browser still running the old bundle sends `bon`/`booking_id`/`EDC_*` and gets a 422 with an
  Indonesian message instead of a wrong posting (D8).
- **Inactive accounts in reports**: 1-1002, 2-1004 and 4-2000 still appear as zero rows in the trial balance and
  statements (reports list every COA account). Accepted; hiding inactive zero-activity accounts is an open question.
- **Thesis documents** (`docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md`, `README.md`, the 2026-09-24 POS spec) still
  describe these features. They are historical/stale and out of scope.
