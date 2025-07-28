-- ============================================================================
-- CHECK SPECIFIC TABLE POLICIES
-- ============================================================================
-- Replace 'TABLE_NAME' with the actual table you want to check

-- Check if RLS is enabled on a specific table
SELECT 
    t.table_name,
    CASE WHEN c.relrowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_name = 'YOUR_TABLE_NAME'  -- Replace with actual table name
    AND t.table_schema = 'public';

-- Get all policies for a specific table
SELECT 
    policyname as policy_name,
    cmd as operation,
    permissive as policy_type,
    roles as applicable_roles,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE tablename = 'YOUR_TABLE_NAME'  -- Replace with actual table name
    AND schemaname = 'public'
ORDER BY cmd, policyname;

-- ============================================================================
-- QUICK CHECKS FOR KEY TABLES
-- ============================================================================

-- Variables table
SELECT 'VARIABLES TABLE POLICIES:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'variables' AND schemaname = 'public';

-- Data points table
SELECT 'DATA_POINTS TABLE POLICIES:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'data_points' AND schemaname = 'public';

-- User preferences table
SELECT 'USER_VARIABLE_PREFERENCES TABLE POLICIES:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_variable_preferences' AND schemaname = 'public';

-- Apple Health data
SELECT 'APPLE_HEALTH_VARIABLE_DATA_POINTS TABLE POLICIES:' as info;
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies 
WHERE tablename = 'apple_health_variable_data_points' AND schemaname = 'public'; 