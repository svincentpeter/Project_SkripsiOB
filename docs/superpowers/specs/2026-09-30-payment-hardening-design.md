# Payment Hardening — roadmap sub-project 6 (design)

Date: 2026-09-30. Plan: `docs/superpowers/plans/2026-09-30-payment-hardening.md`.
Roadmap: `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` (sub-project 6). Executes **first** of SP2–SP6
(`.superpowers/sdd/roadmap-allocation.md`).

## Goal

A QRIS or transfer payment recorded by the POS must match money that really arrived, at the amount that arrived,
exactly once, with the fee taken from server settings:

1. One settled Midtrans QRIS order backs **at most one** sale payment, and only at the amount Midtrans settled.
2. The settlement (and its amount) is persisted in the database from every trusted source: the signed webhook,
   the server's own status call to Midtrans, and the demo simulation. The volatile cache key goes away.
3. The simulation endpoint and the fake fallback QR only work when explicitly enabled for a sandbox demo.
4. No Midtrans key is baked into the code: an unset key disables charging, status checks and the webhook
   (a public demo key would let anyone forge a webhook signature).
5. The fee (QRIS MDR) and the provider name are computed on the server from `payment_provider_settings`; the
   client only says *which* provider. The settings screen edits the server table, not localStorage.

## Current state (verified in code, HEAD `8df80ca`)

- `CheckoutService::buildPayments` asks `MidtransQrisService::checkStatus($reference)` for `settlement|capture` and
  nothing else: no uniqueness, no amount comparison (`gross_amount` is ignored), and the status comes first from
  cache key `midtrans_sim_{orderId}` (2 h TTL).
- `POST /payment/qris/simulate/{orderId}` (permission `pos`) writes that cache key for any order id, any time.
- The webhook (`PaymentApiController::handleWebhook`, fd93b63) verifies `sha512(order_id.status_code.gross_amount.
  server_key)` correctly, **but** then calls `simulateSettlement()`, which stores only the word `settlement` in the
  cache: the signed `gross_amount` is dropped. So the webhook path does **not** record the amount we need.
- `config/midtrans.php` and the service constructor default the server key to `SB-Mid-server-TEST_KEY_DEMO_OMAHBAN`.
  `backend/.env` and `.env.example` set no Midtrans key, so every environment runs on that public string; the
  webhook signature is therefore forgeable by anyone who reads the repo.
- `createCharge` returns a fake EMV string (`is_fallback: true`) on any Midtrans error, in every environment.
- `fee_percentage` (0–10) and `provider_name` are taken from the request. `CheckoutModal` computes them from
  localStorage `ob3_store_settings.qris_providers` (fallback `INITIAL_QRIS_PROVIDERS`); the server table
  `payment_provider_settings` and its CRUD endpoints exist but no screen uses them.
- `PosAccounts::forMethod()` already chooses the account on the server: TUNAI → 1-1000, everything else → 1-1001.
  The client cannot pick an account; it only picks `TRANSFER` vs `TRANSFER_BCA`, which map to the same account.
- QRIS rows without a `reference` (static QRIS, every QRIS row inside a split) are not verified at all.

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | New table `qris_transactions` (one row per Midtrans order): `order_id` unique, `gross_amount`, `transaction_status` (`pending`/`settlement`), `settlement_source` (`WEBHOOK`/`STATUS_API`/`SIMULATION`), `settled_at`, `sale_payment_id` nullable **unique** FK. Charge creates the row (`pending`, requested amount); any trusted settlement marks it settled with the settled amount. Chosen over (a) a unique index on `sale_payments.reference` + amount in the cache (cache is volatile, the webhook result would vanish after 2 h, and existing duplicate references would block the index) and (b) calling Midtrans inside checkout (HTTP under row locks; still no single-use record). Cost if wrong: one extra table. | Ruling (writer) |
| D2 | Checkout claims a QRIS order with `lockForUpdate` on its row: it must exist, be settled, have `sale_payment_id` null, not appear twice in the same checkout, and `gross_amount` must equal the payment row amount (±0.001). After the `SalePayment` insert the row gets its `sale_payment_id`. The unique FK is the database backstop. Checkout no longer calls Midtrans. | Ruling (writer) |
| D3 | A claimed order is **never released**, also not by void (void does not refund Midtrans; a void + re-sale is re-entered as static QRIS). Cost if wrong: an owner who voids by mistake cannot reuse the dynamic order id; the redo is recorded as static QRIS instead. | Ruling (writer) |
| D4 | The webhook, after its existing signature check, calls `markSettled(order_id, gross_amount, 'WEBHOOK')`. `gross_amount` is covered by the signature, so it is trusted. Status polling (`checkStatus`) serves a settled row from the DB and otherwise asks Midtrans; a `settlement`/`capture` answer is recorded as `STATUS_API` with Midtrans' `gross_amount`. Settling is idempotent (first settlement wins). | Ruling (writer) |
| D5 | New config `midtrans.allow_simulation` = `MIDTRANS_ALLOW_SIMULATION` (default **false**) and always false when `MIDTRANS_IS_PRODUCTION=true`. `/payment/qris/simulate` returns **403** when off; when on it settles only an order created by `/charge`, at the charged amount, source `SIMULATION`. The fake fallback QR is returned only when simulation is on; otherwise a Midtrans failure is a 422. The charge response carries `simulation_enabled` so the POS hides the demo bar. Cost if wrong: a thesis demo needs one `.env` line. | Ruling (writer) |
| D6 | No default Midtrans keys (`server_key`/`client_key` default `''`). With an empty server key: charge fails (or falls back when simulation is on), status stays `pending` without an HTTP call, and the webhook is rejected (403) even with a "valid" signature. | Ruling (writer) |
| D7 | Checkout payment rows send `provider_id` (id in `payment_provider_settings`). `fee_percentage` becomes `prohibited` (422, a stale client must fail loudly rather than book a different fee); `provider_name` is no longer accepted and is copied from the provider row. | Ruling (writer) |
| D8 | QRIS rows **require** an active `qris` provider (the MDR depends on it); fee = `PaymentProviderSetting::calculateQrisFee($amount)` (existing: pct only when amount > threshold). Transfer rows may omit the provider; if given it must be an active `bank` provider. Transfers carry **no fee** (bank providers' fee fields are ignored). TUNAI ignores `provider_id`. | Ruling (writer) |
| D9 | **Payment account stays server-mapped to one bank account (1-1001)** for all transfer and QRIS rows. The COA and the reference system (`ProjectOmahBan`, `AccountingMapping/config/mapping.php`) have exactly one bank account, and the allocation file reserves no new account for SP6. The bank provider records which bank the money came through (audit text), not a ledger account. Cost if wrong: if OB3 really owns more bank accounts, a later migration adds COA accounts and an `account_code` column on `payment_provider_settings`; SP4 bank reconciliation would show those receipts as unmatched until then. | Ruling (writer) |
| D10 | Static QRIS (no `reference`) stays allowed as a cashier-attested payment: it is how a printed QRIS sticker settles, and there is no API to verify it. Its check is the SP4 bank reconciliation of 1-1001. Cost if wrong: a dishonest cashier can still record a fake static QRIS until reconciliation. | Ruling (writer) |
| D11 | The POS terminal loads providers from `GET /pos/payment-options`; the QRIS provider picker is shown for both dynamic and static QRIS (the dynamic flow used to charge the hidden default provider's MDR). The settings tab "Metode Pembayaran" edits `/settings/payment-providers` (create, blur-to-save rows, toggle, delete). `bank_providers`/`qris_providers` leave `StoreSettings`, `INITIAL_STORE_SETTINGS` and saved `ob3_store_settings` (stripped on load); `INITIAL_BANK_PROVIDERS`/`INITIAL_QRIS_PROVIDERS` are deleted. | Ruling (writer) |
| D12 | Dynamic QRIS order ids become `POS-{Date.now()}` (13 digits) instead of the last 8 digits, which repeat every ~27.8 h and would now collide with a used row. | Ruling (writer) |
| D13 | No journal, account, `reference_type` or permission changes (allocation: SP6 has none). | Allocation |
| D14 | Dropped by the DP/BON/EDC removal: EDC fee settings, EDC surcharge revenue 4-2000, QRIS DP verification and DP MDR (roadmap SP3 note). Also out of scope: client-sent `unit_price` (roadmap SP3/POS known issue 1, not in the SP6 list), refunds to Midtrans on void, persisting `expire`/`cancel` statuses (only settlements matter for posting). | Ruling (writer) |

## What changes, per layer

| Layer | Change |
|---|---|
| Config | `config/midtrans.php`: no default keys; `allow_simulation`. `backend/.env.example`: Midtrans block (keys empty, `MIDTRANS_ALLOW_SIMULATION=false`). |
| Database | Migration `2026_10_01_000001_create_qris_transactions_table` (additive). |
| Models | New `QrisTransaction` (`isSettled()`, `toStatusArray()`). `PaymentProviderSetting` unchanged (its `calculateQrisFee` is reused). |
| Services | `MidtransQrisService`: `createCharge` records the pending row; `checkStatus` DB-first then Midtrans (records settlement); `simulateSettlement` returns the settled `QrisTransaction`; new `markSettled(orderId, gross, source)`; fallback QR only with simulation on; cache removed. `CheckoutService`: provider lookup + server fee (`provider()`), QRIS claim (`claimQris()`), links `sale_payment_id`; `MidtransQrisService` dependency removed. |
| HTTP | `PaymentApiController`: simulate 403 unless enabled; webhook rejects empty key and records the signed amount; charge adds `simulation_enabled`. `PosCheckoutRequest`: `payments.*.provider_id` (nullable integer), `payments.*.fee_percentage` prohibited, `payments.*.provider_name` rule removed. Routes unchanged. |
| Frontend API | `paymentApi`: `getPaymentOptions`, `listProviders`, `createProvider`, `updateProvider`, `deleteProvider`; `QrisChargeResponse.simulation_enabled`. `posMappers`: `ApiPaymentProvider`, `mapPaymentProvider`; `PaymentPayload` has `provider_id`, no `fee_percentage`/`provider_name`. |
| Frontend UI | `CheckoutModal` (server providers, `provider_id` per row, picker in both QRIS modes, longer order id), `QrisDynamicModal` (demo bar only when `simulation_enabled`), `PosScreen` (stops passing `storeSettings` to the modal), `PaymentMethodsTab` (server CRUD), `App.tsx` (strips the two old settings keys), types, mock data. |

API shapes: `POST /payment/qris/charge` → previous fields + `simulation_enabled`. `GET /payment/qris/status/{id}` and
`POST /payment/qris/simulate/{id}` → `{order_id, transaction_status, payment_type, gross_amount?, settlement_time,
is_simulated}`. Checkout 422 messages (Indonesian): "Pembayaran QRIS belum diterima (status: …).", "Pembayaran QRIS
{order} sudah dipakai untuk nota lain.", "Nominal QRIS yang lunas (Rp …) tidak sama dengan nominal pembayaran QRIS
(Rp …).", "Pilih provider QRIS agar potongan MDR dihitung server.", "Provider pembayaran tidak ditemukan atau tidak
aktif.", validation "Persentase fee dihitung server dari pengaturan provider pembayaran. Muat ulang aplikasi kasir."

## Accounting impact

No new journal type, account or cash-flow classification. The only posting touched is `POS_SALE`
(`CheckoutService::postJournal`), whose lines are unchanged in shape:

- Dr 1-1000 (TUNAI) / Dr 1-1001 (TRANSFER, TRANSFER_BCA, QRIS) at each row's `net_received = amount − fee`
- Dr 6-1009 Beban MDR = Σ fee (now `calculateQrisFee` on the server provider row: `round(amount × pct / 100)` when
  `amount > fee_threshold_amount`, else 0)
- Dr 4-9000 discounts, Dr 5-1000 FIFO cost; Cr 4-1000 goods gross, Cr 4-1001 services gross, Cr 1-2000 FIFO cost.

Balance: Σ(net_received) + Σfee = Σamount = grand total = gross − discounts, so Dr = Cr exactly as before;
`AccountingEngine` still enforces it to the cent. `POS_SALE_VOID` mirrors the stored entry, unchanged.

What changes for the numbers: (1) the MDR expense and the bank debit now come from the owner's server settings, not
the browser, so the income statement's 6-1009 and the balance of 1-1001 are reproducible; (2) a dynamic QRIS receipt
can no longer be counted twice or at a wrong amount, so 1-1001 cannot be overstated by re-used settlements. Cash-flow
bucket: POS_SALE stays operating ("receipts from customers" net of MDR, as today). SAK EMKM presentation: unchanged
statements; the CALK (SP4) can state that bank receipts from QRIS are recognised at the settled amount net of MDR,
with MDR as an operating expense.

## Testing

Backend (MySQL testing DB, `DatabaseTransactions`; `MidtransQrisApiTest` gains the trait):
- Midtrans: charge records a pending row and returns `simulation_enabled`; status call records a Midtrans
  settlement once (second call served from DB, no HTTP); simulate is 403 when disabled, settles a charged order at
  its charged amount when enabled, 422 for an unknown order; charge without a server key is 422 unless simulation is
  on (then fallback); webhook records the signed amount (status then needs no HTTP), forged signature 403 with no row,
  empty server key 403.
- Checkout: fee from the server provider (0.7 % → 7 000; below threshold → 0, no 6-1009 line); client
  `fee_percentage` → 422 on `payments.0.fee_percentage`; QRIS without provider, with an inactive provider or with a
  bank provider → 422; transfer takes the provider name from the server and books 1-1001; QRIS reference unknown /
  pending → 422; settled → 201 and the row is linked to the new `sale_payments.id`; second sale with the same order
  → 422 "sudah dipakai" and stock unchanged; settled amount ≠ payment → 422; one order on two rows → 422; split and
  void tests use a provider with 0.5 % and threshold 0.
- End-to-end QRIS test: charge → simulate (enabled) → status settled.
Frontend (Vitest): `buildPayments` sends `provider_id` and never `fee_percentage`/`provider_name`; `mapPaymentProvider`
turns decimal strings into numbers; `INITIAL_STORE_SETTINGS` has no `bank_providers`/`qris_providers`.
Gates: `cd backend && php artisan config:clear && php artisan test`, `npm run lint && npm test`. Manual browser check
(owner, dev DB with `MIDTRANS_ALLOW_SIMULATION=true`): QRIS dynamic + simulate, reuse attempt rejected, settings edits
persist after reload.

## Risks

- **Stale browser bundle** sends `fee_percentage` → every checkout 422 until reload (intended, D7). Between plan tasks
  B3 and F1 the dev UI cannot check out; tests stay green.
- **Local demo without a Midtrans key**: after this change dynamic QRIS needs either real sandbox keys or
  `MIDTRANS_ALLOW_SIMULATION=true` in `backend/.env` (the user sets it; `.env` is not tracked). The handoff says so.
- **Sandbox keys + simulation on a deployed server** would still let a `pos` user settle a charged order without
  paying. Mitigated: default off, forced off in production mode, only charged orders at their charged amount.
- **Webhook unreachable on localhost**: settlement then relies on the POS polling `status` (records `STATUS_API`);
  if the cashier closes the QR modal before settlement, the next checkout attempt with that order still fails until a
  status call records it. Accepted (same as today).
- **Checkout fails after a dynamic QRIS settled**: the checkout modal keeps the settled order (`{orderId, amount}`,
  `src/modules/pos/settledQris.ts`) and reuses it on retry at the same total, with no new charge; a different
  selection shows a warning. It lives in component state only, so a page reload loses it and needs manual follow-up
  (refund the customer or record the sale by hand).
- **Settings tab mixes save models**: provider rows save to the server immediately, while the "Rekening Utama Nota"
  sub-tab still waits for the settings screen's Simpan button (receipt text only). A banner line says so.
- **Existing dev data**: old `sale_payments.reference` duplicates (if any) are untouched; the new table starts empty,
  so a QRIS order charged before the migration cannot be claimed (charge again).
