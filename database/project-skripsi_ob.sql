-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 24, 2026 at 05:22 PM
-- Server version: 8.0.30
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `project-skripsi_ob`
--

-- --------------------------------------------------------

--
-- Table structure for table `accounting_period_closings`
--

CREATE TABLE `accounting_period_closings` (
  `id` bigint UNSIGNED NOT NULL,
  `period` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_date` date NOT NULL,
  `closing_entry_id` bigint UNSIGNED DEFAULT NULL,
  `net_income` decimal(15,2) NOT NULL DEFAULT '0.00',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `closed_by` bigint UNSIGNED DEFAULT NULL,
  `closed_at` timestamp NOT NULL,
  `reopened_at` timestamp NULL DEFAULT NULL,
  `reopened_by` bigint UNSIGNED DEFAULT NULL,
  `reopen_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reopen_entry_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `accounts`
--

CREATE TABLE `accounts` (
  `id` bigint UNSIGNED NOT NULL,
  `account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_type` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `normal_balance` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `accounts`
--

INSERT INTO `accounts` (`id`, `account_code`, `account_name`, `account_type`, `normal_balance`, `is_active`, `created_at`, `updated_at`) VALUES
(1, '2-1004', 'Uang Muka Pelanggan (DP Booking)', 'LIABILITY', 'CREDIT', 0, '2026-10-05 08:32:45', '2026-10-05 08:32:46'),
(2, '4-2000', 'Pendapatan Surcharge EDC', 'REVENUE', 'CREDIT', 0, '2026-10-05 08:32:45', '2026-10-05 08:32:46'),
(3, '5-2000', 'Selisih Persediaan (Opname)', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:45', '2026-10-05 08:32:45'),
(4, '6-1009', 'Beban MDR QRIS & EDC', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:45', '2026-10-05 08:32:45'),
(5, '1-1002', 'Piutang Dagang (AR)', 'ASSET', 'DEBIT', 0, '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(6, '3-3000', 'Prive Pemilik', 'EQUITY', 'DEBIT', 1, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(7, '6-1010', 'Selisih Kas Kasir (Lebih/Kurang)', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(8, '4-9100', 'Retur Penjualan', 'REVENUE', 'DEBIT', 1, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(9, '1-1100', 'Beban Dibayar di Muka', 'ASSET', 'DEBIT', 1, '2026-10-05 08:32:48', '2026-10-05 08:32:48'),
(10, '2-1100', 'Beban Yang Masih Harus Dibayar', 'LIABILITY', 'CREDIT', 1, '2026-10-05 08:32:48', '2026-10-05 08:32:48'),
(11, '4-3000', 'Pendapatan Bunga Bank', 'REVENUE', 'CREDIT', 1, '2026-10-05 08:32:48', '2026-10-05 08:32:48'),
(12, '6-1011', 'Beban Penyusutan Aset Tetap', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:48', '2026-10-05 08:32:48'),
(13, '6-1012', 'Beban Administrasi Bank', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:48', '2026-10-05 08:32:48'),
(14, '1-1000', 'Kas Toko Laci Kasir', 'ASSET', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(15, '1-1001', 'Bank BCA Cabang 3', 'ASSET', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(16, '1-2000', 'Persediaan Ban Baru Cabang 3', 'ASSET', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(17, '1-3000', 'Peralatan Bengkel & Mesin Spooring', 'ASSET', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(18, '1-3999', 'Akumulasi Penyusutan Mesin', 'ASSET', 'CREDIT', 1, '2026-10-05 08:32:49', NULL),
(19, '2-1000', 'Hutang Dagang Supplier (AP)', 'LIABILITY', 'CREDIT', 1, '2026-10-05 08:32:49', NULL),
(20, '3-1000', 'Modal Disetor Pemilik', 'EQUITY', 'CREDIT', 1, '2026-10-05 08:32:49', NULL),
(21, '3-2000', 'Laba Ditahan Cabang 3', 'EQUITY', 'CREDIT', 1, '2026-10-05 08:32:49', NULL),
(22, '4-1000', 'Pendapatan Penjualan Ban Baru', 'REVENUE', 'CREDIT', 1, '2026-10-05 08:32:49', NULL),
(23, '4-1001', 'Pendapatan Jasa Servis & Spooring', 'REVENUE', 'CREDIT', 1, '2026-10-05 08:32:49', NULL),
(24, '4-9000', 'Potongan Diskon Penjualan', 'REVENUE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(25, '5-1000', 'Harga Pokok Penjualan (HPP) Ban Baru', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(26, '6-1000', 'Beban Gaji & Uang Makan Karyawan', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(27, '6-1001', 'Beban Listrik, Air & Internet', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(28, '6-1003', 'Beban Sewa Bangunan Toko', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(29, '6-1004', 'Beban Transportasi & Pengiriman Ban', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(30, '6-1005', 'Beban Perlengkapan & ATK Toko', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(31, '6-1006', 'Beban Perawatan Mesin Spooring & Balancing', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(32, '6-1007', 'Beban Konsumsi & Lembur Karyawan', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL),
(33, '6-1008', 'Beban Pajak & Retribusi Daerah', 'EXPENSE', 'DEBIT', 1, '2026-10-05 08:32:49', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `bank_reconciliations`
--

CREATE TABLE `bank_reconciliations` (
  `id` bigint UNSIGNED NOT NULL,
  `period` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `statement_ending_balance` decimal(15,2) NOT NULL,
  `updated_by` bigint UNSIGNED DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `bank_statement_lines`
--

CREATE TABLE `bank_statement_lines` (
  `id` bigint UNSIGNED NOT NULL,
  `statement_date` date NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `source` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL',
  `is_split` tinyint(1) NOT NULL DEFAULT '0',
  `parent_id` bigint UNSIGNED DEFAULT NULL,
  `journal_item_id` bigint UNSIGNED DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `brands`
--

CREATE TABLE `brands` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_partner` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `brands`
--

INSERT INTO `brands` (`id`, `name`, `is_partner`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Achilles', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(2, 'Bridgestone', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(3, 'GT', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(4, 'Swallow', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(5, 'Aeolus', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(6, 'Delli', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(7, 'Sliwer', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(8, 'Dunlop', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(9, 'Accelera', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(10, 'Forceum', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(11, 'Hankook', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(12, 'Delium', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(13, 'Goodyear', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(14, 'Sailun', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(15, 'Heida', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(16, 'Falken', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(17, 'Pirelli', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(18, 'Yokohama', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(19, 'Uniroyal', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(20, 'BF Goodrich', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(21, 'Continental', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(22, 'Federal', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(23, 'Michellin', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(24, 'mi', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(25, 'Avantek', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(26, '-', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(27, 'Toyo', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(28, 'Simex', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(29, 'Laufenn', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(30, 'Venom', 0, '2026-10-05 08:32:43', '2026-10-05 08:32:43', NULL),
(31, 'Michelin', 0, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(32, 'Maxxis', 0, '2026-10-05 15:32:43', '2026-10-05 15:32:43', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `brand_aliases`
--

CREATE TABLE `brand_aliases` (
  `id` bigint UNSIGNED NOT NULL,
  `alias` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `brand_aliases`
--

INSERT INTO `brand_aliases` (`id`, `alias`, `brand_id`, `created_at`, `updated_at`) VALUES
(1, 'bs', 2, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(2, 'bridgestone', 2, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(3, 'smr', 2, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(4, 'gt', 3, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(5, 'gt radial', 3, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(6, 'gajah', 3, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(7, 'gajah tunggal', 3, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(8, 'acc', 9, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(9, 'accelera', 9, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(10, 'acellera', 9, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(11, 'dunlop', 8, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(12, 'dlp', 8, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(13, 'delium', 12, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(14, 'hankook', 11, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(15, 'delli', 6, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(16, 'sliwer', 7, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(17, 'swallow', 4, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(18, 'achilles', 1, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(19, 'goodyear', 13, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(20, 'sailun', 14, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(21, 'pirelli', 17, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(22, 'yokohama', 18, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(23, 'continental', 21, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(24, 'forceum', 10, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(25, 'aeolus', 5, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(26, 'laufen', 29, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(27, 'laufenn', 29, '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(28, 'maxxis', 32, '2026-10-05 15:32:43', '2026-10-05 15:32:43'),
(29, 'maxis', 32, '2026-10-05 15:32:43', '2026-10-05 15:32:43');

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `cache`
--

INSERT INTO `cache` (`key`, `value`, `expiration`) VALUES
('omah-ban-cabang-3-cache-594a46b938fde5d0fa4197b6098f5666', 'i:1;', 1795540877),
('omah-ban-cabang-3-cache-594a46b938fde5d0fa4197b6098f5666:timer', 'i:1795540877;', 1795540877),
('omah-ban-cabang-3-cache-f99bd202ac5e4f108c58159ca9e625f9', 'i:1;', 1795539265),
('omah-ban-cabang-3-cache-f99bd202ac5e4f108c58159ca9e625f9:timer', 'i:1795539265;', 1795539265);

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cash_sessions`
--

CREATE TABLE `cash_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `opened_at` timestamp NOT NULL,
  `opening_float` decimal(15,2) NOT NULL,
  `book_opening` decimal(15,2) NOT NULL,
  `opening_note` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `from_entry_id` bigint UNSIGNED NOT NULL DEFAULT '0',
  `to_entry_id` bigint UNSIGNED DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `closed_by` bigint UNSIGNED DEFAULT NULL,
  `expected_cash` decimal(15,2) DEFAULT NULL,
  `counted_cash` decimal(15,2) DEFAULT NULL,
  `variance` decimal(15,2) DEFAULT NULL,
  `variance_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'OPEN',
  `approved_by` bigint UNSIGNED DEFAULT NULL,
  `approved_at` timestamp NULL DEFAULT NULL,
  `journal_entry_id` bigint UNSIGNED DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `edc_settings`
--

CREATE TABLE `edc_settings` (
  `id` bigint UNSIGNED NOT NULL,
  `bank_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `fee_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `charge_to_customer` tinyint(1) NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `edc_settings`
--

INSERT INTO `edc_settings` (`id`, `bank_name`, `payment_type`, `fee_percentage`, `charge_to_customer`, `is_active`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'BCA', 'Debit', 0.15, 0, 1, 'Fee debit toko 0.15%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(2, 'BCA', 'Credit', 2.00, 1, 1, 'Surcharge kredit pelanggan 2.0%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(3, 'Mandiri', 'Debit', 0.15, 0, 1, 'Fee debit toko 0.15%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(4, 'Mandiri', 'Credit', 1.80, 1, 1, 'Surcharge kredit pelanggan 1.8%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(5, 'BRI', 'Debit', 0.15, 0, 1, 'Fee debit toko 0.15%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(6, 'BRI', 'Credit', 2.00, 1, 1, 'Surcharge kredit pelanggan 2.0%', '2026-10-05 08:32:43', '2026-10-05 08:32:43');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` bigint UNSIGNED NOT NULL,
  `reference` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expense_date` date NOT NULL,
  `category_id` bigint UNSIGNED DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `bank_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `recipient_name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attachment_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `approved_by` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `void_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voided_by` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voided_at` timestamp NULL DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `expense_categories`
--

CREATE TABLE `expense_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `category_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `default_account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `expense_categories`
--

INSERT INTO `expense_categories` (`id`, `category_code`, `category_name`, `default_account_code`, `created_at`, `updated_at`) VALUES
(1, 'GAJI', 'Gaji & Uang Makan Montir', '6-1000', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(2, 'LISTRIK', 'Listrik & Air (PLN/PDAM)', '6-1001', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(3, 'SEWA', 'Sewa Lahan & Bangunan', '6-1003', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(4, 'TRANSPORT', 'Transport & Pengiriman Ban', '6-1004', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(5, 'ATK', 'ATK & Keperluan Bengkel', '6-1005', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(6, 'MESIN', 'Pemeliharaan Mesin Spooring & Balancing', '6-1006', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(7, 'KONSUMSI', 'Konsumsi & Lembur Karyawan', '6-1007', '2026-10-05 08:32:46', '2026-10-05 08:32:46'),
(8, 'PAJAK', 'Pajak & Retribusi Daerah', '6-1008', '2026-10-05 08:32:46', '2026-10-05 08:32:46');

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `fixed_assets`
--

CREATE TABLE `fixed_assets` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `acquisition_date` date NOT NULL,
  `acquisition_cost` decimal(15,2) NOT NULL,
  `residual_value` decimal(15,2) NOT NULL DEFAULT '0.00',
  `useful_life_months` smallint UNSIGNED NOT NULL,
  `depreciation_start` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `opening_accumulated_depreciation` decimal(15,2) NOT NULL DEFAULT '0.00',
  `funding` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `void_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `voided_by` bigint UNSIGNED DEFAULT NULL,
  `voided_at` timestamp NULL DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `fixed_asset_depreciations`
--

CREATE TABLE `fixed_asset_depreciations` (
  `id` bigint UNSIGNED NOT NULL,
  `fixed_asset_id` bigint UNSIGNED NOT NULL,
  `period` char(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `journal_entry_id` bigint UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint UNSIGNED NOT NULL,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `journal_entries`
--

CREATE TABLE `journal_entries` (
  `id` bigint UNSIGNED NOT NULL,
  `entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entry_date` date NOT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_debit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_credit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'POSTED',
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `reversal_of_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_entries`
--

INSERT INTO `journal_entries` (`id`, `entry_number`, `entry_date`, `reference_type`, `reference_id`, `description`, `total_debit`, `total_credit`, `status`, `branch_id`, `created_by`, `reversal_of_id`, `created_at`, `updated_at`) VALUES
(1, 'JRN-202610-0001', '2026-10-05', 'OPENING_BALANCE', 'OPENING-INV-20261005153256', 'Saldo awal persediaan ban (penyesuaian nilai FIFO ke buku besar)', 519070000.00, 519070000.00, 'POSTED', 3, NULL, NULL, '2026-10-05 08:32:56', '2026-10-05 08:32:56'),
(2, 'JRN-202610-0002', '2026-10-05', 'ACCOUNT_OPENING', 'SALDO-AWAL', 'Saldo awal akun kas, bank, aset tetap & laba ditahan', 25350000.00, 25350000.00, 'POSTED', 3, 1, NULL, '2026-10-05 08:36:14', '2026-10-05 08:36:14');

-- --------------------------------------------------------

--
-- Table structure for table `journal_items`
--

CREATE TABLE `journal_items` (
  `id` bigint UNSIGNED NOT NULL,
  `journal_entry_id` bigint UNSIGNED NOT NULL,
  `account_id` bigint UNSIGNED NOT NULL,
  `debit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `credit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `note` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `journal_items`
--

INSERT INTO `journal_items` (`id`, `journal_entry_id`, `account_id`, `debit`, `credit`, `note`, `created_at`, `updated_at`) VALUES
(1, 1, 16, 519070000.00, 0.00, 'Penambahan nilai persediaan (OPENING-INV-20261005153256)', '2026-10-05 08:32:56', NULL),
(2, 1, 20, 0.00, 519070000.00, 'Saldo awal persediaan ban (penyesuaian nilai FIFO ke buku besar)', '2026-10-05 08:32:56', NULL),
(3, 2, 14, 350000.00, 0.00, 'Saldo awal', '2026-10-05 08:36:14', NULL),
(4, 2, 15, 25000000.00, 0.00, 'Saldo awal', '2026-10-05 08:36:14', NULL),
(5, 2, 20, 0.00, 25350000.00, 'Modal awal pemilik (penyeimbang saldo awal)', '2026-10-05 08:36:14', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int UNSIGNED NOT NULL,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_09_05_000001_create_core_entities_tables', 1),
(5, '2026_09_05_000002_adjust_products_columns', 1),
(6, '2026_09_05_000003_add_status_to_expenses_table', 1),
(7, '2026_09_08_000001_create_payment_provider_settings_table', 1),
(8, '2026_09_08_000002_create_edc_settings_table', 1),
(9, '2026_09_08_000003_add_payment_meta_to_sales_table', 1),
(10, '2026_09_08_000004_create_product_and_service_categories_tables', 1),
(11, '2026_09_08_000005_create_brands_and_brand_aliases_tables', 1),
(12, '2026_09_08_000006_create_product_price_audits_table', 1),
(13, '2026_09_08_000007_add_reconciliation_columns_to_products_table', 1),
(14, '2026_09_23_000001_add_role_columns_to_users_table', 1),
(15, '2026_09_23_000002_create_role_permissions_table', 1),
(16, '2026_09_23_163541_create_personal_access_tokens_table', 1),
(17, '2026_09_24_000001_extend_sales_for_server_pos', 1),
(18, '2026_09_24_000002_create_purchases_tables', 1),
(19, '2026_09_24_000003_add_pos_inventory_accounts', 1),
(20, '2026_09_27_000001_remove_ppn_from_sales', 1),
(21, '2026_09_29_000001_harden_journal_entries_and_add_period_closings', 1),
(22, '2026_09_29_000002_add_void_audit_to_expenses_and_seed_categories', 1),
(23, '2026_09_30_000001_deactivate_dp_bon_edc_accounts', 1),
(24, '2026_09_30_000002_remove_dp_bon_permission_keys', 1),
(25, '2026_09_30_100001_add_dpp_ppn_to_purchases', 1),
(26, '2026_10_01_000001_create_qris_transactions_table', 1),
(27, '2026_10_02_000001_create_cash_sessions_and_cash_accounts', 1),
(28, '2026_10_03_000001_add_sales_return_account_and_permissions', 1),
(29, '2026_10_03_000002_create_sales_returns_tables', 1),
(30, '2026_10_03_000003_create_purchase_returns_tables', 1),
(31, '2026_10_04_000001_add_sak_emkm_accounts', 1),
(32, '2026_10_04_000002_create_fixed_assets_tables', 1),
(33, '2026_10_04_000003_create_bank_reconciliation_tables', 1),
(34, '2026_10_04_000004_unique_fixed_asset_depreciation_period', 1),
(35, '2026_10_05_000001_add_daily_reports_permission', 1),
(36, '2026_10_05_000002_add_user_id_to_sales', 1),
(37, '2026_10_05_000003_index_stock_movements_reference_id', 1),
(38, '2026_10_05_000004_add_split_to_bank_statement_lines', 2),
(39, '2026_10_05_000005_backfill_sales_user_id', 2),
(40, '2026_10_05_000006_split_sales_return_refunds', 2);

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payment_provider_settings`
--

CREATE TABLE `payment_provider_settings` (
  `id` bigint UNSIGNED NOT NULL,
  `method_type` enum('bank','qris') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fee_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `fee_threshold_amount` decimal(15,2) NOT NULL DEFAULT '500000.00',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_provider_settings`
--

INSERT INTO `payment_provider_settings` (`id`, `method_type`, `provider_name`, `provider_code`, `fee_percentage`, `fee_threshold_amount`, `is_active`, `sort_order`, `notes`, `created_at`, `updated_at`) VALUES
(1, 'bank', 'BCA', 'BCA', 0.00, 0.00, 1, 1, 'Rekening Utama Operasional', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(2, 'bank', 'Mandiri', 'MDR', 0.00, 0.00, 1, 2, 'Rekening Penerimaan', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(3, 'bank', 'BNI', 'BNI', 0.00, 0.00, 1, 3, 'Rekening Penerimaan', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(4, 'bank', 'BRI', 'BRI', 0.00, 0.00, 1, 4, 'Rekening Penerimaan', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(5, 'qris', 'BCA', 'BCA', 0.30, 500000.00, 1, 1, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(6, 'qris', 'Mandiri', 'MDR', 0.30, 500000.00, 1, 2, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(7, 'qris', 'GoPay', 'GOPAY', 0.30, 500000.00, 1, 3, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(8, 'qris', 'OVO', 'OVO', 0.30, 500000.00, 1, 4, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(9, 'qris', 'DANA', 'DANA', 0.30, 500000.00, 1, 5, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(10, 'qris', 'QRIS BCA (Statis)', 'QRIS_BCA', 0.70, 0.00, 1, 1, 'MDR Standard QRIS 0.7%', '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(11, 'bank', 'Bank BCA (Transfer Direct)', 'TF_BCA', 0.00, 0.00, 1, 2, 'Transfer manual ke BCA Cabang 3', '2026-10-05 08:32:51', '2026-10-05 08:32:51');

-- --------------------------------------------------------

--
-- Table structure for table `personal_access_tokens`
--

CREATE TABLE `personal_access_tokens` (
  `id` bigint UNSIGNED NOT NULL,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint UNSIGNED NOT NULL,
  `name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `personal_access_tokens`
--

INSERT INTO `personal_access_tokens` (`id`, `tokenable_type`, `tokenable_id`, `name`, `token`, `abilities`, `last_used_at`, `expires_at`, `created_at`, `updated_at`) VALUES
(3, 'App\\Models\\User', 1, 'pos-session', 'a2d4849c810d5630a76611f8d8fd745b365cbc14a05032e9affc293df774635c', '[\"*\"]', '2026-10-05 08:45:13', '2026-10-05 20:43:43', '2026-10-05 08:43:43', '2026-10-05 08:45:13'),
(4, 'App\\Models\\User', 3, 'pos-session', '955b0b7730efdf05ac72ae0fff84ca64ba0ab05d295d4725ec56e79c4b471126', '[\"*\"]', '2026-10-05 08:59:04', '2026-10-05 20:46:39', '2026-10-05 08:46:39', '2026-10-05 08:59:04'),
(5, 'App\\Models\\User', 1, 'pos-session', '0e3fd2c30acde37737492a6652777732ed62f63b460b1965c0e85d74f079d9a1', '[\"*\"]', '2026-10-05 09:11:05', '2026-10-05 21:03:14', '2026-10-05 09:03:14', '2026-10-05 09:11:05'),
(6, 'App\\Models\\User', 2, 'pos-session', 'c97d9e80e5ff5abbf20a572692992f2bc24b5f7969d2a4298e8bddca04375820', '[\"*\"]', '2026-10-05 09:13:05', '2026-10-05 21:11:19', '2026-10-05 09:11:19', '2026-10-05 09:13:05'),
(7, 'App\\Models\\User', 1, 'pos-session', '5e7ec4c3e555c1662c427802de201a329aedfba2a6ed590af0494bff45971cdc', '[\"*\"]', '2026-10-05 09:14:29', '2026-10-05 21:14:04', '2026-10-05 09:14:04', '2026-10-05 09:14:29'),
(8, 'App\\Models\\User', 1, 'pos-session', '148a24aebc4f7ec77d5689cbe08a9d244aa2afd165ca2fa4ce4b636fae5ce36a', '[\"*\"]', '2026-10-05 10:28:39', '2026-10-05 21:33:12', '2026-10-05 09:33:12', '2026-10-05 10:28:39'),
(10, 'App\\Models\\User', 1, 'pos-session', 'd12a03a0c7ac66bcf913df3d9bd04de5012a733c8542bdd9ac384bd4fdd92fe0', '[\"*\"]', '2026-11-23 05:04:22', '2026-11-23 16:17:18', '2026-11-23 04:17:18', '2026-11-23 05:04:22'),
(13, 'App\\Models\\User', 2, 'pos-session', '9757666a519f96eba1b021f151e310168f6dc695d7b56242bfa698a0f156b25a', '[\"*\"]', '2026-11-24 16:42:01', '2026-11-25 04:41:44', '2026-11-24 16:41:44', '2026-11-24 16:42:01'),
(14, 'App\\Models\\User', 1, 'pos-session', 'd8659ca225f81ded6277824fe842f7c44e295518b5a6191266fceb9e6e2183f9', '[\"*\"]', '2026-11-24 17:21:40', '2026-11-25 04:42:36', '2026-11-24 16:42:36', '2026-11-24 17:21:40'),
(15, 'App\\Models\\User', 2, 'pos-session', 'b662b0565d90dea832d1b7439dd4e0dc84fc8626842cb1ff6f9c40686e88e45e', '[\"*\"]', '2026-11-24 16:43:21', '2026-11-25 04:43:04', '2026-11-24 16:43:04', '2026-11-24 16:43:21'),
(16, 'App\\Models\\User', 1, 'pos-session', '00eee15f8dcd2d88f8eba403fa749b2bf197532fe0023c3ddc267a28e682b9ae', '[\"*\"]', '2026-11-24 16:43:30', '2026-11-25 04:43:25', '2026-11-24 16:43:25', '2026-11-24 16:43:30'),
(17, 'App\\Models\\User', 2, 'pos-session', 'caef6e31c51aa63a017b1e135b9167b413eec4440acfe6a8f4678da37d96bfd8', '[\"*\"]', '2026-11-24 16:46:26', '2026-11-25 04:46:17', '2026-11-24 16:46:17', '2026-11-24 16:46:26'),
(18, 'App\\Models\\User', 2, 'pos-session', '45c241f3ea88bf8223f728627fc82f177157397313540badbf7a7b385c6b19bb', '[\"*\"]', '2026-11-24 16:47:16', '2026-11-25 04:47:07', '2026-11-24 16:47:07', '2026-11-24 16:47:16'),
(19, 'App\\Models\\User', 2, 'pos-session', '3b090d672a751ea6beae54a93f6501cb1ab4fce933cb9c1d5f63989fa455e50a', '[\"*\"]', '2026-11-24 16:48:02', '2026-11-25 04:47:42', '2026-11-24 16:47:42', '2026-11-24 16:48:02'),
(20, 'App\\Models\\User', 1, 'pos-session', 'c0306cfea448895e34a5273a2c16fbae54dfd712f9a5de5e49f0a99143983798', '[\"*\"]', '2026-11-24 16:48:20', '2026-11-25 04:48:06', '2026-11-24 16:48:06', '2026-11-24 16:48:20'),
(21, 'App\\Models\\User', 2, 'pos-session', '5004f93f40c16bf19447a07aff5af36e866f65adc32307889c449a038e5e7264', '[\"*\"]', '2026-11-24 16:53:43', '2026-11-25 04:53:25', '2026-11-24 16:53:25', '2026-11-24 16:53:43'),
(22, 'App\\Models\\User', 1, 'pos-session', '95465f516c2af652b48bdf8933a83c927e97adc505b264ba441e89fbb64159dc', '[\"*\"]', '2026-11-24 16:54:02', '2026-11-25 04:53:47', '2026-11-24 16:53:47', '2026-11-24 16:54:02'),
(25, 'App\\Models\\User', 1, 'pos-session', '9971bcf6c1848fb8449dc99a558df4bcc73563f7f4cbfb99cdf780f2f4e344b6', '[\"*\"]', '2026-11-24 17:16:12', '2026-11-25 05:16:01', '2026-11-24 17:16:01', '2026-11-24 17:16:12'),
(26, 'App\\Models\\User', 1, 'pos-session', '0b17c69967458ed46ae37bdcd9a9b25cc0b4071cb938b9230eab403e51e81ae7', '[\"*\"]', '2026-11-24 17:20:30', '2026-11-25 05:20:17', '2026-11-24 17:20:17', '2026-11-24 17:20:30');

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` bigint UNSIGNED NOT NULL,
  `product_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `product_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `barcode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `brand_id` bigint UNSIGNED DEFAULT NULL,
  `category_id` bigint UNSIGNED DEFAULT '1',
  `size_width` int UNSIGNED NOT NULL DEFAULT '0',
  `size_ratio` int UNSIGNED NOT NULL DEFAULT '0',
  `ring` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'R15',
  `product_size` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '-',
  `motif` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '-',
  `condition_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'BARU',
  `product_year` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '2026',
  `product_cost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `product_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `reference_price` decimal(15,2) DEFAULT NULL,
  `product_quantity` int NOT NULL DEFAULT '0',
  `stok_awal` int NOT NULL DEFAULT '0',
  `product_stock_alert` int NOT NULL DEFAULT '5',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `is_old_stock` tinyint(1) NOT NULL DEFAULT '0',
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `product_name`, `product_code`, `barcode`, `brand`, `brand_id`, `category_id`, `size_width`, `size_ratio`, `ring`, `product_size`, `motif`, `condition_code`, `product_year`, `product_cost`, `product_price`, `reference_price`, `product_quantity`, `stok_awal`, `product_stock_alert`, `is_active`, `is_old_stock`, `branch_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'GT Radial Champiro Eco 155/80 R13', 'GTR-15580-13-0001', '8990000000001', 'GT', 3, 1, 155, 80, '13', '155/80 R13', 'Champiro Eco', 'BARU', '2026', 420000.00, 483000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(2, 'Bridgestone Techno 165/80 R13', 'BRI-16580-13-0002', '8990000000002', 'Bridgestone', 2, 1, 165, 80, '13', '165/80 R13', 'Techno', 'BARU', '2026', 570000.00, 655500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(3, 'GT Radial Champiro Eco 165/80 R13', 'GTR-16580-13-0003', '8990000000003', 'GT', 3, 1, 165, 80, '13', '165/80 R13', 'Champiro Eco', 'BARU', '2026', 460000.00, 529000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(4, 'Dunlop SP Touring R1 165/80 R13', 'DUN-16580-13-0004', '8990000000004', 'Dunlop', 8, 1, 165, 80, '13', '165/80 R13', 'SP Touring R1', 'BARU', '2026', 490000.00, 563500.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(5, 'Accelera Eco-Plush 165/80 R13', 'ACC-16580-13-0005', '8990000000005', 'Accelera', 9, 1, 165, 80, '13', '165/80 R13', 'Eco-Plush', 'BARU', '2026', 410000.00, 471500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(6, 'GT Radial Champiro Eco 165/65 R14', 'GTR-16565-14-0006', '8990000000006', 'GT', 3, 1, 165, 65, '14', '165/65 R14', 'Champiro Eco', 'BARU', '2026', 440000.00, 506000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(7, 'Bridgestone Ecopia EP150 175/65 R14', 'BRI-17565-14-0007', '8990000000007', 'Bridgestone', 2, 1, 175, 65, '14', '175/65 R14', 'Ecopia EP150', 'BARU', '2026', 640000.00, 736000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(8, 'GT Radial Champiro Eco 175/65 R14', 'GTR-17565-14-0008', '8990000000008', 'GT', 3, 1, 175, 65, '14', '175/65 R14', 'Champiro Eco', 'BARU', '2026', 510000.00, 586500.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(9, 'Dunlop Enasave EC300+ 175/65 R14', 'DUN-17565-14-0009', '8990000000009', 'Dunlop', 8, 1, 175, 65, '14', '175/65 R14', 'Enasave EC300+', 'BARU', '2026', 560000.00, 644000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(10, 'Accelera Eco-Plush 175/65 R14', 'ACC-17565-14-0010', '8990000000010', 'Accelera', 9, 1, 175, 65, '14', '175/65 R14', 'Eco-Plush', 'BARU', '2026', 430000.00, 494500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(11, 'Bridgestone Techno 185/70 R14', 'BRI-18570-14-0011', '8990000000011', 'Bridgestone', 2, 1, 185, 70, '14', '185/70 R14', 'Techno', 'BARU', '2026', 650000.00, 747500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(12, 'GT Radial Champiro Eco 185/70 R14', 'GTR-18570-14-0012', '8990000000012', 'GT', 3, 1, 185, 70, '14', '185/70 R14', 'Champiro Eco', 'BARU', '2026', 520000.00, 598000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(13, 'Dunlop SP Touring R1 185/70 R14', 'DUN-18570-14-0013', '8990000000013', 'Dunlop', 8, 1, 185, 70, '14', '185/70 R14', 'SP Touring R1', 'BARU', '2026', 540000.00, 621000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(14, 'Accelera Eco-Plush 185/70 R14', 'ACC-18570-14-0014', '8990000000014', 'Accelera', 9, 1, 185, 70, '14', '185/70 R14', 'Eco-Plush', 'BARU', '2026', 440000.00, 506000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(15, 'Bridgestone Ecopia EP150 185/65 R15', 'BRI-18565-15-0015', '8990000000015', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', 'Ecopia EP150', 'BARU', '2026', 780000.00, 897000.00, NULL, 12, 12, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(16, 'GT Radial Champiro Eco 185/65 R15', 'GTR-18565-15-0016', '8990000000016', 'GT', 3, 1, 185, 65, '15', '185/65 R15', 'Champiro Eco', 'BARU', '2026', 590000.00, 678500.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(17, 'Dunlop Enasave EC300+ 185/65 R15', 'DUN-18565-15-0017', '8990000000017', 'Dunlop', 8, 1, 185, 65, '15', '185/65 R15', 'Enasave EC300+', 'BARU', '2026', 650000.00, 747500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(18, 'Accelera Eco-Plush 185/65 R15', 'ACC-18565-15-0018', '8990000000018', 'Accelera', 9, 1, 185, 65, '15', '185/65 R15', 'Eco-Plush', 'BARU', '2026', 500000.00, 575000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(19, 'Dunlop Enasave EC300+ 195/60 R15', 'DUN-19560-15-0019', '8990000000019', 'Dunlop', 8, 1, 195, 60, '15', '195/60 R15', 'Enasave EC300+', 'BARU', '2026', 690000.00, 793500.00, NULL, 4, 4, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(20, 'Bridgestone Ecopia EP150 195/65 R15', 'BRI-19565-15-0020', '8990000000020', 'Bridgestone', 2, 1, 195, 65, '15', '195/65 R15', 'Ecopia EP150', 'BARU', '2026', 820000.00, 943000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(21, 'Dunlop SP Sport LM705 195/65 R15', 'DUN-19565-15-0021', '8990000000021', 'Dunlop', 8, 1, 195, 65, '15', '195/65 R15', 'SP Sport LM705', 'BARU', '2026', 740000.00, 851000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(22, 'GT Radial Champiro Eco 195/65 R15', 'GTR-19565-15-0022', '8990000000022', 'GT', 3, 1, 195, 65, '15', '195/65 R15', 'Champiro Eco', 'BARU', '2026', 620000.00, 713000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(23, 'Dunlop SP Touring R1 205/65 R15', 'DUN-20565-15-0023', '8990000000023', 'Dunlop', 8, 1, 205, 65, '15', '205/65 R15', 'SP Touring R1', 'BARU', '2026', 700000.00, 805000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(24, 'Bridgestone Ecopia EP150 205/65 R15', 'BRI-20565-15-0024', '8990000000024', 'Bridgestone', 2, 1, 205, 65, '15', '205/65 R15', 'Ecopia EP150', 'BARU', '2026', 880000.00, 1012000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(25, 'GT Radial Champiro Touring 205/65 R15', 'GTR-20565-15-0025', '8990000000025', 'GT', 3, 1, 205, 65, '15', '205/65 R15', 'Champiro Touring', 'BARU', '2026', 640000.00, 736000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(26, 'Accelera Phi-R 195/50 R16', 'ACC-19550-16-0026', '8990000000026', 'Accelera', 9, 1, 195, 50, '16', '195/50 R16', 'Phi-R', 'BARU', '2026', 600000.00, 690000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(27, 'Dunlop SP Sport LM705 205/55 R16', 'DUN-20555-16-0027', '8990000000027', 'Dunlop', 8, 1, 205, 55, '16', '205/55 R16', 'SP Sport LM705', 'BARU', '2026', 920000.00, 1058000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(28, 'Bridgestone Turanza T005A 205/55 R16', 'BRI-20555-16-0028', '8990000000028', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', 'Turanza T005A', 'BARU', '2026', 1150000.00, 1322500.00, NULL, 4, 4, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(29, 'Bridgestone Turanza T005A 215/60 R16', 'BRI-21560-16-0029', '8990000000029', 'Bridgestone', 2, 1, 215, 60, '16', '215/60 R16', 'Turanza T005A', 'BARU', '2026', 1250000.00, 1437500.00, NULL, 4, 4, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(30, 'Accelera Phi 215/45 R17', 'ACC-21545-17-0030', '8990000000030', 'Accelera', 9, 1, 215, 45, '17', '215/45 R17', 'Phi', 'BARU', '2026', 760000.00, 874000.00, NULL, 4, 4, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(31, 'Dunlop SP Sport LM705 215/55 R17', 'DUN-21555-17-0031', '8990000000031', 'Dunlop', 8, 1, 215, 55, '17', '215/55 R17', 'SP Sport LM705', 'BARU', '2026', 1040000.00, 1196000.00, NULL, 4, 4, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(32, 'Bridgestone Turanza T005A 225/50 R17', 'BRI-22550-17-0032', '8990000000032', 'Bridgestone', 2, 1, 225, 50, '17', '225/50 R17', 'Turanza T005A', 'BARU', '2026', 1380000.00, 1587000.00, NULL, 3, 3, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(33, 'Swallow Jeep Service 6.50-16 6PR', 'SWA-650-16-0033', '8990000000033', 'Swallow', 4, 7, 650, 0, '16', '6.50-16', 'Jeep Service (bias)', 'BARU', '2026', 1100000.00, 1265000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(34, 'Swallow Jeep Service 7.00-16 8PR', 'SWA-700-16-0034', '8990000000034', 'Swallow', 4, 7, 700, 0, '16', '7.00-16', 'Jeep Service (bias)', 'BARU', '2026', 1350000.00, 1552500.00, NULL, 12, 12, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(35, 'Swallow Jeep Service 7.00-16 14PR', 'SWA-700-16-0035', '8990000000035', 'Swallow', 4, 7, 700, 0, '16', '7.00-16', 'Jeep Service (bias)', 'BARU', '2026', 1500000.00, 1725000.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(36, 'Swallow Jeep Service 7.50-16 8PR', 'SWA-750-16-0036', '8990000000036', 'Swallow', 4, 7, 750, 0, '16', '7.50-16', 'Jeep Service (bias)', 'BARU', '2026', 1450000.00, 1667500.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(37, 'Forceum M/T 08 235/75 R15', 'FOR-23575-15-0037', '8990000000037', 'Forceum', 10, 7, 235, 75, '15', '235/75 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1100000.00, 1265000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(38, 'Accelera M/T-01 235/75 R15', 'ACC-23575-15-0038', '8990000000038', 'Accelera', 9, 7, 235, 75, '15', '235/75 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1200000.00, 1380000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(39, 'Delium Terra Warrior M/T 235/75 R15', 'DEL-23575-15-0039', '8990000000039', 'Delium', 12, 7, 235, 75, '15', '235/75 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1200000.00, 1380000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(40, 'GT Radial Savero M/T Pro 235/75 R15', 'GTR-23575-15-0040', '8990000000040', 'GT', 3, 7, 235, 75, '15', '235/75 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1290000.00, 1483500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(41, 'GT Radial Savero SUV 235/75 R15', 'GTR-23575-15-0041', '8990000000041', 'GT', 3, 7, 235, 75, '15', '235/75 R15', 'H/T (Highway)', 'BARU', '2026', 1000000.00, 1150000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(42, 'Accelera M/T-01 30x9.5 R15', 'ACC-30-15-0042', '8990000000042', 'Accelera', 9, 7, 30, 0, '15', '30x9.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1250000.00, 1437500.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(43, 'Forceum M/T 08 31x10.5 R15', 'FOR-31-15-0043', '8990000000043', 'Forceum', 10, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1330000.00, 1529500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(44, 'Accelera M/T-01 31x10.5 R15', 'ACC-31-15-0044', '8990000000044', 'Accelera', 9, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1380000.00, 1587000.00, NULL, 12, 12, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(45, 'GT Radial Adventuro M/T 31x10.5 R15', 'GTR-31-15-0045', '8990000000045', 'GT', 3, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1550000.00, 1782500.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(46, 'Federal Couragia M/T 31x10.5 R15', 'FED-31-15-0046', '8990000000046', 'Federal', 22, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1500000.00, 1725000.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(47, 'Delium Terra Raider M/T 31x10.5 R15', 'DEL-31-15-0047', '8990000000047', 'Delium', 12, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1700000.00, 1955000.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(48, 'Bridgestone Dueler M/T D674 31x10.5 R15', 'BRI-31-15-0048', '8990000000048', 'Bridgestone', 2, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1850000.00, 2127500.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(49, 'Maxxis Bighorn MT-764 31x10.5 R15', 'MAX-31-15-0049', '8990000000049', 'Maxxis', 32, 7, 31, 0, '15', '31x10.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 2300000.00, 2645000.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(50, 'Accelera M/T-01 33x12.5 R15', 'ACC-33-15-0050', '8990000000050', 'Accelera', 9, 7, 33, 0, '15', '33x12.5 R15', 'M/T (Mud Terrain)', 'BARU', '2026', 1900000.00, 2185000.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(51, 'Achilles Desert Hawk X-MT 33x12.5 R15', 'ACH-33-15-0051', '8990000000051', 'Achilles', 1, 7, 33, 0, '15', '33x12.5 R15', 'X-MT (Mud Terrain)', 'BARU', '2026', 2200000.00, 2530000.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(52, 'Accelera M/T-01 235/85 R16', 'ACC-23585-16-0052', '8990000000052', 'Accelera', 9, 7, 235, 85, '16', '235/85 R16', 'M/T (Mud Terrain)', 'BARU', '2026', 1650000.00, 1897500.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(53, 'GT Radial Adventuro M/T 235/85 R16', 'GTR-23585-16-0053', '8990000000053', 'GT', 3, 7, 235, 85, '16', '235/85 R16', 'M/T (Mud Terrain)', 'BARU', '2026', 1950000.00, 2242500.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(54, 'Bridgestone Dueler A/T 697 245/70 R16', 'BRI-24570-16-0054', '8990000000054', 'Bridgestone', 2, 7, 245, 70, '16', '245/70 R16', 'A/T (All Terrain)', 'BARU', '2026', 1800000.00, 2070000.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(55, 'Dunlop Grandtrek AT3 245/70 R16', 'DUN-24570-16-0055', '8990000000055', 'Dunlop', 8, 7, 245, 70, '16', '245/70 R16', 'A/T (All Terrain)', 'BARU', '2026', 1550000.00, 1782500.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(56, 'GT Radial Savero A/T Pro 265/70 R16', 'GTR-26570-16-0056', '8990000000056', 'GT', 3, 7, 265, 70, '16', '265/70 R16', 'A/T (All Terrain)', 'BARU', '2026', 1250000.00, 1437500.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(57, 'Dunlop Grandtrek AT3 265/70 R16', 'DUN-26570-16-0057', '8990000000057', 'Dunlop', 8, 7, 265, 70, '16', '265/70 R16', 'A/T (All Terrain)', 'BARU', '2026', 1700000.00, 1955000.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(58, 'Toyo Open Country A/T III 265/70 R16', 'TOY-26570-16-0058', '8990000000058', 'Toyo', 27, 7, 265, 70, '16', '265/70 R16', 'A/T (All Terrain)', 'BARU', '2026', 2200000.00, 2530000.00, NULL, 3, 3, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(59, 'Falken Wildpeak A/T3W 265/70 R16', 'FAL-26570-16-0059', '8990000000059', 'Falken', 16, 7, 265, 70, '16', '265/70 R16', 'A/T (All Terrain)', 'BARU', '2026', 2300000.00, 2645000.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(60, 'GT Radial Savero A/T Pro 265/65 R17', 'GTR-26565-17-0060', '8990000000060', 'GT', 3, 7, 265, 65, '17', '265/65 R17', 'A/T (All Terrain)', 'BARU', '2026', 1350000.00, 1552500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(61, 'Dunlop Grandtrek AT3 265/65 R17', 'DUN-26565-17-0061', '8990000000061', 'Dunlop', 8, 7, 265, 65, '17', '265/65 R17', 'A/T (All Terrain)', 'BARU', '2026', 1800000.00, 2070000.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(62, 'Bridgestone Dueler A/T 693 III 265/65 R17', 'BRI-26565-17-0062', '8990000000062', 'Bridgestone', 2, 7, 265, 65, '17', '265/65 R17', 'A/T (All Terrain)', 'BARU', '2026', 1950000.00, 2242500.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(63, 'Hankook Dynapro AT2 265/65 R17', 'HAN-26565-17-0063', '8990000000063', 'Hankook', 11, 7, 265, 65, '17', '265/65 R17', 'A/T (All Terrain)', 'BARU', '2026', 1950000.00, 2242500.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(64, 'Yokohama Geolandar A/T G015 265/65 R17', 'YOK-26565-17-0064', '8990000000064', 'Yokohama', 18, 7, 265, 65, '17', '265/65 R17', 'A/T (All Terrain)', 'BARU', '2026', 2350000.00, 2702500.00, NULL, 3, 3, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(65, 'Dunlop SP LT5 155 R12 8PR', 'DUN-155-12-0065', '8990000000065', 'Dunlop', 8, 2, 155, 0, '12', '155 R12', 'SP LT5', 'BARU', '2026', 440000.00, 506000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(66, 'Forceum Digon 185 R14 8PR', 'FOR-185-14-0066', '8990000000066', 'Forceum', 10, 2, 185, 0, '14', '185 R14', 'Digon', 'BARU', '2026', 680000.00, 782000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(67, 'Dunlop SP LT5 185 R14 8PR', 'DUN-185-14-0067', '8990000000067', 'Dunlop', 8, 2, 185, 0, '14', '185 R14', 'SP LT5', 'BARU', '2026', 730000.00, 839500.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(68, 'GT Radial Maxmiler Pro 185 R14 8PR', 'GTR-185-14-0068', '8990000000068', 'GT', 3, 2, 185, 0, '14', '185 R14', 'Maxmiler Pro', 'BARU', '2026', 780000.00, 897000.00, NULL, 12, 12, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(69, 'Bridgestone Duravis R624 185 R14 8PR', 'BRI-185-14-0069', '8990000000069', 'Bridgestone', 2, 2, 185, 0, '14', '185 R14', 'Duravis R624', 'BARU', '2026', 960000.00, 1104000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(70, 'GT Radial Maxmiler Pro 195 R15C 8PR', 'GTR-195-15-0070', '8990000000070', 'GT', 3, 2, 195, 0, '15', '195 R15C', 'Maxmiler Pro', 'BARU', '2026', 920000.00, 1058000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(71, 'Bridgestone Duravis R624 195 R15C 8PR', 'BRI-195-15-0071', '8990000000071', 'Bridgestone', 2, 2, 195, 0, '15', '195 R15C', 'Duravis R624', 'BARU', '2026', 1060000.00, 1219000.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(72, 'Bridgestone Duravis R630 225/75 R16C ', 'BRI-22575-16-0072', '8990000000072', 'Bridgestone', 2, 2, 225, 75, '16', '225/75 R16C', 'Duravis R630', 'BARU', '2026', 1350000.00, 1552500.00, NULL, 6, 6, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(73, 'Bridgestone Bias 7.50-16 7.50-16 14PR', 'BRI-750-16-0073', '8990000000073', 'Bridgestone', 2, 2, 750, 0, '16', '7.50-16', 'Bias Lug', 'BARU', '2026', 1580000.00, 1817000.00, NULL, 4, 4, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(74, 'Gajah Tunggal Super 88 7.50-16 14PR', 'GTR-750-16-0074', '8990000000074', 'GT', 3, 2, 750, 0, '16', '7.50-16', 'Super 88 Lug', 'BARU', '2026', 1600000.00, 1840000.00, NULL, 6, 6, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(75, 'Gajah Tunggal Lug Pro 8.25-16 14PR', 'GTR-825-16-0075', '8990000000075', 'GT', 3, 2, 825, 0, '16', '8.25-16', 'Lug Pro', 'BARU', '2026', 2000000.00, 2300000.00, NULL, 3, 3, 2, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(76, 'Swallow Ban Dalam 6.50-16', 'SWA-650-16-0076', '8990000000076', 'Swallow', 4, 4, 650, 0, '16', '6.50-16', 'Ban Dalam', 'BARU', '2026', 130000.00, 149500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(77, 'Swallow Ban Dalam 7.00-16', 'SWA-700-16-0077', '8990000000077', 'Swallow', 4, 4, 700, 0, '16', '7.00-16', 'Ban Dalam', 'BARU', '2026', 160000.00, 184000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(78, 'Swallow Ban Dalam 7.50-16', 'SWA-750-16-0078', '8990000000078', 'Swallow', 4, 4, 750, 0, '16', '7.50-16', 'Ban Dalam', 'BARU', '2026', 200000.00, 230000.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(79, 'Swallow Flap 7.00-16', 'SWA-700-16-0079', '8990000000079', 'Swallow', 4, 4, 700, 0, '16', '7.00-16', 'Flap (Marset)', 'BARU', '2026', 60000.00, 69000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(80, 'Swallow Flap 7.50-16', 'SWA-750-16-0080', '8990000000080', 'Swallow', 4, 4, 750, 0, '16', '7.50-16', 'Flap (Marset)', 'BARU', '2026', 70000.00, 80500.00, NULL, 8, 8, 3, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(81, 'GT Ban Dalam 165 R13', 'GTR-165-13-0081', '8990000000081', 'GT', 3, 4, 165, 0, '13', '165 R13', 'Ban Dalam', 'BARU', '2026', 60000.00, 69000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(82, 'GT Ban Dalam 185 R14', 'GTR-185-14-0082', '8990000000082', 'GT', 3, 4, 185, 0, '14', '185 R14', 'Ban Dalam', 'BARU', '2026', 70000.00, 80500.00, NULL, 12, 12, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(83, 'GT Ban Dalam 195 R15', 'GTR-195-15-0083', '8990000000083', 'GT', 3, 4, 195, 0, '15', '195 R15', 'Ban Dalam', 'BARU', '2026', 80000.00, 92000.00, NULL, 10, 10, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `product_batches`
--

CREATE TABLE `product_batches` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `purchase_id` bigint UNSIGNED DEFAULT NULL,
  `batch_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_date` date NOT NULL,
  `batch_cost` decimal(15,2) NOT NULL,
  `initial_qty` int UNSIGNED NOT NULL,
  `remaining_qty` int UNSIGNED NOT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_batches`
--

INSERT INTO `product_batches` (`id`, `product_id`, `purchase_id`, `batch_code`, `source_name`, `purchase_date`, `batch_cost`, `initial_qty`, `remaining_qty`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, 1, NULL, 'OB3-OPEN-GTR-15580-13-0001', 'Sumber Harapan', '2026-10-05', 420000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(2, 2, NULL, 'OB3-OPEN-BRI-16580-13-0002', 'PT Bridgestone Tire Indonesia', '2026-10-05', 570000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(3, 3, NULL, 'OB3-OPEN-GTR-16580-13-0003', 'Sumber Harapan', '2026-10-05', 460000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(4, 4, NULL, 'OB3-OPEN-DUN-16580-13-0004', 'Sumber Harapan', '2026-10-05', 490000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(5, 5, NULL, 'OB3-OPEN-ACC-16580-13-0005', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 410000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(6, 6, NULL, 'OB3-OPEN-GTR-16565-14-0006', 'Sumber Harapan', '2026-10-05', 440000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(7, 7, NULL, 'OB3-OPEN-BRI-17565-14-0007', 'PT Bridgestone Tire Indonesia', '2026-10-05', 640000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(8, 8, NULL, 'OB3-OPEN-GTR-17565-14-0008', 'Sumber Harapan', '2026-10-05', 510000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(9, 9, NULL, 'OB3-OPEN-DUN-17565-14-0009', 'Sumber Harapan', '2026-10-05', 560000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(10, 10, NULL, 'OB3-OPEN-ACC-17565-14-0010', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 430000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(11, 11, NULL, 'OB3-OPEN-BRI-18570-14-0011', 'PT Bridgestone Tire Indonesia', '2026-10-05', 650000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(12, 12, NULL, 'OB3-OPEN-GTR-18570-14-0012', 'Sumber Harapan', '2026-10-05', 520000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(13, 13, NULL, 'OB3-OPEN-DUN-18570-14-0013', 'Sumber Harapan', '2026-10-05', 540000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(14, 14, NULL, 'OB3-OPEN-ACC-18570-14-0014', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 440000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(15, 15, NULL, 'OB3-OPEN-BRI-18565-15-0015', 'PT Bridgestone Tire Indonesia', '2026-10-05', 780000.00, 12, 12, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(16, 16, NULL, 'OB3-OPEN-GTR-18565-15-0016', 'Sumber Harapan', '2026-10-05', 590000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(17, 17, NULL, 'OB3-OPEN-DUN-18565-15-0017', 'Sumber Harapan', '2026-10-05', 650000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(18, 18, NULL, 'OB3-OPEN-ACC-18565-15-0018', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 500000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(19, 19, NULL, 'OB3-OPEN-DUN-19560-15-0019', 'Sumber Harapan', '2026-10-05', 690000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(20, 20, NULL, 'OB3-OPEN-BRI-19565-15-0020', 'PT Bridgestone Tire Indonesia', '2026-10-05', 820000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(21, 21, NULL, 'OB3-OPEN-DUN-19565-15-0021', 'Sumber Harapan', '2026-10-05', 740000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(22, 22, NULL, 'OB3-OPEN-GTR-19565-15-0022', 'Sumber Harapan', '2026-10-05', 620000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(23, 23, NULL, 'OB3-OPEN-DUN-20565-15-0023', 'Sumber Harapan', '2026-10-05', 700000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(24, 24, NULL, 'OB3-OPEN-BRI-20565-15-0024', 'PT Bridgestone Tire Indonesia', '2026-10-05', 880000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(25, 25, NULL, 'OB3-OPEN-GTR-20565-15-0025', 'Sumber Harapan', '2026-10-05', 640000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(26, 26, NULL, 'OB3-OPEN-ACC-19550-16-0026', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 600000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(27, 27, NULL, 'OB3-OPEN-DUN-20555-16-0027', 'Sumber Harapan', '2026-10-05', 920000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(28, 28, NULL, 'OB3-OPEN-BRI-20555-16-0028', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1150000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(29, 29, NULL, 'OB3-OPEN-BRI-21560-16-0029', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1250000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(30, 30, NULL, 'OB3-OPEN-ACC-21545-17-0030', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 760000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(31, 31, NULL, 'OB3-OPEN-DUN-21555-17-0031', 'Sumber Harapan', '2026-10-05', 1040000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(32, 32, NULL, 'OB3-OPEN-BRI-22550-17-0032', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1380000.00, 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(33, 33, NULL, 'OB3-OPEN-SWA-650-16-0033', 'Sumber Harapan', '2026-10-05', 1100000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(34, 34, NULL, 'OB3-OPEN-SWA-700-16-0034', 'Sumber Harapan', '2026-10-05', 1350000.00, 12, 12, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(35, 35, NULL, 'OB3-OPEN-SWA-700-16-0035', 'Sumber Harapan', '2026-10-05', 1500000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(36, 36, NULL, 'OB3-OPEN-SWA-750-16-0036', 'Sumber Harapan', '2026-10-05', 1450000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(37, 37, NULL, 'OB3-OPEN-FOR-23575-15-0037', 'Masa Sempurna', '2026-10-05', 1100000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(38, 38, NULL, 'OB3-OPEN-ACC-23575-15-0038', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 1200000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(39, 39, NULL, 'OB3-OPEN-DEL-23575-15-0039', 'Masa Sempurna', '2026-10-05', 1200000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(40, 40, NULL, 'OB3-OPEN-GTR-23575-15-0040', 'Sumber Harapan', '2026-10-05', 1290000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(41, 41, NULL, 'OB3-OPEN-GTR-23575-15-0041', 'Sumber Harapan', '2026-10-05', 1000000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(42, 42, NULL, 'OB3-OPEN-ACC-30-15-0042', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 1250000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(43, 43, NULL, 'OB3-OPEN-FOR-31-15-0043', 'Masa Sempurna', '2026-10-05', 1330000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(44, 44, NULL, 'OB3-OPEN-ACC-31-15-0044', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 1380000.00, 12, 12, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(45, 45, NULL, 'OB3-OPEN-GTR-31-15-0045', 'Sumber Harapan', '2026-10-05', 1550000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(46, 46, NULL, 'OB3-OPEN-FED-31-15-0046', 'Masa Sempurna', '2026-10-05', 1500000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(47, 47, NULL, 'OB3-OPEN-DEL-31-15-0047', 'Masa Sempurna', '2026-10-05', 1700000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(48, 48, NULL, 'OB3-OPEN-BRI-31-15-0048', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1850000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(49, 49, NULL, 'OB3-OPEN-MAX-31-15-0049', 'Masa Sempurna', '2026-10-05', 2300000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(50, 50, NULL, 'OB3-OPEN-ACC-33-15-0050', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 1900000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(51, 51, NULL, 'OB3-OPEN-ACH-33-15-0051', 'Masa Sempurna', '2026-10-05', 2200000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(52, 52, NULL, 'OB3-OPEN-ACC-23585-16-0052', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', 1650000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(53, 53, NULL, 'OB3-OPEN-GTR-23585-16-0053', 'Sumber Harapan', '2026-10-05', 1950000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(54, 54, NULL, 'OB3-OPEN-BRI-24570-16-0054', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1800000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(55, 55, NULL, 'OB3-OPEN-DUN-24570-16-0055', 'Sumber Harapan', '2026-10-05', 1550000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(56, 56, NULL, 'OB3-OPEN-GTR-26570-16-0056', 'Sumber Harapan', '2026-10-05', 1250000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(57, 57, NULL, 'OB3-OPEN-DUN-26570-16-0057', 'Sumber Harapan', '2026-10-05', 1700000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(58, 58, NULL, 'OB3-OPEN-TOY-26570-16-0058', 'Grazia Ban', '2026-10-05', 2200000.00, 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(59, 59, NULL, 'OB3-OPEN-FAL-26570-16-0059', 'Grazia Ban', '2026-10-05', 2300000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(60, 60, NULL, 'OB3-OPEN-GTR-26565-17-0060', 'Sumber Harapan', '2026-10-05', 1350000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(61, 61, NULL, 'OB3-OPEN-DUN-26565-17-0061', 'Sumber Harapan', '2026-10-05', 1800000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(62, 62, NULL, 'OB3-OPEN-BRI-26565-17-0062', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1950000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(63, 63, NULL, 'OB3-OPEN-HAN-26565-17-0063', 'Grazia Ban', '2026-10-05', 1950000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(64, 64, NULL, 'OB3-OPEN-YOK-26565-17-0064', 'Grazia Ban', '2026-10-05', 2350000.00, 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(65, 65, NULL, 'OB3-OPEN-DUN-155-12-0065', 'Sumber Harapan', '2026-10-05', 440000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(66, 66, NULL, 'OB3-OPEN-FOR-185-14-0066', 'Masa Sempurna', '2026-10-05', 680000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(67, 67, NULL, 'OB3-OPEN-DUN-185-14-0067', 'Sumber Harapan', '2026-10-05', 730000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(68, 68, NULL, 'OB3-OPEN-GTR-185-14-0068', 'Sumber Harapan', '2026-10-05', 780000.00, 12, 12, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(69, 69, NULL, 'OB3-OPEN-BRI-185-14-0069', 'PT Bridgestone Tire Indonesia', '2026-10-05', 960000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(70, 70, NULL, 'OB3-OPEN-GTR-195-15-0070', 'Sumber Harapan', '2026-10-05', 920000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(71, 71, NULL, 'OB3-OPEN-BRI-195-15-0071', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1060000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(72, 72, NULL, 'OB3-OPEN-BRI-22575-16-0072', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1350000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(73, 73, NULL, 'OB3-OPEN-BRI-750-16-0073', 'PT Bridgestone Tire Indonesia', '2026-10-05', 1580000.00, 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(74, 74, NULL, 'OB3-OPEN-GTR-750-16-0074', 'Sumber Harapan', '2026-10-05', 1600000.00, 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(75, 75, NULL, 'OB3-OPEN-GTR-825-16-0075', 'Sumber Harapan', '2026-10-05', 2000000.00, 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(76, 76, NULL, 'OB3-OPEN-SWA-650-16-0076', 'Supplier Ban Indotama', '2026-10-05', 130000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(77, 77, NULL, 'OB3-OPEN-SWA-700-16-0077', 'Supplier Ban Indotama', '2026-10-05', 160000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(78, 78, NULL, 'OB3-OPEN-SWA-750-16-0078', 'Supplier Ban Indotama', '2026-10-05', 200000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(79, 79, NULL, 'OB3-OPEN-SWA-700-16-0079', 'Supplier Ban Indotama', '2026-10-05', 60000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(80, 80, NULL, 'OB3-OPEN-SWA-750-16-0080', 'Supplier Ban Indotama', '2026-10-05', 70000.00, 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(81, 81, NULL, 'OB3-OPEN-GTR-165-13-0081', 'Supplier Ban Indotama', '2026-10-05', 60000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(82, 82, NULL, 'OB3-OPEN-GTR-185-14-0082', 'Supplier Ban Indotama', '2026-10-05', 70000.00, 12, 12, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(83, 83, NULL, 'OB3-OPEN-GTR-195-15-0083', 'Supplier Ban Indotama', '2026-10-05', 80000.00, 10, 10, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51');

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

CREATE TABLE `product_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `category_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_categories`
--

INSERT INTO `product_categories` (`id`, `category_code`, `category_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'BAN-MOBIL', 'Ban Mobil', NULL, 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(2, 'BAN-TRUCK', 'Ban Niaga, Pickup & Truk Ringan', 'Ban pickup L300/Carry, Hiace, Elf, Colt Diesel', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(3, 'VELG', 'Velg Mobil Racing & OEM', 'Velg mobil variasi dan standar pabrik', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(4, 'BAN_DALAM', 'Ban Dalam & Marset (Flap)', 'Ban dalam tube type, karet marset pelindung velg, dan pentil', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(5, 'OLI_PELUMAS', 'Oli & Pelumas Mesin', 'Pelumas mesin bensin/diesel dan filter oli', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(6, 'AKSESORIS', 'Aksesoris & Mur Roda', 'Baut roda racing, center ring velg, dan spacer', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(7, 'BAN-JEEP', 'Ban Jeep, SUV & Offroad 4x4', 'Ban mud terrain / all terrain / jeep service untuk Willys, Hardtop, Jimny, Katana, Taft, jeep wisata lava tour dan SUV', 1, '2026-11-24 17:00:00', '2026-11-24 17:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `product_price_audits`
--

CREATE TABLE `product_price_audits` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `sale_id` bigint UNSIGNED DEFAULT NULL,
  `sale_detail_id` bigint UNSIGNED DEFAULT NULL,
  `old_cost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `new_cost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `reference_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `old_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `new_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cost_change_percent` decimal(8,2) DEFAULT NULL,
  `price_change_percent` decimal(8,2) DEFAULT NULL,
  `markup_percent` decimal(8,2) DEFAULT NULL,
  `change_source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `changed_field` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `context_month` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` bigint UNSIGNED DEFAULT NULL,
  `actor_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `applies_to` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CATALOG',
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_read_by_owner` tinyint(1) NOT NULL DEFAULT '0',
  `is_reviewed_by_owner` tinyint(1) NOT NULL DEFAULT '0',
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `reviewed_by` bigint UNSIGNED DEFAULT NULL,
  `review_notes` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

CREATE TABLE `purchases` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_id` bigint UNSIGNED DEFAULT NULL,
  `supplier_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_invoice` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `purchase_date` date NOT NULL,
  `payment_method` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `due_date` date DEFAULT NULL,
  `total_amount` decimal(15,2) NOT NULL,
  `dpp_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `ppn_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `returned_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `journal_entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `purchase_payments`
--

CREATE TABLE `purchase_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_id` bigint UNSIGNED NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `journal_entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `purchase_returns`
--

CREATE TABLE `purchase_returns` (
  `id` bigint UNSIGNED NOT NULL,
  `reference` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `purchase_id` bigint UNSIGNED NOT NULL,
  `kind` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `return_date` date NOT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int UNSIGNED NOT NULL,
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payable_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `refund_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `refund_account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `journal_entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `purchase_return_items`
--

CREATE TABLE `purchase_return_items` (
  `id` bigint UNSIGNED NOT NULL,
  `purchase_return_id` bigint UNSIGNED NOT NULL,
  `product_batch_id` bigint UNSIGNED DEFAULT NULL,
  `quantity` int UNSIGNED NOT NULL,
  `unit_cost` decimal(15,2) NOT NULL,
  `total_cost` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `qris_transactions`
--

CREATE TABLE `qris_transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `order_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gross_amount` decimal(15,2) NOT NULL,
  `transaction_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `settlement_source` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `settled_at` timestamp NULL DEFAULT NULL,
  `sale_payment_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `receivable_payments`
--

CREATE TABLE `receivable_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `sale_id` bigint UNSIGNED NOT NULL,
  `payment_date` date NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `journal_entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `id` bigint UNSIGNED NOT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--

INSERT INTO `role_permissions` (`id`, `role`, `permission_key`, `allowed`, `created_at`, `updated_at`) VALUES
(1, 'KASIR', 'cash_session', 1, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(2, 'GUDANG', 'cash_session', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(3, 'KASIR', 'cash_session_approve', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(4, 'GUDANG', 'cash_session_approve', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(5, 'KASIR', 'cash_movement', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(6, 'GUDANG', 'cash_movement', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(7, 'KASIR', 'sales_return', 1, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(8, 'GUDANG', 'sales_return', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(9, 'KASIR', 'purchase_return', 0, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(10, 'GUDANG', 'purchase_return', 1, '2026-10-05 08:32:47', '2026-10-05 08:32:47'),
(11, 'KASIR', 'daily_reports', 1, '2026-10-05 08:32:49', '2026-10-05 08:32:49'),
(12, 'GUDANG', 'daily_reports', 0, '2026-10-05 08:32:49', '2026-10-05 08:32:49'),
(13, 'KASIR', 'dashboard', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(14, 'KASIR', 'pos', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(15, 'KASIR', 'receipt', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(16, 'KASIR', 'sale_void', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(17, 'KASIR', 'inventory_view', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(18, 'KASIR', 'inventory_manage', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(19, 'KASIR', 'goods_receipt', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(20, 'KASIR', 'stock_opname', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(21, 'KASIR', 'expenses', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(22, 'KASIR', 'accounts_payable', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(23, 'KASIR', 'accounting_hub', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(24, 'KASIR', 'financial_reports', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(25, 'KASIR', 'role_settings', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(26, 'KASIR', 'fixed_assets', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(27, 'KASIR', 'bank_reconciliation', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(28, 'GUDANG', 'dashboard', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(29, 'GUDANG', 'pos', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(30, 'GUDANG', 'receipt', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(31, 'GUDANG', 'sale_void', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(32, 'GUDANG', 'inventory_view', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(33, 'GUDANG', 'inventory_manage', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(34, 'GUDANG', 'goods_receipt', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(35, 'GUDANG', 'stock_opname', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(36, 'GUDANG', 'expenses', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(37, 'GUDANG', 'accounts_payable', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(38, 'GUDANG', 'accounting_hub', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(39, 'GUDANG', 'financial_reports', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(40, 'GUDANG', 'role_settings', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(41, 'GUDANG', 'fixed_assets', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(42, 'GUDANG', 'bank_reconciliation', 0, '2026-10-05 08:32:51', '2026-10-05 08:32:51');

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` bigint UNSIGNED NOT NULL,
  `reference` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pelanggan Walk-In',
  `customer_phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `vehicle_plate` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Umum',
  `vehicle_model` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cashier_name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Fani A.',
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `gross_sales_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `change_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `dp_applied` decimal(15,2) NOT NULL DEFAULT '0.00',
  `booking_id` bigint UNSIGNED DEFAULT NULL,
  `payment_method` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payment_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_provider` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edc_bank` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edc_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fee_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `fee_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `surcharge_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_received` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_profit` decimal(15,2) NOT NULL DEFAULT '0.00',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LUNAS',
  `due_date` date DEFAULT NULL,
  `stock_deducted` tinyint(1) NOT NULL DEFAULT '1',
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `voided_at` timestamp NULL DEFAULT NULL,
  `voided_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `void_reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `sales_bookings`
--

CREATE TABLE `sales_bookings` (
  `id` bigint UNSIGNED NOT NULL,
  `booking_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `customer_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_plate` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `vehicle_model` varchar(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `items` json DEFAULT NULL,
  `estimated_total` decimal(15,2) NOT NULL DEFAULT '0.00',
  `dp_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `remaining_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `payment_method` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'TRANSFER_BCA',
  `dp_account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `converted_sale_id` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sales_returns`
--

CREATE TABLE `sales_returns` (
  `id` bigint UNSIGNED NOT NULL,
  `reference` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` bigint UNSIGNED NOT NULL,
  `return_date` date NOT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `refund_cash` decimal(15,2) NOT NULL DEFAULT '0.00',
  `refund_bank` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cost_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cash_session_id` bigint UNSIGNED DEFAULT NULL,
  `journal_entry_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by` bigint UNSIGNED DEFAULT NULL,
  `operator_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` bigint UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `sales_return_items`
--

CREATE TABLE `sales_return_items` (
  `id` bigint UNSIGNED NOT NULL,
  `sales_return_id` bigint UNSIGNED NOT NULL,
  `sale_detail_id` bigint UNSIGNED NOT NULL,
  `quantity` int UNSIGNED NOT NULL,
  `refund_amount` decimal(15,2) NOT NULL,
  `cost_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `sale_batch_allocations`
--

CREATE TABLE `sale_batch_allocations` (
  `id` bigint UNSIGNED NOT NULL,
  `sale_detail_id` bigint UNSIGNED NOT NULL,
  `product_batch_id` bigint UNSIGNED NOT NULL,
  `quantity_allocated` int UNSIGNED NOT NULL,
  `quantity_returned` int UNSIGNED NOT NULL DEFAULT '0',
  `unit_cost` decimal(15,2) NOT NULL,
  `total_cost` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `sale_details`
--

CREATE TABLE `sale_details` (
  `id` bigint UNSIGNED NOT NULL,
  `sale_id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED DEFAULT NULL,
  `item_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PRODUCT',
  `item_name` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `service_id` bigint UNSIGNED DEFAULT NULL,
  `is_manual` tinyint(1) NOT NULL DEFAULT '0',
  `quantity` int UNSIGNED NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `catalog_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `reference_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `sub_total` decimal(15,2) NOT NULL,
  `unit_cost_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_cost_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `price_override_type` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price_override_reason` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `profit_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `sale_payments`
--

CREATE TABLE `sale_payments` (
  `id` bigint UNSIGNED NOT NULL,
  `sale_id` bigint UNSIGNED NOT NULL,
  `method` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `account_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `tendered_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `change_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `fee_percentage` decimal(5,2) NOT NULL DEFAULT '0.00',
  `fee_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `surcharge_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `net_received` decimal(15,2) NOT NULL DEFAULT '0.00',
  `provider_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edc_bank` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `edc_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- --------------------------------------------------------

--
-- Table structure for table `service_categories`
--

CREATE TABLE `service_categories` (
  `id` bigint UNSIGNED NOT NULL,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_categories`
--

INSERT INTO `service_categories` (`id`, `code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'SPOORING', 'Spooring 3D & Alignment', 'Layanan penyelarasan sudut roda komputerisasi 3D', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(2, 'BALANCING', 'Balancing Roda', 'Penyeimbangan putaran roda dan timah balancing', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(3, 'SERVICE', 'Jasa Bengkel & Pemasangan', 'Bongkar pasang ban, tambal tubeless/tiptop, nitrogen, dan rotasi', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(4, 'GOODS', 'Suku Cadang Kecil & Pentil', 'Dop pentil tubeless dan mur roda standar', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(5, 'CUSTOM', 'Jasa & Variasi Kustom', 'Baut chamber kit, mur variasi, dan setting kaki-kaki', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37');

-- --------------------------------------------------------

--
-- Table structure for table `service_masters`
--

CREATE TABLE `service_masters` (
  `id` bigint UNSIGNED NOT NULL,
  `service_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `standard_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cost_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `service_masters`
--

INSERT INTO `service_masters` (`id`, `service_code`, `service_name`, `category`, `standard_price`, `cost_price`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'JASA-SPOORING-3D', 'Jasa Spooring 3D Komputerized', 'SPOORING', 150000.00, 0.00, 'Garansi 7 hari / 500 km', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(2, 'JASA-BALANCING-WHEEL', 'Jasa Balancing Roda Mobil', 'BALANCING', 35000.00, 0.00, 'Per roda (termasuk timah balancing)', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(3, 'OB-JASA-001', 'Bongkar Pasang Ban K', 'SERVICE', 25000.00, 0.00, 'Jasa pemasangan ban standar', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(4, 'OB-JASA-002', 'Balancing B', 'SERVICE', 35000.00, 0.00, 'Jasa balancing roda', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(5, 'OB-JASA-003', 'Spooring B', 'SERVICE', 150000.00, 0.00, 'Jasa spooring/alignment roda', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(6, 'OB-JASA-004', 'Tambal Ban Tubeless', 'SERVICE', 35000.00, 0.00, 'Jasa tambal ban tubeless', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(7, 'OB-JASA-005', 'Isi Nitrogen', 'SERVICE', 15000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(8, 'OB-JASA-006', 'Dop Pentil + Bongkar Pasang', 'SERVICE', 35000.00, 1100.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(9, 'OB-JASA-007', 'Balancing K', 'SERVICE', 25000.00, 0.00, 'Jasa Balancing Ban', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(10, 'OB-JASA-008', 'Spooring A', 'SERVICE', 125000.00, 0.00, 'Spooring Ban Kecil', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(11, 'OB-JASA-009', 'Tambal Tiptop 1 Kerusakan', 'SERVICE', 75000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(12, 'OB-JASA-010', 'Tambal Tiptop 2 Kerusakan', 'SERVICE', 125000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(13, 'OB-JASA-011', 'Jasa Oper Ban', 'SERVICE', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(14, 'OB-JASA-012', 'Balancing (FREE)', 'SERVICE', 0.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(15, 'OB-JASA-013', 'Dop Pentil', 'GOODS', 10000.00, 1100.00, 'Dop Pentil Ban/Tubeless', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(16, 'OB-JASA-014', 'Bongkar Pasang Ban B', 'SERVICE', 35000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(17, 'OB-JASA-015', 'Dop Pentil (FREE)', 'GOODS', 0.00, 1100.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(18, 'OB-JASA-016', 'Jasa Pasang K', 'SERVICE', 15000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(19, 'OB-JASA-017', 'Baut Chamber 12-14mm', 'SERVICE', 40000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(20, 'OB-JASA-018', 'Jasa Pres Ban', 'SERVICE', 125000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(21, 'OB-JASA-019', 'Bongkar Pasang (Velg Lebar)', 'SERVICE', 50000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(22, 'OB-JASA-020', 'Mur Roda 12x1.5 21 Panjang', 'GOODS', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(23, 'OB-JASA-021', 'Jasa Cek Ban', 'SERVICE', 15000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(24, 'OB-JASA-022', 'Jasa Pasang Ban Dalam', 'SERVICE', 10000.00, 0.00, 'Dengan disertai pembelian ban dalam', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(25, 'OB-JASA-023', 'Bongkar Pasang Serep', 'SERVICE', 25000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(26, 'OB-JASA-024', 'Jasa Home Service', 'SERVICE', 50000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(27, 'OB-JASA-025', 'Bongkar Pasang Serep (FREE)', 'SERVICE', 0.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(28, 'OB-JASA-026', 'Mur Roda (FREE)', 'GOODS', 0.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(29, 'OB-JASA-027', 'Jasa Balancing', 'SERVICE', 30000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(30, 'OB-JASA-028', 'Mur Roda 12x1.5 21 Pendek', 'GOODS', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(31, 'OB-JASA-029', 'Mur Roda 12x1.25 21 Panjang', 'SERVICE', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(32, 'OB-JASA-030', 'Mur Roda 12x1.25 21 Pendek', 'GOODS', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(33, 'OB-JASA-031', 'Mur Roda 12x1.5 19 Panjang', 'SERVICE', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(34, 'OB-JASA-032', 'Mur Roda 12x1.5 19 Pendek', 'GOODS', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(35, 'OB-JASA-033', 'Mur Roda 12x1.25 19 Panjang', 'GOODS', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(36, 'OB-JASA-034', 'Mur Roda 12x1.25 19 Pendek', 'GOODS', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(37, 'OB-JASA-035', 'Mur L 12x1.5 (Variasi)', 'CUSTOM', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(38, 'OB-JASA-036', 'Mur L 12x1.25 (Variasi)', 'CUSTOM', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(39, 'OB-JASA-037', '1 Set Mur Leher 12x1.5 Panjang (20 pcs)', 'CUSTOM', 250000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(40, 'OB-JASA-038', '1 Set Mur Leher 12x1.5 Pendek (20 pcs)', 'SERVICE', 250000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(41, 'OB-JASA-039', 'Jasa Pasang B', 'SERVICE', 20000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(42, 'OB-JASA-040', 'Baut Chamber Kit 15-17mm', 'CUSTOM', 50000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(43, 'OB-JASA-041', 'Jasa Pasang Baut Chamber Kit', 'CUSTOM', 45000.00, 0.00, 'Harga per pcs', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(44, 'OB-JASA-042', 'Jasa Setting Ulang Baut Chamber Kit', 'CUSTOM', 35000.00, 0.00, 'Hanya setting, tidak pasang', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(45, 'OB-JASA-043', 'Rotasi Ban K', 'SERVICE', 10000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(46, 'OB-JASA-044', 'Rotasi Ban B', 'SERVICE', 15000.00, 0.00, NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('1Txj16chnxH9jrtJVIDJgNRSDRrNFrjUQOjpZAYJ', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.0 Chrome/152.0.7977.130 Safari/537.36 MSIX', 'eyJfdG9rZW4iOiJSWnc1bFFvajJZaUg4UXJscEEyWEtxU3BQN3ZPWklmcHN2MTRtT1BJIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2xvY2FsaG9zdDo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19', 1791192757),
('kufHDTphTlYtZV8gHSX14rewKSqNkWpjU1SG3MGA', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.16120.0 Chrome/152.0.7977.130 Safari/537.36 MSIX', 'eyJfdG9rZW4iOiJzYmQ4bVhhd1pWd2YwaDl3TVNhQUlsR3FlRkRpWnhPTGxGQkdObTdnIiwiX3ByZXZpb3VzIjp7InVybCI6Imh0dHA6XC9cL2xvY2FsaG9zdDo4MDAwIiwicm91dGUiOm51bGx9LCJfZmxhc2giOnsib2xkIjpbXSwibmV3IjpbXX19', 1791189188),
('Stl2GHqIIE2c0fcvQwuJugTsiC5mApAMbkVNbDTt', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/2.19675.0 Chrome/152.0.7977.130 Electron/44.4.3 Safari/537.36 MSIX', 'eyJfdG9rZW4iOiJxSFdDcWlJV2h6TkMwVDhuNHhCY0pHNVBkdXFVRVV3N2VKRjU2QjM0IiwiX2ZsYXNoIjp7Im9sZCI6W10sIm5ldyI6W119fQ==', 1791192757);

-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

CREATE TABLE `stock_movements` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `movement_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `balance_after` int NOT NULL,
  `reference_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `operator_name` varchar(80) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` int UNSIGNED NOT NULL DEFAULT '3',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `stock_movements`
--

INSERT INTO `stock_movements` (`id`, `product_id`, `movement_type`, `quantity`, `balance_after`, `reference_type`, `reference_id`, `description`, `operator_name`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, 1, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-GTR-15580-13-0001', 'Saldo awal stok: GT Radial Champiro Eco 155/80 R13', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(2, 2, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-BRI-16580-13-0002', 'Saldo awal stok: Bridgestone Techno 165/80 R13', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(3, 3, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-GTR-16580-13-0003', 'Saldo awal stok: GT Radial Champiro Eco 165/80 R13', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(4, 4, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-16580-13-0004', 'Saldo awal stok: Dunlop SP Touring R1 165/80 R13', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(5, 5, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-ACC-16580-13-0005', 'Saldo awal stok: Accelera Eco-Plush 165/80 R13', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(6, 6, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-GTR-16565-14-0006', 'Saldo awal stok: GT Radial Champiro Eco 165/65 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(7, 7, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-BRI-17565-14-0007', 'Saldo awal stok: Bridgestone Ecopia EP150 175/65 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(8, 8, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-GTR-17565-14-0008', 'Saldo awal stok: GT Radial Champiro Eco 175/65 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(9, 9, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-17565-14-0009', 'Saldo awal stok: Dunlop Enasave EC300+ 175/65 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(10, 10, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-ACC-17565-14-0010', 'Saldo awal stok: Accelera Eco-Plush 175/65 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(11, 11, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-BRI-18570-14-0011', 'Saldo awal stok: Bridgestone Techno 185/70 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(12, 12, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-GTR-18570-14-0012', 'Saldo awal stok: GT Radial Champiro Eco 185/70 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(13, 13, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-18570-14-0013', 'Saldo awal stok: Dunlop SP Touring R1 185/70 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(14, 14, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-ACC-18570-14-0014', 'Saldo awal stok: Accelera Eco-Plush 185/70 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(15, 15, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-BRI-18565-15-0015', 'Saldo awal stok: Bridgestone Ecopia EP150 185/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(16, 16, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-GTR-18565-15-0016', 'Saldo awal stok: GT Radial Champiro Eco 185/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(17, 17, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-DUN-18565-15-0017', 'Saldo awal stok: Dunlop Enasave EC300+ 185/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(18, 18, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-ACC-18565-15-0018', 'Saldo awal stok: Accelera Eco-Plush 185/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(19, 19, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-DUN-19560-15-0019', 'Saldo awal stok: Dunlop Enasave EC300+ 195/60 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(20, 20, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-BRI-19565-15-0020', 'Saldo awal stok: Bridgestone Ecopia EP150 195/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(21, 21, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-19565-15-0021', 'Saldo awal stok: Dunlop SP Sport LM705 195/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(22, 22, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-GTR-19565-15-0022', 'Saldo awal stok: GT Radial Champiro Eco 195/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(23, 23, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-20565-15-0023', 'Saldo awal stok: Dunlop SP Touring R1 205/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(24, 24, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-BRI-20565-15-0024', 'Saldo awal stok: Bridgestone Ecopia EP150 205/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(25, 25, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-GTR-20565-15-0025', 'Saldo awal stok: GT Radial Champiro Touring 205/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(26, 26, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-ACC-19550-16-0026', 'Saldo awal stok: Accelera Phi-R 195/50 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(27, 27, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-20555-16-0027', 'Saldo awal stok: Dunlop SP Sport LM705 205/55 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(28, 28, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-BRI-20555-16-0028', 'Saldo awal stok: Bridgestone Turanza T005A 205/55 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(29, 29, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-BRI-21560-16-0029', 'Saldo awal stok: Bridgestone Turanza T005A 215/60 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(30, 30, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-ACC-21545-17-0030', 'Saldo awal stok: Accelera Phi 215/45 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(31, 31, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-DUN-21555-17-0031', 'Saldo awal stok: Dunlop SP Sport LM705 215/55 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(32, 32, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-BRI-22550-17-0032', 'Saldo awal stok: Bridgestone Turanza T005A 225/50 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(33, 33, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-SWA-650-16-0033', 'Saldo awal stok: Swallow Jeep Service 6.50-16 6PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(34, 34, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-SWA-700-16-0034', 'Saldo awal stok: Swallow Jeep Service 7.00-16 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(35, 35, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-SWA-700-16-0035', 'Saldo awal stok: Swallow Jeep Service 7.00-16 14PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(36, 36, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-SWA-750-16-0036', 'Saldo awal stok: Swallow Jeep Service 7.50-16 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(37, 37, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-FOR-23575-15-0037', 'Saldo awal stok: Forceum M/T 08 235/75 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(38, 38, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-ACC-23575-15-0038', 'Saldo awal stok: Accelera M/T-01 235/75 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(39, 39, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DEL-23575-15-0039', 'Saldo awal stok: Delium Terra Warrior M/T 235/75 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(40, 40, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-GTR-23575-15-0040', 'Saldo awal stok: GT Radial Savero M/T Pro 235/75 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(41, 41, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-GTR-23575-15-0041', 'Saldo awal stok: GT Radial Savero SUV 235/75 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(42, 42, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-ACC-30-15-0042', 'Saldo awal stok: Accelera M/T-01 30x9.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(43, 43, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-FOR-31-15-0043', 'Saldo awal stok: Forceum M/T 08 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(44, 44, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-ACC-31-15-0044', 'Saldo awal stok: Accelera M/T-01 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(45, 45, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-GTR-31-15-0045', 'Saldo awal stok: GT Radial Adventuro M/T 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(46, 46, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-FED-31-15-0046', 'Saldo awal stok: Federal Couragia M/T 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(47, 47, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DEL-31-15-0047', 'Saldo awal stok: Delium Terra Raider M/T 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(48, 48, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-BRI-31-15-0048', 'Saldo awal stok: Bridgestone Dueler M/T D674 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(49, 49, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-MAX-31-15-0049', 'Saldo awal stok: Maxxis Bighorn MT-764 31x10.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(50, 50, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-ACC-33-15-0050', 'Saldo awal stok: Accelera M/T-01 33x12.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(51, 51, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-ACH-33-15-0051', 'Saldo awal stok: Achilles Desert Hawk X-MT 33x12.5 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(52, 52, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-ACC-23585-16-0052', 'Saldo awal stok: Accelera M/T-01 235/85 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(53, 53, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-GTR-23585-16-0053', 'Saldo awal stok: GT Radial Adventuro M/T 235/85 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(54, 54, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-BRI-24570-16-0054', 'Saldo awal stok: Bridgestone Dueler A/T 697 245/70 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(55, 55, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-DUN-24570-16-0055', 'Saldo awal stok: Dunlop Grandtrek AT3 245/70 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(56, 56, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-GTR-26570-16-0056', 'Saldo awal stok: GT Radial Savero A/T Pro 265/70 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(57, 57, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-26570-16-0057', 'Saldo awal stok: Dunlop Grandtrek AT3 265/70 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(58, 58, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-TOY-26570-16-0058', 'Saldo awal stok: Toyo Open Country A/T III 265/70 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(59, 59, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-FAL-26570-16-0059', 'Saldo awal stok: Falken Wildpeak A/T3W 265/70 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(60, 60, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-GTR-26565-17-0060', 'Saldo awal stok: GT Radial Savero A/T Pro 265/65 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(61, 61, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-DUN-26565-17-0061', 'Saldo awal stok: Dunlop Grandtrek AT3 265/65 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(62, 62, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-BRI-26565-17-0062', 'Saldo awal stok: Bridgestone Dueler A/T 693 III 265/65 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(63, 63, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-HAN-26565-17-0063', 'Saldo awal stok: Hankook Dynapro AT2 265/65 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(64, 64, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-YOK-26565-17-0064', 'Saldo awal stok: Yokohama Geolandar A/T G015 265/65 R17', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(65, 65, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-DUN-155-12-0065', 'Saldo awal stok: Dunlop SP LT5 155 R12 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(66, 66, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-FOR-185-14-0066', 'Saldo awal stok: Forceum Digon 185 R14 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(67, 67, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-DUN-185-14-0067', 'Saldo awal stok: Dunlop SP LT5 185 R14 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(68, 68, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-GTR-185-14-0068', 'Saldo awal stok: GT Radial Maxmiler Pro 185 R14 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(69, 69, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-BRI-185-14-0069', 'Saldo awal stok: Bridgestone Duravis R624 185 R14 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(70, 70, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-GTR-195-15-0070', 'Saldo awal stok: GT Radial Maxmiler Pro 195 R15C 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(71, 71, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-BRI-195-15-0071', 'Saldo awal stok: Bridgestone Duravis R624 195 R15C 8PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(72, 72, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-BRI-22575-16-0072', 'Saldo awal stok: Bridgestone Duravis R630 225/75 R16C ', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(73, 73, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-BRI-750-16-0073', 'Saldo awal stok: Bridgestone Bias 7.50-16 7.50-16 14PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(74, 74, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-GTR-750-16-0074', 'Saldo awal stok: Gajah Tunggal Super 88 7.50-16 14PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(75, 75, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-GTR-825-16-0075', 'Saldo awal stok: Gajah Tunggal Lug Pro 8.25-16 14PR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(76, 76, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-SWA-650-16-0076', 'Saldo awal stok: Swallow Ban Dalam 6.50-16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(77, 77, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-SWA-700-16-0077', 'Saldo awal stok: Swallow Ban Dalam 7.00-16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(78, 78, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-SWA-750-16-0078', 'Saldo awal stok: Swallow Ban Dalam 7.50-16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(79, 79, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-SWA-700-16-0079', 'Saldo awal stok: Swallow Flap 7.00-16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(80, 80, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-SWA-750-16-0080', 'Saldo awal stok: Swallow Flap 7.50-16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(81, 81, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-GTR-165-13-0081', 'Saldo awal stok: GT Ban Dalam 165 R13', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(82, 82, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-GTR-185-14-0082', 'Saldo awal stok: GT Ban Dalam 185 R14', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(83, 83, 'MASUK', 10, 10, 'INITIAL_STOCK', 'OB3-OPEN-GTR-195-15-0083', 'Saldo awal stok: GT Ban Dalam 195 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` bigint UNSIGNED NOT NULL,
  `supplier_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `supplier_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `contact_person` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_terms_days` int NOT NULL DEFAULT '30',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `supplier_code`, `supplier_name`, `phone`, `email`, `address`, `contact_person`, `payment_terms_days`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'SUP-001', 'PT Bridgestone Tire Indonesia', '024-7601234', 'sales.smg@bridgestone.co.id', 'Kawasan Industri Candi, Semarang', 'Budi Santoso', 30, 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(2, 'SUP-002', 'PT Elangperdana Tyre Industry (Accelera)', '021-8752345', 'orders@elangperdana.com', 'Citeureup, Bogor', 'Hendra Wijaya', 45, 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(3, 'OB-SUP-001', 'Sumber Harapan', '-', '-', '- Semarang', NULL, 30, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(4, 'OB-SUP-002', 'Masa Sempurna', '-', '-', '- Semarang', NULL, 30, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(5, 'OB-SUP-003', 'Grazia Ban', '-', '-', '- Jakarta', NULL, 30, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(6, 'OB-SUP-004', 'SH', '-', '-', '- Jakarta', NULL, 30, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(7, 'OB-SUP-005', 'Supplier Ban Indotama', '08123456789', 'info@banindotama.com', 'Jl. Industri Ban No. 99 Semarang', NULL, 30, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'KASIR',
  `phone` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `email`, `role`, `phone`, `is_active`, `email_verified_at`, `password`, `remember_token`, `created_at`, `updated_at`) VALUES
(1, 'Agus Subagyo', 'owner', 'owner@omahban.com', 'OWNER', '0822-2786-3969', 1, NULL, '$2y$12$CDCSVeCyfP5Z8SHJhv1KH.SRQaCSMbtazcjA8e8c1Fbi8vYBDurEK', NULL, '2026-10-05 08:32:49', '2026-11-24 16:39:05'),
(2, 'Kasir OB3', 'kasir', 'kasir@omahban.com', 'KASIR', '0812-3456-7893', 1, NULL, '$2y$12$CDCSVeCyfP5Z8SHJhv1KH.SRQaCSMbtazcjA8e8c1Fbi8vYBDurEK', NULL, '2026-10-05 08:32:50', '2026-11-24 16:39:05'),
(3, 'Admin Gudang OB3', 'gudang', 'gudang@omahban.com', 'GUDANG', '0812-3456-7892', 1, NULL, '$2y$12$CDCSVeCyfP5Z8SHJhv1KH.SRQaCSMbtazcjA8e8c1Fbi8vYBDurEK', NULL, '2026-10-05 08:32:51', '2026-11-24 16:39:05');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `accounting_period_closings`
--
ALTER TABLE `accounting_period_closings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `accounting_period_closings_closing_entry_id_foreign` (`closing_entry_id`),
  ADD KEY `accounting_period_closings_closed_by_foreign` (`closed_by`),
  ADD KEY `accounting_period_closings_reopened_by_foreign` (`reopened_by`),
  ADD KEY `accounting_period_closings_reopen_entry_id_foreign` (`reopen_entry_id`),
  ADD KEY `accounting_period_closings_period_index` (`period`);

--
-- Indexes for table `accounts`
--
ALTER TABLE `accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `accounts_account_code_unique` (`account_code`);

--
-- Indexes for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bank_reconciliations_period_unique` (`period`),
  ADD KEY `bank_reconciliations_updated_by_foreign` (`updated_by`);

--
-- Indexes for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `bank_statement_lines_journal_item_id_unique` (`journal_item_id`),
  ADD KEY `bank_statement_lines_created_by_foreign` (`created_by`),
  ADD KEY `bank_statement_lines_statement_date_index` (`statement_date`),
  ADD KEY `bank_statement_lines_parent_id_foreign` (`parent_id`);

--
-- Indexes for table `brands`
--
ALTER TABLE `brands`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `brands_name_unique` (`name`);

--
-- Indexes for table `brand_aliases`
--
ALTER TABLE `brand_aliases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `brand_aliases_alias_unique` (`alias`),
  ADD KEY `brand_aliases_brand_id_index` (`brand_id`);

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indexes for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cash_sessions_user_id_foreign` (`user_id`),
  ADD KEY `cash_sessions_closed_by_foreign` (`closed_by`),
  ADD KEY `cash_sessions_approved_by_foreign` (`approved_by`),
  ADD KEY `cash_sessions_journal_entry_id_foreign` (`journal_entry_id`),
  ADD KEY `cash_sessions_status_index` (`status`);

--
-- Indexes for table `edc_settings`
--
ALTER TABLE `edc_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `edc_settings_bank_name_payment_type_unique` (`bank_name`,`payment_type`),
  ADD KEY `edc_settings_bank_name_is_active_index` (`bank_name`,`is_active`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `expenses_reference_unique` (`reference`),
  ADD KEY `expenses_category_id_index` (`category_id`),
  ADD KEY `expenses_created_by_foreign` (`created_by`);

--
-- Indexes for table `expense_categories`
--
ALTER TABLE `expense_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `expense_categories_category_code_unique` (`category_code`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  ADD KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`);

--
-- Indexes for table `fixed_assets`
--
ALTER TABLE `fixed_assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fixed_assets_code_unique` (`code`),
  ADD KEY `fixed_assets_voided_by_foreign` (`voided_by`),
  ADD KEY `fixed_assets_created_by_foreign` (`created_by`);

--
-- Indexes for table `fixed_asset_depreciations`
--
ALTER TABLE `fixed_asset_depreciations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `fixed_asset_depreciations_fixed_asset_id_period_unique` (`fixed_asset_id`,`period`),
  ADD KEY `fixed_asset_depreciations_journal_entry_id_foreign` (`journal_entry_id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `journal_entries_entry_number_unique` (`entry_number`),
  ADD UNIQUE KEY `journal_entries_reversal_of_id_unique` (`reversal_of_id`),
  ADD KEY `journal_entries_entry_date_index` (`entry_date`),
  ADD KEY `journal_entries_reference_id_index` (`reference_id`),
  ADD KEY `journal_entries_created_by_foreign` (`created_by`);

--
-- Indexes for table `journal_items`
--
ALTER TABLE `journal_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `journal_items_journal_entry_id_index` (`journal_entry_id`),
  ADD KEY `journal_items_account_id_index` (`account_id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `payment_provider_settings`
--
ALTER TABLE `payment_provider_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payment_provider_settings_method_type_provider_name_unique` (`method_type`,`provider_name`),
  ADD KEY `payment_provider_settings_method_type_is_active_index` (`method_type`,`is_active`);

--
-- Indexes for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  ADD KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  ADD KEY `personal_access_tokens_expires_at_index` (`expires_at`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `products_product_code_unique` (`product_code`),
  ADD UNIQUE KEY `products_barcode_unique` (`barcode`),
  ADD KEY `products_brand_index` (`brand`),
  ADD KEY `products_branch_id_index` (`branch_id`),
  ADD KEY `products_brand_id_index` (`brand_id`);

--
-- Indexes for table `product_batches`
--
ALTER TABLE `product_batches`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_batches_batch_code_unique` (`batch_code`),
  ADD KEY `product_batches_product_id_index` (`product_id`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `product_categories_category_code_unique` (`category_code`);

--
-- Indexes for table `product_price_audits`
--
ALTER TABLE `product_price_audits`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_price_audits_product_id_index` (`product_id`),
  ADD KEY `product_price_audits_sale_id_index` (`sale_id`),
  ADD KEY `product_price_audits_actor_role_index` (`actor_role`),
  ADD KEY `product_price_audits_is_read_by_owner_index` (`is_read_by_owner`),
  ADD KEY `product_price_audits_is_reviewed_by_owner_index` (`is_reviewed_by_owner`),
  ADD KEY `product_price_audits_sale_detail_id_foreign` (`sale_detail_id`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `purchases_purchase_number_unique` (`purchase_number`),
  ADD KEY `purchases_supplier_id_index` (`supplier_id`);

--
-- Indexes for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_payments_purchase_id_foreign` (`purchase_id`);

--
-- Indexes for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `purchase_returns_reference_unique` (`reference`),
  ADD KEY `purchase_returns_purchase_id_foreign` (`purchase_id`),
  ADD KEY `purchase_returns_created_by_foreign` (`created_by`);

--
-- Indexes for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `purchase_return_items_purchase_return_id_foreign` (`purchase_return_id`),
  ADD KEY `purchase_return_items_product_batch_id_foreign` (`product_batch_id`);

--
-- Indexes for table `qris_transactions`
--
ALTER TABLE `qris_transactions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `qris_transactions_order_id_unique` (`order_id`),
  ADD UNIQUE KEY `qris_transactions_sale_payment_id_unique` (`sale_payment_id`);

--
-- Indexes for table `receivable_payments`
--
ALTER TABLE `receivable_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `receivable_payments_sale_id_foreign` (`sale_id`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_permissions_role_permission_key_unique` (`role`,`permission_key`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sales_reference_unique` (`reference`),
  ADD KEY `sales_date_index` (`date`),
  ADD KEY `sales_branch_id_index` (`branch_id`),
  ADD KEY `sales_user_id_foreign` (`user_id`);

--
-- Indexes for table `sales_bookings`
--
ALTER TABLE `sales_bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sales_bookings_booking_number_unique` (`booking_number`);

--
-- Indexes for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `sales_returns_reference_unique` (`reference`),
  ADD KEY `sales_returns_sale_id_foreign` (`sale_id`),
  ADD KEY `sales_returns_cash_session_id_foreign` (`cash_session_id`),
  ADD KEY `sales_returns_created_by_foreign` (`created_by`);

--
-- Indexes for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sales_return_items_sales_return_id_foreign` (`sales_return_id`),
  ADD KEY `sales_return_items_sale_detail_id_foreign` (`sale_detail_id`);

--
-- Indexes for table `sale_batch_allocations`
--
ALTER TABLE `sale_batch_allocations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_batch_allocations_sale_detail_id_index` (`sale_detail_id`),
  ADD KEY `sale_batch_allocations_product_batch_id_index` (`product_batch_id`);

--
-- Indexes for table `sale_details`
--
ALTER TABLE `sale_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_details_sale_id_index` (`sale_id`),
  ADD KEY `sale_details_product_id_index` (`product_id`);

--
-- Indexes for table `sale_payments`
--
ALTER TABLE `sale_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_payments_sale_id_foreign` (`sale_id`);

--
-- Indexes for table `service_categories`
--
ALTER TABLE `service_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `service_categories_code_unique` (`code`);

--
-- Indexes for table `service_masters`
--
ALTER TABLE `service_masters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `service_masters_service_code_unique` (`service_code`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `stock_movements_product_id_index` (`product_id`),
  ADD KEY `stock_movements_reference_id_index` (`reference_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `suppliers_supplier_code_unique` (`supplier_code`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD UNIQUE KEY `users_username_unique` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `accounting_period_closings`
--
ALTER TABLE `accounting_period_closings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `brand_aliases`
--
ALTER TABLE `brand_aliases`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `edc_settings`
--
ALTER TABLE `edc_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `expense_categories`
--
ALTER TABLE `expense_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fixed_assets`
--
ALTER TABLE `fixed_assets`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `fixed_asset_depreciations`
--
ALTER TABLE `fixed_asset_depreciations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `journal_items`
--
ALTER TABLE `journal_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `payment_provider_settings`
--
ALTER TABLE `payment_provider_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `personal_access_tokens`
--
ALTER TABLE `personal_access_tokens`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `product_batches`
--
ALTER TABLE `product_batches`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `product_categories`
--
ALTER TABLE `product_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `product_price_audits`
--
ALTER TABLE `product_price_audits`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `qris_transactions`
--
ALTER TABLE `qris_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `receivable_payments`
--
ALTER TABLE `receivable_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `role_permissions`
--
ALTER TABLE `role_permissions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=43;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_bookings`
--
ALTER TABLE `sales_bookings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_batch_allocations`
--
ALTER TABLE `sale_batch_allocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_details`
--
ALTER TABLE `sale_details`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_payments`
--
ALTER TABLE `sale_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `service_categories`
--
ALTER TABLE `service_categories`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `service_masters`
--
ALTER TABLE `service_masters`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=47;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=84;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `accounting_period_closings`
--
ALTER TABLE `accounting_period_closings`
  ADD CONSTRAINT `accounting_period_closings_closed_by_foreign` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `accounting_period_closings_closing_entry_id_foreign` FOREIGN KEY (`closing_entry_id`) REFERENCES `journal_entries` (`id`),
  ADD CONSTRAINT `accounting_period_closings_reopen_entry_id_foreign` FOREIGN KEY (`reopen_entry_id`) REFERENCES `journal_entries` (`id`),
  ADD CONSTRAINT `accounting_period_closings_reopened_by_foreign` FOREIGN KEY (`reopened_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  ADD CONSTRAINT `bank_reconciliations_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  ADD CONSTRAINT `bank_statement_lines_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bank_statement_lines_journal_item_id_foreign` FOREIGN KEY (`journal_item_id`) REFERENCES `journal_items` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bank_statement_lines_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `bank_statement_lines` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `brand_aliases`
--
ALTER TABLE `brand_aliases`
  ADD CONSTRAINT `brand_aliases_brand_id_foreign` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  ADD CONSTRAINT `cash_sessions_approved_by_foreign` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `cash_sessions_closed_by_foreign` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `cash_sessions_journal_entry_id_foreign` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`),
  ADD CONSTRAINT `cash_sessions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `fixed_assets`
--
ALTER TABLE `fixed_assets`
  ADD CONSTRAINT `fixed_assets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fixed_assets_voided_by_foreign` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `fixed_asset_depreciations`
--
ALTER TABLE `fixed_asset_depreciations`
  ADD CONSTRAINT `fixed_asset_depreciations_fixed_asset_id_foreign` FOREIGN KEY (`fixed_asset_id`) REFERENCES `fixed_assets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fixed_asset_depreciations_journal_entry_id_foreign` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`);

--
-- Constraints for table `journal_entries`
--
ALTER TABLE `journal_entries`
  ADD CONSTRAINT `journal_entries_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `journal_entries_reversal_of_id_foreign` FOREIGN KEY (`reversal_of_id`) REFERENCES `journal_entries` (`id`);

--
-- Constraints for table `journal_items`
--
ALTER TABLE `journal_items`
  ADD CONSTRAINT `journal_items_account_id_foreign` FOREIGN KEY (`account_id`) REFERENCES `accounts` (`id`),
  ADD CONSTRAINT `journal_items_journal_entry_id_foreign` FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_batches`
--
ALTER TABLE `product_batches`
  ADD CONSTRAINT `product_batches_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_price_audits`
--
ALTER TABLE `product_price_audits`
  ADD CONSTRAINT `product_price_audits_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `product_price_audits_sale_detail_id_foreign` FOREIGN KEY (`sale_detail_id`) REFERENCES `sale_details` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `product_price_audits_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  ADD CONSTRAINT `purchase_payments_purchase_id_foreign` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  ADD CONSTRAINT `purchase_returns_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `purchase_returns_purchase_id_foreign` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`);

--
-- Constraints for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  ADD CONSTRAINT `purchase_return_items_product_batch_id_foreign` FOREIGN KEY (`product_batch_id`) REFERENCES `product_batches` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `purchase_return_items_purchase_return_id_foreign` FOREIGN KEY (`purchase_return_id`) REFERENCES `purchase_returns` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `qris_transactions`
--
ALTER TABLE `qris_transactions`
  ADD CONSTRAINT `qris_transactions_sale_payment_id_foreign` FOREIGN KEY (`sale_payment_id`) REFERENCES `sale_payments` (`id`);

--
-- Constraints for table `receivable_payments`
--
ALTER TABLE `receivable_payments`
  ADD CONSTRAINT `receivable_payments_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sales_returns`
--
ALTER TABLE `sales_returns`
  ADD CONSTRAINT `sales_returns_cash_session_id_foreign` FOREIGN KEY (`cash_session_id`) REFERENCES `cash_sessions` (`id`),
  ADD CONSTRAINT `sales_returns_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `sales_returns_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`);

--
-- Constraints for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  ADD CONSTRAINT `sales_return_items_sale_detail_id_foreign` FOREIGN KEY (`sale_detail_id`) REFERENCES `sale_details` (`id`),
  ADD CONSTRAINT `sales_return_items_sales_return_id_foreign` FOREIGN KEY (`sales_return_id`) REFERENCES `sales_returns` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_batch_allocations`
--
ALTER TABLE `sale_batch_allocations`
  ADD CONSTRAINT `sale_batch_allocations_product_batch_id_foreign` FOREIGN KEY (`product_batch_id`) REFERENCES `product_batches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sale_batch_allocations_sale_detail_id_foreign` FOREIGN KEY (`sale_detail_id`) REFERENCES `sale_details` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_details`
--
ALTER TABLE `sale_details`
  ADD CONSTRAINT `sale_details_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_payments`
--
ALTER TABLE `sale_payments`
  ADD CONSTRAINT `sale_payments_sale_id_foreign` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `stock_movements_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
