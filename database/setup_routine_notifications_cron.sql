-- ============================================================================
-- ROUTINE NOTIFICATIONS CRON SETUP
-- ============================================================================
-- This sets up automated routine notifications using Supabase pg_cron
-- The Edge Function will be called every 10 minutes during active hours

-- Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- CRON JOB CONFIGURATION
-- ============================================================================

-- Remove any existing cron jobs for routine notifications
SELECT cron.unschedule('routine-notifications-scheduler');

-- Schedule the routine notifications function to run every 10 minutes during active hours
-- This runs from 6 AM to 11 PM (18:00-23:00) to avoid night-time notifications
SELECT cron.schedule(
    'routine-notifications-scheduler',
    '*/10 6-23 * * *', -- Every 10 minutes from 6 AM to 11 PM
    $$
    SELECT
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
      ) as request_id;
    $$
);

-- ============================================================================
-- ALTERNATIVE: More frequent checking during peak hours
-- ============================================================================

-- Uncomment this section if you want more frequent checks during peak times
-- This checks every 5 minutes during morning (7-10 AM) and evening (5-9 PM) hours

/*
-- Morning routine notifications (every 5 minutes from 7-10 AM)
SELECT cron.schedule(
    'routine-notifications-morning',
    '*/5 7-10 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
      ) as request_id;
    $$
);

-- Evening routine notifications (every 5 minutes from 5-9 PM)  
SELECT cron.schedule(
    'routine-notifications-evening',
    '*/5 17-21 * * *',
    $$
    SELECT
      net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
      ) as request_id;
    $$
);
*/

-- ============================================================================
-- MONITORING AND LOGGING
-- ============================================================================

-- Create a table to track cron job execution (optional)
CREATE TABLE IF NOT EXISTS cron_job_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_name TEXT NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT CHECK (status IN ('success', 'error')),
    details JSONB,
    execution_time_ms INTEGER
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check cron job status
CREATE OR REPLACE FUNCTION get_cron_job_status()
RETURNS TABLE(
    jobname TEXT,
    schedule TEXT,
    active BOOLEAN,
    last_run TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cj.jobname,
        cj.schedule,
        cj.active,
        cj.last_run
    FROM cron.job cj
    WHERE cj.jobname LIKE '%routine-notifications%'
    ORDER BY cj.jobname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to manually trigger the routine notifications
CREATE OR REPLACE FUNCTION trigger_routine_notifications()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/routine-notifications-scheduler',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
        body := '{}'::jsonb
    ) INTO result;
    
    -- Log the manual trigger
    INSERT INTO cron_job_logs (job_name, status, details)
    VALUES ('routine-notifications-manual', 'success', result);
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- View all scheduled cron jobs
SELECT jobname, schedule, active, last_run, next_run 
FROM cron.job 
WHERE jobname LIKE '%routine%'
ORDER BY jobname;

-- Test the manual trigger function
-- SELECT trigger_routine_notifications();

-- Check cron job execution history (if using cron_job_logs table)
-- SELECT * FROM cron_job_logs ORDER BY executed_at DESC LIMIT 10;

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

/*
SETUP INSTRUCTIONS:

1. Replace YOUR_PROJECT_REF with your actual Supabase project reference
   Example: https://abcdefghijklmnop.supabase.co/functions/v1/routine-notifications-scheduler

2. Make sure the service role key is properly configured:
   ALTER DATABASE postgres SET "app.settings.service_role_key" TO 'your-service-role-key';

3. Deploy the Edge Function first:
   supabase functions deploy routine-notifications-scheduler

4. Set the environment variables in Supabase:
   - VAPID_PUBLIC_KEY
   - VAPID_PRIVATE_KEY  
   - VAPID_SUBJECT

5. Test the setup:
   - Manual test: SELECT trigger_routine_notifications();
   - Check logs in Supabase dashboard
   - Monitor notification_history table

CRON SCHEDULE EXPLANATION:
- '*/10 6-23 * * *' = Every 10 minutes from 6 AM to 11 PM
- '*/5 7-10 * * *' = Every 5 minutes from 7 AM to 10 AM
- '0 */1 * * *' = Every hour on the hour
- '0 8,12,17,21 * * *' = At 8 AM, 12 PM, 5 PM, and 9 PM

TIMEZONE CONSIDERATIONS:
- Cron runs in UTC time
- User routine times should be stored with timezone info
- Consider user's timezone when scheduling notifications

MONITORING:
- Check Edge Function logs in Supabase dashboard
- Monitor notification_history table for delivery status
- Use cron_job_logs table for cron execution tracking
*/

SELECT '✅ Routine notifications cron setup completed!' as result; 