-- Fix Withings Integration Database Tables (Safe Version)
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
    UNIQUE(user_id)
);

-- ============================================================================
-- WITHINGS VARIABLE LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS withings_variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, variable)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_withings_tokens_user_id ON withings_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_id ON withings_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_date ON withings_variable_logs(date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE withings_variable_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can view their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can insert their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can update their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can delete their own Withings tokens" ON withings_tokens;

DROP POLICY IF EXISTS "Users can manage their own Withings logs" ON withings_variable_logs;
DROP POLICY IF EXISTS "Users can view their own Withings logs" ON withings_variable_logs;
DROP POLICY IF EXISTS "Users can insert their own Withings logs" ON withings_variable_logs;
DROP POLICY IF EXISTS "Users can update their own Withings logs" ON withings_variable_logs;
DROP POLICY IF EXISTS "Users can delete their own Withings logs" ON withings_variable_logs;

-- Create new policies
CREATE POLICY "Users can manage their own Withings tokens" ON withings_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own Withings logs" ON withings_variable_logs
    FOR ALL USING (auth.uid() = user_id);

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
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('withings_tokens', 'withings_variable_logs')
ORDER BY table_name, ordinal_position;

-- Success message
SELECT 'Withings tables created successfully!' as status; 