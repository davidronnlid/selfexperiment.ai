-- Enhanced Variables System Database Schema

-- Main variables table with comprehensive metadata
CREATE TABLE IF NOT EXISTS variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL, -- Human-readable name (e.g. "Weight")
    slug TEXT NOT NULL UNIQUE, -- Internal ID (e.g. "weight")
    type TEXT NOT NULL CHECK (type IN ('continuous', 'categorical', 'boolean', 'ordinal')),
    unit TEXT, -- Default unit (e.g. "kg", "bpm", "hours")
    unit_group TEXT, -- Logical group of convertible units ("mass", "time", "length")
    is_convertible BOOLEAN DEFAULT false, -- Whether unit can be converted
    method TEXT NOT NULL CHECK (method IN ('manual_entry', 'withings', 'oura', 'formula', 'apple_health', 'garmin', 'fitbit', 'custom_integration')),
    description TEXT, -- Help text or tooltip
    icon TEXT, -- Emoji or icon identifier
    category TEXT, -- Grouping category (e.g. "Mental & Emotional", "Sleep & Recovery")
    is_predefined BOOLEAN DEFAULT false, -- Whether it's a system-defined variable
    is_active BOOLEAN DEFAULT true, -- Whether the variable is active
    created_by UUID REFERENCES auth.users(id), -- User who created this variable (null for system variables)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Additional metadata for validation and display
    validation_rules JSONB DEFAULT '{}', -- Flexible validation rules
    display_options JSONB DEFAULT '{}', -- UI display preferences
    
    -- Constraints for categorical variables
    categorical_options TEXT[], -- Array of valid options for categorical variables
    
    -- Constraints for continuous variables
    min_value NUMERIC,
    max_value NUMERIC,
    decimal_places INTEGER DEFAULT 2,
    
    -- Constraints for ordinal variables (like scales)
    ordinal_min INTEGER,
    ordinal_max INTEGER,
    ordinal_labels TEXT[] -- Optional labels for ordinal values
);

-- Unit groups and conversion definitions
CREATE TABLE IF NOT EXISTS unit_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- "mass", "time", "distance", "temperature"
    description TEXT,
    base_unit TEXT NOT NULL, -- Canonical unit for this group (e.g. "kg" for mass)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual units and their conversion factors
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- "kg", "lb", "g", "oz"
    name TEXT NOT NULL, -- "Kilogram", "Pound", "Gram", "Ounce"
    symbol TEXT NOT NULL, -- "kg", "lb", "g", "oz"
    unit_group_id UUID REFERENCES unit_groups(id),
    conversion_factor NUMERIC NOT NULL, -- Factor to convert to base unit
    conversion_offset NUMERIC DEFAULT 0, -- Offset for non-linear conversions (e.g. temperature)
    is_base_unit BOOLEAN DEFAULT false, -- Whether this is the base unit for its group
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User preferences for units
CREATE TABLE IF NOT EXISTS user_unit_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_group_id UUID REFERENCES unit_groups(id),
    preferred_unit_id UUID REFERENCES units(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, unit_group_id)
);

-- User-specific variable customizations
CREATE TABLE IF NOT EXISTS user_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_label TEXT, -- User's custom name for this variable
    custom_unit_id UUID REFERENCES units(id), -- User's preferred unit for this variable
    sort_order INTEGER DEFAULT 0, -- User's preferred ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, variable_id)
);

-- Enhanced daily logs table (extends existing structure)
CREATE TABLE IF NOT EXISTS daily_logs_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    value NUMERIC, -- For continuous/ordinal variables
    text_value TEXT, -- For categorical/boolean variables
    unit_id UUID REFERENCES units(id), -- Unit the value was entered in
    canonical_value NUMERIC, -- Value converted to canonical unit
    date DATE NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    method TEXT DEFAULT 'manual_entry',
    confidence NUMERIC DEFAULT 1.0, -- Confidence score for automated entries
    metadata JSONB DEFAULT '{}', -- Additional metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert predefined unit groups
INSERT INTO unit_groups (name, description, base_unit) VALUES
('mass', 'Weight and mass measurements', 'kg'),
('time', 'Time duration measurements', 'minutes'),
('distance', 'Distance and length measurements', 'km'),
('temperature', 'Temperature measurements', 'celsius'),
('volume', 'Volume measurements', 'liters'),
('energy', 'Energy measurements', 'calories'),
('frequency', 'Frequency measurements', 'per_day'),
('dimensionless', 'Dimensionless values (scales, percentages)', 'unit');

-- Insert predefined units
INSERT INTO units (code, name, symbol, unit_group_id, conversion_factor, is_base_unit) VALUES
-- Mass units
('kg', 'Kilogram', 'kg', (SELECT id FROM unit_groups WHERE name = 'mass'), 1.0, true),
('lb', 'Pound', 'lb', (SELECT id FROM unit_groups WHERE name = 'mass'), 0.453592, false),
('g', 'Gram', 'g', (SELECT id FROM unit_groups WHERE name = 'mass'), 0.001, false),
('oz', 'Ounce', 'oz', (SELECT id FROM unit_groups WHERE name = 'mass'), 0.0283495, false),

-- Time units
('minutes', 'Minutes', 'min', (SELECT id FROM unit_groups WHERE name = 'time'), 1.0, true),
('hours', 'Hours', 'h', (SELECT id FROM unit_groups WHERE name = 'time'), 60.0, false),
('seconds', 'Seconds', 's', (SELECT id FROM unit_groups WHERE name = 'time'), 0.0166667, false),

-- Distance units
('km', 'Kilometer', 'km', (SELECT id FROM unit_groups WHERE name = 'distance'), 1.0, true),
('mi', 'Mile', 'mi', (SELECT id FROM unit_groups WHERE name = 'distance'), 1.60934, false),
('m', 'Meter', 'm', (SELECT id FROM unit_groups WHERE name = 'distance'), 0.001, false),
('ft', 'Foot', 'ft', (SELECT id FROM unit_groups WHERE name = 'distance'), 0.0003048, false),

-- Temperature units
('celsius', 'Celsius', '°C', (SELECT id FROM unit_groups WHERE name = 'temperature'), 1.0, true),
('fahrenheit', 'Fahrenheit', '°F', (SELECT id FROM unit_groups WHERE name = 'temperature'), 1.0, false),

-- Volume units
('liters', 'Liters', 'L', (SELECT id FROM unit_groups WHERE name = 'volume'), 1.0, true),
('ml', 'Milliliters', 'mL', (SELECT id FROM unit_groups WHERE name = 'volume'), 0.001, false),
('cups', 'Cups', 'cup', (SELECT id FROM unit_groups WHERE name = 'volume'), 0.236588, false),
('oz_fluid', 'Fluid Ounces', 'fl oz', (SELECT id FROM unit_groups WHERE name = 'volume'), 0.0295735, false),

-- Energy units
('calories', 'Calories', 'cal', (SELECT id FROM unit_groups WHERE name = 'energy'), 1.0, true),
('kcal', 'Kilocalories', 'kcal', (SELECT id FROM unit_groups WHERE name = 'energy'), 1000.0, false),
('joules', 'Joules', 'J', (SELECT id FROM unit_groups WHERE name = 'energy'), 0.239006, false),

-- Frequency units
('per_day', 'Per Day', '/day', (SELECT id FROM unit_groups WHERE name = 'frequency'), 1.0, true),
('per_week', 'Per Week', '/week', (SELECT id FROM unit_groups WHERE name = 'frequency'), 0.142857, false),
('per_hour', 'Per Hour', '/hour', (SELECT id FROM unit_groups WHERE name = 'frequency'), 24.0, false),

-- Dimensionless units
('unit', 'Unit', '', (SELECT id FROM unit_groups WHERE name = 'dimensionless'), 1.0, true),
('percent', 'Percent', '%', (SELECT id FROM unit_groups WHERE name = 'dimensionless'), 0.01, false),
('scale_1_10', 'Scale 1-10', '', (SELECT id FROM unit_groups WHERE name = 'dimensionless'), 0.1, false),
('mg', 'Milligrams', 'mg', (SELECT id FROM unit_groups WHERE name = 'mass'), 0.000001, false);

-- Insert predefined variables (migrated from LOG_LABELS)
INSERT INTO variables (label, slug, type, unit, unit_group, is_convertible, method, description, icon, category, is_predefined, validation_rules, min_value, max_value, ordinal_min, ordinal_max) VALUES
-- Mental & Emotional
('Mood', 'mood', 'ordinal', 'unit', 'dimensionless', false, 'manual_entry', 'Overall mood (1–10)', '🙂', 'Mental & Emotional', true, '{"required": true}', null, null, 1, 10),
('Stress', 'stress', 'ordinal', 'unit', 'dimensionless', false, 'manual_entry', 'Stress level (1–10)', '😰', 'Mental & Emotional', true, '{"required": true}', null, null, 1, 10),
('Cognitive Control', 'cognitive_control', 'ordinal', 'unit', 'dimensionless', false, 'manual_entry', 'Subjective level of cognitive control and mental clarity (1–10)', '🧠', 'Mental & Emotional', true, '{"required": true}', null, null, 1, 10),
('Anxiety Before Bed', 'anxiety_before_bed', 'ordinal', 'unit', 'dimensionless', false, 'manual_entry', 'Anxiety or racing thoughts before bed (1–10)', '😬', 'Mental & Emotional', true, '{"required": true}', null, null, 1, 10),

-- Sleep & Recovery
('Sleep Quality', 'sleep_quality', 'ordinal', 'unit', 'dimensionless', false, 'manual_entry', 'Subjective sleep quality (1–10)', '⭐', 'Sleep & Recovery', true, '{"required": true}', null, null, 1, 10),
('Sleep Duration', 'sleep_duration', 'continuous', 'hours', 'time', true, 'manual_entry', 'Total sleep duration', '⏰', 'Sleep & Recovery', true, '{"required": true}', 0, 24),
('Sleep Time', 'sleep_time', 'categorical', null, null, false, 'manual_entry', 'Time you went to bed', '🛏️', 'Sleep & Recovery', true, '{"required": true}'),
('Fell Asleep Time', 'fell_asleep_time', 'categorical', null, null, false, 'manual_entry', 'Time you fell asleep', '😴', 'Sleep & Recovery', true, '{"required": true}'),
('Naps', 'naps', 'continuous', 'unit', 'dimensionless', false, 'manual_entry', 'Number of naps during the day', '🛌', 'Sleep & Recovery', true, '{"required": true}', 0, 10),

-- Physical Health
('Weight', 'weight', 'continuous', 'kg', 'mass', true, 'manual_entry', 'Body weight', '⚖️', 'Physical Health', true, '{"required": false}', 0, 300),
('Exercise', 'exercise', 'categorical', null, null, false, 'manual_entry', 'Type and timing of exercise', '🏋️', 'Physical Health', true, '{"required": false}'),
('Body Temp (subjective)', 'body_temp_subjective', 'ordinal', 'unit', 'dimensionless', false, 'manual_entry', 'Perceived body temperature (1–10)', '🌡️', 'Physical Health', true, '{"required": true}', null, null, 1, 10),
('Illness/Symptoms', 'illness_symptoms', 'categorical', null, null, false, 'manual_entry', 'Any illness or symptoms', '🤒', 'Physical Health', true, '{"required": false}'),
('Menstrual Phase', 'menstrual_phase', 'categorical', null, null, false, 'manual_entry', 'Menstrual cycle phase', '🩸', 'Physical Health', true, '{"required": false}'),

-- Substances & Diet
('Caffeine', 'caffeine', 'continuous', 'mg', 'mass', true, 'manual_entry', 'Total caffeine consumed', '☕', 'Substances & Diet', true, '{"required": true}', 0, 1000),
('Alcohol', 'alcohol', 'continuous', 'unit', 'dimensionless', false, 'manual_entry', 'Alcohol intake (units)', '🍷', 'Substances & Diet', true, '{"required": true}', 0, 20),
('Nicotine', 'nicotine', 'boolean', null, null, false, 'manual_entry', 'Nicotine use', '🚬', 'Substances & Diet', true, '{"required": true}'),
('Cannabis/THC', 'cannabis_thc', 'boolean', null, null, false, 'manual_entry', 'Cannabis or THC use', '🌿', 'Substances & Diet', true, '{"required": true}'),
('Medications/Supplements', 'medications_supplements', 'categorical', null, null, false, 'manual_entry', 'Any medications or supplements taken', '💊', 'Substances & Diet', true, '{"required": false}'),
('Big Meal Late', 'big_meal_late', 'boolean', null, null, false, 'manual_entry', 'Heavy meal close to bedtime', '🍽️', 'Substances & Diet', true, '{"required": true}'),
('Late Sugar Intake', 'late_sugar_intake', 'boolean', null, null, false, 'manual_entry', 'Sugar intake late in the day', '🍬', 'Substances & Diet', true, '{"required": true}'),
('Intermittent Fasting', 'intermittent_fasting', 'boolean', null, null, false, 'manual_entry', 'Practiced intermittent fasting or early dinner', '⏳', 'Substances & Diet', true, '{"required": true}'),
('Hydration', 'hydration', 'categorical', null, null, false, 'manual_entry', 'Hydration status', '💧', 'Substances & Diet', true, '{"required": true}'),

-- Environment
('Room Temp', 'room_temp', 'continuous', 'celsius', 'temperature', true, 'manual_entry', 'Room temperature', '🌡️', 'Environment', true, '{"required": true}', 0, 50),
('Light Exposure', 'light_exposure', 'boolean', null, null, false, 'manual_entry', 'Bright light exposure before bed', '💡', 'Environment', true, '{"required": true}'),
('Noise Disturbances', 'noise_disturbances', 'boolean', null, null, false, 'manual_entry', 'Noise disturbances during sleep', '🔊', 'Environment', true, '{"required": true}'),
('Travel/Jet Lag', 'travel_jet_lag', 'boolean', null, null, false, 'manual_entry', 'Travel or jet lag', '✈️', 'Environment', true, '{"required": true}'),
('Altitude Change', 'altitude_change', 'boolean', null, null, false, 'manual_entry', 'Change in altitude', '⛰️', 'Environment', true, '{"required": true}'),

-- Oura Data
('Heart Rate', 'heart_rate', 'continuous', 'unit', 'frequency', false, 'oura', 'Resting heart rate data', '❤️', 'Oura Data', true, '{"required": false}', 30, 220),
('Sleep Score', 'sleep_score', 'continuous', 'unit', 'dimensionless', false, 'oura', 'Oura sleep score', '😴', 'Oura Data', true, '{"required": false}', 0, 100),
('Readiness Score', 'readiness_score', 'continuous', 'unit', 'dimensionless', false, 'oura', 'Oura readiness score', '⚡', 'Oura Data', true, '{"required": false}', 0, 100),
('Activity Score', 'activity_score', 'continuous', 'unit', 'dimensionless', false, 'oura', 'Oura activity score', '🏃', 'Oura Data', true, '{"required": false}', 0, 100),
('Deep Sleep', 'deep_sleep', 'continuous', 'minutes', 'time', true, 'oura', 'Deep sleep duration', '🌙', 'Oura Data', true, '{"required": false}', 0, 600),
('REM Sleep', 'rem_sleep', 'continuous', 'minutes', 'time', true, 'oura', 'REM sleep duration', '💭', 'Oura Data', true, '{"required": false}', 0, 600),
('Light Sleep', 'light_sleep', 'continuous', 'minutes', 'time', true, 'oura', 'Light sleep duration', '😌', 'Oura Data', true, '{"required": false}', 0, 600);

-- Update categorical options for specific variables
UPDATE variables SET categorical_options = ARRAY['Menstrual', 'Follicular', 'Ovulatory', 'Luteal', 'None'] WHERE slug = 'menstrual_phase';
UPDATE variables SET categorical_options = ARRAY['Low', 'Medium', 'High'] WHERE slug = 'hydration';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_variables_slug ON variables(slug);
CREATE INDEX IF NOT EXISTS idx_variables_category ON variables(category);
CREATE INDEX IF NOT EXISTS idx_variables_type ON variables(type);
CREATE INDEX IF NOT EXISTS idx_variables_method ON variables(method);
CREATE INDEX IF NOT EXISTS idx_variables_is_predefined ON variables(is_predefined);
CREATE INDEX IF NOT EXISTS idx_variables_is_active ON variables(is_active);

CREATE INDEX IF NOT EXISTS idx_units_code ON units(code);
CREATE INDEX IF NOT EXISTS idx_units_unit_group ON units(unit_group_id);
CREATE INDEX IF NOT EXISTS idx_units_is_base ON units(is_base_unit);

CREATE INDEX IF NOT EXISTS idx_user_variables_user_id ON user_variables(user_id);
CREATE INDEX IF NOT EXISTS idx_user_variables_variable_id ON user_variables(variable_id);

CREATE INDEX IF NOT EXISTS idx_user_unit_preferences_user_id ON user_unit_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_unit_preferences_unit_group ON user_unit_preferences(unit_group_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_v2_user_id ON daily_logs_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_v2_variable_id ON daily_logs_v2(variable_id);
CREATE INDEX IF NOT EXISTS idx_daily_logs_v2_date ON daily_logs_v2(date);

-- Row Level Security (RLS) Policies
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_unit_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs_v2 ENABLE ROW LEVEL SECURITY;

-- Variables are publicly readable but only system/creators can modify
CREATE POLICY "Variables are publicly readable" ON variables FOR SELECT USING (true);
CREATE POLICY "Users can create custom variables" ON variables FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can modify their own variables" ON variables FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Users can delete their own variables" ON variables FOR DELETE USING (auth.uid() = created_by);

-- User variables policies
CREATE POLICY "Users can manage their own variable settings" ON user_variables FOR ALL USING (auth.uid() = user_id);

-- User unit preferences policies
CREATE POLICY "Users can manage their own unit preferences" ON user_unit_preferences FOR ALL USING (auth.uid() = user_id);

-- Daily logs policies
CREATE POLICY "Users can manage their own logs" ON daily_logs_v2 FOR ALL USING (auth.uid() = user_id);

-- Unit groups and units are publicly readable
ALTER TABLE unit_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Unit groups are publicly readable" ON unit_groups FOR SELECT USING (true);
CREATE POLICY "Units are publicly readable" ON units FOR SELECT USING (true);

-- Triggers for updated_at timestamps
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

CREATE TRIGGER update_user_variables_updated_at
    BEFORE UPDATE ON user_variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_unit_preferences_updated_at
    BEFORE UPDATE ON user_unit_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_v2_updated_at
    BEFORE UPDATE ON daily_logs_v2
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();