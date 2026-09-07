-- ==============================================================================
-- DATABASE SCHEMA: OMAH BAN CABANG 3 (MAGELANG)
-- STANDAR: SAK EMKM (Entitas Mikro, Kecil, dan Menengah)
-- OWNER: Agus Subagyo | AUTHOR SKRIPSI: Catherine Wong
-- TARGET DATABASE: Supabase PostgreSQL Cloud
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABEL: store_settings (Pengaturan Identitas Toko & Profil Kasir)
CREATE TABLE IF NOT EXISTS store_settings (
    id TEXT PRIMARY KEY DEFAULT 'primary',
    store_name TEXT NOT NULL DEFAULT 'Toko Ban Omah Ban',
    branch_name TEXT NOT NULL DEFAULT 'Cabang 3 - Magelang',
    tagline TEXT DEFAULT 'Pusat Ban Mobil Baru, Velg Racing, Oli & Spooring 3D',
    phone TEXT DEFAULT '0293-312345',
    whatsapp TEXT DEFAULT '0812-3456-7890',
    email TEXT DEFAULT 'cabang3@omahban.com',
    address TEXT DEFAULT 'Jl. Jenderal Sudirman No. 128, Magelang Selatan',
    city TEXT DEFAULT 'Kota Magelang, Jawa Tengah',
    invoice_header TEXT DEFAULT 'TOKO BAN OMAH BAN CABANG 3 - MAGELANG',
    invoice_footer_title TEXT DEFAULT 'TERIMA KASIH ATAS KUNJUNGAN ANDA',
    invoice_footer_notes TEXT DEFAULT 'Barang yang sudah dibeli dapat ditukar maksimal 3 hari dengan menyertakan nota fisik.',
    invoice_warranty_text TEXT DEFAULT 'Garansi pemasangan & balancing berlaku 7 hari sejak tanggal nota.',
    show_barcode_on_receipt BOOLEAN DEFAULT true,
    show_cashier_name BOOLEAN DEFAULT true,
    show_vehicle_info BOOLEAN DEFAULT true,
    paper_width_mm INTEGER DEFAULT 80,
    bank_name TEXT DEFAULT 'Bank Central Asia (BCA)',
    bank_account_number TEXT DEFAULT '122-089-7788',
    bank_account_holder TEXT DEFAULT 'Agus Subagyo (Omah Ban)',
    qris_merchant_name TEXT DEFAULT 'OMAH BAN CABANG 3',
    qris_nmid TEXT DEFAULT 'ID1020349918231',
    default_tax_rate NUMERIC DEFAULT 0,
    default_payment_terms_days INTEGER DEFAULT 30,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL: suppliers (Supplier Resmi Ban & Sparepart)
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    supplier_code TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    contact_person TEXT,
    payment_terms_days INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL: products (Katalog Produk: Ban Baru, Velg, Oli, Ban Dalam)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    category_id INTEGER,
    brand_id INTEGER,
    brand TEXT NOT NULL,
    product_name TEXT NOT NULL,
    name TEXT NOT NULL,
    product_code TEXT NOT NULL UNIQUE,
    barcode TEXT NOT NULL,
    product_size TEXT,
    size_width NUMERIC,
    size_ratio TEXT,
    ring TEXT,
    motif TEXT,
    pattern TEXT,
    product_year TEXT,
    condition_code TEXT DEFAULT 'BARU',
    pcd TEXT,
    rim_width NUMERIC,
    offset_et NUMERIC,
    color_finish TEXT,
    valve_type TEXT,
    product_quantity INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    product_stock_alert INTEGER NOT NULL DEFAULT 5,
    min_stock INTEGER NOT NULL DEFAULT 5,
    product_cost NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    cost NUMERIC DEFAULT 0,
    product_price NUMERIC NOT NULL DEFAULT 0,
    price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_old_stock BOOLEAN DEFAULT false,
    image_placeholder_color TEXT DEFAULT 'slate',
    batches JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL: services (Master Jasa Bengkel & Layanan Spooring/Balancing)
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    service_code TEXT NOT NULL UNIQUE,
    service_name TEXT NOT NULL,
    category TEXT NOT NULL,
    standard_price NUMERIC NOT NULL DEFAULT 0,
    cost_price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL: pos_transactions (Transaksi Penjualan POS & Kasir)
CREATE TABLE IF NOT EXISTS pos_transactions (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    invoice_number TEXT,
    date TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    cashier_name TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    vehicle_plate TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    gross_sales_amount NUMERIC NOT NULL DEFAULT 0,
    total_discount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    tax_rate NUMERIC NOT NULL DEFAULT 0,
    tax_percentage NUMERIC NOT NULL DEFAULT 0,
    grand_total NUMERIC NOT NULL DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    total_cost_hpp NUMERIC NOT NULL DEFAULT 0,
    total_hpp NUMERIC NOT NULL DEFAULT 0,
    gross_profit NUMERIC NOT NULL DEFAULT 0,
    total_profit NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'TUNAI',
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    change_amount NUMERIC NOT NULL DEFAULT 0,
    payment_reference TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'LUNAS',
    stock_deducted BOOLEAN DEFAULT true,
    is_voided BOOLEAN DEFAULT false,
    void_reason TEXT,
    voided_at TEXT,
    voided_by TEXT,
    mechanic_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL: parked_transactions (Transaksi Ditahan / Kasir Antrean)
CREATE TABLE IF NOT EXISTS parked_transactions (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    customer_name TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    total_discount NUMERIC NOT NULL DEFAULT 0,
    grand_total NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL: sales_bookings (Pesanan Booking Indent & DP Ban/Velg)
CREATE TABLE IF NOT EXISTS sales_bookings (
    id TEXT PRIMARY KEY,
    booking_number TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_total NUMERIC NOT NULL DEFAULT 0,
    dp_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'TUNAI',
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABEL: expenses (Pengeluaran Operasional & Kas Kecil BKK)
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL UNIQUE,
    expense_number TEXT NOT NULL,
    bkk_number TEXT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    category_code TEXT,
    amount NUMERIC NOT NULL DEFAULT 0,
    cash_source TEXT NOT NULL,
    payment_method TEXT,
    bank_name TEXT,
    paid_to TEXT NOT NULL,
    description TEXT NOT NULL,
    receipt_image TEXT,
    attachment_path TEXT,
    approved_by TEXT NOT NULL,
    journal_id TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    void_reason TEXT,
    voided_at TEXT,
    voided_by TEXT,
    reversal_journal_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL: stock_mutations (Buku Mutasi Pergerakan Stok Fisik)
CREATE TABLE IF NOT EXISTS stock_mutations (
    id TEXT PRIMARY KEY,
    tire_id TEXT NOT NULL,
    product_id TEXT,
    tire_name TEXT NOT NULL,
    product_name TEXT,
    tire_size TEXT,
    date TEXT NOT NULL,
    ref_doc TEXT NOT NULL,
    type TEXT NOT NULL,
    qty INTEGER NOT NULL,
    balance INTEGER NOT NULL,
    notes TEXT,
    description TEXT,
    operator TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABEL: journal_entries (Jurnal Umum SAK EMKM)
CREATE TABLE IF NOT EXISTS journal_entries (
    id TEXT PRIMARY KEY,
    journal_number TEXT NOT NULL UNIQUE,
    reference_number TEXT,
    date TEXT NOT NULL,
    ref_doc TEXT NOT NULL,
    description TEXT NOT NULL,
    lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'POSTED',
    total_debit NUMERIC NOT NULL DEFAULT 0,
    total_credit NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABEL: payable_invoices (Buku Pembantu Hutang Usaha Supplier)
CREATE TABLE IF NOT EXISTS payable_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_name TEXT NOT NULL,
    date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'BELUM_LUNAS',
    notes TEXT,
    ref_doc TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABEL: receivable_invoices (Buku Pembantu Piutang Faktur BON Pelanggan)
CREATE TABLE IF NOT EXISTS receivable_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    vehicle_plate TEXT,
    date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC NOT NULL DEFAULT 0,
    remaining_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'BELUM_LUNAS',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABEL: account_balances (Saldo Rekening Buku Besar SAK EMKM)
CREATE TABLE IF NOT EXISTS account_balances (
    account_code TEXT PRIMARY KEY,
    balance NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABEL: accounting_period (Status Periode Pembukuan Akuntansi)
CREATE TABLE IF NOT EXISTS accounting_period (
    period_id TEXT PRIMARY KEY,
    period_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    closed_at TEXT,
    closed_by TEXT,
    closing_journal_id TEXT,
    net_income_transferred NUMERIC DEFAULT 0
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Konfigurasi akses aman untuk Supabase anon key
-- ==============================================================================

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parked_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payable_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivable_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounting_period ENABLE ROW LEVEL SECURITY;

-- Buat Permissive Policies untuk 'anon' role (Public Read/Write untuk aplikasi POS)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'store_settings', 'suppliers', 'products', 'services', 
            'pos_transactions', 'parked_transactions', 'sales_bookings', 
            'expenses', 'stock_mutations', 'journal_entries', 
            'payable_invoices', 'receivable_invoices', 'account_balances', 
            'accounting_period'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Full Access on %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Public Full Access on %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- SEED DATA REAL: TOKO BAN OMAH BAN CABANG 3 (MAGELANG)
-- ==============================================================================

-- 1. Profile Toko
INSERT INTO store_settings (
    id, store_name, branch_name, tagline, phone, whatsapp, email, address, city,
    invoice_header, invoice_footer_title, invoice_footer_notes, invoice_warranty_text,
    bank_name, bank_account_number, bank_account_holder, qris_merchant_name, qris_nmid
) VALUES (
    'primary', 'Toko Ban Omah Ban', 'Cabang 3 - Magelang',
    'Pusat Ban Mobil Baru, Velg Racing, Oli & Spooring 3D',
    '0293-312345', '0812-3456-7890', 'cabang3@omahban.com',
    'Jl. Jenderal Sudirman No. 128, Magelang Selatan', 'Kota Magelang, Jawa Tengah',
    'TOKO BAN OMAH BAN CABANG 3 - MAGELANG', 'TERIMA KASIH ATAS KUNJUNGAN ANDA',
    'Barang yang sudah dibeli dapat ditukar maksimal 3 hari dengan menyertakan nota fisik.',
    'Garansi pemasangan & balancing berlaku 7 hari sejak tanggal nota.',
    'Bank Central Asia (BCA)', '122-089-7788', 'Agus Subagyo (Omah Ban)',
    'OMAH BAN CABANG 3', 'ID1020349918231'
) ON CONFLICT (id) DO NOTHING;

-- 2. Master Supplier Resmi
INSERT INTO suppliers (id, supplier_code, supplier_name, phone, email, address, contact_person, payment_terms_days, is_active)
VALUES 
    ('sup-1', 'SUP-001', 'PT Bridgestone Tire Indonesia (Distributor Jateng)', '024-7601234', 'sales.smg@bridgestone.co.id', 'Kawasan Industri Candi Blok C-8, Semarang', 'Budi Santoso', 30, true),
    ('sup-2', 'SUP-002', 'PT Elangperdana Tyre Industry (Accelera & Forceum)', '021-8752345', 'orders@elangperdana.com', 'Jl. Elang No. 1, Citeureup, Bogor', 'Hendra Wijaya', 45, true),
    ('sup-3', 'SUP-003', 'PT Sumi Rubber Indonesia (Dunlop)', '021-8980123', 'dunlop.jateng@sumirubber.co.id', 'Kawasan EJIP Plot 4J, Cikarang', 'Siti Rahma', 30, true),
    ('sup-4', 'SUP-004', 'PT Gajah Tunggal Tbk (GT Radial)', '021-3863456', 'gt.dealer@gt-tires.com', 'Wisma Hayam Wuruk Lt. 10, Jakarta Pusat', 'Agus Pratama', 30, true),
    ('sup-5', 'SUP-005', 'PT Hankook Tire Sales Indonesia', '021-29951234', 'hankook.id@hankook.com', 'APL Tower Lt. 25, Tanjung Duren, Jakarta Barat', 'Devi Natalia', 30, true),
    ('sup-6', 'SUP-006', 'HSR Wheel Official Distribution (PT TKB Group)', '021-2285123', 'hsr.dealer@tkbgroup.id', 'Jl. Boulevard Raya Blok QJ5 No. 18, Kelapa Gading', 'Aldo Kevin', 14, true)
ON CONFLICT (id) DO NOTHING;

-- 3. Master Jasa & Layanan Bengkel
INSERT INTO services (id, service_code, service_name, category, standard_price, cost_price, description, is_active)
VALUES
    ('srv-1', 'SRV-SPOOR-3D', 'Spooring 3D Komputer (4 Roda)', 'SPOORING', 150000, 35000, 'Penyelarasan sudut camber, caster, toe dengan sensor kamera 3D presisi tinggi.', true),
    ('srv-2', 'SRV-BAL-STD', 'Balancing Roda (Per Roda + Timah)', 'BALANCING', 30000, 8000, 'Balancing dinamis getaran velg menggunakan timah tempel/klip per roda.', true),
    ('srv-3', 'SRV-PASANG-BAN', 'Jasa Bongkar Pasang Ban (Mesin Tyre Changer)', 'BONGKAR_PASANG', 25000, 5000, 'Bongkar pasang ban velg aluminium tanpa lecet menggunakan mesin otomatis.', true),
    ('srv-4', 'SRV-NITRO-4', 'Isi Nitrogen 4 Roda (Kuras Baru)', 'NITROGEN', 50000, 8000, 'Pengurasan angin biasa dan pengisian murni gas nitrogen 99% untuk 4 roda.', true),
    ('srv-5', 'SRV-TAMBAL-TUB', 'Tambal Ban Tubeless Press Cacing / Tip-Top', 'PERBAIKAN_BAN', 35000, 7000, 'Perbaikan kebocoran telapak ban dengan karet tubeless berkualitas tinggi.', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Master Produk Ban Baru & Velg
INSERT INTO products (
    id, category, brand, product_name, name, product_code, barcode,
    product_size, size_width, size_ratio, ring, motif, pattern, product_year, condition_code,
    pcd, rim_width, offset_et, color_finish, valve_type,
    product_quantity, stock, product_stock_alert, min_stock,
    product_cost, cost_price, cost, product_price, price,
    is_active, is_old_stock, image_placeholder_color
) VALUES 
    ('prod-1', 'BAN_BARU', 'Bridgestone', 'Bridgestone Turanza T005A 185/65 R15', 'Bridgestone Turanza T005A 185/65 R15', 'TIR-BS-1856515-01', '899123456001', '185/65 R15', 185, '65', 'R15', 'Turanza T005A', 'Asymmetric Touring', '2026', 'BARU', NULL, NULL, NULL, NULL, NULL, 12, 12, 4, 4, 820000, 820000, 820000, 1050000, 1050000, true, false, 'slate'),
    ('prod-2', 'BAN_BARU', 'Bridgestone', 'Bridgestone Dueler H/T 684 265/65 R17', 'Bridgestone Dueler H/T 684 265/65 R17', 'TIR-BS-2656517-02', '899123456002', '265/65 R17', 265, '65', 'R17', 'Dueler H/T 684', 'Highway Terrain SUV', '2026', 'BARU', NULL, NULL, NULL, NULL, NULL, 8, 8, 4, 4, 1350000, 1350000, 1350000, 1750000, 1750000, true, false, 'slate'),
    ('prod-3', 'BAN_BARU', 'Accelera', 'Accelera PHI-R 205/45 R17', 'Accelera PHI-R 205/45 R17', 'TIR-AC-2054517-03', '899123456003', '205/45 R17', 205, '45', 'R17', 'PHI-R', 'Ultra High Performance', '2026', 'BARU', NULL, NULL, NULL, NULL, NULL, 3, 3, 5, 5, 520000, 520000, 520000, 680000, 680000, true, false, 'blue'),
    ('prod-4', 'BAN_BARU', 'Dunlop', 'Dunlop Enasave EC300+ 185/70 R14', 'Dunlop Enasave EC300+ 185/70 R14', 'TIR-DN-1857014-04', '899123456004', '185/70 R14', 185, '70', 'R14', 'Enasave EC300+', 'Eco Friendly Comfort', '2026', 'BARU', NULL, NULL, NULL, NULL, NULL, 16, 16, 4, 4, 560000, 560000, 560000, 720000, 720000, true, false, 'amber'),
    ('prod-5', 'BAN_BARU', 'GT Radial', 'GT Radial Champiro Ecotec 175/65 R14', 'GT Radial Champiro Ecotec 175/65 R14', 'TIR-GT-1756514-05', '899123456005', '175/65 R14', 175, '65', 'R14', 'Champiro Ecotec', 'Low Rolling Resistance', '2026', 'BARU', NULL, NULL, NULL, NULL, NULL, 20, 20, 6, 6, 480000, 480000, 480000, 620000, 620000, true, false, 'emerald'),
    ('prod-6', 'VELG', 'HSR', 'Velg HSR Myth01 R17x7.5 H5-114.3 ET42', 'Velg HSR Myth01 R17x7.5 H5-114.3 ET42', 'VLG-HSR-MYTH01-06', '899123456006', 'Ring 17 - 5x114.3', NULL, NULL, 'R17', 'Myth01 Racing', 'Multi-Spoke Flow Formed', '2026', 'BARU', '5x114.3', 7.5, 42, 'Glossy Black Machine Face', NULL, 4, 4, 2, 2, 4200000, 4200000, 4200000, 5500000, 5500000, true, false, 'purple'),
    ('prod-7', 'OLI_PELUMAS', 'Pertamina Fastron', 'Fastron Gold SAE 0W-20 Full Synthetic (4L)', 'Fastron Gold SAE 0W-20 Full Synthetic (4L)', 'OIL-FAS-0W20-07', '899123456007', 'Galon 4 Liter', NULL, NULL, NULL, 'Fastron Gold API SN', 'Full Synthetic Eco Shield', '2026', 'BARU', NULL, NULL, NULL, NULL, NULL, 10, 10, 3, 3, 310000, 310000, 310000, 425000, 425000, true, false, 'indigo'),
    ('prod-8', 'BAN_DALAM', 'Swallow', 'Ban Dalam Swallow 185/70 R14 Pentil Panjang', 'Ban Dalam Swallow 185/70 R14 Pentil Panjang', 'BD-SWL-1857014-08', '899123456008', '185/70 R14', 185, '70', 'R14', 'Heavy Duty Tube', 'Butyl Rubber Premium', '2026', 'BARU', NULL, NULL, NULL, NULL, 'TR-13 Pentil Karet Lurus', 24, 24, 6, 6, 45000, 45000, 45000, 75000, 75000, true, false, 'slate')
ON CONFLICT (id) DO NOTHING;

-- 5. Saldo Awal Akun Standar SAK EMKM
INSERT INTO account_balances (account_code, balance)
VALUES
    ('1-1000', 2450000),  -- Kas Laci Kasir Cabang 3
    ('1-1001', 48500000), -- Bank Central Asia (BCA Operasional)
    ('1-1002', 0),        -- Kas Ditangan (Petty Cash BKK)
    ('1-1003', 3850000),  -- Piutang Usaha (Faktur BON Pelanggan)
    ('1-2000', 64700000), -- Persediaan Ban Baru & Velg Cabang 3
    ('1-3000', 95000000), -- Peralatan Bengkel (Mesin Spooring 3D & Balancer)
    ('1-3001', -15000000),-- Akumulasi Penyusutan Peralatan Bengkel
    ('2-1000', 14500000), -- Hutang Usaha Supplier Ban
    ('2-1001', 1000000),  -- Uang Muka Penjualan / Booking DP Pelanggan
    ('3-1000', 180000000),-- Modal Pemilik (Agus Subagyo)
    ('3-2000', 19000000)  -- Saldo Laba Ditahan (Retained Earnings)
ON CONFLICT (account_code) DO UPDATE SET balance = EXCLUDED.balance;

-- 6. Periode Akuntansi Aktif
INSERT INTO accounting_period (period_id, period_name, status)
VALUES ('2026-09', 'September 2026', 'OPEN')
ON CONFLICT (period_id) DO NOTHING;
