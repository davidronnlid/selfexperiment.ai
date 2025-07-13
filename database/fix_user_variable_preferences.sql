-- Fix user_variable_preferences table
-- Run this in your Supabase SQL Editor

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS user_variable_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- User-specific settings
    preferred_unit TEXT,
    display_name TEXT,
    is_tracked BOOLEAN DEFAULT true,
    tracking_frequency TEXT DEFAULT 'daily',
    
    -- Privacy settings
    is_shared BOOLEAN DEFAULT false,
    share_level TEXT DEFAULT 'private' CHECK (share_level IN ('private', 'friends', 'public')),
    
    -- UI preferences
    display_order INTEGER DEFAULT 0,
    is_favorite BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, variable_id)
);

-- Add the display_order column if it doesn't exist
ALTER TABLE user_variable_preferences 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_user_id ON user_variable_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_variable_id ON user_variable_preferences(variable_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_tracked ON user_variable_preferences(is_tracked);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_shared ON user_variable_preferences(is_shared);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_display_order ON user_variable_preferences(display_order);

-- Enable Row Level Security (RLS)
ALTER TABLE user_variable_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can manage own variable preferences" ON user_variable_preferences;

CREATE POLICY "Users can view own variable preferences" ON user_variable_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own variable preferences" ON user_variable_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Update any existing records to have a default display_order
UPDATE user_variable_preferences 
SET display_order = 0 
WHERE display_order IS NULL;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_variable_preferences_updated_at ON user_variable_preferences;
CREATE TRIGGER update_user_variable_preferences_updated_at
    BEFORE UPDATE ON user_variable_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 