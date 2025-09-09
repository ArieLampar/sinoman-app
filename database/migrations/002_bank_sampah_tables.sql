-- Bank Sampah Module Database Schema
-- Comprehensive waste management system with maggot farming integration

-- Waste Types Table
CREATE TABLE waste_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- plastic, paper, metal, glass, organic, electronic
    subcategory VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) NOT NULL, -- kg, pcs, ton
    price_per_unit DECIMAL(10,2) NOT NULL,
    is_organic BOOLEAN DEFAULT FALSE,
    suitable_for_maggot BOOLEAN DEFAULT FALSE,
    processing_method VARCHAR(100), -- recycling, composting, maggot_farming, disposal
    environmental_impact_score INTEGER DEFAULT 0, -- 1-10 scale
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES members(id),
    
    UNIQUE(tenant_id, name, category)
);

-- Waste Collection Points
CREATE TABLE waste_collection_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    manager_id UUID REFERENCES members(id),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance
    capacity_kg DECIMAL(10,2),
    current_load_kg DECIMAL(10,2) DEFAULT 0,
    operating_hours JSONB, -- {"monday": "08:00-17:00", ...}
    contact_phone VARCHAR(20),
    facilities TEXT[], -- ['scale', 'sorting_area', 'storage', 'maggot_bins']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

-- Waste Collections (Individual deposit transactions)
CREATE TABLE waste_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    collection_number VARCHAR(100) NOT NULL,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    collection_point_id UUID NOT NULL REFERENCES waste_collection_points(id),
    collector_id UUID REFERENCES members(id), -- Staff who processed the collection
    collection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'pending', -- pending, weighed, processed, paid, cancelled
    total_weight_kg DECIMAL(10,3) NOT NULL,
    total_value DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, cancelled
    payment_method VARCHAR(50), -- cash, savings_account, bank_transfer
    payment_date TIMESTAMP WITH TIME ZONE,
    payment_reference VARCHAR(255),
    notes TEXT,
    images TEXT[], -- Photos of waste before/after sorting
    weather_condition VARCHAR(50),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, collection_number)
);

-- Waste Collection Items (Details of each waste type in a collection)
CREATE TABLE waste_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES waste_collections(id) ON DELETE CASCADE,
    waste_type_id UUID NOT NULL REFERENCES waste_types(id),
    quantity DECIMAL(10,3) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    quality_grade VARCHAR(50) DEFAULT 'standard', -- premium, standard, low
    quality_notes TEXT,
    contamination_level VARCHAR(50) DEFAULT 'clean', -- clean, minor, moderate, high
    allocated_to_maggot DECIMAL(10,3) DEFAULT 0, -- Amount sent to maggot farming
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, sorted, processed, sold
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maggot Farming Batches
CREATE TABLE maggot_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    collection_point_id UUID NOT NULL REFERENCES waste_collection_points(id),
    manager_id UUID REFERENCES members(id),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expected_harvest_date TIMESTAMP WITH TIME ZONE,
    actual_harvest_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active', -- active, harvested, failed, cancelled
    total_organic_waste_kg DECIMAL(10,3) NOT NULL DEFAULT 0,
    estimated_maggot_yield_kg DECIMAL(10,3),
    actual_maggot_yield_kg DECIMAL(10,3),
    conversion_rate DECIMAL(5,4), -- kg maggot per kg waste
    temperature_celsius DECIMAL(4,2),
    humidity_percent DECIMAL(5,2),
    ph_level DECIMAL(4,2),
    feeding_schedule JSONB, -- Daily feeding records
    harvest_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, batch_number)
);

-- Maggot Batch Inputs (Waste allocated to each batch)
CREATE TABLE maggot_batch_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES maggot_batches(id) ON DELETE CASCADE,
    collection_item_id UUID NOT NULL REFERENCES waste_collection_items(id),
    quantity_kg DECIMAL(10,3) NOT NULL,
    added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    waste_condition VARCHAR(50), -- fresh, aged, processed
    preparation_notes TEXT
);

-- Maggot Harvest Records
CREATE TABLE maggot_harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES maggot_batches(id),
    harvest_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    harvester_id UUID REFERENCES members(id),
    fresh_maggot_kg DECIMAL(10,3) NOT NULL,
    dried_maggot_kg DECIMAL(10,3),
    compost_kg DECIMAL(10,3), -- Remaining organic matter as compost
    quality_grade VARCHAR(50) DEFAULT 'standard', -- premium, standard, low
    moisture_content DECIMAL(5,2),
    protein_content DECIMAL(5,2),
    selling_price_per_kg DECIMAL(10,2),
    buyer_info JSONB, -- Customer/buyer details
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waste Bank Accounts (Member savings from waste deposits)
CREATE TABLE waste_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    account_number VARCHAR(50) NOT NULL,
    current_balance DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(12,2) DEFAULT 0,
    total_withdrawn DECIMAL(12,2) DEFAULT 0,
    total_waste_kg DECIMAL(10,3) DEFAULT 0,
    account_status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
    opened_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, member_id),
    UNIQUE(tenant_id, account_number)
);

-- Waste Bank Transactions (All account movements)
CREATE TABLE waste_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES waste_bank_accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- deposit, withdrawal, bonus, penalty, adjustment
    reference_type VARCHAR(50), -- collection, harvest_bonus, withdrawal_request, manual
    reference_id UUID, -- ID of related collection or other record
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    processed_by UUID REFERENCES members(id),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Environmental Impact Tracking
CREATE TABLE environmental_impacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL, -- collection, batch, harvest
    reference_id UUID NOT NULL,
    impact_type VARCHAR(50) NOT NULL, -- co2_saved, water_saved, energy_saved, landfill_diverted
    quantity DECIMAL(12,3) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- kg_co2, liters, kwh, kg
    calculation_method TEXT,
    recorded_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waste Bank Settings
CREATE TABLE waste_bank_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES members(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, setting_key)
);

-- Create Indexes for Performance
CREATE INDEX idx_waste_collections_member_id ON waste_collections(member_id);
CREATE INDEX idx_waste_collections_date ON waste_collections(collection_date);
CREATE INDEX idx_waste_collections_status ON waste_collections(status);
CREATE INDEX idx_waste_collection_items_waste_type ON waste_collection_items(waste_type_id);
CREATE INDEX idx_maggot_batches_status ON maggot_batches(status);
CREATE INDEX idx_maggot_batches_dates ON maggot_batches(start_date, expected_harvest_date);
CREATE INDEX idx_waste_bank_accounts_member ON waste_bank_accounts(member_id);
CREATE INDEX idx_waste_bank_transactions_account ON waste_bank_transactions(account_id);
CREATE INDEX idx_waste_bank_transactions_date ON waste_bank_transactions(processed_at);
CREATE INDEX idx_environmental_impacts_reference ON environmental_impacts(reference_type, reference_id);

-- Create Functions for Automatic Updates
CREATE OR REPLACE FUNCTION update_waste_collection_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total weight and value when collection items change
    UPDATE waste_collections 
    SET 
        total_weight_kg = (
            SELECT COALESCE(SUM(quantity), 0) 
            FROM waste_collection_items 
            WHERE collection_id = NEW.collection_id
        ),
        total_value = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM waste_collection_items 
            WHERE collection_id = NEW.collection_id
        ),
        updated_at = NOW()
    WHERE id = NEW.collection_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_collection_total
    AFTER INSERT OR UPDATE OR DELETE ON waste_collection_items
    FOR EACH ROW
    EXECUTE FUNCTION update_waste_collection_total();

-- Function to update waste bank account balance
CREATE OR REPLACE FUNCTION update_waste_bank_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update account balance and statistics
    UPDATE waste_bank_accounts 
    SET 
        current_balance = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM waste_bank_transactions 
            WHERE account_id = NEW.account_id
        ),
        total_earned = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM waste_bank_transactions 
            WHERE account_id = NEW.account_id AND amount > 0
        ),
        total_withdrawn = (
            SELECT COALESCE(ABS(SUM(amount)), 0) 
            FROM waste_bank_transactions 
            WHERE account_id = NEW.account_id AND amount < 0
        ),
        last_transaction_date = NEW.processed_at,
        updated_at = NOW()
    WHERE id = NEW.account_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bank_balance
    AFTER INSERT ON waste_bank_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_waste_bank_balance();

-- Function to update maggot batch totals
CREATE OR REPLACE FUNCTION update_maggot_batch_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update total organic waste when inputs are added
    UPDATE maggot_batches 
    SET 
        total_organic_waste_kg = (
            SELECT COALESCE(SUM(quantity_kg), 0) 
            FROM maggot_batch_inputs 
            WHERE batch_id = NEW.batch_id
        ),
        updated_at = NOW()
    WHERE id = NEW.batch_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_totals
    AFTER INSERT OR UPDATE OR DELETE ON maggot_batch_inputs
    FOR EACH ROW
    EXECUTE FUNCTION update_maggot_batch_totals();

-- Insert Default Waste Types
INSERT INTO waste_types (tenant_id, name, category, subcategory, description, unit, price_per_unit, is_organic, suitable_for_maggot, processing_method, environmental_impact_score) VALUES
-- Get tenant_id for demo-tenant
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Botol Plastik PET', 'plastic', 'PET', 'Botol minuman plastik bersih', 'kg', 3000.00, FALSE, FALSE, 'recycling', 8),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Kardus Bekas', 'paper', 'cardboard', 'Kardus dalam kondisi kering dan bersih', 'kg', 1500.00, FALSE, FALSE, 'recycling', 9),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Kaleng Aluminium', 'metal', 'aluminum', 'Kaleng minuman aluminium', 'kg', 8000.00, FALSE, FALSE, 'recycling', 9),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Botol Kaca', 'glass', 'clear_glass', 'Botol kaca bening', 'kg', 500.00, FALSE, FALSE, 'recycling', 7),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Sisa Makanan', 'organic', 'food_waste', 'Sisa makanan organik untuk pakan maggot', 'kg', 500.00, TRUE, TRUE, 'maggot_farming', 10),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Daun Kering', 'organic', 'yard_waste', 'Daun dan ranting kering', 'kg', 300.00, TRUE, TRUE, 'composting', 8),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Elektronik Kecil', 'electronic', 'small_electronics', 'HP, charger, kabel bekas', 'pcs', 5000.00, FALSE, FALSE, 'recycling', 6);

-- Insert Default Collection Point
INSERT INTO waste_collection_points (tenant_id, name, code, address, manager_id, capacity_kg, operating_hours, contact_phone, facilities) VALUES
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'Bank Sampah Utama', 'BSU-001', 'Jl. Gotong Royong No. 123, Jakarta Selatan', 
 (SELECT id FROM members WHERE email = 'admin@demo-tenant.com' LIMIT 1), 
 5000.00, 
 '{"monday": "08:00-16:00", "tuesday": "08:00-16:00", "wednesday": "08:00-16:00", "thursday": "08:00-16:00", "friday": "08:00-16:00", "saturday": "08:00-12:00"}',
 '021-12345678',
 ARRAY['scale', 'sorting_area', 'storage', 'maggot_bins', 'washing_facility']);

-- Insert Default Settings
INSERT INTO waste_bank_settings (tenant_id, setting_key, setting_value, description) VALUES
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'minimum_deposit_amount', '1000.00', 'Minimum deposit amount in rupiah'),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'maximum_daily_deposit', '50000.00', 'Maximum daily deposit per member'),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'maggot_conversion_rate', '0.15', 'Expected kg of maggot per kg of organic waste'),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'environmental_co2_factor', '2.3', 'CO2 saved per kg of recycled waste'),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'bonus_percentage_organic', '10', 'Extra percentage bonus for organic waste'),
((SELECT id FROM tenants WHERE slug = 'demo-tenant'), 'withdrawal_minimum', '10000.00', 'Minimum withdrawal amount');

COMMENT ON TABLE waste_types IS 'Types of waste accepted with pricing and processing information';
COMMENT ON TABLE waste_collection_points IS 'Physical locations where members can deposit waste';
COMMENT ON TABLE waste_collections IS 'Individual waste deposit transactions by members';
COMMENT ON TABLE waste_collection_items IS 'Detailed breakdown of waste types in each collection';
COMMENT ON TABLE maggot_batches IS 'Maggot farming batches using organic waste';
COMMENT ON TABLE maggot_batch_inputs IS 'Organic waste allocated to maggot farming batches';
COMMENT ON TABLE maggot_harvests IS 'Records of maggot harvest from completed batches';
COMMENT ON TABLE waste_bank_accounts IS 'Member savings accounts for waste bank earnings';
COMMENT ON TABLE waste_bank_transactions IS 'All financial transactions in waste bank accounts';
COMMENT ON TABLE environmental_impacts IS 'Environmental impact tracking and calculations';
COMMENT ON TABLE waste_bank_settings IS 'Configuration settings for waste bank operations';