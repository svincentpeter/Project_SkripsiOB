# Operational Reports & Dashboard (roadmap sub-project 5, design)

Date: 2026-09-30. Plan: `docs/superpowers/plans/2026-09-30-operational-reports.md`.
Roadmap: `docs/superpowers/specs/2026-09-29-accounting-roadmap.md` (sub-project 5). Shared rulings:
`.superpowers/sdd/roadmap-allocation.md`. Executes **last**, after SP6 → SP2 → SP3 → SP4.

## Goal

1. A **daily cash report** (Laporan Kas Harian) and a **daily recap** (Rekap Harian) on a cash-received basis, with a
   **per-cashier recap** and the **cashier shift summaries** of the day (SP2 `cash_sessions`).
2. The **executive dashboard** reads its money figures from those server reports instead of client state, fixing:
   "today" falling back to the last 3 sales, expenses that include VOID and every month, "FIFO" value computed as
   qty × latest cost, UTC dates, a payment mix that includes voided sales, and the hard-coded "95%+ margin" note.
3. The deferred known issue: remaining `toISOString()`-derived business dates are replaced by `localDate()` from
   `src/services/accountingPeriod.ts` (they give the previous day between 00:00 and 07:00 WIB).

SP5 posts **no journals**, adds **no accounts** and **no journal `reference_type`**. It only reads.

## Approaches considered

| Option | Summary | Verdict |
|---|---|---|
| A. Ledger for money, sales table for counts | Revenue, discounts, returns, HPP, expenses and cash movements are grouped per day from `journal_entries`/`journal_items`; the sales table supplies nota counts, tyre units, payment-method mix and per-nota/per-cashier detail. | **Chosen.** Σ recap = Laba Rugi and cash movements = change in 1-1000/1-1001 by construction (defensible for the thesis). SP2/SP3/SP4 postings (variance, deposits, prive, returns, depreciation, bank recon) appear automatically without depending on their tables' columns. |
| B. Sales/expense tables only (reference system `ReportDailyCashApiController`) | Sum `sale_payments`, `expenses`, and SP3 `sales_returns` per day. | Rejected: does not reconcile with the ledger when a void or expense void happens on a later day; needs SP3 column names that the allocation file does not list; misses SP2/SP4 cash postings. |
| C. Call `FinancialReportService::incomeStatement()` once per day | Reuse the whole report per day. | Rejected: 30–92 grouped queries per request, and no cash side. |

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Money figures come from POSTED journals grouped by `entry_date`, excluding `PERIOD_CLOSING`/`PERIOD_REOPEN` (`LedgerBalances::CLOSING_TYPES`). Each account line is classified with `FinancialReportService::incomeSection()` (made public), so a recap row has exactly the income-statement sections: revenue, contra revenue, cost of sales (`5-…`), operating expenses. Σ rows over a range = the income statement for that range. Cost if wrong: none for correctness; bank interest 4-3000 (SP4) counts in "revenue" exactly as it does in Laba Rugi. | Ruling (writer) |
| D2 | Counts and mix come from the sales table: `sales_count`, `product_qty` (PRODUCT lines only, i.e. tyres) and `payment_mix` use notas **dated that day whose status is not VOID**; `payment_mix` groups `TRANSFER` + `TRANSFER_BCA` as `TRANSFER`. Cost if wrong: when a sale is voided on a later day, its money reverses on the void date (ledger) while its count disappears from the sale date, so the AOV of that day is slightly off. Accepted: voids are almost always same-day. | Ruling (writer) |
| D3 | Sales returns (SP3) are read only through the ledger: 4-9100 (contra revenue, also reported separately as `returns`), the `SALES_RETURN` cash credit to 1-1000, and the 5-1000 reversal. No dependency on `sales_returns` columns (not listed in the allocation file). Refunds are therefore not attributed per cashier; the SP2 session's `expected_cash` already subtracts them. Cost if wrong: owner wanting refund-per-cashier needs a follow-up once SP3's columns are known. | Ruling (writer), allocation interfaces |
| D4 | Cash-received basis = debits/credits of 1-1000 and 1-1001 per day, grouped by `reference_type`. `ACCOUNT_OPENING` is not a movement: when dated on the report day its amount is added to the opening balance (same rule as `CashFlowReport`). Opening + in − out = closing per account, by construction. | Ruling (writer) |
| D5 | Two read-only endpoints under `/api/v1/reports/daily-*`: `GET /reports/daily-recap?from&to` (permission `dashboard,financial_reports`) and `GET /reports/daily-cash?date` (permission `daily_reports`). The per-cashier recap and the shift summaries are sections of `daily-cash`, not separate endpoints. Cost if wrong: one more endpoint later. | Ruling (writer), allocation |
| D6 | `daily-cash` has two scopes. OWNER or a role with `financial_reports` gets the whole store. Anyone else (KASIR by default) gets **their own** notas (`sales.cashier_name = user.name`), their own sessions (`cash_sessions.user_id`) and their own cashier row; the ledger sections (`summary`, `cash_accounts`, `cash_movements`, `expenses`) are `null`. Cost if wrong: a renamed user's older notas fall out of their own view (history keeps the old name). **Amended (task B3 review, commit `61599dc`):** own notas are matched by `sales.user_id = user.id` (new nullable FK, migration `2026_10_05_000002`, set by `CheckoutService`), because names are not unique; `sales.cashier_name = user.name` is only the fallback for legacy rows whose `user_id` is null. A renamed user therefore keeps their newer notas; `total_hpp` is `null` in the cashier scope. | Ruling (writer), allocation ("KASIR true for own recap"); amendment: controller ruling B3 |
| D7 | New permission key `daily_reports` (KASIR default true, GUDANG false), added to `Permissions::KEYS/DEFAULTS`, frontend `PermissionKey`/`DEFAULT_ROLE_PERMISSIONS`, `RolePermissionsTab`, and an additive migration `2026_10_05_000001_add_daily_reports_permission.php` (insert-if-missing; `down()` deletes the rows). | Allocation |
| D8 | `daily-recap` range is at most **92 days** (the reference system caps at 90); longer → 422 `PosRuleException`; `to < from` → 422 validation. Every day in the range is returned, zero days included, oldest first, plus `totals`. | Ruling (writer) |
| D9 | Shift summary = SP2 `cash_sessions` rows whose `opened_at` falls on the report day, shown with the stored `opening_float`, `expected_cash`, `counted_cash`, `variance`, `variance_reason`, `status` and the user's name. SP5 never recomputes expected cash (SP2 owns that formula). Only the columns listed in the allocation file are read. | Ruling (writer), allocation interfaces |
| D10 | The daily cash report's expense list shows non-VOID expenses dated that day. A later expense void appears as a `VOID_EXPENSE` cash movement on its own date. | Ruling (writer) |
| D11 | Dashboard: one `daily-recap` call for `min(first day of month, today − 6) … today` (local date) gives today's KPIs, the 7-day trend, month-to-date expenses, the payment mix and the goods/service split. FIFO value comes from the existing `GET /inventory/valuation` (`fifo_value`), already held in `App.tsx` as `inventoryValuation`; roles without `inventory_view` see "—". Low-stock lists keep using the server-loaded `products`. | Ruling (writer) |
| D12 | "Produk Ban Terlaris" and "Pangsa Merek" stay client-side (no product breakdown in the recap) but now use only this month's non-VOID notas. Cost if wrong: the app loads the newest 200 notas (`/pos/transactions` default), so a month with more notas is truncated; marked with a `ponytail:` comment. | Ruling (writer) |
| D13 | The hard-coded "95%+ margin" note is replaced by the month's real gross margin (gross profit ÷ net revenue from the recap). | Roadmap |
| D14 | New screen **"Laporan Harian"** (`ActiveScreen` `daily_reports`, gated by `daily_reports`) with tabs **Kas Harian** (date picker) and **Rekap Harian** (from/to; shown only with `dashboard` or `financial_reports`). KASIR reaches it from the header of Riwayat Struk. | Ruling (writer) |
| D15 | Exports: new registry reports `daily_cash` and `daily_recap` (xlsx, pdf). `dashboard_summary` is rebuilt from the server summary; its brand-share section is dropped (the data is not in the summary). | Ruling (writer) |
| D16 | `toISOString()` sweep: every business date derived from it is switched to `localDate()` (or `currentMonth()`): `PayDebtModal`, `LedgerPrintModal` (3 signature dates), `GoodsReceiptModal` (receipt + due date), `StockMonthlyLedgerView`, `stockMonthlyLedgerService`, `PosScreen` (parked-order number), `ThermalReceiptScreen` (date filters), `inventoryService` (3 places), the dashboard and the export registry. `CheckoutModal` and `posService` were already fixed (verified). Real instants stay ISO (`created_at`, QRIS `settlement_time`, `generated_at`, kop `generatedAt`). A Vitest guard fails if `toISOString()` is sliced to a date or month anywhere in `src/` outside tests. | Handoff deferred issue, verified in code |
| D17 | No new journal types, so nothing is added to `CashFlowReport` buckets or the journal screen filter groups. The daily cash report labels every known `reference_type` (including SP2/SP3/SP4 types from the allocation file) and falls back to the raw type. | Allocation |

### Dropped from the reference system (and why)

- BON receivables, DP cash, booking DP, old-invoice settlements: moot after the DP/BON/EDC removal.
- Online sales, trade-in, cashback/susuk, used-stock purchases: features the shop does not have.
- Daily "tutup buku" (`storeClosing`): SP2's cashier shift close with owner approval replaces it.
- Branch selection: single branch (`branch_id = 3`).
- Paginated "nota global" print layout: the export registry's PDF covers printing.

## What changes, per layer

| Layer | Change |
|---|---|
| Backend service | New `app/Services/Reports/DailyReportService.php`: `recap(from, to)` and `dailyCash(date, ?User $only)`. `FinancialReportService::incomeSection()` becomes `public static`. |
| Backend HTTP | New `DailyReportController` (`recap`, `cash`); routes `GET reports/daily-recap` (`permission:dashboard,financial_reports`), `GET reports/daily-cash` (`permission:daily_reports`). |
| Permissions | `daily_reports` in `Permissions::KEYS` and `DEFAULTS['KASIR']`; migration `2026_10_05_000001_add_daily_reports_permission.php`. |
| Frontend types/API | `PermissionKey` + `daily_reports`, `ActiveScreen` + `daily_reports`; `DailyRecapRow`, `DailyRecap`, `DailyCashReport` (+ parts), `DashboardSummary`, `PaymentGroup` in `src/shared/types`; `src/services/api/reportsApi.ts`. The server sends plain numbers, so no mapper. |
| Frontend helpers | `src/services/dailyReports.ts`: `dashboardRange`, `summarizeDashboard`, `sumRecapRows`, `cashMovementLabel`, `PAYMENT_GROUPS`. |
| Dashboard | `ExecutiveDashboardScreen` props lose `expenses`, gain `inventoryValuation` and `ledgerVersion`; KPIs, trend, expenses, FIFO value, payment mix, goods/service split and margin note read the recap; inline error + retry. |
| New screen | `src/modules/reports/DailyReportsScreen.tsx`; nav tab "Laporan Harian"; `App.tsx` render; screen gate in `authNavigationService`. |
| Settings | `RolePermissionsTab` row "Laporan Harian Kas & Rekap Kasir". |
| Exports | `daily_cash`, `daily_recap` mappers; `dashboard_summary` rebuilt. |
| Dates | `localDate()` sweep (D16) + guard test. |

### API shapes

`GET /api/v1/reports/daily-recap?from=YYYY-MM-DD&to=YYYY-MM-DD` →
`data: { from, to, rows: DailyRecapRow[], totals: DailyRecapRow without date }`, where a row is
`{ date, sales_count, product_qty, revenue, goods_revenue, service_revenue, contra_revenue, returns, net_revenue,
cost_of_sales, gross_profit, operating_expenses, net_income, payment_mix: {TUNAI, TRANSFER, QRIS}, cash_in, cash_out,
net_cash }`. `net_revenue = revenue − contra_revenue`, `gross_profit = net_revenue − cost_of_sales`,
`net_income = gross_profit − operating_expenses`, `net_cash = cash_in − cash_out`.

`GET /api/v1/reports/daily-cash?date=YYYY-MM-DD` (default today) →
`data: { date, scope: 'all'|'cashier', cashier, summary: DailyRecapRow|null, cash_accounts: [{code, name, opening,
cash_in, cash_out, closing}]|null, cash_movements: [{reference_type, cash_in, cash_out}]|null, sales: [{id, reference,
time, cashier_name, customer_name, vehicle_plate, total_amount, total_hpp, status, payments: [{method, amount,
fee_amount, net_received}]}], cashiers: [{cashier_name, sales_count, sales_total, void_count, void_total,
by_method: {TUNAI, TRANSFER, QRIS}}], expenses: [{reference, category, description, amount, payment_method}]|null,
cash_sessions: [{id, user_name, opened_at, closed_at, opening_float, expected_cash, counted_cash, variance,
variance_reason, status}] }`.

## Accounting impact

- **No journal is posted** by SP5; `AccountingEngine` is not called. No account, reference type, or cash-flow bucket
  changes.
- **Identities the reports guarantee** (tested):
  - Σ `daily-recap` rows `net_income` over a range = `FinancialReportService::incomeStatement(from, to)['net_income']`;
    the same holds for `net_revenue`, `cost_of_sales`, `operating_expenses` (same classification function, same
    closing-entry exclusion).
  - Per cash account on a day: `opening + cash_in − cash_out = closing`, where closing is the ledger balance of
    1-1000/1-1001 at the end of the day (`CashFlowReport::cashBalances`).
  - Σ `net_cash` over a range = change in (1-1000 + 1-1001) over the range, excluding `ACCOUNT_OPENING`.
- **How each journal type shows up** (examples; Dr/Cr are the posting services' own):
  - `POS_SALE` (Dr 1-1000/1-1001, Dr 6-1009, Dr 4-9000, Dr 5-1000 / Cr 4-1000, 4-1001, 1-2000): revenue, discount,
    HPP, MDR expense, cash in.
  - `POS_SALE_VOID` (mirror): negative revenue/HPP and cash out **on the void date**.
  - `SALES_RETURN` (SP3; Dr 4-9100, Cr 1-1000; Dr 1-2000, Cr 5-1000): `returns`/contra revenue, lower HPP, cash out.
  - `EXPENSE` / `VOID_EXPENSE` (Dr 6-… / Cr 1-1000 or 1-1001 and mirror): operating expenses and cash out/in.
  - `CASH_SESSION_VARIANCE` (SP2; 6-1010 vs 1-1000): operating expense and cash in/out.
  - `CASH_DEPOSIT` (SP2; Dr 1-1001, Cr 1-1000): cash in and cash out of the same amount (net 0).
  - `OWNER_DRAWING` / `CAPITAL_INJECTION` (SP2; 3-3000 / 3-1000): cash out / in, no income effect.
  - `DEPRECIATION`, `ADJUSTING_ENTRY`, `ADJUSTING_REVERSAL` (SP4): operating expenses (no cash).
  - `BANK_RECON_ADJUSTMENT` (SP4; 6-1012 / 4-3000 vs 1-1001): expense or revenue and bank cash out/in.
  - `PURCHASE` (TUNAI/TRANSFER_BCA), `DEBT_PAYMENT`, `PURCHASE_RETURN`, `GOODS_RECEIPT_CANCEL`: cash movements only.
- **Cash-flow bucket / SAK EMKM presentation:** unchanged. The daily reports are operational (management) reports, not
  SAK EMKM statements; they are derived from the same journals, so a month's recap agrees with that month's Laba Rugi
  and with the cash change in Laporan Arus Kas.

## Testing

Backend (`tests/Feature/DailyReportTest.php`, `DatabaseTransactions`, fixtures on unused 2020 dates, sales created
directly as models so no SP2 cash session is needed): recap reconciles with the income statement and the cash change;
discount, return (4-9100 `SALES_RETURN`), MDR and expense land in the right columns; counts and payment mix exclude a
VOID nota and group TRANSFER_BCA with TRANSFER; void on a later day reverses money on the void date; ACCOUNT_OPENING is
folded into the opening balance; opening + in − out = closing; movements grouped by type; per-cashier recap with void
count; non-VOID expenses only; SP2 shift rows listed; KASIR sees only own notas/sessions and `null` ledger sections;
GUDANG 403 on both, KASIR 403 on recap; range > 92 days and reversed range → 422. `UserPermissionTest` count +1.

Frontend (Vitest, node): `dashboardRange` crosses a month start; `summarizeDashboard` fills missing days, picks today,
sums only the current month; `cashMovementLabel` fallback; registry `dashboard_summary`, `daily_recap`, `daily_cash`
mappers; default permissions include `daily_reports` (KASIR true, GUDANG false); screen gate; guard test for
`toISOString()` date slicing. Gates: `cd backend && php artisan config:clear && php artisan test`,
`npm run lint && npm test`. A manual browser checklist ends the plan (D1 notes it for the controller).

## Risks

- **SP2 column drift:** the tests insert `cash_sessions` rows with only the allocation-file columns. If SP2's migration
  adds NOT NULL columns without defaults, the fixture must add them (the plan tells the implementer where to look).
- **Anchor drift:** SP2–SP4 edit `Permissions.php`, `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`,
  `RolePermissionsTab`, `App.tsx`, the export registry and its test (report count). The plan's edits name stable anchors
  and relative counts ("+1", "+2"); the implementer keeps whatever SP2–SP4 added.
- **Void on a later day** (D2) and **refunds not per cashier** (D3): documented limitations.
- **Top products truncated** at 200 loaded notas (D12).
- **Performance:** recap is 4 grouped queries regardless of range length; daily cash loads one day's notas with
  payments. Fine for one branch.
