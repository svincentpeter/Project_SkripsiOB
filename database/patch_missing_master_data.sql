-- ==============================================================================
-- PATCH SQL PELENGKAP DATABASE: project-skripsi_ob
-- Menambahkan data master & kelengkapan kolom yang masih kosong di dump SQL
-- Tanpa mengubah saldo jurnal buku besar (1-2000) maupun layer FIFO yang sudah klop.
-- ==============================================================================

START TRANSACTION;

-- ------------------------------------------------------------------------------
-- 1. ISI TABEL `service_categories` (Sebelumnya 0 baris di project-skripsi_ob.sql)
--    Menyesuaikan dengan 5 kategori pada tabel `service_masters`
-- ------------------------------------------------------------------------------
INSERT INTO `service_categories` (`code`, `name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
('SPOORING', 'Spooring 3D & Alignment', 'Layanan penyelarasan sudut roda komputerisasi 3D', 1, NOW(), NOW()),
('BALANCING', 'Balancing Roda', 'Penyeimbangan putaran roda dan timah balancing', 1, NOW(), NOW()),
('SERVICE', 'Jasa Bengkel & Pemasangan', 'Bongkar pasang ban, tambal tubeless/tiptop, nitrogen, dan rotasi', 1, NOW(), NOW()),
('GOODS', 'Suku Cadang Kecil & Pentil', 'Dop pentil tubeless dan mur roda standar', 1, NOW(), NOW()),
('CUSTOM', 'Jasa & Variasi Kustom', 'Baut chamber kit, mur variasi, dan setting kaki-kaki', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();

-- ------------------------------------------------------------------------------
-- 2. LENGKAPI TABEL `product_categories` (Sebelumnya baru 2 baris: BAN-MOBIL, BAN-TRUCK)
--    Menambahkan kategori Velg, Ban Dalam, Oli & Pelumas, dan Aksesoris
-- ------------------------------------------------------------------------------
INSERT INTO `product_categories` (`category_code`, `category_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
('VELG', 'Velg Mobil Racing & OEM', 'Velg mobil variasi dan standar pabrik', 1, NOW(), NOW()),
('BAN_DALAM', 'Ban Dalam & Marset (Flap)', 'Ban dalam tube type, karet marset pelindung velg, dan pentil', 1, NOW(), NOW()),
('OLI_PELUMAS', 'Oli & Pelumas Mesin', 'Pelumas mesin bensin/diesel dan filter oli', 1, NOW(), NOW()),
('AKSESORIS', 'Aksesoris & Mur Roda', 'Baut roda racing, center ring velg, dan spacer', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `category_name` = VALUES(`category_name`),
  `description` = VALUES(`description`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();

-- ------------------------------------------------------------------------------
-- 3. LENGKAPI KOLOM `brand_id` YANG MASIH NULL PADA TABEL `products` (ID 1 & 2)
-- ------------------------------------------------------------------------------
UPDATE `products` p
JOIN `brands` b ON LOWER(p.`brand`) = LOWER(b.`name`)
SET p.`brand_id` = b.`id`,
    p.`updated_at` = NOW()
WHERE p.`brand_id` IS NULL;

-- ------------------------------------------------------------------------------
-- 4. LENGKAPI KOLOM `size_width` & `size_ratio` YANG MASIH 0 PADA TABEL `products`
--    Mengekstrak lebar tapak (misal 185) dan rasio (misal 65) dari `product_size` ('185/65 R15')
-- ------------------------------------------------------------------------------
UPDATE `products`
SET
  `size_width` = CAST(SUBSTRING_INDEX(`product_size`, '/', 1) AS UNSIGNED),
  `size_ratio` = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(`product_size`, '/', -1), ' ', 1) AS UNSIGNED)
WHERE `product_size` REGEXP '^[0-9]{3}/[0-9]{2} '
  AND (`size_width` = 0 OR `size_ratio` = 0);

-- Untuk ban komersial tanpa rasio eksplisit (misal '165 R13', '195 R14') -> rasio standar 80
UPDATE `products`
SET
  `size_width` = CAST(SUBSTRING_INDEX(`product_size`, ' ', 1) AS UNSIGNED),
  `size_ratio` = 80
WHERE `product_size` REGEXP '^[0-9]{3} R[0-9]{2}'
  AND `size_width` = 0;

-- Untuk ban off-road ukuran inci (misal '27/8.5 R15', '30/9.5 R15', '31/10.5 R15', '33/12.5 R15', '31x10,5 R15')
UPDATE `products`
SET
  `size_width` = CAST(SUBSTRING_INDEX(REPLACE(`product_size`, 'x', '/'), '/', 1) AS UNSIGNED),
  `size_ratio` = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(REPLACE(REPLACE(`product_size`, 'x', '/'), ',', '.'), '/', -1), ' ', 1) * 10 AS UNSIGNED)
WHERE `product_size` REGEXP '^[0-9]{2}[/x][0-9]+'
  AND `size_width` = 0;

COMMIT;
