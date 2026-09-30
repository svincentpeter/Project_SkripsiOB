# Cash & Bank: Cashier Shifts, Drawer Ledger, Deposits, Prive and Capital (design)

Date: 2026-09-30. Roadmap sub-project 2 (`docs/superpowers/specs/2026-09-29-accounting-roadmap.md`).
Plan: `docs/superpowers/plans/2026-09-30-cash-and-bank.md`. Executes after SP6 (payment hardening) and before SP3.
Binding inputs: `.superpowers/sdd/user-decisions-2026-09-30.md`, `.superpowers/sdd/roadmap-allocation.md`.

## Goal

The cash drawer becomes a server-side, journal-backed concept:

1. **Cashier shift** (`cash_sessions`): the cashier opens a shift by counting the opening float, closes it by
   counting the drawer; the server computes the expected cash, requires a reason when counted ≠ expected, and the
   shift waits in `PENDING_APPROVAL` until an OWNER-level approver approves it. On approval the difference is
   journaled to **6-1010 Selisih Kas Kasir**, so afterwards the 1-1000 balance equals the counted cash.
2. **Owner cash movements**: cash-to-bank deposit (1-1000 → 1-1001), owner drawings (Dr **3-3000 Prive**) and capital
   injection (Cr 3-1000), each a balanced journal.
3. **The per-browser counter `ob3_cash_drawer` is removed.** Every screen that showed "Kas Laci" shows the 1-1000
   ledger balance from `GET /accounting/cash-balances`.
4. **SAK EMKM presentation of Prive**: the statement of changes in equity shows drawings as a separate deduction.

Reference rules mirrored from `ProjectOmahBan/app/Services/CashClosing/CashSessionSummaryService.php` and
`CashSessionController`: only cash (TUNAI) touches the drawer; expected = opening float + cash in − cash out; a
variance reason is required when the count differs; a supervisor approves the closing. Unlike the reference, the
variance is journaled (roadmap requirement).

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | A closed shift stays `PENDING_APPROVAL` until approved; the variance journal is posted **on approval** to 6-1010. There is no reject/reopen: a wrong count is corrected afterwards with a manual journal (1-1000 and 6-1010 are not control accounts). Cost if wrong: owner wants a "reject and recount" loop → add a `REJECTED` status that reopens the shift. | User (binding) + Ruling (writer) for no-reject |
| D2 | Closing requires `variance_reason` when counted ≠ expected (to the cent). | User (binding), reference `CashSessionController::close` |
| D3 | The drawer **is** account 1-1000. Only TUNAI posts to 1-1000 (`PosAccounts::forMethod`), so "only TUNAI touches the drawer" holds by construction; TRANSFER/QRIS go to 1-1001 and never appear in a shift. | Reference rule, verified in code |
| D4 | **Expected cash = opening_float + Σ(debit − credit) on 1-1000 of every POSTED journal inside the shift window**, excluding `CASH_SESSION_VARIANCE`, broken down per `reference_type` (lines like the reference's `lines`). This is a superset of the allocation formula (TUNAI net received − SP3 cash refunds − drawer expenses): it also counts cash-sale voids, TUNAI goods receipts, supplier payments from the drawer, deposits, drawings/capital through the drawer and manual journals on 1-1000. Cost if wrong: a 1-1000 movement the owner considers "outside the drawer" (e.g. a safe) inflates the expected cash; the fix would be a separate cash account for the safe. | Allocation (formula) + Ruling (writer) for the ledger-based superset |
| D5 | The shift window is a **journal-id watermark**: `from_entry_id` = max(journal_entries.id) at open (exclusive), `to_entry_id` = max id at close (inclusive). Not timestamps (same-second open/close is common in tests and handovers). Cost if wrong: a journal whose id was assigned before the close but committed after it belongs to no shift; it is still in the ledger and therefore in the next shift's book balance (D6), so nothing is lost, only mis-attributed. | Ruling (writer) |
| D6 | The cashier types the counted **opening float**, prefilled with the **book balance** = 1-1000 ledger balance + Σ adjustments of shifts still `PENDING_APPROVAL`. If the float differs from the book balance, `opening_note` is required. The book balance at open is stored (`book_opening`). Cost if wrong: the cashier just accepts the prefill without counting; mitigated by the note rule and the owner's approval review. | Ruling (writer) |
| D7 | **Approval journal amount (`adjustment`) = counted − (book_opening + movements) = variance + (opening_float − book_opening).** Folding the opening difference into the approval journal keeps the invariant "after approval, 1-1000 = cash counted" even when money disappeared between shifts or the first shift starts before the opening balance is entered. `variance` (shown to the cashier, reason required) stays counted − expected. | Ruling (writer) |
| D8 | Variance journal: shortage Dr 6-1010 / Cr 1-1000; overage Dr 1-1000 / Cr 6-1010; `reference_type` `CASH_SESSION_VARIANCE`, `reference_id` `SHIFT-{id}`, **dated the approval day** (today is never inside a closed period). Adjustment 0 → no journal. Cost if wrong: a shift closed on the 30th and approved on the 1st lands in the next month; the alternative (closing date) can be refused by the period lock. | Allocation (ref type) + Ruling (writer) for the date |
| D9 | One account for over and short: 6-1010 (EXPENSE, normal DEBIT). An overage makes it net-credit, shown as a negative operating expense. | Allocation |
| D10 | Only one `OPEN` shift at a time (one drawer, branch 3). Any user with `cash_session` may close the open shift (handover). Open/close/approve serialize on a `lockForUpdate()` of the 1-1000 account row (same pattern as period closing on 3-2000). | Allocation + Ruling (writer) |
| D11 | Checkout with **any TUNAI payment requires an `OPEN` shift** (422 "Shift kasir belum dibuka…"); transfer/QRIS-only sales do not. Expenses, goods receipts, supplier payments and cash movements do **not** require a shift: they fall in the current window or, between shifts, in the next book balance (D6). SP3's cash refund also requires an open shift via `CashSessionService::requireOpen()`. | Allocation + Ruling (writer) for the non-POS paths |
| D12 | Approval needs `cash_session_approve` (OWNER only by default). A non-OWNER approver cannot approve a shift they opened (segregation of duties); the OWNER may approve their own. | Allocation + Ruling (writer) |
| D13 | Cash movements have **no table**: each is one journal, numbered `KAS-YYYYMM-####` with `DocumentNumber::next(JournalEntry::class, 'reference_id', 'KAS', $date)` (the `MEMO` pattern of manual journals). `DEPOSIT` 1-1000 → 1-1001; `DRAWING` Dr 3-3000 / Cr 1-1000 or 1-1001; `CAPITAL` Dr 1-1000 or 1-1001 / Cr 3-1000. Date ≤ today, period lock enforced by the engine. No void (correct with a manual journal); no server balance check (same as expenses). Cost if wrong: owner wants a movement register with attachments → add a table later. | Allocation (types, accounts) + Ruling (writer) |
| D14 | `ob3_cash_drawer` is deleted (state, `localStorage` write, all `setCashInDrawer` adjustments) and removed from storage on load. "Kas Laci" everywhere = `cashBalances['1-1000']`. `GET /accounting/cash-balances` additionally allows `cash_session`, so the cashier's POS shows the drawer balance. Roles without any of `expenses`, `accounting_hub`, `financial_reports`, `cash_session` see no drawer chip. Cost if wrong: a KASIR can read the bank balance through the API (not shown in the UI). | Allocation + Ruling (writer) |
| D15 | The expense form blocks a cash expense above the drawer balance **only when that balance is positive**, the same rule as the bank (Stage 4 fix F5); before the opening balance is entered 1-1000 is 0 and would block every cash expense. | Ruling (writer) |
| D16 | Statement of changes in equity gets `owner_drawings` (period movement of debit-normal equity accounts, i.e. 3-3000); `owner_contributions` keeps the credit-normal equity accounts. The balance sheet needs no change (3-3000 appears as a negative equity line). Period closing does not touch 3-3000 (it closes REVENUE/EXPENSE only); Prive stays a cumulative contra-equity line. | Ruling (writer) |
| D17 | Permission keys exactly as allocated: `cash_session` (KASIR true, GUDANG false), `cash_session_approve` and `cash_movement` (false for both). Added to `Permissions::KEYS/DEFAULTS`, a migration (insert-if-missing rows), `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`, `RolePermissionsTab`. | Allocation |
| D18 | UI: the POS header drawer chip becomes a **shift control** (open/close modal). Approvals and cash movements live in a new Buku Besar tab **"6. Kas & Bank"**, visible with `cash_session_approve` or `cash_movement`. Journal screen gets a filter group "Kas & Modal" with the four new types. | Ruling (writer) |
| D19 | Interfaces for later sub-projects: `CashSessionService::requireOpen(): CashSession`, `CashSessionService::summary(CashSession): array`, `CashSessionService::LINE_LABELS` (SP3 adds `'SALES_RETURN' => 'Retur penjualan tunai'`; refunds credited to 1-1000 are counted automatically by D4). | Allocation |

### Dropped or not built (and why)

- Anything about BON receivable collections, DP deposits or EDC settlements in the drawer: moot since the
  2026-09-30 DP/BON/EDC removal (only POS_SALE/POS_SALE_VOID remain on the POS side).
- Per-cashier drawers and the reference's per-cashier/per-date filter: OB3 has one drawer; the window rule (D5)
  replaces it.
- Denomination count sheet, shift document numbers, reject/recount workflow (D1), bank → drawer transfer (owner can
  post it as a manual journal Dr 1-1000 / Cr 1-1001; neither is a control account).
- The Settings "Saldo Awal Kas Laci" store setting (`initial_cash_drawer`) is not read anywhere and is left as is;
  the opening balance screen (Buku Besar → Saldo Awal) is the real source.
- PPh Final 0.5%: skipped by user decision.

## What changes, per layer

| Layer | Change |
|---|---|
| Database | Migration `2026_10_02_000001_create_cash_sessions_and_cash_accounts`: table `cash_sessions` (id, user_id FK, opened_at, opening_float, book_opening, opening_note, from_entry_id, to_entry_id, closed_at, closed_by FK, expected_cash, counted_cash, variance, variance_reason, status `OPEN`/`PENDING_APPROVAL`/`CLOSED`, approved_by FK, approved_at, journal_entry_id FK, branch_id 3, timestamps); accounts 3-3000, 6-1010 insert-if-missing; `role_permissions` rows for the three keys insert-if-missing. |
| COA | `AccountCoaSeeder` gains 3-3000 Prive Pemilik (EQUITY, DEBIT) and 6-1010 Selisih Kas Kasir (Lebih/Kurang) (EXPENSE, DEBIT). 27 accounts. |
| Model | `App\Models\CashSession` (constants `OPEN`, `PENDING`, `CLOSED`; `openingDifference()`, `adjustment()`, `toApiArray()`). |
| Services | `Accounting\CashSessionService` (`requireOpen`, `current`, `ledgerBalance`, `bookBalance`, `summary`, `open`, `close`, `approve`, `LINE_LABELS`); `Accounting\CashMovementService` (`create`, `TYPES`). `Pos\CheckoutService::checkout` calls `CashSessionService::requireOpen()` when a TUNAI payment is present. `FinancialReportService::equityChanges` adds `owner_drawings`. |
| Routes | `GET cash-sessions/current` (`cash_session`, `cash_session_approve`); `POST cash-sessions/open`, `POST cash-sessions/{id}/close` (`cash_session`); `GET cash-sessions`, `POST cash-sessions/{id}/approve` (`cash_session_approve`); `GET/POST cash-movements` (`cash_movement`); `GET accounting/cash-balances` adds `cash_session`. |
| Permissions | `Permissions::KEYS` + 3 keys (16 total); KASIR default adds `cash_session`. |
| Frontend API | `src/services/api/cashApi.ts` (`cashApi.current/sessions/open/close/approve/movements/createMovement`, wire types). |
| Frontend POS | `CashShiftControl` replaces the "Kas Laci" chip in `PosScreen` (props `cashInDrawer: number \| null`, `canUseCashSession`). |
| Frontend shell | `App.tsx`: counter state, storage write, `cashPortion` and every `setCashInDrawer` removed; `canReadCash`; drawer = `cashBalances['1-1000']`; `ob3_cash_drawer` removed on load. `HeaderNavbar` hides the chip when the value is `null`. `ExpenseForm` rule D15. Help texts in `WireframeGuideModal` describe open/close shift. |
| Frontend accounting | `CashBankTab` (shift list + approve; movement form + list) as tab `cash` in `GeneralLedgerScreen`; `JournalTab` group "Kas & Modal" and badges; `EquityChangesTable` and export registry show "Prive (pengambilan pemilik)". |
| Settings | `RolePermissionsTab` lists the three keys; `DEFAULT_ROLE_PERMISSIONS` has 16 keys. |

## Accounting impact

Every posting goes through `JournalDraft` → `AccountingEngine::createEntry` (Σdebit = Σcredit to the cent).

| Event | Debit | Credit | reference_type / id | Cash-flow bucket | SAK EMKM presentation |
|---|---|---|---|---|---|
| Shift approved, shortage | 6-1010 | 1-1000 | `CASH_SESSION_VARIANCE` / `SHIFT-{id}` | Operating → expenses (EXPENSE account) | Laba Rugi: beban usaha "Selisih Kas Kasir" |
| Shift approved, overage | 1-1000 | 6-1010 | same | Operating → expenses (inflow, reduces the bucket) | Negative beban usaha line (net credit) |
| Cash-to-bank deposit | 1-1001 | 1-1000 | `CASH_DEPOSIT` / `KAS-YYYYMM-####` | None: both lines are cash accounts, so no non-cash line is bucketed and total cash is unchanged (already covered by `CashFlowReportTest`) | Posisi Keuangan: moves between two current-asset lines |
| Owner drawing | 3-3000 | 1-1000 or 1-1001 | `OWNER_DRAWING` / `KAS-…` | Financing → "Setoran / (penarikan) modal pemilik" (EQUITY bucket), outflow | Perubahan Ekuitas: "Prive (pengambilan pemilik)" deduction (`owner_drawings`); Posisi Keuangan: 3-3000 as a negative equity line |
| Capital injection | 1-1000 or 1-1001 | 3-1000 | `CAPITAL_INJECTION` / `KAS-…` | Financing, inflow | Perubahan Ekuitas: "Setoran modal & saldo awal" (`owner_contributions`); Posisi Keuangan: 3-1000 |

Each entry balances by construction (one debit line and one credit line of the same rounded amount; the variance
journal is skipped when the amount rounds to 0). `CashFlowReport::bucket()` needs no change: 6-1010 is EXPENSE and
3-3000/3-1000 are EQUITY; the reconciliation (`is_reconciled`) keeps holding because every new journal touching cash
is attributed line by line. `LedgerBalances`/`FinancialReportService` classify from `account_type`/`normal_balance`,
so both new accounts appear in the trial balance, income statement and balance sheet without code changes; only
`equityChanges` changes (D16) so that `opening + contributions − drawings + net income = closing` (`difference` 0).

Invariant after every approval (tested): **1-1000 ledger balance = counted cash of the last approved shift + later
movements**. Shifts do not create revenue or cost; they only true up the drawer.

## Testing

Backend (PHPUnit, `DatabaseTransactions`, MySQL testing DB):
- `CashSessionTest`: accounts and permission defaults; TUNAI checkout without shift → 422 and no stock movement,
  transfer checkout without shift → 201; opening note required when float ≠ book balance; only one open shift;
  expected cash counts cash sales and drawer expenses of the window only (not transfer sales/expenses, not
  pre-shift expenses); close requires a reason for a variance and leaves `PENDING_APPROVAL`; approval posts a
  shortage (Dr 6-1010) and makes 1-1000 = counted; overage + opening difference credit 6-1010 together; zero
  adjustment posts no journal; pending adjustments are in the next book balance; 403s for GUDANG/KASIR; non-OWNER
  approver cannot approve own shift; list shows pending first.
- `CashMovementTest`: deposit journal, number and no cash-flow change; drawing is financing and `owner_drawings`,
  equity `difference` 0, balance sheet 3-3000 line; capital injection is financing; validation (missing account,
  unknown type, future date); movement appears in the open shift summary and the list; 403 for KASIR/GUDANG.
- Existing: `UserPermissionTest` (16 keys), POS tests keep passing because `CreatesPosFixtures::checkout()` opens a
  shift when a TUNAI payment is sent.

Frontend (Vitest, node): `cashApi` sends the right method/path/body; default role permissions have 16 keys; the
equity export has a Prive row. `npm run lint && npm test`. Manual browser checklist in the docs task.

## Risks

- **Stale browsers** still run the old counter until reloaded; harmless (server authoritative), and the key is
  deleted on the next load.
- **Checkout friction**: a cashier who forgets to open a shift gets a 422 on cash sales (intended by the allocation).
- **Concurrency on the watermark** (D5): negligible for one shop; documented with a `ponytail:` comment.
- **Approval date** (D8) can move a variance into the next month.
- **Parallel plans**: SP6 edits `CheckoutService` and routes first; this plan's anchors are written against HEAD and
  the executor re-anchors on the current text (the guard goes at the top of the checkout transaction). SP3/SP4/SP5
  add permission keys to the same arrays after this plan.
- **Thesis docs** (`docs/SPESIFIKASI_…`, README) do not describe shifts; out of scope.
