-- Migration: 001_tenants.sql
-- Deskripsi: Tabel untuk manajemen multi-tenant (kecamatan dan desa di Ponorogo)
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel tenants (untuk multi-tenant system)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code VARCHAR(20) UNIQUE NOT NULL, -- PON-001, DSA-002, dst
    tenant_name VARCHAR(100) NOT NULL, -- Koperasi Sinoman Ponorogo Kota
    tenant_type VARCHAR(20) CHECK (tenant_type IN ('kecamatan', 'desa', 'pusat')) NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    admin_name VARCHAR(100),
    admin_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}', -- pengaturan khusus per tenant
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_tenants_code ON tenants(tenant_code);
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(tenant_type);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_tenants()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_tenants_updated_at 
    BEFORE UPDATE ON tenants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_tenants();

-- Enable Row Level Security untuk multi-tenant
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Policy: Admin hanya bisa melihat data tenant mereka
CREATE POLICY IF NOT EXISTS tenants_access_policy ON tenants
    FOR ALL USING (
        -- Super admin bisa akses semua
        (auth.jwt() ->> 'role' = 'super_admin') 
        OR 
        -- Admin tenant hanya bisa akses tenant mereka
        (id = (auth.jwt() ->> 'tenant_id')::UUID)
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE tenants IS 'Tabel untuk manajemen multi-tenant sistem koperasi (kecamatan/desa)';
COMMENT ON COLUMN tenants.tenant_code IS 'Kode unik tenant (PON-001, DSA-002, dst)';
COMMENT ON COLUMN tenants.tenant_type IS 'Jenis tenant: kecamatan, desa, atau pusat';
COMMENT ON COLUMN tenants.settings IS 'Pengaturan kustom untuk setiap tenant dalam format JSON';