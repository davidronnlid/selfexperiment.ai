-- ============================================================================
-- FIX AUTH TIMEOUT ISSUES
-- ============================================================================
-- This script addresses authentication timeout issues by:
-- 1. Creating missing profiles for users who don't have them
-- 2. Optimizing RLS policies for better performance
-- 3. Adding proper indexes for faster profile queries

-- 1. CREATE MISSING PROFILES FOR ALL USERS
-- ============================================================================

-- First, check if profiles table exists and has all required columns
DO $$ 
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'timezone') THEN
        ALTER TABLE profiles ADD COLUMN timezone text DEFAULT 'Europe/Stockholm';
    END IF;
END $$;

-- Create profiles for any auth users who don't have them
INSERT INTO public.profiles (id, username, name, avatar_url, email)
SELECT 
  au.id,
  NULL, -- Will be filled during profile completion
  NULL, -- Will be filled during profile completion  
  COALESCE(
    au.raw_user_meta_data->>'picture', -- Google OAuth uses 'picture'
    au.raw_user_meta_data->>'avatar_url' -- Other OAuth providers
  ),
  au.email
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists

-- 2. OPTIMIZE PROFILE CREATION TRIGGER
-- ============================================================================

-- Create or update the trigger function for automatic profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, avatar_url, email)
  VALUES (
    NEW.id,
    NULL, -- Will be filled during profile completion
    NULL, -- Will be filled during profile completion
    COALESCE(
      NEW.raw_user_meta_data->>'picture', -- Google OAuth uses 'picture'
      NEW.raw_user_meta_data->>'avatar_url' -- Other OAuth providers
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. OPTIMIZE RLS POLICIES FOR PERFORMANCE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public read profiles and users can manage own" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create optimized policies with (select auth.uid()) for better performance
CREATE POLICY "Public read profiles" ON profiles
    FOR SELECT USING (true); -- Allow all users to read profiles

CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING ((select auth.uid()) = id);

-- 4. ADD PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes for faster profile queries
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email) WHERE email IS NOT NULL;

-- 5. VERIFY THE FIX
-- ============================================================================

-- Check that all auth users have profiles
DO $$
DECLARE
    missing_profiles_count INTEGER;
    total_users_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users_count FROM auth.users;
    
    SELECT COUNT(*) INTO missing_profiles_count 
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL;
    
    RAISE NOTICE 'Total auth users: %, Users without profiles: %', total_users_count, missing_profiles_count;
    
    IF missing_profiles_count > 0 THEN
        RAISE WARNING 'There are still % users without profiles. Please check the profile creation trigger.', missing_profiles_count;
    ELSE
        RAISE NOTICE 'All users have profiles. Profile creation is working correctly.';
    END IF;
END $$;

-- 6. CLEANUP AND MAINTENANCE
-- ============================================================================

-- Update updated_at timestamp for profiles table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'Auth timeout fix completed successfully!';
    RAISE NOTICE '1. Missing profiles have been created';
    RAISE NOTICE '2. RLS policies have been optimized';
    RAISE NOTICE '3. Performance indexes have been added';
    RAISE NOTICE '4. Profile creation trigger has been updated';
END $$;
