# Domain: POS, payments, void, QRIS

Server-authoritative since stage 2. Design: `docs/superpowers/specs/2026-09-24-pos-server-checkout-design.md`.
Booking DP (inden), BON credit sales and EDC card payments were removed on 2026-09-30
(`docs/superpowers/specs/2026-09-30-remove-dp-bon-edc-design.md`).
Backend code: `backend/app/Services/Pos/*`, `Services/Payment/MidtransQrisService.php`. Frontend code:
`src/modules/pos/`, `src/modules/receipt/`, `src/services/api/posApi.ts`, `posMappers.ts`, `paymentApi.ts`.

Every sale is paid in full at checkout with Tunai, Transfer (`TRANSFER` / `TRANSFER_BCA`) or QRIS, alone or split.
There are no credit sales, no customer down payments and no card-terminal payments.

## Checkout (`POST /pos/checkout`, permission `pos`)

**Request** (`PosCheckoutRequest`):
- Customer and vehicle fields, all optional.
- `items[]`, each with `type` (PRODUCT/SERVICE), `product_id` / `service_id`, `name`, `quantity` (a whole number of
  at least 1), `unit_price`, `discount_per_item`, `is_manual`, `cost_price`.
- `discount_amount` (a discount on the whole receipt).
- `payments[]`, each with `method`, `amount`, `tendered`, `fee_percentage` (0–10), `provider_name`, `reference`.
- `bon` and `booking_id` are `prohibited`: an old client that still sends them gets 422 with an Indonesian message
  instead of a silently different sale.

Payment methods (`PosAccounts::CHECKOUT_METHODS`): `TUNAI`, `TRANSFER`, `TRANSFER_BCA`, `QRIS`. Any other method,
including the removed card-terminal methods, fails validation on `payments.N.method` (422).

**Server flow** (`CheckoutService::checkout`, one transaction):
1. `CartLines::build`:
   - Catalogue products are locked and must be active. Their summed quantity must not exceed
     `products.product_quantity`; otherwise the server returns 422 "Stok X tidak cukup".
   - The item name is replaced with the catalogue name.
   - Manual lines (`is_manual`) skip the stock check.
   - Per line: `gross = qty × unit_price`, `net = gross − qty × discount_per_item`.
2. Totals:
   - `subtotal = Σnet`
   - `grand = subtotal − discount_amount`. There is **no tax**: the shop is non-PKP and charges no PPN.
     A `tax_rate` sent by an old client is ignored (`test_sale_never_carries_ppn`).
3. Payments:
   - Σ`amount` must equal `grand` within 0.001.
   - Cash: `tendered ≥ amount`, change is calculated per row, and the fee is forced to 0.
   - Transfer and QRIS: `fee = amount × pct`, `net_received = amount − fee`. In practice only QRIS carries a fee
     (the MDR, expensed to 6-1009).
   - QRIS with a `reference`: Midtrans status must be `settlement` or `capture`.
4. The sale is saved:
   - Number: `OB3-INV-YYYYMM-####` via `DocumentNumber`.
   - `payment_method`: the single method used, or `SPLIT` (also used for a Rp 0 sale with no payment rows).
   - `status`: `LUNAS`.
5. Lines are saved. Each catalogue product line calls `FifoCostingService::allocateFifo`, which writes
   `sale_batch_allocations` and a KELUAR/SALE stock movement and sets line HPP from FIFO cost.
6. `SalePayment` rows are saved and the journal is posted (see [domain-accounting.md](domain-accounting.md#posting-rules)).

**Response:** `Sale::toReceiptArray()`, which includes `journals[]`. The frontend maps it with `mapSaleToTransaction`.
The legacy columns `sales.booking_id`, `dp_applied`, `due_date`, `edc_bank`, `edc_type`, `surcharge_amount` and
`sale_payments.edc_bank`, `edc_type`, `surcharge_amount` stay in the tables for history but are neither written nor
returned. Sale statuses produced: `LUNAS` and `VOID`.

## Void (`POST /pos/transactions/{id}/void`, permission `sale_void`, OWNER-only by default)
`SaleVoidService`:
- Refused if the sale is already VOID.
- Restores stock: every `sale_batch_allocations` row goes back to its batch, `product_quantity` goes back up, and a
  MASUK/SALE_VOID movement is written.
- Posts `POS_SALE_VOID`, a mirror of the original entry dated **today**.
- The sale is marked `VOID` with `voided_at`, `voided_by`, and `void_reason` (at least 5 characters).
- No refund is sent to Midtrans or the bank.
- A historic credit or DP-converted sale (only in a database that was not reset) is mirrored like any other sale;
  the void does not touch `receivable_payments` or `sales_bookings`.

## QRIS (Midtrans)
- Config in `backend/config/midtrans.php` (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`).
  Sandbox is the default, and a demo key is the fallback.
- `POST /payment/qris/charge` calls Midtrans `/v2/charge` (`payment_type: qris`). **If Midtrans fails, it silently
  returns a fake EMV QR string with `is_fallback: true`.**
- `GET /payment/qris/status/{orderId}` checks the cache key `midtrans_sim_{orderId}` first, then Midtrans. Any error
  counts as `pending`.
- `POST /payment/qris/simulate/{orderId}` writes `settlement` into that cache. It is a dev helper but is **not
  environment-gated**.
- The webhook (`POST /payment/midtrans/webhook`, public) checks
  `sha512(order_id.status_code.gross_amount.server_key)` with `hash_equals`. On settlement or capture it only writes
  the cache; nothing is persisted.
- Frontend: `CheckoutModal` generates `POS-{8 digits}`, and `QrisDynamicModal` charges and then polls every 2.5 s.
  The order id is sent as the payment `reference`.

## Fees and payment settings
- The backend has `payment_provider_settings` (bank and QRIS) with CRUD endpoints under `/settings/payment-providers`,
  plus `GET /pos/payment-options` (`bank_providers`, `qris_providers`). The `edc_settings` table is kept for history
  but unused; its endpoints were removed.
- **The frontend does not use them.** `CheckoutModal` reads bank and QRIS providers from localStorage
  `ob3_store_settings`, falling back to `INITIAL_BANK_PROVIDERS` / `INITIAL_QRIS_PROVIDERS` in `mockData.ts`. It
  computes the fee % (including the QRIS threshold logic) and sends `fee_percentage`, and **the server trusts it**.
  Moving this to the server is listed as future work in the POS spec. `App.tsx` drops the legacy `edc_settings` and
  `coa_receivable_account` properties when it loads the saved settings.

## Still client-side in POS
- Cart (`ob3_cart`) and on-screen totals (`calculateCartTotals`).
- Parked orders (`ob3_parked_orders`).
- Cash drawer balance (`ob3_cash_drawer`), adjusted after each sale by `cashPortion(sale)`.
- Printing a cart or parked order before checkout builds a temporary receipt with a **random** `OB3-INV-…` number
  that is never saved.

## Known issues (verified 2026-09-27, still open)
1. `unit_price` and `fee_percentage` come from the client. The server checks product existence and stock, not prices.
2. QRIS can be recorded as paid without real payment. Any `pos` user can call `/simulate`, and a QRIS payment without a
   `reference` (static QRIS, or QRIS inside a split payment) is not verified. Checkout does not compare the Midtrans
   amount with the payment amount.
3. The stock check uses `product_quantity`, not batches. If batches run short, FIFO costs the remainder at
   `product_cost` with no allocation row, and a later void restores quantity but not those batches.
4. Manual-line cost is counted in `total_hpp` and `total_profit` but is not journaled. `total_profit` also ignores MDR fees.
5. There is no period-lock check on void.
