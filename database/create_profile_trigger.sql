-- Trigger to automatically create profiles for new users
-- This ensures that every user (including OAuth users) gets a profile record

-- Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile record for the new user
  INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url)
  VALUES (
    NEW.id,
    NULL, -- Will be filled in by user during profile completion
    NULL, -- Will be filled in by user during profile completion
    NULL, -- Optional field
    NEW.raw_user_meta_data->>'avatar_url' -- Get avatar from OAuth if available
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on the auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Also create any missing profiles for existing users
INSERT INTO public.profiles (id, username, name, date_of_birth, avatar_url)
SELECT 
  au.id,
  NULL,
  NULL,
  NULL,
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL; 