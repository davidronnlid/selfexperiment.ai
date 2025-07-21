-- ============================================================================
-- DIAGNOSE PERSISTENT FUNCTION SECURITY ISSUES
-- ============================================================================
-- This script investigates why certain functions persist as vulnerable
-- even after multiple fix attempts.

-- ============================================================================
-- STEP 1: CHECK CURRENT FUNCTION STATUS
-- ============================================================================

SELECT 'STEP 1: Current function security status' as step;

SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as full_signature,
    p.prosrc as function_body_preview,
    CASE 
        WHEN p.proconfig IS NULL THEN '❌ VULNERABLE - No config'
        WHEN 'search_path=' = ANY(p.proconfig) THEN '✅ SECURE - search_path set'
        ELSE '⚠️ OTHER - ' || array_to_string(p.proconfig, ', ')
    END as security_status,
    p.proconfig as raw_config,
    p.oid as function_oid
FROM pg_proc p
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND p.proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY p.proname, p.oid;

-- ============================================================================
-- STEP 2: CHECK FOR MULTIPLE VERSIONS
-- ============================================================================

SELECT 'STEP 2: Count of function versions' as step;

SELECT 
    proname as function_name,
    COUNT(*) as version_count,
    string_agg(pg_get_function_identity_arguments(oid), ' | ') as all_signatures
FROM pg_proc p
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
GROUP BY proname
ORDER BY proname;

-- ============================================================================
-- STEP 3: CHECK FUNCTION DEPENDENCIES
-- ============================================================================

SELECT 'STEP 3: Function dependencies (what might recreate them)' as step;

SELECT 
    p.proname as function_name,
    d.classid::regclass as dependent_type,
    d.objid,
    d.objsubid,
    d.refclassid::regclass as referenced_type,
    d.refobjid,
    d.refobjsubid
FROM pg_proc p
JOIN pg_depend d ON d.refobjid = p.oid
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND p.proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 4: CHECK TRIGGERS THAT MIGHT USE THESE FUNCTIONS
-- ============================================================================

SELECT 'STEP 4: Triggers that might recreate functions' as step;

SELECT 
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as trigger_function,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE p.proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value', 
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY c.relname, t.tgname;

-- ============================================================================
-- STEP 5: NUCLEAR OPTION - SHOW EXACT DROP COMMANDS NEEDED
-- ============================================================================

SELECT 'STEP 5: Exact DROP commands for current functions' as step;

SELECT 
    'DROP FUNCTION IF EXISTS ' || 
    p.proname || '(' || 
    pg_get_function_identity_arguments(p.oid) || 
    ') CASCADE;' as drop_command
FROM pg_proc p
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND p.proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 6: CHECK SEARCH PATH CONFIGURATION METHODS
-- ============================================================================

SELECT 'STEP 6: Different ways to check search_path configuration' as step;

SELECT 
    p.proname as function_name,
    CASE 
        WHEN p.proconfig IS NULL THEN 'No proconfig'
        WHEN array_length(p.proconfig, 1) IS NULL THEN 'Empty proconfig array'
        WHEN 'search_path=' = ANY(p.proconfig) THEN 'search_path= found (exact match)'
        WHEN EXISTS(SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%') 
             THEN 'search_path=<value> found (pattern match)'
        ELSE 'Other config: ' || array_to_string(p.proconfig, ' | ')
    END as config_analysis,
    p.proconfig as raw_config
FROM pg_proc p
WHERE p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND p.proname IN (
    'create_simple_routine_auto_logs',
    'validate_routine_variable_value',
    'handle_routine_override',
    'toggle_routine_active',
    'set_user_unit_preference',
    'test_unit_validation_for_variable'
  )
ORDER BY p.proname;

-- ============================================================================
-- STEP 7: RECOMMENDATIONS
-- ============================================================================

SELECT 'STEP 7: Diagnostic complete - check results above' as step;
SELECT 'Look for:' as check_for;
SELECT '1. Multiple versions of same function name' as check_1;
SELECT '2. Functions with NULL proconfig (these need fixing)' as check_2;
SELECT '3. Triggers or dependencies that might recreate functions' as check_3;
SELECT '4. Use the exact DROP commands from Step 5 if needed' as check_4; 