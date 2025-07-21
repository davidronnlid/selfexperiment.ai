-- ============================================================================
-- ENABLE RLS ON CRON_JOB_LOGS TABLE
-- ============================================================================
-- The cron_job_logs table is a system-level table for monitoring cron job execution.
-- It should only be accessible by service roles and system functions, not regular users.

-- Enable Row Level Security
ALTER TABLE cron_job_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR CRON_JOB_LOGS
-- ============================================================================

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage cron job logs" ON cron_job_logs;
DROP POLICY IF EXISTS "Service role can view cron job logs" ON cron_job_logs;
DROP POLICY IF EXISTS "Service role can insert cron job logs" ON cron_job_logs;
DROP POLICY IF EXISTS "Service role can update cron job logs" ON cron_job_logs;
DROP POLICY IF EXISTS "Service role can delete cron job logs" ON cron_job_logs;

-- Allow service role full access to cron job logs
CREATE POLICY "Service role can manage cron job logs" ON cron_job_logs
    FOR ALL TO service_role USING (true);

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions to service role
GRANT SELECT, INSERT, UPDATE, DELETE ON cron_job_logs TO service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'cron_job_logs' 
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
WHERE tablename = 'cron_job_logs' 
AND schemaname = 'public';

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cron_job_logs IS 'System table for logging cron job execution. Access restricted to service role only.'; 