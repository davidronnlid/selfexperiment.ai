-- ============================================================================
-- FIX AUTH RLS PERFORMANCE ISSUES
-- ============================================================================
-- This script addresses Supabase database linter warnings about RLS performance.
-- The issue: auth.uid() and auth.role() calls in RLS policies are re-evaluated 
-- for each row, causing poor performance at scale.
-- 
-- Solution: Replace auth.uid() with (select auth.uid()) and auth.role() with 
-- (select auth.role()) to enable PostgreSQL query optimization.
--
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- ============================================================================
-- ROADMAP COMMENTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "roadmap_comments_insert_policy" ON roadmap_comments;
DROP POLICY IF EXISTS "roadmap_comments_update_policy" ON roadmap_comments;
DROP POLICY IF EXISTS "roadmap_comments_delete_policy" ON roadmap_comments;

-- Recreate with optimized auth function calls
CREATE POLICY "roadmap_comments_insert_policy" ON roadmap_comments
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "roadmap_comments_update_policy" ON roadmap_comments
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "roadmap_comments_delete_policy" ON roadmap_comments
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can select their own profile" ON profiles
    FOR SELECT USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- NOTIFICATION_PREFERENCES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON notification_preferences;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view own notification preferences" ON notification_preferences
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notification preferences" ON notification_preferences
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notification preferences" ON notification_preferences
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own notification preferences" ON notification_preferences
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- OURA_TOKENS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can insert their own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can update their own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can view own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can insert own oura tokens" ON oura_tokens;
DROP POLICY IF EXISTS "Users can update own oura tokens" ON oura_tokens;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own oura tokens" ON oura_tokens
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own oura tokens" ON oura_tokens
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own oura tokens" ON oura_tokens
    FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- USER_VARIABLE_PREFERENCES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can modify own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "User can read own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "User can modify own variable sharing settings" ON user_variable_preferences;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view own variable sharing settings" ON user_variable_preferences
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can modify own variable sharing settings" ON user_variable_preferences
    FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- VARIABLES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Variables are viewable by all authenticated users" ON variables;
DROP POLICY IF EXISTS "Variables can be created by authenticated users" ON variables;
DROP POLICY IF EXISTS "Variables can be updated by creator" ON variables;

-- Recreate with optimized auth function calls
CREATE POLICY "Variables are viewable by all authenticated users" ON variables
    FOR SELECT USING ((select auth.role()) = 'authenticated');

CREATE POLICY "Variables can be created by authenticated users" ON variables
    FOR INSERT WITH CHECK ((select auth.role()) = 'authenticated');

CREATE POLICY "Variables can be updated by creator" ON variables
    FOR UPDATE USING ((select auth.uid()) = created_by);

-- ============================================================================
-- DATA_POINT_LIKES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can like logs" ON data_point_likes;
DROP POLICY IF EXISTS "Users can unlike logs" ON data_point_likes;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can like logs" ON data_point_likes
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unlike logs" ON data_point_likes
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- WITHINGS_VARIABLE_DATA_POINTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can insert their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can update their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can manage their own Withings logs" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can delete their own Withings variable data points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can view their own Withings data_points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can insert their own Withings data_points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can update their own Withings data_points" ON withings_variable_data_points;
DROP POLICY IF EXISTS "Users can delete their own Withings data_points" ON withings_variable_data_points;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own Withings variable data points" ON withings_variable_data_points
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own Withings variable data points" ON withings_variable_data_points
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own Withings variable data points" ON withings_variable_data_points
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own Withings variable data points" ON withings_variable_data_points
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- EXPERIMENTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "users_can_insert_own_experiments" ON experiments;
DROP POLICY IF EXISTS "users_can_update_own_experiments" ON experiments;
DROP POLICY IF EXISTS "users_can_delete_own_experiments" ON experiments;
DROP POLICY IF EXISTS "users_can_view_own_experiments" ON experiments;

-- Recreate with optimized auth function calls
CREATE POLICY "users_can_view_own_experiments" ON experiments
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "users_can_insert_own_experiments" ON experiments
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "users_can_update_own_experiments" ON experiments
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "users_can_delete_own_experiments" ON experiments
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- OURA_VARIABLE_DATA_POINTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own Oura variable data points" ON oura_variable_data_points;
DROP POLICY IF EXISTS "Users can insert their own Oura variable data points" ON oura_variable_data_points;
DROP POLICY IF EXISTS "Users can update their own Oura variable data points" ON oura_variable_data_points;
DROP POLICY IF EXISTS "Users can delete their own Oura variable data points" ON oura_variable_data_points;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own Oura variable data points" ON oura_variable_data_points
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own Oura variable data points" ON oura_variable_data_points
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own Oura variable data points" ON oura_variable_data_points
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own Oura variable data points" ON oura_variable_data_points
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- DATA_POINTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can insert their own data points" ON data_points;
DROP POLICY IF EXISTS "User can modify own logs" ON data_points;
DROP POLICY IF EXISTS "Users can update their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can delete their own data points" ON data_points;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own data points" ON data_points
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own data points" ON data_points
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own data points" ON data_points
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own data points" ON data_points
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- WITHINGS_TOKENS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can insert their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can update their own Withings tokens" ON withings_tokens;
DROP POLICY IF EXISTS "Users can delete their own Withings tokens" ON withings_tokens;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own Withings tokens" ON withings_tokens
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own Withings tokens" ON withings_tokens
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own Withings tokens" ON withings_tokens
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own Withings tokens" ON withings_tokens
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- ROUTINES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own routines" ON routines;
DROP POLICY IF EXISTS "Users can create their own routines" ON routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON routines;
DROP POLICY IF EXISTS "Users can delete their own routines" ON routines;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their own routines" ON routines
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own routines" ON routines
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own routines" ON routines
    FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own routines" ON routines
    FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================================================
-- ROUTINE_VARIABLES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "User can access own routine_variables" ON routine_variables;

-- Recreate with optimized auth function calls
CREATE POLICY "User can access own routine_variables" ON routine_variables
    FOR ALL USING (EXISTS (
        SELECT 1 FROM routines r 
        WHERE r.id = routine_variables.routine_id 
        AND r.user_id = (select auth.uid())
    ));

-- ============================================================================
-- ROADMAP_POSTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create roadmap posts" ON roadmap_posts;
DROP POLICY IF EXISTS "Authenticated users can edit roadmap posts" ON roadmap_posts;

-- Recreate with optimized auth function calls
CREATE POLICY "Authenticated users can create roadmap posts" ON roadmap_posts
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Authenticated users can edit roadmap posts" ON roadmap_posts
    FOR UPDATE USING ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- ROADMAP_LIKES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage own roadmap likes" ON roadmap_likes;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can manage own roadmap likes" ON roadmap_likes
    FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================================
-- ROADMAP_EDIT_HISTORY TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "System can insert roadmap edit history" ON roadmap_edit_history;

-- Recreate with optimized auth function calls
CREATE POLICY "System can insert roadmap edit history" ON roadmap_edit_history
    FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ============================================================================
-- UNITS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert if created_by is self" ON units;
DROP POLICY IF EXISTS "Allow update by creator" ON units;

-- Recreate with optimized auth function calls
CREATE POLICY "Allow insert if created_by is self" ON units
    FOR INSERT WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Allow update by creator" ON units
    FOR UPDATE USING (created_by = (select auth.uid()));

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Check that RLS is enabled on all affected tables
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'RLS Enabled' ELSE 'RLS Disabled' END as rls_status
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

-- Display success message
SELECT 'RLS Performance Fix Applied Successfully!' as status;
SELECT 'All auth.uid() and auth.role() calls have been optimized with SELECT wrappers.' as details; 