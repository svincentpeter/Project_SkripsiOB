# Implementation Plan: Modul Inventori, CRUD Master Ban, Autonumeric & FIFO Restock

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul inventori dan master stok ban lengkap dengan operasi CRUD, generator autonumeric (SKU, barcode EAN-13, nomor GRN, nomor batch FIFO, ID mutasi, nomor opname), alur penerimaan barang masuk (restock), kartu stok mutasi, dan penyesuaian opname fisik.

**Architecture:** Arsitektur modular berbasis fitur (*Feature-Based Architecture*) memecah antarmuka inventori ke dalam 5 sub-komponen terfokus di `src/modules/inventory/components/`, memusatkan seluruh logika kalkulasi dan autonumeric di `src/services/inventoryService.ts`, serta menghubungkan status mutasi dan persediaan ke *state store* di `App.tsx` dengan persistensi `localStorage`.

**Tech Stack:** React 19, TypeScript ~5.8, Tailwind CSS v4, Lucide React icons, Vite 6.

**Spec:** [docs/superpowers/specs/2026-09-03-inventory-crud-autonumeric-design.md](file:///c:/laragon/www/Project_SkripsiOB/docs/superpowers/specs/2026-09-03-inventory-crud-autonumeric-design.md)

## Global Constraints
- Kondisi ban fokus Cabang 3 adalah `'BARU'`.
- Seluruh kode mutasi dan nomor faktur harus konsisten dengan format autonumeric yang disepakati.
- Kompatibilitas field ganda dipertahankan (`name` & `product_name`, `stock` & `product_quantity`, `cost_price` & `product_cost`, `price` & `product_price`).
- Soft-delete digunakan jika produk pernah memiliki riwayat mutasi/transaksi (`is_active: false`).

---

### Task 1: Extend Shared Types for Inventory CRUD & Restock
**Files:**
- Modify: `src/shared/types/index.ts`

**Interfaces:**
- Produces: `CreateProductInput`, `GoodsReceiptInput`, `UpdateProductInput`, extended `TireProduct`

- [ ] **Step 1: Add new input interfaces to shared types**
  Tambahkan definisi tipe `CreateProductInput` dan `GoodsReceiptInput` di `src/shared/types/index.ts`.
- [ ] **Step 2: Run type check**
  Run: `npm run lint`
  Expected: PASS tanpa error sintaks.

---

### Task 2: Implement Autonumeric & Business Logic in `inventoryService.ts`
**Files:**
- Modify: `src/services/inventoryService.ts`
- Modify: `src/services/index.ts`

**Interfaces:**
- Produces:
  - `generateProductSku(brand, width, ratio, ring, motif): string`
  - `generateBarcodeEan13(existingBarcodes: string[]): string`
  - `generateGrnNumber(existingMutations: StockMutation[]): string`
  - `generateBatchCode(existingBatches: ProductBatch[]): string`
  - `generateMutationId(): string`
  - `generateOpnameDocNumber(existingMutations: StockMutation[]): string`
  - `createProductWithInitialStock(input, existingProducts): { product: TireProduct, mutation?: StockMutation }`
  - `processGoodsReceipt(product, input): { updatedProduct: TireProduct, newBatch: ProductBatch, mutation: StockMutation }`
  - `calculateInventoryValuation(products): { totalPcs, totalValuationHpp, totalValuationJual, lowStockCount, outOfStockCount }`

- [ ] **Step 1: Write autonumeric generators and business logic**
  Implementasikan generator SKU, barcode EAN-13, GRN, Batch code, Mutation ID, Opname Ref, createProduct, processGoodsReceipt, dan calculateInventoryValuation di `src/services/inventoryService.ts`.
- [ ] **Step 2: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 3: Build `ProductFifoBatchList.tsx` & `StockCardDrawer.tsx`
**Files:**
- Create: `src/modules/inventory/components/ProductFifoBatchList.tsx`
- Create: `src/modules/inventory/components/StockCardDrawer.tsx`

**Interfaces:**
- Consumes: `ProductBatch`, `StockMutation`, `TireProduct`
- Produces: UI component drawer riwayat mutasi dengan tab filter dan visualisasi lapisan batch pembelian FIFO.

- [ ] **Step 1: Create `ProductFifoBatchList.tsx`**
  Menampilkan kartu-kartu batch aktif dengan status tanggal, supplier, sisa unit/total awal, dan HPP modal per unit.
- [ ] **Step 2: Create `StockCardDrawer.tsx`**
  Menampilkan ringkasan produk, menyematkan `ProductFifoBatchList`, filter mutasi (SEMUA, MASUK, KELUAR, PENYESUAIAN), dan tabel riwayat transaksi dengan running balance.
- [ ] **Step 3: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 4: Build `ProductFormModal.tsx` (Tambah & Edit Master Ban)
**Files:**
- Create: `src/modules/inventory/components/ProductFormModal.tsx`

**Interfaces:**
- Consumes: `generateProductSku`, `generateBarcodeEan13`, `TireProduct`, `TireBrand`, `TireRing`
- Produces: Modal form tambah/edit ban dengan tombol auto-generate SKU & Barcode serta switch stok awal.

- [ ] **Step 1: Implement `ProductFormModal.tsx`**
  Input field lengkap: Brand, Seri, Ukuran, Motif, Tahun, Harga Modal, Harga Jual, Min Stock, Auto-SKU, Auto-Barcode, dan tab stok awal.
- [ ] **Step 2: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 5: Build `GoodsReceiptModal.tsx` (Penerimaan Restock Barang)
**Files:**
- Create: `src/modules/inventory/components/GoodsReceiptModal.tsx`

**Interfaces:**
- Consumes: `TireProduct`, `generateGrnNumber`, `generateBatchCode`, `processGoodsReceipt`
- Produces: Modal restock ban dengan pemilihan produk cepat, input supplier, nomor faktur, qty masuk, tanggal, dan auto nomor GRN/Batch.

- [ ] **Step 1: Implement `GoodsReceiptModal.tsx`**
- [ ] **Step 2: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 6: Build `StockOpnameModal.tsx` (Hitung Fisik vs Sistem)
**Files:**
- Create: `src/modules/inventory/components/StockOpnameModal.tsx`

**Interfaces:**
- Consumes: `TireProduct`, `StockMutation`
- Produces: Modal hitung opname fisik dengan kalkulasi selisih unit & selisih HPP instan.

- [ ] **Step 1: Implement `StockOpnameModal.tsx`**
- [ ] **Step 2: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 7: Assemble `InventoryScreen.tsx` and Barrel Export
**Files:**
- Create: `src/modules/inventory/components/index.ts`
- Modify: `src/modules/inventory/InventoryScreen.tsx`

**Interfaces:**
- Mengintegrasikan kelima sub-komponen ke layar utama `InventoryScreen.tsx`.
- Menyediakan tombol aksi header: Tambah Ban Baru, Penerimaan Barang (Restock), dan Stock Opname.
- Kolom aksi tabel ban: Kartu Stok, Restock Cepat, Edit Ban, Nonaktifkan/Hapus.

- [ ] **Step 1: Create barrel export `components/index.ts`**
- [ ] **Step 2: Refactor `InventoryScreen.tsx`**
- [ ] **Step 3: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 8: Wire Handlers & State in `App.tsx`
**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Mengaitkan handler `handleCreateProduct`, `handleUpdateProduct`, `handleGoodsReceipt`, `handleDeleteOrDeactivateProduct`, dan `handleUpdateProductStock` dari `App.tsx` ke `InventoryScreen.tsx`.
- Memastikan persistensi `localStorage` berjalan mulus.

- [ ] **Step 1: Add CRUD & Goods Receipt handlers in `App.tsx`**
- [ ] **Step 2: Pass handlers to `InventoryScreen`**
- [ ] **Step 3: Verify with linting**
  Run: `npm run lint`
  Expected: PASS

---

### Task 9: Final Build & End-to-End Verification
- [ ] **Step 1: Run TypeScript type check**
  Run: `npm run lint`
  Expected: 0 errors
- [ ] **Step 2: Run production build**
  Run: `npm run build`
  Expected: Bundling Vite sukses tanpa error
- [ ] **Step 3: Document walkthrough & results**
