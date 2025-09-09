-- Migration: 004_fit_challenge.sql
-- Deskripsi: Tabel untuk program fit challenge 8 minggu
-- Dibuat: 2024
-- Author: Sinoman Development Team

-- Membuat tabel fit_challenges (program 8 minggu)
CREATE TABLE IF NOT EXISTS fit_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    challenge_code VARCHAR(20) UNIQUE NOT NULL, -- FC-2024-01
    challenge_name VARCHAR(100) NOT NULL,
    batch_number INTEGER NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_fee DECIMAL(12,2) DEFAULT 600000 CHECK (registration_fee >= 0),
    max_participants INTEGER DEFAULT 50 CHECK (max_participants > 0),
    current_participants INTEGER DEFAULT 0 CHECK (current_participants >= 0),
    trainer_name VARCHAR(100),
    trainer_phone VARCHAR(20),
    location VARCHAR(200),
    schedule TEXT, -- jadwal latihan dalam format JSON atau teks
    status VARCHAR(20) CHECK (status IN ('upcoming', 'registration', 'active', 'completed')) DEFAULT 'upcoming',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint: end_date harus setelah start_date
    CONSTRAINT check_fit_challenge_dates CHECK (end_date > start_date),
    -- Constraint: current_participants tidak boleh melebihi max_participants
    CONSTRAINT check_fit_challenge_participants CHECK (current_participants <= max_participants)
);

-- Membuat tabel fit_participants (peserta fit challenge)
CREATE TABLE IF NOT EXISTS fit_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    challenge_id UUID NOT NULL REFERENCES fit_challenges(id) ON DELETE RESTRICT,
    registration_number VARCHAR(30) UNIQUE NOT NULL,
    registration_date DATE DEFAULT CURRENT_DATE,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'partial', 'paid')) DEFAULT 'pending',
    payment_amount DECIMAL(12,2) DEFAULT 0 CHECK (payment_amount >= 0),
    
    -- Data biometrik awal
    initial_weight DECIMAL(5,2) CHECK (initial_weight > 0),
    initial_body_fat DECIMAL(5,2) CHECK (initial_body_fat >= 0 AND initial_body_fat <= 100),
    initial_muscle_mass DECIMAL(5,2) CHECK (initial_muscle_mass > 0),
    target_weight DECIMAL(5,2) CHECK (target_weight > 0),
    
    -- Data biometrik terkini
    current_weight DECIMAL(5,2) CHECK (current_weight > 0),
    current_body_fat DECIMAL(5,2) CHECK (current_body_fat >= 0 AND current_body_fat <= 100),
    current_muscle_mass DECIMAL(5,2) CHECK (current_muscle_mass > 0),
    
    before_photo_url TEXT,
    after_photo_url TEXT,
    attendance_count INTEGER DEFAULT 0 CHECK (attendance_count >= 0),
    total_sessions INTEGER DEFAULT 24 CHECK (total_sessions > 0), -- 3x seminggu x 8 minggu
    completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    status VARCHAR(20) CHECK (status IN ('active', 'completed', 'dropped')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu member hanya bisa ikut satu challenge yang sama sekali
    UNIQUE(member_id, challenge_id)
);

-- Membuat tabel fit_progress_weekly (progress mingguan)
CREATE TABLE IF NOT EXISTS fit_progress_weekly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES fit_participants(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 8),
    measurement_date DATE DEFAULT CURRENT_DATE,
    weight DECIMAL(5,2) CHECK (weight > 0),
    body_fat_percentage DECIMAL(5,2) CHECK (body_fat_percentage >= 0 AND body_fat_percentage <= 100),
    muscle_mass DECIMAL(5,2) CHECK (muscle_mass > 0),
    waist_circumference DECIMAL(5,2) CHECK (waist_circumference > 0),
    chest_circumference DECIMAL(5,2) CHECK (chest_circumference > 0),
    arm_circumference DECIMAL(5,2) CHECK (arm_circumference > 0),
    thigh_circumference DECIMAL(5,2) CHECK (thigh_circumference > 0),
    photo_url TEXT,
    trainer_notes TEXT,
    participant_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Satu participant hanya bisa punya satu progress per minggu
    UNIQUE(participant_id, week_number)
);

-- Membuat index untuk performa pencarian
CREATE INDEX IF NOT EXISTS idx_fit_challenges_tenant ON fit_challenges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fit_challenges_status ON fit_challenges(status);
CREATE INDEX IF NOT EXISTS idx_fit_challenges_date ON fit_challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fit_challenges_code ON fit_challenges(challenge_code);

CREATE INDEX IF NOT EXISTS idx_fit_participants_member ON fit_participants(member_id);
CREATE INDEX IF NOT EXISTS idx_fit_participants_challenge ON fit_participants(challenge_id);
CREATE INDEX IF NOT EXISTS idx_fit_participants_status ON fit_participants(status);
CREATE INDEX IF NOT EXISTS idx_fit_participants_payment ON fit_participants(payment_status);

CREATE INDEX IF NOT EXISTS idx_fit_progress_participant ON fit_progress_weekly(participant_id);
CREATE INDEX IF NOT EXISTS idx_fit_progress_week ON fit_progress_weekly(week_number);

-- Trigger untuk update timestamp otomatis
CREATE OR REPLACE FUNCTION update_updated_at_fit_challenges()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_fit_challenges_updated_at 
    BEFORE UPDATE ON fit_challenges
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_fit_challenges();

CREATE OR REPLACE FUNCTION update_updated_at_fit_participants()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_fit_participants_updated_at 
    BEFORE UPDATE ON fit_participants
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_fit_participants();

-- Function untuk generate challenge code
CREATE OR REPLACE FUNCTION generate_challenge_code()
RETURNS VARCHAR AS $$
DECLARE
    new_code VARCHAR;
    current_year VARCHAR;
    sequence_number INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE)::VARCHAR;
    
    -- Menghitung nomor urut berikutnya untuk tahun ini
    SELECT COALESCE(COUNT(*), 0) + 1 INTO sequence_number
    FROM fit_challenges
    WHERE challenge_code LIKE 'FC-' || current_year || '%';
    
    -- Format: FC-2024-01
    new_code := 'FC-' || current_year || '-' || LPAD(sequence_number::VARCHAR, 2, '0');
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function untuk update jumlah peserta saat ada pendaftaran baru
CREATE OR REPLACE FUNCTION update_challenge_participants()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_participants saat ada peserta baru
    IF TG_OP = 'INSERT' THEN
        UPDATE fit_challenges 
        SET current_participants = current_participants + 1
        WHERE id = NEW.challenge_id;
        RETURN NEW;
    -- Update current_participants saat peserta dihapus atau dropped
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'dropped' AND NEW.status = 'dropped' THEN
        UPDATE fit_challenges 
        SET current_participants = current_participants - 1
        WHERE id = NEW.challenge_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE fit_challenges 
        SET current_participants = current_participants - 1
        WHERE id = OLD.challenge_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER IF NOT EXISTS trigger_update_challenge_participants
    AFTER INSERT OR UPDATE OR DELETE ON fit_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_challenge_participants();

-- Enable Row Level Security
ALTER TABLE fit_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_progress_weekly ENABLE ROW LEVEL SECURITY;

-- Policy untuk fit_challenges: Semua bisa lihat challenge yang active
CREATE POLICY IF NOT EXISTS fit_challenges_public_read ON fit_challenges
    FOR SELECT USING (
        status IN ('registration', 'active')
    );

-- Policy untuk fit_challenges: Admin tenant bisa manage
CREATE POLICY IF NOT EXISTS fit_challenges_admin_access ON fit_challenges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid()
            AND au.tenant_id = fit_challenges.tenant_id
            AND au.is_active = true
        )
    );

-- Policy untuk fit_participants: Member bisa lihat data mereka sendiri
CREATE POLICY IF NOT EXISTS fit_participants_member_access ON fit_participants
    FOR SELECT USING (
        member_id = auth.uid()
    );

-- Policy untuk fit_participants: Admin bisa manage semua peserta
CREATE POLICY IF NOT EXISTS fit_participants_admin_access ON fit_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            JOIN members m ON m.tenant_id = au.tenant_id
            WHERE au.id = auth.uid()
            AND m.id = fit_participants.member_id
            AND au.is_active = true
        )
    );

-- Policy untuk fit_progress_weekly: Member bisa lihat progress mereka
CREATE POLICY IF NOT EXISTS fit_progress_member_access ON fit_progress_weekly
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM fit_participants fp
            WHERE fp.id = fit_progress_weekly.participant_id
            AND fp.member_id = auth.uid()
        )
    );

-- Komentar untuk dokumentasi
COMMENT ON TABLE fit_challenges IS 'Tabel program fit challenge 8 minggu dengan trainer';
COMMENT ON COLUMN fit_challenges.challenge_code IS 'Kode unik challenge dengan format FC-YYYY-NN';
COMMENT ON COLUMN fit_challenges.registration_fee IS 'Biaya pendaftaran challenge (default Rp 600.000)';
COMMENT ON COLUMN fit_challenges.max_participants IS 'Maksimal peserta per batch (default 50 orang)';
COMMENT ON COLUMN fit_challenges.status IS 'Status challenge: upcoming, registration, active, completed';

COMMENT ON TABLE fit_participants IS 'Tabel peserta fit challenge dengan data biometrik';
COMMENT ON COLUMN fit_participants.payment_status IS 'Status pembayaran: pending, partial, paid';
COMMENT ON COLUMN fit_participants.total_sessions IS 'Total sesi latihan (default 24 = 3x/minggu x 8 minggu)';
COMMENT ON COLUMN fit_participants.completion_percentage IS 'Persentase kehadiran peserta';

COMMENT ON TABLE fit_progress_weekly IS 'Tabel progress mingguan peserta (8 minggu)';
COMMENT ON COLUMN fit_progress_weekly.week_number IS 'Minggu ke- (1-8)';
COMMENT ON COLUMN fit_progress_weekly.body_fat_percentage IS 'Persentase lemak tubuh';
COMMENT ON COLUMN fit_progress_weekly.trainer_notes IS 'Catatan trainer tentang progress peserta';