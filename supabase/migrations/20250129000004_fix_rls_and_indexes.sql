-- RLS performance and duplicate index cleanup
-- - Wrap auth.* calls with (select ...) to avoid per-row re-evaluation
-- - Consolidate overlapping permissive policies per action
-- - Drop duplicate indexes only when definitions are identical

-- =====================================================================
-- 1) USER_VARIABLE_PREFERENCES
-- =====================================================================
ALTER TABLE IF EXISTS user_variable_preferences ENABLE ROW LEVEL SECURITY;

-- Drop legacy/overlapping policies if they exist
DROP POLICY IF EXISTS "Users can delete own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can insert own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can update own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can view own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can manage their own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can modify own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can view own variable sharing settings" ON user_variable_preferences;
DROP POLICY IF EXISTS "Public read shared variable settings" ON user_variable_preferences;

-- Consolidated policies per action with optimized auth calls
CREATE POLICY "Users can view own and shared variable preferences" ON user_variable_preferences
  FOR SELECT USING (((select auth.uid()) = user_id) OR (is_shared = true));

CREATE POLICY "Users can insert own variable preferences" ON user_variable_preferences
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own variable preferences" ON user_variable_preferences
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own variable preferences" ON user_variable_preferences
  FOR DELETE USING ((select auth.uid()) = user_id);


-- =====================================================================
-- 2) VARIABLE_UNITS
-- =====================================================================
ALTER TABLE IF EXISTS variable_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;
CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
  FOR SELECT USING ((select auth.role()) = 'authenticated');


-- =====================================================================
-- 3) PUSH_SUBSCRIPTIONS
-- =====================================================================
ALTER TABLE IF EXISTS push_subscriptions ENABLE ROW LEVEL SECURITY;

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


-- =====================================================================
-- 4) NOTIFICATION_HISTORY
-- =====================================================================
ALTER TABLE IF EXISTS notification_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification history" ON notification_history;
CREATE POLICY "Users can view their own notification history" ON notification_history
  FOR SELECT USING ((select auth.uid()) = user_id);


-- =====================================================================
-- 5) APPLE HEALTH TABLES
-- =====================================================================
ALTER TABLE IF EXISTS apple_health_variable_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS apple_health_tokens ENABLE ROW LEVEL SECURITY;

-- Replace any older per-action Apple Health data point policies with a single optimized ALL policy
DROP POLICY IF EXISTS "Users can view their own Apple Health data" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS "Users can insert their own Apple Health data" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS "Users can update their own Apple Health data" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS "Users can delete their own Apple Health data" ON apple_health_variable_data_points;
DROP POLICY IF EXISTS apple_health_data_user_access ON apple_health_variable_data_points;

CREATE POLICY apple_health_data_user_access ON apple_health_variable_data_points
  FOR ALL USING ((select auth.uid()) = user_id);

-- Ensure token policies use optimized auth calls
DROP POLICY IF EXISTS "Users can view their own Apple Health tokens" ON apple_health_tokens;
DROP POLICY IF EXISTS "Users can insert their own Apple Health tokens" ON apple_health_tokens;
DROP POLICY IF EXISTS "Users can update their own Apple Health tokens" ON apple_health_tokens;
DROP POLICY IF EXISTS "Users can delete their own Apple Health tokens" ON apple_health_tokens;

-- Also drop older duplicates with slightly different names to avoid multiple permissive policies
DROP POLICY IF EXISTS "Users can view own apple health tokens" ON apple_health_tokens;
DROP POLICY IF EXISTS "Users can insert own apple health tokens" ON apple_health_tokens;
DROP POLICY IF EXISTS "Users can update own apple health tokens" ON apple_health_tokens;
DROP POLICY IF EXISTS "Users can delete own apple health tokens" ON apple_health_tokens;

CREATE POLICY "Users can view their own Apple Health tokens" ON apple_health_tokens
  FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert their own Apple Health tokens" ON apple_health_tokens
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own Apple Health tokens" ON apple_health_tokens
  FOR UPDATE USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own Apple Health tokens" ON apple_health_tokens
  FOR DELETE USING ((select auth.uid()) = user_id);


-- =====================================================================
-- 6) DATA_POINTS
-- =====================================================================
ALTER TABLE IF EXISTS data_points ENABLE ROW LEVEL SECURITY;

-- Drop overly broad/duplicate policies
DROP POLICY IF EXISTS "Allow all operations" ON data_points;
DROP POLICY IF EXISTS "Users can delete their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can insert their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can update their own data points" ON data_points;
DROP POLICY IF EXISTS "Users can view their own data points" ON data_points;
DROP POLICY IF EXISTS "Public read logs for shared variables" ON data_points;
DROP POLICY IF EXISTS "Users can view own data points and shared data" ON data_points;
DROP POLICY IF EXISTS "Users can manage their own data points" ON data_points;

-- Consolidated minimal set
CREATE POLICY "Users can view own data points and shared data" ON data_points
  FOR SELECT USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM user_variable_preferences uvp 
      WHERE uvp.variable_id = data_points.variable_id 
        AND uvp.user_id = data_points.user_id
        AND uvp.is_shared = true
    )
  );

-- Separate DML policies to avoid overlapping SELECT policies
CREATE POLICY "Users can insert their own data points" ON data_points
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own data points" ON data_points
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own data points" ON data_points
  FOR DELETE USING ((select auth.uid()) = user_id);


-- =====================================================================
-- 7) EXPERIMENTS
-- =====================================================================
ALTER TABLE IF EXISTS experiments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_access ON experiments;
DROP POLICY IF EXISTS users_can_delete_own_experiments ON experiments;
DROP POLICY IF EXISTS users_can_insert_own_experiments ON experiments;
DROP POLICY IF EXISTS users_can_update_own_experiments ON experiments;
DROP POLICY IF EXISTS users_can_view_own_experiments ON experiments;
DROP POLICY IF EXISTS "Users can manage own experiments" ON experiments;

-- Minimal consolidated policy per action set (ALL)
CREATE POLICY "Users can manage own experiments" ON experiments
  FOR ALL USING ((select auth.uid()) = user_id);


-- =====================================================================
-- 8) PROFILES
-- =====================================================================
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles" ON profiles;
DROP POLICY IF EXISTS "Public read usernames" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Public read profiles and users can manage own" ON profiles;

CREATE POLICY "Public read profiles" ON profiles
  FOR SELECT USING (true);

-- DML-only policies to avoid overlapping with public SELECT
CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

CREATE POLICY "Users can delete their own profile" ON profiles
  FOR DELETE USING ((select auth.uid()) = id);


-- =====================================================================
-- 9) ROADMAP_LIKES
-- =====================================================================
ALTER TABLE IF EXISTS roadmap_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view roadmap likes" ON roadmap_likes;
DROP POLICY IF EXISTS "Users can manage own roadmap likes" ON roadmap_likes;
DROP POLICY IF EXISTS "Users can delete own roadmap likes" ON roadmap_likes;

CREATE POLICY "Anyone can view roadmap likes" ON roadmap_likes
  FOR SELECT USING (true);

-- DML-only policies to avoid overlapping with public SELECT
CREATE POLICY "Users can insert own roadmap likes" ON roadmap_likes
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own roadmap likes" ON roadmap_likes
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own roadmap likes" ON roadmap_likes
  FOR DELETE USING ((select auth.uid()) = user_id);


-- =====================================================================
-- 10) UNITS
-- =====================================================================
ALTER TABLE IF EXISTS units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow insert if created_by is self" ON units;
DROP POLICY IF EXISTS "Allow all users to read units" ON units;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON units;
DROP POLICY IF EXISTS "Allow update by creator" ON units;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON units;
DROP POLICY IF EXISTS "Units are readable by all authenticated users" ON units;
DROP POLICY IF EXISTS "Authenticated users can manage units" ON units;

CREATE POLICY "Units are readable by all authenticated users" ON units
  FOR SELECT USING ((select auth.role()) = 'authenticated');

-- DML-only policies to avoid overlapping with SELECT
CREATE POLICY "Authenticated users can insert units" ON units
  FOR INSERT WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Authenticated users can update units" ON units
  FOR UPDATE USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Authenticated users can delete units" ON units
  FOR DELETE USING ((select auth.uid()) = created_by);


-- =====================================================================
-- 11) USER_FOLLOWS
-- =====================================================================
ALTER TABLE IF EXISTS user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can insert their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can update their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can delete their follows" ON user_follows;

-- Single SELECT policy to avoid multiple permissive SELECT policies
CREATE POLICY "Users can view their follows" ON user_follows
  FOR SELECT USING (((select auth.uid()) = follower_id) OR ((select auth.uid()) = following_id));

-- DML policies separated to prevent overlap with SELECT
CREATE POLICY "Users can insert their follows" ON user_follows
  FOR INSERT WITH CHECK ((select auth.uid()) = follower_id);

CREATE POLICY "Users can update their follows" ON user_follows
  FOR UPDATE USING ((select auth.uid()) = follower_id);

CREATE POLICY "Users can delete their follows" ON user_follows
  FOR DELETE USING ((select auth.uid()) = follower_id);


-- =====================================================================
-- 12) DUPLICATE INDEX CLEANUP (safe guarded)
-- =====================================================================

-- Helper: drop one index if two indexes have identical definitions
DO $$
DECLARE
  def1 text;
  def2 text;
BEGIN
  -- data_points: logs_id_key vs logs_pkey → drop logs_id_key if identical
  IF to_regclass('public.logs_id_key') IS NOT NULL AND to_regclass('public.logs_pkey') IS NOT NULL THEN
    SELECT pg_get_indexdef('public.logs_id_key'::regclass) INTO def1;
    SELECT pg_get_indexdef('public.logs_pkey'::regclass) INTO def2;
    IF def1 = def2 THEN
      EXECUTE 'DROP INDEX IF EXISTS public.logs_id_key';
    END IF;
  END IF;

  -- notification_preferences: notification_preferences_user_id_key vs _unique → drop _unique if identical
  IF to_regclass('public.notification_preferences_user_id_key') IS NOT NULL 
     AND to_regclass('public.notification_preferences_user_id_unique') IS NOT NULL THEN
    SELECT pg_get_indexdef('public.notification_preferences_user_id_key'::regclass) INTO def1;
    SELECT pg_get_indexdef('public.notification_preferences_user_id_unique'::regclass) INTO def2;
    IF def1 = def2 THEN
      EXECUTE 'DROP INDEX IF EXISTS public.notification_preferences_user_id_unique';
    END IF;
  END IF;

  -- routine_variables: idx_routine_variables_user_weekdays vs routine_variables_routine_id_idx
  IF to_regclass('public.idx_routine_variables_user_weekdays') IS NOT NULL 
     AND to_regclass('public.routine_variables_routine_id_idx') IS NOT NULL THEN
    SELECT pg_get_indexdef('public.idx_routine_variables_user_weekdays'::regclass) INTO def1;
    SELECT pg_get_indexdef('public.routine_variables_routine_id_idx'::regclass) INTO def2;
    IF def1 = def2 THEN
      EXECUTE 'DROP INDEX IF EXISTS public.routine_variables_routine_id_idx';
    END IF;
  END IF;

  -- withings_variable_data_points: idx_withings_variable_data_points_user_id vs idx_withings_variable_logs_user_id
  IF to_regclass('public.idx_withings_variable_data_points_user_id') IS NOT NULL 
     AND to_regclass('public.idx_withings_variable_logs_user_id') IS NOT NULL THEN
    SELECT pg_get_indexdef('public.idx_withings_variable_data_points_user_id'::regclass) INTO def1;
    SELECT pg_get_indexdef('public.idx_withings_variable_logs_user_id'::regclass) INTO def2;
    IF def1 = def2 THEN
      EXECUTE 'DROP INDEX IF EXISTS public.idx_withings_variable_logs_user_id';
    END IF;
  END IF;

  -- withings_variable_data_points: withings_variable_data_points_id_key vs withings_variable_data_points_pkey
  IF to_regclass('public.withings_variable_data_points_id_key') IS NOT NULL 
     AND to_regclass('public.withings_variable_data_points_pkey') IS NOT NULL THEN
    SELECT pg_get_indexdef('public.withings_variable_data_points_id_key'::regclass) INTO def1;
    SELECT pg_get_indexdef('public.withings_variable_data_points_pkey'::regclass) INTO def2;
    IF def1 = def2 THEN
      EXECUTE 'DROP INDEX IF EXISTS public.withings_variable_data_points_id_key';
    END IF;
  END IF;
END $$;


