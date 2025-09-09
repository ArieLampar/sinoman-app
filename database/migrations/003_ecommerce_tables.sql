-- E-Commerce Module Database Schema
-- Migration 003: Enhanced E-Commerce Tables
-- Created: 2025-09-09 for Sinoman SuperApp

-- Enhanced Enums for E-Commerce
CREATE TYPE product_type AS ENUM ('protein', 'vegetable', 'grain', 'dairy', 'meat', 'seafood', 'beverage', 'snack', 'processed', 'organic', 'local_specialty');
CREATE TYPE product_status AS ENUM ('active', 'inactive', 'out_of_stock', 'discontinued', 'coming_soon');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'prepared', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded');
CREATE TYPE delivery_status AS ENUM ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned');
CREATE TYPE cart_status AS ENUM ('active', 'abandoned', 'converted', 'expired');

-- Enhanced Product Categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    category_code VARCHAR(20) NOT NULL UNIQUE,
    category_name VARCHAR(100) NOT NULL,
    parent_category_id UUID REFERENCES product_categories(id),
    description TEXT,
    icon_url VARCHAR(255),
    banner_image_url VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    seo_title VARCHAR(150),
    seo_description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    category_id UUID NOT NULL REFERENCES product_categories(id),
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Product Identity
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50),
    product_name VARCHAR(200) NOT NULL,
    product_slug VARCHAR(200) NOT NULL UNIQUE,
    product_type product_type NOT NULL,
    brand_name VARCHAR(100),
    
    -- Product Details
    description TEXT,
    short_description VARCHAR(500),
    specifications JSONB,
    nutritional_info JSONB,
    ingredients TEXT,
    allergen_info TEXT,
    storage_instructions TEXT,
    usage_instructions TEXT,
    
    -- Pricing
    cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    member_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    public_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    bulk_price DECIMAL(12,2),
    bulk_min_quantity INTEGER,
    
    -- Inventory
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    weight_grams INTEGER,
    dimensions JSONB, -- {length, width, height}
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    max_stock_level INTEGER DEFAULT 1000,
    
    -- Images and Media
    primary_image_url VARCHAR(255),
    gallery_images JSONB, -- Array of image URLs
    video_url VARCHAR(255),
    
    -- Product Attributes
    expiry_date DATE,
    manufacturing_date DATE,
    shelf_life_days INTEGER,
    is_organic BOOLEAN DEFAULT FALSE,
    is_local_product BOOLEAN DEFAULT FALSE,
    is_halal_certified BOOLEAN DEFAULT FALSE,
    certification_info JSONB,
    
    -- Status and Visibility
    status product_status DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    is_new_arrival BOOLEAN DEFAULT FALSE,
    is_best_seller BOOLEAN DEFAULT FALSE,
    is_on_sale BOOLEAN DEFAULT FALSE,
    sale_start_date TIMESTAMP,
    sale_end_date TIMESTAMP,
    
    -- SEO and Marketing
    seo_title VARCHAR(150),
    seo_description TEXT,
    meta_keywords TEXT,
    tags TEXT[], -- Array of tags
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Suppliers Table
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    supplier_code VARCHAR(20) NOT NULL UNIQUE,
    supplier_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Business Info
    business_license VARCHAR(100),
    tax_number VARCHAR(50),
    bank_account VARCHAR(100),
    payment_terms VARCHAR(100),
    
    -- Product Categories
    product_categories TEXT[], -- Array of categories they supply
    specialty_products TEXT,
    
    -- Performance Metrics
    rating DECIMAL(3,2) DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Shopping Cart
CREATE TABLE shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    session_id VARCHAR(100), -- For guest users
    
    status cart_status DEFAULT 'active',
    total_items INTEGER DEFAULT 0,
    total_weight_grams INTEGER DEFAULT 0,
    subtotal DECIMAL(12,2) DEFAULT 0,
    
    -- Applied Discounts
    discount_code VARCHAR(50),
    discount_amount DECIMAL(12,2) DEFAULT 0,
    member_discount_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Delivery Info
    delivery_date DATE,
    delivery_time_slot VARCHAR(50),
    delivery_address_id UUID REFERENCES member_addresses(id),
    delivery_notes TEXT,
    
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Shopping Cart Items
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    
    -- Product snapshot at time of adding
    product_name VARCHAR(200) NOT NULL,
    product_image_url VARCHAR(255),
    product_sku VARCHAR(50),
    
    -- Special requests
    special_instructions TEXT,
    gift_wrap BOOLEAN DEFAULT FALSE,
    gift_message TEXT,
    
    added_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(cart_id, product_id)
);

-- Member Delivery Addresses
CREATE TABLE member_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    
    address_label VARCHAR(50) NOT NULL, -- 'home', 'office', 'other'
    recipient_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    
    address_line_1 VARCHAR(200) NOT NULL,
    address_line_2 VARCHAR(200),
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Location coordinates
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    -- Delivery instructions
    delivery_instructions TEXT,
    access_code VARCHAR(20),
    
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced Orders Table (already exists, but we'll enhance it)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'regular'; -- 'regular', 'bulk', 'subscription', 'gift'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address_id UUID REFERENCES member_addresses(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date DATE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_time_slot VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 2.5;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- Order Delivery Tracking
CREATE TABLE order_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id),
    
    -- Driver/Delivery Person
    driver_id UUID REFERENCES delivery_drivers(id),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    vehicle_info VARCHAR(100),
    
    -- Delivery Status
    status delivery_status DEFAULT 'pending',
    estimated_delivery TIMESTAMP,
    actual_pickup_time TIMESTAMP,
    actual_delivery_time TIMESTAMP,
    
    -- Tracking Info
    tracking_number VARCHAR(50) UNIQUE,
    current_location JSONB, -- {lat, lng, address}
    route_updates JSONB[], -- Array of location updates
    
    -- Delivery Proof
    delivery_photo_url VARCHAR(255),
    signature_url VARCHAR(255),
    recipient_name VARCHAR(100),
    delivery_notes TEXT,
    
    -- Performance Metrics
    distance_km DECIMAL(8,2),
    delivery_time_minutes INTEGER,
    customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
    customer_feedback TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Delivery Drivers
CREATE TABLE delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    driver_code VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    
    -- Vehicle Info
    vehicle_type VARCHAR(50), -- 'motorcycle', 'car', 'bicycle', 'truck'
    vehicle_plate VARCHAR(20),
    vehicle_capacity_kg INTEGER,
    
    -- License and Documents
    license_number VARCHAR(50),
    license_expiry DATE,
    insurance_info VARCHAR(100),
    
    -- Performance Metrics
    total_deliveries INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_available BOOLEAN DEFAULT TRUE,
    current_location JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Product Reviews
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    member_id UUID NOT NULL REFERENCES members(id),
    order_id UUID REFERENCES orders(id),
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(200),
    review_text TEXT,
    
    -- Review Categories
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    
    -- Media
    review_images JSONB, -- Array of image URLs
    
    -- Verification
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    moderation_notes TEXT,
    
    -- Helpfulness
    helpful_count INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(product_id, member_id, order_id)
);

-- Discount Coupons
CREATE TABLE discount_coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    
    coupon_code VARCHAR(50) NOT NULL UNIQUE,
    coupon_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Discount Details
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed_amount', 'free_shipping'
    discount_value DECIMAL(12,2) NOT NULL,
    minimum_order_amount DECIMAL(12,2) DEFAULT 0,
    maximum_discount_amount DECIMAL(12,2),
    
    -- Usage Limits
    usage_limit INTEGER,
    usage_limit_per_customer INTEGER DEFAULT 1,
    current_usage INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    
    -- Conditions
    applicable_categories UUID[], -- Array of category IDs
    applicable_products UUID[], -- Array of product IDs
    member_types VARCHAR(50)[], -- Array of member types
    
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inventory Movements
CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id),
    
    movement_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment', 'transfer', 'damaged', 'expired'
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12,2),
    
    -- Reference
    reference_type VARCHAR(20), -- 'purchase', 'sale', 'adjustment', 'return'
    reference_id UUID, -- ID of related order/purchase/adjustment
    
    -- Details
    reason TEXT,
    batch_number VARCHAR(50),
    expiry_date DATE,
    supplier_id UUID REFERENCES suppliers(id),
    
    -- Stock levels after movement
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(is_featured);
CREATE INDEX idx_products_price_range ON products(member_price, public_price);
CREATE INDEX idx_products_stock ON products(stock_quantity);
CREATE INDEX idx_products_tenant ON products(tenant_id);

CREATE INDEX idx_cart_member ON shopping_carts(member_id);
CREATE INDEX idx_cart_status ON shopping_carts(status);
CREATE INDEX idx_cart_expires ON shopping_carts(expires_at);

CREATE INDEX idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX idx_cart_items_product ON cart_items(product_id);

CREATE INDEX idx_orders_member ON orders(member_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_date ON orders(order_date);

CREATE INDEX idx_deliveries_order ON order_deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON order_deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON order_deliveries(status);

CREATE INDEX idx_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_reviews_member ON product_reviews(member_id);
CREATE INDEX idx_reviews_approved ON product_reviews(is_approved);

CREATE INDEX idx_inventory_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_date ON inventory_movements(created_at);

-- Row Level Security (RLS) Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY products_tenant_policy ON products
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY categories_tenant_policy ON product_categories
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

-- Member-specific policies
CREATE POLICY carts_member_policy ON shopping_carts
    FOR ALL USING (member_id = auth.uid());

CREATE POLICY addresses_member_policy ON member_addresses
    FOR ALL USING (member_id = auth.uid());

CREATE POLICY reviews_member_policy ON product_reviews
    FOR ALL USING (member_id = auth.uid());

-- Public read access for approved content
CREATE POLICY products_public_read ON products
    FOR SELECT USING (status = 'active');

CREATE POLICY reviews_public_read ON product_reviews
    FOR SELECT USING (is_approved = true);

-- Functions for inventory management
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product stock when inventory movement is recorded
    UPDATE products 
    SET stock_quantity = NEW.stock_after,
        updated_at = NOW()
    WHERE id = NEW.product_id;
    
    -- Check for low stock alerts
    IF NEW.stock_after <= (SELECT min_stock_level FROM products WHERE id = NEW.product_id) THEN
        INSERT INTO notifications (
            recipient_id, recipient_type, title, message, type, category, data
        ) VALUES (
            (SELECT created_by FROM products WHERE id = NEW.product_id),
            'admin',
            'Low Stock Alert',
            'Product ' || (SELECT product_name FROM products WHERE id = NEW.product_id) || ' is running low on stock',
            'warning',
            'inventory',
            jsonb_build_object('product_id', NEW.product_id, 'current_stock', NEW.stock_after)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_stock
    AFTER INSERT ON inventory_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

-- Function to calculate order commission
CREATE OR REPLACE FUNCTION calculate_order_commission()
RETURNS TRIGGER AS $$
BEGIN
    NEW.commission_amount = (NEW.subtotal * NEW.commission_rate / 100);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_commission
    BEFORE INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_order_commission();

-- Comments for documentation
COMMENT ON TABLE products IS 'Enhanced product catalog with comprehensive product information';
COMMENT ON TABLE product_categories IS 'Hierarchical product categories with SEO support';
COMMENT ON TABLE shopping_carts IS 'Shopping cart with delivery scheduling and discounts';
COMMENT ON TABLE cart_items IS 'Cart items with product snapshots and special requests';
COMMENT ON TABLE member_addresses IS 'Member delivery addresses with location coordinates';
COMMENT ON TABLE order_deliveries IS 'Comprehensive delivery tracking system';
COMMENT ON TABLE delivery_drivers IS 'Delivery driver management with performance metrics';
COMMENT ON TABLE product_reviews IS 'Product reviews with verification and moderation';
COMMENT ON TABLE discount_coupons IS 'Flexible discount coupon system';
COMMENT ON TABLE inventory_movements IS 'Complete inventory tracking with audit trail';