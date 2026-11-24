# Standar Penentuan Harga Jual (+15% HPP Batch FIFO), Akses Darurat & Reimburse Kasir, serta Audit Log & Notifikasi Owner — Design Specification

**Date:** 2026-11-24
**Scope:** POS (`CartLines`, `CheckoutService`, `PosScreen`, `CartLineEditModal`), Inventory (`Product`, `ProductController`, `GoodsReceiptService`, `ProductFormModal`, `GoodsReceiptModal`, `PriceAuditLogView`), and Owner Notifications (`ProductPriceAudit`, `PriceAuditController`, `NotificationBellDropdown`, `App.tsx`).

---

## 1. Understanding Summary

- **What is being built:** A standardized selling-price determination system anchored on **FIFO batch cost (`reference_hpp`) with a mandatory minimum +15% markup**, paired with manual markup flexibility for the Owner (for high-demand Jeep/truck tires and fluctuating supplier batch costs) and a controlled **Cashier price determination & receipt markup workflow** (for `Rp 0` unpriced items and customer reimbursement requests) that logs every action to an **Audit Log** and **Owner Notification Page**.
- **Why it exists:**
  1. **No global fixed percentage markup:** In Magelang, Omah Ban Cabang 3 serves many Jeep (mountain tourism) and heavy truck customers. Certain large tire sizes and brands are scarce with few local competitors, allowing the Owner to take higher margins (`+25%` to `+35%+`), while regular sizes on the same brand can be priced either at the `+15%` minimum standard or manually higher when demand trends upward.
  2. **Batch-to-batch cost fluctuation:** The shop buys independently from second-party suppliers without fixed-price contracts. Batch 1 and Batch 2 costs vary, so selling prices cannot be blindly generalized across batches.
  3. **Preventing missed sales ("kecolongan" when catalog price is `Rp 0`):** If the Owner forgot to set a selling price and is unreachable/busy while a Cashier is serving a buyer, the Cashier can view the HPP inside the POS item modal and set the selling price (minimum `HPP × 1.15`).
  4. **Customer reimbursement requests:** Buyers frequently ask the Cashier to raise the unit price printed on the receipt (`OB3-INV-…`) for office/supervisor reimbursement.
- **Who it is for:** Owner (pricing standard calculator, restock margin warning, audit log & notifications), Kasir (emergency pricing for `Rp 0` items, receipt price markup for reimbursement with mandatory reason), and Gudang (restock batch cost comparison).
- **Key constraints:**
  - Minimum selling price formula: $\text{Effective Unit Price} = \text{unit\_price} - \text{discount\_per\_item} \ge \text{round}(\text{reference\_hpp} \times 1.15, 2)$.
  - `reference_hpp` = $\max(\text{products.product\_cost}, \max(\text{activeBatches.batch\_cost}))$.
  - When catalog price is already set (`> Rp 0`), `KASIR` may only sell at catalog price or **raise** the price (e.g., for reimbursement); `KASIR` cannot lower the effective price below catalog price or below `reference_hpp × 1.15`.
  - Every price determination or override by `KASIR` requires a reason (`min 5 characters`) and is recorded in `product_price_audits` + `sale_details`.
- **Explicit non-goals:**
  - Does not alter SAK EMKM FIFO COGS accounting (`5-1000` / `1-2000` still allocates oldest active batches first via `FifoCostingService::allocateFifo`).
  - Does not expose HPP on public-facing POS catalog cards (HPP is shown only inside the POS line-edit/price-setting modal).

---

## 2. Assumptions & Non-Functional Requirements

- **Server-authoritative validation:** All pricing floor checks (`>= reference_hpp * 1.15`), discount anti-bypass checks, role checks (`KASIR` vs `OWNER`), and reason requirements are enforced in Laravel (`CartLines`, `CheckoutService`, `ProductRequest`) and return HTTP 422 (`PosRuleException`) on violation.
- **Performance:** `activeBatches` is already eager-loaded on `ProductController::index` and locked during `CartLines::build`, so computing `reference_hpp` adds zero extra queries.
- **Transactional atomicity:** Sale creation, emergency catalog price update (when old catalog price was `Rp 0`), and `ProductPriceAudit` insertion execute inside the existing `CheckoutService::checkout` database transaction.

---

## 3. Decision Log

1. **Benchmark HPP (`reference_hpp`):** Chosen `max(product_cost, max(activeBatches.batch_cost))` with `+15%` markup (`HPP × 1.15`) over oldest-batch-only or `product_cost`-only, ensuring multi-batch transitions never undercut the highest active batch cost.
2. **Contextual Effect of Cashier Pricing (`CATALOG_AND_NOTA` vs `NOTA_ONLY`):**
   - If `catalog_price == 0`: updates `products.product_price` temporarily (`applies_to = 'CATALOG_AND_NOTA'`) so subsequent sales are not left at `Rp 0`, and flags Owner for review.
   - If `catalog_price > 0` (reimbursement markup): applies only to the current receipt (`applies_to = 'NOTA_ONLY'`), preserving the master catalog price for regular buyers while still recording the full audit trail and Owner notification.
3. **Discount Anti-Bypass:** Minimum `+15%` and catalog-price floor are checked against net effective unit price (`unit_price - discount_per_item`).
4. **Unified Audit & Notification Storage:** Extended `product_price_audits` additively with `sale_id`, `sale_detail_id`, `reference_hpp`, `markup_percent`, `actor_name`, `actor_role`, `applies_to`, and Owner review columns (`is_read_by_owner`, `is_reviewed_by_owner`, `reviewed_at`, `reviewed_by`, `review_notes`) rather than creating a separate notification table.

---

## 4. Final Technical Design

See `implementation_plan.md` for the full schema, API contracts, UI specifications, and task breakdown.
