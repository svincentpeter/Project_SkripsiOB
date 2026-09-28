# Stage 4 — Server-Authoritative Accounting Core (design)

Date: 2026-09-29. Sub-project 1 of `2026-09-29-accounting-roadmap.md`. Follows the stage pattern of
`2026-09-24-inventory-server-design.md`: the server posts journals and computes money; the frontend sends intent
and renders the server response; the local code path for the area is removed.

## Goal

Every accounting number the UI shows (journal list, general ledger, trial balance, income statement, balance
sheet, statement of changes in equity, cash flow) is computed by the Laravel API from the `journal_entries`
table, for any period the user picks. Expenses, manual journals, reversals, opening balances and period closing
are posted by the server. localStorage and mock data no longer hold accounting data.

## Non-goals (later sub-projects)

Cashier shifts and cash drawer vs 1-1000 (2), returns/write-offs/FIFO shortfall (3), depreciation and CALK
content (4), dashboard and daily reports (5), QRIS hardening (6). The local `ob3_cash_drawer` counter stays as is
in this stage.

## Decisions (defaults chosen without discussion — change here before implementation if needed)

| # | Decision | Default |
|---|---|---|
| D1 | Existing localStorage journals/expenses/balances/period | **Dropped.** They are mock or duplicated data. A one-time cleanup removes `ob3_journals`, `ob3_expenses`, `ob3_account_balances`, `ob3_period_info`. Real opening balances are entered once through the new opening-balance form. |
| D2 | Timezone | `config/app.php` timezone becomes `Asia/Jakarta` (overridable with `APP_TIMEZONE`). Business dates (`now()->toDateString()`) are WIB. |
| D3 | Closing model | Closing month M posts one `PERIOD_CLOSING` entry dated M's last day that zeroes the **cumulative** balance of every REVENUE/EXPENSE account as of that date into 3-2000. Everything dated ≤ that day is then locked. Skipped earlier months are swept in and locked too. Only months that have ended can be closed. |
| D4 | Reopen | OWNER only, only the most recently closed period, with a reason. Posts `PERIOD_REOPEN` (mirror of the closing entry, same date) and unlocks. |
| D5 | Control accounts | Manual journals may not touch 1-1002, 1-2000, 2-1000, 2-1004. These change only through their source documents. |
| D6 | Reversal (storno) | Only `MANUAL_ADJUSTMENT` entries can be reversed from the journal screen, once each. Other documents are corrected in their own module (void sale, void expense, …). |
| D7 | Opening balances | One `ACCOUNT_OPENING` entry, once, for accounts without a subledger: 1-1000, 1-1001, 1-3000, 1-3999, 3-2000. The difference goes to 3-1000 Modal. Receivables, inventory, payables and DP come from their documents (inventory already has its own `OPENING_BALANCE`). |
| D8 | Cash flow method | Direct method. Each journal that touches 1-1000/1-1001 attributes its non-cash lines (credit − debit) to a bucket, so the buckets always sum to the net cash change. |

## Posting engine rules (`AccountingEngine::createEntry`)

- Lines are rounded to cents. Zero lines are dropped. At least two non-zero lines remain. No negative amounts.
  No line carries both a debit and a credit. Σdebit = Σcredit to the cent (no 0.01 tolerance).
- The entry date must be after the lock date (`PeriodLock`), otherwise `PosRuleException` → 422.
- `entry_number` comes from `DocumentNumber::next(..., 'JRN', $date)`, locked and numbered by the month of the
  entry date. `DocumentNumber::next` gains an optional date argument; existing callers are unchanged.
- `created_by` = the authenticated user (nullable for console commands). `reversal_of_id` links a reversal to its
  original (unique, so an entry can be reversed at most once).
- `AccountingUnbalancedException` renders 422 instead of 500.
- The report methods move out of the engine into `App\Services\Accounting\*`.

New `reference_type` values: `PERIOD_CLOSING`, `PERIOD_REOPEN`, `MANUAL_REVERSAL`, `ACCOUNT_OPENING`.

## Data model (migration `2026_09_29_000001_accounting_stage4`)

- `journal_entries`: `created_by` (nullable FK users), `reversal_of_id` (nullable, unique, FK journal_entries).
- `accounting_period_closings`: `period` (YYYY-MM), `end_date`, `closing_entry_id` (nullable), `net_income`,
  `notes`, `closed_by`, `closed_at`, `reopened_at`, `reopened_by`, `reopen_reason`, `reopen_entry_id`.
  Lock date = max(`end_date`) where `reopened_at` is null.
- `expenses`: `void_reason`, `voided_by`, `voided_at`, `created_by`.
- `expense_categories`: seed the eight categories whose names equal the frontend `ExpenseCategory` strings,
  mapped to 6-1000…6-1008.

## Reports (`App\Services\Accounting`)

Balances come from one grouped query (`LedgerBalances::forRange($from, $to, $excludeClosing)`), then accounts are
classified from the COA, never from hard-coded lists:

| Section | Rule |
|---|---|
| Current assets | ASSET, code not `1-3…` |
| Fixed assets | ASSET, code `1-3…` (contra 1-3999 shown negative) |
| Liabilities | LIABILITY |
| Equity | EQUITY + "Laba periode berjalan (belum ditutup)" = cumulative REVENUE−EXPENSE as of the date |
| Revenue | REVENUE with normal CREDIT |
| Contra revenue | REVENUE with normal DEBIT (4-9000) |
| Cost of sales | EXPENSE, code `5-…` (5-1000, 5-2000) |
| Operating expenses | EXPENSE, other codes (6-…) |

- **Income statement** `[start, end]` excludes `PERIOD_CLOSING`/`PERIOD_REOPEN` entries, so closing never hides a
  month's result.
- **Balance sheet** as of `end` includes everything (closing entries move profit into 3-2000; the rest shows as
  unclosed earnings), so it always balances.
- **Changes in equity**: opening equity (as of the day before `start`), owner contributions (equity movements
  excluding closing entries), net income, closing equity, and the difference (must be 0).
- **Trial balance** as of a date; **general ledger** per account with the opening balance before `start`.
- **Cash flow** buckets: customers (REVENUE, 1-1002, 2-1004), suppliers & inventory (5-…, 1-2000, 2-1000),
  operating expenses (6-…), other operating, investing (1-3…), financing (EQUITY). Reports beginning, ending
  (split drawer/bank) and `is_reconciled`.

## API (all under `/api/v1`, bearer auth)

| Method & path | Permission | Notes |
|---|---|---|
| GET `accounts` | pos, inventory_view, accounting_hub, financial_reports, expenses | COA for pickers |
| GET `accounting/journals` | accounting_hub | `start_date,end_date,types (comma list),search,account_code,page,per_page≤100` |
| POST `accounting/journals/manual` | accounting_hub | `{date≤today, description, items[{account_code, debit, credit, note}]}` |
| POST `accounting/journals/{entryNumber}/reverse` | accounting_hub | `{reason}` |
| GET `accounting/general-ledger` | accounting_hub | `account_code, start_date, end_date` |
| GET `accounting/trial-balance` | accounting_hub | `as_of` |
| GET `accounting/financial-statements` | financial_reports, accounting_hub | `start_date, end_date` |
| GET `accounting/cash-flow` | financial_reports, accounting_hub | `start_date, end_date` |
| GET `accounting/cash-balances` | expenses, accounting_hub, financial_reports | `{1-1000, 1-1001}` as of today |
| GET `accounting/periods` | accounting_hub | lock date, closings, suggested period |
| POST `accounting/periods/close` | accounting_hub | `{period: YYYY-MM, notes}` |
| POST `accounting/periods/{period}/reopen` | accounting_hub + OWNER | `{reason}` |
| GET / POST `accounting/opening-balance` | accounting_hub | `{date, balances{code: amount}}` |
| GET `expense-categories`, GET/POST `expenses`, GET `expenses/{id}` | expenses | multipart create with optional `attachment` |
| POST `expenses/{id}/void` | expenses | `{reason}`; reversal linked to the original entry |

Journals are returned in the existing `toApiArray()` shape plus `id`, `reference_type`, `reversal_of`,
`reversed_by`, `can_reverse`, `created_by_name`.

## Frontend

- `accountingApi.ts` / `expenseApi.ts` become typed clients; `accountingMappers.ts` maps wire shapes to UI types.
- The accounting components fetch what they display through a small `useServerData` hook, keyed by the chosen
  period and a `ledgerVersion` counter from `App.tsx` that increments whenever a server action returns journals
  (replaces `mergeServerJournals`).
- A shared `PeriodPicker` (month / all / custom range) replaces every hard-coded 2026 date; dates are local (WIB).
- Balance sheet and income statement render the server sections generically, so every account shows and the rows
  always add up to the totals. The cash-flow tab, print modal and export registry use the new shapes.
- Journal tab: server-side filters (date range, type group, search) and pagination; storno only where
  `can_reverse`; no free-text authoriser (the server records the user).
- Period closing: pick a month, preview that month's income statement from the server, confirm. OWNER sees
  "Buka kembali" on the latest closing.
- Opening-balance form appears until an `ACCOUNT_OPENING` entry exists.
- Expenses load from and post to the server; the form drops the local BKK preview and the approver field. The
  bank balance shown comes from `accounting/cash-balances`.
- Removed: `src/services/accountingService.ts` (calculators, generators, `SAK_EMKM_COA` — the COA comes from
  `GET /accounts`), `generateExpenseJournal`, mock journals/balances/period/expenses/payables/receivables.

## Error handling

Business rule violations are 422 with an Indonesian `message` (`PosRuleException`, validation). The UI shows
them in a toast and keeps modals open. Report components show a loading state and an inline error with a retry
button; they never fall back to local data.

## Testing

Backend (`DatabaseTransactions`, isolated past dates such as 2020–2021 so leftovers from other tests do not
affect figures): engine rules, lock, numbering; income statement completeness (4-2000, 5-2000, 6-1009); balance
sheet balances with 2-1004 and unclosed earnings; ledger opening balance; equity changes reconcile; cash flow
reconciles, BON sale counts only the cash part, drawer→bank transfer nets to zero; closing/reopen/lock; manual
journal validation and control-account rejection; single reversal; opening balance once; expenses create/void,
double void 422, categories seeded; 403 for KASIR on every new endpoint.

Frontend (Vitest, node): `resolvePeriod`/`monthRange`, mappers (`mapTrialBalance`, `mapLedger`, `mapExpense`,
`expenseFormData`), export registry with the new shapes. `npm run lint && npm test`, `composer test`.

## Risks

- Strict balance (no 0.01 tolerance) could expose a latent rounding imbalance in an existing posting path. The
  full backend suite must pass; a failure means a real imbalance to fix at its source, not a reason to loosen
  the check.
- Switching the timezone changes the stored time of new rows; existing rows keep their UTC timestamps. Dates
  (`DATE` columns) are unaffected.
