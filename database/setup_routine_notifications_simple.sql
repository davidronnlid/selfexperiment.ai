-- ============================================================================
-- SIMPLIFIED ROUTINE NOTIFICATIONS CRON SETUP
-- ============================================================================
-- This addresses common cron setup issues step by step

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Step 2: Check if extensions are enabled
SELECT extname, extversion FROM pg_extension WHERE extname IN ('pg_cron', 'http');

-- Step 3: Remove any existing cron jobs (this might fail if they don't exist - that's OK)
DO $$
BEGIN
    PERFORM cron.unschedule('routine-notifications-scheduler');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Job routine-notifications-scheduler did not exist, continuing...';
END $$;

-- Step 4: Test if the Edge Function is accessible
SELECT net.http_post(
    url := 'https://ecstnwwcplbofbwbhbck.supabase.co/functions/v1/routine-notifications-scheduler',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
) as test_request;

-- Step 5: Create a simple cron job that runs every 15 minutes (for testing)
-- Note: Using a simpler schedule format that's more compatible
SELECT cron.schedule(
    'routine-notifications-scheduler',
    '*/15 * * * *', -- Every 15 minutes (simpler format)
    'SELECT net.http_post(url := ''https://ecstnwwcplbofbwbhbck.supabase.co/functions/v1/routine-notifications-scheduler'', headers := ''{}'', body := ''{}'');'
);

-- Step 6: Check if the cron job was created
SELECT jobname, schedule, active, command 
FROM cron.job 
WHERE jobname = 'routine-notifications-scheduler';

-- Step 7: Create helper function to check cron status
CREATE OR REPLACE FUNCTION get_routine_cron_status()
RETURNS TABLE(
    jobname TEXT,
    schedule TEXT,
    active BOOLEAN,
    last_run TIMESTAMP WITH TIME ZONE,
    next_run TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.jobname,
        cj.schedule,
        cj.active,
        cj.last_run,
        cj.next_run
    FROM cron.job cj
    WHERE cj.jobname = 'routine-notifications-scheduler';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Final status check
SELECT 'Setup completed! Check status with: SELECT * FROM get_routine_cron_status();' as result;

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- Check if pg_cron is working
-- SELECT cron.schedule('test-job', '* * * * *', 'SELECT 1;');
-- SELECT * FROM cron.job WHERE jobname = 'test-job';
-- SELECT cron.unschedule('test-job');

-- Check Edge Function manually
-- SELECT net.http_post(
--     url := 'https://ecstnwwcplbofbwbhbck.supabase.co/functions/v1/routine-notifications-scheduler',
--     headers := '{"Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
-- ); 