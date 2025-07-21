-- ============================================================================
-- REVIEW AND FIX RLS POLICIES ON VARIABLE_UNITS TABLE
-- ============================================================================
-- The variable_units table currently allows all authenticated users to manage it,
-- which may be too permissive. This script tightens the security while maintaining
-- necessary functionality.

-- Enable Row Level Security (should already be enabled, but ensure it)
ALTER TABLE variable_units ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES AND CREATE MORE RESTRICTIVE ONES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;
DROP POLICY IF EXISTS "Variable units can be managed by authenticated users" ON variable_units;

-- ============================================================================
-- NEW RESTRICTIVE POLICIES
-- ============================================================================

-- 1. Allow all authenticated users to READ variable_units
--    (Users need to see available units for variables)
CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Only allow service role to INSERT new variable-unit relationships
--    (System management of variable units should be controlled)
CREATE POLICY "Service role can insert variable units" ON variable_units
    FOR INSERT TO service_role WITH CHECK (true);

-- 3. Only allow service role to UPDATE variable-unit relationships
CREATE POLICY "Service role can update variable units" ON variable_units
    FOR UPDATE TO service_role USING (true);

-- 4. Only allow service role to DELETE variable-unit relationships
CREATE POLICY "Service role can delete variable units" ON variable_units
    FOR DELETE TO service_role USING (true);

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

-- Grant read permissions to authenticated users
GRANT SELECT ON variable_units TO authenticated;

-- Grant full permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON variable_units TO service_role;

-- ============================================================================
-- ALTERNATIVE: ALLOW AUTHENTICATED USERS TO MANAGE (LESS RESTRICTIVE)
-- ============================================================================
-- If you need to allow authenticated users to manage variable_units
-- (e.g., for admin functionality), uncomment these policies instead:

-- CREATE POLICY "Authenticated users can insert variable units" ON variable_units
--     FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can update variable units" ON variable_units
--     FOR UPDATE USING (auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can delete variable units" ON variable_units
--     FOR DELETE USING (auth.role() = 'authenticated');

-- GRANT INSERT, UPDATE, DELETE ON variable_units TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'variable_units' 
AND schemaname = 'public';

-- List policies on the table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'variable_units' 
AND schemaname = 'public';

-- Test table access (should work for SELECT)
SELECT COUNT(*) as total_variable_units FROM variable_units;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE variable_units IS 'Many-to-many relationship between variables and units. Read access for all authenticated users, write access restricted to service role.';

-- ============================================================================
-- NOTES
-- ============================================================================
/*
SECURITY CONSIDERATIONS:

1. READ ACCESS: All authenticated users need to read variable_units to:
   - See available units for variables
   - Build unit selection interfaces
   - Perform unit conversions

2. WRITE ACCESS: Restricted to service role to:
   - Prevent unauthorized modifications to variable-unit relationships
   - Maintain data integrity
   - Ensure consistent unit configurations

3. IF YOU NEED USER WRITE ACCESS:
   - Uncomment the alternative policies above
   - Consider adding role-based restrictions
   - Implement application-level validation

4. TESTING:
   - Verify users can read variable_units
   - Verify users cannot write to variable_units (if using restrictive policies)
   - Verify service role can perform all operations
*/ 