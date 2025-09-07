-- Migration: 008_financial.sql
-- Deskripsi: Tabel untuk sistem keuangan dan perhitungan SHU (Sisa Hasil Usaha)
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel shu_calculations (perhitungan SHU tahunan)
CREATE TABLE IF NOT EXISTS shu_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL CHECK (year >= 2024 AND year <= 2100),
    total_revenue DECIMAL(15,2) NOT NULL CHECK (total_revenue >= 0), -- total pendapatan
    total_expenses DECIMAL(15,2) NOT NULL CHECK (total_expenses >= 0), -- total pengeluaran
    gross_profit DECIMAL(15,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
    shu_amount DECIMAL(15,2) NOT NULL CHECK (shu_amount >= 0), -- Sisa Hasil Usaha
    
    -- Persentase pembagian SHU (total harus 100%)
    member_distribution_percentage DECIMAL(5,2) DEFAULT 70 CHECK (member_distribution_percentage >= 0 AND member_distribution_percentage <= 100), -- 70% untuk anggota
    reserve_percentage DECIMAL(5,2) DEFAULT 20 CHECK (reserve_percentage >= 0 AND reserve_percentage <= 100), -- 20% cadangan
    management_percentage DECIMAL(5,2) DEFAULT 10 CHECK (management_percentage >= 0 AND management_percentage <= 100), -- 10% pengurus
    
    calculation_date DATE DEFAULT CURRENT_DATE,
    approval_date DATE,
    approved_by UUID REFERENCES admin_users(id),
    status VARCHAR(20) CHECK (status IN ('draft', 'approved', 'distributed')) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu tenant hanya bisa punya satu perhitungan SHU per tahun
    UNIQUE(tenant_id, year),
    -- Total persentase harus 100%
    CONSTRAINT check_shu_percentage_total CHECK (
        member_distribution_percentage + reserve_percentage + management_percentage = 100
    ),
    -- Approval date harus setelah calculation date
    CONSTRAINT check_shu_approval_date CHECK (
        approval_date IS NULL OR approval_date >= calculation_date
    )
);

-- Membuat tabel shu_distributions (pembagian SHU ke anggota)
CREATE TABLE IF NOT EXISTS shu_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shu_calculation_id UUID NOT NULL REFERENCES shu_calculations(id) ON DELETE RESTRICT,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    
    -- Poin untuk perhitungan SHU
    savings_points DECIMAL(10,2) DEFAULT 0 CHECK (savings_points >= 0), -- poin dari simpanan
    transaction_points DECIMAL(10,2) DEFAULT 0 CHECK (transaction_points >= 0), -- poin dari transaksi
    total_points DECIMAL(10,2) GENERATED ALWAYS AS (savings_points + transaction_points) STORED,
    
    shu_amount DECIMAL(12,2) NOT NULL CHECK (shu_amount >= 0), -- jumlah SHU yang diterima
    distribution_date DATE,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'savings_transfer')) DEFAULT 'savings_transfer',
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'paid')) DEFAULT 'pending',
    savings_transaction_id UUID REFERENCES savings_transactions(id), -- link ke transaksi simpanan
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu member hanya bisa punya satu distribusi per perhitungan SHU
    UNIQUE(shu_calculation_id, member_id),
    -- Distribution date harus setelah approval date SHU calculation
    CONSTRAINT check_distribution_date CHECK (
        distribution_date IS NULL OR 
        EXISTS (
            SELECT 1 FROM shu_calculations sc 
            WHERE sc.id = shu_calculation_id 
            AND sc.approval_date IS NOT NULL 
            AND distribution_date >= sc.approval_date
        )
    )
);

-- Membuat tabel financial_reports (laporan keuangan bulanan/tahunan)
CREATE TABLE IF NOT EXISTS financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    report_type VARCHAR(20) CHECK (report_type IN ('monthly', 'quarterly', 'annual')) NOT NULL,
    report_period VARCHAR(20) NOT NULL, -- '2024-01' untuk monthly, '2024-Q1' untuk quarterly, '2024' untuk annual
    
    -- Revenue streams
    savings_revenue DECIMAL(15,2) DEFAULT 0 CHECK (savings_revenue >= 0), -- dari bunga simpanan
    waste_revenue DECIMAL(15,2) DEFAULT 0 CHECK (waste_revenue >= 0), -- dari margin bank sampah
    product_revenue DECIMAL(15,2) DEFAULT 0 CHECK (product_revenue >= 0), -- dari penjualan produk
    fitness_revenue DECIMAL(15,2) DEFAULT 0 CHECK (fitness_revenue >= 0), -- dari fit challenge
    other_revenue DECIMAL(15,2) DEFAULT 0 CHECK (other_revenue >= 0), -- pendapatan lain
    total_revenue DECIMAL(15,2) GENERATED ALWAYS AS (
        savings_revenue + waste_revenue + product_revenue + fitness_revenue + other_revenue
    ) STORED,
    
    -- Expense categories
    operational_expenses DECIMAL(15,2) DEFAULT 0 CHECK (operational_expenses >= 0), -- biaya operasional
    fuel_expenses DECIMAL(15,2) DEFAULT 0 CHECK (fuel_expenses >= 0), -- biaya bahan bakar
    maintenance_expenses DECIMAL(15,2) DEFAULT 0 CHECK (maintenance_expenses >= 0), -- biaya maintenance
    salary_expenses DECIMAL(15,2) DEFAULT 0 CHECK (salary_expenses >= 0), -- gaji karyawan
    other_expenses DECIMAL(15,2) DEFAULT 0 CHECK (other_expenses >= 0), -- biaya lain
    total_expenses DECIMAL(15,2) GENERATED ALWAYS AS (
        operational_expenses + fuel_expenses + maintenance_expenses + salary_expenses + other_expenses
    ) STORED,
    
    net_profit DECIMAL(15,2) GENERATED ALWAYS AS (total_revenue - total_expenses) STORED,
    
    report_date DATE DEFAULT CURRENT_DATE,
    generated_by UUID REFERENCES admin_users(id),
    status VARCHAR(20) CHECK (status IN ('draft', 'final', 'published')) DEFAULT 'draft',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu tenant hanya bisa punya satu laporan per periode
    UNIQUE(tenant_id, report_type, report_period)
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_shu_calculations_tenant ON shu_calculations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shu_calculations_year ON shu_calculations(year);
CREATE INDEX IF NOT EXISTS idx_shu_calculations_status ON shu_calculations(status);

CREATE INDEX IF NOT EXISTS idx_shu_distributions_calculation ON shu_distributions(shu_calculation_id);
CREATE INDEX IF NOT EXISTS idx_shu_distributions_member ON shu_distributions(member_id);
CREATE INDEX IF NOT EXISTS idx_shu_distributions_payment_status ON shu_distributions(payment_status);

CREATE INDEX IF NOT EXISTS idx_financial_reports_tenant ON financial_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_reports_type ON financial_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_financial_reports_period ON financial_reports(report_period);
CREATE INDEX IF NOT EXISTS idx_financial_reports_date ON financial_reports(report_date);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_shu_calculations()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_shu_calculations_updated_at 
    BEFORE UPDATE ON shu_calculations
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_shu_calculations();

CREATE OR REPLACE FUNCTION update_updated_at_financial_reports()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_financial_reports_updated_at 
    BEFORE UPDATE ON financial_reports
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_financial_reports();

-- Function untuk menghitung poin SHU member berdasarkan aktivitas
CREATE OR REPLACE FUNCTION calculate_member_shu_points(
    p_member_id UUID,
    p_year INTEGER
)
RETURNS TABLE(
    member_id UUID,
    savings_points DECIMAL(10,2),
    transaction_points DECIMAL(10,2),
    total_points DECIMAL(10,2)
) AS $$
DECLARE
    calc_savings_points DECIMAL(10,2) := 0;
    calc_transaction_points DECIMAL(10,2) := 0;
BEGIN
    -- Hitung poin dari simpanan (berdasarkan rata-rata saldo)
    SELECT COALESCE(AVG(total_balance), 0) / 100000 INTO calc_savings_points -- 1 poin per 100rb saldo
    FROM savings_accounts sa
    JOIN members m ON m.id = sa.member_id
    WHERE sa.member_id = p_member_id
    AND EXTRACT(YEAR FROM sa.updated_at) = p_year;
    
    -- Hitung poin dari transaksi (waste + orders)
    SELECT COALESCE(
        (SELECT COUNT(*) FROM waste_transactions wt WHERE wt.member_id = p_member_id AND EXTRACT(YEAR FROM wt.transaction_date) = p_year) +
        (SELECT COUNT(*) FROM orders o WHERE o.member_id = p_member_id AND EXTRACT(YEAR FROM o.order_date) = p_year)
    , 0) * 0.1 INTO calc_transaction_points; -- 0.1 poin per transaksi
    
    RETURN QUERY SELECT 
        p_member_id,
        calc_savings_points,
        calc_transaction_points,
        calc_savings_points + calc_transaction_points;
END;
$$ LANGUAGE plpgsql;

-- Function untuk auto-generate SHU distributions setelah approval
CREATE OR REPLACE FUNCTION generate_shu_distributions()
RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    total_member_points DECIMAL(15,2) := 0;
    member_shu_pool DECIMAL(15,2);
    member_points RECORD;
BEGIN
    -- Hanya jalankan saat status berubah ke 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Hitung total SHU untuk member
        member_shu_pool := NEW.shu_amount * (NEW.member_distribution_percentage / 100);
        
        -- Hitung total poin semua member di tenant ini
        SELECT COALESCE(SUM(cp.total_points), 0) INTO total_member_points
        FROM members m
        CROSS JOIN LATERAL calculate_member_shu_points(m.id, NEW.year) cp
        WHERE m.tenant_id = NEW.tenant_id
        AND m.status = 'active';
        
        -- Generate distribution untuk setiap active member
        FOR member_record IN 
            SELECT m.id, m.full_name
            FROM members m
            WHERE m.tenant_id = NEW.tenant_id
            AND m.status = 'active'
        LOOP
            -- Hitung poin member ini
            SELECT * INTO member_points
            FROM calculate_member_shu_points(member_record.id, NEW.year);
            
            -- Insert ke shu_distributions
            INSERT INTO shu_distributions (
                shu_calculation_id,
                member_id,
                savings_points,
                transaction_points,
                shu_amount
            ) VALUES (
                NEW.id,
                member_record.id,
                member_points.savings_points,
                member_points.transaction_points,
                CASE 
                    WHEN total_member_points > 0 THEN 
                        ROUND((member_points.total_points / total_member_points) * member_shu_pool, 2)
                    ELSE 0
                END
            );
        END LOOP;
        
        -- Update status calculation menjadi 'distributed'
        UPDATE shu_calculations 
        SET status = 'distributed' 
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_generate_shu_distributions
    AFTER UPDATE ON shu_calculations
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved')
    EXECUTE FUNCTION generate_shu_distributions();

-- Enable Row Level Security
ALTER TABLE shu_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shu_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_reports ENABLE ROW LEVEL SECURITY;

-- Policy untuk shu_calculations: Admin tenant bisa manage
CREATE POLICY IF NOT EXISTS shu_calculations_admin_access ON shu_calculations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = shu_calculations.tenant_id
            AND au.is_active = true
            AND au.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Policy untuk shu_distributions: Member bisa lihat distribusi mereka
CREATE POLICY IF NOT EXISTS shu_distributions_member_access ON shu_distributions
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk shu_distributions: Admin bisa manage semua distribusi di tenant mereka
CREATE POLICY IF NOT EXISTS shu_distributions_admin_access ON shu_distributions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN shu_calculations sc ON sc.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND sc.id = shu_distributions.shu_calculation_id
            AND au.is_active = true
            AND au.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Policy untuk financial_reports: Admin tenant bisa manage
CREATE POLICY IF NOT EXISTS financial_reports_admin_access ON financial_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = financial_reports.tenant_id
            AND au.is_active = true
            AND au.role IN ('super_admin', 'admin', 'manager')
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE shu_calculations IS 'Tabel perhitungan SHU (Sisa Hasil Usaha) tahunan per tenant';
COMMENT ON COLUMN shu_calculations.gross_profit IS 'Laba kotor (dihitung otomatis: revenue - expenses)';
COMMENT ON COLUMN shu_calculations.member_distribution_percentage IS 'Persentase SHU untuk anggota (default 70%)';
COMMENT ON COLUMN shu_calculations.reserve_percentage IS 'Persentase SHU untuk cadangan (default 20%)';
COMMENT ON COLUMN shu_calculations.management_percentage IS 'Persentase SHU untuk pengurus (default 10%)';

COMMENT ON TABLE shu_distributions IS 'Tabel pembagian SHU kepada setiap anggota';
COMMENT ON COLUMN shu_distributions.savings_points IS 'Poin berdasarkan rata-rata saldo simpanan';
COMMENT ON COLUMN shu_distributions.transaction_points IS 'Poin berdasarkan aktivitas transaksi';
COMMENT ON COLUMN shu_distributions.payment_method IS 'cash = bayar tunai, savings_transfer = transfer ke simpanan';

COMMENT ON TABLE financial_reports IS 'Tabel laporan keuangan bulanan/triwulanan/tahunan';
COMMENT ON COLUMN financial_reports.report_period IS 'Periode laporan: YYYY-MM, YYYY-Qn, atau YYYY';
COMMENT ON COLUMN financial_reports.waste_revenue IS 'Pendapatan dari margin jual-beli sampah';
COMMENT ON COLUMN financial_reports.fitness_revenue IS 'Pendapatan dari program fit challenge';

COMMENT ON FUNCTION calculate_member_shu_points IS 'Function untuk menghitung poin SHU member berdasarkan simpanan dan transaksi';