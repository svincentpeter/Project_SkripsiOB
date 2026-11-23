-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 23, 2026 at 05:20 AM
-- Server version: 8.0.30
-- PHP Version: 8.3.31

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

--
-- Dumping data for table `accounting_period_closings`
--

INSERT INTO `accounting_period_closings` (`id`, `period`, `end_date`, `closing_entry_id`, `net_income`, `notes`, `closed_by`, `closed_at`, `reopened_at`, `reopened_by`, `reopen_reason`, `reopen_entry_id`, `created_at`, `updated_at`) VALUES
(1, '2026-09', '2026-09-30', NULL, '0.00', NULL, 1, '2026-10-05 09:55:46', '2026-10-05 09:56:04', 1, 'Uji batal', NULL, '2026-10-05 09:55:46', '2026-10-05 09:56:04'),
(2, '2026-10', '2026-10-31', 31, '-1877342.33', 'Tutup buku bulan Oktober 2026 (periode perdana cabang 3)', 1, '2026-11-01 01:00:00', NULL, NULL, NULL, NULL, '2026-11-01 01:00:00', '2026-11-01 01:00:00');

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

--
-- Dumping data for table `bank_reconciliations`
--

INSERT INTO `bank_reconciliations` (`id`, `period`, `statement_ending_balance`, `updated_by`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, '2026-10', '24993500.00', 1, 3, '2026-10-05 09:06:37', '2026-10-05 09:06:37'),
(2, '2026-11', '25575900.00', 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:32:00');

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

--
-- Dumping data for table `bank_statement_lines`
--

INSERT INTO `bank_statement_lines` (`id`, `statement_date`, `description`, `amount`, `source`, `is_split`, `parent_id`, `journal_item_id`, `created_by`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, '2026-10-05', 'Biaya admin bulanan', '-6500.00', 'MANUAL', 0, NULL, 35, 1, 3, '2026-10-05 09:08:06', '2026-10-05 09:08:15'),
(2, '2026-11-02', 'KR OTOMATIS SETORAN MODAL KERJA', '25000000.00', 'MANUAL', 0, NULL, 84, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(3, '2026-11-05', 'TRSF DR/KE TIRE CHANGER CORGHI', '-24000000.00', 'MANUAL', 0, NULL, 87, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(4, '2026-11-10', 'BIAYA RESTOCK PT BRIDGESTONE', '-6040000.00', 'MANUAL', 0, NULL, 89, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(5, '2026-11-18', 'BIAYA TERMIN 1 PT ACCELERA', '-1500000.00', 'MANUAL', 0, NULL, 95, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:32:00'),
(6, '2026-11-20', 'TRSF PRIVE PEMILIK NOV 2026', '-1500000.00', 'MANUAL', 0, NULL, 101, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:32:00'),
(7, '2026-11-21', 'BIAYA LISTRIK PLN & INDIHOME', '-1350000.00', 'MANUAL', 0, NULL, 113, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(8, '2026-11-22', 'KR OTOMATIS TRF-BCA-221101 CV ARMADA', '3750000.00', 'MANUAL', 0, NULL, 118, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(9, '2026-11-22', 'SETOR TUNAI ATM CRM KASIR', '4500000.00', 'MANUAL', 0, NULL, 134, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(10, '2026-11-23', 'BIAYA ADM BULANAN REKENING BCA', '-15000.00', 'MANUAL', 0, NULL, 162, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(11, '2026-11-23', 'BUNGA / JASA GIRO REKENING BCA', '42500.00', 'MANUAL', 0, NULL, 163, 1, 3, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(12, '2026-11-22', 'SETTLEMENT QRIS GOPAY 21 NOV', '1694900.00', 'MANUAL', 0, NULL, 107, 1, 3, '2026-11-23 04:32:00', '2026-11-23 04:32:00');

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
(31, 'Michelin', 0, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL);

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
(27, 'laufenn', 29, '2026-10-05 08:32:43', '2026-10-05 08:32:43');

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
('laravel-cache-594a46b938fde5d0fa4197b6098f5666', 'i:3;', 1795407498),
('laravel-cache-594a46b938fde5d0fa4197b6098f5666:timer', 'i:1795407498;', 1795407498),
('laravel-cache-90567f2efb985e17a5dc75cb73faf110', 'i:1;', 1791190059),
('laravel-cache-90567f2efb985e17a5dc75cb73faf110:timer', 'i:1791190059;', 1791190059),
('laravel-cache-f99bd202ac5e4f108c58159ca9e625f9', 'i:1;', 1791191539),
('laravel-cache-f99bd202ac5e4f108c58159ca9e625f9:timer', 'i:1791191539;', 1791191539);

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

--
-- Dumping data for table `cash_sessions`
--

INSERT INTO `cash_sessions` (`id`, `user_id`, `opened_at`, `opening_float`, `book_opening`, `opening_note`, `from_entry_id`, `to_entry_id`, `closed_at`, `closed_by`, `expected_cash`, `counted_cash`, `variance`, `variance_reason`, `status`, `approved_by`, `approved_at`, `journal_entry_id`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, 2, '2026-10-05 08:39:51', '2000000.00', '2000000.00', NULL, 2, 4, '2026-10-05 08:42:51', 2, '2775000.00', '2765000.00', '-10000.00', 'Uji: kurang 10 ribu, salah kembalian', 'CLOSED', 1, '2026-10-05 08:44:57', 5, 3, '2026-10-05 08:39:51', '2026-10-05 08:44:57'),
(2, 2, '2026-11-21 01:00:00', '3615000.00', '3615000.00', 'Buka shift pagi 21 Nov 2026', 41, 46, '2026-11-21 10:30:00', 2, '5255000.00', '5255000.00', '0.00', NULL, 'CLOSED', 1, '2026-11-23 04:39:39', NULL, 3, '2026-11-21 01:00:00', '2026-11-23 04:39:39'),
(3, 2, '2026-11-22 01:00:00', '5255000.00', '5255000.00', 'Buka shift pagi 22 Nov 2026', 46, 50, '2026-11-22 10:30:00', 2, '6170000.00', '6165000.00', '-5000.00', 'Selisih uang pecahan kembalian receh Rp 5.000', 'CLOSED', 1, '2026-11-22 10:30:00', 51, 3, '2026-11-22 01:00:00', '2026-11-22 10:30:00'),
(4, 2, '2026-11-23 01:00:00', '1665000.00', '1665000.00', 'Shift pagi hari ini 23 Nov 2026 (siap transaksi)', 52, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'OPEN', NULL, NULL, NULL, 3, '2026-11-23 01:00:00', '2026-11-23 01:00:00');

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
(1, 'BCA', 'Debit', '0.15', 0, 1, 'Fee debit toko 0.15%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(2, 'BCA', 'Credit', '2.00', 1, 1, 'Surcharge kredit pelanggan 2.0%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(3, 'Mandiri', 'Debit', '0.15', 0, 1, 'Fee debit toko 0.15%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(4, 'Mandiri', 'Credit', '1.80', 1, 1, 'Surcharge kredit pelanggan 1.8%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(5, 'BRI', 'Debit', '0.15', 0, 1, 'Fee debit toko 0.15%', '2026-10-05 08:32:43', '2026-10-05 08:32:43'),
(6, 'BRI', 'Credit', '2.00', 1, 1, 'Surcharge kredit pelanggan 2.0%', '2026-10-05 08:32:43', '2026-10-05 08:32:43');

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

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`id`, `reference`, `expense_date`, `category_id`, `amount`, `payment_method`, `bank_name`, `recipient_name`, `description`, `attachment_path`, `approved_by`, `status`, `void_reason`, `voided_by`, `voided_at`, `branch_id`, `created_by`, `created_at`, `updated_at`) VALUES
(1, 'BKK-202610-0001', '2026-10-05', 5, '150000.00', 'TUNAI', NULL, 'Toko Perkakas Teknik', 'Beli timah balancing tempel & pentil tubeless', NULL, 'Agus Subagyo', 'ACTIVE', NULL, NULL, NULL, 3, 1, '2026-10-05 09:51:27', '2026-10-05 09:51:27'),
(2, 'BKK-202611-0001', '2026-11-21', 2, '1350000.00', 'TRANSFER_BCA', 'BCA', 'PT PLN (Persero) & Telkom Indihome', 'Tagihan listrik workshop 3 phase & internet kasir November 2026', NULL, 'Agus Subagyo', 'ACTIVE', NULL, NULL, NULL, 3, 1, '2026-11-21 09:00:00', '2026-11-21 09:00:00'),
(3, 'BKK-202611-0002', '2026-11-21', 5, '125000.00', 'TUNAI', NULL, 'Toko Kertas Merapi', 'Kertas thermal (dobel input, dibatalkan)', NULL, 'Agus Subagyo', 'VOID', 'Input ganda nota kasir, transaksi valid dicatat di shift berikutnya', 'Agus Subagyo', '2026-11-21 09:00:00', 3, 1, '2026-11-21 09:00:00', '2026-11-21 09:00:00'),
(4, 'BKK-202611-0003', '2026-11-22', 7, '185000.00', 'TUNAI', NULL, 'Warung Makan Bu Tini & Mekanik', 'Makan siang lembur tim mekanik spooring akhir pekan', NULL, 'Agus Subagyo', 'ACTIVE', NULL, NULL, NULL, 3, 1, '2026-11-22 09:15:00', '2026-11-22 09:15:00'),
(5, 'BKK-202611-0004', '2026-11-23', 5, '95000.00', 'TUNAI', NULL, 'Toko Alat Tulis Magelang', 'Pembelian 10 roll kertas thermal struk POS & spidol ban', NULL, 'Agus Subagyo', 'ACTIVE', NULL, NULL, NULL, 3, 1, '2026-11-23 04:25:00', '2026-11-23 04:25:00');

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

--
-- Dumping data for table `fixed_assets`
--

INSERT INTO `fixed_assets` (`id`, `code`, `name`, `category`, `acquisition_date`, `acquisition_cost`, `residual_value`, `useful_life_months`, `depreciation_start`, `opening_accumulated_depreciation`, `funding`, `journal_entry_number`, `status`, `notes`, `void_reason`, `voided_by`, `voided_at`, `created_by`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, 'AT-202610-0001', 'Kompresor angin Uji', 'PERALATAN_BENGKEL', '2026-10-05', '4800000.00', '0.00', 48, '2026-10', '0.00', 'TRANSFER', 'JRN-202610-0009', 'VOID', NULL, 'Uji', 1, '2026-10-05 09:04:56', 1, 3, '2026-10-05 09:04:31', '2026-10-05 09:04:56'),
(2, 'AT-202610-0002', 'Mesin Spooring 3D Hunter Hawkeye Elite', 'PERALATAN_BENGKEL', '2026-10-05', '85000000.00', '5000000.00', 96, '2026-10', '0.00', 'MODAL', 'JRN-202610-0026', 'ACTIVE', 'Peralatan spooring 3D utama workshop Omah Ban Cabang 3', NULL, NULL, NULL, 1, 3, '2026-10-31 13:00:00', '2026-10-31 13:00:00'),
(3, 'AT-202611-0001', 'Mesin Tire Changer Corghi + Nitrogen Generator', 'PERALATAN_BENGKEL', '2026-11-05', '24000000.00', '2400000.00', 60, '2026-11', '0.00', 'TRANSFER', 'JRN-202611-0004', 'ACTIVE', 'Pembelian unit baru via transfer BCA untuk layanan bongkar pasang & isi nitrogen', NULL, NULL, NULL, 1, 3, '2026-11-05 03:30:00', '2026-11-05 03:30:00');

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

--
-- Dumping data for table `fixed_asset_depreciations`
--

INSERT INTO `fixed_asset_depreciations` (`id`, `fixed_asset_id`, `period`, `amount`, `journal_entry_id`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-10', '100000.00', 10, '2026-10-05 09:04:45', '2026-10-05 09:04:45'),
(2, 2, '2026-10', '833333.33', 30, '2026-10-31 13:00:00', '2026-10-31 13:00:00');

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
(1, 'JRN-202610-0001', '2026-10-05', 'OPENING_BALANCE', 'OPENING-INV-20261005153256', 'Saldo awal persediaan ban (penyesuaian nilai FIFO ke buku besar)', '1086778313.00', '1086778313.00', 'POSTED', 3, NULL, NULL, '2026-10-05 08:32:56', '2026-10-05 08:32:56'),
(2, 'JRN-202610-0002', '2026-10-05', 'ACCOUNT_OPENING', 'SALDO-AWAL', 'Saldo awal akun kas, bank, aset tetap & laba ditahan', '27000000.00', '27000000.00', 'POSTED', 3, 1, NULL, '2026-10-05 08:36:14', '2026-10-05 08:36:14'),
(3, 'JRN-202610-0003', '2026-10-05', 'POS_SALE', 'OB3-INV-202610-0001', 'Penjualan POS Kasir Nota OB3-INV-202610-0001 (Pelanggan Walk-In)', '2925698.00', '2925698.00', 'POSTED', 3, 2, NULL, '2026-10-05 08:41:10', '2026-10-05 08:41:10'),
(4, 'JRN-202610-0004', '2026-10-05', 'SALES_RETURN', 'RTJ-202610-0001', 'Retur penjualan RTJ-202610-0001 atas nota OB3-INV-202610-0001: Uji retur: ukuran tidak cocok', '1462849.00', '1462849.00', 'POSTED', 3, 2, NULL, '2026-10-05 08:42:05', '2026-10-05 08:42:05'),
(5, 'JRN-202610-0005', '2026-10-05', 'CASH_SESSION_VARIANCE', 'SHIFT-1', 'Selisih kas shift kasir #1 (Kasir OB3)', '10000.00', '10000.00', 'POSTED', 3, 1, NULL, '2026-10-05 08:44:57', '2026-10-05 08:44:57'),
(6, 'JRN-202610-0006', '2026-10-05', 'PURCHASE', 'GR-202610-0001', 'Penerimaan barang GR-202610-0001 dari Grazia Ban', '3996000.00', '3996000.00', 'POSTED', 3, 3, NULL, '2026-10-05 08:53:20', '2026-10-05 08:53:20'),
(7, 'JRN-202610-0007', '2026-10-05', 'PURCHASE_RETURN', 'RTB-202610-0001', 'Retur pembelian RTB-202610-0001 atas GR-202610-0001: Uji: ban cacat produksi', '999000.00', '999000.00', 'POSTED', 3, 3, NULL, '2026-10-05 08:55:12', '2026-10-05 08:55:12'),
(8, 'JRN-202610-0008', '2026-10-05', 'STOCK_OPNAME', 'OPN-202610-0001', 'Selisih stock opname OPN-202610-0001: Stock Opname Fisik Bulanan Cabang 3 (OPNAME-OB3-202610-0001)', '214660.00', '214660.00', 'POSTED', 3, 3, NULL, '2026-10-05 08:56:55', '2026-10-05 08:56:55'),
(9, 'JRN-202610-0009', '2026-10-05', 'FIXED_ASSET_ACQUISITION', 'AT-202610-0001', 'Perolehan aset tetap AT-202610-0001: Kompresor angin Uji', '4800000.00', '4800000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:04:31', '2026-10-05 09:04:31'),
(10, 'JRN-202610-0010', '2026-10-31', 'DEPRECIATION', 'SUSUT-2026-10', 'Penyusutan aset tetap garis lurus 2026-10', '100000.00', '100000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:04:45', '2026-10-05 09:04:45'),
(11, 'JRN-202610-0011', '2026-10-31', 'FIXED_ASSET_VOID', 'AT-202610-0001', 'Pembalikan penyusutan 2026-10 aset tetap AT-202610-0001 Kompresor angin Uji: Uji', '100000.00', '100000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:04:56', '2026-10-05 09:04:56'),
(12, 'JRN-202610-0012', '2026-10-05', 'FIXED_ASSET_VOID', 'AT-202610-0001', 'Pembatalan aset tetap AT-202610-0001: Uji', '4800000.00', '4800000.00', 'POSTED', 3, 1, 9, '2026-10-05 09:04:56', '2026-10-05 09:04:56'),
(13, 'JRN-202610-0013', '2026-10-31', 'ADJUSTING_ENTRY', 'AJP-202610-0001', 'AJP 2026-10: Uji: tagihan listrik Oktober belum datang', '750000.00', '750000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:05:38', '2026-10-05 09:05:38'),
(14, 'JRN-202611-0001', '2026-11-01', 'ADJUSTING_REVERSAL', 'AJP-202610-0001', 'Pembalik otomatis AJP-202610-0001: Uji: tagihan listrik Oktober belum datang', '750000.00', '750000.00', 'POSTED', 3, 1, 13, '2026-10-05 09:05:38', '2026-10-05 09:05:38'),
(15, 'JRN-202610-0014', '2026-10-05', 'BANK_RECON_ADJUSTMENT', 'REKON-1', 'Biaya administrasi bank dari rekening koran 2026-10-05: Biaya admin bulanan', '6500.00', '6500.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:08:15', '2026-10-05 09:08:15'),
(16, 'JRN-202610-0015', '2026-10-05', 'CASH_DEPOSIT', 'KAS-202610-0001', 'Uji setor omzet', '2000000.00', '2000000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:08:49', '2026-10-05 09:08:49'),
(17, 'JRN-202610-0016', '2026-10-05', 'OWNER_DRAWING', 'KAS-202610-0002', 'Uji prive melebihi laci', '1000000.00', '1000000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:09:05', '2026-10-05 09:09:05'),
(18, 'JRN-202610-0017', '2026-10-05', 'MANUAL_ADJUSTMENT', 'MEMO-202610-0001', 'Uji: koreksi prive KAS-202610-0002 salah input', '1000000.00', '1000000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:10:26', '2026-10-05 09:10:26'),
(19, 'JRN-202610-0018', '2026-10-05', 'CAPITAL_INJECTION', 'KAS-202610-0003', 'Uji tambahan modal', '10000000.00', '10000000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:10:41', '2026-10-05 09:10:41'),
(20, 'JRN-202610-0019', '2026-10-05', 'POS_SALE', 'OB3-INV-202610-0002', 'Penjualan POS Kasir Nota OB3-INV-202610-0002 (Pelanggan Walk-In)', '1612840.00', '1612840.00', 'POSTED', 3, 2, NULL, '2026-10-05 09:13:04', '2026-10-05 09:13:04'),
(21, 'JRN-202610-0020', '2026-10-05', 'POS_SALE_VOID', 'OB3-INV-202610-0002', 'Jurnal pembalik void nota OB3-INV-202610-0002: Uji: pelanggan batal, QRIS dikembalikan', '1612840.00', '1612840.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:14:27', '2026-10-05 09:14:27'),
(23, 'JRN-202610-0021', '2026-10-05', 'EXPENSE', 'BKK-202610-0001', 'Pengeluaran BKK-202610-0001: Beli timah balancing tempel & pentil tubeless', '150000.00', '150000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:51:27', '2026-10-05 09:51:27'),
(25, 'JRN-202610-0022', '2026-10-05', 'DEBT_PAYMENT', 'GR-202610-0001', 'Pelunasan hutang supplier Grazia Ban (Pelunasan hutang pembelian ban Grazia Ban)', '2997000.00', '2997000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:52:27', '2026-10-05 09:52:27'),
(26, 'JRN-202610-0023', '2026-10-05', 'PURCHASE', 'GR-202610-0002', 'Penerimaan barang GR-202610-0002 dari Grazia Ban', '1998000.00', '1998000.00', 'POSTED', 3, 1, NULL, '2026-10-05 09:54:41', '2026-10-05 09:54:41'),
(27, 'JRN-202610-0024', '2026-10-05', 'GOODS_RECEIPT_CANCEL', 'RTB-202610-0002', 'Pembatalan penerimaan GR-202610-0002: Uji: salah input penerimaan', '1998000.00', '1998000.00', 'POSTED', 3, 1, 26, '2026-10-05 09:55:10', '2026-10-05 09:55:10'),
(28, 'JRN-202610-0025', '2026-10-05', 'OPENING_BALANCE', 'OPENING-INV-HPP-FIX', 'Penyesuaian nilai HPP batch awal persediaan ban dari daftar harga owner', '13388000.00', '13388000.00', 'POSTED', 3, 1, NULL, '2026-11-23 04:38:23', '2026-11-23 04:38:23'),
(29, 'JRN-202610-0026', '2026-10-05', 'FIXED_ASSET_ACQUISITION', 'AT-202610-0002', 'Setoran modal aset tetap AT-202610-0002: Mesin Spooring 3D Hunter Hawkeye Elite', '85000000.00', '85000000.00', 'POSTED', 3, 1, NULL, '2026-10-31 13:00:00', '2026-10-31 13:00:00'),
(30, 'JRN-202610-0027', '2026-10-31', 'DEPRECIATION', 'SUSUT-2026-10', 'Penyusutan aset tetap garis lurus 2026-10', '833333.33', '833333.33', 'POSTED', 3, 1, NULL, '2026-10-31 13:00:00', '2026-10-31 13:00:00'),
(31, 'JRN-202610-0028', '2026-10-31', 'PERIOD_CLOSING', 'TUTUP-2026-10', 'Jurnal penutup periode 2026-10', '3427342.33', '3427342.33', 'POSTED', 3, 1, NULL, '2026-11-01 01:00:00', '2026-11-01 01:00:00'),
(32, 'JRN-202611-0002', '2026-11-02', 'CAPITAL_INJECTION', 'KAS-202611-0001', 'Tambahan kas kerja laci kasir awal November 2026', '3000000.00', '3000000.00', 'POSTED', 3, 1, NULL, '2026-11-02 02:00:00', '2026-11-02 02:00:00'),
(33, 'JRN-202611-0003', '2026-11-02', 'CAPITAL_INJECTION', 'KAS-202611-0002', 'Setoran modal kerja rekening operasional BCA November 2026', '25000000.00', '25000000.00', 'POSTED', 3, 1, NULL, '2026-11-02 02:00:00', '2026-11-02 02:00:00'),
(34, 'JRN-202611-0004', '2026-11-05', 'FIXED_ASSET_ACQUISITION', 'AT-202611-0001', 'Perolehan aset tetap AT-202611-0001: Mesin Tire Changer Corghi + Nitrogen Generator', '24000000.00', '24000000.00', 'POSTED', 3, 1, NULL, '2026-11-05 03:30:00', '2026-11-05 03:30:00'),
(35, 'JRN-202611-0005', '2026-11-10', 'PURCHASE', 'GR-202611-0001', 'Penerimaan barang GR-202611-0001 dari PT Bridgestone Tire Indonesia', '6040000.00', '6040000.00', 'POSTED', 3, 3, NULL, '2026-11-10 04:00:00', '2026-11-10 04:00:00'),
(36, 'JRN-202611-0006', '2026-11-14', 'PURCHASE', 'GR-202611-0002', 'Penerimaan barang GR-202611-0002 dari PT Elangperdana Tyre Industry (Accelera)', '3600000.00', '3600000.00', 'POSTED', 3, 3, NULL, '2026-11-14 06:15:00', '2026-11-14 06:15:00'),
(37, 'JRN-202611-0007', '2026-11-16', 'PURCHASE_RETURN', 'RTB-202611-0001', 'Retur pembelian RTB-202611-0001 atas GR-202611-0002: Cacat dinding samping (sidewall bulge) saat QC penerimaan', '600000.00', '600000.00', 'POSTED', 3, 3, NULL, '2026-11-16 03:00:00', '2026-11-16 03:00:00'),
(38, 'JRN-202611-0008', '2026-11-18', 'DEBT_PAYMENT', 'GR-202611-0002', 'Pelunasan hutang supplier PT Elangperdana Tyre Industry (Accelera) (Pembayaran termin 1 hutang INV-ACC-20261114-08 via BCA)', '1500000.00', '1500000.00', 'POSTED', 3, 1, NULL, '2026-11-18 07:20:00', '2026-11-18 07:20:00'),
(39, 'JRN-202611-0009', '2026-11-20', 'PURCHASE', 'GR-202611-0003', 'Penerimaan barang GR-202611-0003 dari Masa Sempurna', '2280000.00', '2280000.00', 'POSTED', 3, 3, NULL, '2026-11-20 08:00:00', '2026-11-20 08:00:00'),
(40, 'JRN-202611-0010', '2026-11-19', 'STOCK_OPNAME', 'OPN-202611-0001', 'Selisih stock opname OPN-202611-0001: Temuan 1 unit fisik tambahan di rak belakang saat stock opname November', '509220.00', '509220.00', 'POSTED', 3, 3, NULL, '2026-11-19 09:00:00', '2026-11-19 09:00:00'),
(41, 'JRN-202611-0011', '2026-11-20', 'OWNER_DRAWING', 'KAS-202611-0003', 'Pengambilan pribadi pemilik (Prive) bulan November 2026 via BCA', '1500000.00', '1500000.00', 'POSTED', 3, 1, NULL, '2026-11-20 10:00:00', '2026-11-20 10:00:00'),
(42, 'JRN-202611-0012', '2026-11-21', 'POS_SALE', 'OB3-INV-202611-0001', 'Penjualan POS Kasir Nota OB3-INV-202611-0001 (Budi Santoso)', '3224600.00', '3224600.00', 'POSTED', 3, 2, NULL, '2026-11-21 03:15:00', '2026-11-21 03:15:00'),
(43, 'JRN-202611-0013', '2026-11-21', 'POS_SALE', 'OB3-INV-202611-0002', 'Penjualan POS Kasir Nota OB3-INV-202611-0002 (Hendro Wijaya)', '3145000.00', '3145000.00', 'POSTED', 3, 2, NULL, '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(44, 'JRN-202611-0014', '2026-11-21', 'EXPENSE', 'BKK-202611-0001', 'Pengeluaran BKK-202611-0001: Tagihan listrik workshop 3 phase & internet kasir November 2026', '1350000.00', '1350000.00', 'POSTED', 3, 1, NULL, '2026-11-21 09:00:00', '2026-11-21 09:00:00'),
(45, 'JRN-202611-0015', '2026-11-21', 'EXPENSE', 'BKK-202611-0002', 'Pengeluaran BKK-202611-0002: Kertas thermal (dobel input, dibatalkan)', '125000.00', '125000.00', 'POSTED', 3, 1, NULL, '2026-11-21 09:00:00', '2026-11-21 09:00:00'),
(46, 'JRN-202611-0016', '2026-11-21', 'VOID_EXPENSE', 'VOID-BKK-202611-0002', 'Pembatalan BKK-202611-0002: Input ganda nota kasir, transaksi valid dicatat di shift berikutnya', '125000.00', '125000.00', 'POSTED', 3, 1, 45, '2026-11-21 09:00:00', '2026-11-21 09:00:00'),
(47, 'JRN-202611-0017', '2026-11-22', 'POS_SALE', 'OB3-INV-202611-0003', 'Penjualan POS Kasir Nota OB3-INV-202611-0003 (CV Armada Jaya Magelang)', '7087300.00', '7087300.00', 'POSTED', 3, 2, NULL, '2026-11-22 03:30:00', '2026-11-22 03:30:00'),
(48, 'JRN-202611-0018', '2026-11-22', 'POS_SALE', 'OB3-INV-202611-0004', 'Penjualan POS Kasir Nota OB3-INV-202611-0004 (Rina Kusuma)', '4070000.00', '4070000.00', 'POSTED', 3, 2, NULL, '2026-11-22 06:10:00', '2026-11-22 06:10:00'),
(49, 'JRN-202611-0019', '2026-11-22', 'SALES_RETURN', 'RTJ-202611-0001', 'Retur penjualan RTJ-202611-0001 atas nota OB3-INV-202611-0004: Pelanggan batal pasang ban cadangan, 1 unit diretur dalam kondisi baru', '2035000.00', '2035000.00', 'POSTED', 3, 2, NULL, '2026-11-22 08:00:00', '2026-11-22 08:00:00'),
(50, 'JRN-202611-0020', '2026-11-22', 'EXPENSE', 'BKK-202611-0003', 'Pengeluaran BKK-202611-0003: Makan siang lembur tim mekanik spooring akhir pekan', '185000.00', '185000.00', 'POSTED', 3, 1, NULL, '2026-11-22 09:15:00', '2026-11-22 09:15:00'),
(51, 'JRN-202611-0021', '2026-11-22', 'CASH_SESSION_VARIANCE', 'SHIFT-3', 'Selisih kas shift kasir #3 (Kasir OB3)', '5000.00', '5000.00', 'POSTED', 3, 1, NULL, '2026-11-22 10:30:00', '2026-11-22 10:30:00'),
(52, 'JRN-202611-0022', '2026-11-22', 'CASH_DEPOSIT', 'KAS-202611-0004', 'Setoran tunai hasil penjualan ke rekening BCA via ATM CRM', '4500000.00', '4500000.00', 'POSTED', 3, 1, NULL, '2026-11-22 11:00:00', '2026-11-22 11:00:00'),
(53, 'JRN-202611-0023', '2026-11-23', 'POS_SALE', 'OB3-INV-202611-0005', 'Penjualan POS Kasir Nota OB3-INV-202611-0005 (Andi Prasetyo)', '3140000.00', '3140000.00', 'POSTED', 3, 2, NULL, '2026-11-23 02:15:00', '2026-11-23 02:15:00'),
(54, 'JRN-202611-0024', '2026-11-23', 'POS_SALE', 'OB3-INV-202611-0006', 'Penjualan POS Kasir Nota OB3-INV-202611-0006 (Dewi Lestari)', '2540000.00', '2540000.00', 'POSTED', 3, 2, NULL, '2026-11-23 03:05:00', '2026-11-23 03:05:00'),
(55, 'JRN-202611-0025', '2026-11-23', 'POS_SALE', 'OB3-INV-202611-0007', 'Penjualan POS Kasir Nota OB3-INV-202611-0007 (Wahyu Nugroho)', '2035000.00', '2035000.00', 'POSTED', 3, 2, NULL, '2026-11-23 03:35:00', '2026-11-23 03:35:00'),
(56, 'JRN-202611-0026', '2026-11-23', 'POS_SALE', 'OB3-INV-202611-0008', 'Penjualan POS Kasir Nota OB3-INV-202611-0008 (Salah Input Pelanggan)', '971500.00', '971500.00', 'POSTED', 3, 2, NULL, '2026-11-23 03:55:00', '2026-11-23 03:55:00'),
(57, 'JRN-202611-0027', '2026-11-23', 'POS_SALE_VOID', 'OB3-INV-202611-0008', 'Jurnal pembalik void nota OB3-INV-202611-0008: Salah pilih ukuran ban pada nota, diganti transaksi baru', '971500.00', '971500.00', 'POSTED', 3, 1, 56, '2026-11-23 04:02:00', '2026-11-23 04:02:00'),
(58, 'JRN-202611-0028', '2026-11-23', 'EXPENSE', 'BKK-202611-0004', 'Pengeluaran BKK-202611-0004: Pembelian 10 roll kertas thermal struk POS & spidol ban', '95000.00', '95000.00', 'POSTED', 3, 1, NULL, '2026-11-23 04:25:00', '2026-11-23 04:25:00'),
(59, 'JRN-202611-0029', '2026-11-23', 'BANK_RECON_ADJUSTMENT', 'REKON-10', 'Biaya administrasi bank dari rekening koran 2026-11-23: BIAYA ADM BULANAN REKENING BCA', '15000.00', '15000.00', 'POSTED', 3, 1, NULL, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(60, 'JRN-202611-0030', '2026-11-23', 'BANK_RECON_ADJUSTMENT', 'REKON-11', 'Bunga bank dari rekening koran 2026-11-23: BUNGA / JASA GIRO REKENING BCA', '42500.00', '42500.00', 'POSTED', 3, 1, NULL, '2026-11-23 04:30:00', '2026-11-23 04:30:00'),
(61, 'JRN-202611-0031', '2026-11-23', 'POS_SALE', 'OB3-INV-202611-0009', 'Penjualan POS Kasir Nota OB3-INV-202611-0009 (Surya Darmawan)', '255000.00', '255000.00', 'POSTED', 3, 2, NULL, '2026-11-23 04:15:00', '2026-11-23 04:15:00'),
(62, 'JRN-202611-0032', '2026-11-23', 'POS_SALE', 'OB3-INV-202611-0010', 'Penjualan POS Kasir Nota OB3-INV-202611-0010 (Bagus Setiawan)', '2726600.00', '2726600.00', 'POSTED', 3, 2, NULL, '2026-11-23 04:45:00', '2026-11-23 04:45:00');

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
(1, 1, 16, '1086778313.00', '0.00', 'Penambahan nilai persediaan (OPENING-INV-20261005153256)', '2026-10-05 08:32:56', NULL),
(2, 1, 20, '0.00', '1086778313.00', 'Saldo awal persediaan ban (penyesuaian nilai FIFO ke buku besar)', '2026-10-05 08:32:56', NULL),
(3, 2, 14, '2000000.00', '0.00', 'Saldo awal', '2026-10-05 08:36:14', NULL),
(4, 2, 15, '25000000.00', '0.00', 'Saldo awal', '2026-10-05 08:36:14', NULL),
(5, 2, 20, '0.00', '27000000.00', 'Modal awal pemilik (penyeimbang saldo awal)', '2026-10-05 08:36:14', NULL),
(6, 3, 14, '1550000.00', '0.00', 'Penerimaan TUNAI Nota OB3-INV-202610-0001', '2026-10-05 08:41:10', NULL),
(7, 3, 22, '0.00', '1550000.00', 'Pendapatan ban & barang Nota OB3-INV-202610-0001', '2026-10-05 08:41:10', NULL),
(8, 3, 25, '1375698.00', '0.00', 'HPP FIFO Nota OB3-INV-202610-0001', '2026-10-05 08:41:10', NULL),
(9, 3, 16, '0.00', '1375698.00', 'Pengurangan persediaan Nota OB3-INV-202610-0001', '2026-10-05 08:41:10', NULL),
(10, 4, 8, '775000.00', '0.00', 'Retur penjualan nota OB3-INV-202610-0001', '2026-10-05 08:42:05', NULL),
(11, 4, 14, '0.00', '775000.00', 'Refund tunai dari laci (RTJ-202610-0001)', '2026-10-05 08:42:05', NULL),
(12, 4, 16, '687849.00', '0.00', 'Barang retur kembali ke batch FIFO (RTJ-202610-0001)', '2026-10-05 08:42:05', NULL),
(13, 4, 25, '0.00', '687849.00', 'Pembalikan HPP retur (RTJ-202610-0001)', '2026-10-05 08:42:05', NULL),
(14, 5, 7, '10000.00', '0.00', 'Kas kurang: Uji: kurang 10 ribu, salah kembalian', '2026-10-05 08:44:57', NULL),
(15, 5, 14, '0.00', '10000.00', 'Kas kurang shift #1', '2026-10-05 08:44:57', NULL),
(16, 6, 16, '3996000.00', '0.00', 'Pembelian 4 pcs Acc 651 (BATCH-ACC-22540-18-0242-20261005-94)', '2026-10-05 08:53:20', NULL),
(17, 6, 19, '0.00', '3996000.00', 'Hutang dagang Grazia Ban', '2026-10-05 08:53:20', NULL),
(18, 7, 19, '999000.00', '0.00', 'Pengurangan hutang Grazia Ban (GR-202610-0001)', '2026-10-05 08:55:12', NULL),
(19, 7, 16, '0.00', '999000.00', 'Barang diretur ke supplier (RTB-202610-0001)', '2026-10-05 08:55:12', NULL),
(20, 8, 3, '214660.00', '0.00', 'Selisih stock opname OPN-202610-0001: Stock Opname Fisik Bulanan Cabang 3 (OPNAME-OB3-202610-0001)', '2026-10-05 08:56:55', NULL),
(21, 8, 16, '0.00', '214660.00', 'Pengurangan nilai persediaan (OPN-202610-0001)', '2026-10-05 08:56:55', NULL),
(22, 9, 17, '4800000.00', '0.00', 'Perolehan AT-202610-0001 Kompresor angin Uji', '2026-10-05 09:04:31', NULL),
(23, 9, 15, '0.00', '4800000.00', 'Pembayaran aset AT-202610-0001', '2026-10-05 09:04:31', NULL),
(24, 10, 12, '100000.00', '0.00', 'Penyusutan AT-202610-0001 Kompresor angin Uji', '2026-10-05 09:04:45', NULL),
(25, 10, 18, '0.00', '100000.00', 'Akumulasi penyusutan 2026-10', '2026-10-05 09:04:45', NULL),
(26, 11, 18, '100000.00', '0.00', '[BATAL] Akumulasi penyusutan AT-202610-0001 2026-10', '2026-10-05 09:04:56', NULL),
(27, 11, 12, '0.00', '100000.00', '[BATAL] Penyusutan AT-202610-0001 2026-10', '2026-10-05 09:04:56', NULL),
(28, 12, 17, '0.00', '4800000.00', '[BATAL] Perolehan AT-202610-0001 Kompresor angin Uji', '2026-10-05 09:04:56', NULL),
(29, 12, 15, '4800000.00', '0.00', '[BATAL] Pembayaran aset AT-202610-0001', '2026-10-05 09:04:56', NULL),
(30, 13, 27, '750000.00', '0.00', 'Uji: tagihan listrik Oktober belum datang', '2026-10-05 09:05:38', NULL),
(31, 13, 10, '0.00', '750000.00', 'Beban yang masih harus dibayar', '2026-10-05 09:05:38', NULL),
(32, 14, 27, '0.00', '750000.00', '[PEMBALIK AJP] Uji: tagihan listrik Oktober belum datang', '2026-10-05 09:05:38', NULL),
(33, 14, 10, '750000.00', '0.00', '[PEMBALIK AJP] Beban yang masih harus dibayar', '2026-10-05 09:05:38', NULL),
(34, 15, 13, '6500.00', '0.00', 'Biaya administrasi bank', '2026-10-05 09:08:15', NULL),
(35, 15, 15, '0.00', '6500.00', 'Biaya admin bulanan', '2026-10-05 09:08:15', NULL),
(36, 16, 15, '2000000.00', '0.00', 'Setoran dari kas laci', '2026-10-05 09:08:49', NULL),
(37, 16, 14, '0.00', '2000000.00', 'Kas laci disetor ke bank', '2026-10-05 09:08:49', NULL),
(38, 17, 6, '1000000.00', '0.00', 'Prive pemilik', '2026-10-05 09:09:05', NULL),
(39, 17, 14, '0.00', '1000000.00', 'Diambil pemilik', '2026-10-05 09:09:05', NULL),
(40, 18, 14, '1000000.00', '0.00', 'Uji: koreksi prive KAS-202610-0002 salah input', '2026-10-05 09:10:26', NULL),
(41, 18, 6, '0.00', '1000000.00', 'Uji: koreksi prive KAS-202610-0002 salah input', '2026-10-05 09:10:26', NULL),
(42, 19, 15, '10000000.00', '0.00', 'Setoran modal pemilik', '2026-10-05 09:10:41', NULL),
(43, 19, 20, '0.00', '10000000.00', 'Tambahan modal disetor', '2026-10-05 09:10:41', NULL),
(44, 20, 15, '847450.00', '0.00', 'Penerimaan QRIS Nota OB3-INV-202610-0002', '2026-10-05 09:13:04', NULL),
(45, 20, 4, '2550.00', '0.00', 'Beban MDR QRIS Nota OB3-INV-202610-0002', '2026-10-05 09:13:04', NULL),
(46, 20, 22, '0.00', '850000.00', 'Pendapatan ban & barang Nota OB3-INV-202610-0002', '2026-10-05 09:13:04', NULL),
(47, 20, 25, '762840.00', '0.00', 'HPP FIFO Nota OB3-INV-202610-0002', '2026-10-05 09:13:04', NULL),
(48, 20, 16, '0.00', '762840.00', 'Pengurangan persediaan Nota OB3-INV-202610-0002', '2026-10-05 09:13:04', NULL),
(49, 21, 15, '0.00', '847450.00', '[VOID] Penerimaan QRIS Nota OB3-INV-202610-0002', '2026-10-05 09:14:27', NULL),
(50, 21, 4, '0.00', '2550.00', '[VOID] Beban MDR QRIS Nota OB3-INV-202610-0002', '2026-10-05 09:14:27', NULL),
(51, 21, 22, '850000.00', '0.00', '[VOID] Pendapatan ban & barang Nota OB3-INV-202610-0002', '2026-10-05 09:14:27', NULL),
(52, 21, 25, '0.00', '762840.00', '[VOID] HPP FIFO Nota OB3-INV-202610-0002', '2026-10-05 09:14:27', NULL),
(53, 21, 16, '762840.00', '0.00', '[VOID] Pengurangan persediaan Nota OB3-INV-202610-0002', '2026-10-05 09:14:27', NULL),
(56, 23, 30, '150000.00', '0.00', 'Beban ATK & Keperluan Bengkel (BKK-202610-0001)', '2026-10-05 09:51:27', NULL),
(57, 23, 14, '0.00', '150000.00', 'Dibayar kepada Toko Perkakas Teknik', '2026-10-05 09:51:27', NULL),
(60, 25, 19, '2997000.00', '0.00', 'Pelunasan hutang Grazia Ban (GR-202610-0001)', '2026-10-05 09:52:27', NULL),
(61, 25, 15, '0.00', '2997000.00', 'Pembayaran hutang GR-202610-0001', '2026-10-05 09:52:27', NULL),
(62, 26, 16, '1998000.00', '0.00', 'Pembelian 2 pcs Acc 651 (BATCH-ACC-22540-18-0242-20261005-99)', '2026-10-05 09:54:41', NULL),
(63, 26, 15, '0.00', '1998000.00', 'Pembayaran TRANSFER_BCA ke Grazia Ban', '2026-10-05 09:54:41', NULL),
(64, 27, 16, '0.00', '1998000.00', '[BATAL] Pembelian 2 pcs Acc 651 (BATCH-ACC-22540-18-0242-20261005-99)', '2026-10-05 09:55:10', NULL),
(65, 27, 15, '1998000.00', '0.00', '[BATAL] Pembayaran TRANSFER_BCA ke Grazia Ban', '2026-10-05 09:55:10', NULL),
(66, 28, 16, '13388000.00', '0.00', 'Koreksi HPP 8 batch persediaan awal (1-2000)', '2026-11-23 04:38:23', NULL),
(67, 28, 20, '0.00', '13388000.00', 'Penyeimbang modal awal persediaan (3-1000)', '2026-11-23 04:38:23', NULL),
(68, 29, 17, '85000000.00', '0.00', 'Perolehan AT-202610-0002 Mesin Spooring 3D Hunter Hawkeye Elite', '2026-10-31 13:00:00', NULL),
(69, 29, 20, '0.00', '85000000.00', 'Setoran aset AT-202610-0002 oleh pemilik', '2026-10-31 13:00:00', NULL),
(70, 30, 12, '833333.33', '0.00', 'Penyusutan AT-202610-0002 Mesin Spooring 3D Hunter Hawkeye Elite', '2026-10-31 13:00:00', NULL),
(71, 30, 18, '0.00', '833333.33', 'Akumulasi penyusutan 2026-10', '2026-10-31 13:00:00', NULL),
(72, 31, 22, '1550000.00', '0.00', 'Tutup Pendapatan Penjualan Ban Baru', '2026-11-01 01:00:00', NULL),
(73, 31, 8, '0.00', '775000.00', 'Tutup Retur Penjualan', '2026-11-01 01:00:00', NULL),
(74, 31, 25, '0.00', '687849.00', 'Tutup Harga Pokok Penjualan (HPP) Ban Baru', '2026-11-01 01:00:00', NULL),
(75, 31, 3, '0.00', '214660.00', 'Tutup Selisih Persediaan (Opname)', '2026-11-01 01:00:00', NULL),
(76, 31, 27, '0.00', '750000.00', 'Tutup Beban Listrik, Air & Internet', '2026-11-01 01:00:00', NULL),
(77, 31, 30, '0.00', '150000.00', 'Tutup Beban Perlengkapan & ATK Toko', '2026-11-01 01:00:00', NULL),
(78, 31, 7, '0.00', '10000.00', 'Tutup Selisih Kas Kasir (Lebih/Kurang)', '2026-11-01 01:00:00', NULL),
(79, 31, 12, '0.00', '833333.33', 'Tutup Beban Penyusutan Aset Tetap', '2026-11-01 01:00:00', NULL),
(80, 31, 13, '0.00', '6500.00', 'Tutup Beban Administrasi Bank', '2026-11-01 01:00:00', NULL),
(81, 31, 21, '1877342.33', '0.00', 'Rugi bersih s/d 2026-10-31 ke Laba Ditahan', '2026-11-01 01:00:00', NULL),
(82, 32, 14, '3000000.00', '0.00', 'Setoran modal pemilik', '2026-11-02 02:00:00', NULL),
(83, 32, 20, '0.00', '3000000.00', 'Tambahan modal disetor', '2026-11-02 02:00:00', NULL),
(84, 33, 15, '25000000.00', '0.00', 'Setoran modal pemilik', '2026-11-02 02:00:00', NULL),
(85, 33, 20, '0.00', '25000000.00', 'Tambahan modal disetor', '2026-11-02 02:00:00', NULL),
(86, 34, 17, '24000000.00', '0.00', 'Perolehan AT-202611-0001 Mesin Tire Changer Corghi + Nitrogen Generator', '2026-11-05 03:30:00', NULL),
(87, 34, 15, '0.00', '24000000.00', 'Pembayaran aset AT-202611-0001', '2026-11-05 03:30:00', NULL),
(88, 35, 16, '6040000.00', '0.00', 'Pembelian 8 pcs Bridgestone Ecopia EP150 185/65 R15 (BATCH-BAN-BS-185-65-R15-20261110-50)', '2026-11-10 04:00:00', NULL),
(89, 35, 15, '0.00', '6040000.00', 'Pembayaran TRANSFER_BCA ke PT Bridgestone Tire Indonesia', '2026-11-10 04:00:00', NULL),
(90, 36, 16, '3600000.00', '0.00', 'Pembelian 6 pcs Accelera Phi-R 195/50 R16 (BATCH-BAN-ACC-195-50-R16-20261114-45)', '2026-11-14 06:15:00', NULL),
(91, 36, 19, '0.00', '3600000.00', 'Hutang dagang PT Elangperdana Tyre Industry (Accelera)', '2026-11-14 06:15:00', NULL),
(92, 37, 19, '600000.00', '0.00', 'Pengurangan hutang PT Elangperdana Tyre Industry (Accelera) (GR-202611-0002)', '2026-11-16 03:00:00', NULL),
(93, 37, 16, '0.00', '600000.00', 'Barang diretur ke supplier (RTB-202611-0001)', '2026-11-16 03:00:00', NULL),
(94, 38, 19, '1500000.00', '0.00', 'Pelunasan hutang PT Elangperdana Tyre Industry (Accelera) (GR-202611-0002)', '2026-11-18 07:20:00', NULL),
(95, 38, 15, '0.00', '1500000.00', 'Pembayaran hutang GR-202611-0002', '2026-11-18 07:20:00', NULL),
(96, 39, 16, '2280000.00', '0.00', 'Pembelian 6 pcs Laufen (BATCH-LAU-17565-14-0339-20261120-24)', '2026-11-20 08:00:00', NULL),
(97, 39, 19, '0.00', '2280000.00', 'Hutang dagang Masa Sempurna', '2026-11-20 08:00:00', NULL),
(98, 40, 16, '509220.00', '0.00', 'Penambahan nilai persediaan (OPN-202611-0001)', '2026-11-19 09:00:00', NULL),
(99, 40, 3, '0.00', '509220.00', 'Selisih stock opname OPN-202611-0001: Temuan 1 unit fisik tambahan di rak belakang saat stock opname November', '2026-11-19 09:00:00', NULL),
(100, 41, 6, '1500000.00', '0.00', 'Prive pemilik', '2026-11-20 10:00:00', NULL),
(101, 41, 15, '0.00', '1500000.00', 'Diambil pemilik', '2026-11-20 10:00:00', NULL),
(102, 42, 14, '1640000.00', '0.00', 'Penerimaan TUNAI Nota OB3-INV-202611-0001', '2026-11-21 03:15:00', NULL),
(103, 42, 24, '50000.00', '0.00', 'Diskon penjualan Nota OB3-INV-202611-0001', '2026-11-21 03:15:00', NULL),
(104, 42, 22, '0.00', '1690000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0001', '2026-11-21 03:15:00', NULL),
(105, 42, 25, '1534600.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0001', '2026-11-21 03:15:00', NULL),
(106, 42, 16, '0.00', '1534600.00', 'Pengurangan persediaan Nota OB3-INV-202611-0001', '2026-11-21 03:15:00', NULL),
(107, 43, 15, '1694900.00', '0.00', 'Penerimaan QRIS Nota OB3-INV-202611-0002', '2026-11-21 07:45:00', NULL),
(108, 43, 4, '5100.00', '0.00', 'Beban MDR QRIS Nota OB3-INV-202611-0002', '2026-11-21 07:45:00', NULL),
(109, 43, 22, '0.00', '1700000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0002', '2026-11-21 07:45:00', NULL),
(110, 43, 25, '1445000.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0002', '2026-11-21 07:45:00', NULL),
(111, 43, 16, '0.00', '1445000.00', 'Pengurangan persediaan Nota OB3-INV-202611-0002', '2026-11-21 07:45:00', NULL),
(112, 44, 27, '1350000.00', '0.00', 'Beban Listrik & Air (PLN/PDAM) (BKK-202611-0001)', '2026-11-21 09:00:00', NULL),
(113, 44, 15, '0.00', '1350000.00', 'Dibayar kepada PT PLN (Persero) & Telkom Indihome', '2026-11-21 09:00:00', NULL),
(114, 45, 30, '125000.00', '0.00', 'Beban ATK & Keperluan Bengkel (BKK-202611-0002)', '2026-11-21 09:00:00', NULL),
(115, 45, 14, '0.00', '125000.00', 'Dibayar kepada Toko Kertas Merapi', '2026-11-21 09:00:00', NULL),
(116, 46, 30, '0.00', '125000.00', '[VOID] Beban ATK & Keperluan Bengkel (BKK-202611-0002)', '2026-11-21 09:00:00', NULL),
(117, 46, 14, '125000.00', '0.00', '[VOID] Dibayar kepada Toko Kertas Merapi', '2026-11-21 09:00:00', NULL),
(118, 47, 15, '3750000.00', '0.00', 'Penerimaan TRANSFER Nota OB3-INV-202611-0003', '2026-11-22 03:30:00', NULL),
(119, 47, 22, '0.00', '3750000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0003', '2026-11-22 03:30:00', NULL),
(120, 47, 25, '3337300.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0003', '2026-11-22 03:30:00', NULL),
(121, 47, 16, '0.00', '3337300.00', 'Pengurangan persediaan Nota OB3-INV-202611-0003', '2026-11-22 03:30:00', NULL),
(122, 48, 14, '2200000.00', '0.00', 'Penerimaan TUNAI Nota OB3-INV-202611-0004', '2026-11-22 06:10:00', NULL),
(123, 48, 22, '0.00', '2200000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0004', '2026-11-22 06:10:00', NULL),
(124, 48, 25, '1870000.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0004', '2026-11-22 06:10:00', NULL),
(125, 48, 16, '0.00', '1870000.00', 'Pengurangan persediaan Nota OB3-INV-202611-0004', '2026-11-22 06:10:00', NULL),
(126, 49, 8, '1100000.00', '0.00', 'Retur penjualan nota OB3-INV-202611-0004', '2026-11-22 08:00:00', NULL),
(127, 49, 14, '0.00', '1100000.00', 'Refund tunai dari laci (RTJ-202611-0001)', '2026-11-22 08:00:00', NULL),
(128, 49, 16, '935000.00', '0.00', 'Barang retur kembali ke batch FIFO (RTJ-202611-0001)', '2026-11-22 08:00:00', NULL),
(129, 49, 25, '0.00', '935000.00', 'Pembalikan HPP retur (RTJ-202611-0001)', '2026-11-22 08:00:00', NULL),
(130, 50, 32, '185000.00', '0.00', 'Beban Konsumsi & Lembur Karyawan (BKK-202611-0003)', '2026-11-22 09:15:00', NULL),
(131, 50, 14, '0.00', '185000.00', 'Dibayar kepada Warung Makan Bu Tini & Mekanik', '2026-11-22 09:15:00', NULL),
(132, 51, 7, '5000.00', '0.00', 'Kas kurang: Selisih uang pecahan kembalian receh Rp 5.000', '2026-11-22 10:30:00', NULL),
(133, 51, 14, '0.00', '5000.00', 'Kas kurang shift #3', '2026-11-22 10:30:00', NULL),
(134, 52, 15, '4500000.00', '0.00', 'Setoran dari kas laci', '2026-11-22 11:00:00', NULL),
(135, 52, 14, '0.00', '4500000.00', 'Kas laci disetor ke bank', '2026-11-22 11:00:00', NULL),
(136, 53, 14, '1700000.00', '0.00', 'Penerimaan TUNAI Nota OB3-INV-202611-0005', '2026-11-23 02:15:00', NULL),
(137, 53, 22, '0.00', '1700000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0005', '2026-11-23 02:15:00', NULL),
(138, 53, 25, '1440000.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0005', '2026-11-23 02:15:00', NULL),
(139, 53, 16, '0.00', '1440000.00', 'Pengurangan persediaan Nota OB3-INV-202611-0005', '2026-11-23 02:15:00', NULL),
(140, 54, 14, '500000.00', '0.00', 'Penerimaan TUNAI Nota OB3-INV-202611-0006', '2026-11-23 03:05:00', NULL),
(141, 54, 15, '850000.00', '0.00', 'Penerimaan TRANSFER Nota OB3-INV-202611-0006', '2026-11-23 03:05:00', NULL),
(142, 54, 24, '30000.00', '0.00', 'Diskon penjualan Nota OB3-INV-202611-0006', '2026-11-23 03:05:00', NULL),
(143, 54, 22, '0.00', '1380000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0006', '2026-11-23 03:05:00', NULL),
(144, 54, 25, '1160000.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0006', '2026-11-23 03:05:00', NULL),
(145, 54, 16, '0.00', '1160000.00', 'Pengurangan persediaan Nota OB3-INV-202611-0006', '2026-11-23 03:05:00', NULL),
(146, 55, 15, '1096700.00', '0.00', 'Penerimaan QRIS Nota OB3-INV-202611-0007', '2026-11-23 03:35:00', NULL),
(147, 55, 4, '3300.00', '0.00', 'Beban MDR QRIS Nota OB3-INV-202611-0007', '2026-11-23 03:35:00', NULL),
(148, 55, 22, '0.00', '1100000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0007', '2026-11-23 03:35:00', NULL),
(149, 55, 25, '935000.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0007', '2026-11-23 03:35:00', NULL),
(150, 55, 16, '0.00', '935000.00', 'Pengurangan persediaan Nota OB3-INV-202611-0007', '2026-11-23 03:35:00', NULL),
(151, 56, 14, '525000.00', '0.00', 'Penerimaan TUNAI Nota OB3-INV-202611-0008', '2026-11-23 03:55:00', NULL),
(152, 56, 22, '0.00', '525000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0008', '2026-11-23 03:55:00', NULL),
(153, 56, 25, '446500.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0008', '2026-11-23 03:55:00', NULL),
(154, 56, 16, '0.00', '446500.00', 'Pengurangan persediaan Nota OB3-INV-202611-0008', '2026-11-23 03:55:00', NULL),
(155, 57, 14, '0.00', '525000.00', '[VOID] Penerimaan TUNAI Nota OB3-INV-202611-0008', '2026-11-23 04:02:00', NULL),
(156, 57, 22, '525000.00', '0.00', '[VOID] Pendapatan ban & barang Nota OB3-INV-202611-0008', '2026-11-23 04:02:00', NULL),
(157, 57, 25, '0.00', '446500.00', '[VOID] HPP FIFO Nota OB3-INV-202611-0008', '2026-11-23 04:02:00', NULL),
(158, 57, 16, '446500.00', '0.00', '[VOID] Pengurangan persediaan Nota OB3-INV-202611-0008', '2026-11-23 04:02:00', NULL),
(159, 58, 30, '95000.00', '0.00', 'Beban ATK & Keperluan Bengkel (BKK-202611-0004)', '2026-11-23 04:25:00', NULL),
(160, 58, 14, '0.00', '95000.00', 'Dibayar kepada Toko Alat Tulis Magelang', '2026-11-23 04:25:00', NULL),
(161, 59, 13, '15000.00', '0.00', 'Biaya administrasi bank', '2026-11-23 04:30:00', NULL),
(162, 59, 15, '0.00', '15000.00', 'BIAYA ADM BULANAN REKENING BCA', '2026-11-23 04:30:00', NULL),
(163, 60, 15, '42500.00', '0.00', 'BUNGA / JASA GIRO REKENING BCA', '2026-11-23 04:30:00', NULL),
(164, 60, 11, '0.00', '42500.00', 'Bunga/jasa giro bank', '2026-11-23 04:30:00', NULL),
(165, 61, 15, '253215.00', '0.00', 'Penerimaan QRIS Nota OB3-INV-202611-0009', '2026-11-23 04:15:00', NULL),
(166, 61, 4, '1785.00', '0.00', 'Beban MDR QRIS Nota OB3-INV-202611-0009', '2026-11-23 04:15:00', NULL),
(167, 61, 23, '0.00', '255000.00', 'Pendapatan jasa Nota OB3-INV-202611-0009', '2026-11-23 04:15:00', NULL),
(168, 62, 15, '1550000.00', '0.00', 'Penerimaan TRANSFER Nota OB3-INV-202611-0010', '2026-11-23 04:45:00', NULL),
(169, 62, 22, '0.00', '1300000.00', 'Pendapatan ban & barang Nota OB3-INV-202611-0010', '2026-11-23 04:45:00', NULL),
(170, 62, 23, '0.00', '250000.00', 'Pendapatan jasa Nota OB3-INV-202611-0010', '2026-11-23 04:45:00', NULL),
(171, 62, 25, '1176600.00', '0.00', 'HPP FIFO Nota OB3-INV-202611-0010', '2026-11-23 04:45:00', NULL),
(172, 62, 16, '0.00', '1176600.00', 'Pengurangan persediaan Nota OB3-INV-202611-0010', '2026-11-23 04:45:00', NULL);

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
(1, 'bank', 'BCA', 'BCA', '0.00', '0.00', 1, 1, 'Rekening Utama Operasional', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(2, 'bank', 'Mandiri', 'MDR', '0.00', '0.00', 1, 2, 'Rekening Penerimaan', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(3, 'bank', 'BNI', 'BNI', '0.00', '0.00', 1, 3, 'Rekening Penerimaan', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(4, 'bank', 'BRI', 'BRI', '0.00', '0.00', 1, 4, 'Rekening Penerimaan', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(5, 'qris', 'BCA', 'BCA', '0.30', '500000.00', 1, 1, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(6, 'qris', 'Mandiri', 'MDR', '0.30', '500000.00', 1, 2, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(7, 'qris', 'GoPay', 'GOPAY', '0.30', '500000.00', 1, 3, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(8, 'qris', 'OVO', 'OVO', '0.30', '500000.00', 1, 4, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(9, 'qris', 'DANA', 'DANA', '0.30', '500000.00', 1, 5, 'MDR 0.3% toko jika > 500rb', '2026-10-05 08:32:42', '2026-10-05 08:32:42'),
(10, 'qris', 'QRIS BCA (Statis)', 'QRIS_BCA', '0.70', '0.00', 1, 1, 'MDR Standard QRIS 0.7%', '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(11, 'bank', 'Bank BCA (Transfer Direct)', 'TF_BCA', '0.00', '0.00', 1, 2, 'Transfer manual ke BCA Cabang 3', '2026-10-05 08:32:51', '2026-10-05 08:32:51');

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
(10, 'App\\Models\\User', 1, 'pos-session', 'd12a03a0c7ac66bcf913df3d9bd04de5012a733c8542bdd9ac384bd4fdd92fe0', '[\"*\"]', '2026-11-23 05:04:22', '2026-11-23 16:17:18', '2026-11-23 04:17:18', '2026-11-23 05:04:22');

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
(1, 'Bridgestone Ecopia EP150 185/65 R15', 'BAN-BS-185-65-R15', '888001856515', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '755000.00', '850000.00', NULL, 30, 0, 5, 1, 0, 3, '2026-10-05 08:32:51', '2026-11-23 02:15:00', NULL),
(2, 'Accelera Phi-R 195/50 R16', 'BAN-ACC-195-50-R16', '888001955016', 'Accelera', 9, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '600000.00', '690000.00', NULL, 21, 0, 4, 1, 0, 3, '2026-10-05 08:32:51', '2026-11-23 03:05:00', NULL),
(3, 'Bs Duravis', 'BRI-165-13-0001', 'BRI-165-13-0001', 'Bridgestone', 2, 1, 165, 80, '13', '165 R13', '-', 'BARU', '2026', '725000.00', '810000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(4, 'Bs Techno', 'BRI-16580-13-0002', 'BRI-16580-13-0002', 'Bridgestone', 2, 1, 165, 80, '13', '165/80 R13', '-', 'BARU', '2024', '537550.00', '545000.00', '590000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(5, 'Bs Duravis', 'BRI-175-13-0003', 'BRI-175-13-0003', 'Bridgestone', 2, 1, 175, 80, '13', '175 R13', '-', 'BARU', '2026', '760000.00', '835000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(6, 'Bs Ecopia', 'BRI-17565-14-0004', 'BRI-17565-14-0004', 'Bridgestone', 2, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '635100.00', '685000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(7, 'Bs Techno', 'BRI-17565-14-0005', 'BRI-17565-14-0005', 'Bridgestone', 2, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '539550.00', '625000.00', NULL, 4, 10, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-11-22 03:30:00', NULL),
(8, 'Bs Duravis', 'BRI-185-14-0007', 'BRI-185-14-0007', 'Bridgestone', 2, 1, 185, 80, '14', '185 R14', '-', 'BARU', '2026', '850000.00', '960000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(9, 'Bs Ecopia', 'BRI-18565-14-0008', 'BRI-18565-14-0008', 'Bridgestone', 2, 1, 185, 65, '14', '185/65 R14', '-', 'BARU', '2020', '652400.00', '675000.00', '790000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(10, 'Bs Ecopia', 'BRI-18570-14-0010', 'BRI-18570-14-0010', 'Bridgestone', 2, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '657850.00', '710000.00', NULL, 13, 13, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(11, 'Bs Techno', 'BRI-18570-14-0011', 'BRI-18570-14-0011', 'Bridgestone', 2, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '588300.00', '650000.00', NULL, 4, 6, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-11-23 04:45:00', NULL),
(12, 'Bs Ecopia', 'BRI-18580-14-0012', 'BRI-18580-14-0012', 'Bridgestone', 2, 1, 185, 80, '14', '185/80 R14', '-', 'BARU', '2022', '600000.00', '695000.00', '795000.00', 3, 3, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(13, 'Bs Techno', 'BRI-18580-14-0013', 'BRI-18580-14-0013', 'Bridgestone', 2, 1, 185, 80, '14', '185/80 R14', '-', 'BARU', '2026', '681200.00', '780000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(14, 'Bs Duravis', 'BRI-195-14-0014', 'BRI-195-14-0014', 'Bridgestone', 2, 1, 195, 80, '14', '195 R14', '-', 'BARU', '2026', '1008800.00', '1115000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(15, 'Bs Ecopia', 'BRI-19570-14-0015', 'BRI-19570-14-0015', 'Bridgestone', 2, 1, 195, 70, '14', '195/70 R14', '-', 'BARU', '2026', '787150.00', '850000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(16, 'Bs Ecopia', 'BRI-17560-15-0016', 'BRI-17560-15-0016', 'Bridgestone', 2, 1, 175, 60, '15', '175/60 R15', '-', 'BARU', '2026', '595000.00', '700000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-11-23 04:38:23', NULL),
(17, 'Bs Turanza T005A', 'BRI-18555-15-0017', 'BRI-18555-15-0017', 'Bridgestone', 2, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2026', '586800.00', '800000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(18, 'Bs Potenza RE030', 'BRI-18555-15-0018', 'BRI-18555-15-0018', 'Bridgestone', 2, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2021', '635000.00', '1000000.00', '1525000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(19, 'Bs Techno', 'BRI-18555-15-0019', 'BRI-18555-15-0019', 'Bridgestone', 2, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2026', '729950.00', '810000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(20, 'Bs Ecopia', 'BRI-18560-15-0020', 'BRI-18560-15-0020', 'Bridgestone', 2, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2026', '882250.00', '1010000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(21, 'Bs Ecopia', 'BRI-18565-15-0021', 'BRI-18565-15-0021', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '767300.00', '845000.00', NULL, 8, 10, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-11-21 03:15:00', NULL),
(22, 'Bs Techno', 'BRI-18565-15-0022', 'BRI-18565-15-0022', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '638350.00', '735000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(23, 'Bs Duravis', 'BRI-195-15-0023', 'BRI-195-15-0023', 'Bridgestone', 2, 1, 195, 80, '15', '195 R15', '-', 'BARU', '2025', '771429.00', '1075000.00', '1150000.00', 5, 5, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(24, 'Bs Turanza ER33', 'BRI-19550-15-0024', 'BRI-19550-15-0024', 'Bridgestone', 2, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2023', '900000.00', '1060000.00', NULL, 4, 4, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-11-23 04:38:23', NULL),
(25, 'Bs Turanza', 'BRI-19555-15-0025', 'BRI-19555-15-0025', 'Bridgestone', 2, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2020', '550000.00', '850000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(26, 'Bs Techno', 'BRI-19555-15-0026', 'BRI-19555-15-0026', 'Bridgestone', 2, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2021', '700000.00', '730000.00', '900000.00', 5, 5, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(27, 'Bs Techno', 'BRI-19560-15-0027', 'BRI-19560-15-0027', 'Bridgestone', 2, 1, 195, 60, '15', '195/60 R15', '-', 'BARU', '2026', '713050.00', '820000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(28, 'Bs Ecopia', 'BRI-19565-15-0028', 'BRI-19565-15-0028', 'Bridgestone', 2, 1, 195, 65, '15', '195/65 R15', '-', 'BARU', '2026', '835150.00', '955000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(29, 'Bs Dueler HT D684', 'BRI-19580-15-0029', 'BRI-19580-15-0029', 'Bridgestone', 2, 1, 195, 80, '15', '195/80 R15', '-', 'BARU', '2020', '1003600.00', '1075000.00', '1335000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(30, 'Bs Ecopia', 'BRI-20565-15-0030', 'BRI-20565-15-0030', 'Bridgestone', 2, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '862200.00', '985000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(31, 'Bs B-390', 'BRI-20565-15-0031', 'BRI-20565-15-0031', 'Bridgestone', 2, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '1163500.00', '1250000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(32, 'Bs Ecopia', 'BRI-20570-15-0032', 'BRI-20570-15-0032', 'Bridgestone', 2, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '823650.00', '940000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(33, 'Bs AT002', 'BRI-20570-15-0033', 'BRI-20570-15-0033', 'Bridgestone', 2, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '1157650.00', '1270000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(34, 'Bs D-HT 687', 'BRI-20570-15-0034', 'BRI-20570-15-0034', 'Bridgestone', 2, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '1250600.00', '1360000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(35, 'Bs Turanza T005', 'BRI-21565-15-0035', 'BRI-21565-15-0035', 'Bridgestone', 2, 1, 215, 65, '15', '215/65 R15', '-', 'BARU', '2021', '650000.00', '1100000.00', '1325000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(36, 'Bs Dueler AT 002', 'BRI-23570-15-0036', 'BRI-23570-15-0036', 'Bridgestone', 2, 1, 235, 70, '15', '235/70 R15', '-', 'BARU', '2026', '1348750.00', '1535000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(37, 'Bs Dueler HL D683', 'BRI-23570-15-0037', 'BRI-23570-15-0037', 'Bridgestone', 2, 1, 235, 70, '15', '235/70 R15', '-', 'BARU', '2020', '775000.00', '975000.00', '1495000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(38, 'Bs Dueler HT D689', 'BRI-23575-15-0038', 'BRI-23575-15-0038', 'Bridgestone', 2, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '1148550.00', '1335000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(39, 'Bs Dueler AT D697', 'BRI-23575-15-0039', 'BRI-23575-15-0039', 'Bridgestone', 2, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '750000.00', '1345000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(40, 'Bs Turanza ER370', 'BRI-18555-16-0040', 'BRI-18555-16-0040', 'Bridgestone', 2, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2024', '800000.00', '1335000.00', '1490000.00', 8, 8, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(41, 'Bs Techno', 'BRI-18555-16-0041', 'BRI-18555-16-0041', 'Bridgestone', 2, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '829400.00', '915000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(42, 'Bs T6', 'BRI-18555-16-0042', 'BRI-18555-16-0042', 'Bridgestone', 2, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '1167650.00', '1270000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(43, 'Bs Techno', 'BRI-19550-16-0043', 'BRI-19550-16-0043', 'Bridgestone', 2, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '824850.00', '945000.00', NULL, 3, 3, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(44, 'Bs Turanza T6', 'BRI-19550-16-0044', 'BRI-19550-16-0044', 'Bridgestone', 2, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '1172750.00', '1290000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(45, 'Bs Techno Sports', 'BRI-19555-16-0045', 'BRI-19555-16-0045', 'Bridgestone', 2, 1, 195, 55, '16', '195/55 R16', '-', 'BARU', '2026', '875550.00', '960000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(46, 'Bs Ecopia', 'BRI-19560-16-0046', 'BRI-19560-16-0046', 'Bridgestone', 2, 1, 195, 60, '16', '195/60 R16', '-', 'BARU', '2026', '1052350.00', '1135000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(47, 'Bs Turanza T005A', 'BRI-19560-16-0047', 'BRI-19560-16-0047', 'Bridgestone', 2, 1, 195, 60, '16', '195/60 R16', '-', 'BARU', '2021', '700000.00', '950000.00', '1270000.00', 5, 5, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(48, 'Bs T6', 'BRI-20555-16-0048', 'BRI-20555-16-0048', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '1230700.00', '1395000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(49, 'Bs Ecopia', 'BRI-20555-16-0049', 'BRI-20555-16-0049', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '1129750.00', '1240000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(50, 'Bs Techno', 'BRI-20555-16-0050', 'BRI-20555-16-0050', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '890500.00', '1015000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(51, 'Bs Turanza AR20', 'BRI-20560-16-0051', 'BRI-20560-16-0051', 'Bridgestone', 2, 1, 205, 60, '16', '205/60 R16', '-', 'BARU', '2026', '458333.00', '540000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-11-23 04:38:23', NULL),
(52, 'Bs Ecopia', 'BRI-20565-16-0052', 'BRI-20565-16-0052', 'Bridgestone', 2, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2026', '959000.00', '1055000.00', NULL, 9, 9, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(53, 'Bs Turanza T005', 'BRI-20565-16-0053', 'BRI-20565-16-0053', 'Bridgestone', 2, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2024', '500000.00', '1250000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(54, 'Bs Dueler HT D689', 'BRI-21565-16-0054', 'BRI-21565-16-0054', 'Bridgestone', 2, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2026', '1245400.00', '1435000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(55, 'Bs Duravis', 'BRI-22575-16-0055', 'BRI-22575-16-0055', 'Bridgestone', 2, 1, 225, 75, '16', '225/75 R16', '-', 'BARU', '2026', '1401400.00', '1515000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(56, 'Bs Dueler HT D687', 'BRI-23560-16-0056', 'BRI-23560-16-0056', 'Bridgestone', 2, 1, 235, 60, '16', '235/60 R16', '-', 'BARU', '2026', '1511600.00', '1745000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(57, 'Bs Dueler MT D674', 'BRI-24575-16-0057', 'BRI-24575-16-0057', 'Bridgestone', 2, 1, 245, 75, '16', '245/75 R16', '-', 'BARU', '2021', '700000.00', '1450000.00', '1780000.00', 5, 5, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(58, 'Bs Dueler HT', 'BRI-26570-16-0058', 'BRI-26570-16-0058', 'Bridgestone', 2, 1, 265, 70, '16', '265/70 R16', '-', 'BARU', '2024', '900000.00', '1700000.00', '1920000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(59, 'Bs Dueler MT D674 (16+17+19)', 'BRI-26575-16-0059', 'BRI-26575-16-0059', 'Bridgestone', 2, 1, 265, 75, '16', '265/75 R16', '-', 'BARU', '2026', '900000.00', '1450000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(60, 'Bs Techno', 'BRI-21545-17-0060', 'BRI-21545-17-0060', 'Bridgestone', 2, 1, 215, 45, '17', '215/45 R17', '-', 'BARU', '2022', '935000.00', '1100000.00', NULL, 0, 2, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-11-23 03:35:00', NULL),
(61, 'Bs Turanza ER33', 'BRI-21555-17-0061', 'BRI-21555-17-0061', 'Bridgestone', 2, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '1701050.00', '1920000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(62, 'Bs Turanza T6', 'BRI-21555-17-0062', 'BRI-21555-17-0062', 'Bridgestone', 2, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '1285800.00', '1410000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(63, 'Bs Alenza AL01 T', 'BRI-21560-17-0063', 'BRI-21560-17-0063', 'Bridgestone', 2, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2026', '1303950.00', '1395000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(64, 'Bs Dueler HT D687', 'BRI-21560-17-0064', 'BRI-21560-17-0064', 'Bridgestone', 2, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2022', '1256450.00', '1480000.00', '1335000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-11-23 04:38:23', NULL),
(65, 'Bs Techno Sports', 'BRI-22545-17-0065', 'BRI-22545-17-0065', 'Bridgestone', 2, 1, 225, 45, '17', '225/45 R17', '-', 'BARU', '2026', '1129050.00', '1240000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(66, 'Bs Dueler HT D470', 'BRI-22565-17-0066', 'BRI-22565-17-0066', 'Bridgestone', 2, 1, 225, 65, '17', '225/65 R17', '-', 'BARU', '2026', '1210300.00', '1375000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(67, 'Bs Dueler HT copotan', 'BRI-25565-17-0067', 'BRI-25565-17-0067', 'Bridgestone', 2, 1, 255, 65, '17', '255/65 R17', '-', 'BARU', '2026', '595000.00', '1250000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(68, 'Bs Dueler HT D684', 'BRI-26565-17-0068', 'BRI-26565-17-0068', 'Bridgestone', 2, 1, 265, 65, '17', '265/65 R17', '-', 'BARU', '2026', '1632000.00', '1875000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(69, 'Bs Dueler AT halus D693', 'BRI-26565-17-0069', 'BRI-26565-17-0069', 'Bridgestone', 2, 1, 265, 65, '17', '265/65 R17', '-', 'BARU', '2022', '1000000.00', '1750000.00', '2165000.00', 3, 3, 1, 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(70, 'Bs Dueler AT D697', 'BRI-26570-17-0071', 'BRI-26570-17-0071', 'Bridgestone', 2, 1, 265, 70, '17', '265/70 R17', '-', 'BARU', '2026', '691000.00', '1200000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(71, 'Bs Dueler AT D697', 'BRI-26570-17-0069', 'BRI-26570-17-0069', 'Bridgestone', 2, 1, 265, 70, '17', '265/70 R17', '-', 'BARU', '2026', '691000.00', '1200000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51', NULL),
(72, 'Bs Potenza RE003', 'BRI-23550-18-0072', 'BRI-23550-18-0072', 'Bridgestone', 2, 1, 235, 50, '18', '235/50 R18', '-', 'BARU', '2026', '1532150.00', '1785000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(73, 'Bs Turanza 6', 'BRI-23550-18-0073', 'BRI-23550-18-0073', 'Bridgestone', 2, 1, 235, 50, '18', '235/50 R18', '-', 'BARU', '2026', '1444750.00', '1635000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(74, 'Bs Dueler HL 33', 'BRI-23560-18-0074', 'BRI-23560-18-0074', 'Bridgestone', 2, 1, 235, 60, '18', '235/60 R18', '-', 'BARU', '2026', '1615450.00', '1870000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(75, 'Bs Dueler HT D684', 'BRI-26560-18-0075', 'BRI-26560-18-0075', 'Bridgestone', 2, 1, 265, 60, '18', '265/60 R18', '-', 'BARU', '2026', '2012300.00', '2215000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(76, 'Dunlop LT5', 'DUN-165-13-0076', 'DUN-165-13-0076', 'Dunlop', 8, 1, 165, 80, '13', '165 R13', '-', 'BARU', '2026', '597500.00', '675000.00', NULL, 12, 12, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(77, 'Dunlop LT5', 'DUN-175-13-0077', 'DUN-175-13-0077', 'Dunlop', 8, 1, 175, 80, '13', '175 R13', '-', 'BARU', '2026', '610000.00', '700000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(78, 'Dunlop Enasave', 'DUN-17565-14-0078', 'DUN-17565-14-0078', 'Dunlop', 8, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '525000.00', '610000.00', NULL, 9, 9, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(79, 'Dunlop Touring R1', 'DUN-17565-14-0079', 'DUN-17565-14-0079', 'Dunlop', 8, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '529000.00', '595000.00', NULL, 10, 10, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(80, 'Dunlop LT5', 'DUN-185-14-0080', 'DUN-185-14-0080', 'Dunlop', 8, 1, 185, 80, '14', '185 R14', '-', 'BARU', '2026', '735000.00', '840000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(81, 'Dunlop SP10', 'DUN-18570-14-0081', 'DUN-18570-14-0081', 'Dunlop', 8, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '575000.00', '655000.00', NULL, 11, 11, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(82, 'Dunlop Enasave', 'DUN-18570-14-0082', 'DUN-18570-14-0082', 'Dunlop', 8, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '525000.00', '660000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(83, 'Dunlop Touring R1', 'DUN-18570-14-0083', 'DUN-18570-14-0083', 'Dunlop', 8, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '525000.00', '625000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(84, 'Dunlop Touring R1', 'DUN-18580-14-0084', 'DUN-18580-14-0084', 'Dunlop', 8, 1, 185, 80, '14', '185/80 R14', '-', 'BARU', '2026', '576180.00', '665000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(85, 'Dunlop LT5', 'DUN-195-14-0085', 'DUN-195-14-0085', 'Dunlop', 8, 1, 195, 80, '14', '195 R14', '-', 'BARU', '2026', '872190.00', '990000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(86, 'Dunlop Touring R1', 'DUN-19570-14-0086', 'DUN-19570-14-0086', 'Dunlop', 8, 1, 195, 70, '14', '195/70 R14', '-', 'BARU', '2026', '560340.00', '665000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(87, 'Dunlop Touring R1', 'DUN-17565-15-0087', 'DUN-17565-15-0087', 'Dunlop', 8, 1, 175, 65, '15', '175/65 R15', '-', 'BARU', '2026', '520000.00', '600000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(88, 'Dunlop SP31', 'DUN-17560-15-0088', 'DUN-17560-15-0088', 'Dunlop', 8, 1, 175, 60, '15', '175/60 R15', '-', 'BARU', '2026', '446500.00', '525000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-11-23 04:38:23', NULL),
(89, 'Dunlop Enasave', 'DUN-18555-15-0089', 'DUN-18555-15-0089', 'Dunlop', 8, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2026', '685000.00', '780000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(90, 'Dunlop Sportmaxx', 'DUN-18555-15-0090', 'DUN-18555-15-0090', 'Dunlop', 8, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2023', '450000.00', '740000.00', '1040000.00', 8, 8, 1, 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(91, 'Dunlop Enasave', 'DUN-18560-15-0091', 'DUN-18560-15-0091', 'Dunlop', 8, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2022', '565000.00', '685000.00', '810000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(92, 'Dunlop Touring R1', 'DUN-18560-15-0092', 'DUN-18560-15-0092', 'Dunlop', 8, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2026', '640000.00', '710000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(93, 'Dunlop Enasave', 'DUN-18565-15-0093', 'DUN-18565-15-0093', 'Dunlop', 8, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '675000.00', '755000.00', NULL, 15, 15, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(94, 'Dunlop SP300', 'DUN-18565-15-0094', 'DUN-18565-15-0094', 'Dunlop', 8, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2025', '599500.00', '705000.00', '735000.00', 0, 0, 1, 0, 1, 3, '2026-10-05 08:32:52', '2026-11-23 04:38:23', NULL),
(95, 'Dunlop Touring R1', 'DUN-18565-15-0095', 'DUN-18565-15-0095', 'Dunlop', 8, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '590000.00', '680000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(96, 'Dunlop Enasave', 'DUN-20565-15-0096', 'DUN-20565-15-0096', 'Dunlop', 8, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '755000.00', '855000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(97, 'Dunlop D80V4', 'DUN-20565-15-0097', 'DUN-20565-15-0097', 'Dunlop', 8, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '818730.00', '905000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(98, 'Dunlop Touring R1', 'DUN-20565-15-0098', 'DUN-20565-15-0098', 'Dunlop', 8, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '721957.00', '795000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(99, 'Dunlop Enasave', 'DUN-18555-16-0099', 'DUN-18555-16-0099', 'Dunlop', 8, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '650000.00', '940000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(100, 'Dunlop Enasave', 'DUN-19550-16-0100', 'DUN-19550-16-0100', 'Dunlop', 8, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2022', '575000.00', '700000.00', '835000.00', 0, 0, 1, 0, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(101, 'Dunlop Blue Response TG', 'DUN-19550-16-0101', 'DUN-19550-16-0101', 'Dunlop', 8, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '650000.00', '1045000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(102, 'Dunlop Blue Response TG', 'DUN-19555-16-0102', 'DUN-19555-16-0102', 'Dunlop', 8, 1, 195, 55, '16', '195/55 R16', '-', 'BARU', '2026', '650000.00', '1120000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(103, 'Dunlop Enasave', 'DUN-19560-16-0103', 'DUN-19560-16-0103', 'Dunlop', 8, 1, 195, 60, '16', '195/60 R16', '-', 'BARU', '2026', '865000.00', '970000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(104, 'Dunlop Enasave', 'DUN-20555-16-0104', 'DUN-20555-16-0104', 'Dunlop', 8, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '1000000.00', '1120000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(105, 'Dunlop LM705', 'DUN-20555-16-0105', 'DUN-20555-16-0105', 'Dunlop', 8, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2024', '500000.00', '590000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:52', '2026-11-23 04:38:23', NULL),
(106, 'Dunlop Touring R1', 'DUN-20560-16-0106', 'DUN-20560-16-0106', 'Dunlop', 8, 1, 205, 60, '16', '205/60 R16', '-', 'BARU', '2026', '698010.00', '800000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(107, 'Dunlop Enasave', 'DUN-20565-16-0107', 'DUN-20565-16-0107', 'Dunlop', 8, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2026', '796950.00', '890000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(108, 'Dunlop LM705', 'DUN-21560-16-0108', 'DUN-21560-16-0108', 'Dunlop', 8, 1, 215, 60, '16', '215/60 R16', '-', 'BARU', '2023', '360000.00', '425000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:52', '2026-11-23 04:38:23', NULL),
(109, 'Dunlop Enasave (Taqi)', 'DUN-21560-16-0109', 'DUN-21560-16-0109', 'Dunlop', 8, 1, 215, 60, '16', '215/60 R16', '-', 'BARU', '2026', '800000.00', '940000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(110, 'Dlp Grandtrek ST20', 'DUN-21565-16-0110', 'DUN-21565-16-0110', 'Dunlop', 8, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2026', '955000.00', '1075000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(111, 'Dunlop Blue Response TG', 'DUN-21565-16-0111', 'DUN-21565-16-0111', 'Dunlop', 8, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2026', '850000.00', '1215000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(112, 'Dunlop Grandtrek ST20', 'DUN-23560-16-0112', 'DUN-23560-16-0112', 'Dunlop', 8, 1, 235, 60, '16', '235/60 R16', '-', 'BARU', '2026', '1185000.00', '1325000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(113, 'Dunlop Direzza', 'DUN-21545-17-0113', 'DUN-21545-17-0113', 'Dunlop', 8, 1, 215, 45, '17', '215/45 R17', '-', 'BARU', '2020', '625000.00', '700000.00', '920000.00', 0, 0, 1, 0, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(114, 'Dunlop Enasave', 'DUN-20555-17-0114', 'DUN-20555-17-0114', 'Dunlop', 8, 1, 205, 55, '17', '205/55 R17', '-', 'BARU', '2026', '800000.00', '1135000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(115, 'Dunlop SP Sportmaxx 050', 'DUN-21555-17-0115', 'DUN-21555-17-0115', 'Dunlop', 8, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '1000000.00', '1445000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(116, 'Dunlop Blue Response TG', 'DUN-21555-17-0116', 'DUN-21555-17-0116', 'Dunlop', 8, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '1075000.00', '1180000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(117, 'Dunlop Enasave', 'DUN-21560-17-0117', 'DUN-21560-17-0117', 'Dunlop', 8, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2026', '931667.00', '1005000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(118, 'Dunlop Grandtrek ST30', 'DUN-22565-17-0118', 'DUN-22565-17-0118', 'Dunlop', 8, 1, 225, 65, '17', '225/65 R17', '-', 'BARU', '2026', '925000.00', '1045000.00', NULL, 3, 3, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(119, 'Dunlop Grandtrek AT25', 'DUN-26565-17-0119', 'DUN-26565-17-0119', 'Dunlop', 8, 1, 265, 65, '17', '265/65 R17', '-', 'BARU', '2026', '1621250.00', '1790000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(120, 'Dunlop Blue Response TG', 'DUN-23550-18-0120', 'DUN-23550-18-0120', 'Dunlop', 8, 1, 235, 50, '18', '235/50 R18', '-', 'BARU', '2026', '1204830.00', '1335000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(121, 'Dunlop Grandtrek AT25', 'DUN-26560-18-0121', 'DUN-26560-18-0121', 'Dunlop', 8, 1, 265, 60, '18', '265/60 R18', '-', 'BARU', '2026', '1800000.00', '1930000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(122, 'GT Maxmiller', 'GT-155-12-0122', 'GT-155-12-0122', 'GT', 3, 1, 155, 80, '12', '155 R12', '-', 'BARU', '2026', '469980.00', '545000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(123, 'GT Champiro BXT', 'GT-15580-12-0123', 'GT-15580-12-0123', 'GT', 3, 1, 155, 80, '12', '155/80 R12', '-', 'BARU', '2026', '391220.00', '440000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(124, 'Gajah Tunggal', 'GT-500-12-0124', 'GT-500-12-0124', 'GT', 3, 1, 500, 80, '12', '500 R12', '-', 'BARU', '2026', '347250.00', '405000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(125, 'GT Super', 'GT-SUPER-550-R13', 'GT-SUPER-550-R13', 'GT', 3, 1, 550, 0, '13', '550 R13', 'Super', 'BARU', '2026', '464000.00', '520000.00', NULL, 3, 3, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(126, 'GT Super', 'GT-600-13-0126', 'GT-600-13-0126', 'GT', 3, 1, 600, 80, '13', '600 R13', '-', 'BARU', '2024', '485000.00', '560000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(127, 'GT Champiro Eco', 'GT-14580-13-0127', 'GT-14580-13-0127', 'GT', 3, 1, 145, 80, '13', '145/80 R13', '-', 'BARU', '2026', '403620.00', '455000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(128, 'GT Champiro Eco', 'GT-15580-13-0128', 'GT-15580-13-0128', 'GT', 3, 1, 155, 80, '13', '155/80 R13', '-', 'BARU', '2026', '275000.00', '460000.00', NULL, 9, 9, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(129, 'GT Maxmiller', 'GT-165-13-0129', 'GT-165-13-0129', 'GT', 3, 1, 165, 80, '13', '165 R13', '-', 'BARU', '2026', '562590.00', '620000.00', NULL, 9, 9, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(130, 'GT Champiro Ecotec', 'GT-16565-13-0130', 'GT-16565-13-0130', 'GT', 3, 1, 165, 65, '13', '165/65 R13', '-', 'BARU', '2026', '427800.00', '495000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(131, 'GT Champiro Ecotec', 'GT-16580-13-0131', 'GT-16580-13-0131', 'GT', 3, 1, 165, 80, '13', '165/80 R13', '-', 'BARU', '2026', '440800.00', '525000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(132, 'GT Maxmiller', 'GT-175-13-0132', 'GT-175-13-0132', 'GT', 3, 1, 175, 80, '13', '175 R13', '-', 'BARU', '2026', '612360.00', '675000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(133, 'GT Champiro Ecotec', 'GT-17570-13-0133', 'GT-17570-13-0133', 'GT', 3, 1, 175, 70, '13', '175/70 R13', '-', 'BARU', '2026', '451400.00', '515000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(134, 'Gajah Tunggal', 'GT-700-14-0134', 'GT-700-14-0134', 'GT', 3, 1, 700, 80, '14', '700 R14', '-', 'BARU', '2026', '606214.00', '685000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(135, 'GT Maxmiller', 'GT-175-14-0135', 'GT-175-14-0135', 'GT', 3, 1, 175, 80, '14', '175 R14', '-', 'BARU', '2026', '650074.00', '735000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(136, 'GT Champiro Ecotec', 'GT-17565-14-0136', 'GT-17565-14-0136', 'GT', 3, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '475000.00', '545000.00', NULL, 15, 15, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(137, 'GT Maxmiller', 'GT-185-14-0137', 'GT-185-14-0137', 'GT', 3, 1, 185, 80, '14', '185 R14', '-', 'BARU', '2026', '720720.00', '795000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(138, 'GT Champiro Ecotec', 'GT-18570-14-0138', 'GT-18570-14-0138', 'GT', 3, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '531960.00', '595000.00', NULL, 12, 12, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(139, 'GT Maxmiller', 'GT-195-14-0139', 'GT-195-14-0139', 'GT', 3, 1, 195, 80, '14', '195 R14', '-', 'BARU', '2026', '803520.00', '900000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(140, 'GT Champiro Ecotec', 'GT-19570-14-0140', 'GT-19570-14-0140', 'GT', 3, 1, 195, 70, '14', '195/70 R14', '-', 'BARU', '2026', '559925.00', '620000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(141, 'GT Savero Komodo MT', 'GT-278,5-14-0141', 'GT-278,5-14-0141', 'GT', 3, 1, 27, 85, '14', '27/8,5 R14', '-', 'BARU', '2026', '864579.00', '1025000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(142, 'GT Champiro Ecotec', 'GT-18555-15-0142', 'GT-18555-15-0142', 'GT', 3, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2026', '595900.00', '670000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(143, 'GT Champiro Ecotec', 'GT-18560-15-0143', 'GT-18560-15-0143', 'GT', 3, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2026', '626200.00', '725000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(144, 'GT Champiro Ecotec', 'GT-18565-15-0144', 'GT-18565-15-0144', 'GT', 3, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '600200.00', '670000.00', NULL, 15, 15, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(145, 'GT Savero', 'GT-18565-15-0145', 'GT-18565-15-0145', 'GT', 3, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2021', '400000.00', '475000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:52', '2026-11-23 04:38:23', NULL),
(146, 'GT Maxmiller', 'GT-195-15-0146', 'GT-195-15-0146', 'GT', 3, 1, 195, 80, '15', '195 R15', '-', 'BARU', '2026', '880740.00', '970000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(147, 'GT SX2', 'GT-19550-15-0147', 'GT-19550-15-0147', 'GT', 3, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '692200.00', '800000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(148, 'GT GTX Pro2', 'GT-19550-15-0148', 'GT-19550-15-0148', 'GT', 3, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '654800.00', '715000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(149, 'GT SX2', 'GT-19555-15-0149', 'GT-19555-15-0149', 'GT', 3, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2026', '677000.00', '825000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(150, 'GT GTX Pro2', 'GT-19555-15-0150', 'GT-19555-15-0150', 'GT', 3, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2026', '651620.00', '735000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(151, 'GT Champiro Ecotec', 'GT-19560-15-0151', 'GT-19560-15-0151', 'GT', 3, 1, 195, 60, '15', '195/60 R15', '-', 'BARU', '2026', '597680.00', '655000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(152, 'GT Champiro Ecotec', 'GT-19565-15-0152', 'GT-19565-15-0152', 'GT', 3, 1, 195, 65, '15', '195/65 R15', '-', 'BARU', '2026', '636740.00', '695000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(153, 'GT Champiro Ecotec', 'GT-20565-15-0153', 'GT-20565-15-0153', 'GT', 3, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '650200.00', '755000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(154, 'GT Savero AT', 'GT-20570-15-0155', 'GT-20570-15-0155', 'GT', 3, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '388889.00', '925000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(155, 'GT Savero AT', 'GT-20570-15-0153', 'GT-20570-15-0153', 'GT', 3, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '388889.00', '460000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:52', '2026-11-23 04:38:23', NULL),
(156, 'GT Savero SUV', 'GT-20570-15-0156', 'GT-20570-15-0156', 'GT', 3, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '706800.00', '795000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52', NULL),
(157, 'GT Savero AT Pro', 'GT-23570-15-0157', 'GT-23570-15-0157', 'GT', 3, 1, 235, 70, '15', '235/70 R15', '-', 'BARU', '2026', '980840.00', '1100000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(158, 'GT Savero MT', 'GT-23575-15-0158', 'GT-23575-15-0158', 'GT', 3, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '1098100.00', '1300000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(159, 'GT Savero AT Pro', 'GT-23575-15-0159', 'GT-23575-15-0159', 'GT', 3, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '964100.00', '1125000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(160, 'GT Savero Komodo MT', 'GT-278.5-15-0160', 'GT-278.5-15-0160', 'GT', 3, 1, 27, 85, '15', '27/8.5 R15', '-', 'BARU', '2026', '600000.00', '710000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-11-23 04:38:23', NULL),
(161, 'GT Savero AT Plus', 'GT-309.5-15-0161', 'GT-309.5-15-0161', 'GT', 3, 1, 30, 95, '15', '30/9.5 R15', '-', 'BARU', '2026', '600000.00', '710000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-11-23 04:38:23', NULL),
(162, 'GT Savero AT Pro', 'GT-309.5-15-0162', 'GT-309.5-15-0162', 'GT', 3, 1, 30, 95, '15', '30/9.5 R15', '-', 'BARU', '2026', '1130900.00', '1325000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(163, 'GT Komodo MT Plus', 'GT-309.5-15-0163', 'GT-309.5-15-0163', 'GT', 3, 1, 30, 95, '15', '30/9.5 R15', '-', 'BARU', '2026', '1155000.00', '1300000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(164, 'GT Savero Komex', 'GT-3110.5-15-0164', 'GT-3110.5-15-0164', 'GT', 3, 1, 31, 105, '15', '31/10.5 R15', '-', 'BARU', '2026', '1382000.00', '1600000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(165, 'GT Savero MT Pro', 'GT-3110.5-15-0166', 'GT-3110.5-15-0166', 'GT', 3, 1, 31, 105, '15', '31/10.5 R15', '-', 'BARU', '2026', '1359040.00', '1525000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(166, 'GT Savero MT Pro', 'GT-3110.5-15-0164-2', 'GT-3110.5-15-0164-2', 'GT', 3, 1, 31, 105, '15', '31/10.5 R15', '-', 'BARU', '2026', '1232500.00', '1450000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-11-23 04:38:23', NULL),
(167, 'GT Savero AT Pro', 'GT-3110.5-15-0167', 'GT-3110.5-15-0167', 'GT', 3, 1, 31, 105, '15', '31/10.5 R15', '-', 'BARU', '2026', '1354700.00', '1525000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(168, 'GT Savero Komex', 'GT-3310.5-15-0168', 'GT-3310.5-15-0168', 'GT', 3, 1, 33, 105, '15', '33/10.5 R15', '-', 'BARU', '2025', '1880000.00', '2050000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(169, 'GT Savero MT', 'GT-3312.5-15-0169', 'GT-3312.5-15-0169', 'GT', 3, 1, 33, 125, '15', '33/12.5 R15', '-', 'BARU', '2026', '1649200.00', '1850000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(170, 'GT GTX Pro2', 'GT-18555-16-0170', 'GT-18555-16-0170', 'GT', 3, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '682000.00', '745000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(171, 'GT GTX Pro2', 'GT-19550-16-0172', 'GT-19550-16-0172', 'GT', 3, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '715480.00', '780000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(172, 'GT GTX Pro2', 'GT-19555-16-0174', 'GT-19555-16-0174', 'GT', 3, 1, 195, 55, '16', '195/55 R16', '-', 'BARU', '2026', '675180.00', '760000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(173, 'GT Champiro Ecotec', 'GT-19560-16-0175', 'GT-19560-16-0175', 'GT', 3, 1, 195, 60, '16', '195/60 R16', '-', 'BARU', '2026', '727880.00', '820000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(174, 'GT GTX Pro2', 'GT-20555-16-0176', 'GT-20555-16-0176', 'GT', 3, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '763220.00', '860000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(175, 'GT Champiro Luxe', 'GT-20565-16-0177', 'GT-20565-16-0177', 'GT', 3, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2026', '725400.00', '830000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(176, 'GT Savero SUV', 'GT-21565-16-0178', 'GT-21565-16-0178', 'GT', 3, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2026', '771280.00', '840000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(177, 'GT Maxmiler', 'GT-22575-16-0179', 'GT-22575-16-0179', 'GT', 3, 1, 225, 75, '16', '225/75 R16', '-', 'BARU', '2026', '1202040.00', '1315000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(178, 'GT Savero SUV', 'GT-23560-16-0180', 'GT-23560-16-0180', 'GT', 3, 1, 235, 60, '16', '235/60 R16', '-', 'BARU', '2026', '847540.00', '955000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(179, 'GT Max Pro', 'GT-23565-16-0181', 'GT-23565-16-0181', 'GT', 3, 1, 235, 65, '16', '235/65 R16', '-', 'BARU', '2026', '1166000.00', '1375000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(180, 'GT Savero MT', 'GT-24575-16-0182', 'GT-24575-16-0182', 'GT', 3, 1, 245, 75, '16', '245/75 R16', '-', 'BARU', '2020', '600000.00', '1500000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(181, 'GT Savero AT', 'GT-24570-16-0183', 'GT-24570-16-0183', 'GT', 3, 1, 245, 70, '16', '245/70 R16', '-', 'BARU', '2026', '450000.00', '530000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-11-23 04:38:23', NULL),
(182, 'GT Savero MT', 'GT-26575-16-0184', 'GT-26575-16-0184', 'GT', 3, 1, 265, 75, '16', '265/75 R16', '-', 'BARU', '2026', '700000.00', '1575000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(183, 'GT GTX Pro', 'GT-20545-17-0185', 'GT-20545-17-0185', 'GT', 3, 1, 205, 45, '17', '205/45 R17', '-', 'BARU', '2026', '700600.00', '875000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(184, 'GT GTX Pro', 'GT-21550-17-0186', 'GT-21550-17-0186', 'GT', 3, 1, 215, 50, '17', '215/50 R17', '-', 'BARU', '2026', '801100.00', '955000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(185, 'GT Savero SUV', 'GT-21555-17-0187', 'GT-21555-17-0187', 'GT', 3, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '758900.00', '830000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(186, 'GT Savero SUV', 'GT-21560-17-0188', 'GT-21560-17-0188', 'GT', 3, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2026', '795500.00', '915000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(187, 'GT Savero SUV', 'GT-22565-17-0189', 'GT-22565-17-0189', 'GT', 3, 1, 225, 65, '17', '225/65 R17', '-', 'BARU', '2026', '813000.00', '945000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(188, 'GT Savero SUV', 'GT-26565-17-0190', 'GT-26565-17-0190', 'GT', 3, 1, 265, 65, '17', '265/65 R17', '-', 'BARU', '2026', '1155100.00', '1290000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(189, 'GT Savero SUV', 'GT-22560-18-0191', 'GT-22560-18-0191', 'GT', 3, 1, 225, 60, '18', '225/60 R18', '-', 'BARU', '2026', '945500.00', '1065000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(190, 'GT Savero SUV', 'GT-23560-18-0192', 'GT-23560-18-0192', 'GT', 3, 1, 235, 60, '18', '235/60 R18', '-', 'BARU', '2026', '951100.00', '1070000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(191, 'GT Savero SUV', 'GT-26560-18-0194', 'GT-26560-18-0194', 'GT', 3, 1, 265, 60, '18', '265/60 R18', 'Savero SUV', 'BARU', '2026', '1150100.00', '1250000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(192, 'GT', 'GT-26560-18-0190', 'GT-26560-18-0190', 'GT', 3, 1, 265, 60, '18', '265/60 R18', '-', 'BARU', '2026', '400000.00', '475000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-11-23 04:38:23', NULL),
(193, 'Acc Gamma', 'ACC-16565-13-0195', 'ACC-16565-13-0195', 'Accelera', 9, 1, 165, 65, '13', '165/65 R13', '-', 'BARU', '2026', '372017.00', '415000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(194, 'Acc Ecoplush', 'ACC-16580-13-0196', 'ACC-16580-13-0196', 'Accelera', 9, 1, 165, 80, '13', '165/80 R13', '-', 'BARU', '2026', '404561.00', '445000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(195, 'Acc Ecoplush', 'ACC-17570-13-0197', 'ACC-17570-13-0197', 'Accelera', 9, 1, 175, 70, '13', '175/70 R13', '-', 'BARU', '2026', '399564.00', '445000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(196, 'Acc Ecoplush', 'ACC-16565-14-0198', 'ACC-16565-14-0198', 'Accelera', 9, 1, 165, 65, '14', '165/65 R14', '-', 'BARU', '2024', '443872.00', '485000.00', '510000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(197, 'Acc Ecoplush', 'ACC-17565-14-0199', 'ACC-17565-14-0199', 'Accelera', 9, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '425774.00', '485000.00', NULL, 13, 13, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(198, 'Acc Ecoplush', 'ACC-18570-14-0200', 'ACC-18570-14-0200', 'Accelera', 9, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '481385.00', '530000.00', NULL, 14, 14, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(199, 'Acc PHI-R', 'ACC-17555-15-0201', 'ACC-17555-15-0201', 'Accelera', 9, 1, 175, 55, '15', '175/55 R15', '-', 'BARU', '2026', '450000.00', '575000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(200, 'Acc IOTA EVT', 'ACC-17555-15-0202', 'ACC-17555-15-0202', 'Accelera', 9, 1, 175, 55, '15', '175/55 R15', '-', 'BARU', '2026', '525665.00', '575000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(201, 'Acc IOTA EVT', 'ACC-18555-15-0203', 'ACC-18555-15-0203', 'Accelera', 9, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2026', '501595.00', '570000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(202, 'Acc Ecoplush', 'ACC-18560-15-0204', 'ACC-18560-15-0204', 'Accelera', 9, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2026', '506993.00', '570000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(203, 'Acc Ecoplush', 'ACC-18565-15-0205', 'ACC-18565-15-0205', 'Accelera', 9, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '536701.00', '575000.00', NULL, 17, 17, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(204, 'Acc IOTA EVT', 'ACC-19550-15-0206', 'ACC-19550-15-0206', 'Accelera', 9, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '563376.00', '610000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(205, 'Acc 651 Sport', 'ACC-19550-15-0207', 'ACC-19550-15-0207', 'Accelera', 9, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '687849.00', '775000.00', NULL, 3, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:42:05', NULL),
(206, 'Forceum EXP Sport. Semislick', 'ACC-19550-15-0208', 'ACC-19550-15-0208', 'Accelera', 9, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2024', '670076.00', '725000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(207, 'Acc IOTA EVT', 'ACC-19555-15-0209', 'ACC-19555-15-0209', 'Accelera', 9, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2026', '578482.00', '625000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(208, 'Acc 651 Sport. Semilsick', 'ACC-19555-15-0210', 'ACC-19555-15-0210', 'Accelera', 9, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2024', '558000.00', '700000.00', '780000.00', 4, 4, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(209, 'Acc Ecoplush', 'ACC-19565-15-0211', 'ACC-19565-15-0211', 'Accelera', 9, 1, 195, 65, '15', '195/65 R15', '-', 'BARU', '2026', '555008.00', '605000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(210, 'Acc Ecoplush', 'ACC-20565-15-0212', 'ACC-20565-15-0212', 'Accelera', 9, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '607123.00', '650000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(211, 'Acc Omicron AT', 'ACC-23570-15-0213', 'ACC-23570-15-0213', 'Accelera', 9, 1, 235, 70, '15', '235/70 R15', '-', 'BARU', '2026', '856801.00', '925000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(212, 'Acc Omicron AT', 'ACC-23575-15-0214', 'ACC-23575-15-0214', 'Accelera', 9, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '829093.00', '1000000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL);
INSERT INTO `products` (`id`, `product_name`, `product_code`, `barcode`, `brand`, `brand_id`, `category_id`, `size_width`, `size_ratio`, `ring`, `product_size`, `motif`, `condition_code`, `product_year`, `product_cost`, `product_price`, `reference_price`, `product_quantity`, `stok_awal`, `product_stock_alert`, `is_active`, `is_old_stock`, `branch_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
(213, 'Acc MT 01 (NOM / tdk ada tahun)', 'ACC-23575-15-0216', 'ACC-23575-15-0216', 'Accelera', 9, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '370000.00', '1100000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(214, 'Acc MT 01 (NOM / tdk ada tahun)', 'ACC-23575-15-0212', 'ACC-23575-15-0212', 'Accelera', 9, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '370000.00', '1100000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(215, 'Forceum AT', 'ACC-23575-15-0217', 'ACC-23575-15-0217', 'Accelera', 9, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2023', '866402.00', '980000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(216, 'Acc MT 01', 'ACC-309,5-15-0218', 'ACC-309,5-15-0218', 'Accelera', 9, 1, 30, 95, '15', '30/9,5 R15', '-', 'BARU', '2026', '1031423.00', '1150000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(217, 'Acc MT 01', 'ACC-3110,5-15-0219', 'ACC-3110,5-15-0219', 'Accelera', 9, 1, 31, 105, '15', '31/10,5 R15', '-', 'BARU', '2026', '1180803.00', '1275000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(218, 'Acc MT', 'ACC-3312,5-15-0220', 'ACC-3312,5-15-0220', 'Accelera', 9, 1, 33, 125, '15', '33/12,5 R15', '-', 'BARU', '2026', '1150000.00', '1700000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(219, 'Acc PHI-R', 'ACC-18555-16-0221', 'ACC-18555-16-0221', 'Accelera', 9, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '568440.00', '655000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(220, 'Acc IOTA EVT', 'ACC-18555-16-0222', 'ACC-18555-16-0222', 'Accelera', 9, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '598505.00', '650000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(221, 'Acc PHI-R', 'ACC-19545-16-0223', 'ACC-19545-16-0223', 'Accelera', 9, 1, 195, 45, '16', '195/45 R16', '-', 'BARU', '2026', '636560.00', '720000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(222, 'Acc 651 Sport. Semislick', 'ACC-19550-16-0224', 'ACC-19550-16-0224', 'Accelera', 9, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2024', '691680.00', '750000.00', '800000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(223, 'Acc IOTA EVT', 'ACC-19550-16-0225', 'ACC-19550-16-0225', 'Accelera', 9, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '610560.00', '635000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(224, 'Acc IOTA EVT', 'ACC-19555-16-0226', 'ACC-19555-16-0226', 'Accelera', 9, 1, 195, 55, '16', '195/55 R16', '-', 'BARU', '2026', '608920.00', '660000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(225, 'Acc Ecoplush', 'ACC-19560-16-0227', 'ACC-19560-16-0227', 'Accelera', 9, 1, 195, 60, '16', '195/60 R16', '-', 'BARU', '2023', '500000.00', '725000.00', '750000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(226, 'Acc 651 Sport', 'ACC-20550-16-0228', 'ACC-20550-16-0228', 'Accelera', 9, 1, 205, 50, '16', '205/50 R16', '-', 'BARU', '2026', '762840.00', '850000.00', NULL, 5, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 09:14:27', NULL),
(227, 'Acc IOTA EVT', 'ACC-20555-16-0229', 'ACC-20555-16-0229', 'Accelera', 9, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '652680.00', '715000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(228, 'Acc Ecoplush', 'ACC-20560-16-0230', 'ACC-20560-16-0230', 'Accelera', 9, 1, 205, 60, '16', '205/60 R16', '-', 'BARU', '2026', '641240.00', '705000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(229, 'Acc Ecoplush', 'ACC-20565-16-0231', 'ACC-20565-16-0231', 'Accelera', 9, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2026', '598600.00', '675000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(230, 'Acc Ecoplush', 'ACC-21565-16-0232', 'ACC-21565-16-0232', 'Accelera', 9, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2026', '695320.00', '765000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(231, 'Acc IOTA EVT', 'ACC-23560-16-0233', 'ACC-23560-16-0233', 'Accelera', 9, 1, 235, 60, '16', '235/60 R16', '-', 'BARU', '2026', '805560.00', '885000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(232, 'Acc IOTA EVT', 'ACC-20545-17-0234', 'ACC-20545-17-0234', 'Accelera', 9, 1, 205, 45, '17', '205/45 R17', '-', 'BARU', '2026', '664640.00', '730000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(233, 'Acc IOTA EVT', 'ACC-20550-17-0235', 'ACC-20550-17-0235', 'Accelera', 9, 1, 205, 50, '17', '205/50 R17', '-', 'BARU', '2026', '703640.00', '765000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(234, 'Acc IOTA EVT', 'ACC-20555-17-0236', 'ACC-20555-17-0236', 'Accelera', 9, 1, 205, 55, '17', '205/55 R17', '-', 'BARU', '2026', '797240.00', '870000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(235, 'Acc IOTA EVT', 'ACC-21545-17-0237', 'ACC-21545-17-0237', 'Accelera', 9, 1, 215, 45, '17', '215/45 R17', '-', 'BARU', '2025', '704680.00', '770000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(236, 'Acc IOTA EVT', 'ACC-21550-17-0238', 'ACC-21550-17-0238', 'Accelera', 9, 1, 215, 50, '17', '215/50 R17', '-', 'BARU', '2026', '740040.00', '805000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(237, 'Acc IOTA EVT', 'ACC-21555-17-0239', 'ACC-21555-17-0239', 'Accelera', 9, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '792560.00', '855000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(238, 'Acc IOTA EVT', 'ACC-21540-18-0240', 'ACC-21540-18-0240', 'Accelera', 9, 1, 215, 40, '18', '215/40 R18', '-', 'BARU', '2026', '848641.00', '905000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(239, 'Acc IOTA EVT', 'ACC-22540-18-0241', 'ACC-22540-18-0241', 'Accelera', 9, 1, 225, 40, '18', '225/40 R18', '-', 'BARU', '2026', '819520.00', '875000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(240, 'Acc 651', 'ACC-22540-18-0242', 'ACC-22540-18-0242', 'Accelera', 9, 1, 225, 40, '18', '225/40 R18', '-', 'BARU', '2024', '999000.00', '1025000.00', '1100000.00', 4, 2, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 09:55:10', NULL),
(241, 'Acc IOTA EVT', 'ACC-22545-18-0243', 'ACC-22545-18-0243', 'Accelera', 9, 1, 225, 45, '18', '225/45 R18', '-', 'BARU', '2025', '897080.00', '1005000.00', NULL, 3, 3, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(242, 'Acc IOTA EVT', 'ACC-22550-18-0244', 'ACC-22550-18-0244', 'Accelera', 9, 1, 225, 50, '18', '225/50 R18', '-', 'BARU', '2026', '962600.00', '1045000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(243, 'Acc PHI-R', 'ACC-22550-18-0245', 'ACC-22550-18-0245', 'Accelera', 9, 1, 225, 50, '18', '225/50 R18', '-', 'BARU', '2025', '902500.00', '1000000.00', '1055000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(244, 'Acc PHI X-Boost', 'ACC-22550-18-0246', 'ACC-22550-18-0246', 'Accelera', 9, 1, 225, 50, '18', '225/50 R18', '-', 'BARU', '2024', '700000.00', '900000.00', '1050000.00', 6, 6, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(245, 'Acc IOTA EVT', 'ACC-23550-18-0247', 'ACC-23550-18-0247', 'Accelera', 9, 1, 235, 50, '18', '235/50 R18', '-', 'BARU', '2026', '996920.00', '1075000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(246, 'Acc IOTA ST68', 'ACC-23560-18-0248', 'ACC-23560-18-0248', 'Accelera', 9, 1, 235, 60, '18', '235/60 R18', '-', 'BARU', '2026', '939720.00', '1075000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(247, 'Acc 651 Sport', 'ACC-25550-18-0249', 'ACC-25550-18-0249', 'Accelera', 9, 1, 255, 50, '18', '255/50 R18', '-', 'BARU', '2024', '1208000.00', '1375000.00', NULL, 0, 0, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(248, 'Acc 651 Sport', 'ACC-26560-18-0250', 'ACC-26560-18-0250', 'Accelera', 9, 1, 265, 60, '18', '265/60 R18', '-', 'BARU', '2024', '1558000.00', '2170000.00', NULL, 0, 0, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(249, 'Acc IOTA', 'ACC-23555-19-0251', 'ACC-23555-19-0251', 'Accelera', 9, 1, 235, 55, '19', '235/55 R19', '-', 'BARU', '2026', '1611560.00', '1800000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(250, 'Acc PHI', 'ACC-23535-20-0252', 'ACC-23535-20-0252', 'Accelera', 9, 1, 235, 35, '20', '235/35 R20', '-', 'BARU', '2026', '1206660.00', '1420000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-11-23 04:38:23', NULL),
(251, 'Acc Omikron AT', 'ACC-26550-20-0253', 'ACC-26550-20-0253', 'Accelera', 9, 1, 265, 50, '20', '265/50 R20', '-', 'BARU', '2020', '1445000.00', '1700000.00', '1955000.00', 3, 4, 1, 1, 1, 3, '2026-10-05 08:32:53', '2026-11-21 07:45:00', NULL),
(252, 'Acc MT 01', 'ACC-27555-20-0254', 'ACC-27555-20-0254', 'Accelera', 9, 1, 275, 55, '20', '275/55 R20', '-', 'BARU', '2026', '2265000.00', '2900000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(253, 'Acc IOTA', 'ACC-28550-20-0255', 'ACC-28550-20-0255', 'Accelera', 9, 1, 285, 50, '20', '285/50 R20', '-', 'BARU', '2026', '1450000.00', '1640000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(254, 'HANKOOK', 'DEL-16565-14-0256', 'DEL-16565-14-0256', 'Delium', 12, 1, 165, 65, '14', '165/65 R14', '-', 'BARU', '2021', '375000.00', '520000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(255, 'HANKOOK Kinergy Eco', 'DEL-17565-14-0258', 'DEL-17565-14-0258', 'Delium', 12, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2022', '410000.00', '545000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(256, 'HANKOOK Kinergy Eco', 'DEL-17565-14-0254', 'DEL-17565-14-0254', 'Delium', 12, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2022', '410000.00', '545000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(257, 'HANKOOK', 'DEL-20565-15-0259', 'DEL-20565-15-0259', 'Delium', 12, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2023', '450000.00', '600000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(258, 'HANKOOK', 'DEL-19550-16-0260', 'DEL-19550-16-0260', 'Delium', 12, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2022', '540000.00', '685000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(259, 'Delium Power Saver', 'DEL-165-13-0261', 'DEL-165-13-0261', 'Delium', 12, 1, 165, 80, '13', '165 R13', '-', 'BARU', '2026', '520000.00', '570000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(260, 'Delium Evo Techno', 'DEL-16565-13-0262', 'DEL-16565-13-0262', 'Delium', 12, 1, 165, 65, '13', '165/65 R13', '-', 'BARU', '2026', '352500.00', '415000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(261, 'Delium Evo Techno', 'DEL-16580-13-0263', 'DEL-16580-13-0263', 'Delium', 12, 1, 165, 80, '13', '165/80 R13', '-', 'BARU', '2026', '380500.00', '445000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(262, 'Delium Power Saver', 'DEL-175-13-0264', 'DEL-175-13-0264', 'Delium', 12, 1, 175, 80, '13', '175 R13', '-', 'BARU', '2026', '564000.00', '620000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(263, 'Delium Evotechno', 'DEL-17570-13-0265', 'DEL-17570-13-0265', 'Delium', 12, 1, 175, 70, '13', '175/70 R13', '-', 'BARU', '2026', '390500.00', '445000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(264, 'Delium Evo Techno', 'DEL-17565-14-0266', 'DEL-17565-14-0266', 'Delium', 12, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '438800.00', '485000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53', NULL),
(265, 'Delium Power Saver', 'DEL-185-14-0267', 'DEL-185-14-0267', 'Delium', 12, 1, 185, 80, '14', '185 R14', '-', 'BARU', '2026', '692000.00', '780000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(266, 'Delium Evo Techno', 'DEL-18570-14-0268', 'DEL-18570-14-0268', 'Delium', 12, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '480800.00', '530000.00', NULL, 7, 7, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(267, 'Delium Power Ranger', 'DEL-195-14-0269', 'DEL-195-14-0269', 'Delium', 12, 1, 195, 80, '14', '195 R14', '-', 'BARU', '2026', '728000.00', '800000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(268, 'Delium Evo Techno', 'DEL-19570-14-0270', 'DEL-19570-14-0270', 'Delium', 12, 1, 195, 70, '14', '195/70 R14', '-', 'BARU', '2026', '511800.00', '565000.00', NULL, 12, 12, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(269, 'Delium T.Cruiser', 'DEL-19570-14-0271', 'DEL-19570-14-0271', 'Delium', 12, 1, 195, 70, '14', '195/70 R14', '-', 'BARU', '2026', '596800.00', '675000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(270, 'Delium Evo Techno', 'DEL-18555-15-0272', 'DEL-18555-15-0272', 'Delium', 12, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2026', '504800.00', '570000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(271, 'Delium Evo Techno', 'DEL-18560-15-0273', 'DEL-18560-15-0273', 'Delium', 12, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2026', '487800.00', '550000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(272, 'Delium Evo Techno', 'DEL-18565-15-0274', 'DEL-18565-15-0274', 'Delium', 12, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2026', '508800.00', '575000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(273, 'Delium Evoraze (semislick)', 'DEL-19550-15-0275', 'DEL-19550-15-0275', 'Delium', 12, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '530874.00', '600000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(274, 'Delium Evoraze (semislick)', 'DEL-19555-15-0276', 'DEL-19555-15-0276', 'Delium', 12, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2026', '540337.00', '605000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(275, 'Delium Evo Techno', 'DEL-19560-15-0277', 'DEL-19560-15-0277', 'Delium', 12, 1, 195, 60, '15', '195/60 R15', '-', 'BARU', '2026', '520874.00', '590000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(276, 'Delium Evo Techno', 'DEL-19565-15-0278', 'DEL-19565-15-0278', 'Delium', 12, 1, 195, 65, '15', '195/65 R15', '-', 'BARU', '2026', '542800.00', '605000.00', NULL, 6, 6, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(277, 'Delium T Cruiser AT', 'DEL-19565-15-0279', 'DEL-19565-15-0279', 'Delium', 12, 1, 195, 65, '15', '195/65 R15', '-', 'BARU', '2026', '605800.00', '675000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(278, 'Delium Evo Techno', 'DEL-20565-15-0280', 'DEL-20565-15-0280', 'Delium', 12, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '585874.00', '650000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(279, 'Delium Evo Techno', 'DEL-20570-15-0281', 'DEL-20570-15-0281', 'Delium', 12, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '615800.00', '680000.00', NULL, 3, 3, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(280, 'Delium T Cruiser AT', 'DEL-20570-15-0282', 'DEL-20570-15-0282', 'Delium', 12, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '697800.00', '775000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(281, 'Delium T Cruiser AT', 'DEL-23575-15-0283', 'DEL-23575-15-0283', 'Delium', 12, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '914800.00', '1025000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(282, 'Delium T Mania Extreme', 'DEL-31x10,5-15-0284', 'DEL-31x10,5-15-0284', 'Delium', 12, 1, 31, 105, '15', '31x10,5 R15', '-', 'BARU', '2026', '1334800.00', '1550000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(283, 'Delium Evoraze', 'DEL-19550-16-0285', 'DEL-19550-16-0285', 'Delium', 12, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '608500.00', '680000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(284, 'Delium Evo Techno', 'DEL-19555-16-0286', 'DEL-19555-16-0286', 'Delium', 12, 1, 195, 55, '16', '195/55 R16', '-', 'BARU', '2026', '521500.00', '595000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(285, 'Delium Evo Techno', 'DEL-19560-16-0287', 'DEL-19560-16-0287', 'Delium', 12, 1, 195, 60, '16', '195/60 R16', '-', 'BARU', '2026', '570574.00', '650000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(286, 'Delium Evo Techno', 'DEL-20555-16-0288', 'DEL-20555-16-0288', 'Delium', 12, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '621500.00', '695000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(287, 'Delium Evo Techno', 'DEL-20565-16-0290', 'DEL-20565-16-0290', 'Delium', 12, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2026', '622573.00', '700000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(288, 'Delium Evoraze', 'DEL-20545-17-0291', 'DEL-20545-17-0291', 'Delium', 12, 1, 205, 45, '17', '205/45 R17', '-', 'BARU', '2026', '614500.00', '700000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(289, 'Delium Evoraze', 'DEL-21545-17-0292', 'DEL-21545-17-0292', 'Delium', 12, 1, 215, 45, '17', '215/45 R17', '-', 'BARU', '2026', '662500.00', '770000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(290, 'Sailun', 'SAI-175-13-0293', 'SAI-175-13-0293', 'Sailun', 14, 1, 175, 80, '13', '175 R13', '-', 'BARU', '2024', '400000.00', '620000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(291, 'Achilles Duragrib', 'ACH-175-13-0294', 'ACH-175-13-0294', 'Achilles', 1, 1, 175, 80, '13', '175 R13', '-', 'BARU', '2020', '450000.00', '750000.00', NULL, 3, 3, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(292, 'Sailun', 'SAI-185-14-0295', 'SAI-185-14-0295', 'Sailun', 14, 1, 185, 80, '14', '185 R14', '-', 'BARU', '2024', '530000.00', '735000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(293, 'Achilles ultravan', 'ACH-185-14-0296', 'ACH-185-14-0296', 'Achilles', 1, 1, 185, 80, '14', '185 R14', '-', 'BARU', '2022', '430000.00', '700009.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(294, 'Sailun', 'SAI-195-14-0297', 'SAI-195-14-0297', 'Sailun', 14, 1, 195, 80, '14', '195 R14', '-', 'BARU', '2024', '585000.00', '825000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(295, 'HANKOOK', 'HAN-16565-14-0298', 'HAN-16565-14-0298', 'Hankook', 11, 1, 165, 65, '14', '165/65 R14', '-', 'BARU', '2021', '375000.00', '520000.00', NULL, 8, 8, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(296, 'Goodyear', 'GOO-17565-14-0299', 'GOO-17565-14-0299', 'Goodyear', 13, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '380000.00', '595000.00', NULL, 65, 65, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(297, 'HANKOOK Kinergy Eco', 'HAN-17565-14-0301', 'HAN-17565-14-0301', 'Hankook', 11, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2022', '410000.00', '545000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(298, 'Hankook Kinergy Eco', 'HAN-17565-14-0296', 'HAN-17565-14-0296', 'Hankook', 11, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2022', '410000.00', '545000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(299, 'Achilles 868', 'ACH-18565-14-0302', 'ACH-18565-14-0302', 'Achilles', 1, 1, 185, 65, '14', '185/65 R14', '-', 'BARU', '2026', '400000.00', '475000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(300, 'Goodyear', 'GOO-19570-14-0303', 'GOO-19570-14-0303', 'Goodyear', 13, 1, 195, 70, '14', '195/70 R14', '-', 'BARU', '2024', '550000.00', '635000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(301, 'SWALLOW', 'SWA-750-15-0327', 'SWA-750-15-0327', 'Swallow', 4, 1, 750, 80, '15', '750 R15', '-', 'BARU', '2026', '540000.00', '1340000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(302, 'Achilles ATRK', 'ACH-16550-15-0305', 'ACH-16550-15-0305', 'Achilles', 1, 1, 165, 50, '15', '165/50 R15', '-', 'BARU', '2026', '505000.00', '680000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(303, 'Achilles Economis', 'ACH-18550-15-0306', 'ACH-18550-15-0306', 'Achilles', 1, 1, 185, 50, '15', '185/50 R15', '-', 'BARU', '2026', '506000.00', '760000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(304, 'Achilles ATR', 'ACH-18555-15-0307', 'ACH-18555-15-0307', 'Achilles', 1, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2021', '590000.00', '775000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(305, 'Achilles 122', 'ACH-18560-15-0308', 'ACH-18560-15-0308', 'Achilles', 1, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2026', '461000.00', '720000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(306, 'Achilles ATR', 'ACH-19550-15-0309', 'ACH-19550-15-0309', 'Achilles', 1, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '680000.00', '800000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(307, 'Goodyear', 'GOO-19550-15-0310', 'GOO-19550-15-0310', 'Goodyear', 13, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2026', '350000.00', '415000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(308, 'Achilles ATR', 'ACH-19555-15-0311', 'ACH-19555-15-0311', 'Achilles', 1, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2021', '562000.00', '800000.00', NULL, 3, 3, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(309, 'Goodyear', 'GOO-20565-15-0312', 'GOO-20565-15-0312', 'Goodyear', 13, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2026', '450000.00', '675000.00', NULL, 8, 8, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(310, 'HANKOOK', 'HAN-20565-15-0313', 'HAN-20565-15-0313', 'Hankook', 11, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2023', '450000.00', '600000.00', NULL, 6, 6, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(311, 'Achilles MULTIVAN', 'ACH-20570-15-0314', 'ACH-20570-15-0314', 'Achilles', 1, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '605000.00', '950000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(312, 'Achilles 2233', 'ACH-18555-16-0315', 'ACH-18555-16-0315', 'Achilles', 1, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2020', '552000.00', '750000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(313, 'PIRELLI', 'PIR-19540-16-0316', 'PIR-19540-16-0316', 'Pirelli', 17, 1, 195, 40, '16', '195/40 R16', '-', 'BARU', '2026', '375000.00', '445000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(314, 'HANKOOK', 'HAN-19550-16-0317', 'HAN-19550-16-0317', 'Hankook', 11, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2022', '540000.00', '685000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(315, 'Achilles ATR', 'ACH-20555-16-0318', 'ACH-20555-16-0318', 'Achilles', 1, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2026', '567000.00', '900000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(316, 'Goodyear', 'GOO-20565-16-0319', 'GOO-20565-16-0319', 'Goodyear', 13, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2025', '580000.00', '685000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(317, 'YOKOHAMA GEOLANDAR', 'YOK-27570-16-0320', 'YOK-27570-16-0320', 'Yokohama', 18, 1, 275, 70, '16', '275/70 R16', '-', 'BARU', '2026', '750000.00', '1500000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(318, 'CONTINENTAL', 'CON-26565-17-0321', 'CON-26565-17-0321', 'Continental', 21, 1, 265, 65, '17', '265/65 R17', '-', 'BARU', '2020', '800000.00', '945000.00', NULL, 12, 12, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(319, 'Achilles ATR', 'ACH-22540-18-0322', 'ACH-22540-18-0322', 'Achilles', 1, 1, 225, 40, '18', '225/40 R18', '-', 'BARU', '2026', '890000.00', '1050000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(320, 'CONTINENTAL', 'CON-23555-18-0323', 'CON-23555-18-0323', 'Continental', 21, 1, 235, 55, '18', '235/55 R18', '-', 'BARU', '2026', '650000.00', '765000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(321, 'Achilles UHP', 'ACH-24540-20-0324', 'ACH-24540-20-0324', 'Achilles', 1, 1, 245, 40, '20', '245/40 R20', '-', 'BARU', '2026', '1140000.00', '1285000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(322, 'GT Super 88N (2026)', 'GT-750-15-0325', 'GT-750-15-0325', 'GT', 3, 2, 750, 80, '15', '750 R15', 'Super 88N', 'BARU', '2026', '1172421.00', '1250000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(323, 'Bridgestone SMR', 'BRI-750-15-0326', 'BRI-750-15-0326', 'Bridgestone', 2, 2, 750, 80, '15', '750 R15', '-', 'BARU', '2026', '1250000.00', '1350000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(324, 'Swallow', 'SWA-750-15-0322', 'SWA-750-15-0322', 'Swallow', 4, 2, 750, 80, '15', '750 R15', '-', 'BARU', '2026', '1139000.00', '1340000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(325, 'Swallow HD', 'SWA-750-16-0328', 'SWA-750-16-0328', 'Swallow', 4, 2, 750, 80, '16', '750 R16', '-', 'BARU', '2026', '1400000.00', '1510000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(326, 'Swallow HD', 'SWA-825-16-0329', 'SWA-825-16-0329', 'Swallow', 4, 2, 825, 80, '16', '825 R16', '-', 'BARU', '2022', '1720000.00', '1820000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(327, 'GT Super (GT) HD', 'GT-750-16-0331', 'GT-750-16-0331', 'GT', 3, 2, 750, 80, '16', '750 R16', '-', 'BARU', '2026', '1325000.00', '1575000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(328, 'Gajah Tunggal (GT) HD', 'GT-750-16-0326', 'GT-750-16-0326', 'GT', 3, 2, 750, 80, '16', '750 R16', '-', 'BARU', '2026', '1313500.00', '1545000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(329, 'Aeolus HN267', 'AEO-750-16-0332', 'AEO-750-16-0332', 'Aeolus', 5, 2, 750, 80, '16', '750 R16', '-', 'BARU', '2026', '2000000.00', '2175000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(330, 'Delium Terra Raider AT', 'DEL-26575-16-0289', 'DEL-26575-16-0289', 'Delium', 12, 1, 265, 75, '16', '265/75 R16', '-', 'BARU', '2026', '1610000.00', '1825000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(331, 'Bs T6', 'BRI-18570-14-0009', 'BRI-18570-14-0009', 'Bridgestone', 2, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2026', '676000.00', '795000.00', NULL, 0, 0, 1, 0, 0, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(332, 'Delium Velocita', 'DEL-21555-17-0297', 'DEL-21555-17-0297', 'Delium', 12, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2026', '714574.00', '810000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(333, 'Delium Velocita', 'DEL-23550-18-0298', 'DEL-23550-18-0298', 'Delium', 12, 1, 235, 50, '18', '235/50 R18', '-', 'BARU', '2026', '849874.00', '960000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(334, 'Bs Ecopia', 'BRI-17565-14-0003', 'BRI-17565-14-0003', 'Bridgestone', 2, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2022', '595450.00', '705000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(335, 'Bs Duravis', 'BRI-195-14-0002', 'BRI-195-14-0002', 'Bridgestone', 2, 1, 195, 80, '14', '195 R14', '-', 'BARU', '2025', '983800.00', '1095000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(336, 'Bs Ecopia', 'BRI-17560-15-0002', 'BRI-17560-15-0002', 'Bridgestone', 2, 1, 175, 60, '15', '175/60 R15', '-', 'BARU', '2016', '595000.00', '700000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(337, 'Bs Turanza T005A', 'BRI-18555-15-0004', 'BRI-18555-15-0004', 'Bridgestone', 2, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2019', '583500.00', '800000.00', '1235000.00', 4, 4, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(338, 'Bs Turanza T005A', 'BRI-18555-15-0005', 'BRI-18555-15-0005', 'Bridgestone', 2, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2021', '600000.00', '900000.00', '1235000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(339, 'Bs Ecopia', 'BRI-18560-15-0022', 'BRI-18560-15-0022', 'Bridgestone', 2, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2024', '530000.00', '880000.00', '985000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(340, 'Bridgestone Techno (2025)', 'BRI-18565-15-0025', 'BRI-18565-15-0025', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2025', '638350.00', '735000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(341, 'Bs Turanza', 'BRI-19555-15-0028', 'BRI-19555-15-0028', 'Bridgestone', 2, 1, 195, 55, '15', '195/55 R15', '-', 'BARU', '2018', '550000.00', '850000.00', '1240000.00', 4, 4, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(342, 'Bs Techno', 'BRI-19560-15-0031', 'BRI-19560-15-0031', 'Bridgestone', 2, 1, 195, 60, '15', '195/60 R15', '-', 'BARU', '2024', '688500.00', '810000.00', NULL, 0, 0, 1, 0, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(343, 'Bs Ecopia', 'BRI-20565-15-0035', 'BRI-20565-15-0035', 'Bridgestone', 2, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2024', '889000.00', '895000.00', '930000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(344, 'Bs D-HT 687', 'BRI-20570-15-0039', 'BRI-20570-15-0039', 'Bridgestone', 2, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '1250600.00', '1390000.00', '1360000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(345, 'Bs Turanza T005', 'BRI-21565-15-0041', 'BRI-21565-15-0041', 'Bridgestone', 2, 1, 215, 65, '15', '215/65 R15', '-', 'BARU', '2018', '722500.00', '850000.00', '1325000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(346, 'Bs Dueler HT D689', 'BRI-23575-15-0045', 'BRI-23575-15-0045', 'Bridgestone', 2, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2023', '1110550.00', '1135000.00', '1300000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(347, 'Bs Dueler AT D697', 'BRI-23575-15-0046', 'BRI-23575-15-0046', 'Bridgestone', 2, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '750000.00', '1345000.00', '1345000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(348, 'Bs Ecopia', 'BRI-20555-16-0057', 'BRI-20555-16-0057', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2021', '1090250.00', '1125000.00', '1230000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(349, 'Bs Ecopia', 'BRI-20555-16-0058', 'BRI-20555-16-0058', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2013', '200000.00', '650000.00', '1230000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(350, 'Bs Techno', 'BRI-20555-16-0060', 'BRI-20555-16-0060', 'Bridgestone', 2, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2022', '660000.00', '800000.00', '995000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(351, 'Bs Turanza AR20', 'BRI-20560-16-0061', 'BRI-20560-16-0061', 'Bridgestone', 2, 1, 205, 60, '16', '205/60 R16', '-', 'BARU', '2018', '458333.00', '540000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(352, 'Bs Dueler HT D689', 'BRI-21565-16-0065', 'BRI-21565-16-0065', 'Bridgestone', 2, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2018', '539460.00', '850000.00', '1310000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(353, 'Bs Dueler HT D687', 'BRI-23560-16-0068', 'BRI-23560-16-0068', 'Bridgestone', 2, 1, 235, 60, '16', '235/60 R16', '-', 'BARU', '2022', '1406300.00', '1450000.00', '1705000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(354, 'Bs Dueler HT', 'BRI-26570-16-0071', 'BRI-26570-16-0071', 'Bridgestone', 2, 1, 265, 70, '16', '265/70 R16', '-', 'BARU', '2020', '700000.00', '1400000.00', '1920000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(355, 'Bs Turanza ER33', 'BRI-21555-17-0074', 'BRI-21555-17-0074', 'Bridgestone', 2, 1, 215, 55, '17', '215/55 R17', '-', 'BARU', '2022', '1000000.00', '1500000.00', '1775000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(356, 'Bs Alenza AL01 T', 'BRI-21560-17-0077', 'BRI-21560-17-0077', 'Bridgestone', 2, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2024', '1250050.00', '1395000.00', NULL, 0, 0, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(357, 'Bs Alenza AL01 T', 'BRI-21560-17-0078', 'BRI-21560-17-0078', 'Bridgestone', 2, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2023', '1235000.00', '1450000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(358, 'Bs Dueler HT D687', 'BRI-21560-17-0080', 'BRI-21560-17-0080', 'Bridgestone', 2, 1, 215, 60, '17', '215/60 R17', '-', 'BARU', '2018', '487500.00', '1000000.00', '1325000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(359, 'Bs Dueler HT copotan', 'BRI-25565-17-0083', 'BRI-25565-17-0083', 'Bridgestone', 2, 1, 255, 65, '17', '255/65 R17', '-', 'BARU', '2026', '595000.00', '1250000.00', NULL, 8, 8, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(360, 'Bs Dueler AT D697', 'BRI-26570-17-0086', 'BRI-26570-17-0086', 'Bridgestone', 2, 1, 265, 70, '17', '265/70 R17', '-', 'BARU', '2020', '740000.00', '1600000.00', '1955000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(361, 'Bs Dueler AT D697', 'BRI-26570-17-0087', 'BRI-26570-17-0087', 'Bridgestone', 2, 1, 265, 70, '17', '265/70 R17', '-', 'BARU', '2016', '691000.00', '1200000.00', '1955000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(362, 'Dunlop Touring R1', 'DUN-17565-14-0096', 'DUN-17565-14-0096', 'Dunlop', 8, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2023', '415000.00', '500000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(363, 'Dunlop Enasave', 'DUN-18570-14-0100', 'DUN-18570-14-0100', 'Dunlop', 8, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2024', '435000.00', '575000.00', '645000.00', 12, 12, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(364, 'Dunlop SP31', 'DUN-17560-15-0106', 'DUN-17560-15-0106', 'Dunlop', 8, 1, 175, 60, '15', '175/60 R15', '-', 'BARU', '2017', '446500.00', '525000.00', '725000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:02:00', NULL),
(365, 'Dunlop Enasave', 'DUN-18555-15-0108', 'DUN-18555-15-0108', 'Dunlop', 8, 1, 185, 55, '15', '185/55 R15', '-', 'BARU', '2022', '650000.00', '670000.00', '74000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(366, 'Dunlop Enasave', 'DUN-18565-15-0113', 'DUN-18565-15-0113', 'Dunlop', 8, 1, 185, 65, '15', '185/65 R15', '-', 'BARU', '2024', '515000.00', '675000.00', NULL, 11, 11, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(367, 'Dunlop Touring R1', 'DUN-20565-15-0119', 'DUN-20565-15-0119', 'Dunlop', 8, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2025', '720000.00', '725000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(368, 'Dunlop Enasave', 'DUN-20555-16-0126', 'DUN-20555-16-0126', 'Dunlop', 8, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2025', '1000000.00', '1120000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(369, 'Dunlop Enasave', 'DUN-20565-16-0130', 'DUN-20565-16-0130', 'Dunlop', 8, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2024', '640000.00', '780000.00', '840000.00', 19, 19, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(370, 'Dunlop Enasave', 'DUN-20565-16-0131', 'DUN-20565-16-0131', 'Dunlop', 8, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2023', '640000.00', '785000.00', '840000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(371, 'GT Super', 'GT-500-12-0148', 'GT-500-12-0148', 'GT', 3, 1, 500, 80, '12', '500 R12', '-', 'BARU', '2026', '354500.00', '405000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(372, 'GT Champiro Ecotec', 'GT-16565-13-0154', 'GT-16565-13-0154', 'GT', 3, 1, 165, 65, '13', '165/65 R13', '-', 'BARU', '2025', '415400.00', '465000.00', '495000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(373, 'GT Super', 'GT-700-14-0158', 'GT-700-14-0158', 'GT', 3, 1, 700, 80, '14', '700 R14', '-', 'BARU', '2026', '597000.00', '685000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(374, 'GT Champiro Ecotec', 'GT-18570-14-0163', 'GT-18570-14-0163', 'GT', 3, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2025', '516460.00', '550000.00', '595000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(375, 'GT Savero Komodo MT', 'GT-278,5-14-0166', 'GT-278,5-14-0166', 'GT', 3, 1, 27, 85, '14', '27/8,5 R14', '-', 'BARU', '2025', '864579.00', '1025000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(376, 'GT Champiro Ecotec', 'GT-18560-15-0169', 'GT-18560-15-0169', 'GT', 3, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2025', '626200.00', '700000.00', '725000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(377, 'GT Champiro Ecotec', 'GT-20565-15-0180', 'GT-20565-15-0180', 'GT', 3, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2025', '645200.00', '705000.00', '755000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(378, 'GT Savero AT Pro', 'GT-20570-15-0181', 'GT-20570-15-0181', 'GT', 3, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2026', '706800.00', '925000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(379, 'GT Savero AT Pro', 'GT-20570-15-0182', 'GT-20570-15-0182', 'GT', 3, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2025', '786160.00', '860000.00', '925000.00', 5, 5, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(380, 'GT Savero AT', 'GT-20570-15-0183', 'GT-20570-15-0183', 'GT', 3, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2016', '388889.00', '460000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(381, 'GT Savero Komodo MT', 'GT-278.5-15-0188', 'GT-278.5-15-0188', 'GT', 3, 1, 27, 85, '15', '27/8.5 R15', '-', 'BARU', '2026', '600000.00', '710000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(382, 'GT Savero AT Plus', 'GT-309.5-15-0189', 'GT-309.5-15-0189', 'GT', 3, 1, 30, 95, '15', '30/9.5 R15', '-', 'BARU', '2017', '600000.00', '710000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23', NULL),
(383, 'GT Savero Komex', 'GT-3110.5-15-0193', 'GT-3110.5-15-0193', 'GT', 3, 1, 31, 105, '15', '31/10.5 R15', '-', 'BARU', '2024', '1382000.00', '1500000.00', '1550000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(384, 'GT Savero MT', 'GT-3110.5-15-0194', 'GT-3110.5-15-0194', 'GT', 3, 1, 31, 105, '15', '31/10.5 R15', '-', 'BARU', '2026', '1281075.00', '1525000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(385, 'GT GTX Pro', 'GT-18555-16-0199', 'GT-18555-16-0199', 'GT', 3, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2026', '662160.00', '745000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54', NULL),
(386, 'GT GTX Pro', 'GT-19550-16-0201', 'GT-19550-16-0201', 'GT', 3, 1, 195, 50, '16', '195/50 R16', '-', 'BARU', '2026', '633020.00', '780000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(387, 'GT GTX Pro', 'GT-19555-16-0203', 'GT-19555-16-0203', 'GT', 3, 1, 195, 55, '16', '195/55 R16', '-', 'BARU', '2026', '661600.00', '760000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(388, 'GT Savero AT', 'GT-24570-16-0213', 'GT-24570-16-0213', 'GT', 3, 1, 245, 70, '16', '245/70 R16', '-', 'BARU', '2019', '450000.00', '530000.00', NULL, 4, 4, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(389, 'GT Savero MT', 'GT-26575-16-0214', 'GT-26575-16-0214', 'GT', 3, 1, 265, 75, '16', '265/75 R16', '-', 'BARU', '2019', '700000.00', '1575000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(390, 'GT Savero SUV', 'GT-26565-17-0221', 'GT-26565-17-0221', 'GT', 3, 1, 265, 65, '17', '265/65 R17', '-', 'BARU', '2024', '1074600.00', '1250000.00', '1290000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(391, 'GT Savero SUV', 'GT-26560-18-0225', 'GT-26560-18-0225', 'GT', 3, 1, 265, 60, '18', '265/60 R18', '-', 'BARU', '2026', '400000.00', '475000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(392, 'Acc Ecoplush', 'ACC-18570-14-0232', 'ACC-18570-14-0232', 'Accelera', 9, 1, 185, 70, '14', '185/70 R14', '-', 'BARU', '2025', '445000.00', '500000.00', NULL, 20, 20, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(393, 'Forceum EXP Sport. Semislick', 'FOR-19550-15-0240', 'FOR-19550-15-0240', 'Forceum', 10, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2024', '670076.00', '725000.00', NULL, 3, 3, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(394, 'Acc MT 01', 'ACC-23575-15-0247', 'ACC-23575-15-0247', 'Accelera', 9, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2026', '1003640.00', '1100000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(395, 'Forceum AT', 'FOR-23575-15-0248', 'FOR-23575-15-0248', 'Forceum', 10, 1, 235, 75, '15', '235/75 R15', '-', 'BARU', '2023', '866402.00', '980000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(396, 'Acc MT 01', 'ACC-3110,5-15-0251', 'ACC-3110,5-15-0251', 'Accelera', 9, 1, 31, 105, '15', '31/10,5 R15', '-', 'BARU', '2023', '1139083.00', '1275000.00', NULL, 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(397, 'Acc PHI-R', 'ACC-18555-16-0253', 'ACC-18555-16-0253', 'Accelera', 9, 1, 185, 55, '16', '185/55 R16', '-', 'BARU', '2022', '568440.00', '585000.00', '655000.00', 1, 1, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(398, 'Acc Ecoplush', 'ACC-21565-16-0265', 'ACC-21565-16-0265', 'Accelera', 9, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2025', '674000.00', '735000.00', '765000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(399, 'Acc IOTA EVT', 'ACC-20555-17-0270', 'ACC-20555-17-0270', 'Accelera', 9, 1, 205, 55, '17', '205/55 R17', '-', 'BARU', '2025', '772800.00', '840000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(400, 'Acc IOTA EVT', 'ACC-21545-17-0272', 'ACC-21545-17-0272', 'Accelera', 9, 1, 215, 45, '17', '215/45 R17', '-', 'BARU', '2026', '719680.00', '770000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(401, 'Acc PHI', 'ACC-23535-20-0288', 'ACC-23535-20-0288', 'Accelera', 9, 1, 235, 35, '20', '235/35 R20', '-', 'BARU', '2023', '1140000.00', '1300000.00', NULL, 0, 0, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(402, 'Acc Omikron AT', 'ACC-26550-20-0290', 'ACC-26550-20-0290', 'Accelera', 9, 1, 265, 50, '20', '265/50 R20', '-', 'BARU', '2018', '1160600.00', '1550000.00', '1955000.00', 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(403, 'Acc IOTA', 'ACC-28550-20-0292', 'ACC-28550-20-0292', 'Accelera', 9, 1, 285, 50, '20', '285/50 R20', '-', 'BARU', '2015', '1450000.00', '1640000.00', NULL, 4, 4, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(404, 'HANKOOK', 'HAN-17565-14-0294', 'HAN-17565-14-0294', 'Hankook', 11, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '380000.00', '545000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(405, 'Delium Evo Techno', 'DEL-20565-15-0318', 'DEL-20565-15-0318', 'Delium', 12, 1, 205, 65, '15', '205/65 R15', '-', 'BARU', '2022', '509220.00', '600000.00', NULL, 2, 1, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-11-19 09:00:00', NULL),
(406, 'Goodyear', 'GOO-17565-14-0338', 'GOO-17565-14-0338', 'Goodyear', 13, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2025', '380000.00', '520000.00', NULL, 2, 2, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(407, 'Laufen', 'LAU-17565-14-0339', 'LAU-17565-14-0339', 'Laufenn', 29, 1, 175, 65, '14', '175/65 R14', '-', 'BARU', '2026', '380000.00', '450000.00', NULL, 51, 45, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-11-20 08:00:00', NULL),
(408, 'Achilles 868', 'ACH-18565-14-0340', 'ACH-18565-14-0340', 'Achilles', 1, 1, 185, 65, '14', '185/65 R14', '-', 'BARU', '2018', '400000.00', '475000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(409, 'Achilles ATRK', 'ACH-16550-15-0343', 'ACH-16550-15-0343', 'Achilles', 1, 1, 165, 50, '15', '165/50 R15', '-', 'BARU', '2019', '505000.00', '680000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(410, 'Achilles Economis', 'ACH-18550-15-0344', 'ACH-18550-15-0344', 'Achilles', 1, 1, 185, 50, '15', '185/50 R15', '-', 'BARU', '2019', '506000.00', '760000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(411, 'Achilles 122', 'ACH-18560-15-0346', 'ACH-18560-15-0346', 'Achilles', 1, 1, 185, 60, '15', '185/60 R15', '-', 'BARU', '2019', '461000.00', '720000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(412, 'Achilles ATR', 'ACH-19550-15-0347', 'ACH-19550-15-0347', 'Achilles', 1, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2018', '680000.00', '800000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(413, 'Goodyear', 'GOO-19550-15-0348', 'GOO-19550-15-0348', 'Goodyear', 13, 1, 195, 50, '15', '195/50 R15', '-', 'BARU', '2018', '350000.00', '415000.00', NULL, 6, 6, 1, 1, 1, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(414, 'Achilles MULTIVAN', 'ACH-20570-15-0351', 'ACH-20570-15-0351', 'Achilles', 1, 1, 205, 70, '15', '205/70 R15', '-', 'BARU', '2019', '605000.00', '950000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(415, 'Achilles ATR', 'ACH-20555-16-0354', 'ACH-20555-16-0354', 'Achilles', 1, 1, 205, 55, '16', '205/55 R16', '-', 'BARU', '2019', '567000.00', '900000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(416, 'Achilles ATR', 'ACH-22540-18-0358', 'ACH-22540-18-0358', 'Achilles', 1, 1, 225, 40, '18', '225/40 R18', '-', 'BARU', '2018', '890000.00', '1050000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(417, 'CONTINENTAL', 'CON-23555-18-0359', 'CON-23555-18-0359', 'Continental', 21, 1, 235, 55, '18', '235/55 R18', '-', 'BARU', '2019', '650000.00', '765000.00', NULL, 5, 5, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23', NULL),
(418, 'Achilles UHP', 'ACH-24540-20-0360', 'ACH-24540-20-0360', 'Achilles', 1, 1, 245, 40, '20', '245/40 R20', '-', 'BARU', '2018', '1140000.00', '1285000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(419, 'GT Super', 'GT-750-15-0361', 'GT-750-15-0361', 'GT', 3, 2, 750, 80, '15', '750 R15', '-', 'BARU', '2026', '1194500.00', '1250000.00', NULL, 2, 2, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(420, 'GT Super (GT)', 'GT-750-16-0365', 'GT-750-16-0365', 'GT', 3, 2, 750, 80, '16', '750 R16', '-', 'BARU', '2026', '1482000.00', '1575000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(421, 'Bs T6', 'BRI-21565-16-0327', 'BRI-21565-16-0327', 'Bridgestone', 2, 1, 215, 65, '16', '215/65 R16', '-', 'BARU', '2026', '1403950.00', '1505000.00', NULL, 4, 4, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(422, 'Acc IOTA EVT', 'ACC-19545-16-0366', 'ACC-19545-16-0366', 'Accelera', 9, 1, 195, 45, '16', '195/45 R16', '-', 'BARU', '2026', '663600.00', '720000.00', NULL, 1, 1, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL),
(423, 'GT Champiro Eco', 'GT-18565-14-0367', 'GT-18565-14-0367', 'GT', 3, 1, 185, 65, '14', '185/65 R14', '-', 'BARU', '2026', '541260.00', '615000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL);
INSERT INTO `products` (`id`, `product_name`, `product_code`, `barcode`, `brand`, `brand_id`, `category_id`, `size_width`, `size_ratio`, `ring`, `product_size`, `motif`, `condition_code`, `product_year`, `product_cost`, `product_price`, `reference_price`, `product_quantity`, `stok_awal`, `product_stock_alert`, `is_active`, `is_old_stock`, `branch_id`, `created_at`, `updated_at`, `deleted_at`) VALUES
(424, 'Michelin Primacy 5', 'MIC-20565-16-0368', 'MIC-20565-16-0368', 'Michelin', 31, 1, 205, 65, '16', '205/65 R16', '-', 'BARU', '2026', '1494491.00', '1675000.00', NULL, 0, 0, 1, 1, 0, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55', NULL);

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
(1, 1, NULL, 'OB3-OPEN-BAN-BS-185-65-R15', 'PT Bridgestone Tire Indonesia', '2026-10-05', '720000.00', 24, 22, 3, '2026-10-05 08:32:51', '2026-11-23 02:15:00'),
(2, 2, NULL, 'OB3-OPEN-BAN-ACC-195-50-R16', 'PT Elangperdana Tyre Industry (Accelera)', '2026-10-05', '580000.00', 18, 16, 3, '2026-10-05 08:32:51', '2026-11-23 03:05:00'),
(3, 3, NULL, 'OB3-OPEN-3-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '740000.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(4, 3, NULL, 'OB3-OPEN-3-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '725000.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(5, 4, NULL, 'OB3-OPEN-4-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '537550.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(6, 5, NULL, 'OB3-OPEN-5-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '760000.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(7, 6, NULL, 'OB3-OPEN-6-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '635100.00', 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(8, 7, NULL, 'OB3-OPEN-7-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '539550.00', 4, 0, 3, '2026-10-05 08:32:51', '2026-11-22 03:30:00'),
(9, 7, NULL, 'OB3-OPEN-7-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '589550.00', 6, 4, 3, '2026-10-05 08:32:51', '2026-11-22 03:30:00'),
(10, 8, NULL, 'OB3-OPEN-8-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '850000.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(11, 8, NULL, 'OB3-OPEN-8-02', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '850000.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(12, 9, NULL, 'OB3-OPEN-9-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '652400.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(13, 10, NULL, 'OB3-OPEN-10-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '657850.00', 13, 13, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(14, 11, NULL, 'OB3-OPEN-11-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '588300.00', 6, 4, 3, '2026-10-05 08:32:51', '2026-11-23 04:45:00'),
(15, 12, NULL, 'OB3-OPEN-12-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '600000.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(16, 13, NULL, 'OB3-OPEN-13-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '681200.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(17, 14, NULL, 'OB3-OPEN-14-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1028950.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(18, 15, NULL, 'OB3-OPEN-15-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '787150.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(19, 18, NULL, 'OB3-OPEN-18-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '635000.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(20, 19, NULL, 'OB3-OPEN-19-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '729950.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(21, 20, NULL, 'OB3-OPEN-20-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '882250.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(22, 21, NULL, 'OB3-OPEN-21-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '767300.00', 6, 4, 3, '2026-10-05 08:32:51', '2026-11-21 03:15:00'),
(23, 21, NULL, 'OB3-OPEN-21-02', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '787700.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(24, 22, NULL, 'OB3-OPEN-22-01', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '679950.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(25, 23, NULL, 'OB3-OPEN-23-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '771429.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(26, 24, NULL, 'OB3-OPEN-24-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '900000.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(27, 26, NULL, 'OB3-OPEN-26-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700000.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(28, 27, NULL, 'OB3-OPEN-27-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '713050.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(29, 27, NULL, 'OB3-OPEN-27-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '737750.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(30, 28, NULL, 'OB3-OPEN-28-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '835150.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(31, 28, NULL, 'OB3-OPEN-28-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '864400.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(32, 29, NULL, 'OB3-OPEN-29-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1003600.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(33, 30, NULL, 'OB3-OPEN-30-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '862200.00', 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(34, 31, NULL, 'OB3-OPEN-31-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1163500.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(35, 31, NULL, 'OB3-OPEN-31-02', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '1168900.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(36, 32, NULL, 'OB3-OPEN-32-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '823650.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(37, 32, NULL, 'OB3-OPEN-32-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '840450.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(38, 32, NULL, 'OB3-OPEN-32-03', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '869700.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(39, 35, NULL, 'OB3-OPEN-35-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650000.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(40, 36, NULL, 'OB3-OPEN-36-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1348750.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(41, 37, NULL, 'OB3-OPEN-37-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '775000.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(42, 38, NULL, 'OB3-OPEN-38-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1148550.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(43, 40, NULL, 'OB3-OPEN-40-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '800000.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(44, 40, NULL, 'OB3-OPEN-40-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1310400.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(45, 41, NULL, 'OB3-OPEN-41-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '829400.00', 6, 6, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(46, 42, NULL, 'OB3-OPEN-42-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1167650.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(47, 43, NULL, 'OB3-OPEN-43-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '824850.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(48, 44, NULL, 'OB3-OPEN-44-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1172750.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(49, 45, NULL, 'OB3-OPEN-45-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '875550.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(50, 46, NULL, 'OB3-OPEN-46-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1052350.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(51, 47, NULL, 'OB3-OPEN-47-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700000.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(52, 49, NULL, 'OB3-OPEN-49-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1129750.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(53, 50, NULL, 'OB3-OPEN-50-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '890500.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(54, 50, NULL, 'OB3-OPEN-50-02', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '944450.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(55, 52, NULL, 'OB3-OPEN-52-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '959000.00', 9, 9, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(56, 53, NULL, 'OB3-OPEN-53-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '500000.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(57, 55, NULL, 'OB3-OPEN-55-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1401400.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(58, 56, NULL, 'OB3-OPEN-56-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1511600.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(59, 57, NULL, 'OB3-OPEN-57-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1000000.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(60, 57, NULL, 'OB3-OPEN-57-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700000.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(61, 58, NULL, 'OB3-OPEN-58-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '900000.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(62, 60, NULL, 'OB3-OPEN-60-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '935000.00', 2, 0, 3, '2026-10-05 08:32:51', '2026-11-23 03:35:00'),
(63, 62, NULL, 'OB3-OPEN-62-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1285800.00', 8, 8, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(64, 63, NULL, 'OB3-OPEN-63-01', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '1303950.00', 5, 5, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(65, 64, NULL, 'OB3-OPEN-64-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1256450.00', 2, 2, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(66, 66, NULL, 'OB3-OPEN-66-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1210300.00', 1, 1, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(67, 66, NULL, 'OB3-OPEN-66-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1253000.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(68, 68, NULL, 'OB3-OPEN-68-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1632000.00', 4, 4, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(69, 69, NULL, 'OB3-OPEN-69-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1000000.00', 3, 3, 3, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(70, 73, NULL, 'OB3-OPEN-73-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1444750.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(71, 73, NULL, 'OB3-OPEN-73-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1495050.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(72, 74, NULL, 'OB3-OPEN-74-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1615450.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(73, 74, NULL, 'OB3-OPEN-74-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1675350.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(74, 75, NULL, 'OB3-OPEN-75-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '2012300.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(75, 75, NULL, 'OB3-OPEN-75-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '2037300.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(76, 76, NULL, 'OB3-OPEN-76-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '585000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(77, 76, NULL, 'OB3-OPEN-76-02', 'Sumber Berkah (KRM-20260915-01)', '2026-09-15', '600000.00', 10, 10, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(78, 77, NULL, 'OB3-OPEN-77-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '610000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(79, 78, NULL, 'OB3-OPEN-78-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '545000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(80, 78, NULL, 'OB3-OPEN-78-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '540000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(81, 78, NULL, 'OB3-OPEN-78-03', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '525000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(82, 79, NULL, 'OB3-OPEN-79-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '515000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(83, 79, NULL, 'OB3-OPEN-79-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '520000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(84, 79, NULL, 'OB3-OPEN-79-03', 'Grazia Ban (KRM-20260914-05)', '2026-09-14', '545000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(85, 80, NULL, 'OB3-OPEN-80-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '735000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(86, 80, NULL, 'OB3-OPEN-80-02', 'Sumber Harapan (KRM-20260908-SH)', '2026-09-08', '745000.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(87, 81, NULL, 'OB3-OPEN-81-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '585000.00', 7, 7, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(88, 81, NULL, 'OB3-OPEN-81-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '575000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(89, 83, NULL, 'OB3-OPEN-83-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '525000.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(90, 84, NULL, 'OB3-OPEN-84-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '576180.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(91, 85, NULL, 'OB3-OPEN-85-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '872190.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(92, 86, NULL, 'OB3-OPEN-86-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '577170.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(93, 86, NULL, 'OB3-OPEN-86-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '590000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(94, 86, NULL, 'OB3-OPEN-86-03', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '560340.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(95, 87, NULL, 'OB3-OPEN-87-01', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '520000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(96, 89, NULL, 'OB3-OPEN-89-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '685000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(97, 89, NULL, 'OB3-OPEN-89-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '685000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(98, 90, NULL, 'OB3-OPEN-90-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 8, 8, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(99, 91, NULL, 'OB3-OPEN-91-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '565000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(100, 92, NULL, 'OB3-OPEN-92-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '615000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(101, 92, NULL, 'OB3-OPEN-92-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '645000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(102, 92, NULL, 'OB3-OPEN-92-03', 'Grazia Ban (KRM-20260914-05)', '2026-09-14', '645000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(103, 93, NULL, 'OB3-OPEN-93-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '675000.00', 11, 11, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(104, 93, NULL, 'OB3-OPEN-93-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '678150.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(105, 95, NULL, 'OB3-OPEN-95-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '590000.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(106, 97, NULL, 'OB3-OPEN-97-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '818730.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(107, 98, NULL, 'OB3-OPEN-98-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '705870.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(108, 98, NULL, 'OB3-OPEN-98-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '730000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(109, 99, NULL, 'OB3-OPEN-99-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '800000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(110, 99, NULL, 'OB3-OPEN-99-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '840000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(111, 99, NULL, 'OB3-OPEN-99-03', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '830000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(112, 99, NULL, 'OB3-OPEN-99-04', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(113, 101, NULL, 'OB3-OPEN-101-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(114, 102, NULL, 'OB3-OPEN-102-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(115, 103, NULL, 'OB3-OPEN-103-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '865000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(116, 103, NULL, 'OB3-OPEN-103-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '865000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(117, 104, NULL, 'OB3-OPEN-104-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1000000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(118, 104, NULL, 'OB3-OPEN-104-02', 'Sumber Harapan (KRM-20260908-SH)', '2026-09-08', '1020000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(119, 105, NULL, 'OB3-OPEN-105-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '500000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(120, 106, NULL, 'OB3-OPEN-106-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '691020.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(121, 106, NULL, 'OB3-OPEN-106-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '705000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(122, 107, NULL, 'OB3-OPEN-107-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '796950.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(123, 107, NULL, 'OB3-OPEN-107-02', 'Sumber Harapan (KRM-20260908-SH)', '2026-09-08', '810000.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(124, 108, NULL, 'OB3-OPEN-108-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '360000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(125, 109, NULL, 'OB3-OPEN-109-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '800000.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(126, 110, NULL, 'OB3-OPEN-110-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '955000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(127, 110, NULL, 'OB3-OPEN-110-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '955000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(128, 111, NULL, 'OB3-OPEN-111-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '850000.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(129, 112, NULL, 'OB3-OPEN-112-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1185000.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(130, 114, NULL, 'OB3-OPEN-114-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1024650.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(131, 114, NULL, 'OB3-OPEN-114-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '800000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(132, 115, NULL, 'OB3-OPEN-115-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1330000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(133, 115, NULL, 'OB3-OPEN-115-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1000000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(134, 116, NULL, 'OB3-OPEN-116-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1075000.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(135, 117, NULL, 'OB3-OPEN-117-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '890000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(136, 117, NULL, 'OB3-OPEN-117-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '940000.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(137, 118, NULL, 'OB3-OPEN-118-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '925000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(138, 118, NULL, 'OB3-OPEN-118-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '940500.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(139, 119, NULL, 'OB3-OPEN-119-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1620000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(140, 119, NULL, 'OB3-OPEN-119-02', 'Grazia Ban (KRM-20260910-01)', '2026-09-10', '1625000.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(141, 120, NULL, 'OB3-OPEN-120-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1204830.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(142, 121, NULL, 'OB3-OPEN-121-01', 'Grazia Ban (KRM-20260914-05)', '2026-09-14', '1800000.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(143, 122, NULL, 'OB3-OPEN-122-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '469980.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(144, 123, NULL, 'OB3-OPEN-123-01', 'Sumber Harapan (KRM-20260914-01)', '2026-09-14', '391220.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(145, 125, NULL, 'OB3-OPEN-125-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '464000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(146, 127, NULL, 'OB3-OPEN-127-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '403620.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(147, 128, NULL, 'OB3-OPEN-128-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '398100.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(148, 128, NULL, 'OB3-OPEN-128-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '275000.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(149, 129, NULL, 'OB3-OPEN-129-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '562590.00', 9, 9, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(150, 130, NULL, 'OB3-OPEN-130-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '427800.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(151, 131, NULL, 'OB3-OPEN-131-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '440800.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(152, 131, NULL, 'OB3-OPEN-131-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '459420.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(153, 131, NULL, 'OB3-OPEN-131-03', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '473060.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(154, 132, NULL, 'OB3-OPEN-132-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '612360.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(155, 132, NULL, 'OB3-OPEN-132-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '615900.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(156, 133, NULL, 'OB3-OPEN-133-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '451400.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(157, 135, NULL, 'OB3-OPEN-135-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650074.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(158, 135, NULL, 'OB3-OPEN-135-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '669800.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(159, 136, NULL, 'OB3-OPEN-136-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '482400.00', 7, 7, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(160, 136, NULL, 'OB3-OPEN-136-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '475000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(161, 136, NULL, 'OB3-OPEN-136-03', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '496620.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(162, 137, NULL, 'OB3-OPEN-137-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '720720.00', 6, 6, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(163, 138, NULL, 'OB3-OPEN-138-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '531960.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(164, 138, NULL, 'OB3-OPEN-138-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '548080.00', 8, 8, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(165, 139, NULL, 'OB3-OPEN-139-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '803520.00', 1, 1, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(166, 140, NULL, 'OB3-OPEN-140-01', 'Sumber Harapan (KRM-20260914-01)', '2026-09-14', '568000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(167, 142, NULL, 'OB3-OPEN-142-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '595900.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(168, 142, NULL, 'OB3-OPEN-142-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '613800.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(169, 143, NULL, 'OB3-OPEN-143-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '626200.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(170, 143, NULL, 'OB3-OPEN-143-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '644800.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(171, 144, NULL, 'OB3-OPEN-144-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '600200.00', 7, 7, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(172, 144, NULL, 'OB3-OPEN-144-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '618140.00', 8, 8, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(173, 145, NULL, 'OB3-OPEN-145-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '400000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(174, 146, NULL, 'OB3-OPEN-146-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '880740.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(175, 147, NULL, 'OB3-OPEN-147-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '692200.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(176, 148, NULL, 'OB3-OPEN-148-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '654800.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(177, 149, NULL, 'OB3-OPEN-149-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '677000.00', 2, 2, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(178, 150, NULL, 'OB3-OPEN-150-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '651620.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(179, 151, NULL, 'OB3-OPEN-151-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '597680.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(180, 152, NULL, 'OB3-OPEN-152-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '636740.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(181, 153, NULL, 'OB3-OPEN-153-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '655960.00', 3, 3, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(182, 153, NULL, 'OB3-OPEN-153-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650200.00', 4, 4, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(183, 156, NULL, 'OB3-OPEN-156-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '706800.00', 5, 5, 3, '2026-10-05 08:32:52', '2026-10-05 08:32:52'),
(184, 157, NULL, 'OB3-OPEN-157-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '980840.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(185, 158, NULL, 'OB3-OPEN-158-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1098100.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(186, 159, NULL, 'OB3-OPEN-159-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '964100.00', 3, 3, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(187, 159, NULL, 'OB3-OPEN-159-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '993240.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(188, 162, NULL, 'OB3-OPEN-162-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1130900.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(189, 162, NULL, 'OB3-OPEN-162-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1164980.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(190, 163, NULL, 'OB3-OPEN-163-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1155000.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(191, 164, NULL, 'OB3-OPEN-164-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1382000.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(192, 165, NULL, 'OB3-OPEN-165-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1359040.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(193, 167, NULL, 'OB3-OPEN-167-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1354700.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(194, 169, NULL, 'OB3-OPEN-169-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1649200.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(195, 169, NULL, 'OB3-OPEN-169-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1698800.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(196, 170, NULL, 'OB3-OPEN-170-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '682000.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(197, 171, NULL, 'OB3-OPEN-171-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '715480.00', 6, 6, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(198, 172, NULL, 'OB3-OPEN-172-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '675180.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(199, 173, NULL, 'OB3-OPEN-173-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '727880.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(200, 173, NULL, 'OB3-OPEN-173-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '727900.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(201, 174, NULL, 'OB3-OPEN-174-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '763220.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(202, 174, NULL, 'OB3-OPEN-174-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '786200.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(203, 175, NULL, 'OB3-OPEN-175-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '725400.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(204, 175, NULL, 'OB3-OPEN-175-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '761980.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(205, 176, NULL, 'OB3-OPEN-176-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '771280.00', 3, 3, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(206, 176, NULL, 'OB3-OPEN-176-02', 'Sumber Harapan (KRM-20260914-01)', '2026-09-14', '771280.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(207, 177, NULL, 'OB3-OPEN-177-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1202040.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(208, 178, NULL, 'OB3-OPEN-178-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '847540.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(209, 179, NULL, 'OB3-OPEN-179-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1166000.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(210, 180, NULL, 'OB3-OPEN-180-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '600000.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(211, 183, NULL, 'OB3-OPEN-183-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700600.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(212, 184, NULL, 'OB3-OPEN-184-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '801100.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(213, 185, NULL, 'OB3-OPEN-185-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '758900.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(214, 186, NULL, 'OB3-OPEN-186-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '795500.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(215, 186, NULL, 'OB3-OPEN-186-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '819020.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(216, 187, NULL, 'OB3-OPEN-187-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '813000.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(217, 187, NULL, 'OB3-OPEN-187-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '824600.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(218, 188, NULL, 'OB3-OPEN-188-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1155100.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(219, 189, NULL, 'OB3-OPEN-189-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '945500.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(220, 190, NULL, 'OB3-OPEN-190-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '951100.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(221, 191, NULL, 'OB3-OPEN-191-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1150100.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(222, 193, NULL, 'OB3-OPEN-193-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '372017.00', 6, 6, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(223, 195, NULL, 'OB3-OPEN-195-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '401192.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(224, 195, NULL, 'OB3-OPEN-195-02', 'UJI-CLAUDE (KRM-20260922-01)', '2026-09-22', '400000.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(225, 196, NULL, 'OB3-OPEN-196-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '443872.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(226, 197, NULL, 'OB3-OPEN-197-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '442805.00', 12, 12, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(227, 197, NULL, 'OB3-OPEN-197-02', 'Sumber Harapan (KRM-20260914-03)', '2026-09-14', '221403.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(228, 198, NULL, 'OB3-OPEN-198-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '481385.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(229, 198, NULL, 'OB3-OPEN-198-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '483885.00', 10, 10, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(230, 199, NULL, 'OB3-OPEN-199-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(231, 200, NULL, 'OB3-OPEN-200-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '525665.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(232, 201, NULL, 'OB3-OPEN-201-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '528332.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(233, 201, NULL, 'OB3-OPEN-201-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '530833.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(234, 201, NULL, 'OB3-OPEN-201-03', 'Sumber Harapan (KRM-20260914-03)', '2026-09-14', '528332.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(235, 201, NULL, 'OB3-OPEN-201-04', 'Sumber Harapan (KRM-20260914-03)', '2026-09-14', '309430.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(236, 202, NULL, 'OB3-OPEN-202-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '523531.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(237, 203, NULL, 'OB3-OPEN-203-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '536701.00', 17, 17, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(238, 204, NULL, 'OB3-OPEN-204-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '563376.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(239, 205, NULL, 'OB3-OPEN-205-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '687849.00', 4, 3, 3, '2026-10-05 08:32:53', '2026-10-05 08:42:05'),
(240, 207, NULL, 'OB3-OPEN-207-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '578482.00', 5, 5, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(241, 208, NULL, 'OB3-OPEN-208-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '558000.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(242, 209, NULL, 'OB3-OPEN-209-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '555008.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(243, 209, NULL, 'OB3-OPEN-209-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '557507.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(244, 210, NULL, 'OB3-OPEN-210-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '607123.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(245, 211, NULL, 'OB3-OPEN-211-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '856801.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(246, 212, NULL, 'OB3-OPEN-212-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '750000.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(247, 212, NULL, 'OB3-OPEN-212-02', 'Sumber Harapan (KRM-20260914-03)', '2026-09-14', '908185.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(248, 216, NULL, 'OB3-OPEN-216-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1031423.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(249, 220, NULL, 'OB3-OPEN-220-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '607879.00', 3, 3, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(250, 220, NULL, 'OB3-OPEN-220-02', 'Sumber Harapan (KRM-20260917-03)', '2026-09-17', '592880.00', 3, 3, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(251, 221, NULL, 'OB3-OPEN-221-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '636560.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(252, 222, NULL, 'OB3-OPEN-222-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '691680.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(253, 223, NULL, 'OB3-OPEN-223-01', 'Sumber Harapan (KRM-20260904-01)', '2026-09-04', '610560.00', 8, 8, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(254, 224, NULL, 'OB3-OPEN-224-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '608920.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(255, 225, NULL, 'OB3-OPEN-225-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '500000.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(256, 226, NULL, 'OB3-OPEN-226-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '762840.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 09:14:27'),
(257, 227, NULL, 'OB3-OPEN-227-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '652680.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(258, 228, NULL, 'OB3-OPEN-228-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '656240.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(259, 228, NULL, 'OB3-OPEN-228-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '641240.00', 5, 5, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(260, 229, NULL, 'OB3-OPEN-229-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '598600.00', 5, 5, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(261, 230, NULL, 'OB3-OPEN-230-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '695320.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(262, 231, NULL, 'OB3-OPEN-231-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '805560.00', 6, 6, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(263, 233, NULL, 'OB3-OPEN-233-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '703640.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(264, 233, NULL, 'OB3-OPEN-233-02', 'Sumber Harapan (KRM-20260917-03)', '2026-09-17', '703640.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(265, 234, NULL, 'OB3-OPEN-234-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '797240.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(266, 235, NULL, 'OB3-OPEN-235-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '704680.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(267, 236, NULL, 'OB3-OPEN-236-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '740040.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(268, 236, NULL, 'OB3-OPEN-236-02', 'Sumber Harapan (KRM-20260917-03)', '2026-09-17', '740040.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(269, 237, NULL, 'OB3-OPEN-237-01', 'Sumber Harapan (KRM-20260904-01)', '2026-09-04', '792560.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(270, 240, NULL, 'OB3-OPEN-240-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '977500.00', 2, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:56:55'),
(271, 241, NULL, 'OB3-OPEN-241-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '897080.00', 3, 3, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(272, 242, NULL, 'OB3-OPEN-242-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '962600.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(273, 243, NULL, 'OB3-OPEN-243-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '902500.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(274, 244, NULL, 'OB3-OPEN-244-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700000.00', 6, 6, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(275, 245, NULL, 'OB3-OPEN-245-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '996920.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(276, 249, NULL, 'OB3-OPEN-249-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1611560.00', 2, 2, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(277, 250, NULL, 'OB3-OPEN-250-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1206660.00', 1, 1, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(278, 251, NULL, 'OB3-OPEN-251-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1445000.00', 4, 3, 3, '2026-10-05 08:32:53', '2026-11-21 07:45:00'),
(279, 252, NULL, 'OB3-OPEN-252-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '2265000.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(280, 259, NULL, 'OB3-OPEN-259-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '520000.00', 6, 6, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(281, 260, NULL, 'OB3-OPEN-260-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '352500.00', 7, 7, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(282, 261, NULL, 'OB3-OPEN-261-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '380500.00', 8, 8, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(283, 262, NULL, 'OB3-OPEN-262-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '564000.00', 4, 4, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(284, 263, NULL, 'OB3-OPEN-263-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '390500.00', 6, 6, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(285, 264, NULL, 'OB3-OPEN-264-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '438800.00', 5, 5, 3, '2026-10-05 08:32:53', '2026-10-05 08:32:53'),
(286, 265, NULL, 'OB3-OPEN-265-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '675000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(287, 265, NULL, 'OB3-OPEN-265-02', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '709000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(288, 266, NULL, 'OB3-OPEN-266-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '480800.00', 7, 7, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(289, 267, NULL, 'OB3-OPEN-267-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '728000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(290, 268, NULL, 'OB3-OPEN-268-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '511800.00', 12, 12, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(291, 269, NULL, 'OB3-OPEN-269-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '596800.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(292, 270, NULL, 'OB3-OPEN-270-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '504800.00', 5, 5, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(293, 271, NULL, 'OB3-OPEN-271-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '487800.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(294, 271, NULL, 'OB3-OPEN-271-02', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '487800.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(295, 272, NULL, 'OB3-OPEN-272-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '508800.00', 8, 8, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(296, 273, NULL, 'OB3-OPEN-273-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '539800.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(297, 273, NULL, 'OB3-OPEN-273-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '530874.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(298, 274, NULL, 'OB3-OPEN-274-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '535874.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(299, 274, NULL, 'OB3-OPEN-274-02', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '544800.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(300, 275, NULL, 'OB3-OPEN-275-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '520874.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(301, 276, NULL, 'OB3-OPEN-276-01', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '542800.00', 6, 6, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(302, 277, NULL, 'OB3-OPEN-277-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '605800.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(303, 278, NULL, 'OB3-OPEN-278-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '594800.00', 6, 6, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(304, 278, NULL, 'OB3-OPEN-278-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '585874.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(305, 279, NULL, 'OB3-OPEN-279-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '615800.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(306, 280, NULL, 'OB3-OPEN-280-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '697800.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(307, 280, NULL, 'OB3-OPEN-280-02', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '697800.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(308, 281, NULL, 'OB3-OPEN-281-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '914800.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(309, 282, NULL, 'OB3-OPEN-282-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1334800.00', 5, 5, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(310, 283, NULL, 'OB3-OPEN-283-01', 'Sumber Harapan (KRM-20260902-01)', '2026-09-02', '608500.00', 8, 8, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(311, 284, NULL, 'OB3-OPEN-284-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '521500.00', 6, 6, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(312, 284, NULL, 'OB3-OPEN-284-02', 'Sumber Harapan (KRM-20260902-01)', '2026-09-02', '521500.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(313, 285, NULL, 'OB3-OPEN-285-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '570574.00', 5, 5, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(314, 286, NULL, 'OB3-OPEN-286-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '621500.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(315, 286, NULL, 'OB3-OPEN-286-02', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '621500.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(316, 287, NULL, 'OB3-OPEN-287-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '631500.00', 6, 6, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(317, 287, NULL, 'OB3-OPEN-287-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '622573.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(318, 288, NULL, 'OB3-OPEN-288-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '614500.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(319, 289, NULL, 'OB3-OPEN-289-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '662500.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(320, 289, NULL, 'OB3-OPEN-289-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '683500.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(321, 290, NULL, 'OB3-OPEN-290-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '400000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(322, 291, NULL, 'OB3-OPEN-291-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(323, 292, NULL, 'OB3-OPEN-292-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '530000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(324, 293, NULL, 'OB3-OPEN-293-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '430000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(325, 294, NULL, 'OB3-OPEN-294-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '585000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(326, 295, NULL, 'OB3-OPEN-295-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '375000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(327, 295, NULL, 'OB3-OPEN-295-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '375000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(328, 296, NULL, 'OB3-OPEN-296-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '380000.00', 65, 65, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(329, 297, NULL, 'OB3-OPEN-297-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '410000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(330, 297, NULL, 'OB3-OPEN-297-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '410000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(331, 300, NULL, 'OB3-OPEN-300-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '550000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(332, 301, NULL, 'OB3-OPEN-301-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '540000.00', 5, 5, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(333, 304, NULL, 'OB3-OPEN-304-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '590000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(334, 308, NULL, 'OB3-OPEN-308-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '562000.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(335, 309, NULL, 'OB3-OPEN-309-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(336, 309, NULL, 'OB3-OPEN-309-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '500000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(337, 310, NULL, 'OB3-OPEN-310-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(338, 310, NULL, 'OB3-OPEN-310-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54');
INSERT INTO `product_batches` (`id`, `product_id`, `purchase_id`, `batch_code`, `source_name`, `purchase_date`, `batch_cost`, `initial_qty`, `remaining_qty`, `branch_id`, `created_at`, `updated_at`) VALUES
(339, 312, NULL, 'OB3-OPEN-312-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '552000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(340, 313, NULL, 'OB3-OPEN-313-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '375000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(341, 314, NULL, 'OB3-OPEN-314-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '540000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(342, 314, NULL, 'OB3-OPEN-314-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '540000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(343, 316, NULL, 'OB3-OPEN-316-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '580000.00', 5, 5, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(344, 317, NULL, 'OB3-OPEN-317-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '750000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(345, 318, NULL, 'OB3-OPEN-318-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '800000.00', 12, 12, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(346, 325, NULL, 'OB3-OPEN-325-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1400000.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(347, 325, NULL, 'OB3-OPEN-325-02', 'Sumber Harapan (KRM-20260917-01)', '2026-09-17', '1400000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(348, 326, NULL, 'OB3-OPEN-326-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1720000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(349, 332, NULL, 'OB3-OPEN-332-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '714574.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(350, 333, NULL, 'OB3-OPEN-333-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '849874.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(351, 334, NULL, 'OB3-OPEN-334-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '595450.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(352, 335, NULL, 'OB3-OPEN-335-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '983800.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(353, 336, NULL, 'OB3-OPEN-336-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '595000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23'),
(354, 337, NULL, 'OB3-OPEN-337-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '583500.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(355, 338, NULL, 'OB3-OPEN-338-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '600000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(356, 339, NULL, 'OB3-OPEN-339-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '530000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(357, 340, NULL, 'OB3-OPEN-340-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '638350.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(358, 341, NULL, 'OB3-OPEN-341-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '550000.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(359, 343, NULL, 'OB3-OPEN-343-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '889000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(360, 344, NULL, 'OB3-OPEN-344-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1250600.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(361, 345, NULL, 'OB3-OPEN-345-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '722500.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23'),
(362, 346, NULL, 'OB3-OPEN-346-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1110550.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(363, 347, NULL, 'OB3-OPEN-347-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '750000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(364, 348, NULL, 'OB3-OPEN-348-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1090250.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(365, 349, NULL, 'OB3-OPEN-349-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '200000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(366, 350, NULL, 'OB3-OPEN-350-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '660000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(367, 351, NULL, 'OB3-OPEN-351-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '458333.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(368, 352, NULL, 'OB3-OPEN-352-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '539460.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(369, 353, NULL, 'OB3-OPEN-353-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1406300.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(370, 354, NULL, 'OB3-OPEN-354-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(371, 355, NULL, 'OB3-OPEN-355-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1000000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(372, 357, NULL, 'OB3-OPEN-357-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1235000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-11-23 04:38:23'),
(373, 358, NULL, 'OB3-OPEN-358-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '487500.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(374, 359, NULL, 'OB3-OPEN-359-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '595000.00', 8, 8, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(375, 360, NULL, 'OB3-OPEN-360-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '740000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(376, 361, NULL, 'OB3-OPEN-361-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '691000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(377, 362, NULL, 'OB3-OPEN-362-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '415000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(378, 363, NULL, 'OB3-OPEN-363-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '435000.00', 12, 12, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(379, 364, NULL, 'OB3-OPEN-364-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '446500.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-11-23 04:02:00'),
(380, 365, NULL, 'OB3-OPEN-365-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(381, 366, NULL, 'OB3-OPEN-366-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '515000.00', 11, 11, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(382, 367, NULL, 'OB3-OPEN-367-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '720000.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(383, 368, NULL, 'OB3-OPEN-368-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1000000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(384, 369, NULL, 'OB3-OPEN-369-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '640000.00', 19, 19, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(385, 370, NULL, 'OB3-OPEN-370-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '640000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(386, 371, NULL, 'OB3-OPEN-371-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '354500.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(387, 372, NULL, 'OB3-OPEN-372-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '415400.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(388, 373, NULL, 'OB3-OPEN-373-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '597000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(389, 373, NULL, 'OB3-OPEN-373-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '618500.00', 3, 3, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(390, 374, NULL, 'OB3-OPEN-374-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '516460.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(391, 375, NULL, 'OB3-OPEN-375-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '864579.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(392, 376, NULL, 'OB3-OPEN-376-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '626200.00', 2, 2, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(393, 377, NULL, 'OB3-OPEN-377-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '645200.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(394, 378, NULL, 'OB3-OPEN-378-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '706800.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(395, 379, NULL, 'OB3-OPEN-379-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '786160.00', 5, 5, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(396, 380, NULL, 'OB3-OPEN-380-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '388889.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(397, 381, NULL, 'OB3-OPEN-381-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '600000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(398, 382, NULL, 'OB3-OPEN-382-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '600000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(399, 383, NULL, 'OB3-OPEN-383-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1382000.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(400, 384, NULL, 'OB3-OPEN-384-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1281075.00', 1, 1, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(401, 385, NULL, 'OB3-OPEN-385-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '662160.00', 4, 4, 3, '2026-10-05 08:32:54', '2026-10-05 08:32:54'),
(402, 386, NULL, 'OB3-OPEN-386-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '633020.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(403, 387, NULL, 'OB3-OPEN-387-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '661600.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(404, 388, NULL, 'OB3-OPEN-388-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '450000.00', 4, 4, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(405, 389, NULL, 'OB3-OPEN-389-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '700000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(406, 390, NULL, 'OB3-OPEN-390-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1074600.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(407, 391, NULL, 'OB3-OPEN-391-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '400000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(408, 392, NULL, 'OB3-OPEN-392-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '445000.00', 20, 20, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(409, 393, NULL, 'OB3-OPEN-393-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '670076.00', 3, 3, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(410, 394, NULL, 'OB3-OPEN-394-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '980207.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(411, 394, NULL, 'OB3-OPEN-394-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1013117.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(412, 394, NULL, 'OB3-OPEN-394-03', 'Sumber Harapan (KRM-20260914-03)', '2026-09-14', '1010617.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(413, 395, NULL, 'OB3-OPEN-395-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '866402.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(414, 396, NULL, 'OB3-OPEN-396-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1139083.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(415, 397, NULL, 'OB3-OPEN-397-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '568440.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(416, 398, NULL, 'OB3-OPEN-398-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '674000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(417, 399, NULL, 'OB3-OPEN-399-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '772800.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(418, 400, NULL, 'OB3-OPEN-400-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '719680.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(419, 402, NULL, 'OB3-OPEN-402-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1160600.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(420, 403, NULL, 'OB3-OPEN-403-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1450000.00', 4, 4, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(421, 404, NULL, 'OB3-OPEN-404-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '380000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(422, 404, NULL, 'OB3-OPEN-404-02', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '380000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(423, 405, NULL, 'OB3-OPEN-405-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '509220.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(424, 406, NULL, 'OB3-OPEN-406-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '380000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(425, 407, NULL, 'OB3-OPEN-407-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '380000.00', 45, 45, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(426, 408, NULL, 'OB3-OPEN-408-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '400000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(427, 409, NULL, 'OB3-OPEN-409-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '505000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(428, 410, NULL, 'OB3-OPEN-410-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '506000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(429, 411, NULL, 'OB3-OPEN-411-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '461000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(430, 412, NULL, 'OB3-OPEN-412-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '680000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23'),
(431, 413, NULL, 'OB3-OPEN-413-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '350000.00', 6, 6, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(432, 414, NULL, 'OB3-OPEN-414-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '605000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(433, 415, NULL, 'OB3-OPEN-415-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '567000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(434, 416, NULL, 'OB3-OPEN-416-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '890000.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-11-23 04:38:23'),
(435, 417, NULL, 'OB3-OPEN-417-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '650000.00', 5, 5, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(436, 418, NULL, 'OB3-OPEN-418-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1140000.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(437, 419, NULL, 'OB3-OPEN-419-01', 'Saldo Awal (OPNAME-202609)', '2026-09-01', '1194500.00', 2, 2, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(438, 421, NULL, 'OB3-OPEN-421-01', 'Masa Sempurna (KRM-20260908-MS)', '2026-09-08', '1403950.00', 4, 4, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(439, 422, NULL, 'OB3-OPEN-422-01', 'Sumber Harapan (KRM-20260917-03)', '2026-09-17', '663600.00', 1, 1, 3, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(440, 240, 1, 'BATCH-ACC-22540-18-0242-20261005-94', 'Grazia Ban', '2026-10-05', '999000.00', 4, 3, 3, '2026-10-05 08:53:20', '2026-10-05 08:55:12'),
(441, 226, NULL, 'OPN-202610-0001-226', 'Kelebihan stock opname', '2026-10-05', '762840.00', 1, 1, 3, '2026-10-05 08:56:55', '2026-10-05 08:56:55'),
(442, 240, 2, 'BATCH-ACC-22540-18-0242-20261005-99', 'Grazia Ban', '2026-10-05', '999000.00', 2, 0, 3, '2026-10-05 09:54:41', '2026-10-05 09:55:10'),
(443, 1, 3, 'BATCH-BAN-BS-185-65-R15-20261110-50', 'PT Bridgestone Tire Indonesia', '2026-11-10', '755000.00', 8, 8, 3, '2026-11-10 04:00:00', '2026-11-10 04:00:00'),
(444, 2, 4, 'BATCH-BAN-ACC-195-50-R16-20261114-45', 'PT Elangperdana Tyre Industry (Accelera)', '2026-11-14', '600000.00', 6, 5, 3, '2026-11-14 06:15:00', '2026-11-16 03:00:00'),
(445, 407, 5, 'BATCH-LAU-17565-14-0339-20261120-24', 'Masa Sempurna', '2026-11-20', '380000.00', 6, 6, 3, '2026-11-20 08:00:00', '2026-11-20 08:00:00'),
(446, 405, NULL, 'OPN-202611-0001-405', 'Kelebihan stock opname', '2026-11-19', '509220.00', 1, 1, 3, '2026-11-19 09:00:00', '2026-11-19 09:00:00');

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
(2, 'BAN-TRUCK', 'Ban Truck Diesel', NULL, 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(3, 'VELG', 'Velg Mobil Racing & OEM', 'Velg mobil variasi dan standar pabrik', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(4, 'BAN_DALAM', 'Ban Dalam & Marset (Flap)', 'Ban dalam tube type, karet marset pelindung velg, dan pentil', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(5, 'OLI_PELUMAS', 'Oli & Pelumas Mesin', 'Pelumas mesin bensin/diesel dan filter oli', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37'),
(6, 'AKSESORIS', 'Aksesoris & Mur Roda', 'Baut roda racing, center ring velg, dan spacer', 1, '2026-11-23 04:14:33', '2026-11-23 04:15:37');

-- --------------------------------------------------------

--
-- Table structure for table `product_price_audits`
--

CREATE TABLE `product_price_audits` (
  `id` bigint UNSIGNED NOT NULL,
  `product_id` bigint UNSIGNED NOT NULL,
  `old_cost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `new_cost` decimal(15,2) NOT NULL DEFAULT '0.00',
  `old_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `new_price` decimal(15,2) NOT NULL DEFAULT '0.00',
  `cost_change_percent` decimal(8,2) DEFAULT NULL,
  `price_change_percent` decimal(8,2) DEFAULT NULL,
  `change_source` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'manual',
  `changed_field` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `context_month` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `changed_by` bigint UNSIGNED DEFAULT NULL,
  `reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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

--
-- Dumping data for table `purchases`
--

INSERT INTO `purchases` (`id`, `purchase_number`, `supplier_id`, `supplier_name`, `supplier_invoice`, `purchase_date`, `payment_method`, `due_date`, `total_amount`, `dpp_amount`, `ppn_amount`, `paid_amount`, `returned_amount`, `status`, `journal_entry_number`, `notes`, `operator_name`, `created_at`, `updated_at`) VALUES
(1, 'GR-202610-0001', 5, 'Grazia Ban', 'INV-UJI-001', '2026-10-05', 'TEMPO', '2026-11-04', '3996000.00', '3600000.00', '396000.00', '2997000.00', '999000.00', 'LUNAS', 'JRN-202610-0006', 'Restock pengiriman distributor resmi Cabang 3', 'Admin Gudang OB3', '2026-10-05 08:53:20', '2026-10-05 09:52:27'),
(2, 'GR-202610-0002', 5, 'Grazia Ban', 'INV-UJI-002', '2026-10-05', 'TRANSFER_BCA', NULL, '1998000.00', '1800000.00', '198000.00', '0.00', '1998000.00', 'BATAL', 'JRN-202610-0023', 'Restock pengiriman distributor resmi Cabang 3', 'Agus Subagyo', '2026-10-05 09:54:41', '2026-10-05 09:55:10'),
(3, 'GR-202611-0001', 1, 'PT Bridgestone Tire Indonesia', 'INV-BS-20261110-01', '2026-11-10', 'TRANSFER_BCA', NULL, '6040000.00', '5441441.00', '598559.00', '6040000.00', '0.00', 'LUNAS', 'JRN-202611-0005', 'Restock Bridgestone Ecopia 185/65 R15 (PPN dikapitalisasi ke nilai FIFO)', 'Admin Gudang OB3', '2026-11-10 04:00:00', '2026-11-10 04:00:00'),
(4, 'GR-202611-0002', 2, 'PT Elangperdana Tyre Industry (Accelera)', 'INV-ACC-20261114-08', '2026-11-14', 'TEMPO', '2026-12-14', '3600000.00', '3243243.00', '356757.00', '1500000.00', '600000.00', 'SEBAGIAN', 'JRN-202611-0006', 'Pembelian kredit Accelera Phi 195/50 R16 termin 30 hari', 'Admin Gudang OB3', '2026-11-14 06:15:00', '2026-11-18 07:20:00'),
(5, 'GR-202611-0003', 4, 'Masa Sempurna', 'INV-MS-20261120-12', '2026-11-20', 'TEMPO', '2026-12-20', '2280000.00', '0.00', '0.00', '0.00', '0.00', 'BELUM_LUNAS', 'JRN-202611-0009', 'Restock ban Laufen termin 30 hari (hutang aktif)', 'Admin Gudang OB3', '2026-11-20 08:00:00', '2026-11-20 08:00:00');

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

--
-- Dumping data for table `purchase_payments`
--

INSERT INTO `purchase_payments` (`id`, `purchase_id`, `payment_date`, `amount`, `account_code`, `notes`, `operator_name`, `journal_entry_number`, `created_at`, `updated_at`) VALUES
(1, 1, '2026-10-05', '2997000.00', '1-1001', 'Pelunasan hutang pembelian ban Grazia Ban', 'Agus Subagyo', 'JRN-202610-0022', '2026-10-05 09:52:27', '2026-10-05 09:52:27'),
(2, 4, '2026-11-18', '1500000.00', '1-1001', 'Pembayaran termin 1 hutang INV-ACC-20261114-08 via BCA', 'Agus Subagyo', 'JRN-202611-0008', '2026-11-18 07:20:00', '2026-11-18 07:20:00');

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

--
-- Dumping data for table `purchase_returns`
--

INSERT INTO `purchase_returns` (`id`, `reference`, `purchase_id`, `kind`, `return_date`, `reason`, `quantity`, `total_amount`, `payable_amount`, `refund_amount`, `refund_account_code`, `journal_entry_number`, `created_by`, `operator_name`, `created_at`, `updated_at`) VALUES
(1, 'RTB-202610-0001', 1, 'RETURN', '2026-10-05', 'Uji: ban cacat produksi', 1, '999000.00', '999000.00', '0.00', NULL, 'JRN-202610-0007', 3, 'Admin Gudang OB3', '2026-10-05 08:55:12', '2026-10-05 08:55:12'),
(2, 'RTB-202610-0002', 2, 'CANCEL', '2026-10-05', 'Uji: salah input penerimaan', 2, '1998000.00', '0.00', '1998000.00', '1-1001', 'JRN-202610-0024', 1, 'Agus Subagyo', '2026-10-05 09:55:10', '2026-10-05 09:55:10'),
(3, 'RTB-202611-0001', 4, 'RETURN', '2026-11-16', 'Cacat dinding samping (sidewall bulge) saat QC penerimaan', 1, '600000.00', '600000.00', '0.00', NULL, 'JRN-202611-0007', 3, 'Admin Gudang OB3', '2026-11-16 03:00:00', '2026-11-16 03:00:00');

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

--
-- Dumping data for table `purchase_return_items`
--

INSERT INTO `purchase_return_items` (`id`, `purchase_return_id`, `product_batch_id`, `quantity`, `unit_cost`, `total_cost`, `created_at`, `updated_at`) VALUES
(1, 1, 440, 1, '999000.00', '999000.00', '2026-10-05 08:55:12', '2026-10-05 08:55:12'),
(2, 2, 442, 2, '999000.00', '1998000.00', '2026-10-05 09:55:10', '2026-10-05 09:55:10'),
(3, 3, 444, 1, '600000.00', '600000.00', '2026-11-16 03:00:00', '2026-11-16 03:00:00');

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

--
-- Dumping data for table `qris_transactions`
--

INSERT INTO `qris_transactions` (`id`, `order_id`, `gross_amount`, `transaction_status`, `settlement_source`, `settled_at`, `sale_payment_id`, `created_at`, `updated_at`) VALUES
(1, 'POS-1791191570711', '850000.00', 'settlement', 'SIMULATION', '2026-10-05 09:13:02', 2, '2026-10-05 09:12:51', '2026-10-05 09:13:04'),
(2, 'QRIS-OB3-20261121144500-21B', '1700000.00', 'settlement', 'SIMULATION', '2026-11-21 07:45:00', 4, '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(3, 'QRIS-OB3-20261123103500-23A', '1100000.00', 'settlement', 'SIMULATION', '2026-11-23 03:35:00', 10, '2026-11-23 03:35:00', '2026-11-23 03:35:00');

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

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `reference`, `date`, `customer_name`, `customer_phone`, `vehicle_plate`, `vehicle_model`, `cashier_name`, `user_id`, `gross_sales_amount`, `discount_amount`, `total_amount`, `paid_amount`, `change_amount`, `dp_applied`, `booking_id`, `payment_method`, `payment_reference`, `payment_provider`, `edc_bank`, `edc_type`, `fee_percentage`, `fee_amount`, `surcharge_amount`, `net_received`, `total_hpp`, `total_profit`, `notes`, `status`, `due_date`, `stock_deducted`, `branch_id`, `created_at`, `updated_at`, `voided_at`, `voided_by`, `void_reason`) VALUES
(1, 'OB3-INV-202610-0001', '2026-10-05', 'Pelanggan Walk-In', NULL, 'Umum', NULL, 'Kasir OB3', 2, '1550000.00', '0.00', '1550000.00', '1550000.00', '200000.00', '0.00', NULL, 'TUNAI', NULL, NULL, NULL, NULL, '0.00', '0.00', '0.00', '1550000.00', '1375698.00', '174302.00', NULL, 'LUNAS', NULL, 1, 3, '2026-10-05 08:41:10', '2026-10-05 08:41:10', NULL, NULL, NULL),
(2, 'OB3-INV-202610-0002', '2026-10-05', 'Pelanggan Walk-In', NULL, 'Umum', NULL, 'Kasir OB3', 2, '850000.00', '0.00', '850000.00', '850000.00', '0.00', '0.00', NULL, 'QRIS', 'POS-1791191570711', 'BCA', NULL, NULL, '0.30', '2550.00', '0.00', '847450.00', '762840.00', '87160.00', NULL, 'VOID', NULL, 1, 3, '2026-10-05 09:13:04', '2026-10-05 09:14:27', '2026-10-05 09:14:27', 'Agus Subagyo', 'Uji: pelanggan batal, QRIS dikembalikan'),
(3, 'OB3-INV-202611-0001', '2026-11-21', 'Budi Santoso', '081228901122', 'AA 1420 KB', 'Toyota Avanza Veloz', 'Kasir OB3', 2, '1690000.00', '50000.00', '1640000.00', '1640000.00', '160000.00', '0.00', NULL, 'TUNAI', NULL, NULL, NULL, NULL, '0.00', '0.00', '0.00', '1640000.00', '1534600.00', '105400.00', 'Ganti 2 ban depan + spooring 3D', 'LUNAS', NULL, 1, 3, '2026-11-21 03:15:00', '2026-11-21 03:15:00', NULL, NULL, NULL),
(4, 'OB3-INV-202611-0002', '2026-11-21', 'Hendro Wijaya', '081392008811', 'AA 8890 TA', 'Mitsubishi Pajero Sport', 'Kasir OB3', 2, '1700000.00', '0.00', '1700000.00', '1700000.00', '0.00', '0.00', NULL, 'QRIS', 'QRIS-OB3-20261121144500-21B', 'GoPay', NULL, NULL, '0.30', '5100.00', '0.00', '1694900.00', '1445000.00', '255000.00', NULL, 'LUNAS', NULL, 1, 3, '2026-11-21 07:45:00', '2026-11-21 07:45:00', NULL, NULL, NULL),
(5, 'OB3-INV-202611-0003', '2026-11-22', 'CV Armada Jaya Magelang', '08112645500', 'AA 9012 KA', '2 Unit Toyota Avanza Operasional', 'Kasir OB3', 2, '3750000.00', '0.00', '3750000.00', '3750000.00', '0.00', '0.00', NULL, 'TRANSFER', 'TRF-BCA-221101', 'Bank BCA (Transfer Direct)', NULL, NULL, '0.00', '0.00', '0.00', '3750000.00', '3337300.00', '412700.00', 'Pembelian armada 6 ban BS Techno 175/65 R14 (lintas 2 batch FIFO) + balancing', 'LUNAS', NULL, 1, 3, '2026-11-22 03:30:00', '2026-11-22 03:30:00', NULL, NULL, NULL),
(6, 'OB3-INV-202611-0004', '2026-11-22', 'Rina Kusuma', '085643219876', 'AB 1928 UH', 'Honda Civic Turbo', 'Kasir OB3', 2, '2200000.00', '0.00', '2200000.00', '2200000.00', '0.00', '0.00', NULL, 'TUNAI', NULL, NULL, NULL, NULL, '0.00', '0.00', '0.00', '2200000.00', '1870000.00', '330000.00', NULL, 'LUNAS', NULL, 1, 3, '2026-11-22 06:10:00', '2026-11-22 06:10:00', NULL, NULL, NULL),
(7, 'OB3-INV-202611-0005', '2026-11-23', 'Andi Prasetyo', '081215544332', 'AA 1054 HB', 'Honda HR-V', 'Kasir OB3', 2, '1700000.00', '0.00', '1700000.00', '1700000.00', '200000.00', '0.00', NULL, 'TUNAI', NULL, NULL, NULL, NULL, '0.00', '0.00', '0.00', '1700000.00', '1440000.00', '260000.00', 'Penggantian 2 ban depan + spooring 3D + nitrogen', 'LUNAS', NULL, 1, 3, '2026-11-23 02:15:00', '2026-11-23 02:15:00', NULL, NULL, NULL),
(8, 'OB3-INV-202611-0006', '2026-11-23', 'Dewi Lestari', '082133445566', 'AA 7741 LB', 'Toyota Yaris', 'Kasir OB3', 2, '1380000.00', '30000.00', '1350000.00', '1350000.00', '0.00', '0.00', NULL, 'SPLIT', NULL, NULL, NULL, NULL, '0.00', '0.00', '0.00', '1350000.00', '1160000.00', '190000.00', 'Split payment: DP tunai kasir + pelunasan transfer BCA, diskon nota Rp 30.000', 'LUNAS', NULL, 1, 3, '2026-11-23 03:05:00', '2026-11-23 03:05:00', NULL, NULL, NULL),
(9, 'OB3-INV-202611-0007', '2026-11-23', 'Wahyu Nugroho', '087738123456', 'AA 1618 NB', 'Honda City Hatchback', 'Kasir OB3', 2, '1100000.00', '0.00', '1100000.00', '1100000.00', '0.00', '0.00', NULL, 'QRIS', 'QRIS-OB3-20261123103500-23A', 'BCA', NULL, NULL, '0.30', '3300.00', '0.00', '1096700.00', '935000.00', '165000.00', NULL, 'LUNAS', NULL, 1, 3, '2026-11-23 03:35:00', '2026-11-23 03:35:00', NULL, NULL, NULL),
(10, 'OB3-INV-202611-0008', '2026-11-23', 'Salah Input Pelanggan', NULL, 'AA 0000 XX', NULL, 'Kasir OB3', 2, '525000.00', '0.00', '525000.00', '525000.00', '0.00', '0.00', NULL, 'TUNAI', NULL, NULL, NULL, NULL, '0.00', '0.00', '0.00', '525000.00', '446500.00', '78500.00', NULL, 'VOID', NULL, 1, 3, '2026-11-23 03:55:00', '2026-11-23 04:02:00', '2026-11-23 04:02:00', 'Agus Subagyo', 'Salah pilih ukuran ban pada nota, diganti transaksi baru'),
(12, 'OB3-INV-202611-0009', '2026-11-23', 'Surya Darmawan', '085228776655', 'AA 1290 MA', 'Suzuki Ertiga', 'Kasir OB3', 2, '255000.00', '0.00', '255000.00', '255000.00', '0.00', '0.00', NULL, 'QRIS', NULL, 'QRIS BCA (Statis)', NULL, NULL, '0.70', '1785.00', '0.00', '253215.00', '0.00', '255000.00', 'Servis berkala kaki-kaki (Spooring 3D + Balancing) & tambal ban belakang kiri', 'LUNAS', NULL, 1, 3, '2026-11-23 04:15:00', '2026-11-23 04:15:00', NULL, NULL, NULL),
(13, 'OB3-INV-202611-0010', '2026-11-23', 'Bagus Setiawan', '081328990044', 'AA 1825 ZB', 'Honda Brio RS', 'Kasir OB3', 2, '1550000.00', '0.00', '1550000.00', '1550000.00', '0.00', '0.00', NULL, 'TRANSFER', 'TRF-BCA-231103', 'Bank BCA (Transfer Direct)', NULL, NULL, '0.00', '0.00', '0.00', '1550000.00', '1176600.00', '373400.00', 'Paket ganti 2 ban + Spooring 3D + Balancing + Nitrogen full', 'LUNAS', NULL, 1, 3, '2026-11-23 04:45:00', '2026-11-23 04:45:00', NULL, NULL, NULL);

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

--
-- Dumping data for table `sales_returns`
--

INSERT INTO `sales_returns` (`id`, `reference`, `sale_id`, `return_date`, `reason`, `refund_amount`, `refund_cash`, `refund_bank`, `cost_amount`, `cash_session_id`, `journal_entry_number`, `created_by`, `operator_name`, `branch_id`, `created_at`, `updated_at`) VALUES
(1, 'RTJ-202610-0001', 1, '2026-10-05', 'Uji retur: ukuran tidak cocok', '775000.00', '775000.00', '0.00', '687849.00', 1, 'JRN-202610-0004', 2, 'Kasir OB3', 3, '2026-10-05 08:42:05', '2026-10-05 08:42:05'),
(2, 'RTJ-202611-0001', 6, '2026-11-22', 'Pelanggan batal pasang ban cadangan, 1 unit diretur dalam kondisi baru', '1100000.00', '1100000.00', '0.00', '935000.00', 3, 'JRN-202611-0019', 2, 'Kasir OB3', 3, '2026-11-22 08:00:00', '2026-11-22 08:00:00');

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

--
-- Dumping data for table `sales_return_items`
--

INSERT INTO `sales_return_items` (`id`, `sales_return_id`, `sale_detail_id`, `quantity`, `refund_amount`, `cost_amount`, `created_at`, `updated_at`) VALUES
(1, 1, 1, 1, '775000.00', '687849.00', '2026-10-05 08:42:05', '2026-10-05 08:42:05'),
(2, 2, 10, 1, '1100000.00', '935000.00', '2026-11-22 08:00:00', '2026-11-22 08:00:00');

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

--
-- Dumping data for table `sale_batch_allocations`
--

INSERT INTO `sale_batch_allocations` (`id`, `sale_detail_id`, `product_batch_id`, `quantity_allocated`, `quantity_returned`, `unit_cost`, `total_cost`, `created_at`, `updated_at`) VALUES
(1, 1, 239, 2, 1, '687849.00', '1375698.00', '2026-10-05 08:41:10', '2026-10-05 08:42:05'),
(2, 2, 256, 1, 0, '762840.00', '762840.00', '2026-10-05 09:13:04', '2026-10-05 09:13:04'),
(3, 3, 22, 2, 0, '767300.00', '1534600.00', '2026-11-21 03:15:00', '2026-11-21 03:15:00'),
(4, 5, 278, 1, 0, '1445000.00', '1445000.00', '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(5, 8, 8, 4, 0, '539550.00', '2158200.00', '2026-11-22 03:30:00', '2026-11-22 03:30:00'),
(6, 8, 9, 2, 0, '589550.00', '1179100.00', '2026-11-22 03:30:00', '2026-11-22 03:30:00'),
(7, 10, 62, 2, 1, '935000.00', '1870000.00', '2026-11-22 06:10:00', '2026-11-22 08:00:00'),
(8, 11, 1, 2, 0, '720000.00', '1440000.00', '2026-11-23 02:15:00', '2026-11-23 02:15:00'),
(9, 14, 2, 2, 0, '580000.00', '1160000.00', '2026-11-23 03:05:00', '2026-11-23 03:05:00'),
(10, 16, 62, 1, 0, '935000.00', '935000.00', '2026-11-23 03:35:00', '2026-11-23 03:35:00'),
(11, 19, 379, 1, 0, '446500.00', '446500.00', '2026-11-23 03:55:00', '2026-11-23 03:55:00'),
(12, 26, 14, 2, 0, '588300.00', '1176600.00', '2026-11-23 04:45:00', '2026-11-23 04:45:00');

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
  `sub_total` decimal(15,2) NOT NULL,
  `unit_cost_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `total_cost_hpp` decimal(15,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `profit_amount` decimal(15,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sale_details`
--

INSERT INTO `sale_details` (`id`, `sale_id`, `product_id`, `item_type`, `item_name`, `service_id`, `is_manual`, `quantity`, `unit_price`, `sub_total`, `unit_cost_hpp`, `total_cost_hpp`, `discount_amount`, `profit_amount`, `created_at`, `updated_at`) VALUES
(1, 1, 205, 'PRODUCT', 'Acc 651 Sport', NULL, 0, 2, '775000.00', '1550000.00', '687849.00', '1375698.00', '0.00', '174302.00', '2026-10-05 08:41:10', '2026-10-05 08:41:10'),
(2, 2, 226, 'PRODUCT', 'Acc 651 Sport', NULL, 0, 1, '850000.00', '850000.00', '762840.00', '762840.00', '0.00', '87160.00', '2026-10-05 09:13:04', '2026-10-05 09:13:04'),
(3, 3, 21, 'PRODUCT', 'Bs Ecopia', NULL, 0, 2, '845000.00', '1640000.00', '767300.00', '1534600.00', '50000.00', '105400.00', '2026-11-21 03:15:00', '2026-11-21 03:15:00'),
(4, 3, NULL, 'SERVICE', 'Jasa Spooring 3D Komputerized', 1, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-21 03:15:00', '2026-11-21 03:15:00'),
(5, 4, 251, 'PRODUCT', 'Acc Omikron AT', NULL, 0, 1, '1700000.00', '1700000.00', '1445000.00', '1445000.00', '0.00', '255000.00', '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(6, 4, NULL, 'SERVICE', 'Bongkar Pasang Ban K', 3, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(7, 4, NULL, 'SERVICE', 'Isi Nitrogen', 7, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(8, 5, 7, 'PRODUCT', 'Bs Techno', NULL, 0, 6, '625000.00', '3750000.00', '556216.67', '3337300.00', '0.00', '412700.00', '2026-11-22 03:30:00', '2026-11-22 03:30:00'),
(9, 5, NULL, 'SERVICE', 'Jasa Balancing Roda Mobil', 2, 0, 2, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-22 03:30:00', '2026-11-22 03:30:00'),
(10, 6, 60, 'PRODUCT', 'Bs Techno', NULL, 0, 2, '1100000.00', '2200000.00', '935000.00', '1870000.00', '0.00', '330000.00', '2026-11-22 06:10:00', '2026-11-22 06:10:00'),
(11, 7, 1, 'PRODUCT', 'Bridgestone Ecopia EP150 185/65 R15', NULL, 0, 2, '850000.00', '1700000.00', '720000.00', '1440000.00', '0.00', '260000.00', '2026-11-23 02:15:00', '2026-11-23 02:15:00'),
(12, 7, NULL, 'SERVICE', 'Jasa Spooring 3D Komputerized', 1, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-23 02:15:00', '2026-11-23 02:15:00'),
(13, 7, NULL, 'SERVICE', 'Isi Nitrogen', 7, 0, 2, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-23 02:15:00', '2026-11-23 02:15:00'),
(14, 8, 2, 'PRODUCT', 'Accelera Phi-R 195/50 R16', NULL, 0, 2, '690000.00', '1380000.00', '580000.00', '1160000.00', '0.00', '220000.00', '2026-11-23 03:05:00', '2026-11-23 03:05:00'),
(15, 8, NULL, 'SERVICE', 'Jasa Spooring 3D Komputerized', 1, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-23 03:05:00', '2026-11-23 03:05:00'),
(16, 9, 60, 'PRODUCT', 'Bs Techno', NULL, 0, 1, '1100000.00', '1100000.00', '935000.00', '935000.00', '0.00', '165000.00', '2026-11-23 03:35:00', '2026-11-23 03:35:00'),
(17, 9, NULL, 'SERVICE', 'Jasa Balancing Roda Mobil', 2, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-23 03:35:00', '2026-11-23 03:35:00'),
(18, 9, NULL, 'SERVICE', 'Bongkar Pasang Ban K', 3, 0, 1, '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '2026-11-23 03:35:00', '2026-11-23 03:35:00'),
(19, 10, 364, 'PRODUCT', 'Dunlop SP31', NULL, 0, 1, '525000.00', '525000.00', '446500.00', '446500.00', '0.00', '78500.00', '2026-11-23 03:55:00', '2026-11-23 03:55:00'),
(23, 12, NULL, 'SERVICE', 'Jasa Spooring 3D Komputerized', 1, 0, 1, '150000.00', '150000.00', '0.00', '0.00', '0.00', '150000.00', '2026-11-23 04:15:00', '2026-11-23 04:15:00'),
(24, 12, NULL, 'SERVICE', 'Jasa Balancing Roda Mobil', 2, 0, 2, '35000.00', '70000.00', '0.00', '0.00', '0.00', '70000.00', '2026-11-23 04:15:00', '2026-11-23 04:15:00'),
(25, 12, NULL, 'SERVICE', 'Tambal Ban Tubeless', 6, 0, 1, '35000.00', '35000.00', '0.00', '0.00', '0.00', '35000.00', '2026-11-23 04:15:00', '2026-11-23 04:15:00'),
(26, 13, 11, 'PRODUCT', 'Bs Techno', NULL, 0, 2, '650000.00', '1300000.00', '588300.00', '1176600.00', '0.00', '123400.00', '2026-11-23 04:45:00', '2026-11-23 04:45:00'),
(27, 13, NULL, 'SERVICE', 'Jasa Spooring 3D Komputerized', 1, 0, 1, '150000.00', '150000.00', '0.00', '0.00', '0.00', '150000.00', '2026-11-23 04:45:00', '2026-11-23 04:45:00'),
(28, 13, NULL, 'SERVICE', 'Jasa Balancing Roda Mobil', 2, 0, 2, '35000.00', '70000.00', '0.00', '0.00', '0.00', '70000.00', '2026-11-23 04:45:00', '2026-11-23 04:45:00'),
(29, 13, NULL, 'SERVICE', 'Isi Nitrogen', 7, 0, 2, '15000.00', '30000.00', '0.00', '0.00', '0.00', '30000.00', '2026-11-23 04:45:00', '2026-11-23 04:45:00');

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

--
-- Dumping data for table `sale_payments`
--

INSERT INTO `sale_payments` (`id`, `sale_id`, `method`, `account_code`, `amount`, `tendered_amount`, `change_amount`, `fee_percentage`, `fee_amount`, `surcharge_amount`, `net_received`, `provider_name`, `edc_bank`, `edc_type`, `reference`, `created_at`, `updated_at`) VALUES
(1, 1, 'TUNAI', '1-1000', '1550000.00', '1750000.00', '200000.00', '0.00', '0.00', '0.00', '1550000.00', NULL, NULL, NULL, NULL, '2026-10-05 08:41:10', '2026-10-05 08:41:10'),
(2, 2, 'QRIS', '1-1001', '850000.00', '850000.00', '0.00', '0.30', '2550.00', '0.00', '847450.00', 'BCA', NULL, NULL, 'POS-1791191570711', '2026-10-05 09:13:04', '2026-10-05 09:13:04'),
(3, 3, 'TUNAI', '1-1000', '1640000.00', '1800000.00', '160000.00', '0.00', '0.00', '0.00', '1640000.00', NULL, NULL, NULL, NULL, '2026-11-21 03:15:00', '2026-11-21 03:15:00'),
(4, 4, 'QRIS', '1-1001', '1700000.00', '1700000.00', '0.00', '0.30', '5100.00', '0.00', '1694900.00', 'GoPay', NULL, NULL, 'QRIS-OB3-20261121144500-21B', '2026-11-21 07:45:00', '2026-11-21 07:45:00'),
(5, 5, 'TRANSFER', '1-1001', '3750000.00', '3750000.00', '0.00', '0.00', '0.00', '0.00', '3750000.00', 'Bank BCA (Transfer Direct)', NULL, NULL, 'TRF-BCA-221101', '2026-11-22 03:30:00', '2026-11-22 03:30:00'),
(6, 6, 'TUNAI', '1-1000', '2200000.00', '2200000.00', '0.00', '0.00', '0.00', '0.00', '2200000.00', NULL, NULL, NULL, NULL, '2026-11-22 06:10:00', '2026-11-22 06:10:00'),
(7, 7, 'TUNAI', '1-1000', '1700000.00', '1900000.00', '200000.00', '0.00', '0.00', '0.00', '1700000.00', NULL, NULL, NULL, NULL, '2026-11-23 02:15:00', '2026-11-23 02:15:00'),
(8, 8, 'TUNAI', '1-1000', '500000.00', '500000.00', '0.00', '0.00', '0.00', '0.00', '500000.00', NULL, NULL, NULL, NULL, '2026-11-23 03:05:00', '2026-11-23 03:05:00'),
(9, 8, 'TRANSFER', '1-1001', '850000.00', '850000.00', '0.00', '0.00', '0.00', '0.00', '850000.00', 'Bank BCA (Transfer Direct)', NULL, NULL, 'TRF-BCA-231102', '2026-11-23 03:05:00', '2026-11-23 03:05:00'),
(10, 9, 'QRIS', '1-1001', '1100000.00', '1100000.00', '0.00', '0.30', '3300.00', '0.00', '1096700.00', 'BCA', NULL, NULL, 'QRIS-OB3-20261123103500-23A', '2026-11-23 03:35:00', '2026-11-23 03:35:00'),
(11, 10, 'TUNAI', '1-1000', '525000.00', '525000.00', '0.00', '0.00', '0.00', '0.00', '525000.00', NULL, NULL, NULL, NULL, '2026-11-23 03:55:00', '2026-11-23 03:55:00'),
(13, 12, 'QRIS', '1-1001', '255000.00', '255000.00', '0.00', '0.70', '1785.00', '0.00', '253215.00', 'QRIS BCA (Statis)', NULL, NULL, NULL, '2026-11-23 04:15:00', '2026-11-23 04:15:00'),
(14, 13, 'TRANSFER', '1-1001', '1550000.00', '1550000.00', '0.00', '0.00', '0.00', '0.00', '1550000.00', 'Bank BCA (Transfer Direct)', NULL, NULL, 'TRF-BCA-231103', '2026-11-23 04:45:00', '2026-11-23 04:45:00');

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
(1, 'JASA-SPOORING-3D', 'Jasa Spooring 3D Komputerized', 'SPOORING', '150000.00', '0.00', 'Garansi 7 hari / 500 km', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(2, 'JASA-BALANCING-WHEEL', 'Jasa Balancing Roda Mobil', 'BALANCING', '35000.00', '0.00', 'Per roda (termasuk timah balancing)', 1, '2026-10-05 08:32:51', '2026-10-05 08:32:51'),
(3, 'OB-JASA-001', 'Bongkar Pasang Ban K', 'SERVICE', '25000.00', '0.00', 'Jasa pemasangan ban standar', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(4, 'OB-JASA-002', 'Balancing B', 'SERVICE', '35000.00', '0.00', 'Jasa balancing roda', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(5, 'OB-JASA-003', 'Spooring B', 'SERVICE', '150000.00', '0.00', 'Jasa spooring/alignment roda', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(6, 'OB-JASA-004', 'Tambal Ban Tubeless', 'SERVICE', '35000.00', '0.00', 'Jasa tambal ban tubeless', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(7, 'OB-JASA-005', 'Isi Nitrogen', 'SERVICE', '15000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(8, 'OB-JASA-006', 'Dop Pentil + Bongkar Pasang', 'SERVICE', '35000.00', '1100.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(9, 'OB-JASA-007', 'Balancing K', 'SERVICE', '25000.00', '0.00', 'Jasa Balancing Ban', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(10, 'OB-JASA-008', 'Spooring A', 'SERVICE', '125000.00', '0.00', 'Spooring Ban Kecil', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(11, 'OB-JASA-009', 'Tambal Tiptop 1 Kerusakan', 'SERVICE', '75000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(12, 'OB-JASA-010', 'Tambal Tiptop 2 Kerusakan', 'SERVICE', '125000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(13, 'OB-JASA-011', 'Jasa Oper Ban', 'SERVICE', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(14, 'OB-JASA-012', 'Balancing (FREE)', 'SERVICE', '0.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(15, 'OB-JASA-013', 'Dop Pentil', 'GOODS', '10000.00', '1100.00', 'Dop Pentil Ban/Tubeless', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(16, 'OB-JASA-014', 'Bongkar Pasang Ban B', 'SERVICE', '35000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(17, 'OB-JASA-015', 'Dop Pentil (FREE)', 'GOODS', '0.00', '1100.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(18, 'OB-JASA-016', 'Jasa Pasang K', 'SERVICE', '15000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(19, 'OB-JASA-017', 'Baut Chamber 12-14mm', 'SERVICE', '40000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(20, 'OB-JASA-018', 'Jasa Pres Ban', 'SERVICE', '125000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(21, 'OB-JASA-019', 'Bongkar Pasang (Velg Lebar)', 'SERVICE', '50000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(22, 'OB-JASA-020', 'Mur Roda 12x1.5 21 Panjang', 'GOODS', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(23, 'OB-JASA-021', 'Jasa Cek Ban', 'SERVICE', '15000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(24, 'OB-JASA-022', 'Jasa Pasang Ban Dalam', 'SERVICE', '10000.00', '0.00', 'Dengan disertai pembelian ban dalam', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(25, 'OB-JASA-023', 'Bongkar Pasang Serep', 'SERVICE', '25000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(26, 'OB-JASA-024', 'Jasa Home Service', 'SERVICE', '50000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(27, 'OB-JASA-025', 'Bongkar Pasang Serep (FREE)', 'SERVICE', '0.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(28, 'OB-JASA-026', 'Mur Roda (FREE)', 'GOODS', '0.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(29, 'OB-JASA-027', 'Jasa Balancing', 'SERVICE', '30000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(30, 'OB-JASA-028', 'Mur Roda 12x1.5 21 Pendek', 'GOODS', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(31, 'OB-JASA-029', 'Mur Roda 12x1.25 21 Panjang', 'SERVICE', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(32, 'OB-JASA-030', 'Mur Roda 12x1.25 21 Pendek', 'GOODS', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(33, 'OB-JASA-031', 'Mur Roda 12x1.5 19 Panjang', 'SERVICE', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(34, 'OB-JASA-032', 'Mur Roda 12x1.5 19 Pendek', 'GOODS', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(35, 'OB-JASA-033', 'Mur Roda 12x1.25 19 Panjang', 'GOODS', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(36, 'OB-JASA-034', 'Mur Roda 12x1.25 19 Pendek', 'GOODS', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(37, 'OB-JASA-035', 'Mur L 12x1.5 (Variasi)', 'CUSTOM', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(38, 'OB-JASA-036', 'Mur L 12x1.25 (Variasi)', 'CUSTOM', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(39, 'OB-JASA-037', '1 Set Mur Leher 12x1.5 Panjang (20 pcs)', 'CUSTOM', '250000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(40, 'OB-JASA-038', '1 Set Mur Leher 12x1.5 Pendek (20 pcs)', 'SERVICE', '250000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(41, 'OB-JASA-039', 'Jasa Pasang B', 'SERVICE', '20000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(42, 'OB-JASA-040', 'Baut Chamber Kit 15-17mm', 'CUSTOM', '50000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(43, 'OB-JASA-041', 'Jasa Pasang Baut Chamber Kit', 'CUSTOM', '45000.00', '0.00', 'Harga per pcs', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(44, 'OB-JASA-042', 'Jasa Setting Ulang Baut Chamber Kit', 'CUSTOM', '35000.00', '0.00', 'Hanya setting, tidak pasang', 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(45, 'OB-JASA-043', 'Rotasi Ban K', 'SERVICE', '10000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55'),
(46, 'OB-JASA-044', 'Rotasi Ban B', 'SERVICE', '15000.00', '0.00', NULL, 1, '2026-10-05 08:32:55', '2026-10-05 08:32:55');

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
(1, 1, 'MASUK', 24, 24, 'INITIAL_STOCK', 'OB3-OPEN-BAN-BS-185-65-R15', 'Saldo awal stok ban baru: Bridgestone Ecopia EP150 185/65 R15', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(2, 2, 'MASUK', 18, 18, 'INITIAL_STOCK', 'OB3-OPEN-BAN-ACC-195-50-R16', 'Saldo awal stok ban baru: Accelera Phi-R 195/50 R16', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(3, 3, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-3-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(4, 3, 'MASUK', 4, 7, 'INITIAL_STOCK', 'OB3-OPEN-3-02', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(5, 4, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-4-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(6, 5, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-5-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(7, 6, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-6-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(8, 7, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-7-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(9, 7, 'MASUK', 6, 10, 'INITIAL_STOCK', 'OB3-OPEN-7-02', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(10, 8, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-8-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(11, 8, 'MASUK', 4, 7, 'INITIAL_STOCK', 'OB3-OPEN-8-02', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(12, 9, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-9-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(13, 10, 'MASUK', 13, 13, 'INITIAL_STOCK', 'OB3-OPEN-10-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(14, 11, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-11-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(15, 12, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-12-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(16, 13, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-13-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(17, 14, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-14-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(18, 15, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-15-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(19, 18, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-18-01', 'Saldo awal stok ban baru: Bs Potenza RE030', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(20, 19, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-19-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(21, 20, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-20-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(22, 21, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-21-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(23, 21, 'MASUK', 4, 10, 'INITIAL_STOCK', 'OB3-OPEN-21-02', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(24, 22, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-22-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(25, 23, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-23-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(26, 24, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-24-01', 'Saldo awal stok ban baru: Bs Turanza ER33', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(27, 26, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-26-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(28, 27, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-27-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(29, 27, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-27-02', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(30, 28, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-28-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(31, 28, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-28-02', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(32, 29, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-29-01', 'Saldo awal stok ban baru: Bs Dueler HT D684', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(33, 30, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-30-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(34, 31, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-31-01', 'Saldo awal stok ban baru: Bs B-390', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(35, 31, 'MASUK', 2, 5, 'INITIAL_STOCK', 'OB3-OPEN-31-02', 'Saldo awal stok ban baru: Bs B-390', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(36, 32, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-32-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(37, 32, 'MASUK', 1, 3, 'INITIAL_STOCK', 'OB3-OPEN-32-02', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(38, 32, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-32-03', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(39, 35, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-35-01', 'Saldo awal stok ban baru: Bs Turanza T005', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(40, 36, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-36-01', 'Saldo awal stok ban baru: Bs Dueler AT 002', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(41, 37, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-37-01', 'Saldo awal stok ban baru: Bs Dueler HL D683', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(42, 38, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-38-01', 'Saldo awal stok ban baru: Bs Dueler HT D689', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(43, 40, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-40-01', 'Saldo awal stok ban baru: Bs Turanza ER370', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(44, 40, 'MASUK', 3, 8, 'INITIAL_STOCK', 'OB3-OPEN-40-02', 'Saldo awal stok ban baru: Bs Turanza ER370', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(45, 41, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-41-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(46, 42, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-42-01', 'Saldo awal stok ban baru: Bs T6', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(47, 43, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-43-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(48, 44, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-44-01', 'Saldo awal stok ban baru: Bs Turanza T6', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(49, 45, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-45-01', 'Saldo awal stok ban baru: Bs Techno Sports', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(50, 46, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-46-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(51, 47, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-47-01', 'Saldo awal stok ban baru: Bs Turanza T005A', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(52, 49, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-49-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(53, 50, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-50-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(54, 50, 'MASUK', 2, 5, 'INITIAL_STOCK', 'OB3-OPEN-50-02', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(55, 52, 'MASUK', 9, 9, 'INITIAL_STOCK', 'OB3-OPEN-52-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(56, 53, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-53-01', 'Saldo awal stok ban baru: Bs Turanza T005', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(57, 55, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-55-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(58, 56, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-56-01', 'Saldo awal stok ban baru: Bs Dueler HT D687', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(59, 57, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-57-01', 'Saldo awal stok ban baru: Bs Dueler MT D674', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(60, 57, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-57-02', 'Saldo awal stok ban baru: Bs Dueler MT D674', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(61, 58, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-58-01', 'Saldo awal stok ban baru: Bs Dueler HT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(62, 60, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-60-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(63, 62, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-62-01', 'Saldo awal stok ban baru: Bs Turanza T6', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(64, 63, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-63-01', 'Saldo awal stok ban baru: Bs Alenza AL01 T', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(65, 64, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-64-01', 'Saldo awal stok ban baru: Bs Dueler HT D687', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(66, 66, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-66-01', 'Saldo awal stok ban baru: Bs Dueler HT D470', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(67, 66, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-66-02', 'Saldo awal stok ban baru: Bs Dueler HT D470', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(68, 68, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-68-01', 'Saldo awal stok ban baru: Bs Dueler HT D684', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(69, 69, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-69-01', 'Saldo awal stok ban baru: Bs Dueler AT halus D693', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:51', NULL),
(70, 73, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-73-01', 'Saldo awal stok ban baru: Bs Turanza 6', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(71, 73, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-73-02', 'Saldo awal stok ban baru: Bs Turanza 6', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(72, 74, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-74-01', 'Saldo awal stok ban baru: Bs Dueler HL 33', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(73, 74, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-74-02', 'Saldo awal stok ban baru: Bs Dueler HL 33', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(74, 75, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-75-01', 'Saldo awal stok ban baru: Bs Dueler HT D684', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(75, 75, 'MASUK', 4, 7, 'INITIAL_STOCK', 'OB3-OPEN-75-02', 'Saldo awal stok ban baru: Bs Dueler HT D684', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(76, 76, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-76-01', 'Saldo awal stok ban baru: Dunlop LT5', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(77, 76, 'MASUK', 10, 12, 'INITIAL_STOCK', 'OB3-OPEN-76-02', 'Saldo awal stok ban baru: Dunlop LT5', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(78, 77, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-77-01', 'Saldo awal stok ban baru: Dunlop LT5', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(79, 78, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-78-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(80, 78, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-78-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(81, 78, 'MASUK', 4, 9, 'INITIAL_STOCK', 'OB3-OPEN-78-03', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(82, 79, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-79-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(83, 79, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-79-02', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(84, 79, 'MASUK', 4, 10, 'INITIAL_STOCK', 'OB3-OPEN-79-03', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(85, 80, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-80-01', 'Saldo awal stok ban baru: Dunlop LT5', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(86, 80, 'MASUK', 6, 8, 'INITIAL_STOCK', 'OB3-OPEN-80-02', 'Saldo awal stok ban baru: Dunlop LT5', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(87, 81, 'MASUK', 7, 7, 'INITIAL_STOCK', 'OB3-OPEN-81-01', 'Saldo awal stok ban baru: Dunlop SP10', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(88, 81, 'MASUK', 4, 11, 'INITIAL_STOCK', 'OB3-OPEN-81-02', 'Saldo awal stok ban baru: Dunlop SP10', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(89, 83, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-83-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(90, 84, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-84-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(91, 85, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-85-01', 'Saldo awal stok ban baru: Dunlop LT5', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(92, 86, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-86-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(93, 86, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-86-02', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(94, 86, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-86-03', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(95, 87, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-87-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(96, 89, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-89-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(97, 89, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-89-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(98, 90, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-90-01', 'Saldo awal stok ban baru: Dunlop Sportmaxx', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(99, 91, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-91-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(100, 92, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-92-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(101, 92, 'MASUK', 3, 4, 'INITIAL_STOCK', 'OB3-OPEN-92-02', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(102, 92, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-92-03', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(103, 93, 'MASUK', 11, 11, 'INITIAL_STOCK', 'OB3-OPEN-93-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(104, 93, 'MASUK', 4, 15, 'INITIAL_STOCK', 'OB3-OPEN-93-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(105, 95, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-95-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(106, 97, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-97-01', 'Saldo awal stok ban baru: Dunlop D80V4', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(107, 98, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-98-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(108, 98, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-98-02', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(109, 99, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-99-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(110, 99, 'MASUK', 2, 3, 'INITIAL_STOCK', 'OB3-OPEN-99-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(111, 99, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-99-03', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(112, 99, 'MASUK', 1, 5, 'INITIAL_STOCK', 'OB3-OPEN-99-04', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(113, 101, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-101-01', 'Saldo awal stok ban baru: Dunlop Blue Response TG', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(114, 102, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-102-01', 'Saldo awal stok ban baru: Dunlop Blue Response TG', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(115, 103, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-103-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(116, 103, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-103-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(117, 104, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-104-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(118, 104, 'MASUK', 4, 7, 'INITIAL_STOCK', 'OB3-OPEN-104-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(119, 105, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-105-01', 'Saldo awal stok ban baru: Dunlop LM705', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(120, 106, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-106-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(121, 106, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-106-02', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(122, 107, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-107-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(123, 107, 'MASUK', 5, 7, 'INITIAL_STOCK', 'OB3-OPEN-107-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(124, 108, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-108-01', 'Saldo awal stok ban baru: Dunlop LM705', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(125, 109, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-109-01', 'Saldo awal stok ban baru: Dunlop Enasave (Taqi)', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(126, 110, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-110-01', 'Saldo awal stok ban baru: Dlp Grandtrek ST20', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(127, 110, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-110-02', 'Saldo awal stok ban baru: Dlp Grandtrek ST20', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(128, 111, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-111-01', 'Saldo awal stok ban baru: Dunlop Blue Response TG', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(129, 112, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-112-01', 'Saldo awal stok ban baru: Dunlop Grandtrek ST20', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(130, 114, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-114-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(131, 114, 'MASUK', 3, 4, 'INITIAL_STOCK', 'OB3-OPEN-114-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(132, 115, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-115-01', 'Saldo awal stok ban baru: Dunlop SP Sportmaxx 050', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(133, 115, 'MASUK', 2, 5, 'INITIAL_STOCK', 'OB3-OPEN-115-02', 'Saldo awal stok ban baru: Dunlop SP Sportmaxx 050', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(134, 116, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-116-01', 'Saldo awal stok ban baru: Dunlop Blue Response TG', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(135, 117, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-117-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(136, 117, 'MASUK', 5, 6, 'INITIAL_STOCK', 'OB3-OPEN-117-02', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(137, 118, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-118-01', 'Saldo awal stok ban baru: Dunlop Grandtrek ST30', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(138, 118, 'MASUK', 2, 3, 'INITIAL_STOCK', 'OB3-OPEN-118-02', 'Saldo awal stok ban baru: Dunlop Grandtrek ST30', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(139, 119, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-119-01', 'Saldo awal stok ban baru: Dunlop Grandtrek AT25', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(140, 119, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-119-02', 'Saldo awal stok ban baru: Dunlop Grandtrek AT25', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(141, 120, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-120-01', 'Saldo awal stok ban baru: Dunlop Blue Response TG', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(142, 121, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-121-01', 'Saldo awal stok ban baru: Dunlop Grandtrek AT25', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(143, 122, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-122-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(144, 123, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-123-01', 'Saldo awal stok ban baru: GT Champiro BXT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(145, 125, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-125-01', 'Saldo awal stok ban baru: GT Super', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(146, 127, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-127-01', 'Saldo awal stok ban baru: GT Champiro Eco', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(147, 128, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-128-01', 'Saldo awal stok ban baru: GT Champiro Eco', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(148, 128, 'MASUK', 3, 9, 'INITIAL_STOCK', 'OB3-OPEN-128-02', 'Saldo awal stok ban baru: GT Champiro Eco', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(149, 129, 'MASUK', 9, 9, 'INITIAL_STOCK', 'OB3-OPEN-129-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(150, 130, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-130-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(151, 131, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-131-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(152, 131, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-131-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(153, 131, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-131-03', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(154, 132, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-132-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(155, 132, 'MASUK', 3, 4, 'INITIAL_STOCK', 'OB3-OPEN-132-02', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(156, 133, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-133-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(157, 135, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-135-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(158, 135, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-135-02', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(159, 136, 'MASUK', 7, 7, 'INITIAL_STOCK', 'OB3-OPEN-136-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(160, 136, 'MASUK', 2, 9, 'INITIAL_STOCK', 'OB3-OPEN-136-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(161, 136, 'MASUK', 6, 15, 'INITIAL_STOCK', 'OB3-OPEN-136-03', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(162, 137, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-137-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(163, 138, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-138-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(164, 138, 'MASUK', 8, 12, 'INITIAL_STOCK', 'OB3-OPEN-138-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(165, 139, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-139-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(166, 140, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-140-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(167, 142, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-142-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(168, 142, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-142-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(169, 143, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-143-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(170, 143, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-143-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(171, 144, 'MASUK', 7, 7, 'INITIAL_STOCK', 'OB3-OPEN-144-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(172, 144, 'MASUK', 8, 15, 'INITIAL_STOCK', 'OB3-OPEN-144-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(173, 145, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-145-01', 'Saldo awal stok ban baru: GT Savero', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(174, 146, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-146-01', 'Saldo awal stok ban baru: GT Maxmiller', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(175, 147, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-147-01', 'Saldo awal stok ban baru: GT SX2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(176, 148, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-148-01', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(177, 149, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-149-01', 'Saldo awal stok ban baru: GT SX2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(178, 150, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-150-01', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(179, 151, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-151-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(180, 152, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-152-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(181, 153, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-153-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(182, 153, 'MASUK', 4, 7, 'INITIAL_STOCK', 'OB3-OPEN-153-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:52', NULL),
(183, 156, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-156-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(184, 157, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-157-01', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(185, 158, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-158-01', 'Saldo awal stok ban baru: GT Savero MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(186, 159, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-159-01', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(187, 159, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-159-02', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(188, 162, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-162-01', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(189, 162, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-162-02', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(190, 163, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-163-01', 'Saldo awal stok ban baru: GT Komodo MT Plus', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(191, 164, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-164-01', 'Saldo awal stok ban baru: GT Savero Komex', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(192, 165, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-165-01', 'Saldo awal stok ban baru: GT Savero MT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(193, 167, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-167-01', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(194, 169, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-169-01', 'Saldo awal stok ban baru: GT Savero MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(195, 169, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-169-02', 'Saldo awal stok ban baru: GT Savero MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(196, 170, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-170-01', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(197, 171, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-171-01', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(198, 172, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-172-01', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(199, 173, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-173-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(200, 173, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-173-02', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(201, 174, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-174-01', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(202, 174, 'MASUK', 4, 6, 'INITIAL_STOCK', 'OB3-OPEN-174-02', 'Saldo awal stok ban baru: GT GTX Pro2', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(203, 175, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-175-01', 'Saldo awal stok ban baru: GT Champiro Luxe', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(204, 175, 'MASUK', 4, 5, 'INITIAL_STOCK', 'OB3-OPEN-175-02', 'Saldo awal stok ban baru: GT Champiro Luxe', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(205, 176, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-176-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(206, 176, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-176-02', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(207, 177, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-177-01', 'Saldo awal stok ban baru: GT Maxmiler', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(208, 178, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-178-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(209, 179, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-179-01', 'Saldo awal stok ban baru: GT Max Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(210, 180, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-180-01', 'Saldo awal stok ban baru: GT Savero MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(211, 183, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-183-01', 'Saldo awal stok ban baru: GT GTX Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(212, 184, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-184-01', 'Saldo awal stok ban baru: GT GTX Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(213, 185, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-185-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(214, 186, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-186-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(215, 186, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-186-02', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(216, 187, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-187-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(217, 187, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-187-02', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(218, 188, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-188-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(219, 189, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-189-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(220, 190, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-190-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(221, 191, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-191-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(222, 193, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-193-01', 'Saldo awal stok ban baru: Acc Gamma', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(223, 195, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-195-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(224, 195, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-195-02', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(225, 196, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-196-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(226, 197, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-197-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(227, 197, 'MASUK', 1, 13, 'INITIAL_STOCK', 'OB3-OPEN-197-02', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(228, 198, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-198-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(229, 198, 'MASUK', 10, 14, 'INITIAL_STOCK', 'OB3-OPEN-198-02', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(230, 199, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-199-01', 'Saldo awal stok ban baru: Acc PHI-R', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(231, 200, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-200-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(232, 201, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-201-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(233, 201, 'MASUK', 2, 3, 'INITIAL_STOCK', 'OB3-OPEN-201-02', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(234, 201, 'MASUK', 4, 7, 'INITIAL_STOCK', 'OB3-OPEN-201-03', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(235, 201, 'MASUK', 1, 8, 'INITIAL_STOCK', 'OB3-OPEN-201-04', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(236, 202, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-202-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(237, 203, 'MASUK', 17, 17, 'INITIAL_STOCK', 'OB3-OPEN-203-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(238, 204, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-204-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(239, 205, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-205-01', 'Saldo awal stok ban baru: Acc 651 Sport', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(240, 207, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-207-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(241, 208, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-208-01', 'Saldo awal stok ban baru: Acc 651 Sport. Semilsick', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(242, 209, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-209-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(243, 209, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-209-02', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(244, 210, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-210-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(245, 211, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-211-01', 'Saldo awal stok ban baru: Acc Omicron AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(246, 212, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-212-01', 'Saldo awal stok ban baru: Acc Omicron AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(247, 212, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-212-02', 'Saldo awal stok ban baru: Acc Omicron AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(248, 216, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-216-01', 'Saldo awal stok ban baru: Acc MT 01', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(249, 220, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-220-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(250, 220, 'MASUK', 3, 6, 'INITIAL_STOCK', 'OB3-OPEN-220-02', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(251, 221, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-221-01', 'Saldo awal stok ban baru: Acc PHI-R', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(252, 222, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-222-01', 'Saldo awal stok ban baru: Acc 651 Sport. Semislick', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(253, 223, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-223-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(254, 224, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-224-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(255, 225, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-225-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(256, 226, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-226-01', 'Saldo awal stok ban baru: Acc 651 Sport', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(257, 227, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-227-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(258, 228, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-228-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(259, 228, 'MASUK', 5, 6, 'INITIAL_STOCK', 'OB3-OPEN-228-02', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(260, 229, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-229-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(261, 230, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-230-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(262, 231, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-231-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(263, 233, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-233-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(264, 233, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-233-02', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(265, 234, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-234-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(266, 235, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-235-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(267, 236, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-236-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(268, 236, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-236-02', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(269, 237, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-237-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(270, 240, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-240-01', 'Saldo awal stok ban baru: Acc 651', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(271, 241, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-241-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(272, 242, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-242-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(273, 243, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-243-01', 'Saldo awal stok ban baru: Acc PHI-R', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(274, 244, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-244-01', 'Saldo awal stok ban baru: Acc PHI X-Boost', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(275, 245, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-245-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(276, 249, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-249-01', 'Saldo awal stok ban baru: Acc IOTA', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(277, 250, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-250-01', 'Saldo awal stok ban baru: Acc PHI', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(278, 251, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-251-01', 'Saldo awal stok ban baru: Acc Omikron AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(279, 252, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-252-01', 'Saldo awal stok ban baru: Acc MT 01', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(280, 259, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-259-01', 'Saldo awal stok ban baru: Delium Power Saver', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(281, 260, 'MASUK', 7, 7, 'INITIAL_STOCK', 'OB3-OPEN-260-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(282, 261, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-261-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(283, 262, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-262-01', 'Saldo awal stok ban baru: Delium Power Saver', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(284, 263, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-263-01', 'Saldo awal stok ban baru: Delium Evotechno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:53', NULL),
(285, 264, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-264-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(286, 265, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-265-01', 'Saldo awal stok ban baru: Delium Power Saver', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(287, 265, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-265-02', 'Saldo awal stok ban baru: Delium Power Saver', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(288, 266, 'MASUK', 7, 7, 'INITIAL_STOCK', 'OB3-OPEN-266-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(289, 267, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-267-01', 'Saldo awal stok ban baru: Delium Power Ranger', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(290, 268, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-268-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(291, 269, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-269-01', 'Saldo awal stok ban baru: Delium T.Cruiser', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(292, 270, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-270-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(293, 271, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-271-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(294, 271, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-271-02', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(295, 272, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-272-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(296, 273, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-273-01', 'Saldo awal stok ban baru: Delium Evoraze (semislick)', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(297, 273, 'MASUK', 2, 6, 'INITIAL_STOCK', 'OB3-OPEN-273-02', 'Saldo awal stok ban baru: Delium Evoraze (semislick)', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(298, 274, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-274-01', 'Saldo awal stok ban baru: Delium Evoraze (semislick)', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(299, 274, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-274-02', 'Saldo awal stok ban baru: Delium Evoraze (semislick)', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(300, 275, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-275-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(301, 276, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-276-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(302, 277, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-277-01', 'Saldo awal stok ban baru: Delium T Cruiser AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(303, 278, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-278-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(304, 278, 'MASUK', 2, 8, 'INITIAL_STOCK', 'OB3-OPEN-278-02', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(305, 279, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-279-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(306, 280, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-280-01', 'Saldo awal stok ban baru: Delium T Cruiser AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(307, 280, 'MASUK', 3, 5, 'INITIAL_STOCK', 'OB3-OPEN-280-02', 'Saldo awal stok ban baru: Delium T Cruiser AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(308, 281, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-281-01', 'Saldo awal stok ban baru: Delium T Cruiser AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(309, 282, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-282-01', 'Saldo awal stok ban baru: Delium T Mania Extreme', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(310, 283, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-283-01', 'Saldo awal stok ban baru: Delium Evoraze', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(311, 284, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-284-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(312, 284, 'MASUK', 2, 8, 'INITIAL_STOCK', 'OB3-OPEN-284-02', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(313, 285, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-285-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(314, 286, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-286-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(315, 286, 'MASUK', 2, 5, 'INITIAL_STOCK', 'OB3-OPEN-286-02', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(316, 287, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-287-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL);
INSERT INTO `stock_movements` (`id`, `product_id`, `movement_type`, `quantity`, `balance_after`, `reference_type`, `reference_id`, `description`, `operator_name`, `branch_id`, `created_at`, `updated_at`) VALUES
(317, 287, 'MASUK', 2, 8, 'INITIAL_STOCK', 'OB3-OPEN-287-02', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(318, 288, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-288-01', 'Saldo awal stok ban baru: Delium Evoraze', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(319, 289, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-289-01', 'Saldo awal stok ban baru: Delium Evoraze', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(320, 289, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-289-02', 'Saldo awal stok ban baru: Delium Evoraze', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(321, 290, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-290-01', 'Saldo awal stok ban baru: Sailun', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(322, 291, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-291-01', 'Saldo awal stok ban baru: Achilles Duragrib', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(323, 292, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-292-01', 'Saldo awal stok ban baru: Sailun', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(324, 293, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-293-01', 'Saldo awal stok ban baru: Achilles ultravan', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(325, 294, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-294-01', 'Saldo awal stok ban baru: Sailun', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(326, 295, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-295-01', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(327, 295, 'MASUK', 4, 8, 'INITIAL_STOCK', 'OB3-OPEN-295-02', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(328, 296, 'MASUK', 65, 65, 'INITIAL_STOCK', 'OB3-OPEN-296-01', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(329, 297, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-297-01', 'Saldo awal stok ban baru: HANKOOK Kinergy Eco', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(330, 297, 'MASUK', 1, 2, 'INITIAL_STOCK', 'OB3-OPEN-297-02', 'Saldo awal stok ban baru: HANKOOK Kinergy Eco', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(331, 300, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-300-01', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(332, 301, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-301-01', 'Saldo awal stok ban baru: SWALLOW', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(333, 304, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-304-01', 'Saldo awal stok ban baru: Achilles ATR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(334, 308, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-308-01', 'Saldo awal stok ban baru: Achilles ATR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(335, 309, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-309-01', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(336, 309, 'MASUK', 4, 8, 'INITIAL_STOCK', 'OB3-OPEN-309-02', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(337, 310, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-310-01', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(338, 310, 'MASUK', 3, 6, 'INITIAL_STOCK', 'OB3-OPEN-310-02', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(339, 312, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-312-01', 'Saldo awal stok ban baru: Achilles 2233', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(340, 313, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-313-01', 'Saldo awal stok ban baru: PIRELLI', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(341, 314, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-314-01', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(342, 314, 'MASUK', 1, 2, 'INITIAL_STOCK', 'OB3-OPEN-314-02', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(343, 316, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-316-01', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(344, 317, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-317-01', 'Saldo awal stok ban baru: YOKOHAMA GEOLANDAR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(345, 318, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-318-01', 'Saldo awal stok ban baru: CONTINENTAL', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(346, 325, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-325-01', 'Saldo awal stok ban baru: Swallow HD', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(347, 325, 'MASUK', 1, 4, 'INITIAL_STOCK', 'OB3-OPEN-325-02', 'Saldo awal stok ban baru: Swallow HD', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(348, 326, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-326-01', 'Saldo awal stok ban baru: Swallow HD', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(349, 332, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-332-01', 'Saldo awal stok ban baru: Delium Velocita', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(350, 333, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-333-01', 'Saldo awal stok ban baru: Delium Velocita', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(351, 334, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-334-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(352, 335, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-335-01', 'Saldo awal stok ban baru: Bs Duravis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(353, 336, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-336-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(354, 337, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-337-01', 'Saldo awal stok ban baru: Bs Turanza T005A', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(355, 338, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-338-01', 'Saldo awal stok ban baru: Bs Turanza T005A', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(356, 339, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-339-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(357, 340, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-340-01', 'Saldo awal stok ban baru: Bridgestone Techno (2025)', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(358, 341, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-341-01', 'Saldo awal stok ban baru: Bs Turanza', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(359, 343, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-343-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(360, 344, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-344-01', 'Saldo awal stok ban baru: Bs D-HT 687', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(361, 345, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-345-01', 'Saldo awal stok ban baru: Bs Turanza T005', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(362, 346, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-346-01', 'Saldo awal stok ban baru: Bs Dueler HT D689', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(363, 347, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-347-01', 'Saldo awal stok ban baru: Bs Dueler AT D697', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(364, 348, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-348-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(365, 349, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-349-01', 'Saldo awal stok ban baru: Bs Ecopia', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(366, 350, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-350-01', 'Saldo awal stok ban baru: Bs Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(367, 351, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-351-01', 'Saldo awal stok ban baru: Bs Turanza AR20', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(368, 352, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-352-01', 'Saldo awal stok ban baru: Bs Dueler HT D689', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(369, 353, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-353-01', 'Saldo awal stok ban baru: Bs Dueler HT D687', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(370, 354, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-354-01', 'Saldo awal stok ban baru: Bs Dueler HT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(371, 355, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-355-01', 'Saldo awal stok ban baru: Bs Turanza ER33', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(372, 357, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-357-01', 'Saldo awal stok ban baru: Bs Alenza AL01 T', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(373, 358, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-358-01', 'Saldo awal stok ban baru: Bs Dueler HT D687', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(374, 359, 'MASUK', 8, 8, 'INITIAL_STOCK', 'OB3-OPEN-359-01', 'Saldo awal stok ban baru: Bs Dueler HT copotan', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(375, 360, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-360-01', 'Saldo awal stok ban baru: Bs Dueler AT D697', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(376, 361, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-361-01', 'Saldo awal stok ban baru: Bs Dueler AT D697', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(377, 362, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-362-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(378, 363, 'MASUK', 12, 12, 'INITIAL_STOCK', 'OB3-OPEN-363-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(379, 364, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-364-01', 'Saldo awal stok ban baru: Dunlop SP31', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(380, 365, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-365-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(381, 366, 'MASUK', 11, 11, 'INITIAL_STOCK', 'OB3-OPEN-366-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(382, 367, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-367-01', 'Saldo awal stok ban baru: Dunlop Touring R1', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(383, 368, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-368-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(384, 369, 'MASUK', 19, 19, 'INITIAL_STOCK', 'OB3-OPEN-369-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(385, 370, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-370-01', 'Saldo awal stok ban baru: Dunlop Enasave', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(386, 371, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-371-01', 'Saldo awal stok ban baru: GT Super', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(387, 372, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-372-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(388, 373, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-373-01', 'Saldo awal stok ban baru: GT Super', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(389, 373, 'MASUK', 3, 4, 'INITIAL_STOCK', 'OB3-OPEN-373-02', 'Saldo awal stok ban baru: GT Super', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(390, 374, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-374-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(391, 375, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-375-01', 'Saldo awal stok ban baru: GT Savero Komodo MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(392, 376, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-376-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(393, 377, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-377-01', 'Saldo awal stok ban baru: GT Champiro Ecotec', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(394, 378, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-378-01', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(395, 379, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-379-01', 'Saldo awal stok ban baru: GT Savero AT Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(396, 380, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-380-01', 'Saldo awal stok ban baru: GT Savero AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(397, 381, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-381-01', 'Saldo awal stok ban baru: GT Savero Komodo MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(398, 382, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-382-01', 'Saldo awal stok ban baru: GT Savero AT Plus', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(399, 383, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-383-01', 'Saldo awal stok ban baru: GT Savero Komex', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(400, 384, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-384-01', 'Saldo awal stok ban baru: GT Savero MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(401, 385, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-385-01', 'Saldo awal stok ban baru: GT GTX Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:54', NULL),
(402, 386, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-386-01', 'Saldo awal stok ban baru: GT GTX Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(403, 387, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-387-01', 'Saldo awal stok ban baru: GT GTX Pro', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(404, 388, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-388-01', 'Saldo awal stok ban baru: GT Savero AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(405, 389, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-389-01', 'Saldo awal stok ban baru: GT Savero MT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(406, 390, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-390-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(407, 391, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-391-01', 'Saldo awal stok ban baru: GT Savero SUV', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(408, 392, 'MASUK', 20, 20, 'INITIAL_STOCK', 'OB3-OPEN-392-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(409, 393, 'MASUK', 3, 3, 'INITIAL_STOCK', 'OB3-OPEN-393-01', 'Saldo awal stok ban baru: Forceum EXP Sport. Semislick', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(410, 394, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-394-01', 'Saldo awal stok ban baru: Acc MT 01', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(411, 394, 'MASUK', 1, 2, 'INITIAL_STOCK', 'OB3-OPEN-394-02', 'Saldo awal stok ban baru: Acc MT 01', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(412, 394, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-394-03', 'Saldo awal stok ban baru: Acc MT 01', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(413, 395, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-395-01', 'Saldo awal stok ban baru: Forceum AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(414, 396, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-396-01', 'Saldo awal stok ban baru: Acc MT 01', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(415, 397, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-397-01', 'Saldo awal stok ban baru: Acc PHI-R', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(416, 398, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-398-01', 'Saldo awal stok ban baru: Acc Ecoplush', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(417, 399, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-399-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(418, 400, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-400-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(419, 402, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-402-01', 'Saldo awal stok ban baru: Acc Omikron AT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(420, 403, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-403-01', 'Saldo awal stok ban baru: Acc IOTA', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(421, 404, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-404-01', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(422, 404, 'MASUK', 2, 4, 'INITIAL_STOCK', 'OB3-OPEN-404-02', 'Saldo awal stok ban baru: HANKOOK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(423, 405, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-405-01', 'Saldo awal stok ban baru: Delium Evo Techno', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(424, 406, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-406-01', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(425, 407, 'MASUK', 45, 45, 'INITIAL_STOCK', 'OB3-OPEN-407-01', 'Saldo awal stok ban baru: Laufen', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(426, 408, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-408-01', 'Saldo awal stok ban baru: Achilles 868', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(427, 409, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-409-01', 'Saldo awal stok ban baru: Achilles ATRK', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(428, 410, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-410-01', 'Saldo awal stok ban baru: Achilles Economis', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(429, 411, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-411-01', 'Saldo awal stok ban baru: Achilles 122', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(430, 412, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-412-01', 'Saldo awal stok ban baru: Achilles ATR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(431, 413, 'MASUK', 6, 6, 'INITIAL_STOCK', 'OB3-OPEN-413-01', 'Saldo awal stok ban baru: Goodyear', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(432, 414, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-414-01', 'Saldo awal stok ban baru: Achilles MULTIVAN', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(433, 415, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-415-01', 'Saldo awal stok ban baru: Achilles ATR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(434, 416, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-416-01', 'Saldo awal stok ban baru: Achilles ATR', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(435, 417, 'MASUK', 5, 5, 'INITIAL_STOCK', 'OB3-OPEN-417-01', 'Saldo awal stok ban baru: CONTINENTAL', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(436, 418, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-418-01', 'Saldo awal stok ban baru: Achilles UHP', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(437, 419, 'MASUK', 2, 2, 'INITIAL_STOCK', 'OB3-OPEN-419-01', 'Saldo awal stok ban baru: GT Super', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(438, 421, 'MASUK', 4, 4, 'INITIAL_STOCK', 'OB3-OPEN-421-01', 'Saldo awal stok ban baru: Bs T6', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(439, 422, 'MASUK', 1, 1, 'INITIAL_STOCK', 'OB3-OPEN-422-01', 'Saldo awal stok ban baru: Acc IOTA EVT', 'Seeder Saldo Awal', 3, '2026-10-05 08:32:55', NULL),
(440, 205, 'KELUAR', 2, 2, 'SALE', 'OB3-INV-202610-0001', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-10-05 08:41:10', NULL),
(441, 205, 'MASUK', 1, 3, 'SALES_RETURN', 'RTJ-202610-0001', 'Retur penjualan nota OB3-INV-202610-0001', 'Kasir OB3', 3, '2026-10-05 08:42:05', NULL),
(442, 240, 'MASUK', 4, 6, 'GOODS_RECEIPT', 'BATCH-ACC-22540-18-0242-20261005-94', 'Penerimaan barang dari Grazia Ban', 'Admin Gudang OB3', 3, '2026-10-05 08:53:20', NULL),
(443, 240, 'KELUAR', 1, 5, 'PURCHASE_RETURN', 'RTB-202610-0001', 'Retur ke supplier Grazia Ban (GR-202610-0001)', 'Admin Gudang OB3', 3, '2026-10-05 08:55:12', NULL),
(444, 240, 'KELUAR', 1, 4, 'STOCK_OPNAME', 'OPN-202610-0001', 'Stock opname: sistem 5, fisik 4 (Stock Opname Fisik Bulanan Cabang 3 (OPNAME-OB3-202610-0001))', 'Admin Gudang OB3', 3, '2026-10-05 08:56:55', NULL),
(445, 226, 'MASUK', 1, 5, 'STOCK_OPNAME', 'OPN-202610-0001', 'Stock opname: sistem 4, fisik 5 (Stock Opname Fisik Bulanan Cabang 3 (OPNAME-OB3-202610-0001))', 'Admin Gudang OB3', 3, '2026-10-05 08:56:55', NULL),
(446, 226, 'KELUAR', 1, 4, 'SALE', 'OB3-INV-202610-0002', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-10-05 09:13:04', NULL),
(447, 226, 'MASUK', 1, 5, 'SALE_VOID', 'OB3-INV-202610-0002', 'Pengembalian stok void nota OB3-INV-202610-0002', 'Agus Subagyo', 3, '2026-10-05 09:14:27', NULL),
(448, 240, 'MASUK', 2, 6, 'GOODS_RECEIPT', 'BATCH-ACC-22540-18-0242-20261005-99', 'Penerimaan barang dari Grazia Ban', 'Agus Subagyo', 3, '2026-10-05 09:54:41', NULL),
(449, 240, 'KELUAR', 2, 4, 'GOODS_RECEIPT_CANCEL', 'RTB-202610-0002', 'Pembatalan penerimaan GR-202610-0002', 'Agus Subagyo', 3, '2026-10-05 09:55:10', NULL),
(450, 1, 'MASUK', 8, 32, 'GOODS_RECEIPT', 'BATCH-BAN-BS-185-65-R15-20261110-50', 'Penerimaan barang dari PT Bridgestone Tire Indonesia', 'Admin Gudang OB3', 3, '2026-11-10 04:00:00', NULL),
(451, 2, 'MASUK', 6, 24, 'GOODS_RECEIPT', 'BATCH-BAN-ACC-195-50-R16-20261114-45', 'Penerimaan barang dari PT Elangperdana Tyre Industry (Accelera)', 'Admin Gudang OB3', 3, '2026-11-14 06:15:00', NULL),
(452, 2, 'KELUAR', 1, 23, 'PURCHASE_RETURN', 'RTB-202611-0001', 'Retur ke supplier PT Elangperdana Tyre Industry (Accelera) (GR-202611-0002)', 'Admin Gudang OB3', 3, '2026-11-16 03:00:00', NULL),
(453, 407, 'MASUK', 6, 51, 'GOODS_RECEIPT', 'BATCH-LAU-17565-14-0339-20261120-24', 'Penerimaan barang dari Masa Sempurna', 'Admin Gudang OB3', 3, '2026-11-20 08:00:00', NULL),
(454, 405, 'MASUK', 1, 2, 'STOCK_OPNAME', 'OPN-202611-0001', 'Stock opname: sistem 1, fisik 2 (Temuan 1 unit fisik tambahan di rak belakang saat stock opname November)', 'Admin Gudang OB3', 3, '2026-11-19 09:00:00', NULL),
(455, 21, 'KELUAR', 2, 8, 'SALE', 'OB3-INV-202611-0001', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-21 03:15:00', NULL),
(456, 251, 'KELUAR', 1, 3, 'SALE', 'OB3-INV-202611-0002', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-21 07:45:00', NULL),
(457, 7, 'KELUAR', 6, 4, 'SALE', 'OB3-INV-202611-0003', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-22 03:30:00', NULL),
(458, 60, 'KELUAR', 2, 0, 'SALE', 'OB3-INV-202611-0004', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-22 06:10:00', NULL),
(459, 60, 'MASUK', 1, 1, 'SALES_RETURN', 'RTJ-202611-0001', 'Retur penjualan nota OB3-INV-202611-0004', 'Kasir OB3', 3, '2026-11-22 08:00:00', NULL),
(460, 1, 'KELUAR', 2, 30, 'SALE', 'OB3-INV-202611-0005', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-23 02:15:00', NULL),
(461, 2, 'KELUAR', 2, 21, 'SALE', 'OB3-INV-202611-0006', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-23 03:05:00', NULL),
(462, 60, 'KELUAR', 1, 0, 'SALE', 'OB3-INV-202611-0007', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-23 03:35:00', NULL),
(463, 364, 'KELUAR', 1, 1, 'SALE', 'OB3-INV-202611-0008', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-23 03:55:00', NULL),
(464, 364, 'MASUK', 1, 2, 'SALE_VOID', 'OB3-INV-202611-0008', 'Pengembalian stok void nota OB3-INV-202611-0008', 'Agus Subagyo', 3, '2026-11-23 04:02:00', NULL),
(465, 11, 'KELUAR', 2, 4, 'SALE', 'OB3-INV-202611-0010', 'Penjualan ban POS Kasir (FIFO allocation)', 'Kasir OB3', 3, '2026-11-23 04:45:00', NULL);

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
(1, 'Agus Subagyo', 'owner', 'owner@omahban.com', 'OWNER', '0822-2786-3969', 1, NULL, '$2y$12$v2t9/.C2BRmzJjxwdetdWufMqdDthVlJ10/va0Wckv/56yqSgHY9a', NULL, '2026-10-05 08:32:49', '2026-10-05 08:32:49'),
(2, 'Kasir OB3', 'kasir', 'kasir@omahban.com', 'KASIR', '0812-3456-7893', 1, NULL, '$2y$12$XqmTX6Q6.AWSlIfFTTMCu.UM1VeETWMSZTSIHp08zeIkKx0L3uEfa', NULL, '2026-10-05 08:32:50', '2026-10-05 08:32:50'),
(3, 'Admin Gudang OB3', 'gudang', 'gudang@omahban.com', 'GUDANG', '0812-3456-7892', 1, NULL, '$2y$12$gmwk8gspeaXcBueqmNv6UOe8oSV1zj9uCIcsOl4a8Nrhd6JL3ezwa', NULL, '2026-10-05 08:32:51', '2026-10-05 08:32:51');

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
  ADD KEY `product_price_audits_product_id_index` (`product_id`);

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `accounts`
--
ALTER TABLE `accounts`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `bank_reconciliations`
--
ALTER TABLE `bank_reconciliations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `bank_statement_lines`
--
ALTER TABLE `bank_statement_lines`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `brands`
--
ALTER TABLE `brands`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `brand_aliases`
--
ALTER TABLE `brand_aliases`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=28;

--
-- AUTO_INCREMENT for table `cash_sessions`
--
ALTER TABLE `cash_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `edc_settings`
--
ALTER TABLE `edc_settings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `fixed_asset_depreciations`
--
ALTER TABLE `fixed_asset_depreciations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `journal_entries`
--
ALTER TABLE `journal_entries`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `journal_items`
--
ALTER TABLE `journal_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=173;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=425;

--
-- AUTO_INCREMENT for table `product_batches`
--
ALTER TABLE `product_batches`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=447;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `purchase_payments`
--
ALTER TABLE `purchase_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `purchase_returns`
--
ALTER TABLE `purchase_returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `purchase_return_items`
--
ALTER TABLE `purchase_return_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `qris_transactions`
--
ALTER TABLE `qris_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `sales_bookings`
--
ALTER TABLE `sales_bookings`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sales_returns`
--
ALTER TABLE `sales_returns`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sales_return_items`
--
ALTER TABLE `sales_return_items`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `sale_batch_allocations`
--
ALTER TABLE `sale_batch_allocations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `sale_details`
--
ALTER TABLE `sale_details`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `sale_payments`
--
ALTER TABLE `sale_payments`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

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
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=466;

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
  ADD CONSTRAINT `product_price_audits_product_id_foreign` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

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
