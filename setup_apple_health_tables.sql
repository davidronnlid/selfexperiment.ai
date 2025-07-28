-- Apple Health Tables Setup for Localhost
-- Run this in your Supabase SQL editor or database

-- 1. Create apple_health_tokens table
CREATE TABLE IF NOT EXISTS apple_health_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create apple_health_variable_data_points table
CREATE TABLE IF NOT EXISTS apple_health_variable_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  variable_id TEXT NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  source TEXT DEFAULT 'apple_health',
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, variable_id)
);

-- 3. Insert Apple Health variables
INSERT INTO variables (slug, label, icon, category, unit, is_active, is_public, source)
VALUES 
  ('ah_steps', 'Steps (Apple Health)', '👣', 'Activity', 'steps', true, true, 'apple_health'),
  ('ah_heart_rate', 'Heart Rate (Apple Health)', '❤️', 'Vitals', 'bpm', true, true, 'apple_health'),
  ('ah_weight', 'Weight (Apple Health)', '⚖️', 'Body', 'kg', true, true, 'apple_health'),
  ('ah_sleep_duration', 'Sleep Duration (Apple Health)', '😴', 'Sleep', 'hours', true, true, 'apple_health'),
  ('ah_active_calories', 'Active Calories (Apple Health)', '🔥', 'Activity', 'kcal', true, true, 'apple_health')
ON CONFLICT (slug) DO NOTHING;

-- 4. Create a test connection token
INSERT INTO apple_health_tokens (user_id, access_token, refresh_token, expires_at)
VALUES (
  'bb0ac2ff-72c5-4776-a83a-01855bff4df0',
  'ah_test_token_' || extract(epoch from now()),
  'ah_test_token_' || extract(epoch from now()),
  now() + interval '1 year'
)
ON CONFLICT (user_id) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  refresh_token = EXCLUDED.refresh_token,
  expires_at = EXCLUDED.expires_at,
  updated_at = now();

-- 5. Verify setup
SELECT 'Apple Health tables created successfully!' as status; 