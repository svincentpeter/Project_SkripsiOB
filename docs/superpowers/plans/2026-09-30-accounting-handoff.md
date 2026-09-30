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
  After the DP/BON/EDC removal (2026-09-30) the counts were backend 194, frontend 127; after cash & bank (SP2) they
  were backend 232, frontend 142 (28 test files); after transaction corrections (SP3) they were backend 262 (1510
  assertions), frontend 147 (29 test files); after the SP3 final fix wave (`67ffe0b`, which ran interleaved with the
  first SP4 tasks, so the backend figure includes their tests) backend 300, frontend 148. After SP4 (last code
  commit `f0a4c10`) one run of both gates printed backend **340 tests, 2126 assertions**, frontend **168 tests in 31
  files**, `tsc` clean; these figures already include the SP5 commits made alongside (up to `7039cfa`).
- Transaction corrections (sub-project 3) are **implemented and reviewed** (commits `b8c5818` through `67ffe0b`,
  interleaved with SP2 follow-ups and the first SP4 commits; its final fix wave is `f25e9d6 0aca67e f18a3b2 180335f
  83430a8 ad30156 0b9380c aa4d9be 67ffe0b`). Its browser checklist has **not been run yet** (section 2c).
- SAK EMKM completeness (sub-project 4) is **implemented and reviewed** (`496d084`, `6f3fd03`+`457bca7`,
  `ea83ee2`+`5a61c7b`, `9a8503d`, `1795ee8`+`5e22dec`, `fee0f4f`+`efc70ac`, `f1c0810`, `f13adca`, `3b071fa`,
  `ceb9dec`+`f0a4c10`, `d470ba3`, plus the docs commit). Its browser checklist and the CALK entity details are
  **pending on the user** (section 2d).
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
   Payment hardening added `2026_10_01_000001_create_qris_transactions_table`. For a QRIS demo without real Midtrans
   sandbox keys add `MIDTRANS_ALLOW_SIMULATION=true` to `backend/.env` (never in production); with real sandbox keys
   set `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY` instead.
   Transaction corrections added `2026_10_03_000001_add_sales_return_account_and_permissions`,
   `2026_10_03_000002_create_sales_returns_tables` and `2026_10_03_000003_create_purchase_returns_tables` (all
   additive). SAK EMKM completeness added `2026_10_04_000001_add_sak_emkm_accounts`,
   `2026_10_04_000002_create_fixed_assets_tables`, `2026_10_04_000003_create_bank_reconciliation_tables` and
   `2026_10_04_000004_unique_fixed_asset_depreciation_period` (all additive; already applied to the dev DB).
3. Run the gates (`composer test`, `npm run lint && npm test`), then open the app as owner and repeat the
   browser check from section 1. The bundled `composer.phar` on this machine is too old for the
   `composer test` script (`@no_additional_args`); use `cd backend && php artisan config:clear && php artisan test`
   as the gate.
4. **Enter the account opening balances once** (Buku Besar → "Saldo Awal"): cash drawer 1-1000, bank 1-1001,
   fixed assets 1-3000, accumulated depreciation 1-3999, retained earnings 3-2000. Until then bank 1-1001 shows
   negative (a supplier was paid from bank before any opening balance existed). Do this **before the first cashier
   shift is opened**: a shift opened first books the whole float as an opening difference, which approval journals
   to 6-1010 as an overage (reversed as a shortage in the next shift once the opening balance is posted).
   Then register every machine already in 1-3000/1-3999 in Buku Besar → "7. Aset Tetap" with "Sudah tercatat di
   Saldo Awal" (`OPENING`), so the register matches the ledger ("Cocok"), and run depreciation month by month before
   closing a period (a close is refused while depreciation is pending).

5. **Inventory go-live.** `php artisan inventory:opening-balance` (or the valuation banner button) is **one-shot**: the
   `OPENING-INV-…` entry marks go-live of the inventory ledger, and a second run is refused (422 / console exit 1).
   After go-live the Excel stock commit (even with `force`) and the stock bulk-update (`update_stock`) are refused
   (user decision): purchases go through goods receipt, count corrections through stock opname. So finish any Excel
   stock migration first. **Before the first sale, run a stock opname on every product whose quantity exceeds its
   FIFO batch layers:** a sale beyond the layers is now rejected with 422 (user decision), and the opname adds the
   missing layers. Products to check: `SELECT p.id, p.product_name, p.product_quantity, COALESCE(SUM(b.remaining_qty),0)
   AS layers FROM products p LEFT JOIN product_batches b ON b.product_id = p.id GROUP BY p.id HAVING
   p.product_quantity > layers;`

Not in git (only on the old machine — copy them yourself if you need them):
- `docs/flowchart/`, `docs/flowchart.zip`, `.claude/`.

## 2b. Stage 4 leftover (do first)

- [x] **Scoped re-review of the final fix wave** (`a6e1d5b..b220424`, findings F1–F7 in section 4). Done: F1–F7
  are addressed and the three implementer extras are correct (a Rp 0 TEMPO goods receipt is stored as LUNAS;
  voiding a Rp 0 nota succeeds with no reversal journal; the "Laporan Keuangan" shortcut is hidden from roles
  without `financial_reports`). No Critical or Important findings.
- [x] Fix the purchase-invoice calculator (roadmap "Separate small fix"). Done in `3db23f0`: payable and inventory
  are booked at the supplier invoice total; the total is split in cents across up to two FIFO batches so batch
  value = journal = payable; DPP/PPN are stored on `purchases` (migration `2026_09_30_100001`).
- [ ] **Task M1 is still pending** (`docs/superpowers/plans/2026-09-30-remove-dp-bon-edc.md`): dev DB reset
  `php artisan migrate:fresh --seed` + `php artisan inventory:opening-balance`, re-enter the opening balances, run
  the browser checklist. It is a manual step run by the user only.

## 2c. Transaction corrections: browser checklist (pending, manual)

Not run yet: it writes sales, returns and receipts to the dev DB, so the user runs it. On 2026-09-30 the dev DB had
23 products whose quantity exceeds their batch layers (query in step 2.5): opname them first or pick other products.
As owner on the dev DB:
- [ ] Open a shift, sell 2 units by transfer, return 1 in Riwayat Struk: the toast shows the refund; the journal filter
  "Penjualan" shows a `RETUR` badge.
- [ ] Goods receipt TEMPO 2 units, pay part, return 1 via "Penerimaan & Stok Opname → Retur / Batal Penerimaan";
  cancel another untouched receipt. The valuation banner stays "Selaras".
- [ ] POS "Input Manual" offers only services.
- [ ] No console errors.

## 2d. SAK EMKM completeness: pending user items

- [ ] **Confirm the CALK entity details.** `CalkReport::ENTITY` in `backend/app/Services/Accounting/CalkReport.php`
  holds placeholders: legal form "Usaha mikro, kecil dan menengah (UMKM) milik perseorangan", address "Magelang, Jawa
  Tengah". The owner must confirm the legal form and the full address; change the constant if they differ (it is
  the only place, printed in the CALK screen and exports).
- [ ] **Browser checklist (task M1 of `docs/superpowers/plans/2026-09-30-sak-emkm-completeness.md`).** Run by the user,
  as owner on the dev DB (`npm run dev:all`): Aset Tetap (buy by transfer → `FIXED_ASSET_ACQUISITION`; an `OPENING`
  machine matching the opening balance → "Cocok"; preview/run depreciation for last and this month; a second run
  says "Tidak ada penyusutan…"; void a fresh test asset); Tutup Buku refused while depreciation is pending; AJP accrual
  with auto-reversal (two journals) and prepaid without reversal; Rekonsiliasi Bank (CSV import `tanggal;keterangan;jumlah`,
  auto-match, manual match, book an admin fee and interest, statement balance → "Terekonsiliasi", Excel/PDF export);
  Laporan Keuangan → 5. CALK (nine notes, PDF/Word and the SAK EMKM package; balance sheet "Seimbang", cash flow
  "Terekonsiliasi" with interest under "Arus kas operasi lainnya"); Hak Akses lists "Register Aset Tetap & Penyusutan"
  and "Rekonsiliasi Bank BCA" (off for Kasir/Gudang), and Gudang with only the asset key sees only the Aset Tetap tab.
- PPh Final 0.5% stays out of scope (user decision 2026-09-30): the CALK states it as tax policy only; nothing is
  accrued.

## 3. Next sub-projects (each: brainstorm → spec → plan → implement)

In roadmap order; details and file references are in the roadmap.

| # | Sub-project | Core scope |
|---|---|---|
| 2 | Cash & bank (**done**, `2026-09-30-cash-and-bank`) | Cashier shift open/close with counted cash and required variance reason, variance journal (new over/short account), cash→bank deposit, owner drawings (new Prive account), capital injection; replace the `ob3_cash_drawer` counter with the 1-1000 ledger balance |
| 3 | Transaction corrections (**done**, `2026-09-30-transaction-corrections`; browser checklist pending, 2c) | Partial sales return (cash refund, 4-9100), purchase return / goods-receipt cancel, FIFO shortfall → 422, manual POS lines services only, one-shot inventory opening balance (go-live), Excel stock rebuilds refused after go-live, payment/GR date validation |
| 4 | SAK EMKM completeness | Fixed asset register + monthly straight-line depreciation (new expense account), real CALK in UI/export, PPh Final 0.5% (confirm scope with supervisor), accruals/prepayments — **done** (`2026-09-30-sak-emkm-completeness`) |
| 5 | Operational reports & dashboard | Daily cash report, daily recap, per-cashier recap; dashboard figures from server reports (fix VOID/all-month expense totals, FIFO value, UTC "today") |
| 6 | Payment hardening | **Done** (`2026-09-30-payment-hardening-design.md`): `qris_transactions` (settled amount, single use), simulation behind `MIDTRANS_ALLOW_SIMULATION`, no fallback Midtrans key, server-side fees via `provider_id`; one bank account 1-1001 kept by ruling |

> 2026-09-30: booking DP, BON credit sales and EDC were removed from the POS
> (`docs/superpowers/specs/2026-09-30-remove-dp-bon-edc-design.md`), so bad-debt write-off and DP forfeit are no
> longer needed. Accounts 1-1002, 2-1004 and 4-2000 are inactive.

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
  - F2 roles with `accounts_payable` but no `accounting_hub` see a sub-ledger-only ledger screen (payables only
    since the receivables tab was removed on 2026-09-30).
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
- Older screens still use `toISOString()` for default dates (PayDebtModal, inventoryService, dashboard, export
  registry) — wrong day before 07:00 WIB.
- Dashboard expense total includes VOID and all months (sub-project 5).
