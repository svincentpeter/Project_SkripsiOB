# SAK EMKM Completeness: Fixed Assets, CALK, Adjusting Entries, Bank Reconciliation (design)

Date: 2026-09-30. Roadmap sub-project 4. Plan: `docs/superpowers/plans/2026-09-30-sak-emkm-completeness.md`.
Executes after SP6 (payment hardening), SP2 (cash & bank) and SP3 (transaction corrections); SP5 runs after it.
Binding inputs: `.superpowers/sdd/user-decisions-2026-09-30.md`, `.superpowers/sdd/roadmap-allocation.md`.

## Goal

Close the four gaps that keep the ledger short of a defensible SAK EMKM set of statements:

1. **Fixed asset register + monthly straight-line depreciation.** Assets are recorded once (with their acquisition
   journal), depreciation is run per month, idempotently, and never into a closed period. Period close refuses a
   month whose depreciation has not been booked.
2. **A real CALK** (Catatan atas Laporan Keuangan): compliance statement, entity information, accounting policies
   (FIFO inventory, straight-line depreciation, revenue recognition, tax policy incl. PPh Final 0.5% as text only),
   and breakdowns of cash & bank, inventory, prepaid/accrued expenses, fixed assets, payables and equity. Served by
   `GET /api/v1/reports/calk?period=YYYY-MM`, shown in the Laporan Keuangan screen and in the report exports.
3. **Adjusting entries (AJP)** for accrued expenses (2-1100) and prepaid expenses used up (1-1100), with an optional
   automatic reversal dated the first day of the next month.
4. **Bank reconciliation for 1-1001**: statement lines entered by hand or imported from CSV, matched to ledger lines,
   bank charges (6-1012) and interest (4-3000) posted from unmatched lines, and a reconciliation report (screen + export).

## Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Scope is all four parts. PPh Final 0.5% is **not implemented**; the CALK tax policy states it and that tax paid is expensed to 6-1008 when paid. | User (binding) |
| D2 | New accounts exactly as allocated: 6-1011 Beban Penyusutan Aset Tetap, 1-1100 Beban Dibayar di Muka, 2-1100 Beban Yang Masih Harus Dibayar, 6-1012 Beban Administrasi Bank, 4-3000 Pendapatan Bunga Bank. One additive migration (`2026_10_04_000001`, insert-if-missing) + `AccountCoaSeeder`. | Allocation |
| D3 | All asset categories post to the existing 1-3000 (cost) / 1-3999 (accumulated). Categories (`PERALATAN_BENGKEL`, `INVENTARIS_TOKO`, `KENDARAAN`) are descriptive only (register and CALK grouping). No new 1-31xx..1-39xx accounts. Cost if wrong: one migration + a category→account map later. | Ruling (writer) |
| D4 | Permission keys `fixed_assets` and `bank_reconciliation` (KASIR/GUDANG false, OWNER always). Adjusting entries reuse `accounting_hub`. CALK uses `financial_reports,accounting_hub`. The ledger screen gate becomes `accounting_hub \|\| accounts_payable \|\| fixed_assets \|\| bank_reconciliation`, and each tab has its own gate. | Allocation + Ruling (writer) |
| D5 | Reference types: `DEPRECIATION`, `ADJUSTING_ENTRY`, `ADJUSTING_REVERSAL`, `BANK_RECON_ADJUSTMENT` (allocated) **plus** `FIXED_ASSET_ACQUISITION` and `FIXED_ASSET_VOID` (not in the allocation: an asset purchase is neither a goods receipt `PURCHASE` nor a manual journal, and the void needs a traceable mirror). Both names are SP4-only, so they cannot collide. Cost if wrong: rename two strings. | Ruling (writer) |
| D6 | **Acquisition funding:** `TUNAI` (Cr 1-1000), `TRANSFER` (Cr 1-1001) or `OPENING` (no journal: the cost is already in 1-3000/1-3999 through the account opening balance). No credit (TEMPO) purchase: 2-1000 is a sub-ledger of goods receipts. Cost if wrong: an asset bought on credit is entered as paid, or via a later extension. | Ruling (writer) |
| D7 | 1-3000 and 1-3999 become **control accounts**: manual journals reject them (backend `ManualJournalService::CONTROL_ACCOUNTS` + frontend picker), so register = ledger. The account opening balance may still post them. The register screen shows register vs ledger differences. Cost if wrong: an owner cannot hand-correct fixed assets; must void and re-enter. | Ruling (writer) |
| D8 | **No disposal/sale of assets in this sub-project.** It needs a gain/loss-on-disposal account that the allocation does not reserve. A wrongly entered asset can be **voided** only while no depreciation has been posted for it (mirror journal `FIXED_ASSET_VOID`, dated today, linked by `reversal_of_id`; OPENING assets just change status). Cost if wrong: a sold/scrapped asset keeps depreciating until a later sub-project adds disposal. | Ruling (writer) |
| D9 | **Depreciation formula:** straight line on base `B = cost − residual − opening_accumulated`, over `useful_life_months`, starting the month of `depreciation_start` (full-month convention; for purchases = acquisition month). Cumulative in cents: `expected(P) = min(B, floor(B × months_elapsed(P) / life))`; the amount booked for P is `expected(P) − already booked for periods ≤ P`. The last month absorbs rounding, so the total equals B exactly. For `OPENING` assets the user enters prior accumulated depreciation and the remaining life (prospective change in estimate). | Ruling (writer) |
| D10 | **Run per month:** `POST /accounting/fixed-assets/depreciation {period}` posts one `DEPRECIATION` journal dated the last day of P (Dr 6-1011 per asset, Cr 1-3999 total), reference `SUSUT-YYYY-MM`, and one `fixed_asset_depreciations` row per asset. Idempotent: a second run finds nothing pending and posts nothing (200 "Tidak ada penyusutan…"). Allowed for P ≤ current month. Rejected (422) when P is inside the locked range, or when the previous month is open and still has pending depreciation (runs are sequential so each month's expense lands in its own month). A month that is already locked is caught up in the first open month (catch-up is automatic in the cumulative formula). Serialised with `lockForUpdate` on the 1-3999 account row. | Ruling (writer) |
| D11 | **Period close requires depreciation:** `PeriodClosingService::close(P)` throws 422 when any active asset still has depreciation pending through P. Justification: SAK EMKM is accrual-based; closing locks P, so a forgotten run would push P's expense into a later month and misstate both months. With no assets there is no friction (pending is 0). Cost if wrong: a closing blocked until the owner runs depreciation (message says so). | Ruling (writer) |
| D12 | **Adjusting entries** via `POST /accounting/adjusting-entries {period, kind, account_code, amount, description, auto_reverse}`: `ACCRUAL` = Dr expense / Cr 2-1100; `PREPAID` = Dr expense / Cr 1-1100 (prepayment used up). Dated the last day of P, reference `AJP-YYYYMM-####`. `auto_reverse` is allowed only for `ACCRUAL` and **posts the reversal immediately**, dated the first day of P+1 (`ADJUSTING_REVERSAL`, same reference, `reversal_of_id`). No scheduler, no new table. Account must be an active `6-…` expense other than 6-1011 (depreciation only comes from the register). Paying a prepayment in advance (Dr 1-1100 / Cr cash) and settling an accrual without reversal (Dr 2-1100 / Cr cash) are ordinary manual journals; 1-1100 and 2-1100 are not control accounts. | Ruling (writer) |
| D13 | **Bank reconciliation data:** `bank_statement_lines` (signed amount: + into the bank, − out; `journal_item_id` unique nullable = matched ledger line) and `bank_reconciliations` (one row per period with the statement ending balance entered by the user). No stored reconciliation status: the report is computed live. | Allocation + Ruling (writer) |
| D14 | **CSV format:** header row with columns `tanggal`, `keterangan`, `jumlah` (any order, case-insensitive), delimiter `;` or `,` (detected from the header), UTF-8 BOM tolerated, dates `YYYY-MM-DD`, `DD/MM/YYYY` or `D/M/YYYY`, amount a plain signed number (`150000`, `-6500`, `1200.50`, no thousand separators), max 1000 rows, all-or-nothing with the row number in the 422 message. Rows identical (date, description, amount) to a line **already stored before the import** are skipped, so re-importing a file is harmless; identical rows inside one file are kept. | Ruling (writer) |
| D15 | **Matching** is 1:1, same signed amount (statement +X ↔ ledger debit X on 1-1001; −X ↔ credit X), any date. **Auto-match** pairs an unmatched line with the only unmatched ledger line of the same signed amount within ±3 days. Unmatched **negative** lines can be posted as bank charges (Dr 6-1012 / Cr 1-1001), **positive** ones as interest (Dr 1-1001 / Cr 4-3000), dated the statement date, reference `REKON-{lineId}`, type `BANK_RECON_ADJUSTMENT`; the line is then matched to the new 1-1001 line and can no longer be unmatched (correct with a manual journal). | Ruling (writer) |
| D16 | **Cut-over:** ledger lines dated before the first day of the month of the earliest statement line are treated as already reconciled; `ACCOUNT_OPENING` lines are never outstanding items. Report formula: `statement + deposits in transit − outstanding payments = book + unrecorded bank credits − unrecorded bank debits`; `is_reconciled` when a statement balance is set and the difference is < Rp 0,005. | Ruling (writer) |
| D17 | **CALK content** is produced by the server (text + figures) so the screen and the exports print the same thing. Entity data are constants in `CalkReport` (single branch, like `branch_id = 3`). Per-supplier payables are computed as of the period end from TEMPO purchases minus payments dated ≤ end, with a balancing line "penyesuaian lain" = ledger 2-1000 − sub-ledger (absorbs SP3 purchase returns and corrections without depending on their tables). Inventory per product category (FIFO value) is shown only when the period is the current month (no historic per-batch valuation exists); earlier months show the 1-2000 ledger balance and the FIFO policy. No comparative prior-period column (YAGNI). | Ruling (writer) |
| D18 | Exports: `fin_calk` now takes the server `CalkReport` (9 sections), `sak_emkm_package` takes `{financials, cashFlow, calk}` (4 statements + 9 CALK sections), and a new `bank_reconciliation` report (xlsx, pdf). No fixed-asset register export (the CALK note covers it). | Ruling (writer) |
| D19 | New UI lives inside the existing Buku Besar screen: tabs "6. Aset Tetap" and "7. Rekonsiliasi Bank", a header button "AJP Akrual / Dibayar di Muka", and a "5. CALK" tab in the SAK EMKM report tab. New components call their API themselves and report posted journals through one new `GeneralLedgerScreen` prop `onJournalsPosted` (= `notifyLedgerChanged` in `App.tsx`), keeping `App.tsx` changes to props only. | Ruling (writer) |
| D20 | New frontend types live in `src/shared/types/sakEmkm.ts` and the client in `src/services/api/sakEmkmApi.ts` (not in the shared `index.ts` / `accountingApi.ts` that SP2/SP3/SP5 also edit). | Ruling (writer) |
| D21 | Cash-flow buckets: 4-3000 → "other operating"; 1-1100 and 2-1100 (paying a prepayment or settling an accrual in cash) → "expenses". 6-1012 is an expense and already lands in "expenses". Depreciation and adjusting entries touch no cash account and stay out of the cash-flow statement. `FIXED_ASSET_ACQUISITION` / `FIXED_ASSET_VOID` fall in "fixed assets" (investing) through the existing `1-3` prefix rule. | Ruling (writer) |

### Dropped or moot (and why)

- **PPh Final 0.5% accrual**: user decision D1 (CALK text only).
- **Receivables breakdown in CALK**: BON was removed on 2026-09-30; 1-1002 is inactive.
- **Asset disposal / gain-loss, revaluation, impairment**: D8; not required by the roadmap item, needs an unallocated account.
- **Scheduler for reversals**: D12 posts the reversal at creation time.
- **Comparative figures in CALK, per-asset register export, recurring prepayment schedules**: YAGNI.

## What changes, per layer

| Layer | Change |
|---|---|
| Migrations | `2026_10_04_000001_add_sak_emkm_accounts` (5 accounts, insert-if-missing, `down()` deletes unused ones), `2026_10_04_000002_create_fixed_assets_tables` (`fixed_assets`, `fixed_asset_depreciations`), `2026_10_04_000003_create_bank_reconciliation_tables` (`bank_statement_lines`, `bank_reconciliations`). All additive. |
| Models | `FixedAsset` (categories, cents math, `expectedCentsThrough()`, `toApiArray()`), `FixedAssetDepreciation`, `BankStatementLine`, `BankReconciliation`. |
| Services (`app/Services/Accounting/`) | `FixedAssetService` (create, void, register summary, `lockRegister()`), `DepreciationService` (`pendingLines`, `pendingTotal`, `preview`, `run`), `AdjustingEntryService`, `BankReconciliationService` (lines, CSV parse/import, match/unmatch, auto-match, post adjustment, report), `CalkReport`. Modified: `PeriodClosingService` (depreciation gate), `ManualJournalService` (control accounts), `CashFlowReport::bucket()`. |
| HTTP | `FixedAssetController`, `AdjustingEntryController`, `BankReconciliationController`, `CalkController`, `FixedAssetRequest`; `ManualJournalRequest` message. Routes below. |
| Permissions | `Permissions::KEYS` + `fixed_assets`, `bank_reconciliation` (no DEFAULTS entry = false for KASIR/GUDANG); frontend `PermissionKey`, `DEFAULT_ROLE_PERMISSIONS`, `RolePermissionsTab`, ledger screen gate. |
| Frontend | `sakEmkm.ts` types, `sakEmkmApi.ts`; components `FixedAssetsTab`, `FixedAssetModal`, `AdjustingEntryModal`, `BankReconciliationTab`, `CalkView`; edits to `GeneralLedgerScreen`, `SakEmkmReportTab`, `JournalTab` (filter groups + badges), `ManualJournalModal` (control accounts), `PeriodClosingModal` (hint), `App.tsx` (props), export `registry.ts`. |

### Endpoints

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/accounting/fixed-assets` | `fixed_assets` | `{assets[], summary{total_cost,total_accumulated,total_book_value,ledger_cost,ledger_accumulated,difference_cost,difference_accumulated}}` |
| POST | `/accounting/fixed-assets` | `fixed_assets` | `{name, category, acquisition_date≤today, acquisition_cost, residual_value?, useful_life_months 1..600, funding, depreciation_start (OPENING only, YYYY-MM ≥ acquisition month), opening_accumulated_depreciation (OPENING only), notes?}` → 201 `{asset, journals[]}` |
| POST | `/accounting/fixed-assets/{id}/void` | `fixed_assets` | `{reason}`; 422 if already void or depreciated |
| GET | `/accounting/fixed-assets/depreciation` | `fixed_assets` | `?period=YYYY-MM` preview `{lines[], total, is_locked, blocked_reason, posted[]}` |
| POST | `/accounting/fixed-assets/depreciation` | `fixed_assets` | `{period}` → 201 `{journals:[entry]}` or 200 `{journals:[]}` |
| POST | `/accounting/adjusting-entries` | `accounting_hub` | → 201 `{journals:[entry, reversal?]}` |
| GET | `/accounting/bank-reconciliation` | `bank_reconciliation` | `?period=YYYY-MM` report |
| PUT | `/accounting/bank-reconciliation/{period}` | `bank_reconciliation` | `{statement_ending_balance}` → report |
| POST | `/accounting/bank-reconciliation/lines` | `bank_reconciliation` | `{statement_date≤today, description, amount≠0}` → 201 line |
| POST | `/accounting/bank-reconciliation/import` | `bank_reconciliation` | multipart `file` (csv/txt ≤ 1 MB) → 201 `{imported, skipped}` |
| POST | `/accounting/bank-reconciliation/auto-match` | `bank_reconciliation` | `{period}` → `{matched}` |
| DELETE | `/accounting/bank-reconciliation/lines/{id}` | `bank_reconciliation` | unmatched only |
| POST | `/accounting/bank-reconciliation/lines/{id}/match` | `bank_reconciliation` | `{journal_item_id}` |
| POST | `/accounting/bank-reconciliation/lines/{id}/unmatch` | `bank_reconciliation` | not for posted adjustments |
| POST | `/accounting/bank-reconciliation/lines/{id}/post-adjustment` | `bank_reconciliation` | → 201 `{journals:[entry]}` |
| GET | `/reports/calk` | `financial_reports`, `accounting_hub` | `?period=YYYY-MM` (≤ current month) |

## Accounting impact

Every journal goes through `JournalDraft` / `AccountingEngine::createEntry` (balanced to the cent, date after the lock).

| Event | Debit | Credit | Balances because | Cash-flow bucket | SAK EMKM presentation |
|---|---|---|---|---|---|
| Asset bought cash/transfer (`FIXED_ASSET_ACQUISITION`) | 1-3000 cost | 1-1000 or 1-1001 cost | one amount both sides | Investing (fixed assets, 1-3 prefix) | Aset tetap (cost) |
| Asset registered from opening balance (`OPENING`) | — | — | no journal (already in `ACCOUNT_OPENING`) | none | register only |
| Asset void (`FIXED_ASSET_VOID`, `reversal_of_id`) | mirror of acquisition | | mirror | Investing (inflow) | reduces aset tetap |
| Monthly depreciation (`DEPRECIATION`, last day of P) | 6-1011 per asset | 1-3999 Σ | credit = Σ debit lines | none (no cash line) | Beban penyusutan (operating expense, `6-` prefix); 1-3999 shown negative under aset tetap |
| Accrual (`ADJUSTING_ENTRY`, last day of P) | 6-xxxx | 2-1100 | one amount | none | Beban; Liabilitas jangka pendek "Beban yang masih harus dibayar" |
| Accrual reversal (`ADJUSTING_REVERSAL`, day 1 of P+1) | 2-1100 | 6-xxxx | mirror | none | nets the actual bill paid in P+1 |
| Prepayment used (`ADJUSTING_ENTRY`) | 6-xxxx | 1-1100 | one amount | none | Beban; Aset lancar "Beban dibayar di muka" decreases |
| Prepayment paid (manual journal) | 1-1100 | 1-1000/1-1001 | one amount | Operating – expenses (D21) | Aset lancar |
| Accrual settled without reversal (manual) | 2-1100 | 1-1000/1-1001 | one amount | Operating – expenses (D21) | liability reduced |
| Bank charge from statement (`BANK_RECON_ADJUSTMENT`) | 6-1012 | 1-1001 | one amount | Operating – expenses | Beban administrasi bank |
| Bank interest from statement (`BANK_RECON_ADJUSTMENT`) | 1-1001 | 4-3000 | one amount | Operating – other (D21) | Pendapatan lain (revenue section, credit-normal) |

- `FinancialReportService` needs no change: 1-1100 is a current asset, 2-1100 a liability, 6-1011/6-1012 operating
  expenses (`6-` prefix), 4-3000 revenue; the balance sheet keeps balancing because every entry balances.
- Period closing sweeps 6-1011, 6-1012 and 4-3000 like any other nominal account; D11 adds the depreciation gate.
- CALK figures are read from the same `LedgerBalances` / `FinancialReportService` as the statements, so the notes
  agree with the balance sheet by construction (equity note = balance-sheet equity section; cash & bank = 1-1000 +
  1-1001 as of the period end; fixed-asset note shows register totals next to 1-3000/1-3999 ledger balances).

## Testing

Backend (new classes use `DatabaseTransactions`; dates in 2019 to stay clear of other tests' data):
- `SakEmkmFoundationTest`: 5 accounts exist/active with the right type and side; new permission keys false for
  KASIR/GUDANG and true for OWNER; manual journal rejects 1-3000/1-3999; cash-flow buckets for 4-3000, 1-1100, 2-1100.
- `FixedAssetApiTest`: TUNAI/TRANSFER acquisition journals; OPENING posts nothing and keeps prior accumulation;
  validation (residual + opening > cost, OPENING-only fields, start before acquisition month, future date); void
  mirrors and links the journal, twice → 422, after depreciation → 422; index summary moves with the ledger; KASIR 403.
- `DepreciationTest`: straight-line journal (date, accounts, reference), idempotent rerun, sequential-month rule,
  rounding absorbed by the last month, OPENING remaining-base, closed period rejected, catch-up after a locked month,
  void asset excluded, preview, future period 422, **period close blocked until depreciation runs**, KASIR 403.
- `AdjustingEntryApiTest`: accrual with auto-reversal (dates, types, `reversal_of`), prepaid without reversal,
  auto-reversal rejected for prepaid, account rules (non-expense, 6-1011, 5-1000), closed period, future period,
  journal filter by type, KASIR 403.
- `BankReconciliationApiTest`: manual line; CSV `;` and `,` with duplicate skipping; bad row → 422 with row number and
  nothing stored; match validation; auto-match; charge/interest postings and their lock against unmatch; delete only
  unmatched; report reconciles with deposits in transit; KASIR 403.
- `CalkReportTest`: structure and policy texts (SAK EMKM, FIFO, garis lurus, PPh Final 0,5%); notes equal ledger
  figures (cash, prepaid, accrued, equity = balance sheet); payables per supplier as of period end; fixed-asset note
  after a depreciation run; inventory breakdown only for the current month; validation; KASIR 403.
- `UserPermissionTest` counts `Permissions::KEYS`; `PeriodClosingTest` stays green (no assets → no gate).

Frontend (Vitest, node): `sakEmkmApi` URLs/payloads; export registry (`fin_calk` 9 sections, package 13 sections,
`bank_reconciliation` summary rows, report count +1); default role permissions contain the two new keys.
`npm run lint && npm test`. A manual browser checklist closes the plan.

## Risks

- **Anchor drift.** SP6/SP2/SP3 edit the same shared files first (`Permissions.php`, `routes/api.php`,
  `AccountCoaSeeder`, `PermissionKey`, `mockData`, `RolePermissionsTab`, `JournalTab`, `registry.ts`, `App.tsx`, docs).
  The plan anchors on lines those sub-projects are unlikely to rewrite and says how to re-apply an edit whose anchor
  moved (keep their additions, add ours). See the pre-flight file.
- **`OPENING` assets depend on the user's numbers.** If prior accumulated depreciation or remaining life are wrong, the
  register and 1-3999 diverge; the register summary shows the difference against the ledger.
- **Catch-up into a later month** happens when an asset is registered with a start month that is already locked. The
  expense lands in the first open month (prospective), which is the only option once a period is closed.
- **Future-dated journals:** running depreciation or an AJP for the current month dates the entry on the month's last
  day, and an auto-reversal is dated next month. Reports "as of today" do not show them until that date.
- **Outstanding POS-void pairs in bank reconciliation.** A transfer sale voided in the books appears as two
  outstanding 1-1001 lines (+X and −X) that net to zero in the totals but stay listed; accepted.
- **Account names.** 1-3000 keeps the name "Peralatan Bengkel & Mesin Spooring" although vehicles/furniture categories
  also post there; renaming is a one-line migration if the thesis supervisor asks.
- **Entity text in CALK** (legal form, address) is a constant; edit `CalkReport::ENTITY` if the facts differ.
