-- ============================================================================
-- COMPREHENSIVE RLS POLICIES VERIFICATION SCRIPT
-- ============================================================================
-- Run these queries in your Supabase SQL Editor to manually verify all RLS policies
-- 
-- USAGE:
-- 1. Copy and paste each section into Supabase SQL Editor
-- 2. Run them one by one to verify your RLS setup
-- 3. Check that the policies match your expected security model

-- ============================================================================
-- 1. OVERVIEW: ALL TABLES AND THEIR RLS STATUS
-- ============================================================================

-- Get all tables in public schema with RLS status
SELECT 
    t.table_name,
    t.table_schema,
    CASE WHEN c.relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status,
    c.relname as pg_table_name
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND n.nspname = 'public'
ORDER BY t.table_name;

-- ============================================================================
-- 2. DETAILED RLS POLICIES FOR ALL TABLES
-- ============================================================================

-- Get all RLS policies with detailed information
SELECT 
    schemaname as schema,
    tablename as table_name,
    policyname as policy_name,
    permissive as policy_type,
    roles as applicable_roles,
    cmd as operation,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 3. COUNT POLICIES PER TABLE
-- ============================================================================

-- Count how many policies each table has
SELECT 
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_operation_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- 4. CHECK FOR TABLES WITH RLS ENABLED BUT NO POLICIES
-- ============================================================================

-- Find tables that have RLS enabled but no policies (potential security issue)
WITH rls_tables AS (
    SELECT 
        t.table_name,
        CASE WHEN c.relrowsecurity THEN true ELSE false END as has_rls
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND n.nspname = 'public'
),
policy_tables AS (
    SELECT DISTINCT tablename as table_name
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    rt.table_name,
    rt.has_rls,
    CASE WHEN pt.table_name IS NULL THEN '⚠️ NO POLICIES' ELSE '✅ HAS POLICIES' END as policy_status
FROM rls_tables rt
LEFT JOIN policy_tables pt ON rt.table_name = pt.table_name
WHERE rt.has_rls = true
ORDER BY rt.table_name;

-- ============================================================================
-- 5. SPECIFIC TABLE VERIFICATIONS
-- ============================================================================

-- Core Data Tables
SELECT '=== CORE DATA TABLES ===' as section;

-- Variables table policies
SELECT 'VARIABLES TABLE:' as table_info;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'variables' AND schemaname = 'public'
ORDER BY policyname;

-- Data points table policies  
SELECT 'DATA_POINTS TABLE:' as table_info;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'data_points' AND schemaname = 'public'
ORDER BY policyname;

-- User variable preferences table policies
SELECT 'USER_VARIABLE_PREFERENCES TABLE:' as table_info;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_variable_preferences' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- 6. INTEGRATION TABLES VERIFICATION
-- ============================================================================

SELECT '=== INTEGRATION TABLES ===' as section;

-- Apple Health tables
SELECT 'APPLE HEALTH TABLES:' as table_info;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('apple_health_variable_data_points', 'apple_health_tokens') 
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Oura tables
SELECT 'OURA TABLES:' as table_info;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('oura_variable_data_points', 'oura_tokens', 'oura_measurements') 
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Withings tables
SELECT 'WITHINGS TABLES:' as table_info;
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN ('withings_tokens', 'withings_variable_logs', 'withings_variable_data_points') 
    AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 7. PRIVACY & SHARING TABLES VERIFICATION
-- ============================================================================

SELECT '=== PRIVACY & SHARING TABLES ===' as section;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN (
    'variable_sharing_settings', 
    'log_privacy_settings', 
    'user_follows', 
    'user_privacy_profile'
) AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 8. ROUTINES & NOTIFICATIONS VERIFICATION
-- ============================================================================

SELECT '=== ROUTINES & NOTIFICATIONS TABLES ===' as section;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN (
    'daily_routines', 
    'routine_log_history', 
    'notification_preferences', 
    'notification_history', 
    'push_subscriptions'
) AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 9. COMMUNITY FEATURES VERIFICATION
-- ============================================================================

SELECT '=== COMMUNITY FEATURES TABLES ===' as section;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN (
    'roadmap_posts', 
    'roadmap_comments', 
    'roadmap_likes',
    'roadmap_edit_history'
) AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 10. REFERENCE TABLES VERIFICATION
-- ============================================================================

SELECT '=== REFERENCE TABLES ===' as section;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN (
    'units', 
    'variable_units', 
    'variable_synonyms',
    'variable_search_index'
) AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 11. SYSTEM TABLES VERIFICATION
-- ============================================================================

SELECT '=== SYSTEM TABLES ===' as section;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename IN (
    'profiles', 
    'cron_job_logs'
) AND schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 12. CHECK FOR PERFORMANCE OPTIMIZATION ISSUES
-- ============================================================================

SELECT '=== PERFORMANCE OPTIMIZATION CHECK ===' as section;

-- Check for auth functions that might need optimization
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%' THEN '⚠️ AUTH.UID() NOT OPTIMIZED'
        WHEN qual LIKE '%auth.role()%' OR with_check LIKE '%auth.role()%' THEN '⚠️ AUTH.ROLE() NOT OPTIMIZED'
        WHEN qual LIKE '%(select auth.%' OR with_check LIKE '%(select auth.%' THEN '✅ OPTIMIZED'
        ELSE '✓ NO AUTH FUNCTIONS'
    END as optimization_status,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual LIKE '%auth.%' OR with_check LIKE '%auth.%')
ORDER BY tablename, policyname;

-- ============================================================================
-- 13. CHECK FOR MULTIPLE PERMISSIVE POLICIES (POTENTIAL PERFORMANCE ISSUE)
-- ============================================================================

SELECT '=== MULTIPLE PERMISSIVE POLICIES CHECK ===' as section;

-- Find tables with multiple permissive policies for the same operation
SELECT 
    tablename,
    cmd as operation,
    COUNT(*) as policy_count,
    array_agg(policyname ORDER BY policyname) as policy_names,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️ MULTIPLE POLICIES (May cause performance issues)'
        ELSE '✅ SINGLE POLICY'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
ORDER BY policy_count DESC, tablename, cmd;

-- ============================================================================
-- 14. SUMMARY REPORT
-- ============================================================================

SELECT '=== SUMMARY REPORT ===' as section;

WITH table_stats AS (
    SELECT 
        COUNT(DISTINCT t.table_name) as total_tables,
        COUNT(DISTINCT CASE WHEN c.relrowsecurity THEN t.table_name END) as rls_enabled_tables,
        COUNT(DISTINCT CASE WHEN NOT c.relrowsecurity THEN t.table_name END) as rls_disabled_tables
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND n.nspname = 'public'
),
policy_stats AS (
    SELECT 
        COUNT(*) as total_policies,
        COUNT(DISTINCT tablename) as tables_with_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    'TOTAL TABLES: ' || ts.total_tables as stat_1,
    'RLS ENABLED: ' || ts.rls_enabled_tables as stat_2,
    'RLS DISABLED: ' || ts.rls_disabled_tables as stat_3,
    'TOTAL POLICIES: ' || ps.total_policies as stat_4,
    'TABLES WITH POLICIES: ' || ps.tables_with_policies as stat_5
FROM table_stats ts, policy_stats ps;

-- ============================================================================
-- 15. QUICK TEST QUERIES (OPTIONAL - BE CAREFUL WITH THESE)
-- ============================================================================

-- WARNING: Only run these if you want to test actual data access
-- These will show if RLS is working correctly by attempting to access data

/*
-- Test public access to variables (should work)
SELECT COUNT(*) as public_variables_count FROM variables WHERE is_active = true;

-- Test access to your own data points (should work if you're logged in)
SELECT COUNT(*) as my_data_points FROM data_points WHERE user_id = auth.uid();

-- Test access to other users' private data (should return 0 rows)
SELECT COUNT(*) as other_users_data FROM data_points WHERE user_id != auth.uid();

-- Test units access (should work for authenticated users)
SELECT COUNT(*) as available_units FROM units;
*/ 