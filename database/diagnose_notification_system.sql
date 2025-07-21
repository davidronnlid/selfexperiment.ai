-- ============================================================================
-- NOTIFICATION SYSTEM COMPREHENSIVE DIAGNOSTICS
-- ============================================================================
-- This script diagnoses all aspects of the notification system to identify issues

-- ============================================================================
-- STEP 1: CHECK EXTENSIONS AND BASIC SETUP
-- ============================================================================

SELECT '=== CHECKING EXTENSIONS ===' as step;

-- Check if required extensions are enabled
SELECT 
    extname,
    extversion,
    CASE 
        WHEN extname = 'pg_cron' THEN '✅ pg_cron enabled - cron jobs supported'
        WHEN extname = 'http' THEN '✅ HTTP extension enabled - web requests supported'
        ELSE '✅ Extension enabled'
    END as status
FROM pg_extension 
WHERE extname IN ('pg_cron', 'http')
ORDER BY extname;

-- If extensions are missing, show what needs to be enabled
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
            '❌ MISSING: pg_cron - Run: CREATE EXTENSION IF NOT EXISTS pg_cron;'
        WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN  
            '❌ MISSING: http - Run: CREATE EXTENSION IF NOT EXISTS http;'
        ELSE '✅ All required extensions are enabled'
    END as extension_status;

-- ============================================================================
-- STEP 2: CHECK CRON JOBS STATUS
-- ============================================================================

SELECT '=== CHECKING CRON JOBS ===' as step;

-- Check if any routine notification cron jobs exist
SELECT 
    jobname,
    schedule,
    active,
    last_run,
    next_run,
    CASE 
        WHEN active THEN '✅ Active'
        ELSE '❌ Inactive'
    END as status,
    CASE 
        WHEN last_run IS NULL THEN '⚠️ Never run'
        WHEN last_run < NOW() - INTERVAL '1 hour' THEN '⚠️ Last run > 1 hour ago'
        ELSE '✅ Recently executed'
    END as execution_status
FROM cron.job 
WHERE jobname LIKE '%routine%' OR jobname LIKE '%notification%'
ORDER BY jobname;

-- If no cron jobs found
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%routine%') THEN
            '❌ NO CRON JOBS FOUND - Need to run setup_routine_notifications_cron_ready.sql'
        ELSE '✅ Cron jobs configured'
    END as cron_status;

-- ============================================================================
-- STEP 3: CHECK NOTIFICATION TABLES
-- ============================================================================

SELECT '=== CHECKING DATABASE TABLES ===' as step;

-- Check if notification_preferences table exists and has data
SELECT 
    'notification_preferences' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') 
        THEN (SELECT COUNT(*)::text || ' users' FROM notification_preferences)
        ELSE 'N/A'
    END as record_count;

-- Check notification_history table
SELECT 
    'notification_history' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_history') 
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_history') 
        THEN (SELECT COUNT(*)::text || ' notifications' FROM notification_history)
        ELSE 'N/A'
    END as record_count;

-- Check push_subscriptions table
SELECT 
    'push_subscriptions' as table_name,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') 
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') 
        THEN (SELECT COUNT(*)::text || ' subscriptions' FROM push_subscriptions WHERE is_active = true)
        ELSE 'N/A'
    END as record_count;

-- ============================================================================
-- STEP 4: CHECK USER NOTIFICATION SETTINGS
-- ============================================================================

SELECT '=== CHECKING USER NOTIFICATION SETTINGS ===' as step;

-- Show users with routine reminders enabled (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
        -- Show enabled users
        RAISE NOTICE 'Users with routine reminders enabled:';
        FOR rec IN 
            SELECT 
                user_id,
                routine_reminder_enabled,
                routine_reminder_minutes,
                routine_notification_timing,
                created_at
            FROM notification_preferences 
            WHERE routine_reminder_enabled = true
            LIMIT 10
        LOOP
            RAISE NOTICE 'User: %, Minutes: %, Timing: %, Created: %', 
                rec.user_id, rec.routine_reminder_minutes, rec.routine_notification_timing, rec.created_at;
        END LOOP;
    ELSE
        RAISE NOTICE 'notification_preferences table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: CHECK PUSH SUBSCRIPTIONS
-- ============================================================================

SELECT '=== CHECKING PUSH SUBSCRIPTIONS ===' as step;

-- Show active push subscriptions (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
        RAISE NOTICE 'Active push subscriptions by platform:';
        FOR rec IN 
            SELECT 
                platform,
                browser,
                COUNT(*) as count,
                MAX(created_at) as latest_subscription
            FROM push_subscriptions 
            WHERE is_active = true
            GROUP BY platform, browser
            ORDER BY count DESC
        LOOP
            RAISE NOTICE 'Platform: %, Browser: %, Count: %, Latest: %', 
                rec.platform, rec.browser, rec.count, rec.latest_subscription;
        END LOOP;
    ELSE
        RAISE NOTICE 'push_subscriptions table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: CHECK RECENT NOTIFICATION HISTORY
-- ============================================================================

SELECT '=== CHECKING RECENT NOTIFICATION HISTORY ===' as step;

-- Show recent notifications (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_history') THEN
        RAISE NOTICE 'Recent notifications in last 24 hours:';
        FOR rec IN 
            SELECT 
                notification_type,
                title,
                delivery_status,
                sent_at,
                user_id
            FROM notification_history 
            WHERE sent_at > NOW() - INTERVAL '24 hours'
            ORDER BY sent_at DESC
            LIMIT 10
        LOOP
            RAISE NOTICE 'Type: %, Title: %, Status: %, Sent: %, User: %', 
                rec.notification_type, rec.title, rec.delivery_status, rec.sent_at, rec.user_id;
        END LOOP;
        
        -- Count by status
        RAISE NOTICE 'Notification delivery summary (last 7 days):';
        FOR rec IN 
            SELECT 
                delivery_status,
                COUNT(*) as count
            FROM notification_history 
            WHERE sent_at > NOW() - INTERVAL '7 days'
            GROUP BY delivery_status
            ORDER BY count DESC
        LOOP
            RAISE NOTICE 'Status: %, Count: %', rec.delivery_status, rec.count;
        END LOOP;
    ELSE
        RAISE NOTICE 'notification_history table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: CHECK ROUTINES DATA
-- ============================================================================

SELECT '=== CHECKING ROUTINES DATA ===' as step;

-- Check if routines table exists and has data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'routines') THEN
        RAISE NOTICE 'Routines summary:';
        FOR rec IN 
            SELECT 
                is_active,
                COUNT(*) as count
            FROM routines
            GROUP BY is_active
            ORDER BY is_active DESC
        LOOP
            RAISE NOTICE 'Active: %, Count: %', rec.is_active, rec.count;
        END LOOP;
        
        -- Show recent routines
        RAISE NOTICE 'Recent routines:';
        FOR rec IN 
            SELECT 
                routine_name,
                time,
                is_active,
                user_id,
                created_at
            FROM routines 
            WHERE is_active = true
            ORDER BY created_at DESC
            LIMIT 5
        LOOP
            RAISE NOTICE 'Name: %, Time: %, User: %, Created: %', 
                rec.routine_name, rec.time, rec.user_id, rec.created_at;
        END LOOP;
    ELSE
        RAISE NOTICE 'routines table does not exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: TEST NETWORK CONNECTIVITY
-- ============================================================================

SELECT '=== TESTING NETWORK CONNECTIVITY ===' as step;

-- Test if Edge Function URL is accessible (replace with actual project ref)
SELECT 
    '❌ Cannot test Edge Function - replace EXAMPLE_PROJECT_REF with actual project reference' as network_test
WHERE 'EXAMPLE_PROJECT_REF' = 'EXAMPLE_PROJECT_REF';

-- ============================================================================
-- STEP 9: SHOW DIAGNOSTIC SUMMARY
-- ============================================================================

SELECT '=== DIAGNOSTIC SUMMARY ===' as step;

SELECT 
    'Extensions' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AND
             EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') 
        THEN '✅ OK'
        ELSE '❌ MISSING'
    END as status,
    'Required: pg_cron, http' as details

UNION ALL

SELECT 
    'Cron Jobs' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%routine%' AND active = true) 
        THEN '✅ OK'
        ELSE '❌ NOT CONFIGURED'
    END as status,
    'Need: routine-notifications-scheduler' as details

UNION ALL

SELECT 
    'Database Tables' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') AND
             EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') 
        THEN '✅ OK'
        ELSE '❌ MISSING TABLES'
    END as status,
    'Need: notification_preferences, push_subscriptions' as details

UNION ALL

SELECT 
    'User Settings' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') AND
             EXISTS (SELECT 1 FROM notification_preferences WHERE routine_reminder_enabled = true) 
        THEN '✅ OK'
        ELSE '❌ NO USERS ENABLED'
    END as status,
    'Need: Users with routine_reminder_enabled = true' as details

UNION ALL

SELECT 
    'Push Subscriptions' as component,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_subscriptions') AND
             EXISTS (SELECT 1 FROM push_subscriptions WHERE is_active = true) 
        THEN '✅ OK'
        ELSE '❌ NO ACTIVE SUBSCRIPTIONS'
    END as status,
    'Need: Active push subscriptions for users' as details

ORDER BY 
    CASE status 
        WHEN '❌ MISSING' THEN 1
        WHEN '❌ NOT CONFIGURED' THEN 2
        WHEN '❌ MISSING TABLES' THEN 3
        WHEN '❌ NO USERS ENABLED' THEN 4
        WHEN '❌ NO ACTIVE SUBSCRIPTIONS' THEN 5
        ELSE 6
    END;

-- ============================================================================
-- STEP 10: NEXT STEPS RECOMMENDATIONS
-- ============================================================================

SELECT '=== NEXT STEPS TO FIX ISSUES ===' as step;

-- Show what needs to be done based on findings
SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
            '1. Enable pg_cron: CREATE EXTENSION IF NOT EXISTS pg_cron;'
        WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%routine%') THEN
            '2. Setup cron job: Run database/setup_routine_notifications_cron_ready.sql'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_preferences') THEN
            '3. Create tables: Run database/setup_notification_preferences_table.sql'
        WHEN NOT EXISTS (SELECT 1 FROM notification_preferences WHERE routine_reminder_enabled = true) THEN
            '4. Enable notifications: Set routine_reminder_enabled = true for users'
        WHEN NOT EXISTS (SELECT 1 FROM push_subscriptions WHERE is_active = true) THEN
            '5. Get push subscriptions: Users need to subscribe to push notifications'
        ELSE '6. Check Edge Function deployment and VAPID keys configuration'
    END as next_step;

SELECT 'Run this diagnostic again after each fix to check progress' as note; 