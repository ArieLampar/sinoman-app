-- Migration: 006_waste_bank.sql
-- Deskripsi: Tabel untuk sistem bank sampah dan produksi maggot
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel waste_categories (kategori sampah)
CREATE TABLE IF NOT EXISTS waste_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code VARCHAR(20) UNIQUE NOT NULL, -- WST-001
    category_name VARCHAR(50) NOT NULL, -- Organik/Plastik/Kertas/Logam/Kaca/Elektronik
    sub_category VARCHAR(50), -- PET/HDPE untuk plastik, kardus/koran untuk kertas
    buying_price_per_kg DECIMAL(10,2) NOT NULL CHECK (buying_price_per_kg >= 0), -- harga beli dari anggota
    selling_price_per_kg DECIMAL(10,2) NOT NULL CHECK (selling_price_per_kg >= buying_price_per_kg), -- harga jual ke pengepul
    minimum_weight_kg DECIMAL(5,2) DEFAULT 0.5 CHECK (minimum_weight_kg > 0),
    description TEXT,
    handling_instructions TEXT, -- cara penanganan khusus
    icon_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel collection_points (lokasi bank sampah per RT/RW)
CREATE TABLE IF NOT EXISTS collection_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    point_code VARCHAR(20) UNIQUE NOT NULL, -- BS-PON-001
    point_name VARCHAR(100) NOT NULL, -- Bank Sampah RT 01 RW 05
    address TEXT,
    rt VARCHAR(5),
    rw VARCHAR(5),
    latitude DECIMAL(10,8), -- koordinat GPS
    longitude DECIMAL(11,8), -- koordinat GPS
    contact_person VARCHAR(100),
    contact_phone VARCHAR(20),
    storage_capacity_kg DECIMAL(10,2) DEFAULT 1000 CHECK (storage_capacity_kg > 0),
    current_load_kg DECIMAL(10,2) DEFAULT 0 CHECK (current_load_kg >= 0),
    operational_days VARCHAR(100) DEFAULT 'Senin,Rabu,Sabtu', -- hari operasional
    operational_hours VARCHAR(50) DEFAULT '08:00-16:00', -- jam operasional
    has_maggot_facility BOOLEAN DEFAULT false, -- apakah ada fasilitas maggot
    last_collection_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: current_load tidak boleh melebihi capacity
    CONSTRAINT check_collection_point_load CHECK (current_load_kg <= storage_capacity_kg)
);

-- Membuat tabel waste_transactions (transaksi bank sampah)
CREATE TABLE IF NOT EXISTS waste_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_number VARCHAR(30) UNIQUE NOT NULL, -- WB-2024-000001
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE RESTRICT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('drop_off', 'pickup')) DEFAULT 'drop_off',
    total_weight_kg DECIMAL(10,2) NOT NULL CHECK (total_weight_kg > 0),
    total_value DECIMAL(12,2) NOT NULL CHECK (total_value >= 0),
    admin_fee DECIMAL(12,2) DEFAULT 0 CHECK (admin_fee >= 0), -- biaya admin jika ada
    net_value DECIMAL(12,2) GENERATED ALWAYS AS (total_value - admin_fee) STORED,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'savings_transfer')) DEFAULT 'savings_transfer',
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'transferred', 'paid')) DEFAULT 'pending',
    savings_transaction_id UUID REFERENCES savings_transactions(id), -- link ke transaksi simpanan
    collector_name VARCHAR(100), -- petugas yang menimbang
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel waste_transaction_details (detail per jenis sampah)
CREATE TABLE IF NOT EXISTS waste_transaction_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES waste_transactions(id) ON DELETE CASCADE,
    waste_category_id UUID NOT NULL REFERENCES waste_categories(id) ON DELETE RESTRICT,
    weight_kg DECIMAL(10,2) NOT NULL CHECK (weight_kg > 0),
    price_per_kg DECIMAL(10,2) NOT NULL CHECK (price_per_kg >= 0), -- snapshot harga saat transaksi
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (weight_kg * price_per_kg) STORED,
    condition_quality VARCHAR(20) CHECK (condition_quality IN ('clean', 'normal', 'dirty')) DEFAULT 'normal',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel waste_balances (saldo bank sampah per member)
CREATE TABLE IF NOT EXISTS waste_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE RESTRICT,
    total_weight_collected_kg DECIMAL(12,2) DEFAULT 0 CHECK (total_weight_collected_kg >= 0),
    total_earnings DECIMAL(12,2) DEFAULT 0 CHECK (total_earnings >= 0),
    current_balance DECIMAL(12,2) DEFAULT 0 CHECK (current_balance >= 0), -- saldo yang belum ditransfer
    total_transferred DECIMAL(12,2) DEFAULT 0 CHECK (total_transferred >= 0), -- total sudah ditransfer ke simpanan
    last_transaction_date DATE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel maggot_cycles (siklus produksi maggot)
CREATE TABLE IF NOT EXISTS maggot_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    cycle_code VARCHAR(30) UNIQUE NOT NULL, -- MGT-2024-01
    start_date DATE NOT NULL,
    harvest_date DATE, -- biasanya 14-18 hari setelah start_date
    input_organic_waste_kg DECIMAL(10,2) NOT NULL CHECK (input_organic_waste_kg > 0),
    expected_maggot_yield_kg DECIMAL(10,2) CHECK (expected_maggot_yield_kg >= 0), -- estimasi 20% dari input
    actual_maggot_yield_kg DECIMAL(10,2) DEFAULT 0 CHECK (actual_maggot_yield_kg >= 0),
    expected_kasgot_yield_kg DECIMAL(10,2) CHECK (expected_kasgot_yield_kg >= 0), -- estimasi 30% dari input
    actual_kasgot_yield_kg DECIMAL(10,2) DEFAULT 0 CHECK (actual_kasgot_yield_kg >= 0),
    production_cost DECIMAL(12,2) DEFAULT 0 CHECK (production_cost >= 0),
    maggot_selling_price_per_kg DECIMAL(10,2) DEFAULT 15000 CHECK (maggot_selling_price_per_kg >= 0),
    kasgot_selling_price_per_kg DECIMAL(10,2) DEFAULT 5000 CHECK (kasgot_selling_price_per_kg >= 0),
    total_revenue DECIMAL(12,2) DEFAULT 0 CHECK (total_revenue >= 0),
    status VARCHAR(20) CHECK (status IN ('preparation', 'seeding', 'growing', 'harvested', 'sold')) DEFAULT 'preparation',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: harvest_date harus setelah start_date
    CONSTRAINT check_maggot_cycle_dates CHECK (harvest_date IS NULL OR harvest_date > start_date)
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_waste_categories_active ON waste_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_waste_categories_code ON waste_categories(category_code);

CREATE INDEX IF NOT EXISTS idx_collection_points_tenant ON collection_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_collection_points_rt_rw ON collection_points(rt, rw);
CREATE INDEX IF NOT EXISTS idx_collection_points_active ON collection_points(is_active);
CREATE INDEX IF NOT EXISTS idx_collection_points_code ON collection_points(point_code);

CREATE INDEX IF NOT EXISTS idx_waste_transactions_member ON waste_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_waste_transactions_collection_point ON waste_transactions(collection_point_id);
CREATE INDEX IF NOT EXISTS idx_waste_transactions_date ON waste_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_waste_transactions_status ON waste_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_waste_transactions_number ON waste_transactions(transaction_number);

CREATE INDEX IF NOT EXISTS idx_waste_transaction_details_transaction ON waste_transaction_details(transaction_id);
CREATE INDEX IF NOT EXISTS idx_waste_transaction_details_category ON waste_transaction_details(waste_category_id);

CREATE INDEX IF NOT EXISTS idx_waste_balances_member ON waste_balances(member_id);

CREATE INDEX IF NOT EXISTS idx_maggot_cycles_tenant ON maggot_cycles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maggot_cycles_status ON maggot_cycles(status);
CREATE INDEX IF NOT EXISTS idx_maggot_cycles_dates ON maggot_cycles(start_date, harvest_date);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_waste_categories()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_waste_categories_updated_at 
    BEFORE UPDATE ON waste_categories
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_waste_categories();

CREATE OR REPLACE FUNCTION update_updated_at_collection_points()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_collection_points_updated_at 
    BEFORE UPDATE ON collection_points
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_collection_points();

CREATE OR REPLACE FUNCTION update_updated_at_waste_transactions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_waste_transactions_updated_at 
    BEFORE UPDATE ON waste_transactions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_waste_transactions();

CREATE OR REPLACE FUNCTION update_updated_at_maggot_cycles()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_maggot_cycles_updated_at 
    BEFORE UPDATE ON maggot_cycles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_maggot_cycles();

-- Function untuk generate transaction number
CREATE OR REPLACE FUNCTION generate_waste_transaction_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Menghitung nomor urut berikutnya untuk tahun ini
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM waste_transactions
    WHERE transaction_number LIKE 'WB-' || current_year || '%';
    
    -- Format: WB-2024-000001
    new_number := 'WB-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 6, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function untuk generate maggot cycle code
CREATE OR REPLACE FUNCTION generate_maggot_cycle_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Menghitung nomor urut berikutnya untuk tahun ini
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM maggot_cycles
    WHERE cycle_code LIKE 'MGT-' || current_year || '%';
    
    -- Format: MGT-2024-01
    new_code := 'MGT-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 2, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE waste_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE maggot_cycles ENABLE ROW LEVEL SECURITY;

-- Policy untuk waste_categories: Semua bisa baca kategori aktif
CREATE POLICY IF NOT EXISTS waste_categories_read ON waste_categories
    FOR SELECT USING (is_active = true);

-- Policy untuk collection_points: Semua bisa baca collection point aktif
CREATE POLICY IF NOT EXISTS collection_points_read ON collection_points
    FOR SELECT USING (is_active = true);

-- Policy untuk collection_points: Admin tenant bisa manage
CREATE POLICY IF NOT EXISTS collection_points_admin_manage ON collection_points
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = collection_points.tenant_id
            AND au.is_active = true
        )
    );

-- Policy untuk waste_transactions: Member bisa lihat transaksi mereka
CREATE POLICY IF NOT EXISTS waste_transactions_member_access ON waste_transactions
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk waste_transactions: Admin bisa manage semua transaksi di tenant mereka
CREATE POLICY IF NOT EXISTS waste_transactions_admin_manage ON waste_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN members m ON m.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND m.id = waste_transactions.member_id
            AND au.is_active = true
        )
    );

-- Policy untuk waste_balances: Member bisa lihat saldo mereka
CREATE POLICY IF NOT EXISTS waste_balances_member_access ON waste_balances
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk maggot_cycles: Admin tenant bisa manage
CREATE POLICY IF NOT EXISTS maggot_cycles_admin_manage ON maggot_cycles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = maggot_cycles.tenant_id
            AND au.is_active = true
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE waste_categories IS 'Tabel kategori sampah dengan harga beli/jual';
COMMENT ON COLUMN waste_categories.buying_price_per_kg IS 'Harga beli dari anggota per kg';
COMMENT ON COLUMN waste_categories.selling_price_per_kg IS 'Harga jual ke pengepul per kg';
COMMENT ON COLUMN waste_categories.minimum_weight_kg IS 'Minimal berat untuk transaksi';

COMMENT ON TABLE collection_points IS 'Tabel lokasi bank sampah per RT/RW';
COMMENT ON COLUMN collection_points.current_load_kg IS 'Muatan sampah saat ini';
COMMENT ON COLUMN collection_points.storage_capacity_kg IS 'Kapasitas penyimpanan maksimal';
COMMENT ON COLUMN collection_points.has_maggot_facility IS 'Apakah ada fasilitas produksi maggot';

COMMENT ON TABLE waste_transactions IS 'Tabel transaksi bank sampah member';
COMMENT ON COLUMN waste_transactions.payment_method IS 'cash = bayar tunai, savings_transfer = transfer ke simpanan';
COMMENT ON COLUMN waste_transactions.net_value IS 'Nilai bersih setelah dikurangi admin fee';

COMMENT ON TABLE waste_balances IS 'Tabel saldo bank sampah per member';
COMMENT ON COLUMN waste_balances.current_balance IS 'Saldo yang belum ditransfer ke simpanan';
COMMENT ON COLUMN waste_balances.total_transferred IS 'Total yang sudah ditransfer ke simpanan';

COMMENT ON TABLE maggot_cycles IS 'Tabel siklus produksi maggot dari sampah organik';
COMMENT ON COLUMN maggot_cycles.expected_maggot_yield_kg IS 'Target produksi maggot (20% dari input)';
COMMENT ON COLUMN maggot_cycles.expected_kasgot_yield_kg IS 'Target produksi kasgot/pupuk (30% dari input)';