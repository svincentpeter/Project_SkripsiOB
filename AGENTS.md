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
| Daily cash report, daily recap, per-cashier recap, dashboard money figures | Server (`/reports/daily-*`, computed from journals) | roadmap SP5 (done) |
| Cashier shifts, drawer balance (= ledger 1-1000), cash deposits, Prive, capital injections | Server | SP2 cash & bank (done) |
| Fixed asset register & depreciation, adjusting entries (AJP), bank reconciliation, CALK | Server | SP4 (done) |
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
   the period lock date (`PeriodLock`), and any entry that would make cash 1-1000 or bank 1-1001 negative.
2. **Account codes come from the COA.** 33 accounts (1-1002, 2-1004, 4-2000 inactive since 2026-09-30; 4-9100 Retur
   Penjualan added by `2026_10_03_000001`; 1-1100, 2-1100, 4-3000, 6-1011, 6-1012 added by `2026_10_04_000001`), seeded by `AccountCoaSeeder` (+ migration `2026_09_24_000003`). The frontend has no COA copy; it loads `GET /accounts`. A new account needs only
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

<!-- unslop:start -->
# unslop · Linear Precision

Obsidian dark craft with adjacent neutral surfaces, translucent luminance hairlines, compact type, and tabular operational precision.

These rules are mandatory whenever you create, refactor, or review frontend code. Preserve product behavior and content while enforcing this visual system. Do not substitute a generic component-library theme for these tokens.

## 1. Design physics

1. **Hierarchy before decoration.** Establish meaning through composition, type, spacing, and contrast before color, shadows, or animation.
2. **One grid.** Align every edge and baseline to the spacing contract. Arbitrary values require a documented semantic reason.
3. **One accent.** Use the accent for action, focus, selection, or a deliberate data encoding—not ambient decoration.
4. **Optical alignment.** Account for glyph overhang, icon bounds, border thickness, and shadow offset; mathematical sameness is not always visual alignment.
5. **Accessible by construction.** Maintain WCAG AA contrast, visible keyboard focus, 44px touch targets where space allows, semantic HTML, and reduced-motion behavior.
6. **Content-specific composition.** Never default to a centered hero, purple gradient, three emoji cards, and a final call-to-action. Derive layout from the information architecture.

## 2. Color contract

| Semantic token | Value |
| --- | --- |
| background | `#08090a` |
| surface | `#0f1011` |
| surface-elevated | `#161719` |
| text | `#f7f8f8` |
| text-muted | `#9297a1` |
| border | `rgba(255,255,255,0.09)` |
| accent | `#5e6ad2` |
| accent-text | `#ffffff` |
| interactive | `#1c1e22` |
| success | `#4cb782` |
| warning | `#d7a642` |
| danger | `#eb5757` |
| info | `#70a5eb` |
| focus | `#5e6ad2` |

- Page color scheme: **dark**.
- Never invent raw hex, RGB, HSL, or opacity values when a semantic token exists.
- Use text-muted only for secondary copy that still meets contrast requirements.
- Verify WCAG 2.1 contrast with real sRGB luminance after alpha compositing: normal text requires 4.5:1; large text (24px, or 18.66px at 700+) requires 3:1. Resolve every slop/low-contrast finding.
- No purple/indigo gradient clichés, neon cyber-glows, rainbow accent palettes, or color-only status communication.

## 3. Typography contract

Display stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`
Body stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif`
Monospace stack: `Berkeley Mono, SFMono-Regular, Consolas, monospace`
Display tracking: `-0.045em`; body tracking: `-0.011em`.

| Scale step | Size |
| --- | --- |
| xs | `0.75rem` |
| sm | `0.875rem` |
| base | `0.875rem` |
| lg | `1.125rem` |
| xl | `1.25rem` |
| 2xl | `1.5rem` |
| 3xl | `clamp(1.75rem, 2.4vw, 2.25rem)` |
| 4xl | `clamp(2.25rem, 5vw, 2.75rem)` |

Available weights: regular 400, medium 500, semibold 600, bold 700.
- Display headings require tight tracking, deliberate line-height, balanced wrapping, and a constrained measure.
- Body copy stays between 60 and 70 characters per line; Tailwind max-w-prose is normally 65ch. Do not center long-form copy.
- Use `font-variant-numeric: tabular-nums` for prices, metrics, counters, clocks, identifiers, and data columns.
- Use at most three font weights in a component tree. Prefer size, spacing, and color over additional weights.

## 4. Geometry and spacing

- Base spacing grid: **4px**.
- Allowed spacing stops: **0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px**.
- Content maximum: **1200px**; grid: **12 columns**; gap: **16px**; inline inset: **24px**.
- Default border width: **1px**.
- No same-element spacing or radius utility conflicts. Responsive changes must use explicit responsive variants.
- Group related controls with smaller gaps and separate regions with larger gaps; do not distribute everything evenly by default.
- Nested corner radii must account for the padding between outer and inner surfaces.

| Radius token | Value |
| --- | --- |
| sm | `4px` |
| md | `6px` |
| lg | `8px` |
| xl | `12px` |
| full | `9999px` |

## 5. Elevation and material

| Elevation token | Value |
| --- | --- |
| sm | `0 1px 2px rgba(0,0,0,0.24)` |
| md | `0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.28)` |
| lg | `0 0 0 1px rgba(255,255,255,0.06), 0 16px 48px rgba(0,0,0,0.36)` |

- Anchor elevated surfaces with the border token. Never add raw `shadow-xl`/`shadow-2xl` without an intentional border and layered elevation decision.
- Do not stack multiple elevated cards inside one another. Prefer whitespace and hairline separators for ordinary grouping.

## 6. Motion contract

- Duration: `140ms`; easing: `cubic-bezier(0.25,0.46,0.45,0.94)`.
- Spring: mass 0.8, stiffness 320, damping 28.
- Animate only properties that communicate causality. Prefer transform and opacity; avoid layout thrashing.
- Under `prefers-reduced-motion: reduce`, remove spatial and ambient motion and preserve immediate state feedback.

## 7. Preset-specific laws

1. Build elevation from adjacent neutral surfaces and one-pixel luminance borders before adding shadow.
2. Reserve indigo for primary actions, current selection, and keyboard focus—not decorative washes.
3. Keep product UI compact at 13–16px while preserving 1.45–1.6 body line-height.
4. Use tabular figures for metrics, timestamps, identifiers, issue counts, and financial values.
5. Align labels, controls, and values to shared edges on the four-pixel grid.
6. Prefer 6px and 8px radii; reserve full radii for compact status pills and avatars.
7. Never introduce neon glows, glass blur, purple gradients, or ambient floating animation.
8. Focus rings must remain visible against every dark surface and finish without layout shift.
9. Use 32–40px control heights and explicit hover, active, disabled, and loading states.
10. Direct manipulation feedback should complete within 140ms and disappear under reduced motion.

## 8. CSS token source of truth

Use these variables directly or map them once into Tailwind, CSS Modules, styled-components, or the host design system. Do not create a second competing token scale. For Tailwind v4 @theme plus :root and .dark variables, run `npx -y unslop-mcp export-tokens --preset linear-precision --out tokens.css`.

```css
:root {
  color-scheme: dark;
  --unslop-color-background: #08090a;
  --unslop-color-surface: #0f1011;
  --unslop-color-surface-elevated: #161719;
  --unslop-color-text: #f7f8f8;
  --unslop-color-text-muted: #9297a1;
  --unslop-color-border: rgba(255,255,255,0.09);
  --unslop-color-accent: #5e6ad2;
  --unslop-color-accent-text: #ffffff;
  --unslop-color-interactive: #1c1e22;
  --unslop-color-success: #4cb782;
  --unslop-color-warning: #d7a642;
  --unslop-color-danger: #eb5757;
  --unslop-color-info: #70a5eb;
  --unslop-color-focus: #5e6ad2;
  --unslop-font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
  --unslop-font-display: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
  --unslop-font-body: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
  --unslop-font-mono: Berkeley Mono, SFMono-Regular, Consolas, monospace;
  --unslop-text-xs: 0.75rem;
  --unslop-text-sm: 0.875rem;
  --unslop-text-base: 0.875rem;
  --unslop-text-lg: 1.125rem;
  --unslop-text-xl: 1.25rem;
  --unslop-text-2xl: 1.5rem;
  --unslop-text-3xl: clamp(1.75rem, 2.4vw, 2.25rem);
  --unslop-text-4xl: clamp(2.25rem, 5vw, 2.75rem);
  --unslop-tracking-display: -0.045em;
  --unslop-tracking-body: -0.011em;
  --unslop-radius-sm: 4px;
  --unslop-radius-md: 6px;
  --unslop-radius-lg: 8px;
  --unslop-radius-xl: 12px;
  --unslop-radius-full: 9999px;
  --unslop-shadow-sm: 0 1px 2px rgba(0,0,0,0.24);
  --unslop-shadow-md: 0 0 0 1px rgba(255,255,255,0.04), 0 8px 24px rgba(0,0,0,0.28);
  --unslop-shadow-lg: 0 0 0 1px rgba(255,255,255,0.06), 0 16px 48px rgba(0,0,0,0.36);
  --unslop-space-0: 0px;
  --unslop-space-4: 4px;
  --unslop-space-8: 8px;
  --unslop-space-12: 12px;
  --unslop-space-16: 16px;
  --unslop-space-20: 20px;
  --unslop-space-24: 24px;
  --unslop-space-32: 32px;
  --unslop-space-40: 40px;
  --unslop-space-48: 48px;
  --unslop-space-64: 64px;
  --unslop-duration: 140ms;
  --unslop-easing: cubic-bezier(0.25,0.46,0.45,0.94);
  --unslop-content-max: 1200px;
  --unslop-border-width: 1px;
  --unslop-grid-gap: 16px;
  --unslop-content-inset: 24px;
}
```

## Deterministic Before → After Transformations

Use the project's semantic primitives and preserve real copy, data, links, handlers, DOM reading order, and accessible names. The examples use semantic tokens exported for the selected preset in the token foundation step; import that file first, or map these names to the equivalent existing semantic tokens. They are templates to adapt, not blind replacements or a reason to invent new content.

### 1. Gradient hero and decorative glow → type, semantic surfaces, and hairline

Before:

```tsx
<section className="relative bg-gradient-to-r from-purple-500 to-indigo-500 text-center">
  <div aria-hidden="true" className="absolute blur-3xl opacity-30" />
  <h1 className="text-6xl">{title}</h1>
  <p>{description}</p>
</section>
```

After:

```tsx
<section className="border border-[var(--border-subtle)] bg-[var(--surface-1)] px-6 py-12 text-[var(--text-primary)]">
  <h1 className="max-w-[20ch] text-4xl font-semibold leading-tight tracking-[var(--tracking-display)] md:text-5xl">{title}</h1>
  <p className="mt-4 max-w-prose leading-relaxed text-[var(--text-primary)]">{description}</p>
</section>
```

Remove the decorative blob element, not merely its blur; preserve any meaningful content or interaction separately. Remove gradient text utilities such as `bg-clip-text text-transparent` from the heading so text remains visible. The `border` utility is a 1px hairline using the chosen theme's luminance border token. Do not assume the token contrast is compliant until measured.

### 2. Three equal centered cards → content-led composition

Before:

```tsx
<div className="grid grid-cols-1 gap-6 text-center md:grid-cols-3">
  <article><IconA /><h2>{firstTitle}</h2><p>{firstDetail}</p></article>
  <article><IconB /><h2>{secondTitle}</h2><p>{secondDetail}</p></article>
  <article><IconC /><h2>{thirdTitle}</h2><p>{thirdDetail}</p></article>
</div>
```

After, for unequal feature importance:

```tsx
<div className="grid grid-cols-1 gap-6 md:grid-cols-12">
  <article className="border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 text-left md:col-span-7"><IconA /><h2>{firstTitle}</h2><p className="max-w-prose">{firstDetail}</p></article>
  <article className="border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 text-left md:col-span-5"><IconB /><h2>{secondTitle}</h2><p className="max-w-prose">{secondDetail}</p></article>
  <article className="border-t border-[var(--border-subtle)] pt-6 text-left md:col-span-12"><IconC /><h2>{thirdTitle}</h2><p className="max-w-prose">{thirdDetail}</p></article>
</div>
```

Retain all three items and their source order on mobile and desktop. Choose a semantic `<table>` with caption and column/row headers for comparable values, or a responsive split screen for explanatory copy alongside a real product preview. Use the bento layout only when the content supports unequal emphasis; do not fabricate a product preview or comparison data.

### 3. Body measure and changing numbers → readable and stable

Before: `<p className="w-full">{body}</p>` and `<span>{price}</span>`.

After: `<p className="max-w-prose leading-relaxed">{body}</p>` and `<span className="tabular-nums">{price}</span>`. Apply `tabular-nums` to every metric, price, counter, and comparable numeric column; right-align columns where comparison benefits. Tailwind's default `max-w-prose` is 65ch: ensure the project's configured value is 60ch–70ch, or use `max-w-[65ch]` when it has been overridden.

### 4. Light and dark contrast → measured token pairs

For **each** theme, check every foreground/background pair (including muted text, links, focus indicators and alpha-composited surfaces) against the actual rendered background. WCAG AA requires at least **4.5:1** for normal text and **3:1** for large text; AAA requires **7:1** for normal text and **4.5:1** for large text. Large text is at least 24px regular or 18.66px bold. Essential non-text UI and focus indicators need at least **3:1** against adjacent colors. Adjust the semantic token values for each theme until the applicable target is met; never assert that a preset or class alone guarantees AA/AAA. Recheck keyboard focus, content order, responsive stacking, and both themes after transformation.

## 9. Principal design engineering loop

1. Baseline the Design Craft Score with `npx -y unslop-mcp audit . --json`; review all seven SLOP-COLOR, SLOP-TYPE, SLOP-LAYOUT, SLOP-SURFACE, SLOP-COPY, SLOP-UX, and SLOP-TOKEN pillars.
2. Inspect existing components and reuse their semantic primitives before creating new ones. Keep this archetype as the only token source of truth.
3. Generate `npx -y unslop-mcp refactor-plan . --report UNSLOP-REPORT.md` and apply its exact before/after translations in P0, P1, P2 order.
4. Write the information hierarchy and responsive grid first; implement typography and spacing before visual effects. Replace generic three-card clones with content-led compositions.
5. Implement all interaction states: default, hover, focus-visible, active, disabled, loading, empty, error, and success where applicable. Use explicit transitions and reduced-motion behavior.
6. Run `npx -y unslop-mcp audit . --fail-under 95` and resolve every reported location without suppressing rules.
7. Manually verify narrow and wide viewports, keyboard navigation, both themes, contrast, reduced motion, numeric alignment, and content overflow before claiming 95–100/100 (A+).

A passing audit is necessary but not sufficient: never claim visual excellence without checking the rendered result.
<!-- unslop:end -->
