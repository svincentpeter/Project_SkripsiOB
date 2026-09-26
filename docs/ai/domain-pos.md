# Domain: POS, payments, BON, booking DP, void, QRIS

Server-authoritative since stage 2. Design: `docs/superpowers/specs/2026-09-24-pos-server-checkout-design.md`.
Backend code: `backend/app/Services/Pos/*`, `Services/Payment/MidtransQrisService.php`. Frontend code:
`src/modules/pos/`, `src/modules/receipt/`, `src/services/api/posApi.ts`, `posMappers.ts`, `paymentApi.ts`.

## Checkout (`POST /pos/checkout`, permission `pos`)

**Request** (`PosCheckoutRequest`):
- Customer and vehicle fields, all optional.
- `items[]`, each with `type` (PRODUCT/SERVICE), `product_id` / `service_id`, `name`, `quantity` (a whole number of
  at least 1), `unit_price`, `discount_per_item`, `is_manual`, `cost_price`.
- `discount_amount` (a discount on the whole receipt), `booking_id`, `bon.term_days`
  (7, 14, or 30).
- `payments[]`, each with `method`, `amount`, `tendered`, `fee_percentage` (0–10), `charge_to_customer`,
  `provider_name`, `edc_bank`, `edc_type`, `reference`.

Payment methods: `TUNAI`, `TRANSFER`, `TRANSFER_BCA`, `QRIS`, `EDC_DEBIT`, `EDC_CREDIT`. BON (credit sale) is **not**
a payment method: send `bon` and an empty `payments` array.

**Server flow** (`CheckoutService::checkout`, one transaction):
1. If a booking is referenced, lock it. It must be `ACTIVE`.
2. `CartLines::build`:
   - Catalogue products are locked and must be active. Their summed quantity must not exceed
     `products.product_quantity`; otherwise the server returns 422 "Stok X tidak cukup".
   - The item name is replaced with the catalogue name.
   - Manual lines (`is_manual`) skip the stock check.
   - Per line: `gross = qty × unit_price`, `net = gross − qty × discount_per_item`.
3. Totals:
   - `subtotal = Σnet`
   - `grand = subtotal − discount_amount`. There is **no tax**: the shop is non-PKP and charges no PPN.
     A `tax_rate` sent by an old client is ignored (`test_sale_never_carries_ppn`).
   - `amountDue = grand − booking DP`
4. Payments:
   - Σ`amount` must equal `amountDue` within 0.001.
   - Cash: `tendered ≥ amount`, change is calculated per row, and the fee is forced to 0.
   - `EDC_CREDIT` with `charge_to_customer`: the surcharge is added on top and credited to 4-2000, and also expensed
     to 6-1009.
   - Every other non-cash method: `fee = amount × pct`, `net_received = amount − fee`.
   - QRIS with a `reference`: Midtrans status must be `settlement` or `capture`.
5. The sale is saved:
   - Number: `OB3-INV-YYYYMM-####` via `DocumentNumber`.
   - `payment_method`: the single method used, `SPLIT`, or `BON`.
   - `status`: `LUNAS`, or `PENDING` for BON (with `due_date = now + term_days`).
6. Lines are saved. Each catalogue product line calls `FifoCostingService::allocateFifo`, which writes
   `sale_batch_allocations` and a KELUAR/SALE stock movement and sets line HPP from FIFO cost.
7. `SalePayment` rows are saved, the journal is posted (see [domain-accounting.md](domain-accounting.md#posting-rules)),
   and any booking is marked `CONVERTED`.

**Response:** `Sale::toReceiptArray()`, which includes `journals[]`. The frontend maps it with `mapSaleToTransaction`
and merges the journals into the local list.

## Void (`POST /pos/transactions/{id}/void`, permission `sale_void`, OWNER-only by default)
`SaleVoidService`:
- Refused if the sale is already VOID or has any receivable payments.
- Restores stock: every `sale_batch_allocations` row goes back to its batch, `product_quantity` goes back up, and a
  MASUK/SALE_VOID movement is written.
- Posts `POS_SALE_VOID`, a mirror of the original entry dated **today**.
- A linked booking goes back to `ACTIVE`.
- The sale is marked `VOID` with `voided_at`, `voided_by`, and `void_reason` (at least 5 characters).
- No refund is sent to Midtrans or the bank.

## BON / receivables (`/receivables`, permission `bon_receivable` or `accounting_hub`)
- A BON sale debits 1-1002 for the amount due.
- `ReceivableService::pay` accepts partial or full payment to 1-1000 or 1-1001, posting `RECEIVABLE_PAYMENT`.
  The sale becomes `LUNAS` when `total_amount − dp_applied − Σpayments ≤ 0`.

## Booking with down payment (`/bookings`, permission `booking_dp`)
- **Create:** `CartLines` with `reserveStock: false`, so stock is not reserved. The DP must not exceed the estimated
  total. Numbered `BK-YYYYMM-####`. Journal: Dr cash/bank, Cr 2-1004. The account is stored in `dp_account_code`.
- **Cancel:** refund journal Dr 2-1004, Cr the chosen `refund_account_code`. Status becomes `CANCELLED`.
- **Convert:** pass `booking_id` at checkout. The DP is applied as Dr 2-1004 inside the sale journal. The cart is
  **not** compared with the booked items.

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
- The backend has `payment_provider_settings` and `edc_settings` with CRUD endpoints, plus `GET /pos/payment-options`.
- **The frontend does not use them.** `CheckoutModal` reads bank, QRIS, and EDC providers from localStorage
  `ob3_store_settings`, falling back to `INITIAL_*` in `mockData.ts`. It computes the fee % (including the QRIS
  threshold logic) and sends `fee_percentage`, and **the server trusts it**. Moving this to the server is listed as
  future work in the POS spec.

## Still client-side in POS
- Cart (`ob3_cart`) and on-screen totals (`calculateCartTotals`).
- Parked orders (`ob3_parked_orders`).
- Cash drawer balance (`ob3_cash_drawer`), adjusted after each sale by `cashPortion(sale)`.
- Printing a cart or parked order before checkout builds a temporary receipt with a **random** `OB3-INV-…` number
  that is never saved.

## Known issues (verified 2026-09-27)
1. `unit_price` and `fee_percentage` come from the client. The server checks product existence and stock, not prices.
2. QRIS can be recorded as paid without real payment. Any `pos` user can call `/simulate`, and a QRIS payment without a
   `reference` (static QRIS, or QRIS inside a split payment) is not verified. Checkout does not compare the Midtrans
   amount with the payment amount.
3. The stock check uses `product_quantity`, not batches. If batches run short, FIFO costs the remainder at
   `product_cost` with no allocation row, and a later void restores quantity but not those batches.
4. Manual-line cost is counted in `total_hpp` and `total_profit` but is not journaled. `total_profit` also ignores MDR fees.
5. There is no period-lock check on void.
