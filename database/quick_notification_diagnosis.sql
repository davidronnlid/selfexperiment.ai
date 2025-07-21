-- ============================================================================
-- QUICK NOTIFICATION SYSTEM DIAGNOSIS
-- ============================================================================
-- Run this to quickly identify why notifications aren't working

-- Check 1: Are extensions enabled?
SELECT 'EXTENSIONS CHECK' as check_type,
       CASE WHEN COUNT(*) = 2 THEN '✅ Extensions OK' 
            ELSE '❌ Missing extensions' END as status
FROM pg_extension WHERE extname IN ('pg_cron', 'http');

-- Check 2: Are cron jobs set up?
SELECT 'CRON JOBS CHECK' as check_type,
       CASE WHEN COUNT(*) > 0 THEN '✅ Cron jobs configured' 
            ELSE '❌ No cron jobs found' END as status
FROM cron.job WHERE jobname LIKE '%routine%';

-- Check 3: Do notification tables exist?
SELECT 'TABLES CHECK' as check_type,
       CASE WHEN COUNT(*) = 3 THEN '✅ All tables exist' 
            ELSE '❌ Missing tables' END as status
FROM information_schema.tables 
WHERE table_name IN ('notification_preferences', 'push_subscriptions', 'notification_history');

-- Check 4: Are users enabled for notifications?
SELECT 'USER SETTINGS CHECK' as check_type,
       CASE WHEN COUNT(*) > 0 THEN '✅ Users have notifications enabled' 
            ELSE '❌ No users enabled for notifications' END as status
FROM notification_preferences WHERE routine_reminder_enabled = true;

-- Check 5: Do users have push subscriptions?
SELECT 'PUSH SUBSCRIPTIONS CHECK' as check_type,
       CASE WHEN COUNT(*) > 0 THEN '✅ Active push subscriptions exist' 
            ELSE '❌ No active push subscriptions' END as status
FROM push_subscriptions WHERE is_active = true;

-- Show specific user's settings (replace with actual user ID)
SELECT 'YOUR SETTINGS' as info_type,
       routine_reminder_enabled,
       routine_reminder_minutes,
       routine_notification_timing
FROM notification_preferences 
WHERE user_id = auth.uid()
LIMIT 1;

-- Show your push subscriptions
SELECT 'YOUR PUSH SUBSCRIPTIONS' as info_type,
       platform,
       browser,
       is_active,
       created_at
FROM push_subscriptions 
WHERE user_id = auth.uid();

-- Show recent notification attempts
SELECT 'RECENT NOTIFICATIONS' as info_type,
       notification_type,
       title,
       delivery_status,
       sent_at
FROM notification_history 
WHERE user_id = auth.uid()
ORDER BY sent_at DESC
LIMIT 5;

-- Show cron job details
SELECT 'CRON JOB STATUS' as info_type,
       jobname,
       active,
       last_run,
       next_run
FROM cron.job 
WHERE jobname LIKE '%routine%';

-- Quick fix suggestions
SELECT 'QUICK FIXES' as fix_type,
       'If no cron jobs: Run setup_routine_notifications_cron_ready.sql' as suggestion
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%routine%')
UNION ALL
SELECT 'QUICK FIXES' as fix_type,
       'If no push subscriptions: Enable notifications in app settings' as suggestion
WHERE NOT EXISTS (SELECT 1 FROM push_subscriptions WHERE is_active = true)
UNION ALL
SELECT 'QUICK FIXES' as fix_type,
       'If notifications disabled: Check account settings for routine reminders' as suggestion
WHERE NOT EXISTS (SELECT 1 FROM notification_preferences WHERE routine_reminder_enabled = true); 