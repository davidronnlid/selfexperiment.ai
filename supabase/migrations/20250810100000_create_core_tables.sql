-- ============================================================================
-- CREATE CORE TABLES FIRST
-- ============================================================================
-- This migration creates the essential tables that other migrations depend on
-- ============================================================================

-- ============================================================================
-- STEP 1: Create variables table (required by many other tables)
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
-- STEP 2: Create data_points table
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Core data fields
    value TEXT NOT NULL,
    notes TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Confirmation for auto-tracked data
    confirmed BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT data_points_value_check CHECK (value IS NOT NULL AND value != ''),
    CONSTRAINT data_points_user_id_check CHECK (user_id IS NOT NULL)
);

-- ============================================================================
-- STEP 3: Enable RLS with basic policies
-- ============================================================================

-- Enable RLS
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_points ENABLE ROW LEVEL SECURITY;

-- Basic policies for variables (publicly readable)
CREATE POLICY "Variables are publicly readable" ON variables
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage variables" ON variables
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- Basic policies for data_points (user-owned)
CREATE POLICY "Users can manage their own data points" ON data_points
    FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- STEP 4: Create essential indexes
-- ============================================================================

-- Indexes for variables
CREATE INDEX IF NOT EXISTS idx_variables_slug ON variables(slug);
CREATE INDEX IF NOT EXISTS idx_variables_category ON variables(category);
CREATE INDEX IF NOT EXISTS idx_variables_is_active ON variables(is_active);

-- Indexes for data_points
CREATE INDEX IF NOT EXISTS idx_data_points_user_id ON data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_data_points_variable_id ON data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_data_points_date ON data_points(date);
CREATE INDEX IF NOT EXISTS idx_data_points_user_variable ON data_points(user_id, variable_id);

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON variables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_points TO authenticated;

-- Grant read access to anonymous users for variables
GRANT SELECT ON variables TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Core tables created successfully: variables, data_points';
    RAISE NOTICE 'RLS enabled with optimized auth function calls';
    RAISE NOTICE 'Essential indexes and permissions granted';
END $$;
