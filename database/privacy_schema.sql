-- Privacy and Sharing System Database Schema

-- Variable sharing settings table
-- Controls which variable types a user wants to share with others
CREATE TABLE IF NOT EXISTS variable_sharing_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_name TEXT NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    variable_type TEXT NOT NULL CHECK (variable_type IN ('predefined', 'custom', 'oura')),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, variable_name)
);

-- Individual log privacy settings table
-- Controls which specific logged values a user wants to hide from others
CREATE TABLE IF NOT EXISTS log_privacy_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    log_id INTEGER NOT NULL, -- References daily_logs.id or oura_data.id
    log_type TEXT NOT NULL CHECK (log_type IN ('daily_log', 'oura_data')),
    is_hidden BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, log_id, log_type)
);

-- User following table (for future feature)
-- Tracks which users follow each other
CREATE TABLE IF NOT EXISTS user_follows (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id) -- Users cannot follow themselves
);

-- User profile visibility settings
-- Controls overall profile visibility and sharing preferences
CREATE TABLE IF NOT EXISTS user_privacy_profile (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    profile_visibility TEXT DEFAULT 'private' CHECK (profile_visibility IN ('public', 'private', 'followers_only')),
    allow_follow_requests BOOLEAN DEFAULT true,
    show_username_in_shared_data BOOLEAN DEFAULT false,
    anonymize_shared_data BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Variable sharing settings policies
ALTER TABLE variable_sharing_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own variable sharing settings
CREATE POLICY "Users can view own variable sharing settings" ON variable_sharing_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only modify their own variable sharing settings
CREATE POLICY "Users can modify own variable sharing settings" ON variable_sharing_settings
    FOR ALL USING (auth.uid() = user_id);

-- Log privacy settings policies
ALTER TABLE log_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own log privacy settings
CREATE POLICY "Users can view own log privacy settings" ON log_privacy_settings
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only modify their own log privacy settings
CREATE POLICY "Users can modify own log privacy settings" ON log_privacy_settings
    FOR ALL USING (auth.uid() = user_id);

-- User follows policies
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Users can see who they follow and who follows them
CREATE POLICY "Users can view their follows" ON user_follows
    FOR SELECT USING (auth.uid() = follower_id OR auth.uid() = following_id);

-- Users can create and delete their own follows
CREATE POLICY "Users can manage their follows" ON user_follows
    FOR ALL USING (auth.uid() = follower_id);

-- User privacy profile policies
ALTER TABLE user_privacy_profile ENABLE ROW LEVEL SECURITY;

-- Users can view their own privacy profile
CREATE POLICY "Users can view own privacy profile" ON user_privacy_profile
    FOR SELECT USING (auth.uid() = user_id);

-- Users can modify their own privacy profile
CREATE POLICY "Users can modify own privacy profile" ON user_privacy_profile
    FOR ALL USING (auth.uid() = user_id);

-- Functions for privacy-aware data access

-- Function to get shared variables for a user
CREATE OR REPLACE FUNCTION get_shared_variables(target_user_id UUID)
RETURNS TABLE(variable_name TEXT, variable_type TEXT, category TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT vss.variable_name, vss.variable_type, vss.category
    FROM variable_sharing_settings vss
    WHERE vss.user_id = target_user_id AND vss.is_shared = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get shared logs for a user (respecting privacy settings)
CREATE OR REPLACE FUNCTION get_shared_logs(target_user_id UUID, viewer_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    log_id INTEGER,
    variable_name TEXT,
    value TEXT,
    date TIMESTAMP WITH TIME ZONE,
    log_type TEXT
) AS $$
BEGIN
    -- If viewer is the same as target user, show all logs
    IF target_user_id = viewer_user_id THEN
        RETURN QUERY
        SELECT 
            dl.id as log_id,
            dl.label as variable_name,
            dl.value,
            dl.date,
            'daily_log' as log_type
        FROM daily_logs dl
        WHERE dl.user_id = target_user_id
        UNION ALL
        SELECT 
            od.id as log_id,
            od.metric_name as variable_name,
            od.value::TEXT,
            od.timestamp as date,
            'oura_data' as log_type
        FROM oura_data od
        WHERE od.user_id = target_user_id;
    ELSE
        -- For other viewers, only show shared logs that aren't hidden
        RETURN QUERY
        SELECT 
            dl.id as log_id,
            dl.label as variable_name,
            dl.value,
            dl.date,
            'daily_log' as log_type
        FROM daily_logs dl
        JOIN variable_sharing_settings vss ON vss.variable_name = dl.label AND vss.user_id = dl.user_id
        LEFT JOIN log_privacy_settings lps ON lps.log_id = dl.id AND lps.user_id = dl.user_id AND lps.log_type = 'daily_log'
        WHERE dl.user_id = target_user_id 
          AND vss.is_shared = true
          AND (lps.is_hidden IS NULL OR lps.is_hidden = false)
        UNION ALL
        SELECT 
            od.id as log_id,
            od.metric_name as variable_name,
            od.value::TEXT,
            od.timestamp as date,
            'oura_data' as log_type
        FROM oura_data od
        JOIN variable_sharing_settings vss ON vss.variable_name = od.metric_name AND vss.user_id = od.user_id
        LEFT JOIN log_privacy_settings lps ON lps.log_id = od.id AND lps.user_id = od.user_id AND lps.log_type = 'oura_data'
        WHERE od.user_id = target_user_id 
          AND vss.is_shared = true
          AND (lps.is_hidden IS NULL OR lps.is_hidden = false);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variable_sharing_user_id ON variable_sharing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_sharing_shared ON variable_sharing_settings(is_shared);
CREATE INDEX IF NOT EXISTS idx_log_privacy_user_id ON log_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_log_privacy_log_id ON log_privacy_settings(log_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_privacy_profile_user_id ON user_privacy_profile(user_id);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variable_sharing_updated_at
    BEFORE UPDATE ON variable_sharing_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_log_privacy_updated_at
    BEFORE UPDATE ON log_privacy_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_privacy_profile_updated_at
    BEFORE UPDATE ON user_privacy_profile
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 