-- Migration: 007_routes.sql
-- Deskripsi: Tabel untuk manajemen rute pengangkutan sampah dan kendaraan
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel vehicles (kendaraan pengangkut)
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    vehicle_code VARCHAR(20) UNIQUE NOT NULL, -- VH-001
    vehicle_type VARCHAR(20) CHECK (vehicle_type IN ('motor', 'pickup', 'truck')) NOT NULL,
    vehicle_name VARCHAR(100) NOT NULL, -- L300 Pickup, Honda Beat, dll
    plate_number VARCHAR(20) NOT NULL,
    capacity_kg DECIMAL(10,2) NOT NULL CHECK (capacity_kg > 0), -- 1500 untuk pickup, 4000 untuk truck
    fuel_type VARCHAR(20) DEFAULT 'bensin', -- solar/bensin
    fuel_consumption_km_per_liter DECIMAL(5,2) CHECK (fuel_consumption_km_per_liter > 0),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    status VARCHAR(20) CHECK (status IN ('available', 'in_route', 'maintenance')) DEFAULT 'available',
    last_maintenance_date DATE,
    next_maintenance_km INTEGER CHECK (next_maintenance_km > 0),
    current_odometer_km INTEGER DEFAULT 0 CHECK (current_odometer_km >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel collection_routes (rute pengambilan sampah)
CREATE TABLE IF NOT EXISTS collection_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_code VARCHAR(30) UNIQUE NOT NULL, -- RT-2024-01-15-001
    route_name VARCHAR(100) NOT NULL,
    route_date DATE NOT NULL,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    driver_name VARCHAR(100) NOT NULL,
    start_time TIME,
    end_time TIME,
    total_distance_km DECIMAL(10,2) DEFAULT 0 CHECK (total_distance_km >= 0),
    total_weight_collected_kg DECIMAL(10,2) DEFAULT 0 CHECK (total_weight_collected_kg >= 0),
    fuel_cost DECIMAL(12,2) DEFAULT 0 CHECK (fuel_cost >= 0),
    status VARCHAR(20) CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')) DEFAULT 'planned',
    notes TEXT,
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: end_time harus setelah start_time jika keduanya ada
    CONSTRAINT check_route_times CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);

-- Membuat tabel route_stops (perhentian di setiap rute)
CREATE TABLE IF NOT EXISTS route_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES collection_routes(id) ON DELETE CASCADE,
    collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE RESTRICT,
    stop_sequence INTEGER NOT NULL CHECK (stop_sequence > 0), -- urutan 1,2,3
    estimated_weight_kg DECIMAL(10,2) CHECK (estimated_weight_kg >= 0),
    actual_weight_kg DECIMAL(10,2) DEFAULT 0 CHECK (actual_weight_kg >= 0),
    arrival_time TIME,
    departure_time TIME,
    status VARCHAR(20) CHECK (status IN ('pending', 'completed', 'skipped')) DEFAULT 'pending',
    skip_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu rute tidak boleh punya dua stop dengan sequence yang sama
    UNIQUE(route_id, stop_sequence),
    -- Satu collection point tidak boleh dikunjungi dua kali dalam rute yang sama
    UNIQUE(route_id, collection_point_id),
    -- Constraint: departure_time harus setelah arrival_time jika keduanya ada
    CONSTRAINT check_stop_times CHECK (arrival_time IS NULL OR departure_time IS NULL OR departure_time > arrival_time)
);

-- Membuat tabel collection_requests (request pengambilan urgent)
CREATE TABLE IF NOT EXISTS collection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_point_id UUID NOT NULL REFERENCES collection_points(id) ON DELETE RESTRICT,
    requested_by VARCHAR(100) NOT NULL, -- nama petugas yang request
    request_date DATE DEFAULT CURRENT_DATE,
    estimated_weight_kg DECIMAL(10,2) CHECK (estimated_weight_kg > 0),
    priority VARCHAR(20) CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    preferred_date DATE,
    status VARCHAR(20) CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')) DEFAULT 'pending',
    assigned_route_id UUID REFERENCES collection_routes(id), -- rute yang ditugaskan
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: preferred_date tidak boleh sebelum request_date
    CONSTRAINT check_request_preferred_date CHECK (preferred_date IS NULL OR preferred_date >= request_date)
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_code ON vehicles(vehicle_code);

CREATE INDEX IF NOT EXISTS idx_collection_routes_date ON collection_routes(route_date);
CREATE INDEX IF NOT EXISTS idx_collection_routes_vehicle ON collection_routes(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_collection_routes_status ON collection_routes(status);
CREATE INDEX IF NOT EXISTS idx_collection_routes_code ON collection_routes(route_code);
CREATE INDEX IF NOT EXISTS idx_collection_routes_created_by ON collection_routes(created_by);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_collection_point ON route_stops(collection_point_id);
CREATE INDEX IF NOT EXISTS idx_route_stops_sequence ON route_stops(route_id, stop_sequence);
CREATE INDEX IF NOT EXISTS idx_route_stops_status ON route_stops(status);

CREATE INDEX IF NOT EXISTS idx_collection_requests_collection_point ON collection_requests(collection_point_id);
CREATE INDEX IF NOT EXISTS idx_collection_requests_status ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_collection_requests_priority ON collection_requests(priority);
CREATE INDEX IF NOT EXISTS idx_collection_requests_date ON collection_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_collection_requests_assigned_route ON collection_requests(assigned_route_id);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_vehicles()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_vehicles_updated_at 
    BEFORE UPDATE ON vehicles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_vehicles();

CREATE OR REPLACE FUNCTION update_updated_at_collection_routes()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_collection_routes_updated_at 
    BEFORE UPDATE ON collection_routes
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_collection_routes();

-- Function untuk generate route code
CREATE OR REPLACE FUNCTION generate_route_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR;
    current_date_str VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_date_str := TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD');
    
    -- Menghitung nomor urut berikutnya untuk hari ini
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM collection_routes
    WHERE route_code LIKE 'RT-' || TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') || '%';
    
    -- Format: RT-2024-01-15-001
    new_code := 'RT-' || current_date_str || '-' || LPAD(sequence_number::VARCHAR, 3, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function untuk update vehicle status berdasarkan route
CREATE OR REPLACE FUNCTION update_vehicle_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vehicle status saat route dimulai
    IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' THEN
        UPDATE vehicles 
        SET status = 'in_route'
        WHERE id = NEW.vehicle_id;
        
    -- Update vehicle status saat route selesai atau dibatalkan
    ELSIF (NEW.status = 'completed' OR NEW.status = 'cancelled') AND OLD.status = 'in_progress' THEN
        UPDATE vehicles 
        SET status = 'available'
        WHERE id = NEW.vehicle_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_vehicle_status
    AFTER UPDATE ON collection_routes
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_vehicle_status();

-- Function untuk update total weight dan distance di route
CREATE OR REPLACE FUNCTION update_route_totals()
RETURNS TRIGGER AS $$
DECLARE
    route_total_weight DECIMAL(10,2);
BEGIN
    -- Hitung ulang total weight dari semua stops yang completed
    SELECT COALESCE(SUM(actual_weight_kg), 0) INTO route_total_weight
    FROM route_stops
    WHERE route_id = COALESCE(NEW.route_id, OLD.route_id)
    AND status = 'completed';
    
    -- Update total di collection_routes
    UPDATE collection_routes
    SET total_weight_collected_kg = route_total_weight
    WHERE id = COALESCE(NEW.route_id, OLD.route_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_route_totals
    AFTER INSERT OR UPDATE OR DELETE ON route_stops
    FOR EACH ROW
    EXECUTE FUNCTION update_route_totals();

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;

-- Policy untuk vehicles: Admin tenant bisa manage kendaraan mereka
CREATE POLICY IF NOT EXISTS vehicles_tenant_admin_access ON vehicles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = vehicles.tenant_id
            AND au.is_active = true
        )
    );

-- Policy untuk collection_routes: Admin bisa manage rute
CREATE POLICY IF NOT EXISTS collection_routes_admin_access ON collection_routes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN vehicles v ON v.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND v.id = collection_routes.vehicle_id
            AND au.is_active = true
        )
    );

-- Policy untuk route_stops: Mengikuti akses route
CREATE POLICY IF NOT EXISTS route_stops_access ON route_stops
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collection_routes cr
            JOIN vehicles v ON v.id = cr.vehicle_id
            JOIN admin_users au ON au.tenant_id = v.tenant_id
            WHERE cr.id = route_stops.route_id
            AND au.id = auth.uid()
            AND au.is_active = true
        )
    );

-- Policy untuk collection_requests: Semua bisa buat request, admin bisa manage
CREATE POLICY IF NOT EXISTS collection_requests_create ON collection_requests
    FOR INSERT WITH CHECK (true); -- Semua bisa buat request

CREATE POLICY IF NOT EXISTS collection_requests_read ON collection_requests
    FOR SELECT USING (
        -- Admin bisa lihat semua request di tenant mereka
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN collection_points cp ON cp.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND cp.id = collection_requests.collection_point_id
            AND au.is_active = true
        )
        OR
        -- Member bisa lihat request mereka sendiri berdasarkan collection point di area mereka
        EXISTS (
            SELECT 1 FROM members m
            JOIN collection_points cp ON cp.tenant_id = m.tenant_id
            WHERE m.id = auth.uid()
            AND cp.id = collection_requests.collection_point_id
        )
    );

CREATE POLICY IF NOT EXISTS collection_requests_admin_manage ON collection_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN collection_points cp ON cp.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND cp.id = collection_requests.collection_point_id
            AND au.is_active = true
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE vehicles IS 'Tabel kendaraan pengangkut sampah per tenant';
COMMENT ON COLUMN vehicles.vehicle_code IS 'Kode unik kendaraan format VH-NNN';
COMMENT ON COLUMN vehicles.capacity_kg IS 'Kapasitas angkut maksimal dalam kg';
COMMENT ON COLUMN vehicles.fuel_consumption_km_per_liter IS 'Konsumsi bahan bakar km/liter';
COMMENT ON COLUMN vehicles.next_maintenance_km IS 'Kilometerasi untuk maintenance berikutnya';

COMMENT ON TABLE collection_routes IS 'Tabel rute pengambilan sampah harian';
COMMENT ON COLUMN collection_routes.route_code IS 'Kode unik rute format RT-YYYY-MM-DD-NNN';
COMMENT ON COLUMN collection_routes.total_weight_collected_kg IS 'Total berat sampah terkumpul (dihitung otomatis)';

COMMENT ON TABLE route_stops IS 'Tabel perhentian dalam setiap rute pengambilan';
COMMENT ON COLUMN route_stops.stop_sequence IS 'Urutan perhentian dalam rute';
COMMENT ON COLUMN route_stops.estimated_weight_kg IS 'Estimasi berat sampah';
COMMENT ON COLUMN route_stops.actual_weight_kg IS 'Berat sampah aktual yang diambil';

COMMENT ON TABLE collection_requests IS 'Tabel permintaan pengambilan sampah urgent';
COMMENT ON COLUMN collection_requests.priority IS 'Prioritas: low, normal, high, urgent';
COMMENT ON COLUMN collection_requests.assigned_route_id IS 'ID rute yang ditugaskan untuk request ini';