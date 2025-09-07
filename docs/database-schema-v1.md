COMPLETE DATABASE SCHEMA
Buatkan SQL commands untuk create tables di Supabase.
PENTING: Sistem ini multi-tenant untuk beberapa kecamatan dan desa di Ponorogo.

=== PART 1: TENANT & LOCATION TABLES ===

1. tenants (Multi-tenant untuk kecamatan/desa)
   - id UUID PRIMARY KEY
   - tenant_code VARCHAR(20) UNIQUE -- PON-001
   - tenant_name VARCHAR(100) -- Koperasi Sinoman Ponorogo Kota
   - tenant_type ENUM('kecamatan', 'desa', 'pusat')
   - address TEXT
   - phone, email
   - admin_name, admin_phone
   - is_active BOOLEAN DEFAULT true
   - settings JSONB -- custom settings per tenant
   - created_at, updated_at

2. members (anggota koperasi - with tenant)
   - id UUID PRIMARY KEY
   - tenant_id UUID REFERENCES tenants(id)
   - member_number VARCHAR(20) UNIQUE -- SIN-2024-00001
   - full_name VARCHAR(100)
   - email VARCHAR(100) 
   - phone VARCHAR(20)
   - id_card_number VARCHAR(20) UNIQUE -- NIK KTP
   - date_of_birth DATE
   - gender ENUM('L', 'P')
   - occupation VARCHAR(100)
   - address TEXT
   - rt VARCHAR(5), rw VARCHAR(5)
   - village VARCHAR(100) -- desa/kelurahan
   - district VARCHAR(100) -- kecamatan
   - photo_url TEXT
   - join_date DATE DEFAULT CURRENT_DATE
   - referral_code VARCHAR(20)
   - referred_by UUID REFERENCES members(id)
   - status ENUM('active', 'inactive', 'suspended') DEFAULT 'active'
   - created_at, updated_at

=== PART 2: SAVINGS TABLES ===

3. savings_accounts (akun simpanan per member)
   - id UUID PRIMARY KEY
   - member_id UUID REFERENCES members(id) UNIQUE
   - account_number VARCHAR(20) UNIQUE
   - pokok_balance DECIMAL(12,2) DEFAULT 0 -- simpanan pokok 80rb
   - wajib_balance DECIMAL(12,2) DEFAULT 0 -- wajib 10rb/bulan
   - sukarela_balance DECIMAL(12,2) DEFAULT 0
   - total_balance DECIMAL(12,2) GENERATED ALWAYS AS (pokok_balance + wajib_balance + sukarela_balance) STORED
   - last_transaction_date TIMESTAMP
   - created_at, updated_at

4. savings_transactions (transaksi simpanan)
   - id UUID PRIMARY KEY
   - member_id UUID REFERENCES members(id)
   - account_id UUID REFERENCES savings_accounts(id)
   - transaction_code VARCHAR(30) UNIQUE -- TRX-2024-000001
   - transaction_type ENUM('deposit', 'withdrawal', 'transfer', 'shu')
   - savings_type ENUM('pokok', 'wajib', 'sukarela')
   - amount DECIMAL(12,2)
   - balance_before DECIMAL(12,2)
   - balance_after DECIMAL(12,2)
   - description TEXT
   - payment_method VARCHAR(50) -- cash/transfer/waste_balance
   - reference_number VARCHAR(50) -- for bank transfer
   - verified_by UUID REFERENCES admin_users(id)
   - verified_at TIMESTAMP
   - created_at

=== PART 3: FIT CHALLENGE TABLES ===

5. fit_challenges (program 8 minggu)
   - id UUID PRIMARY KEY
   - tenant_id UUID REFERENCES tenants(id)
   - challenge_code VARCHAR(20) UNIQUE -- FC-2024-01
   - challenge_name VARCHAR(100)
   - batch_number INTEGER
   - start_date DATE
   - end_date DATE
   - registration_fee DECIMAL(12,2) DEFAULT 600000
   - max_participants INTEGER DEFAULT 50
   - current_participants INTEGER DEFAULT 0
   - trainer_name VARCHAR(100)
   - trainer_phone VARCHAR(20)
   - location VARCHAR(200)
   - schedule TEXT -- jadwal latihan
   - status ENUM('upcoming', 'registration', 'active', 'completed') DEFAULT 'upcoming'
   - created_at, updated_at

6. fit_participants (peserta fit challenge)
   - id UUID PRIMARY KEY
   - member_id UUID REFERENCES members(id)
   - challenge_id UUID REFERENCES fit_challenges(id)
   - registration_number VARCHAR(30) UNIQUE
   - registration_date DATE
   - payment_status ENUM('pending', 'partial', 'paid') DEFAULT 'pending'
   - payment_amount DECIMAL(12,2)
   - initial_weight DECIMAL(5,2)
   - initial_body_fat DECIMAL(5,2)
   - initial_muscle_mass DECIMAL(5,2)
   - target_weight DECIMAL(5,2)
   - current_weight DECIMAL(5,2)
   - current_body_fat DECIMAL(5,2)
   - current_muscle_mass DECIMAL(5,2)
   - before_photo_url TEXT
   - after_photo_url TEXT
   - attendance_count INTEGER DEFAULT 0
   - total_sessions INTEGER DEFAULT 24 -- 3x seminggu x 8 minggu
   - completion_percentage DECIMAL(5,2) DEFAULT 0
   - status ENUM('active', 'completed', 'dropped') DEFAULT 'active'
   - created_at, updated_at
   - UNIQUE(member_id, challenge_id)

7. fit_progress_weekly (progress mingguan)
   - id UUID PRIMARY KEY
   - participant_id UUID REFERENCES fit_participants(id)
   - week_number INTEGER CHECK (week_number BETWEEN 1 AND 8)
   - measurement_date DATE
   - weight DECIMAL(5,2)
   - body_fat_percentage DECIMAL(5,2)
   - muscle_mass DECIMAL(5,2)
   - waist_circumference DECIMAL(5,2)
   - chest_circumference DECIMAL(5,2)
   - arm_circumference DECIMAL(5,2)
   - thigh_circumference DECIMAL(5,2)
   - photo_url TEXT
   - trainer_notes TEXT
   - participant_feedback TEXT
   - created_at

=== PART 4: PRODUCT & E-COMMERCE TABLES ===

8. product_categories
   - id UUID PRIMARY KEY
   - category_name VARCHAR(50) -- Protein/Sayuran/Organik/Lokal
   - description TEXT
   - icon_url TEXT
   - sort_order INTEGER
   - is_active BOOLEAN DEFAULT true

9. products (katalog produk)
   - id UUID PRIMARY KEY
   - tenant_id UUID REFERENCES tenants(id)
   - sku VARCHAR(50) UNIQUE
   - product_name VARCHAR(100)
   - category_id UUID REFERENCES product_categories(id)
   - description TEXT
   - unit VARCHAR(20) -- kg/liter/pcs/pack
   - cost_price DECIMAL(12,2) -- harga modal
   - member_price DECIMAL(12,2) -- harga khusus member
   - public_price DECIMAL(12,2) -- harga non-member
   - stock_quantity DECIMAL(10,2) DEFAULT 0
   - minimum_stock DECIMAL(10,2) DEFAULT 10
   - supplier_name VARCHAR(100)
   - supplier_phone VARCHAR(20)
   - image_url TEXT
   - nutritional_info JSONB -- info gizi untuk produk makanan
   - is_featured BOOLEAN DEFAULT false
   - is_active BOOLEAN DEFAULT true
   - created_at, updated_at

10. orders (pesanan member)
    - id UUID PRIMARY KEY
    - order_number VARCHAR(30) UNIQUE -- ORD-2024-000001
    - member_id UUID REFERENCES members(id)
    - order_date TIMESTAMP DEFAULT NOW()
    - subtotal DECIMAL(12,2)
    - discount_amount DECIMAL(12,2) DEFAULT 0
    - delivery_fee DECIMAL(12,2) DEFAULT 0
    - total_amount DECIMAL(12,2)
    - payment_method VARCHAR(50) -- cash/transfer/savings_balance
    - payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending'
    - payment_date TIMESTAMP
    - delivery_method ENUM('pickup', 'delivery') DEFAULT 'pickup'
    - delivery_address TEXT
    - delivery_date DATE
    - delivery_time VARCHAR(50)
    - order_status ENUM('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending'
    - notes TEXT
    - cancelled_reason TEXT
    - processed_by UUID REFERENCES admin_users(id)
    - created_at, updated_at

11. order_items (detail item pesanan)
    - id UUID PRIMARY KEY
    - order_id UUID REFERENCES orders(id) ON DELETE CASCADE
    - product_id UUID REFERENCES products(id)
    - product_name VARCHAR(100) -- snapshot nama produk
    - quantity DECIMAL(10,2)
    - unit_price DECIMAL(12,2) -- snapshot harga
    - discount_percentage DECIMAL(5,2) DEFAULT 0
    - subtotal DECIMAL(12,2)
    - notes TEXT

=== PART 5: WASTE BANK TABLES (BANK SAMPAH) ===

12. waste_categories (kategori sampah)
    - id UUID PRIMARY KEY
    - category_code VARCHAR(20) UNIQUE -- WST-001
    - category_name VARCHAR(50) -- Organik/Plastik/Kertas/Logam/Kaca/Elektronik
    - sub_category VARCHAR(50) -- PET/HDPE untuk plastik
    - buying_price_per_kg DECIMAL(10,2) -- harga beli dari anggota
    - selling_price_per_kg DECIMAL(10,2) -- harga jual ke pengepul
    - minimum_weight_kg DECIMAL(5,2) DEFAULT 0.5
    - description TEXT
    - handling_instructions TEXT
    - icon_url TEXT
    - is_active BOOLEAN DEFAULT true
    - created_at, updated_at

13. collection_points (lokasi bank sampah per RT/RW)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - point_code VARCHAR(20) UNIQUE -- BS-PON-001
    - point_name VARCHAR(100) -- Bank Sampah RT 01 RW 05
    - address TEXT
    - rt VARCHAR(5), rw VARCHAR(5)
    - latitude DECIMAL(10,8)
    - longitude DECIMAL(11,8)
    - contact_person VARCHAR(100)
    - contact_phone VARCHAR(20)
    - storage_capacity_kg DECIMAL(10,2) DEFAULT 1000
    - current_load_kg DECIMAL(10,2) DEFAULT 0
    - operational_days VARCHAR(100) -- Senin,Rabu,Sabtu
    - operational_hours VARCHAR(50) -- 08:00-16:00
    - has_maggot_facility BOOLEAN DEFAULT false
    - last_collection_date DATE
    - is_active BOOLEAN DEFAULT true
    - created_at, updated_at

14. waste_transactions (transaksi bank sampah)
    - id UUID PRIMARY KEY
    - transaction_number VARCHAR(30) UNIQUE -- WB-2024-000001
    - member_id UUID REFERENCES members(id)
    - collection_point_id UUID REFERENCES collection_points(id)
    - transaction_date DATE DEFAULT CURRENT_DATE
    - transaction_type ENUM('drop_off', 'pickup') DEFAULT 'drop_off'
    - total_weight_kg DECIMAL(10,2)
    - total_value DECIMAL(12,2)
    - admin_fee DECIMAL(12,2) DEFAULT 0 -- biaya admin jika ada
    - net_value DECIMAL(12,2) -- nilai bersih setelah admin fee
    - payment_method ENUM('cash', 'savings_transfer') DEFAULT 'savings_transfer'
    - payment_status ENUM('pending', 'transferred', 'paid') DEFAULT 'pending'
    - savings_transaction_id UUID REFERENCES savings_transactions(id)
    - collector_name VARCHAR(100) -- petugas yang menimbang
    - notes TEXT
    - created_at, updated_at

15. waste_transaction_details (detail per jenis sampah)
    - id UUID PRIMARY KEY
    - transaction_id UUID REFERENCES waste_transactions(id) ON DELETE CASCADE
    - waste_category_id UUID REFERENCES waste_categories(id)
    - weight_kg DECIMAL(10,2)
    - price_per_kg DECIMAL(10,2) -- snapshot harga saat transaksi
    - subtotal DECIMAL(12,2)
    - condition_quality ENUM('clean', 'normal', 'dirty') DEFAULT 'normal'
    - notes TEXT

16. waste_balances (saldo bank sampah per member)
    - id UUID PRIMARY KEY
    - member_id UUID REFERENCES members(id) UNIQUE
    - total_weight_collected_kg DECIMAL(12,2) DEFAULT 0
    - total_earnings DECIMAL(12,2) DEFAULT 0
    - current_balance DECIMAL(12,2) DEFAULT 0 -- saldo yang belum ditransfer
    - total_transferred DECIMAL(12,2) DEFAULT 0 -- total sudah ditransfer ke simpanan
    - last_transaction_date DATE
    - updated_at TIMESTAMP DEFAULT NOW()

=== PART 6: ROUTE MANAGEMENT TABLES ===

17. vehicles (kendaraan pengangkut)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - vehicle_code VARCHAR(20) UNIQUE -- VH-001
    - vehicle_type ENUM('motor', 'pickup', 'truck') 
    - vehicle_name VARCHAR(100) -- L300 Pickup
    - plate_number VARCHAR(20)
    - capacity_kg DECIMAL(10,2) -- 1500 untuk pickup, 4000 untuk truck
    - fuel_type VARCHAR(20) -- solar/bensin
    - fuel_consumption_km_per_liter DECIMAL(5,2)
    - driver_name VARCHAR(100)
    - driver_phone VARCHAR(20)
    - status ENUM('available', 'in_route', 'maintenance') DEFAULT 'available'
    - last_maintenance_date DATE
    - next_maintenance_km INTEGER
    - is_active BOOLEAN DEFAULT true
    - created_at, updated_at

18. collection_routes (rute pengambilan sampah)
    - id UUID PRIMARY KEY
    - route_code VARCHAR(30) UNIQUE -- RT-2024-01-15-001
    - route_name VARCHAR(100)
    - route_date DATE
    - vehicle_id UUID REFERENCES vehicles(id)
    - driver_name VARCHAR(100)
    - start_time TIME
    - end_time TIME
    - total_distance_km DECIMAL(10,2)
    - total_weight_collected_kg DECIMAL(10,2)
    - fuel_cost DECIMAL(12,2)
    - status ENUM('planned', 'in_progress', 'completed', 'cancelled') DEFAULT 'planned'
    - notes TEXT
    - created_by UUID REFERENCES admin_users(id)
    - created_at, updated_at

19. route_stops (perhentian di setiap rute)
    - id UUID PRIMARY KEY
    - route_id UUID REFERENCES collection_routes(id) ON DELETE CASCADE
    - collection_point_id UUID REFERENCES collection_points(id)
    - stop_sequence INTEGER -- urutan 1,2,3
    - estimated_weight_kg DECIMAL(10,2)
    - actual_weight_kg DECIMAL(10,2)
    - arrival_time TIME
    - departure_time TIME
    - status ENUM('pending', 'completed', 'skipped') DEFAULT 'pending'
    - skip_reason TEXT
    - notes TEXT
    - UNIQUE(route_id, stop_sequence)

20. collection_requests (request pengambilan urgent)
    - id UUID PRIMARY KEY
    - collection_point_id UUID REFERENCES collection_points(id)
    - requested_by VARCHAR(100)
    - request_date DATE
    - estimated_weight_kg DECIMAL(10,2)
    - priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal'
    - preferred_date DATE
    - status ENUM('pending', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending'
    - assigned_route_id UUID REFERENCES collection_routes(id)
    - notes TEXT
    - created_at

=== PART 7: MAGGOT PRODUCTION ===

21. maggot_cycles (siklus produksi maggot)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - cycle_code VARCHAR(30) UNIQUE -- MGT-2024-01
    - start_date DATE
    - harvest_date DATE -- biasanya 14-18 hari
    - input_organic_waste_kg DECIMAL(10,2)
    - expected_maggot_yield_kg DECIMAL(10,2) -- estimasi 20% dari input
    - actual_maggot_yield_kg DECIMAL(10,2)
    - expected_kasgot_yield_kg DECIMAL(10,2) -- estimasi 30% dari input
    - actual_kasgot_yield_kg DECIMAL(10,2)
    - production_cost DECIMAL(12,2)
    - maggot_selling_price_per_kg DECIMAL(10,2)
    - kasgot_selling_price_per_kg DECIMAL(10,2)
    - total_revenue DECIMAL(12,2)
    - status ENUM('preparation', 'seeding', 'growing', 'harvested', 'sold') DEFAULT 'preparation'
    - notes TEXT
    - created_at, updated_at

=== PART 8: FINANCIAL & REPORTING ===

22. shu_calculations (perhitungan SHU tahunan)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - year INTEGER
    - total_revenue DECIMAL(15,2)
    - total_expenses DECIMAL(15,2)
    - gross_profit DECIMAL(15,2)
    - shu_amount DECIMAL(15,2) -- Sisa Hasil Usaha
    - member_distribution_percentage DECIMAL(5,2) DEFAULT 70 -- 70% untuk anggota
    - reserve_percentage DECIMAL(5,2) DEFAULT 20 -- 20% cadangan
    - management_percentage DECIMAL(5,2) DEFAULT 10 -- 10% pengurus
    - calculation_date DATE
    - approval_date DATE
    - approved_by UUID REFERENCES admin_users(id)
    - status ENUM('draft', 'approved', 'distributed') DEFAULT 'draft'
    - created_at

23. shu_distributions (pembagian SHU ke anggota)
    - id UUID PRIMARY KEY
    - shu_calculation_id UUID REFERENCES shu_calculations(id)
    - member_id UUID REFERENCES members(id)
    - savings_points DECIMAL(10,2) -- poin dari simpanan
    - transaction_points DECIMAL(10,2) -- poin dari transaksi
    - total_points DECIMAL(10,2)
    - shu_amount DECIMAL(12,2) -- jumlah SHU yang diterima
    - distribution_date DATE
    - payment_method ENUM('cash', 'savings_transfer') DEFAULT 'savings_transfer'
    - payment_status ENUM('pending', 'paid') DEFAULT 'pending'
    - savings_transaction_id UUID REFERENCES savings_transactions(id)
    - created_at

=== PART 9: ADMIN & SYSTEM TABLES ===

24. admin_users (pengelola sistem)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - username VARCHAR(50) UNIQUE
    - email VARCHAR(100) UNIQUE
    - password_hash TEXT
    - full_name VARCHAR(100)
    - phone VARCHAR(20)
    - role ENUM('super_admin', 'admin', 'manager', 'staff', 'collector') DEFAULT 'staff'
    - permissions JSONB -- {"manage_members": true, "manage_waste": true}
    - last_login TIMESTAMP
    - login_count INTEGER DEFAULT 0
    - is_active BOOLEAN DEFAULT true
    - created_at, updated_at

25. audit_logs (log aktivitas sistem)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - user_id UUID -- bisa member atau admin
    - user_type VARCHAR(20) -- member/admin
    - action VARCHAR(100) -- login/create/update/delete
    - table_name VARCHAR(50)
    - record_id UUID
    - old_values JSONB
    - new_values JSONB
    - ip_address INET
    - user_agent TEXT
    - created_at TIMESTAMP DEFAULT NOW()

26. notifications (notifikasi ke member)
    - id UUID PRIMARY KEY
    - member_id UUID REFERENCES members(id)
    - title VARCHAR(200)
    - message TEXT
    - type ENUM('info', 'success', 'warning', 'error') DEFAULT 'info'
    - category VARCHAR(50) -- payment/waste/fitness/promo
    - action_url TEXT -- link untuk action
    - is_read BOOLEAN DEFAULT false
    - read_at TIMESTAMP
    - sent_via VARCHAR(50) -- in_app/email/whatsapp/sms
    - created_at TIMESTAMP DEFAULT NOW()

27. settings (pengaturan sistem per tenant)
    - id UUID PRIMARY KEY
    - tenant_id UUID REFERENCES tenants(id)
    - setting_key VARCHAR(100)
    - setting_value JSONB
    - description TEXT
    - updated_by UUID REFERENCES admin_users(id)
    - updated_at TIMESTAMP DEFAULT NOW()
    - UNIQUE(tenant_id, setting_key)

=== INDEXES untuk Performance ===
CREATE INDEX idx_members_tenant ON members(tenant_id);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_savings_member ON savings_transactions(member_id);
CREATE INDEX idx_waste_member ON waste_transactions(member_id);
CREATE INDEX idx_waste_date ON waste_transactions(transaction_date);
CREATE INDEX idx_orders_member ON orders(member_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_routes_date ON collection_routes(route_date);
CREATE INDEX idx_notifications_member ON notifications(member_id, is_read);

=== ROW LEVEL SECURITY (RLS) ===
-- Enable RLS on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_transactions ENABLE ROW LEVEL SECURITY;
-- ... (enable untuk semua tabel)

-- Policy: Members can only see their own data
CREATE POLICY members_self_select ON members
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY members_self_update ON members
    FOR UPDATE USING (auth.uid() = id);

-- Policy: Admin can see all data in their tenant
CREATE POLICY admin_tenant_all ON members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.id = auth.uid()
            AND admin_users.tenant_id = members.tenant_id
        )
    );

=== FUNCTIONS & TRIGGERS ===

-- Auto update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- ... (create for all tables)

-- Generate member number
CREATE OR REPLACE FUNCTION generate_member_number(tenant_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    SELECT COUNT(*) + 1 INTO sequence_number
    FROM members
    WHERE member_number LIKE tenant_code || '-' || current_year || '%';
    
    new_number := tenant_code || '-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 5, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate waste balance after transaction
CREATE OR REPLACE FUNCTION update_waste_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_method = 'savings_transfer' AND NEW.payment_status = 'transferred' THEN
        -- Update waste balance
        INSERT INTO waste_balances (member_id, total_weight_collected_kg, total_earnings, current_balance)
        VALUES (NEW.member_id, NEW.total_weight_kg, NEW.net_value, 0)
        ON CONFLICT (member_id) DO UPDATE SET
            total_weight_collected_kg = waste_balances.total_weight_collected_kg + NEW.total_weight_kg,
            total_earnings = waste_balances.total_earnings + NEW.net_value,
            total_transferred = waste_balances.total_transferred + NEW.net_value,
            last_transaction_date = NEW.transaction_date;
            
        -- Create savings transaction
        INSERT INTO savings_transactions (
            member_id, 
            transaction_type, 
            savings_type, 
            amount, 
            description,
            payment_method
        ) VALUES (
            NEW.member_id,
            'deposit',
            'sukarela',
            NEW.net_value,
            'Transfer dari Bank Sampah - ' || NEW.transaction_number,
            'waste_balance'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waste_balance
    AFTER UPDATE ON waste_transactions
    FOR EACH ROW
    WHEN (NEW.payment_status = 'transferred' AND OLD.payment_status != 'transferred')
    EXECUTE FUNCTION update_waste_balance();

-- Update collection point load after route completion
CREATE OR REPLACE FUNCTION update_collection_point_load()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE collection_points
        SET current_load_kg = current_load_kg - NEW.actual_weight_kg,
            last_collection_date = CURRENT_DATE
        WHERE id = NEW.collection_point_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

=== VIEWS untuk Reporting ===

-- Member Dashboard View
CREATE VIEW member_dashboard AS
SELECT 
    m.id,
    m.full_name,
    m.member_number,
    sa.total_balance as savings_balance,
    wb.current_balance as waste_balance,
    wb.total_weight_collected_kg,
    COUNT(DISTINCT o.id) as total_orders,
    COUNT(DISTINCT fp.id) as fitness_participations
FROM members m
LEFT JOIN savings_accounts sa ON sa.member_id = m.id
LEFT JOIN waste_balances wb ON wb.member_id = m.id
LEFT JOIN orders o ON o.member_id = m.id
LEFT JOIN fit_participants fp ON fp.member_id = m.id
GROUP BY m.id, m.full_name, m.member_number, sa.total_balance, wb.current_balance, wb.total_weight_collected_kg;

-- Collection Points Status View
CREATE VIEW collection_points_status AS
SELECT 
    cp.*,
    cp.current_load_kg / cp.storage_capacity_kg * 100 as capacity_percentage,
    CASE 
        WHEN cp.current_load_kg / cp.storage_capacity_kg > 0.8 THEN 'urgent'
        WHEN cp.current_load_kg / cp.storage_capacity_kg > 0.6 THEN 'high'
        WHEN cp.current_load_kg / cp.storage_capacity_kg > 0.4 THEN 'medium'
        ELSE 'low'
    END as priority_level,
    DATE_PART('day', CURRENT_DATE - cp.last_collection_date) as days_since_collection
FROM collection_points cp
WHERE cp.is_active = true;

-- Monthly Waste Report View
CREATE VIEW monthly_waste_report AS
SELECT 
    DATE_TRUNC('month', wt.transaction_date) as month,
    t.tenant_name,
    COUNT(DISTINCT wt.member_id) as active_collectors,
    COUNT(wt.id) as total_transactions,
    SUM(wt.total_weight_kg) as total_weight_kg,
    SUM(wt.net_value) as total_value,
    AVG(wt.total_weight_kg) as avg_weight_per_transaction
FROM waste_transactions wt
JOIN members m ON m.id = wt.member_id
JOIN tenants t ON t.id = m.tenant_id
GROUP BY DATE_TRUNC('month', wt.transaction_date), t.tenant_name
ORDER BY month DESC;

NOTES:
1. Semua tabel sudah multi-tenant dengan tenant_id
2. Waste balance otomatis transfer ke savings (simpanan sukarela)
3. Route management simple dengan manual planning
4. Include audit trail untuk semua transaksi penting
5. RLS untuk security per tenant dan per member
6. Functions untuk automasi perhitungan
7. Views untuk mempermudah reporting

Jalankan SQL ini di Supabase SQL Editor secara bertahap (per section).