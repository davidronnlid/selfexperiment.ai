-- ============================================================================
-- CREATE VARIABLES TABLE AND ADD FOREIGN KEY CONSTRAINTS (FIXED)
-- ============================================================================
-- This migration creates the missing variables table and adds foreign key
-- constraints, handling type mismatches properly
-- ============================================================================

-- ============================================================================
-- STEP 1: Create variables table
-- ============================================================================

CREATE TABLE IF NOT EXISTS variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category TEXT,
    data_type TEXT DEFAULT 'numeric',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT variables_slug_check CHECK (slug ~ '^[a-z0-9_]+$')
);

-- ============================================================================
-- STEP 2: Add foreign key constraints now that variables table exists
-- ============================================================================

-- Add foreign key from data_points to variables
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
        RAISE NOTICE 'Added foreign key constraint from data_points to variables';
    END IF;
END $$;

-- Add foreign key from user_variable_preferences to variables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_variable_preferences_variable_id_fkey'
        AND table_name = 'user_variable_preferences'
    ) THEN
        ALTER TABLE user_variable_preferences 
        ADD CONSTRAINT user_variable_preferences_variable_id_fkey 
        FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint from user_variable_preferences to variables';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Enable RLS and create policies for variables table
-- ============================================================================

-- Enable RLS on variables table
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for variables (publicly readable)
CREATE POLICY "Variables are publicly readable" ON variables
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage variables" ON variables
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- ============================================================================
-- STEP 4: Create indexes for variables table
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_variables_slug ON variables(slug);
CREATE INDEX IF NOT EXISTS idx_variables_category ON variables(category);
CREATE INDEX IF NOT EXISTS idx_variables_is_active ON variables(is_active);
CREATE INDEX IF NOT EXISTS idx_variables_created_by ON variables(created_by);

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON variables TO authenticated;
-- Grant read access to anonymous users for variables
GRANT SELECT ON variables TO anon;

-- ============================================================================
-- STEP 6: Handle existing data tables with variable_id columns
-- ============================================================================

-- Add foreign key constraints to other data tables if they exist and have compatible types
-- oura_variable_data_points
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'oura_variable_data_points') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'oura_variable_data_points_variable_id_fkey'
            AND table_name = 'oura_variable_data_points'
        ) THEN
            -- Check if variable_id column is UUID type
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'oura_variable_data_points' 
                AND column_name = 'variable_id' 
                AND data_type = 'uuid'
            ) THEN
                ALTER TABLE oura_variable_data_points 
                ADD CONSTRAINT oura_variable_data_points_variable_id_fkey 
                FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint from oura_variable_data_points to variables';
            ELSE
                RAISE NOTICE 'oura_variable_data_points.variable_id is not UUID type, skipping foreign key constraint';
            END IF;
        END IF;
    END IF;
END $$;

-- withings_variable_data_points
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withings_variable_data_points') THEN
        -- Add variable_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'withings_variable_data_points' AND column_name = 'variable_id'
        ) THEN
            ALTER TABLE withings_variable_data_points 
            ADD COLUMN variable_id UUID;
            RAISE NOTICE 'Added variable_id column to withings_variable_data_points table';
        END IF;

        -- Add foreign key constraint if it doesn't exist and column is UUID type
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'withings_variable_data_points_variable_id_fkey'
            AND table_name = 'withings_variable_data_points'
        ) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'withings_variable_data_points' 
                AND column_name = 'variable_id' 
                AND data_type = 'uuid'
            ) THEN
                ALTER TABLE withings_variable_data_points 
                ADD CONSTRAINT withings_variable_data_points_variable_id_fkey 
                FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint from withings_variable_data_points to variables';
            ELSE
                RAISE NOTICE 'withings_variable_data_points.variable_id is not UUID type, skipping foreign key constraint';
            END IF;
        END IF;
    END IF;
END $$;

-- apple_health_variable_data_points (special handling for type mismatch)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'apple_health_variable_data_points') THEN
        -- Check if variable_id is TEXT type (incompatible with UUID)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'apple_health_variable_data_points' 
            AND column_name = 'variable_id' 
            AND data_type = 'text'
        ) THEN
            RAISE NOTICE 'apple_health_variable_data_points.variable_id is TEXT type, cannot create foreign key to UUID variables.id';
            RAISE NOTICE 'Consider creating a separate mapping table or converting the column type';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'apple_health_variable_data_points' 
            AND column_name = 'variable_id' 
            AND data_type = 'uuid'
        ) THEN
            -- If it's UUID type, add the foreign key constraint
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'apple_health_variable_data_points_variable_id_fkey'
                AND table_name = 'apple_health_variable_data_points'
            ) THEN
                ALTER TABLE apple_health_variable_data_points 
                ADD CONSTRAINT apple_health_variable_data_points_variable_id_fkey 
                FOREIGN KEY (variable_id) REFERENCES variables(id) ON DELETE CASCADE;
                RAISE NOTICE 'Added foreign key constraint from apple_health_variable_data_points to variables';
            END IF;
        ELSE
            RAISE NOTICE 'apple_health_variable_data_points.variable_id column not found or unknown type';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Variables table created successfully!';
    RAISE NOTICE 'Foreign key constraints added where compatible types exist';
    RAISE NOTICE 'RLS enabled with public read access and authenticated write access';
    RAISE NOTICE 'Type compatibility checked for all data tables';
END $$;
