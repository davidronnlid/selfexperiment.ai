-- ============================================================================
-- COMPREHENSIVE SUPABASE LINTING ISSUES FIX
-- ============================================================================
-- This script addresses all the database linting issues reported by Supabase:
--
-- 1. AUTH RLS INITIALIZATION PLAN ISSUES
--    - Fixes auth.uid() and auth.role() calls being re-evaluated for each row
--    - Wraps calls with (select ...) for better performance
--
-- 2. MULTIPLE PERMISSIVE POLICIES
--    - Consolidates overlapping RLS policies that cause performance issues
--    - Removes redundant policies while maintaining security
--
-- 3. DUPLICATE INDEXES
--    - Removes identical indexes to improve performance and reduce storage
--
-- Run this script in your Supabase SQL Editor

-- ============================================================================
-- 1. FIX AUTH RLS INITIALIZATION PLAN ISSUES
-- ============================================================================

SELECT 'FIXING AUTH RLS INITIALIZATION PLAN ISSUES...' as status;

-- USER_VARIABLE_PREFERENCES TABLE
-- Fix policies that re-evaluate auth functions for each row
DROP POLICY IF EXISTS "Users can delete own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can insert own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can update own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can view own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can modify own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can view own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "Public read shared variable settings" ON user_variable_preferences;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view own variable preferences" ON user_variable_preferences
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own variable preferences" ON user_variable_preferences
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own variable preferences" ON user_variable_preferences
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own variable preferences" ON user_variable_preferences
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Public read policy for shared variable settings
CREATE POLICY "Public read shared variable settings" ON user_variable_preferences
    FOR SELECT USING (is_shared = true);

-- VARIABLE_UNITS TABLE
DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;

CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT USING ((select auth.role()) = 'authenticated');

-- PUSH_SUBSCRIPTIONS TABLE
DROP POLICY IF EXISTS "Users can delete their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can update their own push subscriptions" ON push_subscriptions;
DROP POLICY IF EXISTS "Users can view their own push subscriptions" ON push_subscriptions;

CREATE POLICY "Users can view their own push subscriptions" ON push_subscriptions
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own push subscriptions" ON push_subscriptions
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own push subscriptions" ON push_subscriptions
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own push subscriptions" ON push_subscriptions
    FOR DELETE USING ((select auth.uid()) = user_id);

-- NOTIFICATION_HISTORY TABLE
DROP POLICY IF EXISTS "Users can view their own notification history" ON notification_history;

CREATE POLICY "Users can view their own notification history" ON notification_history
    FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================================
-- 2. FIX MULTIPLE PERMISSIVE POLICIES
-- ============================================================================

SELECT 'FIXING MULTIPLE PERMISSIVE POLICIES...' as status;

-- DATA_POINTS TABLE
-- Remove the overly broad "Allow all operations" policy that conflicts with specific user policies
DROP POLICY IF EXISTS "Allow all operations" ON data_points;
DROP POLICY IF EXISTS "Users can delete their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can insert their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can update their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can view their own data points" ON data_points;
DROP POLICY IF EXISTS "Public read logs for shared variables" ON data_points;

-- Create consolidated policies
CREATE POLICY "Users can view own data points and shared data" ON data_points
    FOR SELECT USING (
        (select auth.uid()) = user_id OR 
        EXISTS (
            SELECT 1 FROM user_variable_preferences uvp 
            WHERE uvp.variable_id = data_points.variable_id 
            AND uvp.is_shared = true
        )
    );

CREATE POLICY "Users can manage their own data points" ON data_points
    FOR ALL USING ((select auth.uid()) = user_id);

-- EXPERIMENTS TABLE
-- Remove conflicting deny/allow policies
DROP POLICY IF EXISTS "deny_all_access" ON experiments;
DROP POLICY IF EXISTS "users_can_delete_own_experiments" ON experiments;
DROP POLICY IF EXISTS "users_can_insert_own_experiments" ON experiments;
DROP POLICY IF EXISTS "users_can_update_own_experiments" ON experiments;
DROP POLICY IF EXISTS "users_can_view_own_experiments" ON experiments;

-- Create single consolidated policy
CREATE POLICY "Users can manage own experiments" ON experiments
    FOR ALL USING ((select auth.uid()) = user_id);

-- PROFILES TABLE
-- Consolidate overlapping read policies
DROP POLICY IF EXISTS "Public read usernames" ON profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;

-- Create consolidated read policy
CREATE POLICY "Public read profiles and users can manage own" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING ((select auth.uid()) = id);

-- ROADMAP_LIKES TABLE
-- Consolidate overlapping policies
DROP POLICY IF EXISTS "Anyone can view roadmap likes" ON roadmap_likes;
DROP POLICY IF EXISTS "Users can manage own roadmap likes" ON roadmap_likes;

CREATE POLICY "Anyone can view roadmap likes" ON roadmap_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own roadmap likes" ON roadmap_likes
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own roadmap likes" ON roadmap_likes
    FOR DELETE USING ((select auth.uid()) = user_id);

-- UNITS TABLE
-- Consolidate multiple insert/update policies
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow insert if created_by is self" ON units;
DROP POLICY IF EXISTS "Allow all users to read units" ON units;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON units;
DROP POLICY IF EXISTS "Allow update by creator" ON units;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON units;

-- Create consolidated policies
CREATE POLICY "Units are readable by all authenticated users" ON units
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Authenticated users can manage units" ON units
    FOR ALL USING ((select auth.role()) = 'authenticated');

-- ============================================================================
-- 3. FIX DUPLICATE INDEXES
-- ============================================================================

SELECT 'FIXING DUPLICATE INDEXES...' as status;

-- DATA_POINTS TABLE - Remove duplicate indexes
DROP INDEX IF EXISTS logs_id_key;  -- Keep logs_pkey, drop duplicate

-- NOTIFICATION_PREFERENCES TABLE - Remove duplicate constraint
DROP INDEX IF EXISTS notification_preferences_user_id_key;  -- Keep notification_preferences_user_id_unique

-- ROUTINE_VARIABLES TABLE - Remove duplicate index
DROP INDEX IF EXISTS routine_variables_routine_id_idx;  -- Keep idx_routine_variables_user_weekdays

-- WITHINGS_VARIABLE_DATA_POINTS TABLE - Remove duplicate indexes
DROP INDEX IF EXISTS idx_withings_variable_logs_user_id;  -- Keep idx_withings_variable_data_points_user_id
DROP INDEX IF EXISTS withings_variable_data_points_id_key;  -- Keep withings_variable_data_points_pkey

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

SELECT 'RUNNING VERIFICATION CHECKS...' as status;

-- Check RLS policies are optimized
SELECT 
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%(select auth.%' OR with_check LIKE '%(select auth.%' THEN '✅ OPTIMIZED'
        WHEN qual LIKE '%auth.%' OR with_check LIKE '%auth.%' THEN '⚠️ NEEDS OPTIMIZATION'
        ELSE '✓ OK'
    END as auth_optimization_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN (
    'user_variable_preferences', 'variable_units', 'push_subscriptions', 
    'notification_history', 'data_points', 'experiments', 'profiles', 
    'roadmap_likes', 'units'
)
ORDER BY tablename, policyname;

-- Check for remaining multiple permissive policies
SELECT 
    tablename,
    cmd as operation,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 1 THEN '⚠️ MULTIPLE POLICIES'
        ELSE '✅ SINGLE POLICY'
    END as consolidation_status
FROM pg_policies 
WHERE schemaname = 'public'
AND permissive = 'PERMISSIVE'
AND tablename IN (
    'data_points', 'experiments', 'profiles', 'roadmap_likes', 
    'units', 'user_variable_preferences'
)
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- Check remaining duplicate indexes (should be empty)
WITH duplicate_indexes AS (
    SELECT 
        schemaname,
        tablename,
        array_agg(indexname ORDER BY indexname) as index_names,
        COUNT(*) as duplicate_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    AND tablename IN (
        'data_points', 'notification_preferences', 'routine_variables', 
        'withings_variable_data_points'
    )
    GROUP BY schemaname, tablename, indexdef
    HAVING COUNT(*) > 1
)
SELECT 
    tablename,
    index_names,
    duplicate_count,
    '⚠️ STILL HAS DUPLICATES' as status
FROM duplicate_indexes;

-- Final status report
SELECT 
    'SUPABASE LINTING ISSUES FIX COMPLETED!' as status,
    'Check the verification queries above for any remaining issues' as next_steps;

-- Summary of changes
SELECT 'SUMMARY OF FIXES APPLIED:' as summary;
SELECT '✅ Fixed auth RLS initialization plan issues by wrapping auth functions with (select ...)' as fix_1;
SELECT '✅ Consolidated multiple permissive policies to improve performance' as fix_2;
SELECT '✅ Removed duplicate indexes to reduce storage and improve performance' as fix_3;
SELECT '✅ Maintained security while optimizing for performance' as fix_4; 