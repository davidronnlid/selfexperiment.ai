-- Check if user_follows table exists specifically
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_follows'
) as user_follows_exists;

-- If it exists, check its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_follows' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies on user_follows
SELECT policyname, cmd, permissive, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_follows' 
    AND schemaname = 'public';

-- Check if there's any data in user_follows (if it exists)
-- SELECT COUNT(*) as total_follows FROM user_follows; 