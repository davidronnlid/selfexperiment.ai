-- Fix Withings Variable Logs Table
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- WITHINGS VARIABLE LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable TEXT NOT NULL, -- The variable name (e.g., 'weight', 'fat_ratio', etc.)
    value DECIMAL(10,4), -- The numeric value
    unit TEXT, -- Unit of measurement (e.g., 'kg', '%', etc.)
    source TEXT DEFAULT 'withings', -- Source of the data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, date, variable), -- One measurement per user per date per variable
    CONSTRAINT withings_variable_logs_value_check CHECK (value IS NOT NULL),
    CONSTRAINT withings_variable_logs_date_check CHECK (date IS NOT NULL)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_id ON withings_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_date ON withings_variable_logs(date);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_variable ON withings_variable_logs(variable);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE withings_variable_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Withings variable logs" ON withings_variable_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Withings variable logs" ON withings_variable_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Withings variable logs" ON withings_variable_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Withings variable logs" ON withings_variable_logs
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_withings_variable_logs_updated_at 
    BEFORE UPDATE ON withings_variable_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment the following lines to add sample data for testing
/*
INSERT INTO withings_variable_logs (user_id, date, variable, value, unit) VALUES
('your-user-id-here', '2024-01-01', 'weight', 70.5, 'kg'),
('your-user-id-here', '2024-01-01', 'fat_ratio', 15.2, '%'),
('your-user-id-here', '2024-01-02', 'weight', 70.3, 'kg'),
('your-user-id-here', '2024-01-02', 'fat_ratio', 15.0, '%');
*/ 