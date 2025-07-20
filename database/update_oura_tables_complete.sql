-- ============================================================================
-- COMPLETE OURA TABLES UPDATE SCRIPT
-- ============================================================================

-- Drop existing table if it exists (backup first if needed)
DROP TABLE IF EXISTS oura_variable_data_points CASCADE;

-- Create the new oura_variable_data_points table following the withings pattern
CREATE TABLE oura_variable_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    value DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, date, variable_id), -- One measurement per user per date per variable
    CONSTRAINT oura_variable_data_points_value_check CHECK (value IS NOT NULL),
    CONSTRAINT oura_variable_data_points_date_check CHECK (date IS NOT NULL),
    CONSTRAINT oura_variable_data_points_variable_id_check CHECK (variable_id IS NOT NULL)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_oura_variable_data_points_user_id ON oura_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_data_points_date ON oura_variable_data_points(date);
CREATE INDEX IF NOT EXISTS idx_oura_variable_data_points_variable_id ON oura_variable_data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_data_points_user_date ON oura_variable_data_points(user_id, date);
CREATE INDEX IF NOT EXISTS idx_oura_variable_data_points_user_variable ON oura_variable_data_points(user_id, variable_id);
CREATE INDEX IF NOT EXISTS idx_oura_variable_data_points_created_at ON oura_variable_data_points(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE oura_variable_data_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own Oura variable data points" ON oura_variable_data_points;
DROP POLICY IF EXISTS "Users can insert their own Oura variable data points" ON oura_variable_data_points;
DROP POLICY IF EXISTS "Users can update their own Oura variable data points" ON oura_variable_data_points;
DROP POLICY IF EXISTS "Users can delete their own Oura variable data points" ON oura_variable_data_points;

-- Create RLS policies
CREATE POLICY "Users can view their own Oura variable data points" ON oura_variable_data_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Oura variable data points" ON oura_variable_data_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Oura variable data points" ON oura_variable_data_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Oura variable data points" ON oura_variable_data_points
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- INSERT/UPDATE OURA VARIABLES INTO VARIABLES TABLE
-- ============================================================================

-- First, let's check what variables already exist to avoid conflicts
SELECT 'Checking existing variables that might conflict...' as info;

-- Insert or update Oura variables following the same pattern as Withings
-- Using ON CONFLICT (label) to handle existing variables with same labels
INSERT INTO variables (slug, label, description, data_type, canonical_unit, unit_group, convertible_units, default_display_unit, source_type, category, is_active) VALUES
    ('oura_readiness_score', 'Oura Readiness Score', 'Oura Ring readiness score (0-100)', 'continuous', 'score', 'score', '["score"]', 'score', 'oura', 'Recovery', true),
    ('oura_sleep_score', 'Oura Sleep Score', 'Oura Ring sleep score (0-100)', 'continuous', 'score', 'score', '["score"]', 'score', 'oura', 'Sleep', true),
    ('oura_total_sleep_duration', 'Oura Total Sleep Duration', 'Total sleep duration in seconds', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('oura_rem_sleep_duration', 'Oura REM Sleep Duration', 'REM sleep duration in seconds', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('oura_deep_sleep_duration', 'Oura Deep Sleep Duration', 'Deep sleep duration in seconds', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('oura_light_sleep_duration', 'Oura Light Sleep Duration', 'Light sleep duration in seconds', 'continuous', 'seconds', 'time', '["seconds", "minutes", "hours"]', 'hours', 'oura', 'Sleep', true),
    ('oura_efficiency', 'Oura Sleep Efficiency', 'Sleep efficiency percentage', 'continuous', '%', 'percentage', '["%"]', '%', 'oura', 'Sleep', true),
    ('oura_sleep_latency', 'Oura Sleep Latency', 'Sleep latency in seconds', 'continuous', 'seconds', 'time', '["seconds", "minutes"]', 'minutes', 'oura', 'Sleep', true),
    ('oura_temperature_deviation', 'Oura Temperature Deviation', 'Temperature deviation from baseline in celsius', 'continuous', '°C', 'temperature', '["°C", "°F"]', '°C', 'oura', 'Recovery', true),
    ('oura_temperature_trend_deviation', 'Oura Temperature Trend Deviation', 'Temperature trend deviation from baseline in celsius', 'continuous', '°C', 'temperature', '["°C", "°F"]', '°C', 'oura', 'Recovery', true),
    ('oura_hr_lowest', 'Oura Lowest Heart Rate', 'Lowest heart rate during sleep in BPM', 'continuous', 'bpm', 'heart_rate', '["bpm"]', 'bpm', 'oura', 'Heart Rate', true),
    ('oura_hr_average', 'Oura Average Heart Rate', 'Average heart rate during sleep in BPM', 'continuous', 'bpm', 'heart_rate', '["bpm"]', 'bpm', 'oura', 'Heart Rate', true),
    ('oura_activity_score', 'Oura Activity Score', 'Oura Ring activity score (0-100)', 'continuous', 'score', 'score', '["score"]', 'score', 'oura', 'Activity', true),
    ('oura_steps', 'Oura Steps', 'Daily step count from Oura Ring', 'continuous', 'steps', 'count', '["steps"]', 'steps', 'oura', 'Activity', true),
    ('oura_calories_active', 'Oura Active Calories', 'Active calories burned in kcal', 'continuous', 'kcal', 'energy', '["kcal", "kJ"]', 'kcal', 'oura', 'Activity', true),
    ('oura_calories_total', 'Oura Total Calories', 'Total calories burned in kcal', 'continuous', 'kcal', 'energy', '["kcal", "kJ"]', 'kcal', 'oura', 'Activity', true)
ON CONFLICT (label) DO UPDATE SET
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    canonical_unit = EXCLUDED.canonical_unit,
    unit_group = EXCLUDED.unit_group,
    convertible_units = EXCLUDED.convertible_units,
    default_display_unit = EXCLUDED.default_display_unit,
    source_type = EXCLUDED.source_type,
    category = EXCLUDED.category,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ============================================================================
-- UPDATE OURA TOKENS TABLE TO MATCH WITHINGS PATTERN
-- ============================================================================

-- Update oura_tokens table structure to match withings_tokens
ALTER TABLE oura_tokens DROP CONSTRAINT IF EXISTS oura_tokens_user_id_access_token_key;

-- Add expires_at column if it doesn't exist
ALTER TABLE oura_tokens ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Add updated_at column if it doesn't exist
ALTER TABLE oura_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Clean up duplicate user_id entries before adding unique constraint
-- Keep only the most recent entry for each user_id
DELETE FROM oura_tokens 
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id) id 
    FROM oura_tokens 
    ORDER BY user_id, created_at DESC NULLS LAST, id DESC
);

-- Update the unique constraint to match withings pattern
ALTER TABLE oura_tokens DROP CONSTRAINT IF EXISTS oura_tokens_user_id_key;
ALTER TABLE oura_tokens ADD CONSTRAINT oura_tokens_user_id_key UNIQUE (user_id);

-- Update RLS policies for oura_tokens
DROP POLICY IF EXISTS "Users can view own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can insert own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can update own oura tokens" ON oura_tokens;

CREATE POLICY "Users can view own oura tokens" ON oura_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own oura tokens" ON oura_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own oura tokens" ON oura_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to convert Oura variable slugs to IDs
CREATE OR REPLACE FUNCTION get_oura_variable_id(variable_slug TEXT)
RETURNS UUID AS $$
DECLARE
    variable_id UUID;
BEGIN
    SELECT id INTO variable_id 
    FROM variables 
    WHERE slug = variable_slug 
    AND source_type = 'oura';
    
    RETURN variable_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get user timezone (add if doesn't exist)
CREATE OR REPLACE FUNCTION get_user_timezone(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_timezone TEXT;
BEGIN
    SELECT timezone INTO user_timezone 
    FROM profiles 
    WHERE id = user_id;
    
    RETURN COALESCE(user_timezone, 'Europe/Stockholm');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'oura_variable_data_points' 
ORDER BY ordinal_position;

-- Check that Oura variables were created
SELECT slug, label, category, source_type, canonical_unit, unit_group
FROM variables 
WHERE source_type = 'oura' 
ORDER BY category, label;

-- Check constraints and indexes
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'oura_variable_data_points'::regclass;

SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'oura_variable_data_points'
ORDER BY indexname;

-- Test function
SELECT get_oura_variable_id('oura_readiness_score') as readiness_score_id;

-- Verification queries - these will show the results in the output
SELECT 'Oura tables update completed successfully!' as status;
SELECT COUNT(*) as oura_variables_created FROM variables WHERE source_type = 'oura';
SELECT 'Table oura_variable_data_points is ready for edge function data insertion' as next_step; 