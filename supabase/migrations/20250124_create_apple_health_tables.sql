-- =============================================
-- COMPREHENSIVE APPLE HEALTH INTEGRATION SCHEMA
-- Supports ALL major HealthKit data types
-- =============================================

-- First ensure we have the apple_health_variable_data_points table
CREATE TABLE IF NOT EXISTS apple_health_variable_data_points (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id TEXT NOT NULL,
    value DECIMAL NOT NULL,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, variable_id, date, timestamp)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_apple_health_user_id ON apple_health_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_id ON apple_health_variable_data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_date ON apple_health_variable_data_points(date);
CREATE INDEX IF NOT EXISTS idx_apple_health_timestamp ON apple_health_variable_data_points(timestamp);

-- Create apple_health_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS apple_health_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    token_type TEXT DEFAULT 'bearer',
    expires_at TIMESTAMPTZ,
    scope TEXT,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- INSERT COMPREHENSIVE APPLE HEALTH VARIABLES
-- This covers ALL major HealthKit data types for complete health tracking
-- Only insert if variables table exists

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variables' AND table_schema = 'public') THEN
    INSERT INTO variables (id, name, data_type, category, created_at) VALUES 
-- Activity & Fitness Variables
('ah_steps', 'Steps (Apple Health)', 'numeric', 'activity', NOW()),
('ah_distance_walking_running', 'Walking + Running Distance (Apple Health)', 'numeric', 'activity', NOW()),
('ah_distance_cycling', 'Cycling Distance (Apple Health)', 'numeric', 'activity', NOW()),
('ah_active_calories', 'Active Calories Burned (Apple Health)', 'numeric', 'activity', NOW()),
('ah_basal_calories', 'Basal Calories Burned (Apple Health)', 'numeric', 'activity', NOW()),
('ah_flights_climbed', 'Flights Climbed (Apple Health)', 'numeric', 'activity', NOW()),
('ah_exercise_time', 'Exercise Time (Apple Health)', 'numeric', 'activity', NOW()),
('ah_stand_time', 'Stand Time (Apple Health)', 'numeric', 'activity', NOW()),

-- Heart & Circulatory Variables
('ah_heart_rate', 'Heart Rate (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_resting_heart_rate', 'Resting Heart Rate (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_heart_rate_variability', 'Heart Rate Variability (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_blood_pressure_systolic', 'Blood Pressure Systolic (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_blood_pressure_diastolic', 'Blood Pressure Diastolic (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_vo2_max', 'VO2 Max (Apple Health)', 'numeric', 'vitals', NOW()),

-- Body Measurements Variables
('ah_weight', 'Weight (Apple Health)', 'numeric', 'body', NOW()),
('ah_bmi', 'Body Mass Index (Apple Health)', 'numeric', 'body', NOW()),
('ah_body_fat_percentage', 'Body Fat Percentage (Apple Health)', 'numeric', 'body', NOW()),
('ah_lean_body_mass', 'Lean Body Mass (Apple Health)', 'numeric', 'body', NOW()),
('ah_height', 'Height (Apple Health)', 'numeric', 'body', NOW()),
('ah_waist_circumference', 'Waist Circumference (Apple Health)', 'numeric', 'body', NOW()),

-- Nutrition Variables
('ah_dietary_calories', 'Dietary Calories (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_water_intake', 'Water Intake (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_protein', 'Protein (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_carbohydrates', 'Carbohydrates (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_total_fat', 'Total Fat (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_sugar', 'Sugar (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_fiber', 'Fiber (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_sodium', 'Sodium (Apple Health)', 'numeric', 'nutrition', NOW()),
('ah_caffeine', 'Caffeine (Apple Health)', 'numeric', 'nutrition', NOW()),

-- Sleep & Mindfulness Variables
('ah_sleep_duration', 'Sleep Duration (Apple Health)', 'numeric', 'sleep', NOW()),
('ah_mindfulness', 'Mindfulness Sessions (Apple Health)', 'numeric', 'mental_health', NOW()),

-- Health Vitals Variables
('ah_respiratory_rate', 'Respiratory Rate (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_oxygen_saturation', 'Oxygen Saturation (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_body_temperature', 'Body Temperature (Apple Health)', 'numeric', 'vitals', NOW()),
('ah_blood_glucose', 'Blood Glucose (Apple Health)', 'numeric', 'vitals', NOW())

    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- CREATE COMPREHENSIVE VARIABLE UNITS
-- This ensures all Apple Health variables have proper unit definitions

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variable_units' AND table_schema = 'public') THEN
    INSERT INTO variable_units (variable_id, unit_id, is_default) VALUES
-- Activity & Fitness Units
('ah_steps', 'steps', TRUE),
('ah_distance_walking_running', 'meters', TRUE),
('ah_distance_cycling', 'meters', TRUE),
('ah_active_calories', 'kcal', TRUE),
('ah_basal_calories', 'kcal', TRUE),
('ah_flights_climbed', 'flights', TRUE),
('ah_exercise_time', 'minutes', TRUE),
('ah_stand_time', 'minutes', TRUE),

-- Heart & Circulatory Units
('ah_heart_rate', 'bpm', TRUE),
('ah_resting_heart_rate', 'bpm', TRUE),
('ah_heart_rate_variability', 'ms', TRUE),
('ah_blood_pressure_systolic', 'mmHg', TRUE),
('ah_blood_pressure_diastolic', 'mmHg', TRUE),
('ah_vo2_max', 'ml/kg/min', TRUE),

-- Body Measurements Units
('ah_weight', 'kg', TRUE),
('ah_bmi', 'kg/m²', TRUE),
('ah_body_fat_percentage', '%', TRUE),
('ah_lean_body_mass', 'kg', TRUE),
('ah_height', 'meters', TRUE),
('ah_waist_circumference', 'meters', TRUE),

-- Nutrition Units
('ah_dietary_calories', 'kcal', TRUE),
('ah_water_intake', 'liters', TRUE),
('ah_protein', 'grams', TRUE),
('ah_carbohydrates', 'grams', TRUE),
('ah_total_fat', 'grams', TRUE),
('ah_sugar', 'grams', TRUE),
('ah_fiber', 'grams', TRUE),
('ah_sodium', 'grams', TRUE),
('ah_caffeine', 'grams', TRUE),

-- Sleep & Mindfulness Units
('ah_sleep_duration', 'hours', TRUE),
('ah_mindfulness', 'minutes', TRUE),

-- Health Vitals Units
('ah_respiratory_rate', 'breaths/min', TRUE),
('ah_oxygen_saturation', '%', TRUE),
('ah_body_temperature', '°C', TRUE),
('ah_blood_glucose', 'mg/dL', TRUE)

    ON CONFLICT (variable_id, unit_id) DO NOTHING;
  END IF;
END $$;

-- ENHANCED DATA SYNC TRIGGER
-- Automatically syncs Apple Health data to the universal data_points table
CREATE OR REPLACE FUNCTION sync_apple_health_to_data_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert into universal data_points table
    INSERT INTO data_points (
        user_id,
        variable_id,
        value,
        date,
        created_at,
        updated_at
    ) VALUES (
        NEW.user_id,
        NEW.variable_id,
        NEW.value,
        NEW.date,
        NEW.created_at,
        NEW.updated_at
    )
    ON CONFLICT (user_id, variable_id, date) 
    DO UPDATE SET 
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic syncing
DROP TRIGGER IF EXISTS trigger_sync_apple_health_to_data_points ON apple_health_variable_data_points;
CREATE TRIGGER trigger_sync_apple_health_to_data_points
    AFTER INSERT OR UPDATE ON apple_health_variable_data_points
    FOR EACH ROW
    EXECUTE FUNCTION sync_apple_health_to_data_points();

-- ROW LEVEL SECURITY POLICIES
-- Secure access to Apple Health data

-- Enable RLS on both tables
ALTER TABLE apple_health_variable_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_health_tokens ENABLE ROW LEVEL SECURITY;

-- Apple Health data points policies
CREATE POLICY "Users can view their own Apple Health data" ON apple_health_variable_data_points
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own Apple Health data" ON apple_health_variable_data_points
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own Apple Health data" ON apple_health_variable_data_points
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own Apple Health data" ON apple_health_variable_data_points
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Apple Health tokens policies
CREATE POLICY "Users can view their own Apple Health tokens" ON apple_health_tokens
    FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own Apple Health tokens" ON apple_health_tokens
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own Apple Health tokens" ON apple_health_tokens
    FOR UPDATE USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own Apple Health tokens" ON apple_health_tokens
    FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- PERFORMANCE OPTIMIZATION
-- Add updated_at trigger for automatic timestamp updates

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_apple_health_data_points_updated_at
    BEFORE UPDATE ON apple_health_variable_data_points
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apple_health_tokens_updated_at
    BEFORE UPDATE ON apple_health_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- SUMMARY REPORTING
-- Add helpful views for data analysis

CREATE OR REPLACE VIEW apple_health_summary AS
SELECT 
    user_id,
    variable_id,
    COUNT(*) as total_data_points,
    MIN(date) as first_data_date,
    MAX(date) as last_data_date,
    MIN(value) as min_value,
    MAX(value) as max_value,
    AVG(value) as avg_value,
    STDDEV(value) as stddev_value
FROM apple_health_variable_data_points
GROUP BY user_id, variable_id;

-- Create view for data point counts by category (if variables table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'variables' AND table_schema = 'public') THEN
    EXECUTE 'CREATE OR REPLACE VIEW apple_health_category_summary AS
    SELECT 
        ahdp.user_id,
        v.category,
        COUNT(*) as total_data_points,
        COUNT(DISTINCT ahdp.variable_id) as unique_variables,
        MIN(ahdp.date) as first_data_date,
        MAX(ahdp.date) as last_data_date
    FROM apple_health_variable_data_points ahdp
    JOIN variables v ON ahdp.variable_id = v.id
    GROUP BY ahdp.user_id, v.category';
  END IF;
END $$;

COMMENT ON TABLE apple_health_variable_data_points IS 'Stores comprehensive Apple Health/HealthKit data for all supported data types including activity, heart, body measurements, nutrition, sleep, mindfulness, and health vitals';
COMMENT ON TABLE apple_health_tokens IS 'Stores Apple Health connection tokens and sync metadata';
COMMENT ON VIEW apple_health_summary IS 'Provides statistical summary of Apple Health data by user and variable';
-- Conditional comment on view (only if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'apple_health_category_summary' AND table_schema = 'public') THEN
    EXECUTE 'COMMENT ON VIEW apple_health_category_summary IS ''Provides summary of Apple Health data by user and health category''';
  END IF;
END $$; 