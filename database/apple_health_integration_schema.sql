-- Apple Health Integration Database Schema
-- Tables required for Apple Health integration functionality

-- ============================================================================
-- APPLE HEALTH TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS apple_health_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id)
);

-- ============================================================================
-- APPLE HEALTH VARIABLE DATA POINTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS apple_health_variable_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable_id TEXT NOT NULL, -- Will reference variables.slug when variables are created
    value DECIMAL(10,4) NOT NULL,
    source TEXT DEFAULT 'apple_health',
    raw JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id, date, variable_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Apple Health tokens indexes
CREATE INDEX IF NOT EXISTS idx_apple_health_tokens_user_id ON apple_health_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_tokens_created_at ON apple_health_tokens(created_at);

-- Apple Health data points indexes
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_user_id ON apple_health_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_variable_id ON apple_health_variable_data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_date ON apple_health_variable_data_points(date);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_user_variable_date ON apple_health_variable_data_points(user_id, variable_id, date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on apple_health_tokens
ALTER TABLE apple_health_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only access their own tokens
CREATE POLICY "Users can view own apple health tokens" ON apple_health_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own apple health tokens" ON apple_health_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own apple health tokens" ON apple_health_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own apple health tokens" ON apple_health_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on apple_health_variable_data_points
ALTER TABLE apple_health_variable_data_points ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data points
CREATE POLICY "Users can view own apple health data points" ON apple_health_variable_data_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own apple health data points" ON apple_health_variable_data_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own apple health data points" ON apple_health_variable_data_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own apple health data points" ON apple_health_variable_data_points
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR DATA MANAGEMENT
-- ============================================================================

-- Function to clean up old Apple Health data
CREATE OR REPLACE FUNCTION cleanup_old_apple_health_data(days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM apple_health_variable_data_points 
    WHERE date < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get Apple Health data summary
CREATE OR REPLACE FUNCTION get_apple_health_summary(target_user_id UUID, days_back INTEGER DEFAULT 30)
RETURNS TABLE(
    variable_id TEXT,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    latest_value NUMERIC,
    data_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ah.variable_id,
        AVG(ah.value) as avg_value,
        MIN(ah.value) as min_value,
        MAX(ah.value) as max_value,
        (SELECT value FROM apple_health_variable_data_points 
         WHERE user_id = target_user_id 
         AND variable_id = ah.variable_id 
         ORDER BY date DESC 
         LIMIT 1) as latest_value,
        COUNT(*) as data_points
    FROM apple_health_variable_data_points ah
    WHERE ah.user_id = target_user_id
    AND ah.date >= CURRENT_DATE - INTERVAL '1 day' * days_back
    GROUP BY ah.variable_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- APPLE HEALTH VARIABLES CREATION
-- ============================================================================

-- Insert Apple Health variables into the variables table if they don't exist
INSERT INTO variables (slug, label, icon, category, unit, constraints, is_active, is_public, source)
VALUES 
    ('ah_steps', 'Steps (Apple Health)', '👣', 'Activity', 'steps', '{"min": 0, "max": 50000}', true, true, 'apple_health'),
    ('ah_heart_rate', 'Heart Rate (Apple Health)', '❤️', 'Vitals', 'bpm', '{"min": 30, "max": 220}', true, true, 'apple_health'),
    ('ah_weight', 'Weight (Apple Health)', '⚖️', 'Body', 'kg', '{"min": 30, "max": 300}', true, true, 'apple_health'),
    ('ah_sleep_duration', 'Sleep Duration (Apple Health)', '😴', 'Sleep', 'hours', '{"min": 0, "max": 24}', true, true, 'apple_health'),
    ('ah_active_calories', 'Active Calories (Apple Health)', '🔥', 'Activity', 'kcal', '{"min": 0, "max": 5000}', true, true, 'apple_health'),
    ('ah_resting_heart_rate', 'Resting Heart Rate (Apple Health)', '💓', 'Vitals', 'bpm', '{"min": 30, "max": 150}', true, true, 'apple_health'),
    ('ah_blood_pressure_systolic', 'Blood Pressure Systolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 70, "max": 200}', true, true, 'apple_health'),
    ('ah_blood_pressure_diastolic', 'Blood Pressure Diastolic (Apple Health)', '🩸', 'Vitals', 'mmHg', '{"min": 40, "max": 130}', true, true, 'apple_health'),
    ('ah_body_fat_percentage', 'Body Fat Percentage (Apple Health)', '📊', 'Body', '%', '{"min": 5, "max": 50}', true, true, 'apple_health'),
    ('ah_vo2_max', 'VO2 Max (Apple Health)', '🫁', 'Fitness', 'ml/kg/min', '{"min": 20, "max": 80}', true, true, 'apple_health')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SAMPLE DATA INSERTION (OPTIONAL - FOR TESTING)
-- ============================================================================

-- This section can be uncommented for testing purposes
-- Note: Replace 'your-user-id-here' with an actual user ID for testing

/*
-- Sample Apple Health data for testing
INSERT INTO apple_health_variable_data_points (user_id, date, variable_id, value, source)
VALUES 
    ('your-user-id-here', CURRENT_DATE - INTERVAL '1 day', 'ah_steps', 8543, 'apple_health'),
    ('your-user-id-here', CURRENT_DATE - INTERVAL '1 day', 'ah_heart_rate', 72, 'apple_health'),
    ('your-user-id-here', CURRENT_DATE - INTERVAL '1 day', 'ah_weight', 75.2, 'apple_health'),
    ('your-user-id-here', CURRENT_DATE - INTERVAL '1 day', 'ah_sleep_duration', 7.5, 'apple_health'),
    ('your-user-id-here', CURRENT_DATE - INTERVAL '1 day', 'ah_active_calories', 387, 'apple_health'),
    ('your-user-id-here', CURRENT_DATE - INTERVAL '1 day', 'ah_resting_heart_rate', 58, 'apple_health')
ON CONFLICT (user_id, date, variable_id) DO NOTHING;
*/ 