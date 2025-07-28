-- ============================================================================
-- TEST COMMUNITY FEATURES (FOLLOW & SHARED VARIABLES)
-- ============================================================================
-- Run these in Supabase SQL Editor to test the functionality

-- 1. Test if shared data functions exist
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name IN (
        'get_user_shared_variables', 
        'get_shared_data_points', 
        'get_all_shared_data_points'
    );

-- 2. Test user_follows table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_follows' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Test if data_points table exists (the correct table name)
SELECT COUNT(*) as total_data_points 
FROM data_points;

-- 4. Test user_variable_preferences for sharing
SELECT 
    COUNT(*) as total_preferences,
    COUNT(CASE WHEN is_shared = true THEN 1 END) as shared_preferences,
    COUNT(DISTINCT user_id) as users_with_preferences
FROM user_variable_preferences;

-- 5. Sample test of get_user_shared_variables function 
-- (Replace 'test-user-id' with an actual user UUID)
/*
SELECT * FROM get_user_shared_variables('test-user-id');
*/

-- 6. Test follow functionality with sample data
-- (Replace with actual user UUIDs to test)
/*
-- Test creating a follow relationship
INSERT INTO user_follows (follower_id, following_id) 
VALUES ('user1-uuid', 'user2-uuid')
ON CONFLICT (follower_id, following_id) DO NOTHING;

-- Test getting follower count
SELECT COUNT(*) as follower_count 
FROM user_follows 
WHERE following_id = 'user2-uuid';

-- Test getting following count  
SELECT COUNT(*) as following_count 
FROM user_follows 
WHERE follower_id = 'user1-uuid';
*/

-- 7. Check RLS policies are working
SELECT 
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%(select auth.%' THEN '✅ OPTIMIZED'
        WHEN qual LIKE '%auth.%' THEN '⚠️ NEEDS OPTIMIZATION'
        ELSE '✓ NO AUTH'
    END as optimization_status
FROM pg_policies 
WHERE tablename IN ('user_follows', 'data_points', 'user_variable_preferences')
    AND schemaname = 'public'
ORDER BY tablename, policyname; 