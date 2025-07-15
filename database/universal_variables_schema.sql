-- Universal Variables System Database Schema
-- Optimized for efficient data storage, unit conversion, and analytics

-- ============================================================================
-- CORE VARIABLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL, -- Internal identifier (e.g., "weight", "sleep_duration")
    label TEXT NOT NULL, -- Human-readable name (e.g., "Weight", "Sleep Duration")
    description TEXT,
    icon TEXT,
    
    -- Data Type & Validation
    data_type TEXT NOT NULL CHECK (data_type IN ('continuous', 'categorical', 'boolean', 'time', 'text')),
    validation_rules JSONB, -- Flexible validation schema
    
    -- Unit System
    canonical_unit TEXT, -- Base unit for storage (e.g., "kg", "hours", "bpm")
    unit_group TEXT, -- Group for conversion (e.g., "mass", "time", "distance", "temperature")
    convertible_units JSONB, -- Available units for this variable (e.g., ["kg", "lb", "g"])
    default_display_unit TEXT, -- Preferred display unit per user
    
    -- Data Source & Collection
    source_type TEXT CHECK (source_type IN ('manual', 'withings', 'oura', 'apple_health', 'formula', 'calculated')),
    collection_method TEXT, -- How data is collected
    frequency TEXT DEFAULT 'daily', -- How often data is collected
    
    -- Categorization
    category TEXT, -- Primary category (e.g., "Physical Health", "Mental Health")
    subcategory TEXT, -- Secondary category
    tags TEXT[], -- Flexible tagging system
    
    -- Privacy & Sharing
    is_public BOOLEAN DEFAULT false, -- Whether this variable can be shared
    privacy_level TEXT DEFAULT 'private' CHECK (privacy_level IN ('private', 'friends', 'public')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    
    -- Performance indexes
    CONSTRAINT variables_slug_check CHECK (slug ~ '^[a-z0-9_]+$')
);

-- ============================================================================
-- USER VARIABLE PREFERENCES
-- ============================================================================

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

-- ============================================================================
-- VARIABLE DATA VALUES (Universal Log Table)
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Core data
    canonical_value NUMERIC, -- Stored in canonical unit
    display_value TEXT, -- Human-readable value as entered
    display_unit TEXT, -- Unit used for display
    
    -- Metadata
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT, -- How data was collected (manual, withings, oura, etc.)
    confidence_score NUMERIC DEFAULT 1.0, -- Data quality score (0-1)
    
    -- Additional context
    notes TEXT,
    tags TEXT[],
    location JSONB, -- GPS coordinates if applicable
    context JSONB, -- Additional context (weather, mood, etc.)
    
    -- Privacy
    is_private BOOLEAN DEFAULT false,
    
    -- Performance indexes
    CONSTRAINT variable_logs_canonical_value_check CHECK (canonical_value IS NOT NULL OR display_value IS NOT NULL)
);

-- ============================================================================
-- UNIT CONVERSION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS unit_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_unit TEXT NOT NULL,
    to_unit TEXT NOT NULL,
    conversion_factor NUMERIC NOT NULL,
    offset NUMERIC DEFAULT 0,
    formula TEXT, -- For complex conversions (e.g., temperature)
    
    -- Metadata
    unit_group TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(from_unit, to_unit)
);

-- ============================================================================
-- VARIABLE RELATIONSHIPS (for analytics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variable_id_1 UUID REFERENCES variables(id) ON DELETE CASCADE,
    variable_id_2 UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Relationship metadata
    relationship_type TEXT CHECK (relationship_type IN ('correlation', 'causation', 'inverse', 'composite')),
    strength NUMERIC, -- Correlation strength (-1 to 1)
    confidence NUMERIC, -- Statistical confidence (0-1)
    
    -- Analysis metadata
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sample_size INTEGER,
    methodology TEXT,
    
    UNIQUE(variable_id_1, variable_id_2)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Variables table indexes
CREATE INDEX IF NOT EXISTS idx_variables_slug ON variables(slug);
CREATE INDEX IF NOT EXISTS idx_variables_category ON variables(category);
CREATE INDEX IF NOT EXISTS idx_variables_data_type ON variables(data_type);
CREATE INDEX IF NOT EXISTS idx_variables_unit_group ON variables(unit_group);
CREATE INDEX IF NOT EXISTS idx_variables_is_active ON variables(is_active);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_user_id ON user_variable_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_variable_id ON user_variable_preferences(variable_id);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_tracked ON user_variable_preferences(is_tracked);
CREATE INDEX IF NOT EXISTS idx_user_variable_preferences_is_shared ON user_variable_preferences(is_shared);

-- Variable logs indexes
CREATE INDEX IF NOT EXISTS idx_variable_logs_user_id ON variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_logs_variable_id ON variable_logs(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_logs_logged_at ON variable_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_variable_logs_source ON variable_logs(source);
CREATE INDEX IF NOT EXISTS idx_variable_logs_is_private ON variable_logs(is_private);

-- Unit conversions indexes
CREATE INDEX IF NOT EXISTS idx_unit_conversions_from_unit ON unit_conversions(from_unit);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_to_unit ON unit_conversions(to_unit);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_unit_group ON unit_conversions(unit_group);

-- Variable relationships indexes
CREATE INDEX IF NOT EXISTS idx_variable_relationships_variable_1 ON variable_relationships(variable_id_1);
CREATE INDEX IF NOT EXISTS idx_variable_relationships_variable_2 ON variable_relationships(variable_id_2);
CREATE INDEX IF NOT EXISTS idx_variable_relationships_type ON variable_relationships(relationship_type);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Variables table policies
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variables are viewable by all authenticated users" ON variables
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Variables can be created by authenticated users" ON variables
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Variables can be updated by creator" ON variables
    FOR UPDATE USING (auth.uid() = created_by);

-- User variable preferences policies
ALTER TABLE user_variable_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variable preferences" ON user_variable_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own variable preferences" ON user_variable_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Variable logs policies
ALTER TABLE variable_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variable logs" ON variable_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own variable logs" ON variable_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variable logs" ON variable_logs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variable logs" ON variable_logs
    FOR DELETE USING (auth.uid() = user_id);

-- Unit conversions policies (read-only for all authenticated users)
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Unit conversions are viewable by all authenticated users" ON unit_conversions
    FOR SELECT USING (auth.role() = 'authenticated');

-- Variable relationships policies
ALTER TABLE variable_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variable relationships are viewable by all authenticated users" ON variable_relationships
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- FUNCTIONS FOR UNIT CONVERSION
-- ============================================================================

-- Function to convert between units
CREATE OR REPLACE FUNCTION convert_unit(
    value NUMERIC,
    from_unit TEXT,
    to_unit TEXT
) RETURNS NUMERIC AS $$
DECLARE
    conversion_factor NUMERIC;
    offset_val NUMERIC;
    formula_text TEXT;
    result NUMERIC;
BEGIN
    -- Handle same unit case
    IF from_unit = to_unit THEN
        RETURN value;
    END IF;
    
    -- Get conversion parameters
    SELECT uc.conversion_factor, uc.offset, uc.formula
    INTO conversion_factor, offset_val, formula_text
    FROM unit_conversions uc
    WHERE uc.from_unit = from_unit 
      AND uc.to_unit = to_unit 
      AND uc.is_active = true;
    
    -- If no direct conversion, try reverse
    IF conversion_factor IS NULL THEN
        SELECT uc.conversion_factor, uc.offset, uc.formula
        INTO conversion_factor, offset_val, formula_text
        FROM unit_conversions uc
        WHERE uc.from_unit = to_unit 
          AND uc.to_unit = from_unit 
          AND uc.is_active = true;
        
        -- For reverse conversion, invert the factor
        IF conversion_factor IS NOT NULL THEN
            conversion_factor := 1 / conversion_factor;
            offset_val := -offset_val / conversion_factor;
        END IF;
    END IF;
    
    -- If still no conversion found, return original value
    IF conversion_factor IS NULL THEN
        RETURN value;
    END IF;
    
    -- Apply conversion
    IF formula_text IS NOT NULL THEN
        -- For complex conversions like temperature
        EXECUTE format('SELECT %L', formula_text) INTO result USING value;
        RETURN result;
    ELSE
        -- Simple linear conversion
        RETURN (value * conversion_factor) + offset_val;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user's preferred unit for a variable
CREATE OR REPLACE FUNCTION get_user_preferred_unit(
    user_uuid UUID,
    variable_uuid UUID
) RETURNS TEXT AS $$
DECLARE
    preferred_unit TEXT;
BEGIN
    SELECT uvp.preferred_unit
    INTO preferred_unit
    FROM user_variable_preferences uvp
    WHERE uvp.user_id = user_uuid 
      AND uvp.variable_id = variable_uuid;
    
    -- If no user preference, return variable's default
    IF preferred_unit IS NULL THEN
        SELECT v.default_display_unit
        INTO preferred_unit
        FROM variables v
        WHERE v.id = variable_uuid;
    END IF;
    
    -- If still no preference, return canonical unit
    IF preferred_unit IS NULL THEN
        SELECT v.canonical_unit
        INTO preferred_unit
        FROM variables v
        WHERE v.id = variable_uuid;
    END IF;
    
    RETURN preferred_unit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_variables_updated_at
    BEFORE UPDATE ON variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_variable_preferences_updated_at
    BEFORE UPDATE ON user_variable_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert common unit conversions
INSERT INTO unit_conversions (from_unit, to_unit, conversion_factor, unit_group) VALUES
-- Mass conversions
('kg', 'lb', 2.20462, 'mass'),
('lb', 'kg', 0.453592, 'mass'),
('kg', 'g', 1000, 'mass'),
('g', 'kg', 0.001, 'mass'),
('lb', 'oz', 16, 'mass'),
('oz', 'lb', 0.0625, 'mass'),

-- Distance conversions
('km', 'mi', 0.621371, 'distance'),
('mi', 'km', 1.60934, 'distance'),
('m', 'ft', 3.28084, 'distance'),
('ft', 'm', 0.3048, 'distance'),
('cm', 'in', 0.393701, 'distance'),
('in', 'cm', 2.54, 'distance'),

-- Time conversions
('hours', 'minutes', 60, 'time'),
('minutes', 'hours', 0.0166667, 'time'),
('hours', 'seconds', 3600, 'time'),
('seconds', 'hours', 0.000277778, 'time'),

-- Temperature conversions (using formula)
('°C', '°F', 1, 'temperature'),
('°F', '°C', 1, 'temperature'),

-- Boolean conversions
('true/false', 'yes/no', 1, 'boolean'),
('yes/no', 'true/false', 1, 'boolean'),
('true/false', '0/1', 1, 'boolean'),
('0/1', 'true/false', 1, 'boolean'),
('yes/no', '0/1', 1, 'boolean'),
('0/1', 'yes/no', 1, 'boolean')

ON CONFLICT (from_unit, to_unit) DO NOTHING;

-- Insert temperature conversion formulas
UPDATE unit_conversions 
SET formula = '($1 * 9/5) + 32'
WHERE from_unit = '°C' AND to_unit = '°F';

UPDATE unit_conversions 
SET formula = '($1 - 32) * 5/9'
WHERE from_unit = '°F' AND to_unit = '°C';

-- Insert common variables
INSERT INTO variables (slug, label, description, icon, data_type, canonical_unit, unit_group, convertible_units, default_display_unit, source_type, category, subcategory, tags) VALUES
-- Physical Health
('weight', 'Weight', 'Body weight measurement', '⚖️', 'continuous', 'kg', 'mass', '["kg", "lb", "g"]', 'kg', 'manual', 'Physical Health', 'Body Metrics', ARRAY['health', 'fitness']),
('body_fat', 'Body Fat %', 'Body fat percentage', '📊', 'continuous', '%', NULL, NULL, '%', 'manual', 'Physical Health', 'Body Metrics', ARRAY['health', 'fitness']),
('muscle_mass', 'Muscle Mass', 'Muscle mass measurement', '💪', 'continuous', 'kg', 'mass', '["kg", "lb"]', 'kg', 'manual', 'Physical Health', 'Body Metrics', ARRAY['health', 'fitness']),

-- Sleep
('sleep_duration', 'Sleep Duration', 'Total sleep time', '😴', 'continuous', 'hours', 'time', '["hours", "minutes"]', 'hours', 'manual', 'Sleep & Recovery', 'Sleep Quality', ARRAY['sleep', 'recovery']),
('sleep_quality', 'Sleep Quality', 'Subjective sleep quality rating', '⭐', 'continuous', 'score', NULL, NULL, 'score', 'manual', 'Sleep & Recovery', 'Sleep Quality', ARRAY['sleep', 'recovery']),
('sleep_time', 'Sleep Time', 'Time went to bed', '🛏️', 'time', NULL, NULL, NULL, NULL, 'manual', 'Sleep & Recovery', 'Sleep Timing', ARRAY['sleep', 'timing']),

-- Mental Health
('mood', 'Mood', 'Overall mood rating', '😊', 'continuous', 'score', NULL, NULL, 'score', 'manual', 'Mental Health', 'Emotional State', ARRAY['mental', 'emotion']),
('stress', 'Stress Level', 'Perceived stress level', '😰', 'continuous', 'score', NULL, NULL, 'score', 'manual', 'Mental Health', 'Stress', ARRAY['mental', 'stress']),
('anxiety', 'Anxiety Level', 'Anxiety or worry level', '😬', 'continuous', 'score', NULL, NULL, 'score', 'manual', 'Mental Health', 'Anxiety', ARRAY['mental', 'anxiety']),

-- Substances
('caffeine', 'Caffeine', 'Caffeine intake in mg', '☕', 'continuous', 'mg', NULL, NULL, 'mg', 'manual', 'Substances', 'Stimulants', ARRAY['substance', 'stimulant']),
('alcohol', 'Alcohol', 'Alcohol units consumed', '🍷', 'continuous', 'units', NULL, NULL, 'units', 'manual', 'Substances', 'Alcohol', ARRAY['substance', 'alcohol']),
('nicotine', 'Nicotine', 'Nicotine use', '🚬', 'boolean', NULL, NULL, NULL, NULL, 'manual', 'Substances', 'Nicotine', ARRAY['substance', 'nicotine']),

-- Exercise
('exercise_duration', 'Exercise Duration', 'Time spent exercising', '🏃', 'continuous', 'minutes', 'time', '["minutes", "hours"]', 'minutes', 'manual', 'Physical Health', 'Exercise', ARRAY['fitness', 'exercise']),
('exercise_intensity', 'Exercise Intensity', 'Perceived exercise intensity', '🔥', 'continuous', 'score', NULL, NULL, 'score', 'manual', 'Physical Health', 'Exercise', ARRAY['fitness', 'exercise']),

-- Environment
('room_temperature', 'Room Temperature', 'Room temperature', '🌡️', 'continuous', '°C', 'temperature', '["°C", "°F"]', '°C', 'manual', 'Environment', 'Temperature', ARRAY['environment', 'temperature']),
('light_exposure', 'Light Exposure', 'Light exposure level', '☀️', 'continuous', 'score', NULL, NULL, 'score', 'manual', 'Environment', 'Light', ARRAY['environment', 'light'])

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- MIGRATION HELPERS
-- ============================================================================

-- Function to migrate existing daily_logs to new system
CREATE OR REPLACE FUNCTION migrate_daily_logs_to_variables()
RETURNS void AS $$
DECLARE
    log_record RECORD;
    variable_id UUID;
    canonical_value NUMERIC;
BEGIN
    -- Create variables for each unique label in daily_logs
    FOR log_record IN 
        SELECT DISTINCT label 
        FROM daily_logs 
        WHERE label NOT IN (SELECT slug FROM variables)
    LOOP
        -- Insert new variable
        INSERT INTO variables (slug, label, data_type, canonical_unit, source_type, category)
        VALUES (
            lower(replace(log_record.label, ' ', '_')),
            log_record.label,
            'continuous', -- Default type
            NULL, -- No canonical unit initially
            'manual',
            'Custom'
        )
        ON CONFLICT (slug) DO NOTHING
        RETURNING id INTO variable_id;
        
        -- If variable was created, migrate the logs
        IF variable_id IS NOT NULL THEN
            -- Migrate logs for this variable
            INSERT INTO variable_logs (user_id, variable_id, display_value, logged_at, source, notes)
            SELECT 
                dl.user_id,
                variable_id,
                dl.value,
                dl.date,
                'migrated',
                dl.notes
            FROM daily_logs dl
            WHERE dl.label = log_record.label;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql; 