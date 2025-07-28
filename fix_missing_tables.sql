-- ============================================================================
-- FIX MISSING TABLES AND RLS POLICIES
-- ============================================================================
-- Based on the 404 errors, several tables and functions are missing

-- 1. Create user_follows table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_follows (
    id SERIAL PRIMARY KEY,
    follower_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- 2. Enable RLS on user_follows
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for user_follows
DROP POLICY IF EXISTS "Users can view their follows" ON user_follows;
DROP POLICY IF EXISTS "Users can manage their follows" ON user_follows;

CREATE POLICY "Users can view their follows" ON user_follows
    FOR SELECT USING ((select auth.uid()) = follower_id OR (select auth.uid()) = following_id);

CREATE POLICY "Users can manage their follows" ON user_follows
    FOR ALL USING ((select auth.uid()) = follower_id);

-- 4. Create data_points table if it doesn't exist (main health data table)
CREATE TABLE IF NOT EXISTS data_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    variable_id UUID NOT NULL,
    value TEXT NOT NULL,
    notes TEXT,
    date DATE NOT NULL,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS on data_points
ALTER TABLE data_points ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for data_points
DROP POLICY IF EXISTS "Users can view own data points and shared data" ON data_points;
DROP POLICY IF EXISTS "Users can manage their own data points" ON data_points;

CREATE POLICY "Users can view own data points and shared data" ON data_points
    FOR SELECT USING (
        (select auth.uid()) = user_id OR 
        EXISTS (
            SELECT 1 FROM user_variable_preferences uvp 
            WHERE uvp.variable_id = data_points.variable_id 
            AND uvp.user_id = data_points.user_id
            AND uvp.is_shared = true
        )
    );

CREATE POLICY "Users can manage their own data points" ON data_points
    FOR ALL USING ((select auth.uid()) = user_id);

-- 7. Create user_variable_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_variable_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID NOT NULL,
    is_shared BOOLEAN DEFAULT false,
    display_unit TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, variable_id)
);

-- 8. Enable RLS on user_variable_preferences
ALTER TABLE user_variable_preferences ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for user_variable_preferences
DROP POLICY IF EXISTS "Users can view own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Users can manage own variable preferences" ON user_variable_preferences;
DROP POLICY IF EXISTS "Public read shared variable settings" ON user_variable_preferences;

CREATE POLICY "Users can view own variable preferences" ON user_variable_preferences
    FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage own variable preferences" ON user_variable_preferences
    FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Public read shared variable settings" ON user_variable_preferences
    FOR SELECT USING (is_shared = true);

-- 10. Create variables table if it doesn't exist (reference table)
CREATE TABLE IF NOT EXISTS variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL,
    slug TEXT UNIQUE,
    data_type TEXT DEFAULT 'text',
    category TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 11. Enable RLS on variables
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for variables
DROP POLICY IF EXISTS "Public read access to variables" ON variables;
DROP POLICY IF EXISTS "Authenticated users can create variables" ON variables;
DROP POLICY IF EXISTS "Users can update their own variables" ON variables;
DROP POLICY IF EXISTS "Users can delete their own variables" ON variables;

CREATE POLICY "Public read access to variables" ON variables
    FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can create variables" ON variables
    FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);

CREATE POLICY "Users can update their own variables" ON variables
    FOR UPDATE TO authenticated 
    USING (created_by = (select auth.uid()))
    WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Users can delete their own variables" ON variables
    FOR DELETE TO authenticated 
    USING (created_by = (select auth.uid()));

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_data_points_user_id ON data_points(user_id);
CREATE INDEX IF NOT EXISTS idx_data_points_variable_id ON data_points(variable_id);
CREATE INDEX IF NOT EXISTS idx_data_points_date ON data_points(date);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_user_id ON user_variable_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_variable_id ON user_variable_preferences(variable_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_shared ON user_variable_preferences(is_shared);

-- 14. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_follows TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_points TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_variable_preferences TO authenticated;
GRANT SELECT ON variables TO public;
GRANT INSERT, UPDATE, DELETE ON variables TO authenticated;

SELECT '✅ Tables and policies created/updated successfully!' as result; 