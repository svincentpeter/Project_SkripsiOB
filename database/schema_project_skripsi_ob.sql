-- ==============================================================================
-- DATABASE SCHEMA & SEED DATA: project_skripsi_ob
-- Point of Sale (POS) & Keuangan SAK EMKM - Omah Ban Cabang 3 (OB3)
-- Karakteristik: Standalone, Khusus Ban BARU, VELG, BAN DALAM & MASTER JASA
-- Costing Method: FIFO (product_batches & sale_batch_allocations)
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `project_skripsi_ob` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `project_skripsi_ob`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `sales_bookings`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `service_masters`;
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
-- 1. Table: products (Master Produk: Ban Baru, Velg Mobil, Ban Dalam)
-- ------------------------------------------------------------------------------
CREATE TABLE `products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `category` ENUM('BAN_BARU', 'VELG', 'BAN_DALAM') NOT NULL DEFAULT 'BAN_BARU',
  `product_name` VARCHAR(150) NOT NULL,
  `product_code` VARCHAR(50) NOT NULL UNIQUE,
  `barcode` VARCHAR(50) NOT NULL UNIQUE,
  `brand` VARCHAR(50) NOT NULL,
  
  -- Spesifikasi Ban Baru
  `size_width` INT UNSIGNED NULL COMMENT 'Lebar tapak mm, misal: 185',
  `size_ratio` VARCHAR(10) NULL COMMENT 'Aspek rasio %, misal: 65',
  `ring` VARCHAR(10) NULL COMMENT 'Diameter velg, misal: R15',
  `product_size` VARCHAR(30) NULL COMMENT 'Ukuran lengkap, misal: 185/65 R15',
  `motif` VARCHAR(80) NULL COMMENT 'Pola tapak kembangan ban',
  `condition_code` VARCHAR(20) NOT NULL DEFAULT 'BARU' COMMENT 'Selalu BARU di Cabang 3',
  `product_year` VARCHAR(10) NULL DEFAULT '2026',
  
  -- Spesifikasi Velg
  `pcd` VARCHAR(30) NULL COMMENT 'e.g. 4x100 / 5x114.3',
  `rim_width` DECIMAL(4,1) NULL COMMENT 'Lebar velg inch e.g. 6.5',
  `offset_et` INT NULL COMMENT 'Offset ET e.g. 38',
  `color_finish` VARCHAR(80) NULL COMMENT 'Finishing warna',
  
  -- Spesifikasi Ban Dalam
  `valve_type` VARCHAR(40) NULL COMMENT 'Tipe pentil e.g. TR13',
  
  -- Finansial & Persediaan
  `product_cost` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'HPP Default / Terakhir',
  `product_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'Harga Jual Normal',
  `product_quantity` INT NOT NULL DEFAULT 0 COMMENT 'Sisa Stok Fisik Gudang',
  `product_stock_alert` INT NOT NULL DEFAULT 5 COMMENT 'Batas Minimum Notifikasi Kritis',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_products_barcode` (`barcode`),
  INDEX `idx_products_category_brand` (`category`, `brand`),
  INDEX `idx_products_branch` (`branch_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. Table: product_batches (Lapisan Batch Pembelian untuk FIFO Costing)
-- ------------------------------------------------------------------------------
CREATE TABLE `product_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_code` VARCHAR(50) NOT NULL UNIQUE,
  `source_name` VARCHAR(150) NOT NULL COMMENT 'Nama Supplier Distributor',
  `purchase_date` DATE NOT NULL,
  `batch_cost` DECIMAL(15,2) NOT NULL COMMENT 'HPP Per Satuan Pada Batch Ini',
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
-- 3. Table: service_masters (Master Jasa & Layanan Bengkel)
-- ------------------------------------------------------------------------------
CREATE TABLE `service_masters` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `service_code` VARCHAR(50) NOT NULL UNIQUE,
  `service_name` VARCHAR(150) NOT NULL,
  `category` VARCHAR(50) NOT NULL,
  `standard_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `cost_price` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `description` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. Table: suppliers (Master Supplier / Distributor Resmi)
-- ------------------------------------------------------------------------------
CREATE TABLE `suppliers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `supplier_code` VARCHAR(50) NOT NULL UNIQUE,
  `supplier_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(30) NOT NULL,
  `email` VARCHAR(100) NULL,
  `address` TEXT NULL,
  `contact_person` VARCHAR(100) NULL,
  `payment_terms_days` INT NOT NULL DEFAULT 30,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. Table: sales (Header Transaksi Penjualan Kasir POS)
-- ------------------------------------------------------------------------------
CREATE TABLE `sales` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reference` VARCHAR(50) NOT NULL UNIQUE COMMENT 'Nomor Nota: OB3-INV-202609-XXXX',
  `date` DATE NOT NULL,
  `timestamp` TIME NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL DEFAULT 'Pelanggan Walk-In',
  `customer_phone` VARCHAR(30) NULL,
  `vehicle_plate` VARCHAR(30) NOT NULL DEFAULT 'B 1984 SKZ',
  `vehicle_model` VARCHAR(60) NULL DEFAULT 'Avanza',
  `subtotal` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_discount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00 COMMENT 'PPN 11%',
  `grand_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `total_cost_hpp` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(30) NOT NULL DEFAULT 'TUNAI',
  `amount_paid` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `change_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_reference` VARCHAR(100) NULL,
  `notes` VARCHAR(255) NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'LUNAS' COMMENT 'LUNAS / PENDING (BON)',
  `branch_id` INT UNSIGNED NOT NULL DEFAULT 3,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_sales_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. Table: sales_bookings (Pencatatan Booking DP Uang Muka)
-- ------------------------------------------------------------------------------
CREATE TABLE `sales_bookings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_number` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `customer_name` VARCHAR(100) NOT NULL,
  `customer_phone` VARCHAR(30) NOT NULL,
  `vehicle_plate` VARCHAR(30) NOT NULL,
  `vehicle_model` VARCHAR(60) NULL,
  `estimated_total` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `dp_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `payment_method` VARCHAR(30) NOT NULL DEFAULT 'TRANSFER_BCA',
  `notes` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE / CONVERTED / CANCELLED',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. Table: accounts & journal_entries (Sistem Akuntansi SAK EMKM)
-- ------------------------------------------------------------------------------
CREATE TABLE `accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `account_code` VARCHAR(20) NOT NULL UNIQUE,
  `account_name` VARCHAR(100) NOT NULL,
  `account_type` VARCHAR(30) NOT NULL,
  `normal_balance` VARCHAR(10) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `journal_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `journal_number` VARCHAR(50) NOT NULL UNIQUE,
  `reference_number` VARCHAR(50) NULL,
  `date` DATE NOT NULL,
  `ref_doc` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'POSTED',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `journal_items` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `journal_entry_id` BIGINT UNSIGNED NOT NULL,
  `account_id` BIGINT UNSIGNED NOT NULL,
  `debit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `credit` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `note` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_jitems_entry` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_jitems_account` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. Table: expenses (Beban Operasional Toko Sederhana)
-- ------------------------------------------------------------------------------
CREATE TABLE `expenses` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `expense_number` VARCHAR(50) NOT NULL UNIQUE,
  `date` DATE NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `cash_source` VARCHAR(50) NOT NULL,
  `paid_to` VARCHAR(100) NOT NULL,
  `description` TEXT NOT NULL,
  `approved_by` VARCHAR(60) NOT NULL DEFAULT 'Owner Omah Ban',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SEED COA
INSERT INTO `accounts` (`id`, `account_code`, `account_name`, `account_type`, `normal_balance`) VALUES
(1, '1-1000', 'Kas Toko Laci Kasir', 'ASSET', 'DEBIT'),
(2, '1-1001', 'Bank BCA Cabang 3', 'ASSET', 'DEBIT'),
(3, '1-1002', 'Piutang Dagang (AR)', 'ASSET', 'DEBIT'),
(4, '1-2000', 'Persediaan Ban Baru Cabang 3', 'ASSET', 'DEBIT'),
(5, '1-3000', 'Peralatan Bengkel & Mesin Spooring', 'ASSET', 'DEBIT'),
(6, '1-3999', 'Akumulasi Penyusutan Mesin', 'ASSET', 'CREDIT'),
(7, '2-1000', 'Hutang Dagang Supplier & Uang Muka', 'LIABILITY', 'CREDIT'),
(8, '2-1003', 'PPN Keluaran (11%)', 'LIABILITY', 'CREDIT'),
(9, '3-1000', 'Modal Disetor Pemilik', 'EQUITY', 'CREDIT'),
(10, '3-2000', 'Laba Ditahan Cabang 3', 'EQUITY', 'CREDIT'),
(11, '4-1000', 'Pendapatan Penjualan Produk', 'REVENUE', 'CREDIT'),
(12, '4-1001', 'Pendapatan Jasa Servis & Spooring', 'REVENUE', 'CREDIT'),
(13, '4-9000', 'Potongan Diskon Penjualan', 'REVENUE', 'DEBIT'),
(14, '5-1000', 'Harga Pokok Penjualan (HPP) FIFO', 'EXPENSE', 'DEBIT'),
(15, '6-1000', 'Beban Operasional Harian Toko', 'EXPENSE', 'DEBIT'),
(16, '6-1001', 'Beban Perlengkapan Habis Pakai Bengkel', 'EXPENSE', 'DEBIT'),
(17, '6-1002', 'Beban Pemeliharaan & Kalibrasi Mesin', 'EXPENSE', 'DEBIT');
