-- Fix Withings Integration Database Tables
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- WITHINGS TOKENS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id), -- One token set per user
    CONSTRAINT withings_tokens_access_token_check CHECK (access_token IS NOT NULL AND access_token != ''),
    CONSTRAINT withings_tokens_refresh_token_check CHECK (refresh_token IS NOT NULL AND refresh_token != '')
);

-- ============================================================================
-- WITHINGS VARIABLE LOGS TABLE (The one the app actually uses)
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable TEXT NOT NULL, -- e.g., 'weight_kg', 'fat_ratio', etc.
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, date, variable), -- One measurement per user per date per variable
    CONSTRAINT withings_variable_logs_value_check CHECK (value > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Withings tokens indexes
CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON withings_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_tokens_expires_at ON withings_tokens(expires_at);

-- Withings variable logs indexes
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_id ON withings_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_date ON withings_variable_logs(date);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_variable ON withings_variable_logs(variable);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_date ON withings_variable_logs(user_id, date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE withings_variable_logs ENABLE ROW LEVEL SECURITY;

-- Withings tokens policies
DROP POLICY IF EXISTS "Users can view their own Withings tokens" ON withings_tokens;
CREATE POLICY "Users can view their own Withings tokens" ON withings_tokens
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own Withings tokens" ON withings_tokens;
CREATE POLICY "Users can insert their own Withings tokens" ON withings_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own Withings tokens" ON withings_tokens;
CREATE POLICY "Users can update their own Withings tokens" ON withings_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Withings variable logs policies
DROP POLICY IF EXISTS "Users can view their own Withings logs" ON withings_variable_logs;
CREATE POLICY "Users can view their own Withings logs" ON withings_variable_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own Withings logs" ON withings_variable_logs;
CREATE POLICY "Users can insert their own Withings logs" ON withings_variable_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own Withings logs" ON withings_variable_logs;
CREATE POLICY "Users can update their own Withings logs" ON withings_variable_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that tables were created
SELECT 
    table_name, 
    table_type 
FROM information_schema.tables 
WHERE table_name IN ('withings_tokens', 'withings_variable_logs')
AND table_schema = 'public';

-- Check table structures
\d withings_tokens;
\d withings_variable_logs;

-- Success message
SELECT 'Withings tables created successfully!' as status; 