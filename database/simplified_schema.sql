-- Simplified Database Schema
-- Only includes tables and columns that are actually used in the app

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
-- VARIABLE LOGS TABLE (Simplified)
-- ============================================================================

CREATE TABLE IF NOT EXISTS variable_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Core data (only what's actually used)
    display_value TEXT, -- Human-readable value as entered
    display_unit TEXT, -- Unit used for display
    
    -- Metadata
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT, -- How data was collected (manual, routine, planned, etc.)
    
    -- Additional context
    notes TEXT,
    context JSONB, -- Additional context (routine_id, etc.)
    
    -- Privacy
    is_private BOOLEAN DEFAULT false
);

-- ============================================================================
-- DAILY ROUTINES TABLE (Simplified)
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_routines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Routine Configuration
    routine_name TEXT NOT NULL, -- User-friendly name for the routine
    notes TEXT, -- Default notes for auto-generated logs
    
    -- Scheduling
    is_active BOOLEAN DEFAULT true, -- Whether routine is currently active
    
    -- Weekday Settings
    weekdays INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- Array of weekday numbers (1=Monday, 7=Sunday)
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_auto_logged TIMESTAMP WITH TIME ZONE, -- Last time routine was executed
    
    -- Constraints
    CONSTRAINT daily_routines_routine_name_check CHECK (routine_name IS NOT NULL AND routine_name != ''),
    CONSTRAINT daily_routines_weekdays_check CHECK (weekdays IS NOT NULL AND array_length(weekdays, 1) > 0)
);

-- ============================================================================
-- ROUTINE TIMES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS routine_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_id UUID REFERENCES daily_routines(id) ON DELETE CASCADE,
    
    -- Time Configuration
    time_of_day TIME NOT NULL, -- Time for this routine execution
    time_name TEXT, -- Optional name for this time (e.g., "Morning", "Afternoon")
    is_active BOOLEAN DEFAULT true, -- Whether this time is active
    
    -- Display Order
    display_order INTEGER DEFAULT 0, -- Order to display times in UI
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(routine_id, time_of_day), -- One entry per routine-time combination
    CONSTRAINT routine_times_time_of_day_check CHECK (time_of_day IS NOT NULL)
);

-- ============================================================================
-- ROUTINE TIME VARIABLES JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS routine_time_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routine_time_id UUID REFERENCES routine_times(id) ON DELETE CASCADE,
    variable_id UUID REFERENCES variables(id) ON DELETE CASCADE,
    
    -- Variable-specific settings for this routine time
    default_value TEXT NOT NULL, -- Default value to log daily for this variable at this time
    default_unit TEXT, -- Unit for the default value
    display_order INTEGER DEFAULT 0, -- Order to display variables in UI for this time
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(routine_time_id, variable_id), -- One entry per routine-time-variable combination
    CONSTRAINT routine_time_variables_default_value_check CHECK (default_value IS NOT NULL AND default_value != '')
);

-- ============================================================================
-- VARIABLE SHARING SETTINGS (Simplified)
-- ============================================================================

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

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Variables table indexes
CREATE INDEX IF NOT EXISTS idx_variables_slug ON variables(slug);
CREATE INDEX IF NOT EXISTS idx_variables_category ON variables(category);
CREATE INDEX IF NOT EXISTS idx_variables_data_type ON variables(data_type);
CREATE INDEX IF NOT EXISTS idx_variables_is_active ON variables(is_active);

-- Variable logs indexes
CREATE INDEX IF NOT EXISTS idx_variable_logs_user_id ON variable_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_logs_variable_id ON variable_logs(variable_id);
CREATE INDEX IF NOT EXISTS idx_variable_logs_logged_at ON variable_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_variable_logs_source ON variable_logs(source);

-- Daily routines indexes
CREATE INDEX IF NOT EXISTS idx_daily_routines_user_id ON daily_routines(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_routines_is_active ON daily_routines(is_active);
CREATE INDEX IF NOT EXISTS idx_daily_routines_weekdays ON daily_routines USING GIN(weekdays);

-- Routine times indexes
CREATE INDEX IF NOT EXISTS idx_routine_times_routine_id ON routine_times(routine_id);
CREATE INDEX IF NOT EXISTS idx_routine_times_is_active ON routine_times(is_active);

-- Routine time variables indexes
CREATE INDEX IF NOT EXISTS idx_routine_time_variables_routine_time_id ON routine_time_variables(routine_time_id);
CREATE INDEX IF NOT EXISTS idx_routine_time_variables_variable_id ON routine_time_variables(variable_id);

-- Variable sharing settings indexes
CREATE INDEX IF NOT EXISTS idx_variable_sharing_settings_user_id ON variable_sharing_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_variable_sharing_settings_variable_name ON variable_sharing_settings(variable_name);

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

-- Daily routines policies
ALTER TABLE daily_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own routines" ON daily_routines
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own routines" ON daily_routines
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routines" ON daily_routines
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routines" ON daily_routines
    FOR DELETE USING (auth.uid() = user_id);

-- Routine times policies
ALTER TABLE routine_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view times for their routines" ON routine_times
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can create times for their routines" ON routine_times
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can update times for their routines" ON routine_times
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete times for their routines" ON routine_times
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM daily_routines dr 
        WHERE dr.id = routine_times.routine_id 
        AND dr.user_id = auth.uid()
    ));

-- Routine time variables policies
ALTER TABLE routine_time_variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variables for their routine times" ON routine_time_variables
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can create variables for their routine times" ON routine_time_variables
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can update variables for their routine times" ON routine_time_variables
    FOR UPDATE USING (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete variables for their routine times" ON routine_time_variables
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM routine_times rt
        JOIN daily_routines dr ON rt.routine_id = dr.id
        WHERE rt.id = routine_time_variables.routine_time_id 
        AND dr.user_id = auth.uid()
    ));

-- Variable sharing settings policies
ALTER TABLE variable_sharing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sharing settings" ON variable_sharing_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sharing settings" ON variable_sharing_settings
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS FOR ROUTINE MANAGEMENT
-- ============================================================================

-- Function to get user's active routines with time and variable info
CREATE OR REPLACE FUNCTION get_user_routines(p_user_id UUID)
RETURNS TABLE(
    id UUID,
    routine_name TEXT,
    notes TEXT,
    is_active BOOLEAN,
    weekdays INTEGER[],
    last_auto_logged TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE,
    times JSONB -- Array of times with their variables
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dr.id,
        dr.routine_name,
        dr.notes,
        dr.is_active,
        dr.weekdays,
        dr.last_auto_logged,
        dr.created_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'time_id', rt.id,
                    'time_of_day', rt.time_of_day,
                    'time_name', rt.time_name,
                    'is_active', rt.is_active,
                    'display_order', rt.display_order,
                    'variables', (
                        SELECT COALESCE(
                            jsonb_agg(
                                jsonb_build_object(
                                    'variable_id', rtv.variable_id,
                                    'variable_name', v.label,
                                    'variable_slug', v.slug,
                                    'default_value', rtv.default_value,
                                    'default_unit', rtv.default_unit,
                                    'display_order', rtv.display_order
                                ) ORDER BY rtv.display_order
                            ) FILTER (WHERE rtv.id IS NOT NULL),
                            '[]'::jsonb
                        )
                        FROM routine_time_variables rtv
                        LEFT JOIN variables v ON rtv.variable_id = v.id
                        WHERE rtv.routine_time_id = rt.id
                    )
                ) ORDER BY rt.display_order, rt.time_of_day
            ) FILTER (WHERE rt.id IS NOT NULL),
            '[]'::jsonb
        ) as times
    FROM daily_routines dr
    LEFT JOIN routine_times rt ON dr.id = rt.routine_id
    WHERE dr.user_id = p_user_id
    GROUP BY dr.id, dr.routine_name, dr.notes, dr.is_active, dr.weekdays, dr.last_auto_logged, dr.created_at
    ORDER BY dr.routine_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- Insert some common variables
INSERT INTO variables (slug, label, data_type, source_type, category, is_active) VALUES
('mood', 'Mood', 'continuous', 'manual', 'Mental Health', true),
('sleep_duration', 'Sleep Duration', 'continuous', 'manual', 'Physical Health', true),
('weight', 'Weight', 'continuous', 'manual', 'Physical Health', true),
('water_intake', 'Water Intake', 'continuous', 'manual', 'Physical Health', true),
('exercise', 'Exercise', 'continuous', 'manual', 'Physical Health', true),
('stress', 'Stress', 'continuous', 'manual', 'Mental Health', true),
('energy', 'Energy', 'continuous', 'manual', 'Physical Health', true),
('productivity', 'Productivity', 'continuous', 'manual', 'Mental Health', true)
ON CONFLICT (slug) DO NOTHING; 