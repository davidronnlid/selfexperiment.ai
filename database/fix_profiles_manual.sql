-- Manual fix for missing profiles issue
-- Run these commands in your Supabase SQL editor

-- 1. First, create profiles for any auth users who don't have them
INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url)
SELECT 
  au.id,
  NULL, -- Will be filled during profile completion
  NULL, -- Will be filled during profile completion  
  NULL, -- Optional
  au.raw_user_meta_data->>'avatar_url' -- Get avatar from OAuth if available
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 2. Create the trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url)
  VALUES (
    NEW.id,
    NULL, -- Will be filled during profile completion
    NULL, -- Will be filled during profile completion
    NULL, -- Optional
    NEW.raw_user_meta_data->>'avatar_url' -- Get avatar from OAuth if available
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Verify the fix by checking profiles
SELECT 
  au.id as auth_user_id,
  au.email,
  p.id as profile_id,
  p.username,
  p.name
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC; 

-- Add timezone column to profiles table
ALTER TABLE profiles
ADD COLUMN timezone text DEFAULT 'Europe/Stockholm'; 