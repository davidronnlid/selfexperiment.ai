-- ============================================================================
-- MANUAL NOTIFICATION SYSTEM TESTING
-- ============================================================================
-- Use this to manually test if your notification system is working

-- Test 1: Manual trigger of the Edge Function
-- NOTE: Replace ecstnwwcplbofbwbhbck with your actual project reference if different
SELECT 'MANUAL TRIGGER TEST' as test_type,
       net.http_post(
           url := 'https://ecstnwwcplbofbwbhbck.supabase.co/functions/v1/routine-notifications-scheduler',
           headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
           body := '{}'::jsonb
       ) as result;

-- Test 2: Create a test notification preference for current user
INSERT INTO notification_preferences (
    user_id,
    routine_reminder_enabled,
    routine_reminder_minutes,
    routine_notification_timing
) VALUES (
    auth.uid(),
    true,
    15,
    'before'
) ON CONFLICT (user_id) DO UPDATE SET
    routine_reminder_enabled = true,
    routine_reminder_minutes = 15,
    routine_notification_timing = 'before',
    updated_at = NOW();

SELECT 'NOTIFICATION PREFERENCES' as test_type,
       'Updated your notification preferences for testing' as result;

-- Test 3: Check if your settings are now enabled
SELECT 'YOUR CURRENT SETTINGS' as test_type,
       routine_reminder_enabled,
       routine_reminder_minutes,
       routine_notification_timing,
       updated_at
FROM notification_preferences 
WHERE user_id = auth.uid();

-- Test 4: Create a test routine for immediate testing
INSERT INTO routines (
    user_id,
    routine_name,
    time,
    is_active,
    description
) VALUES (
    auth.uid(),
    'Test Notification Routine',
    (CURRENT_TIME + INTERVAL '16 minutes')::TIME,
    true,
    'Temporary routine to test notifications - will trigger in 16 minutes'
) ON CONFLICT DO NOTHING;

SELECT 'TEST ROUTINE' as test_type,
       'Created test routine for ' || (CURRENT_TIME + INTERVAL '16 minutes')::TIME as result;

-- Test 5: Show when your next notification should trigger
SELECT 'NEXT NOTIFICATION TIME' as test_type,
       r.time as routine_time,
       (r.time::TIME - INTERVAL '15 minutes') as notification_time,
       'If it''s past this time and you have push subscriptions, you should get a notification' as note
FROM routines r
WHERE r.user_id = auth.uid() 
  AND r.is_active = true
  AND r.routine_name = 'Test Notification Routine'
LIMIT 1;

-- Test 6: Force create a test notification history entry
INSERT INTO notification_history (
    user_id,
    notification_type,
    title,
    body,
    delivery_status,
    context
) VALUES (
    auth.uid(),
    'test',
    'Manual Test Notification',
    'This is a test notification created manually',
    'sent',
    '{"test": true, "created_at": "' || NOW() || '"}'::jsonb
);

SELECT 'TEST NOTIFICATION LOGGED' as test_type,
       'Added test notification to history' as result;

-- Clean up test routine after showing results
DELETE FROM routines 
WHERE user_id = auth.uid() 
  AND routine_name = 'Test Notification Routine'
  AND description LIKE '%Temporary routine%';

SELECT 'CLEANUP' as test_type,
       'Removed test routine' as result; 