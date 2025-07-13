-- Create the user_variable_preferences table
-- This table stores user-specific preferences for variables including sharing settings

CREATE TABLE IF NOT EXISTS user_variable_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- User-specific settings
    preferred_unit TEXT, -- User's preferred display unit
    display_name TEXT, -- Custom name for this user
    is_tracked BOOLEAN DEFAULT true, -- Whether user wants to track this variable
    tracking_frequency TEXT DEFAULT 'daily', -- How often user wants to track
    
    -- Privacy settings
    is_shared BOOLEAN DEFAULT false, -- Whether this variable is shared
    share_level TEXT DEFAULT 'private' CHECK (share_level IN ('private', 'friends', 'public')),
    
    -- UI preferences
    display_order INTEGER DEFAULT 0, -- Custom ordering
    is_favorite BOOLEAN DEFAULT false, -- Quick access flag
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, variable_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_user_id ON user_variable_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_variable_id ON user_variable_preferences(variable_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_tracked ON user_variable_preferences(is_tracked);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_shared ON user_variable_preferences(is_shared);

-- Enable Row Level Security (RLS)
ALTER TABLE user_variable_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
CREATE POLICY "Users can view own variable preferences" ON user_variable_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own variable preferences" ON user_variable_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_variable_preferences_updated_at
    BEFORE UPDATE ON user_variable_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 