-- ============================================================================
-- FIX RLS ON VARIABLE_UNITS TABLE - WORKING VERSION
-- ============================================================================

-- Enable Row Level Security
ALTER TABLE variable_units ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;
DROP POLICY IF EXISTS "Variable units can be managed by authenticated users" ON variable_units;

-- Create restrictive policies
-- 1. Allow all authenticated users to READ variable_units
CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Only allow service role to INSERT/UPDATE/DELETE
CREATE POLICY "Service role can insert variable units" ON variable_units
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update variable units" ON variable_units
    FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can delete variable units" ON variable_units
    FOR DELETE TO service_role USING (true);

-- Grant permissions
GRANT SELECT ON variable_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON variable_units TO service_role;

-- Simple verification that works on all PostgreSQL versions
SELECT 'Variable Units RLS Fix Applied Successfully!' as status;

-- Test table access (should work)
SELECT COUNT(*) as total_variable_units FROM variable_units;

-- Show RLS status (safe query)
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
FROM pg_tables 
WHERE tablename = 'variable_units' 
AND schemaname = 'public'; 