-- MANUAL BANK SAMPAH MIGRATION
-- Copy and paste this entire script into Supabase Dashboard > SQL Editor > New Query
-- Then click "RUN" to execute

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Waste Types Table
CREATE TABLE IF NOT EXISTS waste_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    description TEXT,
    unit VARCHAR(50) NOT NULL,
    price_per_unit DECIMAL(10,2) NOT NULL,
    is_organic BOOLEAN DEFAULT FALSE,
    suitable_for_maggot BOOLEAN DEFAULT FALSE,
    processing_method VARCHAR(100),
    environmental_impact_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    
    UNIQUE(tenant_id, name, category)
);

-- 2. Waste Collection Points
CREATE TABLE IF NOT EXISTS waste_collection_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    manager_id UUID,
    status VARCHAR(50) DEFAULT 'active',
    capacity_kg DECIMAL(10,2),
    current_load_kg DECIMAL(10,2) DEFAULT 0,
    operating_hours JSONB,
    contact_phone VARCHAR(20),
    facilities TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, code)
);

-- 3. Waste Collections
CREATE TABLE IF NOT EXISTS waste_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    collection_number VARCHAR(50) NOT NULL,
    collector_id UUID,
    collection_point_id UUID,
    collection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_weight_kg DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'waste_bank',
    payment_status VARCHAR(50) DEFAULT 'pending',
    quality_grade VARCHAR(20) DEFAULT 'standard',
    contamination_level DECIMAL(5,2) DEFAULT 0.00,
    notes TEXT,
    environmental_impact JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by UUID,
    
    UNIQUE(tenant_id, collection_number)
);

-- 4. Waste Collection Items
CREATE TABLE IF NOT EXISTS waste_collection_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    waste_type_id UUID NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    quality_multiplier DECIMAL(4,2) DEFAULT 1.00,
    contamination_deduction DECIMAL(4,2) DEFAULT 0.00,
    final_price DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Waste Bank Accounts
CREATE TABLE IF NOT EXISTS waste_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    member_id UUID NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    current_balance DECIMAL(12,2) DEFAULT 0.00,
    total_earned DECIMAL(12,2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12,2) DEFAULT 0.00,
    total_waste_kg DECIMAL(10,2) DEFAULT 0.00,
    total_collections INTEGER DEFAULT 0,
    last_collection_date TIMESTAMP WITH TIME ZONE,
    environmental_impact JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, member_id),
    UNIQUE(tenant_id, account_number)
);

-- 6. Waste Bank Transactions
CREATE TABLE IF NOT EXISTS waste_bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2) NOT NULL,
    balance_after DECIMAL(12,2) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50),
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Maggot Batches
CREATE TABLE IF NOT EXISTS maggot_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    batch_number VARCHAR(50) NOT NULL,
    collection_point_id UUID,
    start_date DATE NOT NULL,
    expected_harvest_date DATE,
    actual_harvest_date DATE,
    initial_waste_kg DECIMAL(10,2) NOT NULL,
    current_weight_kg DECIMAL(10,2),
    conversion_rate DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'active',
    temperature_avg DECIMAL(4,1),
    humidity_avg DECIMAL(4,1),
    ph_level DECIMAL(3,1),
    feeding_schedule JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    managed_by UUID,
    
    UNIQUE(tenant_id, batch_number)
);

-- 8. Maggot Batch Inputs
CREATE TABLE IF NOT EXISTS maggot_batch_inputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    collection_id UUID,
    waste_type_id UUID NOT NULL,
    input_date DATE NOT NULL,
    quantity_kg DECIMAL(10,2) NOT NULL,
    organic_content_percentage DECIMAL(4,1) DEFAULT 100.0,
    decomposition_rate DECIMAL(4,1),
    notes TEXT,
    added_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Maggot Harvests
CREATE TABLE IF NOT EXISTS maggot_harvests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL,
    harvest_date DATE NOT NULL,
    maggot_weight_kg DECIMAL(10,2) NOT NULL,
    biomass_weight_kg DECIMAL(10,2) DEFAULT 0,
    selling_price_per_kg DECIMAL(10,2) NOT NULL,
    total_revenue DECIMAL(12,2) NOT NULL,
    buyer_info JSONB,
    quality_grade VARCHAR(20) DEFAULT 'standard',
    moisture_content DECIMAL(4,1),
    protein_content DECIMAL(4,1),
    revenue_sharing JSONB,
    notes TEXT,
    harvested_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample Data Insert
-- Demo Tenant ID: 4aa453df-34c3-48e6-93c8-e6aafcd71cc7

INSERT INTO waste_types (tenant_id, name, category, subcategory, description, unit, price_per_unit, is_organic, suitable_for_maggot, processing_method, environmental_impact_score) VALUES
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Plastik Botol', 'plastic', 'PET', 'Botol plastik minuman bekas', 'kg', 3000.00, false, false, 'recycling', 7),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Kardus', 'paper', 'corrugated', 'Kardus dan karton bekas', 'kg', 3000.00, false, false, 'recycling', 8),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Kaleng Aluminium', 'metal', 'aluminum', 'Kaleng minuman aluminium', 'kg', 7000.00, false, false, 'recycling', 9),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Sampah Dapur', 'organic', 'food_waste', 'Sisa makanan dan sampah dapur', 'kg', 1500.00, true, true, 'maggot_farming', 6),
('4aa453df-34c3-48e6-93c8-e6aafcd71cc7', 'Sisa Sayuran', 'organic', 'vegetable', 'Sisa sayuran dan buah-buahan', 'kg', 1200.00, true, true, 'maggot_farming', 6)
ON CONFLICT (tenant_id, name, category) DO NOTHING;

-- Success message
SELECT 'Bank Sampah migration completed successfully! All 9 tables created and sample data inserted.' as result;