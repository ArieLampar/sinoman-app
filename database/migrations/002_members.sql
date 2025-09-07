-- Migration: 002_members.sql
-- Deskripsi: Tabel untuk data anggota koperasi (multi-tenant)
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel members (anggota koperasi)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    member_number VARCHAR(20) UNIQUE NOT NULL, -- SIN-2024-00001
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    id_card_number VARCHAR(20) UNIQUE NOT NULL, -- NIK KTP
    date_of_birth DATE,
    gender VARCHAR(1) CHECK (gender IN ('L', 'P')), -- L = Laki-laki, P = Perempuan
    occupation VARCHAR(100),
    address TEXT,
    rt VARCHAR(5),
    rw VARCHAR(5),
    village VARCHAR(100), -- desa/kelurahan
    district VARCHAR(100), -- kecamatan
    photo_url TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    referral_code VARCHAR(20),
    referred_by UUID REFERENCES members(id),
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_members_tenant ON members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_id_card ON members(id_card_number);
CREATE INDEX IF NOT EXISTS idx_members_village ON members(village);
CREATE INDEX IF NOT EXISTS idx_members_district ON members(district);
CREATE INDEX IF NOT EXISTS idx_members_referral ON members(referred_by);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_members()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_members_updated_at 
    BEFORE UPDATE ON members
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_members();

-- Function untuk generate member number otomatis
CREATE OR REPLACE FUNCTION generate_member_number(tenant_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Menghitung nomor urut berikutnya berdasarkan tenant dan tahun
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM members m
    JOIN tenants t ON t.id = m.tenant_id
    WHERE t.tenant_code = tenant_code
    AND m.member_number LIKE t.tenant_code || '-' || current_year || '%';
    
    -- Format: SIN-2024-00001
    new_number := tenant_code || '-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 5, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security untuk multi-tenant
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Policy: Members hanya bisa lihat data mereka sendiri
CREATE POLICY IF NOT EXISTS members_self_access ON members
    FOR SELECT USING (
        auth.uid()::TEXT = id::TEXT
    );

-- Policy: Members bisa update data mereka sendiri (kecuali field sensitif)
CREATE POLICY IF NOT EXISTS members_self_update ON members
    FOR UPDATE USING (
        auth.uid()::TEXT = id::TEXT
    );

-- Policy: Admin tenant bisa akses semua member di tenant mereka
CREATE POLICY IF NOT EXISTS members_tenant_admin_access ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = members.tenant_id
            AND au.is_active = true
        )
    );

-- Policy: Super admin bisa akses semua data
CREATE POLICY IF NOT EXISTS members_super_admin_access ON members
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'super_admin'
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE members IS 'Tabel data anggota koperasi dengan sistem multi-tenant';
COMMENT ON COLUMN members.tenant_id IS 'ID tenant (kecamatan/desa) tempat member terdaftar';
COMMENT ON COLUMN members.member_number IS 'Nomor anggota unik dengan format SIN-YYYY-NNNNN';
COMMENT ON COLUMN members.id_card_number IS 'Nomor KTP/NIK sebagai identitas utama';
COMMENT ON COLUMN members.gender IS 'Jenis kelamin: L = Laki-laki, P = Perempuan';
COMMENT ON COLUMN members.referral_code IS 'Kode referral member untuk program rujukan';
COMMENT ON COLUMN members.referred_by IS 'ID member yang mereferensikan (untuk tracking rujukan)';
COMMENT ON COLUMN members.status IS 'Status keanggotaan: active, inactive, suspended';