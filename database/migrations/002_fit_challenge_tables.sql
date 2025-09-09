-- Fit Challenge Module Database Schema
-- Migration 002: Fit Challenge Tables
-- Created: 2025-09-09 for Sinoman SuperApp

-- Enum untuk status fit challenge
CREATE TYPE challenge_status AS ENUM ('upcoming', 'active', 'completed', 'cancelled');
CREATE TYPE participant_status AS ENUM ('registered', 'active', 'completed', 'dropped', 'suspended');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Tabel untuk Fit Challenges
CREATE TABLE fit_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    challenge_code VARCHAR(20) NOT NULL UNIQUE,
    challenge_name VARCHAR(100) NOT NULL,
    description TEXT,
    batch_number INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_deadline DATE NOT NULL,
    registration_fee DECIMAL(12,2) DEFAULT 600000.00, -- Rp 600,000
    max_participants INTEGER DEFAULT 50,
    current_participants INTEGER DEFAULT 0,
    trainer_name VARCHAR(100),
    trainer_phone VARCHAR(20),
    trainer_photo_url VARCHAR(255),
    location VARCHAR(255),
    schedule_days VARCHAR(20), -- 'mon,wed,fri' format
    schedule_time TIME,
    requirements TEXT,
    prizes_info JSONB, -- JSON untuk info hadiah
    rules_regulation TEXT,
    status challenge_status DEFAULT 'upcoming',
    featured BOOLEAN DEFAULT FALSE,
    photo_url VARCHAR(255),
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabel untuk Participants
CREATE TABLE fit_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES members(id),
    challenge_id UUID NOT NULL REFERENCES fit_challenges(id),
    registration_number VARCHAR(20) NOT NULL UNIQUE,
    registration_date TIMESTAMP DEFAULT NOW(),
    payment_status payment_status DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date TIMESTAMP,
    
    -- Initial measurements
    initial_weight DECIMAL(5,2),
    initial_height DECIMAL(5,2),
    initial_body_fat DECIMAL(5,2),
    initial_muscle_mass DECIMAL(5,2),
    initial_photo_url VARCHAR(255),
    initial_notes TEXT,
    
    -- Current measurements (updated throughout program)
    current_weight DECIMAL(5,2),
    current_body_fat DECIMAL(5,2),
    current_muscle_mass DECIMAL(5,2),
    current_photo_url VARCHAR(255),
    
    -- Target measurements
    target_weight DECIMAL(5,2),
    target_body_fat DECIMAL(5,2),
    target_muscle_mass DECIMAL(5,2),
    
    -- Progress tracking
    attendance_count INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    attendance_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Status and completion
    status participant_status DEFAULT 'registered',
    completion_date TIMESTAMP,
    final_score DECIMAL(5,2),
    achievement_level VARCHAR(50), -- 'bronze', 'silver', 'gold', 'platinum'
    certificates_url VARCHAR(255),
    
    -- Additional info
    health_conditions TEXT,
    emergency_contact VARCHAR(100),
    emergency_phone VARCHAR(20),
    motivation_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(member_id, challenge_id)
);

-- Tabel untuk Weekly Progress Tracking
CREATE TABLE fit_progress_weekly (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES fit_participants(id),
    week_number INTEGER NOT NULL,
    measurement_date DATE NOT NULL,
    
    -- Body measurements
    weight DECIMAL(5,2),
    body_fat_percentage DECIMAL(5,2),
    muscle_mass DECIMAL(5,2),
    waist_circumference DECIMAL(5,2),
    chest_circumference DECIMAL(5,2),
    arm_circumference DECIMAL(5,2),
    
    -- Progress photos
    front_photo_url VARCHAR(255),
    side_photo_url VARCHAR(255),
    back_photo_url VARCHAR(255),
    
    -- Performance metrics
    cardio_endurance_score DECIMAL(5,2),
    strength_score DECIMAL(5,2),
    flexibility_score DECIMAL(5,2),
    
    -- Weekly goals and achievements
    weekly_goal TEXT,
    weekly_achievement TEXT,
    challenges_faced TEXT,
    
    -- Trainer assessment
    trainer_notes TEXT,
    trainer_rating INTEGER CHECK (trainer_rating >= 1 AND trainer_rating <= 5),
    improvement_areas TEXT,
    next_week_focus TEXT,
    
    -- Attendance for the week
    sessions_attended INTEGER DEFAULT 0,
    sessions_scheduled INTEGER DEFAULT 3,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(participant_id, week_number)
);

-- Tabel untuk Daily Activities
CREATE TABLE fit_activities_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_id UUID NOT NULL REFERENCES fit_participants(id),
    activity_date DATE NOT NULL,
    
    -- Exercise activities
    workout_completed BOOLEAN DEFAULT FALSE,
    workout_type VARCHAR(100), -- 'cardio', 'strength', 'yoga', 'mixed'
    workout_duration INTEGER, -- in minutes
    calories_burned INTEGER,
    exercise_notes TEXT,
    
    -- Nutrition tracking
    meals_logged BOOLEAN DEFAULT FALSE,
    water_intake_liters DECIMAL(3,1),
    protein_intake_grams INTEGER,
    calories_consumed INTEGER,
    nutrition_notes TEXT,
    
    -- Sleep and recovery
    sleep_hours DECIMAL(3,1),
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 5),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
    energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
    
    -- Daily mood and motivation
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    motivation_level INTEGER CHECK (motivation_level >= 1 AND motivation_level <= 5),
    daily_reflection TEXT,
    
    -- Progress photos (optional daily)
    progress_photo_url VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(participant_id, activity_date)
);

-- Tabel untuk Challenge Leaderboard
CREATE TABLE fit_leaderboard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES fit_challenges(id),
    participant_id UUID NOT NULL REFERENCES fit_participants(id),
    
    -- Scoring categories
    weight_loss_score DECIMAL(5,2) DEFAULT 0,
    body_fat_reduction_score DECIMAL(5,2) DEFAULT 0,
    muscle_gain_score DECIMAL(5,2) DEFAULT 0,
    attendance_score DECIMAL(5,2) DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0,
    improvement_score DECIMAL(5,2) DEFAULT 0,
    
    -- Total and ranking
    total_score DECIMAL(8,2) DEFAULT 0,
    current_rank INTEGER,
    previous_rank INTEGER,
    best_rank INTEGER,
    
    -- Achievement badges
    badges JSONB, -- JSON array of achieved badges
    
    -- Last update
    last_calculated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(challenge_id, participant_id)
);

-- Tabel untuk Challenge Rewards and Achievements
CREATE TABLE fit_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID NOT NULL REFERENCES fit_challenges(id),
    participant_id UUID NOT NULL REFERENCES fit_participants(id),
    
    achievement_type VARCHAR(50), -- 'weight_loss', 'attendance', 'consistency', 'improvement'
    achievement_name VARCHAR(100),
    achievement_description TEXT,
    badge_icon VARCHAR(255),
    
    criteria_met JSONB, -- JSON of criteria that was met
    achievement_date TIMESTAMP DEFAULT NOW(),
    points_awarded INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_fit_challenges_status ON fit_challenges(status);
CREATE INDEX idx_fit_challenges_dates ON fit_challenges(start_date, end_date);
CREATE INDEX idx_fit_participants_challenge ON fit_participants(challenge_id);
CREATE INDEX idx_fit_participants_member ON fit_participants(member_id);
CREATE INDEX idx_fit_participants_status ON fit_participants(status);
CREATE INDEX idx_fit_progress_participant ON fit_progress_weekly(participant_id);
CREATE INDEX idx_fit_progress_week ON fit_progress_weekly(participant_id, week_number);
CREATE INDEX idx_fit_activities_participant ON fit_activities_daily(participant_id);
CREATE INDEX idx_fit_activities_date ON fit_activities_daily(participant_id, activity_date);
CREATE INDEX idx_fit_leaderboard_challenge ON fit_leaderboard(challenge_id, total_score DESC);

-- Create triggers for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_fit_challenges_updated_at BEFORE UPDATE ON fit_challenges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fit_participants_updated_at BEFORE UPDATE ON fit_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fit_progress_updated_at BEFORE UPDATE ON fit_progress_weekly
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fit_activities_updated_at BEFORE UPDATE ON fit_activities_daily
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE fit_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_progress_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_activities_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY fit_challenges_tenant_policy ON fit_challenges
    FOR ALL USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);

CREATE POLICY fit_participants_member_policy ON fit_participants
    FOR ALL USING (member_id = auth.uid());

-- Admin access policies (to be implemented based on admin roles)
CREATE POLICY fit_challenges_admin_policy ON fit_challenges
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND tenant_id = fit_challenges.tenant_id
            AND role IN ('admin', 'super_admin', 'trainer')
        )
    );

-- Comments for documentation
COMMENT ON TABLE fit_challenges IS 'Main table for Fit Challenge programs';
COMMENT ON TABLE fit_participants IS 'Participants enrolled in Fit Challenges';
COMMENT ON TABLE fit_progress_weekly IS 'Weekly progress measurements and assessments';
COMMENT ON TABLE fit_activities_daily IS 'Daily activity and nutrition tracking';
COMMENT ON TABLE fit_leaderboard IS 'Real-time leaderboard rankings';
COMMENT ON TABLE fit_achievements IS 'Achievements and badges earned by participants';