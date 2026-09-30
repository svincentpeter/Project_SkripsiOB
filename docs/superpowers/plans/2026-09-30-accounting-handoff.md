# Accounting Work — Handoff & Next Steps (2026-09-30)

Written at the end of Stage 4 so work can continue on another machine. The SDD ledger lived in the
git-ignored `.superpowers/` folder, so everything that matters from it is copied here.

Related: roadmap `docs/superpowers/specs/2026-09-29-accounting-roadmap.md`, Stage 4 spec
`docs/superpowers/specs/2026-09-29-accounting-server-stage4-design.md`, Stage 4 plan
`docs/superpowers/plans/2026-09-29-accounting-server-stage4.md`.

## 1. State at handoff

- Stage 4 (sub-project 1 of the roadmap) is **implemented, reviewed and pushed**: tasks A1–A7, B1–B7, C1,
  plus a final-review fix wave (commits `590e3b0..b220424`).
- Gates at push time: backend `composer test` 188/188, frontend `npm run lint` clean, `npm test` 123/123.
- Browser check (owner, dev DB, after B7): journals, ledger, trial balance ("Seimbang"), statements
  (balance sheet "Seimbang", cash flow "Terekonsiliasi") and the Biaya screen load from the server with no
  console errors. It was run before the final fix wave; re-check after setup (step 2.3).

## 2. First steps on the new machine

1. `git pull`, then `npm install` and `cd backend && composer install`.
2. Laragon MySQL must be running. Migrate both databases:
   `cd backend && php artisan migrate` and
   `DB_DATABASE=project-skripsi_ob_testing php artisan migrate --force` (PowerShell:
   `$env:DB_DATABASE='project-skripsi_ob_testing'; php artisan migrate --force`).
   New Stage 4 migrations: `2026_09_29_000001_harden_journal_entries_and_add_period_closings`,
   `2026_09_29_000002_add_void_audit_to_expenses_and_seed_categories`.
3. Run the gates (`composer test`, `npm run lint && npm test`), then open the app as owner and repeat the
   browser check from section 1.
4. **Enter the account opening balances once** (Buku Besar → "Saldo Awal"): cash drawer 1-1000, bank 1-1001,
   fixed assets 1-3000, accumulated depreciation 1-3999, retained earnings 3-2000. Until then bank 1-1001 shows
   negative (a supplier was paid from bank before any opening balance existed).

Not in git (only on the old machine — copy them yourself if you need them):
- Uncommitted purchase-invoice calculator: `src/services/purchaseInvoiceService.ts`, its test, and the
  modified `src/modules/inventory/components/GoodsReceiptModal.tsx`.
- `docs/flowchart/`, `docs/flowchart.zip`, `.claude/`.

## 2b. Stage 4 leftover (do first)

- [ ] **Scoped re-review of the final fix wave** (`a6e1d5b..b220424`, findings F1–F7 in section 4). The
  implementation and tests are done; the re-review was cut off when the session ended. Check in particular the
  implementer's extras: a Rp 0 TEMPO goods receipt is stored as LUNAS; voiding a Rp 0 nota succeeds with no
  reversal journal; the "Laporan Keuangan" shortcut is hidden from roles without `financial_reports`.
- [ ] Fix the purchase-invoice calculator before committing it (roadmap "Separate small fix"): send the
  invoice total, book 2-1000 at that total, absorb rounding in the batch cost, store DPP/PPN.

## 3. Next sub-projects (each: brainstorm → spec → plan → implement)

In roadmap order; details and file references are in the roadmap.

| # | Sub-project | Core scope |
|---|---|---|
| 2 | Cash & bank | Cashier shift open/close with counted cash and required variance reason, variance journal (new over/short account), cash→bank deposit, owner drawings (new Prive account), capital injection; replace the `ob3_cash_drawer` counter with the 1-1000 ledger balance |
| 3 | Transaction corrections | Partial sales return, purchase return / goods-receipt cancel, bad-debt write-off, DP forfeit, FIFO shortfall fallback, manual POS line cost, one-shot inventory opening balance, Excel import vs purchase, date validation for voids/payments |
| 4 | SAK EMKM completeness | Fixed asset register + monthly straight-line depreciation (new expense account), real CALK in UI/export, PPh Final 0.5% (confirm scope with supervisor), accruals/prepayments |
| 5 | Operational reports & dashboard | Daily cash report, daily recap, per-cashier recap; dashboard figures from server reports (fix VOID/all-month expense totals, FIFO value, UTC "today") |
| 6 | Payment hardening | Unique QRIS reference + amount check, gate `/payment/qris/simulate` to dev, server-side fee % and payment account |

## 4. Decisions made during Stage 4 (rulings)

Each with its cost if wrong. Revisit any you disagree with.

- Worked directly on `main` (repo convention). Cost: history on main, revertable per commit.
- Test helpers named `post()` renamed (`postJournal`/`postEntry`) — collides with Laravel `TestCase::post()`.
- Subagent commits carry the implementing model in the `Co-Authored-By` trailer. Cost: cosmetic.
- Period close/reopen serialized with `lockForUpdate` on account 3-2000; opening balance on 3-1000
  (both were race conditions in the plan's code).
- Expense attachment stored after the journal posts and deleted if the transaction fails.
- Expense list loads the newest 500 only (no paging UI). Cost: older expenses not listed on the Biaya screen;
  journals and reports still include them.
- Per-task browser checks replaced by one consolidated check after B7.
- Report tabs got a full ARIA tabs pattern; cash-flow load failure shown in its KPI card.
- Expense detail modal reads the live record (no fake "Supervisor" fallback).
- `backend/AGENTS.md` updated (timezone Asia/Jakarta; no frontend COA copy).
- Final-review fix wave:
  - F1 cash balances refreshed only for roles that can read them (no 403 noise for KASIR/GUDANG).
  - F2 roles with `accounts_payable` but no `accounting_hub` see a payables/receivables-only ledger screen.
  - F3 Rp 0 sales and goods receipts post no journal (engine's ≥2 non-zero lines rule kept).
  - F4 `ACCOUNT_OPENING` is excluded from cash-flow buckets; its cash counts as beginning cash.
  - F5 bank-balance limit on expenses only enforced when the balance is positive.
  - F6 manual journal account picker hides inactive accounts.
  - F7 docs gotchas corrected (mock data; remaining `toISOString()` users listed as a known issue).

## 5. Deferred minors (can wait; from task and final reviews)

- `PeriodLock::assertOpen` runs before the posting transaction (rare TOCTOU vs a concurrent close).
- `financialStatements()` recomputes balances ~3× (speed only).
- `AccountBalance::signed()` does not validate its side argument.
- Zero-activity period close untested; closing record lacks the reopen entry number.
- `GET /expenses/{id}` untested.
- Type hygiene in `accountingMappers` (optional `ApiJournal.id`, unchecked category cast).
- `useServerData` blanks data on reload error; journal page not reset after posting; ledger header shows no
  error when its loads fail; reopen button has no busy state.
- Print modal reuses id `a4-invoice-printable`; negative section subtotals not colored.
- Dead legacy exports in `supabaseDataService.ts`.
- POS void reversal is not linked via `reversal_of_id` (no "Dibalik oleh" on voided sales).
- Older screens still use `toISOString()` for default dates (CheckoutModal, BookingDpModal, PayDebtModal,
  AccountsReceivableTab, posService, inventoryService, dashboard, export registry) — wrong day before 07:00 WIB.
- Dashboard expense total includes VOID and all months (sub-project 5).
