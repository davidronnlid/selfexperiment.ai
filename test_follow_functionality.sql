-- ============================================================================
-- TEST FOLLOW FUNCTIONALITY
-- ============================================================================
-- Run these queries to verify the follow system is working correctly

-- 1. Check if user_follows table exists and has correct structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_follows' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Verify RLS is enabled on user_follows
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '✅ RLS ENABLED' ELSE '❌ RLS DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'user_follows' 
    AND schemaname = 'public';

-- 3. Check current RLS policies on user_follows
SELECT 
    policyname,
    cmd as operation,
    permissive,
    qual as using_condition,
    with_check
FROM pg_policies 
WHERE tablename = 'user_follows' 
    AND schemaname = 'public'
ORDER BY policyname;

-- 4. Test follow relationship creation (replace UUIDs with actual user IDs)
-- INSERT INTO user_follows (follower_id, following_id) 
-- VALUES ('your-user-id', 'target-user-id');

-- 5. Check for any existing follows in the system
SELECT 
    COUNT(*) as total_follows,
    COUNT(DISTINCT follower_id) as unique_followers,
    COUNT(DISTINCT following_id) as unique_following
FROM user_follows;

-- 6. Sample query to get follower count for a user (replace UUID)
-- SELECT COUNT(*) as follower_count 
-- FROM user_follows 
-- WHERE following_id = 'target-user-id';

-- 7. Sample query to get who a user is following (replace UUID)
-- SELECT COUNT(*) as following_count 
-- FROM user_follows 
-- WHERE follower_id = 'your-user-id';

-- 8. Verify no duplicate constraints violations
SELECT 
    follower_id, 
    following_id, 
    COUNT(*) as duplicate_count
FROM user_follows 
GROUP BY follower_id, following_id 
HAVING COUNT(*) > 1;

-- 9. Check for self-follows (should be prevented by CHECK constraint)
SELECT COUNT(*) as self_follows 
FROM user_follows 
WHERE follower_id = following_id; 