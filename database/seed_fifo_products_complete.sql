-- ==============================================================================
-- SQL SEEDER DATA LENGKAP: KATALOG PRODUK & SIMULASI FIFO BATCH CABANG 3 (OB3)
-- Karakteristik: Standalone POS, Khusus Ban BARU, Velg Racing, Ban Dalam & Oli
-- Costing Method: FIFO (First In First Out via product_batches)
-- Kompatibel: MySQL 8.x / MariaDB 10.x / phpMyAdmin / Laravel Artisan
-- Disesuaikan 100% dengan struktur database: project-skripsi_ob
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABEL MASTER DISTRIBUTOR / SUPPLIER
-- ------------------------------------------------------------------------------
INSERT INTO `suppliers` (`id`, `supplier_code`, `supplier_name`, `phone`, `email`, `address`, `contact_person`, `payment_terms_days`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'SUP-BST-01', 'PT Bridgestone Tire Indonesia', '021-89830001', 'order@bridgestone.co.id', 'Kawasan Industri Suryacipta, Karawang Timur, Jawa Barat', 'Bpk. Agus Santoso', 30, 1, NOW(), NOW()),
(2, 'SUP-ELP-02', 'PT Elangperdana Tyre Industry', '0251-8656110', 'sales@eptyres.com', 'Jl. Elang No. 1 Desa Sukahati, Citeureup, Bogor', 'Ibu Rina Wijaya', 45, 1, NOW(), NOW()),
(3, 'SUP-GT-03', 'PT Gajah Tunggal Tbk', '021-3863410', 'orders@gtradial.co.id', 'Wisma Hayam Wuruk Lt. 10, Jl. Hayam Wuruk No. 8, Jakarta Pusat', 'Bpk. Budi Hermawan', 30, 1, NOW(), NOW()),
(4, 'SUP-SUMI-04', 'PT Sumi Rubber Indonesia (Dunlop)', '021-8972100', 'order@dunlop.co.id', 'Kawasan Industri Indotaisei Sektor IA Blok H, Cikampek, Karawang', 'Bpk. Hendra Gunawan', 30, 1, NOW(), NOW()),
(5, 'SUP-HNK-05', 'PT Hankook Tire Indonesia', '021-89880000', 'sales.indo@hankooktech.com', 'Kawasan Industri Delta Silicon 5, Cikarang Pusat, Bekasi', 'Bpk. David Pratama', 30, 1, NOW(), NOW()),
(6, 'SUP-DEL-06', 'PT Industri Karet Deli (Delium/Swallow)', '061-6851234', 'sales@delitire.com', 'Jl. Komdor Laut Yos Sudarso Km 8.3, Medan, Sumatera Utara', 'Bpk. Ferry Tanuwijaya', 45, 1, NOW(), NOW()),
(7, 'SUP-HSR-07', 'HSR Wheel Indonesia', '021-53667890', 'distribution@hsrwheel.com', 'Jl. Boulevard Raya Blok QJ5 No. 18, Kelapa Gading, Jakarta Utara', 'Bpk. Kevin Chandra', 14, 1, NOW(), NOW()),
(8, 'SUP-ENK-08', 'PT Mega Arvia Utama (Enkei & Rays)', '021-65301234', 'orders@arvia.co.id', 'Kawasan Pergudangan Sunter, Jakarta Utara', 'Bpk. Toni Susanto', 30, 1, NOW(), NOW()),
(9, 'SUP-OIL-09', 'Distributor Resmi Shell & Pertamina Jateng', '024-7609876', 'order.pelumas@distrindo.co.id', 'Kawasan Industri Candi Blok C No. 5, Semarang', 'Bpk. Joko Susilo', 14, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `supplier_name` = VALUES(`supplier_name`),
  `phone` = VALUES(`phone`),
  `email` = VALUES(`email`),
  `updated_at` = NOW();

-- ------------------------------------------------------------------------------
-- 2. TABEL KATEGORI PRODUK (product_categories)
-- ------------------------------------------------------------------------------
INSERT INTO `product_categories` (`id`, `category_code`, `category_name`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'BAN_BARU', 'Ban Mobil Baru', 'Katalog ban mobil penumpang, SUV, MPV, komersial berbagai ukuran ring', 1, NOW(), NOW()),
(2, 'VELG', 'Velg Mobil Racing & OEM', 'Velg mobil variasi casting, flow forming, forged dan velg standar pabrik', 1, NOW(), NOW()),
(3, 'BAN_DALAM', 'Ban Dalam & Marset (Flap)', 'Ban dalam tube type, karet marset pelindung velg dan pentil tubeless', 1, NOW(), NOW()),
(4, 'OLI_PELUMAS', 'Oli & Pelumas Mesin', 'Pelumas mesin bensin/diesel, oli gardan, oli transmisi manual & matic', 1, NOW(), NOW()),
(5, 'AKSESORIS', 'Aksesoris & Mur Roda', 'Baut roda racing, center ring velg, spacer, dan penutup pentil indikator', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `category_name` = VALUES(`category_name`),
  `description` = VALUES(`description`),
  `updated_at` = NOW();

-- ------------------------------------------------------------------------------
-- 3. MASTER PRODUK (products)
-- Kolom disesuaikan persis dengan skema MySQL:
-- id, product_name, product_code, barcode, brand, brand_id, category_id,
-- size_width, size_ratio, ring, product_size, motif, condition_code, product_year,
-- product_cost, product_price, reference_price, product_quantity, stok_awal,
-- product_stock_alert, is_active, is_old_stock, branch_id, created_at, updated_at
-- ------------------------------------------------------------------------------
INSERT INTO `products` (
  `id`, `product_name`, `product_code`, `barcode`, `brand`, `brand_id`, `category_id`, 
  `size_width`, `size_ratio`, `ring`, `product_size`, `motif`, `condition_code`, `product_year`, 
  `product_cost`, `product_price`, `reference_price`, `product_quantity`, `stok_awal`, `product_stock_alert`, 
  `is_active`, `is_old_stock`, `branch_id`, `created_at`, `updated_at`
) VALUES
-- === BRAND: BRIDGESTONE (Brand ID: 2, Category ID: 1) ===
(1, 'Bridgestone Ecopia EP150 185/65 R15', 'BAN-BS-185-65-R15', '888001856515', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', 'Ecopia EP150 Fuel Saver', 'BARU', '2026', 735000.00, 920000.00, 920000.00, 22, 45, 6, 1, 0, 3, NOW(), NOW()),
(2, 'Accelera Phi-R 195/50 R16', 'BAN-ACC-195-50-R16', '888001955016', 'Accelera', 9, 1, 195, 50, '16', '195/50 R16', 'PHI-R Sport Dynamic', 'BARU', '2026', 580000.00, 750000.00, 750000.00, 18, 25, 4, 1, 0, 3, NOW(), NOW()),
(3, 'Bridgestone Turanza T005A 185/65 R15', 'BRI-1856515-TUR', '8993001018515', 'Bridgestone', 2, 1, 185, 65, '15', '185/65 R15', 'Turanza T005A Premium Quiet', 'BARU', '2026', 840000.00, 1050000.00, 1050000.00, 14, 30, 5, 1, 0, 3, NOW(), NOW()),
(4, 'Bridgestone Ecopia EP150 195/65 R15', 'BRI-1956515-ECO', '8993001019515', 'Bridgestone', 2, 1, 195, 65, '15', '195/65 R15', 'Ecopia EP150 Fuel Saver', 'BARU', '2026', 790000.00, 980000.00, 980000.00, 16, 20, 5, 1, 0, 3, NOW(), NOW()),
(5, 'Bridgestone Techno 175/65 R14', 'BRI-1756514-TEC', '8993001017514', 'Bridgestone', 2, 1, 175, 65, '14', '175/65 R14', 'Techno Sport & Durability', 'BARU', '2026', 540000.00, 680000.00, 680000.00, 8, 20, 4, 1, 0, 3, NOW(), NOW()),
(6, 'Bridgestone Duravis R624 195 R14C', 'BRI-19514C-DUR', '8993001019514', 'Bridgestone', 2, 1, 195, 80, '14', '195 R14C', 'Duravis Commercial Heavy Load', 'BARU', '2026', 680000.00, 850000.00, 850000.00, 18, 25, 6, 1, 0, 3, NOW(), NOW()),
(7, 'Bridgestone Dueler A/T 697 265/65 R17', 'BRI-2656517-DUE', '8993007026517', 'Bridgestone', 2, 1, 265, 65, '17', '265/65 R17', 'Dueler All-Terrain Pajero/Fortuner', 'BARU', '2026', 1720000.00, 2150000.00, 2150000.00, 9, 12, 4, 1, 0, 3, NOW(), NOW()),
(8, 'Bridgestone Potenza RE004 225/45 R18', 'BRI-2254518-POT', '8993005022518', 'Bridgestone', 2, 1, 225, 45, '18', '225/45 R18', 'Potenza RE004 Street Racing', 'BARU', '2026', 1480000.00, 1850000.00, 1850000.00, 6, 8, 4, 1, 0, 3, NOW(), NOW()),

-- === BRAND: GT RADIAL (Brand ID: 3, Category ID: 1) ===
(9, 'GT Radial Champiro BXT Pro 175/70 R13', 'GTR-1757013-BXT', '8993006017513', 'GT', 3, 1, 175, 70, '13', '175/70 R13', 'Champiro BXT Pro Durable Comfort', 'BARU', '2026', 410000.00, 520000.00, 520000.00, 22, 35, 5, 1, 0, 3, NOW(), NOW()),
(10, 'GT Radial Champiro Ecotec 185/65 R15', 'GTR-1856515-ECO', '8993006018515', 'GT', 3, 1, 185, 65, '15', '185/65 R15', 'Eco Friendly Low Rolling Resistance', 'BARU', '2026', 510000.00, 650000.00, 650000.00, 16, 20, 5, 1, 0, 3, NOW(), NOW()),
(11, 'GT Radial Champiro GTX Pro 195/50 R16', 'GTR-1955016-GTX', '8993006019516', 'GT', 3, 1, 195, 50, '16', '195/50 R16', 'High Performance Directional', 'BARU', '2026', 620000.00, 790000.00, 790000.00, 10, 12, 4, 1, 0, 3, NOW(), NOW()),
(12, 'GT Radial Savero A/T Plus 235/70 R15', 'GTR-2357015-SAV', '8993006023515', 'GT', 3, 1, 235, 70, '15', '235/70 R15', 'Savero All-Terrain SUV/Light Truck', 'BARU', '2026', 820000.00, 1050000.00, 1050000.00, 8, 10, 4, 1, 0, 3, NOW(), NOW()),
(13, 'GT Radial Maxmiler Pro 195 R14C', 'GTR-19514C-MAX', '8993006019514', 'GT', 3, 1, 195, 80, '14', '195 R14C', 'Maxmiler Commercial Fleet', 'BARU', '2026', 575000.00, 720000.00, 720000.00, 14, 16, 5, 1, 0, 3, NOW(), NOW()),

-- === BRAND: ACCELERA (Brand ID: 9, Category ID: 1) ===
(14, 'Accelera PHI-R 185/65 R15', 'ACC-1856515-PHIR', '8993002018515', 'Accelera', 9, 1, 185, 65, '15', '185/65 R15', 'PHI-R Sport Ultra Performance', 'BARU', '2026', 520000.00, 680000.00, 680000.00, 3, 15, 5, 1, 0, 3, NOW(), NOW()),
(15, 'Accelera 651 Sport 205/55 R16', 'ACC-2055516-651S', '8993002020516', 'Accelera', 9, 1, 205, 55, '16', '205/55 R16', '651 Sport Treadwear 200', 'BARU', '2026', 690000.00, 890000.00, 890000.00, 8, 12, 4, 1, 0, 3, NOW(), NOW()),
(16, 'Accelera Badak X-Treme 31x10.5 R15', 'ACC-3110515-BDK', '8993002031105', 'Accelera', 9, 1, 265, 85, '15', '31x10.5 R15', 'Extreme Offroad Mud-Terrain', 'BARU', '2026', 1250000.00, 1600000.00, 1600000.00, 6, 8, 2, 1, 0, 3, NOW(), NOW()),
(17, 'Accelera Eco Plush 175/65 R14', 'ACC-1756514-ECO', '8993002017514', 'Accelera', 9, 1, 175, 65, '14', '175/65 R14', 'Eco Plush Comfort Low Noise', 'BARU', '2026', 430000.00, 550000.00, 550000.00, 12, 16, 4, 1, 0, 3, NOW(), NOW()),

-- === BRAND: DUNLOP (Brand ID: 8, Category ID: 1) ===
(18, 'Dunlop Enasave EC300+ 185/65 R15', 'DUN-1856515-EC3', '8993003018515', 'Dunlop', 8, 1, 185, 65, '15', '185/65 R15', 'Enasave EC300+ OEM Veloz/Xpander', 'BARU', '2026', 620000.00, 790000.00, 790000.00, 18, 44, 5, 1, 0, 3, NOW(), NOW()),
(19, 'Dunlop SP Touring R1 175/65 R14', 'DUN-1756514-SPT', '8993003017514', 'Dunlop', 8, 1, 175, 65, '14', '175/65 R14', 'SP Touring R1 City Car Brio/Agya', 'BARU', '2026', 505000.00, 640000.00, 640000.00, 2, 10, 5, 1, 0, 3, NOW(), NOW()),
(20, 'Dunlop Grandtrek AT5 265/65 R17', 'DUN-2656517-AT5', '8993003026517', 'Dunlop', 8, 1, 265, 65, '17', '265/65 R17', 'Grandtrek All-Terrain 4x4', 'BARU', '2026', 1550000.00, 1950000.00, 1950000.00, 8, 12, 4, 1, 0, 3, NOW(), NOW()),

-- === BRAND: HANKOOK (Brand ID: 11, Category ID: 1) ===
(21, 'Hankook Ventus Prime 3 205/55 R16', 'HNK-2055516-K125', '8993008020516', 'Hankook', 11, 1, 205, 55, '16', '205/55 R16', 'Ventus Prime 3 European Grip', 'BARU', '2026', 680000.00, 880000.00, 880000.00, 12, 20, 4, 1, 0, 3, NOW(), NOW()),
(22, 'Hankook Kinergy Eco2 185/65 R15', 'HNK-1856515-K435', '8993008018515', 'Hankook', 11, 1, 185, 65, '15', '185/65 R15', 'Kinergy Eco Fuel Efficient', 'BARU', '2026', 550000.00, 720000.00, 720000.00, 14, 16, 4, 1, 0, 3, NOW(), NOW()),
(23, 'Hankook Dynapro AT2 265/70 R17', 'HNK-2657017-RF11', '8993008026570', 'Hankook', 11, 1, 265, 70, '17', '265/70 R17', 'Dynapro All-Terrain SUV', 'BARU', '2026', 1620000.00, 2050000.00, 2050000.00, 8, 10, 4, 1, 0, 3, NOW(), NOW()),

-- === BRAND: FORCEUM (Brand ID: 10, Category ID: 1) ===
(24, 'Forceum Octa 185/65 R15', 'FOR-1856515-OCT', '8993004018515', 'Forceum', 10, 1, 185, 65, '15', '185/65 R15', 'Octa Asymmetric Pattern', 'BARU', '2026', 485000.00, 630000.00, 630000.00, 11, 16, 4, 1, 0, 3, NOW(), NOW()),
(25, 'Forceum Hena Sporty 215/55 R17', 'FOR-2155517-HEN', '8993004021517', 'Forceum', 10, 1, 215, 55, '17', '215/55 R17', 'Hena Directional V-Groove', 'BARU', '2026', 650000.00, 840000.00, 840000.00, 4, 8, 5, 1, 0, 3, NOW(), NOW()),
(26, 'Forceum D800 175/65 R14', 'FOR-1756514-D800', '8993004017514', 'Forceum', 10, 1, 175, 65, '14', '175/65 R14', 'D800 City Daily', 'BARU', '2026', 420000.00, 540000.00, 540000.00, 10, 12, 4, 1, 0, 3, NOW(), NOW()),

-- === BRAND: ACHILLES (Brand ID: 1) & DELIUM (Brand ID: 12) ===
(27, 'Achilles 122 185/65 R15', 'ACH-1856515-122', '8993005018515', 'Achilles', 1, 1, 185, 65, '15', '185/65 R15', 'Achilles 122 Comfort Touring', 'BARU', '2026', 470000.00, 610000.00, 610000.00, 12, 16, 4, 1, 0, 3, NOW(), NOW()),
(28, 'Achilles ATR Sport 2 205/45 R17', 'ACH-2054517-ATR2', '8993005020545', 'Achilles', 1, 1, 205, 45, '17', '205/45 R17', 'ATR Sport 2 Aggressive Tread', 'BARU', '2026', 640000.00, 820000.00, 820000.00, 8, 10, 4, 1, 0, 3, NOW(), NOW()),
(29, 'Delium Power Saver 165/80 R13', 'DEL-1658013-PS', '8993006016580', 'Delium', 12, 1, 165, 80, '13', '165/80 R13', 'Power Saver City', 'BARU', '2026', 380000.00, 480000.00, 480000.00, 6, 12, 4, 1, 0, 3, NOW(), NOW()),

-- === KATEGORI: VELG RACING (Category ID: 2) ===
(30, 'Velg HSR Myth01 R15 (Set 4 Pcs)', 'VLG-HSR-R15-4X100', '8994001015410', 'HSR', 7, 2, 0, 0, '15', 'R15 4x100', 'Myth01 Racing Spoke', 'BARU', '2026', 3200000.00, 4200000.00, 4200000.00, 4, 6, 2, 1, 0, 3, NOW(), NOW()),
(31, 'Velg Enkei RPF1 Flow Form R17 (Set 4 Pcs)', 'VLG-ENK-R17-5X114', '8994001017511', 'Enkei', 8, 2, 0, 0, '17', 'R17 5x114.3', 'RPF1 Twin 6-Spoke Lightweight', 'BARU', '2026', 5400000.00, 6800000.00, 6800000.00, 2, 3, 1, 1, 0, 3, NOW(), NOW()),

-- === KATEGORI: BAN DALAM (Category ID: 3) ===
(32, 'Ban Dalam GT Radial 175/185-14 (TR13)', 'BND-GT-14-TR13', '8995001014013', 'GT', 3, 3, 0, 0, '14', '175/185-14', 'Heavy Duty Butyl Tube TR13', 'BARU', '2026', 45000.00, 70000.00, 70000.00, 35, 50, 10, 1, 0, 3, NOW(), NOW()),
(33, 'Ban Dalam Swallow 185/195-15 (TR13)', 'BND-SWL-15-TR13', '8995001015014', 'Swallow', 4, 3, 0, 0, '15', '185/195-15', 'Natural Rubber Extra Elastic TR13', 'BARU', '2026', 52000.00, 80000.00, 80000.00, 28, 40, 8, 1, 0, 3, NOW(), NOW()),

-- === KATEGORI: OLI & PELUMAS MESIN (Category ID: 4) ===
(34, 'Shell Helix HX8 Synthetic 5W-30 (1 Liter)', 'OIL-SHL-HX8-5W30', '8992004010101', 'Shell', NULL, 4, 0, 0, '-', '1 Liter', 'API SP / ILSAC GF-6A Bensin', 'BARU', '2026', 110000.00, 145000.00, 145000.00, 24, 30, 6, 1, 0, 3, NOW(), NOW()),
(35, 'Pertamina Fastron Gold 5W-30 Fully Synthetic (1 Liter)', 'OIL-PTM-FST-5W30', '8992004010102', 'Pertamina', NULL, 4, 0, 0, '-', '1 Liter', 'API SN / ACEA C3 Bensin & Diesel', 'BARU', '2026', 95000.00, 130000.00, 130000.00, 20, 25, 5, 1, 0, 3, NOW(), NOW()),
(36, 'Castrol Magnatec Stop-Start 10W-40 (Galon 4 Liter)', 'OIL-CAS-MAG-10W40', '8992004010103', 'Castrol', NULL, 4, 0, 0, '-', '4 Liter', 'Dualock Cling Molecule Protection', 'BARU', '2026', 320000.00, 420000.00, 420000.00, 12, 15, 3, 1, 0, 3, NOW(), NOW()),
(37, 'Filter Oli Mesin Avanza / Xenia / Rush / Terios', 'FLT-DEN-AVZ', '8992004010104', 'Denso', NULL, 4, 0, 0, '-', 'Universal Toyota/Daihatsu', 'High Density Micro-Filtration', 'BARU', '2026', 28000.00, 45000.00, 45000.00, 35, 50, 10, 1, 0, 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `product_name` = VALUES(`product_name`),
  `brand` = VALUES(`brand`),
  `brand_id` = VALUES(`brand_id`),
  `category_id` = VALUES(`category_id`),
  `size_width` = VALUES(`size_width`),
  `size_ratio` = VALUES(`size_ratio`),
  `ring` = VALUES(`ring`),
  `product_size` = VALUES(`product_size`),
  `motif` = VALUES(`motif`),
  `product_cost` = VALUES(`product_cost`),
  `product_price` = VALUES(`product_price`),
  `reference_price` = VALUES(`reference_price`),
  `product_quantity` = VALUES(`product_quantity`),
  `stok_awal` = VALUES(`stok_awal`),
  `product_stock_alert` = VALUES(`product_stock_alert`),
  `is_active` = VALUES(`is_active`),
  `updated_at` = NOW();

-- ------------------------------------------------------------------------------
-- 4. LAPISAN BATCH FIFO UNTUK BAN BARU & PRODUK LAINNYA (product_batches)
-- Menghadirkan simulasi multi-batch nyata:
-- - Batch Lama (Older Purchase Date, HPP Beli Lebih Rendah)
-- - Batch Baru (Newer Purchase Date, Kenaikan Harga Modal Supplier)
-- - Depletion: Sisa stok dihitung akurat dan balance dengan products
-- ------------------------------------------------------------------------------
DELETE FROM `product_batches` WHERE `product_id` BETWEEN 1 AND 37;

INSERT INTO `product_batches` (
  `product_id`, `batch_code`, `source_name`, `purchase_date`, `batch_cost`, `initial_qty`, `remaining_qty`, `branch_id`, `created_at`, `updated_at`
) VALUES
-- Produk 1: Bridgestone Ecopia EP150 185/65 R15 (Total Sisa: 22)
(1, 'PO-BS-202607-14', 'PT Bridgestone Tire Indonesia', '2026-07-15', 715000.00, 25, 4, 3, NOW(), NOW()),
(1, 'PO-BS-202608-20', 'PT Bridgestone Tire Indonesia', '2026-08-20', 735000.00, 20, 18, 3, NOW(), NOW()),

-- Produk 2: Accelera Phi-R 195/50 R16 (Total Sisa: 18)
(2, 'PO-EPY-202607-15', 'PT Elangperdana Tyre Industry', '2026-07-15', 560000.00, 15, 8, 3, NOW(), NOW()),
(2, 'PO-EPY-202608-14', 'PT Elangperdana Tyre Industry', '2026-08-14', 580000.00, 10, 10, 3, NOW(), NOW()),

-- Produk 3: Bridgestone Turanza T005A 185/65 R15 (Total Sisa: 14)
(3, 'PO-BS-202607-08', 'PT Bridgestone Tire Indonesia', '2026-07-10', 820000.00, 20, 4, 3, NOW(), NOW()),
(3, 'PO-BS-202608-15', 'PT Bridgestone Tire Indonesia', '2026-08-15', 840000.00, 10, 10, 3, NOW(), NOW()),

-- Produk 4: Bridgestone Ecopia EP150 195/65 R15 (Total Sisa: 16)
(4, 'PO-BS-202608-05', 'PT Bridgestone Tire Indonesia', '2026-08-05', 790000.00, 20, 16, 3, NOW(), NOW()),

-- Produk 5: Bridgestone Techno 175/65 R14 (Total Sisa: 8)
(5, 'PO-BS-202607-02', 'PT Bridgestone Tire Indonesia', '2026-07-05', 535000.00, 10, 3, 3, NOW(), NOW()),
(5, 'PO-BS-202608-01', 'PT Bridgestone Tire Indonesia', '2026-08-01', 540000.00, 10, 5, 3, NOW(), NOW()),

-- Produk 6: Bridgestone Duravis R624 195 R14C (Total Sisa: 18)
(6, 'PO-BS-202607-22', 'PT Bridgestone Tire Indonesia', '2026-07-22', 665000.00, 15, 8, 3, NOW(), NOW()),
(6, 'PO-BS-202608-18', 'PT Bridgestone Tire Indonesia', '2026-08-18', 680000.00, 10, 10, 3, NOW(), NOW()),

-- Produk 7: Bridgestone Dueler A/T 697 265/65 R17 (Total Sisa: 9)
(7, 'PO-BS-202608-30', 'PT Bridgestone Tire Indonesia', '2026-08-30', 1720000.00, 12, 9, 3, NOW(), NOW()),

-- Produk 8: Bridgestone Potenza RE004 225/45 R18 (Total Sisa: 6)
(8, 'PO-BS-202608-29', 'PT Bridgestone Tire Indonesia', '2026-08-29', 1480000.00, 8, 6, 3, NOW(), NOW()),

-- Produk 9: GT Radial Champiro BXT Pro 175/70 R13 (Total Sisa: 22)
(9, 'PO-GITI-202607-12', 'PT Gajah Tunggal Tbk', '2026-07-12', 395000.00, 15, 2, 3, NOW(), NOW()),
(9, 'PO-GITI-202608-15', 'PT Gajah Tunggal Tbk', '2026-08-15', 410000.00, 20, 20, 3, NOW(), NOW()),

-- Produk 10: GT Radial Champiro Ecotec 185/65 R15 (Total Sisa: 16)
(10, 'PO-GITI-202608-10', 'PT Gajah Tunggal Tbk', '2026-08-10', 510000.00, 20, 16, 3, NOW(), NOW()),

-- Produk 11: GT Radial Champiro GTX Pro 195/50 R16 (Total Sisa: 10)
(11, 'PO-GITI-202608-20', 'PT Gajah Tunggal Tbk', '2026-08-20', 620000.00, 12, 10, 3, NOW(), NOW()),

-- Produk 12: GT Radial Savero A/T Plus 235/70 R15 (Total Sisa: 8)
(12, 'PO-GITI-202608-25', 'PT Gajah Tunggal Tbk', '2026-08-25', 820000.00, 10, 8, 3, NOW(), NOW()),

-- Produk 13: GT Radial Maxmiler Pro 195 R14C (Total Sisa: 14)
(13, 'PO-GITI-202608-28', 'PT Gajah Tunggal Tbk', '2026-08-28', 575000.00, 16, 14, 3, NOW(), NOW()),

-- Produk 14: Accelera PHI-R 185/65 R15 (Total Sisa: 3 - Low Stock)
(14, 'PO-EPY-202608-11', 'PT Elangperdana Tyre Industry', '2026-08-10', 520000.00, 15, 3, 3, NOW(), NOW()),

-- Produk 15: Accelera 651 Sport 205/55 R16 (Total Sisa: 8)
(15, 'PO-EPY-202608-18', 'PT Elangperdana Tyre Industry', '2026-08-18', 690000.00, 12, 8, 3, NOW(), NOW()),

-- Produk 16: Accelera Badak X-Treme 31x10.5 R15 (Total Sisa: 6)
(16, 'PO-EPY-202608-20', 'PT Elangperdana Tyre Industry', '2026-08-20', 1250000.00, 8, 6, 3, NOW(), NOW()),

-- Produk 17: Accelera Eco Plush 175/65 R14 (Total Sisa: 12)
(17, 'PO-EPY-202608-22', 'PT Elangperdana Tyre Industry', '2026-08-22', 430000.00, 16, 12, 3, NOW(), NOW()),

-- Produk 18: Dunlop Enasave EC300+ 185/65 R15 (Total Sisa: 18)
(18, 'PO-SUMI-202607-20', 'PT Sumi Rubber Indonesia', '2026-07-20', 605000.00, 20, 4, 3, NOW(), NOW()),
(18, 'PO-SUMI-202608-22', 'PT Sumi Rubber Indonesia', '2026-08-22', 620000.00, 24, 14, 3, NOW(), NOW()),

-- Produk 19: Dunlop SP Touring R1 175/65 R14 (Total Sisa: 2 - Low Stock)
(19, 'PO-SUMI-202608-07', 'PT Sumi Rubber Indonesia', '2026-08-25', 505000.00, 10, 2, 3, NOW(), NOW()),

-- Produk 20: Dunlop Grandtrek AT5 265/65 R17 (Total Sisa: 8)
(20, 'PO-SUMI-202608-28', 'PT Sumi Rubber Indonesia', '2026-08-28', 1550000.00, 12, 8, 3, NOW(), NOW()),

-- Produk 21: Hankook Ventus Prime 3 205/55 R16 (Total Sisa: 12)
(21, 'PO-HNK-202607-28', 'PT Hankook Tire Indonesia', '2026-07-28', 660000.00, 10, 2, 3, NOW(), NOW()),
(21, 'PO-HNK-202608-25', 'PT Hankook Tire Indonesia', '2026-08-25', 680000.00, 10, 10, 3, NOW(), NOW()),

-- Produk 22: Hankook Kinergy Eco2 185/65 R15 (Total Sisa: 14)
(22, 'PO-HNK-202608-26', 'PT Hankook Tire Indonesia', '2026-08-26', 550000.00, 16, 14, 3, NOW(), NOW()),

-- Produk 23: Hankook Dynapro AT2 265/70 R17 (Total Sisa: 8)
(23, 'PO-HNK-202608-29', 'PT Hankook Tire Indonesia', '2026-08-29', 1620000.00, 10, 8, 3, NOW(), NOW()),

-- Produk 24: Forceum Octa 185/65 R15 (Total Sisa: 11)
(24, 'PO-EPY-202608-19', 'PT Elangperdana Tyre Industry', '2026-08-26', 485000.00, 16, 11, 3, NOW(), NOW()),

-- Produk 25: Forceum Hena Sporty 215/55 R17 (Total Sisa: 4 - Low Stock)
(25, 'PO-EPY-202608-21', 'PT Elangperdana Tyre Industry', '2026-08-28', 650000.00, 8, 4, 3, NOW(), NOW()),

-- Produk 26: Forceum D800 175/65 R14 (Total Sisa: 10)
(26, 'PO-EPY-202608-27', 'PT Elangperdana Tyre Industry', '2026-08-27', 420000.00, 12, 10, 3, NOW(), NOW()),

-- Produk 27: Achilles 122 185/65 R15 (Total Sisa: 12)
(27, 'PO-ACH-202608-16', 'PT Multistrada Arah Sarana', '2026-08-16', 470000.00, 16, 12, 3, NOW(), NOW()),

-- Produk 28: Achilles ATR Sport 2 205/45 R17 (Total Sisa: 8)
(28, 'PO-ACH-202608-23', 'PT Multistrada Arah Sarana', '2026-08-23', 640000.00, 10, 8, 3, NOW(), NOW()),

-- Produk 29: Delium Power Saver 165/80 R13 (Total Sisa: 6)
(29, 'PO-DEL-202608-19', 'PT Industri Karet Deli', '2026-08-19', 380000.00, 12, 6, 3, NOW(), NOW()),

-- Produk 30: Velg HSR Myth01 R15 (Total Sisa: 4 Set)
(30, 'PO-HSR-202608-01', 'HSR Wheel Indonesia', '2026-08-10', 3200000.00, 6, 4, 3, NOW(), NOW()),

-- Produk 31: Velg Enkei RPF1 R17 (Total Sisa: 2 Set)
(31, 'PO-ENK-202608-02', 'PT Mega Arvia Utama (Enkei)', '2026-08-14', 5400000.00, 3, 2, 3, NOW(), NOW()),

-- Produk 32: Ban Dalam GT Radial 175/185-14 (Total Sisa: 35)
(32, 'PO-GT-202608-22', 'PT Gajah Tunggal Tbk', '2026-08-25', 45000.00, 50, 35, 3, NOW(), NOW()),

-- Produk 33: Ban Dalam Swallow 185/195-15 (Total Sisa: 28)
(33, 'PO-SWL-202608-23', 'PT Industri Karet Deli', '2026-08-26', 52000.00, 40, 28, 3, NOW(), NOW()),

-- Produk 34: Shell Helix HX8 5W-30 (Total Sisa: 24)
(34, 'PO-SHL-202608-01', 'Distributor Resmi Shell Pelumas', '2026-08-20', 110000.00, 30, 24, 3, NOW(), NOW()),

-- Produk 35: Pertamina Fastron Gold 5W-30 (Total Sisa: 20)
(35, 'PO-PTM-202608-02', 'PT Pertamina Lubricants Semarang', '2026-08-21', 95000.00, 25, 20, 3, NOW(), NOW()),

-- Produk 36: Castrol Magnatec 10W-40 (Total Sisa: 12)
(36, 'PO-CAS-202608-03', 'PT Castrol Indonesia Regional Jateng', '2026-08-22', 320000.00, 15, 12, 3, NOW(), NOW()),

-- Produk 37: Filter Oli Avanza/Xenia (Total Sisa: 35)
(37, 'PO-DEN-202608-04', 'Distributor Sparepart Denso Magelang', '2026-08-23', 28000.00, 50, 35, 3, NOW(), NOW());

-- ------------------------------------------------------------------------------
-- 5. MASTER JASA & LAYANAN BENGKEL (service_masters)
-- ------------------------------------------------------------------------------
INSERT INTO `service_masters` (`id`, `service_code`, `service_name`, `category`, `standard_price`, `cost_price`, `description`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'JASA-SPOORING-3D', 'Jasa Spooring 3D Komputerized', 'SPOORING', 150000.00, 0.00, 'Garansi 7 hari / 500 km', 1, NOW(), NOW()),
(2, 'JASA-BALANCING-WHEEL', 'Jasa Balancing Roda Mobil', 'BALANCING', 35000.00, 0.00, 'Per roda (termasuk timah balancing)', 1, NOW(), NOW()),
(3, 'SRV-SPR-3D-SUV', 'Spooring 3D Digital (SUV / Double Cabin / Niaga)', 'SPOORING', 200000.00, 0.00, 'Penyelarasan 4 roda mobil besar (Fortuner, Pajero, Hilux, Hiace)', 1, NOW(), NOW()),
(4, 'SRV-TMB-TIPTOP', 'Tambal Ban Tip-Top Press Dingin', 'PERBAIKAN_BAN', 50000.00, 10000.00, 'Tambal ban permanen dari sisi dalam ban dengan lem dingin & rubber patch', 1, NOW(), NOW()),
(5, 'SRV-TMB-CACING', 'Tambal Tubeless String / Cacing', 'PERBAIKAN_BAN', 25000.00, 3000.00, 'Tambal tusuk tubeless cepat untuk kebocoran tapak ban', 1, NOW(), NOW()),
(6, 'SRV-PSG-ROTASI', 'Bongkar Pasang & Rotasi 4 Roda', 'BONGKAR_PASANG', 60000.00, 0.00, 'Rotasi silang 4 roda untuk menjaga keausan ban merata', 1, NOW(), NOW()),
(7, 'SRV-N2-KURAS4', 'Kuras & Isi Penuh Nitrogen 4 Roda', 'NITROGEN', 40000.00, 5000.00, 'Kuras angin biasa dan isi 100% murni Nitrogen N2 4 roda', 1, NOW(), NOW()),
(8, 'SRV-GNT-OLI', 'Jasa Kuras & Ganti Oli Mesin', 'GANTI_OLI', 35000.00, 0.00, 'Kuras oli mesin lama dan pasang filter oli baru', 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `service_name` = VALUES(`service_name`),
  `category` = VALUES(`category`),
  `standard_price` = VALUES(`standard_price`),
  `cost_price` = VALUES(`cost_price`),
  `description` = VALUES(`description`),
  `updated_at` = NOW();

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 6. VERIFIKASI INTEGRITAS FIFO DATA
-- ==============================================================================
SELECT 
  p.id,
  p.brand,
  p.product_name,
  p.product_quantity AS `stok_di_products`,
  COALESCE(SUM(b.remaining_qty), 0) AS `total_batch_remaining`,
  (p.product_quantity - COALESCE(SUM(b.remaining_qty), 0)) AS `selisih_fifo_integrity`
FROM `products` p
LEFT JOIN `product_batches` b ON p.id = b.product_id
GROUP BY p.id, p.brand, p.product_name, p.product_quantity
ORDER BY p.id ASC;
