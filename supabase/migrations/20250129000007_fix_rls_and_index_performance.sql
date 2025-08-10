-- ============================================================================
-- Fix RLS performance (auth SELECT wrappers), consolidate permissive policies,
-- and drop duplicate indexes as per Supabase linter warnings.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) APPLE HEALTH TOKENS: consolidate policies and wrap auth.uid()
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.apple_health_tokens ENABLE ROW LEVEL SECURITY;

-- Drop any duplicate/conflicting policies (both naming variants)
DROP POLICY IF EXISTS "Users can view own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can insert own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can update own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can delete own apple health tokens" ON public.apple_health_tokens;

DROP POLICY IF EXISTS "Users can view their own Apple Health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can insert their own Apple Health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can update their own Apple Health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can delete their own Apple Health tokens" ON public.apple_health_tokens;

-- Re-create a single set of policies per action using (select auth.uid())
CREATE POLICY "Users can view their own Apple Health tokens" ON public.apple_health_tokens
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert their own Apple Health tokens" ON public.apple_health_tokens
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own Apple Health tokens" ON public.apple_health_tokens
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own Apple Health tokens" ON public.apple_health_tokens
    FOR DELETE USING ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- 2) DATA POINTS: avoid multiple permissive SELECT policies; split non-SELECT
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.data_points ENABLE ROW LEVEL SECURITY;

-- Drop previous/duplicate policies by common names
DROP POLICY IF EXISTS "Users can manage their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can view own data points and shared data" ON public.data_points;
DROP POLICY IF EXISTS "Users can view their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can insert their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can update their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can delete their own data points" ON public.data_points;

-- Single SELECT policy for own + shared variables
CREATE POLICY "Users can view own data points and shared data" ON public.data_points
    FOR SELECT USING (
        (select auth.uid()) = user_id OR 
        EXISTS (
            SELECT 1 FROM public.user_variable_preferences uvp 
            WHERE uvp.variable_id = public.data_points.variable_id 
              AND uvp.is_shared = true
        )
    );

-- Non-SELECT operations split to avoid duplicate permissive SELECT policies
CREATE POLICY "Users can insert own data points" ON public.data_points
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own data points" ON public.data_points
    FOR UPDATE USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own data points" ON public.data_points
    FOR DELETE USING ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- 3) PROFILES: single public SELECT; split write operations per action
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop conflicting/duplicate policies
DROP POLICY IF EXISTS "Public read profiles and users can manage own" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Keep read fully public
CREATE POLICY "Public read profiles" ON public.profiles
    FOR SELECT USING (true);

-- Write policies per action (owner-only)
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING ((select auth.uid()) = id);


-- ---------------------------------------------------------------------------
-- 4) ROADMAP LIKES: one SELECT policy; split insert/delete
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.roadmap_likes ENABLE ROW LEVEL SECURITY;

-- Drop duplicates to ensure only one SELECT policy remains
DROP POLICY IF EXISTS "Anyone can view roadmap likes" ON public.roadmap_likes;
DROP POLICY IF EXISTS "Users can manage own roadmap likes" ON public.roadmap_likes;
DROP POLICY IF EXISTS "Users can delete own roadmap likes" ON public.roadmap_likes;
DROP POLICY IF EXISTS "Users can insert own roadmap likes" ON public.roadmap_likes;

CREATE POLICY "Anyone can view roadmap likes" ON public.roadmap_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own roadmap likes" ON public.roadmap_likes
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own roadmap likes" ON public.roadmap_likes
    FOR DELETE USING ((select auth.uid()) = user_id);


-- ---------------------------------------------------------------------------
-- 5) UNITS: avoid ALL policy causing duplicate SELECT; use role-scoped policies
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.units ENABLE ROW LEVEL SECURITY;

-- Drop prior variants
DROP POLICY IF EXISTS "Units are readable by all authenticated users" ON public.units;
DROP POLICY IF EXISTS "Authenticated users can manage units" ON public.units;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.units;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.units;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON public.units;
DROP POLICY IF EXISTS "Allow delete for owner" ON public.units;

-- Read-only for authenticated users, without calling auth.role()
CREATE POLICY "Units are readable by all authenticated users" ON public.units
    FOR SELECT TO authenticated USING (true);

-- Write policies per action for authenticated users (no SELECT implied)
CREATE POLICY "Authenticated users can insert units" ON public.units
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update units" ON public.units
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete units" ON public.units
    FOR DELETE TO authenticated USING (true);


-- ---------------------------------------------------------------------------
-- 6) DROP DUPLICATE INDEXES SAFELY (idempotent)
-- ---------------------------------------------------------------------------

-- data_points: drop duplicate unique constraint when identical to pkey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'logs_id_key' 
      AND conrelid = 'public.data_points'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.data_points DROP CONSTRAINT logs_id_key';
  END IF;
END $$;

-- notification_preferences: drop the extra unique if duplicated
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notification_preferences_user_id_unique' 
      AND conrelid = 'public.notification_preferences'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.notification_preferences DROP CONSTRAINT notification_preferences_user_id_unique';
  ELSIF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND indexname = 'notification_preferences_user_id_unique'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS public.notification_preferences_user_id_unique';
  END IF;
END $$;

-- routine_variables: if two indexes have identical definitions, drop one
DO $$
DECLARE
  def1 text;
  def2 text;
BEGIN
  SELECT indexdef INTO def1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'routine_variables' AND indexname = 'idx_routine_variables_user_weekdays';
  SELECT indexdef INTO def2 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'routine_variables' AND indexname = 'routine_variables_routine_id_idx';
  IF def1 IS NOT NULL AND def2 IS NOT NULL AND def1 = def2 THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_routine_variables_user_weekdays';
  END IF;
END $$;

-- withings_variable_data_points: drop duplicate user_id index by older name
DO $$
DECLARE
  w1 text;
  w2 text;
BEGIN
  SELECT indexdef INTO w1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'withings_variable_data_points' AND indexname = 'idx_withings_variable_data_points_user_id';
  SELECT indexdef INTO w2 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'withings_variable_data_points' AND indexname = 'idx_withings_variable_logs_user_id';
  IF w1 IS NOT NULL AND w2 IS NOT NULL AND w1 = w2 THEN
    EXECUTE 'DROP INDEX IF EXISTS public.idx_withings_variable_logs_user_id';
  END IF;
END $$;

-- withings_variable_data_points: drop duplicate unique constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'withings_variable_data_points_id_key' 
      AND conrelid = 'public.withings_variable_data_points'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.withings_variable_data_points DROP CONSTRAINT withings_variable_data_points_id_key';
  END IF;
END $$;

-- End of migration


