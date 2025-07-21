-- ============================================================================
-- FIX RLS SECURITY ISSUES
-- ============================================================================
-- This script addresses the following Supabase database linter errors:
-- 1. RLS disabled on public.cron_job_logs
-- 2. RLS disabled on public.variable_units
--
-- Run this script in your Supabase SQL Editor to enable RLS with appropriate policies.

-- ============================================================================
-- 1. FIX CRON_JOB_LOGS TABLE
-- ============================================================================

-- Enable Row Level Security on cron_job_logs
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage cron job logs" ON cron_job_logs;

-- Allow service role full access to cron job logs
-- (This is a system table for monitoring cron job execution)
CREATE POLICY "Service role can manage cron job logs" ON cron_job_logs
    FOR ALL TO service_role USING (true);

-- Grant necessary permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON cron_job_logs TO service_role;

-- ============================================================================
-- 2. FIX VARIABLE_UNITS TABLE
-- ============================================================================

-- Enable Row Level Security on variable_units (should already be enabled, but ensure it)
ALTER TABLE variable_units ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and create more restrictive ones
DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;
DROP POLICY IF EXISTS "Variable units can be managed by authenticated users" ON variable_units;

-- Allow all authenticated users to READ variable_units
-- (Users need to see available units for variables)
CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT USING (auth.role() = 'authenticated');

-- Restrict WRITE operations to service role only
-- (Prevents unauthorized modifications to variable-unit relationships)
CREATE POLICY "Service role can insert variable units" ON variable_units
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update variable units" ON variable_units
    FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can delete variable units" ON variable_units
    FOR DELETE TO service_role USING (true);

-- Grant appropriate permissions
GRANT SELECT ON variable_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON variable_units TO service_role;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled on both tables
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('cron_job_logs', 'variable_units')
AND schemaname = 'public'
ORDER BY tablename;

-- List all policies on these tables
SELECT 
    tablename,
    policyname,
    roles,
    cmd as operation
FROM pg_policies 
WHERE tablename IN ('cron_job_logs', 'variable_units')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Test variable_units access (should work for authenticated users)
SELECT COUNT(*) as total_variable_units FROM variable_units;

-- ============================================================================
-- ALTERNATIVE CONFIGURATION FOR VARIABLE_UNITS
-- ============================================================================
-- If your application requires authenticated users to manage variable_units
-- (e.g., for admin functionality), uncomment and run these statements instead:

-- DROP POLICY IF EXISTS "Service role can insert variable units" ON variable_units;
-- DROP POLICY IF EXISTS "Service role can update variable units" ON variable_units;
-- DROP POLICY IF EXISTS "Service role can delete variable units" ON variable_units;

-- CREATE POLICY "Authenticated users can manage variable units" ON variable_units
--     FOR ALL USING (auth.role() = 'authenticated');

-- GRANT INSERT, UPDATE, DELETE ON variable_units TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cron_job_logs IS 'System table for logging cron job execution. Access restricted to service role only.';
COMMENT ON TABLE variable_units IS 'Many-to-many relationship between variables and units. Read access for all authenticated users, write access restricted to service role.';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ RLS security issues have been resolved!' as result,
       '🔒 cron_job_logs: Service role access only' as cron_job_logs_status,
       '🔒 variable_units: Read for authenticated, write for service role' as variable_units_status; 