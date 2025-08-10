-- Direct RLS Performance Fix - extracted from migration 20250129000007
-- This addresses the Supabase linter warnings about auth.uid() performance

-- Fix Apple Health tokens policies
ALTER TABLE IF EXISTS public.apple_health_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can insert own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can update own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can delete own apple health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can view their own Apple Health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can insert their own Apple Health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can update their own Apple Health tokens" ON public.apple_health_tokens;
DROP POLICY IF EXISTS "Users can delete their own Apple Health tokens" ON public.apple_health_tokens;

CREATE POLICY "Users can view their own Apple Health tokens" ON public.apple_health_tokens
    FOR SELECT USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert their own Apple Health tokens" ON public.apple_health_tokens
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update their own Apple Health tokens" ON public.apple_health_tokens
    FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete their own Apple Health tokens" ON public.apple_health_tokens
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix data points policies to avoid multiple permissive SELECT
ALTER TABLE IF EXISTS public.data_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can view own data points and shared data" ON public.data_points;
DROP POLICY IF EXISTS "Users can view their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can insert their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can update their own data points" ON public.data_points;
DROP POLICY IF EXISTS "Users can delete their own data points" ON public.data_points;

CREATE POLICY "Users can view own data points and shared data" ON public.data_points
    FOR SELECT USING (
        (select auth.uid()) = user_id OR 
        EXISTS (
            SELECT 1 FROM public.user_variable_preferences uvp 
            WHERE uvp.variable_id = public.data_points.variable_id 
              AND uvp.is_shared = true
        )
    );
CREATE POLICY "Users can insert own data points" ON public.data_points
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own data points" ON public.data_points
    FOR UPDATE USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own data points" ON public.data_points
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix profiles policies
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read profiles and users can manage own" ON public.profiles;
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;

CREATE POLICY "Public read profiles" ON public.profiles
    FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id);
CREATE POLICY "Users can delete own profile" ON public.profiles
    FOR DELETE USING ((select auth.uid()) = id);

-- Fix roadmap likes policies
ALTER TABLE IF EXISTS public.roadmap_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view roadmap likes" ON public.roadmap_likes;
DROP POLICY IF EXISTS "Users can manage own roadmap likes" ON public.roadmap_likes;

CREATE POLICY "Anyone can view roadmap likes" ON public.roadmap_likes
    FOR SELECT USING (true);
CREATE POLICY "Users can insert own roadmap likes" ON public.roadmap_likes
    FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own roadmap likes" ON public.roadmap_likes
    FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix units policies
ALTER TABLE IF EXISTS public.units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Units are readable by all authenticated users" ON public.units;
DROP POLICY IF EXISTS "Authenticated users can manage units" ON public.units;

CREATE POLICY "Units are readable by all authenticated users" ON public.units
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert units" ON public.units
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update units" ON public.units
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete units" ON public.units
    FOR DELETE TO authenticated USING (true);

SELECT 'RLS Performance fixes applied successfully!' as status;
