# AGENTS.md — Project_SkripsiOB

Entry point for AI agents. Read this first, then the topic file in `docs/ai/` for the area you touch.

## What this is

A Point of Sale + Accounting Information System (SIA) for **Omah Ban Cabang 3 (OB3)**, a tire shop and
spooring workshop in Magelang. It is a double-degree thesis (Accounting + Information Systems), so the
accounting must be defensible under **SAK EMKM** (Indonesian SME accounting standard): every business
event must end in a balanced double-entry journal, and inventory is costed **FIFO**.

The shop is **non-PKP: no PPN (VAT) on sales**, so there is no tax field anywhere in POS and no PPN account.
PPN only matters on supplier invoices, where it is capitalized into inventory cost. The real production system
at `C:\laragon\www\ProjectOmahBan` is the reference for business rules like this.

UI text, domain terms, and most code comments are Indonesian. Commit messages and these docs are English.
See the glossary in [docs/ai/workflow-and-gotchas.md](docs/ai/workflow-and-gotchas.md#glossary).

## Stack

| Part | Location | Tech |
|---|---|---|
| Frontend (SPA) | repo root: `src/`, `index.html`, `vite.config.ts` | React 19, TypeScript 5.8, Vite 6, Tailwind v4, lucide-react, Vitest |
| Backend (REST API) | `backend/` | Laravel 13, PHP 8.3, Sanctum (bearer tokens), MySQL 8 (Laragon), PHPUnit 12 |
| Exports | `src/shared/export/` | pdfmake, exceljs, docx, CSV |
| Payments | `backend/app/Services/Payment/` | Midtrans QRIS (sandbox by default) |

Frontend deploys to Vercel (static, `vercel.json`). The backend is not deployed anywhere yet.

## Repo map

```
AGENTS.md / CLAUDE.md        this file (+ Claude import)
docs/ai/                     agent context docs (start here after this file)
docs/superpowers/specs|plans design specs and implementation plans, dated (history of every stage)
docs/SPESIFIKASI_...md       thesis-facing system spec (academic justification, partly stale)
src/App.tsx                  app shell: ALL global state, handlers, screen switching (~1300 lines)
src/modules/<feature>/       screens + components: pos, receipt, inventory, expenses, accounting,
                             dashboard, settings, auth
src/services/                client logic; src/services/api/ = typed Laravel API client + mappers
src/shared/                  types, mock data, formatters, shared components, export system
tests/e2e/*.mjs              Playwright "audit" scripts (manual, not CI)
backend/                     Laravel app — see backend/AGENTS.md
database/, supabase_schema.sql, SUPABASE_VERCEL_SETUP.md   LEGACY, not authoritative
```

## Commands

Frontend (repo root):

```bash
npm run dev        # Vite on http://localhost:3000
npm run dev:all    # frontend + `php artisan serve` together
npm run lint       # tsc --noEmit (the only type/lint gate)
npm test           # vitest run (src/**/*.test.ts only, node env)
npm run build
```

Backend (`cd backend`):

```bash
php artisan serve                  # http://127.0.0.1:8000, API at /api/v1
php artisan migrate --seed         # needs SEED_DEFAULT_PASSWORD in backend/.env
php artisan inventory:opening-balance   # book FIFO stock value into ledger ONCE per DB (marks go-live)
composer test                      # runs against MySQL DB `project-skripsi_ob_testing`
```

Before claiming work is done: `npm run lint && npm test` for frontend changes, `composer test` for backend changes.
Testing details and pitfalls: [docs/ai/workflow-and-gotchas.md](docs/ai/workflow-and-gotchas.md).

## Migration status: where is the source of truth?

The app started fully client-side (localStorage, briefly Supabase) and is being moved to the server
**stage by stage**. Know which side owns the data before editing a feature.

| Feature | Source of truth | Stage |
|---|---|---|
| Login, session, role permissions | Server (Sanctum, `role_permissions`) | 1 (done) |
| POS checkout (Tunai/Transfer/QRIS, split; every sale paid in full), void, partial sales returns (cash refund), sales history, QRIS (settlements in `qris_transactions`), payment providers and fees | Server | 2 (done); payment hardening, transaction corrections 2026-09-30 |
| Products, categories, services, suppliers, FIFO batches, goods receipt, purchase returns and receipt cancellation, payables, stock opname, Excel import, monthly stock ledger | Server | 3 (done); transaction corrections 2026-09-30 |
| Expenses, manual journals, journal reversal, account opening balances, period closing & lock | Server | 4 (done) |
| Financial reports (journals, ledger, trial balance, statements, equity changes, cash flow) | Server, computed per period | 4 (done) |
| Cashier shifts, drawer balance (= ledger 1-1000), cash deposits, Prive, capital injections | Server | SP2 cash & bank (done) |
| Store settings (receipt text), parked orders, cart | **Client** (localStorage `ob3_*` keys) | not scheduled |

Accounting components fetch their own server data (`useServerData`) keyed by the chosen period and by
`ledgerVersion`, which `App.tsx` increments through `notifyLedgerChanged` whenever a server action returns journals.
The cash drawer is account 1-1000: every "Kas Laci" figure is its ledger balance, and cash checkout needs an open
cashier shift (`cash_sessions`). See [docs/ai/domain-accounting.md](docs/ai/domain-accounting.md#cash-drawer-and-shifts).
Details: [docs/ai/architecture.md](docs/ai/architecture.md).

## Rules that must not break

1. **Journals balance.** All server postings go through `JournalDraft` → `AccountingEngine::createEntry`,
   which requires Σdebit = Σcredit to the cent (no tolerance). Never write `journal_entries`/`journal_items` directly.
   `createEntry` also rejects lines that are negative, two-sided or fewer than two, and any date on or before
   the period lock date (`PeriodLock`).
2. **Account codes come from the COA.** 28 accounts (1-1002, 2-1004, 4-2000 inactive since 2026-09-30; 4-9100 Retur
   Penjualan added by `2026_10_03_000001`), seeded by `AccountCoaSeeder` (+ migration `2026_09_24_000003`). The frontend has no COA copy; it loads `GET /accounts`. A new account needs only
   a migration (so existing databases get it) and the seeder.
   See [docs/ai/domain-accounting.md](docs/ai/domain-accounting.md).
3. **Stock only moves through services that keep FIFO and the ledger in step.** Stock changes go through
   `FifoCostingService`, the `Inventory/*` services, and `InventoryValueJournal::record()`, so that
   account 1-2000 = Σ(remaining_qty × batch_cost). Do not edit `product_quantity` or `product_batches` ad hoc.
   A sale beyond the FIFO batch layers is rejected (422); the inventory opening balance is one-shot and marks
   go-live, after which Excel stock rebuilds are refused.
   See [docs/ai/domain-inventory.md](docs/ai/domain-inventory.md).
4. **Server-owned features are server-authoritative.** Money, stock, accounting, and document numbers for
   stages 1–4 are computed on the server. The frontend sends intent and maps the response; it must not
   re-derive them or fall back to local writes.
5. **Permissions are deny-by-default.** Every protected route uses `permission:<key>[,<key>]`
   middleware. Keys are listed in `backend/app/Support/Permissions.php` and must match `PermissionKey`
   in `src/shared/types/index.ts`. OWNER always passes.
6. **Document numbers** use `DocumentNumber::next()` (`PREFIX-YYYYMM-####`) inside a DB transaction.
7. **Secrets:** never commit `.env*` (except `.env.example`), seeded passwords, or Midtrans keys. There is no
   fallback Midtrans key; the QRIS demo simulation needs `MIDTRANS_ALLOW_SIMULATION=true` (sandbox only).

## Existing docs: trust order

1. Code, migrations, `backend/routes/api.php`, tests.
2. `docs/ai/*` (this set, written 2026-09-27 from the code).
3. The latest specs in `docs/superpowers/specs/` (2026-09-23 and later match the code closely).
4. **Stale — verify before use:** `README.md` (COA list, Supabase as source of truth, setup steps),
   `docs/superpowers/specs/API_DOCUMENTATION.md` (no auth, ~40 routes missing, wrong checkout payload),
   `docs/SPESIFIKASI_DAN_JUSTIFIKASI_SISTEM.md` (says Laravel 12), `database/schema_project_skripsi_ob.sql`,
   `supabase_schema.sql`, `SUPABASE_VERCEL_SETUP.md`, root `.env.example` (Supabase/Gemini keys unused).

## Topic docs

| File | Read when you touch… |
|---|---|
| [docs/ai/architecture.md](docs/ai/architecture.md) | the frontend shell, state, API client, auth flow, exports |
| [docs/ai/api-reference.md](docs/ai/api-reference.md) | any endpoint or permission |
| [docs/ai/data-model.md](docs/ai/data-model.md) | migrations, models, tables |
| [docs/ai/domain-accounting.md](docs/ai/domain-accounting.md) | COA, journals, reports, expenses, closing |
| [docs/ai/domain-pos.md](docs/ai/domain-pos.md) | checkout, payments, fees, void, QRIS |
| [docs/ai/domain-inventory.md](docs/ai/domain-inventory.md) | products, FIFO, goods receipt, payables, opname, Excel import |
| [docs/ai/workflow-and-gotchas.md](docs/ai/workflow-and-gotchas.md) | testing, specs/plans workflow, commits, glossary, known issues |
| [backend/AGENTS.md](backend/AGENTS.md) | backend conventions |
