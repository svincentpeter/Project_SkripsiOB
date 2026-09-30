# Workflow, testing, glossary, gotchas

## How work is done here

1. **Design first** for anything non-trivial. Specs live in `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
   and plans in `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`. Plans are written for agents (task by task with a
   "Global Constraints" section) and are executed with superpowers subagent-driven development. The checkboxes in
   plans are never ticked, so git log is the record of what shipped.
2. **Migration stages.** Each stage moves one area from localStorage to the server, following the same pattern:
   - Server services post journals.
   - The endpoint returns the resulting journals.
   - The frontend calls the API and merges the response.
   - Local code paths for that area are removed.

   Stages so far: stage 1 auth/RBAC (2026-09-23), stage 2 POS (2026-09-24), stage 3 inventory (2026-09-24), stage 4
   accounting core (2026-09-29). Cash & bank, payment hardening and transaction corrections (returns) followed on
   2026-09-30. Remaining areas (depreciation, CALK, dashboard/daily reports) are tracked as later sub-projects of the
   accounting roadmap.
3. **Commits:** Conventional Commits with a scope, in English, with the imperative subject in lowercase:
   `feat(pos): …`, `fix(accounting): …`, `test: …`, `docs(inventory): …`. The body explains why. Commits are made
   directly on `main`. When Claude writes the commit, it ends with the `Co-Authored-By: Claude …` trailer.
4. **Language:** code identifiers and commits are in English. UI strings, validation and error messages, and many
   comments are in Indonesian. Keep user-facing text in Indonesian.

### Spec/plan status
| Date | Topic | Status |
|---|---|---|
| 09-03 | modular architecture refactor | done (`src/modules` layout) |
| 09-03 | SIA SAK EMKM, inventory CRUD | done client-side; the inventory part was superseded by stage 3 |
| 09-04 | complete CRUD modules | done client-side; superseded by stages 2–3 |
| 09-05 | expense module | done client-side (still the live path) |
| 09-05 | Laravel backend integration | scaffold done; its trust-the-browser design was superseded by stages 1–3 |
| 09-07 | auth/RBAC role customization; receipt audit hub | client version, then replaced by stage 1; receipt hub done |
| 09-08 | unified export system | done |
| 09-10 | Excel import and QRIS | done |
| 09-22 | monthly FIFO stock spreadsheet | done |
| 09-23 | server auth Sanctum RBAC (stage 1) | done |
| 09-24 | POS server checkout (stage 2) | done |
| 09-24 | inventory server (stage 3) | done |
| 09-29 | accounting server core (stage 4): expenses, manual journals, reversal, period closing/reopen, opening balances, reports | done |
| 09-30 | cash & bank (roadmap SP2): cashier shifts, variance journal, deposits, Prive, capital | done |
| 09-30 | transaction corrections (roadmap SP3) | done |
| — | `API_DOCUMENTATION.md` | stale; use [api-reference.md](api-reference.md) |

## Testing

| What | Command | Notes |
|---|---|---|
| Frontend types | `npm run lint` | `tsc --noEmit`; there is no ESLint |
| Frontend unit tests | `npm test` | Vitest runs `src/**/*.test.ts` only (not `.tsx`), in a **node** environment with no DOM. Stub `localStorage` and `fetch` with `vi.stubGlobal`. Tests go in `__tests__/` next to the code |
| Backend | `cd backend && composer test` | MySQL `project-skripsi_ob_testing`, which must exist and be migrated. See [../../backend/AGENTS.md](../../backend/AGENTS.md#tests) |
| E2E | `node tests/e2e/<file>.mjs` | Plain Playwright scripts, not `@playwright/test`. They need `npm run dev` (dev mode), the backend on :8000 with seeded users, and `VITE_DEV_LOGIN_PASSWORD`. They log in via the "Agus Subagyo" quick-login card, write screenshots and JSON to `tests/e2e/screenshots/`, and have **no pass/fail assertions** |

As of 2026-09-30 (after transaction corrections), the frontend passes: 29 test files, 147 tests, and `tsc` is clean.
The backend passes 262 tests.

## Glossary (Indonesian → meaning)

| Term | Meaning |
|---|---|
| OB3 / Cabang 3 | Omah Ban branch 3 (Magelang), the only branch (`branch_id = 3`) |
| Ban baru / ban dalam / ban bekas | new tire / inner tube / used tire (used tires were removed from scope) |
| Ring (R13–R18) | rim diameter; part of the tire size |
| Spooring / balancing | wheel alignment / wheel balancing services |
| Kasir / Gudang / Owner | cashier / warehouse / owner, the three roles |
| Nota, struk, invoice | sales receipt (`OB3-INV-…`) |
| Kas laci | cash drawer (account 1-1000) |
| Shift kasir / buka shift / tutup shift | cashier shift / open (count opening float) / close (count drawer) |
| Selisih kas | cash over/short (6-1010), journaled when the owner approves the shift |
| Prive | owner drawings (3-3000, contra-equity) |
| Setor bank | cash-to-bank deposit (1-1000 → 1-1001) |
| Tunai / transfer / QRIS | cash / bank transfer / Indonesian QR payment, the only POS payment methods |
| MDR | merchant discount rate, the fee charged by QRIS (6-1009) |
| EDC / surcharge | card terminal / card fee passed on to the customer (4-2000). Removed from the POS on 2026-09-30; historic entries only |
| BON | sale on credit, creating a receivable (piutang, 1-1002). Removed from the POS on 2026-09-30; historic entries only |
| Piutang / hutang | receivable / payable |
| Tempo | purchase on credit terms, creating supplier debt (2-1000) |
| DP / uang muka / booking inden | down payment / customer deposit (2-1004) / pre-order. Removed from the POS on 2026-09-30; historic entries only |
| Lunas / belum lunas / sebagian | paid / unpaid / partially paid |
| HPP | cost of goods sold (5-1000) |
| Persediaan | inventory (1-2000) |
| Stok opname | physical stock count and adjustment |
| Retur penjualan / retur pembelian | sales return (`RTJ-…`, cash refund, 4-9100) / purchase return to the supplier (`RTB-…`); "Batal penerimaan" cancels an untouched goods receipt (status `BATAL`) |
| Go-live (saldo awal persediaan dibukukan) | the one-shot inventory opening balance (`OPENING-INV-…`) is posted; afterwards Excel stock rebuilds are refused |
| Selisih persediaan | inventory variance (5-2000) |
| Penerimaan barang (GR) | goods receipt (`GR-…`) |
| Kartu stok / mutasi | stock card / stock movement |
| Buku besar / neraca saldo | general ledger / trial balance |
| Laba rugi / posisi keuangan (neraca) / arus kas | income statement / balance sheet / cash flow |
| Jurnal umum / penyesuaian / penutup / pembalik (storno) | general / adjusting / closing / reversing journal |
| BKK (Bukti Kas Keluar) | cash-out voucher, i.e. an expense (`BKK-…`) |
| Beban | expense |
| Modal / laba ditahan | owner's capital (3-1000) / retained earnings (3-2000) |
| PPN | VAT (11%). **Not charged on sales** (non-PKP). Only on supplier invoices, where it is part of inventory cost |
| Kop | letterhead on exported reports |
| SAK EMKM | Indonesian financial accounting standard for micro, small, and medium entities |

## Cross-cutting gotchas

- **Two sources of truth.** Before changing a feature, check whether it is server-owned or localStorage-owned (the table
  in `AGENTS.md`). Do not add new localStorage persistence for business data.
- **`App.tsx` is the hub.** Almost every handler lives there, and many imports are dead (legacy local services). Edit
  the handler you need; do not trust an import as evidence that something is used.
- **Silent failures.** `loadPosData` swallows API errors (`.catch(() => null)`), and `stockReconciliationApi` falls
  back to local processing on server 422s. When debugging "data not showing", check the network tab and backend logs.
- **Mock data.** Accounting data (expenses, journals, balances, reports) is server-owned and has no mock seed.
  `src/shared/data/mockData.ts` now only supplies non-accounting defaults: `DEFAULT_ROLE_PERMISSIONS` (fallback
  when the permissions request fails), `INITIAL_STORE_SETTINGS`, and category seeds for the legacy local category
  services (bank/QRIS providers are server-only since 2026-09-30). Its product,
  transaction, supplier, stock-mutation and trend arrays are legacy; only tests and dead imports use them.
- **"Reset data"** in the UI only runs `localStorage.clear()` and reloads, which also logs the user out. Its text
  mentions Supabase, which is misleading.
- **Timezone.** Laravel's `config/app.php` timezone is `Asia/Jakarta` (WIB, overridable with `APP_TIMEZONE`), so
  `now()` and business dates match the shop's clock. Existing rows created before the switch keep their old UTC
  timestamps; `DATE` columns are unaffected. New frontend code must take business dates from `localDate()`
  (`src/services/accountingPeriod.ts`), not `toISOString()`, which gives the UTC date.
- **Known issue: `toISOString()` dates.** Older screens still derive "today" with `new Date().toISOString()`
  (sliced to a date or month), which yields the previous day between 00:00 and 07:00 WIB:
  `GoodsReceiptModal`, `PosScreen` (parked order numbers), `ThermalReceiptScreen`, `inventoryService`,
  `ExecutiveDashboardScreen`, `StockMonthlyLedgerView` / `stockMonthlyLedgerService`, the export registry
  (`src/shared/export/registry.ts`), and the default payment date in `PayDebtModal`.
  Switch them to `localDate()` when touching those files.
- **Test database.** Backend tests without a DB trait leave rows behind, and `RefreshDatabase` tests wipe everything.
  If a test fails only when the whole suite runs, suspect test order.
- **Windows.** Paths contain `C:\laragon\www\…`. The DB name has a hyphen (`project-skripsi_ob`), so quote it in SQL.
- **Security items still open:**
  - Prices (`unit_price`) are trusted from the client (fees are server-side since 2026-09-30).
  - Static QRIS (no Midtrans order id) is cashier-attested until bank reconciliation.
  - `SUPABASE_VERCEL_SETUP.md` contains a publishable key and default passwords.

## Legacy you can ignore
Supabase (`supabaseClient.ts`, `supabaseDataService.ts`, `supabase_schema.sql`, `SUPABASE_VERCEL_SETUP.md`),
`database/schema_project_skripsi_ob.sql`, `express`/`dotenv`/`tsx`/`motion` dependencies, `GEMINI_API_KEY`,
`metadata.json` (AI Studio), and the `proposal_extracted*.txt` files (the thesis proposal text, useful only for
academic context).
