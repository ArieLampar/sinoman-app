-- database/migrations/001_security_tables.sql
-- Migrasi untuk tabel-tabel keamanan Sinoman SuperApp

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes untuk performa query audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address ON audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- Security Alerts Table
CREATE TABLE IF NOT EXISTS security_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    description TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes untuk security alerts
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_event_type ON security_alerts(event_type);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON security_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant_id ON security_alerts(tenant_id) WHERE tenant_id IS NOT NULL;

-- Login Attempts Table (untuk rate limiting dan monitoring)
CREATE TABLE IF NOT EXISTS login_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255),
    ip_address INET NOT NULL,
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason VARCHAR(255),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes untuk login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);

-- Rate Limit Violations Table
CREATE TABLE IF NOT EXISTS rate_limit_violations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_address INET NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    limit_type VARCHAR(50) NOT NULL,
    requests_count INTEGER NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    user_agent TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes untuk rate limit violations
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_created_at ON rate_limit_violations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip_address ON rate_limit_violations(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_endpoint ON rate_limit_violations(endpoint);

-- Session Management Table (untuk session tracking)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes untuk user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Add RLS Policies

-- Audit Logs RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin can see all audit logs
CREATE POLICY "Super admin full access to audit logs" ON audit_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid() 
            AND members.role = 'super_admin'
        )
    );

-- Admin can see audit logs from their tenant
CREATE POLICY "Admin can view tenant audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid() 
            AND members.role IN ('admin', 'super_admin')
            AND (members.tenant_id = audit_logs.tenant_id OR members.role = 'super_admin')
        )
    );

-- Users can see their own audit logs
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (auth.uid() = user_id);

-- System can insert audit logs (bypass RLS for service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Security Alerts RLS
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Admin dapat melihat security alerts untuk tenant mereka
CREATE POLICY "Admin can view tenant security alerts" ON security_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid() 
            AND members.role IN ('admin', 'super_admin')
            AND (members.tenant_id = security_alerts.tenant_id OR members.role = 'super_admin')
        )
    );

-- System can manage security alerts
CREATE POLICY "System can manage security alerts" ON security_alerts
    FOR ALL WITH CHECK (true);

-- Login Attempts RLS
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Admin dapat melihat login attempts untuk tenant mereka
CREATE POLICY "Admin can view tenant login attempts" ON login_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid() 
            AND members.role IN ('admin', 'super_admin')
            AND (members.tenant_id = login_attempts.tenant_id OR members.role = 'super_admin')
        )
    );

-- System can insert login attempts
CREATE POLICY "System can insert login attempts" ON login_attempts
    FOR INSERT WITH CHECK (true);

-- Rate Limit Violations RLS
ALTER TABLE rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- Admin dapat melihat rate limit violations
CREATE POLICY "Admin can view rate limit violations" ON rate_limit_violations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid() 
            AND members.role IN ('admin', 'super_admin')
        )
    );

-- System can manage rate limit violations
CREATE POLICY "System can manage rate limit violations" ON rate_limit_violations
    FOR ALL WITH CHECK (true);

-- User Sessions RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can see their own sessions
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Admin can see sessions in their tenant
CREATE POLICY "Admin can view tenant sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM members 
            WHERE members.id = auth.uid() 
            AND members.role IN ('admin', 'super_admin')
            AND (members.tenant_id = user_sessions.tenant_id OR members.role = 'super_admin')
        )
    );

-- System can manage sessions
CREATE POLICY "System can manage sessions" ON user_sessions
    FOR ALL WITH CHECK (true);

-- Create Functions untuk cleanup otomatis

-- Function untuk cleanup old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete audit logs older than 90 days
    DELETE FROM audit_logs 
    WHERE created_at < (now() - interval '90 days');
    
    -- Delete login attempts older than 30 days
    DELETE FROM login_attempts 
    WHERE created_at < (now() - interval '30 days');
    
    -- Delete rate limit violations older than 7 days
    DELETE FROM rate_limit_violations 
    WHERE created_at < (now() - interval '7 days');
    
    -- Delete expired sessions
    DELETE FROM user_sessions 
    WHERE expires_at < now() OR (is_active = false AND last_activity < (now() - interval '1 day'));
    
    RAISE NOTICE 'Cleanup completed successfully';
END;
$$;

-- Schedule cleanup function (this would need to be set up separately in production)
-- SELECT cron.schedule('cleanup-security-logs', '0 2 * * *', 'SELECT cleanup_old_audit_logs();');

-- Views untuk reporting

-- View untuk security metrics
CREATE OR REPLACE VIEW security_metrics_daily AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE level = 'error') as errors,
    COUNT(*) FILTER (WHERE level = 'warn') as warnings,
    COUNT(*) FILTER (WHERE success = false) as failures,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM audit_logs 
WHERE created_at >= (now() - interval '30 days')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- View untuk top failed actions
CREATE OR REPLACE VIEW top_failed_actions AS
SELECT 
    action,
    COUNT(*) as failure_count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT ip_address) as source_ips,
    MAX(created_at) as last_failure
FROM audit_logs 
WHERE success = false 
    AND created_at >= (now() - interval '7 days')
GROUP BY action
HAVING COUNT(*) >= 5
ORDER BY failure_count DESC;

-- View untuk suspicious IP addresses
CREATE OR REPLACE VIEW suspicious_ips AS
SELECT 
    ip_address,
    COUNT(*) as total_attempts,
    COUNT(*) FILTER (WHERE success = false) as failed_attempts,
    COUNT(DISTINCT user_id) as different_users_attempted,
    MIN(created_at) as first_attempt,
    MAX(created_at) as last_attempt,
    ARRAY_AGG(DISTINCT action) as attempted_actions
FROM audit_logs 
WHERE ip_address IS NOT NULL 
    AND created_at >= (now() - interval '24 hours')
GROUP BY ip_address
HAVING 
    COUNT(*) FILTER (WHERE success = false) >= 10 OR
    COUNT(DISTINCT user_id) >= 5
ORDER BY failed_attempts DESC, total_attempts DESC;

-- Comments untuk dokumentasi
COMMENT ON TABLE audit_logs IS 'Mencatat semua aktivitas sistem untuk audit dan compliance';
COMMENT ON TABLE security_alerts IS 'Alert keamanan yang memerlukan perhatian administrator';
COMMENT ON TABLE login_attempts IS 'Percobaan login untuk monitoring dan rate limiting';
COMMENT ON TABLE rate_limit_violations IS 'Pelanggaran rate limit untuk analisis abuse';
COMMENT ON TABLE user_sessions IS 'Tracking session aktif untuk keamanan';

COMMENT ON FUNCTION cleanup_old_audit_logs() IS 'Membersihkan data lama untuk menghemat storage dan menjaga performa';
COMMENT ON VIEW security_metrics_daily IS 'Metrics harian untuk dashboard monitoring';
COMMENT ON VIEW suspicious_ips IS 'IP address yang menunjukkan aktivitas mencurigakan';

-- Grant permissions untuk service role
GRANT ALL ON audit_logs TO service_role;
GRANT ALL ON security_alerts TO service_role;
GRANT ALL ON login_attempts TO service_role;
GRANT ALL ON rate_limit_violations TO service_role;
GRANT ALL ON user_sessions TO service_role;

GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;

-- Grant permissions untuk authenticated users (sesuai RLS policies)
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT ON security_alerts TO authenticated;
GRANT SELECT ON login_attempts TO authenticated;
GRANT SELECT ON rate_limit_violations TO authenticated;
GRANT SELECT ON user_sessions TO authenticated;

GRANT SELECT ON security_metrics_daily TO authenticated;
GRANT SELECT ON top_failed_actions TO authenticated;
GRANT SELECT ON suspicious_ips TO authenticated;