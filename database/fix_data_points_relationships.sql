-- Fix data_points table relationships and foreign keys
-- This resolves the console errors about missing relationships

-- ============================================================================
-- STEP 1: Check current data_points table structure
-- ============================================================================

-- Check if data_points table exists and its current structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'data_points' 
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Ensure data_points table has proper structure
-- ============================================================================

-- If data_points table doesn't exist, create it
CREATE TABLE IF NOT EXISTS data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Core data fields
    value TEXT NOT NULL,
    notes TEXT,
    date DATE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT data_points_value_check CHECK (value IS NOT NULL AND value != ''),
    CONSTRAINT data_points_user_id_check CHECK (user_id IS NOT NULL),
    CONSTRAINT data_points_variable_id_check CHECK (variable_id IS NOT NULL)
);

-- ============================================================================
-- STEP 3: Add missing columns if they don't exist
-- ============================================================================

-- Add variable_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'data_points' AND column_name = 'variable_id'
    ) THEN
        ALTER TABLE data_points 
        ADD COLUMN variable_id UUID REFERENCES variables(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added variable_id column to data_points table';
    END IF;
END $$;

-- Add date column if it doesn't exist  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'data_points' AND column_name = 'date'
    ) THEN
        ALTER TABLE data_points 
        ADD COLUMN date DATE;
        RAISE NOTICE 'Added date column to data_points table';
    END IF;
END $$;

-- Add notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'data_points' AND column_name = 'notes'
    ) THEN
        ALTER TABLE data_points 
        ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column to data_points table';
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Ensure foreign key constraints exist
-- ============================================================================

-- Add foreign key to variables if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'data_points_variable_id_fkey'
        AND table_name = 'data_points'
    ) THEN
        ALTER TABLE data_points 
        ADD CONSTRAINT data_points_variable_id_fkey 
        FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to variables table';
    END IF;
END $$;

-- Add foreign key to auth.users if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'data_points_user_id_fkey'
        AND table_name = 'data_points'
    ) THEN
        ALTER TABLE data_points 
        ADD CONSTRAINT data_points_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint to auth.users table';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create performance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_data_points_user_id ON data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_data_points_variable_id ON data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_data_points_date ON data_points(date);
CREATE INDEX IF NOT EXISTS idx_data_points_created_at ON data_points(created_at);
CREATE INDEX IF NOT EXISTS idx_data_points_user_variable ON data_points(user_id, variable_id);

-- ============================================================================
-- STEP 6: Enable Row Level Security
-- ============================================================================

ALTER TABLE data_points ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can insert their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can update their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can delete their own data points" ON data_points;

-- Create RLS policies
CREATE POLICY "Users can view their own data points" 
ON data_points FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data points" 
ON data_points FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data points" 
ON data_points FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data points" 
ON data_points FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 7: Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON data_points TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_points TO anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check foreign key constraints
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'data_points';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'data_points';

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'data_points' 
ORDER BY ordinal_position; 