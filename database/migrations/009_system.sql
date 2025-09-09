-- Migration: 009_system.sql
-- Deskripsi: Tabel untuk sistem admin, audit logs, notifikasi, dan pengaturan
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel admin_users (pengelola sistem)
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- akan di-hash menggunakan bcrypt atau similar
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) CHECK (role IN ('super_admin', 'admin', 'manager', 'staff', 'collector')) DEFAULT 'staff',
    permissions JSONB DEFAULT '{}', -- {"manage_members": true, "manage_waste": true, etc}
    avatar_url TEXT,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0 CHECK (login_count >= 0),
    failed_login_attempts INTEGER DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until TIMESTAMP WITH TIME ZONE, -- untuk account lockout
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel audit_logs (log aktivitas sistem)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID, -- bisa member atau admin, tidak pakai foreign key agar flexible
    user_type VARCHAR(20) CHECK (user_type IN ('member', 'admin', 'system')) NOT NULL,
    action VARCHAR(100) NOT NULL, -- login/create/update/delete/approve/etc
    table_name VARCHAR(50), -- nama tabel yang diubah
    record_id UUID, -- ID record yang diubah
    old_values JSONB DEFAULT '{}', -- nilai sebelum perubahan
    new_values JSONB DEFAULT '{}', -- nilai setelah perubahan
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    request_method VARCHAR(10), -- GET/POST/PUT/DELETE
    request_path TEXT,
    response_status INTEGER,
    execution_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel notifications (notifikasi ke member dan admin)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL, -- bisa member atau admin
    recipient_type VARCHAR(20) CHECK (recipient_type IN ('member', 'admin')) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'success', 'warning', 'error')) DEFAULT 'info',
    category VARCHAR(50), -- payment/waste/fitness/promo/system/announcement
    action_url TEXT, -- link untuk action button
    action_label VARCHAR(50), -- label untuk action button
    data JSONB DEFAULT '{}', -- data tambahan untuk notifikasi
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    sent_via VARCHAR(50) DEFAULT 'in_app', -- in_app/email/whatsapp/sms/push
    delivery_status VARCHAR(20) CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
    delivery_attempts INTEGER DEFAULT 0 CHECK (delivery_attempts >= 0),
    scheduled_at TIMESTAMP WITH TIME ZONE, -- untuk notifikasi terjadwal
    expires_at TIMESTAMP WITH TIME ZONE, -- notifikasi akan dihapus otomatis setelah expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel settings (pengaturan sistem per tenant)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- apakah setting bisa diakses public
    updated_by UUID REFERENCES admin_users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu tenant tidak boleh punya setting key yang sama lebih dari sekali
    UNIQUE(tenant_id, setting_key)
);

-- Membuat tabel system_health (monitoring kesehatan sistem)
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- cpu_usage/memory_usage/disk_space/api_response_time/etc
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20) DEFAULT 'percent', -- percent/mb/gb/ms/count
    status VARCHAR(20) CHECK (status IN ('healthy', 'warning', 'critical')) NOT NULL,
    threshold_warning DECIMAL(10,2),
    threshold_critical DECIMAL(10,2),
    message TEXT,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at);

CREATE INDEX IF NOT EXISTS idx_settings_tenant ON settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_settings_public ON settings(is_public);

CREATE INDEX IF NOT EXISTS idx_system_health_tenant ON system_health(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_health_metric ON system_health(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health(checked_at);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_admin_users()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_admin_users_updated_at 
    BEFORE UPDATE ON admin_users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_admin_users();

CREATE OR REPLACE FUNCTION update_updated_at_settings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_settings_updated_at 
    BEFORE UPDATE ON settings
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_settings();

-- Function untuk cleanup notifications yang expired
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function untuk cleanup audit logs yang lama (lebih dari 1 tahun)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function untuk create audit log otomatis
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    user_id_val UUID;
    tenant_id_val UUID;
BEGIN
    -- Ambil user_id dari session atau auth context
    user_id_val := auth.uid();
    
    -- Tentukan tenant_id berdasarkan tabel
    IF TG_TABLE_NAME = 'members' THEN
        tenant_id_val := COALESCE(NEW.tenant_id, OLD.tenant_id);
    ELSIF TG_TABLE_NAME = 'admin_users' THEN
        tenant_id_val := COALESCE(NEW.tenant_id, OLD.tenant_id);
    -- tambahkan logic untuk tabel lain sesuai kebutuhan
    END IF;
    
    -- Insert audit log
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        user_type,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        tenant_id_val,
        user_id_val,
        CASE 
            WHEN EXISTS (SELECT 1 FROM admin_users WHERE id = user_id_val) THEN 'admin'
            WHEN EXISTS (SELECT 1 FROM members WHERE id = user_id_val) THEN 'member'
            ELSE 'system'
        END,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END,
        CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE '{}'::jsonb END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Policy untuk admin_users: Admin hanya bisa lihat dan manage user di tenant mereka
CREATE POLICY IF NOT EXISTS admin_users_tenant_access ON admin_users
    FOR ALL USING (
        -- Super admin bisa akses semua
        (auth.jwt() ->> 'role' = 'super_admin')
        OR
        -- Admin biasa hanya bisa akses tenant mereka
        (tenant_id = (auth.jwt() ->> 'tenant_id')::UUID)
    );

-- Policy untuk admin_users: Self access - admin bisa lihat dan edit profil sendiri
CREATE POLICY IF NOT EXISTS admin_users_self_access ON admin_users
    FOR ALL USING (
        id = auth.uid()
    );

-- Policy untuk audit_logs: Admin hanya bisa lihat log di tenant mereka
CREATE POLICY IF NOT EXISTS audit_logs_tenant_access ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND (
                au.role = 'super_admin' OR
                au.tenant_id = audit_logs.tenant_id
            )
            AND au.is_active = true
        )
    );

-- Policy untuk notifications: Recipient bisa lihat notifikasi mereka
CREATE POLICY IF NOT EXISTS notifications_recipient_access ON notifications
    FOR SELECT USING (
        recipient_id = auth.uid()
    );

-- Policy untuk notifications: Recipient bisa update status baca
CREATE POLICY IF NOT EXISTS notifications_recipient_update ON notifications
    FOR UPDATE USING (
        recipient_id = auth.uid()
    ) WITH CHECK (
        recipient_id = auth.uid()
        AND OLD.recipient_id = NEW.recipient_id -- tidak boleh ganti recipient
    );

-- Policy untuk settings: Admin bisa manage settings di tenant mereka
CREATE POLICY IF NOT EXISTS settings_admin_access ON settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = settings.tenant_id
            AND au.is_active = true
            AND au.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Policy untuk settings: Public settings bisa dibaca semua orang
CREATE POLICY IF NOT EXISTS settings_public_read ON settings
    FOR SELECT USING (
        is_public = true
    );

-- Policy untuk system_health: Admin bisa lihat health metrics tenant mereka
CREATE POLICY IF NOT EXISTS system_health_admin_access ON system_health
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND (
                au.role = 'super_admin' OR
                au.tenant_id = system_health.tenant_id
            )
            AND au.is_active = true
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE admin_users IS 'Tabel pengelola sistem dengan berbagai tingkat akses';
COMMENT ON COLUMN admin_users.role IS 'Level akses: super_admin, admin, manager, staff, collector';
COMMENT ON COLUMN admin_users.permissions IS 'Permissions spesifik dalam format JSON';
COMMENT ON COLUMN admin_users.failed_login_attempts IS 'Counter untuk lockout security';
COMMENT ON COLUMN admin_users.locked_until IS 'Timestamp sampai akun di-unlock';

COMMENT ON TABLE audit_logs IS 'Tabel log aktivitas semua user untuk audit trail';
COMMENT ON COLUMN audit_logs.user_type IS 'Tipe user: member, admin, atau system';
COMMENT ON COLUMN audit_logs.old_values IS 'Data sebelum perubahan dalam format JSON';
COMMENT ON COLUMN audit_logs.new_values IS 'Data setelah perubahan dalam format JSON';

COMMENT ON TABLE notifications IS 'Tabel notifikasi untuk member dan admin';
COMMENT ON COLUMN notifications.recipient_type IS 'Tipe penerima: member atau admin';
COMMENT ON COLUMN notifications.sent_via IS 'Channel pengiriman: in_app, email, whatsapp, sms, push';
COMMENT ON COLUMN notifications.data IS 'Data tambahan untuk notifikasi dalam format JSON';

COMMENT ON TABLE settings IS 'Tabel pengaturan sistem per tenant';
COMMENT ON COLUMN settings.setting_value IS 'Nilai pengaturan dalam format JSON';
COMMENT ON COLUMN settings.is_public IS 'Apakah setting bisa diakses tanpa login';

COMMENT ON TABLE system_health IS 'Tabel monitoring kesehatan sistem';
COMMENT ON COLUMN system_health.metric_name IS 'Nama metrik: cpu_usage, memory_usage, disk_space, dll';
COMMENT ON COLUMN system_health.status IS 'Status: healthy, warning, critical';

COMMENT ON FUNCTION cleanup_expired_notifications IS 'Function untuk menghapus notifikasi yang expired';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Function untuk menghapus audit log yang sudah lama';