-- ============================================================================
-- CREATE USER_FOLLOWS TABLE WITH RLS POLICIES
-- ============================================================================

-- 1. Create user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- 2. Enable RLS on user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 3. Create optimized RLS policies for user_follows
DROP POLICY IF EXISTS "Users can view their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;

-- Users can see who they follow and who follows them
CREATE POLICY "Users can view their follows" ON user_follows
    FOR SELECT USING ((select auth.uid()) = follower_id OR (select auth.uid()) = following_id);

-- Users can create and delete their own follows
CREATE POLICY "Users can manage their follows" ON user_follows
    FOR ALL USING ((select auth.uid()) = follower_id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);

-- 5. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_follows TO authenticated;
