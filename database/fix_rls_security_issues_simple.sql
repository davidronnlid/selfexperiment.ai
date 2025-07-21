-- ============================================================================
-- FIX RLS SECURITY ISSUES - SIMPLIFIED VERSION
-- ============================================================================
-- This is a simplified version that avoids PostgreSQL version compatibility issues

-- 1. Fix cron_job_logs table
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage cron job logs" ON cron_job_logs;

CREATE POLICY "Service role can manage cron job logs" ON cron_job_logs
    FOR ALL TO service_role USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON cron_job_logs TO service_role;

-- 2. Fix variable_units table  
ALTER TABLE variable_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;
DROP POLICY IF EXISTS "Variable units can be managed by authenticated users" ON variable_units;

CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert variable units" ON variable_units
    FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service role can update variable units" ON variable_units
    FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service role can delete variable units" ON variable_units
    FOR DELETE TO service_role USING (true);

GRANT SELECT ON variable_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON variable_units TO service_role;

-- 3. Simple verification (no version-specific columns)
SELECT 'RLS Fix Applied Successfully!' as status;

-- Check tables exist and have RLS enabled
SELECT 
    t.tablename,
    CASE WHEN t.rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
FROM pg_tables t
WHERE t.tablename IN ('cron_job_logs', 'variable_units')
AND t.schemaname = 'public'
ORDER BY t.tablename; 