-- Add email column to profiles table and populate it
-- This migration adds email functionality to user profiles

-- Step 1: Add the email column to profiles table
ALTER TABLE profiles 
ADD COLUMN email text;

-- Step 2: Update the email column for existing users using auth.users data
-- We'll use a function to access auth.users data since direct joins might not work
CREATE OR REPLACE FUNCTION populate_profile_emails()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    auth_provider text;
BEGIN
    -- Loop through all profiles that don't have email set
    FOR user_record IN 
        SELECT p.id, p.email as profile_email
        FROM profiles p
        WHERE p.email IS NULL
    LOOP
        -- Get email and auth provider from auth.users
        -- Note: This requires service role access
        UPDATE profiles 
        SET email = (
            SELECT au.email 
            FROM auth.users au 
            WHERE au.id = user_record.id
        )
        WHERE id = user_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Execute the function to populate emails
SELECT populate_profile_emails();

-- Step 4: Update the profile creation trigger to include email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url, email)
  VALUES (
    NEW.id,
    NULL, -- Will be filled in by user during profile completion
    NULL, -- Will be filled in by user during profile completion
    NULL, -- Optional field
    COALESCE(
      NEW.raw_user_meta_data->>'picture', -- Google OAuth uses 'picture'
      NEW.raw_user_meta_data->>'avatar_url' -- Other OAuth providers might use 'avatar_url'
    ),
    NEW.email -- Add email from auth.users
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Clean up the temporary function
DROP FUNCTION populate_profile_emails();

-- Step 6: Add index on email for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Step 7: Verify the migration
SELECT 
  p.id,
  p.username,
  p.email,
  p.created_at
FROM profiles p
ORDER BY p.created_at DESC
LIMIT 10; 