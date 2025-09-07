-- Migration: 005_products.sql
-- Deskripsi: Tabel untuk katalog produk dan sistem e-commerce
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel product_categories (kategori produk)
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(50) NOT NULL, -- Protein/Sayuran/Organik/Lokal
    description TEXT,
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel products (katalog produk)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
    description TEXT,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs', -- kg/liter/pcs/pack
    cost_price DECIMAL(12,2) NOT NULL CHECK (cost_price >= 0), -- harga modal
    member_price DECIMAL(12,2) NOT NULL CHECK (member_price >= 0), -- harga khusus member
    public_price DECIMAL(12,2) NOT NULL CHECK (public_price >= 0), -- harga non-member
    stock_quantity DECIMAL(10,2) DEFAULT 0 CHECK (stock_quantity >= 0),
    minimum_stock DECIMAL(10,2) DEFAULT 10 CHECK (minimum_stock >= 0),
    supplier_name VARCHAR(100),
    supplier_phone VARCHAR(20),
    image_url TEXT,
    nutritional_info JSONB DEFAULT '{}', -- info gizi untuk produk makanan
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: harga member tidak boleh lebih tinggi dari harga publik
    CONSTRAINT check_member_price CHECK (member_price <= public_price),
    -- Constraint: harga jual tidak boleh di bawah harga modal
    CONSTRAINT check_cost_price CHECK (cost_price <= member_price)
);

-- Membuat tabel orders (pesanan member)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(30) UNIQUE NOT NULL, -- ORD-2024-000001
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    discount_amount DECIMAL(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
    delivery_fee DECIMAL(12,2) DEFAULT 0 CHECK (delivery_fee >= 0),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50) DEFAULT 'cash', -- cash/transfer/savings_balance
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
    payment_date TIMESTAMP WITH TIME ZONE,
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('pickup', 'delivery')) DEFAULT 'pickup',
    delivery_address TEXT,
    delivery_date DATE,
    delivery_time VARCHAR(50),
    order_status VARCHAR(20) CHECK (order_status IN ('pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    cancelled_reason TEXT,
    processed_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: total_amount harus sama dengan subtotal - discount + delivery_fee
    CONSTRAINT check_total_amount CHECK (total_amount = subtotal - discount_amount + delivery_fee)
);

-- Membuat tabel order_items (detail item pesanan)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_name VARCHAR(100) NOT NULL, -- snapshot nama produk saat order
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0), -- snapshot harga saat order
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: subtotal harus sesuai dengan quantity * unit_price - discount
    CONSTRAINT check_item_subtotal CHECK (
        subtotal = ROUND(quantity * unit_price * (1 - discount_percentage / 100), 2)
    )
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort ON product_categories(sort_order);

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock_quantity);

CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_product_categories()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_product_categories_updated_at 
    BEFORE UPDATE ON product_categories
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_product_categories();

CREATE OR REPLACE FUNCTION update_updated_at_products()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_products_updated_at 
    BEFORE UPDATE ON products
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_products();

CREATE OR REPLACE FUNCTION update_updated_at_orders()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_orders_updated_at 
    BEFORE UPDATE ON orders
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_orders();

-- Function untuk generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Menghitung nomor urut berikutnya untuk tahun ini
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM orders
    WHERE order_number LIKE 'ORD-' || current_year || '%';
    
    -- Format: ORD-2024-000001
    new_number := 'ORD-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 6, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function untuk update stock setelah order
CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update stock saat order dikonfirmasi
    IF TG_OP = 'UPDATE' AND OLD.order_status != 'confirmed' AND NEW.order_status = 'confirmed' THEN
        -- Kurangi stock untuk setiap item di order
        UPDATE products 
        SET stock_quantity = stock_quantity - oi.quantity
        FROM order_items oi
        WHERE products.id = oi.product_id 
        AND oi.order_id = NEW.id;
        
    -- Kembalikan stock saat order dibatalkan
    ELSIF TG_OP = 'UPDATE' AND OLD.order_status = 'confirmed' AND NEW.order_status = 'cancelled' THEN
        -- Kembalikan stock untuk setiap item di order
        UPDATE products 
        SET stock_quantity = stock_quantity + oi.quantity
        FROM order_items oi
        WHERE products.id = oi.product_id 
        AND oi.order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_product_stock
    AFTER UPDATE ON orders
    FOR EACH ROW
    WHEN (OLD.order_status IS DISTINCT FROM NEW.order_status)
    EXECUTE FUNCTION update_product_stock();

-- Enable Row Level Security
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy untuk product_categories: Semua bisa baca kategori aktif
CREATE POLICY IF NOT EXISTS product_categories_read ON product_categories
    FOR SELECT USING (is_active = true);

-- Policy untuk product_categories: Admin bisa manage
CREATE POLICY IF NOT EXISTS product_categories_admin_manage ON product_categories
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.is_active = true
            AND (au.role IN ('super_admin', 'admin', 'manager'))
        )
    );

-- Policy untuk products: Semua bisa baca produk aktif
CREATE POLICY IF NOT EXISTS products_read ON products
    FOR SELECT USING (is_active = true);

-- Policy untuk products: Admin tenant bisa manage produk mereka
CREATE POLICY IF NOT EXISTS products_tenant_manage ON products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = products.tenant_id
            AND au.is_active = true
        )
    );

-- Policy untuk orders: Member bisa lihat order mereka
CREATE POLICY IF NOT EXISTS orders_member_access ON orders
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk orders: Member bisa buat order baru
CREATE POLICY IF NOT EXISTS orders_member_create ON orders
    FOR INSERT WITH CHECK (
        member_id = auth.uid()
    );

-- Policy untuk orders: Admin bisa manage semua order di tenant mereka
CREATE POLICY IF NOT EXISTS orders_admin_manage ON orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN members m ON m.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND m.id = orders.member_id
            AND au.is_active = true
        )
    );

-- Policy untuk order_items: Mengikuti akses order
CREATE POLICY IF NOT EXISTS order_items_access ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND (
                -- Member bisa akses item order mereka
                o.member_id = auth.uid()
                OR
                -- Admin bisa akses item order di tenant mereka
                EXISTS (
                    SELECT 1 FROM admin_users au
                    JOIN members m ON m.tenant_id = au.tenant_id
                    WHERE au.id = auth.uid()
                    AND m.id = o.member_id
                    AND au.is_active = true
                )
            )
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE product_categories IS 'Tabel kategori produk untuk klasifikasi barang';
COMMENT ON COLUMN product_categories.sort_order IS 'Urutan tampilan kategori (ascending)';

COMMENT ON TABLE products IS 'Tabel katalog produk dengan sistem multi-tenant';
COMMENT ON COLUMN products.sku IS 'Stock Keeping Unit - kode unik produk';
COMMENT ON COLUMN products.cost_price IS 'Harga modal/beli produk';
COMMENT ON COLUMN products.member_price IS 'Harga khusus untuk member koperasi';
COMMENT ON COLUMN products.public_price IS 'Harga untuk non-member';
COMMENT ON COLUMN products.nutritional_info IS 'Informasi gizi dalam format JSON';

COMMENT ON TABLE orders IS 'Tabel pesanan member dengan status tracking';
COMMENT ON COLUMN orders.order_number IS 'Nomor unik pesanan format ORD-YYYY-NNNNNN';
COMMENT ON COLUMN orders.payment_method IS 'Metode pembayaran: cash, transfer, savings_balance';
COMMENT ON COLUMN orders.delivery_method IS 'Cara pengambilan: pickup atau delivery';

COMMENT ON TABLE order_items IS 'Tabel detail item pesanan dengan snapshot data produk';
COMMENT ON COLUMN order_items.product_name IS 'Snapshot nama produk saat order dibuat';
COMMENT ON COLUMN order_items.unit_price IS 'Snapshot harga produk saat order dibuat';