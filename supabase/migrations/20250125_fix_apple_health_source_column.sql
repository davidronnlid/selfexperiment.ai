-- Fix apple_health_variable_data_points table schema
-- Drop and recreate with correct schema (no source field to avoid conflicts)

DROP TABLE IF EXISTS apple_health_variable_data_points CASCADE;

CREATE TABLE apple_health_variable_data_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  variable_id TEXT NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date, variable_id)
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_user_id ON apple_health_variable_data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_variable_id ON apple_health_variable_data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_apple_health_variable_data_points_date ON apple_health_variable_data_points(date);

-- Enable RLS
ALTER TABLE apple_health_variable_data_points ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY apple_health_data_user_access ON apple_health_variable_data_points
  FOR ALL USING (auth.uid() = user_id); 