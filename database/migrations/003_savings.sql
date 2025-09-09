-- Migration: 003_savings.sql
-- Deskripsi: Tabel untuk sistem simpanan koperasi (pokok, wajib, sukarela)
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel savings_accounts (akun simpanan per member)
CREATE TABLE IF NOT EXISTS savings_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL UNIQUE REFERENCES members(id) ON DELETE RESTRICT,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    pokok_balance DECIMAL(12,2) DEFAULT 0 CHECK (pokok_balance >= 0), -- simpanan pokok 80rb
    wajib_balance DECIMAL(12,2) DEFAULT 0 CHECK (wajib_balance >= 0), -- wajib 10rb/bulan
    sukarela_balance DECIMAL(12,2) DEFAULT 0 CHECK (sukarela_balance >= 0), -- sukarela
    total_balance DECIMAL(12,2) GENERATED ALWAYS AS (pokok_balance + wajib_balance + sukarela_balance) STORED,
    last_transaction_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat tabel savings_transactions (transaksi simpanan)
CREATE TABLE IF NOT EXISTS savings_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES savings_accounts(id) ON DELETE RESTRICT,
    transaction_code VARCHAR(30) UNIQUE NOT NULL, -- TRX-2024-000001
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'shu')) NOT NULL,
    savings_type VARCHAR(20) CHECK (savings_type IN ('pokok', 'wajib', 'sukarela')) NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    balance_before DECIMAL(12,2) NOT NULL CHECK (balance_before >= 0),
    balance_after DECIMAL(12,2) NOT NULL CHECK (balance_after >= 0),
    description TEXT,
    payment_method VARCHAR(50) DEFAULT 'cash', -- cash/transfer/waste_balance
    reference_number VARCHAR(50), -- untuk transfer bank
    verified_by UUID REFERENCES admin_users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_savings_accounts_member ON savings_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_accounts_account_number ON savings_accounts(account_number);

CREATE INDEX IF NOT EXISTS idx_savings_transactions_member ON savings_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_account ON savings_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_date ON savings_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_type ON savings_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_code ON savings_transactions(transaction_code);

-- Trigger untuk update timestamp otomatis pada savings_accounts
CREATE OR REPLACE FUNCTION update_updated_at_savings_accounts()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_savings_accounts_updated_at 
    BEFORE UPDATE ON savings_accounts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_savings_accounts();

-- Function untuk generate account number
CREATE OR REPLACE FUNCTION generate_account_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    sequence_number INTEGER;
BEGIN
    -- Menghitung nomor urut berikutnya
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM savings_accounts;
    
    -- Format: SA-000001
    new_number := 'SA-' || LPAD(sequence_number::VARCHAR, 6, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function untuk generate transaction code
CREATE OR REPLACE FUNCTION generate_transaction_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Menghitung nomor urut berikutnya untuk tahun ini
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM savings_transactions
    WHERE transaction_code LIKE 'TRX-' || current_year || '%';
    
    -- Format: TRX-2024-000001
    new_code := 'TRX-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 6, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function untuk update balance setelah transaksi
CREATE OR REPLACE FUNCTION update_savings_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update balance di savings_accounts berdasarkan tipe transaksi
    IF NEW.transaction_type = 'deposit' THEN
        -- Tambah saldo
        IF NEW.savings_type = 'pokok' THEN
            UPDATE savings_accounts 
            SET pokok_balance = pokok_balance + NEW.amount,
                last_transaction_date = NOW()
            WHERE id = NEW.account_id;
        ELSIF NEW.savings_type = 'wajib' THEN
            UPDATE savings_accounts 
            SET wajib_balance = wajib_balance + NEW.amount,
                last_transaction_date = NOW()
            WHERE id = NEW.account_id;
        ELSIF NEW.savings_type = 'sukarela' THEN
            UPDATE savings_accounts 
            SET sukarela_balance = sukarela_balance + NEW.amount,
                last_transaction_date = NOW()
            WHERE id = NEW.account_id;
        END IF;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
        -- Kurangi saldo (hanya untuk sukarela)
        IF NEW.savings_type = 'sukarela' THEN
            UPDATE savings_accounts 
            SET sukarela_balance = sukarela_balance - NEW.amount,
                last_transaction_date = NOW()
            WHERE id = NEW.account_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_savings_balance
    AFTER INSERT ON savings_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_savings_balance();

-- Enable Row Level Security
ALTER TABLE savings_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_transactions ENABLE ROW LEVEL SECURITY;

-- Policy untuk savings_accounts: Member hanya bisa lihat akun mereka
CREATE POLICY IF NOT EXISTS savings_accounts_member_access ON savings_accounts
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk savings_accounts: Admin tenant bisa akses semua
CREATE POLICY IF NOT EXISTS savings_accounts_admin_access ON savings_accounts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN members m ON m.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND m.id = savings_accounts.member_id
            AND au.is_active = true
        )
    );

-- Policy untuk savings_transactions: Member hanya bisa lihat transaksi mereka
CREATE POLICY IF NOT EXISTS savings_transactions_member_access ON savings_transactions
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk savings_transactions: Admin bisa akses semua transaksi di tenant mereka
CREATE POLICY IF NOT EXISTS savings_transactions_admin_access ON savings_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN members m ON m.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND m.id = savings_transactions.member_id
            AND au.is_active = true
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE savings_accounts IS 'Tabel akun simpanan member (pokok, wajib, sukarela)';
COMMENT ON COLUMN savings_accounts.pokok_balance IS 'Saldo simpanan pokok (Rp 80.000)';
COMMENT ON COLUMN savings_accounts.wajib_balance IS 'Saldo simpanan wajib (Rp 10.000/bulan)';
COMMENT ON COLUMN savings_accounts.sukarela_balance IS 'Saldo simpanan sukarela (bebas)';
COMMENT ON COLUMN savings_accounts.total_balance IS 'Total saldo (dihitung otomatis)';

COMMENT ON TABLE savings_transactions IS 'Tabel transaksi simpanan (setoran, penarikan)';
COMMENT ON COLUMN savings_transactions.transaction_type IS 'Jenis transaksi: deposit, withdrawal, transfer, shu';
COMMENT ON COLUMN savings_transactions.savings_type IS 'Jenis simpanan: pokok, wajib, sukarela';
COMMENT ON COLUMN savings_transactions.payment_method IS 'Metode pembayaran: cash, transfer, waste_balance';