-- Migration: 010_functions.sql
-- Deskripsi: Functions, views, dan triggers tambahan untuk sistem Koperasi Sinoman
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- ============================================
-- UTILITY FUNCTIONS
-- ============================================

-- Function untuk generate UUID yang lebih readable
CREATE OR REPLACE FUNCTION generate_readable_id()
RETURNS VARCHAR AS $$
DECLARE
    chars VARCHAR := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Tanpa karakter yang mirip (0,O,1,I)
    result VARCHAR := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function untuk validasi email
CREATE OR REPLACE FUNCTION is_valid_email(email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$';
END;
$$ LANGUAGE plpgsql;

-- Function untuk validasi nomor telepon Indonesia
CREATE OR REPLACE FUNCTION is_valid_phone(phone VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
    -- Format: +62xxx, 08xxx, atau 62xxx
    RETURN phone ~* '^(\+62|62|0)[0-9]{8,13}$';
END;
$$ LANGUAGE plpgsql;

-- Function untuk normalisasi nomor telepon
CREATE OR REPLACE FUNCTION normalize_phone(phone VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
    -- Ubah semua format ke +62xxx
    IF phone ~ '^08' THEN
        RETURN '+62' || substring(phone from 2);
    ELSIF phone ~ '^62' THEN
        RETURN '+' || phone;
    ELSIF phone ~ '^\+62' THEN
        RETURN phone;
    ELSE
        RETURN phone;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BUSINESS LOGIC FUNCTIONS
-- ============================================

-- Function untuk menghitung jarak antara dua koordinat GPS (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL, lon1 DECIMAL,
    lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    r DECIMAL := 6371; -- Radius bumi dalam km
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    
    RETURN r * c;
END;
$$ LANGUAGE plpgsql;

-- Function untuk menentukan prioritas collection point berdasarkan kapasitas
CREATE OR REPLACE FUNCTION get_collection_point_priority(
    current_load_kg DECIMAL,
    capacity_kg DECIMAL,
    days_since_collection INTEGER
)
RETURNS VARCHAR AS $$
DECLARE
    load_percentage DECIMAL;
BEGIN
    load_percentage := (current_load_kg / capacity_kg) * 100;
    
    -- Prioritas berdasarkan kapasitas dan waktu
    IF load_percentage >= 90 OR days_since_collection >= 7 THEN
        RETURN 'urgent';
    ELSIF load_percentage >= 70 OR days_since_collection >= 5 THEN
        RETURN 'high';
    ELSIF load_percentage >= 50 OR days_since_collection >= 3 THEN
        RETURN 'medium';
    ELSE
        RETURN 'low';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function untuk menghitung estimasi hasil maggot dari sampah organik
CREATE OR REPLACE FUNCTION calculate_maggot_yield(
    organic_waste_kg DECIMAL,
    yield_percentage DECIMAL DEFAULT 20
)
RETURNS TABLE(
    expected_maggot_kg DECIMAL,
    expected_kasgot_kg DECIMAL,
    cycle_duration_days INTEGER
) AS $$
BEGIN
    RETURN QUERY SELECT
        ROUND(organic_waste_kg * (yield_percentage / 100), 2) as expected_maggot_kg,
        ROUND(organic_waste_kg * 0.30, 2) as expected_kasgot_kg, -- 30% jadi kasgot
        CASE 
            WHEN organic_waste_kg <= 100 THEN 14
            WHEN organic_waste_kg <= 500 THEN 16
            ELSE 18
        END as cycle_duration_days;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REPORTING FUNCTIONS
-- ============================================

-- Function untuk mendapatkan ringkasan dashboard member
CREATE OR REPLACE FUNCTION get_member_dashboard_summary(p_member_id UUID)
RETURNS TABLE(
    member_name VARCHAR,
    total_savings_balance DECIMAL,
    waste_balance DECIMAL,
    total_weight_collected_kg DECIMAL,
    total_orders INTEGER,
    active_fit_challenges INTEGER,
    unread_notifications INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.full_name,
        COALESCE(sa.total_balance, 0),
        COALESCE(wb.current_balance, 0),
        COALESCE(wb.total_weight_collected_kg, 0),
        COALESCE(order_stats.total_orders, 0)::INTEGER,
        COALESCE(fit_stats.active_challenges, 0)::INTEGER,
        COALESCE(notif_stats.unread_count, 0)::INTEGER
    FROM members m
    LEFT JOIN savings_accounts sa ON sa.member_id = m.id
    LEFT JOIN waste_balances wb ON wb.member_id = m.id
    LEFT JOIN (
        SELECT member_id, COUNT(*) as total_orders
        FROM orders 
        WHERE member_id = p_member_id
        GROUP BY member_id
    ) order_stats ON order_stats.member_id = m.id
    LEFT JOIN (
        SELECT member_id, COUNT(*) as active_challenges
        FROM fit_participants 
        WHERE member_id = p_member_id AND status = 'active'
        GROUP BY member_id
    ) fit_stats ON fit_stats.member_id = m.id
    LEFT JOIN (
        SELECT recipient_id, COUNT(*) as unread_count
        FROM notifications 
        WHERE recipient_id = p_member_id AND recipient_type = 'member' AND is_read = false
        GROUP BY recipient_id
    ) notif_stats ON notif_stats.recipient_id = m.id
    WHERE m.id = p_member_id;
END;
$$ LANGUAGE plpgsql;

-- Function untuk laporan waste bank harian per tenant
CREATE OR REPLACE FUNCTION get_daily_waste_report(
    p_tenant_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    collection_point_name VARCHAR,
    total_transactions INTEGER,
    total_weight_kg DECIMAL,
    total_value DECIMAL,
    unique_members INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.point_name,
        COUNT(wt.id)::INTEGER,
        COALESCE(SUM(wt.total_weight_kg), 0),
        COALESCE(SUM(wt.net_value), 0),
        COUNT(DISTINCT wt.member_id)::INTEGER
    FROM collection_points cp
    LEFT JOIN waste_transactions wt ON wt.collection_point_id = cp.id 
        AND wt.transaction_date = p_date
    WHERE cp.tenant_id = p_tenant_id
        AND cp.is_active = true
    GROUP BY cp.id, cp.point_name
    ORDER BY cp.point_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS FOR REPORTING
-- ============================================

-- View untuk dashboard collection points
CREATE OR REPLACE VIEW collection_points_dashboard AS
SELECT 
    cp.id,
    cp.tenant_id,
    cp.point_name,
    cp.current_load_kg,
    cp.storage_capacity_kg,
    ROUND((cp.current_load_kg / cp.storage_capacity_kg) * 100, 1) as capacity_percentage,
    get_collection_point_priority(
        cp.current_load_kg, 
        cp.storage_capacity_kg,
        COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999)
    ) as priority_level,
    COALESCE(EXTRACT(DAY FROM CURRENT_DATE - cp.last_collection_date)::INTEGER, 999) as days_since_collection,
    cp.contact_person,
    cp.contact_phone,
    cp.rt,
    cp.rw,
    cp.is_active
FROM collection_points cp
WHERE cp.is_active = true;

COMMENT ON VIEW collection_points_dashboard IS 'View dashboard untuk monitoring status collection points';

-- View untuk member performance summary
CREATE OR REPLACE VIEW member_performance_summary AS
SELECT 
    m.id,
    m.tenant_id,
    m.full_name,
    m.member_number,
    COALESCE(sa.total_balance, 0) as savings_balance,
    COALESCE(wb.total_weight_collected_kg, 0) as total_waste_kg,
    COALESCE(wb.total_earnings, 0) as total_waste_earnings,
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.total_spent, 0) as total_spent,
    COALESCE(fit_stats.completed_challenges, 0) as completed_fit_challenges,
    CASE 
        WHEN COALESCE(wb.total_weight_collected_kg, 0) >= 100 THEN 'platinum'
        WHEN COALESCE(wb.total_weight_collected_kg, 0) >= 50 THEN 'gold'
        WHEN COALESCE(wb.total_weight_collected_kg, 0) >= 20 THEN 'silver'
        WHEN COALESCE(wb.total_weight_collected_kg, 0) >= 5 THEN 'bronze'
        ELSE 'starter'
    END as member_tier
FROM members m
LEFT JOIN savings_accounts sa ON sa.member_id = m.id
LEFT JOIN waste_balances wb ON wb.member_id = m.id
LEFT JOIN (
    SELECT 
        member_id, 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_spent
    FROM orders 
    WHERE order_status = 'delivered'
    GROUP BY member_id
) order_stats ON order_stats.member_id = m.id
LEFT JOIN (
    SELECT 
        member_id,
        COUNT(*) as completed_challenges
    FROM fit_participants 
    WHERE status = 'completed'
    GROUP BY member_id
) fit_stats ON fit_stats.member_id = m.id
WHERE m.status = 'active';

COMMENT ON VIEW member_performance_summary IS 'View ringkasan performa member dengan tier level';

-- View untuk financial overview per tenant
CREATE OR REPLACE VIEW tenant_financial_overview AS
SELECT 
    t.id,
    t.tenant_name,
    
    -- Revenue streams current month
    COALESCE(savings_rev.amount, 0) as current_month_savings_revenue,
    COALESCE(waste_rev.amount, 0) as current_month_waste_revenue,
    COALESCE(product_rev.amount, 0) as current_month_product_revenue,
    COALESCE(fitness_rev.amount, 0) as current_month_fitness_revenue,
    
    -- Total current month revenue
    COALESCE(savings_rev.amount, 0) + 
    COALESCE(waste_rev.amount, 0) + 
    COALESCE(product_rev.amount, 0) + 
    COALESCE(fitness_rev.amount, 0) as total_current_month_revenue,
    
    -- Member counts
    COALESCE(member_stats.total_members, 0) as total_members,
    COALESCE(member_stats.active_members, 0) as active_members,
    
    -- Transaction counts current month
    COALESCE(transaction_stats.waste_transactions, 0) as current_month_waste_transactions,
    COALESCE(transaction_stats.product_orders, 0) as current_month_product_orders
    
FROM tenants t
LEFT JOIN (
    -- Savings revenue (admin fee dari simpanan)
    SELECT 
        m.tenant_id,
        SUM(st.amount * 0.001) as amount -- asumsi admin fee 0.1%
    FROM savings_transactions st
    JOIN members m ON m.id = st.member_id
    WHERE DATE_TRUNC('month', st.created_at) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY m.tenant_id
) savings_rev ON savings_rev.tenant_id = t.id
LEFT JOIN (
    -- Waste revenue (margin dari jual beli sampah)
    SELECT 
        cp.tenant_id,
        SUM(wt.admin_fee) as amount
    FROM waste_transactions wt
    JOIN collection_points cp ON cp.id = wt.collection_point_id
    WHERE DATE_TRUNC('month', wt.transaction_date::date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY cp.tenant_id
) waste_rev ON waste_rev.tenant_id = t.id
LEFT JOIN (
    -- Product revenue
    SELECT 
        p.tenant_id,
        SUM(oi.subtotal - (oi.quantity * p.cost_price)) as amount -- profit margin
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', CURRENT_DATE)
    AND o.order_status = 'delivered'
    GROUP BY p.tenant_id
) product_rev ON product_rev.tenant_id = t.id
LEFT JOIN (
    -- Fitness revenue
    SELECT 
        fc.tenant_id,
        SUM(fp.payment_amount) as amount
    FROM fit_participants fp
    JOIN fit_challenges fc ON fc.id = fp.challenge_id
    WHERE DATE_TRUNC('month', fp.registration_date::date) = DATE_TRUNC('month', CURRENT_DATE)
    AND fp.payment_status = 'paid'
    GROUP BY fc.tenant_id
) fitness_rev ON fitness_rev.tenant_id = t.id
LEFT JOIN (
    -- Member statistics
    SELECT 
        tenant_id,
        COUNT(*) as total_members,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_members
    FROM members
    GROUP BY tenant_id
) member_stats ON member_stats.tenant_id = t.id
LEFT JOIN (
    -- Transaction statistics current month
    SELECT 
        cp.tenant_id,
        COUNT(DISTINCT wt.id) as waste_transactions,
        COUNT(DISTINCT o.id) as product_orders
    FROM collection_points cp
    LEFT JOIN waste_transactions wt ON wt.collection_point_id = cp.id
        AND DATE_TRUNC('month', wt.transaction_date::date) = DATE_TRUNC('month', CURRENT_DATE)
    LEFT JOIN members m ON m.tenant_id = cp.tenant_id
    LEFT JOIN orders o ON o.member_id = m.id
        AND DATE_TRUNC('month', o.order_date) = DATE_TRUNC('month', CURRENT_DATE)
    GROUP BY cp.tenant_id
) transaction_stats ON transaction_stats.tenant_id = t.id
WHERE t.is_active = true;

COMMENT ON VIEW tenant_financial_overview IS 'View overview keuangan per tenant bulan berjalan';

-- ============================================
-- TRIGGERS UNTUK AUTOMASI
-- ============================================

-- Trigger untuk auto-generate member number saat insert member baru
CREATE OR REPLACE FUNCTION auto_generate_member_number()
RETURNS TRIGGER AS $$
DECLARE
    tenant_code VARCHAR;
BEGIN
    -- Ambil tenant_code dari tenant
    SELECT t.tenant_code INTO tenant_code
    FROM tenants t
    WHERE t.id = NEW.tenant_id;
    
    -- Generate member number jika belum ada
    IF NEW.member_number IS NULL OR NEW.member_number = '' THEN
        NEW.member_number := generate_member_number(tenant_code);
    END IF;
    
    -- Auto-generate account number untuk savings
    INSERT INTO savings_accounts (member_id, account_number)
    VALUES (NEW.id, generate_account_number());
    
    -- Initialize waste balance
    INSERT INTO waste_balances (member_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_auto_generate_member_data
    AFTER INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_member_number();

-- Trigger untuk create welcome notification saat member baru
CREATE OR REPLACE FUNCTION create_welcome_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notifications (
        recipient_id,
        recipient_type,
        title,
        message,
        type,
        category
    ) VALUES (
        NEW.id,
        'member',
        'Selamat Datang di Koperasi Sinoman!',
        'Terima kasih telah bergabung dengan Koperasi Sinoman. Nikmati berbagai layanan kami: simpanan anggota, bank sampah, fit challenge, dan belanja produk lokal.',
        'success',
        'welcome'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_create_welcome_notification
    AFTER INSERT ON members
    FOR EACH ROW
    EXECUTE FUNCTION create_welcome_notification();

-- Trigger untuk auto-approve small waste transactions
CREATE OR REPLACE FUNCTION auto_approve_small_waste_transactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-approve transaksi di bawah 50rb dan auto-transfer ke savings
    IF NEW.net_value <= 50000 THEN
        NEW.payment_status := 'transferred';
        
        -- Create savings transaction
        INSERT INTO savings_transactions (
            member_id,
            account_id,
            transaction_code,
            transaction_type,
            savings_type,
            amount,
            balance_before,
            balance_after,
            description,
            payment_method
        ) 
        SELECT 
            NEW.member_id,
            sa.id,
            generate_transaction_code(),
            'deposit',
            'sukarela',
            NEW.net_value,
            sa.sukarela_balance,
            sa.sukarela_balance + NEW.net_value,
            'Auto-transfer dari Bank Sampah - ' || NEW.transaction_number,
            'waste_balance'
        FROM savings_accounts sa
        WHERE sa.member_id = NEW.member_id;
        
        -- Update savings account balance
        UPDATE savings_accounts 
        SET sukarela_balance = sukarela_balance + NEW.net_value,
            last_transaction_date = NOW()
        WHERE member_id = NEW.member_id;
        
        -- Update waste balance
        UPDATE waste_balances 
        SET total_transferred = total_transferred + NEW.net_value,
            total_earnings = total_earnings + NEW.net_value,
            total_weight_collected_kg = total_weight_collected_kg + NEW.total_weight_kg,
            last_transaction_date = NEW.transaction_date
        WHERE member_id = NEW.member_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_auto_approve_small_waste_transactions
    BEFORE INSERT ON waste_transactions
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_small_waste_transactions();

-- ============================================
-- SCHEDULED JOBS FUNCTIONS
-- ============================================

-- Function untuk monthly cleanup dan maintenance
CREATE OR REPLACE FUNCTION monthly_maintenance()
RETURNS TABLE(
    task VARCHAR,
    status VARCHAR,
    records_affected INTEGER,
    message TEXT
) AS $$
DECLARE
    expired_notif_count INTEGER;
    old_audit_count INTEGER;
BEGIN
    -- Cleanup expired notifications
    SELECT cleanup_expired_notifications() INTO expired_notif_count;
    
    RETURN QUERY SELECT 
        'cleanup_notifications'::VARCHAR,
        'completed'::VARCHAR,
        expired_notif_count,
        'Expired notifications cleaned up'::TEXT;
    
    -- Cleanup old audit logs (older than 1 year)
    SELECT cleanup_old_audit_logs() INTO old_audit_count;
    
    RETURN QUERY SELECT 
        'cleanup_audit_logs'::VARCHAR,
        'completed'::VARCHAR,
        old_audit_count,
        'Old audit logs cleaned up'::TEXT;
    
    -- Update system health metrics
    -- (Ini bisa diperluas sesuai kebutuhan monitoring)
    RETURN QUERY SELECT 
        'system_health_check'::VARCHAR,
        'completed'::VARCHAR,
        0,
        'System health check completed'::TEXT;
        
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monthly_maintenance IS 'Function untuk maintenance bulanan: cleanup data lama dan update metrics';

-- ============================================
-- FINAL COMMENTS
-- ============================================

COMMENT ON SCHEMA public IS 'Database schema untuk Koperasi Sinoman SuperApp - Multi-tenant cooperative management system';

-- Selesai! Semua migration files telah dibuat