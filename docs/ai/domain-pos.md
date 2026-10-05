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
  at least 1), `unit_price`, `discount_per_item`, `is_manual`, `cost_price`. `cost_price` is ignored: manual lines
  are services only and have no cost of sales.
- `discount_amount` (a discount on the whole receipt).
- `payments[]`, each with `method`, `amount`, `tendered`, `provider_id` (id in `payment_provider_settings`),
  `reference` (Midtrans order id for dynamic QRIS). `fee_percentage` is `prohibited` (422): the server computes the fee.
- `bon` and `booking_id` are `prohibited`: an old client that still sends them gets 422 with an Indonesian message
  instead of a silently different sale.

Payment methods (`PosAccounts::CHECKOUT_METHODS`): `TUNAI`, `TRANSFER`, `TRANSFER_BCA`, `QRIS`. Any other method,
including the removed card-terminal methods, fails validation on `payments.N.method` (422).

**Server flow** (`CheckoutService::checkout`, one transaction; three attempts on a deadlock or lock-wait timeout, lock
order in [domain-accounting.md](domain-accounting.md#cash-drawer-and-shifts)):
0. If any payment is `TUNAI`, an open cashier shift is required (`CashSessionService::requireOpen()`, 422
   "Shift kasir belum dibuka…"). Transfer/QRIS-only sales need no shift.
1. `CartLines::build`:
   - All catalogue products are locked first, sorted by id, and must be active. Their summed quantity must not exceed
     `products.product_quantity`; otherwise the server returns 422 "Stok X tidak cukup".
   - The item name is replaced with the catalogue name.
   - A catalogue PRODUCT line priced Rp 0 or less is rejected (422, "Harga jual … masih Rp 0"); the POS card shows
     "Harga belum diisi" and the catalogue filter "Harga Jual Belum Diisi" lists them. Zero-priced services stay allowed.
   - Manual lines (`is_manual`) are services only: a manual PRODUCT line is rejected (422, "…belum terdaftar di
     katalog…"), because goods need a catalogue entry and a goods receipt to have FIFO cost. A manual SERVICE line
     books 4-1001 with HPP 0. The POS "Input Manual" form (`ManualItemForm`) offers only services.
   - Per line: `gross = qty × unit_price`, `net = gross − qty × discount_per_item`.
2. Totals:
   - `subtotal = Σnet`
   - `grand = subtotal − discount_amount`. There is **no tax**: the shop is non-PKP and charges no PPN.
     A `tax_rate` sent by an old client is ignored (`test_sale_never_carries_ppn`).
3. Payments:
   - Σ`amount` must equal `grand` within 0.001.
   - Cash: `tendered ≥ amount`, change is calculated per row, no fee, `provider_id` ignored.
   - Transfer: optional `provider_id` of an active `bank` provider (its name is stored); no fee.
   - QRIS: `provider_id` of an active `qris` provider is required; fee = `PaymentProviderSetting::calculateQrisFee`
     (`round(amount × pct / 100)` only when `amount > fee_threshold_amount`), `net_received = amount − fee`, MDR to 6-1009.
   - QRIS with a `reference` (dynamic): the `qris_transactions` row is locked and must be `settlement`, unused
     (`sale_payment_id` null, not twice in one checkout) and have `gross_amount` = the row amount; after the insert it
     is linked to the `sale_payments.id` for good (void does not release it). QRIS without a reference (static sticker)
     is cashier-attested; bank reconciliation of 1-1001 is its check.
   - Every transfer and QRIS row is booked to the one bank account 1-1001 (`PosAccounts::forMethod`); the provider
     only labels the bank the money came through.
4. The sale is saved:
   - Number: `OB3-INV-YYYYMM-####` via `DocumentNumber`.
   - `payment_method`: the single method used, or `SPLIT` (also used for a Rp 0 sale with no payment rows).
   - `status`: `LUNAS`.
5. Lines are saved. Each catalogue product line calls `FifoCostingService::allocateFifo`, which writes
   `sale_batch_allocations` and a KELUAR/SALE stock movement and sets line HPP from FIFO cost. If the product's batch
   layers hold fewer units than the line needs, the whole sale is rejected (422, "Lakukan stock opname…"); there is
   no `product_cost` fallback. `total_hpp` is the FIFO cost only, equal to the journaled 5-1000.
6. `SalePayment` rows are saved and the journal is posted (see [domain-accounting.md](domain-accounting.md#posting-rules)).

**Response:** `Sale::toReceiptArray()`, which includes `journals[]`. The frontend maps it with `mapSaleToTransaction`.
The legacy columns `sales.booking_id`, `dp_applied`, `due_date`, `edc_bank`, `edc_type`, `surcharge_amount` and
`sale_payments.edc_bank`, `edc_type`, `surcharge_amount` stay in the tables for history but are neither written nor
returned. Sale statuses produced: `LUNAS` and `VOID`. A returned sale stays `LUNAS`; the receipt carries
`returned_amount`, `returns[]`, per-item `returned_qty` and the `SALES_RETURN` journals.

## Sales return (`POST /pos/transactions/{id}/returns`, permission `sales_return`)
Request `{reason (min 5), items[{sale_detail_id, quantity}]}`. `SalesReturnService::create`, one transaction (three
attempts on a deadlock or lock-wait timeout; lock order in
[domain-accounting.md](domain-accounting.md#cash-drawer-and-shifts)):
- The refund is always **cash from the drawer**, whatever the original payment method, so an OPEN cashier shift is
  required (422 "Buka shift kasir dulu…"). Its id is stored on `sales_returns.cash_session_id`.
- The refund is computed by the server: the line's net value minus its cent-exact share of the nota discount (shares
  proportional to `sub_total`, rounding remainder on the largest line). A partial return gets its share of that, and
  the return that empties a line gets the rest, so Σ refunds of a fully returned nota = the nota total. The QRIS MDR
  of the original sale is not refunded.
- Product units go back to the batches the sale consumed, newest allocation first, at the allocation's `unit_cost`;
  `sale_batch_allocations.quantity_returned` tracks what already came back. `product_quantity` goes up and a
  MASUK/`SALES_RETURN` movement is written. Service lines (catalogue or manual) return revenue only.
- Numbered `RTJ-YYYYMM-####`, dated today. Journal `SALES_RETURN`: Dr 4-9100 / Cr 1-1000 for the refund, Dr 1-2000 /
  Cr 5-1000 for the restored cost. A return worth Rp 0 with no cost posts nothing.
- Refused (422): a VOID sale; a quantity above what is left to return; a line of another nota; and the **first**
  return of a nota that has a product line without a complete allocation trail (old fallback costing, or
  allocations deleted by an Excel rebuild). Such a nota can still be voided.
- The UI is the "Retur" button in Riwayat Struk (`SalesReturnModal`); the toast shows the refund to hand over.

## Void (`POST /pos/transactions/{id}/void`, permission `sale_void`, OWNER-only by default)
`SaleVoidService` (one transaction, three attempts on a deadlock or lock-wait timeout):
- Refused if the sale is already VOID, and refused once the sale has any return (return the remaining units
  instead).
- Restores stock: every `sale_batch_allocations` row goes back to its batch, `product_quantity` goes back up, and a
  MASUK/SALE_VOID movement is written. Units without allocation rows come back as new `VOID-…` batches at their
  booked cost (the line's HPP minus its allocated cost, cent-split by `FifoCostingService::centLayers()`), dated the
  sale date, so the reversal's Dr 1-2000 equals the restored FIFO value.
- Posts `POS_SALE_VOID`, a mirror of the original entry dated **today**.
- The sale is marked `VOID` with `voided_at`, `voided_by`, and `void_reason` (at least 5 characters).
- No refund is sent to Midtrans or the bank.
- A historic credit or DP-converted sale (only in a database that was not reset) is mirrored like any other sale;
  the void does not touch `receivable_payments` or `sales_bookings`.

## QRIS (Midtrans)
- Config in `backend/config/midtrans.php` (`MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`,
  `MIDTRANS_ALLOW_SIMULATION`). Sandbox is the default. **No fallback key.** `allow_simulation` is false by default
  and always false in production mode.
- Orders and settlements live in `qris_transactions` (one row per order id, see [data-model.md](data-model.md)).
- `POST /payment/qris/charge` calls Midtrans `/v2/charge` and records the order as `pending` at the requested amount.
  The response has `simulation_enabled`. A Midtrans failure (or no key) is a 422; only with simulation on does it
  return a fake EMV QR (`is_fallback: true`).
- `GET /payment/qris/status/{orderId}` answers a settled row from the DB; otherwise it asks Midtrans and records a
  `settlement`/`capture` answer with Midtrans' `gross_amount` (source `STATUS_API`). Errors count as `pending`.
- `POST /payment/qris/simulate/{orderId}` is 403 unless simulation is on; then it settles an order created by
  `/charge` at its charged amount (source `SIMULATION`), 422 for an unknown order.
- The webhook (`POST /payment/midtrans/webhook`, public) checks `sha512(order_id.status_code.gross_amount.server_key)`
  with `hash_equals` and rejects everything when no server key is set. On settlement or capture it records the
  signed `gross_amount` (source `WEBHOOK`). Settling is idempotent: the first settlement wins.
- Frontend: `CheckoutModal` generates `POS-{Date.now()}`, and `QrisDynamicModal` charges and then polls every 2.5 s;
  its demo bar is shown only when `simulation_enabled`. The order id is sent as the payment `reference`.
- If checkout fails after a dynamic QRIS has settled (customer already paid), `CheckoutModal` keeps the settled order
  (`{orderId, amount}`, `src/modules/pos/settledQris.ts`) and reuses it on retry at the same total: no new charge, and
  the server's single-use check still applies. A different selection or total shows a warning instead. The kept order
  is component state, so a page reload loses it and the customer's money must then be followed up manually
  (refund, or record the sale by hand).

## Fees and payment settings
- `payment_provider_settings` (bank and QRIS) is the only source of providers and fees. CRUD under
  `/settings/payment-providers` (writes need `role_settings`), cashier list `GET /pos/payment-options`.
- `CheckoutModal` loads `GET /pos/payment-options` each time it opens, shows the MDR preview from the same rows and
  sends only `provider_id`; the QRIS provider picker is shown for dynamic and static QRIS.
- Settings → "Metode Pembayaran" (`PaymentMethodsTab`) creates, toggles and deletes providers on the server and saves
  edited table cells on blur. `ob3_store_settings` no longer holds providers; `App.tsx` drops legacy
  `bank_providers`, `qris_providers`, `edc_settings` and `coa_receivable_account` when it loads the saved settings.

## Still client-side in POS
- Cart (`ob3_cart`) and on-screen totals (`calculateCartTotals`).
- Parked orders (`ob3_parked_orders`).
- Printing a cart or parked order before checkout builds a temporary receipt with a **random** `OB3-INV-…` number
  that is never saved.

The cash drawer is no longer client-side: the POS header shows the shift control (`CashShiftControl`): open shift with
a counted float, close shift with a counted drawer; the drawer amount shown is the 1-1000 ledger balance
(see [domain-accounting.md](domain-accounting.md#cash-drawer-and-shifts)). The old `ob3_cash_drawer` counter is
removed on load.

## Known issues (verified 2026-09-27, updated 2026-09-30)
1. `unit_price` comes from the client. The server checks product existence and stock, not prices.
2. A QRIS payment without a `reference` (static QRIS, or QRIS inside a split payment) is cashier-attested and not
   verified until bank reconciliation. Dynamic QRIS is verified (settled, single use, amount) since 2026-09-30.
3. `total_profit` ignores MDR fees.
4. Void has no period-lock check of its own. None is needed: the reversal is dated today and the engine's period
   lock applies to it, and only fully elapsed months can be closed.

The FIFO shortfall fallback and the unjournaled manual-line cost were fixed on 2026-09-30 (transaction corrections).
