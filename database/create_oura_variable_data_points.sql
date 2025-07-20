-- ============================================================================
-- OURA VARIABLE DATA POINTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS oura_variable_data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    value DECIMAL(10,4) NOT NULL,
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

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on the table
ALTER TABLE oura_variable_data_points ENABLE ROW LEVEL SECURITY;

-- Oura variable data points policies
CREATE POLICY "Users can view their own Oura variable data points" ON oura_variable_data_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Oura variable data points" ON oura_variable_data_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Oura variable data points" ON oura_variable_data_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Oura variable data points" ON oura_variable_data_points
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- INSERT OURA VARIABLES INTO VARIABLES TABLE
-- ============================================================================

INSERT INTO variables (slug, label, canonical_unit, category, source_type, data_type, is_active) VALUES
    ('readiness_score', 'Readiness Score', 'score', 'Recovery', 'oura', 'continuous', true),
    ('sleep_score', 'Sleep Score', 'score', 'Sleep', 'oura', 'continuous', true),
    ('total_sleep_duration', 'Total Sleep Duration', 'seconds', 'Sleep', 'oura', 'continuous', true),
    ('rem_sleep_duration', 'REM Sleep Duration', 'seconds', 'Sleep', 'oura', 'continuous', true),
    ('deep_sleep_duration', 'Deep Sleep Duration', 'seconds', 'Sleep', 'oura', 'continuous', true),
    ('light_sleep_duration', 'Light Sleep Duration', 'seconds', 'Sleep', 'oura', 'continuous', true),
    ('efficiency', 'Sleep Efficiency', 'percentage', 'Sleep', 'oura', 'continuous', true),
    ('sleep_latency', 'Sleep Latency', 'seconds', 'Sleep', 'oura', 'continuous', true),
    ('temperature_deviation', 'Temperature Deviation', 'celsius', 'Recovery', 'oura', 'continuous', true),
    ('temperature_trend_deviation', 'Temperature Trend Deviation', 'celsius', 'Recovery', 'oura', 'continuous', true),
    ('hr_lowest_true', 'Lowest Heart Rate', 'bpm', 'Heart Rate', 'oura', 'continuous', true),
    ('hr_average_true', 'Average Heart Rate', 'bpm', 'Heart Rate', 'oura', 'continuous', true)
ON CONFLICT (slug) DO UPDATE SET
    label = EXCLUDED.label,
    canonical_unit = EXCLUDED.canonical_unit,
    category = EXCLUDED.category,
    source_type = EXCLUDED.source_type,
    data_type = EXCLUDED.data_type,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

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
SELECT slug, label, category, source_type 
FROM variables 
WHERE source_type = 'oura' 
ORDER BY category, label; 