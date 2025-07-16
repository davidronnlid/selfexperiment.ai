console.log(`
🔧 Fixing Withings Database Schema Issues

The error "column withings_variable_logs.created_at does not exist" indicates that the table structure is incomplete.

Copy and paste this SQL into your Supabase SQL Editor:
==================================================

-- First, check if the table exists and its current structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'withings_variable_logs' 
ORDER BY ordinal_position;

-- If the table exists but is missing columns, add them:
ALTER TABLE withings_variable_logs 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- If the table doesn't exist or has wrong structure, recreate it:
DROP TABLE IF EXISTS withings_variable_logs CASCADE;

CREATE TABLE withings_variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    variable TEXT NOT NULL,
    value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date, variable)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_id ON withings_variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_date ON withings_variable_logs(date);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_variable ON withings_variable_logs(variable);
CREATE INDEX IF NOT EXISTS idx_withings_variable_logs_user_date ON withings_variable_logs(user_id, date);

-- Enable RLS
ALTER TABLE withings_variable_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own Withings logs" ON withings_variable_logs;
DROP POLICY IF EXISTS "Users can insert their own Withings logs" ON withings_variable_logs;
DROP POLICY IF EXISTS "Users can update their own Withings logs" ON withings_variable_logs;

-- Create RLS policies
CREATE POLICY "Users can view their own Withings logs" ON withings_variable_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Withings logs" ON withings_variable_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Withings logs" ON withings_variable_logs
    FOR UPDATE USING (auth.uid() = user_id);

-- Also ensure the withings_tokens table exists
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

-- Enable RLS for tokens table
ALTER TABLE withings_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for tokens table
DROP POLICY IF EXISTS "Users can manage their own Withings tokens" ON withings_tokens;
CREATE POLICY "Users can manage their own Withings tokens" ON withings_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Verify the tables were created correctly
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('withings_variable_logs', 'withings_tokens')
ORDER BY table_name, ordinal_position;

==================================================

After running this SQL:
1. The Withings integration should work without database errors
2. The "column does not exist" error should be resolved
3. All Withings data fetching should work properly

✅ This should fix the database schema issues!
`);
