-- ============================================================================
-- TEST FUNCTION SEARCH PATH SECURITY FIX
-- ============================================================================
-- This script tests that the function search path security fix is working correctly.
-- Run this after executing fix_function_search_path_security.sql

-- ============================================================================
-- VERIFICATION: CHECK FUNCTION SECURITY STATUS
-- ============================================================================

SELECT 'Checking Function Security Status...' as test_phase;

-- Check that all affected functions now have proper search_path settings
SELECT 
    proname as function_name,
    CASE 
        WHEN proconfig IS NULL THEN '❌ Vulnerable (No Config)'
        WHEN 'search_path=' = ANY(proconfig) THEN '✅ Secure (search_path Set)'
        WHEN array_to_string(proconfig, ', ') LIKE '%search_path=%' THEN '✅ Secure (search_path Configured)'
        ELSE '⚠️  Other Config: ' || array_to_string(proconfig, ', ')
    END as security_status,
    proconfig as raw_config
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'update_notification_preferences_updated_at',
    'validate_routine_variable_trigger',
    'track_roadmap_edit',
    'create_simple_routine_auto_logs',
    'get_cron_job_status',
    'trigger_routine_notifications',
    'convert_unit',
    'validate_routine_variable_value',
    'get_oura_variable_id',
    'get_user_timezone',
    'create_routine_auto_logs',
    'handle_routine_override',
    'trigger_handle_routine_override',
    'toggle_routine_active',
    'handle_new_user',
    'update_updated_at_column',
    'get_user_routines',
    'create_routine',
    'update_routine',
    'delete_routine',
    'get_user_preferred_unit',
    'get_shared_variables',
    'set_user_unit_preference',
    'get_unit_display_info',
    'get_variable_units',
    'is_unit_valid_for_variable',
    'test_unit_validation_for_variable',
    'update_routine_updated_at',
    'seed_variable_units'
  )
ORDER BY 
    CASE 
        WHEN proconfig IS NULL THEN 1
        WHEN 'search_path=' = ANY(proconfig) THEN 2
        ELSE 3
    END,
    function_name;

-- ============================================================================
-- SECURITY SUMMARY
-- ============================================================================

SELECT 'Security Summary Report...' as test_phase;

-- Count functions by security status
SELECT 
    CASE 
        WHEN proconfig IS NULL THEN 'Vulnerable (No search_path)'
        WHEN 'search_path=' = ANY(proconfig) THEN 'Secure (search_path set)'
        ELSE 'Other Configuration'
    END as security_category,
    COUNT(*) as function_count
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'update_notification_preferences_updated_at',
    'validate_routine_variable_trigger',
    'track_roadmap_edit',
    'create_simple_routine_auto_logs',
    'get_cron_job_status',
    'trigger_routine_notifications',
    'convert_unit',
    'validate_routine_variable_value',
    'get_oura_variable_id',
    'get_user_timezone',
    'create_routine_auto_logs',
    'handle_routine_override',
    'trigger_handle_routine_override',
    'toggle_routine_active',
    'handle_new_user',
    'update_updated_at_column',
    'get_user_routines',
    'create_routine',
    'update_routine',
    'delete_routine',
    'get_user_preferred_unit',
    'get_shared_variables',
    'set_user_unit_preference',
    'get_unit_display_info',
    'get_variable_units',
    'is_unit_valid_for_variable',
    'test_unit_validation_for_variable',
    'update_routine_updated_at',
    'seed_variable_units'
  )
GROUP BY 
    CASE 
        WHEN proconfig IS NULL THEN 'Vulnerable (No search_path)'
        WHEN 'search_path=' = ANY(proconfig) THEN 'Secure (search_path set)'
        ELSE 'Other Configuration'
    END
ORDER BY function_count DESC;

-- ============================================================================
-- EXTENSION SECURITY CHECK
-- ============================================================================

SELECT 'Checking Extension Security...' as test_phase;

-- Check for extensions in public schema (another security warning)
SELECT 
    extname as extension_name,
    n.nspname as schema_name,
    CASE 
        WHEN n.nspname = 'public' THEN '⚠️  Security Risk: Extension in public schema'
        ELSE '✅ OK: Extension in dedicated schema'
    END as security_assessment
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname IN ('pg_net')  -- Check for pg_net specifically mentioned in warnings
ORDER BY n.nspname, extname;

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================

SELECT 'Security Recommendations...' as recommendations;

-- Check if there are still vulnerable functions
WITH vulnerable_functions AS (
    SELECT COUNT(*) as vulnerable_count
    FROM pg_proc 
    WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND proname IN (
        'update_notification_preferences_updated_at',
        'validate_routine_variable_trigger',
        'track_roadmap_edit',
        'create_simple_routine_auto_logs',
        'get_cron_job_status',
        'trigger_routine_notifications',
        'convert_unit',
        'validate_routine_variable_value',
        'get_oura_variable_id',
        'get_user_timezone',
        'create_routine_auto_logs',
        'handle_routine_override',
        'trigger_handle_routine_override',
        'toggle_routine_active',
        'handle_new_user',
        'update_updated_at_column',
        'get_user_routines',
        'create_routine',
        'update_routine',
        'delete_routine',
        'get_user_preferred_unit',
        'get_shared_variables',
        'set_user_unit_preference',
        'get_unit_display_info',
        'get_variable_units',
        'is_unit_valid_for_variable',
        'test_unit_validation_for_variable',
        'update_routine_updated_at',
        'seed_variable_units'
      )
      AND proconfig IS NULL
)
SELECT 
    CASE 
        WHEN vulnerable_count = 0 THEN '✅ All functions are now secure!'
        ELSE '⚠️  ' || vulnerable_count || ' functions still need security fixes'
    END as status,
    CASE 
        WHEN vulnerable_count = 0 THEN 'Supabase linter warnings should be resolved'
        ELSE 'Re-run the fix script or check for missing functions'
    END as action_needed
FROM vulnerable_functions;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

SELECT 'Expected Results:' as expected;
SELECT '• All functions should show "✅ Secure (search_path Set)"' as expectation_1;
SELECT '• Function count should show all functions as "Secure"' as expectation_2;
SELECT '• Supabase function security linter warnings should be resolved' as expectation_3;
SELECT '• Functions are protected against search path injection attacks' as expectation_4; 