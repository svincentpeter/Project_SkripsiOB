# Accounting Improvement Roadmap (audit 2026-09-29)

Audit of everything that touches accounting: frontend screens, backend engine and reports, every business event
that should produce a journal, and a comparison with the reference system `C:\laragon\www\ProjectOmahBan`.
The findings are grouped into six sub-projects. Each one gets its own spec → plan → implementation cycle.
Sub-project 1 is the foundation; the others depend on its server-side ledger, period lock and report API.

Severity: 🔴 critical, 🟠 high, 🟡 medium.

## Root cause

Server postings (POS, goods receipt, opname) balance. The accounting *screens*, however, compute every report
in the browser from localStorage `ob3_journals`: mock journals and mock opening balances mixed with whatever
server journals an action returned in the current session. Server journals are never fetched on load
(`loadPosData` in `src/App.tsx`), so reports differ per browser and are not defensible for the thesis.

## Sub-project 1 — Stage 4: server-authoritative accounting core  → spec `2026-09-29-accounting-server-stage4-design.md`

Findings addressed:
- 🔴 Reports are computed client-side from mock + session journals; journals never loaded from the server.
- 🔴 Closing journal dated *today* instead of period end (`accountingService.ts:454`), so the month's income
  statement shows Rp 0 after closing; closing covers all time; nothing locks a closed period.
- 🔴 Server statements hard-code account lists (`AccountingEngine.php:240-258`): 4-2000, 5-2000, 6-1009, 2-1004
  missing, `is_balanced` false once POS/opname/DP are used.
- 🔴 Manual journals may post to control accounts 1-2000, 1-1002, 2-1000, 2-1004 (breaks FIFO = ledger and
  subledger = control account).
- 🟠 Balance sheet loses earlier-period profit; `getBalance` drops wrong-side balances; no period filter on
  trial balance/statements; general ledger has no opening balance.
- 🟠 Cash flow statement does not reconcile to cash + bank (discounts, BON, DP, reversals; supplier payments
  classified as financing).
- 🟠 JRN/BKK numbering without lock; zero/negative/two-sided journal lines accepted; any posting date accepted.
- 🟠 Expense categories never seeded (`POST /expenses` always fails); voiding twice returns 500; bank-paid
  expense deducted twice on the client.
- 🟠 Frontend COA copy drifts from the backend (missing 5-2000, four names differ).
- 🟠 Storno can reverse server journals (POS, goods receipt) and the same journal more than once.
- 🟡 Server clock UTC while the shop runs WIB; periods hard-coded to 2026; fake authoriser names; status badges
  that ignore real results; 2-1004 missing from the displayed balance sheet.

## Sub-project 2 — Cash & bank

> Status: **done** — spec `2026-09-30-cash-and-bank-design.md`, plan `docs/superpowers/plans/2026-09-30-cash-and-bank.md`.

- 🔴 No cashier shift (open float, count, expected vs counted, variance reason, approval). `ob3_cash_drawer` is a
  per-browser counter (default 2,450,000) unrelated to the 1-1000 ledger balance and clamped at 0.
- 🟠 No server posting for cash-to-bank deposit (1-1000 ↔ 1-1001), owner drawings (needs a Prive account),
  capital injection, cash over/short (needs an account).
- Reference rules to mirror: only TUNAI touches the drawer; expected cash formula; variance reason required;
  supervisor approval (`app/Services/CashClosing/CashSessionSummaryService.php`). Journal the variance (the
  reference system does not).

## Sub-project 3 — Transaction corrections

→ spec `2026-09-30-transaction-corrections-design.md` — done (2026-09-30, commits `b8c5818` through `67ffe0b`,
interleaved with SP2 follow-ups and the first SP4 commits; the final fix wave is `f25e9d6`…`67ffe0b`), plan `docs/superpowers/plans/2026-09-30-transaction-corrections.md`.

- 🟠 No partial sales return (only full void); no purchase return / goods
  receipt cancellation (only opname, which leaves the payable standing).
  **Fixed:** `SalesReturnService` (cash refund, 4-9100, goods back to their batches) and `PurchaseReturnService`
  (payable first, then refund; cancel of an untouched receipt → `BATAL`).
- ~~🟠 No bad-debt write-off for 1-1002; booking DP cannot be forfeited to income; QRIS DP not verified, no MDR.~~
  Obsolete: BON and booking DP were removed on 2026-09-30 (`2026-09-30-remove-dp-bon-edc-design.md`).
- 🟠 FIFO shortfall fallback credits 1-2000 at `product_cost` without consuming batches
  (`FifoCostingService.php:92-105`); void restores only allocated batches.
  **Fixed:** a shortfall now rejects the sale (422); opname aligns the layers; void restores unallocated units as
  `VOID-…` batches.
- 🟠 Manual (non-catalogue) POS lines book revenue without cost of sales (`CheckoutService.php:91-94, 246`).
  **Fixed:** manual lines are services only (4-1001, no cost of sales).
- 🟡 Inventory opening-balance action can be re-run and silently books every FIFO/ledger gap to capital.
  **Fixed:** one-shot; the entry marks go-live.
- 🟡 Excel import/selective update books restocks as 5-2000/3-1000 instead of a purchase; batch cost edits never
  reach past cost of sales or the payable.
  **Fixed:** both stock rebuilds are refused after go-live; batch cost edits only on untouched batches.
- 🟡 Void/payment dates are not validated against the document date.
  **Fixed:** payment date ≤ today and ≥ invoice date; GR date ≤ today; voids, returns and cancellations are dated
  today and pass the engine's period lock.

## Sub-project 4 — SAK EMKM completeness  → spec `2026-09-30-sak-emkm-completeness-design.md` (done)

> Plan `docs/superpowers/plans/2026-09-30-sak-emkm-completeness.md`; commits `496d084` through the docs commit,
> interleaved with the SP3 final wave and SP5. Browser checklist (task M1) pending, run by the user.

- 🟠 Fixed asset register and monthly straight-line depreciation (new Beban Penyusutan account; reference:
  `Modules/AssetManagement/Services/DepreciationService.php`).
- 🟠 A real CALK (compliance statement, entity info, policies, breakdowns of inventory, fixed
  assets, payables) visible in the UI and in exports.
- 🟡 PPh Final UMKM 0.5% accrual — decided out of scope (user, 2026-09-30); stated in the CALK tax policy only.
- 🟡 Adjusting-entry workflow for accruals/prepayments; bank reconciliation.

## Sub-project 5 — Operational reports & dashboard  → spec `2026-09-30-operational-reports-design.md` (done)

> Plan `docs/superpowers/plans/2026-09-30-operational-reports.md`; commits `fd9607f`, `62122f0`, `b8644f9`+`61599dc`,
> `b55ecf2`, `7039cfa`, `55d2e32`, `502c7bb`, plus the docs commit (interleaved with the end of SP4). Browser
> checklist pending, run by the user (handoff section 1b).

- 🟠 Daily cash report and daily recap on a cash-received basis (reference: `ReportDailyCashApiController.php`,
  `DailyNotaGlobalService.php`); per-cashier recap.
- 🟠 Dashboard: "today" falls back to the last 3 sales; expenses include VOID and all months;
  "FIFO" value is qty × latest cost; UTC date; payment mix includes voided sales; hard-coded "95%+ margin".
  Source these from server reports instead.

## Sub-project 6 — Payment hardening — **done** (spec `2026-09-30-payment-hardening-design.md`, plan `2026-09-30-payment-hardening.md`)

- 🔴 One settled QRIS payment can back many sales (`sale_payments.reference` not unique, amount not compared).
- 🟠 `/payment/qris/simulate` not environment-gated; Midtrans demo key fallback.
- 🟡 Fee percentage and payment account chosen by the client; all non-cash methods booked to BCA (1-1001).

## Separate small fix (before committing current work)

The uncommitted purchase invoice calculator (`src/services/purchaseInvoiceService.ts`,
`GoodsReceiptModal.tsx`) sends only the rounded unit cost, so the payable is booked at qty × rounded cost
instead of the supplier invoice total (Rp 1 stays open forever), and DPP/PPN are not stored. Send the invoice
total and let the server book 2-1000 at that total, absorbing the rounding into the batch cost.
