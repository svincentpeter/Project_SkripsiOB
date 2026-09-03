-- ==============================================================================
-- DATABASE SCHEMA & SEED DATA: project-skripsi_ob
-- Point of Sale (POS) & Keuangan SAK EMKM - Omah Ban Cabang 3 (OB3)
-- Karakteristik: Standalone, Khusus Ban BARU (condition_code = 'BARU'),
-- Costing Method: FIFO (product_batches & sale_batch_allocations)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `project-skripsi_ob` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `project-skripsi_ob`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `journal_items`;
DROP TABLE IF EXISTS `journal_entries`;
DROP TABLE IF EXISTS `accounts`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `expense_categories`;
DROP TABLE IF EXISTS `stock_movements`;
DROP TABLE IF EXISTS `sale_batch_allocations`;
DROP TABLE IF EXISTS `sale_details`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `product_batches`;
DROP TABLE IF EXISTS `products`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. Table: products (Master Produk Ban Baru)
-- ------------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_name` VARCHAR(150) NOT NULL,
  `product_code` VARCHAR(50) NOT NULL UNIQUE,
  `barcode` VARCHAR(50) NOT NULL UNIQUE,
  `brand` VARCHAR(50) NOT NULL,
  `size_width` INT UNSIGNED NOT NULL COMMENT 'Lebar tapak mm, misal: 185',
  `size_ratio` INT UNSIGNED NOT NULL COMMENT 'Aspek rasio %, misal: 65',
  `ring` VARCHAR(10) NOT NULL COMMENT 'Diameter velg, misal: R15',
  `product_size` VARCHAR(30) NOT NULL COMMENT 'Ukuran lengkap, misal: 185/65 R15',
  `motif` VARCHAR(80) NOT NULL COMMENT 'Pola tapak kembangan ban',
  `condition_code` VARCHAR(20) NOT NULL DEFAULT 'BARU' COMMENT 'Selalu BARU di Cabang 3',
  `product_year` VARCHAR(10) NOT NULL DEFAULT '2026',
  `product_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'HPP Default / Terakhir',
  `product_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Harga Jual Normal',
  `product_quantity` INT NOT NULL DEFAULT 0 COMMENT 'Sisa Stok Fisik Gudang',
  `product_stock_alert` INT NOT NULL DEFAULT 5 COMMENT 'Batas Minimum Notifikasi Kritis',
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_products_barcode` (`barcode`),
  INDEX `idx_products_brand_ring` (`brand`, `ring`),
  INDEX `idx_products_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: product_batches (Lapisan Batch Pembelian untuk FIFO Costing)
-- ------------------------------------------------------------------------------
CREATE TABLE `product_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_code` VARCHAR(50) NOT NULL UNIQUE,
  `source_name` VARCHAR(150) NOT NULL COMMENT 'Nama Supplier Distributor Ban',
  `purchase_date` DATE NOT NULL,
  `batch_cost` DECIMAL(15,2) NOT NULL COMMENT 'HPP Per Satuan Ban Pada Batch Ini',
  `initial_qty` INT UNSIGNED NOT NULL COMMENT 'Jumlah Awal Pembelian',
  `remaining_qty` INT UNSIGNED NOT NULL COMMENT 'Sisa Stok di Batch Ini (FIFO Depletion)',
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_batches_product_fifo` (`product_id`, `purchase_date` ASC),
  CONSTRAINT `fk_batches_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. Table: sales (Header Transaksi Penjualan Kasir POS)
-- ------------------------------------------------------------------------------
CREATE TABLE `sales` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nomor Nota: OB3-INV-202609-XXXX',
  `date` DATE NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL DEFAULT 'Pelanggan Walk-In',
  `vehicle_plate` VARCHAR(30) NOT NULL DEFAULT 'Umum' COMMENT 'Plat Nomor Mobil Konsumen',
  `cashier_name` VARCHAR(80) NOT NULL DEFAULT 'Fani A.',
  `gross_sales_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Total Kotor Sebelum Diskon',
  `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Total Potongan Diskon',
  `tax_percentage` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'PPN 0% / 11%',
  `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Grand Total Tagihan',
  `paid_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Uang Diterima dari Pelanggan',
  `payment_method` VARCHAR(30) NOT NULL COMMENT 'TUNAI, TRANSFER_BCA, QRIS, DEBIT_CARD',
  `payment_reference` VARCHAR(100) NULL COMMENT 'No Trace EDC / ID QRIS / Ref MBCA',
  `total_hpp` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Total HPP Hasil Kalkulasi FIFO',
  `total_profit` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Laba Kotor Transaksi',
  `notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'LUNAS',
  `stock_deducted` TINYINT(1) NOT NULL DEFAULT 1,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sales_reference` (`reference`),
  INDEX `idx_sales_date` (`date`),
  INDEX `idx_sales_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: sale_details (Item Rincian Penjualan)
-- ------------------------------------------------------------------------------
CREATE TABLE `sale_details` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sale_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT UNSIGNED NOT NULL,
  `unit_price` DECIMAL(15,2) NOT NULL,
  `sub_total` DECIMAL(15,2) NOT NULL,
  `unit_cost_hpp` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_cost_hpp` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `profit_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_sale_details_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sale_details_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: sale_batch_allocations (Pencatatan Alokasi Batch FIFO Tiap Item Penjualan)
-- ------------------------------------------------------------------------------
CREATE TABLE `sale_batch_allocations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sale_detail_id` BIGINT UNSIGNED NOT NULL,
  `product_batch_id` BIGINT UNSIGNED NOT NULL,
  `quantity_allocated` INT UNSIGNED NOT NULL,
  `unit_cost` DECIMAL(15,2) NOT NULL,
  `total_cost` DECIMAL(15,2) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_alloc_sale_detail` FOREIGN KEY (`sale_detail_id`) REFERENCES `sale_details` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_alloc_batch` FOREIGN KEY (`product_batch_id`) REFERENCES `product_batches` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: stock_movements (Mutasi Riwayat Keluar/Masuk Stok & Kartu Stok)
-- ------------------------------------------------------------------------------
CREATE TABLE `stock_movements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `movement_type` ENUM('MASUK', 'KELUAR', 'PENYESUAIAN') NOT NULL,
  `quantity` INT NOT NULL,
  `balance_after` INT NOT NULL,
  `reference_type` VARCHAR(50) NOT NULL COMMENT 'SALE, PURCHASE, OPNAME_ADJUSTMENT',
  `reference_id` VARCHAR(50) NOT NULL COMMENT 'No Nota / No Dokumen',
  `description` TEXT NOT NULL,
  `operator_name` VARCHAR(80) NOT NULL,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_movements_product` (`product_id`, `created_at` DESC),
  CONSTRAINT `fk_movements_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: expense_categories (Kategori Biaya Operasional)
-- ------------------------------------------------------------------------------
CREATE TABLE `expense_categories` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category_code` VARCHAR(20) NOT NULL UNIQUE,
  `category_name` VARCHAR(100) NOT NULL,
  `default_account_code` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table: expenses (Pencatatan Biaya Pengeluaran Kas & Bank)
-- ------------------------------------------------------------------------------
CREATE TABLE `expenses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference` VARCHAR(50) NOT NULL UNIQUE COMMENT 'BIAYA-OB3-202609-XXX',
  `expense_date` DATE NOT NULL,
  `category_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `payment_method` VARCHAR(30) NOT NULL COMMENT 'Cash / Transfer',
  `bank_name` VARCHAR(50) NULL COMMENT 'BCA',
  `recipient_name` VARCHAR(120) NOT NULL,
  `description` TEXT NOT NULL,
  `attachment_path` VARCHAR(255) NULL,
  `approved_by` VARCHAR(80) NOT NULL,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. Table: accounts (Chart of Accounts / Bagan Akun Standar SAK EMKM)
-- ------------------------------------------------------------------------------
CREATE TABLE `accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_code` VARCHAR(20) NOT NULL UNIQUE,
  `account_name` VARCHAR(120) NOT NULL,
  `account_type` ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE') NOT NULL,
  `normal_balance` ENUM('DEBIT', 'CREDIT') NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 10. Table: journal_entries (Header Jurnal Umum Double-Entry)
-- ------------------------------------------------------------------------------
CREATE TABLE `journal_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entry_number` VARCHAR(50) NOT NULL UNIQUE COMMENT 'JNL-OB3-202609-XXXX',
  `entry_date` DATE NOT NULL,
  `reference_type` VARCHAR(50) NOT NULL COMMENT 'SALE, EXPENSE, ADJUSTMENT',
  `reference_id` VARCHAR(50) NOT NULL COMMENT 'No Nota / No Biaya',
  `description` TEXT NOT NULL,
  `total_debit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_credit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(20) NOT NULL DEFAULT 'POSTED',
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_journal_ref` (`reference_id`),
  INDEX `idx_journal_date` (`entry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 11. Table: journal_items (Baris Item Debit/Kredit Double-Entry)
-- ------------------------------------------------------------------------------
CREATE TABLE `journal_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `journal_entry_id` BIGINT UNSIGNED NOT NULL,
  `account_id` BIGINT UNSIGNED NOT NULL,
  `debit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `note` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_jitems_entry` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jitems_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SEED DATA: Chart of Accounts (COA) Resmi Standar SAK EMKM Omah Ban Cabang 3
-- ==============================================================================
INSERT INTO `accounts` (`id`, `account_code`, `account_name`, `account_type`, `normal_balance`) VALUES
(1, '1-1000', 'Kas Toko Laci Kasir', 'ASSET', 'DEBIT'),
(2, '1-1001', 'Bank BCA Cabang 3', 'ASSET', 'DEBIT'),
(3, '1-1002', 'Piutang Dagang (AR)', 'ASSET', 'DEBIT'),
(4, '1-2000', 'Persediaan Ban Baru Cabang 3', 'ASSET', 'DEBIT'),
(5, '1-3000', 'Peralatan Bengkel & Mesin Spooring', 'ASSET', 'DEBIT'),
(6, '1-3999', 'Akumulasi Penyusutan Mesin', 'ASSET', 'CREDIT'),
(7, '2-1000', 'Hutang Dagang Supplier (AP)', 'LIABILITY', 'CREDIT'),
(8, '2-1003', 'PPN Keluaran (11%)', 'LIABILITY', 'CREDIT'),
(9, '3-1000', 'Modal Disetor Pemilik', 'EQUITY', 'CREDIT'),
(10, '3-2000', 'Laba Ditahan Cabang 3', 'EQUITY', 'CREDIT'),
(11, '4-1000', 'Pendapatan Penjualan Ban Baru', 'REVENUE', 'CREDIT'),
(12, '4-9000', 'Potongan Diskon Penjualan', 'REVENUE', 'DEBIT'),
(13, '5-1000', 'Harga Pokok Penjualan (HPP) Ban Baru', 'EXPENSE', 'DEBIT'),
(14, '6-1000', 'Beban Gaji & Uang Makan Karyawan', 'EXPENSE', 'DEBIT'),
(15, '6-1001', 'Beban Listrik, Air & Internet', 'EXPENSE', 'DEBIT'),
(16, '6-1003', 'Beban Sewa Bangunan Toko', 'EXPENSE', 'DEBIT'),
(17, '6-1004', 'Beban Transportasi & Pengiriman Ban', 'EXPENSE', 'DEBIT'),
(18, '6-1005', 'Beban Perlengkapan & ATK Toko', 'EXPENSE', 'DEBIT'),
(19, '6-1006', 'Beban Perawatan Mesin Spooring & Balancing', 'EXPENSE', 'DEBIT'),
(20, '6-1007', 'Beban Konsumsi & Lembur Karyawan', 'EXPENSE', 'DEBIT'),
(21, '6-1008', 'Beban Pajak & Retribusi Daerah', 'EXPENSE', 'DEBIT');

-- ==============================================================================
-- SEED DATA: Expense Categories
-- ==============================================================================
INSERT INTO `expense_categories` (`id`, `category_code`, `category_name`, `default_account_code`) VALUES
(1, 'EXP-PLN', 'Listrik & Air (PLN/PDAM)', '6-1001'),
(2, 'EXP-GAJI', 'Gaji & Uang Makan Montir', '6-1000'),
(3, 'EXP-SEWA', 'Sewa Lahan & Bangunan', '6-1003'),
(4, 'EXP-TRANS', 'Transport & Pengiriman Ban', '6-1004'),
(5, 'EXP-ATK', 'ATK & Keperluan Bengkel', '6-1005'),
(6, 'EXP-RAWAT', 'Pemeliharaan Mesin Spooring & Balancing', '6-1006'),
(7, 'EXP-MAKAN', 'Konsumsi & Lembur Karyawan', '6-1007'),
(8, 'EXP-PAJAK', 'Pajak & Retribusi Daerah', '6-1008');

-- ==============================================================================
-- SEED DATA: Master Produk Ban Baru (12 SKU Terlengkap Cabang 3)
-- ==============================================================================
INSERT INTO `products` (`id`, `product_name`, `product_code`, `barcode`, `brand`, `size_width`, `size_ratio`, `ring`, `product_size`, `motif`, `condition_code`, `product_year`, `product_cost`, `product_price`, `product_quantity`, `product_stock_alert`, `branch_id`) VALUES
(1, 'Bridgestone Ecopia EP150', 'BS-EP150-1856515', '888600100115', 'Bridgestone', 185, 65, 'R15', '185/65 R15', 'Ecopia EP150 Eco Saver', 'BARU', '2026', 640000.00, 780000.00, 24, 5, 3),
(2, 'Bridgestone Turanza T005A', 'BS-T005A-2055516', '888600100224', 'Bridgestone', 205, 55, 'R16', '205/55 R16', 'Turanza T005A Luxury Touring', 'BARU', '2026', 920000.00, 1150000.00, 16, 4, 3),
(3, 'Bridgestone Dueler A/T 697', 'BS-D697-2656517', '888600100331', 'Bridgestone', 265, 65, 'R17', '265/65 R17', 'Dueler All-Terrain 697', 'BARU', '2026', 1580000.00, 1950000.00, 12, 4, 3),
(4, 'Accelera Phi-R Sport', 'AC-PHIR-1955016', '899400200118', 'Accelera', 195, 50, 'R16', '195/50 R16', 'Phi-R Dynamic Asymmetric', 'BARU', '2026', 480000.00, 610000.00, 18, 5, 3),
(5, 'Accelera Eco Plush Daily', 'AC-ECOP-1756514', '899400200225', 'Accelera', 175, 65, 'R14', '175/65 R14', 'Eco Plush Comfort City', 'BARU', '2026', 390000.00, 495000.00, 3, 5, 3),
(6, 'Accelera Omikron A/T', 'AC-OMIK-2357016', '899400200332', 'Accelera', 235, 70, 'R16', '235/70 R16', 'Omikron Aggressive A/T', 'BARU', '2026', 820000.00, 1020000.00, 10, 4, 3),
(7, 'Dunlop Enasave EC300+', 'DN-EC300-1857014', '899200300112', 'Dunlop', 185, 70, 'R14', '185/70 R14', 'Enasave Low Rolling Resistance', 'BARU', '2026', 510000.00, 635000.00, 22, 5, 3),
(8, 'Dunlop SP Sport LM705', 'DN-LM705-1956515', '899200300229', 'Dunlop', 195, 65, 'R15', '195/65 R15', 'SP Sport LM705 Silent Core', 'BARU', '2026', 690000.00, 840000.00, 15, 5, 3),
(9, 'Dunlop Grandtrek AT5', 'DN-AT5-2656018', '899200300336', 'Dunlop', 265, 60, 'R18+', '265/60 R18', 'Grandtrek AT5 Tough SUV', 'BARU', '2026', 1720000.00, 2120000.00, 8, 3, 3),
(10, 'Forceum Octa Street', 'FC-OCTA-2054517', '899500400119', 'Forceum', 205, 45, 'R17', '205/45 R17', 'Octa High Grip Sport Ribs', 'BARU', '2026', 530000.00, 675000.00, 14, 4, 3),
(11, 'Forceum Ecosa Comfort', 'FC-ECOSA-1658013', '899500400226', 'Forceum', 165, 80, 'R13', '165/80 R13', 'Ecosa Durability City', 'BARU', '2026', 340000.00, 430000.00, 2, 5, 3),
(12, 'Hankook Kinergy Eco2', 'HK-K435-1856015', '880800500114', 'Hankook', 185, 60, 'R15', '185/60 R15', 'Kinergy Eco2 K435 Wet Grip', 'BARU', '2026', 560000.00, 710000.00, 20, 5, 3);

-- ==============================================================================
-- SEED DATA: FIFO Batches (product_batches)
-- ==============================================================================
INSERT INTO `product_batches` (`id`, `product_id`, `batch_code`, `source_name`, `purchase_date`, `batch_cost`, `initial_qty`, `remaining_qty`, `branch_id`) VALUES
(1, 1, 'BATCH-202607-BS01', 'PT Bridgestone Tire Indonesia', '2026-07-15', 635000.00, 12, 10, 3),
(2, 1, 'BATCH-202608-BS02', 'PT Bridgestone Tire Indonesia', '2026-08-10', 645000.00, 14, 14, 3),
(3, 2, 'BATCH-202607-BS03', 'PT Bridgestone Tire Indonesia', '2026-07-20', 910000.00, 8, 6, 3),
(4, 2, 'BATCH-202608-BS04', 'PT Bridgestone Tire Indonesia', '2026-08-15', 930000.00, 10, 10, 3),
(5, 3, 'BATCH-202607-BS05', 'PT Bridgestone Tire Indonesia', '2026-07-28', 1560000.00, 6, 4, 3),
(6, 3, 'BATCH-202608-BS06', 'PT Bridgestone Tire Indonesia', '2026-08-18', 1600000.00, 8, 8, 3),
(7, 4, 'BATCH-202608-EP01', 'PT Elangperdana Tyre Industry', '2026-08-05', 480000.00, 18, 18, 3),
(8, 5, 'BATCH-202607-EP02', 'PT Elangperdana Tyre Industry', '2026-07-10', 390000.00, 10, 3, 3),
(9, 6, 'BATCH-202608-EP03', 'PT Elangperdana Tyre Industry', '2026-08-12', 820000.00, 10, 10, 3),
(10, 7, 'BATCH-202607-SR01', 'PT Sumi Rubber Indonesia', '2026-07-25', 505000.00, 12, 10, 3),
(11, 7, 'BATCH-202608-SR02', 'PT Sumi Rubber Indonesia', '2026-08-20', 515000.00, 12, 12, 3),
(12, 8, 'BATCH-202608-SR03', 'PT Sumi Rubber Indonesia', '2026-08-08', 690000.00, 15, 15, 3),
(13, 9, 'BATCH-202607-SR04', 'PT Sumi Rubber Indonesia', '2026-07-30', 1720000.00, 8, 8, 3),
(14, 10, 'BATCH-202608-EP04', 'PT Elangperdana Tyre Industry', '2026-08-14', 530000.00, 14, 14, 3),
(15, 11, 'BATCH-202607-EP05', 'PT Elangperdana Tyre Industry', '2026-07-08', 340000.00, 8, 2, 3),
(16, 12, 'BATCH-202608-HK01', 'PT Hankook Tire Indonesia', '2026-08-02', 560000.00, 20, 20, 3);
