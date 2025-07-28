-- ============================================================================
-- CREATE PROFILES AND OTHER ESSENTIAL TABLES
-- ============================================================================

-- 1. Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS policies for profiles
DROP POLICY IF EXISTS "Public read profiles and users can manage own" ON profiles;
DROP POLICY IF EXISTS "Users can manage own profile" ON profiles;

CREATE POLICY "Public read profiles and users can manage own" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING ((select auth.uid()) = id);

-- 4. Create data_point_likes table if it doesn't exist (for liking shared data)
CREATE TABLE IF NOT EXISTS data_point_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_point_id UUID REFERENCES data_points(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(data_point_id, user_id)
);

-- 5. Enable RLS on data_point_likes
ALTER TABLE data_point_likes ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for data_point_likes
DROP POLICY IF EXISTS "Users can view data point likes" ON data_point_likes;
DROP POLICY IF EXISTS "Users can manage their own likes" ON data_point_likes;

CREATE POLICY "Users can view data point likes" ON data_point_likes
    FOR SELECT USING (true); -- Anyone can see likes (for public shared data)

CREATE POLICY "Users can manage their own likes" ON data_point_likes
    FOR ALL USING ((select auth.uid()) = user_id);

-- 7. Create units table if it doesn't exist (for variable units)
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Enable RLS on units
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for units
DROP POLICY IF EXISTS "Units are readable by all authenticated users" ON units;
DROP POLICY IF EXISTS "Authenticated users can manage units" ON units;

CREATE POLICY "Units are readable by all authenticated users" ON units
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage units" ON units
    FOR ALL TO authenticated USING (true);

-- 10. Create variable_units table if it doesn't exist (links variables to units)
CREATE TABLE IF NOT EXISTS variable_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    conversion_factor DECIMAL(10,4) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(variable_id, unit_id)
);

-- 11. Enable RLS on variable_units
ALTER TABLE variable_units ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for variable_units
DROP POLICY IF EXISTS "Variable units are viewable by all authenticated users" ON variable_units;

CREATE POLICY "Variable units are viewable by all authenticated users" ON variable_units
    FOR SELECT TO authenticated USING (true);

-- 13. Insert some basic units if they don't exist
INSERT INTO units (symbol, name, category) VALUES
    ('kg', 'Kilograms', 'weight'),
    ('lbs', 'Pounds', 'weight'),
    ('g', 'Grams', 'weight'),
    ('ml', 'Milliliters', 'volume'),
    ('l', 'Liters', 'volume'),
    ('cups', 'Cups', 'volume'),
    ('pieces', 'Pieces', 'count'),
    ('minutes', 'Minutes', 'time'),
    ('hours', 'Hours', 'time'),
    ('°C', 'Celsius', 'temperature'),
    ('°F', 'Fahrenheit', 'temperature'),
    ('steps', 'Steps', 'count'),
    ('rating', 'Rating (1-10)', 'scale'),
    ('yes/no', 'Yes/No', 'boolean'),
    ('cm', 'Centimeters', 'length'),
    ('inches', 'Inches', 'length')
ON CONFLICT (symbol) DO NOTHING;

-- 14. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_data_point_likes_data_point_id ON data_point_likes(data_point_id);
CREATE INDEX IF NOT EXISTS idx_data_point_likes_user_id ON data_point_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_units_variable_id ON variable_units(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_units_unit_id ON variable_units(unit_id);

-- 15. Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT ON profiles TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON data_point_likes TO authenticated;
GRANT SELECT ON data_point_likes TO public;
GRANT SELECT ON units TO authenticated;
GRANT SELECT ON units TO public;
GRANT SELECT ON variable_units TO authenticated;
GRANT SELECT ON variable_units TO public;

SELECT '✅ Profiles and supporting tables created successfully!' as result; 