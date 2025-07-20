-- Update withings_variable_data_points table to ensure compatibility with edge function
-- This script fixes any schema mismatches

-- First, let's check the current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'withings_variable_data_points' 
ORDER BY ordinal_position;

-- Update the table to ensure proper constraints and data types
ALTER TABLE withings_variable_data_points 
ALTER COLUMN date TYPE timestamp with time zone USING date::timestamp with time zone;

-- Ensure the unique constraint exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'withings_variable_data_points_user_id_date_variable_key'
    ) THEN
        ALTER TABLE withings_variable_data_points 
        ADD CONSTRAINT withings_variable_data_points_user_id_date_variable_key 
        UNIQUE (user_id, date, variable);
    END IF;
END $$;

-- Ensure RLS is enabled
ALTER TABLE withings_variable_data_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can insert their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can update their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can delete their own Withings variable data points" ON withings_variable_data_points;

-- Create RLS policies
CREATE POLICY "Users can view their own Withings variable data points" ON withings_variable_data_points
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Withings variable data points" ON withings_variable_data_points
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Withings variable data points" ON withings_variable_data_points
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Withings variable data points" ON withings_variable_data_points
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_id ON withings_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_date ON withings_variable_data_points(date);
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_variable ON withings_variable_data_points(variable);
CREATE INDEX IF NOT EXISTS idx_withings_variable_data_points_user_date ON withings_variable_data_points(user_id, date);

-- Verify the table structure
SELECT 
    c.column_name, 
    c.data_type, 
    c.is_nullable, 
    c.column_default,
    CASE 
        WHEN tc.constraint_type = 'UNIQUE' THEN 'UNIQUE'
        WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PRIMARY KEY'
        ELSE NULL 
    END as constraint_type
FROM information_schema.columns c
LEFT JOIN information_schema.key_column_usage kcu ON c.column_name = kcu.column_name AND c.table_name = kcu.table_name
LEFT JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
WHERE c.table_name = 'withings_variable_data_points' 
ORDER BY c.ordinal_position; 