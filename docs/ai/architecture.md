# Architecture

## Big picture

```
Browser (React SPA, :3000)                      Laravel API (:8000/api/v1)            MySQL
┌──────────────────────────────────────┐        ┌──────────────────────────────┐      ┌──────────────┐
│ App.tsx  (state + handlers)          │ Bearer │ routes/api.php               │      │ project-     │
│   ├─ modules/* screens (props only)  │ ─────► │  auth:sanctum + permission:* │ ───► │ skripsi_ob   │
│   ├─ services/api/* + mappers        │ ◄───── │ Controllers → Services       │      │              │
│   └─ localStorage ob3_* (legacy data)│  JSON  │  → JournalDraft/Accounting   │      └──────────────┘
└──────────────────────────────────────┘        └──────────────────────────────┘
```

## Frontend

### Shell and navigation (`src/App.tsx`)
- There is **no router**. `activeScreen` state (`ActiveScreen` in `src/shared/types/index.ts`) picks one of
  `pos | receipt | dashboard | inventory | expenses | ledger | financials | settings`. There are no URLs or deep links.
- Render order: auth-checking spinner → `LoginScreen` if no user → `pos` full-screen (no header) → every other
  screen with `HeaderNavbar`.
- Screen gates live in `isScreenPermittedForRole` / `getDefaultScreenForUser`
  (`src/services/authNavigationService.ts`):

  | Screen | Permission |
  |---|---|
  | dashboard | `dashboard` |
  | pos | `pos` |
  | receipt (Riwayat Struk) | `receipt` |
  | inventory (Produk & Jasa) | `inventory_view` |
  | expenses (Biaya Toko) | `expenses` |
  | ledger (Buku Besar) | `accounting_hub` or `accounts_payable` |
  | financials (Laporan Keuangan) | `financial_reports` |
  | settings | `role_settings` (the Roles tab is OWNER only) |

- Action-level gates use `can(key)` from App.tsx, passed down as booleans (for example `canVoid={can('sale_void')}`).
- Sub-tabs inside a screen are local `useState` (Inventory: `katalog | buku_fifo | kategori | jasa | stok_mutasi | supplier`;
  Ledger: `journals | ledger | trial-balance | payables | reports`).

### State
- All app-wide state (~25 `useState`) lives in `MainAppContent` in `App.tsx`. Screens get data through props and
  report changes through `onXxx` callbacks that App.tsx defines. There is no Redux/Zustand/React Query, and the only
  context is `ToastProvider`.
- After login, `loadPosData` fetches products, services, categories, suppliers, sales, and
  purchases in parallel, filtered by permission. Each call does `.catch(() => null)`, so failures are silent.
- When adding a server-backed feature: add a typed function in `src/services/api/<area>Api.ts`, a mapper if the wire
  shape differs, a handler in App.tsx that calls it and updates state from the **response**, and pass it down.

### localStorage keys still in use
`ob3_auth_token`, `ob3_store_settings` (receipt/store text only; legacy `bank_providers`,
`qris_providers`, `edc_settings` and `coa_receivable_account` properties are dropped on load), `ob3_cart`,
`ob3_parked_orders`, `ob3_read_notif_ids`, `ob3_dismissed_notif_ids`. Legacy or fallback only: `ob3_products`,
`ob3_stock_staging`, `omahban_product_categories`, `omahban_service_categories`. Local data is seeded from
`src/shared/data/mockData.ts`. `App.tsx` removes the old accounting keys (`ob3_journals`, `ob3_expenses`,
`ob3_account_balances`, `ob3_period_info`) and the old drawer counter `ob3_cash_drawer` on mount.

### API client (`src/services/api/`)
- `apiClient.ts`: base URL from `VITE_API_URL` (default `http://127.0.0.1:8000/api/v1`). The token lives in
  localStorage `ob3_auth_token` and is sent as `Authorization: Bearer`. Timeouts: 10 s JSON, 30–45 s upload.
- Errors are thrown as `ApiError(message, status, data)`: status 0 means network failure, 408 means timeout, and the
  message comes from the server's `message`. A **401** clears the token and triggers the handler registered with
  `setUnauthorizedHandler` (App.tsx logs the user out with a "Sesi Berakhir" toast).
- Modules: `authApi`, `productApi`, `posApi`, `inventoryApi`, `paymentApi`, `stockReconciliationApi` (imported
  directly), and `expenseApi` / `accountingApi`. Accounting screens call them through `useServerData`
  (`src/modules/accounting/hooks/useServerData.ts`), a small hook keyed by the chosen period and by
  `ledgerVersion`, a counter in `App.tsx` that `notifyLedgerChanged` increments whenever a server action
  returns journals (checkout, void, expense, manual journal, period close/reopen, opening balance, …). There
  is no local fallback: a failed load shows an inline error with retry.
- Mappers (`posMappers.ts`, `inventoryMappers.ts`) convert server rows to UI types from `src/shared/types/index.ts`:
  numeric strings become `Number`, ids become `String`, and alias fields are filled in. Both sides use snake_case.
  Wire types (`ApiSale`, `ApiJournal`, …) live next to the mappers. Payload builders (`cartLineToPayload`,
  `buildPayments`, `productPayload`, `restockPayload`) also live there.
- `stockReconciliationApi.ts` falls back to client-side Excel parsing and local writes on **any** error, including
  a server 422. That fallback is legacy and can hide real server rejections.

### Auth flow
1. `LoginScreen` → `authApi.login(login, password)` → `POST /auth/login`, which returns `{token, expires_at, user}`.
2. `startSession(user)` fetches `GET /settings/role-permissions` (on error it falls back to `DEFAULT_ROLE_PERMISSIONS`),
   sets the user, and selects the default screen.
3. On reload, if a token exists, `GET /auth/me` restores the user; on failure the token is cleared.
4. Logout: `POST /auth/logout`. The token is cleared even if that request fails.
5. Client checks: `hasPermission(user, rolePermissions, key)` returns true for OWNER, otherwise the matrix value. The
   server-computed `user.permissions` is not read on the client. The **server is the real enforcement**.
6. Dev only (`import.meta.env.DEV`): quick-login cards for owner, kasir, and gudang. They log in through the server
   when `VITE_DEV_LOGIN_PASSWORD` is set in `.env.local`.

### Export system (`src/shared/export/`)
- `ExportDoc = { reportId, title, orientation, kop, sections[{columns, rows, totals?}] }`. Column types are
  `text | number | currency | date | percent`.
- `registry.ts`: `REPORT_MAPPERS` maps each report id to `(data, ctx) => ExportDoc`, built with `makeDoc()`.
  `REPORT_FORMATS` lists the formats allowed per report.
- `useExport` + `<ExportMenu reportId data ctx />` lazy-load a writer (`writers/pdf.ts` pdfmake,
  `xlsx.ts` exceljs, `docx.ts`, `csv.ts`) and download the file. The letterhead (kop) comes from
  `setExportConfig`, which App.tsx calls with the store settings. File names come from `naming.ts`.
- To add a report: write a mapper, register it in `REPORT_MAPPERS` and `REPORT_FORMATS` (the type forces both),
  render `<ExportMenu>`, and add a case to `src/shared/export/__tests__/registry.test.ts`.
- One exception: the monthly FIFO stock ledger Excel uses `stockLedgerExcel.ts` directly, outside the registry.

### UI conventions
- Tailwind v4 via `@tailwindcss/vite`, with `@import "tailwindcss"` in `src/index.css`. There is no Tailwind config
  and no design tokens; colors are hard-coded (slate/blue).
- Icons come from `lucide-react`. Money inputs use `MoneyInput` (id-ID grouping, emits a number). Toasts use
  `useToast()`. Formatters (`formatRupiah`, `formatDateIndo`, `terbilangRupiah`) are in `src/shared/utils/formatters.ts`.
- UI text is Indonesian, with `id-ID` number and date formatting. Deletes use `window.confirm`.
- Print CSS targets `#thermal-receipt-printable` (80 mm), `#a4-invoice-printable`, and `#pos-quick-nota-printable`.
- Imports are relative. The `@/*` alias exists but is unused.

### Dead or legacy code (do not extend)
- **Supabase:** `src/services/supabaseClient.ts` returns `null` unless `VITE_SUPABASE_*` is set (it is not), so every
  `*ToSupabase` call is a no-op.
- **Unused dependencies:** `express`, `dotenv`, `tsx`, `motion`, `@supabase/ssr`, and `GEMINI_API_KEY` are leftovers
  from the AI Studio template (package name `react-example`).
- **Superseded local services:** most of `inventoryService.ts`, `serviceMasterService.ts`, `productCategoryService.ts`,
  and `supplierService.ts` have been replaced by the API. App.tsx still imports many of their functions but does not call them.
- **Duplicates:** `calculateCartTotals` exists in both `posService.ts` and `formatters.ts`.

## Backend

Request path: `auth:sanctum` → `permission:<keys>` (`EnsurePermission`) → controller (validation, often a
FormRequest) → service in a DB transaction → `JournalDraft::post()` → `AccountingEngine::createEntry()`. JSON
rendering applies to every `api/*` request (`bootstrap/app.php`). See [../../backend/AGENTS.md](../../backend/AGENTS.md).

## Deployment
- Vercel serves only the frontend build (`.vercelignore` excludes `backend`). In production, `VITE_API_URL` must point
  to a hosted Laravel instance; none exists yet.
- The Vite dev server proxies `/api` to :8000, but only if `VITE_API_URL=/api/v1`. By default the browser calls
  :8000 directly.
