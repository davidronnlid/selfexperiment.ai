-- ============================================================================
-- OPTIMIZE USER_FOLLOWS RLS POLICIES FOR PERFORMANCE
-- ============================================================================
-- This optimizes auth function calls for better query performance

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;

-- Recreate with optimized auth function calls
CREATE POLICY "Users can view their follows" ON user_follows
    FOR SELECT USING ((select auth.uid()) = follower_id OR (select auth.uid()) = following_id);

CREATE POLICY "Users can manage their follows" ON user_follows
    FOR ALL USING ((select auth.uid()) = follower_id); 