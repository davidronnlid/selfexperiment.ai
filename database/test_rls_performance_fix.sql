-- ============================================================================
-- TEST RLS PERFORMANCE FIX
-- ============================================================================
-- This script tests that the RLS performance fix is working correctly.
-- Run this after executing fix_auth_rls_performance_issues.sql

-- ============================================================================
-- VERIFICATION: CHECK RLS STATUS
-- ============================================================================

SELECT 'Checking RLS Status for All Affected Tables...' as test_phase;

SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'RLS Enabled ✓' ELSE 'RLS Disabled ✗' END as rls_status
FROM pg_tables 
WHERE tablename IN (
    'roadmap_comments', 'profiles', 'notification_preferences', 'oura_tokens',
    'user_variable_preferences', 'variables', 'data_point_likes', 
    'withings_variable_data_points', 'experiments', 'oura_variable_data_points',
    'data_points', 'withings_tokens', 'routines', 'routine_variables',
    'roadmap_posts', 'roadmap_likes', 'roadmap_edit_history', 'units'
)
AND schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- VERIFICATION: CHECK POLICY NAMES
-- ============================================================================

SELECT 'Checking Updated Policy Names...' as test_phase;

SELECT 
    tablename,
    policyname,
    CASE 
        WHEN cmd = 'r' THEN 'SELECT'
        WHEN cmd = 'a' THEN 'INSERT'
        WHEN cmd = 'w' THEN 'UPDATE'
        WHEN cmd = 'd' THEN 'DELETE'
        WHEN cmd = '*' THEN 'ALL'
        ELSE cmd
    END as operation
FROM pg_policies 
WHERE tablename IN (
    'roadmap_comments', 'profiles', 'notification_preferences', 'oura_tokens',
    'user_variable_preferences', 'variables', 'data_point_likes', 
    'withings_variable_data_points', 'experiments', 'oura_variable_data_points',
    'data_points', 'withings_tokens', 'routines', 'routine_variables',
    'roadmap_posts', 'roadmap_likes', 'roadmap_edit_history', 'units'
)
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- VERIFICATION: CHECK POLICY DEFINITIONS (Sample)
-- ============================================================================

SELECT 'Checking Sample Policy Definitions for Optimization...' as test_phase;

-- Check a few sample policies to ensure they use optimized syntax
SELECT 
    tablename,
    policyname,
    qual as policy_condition
FROM pg_policies 
WHERE tablename IN ('profiles', 'data_points', 'variables')
AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- PERFORMANCE VERIFICATION
-- ============================================================================

SELECT 'Performance optimization should now be active!' as result;
SELECT 'The following changes have been applied:' as info;
SELECT '• auth.uid() → (select auth.uid())' as change_1;
SELECT '• auth.role() → (select auth.role())' as change_2;
SELECT '• PostgreSQL can now optimize these function calls' as benefit;

-- ============================================================================
-- EXPECTED RESULTS
-- ============================================================================

SELECT 'Expected Results:' as expected;
SELECT '• All tables should show "RLS Enabled ✓"' as expectation_1;
SELECT '• Policy definitions should contain "(select auth.uid())" syntax' as expectation_2;
SELECT '• Supabase linter warnings should be resolved' as expectation_3;
SELECT '• Query performance should improve at scale' as expectation_4; 