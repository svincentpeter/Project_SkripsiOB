# Modular Architecture Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Reconstruct Project_SkripsiOB into a clean, feature-based modular structure with standalone services and consolidated shared resources matching the pattern of ProjectOmahBan.

**Architecture:** Create src/modules/ with 6 distinct feature modules (pos, dashboard, inventory, expenses, accounting, receipt), src/services/ for core business engines (FIFO costing, POS checkout, inventory mutations, accounting auto-journal), and src/shared/ for cross-cutting components, types, formatters, and mock seeds.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite.

**Spec:** docs/superpowers/specs/2026-09-03-modular-architecture-refactor-design.md

## Global Constraints
- Preserve 100% existing functionality: FIFO batch allocation, double-entry auto-journaling SAK EMKM, POS barcode scanner beep, thermal receipt rendering, and Majestic top bar.
- Zero TypeScript compilation errors (
pm run lint / 	sc --noEmit).
- Clean Vite production build (
pm run build).

---

### Task 1: Scaffolding Directory Structure & Shared Resources
- [ ] Create folder structure: src/modules/pos/components, src/modules/dashboard/components, src/modules/inventory/components, src/modules/expenses/components, src/modules/accounting/components, src/modules/receipt/components.
- [ ] Create folder structure: src/services/, src/shared/components/, src/shared/types/, src/shared/utils/, src/shared/data/.
- [ ] Migrate src/types.ts to src/shared/types/index.ts.
- [ ] Migrate src/utils/formatters.ts and create src/shared/utils/formatters.ts and udioUtils.ts.
- [ ] Migrate src/data/mockData.ts to src/shared/data/mockData.ts.
- [ ] Move HeaderNavbar.tsx and WireframeGuideModal.tsx to src/shared/components/.

### Task 2: Core Services Layer Implementation (src/services/)
- [ ] Implement src/services/fifoCostingService.ts (Batch consumption algorithm).
- [ ] Implement src/services/posService.ts (Checkout calculation, invoice numbering, cart operations).
- [ ] Implement src/services/inventoryService.ts (Stock card mutation recording, stock opname calculator).
- [ ] Implement src/services/accountingService.ts (Sales & expense double-entry generator, SAK EMKM report calculator).
- [ ] Implement src/services/storageService.ts (LocalStorage persistence wrapper).
- [ ] Export all services from src/services/index.ts.

### Task 3: Feature Modules Migration (src/modules/)
- [ ] **Module POS**: Move & decouple PosScreen.tsx into src/modules/pos/ with subcomponents (PosProductCatalog, PosCartDocket, PosPaymentModal, PosSupervisorModal).
- [ ] **Module Dashboard**: Move & decouple ExecutiveDashboardScreen.tsx into src/modules/dashboard/ with Majestic subcomponents (DashboardKpiStrip, DashboardSparklineCards, DashboardTrendChart, DashboardBrandDonut, DashboardFastMovingTable).
- [ ] **Module Inventory**: Move & decouple InventoryScreen.tsx into src/modules/inventory/ with subcomponents (ProductFifoBatchList, StockCardDrawer, StockOpnameModal).
- [ ] **Module Expenses**: Move & decouple ExpensesScreen.tsx into src/modules/expenses/ with subcomponents (ExpenseFormModal, ExpenseTable).
- [ ] **Module Accounting**: Consolidate GeneralLedgerScreen.tsx and FinancialStatementsScreen.tsx into src/modules/accounting/ with subcomponents (GeneralLedgerView, ProfitLossStatement, BalanceSheetStatement).
- [ ] **Module Receipt**: Move ThermalReceiptScreen.tsx into src/modules/receipt/ with ThermalReceiptPaper.

### Task 4: Wiring src/App.tsx & Clean Up Legacy Files
- [ ] Update src/App.tsx imports to point to src/modules/..., src/services/..., and src/shared/....
- [ ] Remove deprecated unmodular files in src/components/ once migrated.
- [ ] Update path aliases or relative imports.

### Task 5: Verification & End-to-End Build
- [ ] Run 
pm run lint (	sc --noEmit) to verify 0 TypeScript errors across all modules.
- [ ] Run 
pm run build (ite build) to confirm production bundle success.
- [ ] Update walkthrough.md with complete modular architecture documentation.
